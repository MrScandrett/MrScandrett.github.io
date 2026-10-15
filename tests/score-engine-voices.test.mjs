import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('../assets/js/music-notation.js');
require('../assets/js/score-engine.js');
const library = require('../data/score-library.json').scores;
const engine = globalThis.ScoreEngine;

test('Bach opening sustains independent left-hand voices beneath right-hand arpeggios', () => {
  const model = engine.prepare(library['bach-prelude-c-major']);
  engine.analyse(model);
  const notes = engine.playList(model).filter(note => note.start < 4);
  assert.deepEqual(notes.filter(note => note.staff === 1).map(({ start, dur, midi }) => [start, dur, midi]),
    [[0, 2, 60], [0.25, 1.75, 64], [2, 2, 60], [2.25, 1.75, 64]]);
  assert.deepEqual(notes.filter(note => note.staff === 0).map(({ start, midi }) => [start, midi]),
    [[0.5, 67], [0.75, 72], [1, 76], [1.25, 67], [1.5, 72], [1.75, 76],
     [2.5, 67], [2.75, 72], [3, 76], [3.25, 67], [3.5, 72], [3.75, 76]]);
});

test('closing bars keep held left-hand notes while the right hand descends', () => {
  const model = engine.prepare(library['bach-prelude-c-major']);
  engine.analyse(model);
  const notes = engine.playList(model);
  const bar33 = 128;   // bars 33 and 34 of the complete Prelude
  for (const [start, midi] of [[0, 36], [0.25, 48], [4, 36], [4.25, 47]]) {
    const note = notes.find(note => note.staff === 1 && note.start === bar33 + start && note.midi === midi);
    assert.equal(note?.dur, Number.isInteger(start) ? 4 : 3.75);
  }
  assert.deepEqual(notes.filter(note => note.staff === 0 && note.start >= bar33 && note.start < bar33 + 4).map(note => note.midi),
    [53, 57, 60, 65, 60, 57, 60, 57, 53, 57, 53, 50, 53, 50]);
  assert.deepEqual(notes.filter(note => note.staff === 0 && note.start >= bar33 + 4 && note.start < bar33 + 8).map(note => note.midi),
    [67, 71, 74, 77, 74, 71, 74, 71, 67, 71, 62, 65, 64, 62]);
  for (const width of [320, 700, 1100]) assert.doesNotMatch(engine.engrave(model, width).svg, /NaN|undefined/);
});

test('each overlapping voice must fill the bar independently', () => {
  const score = structuredClone(library['bach-prelude-c-major']);
  score.staves[1].voices[0].notes = score.staves[1].voices[0].notes.replace(/^[^|]+/, 'E4/4 ');
  assert.throws(() => engine.prepare(score), /adds up to 1 beats, expected 4/);
});
