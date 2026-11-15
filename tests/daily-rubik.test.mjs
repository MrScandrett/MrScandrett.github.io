import test from 'node:test';
import assert from 'node:assert/strict';
import Cube from '../assets/js/lessons/rubiks-cube-solver.js';
import { makeRubik, minimumAtLeast, recoveryPlan } from '../assets/js/daily-rubik-core.mjs';

const days = Array.from({ length: 10 }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`);

test('daily cubes cover minimum difficulties 1–10 and replay deterministically', () => {
  const targets = new Set();
  for (const key of days) {
    const p = makeRubik(key, Cube); targets.add(p.target);
    assert.deepEqual(makeRubik(key, Cube), p);
    assert.equal(p.scramble.length, p.target);
    assert.equal(Cube.isSolved(p.facelets), false);
    assert.equal(Cube.validate(p.facelets).ok, true);
    assert.equal(Cube.isSolved(Cube.applySeq(p.facelets, p.solution)), true);
    assert.ok(minimumAtLeast(p.facelets, p.target, Cube));
    assert.equal(minimumAtLeast(p.facelets, p.target + 1, Cube), false);
  }
  assert.deepEqual([...targets].sort((a, b) => a - b), [1,2,3,4,5,6,7,8,9,10]);
});

test('minimum checker rejects cancellations, commuting shortcuts and half turns', () => {
  for (const [seq, minimum] of [[[], 0], [['R', "R'"], 0], [['R', 'L', "R'"], 1], [['R', 'R'], 2], [['R', 'R', 'R'], 1]]) {
    const fac = Cube.applySeq(Cube.SOLVED, seq);
    if (minimum) assert.ok(minimumAtLeast(fac, minimum, Cube));
    assert.equal(minimumAtLeast(fac, minimum + 1, Cube), false);
  }
});

test('computer recovery solves from an arbitrary long student history', () => {
  const moves = Array.from({ length: 123 }, (_, i) => ['U', 'R', "F'", 'D', "L'", 'B'][i % 6]);
  for (const key of days) {
    const p = makeRubik(key, Cube);
    const plan = recoveryPlan(p, moves, Cube);
    assert.equal(plan.length, moves.length + p.target);
    assert.equal(plan[0].phase, 'Undo your turns');
    assert.equal(plan.at(-1).phase, 'Reverse the scramble');
    assert.ok(Cube.isSolved(Cube.applySeq(Cube.applySeq(p.facelets, moves), plan.map((s) => s.move))));
  }
});
