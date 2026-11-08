/* Path Studio geometry: the pure model behind the Vector Drawing Studio.
 * No DOM. Tested by tests/vector-geometry.test.mjs.
 *
 * Every object has a box { x, y, w, h, rotation } on the 640 × 480 artboard
 * (rotation in degrees about the box centre). Path geometry is stored in the
 * box's own frame as percentages (0..100), so resizing a box reshapes its path.
 *
 *   path      { subpaths: [{ closed, nodes: [{ p:[u,v], i:[u,v]|null, o:[u,v]|null, k }] }] }
 *             k = 'corner' (handles move freely) | 'smooth' (handles stay in line)
 *               | 'symmetric' (in line and equal length)
 *   rect      { radius }             corner radius in artboard px
 *   ellipse   {}
 *   polygon   { sides, star, inner } regular polygon or star stretched to the box
 *   text      { text, font, size, weight, tracking }
 *
 * Editing works in artboard ("world") space: worldSubpaths(o) gives the path
 * in world coordinates, the edit happens there, and withWorldSubpaths(o, subs)
 * writes it back with a box refitted tightly around the curves, so the box,
 * handles and inspector numbers always describe the real shape.
 */

export const BOARD = Object.freeze({ w: 640, h: 480 });
export const KAPPA = 0.5522847498307936;
export const SHAPE_TYPES = ['rect', 'ellipse', 'polygon', 'path'];
export const TYPES = [...SHAPE_TYPES, 'text'];
export const FONTS = Object.freeze({
  sans: { label: 'Sans', css: "'Helvetica Neue', Arial, sans-serif" },
  serif: { label: 'Serif', css: "Georgia, 'Times New Roman', serif" },
  slab: { label: 'Slab', css: "Rockwell, 'Roboto Slab', 'Courier New', serif" },
  mono: { label: 'Mono', css: "Menlo, Consolas, 'Courier New', monospace" },
  display: { label: 'Display', css: "Impact, 'Arial Black', sans-serif" },
});
const RAD = Math.PI / 180;

/* ── vectors ─────────────────────────────────────────────── */
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, s) => [a[0] * s, a[1] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = (a) => Math.hypot(a[0], a[1]);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const norm = (a) => { const l = len(a); return l > 1e-12 ? [a[0] / l, a[1] / l] : [0, 0]; };
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
export const vec = { add, sub, mul, dot, len, dist, norm, lerp };

export function rotate(p, c, deg) {
  if (!deg) return [p[0], p[1]];
  const a = deg * RAD, cs = Math.cos(a), sn = Math.sin(a), dx = p[0] - c[0], dy = p[1] - c[1];
  return [c[0] + dx * cs - dy * sn, c[1] + dx * sn + dy * cs];
}
export const normAngle = (deg) => { let a = ((deg % 360) + 360) % 360; if (a > 180) a -= 360; return Math.abs(a) < 1e-9 ? 0 : a; };
export const centerOf = (o) => [o.x + o.w / 2, o.y + o.h / 2];
export const toWorld = (o, [u, v]) => rotate([o.x + u / 100 * o.w, o.y + v / 100 * o.h], centerOf(o), o.rotation || 0);
export function toLocal(o, p) {
  const q = rotate(p, centerOf(o), -(o.rotation || 0));
  return [(q[0] - o.x) / o.w * 100, (q[1] - o.y) / o.h * 100];
}

/* ── nodes and subpaths ──────────────────────────────────── */
export const node = (p, i = null, o = null, k = 'corner') => ({ p: [p[0], p[1]], i: i && [i[0], i[1]], o: o && [o[0], o[1]], k });
export const clone = (v) => JSON.parse(JSON.stringify(v));

/** Copy subpaths with fn applied to every anchor and handle. */
export function mapSubpaths(subs, fn) {
  return subs.map((s) => ({ closed: !!s.closed, nodes: s.nodes.map((n) => ({ p: fn(n.p), i: n.i && fn(n.i), o: n.o && fn(n.o), k: n.k })) }));
}

/** Segments of one subpath as cubics [a, c1, c2, b]; `line` when neither end has a handle. */
export function segmentsOf(s) {
  const n = s.nodes.length, out = [];
  const count = s.closed ? n : n - 1;
  for (let k = 0; k < count; k++) {
    const a = s.nodes[k], b = s.nodes[(k + 1) % n];
    out.push({ index: k, line: !a.o && !b.i, c: [a.p, a.o || a.p, b.i || b.p, b.p] });
  }
  return out;
}

/* ── live shapes as paths (percent space) ────────────────── */
export function shapeSubpaths(o) {
  if (o.type === 'path') return clone(o.subpaths);
  if (o.type === 'ellipse') {
    const K = 50 * KAPPA;
    return [{ closed: true, nodes: [
      node([50, 0], [50 - K, 0], [50 + K, 0], 'symmetric'),
      node([100, 50], [100, 50 - K], [100, 50 + K], 'symmetric'),
      node([50, 100], [50 + K, 100], [50 - K, 100], 'symmetric'),
      node([0, 50], [0, 50 + K], [0, 50 - K], 'symmetric'),
    ] }];
  }
  if (o.type === 'rect') {
    const r = Math.max(0, Math.min(o.radius || 0, o.w / 2, o.h / 2));
    if (r < 0.01) return [{ closed: true, nodes: [node([0, 0]), node([100, 0]), node([100, 100]), node([0, 100])] }];
    const rx = r / o.w * 100, ry = r / o.h * 100, kx = rx * KAPPA, ky = ry * KAPPA;
    return [{ closed: true, nodes: [
      node([rx, 0], [rx - kx, 0], null, 'smooth'),
      node([100 - rx, 0], null, [100 - rx + kx, 0], 'smooth'),
      node([100, ry], [100, ry - ky], null, 'smooth'),
      node([100, 100 - ry], null, [100, 100 - ry + ky], 'smooth'),
      node([100 - rx, 100], [100 - rx + kx, 100], null, 'smooth'),
      node([rx, 100], null, [rx - kx, 100], 'smooth'),
      node([0, 100 - ry], [0, 100 - ry + ky], null, 'smooth'),
      node([0, ry], null, [0, ry - ky], 'smooth'),
    ] }];
  }
  if (o.type === 'polygon') {
    const pts = polygonPoints(o.sides || 3, !!o.star, o.inner ?? 0.5);
    return [{ closed: true, nodes: pts.map((p) => node(p)) }];
  }
  return [];
}

/** Height ÷ width of an unstretched regular polygon or star (for drawing it at its true proportions). */
export function polygonAspect(sides, star = false, inner = 0.5) {
  const n = Math.max(3, Math.min(24, Math.round(sides))), m = star ? n * 2 : n, xs = [], ys = [];
  for (let k = 0; k < m; k++) {
    const a = (-90 + k * 360 / m) * RAD, r = star && k % 2 ? Math.max(0.05, Math.min(0.95, inner)) : 1;
    xs.push(Math.cos(a) * r); ys.push(Math.sin(a) * r);
  }
  return (Math.max(...ys) - Math.min(...ys)) / (Math.max(...xs) - Math.min(...xs));
}
/** A regular polygon or star, stretched so its outline fills the 0..100 box (apex at the top). */
export function polygonPoints(sides, star = false, inner = 0.5) {
  const n = Math.max(3, Math.min(24, Math.round(sides)));
  const m = star ? n * 2 : n, raw = [];
  for (let k = 0; k < m; k++) {
    const a = (-90 + k * 360 / m) * RAD, r = star && k % 2 ? Math.max(0.05, Math.min(0.95, inner)) : 1;
    raw.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const xs = raw.map((p) => p[0]), ys = raw.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  return raw.map(([x, y]) => [(x - x0) / (x1 - x0) * 100, (y - y0) / (y1 - y0) * 100]);
}

/* ── SVG path data ───────────────────────────────────────── */
const fmt = (n) => { const v = Math.round(n * 1000) / 1000; return Object.is(v, -0) ? '0' : String(v); };
/** Path data for subpaths after mapping each point through fn. */
export function pathData(subs, fn = (p) => p) {
  let d = '';
  for (const s of subs) {
    if (!s.nodes.length) continue;
    const P = (p) => { const q = fn(p); return `${fmt(q[0])} ${fmt(q[1])}`; };
    d += `${d ? ' ' : ''}M ${P(s.nodes[0].p)}`;
    for (const seg of segmentsOf(s)) d += seg.line ? ` L ${P(seg.c[3])}` : ` C ${P(seg.c[1])} ${P(seg.c[2])} ${P(seg.c[3])}`;
    if (s.closed) d += ' Z';
  }
  return d;
}
/** Path data in the box's own pixel frame (origin at the box's top-left, unrotated). */
export const localPathData = (o) => pathData(shapeSubpaths(o), ([u, v]) => [u / 100 * o.w, v / 100 * o.h]);
export const transformOf = (o) => `translate(${fmt(o.x)} ${fmt(o.y)})${o.rotation ? ` rotate(${fmt(o.rotation)} ${fmt(o.w / 2)} ${fmt(o.h / 2)})` : ''}`;

/* ── cubic maths ─────────────────────────────────────────── */
export function evalCubic([p0, p1, p2, p3], t) {
  const s = 1 - t, a = s * s * s, b = 3 * s * s * t, c = 3 * s * t * t, d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}
export function splitCubic([p0, p1, p2, p3], t) {
  const a = lerp(p0, p1, t), b = lerp(p1, p2, t), c = lerp(p2, p3, t);
  const d = lerp(a, b, t), e = lerp(b, c, t), f = lerp(d, e, t);
  return [[p0, a, d, f], [f, e, c, p3]];
}
function extremaT(a, b, c, d) {
  const A = -a + 3 * b - 3 * c + d, B = 2 * (a - 2 * b + c), C = b - a, out = [];
  if (Math.abs(A) < 1e-12) { if (Math.abs(B) > 1e-12) out.push(-C / B); }
  else {
    const disc = B * B - 4 * A * C;
    if (disc >= 0) { const r = Math.sqrt(disc); out.push((-B + r) / (2 * A), (-B - r) / (2 * A)); }
  }
  return out.filter((t) => t > 0 && t < 1);
}
export function cubicBounds(c) {
  const pts = [c[0], c[3]];
  for (const ax of [0, 1]) for (const t of extremaT(c[0][ax], c[1][ax], c[2][ax], c[3][ax])) pts.push(evalCubic(c, t));
  return boundsOfPoints(pts);
}
export function boundsOfPoints(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1 };
}
export function unionBounds(list) {
  const ok = list.filter(Boolean);
  if (!ok.length) return null;
  return { x0: Math.min(...ok.map((b) => b.x0)), y0: Math.min(...ok.map((b) => b.y0)), x1: Math.max(...ok.map((b) => b.x1)), y1: Math.max(...ok.map((b) => b.y1)) };
}
function subpathBounds(subs) {
  const parts = [];
  for (const s of subs) {
    if (s.nodes.length === 1) parts.push(boundsOfPoints([s.nodes[0].p]));
    for (const seg of segmentsOf(s)) parts.push(cubicBounds(seg.c));
  }
  return unionBounds(parts);
}

/* ── world space ─────────────────────────────────────────── */
export const worldSubpaths = (o) => mapSubpaths(shapeSubpaths(o), (p) => toWorld(o, p));

/** Tight artboard bounds of an object (curve extremes, not control points). */
export function objectBounds(o) {
  if (o.type === 'text') return boundsOfPoints([[0, 0], [100, 0], [100, 100], [0, 100]].map((p) => toWorld(o, p)));
  return subpathBounds(worldSubpaths(o)) || boundsOfPoints([[o.x, o.y]]);
}

/** Write world-space subpaths back into a path object whose box is refitted
 *  tightly around the curves, in the frame of `rotation` (default: o's). */
export function withWorldSubpaths(o, subs, rotation = o.rotation || 0) {
  const rot = normAngle(rotation);
  const framed = mapSubpaths(subs, (p) => rotate(p, [0, 0], -rot));
  const b = subpathBounds(framed) || { x0: 0, y0: 0, x1: 1, y1: 1 };
  const w = Math.max(1, b.x1 - b.x0), h = Math.max(1, b.y1 - b.y0);
  const c = rotate([(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2], [0, 0], rot);
  const box = { x: c[0] - w / 2, y: c[1] - h / 2, w, h, rotation: rot };
  const out = { ...o, ...box, type: 'path', subpaths: mapSubpaths(subs, (p) => toLocal(box, p)) };
  delete out.radius; delete out.sides; delete out.star; delete out.inner;
  return out;
}
export const toPath = (o) => (o.type === 'path' ? clone(o) : withWorldSubpaths(o, worldSubpaths(o)));

/* ── node editing (any space; the studio works in world space) ── */
const wrap = (s, k) => (s.closed ? s.nodes[(k + s.nodes.length) % s.nodes.length] : s.nodes[k]);

export function moveAnchor(s, idx, pt) {
  const n = s.nodes[idx], d = sub(pt, n.p);
  n.p = [pt[0], pt[1]]; if (n.i) n.i = add(n.i, d); if (n.o) n.o = add(n.o, d);
}
/** Move a handle; smooth nodes keep the opposite handle in line, symmetric ones mirror it. `free` breaks the pair. */
export function moveHandle(s, idx, which, pt, free = false) {
  const n = s.nodes[idx], other = which === 'i' ? 'o' : 'i';
  n[which] = [pt[0], pt[1]];
  if (free) { n.k = 'corner'; return; }
  if (n.k === 'symmetric') n[other] = sub(mul(n.p, 2), pt);
  else if (n.k === 'smooth' && n[other]) {
    const l = dist(n[other], n.p), dir = norm(sub(n.p, pt));
    if (len(dir)) n[other] = add(n.p, mul(dir, l));
  }
}
export function setNodeKind(s, idx, kind) {
  const n = s.nodes[idx];
  if (kind === 'corner') { n.i = null; n.o = null; n.k = 'corner'; return; }
  const prev = wrap(s, idx - 1), next = wrap(s, idx + 1);
  if (!n.i && !n.o) {
    const a = prev ? prev.p : n.p, b = next ? next.p : n.p;
    const dir = norm(sub(b, a));
    if (!len(dir)) { n.k = kind; return; }
    if (prev) n.i = sub(n.p, mul(dir, dist(n.p, prev.p) / 3));
    if (next) n.o = add(n.p, mul(dir, dist(n.p, next.p) / 3));
  } else if (n.i && n.o) {
    let dir = norm(sub(n.o, n.i));
    if (!len(dir)) dir = norm(sub(n.o, n.p));
    let li = dist(n.i, n.p), lo = dist(n.o, n.p);
    if (kind === 'symmetric') li = lo = (li + lo) / 2;
    n.i = sub(n.p, mul(dir, li)); n.o = add(n.p, mul(dir, lo));
  } else if (kind === 'symmetric') {
    const h = n.i || n.o, m = sub(mul(n.p, 2), h);
    if (n.i) n.o = m; else n.i = m;
  }
  n.k = kind;
}
/** Add an anchor on segment `seg` at t without changing the shape. Returns the new node's index. */
export function insertNode(s, seg, t) {
  const n = s.nodes.length, a = s.nodes[seg], b = s.nodes[(seg + 1) % n];
  const c = [a.p, a.o || a.p, b.i || b.p, b.p];
  let fresh;
  if (!a.o && !b.i) fresh = node(lerp(a.p, b.p, t));
  else {
    const [L, R] = splitCubic(c, t);
    if (a.o) a.o = L[1];
    if (b.i) b.i = R[2];
    fresh = node(L[3], L[2], R[1], 'smooth');
    if (!a.o) a.o = L[1];
    if (!b.i) b.i = R[2];
  }
  s.nodes.splice(seg + 1, 0, fresh);
  return seg + 1;
}
/** Remove an anchor. Returns false when the subpath would drop below two anchors. */
export function deleteNode(s, idx) {
  if (s.nodes.length <= 2) return false;
  s.nodes.splice(idx, 1);
  if (s.closed && s.nodes.length < 3) s.closed = false;
  return true;
}
/** Cut an open path at an anchor, or open a closed path there. Returns the new subpaths. */
export function breakAt(s, idx) {
  const n = s.nodes;
  if (s.closed) {
    const ring = [...n.slice(idx), ...n.slice(0, idx)].map(clone);
    const end = clone(n[idx]);
    end.o = null; ring[0].i = null; end.k = ring[0].k = 'corner';
    ring.push(end);
    return [{ closed: false, nodes: ring }];
  }
  if (idx <= 0 || idx >= n.length - 1) return [clone(s)];
  const a = n.slice(0, idx + 1).map(clone), b = n.slice(idx).map(clone);
  a[a.length - 1].o = null; b[0].i = null;
  return [{ closed: false, nodes: a }, { closed: false, nodes: b }];
}

/** Closest point on any segment to pt: { sub, seg, t, d, point }. */
export function nearestOnSubpaths(subs, pt) {
  let best = null;
  subs.forEach((s, si) => {
    for (const seg of segmentsOf(s)) {
      const N = 32;
      let bt = 0, bd = Infinity;
      for (let k = 0; k <= N; k++) { const t = k / N, d = dist(evalCubic(seg.c, t), pt); if (d < bd) { bd = d; bt = t; } }
      let lo = Math.max(0, bt - 1 / N), hi = Math.min(1, bt + 1 / N);
      for (let k = 0; k < 30; k++) {
        const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
        if (dist(evalCubic(seg.c, m1), pt) < dist(evalCubic(seg.c, m2), pt)) hi = m2; else lo = m1;
      }
      const t = (lo + hi) / 2, point = evalCubic(seg.c, t), d = dist(point, pt);
      if (!best || d < best.d) best = { sub: si, seg: seg.index, t, d, point };
    }
  });
  return best;
}

/* ── flattening (for booleans and hit tests) ─────────────── */
function flatten(c, tol, out, depth = 0) {
  const [p0, p1, p2, p3] = c, chord = sub(p3, p0), L = len(chord);
  const off = (p) => (L < 1e-9 ? dist(p, p0) : Math.abs((p[0] - p0[0]) * chord[1] - (p[1] - p0[1]) * chord[0]) / L);
  if (depth > 18 || Math.max(off(p1), off(p2)) <= tol) { out.push(p3); return; }
  const [a, b] = splitCubic(c, 0.5);
  flatten(a, tol, out, depth + 1); flatten(b, tol, out, depth + 1);
}
/** Polylines for each subpath in the given subpaths (tol in the same units). */
export function flattenSubpaths(subs, tol = 0.2) {
  return subs.filter((s) => s.nodes.length).map((s) => {
    const pts = [s.nodes[0].p];
    for (const seg of segmentsOf(s)) { if (seg.line) pts.push(seg.c[3]); else flatten(seg.c, tol, pts); }
    if (s.closed && pts.length > 1 && dist(pts[0], pts[pts.length - 1]) < 1e-9) pts.pop();
    return { closed: s.closed, points: pts };
  });
}
export function polygonArea(pts) {
  let a = 0;
  for (let k = 0; k < pts.length; k++) { const p = pts[k], q = pts[(k + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return a / 2;
}

/* ── curve fitting (Schneider, Graphics Gems 1990) ───────── */
const bez = (c, t) => evalCubic(c, t);
function bezD1(c, t) {
  const s = 1 - t;
  return add(add(mul(sub(c[1], c[0]), 3 * s * s), mul(sub(c[2], c[1]), 6 * s * t)), mul(sub(c[3], c[2]), 3 * t * t));
}
function bezD2(c, t) {
  return add(mul(add(sub(c[2], mul(c[1], 2)), c[0]), 6 * (1 - t)), mul(add(sub(c[3], mul(c[2], 2)), c[1]), 6 * t));
}
function chordParams(pts) {
  const u = [0];
  for (let k = 1; k < pts.length; k++) u.push(u[k - 1] + dist(pts[k], pts[k - 1]));
  const T = u[u.length - 1] || 1;
  return u.map((v) => v / T);
}
function generate(pts, u, t1, t2) {
  const p0 = pts[0], p3 = pts[pts.length - 1];
  let c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
  for (let k = 0; k < pts.length; k++) {
    const t = u[k], s = 1 - t, b0 = s * s * s, b1 = 3 * s * s * t, b2 = 3 * s * t * t, b3 = t * t * t;
    const A1 = mul(t1, b1), A2 = mul(t2, b2);
    c00 += dot(A1, A1); c01 += dot(A1, A2); c11 += dot(A2, A2);
    const tmp = sub(pts[k], add(mul(p0, b0 + b1), mul(p3, b2 + b3)));
    x0 += dot(A1, tmp); x1 += dot(A2, tmp);
  }
  const det = c00 * c11 - c01 * c01;
  let a1 = det ? (x0 * c11 - x1 * c01) / det : 0, a2 = det ? (c00 * x1 - c01 * x0) / det : 0;
  const segLen = dist(p0, p3), eps = 1e-6 * segLen;
  if (!det || a1 < eps || a2 < eps || a1 > segLen * 3 || a2 > segLen * 3) a1 = a2 = segLen / 3;
  return [p0, add(p0, mul(t1, a1)), add(p3, mul(t2, a2)), p3];
}
function maxError(pts, c, u) {
  let max = 0, at = Math.floor(pts.length / 2);
  for (let k = 1; k < pts.length - 1; k++) { const d = dist(bez(c, u[k]), pts[k]); if (d > max) { max = d; at = k; } }
  return [max, at];
}
function reparam(pts, c, u) {
  return u.map((t, k) => {
    const d = sub(bez(c, t), pts[k]), d1 = bezD1(c, t), d2 = bezD2(c, t);
    const den = dot(d1, d1) + dot(d, d2);
    const nt = den ? t - dot(d, d1) / den : t;
    return Math.max(0, Math.min(1, nt));
  });
}
function fitRun(pts, t1, t2, tol, out, depth = 0) {
  if (pts.length === 2 || depth > 12) {
    const d = dist(pts[0], pts[pts.length - 1]) / 3;
    out.push({ c: [pts[0], add(pts[0], mul(t1, d)), add(pts[pts.length - 1], mul(t2, d)), pts[pts.length - 1]], smoothEnd: false });
    return;
  }
  let u = chordParams(pts), c = generate(pts, u, t1, t2), [err, at] = maxError(pts, c, u);
  if (err <= tol) { out.push({ c }); return; }
  if (err <= tol * 6) {
    for (let k = 0; k < 8; k++) {
      u = reparam(pts, c, u); c = generate(pts, u, t1, t2); [err, at] = maxError(pts, c, u);
      if (err <= tol) { out.push({ c }); return; }
    }
  }
  at = Math.max(1, Math.min(pts.length - 2, at));
  const tc = norm(sub(pts[at - 1], pts[at + 1]));
  fitRun(pts.slice(0, at + 1), t1, tc, tol, out, depth + 1);
  out[out.length - 1].smoothEnd = true;
  fitRun(pts.slice(at), mul(tc, -1), t2, tol, out, depth + 1);
}
function isStraight(pts, tol) {
  const a = pts[0], b = pts[pts.length - 1], L = dist(a, b);
  if (L < 1e-9) return false;
  return pts.every((p) => Math.abs((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) / L <= tol);
}
function dedupe(pts, eps) {
  const out = [];
  for (const p of pts) if (!out.length || dist(out[out.length - 1], p) > eps) out.push(p);
  while (out.length > 1 && dist(out[0], out[out.length - 1]) <= eps) out.pop();
  return out;
}
/** Fit a closed polygon with as few cubic segments as stay within tol.
 *  Sharp turns (> cornerDeg) stay corners; straight runs stay straight lines. */
export function fitClosed(points, tol = 0.35, cornerDeg = 32) {
  const pts = dedupe(points, 1e-3), n = pts.length;
  if (n < 3) return null;
  const turn = (k) => {
    const a = norm(sub(pts[k], pts[(k - 1 + n) % n])), b = norm(sub(pts[(k + 1) % n], pts[k]));
    return Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) / RAD;
  };
  let corners = [];
  for (let k = 0; k < n; k++) if (turn(k) > cornerDeg) corners.push(k);
  const smoothBreaks = !corners.length;
  if (smoothBreaks) {
    // A ring with no corners (a circle): break it at four points spread by length.
    const u = chordParams([...pts, pts[0]]);
    corners = [0, 0.25, 0.5, 0.75].map((f) => u.findIndex((v) => v >= f)).filter((k, i, a) => k >= 0 && k < n && a.indexOf(k) === i);
  }
  const centred = (k) => norm(sub(pts[(k + 1) % n], pts[(k - 1 + n) % n]));
  const all = [];
  for (let c = 0; c < corners.length; c++) {
    const a = corners[c], b = corners[(c + 1) % corners.length];
    const run = [];
    for (let k = a; ; k = (k + 1) % n) { run.push(pts[k]); if (k === b && run.length > 1) break; }
    const segs = [];
    if (run.length === 2 || isStraight(run, tol * 0.5)) segs.push({ c: [run[0], run[0], run[run.length - 1], run[run.length - 1]], line: true });
    else {
      const t1 = smoothBreaks ? centred(a) : norm(sub(run[1], run[0]));
      const t2 = smoothBreaks ? mul(centred(b), -1) : norm(sub(run[run.length - 2], run[run.length - 1]));
      fitRun(run, t1, t2, tol, segs);
    }
    // A run starts at a corner (or a smooth break on a ring with none); joints inside a run are smooth.
    segs.forEach((sg, j) => all.push({ ...sg, start: j === 0 && !smoothBreaks ? 'corner' : 'smooth' }));
  }
  const N = all.length;
  const nodes = all.map((sg, k) => {
    const prev = all[(k - 1 + N) % N];
    let i = prev.line ? null : prev.c[2], o = sg.line ? null : sg.c[1];
    if (i && dist(i, sg.c[0]) < 1e-6) i = null;
    if (o && dist(o, sg.c[0]) < 1e-6) o = null;
    return node(sg.c[0], i, o, sg.start === 'smooth' && (i || o) ? 'smooth' : 'corner');
  });
  return { closed: true, nodes };
}

/* ── selection maths: align, distribute, transforms ──────── */
export const boxSize = (b) => ({ w: b.x1 - b.x0, h: b.y1 - b.y0 });
/** Offsets [dx, dy] that align each bounds box to target. */
export function alignDeltas(boxes, mode, target) {
  return boxes.map((b) => {
    switch (mode) {
      case 'left': return [target.x0 - b.x0, 0];
      case 'right': return [target.x1 - b.x1, 0];
      case 'hcenter': return [(target.x0 + target.x1) / 2 - (b.x0 + b.x1) / 2, 0];
      case 'top': return [0, target.y0 - b.y0];
      case 'bottom': return [0, target.y1 - b.y1];
      case 'vcenter': return [0, (target.y0 + target.y1) / 2 - (b.y0 + b.y1) / 2];
      default: return [0, 0];
    }
  });
}
/** Equal gaps between boxes along an axis ('x' | 'y'); the outermost two stay put. */
export function distributeDeltas(boxes, axis) {
  const lo = axis === 'x' ? 'x0' : 'y0', hi = axis === 'x' ? 'x1' : 'y1';
  const order = boxes.map((b, k) => k).sort((a, b) => (boxes[a][lo] + boxes[a][hi]) - (boxes[b][lo] + boxes[b][hi]));
  const out = boxes.map(() => [0, 0]);
  if (boxes.length < 3) return out;
  const first = boxes[order[0]], last = boxes[order[order.length - 1]];
  const total = boxes.reduce((s, b) => s + b[hi] - b[lo], 0);
  const gap = (last[hi] - first[lo] - total) / (boxes.length - 1);
  let at = first[lo];
  for (const k of order) {
    const d = at - boxes[k][lo];
    out[k] = axis === 'x' ? [d, 0] : [0, d];
    at += boxes[k][hi] - boxes[k][lo] + gap;
  }
  return out;
}
export function translate(o, dx, dy) { return { ...o, x: o.x + dx, y: o.y + dy }; }
export function rotateAbout(o, pivot, deg) {
  const c = centerOf(o), c2 = rotate(c, pivot, deg);
  return { ...o, x: o.x + c2[0] - c[0], y: o.y + c2[1] - c[1], rotation: normAngle((o.rotation || 0) + deg) };
}
/** Scale about an artboard point. Exact for unrotated objects and paths; rotated
 *  live shapes and text keep their proportions under a non-uniform stretch. */
export function scaleAbout(o, origin, sx, sy) {
  sx = Math.max(1e-3, sx); sy = Math.max(1e-3, sy);
  const rot = normAngle(o.rotation || 0), map = (p) => [origin[0] + (p[0] - origin[0]) * sx, origin[1] + (p[1] - origin[1]) * sy];
  const quarter = Math.abs(Math.abs(rot) - 90) < 1e-6, aligned = Math.abs(rot) < 1e-6 || Math.abs(Math.abs(rot) - 180) < 1e-6;
  const uniform = Math.abs(sx - sy) < 1e-9;
  if (o.type === 'path' && !aligned && !quarter && !uniform) return withWorldSubpaths(o, mapSubpaths(worldSubpaths(o), map), rot);
  let kx = sx, ky = sy;
  if (quarter) [kx, ky] = [sy, sx];
  else if (!aligned) kx = ky = Math.sqrt(sx * sy);
  const c = map(centerOf(o)), w = Math.max(1, o.w * kx), h = Math.max(1, o.h * ky);
  const out = { ...o, x: c[0] - w / 2, y: c[1] - h / 2, w, h };
  if (o.type === 'text') out.size = Math.max(4, Math.min(400, o.size * Math.sqrt(kx * ky)));
  if (o.type === 'rect' && o.radius) out.radius = o.radius * Math.min(kx, ky);
  return out;
}
/** Mirror across a vertical ('x') or horizontal ('y') line through `about`. */
export function flip(o, axis, about) {
  const m = axis === 'x' ? (p) => [2 * about[0] - p[0], p[1]] : (p) => [p[0], 2 * about[1] - p[1]];
  if (o.type === 'text') return o;
  const out = withWorldSubpaths(o, mapSubpaths(worldSubpaths(o), m), -(o.rotation || 0));
  for (const s of out.subpaths) s.nodes.reverse().forEach((n) => { const t = n.i; n.i = n.o; n.o = t; });
  return out;
}

/* ── project files ───────────────────────────────────────── */
export const MISSIONS = ['shapes', 'curve', 'combine', 'arrange', 'export'];
const isColor = (v) => v === 'none' || /^#[0-9a-f]{6}$/i.test(v);
const finite = (v, max = 100000) => Number.isFinite(v) && Math.abs(v) <= max;
const pt = (p) => Array.isArray(p) && p.length === 2 && p.every((n) => finite(n));

/** Turn a version-1 object (fixed curve / straight-only pen / triangle) into the current model. */
export function migrateV1(o) {
  const base = { id: o.id, name: o.name, x: o.x, y: o.y, w: o.w, h: o.h, rotation: o.rotation, fill: o.fill, stroke: o.stroke, strokeWidth: o.strokeWidth, opacity: o.opacity, visible: o.visible };
  if (o.type === 'rect') return { ...base, type: 'rect', radius: 0 };
  if (o.type === 'ellipse') return { ...base, type: 'ellipse' };
  if (o.type === 'polygon') return { ...base, type: 'polygon', sides: 3, star: false, inner: 0.5 };
  if (o.type === 'curve' && Array.isArray(o.points) && o.points.length === 4) {
    const [a, c1, c2, b] = o.points;
    return { ...base, type: 'path', subpaths: [{ closed: !!o.closed, nodes: [node(a, null, c1), node(b, c2, null)] }] };
  }
  if (o.type === 'pen' && Array.isArray(o.points)) return { ...base, type: 'path', subpaths: [{ closed: !!o.closed, nodes: o.points.map((p) => node(p)) }] };
  if (o.type === 'text') return { ...base, type: 'text', text: o.text, font: 'sans', size: Math.max(8, Math.min(200, o.h)), weight: 800, tracking: 0 };
  throw Error('Unknown object');
}

/** Validate a saved project (v1 or v2). Only the studio's own data survives: never markup. */
export function validateProject(data) {
  if (!data || (data.version !== 1 && data.version !== 2) || !Array.isArray(data.objects) || data.objects.length > 400) throw Error('Unsupported project');
  const ids = new Set();
  const objects = data.objects.map((raw) => {
    if (!raw || typeof raw !== 'object') throw Error('Invalid object');
    const o = data.version === 1 ? migrateV1(raw) : raw;
    if (!TYPES.includes(o.type) || !Number.isSafeInteger(o.id) || o.id < 1 || ids.has(o.id)) throw Error('Invalid object');
    if (typeof o.name !== 'string' || o.name.length > 100 || !isColor(o.fill) || !isColor(o.stroke) || typeof o.visible !== 'boolean') throw Error('Invalid object');
    ids.add(o.id);
    for (const k of ['x', 'y', 'w', 'h', 'rotation', 'strokeWidth', 'opacity']) if (!finite(o[k], 10000)) throw Error('Invalid dimensions');
    if (o.w <= 0 || o.h <= 0 || o.opacity < 0 || o.opacity > 100 || o.strokeWidth < 0 || o.strokeWidth > 40) throw Error('Invalid properties');
    const clean = { id: o.id, type: o.type, name: o.name, x: o.x, y: o.y, w: o.w, h: o.h, rotation: o.rotation, fill: o.fill, stroke: o.stroke, strokeWidth: o.strokeWidth, opacity: o.opacity, visible: o.visible, locked: o.locked === true };
    if (o.group != null) { if (!Number.isSafeInteger(o.group) || o.group < 1) throw Error('Invalid group'); clean.group = o.group; }
    if (o.type === 'rect') clean.radius = finite(o.radius, 10000) && o.radius > 0 ? o.radius : 0;
    if (o.type === 'polygon') {
      if (!Number.isInteger(o.sides) || o.sides < 3 || o.sides > 24) throw Error('Invalid polygon');
      clean.sides = o.sides; clean.star = o.star === true; clean.inner = finite(o.inner, 1) && o.inner >= 0.05 ? o.inner : 0.5;
    }
    if (o.type === 'path') {
      if (!Array.isArray(o.subpaths) || !o.subpaths.length || o.subpaths.length > 300) throw Error('Invalid path');
      let total = 0;
      clean.subpaths = o.subpaths.map((s) => {
        if (!s || !Array.isArray(s.nodes) || s.nodes.length < 1) throw Error('Invalid path');
        total += s.nodes.length;
        return { closed: s.closed === true, nodes: s.nodes.map((n) => {
          if (!n || !pt(n.p) || (n.i != null && !pt(n.i)) || (n.o != null && !pt(n.o))) throw Error('Invalid node');
          return node(n.p, n.i ?? null, n.o ?? null, ['corner', 'smooth', 'symmetric'].includes(n.k) ? n.k : 'corner');
        }) };
      });
      if (total > 6000) throw Error('Path too complex');
    }
    if (o.type === 'text') {
      if (typeof o.text !== 'string' || o.text.length > 120) throw Error('Invalid text');
      clean.text = o.text; clean.font = Object.hasOwn(FONTS, o.font) ? o.font : 'sans';
      clean.size = finite(o.size, 400) && o.size >= 4 ? o.size : 32;
      clean.weight = [300, 400, 700, 900].includes(o.weight) ? o.weight : (o.weight >= 600 ? 700 : 400);
      clean.tracking = finite(o.tracking, 50) ? o.tracking : 0;
    }
    return clean;
  });
  const missions = Object.fromEntries(MISSIONS.map((k) => [k, data.missions?.[k] === true]));
  return { objects, missions, notes: typeof data.notes === 'string' ? data.notes.slice(0, 20000) : '' };
}
