import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Core = require('../assets/js/lessons/probability-simulator-core.js');

test('all 11 preset experiments have valid probability distributions summing to 1', () => {
  const keys = Object.keys(Core.PRESET_EXPERIMENTS);
  assert.equal(keys.length, 11);
  for (const key of keys) {
    const exp = Core.PRESET_EXPERIMENTS[key];
    const sum = exp.outcomes.reduce((acc, o) => acc + o.weight, 0);
    assert.ok(Math.abs(sum - 1) < 1e-10, `${key} weights sum to ${sum}`);
    assert.ok(exp.expectedProbability > 0 && exp.expectedProbability <= 1);
  }
});

test('buildCustomExperiment validates inputs and normalizes weights', () => {
  const badWeight = Core.buildCustomExperiment([{ label: 'A', weight: 1.5 }, { label: 'B', weight: 2 }], 0, 'spinner');
  assert.equal(badWeight.ok, false);

  const badCoin = Core.buildCustomExperiment([
    { label: 'A', weight: 1 },
    { label: 'B', weight: 2 },
    { label: 'C', weight: 3 }
  ], 0, 'coin');
  assert.equal(badCoin.ok, false);

  const good = Core.buildCustomExperiment([
    { label: 'Red', weight: 3 },
    { label: 'Blue', weight: 1 }
  ], 0, 'marbles');
  assert.equal(good.ok, true);
  assert.equal(good.experiment.expectedProbability, 0.75);
  assert.equal(good.experiment.supportsWithoutReplacement, true);
});

test('cumulative stepping and setTrackedIndex produce exact counts and streaks', () => {
  const coin = Core.PRESET_EXPERIMENTS.coin;
  const st = Core.createRunState(coin);
  let i = 0;
  // Deterministic alternating sequence: H, T, T, T, H, H...
  const rolls = [0.1, 0.9, 0.9, 0.9, 0.1, 0.1];
  const rng = () => rolls[(i++) % rolls.length];

  Core.stepTrials(st, 1, rng);
  assert.equal(st.trials, 1);
  assert.equal(st.eventHits, 1);

  Core.stepTrials(st, 5, rng);
  assert.equal(st.trials, 6);
  assert.equal(st.eventHits, 3);
  assert.equal(st.longestHitStreak, 2);
  assert.equal(st.afterMissStreakTrials, 1);
  assert.equal(st.afterMissStreakHits, 1);

  Core.setTrackedIndex(st, 1); // switch to Tails
  assert.equal(st.eventHits, 3);
  assert.equal(st.longestHitStreak, 3);
});

test('without-replacement mode depletes and reshuffles finite marble bags accurately', () => {
  const marbles = Core.PRESET_EXPERIMENTS.marbles;
  const st = Core.createRunState(marbles, { withoutReplacement: true });
  Core.stepTrials(st, 6);
  // Every full bag of 6 marbles must yield exact counts [3, 2, 1]
  assert.deepEqual(st.counts, [3, 2, 1]);
  assert.equal(st.totalRemaining, 0);
  assert.equal(st.reshuffles, 0);

  Core.stepTrials(st, 6);
  assert.deepEqual(st.counts, [6, 4, 2]);
  assert.equal(st.reshuffles, 1);
});

test('standardError scales with 1/sqrt(N) and sampleSeriesByTrial preserves endpoints', () => {
  const se100 = Core.standardError(0.5, 100);
  const se400 = Core.standardError(0.5, 400);
  assert.ok(Math.abs(se100 / se400 - 2) < 1e-12);

  const band = Core.errorBand(0.5, 100);
  assert.ok(Math.abs(band.hi - 0.6) < 1e-12);
  assert.ok(Math.abs(band.lo - 0.4) < 1e-12);

  const series = Array.from({ length: 500 }, (_, idx) => ({ trial: idx + 1, observed: 0.5 }));
  const sampled = Core.sampleSeriesByTrial(series, 50);
  assert.equal(sampled[0].trial, 1);
  assert.equal(sampled[sampled.length - 1].trial, 500);
});

test('createMysteryCoin creates a valid binary coin experiment', () => {
  const m = Core.createMysteryCoin(() => 0.5);
  assert.ok([0.35, 0.50, 0.68].includes(m.trueP));
  assert.equal(m.experiment.outcomes.length, 2);
});
