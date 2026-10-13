import test from 'node:test';
import assert from 'node:assert/strict';
import LiquidEngine from '../assets/js/liquid-engine.js';

test('provides named liquid material presets', () => {
  assert.deepEqual(LiquidEngine.materials, ['water', 'lava', 'honey', 'oil', 'mercury']);
  assert.ok(LiquidEngine.material('honey').viscosity > LiquidEngine.material('water').viscosity);
  assert.ok(LiquidEngine.material('lava').density > LiquidEngine.material('water').density);
});

test('surface impulses propagate and settle toward the rest line', () => {
  const surface = LiquidEngine.createSurface({ width: 600, restY: 120, columns: 40, material: 'water' });
  surface.impulse(300, -30, 40);
  assert.ok(surface.columns.some(column => column.vy < 0));
  for (let i = 0; i < 600; i += 1) surface.update(1 / 60);
  assert.ok(surface.columns.every(column => Math.abs(column.y - 120) < 0.5));
});

test('particle fields respect their budget and expire', () => {
  const particles = LiquidEngine.createParticles({ max: 3, material: 'honey' });
  particles.emitRain({ x: 0, x2: 10, count: 10, life: 0.05 });
  assert.equal(particles.particles.length, 3);
  particles.update(0.05);
  assert.equal(particles.particles.length, 0);
});

test('depth field conserves volume while lava spreads, pools, and cools', () => {
  // A cone beside a bowl: lava poured on the cone must end up in the bowl.
  const groundAt = (x, z) => 4 * Math.exp(-((x + 4) ** 2 + z * z) / 6) + 0.05 * ((x - 4) ** 2 + z * z);
  const field = LiquidEngine.createDepthField({ material: 'lava', cols: 41, cellSize: 0.5, groundAt, fluidity: 0.9 });
  assert.equal(field.originX, -10);
  assert.ok(field.addSource(-4, 0, 1.2) >= 0);
  for (let i = 0; i < 300; i += 1) field.step(0.1);
  const after = field.stats();
  assert.ok(after.supplied > 0);
  assert.ok(Math.abs(after.balanceError) < 1e-4 * after.supplied, `balance error ${after.balanceError}`);
  assert.ok(after.covered > 10, 'lava spread beyond the vent');
  const bowl = field.cellAt(4, 0), vent = field.cellAt(-4, 0);
  assert.ok(field.depth[bowl] > 0.02, 'lava pooled in the hollow');

  // With the supply off, the flow cools to a crust that no longer moves.
  field.supply = 0;
  for (let i = 0; i < 6000; i += 1) field.step(0.1);
  const crust = Float32Array.from(field.depth);
  for (let i = 0; i < 50; i += 1) field.step(0.1);
  assert.deepEqual(Array.from(field.depth), Array.from(crust));
  assert.ok(field.heatAt(vent) < field.solidus);
  assert.ok(Math.abs(field.stats().balanceError) < 1e-4 * after.supplied);
  field.reset();
  assert.equal(field.stats().volume, 0);
});

test('stiff lava piles up behind its yield threshold; runny lava spreads', () => {
  const spread = fluidity => {
    const field = LiquidEngine.createDepthField({ material: 'lava', cols: 31, cellSize: 0.4, groundAt: () => 0, fluidity });
    field.addSource(0, 0, 1);
    for (let i = 0; i < 60; i += 1) field.step(0.1);
    return field.stats();
  };
  const runny = spread(1), stiff = spread(0);
  assert.ok(runny.covered > stiff.covered);
  assert.ok(stiff.maxDepth > runny.maxDepth);
});

test('fixed-step updates do not depend on frame rate', () => {
  const run = (hz, make, tick) => { const sim = make(); for (let i = 0; i < hz * 4; i += 1) tick(sim, 1 / hz); return sim; };
  const makeField = () => {
    const field = LiquidEngine.createDepthField({ cols: 21, cellSize: 0.5, groundAt: (x, z) => -x * 0.2 });
    field.addSource(0, 0, 1);
    return field;
  };
  const a = run(60, makeField, (f, dt) => f.update(dt)), b = run(144, makeField, (f, dt) => f.update(dt));
  assert.ok(Math.abs(a.stats().volume - b.stats().volume) < a.stats().volume * 0.05);

  const seeded = () => { let s = 7; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
  const makeBlobs = () => LiquidEngine.createThermalBlobs({ random: seeded(), width: 800, height: 600 });
  const blobs60 = run(60, makeBlobs, (t, dt) => t.update(dt)), blobs120 = run(120, makeBlobs, (t, dt) => t.update(dt));
  assert.ok(Math.abs(blobs60.steps - blobs120.steps) <= 1);
});

test('thermal blobs convect, merge and split without losing wax', () => {
  let s = 3;
  const blobs = LiquidEngine.createThermalBlobs({ count: 8, width: 1280, height: 800, random: () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296 });
  const area = blobs.area();
  let merged = false, split = false, rose = false, previous = blobs.bodies.length;
  for (let i = 0; i < 60 * 240; i += 1) {
    blobs.step({ active: false });
    const n = blobs.bodies.length;
    if (n < previous) merged = true;
    if (n > previous) split = true;
    previous = n;
    if (blobs.bodies.some(b => b.vy < -20 && b.temp > 0.6)) rose = true;
    assert.ok(Math.abs(blobs.area() - area) < area * 1e-9, 'merging and splitting conserve wax area');
    assert.ok(n <= blobs.count);
  }
  assert.ok(merged && split && rose);
  const before = blobs.area();
  blobs.resize(390, 844);
  assert.equal(blobs.area(), before, 'resizing the window moves wax but keeps its size');
});
