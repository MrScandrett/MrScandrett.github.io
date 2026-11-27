import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Model = require('../assets/js/lessons/sphere-systems-model.js');

test('buildGeodesicMesh satisfies Euler topology and converges toward 4π surface area', () => {
  let prevError = Infinity;
  for (let f = 1; f <= 5; f++) {
    const mesh = Model.buildGeodesicMesh(f);
    assert.equal(mesh.faceCount, 20 * f * f);
    assert.equal(mesh.vertexCount, 10 * f * f + 2);
    assert.equal(mesh.edgeCount, 30 * f * f);
    assert.equal(mesh.vertexCount - mesh.edgeCount + mesh.faceCount, 2);
    assert.ok(mesh.areaErrorPct > 0 && mesh.areaErrorPct < prevError);
    prevError = mesh.areaErrorPct;
  }
  const f4 = Model.buildGeodesicMesh(4);
  const f5 = Model.buildGeodesicMesh(5);
  assert.ok(f4.areaErrorPct < 2.0, `Expected freq 4 error < 2.0%, got ${f4.areaErrorPct}`);
  assert.ok(f5.areaErrorPct < 1.5, `Expected freq 5 error < 1.5%, got ${f5.areaErrorPct}`);
});

test('computeSphereGeometry and compareRadiusScaling obey square-cube scaling and unit conversions', () => {
  const g40 = Model.computeSphereGeometry({ radiusM: 40, coveragePct: 60, frequency: 3 });
  const g80 = Model.computeSphereGeometry({ radiusM: 80, coveragePct: 60, frequency: 3 });
  const ratio = Model.compareRadiusScaling(40, 80);

  assert.equal(ratio.radiusRatio, 2);
  assert.equal(ratio.areaRatio, 4);
  assert.equal(ratio.volumeRatio, 8);
  assert.ok(Math.abs(g80.areaM2 / g40.areaM2 - 4) < 1e-9);
  assert.ok(Math.abs(g80.coveredAreaM2 / g40.coveredAreaM2 - 4) < 1e-9);
  assert.ok(Math.abs(g80.volumeM3 / g40.volumeM3 - 8) < 1e-9);
  assert.ok(Math.abs(g40.coveredAreaM2 - 0.6 * g40.areaM2) < 1e-9);
  assert.ok(Math.abs(g40.areaFt2 / g40.areaM2 - Model.SQM_TO_SQFT) < 1e-9);

  const hemi = Model.computeSphereGeometry({ radiusM: 50, coveragePct: 50, frequency: 2 });
  assert.ok(Math.abs(hemi.capHalfAngleDeg - 90) < 1e-6);
});

test('computeAcuityMetrics resolves angular pixel pitch and 1-arcminute threshold', () => {
  const far = Model.computeAcuityMetrics({ distanceM: 40, pixelPitchMm: 10, fovDeg: 160, screenAreaM2: 15000 });
  const near = Model.computeAcuityMetrics({ distanceM: 10, pixelPitchMm: 10, fovDeg: 160, screenAreaM2: 15000 });
  assert.ok(far.arcmin < 1.0 && far.isSeamless);
  assert.ok(near.arcmin > 3.0 && !near.isSeamless);

  const atLimit = Model.computeAcuityMetrics({
    distanceM: far.minSeamlessDistM,
    pixelPitchMm: 10,
    fovDeg: 160,
    screenAreaM2: 15000
  });
  assert.ok(Math.abs(atLimit.arcmin - 1.0) < 1e-4);
});

test('computeBeamforming and computeArrayFactor steer main lobe and detect spatial aliasing', () => {
  const highFreq = Model.computeBeamforming({
    mode: 'steered',
    driverCount: 10,
    frequencyHz: 1500,
    steerAngleDeg: 25,
    apertureM: 6
  });
  const lowFreq = Model.computeBeamforming({
    mode: 'steered',
    driverCount: 16,
    frequencyHz: 300,
    steerAngleDeg: 25,
    apertureM: 6
  });

  assert.ok(Math.abs(highFreq.wavelengthM - 343 / 1500) < 1e-9);
  assert.ok(highFreq.beamwidthDeg < lowFreq.beamwidthDeg);
  assert.equal(highFreq.hasGratingLobe, true);
  assert.equal(lowFreq.hasGratingLobe, false);

  const onTarget = Model.computeArrayFactor(25, highFreq);
  const offTarget = Model.computeArrayFactor(-20, highFreq);
  assert.ok(Math.abs(onTarget - 1.0) < 1e-6);
  assert.ok(offTarget < onTarget);

  const pattern = Model.samplePolarPattern(highFreq, 101);
  assert.equal(pattern.length, 101);
});

test('computeChannelCapacity obeys Shannon-Hartley linear B vs logarithmic S/N scaling', () => {
  const base = Model.computeChannelCapacity({ bandwidthMHz: 10, snrLinear: 10 });
  const expected = 10 * Math.log2(11);
  assert.ok(Math.abs(base.capacityMbps - expected) < 1e-9);
  assert.ok(Math.abs(base.doubleBandwidthMbps - 2 * base.capacityMbps) < 1e-9);
  assert.ok(base.doubleSnrMbps < base.doubleBandwidthMbps);
  assert.ok(base.doubleSnrGainPct > 0 && base.doubleSnrGainPct < 100);
});

test('evaluateMissions and gradeQuiz track all 5 missions and 6 questions accurately', () => {
  const empty = Model.evaluateMissions({});
  assert.equal(empty.completedCount, 0);
  assert.equal(empty.totalCount, 5);

  const full = Model.evaluateMissions({
    doubledRadius: true,
    maxFrequencyUsed: 4,
    arcmin: 0.85,
    acousticMode: 'steered',
    steerAngleDeg: 30,
    usedDoubleB: true,
    usedDoubleSnr: true
  });
  assert.equal(full.completedCount, 5);

  const allRight = {};
  Model.QUIZ_QUESTIONS.forEach((q) => { allRight[q.id] = q.answer; });
  assert.equal(Model.gradeQuiz(allRight).correct, 6);
  assert.equal(Model.gradeQuiz({}).correct, 0);
});
