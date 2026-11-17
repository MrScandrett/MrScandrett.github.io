import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('../assets/js/music-notation.js');
require('../assets/js/score-engine.js');
const library = require('../data/score-library.json').scores;
const engine = globalThis.ScoreEngine;

test('printed dotted-quarter tempo drives the transport and its duration', () => {
  const model = engine.prepare(library['debussy-clair-de-lune']);
  engine.analyse(model);
  const player = new engine.Player(null, model);
  assert.equal(player.qpm(), 72);
  Object.assign(player, { t0: 0, b0: 0 });
  assert.equal(player.timeOf(1.5), 1.25);
  assert.equal(player.beatAt(1.25), 1.5);
  player.rate = player.activeRate = 0.5;
  assert.equal(player.timeOf(1.5), 2.5);
  const duration = Math.round(model.perfTotal / 72 * 60);
  assert.ok(engine.coverageText(model).includes(Math.floor(duration / 60) + ':' + String(duration % 60).padStart(2, '0')));
});

test('hairpins, accents and chord voicing shape velocities on each pass without shifting beat positions', () => {
  const model = engine.prepare({
    time: '4/4',
    staves: [{ notes: ': !p C4/4 C4/4 C4/4 C4/4 | (C4 E4)/4+> C4/4 C4/4 C4/4 :' }],
    expressions: {
      hairpins: [{ from: { bar: 1 }, to: { bar: 2 }, type: 'crescendo' }],
      directions: [{ bar: 2, dynamic: 'f' }]
    }
  });
  engine.analyse(model);
  const notes = engine.playList(model);
  assert.deepEqual(notes.map(note => note.start), [0, 1, 2, 3, 4, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 14, 15]);
  assert.ok(notes[0].vel < notes[1].vel && notes[1].vel < notes[2].vel && notes[2].vel < notes[3].vel);
  assert.ok(notes[5].vel > notes[4].vel && notes[4].vel > notes[6].vel);
  assert.deepEqual(notes.slice(0, 9).map(note => note.vel), notes.slice(9).map(note => note.vel));
});

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

test('imported isolated timing ratios do not appear as finger-like tuplet numbers', () => {
  const model = engine.prepare(library['chopin-prelude-1']);
  engine.analyse(model);
  const before = engine.playList(model).map(({ start, dur, midi }) => [start, dur, midi]);
  for (const width of [390, 1085]) {
    const layout = engine.engrave(model, width, true);
    assert.doesNotMatch(layout.svg, /class="se-tuplet"[^>]*>(9|15)<\/text>/);
    assert.match(layout.svg, /class="se-tuplet"[^>]*>3<\/text>/);
    assert.match(layout.svg, /class="se-tuplet"[^>]*>5<\/text>/);
    assert.doesNotMatch(layout.svg, /NaN|undefined/);
  }
  assert.deepEqual(engine.playList(model).map(({ start, dur, midi }) => [start, dur, midi]), before);
});
