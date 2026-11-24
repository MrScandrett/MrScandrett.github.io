import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Q = require('../assets/js/lessons/quadrivium-core.js');

test('reduces ratios and computes frequencies, string stops, and cents', () => {
  const red = Q.reduceRatio(6, 4);
  assert.equal(red.label, '3:2');
  assert.equal(red.gcd, 2);

  assert.equal(Q.frequencyFromRatio(220, 2, 1), 440);
  assert.equal(Q.frequencyFromRatio(200, 3, 2), 300);

  assert.ok(Math.abs(Q.stringStopFraction(3, 2) - 2 / 3) < 1e-9);
  assert.ok(Math.abs(Q.centsFromRatio(2, 1) - 1200) < 1e-9);
  assert.ok(Math.abs(Q.centsFromRatio(3, 2) - 701.955) < 0.01);
});

test('ranks simple ratios as purer consonances than complex ratios', () => {
  const octave = Q.consonanceRank(2, 1);
  const fifth = Q.consonanceRank(3, 2);
  const tritone = Q.consonanceRank(45, 32);
  assert.ok(octave.complexity < fifth.complexity);
  assert.ok(fifth.complexity < tritone.complexity);
  assert.equal(octave.tier, 'Pure consonance');
});

test('orbital resonance computes conjunction counts and Earth-Venus 5-petal symmetry', () => {
  const venus = Q.orbitalResonancePositions(0.5, 13, 8);
  assert.equal(venus.conjunctionsPerCycle, 5);
  assert.ok(Math.abs(venus.outer.x - (-1)) < 1e-9);
  assert.ok(Math.hypot(venus.inner.x, venus.inner.y) - 1 < 1e-9);
});

test('rejects invalid zero or non-integer inputs', () => {
  assert.throws(() => Q.reduceRatio(0, 2));
  assert.throws(() => Q.reduceRatio(3, 1.5));
  assert.throws(() => Q.frequencyFromRatio(0, 3, 2));
});
