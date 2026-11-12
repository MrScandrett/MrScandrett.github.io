import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp, computeClimate, PRESETS } from '../assets/js/lessons/climate-simulator-core.mjs';

const near = (got, want, tol, what) => assert.ok(Math.abs(got - want) <= tol, `${what}: got ${got}, want ${want} ± ${tol}`);
const run = (p) => computeClimate(p.co2, p.solar, p.ice, p.deforest, p.ch4, p.ocean);
const base = PRESETS.preindustrial;
const tweak = (change) => run({ ...base, ...change });

test('clamp keeps a value inside its range', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-3, 0, 10), 0);
  assert.equal(clamp(42, 0, 10), 10);
});

test('1850 is the zero point: no forcing, no warming, pH 8.18, all the ice', () => {
  const c = run(PRESETS.preindustrial);
  assert.equal(c.totalForcing, 0);
  assert.equal(c.tempAnomaly, 0);
  assert.equal(c.seaLevel, 0);
  near(c.oceanPH, 8.18, 1e-12, 'pH');
  assert.equal(c.iceLeft, 100);
});

test("today's sliders give today's measured climate", () => {
  const c = run(PRESETS.today);
  near(c.totalForcing, 2.7, 0.1, 'effective forcing (IPCC AR6: about +2.7 W/m²)');
  near(c.tempAnomaly, 1.3, 0.1, 'warming since 1850 (°C)');
  near(c.oceanPH, 8.06, 0.01, 'surface ocean pH');
  near(c.seaLevel, 0.25, 0.05, 'sea level rise (m)');
});

test('doubling CO₂ adds 5.35·ln 2 = 3.7 W/m², and about 2.9 °C once the ocean has caught up', () => {
  // ocean = 0 switches the ocean's heat uptake off, which leaves the equilibrium response
  const doubled = tweak({ co2: 560, ocean: 0 });
  near(doubled.totalForcing, 5.35 * Math.LN2, 1e-9, 'forcing of 2×CO₂ (Myhre et al. 1998)');
  near(doubled.tempAnomaly, 2.9, 0.05, 'equilibrium climate sensitivity');
  // the same doubling with the ocean soaking up heat warms the surface far less so far
  assert.ok(tweak({ co2: 560 }).tempAnomaly < doubled.tempAnomaly / 2);
});

test('CO₂ forcing is logarithmic: every doubling adds the same amount', () => {
  const f = (co2) => tweak({ co2, ocean: 0 }).totalForcing;
  near(f(560) - f(280), f(1120) - f(560), 1e-9, 'second doubling');
  near(f(400) - f(200), f(560) - f(280), 1e-9, 'any doubling');
  assert.ok(f(200) < 0, 'ice-age CO₂ is a negative forcing');
});

test('each slider pushes the temperature the way the physics says', () => {
  const t = (change) => tweak(change).tempAnomaly;
  assert.ok(t({ co2: 500 }) > t({ co2: 400 }) && t({ co2: 400 }) > 0, 'more CO₂ is warmer');
  assert.ok(t({ ch4: 2000 }) > 0, 'more methane is warmer');
  assert.ok(t({ solar: 101 }) > 0 && t({ solar: 99 }) < 0, 'brighter Sun warmer, dimmer Sun cooler');
  assert.ok(t({ ice: 50 }) > 0, 'less ice reflects less sunlight');
  assert.ok(t({ deforest: 50 }) > 0, 'cutting forest warms');
  near(t({ solar: 101 }) / 0.30, t({ co2: 280 * Math.exp(1 / 5.35) }), 1e-9, '1 W/m² warms the same whatever causes it');
});

test('the scenarios come out in order, and business as usual passes +4 °C', () => {
  const [pre, today, paris, bau] = ['preindustrial', 'today', 'paris', 'bau'].map((k) => run(PRESETS[k]));
  assert.ok(pre.tempAnomaly < today.tempAnomaly && today.tempAnomaly < paris.tempAnomaly && paris.tempAnomaly < bau.tempAnomaly);
  assert.ok(pre.seaLevel < today.seaLevel && today.seaLevel < paris.seaLevel && paris.seaLevel < bau.seaLevel);
  assert.ok(pre.oceanPH > today.oceanPH && today.oceanPH > paris.oceanPH && paris.oceanPH > bau.oceanPH);
  assert.ok(pre.iceLeft > today.iceLeft && today.iceLeft > paris.iceLeft && paris.iceLeft > bau.iceLeft);
  near(paris.tempAnomaly, 1.5, 0.1, 'the Paris preset sits at the 1.5 °C goal');
  assert.ok(bau.tempAnomaly > 4 && bau.tempAnomaly < 5, `business as usual: ${bau.tempAnomaly}`);
  assert.ok(bau.seaLevel > 1, 'and more than a metre of sea level rise');
});

test('ocean pH follows CO₂ alone: 8.18 → 8.06 → about 7.9 at 700 ppm', () => {
  near(tweak({ co2: 429 }).oceanPH, 8.06, 0.005, 'today');
  near(tweak({ co2: 700 }).oceanPH, 7.92, 0.005, '700 ppm');
  assert.equal(tweak({ co2: 429, solar: 105, ice: 0 }).oceanPH, tweak({ co2: 429 }).oceanPH);
  // each tenfold rise in CO₂ would lower pH by 0.66
  near(tweak({ co2: 2800 }).oceanPH, 8.18 - 0.66, 1e-12, '10× CO₂');
});

test('outputs stay physical at the ends of every slider', () => {
  for (const co2 of [280, 700]) for (const solar of [95, 105]) for (const ice of [0, 100]) for (const deforest of [0, 100]) for (const ch4 of [700, 4000]) for (const ocean of [0, 100]) {
    const c = computeClimate(co2, solar, ice, deforest, ch4, ocean);
    for (const [k, v] of Object.entries(c)) assert.ok(Number.isFinite(v), `${k} finite`);
    assert.ok(c.seaLevel >= 0 && c.seaLevel <= 12, `sea level ${c.seaLevel}`);
    assert.ok(c.iceLeft >= 0 && c.iceLeft <= 100, `ice ${c.iceLeft}`);
    assert.ok(Math.sign(c.tempAnomaly) === Math.sign(c.totalForcing), 'warming has the sign of the forcing');
  }
});

test('a cooler world does not lower the sea in this model, and ice cannot pass 100%', () => {
  const cold = tweak({ solar: 95 });
  assert.ok(cold.tempAnomaly < 0);
  assert.equal(cold.seaLevel, 0);
  assert.equal(cold.iceLeft, 100);
  assert.ok(tweak({ solar: 95, ice: 60 }).iceLeft > 60, 'ice regrows from a lower start');
});
