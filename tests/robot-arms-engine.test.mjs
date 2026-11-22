import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Arms = require('../assets/js/lessons/robot-arms-engine.js');

test('forwardKinematics and inverseKinematics invert accurately for reachable targets', () => {
  const baseX = 250, baseY = 334, l1 = 170, l2 = 140, l3 = 46;
  const tx = 410, ty = 290;
  const ikUp = Arms.inverseKinematics({ baseX, baseY, l1, l2, l3, tx, ty, elbowUp: true });
  assert.equal(ikUp.ok, true);
  const fkUp = Arms.forwardKinematics({
    baseX, baseY, l1, l2, l3,
    t1Deg: ikUp.q.t1, t2Deg: ikUp.q.t2, t3Deg: ikUp.q.t3
  });
  assert.ok(Math.abs(fkUp.t.x - tx) < 1e-4);
  assert.ok(Math.abs(fkUp.t.y - ty) < 1e-4);

  const far = Arms.inverseKinematics({ baseX, baseY, l1, l2, l3, tx: 900, ty: 290, elbowUp: true });
  assert.equal(far.ok, false);
});

test('manipulability drops near 0 and flags singularity at 0° and 180° elbow angles', () => {
  const stretched = Arms.manipulability({ l1: 170, l2: 140, t2Deg: 0 });
  assert.equal(stretched.singular, true);
  assert.ok(stretched.normalized < 0.01);

  const folded = Arms.manipulability({ l1: 170, l2: 140, t2Deg: 179 });
  assert.equal(folded.singular, true);

  const dextrous = Arms.manipulability({ l1: 170, l2: 140, t2Deg: -90 });
  assert.equal(dextrous.singular, false);
  assert.ok(Math.abs(dextrous.normalized - 1) < 1e-6);
});

test('gravityTorque scales up with horizontal extension and drops 68% with spring assist', () => {
  const fk = Arms.forwardKinematics({ baseX: 250, baseY: 334, l1: 170, l2: 140, l3: 46, t1Deg: 0, t2Deg: 0, t3Deg: 0 });
  const raw = Arms.gravityTorque({ baseX: 250, eX: fk.e.x, wX: fk.w.x, tX: fk.t.x, mLoad: 0.35, springOn: false });
  const assisted = Arms.gravityTorque({ baseX: 250, eX: fk.e.x, wX: fk.w.x, tX: fk.t.x, mLoad: 0.35, springOn: true });
  assert.ok(raw.tau1 > 2.5);
  assert.ok(Math.abs(assisted.tau1 - raw.tau1 * 0.32) < 1e-6);
});

test('collides2Link detects obstacle contact cleanly', () => {
  const obs = [{ x: 180, y: 120, r: 24 }];
  assert.equal(Arms.collides2Link({ baseX: 120, baseY: 160, l1: 95, l2: 75, a1Deg: 30, a2Deg: -30, obstacles: obs }), true);
  assert.equal(Arms.collides2Link({ baseX: 120, baseY: 160, l1: 95, l2: 75, a1Deg: 180, a2Deg: 0, obstacles: obs }), false);
});
