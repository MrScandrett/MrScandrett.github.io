// Marble Studio core: the stone as a voxel density field, the carver's tools, reference
// figures (maquettes), the pointing machine, likeness measures, and the autopilot planner.
// Pure: no DOM and no Three.js, so tests/marble-sculpture.test.mjs runs it headless.
//
// Conventions: lattice coordinates, one unit = one voxel = stone.h centimetres; y is up,
// x right, z toward the viewer. Density runs 0 (air) to 255 (stone) and the surface sits
// at ISO. A reference is a signed distance in voxels, positive outside the figure.
// The outermost lattice layer is always air, so every mesh comes out closed.

export const ISO = 127.5;
export const CHUNK = 16;
export const BLOCK_CM = { w: 40, h: 56, d: 36 };
export const QUALITY = { fast: 0.7, standard: 0.5, fine: 0.4 };
export const MARBLE_G_PER_CM3 = 2.7;
export const SAWN_FINISH = 128;

// Finish values: what the last tool left on the surface (the renderer turns this into
// pits, grooves, facets, scratches or a polish).
export const TOOLS = {
  point: { label: 'Point chisel', native: 'subbia', key: '1', radius: 1.5, depth: 1.1, finish: 24, rate: 6, jag: 0.5, spall: 2.4,
    use: 'Roughs out: knocks off big chips fast. Leaves pitted, bruised stone.' },
  claw: { label: 'Claw chisel', native: 'gradina', key: '2', radius: 1.1, depth: 0.6, finish: 84, rate: 7, teeth: 4, spall: 1.6,
    use: 'Models the form: its teeth cut parallel grooves across the bumps.' },
  flat: { label: 'Flat chisel', native: 'scalpello', key: '3', radius: 0.8, depth: 0.32, finish: 150, rate: 8, spall: 1.0,
    use: 'Defines planes and edges: shaves thin, clean facets.' },
  drill: { label: 'Drill', native: 'trapano', key: '4', radius: 0.32, depth: 2.6, finish: 110, rate: 4,
    use: 'Bores deep, narrow holes: nostrils, pupils, gaps between fingers.' },
  rasp: { label: 'Rasp', native: 'raspa', key: '5', radius: 1.4, finish: 205, rate: 12, smooth: true,
    use: 'Files away chisel marks and blends the planes together.' },
  polish: { label: 'Polish', native: 'pomice', key: '6', radius: 1.7, finish: 255, rate: 14, polish: true,
    use: 'Abrasives make the surface glow. Only works on rasped stone.' }
};

/* ── Small helpers ─────────────────────────────────────────────── */

export function rng(seed = 1) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function norm3(v) {
  const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

// Two unit vectors perpendicular to d (and to each other).
export function basis(d, hint) {
  let s = hint ? cross(hint, d) : null;
  if (!s || Math.hypot(s[0], s[1], s[2]) < 1e-3) s = cross(Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], d);
  s = norm3(s);
  return [s, norm3(cross(d, s))];
}

/* ── The stone ─────────────────────────────────────────────────── */

export function createStone({ h = QUALITY.standard, block = BLOCK_CM } = {}) {
  const nx = Math.round(block.w / h) + 2;
  const ny = Math.round(block.h / h) + 2;
  const nz = Math.round(block.d / h) + 2;
  const n = nx * ny * nz;
  const stone = {
    nx, ny, nz, h, block,
    density: new Uint8Array(n),
    finish: new Uint8Array(n),
    cx: Math.ceil(nx / CHUNK), cy: Math.ceil(ny / CHUNK), cz: Math.ceil(nz / CHUNK),
    dirty: new Set(),
    journal: null
  };
  fillBlock(stone);
  return stone;
}

export function fillBlock(stone) {
  const { nx, ny, nz, density, finish } = stone;
  density.fill(0);
  finish.fill(0);
  for (let z = 1; z < nz - 1; z++) for (let y = 1; y < ny - 1; y++) {
    const row = nx * (y + ny * z);
    density.fill(255, row + 1, row + nx - 1);
    finish.fill(SAWN_FINISH, row + 1, row + nx - 1);
  }
  markAll(stone);
}

export function markAll(stone) {
  for (let i = 0; i < stone.cx * stone.cy * stone.cz; i++) stone.dirty.add(i);
}

export const idx = (s, x, y, z) => x + s.nx * (y + s.ny * z);

// Lattice point → centimetres, with the block's bottom centre at the origin.
export function toCm(s, x, y, z) {
  return [(x - (s.nx - 1) / 2) * s.h, (y - 0.5) * s.h, (z - (s.nz - 1) / 2) * s.h];
}

export function fromCm(s, X, Y, Z) {
  return [X / s.h + (s.nx - 1) / 2, Y / s.h + 0.5, Z / s.h + (s.nz - 1) / 2];
}

// Trilinear density; outside the lattice is air.
export function sample(s, x, y, z) {
  if (x < 0 || y < 0 || z < 0 || x > s.nx - 1 || y > s.ny - 1 || z > s.nz - 1) return 0;
  const x0 = Math.min(x | 0, s.nx - 2), y0 = Math.min(y | 0, s.ny - 2), z0 = Math.min(z | 0, s.nz - 2);
  const fx = x - x0, fy = y - y0, fz = z - z0;
  const d = s.density, sx = 1, sy = s.nx, sz = s.nx * s.ny;
  const i = x0 + sy * y0 + sz * z0;
  const c00 = d[i] + (d[i + sx] - d[i]) * fx;
  const c10 = d[i + sy] + (d[i + sy + sx] - d[i + sy]) * fx;
  const c01 = d[i + sz] + (d[i + sz + sx] - d[i + sz]) * fx;
  const c11 = d[i + sz + sy] + (d[i + sz + sy + sx] - d[i + sz + sy]) * fx;
  const c0 = c00 + (c10 - c00) * fy, c1 = c01 + (c11 - c01) * fy;
  return c0 + (c1 - c0) * fz;
}

export function sampleField(f, nx, ny, nz, x, y, z, outside = 1e3) {
  if (x < 0 || y < 0 || z < 0 || x > nx - 1 || y > ny - 1 || z > nz - 1) return outside;
  const x0 = Math.min(x | 0, nx - 2), y0 = Math.min(y | 0, ny - 2), z0 = Math.min(z | 0, nz - 2);
  const fx = x - x0, fy = y - y0, fz = z - z0, sy = nx, sz = nx * ny;
  const i = x0 + sy * y0 + sz * z0;
  const c00 = f[i] + (f[i + 1] - f[i]) * fx;
  const c10 = f[i + sy] + (f[i + sy + 1] - f[i + sy]) * fx;
  const c01 = f[i + sz] + (f[i + sz + 1] - f[i + sz]) * fx;
  const c11 = f[i + sz + sy] + (f[i + sz + sy + 1] - f[i + sz + sy]) * fx;
  const c0 = c00 + (c10 - c00) * fy, c1 = c01 + (c11 - c01) * fy;
  return c0 + (c1 - c0) * fz;
}

// Outward surface normal from the density gradient (density falls toward the air).
export function normalAt(s, x, y, z) {
  const e = 0.75;
  return norm3([
    sample(s, x - e, y, z) - sample(s, x + e, y, z),
    sample(s, x, y - e, z) - sample(s, x, y + e, z),
    sample(s, x, y, z - e) - sample(s, x, y, z + e)
  ]);
}

/* ── Edits, dirty chunks and undo ──────────────────────────────── */

export function beginEdit(stone) { stone.journal = new Map(); }

export function endEdit(stone) {
  const j = stone.journal;
  stone.journal = null;
  return j && j.size ? j : null;
}

function chunkRange(s, c) {
  const cx = c % s.cx, cy = ((c / s.cx) | 0) % s.cy, cz = (c / (s.cx * s.cy)) | 0;
  return [cx * CHUNK, cy * CHUNK, cz * CHUNK, Math.min(cx * CHUNK + CHUNK, s.nx), Math.min(cy * CHUNK + CHUNK, s.ny), Math.min(cz * CHUNK + CHUNK, s.nz)];
}

function copyChunk(s, c) {
  const [x0, y0, z0, x1, y1, z1] = chunkRange(s, c);
  const w = x1 - x0, d = new Uint8Array(w * (y1 - y0) * (z1 - z0)), f = new Uint8Array(d.length);
  let k = 0;
  for (let z = z0; z < z1; z++) for (let y = y0; y < y1; y++) {
    const i = idx(s, x0, y, z);
    d.set(s.density.subarray(i, i + w), k);
    f.set(s.finish.subarray(i, i + w), k);
    k += w;
  }
  return { d, f };
}

function pasteChunk(s, c, snap) {
  const [x0, y0, z0, x1, y1, z1] = chunkRange(s, c);
  const w = x1 - x0;
  let k = 0;
  for (let z = z0; z < z1; z++) for (let y = y0; y < y1; y++) {
    const i = idx(s, x0, y, z);
    s.density.set(snap.d.subarray(k, k + w), i);
    s.finish.set(snap.f.subarray(k, k + w), i);
    k += w;
  }
}

// Call before writing lattice points in [x0..x1]×[y0..y1]×[z0..z1] (inclusive).
export function touch(s, x0, y0, z0, x1, y1, z1) {
  x0 = clamp(x0, 0, s.nx - 1); y0 = clamp(y0, 0, s.ny - 1); z0 = clamp(z0, 0, s.nz - 1);
  x1 = clamp(x1, 0, s.nx - 1); y1 = clamp(y1, 0, s.ny - 1); z1 = clamp(z1, 0, s.nz - 1);
  if (s.journal) {
    for (let cz = (z0 / CHUNK) | 0; cz <= ((z1 / CHUNK) | 0); cz++)
      for (let cy = (y0 / CHUNK) | 0; cy <= ((y1 / CHUNK) | 0); cy++)
        for (let cx = (x0 / CHUNK) | 0; cx <= ((x1 / CHUNK) | 0); cx++) {
          const c = cx + s.cx * (cy + s.cy * cz);
          if (!s.journal.has(c)) s.journal.set(c, copyChunk(s, c));
        }
  }
  // A point moves the vertices of the cells on both sides of it, and those vertices are
  // used by edges one point further out, so remesh one point beyond the edit each way.
  const hi = (v, n, c) => Math.min(c - 1, (Math.min(n - 1, v + 1) / CHUNK) | 0);
  for (let cz = (Math.max(0, z0 - 1) / CHUNK) | 0; cz <= hi(z1, s.nz, s.cz); cz++)
    for (let cy = (Math.max(0, y0 - 1) / CHUNK) | 0; cy <= hi(y1, s.ny, s.cy); cy++)
      for (let cx = (Math.max(0, x0 - 1) / CHUNK) | 0; cx <= hi(x1, s.nx, s.cx); cx++)
        s.dirty.add(cx + s.cx * (cy + s.cy * cz));
}

// Puts back a journal's chunks; returns the journal that undoes the undo.
export function restore(s, journal) {
  const back = new Map();
  for (const [c, snap] of journal) {
    back.set(c, copyChunk(s, c));
    pasteChunk(s, c, snap);
    const [x0, y0, z0, x1, y1, z1] = chunkRange(s, c);
    const keep = s.journal; s.journal = null;
    touch(s, x0, y0, z0, x1 - 1, y1 - 1, z1 - 1);
    s.journal = keep;
  }
  return back;
}

/* ── Carving ───────────────────────────────────────────────────── */

// A cutter is a union of ellipsoids {c, ax: [u, v, w], r: [ru, rv, rw]} and capsules
// {a, b, r}. sdCutters gives an approximate signed distance (voxels) to that union.
function sdCutters(cutters, x, y, z) {
  let best = 1e9;
  for (const k of cutters) {
    let d;
    if (k.b) {
      const bax = k.b[0] - k.a[0], bay = k.b[1] - k.a[1], baz = k.b[2] - k.a[2];
      const pax = x - k.a[0], pay = y - k.a[1], paz = z - k.a[2];
      const t = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
      const ex = pax - bax * t, ey = pay - bay * t, ez = paz - baz * t;
      d = Math.sqrt(ex * ex + ey * ey + ez * ez) - k.r;
    } else {
      const px = x - k.c[0], py = y - k.c[1], pz = z - k.c[2];
      const [u, v, w] = k.ax, [ru, rv, rw] = k.r;
      const qu = (px * u[0] + py * u[1] + pz * u[2]) / ru;
      const qv = (px * v[0] + py * v[1] + pz * v[2]) / rv;
      const qw = (px * w[0] + py * w[1] + pz * w[2]) / rw;
      d = (Math.sqrt(qu * qu + qv * qv + qw * qw) - 1) * (ru < rv ? (ru < rw ? ru : rw) : (rv < rw ? rv : rw));
    }
    if (d < best) best = d;
  }
  return best;
}

function cutterBox(cutters, pad) {
  const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
  const grow = (p, r) => { for (let i = 0; i < 3; i++) { b[i] = Math.min(b[i], p[i] - r); b[i + 3] = Math.max(b[i + 3], p[i] + r); } };
  for (const k of cutters) {
    if (k.b) { grow(k.a, k.r + pad); grow(k.b, k.r + pad); }
    else grow(k.c, Math.max(...k.r) + pad);
  }
  return b.map((v, i) => (i < 3 ? Math.floor(v) : Math.ceil(v)));
}

// The shape a tool removes on one strike. hit is on the surface; dir points into the
// stone; side is a direction across the stroke (the screen's right).
export function cuttersFor(s, tool, hit, dir, side, size = 1, random = Math.random) {
  const r = (tool.radius * size) / s.h;
  const D = ((tool.depth || 0.3) * size) / s.h;
  const [u, v] = basis(dir, side);
  const at = (t, a = 0, b = 0) => [hit[0] + dir[0] * t + u[0] * a + v[0] * b, hit[1] + dir[1] * t + u[1] * a + v[1] * b, hit[2] + dir[2] * t + u[2] * a + v[2] * b];
  const sphere = (c, rad) => ({ c, ax: [u, v, dir], r: [rad, rad, rad] });
  if (tool === TOOLS.drill) return [{ a: at(-1), b: at(D), r: Math.max(r, 0.7) }];
  if (tool === TOOLS.claw) {
    const n = tool.teeth, rt = r * 0.42, out = [];
    for (let i = 0; i < n; i++) out.push(sphere(at(D - rt, (i - (n - 1) / 2) * (2 * r / n)), rt));
    out.push({ c: at(D * 0.4 - r * 0.9), ax: [u, v, dir], r: [r * 1.05, r * 0.5, r * 0.9] });
    return out;
  }
  if (tool === TOOLS.flat) return [{ c: at(D - r * 0.55), ax: [u, v, dir], r: [r * 1.7, r * 0.75, r * 0.55] }];
  // point chisel: a bowl plus conchoidal chips that break off around it
  const out = [sphere(at(D - r), r)];
  const chips = 2 + ((random() * 2) | 0);
  for (let i = 0; i < chips; i++) {
    const a = random() * Math.PI * 2, rr = r * (0.45 + random() * tool.jag);
    out.push(sphere(at(D * (0.3 + random() * 0.5) - rr, Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75), rr));
  }
  return out;
}

// Floor that protects stone the autopilot must keep: voxels deeper than thr inside the
// reference never lose density.
function floorDensity(sd, thr) {
  return 255 * clamp(0.5 - (sd - thr), 0, 1);
}

// How much stone lies behind the hit along dir before air: a thin edge spalls off.
// A pit left by an earlier chip isn't an edge, so the air must go on for `clear` voxels.
function thicknessBehind(s, hit, dir, max, clear) {
  const at = t => sample(s, hit[0] + dir[0] * t, hit[1] + dir[1] * t, hit[2] + dir[2] * t);
  for (let t = 0.6; t < max; t += 0.5) {
    if (at(t) >= ISO) continue;
    for (let u = t + 0.5; u < t + clear; u += 0.5) if (at(u) >= ISO) return max;
    return t;
  }
  return max;
}

function applyCutters(s, cutters, finishValue, opts) {
  const [x0, y0, z0, x1, y1, z1] = cutterBox(cutters, 2.5).map((v, i) => clamp(v, 1, (i % 3 === 0 ? s.nx : i % 3 === 1 ? s.ny : s.nz) - 2));
  if (x1 < x0 || y1 < y0 || z1 < z0) return 0;
  touch(s, x0, y0, z0, x1, y1, z1);
  const { density, finish } = s;
  const ref = opts.ref, thr = opts.floor;
  let removed = 0;
  for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) {
    let i = idx(s, x0, y, z);
    for (let x = x0; x <= x1; x++, i++) {
      const old = density[i];
      if (!old) continue;
      const sd = sdCutters(cutters, x, y, z);
      if (sd > 2.2) continue;
      let next = Math.min(old, 255 * clamp(0.5 + sd, 0, 1));
      if (ref && thr !== undefined) next = Math.max(next, Math.min(old, floorDensity(ref[i], thr)));
      if (next !== old) { removed += old - next; density[i] = next; }
      if (next > 0 && sd < 1.8) finish[i] = finishValue;
    }
  }
  return removed / 255;
}

// One strike of a cutting tool. Returns { removed (voxels of stone), spalled }.
export function strike(s, tool, hit, dir, side, opts = {}) {
  const random = opts.random || Math.random;
  const size = opts.size ?? 1;
  if (tool.smooth) return { removed: rasp(s, tool, hit, dir, size, opts), spalled: false };
  if (tool.polish) return { removed: 0, spalled: false, ...polish(s, tool, hit, size) };
  dir = norm3(dir);
  const cutters = cuttersFor(s, tool, hit, dir, side, size, random);
  let spalled = false;
  if (tool.spall && !opts.noSpall) {
    const limit = (tool.spall * size) / s.h;
    const t = thicknessBehind(s, hit, dir, limit * 1.5, (tool.radius * size * 2.5) / s.h);
    if (t < limit) {
      // Struck toward a thin edge: the whole edge breaks away.
      const r = Math.max(((tool.radius * size) / s.h) * 1.8, t * 1.4);
      cutters.push({ c: [hit[0] + dir[0] * t * 0.6, hit[1] + dir[1] * t * 0.6, hit[2] + dir[2] * t * 0.6], ax: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], r: [r, r, r] });
      spalled = true;
    }
  }
  return { removed: applyCutters(s, cutters, tool.finish, opts), spalled };
}

// The rasp files high spots down toward the average of their neighbours. It only removes.
function rasp(s, tool, hit, dir, size, opts) {
  const r = (tool.radius * size) / s.h;
  const c = [hit[0] + dir[0] * 0.3, hit[1] + dir[1] * 0.3, hit[2] + dir[2] * 0.3];
  const x0 = clamp(Math.floor(c[0] - r - 1), 1, s.nx - 2), x1 = clamp(Math.ceil(c[0] + r + 1), 1, s.nx - 2);
  const y0 = clamp(Math.floor(c[1] - r - 1), 1, s.ny - 2), y1 = clamp(Math.ceil(c[1] + r + 1), 1, s.ny - 2);
  const z0 = clamp(Math.floor(c[2] - r - 1), 1, s.nz - 2), z1 = clamp(Math.ceil(c[2] + r + 1), 1, s.nz - 2);
  if (x1 < x0 || y1 < y0 || z1 < z0) return 0;
  touch(s, x0, y0, z0, x1, y1, z1);
  const w = x1 - x0 + 3, hh = y1 - y0 + 3, copy = new Uint8Array(w * hh * (z1 - z0 + 3));
  for (let z = z0 - 1; z <= z1 + 1; z++) for (let y = y0 - 1; y <= y1 + 1; y++) {
    const i = idx(s, x0 - 1, y, z);
    copy.set(s.density.subarray(i, i + w), (y - y0 + 1) * w + (z - z0 + 1) * w * hh);
  }
  const at = (x, y, z) => copy[(x - x0 + 1) + (y - y0 + 1) * w + (z - z0 + 1) * w * hh];
  const ref = opts.ref, thr = opts.floor;
  let removed = 0;
  for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const ox = x - c[0], oy = y - c[1], oz = z - c[2], dist = Math.sqrt(ox * ox + oy * oy + oz * oz);
    if (dist > r) continue;
    const i = idx(s, x, y, z), old = s.density[i];
    if (!old) continue;
    let sum = 0;
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += at(x + dx, y + dy, z + dz);
    const wgt = 0.55 * (1 - dist / r);
    let next = Math.round(old + (Math.min(old, sum / 27) - old) * wgt);
    if (ref && thr !== undefined) next = Math.max(next, Math.min(old, floorDensity(ref[i], thr)));
    if (next < old) { removed += old - next; s.density[i] = next; }
    if (next > 0 && s.finish[i] < tool.finish) s.finish[i] = Math.min(tool.finish, s.finish[i] + Math.round(160 * wgt));
  }
  return removed / 255;
}

// Polishing raises the finish of already-rasped stone. Chisel marks can't be polished.
function polish(s, tool, hit, size) {
  const r = (tool.radius * size) / s.h;
  const x0 = clamp(Math.floor(hit[0] - r), 1, s.nx - 2), x1 = clamp(Math.ceil(hit[0] + r), 1, s.nx - 2);
  const y0 = clamp(Math.floor(hit[1] - r), 1, s.ny - 2), y1 = clamp(Math.ceil(hit[1] + r), 1, s.ny - 2);
  const z0 = clamp(Math.floor(hit[2] - r), 1, s.nz - 2), z1 = clamp(Math.ceil(hit[2] + r), 1, s.nz - 2);
  if (x1 < x0 || y1 < y0 || z1 < z0) return { polished: 0, tooRough: 0 };
  touch(s, x0, y0, z0, x1, y1, z1);
  let polished = 0, tooRough = 0;
  for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = idx(s, x, y, z);
    if (!s.density[i]) continue;
    const ox = x - hit[0], oy = y - hit[1], oz = z - hit[2], dist = Math.sqrt(ox * ox + oy * oy + oz * oz);
    if (dist > r) continue;
    if (s.finish[i] < 175) { tooRough++; continue; }
    const next = Math.min(255, s.finish[i] + Math.round(45 * (1 - dist / r)) + 1);
    if (next !== s.finish[i]) { s.finish[i] = next; polished++; }
  }
  return { polished, tooRough };
}

/* ── Breakage: stone that loses its connection to the base falls ── */

// Solid voxels (6-connected) that can't reach the bottom layer, grouped into pieces.
export function findDetached(s, minKeep = 0) {
  const { nx, ny, nz, density } = s, n = nx * ny * nz;
  const seen = new Uint8Array(n), stack = new Int32Array(n);
  let top = 0;
  const sx = 1, sy = nx, sz = nx * ny;
  for (let z = 1; z < nz - 1; z++) for (let x = 1; x < nx - 1; x++) {
    const i = idx(s, x, 1, z);
    if (density[i] >= 128) { seen[i] = 1; stack[top++] = i; }
  }
  const flood = (mark, out) => {
    while (top) {
      const i = stack[--top];
      if (out) out.push(i);
      const nb = [i - sx, i + sx, i - sy, i + sy, i - sz, i + sz];
      for (let k = 0; k < 6; k++) {
        const j = nb[k];
        if (!seen[j] && density[j] >= 128) { seen[j] = mark; stack[top++] = j; }
      }
    }
  };
  flood(1, null);
  const pieces = [];
  for (let z = 1; z < nz - 1; z++) for (let y = 2; y < ny - 1; y++) {
    let i = idx(s, 1, y, z);
    for (let x = 1; x < nx - 1; x++, i++) {
      if (seen[i] || density[i] < 128) continue;
      seen[i] = 2; stack[top++] = i;
      const out = [];
      flood(2, out);
      if (out.length >= minKeep) pieces.push(Int32Array.from(out));
    }
  }
  return pieces;
}

// Removes a fallen piece (and the faint density halo around it) from the stone.
export function removePiece(s, piece) {
  const { nx, ny } = s, sy = nx, sz = nx * ny;
  let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1, y1 = -1, z1 = -1;
  for (const i of piece) {
    const x = i % nx, y = ((i / nx) | 0) % ny, z = (i / sz) | 0;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); z0 = Math.min(z0, z);
    x1 = Math.max(x1, x); y1 = Math.max(y1, y); z1 = Math.max(z1, z);
  }
  touch(s, x0 - 1, y0 - 1, z0 - 1, x1 + 1, y1 + 1, z1 + 1);
  for (const i of piece) {
    s.density[i] = 0;
    for (const j of [i - 1, i + 1, i - sy, i + sy, i - sz, i + sz]) if (s.density[j] < 128) s.density[j] = 0;
  }
  return { box: [x0, y0, z0, x1, y1, z1] };
}

// A standalone density grid holding just one piece, for drawing it as it falls.
export function pieceGrid(s, piece) {
  const { nx, ny } = s, sz = nx * ny;
  let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1, y1 = -1, z1 = -1;
  for (const i of piece) {
    const x = i % nx, y = ((i / nx) | 0) % ny, z = (i / sz) | 0;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); z0 = Math.min(z0, z);
    x1 = Math.max(x1, x); y1 = Math.max(y1, y); z1 = Math.max(z1, z);
  }
  const g = { nx: x1 - x0 + 3, ny: y1 - y0 + 3, nz: z1 - z0 + 3, h: s.h, origin: [x0 - 1, y0 - 1, z0 - 1] };
  g.density = new Uint8Array(g.nx * g.ny * g.nz);
  g.finish = new Uint8Array(g.density.length);
  for (const i of piece) {
    const x = i % nx, y = ((i / nx) | 0) % ny, z = (i / sz) | 0;
    const j = (x - x0 + 1) + g.nx * ((y - y0 + 1) + g.ny * (z - z0 + 1));
    g.density[j] = s.density[i];
    g.finish[j] = s.finish[i];
  }
  return g;
}

/* ── Meshing: naive surface nets ───────────────────────────────── */

// Meshes the cells whose edges start at lattice points in [x0,x1)×[y0,y1)×[z0,z1).
// Positions are lattice coordinates. Neighbouring regions share vertex positions
// exactly, so chunk meshes join without cracks. Options: ao (volumetric ambient
// occlusion per vertex), ref (sample a reference distance into `guide`).
export function meshRegion(g, x0, y0, z0, x1, y1, z1, opts = {}) {
  const { nx, ny, nz, density } = g;
  x1 = Math.min(x1, nx - 1); y1 = Math.min(y1, ny - 1); z1 = Math.min(z1, nz - 1);
  const vx0 = Math.max(0, x0 - 1), vy0 = Math.max(0, y0 - 1), vz0 = Math.max(0, z0 - 1);
  const vx1 = Math.min(nx - 2, x1 - 1), vy1 = Math.min(ny - 2, y1 - 1), vz1 = Math.min(nz - 2, z1 - 1);
  const W = vx1 - vx0 + 1, H = vy1 - vy0 + 1, Dd = vz1 - vz0 + 1;
  if (W <= 0 || H <= 0 || Dd <= 0) return null;
  const cellVert = new Int32Array(W * H * Dd).fill(-1);
  const pos = [];
  const sy = nx, sz = nx * ny;
  const corner = [0, 1, sy, sy + 1, sz, sz + 1, sz + sy, sz + sy + 1];
  const cOff = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float32Array(8);
  for (let z = vz0; z <= vz1; z++) for (let y = vy0; y <= vy1; y++) for (let x = vx0; x <= vx1; x++) {
    const base = x + sy * y + sz * z;
    let mask = 0;
    for (let k = 0; k < 8; k++) { v[k] = density[base + corner[k]]; if (v[k] > ISO) mask |= 1 << k; }
    if (mask === 0 || mask === 255) continue;
    let px = 0, py = 0, pz = 0, cnt = 0;
    for (const [a, b] of edges) {
      if ((v[a] > ISO) === (v[b] > ISO)) continue;
      const t = (ISO - v[a]) / (v[b] - v[a]);
      px += cOff[a][0] + (cOff[b][0] - cOff[a][0]) * t;
      py += cOff[a][1] + (cOff[b][1] - cOff[a][1]) * t;
      pz += cOff[a][2] + (cOff[b][2] - cOff[a][2]) * t;
      cnt++;
    }
    cellVert[(x - vx0) + W * ((y - vy0) + H * (z - vz0))] = pos.length / 3;
    pos.push(x + px / cnt, y + py / cnt, z + pz / cnt);
  }
  const index = [];
  const cv = (x, y, z) => (x < vx0 || y < vy0 || z < vz0 || x > vx1 || y > vy1 || z > vz1) ? -1 : cellVert[(x - vx0) + W * ((y - vy0) + H * (z - vz0))];
  for (let z = z0; z < z1; z++) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = x + sy * y + sz * z, inside = density[i] > ISO;
    // edge +x: cells around it vary in y and z
    if (x + 1 < nx && (density[i + 1] > ISO) !== inside && y > 0 && z > 0)
      quad(index, cv(x, y - 1, z - 1), cv(x, y, z - 1), cv(x, y, z), cv(x, y - 1, z), inside);
    if (y + 1 < ny && (density[i + sy] > ISO) !== inside && z > 0 && x > 0)
      quad(index, cv(x - 1, y, z - 1), cv(x - 1, y, z), cv(x, y, z), cv(x, y, z - 1), inside);
    if (z + 1 < nz && (density[i + sz] > ISO) !== inside && x > 0 && y > 0)
      quad(index, cv(x - 1, y - 1, z), cv(x, y - 1, z), cv(x, y, z), cv(x - 1, y, z), inside);
  }
  if (!index.length) return null;
  const nv = pos.length / 3;
  const positions = new Float32Array(pos);
  const normals = new Float32Array(nv * 3), finish = new Float32Array(nv);
  const ao = opts.ao ? new Float32Array(nv) : null, guide = opts.ref ? new Float32Array(nv) : null;
  const dirs = AO_DIRS;
  for (let k = 0; k < nv; k++) {
    const x = positions[k * 3], y = positions[k * 3 + 1], z = positions[k * 3 + 2];
    const nrm = normalAt(g, x, y, z);
    normals.set(nrm, k * 3);
    // finish from the solid corners of the vertex's cell
    const bx = Math.min(x | 0, nx - 2), by = Math.min(y | 0, ny - 2), bz = Math.min(z | 0, nz - 2), base = bx + sy * by + sz * bz;
    let fs = 0, ws = 0;
    for (let c = 0; c < 8; c++) { const w = density[base + corner[c]]; fs += g.finish[base + corner[c]] * w; ws += w; }
    finish[k] = ws ? fs / ws / 255 : 0.5;
    if (ao) {
      const [t1, t2] = basis(nrm);
      let occ = 0;
      for (const [a, b, c, dist] of dirs) {
        const dx = nrm[0] * a + t1[0] * b + t2[0] * c, dy = nrm[1] * a + t1[1] * b + t2[1] * c, dz = nrm[2] * a + t1[2] * b + t2[2] * c;
        occ += sample(g, x + dx * dist, y + dy * dist, z + dz * dist) / 255;
      }
      ao[k] = 1 - clamp(occ / dirs.length * 1.9 - 0.08, 0, 0.82);
    }
    if (guide) guide[k] = sampleField(opts.ref, nx, ny, nz, x, y, z);
  }
  return { positions, normals, finish, ao, guide, index: nv > 65535 ? new Uint32Array(index) : new Uint16Array(index) };
}

function quad(out, a, b, c, d, outwardPositive) {
  if (a < 0 || b < 0 || c < 0 || d < 0) return;
  if (outwardPositive) out.push(a, b, c, a, c, d);
  else out.push(a, c, b, a, d, c);
}

// Hemisphere probes (normal, tangent, bitangent weights, distance in voxels).
const AO_DIRS = (() => {
  const out = [];
  const ring = [[1, 0], [0.5, 0.87], [-0.5, 0.87], [-1, 0], [-0.5, -0.87], [0.5, -0.87]];
  for (const [b, c] of ring) out.push([0.55, b * 0.84, c * 0.84, 2.2], [0.8, b * 0.6, c * 0.6, 4.5]);
  out.push([1, 0, 0, 1.6], [1, 0, 0, 3.5], [1, 0, 0, 7]);
  return out.map(([a, b, c, d]) => { const l = Math.hypot(a, b, c); return [a / l, b / l, c / l, d]; });
})();

/* ── Picking ───────────────────────────────────────────────────── */

// First surface crossing along a ray in lattice space, or null.
export function raycast(s, origin, dir, maxT = 4000) {
  dir = norm3(dir);
  let t0 = 0, t1 = maxT;
  const lo = [0.5, 0.5, 0.5], hi = [s.nx - 1.5, s.ny - 1.5, s.nz - 1.5];
  for (let a = 0; a < 3; a++) {
    if (Math.abs(dir[a]) < 1e-9) { if (origin[a] < lo[a] || origin[a] > hi[a]) return null; continue; }
    let ta = (lo[a] - origin[a]) / dir[a], tb = (hi[a] - origin[a]) / dir[a];
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
    if (t0 > t1) return null;
  }
  const at = t => sample(s, origin[0] + dir[0] * t, origin[1] + dir[1] * t, origin[2] + dir[2] * t);
  let prev = t0;
  if (at(t0) > ISO) return finishHit(s, origin, dir, t0);
  for (let t = t0 + 0.4; t <= t1 + 0.4; t += 0.4) {
    if (at(t) > ISO) {
      let a = prev, b = t;
      for (let k = 0; k < 7; k++) { const m = (a + b) / 2; if (at(m) > ISO) b = m; else a = m; }
      return finishHit(s, origin, dir, b);
    }
    prev = t;
  }
  return null;
}

function finishHit(s, o, d, t) {
  const point = [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t];
  return { t, point, normal: normalAt(s, point[0], point[1], point[2]) };
}

/* ── Reference figures (maquettes) ─────────────────────────────── */

// Signed-distance building blocks in centimetres.
const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
function sdSphere(x, y, z, cx, cy, cz, r) { return len3(x - cx, y - cy, z - cz) - r; }
function sdEllipsoid(x, y, z, cx, cy, cz, rx, ry, rz) {
  const px = x - cx, py = y - cy, pz = z - cz;
  const k0 = len3(px / rx, py / ry, pz / rz), k1 = len3(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
  return k1 > 0 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry, rz);
}
function sdCapsule(x, y, z, a, b, r) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2], pax = x - a[0], pay = y - a[1], paz = z - a[2];
  const t = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
  return len3(pax - bax * t, pay - bay * t, paz - baz * t) - r;
}
// Capsule that tapers from r1 at a to r2 at b (good for ears and tufts).
function sdTaper(x, y, z, a, b, r1, r2) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2], pax = x - a[0], pay = y - a[1], paz = z - a[2];
  const t = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
  return len3(pax - bax * t, pay - bay * t, paz - baz * t) - (r1 + (r2 - r1) * t);
}
function sdRoundBox(x, y, z, cx, cy, cz, hx, hy, hz, r) {
  const qx = Math.abs(x - cx) - hx + r, qy = Math.abs(y - cy) - hy + r, qz = Math.abs(z - cz) - hz + r;
  return len3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
}
function sdCylY(x, y, z, cx, cz, y0, y1, r, round = 0.6) {
  const dx = Math.sqrt((x - cx) * (x - cx) + (z - cz) * (z - cz)) - r + round, dy = Math.abs(y - (y0 + y1) / 2) - (y1 - y0) / 2 + round;
  return Math.min(Math.max(dx, dy), 0) + len3(Math.max(dx, 0), Math.max(dy, 0), 0) - round;
}
function smin(a, b, k) { const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); }
function ssub(a, b, k) { return -smin(-a, b, k); } // a minus b, softened

const mirrorX = x => Math.abs(x);

export const REFERENCES = [
  {
    id: 'bust', label: 'Portrait bust', subject: 'a person',
    note: 'Faces are read by their big planes first: brow, cheekbones, nose, jaw. Rough those out before any eyes.',
    sdf(x, y, z) {
      const ax = mirrorX(x);
      let d = sdCylY(x, y, z, 0, 0, 0, 3.6, 8.5);
      d = smin(d, sdCylY(x, y, z, 0, 0, 3, 9.5, 4.6), 1.2);
      // chest and shoulders, cut flat across the bottom like a classical bust
      let chest = smin(sdEllipsoid(x, y, z, 0, 15, 0.8, 12.5, 8, 8.2), sdCapsule(x, y, z, [-12.2, 18.6, -0.6], [12.2, 18.6, -0.6], 4.8), 3.5);
      chest = Math.max(chest, 8.8 - y - Math.abs(x) * 0.12);
      d = smin(d, chest, 1.5);
      d = smin(d, sdCapsule(x, y, z, [0, 20, 0], [0, 30, 1.2], 5.1), 2.5);
      d = smin(d, sdEllipsoid(x, y, z, 0, 38, 1.2, 8.2, 10.4, 9.6), 2.5);
      d = smin(d, sdEllipsoid(x, y, z, 0, 31.6, 4.6, 5.5, 4.4, 5.6), 2.5);
      d = smin(d, sdEllipsoid(ax, y, z, 4.6, 35.4, 7.2, 2.6, 2.1, 2.8), 1.5); // cheekbones
      d = smin(d, sdCapsule(ax, y, z, [0.6, 39.9, 9.5], [4.2, 39.7, 8.9], 1.35), 1.2); // brow
      d = smin(d, sdTaper(x, y, z, [0, 38.6, 10.4], [0, 34.6, 12.6], 1.25, 1.6), 0.9); // nose
      d = ssub(d, sdSphere(ax, y, z, 3.4, 37.6, 11.1, 1.75), 0.8); // eye sockets
      d = smin(d, sdSphere(ax, y, z, 3.3, 37.4, 8.6, 1.45), 0.3); // eyes, seated in their sockets
      d = smin(d, sdEllipsoid(ax, y, z, 8.1, 37, 0.6, 1.5, 3.3, 2.3), 1); // ears
      d = smin(d, sdCapsule(x, y, z, [-2.1, 32.9, 9.7], [2.1, 32.9, 9.7], 0.85), 0.6); // lips
      d = ssub(d, sdCapsule(x, y, z, [-1.9, 32.75, 10.8], [1.9, 32.75, 10.8], 0.32), 0.15);
      // hair: a cap over the back and top of the skull
      const hair = Math.max(sdEllipsoid(x, y, z, 0, 39.6, 0.2, 8.9, 10.6, 10.2), 36.2 - y, z - 7.5 - (y - 40) * 0.2);
      return smin(d, hair, 0.8);
    }
  },
  {
    id: 'cat', label: 'Seated cat', subject: 'an animal',
    note: 'Egyptian carvers kept the cat compact: legs tight to the body, tail wrapped around the base. Thin ears are the risk.',
    sdf(x, y, z) {
      const ax = mirrorX(x);
      let d = sdRoundBox(x, y, z, 0, 2, 0, 11, 2, 15, 1);
      d = smin(d, sdEllipsoid(x, y, z, 0, 12.5, -4, 9, 9.5, 10), 2);
      d = smin(d, sdEllipsoid(x, y, z, 0, 20, 2.5, 6.5, 10.5, 6), 3);
      d = smin(d, sdCapsule(ax, y, z, [3, 5, 8], [3, 19, 4.5], 2.1), 1.5);
      d = smin(d, sdEllipsoid(ax, y, z, 3, 4.8, 9.6, 2.4, 1.6, 3), 1);
      d = smin(d, sdCapsule(x, y, z, [0, 24, 2.2], [0, 31, 3.6], 4.3), 2);
      d = smin(d, sdEllipsoid(x, y, z, 0, 33.5, 4, 6, 5.5, 5.6), 2);
      d = smin(d, sdEllipsoid(x, y, z, 0, 31.8, 8.4, 2.6, 2.2, 2.2), 1.2);
      d = smin(d, sdTaper(ax, y, z, [3.2, 36.5, 3.4], [4.3, 43.5, 2.4], 2.3, 0.5), 1);
      d = ssub(d, sdSphere(ax, y, z, 2.3, 34.2, 9.1, 0.95), 0.4);
      // tail wrapped round the right side of the base
      d = smin(d, sdCapsule(x, y, z, [6, 4.6, -10.5], [9.2, 4.6, -1.5], 1.7), 1.2);
      d = smin(d, sdCapsule(x, y, z, [9.2, 4.6, -1.5], [7.5, 4.6, 6.5], 1.6), 1.2);
      d = smin(d, sdCapsule(x, y, z, [7.5, 4.6, 6.5], [4.5, 4.6, 10.5], 1.4), 1.2);
      return d;
    }
  },
  {
    id: 'owl', label: 'Owl', subject: 'a bird',
    note: 'An owl is an egg with a face. Get the egg, then carve the two dish-shaped facial discs that make it read as an owl.',
    sdf(x, y, z) {
      const ax = mirrorX(x);
      let d = sdRoundBox(x, y, z, 0, 2, 0, 15, 2, 10, 1);
      d = smin(d, sdCapsule(x, y, z, [-15, 5.5, 1], [15, 5.5, 1], 3.2), 1);
      d = smin(d, sdEllipsoid(x, y, z, 0, 22, 0, 12, 15, 11), 2);
      d = smin(d, sdEllipsoid(x, y, z, 0, 37.5, 1, 11.3, 9, 10), 4);
      d = smin(d, sdEllipsoid(ax, y, z, 10.5, 22, -1, 3.6, 12, 8.5), 2);
      d = smin(d, sdTaper(ax, y, z, [7, 43.5, 0], [9.6, 50.5, -1.5], 2.6, 0.7), 1.2);
      d = ssub(d, sdSphere(ax, y, z, 4.7, 38.3, 13.9, 5.2), 1);
      d = smin(d, sdSphere(ax, y, z, 4.5, 38.5, 8.7, 2.4), 0.5);
      d = smin(d, sdTaper(x, y, z, [0, 37.4, 9.4], [0, 33.4, 11.2], 1.5, 0.45), 0.6);
      for (let i = 0; i < 3; i++) d = smin(d, sdCapsule(ax, y, z, [3 + i * 1.6, 6.2, 3.5], [3.4 + i * 2, 6.2, 7.2], 1.05), 0.8);
      return d;
    }
  },
  {
    id: 'rabbit', label: 'Crouching rabbit', subject: 'an animal',
    note: 'Long ears are a test. Real carvers leave a strut of stone (a puntello) behind thin parts until the very end.',
    sdf(x, y, z) {
      const ax = mirrorX(x);
      let d = sdRoundBox(x, y, z, 0, 2, 0, 14, 2, 16, 1);
      d = smin(d, sdEllipsoid(x, y, z, 0, 13.5, -4, 11, 10, 12), 3);
      d = smin(d, sdEllipsoid(ax, y, z, 6.5, 10.5, -6, 5, 7, 8), 2);
      d = smin(d, sdEllipsoid(x, y, z, 0, 23.5, 7.5, 6.6, 6.2, 7.6), 3);
      d = smin(d, sdEllipsoid(x, y, z, 0, 21.3, 13.2, 3.6, 3.1, 2.8), 1.2);
      d = smin(d, sdTaper(ax, y, z, [2.6, 27.5, 5.6], [4.6, 44.5, 0.8], 2.3, 1.5), 1.2);
      d = smin(d, sdEllipsoid(x, y, z, 0, 14, 5.5, 6.2, 7.5, 6), 3); // chest under the chin
      d = smin(d, sdCapsule(ax, y, z, [3.3, 4.8, 11.2], [3.3, 8.5, 9.4], 1.8), 1.2); // front paws tucked under
      d = smin(d, sdSphere(x, y, z, 0, 13, -15.4, 3.1), 1.2);
      d = smin(d, sdSphere(ax, y, z, 4.5, 25.2, 11.1, 1.25), 0.4);
      return d;
    }
  },
  {
    id: 'fist', label: 'Clenched fist', subject: 'a body part',
    note: 'Ancient Egyptian workshops kept carved hands as models for apprentices. Count the knuckles before you cut between fingers.',
    sdf(x, y, z) {
      let d = sdRoundBox(x, y, z, 0, 2, 0, 12, 2, 10, 1);
      d = smin(d, sdRoundBox(x, y, z, 0, 10, 0, 6.3, 7, 4.6, 2.5), 2);
      d = smin(d, sdRoundBox(x, y, z, 0, 21.5, 0, 8.6, 7, 5.6, 3), 2);
      for (let i = 0; i < 4; i++) {
        const fx = -6 + i * 4, top = 30.2 - Math.abs(i - 1.3) * 0.7;
        d = smin(d, sdCapsule(x, y, z, [fx, top - 0.5, -1.5], [fx, top, 5.4], 2.05), 0.6);
        d = smin(d, sdCapsule(x, y, z, [fx, top, 5.4], [fx, top - 5, 6.6], 1.95), 0.5);
        d = smin(d, sdCapsule(x, y, z, [fx, top - 5, 6.6], [fx, top - 8, 4.6], 1.85), 0.5);
      }
      d = smin(d, sdCapsule(x, y, z, [-8.6, 20.5, 1], [-6.2, 25.6, 6.2], 2.4), 1.2);
      d = smin(d, sdCapsule(x, y, z, [-6.2, 25.6, 6.2], [-1.2, 25.2, 8.2], 2.1), 0.8);
      return d;
    }
  }
];

// Signed distance (voxels, + outside) of a preset figure over the whole lattice.
export function referenceFromPreset(s, id) {
  const preset = REFERENCES.find(r => r.id === id);
  if (!preset) throw new Error('Unknown reference ' + id);
  const { nx, ny, nz, h } = s, sd = new Float32Array(nx * ny * nz);
  const X = x => (x - (nx - 1) / 2) * h, Y = y => (y - 0.5) * h, Z = z => (z - (nz - 1) / 2) * h;
  // Far from the surface a coarse grid is plenty; evaluate exactly only near it.
  const S = 3, cx = Math.ceil((nx - 1) / S) + 1, cy = Math.ceil((ny - 1) / S) + 1, cz = Math.ceil((nz - 1) / S) + 1;
  const coarse = new Float32Array(cx * cy * cz);
  for (let k = 0, z = 0; z < cz; z++) for (let y = 0; y < cy; y++) for (let x = 0; x < cx; x++, k++) coarse[k] = preset.sdf(X(x * S), Y(y * S), Z(z * S)) / h;
  const near = S * 1.8 + 2;
  let i = 0;
  for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++, i++) {
    const v = sampleField(coarse, cx, cy, cz, x / S, y / S, z / S);
    sd[i] = Math.abs(v) < near ? preset.sdf(X(x), Y(y), Z(z)) / h : v;
  }
  clipToBlock(s, sd);
  return sd;
}

// Nothing outside the block can be part of the figure.
function clipToBlock(s, sd) {
  const { nx, ny, nz } = s;
  for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const out = Math.max(0.5 - x, x - (nx - 1.5), 0.5 - y, y - (ny - 1.5), 0.5 - z, z - (nz - 1.5));
    const i = idx(s, x, y, z);
    if (out > sd[i]) sd[i] = out;
  }
}

/* ── Distance transforms (Felzenszwalb & Huttenlocher) ─────────── */

const INF = 1e20;
function edt1d(f, n, d, v, zz) {
  let k = 0;
  v[0] = 0; zz[0] = -INF; zz[1] = INF;
  for (let q = 1; q < n; q++) {
    let s;
    do {
      const p = v[k];
      s = ((f[q] + q * q) - (f[p] + p * p)) / (2 * q - 2 * p);
    } while (s <= zz[k] && --k >= 0);
    k++;
    v[k] = q; zz[k] = s; zz[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (zz[k + 1] < q) k++;
    const p = v[k];
    d[q] = (q - p) * (q - p) + f[p];
  }
}

// Squared distance to the nearest voxel where seed is true, separably along x, y, z.
function edtSquared(seed, nx, ny, nz) {
  const n = nx * ny * nz, g = new Float64Array(n);
  for (let i = 0; i < n; i++) g[i] = seed(i) ? 0 : INF;
  const m = Math.max(nx, ny, nz), f = new Float64Array(m), d = new Float64Array(m), v = new Int32Array(m), zz = new Float64Array(m + 1);
  const pass = (count, stride, lines) => {
    for (const start of lines) {
      for (let q = 0; q < count; q++) f[q] = g[start + q * stride];
      edt1d(f, count, d, v, zz);
      for (let q = 0; q < count; q++) g[start + q * stride] = d[q];
    }
  };
  const linesX = [], linesY = [], linesZ = [];
  for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) linesX.push(nx * (y + ny * z));
  for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) linesY.push(x + nx * ny * z);
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) linesZ.push(x + nx * y);
  pass(nx, 1, linesX);
  if (ny > 1) pass(ny, nx, linesY);
  if (nz > 1) pass(nz, nx * ny, linesZ);
  return g;
}

// Signed distance (+ outside) from an inside/outside mask.
export function signedDistance(mask, nx, ny, nz = 1) {
  const out = edtSquared(i => mask[i], nx, ny, nz);
  const inn = edtSquared(i => !mask[i], nx, ny, nz);
  const sd = new Float32Array(mask.length);
  for (let i = 0; i < mask.length; i++) sd[i] = mask[i] ? 0.5 - Math.sqrt(inn[i]) : Math.sqrt(out[i]) - 0.5;
  return sd;
}

// "Draw it on the block": a front silhouette (nx × ny, x right, y up) and a side
// silhouette (nz × ny, z toward the viewer on the right). The block-out is where both
// drawings agree, the same way a carver works in from the front and side faces.
export function referenceFromProfiles(s, front, side) {
  const { nx, ny, nz } = s;
  const sdF = signedDistance(front, nx, ny), sdS = signedDistance(side, nz, ny);
  const sd = new Float32Array(nx * ny * nz);
  for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++)
    sd[idx(s, x, y, z)] = Math.max(sdF[x + nx * y], sdS[z + nz * y]);
  clipToBlock(s, sd);
  return sd;
}

export function referenceFromMask(s, mask) {
  const sd = signedDistance(mask, s.nx, s.ny, s.nz);
  clipToBlock(s, sd);
  return sd;
}

/* ── Maquettes from a mesh (STL) ───────────────────────────────── */

export function parseSTL(buffer) {
  const bytes = new Uint8Array(buffer), view = new DataView(buffer);
  if (bytes.length >= 84) {
    const count = view.getUint32(80, true);
    if (84 + count * 50 === bytes.length) {
      const tris = new Float32Array(count * 9);
      for (let t = 0; t < count; t++) for (let k = 0; k < 9; k++) tris[t * 9 + k] = view.getFloat32(84 + t * 50 + 12 + k * 4, true);
      return tris;
    }
  }
  const text = new TextDecoder().decode(bytes), out = [];
  const re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g;
  let m;
  while ((m = re.exec(text))) out.push(+m[1], +m[2], +m[3]);
  if (!out.length || out.length % 9) throw new Error('That file is not an STL mesh this studio can read.');
  return new Float32Array(out);
}

// Fits a triangle mesh inside the block (standing on its base) and fills it. up: 'z' for
// CAD and Workbench exports, 'y' for most game and animation apps.
export function voxelizeMesh(s, tris, { up = 'z', marginCm = 1.2 } = {}) {
  const t = new Float32Array(tris.length);
  for (let i = 0; i < tris.length; i += 3) {
    if (up === 'z') { t[i] = tris[i]; t[i + 1] = tris[i + 2]; t[i + 2] = -tris[i + 1]; }
    else { t[i] = tris[i]; t[i + 1] = tris[i + 1]; t[i + 2] = tris[i + 2]; }
  }
  const lo = [1e30, 1e30, 1e30], hi = [-1e30, -1e30, -1e30];
  for (let i = 0; i < t.length; i += 3) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], t[i + a]); hi[a] = Math.max(hi[a], t[i + a]); }
  const span = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
  if (!(span[0] > 0 && span[1] > 0 && span[2] > 0)) throw new Error('The mesh is flat or empty.');
  const room = [s.block.w - 2 * marginCm, s.block.h - marginCm, s.block.d - 2 * marginCm];
  const k = Math.min(room[0] / span[0], room[1] / span[1], room[2] / span[2]) / s.h; // lattice units per mesh unit
  const off = [(s.nx - 1) / 2 - (lo[0] + span[0] / 2) * k, 0.5 - lo[1] * k + 0.02, (s.nz - 1) / 2 - (lo[2] + span[2] / 2) * k];
  for (let i = 0; i < t.length; i += 3) for (let a = 0; a < 3; a++) t[i + a] = t[i + a] * k + off[a];
  const votes = new Uint8Array(s.nx * s.ny * s.nz);
  parityFill(s, t, 2, votes);
  parityFill(s, t, 0, votes);
  parityFill(s, t, 1, votes);
  const mask = new Uint8Array(votes.length);
  for (let i = 0; i < votes.length; i++) mask[i] = votes[i] >= 2 ? 1 : 0;
  return { mask, scaleCmPerUnit: k * s.h };
}

// Casts one ray per lattice column along `axis` and fills between crossing pairs.
function parityFill(s, t, axis, votes) {
  const dims = [s.nx, s.ny, s.nz];
  const a = (axis + 1) % 3, b = (axis + 2) % 3;
  const na = dims[a], nb = dims[b], cols = new Array(na * nb);
  const ea = 1.234e-4, eb = 2.345e-4; // nudge rays off edges and vertices
  for (let i = 0; i < t.length; i += 9) {
    const pa = [t[i + a], t[i + 3 + a], t[i + 6 + a]], pb = [t[i + b], t[i + 3 + b], t[i + 6 + b]], pc = [t[i + axis], t[i + 3 + axis], t[i + 6 + axis]];
    const a0 = Math.max(0, Math.ceil(Math.min(...pa))), a1 = Math.min(na - 1, Math.floor(Math.max(...pa)));
    const b0 = Math.max(0, Math.ceil(Math.min(...pb))), b1 = Math.min(nb - 1, Math.floor(Math.max(...pb)));
    const det = (pb[1] - pb[2]) * (pa[0] - pa[2]) + (pa[2] - pa[1]) * (pb[0] - pb[2]);
    if (Math.abs(det) < 1e-12) continue;
    for (let ia = a0; ia <= a1; ia++) for (let ib = b0; ib <= b1; ib++) {
      const qa = ia + ea, qb = ib + eb;
      const l1 = ((pb[1] - pb[2]) * (qa - pa[2]) + (pa[2] - pa[1]) * (qb - pb[2])) / det;
      const l2 = ((pb[2] - pb[0]) * (qa - pa[2]) + (pa[0] - pa[2]) * (qb - pb[2])) / det;
      const l3 = 1 - l1 - l2;
      if (l1 < 0 || l2 < 0 || l3 < 0) continue;
      const c = ia + na * ib;
      (cols[c] || (cols[c] = [])).push(l1 * pc[0] + l2 * pc[1] + l3 * pc[2]);
    }
  }
  const strides = [1, s.nx, s.nx * s.ny];
  for (let c = 0; c < cols.length; c++) {
    const hits = cols[c];
    if (!hits || hits.length < 2) continue;
    hits.sort((p, q) => p - q);
    const ia = c % na, ib = (c / na) | 0, base = ia * strides[a] + ib * strides[b];
    for (let k = 0; k + 1 < hits.length; k += 2) {
      const from = Math.max(1, Math.ceil(hits[k])), to = Math.min(dims[axis] - 2, Math.floor(hits[k + 1]));
      for (let q = from; q <= to; q++) votes[base + q * strides[axis]]++;
    }
  }
}

/* ── The pointing machine ──────────────────────────────────────── */

// Evenly spread points on the reference surface, each with its outward normal.
export function pointingPoints(s, ref, count = 64, seed = 7) {
  const { nx, ny, nz } = s, cands = [];
  for (let z = 1; z < nz - 1; z++) for (let y = 2; y < ny - 1; y++) for (let x = 1; x < nx - 1; x++) {
    const v = ref[idx(s, x, y, z)];
    if (v > -0.8 && v <= 0.3) cands.push(x, y, z);
  }
  const total = cands.length / 3;
  if (!total) return new Float32Array(0);
  const R = Math.max(2, Math.sqrt(total / count) * 0.75);
  const random = rng(seed), order = new Uint32Array(total);
  for (let i = 0; i < total; i++) order[i] = i;
  for (let i = total - 1; i > 0; i--) { const j = (random() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
  const cell = new Map(), out = [];
  const key = (x, y, z) => ((x / R) | 0) + ',' + ((y / R) | 0) + ',' + ((z / R) | 0);
  for (const o of order) {
    const x = cands[o * 3], y = cands[o * 3 + 1], z = cands[o * 3 + 2];
    const g = [
      sampleField(ref, nx, ny, nz, x + 1, y, z) - sampleField(ref, nx, ny, nz, x - 1, y, z),
      sampleField(ref, nx, ny, nz, x, y + 1, z) - sampleField(ref, nx, ny, nz, x, y - 1, z),
      sampleField(ref, nx, ny, nz, x, y, z + 1) - sampleField(ref, nx, ny, nz, x, y, z - 1)
    ];
    const n = norm3(g);
    if (n[1] < -0.6) continue; // undersides can't be reached from outside
    // the needle must reach the point without passing through another part of the figure
    let blocked = false;
    for (let t = 1.5; t < 10 / s.h && !blocked; t += 0.75) blocked = sampleField(ref, nx, ny, nz, x + n[0] * t, y + n[1] * t, z + n[2] * t) < 0;
    if (blocked) continue;
    const gx = (x / R) | 0, gy = (y / R) | 0, gz = (z / R) | 0;
    let near = false;
    for (let dz = -1; dz <= 1 && !near; dz++) for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1 && !near; dx++) {
      const list = cell.get((gx + dx) + ',' + (gy + dy) + ',' + (gz + dz));
      if (list) for (const p of list) if (Math.hypot(p[0] - x, p[1] - y, p[2] - z) < R) { near = true; break; }
    }
    if (near) continue;
    const k = key(x, y, z);
    (cell.get(k) || cell.set(k, []).get(k)).push([x, y, z]);
    // put the point exactly on the zero surface
    const sd = ref[idx(s, x, y, z)];
    out.push(x - n[0] * sd, y - n[1] * sd, z - n[2] * sd, n[0], n[1], n[2]);
    if (out.length / 6 >= count) break;
  }
  return new Float32Array(out);
}

// Stone still standing over each point, measured outward along its normal (voxels).
// Negative = the stone has been cut below the point (an over-cut).
export function pointDepths(s, pts, max = 60) {
  const out = new Float32Array(pts.length / 6);
  for (let k = 0; k < out.length; k++) {
    const x = pts[k * 6], y = pts[k * 6 + 1], z = pts[k * 6 + 2], n = [pts[k * 6 + 3], pts[k * 6 + 4], pts[k * 6 + 5]];
    if (sample(s, x, y, z) > ISO) {
      let t = 0;
      while (t < max && sample(s, x + n[0] * t, y + n[1] * t, z + n[2] * t) > ISO) t += 0.25;
      out[k] = t;
    } else {
      let t = 0;
      while (t < max && sample(s, x - n[0] * t, y - n[1] * t, z - n[2] * t) <= ISO) t += 0.25;
      out[k] = -t;
    }
  }
  return out;
}

/* ── Likeness ──────────────────────────────────────────────────── */

// How far the carving has come and how closely it matches the reference. `stages`
// reports, per autopilot stage, the share of its work already done.
export function measure(s, ref) {
  const { nx, ny, nz, density, finish } = s, sy = nx, sz = nx * ny;
  const cut = STAGES.filter(st => st.radiusCm).map(st => ({ id: st.id, thr: st.leaveCm / s.h + 0.5, total: 0, left: 0 }));
  let solid = 0, refIn = 0, kept = 0, overcut = 0, excess = 0, excess0 = 0, inter = 0, union = 0, skin = 0, rasped = 0, polished = 0;
  const silS = { front: new Uint8Array(nx * ny), side: new Uint8Array(nz * ny) };
  const silR = { front: new Uint8Array(nx * ny), side: new Uint8Array(nz * ny) };
  for (let z = 1; z < nz - 1; z++) for (let y = 1; y < ny - 1; y++) {
    let i = idx(s, 1, y, z);
    for (let x = 1; x < nx - 1; x++, i++) {
      const on = density[i] >= 128;
      if (on) {
        solid++; silS.front[x + nx * y] = 1; silS.side[z + nz * y] = 1;
        if (density[i - 1] < 128 || density[i + 1] < 128 || density[i - sy] < 128 || density[i + sy] < 128 || density[i - sz] < 128 || density[i + sz] < 128) {
          skin++;
          if (finish[i] >= 200) rasped++;
          if (finish[i] >= 245) polished++;
        }
      }
      if (!ref) continue;
      const r = ref[i], inside = r < 0;
      if (inside) { silR.front[x + nx * y] = 1; silR.side[z + nz * y] = 1; }
      if (on && inside) inter++;
      if (on || inside) union++;
      if (r < -1) { refIn++; if (on) kept++; else overcut++; }
      if (r > 1) { excess0++; if (on) excess++; }
      for (const c of cut) if (r > c.thr) { c.total++; if (on) c.left++; }
    }
  }
  const out = {
    solidVoxels: solid,
    massKg: (solid * s.h ** 3 * MARBLE_G_PER_CM3) / 1000,
    rasped: skin ? rasped / skin : 0,
    polished: skin ? polished / skin : 0
  };
  if (!ref) return out;
  const iou2 = (a, b) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { if (a[k] && b[k]) i++; if (a[k] || b[k]) u++; } return u ? i / u : 1; };
  out.roughedOut = excess0 ? 1 - excess / excess0 : 1;
  out.stages = Object.fromEntries(cut.map(c => [c.id, c.total ? 1 - c.left / c.total : 1]));
  out.kept = refIn ? kept / refIn : 1;
  out.overcutCm3 = overcut * s.h ** 3;
  out.iou = union ? inter / union : 1;
  out.silhouetteFront = iou2(silS.front, silR.front);
  out.silhouetteSide = iou2(silS.side, silR.side);
  out.likeness = 0.5 * out.iou + 0.25 * out.silhouetteFront + 0.25 * out.silhouetteSide;
  return out;
}

/* ── Autopilot: the workshop's roughing-out plan ───────────────── */

// Each stage carves down to `leaveCm` of stone outside the reference.
export const STAGES = [
  { id: 'drill', label: 'Drill the points', tool: 'drill', leaveCm: 1.5,
    why: 'Holes drilled to just short of each measured point tell the carver how deep to go.' },
  { id: 'rough', label: 'Rough out', tool: 'point', leaveCm: 2, radiusCm: 3.1,
    why: 'The point chisel knocks off everything that is clearly not the statue.' },
  { id: 'model', label: 'Model the forms', tool: 'claw', leaveCm: 0.7, radiusCm: 1.4,
    why: 'The claw chisel shapes the big masses, crossing its grooves to find the true surface.' },
  { id: 'define', label: 'Define planes', tool: 'flat', leaveCm: 0.15, radiusCm: 0.8,
    why: 'The flat chisel cuts clean planes and crisp edges down to the skin.' },
  { id: 'rasp', label: 'Rasp smooth', tool: 'rasp', leaveCm: 0,
    why: 'Rasps and rifflers file the chisel marks away and blend the planes.' },
  { id: 'polish', label: 'Polish', tool: 'polish', leaveCm: 0,
    why: 'Pumice and finer abrasives make the marble glow.' }
];

// Voxels the stage still has to deal with, in carving order.
export function planStage(s, ref, stage, seed = 3) {
  const { nx, ny, nz, density } = s, random = rng(seed);
  const thr = stage.leaveCm / s.h, list = [];
  const finishing = stage.id === 'rasp' || stage.id === 'polish';
  for (let z = 1; z < nz - 1; z++) for (let y = 1; y < ny - 1; y++) {
    let i = idx(s, 1, y, z);
    for (let x = 1; x < nx - 1; x++, i++) {
      if (density[i] < 1) continue;
      const r = ref[i];
      if (finishing ? Math.abs(r) < 1.6 : (density[i] >= 128 && r > thr + 0.5)) list.push(i);
    }
  }
  // Rough-out peels the block evenly from the outside in, as a carver does; later stages
  // sweep top-down. A counting sort on an integer key (smallest first) with a little
  // jitter, so the work looks like a carver's rather than a printer's.
  const K = 1024, keys = new Uint16Array(list.length), count = new Uint32Array(K + 1);
  for (let k = 0; k < list.length; k++) {
    const i = list[k], x = i % nx, y = ((i / nx) | 0) % ny, z = (i / (nx * ny)) | 0;
    const depth = Math.min(x - 1, nx - 2 - x, ny - 2 - y, z - 1, nz - 2 - z);
    const key = stage.id === 'rough' ? depth * 1.5 + random() * 4 : (ny - y) + random() * 9;
    keys[k] = clamp(key | 0, 0, K - 1);
    count[keys[k] + 1]++;
  }
  for (let k = 0; k < K; k++) count[k + 1] += count[k];
  const queue = new Int32Array(list.length);
  for (let k = 0; k < list.length; k++) queue[count[keys[k]]++] = list[k];
  return { stage, thr, queue, pos: 0 };
}

// One autopilot action on queue item i. Returns the hit point (lattice) or null if the
// item no longer needs work.
export function autoStep(s, ref, plan, i, random = Math.random) {
  const { stage, thr } = plan, { nx, ny, nz } = s;
  const x = i % nx, y = ((i / nx) | 0) % ny, z = (i / (nx * ny)) | 0;
  const grad = norm3([
    sampleField(ref, nx, ny, nz, x + 1, y, z) - sampleField(ref, nx, ny, nz, x - 1, y, z),
    sampleField(ref, nx, ny, nz, x, y + 1, z) - sampleField(ref, nx, ny, nz, x, y - 1, z),
    sampleField(ref, nx, ny, nz, x, y, z + 1) - sampleField(ref, nx, ny, nz, x, y, z - 1)
  ]);
  const dir = [-grad[0], -grad[1], -grad[2]];
  if (stage.id === 'rasp') {
    if (!s.density[i]) return null;
    const r = 2;
    touch(s, x - r, y - r, z - r, x + r, y + r, z + r);
    let changed = false;
    for (let dz = -r; dz <= r; dz++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const j = idx(s, clamp(x + dx, 1, nx - 2), clamp(y + dy, 1, ny - 2), clamp(z + dz, 1, nz - 2));
      if (!s.density[j]) continue;
      const target = Math.round(255 * clamp(0.5 - ref[j] / 1.25, 0, 1));
      if (target < s.density[j]) { s.density[j] = target; changed = true; }
      if (s.density[j] && s.finish[j] < 205) { s.finish[j] = 205; changed = true; }
    }
    return changed ? [x, y, z, dir] : null;
  }
  if (stage.id === 'polish') {
    if (!s.density[i] || s.finish[i] >= 250) return null;
    const res = polish(s, TOOLS.polish, [x, y, z], 1);
    return res.polished ? [x, y, z, dir] : null;
  }
  if (s.density[i] < 128 || ref[i] <= thr + 0.5) return null;
  const rad = stage.radiusCm / s.h;
  const c = [x + grad[0] * rad * 0.35, y + grad[1] * rad * 0.35, z + grad[2] * rad * 0.35];
  const [u, v] = basis(dir);
  const cutters = [{ c, ax: [u, v, dir], r: [rad, rad, rad] }];
  if (stage.id === 'rough') for (let k = 0; k < 2; k++) {
    const a = random() * Math.PI * 2, rr = rad * (0.4 + random() * 0.3);
    cutters.push({ c: [c[0] + (u[0] * Math.cos(a) + v[0] * Math.sin(a)) * rad * 0.8, c[1] + (u[1] * Math.cos(a) + v[1] * Math.sin(a)) * rad * 0.8, c[2] + (u[2] * Math.cos(a) + v[2] * Math.sin(a)) * rad * 0.8], ax: [u, v, dir], r: [rr, rr, rr] });
  }
  const removed = applyCutters(s, cutters, TOOLS[stage.tool].finish, { ref, floor: thr });
  return removed > 0 ? [x, y, z, dir] : null;
}

// Drill one hole at pointing point k, stopping `leaveCm` short of it. Returns the hole's
// [top, bottom] in lattice coordinates, or null when the stone there is already that thin.
export function drillOne(s, ref, pts, k, leaveCm = 1.5) {
  const leave = leaveCm / s.h, r = TOOLS.drill.radius / s.h;
  const p = [pts[k * 6], pts[k * 6 + 1], pts[k * 6 + 2]], n = [pts[k * 6 + 3], pts[k * 6 + 4], pts[k * 6 + 5]];
  let t = 0;
  while (t < 80 && sample(s, p[0] + n[0] * t, p[1] + n[1] * t, p[2] + n[2] * t) > ISO) t += 0.5;
  if (t <= leave + 0.5) return null;
  const top = [p[0] + n[0] * (t + 1), p[1] + n[1] * (t + 1), p[2] + n[2] * (t + 1)];
  const bottom = [p[0] + n[0] * leave, p[1] + n[1] * leave, p[2] + n[2] * leave];
  applyCutters(s, [{ a: top, b: bottom, r: Math.max(r, 0.7) }], TOOLS.drill.finish, { ref, floor: leave * 0.9 });
  return [top, bottom];
}

export function drillPoints(s, ref, pts, leaveCm = 1.5) {
  const holes = [];
  for (let k = 0; k < pts.length / 6; k++) { const hole = drillOne(s, ref, pts, k, leaveCm); if (hole) holes.push(hole); }
  return holes;
}

/* ── Saving ────────────────────────────────────────────────────── */

export function rle(bytes) {
  const out = [];
  for (let i = 0; i < bytes.length;) {
    const v = bytes[i];
    let run = 1;
    while (i + run < bytes.length && bytes[i + run] === v && run < 0x3fff) run++;
    if (run < 0x80) out.push(v, run); else out.push(v, 0x80 | (run >> 7), run & 0x7f);
    i += run;
  }
  return Uint8Array.from(out);
}

export function unrle(data, length) {
  const out = new Uint8Array(length);
  let o = 0;
  for (let i = 0; i < data.length && o < length;) {
    const v = data[i++];
    let run = data[i++];
    if (run & 0x80) run = ((run & 0x7f) << 7) | data[i++];
    out.fill(v, o, Math.min(length, o + run));
    o += run;
  }
  return out;
}

export function toBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function fromBase64(text) {
  const bin = atob(text), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function encodeStone(s) {
  return { v: 1, h: s.h, nx: s.nx, ny: s.ny, nz: s.nz, density: toBase64(rle(s.density)), finish: toBase64(rle(s.finish)) };
}

export function decodeInto(s, data) {
  if (!data || data.nx !== s.nx || data.ny !== s.ny || data.nz !== s.nz) throw new Error('This sculpture was saved at a different block size.');
  s.density.set(unrle(fromBase64(data.density), s.density.length));
  s.finish.set(unrle(fromBase64(data.finish), s.finish.length));
  markAll(s);
}

/* ── STL export ────────────────────────────────────────────────── */

// The whole carving as a binary STL, scaled so it stands heightMm tall, base at z = 0
// (Z-up, the way slicers expect).
export function exportSTL(s, { heightMm = 100 } = {}) {
  const m = meshRegion(s, 0, 0, 0, s.nx - 1, s.ny - 1, s.nz - 1);
  if (!m) throw new Error('There is no stone left to export.');
  const p = m.positions, tri = m.index;
  let minY = 1e9, maxY = -1e9;
  for (let i = 1; i < p.length; i += 3) { minY = Math.min(minY, p[i]); maxY = Math.max(maxY, p[i]); }
  const k = heightMm / Math.max(1e-6, maxY - minY), cx = (s.nx - 1) / 2, cz = (s.nz - 1) / 2;
  const count = tri.length / 3, buf = new ArrayBuffer(84 + count * 50), view = new DataView(buf);
  const header = 'ClassroomOS Marble Studio carving';
  for (let i = 0; i < header.length; i++) view.setUint8(i, header.charCodeAt(i));
  view.setUint32(80, count, true);
  const P = j => [(p[j * 3] - cx) * k, -(p[j * 3 + 2] - cz) * k, (p[j * 3 + 1] - minY) * k]; // y-up lattice → z-up mm
  let o = 84;
  for (let t = 0; t < count; t++) {
    const a = P(tri[t * 3]), b = P(tri[t * 3 + 1]), c = P(tri[t * 3 + 2]);
    const n = norm3(cross([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]]));
    for (const v of [n, a, b, c]) for (let q = 0; q < 3; q++) { view.setFloat32(o, v[q], true); o += 4; }
    o += 2;
  }
  return buf;
}
