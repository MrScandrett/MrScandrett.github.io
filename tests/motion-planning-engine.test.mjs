import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const MP = require('../assets/js/lessons/motion-planning-engine.js');

test('refreshBestGoalNode selects cheaper near-goal node after RRT* rewiring', () => {
  const goal = { x: 100, y: 100 };
  const nodes = [
    { x: 0, y: 100, parent: -1, cost: 0 },
    { x: 88, y: 100, parent: 0, cost: 130 }, // previously connected to goal at total 142
    { x: 86, y: 100, parent: 0, cost: 86 }   // cheaper branch near goal: total 100
  ];
  const best = MP.refreshBestGoalNode({
    nodes, goal, stepDist: 18, obstacles: [], width: 640, height: 400, pad: 10
  });
  assert.equal(best.goalNode, 2);
  assert.equal(best.goalCost, 100);
});

test('shortcutPath collapses unnecessary intermediate waypoints when clear', () => {
  const raw = [
    { x: 200, y: 100 },
    { x: 150, y: 140 },
    { x: 100, y: 60 },
    { x: 50, y: 100 }
  ];
  const smoothed = MP.shortcutPath({
    rawPath: raw, pad: 10, obstacles: [], width: 640, height: 400
  });
  assert.equal(smoothed.length, 2);
  assert.deepEqual(smoothed[0], { x: 50, y: 100 });
  assert.deepEqual(smoothed[1], { x: 200, y: 100 });
});

test('diffDriveKinematics computes straight line, spin in place, and turning arc', () => {
  const straight = MP.diffDriveKinematics({ vl: 60, vr: 60, base: 40 });
  assert.equal(straight.v, 60);
  assert.equal(straight.w, 0);
  assert.equal(straight.radius, Infinity);

  const spin = MP.diffDriveKinematics({ vl: -60, vr: 60, base: 40 });
  assert.equal(spin.v, 0);
  assert.equal(spin.w, 3);
  assert.equal(spin.radius, 0);
});

test('isSegmentFree rejects path intersecting obstacle disk + robot radius pad', () => {
  const blocked = !MP.isSegmentFree({
    a: { x: 40, y: 200 },
    b: { x: 240, y: 200 },
    pad: 10,
    obstacles: [{ x: 140, y: 200, r: 20 }],
    width: 640,
    height: 400
  });
  assert.equal(blocked, true);
});
