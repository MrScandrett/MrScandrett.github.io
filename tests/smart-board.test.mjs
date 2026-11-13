// The AI Smart Blackboard's three DOM-free modules: maths/chemistry/slicing, the handwriting
// recogniser, and commands/lookup/summary. Run: node --test tests/smart-board.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const B = require('../assets/js/smart-board/board-math.js');
const I = require('../assets/js/smart-board/ink-recognizer.js');
const A = require('../assets/js/smart-board/board-assist.js');

const near = (actual, expected, msg, tol = 1e-6) =>
  assert.ok(Math.abs(actual - expected) < tol, `${msg}: expected ${expected}, got ${actual}`);

test('expressions: precedence, implicit multiplication, functions', () => {
  near(B.compile('2x + 1')(3), 7, '2x + 1');
  near(B.compile('-x^2')(3), -9, '-x^2 opens down');
  near(B.compile('2^3^2')(0), 512, 'powers group from the right');
  near(B.compile('3(x+1)(x-1)')(2), 9, 'brackets multiply');
  near(B.compile('sin(x)^2 + cos(x)^2')(1.3), 1, 'sin(x)^2 squares the sine');
  near(B.compile('sin x^2')(2), Math.sin(4), 'a bare function takes the power with it');
  near(B.compile('x² − 4')(3), 5, 'typographic minus and superscript');
  near(B.compile('xy + 2pi')(2, 3), 6 + 2 * Math.PI, 'two variables and pi');
  assert.equal(B.compile('2 +'), null);
  assert.equal(B.compile('alert(1)'), null, 'unknown names are refused, never run');
  assert.equal(B.compile(''), null);
});

test('a line means one thing', () => {
  const g = B.interpret('y = x^2 - 4');
  assert.equal(g.kind, 'graph');
  assert.deepEqual(g.analysis.roots, [-2, 2]);
  assert.equal(g.analysis.yIntercept, -4);
  assert.deepEqual(g.analysis.turning, [{ x: 0, y: -4, kind: 'min' }]);
  assert.deepEqual(B.interpret('y = x^2').analysis.roots, [0], 'a root the curve only touches');
  assert.equal(B.interpret('z = x^2 + y^2').kind, 'surface');
  assert.equal(B.interpret('x*y').kind, 'surface');
  const circle = B.interpret('x^2 + y^2 = 25');
  assert.equal(circle.kind, 'implicit');
  near(circle.fn(3, 4), 0, '(3, 4) is on the circle');
  assert.deepEqual(B.interpret('2x + 5 = 15').roots, [5]);
  assert.deepEqual(B.interpret('x^2 - 5x + 6 = 0').roots, [2, 3]);
  assert.deepEqual(B.interpret('x^2 + 1 = 0').roots, []);
  assert.deepEqual(B.interpret('x^3 = 8').roots, [2]);
  const sum = B.interpret('3/4 + 5/8');
  assert.equal(sum.kind, 'arithmetic');
  assert.equal(sum.fraction, '11/8');
  assert.equal(B.interpret('12 + 30 =').value, 42);
  assert.equal(B.interpret('2 + 2 = 5').isTrue, false);
  assert.equal(B.interpret('hello there').kind, 'unknown');
});

test('chemical equations balance to the smallest whole numbers', () => {
  const cases = {
    'H2 + O2 = H2O': [2, 1, 2],
    'C3H8 + O2 -> CO2 + H2O': [1, 5, 3, 4],
    'Fe + O2 = Fe2O3': [4, 3, 2],
    'Ca(OH)2 + H3PO4 → Ca3(PO4)2 + H2O': [3, 2, 1, 6],
    'N2 + H2 = NH3': [1, 3, 2],
    '2H2 + O2 = 2H2O': [2, 1, 2],
    'KMnO4 + HCl = KCl + MnCl2 + H2O + Cl2': [2, 16, 2, 2, 8, 5]
  };
  for (const [eq, want] of Object.entries(cases)) {
    const r = B.balance(eq);
    assert.ok(r.ok, eq);
    assert.deepEqual(r.coefficients, want, eq);
    r.atoms.forEach((a) => assert.equal(a.left, a.right, `${eq}: ${a.el} atoms match`));
  }
  assert.equal(B.interpret('H2 + O2 = H2O').balanced, '2H₂ + O₂ → 2H₂O');
  assert.equal(B.balance('H2 = O2').ok, false);
  assert.equal(B.interpret('x = 5').kind, 'solve', 'a lowercase x is algebra, not chemistry');
});

test('cross-sections: shape, area and perimeter', () => {
  const level = B.sliceSolid('cube', {});
  assert.equal(level.shape, 'Square');
  near(level.area, 16, 'a level cut of a side-4 cube');
  const hex = B.sliceSolid('cube', { tilt: Math.atan(Math.SQRT2) * 180 / Math.PI, spin: 45, offset: 0 });
  assert.equal(hex.shape, 'Regular hexagon');
  near(hex.area, 3 * Math.sqrt(3) / 2 * 8, 'hexagon of side 2√2');
  const corner = B.sliceSolid('cube', { tilt: Math.atan(Math.SQRT2) * 180 / Math.PI, spin: 45, offset: 0.6 });
  assert.equal(corner.shape, 'Equilateral triangle');
  assert.equal(B.sliceSolid('cube', { tilt: 45, offset: 0 }).shape, 'Rectangle');
  near(B.sliceSolid('cube', { tilt: 45, offset: 0 }).area, 16 * Math.SQRT2, 'the diagonal rectangle');
  assert.equal(B.sliceSolid('cylinder', {}).shape, 'Circle');
  near(B.sliceSolid('cylinder', { tilt: 30 }).area, Math.PI * 4 / Math.cos(Math.PI / 6), 'tilted cylinder cut is an ellipse');
  assert.equal(B.sliceSolid('cylinder', { tilt: 90 }).shape, 'Rectangle');
  near(B.sliceSolid('cylinder', { tilt: 90 }).area, 16, 'a cut down the axis');
  assert.equal(B.sliceSolid('cone', { tilt: 20, offset: 0 }).shape, 'Ellipse');
  assert.equal(B.sliceSolid('cone', { tilt: Math.atan2(4, 2) * 180 / Math.PI }).shape, 'Parabola');
  assert.equal(B.sliceSolid('cone', { tilt: 80, offset: 0.3 }).shape, 'Hyperbola (one branch)');
  assert.equal(B.sliceSolid('cone', { tilt: 90, offset: 0 }).shape, 'Triangle');
  near(B.sliceSolid('cone', { tilt: 90, offset: 0 }).area, 8, 'the cone\'s triangle: ½ · 4 · 4');
  const cap = B.sliceSolid('sphere', { offset: 0.5 });
  near(cap.area, Math.PI * 3, 'sphere r = 2 cut 1 from the centre');
  assert.equal(B.sliceSolid('sphere', { tilt: 37, spin: 80, offset: 0 }).shape, 'Great circle');
  for (const kind of Object.keys(B.SOLIDS)) {
    for (let tilt = 0; tilt <= 90; tilt += 15) for (let off = -0.9; off <= 0.9; off += 0.3) {
      const s = B.sliceSolid(kind, { tilt, spin: 25, offset: off });
      assert.ok(Number.isFinite(s.area) && s.area >= 0, `${kind} ${tilt}° ${off}`);
      // Every point of the section lies on the cutting plane.
      s.points.forEach((p) => near(p[0] * s.plane.n[0] + p[1] * s.plane.n[1] + p[2] * s.plane.n[2], s.plane.d, 'on the plane', 1e-6));
    }
  }
});

test('handwriting: the built-in hand is read back, neat or shaky', () => {
  const lines = ['y=x^2-4', '2x+5=15', '3/4+5/8', 'y=2x+1', 'x^2+y^2=25', 'z=x^2+y^2', '(x+1)(x-3)=0',
    'y=x^3-6x', '1234567890', '7x-9=40', 'y=(x-1)^2+3', '12.5+7.5'];
  for (const t of lines) {
    assert.equal(I.readLine(I.sample(t, { size: 60, x: 20, y: 80 })).text, t, 'clean');
    assert.equal(I.readLine(I.sample(t, { size: 34, x: 300, y: 10 })).text, t, 'small, elsewhere on the board');
  }
  let right = 0, total = 0;
  for (const jitter of [1.5, 3]) for (const slant of [0, 0.15]) for (const variant of [0, 1]) {
    const seed = 1 + variant + jitter;
    for (const t of lines) {
      total++;
      if (I.readLine(I.sample(t, { size: 60, jitter, slant, seed, variant })).text === t) right++;
    }
  }
  assert.ok(right / total > 0.97, `shaky and slanted writing: ${right}/${total}`);
});

test('handwriting: chemistry is recognised by its capitals', () => {
  for (const t of ['2H2+O2=2H2O', 'CH4+2O2=CO2+2H2O', 'N2+3H2=2NH3']) {
    const r = I.readLine(I.sample(t, { size: 60, jitter: 1, seed: 4 }));
    assert.equal(r.mode, 'chem');
    assert.equal(r.text, t);
    assert.ok(B.interpret(r.text).ok, 'and it balances');
  }
  assert.equal(I.readLine(I.sample('y=x^2', {})).mode, 'math');
  assert.equal(I.readLine([]).text, '');
});

test('handwriting → meaning, end to end', () => {
  const read = (t) => B.interpret(I.readLine(I.sample(t, { jitter: 2, seed: 9 })).text);
  assert.deepEqual(read('y=x^2-4').analysis.roots, [-2, 2]);
  assert.deepEqual(read('2x+5=15').roots, [5]);
  assert.equal(read('z=x^2+y^2').kind, 'surface');
  assert.equal(read('2H2+O2=2H2O').balanced, '2H₂ + O₂ → 2H₂O');
});

test('commands, typed or spoken', () => {
  const c = A.parseCommand;
  assert.deepEqual(c('graph y equals x squared minus four'), { action: 'math', text: 'y = x^2 - 4', verb: 'graph' });
  assert.equal(c('x squared plus y squared equals twenty five').text, 'x^2 + y^2 = 25');
  assert.equal(c('what is three plus four').text, '3 + 4');
  assert.equal(c('what is the square root of 144').action, 'math');
  assert.deepEqual(c('what is a vector'), { action: 'define', term: 'vector' });
  assert.deepEqual(c('slice the cone at 60 degrees'), { action: 'slice', solid: 'cone', tilt: 60 });
  assert.equal(c('slice the cube into a hexagon').spin, 45);
  assert.equal(c('cut it vertically').tilt, 90);
  assert.deepEqual(c('show a cylinder'), { action: 'solid', solid: 'cylinder' });
  assert.equal(c('unfold the cube').amount, 1);
  assert.equal(c('find a lesson on fractions').query, 'fractions');
  assert.equal(c('Quiz me on gravity.').topic, 'gravity');
  assert.equal(c('balance C3H8 + O2 = CO2 + H2O').text, 'C3H8 + O2 = CO2 + H2O');
  assert.equal(c('H2 + O2 = H2O').text, 'H2 + O2 = H2O', 'formulas keep their capitals');
  assert.deepEqual(c('start recording'), { action: 'record', on: true });
  assert.deepEqual(c('stop recording'), { action: 'record', on: false });
  assert.equal(c('clear the board').action, 'clear');
  assert.equal(c('photosynthesis').action, 'lesson');
  assert.equal(c('').action, 'none');
  for (const line of A.HELP) for (const example of line.split('·')) {
    assert.notEqual(c(example.trim()).action, 'none', `help example works: ${example.trim()}`);
  }
  // What a command produces is something the maths module can read.
  assert.equal(B.interpret(c('graph y equals x squared minus four').text).kind, 'graph');
});

test('lookup uses the real catalog, quiz bank and glossary', () => {
  const lessons = JSON.parse(fs.readFileSync(new URL('../data/lessons.json', import.meta.url))).lessons;
  const hits = A.searchLessons(lessons, 'fractions', 3);
  assert.ok(hits.length && /fraction/i.test(hits[0].title), 'fractions finds a fractions lesson');
  hits.forEach((l) => assert.ok(fs.existsSync(new URL('../' + l.url, import.meta.url)), l.url));
  assert.deepEqual(A.searchLessons(lessons, 'zzzqqq'), []);
  const bank = JSON.parse(fs.readFileSync(new URL('../data/daily-double-bank.json', import.meta.url))).questions;
  const q = A.pickQuiz(bank, 'gravity', 0);
  assert.ok(q && q.choices.includes(q.answer));
  assert.ok(A.pickQuiz(bank, '', 7));
  assert.equal(A.pickQuiz(bank, 'zzzqqq', 0), null);
  const terms = JSON.parse(fs.readFileSync(new URL('../data/glossary.json', import.meta.url))).terms;
  const first = Array.isArray(terms) ? terms[0].term : Object.keys(terms)[0];
  assert.ok(A.findTerm(terms, first).definition);
  assert.equal(A.findTerm(terms, 'zzzqqq'), null);
});

test('the class summary groups what happened', () => {
  const s = A.summarize([
    { t: 0, kind: 'graph', text: 'y = x^2 - 4', detail: 'crosses the x-axis at −2 and 2' },
    { t: 65000, kind: 'solve', text: '2x + 5 = 15', detail: 'x = 5' },
    { t: 70000, kind: 'said', text: 'slice the cube into a hexagon' },
    { t: 72000, kind: 'solid', text: 'Cube cut', detail: 'Square, 16 sq units' },
    { t: 90000, kind: 'solid', text: 'Cube cut', detail: 'Regular hexagon, 20.78 sq units' }
  ], { title: 'Algebra, period 2', date: '12 November 2026' });
  assert.equal(s.duration, '1:30');
  assert.deepEqual(s.sections.map((x) => x.heading), ['Graphs we drew', 'Equations we solved', '3D solids and cross-sections', 'Things said to the board']);
  assert.deepEqual(s.sections[2].items, ['Cube cut — Regular hexagon, 20.78 sq units'], 'a repeated item keeps its latest result');
  assert.match(s.text, /1:05 {2}2x \+ 5 = 15/);
  assert.match(A.summarize([], {}).text, /Nothing was put on the board/);
});
