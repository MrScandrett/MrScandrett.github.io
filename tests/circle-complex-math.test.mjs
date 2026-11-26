import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const C = require('../assets/js/lessons/circle-complex-math.js');

const near = (actual, expected, msg) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${msg}: expected ${expected}, got ${actual}`);

// A seeded rng so generator tests are repeatable.
function seeded(seed) {
  let x = seed;
  return () => (x = (x * 16807) % 2147483647) / 2147483647;
}

test('radicals simplify to out·√inside with a square-free inside', () => {
  assert.deepEqual(C.simplifyRadical(48), { out: 4, inside: 3 });
  assert.deepEqual(C.simplifyRadical(95), { out: 1, inside: 95 });
  assert.deepEqual(C.simplifyRadical(36), { out: 6, inside: 1 });
  assert.deepEqual(C.simplifyRadical(72), { out: 6, inside: 2 });
  assert.equal(C.sqrtFrac(C.fr(29, 4)).text, '√29/2');
  assert.equal(C.sqrtFrac(C.fr(45, 2)).text, '3√10/2');
  assert.equal(C.sqrtFrac(C.fr(81, 49)).text, '9/7');
});

test('the folder problem: x² + y² + 10x − 6y + 18 = 0 is centre (−5, 3), radius 4', () => {
  const r = C.circleFromGeneral({ A: 1, D: 10, E: -6, F: 18 });
  assert.equal(r.kind, 'circle');
  assert.equal(r.standard, '(x + 5)² + (y − 3)² = 16');
  assert.equal(r.radiusText, '4');
  near(r.hValue, -5, 'h'); near(r.kValue, 3, 'k');
  const added = r.steps.find((s) => /BOTH sides/.test(s.title)).math;
  assert.equal(added, '(x² + 10x + 25) + (y² − 6y + 9) = −18 + 25 + 9', 'matches the handwritten line');
});

test('a leading coefficient is divided out first, and fractions stay exact', () => {
  const r = C.circleFromGeneral({ A: 49, D: -28, E: 28, F: -73 });
  assert.match(r.steps[1].title, /Divide every term by 49/);
  assert.equal(r.steps[1].math, 'x² + y² − (4/7)x + (4/7)y − 73/49 = 0');
  assert.equal(r.standard, '(x − 2/7)² + (y + 2/7)² = 81/49');
  assert.equal(r.radiusText, '9/7');
});

test('r² = 0 is a single point and r² < 0 has no graph', () => {
  assert.equal(C.circleFromGeneral({ A: 1, D: -4, E: 2, F: 5 }).kind, 'point');
  const none = C.circleFromGeneral({ A: 1, D: 0, E: 0, F: 4 });
  assert.equal(none.kind, 'none');
  assert.match(none.steps.at(-1).math, /no graph/);
});

test('expandCircle and circleFromGeneral are inverses', () => {
  for (const [h, k, r] of [[2, -3, 4], [-5, 3, 4], [0, 0, 1], [1.5, -2.5, 2.5], [-6, 6, 3.5]]) {
    const e = C.expandCircle(h, k, r);
    const back = C.circleFromGeneral({ A: 1, D: e.D, E: e.E, F: e.F });
    near(back.hValue, h, 'h'); near(back.kValue, k, 'k'); near(back.radiusValue, r, 'r');
  }
});

test('the folder quadratic 5y² − 5y + 6 = 0 has roots (5 ± i√95)/10', () => {
  const q = C.quadratic({ a: 5, b: -5, c: 6, v: 'y' });
  assert.equal(q.D, -95);
  assert.equal(q.kind, 'complex');
  assert.equal(q.exact, 'y = (5 ± i√95)/10');
  assert.equal(q.split, 'y = 1/2 ± (√95/10)i');
  near(q.re, 0.5, 're'); near(q.im, Math.sqrt(95) / 10, 'im');
});

test('quadratic formula output: reduction, simplification and signs', () => {
  assert.equal(C.quadratic({ a: 1, b: 1, c: 4 }).exact, 'x = (−1 ± i√15)/2');
  assert.equal(C.quadratic({ a: 1, b: -4, c: 13 }).exact, 'x = 2 ± 3i');
  assert.equal(C.quadratic({ a: 2, b: 4, c: 8 }).exact, 'x = −1 ± i√3');
  assert.equal(C.quadratic({ a: 1, b: 0, c: 4 }).exact, 'x = ±2i');
  assert.equal(C.quadratic({ a: 1, b: 2, c: 13 }).exact, 'x = −1 ± 2i√3');
  assert.equal(C.quadratic({ a: -3, b: 2, c: -5 }).exact, 'x = (1 ± i√14)/3', 'a negative a flips the denominator sign');
  assert.equal(C.quadratic({ a: 1, b: -5, c: 6 }).exact, 'x = 3 or x = 2');
  assert.equal(C.quadratic({ a: 1, b: -6, c: 9 }).exact, 'x = 3');
  assert.equal(C.quadratic({ a: 1, b: 2, c: -1 }).exact, 'x = −1 ± √2');
});

test('every generated complex problem really is solved by its roots', () => {
  const rng = seeded(11);
  for (const level of ['whole', 'radical', 'leading']) {
    for (let i = 0; i < 300; i++) {
      const p = C.makeComplexProblem(rng, level);
      const q = C.quadratic(p);
      assert.equal(q.kind, 'complex', `${p.text} should have complex roots`);
      for (const sign of [1, -1]) {
        const v = C.evalComplex(p.a, p.b, p.c, q.re, sign * q.im);
        assert.ok(Math.abs(v.re) < 1e-9 && Math.abs(v.im) < 1e-9, `${p.text}: root ${q.re} ± ${q.im}i`);
      }
      // The exact text must evaluate to the same imaginary part.
      near(C.parseNumber(q.imText), q.im, `${p.text} imText`);
      if (level === 'whole') assert.ok(Number.isInteger(q.re) && Number.isInteger(q.im), `${p.text} whole parts`);
    }
  }
});

test('every generated circle problem has a real circle that fits the graph', () => {
  const rng = seeded(5);
  for (const level of ['starter', 'radical', 'scaled', 'halves']) {
    for (let i = 0; i < 300; i++) {
      const p = C.makeCircleProblem(rng, level);
      for (const n of [p.A, p.D, p.E, p.F]) assert.ok(Number.isInteger(n), `${p.text} has whole coefficients`);
      const r = C.circleFromGeneral(p);
      assert.equal(r.kind, 'circle', p.text);
      assert.ok(Math.abs(r.hValue) <= 6.5 && Math.abs(r.kValue) <= 6.5 && r.radiusValue <= 7.1, `${p.text} fits −10…10`);
      if (level === 'scaled') assert.ok(p.A > 1, `${p.text} has a leading coefficient`);
      if (level === 'halves') assert.ok(r.h.d === 2 || r.k.d === 2, `${p.text} has a half in its centre`);
      if (level === 'radical') assert.ok(!/^\d+$/.test(r.radiusText), `${p.text} has a radical radius`);
    }
  }
});

test('rootsNumeric: real pair, then a conjugate pair once the parabola lifts off', () => {
  const real = C.rootsNumeric(1, 0, -4);
  near(real[0].re, -2, 'left'); near(real[1].re, 2, 'right');
  const cx = C.rootsNumeric(1, -4, 13);
  near(cx[0].re, 2, 're'); near(cx[0].im, 3, 'im'); near(cx[1].im, -3, 'conjugate');
});

test('parseNumber reads the way students write', () => {
  const cases = {
    '3': 3, '−2.5': -2.5, '7/2': 3.5, '√95/10': Math.sqrt(95) / 10, '2√3': 2 * Math.sqrt(3),
    'sqrt(12)/4': Math.sqrt(12) / 4, '(5+√13)/2': (5 + Math.sqrt(13)) / 2, '√95/10 i': Math.sqrt(95) / 10,
    'i√15/2': Math.sqrt(15) / 2, '-1/2': -0.5, '3√10/2': 3 * Math.sqrt(10) / 2, '.5': 0.5
  };
  for (const [text, value] of Object.entries(cases)) near(C.parseNumber(text), value, text);
  for (const bad of ['', 'abc', '2//3', '√', '(2']) assert.ok(Number.isNaN(C.parseNumber(bad)), `${bad} is unreadable`);
  assert.ok(C.matches('√95/10', 0.9747));
  assert.ok(!C.matches('9.75', 0.9747));
});

test('the parser never uses eval or new Function', () => {
  const src = fs.readFileSync(new URL('../assets/js/lessons/circle-complex-math.js', import.meta.url), 'utf8');
  assert.ok(!/\beval\s*\(|new Function/.test(src));
});
