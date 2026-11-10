import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const K = require('../assets/js/lessons/khayyam-core.js');
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: expected ${b}, got ${a}`);

test('cubic by conics: the parabola–circle crossing solves x³ + cx = d', () => {
  for (const [c, d] of [[6, 20], [3, 14], [10, 20], [1, 1], [30, 100], [1, 100], [25, 2]]) {
    const r = K.cubic(c, d);
    near(r.check, d, 1e-9, `x³ + ${c}x at the crossing`);
    near(r.x, r.cardano, 1e-9, `geometric root vs Cardano for c=${c}, d=${d}`);
    near(r.y, r.x * r.x / r.a, 1e-12, 'crossing lies on the parabola');
    near(r.x * r.x + r.y * r.y, r.b * r.x, 1e-9, 'crossing lies on the circle');
  }
  near(K.cubic(6, 20).x, 2, 1e-12, "Cardano's own example x³ + 6x = 20");
  assert.throws(() => K.cubic(0, 5), RangeError);
});

test('calendars: Julian drifts a day in ~128 years, Gregorian ~3,226, the 8/33 pattern ~4,269', () => {
  near(K.yearsPerDay(K.CALENDARS.julian), 128, 1, 'Julian');
  near(K.yearsPerDay(K.CALENDARS.gregorian), 3226, 5, 'Gregorian');
  near(K.yearsPerDay(K.CALENDARS.jalali), 4269, 5, 'Jalali');
  assert.ok(Math.abs(K.drift(K.CALENDARS.jalali, 1000)) < Math.abs(K.drift(K.CALENDARS.gregorian, 1000)));
  assert.deepEqual(K.jalaliLeaps(), [4, 8, 12, 16, 20, 24, 28, 33]);
  assert.equal(K.jalaliLeaps().length / 33, K.CALENDARS.jalali.leaps / K.CALENDARS.jalali.cycle);
});

test('continued fractions: 1/4, 7/29, 8/33, 31/128 are the convergents of 0.24219', () => {
  const c = K.convergents(K.TROPICAL_YEAR - 365, 5).slice(1).map((f) => `${f.num}/${f.den}`);
  assert.deepEqual(c.slice(0, 4), ['1/4', '7/29', '8/33', '31/128']);
});

test('Saccheri summit angles: right when flat, acute when hyperbolic, obtuse when spherical', () => {
  assert.equal(K.summitAngle(0, 1, 1.2), 90);
  assert.ok(K.summitAngle(-0.5, 1, 1.2) < 90);
  assert.ok(K.summitAngle(0.5, 1, 1.2) > 90);
  assert.ok(K.summitAngle(-0.5, 1.5, 1.8) < K.summitAngle(-0.5, 1, 1.2), 'bigger shapes bend further');
});

test('binomial triangle and expansion', () => {
  assert.deepEqual(K.pascalRow(4), [1, 4, 6, 4, 1]);
  assert.equal(K.pascalRow(10).reduce((a, b) => a + b), 1024);
  assert.equal(K.expand(2), 'a² + 2ab + b²');
  assert.equal(K.expand(1), 'a + b');
});

test('rhymes: common pairs by ear, not by eye', () => {
  for (const [a, b] of [['night', 'light'], ['knows', 'rose'], ['rolled', 'old'], ['bough', 'thou'], ['fire', 'desire'], ['bread', 'head'], ['unsaid', 'bed'], ['cried', 'outside'], ['air', 'despair']]) {
    assert.ok(K.rhymes(a, b), `${a} / ${b} should rhyme`);
  }
  for (const [a, b] of [['night', 'day'], ['phone', 'none'], ['cat', 'dog']]) {
    assert.ok(!K.rhymes(a, b), `${a} / ${b} should not rhyme`);
  }
});

test("the forge reads FitzGerald's own quatrains as rubāʿiyāt (at least 97%)", () => {
  // Every quatrain printed in the lesson's three-layer lab, both editions.
  const html = fs.readFileSync(new URL('../lessons/language-literature/pioneers/omar-khayyam.html', import.meta.url), 'utf8');
  const stanzas = [...html.matchAll(/<p data-kh-lines>([\s\S]*?)<\/p>/g)].map((m) => m[1].split(/<br>/).map((l) => l.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&')));
  assert.equal(stanzas.length, 18, 'nine quatrains × two editions');
  const ok = stanzas.filter((s) => K.checkRubai(s).isRubai).length;
  assert.ok(ok / stanzas.length >= 0.97, `only ${ok} of ${stanzas.length} read as AABA/AAAA`);
  const r = K.checkRubai(['With them the seed of Wisdom did I sow,', 'And with mine own hand wrought to make it grow;', 'And this was all the Harvest that I reap’d—', '“I came like Water, and like Wind I go.”']);
  assert.equal(r.pattern, 'AABA');
  assert.ok(r.hasTurn);
  assert.ok(r.syllables.every((n) => n >= 9 && n <= 11), `syllables ${r.syllables}`);
});

test('checkRubai flags broken schemes and honours a student override', () => {
  const lines = ['The phone is dead, the screen is black', 'I swear I will not look back', 'But here my thumb still finds the glass', 'and taps it twice: come back, come back'];
  const auto = K.checkRubai(lines);
  assert.equal(auto.pattern, 'AABA');
  const over = K.checkRubai(lines, ['A', 'B', 'C', 'A']);
  assert.ok(!over.isRubai);
  assert.ok(K.checkRubai(['one line', '', '', '']).notes[0].includes('still empty'));
});

test('diffWords: keeps shared words in order, marks the rest', () => {
  const ops = K.diffWords('A Flask of Wine, a Book of Verse', 'A Jug of Wine, a Loaf of Bread');
  assert.deepEqual(ops.filter((o) => o.op === 'same').map((o) => o.text), ['A', 'of', 'Wine,', 'a', 'of']);
  assert.equal(K.kept('a b c', 'a b c'), 1);
});
