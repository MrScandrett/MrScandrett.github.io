import test from 'node:test';
import assert from 'node:assert/strict';
import { createFlagCloth, upsampleGrid, WIND_PRESETS } from '../assets/js/flag-cloth.mjs';

function flying(preset, seconds = 2) {
  const flag = createFlagCloth({ x: -1.9, y: 1.65 });
  flag.setWind(WIND_PRESETS[preset]);
  flag.settle(seconds);
  return flag;
}

test('the hoist stays on the pole while the fly moves', () => {
  const flag = flying('medium');
  const p = flag.positions;
  for (let r = 0; r < flag.ny; r++) {
    const i = r * flag.nx * 3;
    assert.ok(Math.abs(p[i] + 1.9) < 1e-6, `hoist row ${r} left the pole`);
    assert.ok(Math.abs(p[i + 1] - (1.65 - r * 2 / flag.rows)) < 1e-5);
    assert.equal(p[i + 2], 0);
  }
  const fly = (flag.cols) * 3;
  const before = [p[fly], p[fly + 1], p[fly + 2]];
  flag.step(.2);
  assert.ok(Math.hypot(p[fly] - before[0], p[fly + 1] - before[1], p[fly + 2] - before[2]) > 1e-3, 'fly end is still');
});

test('stronger wind flies the flag further out and holds it higher', () => {
  const reach = {}, flyHeight = {};
  for (const preset of ['calm', 'medium', 'strong']) {
    const flag = flying(preset, 1);
    let sumReach = 0, sumY = 0, samples = 0;
    for (let t = 0; t < 240; t++) {
      flag.step(1 / 60);
      sumReach += flag.stats().reach;
      sumY += flag.positions[flag.cols * 3 + 1];
      samples++;
    }
    reach[preset] = sumReach / samples;
    flyHeight[preset] = sumY / samples;
  }
  assert.ok(reach.calm > .6, `a light breeze should still open the flag (reach ${reach.calm})`);
  assert.ok(reach.calm < reach.medium && reach.medium < reach.strong, JSON.stringify(reach));
  assert.ok(flyHeight.calm < flyHeight.strong, JSON.stringify(flyHeight));
  assert.ok(reach.strong < 1, 'cloth cannot reach farther than its own length');
});

test('cloth stays finite and barely stretches over a long gusty run', () => {
  for (const preset of ['calm', 'strong']) {
    const flag = flying(preset, 1);
    const strains = [];
    for (let t = 0; t < 12 * 60; t++) {
      flag.step(1 / 60);
      if (t % 3) continue;
      const s = flag.stats();
      assert.ok(s.finite, `${preset}: non-finite position at ${t}`);
      strains.push(s.maxStrain);
    }
    strains.sort((a, b) => a - b);
    const median = strains[strains.length >> 1];
    const p99 = strains[Math.floor(strains.length * .99)];
    assert.ok(median < .08, `${preset}: median worst-thread stretch ${median}`);
    assert.ok(p99 < .2, `${preset}: 99th-percentile worst-thread stretch ${p99}`);
  }
});

test('the simulation is deterministic and survives a long hitch', () => {
  const a = flying('medium', 1), b = flying('medium', 1);
  assert.deepEqual(Array.from(a.positions), Array.from(b.positions));
  a.step(5); // clamped and split, never one giant step
  assert.ok(a.stats().finite);
});

test('Catmull–Rom upsampling passes through every simulated point', () => {
  const nx = 5, ny = 4, f = 3;
  const src = new Float32Array(nx * ny * 3);
  for (let i = 0; i < nx * ny; i++) {
    src[i * 3] = (i % nx) * .5;
    src[i * 3 + 1] = Math.floor(i / nx) * -.4;
    src[i * 3 + 2] = Math.sin(i);
  }
  const ox = (nx - 1) * f + 1;
  const out = upsampleGrid(src, nx, ny, f);
  assert.equal(out.length, ox * ((ny - 1) * f + 1) * 3);
  for (let r = 0; r < ny; r++) for (let c = 0; c < nx; c++) {
    const s = (r * nx + c) * 3, o = (r * f * ox + c * f) * 3;
    for (let d = 0; d < 3; d++) assert.ok(Math.abs(out[o + d] - src[s + d]) < 1e-6);
  }
  // A flat grid stays flat and evenly spaced between the samples.
  const flat = upsampleGrid(src.map((v, i) => (i % 3 === 2 ? 0 : v)), nx, ny, f);
  assert.ok(Math.abs(flat[3] - .5 / f) < 1e-6);
  for (let i = 2; i < flat.length; i += 3) assert.equal(flat[i], 0);
});
