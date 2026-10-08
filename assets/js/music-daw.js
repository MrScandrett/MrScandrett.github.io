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
  // Touch screens (iPhone, iPad) get bigger targets everywhere, and phones get a
  // compact track header whose volume/pan/instrument controls live in the Mix tab.
  const COARSE = window.matchMedia('(pointer: coarse)').matches;
  let TRACK_H = COARSE ? 142 : 110;
  let HEAD_W = 200;
  let compactHeads = false;
  const ROW_H = COARSE ? 22 : 14;
  let KEYS_W = 80;
  const DOUBLE_TAP_MS = 350;
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
    tab: 'tools', rollTool: 'draw', playOct: 4, playTrack: null,
  };
  const history = { undo: [], redo: [], last: '' };
  const audio = { ctx: null, mix: null, meter: null, meterData: null };
  const transport = {
    playing: false, recording: false, segs: [], schedBeat: 0, timer: null,
    gates: new Map(), voices: new Set(), sources: new Set(), startBeat: 0,
    recStart: 0, take: null,
  };
  const monitorVoices = new Set();
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
      mute: false, solo: false, armed: false, clips: [], effects: [], tools: [], experienceState: {},
    };
  }
  function uid() { return Math.random().toString(36).slice(2, 10); }

  // ── Helpers ──────────────────────────────────────────────────────────────
  const spb = () => 60 / project.bpm;
  const barBeats = () => project.sig[0] * 4 / project.sig[1];
  const clickStep = () => 4 / project.sig[1];
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
      watchInterruptions(audio.ctx);
      applyMix();
    }
    setAudioSession();
    if (audio.ctx.state !== 'running') audio.ctx.resume();
    return audio.ctx;
  }

  // Safari (iOS 16.4+): "playback" keeps the studio audible with the ring/silent
  // switch on; "play-and-record" while the mic is open stops iPhone routing the
  // song to the quiet earpiece speaker.
  function setAudioSession() {
    const session = navigator.audioSession;
    if (!session) return;
    const want = mic.stream ? 'play-and-record' : 'playback';
    try { if (session.type !== want) session.type = want; } catch (_e) { /* read-only in some builds */ }
  }

  // A phone call, Siri or switching apps interrupts Web Audio on iOS. Stop the
  // transport cleanly instead of leaving the playhead running over silence.
  function watchInterruptions(c) {
    let wasRunning = c.state === 'running';
    c.addEventListener('statechange', () => {
      if (c.state === 'running') { wasRunning = true; return; }
      if (!wasRunning) return;
      wasRunning = false;
      if (transport.playing) {
        pause();
        status('Audio was interrupted (a call, Siri or another app). Press ▶ to carry on.');
      }
    });
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
        s = { input, gain, pan, effects: [], signature: null, meter: null };
        if (!(c instanceof OfflineAudioContext)) {
          s.meter = c.createAnalyser();
          s.meter.fftSize = 512;
          pan.connect(s.meter);
        }
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

  // ── Instruments (assets/js/music-synth.js) ───────────────────────────────
  function startVoice(c, out, instrument, pitch, vel, t, track) {
    const settings = track?.tools?.includes('synthlab') ? track.experienceState?.synthlab || {} : {};
    return window.MusicSynth.startVoice(c, out, instrument, pitch, vel, t, (v) => { transport.voices.delete(v); monitorVoices.delete(v); }, settings);
  }

  const drumKits = new WeakMap();
  function drumHit(c, out, key, vel, t, track) {
    if (!window.DrumEngine) return;
    let kit = drumKits.get(out);
    if (!kit) { kit = window.DrumEngine.create(c, out); drumKits.set(out, kit); }
    const name = IO.drumVoiceForKey(key);
    kit.hit(name, t, 0.35 + 0.65 * vel, track?.drumState?.lanes?.[name]);
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
      if (track.kind !== 'instrument' || !hasInstrumentExperience(track)) return;
      track.clips.forEach((clip) => {
        if (clip.start >= b || clip.start + clip.length <= a) return;
        clip.notes.forEach((n) => {
          if (n.start < 0 || n.start >= clip.length) return;
          const nb = clip.start + n.start;
          if (nb < a || nb >= b) return;
          const out = env.destFor(track);
          const t0 = env.timeOf(nb);
          if (track.instrument === 'drums') { drumHit(env.c, out, n.pitch, n.velocity, t0, track); return; }
          const end = Math.min(nb + n.duration, clip.start + clip.length, env.segEnd);
          const v = startVoice(env.c, out, track.instrument, n.pitch, n.velocity, t0, track);
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
    stopExperiences();
    stopSounds();
    transport.playing = false;
    const wasRecording = transport.recording;
    if (wasRecording) finishRecording(pos);
    silenceLive();
    transport.recording = false;
    ui.playhead = Math.max(0, pos);
    transport.segs = [];
    updateTransportUi();
    drawPlayhead();
  }

  function stop() {
    if (recordPending && !transport.playing) { ++armRequest; releaseMic(); status('Recording preparation cancelled.'); return; }
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

  let armRequest = 0, recordPending = false, finishingTake = false;
  function silenceLive() {
    if (audio.ctx) monitorVoices.forEach(v => v.kill(audio.ctx.currentTime));
    monitorVoices.clear(); live.clear();
    fingers.forEach((_, id) => fingerOff(id));
  }
  async function record() {
    if (recordPending || finishingTake) { status('Wait for the microphone or previous take to finish.'); return; }
    recordPending = true;
    try { await beginRecording(); } finally { recordPending = false; updateTransportUi(); }
  }
  async function beginRecording() {
    if (transport.recording) { pause(); return; }
    let track = armedTrack();
    if (!track) {
      track = (ui.tab === 'play' && playTarget()) || findTrack(ui.selTrack) || project.tracks.find((t) => t.kind === 'instrument');
      if (!track) { status('Add a track first, then press record.'); return; }
      await setArmed(track, true);
      if (!track.armed) return;
    }
    if (track.kind === 'audio' && !mic.node) { status('Microphone is not ready.'); return; }
    if (transport.playing) pause();
    stopExperiences();
    silenceLive();
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
    if (project.loop.on) status('Loop playback is suspended during this linear take.');
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
      take.notes.push({ pitch: on.key, start: on.beat, duration: Math.max(0.05, stopBeat - on.beat), velocity: on.vel });
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
    finishingTake = true;
    updateTransportUi();
    const firstSeg = transport.segs[0];
    const recStart = transport.recStart;
    const recorder = mic.node;
    await new Promise(resolve => { mic.stopped = resolve; recorder.port.postMessage('stop'); });
    mic.capturing = false;
    const chunks = mic.chunks;
    mic.chunks = [];
    finishingTake = false;
    if (!armedTrack() || armedTrack().kind !== 'audio') releaseMic();
    updateTransportUi();
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
    if (transport.recording || finishingTake) { status('Finish the current take before changing the armed channel.'); return; }
    if (on && track.kind === 'instrument' && !hasInstrumentExperience(track)) { status('Add an instrument experience to this channel before arming it.'); return; }
    const request = ++armRequest;
    silenceLive();
    project.tracks.forEach((t) => { if (t !== track) t.armed = false; });
    if (on && track.kind === 'audio') {
      const ok = await ensureMic();
      if (request !== armRequest || !findTrack(track.id)) { if (!armedTrack() || armedTrack().kind !== 'audio') releaseMic(); return; }
      if (!ok) on = false;
    }
    track.armed = on;
    if (!project.tracks.some((t) => t.armed && t.kind === 'audio')) releaseMic();
    setAudioSession();
    renderTracks();
    renderDock();
    if (on) {
      status(track.kind === 'audio'
        ? `“${track.name}” is armed. Press ⏺ to record from the microphone (headphones stop the speakers bleeding in).`
        : `“${track.name}” is armed: the keyboard, QWERTY keys and MIDI now play its ${INSTRUMENTS[track.instrument]}. Press ⏺ to record.`);
    }
  }

  let micPending = null;
  function ensureMic() {
    if (!micPending) micPending = openMic().finally(() => { micPending = null; });
    return micPending;
  }
  async function openMic() {
    if (mic.node) return true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.AudioWorkletNode) {
      status(window.isSecureContext === false
        ? 'Recording needs a secure (https) page. Open the class site address, not a local file.'
        : 'This browser cannot record audio. Update iOS/iPadOS, or try Safari, Chrome, Edge or Firefox.');
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
    mic.node.port.onmessage = (e) => {
      if (e.data.stopped) { mic.stopped?.(); mic.stopped = null; }
      else if (mic.capturing) mic.chunks.push(e.data);
    };
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
    if (!track || track.kind !== 'instrument' || !hasInstrumentExperience(track)) return false;
    const c = ctx();
    const vel = velocity === undefined ? 0.8 : velocity;
    let key = pitch;
    if (track.instrument === 'drums') {
      key = (gmDrum || pitch < 48) && IO.DRUM_LABELS[pitch] ? pitch : DRUM_LAYOUT[pitch % 12];
      drumHit(c, audio.mix.strip(track).input, key, vel, c.currentTime, track);
    } else {
      if (live.has(pitch)) live.get(pitch).release(c.currentTime);
      const voice=startVoice(c, audio.mix.strip(track).input, track.instrument, pitch, vel, c.currentTime, track);
      monitorVoices.add(voice);live.set(pitch,voice);
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
    if (transport.recording || finishingTake) { status('Finish the take before Undo.'); return; }
    if (!history.undo.length) return;
    history.redo.push(history.last);
    restore(history.undo.pop());
  }
  function redo() {
    if (transport.recording || finishingTake) { status('Finish the take before Redo.'); return; }
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
    if (transport.recording || finishingTake) { status('Finish the take before deleting a channel.'); return; }
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
    if (transport.recording || finishingTake) { status('Finish the take before importing.'); return; }
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
      if (transport.recording || finishingTake) throw new Error('Finish the take before opening a project.');
      ++armRequest; releaseMic();
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
  // On iPhone/iPad a download lands silently in Files › Downloads, so touch
  // devices that can share files get a ready-to-share bar instead: the share
  // sheet saves to Files, AirDrops, or opens the WAV/MIDI in GarageBand.
  // Sharing needs a fresh tap (the render took longer than the tap's grace period).
  function download(data, filename, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    let file = null;
    try { file = new File([blob], filename, { type: blob.type || type || 'application/octet-stream' }); } catch (_e) { file = null; }
    if (COARSE && file && navigator.canShare && navigator.canShare({ files: [file] })) {
      offerShare(file, blob, filename);
      return;
    }
    saveBlob(blob, filename);
  }
  function saveBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function offerShare(file, blob, filename) {
    const bar = R.ready;
    bar.hidden = false;
    bar.innerHTML = `<span><b>${esc(filename)}</b> is ready.</span>
      <button type="button" class="daw-btn daw-share" data-ready="share">Share or save…</button>
      <button type="button" class="daw-btn" data-ready="download">Download</button>
      <button type="button" class="daw-btn daw-ready-x" data-ready="close" aria-label="Dismiss">✕</button>`;
    bar.onclick = async (e) => {
      const b = e.target.closest('[data-ready]');
      if (!b) return;
      if (b.dataset.ready === 'share') {
        try { await navigator.share({ files: [file], title: filename }); } catch (err) {
          if (err && err.name === 'AbortError') return;
          saveBlob(blob, filename);
        }
      } else if (b.dataset.ready === 'download') saveBlob(blob, filename);
      bar.hidden = true;
      bar.innerHTML = '';
    };
    bar.querySelector('[data-ready="share"]').focus({ preventScroll: true });
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
    if (transport.recording || finishingTake) { status('Finish the take before starting a new song.'); return; }
    ++armRequest; releaseMic();
    if (project.tracks.some((t) => t.clips.length) && !confirm('Start a new song? The current one stays in Undo until you leave the page.')) return;
    if (transport.playing) pause();
    project = defaultProject();
    ui.selClip = null; ui.selTrack = null; ui.playhead = 0;
    commit();
  }

  // ── DOM: shell ───────────────────────────────────────────────────────────
  const snapOptions = [['bar', 'Bar'], [1, 'Beat'], [0.5, '1/8'], [0.25, '1/16'], [0, 'Off']];
  const gridOptions = [[1, '1/4'], [0.5, '1/8'], [0.25, '1/16'], [0.125, '1/32'], [1 / 3, '1/8 triplet'], [1 / 6, '1/16 triplet']];
  const DOCK_TABS = [
    ['tools', 'Channel', 'Add learning tools to a channel'],
    ['edit', '✎ Edit', 'Piano roll or audio clip editor for the selected clip'],
    ['play', '🎹 Play', 'On-screen keyboard and drum pads for the armed track'],
    ['mix', '🎚 Mix', 'Volume, pan, mute, solo and level meters for every track'],
    ['fx', 'FX', 'Channel effects (EQ, compressor) for one track'],
  ];
  // Drum pads in a 4×3 grid: hands on the bottom row like a pad controller.
  const PADS = [[49, 'Crash'], [51, 'Ride'], [46, 'Open Hat'], [56, 'Cowbell'],
    [48, 'High Tom'], [47, 'Mid Tom'], [41, 'Low Tom'], [42, 'Closed Hat'],
    [36, 'Kick'], [38, 'Snare'], [39, 'Clap'], [37, 'Rim']];
  const instrumentOptions = (sel) => Object.keys(INSTRUMENTS).map((k) => `<option value="${k}"${k === sel ? ' selected' : ''}>${INSTRUMENTS[k]}</option>`).join('');

  root.innerHTML = `
    <div class="daw-workflow"><strong>Make a song in layers</strong><span>1. Choose a channel and sound → 2. Arm ● and record → 3. Add another layer → 4. Mix and export</span></div>
    <div class="daw-bar daw-transport" role="toolbar" aria-label="Transport">
      <div class="daw-group">
        <button type="button" class="daw-btn" data-act="home" aria-label="Back to start" title="Back to start (Home)">⏮</button>
        <button type="button" class="daw-btn daw-play" data-act="play" aria-label="Play" title="Play / pause (Space)">▶</button>
        <button type="button" class="daw-btn" data-act="stop" aria-label="Stop" title="Stop (press twice to go back to the start)">⏹</button>
        <button type="button" class="daw-btn daw-rec" data-act="record" aria-label="Record" title="Record on the armed track">⏺</button>
        <button type="button" class="daw-btn daw-toggle daw-studio-btn" data-act="studio" aria-pressed="false" aria-label="Full-screen studio" title="Full-screen studio: fill the screen with the tracks and panels">⛶</button>
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
    <details class="daw-region"><summary>Loop region + seek</summary><div class="daw-bar" aria-label="Loop and navigation">
      <label class="daw-field">Position (beat)<input type="number" data-position min="1" step="0.25" value="1"></label>
      <label class="daw-field">Loop from (beat)<input type="number" data-loop-bound="start" min="1" step="0.25" value="1"></label>
      <label class="daw-field">Loop to (beat)<input type="number" data-loop-bound="end" min="1.25" step="0.25" value="17"></label>
      <span class="daw-note">End beat is exclusive. Recording makes one continuous take.</span>
    </div></details>
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
    <div class="daw-dock">
      <div class="daw-tabs" role="tablist" aria-label="Studio panels">
        ${DOCK_TABS.map(([id, label, title]) => `<button type="button" role="tab" class="daw-tab" id="daw-tab-${id}" data-tab="${id}" aria-controls="daw-panel-${id}" aria-selected="false" tabindex="-1" title="${title}">${label}</button>`).join('')}
      </div>
      <section class="daw-panel daw-channel" role="tabpanel" id="daw-panel-tools" aria-labelledby="daw-tab-tools" data-ref="tools"></section>
      <div class="daw-panel daw-editor" role="tabpanel" id="daw-panel-edit" aria-labelledby="daw-tab-edit" data-ref="editor"></div>
      <div class="daw-panel daw-play" role="tabpanel" id="daw-panel-play" aria-labelledby="daw-tab-play" data-ref="play" hidden></div>
      <div class="daw-panel daw-mixer" role="tabpanel" id="daw-panel-mix" aria-labelledby="daw-tab-mix" data-ref="mixer" hidden></div>
      <section class="daw-panel daw-effects" role="tabpanel" id="daw-panel-fx" aria-labelledby="daw-tab-fx" data-ref="effects" hidden></section>
    </div>
    <div class="daw-ready" data-ref="ready" role="region" aria-label="Exported file" hidden></div>
    <p class="daw-status" data-ref="status" role="status" aria-live="polite"></p>
    <input type="file" aria-label="Import audio, MIDI or a saved project" data-ref="file" multiple accept="audio/*,audio/midi,audio/x-midi,application/zip,.wav,.mp3,.ogg,.m4a,.flac,.aif,.aiff,.mid,.midi,.zip" hidden>
  `;

  // Keep secondary controls out of the arrangement, without hiding essential transport.
  const fileTools = root.querySelector(".daw-file-tools");
  const commandStrip = document.createElement('div');
  commandStrip.className = 'daw-command-strip';
  const transportSettings = document.createElement('details');
  transportSettings.className = 'daw-settings';
  transportSettings.innerHTML = '<summary>Settings</summary><div class="daw-settings-body"></div>';
  const transportGroups = [...root.querySelector('.daw-transport').children];
  transportGroups.slice(2).forEach(node => transportSettings.lastElementChild.append(node));
  // Attach the strip first: appending into a detached node would pull these out of root.
  root.querySelector('.daw-transport').after(commandStrip);
  commandStrip.append(transportSettings, root.querySelector('.daw-region'), fileTools);
  fileTools.open = false;
  const views = document.createElement('div'); views.className = 'daw-views';
  views.setAttribute('role', 'group'); views.setAttribute('aria-label', 'Workspace view');
  views.innerHTML = ['tracks','split','instrument'].map(view => `<button type="button" class="daw-btn" data-view="${view}" aria-pressed="${view==='split'}">${view==='tracks'?'Tracks':view==='split'?'Split':'Instrument'}</button>`).join('');
  commandStrip.append(views);
  root.dataset.view = 'split';
  views.addEventListener('click', event => {
    const button = event.target.closest('[data-view]'); if (!button) return;
    silenceLive(); root.dataset.view = button.dataset.view;
    views.querySelectorAll('button').forEach(node => node.setAttribute('aria-pressed', String(node===button)));
    requestAnimationFrame(() => { renderTracks(); if(ui.tab==='edit') {sizeRoll();drawRoll();} });
  });
  commandStrip.querySelectorAll('details').forEach(details => details.addEventListener('toggle', () => {
    if(details.open) commandStrip.querySelectorAll('details').forEach(other => {if(other!==details)other.open=false;});
  }));

  const $ = (name) => root.querySelector(`[data-ref="${name}"]`);
  const R = {
    pos: $('pos'), time: $('time'), bpm: $('bpm'), sig: $('sig'), master: $('master'), meter: $('meter'),
    name: $('name'), snap: $('snap'), scroll: $('scroll'), tracks: $('tracks'), editor: $('editor'),
    status: $('status'), file: $('file'), play: $('play'), mixer: $('mixer'), effects: $('effects'),
    ready: $('ready'),
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
    renderEditor();
    renderDock();
    updateTransportUi();
  }

  // Phones get narrow track headers (name, instrument, M S ●); everything else
  // about a track is one tap away in the Mix tab.
  function measureLayout() {
    const w = R.scroll.clientWidth || root.clientWidth || 800;
    compactHeads = w < 560;
    HEAD_W = compactHeads ? (COARSE ? 150 : 118) : 210;
    TRACK_H = compactHeads ? (COARSE ? 94 : 80) : (COARSE ? 122 : 96);
    KEYS_W = compactHeads ? 52 : 80;
  }

  function setTimelineVars() {
    const ppb = ui.pxPerBeat, bar = barBeats();
    R.tracks.style.setProperty('--daw-head', HEAD_W + 'px');
    R.tracks.style.setProperty('--daw-width', timelineBeats() * ppb + 'px');
    R.tracks.style.setProperty('--daw-beat', ppb + 'px');
    R.tracks.style.setProperty('--daw-bar', ppb * bar + 'px');
    R.tracks.style.setProperty('--daw-track-h', TRACK_H + 'px');
  }

  // Zoom without rebuilding the DOM, so a pinch in progress keeps its touch targets.
  function relayoutTimeline() {
    setTimelineVars();
    R.tracks.querySelectorAll('.daw-clip[data-clip]').forEach((el) => {
      const f = findClip(el.dataset.clip);
      if (!f) return;
      el.style.left = f.clip.start * ui.pxPerBeat + 'px';
      el.style.width = Math.max(6, clipBeats(f.clip) * ui.pxPerBeat) + 'px';
    });
    drawRuler();
    drawPlayhead();
  }

  function renderTracks() {
    measureLayout();
    setTimelineVars();
    root.classList.toggle('is-compact', compactHeads);
    const rows = project.tracks.map((t, i) => trackRowHtml(t, i)).join('');
    R.tracks.innerHTML = `
      <div class="daw-corner"><span>${project.tracks.length} track${project.tracks.length === 1 ? '' : 's'}</span></div>
      <div class="daw-ruler" data-ruler><canvas></canvas></div>
      ${rows}
      <div class="daw-th daw-th-add">
        <button type="button" class="daw-btn" data-act="quick-instrument">＋ Instrument</button>
        <button type="button" class="daw-btn" data-act="add-audio">＋ Audio</button>
      </div>
      <div class="daw-lane daw-lane-add" data-hint>${!project.tracks.length ? 'Add a track to begin, or import audio/MIDI files'
        : COARSE ? 'Double-tap an instrument lane to add a clip · pinch to zoom · tap a clip, then drag it'
          : 'Double-click an instrument lane to draw a clip · drag files here to import'}</div>
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

  // ── DOM: dock (Edit / Play / Mix / FX tabs) ─────────────────────────────
  function setTab(id, focus) {
    if (!DOCK_TABS.some(([t]) => t === id)) return;
    const changed = ui.tab !== id;
    if (changed) silenceLive();
    ui.tab = id;
    renderDock();
    if (id === 'edit' && changed) drawRoll();
    if (focus) root.querySelector(`[data-tab="${id}"]`).focus();
  }

  function renderDock() {
    root.querySelectorAll('[data-tab]').forEach((b) => {
      const on = b.dataset.tab === ui.tab;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    $('tools').hidden = ui.tab !== 'tools';
    if (ui.tab === 'tools') renderChannel();
    else disposeExperiences();
    R.editor.hidden = ui.tab !== 'edit';
    R.play.hidden = ui.tab !== 'play';
    R.mixer.hidden = ui.tab !== 'mix';
    R.effects.hidden = ui.tab !== 'fx';
    if (ui.tab === 'play') renderPlay();
    if (ui.tab === 'mix') renderMixer();
    if (ui.tab === 'fx') renderEffects();
  }

  root.querySelector('.daw-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) setTab(b.dataset.tab);
  });
  root.querySelector('.daw-tabs').addEventListener('keydown', (e) => {
    const ids = DOCK_TABS.map(([t]) => t), i = ids.indexOf(ui.tab);
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: ids.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    setTab(ids[(next + ids.length) % ids.length], true);
  });

  // Re-rendering a panel rebuilds its controls; keep keyboard focus on the same one.
  function keepFocus(host, fn) {
    const a = document.activeElement;
    const key = a && host.contains(a) ? a.dataset.focus : null;
    fn();
    if (key) { const el = host.querySelector(`[data-focus="${key}"]`); if (el) el.focus({ preventScroll: true }); }
  }

  // ── Play tab: on-screen keyboard / drum pads ────────────────────────────
  function playTarget() {
    const armed = armedTrack();
    if (armed && hasInstrumentExperience(armed)) return armed;
    const chosen = findTrack(ui.playTrack);
    if (chosen && hasInstrumentExperience(chosen)) return chosen;
    const sel = findTrack(ui.selTrack);
    if (sel && sel.kind === 'instrument') return hasInstrumentExperience(sel) ? sel : null;
    return project.tracks.find(hasInstrumentExperience) || null;
  }

  // Arms the instrument track the keys play, without re-rendering the Play tab
  // under the fingers that are pressing it.
  function armForPlay(track) {
    if (track.armed || !hasInstrumentExperience(track)) return;
    if (transport.recording || finishingTake) return;
    ++armRequest;
    silenceLive();
    project.tracks.forEach((t) => { t.armed = t === track; });
    releaseMic();
    setAudioSession();
    renderTracks();
    const who = R.play.querySelector('[data-play-armed]');
    if (who) who.textContent = 'armed';
  }

  function renderPlay() {
    keepFocus(R.play, () => {
      const track = playTarget();
      const instruments = project.tracks.filter(hasInstrumentExperience);
      if (!track) {
        R.play.innerHTML = '<p class="daw-note">Add an instrument experience to a channel to play it here. <button type="button" class="daw-btn" data-act="channel-tools" data-focus="add">Open channel rack</button></p>';
        return;
      }
      ui.playTrack = track.id;
      const drums = track.instrument === 'drums';
      ui.playOct=Number(track.experienceState?.keyboard?.octave ?? track.experienceState?.controllerOctave ?? 4);
      const audioArmed = project.tracks.find((t) => t.armed && t.kind === 'audio');
      R.play.innerHTML = `
        <div class="daw-bar daw-ed-bar daw-play-bar"><div class="daw-group">
          <label class="daw-field"><span>Play</span><select data-play="track" data-focus="track" aria-label="Track the on-screen keys play">
            ${instruments.map((t) => `<option value="${t.id}"${t === track ? ' selected' : ''}>${esc(t.name)} · ${INSTRUMENTS[t.instrument]}</option>`).join('')}
          </select></label>
          ${drums ? '' : `<button type="button" class="daw-btn" data-play="oct" data-by="-1" data-focus="oct-" aria-label="Octave down">− Oct</button>
          <span class="daw-oct" aria-live="polite">C${ui.playOct}</span>
          <button type="button" class="daw-btn" data-play="oct" data-by="1" data-focus="oct+" aria-label="Octave up">Oct +</button>`}
          <button type="button" class="daw-btn daw-rec" data-act="record" data-focus="rec" title="Record what you play on this track">⏺ Record</button>
        </div></div>
        <p class="daw-note">${audioArmed ? `“${esc(audioArmed.name)}” is armed for the microphone; touching the keys switches recording to “${esc(track.name)}”. `
          : track.armed ? `“${esc(track.name)}” is <span data-play-armed>armed</span>. ` : `Touching a key arms “${esc(track.name)}”. `}
          ${drums ? 'Several fingers at once work. Tap nearer the bottom of a pad to hit harder.' : 'Slide across keys to glide · press lower on a key to play louder · several fingers make chords.'}</p>
        ${drums ? padsHtml() : keysHtml()}`;
    });
  }

  function padsHtml() {
    return `<div class="daw-pads" data-keys role="group" aria-label="Drum pads">${PADS.map(([key, label]) =>
      `<button type="button" class="daw-pad" data-pitch="${key}" data-drum="1" aria-label="${label}">${label}</button>`).join('')}</div>`;
  }

  function keysHtml() {
    const width = R.play.clientWidth || root.clientWidth || 360;
    const whites = clamp(Math.floor(width / (COARSE ? 46 : 40)), 7, 24);
    const startPitch = 12 * (ui.playOct + 1);
    const keys = [];
    let p = startPitch, w = 0;
    while (w < whites) {
      const black = [1, 3, 6, 8, 10].includes(p % 12);
      if (!black) w++;
      keys.push({ p, black, left: w - 1 });   // for a black key: the white key to its left
      p++;
    }
    const pct = 100 / whites;
    return `<div class="daw-keys" data-keys role="group" aria-label="Keyboard, ${noteLabel(startPitch)} to ${noteLabel(keys[keys.length - 1].p)}" style="--whites:${whites}">
      ${keys.filter((k) => !k.black).map((k) => `<button type="button" class="daw-key" data-pitch="${k.p}" aria-label="${noteLabel(k.p)}">${k.p % 12 === 0 ? noteLabel(k.p) : ''}</button>`).join('')}
      ${keys.filter((k) => k.black).map((k) => `<button type="button" class="daw-key is-black" data-pitch="${k.p}" aria-label="${noteLabel(k.p)}" style="left:calc(${(k.left + 1) * pct}% - ${pct * 0.3}%);width:${pct * 0.6}%"></button>`).join('')}
    </div>`;
  }

  // Multi-touch: every finger is its own note; sliding moves that finger's note.
  const fingers = new Map();   // pointerId → { pitch, el, drum }
  function keyVelocity(el, clientY) {
    const r = el.getBoundingClientRect();
    return clamp(0.35 + 0.65 * ((clientY - r.top) / Math.max(1, r.height)), 0.2, 1);
  }
  function fingerOn(id, el, clientY) {
    const track = playTarget();
    if (!track) return;
    armForPlay(track);
    if (!track.armed) return;
    const pitch = Number(el.dataset.pitch), drum = !!el.dataset.drum;
    noteOn(pitch, keyVelocity(el, clientY), drum);
    el.classList.add('is-down');
    fingers.set(id, { pitch, el, drum });
  }
  function fingerOff(id) {
    const f = fingers.get(id);
    if (!f) return;
    fingers.delete(id);
    if (![...fingers.values()].some((o) => o.pitch === f.pitch)) { noteOff(f.pitch); f.el.classList.remove('is-down'); }
  }
  R.play.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('[data-pitch]');
    if (!el || e.button > 0) return;
    e.preventDefault();
    try { el.releasePointerCapture(e.pointerId); } catch (_e) { /* not captured */ }
    fingerOn(e.pointerId, el, e.clientY);
  });
  R.play.addEventListener('pointermove', (e) => {
    const f = fingers.get(e.pointerId);
    if (!f || f.drum) return;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const el = under && under.closest && under.closest('.daw-keys [data-pitch]');
    if (!el || el === f.el) return;
    fingerOff(e.pointerId);
    fingerOn(e.pointerId, el, e.clientY);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => R.play.addEventListener(type, (e) => {
    if (type === 'pointerleave' && e.pointerType !== 'mouse') return;
    fingerOff(e.pointerId);
  }));
  // Keyboard users: Enter/Space on a focused key plays it.
  R.play.addEventListener('keydown', (e) => {
    const el = e.target.closest('[data-pitch]');
    if (!el || (e.key !== 'Enter' && e.key !== ' ') || e.repeat) return;
    e.preventDefault();
    e.stopPropagation();
    fingerOn('key', el, el.getBoundingClientRect().bottom - 4);
  });
  R.play.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') fingerOff('key'); });
  window.addEventListener('pointerup', e => fingerOff(e.pointerId));
  window.addEventListener('pointercancel', e => fingerOff(e.pointerId));
  R.play.addEventListener('focusout', e => { if (e.target.matches('[data-pitch]')) fingerOff('key'); });
  R.play.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-pitch]')) e.preventDefault(); });
  R.play.addEventListener('change', (e) => {
    if (e.target.dataset.play !== 'track') return;
    const t = findTrack(e.target.value);
    if (!t) return;
    ui.playTrack = t.id;
    armForPlay(t);
    renderPlay();
  });
  R.play.addEventListener('click', (e) => {
    const b = e.target.closest('[data-play="oct"]');
    if (!b) return;
    ui.playOct = clamp(ui.playOct + Number(b.dataset.by), 1, 6);
    const track=playTarget();if(track){track.experienceState ||= {};if(track.tools.includes('keyboard')){track.experienceState.keyboard ||= {};track.experienceState.keyboard.octave=ui.playOct;}else track.experienceState.controllerOctave=ui.playOct;scheduleSave();}
    renderPlay();
  });

  // ── Mix tab: one channel strip per track + master ───────────────────────
  const toDb = (g) => (g <= 0.0001 ? '−∞' : (20 * Math.log10(g)).toFixed(1));
  const panLabel = (p) => (Math.abs(p) < 0.025 ? 'C' : (p < 0 ? 'L' : 'R') + Math.round(Math.abs(p) * 100));

  function renderMixer() {
    keepFocus(R.mixer, () => {
      R.mixer.innerHTML = `<div class="daw-strips">${project.tracks.map((t) => `
        <div class="daw-strip${t.id === ui.selTrack ? ' is-selected' : ''}" data-strip="${t.id}" style="--tc:${t.color}">
          <div class="daw-strip-head">
            <input class="daw-th-name" data-mx="name" data-focus="${t.id}-name" value="${esc(t.name)}" maxlength="40" aria-label="${esc(t.name)} name">
            ${t.kind === 'instrument'
              ? hasInstrumentExperience(t) ? `<select data-mx="instrument" data-focus="${t.id}-inst" aria-label="${esc(t.name)} instrument">${instrumentOptions(t.instrument)}</select>` : '<button type="button" class="daw-btn" data-mx="tools">Add instrument experience</button>'
              : '<span class="daw-tag">🎙 Audio</span>'}
          </div>
          <div class="daw-strip-btns">
            <button type="button" class="daw-mini" data-mx="mute" data-focus="${t.id}-m" aria-label="Mute ${esc(t.name)}" aria-pressed="${t.mute}">M</button>
            <button type="button" class="daw-mini" data-mx="solo" data-focus="${t.id}-s" aria-label="Solo ${esc(t.name)}" aria-pressed="${t.solo}">S</button>
            <button type="button" class="daw-mini daw-arm" data-mx="arm" data-focus="${t.id}-a" aria-label="Arm ${esc(t.name)} for recording" aria-pressed="${t.armed}">●</button>
            <button type="button" class="daw-btn daw-fx-btn" data-mx="fx" data-focus="${t.id}-fx" aria-label="Effects on ${esc(t.name)}">FX${(t.effects || []).length ? ' ' + t.effects.length : ''}</button>
            <button type="button" class="daw-mini daw-del" data-mx="delete" data-focus="${t.id}-del" aria-label="Delete ${esc(t.name)}">✕</button>
          </div>
          <label class="daw-strip-fader"><span>Vol</span><input type="range" data-mx="volume" data-focus="${t.id}-vol" min="0" max="1.2" step="0.01" value="${t.volume}" aria-label="${esc(t.name)} volume"><output>${toDb(t.volume)} dB</output></label>
          <label class="daw-strip-fader"><span>Pan</span><input type="range" data-mx="pan" data-focus="${t.id}-pan" min="-1" max="1" step="0.05" value="${t.pan}" aria-label="${esc(t.name)} pan"><output>${panLabel(t.pan)}</output></label>
          <span class="daw-meter daw-strip-meter" aria-hidden="true"><i data-strip-meter="${t.id}"></i></span>
        </div>`).join('')}
        <div class="daw-strip daw-strip-master">
          <div class="daw-strip-head"><strong>Master</strong><span class="daw-tag">Everything you hear and export</span></div>
          <label class="daw-strip-fader"><span>Vol</span><input type="range" data-mx="master" data-focus="master" min="0" max="1.2" step="0.01" value="${project.masterVolume}" aria-label="Master volume"><output>${toDb(project.masterVolume)} dB</output></label>
          <span class="daw-meter daw-strip-meter" aria-hidden="true"><i data-strip-meter="master"></i></span>
        </div>
      </div>
      <p class="daw-note">Solo (S) plays only the soloed tracks; mute (M) silences one. Meters turn red when a track is too loud — pull its fader down.</p>`;
    });
  }

  R.mixer.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-mx]'), strip = e.target.closest('[data-strip]');
    const track = strip && findTrack(strip.dataset.strip);
    if (!b || !track) return;
    const what = b.dataset.mx;
    if (what === 'mute' || what === 'solo') { track[what] = !track[what]; commit(); }
    else if (what === 'arm') setArmed(track, !track.armed);
    else if (what === 'delete') deleteTrack(track.id);
    else if (what === 'tools') {ui.selTrack=track.id;setTab('tools');}
    else if (what === 'fx') { effectsTrack = track.id; setTab('fx'); }
  });
  R.mixer.addEventListener('input', (e) => {
    const el = e.target, what = el.dataset.mx, out = el.parentElement.querySelector('output');
    if (what === 'master') {
      project.masterVolume = Number(el.value);
      R.master.value = el.value;
      if (out) out.textContent = toDb(project.masterVolume) + ' dB';
      applyMix();
      return;
    }
    const track = findTrack(el.closest('[data-strip]') && el.closest('[data-strip]').dataset.strip);
    if (!track || (what !== 'volume' && what !== 'pan')) return;
    track[what] = Number(el.value);
    if (out) out.textContent = what === 'volume' ? toDb(track.volume) + ' dB' : panLabel(track.pan);
    applyMix();
  });
  R.mixer.addEventListener('change', (e) => {
    const el = e.target, what = el.dataset.mx;
    if (what === 'master') { commit(); return; }
    const track = findTrack(el.closest('[data-strip]') && el.closest('[data-strip]').dataset.strip);
    if (!track) return;
    if (what === 'name') track.name = el.value.trim().slice(0, 40) || track.name;
    if (what === 'instrument') { if (transport.recording || finishingTake) { renderMixer(); return; } silenceLive(); track.instrument = el.value; syncInstrumentExperience(track); }
    commit();
  });

  // Learning modules attach to a channel; their notes use the same clips as the roll.
  let mountedExperiences = [];
  function stopExperiences() { mountedExperiences.forEach(module => module.stop()); }
  function disposeExperiences() { mountedExperiences.forEach(module => module.dispose()); mountedExperiences = []; }
  function hasInstrumentExperience(track) { return track?.kind === 'instrument' && (track.tools || []).some(id => window.MusicChannelExperiences.registry[id]?.role === 'instrument'); }
  function syncInstrumentExperience(track) {
    if (!hasInstrumentExperience(track)) return;
    const id=track.instrument==='drums'?'drumkit':track.instrument==='pluck'?'guitar':track.instrument==='synth'?'synthlab':'keyboard';
    track.tools=track.tools.filter(key=>window.MusicChannelExperiences.registry[key]?.role!=='instrument');track.tools.push(id);
  }
  const CHANNEL_TOOLS = {
    ...window.MusicChannelExperiences.registry,
    notation: { name: 'Sheet notation + note list', accepts: t => t.kind === 'instrument' && t.instrument !== 'drums', lesson: 'lessons/music/sheet-music-trainer.html' },
    rhythm: { name: 'Drum step sequencer', accepts: t => t.instrument === 'drums', lesson: 'lessons/music/drums.html' },
  };
  function channelTarget() { return findTrack(ui.selTrack) || project.tracks[0]; }
  function channelClip(track) { const sel = selected(); return sel?.track === track ? sel.clip : track.clips.find(c => c.type === 'midi'); }
  function ensureChannelClip(track) {
    let clip = channelClip(track);
    if (!clip) clip = newMidiClip(track, floorTo(Math.max(0, ui.playhead), barBeats()), barBeats());
    select(track.id, clip.id);
    return clip;
  }
  function notationSvg(clip) {
    const mn = window.MusicNotation;
    if (!mn || !clip.notes.length) return '<p class="daw-note">Add notes below, draw in Edit, or record a performance.</p>';
    const notes = [...clip.notes].sort((a,b) => a.start-b.start).slice(0, 64), width = Math.max(320, clip.length * 75 + 100);
    let out = [0,1,2,3,4].map(i => `<line x1="12" x2="${width-12}" y1="${80+i*12}" y2="${80+i*12}" stroke="currentColor"/>`).join('') + mn.clef('treble', 18, 128, 6);
    notes.forEach(n => {
      const pitch = mn.fromMidi(n.pitch), step = pitch.diatonic - mn.clefs.treble.bottom, x = 85+n.start*75, y = 128-step*6;
      mn.ledgerSteps(step).forEach(k => { out += `<line x1="${x-12}" x2="${x+12}" y1="${128-k*6}" y2="${128-k*6}" stroke="currentColor"/>`; });
      if (pitch.a) out += mn.accidental(pitch.a, x-25, y, 12);
      const dur = [4,2,1,.5,.25].reduce((a,b) => Math.abs(b-n.duration)<Math.abs(a-n.duration)?b:a);
      out += mn.note(x,y,12,dur,false,step<4,'',step%2===0);
    });
    const ys=notes.map(n=>128-(mn.fromMidi(n.pitch).diatonic-mn.clefs.treble.bottom)*6), top=Math.min(50,...ys)-50, bottom=Math.max(145,...ys)+50;
    return `<div class="daw-score"><svg viewBox="0 ${top} ${width} ${bottom-top}" width="${width}" height="240" role="img" aria-label="Treble staff preview. Exact pitches and timings are editable in the note list below.">${out}</svg></div><p class="daw-note">Staff preview uses sharp spellings and the nearest basic duration; chords share an onset. The note list preserves exact timing. First 64 notes shown.</p>`;
  }
  let lessonCatalog = [];
  fetch('data/lessons.json').then(r => r.json()).then(data => {
    lessonCatalog = (data.lessons || []).filter(l => l.url?.startsWith('lessons/music/') || (l.url?.startsWith('lessons/technical-elements/') && /audio|acoustic|microphone|eq-|cymatic/.test(l.url)));
    if (ui.tab === 'tools') renderChannel();
  }).catch(() => {});
  function renderChannel() {
    disposeExperiences();
    const host = $('tools'), track = channelTarget();
    if (!track) { host.innerHTML = '<p>Add a channel with ＋ Track to begin.</p>'; return; }
    ui.selTrack = track.id;
    const clip = channelClip(track);
    const arrange = selected()?.track === track ? selected().clip : track.clips[0];
    host.innerHTML = `<h3 class="daw-rack-title">${esc(track.name)} · channel rack</h3>
      <div class="daw-group"><label class="daw-field">Channel<select data-channel aria-label="Channel rack">${project.tracks.map(t => `<option value="${t.id}" ${t===track?'selected':''}>${esc(t.name)}</option>`).join('')}</select></label>
      <button type="button" class="daw-btn" data-channel-arm aria-pressed="${track.armed}">${track.armed?'Disarm':'Arm'} recording</button>
      </div><details class="daw-channel-options"><summary>Channel options</summary><div class="daw-group"><button type="button" class="daw-btn" data-channel-open="mix">Mix channel</button><button type="button" class="daw-btn" data-channel-open="fx">Add audio effects</button><button type="button" class="daw-btn" data-channel-preset="save">Save channel preset</button><button type="button" class="daw-btn" data-channel-preset="load">Load channel preset</button></div>
      <p class="daw-note">${track.kind==='audio'?'Microphone / imported audio → inserts → volume / pan → master.':'Instrument → notes → inserts → volume / pan → master.'} Add a tool to this channel to use it. Tools and effects travel in saved .mlab.zip projects.</p>
      </details>${track.kind==='instrument'?`<p class="daw-note">${hasInstrumentExperience(track)?`Installed sound: ${INSTRUMENTS[track.instrument]}`:'No instrument experience installed. Choose one below.'}</p>${hasInstrumentExperience(track)?'<button type="button" class="daw-btn" data-channel-open="play">Expanded play controller</button>':''}`:''}
      ${(track.tools||[]).filter(id => Object.hasOwn(CHANNEL_TOOLS,id) && CHANNEL_TOOLS[id].accepts(track)).map(id => `<section class="daw-module" data-installed-tool="${id}"><div class="daw-group"><h4>${CHANNEL_TOOLS[id].name}</h4><a href="${CHANNEL_TOOLS[id].lesson}">Lesson counterpart</a><button type="button" class="daw-btn" data-tool-remove="${id}">Remove experience</button></div>
      ${window.MusicChannelExperiences.registry[id]?`<div data-experience="${id}"></div>`:`<label class="daw-field">Note clip<select data-channel-clip aria-label="Channel note clip"><option value="">Choose / create clip</option>${track.clips.filter(c => c.type==='midi').map(c => `<option value="${c.id}" ${c===clip?'selected':''}>${esc(c.name)} · beat ${c.start+1}</option>`).join('')}</select></label>
      ${id==='rhythm'?rhythmHtml(clip):`${clip?notationSvg(clip):''}<button type="button" class="daw-btn" data-note-add>Add note</button>${noteListHtml(clip)}`}`}</section>`).join('')}
      <details class="daw-module daw-arrange"><summary>Arrange clips precisely</summary><label class="daw-field">Clip<select data-arrange-clip aria-label="Clip to arrange"><option value="">Select a clip</option>${track.clips.map(c=>`<option value="${c.id}" ${c===arrange?'selected':''}>${esc(c.name)} · beat ${c.start+1}</option>`).join('')}</select></label>
      ${arrange?`<label class="daw-field">Start (beat)<input type="number" data-arrange-start data-arrange-id="${arrange.id}" value="${arrange.start+1}" min="1" step="0.25" aria-label="Clip start beat"></label><button type="button" class="daw-btn" data-arrange-edit="${arrange.id}">Edit selected clip</button>`:'<p class="daw-note">Record a take, import a file, or add a note clip to arrange it here.</p>'}</details>
      <details class="daw-experience-catalog" ${hasInstrumentExperience(track)?'':'open'}><summary>Add an experience to this channel</summary><div class="daw-tool-catalog">${Object.entries(CHANNEL_TOOLS).map(([id,d]) => `<button type="button" class="daw-btn" data-tool-add="${id}" ${!d.accepts(track)||(track.tools||[]).includes(id)?'disabled':''}>Add ${d.name}</button>`).join('')}</div>
      <p class="daw-note">One instrument experience per channel. Adding another replaces its controller and sound while keeping your clips. Add more channels to layer instruments. Drum sequencing belongs on Drum Kit channels; pitched notation belongs on melodic channels. EQ and compression accept both instrument and audio channels.</p></details>
      <details class="daw-lesson-browser"><summary>Music + audio engineering lesson library</summary><p class="daw-note">Learn a technique, then apply it to this channel. Historical and listening lessons are references; sound processors appear in FX.</p><div class="daw-lesson-links">${lessonCatalog.map(l => `<a href="${esc(l.url)}">${esc(l.title)}</a>`).join('')}</div></details>`;
    host.querySelectorAll('[data-experience]').forEach(element => {
      const id=element.dataset.experience;
      const module=window.MusicChannelExperiences.mount(element,track,id,{
        instruments:Object.entries(INSTRUMENTS),
        begin(){ if(transport.recording && transport.take?.track!==track.id){status('Finish the take before playing another channel.');return false;} armForPlay(track);return track.armed; },
        noteOn, noteOff, canConfigure(){return !transport.recording&&!finishingTake;},
        sound(value){ if(transport.recording||finishingTake)return;silenceLive();track.instrument=value;syncInstrumentExperience(track);commit();restartIfPlaying(); },
        drum(name,options){if(transport.recording&&transport.take?.track!==track.id)return;armForPlay(track);if(track.armed)drumPad(name);},
        store:scheduleSave,
        changed(){ if(transport.recording||finishingTake)return;const active=document.activeElement;const key=active?.dataset.experienceParam;const label=active?.getAttribute('aria-label');commit();restartIfPlaying();const next=key?$('tools').querySelector(`[data-experience="${id}"] [data-experience-param="${key}"]`):label?[...$('tools').querySelectorAll(`[data-experience="${id}"] [aria-label]`)].find(node=>node.getAttribute('aria-label')===label):null;next?.focus({preventScroll:true}); }
      });
      mountedExperiences.push(module);
    });
    host.querySelectorAll('[data-experience] input, [data-experience] select, [data-experience-config]').forEach(node=>{node.disabled=transport.recording||finishingTake;});
  }
  function rhythmHtml(clip) {
    return `<p class="daw-note">One bar in the current meter, divided into sixteenths. Changes edit the selected clip directly; duplicate it in Edit to repeat.</p><div class="daw-step-scroll">${[[36,'Kick'],[38,'Snare'],[42,'Closed hat'],[46,'Open hat']].map(([pitch,name]) => `<div class="daw-step-row"><strong>${name}</strong>${Array.from({length: Math.round(barBeats()*4)}, (_,i) => { const on=clip?.notes.some(n => n.pitch===pitch&&Math.abs(n.start-i/4)<.01); return `<button type="button" class="daw-step" data-step="${i}" data-step-pitch="${pitch}" aria-label="${name}, beat ${i/4+1}" aria-pressed="${!!on}">${i+1}</button>`; }).join('')}</div>`).join('')}</div>`;
  }
  function noteListHtml(clip) {
    if (!clip?.notes.length) return '';
    return `<div class="daw-note-list">${clip.notes.map((n,i) => `<div class="daw-note-row" data-note-index="${i}"><strong>${noteLabel(n.pitch)}</strong>${[['pitch','MIDI pitch',21,108,1],['start','Onset (beat)',0,clip.length,.25],['duration','Length (beats)',.05,64,.25],['velocity','Velocity',.01,1,.05]].map(([k,label,min,max,step]) => `<label>${label}<input type="number" data-note-param="${k}" aria-label="Note ${i+1} ${label}" value="${n[k]}" min="${min}" max="${max}" step="${step}"></label>`).join('')}<button type="button" class="daw-btn" data-note-remove="${i}" aria-label="Remove note ${i+1}">Remove</button></div>`).join('')}</div>`;
  }
  $('tools').addEventListener('click', async e => {
    const b=e.target.closest('button'), t=channelTarget(); if (!b||b.disabled||!t) return;
    if (b.dataset.arrangeEdit) { select(t.id,b.dataset.arrangeEdit); renderEditor();setTab('edit');return; }
    if (b.hasAttribute('data-channel-arm')) { await setArmed(t,!t.armed); return; }
    if (b.dataset.channelOpen) { if(b.dataset.channelOpen==='play')armForPlay(t);ui.playTrack=t.id; effectsTrack=t.id; setTab(b.dataset.channelOpen); return; }
    if (transport.recording || finishingTake) { status('Finish the take before editing channel tools.'); return; }
    if (b.dataset.channelPreset === 'save') {
      download(new Blob([JSON.stringify({format:'MusicLabChannel',version:1,kind:t.kind,instrument:t.instrument,tools:t.tools||[],effects:t.effects||[],experienceState:t.experienceState||{},drumState:t.drumState||null},null,2)],{type:'application/json'}), `${fileSafe(t.name)}.mlchannel.json`, 'application/json');
      status('Saved channel sound, tools and inserts. Load this preset on a compatible channel in another song.'); return;
    }
    if (b.dataset.channelPreset === 'load') { presetTrack=t.id; presetInput.value='';presetInput.click();return; }
    t.tools ||= [];
    if (b.dataset.toolAdd) {
      const definition=CHANNEL_TOOLS[b.dataset.toolAdd];
      if(definition.role==='instrument') { silenceLive();t.tools=t.tools.filter(id=>CHANNEL_TOOLS[id]?.role!=='instrument');t.instrument=definition.instrument; }
      t.tools.push(b.dataset.toolAdd);
    }
    else if (b.dataset.toolRemove) { if(CHANNEL_TOOLS[b.dataset.toolRemove]?.role==='instrument'){silenceLive();t.armed=false;}t.tools=t.tools.filter(id => id!==b.dataset.toolRemove); }
    else if (b.hasAttribute('data-note-add')) { const c=ensureChannelClip(t); c.notes.push({pitch:60,start:0,duration:1,velocity:.8}); }
    else if (b.hasAttribute('data-note-remove')) channelClip(t)?.notes.splice(Number(b.dataset.noteRemove),1);
    else if (b.hasAttribute('data-step')) {
      const c=ensureChannelClip(t), pitch=Number(b.dataset.stepPitch), start=Number(b.dataset.step)/4;
      const i=c.notes.findIndex(n => n.pitch===pitch&&Math.abs(n.start-start)<.01);
      if(i>=0)c.notes.splice(i,1);else c.notes.push({pitch,start,duration:.25,velocity:.8});
    } else return;
    const selector=b.hasAttribute('data-step')?`[data-step="${b.dataset.step}"][data-step-pitch="${b.dataset.stepPitch}"]`:b.dataset.toolAdd?`[data-tool-remove="${b.dataset.toolAdd}"]`:'[data-channel]';
    commit(); restartIfPlaying(); $('tools').querySelector(selector)?.focus({preventScroll:!b.dataset.toolAdd});
  });
  $('tools').addEventListener('change', e => {
    const el=e.target,t=channelTarget(); if(!t)return;
    if(el.hasAttribute('data-channel')) { ui.selTrack=el.value; ui.selClip=null; renderDock(); $('tools').querySelector('[data-channel]').focus(); return; }
    if(el.hasAttribute('data-arrange-clip')) { select(t.id,el.value||null);renderChannel();$('tools').querySelector('[data-arrange-clip]').focus();return; }
    if(el.hasAttribute('data-channel-clip')) { select(t.id,el.value||null); renderChannel(); return; }
    if(transport.recording||finishingTake){renderChannel();status('Finish the take before editing.');return;}
    if(el.hasAttribute('data-arrange-start')) { const c=findClip(el.dataset.arrangeId)?.clip;if(c){c.start=Math.max(0,(Number(el.value)||1)-1);commit();restartIfPlaying();$('tools').querySelector('[data-arrange-start]')?.focus();}return; }
    if(el.hasAttribute('data-channel-sound')) { silenceLive();t.instrument=el.value; syncInstrumentExperience(t); }
    else if(el.dataset.noteParam) {
      const i=Number(el.closest('[data-note-index]').dataset.noteIndex),c=channelClip(t),n=c?.notes[i];if(!n)return;
      n[el.dataset.noteParam]=clamp(Number(el.value)||Number(el.min),Number(el.min),Number(el.max));
      c.length=Math.max(c.length,n.start+n.duration);
      const key=el.dataset.noteParam;commit();restartIfPlaying();$('tools').querySelector(`[data-note-index="${i}"] [data-note-param="${key}"]`)?.focus();return;
    }else return;
    commit();restartIfPlaying();
  });
  let presetTrack = null;
  const presetInput = document.createElement('input');
  presetInput.type='file';presetInput.accept='.json';presetInput.hidden=true;presetInput.setAttribute('aria-label','Load Music Lab channel preset');root.append(presetInput);
  presetInput.addEventListener('change', async () => {
    const t=findTrack(presetTrack),file=presetInput.files[0];if(!t||!file)return;
    try {
      const data=JSON.parse(await file.text());
      if(transport.recording||finishingTake)throw new Error('Finish the take first.');
      if(data.format!=='MusicLabChannel'||data.version!==1||data.kind!==t.kind)throw new Error('Choose a preset matching this channel type.');
      if(t.kind==='instrument'&&!INSTRUMENTS[data.instrument])throw new Error('Unknown instrument.');
      if(!Array.isArray(data.effects)||data.effects.length>8||data.effects.some(e=>!window.AudioEffects.registry[e.type]))throw new Error('Unsupported effects.');
      silenceLive();
      t.instrument=t.kind==='instrument'?data.instrument:null;
      t.effects=data.effects.map(e=>({type:e.type,params:window.AudioEffects.parameters(e.type,e.params||{}),bypass:!!e.bypass}));
      t.experienceState=data.experienceState&&typeof data.experienceState==='object'?data.experienceState:{};
      t.drumState=data.drumState&&typeof data.drumState==='object'?data.drumState:null;
      t.tools=Array.isArray(data.tools)?[...new Set(data.tools)].filter(id=>Object.hasOwn(CHANNEL_TOOLS,id)&&CHANNEL_TOOLS[id].accepts(t)):[];
      let instrumentFound=false;t.tools=t.tools.filter(id=>{if(CHANNEL_TOOLS[id].role!=='instrument')return true;if(instrumentFound)return false;instrumentFound=true;return true;});syncInstrumentExperience(t);
      commit();restartIfPlaying();status(`Loaded preset on “${t.name}”.`);
    }catch(err){status(`Could not load preset: ${err.message}`);}
  });
  root.querySelector('.daw-region').addEventListener('change', e => {
    const el=e.target, value=Number(el.value)-1;
    if(!Number.isFinite(value)||value<0)return;
    if(el.hasAttribute('data-position')) { if(transport.recording)status('Stop recording before seeking.');else setPlayhead(value);return; }
    const key=el.dataset.loopBound;if(!key)return;
    if((key==='end'&&value<=project.loop.start)||(key==='start'&&value>=project.loop.end)){status('Loop end must be later than loop start.');el.value=project.loop[key]+1;return;}
    project.loop[key]=value;commit();restartIfPlaying();
  });

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
      ? hasInstrumentExperience(t) ? `<select data-tr="instrument" aria-label="${esc(t.name)} instrument">${instrumentOptions(t.instrument)}</select>` : '<button type="button" class="daw-mini" data-tr="tools" aria-label="Add instrument experience">＋</button>'
      : '<span class="daw-tag">Audio</span>';
    const clips = t.clips.map((c) => clipHtml(t, c)).join('');
    const lane = `<div class="daw-lane${sel}${t.mute || !audible(t) ? ' is-silent' : ''}" data-lane="${t.id}" data-kind="${t.kind}" style="--tc:${t.color}">${clips}</div>`;
    if (compactHeads) {
      return `
      <div class="daw-th is-compact${sel}${t.armed ? ' is-armed' : ''}" data-track="${t.id}" style="--tc:${t.color}">
        <span class="daw-th-label" title="${esc(t.name)}">${esc(t.name)}</span>
        <span class="daw-th-sub">${t.kind === 'instrument' ? hasInstrumentExperience(t) ? INSTRUMENTS[t.instrument] : 'No instrument' : '🎙 Audio'}</span>
        <div class="daw-th-row">
          <button type="button" class="daw-mini" data-tr="mute" aria-label="Mute ${esc(t.name)}" aria-pressed="${t.mute}">M</button>
          <button type="button" class="daw-mini" data-tr="solo" aria-label="Solo ${esc(t.name)}" aria-pressed="${t.solo}">S</button>
          <button type="button" class="daw-mini daw-arm" data-tr="arm" aria-label="Arm ${esc(t.name)} for recording" aria-pressed="${t.armed}">●</button>
        </div>
      </div>${lane}`;
    }
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
      ${lane}
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
    root.querySelectorAll('[data-act="record"]').forEach(b => { b.classList.toggle('is-on', transport.recording); b.setAttribute('aria-pressed', String(transport.recording)); b.disabled = finishingTake; });
    root.querySelectorAll('[data-loop-bound]').forEach(el => { if (document.activeElement !== el) el.value = project.loop[el.dataset.loopBound] + 1; });
    const set = (act, on) => root.querySelector(`[data-act="${act}"]`).setAttribute('aria-pressed', String(on));
    set('loop', project.loop.on);
    set('metronome', project.metronome);
    set('countin', project.countIn);
    root.querySelector('[data-act="undo"]').disabled = !history.undo.length;
    root.querySelector('[data-act="redo"]').disabled = !history.redo.length;
    $('tools').querySelectorAll('[data-experience] input, [data-experience] select, [data-experience-config]').forEach(node=>{node.disabled=transport.recording||finishingTake;});
    R.bpm.disabled=transport.recording||finishingTake;R.sig.disabled=transport.recording||finishingTake;
    const position=root.querySelector('[data-position]');if(document.activeElement!==position)position.value=Number((Math.max(0,ui.playhead)+1).toFixed(2));
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
      R.editor.innerHTML = COARSE ? `<div class="daw-editor-empty">
        <strong>Getting started</strong>
        <ol>
          <li>Open <b>🎹 Play</b> and touch the keys or drum pads; press <b>⏺</b> to record what you play. Arm (<b>●</b>) an audio track to record your voice.</li>
          <li>Double-tap an instrument lane (or <b>Add note clip</b> under Track &amp; project tools) and tap notes into the piano roll that opens here.</li>
          <li>Tap a clip to select it, then drag it to move it or drag its edges to trim. Pinch the tracks to zoom; drag along the ruler to set a loop.</li>
          <li><b>Export</b> a WAV mix, stems or MIDI, then share it to Files, AirDrop or GarageBand. <b>⛶</b> fills the screen.</li>
        </ol></div>` : `<div class="daw-editor-empty">
        <strong>Getting started</strong>
        <ol>
          <li>Press <b>●</b> on a track to arm it, then <b>⏺</b> to record from the keyboard, your QWERTY keys, a MIDI keyboard, the <b>🎹 Play</b> tab or a microphone.</li>
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
        <div class="daw-seg" role="group" aria-label="Piano roll tool">
          ${[['draw', '✏️ Draw', 'Tap to add notes, drag to lengthen; drag a note to move it'], ['select', '⬚ Select', 'Tap notes to select them, or drag a box around several'], ['erase', '⌫ Erase', 'Tap or swipe over notes to delete them']]
            .map(([id, label, title]) => `<button type="button" class="daw-btn daw-toggle" data-act="roll-tool" data-tool="${id}" aria-pressed="${ui.rollTool === id}" title="${title}">${label}</button>`).join('')}
        </div>
        <button type="button" class="daw-btn" data-act="select-all" title="Select every note (Ctrl/⌘+A)">All</button>
        <button type="button" class="daw-btn" data-act="delete-notes" title="Delete the selected notes (Delete)">🗑 Notes</button>
      </div></div>
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
      <p class="daw-note">${track.instrument === 'drums' ? 'Each row is one drum. ' : ''}${COARSE
        ? 'Draw: tap to add a note, drag to make it longer · drag a note to move it, its right end to resize · double-tap a note to delete it · two fingers scroll, pinch to zoom.'
        : 'Click to add a note (drag to make it longer) · drag a note to move it, its right edge to resize · right-click or double-click to delete · Shift-click or the Select tool picks several · arrow keys nudge.'}</p>
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
    // Selection box (Select tool)
    if (roll.marquee) {
      const m = roll.marquee;
      const x0 = KEYS_W + Math.min(m.b0, m.b1) * px - sx, x1 = KEYS_W + Math.max(m.b0, m.b1) * px - sx;
      const y0 = Math.min(m.r0, m.r1) * ROW_H - sy, y1 = (Math.max(m.r0, m.r1) + 1) * ROW_H - sy;
      g.fillStyle = 'rgba(56, 189, 248, 0.15)'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
      g.strokeStyle = '#38bdf8'; g.lineWidth = 1; g.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0 - 1, y1 - y0 - 1);
    }
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
    if(!hasInstrumentExperience(track)){status('Add an instrument experience to this channel to hear its notes.');return;}
    const c = ctx(), out = audio.mix.strip(track).input;
    if (track.instrument === 'drums') { drumHit(c, out, pitch, vel, c.currentTime, track); return; }
    startVoice(c, out, track.instrument, pitch, vel, c.currentTime, track).release(c.currentTime + 0.25);
  }

  function rollHit(e) {
    const rect = roll.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const beat = (x - KEYS_W + roll.scroll.scrollLeft) / ui.rollPx;
    const row = clamp(Math.floor((y + roll.scroll.scrollTop) / ROW_H), 0, roll.rows.length - 1);
    const pitch = roll.rows[row];
    const finger = !!e.pointerType && e.pointerType !== 'mouse';
    const edgePx = finger ? 14 : 7;
    let hit = -1, edge = false;
    roll.clip.notes.forEach((n, i) => {
      if (n.pitch === pitch && beat >= n.start && beat <= n.start + n.duration + (finger ? 6 / ui.rollPx : 0)) {
        hit = i;
        edge = (n.start + n.duration - beat) * ui.rollPx < edgePx;
      }
    });
    return { x, beat, row, pitch, hit, edge, onKeys: x < KEYS_W };
  }

  // One finger edits with the current tool (mouse: right-click/Alt erases,
  // Shift selects); two fingers scroll the roll and pinch zooms it.
  function attachRollEvents(scroll) {
    let drag = null, pinch = null, lastTap = null, lastType = 'mouse';
    const pts = new Map();
    scroll.addEventListener('contextmenu', (e) => e.preventDefault());

    function cancelDrag() {
      if (!drag || !roll) { drag = null; return; }
      roll.clip.notes = drag.orig;
      roll.marquee = null;
      ui.selNotes = new Set(drag.sel);
      drag = null;
    }
    function startPinch() {
      const [a, b] = [...pts.values()];
      const rect = roll.canvas.getBoundingClientRect();
      pinch = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, px: ui.rollPx, left: rect.left,
        midY: (a.y + b.y) / 2, top: scroll.scrollTop,
        beat: ((a.x + b.x) / 2 - rect.left - KEYS_W + scroll.scrollLeft) / ui.rollPx,
      };
    }
    function movePinch() {
      const [a, b] = [...pts.values()];
      ui.rollPx = clamp(pinch.px * (Math.hypot(a.x - b.x, a.y - b.y) || 1) / pinch.dist, 16, 320);
      sizeRoll();
      scroll.scrollLeft = pinch.beat * ui.rollPx - ((a.x + b.x) / 2 - pinch.left - KEYS_W);
      scroll.scrollTop = pinch.top - ((a.y + b.y) / 2 - pinch.midY);
      drawRoll();
    }
    function eraseAt(h) {
      if (h.hit < 0) return;
      roll.clip.notes.splice(h.hit, 1);
      ui.selNotes.clear();
      drag.moved = true;
      drawRoll();
    }

    scroll.addEventListener('pointerdown', (e) => {
      if (transport.recording || finishingTake || !roll || e.target !== roll.canvas) return;
      lastType = e.pointerType;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { scroll.setPointerCapture(e.pointerId); } catch (_e) { /* pointer already gone */ }
      if (pts.size === 2) { cancelDrag(); startPinch(); drawRoll(); return; }
      if (pts.size > 2) return;
      const h = rollHit(e);
      const { clip, track } = roll;
      const touch = e.pointerType !== 'mouse';
      scroll.focus({ preventScroll: true });
      if (h.onKeys) { previewNote(track, h.pitch, 0.8); return; }
      const base = { beat: h.beat, pitch: h.pitch, orig: clip.notes.map((x) => ({ ...x })), sel: [...ui.selNotes], moved: false, x0: e.clientX };
      if (e.button === 2 || e.altKey || ui.rollTool === 'erase') {
        drag = { ...base, mode: 'erase' };
        eraseAt(h);
        return;
      }
      if (e.button !== 0) return;
      if (h.hit >= 0) {
        // Double-tap a note to delete it (iOS doesn't send dblclick reliably).
        if (touch && lastTap && lastTap.note === h.hit && e.timeStamp - lastTap.t < DOUBLE_TAP_MS) {
          lastTap = null;
          clip.notes.splice(h.hit, 1);
          ui.selNotes.clear();
          commitKeepRoll();
          return;
        }
        lastTap = touch ? { note: h.hit, t: e.timeStamp } : null;
        if ((e.shiftKey || ui.rollTool === 'select') && !h.edge) {
          // Select tool: a tap toggles the note; a drag moves the whole selection.
          const was = ui.selNotes.has(h.hit);
          ui.selNotes.add(h.hit);
          drag = { ...base, mode: 'move', note: h.hit, toggleOff: was };
          drawRoll();
          return;
        }
        if (!ui.selNotes.has(h.hit)) { ui.selNotes.clear(); ui.selNotes.add(h.hit); }
        const n = clip.notes[h.hit];
        drag = { ...base, mode: h.edge ? 'resize' : 'move', note: h.hit };
        if (!h.edge) previewNote(track, n.pitch, n.velocity);
      } else if (ui.rollTool === 'select' || e.shiftKey) {
        drag = { ...base, mode: 'marquee', add: e.shiftKey };
        roll.marquee = { b0: h.beat, b1: h.beat, r0: h.row, r1: h.row };
      } else {
        lastTap = null;
        const start = floorTo(Math.max(0, h.beat), ui.rollGrid);
        clip.notes.push({ pitch: h.pitch, start, duration: ui.noteLen, velocity: 0.8 });
        ui.selNotes.clear();
        ui.selNotes.add(clip.notes.length - 1);
        drag = { ...base, mode: 'draw', beat: start, note: clip.notes.length - 1, moved: true };
        previewNote(track, h.pitch, 0.8);
      }
      drawRoll();
    });

    scroll.addEventListener('pointermove', (e) => {
      if (!roll) return;
      const p = pts.get(e.pointerId);
      if (p) { p.x = e.clientX; p.y = e.clientY; }
      if (pinch) { if (pts.size >= 2) movePinch(); return; }
      if (!drag) return;
      const h = rollHit(e), clip = roll.clip, grid = ui.rollGrid;
      if (drag.mode === 'erase') { eraseAt(h); return; }
      if (drag.mode === 'marquee') { roll.marquee.b1 = h.beat; roll.marquee.r1 = h.row; drawRoll(); return; }
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
          const pitch = roll.rows[r];
          if (clip.notes[i].pitch !== pitch && i === drag.note) pitchChanged = true;
          clip.notes[i].pitch = pitch;
          clip.notes[i].start = Math.max(0, o.start + dBeat);
        });
        if (pitchChanged) previewNote(roll.track, clip.notes[drag.note].pitch, clip.notes[drag.note].velocity);
      }
      drawRoll();
    });

    const end = (e) => {
      pts.delete(e.pointerId);
      if (pinch) { if (!pts.size) pinch = null; return; }
      if (!drag || !roll) { drag = null; return; }
      const clip = roll.clip, d = drag;
      drag = null;
      if (d.mode === 'marquee') {
        const m = roll.marquee;
        roll.marquee = null;
        const b0 = Math.min(m.b0, m.b1), b1 = Math.max(m.b0, m.b1), r0 = Math.min(m.r0, m.r1), r1 = Math.max(m.r0, m.r1);
        if (!d.add) ui.selNotes.clear();
        if (b1 - b0 > 1e-6) {
          clip.notes.forEach((n, i) => {
            const r = roll.rows.indexOf(n.pitch);
            if (r >= r0 && r <= r1 && n.start < b1 && n.start + n.duration > b0) ui.selNotes.add(i);
          });
        }
        syncVelocity(clip);
        drawRoll();
        return;
      }
      if (!d.moved) {
        if (d.toggleOff) ui.selNotes.delete(d.note);
        syncVelocity(clip);
        drawRoll();
        return;
      }
      // Drawing past the end of a clip makes the clip longer.
      const last = clip.notes.length ? Math.max(...clip.notes.map((n) => n.start + n.duration)) : 0;
      if (last > clip.length) clip.length = Math.ceil(last / barBeats() - 1e-9) * barBeats();
      sortNotes(clip);
      commitKeepRoll();
    };
    scroll.addEventListener('pointerup', end);
    scroll.addEventListener('pointercancel', end);
    scroll.addEventListener('dblclick', (e) => {
      if (!roll || lastType !== 'mouse') return;
      const h = rollHit(e);
      if (h.hit >= 0 && !h.onKeys) { roll.clip.notes.splice(h.hit, 1); ui.selNotes.clear(); commitKeepRoll(); }
    });
  }

  // The velocity slider shows the selected notes' average.
  function syncVelocity(clip) {
    const v = R.editor.querySelector('[data-ed="velocity"]');
    if (v) v.value = selectedVelocity(clip);
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

  // Touch rules: a swipe always scrolls the tracks. Tap a clip to select it;
  // only a selected clip drags (CSS gives it touch-action: none). Taps on a lane
  // move the playhead, and a double-tap adds a clip there.
  let clipDrag = null, laneTap = null, lastLaneTap = null, lastTlType = 'mouse';
  R.tracks.addEventListener('pointerdown', (e) => {
    if (transport.recording || finishingTake) return;
    const ruler = e.target.closest('[data-ruler]');
    if (ruler) { startRulerDrag(e); return; }
    if (pinchTl) return;
    const clipEl = e.target.closest('.daw-clip');
    const lane = e.target.closest('.daw-lane[data-lane]');
    const touch = e.pointerType !== 'mouse';
    lastTlType = e.pointerType;
    if (clipEl) {
      if (e.button !== 0) return;
      const found = findClip(clipEl.dataset.clip);
      if (!found) return;
      const changed = ui.selClip !== found.clip.id;
      select(found.track.id, found.clip.id);
      markTrack(found.track.id);
      if (changed && ui.tab !== 'play') setTab('edit');
      if (touch && changed) { renderEditor(); return; }
      clipEl.setPointerCapture(e.pointerId);
      clipDrag = {
        el: clipEl, found, origTrack: found.track, mode: e.target.dataset.handle || 'move', x: e.clientX, y: e.clientY,
        orig: JSON.parse(JSON.stringify(found.clip)), moved: false, changed,
      };
      e.preventDefault();
      return;
    }
    if (lane && e.button === 0) {
      if (touch) { laneTap = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, lane: lane.dataset.lane }; return; }
      laneClick(lane, e.clientX);
    }
  });

  function laneClick(lane, clientX) {
    ui.selClip = null;
    ui.selNotes.clear();
    setPlayhead(snapTo(Math.max(0, beatFromClientX(clientX)), snapGrid()));
    markTrack(lane.dataset.lane);
    renderEditor();
  }

  R.tracks.addEventListener('pointerup', (e) => {
    const tap = laneTap;
    laneTap = null;
    if (!tap || tap.id !== e.pointerId || Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 12) return;
    const lane = R.tracks.querySelector(`.daw-lane[data-lane="${tap.lane}"]`);
    if (!lane) return;
    const prev = lastLaneTap;
    if (prev && prev.lane === tap.lane && e.timeStamp - prev.t < DOUBLE_TAP_MS && Math.abs(e.clientX - prev.x) < 30) {
      lastLaneTap = null;
      addClipAt(lane, e.clientX);
      return;
    }
    lastLaneTap = { lane: tap.lane, t: e.timeStamp, x: e.clientX };
    laneClick(lane, e.clientX);
  });
  R.tracks.addEventListener('pointercancel', (e) => { if (laneTap && laneTap.id === e.pointerId) laneTap = null; });

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
        moveClipToTrack(d, findTrack(under.dataset.lane), under);
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

  function moveClipToTrack(d, target, laneEl) {
    const clip = d.found.clip;
    d.found.track.clips = d.found.track.clips.filter((c) => c !== clip);
    target.clips.push(clip);
    d.found = { track: target, clip };
    ui.selTrack = target.id;
    if (laneEl) laneEl.appendChild(d.el);
  }

  // A cancelled drag (a second finger landed, or the OS took the touch) puts the clip back.
  function cancelClipDrag() {
    const d = clipDrag;
    clipDrag = null;
    if (!d || !d.moved) return;
    if (d.found.track !== d.origTrack) moveClipToTrack(d, d.origTrack, R.tracks.querySelector(`.daw-lane[data-lane="${d.origTrack.id}"]`));
    Object.assign(d.found.clip, JSON.parse(JSON.stringify(d.orig)));
    d.el.style.left = d.found.clip.start * ui.pxPerBeat + 'px';
    d.el.style.width = Math.max(6, clipBeats(d.found.clip) * ui.pxPerBeat) + 'px';
  }

  function endClipDrag(e) {
    if (!clipDrag) return;
    if (e && e.type === 'pointercancel') { cancelClipDrag(); return; }
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

  function addClipAt(lane, clientX) {
    const track = findTrack(lane.dataset.lane);
    if (!track) return;
    if (track.kind === 'audio') { status('Audio tracks hold recordings: arm the track and press ⏺, or import an audio file.'); return; }
    const start = floorTo(Math.max(0, beatFromClientX(clientX)), barBeats());
    const clip = newMidiClip(track, start, track.instrument === 'drums' ? barBeats() : barBeats() * 2);
    select(track.id, clip.id);
    ui.tab = 'edit';
    commit();
    status(COARSE ? 'Clip added. Tap the piano roll below to add notes.' : 'Clip added. Click the piano roll below to add notes.');
    if (roll) roll.scroll.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  R.tracks.addEventListener('dblclick', (e) => {
    if (lastTlType !== 'mouse') return;   // touch/pen double-taps are handled on pointerup
    const lane = e.target.closest('.daw-lane[data-lane]');
    if (!lane || e.target.closest('.daw-clip')) {
      if (e.target.closest('.daw-clip') && roll) { setTab('edit'); roll.scroll.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      return;
    }
    addClipAt(lane, e.clientX);
  });

  // Pinch the tracks to zoom (anchored between the fingers); two-finger drag scrolls.
  let pinchTl = null, pinchFrame = 0;
  R.scroll.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 2) return;
    cancelClipDrag();
    laneTap = null;
    const [a, b] = e.touches, rect = R.scroll.getBoundingClientRect();
    const midX = (a.clientX + b.clientX) / 2 - rect.left - HEAD_W;
    pinchTl = {
      dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1, ppb: ui.pxPerBeat,
      beat: (R.scroll.scrollLeft + midX) / ui.pxPerBeat, top: R.scroll.scrollTop,
      midY: (a.clientY + b.clientY) / 2, left: rect.left,
    };
  }, { passive: true });
  R.scroll.addEventListener('touchmove', (e) => {
    if (!pinchTl || e.touches.length !== 2) return;
    e.preventDefault();
    const [a, b] = e.touches;
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
    const midX = (a.clientX + b.clientX) / 2 - pinchTl.left - HEAD_W, midY = (a.clientY + b.clientY) / 2;
    cancelAnimationFrame(pinchFrame);
    pinchFrame = requestAnimationFrame(() => {
      ui.pxPerBeat = clamp(pinchTl.ppb * dist / pinchTl.dist, 4, 200);
      relayoutTimeline();
      R.scroll.scrollLeft = pinchTl.beat * ui.pxPerBeat - midX;
      R.scroll.scrollTop = pinchTl.top - (midY - pinchTl.midY);
      drawRuler();
    });
  }, { passive: false });
  const endPinch = (e) => {
    if (!pinchTl || e.touches.length >= 2) return;
    pinchTl = null;
    renderTracks();   // redraw clip contents at the new zoom
  };
  R.scroll.addEventListener('touchend', endPinch);
  R.scroll.addEventListener('touchcancel', endPinch);
  // Safari's own pinch gesture would zoom the whole page instead.
  ['gesturestart', 'gesturechange'].forEach((type) => R.scroll.addEventListener(type, (e) => e.preventDefault()));

  function startRulerDrag(e) {
    if (transport.recording) { status('Finish the take before seeking or changing the loop.'); return; }
    const priorLoop = { ...project.loop };
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
    const up = (event) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (event?.type === 'pointercancel') { project.loop = priorLoop; renderTracks(); return; }
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
    window.addEventListener('pointercancel', up);
  }

  // Selects a track by toggling classes, so a header input being clicked survives.
  function markTrack(id) {
    ui.selTrack = id;
    effectsTrack = id;
    renderDock();
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
    if (what === 'tools') {ui.selTrack=track.id;setTab('tools');return;}
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
    if (el.dataset.tr === 'instrument') { if (transport.recording || finishingTake) { renderTracks(); return; } silenceLive(); track.instrument = el.value; syncInstrumentExperience(track); }
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
    if ((transport.recording || finishingTake) && !['play','stop','record','studio','metronome','zoom-in','zoom-out'].includes(act)) { status('Finish the take before editing the arrangement.'); return; }
    switch (act) {
      case 'channel-tools': setTab('tools'); break;
      case 'home': if (!transport.recording) setPlayhead(0); break;
      case 'play': togglePlay(); break;
      case 'stop': stop(); break;
      case 'record': record(); break;
      case 'studio': toggleStudio(); break;
      case 'roll-tool':
        ui.rollTool = btn.dataset.tool;
        root.querySelectorAll('[data-act="roll-tool"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === ui.rollTool)));
        break;
      case 'select-all':
        if (roll) { ui.selNotes = new Set(roll.clip.notes.map((_, i) => i)); syncVelocity(roll.clip); drawRoll(); }
        break;
      case 'delete-notes':
        if (roll && ui.selNotes.size) {
          roll.clip.notes = roll.clip.notes.filter((_, i) => !ui.selNotes.has(i));
          ui.selNotes.clear();
          commitKeepRoll();
        } else status('Select notes first (Select tool, or All).');
        break;
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
        select(track.id, clip.id); ui.tab = 'edit'; commit();
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
    if (transport.recording || finishingTake) { R.bpm.value=project.bpm;status('Finish the take before changing tempo.');return; }
    const v = clamp(Math.round(Number(R.bpm.value) || project.bpm), 40, 240);
    if (v === project.bpm) { R.bpm.value = v; return; }
    const pos = transport.playing ? beatAt(audio.ctx.currentTime) : null;
    project.bpm = v;
    commit();
    if (pos !== null && !transport.recording) play(Math.max(0, pos));
  });
  R.sig.addEventListener('change', () => {
    if (transport.recording || finishingTake) { R.sig.value=project.sig.join('/');status('Finish the take before changing meter.');return; }
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
    if (transport.recording || finishingTake) return;
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
  // Rotating an iPhone/iPad, or resizing a window, can switch the header layout.
  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      const wasCompact = compactHeads;
      measureLayout();
      if (wasCompact !== compactHeads) renderTracks(); else drawRuler();
      if (ui.tab === 'play') renderPlay();
      drawRoll();
    });
  });

  // ── Full-screen studio ───────────────────────────────────────────────────
  // CSS pins the studio over the page (works on iPhone, which has no element
  // fullscreen); where the Fullscreen API exists (iPad, desktop) it also hides
  // the browser's toolbars.
  const pillar = root.closest('.pillar-daw') || root;
  let realFullscreen = false;
  function studioOn() { return pillar.classList.contains('is-studio'); }
  function toggleStudio() {
    const on = !studioOn();
    if (on) { root.querySelector('.daw-region').open=false;fileTools.open=false; }
    pillar.classList.toggle('is-studio', on);
    document.documentElement.classList.toggle('daw-studio-open', on);
    root.querySelector('[data-act="studio"]').setAttribute('aria-pressed', String(on));
    root.querySelector('[data-act="studio"]').setAttribute('aria-label', on ? 'Leave full-screen studio' : 'Full-screen studio');
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (on && !fsEl) {
      const req = pillar.requestFullscreen || pillar.webkitRequestFullscreen;
      if (req) {
        try {
          const p = req.call(pillar);
          realFullscreen = true;
          if (p && p.catch) p.catch(() => { realFullscreen = false; });
        } catch (_e) { realFullscreen = false; }
      }
    } else if (!on && fsEl && realFullscreen) {
      realFullscreen = false;
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) { try { const p = exit.call(document); if (p && p.catch) p.catch(() => {}); } catch (_e) { /* already out */ } }
    }
    if (!on) pillar.scrollIntoView({ block: 'start' });
    requestAnimationFrame(() => { renderTracks(); renderDock(); drawRoll(); });
  }
  ['fullscreenchange', 'webkitfullscreenchange'].forEach((type) => document.addEventListener(type, () => {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsEl && realFullscreen) { realFullscreen = false; if (studioOn()) toggleStudio(); }
  }));

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
    if (e.key === 'Escape') {
      if (root.querySelector('.daw-menu:not([hidden])')) closeMenus();
      else if (studioOn()) toggleStudio();
      return;
    }
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
  const stripData = new Float32Array(512);
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
      if (ui.tab === 'mix') {
        R.mixer.querySelectorAll('[data-strip-meter]').forEach((el) => {
          const id = el.dataset.stripMeter;
          let level = peak;
          if (id !== 'master') {
            const s = audio.mix.strips.get(id);
            level = 0;
            if (s && s.meter) {
              s.meter.getFloatTimeDomainData(stripData);
              for (let i = 0; i < stripData.length; i++) level = Math.max(level, Math.abs(stripData[i]));
            }
          }
          el.style.transform = `scaleX(${Math.min(1, level)})`;
          el.classList.toggle('is-hot', level > 0.98);
        });
      }
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
    if (transport.recording || finishingTake) { status('Finish the take before adding a drum pattern.'); return; }
    let track = findTrack(ui.selTrack);
    if (!track || track.instrument !== 'drums') track = project.tracks.find((t) => t.instrument === 'drums');
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

  window.addEventListener('blur', () => { silenceLive(); if (transport.recording) pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { silenceLive(); if (transport.playing) pause(); } });

  window.MusicDaw = { noteOn, noteOff, drumPad, addDrumPattern, allNotesOff(){stopExperiences();silenceLive();}, keyboardBase(){const t=armedTrack();return (Number(t?.experienceState?.keyboard?.octave??4)+1)*12;} };

  // iOS only lets audio start inside a touch, so wake (or create) the shared
  // context on the first touch in the studio, before any button handler runs.
  root.addEventListener('pointerdown', () => {
    if (!audio.ctx || audio.ctx.state !== 'running') ctx();
  }, { capture: true });

  // ── Boot ─────────────────────────────────────────────────────────────────
  (async () => {
    let restored = false;
    try { restored = await loadAutosave(); } catch (_e) { restored = false; }
    history.last = snapshot();
    render();
    status(restored ? `Welcome back — “${project.name}” was restored from this browser.` : 'Track Studio: choose a channel, add an instrument experience, arm ●, then record ⏺. Audio channels use microphone or imported files.');
    requestAnimationFrame(frame);
  })();
})();
