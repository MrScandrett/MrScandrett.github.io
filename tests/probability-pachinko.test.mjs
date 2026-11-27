import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Core = require('../assets/js/lessons/probability-pachinko-core.js');

test('Pascal triangle and combinations match exact binomial coefficients', () => {
  const tri = Core.computePascalTriangle(5);
  assert.deepEqual(tri[0], [1]);
  assert.deepEqual(tri[4], [1, 4, 6, 4, 1]);
  assert.deepEqual(tri[5], [1, 5, 10, 10, 5, 1]);
  assert.equal(Core.combination(10, 5), 252);
  assert.equal(Core.combination(12, 0), 1);
  assert.equal(Core.combination(12, 12), 1);
});

test('computeExpectedDistribution matches fair and tilted binomial theory', () => {
  const fair = Core.computeExpectedDistribution({ rows: 10, scenario: 'fair', baseP: 0.5 });
  const sumFair = fair.probs.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sumFair - 1) < 1e-12);
  assert.ok(Math.abs(fair.mean - 5) < 1e-12);
  assert.ok(Math.abs(fair.variance - 2.5) < 1e-12);
  assert.equal(fair.modeBin, 5);
  assert.ok(Math.abs(fair.probs[5] - 252 / 1024) < 1e-12);

  const right = Core.computeExpectedDistribution({ rows: 10, scenario: 'right', baseP: 0.65 });
  assert.ok(Math.abs(right.mean - 6.5) < 1e-10);
  assert.ok(Math.abs(right.variance - 10 * 0.65 * 0.35) < 1e-10);
  assert.ok(right.modeBin >= 6 && right.modeBin <= 7);

  const left = Core.computeExpectedDistribution({ rows: 10, scenario: 'left', baseP: 0.35 });
  assert.ok(Math.abs(left.mean - 3.5) < 1e-10);
  assert.equal(Core.SCENARIOS.left.p, 0.35);
  assert.equal(Core.SCENARIOS.right.p, 0.65);
});

test('non-binomial scenarios (center, edge, random) differ accurately from fair binomial', () => {
  const fair = Core.computeExpectedDistribution({ rows: 10, scenario: 'fair', baseP: 0.5 });
  const center = Core.computeExpectedDistribution({ rows: 10, scenario: 'center', baseP: 0.5 });
  const edge = Core.computeExpectedDistribution({ rows: 10, scenario: 'edge', baseP: 0.5 });
  const uneven = Core.computeExpectedDistribution({ rows: 10, scenario: 'random', baseP: 0.5 });

  for (const dist of [center, edge, uneven]) {
    const sum = dist.probs.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-10, 'probabilities must sum to 1');
  }
  assert.ok(center.sd < fair.sd, 'center-friendly board has tighter spread than fair board');
  assert.ok(edge.sd > fair.sd, 'edge challenge board has wider spread than fair board');
  assert.ok(center.probs[5] > fair.probs[5], 'center board concentrates more mass in bin 5');
  assert.ok(edge.probs[0] > fair.probs[0], 'edge board puts more mass in extreme bins');
});

test('per-peg overrides shift the exact Markov distribution', () => {
  const base = Core.computeExpectedDistribution({ rows: 6, scenario: 'fair', baseP: 0.5 });
  const tilted = Core.computeExpectedDistribution({
    rows: 6,
    scenario: 'custom',
    baseP: 0.5,
    pegOverrides: { '0,0': 'right' }
  });
  assert.equal(Core.pegProbability({ rows: 6, scenario: 'custom', baseP: 0.5, pegOverrides: { '0,0': 'right' } }, 0, 0), 0.85);
  assert.ok(tilted.mean > base.mean, 'tilting root peg right increases expected mean');
  assert.ok(Math.abs(tilted.mean - 3.35) < 1e-10);
});

test('simulateBall produces valid paths of exact length and deterministic output with custom RNG', () => {
  const config = { rows: 8, scenario: 'fair', baseP: 0.5 };
  const allRight = Core.simulateBall(config, () => 0.1);
  assert.equal(allRight.bin, 8);
  assert.equal(allRight.path.length, 9);
  assert.deepEqual(allRight.path, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(allRight.choices.join(''), 'RRRRRRRR');

  const allLeft = Core.simulateBall(config, () => 0.99);
  assert.equal(allLeft.bin, 0);
  assert.deepEqual(allLeft.path, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
});

test('buildBinValues and summarizeCounts compute EV, center share, sigma coverage, and fit', () => {
  const config = { rows: 10, scenario: 'fair', baseP: 0.5 };
  const exp = Core.computeExpectedDistribution(config);
  const ramp = Core.buildBinValues(10, 'graded');
  const jackpot = Core.buildBinValues(10, 'edge-jackpot');

  assert.equal(ramp[0], 0);
  assert.equal(ramp[10], 100);
  assert.equal(jackpot[0], 500);
  assert.equal(jackpot[5], 0);

  // Synthetic exact-scaled counts of 1024 balls
  const exactCounts = exp.probs.map((p) => Math.round(p * 1024));
  const summary = Core.summarizeCounts(exactCounts, exp.probs, ramp, exp);
  assert.equal(summary.total, 1024);
  assert.equal(summary.modeBin, 5);
  assert.ok(Math.abs(summary.mean - 5) < 1e-10);
  assert.ok(Math.abs(summary.theoreticalEV - 50) < 1e-10);
  assert.ok(Math.abs(summary.observedEV - 50) < 1e-10);
  assert.ok(summary.within1Sd > 0.65 && summary.within1Sd < 0.80);
  assert.equal(summary.fitLabel, 'Close match to model');
  assert.ok(summary.chi2PerDf !== null && summary.chi2PerDf < 1.0);

  const snap = Core.buildNormalizedSnapshot(exactCounts, 10, 'Fair 1024');
  assert.equal(snap.rows, 10);
  assert.equal(snap.total, 1024);
  assert.ok(Math.abs(snap.probs[5] - exp.probs[5]) < 0.01);

  const missions = Core.evaluateMissions({ predicted: true, traced: true, tilted: false, largeSample: true, testedEv: false });
  assert.equal(missions.doneCount, 3);
  assert.equal(missions.total, 5);
});
