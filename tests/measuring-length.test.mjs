import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const M = require('../assets/js/lessons/measuring-length-core.js');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} expected ${b}, got ${a}`);

test('there are 17 conversion categories', () => {
  assert.equal(Object.keys(M.CATEGORIES).length, 17);
});

test('every category round-trips between every pair of units', () => {
  for (const [key, cat] of Object.entries(M.CATEGORIES)) {
    const keys = Object.keys(cat.units);
    for (const a of keys) for (const b of keys) {
      const there = M.convertValue(key, 7.25, a, b).result;
      const back = M.convertValue(key, there, b, a).result;
      near(back, 7.25, Math.abs(7.25) * 1e-9, `${key} ${a}→${b}→${a}`);
    }
  }
});

test('well-known length conversions', () => {
  near(M.convertValue('length', 1, 'in', 'mm').result, 25.4, 1e-9);
  near(M.convertValue('length', 1, 'mi', 'km').result, 1.609344, 1e-9);
  near(M.convertValue('length', 1, 'ft', 'in').result, 12, 1e-9);
  near(M.convertValue('speed', 60, 'mph', 'mps').result, 26.8224, 1e-4);
});

test('temperature is affine', () => {
  near(M.convertValue('temperature', 0, 'C', 'F').result, 32, 1e-9);
  near(M.convertValue('temperature', 0, 'C', 'K').result, 273.15, 1e-9);
  near(M.convertValue('temperature', -40, 'C', 'F').result, -40, 1e-9);
  near(M.convertValue('temperature', 0, 'K', 'C').result, -273.15, 1e-9);
  near(M.convertValue('temperature', 98.6, 'F', 'C').result, 37, 1e-9);
  assert.equal(M.convertValue('temperature', 1, 'C', 'F').steps, null);
});

test('factor-label steps multiply back to the result', () => {
  const r = M.convertValue('length', 3, 'ft', 'cm');
  near(r.steps.value * r.steps.siPerFrom * r.steps.toPerSi, r.result, 1e-9);
  assert.equal(r.steps.from, 'ft');
  assert.equal(r.steps.si, 'm');
});

test('bad input converts to null', () => {
  assert.equal(M.convertValue('length', NaN, 'm', 'ft'), null);
  assert.equal(M.convertValue('length', 1, 'm', 'nope'), null);
  assert.equal(M.convertValue('nope', 1, 'm', 'ft'), null);
});

test('inch fractions', () => {
  assert.equal(M.formatFractionalInch(1), '1"');
  assert.equal(M.formatFractionalInch(0.5), '1/2"');
  assert.equal(M.formatFractionalInch(190 / 25.4), '7 31/64"');
});

test('caliper reading splits into main scale and vernier', () => {
  const d = M.decomposeCaliper(190, 0);
  assert.equal(d.mainMm, 190);
  assert.equal(d.vernierIndex, 0);
  const e = M.decomposeCaliper(24.26, 0);
  assert.equal(e.mainMm, 24);
  assert.equal(e.vernierIndex, 13);
  near(e.readingMm, 24.26, 1e-9);
  const tared = M.decomposeCaliper(50, 20);
  near(tared.netMm, 30, 1e-9);
  assert.equal(tared.mainMm, 30);
});

test('pressure and boiling point', () => {
  near(M.pressureAtAltitude(0), 101325, 1e-6);
  near(M.pressureAtAltitude(-10) / 101325, 1.993, 0.01);
  near(M.pressureAtAltitude(8849) / 101325, 0.35, 0.02);
  near(M.waterBoilingPointC(101325), 100, 0.1);
  near(M.waterBoilingPointC(M.pressureAtAltitude(1600)), 95, 1.2);
  near(M.waterBoilingPointC(M.pressureAtAltitude(8849)), 71, 2);
  assert.ok(M.waterBoilingPointC(M.pressureAtAltitude(19000)) < 55);
  assert.ok(M.waterBoilingPointC(M.pressureAtAltitude(-1000)) <= 374);
});

test('molecular speed scales as √T, energy as T', () => {
  const a = M.kineticStats(283.15), b = M.kineticStats(293.15);
  near(b.vRmsMs / a.vRmsMs - 1, 0.0175, 0.0005, 'speed');
  near(b.meanEkMeV / a.meanEkMeV - 1, 0.0353, 0.0005, 'energy');
  assert.equal(M.kineticStats(0).vRmsMs, 0);
  near(M.kineticStats(293).vRmsMs, 511, 5);
});

test('practice answers tolerate commas and units', () => {
  assert.equal(M.parsePracticeNumber('5,280'), 5280);
  assert.equal(M.parsePracticeNumber(' 300 mm '), 300);
  assert.equal(M.parsePracticeNumber('101 kPa'), 101);
  assert.equal(M.parsePracticeNumber('837'), 837);
  assert.ok(Number.isNaN(M.parsePracticeNumber('')));
  assert.ok(Number.isNaN(M.parsePracticeNumber('abc')));
  assert.ok(Number.isNaN(M.parsePracticeNumber('12 + 3')));
});

test('prefixes cover quecto to quetta', () => {
  assert.equal(M.SI_PREFIX_BY_EXP['-30'], 'quecto-');
  assert.equal(M.SI_PREFIX_BY_EXP['30'], 'quetta-');
  assert.equal(M.SI_PREFIX_BY_EXP['26'], undefined);
});
