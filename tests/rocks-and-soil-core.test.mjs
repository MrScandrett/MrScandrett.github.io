import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// RocksSoilCore is a classic browser script with no DOM in it.
const sandbox = {};
vm.runInNewContext(fs.readFileSync('assets/js/lessons/rocks-and-soil-core.js', 'utf8') + '\nthis.RocksSoilCore = RocksSoilCore;', sandbox);
const { classifySoil } = sandbox.RocksSoilCore;
const name = (sand, silt, clay) => classifySoil(sand, silt, clay).name;

test('classifySoil names the middle of each USDA texture class', () => {
  // points from the centre of each region of the USDA soil texture triangle (sand, silt, clay %)
  assert.equal(name(20, 20, 60), 'Clay');
  assert.equal(name(50, 5, 45), 'Sandy Clay');
  assert.equal(name(5, 50, 45), 'Silty Clay');
  assert.equal(name(60, 12, 28), 'Sandy Clay Loam');
  assert.equal(name(32, 34, 34), 'Clay Loam');
  assert.equal(name(10, 56, 34), 'Silty Clay Loam');
  assert.equal(name(40, 40, 20), 'Loam');
  assert.equal(name(20, 65, 15), 'Silt Loam');
  assert.equal(name(65, 25, 10), 'Sandy Loam');
  assert.equal(name(82, 13, 5), 'Loamy Sand');
  assert.equal(name(92, 5, 3), 'Sand');
});

test('more clay means slower drainage and more nutrient holding (CEC)', () => {
  const sand = classifySoil(92, 5, 3), loam = classifySoil(40, 40, 20), clay = classifySoil(20, 20, 60);
  assert.ok(sand.drain > loam.drain && loam.drain > clay.drain, 'drainage: sand > loam > clay');
  assert.ok(sand.cec < loam.cec && loam.cec < clay.cec, 'nutrient holding: sand < loam < clay');
  assert.ok(sand.air > clay.air, 'sand holds more air than clay');
});

test('every whole-percent mix on the triangle gets a class with all four gauges in 0–100', () => {
  const seen = new Set();
  for (let clay = 0; clay <= 100; clay++) for (let sand = 0; sand <= 100 - clay; sand++) {
    const soil = classifySoil(sand, 100 - clay - sand, clay);
    assert.ok(soil && soil.name && soil.desc, `class for ${sand}/${100 - clay - sand}/${clay}`);
    for (const k of ['drain', 'cec', 'air', 'work']) assert.ok(soil[k] >= 0 && soil[k] <= 100, `${k} of ${soil.name}`);
    seen.add(soil.name);
  }
  // the twelve USDA classes
  assert.deepEqual([...seen].sort(), ['Clay', 'Clay Loam', 'Loam', 'Loamy Sand', 'Sand', 'Sandy Clay', 'Sandy Clay Loam', 'Sandy Loam',
    'Silt', 'Silt Loam', 'Silty Clay', 'Silty Clay Loam']);
});

test('class boundaries: 40% clay is clay, 27% starts the clay loams, 85% sand is sand', () => {
  assert.equal(name(30, 30, 40), 'Clay');
  assert.equal(name(31, 30, 39), 'Clay Loam');
  assert.equal(name(33, 40, 27), 'Clay Loam');
  assert.equal(name(34, 40, 26), 'Loam');
  assert.equal(name(85, 10, 5), 'Sand');
  assert.equal(name(84, 11, 5), 'Loamy Sand');
});
