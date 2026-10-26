import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tvChannelEdge, tvChannelOf, wavelengthM, productCounts, products, analyze,
  freeRanges, coordinate, GOLOMB, PRESETS, BAND,
} from '../assets/js/wireless-rf-core.mjs';

test('TV channels 14–36 tile 470–608 MHz', () => {
  assert.equal(tvChannelEdge(14), 470);
  assert.equal(tvChannelEdge(37), 608);
  assert.equal(tvChannelOf(470), 14);
  assert.equal(tvChannelOf(607.99), 36);
  assert.equal(tvChannelOf(608), null);
});

test('quarter wave at 500 MHz is about 15 cm', () => {
  assert.ok(Math.abs(wavelengthM(500) / 4 - 0.15) < 0.001);
});

test('product counts grow roughly with n²–n³ and match the enumeration', () => {
  for (let n = 0; n <= 10; n++) {
    const f = Array.from({ length: n }, (_, i) => 500 + i * 1.37);
    const c = productCounts(n);
    const p = products(f);
    assert.equal(p.filter((x) => x.kind === 2).length, c.two);
    assert.equal(p.filter((x) => x.kind === 3).length, c.three);
  }
  assert.deepEqual(productCounts(8), { two: 56, three: 168, total: 224 });
});

test('evenly spaced carriers always collide (3-term progression)', () => {
  const r = analyze([500, 500.5, 501, 501.5], { clearance: 0.25, minSpacing: 0.3 });
  assert.equal(r.clean, false);
  assert.ok(r.hits.length > 0);
});

test('a two-tone product is flagged on the victim carrier', () => {
  const r = analyze([500, 501, 502], { clearance: 0.25, minSpacing: 0.3 });
  assert.ok(r.hits.some((h) => h.kind === 2 && h.victim === 2 && h.from[0] === 1 && h.from[1] === 0));
});

test('too-close carriers are reported', () => {
  const r = analyze([500, 500.1], { minSpacing: 0.3, clearance: 0.05 });
  assert.deepEqual(r.close, [[0, 1]]);
});

test('Golomb rulers are collision-free at one-clearance spacing and have the known lengths', () => {
  const lengths = { 2: 1, 3: 3, 4: 6, 5: 11, 6: 17, 7: 25, 8: 34, 9: 44, 10: 55 };
  for (const [n, marks] of Object.entries(GOLOMB)) {
    assert.equal(marks.length, +n);
    assert.equal(marks[marks.length - 1], lengths[n]);
    const u = 0.25;
    const f = marks.map((m) => 500 + m * u);
    const r = analyze(f, { clearance: u, minSpacing: u });
    assert.equal(r.clean, true, `n=${n}`);
  }
});

test('freeRanges removes blocked TV channels', () => {
  assert.deepEqual(freeRanges([]), [[470, 608]]);
  assert.deepEqual(freeRanges([14]), [[476, 608]]);
  assert.deepEqual(freeRanges([15, 17]), [[470, 476], [482, 488], [494, 608]]);
});

test('coordinate() finds 8 clean carriers in an open field and in the suburb', () => {
  for (const key of ['empty', 'suburb']) {
    const ranges = freeRanges(PRESETS[key].blocked);
    const r = coordinate(8, ranges);
    assert.equal(r.ok, true, key);
    assert.equal(r.freqs.length, 8);
    assert.equal(analyze(r.freqs).clean, true);
    for (const f of r.freqs) assert.ok(ranges.some(([a, b]) => f >= a && f <= b));
  }
});

test('coordinate() gives up cleanly when there is no room', () => {
  const r = coordinate(8, [[470, 472]], { budget: 20000 });
  assert.equal(r.ok, false);
  assert.ok(r.nodes <= 20001);
});

test('coordinate() output stays inside the band', () => {
  const r = coordinate(6, freeRanges([]));
  assert.ok(r.freqs.every((f) => f >= BAND.lo && f <= BAND.hi));
});
