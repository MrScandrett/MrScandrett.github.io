import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  artifactForDay, distanceKm, locationScore, yearScore, yearTolerance, roundScore, tierFor,
  formatYear, formatYearDiff, parseYear, yearFromRuler, rulerFromYear, niceYear, RULER, RULER_TICKS,
  artifactProblems, MIN_YEAR, MAX_YEAR, MAX_POINTS, FIRST_DAY
} from '../assets/js/daily-artifact-core.mjs';
import { shiftDayKey } from '../assets/js/daily-puzzles-core.mjs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const { artifacts } = JSON.parse(read('data/daily-artifact-bank.json'));
const pad = (n) => String(n).padStart(2, '0');
const firstKey = (() => { const d = new Date(FIRST_DAY); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; })();

test('bank: every artifact is complete, unique and credited', () => {
  assert.ok(artifacts.length >= 20);
  assert.equal(new Set(artifacts.map((a) => a.id)).size, artifacts.length, 'duplicate id');
  for (const a of artifacts) assert.deepEqual(artifactProblems(a), [], a.id);
});

test('bank: every lesson link and image exists, and both view types are in play', () => {
  for (const a of artifacts) {
    assert.ok(existsSync(new URL(a.lesson.href, root)), `${a.id}: lesson ${a.lesson.href}`);
    if (a.image) assert.ok(existsSync(new URL(a.image, root)), `${a.id}: image ${a.image}`);
  }
  assert.ok(artifacts.filter((a) => a.sketchfab).length >= 8, 'needs plenty of 3D');
  assert.ok(artifacts.filter((a) => a.image).length >= 8, 'needs plenty of 2D');
});

test('bank: 3D models come from the ones The Ages lesson already credits', () => {
  const ages = JSON.parse(read('data/ages-lesson.json'));
  const known = new Set([...ages.artifacts, ...ages.faithArtifacts].map((a) => a.sketchfabId));
  for (const a of artifacts.filter((x) => x.sketchfab)) assert.ok(known.has(a.sketchfab), `${a.id} uses an unvetted model`);
});

test('bank: the day rotation walks the whole bank and never repeats a neighbour', () => {
  const seen = new Set();
  let key = firstKey;
  for (let i = 0; i < artifacts.length; i++, key = shiftDayKey(key, 1)) seen.add(artifactForDay(key, artifacts).id);
  assert.equal(seen.size, artifacts.length);
  assert.equal(artifactForDay(firstKey, artifacts), artifacts[0]);
  assert.equal(artifactForDay(shiftDayKey(firstKey, artifacts.length), artifacts), artifacts[0]);
  // days before launch still resolve (the widget lets students look 30 days back)
  assert.ok(artifactForDay(shiftDayKey(firstKey, -3), artifacts));
  for (let i = 1; i < artifacts.length; i++) {
    const [a, b] = [artifacts[i - 1], artifacts[i]];
    assert.ok(!(a.sketchfab && !a.image && b.sketchfab && !b.image), `${a.id} and ${b.id} are both 3D-only`);
  }
});

test('distance is great-circle kilometres', () => {
  assert.equal(distanceKm([10, 20], [10, 20]), 0);
  assert.ok(Math.abs(distanceKm([0, 0], [180, 0]) - 20015) < 5);
  assert.ok(Math.abs(distanceKm([2.2945, 48.8584], [-0.1276, 51.5072]) - 340) < 5, 'Paris to London');
});

test('location score: perfect inside 25 km, falls with distance, never below 0', () => {
  assert.equal(locationScore(0), MAX_POINTS);
  assert.equal(locationScore(25), MAX_POINTS);
  assert.ok(locationScore(500) > locationScore(2000));
  assert.ok(locationScore(2000) > locationScore(10000));
  assert.ok(locationScore(20015) >= 0);
});

test('year score: tolerance scales with age so an error means the same thing to every era', () => {
  assert.ok(yearTolerance(-17000) > yearTolerance(-2560));
  assert.ok(yearTolerance(-2560) > yearTolerance(1969));
  assert.equal(yearScore(1969, 1969), MAX_POINTS);
  // 40 years off is a bad miss for Apollo and a perfect score for Lascaux
  assert.ok(yearScore(1929, 1969) < 2500);
  assert.equal(yearScore(-17040, -17000), MAX_POINTS);
  // a few centuries off for the Pyramids still earns real points
  assert.ok(yearScore(-2260, -2560) > 1500);
  assert.ok(yearScore(MIN_YEAR, 1969) < 5);
  // monotone: farther is never better
  for (const actual of [-17000, -2560, 31, 1903]) {
    let last = Infinity;
    for (let d = 0; d <= 3000; d += 50) { const s = yearScore(actual + d, actual); assert.ok(s <= last); last = s; }
  }
});

test('round score: clue costs 10% and the pieces add up', () => {
  const plain = roundScore({ km: 0, guessYear: 1903, actualYear: 1903 });
  assert.equal(plain.total, 10000);
  assert.equal(plain.penalty, 0);
  const hinted = roundScore({ km: 0, guessYear: 1903, actualYear: 1903, clue: true });
  assert.equal(hinted.total, 9000);
  assert.equal(hinted.raw - hinted.penalty, hinted.total);
  assert.equal(tierFor(10000), 'Master curator');
  assert.equal(tierFor(0), 'Treasure hunter in training');
});

test('years format for reading and parse from typing', () => {
  assert.equal(formatYear(-2560), '2,560 BCE');
  assert.equal(formatYear(-1500000), '1.5 million BCE');
  assert.equal(formatYear(1903), '1903');
  assert.equal(formatYear(31), '31 CE');
  assert.equal(formatYearDiff(0), 'spot on');
  assert.equal(formatYearDiff(-1), '1 year off');
  assert.equal(formatYearDiff(1200), '1,200 years off');
  assert.equal(parseYear('2,560', 'BCE'), -2560);
  assert.equal(parseYear('1903', 'CE'), 1903);
  assert.equal(parseYear('1.5 million', 'BCE'), -1500000);
  assert.equal(parseYear('300 bc', 'CE'), -300, 'a typed era wins over the select');
  assert.equal(parseYear('44 AD', 'BCE'), 44);
  assert.equal(parseYear('10k', 'BCE'), -10000);
  for (const bad of ['', 'abc', '0', '-5', '1e3', '99999999', '3000 CE']) assert.equal(parseYear(bad, 'CE'), null, bad);
});

test('time ruler: strictly increasing, round-trips, and gives modern history room', () => {
  for (let i = 1; i < RULER.length; i++) { assert.ok(RULER[i][0] > RULER[i - 1][0]); assert.ok(RULER[i][1] > RULER[i - 1][1]); }
  assert.equal(yearFromRuler(0), MIN_YEAR);
  assert.equal(yearFromRuler(1), MAX_YEAR);
  let last = -Infinity;
  for (let p = 0; p <= 1; p += 0.01) { const y = yearFromRuler(p); assert.ok(y >= last && y !== 0); last = y; }
  for (const y of [-1500000, -17000, -9600, -2560, -196, 31, 1273, 1903, 1969]) {
    assert.ok(Math.abs(yearFromRuler(rulerFromYear(y)) - y) <= Math.max(10, Math.abs(y) * 0.02), `round trip ${y}`);
  }
  // at least ~10 px per 100 years on a 600 px slider through the modern stretch
  assert.ok((rulerFromYear(2000) - rulerFromYear(1900)) * 600 > 6);
  assert.equal(niceYear(0.3), 1);
  for (const [year] of RULER_TICKS) assert.ok(year >= MIN_YEAR && year <= MAX_YEAR);
});

test('every artifact year can be reached from the ruler within its own tolerance', () => {
  for (const a of artifacts) {
    const reach = yearFromRuler(rulerFromYear(a.year));
    assert.ok(yearScore(reach, a.year) > 4000, `${a.id}: ${a.year} -> ${reach}`);
  }
});
