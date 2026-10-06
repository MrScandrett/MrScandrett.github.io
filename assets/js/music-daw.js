/* music-daw.js — Track Studio: the multitrack workspace in music-lab.html.
 *
 * An entry-level DAW on plain Web Audio:
 *   • instrument tracks (MIDI clips + piano roll) and audio tracks (recorded or imported takes)
 *   • transport with loop, metronome, count-in; record from the Music Lab keyboard,
 *     QWERTY keys, a USB MIDI device, the drum pads, or a microphone
 *   • import audio files, .mid files and saved projects (drag-drop or file picker)
 *   • export a WAV mix, a ZIP of per-track WAV stems, a .mid file, or the whole project
 *   • undo/redo, and autosave to this browser (IndexedDB) so work survives a reload
 *
 * Times are in beats (quarter notes) everywhere except inside audio clips, whose
 * offset/duration are seconds into the recording. A song has one tempo.
 *
 * music-lab.js shares its AudioContext through window.MusicLabAudio and hands
 * keyboard/MIDI notes to window.MusicDaw.noteOn/noteOff while a track is armed.
 */
(function () {
  'use strict';

  const IO = window.DawIO;
  const root = document.getElementById('trackStudio');
  if (!root || !IO) return;

  const SCRIPT_URL = document.currentScript ? document.currentScript.src : location.href;
  const WORKLET_URL = new URL('music-daw-recorder.worklet.js', SCRIPT_URL).href;
  const JSZIP_URL = new URL('../vendor/jszip.min.js', SCRIPT_URL).href;

  // ── Constants ────────────────────────────────────────────────────────────
  const INSTRUMENTS = {
    piano: 'Grand Piano', ePiano: 'Electric Piano', organ: 'Organ', pluck: 'Guitar Pluck',
    bass: 'Bass', strings: 'Strings', pad: 'Warm Pad', synth: 'Synth Lead', drums: 'Drum Kit',
  };
  const COLORS = ['#f2994a', '#56ccf2', '#6fcf97', '#bb6bd9', '#f2c94c', '#ff7a8a', '#2dd4bf', '#a3e635'];
  const TRACK_H = window.matchMedia('(pointer: coarse)').matches ? 142 : 110;
  let HEAD_W = 200;
  const ROW_H = 14;
  const KEYS_W = 80;
  const LOOKAHEAD = 0.15;
  // Notes played on a drum track from a piano keyboard: one drum per pitch class,
  // drums on white keys, cymbals/aux on black keys. GM drum keys (from pads) pass through.
  const DRUM_LAYOUT = [36, 37, 38, 39, 42, 41, 46, 47, 56, 48, 51, 49];
  const STORAGE_DB = 'classroomos-music-lab-daw';

  // ── State ────────────────────────────────────────────────────────────────
  let project = defaultProject();
  const buffers = new Map();          // id → { buffer: AudioBuffer, name, peaks }
  const ui = {
    pxPerBeat: 28, snap: 1, playhead: 0, selTrack: null, selClip: null,
    selNotes: new Set(), rollGrid: 0.25, noteLen: 0.25, rollPx: 72, follow: true, menu: null,
  };
  const history = { undo: [], redo: [], last: '' };
  const audio = { ctx: null, mix: null, meter: null, meterData: null };
  const transport = {
    playing: false, recording: false, segs: [], schedBeat: 0, timer: null,
    gates: new Map(), voices: new Set(), sources: new Set(), startBeat: 0,
    recStart: 0, take: null,
  };
  const live = new Map();             // pitch → live monitoring voice
  const mic = { stream: null, source: null, node: null, sink: null, analyser: null, chunks: [], capturing: false };

  function defaultProject() {
    return {
      version: 1, name: 'My Song', bpm: 100, sig: [4, 4], masterVolume: 0.85,
      metronome: false, countIn: true,
      loop: { on: false, start: 0, end: 16 },
      tracks: [
        makeTrack('instrument', 'Keys', 'piano', 0),
        makeTrack('instrument', 'Drums', 'drums', 1),
        makeTrack('audio', 'Vocals', null, 2),
      ],
    };
  }
  function makeTrack(kind, name, instrument, colorIndex) {
    return {
      id: uid(), kind, name, instrument: kind === 'instrument' ? (instrument || 'piano') : null,
      color: COLORS[(colorIndex || 0) % COLORS.length], volume: 0.8, pan: 0,
      mute: false, solo: false, armed: false, clips: [], effects: [],
    };
  }
  function uid() { return Math.random().toString(36).slice(2, 10); }

  // ── Helpers ──────────────────────────────────────────────────────────────
  const spb = () => 60 / project.bpm;
  const barBeats = () => project.sig[0] * 4 / project.sig[1];
  const clickStep = () => 4 / project.sig[1];
  const midiHz = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const snapTo = (beat, grid) => (grid > 0 ? Math.round(beat / grid) * grid : beat);
  const floorTo = (beat, grid) => (grid > 0 ? Math.floor(beat / grid + 1e-9) * grid : beat);
  const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const noteLabel = (p) => NOTE_NAMES[p % 12] + (Math.floor(p / 12) - 1);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function findTrack(id) { return project.tracks.find((t) => t.id === id) || null; }
  function findClip(id) {
    for (const t of project.tracks) for (const c of t.clips) if (c.id === id) return { track: t, clip: c };
    return null;
  }
  function clipBeats(clip) { return clip.type === 'audio' ? clip.duration / spb() : clip.length; }
  function clipEnd(clip) { return clip.start + clipBeats(clip); }
  function songEnd() {
    let end = 0;
    project.tracks.forEach((t) => t.clips.forEach((c) => { end = Math.max(end, clipEnd(c)); }));
    return end;
  }
  function audible(track) {
    const anySolo = project.tracks.some((t) => t.solo);
    return !track.mute && (!anySolo || track.solo);
  }
  function snapGrid() { return ui.snap === 'bar' ? barBeats() : ui.snap; }

  function formatPos(beat) {
    if (beat < 0) return '−' + Math.ceil(-beat / clickStep());
    const bar = Math.floor(beat / barBeats() + 1e-9);
    const inBar = beat - bar * barBeats();
    const b = Math.floor(inBar / clickStep() + 1e-9);
    const sixteenth = Math.floor((inBar - b * clickStep()) / 0.25 + 1e-9);
    return `${bar + 1}.${b + 1}.${sixteenth + 1}`;
  }
  function formatTime(sec) {
    sec = Math.max(0, sec);
    const m = Math.floor(sec / 60);
    return `${m}:${(sec - m * 60).toFixed(1).padStart(4, '0')}`;
  }

  // ── Audio context + mixer ────────────────────────────────────────────────
  function ctx() {
    if (!audio.ctx) {
      if (window.MusicLabAudio) audio.ctx = window.MusicLabAudio.context();
      else audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const out = window.MusicLabAudio && window.MusicLabAudio.output ? window.MusicLabAudio.output() : audio.ctx.destination;
      audio.mix = createMixer(audio.ctx, out);
      audio.meter = audio.ctx.createAnalyser();
      audio.meter.fftSize = 1024;
      audio.meterData = new Float32Array(audio.meter.fftSize);
      audio.mix.master.connect(audio.meter);
      applyMix();
    }
    if (audio.ctx.state !== 'running') audio.ctx.resume();
    return audio.ctx;
  }

  function createMixer(c, dest) {
    const master = c.createGain();
    master.gain.value = project.masterVolume;
    const glue = c.createDynamicsCompressor();
    glue.threshold.value = -8; glue.knee.value = 8; glue.ratio.value = 4;
    glue.attack.value = 0.004; glue.release.value = 0.2;
    master.connect(glue);
    glue.connect(dest);
    const strips = new Map();
    function strip(track) {
      let s = strips.get(track.id);
      if (!s) {
        const gain = c.createGain(), pan = c.createStereoPanner();
        const input = c.createGain();
        gain.connect(pan); pan.connect(master);
        s = { input, gain, pan, effects: [], signature: null };
        strips.set(track.id, s);
      }
      const signature = JSON.stringify(track.effects || []);
      if (signature !== s.signature) {
        s.input.disconnect(); s.effects.forEach(e => e.dispose()); s.effects = [];
        let tail = s.input;
        (track.effects || []).forEach(effect => {
          if (effect.bypass || !window.AudioEffects.registry[effect.type]) return;
          const e = window.AudioEffects.registry[effect.type].create(c, window.AudioEffects.parameters(effect.type, effect.params));
          tail.connect(e.input); tail = e.output; s.effects.push(e);
        });
        tail.connect(s.gain); s.signature = signature;
      }
      return s;
    }
    return { master, strip, strips };
  }

  function applyMix() {
    if (!audio.mix) return;
    const now = audio.ctx.currentTime;
    audio.mix.master.gain.setTargetAtTime(project.masterVolume, now, 0.02);
    project.tracks.forEach((t) => {
      const s = audio.mix.strip(t);
      s.gain.gain.setTargetAtTime(audible(t) ? t.volume : 0, now, 0.02);
      s.pan.pan.setTargetAtTime(t.pan, now, 0.02);
    });
  }

  // ── Instruments ──────────────────────────────────────────────────────────
  const noiseBuffers = new WeakMap();
  function noise(c) {
    let b = noiseBuffers.get(c);
    if (!b) {
      b = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      noiseBuffers.set(c, b);
    }
    return b;
  }
  function osc(c, type, freq, t, out, level) {
    const o = c.createOscillator();
    o.type = type; o.frequency.value = freq;
    if (level === undefined) o.connect(out);
    else { const g = c.createGain(); g.gain.value = level; o.connect(g); g.connect(out); }
    o.start(t);
    return o;
  }
  function lowpass(c, out, freq, q) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q || 0.7;
    f.connect(out);
    return f;
  }

  // Each synth: envelope (a, d = decay time, s = sustain level, r = release) + a voice builder.
  const SYNTHS = {
    piano: {
      a: 0.003, d: 2.6, s: 0.03, r: 0.35, gain: 0.42,
      voice(c, f, v, t, out) {
        const filt = lowpass(c, out, 3000, 0.6);
        filt.frequency.setValueAtTime(Math.min(9000, 2600 + v * 4200 + f * 2), t);
        filt.frequency.setTargetAtTime(Math.min(4200, 900 + f * 1.6), t + 0.02, 0.5);
        const srcs = [[1, 1, 'triangle', 0], [2, 0.3, 'sine', 1.1], [3, 0.12, 'sine', 0.6], [4, 0.05, 'sine', 0.3]].map(([r, l, type, dec], i) => {
          const o = c.createOscillator(), g = c.createGain();
          o.type = type; o.frequency.value = f * r; o.detune.value = i ? (i % 2 ? 1.2 : -1.1) : 0;
          g.gain.setValueAtTime(l, t);
          if (dec) g.gain.setTargetAtTime(0, t, dec / 3);
          o.connect(g); g.connect(filt); o.start(t);
          return o;
        });
        const hammer = c.createBufferSource(), hf = c.createBiquadFilter(), hg = c.createGain();
        hammer.buffer = noise(c);
        hf.type = 'bandpass'; hf.frequency.value = Math.min(5200, 1800 + f); hf.Q.value = 0.8;
        hg.gain.setValueAtTime(0.06 * v, t); hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
        hammer.connect(hf); hf.connect(hg); hg.connect(filt);
        hammer.start(t, Math.random() * 0.5); hammer.stop(t + 0.05);
        return srcs;
      },
    },
    ePiano: {
      a: 0.003, d: 1.8, s: 0.22, r: 0.3, gain: 0.45,
      voice(c, f, v, t, out) {
        const car = osc(c, 'sine', f, t, out);
        const mod = c.createOscillator(), mg = c.createGain();
        mod.frequency.value = f;
        mg.gain.setValueAtTime(f * (0.6 + 2.2 * v), t);
        mg.gain.setTargetAtTime(f * 0.2, t, 0.35);
        mod.connect(mg); mg.connect(car.frequency); mod.start(t);
        const tine = c.createGain();
        tine.gain.setValueAtTime(0.12 * v, t); tine.gain.setTargetAtTime(0, t, 0.06);
        tine.connect(out);
        const bell = osc(c, 'sine', f * 4, t, tine);
        return [car, mod, bell];
      },
    },
    organ: {
      a: 0.01, d: 0.1, s: 0.95, r: 0.08, gain: 0.22,
      voice(c, f, v, t, out) {
        return [[0.5, 0.5], [1, 1], [2, 0.6], [3, 0.35], [4, 0.25], [8, 0.1]]
          .map(([r, l]) => osc(c, 'sine', f * r, t, out, l));
      },
    },
    pluck: {
      a: 0.002, d: 0.9, s: 0, r: 0.2, gain: 0.45,
      voice(c, f, v, t, out) {
        const filt = lowpass(c, out, 400, 1.2);
        filt.frequency.setValueAtTime(1200 + v * 5200, t);
        filt.frequency.setTargetAtTime(Math.max(300, f * 1.5), t, 0.08);
        return [osc(c, 'sawtooth', f, t, filt, 0.6), osc(c, 'triangle', f, t, filt, 0.8)];
      },
    },
    bass: {
      a: 0.005, d: 0.35, s: 0.65, r: 0.08, gain: 0.55,
      voice(c, f, v, t, out) {
        const filt = lowpass(c, out, 300, 2.5);
        filt.frequency.setValueAtTime(260 + f * 2 + v * 1100, t);
        filt.frequency.setTargetAtTime(220 + f * 1.5, t, 0.12);
        return [osc(c, 'sawtooth', f, t, filt, 0.55), osc(c, 'sine', f, t, out, 0.7)];
      },
    },
    strings: {
      a: 0.28, d: 0.6, s: 0.85, r: 0.55, gain: 0.2,
      voice(c, f, v, t, out) {
        const filt = lowpass(c, out, 2400 + v * 1600, 0.7);
        const vib = c.createOscillator(), depth = c.createGain();
        vib.frequency.value = 5.2;
        depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(7, t + 0.45);
        vib.connect(depth); vib.start(t);
        const a = osc(c, 'sawtooth', f, t, filt), b = osc(c, 'sawtooth', f, t, filt);
        a.detune.value = -7; b.detune.value = 7;
        depth.connect(a.detune); depth.connect(b.detune);
        return [a, b, vib];
      },
    },
    pad: {
      a: 0.6, d: 1.2, s: 0.8, r: 1.3, gain: 0.16,
      voice(c, f, v, t, out) {
        const filt = lowpass(c, out, 900 + v * 900, 1);
        return [-11, 0, 9].map((cents) => { const o = osc(c, 'sawtooth', f, t, filt); o.detune.value = cents; return o; })
          .concat([osc(c, 'sine', f / 2, t, out, 0.5)]);
      },
    },
    synth: {
      a: 0.008, d: 0.3, s: 0.7, r: 0.16, gain: 0.24,
      voice(c, f, v, t, out) {
        const filt = lowpass(c, out, 1800, 4);
        filt.frequency.setValueAtTime(600 + v * 5200, t);
        filt.frequency.setTargetAtTime(1500 + f, t + 0.01, 0.15);
        const a = osc(c, 'sawtooth', f, t, filt), b = osc(c, 'square', f, t, filt, 0.5);
        a.detune.value = -6; b.detune.value = 6;
        return [a, b];
      },
    },
  };

  function envLevel(voice, time) {
    const { t, def, peak } = voice, dt = time - t;
    if (dt <= 0) return 0;
    if (dt < def.a) return peak * dt / def.a;
    return peak * def.s + (peak - peak * def.s) * Math.exp(-(dt - def.a) / (def.d / 3));
  }

  // Starts a pitched note at time t; call voice.release(time) to end it.
  function startVoice(c, out, instrument, pitch, vel, t) {
    const def = SYNTHS[instrument] || SYNTHS.piano;
    const env = c.createGain();
    env.connect(out);
    const peak = def.gain * (0.3 + 0.7 * vel);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + def.a);
    env.gain.setTargetAtTime(peak * def.s, t + def.a, def.d / 3);
    const sources = def.voice(c, midiHz(pitch), vel, t, env);
    const voice = {
      t, def, peak, env, sources, done: false,
      release(at) {
        if (voice.done) return;
        voice.done = true;
        at = Math.max(at, t + 0.01);
        env.gain.cancelScheduledValues(at);
        env.gain.setValueAtTime(envLevel(voice, at), at);
        env.gain.setTargetAtTime(0, at, def.r / 3);
        const end = at + def.r * 1.8 + 0.05;
        sources.forEach((s) => { try { s.stop(end); } catch (_e) { /* already stopped */ } });
        sources[0].onended = () => { env.disconnect(); transport.voices.delete(voice); };
      },
      kill(at) {
        voice.done = true;
        env.gain.cancelScheduledValues(at);
        env.gain.setTargetAtTime(0, at, 0.01);
        sources.forEach((s) => { try { s.stop(at + 0.06); } catch (_e) { /* already stopped */ } });
      },
    };
    return voice;
  }

  const drumKits = new WeakMap();
  function drumHit(c, out, key, vel, t) {
    if (!window.DrumEngine) return;
    let kit = drumKits.get(out);
    if (!kit) { kit = window.DrumEngine.create(c, out); drumKits.set(out, kit); }
    kit.hit(IO.drumVoiceForKey(key), t, 0.35 + 0.65 * vel);
  }

  function clickAt(c, out, t, accent) {
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.value = accent ? 1760 : 1180;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(accent ? 0.5 : 0.32, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.08);
  }

  // ── Scheduling (shared by live playback and offline export) ─────────────
  // env: { c, timeOf(beat), destFor(track), segEnd, onVoice?(v), onSource?(s) }
  function scheduleNotes(env, a, b, tracks) {
    tracks.forEach((track) => {
      if (track.kind !== 'instrument') return;
      track.clips.forEach((clip) => {
        if (clip.start >= b || clip.start + clip.length <= a) return;
        clip.notes.forEach((n) => {
          if (n.start < 0 || n.start >= clip.length) return;
          const nb = clip.start + n.start;
          if (nb < a || nb >= b) return;
          const out = env.destFor(track);
          const t0 = env.timeOf(nb);
          if (track.instrument === 'drums') { drumHit(env.c, out, n.pitch, n.velocity, t0); return; }
          const end = Math.min(nb + n.duration, clip.start + clip.length, env.segEnd);
          const v = startVoice(env.c, out, track.instrument, n.pitch, n.velocity, t0);
          v.release(env.timeOf(end));
          if (env.onVoice) env.onVoice(v);
        });
      });
    });
  }

  function scheduleAudio(env, segBeat, segEnd, tracks) {
    tracks.forEach((track) => {
      if (track.kind !== 'audio') return;
      track.clips.forEach((clip) => {
        const entry = buffers.get(clip.bufferId);
        if (!entry) return;
        const end = Math.min(clipEnd(clip), segEnd);
        const from = Math.max(clip.start, segBeat);
        if (end <= from) return;
        let when = env.timeOf(from);
        let into = clip.offset + (from - clip.start) * spb();
        let dur = (end - from) * spb();
        const late = env.c.currentTime - when;
        if (late > 0 && !env.offline) { when += late; into += late; dur -= late; }
        if (dur <= 0.01) return;
        const src = env.c.createBufferSource(), g = env.c.createGain();
        src.buffer = entry.buffer;
        const level = clip.gain === undefined ? 1 : clip.gain;
        const fade = Math.min(0.006, dur / 4);
        g.gain.setValueAtTime(0, when);
        g.gain.linearRampToValueAtTime(level, when + fade);
        g.gain.setValueAtTime(level, when + dur - fade);
        g.gain.linearRampToValueAtTime(0, when + dur);
        src.connect(g); g.connect(env.destFor(track));
        src.start(when, into, dur);
        if (env.onSource) {
          env.onSource(src);
          src.onended = () => { transport.sources.delete(src); g.disconnect(); };
        }
      });
    });
  }

  function scheduleClicks(env, a, b) {
    const step = clickStep(), bar = barBeats();
    for (let k = Math.ceil(a / step - 1e-9) * step; k < b; k += step) {
      const counting = transport.recording && k < transport.recStart;
      if (!project.metronome && !counting) continue;
      const inBar = ((k % bar) + bar) % bar;
      clickAt(env.c, env.destFor(null), env.timeOf(k), inBar < 1e-6);
    }
  }

  // ── Transport ────────────────────────────────────────────────────────────
  function gate(trackId) {
    let g = transport.gates.get(trackId);
    if (!g) {
      const c = audio.ctx;
      g = c.createGain();
      if (trackId === 'click') g.connect(audio.mix.master);
      else g.connect(audio.mix.strip(findTrack(trackId) || { id: trackId }).input);
      transport.gates.set(trackId, g);
    }
    return g;
  }

  function liveEnv(seg) {
    return {
      c: audio.ctx,
      timeOf: (beat) => seg.time + (beat - seg.beat) * spb(),
      destFor: (track) => gate(track ? track.id : 'click'),
      segEnd: seg.end,
      onVoice: (v) => transport.voices.add(v),
      onSource: (s) => transport.sources.add(s),
    };
  }

  function beatAt(time) {
    const segs = transport.segs;
    if (!segs.length) return ui.playhead;
    let seg = segs[0];
    for (const s of segs) if (s.time <= time) seg = s;
    return seg.beat + (time - seg.time) / spb();
  }

  function loopActive() {
    return project.loop.on && !transport.recording && project.loop.end > project.loop.start;
  }

  function play(fromBeat) {
    const c = ctx();
    stopSounds();
    let start = fromBeat === undefined ? ui.playhead : fromBeat;
    if (loopActive() && (start >= project.loop.end || start < project.loop.start - 1e-9)) start = project.loop.start;
    const seg = { beat: start, time: c.currentTime + 0.08, end: loopActive() ? project.loop.end : Infinity };
    transport.segs = [seg];
    transport.schedBeat = start;
    transport.playing = true;
    transport.startBeat = start;
    scheduleAudio(liveEnv(seg), seg.beat, seg.end, project.tracks);
    clearInterval(transport.timer);
    transport.timer = setInterval(tick, 25);
    tick();
    updateTransportUi();
  }

  function tick() {
    const c = audio.ctx;
    const horizon = c.currentTime + LOOKAHEAD;
    for (let guard = 0; guard < 8; guard++) {
      const seg = transport.segs[transport.segs.length - 1];
      const segEndTime = seg.time + (seg.end - seg.beat) * spb();
      const winEndTime = Math.min(horizon, segEndTime);
      const winEndBeat = seg.beat + (winEndTime - seg.time) / spb();
      if (winEndBeat > transport.schedBeat) {
        const env = liveEnv(seg);
        scheduleNotes(env, transport.schedBeat, winEndBeat, project.tracks);
        scheduleClicks(env, transport.schedBeat, winEndBeat);
        transport.schedBeat = winEndBeat;
      }
      if (Number.isFinite(seg.end) && segEndTime <= horizon) {
        const next = { beat: project.loop.start, time: segEndTime, end: project.loop.end };
        transport.segs.push(next);
        if (transport.segs.length > 3) transport.segs.shift();
        transport.schedBeat = next.beat;
        scheduleAudio(liveEnv(next), next.beat, next.end, project.tracks);
        continue;
      }
      break;
    }
    // Stop at the end of the song (unless playing past it on purpose, e.g. with the click).
    const end = songEnd();
    if (!transport.recording && !Number.isFinite(transport.segs[transport.segs.length - 1].end)
      && end > transport.startBeat && beatAt(c.currentTime) > end + 1) pause(end);
  }

  function stopSounds() {
    const c = audio.ctx;
    if (!c) return;
    const now = c.currentTime;
    clearInterval(transport.timer);
    transport.timer = null;
    transport.voices.forEach((v) => v.kill(now));
    transport.voices.clear();
    transport.sources.forEach((s) => { try { s.stop(now + 0.03); } catch (_e) { /* not started */ } });
    transport.sources.clear();
    transport.gates.forEach((g) => {
      g.gain.setTargetAtTime(0, now, 0.008);
      setTimeout(() => g.disconnect(), 400);
    });
    transport.gates.clear();
  }

  // Stops where it is (or at `at`). Pressing Stop while stopped returns to the start.
  function pause(at) {
    if (!transport.playing) return;
    const c = audio.ctx;
    const pos = at !== undefined ? at : beatAt(c.currentTime);
    stopSounds();
    transport.playing = false;
    const wasRecording = transport.recording;
    if (wasRecording) finishRecording(pos);
    transport.recording = false;
    ui.playhead = Math.max(0, pos);
    transport.segs = [];
    updateTransportUi();
    drawPlayhead();
  }

  function stop() {
    if (transport.playing) pause();
    else setPlayhead(project.loop.on ? project.loop.start : 0);
  }

  function togglePlay() {
    if (transport.playing) pause();
    else play();
  }

  function restartIfPlaying() {
    if (!transport.playing || transport.recording) return;
    const pos = beatAt(audio.ctx.currentTime);
    play(Math.max(0, pos));
  }

  function setPlayhead(beat) {
    ui.playhead = Math.max(0, beat);
    if (transport.playing && !transport.recording) play(ui.playhead);
    drawPlayhead();
    updateLcd();
  }

  // ── Recording ────────────────────────────────────────────────────────────
  function armedTrack() { return project.tracks.find((t) => t.armed) || null; }

  async function record() {
    if (transport.recording) { pause(); return; }
    let track = armedTrack();
    if (!track) {
      track = findTrack(ui.selTrack) || project.tracks.find((t) => t.kind === 'instrument');
      if (!track) { status('Add a track first, then press record.'); return; }
      await setArmed(track, true);
      if (!track.armed) return;
    }
    if (track.kind === 'audio' && !mic.node) { status('Microphone is not ready.'); return; }
    if (transport.playing) pause();
    transport.recording = true;
    transport.recStart = ui.playhead;
    transport.take = { track: track.id, notes: [], open: new Map() };
    const pre = project.countIn ? barBeats() : 0;
    if (track.kind === 'audio') {
      mic.chunks = [];
      mic.capturing = true;
      mic.node.port.postMessage('start');
    }
    play(transport.recStart - pre);
    status(track.kind === 'audio'
      ? `Recording audio on “${track.name}”${pre ? ' after a one-bar count-in' : ''}… press Stop or Space to finish.`
      : `Recording on “${track.name}”${pre ? ' after a one-bar count-in' : ''}. Play the keyboard, QWERTY keys or a MIDI device.`);
  }

  function finishRecording(stopBeat) {
    const take = transport.take;
    transport.take = null;
    const track = take && findTrack(take.track);
    if (!track) return;
    if (track.kind === 'audio') { finishAudioTake(track, stopBeat); return; }
    take.open.forEach((on, pitch) => {
      take.notes.push({ pitch, start: on.beat, duration: Math.max(0.05, stopBeat - on.beat), velocity: on.vel });
    });
    if (!take.notes.length) { status('Nothing was played, so no clip was made.'); return; }
    const first = Math.min(transport.recStart, ...take.notes.map((n) => n.start));
    const last = Math.max(stopBeat, ...take.notes.map((n) => n.start + n.duration));
    const start = Math.max(0, floorTo(first, barBeats()));
    const clip = {
      id: uid(), type: 'midi', name: track.name + ' take', start,
      length: Math.max(barBeats(), Math.ceil((last - start) / barBeats() - 1e-9) * barBeats()),
      notes: take.notes.map((n) => ({ ...n, start: Math.max(0, n.start - start) })),
    };
    track.clips.push(clip);
    select(track.id, clip.id);
    commit();
    status(`Recorded ${clip.notes.length} note${clip.notes.length === 1 ? '' : 's'}. Tidy the timing with Quantize in the editor below.`);
  }

  async function finishAudioTake(track, stopBeat) {
    const firstSeg = transport.segs[0];
    const recStart = transport.recStart;
    mic.node.port.postMessage('stop');
    await new Promise((r) => setTimeout(r, 150));
    mic.capturing = false;
    const chunks = mic.chunks;
    mic.chunks = [];
    if (!chunks.length) { status('No audio came in from the microphone.'); return; }
    const c = audio.ctx, sr = c.sampleRate;
    const nCh = chunks[0].channels.length || 1;
    const total = chunks.reduce((sum, ch) => sum + ch.channels[0].length, 0);
    const buffer = new AudioBuffer({ length: total, numberOfChannels: nCh, sampleRate: sr });
    for (let ch = 0; ch < nCh; ch++) {
      const data = buffer.getChannelData(ch);
      let o = 0;
      chunks.forEach((k) => { data.set(k.channels[ch] || k.channels[0], o); o += k.channels[0].length; });
    }
    // Line the take up with the song: the frame the beat was heard on, plus the
    // round-trip latency the browser reports, is where the performance starts.
    const seg = firstSeg || { beat: recStart, time: chunks[0].frame / sr };
    const recStartTime = seg.time + (recStart - seg.beat) * spb();
    const latency = (c.baseLatency || 0) + (c.outputLatency || 0);
    const offset = Math.max(0, recStartTime + latency - chunks[0].frame / sr);
    const duration = Math.min(buffer.duration - offset, Math.max(0, stopBeat - recStart) * spb() + 0.05);
    if (duration < 0.1) { status('That take was too short to keep.'); return; }
    const id = addBuffer(buffer, `${track.name} take`);
    const clip = { id: uid(), type: 'audio', name: `${track.name} take`, bufferId: id, start: recStart, offset, duration, gain: 1 };
    track.clips.push(clip);
    select(track.id, clip.id);
    commit();
    status(`Recorded ${duration.toFixed(1)} s of audio on “${track.name}”.`);
  }

  async function setArmed(track, on) {
    project.tracks.forEach((t) => { if (t !== track) t.armed = false; });
    if (on && track.kind === 'audio') {
      const ok = await ensureMic();
      if (!ok) on = false;
    }
    track.armed = on;
    if (!project.tracks.some((t) => t.armed && t.kind === 'audio')) releaseMic();
    renderTracks();
    if (on) {
      status(track.kind === 'audio'
        ? `“${track.name}” is armed. Press ⏺ to record from the microphone (headphones stop the speakers bleeding in).`
        : `“${track.name}” is armed: the keyboard, QWERTY keys and MIDI now play its ${INSTRUMENTS[track.instrument]}. Press ⏺ to record.`);
    }
  }

  async function ensureMic() {
    if (mic.node) return true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.AudioWorkletNode) {
      status('This browser cannot record audio. Try Chrome, Edge or Firefox.');
      return false;
    }
    const c = ctx();
    try {
      mic.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      await c.audioWorklet.addModule(WORKLET_URL);
    } catch (err) {
      releaseMic();
      status(err && err.name === 'NotAllowedError'
        ? 'Microphone permission was blocked. Allow it in the address bar, then arm the track again.'
        : 'No microphone was found.');
      return false;
    }
    mic.source = c.createMediaStreamSource(mic.stream);
    mic.node = new AudioWorkletNode(c, 'daw-recorder', { numberOfOutputs: 1, outputChannelCount: [1] });
    mic.node.port.onmessage = (e) => { if (mic.capturing) mic.chunks.push(e.data); };
    mic.sink = c.createGain();
    mic.sink.gain.value = 0;
    mic.analyser = c.createAnalyser();
    mic.analyser.fftSize = 1024;
    mic.source.connect(mic.node);
    mic.source.connect(mic.analyser);
    mic.node.connect(mic.sink);
    mic.sink.connect(c.destination);
    return true;
  }

  function releaseMic() {
    if (mic.capturing) return;
    if (mic.stream) mic.stream.getTracks().forEach((t) => t.stop());
    [mic.source, mic.node, mic.sink, mic.analyser].forEach((n) => { if (n) n.disconnect(); });
    Object.assign(mic, { stream: null, source: null, node: null, sink: null, analyser: null });
  }

  // Keyboard / MIDI input from music-lab.js. Returns true when the studio is
  // playing the note (so Music Lab stays silent and the sounds don't double up).
  function noteOn(pitch, velocity, gmDrum) {
    const track = armedTrack();
    if (!track || track.kind !== 'instrument') return false;
    const c = ctx();
    const vel = velocity === undefined ? 0.8 : velocity;
    let key = pitch;
    if (track.instrument === 'drums') {
      key = (gmDrum || pitch < 48) && IO.DRUM_LABELS[pitch] ? pitch : DRUM_LAYOUT[pitch % 12];
      drumHit(c, audio.mix.strip(track).input, key, vel, c.currentTime);
    } else {
      if (live.has(pitch)) live.get(pitch).release(c.currentTime);
      live.set(pitch, startVoice(c, audio.mix.strip(track).input, track.instrument, pitch, vel, c.currentTime));
    }
    const take = transport.take;
    if (transport.recording && take && take.track === track.id) {
      let beat = beatAt(c.currentTime);
      // A note a touch early for the downbeat still belongs to the take.
      if (beat < transport.recStart && beat > transport.recStart - 0.5) beat = transport.recStart;
      if (beat >= transport.recStart) {
        if (take.open.has(pitch)) closeTakeNote(pitch, beat);
        take.open.set(pitch, { beat, vel, key });
      }
    }
    return true;
  }

  function closeTakeNote(pitch, beat) {
    const take = transport.take, on = take.open.get(pitch);
    take.open.delete(pitch);
    take.notes.push({ pitch: on.key, start: on.beat, duration: Math.max(0.05, beat - on.beat), velocity: on.vel });
  }

  function noteOff(pitch) {
    const voice = live.get(pitch);
    if (voice && audio.ctx) { voice.release(audio.ctx.currentTime); live.delete(pitch); }
    const take = transport.take;
    if (transport.recording && take && take.open.has(pitch)) closeTakeNote(pitch, beatAt(audio.ctx.currentTime));
  }

  function drumPad(name) {
    const track = armedTrack();
    if (!track || track.kind !== 'instrument' || track.instrument !== 'drums') return false;
    const voice = (window.DrumEngine && window.DrumEngine.aliases[name]) || name;
    const key = IO.DRUM_KEYS[voice] || IO.DRUM_KEYS.perc;
    noteOn(key, 0.85, true);
    setTimeout(() => noteOff(key), 120);
    return true;
  }

  // ── Buffers ──────────────────────────────────────────────────────────────
  function addBuffer(buffer, name, id) {
    id = id || uid();
    buffers.set(id, { buffer, name, peaks: computePeaks(buffer) });
    return id;
  }
  function computePeaks(buffer) {
    const step = 256, n = Math.ceil(buffer.length / step), peaks = new Float32Array(n);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const d = buffer.getChannelData(ch);
      for (let i = 0; i < n; i++) {
        let m = peaks[i];
        const end = Math.min(d.length, (i + 1) * step);
        for (let j = i * step; j < end; j++) { const v = Math.abs(d[j]); if (v > m) m = v; }
        peaks[i] = m;
      }
    }
    return { step, data: peaks, rate: buffer.sampleRate };
  }

  // ── History + autosave ───────────────────────────────────────────────────
  function snapshot() { return JSON.stringify(project); }
  function commit() {
    const now = snapshot();
    if (now === history.last) { render(); return; }
    history.undo.push(history.last);
    if (history.undo.length > 120) history.undo.shift();
    history.redo = [];
    history.last = now;
    render();
    applyMix();
    scheduleSave();
  }
  function restore(json) {
    project = JSON.parse(json);
    history.last = json;
    if (!findClip(ui.selClip)) { ui.selClip = null; ui.selNotes.clear(); }
    if (!findTrack(ui.selTrack)) ui.selTrack = null;
    render();
    applyMix();
    scheduleSave();
    restartIfPlaying();
  }
  function undo() {
    if (!history.undo.length) return;
    history.redo.push(history.last);
    restore(history.undo.pop());
  }
  function redo() {
    if (!history.redo.length) return;
    history.undo.push(history.last);
    restore(history.redo.pop());
  }

  let saveTimer = null;
  const savedBuffers = new Set();
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { autosave().catch(() => { /* storage full or blocked: keep working */ }); }, 900);
  }
  function openDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('no indexedDB')); return; }
      const req = indexedDB.open(STORAGE_DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  function idb(mode, fn) {
    return openDb().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction('kv', mode), store = tx.objectStore('kv');
      const out = fn(store);
      tx.oncomplete = () => { db.close(); resolve(out && out.result !== undefined ? out.result : out); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    }));
  }
  function usedBufferIds() {
    const ids = new Set();
    project.tracks.forEach((t) => t.clips.forEach((c) => { if (c.bufferId) ids.add(c.bufferId); }));
    return ids;
  }
  async function autosave() {
    const ids = usedBufferIds();
    await idb('readwrite', (store) => {
      store.put(snapshot(), 'project');
      ids.forEach((id) => {
        if (savedBuffers.has(id)) return;
        const e = buffers.get(id);
        if (!e) return;
        const b = e.buffer;
        const channels = [];
        for (let ch = 0; ch < b.numberOfChannels; ch++) channels.push(b.getChannelData(ch).slice());
        store.put({ name: e.name, sampleRate: b.sampleRate, channels }, 'buffer:' + id);
        savedBuffers.add(id);
      });
      // Drop audio no longer used by the song or anything in undo history.
      const keep = new Set(ids);
      history.undo.concat(history.redo).forEach((s) => { (s.match(/"bufferId":"[a-z0-9]+"/g) || []).forEach((m) => keep.add(m.slice(12, -1))); });
      const keys = store.getAllKeys();
      keys.onsuccess = () => keys.result.forEach((k) => {
        if (String(k).startsWith('buffer:') && !keep.has(k.slice(7))) { store.delete(k); savedBuffers.delete(k.slice(7)); }
      });
    });
  }
  async function loadAutosave() {
    let json;
    try { json = await idb('readonly', (store) => store.get('project')); } catch (_e) { return false; }
    if (!json) return false;
    let saved;
    try { saved = JSON.parse(json); } catch (_e) { return false; }
    if (!saved || !Array.isArray(saved.tracks)) return false;
    const ids = new Set();
    saved.tracks.forEach((t) => t.clips.forEach((c) => { if (c.bufferId) ids.add(c.bufferId); }));
    const rows = await idb('readonly', (store) => {
      const out = {};
      ids.forEach((id) => { const r = store.get('buffer:' + id); r.onsuccess = () => { out[id] = r.result; }; });
      return out;
    });
    Object.keys(rows).forEach((id) => {
      const row = rows[id];
      if (!row) return;
      const buffer = new AudioBuffer({ length: row.channels[0].length, numberOfChannels: row.channels.length, sampleRate: row.sampleRate });
      row.channels.forEach((d, ch) => buffer.copyToChannel(d, ch));
      addBuffer(buffer, row.name, id);
      savedBuffers.add(id);
    });
    saved.tracks.forEach((t) => { t.armed = false; t.clips = t.clips.filter((c) => c.type !== 'audio' || buffers.has(c.bufferId)); });
    project = saved;
    return true;
  }

  // ── Editing operations ───────────────────────────────────────────────────
  function addTrack(kind, instrument) {
    const n = project.tracks.filter((t) => t.kind === kind).length + 1;
    const name = kind === 'audio' ? `Audio ${n}` : INSTRUMENTS[instrument || 'piano'];
    const track = makeTrack(kind, name, instrument, project.tracks.length);
    project.tracks.push(track);
    ui.selTrack = track.id;
    return track;
  }
  function deleteTrack(id) {
    const t = findTrack(id);
    if (!t) return;
    if (t.clips.length && !confirm(`Delete “${t.name}” and its ${t.clips.length} clip${t.clips.length === 1 ? '' : 's'}? (Undo can bring it back.)`)) return;
    project.tracks = project.tracks.filter((x) => x.id !== id);
    if (ui.selTrack === id) ui.selTrack = null;
    if (ui.selClip && !findClip(ui.selClip)) ui.selClip = null;
    if (t.armed) releaseMic();
    commit();
  }
  function newMidiClip(track, start, length) {
    const clip = { id: uid(), type: 'midi', name: track.name, start, length: length || barBeats() * 2, notes: [] };
    track.clips.push(clip);
    return clip;
  }
  function select(trackId, clipId) {
    ui.selTrack = trackId;
    if (ui.selClip !== clipId) ui.selNotes.clear();
    ui.selClip = clipId;
  }
  function selected() { return ui.selClip ? findClip(ui.selClip) : null; }

  function splitClip() {
    const sel = selected();
    if (!sel) { status('Select a clip, move the playhead into it, then split.'); return; }
    const { track, clip } = sel;
    const at = snapTo(ui.playhead, snapGrid() || 0.25);
    if (at <= clip.start + 1e-6 || at >= clipEnd(clip) - 1e-6) { status('Move the playhead inside the selected clip to split it there.'); return; }
    const cut = at - clip.start;
    const right = JSON.parse(JSON.stringify(clip));
    right.id = uid();
    right.start = at;
    if (clip.type === 'audio') {
      right.offset = clip.offset + cut * spb();
      right.duration = clip.duration - cut * spb();
      clip.duration = cut * spb();
    } else {
      right.length = clip.length - cut;
      right.notes = clip.notes.filter((n) => n.start >= cut).map((n) => ({ ...n, start: n.start - cut }));
      clip.notes = clip.notes.filter((n) => n.start < cut).map((n) => ({ ...n, duration: Math.min(n.duration, cut - n.start) }));
      clip.length = cut;
    }
    track.clips.push(right);
    commit();
  }
  function duplicateClip() {
    const sel = selected();
    if (!sel) return;
    const copy = JSON.parse(JSON.stringify(sel.clip));
    copy.id = uid();
    copy.start = clipEnd(sel.clip);
    if (sel.clip.type === 'midi') copy.start = Math.ceil(copy.start / barBeats() - 1e-9) * barBeats();
    sel.track.clips.push(copy);
    select(sel.track.id, copy.id);
    commit();
  }
  function deleteClip() {
    const sel = selected();
    if (!sel) return;
    sel.track.clips = sel.track.clips.filter((c) => c !== sel.clip);
    ui.selClip = null;
    ui.selNotes.clear();
    commit();
  }
  function loopClip() {
    const sel = selected();
    if (!sel) return;
    project.loop = { on: true, start: sel.clip.start, end: clipEnd(sel.clip) };
    commit();
    restartIfPlaying();
  }

  // ── Import ───────────────────────────────────────────────────────────────
  const AUDIO_EXT = /\.(wav|wave|mp3|ogg|oga|opus|m4a|aac|flac|webm|aif|aiff)$/i;
  async function importFiles(fileList, atBeat) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const start = atBeat !== undefined ? atBeat : ui.playhead;
    const projectFile = files.find((f) => /\.(zip|mlab)$/i.test(f.name));
    if (projectFile) { await openProjectFile(projectFile); return; }
    let added = 0;
    const errors = [];
    for (const file of files) {
      try {
        if (/\.midi?$/i.test(file.name) || file.type === 'audio/midi' || file.type === 'audio/x-midi') {
          added += await importMidi(file, start);
        } else if (AUDIO_EXT.test(file.name) || file.type.startsWith('audio/') || file.type.startsWith('video/')) {
          await importAudio(file, start);
          added++;
        } else {
          errors.push(`${file.name} isn’t an audio, MIDI or project file`);
        }
      } catch (err) {
        errors.push(`${file.name}: ${err && err.message ? err.message : 'could not be read'}`);
      }
    }
    if (added) commit();
    status([added ? `Imported ${added} track${added === 1 ? '' : 's'}.` : '', errors.join(' · ')].filter(Boolean).join(' '));
  }

  function baseName(name) { return name.replace(/\.[^.]+$/, '').slice(0, 40); }

  async function importAudio(file, start) {
    const c = ctx();
    const data = await file.arrayBuffer();
    let buffer;
    try { buffer = await c.decodeAudioData(data); } catch (_e) { throw new Error('this browser can’t decode that audio format'); }
    const id = addBuffer(buffer, baseName(file.name));
    const track = addTrack('audio');
    track.name = baseName(file.name);
    const clip = { id: uid(), type: 'audio', name: track.name, bufferId: id, start, offset: 0, duration: buffer.duration, gain: 1 };
    track.clips.push(clip);
    select(track.id, clip.id);
  }

  async function importMidi(file, start) {
    const song = IO.parseMidi(await file.arrayBuffer());
    if (!song.tracks.length) throw new Error('no notes in that MIDI file');
    const empty = !project.tracks.some((t) => t.clips.some((c) => c.type === 'audio' || c.notes.length));
    if (empty) {
      if (song.bpm) project.bpm = clamp(Math.round(song.bpm), 40, 240);
      if (song.timeSig && [2, 3, 4, 5, 6, 7, 9, 12].includes(song.timeSig[0]) && [4, 8].includes(song.timeSig[1])) project.sig = song.timeSig;
      project.name = baseName(file.name);
    }
    start = floorTo(start, barBeats());
    song.tracks.forEach((st) => {
      const track = addTrack('instrument', st.instrument);
      track.name = st.name.slice(0, 40);
      const end = Math.max(...st.notes.map((n) => n.start + n.duration));
      const clip = newMidiClip(track, start, Math.max(barBeats(), Math.ceil(end / barBeats() - 1e-9) * barBeats()));
      clip.name = track.name;
      clip.notes = st.notes.map((n) => ({ pitch: n.pitch, start: n.start, duration: n.duration, velocity: Math.round(n.velocity * 100) / 100 }));
      select(track.id, clip.id);
    });
    return song.tracks.length;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('could not load ' + src));
      document.head.appendChild(s);
    });
  }
  async function zipLib() {
    if (!window.JSZip) await loadScript(JSZIP_URL);
    return window.JSZip;
  }

  async function openProjectFile(file) {
    if (project.tracks.some((t) => t.clips.length) && !confirm('Open this project? The current song will be replaced (it stays in Undo).')) return;
    try {
      const JSZip = await zipLib();
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const entry = zip.file('project.json');
      if (!entry) throw new Error('no project.json inside');
      const data = JSON.parse(await entry.async('string'));
      if (!data || !Array.isArray(data.tracks)) throw new Error('project.json is not a Music Lab song');
      const c = ctx();
      for (const meta of data.audio || []) {
        const f = zip.file(meta.file);
        if (!f) continue;
        const buffer = await c.decodeAudioData(await f.async('arraybuffer'));
        addBuffer(buffer, meta.name || meta.id, meta.id);
      }
      delete data.audio;
      data.tracks.forEach((t) => { t.armed = false; t.clips = t.clips.filter((cl) => cl.type !== 'audio' || buffers.has(cl.bufferId)); });
      if (transport.playing) pause();
      project = Object.assign(defaultProject(), data);
      ui.selClip = null; ui.selTrack = null; ui.playhead = 0;
      commit();
      status(`Opened “${project.name}”.`);
    } catch (err) {
      status(`Couldn’t open ${file.name}: ${err.message}`);
    }
  }

  // ── Export ───────────────────────────────────────────────────────────────
  function download(data, filename, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function fileSafe(s) { return (String(s || 'song').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'song').slice(0, 50); }

  async function renderOffline(fromBeat, toBeat, tracks, useMix) {
    const sr = audio.ctx ? audio.ctx.sampleRate : 44100;
    const seconds = (toBeat - fromBeat) * spb() + 2.5;
    const oc = new OfflineAudioContext(2, Math.ceil(seconds * sr), sr);
    const mix = createMixer(oc, oc.destination);
    tracks.forEach((t) => {
      const s = mix.strip(t);
      s.gain.gain.value = useMix && !audible(t) ? 0 : t.volume;
      s.pan.pan.value = t.pan;
    });
    const env = {
      c: oc, offline: true, segEnd: toBeat,
      timeOf: (beat) => (beat - fromBeat) * spb(),
      destFor: (track) => mix.strip(track).input,
    };
    scheduleNotes(env, fromBeat, toBeat, tracks);
    scheduleAudio(env, fromBeat, toBeat, tracks);
    const rendered = await oc.startRendering();
    return trimTail(rendered, (toBeat - fromBeat) * spb());
  }
  // Keep the release/ring-out after the last beat, but not seconds of silence.
  function trimTail(buffer, musicSeconds) {
    const sr = buffer.sampleRate, min = Math.ceil(musicSeconds * sr);
    let end = min;
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const d = buffer.getChannelData(ch);
      for (let i = d.length - 1; i > end; i--) if (Math.abs(d[i]) > 0.0005) { end = i; break; }
    }
    end = Math.min(buffer.length, end + Math.round(sr * 0.05));
    return Array.from({ length: buffer.numberOfChannels }, (_, ch) => buffer.getChannelData(ch).slice(0, end));
  }
  function exportRange() {
    const end = songEnd();
    return { from: 0, to: Math.max(barBeats(), Math.ceil(end / barBeats() - 1e-9) * barBeats()) };
  }

  async function busy(label, fn) {
    status(label);
    root.classList.add('is-busy');
    try { await fn(); } catch (err) { status(`Export failed: ${err && err.message ? err.message : err}`); }
    finally { root.classList.remove('is-busy'); }
  }

  function exportMix(loopOnly) {
    if (!songEnd()) { status('There’s nothing to export yet: add or record some clips first.'); return; }
    return busy('Rendering the mix…', async () => {
      const range = loopOnly ? { from: project.loop.start, to: project.loop.end } : exportRange();
      const channels = await renderOffline(range.from, range.to, project.tracks, true);
      download(IO.encodeWav(channels, ctxRate(), 16), `${fileSafe(project.name)}${loopOnly ? '-loop' : ''}.wav`, 'audio/wav');
      status(`Exported the ${loopOnly ? 'loop' : 'song'} mix as a WAV file.`);
    });
  }
  function ctxRate() { return audio.ctx ? audio.ctx.sampleRate : 44100; }

  function exportStems() {
    const tracks = project.tracks.filter((t) => t.clips.length);
    if (!tracks.length) { status('There are no tracks with clips to export.'); return; }
    return busy('Rendering stems…', async () => {
      const JSZip = await zipLib();
      const zip = new JSZip();
      const range = exportRange();
      for (let i = 0; i < tracks.length; i++) {
        status(`Rendering stem ${i + 1} of ${tracks.length}: ${tracks[i].name}…`);
        const channels = await renderOffline(range.from, range.to, [tracks[i]], false);
        // Stems all run to the song's length so they line up when imported anywhere.
        zip.file(`${String(i + 1).padStart(2, '0')} ${fileSafe(tracks[i].name)}.wav`, IO.encodeWav(channels, ctxRate(), 16));
      }
      zip.file('README.txt', `${project.name}\nTempo: ${project.bpm} BPM, ${project.sig.join('/')}\nEvery stem starts at bar 1 — drop them all at the start of a project to line them up.\n`);
      download(await zip.generateAsync({ type: 'blob' }), `${fileSafe(project.name)}-stems.zip`);
      status(`Exported ${tracks.length} stem${tracks.length === 1 ? '' : 's'} (one WAV per track) in a ZIP.`);
    });
  }

  function exportMidi() {
    const tracks = project.tracks.filter((t) => t.kind === 'instrument' && t.clips.some((c) => c.notes.length));
    if (!tracks.length) { status('No instrument tracks have notes. (Audio tracks can’t be saved as MIDI — use a WAV export.)'); return; }
    const song = {
      name: project.name, bpm: project.bpm, timeSig: project.sig,
      tracks: tracks.map((t) => ({
        name: t.name, instrument: t.instrument, volume: t.volume, pan: t.pan,
        notes: t.clips.flatMap((c) => c.notes
          .filter((n) => n.start >= 0 && n.start < c.length)
          .map((n) => ({ pitch: n.pitch, start: c.start + n.start, duration: Math.min(n.duration, c.length - n.start), velocity: n.velocity }))),
      })),
    };
    download(IO.writeMidi(song), `${fileSafe(project.name)}.mid`, 'audio/midi');
    const skipped = project.tracks.filter((t) => t.kind === 'audio' && t.clips.length).length;
    status(`Exported ${tracks.length} MIDI track${tracks.length === 1 ? '' : 's'}${skipped ? ` (${skipped} audio track${skipped === 1 ? '' : 's'} left out — MIDI holds notes, not sound)` : ''}.`);
  }

  function saveProject() {
    return busy('Packing the project…', async () => {
      const JSZip = await zipLib();
      const zip = new JSZip();
      const data = JSON.parse(snapshot());
      data.tracks.forEach((t) => { t.armed = false; });
      data.audio = [];
      usedBufferIds().forEach((id) => {
        const e = buffers.get(id);
        if (!e) return;
        const chans = [];
        for (let ch = 0; ch < e.buffer.numberOfChannels; ch++) chans.push(e.buffer.getChannelData(ch));
        const file = `audio/${id}.wav`;
        zip.file(file, IO.encodeWav(chans, e.buffer.sampleRate, 16));
        data.audio.push({ id, name: e.name, file });
      });
      data.app = 'ClassroomOS Music Lab Track Studio';
      zip.file('project.json', JSON.stringify(data, null, 1));
      download(await zip.generateAsync({ type: 'blob' }), `${fileSafe(project.name)}.mlab.zip`);
      status('Saved the project. Open it again with Project → Open, or drop it on the studio.');
    });
  }

  function newProject() {
    if (project.tracks.some((t) => t.clips.length) && !confirm('Start a new song? The current one stays in Undo until you leave the page.')) return;
    if (transport.playing) pause();
    project = defaultProject();
    ui.selClip = null; ui.selTrack = null; ui.playhead = 0;
    commit();
  }

  // ── DOM: shell ───────────────────────────────────────────────────────────
  const snapOptions = [['bar', 'Bar'], [1, 'Beat'], [0.5, '1/8'], [0.25, '1/16'], [0, 'Off']];
  const gridOptions = [[1, '1/4'], [0.5, '1/8'], [0.25, '1/16'], [0.125, '1/32'], [1 / 3, '1/8 triplet'], [1 / 6, '1/16 triplet']];
  const instrumentOptions = (sel) => Object.keys(INSTRUMENTS).map((k) => `<option value="${k}"${k === sel ? ' selected' : ''}>${INSTRUMENTS[k]}</option>`).join('');

  root.innerHTML = `
    <div class="daw-bar daw-transport" role="toolbar" aria-label="Transport">
      <div class="daw-group">
        <button type="button" class="daw-btn" data-act="home" aria-label="Back to start" title="Back to start (Home)">⏮</button>
        <button type="button" class="daw-btn daw-play" data-act="play" aria-label="Play" title="Play / pause (Space)">▶</button>
        <button type="button" class="daw-btn" data-act="stop" aria-label="Stop" title="Stop (press twice to go back to the start)">⏹</button>
        <button type="button" class="daw-btn daw-rec" data-act="record" aria-label="Record" title="Record on the armed track">⏺</button>
      </div>
      <div class="daw-lcd" aria-live="off">
        <span class="daw-lcd-pos" data-ref="pos">1.1.1</span>
        <span class="daw-lcd-time" data-ref="time">0:00.0</span>
      </div>
      <div class="daw-group">
        <button type="button" class="daw-btn daw-toggle" data-act="loop" aria-pressed="false" title="Loop the region on the ruler (drag across the ruler to set it)">🔁 Loop</button>
        <button type="button" class="daw-btn daw-toggle" data-act="metronome" aria-pressed="false" title="Metronome click">𝅘𝅥 Click</button>
        <button type="button" class="daw-btn daw-toggle" data-act="countin" aria-pressed="true" title="One bar of clicks before recording starts">Count-in</button>
      </div>
      <div class="daw-group">
        <label class="daw-field"><span>Tempo</span><input type="number" data-ref="bpm" min="40" max="240" step="1" aria-label="Tempo in beats per minute"></label>
        <label class="daw-field"><span>Meter</span>
          <select data-ref="sig" aria-label="Time signature"><option>4/4</option><option>3/4</option><option>2/4</option><option>6/8</option><option>5/4</option><option>7/8</option></select>
        </label>
        <label class="daw-field daw-master"><span>Master</span><input type="range" data-ref="master" min="0" max="1.2" step="0.01" aria-label="Master volume"><span class="daw-meter" aria-hidden="true"><i data-ref="meter"></i></span></label>
      </div>
    </div>
    <details class="daw-file-tools" open>
    <summary>Track &amp; project tools</summary>
    <div class="daw-bar daw-files" role="toolbar" aria-label="Tracks and files">
      <div class="daw-group">
        <div class="daw-menu-wrap">
          <button type="button" class="daw-btn" data-menu="add" aria-haspopup="true" aria-expanded="false">＋ Track</button>
          <div class="daw-menu" data-menu-panel="add" hidden>
            <p class="daw-menu-label">Instrument track (MIDI)</p>
            ${Object.keys(INSTRUMENTS).map((k) => `<button type="button" data-act="add-instrument" data-instrument="${k}">${INSTRUMENTS[k]}</button>`).join('')}
            <p class="daw-menu-label">Audio track</p>
            <button type="button" data-act="add-audio">🎙 Audio (mic or files)</button>
          </div>
        </div>
        <button type="button" class="daw-btn" data-act="new-clip">Add note clip</button>
        <button type="button" class="daw-btn" data-act="import" title="Import audio files, MIDI files or a saved project — or drag them onto the tracks">⤓ Import</button>
        <div class="daw-menu-wrap">
          <button type="button" class="daw-btn" data-menu="export" aria-haspopup="true" aria-expanded="false">⤒ Export</button>
          <div class="daw-menu" data-menu-panel="export" hidden>
            <button type="button" data-act="export-mix">Song mix (.wav)</button>
            <button type="button" data-act="export-loop">Loop region mix (.wav)</button>
            <button type="button" data-act="export-stems">Stems — one WAV per track (.zip)</button>
            <button type="button" data-act="export-midi">MIDI notes (.mid)</button>
          </div>
        </div>
        <div class="daw-menu-wrap">
          <button type="button" class="daw-btn" data-menu="project" aria-haspopup="true" aria-expanded="false">Project</button>
          <div class="daw-menu" data-menu-panel="project" hidden>
            <button type="button" data-act="new">New song</button>
            <button type="button" data-act="open">Open project (.mlab.zip)…</button>
            <button type="button" data-act="save">Save project (.mlab.zip)</button>
          </div>
        </div>
        <label class="daw-field daw-name"><span>Song</span><input type="text" data-ref="name" maxlength="60" aria-label="Song name"></label>
      </div>
      <div class="daw-group">
        <button type="button" class="daw-btn" data-act="undo" aria-label="Undo" title="Undo (Ctrl/⌘+Z)">↶</button>
        <button type="button" class="daw-btn" data-act="redo" aria-label="Redo" title="Redo (Ctrl/⌘+Shift+Z)">↷</button>
        <label class="daw-field"><span>Snap</span>
          <select data-ref="snap" aria-label="Snap clips to">${snapOptions.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
        </label>
        <button type="button" class="daw-btn" data-act="zoom-out" aria-label="Zoom out">−</button>
        <button type="button" class="daw-btn" data-act="zoom-in" aria-label="Zoom in">＋</button>
      </div>
    </div>
    </details>
    <div class="daw-scroll" data-ref="scroll" tabindex="0" aria-label="Tracks timeline. Space plays, Delete removes the selected clip.">
      <div class="daw-tracks" data-ref="tracks"></div>
      <div class="daw-drop" aria-hidden="true">Drop audio, MIDI or a project file</div>
    </div>
    <section class="daw-effects" data-ref="effects" aria-label="Channel effects"></section>
    <div class="daw-editor" data-ref="editor"></div>
    <p class="daw-status" data-ref="status" role="status" aria-live="polite"></p>
    <input type="file" aria-label="Import audio, MIDI or a saved project" data-ref="file" multiple accept="audio/*,.wav,.mp3,.ogg,.m4a,.flac,.aif,.aiff,.mid,.midi,.zip" hidden>
  `;

  const compactTools = window.matchMedia('(max-width: 720px)');
  const fileTools = root.querySelector('.daw-file-tools');
  function fitFileTools() { fileTools.open = !compactTools.matches; }
  fitFileTools();
  compactTools.addEventListener('change', fitFileTools);

  const $ = (name) => root.querySelector(`[data-ref="${name}"]`);
  const R = {
    pos: $('pos'), time: $('time'), bpm: $('bpm'), sig: $('sig'), master: $('master'), meter: $('meter'),
    name: $('name'), snap: $('snap'), scroll: $('scroll'), tracks: $('tracks'), editor: $('editor'),
    status: $('status'), file: $('file'),
  };

  function status(msg) { R.status.textContent = msg || ''; }

  // ── DOM: tracks + timeline ───────────────────────────────────────────────
  let rulerCanvas = null, playheadEl = null, loopEl = null;

  function timelineBeats() {
    const bar = barBeats();
    return Math.max(bar * 32, Math.ceil((songEnd() + bar * 8) / bar) * bar, Math.ceil((ui.playhead + bar * 4) / bar) * bar);
  }

  function render() {
    R.bpm.value = project.bpm;
    R.sig.value = project.sig.join('/');
    R.master.value = project.masterVolume;
    if (document.activeElement !== R.name) R.name.value = project.name;
    R.snap.value = String(ui.snap);
    renderTracks();
    renderEffects();
    renderEditor();
    updateTransportUi();
  }

  function renderTracks() {
    HEAD_W = R.scroll.clientWidth && R.scroll.clientWidth < 520 ? 176 : 210;
    const ppb = ui.pxPerBeat, beats = timelineBeats(), width = beats * ppb, bar = barBeats();
    R.tracks.style.setProperty('--daw-head', HEAD_W + 'px');
    R.tracks.style.setProperty('--daw-width', width + 'px');
    R.tracks.style.setProperty('--daw-beat', ppb + 'px');
    R.tracks.style.setProperty('--daw-bar', ppb * bar + 'px');
    R.tracks.style.setProperty('--daw-track-h', TRACK_H + 'px');
    const rows = project.tracks.map((t, i) => trackRowHtml(t, i)).join('');
    R.tracks.innerHTML = `
      <div class="daw-corner"><span>${project.tracks.length} track${project.tracks.length === 1 ? '' : 's'}</span></div>
      <div class="daw-ruler" data-ruler><canvas></canvas></div>
      ${rows}
      <div class="daw-th daw-th-add">
        <button type="button" class="daw-btn" data-act="quick-instrument">＋ Instrument</button>
        <button type="button" class="daw-btn" data-act="add-audio">＋ Audio</button>
      </div>
      <div class="daw-lane daw-lane-add" data-hint>${project.tracks.length ? 'Double-click an instrument lane to draw a clip · drag files here to import' : 'Add a track to begin, or drop audio/MIDI files here'}</div>
      <div class="daw-loop" hidden></div>
      <div class="daw-playhead"></div>
    `;
    rulerCanvas = R.tracks.querySelector('.daw-ruler canvas');
    playheadEl = R.tracks.querySelector('.daw-playhead');
    loopEl = R.tracks.querySelector('.daw-loop');
    R.tracks.querySelectorAll('canvas[data-clip]').forEach(drawClipCanvas);
    drawRuler();
    drawPlayhead();
  }

  let effectsTrack = null;
  function renderEffects() {
    const host = $('effects'), registry = window.AudioEffects.registry;
    const track = findTrack(effectsTrack) || findTrack(ui.selTrack) || project.tracks[0];
    if (!track) { host.innerHTML = '<h3>Channel effects</h3><p>Add a track to begin.</p>'; return; }
    effectsTrack = track.id;
    host.innerHTML = `<h3>Channel effects</h3>
      <p class="daw-note">Sound flows through inserts from top to bottom, then volume and pan. Try EQ before compression, swap the order, and compare with bypass. Inserts are included in WAV mixes and stems; MIDI stores notes only.</p>
      <div class="daw-group"><label class="daw-field"><span>Channel</span><select data-fx-channel aria-label="Effects channel">${project.tracks.map(t => `<option value="${t.id}" ${t === track ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
      ${Object.entries(registry).map(([type, d]) => `<button type="button" class="daw-btn" data-fx-add="${type}" ${(track.effects || []).length >= 8 ? 'disabled' : ''}>Add ${esc(d.name)}</button>`).join('')}</div>
      <ol class="daw-fx-list">${(track.effects || []).map((e, i, all) => {
        const d = registry[e.type]; if (!d) return '';
        const params = window.AudioEffects.parameters(e.type, e.params);
        return `<li data-fx-index="${i}"><div class="daw-group"><strong>${esc(d.name)}</strong>
          <button type="button" class="daw-btn" data-fx-action="bypass" aria-pressed="${!!e.bypass}">Bypass</button>
          <button type="button" class="daw-btn" data-fx-action="up" aria-label="Move ${esc(d.name)} earlier" ${i === 0 ? 'disabled' : ''}>Earlier</button>
          <button type="button" class="daw-btn" data-fx-action="down" aria-label="Move ${esc(d.name)} later" ${i === all.length - 1 ? 'disabled' : ''}>Later</button>
          <button type="button" class="daw-btn" data-fx-action="remove" aria-label="Remove ${esc(d.name)}">Remove</button>
          <a href="lessons/technical-elements/${d.lesson}">Learn ${esc(d.name)}</a></div>
          <div class="daw-fx-controls">${d.controls.map(c => `<label class="daw-field"><span>${c.label} (${c.unit || 'value'})</span><input type="number" data-fx-param="${c.key}" min="${c.min}" max="${c.max}" step="${c.step}" value="${params[c.key]}" aria-label="Insert ${i + 1} ${c.label}"></label>`).join('')}</div></li>`;
      }).join('')}</ol>${(track.effects || []).length ? '' : '<p class="daw-note">No inserts: this channel is unprocessed. Add an EQ or compressor above.</p>'}`;
  }
  $('effects').addEventListener('click', e => {
    const b = e.target.closest('button'), track = findTrack(effectsTrack); if (!b || b.disabled || !track) return;
    const focus = b.dataset.fxAdd ? '[data-fx-add="' + b.dataset.fxAdd + '"]' : '[data-fx-channel]';
    track.effects ||= [];
    if (b.dataset.fxAdd && track.effects.length < 8) track.effects.push({ type: b.dataset.fxAdd, params: window.AudioEffects.parameters(b.dataset.fxAdd), bypass: false });
    else if (b.dataset.fxAction) {
      const i = Number(b.closest('[data-fx-index]').dataset.fxIndex), action = b.dataset.fxAction;
      if (action === 'remove') track.effects.splice(i, 1);
      if (action === 'bypass') track.effects[i].bypass = !track.effects[i].bypass;
      const j = action === 'up' ? i - 1 : action === 'down' ? i + 1 : i;
      if (j >= 0 && j < track.effects.length) [track.effects[i], track.effects[j]] = [track.effects[j], track.effects[i]];
    }
    commit(); $('effects').querySelector(focus)?.focus();
  });
  $('effects').addEventListener('change', e => {
    const el = e.target;
    if (el.matches('[data-fx-channel]')) { effectsTrack = el.value; renderEffects(); $('effects').querySelector('[data-fx-channel]').focus(); return; }
    if (!el.dataset.fxParam) return;
    const track = findTrack(effectsTrack), i = Number(el.closest('[data-fx-index]').dataset.fxIndex), effect = track.effects[i];
    effect.params = window.AudioEffects.parameters(effect.type, { ...effect.params, [el.dataset.fxParam]: el.value });
    commit(); $('effects').querySelector(`[data-fx-index="${i}"] [data-fx-param="${el.dataset.fxParam}"]`)?.focus();
  });

  function trackRowHtml(t, i) {
    const sel = t.id === ui.selTrack ? ' is-selected' : '';
    const instrument = t.kind === 'instrument'
      ? `<select data-tr="instrument" aria-label="${esc(t.name)} instrument">${instrumentOptions(t.instrument)}</select>`
      : '<span class="daw-tag">Audio</span>';
    const clips = t.clips.map((c) => clipHtml(t, c)).join('');
    return `
      <div class="daw-th${sel}${t.armed ? ' is-armed' : ''}" data-track="${t.id}" style="--tc:${t.color}">
        <div class="daw-th-row">
          <input class="daw-th-name" data-tr="name" value="${esc(t.name)}" maxlength="40" aria-label="Track ${i + 1} name">
          <button type="button" class="daw-mini daw-del" data-tr="delete" aria-label="Delete ${esc(t.name)}" title="Delete track">✕</button>
        </div>
        <div class="daw-th-row">
          <button type="button" class="daw-mini" data-tr="mute" aria-label="Mute ${esc(t.name)}" aria-pressed="${t.mute}" title="Mute">M</button>
          <button type="button" class="daw-mini" data-tr="solo" aria-label="Solo ${esc(t.name)}" aria-pressed="${t.solo}" title="Solo">S</button>
          <button type="button" class="daw-mini daw-arm" data-tr="arm" aria-label="Arm ${esc(t.name)} for recording" aria-pressed="${t.armed}" title="${t.kind === 'audio' ? 'Arm for microphone recording' : 'Arm: play and record this instrument from the keyboard'}">●</button>
          ${instrument}
        </div>
        <div class="daw-th-row daw-th-mix">
          <label title="Volume"><span class="sr-only">${esc(t.name)} volume</span><input type="range" data-tr="volume" min="0" max="1.2" step="0.01" value="${t.volume}"></label>
          <label title="Pan (left–right)"><span class="sr-only">${esc(t.name)} pan</span><input type="range" class="daw-pan" data-tr="pan" min="-1" max="1" step="0.05" value="${t.pan}"></label>
          ${t.armed && t.kind === 'audio' ? '<span class="daw-meter daw-mic" aria-hidden="true"><i data-ref="mic"></i></span>' : ''}
        </div>
      </div>
      <div class="daw-lane${sel}${t.mute || !audible(t) ? ' is-silent' : ''}" data-lane="${t.id}" data-kind="${t.kind}" style="--tc:${t.color}">${clips}</div>
    `;
  }

  function clipHtml(t, c) {
    const left = c.start * ui.pxPerBeat, width = Math.max(6, clipBeats(c) * ui.pxPerBeat);
    const sel = c.id === ui.selClip ? ' is-selected' : '';
    return `<div class="daw-clip daw-clip-${c.type}${sel}" data-clip="${c.id}" style="left:${left}px;width:${width}px" title="${esc(c.name || t.name)}">
      <span class="daw-clip-name">${esc(c.name || t.name)}</span>
      <canvas data-clip="${c.id}" aria-hidden="true"></canvas>
      <span class="daw-clip-h daw-clip-l" data-handle="l"></span><span class="daw-clip-h daw-clip-r" data-handle="r"></span>
    </div>`;
  }

  function fitCanvas(canvas, w, h) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W; canvas.height = H;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
    }
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    return g;
  }

  function drawClipCanvas(canvas) {
    const found = findClip(canvas.dataset.clip);
    if (!found) return;
    const { clip } = found;
    const fullW = Math.max(6, clipBeats(clip) * ui.pxPerBeat);
    const w = Math.min(fullW, 4000), h = TRACK_H - 22;
    const g = fitCanvas(canvas, w, h);
    canvas.style.width = fullW + 'px';
    g.fillStyle = 'rgba(10, 14, 24, 0.82)';
    if (clip.type === 'midi') {
      const notes = clip.notes.filter((n) => n.start < clip.length);
      if (!notes.length) return;
      let lo = Math.min(...notes.map((n) => n.pitch)), hi = Math.max(...notes.map((n) => n.pitch));
      if (hi - lo < 12) { const mid = (hi + lo) / 2; lo = mid - 6; hi = mid + 6; }
      const scale = w / clip.length, rowH = Math.max(1.5, Math.min(5, (h - 6) / (hi - lo + 1)));
      notes.forEach((n) => {
        const y = h - 3 - ((n.pitch - lo + 1) / (hi - lo + 1)) * (h - 6);
        g.fillRect(n.start * scale, y, Math.max(1.5, Math.min(n.duration, clip.length - n.start) * scale - 1), rowH);
      });
    } else {
      const e = buffers.get(clip.bufferId);
      if (!e) return;
      const { data, step, rate } = e.peaks;
      const startIdx = clip.offset * rate / step, perPx = (clip.duration * rate / step) / w;
      const mid = h / 2;
      g.beginPath();
      for (let x = 0; x < w; x++) {
        const a = Math.floor(startIdx + x * perPx), b = Math.max(a + 1, Math.floor(startIdx + (x + 1) * perPx));
        let m = 0;
        for (let i = a; i < b && i < data.length; i++) if (data[i] > m) m = data[i];
        const amp = Math.min(1, m * (clip.gain || 1)) * (mid - 2);
        g.rect(x, mid - amp, 1, amp * 2 + 0.5);
      }
      g.fill();
    }
  }

  function drawRuler() {
    if (!rulerCanvas) return;
    const view = R.scroll.clientWidth - HEAD_W;
    if (view <= 0) return;
    const h = 28, g = fitCanvas(rulerCanvas, view, h);
    const sl = R.scroll.scrollLeft, ppb = ui.pxPerBeat, bar = barBeats();
    g.fillStyle = '#1b2233'; g.fillRect(0, 0, view, h);
    if (project.loop.end > project.loop.start) {
      g.fillStyle = project.loop.on ? 'rgba(250, 204, 21, 0.85)' : 'rgba(148, 163, 184, 0.35)';
      g.fillRect(project.loop.start * ppb - sl, 0, (project.loop.end - project.loop.start) * ppb, 7);
    }
    const first = Math.floor(sl / ppb), last = Math.ceil((sl + view) / ppb);
    const barEvery = ppb * bar < 40 ? (ppb * bar < 20 ? 4 : 2) : 1;
    g.font = '600 11px "IBM Plex Mono", ui-monospace, monospace';
    g.textBaseline = 'middle';
    for (let b = Math.max(0, first - (first % 1)); b <= last; b++) {
      const x = b * ppb - sl, isBar = Math.abs(b / bar - Math.round(b / bar)) < 1e-6;
      const barNo = Math.round(b / bar);
      if (isBar) {
        g.fillStyle = '#94a3b8'; g.fillRect(x, 8, 1, h - 8);
        if (barNo % barEvery === 0) { g.fillStyle = '#e2e8f0'; g.fillText(String(barNo + 1), x + 4, 18); }
      } else if (ppb >= 10) {
        g.fillStyle = '#475569'; g.fillRect(x, h - 7, 1, 7);
      }
    }
  }

  function drawPlayhead() {
    if (!playheadEl) return;
    playheadEl.style.transform = `translateX(${HEAD_W + ui.playhead * ui.pxPerBeat}px)`;
    const L = project.loop;
    loopEl.hidden = !(L.on && L.end > L.start);
    loopEl.style.left = HEAD_W + L.start * ui.pxPerBeat + 'px';
    loopEl.style.width = (L.end - L.start) * ui.pxPerBeat + 'px';
    drawRoll();
  }

  function updateLcd() {
    R.pos.textContent = formatPos(ui.playhead);
    R.time.textContent = formatTime(ui.playhead * spb());
  }

  function updateTransportUi() {
    const play = root.querySelector('[data-act="play"]');
    play.textContent = transport.playing ? '⏸' : '▶';
    play.setAttribute('aria-label', transport.playing ? 'Pause' : 'Play');
    play.classList.toggle('is-on', transport.playing);
    root.querySelector('[data-act="record"]').classList.toggle('is-on', transport.recording);
    const set = (act, on) => root.querySelector(`[data-act="${act}"]`).setAttribute('aria-pressed', String(on));
    set('loop', project.loop.on);
    set('metronome', project.metronome);
    set('countin', project.countIn);
    root.querySelector('[data-act="undo"]').disabled = !history.undo.length;
    root.querySelector('[data-act="redo"]').disabled = !history.redo.length;
    root.classList.toggle('is-recording', transport.recording);
    updateLcd();
  }

  // ── DOM: editor (piano roll / audio clip) ────────────────────────────────
  let roll = null;   // { scroll, canvas, spacer, rows, clip, track }

  function rollRows(track) {
    if (track.instrument === 'drums') return Object.keys(IO.DRUM_LABELS).map(Number).sort((a, b) => b - a);
    const rows = [];
    for (let p = 108; p >= 21; p--) rows.push(p);
    return rows;
  }

  function renderEditor() {
    const sel = selected();
    roll = null;
    if (!sel) {
      R.editor.innerHTML = `<div class="daw-editor-empty">
        <strong>Getting started</strong>
        <ol>
          <li>Press <b>●</b> on a track to arm it, then <b>⏺</b> to record from the keyboard, your QWERTY keys, a MIDI keyboard or a microphone.</li>
          <li>Press Add note clip or double-click an instrument lane to draw a clip, then click notes into the piano roll that opens here.</li>
          <li>Drag clips to move them, drag their edges to trim. Drag across the ruler to set a loop.</li>
          <li><b>Import</b> audio stems or a .mid file; <b>Export</b> a WAV mix, stems or MIDI when you’re done.</li>
        </ol></div>`;
      return;
    }
    const { track, clip } = sel;
    const common = `
      <label class="daw-field daw-name"><span>Clip</span><input type="text" data-ed="name" value="${esc(clip.name || '')}" maxlength="40" aria-label="Clip name"></label>
      <button type="button" class="daw-btn" data-act="split" title="Split at the playhead (Ctrl/⌘+E)">✂ Split</button>
      <button type="button" class="daw-btn" data-act="duplicate" title="Duplicate after this clip (Ctrl/⌘+D)">⧉ Duplicate</button>
      <button type="button" class="daw-btn" data-act="loop-clip" title="Loop playback over this clip">🔁 Loop clip</button>
      <button type="button" class="daw-btn" data-act="delete-clip" title="Delete clip (Delete)">🗑 Delete</button>`;
    if (clip.type === 'audio') {
      const e = buffers.get(clip.bufferId);
      R.editor.innerHTML = `
        <div class="daw-bar daw-ed-bar"><div class="daw-group">${common}</div></div>
        <div class="daw-bar daw-ed-bar"><div class="daw-group">
          <label class="daw-field"><span>Clip gain</span><input type="range" data-ed="gain" min="0" max="2" step="0.01" value="${clip.gain || 1}" aria-label="Clip gain"></label>
          <button type="button" class="daw-btn" data-act="normalize" title="Turn the clip up until its loudest peak just fits">Normalize</button>
          <button type="button" class="daw-btn" data-act="reverse">⇆ Reverse</button>
          <span class="daw-note">${esc(e ? e.name : '')} · ${clip.duration.toFixed(2)} s · ${e ? (e.buffer.numberOfChannels === 1 ? 'mono' : 'stereo') + ' · ' + e.buffer.sampleRate / 1000 + ' kHz' : ''}</span>
        </div></div>
        <canvas class="daw-wave" aria-label="Waveform of ${esc(clip.name || 'clip')}"></canvas>`;
      drawBigWave(R.editor.querySelector('.daw-wave'), clip);
      return;
    }
    const gridSel = gridOptions.map(([v, l]) => `<option value="${v}"${Math.abs(v - ui.rollGrid) < 1e-6 ? ' selected' : ''}>${l}</option>`).join('');
    R.editor.innerHTML = `
      <div class="daw-bar daw-ed-bar"><div class="daw-group">${common}</div></div>
      <div class="daw-bar daw-ed-bar"><div class="daw-group">
        <label class="daw-field"><span>Grid</span><select data-ed="grid" aria-label="Piano roll grid">${gridSel}</select></label>
        <button type="button" class="daw-btn" data-act="quantize" title="Snap the selected notes (or all notes) to the grid">Quantize</button>
        <button type="button" class="daw-btn" data-act="transpose" data-by="-12" title="Down an octave">−8va</button>
        <button type="button" class="daw-btn" data-act="transpose" data-by="-1" title="Down a semitone">−1</button>
        <button type="button" class="daw-btn" data-act="transpose" data-by="1" title="Up a semitone">+1</button>
        <button type="button" class="daw-btn" data-act="transpose" data-by="12" title="Up an octave">+8va</button>
        <label class="daw-field"><span>Velocity</span><input type="range" data-ed="velocity" min="0.05" max="1" step="0.01" value="${selectedVelocity(clip)}" aria-label="Velocity of selected notes"></label>
        <button type="button" class="daw-btn" data-act="roll-zoom-out" aria-label="Zoom piano roll out">−</button>
        <button type="button" class="daw-btn" data-act="roll-zoom-in" aria-label="Zoom piano roll in">＋</button>
      </div></div>
      <p class="daw-note">${track.instrument === 'drums' ? 'Each row is one drum. ' : ''}Click to add a note (drag to make it longer) · drag a note to move it, its right edge to resize · right-click or double-click to delete · Shift-click to select several · arrow keys nudge.</p>
      <div class="daw-roll" tabindex="0" aria-label="Piano roll for ${esc(clip.name || track.name)}: ${clip.notes.length} notes">
        <div class="daw-roll-spacer"><canvas></canvas></div>
      </div>`;
    const scroll = R.editor.querySelector('.daw-roll');
    roll = { scroll, spacer: scroll.firstElementChild, canvas: scroll.querySelector('canvas'), rows: rollRows(track), clip, track };
    sizeRoll();
    // Open on the notes (or around middle C) instead of the top of the keyboard.
    const pitches = clip.notes.map((n) => n.pitch);
    const centre = pitches.length ? (Math.max(...pitches) + Math.min(...pitches)) / 2 : (track.instrument === 'drums' ? 42 : 66);
    const idx = roll.rows.findIndex((p) => p <= centre);
    scroll.scrollTop = Math.max(0, (idx < 0 ? roll.rows.length / 2 : idx) * ROW_H - scroll.clientHeight / 2);
    scroll.addEventListener('scroll', drawRoll);
    attachRollEvents(scroll);
    drawRoll();
  }

  function selectedVelocity(clip) {
    const notes = clip.notes.filter((_, i) => ui.selNotes.has(i));
    const list = notes.length ? notes : clip.notes;
    return list.length ? (list.reduce((s, n) => s + n.velocity, 0) / list.length).toFixed(2) : 0.8;
  }

  function rollBeats(clip) { return clip.length + barBeats() * 2; }

  function sizeRoll() {
    if (!roll) return;
    roll.spacer.style.width = KEYS_W + rollBeats(roll.clip) * ui.rollPx + 'px';
    roll.spacer.style.height = roll.rows.length * ROW_H + 'px';
  }

  function drawRoll() {
    if (!roll || !roll.scroll.isConnected) return;
    const { scroll, canvas, rows, clip, track } = roll;
    const w = scroll.clientWidth, h = scroll.clientHeight;
    if (!w || !h) return;
    const g = fitCanvas(canvas, w, h);
    const sx = scroll.scrollLeft, sy = scroll.scrollTop, px = ui.rollPx, bar = barBeats();
    const drums = track.instrument === 'drums';
    g.fillStyle = '#121826'; g.fillRect(0, 0, w, h);
    const r0 = Math.floor(sy / ROW_H), r1 = Math.min(rows.length - 1, Math.ceil((sy + h) / ROW_H));
    for (let r = r0; r <= r1; r++) {
      const p = rows[r], y = r * ROW_H - sy;
      const black = [1, 3, 6, 8, 10].includes(p % 12);
      g.fillStyle = drums ? (r % 2 ? '#161d2d' : '#1a2234') : (black ? '#141a28' : '#1b2335');
      g.fillRect(KEYS_W, y, w, ROW_H);
      if (!drums && p % 12 === 0) { g.fillStyle = '#334155'; g.fillRect(KEYS_W, y + ROW_H - 1, w, 1); }
    }
    // Beyond the clip end: shaded, notes there don't play.
    const endX = KEYS_W + clip.length * px - sx;
    if (endX < w) { g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(Math.max(KEYS_W, endX), 0, w, h); }
    const b0 = Math.floor(sx / px / ui.rollGrid) * ui.rollGrid;
    for (let b = b0; b * px - sx < w; b += ui.rollGrid) {
      const x = KEYS_W + b * px - sx;
      if (x < KEYS_W) continue;
      const isBar = Math.abs(b / bar - Math.round(b / bar)) < 1e-6, isBeat = Math.abs(b - Math.round(b)) < 1e-6;
      g.fillStyle = isBar ? '#64748b' : isBeat ? '#334155' : '#222b3d';
      g.fillRect(Math.round(x), 0, 1, h);
    }
    // Notes
    const color = track.color;
    clip.notes.forEach((n, i) => {
      const r = rows.indexOf(n.pitch);
      if (r < 0) return;
      const x = KEYS_W + n.start * px - sx, y = r * ROW_H - sy, nw = Math.max(4, n.duration * px - 1);
      if (y + ROW_H < 0 || y > h || x + nw < KEYS_W || x > w) return;
      g.globalAlpha = 0.45 + 0.55 * n.velocity;
      g.fillStyle = ui.selNotes.has(i) ? '#ffffff' : color;
      g.fillRect(x, y + 1, nw, ROW_H - 2);
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(x + nw - 3, y + 3, 2, ROW_H - 6);
    });
    // Playhead
    if (ui.playhead >= clip.start && ui.playhead <= clip.start + rollBeats(clip)) {
      const x = KEYS_W + (ui.playhead - clip.start) * px - sx;
      if (x >= KEYS_W) { g.fillStyle = '#f43f5e'; g.fillRect(x, 0, 2, h); }
    }
    // Keys (drawn last so they cover the scrolled grid)
    g.font = '10px "IBM Plex Mono", ui-monospace, monospace';
    g.textBaseline = 'middle';
    for (let r = r0; r <= r1; r++) {
      const p = rows[r], y = r * ROW_H - sy;
      const black = [1, 3, 6, 8, 10].includes(p % 12);
      g.fillStyle = drums ? '#1e293b' : black ? '#0f172a' : '#e2e8f0';
      g.fillRect(0, y, KEYS_W, ROW_H);
      g.fillStyle = '#475569'; g.fillRect(0, y + ROW_H - 1, KEYS_W, 1);
      const label = drums ? IO.DRUM_LABELS[p] : (p % 12 === 0 ? noteLabel(p) : '');
      if (label) { g.fillStyle = drums ? '#e2e8f0' : '#0f172a'; g.fillText(label, 4, y + ROW_H / 2); }
    }
  }

  function drawBigWave(canvas, clip) {
    const e = buffers.get(clip.bufferId);
    const w = Math.max(200, R.editor.clientWidth - 4), h = 120;
    const g = fitCanvas(canvas, w, h);
    g.fillStyle = '#121826'; g.fillRect(0, 0, w, h);
    if (!e) return;
    const d = e.buffer.getChannelData(0), sr = e.buffer.sampleRate;
    const a = Math.floor(clip.offset * sr), n = Math.floor(clip.duration * sr), per = n / w;
    g.fillStyle = findClip(clip.id).track.color;
    for (let x = 0; x < w; x++) {
      let lo = 0, hi = 0;
      const s = a + Math.floor(x * per), t = Math.min(d.length, a + Math.floor((x + 1) * per));
      for (let i = s; i < t; i += Math.max(1, Math.floor(per / 64))) { const v = d[i] * (clip.gain || 1); if (v < lo) lo = v; if (v > hi) hi = v; }
      g.fillRect(x, h / 2 - Math.min(1, hi) * h / 2, 1, Math.max(1, (Math.min(1, hi) - Math.max(-1, lo)) * h / 2));
    }
  }

  // ── Piano roll interaction ───────────────────────────────────────────────
  function previewNote(track, pitch, vel) {
    const c = ctx(), out = audio.mix.strip(track).input;
    if (track.instrument === 'drums') { drumHit(c, out, pitch, vel, c.currentTime); return; }
    startVoice(c, out, track.instrument, pitch, vel, c.currentTime).release(c.currentTime + 0.25);
  }

  function rollHit(e) {
    const rect = roll.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const beat = (x - KEYS_W + roll.scroll.scrollLeft) / ui.rollPx;
    const row = Math.floor((y + roll.scroll.scrollTop) / ROW_H);
    const pitch = roll.rows[clamp(row, 0, roll.rows.length - 1)];
    let hit = -1, edge = false;
    roll.clip.notes.forEach((n, i) => {
      if (n.pitch === pitch && beat >= n.start && beat <= n.start + n.duration) {
        hit = i;
        edge = (n.start + n.duration - beat) * ui.rollPx < 7;
      }
    });
    return { x, beat, pitch, hit, edge, onKeys: x < KEYS_W };
  }

  function attachRollEvents(scroll) {
    let drag = null;
    scroll.addEventListener('contextmenu', (e) => e.preventDefault());
    scroll.addEventListener('pointerdown', (e) => {
      if (!roll || e.target !== roll.canvas) return;
      const h = rollHit(e);
      const { clip, track } = roll;
      scroll.focus({ preventScroll: true });
      if (h.onKeys) { previewNote(track, h.pitch, 0.8); return; }
      if (e.button === 2 || e.altKey) {
        if (h.hit >= 0) { clip.notes.splice(h.hit, 1); ui.selNotes.clear(); commit(); }
        return;
      }
      if (e.button !== 0) return;
      scroll.setPointerCapture(e.pointerId);
      if (h.hit >= 0) {
        if (e.shiftKey) { ui.selNotes.has(h.hit) ? ui.selNotes.delete(h.hit) : ui.selNotes.add(h.hit); drawRoll(); return; }
        if (!ui.selNotes.has(h.hit)) { ui.selNotes.clear(); ui.selNotes.add(h.hit); }
        const n = clip.notes[h.hit];
        drag = { mode: h.edge ? 'resize' : 'move', beat: h.beat, pitch: h.pitch, orig: clip.notes.map((x) => ({ ...x })), moved: false, note: h.hit };
        if (!h.edge) previewNote(track, n.pitch, n.velocity);
      } else {
        const start = floorTo(Math.max(0, h.beat), ui.rollGrid);
        clip.notes.push({ pitch: h.pitch, start, duration: ui.noteLen, velocity: 0.8 });
        ui.selNotes.clear();
        ui.selNotes.add(clip.notes.length - 1);
        drag = { mode: 'draw', beat: start, pitch: h.pitch, note: clip.notes.length - 1, moved: true, x0: e.clientX };
        previewNote(track, h.pitch, 0.8);
      }
      drawRoll();
    });
    scroll.addEventListener('pointermove', (e) => {
      if (!drag || !roll) return;
      const h = rollHit(e), clip = roll.clip, grid = ui.rollGrid;
      if (drag.mode === 'draw') {
        if (Math.abs(e.clientX - drag.x0) < 5) return;
        const n = clip.notes[drag.note];
        n.duration = Math.max(grid, snapTo(h.beat - n.start, grid) || grid);
        ui.noteLen = n.duration;
      } else if (drag.mode === 'resize') {
        const dBeat = snapTo(h.beat - drag.beat, grid);
        ui.selNotes.forEach((i) => { clip.notes[i].duration = Math.max(grid, drag.orig[i].duration + dBeat); });
        ui.noteLen = clip.notes[drag.note].duration;
        drag.moved = true;
      } else {
        const dBeat = snapTo(h.beat - drag.beat, grid);
        const dRow = roll.rows.indexOf(h.pitch) - roll.rows.indexOf(drag.pitch);
        if (dBeat || dRow) drag.moved = true;
        let pitchChanged = false;
        ui.selNotes.forEach((i) => {
          const o = drag.orig[i], r = clamp(roll.rows.indexOf(o.pitch) + dRow, 0, roll.rows.length - 1);
          const p = roll.rows[r];
          if (clip.notes[i].pitch !== p && i === drag.note) pitchChanged = true;
          clip.notes[i].pitch = p;
          clip.notes[i].start = Math.max(0, o.start + dBeat);
        });
        if (pitchChanged) previewNote(roll.track, clip.notes[drag.note].pitch, clip.notes[drag.note].velocity);
      }
      drawRoll();
    });
    const end = () => {
      if (!drag || !roll) { drag = null; return; }
      const clip = roll.clip, moved = drag.moved;
      drag = null;
      if (!moved) return;
      // Drawing past the end of a clip makes the clip longer.
      const last = Math.max(...clip.notes.map((n) => n.start + n.duration));
      if (last > clip.length) clip.length = Math.ceil(last / barBeats() - 1e-9) * barBeats();
      sortNotes(clip);
      commitKeepRoll();
    };
    scroll.addEventListener('pointerup', end);
    scroll.addEventListener('pointercancel', end);
    scroll.addEventListener('dblclick', (e) => {
      if (!roll) return;
      const h = rollHit(e);
      if (h.hit >= 0 && !h.onKeys) { roll.clip.notes.splice(h.hit, 1); ui.selNotes.clear(); commitKeepRoll(); }
    });
  }

  // Keeps the selection pointing at the same notes after sorting.
  function sortNotes(clip) {
    const tagged = clip.notes.map((n, i) => ({ n, sel: ui.selNotes.has(i) }));
    tagged.sort((a, b) => a.n.start - b.n.start || a.n.pitch - b.n.pitch);
    clip.notes = tagged.map((t) => t.n);
    ui.selNotes = new Set(tagged.map((t, i) => (t.sel ? i : -1)).filter((i) => i >= 0));
  }

  // Commit without rebuilding the roll, so its scroll position and focus stay put.
  function commitKeepRoll() {
    const keep = roll;
    const top = keep ? keep.scroll.scrollTop : 0, left = keep ? keep.scroll.scrollLeft : 0;
    commit();
    if (roll && keep) {
      roll.scroll.scrollTop = top; roll.scroll.scrollLeft = left;
      roll.scroll.focus({ preventScroll: true });
      drawRoll();
    }
  }

  function editNotes(fn) {
    const sel = selected();
    if (!sel || sel.clip.type !== 'midi') return;
    const idx = ui.selNotes.size ? Array.from(ui.selNotes) : sel.clip.notes.map((_, i) => i);
    idx.forEach((i) => fn(sel.clip.notes[i], sel.clip));
    sortNotes(sel.clip);
    commitKeepRoll();
  }

  // ── Timeline interaction ─────────────────────────────────────────────────
  function beatFromClientX(clientX) {
    const rect = R.tracks.getBoundingClientRect();
    return (clientX - rect.left - HEAD_W) / ui.pxPerBeat;
  }

  let clipDrag = null;
  R.tracks.addEventListener('pointerdown', (e) => {
    const ruler = e.target.closest('[data-ruler]');
    if (ruler) { startRulerDrag(e); return; }
    const clipEl = e.target.closest('.daw-clip');
    const lane = e.target.closest('.daw-lane[data-lane]');
    if (clipEl) {
      if (e.button !== 0) return;
      const found = findClip(clipEl.dataset.clip);
      if (!found) return;
      const changed = ui.selClip !== found.clip.id;
      select(found.track.id, found.clip.id);
      markTrack(found.track.id);
      clipEl.setPointerCapture(e.pointerId);
      clipDrag = {
        el: clipEl, found, mode: e.target.dataset.handle || 'move', x: e.clientX, y: e.clientY,
        orig: JSON.parse(JSON.stringify(found.clip)), moved: false, changed,
      };
      e.preventDefault();
      return;
    }
    if (lane && e.button === 0) {
      ui.selClip = null;
      ui.selNotes.clear();
      setPlayhead(snapTo(Math.max(0, beatFromClientX(e.clientX)), snapGrid()));
      markTrack(lane.dataset.lane);
      renderEditor();
    }
  });

  R.tracks.addEventListener('pointermove', (e) => {
    if (!clipDrag) return;
    const d = clipDrag, clip = d.found.clip, o = d.orig;
    const dx = (e.clientX - d.x) / ui.pxPerBeat;
    if (!d.moved && Math.abs(e.clientX - d.x) < 3 && Math.abs(e.clientY - d.y) < 3) return;
    d.moved = true;
    const grid = snapGrid();
    if (d.mode === 'move') {
      clip.start = Math.max(0, snapTo(o.start + dx, grid));
      // Dragging up/down moves the clip to another track of the same kind.
      const under = document.elementsFromPoint(e.clientX, e.clientY).find((el) => el.matches && el.matches('.daw-lane[data-lane]'));
      if (under && under.dataset.kind === d.found.track.kind && under.dataset.lane !== d.found.track.id) {
        const target = findTrack(under.dataset.lane);
        d.found.track.clips = d.found.track.clips.filter((c) => c !== clip);
        target.clips.push(clip);
        d.found = { track: target, clip };
        ui.selTrack = target.id;
        under.appendChild(d.el);
      }
    } else if (d.mode === 'r') {
      if (clip.type === 'audio') {
        const e2 = buffers.get(clip.bufferId), maxDur = e2 ? e2.buffer.duration - clip.offset : o.duration;
        const endBeat = snapTo(o.start + o.duration / spb() + dx, grid);
        clip.duration = clamp((endBeat - o.start) * spb(), 0.05, maxDur);
      } else {
        clip.length = Math.max(grid || 0.25, snapTo(o.length + dx, grid) || 0.25);
      }
    } else if (d.mode === 'l') {
      const end = o.start + (clip.type === 'audio' ? o.duration / spb() : o.length);
      let start = clamp(snapTo(o.start + dx, grid), 0, end - 0.125);
      if (clip.type === 'audio') start = Math.max(start, o.start - o.offset / spb());
      const delta = start - o.start;
      clip.start = start;
      if (clip.type === 'audio') {
        clip.offset = o.offset + delta * spb();
        clip.duration = o.duration - delta * spb();
      } else {
        clip.length = o.length - delta;
        clip.notes = o.notes.map((n) => ({ ...n, start: n.start - delta }));
      }
    }
    d.el.style.left = clip.start * ui.pxPerBeat + 'px';
    d.el.style.width = Math.max(6, clipBeats(clip) * ui.pxPerBeat) + 'px';
  });

  function endClipDrag() {
    if (!clipDrag) return;
    const d = clipDrag;
    clipDrag = null;
    if (d.mode === 'l' && d.found.clip.type === 'midi') {
      // Notes trimmed off the front are dropped, not hidden.
      d.found.clip.notes = d.found.clip.notes.filter((n) => n.start >= 0);
    }
    if (d.moved) { commit(); if (d.found.clip.type === 'audio') restartIfPlaying(); }
    else if (d.changed) { renderEditor(); }
  }
  R.tracks.addEventListener('pointerup', endClipDrag);
  R.tracks.addEventListener('pointercancel', endClipDrag);

  R.tracks.addEventListener('dblclick', (e) => {
    const lane = e.target.closest('.daw-lane[data-lane]');
    if (!lane || e.target.closest('.daw-clip')) {
      if (e.target.closest('.daw-clip') && roll) roll.scroll.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    const track = findTrack(lane.dataset.lane);
    if (!track) return;
    if (track.kind === 'audio') { status('Audio tracks hold recordings: arm the track and press ⏺, or import an audio file.'); return; }
    const start = floorTo(Math.max(0, beatFromClientX(e.clientX)), barBeats());
    const clip = newMidiClip(track, start, track.instrument === 'drums' ? barBeats() : barBeats() * 2);
    select(track.id, clip.id);
    commit();
    if (roll) roll.scroll.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  function startRulerDrag(e) {
    const x0 = e.clientX, b0 = Math.max(0, beatFromClientX(e.clientX));
    let dragging = false;
    const grid = snapGrid() || 0.25;
    const move = (ev) => {
      if (!dragging && Math.abs(ev.clientX - x0) < 5) return;
      dragging = true;
      const b1 = Math.max(0, beatFromClientX(ev.clientX));
      project.loop = { on: true, start: snapTo(Math.min(b0, b1), grid), end: snapTo(Math.max(b0, b1), grid) };
      drawRuler(); drawPlayhead(); updateTransportUi();
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (dragging) {
        if (project.loop.end - project.loop.start < grid) project.loop.on = false;
        commit();
        restartIfPlaying();
      } else {
        setPlayhead(snapTo(b0, snapGrid()));
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  // Selects a track by toggling classes, so a header input being clicked survives.
  function markTrack(id) {
    ui.selTrack = id;
    renderEffects();
    R.tracks.querySelectorAll('.is-selected').forEach((el) => el.classList.remove('is-selected'));
    R.tracks.querySelectorAll(`[data-track="${id}"], [data-lane="${id}"]`).forEach((el) => el.classList.add('is-selected'));
    R.tracks.querySelectorAll(`[data-clip="${ui.selClip}"]`).forEach((el) => el.classList.add('is-selected'));
  }

  // Track header controls
  R.tracks.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tr]');
    const head = e.target.closest('.daw-th[data-track]');
    if (!head) return;
    const track = findTrack(head.dataset.track);
    if (!track) return;
    if (ui.selTrack !== track.id) markTrack(track.id);
    if (!btn || btn.tagName !== 'BUTTON') return;
    const what = btn.dataset.tr;
    if (what === 'delete') { deleteTrack(track.id); return; }
    if (what === 'mute' || what === 'solo') { track[what] = !track[what]; commit(); return; }
    if (what === 'arm') { setArmed(track, !track.armed); }
  });
  R.tracks.addEventListener('input', (e) => {
    const el = e.target, head = el.closest('.daw-th[data-track]');
    if (!head) return;
    const track = findTrack(head.dataset.track);
    if (!track) return;
    if (el.dataset.tr === 'volume' || el.dataset.tr === 'pan') { track[el.dataset.tr] = Number(el.value); applyMix(); }
  });
  R.tracks.addEventListener('change', (e) => {
    const el = e.target, head = el.closest('.daw-th[data-track]');
    if (!head) return;
    const track = findTrack(head.dataset.track);
    if (!track) return;
    if (el.dataset.tr === 'name') track.name = el.value.trim().slice(0, 40) || track.name;
    if (el.dataset.tr === 'instrument') track.instrument = el.value;
    commit();
  });

  // ── Toolbar actions ──────────────────────────────────────────────────────
  function closeMenus() {
    root.querySelectorAll('[data-menu-panel]').forEach((m) => { m.hidden = true; });
    root.querySelectorAll('[data-menu]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }

  root.addEventListener('click', (e) => {
    const menuBtn = e.target.closest('[data-menu]');
    if (menuBtn) {
      const panel = root.querySelector(`[data-menu-panel="${menuBtn.dataset.menu}"]`);
      const open = panel.hidden;
      closeMenus();
      panel.hidden = !open;
      menuBtn.setAttribute('aria-expanded', String(open));
      if (open) panel.querySelector('button').focus();
      return;
    }
    const btn = e.target.closest('[data-act]');
    if (!e.target.closest('.daw-menu')) closeMenus();
    if (!btn || btn.disabled) return;
    closeMenus();
    const act = btn.dataset.act;
    switch (act) {
      case 'home': setPlayhead(0); break;
      case 'play': togglePlay(); break;
      case 'stop': stop(); break;
      case 'record': record(); break;
      case 'loop':
        if (project.loop.end <= project.loop.start) project.loop = { on: true, start: floorTo(ui.playhead, barBeats()), end: floorTo(ui.playhead, barBeats()) + barBeats() * 4 };
        else project.loop.on = !project.loop.on;
        commit(); restartIfPlaying(); break;
      case 'metronome': project.metronome = !project.metronome; commit(); break;
      case 'countin': project.countIn = !project.countIn; commit(); break;
      case 'add-instrument': addTrack('instrument', btn.dataset.instrument); commit(); break;
      case 'quick-instrument': addTrack('instrument', 'piano'); commit(); break;
      case 'add-audio': addTrack('audio'); commit(); break;
      case 'new-clip': {
        const track = findTrack(ui.selTrack) || project.tracks.find(t => t.kind === 'instrument');
        if (!track || track.kind !== 'instrument') { status('Select an instrument track to add a note clip.'); break; }
        const clip = newMidiClip(track, floorTo(ui.playhead, barBeats()), barBeats());
        select(track.id, clip.id); commit();
        status('Note clip added. Tap the piano-roll grid to add notes.');
        break;
      }
      case 'import': R.file.value = ''; R.file.click(); break;
      case 'open': R.file.value = ''; R.file.click(); break;
      case 'export-mix': exportMix(false); break;
      case 'export-loop':
        if (!(project.loop.end > project.loop.start)) status('Set a loop first: drag across the ruler.');
        else exportMix(true);
        break;
      case 'export-stems': exportStems(); break;
      case 'export-midi': exportMidi(); break;
      case 'save': saveProject(); break;
      case 'new': newProject(); break;
      case 'undo': undo(); break;
      case 'redo': redo(); break;
      case 'zoom-in': zoom(1.4); break;
      case 'zoom-out': zoom(1 / 1.4); break;
      case 'split': splitClip(); break;
      case 'duplicate': duplicateClip(); break;
      case 'delete-clip': deleteClip(); break;
      case 'loop-clip': loopClip(); break;
      case 'quantize': editNotes((n) => { n.start = snapTo(n.start, ui.rollGrid); n.duration = Math.max(ui.rollGrid, snapTo(n.duration, ui.rollGrid)); }); break;
      case 'transpose': {
        const by = Number(btn.dataset.by);
        const drums = roll && roll.track.instrument === 'drums';
        editNotes((n) => {
          if (drums) {
            const r = clamp(roll.rows.indexOf(n.pitch) - Math.sign(by), 0, roll.rows.length - 1);
            n.pitch = roll.rows[r];
          } else n.pitch = clamp(n.pitch + by, 21, 108);
        });
        break;
      }
      case 'roll-zoom-in': ui.rollPx = Math.min(320, ui.rollPx * 1.4); sizeRoll(); drawRoll(); break;
      case 'roll-zoom-out': ui.rollPx = Math.max(16, ui.rollPx / 1.4); sizeRoll(); drawRoll(); break;
      case 'normalize': {
        const sel = selected(), e2 = sel && buffers.get(sel.clip.bufferId);
        if (!e2) break;
        const { data, step, rate } = e2.peaks;
        let peak = 0;
        const a = Math.floor(sel.clip.offset * rate / step), b = Math.ceil((sel.clip.offset + sel.clip.duration) * rate / step);
        for (let i = a; i < b && i < data.length; i++) peak = Math.max(peak, data[i]);
        if (peak > 0) { sel.clip.gain = Math.min(8, 0.95 / peak); commit(); }
        break;
      }
      case 'reverse': {
        const sel = selected(), e2 = sel && buffers.get(sel.clip.bufferId);
        if (!e2) break;
        const src = e2.buffer;
        const rev = new AudioBuffer({ length: src.length, numberOfChannels: src.numberOfChannels, sampleRate: src.sampleRate });
        for (let ch = 0; ch < src.numberOfChannels; ch++) rev.copyToChannel(src.getChannelData(ch).slice().reverse(), ch);
        sel.clip.bufferId = addBuffer(rev, e2.name + ' (reversed)');
        sel.clip.offset = src.duration - sel.clip.offset - sel.clip.duration;
        commit();
        break;
      }
      default: break;
    }
  });

  function zoom(f) {
    const centreBeat = (R.scroll.scrollLeft + (R.scroll.clientWidth - HEAD_W) / 2) / ui.pxPerBeat;
    ui.pxPerBeat = clamp(ui.pxPerBeat * f, 4, 200);
    renderTracks();
    R.scroll.scrollLeft = centreBeat * ui.pxPerBeat - (R.scroll.clientWidth - HEAD_W) / 2;
    drawRuler();
  }

  R.bpm.addEventListener('change', () => {
    const v = clamp(Math.round(Number(R.bpm.value) || project.bpm), 40, 240);
    if (v === project.bpm) { R.bpm.value = v; return; }
    const pos = transport.playing ? beatAt(audio.ctx.currentTime) : null;
    project.bpm = v;
    commit();
    if (pos !== null && !transport.recording) play(Math.max(0, pos));
  });
  R.sig.addEventListener('change', () => {
    project.sig = R.sig.value.split('/').map(Number);
    commit();
  });
  R.master.addEventListener('input', () => { project.masterVolume = Number(R.master.value); applyMix(); });
  R.master.addEventListener('change', () => commit());
  R.name.addEventListener('change', () => { project.name = R.name.value.trim().slice(0, 60) || 'My Song'; commit(); });
  R.snap.addEventListener('change', () => { ui.snap = R.snap.value === 'bar' ? 'bar' : Number(R.snap.value); });
  R.file.addEventListener('change', () => importFiles(R.file.files));

  R.editor.addEventListener('change', (e) => {
    const sel = selected();
    if (!sel) return;
    const el = e.target;
    if (el.dataset.ed === 'name') { sel.clip.name = el.value.trim().slice(0, 40); commit(); }
    if (el.dataset.ed === 'grid') { ui.rollGrid = Number(el.value); ui.noteLen = Math.max(ui.rollGrid, snapTo(ui.noteLen, ui.rollGrid)); drawRoll(); }
    if (el.dataset.ed === 'gain') commit();
    if (el.dataset.ed === 'velocity') commitKeepRoll();
  });
  R.editor.addEventListener('input', (e) => {
    const sel = selected();
    if (!sel) return;
    const el = e.target;
    if (el.dataset.ed === 'gain') {
      sel.clip.gain = Number(el.value);
      const c = R.tracks.querySelector(`canvas[data-clip="${sel.clip.id}"]`);
      if (c) drawClipCanvas(c);
      drawBigWave(R.editor.querySelector('.daw-wave'), sel.clip);
    }
    if (el.dataset.ed === 'velocity') {
      const v = Number(el.value);
      const idx = ui.selNotes.size ? Array.from(ui.selNotes) : sel.clip.notes.map((_, i) => i);
      idx.forEach((i) => { sel.clip.notes[i].velocity = v; });
      drawRoll();
    }
  });

  R.scroll.addEventListener('scroll', drawRuler, { passive: true });
  window.addEventListener('resize', () => {
    const head = R.scroll.clientWidth < 520 ? 176 : 210;
    if (head !== HEAD_W) renderTracks(); else drawRuler();
    drawRoll();
  });

  // Drag and drop files
  let dragDepth = 0;
  root.addEventListener('dragenter', (e) => {
    if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes('Files')) return;
    e.preventDefault();
    dragDepth++;
    root.classList.add('is-dropping');
  });
  root.addEventListener('dragover', (e) => {
    if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  root.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; root.classList.remove('is-dropping'); } });
  root.addEventListener('drop', (e) => {
    if (!e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault();
    dragDepth = 0;
    root.classList.remove('is-dropping');
    const overTimeline = e.target.closest && e.target.closest('.daw-lane');
    const at = overTimeline ? snapTo(Math.max(0, beatFromClientX(e.clientX)), snapGrid() || 1) : ui.playhead;
    importFiles(e.dataTransfer.files, at);
  });

  // Keyboard shortcuts — only while focus is inside the studio, and never over
  // letter keys, which stay free for the QWERTY piano.
  root.addEventListener('keydown', (e) => {
    const t = e.target;
    const typing = t.matches('input[type="text"], input[type="number"], textarea, select');
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === 'Escape') { closeMenus(); return; }
    if (typing) return;
    if (e.code === 'Space' && !t.matches('button, input')) {
      e.preventDefault(); e.stopPropagation(); togglePlay(); return;
    }
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.stopPropagation(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); e.stopPropagation(); redo(); return; }
    if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); e.stopPropagation(); duplicateClip(); return; }
    if (mod && e.key.toLowerCase() === 'e') { e.preventDefault(); e.stopPropagation(); splitClip(); return; }
    if (e.key === 'Home') { e.preventDefault(); setPlayhead(0); return; }
    const inRoll = roll && t === roll.scroll;
    if (inRoll && mod && e.key.toLowerCase() === 'a') {
      e.preventDefault(); e.stopPropagation();
      ui.selNotes = new Set(roll.clip.notes.map((_, i) => i));
      drawRoll();
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (t.matches('input')) return;
      e.preventDefault();
      if (inRoll && ui.selNotes.size) {
        roll.clip.notes = roll.clip.notes.filter((_, i) => !ui.selNotes.has(i));
        ui.selNotes.clear();
        commitKeepRoll();
      } else if (ui.selClip) deleteClip();
      return;
    }
    if (inRoll && ui.selNotes.size && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault(); e.stopPropagation();
      const drums = roll.track.instrument === 'drums';
      const oct = e.shiftKey ? 12 : 1;
      editNotes((n) => {
        if (e.key === 'ArrowLeft') n.start = Math.max(0, n.start - ui.rollGrid);
        else if (e.key === 'ArrowRight') n.start += ui.rollGrid;
        else if (drums) {
          const r = clamp(roll.rows.indexOf(n.pitch) + (e.key === 'ArrowUp' ? -1 : 1), 0, roll.rows.length - 1);
          n.pitch = roll.rows[r];
        } else n.pitch = clamp(n.pitch + (e.key === 'ArrowUp' ? oct : -oct), 21, 108);
      });
    }
  });

  // ── Animation: playhead, meters ──────────────────────────────────────────
  function frame() {
    if (transport.playing && audio.ctx) {
      const beat = beatAt(audio.ctx.currentTime - (audio.ctx.outputLatency || 0));
      ui.playhead = beat;
      updateLcd();
      if (playheadEl) {
        drawPlayhead();
        if (ui.follow && beat >= 0) {
          const x = beat * ui.pxPerBeat, view = R.scroll.clientWidth - HEAD_W;
          if (x > R.scroll.scrollLeft + view - 40 || x < R.scroll.scrollLeft) R.scroll.scrollLeft = Math.max(0, x - 40);
        }
      }
      if (beat > timelineBeats() - barBeats() * 2) renderTracks();
    }
    if (audio.meter) {
      audio.meter.getFloatTimeDomainData(audio.meterData);
      let peak = 0;
      for (let i = 0; i < audio.meterData.length; i++) peak = Math.max(peak, Math.abs(audio.meterData[i]));
      R.meter.style.transform = `scaleX(${Math.min(1, peak)})`;
      R.meter.classList.toggle('is-hot', peak > 0.98);
    }
    if (mic.analyser) {
      const el = root.querySelector('[data-ref="mic"]');
      if (el) {
        const d = new Float32Array(mic.analyser.fftSize);
        mic.analyser.getFloatTimeDomainData(d);
        let peak = 0;
        for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
        el.style.transform = `scaleX(${Math.min(1, peak * 1.5)})`;
      }
    }
    requestAnimationFrame(frame);
  }

  // ── Public API (used by music-lab.js) ────────────────────────────────────
  // Step sequencer → Track Studio: drops the current 16-step pattern on a drum track.
  function addDrumPattern(names, grid, bpm) {
    let track = project.tracks.find((t) => t.instrument === 'drums');
    if (!track) track = addTrack('instrument', 'drums');
    if (!project.tracks.some((t) => t.clips.length) && bpm) project.bpm = bpm;
    const start = floorTo(ui.playhead, barBeats());
    const notes = [];
    grid.forEach((row, r) => row.forEach((on, step) => {
      if (!on) return;
      const voice = (window.DrumEngine && window.DrumEngine.aliases[names[r]]) || names[r];
      notes.push({ pitch: IO.DRUM_KEYS[voice] || IO.DRUM_KEYS.perc, start: step * 0.25, duration: 0.25, velocity: step % 4 === 0 ? 0.9 : 0.75 });
    }));
    const clip = newMidiClip(track, start, Math.max(barBeats(), Math.ceil(grid[0].length * 0.25 / barBeats()) * barBeats()));
    clip.name = 'Beat';
    clip.notes = notes.sort((a, b) => a.start - b.start);
    select(track.id, clip.id);
    commit();
    status(`Added the sequencer pattern to “${track.name}” at bar ${Math.round(start / barBeats()) + 1}. Duplicate it (Ctrl/⌘+D) to fill more bars.`);
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  window.MusicDaw = { noteOn, noteOff, drumPad, addDrumPattern };

  // ── Boot ─────────────────────────────────────────────────────────────────
  (async () => {
    let restored = false;
    try { restored = await loadAutosave(); } catch (_e) { restored = false; }
    history.last = snapshot();
    render();
    status(restored ? `Welcome back — “${project.name}” was restored from this browser.` : 'Track Studio: arm a track (●) and press ⏺ to record, or import audio and MIDI.');
    requestAnimationFrame(frame);
  })();
})();
