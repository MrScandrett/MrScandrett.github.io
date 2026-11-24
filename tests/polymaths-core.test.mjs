import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const P = require('../assets/js/lessons/polymaths-core.js');

test('anchored polymath surpasses early specialist over time under field shift', () => {
  const sim = P.simulateTrajectories({
    samplingBreadth: 4,
    anchorDepth: 85,
    transferPractice: 85,
    fieldShift: true,
    years: 12
  });
  assert.equal(sim.years.length, 13);
  assert.ok(sim.earlySpecialist[2] > sim.anchoredPolymath[2], 'early specialist leads initially');
  assert.ok(sim.finalScores.polymath > sim.finalScores.specialist, 'anchored polymath leads at year 12');
  assert.ok(sim.finalScores.specialist > sim.finalScores.dabbler, 'unanchored dabbler stays below specialist');
  assert.ok(sim.crossoverYear !== null && sim.crossoverYear >= 4);
});

test('collision prompt flags same-field choices and generates distinct cross-field transfer', () => {
  const same = P.buildCollisionPrompt('music', 'music');
  assert.equal(same.sameField, true);

  const cross = P.buildCollisionPrompt('biology', 'visual-art');
  assert.equal(cross.sameField, false);
  assert.match(cross.historicalParallel, /Leonardo da Vinci/);
  assert.match(cross.pairLabel, /Biology.*Visual Design/);

  const custom = P.buildCollisionPrompt('code', 'music', 'Robotics', 'Jazz');
  assert.equal(custom.pairLabel, 'Robotics × Jazz');
});
