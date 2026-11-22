import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const SF = require('../assets/js/lessons/sensor-fusion-engine.js');

test('kalmanStep learns constant gyro bias while tracking stationary tilt', () => {
  const kf = SF.createKalmanState();
  const dt = 0.01;
  const trueAngleRad = 15 / SF.DEG;
  const trueBiasRad = 5 / SF.DEG;
  const rMeasure = Math.pow(3 / SF.DEG, 2);

  for (let i = 0; i < 1200; i++) {
    SF.kalmanStep({
      state: kf,
      gyroRate: trueBiasRad,
      accelAngle: trueAngleRad,
      dt,
      rMeasure
    });
  }

  assert.ok(Math.abs(kf.angle - trueAngleRad) < 0.01, `expected angle ~${trueAngleRad}, got ${kf.angle}`);
  assert.ok(Math.abs(kf.bias - trueBiasRad) < 0.01, `expected bias ~${trueBiasRad}, got ${kf.bias}`);
});

test('crossoverTimeConstant returns tau = alpha * dt / (1 - alpha)', () => {
  const tau = SF.crossoverTimeConstant(0.98, 0.01);
  assert.ok(Math.abs(tau - 0.49) < 1e-6);
  const fastTau = SF.crossoverTimeConstant(0.5, 0.01);
  assert.ok(Math.abs(fastTau - 0.01) < 1e-6);
});

test('complementaryStep rejects brief accelerometer shock when alpha is high', () => {
  const est0 = 0;
  const shocked = SF.complementaryStep({
    est: est0,
    gyroRate: 0,
    accelAngle: 0.5, // ~28 deg bump
    dt: 0.01,
    alpha: 0.98
  });
  assert.ok(Math.abs(shocked - 0.01) < 1e-6);
});

test('rmseDeg computes root-mean-square error in degrees', () => {
  const err = SF.rmseDeg([1 / SF.DEG, -1 / SF.DEG, 1 / SF.DEG, -1 / SF.DEG]);
  assert.ok(Math.abs(err - 1.0) < 1e-6);
});
