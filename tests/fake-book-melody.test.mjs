import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const MV = require('../assets/js/lessons/fake-book-melody.js');

const OPEN = MV.OPEN;
const at = (n) => OPEN[n.s] + n.f;
const C_SCALE = [60, 62, 64, 65, 67, 69, 71, 72];

test('every guitar route plays the right pitches', () => {
  const tune = [67, 70, 72, 74, 72, 74, 62, 65, 67, 69, 75, 74, 79, 84, 86, 60];
  for (const pos of ['auto', 0, 5, 7]) {
    const route = MV.guitarRoute(tune, pos);
    route.forEach((n, i) => assert.equal(at(n), tune[i], `pos ${pos} note ${i}`));
  }
});

test('a fixed position keeps every note inside its frets', () => {
  const tune = [67, 69, 71, 72, 74, 76, 77, 79];
  const fits = MV.guitarPositions(tune).map((p) => p.pos);
  assert.ok(fits.includes(0) && fits.includes(7), `fits: ${fits}`);
  for (const p of fits) {
    for (const n of MV.guitarRoute(tune, p)) {
      assert.equal(n.pos, p);
      if (n.f > 0) assert.ok(n.f >= p - 1 && n.f <= p + 4, `pos ${p} fret ${n.f}`);
      assert.ok(n.finger >= 0 && n.finger <= 4);
    }
  }
});

test('auto route only shifts when it must', () => {
  const oneOctave = [67, 69, 71, 72, 74, 72, 71, 69, 67];
  assert.equal(MV.guitarRoute(oneOctave, 'auto').filter((n) => n.shift).length, 0);
  const wide = [52, 55, 59, 64, 67, 71, 76, 79, 83, 88];
  const route = MV.guitarRoute(wide, 'auto');
  route.forEach((n, i) => assert.equal(at(n), wide[i]));
  assert.ok(route.filter((n) => n.shift).length <= 2);
});

test('piano scale fingerings come out the standard way', () => {
  const up = MV.pianoSmooth(C_SCALE, 'right').map((n) => n.finger);
  assert.ok(up.join('') === '12312345' || up.join('') === '12341234', up.join(''));
  const lh = MV.pianoSmooth(C_SCALE.map((m) => m - 12), 'left').map((n) => n.finger).join('');
  assert.equal(lh, '54321321');
});

test('five-finger positions use one finger per letter and fingers 1-5', () => {
  const notes = [[60, 28], [62, 29], [64, 30], [65, 31], [67, 32], [69, 33], [67, 32]].map(([midi, dia]) => ({ midi, dia, name: 'x' }));
  const rh = MV.pianoFive(notes, 'right');
  rh.forEach((n) => assert.ok(n.finger >= 1 && n.finger <= 5));
  assert.deepEqual(rh.slice(0, 5).map((n) => n.finger), [1, 2, 3, 4, 5]);
  assert.equal(rh.filter((n) => n.shift).length, 1);
  const lh = MV.pianoFive(notes, 'left');
  assert.deepEqual(lh.slice(0, 5).map((n) => n.finger), [5, 4, 3, 2, 1]);
});

test('every built-in tune can be routed on guitar', () => {
  const data = JSON.parse(readFileSync(new URL('../data/fake-book.json', import.meta.url), 'utf8'));
  const NAT = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  for (const t of data.tunes) {
    const midis = [...t.melody.matchAll(/\b([A-G])(##|bb|#|b)?(\d)[whqes]/g)].map(([, l, acc = '', o]) =>
      12 * (Number(o) + 1) + NAT[l] + ({ '#': 1, '##': 2, b: -1, bb: -2 }[acc] || 0));
    if (!midis.length) continue;
    const shifted = midis.map((m) => m + MV.bestShift(midis, 52, 91, 69));
    MV.guitarRoute(shifted, 'auto').forEach((n, i) => assert.equal(at(n), shifted[i], `${t.id} note ${i}`));
  }
});
