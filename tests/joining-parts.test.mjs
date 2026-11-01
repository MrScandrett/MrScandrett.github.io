// Joining Parts snap-fit maths (lessons/3d-design/cad-and-printing/joining-parts.html).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('../assets/js/lessons/joining-parts.js', import.meta.url), 'utf8');
const sandbox = { window: {}, document: { readyState: 'complete', querySelectorAll: () => [] } };
vm.runInNewContext(src, sandbox);
const { analyse, MATERIALS, LOCK_ANGLE } = sandbox.window.JoiningParts;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const base = { mat: 'pla', orient: 'flat', use: 'once', L: 15, t: 1.5, y: 1, b: 6, lead: 30, ret: 90 };

test('root strain ε = 1.5·t·y/L² (worked example and practice problems)', () => {
  near(analyse(base).eps, 1.0, 1e-9, 'lid clip 1.0 %');
  near(analyse({ ...base, L: 20, t: 2, y: 1 }).eps, 0.75, 1e-9, 'problem 1');
  near(analyse({ ...base, L: 30 }).eps / analyse(base).eps, 0.25, 1e-9, 'double L → quarter strain');
  near(analyse(base).P, 3.45, 0.001, 'problem 10 deflection force');
  near(analyse({ ...base, t: 1.5, y: 1.0 }).needL, Math.sqrt(112.5), 1e-9, 'problem 5 shortest L');
});

test('limits match the table on the page', () => {
  assert.deepEqual([MATERIALS.pla.flat, MATERIALS.pla.upright, MATERIALS.petg.flat, MATERIALS.petg.upright, MATERIALS.pp.flat], [2.0, 0.7, 3.6, 1.2, 8.0]);
  near(analyse({ ...base, mat: 'petg', use: 'repeat' }).allow, 2.16, 1e-9, 'problem 8: 60 % for frequent separation');
  near(analyse({ ...base, mat: 'petg', use: 'repeat' }).maxY, 2.16, 1e-9, 'problem 9: largest undercut');
  assert.ok(analyse({ ...base, orient: 'upright', y: 1.2 }).ratio > 1, 'standing-up PLA clip fails');
});

test('return faces: 90° locks, 45° pulls apart, ≈73° is the friction lock limit', () => {
  assert.equal(analyse(base).locked, true);
  const a = analyse({ ...base, ret: 45 });
  assert.equal(a.locked, false);
  assert.ok(a.pull > a.P);
  near(LOCK_ANGLE, 73.3, 0.05, 'atan(1/0.3)');
  assert.equal(analyse({ ...base, ret: 75 }).locked, true);
});
