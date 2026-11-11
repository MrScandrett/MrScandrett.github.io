/* print-orient.mjs — which way up should a part print?
 *
 * Pure: no DOM, no Three.js. Meshes are Z-up millimetre triangle soup (see
 * fab-io.mjs). Rotations are 3×3 row-major arrays.
 *
 *   orient(src, R, scale)        → soup turned by R, scaled, and set on the bed
 *   rotationTo(from, to)         → R turning unit vector `from` onto `to`
 *   layFlat(placed, triangle, R) → new R that puts that triangle's face on the bed
 *   analyze(placed, opts)        → contact, overhangs, support volume, size, fit
 *   rankOrientations(src, opts)  → candidate orientations, best first
 *
 * How "best" is judged (cost, lower is better, all in mm³ so the terms add up):
 *   supportVolume       plastic the slicer must add under overhangs: the column
 *                       from each overhang down to whatever surface is below it
 *   + wobble            0.5 × part volume × (1 − contact ÷ reference area), where
 *                       the reference is (part volume)^⅔: a part balanced on an
 *                       edge is likely to tip or let go of the bed
 *   + height            0.002 × part volume × height in mm: taller prints take
 *                       more layers and wobble more
 * It does not judge strength. Layers split apart most easily along Z, so a
 * bracket can be "best" on its back and strongest on its side: that is the
 * student's call, and the page says so.
 */

import { bounds, placeOnBed, printerFit, signedVolume, DEFAULT_PRINTER } from './fab-io.mjs';
import { overhangs } from './forge/engine.mjs';

export const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
export const OVERHANG_LIMIT = 45;
const BED_EPS = 0.05; // mm: a face this close to the bed is touching it

export function multiply(a, b) { // a·b: apply b, then a
  const out = new Array(9);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  return out;
}

export function axisRotation(axis, degrees) {
  const t = (degrees * Math.PI) / 180;
  const c = Math.cos(t), s = Math.sin(t);
  const r = (v) => (Math.abs(v) < 1e-12 ? 0 : v);
  if (axis === 'x') return [1, 0, 0, 0, c, -s, 0, s, c].map(r);
  if (axis === 'y') return [c, 0, s, 0, 1, 0, -s, 0, c].map(r);
  return [c, -s, 0, s, c, 0, 0, 0, 1].map(r);
}

/* Rodrigues: the shortest turn taking unit vector a onto unit vector b. */
export function rotationTo(a, b) {
  const [ax, ay, az] = normalize(a), [bx, by, bz] = normalize(b);
  const vx = ay * bz - az * by, vy = az * bx - ax * bz, vz = ax * by - ay * bx;
  const c = ax * bx + ay * by + az * bz;
  if (c < -0.999999) {
    // opposite: half a turn about any axis perpendicular to a
    const p = Math.abs(ax) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const [ux, uy, uz] = normalize([ay * p[2] - az * p[1], az * p[0] - ax * p[2], ax * p[1] - ay * p[0]]);
    return [2 * ux * ux - 1, 2 * ux * uy, 2 * ux * uz, 2 * uy * ux, 2 * uy * uy - 1, 2 * uy * uz, 2 * uz * ux, 2 * uz * uy, 2 * uz * uz - 1];
  }
  const k = 1 / (1 + c);
  return [
    1 - k * (vy * vy + vz * vz), k * vx * vy - vz, k * vx * vz + vy,
    k * vx * vy + vz, 1 - k * (vx * vx + vz * vz), k * vy * vz - vx,
    k * vx * vz - vy, k * vy * vz + vx, 1 - k * (vx * vx + vy * vy),
  ];
}

function normalize([x, y, z]) {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

/* Snaps a rotation that should be exact (quarter turns) back onto 0/±1, so
   repeated button presses don't drift. */
export function tidy(R) {
  return R.map((v) => (Math.abs(v) < 1e-9 ? 0 : Math.abs(Math.abs(v) - 1) < 1e-9 ? Math.sign(v) : v));
}

export function transform(positions, R, scale = 1) {
  const out = new Float32Array(positions.length);
  const m = R.map((v) => v * scale);
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    out[i] = m[0] * x + m[1] * y + m[2] * z;
    out[i + 1] = m[3] * x + m[4] * y + m[5] * z;
    out[i + 2] = m[6] * x + m[7] * y + m[8] * z;
  }
  return out;
}

export function orient(src, R = IDENTITY, scale = 1) {
  return placeOnBed(transform(src, R, scale));
}

export function triangleNormal(p, t) {
  const i = t * 9;
  const ux = p[i + 3] - p[i], uy = p[i + 4] - p[i + 1], uz = p[i + 5] - p[i + 2];
  const vx = p[i + 6] - p[i], vy = p[i + 7] - p[i + 1], vz = p[i + 8] - p[i + 2];
  return normalize([uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]);
}

/* The face picked in the current view goes face-down on the bed. */
export function layFlat(placed, triangle, R) {
  return multiply(rotationTo(triangleNormal(placed, triangle), [0, 0, -1]), R);
}

/* Triangles facing within `degrees` of the picked one: the whole flat face a
   student means when they point at one triangle of it. */
export function coplanarMask(placed, triangle, degrees = 2) {
  const [nx, ny, nz] = triangleNormal(placed, triangle);
  const limit = Math.cos((degrees * Math.PI) / 180);
  const n = placed.length / 9;
  const mask = new Uint8Array(n);
  for (let t = 0; t < n; t++) {
    const [ax, ay, az] = triangleNormal(placed, t);
    if (ax * nx + ay * ny + az * nz >= limit) mask[t] = 1;
  }
  return mask;
}

/* ── analysis ─────────────────────────────────────────────────────────── */

function triArea(p, i) {
  const ux = p[i + 3] - p[i], uy = p[i + 4] - p[i + 1], uz = p[i + 5] - p[i + 2];
  const vx = p[i + 6] - p[i], vy = p[i + 7] - p[i + 1], vz = p[i + 8] - p[i + 2];
  return Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
}

/* Support volume on a grid of vertical columns. Every upward-facing triangle
   is drawn into the columns it covers as a surface supports can stand on;
   every overhang triangle as a ceiling that needs holding up. Each ceiling
   sample needs plastic down to the highest surface beneath it, or the bed. */
export function supportVolume(placed, mask, { cells = 96 } = {}) {
  const n = placed.length / 9;
  const { min, max } = bounds(placed);
  const span = Math.max(max[0] - min[0], max[1] - min[1], 1e-6);
  const cell = Math.max(span / cells, 0.25);
  const nx = Math.ceil((max[0] - min[0]) / cell) + 1;
  const floors = new Map(); // column → heights of upward surfaces
  const ceilings = [];      // [column, height] pairs
  const visit = (i, fn) => {
    const ax = placed[i], ay = placed[i + 1], az = placed[i + 2];
    const bx = placed[i + 3], by = placed[i + 4], bz = placed[i + 5];
    const cx = placed[i + 6], cy = placed[i + 7], cz = placed[i + 8];
    const det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(det) < 1e-12) return;
    const x0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - min[0]) / cell - 0.5));
    const x1 = Math.ceil((Math.max(ax, bx, cx) - min[0]) / cell - 0.5);
    const y0 = Math.max(0, Math.floor((Math.min(ay, by, cy) - min[1]) / cell - 0.5));
    const y1 = Math.ceil((Math.max(ay, by, cy) - min[1]) / cell - 0.5);
    for (let gy = y0; gy <= y1; gy++) {
      const py = min[1] + (gy + 0.5) * cell;
      for (let gx = x0; gx <= x1; gx++) {
        const px = min[0] + (gx + 0.5) * cell;
        const l1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / det;
        const l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / det;
        const l3 = 1 - l1 - l2;
        if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
        fn(gy * nx + gx, l1 * az + l2 * bz + l3 * cz);
      }
    }
  };
  for (let t = 0; t < n; t++) {
    const i = t * 9;
    const nz = triangleNormal(placed, t)[2];
    if (mask[t] === 1) visit(i, (col, z) => ceilings.push(col, z));
    else if (nz > 1e-6) visit(i, (col, z) => { let f = floors.get(col); if (!f) floors.set(col, f = []); f.push(z); });
  }
  let volume = 0;
  for (let k = 0; k < ceilings.length; k += 2) {
    const col = ceilings[k], z = ceilings[k + 1];
    let below = 0;
    const f = floors.get(col);
    if (f) for (const h of f) if (h < z - 1e-3 && h > below) below = h;
    volume += (z - below) * cell * cell;
  }
  return volume;
}

export function analyze(placed, { limitDeg = OVERHANG_LIMIT, printer = DEFAULT_PRINTER, cells = 96 } = {}) {
  const n = placed.length / 9;
  const box = bounds(placed);
  let contactArea = 0;
  const contact = new Uint8Array(n);
  for (let t = 0; t < n; t++) {
    const i = t * 9;
    if (Math.max(placed[i + 2], placed[i + 5], placed[i + 8]) < BED_EPS) { contact[t] = 1; contactArea += triArea(placed, i); }
  }
  const over = overhangs(placed, limitDeg);
  const support = supportVolume(placed, over.mask, { cells });
  return {
    size: box.size,
    height: box.size[2],
    fit: printerFit(box.size, printer),
    contactArea,
    contact,
    overhangArea: over.area,
    bridgeArea: over.bridgeArea,
    mask: over.mask,
    supportVolume: support,
  };
}

export function partVolume(src) {
  return Math.abs(signedVolume(src));
}

export function cost(a, volume) {
  const v = Math.max(volume, 1);
  const reference = v ** (2 / 3);
  const wobble = 0.5 * v * Math.max(0, 1 - a.contactArea / reference);
  return a.supportVolume + wobble + 0.002 * v * a.height + (a.fit.fits ? 0 : 1e12);
}

/* Directions worth trying face-down: each large flat area of the part (faces
   grouped by direction, so the four feet of a stool count as one), plus the
   six axes, plus where it is now. */
export function candidateDirections(src, { max = 18 } = {}) {
  const n = src.length / 9;
  const bins = new Map();
  let total = 0;
  for (let t = 0; t < n; t++) {
    const a = triArea(src, t * 9);
    if (!a) continue;
    total += a;
    const [x, y, z] = triangleNormal(src, t);
    const key = `${Math.round(x * 14)},${Math.round(y * 14)},${Math.round(z * 14)}`;
    let b = bins.get(key);
    if (!b) bins.set(key, b = { area: 0, x: 0, y: 0, z: 0 });
    b.area += a; b.x += x * a; b.y += y * a; b.z += z * a;
  }
  const found = [...bins.values()].filter((b) => b.area >= total * 0.004).sort((a, b) => b.area - a.area).map((b) => normalize([b.x, b.y, b.z]));
  const dirs = [];
  const add = (d) => { if (!dirs.some((e) => e[0] * d[0] + e[1] * d[1] + e[2] * d[2] > 0.9976)) dirs.push(d); }; // 4°
  add([0, 0, -1]);
  for (const d of found.slice(0, max)) add(d);
  for (const d of [[0, 0, 1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]]) add(d);
  return dirs;
}

/* Tries each direction face-down and sorts them. Pass onProgress to hear
   about each one (the page yields to the browser between them). */
export async function rankOrientations(src, { R = IDENTITY, scale = 1, limitDeg = OVERHANG_LIMIT, printer = DEFAULT_PRINTER, onProgress, pause } = {}) {
  const current = transform(src, R, scale);
  const volume = partVolume(current);
  const dirs = candidateDirections(current);
  const results = [];
  for (let k = 0; k < dirs.length; k++) {
    const turn = tidy(rotationTo(dirs[k], [0, 0, -1]));
    const placed = placeOnBed(transform(current, turn));
    const a = analyze(placed, { limitDeg, printer, cells: 72 });
    results.push({ R: tidy(multiply(turn, R)), down: dirs[k], cost: cost(a, volume), ...pick(a) });
    onProgress?.(k + 1, dirs.length);
    if (pause) await pause();
  }
  results.sort((a, b) => a.cost - b.cost);
  return { volume, results };
}

const pick = ({ size, height, fit, contactArea, overhangArea, bridgeArea, supportVolume: s }) => ({ size, height, fit, contactArea, overhangArea, bridgeArea, supportVolume: s });

/* ── the sample part ──────────────────────────────────────────────────── */

/* Extrudes a polygon (counter-clockwise, star-shaped from its first corner)
   `depth` mm up Z. Used for the sample part and by the tests. */
export function extrude(poly, depth) {
  const out = [];
  const push = (...pts) => { for (const p of pts) out.push(...p); };
  for (let i = 1; i + 1 < poly.length; i++) {
    const [a, b, c] = [poly[0], poly[i], poly[i + 1]];
    push([...a, 0], [...c, 0], [...b, 0]);           // bottom faces down
    push([...a, depth], [...b, depth], [...c, depth]); // top faces up
  }
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    push([...a, 0], [...b, 0], [...b, depth], [...a, 0], [...b, depth], [...a, depth]);
  }
  return Float32Array.from(out);
}

/* An L-bracket standing on its thin edge and tilted, as if exported from an
   app that saved it the way it sits in an assembly. */
export function samplePart() {
  const L = extrude([[0, 0], [40, 0], [40, 6], [6, 6], [6, 30], [0, 30]], 24);
  return orient(L, multiply(axisRotation('y', 35), axisRotation('x', 90)));
}
