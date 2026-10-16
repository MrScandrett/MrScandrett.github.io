/* audio-kit.js — one shared Web Audio context per page.
 *
 * Lessons, widgets and tools that make sound get their context here instead of
 * calling `new AudioContext()` themselves:
 *
 *   const ctx = AudioKit.context();      // created lazily, resumed every call (null if unsupported)
 *   myNode.connect(AudioKit.output());   // master volume → safety limiter → speakers
 *
 * What it handles so a lesson doesn't have to:
 *  - One AudioContext per page. Browsers cap how many can exist and each one costs
 *    an audio thread, so two widgets on one lesson page share this one.
 *  - iPhone/iPad unlock. Any tap or key press resumes a suspended or "interrupted"
 *    context (first gesture, after a phone call, Siri, or switching apps), and
 *    Safari is asked for the "playback" audio session so the ring/silent switch
 *    doesn't mute a lesson.
 *  - A master volume plus a brick-wall limiter, so a stacked chord or two widgets
 *    playing at once never clip the classroom speakers.
 *  - AudioKit.stopAll() silences every voice started here and calls every handler
 *    registered with AudioKit.onStop(fn), so one "stop" reaches the whole page.
 *
 * Pitched notes use MusicSynth voices (music-synth.js — load it first) so a piano or
 * guitar note sounds the same in every lesson, the score player and Track Studio:
 *
 *   AudioKit.note({ instrument: 'piano', midi: 60, duration: 1.2 });
 *   AudioKit.note({ instrument: 'pluck', hz: 196, delay: 0.1, velocity: 0.6 });
 *   AudioKit.chord({ instrument: 'pluck', midi: [52, 56, 59], spread: 0.02 });
 *   AudioKit.click({ accent: true });          // metronome tick
 *   AudioKit.drums().hit('snare');             // DrumEngine kit (drum-engine.js)
 *
 * note() returns the MusicSynth voice: voice.release(t), voice.kill(t), voice.glide(midi, t).
 * MusicSynth and DrumEngine themselves never touch AudioKit, so the same voices can
 * render into an OfflineAudioContext for WAV export.
 */
(function (root) {
  'use strict';

  var AC = root.AudioContext || root.webkitAudioContext;
  var ctx = null, master = null, limiter = null, volume = 1;
  var voices = new Set(), stopHandlers = new Set(), interruptHandlers = new Set();
  var drumKits = typeof WeakMap === 'function' ? new WeakMap() : null;
  var unlocked = false;

  function available() { return !!AC; }

  function preferPlaybackSession() {
    var session = root.navigator && root.navigator.audioSession;
    if (!session) return;
    // A page that opened the mic (Track Studio) manages its own session type.
    try { if (session.type === 'auto') session.type = 'playback'; } catch (_e) { /* read-only in some builds */ }
  }

  // iPadOS 13+ identifies itself as a Mac, hence the touch-point check.
  var nav = root.navigator || {};
  var isIOS = /iPad|iPhone|iPod/.test(nav.userAgent || '') || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  // Older iPads (2017 iPad Pro and earlier) underrun at Safari's low-latency default and crackle.
  var MAX_VOICES = isIOS ? 20 : 48;

  function create(options) {
    // 'playback' asks for bigger hardware buffers (fewer crackles on iPad) at the cost of latency.
    // Whichever caller creates the page's one context decides, so iOS defaults to 'playback' even
    // when the first caller (a tap-a-note preview, say) asked for nothing.
    var hint = options && options.latencyHint ? options.latencyHint : (isIOS ? 'playback' : null);
    try { ctx = hint ? new AC({ latencyHint: hint }) : new AC(); }
    catch (_e) { ctx = new AC(); }
    master = ctx.createGain();
    master.gain.value = volume;
    limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.15;
    master.connect(limiter);
    limiter.connect(ctx.destination);
    preferPlaybackSession();
    var wasRunning = false;
    ctx.addEventListener('statechange', function () {
      if (ctx.state === 'running') { wasRunning = true; return; }
      if (!wasRunning || ctx.state === 'closed') return;
      wasRunning = false;
      interruptHandlers.forEach(function (fn) { try { fn(ctx.state); } catch (e) { console.error(e); } });
    });
  }

  // Older iOS only truly unlocks after a buffer plays inside a user gesture.
  function primeOnce() {
    if (unlocked || !ctx) return;
    unlocked = true;
    try {
      var src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      src.connect(ctx.destination);
      src.start(0);
      src.onended = function () { src.disconnect(); };
    } catch (_e) { /* best effort */ }
  }

  function resume() {
    if (!ctx) return Promise.resolve();
    if (ctx.state === 'running' || ctx.state === 'closed') return Promise.resolve();
    var p;
    try { p = ctx.resume(); } catch (_e) { p = null; }
    return (p && p.catch) ? p.catch(function () { /* waits for the next gesture */ }) : Promise.resolve();
  }

  /** The page's AudioContext, created on first use and resumed on every call.
   *  `options.latencyHint` is honoured only by whichever caller creates it first. */
  function context(options) {
    if (!AC) return null;
    if (!ctx) create(options);
    resume();
    return ctx;
  }

  /** Where lesson audio should connect: master volume → limiter → speakers. */
  function output() {
    return context() ? master : null;
  }

  function onGesture() {
    if (!ctx) return;
    primeOnce();
    resume();
  }
  if (root.document) {
    ['pointerdown', 'touchend', 'keydown', 'click'].forEach(function (type) {
      root.document.addEventListener(type, onGesture, { capture: true, passive: true });
    });
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, Number(v) || 0));
    if (master) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.02);
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  function midiToHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function hzToMidi(hz) { return 69 + 12 * Math.log2(hz / 440); }

  function startTime(c, opts) {
    if (opts.at != null) return Math.max(c.currentTime, opts.at);
    return c.currentTime + (opts.delay || 0);
  }

  /**
   * Plays one pitched note through a MusicSynth voice.
   *   opts.instrument  MusicSynth instrument name (default 'piano')
   *   opts.midi | opts.hz   pitch; fractional MIDI is fine
   *   opts.velocity    0..1 (default 0.8)
   *   opts.at | opts.delay  absolute context time, or seconds from now
   *   opts.duration    seconds before release (default 1); pass null to hold until
   *                    you call voice.release(time) yourself
   *   opts.destination node to feed (default AudioKit.output())
   *   opts.settings    MusicSynth voice settings (attack, release, vibrato, wave...)
   */
  function note(opts) {
    opts = opts || {};
    var Synth = root.MusicSynth;
    var c = context();
    if (!c || !Synth) return null;
    var pitch = opts.midi != null ? opts.midi : (opts.hz ? hzToMidi(opts.hz) : null);
    if (pitch == null || !isFinite(pitch)) return null;
    var t = startTime(c, opts);
    var vel = opts.velocity == null ? 0.8 : Math.max(0, Math.min(1, opts.velocity));
    var dest = opts.destination || master;
    var voice = Synth.startVoice(c, dest, opts.instrument || 'piano', pitch, vel, t, function (v) {
      voices.delete(v);
      if (opts.onEnded) opts.onEnded(v);
    }, opts.settings || {});
    voices.add(voice);
    // Past the cap, steal the oldest voice: a dozen stacked oscillators per chord can starve older iPads.
    if (voices.size > MAX_VOICES) {
      var oldest = voices.values().next().value;
      voices.delete(oldest);
      try { oldest.kill(c.currentTime); } catch (_e) { /* already gone */ }
    }
    var duration = opts.duration === undefined ? 1 : opts.duration;
    if (duration != null) voice.release(t + Math.max(0.01, duration));
    return voice;
  }

  /** Several notes at once; opts.spread staggers them (seconds) like a strum. */
  function chord(opts) {
    opts = opts || {};
    var list = opts.midi != null ? [].concat(opts.midi) : [].concat(opts.hz || []);
    var key = opts.midi != null ? 'midi' : 'hz';
    var c = context();
    if (!c) return [];
    var t0 = startTime(c, opts), spread = opts.spread || 0;
    return list.map(function (p, i) {
      var one = Object.assign({}, opts, { at: t0 + i * spread, delay: undefined });
      delete one.midi; delete one.hz;
      one[key] = p;
      return note(one);
    }).filter(Boolean);
  }

  /** A short metronome tick. opts: at | delay, accent, level (0..1), destination. */
  function click(opts) {
    opts = opts || {};
    var c = context();
    if (!c) return;
    var t = startTime(c, opts);
    var peak = (opts.accent ? 0.3 : 0.2) * (opts.level == null ? 1 : opts.level);
    var o = c.createOscillator(), g = c.createGain();
    o.type = 'square';
    o.frequency.value = opts.accent ? 1900 : 1350;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(0.0002, peak), t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g); g.connect(opts.destination || master);
    o.start(t); o.stop(t + 0.07);
    o.onended = function () { o.disconnect(); g.disconnect(); };
  }

  /** A DrumEngine kit feeding `destination` (default the shared output), cached per node. */
  function drums(destination) {
    var c = context();
    if (!c || !root.DrumEngine) return null;
    var dest = destination || master;
    var kit = drumKits && drumKits.get(dest);
    if (!kit) { kit = root.DrumEngine.create(c, dest); if (drumKits) drumKits.set(dest, kit); }
    return kit;
  }

  /** Register a page-level stop handler; returns an unsubscribe function. */
  function onStop(fn) { stopHandlers.add(fn); return function () { stopHandlers.delete(fn); }; }

  /** Called with the new state when audio is interrupted (call, Siri, app switch). */
  function onInterrupt(fn) { interruptHandlers.add(fn); return function () { interruptHandlers.delete(fn); }; }

  function stopAll() {
    var t = now();
    voices.forEach(function (v) { try { v.kill(t); } catch (_e) { /* already gone */ } });
    voices.clear();
    stopHandlers.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
  }

  root.AudioKit = {
    available: available,
    isIOS: isIOS,
    context: context,
    peek: function () { return ctx; },
    output: output,
    resume: resume,
    now: now,
    setVolume: setVolume,
    getVolume: function () { return volume; },
    note: note,
    chord: chord,
    click: click,
    drums: drums,
    stopAll: stopAll,
    onStop: onStop,
    onInterrupt: onInterrupt,
    midiToHz: midiToHz,
    hzToMidi: hzToMidi
  };
})(typeof window !== 'undefined' ? window : globalThis);

