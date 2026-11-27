import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRESETS,
  MISSIONS,
  computeClimate,
  computeEnergyBudget,
  computeLocalProbe,
  evaluateMissions,
} from '../assets/js/lessons/climate-model.mjs';

test('PRESETS produce physically calibrated climate baselines', () => {
  const pre = computeClimate(PRESETS.preindustrial);
  assert.ok(Math.abs(pre.totalForcing) < 1e-6);
  assert.ok(Math.abs(pre.tempAnomaly) < 1e-6);
  assert.equal(pre.seaLevel, 0);
  assert.ok(Math.abs(pre.oceanPH - 8.18) < 1e-6);
  assert.equal(pre.iceLeft, 100);

  const today = computeClimate(PRESETS.today);
  assert.ok(today.totalForcing >= 2.4 && today.totalForcing <= 3.0, `today forcing=${today.totalForcing}`);
  assert.ok(today.tempAnomaly >= 1.1 && today.tempAnomaly <= 1.5, `today temp=${today.tempAnomaly}`);
  assert.ok(today.oceanPH >= 8.04 && today.oceanPH <= 8.08, `today pH=${today.oceanPH}`);
  assert.ok(today.seaLevel >= 0.18 && today.seaLevel <= 0.35, `today seaLevel=${today.seaLevel}`);

  const paris = computeClimate(PRESETS.paris);
  assert.ok(paris.tempAnomaly >= 1.3 && paris.tempAnomaly <= 1.7, `paris temp=${paris.tempAnomaly}`);

  const bau = computeClimate(PRESETS.bau);
  assert.ok(bau.tempAnomaly >= 3.8, `bau temp=${bau.tempAnomaly}`);
  assert.ok(bau.oceanPH < 7.95, `bau pH=${bau.oceanPH}`);

  const iceage = computeClimate(PRESETS.iceage);
  assert.ok(iceage.tempAnomaly <= -2.0, `iceage temp=${iceage.tempAnomaly}`);
  assert.ok(iceage.seaLevel < 0, `iceage seaLevel=${iceage.seaLevel}`);
});

test('solar irradiance change scales by ~2.38 W/m² per 1% TSI', () => {
  const base = computeClimate(PRESETS.preindustrial);
  const bright = computeClimate({ ...PRESETS.preindustrial, solar: 101 });
  const deltaRaw = bright.rawForcing - base.rawForcing;
  assert.ok(Math.abs(deltaRaw - 2.38) < 0.05, `expected ~2.38 W/m², got ${deltaRaw}`);
});

test('computeEnergyBudget conserves incoming = reflected + absorbed solar and responds to CO2', () => {
  const preState = PRESETS.preindustrial;
  const preClim = computeClimate(preState);
  const preEB = computeEnergyBudget(preState, preClim);

  assert.ok(Math.abs(preEB.reflectedSolar + preEB.absorbedSolar - preEB.incomingSolar) < 1e-6);
  assert.ok(Math.abs(preEB.outgoingIR - preEB.absorbedSolar) < 1e-3);

  const bauState = PRESETS.bau;
  const bauClim = computeClimate(bauState);
  const bauEB = computeEnergyBudget(bauState, bauClim);

  assert.ok(bauEB.greenhouseTrapped > preEB.greenhouseTrapped);
  assert.ok(bauEB.backRadiation > preEB.backRadiation);
  assert.ok(bauEB.netImbalance > 4.0);
});

test('computeLocalProbe captures Arctic and continental amplification', () => {
  const state = PRESETS.today;
  const climate = computeClimate(state);

  const arcticLand = computeLocalProbe({ lat: 76, lon: -42, isLand: true, state, climate });
  const tropicalOcean = computeLocalProbe({ lat: 5, lon: -140, isLand: false, state, climate });

  assert.ok(arcticLand.multiplier / tropicalOcean.multiplier > 2.0);
  assert.ok(arcticLand.localAnomaly > tropicalOcean.localAnomaly * 2.0);
  assert.ok(arcticLand.localAlbedo > tropicalOcean.localAlbedo);
});

test('evaluateMissions unlocks all four inquiry missions under target conditions', () => {
  assert.equal(MISSIONS.length, 4);

  const m1 = evaluateMissions({
    state: { co2: 390, solar: 100, ice: 70, deforest: 10, ch4: 1600, ocean: 70 },
    climate: computeClimate({ co2: 390, solar: 100, ice: 70, deforest: 10, ch4: 1600, ocean: 70 }),
    mode: 'weather',
    feedbackDriftEnabled: false,
    probedArctic: false,
    probedTropics: false,
    userInteracted: true,
  });
  assert.ok(m1.has('paris-rescue'));

  const m2 = evaluateMissions({
    state: PRESETS.iceage,
    climate: computeClimate(PRESETS.iceage),
    mode: 'weather',
    feedbackDriftEnabled: false,
    probedArctic: false,
    probedTropics: false,
    userInteracted: true,
  });
  assert.ok(m2.has('snowball-earth'));

  const m3 = evaluateMissions({
    state: PRESETS.today,
    climate: computeClimate(PRESETS.today),
    mode: 'temperature',
    feedbackDriftEnabled: false,
    probedArctic: true,
    probedTropics: true,
    userInteracted: true,
  });
  assert.ok(m3.has('arctic-amp'));

  const m4 = evaluateMissions({
    state: PRESETS.bau,
    climate: computeClimate(PRESETS.bau),
    mode: 'carbon',
    feedbackDriftEnabled: true,
    probedArctic: false,
    probedTropics: false,
    userInteracted: true,
  });
  assert.ok(m4.has('tipping-drift'));
});
