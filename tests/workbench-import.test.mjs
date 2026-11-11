import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from '../assets/vendor/manifold/manifold.js';
import { createEngine } from '../assets/js/forge/engine.mjs';
import { edgeReport, writeBinaryStl, write3mf } from '../assets/js/fab-io.mjs';
import { readMesh } from '../assets/js/mesh-import.mjs';
import { extrude } from '../assets/js/print-orient.mjs';
import * as W from '../assets/js/workbench/model.mjs';
import { shapeById } from '../assets/js/workbench/shapes.mjs';
import {
  MAX_IMPORT_TRIANGLES, assetIds, checkSolid, decodeAssets, encodeAssets, hashGeometry, makeAsset, makeOutlineAsset, projectTriangles, weld,
} from '../assets/js/workbench/assets.mjs';
import { parseSvg } from '../assets/js/svg-outline.mjs';

const font = JSON.parse(fs.readFileSync('assets/vendor/fonts/droid-sans-bold.typeface.json', 'utf8'));
const engine = await createEngine(Module, { font });
const near = (a, b, eps = 1e-3) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));

const cube = (s) => extrude([[0, 0], [s, 0], [s, s], [0, s]], s);
function imported(soup, name) {
  const asset = makeAsset(soup, { name });
  asset.solid = engine.scoped((ctx) => checkSolid(ctx, asset));
  return asset;
}
function setup(preset, soup, { units = 'mm' } = {}) {
  const asset = imported(soup, 'Test model');
  const assets = new Map([[asset.id, asset]]);
  const project = W.freshProject(preset);
  const node = W.newShapeNode(project, 'mesh', { params: { asset: asset.id, units } });
  project.objects.push(node);
  const opts = { cache: W.createShapeCache(), assets };
  const evaluate = () => engine.scoped((ctx) => W.evaluate(ctx, project, opts));
  const print = () => engine.run({ params: [], build: (ctx) => ({ bodies: W.printBodies(ctx, project, opts).bodies, layout: 'nested' }) }, {});
  return { asset, assets, project, node, opts, evaluate, print };
}

test('weld turns STL triangle soup into shared corners and drops slivers', () => {
  const soup = cube(10);
  const { vertices, triangles } = weld(Float32Array.from([...soup, 1, 1, 1, 1, 1, 1, 2, 2, 2]));
  assert.equal(vertices.length / 3, 8);
  assert.equal(triangles.length / 3, 12);
});

test('the same geometry always gets the same id, different geometry another', () => {
  const a = makeAsset(cube(10)), b = makeAsset(cube(10)), c = makeAsset(cube(11));
  assert.equal(a.id, b.id);
  assert.notEqual(a.id, c.id);
  assert.match(a.id, /^m[0-9a-z]{6,20}$/);
});

test('a closed import is a solid: it builds, prints, and fills its real size', () => {
  const t = setup('print', cube(20));
  assert.equal(t.asset.solid, true);
  const r = t.evaluate();
  assert.deepEqual(r.errors, []);
  assert.equal(r.pieces.length, 1);
  assert.equal(r.pieces[0].display, false);
  r.sizes[t.node.id].forEach((v) => assert.ok(near(v, 20)));
  const p = t.print();
  assert.equal(p.error, undefined);
  assert.ok(near(p.bodies[0].volume, 8000));
});

test('a box hole cuts an imported solid, and an imported solid can be a hole', () => {
  const t = setup('print', cube(20));
  const hole = W.newShapeNode(t.project, 'box', { hole: true, params: { w: 10, d: 10, h: 40 } });
  t.project.objects.push(hole);
  const p = t.print();
  assert.equal(p.error, undefined, p.error);
  assert.ok(near(p.bodies[0].volume, 8000 - 10 * 10 * 20), `volume ${p.bodies[0].volume}`);

  // the other way round: the imported cube cuts a pocket in a box
  const u = setup('print', cube(10));
  u.node.hole = true;
  u.node.pos = [0, 0, 15];
  const box = W.newShapeNode(u.project, 'box', { params: { w: 30, d: 30, h: 20 } });
  box.pos = [0, 0, 10];
  u.project.objects.push(box);
  const q = u.print();
  assert.ok(near(q.bodies[0].volume, 30 * 30 * 20 - 10 * 10 * 10), `volume ${q.bodies[0].volume}`); // the cube (z 10–20) sits inside the box (z 0–20)
});

test('an open mesh comes in display-only: drawn, never cut, left out of the print with a reason', () => {
  const open = cube(20).slice(0, -9 * 2);   // two triangles short of closed
  const t = setup('print', open);
  assert.equal(t.asset.solid, false);
  const r = t.evaluate();
  assert.equal(r.pieces.length, 1);
  assert.equal(r.pieces[0].display, true);
  assert.ok(r.bounds[t.node.id]);
  const hole = W.newShapeNode(t.project, 'box', { hole: true });
  t.project.objects.push(hole);
  const r2 = t.evaluate();
  assert.ok(r2.errors.some((e) => e.id === t.node.id && /closed solid/.test(e.message)));
  const bodies = engine.scoped((ctx) => W.printBodies(ctx, t.project, t.opts));
  assert.equal(bodies.bodies.length, 0);
  assert.ok(bodies.errors.some((e) => /left out of the print/.test(e.message)));
});

test('a display-only model refuses to be a hole and says so', () => {
  const t = setup('print', cube(20).slice(0, -18));
  t.node.hole = true;
  t.project.objects.push(W.newShapeNode(t.project, 'box'));
  const r = t.evaluate();
  assert.ok(r.errors.some((e) => /can’t be a hole/.test(e.message)));
});

test('units: a file in inches grows 25.4×, and a metre-based project gets metres', () => {
  const t = setup('print', cube(2), { units: 'in' });
  t.evaluate().sizes[t.node.id].forEach((v) => assert.ok(near(v, 50.8)));
  const g = setup('game', cube(500));   // 500 mm in a game project (metres)
  g.evaluate().sizes[g.node.id].forEach((v) => assert.ok(near(v, 0.5)));
  // and the game project still prints at its print scale in millimetres
  const p = g.print();
  assert.ok(p.bodies.length === 1 && edgeReport(p.bodies[0].positions).watertight);
});

test('save and reopen: the assets section round-trips byte for byte and the id is checked', () => {
  const t = setup('print', cube(20));
  const saved = JSON.parse(JSON.stringify({ ...t.project, assets: encodeAssets(t.assets, assetIds(t.project)) }));
  const back = decodeAssets(saved.assets);
  const a = back.get(t.asset.id);
  assert.deepEqual(Array.from(a.vertices), Array.from(t.asset.vertices));
  assert.deepEqual(Array.from(a.triangles), Array.from(t.asset.triangles));
  assert.equal(a.solid, true);
  const project = W.validateProject(saved);
  assert.equal(project.objects[0].params.asset, t.asset.id);

  const tampered = structuredClone(saved.assets);
  const other = encodeAssets(new Map([[t.asset.id, { ...t.asset, vertices: makeAsset(cube(21)).vertices }]]), [t.asset.id]);
  tampered[t.asset.id].vertices = other[t.asset.id].vertices;
  assert.throws(() => decodeAssets(tampered), /id does not match/);
  const badIndex = structuredClone(saved.assets);
  badIndex[t.asset.id].triangles = btoa(String.fromCharCode(...new Uint8Array(new Uint32Array([0, 1, 999]).buffer)));
  assert.throws(() => decodeAssets(badIndex), /corner that does not exist/);
  assert.throws(() => decodeAssets({ 'not an id': {} }), /damaged/);
});

test('a missing asset is an error on that shape, not a crash', () => {
  const project = W.freshProject('print');
  project.objects.push(W.newShapeNode(project, 'mesh', { params: { asset: hashGeometry(new Float32Array(3), new Uint32Array(3)) } }));
  const r = engine.scoped((ctx) => W.evaluate(ctx, project, { cache: W.createShapeCache(), assets: new Map() }));
  assert.ok(r.errors[0].message.includes('missing'));
});

test('limits: imports over the triangle cap are refused; the budget counts every use', () => {
  const big = new Float32Array((MAX_IMPORT_TRIANGLES + 1) * 9);
  for (let t = 0; t < MAX_IMPORT_TRIANGLES + 1; t++) big.set([t, 0, 0, t + 1, 0, 0, t, 1, 0], t * 9);
  assert.throws(() => makeAsset(big), /Simplify/);
  const t = setup('print', cube(10));
  t.project.objects.push(W.cloneNode(t.project, t.node));
  assert.equal(projectTriangles(t.project, t.assets), 24);
});

test('files from every format import into Workbench the same way', async () => {
  for (const [name, bytes] of [['c.stl', new Uint8Array(writeBinaryStl(cube(15)))], ['c.3mf', write3mf([{ name: 'C', positions: cube(15) }])]]) {
    const r = await readMesh(bytes, name);
    const asset = imported(r.positions, name);
    assert.equal(asset.solid, true, name);
  }
  assert.equal(shapeById('mesh').imported, true);
  assert.deepEqual(W.resolveParams(shapeById('mesh'), { asset: '<script>', units: 'parsecs' }), { asset: '', units: 'mm' });
});

/* ── SVG drawings ─────────────────────────────────────────────────────── */

const ringSvg = (rule = 'evenodd') => `<svg xmlns="http://www.w3.org/2000/svg" width="40mm" height="40mm" viewBox="0 0 40 40"><path fill-rule="${rule}" d="M0 0H40V40H0Z M10 10H30V30H10Z"/></svg>`;
function drawing(preset, svg, params = {}) {
  const asset = makeOutlineAsset(parseSvg(svg), { name: 'Ring' });
  const assets = new Map([[asset.id, asset]]);
  const project = W.freshProject(preset);
  const node = W.newShapeNode(project, 'svg', { params: { asset: asset.id, ...params } });
  project.objects.push(node);
  const opts = { cache: W.createShapeCache(), assets };
  const print = () => engine.run({ params: [], build: (ctx) => ({ bodies: W.printBodies(ctx, project, opts).bodies, layout: 'nested' }) }, {});
  return { asset, assets, project, node, opts, print };
}

test('an SVG ring extrudes with its hole, at the drawing’s width and the chosen height', () => {
  const t = drawing('print', ringSvg(), { w: 40, h: 3 });
  const p = t.print();
  assert.equal(p.error, undefined, p.error);
  assert.ok(near(p.bodies[0].volume, (1600 - 400) * 3), `volume ${p.bodies[0].volume}`);
  assert.ok(edgeReport(p.bodies[0].positions).watertight);
  // width scales evenly: 80 mm wide is four times the area
  const big = drawing('print', ringSvg(), { w: 80, h: 3 }).print();
  assert.ok(near(big.bodies[0].volume, (1600 - 400) * 4 * 3));
  // the same drawing with nonzero and both rings wound the same way fills the hole, as SVG would
  const filled = drawing('print', ringSvg('nonzero'), { w: 40, h: 3 }).print();
  assert.ok(near(filled.bodies[0].volume, 1600 * 3));
});

test('an SVG set to Hole engraves into the part under it', () => {
  const t = drawing('print', ringSvg(), { w: 40, h: 2 });
  t.node.hole = true;
  t.node.pos = [0, 0, 5];                       // spans z 4–6
  const plate = W.newShapeNode(t.project, 'box', { params: { w: 60, d: 60, h: 5 } });
  plate.pos = [0, 0, 2.5];                      // spans z 0–5
  t.project.objects.push(plate);
  const p = t.print();
  assert.ok(near(p.bodies[0].volume, 60 * 60 * 5 - (1600 - 400) * 1), `volume ${p.bodies[0].volume}`);
});

test('drawings save inside the project file, and a tampered drawing is refused', () => {
  const t = drawing('print', ringSvg(), { w: 40 });
  assert.deepEqual([...assetIds(t.project)], [t.asset.id]);
  const saved = JSON.parse(JSON.stringify({ ...t.project, assets: encodeAssets(t.assets, assetIds(t.project)) }));
  const back = decodeAssets(saved.assets).get(t.asset.id);
  assert.equal(back.kind, 'outline');
  assert.deepEqual(back.shapes, t.asset.shapes);
  assert.deepEqual(back.size, [40, 40]);
  const tampered = structuredClone(saved.assets);
  tampered[t.asset.id].shapes[0].contours[0][0] = 99;
  assert.throws(() => decodeAssets(tampered), /id does not match/);
  const flipped = structuredClone(saved.assets);
  flipped[t.asset.id].shapes[0].rule = 'nonzero';
  assert.throws(() => decodeAssets(flipped), /id does not match/);
});

test('a drawing in a metre project keeps its real size', () => {
  const t = drawing('building', ringSvg(), { w: 0.04, h: 0.003 });
  const r = engine.scoped((ctx) => W.evaluate(ctx, t.project, t.opts));
  assert.deepEqual(r.errors, []);
  assert.ok(near(r.sizes[t.node.id][0], 0.04) && near(r.sizes[t.node.id][2], 0.003));
});
