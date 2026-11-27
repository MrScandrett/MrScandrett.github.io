import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCENARIOS,
  COAL_RANKS,
  TRAP_TYPES,
  MISSIONS,
  computeBurialState,
  computeWindowDepths,
  getTrapProfile,
  evaluateWellDrill,
  computeTimescaleComparison,
  evaluateMissions,
} from '../assets/js/lessons/fossil-fuel-model.mjs';

test('computeBurialState calculates temperature, pressure, and coal rank progression', () => {
  const peat = computeBurialState({ material: 'coal', depthM: 300, gradientCPerKm: 25, durationMyr: 15 });
  assert.equal(peat.stageId, 'peat');
  assert.equal(peat.tempC, 23);
  assert.ok(peat.moisturePct > 55);
  assert.ok(peat.compactionThicknessM > 6);

  const bit = computeBurialState({ material: 'coal', depthM: 2900, gradientCPerKm: 30, durationMyr: 120 });
  assert.equal(bit.stageId, 'bituminous');
  assert.ok(bit.carbonPct >= 75 && bit.carbonPct <= 88);

  const anth = computeBurialState({ material: 'coal', depthM: 4900, gradientCPerKm: 35, durationMyr: 220 });
  assert.equal(anth.stageId, 'anthracite');
  assert.ok(anth.carbonPct >= 90);
  assert.ok(anth.energyMJkg >= 30);

  const graph = computeBurialState({ material: 'coal', depthM: 6000, gradientCPerKm: 42, durationMyr: 250 });
  assert.equal(graph.stageId, 'graphite');
  assert.equal(graph.energyMJkg, 0);
});

test('computeBurialState models kerogen cracking across oil and gas windows', () => {
  const immature = computeBurialState({ material: 'petroleum', depthM: 500, gradientCPerKm: 25, durationMyr: 40 });
  assert.equal(immature.stageId, 'immature');
  assert.ok(immature.kerogenPct > immature.oilYieldPct);

  const oil = computeBurialState(SCENARIOS['peak-oil']);
  assert.equal(oil.stageId, 'oil');
  assert.ok(oil.oilYieldPct > oil.gasYieldPct);
  assert.equal(oil.kerogenPct + oil.oilYieldPct + oil.gasYieldPct + oil.graphitePct, 100);

  const gas = computeBurialState(SCENARIOS['deep-gas']);
  assert.equal(gas.stageId, 'gas');
  assert.ok(gas.gasYieldPct > gas.oilYieldPct);
  assert.equal(gas.kerogenPct + gas.oilYieldPct + gas.gasYieldPct + gas.graphitePct, 100);

  const over = computeBurialState(SCENARIOS['overcooked-graphite']);
  assert.equal(over.stageId, 'overcooked');
  assert.ok(over.graphitePct > over.oilYieldPct);
});

test('computeWindowDepths shifts oil window shallower as geothermal gradient increases', () => {
  const cool = computeWindowDepths('petroleum', 20, 60);
  const hot = computeWindowDepths('petroleum', 42, 60);
  const coolOil = cool.find((w) => w.id === 'oil');
  const hotOil = hot.find((w) => w.id === 'oil');
  assert.ok(hotOil.topM < coolOil.topM);
  assert.ok(hotOil.bottomM < coolOil.bottomM);
});

test('COAL_RANKS covers 5 progressive ranks with shrinking seam thickness', () => {
  assert.equal(COAL_RANKS.length, 5);
  for (let i = 1; i < COAL_RANKS.length; i++) {
    assert.ok(COAL_RANKS[i].thicknessFrom10m < COAL_RANKS[i - 1].thicknessFrom10m);
    assert.ok(COAL_RANKS[i].carbonPct > COAL_RANKS[i - 1].carbonPct);
  }
});

test('evaluateWellDrill resolves gas cap, crude oil, brine, salt, and fractured seal seeps', () => {
  for (const trapId of Object.keys(TRAP_TYPES)) {
    const profile = getTrapProfile(trapId);
    const oilStrike = evaluateWellDrill({
      trapId,
      wellX: profile.suggestedOilWell.x,
      targetY: profile.suggestedOilWell.y,
      caprockIntact: true,
      porosityPct: 22,
    });
    assert.equal(oilStrike.outcome, 'oil', `Expected oil strike for ${trapId}`);

    const seep = evaluateWellDrill({
      trapId,
      wellX: profile.suggestedOilWell.x,
      targetY: profile.suggestedOilWell.y,
      caprockIntact: false,
      porosityPct: 22,
    });
    assert.equal(seep.outcome, 'seep', `Expected seep when caprock fractured for ${trapId}`);
  }

  const gasStrike = evaluateWellDrill({
    trapId: 'anticline',
    wellX: 0.5,
    targetY: 0.31,
    caprockIntact: true,
  });
  assert.equal(gasStrike.outcome, 'gas');

  const saltHit = evaluateWellDrill({
    trapId: 'salt-dome',
    wellX: 0.5,
    targetY: 0.5,
    caprockIntact: true,
  });
  assert.equal(saltHit.outcome, 'salt');
});

test('computeTimescaleComparison and evaluateMissions return accurate metrics', () => {
  const ts = computeTimescaleComparison({ formationMyr: 300, consumptionYears: 250 });
  assert.equal(ts.ratio, 1_200_000);
  assert.ok(ts.clockFormatted.includes('ms'));
  assert.ok(ts.biomassKgPerLiter > 20000);

  const m = evaluateMissions({ 'crack-oil': true, 'strike-oil': true });
  assert.equal(m.count, 2);
  assert.equal(m.total, MISSIONS.length);
  assert.deepEqual(m.completedIds, ['crack-oil', 'strike-oil']);
});
