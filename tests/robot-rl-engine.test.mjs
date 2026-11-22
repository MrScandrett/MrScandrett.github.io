import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const RL = require('../assets/js/lessons/robot-rl-engine.js');

test('decayEpsilon decays smoothly below 0.20 without toFixed stall', () => {
  let eps = 0.20;
  for (let i = 0; i < 100; i++) {
    eps = RL.decayEpsilon(eps);
  }
  assert.ok(eps < 0.12, `expected eps < 0.12 after 100 episodes, got ${eps}`);
  for (let i = 0; i < 600; i++) {
    eps = RL.decayEpsilon(eps);
  }
  assert.equal(eps, 0.02);
});

test('bestAction breaks ties across equal Q values using rng rather than always choosing index 0', () => {
  const Q = new Float32Array(RL.COLS * RL.ROWS * 4);
  const s = 5;
  Q[s * 4 + 0] = 0.5;
  Q[s * 4 + 1] = 0.2;
  Q[s * 4 + 2] = 0.5;
  Q[s * 4 + 3] = 0.5;

  // Deterministic rng cycling across [0, 0.4, 0.8] -> should sample all 3 tied actions [0, 2, 3]
  const picks = [0.05, 0.45, 0.85].map((v) => RL.bestAction(Q, s, () => v));
  assert.deepEqual(picks, [0, 2, 3]);
});

test('all presets build valid 12x8 grids with non-wall start and at least one goal', () => {
  for (const key of Object.keys(RL.PRESETS)) {
    const world = RL.createGrid(key);
    assert.equal(world.grid.length, RL.COLS * RL.ROWS);
    const startKind = world.grid[world.start.y * RL.COLS + world.start.x];
    assert.equal(startKind, RL.EMPTY, `${key} start square should be EMPTY`);
    assert.ok(world.grid.includes(RL.GOAL), `${key} grid must contain a GOAL`);
  }
});

test('stepTransition handles wall bounce penalty and goal reward', () => {
  const world = RL.createGrid('default');
  const wallBounce = RL.stepTransition({
    grid: world.grid, x: 0, y: 7, a: 3, slip: 0, stepCost: -0.01
  });
  assert.equal(wallBounce.nx, 0);
  assert.equal(wallBounce.ny, 7);
  assert.equal(wallBounce.reward, -0.1);
  assert.equal(wallBounce.done, false);

  const reachGoal = RL.stepTransition({
    grid: world.grid, x: 9, y: 1, a: 1, slip: 0, stepCost: -0.01
  });
  assert.equal(reachGoal.nx, 10);
  assert.equal(reachGoal.ny, 1);
  assert.equal(reachGoal.reward, 1);
  assert.equal(reachGoal.done, true);
});
