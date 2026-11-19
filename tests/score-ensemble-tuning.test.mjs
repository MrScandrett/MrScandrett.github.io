// Ensemble playback must sound at concert pitch and inside the recorded instrument ranges.
// Regressions here sound "out of tune" in tuttis: an octave-wrong transposing staff, double
// basses doubling the cellos at the same octave, or high notes pitch-shifted from a mislabelled
// sample (assets/audio/instruments/manifest.json).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('../assets/js/music-notation.js');
require('../assets/js/score-engine.js');
const library = require('../data/score-library.json').scores;
const manifest = require('../assets/audio/instruments/manifest.json');
const engine = globalThis.ScoreEngine;

function notes(id) {
  const m = engine.prepare({ ...library[id], id });
  engine.analyse(m);
  return { m, list: engine.playList({ ...m, order: m.barStart.map((_, i) => i), perfStart: m.barStart, perfTotal: m.total }) };
}
// Same mapping as Player.prototype.sampleInstrument in score-engine.js.
function bank(score, staff) {
  const inst = staff.instrument || score.instrument, label = staff.label || '';
  if (!staff.instrument || score.staves.length < 3 || /solo/i.test(label)) return inst === 'strings' ? 'violin' : inst;
  if (inst === 'viola' || /viola/i.test(label)) return 'viola-section';
  if (inst === 'cello' || /cello|continuo bass/i.test(label)) return 'cello-section';
  if (inst === 'violin' || inst === 'strings') return 'violin-section';
  return inst;
}

test('a staff soundingTranspose moves playback, not the written notes', () => {
  const m = engine.prepare({ id: 't', title: 't', time: '4/4', staves: [{ notes: 'C3/1', soundingTranspose: -12 }] });
  engine.analyse(m);
  assert.deepEqual(engine.playList(m).map((n) => n.midi), [36]);
  assert.equal(m.staves[0].bars[0].events[0].pitches[0].midi, 48);
});

test('orchestral double basses sound an octave below the cellos they double', () => {
  for (const id of ['beethoven-symphony-7-allegretto', 'beethoven-symphony-5-1']) {
    const { m, list } = notes(id);
    const bi = m.staves.findIndex((s) => s.instrument === 'contrabass');
    const ci = m.staves.findIndex((s) => s.instrument === 'cello');
    const cello = new Map(list.filter((n) => n.staff === ci).map((n) => [n.start.toFixed(3), n.midi]));
    let unison = 0, octave = 0;
    for (const n of list.filter((x) => x.staff === bi)) {
      const c = cello.get(n.start.toFixed(3));
      if (c === n.midi) unison++; else if (c === n.midi + 12) octave++;
    }
    assert.ok(octave > 10 * Math.max(1, unison), `${id}: basses double the cellos at the octave (${octave} octave, ${unison} unison)`);
  }
});

test('every ensemble note plays from a recording within 7 semitones (no synth fallback)', () => {
  for (const [id, score] of Object.entries(library)) {
    if (score.staves.length < 3 || !score.staves.some((s) => s.instrument && s.instrument !== 'piano')) continue;
    const { list } = notes(id);
    for (const n of list) {
      const roots = manifest.banks[bank(score, score.staves[n.staff])]?.roots;
      if (!roots) continue;
      const gap = Math.min(...roots.map((r) => Math.abs(r.midi - n.midi)));
      assert.ok(gap <= 7, `${id} ${score.staves[n.staff].label}: MIDI ${n.midi} is ${gap} semitones from a recording`);
    }
  }
});

test('mislabelled upstream samples stay relabelled', () => {
  // tonejs-instruments clarinet/Fs6.mp3 sounds F6; as F#6 it put high clarinet lines a semitone flat.
  const top = manifest.banks.clarinet.roots.find((r) => /Fs6\.mp3$/.test(r.source));
  assert.equal(top.midi, 89);
  for (const b of Object.values(manifest.banks)) for (const r of b.roots) {
    if (r.cents !== undefined) assert.ok(Math.abs(r.cents) < 50, `${r.file}: a correction of 50+ cents means a wrong root`);
  }
});
