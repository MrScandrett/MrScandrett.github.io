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
