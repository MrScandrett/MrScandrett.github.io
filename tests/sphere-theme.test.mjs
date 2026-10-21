import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  LOOK, environmentFor, hexToRgb, blobToSphere, LAVA_BOX, MOTION_MODES, CALM, motionScale
} from '../assets/js/vr/sphere-theme.mjs';

// The registry is a plain script that attaches itself to `this`; require() gives it a module object.
const registry = createRequire(import.meta.url)('../assets/js/theme-registry.js').ClassroomOSThemeRegistry;
const inUnit = c => Array.isArray(c) && c.length === 3 && c.every(v => Number.isFinite(v) && v >= 0 && v <= 1);

test('every site theme gets a valid look and palette', () => {
  assert.ok(registry.THEMES.length >= 12);
  for (const theme of registry.THEMES) {
    const env = environmentFor(theme);
    assert.ok(Object.values(LOOK).includes(env.look), `${theme.id} look`);
    assert.equal(env.palette.length, 4, `${theme.id} palette`);
    for (const c of [...env.palette, env.accent, env.secondary, env.dark, env.light]) assert.ok(inUnit(c), `${theme.id} colour ${c}`);
  }
});

test('the expressive themes get their own 360° worlds', () => {
  const look = id => environmentFor(registry.get(id)).look;
  assert.equal(look('lavalamp'), LOOK.lava);
  assert.equal(look('vaporwave'), LOOK.vaporwave);
  assert.equal(look('mandelbrot'), LOOK.mandelbrot);
  assert.equal(look('night'), LOOK.night);
  assert.equal(look('bark'), LOOK.bark);
  for (const id of ['day', 'sakura', 'diamond', 'emerald', 'topaz', 'goldfish', 'cobblestone']) assert.equal(look(id), LOOK.sky, id);
});

test('mandelbrot uses its own four-colour swatch', () => {
  const theme = registry.get('mandelbrot');
  assert.deepEqual(environmentFor(theme).palette, theme.mandelSwatch.map(hexToRgb));
});

test('light themes get a light sky and dark themes a dark world', () => {
  const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  assert.ok(lum(environmentFor(registry.get('day')).palette[0]) > 0.7, 'day sky is light');
  for (const id of ['lavalamp', 'vaporwave', 'mandelbrot', 'night']) assert.ok(lum(environmentFor(registry.get(id)).palette[0]) < 0.25, `${id} is dark`);
});

test('a theme with missing fields still produces an environment', () => {
  const env = environmentFor({ id: 'mystery' });
  assert.equal(env.look, LOOK.sky);
  assert.equal(env.palette.length, 4);
  for (const c of env.palette) assert.ok(inUnit(c));
});

test('lava wax maps onto the sphere: unit directions, floor below, ceiling above, no seam gap', () => {
  const norm = d => Math.hypot(...d);
  for (const [x, y] of [[0, 0], [800, 450], [1600, 900], [123, 777]]) {
    assert.ok(Math.abs(norm(blobToSphere({ x, y, r: 40 }).dir) - 1) < 1e-9);
  }
  assert.ok(blobToSphere({ x: 800, y: 0, r: 40 }).dir[1] > 0.9, 'top of the box is overhead');
  assert.ok(blobToSphere({ x: 800, y: LAVA_BOX.height, r: 40 }).dir[1] < -0.8, 'bottom of the box is the floor');
  const left = blobToSphere({ x: 0, y: 450, r: 40 }).dir;
  const right = blobToSphere({ x: LAVA_BOX.width, y: 450, r: 40 }).dir;
  assert.ok(Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]) < 1e-9, 'both walls meet behind you');
  const ahead = blobToSphere({ x: LAVA_BOX.width / 2, y: 450, r: 40 }).dir;
  assert.ok(ahead[2] < -0.5, 'the middle of the box is straight ahead (−z)');
});

test('wax gets bigger on the sphere as it gets bigger in the box', () => {
  assert.ok(blobToSphere({ x: 5, y: 5, r: 60 }).radius > blobToSphere({ x: 5, y: 5, r: 30 }).radius);
});

test('motion: calm in a headset, still when asked, never faster than the reader chose', () => {
  assert.deepEqual(MOTION_MODES, ['auto', 'calm', 'still', 'full']);
  assert.equal(motionScale('auto', { presenting: false, reduced: false }), 1, 'flat screen runs at full speed');
  assert.equal(motionScale('auto', { presenting: true, reduced: false }), CALM, 'a headset gets calm');
  assert.equal(motionScale('auto', { presenting: true, reduced: true }), 0, 'reduced motion wins');
  assert.equal(motionScale('auto', { presenting: false, reduced: true }), 0);
  assert.equal(motionScale('calm', { reduced: true }), CALM, 'an explicit choice is honoured');
  assert.equal(motionScale('still', { presenting: false }), 0);
  assert.equal(motionScale('full', { presenting: true }), 1);
  assert.ok(CALM > 0 && CALM < 0.5);
});
