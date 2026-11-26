import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const eng = require('../assets/js/lessons/math-integers-engine.js');

function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

test('fmt and parseNumber normalize Unicode minus, -0, decimals, and fractions', () => {
  assert.equal(eng.fmt(-0), '0');
  assert.equal(eng.fmt(-2.5), '-2.5');
  assert.equal(eng.fmtSigned(-4), '\u22124');
  assert.equal(eng.parseNumber('\u22127'), -7);
  assert.equal(eng.parseNumber(' -3/4 '), -0.75);
  assert.equal(eng.parseNumber('\u22125/2'), -2.5);
  assert.ok(Number.isNaN(eng.parseNumber('abc')));
});

test('computeNumberLineScale anchors zero and produces clean integer/rational ticks', () => {
  const s1 = eng.computeNumberLineScale([-7, 10]);
  assert.ok(s1.min < -7);
  assert.ok(s1.max > 10);
  assert.ok(s1.ticks.some((t) => t.value === 0 && t.isZero));
  for (const t of s1.ticks) {
    assert.ok(Number.isInteger(t.value), `Expected integer tick, got ${t.value}`);
    assert.ok(!t.label.includes('.'), `Unexpected decimal tick label: ${t.label}`);
  }

  const sHalf = eng.computeNumberLineScale([-2.5, 1.5], { stepHint: 0.5 });
  assert.equal(sHalf.step, 0.5);
  assert.ok(sHalf.ticks.some((t) => t.value === 0 && t.isZero));
  assert.ok(sHalf.ticks.some((t) => t.value === -2.5));
  assert.ok(sHalf.ticks.some((t) => t.value === 1.5));
});

test('createIntegerTask supports K-12 progression and keeps Grade 11 null', () => {
  assert.equal(eng.createIntegerTask(11, 0), null);

  for (const grade of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12]) {
    const task = eng.createIntegerTask(grade, 0, seededRng(100 + grade));
    assert.ok(task, `Expected task for grade ${grade}`);
    assert.ok(task.goal && task.prompt && task.hint && task.solution && task.reason);
    assert.ok(task.integerMeta && typeof task.integerMeta.target === 'number');
    const parsed = eng.parseNumber(task.answer);
    assert.ok(Math.abs(parsed - task.integerMeta.target) <= 1e-8);
    assert.ok(task.visual.includes('<svg') && task.visual.includes('>0</text>'));
  }
});

test('Grade 6 and Grade 7 5-question rotation yields 5 distinct subskills', () => {
  const g6Kinds = new Set();
  const g7Kinds = new Set();
  for (let i = 0; i < 5; i++) {
    const t6 = eng.createIntegerTask(6, i, seededRng(42 + i));
    const t7 = eng.createIntegerTask(7, i, seededRng(99 + i));
    g6Kinds.add(t6.integerMeta.subskill);
    g7Kinds.add(t7.integerMeta.subskill);
  }
  assert.equal(g6Kinds.size, 5);
  assert.equal(g7Kinds.size, 5);
});

test('zero-pair chip operations preserve netValue and cancel pairs accurately', () => {
  const s0 = eng.computeChipsState(2, 5);
  assert.equal(s0.zeroPairs, 2);
  assert.equal(s0.netValue, -3);

  const s1 = eng.addZeroPair(s0.pos, s0.neg);
  assert.equal(s1.pos, 3);
  assert.equal(s1.neg, 6);
  assert.equal(s1.zeroPairs, 3);
  assert.equal(s1.netValue, -3);

  const s2 = eng.cancelZeroPairs(s1.pos, s1.neg);
  assert.equal(s2.cancelled, 3);
  assert.equal(s2.pos, 0);
  assert.equal(s2.neg, 3);
  assert.equal(s2.netValue, -3);
});

test('diagnoseIntegerError identifies key misconceptions and ignores valid or non-numeric answers', () => {
  // sub_negative: a - (-|b|) answered as a - |b|
  const subNegTask = {
    integerMeta: {
      kind: 'sub_neg', start: 3, delta: 5, target: 8, operands: [3, -5]
    }
  };
  assert.equal(eng.diagnoseIntegerError(subNegTask, '-2')?.code, 'sub_neg_as_sub_pos');
  assert.equal(eng.diagnoseIntegerError(subNegTask, '-8')?.code, 'sign_flip');
  assert.equal(eng.diagnoseIntegerError(subNegTask, '8'), null);
  assert.equal(eng.diagnoseIntegerError(subNegTask, 'hello'), null);

  // abs_dist: negative distance
  const absTask = {
    integerMeta: {
      kind: 'abs_dist', start: -4, delta: 9, target: 9, operands: [-4, 5]
    }
  };
  assert.equal(eng.diagnoseIntegerError(absTask, '-9')?.code, 'negative_distance');

  // signed_mult: wrong sign
  const multTask = {
    integerMeta: {
      kind: 'signed_mult', start: 0, delta: 12, target: 12, operands: [-3, -4]
    }
  };
  assert.equal(eng.diagnoseIntegerError(multTask, '-12')?.code, 'mult_div_sign_rule');

  // add_cross_zero: added magnitudes
  const crossTask = {
    integerMeta: {
      kind: 'add_cross_zero', start: -4, delta: 7, target: 3, operands: [-4, 7]
    }
  };
  assert.equal(eng.diagnoseIntegerError(crossTask, '11')?.code, 'added_magnitudes');
  assert.equal(eng.diagnoseIntegerError(crossTask, '4')?.code, 'off_by_one');
});

test('renderStaticNumberLineSVG renders accessible SVG with clean ticks and optional reveal arc', () => {
  const task = eng.createIntegerTask(6, 3, seededRng(7));
  const revealed = eng.renderStaticNumberLineSVG(task.integerMeta, { reveal: true });
  assert.ok(revealed.startsWith('<svg '));
  assert.ok(revealed.includes('<path d="M'));
  assert.ok(!revealed.includes('NaN'));
});
