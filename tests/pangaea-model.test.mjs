import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

import {
  KEYFRAME_AGES,
  getGeologicPeriod,
  getNarrativeFrame,
  getContinentLabels,
  getFossilMarkers,
  getTectonicEvents,
  classifyPaleolatitude,
  computeSeafloorMetrics,
  computeDriftDistance,
  evaluateMissions,
  gradeQuiz,
  QUIZ_QUESTIONS
} from '../assets/js/lessons/pangaea-model.mjs';

test('geologic period lookup maps ages 0–240 Ma accurately', () => {
  assert.equal(getGeologicPeriod(240).id, 'triassic');
  assert.equal(getGeologicPeriod(202).id, 'triassic');
  assert.equal(getGeologicPeriod(180).id, 'jurassic');
  assert.equal(getGeologicPeriod(120).id, 'cretaceous');
  assert.equal(getGeologicPeriod(40).id, 'paleogene');
  assert.equal(getGeologicPeriod(0).id, 'neogene');
});

test('narrative frames select nearest milestone cleanly', () => {
  assert.equal(getNarrativeFrame(240).time, 240);
  assert.equal(getNarrativeFrame(190).time, 200);
  assert.equal(getNarrativeFrame(90).time, 80);
  assert.equal(getNarrativeFrame(0).time, 0);
});

test('every continent label and fossil clue point falls on real GPlates land at keyframe ages', () => {
  const ctx = { console };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('assets/vendor/d3-geo-runtime.min.js', 'utf8'), ctx);
  const d3 = ctx.d3;

  for (const age of KEYFRAME_AGES) {
    const geo = JSON.parse(fs.readFileSync(`assets/geodata/pangaea/coastlines_${age}ma_simple.json`, 'utf8'));
    for (const label of getContinentLabels(age)) {
      assert.equal(
        d3.geoContains(geo, label.coords),
        true,
        `Continent label "${label.name}" at ${age} Ma (${label.coords}) should be inside reconstructed land`
      );
    }
    for (const suite of getFossilMarkers(age)) {
      for (const pt of suite.points) {
        assert.equal(
          d3.geoContains(geo, pt.coords),
          true,
          `Fossil "${suite.name}" (${pt.region}) at ${age} Ma (${pt.coords}) should be inside reconstructed land`
        );
      }
    }
  }
});

test('tectonic events filter properly by active age', () => {
  const pangaeaEvents = getTectonicEvents(240).map((e) => e.id);
  assert.ok(pangaeaEvents.includes('panthalassa'));
  assert.ok(!pangaeaEvents.includes('india-collision'));

  const modernEvents = getTectonicEvents(0).map((e) => e.id);
  assert.ok(modernEvents.includes('mid-atlantic'));
  assert.ok(modernEvents.includes('india-collision'));
  assert.ok(!modernEvents.includes('panthalassa'));
});

test('paleolatitude classification categorizes tropical, arid, temperate, and polar belts', () => {
  assert.match(classifyPaleolatitude(5).belt, /Tropical/i);
  assert.match(classifyPaleolatitude(-28).belt, /Subtropical/i);
  assert.match(classifyPaleolatitude(48).belt, /Temperate/i);
  assert.match(classifyPaleolatitude(-75).belt, /Polar/i);
});

test('seafloor spreading metrics compute symmetrical crust age accurately', () => {
  // 2.5 cm/yr half-rate = 25 km/Ma -> 500 km = 20 Ma, full widening = 5.0 cm/yr
  const m = computeSeafloorMetrics(500, 2.5);
  assert.equal(m.fullRateCmPerYr, 5);
  assert.equal(m.crustAgeMa, 20);
  assert.equal(m.isSymmetric, true);
});

test('drift distance calculator converts cm/yr over millions of years accurately', () => {
  // 5 cm/yr over 100,000,000 years = 5,000 km
  const res = computeDriftDistance(5, 100_000_000);
  assert.equal(res.km, 5000);
  assert.ok(res.miles > 3100 && res.miles < 3115);
  assert.ok(res.benchmark.length > 0);
});

test('mission evaluation tracks all 4 investigations', () => {
  assert.equal(evaluateMissions({}).count, 0);
  const full = evaluateMissions({
    sawPangaeaFossils: true,
    comparedAncientWithModern: true,
    visitedGlobeSouth: true,
    probedAncientCrust: true
  });
  assert.equal(full.count, 4);
  assert.equal(full.total, 4);
});

test('quiz grader validates all 5 questions and returns explanations', () => {
  const perfect = {};
  for (const q of QUIZ_QUESTIONS) perfect[q.id] = q.answer;
  const result = gradeQuiz(perfect);
  assert.equal(result.score, 5);
  assert.equal(result.total, 5);
  assert.ok(result.details.every((d) => d.correct && d.explanation.length > 20));

  const partial = gradeQuiz({ 'pd-q1': 'mechanism', 'pd-q2': 'tides' });
  assert.equal(partial.score, 1);
  assert.equal(partial.details[0].correct, true);
  assert.equal(partial.details[1].correct, false);
});
