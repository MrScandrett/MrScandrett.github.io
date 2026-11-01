// Beyond the Printer: pure geometry for cardboard slice-forms and folded nets.
// No DOM, no Three.js: everything here is millimetres in, plain data and SVG strings out,
// so it runs the same in the browser and under `node`.
//
// Slice-forms: a shape is a signed field f(x, y, z) (negative inside, roughly millimetres),
// standing on z = 0. "A" slices are the planes x = const, "B" slices the planes y = const.
// Where A_i meets B_j the solid spans z0..z1 along that vertical line; A gets a slot cut
// from the TOP down to the middle (z0 + z1) / 2 and B gets one cut from the BOTTOM up to the
// middle, so B slides down onto A and the two halves fill the crossing exactly.
// Each slice outline is traced with marching squares on a rectilinear grid that has extra grid
// lines hugging every slot wall, so slots stay exactly as wide as asked even for thin card.
//
// Nets: a box, an n-sided prism and an n-sided pyramid unfold into faces, fold lines and glue
// tabs (one tab per glued seam), checked so no tab overlaps another face.

export const PAPER = { w: 215.9, h: 279.4, margin: 10, top: 24, bottom: 22 };

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* ── Field helpers ─────────────────────────────────────────────── */

function smin(a, b, k) {
  const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1);
  return b * (1 - h) + a * h - k * h * (1 - h);
}

function ellipsoid(px, py, pz, c, r) {
  const x = px - c[0], y = py - c[1], z = pz - c[2];
  const k0 = Math.hypot(x / r[0], y / r[1], z / r[2]);
  const k1 = Math.hypot(x / (r[0] * r[0]), y / (r[1] * r[1]), z / (r[2] * r[2]));
  return k1 === 0 ? -Math.min(r[0], r[1], r[2]) : (k0 * (k0 - 1)) / k1;
}

// Ellipsoid tilted by `angle` (radians) in the x–z plane about its centre.
function tiltedEllipsoid(px, py, pz, c, r, angle) {
  const dx = px - c[0], dz = pz - c[2];
  const cs = Math.cos(angle), sn = Math.sin(angle);
  return ellipsoid(c[0] + dx * cs + dz * sn, py, c[2] - dx * sn + dz * cs, c, r);
}

// Footprint "radius": round at roundness 0, a rounded square near 1 (superellipse).
function footNorm(x, y, squareness) {
  const n = 2 + squareness * 10;
  if (squareness <= 0.001) return Math.hypot(x, y);
  const ax = Math.abs(x), ay = Math.abs(y), m = Math.max(ax, ay);
  if (m === 0) return 0;
  return m * Math.pow(Math.pow(ax / m, n) + Math.pow(ay / m, n), 1 / n);
}

// A solid of revolution (or a stack of rounded squares) with radius r(z) for 0 ≤ z ≤ H.
function stackedSolid(H, rx, ry, radiusAt, squareness) {
  return function (x, y, z) {
    const r = radiusAt(clamp(z, 0, H));
    const rho = footNorm(x / rx, y / ry, squareness) * Math.min(rx, ry);
    return Math.max(rho - r * Math.min(rx, ry), -z, z - H);
  };
}

function catmull(values) {
  // values sampled at equal steps over 0..1; returns f(t) through them.
  return function (t) {
    const n = values.length - 1;
    const s = clamp(t, 0, 1) * n;
    const i = Math.min(n - 1, Math.floor(s));
    const u = s - i;
    const p0 = values[Math.max(0, i - 1)], p1 = values[i], p2 = values[i + 1], p3 = values[Math.min(n, i + 2)];
    return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
  };
}

/* ── The shapes students can slice ─────────────────────────────── */

const P = (id, label, min, max, step, value, unit = '') => ({ id, label, min, max, step, value, unit });

export const SHAPES = {
  helper: {
    name: 'Desk helper: pencil crate',
    trait: 'Useful',
    note: 'The gaps between slices are the pockets. Make the gap wider than a pencil (about 7–8 mm across).',
    counts: [6, 4],
    params: [P('height', 'Height', 40, 160, 5, 80, 'mm'), P('width', 'Width (left–right)', 50, 190, 5, 110, 'mm'),
      P('depth', 'Depth (front–back)', 40, 160, 5, 70, 'mm'), P('square', 'Corners: round → square', 0, 1, 0.05, 0.85)],
    build(p) {
      const W = p.width / 2, D = p.depth / 2, H = p.height;
      return { box: [-W, W, -D, D, 0, H], f: stackedSolid(H, W, D, () => 1, p.square) };
    }
  },
  vase: {
    name: 'Vase (draw the profile)',
    trait: 'Useful or likeness',
    note: 'Each slider sets the radius at one height, bottom to top. A neck narrower than a slice is far from the centre splits that slice into two pieces.',
    counts: [5, 5],
    params: [P('height', 'Height', 60, 220, 5, 150, 'mm'), P('r0', 'Radius at the base', 10, 90, 1, 30, 'mm'),
      P('r1', 'Radius ¼ up', 10, 90, 1, 50, 'mm'), P('r2', 'Radius ½ up', 10, 90, 1, 46, 'mm'),
      P('r3', 'Radius ¾ up', 10, 90, 1, 32, 'mm'), P('r4', 'Radius at the top', 10, 90, 1, 34, 'mm'),
      P('square', 'Footprint: round → square', 0, 1, 0.05, 0)],
    build(p) {
      const H = p.height, rs = [p.r0, p.r1, p.r2, p.r3, p.r4];
      const R = Math.max(...rs) * 1.12;
      const curve = catmull(rs);
      return { box: [-R, R, -R, R, 0, H], f: stackedSolid(H, R, R, (z) => Math.max(1, curve(z / H)) / R, p.square) };
    }
  },
  dome: {
    name: 'Dome',
    trait: 'Shape study',
    note: 'A half ball. Every slice is part of a circle, and slices near the edge are small.',
    counts: [5, 5],
    params: [P('width', 'Width', 60, 220, 5, 140, 'mm'), P('height', 'Height', 30, 140, 5, 70, 'mm'), P('square', 'Footprint: round → square', 0, 1, 0.05, 0)],
    build(p) {
      const R = p.width / 2, H = p.height;
      return { box: [-R, R, -R, R, 0, H], f: stackedSolid(H, R, R, (z) => Math.sqrt(Math.max(0, 1 - (z / H) * (z / H))), p.square) };
    }
  },
  cone: {
    name: 'Cone or pyramid',
    trait: 'Shape study',
    note: 'Round footprint makes a cone; square makes a pyramid. Every slice is a triangle or a trapezoid.',
    counts: [4, 4],
    params: [P('width', 'Base width', 60, 200, 5, 120, 'mm'), P('height', 'Height', 50, 220, 5, 130, 'mm'), P('square', 'Footprint: round → square', 0, 1, 0.05, 1)],
    build(p) {
      const R = p.width / 2, H = p.height;
      return { box: [-R, R, -R, R, 0, H], f: stackedSolid(H, R, R, (z) => 1 - z / H, p.square) };
    }
  },
  owl: {
    name: 'Owl (likeness)',
    trait: 'Likeness',
    note: 'Body, head and ear tufts are three blended forms. Read the silhouette of the front slices: the ears make it an owl.',
    counts: [5, 4],
    params: [P('height', 'Height', 80, 220, 5, 160, 'mm'), P('plump', 'Plump body', 0.75, 1.3, 0.05, 1),
      P('head', 'Head size', 0.8, 1.25, 0.05, 1), P('ears', 'Ear tufts', 0, 1, 0.05, 0.7)],
    build(p) {
      const H = p.height, s = p.plump, hd = p.head, e = p.ears;
      const body = { c: [0, 0, 0.36 * H], r: [0.3 * H * s, 0.26 * H * s, 0.38 * H] };
      const head = { c: [0, 0, 0.74 * H], r: [0.25 * H * hd, 0.22 * H * hd, 0.19 * H * hd] };
      const earR = [0.06 * H, 0.05 * H, 0.03 * H + 0.11 * H * e];
      const earZ = head.c[2] + 0.13 * H * hd;
      const R = 0.34 * H * Math.max(s, hd);
      return {
        box: [-R, R, -R, R, 0, H * 1.15],
        f(x, y, z) {
          let d = smin(ellipsoid(x, y, z, body.c, body.r), ellipsoid(x, y, z, head.c, head.r), 0.08 * H);
          if (e > 0.02) {
            const ears = Math.min(
              tiltedEllipsoid(x, y, z, [0.15 * H * hd, 0, earZ], earR, -0.25),
              tiltedEllipsoid(x, y, z, [-0.15 * H * hd, 0, earZ], earR, 0.25));
            d = smin(d, ears, 0.025 * H);
          }
          return Math.max(d, -z);
        }
      };
    }
  },
  fish: {
    name: 'Fish (likeness)',
    trait: 'Likeness',
    note: 'The side (B) slices carry the likeness; the front-to-back (A) slices are its ribs.',
    counts: [5, 3],
    params: [P('length', 'Length', 100, 220, 5, 190, 'mm'), P('body', 'Body height', 0.3, 0.55, 0.01, 0.42), P('tail', 'Tail size', 0.6, 1.4, 0.05, 1)],
    build(p) {
      const L = p.length, bh = p.body * L / 2, t = p.tail;
      const body = { c: [-0.1 * L, 0, bh * 0.95], r: [0.38 * L, 0.13 * L, bh] };
      const lobe = [0.15 * L * t, 0.035 * L, 0.05 * L * t];
      const tx = 0.3 * L;
      const stalk = { c: [0.22 * L, 0, body.c[2]], r: [0.12 * L, 0.05 * L, 0.07 * L] };
      return {
        asymmetricX: true,
        box: [-0.5 * L, 0.55 * L, -0.15 * L, 0.15 * L, 0, bh * 2.2 + 0.2 * L],
        f(x, y, z) {
          const tail = Math.min(
            tiltedEllipsoid(x, y, z, [tx + 0.05 * L * t, 0, body.c[2] + 0.08 * L * t], lobe, 0.7),
            tiltedEllipsoid(x, y, z, [tx + 0.05 * L * t, 0, body.c[2] - 0.06 * L * t], lobe, -0.7));
          const core = smin(ellipsoid(x, y, z, body.c, body.r), ellipsoid(x, y, z, stalk.c, stalk.r), 0.04 * L);
          return Math.max(smin(core, tail, 0.05 * L), -z);
        }
      };
    }
  }
};

export function defaultParams(shapeId) {
  const out = {};
  for (const p of SHAPES[shapeId].params) out[p.id] = p.value;
  return out;
}

/* ── Bounding box and crossing columns ─────────────────────────── */

export function tightBox(f, box) {
  const [x0, x1, y0, y1, z0, z1] = box;
  const step = Math.max(x1 - x0, y1 - y0, z1 - z0) / 50;
  const out = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity];
  for (let x = x0 - step; x <= x1 + step; x += step) {
    for (let y = y0 - step; y <= y1 + step; y += step) {
      for (let z = Math.max(0, z0); z <= z1 + step; z += step) {
        if (f(x, y, z) < 0) {
          if (x < out[0]) out[0] = x; if (x > out[1]) out[1] = x;
          if (y < out[2]) out[2] = y; if (y > out[3]) out[3] = y;
          if (z < out[4]) out[4] = z; if (z > out[5]) out[5] = z;
        }
      }
    }
  }
  if (!isFinite(out[0])) return null;
  return [out[0] - step, out[1] + step, out[2] - step, out[3] + step, 0, out[5] + step];
}

function columnSpan(f, x, y, zTop) {
  let lo = null, hi = null;
  for (let z = 0.05; z <= zTop; z += 0.2) {
    if (f(x, y, z) < 0) { if (lo === null) lo = z; hi = z; }
  }
  return lo === null ? null : { z0: Math.max(0, lo - 0.1), z1: hi + 0.1 };
}

function evenly(a, b, n) {
  const out = [];
  for (let i = 1; i <= n; i++) out.push(a + (b - a) * i / (n + 1));
  return out;
}

/* ── Marching squares on a rectilinear grid ────────────────────── */

function gridLines(lo, hi, h, extra) {
  const vals = [];
  const n = Math.ceil((hi - lo) / h);
  for (let i = -2; i <= n + 2; i++) vals.push(lo + i * h);
  for (const v of extra) if (v > lo - 2 * h && v < hi + 2 * h) vals.push(v);
  vals.sort((a, b) => a - b);
  const out = [];
  for (const v of vals) if (!out.length || v - out[out.length - 1] > 1e-4) out.push(v);
  return out;
}

export function traceField(field, U, V) {
  const nu = U.length, nv = V.length;
  const F = new Float64Array(nu * nv);
  let deepest = { val: Infinity, u: 0, v: 0 };
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      let val = field(U[i], V[j]);
      if (i === 0 || j === 0 || i === nu - 1 || j === nv - 1) val = Math.max(val, 0.01);
      if (val === 0) val = 1e-9;
      F[j * nu + i] = val;
      if (val < deepest.val) deepest = { val, u: U[i], v: V[j] };
    }
  }
  const points = new Map();
  const point = (key) => {
    let pt = points.get(key);
    if (pt) return pt;
    const vertical = key & 1, base = key >> 1, i = base % nu, j = (base - i) / nu;
    const a = F[j * nu + i];
    if (vertical) { const b = F[(j + 1) * nu + i]; const t = a / (a - b); pt = [U[i], V[j] + t * (V[j + 1] - V[j])]; }
    else { const b = F[j * nu + i + 1]; const t = a / (a - b); pt = [U[i] + t * (U[i + 1] - U[i]), V[j]]; }
    points.set(key, pt);
    return pt;
  };
  const segs = [];
  for (let j = 0; j < nv - 1; j++) {
    for (let i = 0; i < nu - 1; i++) {
      const f0 = F[j * nu + i], f1 = F[j * nu + i + 1], f2 = F[(j + 1) * nu + i + 1], f3 = F[(j + 1) * nu + i];
      const c = (f0 < 0 ? 1 : 0) | (f1 < 0 ? 2 : 0) | (f2 < 0 ? 4 : 0) | (f3 < 0 ? 8 : 0);
      if (c === 0 || c === 15) continue;
      const e0 = 2 * (j * nu + i), e1 = 2 * (j * nu + i + 1) + 1, e2 = 2 * ((j + 1) * nu + i), e3 = 2 * (j * nu + i) + 1;
      const centreIn = (f0 + f1 + f2 + f3) < 0;
      switch (c) {
        case 1: case 14: segs.push([e3, e0]); break;
        case 2: case 13: segs.push([e0, e1]); break;
        case 3: case 12: segs.push([e3, e1]); break;
        case 4: case 11: segs.push([e1, e2]); break;
        case 6: case 9: segs.push([e0, e2]); break;
        case 7: case 8: segs.push([e2, e3]); break;
        case 5: if (centreIn) { segs.push([e0, e1], [e2, e3]); } else { segs.push([e3, e0], [e1, e2]); } break;
        case 10: if (centreIn) { segs.push([e3, e0], [e1, e2]); } else { segs.push([e0, e1], [e2, e3]); } break;
      }
    }
  }
  const byKey = new Map();
  segs.forEach((s, idx) => {
    for (const k of s) { const list = byKey.get(k); if (list) list.push(idx); else byKey.set(k, [idx]); }
  });
  const used = new Uint8Array(segs.length);
  const loops = [];
  for (let s = 0; s < segs.length; s++) {
    if (used[s]) continue;
    used[s] = 1;
    const start = segs[s][0];
    let key = segs[s][1];
    const loop = [point(start)];
    let guard = 0;
    while (key !== start && guard++ < segs.length + 2) {
      loop.push(point(key));
      const next = (byKey.get(key) || []).find((idx) => !used[idx]);
      if (next === undefined) break;
      used[next] = 1;
      key = segs[next][0] === key ? segs[next][1] : segs[next][0];
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return { loops, deepest };
}

function simplifyOpen(pts, tol) {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-12;
    let worst = -1, at = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
      if (d > worst) { worst = d; at = i; }
    }
    if (worst > tol) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

export function simplifyLoop(loop, tol = 0.05) {
  if (loop.length < 8) return loop;
  let far = 0, best = -1;
  for (let i = 1; i < loop.length; i++) {
    const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1]);
    if (d > best) { best = d; far = i; }
  }
  const a = simplifyOpen(loop.slice(0, far + 1), tol);
  const b = simplifyOpen(loop.slice(far).concat([loop[0]]), tol);
  return a.slice(0, -1).concat(b.slice(0, -1));
}

export function loopArea(loop) {
  let a = 0;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) a += (loop[j][0] - loop[i][0]) * (loop[j][1] + loop[i][1]);
  return a / 2;
}

export function pointInLoop(pt, loop) {
  let inside = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const [xi, yi] = loop[i], [xj, yj] = loop[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/* ── Slice-form ────────────────────────────────────────────────── */

export function slotWidth(thickness, allowance = 0, kerf = 0) {
  return Math.max(0.2, thickness + allowance - kerf);
}

export function computeSliceForm(opts) {
  const shapeId = SHAPES[opts.shape] ? opts.shape : 'helper';
  const params = Object.assign(defaultParams(shapeId), opts.params || {});
  const nA = clamp(Math.round(opts.countA ?? SHAPES[shapeId].counts[0]), 1, 12);
  const nB = clamp(Math.round(opts.countB ?? SHAPES[shapeId].counts[1]), 1, 12);
  const thickness = clamp(Number(opts.thickness) || 3, 0.2, 20);
  const w = slotWidth(thickness, Number(opts.allowance) || 0, Number(opts.kerf) || 0);
  const shape = SHAPES[shapeId].build(params);
  const box = tightBox(shape.f, shape.box);
  if (box) {
    // Every shape is mirror-symmetric front to back, most also left to right: keep the slices in mirrored pairs.
    const yy = Math.max(-box[2], box[3]); box[2] = -yy; box[3] = yy;
    if (!shape.asymmetricX) { const xx = Math.max(-box[0], box[1]); box[0] = -xx; box[1] = xx; }
  }
  if (!box) return { shape: shapeId, params, pieces: [], warnings: ['This shape is empty.'] };
  const [x0, x1, y0, y1, , z1] = box;
  const xs = evenly(x0, x1, nA), ys = evenly(y0, y1, nB);
  const cols = xs.map((x) => ys.map((y) => columnSpan(shape.f, x, y, z1)));
  const maxDim = Math.max(x1 - x0, y1 - y0, z1);
  const h = clamp(maxDim / 240, 0.25, 0.9);
  const delta = Math.min(0.04, w / 8);
  const pieces = [];
  const warnings = [];

  const makePiece = (kind, index, at, slots, f2, uLo, uHi) => {
    const extraU = [], extraV = [];
    for (const s of slots) {
      extraU.push(s.u - w / 2 - delta, s.u - w / 2 + delta, s.u + w / 2 - delta, s.u + w / 2 + delta);
      extraV.push(s.v - delta, s.v + delta);
    }
    const U = gridLines(uLo, uHi, h, extraU);
    const V = gridLines(0, z1, h, extraV.concat([delta]));
    const field = (u, v) => {
      let val = Math.max(f2(u, v), -v);
      for (const s of slots) {
        const dx = Math.abs(u - s.u) - w / 2;
        const dy = s.fromTop ? s.v - v : v - s.v;
        const sd = Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0);
        val = Math.max(val, -sd);
      }
      return val;
    };
    const traced = traceField(field, U, V);
    let loops = traced.loops.map((l) => simplifyLoop(l, 0.04)).filter((l) => Math.abs(loopArea(l)) > 8);
    if (!loops.length) return null;
    const outers = loops.filter((l, i) => loops.reduce((n, other, k) => n + (k !== i && pointInLoop(l[0], other) ? 1 : 0), 0) % 2 === 0);
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const l of loops) for (const [u, v] of l) { if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v; }
    const name = kind + (index + 1);
    const labelSize = clamp(-traced.deepest.val * 0.9, 2.6, 9);
    const slotLabels = slots.filter((s) => s.span / 2 > 9).map((s) => ({
      u: s.u, v: s.fromTop ? s.v - 3.6 : s.v + 3.6, text: s.partner, size: 2.6
    }));
    return {
      name, kind, index, at, loops, outerCount: outers.length,
      bbox: { u0, u1, v0, v1, w: u1 - u0, h: v1 - v0 },
      label: { u: traced.deepest.u, v: traced.deepest.v, size: labelSize },
      slots: slots.map((s) => ({ u: s.u, v: s.v, fromTop: s.fromTop, partner: s.partner, depth: s.span / 2 })),
      slotLabels
    };
  };

  xs.forEach((x, i) => {
    const slots = [];
    ys.forEach((y, j) => { const c = cols[i][j]; if (c) slots.push({ u: y, v: (c.z0 + c.z1) / 2, span: c.z1 - c.z0, fromTop: true, partner: 'B' + (j + 1) }); });
    const piece = makePiece('A', i, x, slots, (u, v) => shape.f(x, u, v), y0, y1);
    if (piece) pieces.push(piece);
  });
  ys.forEach((y, j) => {
    const slots = [];
    xs.forEach((x, i) => { const c = cols[i][j]; if (c) slots.push({ u: x, v: (c.z0 + c.z1) / 2, span: c.z1 - c.z0, fromTop: false, partner: 'A' + (i + 1) }); });
    const piece = makePiece('B', j, y, slots, (u, v) => shape.f(u, y, v), x0, x1);
    if (piece) pieces.push(piece);
  });

  const split = pieces.filter((p) => p.outerCount > 1).map((p) => p.name);
  if (split.length) warnings.push(`${split.join(', ')} ${split.length > 1 ? 'come' : 'comes'} out in more than one piece. Cut every part; the slots still hold each part in place, or change the slice count.`);
  const loose = pieces.filter((p) => p.slots.length === 0).map((p) => p.name);
  if (loose.length) warnings.push(`${loose.join(', ')} ${loose.length > 1 ? 'cross' : 'crosses'} no other slice, so nothing would hold ${loose.length > 1 ? 'them' : 'it'}. Change the slice counts.`);
  const spacingA = (x1 - x0) / (nA + 1), spacingB = (y1 - y0) / (nB + 1);
  return {
    shape: shapeId, params, thickness, slot: w, countA: nA, countB: nB,
    box, size: { w: x1 - x0, d: y1 - y0, h: z1 }, spacingA, spacingB,
    cellGap: { a: spacingA - thickness, b: spacingB - thickness },
    pieces, warnings, slotCount: pieces.filter((p) => p.kind === 'A').reduce((n, p) => n + p.slots.length, 0)
  };
}

/* ── Fit test strip: the slice-form's "clearance comb" ─────────── */

export function fitStrip(thickness, kerf = 0) {
  const step = thickness < 1.5 ? 0.25 : 0.5;
  const widths = [-2, -1, 0, 1, 2].map((k) => Math.max(0.2, thickness + k * step));
  const depth = 14, height = 26, gap = 18, margin = 10;
  const width = margin * 2 + gap * (widths.length - 1) + widths.reduce((a, b) => a + b, 0);
  const pts = [[0, 0]];
  let u = margin;
  widths.forEach((wd, i) => {
    const drawn = Math.max(0.2, wd - kerf);
    const c = u + wd / 2;
    pts.push([c - drawn / 2, 0], [c - drawn / 2, depth], [c + drawn / 2, depth], [c + drawn / 2, 0]);
    u += wd + (i < widths.length - 1 ? gap : 0);
  });
  pts.push([width, 0], [width, height], [0, height]);
  // y-down local coordinates (slot mouths along the top edge)
  let x = margin;
  const labels = widths.map((wd, i) => {
    const out = { x: x + wd / 2, y: depth + 7, text: wd.toFixed(2).replace(/0$/, '') };
    x += wd + gap;
    return out;
  });
  return { widths, step, outline: pts, labels, w: width, h: height };
}

/* ── Nets ─────────────────────────────────────────────────────── */

export const NETS = {
  box: { name: 'Box or cube', params: [P('length', 'Length', 20, 150, 1, 60, 'mm'), P('width', 'Width', 20, 150, 1, 40, 'mm'), P('height', 'Height', 20, 150, 1, 40, 'mm')] },
  prism: { name: 'Prism (3–6 sided)', params: [P('sides', 'Sides of the end', 3, 6, 1, 3), P('edge', 'End edge length', 15, 90, 1, 40, 'mm'), P('length', 'Length', 20, 180, 1, 90, 'mm')] },
  pyramid: { name: 'Pyramid (3–8 sided base)', params: [P('sides', 'Sides of the base', 3, 8, 1, 4), P('edge', 'Base edge length', 20, 120, 1, 60, 'mm'), P('height', 'Height', 15, 150, 1, 50, 'mm')] },
  tetra: { name: 'Tetrahedron (4 equal triangles)', params: [P('edge', 'Edge length', 30, 150, 1, 80, 'mm')] }
};

export function defaultNetParams(id) {
  const out = {};
  for (const p of NETS[id].params) out[p.id] = p.value;
  return out;
}

const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

function regularOnEdge(p, q, n) {
  const pts = [p, q];
  let d = sub(q, p);
  for (let k = 2; k < n; k++) {
    const a = 2 * Math.PI / n, c = Math.cos(a), s = Math.sin(a);
    d = [d[0] * c - d[1] * s, d[0] * s + d[1] * c];
    pts.push(add(pts[pts.length - 1], d));
  }
  return pts;
}

const centroid = (poly) => mul(poly.reduce((acc, p) => add(acc, p), [0, 0]), 1 / poly.length);
const sameEdge = (a, b, c, d) => (Math.hypot(a[0] - c[0], a[1] - c[1]) < 1e-6 && Math.hypot(b[0] - d[0], b[1] - d[1]) < 1e-6) ||
  (Math.hypot(a[0] - d[0], a[1] - d[1]) < 1e-6 && Math.hypot(b[0] - c[0], b[1] - c[1]) < 1e-6);

function segmentsCross(a, b, c, d) {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d);
  return ((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) && ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9));
}

function polyOverlap(a, b) {
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) {
    if (segmentsCross(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])) return true;
  }
  const ca = centroid(a), cb = centroid(b);
  return pointInLoop(ca, b) || pointInLoop(cb, a);
}

function makeTab(p, q, faceCentre, depth) {
  const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
  const t = mul(sub(q, p), 1 / len);
  let n = [-t[1], t[0]];
  const mid = mul(add(p, q), 0.5);
  if ((faceCentre[0] - mid[0]) * n[0] + (faceCentre[1] - mid[1]) * n[1] > 0) n = mul(n, -1);
  const d = Math.min(depth, len * 0.35);
  const inset = Math.min(d, len * 0.3);
  return [p, add(add(p, mul(n, d)), mul(t, inset)), add(add(q, mul(n, d)), mul(t, -inset)), q];
}

export function computeNet(type, raw = {}) {
  const id = NETS[type] ? type : 'box';
  const p = Object.assign(defaultNetParams(id), raw);
  const faces = [];
  const tabEdges = [];
  if (id === 'box') {
    const L = p.length, W = p.width, H = p.height;
    faces.push({ poly: rect(0, 0, L, W), label: 'bottom' }, { poly: rect(0, -H, L, 0), label: 'front' },
      { poly: rect(0, W, L, W + H), label: 'back' }, { poly: rect(0, W + H, L, 2 * W + H), label: 'top' },
      { poly: rect(-H, 0, 0, W), label: 'left' }, { poly: rect(L, 0, L + H, W), label: 'right' });
    tabEdges.push([[-H, 0], [0, 0]], [[-H, W], [0, W]], [[-H, 0], [-H, W]], [[L, 0], [L + H, 0]], [[L, W], [L + H, W]], [[L + H, 0], [L + H, W]], [[0, 2 * W + H], [L, 2 * W + H]]);
  } else if (id === 'prism') {
    const n = clamp(Math.round(p.sides), 3, 6), a = p.edge, Lp = p.length;
    for (let i = 0; i < n; i++) faces.push({ poly: rect(i * a, 0, (i + 1) * a, Lp), label: '' });
    const m = Math.floor((n - 1) / 2);
    const top = regularOnEdge([m * a, Lp], [(m + 1) * a, Lp], n);
    const bottom = regularOnEdge([(m + 1) * a, 0], [m * a, 0], n);
    faces.push({ poly: top, label: 'end' }, { poly: bottom, label: 'end' });
    tabEdges.push([[n * a, 0], [n * a, Lp]]);
    for (const poly of [top, bottom]) for (let k = 1; k < n; k++) tabEdges.push([poly[k], poly[(k + 1) % n]]);
  } else {
    const n = id === 'tetra' ? 3 : clamp(Math.round(p.sides), 3, 8);
    const a = p.edge;
    const R = a / (2 * Math.sin(Math.PI / n)), ri = a / (2 * Math.tan(Math.PI / n));
    const h = id === 'tetra' ? a * Math.sqrt(2 / 3) : p.height;
    const s = Math.hypot(h, ri);
    const base = [];
    for (let k = 0; k < n; k++) { const th = -Math.PI / 2 - Math.PI / n + 2 * Math.PI * k / n; base.push([R * Math.cos(th), R * Math.sin(th)]); }
    faces.push({ poly: base, label: 'base' });
    for (let k = 0; k < n; k++) {
      const P0 = base[k], Q = base[(k + 1) % n];
      const d = sub(Q, P0), len = Math.hypot(d[0], d[1]);
      const out = [d[1] / len, -d[0] / len];
      const apex = add(mul(add(P0, Q), 0.5), mul(out, s));
      faces.push({ poly: [P0, Q, apex], label: '' });
      tabEdges.push([Q, apex]);
    }
  }
  // classify every face edge
  const folds = [], cuts = [], tabs = [];
  const all = faces.map((f) => f.poly);
  faces.forEach((face, fi) => {
    const poly = face.poly;
    for (let k = 0; k < poly.length; k++) {
      const a = poly[k], b = poly[(k + 1) % poly.length];
      const shared = all.some((other, oi) => oi !== fi && other.some((c, m) => sameEdge(a, b, c, other[(m + 1) % other.length])));
      if (shared) { if (!folds.some(([c, d]) => sameEdge(a, b, c, d))) folds.push([a, b]); continue; }
      const tabbed = tabEdges.some(([c, d]) => sameEdge(a, b, c, d));
      if (!tabbed) { cuts.push([a, b]); continue; }
      let depth = 9, tab;
      for (let tries = 0; tries < 8; tries++) {
        tab = makeTab(a, b, centroid(poly), depth);
        const outer = tab.slice(1, 3);
        const clash = all.some((other, oi) => oi !== fi && polyOverlap(tab, other)) || tabs.some((t) => polyOverlap(tab, t)) ||
          all.some((other) => other.some((c, m) => segmentsCross(outer[0], outer[1], c, other[(m + 1) % other.length])));
        if (!clash) break;
        depth *= 0.75;
      }
      tabs.push(tab);
      folds.push([a, b]);
      cuts.push([tab[0], tab[1]], [tab[1], tab[2]], [tab[2], tab[3]]);
    }
  });
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const poly of all.concat(tabs)) for (const [x, y] of poly) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  return {
    type: id, params: p,
    faces: faces.map((f) => ({ poly: f.poly, label: f.label, centre: centroid(f.poly) })),
    folds, cuts, tabs, seams: tabs.length,
    bbox: { x0: minX, y0: minY, x1: maxX, y1: maxY, w: maxX - minX, h: maxY - minY }
  };
}

/* ── Layout on letter paper ───────────────────────────────────── */

export function printableArea() {
  return { x: PAPER.margin, y: PAPER.top, w: PAPER.w - 2 * PAPER.margin, h: PAPER.h - PAPER.top - PAPER.bottom };
}

// Shelf-pack the slice pieces (plus the fit strip) onto letter pages. Each piece may lie as drawn
// or turned 90°; the packing is tried both ways and the one with fewer pages wins.
function shelfPack(items, area, gap) {
  // First fit: an item goes on the first shelf (on any page) with room, else a new shelf, else a new page.
  const pages = [];
  for (const it of items) {
    let placed = false;
    for (const page of pages) {
      for (const shelf of page.shelves) {
        if (it.h <= shelf.h + 0.01 && shelf.used + it.w <= area.w + 0.01) {
          page.items.push(Object.assign({ x: area.x + shelf.used, y: area.y + shelf.y }, it));
          shelf.used += it.w + gap;
          placed = true;
          break;
        }
      }
      if (placed) break;
      if (page.top + it.h <= area.h + 0.01) {
        page.shelves.push({ y: page.top, h: it.h, used: it.w + gap });
        page.items.push(Object.assign({ x: area.x, y: area.y + page.top }, it));
        page.top += it.h + gap;
        placed = true;
        break;
      }
    }
    if (!placed) {
      const page = { items: [], shelves: [{ y: 0, h: it.h, used: it.w + gap }], top: it.h + gap };
      page.items.push(Object.assign({ x: area.x, y: area.y }, it));
      pages.push(page);
    }
  }
  return pages;
}

export function layoutPieces(pieces, opts = {}) {
  const area = printableArea();
  const gap = 5;
  const tries = [];
  for (const turn of ['asDrawn', 'turned']) {
    const items = pieces.map((p) => {
      let w = p.bbox.w, h = p.bbox.h, rotate = false;
      const fitsAsIs = w <= area.w && h <= area.h, fitsTurned = h <= area.w && w <= area.h;
      if ((!fitsAsIs && fitsTurned) || (turn === 'turned' && fitsTurned && w > h)) { rotate = true; [w, h] = [h, w]; }
      return { kind: 'piece', piece: p, w, h, rotate, oversize: w > area.w + 0.01 || h > area.h + 0.01 };
    });
    items.sort((a, b) => b.h - a.h || b.w - a.w);
    if (opts.strip) items.push({ kind: 'strip', strip: opts.strip, w: opts.strip.w, h: opts.strip.h, rotate: false, oversize: false });
    tries.push({ pages: shelfPack(items, area, gap), oversize: items.filter((i) => i.oversize).map((i) => i.piece.name) });
  }
  return tries[1].pages.length < tries[0].pages.length ? tries[1] : tries[0];
}

export function layoutSliceForm(form, opts = {}) {
  return layoutPieces(form.pieces, { strip: opts.strip === false ? null : fitStrip(form.thickness, opts.kerf || 0) });
}

export function layoutNet(net, opts = {}) {
  const area = printableArea();
  let rotate = false, w = net.bbox.w, h = net.bbox.h;
  if ((w > area.w || h > area.h) && h <= area.w && w <= area.h) rotate = true;
  else if (w > h && w > area.w * 0.9 && h < area.w) rotate = true;
  if (rotate) [w, h] = [h, w];
  const fits = Math.min(area.w / w, area.h / h);
  const scale = opts.shrink && fits < 1 ? fits : 1;
  return { rotate, scale, fits: fits >= 1, maxScale: fits, w: w * scale, h: h * scale, x: area.x + (area.w - w * scale) / 2, y: area.y + Math.max(0, (area.h - h * scale) / 2) };
}

/* ── SVG output ────────────────────────────────────────────────── */

const f2 = (n) => (Math.round(n * 100) / 100).toString();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function styleFor(style) {
  return style === 'laser'
    ? { cut: 'stroke="#ff0000" stroke-width="0.1" fill="none"', fold: 'stroke="#0000ff" stroke-width="0.1" fill="none" stroke-dasharray="3 2"', text: '#000000', faint: '#000000', paper: 'none' }
    : { cut: 'stroke="#111" stroke-width="0.35" fill="none" stroke-linejoin="round"', fold: 'stroke="#555" stroke-width="0.3" fill="none" stroke-dasharray="3 2"', text: '#222', faint: '#888', paper: '#fff' };
}

function sheetFrame(inner, { title, subtitle, pageNo, pageCount, style, legend }) {
  const s = styleFor(style);
  const area = printableArea();
  const barY = PAPER.h - PAPER.bottom + 9;
  const ticks = [];
  for (let k = 0; k <= 5; k++) ticks.push(`<line x1="${f2(PAPER.margin + k * 10)}" y1="${f2(barY - (k % 5 ? 1.5 : 2.5))}" x2="${f2(PAPER.margin + k * 10)}" y2="${f2(barY)}" stroke="#111" stroke-width="0.3"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PAPER.w}mm" height="${PAPER.h}mm" viewBox="0 0 ${PAPER.w} ${PAPER.h}" font-family="Arial, Helvetica, sans-serif">` +
    (s.paper !== 'none' ? `<rect width="${PAPER.w}" height="${PAPER.h}" fill="${s.paper}"/>` : '') +
    `<text x="${PAPER.margin}" y="13" font-size="4.6" font-weight="700" fill="${s.text}">${esc(title)}</text>` +
    `<text x="${PAPER.margin}" y="19" font-size="3" fill="${s.text}">${esc(subtitle)}</text>` +
    `<text x="${PAPER.w - PAPER.margin}" y="13" font-size="3.2" text-anchor="end" fill="${s.text}">Page ${pageNo} of ${pageCount}</text>` +
    inner +
    `<line x1="${PAPER.margin}" y1="${f2(barY)}" x2="${PAPER.margin + 50}" y2="${f2(barY)}" stroke="#111" stroke-width="0.6"/>` + ticks.join('') +
    `<text x="${PAPER.margin + 54}" y="${f2(barY - 0.3)}" font-size="2.9" fill="${s.text}">This bar must measure 50 mm. If it doesn’t, print again at 100% / “Actual size”.</text>` +
    `<text x="${PAPER.margin}" y="${f2(barY + 6)}" font-size="2.7" fill="${s.faint}">${esc(legend)}</text>` +
    `<desc>Printable area ${f2(area.w)} × ${f2(area.h)} mm. Made with ClassroomOS Beyond the Printer.</desc></svg>`;
}

function pathFromLoops(loops, map) {
  return loops.map((l) => 'M' + l.map((pt) => { const [x, y] = map(pt); return f2(x) + ' ' + f2(y); }).join('L') + 'Z').join('');
}

export function piecesSheets(layout, { style = 'print', title = 'Template', subtitle = '', legend = '' } = {}) {
  const s = styleFor(style);
  return layout.pages.map((page, idx) => {
    const parts = page.items.map((it) => {
      if (it.kind === 'strip') {
        const st = it.strip;
        const d = 'M' + st.outline.map(([u, v]) => f2(it.x + u) + ' ' + f2(it.y + v)).join('L') + 'Z';
        return `<path d="${d}" ${s.cut}/>` +
          st.labels.map((l) => `<text x="${f2(it.x + l.x)}" y="${f2(it.y + l.y)}" font-size="2.6" text-anchor="middle" fill="${s.text}">${esc(l.text)}</text>`).join('') +
          `<text x="${f2(it.x + 3)}" y="${f2(it.y + st.h - 2.5)}" font-size="2.6" fill="${s.text}">Fit test: slot widths in mm. Cut from the same board.</text>`;
      }
      const p = it.piece;
      const map = it.rotate
        ? ([u, v]) => [it.x + (p.bbox.v1 - v), it.y + (u - p.bbox.u0)]
        : ([u, v]) => [it.x + (u - p.bbox.u0), it.y + (p.bbox.v1 - v)];
      const rot = it.rotate ? 90 : 0;
      const text = (u, v, size, str, weight = 400) => {
        const [x, y] = map([u, v]);
        return `<text x="${f2(x)}" y="${f2(y)}" font-size="${f2(size)}" font-weight="${weight}" text-anchor="middle" dominant-baseline="middle" fill="${s.text}"${rot ? ` transform="rotate(${rot} ${f2(x)} ${f2(y)})"` : ''}>${esc(str)}</text>`;
      };
      return `<path d="${pathFromLoops(p.loops, map)}" ${s.cut} fill-rule="evenodd"/>` +
        text(p.label.u, p.label.v, p.label.size, p.name, 700) +
        (p.slotLabels || []).map((l) => text(l.u, l.v, l.size, l.text)).join('');
    });
    return sheetFrame(parts.join(''), { title, subtitle, pageNo: idx + 1, pageCount: layout.pages.length, style, legend });
  });
}

export function sliceSheets(form, layout, { style = 'print', title = 'Slice-form', kerf = 0 } = {}) {
  const subtitle = `Board ${f2(form.thickness)} mm · slots drawn ${f2(Math.max(0.2, form.slot))} mm wide` + (kerf ? ` (kerf ${f2(kerf)} mm already taken off)` : '') +
    ` · model ${Math.round(form.size.w)} × ${Math.round(form.size.d)} × ${Math.round(form.size.h)} mm`;
  const legend = 'Cut the solid lines. A slices: slots open at the top. B slices: slots open at the bottom. Small labels name the slice that fits each slot. Slide each B down onto the A slices.';
  return piecesSheets(layout, { style, title, subtitle, legend });
}

/* ── Flat-pack tray: tab-and-slot (finger) joints with kerf ─────── */
//
// An open-top tray of OUTER size w × d × h from board of thickness t. Every joined edge is cut
// into an odd number of equal fingers. On each edge a finger is either "full" (the panel reaches
// the outside face) or "notched" (cut back by t), and the two panels meeting at an edge use
// opposite patterns, so each finger of one fills a notch of the other. The base is notched at
// the ends of every edge, the front/back walls are full at the ends of every edge, and the side
// walls are full along the bottom but notched at the ends of their upright edges: so each
// corner cube belongs to exactly one panel. A laser burns away a line `kerf` wide centred on the
// drawn line, so every outline is drawn kerf/2 bigger all round; then tabs come out at full size
// and slots at the right width.

export function fingerCount(len, finger) {
  let n = Math.max(3, Math.round(len / Math.max(1, finger)));
  if (n % 2 === 0) n += (len / n > finger ? -1 : 1);
  return Math.max(3, n);
}

// Panel outline, counter-clockwise from (0, 0) along the bottom edge. `edges` = [bottom, right,
// top, left]; each is null (plain) or { n, endsNotched }.
function fingerPanel(W, H, t, edges) {
  const corners = [[0, 0], [W, 0], [W, H], [0, H]];
  const inward = [[0, 1], [-1, 0], [0, -1], [1, 0]];
  const depthAt = (e, i) => (e && ((i % 2 === 0) === e.endsNotched) ? t : 0);
  const pts = [];
  for (let k = 0; k < 4; k++) {
    const a = corners[k], b = corners[(k + 1) % 4], e = edges[k];
    const dir = [(b[0] - a[0]), (b[1] - a[1])], len = Math.hypot(dir[0], dir[1]);
    const u = [dir[0] / len, dir[1] / len], inn = inward[k];
    const prev = edges[(k + 3) % 4], prevN = prev ? prev.n : 1;
    const n = e ? e.n : 1;
    // corner point: inset by this edge's first depth and the previous edge's last depth
    const d0 = depthAt(e, 0), dPrev = depthAt(prev, prevN - 1);
    const innPrev = inward[(k + 3) % 4];
    pts.push([a[0] + inn[0] * d0 + innPrev[0] * dPrev, a[1] + inn[1] * d0 + innPrev[1] * dPrev]);
    for (let i = 1; i < n; i++) {
      const at = len * i / n, d1 = depthAt(e, i - 1), d2 = depthAt(e, i);
      if (d1 === d2) continue;
      const base = [a[0] + u[0] * at, a[1] + u[1] * at];
      pts.push([base[0] + inn[0] * d1, base[1] + inn[1] * d1], [base[0] + inn[0] * d2, base[1] + inn[1] * d2]);
    }
  }
  return pts;
}

// Grow a counter-clockwise rectilinear outline outward by r (half the kerf).
export function offsetRectilinear(pts, r) {
  if (!r) return pts.map((p) => p.slice());
  const n = pts.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const e1 = [p1[0] - p0[0], p1[1] - p0[1]], e2 = [p2[0] - p1[0], p2[1] - p1[1]];
    const l1 = Math.hypot(e1[0], e1[1]) || 1, l2 = Math.hypot(e2[0], e2[1]) || 1;
    // outward normal of a CCW edge (dx, dy) is (dy, −dx)
    const n1 = [e1[1] / l1, -e1[0] / l1], n2 = [e2[1] / l2, -e2[0] / l2];
    out.push([p1[0] + r * (n1[0] + n2[0]), p1[1] + r * (n1[1] + n2[1])]);
  }
  return out;
}

export function computeTray(opts = {}) {
  const t = clamp(Number(opts.thickness) || 3, 0.5, 12);
  const w = clamp(Number(opts.width) || 120, 6 * t, 400);
  const d = clamp(Number(opts.depth) || 80, 6 * t, 400);
  const h = clamp(Number(opts.height) || 40, 4 * t, 300);
  const finger = clamp(Number(opts.finger) || 12, 2 * t, 60);
  const kerf = clamp(Number(opts.kerf) || 0, 0, 1);
  const nW = fingerCount(w, finger), nD = fingerCount(d, finger), nH = fingerCount(h, finger);
  const notch = (n) => ({ n, endsNotched: true }), full = (n) => ({ n, endsNotched: false });
  const panels = [
    { name: 'Base', W: w, H: d, edges: [notch(nW), notch(nD), notch(nW), notch(nD)] },
    { name: 'Front', W: w, H: h, edges: [full(nW), full(nH), null, full(nH)] },
    { name: 'Back', W: w, H: h, edges: [full(nW), full(nH), null, full(nH)] },
    { name: 'Left side', W: d, H: h, edges: [full(nD), notch(nH), null, notch(nH)] },
    { name: 'Right side', W: d, H: h, edges: [full(nD), notch(nH), null, notch(nH)] }
  ];
  const pieces = panels.map((pa, index) => {
    const loop = offsetRectilinear(fingerPanel(pa.W, pa.H, t, pa.edges), kerf / 2);
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const [u, v] of loop) { u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    return {
      name: pa.name, kind: 'panel', index, loops: [loop], outerCount: 1,
      bbox: { u0, u1, v0, v1, w: u1 - u0, h: v1 - v0 },
      label: { u: pa.W / 2, v: pa.H / 2, size: clamp(Math.min(pa.W, pa.H) / 6, 3, 7) },
      slotLabels: [], size: [pa.W, pa.H]
    };
  });
  return {
    thickness: t, kerf, finger, counts: { w: nW, d: nD, h: nH },
    size: { w, d, h }, inside: { w: w - 2 * t, d: d - 2 * t, h: h - t },
    fingerSize: { w: w / nW, d: d / nD, h: h / nH }, pieces
  };
}

export function traySheets(tray, layout, { style = 'print', title = 'Flat-pack tray' } = {}) {
  const sub = `Board ${f2(tray.thickness)} mm · outside ${f2(tray.size.w)} × ${f2(tray.size.d)} × ${f2(tray.size.h)} mm · inside ${f2(tray.inside.w)} × ${f2(tray.inside.d)} mm` +
    (tray.kerf ? ` · outlines grown by half the ${f2(tray.kerf)} mm kerf` : ' · no kerf (knife)');
  const legend = 'Cut the solid lines. Tabs (fingers) on one panel fill the notches of the next. Fit the walls onto the base, then the corners. Glue only if it is loose.';
  return piecesSheets(layout, { style, title, subtitle: sub, legend });
}

export function netSheet(net, place, { style = 'print', title = 'Net' } = {}) {
  const s = styleFor(style);
  const { bbox } = net;
  const map = place.rotate
    ? ([x, y]) => [place.x + (y - bbox.y0) * place.scale, place.y + (x - bbox.x0) * place.scale]
    : ([x, y]) => [place.x + (x - bbox.x0) * place.scale, place.y + (bbox.y1 - y) * place.scale];
  const seg = (list) => list.map(([a, b]) => { const [x1, y1] = map(a), [x2, y2] = map(b); return `M${f2(x1)} ${f2(y1)}L${f2(x2)} ${f2(y2)}`; }).join('');
  const labels = net.faces.filter((f) => f.label).map((f) => {
    const [x, y] = map(f.centre);
    return `<text x="${f2(x)}" y="${f2(y)}" font-size="3.4" text-anchor="middle" dominant-baseline="middle" fill="${s.faint}">${esc(f.label)}</text>`;
  }).join('');
  const tabMarks = net.tabs.map((t) => {
    const [x, y] = map(centroid(t));
    return `<text x="${f2(x)}" y="${f2(y)}" font-size="2.4" text-anchor="middle" dominant-baseline="middle" fill="${s.faint}">glue</text>`;
  }).join('');
  const dims = Object.entries(net.params).map(([k, v]) => `${k} ${f2(v)}${k === 'sides' ? '' : ' mm'}`).join(' · ');
  const subtitle = `${NETS[net.type].name} · ${dims}` + (place.scale < 0.999 ? ` · shrunk to ${Math.round(place.scale * 100)}% to fit` : '');
  const legend = 'Cut the solid lines. Score the dashed lines with a ruler and an empty pen, then fold them. Each tab glues inside the edge it meets.';
  const inner = `<path d="${seg(net.cuts)}" ${s.cut}/><path d="${seg(net.folds)}" ${s.fold}/>` + labels + tabMarks;
  return sheetFrame(inner, { title, subtitle, pageNo: 1, pageCount: 1, style, legend });
}
