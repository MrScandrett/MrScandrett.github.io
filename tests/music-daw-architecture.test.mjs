import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Project = require('../assets/js/music-daw-project.js');
const Core = require('../assets/js/music-daw-core.js');
const Audio = require('../assets/js/music-daw-audio.js');
const Render = require('../assets/js/music-daw-render.js');
const Plugins = require('../assets/js/music-daw-plugins.js');
const Diagnostics = require('../assets/js/music-daw-diagnostics.js');
const VstBridge = require('../assets/js/music-vst-bridge.js');

test('legacy projects migrate to the current schema without losing musical data', () => {
  const legacy = { version: 1, name: 'Old song', bpm: 92, sig: [3, 4], tracks: [{
    id: 'keys', kind: 'instrument', name: 'Keys', instrument: 'piano', armed: true,
    clips: [{ id: 'clip', type: 'midi', start: 0, length: 4, notes: [{ pitch: 60, start: 0, duration: 1, velocity: .8 }] }],
    effects: [{ type: 'eq', params: { frequency: 800 }, bypass: false }],
  }] };
  const project = Project.migrate(legacy);
  assert.equal(project.version, 3);
  assert.equal(project.name, 'Old song');
  assert.equal(project.bpm, 92);
  assert.deepEqual(project.sig, [3, 4]);
  assert.equal(project.tracks[0].clips[0].notes[0].pitch, 60);
  assert.equal(project.tracks[0].armed, false, 'restored projects never arm hardware automatically');
  assert.equal(project.tracks[0].pluginChain[0].pluginId, 'eq');
  assert.deepEqual(project.audioSettings, { preferredSampleRate: 'device', latencyMode: 'balanced', inputLatencyMs: null });
  assert.deepEqual(project.pluginInstances, []);
});

test('core timing handles MIDI and audio clips in one arrangement', () => {
  const project = Project.create();
  project.bpm = 120;
  project.tracks[0].clips = [{ type: 'midi', start: 1, length: 4 }];
  project.tracks[1].clips = [{ type: 'audio', start: 2, duration: 3 }];
  assert.equal(Core.secondsPerBeat(project), .5);
  assert.equal(Core.clipBeats(project, project.tracks[1].clips[0]), 6);
  assert.equal(Core.songEnd(project), 8);
  project.tracks[0].solo = true;
  assert.equal(Core.audible(project, project.tracks[0]), true);
  assert.equal(Core.audible(project, project.tracks[1]), false);
});

test('project migration rejects unsupported future versions and does not mutate input', () => {
  const source = Project.create();
  const migrated = Project.migrate(source);
  migrated.tracks[0].name = 'Changed';
  assert.equal(source.tracks[0].name, 'Keys');
  assert.throws(() => Project.migrate({ version: 99, tracks: [] }), /newer Music Lab/);
});

test('plugin adapter builds ordered chains, skips bypassed inserts and reports missing plugins', () => {
  const links = [];
  const node = name => ({ name, connect(target) { links.push([name, target.name]); } });
  const registry = {
    eq: { create() { return { input: node('eq-in'), output: node('eq-out'), dispose() {} }; } },
    compressor: { create() { return { input: node('comp-in'), output: node('comp-out'), dispose() {} }; } },
  };
  const chain = Plugins.createChain({}, node('source'), [
    { type: 'eq' }, { type: 'delay', bypass: true }, { type: 'unknown' }, { type: 'compressor' },
  ], registry, (_type, params) => params || {});
  assert.deepEqual(links, [['source', 'eq-in'], ['eq-out', 'comp-in']]);
  assert.equal(chain.output.name, 'comp-out');
  assert.deepEqual(chain.missing, ['unknown']);
});

test('plugin adapter isolates processor failures and supports rack wet/dry mixing', () => {
  const links = [];
  const node = name => ({ name, gain: { value: 0 }, connect(target) { links.push([name, target.name]); }, disconnect() {} });
  const context = { createGain: () => node(`gain-${links.length}`) };
  const chain = Plugins.createChain(context, node('source'), [
    { type: 'broken' }, { type: 'color', wet: .25 },
  ], {
    broken: { create() { throw new Error('processor unavailable'); } },
    color: { create() { return { input: node('color-in'), output: node('color-out'), dispose() {} }; } },
  });
  assert.deepEqual(chain.failed, [{ type: 'broken', message: 'processor unavailable' }]);
  assert.equal(chain.instances.length, 1);
  assert.notEqual(chain.output.name, 'color-out', 'partial wet mix returns the parallel output node');
});

test('WAM 2 loader allows local modules and follows constructor lifecycle', async () => {
  let destroyed = false;
  const audioNode = { getState: () => ({ drive: .4 }), setState() {}, disconnect() {} };
  const Constructor = {
    isWebAudioModuleConstructor: true,
    async createInstance(groupId, context, state) {
      assert.equal(groupId, 'music-lab'); assert.equal(context.sampleRate, 48000); assert.equal(state.drive, .4);
      return { audioNode, destroy() { destroyed = true; } };
    },
  };
  const instance = await Plugins.loadWam({ sampleRate: 48000 }, '/plugins/color/index.js', { drive: .4 }, {
    baseUrl: 'https://classroom.test/music-lab.html', groupId: 'music-lab', importModule: async () => ({ default: Constructor }),
  });
  assert.deepEqual(instance.getState(), { drive: .4 });
  instance.dispose(); assert.equal(destroyed, true);
  assert.throws(() => Plugins.localModuleUrl('https://outside.test/plugin.js', 'https://classroom.test/'), /locally hosted/);
});

test('browser plugin state is persisted once in the canonical plugin chain', () => {
  const project = Project.create();
  project.tracks[0].effects.push({ type: 'browser-tape-color', params: { drive: 42 }, bypass: false, wet: .6 });
  const restored = Project.parse(Project.stringify(project));
  const entries = restored.tracks[0].pluginChain.filter(plugin => plugin.pluginId === 'browser-tape-color');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].format, 'browser');
  assert.deepEqual(entries[0].state, { params: { drive: 42 }, bypass: false, wet: .6 });
});

test('VST companion client is loopback-only and keeps paths behind catalog IDs', async () => {
  assert.equal(VstBridge.endpoint(), 'http://127.0.0.1:4777');
  assert.throws(() => VstBridge.endpoint('https://plugins.example.com'), /loopback/);
  const calls = [];
  const client = VstBridge.createClient({ token: 'pair-me', fetch: async (url, init) => {
    calls.push({ url, init });
    return { ok: true, json: async () => url.endsWith('/plugins') ? { plugins: [{ id: 'abc', name: 'Synth' }] } : { launched: true } };
  } });
  assert.equal((await client.plugins()).plugins[0].name, 'Synth');
  await client.launch('abc/../unsafe');
  assert.match(calls[1].url, /abc%2F..%2Funsafe\/launch$/);
  assert.equal(calls[1].init.headers.Authorization, 'Bearer pair-me');
});

test('native VST assignments survive project migration with compatibility state', () => {
  const project = Project.create();
  project.tracks[0].pluginChain.push({
    id: 'native-1', format: 'native', pluginId: 'catalog-abc', name: 'Local Synth', vendor: 'User',
    state: { bypass: false, wet: .8, parameters: { cutoff: .4 } }, latencySamples: 128, compatibility: 'launcher-only',
  });
  const restored = Project.parse(Project.stringify(project));
  const plugin = restored.tracks[0].pluginChain.find(item => item.id === 'native-1');
  assert.equal(plugin.pluginId, 'catalog-abc');
  assert.equal(plugin.latencySamples, 128);
  assert.deepEqual(plugin.state.parameters, { cutoff: .4 });
  assert.equal(restored.pluginInstances.some(item => item.id === 'native-1'), true);
});

test('audio facts and diagnostics expose bounded, copy-safe data', () => {
  assert.equal(Audio.latencySeconds({ baseLatency: .01, outputLatency: .02 }), .03);
  assert.deepEqual(Audio.facts({ sampleRate: 48000, state: 'running', baseLatency: .01 }), {
    sampleRate: 48000, state: 'running', baseLatency: .01, outputLatency: null,
  });
  const log = Diagnostics.create(2);
  log.record('one'); log.record('two', 'warning', { rate: 48000 }); log.record('three');
  const events = log.list();
  assert.deepEqual(events.map(event => event.code), ['two', 'three']);
  events[0].details.rate = 1;
  assert.equal(log.list()[0].details.rate, 48000);
});

test('audio preflight separates readiness from optional capabilities', async () => {
  const navigator = { mediaDevices: { getUserMedia() {} }, requestMIDIAccess() {}, permissions: { query: async () => ({ state: 'prompt' }) } };
  const waiting = await Diagnostics.preflight({ navigator, webAudio: true, audioWorklet: true, secureContext: true });
  assert.equal(waiting.level, 'notice');
  assert.match(waiting.summary, /Play or Record/);
  const ready = await Diagnostics.preflight({ navigator, context: { state: 'running', sampleRate: 48000, baseLatency: .01, outputLatency: .02 }, webAudio: true, audioWorklet: true, secureContext: true });
  assert.equal(ready.level, 'ready');
  assert.equal(ready.items.find(item => item.label === 'Output rate').value, '48,000 Hz');
  assert.equal(ready.items.find(item => item.label === 'Output latency').value, '30 ms reported');
  const stopped = await Diagnostics.preflight({ navigator: {}, webAudio: false, secureContext: true });
  assert.equal(stopped.level, 'stopped');
});

test('sample-rate diagnostics distinguish conversion from damaged capture', async () => {
  const conversion = Diagnostics.sampleRateIssues({ outputRate: 48000, inputRate: 44100, sourceRates: [44100, 44100, 48000] });
  assert.deepEqual(conversion.map(issue => issue.severity), ['notice', 'notice']);
  assert.match(conversion[0].message, /44,100 Hz audio.*48,000 Hz session/);
  const damaged = Diagnostics.sampleRateIssues({ outputRate: 48000, captureDroppedFrames: 256, deviceChanged: true });
  assert.deepEqual(damaged.map(issue => issue.severity), ['warning', 'warning']);
  assert.match(damaged[0].action, /record it again/);
  const result = await Diagnostics.preflight({ navigator: {}, context: { state: 'running', sampleRate: 48000 }, webAudio: true, sourceRates: [44100] });
  assert.equal(result.level, 'notice');
  assert.equal(result.label, 'Rate notice');
});

test('offline trim preserves music and a short effect tail', () => {
  const channels = [new Float32Array(1000), new Float32Array(1000)];
  channels[0][650] = .1;
  const buffer = { sampleRate: 100, length: 1000, numberOfChannels: 2, getChannelData: index => channels[index] };
  const trimmed = Render.trimTail(buffer, 5, .001, .05);
  assert.equal(trimmed[0].length, 655);
  assert.equal(trimmed[1].length, 655);
});
