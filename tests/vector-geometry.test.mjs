import test from 'node:test';
import assert from 'node:assert/strict';
import Module from '../assets/vendor/manifold/manifold.js';
import * as G from '../assets/js/lessons/vector-geometry.mjs';
import { combine, ringsOf } from '../assets/js/lessons/vector-boolean.mjs';

const kernel = await Module();
kernel.setup();

const style = { fill: '#176b65', stroke: '#163d47', strokeWidth: 0, opacity: 100, visible: true, name: 'x' };
const rect = (id, x, y, w, h, extra = {}) => ({ ...style, id, type: 'rect', x, y, w, h, rotation: 0, radius: 0, ...extra });
const ellipse = (id, x, y, w, h, extra = {}) => ({ ...style, id, type: 'ellipse', x, y, w, h, rotation: 0, ...extra });
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg ?? ''} ${a} ≉ ${b} (±${eps})`);
const area = (o) => ringsOf(o).reduce((s, r) => s + G.polygonArea(r), 0);
const maxDeviation = (o, exact) => {
  // furthest any point of o's outline lies from the exact outline (sampled both ways)
  const a = G.flattenSubpaths(G.worldSubpaths(o), 0.05).flatMap((r) => r.points);
  const b = G.worldSubpaths(exact);
  return Math.max(...a.map((p) => G.nearestOnSubpaths(b, p).d));
};

test('world/local round trip under rotation', () => {
  const o = rect(1, 100, 50, 200, 80, { rotation: 33 });
  for (const p of [[0, 0], [100, 0], [37, 81]]) {
    const back = G.toLocal(o, G.toWorld(o, p));
    near(back[0], p[0], 1e-9); near(back[1], p[1], 1e-9);
  }
});

test('ellipse bounds are the curve, not its control points', () => {
  const b = G.objectBounds(ellipse(1, 10, 20, 100, 60, { rotation: 0 }));
  near(b.x0, 10, 1e-9); near(b.x1, 110, 1e-9); near(b.y0, 20, 1e-9); near(b.y1, 80, 1e-9);
  // A circle's bounds don't change when it rotates (control polygon bounds would).
  const c = G.objectBounds(ellipse(2, 0, 0, 100, 100, { rotation: 45 }));
  near(c.x1 - c.x0, 100, 0.1, 'rotated circle width');
});

test('rounded rectangle, polygon and star are real paths', () => {
  near(area(rect(1, 0, 0, 100, 60, { radius: 10 })), 100 * 60 - (4 - Math.PI) * 100, 2, 'rounded rect area');
  const hex = { ...style, id: 3, type: 'polygon', sides: 6, star: false, inner: 0.5, x: 0, y: 0, w: 100, h: 100, rotation: 0 };
  assert.equal(G.shapeSubpaths(hex)[0].nodes.length, 6);
  const star = { ...hex, sides: 5, star: true, inner: 0.4 };
  assert.equal(G.shapeSubpaths(star)[0].nodes.length, 10);
  const b = G.objectBounds(star);
  near(b.x0, 0, 1e-9); near(b.x1, 100, 1e-9); near(b.y0, 0, 1e-9); near(b.y1, 100, 1e-9);
});

test('withWorldSubpaths refits the box without moving the shape (rotated too)', () => {
  for (const rotation of [0, 27, -90, 150]) {
    const o = ellipse(1, 100, 100, 160, 90, { rotation });
    const p = G.toPath(o);
    assert.equal(p.type, 'path');
    near(p.w, 160, 1e-6, 'w'); near(p.h, 90, 1e-6, 'h'); near(p.x, 100, 1e-6, 'x'); near(p.y, 100, 1e-6, 'y');
    near(maxDeviation(p, o), 0, 1e-3, 'outline');
  }
});

test('inserting a node keeps the curve exactly; deleting removes it', () => {
  const subs = G.worldSubpaths(ellipse(1, 0, 0, 200, 120));
  const before = G.clone(subs);
  const at = G.insertNode(subs[0], 1, 0.3);
  assert.equal(subs[0].nodes.length, 5);
  assert.equal(at, 2);
  const o1 = G.withWorldSubpaths({ ...style, id: 1, rotation: 0 }, before), o2 = G.withWorldSubpaths({ ...style, id: 2, rotation: 0 }, subs);
  near(maxDeviation(o2, o1), 0, 1e-3, 'split curve');
  assert.ok(G.deleteNode(subs[0], at));
  assert.equal(subs[0].nodes.length, 4);
  const line = [{ closed: false, nodes: [G.node([0, 0]), G.node([10, 0])] }];
  assert.equal(G.deleteNode(line[0], 0), false, 'a path keeps two anchors');
});

test('smooth handles stay in line, symmetric handles mirror, Alt breaks them', () => {
  const s = { closed: false, nodes: [G.node([0, 0]), G.node([50, 0], [40, 0], [70, 0], 'smooth'), G.node([100, 0])] };
  G.moveHandle(s, 1, 'o', [50, 30]);
  near(s.nodes[1].i[0], 50, 1e-9); near(s.nodes[1].i[1], -10, 1e-9, 'smooth keeps its own length');
  s.nodes[1].k = 'symmetric';
  G.moveHandle(s, 1, 'o', [60, 10]);
  assert.deepEqual(s.nodes[1].i, [40, -10]);
  G.moveHandle(s, 1, 'o', [80, 0], true);
  assert.equal(s.nodes[1].k, 'corner');
  assert.deepEqual(s.nodes[1].i, [40, -10]);
});

test('setNodeKind turns a corner into a smooth curve and back', () => {
  const s = { closed: true, nodes: [G.node([0, 0]), G.node([100, 0]), G.node([100, 100]), G.node([0, 100])] };
  G.setNodeKind(s, 1, 'smooth');
  const n = s.nodes[1];
  assert.ok(n.i && n.o);
  const cross = (n.i[0] - n.p[0]) * (n.o[1] - n.p[1]) - (n.i[1] - n.p[1]) * (n.o[0] - n.p[0]);
  near(cross, 0, 1e-9, 'collinear');
  G.setNodeKind(s, 1, 'corner');
  assert.equal(s.nodes[1].i, null);
});

test('breakAt opens a closed path and cuts an open one', () => {
  const ring = { closed: true, nodes: [G.node([0, 0]), G.node([10, 0]), G.node([10, 10])] };
  const [open] = G.breakAt(ring, 1);
  assert.equal(open.closed, false);
  assert.equal(open.nodes.length, 4);
  assert.deepEqual(open.nodes[0].p, open.nodes[3].p);
  const two = G.breakAt(open, 2);
  assert.equal(two.length, 2);
});

test('fitClosed: a flattened circle comes back as a few smooth anchors', () => {
  const c = ellipse(1, 0, 0, 200, 200);
  const ring = ringsOf(c)[0];
  assert.ok(ring.length > 50);
  const fitted = G.withWorldSubpaths({ ...style, id: 2, rotation: 0 }, [G.fitClosed(ring, 0.3)]);
  assert.ok(fitted.subpaths[0].nodes.length <= 8, `${fitted.subpaths[0].nodes.length} anchors`);
  assert.ok(fitted.subpaths[0].nodes.every((n) => n.k === 'smooth'));
  assert.ok(maxDeviation(fitted, c) < 0.5);
});

test('fitClosed keeps corners as corners and edges straight', () => {
  const sq = G.fitClosed([[0, 0], [50, 0], [100, 0], [100, 100], [0, 100]]);
  assert.equal(sq.nodes.length, 4);
  assert.ok(sq.nodes.every((n) => n.k === 'corner' && !n.i && !n.o));
});

test('unite two overlapping squares', () => {
  const r = combine(kernel, [rect(1, 0, 0, 100, 100), rect(2, 50, 50, 100, 100)], 'unite');
  near(area(r), 10000 + 10000 - 2500, 0.5);
  assert.equal(r.subpaths[0].nodes.length, 8);
  assert.equal(r.fill, style.fill);
});

test('minus front cuts a hole that renders as a hole', () => {
  const r = combine(kernel, [rect(1, 0, 0, 200, 200, { fill: '#112233' }), ellipse(2, 50, 50, 100, 100, { fill: '#ffffff' })], 'minus');
  assert.equal(r.fill, '#112233', 'keeps the back object\'s style');
  assert.equal(r.subpaths.length, 2);
  near(area(r), 40000 - Math.PI * 2500, 80, 'within the 0.3 px fit budget');
  // Outer ring and hole wind in opposite directions, so nonzero fill shows the hole.
  const [a, b] = ringsOf(r).map(G.polygonArea);
  assert.ok(Math.sign(a) !== Math.sign(b));
});

test('intersect two circles is a lens with two corners', () => {
  const r = combine(kernel, [ellipse(1, 0, 0, 100, 100), ellipse(2, 50, 0, 100, 100)], 'intersect');
  const nodes = r.subpaths[0].nodes;
  assert.equal(nodes.filter((n) => n.k === 'corner').length, 2);
  const exact = 2 * 50 * 50 * Math.acos(0.5) - 25 * Math.sqrt(4 * 2500 - 2500);
  near(area(r), exact, exact * 0.01);
});

test('exclude keeps only the parts covered once', () => {
  const r = combine(kernel, [rect(1, 0, 0, 100, 100), rect(2, 50, 0, 100, 100)], 'exclude');
  near(Math.abs(ringsOf(r).reduce((s, x) => s + G.polygonArea(x), 0)), 10000, 0.5);
});

test('disjoint intersect is empty; text is refused', () => {
  assert.equal(combine(kernel, [rect(1, 0, 0, 10, 10), rect(2, 50, 50, 10, 10)], 'intersect'), null);
  assert.throws(() => combine(kernel, [rect(1, 0, 0, 10, 10), { ...style, id: 2, type: 'text', x: 0, y: 0, w: 10, h: 10, rotation: 0 }], 'unite'));
});

test('align and distribute', () => {
  const boxes = [{ x0: 0, y0: 0, x1: 10, y1: 10 }, { x0: 30, y0: 5, x1: 50, y1: 25 }, { x0: 100, y0: 0, x1: 110, y1: 10 }];
  assert.deepEqual(G.alignDeltas(boxes, 'left', { x0: 0, y0: 0, x1: 110, y1: 25 }).map((d) => d[0]), [0, -30, -100]);
  assert.deepEqual(G.alignDeltas(boxes, 'bottom', { x0: 0, y0: 0, x1: 110, y1: 25 }).map((d) => d[1]), [15, 0, 15]);
  const d = G.distributeDeltas(boxes, 'x');
  // widths 10 + 20 + 10 in a span of 110: gaps of 35
  assert.deepEqual(d.map((v) => v[0]), [0, 15, 0]);
});

test('scaling and rotating a selection about a point', () => {
  const o = rect(1, 0, 0, 100, 50);
  const s = G.scaleAbout(o, [0, 0], 2, 3);
  assert.deepEqual([s.x, s.y, s.w, s.h], [0, 0, 200, 150]);
  const r = G.rotateAbout(o, [0, 0], 90);
  assert.equal(r.rotation, 90);
  near(r.x + r.w / 2, -25, 1e-9); near(r.y + r.h / 2, 50, 1e-9);
  // A rotated path stretched along the artboard axis bakes the skew into its anchors.
  const p = G.toPath(rect(2, 0, 0, 100, 100, { rotation: 45 }));
  const before = G.objectBounds(p);
  const q = G.scaleAbout(p, [before.x0, before.y0], 2, 1);
  const after = G.objectBounds(q);
  near(after.x1 - after.x0, 2 * (before.x1 - before.x0), 1e-6);
  near(after.y1 - after.y0, before.y1 - before.y0, 1e-6);
});

test('flip mirrors a path in place', () => {
  const tri = { ...style, id: 1, type: 'polygon', sides: 3, star: false, inner: 0.5, x: 0, y: 0, w: 100, h: 100, rotation: 0 };
  const f = G.flip(tri, 'y', [50, 50]);
  const ys = f.subpaths[0].nodes.map((n) => G.toWorld(f, n.p)[1]).sort((a, b) => a - b);
  near(ys[0], 0, 1e-9); near(ys[1], 0, 1e-9); near(ys[2], 100, 1e-9);
});

test('version-1 projects migrate; markup and bad data are refused', () => {
  const v1 = { version: 1, objects: [
    { id: 1, type: 'curve', name: 'c', x: 0, y: 0, w: 100, h: 100, rotation: 0, fill: 'none', stroke: '#000000', strokeWidth: 3, opacity: 100, visible: true, points: [[0, 100], [0, 0], [100, 0], [100, 100]], closed: false },
    { id: 2, type: 'polygon', name: 't', x: 0, y: 0, w: 10, h: 10, rotation: 0, fill: '#ffffff', stroke: '#000000', strokeWidth: 0, opacity: 100, visible: true },
    { id: 3, type: 'text', name: 'x', x: 0, y: 0, w: 200, h: 30, rotation: 0, fill: '#ffffff', stroke: '#000000', strokeWidth: 0, opacity: 100, visible: true, text: 'HI' },
  ], missions: { shapes: true } };
  const { objects, missions } = G.validateProject(v1);
  assert.equal(objects[0].type, 'path');
  assert.deepEqual(objects[0].subpaths[0].nodes[0].o, [0, 0]);
  assert.equal(objects[1].sides, 3);
  assert.equal(objects[2].size, 30);
  assert.equal(missions.shapes, true);
  assert.equal(missions.combine, false);
  assert.throws(() => G.validateProject({ version: 2, objects: [{ ...objects[0], fill: 'url(javascript:alert(1))' }] }));
  assert.throws(() => G.validateProject({ version: 2, objects: [{ ...objects[0], subpaths: [{ nodes: [{ p: ['1', 2] }] }] }] }));
  const round = G.validateProject({ version: 2, objects: [{ ...objects[0], group: 4, locked: true }] });
  assert.equal(round.objects[0].group, 4);
  assert.equal(round.objects[0].locked, true);
});

test('path data writes lines as L and curves as C', () => {
  const d = G.pathData([{ closed: true, nodes: [G.node([0, 0]), G.node([10, 0], null, [15, 5]), G.node([10, 10], [15, 8])] }]);
  assert.equal(d, 'M 0 0 L 10 0 C 15 5 15 8 10 10 L 0 0 Z');
});
