import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Core = require('../assets/js/lessons/mean-median-mode-core.js');

test('computeStats handles odd count, even count, unimodal, and bimodal datasets', () => {
  const odd = Core.computeStats([3, 4, 6, 7, 9]);
  assert.equal(odd.n, 5);
  assert.equal(odd.sum, 29);
  assert.ok(Math.abs(odd.mean - 5.8) < 1e-9);
  assert.equal(odd.median, 6);
  assert.deepEqual(odd.modeKeys, []);
  assert.ok(Math.abs(odd.negSum + odd.posSum) < 1e-9);

  const even = Core.computeStats([2, 4, 5, 9, 11, 14]);
  assert.equal(even.n, 6);
  assert.equal(even.median, 7);
  assert.deepEqual(even.medianSortedPositions, [2, 3]);

  const bimodal = Core.computeStats([4, 4, 4, 8, 13, 13, 13]);
  assert.deepEqual(bimodal.modeValues, [4, 13]);
  assert.equal(bimodal.maxFreq, 3);
});

test('computeStats detects outlier skewness and preserves exact deviation balance', () => {
  const skewed = Core.computeStats(Core.PRESETS.outlier);
  assert.equal(skewed.median, 6);
  assert.equal(skewed.mean, 8);
  assert.ok(skewed.skewGap > 1.9);
  assert.match(skewed.skewLabel, /Right-skewed/);
  assert.ok(Math.abs(skewed.negSum + skewed.posSum) < 1e-9);
});

test('evaluateMissions detects all four classroom discovery targets', () => {
  const mOutlier = Core.evaluateMissions([1, 2, 3, 4, 20]);
  assert.equal(mOutlier.items.find((x) => x.id === 'outlier-pull').done, true);

  const mTriple = Core.evaluateMissions([8, 10, 10, 12]);
  assert.equal(mTriple.items.find((x) => x.id === 'triple-match').done, true);
  assert.equal(mTriple.items.find((x) => x.id === 'even-gap').done, false);

  const mEvenGap = Core.evaluateMissions([2, 4, 8, 10]);
  assert.equal(mEvenGap.items.find((x) => x.id === 'even-gap').done, true);

  const mBimodal = Core.evaluateMissions(Core.PRESETS.bimodal);
  assert.equal(mBimodal.items.find((x) => x.id === 'bimodal').done, true);
});

test('all scenarios and whatIf variants compute valid statistics and numeric answer checks work', () => {
  assert.equal(Core.SCENARIOS.length, 4);
  for (const sc of Core.SCENARIOS) {
    const base = Core.computeStats(sc.data);
    const whatIf = Core.computeStats(sc.whatIfData);
    assert.ok(isFinite(base.mean) && isFinite(base.median));
    assert.ok(isFinite(whatIf.mean) && isFinite(whatIf.median));
    assert.ok(['Mean', 'Median', 'Mode'].includes(sc.best));
  }

  assert.equal(Core.checkNumericAnswer('5.5', 5.5).ok, true);
  assert.equal(Core.checkNumericAnswer('  ', 5.5).empty, true);
  assert.equal(Core.checkNumericAnswer('6', 5.5).ok, false);
});
