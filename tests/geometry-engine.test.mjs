import test from 'node:test';
import assert from 'node:assert/strict';
import {
  solveTriangle, pointsFromSides, coneSectorAngle, circleMetrics, polygonArea, isSimplePolygon
} from '../assets/js/lessons/geometry-engine.mjs';

const near = (x, y, eps = 1e-9) => assert.ok(Math.abs(x - y) < eps, `${x} vs ${y}`);
const S = 25;

test('3-4-5 right triangle', () => {
  const t = solveTriangle({ x: 0, y: 0 }, { x: 4 * S, y: 0 }, { x: 0, y: 3 * S }, S);
  assert.ok(t.valid);
  near(t.a, 5); near(t.b, 3); near(t.c, 4);
  near(t.area, 6); near(t.perim, 12); near(t.h, 3);
  near(t.angA, 90, 1e-9);
  near(t.angB, Math.atan2(3, 4) * 180 / Math.PI, 1e-9);
});

test('angles always sum to 180 and match law of sines', () => {
  const t = solveTriangle({ x: 10, y: 200 }, { x: 330, y: 240 }, { x: 90, y: 20 }, S);
  near(t.angA + t.angB + t.angC, 180, 1e-9);
  near(Math.sin(t.angA * Math.PI / 180) / t.a, Math.sin(t.angB * Math.PI / 180) / t.b, 1e-9);
  near(Math.sin(t.angB * Math.PI / 180) / t.b, Math.sin(t.angC * Math.PI / 180) / t.c, 1e-9);
});

test('obtuse triangle: foot outside base, c = |d1 - d2|, B reported obtuse', () => {
  const t = solveTriangle({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 160, y: -50 }, S);
  assert.equal(t.footInside, false);
  near(t.c, Math.abs(t.d1 - t.d2), 1e-9);
  assert.ok(t.angB > 90);
});

test('degenerate triangles are flagged, never NaN', () => {
  const collinear = solveTriangle({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 }, S);
  assert.equal(collinear.valid, false);
  const stacked = solveTriangle({ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 200, y: 90 }, S);
  assert.equal(stacked.valid, false);
  for (const t of [collinear, stacked]) {
    for (const k of ['a', 'b', 'c', 'angA', 'angB', 'angC', 'area', 'h', 'd1', 'd2']) {
      assert.ok(Number.isFinite(t[k]), k);
    }
  }
});

test('pointsFromSides round-trips through solveTriangle', () => {
  const pts = pointsFromSides(5, 3, 4, { x: 100, y: 300 }, S, 1);
  const t = solveTriangle(pts[0], pts[1], pts[2], S);
  near(t.a, 5, 1e-9); near(t.b, 3, 1e-9); near(t.c, 4, 1e-9);
  assert.ok(pts[2].y < pts[0].y, 'C is above AB for flip=+1');
  assert.equal(pointsFromSides(1, 1, 5, { x: 0, y: 0 }, S, 1), null);
});

test('circle, cone and polygon helpers', () => {
  const m = circleMetrics(2);
  near(m.area, 4 * Math.PI); near(m.circumference, 4 * Math.PI); near(m.d, 4);
  near(coneSectorAngle(3, 5), 216);
  near(polygonArea([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }]), 12);
  assert.ok(isSimplePolygon([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }]));
  assert.ok(!isSimplePolygon([{ x: 0, y: 0 }, { x: 4, y: 3 }, { x: 4, y: 0 }, { x: 0, y: 3 }]));
});

test('sphere volume and cylinder surface identities', () => {
  const R = 3;
  near(4 / 3 * Math.PI * R ** 3, 36 * Math.PI);
  const r = 2, h = 5;
  near(2 * Math.PI * r * h + 2 * Math.PI * r * r, 2 * Math.PI * r * (h + r));
});
