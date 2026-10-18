import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const model = require('../assets/js/lessons/climate-weather.js');

test('seasonal basin examples move between hemispheres', () => {
  const september = model.conditions(9, 1.5);
  const january = model.conditions(1, 1.5);
  assert.ok(september.basins.some(b => b.name === 'North Atlantic'));
  assert.ok(!january.basins.some(b => b.name === 'North Atlantic'));
  assert.ok(january.basins.some(b => b.name === 'Coral Sea'));
});

test('warmer scenarios change moisture capacity, not basin count', () => {
  const cool = model.conditions(9, 0);
  const warm = model.conditions(9, 3);
  assert.equal(cool.basins.length, warm.basins.length);
  assert.equal(cool.moistureFactor, 1);
  assert.ok(warm.moistureFactor > cool.moistureFactor);
});
