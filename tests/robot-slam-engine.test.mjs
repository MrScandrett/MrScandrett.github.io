import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const SLAM = require('../assets/js/lessons/robot-slam-engine.js');

test('estimateClump is completely deterministic and identifies main particle cluster despite outliers', () => {
  const particles = [];
  for (let i = 0; i < 80; i++) {
    particles.push({ x: 200 + (i % 5) - 2, y: 150 + Math.floor(i / 5) - 8, a: 0.4, w: 0.01 });
  }
  for (let i = 0; i < 20; i++) {
    particles.push({ x: 500 + i, y: 300, a: 2.0, w: 0.01 });
  }
  const a = SLAM.estimateClump(particles, 40);
  const b = SLAM.estimateClump(particles, 40);
  assert.deepEqual(a, b);
  assert.ok(Math.abs(a.x - 200) < 5);
  assert.ok(Math.abs(a.y - 150) < 12);
  assert.ok(a.agree >= 0.78);
});

test('correlativeScanMatch pulls drifted belief back toward true mapped walls', () => {
  const gw = 80, gh = 50, cellSize = 8;
  const grid = new Float32Array(gw * gh);
  const truePose = { x: 100, y: 100, a: 0 };
  const world = [
    { x: 0, y: 0, w: 640, h: 8 },
    { x: 160, y: 40, w: 12, h: 140 },
    { x: 40, y: 160, w: 140, h: 12 }
  ];
  const rays = [];
  for (let k = 0; k < 24; k++) {
    const rel = -Math.PI + (k + 0.5) * (2 * Math.PI / 24);
    const z = SLAM.rayCast(truePose.x, truePose.y, truePose.a + rel, world, 180);
    rays.push({ rel, z, hit: z < 180 });
  }
  // Map walls cleanly from truePose across multiple scans
  for (let pass = 0; pass < 3; pass++) {
    rays.forEach((ray) => SLAM.updateOccupancyRay({
      grid, gw, gh, cellSize, pose: truePose, rel: ray.rel, z: ray.z, hit: ray.hit, maxR: 180
    }));
  }

  const driftedBelief = { x: 107, y: 94, a: 0.03 };
  const res = SLAM.correlativeScanMatch({ grid, gw, gh, cellSize, belief: driftedBelief, rays });
  assert.equal(res.improved, true);
  const beforeErr = Math.hypot(driftedBelief.x - truePose.x, driftedBelief.y - truePose.y);
  const afterErr = Math.hypot(res.pose.x - truePose.x, res.pose.y - truePose.y);
  assert.ok(afterErr < beforeErr, `expected scan match to reduce pose error (${afterErr.toFixed(2)} < ${beforeErr.toFixed(2)})`);
});

test('lowVarianceResample preserves weight distribution deterministically given fixed rng', () => {
  const particles = [
    { x: 10, y: 10, a: 0, w: 0.9 },
    { x: 90, y: 90, a: 1, w: 0.1 }
  ];
  const res = SLAM.lowVarianceResample(particles, 1.0, 10, () => 0.1);
  assert.equal(res.length, 10);
  const near10 = res.filter((p) => p.x === 10).length;
  assert.equal(near10, 9);
});
