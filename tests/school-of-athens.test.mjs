import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  VISUAL_EXHIBITS,
  HARLEM_MUSICIANS,
  PEPPER_CLUSTERS,
  GATHERING_WORKS,
  COMPARE_PRESETS,
  filterHarlemMusicians,
  compareGatherings,
  computeAnamorphicTransform
} from '../assets/js/lessons/school-of-athens-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('all 6 visual exhibits have valid figure counts, unique IDs, and in-bounds coordinates', () => {
  const expectedCounts = {
    athens: 16,
    'last-supper': 9,
    bosch: 9,
    ambassadors: 11,
    cana: 9,
    solvay: 29
  };

  assert.deepEqual(Object.keys(VISUAL_EXHIBITS).sort(), Object.keys(expectedCounts).sort());

  for (const [id, exhibit] of Object.entries(VISUAL_EXHIBITS)) {
    assert.equal(exhibit.figures.length, expectedCounts[id], `${id} figure count`);
    assert.ok(exhibit.figures.some((f) => f.id === exhibit.initialId), `${id} initialId exists`);
    const ids = new Set();

    for (const fig of exhibit.figures) {
      assert.ok(!ids.has(fig.id), `${id}: duplicate figure id ${fig.id}`);
      ids.add(fig.id);
      assert.ok(fig.x > 0 && fig.x < 100, `${id}/${fig.id}: x=${fig.x} out of bounds`);
      assert.ok(fig.y > 0 && fig.y < 100, `${id}/${fig.id}: y=${fig.y} out of bounds`);
      for (const field of ['name', 'short', 'role', 'summary', 'impact', 'lookfor', 'systemLens', 'tag']) {
        assert.ok(String(fig[field] || '').trim().length > 0, `${id}/${fig.id}: missing ${field}`);
      }
    }
  }
});

test('precision coordinate spot-checks guard against hotspot drift', () => {
  const byId = (exId) => Object.fromEntries(VISUAL_EXHIBITS[exId].figures.map((f) => [f.id, f]));

  const athens = byId('athens');
  assert.ok(athens.hypatia.x < 40, 'Hypatia is on the left side above Pythagoras');
  assert.ok(athens.socrates.x >= 33 && athens.socrates.x <= 40, 'Socrates pin aligns on his tunic/head');
  assert.ok(athens.euclid.x > 75, 'Euclid is in the lower right cluster');
  assert.ok(athens.raphael.x < 94, 'Raphael self-portrait stays inside arch frame');
  assert.ok(athens.apollo && athens.athena, 'Apollo and Athena niche statues present');

  const solvay = VISUAL_EXHIBITS.solvay.figures;
  const front = solvay.filter((f) => f.row === 'front');
  const middle = solvay.filter((f) => f.row === 'middle');
  const back = solvay.filter((f) => f.row === 'back');
  const nobels = solvay.filter((f) => Boolean(f.nobel));

  assert.equal(front.length, 9);
  assert.equal(middle.length, 9);
  assert.equal(back.length, 11);
  assert.equal(nobels.length, 17);

  const maxBackY = Math.max(...back.map((f) => f.y));
  const minMidY = Math.min(...middle.map((f) => f.y));
  const maxMidY = Math.max(...middle.map((f) => f.y));
  const minFrontY = Math.min(...front.map((f) => f.y));
  assert.ok(minMidY > maxBackY, `Middle row (${minMidY}) sits strictly below back row (${maxBackY})`);
  assert.ok(minFrontY > maxMidY, `Front row (${minFrontY}) sits strictly below middle row (${maxMidY})`);

  const amb = byId('ambassadors');
  assert.ok(amb.crucifix.x < 10 && amb.crucifix.y < 12, 'Hidden crucifix sits top-left');
  assert.ok(amb.skull.y > 80, 'Anamorphic skull sits across foreground floor');
});

test('Harlem directory keeps all 57 musicians rights-safe with zero spatial coordinates', () => {
  assert.equal(HARLEM_MUSICIANS.length, 57);
  const ids = new Set();
  for (const m of HARLEM_MUSICIANS) {
    assert.ok(!ids.has(m.id), `duplicate Harlem id ${m.id}`);
    ids.add(m.id);
    assert.equal('x' in m, false, `${m.id}: must not contain spatial x`);
    assert.equal('y' in m, false, `${m.id}: must not contain spatial y`);
    assert.equal('lookfor' in m, false, `${m.id}: must not contain spatial photo lookfor`);
    assert.ok(['Brass', 'Reeds', 'Piano & Rhythm', 'Vocals & Strings'].includes(m.instrumentFamily), m.id);
    assert.ok(['Early Jazz & Stride', 'Swing', 'Bebop & Hard Bop', 'Cool & Modern'].includes(m.era), m.id);
    assert.ok(m.listenFor && m.summary && m.impact, m.id);
  }

  const allSorted = filterHarlemMusicians(HARLEM_MUSICIANS);
  assert.equal(allSorted.length, 57);
  for (let i = 1; i < allSorted.length; i++) {
    assert.ok(allSorted[i - 1].name.localeCompare(allSorted[i].name) <= 0, 'sorted alphabetically');
  }

  const freemanSearch = filterHarlemMusicians(HARLEM_MUSICIANS, { query: 'bud freeman' });
  assert.equal(freemanSearch.length, 1);
  assert.equal(freemanSearch[0].id, 'bud-freeman');

  const monkCircle = filterHarlemMusicians(HARLEM_MUSICIANS, { query: 'monk' });
  assert.equal(monkCircle.length, 4);
  assert.ok(monkCircle.some((m) => m.id === 'thelonious-monk'));

  const brassBebop = filterHarlemMusicians(HARLEM_MUSICIANS, {
    family: 'Brass',
    era: 'Bebop & Hard Bop'
  });
  assert.ok(brassBebop.some((m) => m.id === 'dizzy-gillespie'));
  assert.ok(brassBebop.every((m) => m.instrumentFamily === 'Brass' && m.era === 'Bebop & Hard Bop'));
});

test('Gatherings comparison lab and Sgt. Pepper clusters cover all 8 works', () => {
  assert.equal(GATHERING_WORKS.length, 8);
  assert.ok(PEPPER_CLUSTERS.length >= 6);
  assert.ok(COMPARE_PRESETS.length >= 4);

  const pair = compareGatherings('athens', 'solvay');
  assert.equal(pair.workA.id, 'athens');
  assert.equal(pair.workB.id, 'solvay');
  assert.match(pair.prompt, /Raphael|Couprie/i);

  const selfPair = compareGatherings('bosch', 'bosch');
  assert.match(selfPair.prompt, /two different/i);
});

test('computeAnamorphicTransform clamps angle and produces expected foreshortening curve', () => {
  const straight = computeAnamorphicTransform(-10);
  assert.equal(straight.angle, 0);
  assert.equal(straight.scaleX, 1);
  assert.equal(straight.rotDeg, 0);

  const oblique = computeAnamorphicTransform(82);
  assert.equal(oblique.angle, 82);
  assert.ok(oblique.scaleX < 0.16 && oblique.scaleX >= 0.142);
  assert.equal(oblique.rotDeg, 26);

  const over = computeAnamorphicTransform(120);
  assert.equal(over.angle, 82);
});

test('school-of-athens.html meets rights, typography, timeline, and companion-link checks', () => {
  const html = fs.readFileSync(path.join(ROOT, 'lessons/humanities/school-of-athens.html'), 'utf8');
  assert.equal(html.includes('great-day-in-harlem.jpg'), false, 'must not reference retired Harlem photo');
  assert.equal(html.includes('fonts.googleapis.com'), false, 'must use self-hosted fonts');
  assert.match(html, /<ol[^>]*data-timeline[^>]*>/, 'uses shared ClassroomOS timeline engine');
  assert.match(html, /href="pioneers\/leonardo-da-vinci\.html"/, 'links to current Leonardo lesson path');
  assert.equal(html.includes('../leonardo-da-vinci.html'), false, 'no stale Leonardo relative path');
});
