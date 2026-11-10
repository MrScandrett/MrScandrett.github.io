import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UNITS, MATERIALS, WORLDS, MODES, unitsFor, modeFor, convert, remainingUnit,
  gradePrediction, cubeSideCm, format,
} from '../assets/js/lessons/unit-factory-core.mjs';

const close = (a, b, rel = 1e-9) => assert.ok(Math.abs(a - b) <= rel * Math.max(1, Math.abs(b)), `${a} ≈ ${b}`);

test('unit symbols are unique and every mode offers at least one unit', () => {
  assert.equal(new Set(UNITS.map((u) => u.symbol)).size, UNITS.length);
  for (const mode of Object.keys(MODES)) assert.ok(unitsFor(mode).length > 0, mode);
});

test('same-mass conversions use the exact definitions', () => {
  close(convert({ mode: 'real', unit: 'g' }).value, 10000);
  close(convert({ mode: 'real', unit: 'mg' }).value, 1e7);
  close(convert({ mode: 'real', unit: 't' }).value, 0.01);
  close(convert({ mode: 'real', unit: 'lb' }).value, 10 / 0.45359237);
  close(convert({ mode: 'real', unit: 'oz' }).value, (10 / 0.45359237) * 16);
  assert.equal(convert({ mode: 'real', unit: 'g' }).approx, false);
  assert.equal(convert({ mode: 'real', unit: 'lb' }).approx, true);
});

test('every factor chain cancels down to exactly the answer unit', () => {
  for (const mode of ['real', 'density', 'gravity']) {
    for (const u of unitsFor(mode)) {
      for (const material of MATERIALS.map((m) => m.id)) {
        for (const world of WORLDS.map((w) => w.id)) {
          const run = convert({ mode, unit: u.symbol, material, world });
          assert.equal(remainingUnit(run.steps), u.symbol, `${mode} ${u.symbol}`);
        }
      }
    }
  }
});

test('density bridge: 10 kg of water is 10 L; denser is smaller', () => {
  close(convert({ mode: 'density', unit: 'L', material: 'water' }).value, 10);
  close(convert({ mode: 'density', unit: 'mL', material: 'water' }).value, 10000);
  close(convert({ mode: 'density', unit: 'cm³', material: 'gold' }).value, 10000 / 19.32);
  close(convert({ mode: 'density', unit: 'm³', material: 'air' }).value, 10 / 0.0012 / 1000);
  const sorted = [...MATERIALS].sort((a, b) => b.density - a.density);
  const litres = sorted.map((m) => convert({ mode: 'density', unit: 'L', material: m.id }).value);
  for (let i = 1; i < litres.length; i++) assert.ok(litres[i] > litres[i - 1]);
  assert.ok(convert({ mode: 'density', unit: 'L', material: 'gold' }).approx, 'measured facts are approximate');
  close(cubeSideCm(10), 21.5443469, 1e-6);
});

test('gravity bridge: Earth standard gravity and pounds-force agree', () => {
  close(convert({ mode: 'gravity', unit: 'N', world: 'earth' }).value, 98.0665);
  // 10 kg under standard gravity is, by definition, 10/0.45359237 lbf.
  close(convert({ mode: 'gravity', unit: 'lbf', world: 'earth' }).value, 10 / 0.45359237, 1e-12);
  close(convert({ mode: 'gravity', unit: 'N', world: 'moon' }).value, 16.2);
});

test('imagination keeps the number and refuses nothing', () => {
  for (const u of UNITS) {
    const run = convert({ mode: 'fantasy', unit: u.symbol });
    assert.equal(run.value, 10);
    assert.equal(run.imaginary, true);
  }
});

test('modes reject units that do not belong to them', () => {
  assert.throws(() => convert({ mode: 'real', unit: 'L' }));
  assert.throws(() => convert({ mode: 'density', unit: 'N' }));
  assert.equal(modeFor('L', 'real'), 'density');
  assert.equal(modeFor('lb', 'fantasy'), 'fantasy');
  assert.equal(modeFor('N', 'density'), 'gravity');
});

test('prediction grading spots flipped factors and prefix slips', () => {
  assert.equal(gradePrediction(10000, 10000).grade, 'spot');
  assert.equal(gradePrediction(22, 22.046).grade, 'spot');
  assert.equal(gradePrediction(21, 22.046).grade, 'close');
  const flipped = gradePrediction(0.01, 10000);
  assert.equal(flipped.grade, 'off');
  assert.ok(flipped.flipped);
  assert.equal(gradePrediction(10, 10000).tenPower, -3);
  assert.equal(gradePrediction(Number('abc'), 1), null);
});

test('format groups digits and trims decimals', () => {
  assert.equal(format(10000), '10,000');
  assert.equal(format(22.0462262), '22.046');
  assert.equal(format(0.5175983), '0.5176');
});
