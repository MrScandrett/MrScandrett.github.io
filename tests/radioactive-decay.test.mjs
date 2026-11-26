import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Core = require('../assets/js/lessons/radioactive-decay-core.js');

test('stepDecay and checkConservation balance mass and atomic numbers for all modes', () => {
  const alpha = Core.checkConservation(92, 238, 'alpha');
  assert.equal(alpha.daughterZ, 90);
  assert.equal(alpha.daughterA, 234);
  assert.equal(alpha.balanced, true);
  assert.equal(alpha.validElement, true);

  const betaMinus = Core.checkConservation(6, 14, 'beta-');
  assert.equal(betaMinus.daughterZ, 7);
  assert.equal(betaMinus.daughterA, 14);
  assert.equal(betaMinus.balanced, true);

  const betaPlus = Core.checkConservation(9, 18, 'beta+');
  assert.equal(betaPlus.daughterZ, 8);
  assert.equal(betaPlus.daughterA, 18);
  assert.equal(betaPlus.balanced, true);

  const gamma = Core.checkConservation(43, 99, 'gamma');
  assert.equal(gamma.daughterZ, 43);
  assert.equal(gamma.daughterA, 99);
  assert.equal(gamma.balanced, true);
});

test('all LAB_NUCLIDES have valid symbols, daughters, and decay modes', () => {
  assert.ok(Core.LAB_NUCLIDES.length >= 10);
  for (const nuc of Core.LAB_NUCLIDES) {
    assert.notEqual(Core.symbolFor(nuc.z), '?');
    assert.ok(Core.DECAY_MODES[nuc.real]);
    const cons = Core.checkConservation(nuc.z, nuc.a, nuc.real);
    assert.equal(cons.balanced, true);
    assert.equal(cons.validElement, true);
  }
});

test('all three decay chains conserve nucleons at every transition and end at stable lead', () => {
  const expectedEnds = {
    u238: { z: 82, a: 206, steps: 14, alphas: 8, betas: 6 },
    th232: { z: 82, a: 208, steps: 10, alphas: 6, betas: 4 },
    u235: { z: 82, a: 207, steps: 11, alphas: 7, betas: 4 }
  };

  for (const [key, exp] of Object.entries(expectedEnds)) {
    const chain = Core.DECAY_CHAINS[key];
    assert.ok(chain);
    assert.equal(chain.steps.length - 1, exp.steps);

    for (let i = 1; i < chain.steps.length; i++) {
      const prev = chain.steps[i - 1];
      const curr = chain.steps[i];
      const next = Core.stepDecay(prev.z, prev.a, curr.mode);
      assert.equal(curr.z, next.z, `${key} step ${i} Z mismatch`);
      assert.equal(curr.a, next.a, `${key} step ${i} A mismatch`);
    }

    const last = chain.steps[chain.steps.length - 1];
    assert.equal(last.z, exp.z);
    assert.equal(last.a, exp.a);
    assert.equal(last.stable, true);

    const summary = Core.summarizeChainProgress(key, exp.steps);
    assert.equal(summary.alphaCount, exp.alphas);
    assert.equal(summary.betaCount, exp.betas);
    assert.equal(summary.deltaA, last.a - chain.steps[0].a);
    assert.equal(summary.deltaZ, last.z - chain.steps[0].z);
  }
});

test('half-life and radiocarbon dating formulas match exact exponential decay', () => {
  assert.ok(Math.abs(Core.expectedRemaining(400, 5, 5) - 200) < 1e-10);
  assert.ok(Math.abs(Core.expectedRemaining(400, 15, 5) - 50) < 1e-10);
  assert.ok(Math.abs(Core.stepDecayProbability(5, 5) - 0.5) < 1e-10);
  assert.ok(Math.abs(Core.decayConstant(10) - Math.LN2 / 10) < 1e-12);
  assert.ok(Math.abs(Core.activityRate(100, 10) - 10 * Math.LN2) < 1e-10);

  const half = Core.radiocarbonAge(50);
  assert.ok(Math.abs(half.halfLives - 1) < 1e-10);
  assert.ok(Math.abs(half.ageYears - 5730) < 1e-8);
  assert.equal(half.reliable, true);

  const quarter = Core.radiocarbonAge(25);
  assert.ok(Math.abs(quarter.ageYears - 11460) < 1e-8);

  const zero = Core.radiocarbonAge(0);
  assert.equal(zero.outOfRange, true);
  assert.equal(zero.reliable, false);
});

test('shielding and inverse-square calculations behave physically', () => {
  const alphaPaper = Core.computeTransmission({ radiation: 'alpha', material: 'paper', thicknessMm: 0.2, distanceM: 1 });
  assert.equal(alphaPaper.shieldFraction, 0);
  assert.equal(alphaPaper.stoppedByShield, true);

  const betaPaper = Core.computeTransmission({ radiation: 'beta', material: 'paper', thicknessMm: 0.2, distanceM: 1 });
  assert.ok(betaPaper.shieldFraction > 0.8);

  const betaAl = Core.computeTransmission({ radiation: 'beta', material: 'aluminum', thicknessMm: 3, distanceM: 1 });
  assert.equal(betaAl.shieldFraction, 0);

  const gammaLead1HVL = Core.computeTransmission({ radiation: 'gamma', material: 'lead', thicknessMm: 12, distanceM: 1 });
  assert.ok(Math.abs(gammaLead1HVL.shieldFraction - 0.5) < 1e-10);

  const gammaLead2HVL2m = Core.computeTransmission({ radiation: 'gamma', material: 'lead', thicknessMm: 24, distanceM: 2 });
  assert.ok(Math.abs(gammaLead2HVL2m.shieldFraction - 0.25) < 1e-10);
  assert.ok(Math.abs(gammaLead2HVL2m.distanceFactor - 0.25) < 1e-10);
  assert.ok(Math.abs(gammaLead2HVL2m.combinedFraction - 0.0625) < 1e-10);
});

test('practice drill validates daughter nuclide numbers and decay modes', () => {
  const ra = Core.PRACTICE_PROBLEMS.find((p) => p.id === 'ra226-alpha');
  assert.equal(Core.checkPracticeAnswer(ra, { a: 222, z: 86 }).correct, true);
  assert.equal(Core.checkPracticeAnswer(ra, { a: 222, z: 88 }).correct, false);

  const th = Core.PRACTICE_PROBLEMS.find((p) => p.id === 'mode-th234');
  assert.equal(Core.checkPracticeAnswer(th, { mode: 'beta-' }).correct, true);
  assert.equal(Core.checkPracticeAnswer(th, { mode: 'alpha' }).correct, false);
});
