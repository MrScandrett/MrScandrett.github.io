import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Physics = require('../assets/js/lessons/robot-build-physics.js');

test('evaluateServo computes true N·m without 10x scaling error', () => {
  const nominal = Physics.evaluateServo({ angle: 90, arm: 25, load: 100 });
  assert.ok(Math.abs(nominal.peakMomentNm - 0.0245) < 0.0005);
  assert.equal(nominal.poseMomentNm, 0);
  assert.equal(nominal.safe, true);

  const overload = Physics.evaluateServo({ angle: 30, arm: 80, load: 200 });
  assert.ok(overload.peakMomentNm > Physics.SERVO_SAFE_LIMIT_NM);
  assert.equal(overload.overTorque, true);
  assert.equal(overload.safe, false);

  const hardStop = Physics.evaluateServo({ angle: 15, arm: 20, load: 40 });
  assert.equal(hardStop.inStopZone, true);
  assert.equal(hardStop.safe, false);
});

test('evaluateGears applies mesh efficiency directly against required net ratio', () => {
  // 12->36 = 3.0 ratio * 0.85 = 2.55 net >= 2.1 ramp requirement
  const climbOk = Physics.evaluateGears({ driver: 12, driven: 36, task: 'ramp' });
  assert.equal(climbOk.netTorque, 2.55);
  assert.equal(climbOk.climbs, true);

  // 12->24 = 2.0 ideal, 1.70 net < 2.1 ramp requirement -> stalls due to mesh losses
  const climbStall = Physics.evaluateGears({ driver: 12, driven: 24, task: 'ramp' });
  assert.equal(climbStall.netTorque, 1.7);
  assert.equal(climbStall.climbs, false);
});

test('evaluateEffector summarizes partial-pass failure mode accurately instead of results[0]', () => {
  // For gripper with jaw=50, tolerance = (50 - 36) * 0.75 = 10.5 mm
  // offset=10 + jitters [-4, 0, +4] -> errs [6, 10, 14] -> trials 0 & 1 pass, trial 2 fails
  const partial = Physics.evaluateEffector({ type: 'grip', reach: 110, jaw: 50, offset: 10 });
  assert.equal(partial.passes, 2);
  assert.match(partial.summaryReason, /failure mode: lateral offset hit finger tip/);
  assert.doesNotMatch(partial.summaryReason, /^captured/);
});

test('evaluateChassis, evaluatePrint, and evaluatePenJoint return expected envelope checks', () => {
  assert.equal(Physics.evaluateChassis({ length: 140, width: 120, clearance: 10, battPos: 50 }).ok, true);
  assert.equal(Physics.evaluateChassis({ length: 165, width: 120, clearance: 10, battPos: 50 }).ok, false);
  assert.equal(Physics.evaluatePenJoint({ joint: 'gusset', force: 5 }).pass, true);
  assert.equal(Physics.evaluatePenJoint({ joint: 'butt', force: 2 }).pass, false);
  const printRes = Physics.evaluatePrint({ layer: 0.24, walls: 3, infill: 25, orient: 'flat' });
  assert.ok(printRes.minutes > 0 && printRes.grams > 0);
});
