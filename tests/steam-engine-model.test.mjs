// SteamEngineModel: physics behind the James Watt lesson's Engine House lab.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const M = require('../assets/js/lessons/steam-engine-model.js');

test('vapour pressure: 1 atm at 100 °C, about 12.3 kPa at 50 °C', () => {
  assert.ok(Math.abs(M.vapourPressure(100) - 101.325) < 0.2);
  assert.ok(Math.abs(M.vapourPressure(50) - 12.35) < 0.2);
  assert.ok(Math.abs(M.vapourPressure(25) - 3.17) < 0.1);
});

test('cylinder is a 30-inch bore, 7-foot stroke (about 0.97 m³)', () => {
  assert.ok(Math.abs(M.VOLUME - 0.973) < 0.01);
});

test('Newcomen duty lands near the measured average of Newcomen engines', () => {
  const best = M.bestNewcomenChill();
  assert.ok(best.duty > 5 && best.duty < 7.5, `best Newcomen duty ${best.duty}`);
  assert.ok(best.chill > 60 && best.chill < 85, `best chill ${best.chill}`);
  for (const t of [40, 50, 60]) {
    const d = M.stroke('newcomen', t).duty;
    assert.ok(d > 4 && d < 7, `duty at ${t} °C = ${d}`);
  }
});

test('Newcomen at a typical spray temperature wastes about three quarters of its steam', () => {
  const s = M.stroke('newcomen', 50);
  assert.ok(s.wasteShare > 0.65 && s.wasteShare < 0.85, s.wasteShare);
});

test('Watt engine: duty near early Boulton & Watt engines, three to four times Newcomen', () => {
  const w = M.stroke('watt', 40);
  assert.ok(w.duty > 16 && w.duty < 22, `Watt duty ${w.duty}`);
  const ratio = w.duty / M.stroke('newcomen', 50).duty;
  assert.ok(ratio > 3 && ratio < 4, `ratio ${ratio}`);
  assert.ok(w.wasteShare < 0.2);
});

test("Newcomen's dilemma: colder pushes harder, but duty peaks in between", () => {
  const cold = M.stroke('newcomen', 30), warm = M.stroke('newcomen', 90);
  const best = M.stroke('newcomen', M.bestNewcomenChill().chill);
  assert.ok(cold.forceKN > warm.forceKN);
  assert.ok(best.duty > cold.duty && best.duty > warm.duty);
  // Watt's duty only improves as the condenser gets colder.
  let prev = -Infinity;
  for (let t = 95; t >= 25; t -= 5) {
    const d = M.stroke('watt', t).duty;
    assert.ok(d > prev, `Watt duty should rise as condenser cools (${t} °C)`);
    prev = d;
  }
});

test('coalToLift is consistent with per-stroke numbers', () => {
  const s = M.stroke('watt', 40);
  const kgPerStroke = M.waterPerStroke(s, 60);
  const coal = M.coalToLift(s, kgPerStroke / 1000, 60);
  assert.ok(Math.abs(coal - s.coalKg) < 1e-9);
});

test('phase covers a full cycle and the piston returns to the bottom', () => {
  assert.equal(M.phase(0).piston, 0);
  assert.equal(M.phase(0.45).name, 'condense');
  assert.equal(M.phase(0.45).piston, 1);
  assert.equal(M.phase(0.95).piston, 0);
  assert.equal(M.phase(1.2).name, M.phase(0.2).name);
  for (let u = 0; u < 1; u += 0.01) {
    const w = M.wallTemp('newcomen', 40, u);
    assert.ok(w >= 40 - 1e-9 && w <= 100 + 1e-9);
    assert.ok(M.wallTemp('watt', 40, u) >= 96);
  }
});

test('coal output data is chronological and the lesson table matches it', async () => {
  const years = M.COAL_OUTPUT.map((d) => d[0]);
  assert.deepEqual(years, [...years].sort((a, b) => a - b));
  const fs = await import('node:fs');
  const html = fs.readFileSync('lessons/engineering/pioneers/james-watt-steam-engine.html', 'utf8');
  for (const [y, mt] of M.COAL_OUTPUT) {
    assert.ok(html.includes(`<td>${y}</td><td>${mt}</td>`), `table row for ${y}`);
  }
});
