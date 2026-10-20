/* Music Lab project schema and migrations. Keep this module DOM-free so saved
 * projects can be validated in Node tests and by future companion applications. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MusicDawProject = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const VERSION = 3;
  const COLORS = ['#f2994a', '#56ccf2', '#6fcf97', '#bb6bd9', '#f2c94c', '#ff7a8a', '#2dd4bf', '#a3e635'];
  const clone = value => JSON.parse(JSON.stringify(value));
  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, min, max, fallback) => Math.max(min, Math.min(max, finite(value, fallback)));
  const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

  function id() { return Math.random().toString(36).slice(2, 10); }

  // The channel strip's analog-style front end: preamp trim (dB), polarity flip,
  // 80 Hz low-cut, then a 3-band EQ (shelves ±15 dB, sweepable mid) before inserts.
  const STRIP_LIMITS = { trim: [-20, 20], lo: [-15, 15], mid: [-15, 15], midF: [200, 5000], hi: [-15, 15] };
  function makeStrip() { return { trim: 0, phase: false, hpf: false, eqOn: true, lo: 0, mid: 0, midF: 1000, hi: 0 }; }
  function normalizeStrip(value) {
    const v = object(value), base = makeStrip();
    for (const key of Object.keys(STRIP_LIMITS)) base[key] = clamp(v[key], STRIP_LIMITS[key][0], STRIP_LIMITS[key][1], base[key]);
    base.phase = !!v.phase; base.hpf = !!v.hpf; base.eqOn = v.eqOn !== false;
    return base;
  }

  function makeTrack(kind = 'instrument', name, instrument = 'piano', colorIndex = 0) {
    const audio = kind === 'audio';
    return {
      id: id(), kind: audio ? 'audio' : 'instrument',
      name: String(name || (audio ? 'Audio' : 'Keys')).slice(0, 40),
      instrument: audio ? null : instrument,
      color: COLORS[colorIndex % COLORS.length], volume: 0.8, pan: 0,
      mute: false, solo: false, armed: false, clips: [], effects: [], strip: makeStrip(),
      tools: [], experienceState: {}, pluginChain: [], freezeState: null,
    };
  }

  function create() {
    return {
      version: VERSION, name: 'My Song', bpm: 100, sig: [4, 4], masterVolume: 0.85,
      metronome: false, countIn: true, loop: { on: false, start: 0, end: 16 },
      audioSettings: { preferredSampleRate: 'device', latencyMode: 'balanced', inputLatencyMs: null, recordingTrimMs: 0, inputChannel: 'mono1' },
      pluginInstances: [], diagnosticsVersion: 1,
      tracks: [makeTrack('instrument', 'Keys', 'piano', 0), makeTrack('instrument', 'Drums', 'drums', 1), makeTrack('audio', 'Vocals', null, 2)],
    };
  }

  function normalizeEffect(effect) {
    const value = object(effect);
    return { type: String(value.type || ''), params: object(value.params), bypass: !!value.bypass, wet: clamp(value.wet, 0, 1, 1) };
  }

  function normalizeExternalPlugin(plugin) {
    const value = object(plugin), format = value.format === 'native' ? 'native' : value.format === 'wam' ? 'wam' : '';
    if (!format) return null;
    return {
      id: String(value.id || id()).slice(0, 80), format,
      pluginId: String(value.pluginId || '').slice(0, 160),
      name: String(value.name || value.pluginId || 'Plugin').slice(0, 100),
      vendor: String(value.vendor || '').slice(0, 100),
      state: clone(object(value.state)),
      latencySamples: Math.max(0, finite(value.latencySamples, 0)),
      compatibility: String(value.compatibility || (format === 'native' ? 'launcher-only' : 'unknown')).slice(0, 40),
    };
  }

  function normalizeTrack(track, index) {
    const source = object(track);
    const kind = source.kind === 'audio' ? 'audio' : 'instrument';
    const next = makeTrack(kind, source.name, source.instrument, index);
    next.id = String(source.id || next.id);
    next.color = typeof source.color === 'string' ? source.color : next.color;
    next.volume = clamp(source.volume, 0, 1.2, 0.8);
    next.pan = clamp(source.pan, -1, 1, 0);
    next.mute = !!source.mute; next.solo = !!source.solo; next.armed = false;
    next.strip = normalizeStrip(source.strip);
    next.clips = Array.isArray(source.clips) ? clone(source.clips) : [];
    next.effects = Array.isArray(source.effects) ? source.effects.map(normalizeEffect).filter(e => e.type) : [];
    next.tools = Array.isArray(source.tools) ? [...new Set(source.tools.map(String))] : [];
    next.experienceState = clone(object(source.experienceState));
    if (source.drumState && typeof source.drumState === 'object') next.drumState = clone(source.drumState);
    const externalPlugins = Array.isArray(source.pluginChain) ? source.pluginChain.map(normalizeExternalPlugin).filter(Boolean) : [];
    next.pluginChain = externalPlugins.concat(next.effects.map((effect, effectIndex) => ({
      id: `insert-${effectIndex}`, format: effect.type.startsWith('browser-') ? 'browser' : 'builtin', pluginId: effect.type,
      state: { params: clone(effect.params), bypass: effect.bypass, wet: effect.wet },
    })));
    next.freezeState = source.freezeState && typeof source.freezeState === 'object' ? clone(source.freezeState) : null;
    return next;
  }

  function migrate(input) {
    if (!input || typeof input !== 'object' || !Array.isArray(input.tracks)) throw new Error('project.json is not a Music Lab song');
    if (finite(input.version, 1) > VERSION) throw new Error(`This project needs a newer Music Lab (project version ${input.version}).`);
    const base = create();
    const source = clone(input);
    base.name = String(source.name || base.name).slice(0, 60);
    base.bpm = clamp(source.bpm, 40, 240, base.bpm);
    base.sig = Array.isArray(source.sig) && source.sig.length === 2 ? [finite(source.sig[0], 4), finite(source.sig[1], 4)] : base.sig;
    base.masterVolume = clamp(source.masterVolume, 0, 1.2, base.masterVolume);
    base.metronome = !!source.metronome; base.countIn = source.countIn !== false;
    base.loop = { ...base.loop, ...object(source.loop), on: !!source.loop?.on };
    base.audioSettings = { ...base.audioSettings, ...object(source.audioSettings) };
    base.audioSettings.recordingTrimMs = clamp(base.audioSettings.recordingTrimMs, -250, 250, 0);
    if (!['mono1', 'mono2', 'stereo'].includes(base.audioSettings.inputChannel)) base.audioSettings.inputChannel = 'mono1';
    base.pluginInstances = Array.isArray(source.pluginInstances) ? clone(source.pluginInstances) : [];
    base.diagnosticsVersion = Math.max(1, finite(source.diagnosticsVersion, 1));
    base.tracks = source.tracks.map(normalizeTrack);
    const known = new Set(base.pluginInstances.map(instance => instance?.id).filter(Boolean));
    base.tracks.flatMap(track => track.pluginChain).filter(plugin => plugin.format === 'native').forEach(plugin => {
      if (!known.has(plugin.id)) { base.pluginInstances.push(clone(plugin)); known.add(plugin.id); }
    });
    base.version = VERSION;
    return base;
  }

  function parse(json) { return migrate(JSON.parse(json)); }
  function stringify(project) { return JSON.stringify(migrate(project)); }

  return { VERSION, COLORS, STRIP_LIMITS, create, makeTrack, makeStrip, normalizeStrip, migrate, parse, stringify };
}));
