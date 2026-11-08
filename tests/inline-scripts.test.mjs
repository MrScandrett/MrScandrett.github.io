import test from 'node:test';
import assert from 'node:assert/strict';
import { check, measure, LIMIT } from '../scripts/check-inline-scripts.mjs';

test(`no lesson adds or grows an inline <script> over ${LIMIT} lines`, () => {
  const { problems } = check(measure());
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('the lessons already moved out stay out', () => {
  const current = measure();
  for (const file of [
    'lessons/mathematics/advanced-and-calculus/graphing-calculator.html',
    'lessons/mathematics/advanced-and-calculus/fourier-series.html',
  ]) assert.ok(!(file in current), `${file} has a big inline <script> again`);
});

test('the ratchet catches growth and newcomers', () => {
  const baseline = { 'lessons/a.html': 400 };
  assert.equal(check({ 'lessons/a.html': 400 }, baseline).problems.length, 0);
  assert.equal(check({ 'lessons/a.html': 401 }, baseline).problems.length, 1);
  assert.equal(check({ 'lessons/b.html': 301 }, baseline).problems.length, 1);
  assert.deepEqual(check({}, baseline).stale, ['lessons/a.html']);
});
