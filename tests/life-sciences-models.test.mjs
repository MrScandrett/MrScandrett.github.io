import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const luca = require('../assets/js/lessons/luca-tree.js');
const eco = require('../assets/js/lessons/ecosystems-food-webs.js');
const ns = require('../assets/js/lessons/natural-selection-lab.js');
const conn = require('../assets/js/lessons/connectomics.js');
const imm = require('../assets/js/lessons/immunology-lab.js');
const homeo = require('../assets/js/lessons/homeostasis-lab.js');
const info = require('../assets/js/lessons/life-as-information.js');

test('luca-tree traces lineages to luca, compares 2-domain vs 3-domain layouts, and scores evidence', () => {
  for (const mode of ['3domain', '2domain']) {
    const layout = luca.getTreeLayout(mode);
    for (const node of layout.nodes) {
      const chain = luca.pathToLuca(node.id, mode);
      assert.equal(chain[0], node.id);
      assert.equal(chain[chain.length - 1], 'luca');
    }
  }
  const twoDomain = luca.getTreeLayout('2domain');
  assert.ok(twoDomain.symbiosisEdges.length >= 2);
  assert.deepEqual(luca.pathToLuca('eukarya', '2domain'), ['eukarya', 'archaea', 'luca']);

  assert.equal(luca.evaluateEvidenceAnswer('chiral-aa', 'luca').correct, true);
  assert.equal(luca.evaluateEvidenceAnswer('wings', 'convergent').correct, true);
  assert.equal(luca.evaluateEvidenceAnswer('atp', 'convergent').correct, false);
});

test('ecosystems-food-webs cascades starvation, calculates energy pyramid, and models Lotka-Volterra', () => {
  const starvingFromGrass = eco.computeStarving(['grass']);
  assert.equal(starvingFromGrass.has('rabbit'), true);
  assert.equal(starvingFromGrass.has('grasshopper'), true);
  assert.equal(starvingFromGrass.has('frog'), true);
  assert.equal(starvingFromGrass.has('mouse'), false); // mouse also eats berries

  const starvingAllProducers = eco.computeStarving(['grass', 'berries']);
  for (const consumer of ['rabbit', 'mouse', 'grasshopper', 'frog', 'snake', 'owl', 'fox']) {
    assert.equal(starvingAllProducers.has(consumer), true);
  }

  const pyr = eco.computeEnergyPyramid(10000, 10);
  assert.deepEqual(
    pyr.levels.map((l) => Math.round(l.energy)),
    [10000, 1000, 100, 10]
  );

  // Logistic Lotka-Volterra caps rabbit growth near carrying capacity when foxes = 0
  let state = { R: 118, F: 0, t: 0 };
  for (let i = 0; i < 40; i++) {
    state = eco.stepLotkaVolterra(state, {
      a: 1.2, b: 0.04, c: 0.02, d: 0.9, logistic: true, carryingCapacity: 120
    }, 0.25);
  }
  assert.ok(state.R <= 120.5 && state.R >= 115);
  assert.equal(state.F, 0);
});

test('natural-selection-lab shifts mean trait toward target under selection and preserves N', () => {
  let seed = 42;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  let moths = Array.from({ length: 160 }, () => ({ trait: rng(), x: rng(), y: rng(), phase: 0 }));
  const initialStats = ns.computeTraitStats(moths);
  for (let g = 0; g < 15; g++) {
    const step = ns.stepPopulation(moths, {
      popSize: 160, target: 0.9, strength: 0.8, mutationStd: 0.02
    }, rng);
    assert.equal(step.moths.length, 160);
    moths = step.moths;
  }
  const finalStats = ns.computeTraitStats(moths);
  assert.ok(finalStats.mean > initialStats.mean + 0.2);
  assert.ok(finalStats.darkPct > initialStats.darkPct);
});

test('connectomics mini-circuit and Braitenberg vehicle respond accurately to wiring polarity', () => {
  const escape = conn.evaluateMiniConnectome(conn.MINI_PRESETS.escape);
  assert.ok(escape.motors[0] > escape.motors[1]);
  assert.match(escape.behavior, /Turn Right/);

  const approach = conn.evaluateMiniConnectome(conn.MINI_PRESETS.approach);
  assert.ok(approach.motors[1] > approach.motors[0]);
  assert.match(approach.behavior, /Turn Left/);

  const freeze = conn.evaluateMiniConnectome(conn.MINI_PRESETS.freeze);
  assert.deepEqual(freeze.motors, [0, 0]);
  assert.match(freeze.behavior, /Freeze/);

  // Light is ahead and to the robot's left (y < robot.y when facing a = 0)
  const robot = { x: 180, y: 350, a: 0 };
  const light = { x: 300, y: 200 };
  const sigB = conn.computeBraitenbergSignals(robot, light, 1); // B: Crossed +
  assert.ok(sigB.values[0] > sigB.values[1]); // Left sensor sees more light
  assert.ok(sigB.motors[1] > sigB.motors[0]); // Right motor runs faster -> turns left
});

test('immunology-lab builds memory safely from vaccine antigen and limits secondary pathogen peak', () => {
  let vaccinated = imm.createImmuneState();
  vaccinated.vaccineAntigen = 45;
  for (let i = 0; i < 120; i++) {
    vaccinated = imm.stepImmuneModel(vaccinated, 1, { innateOn: true, adaptiveOn: true });
  }
  assert.equal(vaccinated.pathogen, 0);
  assert.ok(vaccinated.memory > 25);

  // Compare naive vs primed exposure
  let naive = imm.createImmuneState();
  naive.pathogen = 4;
  naive.infectionActive = true;
  naive.exposureStart = 0;

  vaccinated.pathogen = 4;
  vaccinated.infectionActive = true;
  vaccinated.peakPathogen = 4;
  vaccinated.exposureStart = vaccinated.simTime;

  for (let i = 0; i < 120; i++) {
    naive = imm.stepImmuneModel(naive, 1, { innateOn: true, adaptiveOn: true });
    vaccinated = imm.stepImmuneModel(vaccinated, 1, { innateOn: true, adaptiveOn: true });
  }
  assert.ok(vaccinated.peakPathogen < naive.peakPathogen);
  assert.ok(vaccinated.peakPathogen < imm.SYMPTOM_THRESHOLD);
});

test('homeostasis-lab regulates temperature around normal 37.0C or fever 38.8C setpoint', () => {
  let normal = { coreTemp: 37.0, elapsed: 0, ambientTemp: -5, exercise: 0, clothing: 1, feedbackOn: true, feverMode: false };
  for (let i = 0; i < 120; i++) {
    const next = homeo.stepThermoModel(normal, 0.25);
    normal = { ...normal, ...next };
  }
  assert.ok(normal.coreTemp > 36.0 && normal.coreTemp < 37.6);

  let fever = { coreTemp: 37.0, elapsed: 0, ambientTemp: 20, exercise: 0, clothing: 1, feedbackOn: true, feverMode: true };
  for (let i = 0; i < 120; i++) {
    const next = homeo.stepThermoModel(fever, 0.25);
    fever = { ...fever, ...next };
  }
  assert.ok(fever.coreTemp > 38.2 && fever.coreTemp < 39.4);

  let noFeedback = { coreTemp: 37.0, elapsed: 0, ambientTemp: 45, exercise: 100, clothing: 2, feedbackOn: false, feverMode: false };
  for (let i = 0; i < 120; i++) {
    const next = homeo.stepThermoModel(noFeedback, 0.25);
    noFeedback = { ...noFeedback, ...next };
  }
  assert.ok(noFeedback.coreTemp > 40);
});

test('life-as-information classifies codon mutations and evaluates definition-of-life presets', () => {
  assert.equal(info.translateCodon('ATG'), 'Met');
  assert.equal(info.classifyCodonChange('CTT', 'CTC').kind, 'silent');
  assert.equal(info.classifyCodonChange('CTT', 'CAT').kind, 'missense');
  assert.equal(info.classifyCodonChange('TAC', 'TAA').kind, 'nonsense');

  const virus = info.CANDIDATES.find((c) => c.label === 'Virus');
  const mule = info.CANDIDATES.find((c) => c.label === 'Sterile mule');
  assert.equal(info.evaluateLifeCandidate(virus, info.PRESET_SETS.classic).status, 'partial');
  assert.equal(info.evaluateLifeCandidate(virus, info.PRESET_SETS.infofirst).status, 'alive');
  assert.equal(info.evaluateLifeCandidate(mule, info.PRESET_SETS.classic).status, 'partial');
  assert.equal(info.evaluateLifeCandidate(virus, info.PRESET_SETS.nasa).status, 'partial');
});
