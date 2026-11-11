import test from 'node:test';
import assert from 'node:assert/strict';
import { bounds, edgeReport, signedVolume } from '../assets/js/fab-io.mjs';
import {
  IDENTITY, analyze, axisRotation, candidateDirections, extrude, layFlat, multiply, orient,
  rankOrientations, rotationTo, samplePart, supportVolume, tidy, transform, triangleNormal,
} from '../assets/js/print-orient.mjs';

const close = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

function box(w, h, d) {
  return extrude([[0, 0], [w, 0], [w, h], [0, h]], d);
}
function cylinder(r, h, n = 48) {
  return extrude(Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]), h);
}
function pyramid(s, h) {
  const a = [0, 0, 0], b = [s, 0, 0], c = [s, s, 0], d = [0, s, 0], t = [s / 2, s / 2, h];
  return Float32Array.from([a, c, b, a, d, c, a, b, t, b, c, t, c, d, t, d, a, t].flat());
}
const downOf = (R) => [R[6], R[7], R[8]].map((v) => -v); // the direction R sends to -Z, read from R's last row

test('extruded test solids are closed and wound outward', () => {
  for (const solid of [box(10, 20, 30), cylinder(8, 20), pyramid(20, 15), samplePart()]) {
    assert.equal(edgeReport(solid).watertight, true);
    assert.ok(signedVolume(solid) > 0);
  }
  assert.ok(close(signedVolume(box(10, 20, 30)), 6000, 1e-3));
});

test('rotationTo turns one direction onto another, including straight back', () => {
  for (const [a, b] of [[[1, 0, 0], [0, 0, -1]], [[0, 0, 1], [0, 0, -1]], [[0, 0, -1], [0, 0, -1]], [[0.6, 0.8, 0], [0, 1, 0]]]) {
    const R = rotationTo(a, b);
    const r = [R[0] * a[0] + R[1] * a[1] + R[2] * a[2], R[3] * a[0] + R[4] * a[1] + R[5] * a[2], R[6] * a[0] + R[7] * a[1] + R[8] * a[2]];
    r.forEach((v, k) => assert.ok(close(v, b[k], 1e-9), `${a} → ${b}`));
    const det = R[0] * (R[4] * R[8] - R[5] * R[7]) - R[1] * (R[3] * R[8] - R[5] * R[6]) + R[2] * (R[3] * R[7] - R[4] * R[6]);
    assert.ok(close(det, 1, 1e-9), 'a rotation, never a mirror');
  }
});

test('four quarter turns come back exactly', () => {
  let R = IDENTITY;
  for (let i = 0; i < 4; i++) R = tidy(multiply(axisRotation('x', 90), R));
  assert.deepEqual(R, IDENTITY);
});

test('orient keeps volume, sets the part on the bed and keeps it closed', () => {
  const placed = orient(box(10, 20, 30), multiply(axisRotation('x', 37), axisRotation('z', 12)), 2);
  const { min } = bounds(placed);
  assert.ok(close(min[2], 0, 1e-4));
  assert.ok(close(signedVolume(placed), 6000 * 8, 1));
  assert.equal(edgeReport(placed, 1e-3).watertight, true);
});

test('lay flat puts the picked face on the bed', () => {
  const placed = orient(samplePart());
  // find a big side face, lay it down, and its normal must now point straight down
  let t = 0, best = 0;
  for (let i = 0; i < placed.length / 9; i++) { const n = triangleNormal(placed, i); if (Math.abs(n[2]) < 0.9 && Math.abs(n[0]) > best) { best = Math.abs(n[0]); t = i; } }
  const R = layFlat(placed, t, IDENTITY);
  const after = orient(placed, R);
  assert.ok(close(triangleNormal(after, t)[2], -1, 1e-6));
  assert.ok(analyze(after).contactArea > 0);
});

test('a box flat on the bed has full contact and needs no support', () => {
  const a = analyze(orient(box(20, 20, 10)));
  assert.ok(close(a.contactArea, 400, 1e-3));
  assert.equal(a.overhangArea, 0);
  assert.equal(a.supportVolume, 0);
  assert.equal(a.fit.fits, true);
});

test('support volume measures the air under a shelf down to the floor below it', () => {
  // a T standing upside-up: the bar's underside is an overhang 20 mm above the bed
  const T = extrude([[0, 0], [10, 0], [10, 20], [30, 20], [30, 26], [-20, 26], [-20, 20], [0, 20]], 16);
  const placed = orient(T, axisRotation('x', 90)); // profile vertical, extruded along Y
  const a = analyze(placed);
  const expected = (20 + 20) * 16 * 20; // two 20×16 mm wings (wider than a 10 mm bridge), each 20 mm above the bed
  assert.ok(Math.abs(a.supportVolume - expected) / expected < 0.08, `support ${a.supportVolume.toFixed(0)} vs ${expected}`);
  // turned upside down the bar lies on the bed and the stem points up: nothing to hold up
  const flipped = analyze(orient(T, multiply(axisRotation('x', -90), IDENTITY)));
  assert.ok(flipped.supportVolume < 1, `flipped support ${flipped.supportVolume}`);
});

test('support stops at a surface below, not the bed', () => {
  // a ceiling at z=20 over a floor at z=10 needs 10 mm columns
  const ceiling = [0, 0, 20, 10, 10, 20, 10, 0, 20, 0, 0, 20, 0, 10, 20, 10, 10, 20];
  const floor = [0, 0, 10, 10, 0, 10, 10, 10, 10, 0, 0, 10, 10, 10, 10, 0, 10, 10];
  const soup = Float32Array.from([...ceiling, ...floor]);
  const mask = new Uint8Array([1, 1, 0, 0]);
  assert.ok(Math.abs(supportVolume(soup, mask) - 1000) < 30);
});

test('ranking: a pyramid prints on its base, not its tip', async () => {
  const tipDown = orient(pyramid(30, 25), axisRotation('x', 180));
  const { results } = await rankOrientations(tipDown);
  const best = analyze(orient(tipDown, results[0].R));
  assert.ok(close(best.contactArea, 900, 1), `contact ${best.contactArea}`);
  assert.ok(best.supportVolume < 1);
});

test('ranking: a cylinder stands on its end rather than rolling on its side', async () => {
  const lying = orient(cylinder(10, 40), axisRotation('x', 90));
  const { results } = await rankOrientations(lying);
  const best = analyze(orient(lying, results[0].R));
  assert.ok(close(best.height, 40, 0.01), `height ${best.height}`);
});

test('ranking: the tilted sample bracket ends up flat with no supports', async () => {
  const src = samplePart();
  assert.ok(analyze(orient(src)).supportVolume > 100, 'the sample starts badly placed');
  const { results } = await rankOrientations(src);
  const best = analyze(orient(src, results[0].R));
  assert.ok(best.supportVolume < 1);
  assert.ok(best.contactArea >= 24 * 40 - 1, `contact ${best.contactArea}`);
  for (let i = 1; i < results.length; i++) assert.ok(results[i - 1].cost <= results[i].cost);
});

test('parts too big for the printer rank behind parts that fit', async () => {
  // 250 mm long, 10 high: fits lying down (260 × 160 bed), not standing (230 tall)
  const rod = box(250, 10, 10);
  const standing = orient(rod, axisRotation('y', 90));
  assert.equal(analyze(standing).fit.fits, false);
  const { results } = await rankOrientations(standing);
  assert.equal(results[0].fit.fits, true);
});

test('candidate directions include the big flat faces and stay few', () => {
  const dirs = candidateDirections(cylinder(10, 40, 64));
  assert.ok(dirs.length <= 24);
  assert.ok(dirs.some((d) => close(d[2], -1, 1e-6)) && dirs.some((d) => close(d[2], 1, 1e-6)));
});

test('transform with scale only grows the part', () => {
  const t = transform(box(1, 2, 3), IDENTITY, 25.4);
  assert.ok(close(bounds(t).size[2], 76.2, 1e-4));
  assert.deepEqual(downOf(IDENTITY), [-0, -0, -1]);
});
