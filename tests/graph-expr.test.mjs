import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const G = require('../assets/js/lessons/graph-expr.js');

const near = (actual, expected, msg) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${msg}: expected ${expected}, got ${actual}`);

test('precedence follows the maths classroom', () => {
  near(G.evaluate('-x^2', 3), -9, '-x^2 is -(x^2), so the parabola opens down');
  near(G.evaluate('-2^2', 0), -4, '-2^2');
  near(G.evaluate('3-x^2', 2), -1, '3-x^2');
  near(G.evaluate('(-2)^2', 0), 4, 'brackets still win');
  near(G.evaluate('2^-1', 0), 0.5, 'a minus may start an exponent');
  near(G.evaluate('x^-2', 2), 0.25, 'x^-2');
  near(G.evaluate('2^3^2', 0), 512, 'powers group from the right');
  near(G.evaluate('2+3*4', 0), 14, 'times before plus');
  near(G.evaluate('8/4/2', 0), 1, 'division groups from the left');
  near(G.evaluate('x - -1', 1), 2, 'minus a negative');
});

test('students can type the way they write', () => {
  near(G.evaluate('y = 2x + 1', 3), 7, 'leading y =');
  near(G.evaluate('f(x) = x^2 - 4', 3), 5, 'leading f(x) =');
  near(G.evaluate('3(x+1)', 1), 6, 'number times bracket');
  near(G.evaluate('(x+1)(x-1)', 3), 8, 'bracket times bracket');
  near(G.evaluate('x sin(x)', Math.PI / 2), Math.PI / 2, 'x sin(x)');
  near(G.evaluate('2πx', 1), 2 * Math.PI, 'π');
  near(G.evaluate('x² + x³', 2), 12, 'superscripts');
  near(G.evaluate('x−1', 3), 2, 'typographic minus');
  near(G.evaluate('x×2÷4', 2), 1, '× and ÷');
  near(G.evaluate('|x - 2|', 0), 2, '|x|');
  near(G.evaluate('|x| + |x-1|', 0), 1, 'two absolute values');
  near(G.evaluate('e^x', 1), Math.E, 'e');
  near(G.evaluate('.5x', 4), 2, 'leading decimal point');
});

test('functions work with or without brackets', () => {
  near(G.evaluate('sin x', 1), Math.sin(1), 'sin x');
  near(G.evaluate('sinx', 1), Math.sin(1), 'sinx');
  near(G.evaluate('√x', 9), 3, '√x (the calculator\'s own √ key)');
  near(G.evaluate('sqrt x', 16), 4, 'sqrt x');
  near(G.evaluate('sin x^2', 2), Math.sin(4), 'a bare function takes the power with it');
  near(G.evaluate('sin(x)^2', 2), Math.sin(2) ** 2, 'bracketed function, then the power');
  near(G.evaluate('2sin(x)', 1), 2 * Math.sin(1), '2sin(x)');
  near(G.evaluate('-sin(x)', 1), -Math.sin(1), '-sin(x)');
  near(G.evaluate('log(x)', 100), 2, 'log is base 10');
  near(G.evaluate('ln(x)', Math.E), 1, 'ln is natural');
  near(G.evaluate('floor(x) + ceil(x) + round(x)', 1.4), 4, 'rounding family');
});

test('anything it cannot read is NaN, never a wrong number', () => {
  for (const bad of ['', 'hello', 'x+', '10%3', 'x)2', 'exp(x)', 'sec(x)', '1/0']) {
    assert.ok(Number.isNaN(G.evaluate(bad, 1)), `${JSON.stringify(bad)} should be NaN`);
  }
  near(G.evaluate('sin(x', 0), 0, 'a missing ) at the end is forgiven');
  near(G.evaluate('(x+1))', 1), 2, 'an extra ) at the end is forgiven');
});

test('isValid accepts functions undefined on part of the axis', () => {
  assert.equal(G.isValid('sqrt(x)'), true);
  assert.equal(G.isValid('ln(x)'), true);
  assert.equal(G.isValid('1/x'), true);
  assert.equal(G.isValid('   '), false);
  assert.equal(G.isValid('banana'), false);
});

test('every example the Graphing Calculator lesson ships is valid', () => {
  const html = fs.readFileSync('lessons/mathematics/advanced-and-calculus/graphing-calculator.html', 'utf8');
  const exprs = new Set();
  for (const m of html.matchAll(/data-(?:expr|fn|eq|preset|value)="([^"]+)"/g)) {
    m[1].split(',').map((e) => e.trim()).filter((e) => e && e !== '...').forEach((e) => exprs.add(e));
  }
  assert.ok(exprs.size > 10, 'found the lesson\'s examples');
  for (const e of exprs) assert.ok(G.isValid(e), `lesson example ${JSON.stringify(e)} does not parse`);
});
