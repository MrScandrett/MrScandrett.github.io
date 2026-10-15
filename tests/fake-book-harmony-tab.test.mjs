import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const H = require('../assets/js/lessons/fake-book-harmony.js');
const T = require('../assets/js/lessons/fake-book-tab.js');

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = (s) => { const m = /^([A-G])(#|b)?(\d)$/.exec(s); return 12 * (+m[3] + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };

// A chorale in F that modulates to C and comes home: bass, tenor, alto, soprano, one chord per bar.
const CHORALE = [
  ['F2', 'C4', 'F4', 'A4'], ['Bb2', 'D4', 'F4', 'Bb4'], ['C3', 'E4', 'G4', 'Bb4'], ['F2', 'C4', 'F4', 'A4'],
  ['D3', 'D4', 'F4', 'A4'], ['G2', 'D4', 'G4', 'B4'], ['C3', 'E4', 'G4', 'C5'], ['F3', 'C4', 'F4', 'A4'],
  ['G2', 'D4', 'F4', 'B4'], ['C3', 'E4', 'G4', 'C5'], ['A2', 'E4', 'A4', 'C5'], ['D3', 'D4', 'F4', 'A4'],
  ['G2', 'D4', 'F4', 'B4'], ['C3', 'E4', 'G4', 'C5'], ['C3', 'E4', 'G4', 'Bb4'], ['F2', 'C4', 'F4', 'A4'],
  ['A2', 'C4', 'F4', 'C5'], ['Bb2', 'D4', 'F4', 'Bb4'], ['C3', 'E4', 'G4', 'Bb4'], ['F2', 'C4', 'F4', 'A4']
];
const chorale = () => CHORALE.flatMap((ch, b) => ch.map((p) => ({ s: b * 4, d: 4, midi: midi(p) })));

test('harmony: chords of a chorale, with an inversion from the bass', () => {
  const r = H.analyze(chorale(), { M: 4, bars: CHORALE.length, startKey: { tonic: 5, minor: false } });
  assert.equal(r.chordBars.join(' | '), 'F | Bb | C7 | F | Dm | G | C | F | G7 | C | Am | Dm | G7 | C | C7 | F | F/A | Bb | C7 | F');
});

test('harmony: the modulation to C major and the return home are found', () => {
  const r = H.analyze(chorale(), { M: 4, bars: CHORALE.length, startKey: { tonic: 5, minor: false } });
  assert.deepEqual(r.keys.map((k) => [k.bar, k.name, k.minor]), [[1, 'F', false], [6, 'C', false], [16, 'F', false]]);
});

test('harmony: passing tones in the melody don’t change the chord', () => {
  const notes = chorale().filter((n) => n.s < 4 && n.midi < 65);
  ['A5', 'G5', 'F5', 'G5', 'A5', 'Bb5', 'C6', 'A5'].forEach((p, i) => notes.push({ s: i * 0.5, d: 0.5, midi: midi(p) }));
  assert.deepEqual(H.analyze(notes, { M: 4, bars: 1 }).chordBars, ['F']);
});

test('harmony: a minor-key piece with major dominant chords stays in minor', () => {
  const bars = [
    [['A3', 'C4', 'E4', 'A4', 'E4', 'C4', 'E4', 'A4'], ['A2', 'E3']], [['B3', 'E4', 'G#4', 'B4', 'G#4', 'E4', 'G#4', 'B4'], ['E2', 'B2']],
    [['C4', 'E4', 'A4', 'C5', 'A4', 'E4', 'A4', 'C5'], ['A2', 'E3']], [['D4', 'F4', 'A4', 'D5', 'A4', 'F4', 'A4', 'D5'], ['D3', 'A2']],
    [['E4', 'G#4', 'B4', 'E5', 'B4', 'G#4', 'D5', 'B4'], ['E2', 'E3']], [['C5', 'A4', 'E4', 'C4', 'A3', 'E4', 'A4', 'A4'], ['A2', 'A2']]
  ];
  const notes = [];
  bars.forEach(([mel, bass], b) => {
    mel.forEach((p, i) => notes.push({ s: b * 4 + i * 0.5, d: 0.5, midi: midi(p) }));
    bass.forEach((p, i) => notes.push({ s: b * 4 + i * 2, d: 2, midi: midi(p) }));
  });
  const r = H.analyze(notes, { M: 4, bars: 6 });
  assert.deepEqual(r.keys.map((k) => [k.name, k.minor]), [['A', true]]);
  assert.equal(r.chordBars.join(' | '), 'Am:2 Am/E:2 | E:2 E/B:2 | Am:2 Am/E:2 | Dm:2 Dm/A:2 | E | Am');
});

test('harmony: chord roots are spelled for the key', () => {
  assert.equal(H.spell(10, { tonic: 5, minor: false }), 'Bb');
  assert.equal(H.spell(6, { tonic: 7, minor: false }), 'F#');
  assert.equal(H.spell(8, { tonic: 0, minor: false }), 'Ab');
  assert.equal(H.spell(5, { tonic: 6, minor: false }), 'E#');
});

const OPEN = T.STANDARD;
const pitchOf = ([s, f]) => OPEN[s - 1] + f;
const C_SCALE = [60, 62, 64, 65, 67, 69, 71, 72].map((m, i) => ({ start: i, ms: [m] }));

test('tab: every placed note is the right pitch, open position by default', () => {
  const r = T.plan(C_SCALE);
  r.events.forEach((e, i) => assert.equal(pitchOf(e.f[0]), C_SCALE[i].ms[0]));
  assert.equal(r.events.map((e) => e.f[0].join(':')).join(' '), '5:3 4:0 4:2 4:3 3:0 3:2 2:0 2:1');
  assert.equal(r.dropped, 0);
});

test('tab: a chosen position keeps the hand there', () => {
  for (const pos of [5, 7]) {
    const r = T.plan(C_SCALE, { position: pos });
    r.events.forEach((e, i) => {
      assert.equal(pitchOf(e.f[0]), C_SCALE[i].ms[0]);
      assert.ok(e.f[0][1] >= pos - 1 && e.f[0][1] <= pos + 4, `pos ${pos}: ${e.f[0]}`);
    });
  }
});

test('tab: fingerstyle keeps the melody on top and the bass below, one note per string', () => {
  const on = [{ start: 0, ms: [76, 52] }, { start: 1, ms: [72, 60] }, { start: 2, ms: [71, 55] }, { start: 3, ms: [72, 64, 57] }];
  const r = T.plan(on);
  r.events.forEach((e, i) => {
    assert.deepEqual(e.f.map(pitchOf).sort(), on[i].ms.slice().sort());
    assert.equal(new Set(e.f.map((x) => x[0])).size, e.f.length);
    assert.equal(pitchOf(e.f[0]), on[i].ms[0], 'melody first, on the highest string used');
    e.f.slice(1).forEach((x) => assert.ok(x[0] > e.f[0][0]));
  });
});

test('tab: notes a guitar can’t play are left out and counted', () => {
  const r = T.plan([{ start: 0, ms: [72, 36] }, { start: 1, ms: [96] }, { start: 2, ms: [84, 72, 60, 48] }]);
  assert.equal(r.total, 7);
  assert.ok(r.dropped >= 3, `dropped ${r.dropped}`);
  assert.deepEqual(r.events[0].f.map(pitchOf), [72], 'the melody survives when its bass is below the low E');
});

test('harmony: a written C♯ in the bass stays C♯, and a late seventh still counts (Stardust bar 26)', () => {
  // Em7 over E–D bass, then C♯ bass under E, B, A, G♯(written A♭), G.
  const n = (s, d, p, alter = 0) => ({ s, d, midi: midi(p), alter });
  const notes = [
    n(0, 1, 'E2'), n(1, 1, 'D2'), n(0, 1, 'G4'), n(0, 1, 'B4'), n(1, 1, 'E4'), n(1, 1, 'B3'),
    n(2, 2, 'C#2', 1), n(2, 2, 'E4'), n(2, 0.5, 'B3'), n(2.5, 0.5, 'A3'), n(3, 0.5, 'Ab3', -1), n(3.5, 0.5, 'G3')
  ];
  const r = H.analyze(notes, { M: 4, bars: 1, startKey: { tonic: 0, minor: false } });
  assert.match(r.chordBars[0], /C#m/);
  assert.doesNotMatch(r.chordBars[0], /Db/);
});

test('harmony: with no written accidental a diminished chord on C♯ is spelled C♯°7, not D♭°7', () => {
  const r = H.analyze([{ s: 0, d: 4, midi: midi('C#3') }, { s: 0, d: 4, midi: midi('E4') }, { s: 0, d: 4, midi: midi('G4') }, { s: 0, d: 4, midi: midi('Bb4') }], { M: 4, bars: 1, startKey: { tonic: 0, minor: false } });
  assert.match(r.chordBars[0], /^C#dim7/);
});
