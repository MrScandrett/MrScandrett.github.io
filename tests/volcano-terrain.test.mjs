import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createVolcanoTerrain, sampleHeightmap, SLOPE_EPS } from '../assets/js/lessons/volcano-terrain.mjs';

const context = {};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('assets/js/sim-kit.js', 'utf8'), context);
const { fbm } = context.SimKit.noise;

const SIZE = 40;
const T = createVolcanoTerrain({ size: SIZE, fbm });

// A small stand-in heightmap: a smooth cone, so every eruption's landform code has a slope to work on.
const W = 64;
const cone = { width: W, height: W, data: new Float32Array(W * W) };
for (let y = 0; y < W; y++) {
  for (let x = 0; x < W; x++) {
    const r = Math.hypot(x - W / 2, y - W / 2) / (W / 2);
    cone.data[y * W + x] = Math.fround(Math.max(0, 1 - r) ** 1.5);
  }
}

// A coarse version of the lesson's 201 × 201 terrain grid (PlaneGeometry rotated flat).
function gridPoints(segs) {
  const n = (segs + 1) ** 2, xs = new Float64Array(n), zs = new Float64Array(n);
  for (let iy = 0, i = 0; iy <= segs; iy++) {
    for (let ix = 0; ix <= segs; ix++, i++) {
      xs[i] = Math.fround(ix * (SIZE / segs) - SIZE / 2);
      zs[i] = Math.fround(iy * (SIZE / segs) - SIZE / 2);
    }
  }
  return { xs, zs, n };
}

// What the grid must reproduce: every vertex sampled from scratch, as the lesson used to.
function direct({ vtype, stage, hmap, eruption, hasColormap }, xs, zs) {
  const n = xs.length, heights = new Float32Array(n), colors = new Float32Array(n * 3);
  let maxH = 0;
  for (let i = 0; i < n; i++) {
    const h = T.height(xs[i], zs[i], vtype, stage, hmap, eruption);
    heights[i] = h;
    if (h > maxH) maxH = h;
  }
  const e = SLOPE_EPS;
  for (let i = 0; i < n; i++) {
    const x = xs[i], z = zs[i];
    if (hasColormap) {
      const hs = [[-e, 0], [e, 0], [0, -e], [0, e]].map(([dx, dz]) => T.height(x + dx, z + dz, vtype, stage, hmap, eruption));
      colors.fill(T.mapShadeFrom(...hs, T.mapStrata(x, z)), i * 3, i * 3 + 3);
    } else {
      colors.set(T.colour(x, z, heights[i], maxH, vtype, stage, hmap, eruption), i * 3);
    }
  }
  return { maxH, heights, colors };
}

const ERUPTIONS = ['vesuvius79', 'tambora1815', 'krakatoa1883', 'sthelenr1980', 'pinatubo1991', 'eyja2010', 'maunaloa2022', 'yellowstone'];
const TYPES = ['shield', 'strato', 'cinder', 'caldera', 'super'];
const STAGES = [0, 0.1, 0.2, 0.6, 0.8, 1]; // before and after each eruption's landform change

test('the cached grid draws exactly what sampling every vertex from scratch draws', () => {
  const { xs, zs, n } = gridPoints(24);
  const grid = T.createTerrainGrid(xs, zs);
  const out = { heights: new Float32Array(n), colors: new Float32Array(n * 3) };
  const models = [
    ...ERUPTIONS.flatMap((eruption) => [true, false].map((hasColormap) => ({ vtype: 'strato', hmap: cone, eruption, hasColormap }))),
    ...TYPES.map((vtype) => ({ vtype, hmap: null, eruption: null, hasColormap: false })),
  ];
  for (const model of models) {
    let force = true;
    for (const stage of STAGES) {
      const want = direct({ ...model, stage }, xs, zs);
      const got = grid.update({ ...model, stage, force }, out);
      force = false;
      const label = `${model.eruption || model.vtype} (colour map: ${model.hasColormap}) at ${stage}`;
      assert.equal(got.maxH, want.maxH, label);
      assert.ok(out.heights.every((v, i) => v === want.heights[i]), `heights differ: ${label}`);
      assert.ok(out.colors.every((v, i) => v === want.colors[i]), `colours differ: ${label}`);
    }
  }
});

test('the grid says when nothing moved, so the mesh is not re-uploaded', () => {
  const { xs, zs, n } = gridPoints(20);
  const grid = T.createTerrainGrid(xs, zs);
  const out = { heights: new Float32Array(n), colors: new Float32Array(n * 3) };
  const vesuvius = { vtype: 'strato', hmap: cone, eruption: 'vesuvius79', hasColormap: true };
  assert.equal(grid.update({ ...vesuvius, stage: 0, force: true }, out).changed, true);
  // Vesuvius' landform doesn't change through the eruption.
  assert.equal(grid.update({ ...vesuvius, stage: 0.5 }, out).changed, false);
  assert.equal(grid.update({ ...vesuvius, stage: 1 }, out).changed, false);
  // A rebuilt mesh always gets written.
  assert.equal(grid.update({ ...vesuvius, stage: 1, force: true }, out).changed, true);
  // St Helens' north flank collapses at 15%.
  const helens = { ...vesuvius, eruption: 'sthelenr1980' };
  grid.update({ ...helens, stage: 0.1 }, out);
  assert.equal(grid.update({ ...helens, stage: 0.2 }, out).changed, true);
  // Eyjafjallajökull's snow line moves with the stage even where the ground doesn't.
  const eyja = { vtype: 'strato', hmap: cone, eruption: 'eyja2010', hasColormap: false };
  grid.update({ ...eyja, stage: 0.05, force: true }, out);
  assert.equal(grid.update({ ...eyja, stage: 0.1 }, out).changed, true);
  // A parametric cone never changes with the timeline.
  const strato = { vtype: 'strato', hmap: null, eruption: null, hasColormap: false };
  grid.update({ ...strato, stage: 0, force: true }, out);
  assert.equal(grid.update({ ...strato, stage: 0.8 }, out).changed, false);
});

test('the cached height sampler (used by the lava flow) matches height() as the model changes', () => {
  const sample = T.createHeightSampler();
  const points = Array.from({ length: 300 }, (_, i) => [((i * 7.31) % SIZE) - SIZE / 2, ((i * 3.77) % SIZE) - SIZE / 2]);
  const models = [
    { vtype: 'strato', hmap: cone, eruption: 'sthelenr1980' },
    { vtype: 'strato', hmap: cone, eruption: 'tambora1815' },
    { vtype: 'caldera', hmap: null, eruption: null },
    { vtype: 'strato', hmap: cone, eruption: 'sthelenr1980' },
  ];
  for (const { vtype, hmap, eruption } of models) {
    for (const stage of [0, 0.1, 0.2, 0.7]) {
      for (const [x, z] of points) {
        assert.equal(sample(x, z, vtype, stage, hmap, eruption), T.height(x, z, vtype, stage, hmap, eruption));
      }
    }
  }
});

test('heightmap sampling clamps to the edges and interpolates between pixels', () => {
  const hm = { width: 2, height: 2, data: new Float32Array([0, 1, 0, 1]) };
  assert.equal(sampleHeightmap(hm, -1, 0), 0);
  assert.equal(sampleHeightmap(hm, 2, 0), 1);
  assert.equal(sampleHeightmap(hm, 0.5, 0.5), 0.5);
  assert.equal(sampleHeightmap(null, 0.5, 0.5), 0);
});

test('the lesson takes its terrain from the module', () => {
  const html = fs.readFileSync('lessons/earth-science/volcano-simulator.html', 'utf8');
  assert.match(html, /assets\/js\/lessons\/volcano-terrain\.mjs/);
  assert.doesNotMatch(html, /function (sampleHeightmap|terrainColor)\s*\(/, 'terrain maths is pasted back inline');
});
