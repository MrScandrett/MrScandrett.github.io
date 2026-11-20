import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AP = require('../assets/js/lessons/archimedes-physics.js');

function approx(actual, expected, tol = 1e-2, msg = '') {
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `${msg ? msg + ': ' : ''}expected ${actual} to be within ${tol} of ${expected}`
  );
}

test('computeTankState handles floating ice, sinking steel, mercury buoyancy, egg brine, and neutral equilibrium', () => {
  // Ice (0.92 g/cm^3) in water (1.00 g/cm^3) -> 92% submerged at equilibrium
  const iceEq = AP.computeTankState({ massKg: 0.92, volumeL: 1.0, fluidDensity: 1.0, submergedFraction: 0.92 });
  assert.equal(iceEq.status, 'float');
  approx(iceEq.eqSubmergedFraction, 0.92, 1e-4, 'ice equilibrium submergence');
  approx(iceEq.buoyantForceN, iceEq.weightN, 1e-4, 'ice equilibrium F_b === W');
  approx(iceEq.apparentWeightN, 0, 1e-4);

  // Solid steel (7.85 kg, 1 L) sinks in water; F_b + F_N === W
  const steelWater = AP.computeTankState({ massKg: 7.85, volumeL: 1.0, fluidDensity: 1.0, submergedFraction: 1.0 });
  assert.equal(steelWater.status, 'sink');
  assert.ok(steelWater.normalForceN > 0, 'steel normal force > 0 on bottom');
  approx(steelWater.buoyantForceN + steelWater.normalForceN, steelWater.weightN, 1e-4, 'F_b + F_N === W');
  approx(steelWater.displacedVolumeL, 1.0, 1e-4);

  // Solid steel (7.85 g/cm^3) floats ~57.9% submerged in mercury (13.55 g/cm^3)
  const steelMercury = AP.computeTankState({ massKg: 7.85, volumeL: 1.0, fluidDensity: 13.55, submergedFraction: 7.85 / 13.55 });
  assert.equal(steelMercury.status, 'float');
  approx(steelMercury.eqSubmergedFraction, 7.85 / 13.55, 1e-4, 'steel equilibrium in mercury');
  approx(steelMercury.buoyantForceN, steelMercury.weightN, 1e-2);

  // Fresh egg (1.03 g/cm^3) sinks in fresh water, floats in Dead Sea brine (1.24 g/cm^3)
  const eggFresh = AP.computeTankState({ massKg: 1.03, volumeL: 1.0, fluidDensity: 1.0, submergedFraction: 1.0 });
  assert.equal(eggFresh.status, 'sink');
  const eggDeadSea = AP.computeTankState({ massKg: 1.03, volumeL: 1.0, fluidDensity: 1.24, submergedFraction: 1.03 / 1.24 });
  assert.equal(eggDeadSea.status, 'float');
  approx(eggDeadSea.eqSubmergedFraction, 1.03 / 1.24, 1e-3);

  // Neutral buoyancy at 1.00 g/cm^3 in 1.00 g/cm^3 water
  const neutral = AP.computeTankState({ massKg: 1.0, volumeL: 1.0, fluidDensity: 1.0, submergedFraction: 1.0 });
  assert.equal(neutral.status, 'neutral');
  approx(neutral.eqSubmergedFraction, 1.0, 1e-4);
  approx(neutral.buoyantForceN, neutral.weightN, 1e-4);
});

test('stepVerticalBody settles floating cork near equilibrium and sinks granite to tank floor', () => {
  const tankParams = {
    blockH: 56,
    waterTop: 120,
    tankBottom: 340,
    risePerLiter: 10,
    volumeL: 1.0,
    fluidDensity: 1.0,
    viscosity: 0.08,
    pxPerMeter: 55
  };

  // Cork dropped above water should settle near 25% submergence
  let corkState = { y: 70, vy: 0, inWater: false };
  for (let i = 0; i < 400; i += 1) {
    corkState = AP.stepVerticalBody(corkState, { ...tankParams, massKg: 0.25 }, 0.016);
  }
  approx(corkState.submergedFraction, 0.25, 0.02, 'cork settled submergence');
  approx(corkState.vy, 0, 0.5, 'cork velocity damped to rest');

  // Granite dropped into water should hit tank floor with onFloor = true
  let rockState = { y: 70, vy: 0, inWater: false };
  for (let i = 0; i < 200; i += 1) {
    rockState = AP.stepVerticalBody(rockState, { ...tankParams, massKg: 2.70 }, 0.016);
  }
  assert.equal(rockState.onFloor, true);
  assert.equal(rockState.submergedFraction, 1.0);
});

test('computeCrownAlloy & solveGoldFractionFromDensity match Archimedes & Galileo hydrostatic math', () => {
  // Pure gold 1000 g: 51.81 cm^3 displaced, 0 tilt
  const pure = AP.computeCrownAlloy({ massG: 1000, goldFraction: 1.0, fluidDensity: 1.0 });
  approx(pure.volumeCm3, 1000 / 19.30, 0.05, 'pure gold volume');
  approx(pure.refVolumeCm3, pure.volumeCm3, 1e-4);
  approx(pure.extraVolumeCm3, 0, 1e-4);
  approx(pure.torqueBalanceDeg, 0, 1e-4);
  assert.equal(pure.isPureGold, true);

  // 70% gold / 30% silver alloy: larger volume (~64.87 cm^3), lower apparent weight, inverse recovers 0.70
  const alloy = AP.computeCrownAlloy({ massG: 1000, goldFraction: 0.70, fluidDensity: 1.0 });
  const expectedVol = 1000 * (0.70 / 19.30 + 0.30 / 10.49);
  approx(alloy.volumeCm3, expectedVol, 0.05, '70/30 alloy volume');
  assert.ok(alloy.buoyantForceN > alloy.refBuoyantForceN, 'alloy receives greater buoyant force');
  assert.ok(alloy.apparentWeightN < alloy.refApparentWeightN, 'alloy has lighter apparent weight');
  assert.ok(alloy.torqueBalanceDeg > 0, 'pure gold reference tips down on balance');
  assert.equal(alloy.isPureGold, false);

  const solvedFraction = AP.solveGoldFractionFromDensity(alloy.density);
  approx(solvedFraction, 0.70, 0.001, 'inverse gold fraction solver');
});

test('computeShipHull handles solid steel sinking, hollow hull floating, and freshwater Plimsoll crossing', () => {
  // Solid steel (hollowness = 0) has avgDensity = 7.85 and sinks
  const solid = AP.computeShipHull({ hullMassTons: 500, hollowness: 0, cargoTons: 0, fluidDensity: 1.025 });
  approx(solid.avgDensity, 7.85, 1e-2, 'solid steel avg density');
  assert.equal(solid.status, 'sunk');

  // Hollow steel ship with 400 t cargo floats safely in ocean seawater
  const ship = AP.computeShipHull({ hullMassTons: 500, hollowness: 0.85, cargoTons: 400, fluidDensity: 1.025 });
  assert.ok(ship.avgDensity < 1.025, 'hollow ship avg density < seawater');
  assert.equal(ship.status, 'safe');

  // Near Plimsoll limit (avgDensity ~ 0.79): safe in seawater (1.025) vs overloaded in freshwater (1.00)
  // Solve cargo so avgDensity is ~0.79 at hollowness 0.75:
  const baseVol = AP.computeShipHull({ hullMassTons: 500, hollowness: 0.75, cargoTons: 0, fluidDensity: 1.025 }).outerVolumeM3;
  const targetCargo = 0.79 * baseVol - 500;
  const oceanCheck = AP.computeShipHull({ hullMassTons: 500, hollowness: 0.75, cargoTons: targetCargo, fluidDensity: 1.025 });
  const riverCheck = AP.computeShipHull({ hullMassTons: 500, hollowness: 0.75, cargoTons: targetCargo, fluidDensity: 1.00 });
  approx(oceanCheck.avgDensity, 0.79, 1e-3);
  assert.equal(oceanCheck.status, 'safe');
  assert.equal(riverCheck.status, 'overloaded');
});

test('computeSubmarine balances neutral buoyancy at ~48.8% ballast and scales pressure with depth', () => {
  const neutral = AP.computeSubmarine({ ballastPct: 48.8, depthM: 120, fluidDensity: 1.025 });
  assert.equal(neutral.state, 'neutral');
  approx(neutral.avgDensity, 1.025, 0.005);

  const surface = AP.computeSubmarine({ ballastPct: 10, depthM: 0, fluidDensity: 1.0 });
  assert.equal(surface.state, 'positive');
  approx(surface.pressureAtm, 1.0, 0.01);

  const deep10 = AP.computeSubmarine({ ballastPct: 80, depthM: 10, fluidDensity: 1.0 });
  assert.equal(deep10.state, 'negative');
  approx(deep10.pressureAtm, 1.968, 0.02, '+~1 atm per 10 m depth');
});
