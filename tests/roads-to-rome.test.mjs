import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../assets/js/lessons/roads-to-rome-core.js');

test('computeRoute finds fastest summer and slower winter route from Alexandria', () => {
  const summer = core.computeRoute('alexandria', 'days', false);
  const winter = core.computeRoute('alexandria', 'days', true);

  // Summer uses open sea (alexandria -> ephesus 6d, or via carthago -> roma 13d)
  assert.equal(summer.totalDays, 13);
  assert.equal(winter.totalDays, 32);
  assert.equal(summer.summerDays, 13);
  assert.equal(winter.winterDays, 32);
  assert.ok(summer.steps.length >= 2);
});

test('computeRoute separates fastest vs cheapest from Londinium and Carthago', () => {
  const londinium = core.computeRoute('londinium', 'days', false);
  assert.equal(londinium.steps[0].from, 'londinium');
  assert.equal(londinium.steps[londinium.steps.length - 1].to, 'roma');
  assert.equal(londinium.totalDays, 13);
  assert.equal(londinium.totalPrice, 22);

  const carthagoWinter = core.computeRoute('carthago', 'days', true);
  // Open-sea roma-carthago (3d) closes in winter, forcing overland/coastal detour via gades -> massilia -> roma
  assert.equal(carthagoWinter.totalDays, 24);
});

test('computeCostComparison preserves Diocletian road/river/sea ratios', () => {
  const result = core.computeCostComparison(300);
  assert.equal(result.roadCost, 300);
  assert.equal(result.riverCost, 120);
  assert.equal(result.seaCost, 60);
  assert.equal(result.riverPct, 40);
  assert.equal(result.seaPct, 20);
});
