// What is a 3D model? — pure mesh model for the lesson's Mesh Inspector (no DOM, no Three.js).
//
// A mesh is { v: [[x, y, z], ...], f: [[i, j, k, ...], ...] } in millimetres, Z up (the way CAD
// apps and slicers see it). Each face lists its corners counter-clockwise when you look at it
// from outside, so the right-hand rule gives the outward normal.
//
// analyze() is the "watertight check": every edge must be shared by exactly two faces, every
// face must agree with its neighbours about which side is outside, and no two corners may sit
// almost on top of each other (a gap). The repair tools (flip, delete, fill, weld) are the same
// four moves real repair tools make.

export const GAP_TOLERANCE = 4;       // mm: corners closer than this but not shared are a gap
export const PLA_DENSITY = 1.24;      // g/cm³, typical datasheet value for PLA

/* ── Shapes ───────────────────────────────────────────────────────── */

// Extrude a 2-D polygon (counter-clockwise seen from above) up by h.
function prism(pts, h) {
  const n = pts.length;
  const v = [...pts.map(([x, y]) => [x, y, 0]), ...pts.map(([x, y]) => [x, y, h])];
  const f = [pts.map((_, i) => n - 1 - i), pts.map((_, i) => n + i)];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    f.push([i, j, n + j, n + i]);
  }
  return { v, f };
}

// Lay a prism on its side: its profile stands in the x–z plane and it runs along y.
// (u, v, w) → (u, depth/2 − w, v) keeps the faces' winding (determinant +1).
function onSide(mesh, depth) {
  return { v: mesh.v.map(([u, v, w]) => [u, depth / 2 - w, v]), f: mesh.f };
}

function triangulate(mesh) {
  const f = [];
  for (const face of mesh.f) for (let i = 1; i < face.length - 1; i++) f.push([face[0], face[i], face[i + 1]]);
  return { v: mesh.v.map(p => p.slice()), f };
}

const SQUARE = [[-10, -10], [10, -10], [10, 10], [-10, 10]];

export const SHAPES = {
  cube: {
    label: 'Cube, 20 mm',
    note: 'Six square faces. The simplest closed solid to count.',
    build: () => prism(SQUARE, 20)
  },
  tricube: {
    label: 'Cube as triangles (what an STL stores)',
    note: 'The same cube cut into 12 triangles, the way an STL or a game engine stores it.',
    build: () => triangulate(prism(SQUARE, 20))
  },
  pyramid: {
    label: 'Square pyramid',
    note: 'Four triangles leaning on a square base.',
    build: () => ({
      v: [[-10, -10, 0], [10, -10, 0], [10, 10, 0], [-10, 10, 0], [0, 0, 18]],
      f: [[0, 3, 2, 1], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]]
    })
  },
  house: {
    label: 'House (pentagonal prism)',
    note: 'A five-sided profile pushed back 20 mm: two pentagons and five rectangles.',
    build: () => onSide(prism([[-10, 0], [10, 0], [10, 14], [0, 24], [-10, 14]], 20), 20)
  },
  octahedron: {
    label: 'Octahedron',
    note: 'Eight triangles, like a d8 die.',
    build: () => {
      const r = 12, c = 12;
      return {
        v: [[r, 0, c], [-r, 0, c], [0, r, c], [0, -r, c], [0, 0, c + r], [0, 0, c - r]],
        f: [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]]
      };
    }
  },
  bracket: {
    label: 'L-bracket',
    note: 'A shelf bracket: an L-shaped profile pushed back 16 mm. Not every solid is convex.',
    build: () => onSide(prism([[-12, 0], [12, 0], [12, 6], [-6, 6], [-6, 24], [-12, 24]], 16), 16)
  },
  frame: {
    label: 'Picture frame (has a hole through it)',
    note: 'A square ring. It is closed, but it has a tunnel, so V − E + F is not 2.',
    build: () => {
      const outer = [[-12, -12], [12, -12], [12, 12], [-12, 12]];
      const inner = [[-5, -5], [5, -5], [5, 5], [-5, 5]];
      const h = 8;
      const v = [
        ...outer.map(([x, y]) => [x, y, 0]), ...outer.map(([x, y]) => [x, y, h]),
        ...inner.map(([x, y]) => [x, y, 0]), ...inner.map(([x, y]) => [x, y, h])
      ];
      const f = [];
      for (let k = 0; k < 4; k++) {
        const k1 = (k + 1) % 4;
        f.push([k, k1, 4 + k1, 4 + k]);              // outside wall
        f.push([8 + k, 12 + k, 12 + k1, 8 + k1]);    // wall of the hole (faces the hole)
        f.push([4 + k, 4 + k1, 12 + k1, 12 + k]);    // top ring
        f.push([k, 8 + k, 8 + k1, k1]);              // bottom ring
      }
      return { v, f };
    }
  }
};

export function buildShape(id) {
  const m = SHAPES[id].build();
  return { v: m.v.map(p => p.slice()), f: m.f.map(face => face.slice()) };
}

export function cloneMesh(m) {
  return { v: m.v.map(p => p.slice()), f: m.f.map(face => face.slice()) };
}

/* ── Vector helpers ──────────────────────────────────────────────── */

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = a => Math.hypot(a[0], a[1], a[2]);
export const dist = (a, b) => len(sub(a, b));

// Newell's method: robust normal for any polygon, length = 2 × area.
function newell(m, face) {
  const n = [0, 0, 0];
  for (let i = 0; i < face.length; i++) {
    const a = m.v[face[i]], b = m.v[face[(i + 1) % face.length]];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]);
    n[1] += (a[2] - b[2]) * (a[0] + b[0]);
    n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return n;
}

export function faceNormal(m, fi) {
  const n = newell(m, m.f[fi]);
  const l = len(n) || 1;
  return scale(n, 1 / l);
}

export function faceArea(m, fi) {
  return len(newell(m, m.f[fi])) / 2;
}

export function faceCentroid(m, fi) {
  const face = m.f[fi];
  let c = [0, 0, 0];
  for (const i of face) c = add(c, m.v[i]);
  return scale(c, 1 / face.length);
}

/* ── Topology ────────────────────────────────────────────────────── */

export const edgeKey = (a, b) => (a < b ? a + '|' + b : b + '|' + a);

// Every undirected edge with the faces that use it and the direction each face walks it.
export function edgesOf(m) {
  const map = new Map();
  m.f.forEach((face, fi) => {
    for (let i = 0; i < face.length; i++) {
      const a = face[i], b = face[(i + 1) % face.length];
      if (a === b) continue;
      const key = edgeKey(a, b);
      let e = map.get(key);
      if (!e) { e = { key, a: Math.min(a, b), b: Math.max(a, b), faces: [], from: [] }; map.set(key, e); }
      e.faces.push(fi);
      e.from.push(a);          // which end this face starts the edge from
    }
  });
  return map;
}

export function usedVertices(m) {
  const used = new Set();
  for (const face of m.f) for (const i of face) used.add(i);
  return [...used].sort((x, y) => x - y);
}

// Signed volume of one face's cone to `o` (sum over a closed, outward mesh = its volume).
function faceVolume(m, fi, o) {
  const face = m.f[fi];
  let vol = 0;
  const p0 = sub(m.v[face[0]], o);
  for (let i = 1; i < face.length - 1; i++) {
    vol += dot(p0, cross(sub(m.v[face[i]], o), sub(m.v[face[i + 1]], o))) / 6;
  }
  return vol;
}

// Which faces point the wrong way? Walk across shared edges: two neighbours agree when they
// walk their shared edge in opposite directions. Each connected piece then takes the side
// that gives it positive volume as "outside", and the faces that disagree are flipped.
export function findFlipped(m, edges = edgesOf(m)) {
  const F = m.f.length;
  const parity = new Array(F).fill(-1);
  const adj = Array.from({ length: F }, () => []);
  for (const e of edges.values()) {
    if (e.faces.length !== 2) continue;
    const [f1, f2] = e.faces;
    if (f1 === f2) continue;
    const same = e.from[0] === e.from[1];          // same direction → they disagree
    adj[f1].push([f2, same ? 1 : 0]);
    adj[f2].push([f1, same ? 1 : 0]);
  }
  const flipped = [];
  for (let s = 0; s < F; s++) {
    if (parity[s] !== -1) continue;
    const comp = [s];
    parity[s] = 0;
    for (let q = 0; q < comp.length; q++) {
      const fi = comp[q];
      for (const [nb, rel] of adj[fi]) {
        if (parity[nb] === -1) { parity[nb] = parity[fi] ^ rel; comp.push(nb); }
      }
    }
    if (comp.length < 2) continue;
    // centre of this piece, so an open piece still gets a sensible sign
    let c = [0, 0, 0], n = 0;
    for (const fi of comp) for (const i of m.f[fi]) { c = add(c, m.v[i]); n++; }
    c = scale(c, 1 / n);
    let vol = 0, area0 = 0, area1 = 0;
    for (const fi of comp) {
      const sign = parity[fi] ? -1 : 1;
      vol += sign * faceVolume(m, fi, c);
      if (parity[fi]) area1 += faceArea(m, fi); else area0 += faceArea(m, fi);
    }
    let bad = 1;
    if (vol < -1e-6) bad = 0;
    else if (Math.abs(vol) <= 1e-6 && area1 > area0) bad = 0;
    for (const fi of comp) if (parity[fi] === bad) flipped.push(fi);
  }
  return flipped.sort((x, y) => x - y);
}

// Pairs of corners that sit almost on top of each other but are separate vertices.
export function findGaps(m, tol = GAP_TOLERANCE) {
  const used = usedVertices(m);
  const pairs = [];
  for (let i = 0; i < used.length; i++) {
    for (let j = i + 1; j < used.length; j++) {
      if (dist(m.v[used[i]], m.v[used[j]]) < tol) pairs.push([used[i], used[j]]);
    }
  }
  return pairs;
}

export function analyze(m) {
  const edges = edgesOf(m);
  const used = usedVertices(m);
  const open = [], nonManifold = [];
  for (const e of edges.values()) {
    if (e.faces.length === 1) open.push(e.key);
    else if (e.faces.length > 2) nonManifold.push(e.key);
  }
  const flipped = findFlipped(m, edges);
  const gaps = findGaps(m);
  const V = used.length, E = edges.size, F = m.f.length;
  const triangles = m.f.reduce((s, face) => s + Math.max(0, face.length - 2), 0);
  const watertight = F > 0 && !open.length && !nonManifold.length && !flipped.length && !gaps.length;
  let volume = null;
  if (watertight) {
    volume = 0;
    for (let fi = 0; fi < F; fi++) volume += faceVolume(m, fi, [0, 0, 0]);
  }
  return { V, E, F, euler: V - E + F, triangles, open, nonManifold, flipped, gaps, watertight, volume, edges };
}

/* ── Repair moves ────────────────────────────────────────────────── */

export function flipFace(m, fi) {
  const out = cloneMesh(m);
  out.f[fi].reverse();
  return out;
}

export function deleteFace(m, fi) {
  const out = cloneMesh(m);
  out.f.splice(fi, 1);
  return out;
}

// Fill the hole whose rim contains the open edge `key`.
export function fillHole(m, key) {
  const edges = edgesOf(m);
  const start = edges.get(key);
  if (!start) return { ok: false, msg: 'Pick an edge first.' };
  if (start.faces.length !== 1) {
    return { ok: false, msg: start.faces.length === 2
      ? 'That edge already has a face on both sides. Pick an edge on the rim of a hole.'
      : 'That edge is shared by more than two faces. Something extra is stuck to it: find the stray face and delete it.' };
  }
  const nbrs = new Map();
  for (const e of edges.values()) {
    if (e.faces.length !== 1) continue;
    for (const [p, q] of [[e.a, e.b], [e.b, e.a]]) {
      if (!nbrs.has(p)) nbrs.set(p, []);
      nbrs.get(p).push(q);
    }
  }
  const tangled = 'This open edge does not run around one simple hole. Weld any gap first (a crack where two corners almost touch), delete any stray face, then try again.';
  const loop = [start.b, start.a];
  let prev = start.b, cur = start.a;
  for (let guard = 0; guard < 64; guard++) {
    const list = nbrs.get(cur) || [];
    if (list.length !== 2) return { ok: false, msg: tangled };
    const next = list[0] === prev ? list[1] : list[0];
    if (next === loop[0]) break;
    if (loop.includes(next)) return { ok: false, msg: tangled };
    loop.push(next);
    prev = cur; cur = next;
  }
  if (loop.length < 3) return { ok: false, msg: tangled };
  for (let i = 0; i < loop.length; i++) {
    for (let j = i + 1; j < loop.length; j++) {
      if (dist(m.v[loop[i]], m.v[loop[j]]) < GAP_TOLERANCE) {
        return { ok: false, msg: 'This crack is a gap, not a missing face: two corners almost touch but are not joined. Select one of them and Weld.' };
      }
    }
  }
  // The new face must walk each rim edge the opposite way to the face already there.
  let vote = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length];
    const e = edges.get(edgeKey(a, b));
    vote += e.from[0] === a ? -1 : 1;
  }
  const out = cloneMesh(m);
  out.f.push(vote >= 0 ? loop : loop.slice().reverse());
  return { ok: true, mesh: out, face: out.f.length - 1, size: loop.length };
}

// Weld a corner to the nearest separate corner. The one more faces use keeps its position.
export function weldVertex(m, vi, tol = GAP_TOLERANCE) {
  const used = usedVertices(m);
  let best = -1, bestD = Infinity;
  for (const j of used) {
    if (j === vi) continue;
    const d = dist(m.v[vi], m.v[j]);
    if (d < bestD) { bestD = d; best = j; }
  }
  if (best < 0 || bestD >= tol) {
    return { ok: false, msg: `No other corner is within ${tol} mm of this one, so there is nothing to weld it to.` };
  }
  const uses = i => m.f.reduce((s, face) => s + face.filter(x => x === i).length, 0);
  const keep = uses(best) >= uses(vi) ? best : vi;
  const drop = keep === best ? vi : best;
  const out = cloneMesh(m);
  out.f = out.f.map(face => face.map(i => (i === drop ? keep : i)))
    .map(face => face.filter((i, k) => i !== face[(k + face.length - 1) % face.length]))
    .filter(face => face.length >= 3 && new Set(face).size === face.length);
  return { ok: true, mesh: out, kept: keep, dropped: drop, distance: bestD };
}

/* ── Seeded broken meshes ────────────────────────────────────────── */

export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const LEVELS = {
  1: { label: 'Level 1 · one fault', faults: null },
  2: { label: 'Level 2 · hole + flip + gap', faults: ['hole', 'flip', 'gap'] },
  3: { label: 'Level 3 · five faults', faults: ['hole', 'flip', 'flip', 'gap', 'stray'] }
};

export const PUZZLE_SHAPES = ['cube', 'house', 'bracket', 'tricube', 'pyramid'];

const shares = (a, b) => a.some(i => b.includes(i));

// Build puzzle `seed` at `level`. Faults are placed so each can be found and fixed on its own.
export function makePuzzle(seed, level) {
  const r = rng(seed * 7919 + level * 104729);
  const pick = list => list[Math.floor(r() * list.length)];
  // the pyramid has only five faces: too few to hold five separate faults
  const shapes = level >= 3 ? PUZZLE_SHAPES.filter(s => s !== 'pyramid') : PUZZLE_SHAPES;
  const shape = shapes[(Math.max(1, seed) - 1) % shapes.length];
  const original = buildShape(shape);
  const m = cloneMesh(original);
  const kinds = LEVELS[level].faults || [pick(['hole', 'flip', 'gap'])];
  const faults = [];
  const touched = new Set();
  const faceVerts = fi => original.f[fi];
  let hole = -1;
  for (const kind of kinds) {
    if (kind === 'hole') {
      hole = Math.floor(r() * original.f.length);
      touched.add(hole);
      faults.push({ type: 'hole', face: hole });
    }
  }
  const holeVerts = hole >= 0 ? faceVerts(hole) : [];
  const avoidHole = fi => !shares(faceVerts(fi), holeVerts);
  const edgeShare = (a, b) => {
    const A = faceVerts(a), B = faceVerts(b);
    return A.filter(i => B.includes(i)).length >= 2;
  };
  for (const kind of kinds) {
    if (kind !== 'flip') continue;
    const free = original.f.map((_, i) => i).filter(i => !touched.has(i));
    const tiers = [
      free.filter(i => avoidHole(i) && ![...touched].some(t => edgeShare(i, t))),
      free.filter(i => (hole < 0 || !edgeShare(i, hole)) && ![...touched].some(t => edgeShare(i, t))),
      free.filter(i => hole < 0 || !edgeShare(i, hole)),
      free
    ];
    const list = tiers.find(t => t.length);
    if (!list) continue;
    const fi = pick(list);
    touched.add(fi);
    faults.push({ type: 'flip', face: fi });
  }
  let gap = null;
  if (kinds.includes('gap')) {
    const options = [];
    original.f.forEach((face, fi) => {
      if (touched.has(fi)) return;
      face.forEach((vi, k) => {
        if (holeVerts.includes(vi)) return;
        const prev = face[(k + face.length - 1) % face.length], next = face[(k + 1) % face.length];
        const clear = !holeVerts.includes(prev) && !holeVerts.includes(next);
        options.push({ fi, vi, score: clear ? 2 : 1 });
      });
    });
    const best = options.filter(o => o.score === Math.max(...options.map(x => x.score)));
    if (best.length) {
      gap = pick(best);
      touched.add(gap.fi);
      faults.push({ type: 'gap', face: gap.fi, vertex: gap.vi });
    }
  }
  let stray = null;
  if (kinds.includes('stray')) {
    const cands = [];
    original.f.forEach((face, fi) => {
      if (touched.has(fi)) return;
      for (let k = 0; k < face.length; k++) {
        const a = face[k], b = face[(k + 1) % face.length];
        if (holeVerts.includes(a) || holeVerts.includes(b)) continue;
        if (gap && (a === gap.vi || b === gap.vi)) continue;
        const mid = scale(add(original.v[a], original.v[b]), 0.5);
        let c = -1, far = -1;
        original.v.forEach((p, i) => {
          if (i === a || i === b || holeVerts.includes(i) || (gap && i === gap.vi)) return;
          const d = dist(p, mid);
          if (d > far) { far = d; c = i; }
        });
        if (c >= 0) cands.push([a, b, c]);
      }
    });
    if (cands.length) {
      stray = pick(cands);
      faults.push({ type: 'stray', verts: stray });
    }
  }
  // Apply: flips, then the gap (a new corner nudged out along the face normal), then the
  // stray inside wall, and last remove the hole face (indices shift after that).
  for (const fl of faults) if (fl.type === 'flip') m.f[fl.face].reverse();
  if (gap) {
    const n = faceNormal(original, gap.fi);
    const nudged = add(original.v[gap.vi], scale(n, 2.5));
    m.v.push(nudged);
    const vNew = m.v.length - 1;
    m.f[gap.fi] = m.f[gap.fi].map(i => (i === gap.vi ? vNew : i));
  }
  if (stray) m.f.push(stray.slice());
  if (hole >= 0) m.f.splice(hole, 1);
  return { shape, mesh: m, faults, original };
}

/* ── Facets: how a mesh approximates a curve ─────────────────────── */

// Largest gap between a true circle of radius r and an n-sided polygon through it.
export const chordSag = (r, n) => r * (1 - Math.cos(Math.PI / n));
// Triangles in a closed n-sided cylinder (sides 2n, each cap n − 2).
export const cylinderTriangles = n => 2 * n + 2 * (n - 2);
// Binary STL: 80-byte header + 4-byte count + 50 bytes per triangle.
export const binaryStlBytes = t => 84 + 50 * t;
