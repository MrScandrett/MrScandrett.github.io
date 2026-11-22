import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const MP = require('../assets/js/lessons/conservation-of-momentum-physics.js');

function approx(actual, expected, tol = 1e-3, msg = '') {
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `${msg ? msg + ': ' : ''}expected ${actual} to be within ${tol} of ${expected}`
  );
}

test('compute1DCollision conserves momentum and impulse across elastic, partial, and perfectly inelastic regimes', () => {
  // Equal-mass elastic velocity swap
  const swap = MP.compute1DCollision({ m1: 2.0, v1: 6.0, m2: 2.0, v2: 0.0, e: 1.0 });
  approx(swap.v1After, 0.0, 1e-6, 'equal mass swap v1After');
  approx(swap.v2After, 6.0, 1e-6, 'equal mass swap v2After');
  approx(swap.pTotalAfter, swap.pTotalBefore, 1e-6, 'total momentum conserved');
  approx(swap.keLost, 0.0, 1e-6, 'elastic collision loses zero KE');
  approx(swap.impulseOn1, -swap.impulseOn2, 1e-6, 'Newton 3rd Law equal-opposite impulse');

  // Heavy cart hits stationary light cart elastically -> light cart near 2 * v1
  const heavyLight = MP.compute1DCollision({ m1: 6.0, v1: 5.0, m2: 0.5, v2: 0.0, e: 1.0 });
  approx(heavyLight.pTotalAfter, heavyLight.pTotalBefore, 1e-6);
  approx(heavyLight.keLost, 0.0, 1e-6);
  assert.ok(heavyLight.v2After > 9.0 && heavyLight.v2After < 10.0, 'light target approaches 2*v1');

  // Partial restitution (e = 0.5) head-on
  const partial = MP.compute1DCollision({ m1: 2.0, v1: 5.0, m2: 3.0, v2: -4.0, e: 0.5 });
  approx(partial.pTotalAfter, partial.pTotalBefore, 1e-6, 'partial collision total momentum');
  approx(partial.impulseOn1, -partial.impulseOn2, 1e-6);
  assert.ok(partial.keLost > 0, 'inelastic collision loses kinetic energy');
  approx((partial.v2After - partial.v1After) / (5.0 - (-4.0)), 0.5, 1e-6, 'restitution ratio matches e');

  // Perfectly inelastic (e = 0)
  const stick = MP.compute1DCollision({ m1: 3.0, v1: 6.0, m2: 2.0, v2: 0.0, e: 0.0 });
  assert.equal(stick.stuck, true);
  approx(stick.v1After, stick.vCom, 1e-6);
  approx(stick.v2After, stick.vCom, 1e-6);
  approx(stick.pTotalAfter, stick.pTotalBefore, 1e-6);
  approx(stick.keLostPct, 40.0, 1e-3, '3kg hitting stationary 2kg loses 40% KE');
});

test('step1DAirTrack keeps COM velocity constant on open track and flags external impulse on walls', () => {
  let track = {
    x1: 2.5,
    x2: 8.5,
    v1: 5.0,
    v2: -3.0,
    m1: 2.0,
    m2: 3.0,
    r1M: 0.35,
    r2M: 0.35,
    e: 1.0,
    trackLengthM: 12.0,
    boundaryMode: 'open',
    stuck: false,
    collided: false,
    wallHit: false,
    externalImpulse: 0
  };
  const comBefore = MP.computeCenterOfMass([
    { m: track.m1, x: track.x1, v: track.v1 },
    { m: track.m2, x: track.x2, v: track.v2 }
  ]);
  for (let i = 0; i < 80; i += 1) {
    track = MP.step1DAirTrack(track, 0.02);
  }
  assert.equal(track.collided, true);
  assert.equal(track.wallHit, false);
  approx(track.externalImpulse, 0, 1e-6);
  const comAfter = MP.computeCenterOfMass([
    { m: track.m1, x: track.x1, v: track.v1 },
    { m: track.m2, x: track.x2, v: track.v2 }
  ]);
  approx(comAfter.vx, comBefore.vx, 1e-6, 'v_COM unchanged after internal collision');
  approx(comAfter.px, comBefore.px, 1e-6, 'total p unchanged after internal collision');

  // With walls, hitting the wall records non-zero external impulse
  let walled = Object.assign({}, track, { boundaryMode: 'walls', x1: 1.0, v1: -8.0, x2: 9.0, v2: 2.0, externalImpulse: 0, wallHit: false });
  for (let i = 0; i < 30; i += 1) {
    walled = MP.step1DAirTrack(walled, 0.02);
  }
  assert.equal(walled.wallHit, true);
  assert.ok(Math.abs(walled.externalImpulse) > 0, 'wall contact supplies external impulse');
});

test('computeRecoil balances opposing momenta and allocates more kinetic energy to the lighter cart', () => {
  const recoil = MP.computeRecoil({ m1: 1.5, m2: 4.5, springEnergyJ: 48 });
  approx(recoil.pTotal, 0, 1e-6, 'recoil from rest sums to zero');
  approx(recoil.p1, -recoil.p2, 1e-6);
  approx(recoil.keTotal, 48, 1e-6, 'total KE matches stored spring energy');
  approx(recoil.ke1Share, 75, 1e-4, 'lighter 1.5kg cart gets 4.5/(1.5+4.5) = 75% of KE');
  approx(recoil.ke2Share, 25, 1e-4);
});

test('computeImpulseCurve matches numerical force-time integral, scaling with dt and restitution', () => {
  const foam = MP.computeImpulseCurve({ massKg: 4, speedMs: 6, durationS: 0.14, restitution: 0, safeForceN: 250 });
  const steel = MP.computeImpulseCurve({ massKg: 4, speedMs: 6, durationS: 0.012, restitution: 0, safeForceN: 250 });
  const airbag = MP.computeImpulseCurve({ massKg: 4, speedMs: 6, durationS: 0.24, restitution: 0, safeForceN: 250 });
  const rubber = MP.computeImpulseCurve({ massKg: 4, speedMs: 6, durationS: 0.14, restitution: 1.0, safeForceN: 250 });

  // Trapezoidal integral of F(t) over 400 steps equals impulse J = m * v0 * (1 + e)
  const steps = 400;
  const h = foam.durationS / steps;
  let integral = 0;
  for (let i = 0; i < steps; i += 1) {
    integral += 0.5 * (foam.forceAt(i * h) + foam.forceAt((i + 1) * h)) * h;
  }
  approx(integral, foam.impulseNs, 1e-2, 'numerical integral of F(t) equals impulse J');
  approx(foam.impulseNs, 24, 1e-6);

  // Doubling duration halves peakForce while preserving impulse
  const doubledDt = MP.computeImpulseCurve({ massKg: 4, speedMs: 6, durationS: 0.28, restitution: 0, safeForceN: 250 });
  approx(doubledDt.impulseNs, foam.impulseNs, 1e-6);
  approx(doubledDt.peakForceN, foam.peakForceN * 0.5, 1e-6);

  // Elastic rebound doubles impulse compared to dead stop
  approx(rubber.impulseNs, 2 * foam.impulseNs, 1e-6);

  // Survival thresholds match safety intuition
  assert.equal(steel.survives, false);
  assert.equal(airbag.survives, true);
});

test('compute2DCollision conserves px and py independently and produces a 90-deg equal-mass elastic split', () => {
  // Equal-mass elastic glancing collision: disk 1 traveling +x hits stationary disk 2 off-center
  const glancing = MP.compute2DCollision({
    m1: 2.0, x1: 0.0, y1: 0.0, vx1: 5.0, vy1: 0.0,
    m2: 2.0, x2: 0.85, y2: 0.52, vx2: 0.0, vy2: 0.0,
    e: 1.0
  });
  assert.equal(glancing.collided, true);
  approx(glancing.pxAfter, glancing.pxBefore, 1e-6, 'x-momentum conserved');
  approx(glancing.pyAfter, glancing.pyBefore, 1e-6, 'y-momentum conserved');
  approx(glancing.keAfter, glancing.keBefore, 1e-6, 'elastic 2D KE conserved');
  approx(glancing.separationDeg, 90.0, 1e-4, 'equal-mass elastic glancing collision splits at 90 degrees');

  // Asymmetric inelastic 2D collision still conserves vector momentum
  const asym = MP.compute2DCollision({
    m1: 4.0, x1: 0.0, y1: 0.0, vx1: 6.0, vy1: 1.0,
    m2: 1.5, x2: 0.9, y2: -0.4, vx2: -2.0, vy2: 0.5,
    e: 0.4
  });
  approx(asym.pxAfter, asym.pxBefore, 1e-6);
  approx(asym.pyAfter, asym.pyBefore, 1e-6);
  assert.ok(asym.keLostPct > 0);
});

test('Rocket propulsion satisfies Tsiolkovsky equation and conserves system momentum and COM across pulses', () => {
  const burn = MP.computeRocketBurn({ dryMassKg: 1000, fuelMassKg: 3000, exhaustSpeedMs: 3000, burnFraction: 1 });
  approx(burn.deltaVMs, 3000 * Math.log(4), 1e-6, 'Tsiolkovsky delta-v');

  // Fire 10 discrete pulses from rest in deep space and let particles drift
  let rocket = { m: 4000, x: 0, vx: 0 };
  const exhaust = [];
  const ve = 3000;
  for (let i = 0; i < 10; i += 1) {
    const step = MP.stepRocketPulse({
      rocketMassKg: rocket.m,
      rocketVx: rocket.vx,
      pulseMassKg: 150,
      exhaustSpeedMs: ve
    });
    exhaust.push({ m: step.pulseMassKg, x: rocket.x, vx: step.pulseVx });
    rocket.m = step.nextMassKg;
    rocket.vx = step.nextVx;
    // Advance everything by 1 s
    rocket.x += rocket.vx;
    for (const p of exhaust) p.x += p.vx;
  }

  const com = MP.computeCenterOfMass([rocket, ...exhaust]);
  approx(com.px, 0, 1e-6, 'rocket + exhaust momentum sums to 0');
  approx(com.x, 0, 1e-6, 'combined system center of mass stays fixed at origin');
  approx(com.vx, 0, 1e-6);
});

test('computeRelativisticMomentum reproduces classical limits at low speed, gamma=2 at sqrt(3)/2 c, and E^2=(pc)^2+(mc^2)^2', () => {
  const low = MP.computeRelativisticMomentum({ massKg: 2.0, beta: 0.001 });
  approx(low.gamma, 1.0, 1e-5);
  assert.ok(Math.abs(low.pRelativistic - low.pClassical) / low.pClassical < 1e-4, 'low speed matches p=mv');
  assert.ok(Math.abs(low.keRelativisticJ - low.keClassicalJ) / low.keClassicalJ < 1e-4);

  const g2 = MP.computeRelativisticMomentum({ massKg: 1.0, beta: Math.sqrt(3) / 2 });
  approx(g2.gamma, 2.0, 1e-6, 'beta = sqrt(3)/2 gives gamma = 2');

  for (const beta of [0, 0.25, 0.7, 0.95, 0.999]) {
    const rel = MP.computeRelativisticMomentum({ massKg: 3.5, beta });
    approx(rel.energyCheckJ / rel.totalEnergyJ, 1.0, 1e-9, `energy-momentum identity holds at beta=${beta}`);
  }

  const lhc = MP.computeRelativisticMomentum({ massKg: MP.PROTON_MASS_KG, beta: 0.999999991 });
  assert.ok(lhc.gamma > 7400 && lhc.gamma < 7500);
});
