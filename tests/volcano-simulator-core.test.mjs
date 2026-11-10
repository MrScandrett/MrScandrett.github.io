import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleHeightmap, lerp, clamp, vtypeName, viscosityLabel } from '../assets/js/lessons/volcano-simulator-core.mjs';

const near = (got, want, tol, what) => assert.ok(Math.abs(got - want) <= tol, `${what}: got ${got}, want ${want} ± ${tol}`);
// 3 × 2 elevation grid:   0  10  20
//                        30  40  80
const map = { width: 3, height: 2, data: [0, 10, 20, 30, 40, 80] };

test('lerp and clamp', () => {
  assert.equal(lerp(10, 20, 0), 10);
  assert.equal(lerp(10, 20, 1), 20);
  assert.equal(lerp(10, 20, 0.25), 12.5);
  assert.equal(clamp(7, 0, 5), 5);
  assert.equal(clamp(-7, 0, 5), 0);
  assert.equal(clamp(3, 0, 5), 3);
});

test('sampleHeightmap returns the stored height exactly at every pixel', () => {
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    assert.equal(sampleHeightmap(map, x / (map.width - 1), y / (map.height - 1)), map.data[y * map.width + x]);
  }
});

test('sampleHeightmap blends between pixels with a smooth S-curve', () => {
  near(sampleHeightmap(map, 0.25, 0), 5, 1e-12, 'halfway between 0 and 10');
  near(sampleHeightmap(map, 0, 0.5), 15, 1e-12, 'halfway between 0 and 30');
  near(sampleHeightmap(map, 0.25, 0.5), 20, 1e-12, 'centre of the left cell: mean of 0, 10, 30, 40');
  // a quarter of the way across a cell the smoothstep gives 3t² − 2t³ = 0.15625, not 0.25
  near(sampleHeightmap(map, 0.125, 0), 10 * 0.15625, 1e-12, 'eased quarter point');
  // never overshoots the four corner heights (no ringing: lava and terrain stay in range)
  for (let u = 0; u <= 1.0001; u += 0.05) for (let v = 0; v <= 1.0001; v += 0.1) {
    const h = sampleHeightmap(map, u, v);
    assert.ok(h >= 0 && h <= 80, `h(${u}, ${v}) = ${h}`);
  }
  // and rises steadily along a rising row
  let last = -1;
  for (let u = 0; u <= 1.0001; u += 0.02) { const h = sampleHeightmap(map, u, 1); assert.ok(h >= last - 1e-12); last = h; }
});

test('sampleHeightmap clamps coordinates off the edge of the map', () => {
  assert.equal(sampleHeightmap(map, -3, -3), 0);
  assert.equal(sampleHeightmap(map, 9, 9), 80);
  assert.equal(sampleHeightmap(map, 0.5, -1), 10);
  assert.equal(sampleHeightmap(map, 2, 0), 20);
});

test('sampleHeightmap is flat on a flat map and 0 with no map loaded yet', () => {
  const flat = { width: 4, height: 4, data: new Float32Array(16).fill(1234) };
  for (const [u, v] of [[0, 0], [0.33, 0.71], [1, 1], [0.5, 0.5]]) assert.equal(sampleHeightmap(flat, u, v), 1234);
  assert.equal(sampleHeightmap(null, 0.5, 0.5), 0);
  assert.equal(sampleHeightmap({ width: 2, height: 2 }, 0.5, 0.5), 0);
});

test('viscosityLabel names the magma by silica content as the slider thickens it', () => {
  assert.match(viscosityLabel(0), /^Basaltic/);
  assert.match(viscosityLabel(24.9), /^Basaltic/);
  assert.match(viscosityLabel(25), /^Andesitic/);
  assert.match(viscosityLabel(50), /^Dacitic/);
  assert.match(viscosityLabel(75), /^Rhyolitic/);
  assert.match(viscosityLabel(100), /^Rhyolitic/);
  // silica rises with viscosity: 50 → 58 → 65 → 73 %
  const silica = [10, 30, 60, 90].map((v) => Number(/(\d+)% SiO/.exec(viscosityLabel(v))[1]));
  assert.deepEqual(silica, [50, 58, 65, 73]);
});

test('vtypeName gives each volcano type its display name and passes unknown ones through', () => {
  assert.equal(vtypeName('shield'), 'Shield Volcano');
  assert.equal(vtypeName('strato'), 'Stratovolcano');
  assert.equal(vtypeName('caldera'), 'Caldera');
  assert.equal(vtypeName('super'), 'Supervolcano');
  assert.equal(vtypeName('cinder'), 'Cinder Cone');
  assert.equal(vtypeName('maar'), 'maar');
});
