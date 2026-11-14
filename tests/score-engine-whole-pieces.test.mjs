import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('../assets/js/music-notation.js');
require('../assets/js/score-engine.js');
const library = require('../data/score-library.json').scores;
const engine = globalThis.ScoreEngine;

function model(score) {
  const m = engine.prepare({ id: 'test', title: 'test', ...score });
  engine.analyse(m);
  return m;
}

test('repeats and first/second endings are played in performance order', () => {
  const m = model({ time: '2/4', staves: [{ notes: 'C5/2 |: D5/2 | @1 E5/2 :| @2 F5/2 | G5/2' }] });
  assert.deepEqual(m.order.map((bi) => engine.barNumber(m, bi)), [1, 2, 3, 2, 4, 5]);
  assert.deepEqual(engine.playList(m).map((n) => n.midi), [72, 74, 76, 74, 77, 79]);
});

test('an end-repeat without a start-repeat returns to the end of the previous repeated section', () => {
  const m = model({ time: '2/4', staves: [{ notes: 'C5/2 :| D5/2 | E5/2 :| F5/2' }] });
  assert.deepEqual(m.order, [0, 0, 1, 2, 1, 2, 3]);
});

test('D.C. al Fine takes the trio repeat, then goes back to the top without repeats, last ending only', () => {
  const m = model({ time: '2/4', staves: [{ notes: 'C5/2 |: D5/2 | @1 E5/2 :| @2 F5/2 @Fine | : G5/2 | A5/2 @DC :' }] });
  assert.deepEqual(m.order.map((bi) => engine.barNumber(m, bi)), [1, 2, 3, 2, 4, 5, 6, 5, 6, 1, 2, 4]);
  assert.ok(m.barMeta[3].fine && m.barMeta[5].dc);
});

test('key, clef and time changes apply from their bar', () => {
  const m = model({ time: '2/4', key: 0, staves: [
    { notes: 'C5/2 | @K:-1 @T:3/4 Bb4/2. | Bb4/2.' },
    { clef: 'bass', notes: 'C3/2 | @C:treble C4/2. | @C:bass C3/2.' }] });
  assert.equal(m.barMeta[1].key, -1);
  assert.equal(m.barMeta[1].ts.num, 3);
  assert.deepEqual(m.staves[1].clefAt, ['bass', 'treble', 'bass']);
  // B♭ comes from the new key signature: no accidental is printed.
  assert.equal(m.staves[0].bars[1].events[0].pitches[0].showAcc, null);
});

test('grace notes take no time; tuplets fit three notes in two', () => {
  const m = model({ time: '3/4', staves: [{ notes: 'E5/4 g:D5/16 C5/4 {3 C5/8 D5 E5 }' }] });
  const bar = m.staves[0].bars[0];
  assert.ok(Math.abs(bar.length - 3) < 1e-9);
  assert.equal(bar.events[1].graces.length, 1);
  assert.ok(Math.abs(bar.events[2].dur - 1 / 3) < 1e-9);
  const notes = engine.playList(m);
  const grace = notes.find((n) => n.grace), main = notes.find((n) => n.midi === 72 && !n.grace);
  assert.ok(grace.start < main.start && main.start === 1);
});

test('incomplete bars and printed bar numbers', () => {
  const m = model({ time: '3/8', pickup: 0.5, staves: [{ notes: 'E5/8 | A4/4. | @L:1/2 A4/8 | @N:3 B4/4.' }] });
  assert.deepEqual(m.barStart, [0, 0.5, 2, 2.5]);
  assert.deepEqual([0, 1, 2, 3].map((bi) => engine.barNumber(m, bi)), [0, 1, 2, 3]);
});

test('guide entries map printed bars to indexes and must stay inside the score', () => {
  const m = model({ time: '2/4', guide: [{ bars: '1-2', text: 'a' }, { bars: '2', text: 'b' }], staves: [{ notes: 'C5/2 | D5/2' }] });
  const guide = engine.buildGuide(m);
  assert.deepEqual(guide.map((g) => [g.from, g.to]), [[0, 1], [1, 1]]);
  assert.throws(() => engine.buildGuide(model({ time: '2/4', guide: [{ bars: '9', text: 'x' }], staves: [{ notes: 'C5/2' }] })), /outside the score/);
});

test('two voices striking the same pitch together sound it once', () => {
  const m = model({ time: '2/4', staves: [{ voices: [{ notes: 'G4/2' }, { notes: 'G4/4 r/4' }] }] });
  const notes = engine.playList(m);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].dur, 2);
});

test('staccato releases early while keeping written beats, chords and ties intact', () => {
  const m = model({ time: '4/4', staves: [{ notes: '(C5 E5)/4+. D5/4 E5/2~ | E5/4+. F5/2. | G5/2~+. G5/2' }] });
  const notes = engine.playList(m);
  assert.deepEqual(notes.map(({ start, dur, midi }) => [start, dur, midi]), [
    [0, 0.5, 72], [0, 0.5, 76], [1, 1, 74], [2, 2.5, 76], [5, 3, 77], [8, 4, 79]
  ]);
  assert.deepEqual(m.barStart, [0, 4, 8]);
  assert.equal(m.total, 12);
});

test('sustained notes follow ties across more than two performed bars', () => {
  const m = model({ time: '4/4', staves: [{ notes: 'Bb4/1~ | Bb4/1~ | Bb4/2. Ab4/4' }] });
  assert.deepEqual(engine.playList(m).map(({ start, dur, midi }) => [start, dur, midi]), [
    [0, 11, 70], [11, 1, 68]
  ]);
});

test('long ties stop when playback jumps away from the written continuation', () => {
  const m = model({ time: '4/4', staves: [{ notes: 'C5/1~ | C5/1~ | C5/1' }] });
  m.order = [0, 1, 0, 1, 2];
  m.perfStart = [0, 4, 8, 12, 16];
  assert.deepEqual(engine.playList(m).map(({ start, dur }) => [start, dur]), [[0, 8], [8, 12]]);
});

test('every complete composer score is long, sourced and guided', () => {
  const complete = Object.entries(library).filter(([, s]) => s.complete);
  assert.ok(complete.length >= 14);
  for (const [id, raw] of complete) {
    const m = model({ ...raw, id });
    assert.ok(raw.source.full, `${id} links the complete printed score`);
    const guide = engine.buildGuide(m);
    for (let bi = 0; bi < m.count; bi++) assert.ok(guide.some((g) => bi >= g.from && bi <= g.to), `${id} bar ${engine.barNumber(m, bi)} has a guide note`);
  }
});

test('the Turkish March plays each section twice, then the coda once', () => {
  const m = model(library['mozart-turkish-march']);
  const numbers = m.order.map((bi) => engine.barNumber(m, bi));
  assert.equal(numbers.filter((n) => n === 1).length, 2);
  assert.equal(numbers.filter((n) => n === 100).length, 1);
  assert.equal(numbers[numbers.length - 1], 128);
});

test('sixty-fourth-note runs retain their timing and four beams', () => {
  const m = model({ time: '1/4', staves: [{ notes: 'C5/64 D5/64 E5/32 F5/16 G5/8' }] });
  const notes = engine.playList(m);
  assert.deepEqual(notes.map(n => n.start), [0, 0.0625, 0.125, 0.25, 0.5]);
  assert.equal(notes[0].dur, 0.0625);
  for (const width of [320, 1100]) {
    const out = engine.engrave(m, width);
    assert.ok(!/NaN|undefined/.test(out.svg));
    assert.ok(m.staves[0].bars[0].beams.some(group => group.levels === 4));
    assert.equal((out.svg.match(/class="se-beam"/g) || []).length, 4);
  }
});

test('Bach collection includes all fifteen Inventions and every featured addition', () => {
  const ids = require('../data/composer-workspaces.json').bach.scores;
  assert.equal(ids.length, 23);
  for (const id of [
    ...Array.from({ length: 15 }, (_, i) => 'bach-invention-' + (i + 1)),
    'bach-fugue-c-major', 'bach-air', 'bach-goldberg-aria',
    'bach-toccata-fugue-d-minor', 'bach-crab-canon', 'bach-jesu'
  ]) {
    assert.ok(ids.includes(id), id + ' is selectable');
    assert.equal(library[id].complete, true);
    assert.ok(library[id].source.full);
  }
  assert.match(library['bach-jesu'].source.label, /choir and keyboard arrangement/);
});

test('isolated sixty-fourth notes and short rests use their own glyphs', () => {
  const m = model({ time: '1/4', staves: [{ notes: 'C5/64 r/64 r/32 r/16 r/8' }] });
  const out = engine.engrave(m, 320);
  assert.ok(out.height > 0 && !/NaN|undefined/.test(out.svg));
  for (const name of ['rest32', 'rest64', 'flag64Up', 'flag64Down']) {
    assert.ok(globalThis.MusicNotation.glyph(name, 0, 0, 10).includes('<path'));
  }
  assert.equal(m.staves[0].bars[0].events[1].base, 0.0625);
});
