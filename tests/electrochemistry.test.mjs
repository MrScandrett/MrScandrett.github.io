import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Core = require('../assets/js/lessons/electrochemistry-core.js');

test('standard cell potentials and electron stoichiometry match textbook values', () => {
  const daniell = Core.analyzeCell({ leftKey: 'Zn', rightKey: 'Cu' });
  assert.ok(Math.abs(daniell.e0 - 1.10) < 1e-6);
  assert.ok(Math.abs(daniell.E - 1.10) < 1e-4);
  assert.equal(daniell.n, 2);
  assert.equal(daniell.spontaneousDir, 1);
  assert.equal(daniell.currentActive, true);
  assert.equal(daniell.actualAnode.k, 'Zn');
  assert.equal(daniell.actualCathode.k, 'Cu');

  const reversed = Core.analyzeCell({ leftKey: 'Cu', rightKey: 'Zn' });
  assert.ok(Math.abs(reversed.e0 + 1.10) < 1e-6);
  assert.equal(reversed.spontaneousDir, -1);
  assert.equal(reversed.actualAnode.k, 'Zn');
  assert.equal(reversed.actualCathode.k, 'Cu');

  const alCu = Core.analyzeCell({ leftKey: 'Al', rightKey: 'Cu' });
  assert.equal(alCu.n, 6);
  assert.equal(alCu.a, 2);
  assert.equal(alCu.b, 3);
  assert.ok(Math.abs(alCu.e0 - 2.00) < 1e-6);

  const mgAg = Core.analyzeCell({ leftKey: 'Mg', rightKey: 'Ag' });
  assert.equal(mgAg.n, 2);
  assert.ok(Math.abs(mgAg.e0 - 3.17) < 1e-6);
});

test('Nernst concentration, temperature, and concentration cell math behave physically', () => {
  // Raising reactant [Cu2+] raises E above 1.10 V; raising product [Zn2+] lowers it
  const boosted = Core.analyzeCell({ leftKey: 'Zn', rightKey: 'Cu', cLeft: 0.01, cRight: 1.0 });
  assert.ok(boosted.E > 1.15);

  const dilutedCathode = Core.analyzeCell({ leftKey: 'Zn', rightKey: 'Cu', cLeft: 1.0, cRight: 0.01 });
  assert.ok(Math.abs(dilutedCathode.E - (1.10 - (0.05916 / 2) * 2)) < 0.002);

  // Concentration cell: identical electrodes (E° = 0), 0.001 M left vs 1.0 M right
  const concCell = Core.analyzeCell({ leftKey: 'Cu', rightKey: 'Cu', cLeft: 0.001, cRight: 1.0 });
  assert.equal(concCell.isConcentrationCell, true);
  assert.equal(concCell.e0, 0);
  assert.ok(concCell.E > 0.085 && concCell.E < 0.092);
  assert.equal(concCell.actualAnode.k, 'Cu');
  assert.equal(concCell.anodeSide, 'left');
  assert.equal(concCell.status, 'concentration');

  // Higher temperature increases Nernst slope
  const cool = Core.analyzeCell({ leftKey: 'Cu', rightKey: 'Cu', cLeft: 0.001, cRight: 1.0, tempC: 0 });
  const warm = Core.analyzeCell({ leftKey: 'Cu', rightKey: 'Cu', cLeft: 0.001, cRight: 1.0, tempC: 75 });
  assert.ok(warm.E > cool.E);
});

test('extreme equilibrium constant K formats cleanly without Infinity', () => {
  const mgAu = Core.analyzeCell({ leftKey: 'Mg', rightKey: 'Au' });
  assert.equal(mgAu.n, 6);
  assert.ok(Math.abs(mgAu.e0 - 3.87) < 1e-6);
  assert.ok(mgAu.log10K > 390);
  assert.ok(!mgAu.kFormatted.includes('Infinity'));
  assert.ok(mgAu.kFormatted.includes('× 10'));
});

test('open switch, missing salt bridge, and electrolytic overdrive work accurately', () => {
  const openSw = Core.analyzeCell({ leftKey: 'Zn', rightKey: 'Cu', switchClosed: false });
  assert.equal(openSw.currentActive, false);
  assert.equal(openSw.flowDir, 0);
  assert.ok(Math.abs(openSw.measuredV - 1.10) < 1e-3);
  assert.equal(openSw.status, 'open-switch');

  const noBridge = Core.analyzeCell({ leftKey: 'Zn', rightKey: 'Cu', saltBridge: false });
  assert.equal(noBridge.currentActive, false);
  assert.equal(noBridge.measuredV, 0);
  assert.equal(noBridge.status, 'no-bridge');

  const tooLow = Core.analyzeCell({ leftKey: 'Zn', rightKey: 'Cu', mode: 'electrolytic', appliedV: 0.9 });
  assert.equal(tooLow.currentActive, false);
  assert.equal(tooLow.status, 'electrolytic-insufficient');

  const driven = Core.analyzeCell({ leftKey: 'Zn', rightKey: 'Cu', mode: 'electrolytic', appliedV: 1.8 });
  assert.equal(driven.currentActive, true);
  assert.equal(driven.flowDir, -1); // drives electrons backward from Cu to Zn
  assert.equal(driven.actualAnode.k, 'Cu');
  assert.equal(driven.actualCathode.k, 'Zn');
  assert.equal(driven.status, 'electrolytic-active');
});

test('galvanic discharge monotonically moves concentrations and drops voltage toward equilibrium', () => {
  let state = { leftKey: 'Cu', rightKey: 'Cu', cLeft: 0.01, cRight: 1.0, tempC: 25, switchClosed: true, saltBridge: true, mode: 'galvanic' };
  const initialE = Core.analyzeCell(state).E;
  for (let i = 0; i < 40; i++) {
    const next = Core.stepDischarge(state, 0.25, 0.3);
    state = { ...state, cLeft: next.cLeft, cRight: next.cRight };
  }
  const finalCell = Core.analyzeCell(state);
  assert.ok(finalCell.E < initialE);
  assert.ok(finalCell.cLeft > 0.01);
  assert.ok(finalCell.cRight < 1.0);
});

test('Faraday electroplating stoichiometry computes charge, moles, mass, and thickness', () => {
  const cu = Core.computeFaraday({ metalKey: 'Cu', currentA: 2.0, timeMinutes: 30, areaCm2: 25 });
  assert.equal(cu.valid, true);
  assert.equal(cu.chargeC, 3600);
  assert.ok(Math.abs(cu.massGrams - 1.1855) < 0.005);
  assert.ok(cu.thicknessUm > 40 && cu.thicknessUm < 70);

  const ag = Core.computeFaraday({ metalKey: 'Ag', currentA: 2.0, timeMinutes: 30, areaCm2: 25 });
  assert.ok(ag.molesMetal > cu.molesMetal * 1.99);

  const invalid = Core.computeFaraday({ metalKey: 'Cu', currentA: 0, timeMinutes: 10 });
  assert.equal(invalid.valid, false);
});

test('all presets and practice problems validate cleanly', () => {
  assert.ok(Core.CELL_PRESETS.length >= 5);
  assert.ok(Core.PLATING_PRESETS.length >= 4);
  for (const p of Core.CELL_PRESETS) {
    const res = Core.analyzeCell(p);
    assert.ok(isFinite(res.E));
  }
  for (const pp of Core.PLATING_PRESETS) {
    const res = Core.computeFaraday(pp);
    assert.equal(res.valid, true);
  }
  for (const prob of Core.PRACTICE_PROBLEMS) {
    const good = Core.checkPracticeAnswer(
      prob,
      prob.kind === 'numeric' ? { value: String(prob.answer) } : { choice: prob.answer }
    );
    assert.equal(good.correct, true, `Expected correct answer for ${prob.id}`);
  }
});
