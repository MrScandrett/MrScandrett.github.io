import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('../assets/js/music-notation.js');
const source = readFileSync(new URL('../assets/js/score-engine.js', import.meta.url), 'utf8');

function fixture(score, prepare) {
  const calls = [], killed = [];
  let context;
  class AudioContext {
    constructor() { this.currentTime = 0; context = this; }
    createGain() { return { gain: { value: 1 }, connect() {} }; }
    createDynamicsCompressor() { return { threshold: {}, ratio: {}, connect() {} }; }
  }
  const root = vm.createContext({
    MusicNotation: globalThis.MusicNotation, AudioContext,
    MusicSynth: { prepare, startVoice(c, out, instrument, midi, velocity, time, ended) {
      const voice = { instrument, midi, time, release(at) { this.releaseAt = at; }, kill(at) { killed.push(this); ended(this); } };
      calls.push(voice); return voice;
    } },
    setInterval() { return 1; }, clearInterval() {}, requestAnimationFrame() { return 1; }, cancelAnimationFrame() {}
  });
  vm.runInContext(source, root);
  const engine = root.ScoreEngine, model = engine.prepare({ id: 'test', tempo: 60, time: '4/4', ...score });
  engine.analyse(model);
  const player = new engine.Player(null, model);
  player.ui = { light() {}, cursor() {}, update() {} };
  return { player, model, engine, calls, killed, context: () => context };
}

test('resume restores a held voice while skipping completed notes', () => {
  const { player, calls } = fixture({ staves: [{ voices: [{ notes: 'C4/1' }, { notes: 'E4/4 r/4 G4/2' }] }] });
  player.pos = 1.5; player.play();
  assert.deepEqual(calls.map(v => v.midi), [60]);
  assert.equal(calls[0].time, .08);
  assert.ok(Math.abs(calls[0].releaseAt - 2.57) < 1e-8);
});

test('a stalled scheduler drops expired attacks and retains sounding polyphony', () => {
  const { player, calls, context } = fixture({ staves: [{ voices: [{ notes: 'C4/1' }, { notes: 'E4/4 F4/4 G4/4 A4/4' }] }] });
  player.play(); calls.length = 0;
  context().currentTime = 2.4; player.schedule();
  assert.deepEqual(calls.map(v => v.midi), [67]);
  assert.equal(calls[0].time, 2.4);
});

test('dense scores bound audio voices and stop kills all retained voices', () => {
  const { player, calls, killed } = fixture({ staves: Array.from({ length: 40 }, () => ({ notes: '(C4 E4 G4 B4)/1' })) });
  player.play();
  assert.equal(calls.length, 160);
  assert.equal(player.voices.size, 128);
  assert.equal(killed.length, 32);
  player.stop();
  assert.equal(killed.length, 160);
  assert.equal(player.voices.size, 0);
});

test('a late seek in a large score skips completed history with its end index', () => {
  const bars = Array.from({ length: 2000 }, () => 'C4/1').join(' | ');
  const { player, calls } = fixture({ staves: [{ notes: bars }] });
  player.pos = 7997; player.play();
  assert.equal(player.next, 2000);
  assert.equal(calls.length, 1);
  player.pause();
  assert.equal(player.pos, 7997, 'pausing during pre-roll never moves the position backwards');
});

test('repeat mapping resolves performance boundaries after binary indexing', () => {
  const { engine, model } = fixture({ staves: [{ notes: ': C4/1 | D4/1 : | E4/1' }] });
  for (let i = 0; i < model.order.length; i++) {
    assert.equal(engine.writtenBeat(model, model.perfStart[i]), model.barStart[model.order[i]]);
    assert.equal(engine.writtenBeat(model, model.perfStart[i] + .5), model.barStart[model.order[i]] + .5);
  }
});


test('written saxophone parts schedule concert pitch with the requested instrument', () => {
  const {player,calls}=fixture({playbackTranspose:-9,instrument:'sax',staves:[{notes:'A5/1'}]});
  player.play();assert.equal(calls[0].midi,72);assert.equal(calls[0].instrument,'sax');player.stop();
});

test('Stop cancels a pending sample load without a delayed restart', async () => {
  let resolve;
  const {player,calls}=fixture({staves:[{notes:'C4/1'}]},()=>new Promise(r=>{resolve=r;}));
  const request=player.requestPlay();assert.equal(player.loading,true);assert.equal(calls.length,0);
  player.stop();resolve({loaded:1,failed:0});await request;
  assert.equal(player.playing,false);assert.equal(player.loading,false);assert.equal(calls.length,0);
});

test('sample preparation requests sounding pitches and the individual source instruments', async () => {
  let requests;
  const {player,calls}=fixture({playbackTranspose:-14,staves:[{instrument:'sax',notes:'C6/1'},{instrument:'cello',notes:'C4/1'}]},async(c,r)=>{requests=r;return {loaded:2,failed:0};});
  await player.requestPlay();assert.equal(requests[0].instrument,'sax');assert.equal(requests[0].pitches[0],70);
  assert.equal(requests[1].instrument,'cello');assert.equal(requests[1].pitches[0],46);
  assert.equal(calls.length,2);player.stop();
});
