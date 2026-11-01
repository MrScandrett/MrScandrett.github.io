import test from 'node:test';
import assert from 'node:assert/strict';
import { cupDesign, pappus, revolveRegion, frustum, workbenchHref } from '../assets/js/lessons/profiles-revolve-loft-sweep.mjs';
import { shapeLink } from '../assets/js/workbench/model.mjs';
import { toModelMm, toRealM, wallVerdict, scaleThatFits, buildModel, PRESETS, stlFor, edgeReport } from '../assets/js/lessons/scale-models.mjs';

const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));

test('Pappus: a rectangle against the axis spins into the cylinder formula', () => {
  const p = pappus(revolveRegion([[10, 0], [10, 20]], 0));
  assert.ok(near(p.volume, Math.PI * 100 * 20));
  assert.ok(near(pappus(revolveRegion([[10, 20], [10, 0]], 0)).volume, p.volume), 'drawing direction does not matter');
  // the lesson's napkin-ring problem: 4 × 10 rectangle 20 mm out → 40 × 2π × 22
  const ring = pappus([[20, 0], [24, 0], [24, 10], [20, 10]]);
  assert.ok(near(ring.volume, 40 * 2 * Math.PI * 22));
  assert.ok(near(pappus([[20, 0], [24, 0], [24, 10], [20, 10]], 90).volume, ring.volume / 4));
});

test('cup designer: inside = item + 2 × clearance, outside = inside + 2 × wall', () => {
  const d = cupDesign({ item: 38, clearance: 1, wall: 2, depth: 88, flare: 0 });
  assert.equal(d.innerD, 40);
  assert.equal(d.outerD, 44);
  assert.equal(d.height, 90);
  assert.ok(near(d.estimateMl, (Math.PI * 400 * 88) / 1000));
  assert.ok(near(frustum(3, 3, 9), Math.PI * 81));
  const flared = cupDesign({ item: 38, clearance: 1, wall: 2, depth: 88, flare: 10 });
  assert.ok(flared.outerD > 44 && flared.outerD < 44.1, 'a leaning wall starts a hair wider to keep the inside size');
});

test('the lab and the cup designer hand Workbench a link it can open', () => {
  const d = cupDesign({ item: 66.2, clearance: 1, wall: 2.4, depth: 80 });
  const href = workbenchHref('../../../', 'revolve', { points: d.points, wall: 2.4, sides: 96, smooth: 0, degrees: 360 }, 'my-cup');
  const link = shapeLink(href.slice(href.indexOf('?')));
  assert.equal(link.shape, 'sketch-revolve');
  assert.deepEqual(link.params.points, d.points);
  assert.equal(link.params.wall, 2.4);
  assert.equal(link.name, 'my-cup');
});

test('scale arithmetic and wall verdicts', () => {
  assert.equal(toModelMm(6, 100), 60);
  assert.equal(toRealM(45, 200), 9);
  assert.equal(wallVerdict(toModelMm(0.1, 50)).tag, 'OK');
  assert.equal(wallVerdict(toModelMm(0.1, 100)).tag, 'THIN');
  assert.equal(wallVerdict(toModelMm(0.1, 200)).tag, 'TOO THIN');
  assert.equal(scaleThatFits(9, 7, 3).best.scale, 50, 'a 9 × 7 m classroom fits at 1:50');
});

test('plan-to-model presets build closed meshes that fit the bed', () => {
  for (const [id, preset] of Object.entries(PRESETS)) {
    if (!preset.plan.rooms.length) continue;
    for (const mode of ['walls', 'massing']) for (const split of [false, true]) {
      const model = buildModel(preset.plan, { ...preset.settings, scale: 100, mode, split });
      assert.ok(model.meshes.length > 0, `${id} ${mode}`);
      for (const m of model.meshes) assert.ok(edgeReport(m.positions).watertight, `${id} ${mode} ${m.name}: not closed`);
      assert.ok(model.partFits.every(Boolean), `${id} ${mode}: a part is too big`);
      const { buffer } = stlFor(model);
      assert.equal(buffer.byteLength, 84 + 50 * (stlFor(model).positions.length / 9));
    }
  }
});
