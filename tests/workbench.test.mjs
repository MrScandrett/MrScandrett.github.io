import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import Module from '../assets/vendor/manifold/manifold.js';
import { createEngine } from '../assets/js/forge/engine.mjs';
import { edgeReport } from '../assets/js/fab-io.mjs';
import { SHAPES, SHAPE_GROUPS } from '../assets/js/workbench/shapes.mjs';
import * as W from '../assets/js/workbench/model.mjs';
import { TEMPLATES, REALMS, BLANKS, finishTemplate } from '../assets/js/workbench/templates.mjs';

const context = {};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('assets/js/sim-kit.js', 'utf8'), context);
const noise = context.SimKit.noise;
const font = JSON.parse(fs.readFileSync('assets/vendor/fonts/droid-sans-bold.typeface.json', 'utf8'));
const engine = await createEngine(Module, { font });
const cache = W.createShapeCache();
const opts = { cache, noise };

const evaluate = (project) => engine.scoped((ctx) => W.evaluate(ctx, project, opts));
const printCheck = (project) => engine.run({ params: [], build: (ctx) => ({ bodies: W.printBodies(ctx, project, opts).bodies, layout: project.print.arrange === 'apart' ? 'apart' : 'nested' }) }, {});
const sizeOf = (node) => engine.scoped((ctx) => W.shapeSize(ctx, node, opts));
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));

/* Defaults, every range at both ends, every select option and toggle. */
function variants(shape) {
  const base = W.defaultParams(shape, 'print');
  const out = [['defaults', base]];
  for (const spec of shape.params) {
    if (spec.type === 'range') out.push([`${spec.id}=min`, { ...base, [spec.id]: spec.min }], [`${spec.id}=max`, { ...base, [spec.id]: spec.max }]);
    if (spec.type === 'select') for (const o of spec.options) out.push([`${spec.id}=${o.value}`, { ...base, [spec.id]: o.value }]);
    if (spec.type === 'toggle') out.push([`${spec.id}=${!base[spec.id]}`, { ...base, [spec.id]: !base[spec.id] }]);
  }
  return out;
}

test('every shape has a known group, a kind and unique id', () => {
  const ids = new Set();
  for (const s of SHAPES) {
    assert.ok(!ids.has(s.id), `duplicate id ${s.id}`);
    ids.add(s.id);
    assert.ok(SHAPE_GROUPS.includes(s.group), `${s.id}: unknown group`);
    assert.ok(['object', 'handheld', 'building'].includes(s.kind), `${s.id}: unknown kind`);
    assert.ok(s.blurb, `${s.id}: needs a blurb`);
  }
});

for (const shape of SHAPES) {
  test(`${shape.name}: every variant builds a closed solid`, () => {
    for (const [label, params] of variants(shape)) {
      const node = { id: 'n1', type: 'shape', shape: shape.id, name: shape.name, params, color: '#e8792a', finish: 'matte', hole: false, pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1], pivot: [0, 0, 0] };
      const r = evaluate({ ...W.freshProject('print'), objects: [node] });
      assert.deepEqual(r.errors, [], `${label}: ${JSON.stringify(r.errors)}`);
      assert.equal(r.pieces.length, 1, `${label}: no piece`);
      assert.ok(edgeReport(r.pieces[0].local).watertight, `${label}: mesh is not closed`);
    }
  });
}

test('axial shapes keep their axis as the centre (an odd gear spins about its bore)', () => {
  const project = W.freshProject('print');
  const gear = W.newShapeNode(project, 'gear', { params: { teeth: 13 } });
  const box = sizeOf(gear);
  const r = evaluate({ ...project, objects: [gear] });
  const b = r.bounds[gear.id];
  // 13 teeth: the box is lopsided, so its middle is off the axis, but the axis stays at x = 0
  assert.ok(Math.abs((b.min[0] + b.max[0]) / 2) > 0.05, 'expected a lopsided box');
  assert.ok(near(b.max[0] - b.min[0], box[0]));
  assert.ok(near(b.min[2], -box[2] / 2) && near(b.max[2], box[2] / 2), 'centred on its height');
});

test('a hole cuts its group, and only its group', () => {
  const p = W.freshProject('print');
  const a = W.newShapeNode(p, 'box', { pos: [0, 0, 10] });
  p.objects.push(a);
  const hole = W.newShapeNode(p, 'cylinder', { hole: true, pos: [0, 0, 10], params: { d: 10, h: 40 } });
  p.objects.push(hole);
  const g = W.groupNodes(p, [a.id, hole.id], [0, 0, 10]);
  const b = W.newShapeNode(p, 'box', { pos: [0, 0, 10] });   // overlaps, but sits outside the group
  p.objects.push(b);
  const r = evaluate(p);
  const piece = (id) => r.pieces.find((x) => x.id === id);
  assert.equal(piece(a.id).cut, true);
  assert.equal(piece(b.id).cut, false);
  assert.equal(r.ghosts.length, 1);
  assert.ok(r.bounds[g.id]);
  const check = printCheck(p);
  assert.equal(check.error, undefined);
  // the box outside the group fills the hole back in: one solid 40 × 40 × 20 block per top-level item
  assert.equal(check.bodies.length, 2);
});

test('top-level holes cut everything they touch', () => {
  const p = W.freshProject('print');
  const a = W.newShapeNode(p, 'box', { pos: [0, 0, 10] });
  p.objects.push(a);
  p.objects.push(W.newShapeNode(p, 'box', { hole: true, pos: [20, 0, 10], params: { w: 20, d: 50, h: 30 } }));
  const r = evaluate(p);
  assert.ok(near(r.solid[a.id].max[0], 10));
  assert.ok(near(r.solidAll.max[0], 10), 'holes do not count toward solid bounds');
  assert.ok(r.all.max[0] > 25, 'but do count toward all bounds');
});

test('matrices: compose → decompose round-trips, invert undoes compose', () => {
  const node = { pos: [3, -2, 7], rot: [25, -40, 110], scale: [1.5, 0.5, 2], pivot: [1, 2, -3] };
  const m = W.localMatrix(node);
  const d = W.decompose(m, node.pivot);
  const back = W.localMatrix({ ...node, ...d });
  m.forEach((v, i) => assert.ok(near(v, back[i], 1e-3), `entry ${i}: ${v} vs ${back[i]}`));
  const id = W.mul(m, W.invert(m));
  W.IDENTITY.forEach((v, i) => assert.ok(Math.abs(v - id[i]) < 1e-9));
});

test('ungroup keeps every child where it was in the world', () => {
  const p = W.freshProject('print');
  const a = W.newShapeNode(p, 'box', { pos: [10, 0, 10] });
  p.objects.push(a);
  const b = W.newShapeNode(p, 'cylinder', { pos: [-10, 5, 10], rot: [0, 30, 0] });
  p.objects.push(b);
  const g = W.groupNodes(p, [a.id, b.id], [0, 0, 10]);
  g.rot = [0, 0, 45];
  g.pos = [5, 5, 12];
  const before = evaluate(p).bounds;
  W.ungroup(p, g.id);
  const after = evaluate(p).bounds;
  for (const id of [a.id, b.id]) for (const k of ['min', 'max']) before[id][k].forEach((v, i) => assert.ok(near(v, after[id][k][i], 1e-3), `${id} ${k}${i}`));
});

test('moving a pivot never moves the object', () => {
  const p = W.freshProject('print');
  const n = W.newShapeNode(p, 'box', { pos: [4, 5, 6], rot: [10, 20, 30], scale: [2, 1, 1] });
  p.objects.push(n);
  const before = evaluate(p).bounds[n.id];
  W.setPivot(n, [20, -10, -5]);
  const after = evaluate(p).bounds[n.id];
  for (const k of ['min', 'max']) before[k].forEach((v, i) => assert.ok(near(v, after[k][i], 1e-3)));
});

test('a circular pattern puts copies evenly round the centre', () => {
  const p = W.freshProject('print');
  const lobe = W.newShapeNode(p, 'cylinder', { pos: [27, 0, 3.5] });
  p.objects.push(lobe);
  const copies = W.patternCopies(p, lobe, { mode: 'circle', count: 3, centre: [0, 0, 0] });
  assert.equal(copies.length, 2);
  assert.equal(new Set([lobe.id, ...copies.map((c) => c.id)]).size, 3, 'fresh ids');
  for (const c of copies) assert.ok(near(Math.hypot(c.pos[0], c.pos[1]), 27, 1e-3));
  assert.ok(near(Math.atan2(copies[0].pos[1], copies[0].pos[0]) * 180 / Math.PI, 120, 1e-3));
});

test('animation: keys interpolate with their ease, and the first key records the rest pose', () => {
  const p = W.freshProject('game');
  const n = W.newShapeNode(p, 'sphere', { pos: [0, 0, 1] });
  p.objects.push(n);
  W.setKey(p, n.id, 1, { pos: [0, 0, 3], rot: [0, 0, 90], scale: [1, 1, 1] }, 'linear');
  const keys = p.animation.tracks[n.id];
  assert.equal(keys.length, 2);
  assert.deepEqual(keys[0].pos, [0, 0, 1]);
  keys[0].ease = 'linear';
  assert.ok(near(W.samplePose(keys, 0.5).pos[2], 2));
  keys[0].ease = 'smooth';
  assert.ok(near(W.samplePose(keys, 0.25).pos[2], 1 + 2 * (0.25 * 0.25 * (3 - 0.5))));
  keys[0].ease = 'step';
  assert.ok(near(W.samplePose(keys, 0.99).pos[2], 1));
  W.addSpin(p, n.id, 'z', 2);
  assert.equal(p.animation.tracks[n.id].at(-1).rot[2], 720);
});

test('defaults scale with the project: a wall is 6 m in a building and 60 mm in a print', () => {
  const wall = SHAPES.find((s) => s.id === 'wall');
  assert.equal(W.defaultParams(wall, 'building').l, 6);
  assert.equal(W.defaultParams(wall, 'print').l, 60);
  assert.equal(W.defaultParams(wall, 'building').windows, 2, 'counts do not scale');
  const box = SHAPES.find((s) => s.id === 'box');
  assert.equal(W.defaultParams(box, 'game').w, 1, 'a box drops into a game as a 1 m crate');
});

test('a building prints at its scale: 10 m at 1:100 is 100 mm', () => {
  const p = W.freshProject('building');
  p.objects.push(W.newShapeNode(p, 'box', { params: { w: 10, d: 4, h: 3 }, pos: [0, 0, 1.5] }));
  const r = printCheck(p);
  assert.equal(r.error, undefined);
  assert.ok(r.stats.some((s) => s.label === 'Print size' && s.value.startsWith('100 × 40 × 30')), JSON.stringify(r.stats));
});

test('project files round-trip and bad ones are refused with a reason', () => {
  const p = W.freshProject('product', 'test');
  p.objects.push(W.newShapeNode(p, 'enclosure'));
  assert.deepEqual(W.validateProject(JSON.parse(JSON.stringify(p))), p);
  assert.throws(() => W.validateProject({ format: 'other' }), /not a Workbench project/);
  assert.throws(() => W.validateProject({ ...p, objects: [{ ...p.objects[0], shape: 'teleporter' }] }), /doesn't know/);
  assert.throws(() => W.validateProject({ ...p, objects: [p.objects[0], p.objects[0]] }), /repeated id/);
  const huge = W.validateProject({ ...p, objects: [{ ...p.objects[0], params: { w: 1e9 } }] });
  assert.ok(huge.objects[0].params.w <= 600, 'params are clamped to the shape’s range');
});

test('template gallery: every template builds, validates, and has a realm', () => {
  assert.ok(BLANKS.length === Object.keys(W.PRESETS).length);
  for (const t of TEMPLATES) {
    assert.ok(REALMS.includes(t.realm), `${t.id}: unknown realm`);
    const project = finishTemplate(t, sizeOf);
    assert.deepEqual(W.validateProject(JSON.parse(JSON.stringify(project))), project, `${t.id}: does not round-trip`);
    const r = evaluate(project);
    assert.deepEqual(r.errors, [], `${t.id}: ${JSON.stringify(r.errors)}`);
    assert.ok(r.pieces.length > 0, `${t.id}: nothing solid`);
    // every solid rests on or above the floor
    assert.ok(r.solidAll.min[2] > -1e-6 * W.PRESETS[project.preset].plane[0], `${t.id}: something sinks below the floor`);
    const check = printCheck(project);
    assert.equal(check.error, undefined, `${t.id}: ${check.error}`);
    assert.ok(!check.verdicts.some((v) => v.tag === 'TOO BIG'), `${t.id}: too big for the printer at its print scale`);
    assert.ok(!check.verdicts.some((v) => v.tag === 'MESH'), `${t.id}: pinched mesh`);
  }
});

test('print templates that should print cleanly need no supports', () => {
  for (const id of ['spinner', 'top', 'gears', 'hinge', 'house', 'stand', 'controller', 'vase']) {
    const check = printCheck(finishTemplate(TEMPLATES.find((t) => t.id === id), sizeOf));
    assert.ok(check.verdicts.some((v) => v.tag === 'NO SUPPORTS'), `${id}: ${check.verdicts.map((v) => v.tag).join(', ')}`);
  }
});

test('animated templates have tracks on real nodes', () => {
  for (const id of ['gears', 'chest', 'windmill', 'ball']) {
    const project = finishTemplate(TEMPLATES.find((t) => t.id === id), sizeOf);
    const ids = new Set();
    W.walk(project.objects, (n) => { ids.add(n.id); });
    const tracks = Object.keys(project.animation.tracks);
    assert.ok(tracks.length > 0, `${id}: no animation`);
    for (const t of tracks) assert.ok(ids.has(t), `${id}: track for missing node ${t}`);
  }
});
