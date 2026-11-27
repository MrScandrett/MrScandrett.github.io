import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Core = require('../assets/js/lessons/how-spread-out-core.js');

test('computeSpreadStats matches all practice datasets and Tukey quartile convention', () => {
  // Practice Q1: 3, 5, 8, 10, 15 -> range 12
  const q1 = Core.computeSpreadStats([3, 5, 8, 10, 15]);
  assert.equal(q1.range, 12);

  // Practice Q2: 1..7 -> Q1 = 2, median = 4, Q3 = 6, IQR = 4
  const q2 = Core.computeSpreadStats([1, 2, 3, 4, 5, 6, 7]);
  assert.equal(q2.q1, 2);
  assert.equal(q2.med, 4);
  assert.equal(q2.q3, 6);
  assert.equal(q2.iqr, 4);

  // Practice Q3: 2, 4, 6, 8 -> mean 5, pop sd sqrt(5) ≈ 2.236
  const q3 = Core.computeSpreadStats([2, 4, 6, 8]);
  assert.equal(q3.mean, 5);
  assert.ok(Math.abs(q3.sd - Math.sqrt(5)) < 1e-9);
  assert.equal(q3.mad, 2);

  // Outlier preset detects 19 as upper outlier
  const out = Core.computeSpreadStats(Core.PRESETS.outlier);
  assert.deepEqual(out.outliers, [19]);
  assert.ok(out.whiskerHigh <= out.hi);
});

test('teamValues produces exact target mean and population standard deviation', () => {
  for (const s of [0.5, 1.5, 4.0, 6.0]) {
    const vals = Core.teamValues(s, 10);
    assert.ok(Math.abs(Core.mean(vals) - 10) < 1e-10);
    assert.ok(Math.abs(Core.sd(vals) - s) < 1e-10);
  }

  const th = Core.thresholdSummary(Core.teamValues(1.5, 10), 8);
  assert.equal(th.total, 10);
  assert.equal(th.count, 9);
  assert.equal(th.pct, 90);
});

test('normalCdf, normalPdf, and zScore follow the 68-95-99.7 rule', () => {
  assert.ok(Math.abs(Core.normalCdf(0) - 0.5) < 1e-6);
  const p1 = Core.normalCdf(1) - Core.normalCdf(-1);
  const p2 = Core.normalCdf(2) - Core.normalCdf(-2);
  const p3 = Core.normalCdf(3) - Core.normalCdf(-3);
  assert.ok(Math.abs(p1 - 0.6827) < 0.001);
  assert.ok(Math.abs(p2 - 0.9545) < 0.001);
  assert.ok(Math.abs(p3 - 0.9973) < 0.001);

  assert.equal(Core.zScore(85, 70, 10), 1.5);
  assert.equal(Core.zScore(28, 20, 4), 2);
  assert.ok(Core.normalPdf(70, 70, 10) > Core.normalPdf(70, 70, 20));
});

test('evaluateMissions detects tight, wide, outlier-iqr, and same-mean-wide targets', () => {
  const tight = Core.evaluateMissions(Core.PRESETS.tight);
  assert.equal(tight.items.find((m) => m.id === 'tight').done, true);

  const outlier = Core.evaluateMissions(Core.PRESETS.outlier);
  assert.equal(outlier.items.find((m) => m.id === 'outlier-iqr').done, true);

  const wide = Core.evaluateMissions([0, 0, 0, 0, 20, 20, 20, 20]);
  assert.equal(wide.items.find((m) => m.id === 'wide').done, true);
  assert.equal(wide.items.find((m) => m.id === 'same-mean-wide').done, true);
});
