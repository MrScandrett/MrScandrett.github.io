// Perspective City: pure geometry for the plan → skyline lesson.
// No DOM. A building is a footprint (one or more closed loops: the first is the
// outline, the rest are holes) extruded to a height, optionally stepped back in
// tiers and capped with a pyramid. The sketch view is one-point perspective with
// the camera looking straight down: every vertical edge runs toward one
// vanishing point, and a roof keeps its true shape, only scaled by D / (D − z).
//
// Plan units: the plan is GRID × GRID cells, y down (screen convention).

export const GRID = 24;
export const MAX_HEIGHT = 20;

export const MARKERS = {
  ink: '#1f2328',
  green: '#1f9d55',
  orange: '#ef7d22',
  red: '#d7342b',
  blue: '#2563eb',
  purple: '#7c3aed',
  brown: '#8a4b2a'
};

// ── Polygon basics ───────────────────────────────────────────────

export function signedArea(loop) {
  let a = 0;
  for (let i = 0; i < loop.length; i++) {
    const [x1, y1] = loop[i];
    const [x2, y2] = loop[(i + 1) % loop.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

export function area(loops) {
  return loops.reduce((s, l, i) => s + (i === 0 ? 1 : -1) * Math.abs(signedArea(l)), 0);
}

export function centroid(loop) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < loop.length; i++) {
    const [x1, y1] = loop[i];
    const [x2, y2] = loop[(i + 1) % loop.length];
    const c = x1 * y2 - x2 * y1;
    a += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c;
  }
  if (Math.abs(a) < 1e-9) {
    const n = loop.length || 1;
    return [loop.reduce((s, p) => s + p[0], 0) / n, loop.reduce((s, p) => s + p[1], 0) / n];
  }
  return [cx / (3 * a), cy / (3 * a)];
}

/** Orient so the outline winds positive (y-down screen: clockwise on screen) and holes negative. */
export function normalizeLoops(loops) {
  return loops.map((loop, i) => {
    const a = signedArea(loop);
    const want = i === 0 ? 1 : -1;
    return Math.sign(a) === want ? loop.map(p => [p[0], p[1]]) : loop.slice().reverse().map(p => [p[0], p[1]]);
  });
}

/** Even-odd point test across every loop, so holes count as outside. */
export function pointInLoops(pt, loops) {
  let inside = false;
  for (const loop of loops) {
    for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
      const [xi, yi] = loop[i], [xj, yj] = loop[j];
      if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

export function bounds(loops) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const l of loops) for (const [x, y] of l) {
    if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}

function segmentsCross(a, b, c, d) {
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}

/** True when a hand-drawn polygon crosses itself (it could not be built). */
export function selfIntersects(loop) {
  const n = loop.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue;
      if (segmentsCross(loop[i], loop[(i + 1) % n], loop[j], loop[(j + 1) % n])) return true;
    }
  }
  return false;
}

export function translateLoops(loops, dx, dy) {
  return loops.map(l => l.map(([x, y]) => [x + dx, y + dy]));
}

export function scaleLoops(loops, s, about) {
  const [cx, cy] = about;
  return loops.map(l => l.map(([x, y]) => [cx + (x - cx) * s, cy + (y - cy) * s]));
}

// ── Stamps (footprints from the sketchbook) ──────────────────────

export function rectLoop(x0, y0, x1, y1) {
  const a = Math.min(x0, x1), b = Math.max(x0, x1), c = Math.min(y0, y1), d = Math.max(y0, y1);
  return [[a, c], [b, c], [b, d], [a, d]];
}

function ngon(cx, cy, r, n, rot = -Math.PI / 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = rot + (i / n) * Math.PI * 2;
    out.push([+(cx + r * Math.cos(t)).toFixed(3), +(cy + r * Math.sin(t)).toFixed(3)]);
  }
  return out;
}

/** Each stamp: (cx, cy, s) → loops. s is half the stamp's width in plan units. */
export const STAMPS = {
  box: { label: 'Box', make: (x, y, s) => [rectLoop(x - s, y - s, x + s, y + s)] },
  slab: { label: 'Slab', make: (x, y, s) => [rectLoop(x - s, y - s / 2, x + s, y + s / 2)] },
  ell: { label: 'L', make: (x, y, s) => [[[x - s, y - s], [x, y - s], [x, y], [x + s, y], [x + s, y + s], [x - s, y + s]]] },
  tee: { label: 'T', make: (x, y, s) => { const t = s / 2; return [[[x - s, y - s], [x + s, y - s], [x + s, y - t], [x + t, y - t], [x + t, y + s], [x - t, y + s], [x - t, y - t], [x - s, y - t]]]; } },
  plus: { label: 'Plus', make: (x, y, s) => { const t = s / 3; return [[[x - t, y - s], [x + t, y - s], [x + t, y - t], [x + s, y - t], [x + s, y + t], [x + t, y + t], [x + t, y + s], [x - t, y + s], [x - t, y + t], [x - s, y + t], [x - s, y - t], [x - t, y - t]]]; } },
  tri: { label: 'Triangle', make: (x, y, s) => [[[x, y - s], [x + s, y + s], [x - s, y + s]]] },
  wedge: { label: 'Wedge', make: (x, y, s) => [[[x - s, y - s], [x + s, y + s], [x - s, y + s]]] },
  hex: { label: 'Hexagon', make: (x, y, s) => [ngon(x, y, s, 6, 0)] },
  round: { label: 'Tower', make: (x, y, s) => [ngon(x, y, s, 16)] },
  ring: { label: 'Courtyard', make: (x, y, s) => { const h = Math.max(0.5, s / 2); return [rectLoop(x - s, y - s, x + s, y + s), rectLoop(x - h, y - h, x + h, y + h)]; } },
  star: { label: 'Star', make: (x, y, s) => { const o = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.45 : s; const t = -Math.PI / 2 + (i * Math.PI) / 5; o.push([+(x + r * Math.cos(t)).toFixed(3), +(y + r * Math.sin(t)).toFixed(3)]); } return [o]; } }
};

// ── Block letters, traced from grid cells ────────────────────────

export const FONT = {
  A: ['#####', '#...#', '#####', '#...#', '#...#'], B: ['####.', '#..#.', '#####', '#...#', '#####'], C: ['#####', '#....', '#....', '#....', '#####'],
  D: ['####.', '#..##', '#...#', '#..##', '####.'], E: ['#####', '#....', '####.', '#....', '#####'], F: ['#####', '#....', '####.', '#....', '#....'],
  G: ['#####', '#....', '#.###', '#...#', '#####'], H: ['#...#', '#...#', '#####', '#...#', '#...#'], I: ['#####', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '#..#.', '####.'], K: ['#..##', '#.##.', '###..', '#.##.', '#..##'], L: ['#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#####', '#.#.#', '#...#'], N: ['##..#', '###.#', '#.###', '#..##', '#...#'], O: ['#####', '#...#', '#...#', '#...#', '#####'],
  P: ['#####', '#...#', '#####', '#....', '#....'], Q: ['####.', '#..#.', '#..#.', '#####', '...##'], R: ['####.', '#..#.', '####.', '#..#.', '#..##'],
  S: ['#####', '#....', '#####', '....#', '#####'], T: ['#####', '..#..', '..#..', '..#..', '..#..'], U: ['#...#', '#...#', '#...#', '#...#', '#####'],
  V: ['#...#', '#...#', '##.##', '.###.', '..#..'], W: ['#...#', '#...#', '#.#.#', '#####', '.#.#.'], X: ['#...#', '##.##', '.###.', '##.##', '#...#'],
  Y: ['#...#', '##.##', '.###.', '..#..', '..#..'], Z: ['#####', '...##', '.###.', '##...', '#####'], 0: ['#####', '#..##', '#...#', '##..#', '#####'],
  1: ['.##..', '..#..', '..#..', '..#..', '.###.'], 2: ['#####', '....#', '#####', '#....', '#####'], 3: ['#####', '....#', '.####', '....#', '#####'],
  4: ['#..#.', '#..#.', '#####', '...#.', '...#.'], 5: ['#####', '#....', '#####', '....#', '#####'], 6: ['#####', '#....', '#####', '#...#', '#####'],
  7: ['#####', '....#', '...##', '...#.', '...#.'], 8: ['#####', '#...#', '#####', '#...#', '#####'], 9: ['#####', '#...#', '#####', '....#', '#####'],
  '!': ['..#..', '..#..', '..#..', '.....', '..#..'], '?': ['#####', '....#', '..###', '.....', '..#..'], '+': ['.....', '..#..', '#####', '..#..', '.....'],
  '-': ['.....', '.....', '.###.', '.....', '.....']
};

/**
 * Trace the boundary of a set of unit cells ("x,y" keys) into closed loops.
 * Cells touching only at a corner stay separate pieces of the same outline walk,
 * so every directed boundary edge is used exactly once. Collinear points are merged.
 */
export function cellsToLoops(cells) {
  const has = (x, y) => cells.has(`${x},${y}`);
  const edges = new Map(); // start "x,y" → list of [ex, ey]
  const add = (sx, sy, ex, ey) => {
    const k = `${sx},${sy}`;
    if (!edges.has(k)) edges.set(k, []);
    edges.get(k).push([ex, ey]);
  };
  for (const key of cells) {
    const [x, y] = key.split(',').map(Number);
    // Clockwise on screen (y down) around the filled cell → positive signed area.
    if (!has(x, y - 1)) add(x, y, x + 1, y);
    if (!has(x + 1, y)) add(x + 1, y, x + 1, y + 1);
    if (!has(x, y + 1)) add(x + 1, y + 1, x, y + 1);
    if (!has(x - 1, y)) add(x, y + 1, x, y);
  }
  const loops = [];
  for (;;) {
    let startKey = null;
    for (const [k, list] of edges) if (list.length) { startKey = k; break; }
    if (!startKey) break;
    const loop = [];
    let [cx, cy] = startKey.split(',').map(Number);
    let prevDir = null;
    for (let guard = 0; guard < 10000; guard++) {
      const list = edges.get(`${cx},${cy}`);
      if (!list || !list.length) break;
      // At a pinch point (two exits) turn right first, keeping corner-touching cells apart.
      let pick = 0;
      if (list.length > 1 && prevDir) {
        const right = [-prevDir[1], prevDir[0]];
        const idx = list.findIndex(([ex, ey]) => Math.sign(ex - cx) === Math.sign(right[0]) && Math.sign(ey - cy) === Math.sign(right[1]));
        if (idx >= 0) pick = idx;
      }
      const [nx, ny] = list.splice(pick, 1)[0];
      loop.push([cx, cy]);
      prevDir = [nx - cx, ny - cy];
      cx = nx; cy = ny;
      if (`${cx},${cy}` === startKey) break;
    }
    loops.push(simplifyCollinear(loop));
  }
  // Outlines (positive) first, each followed by the holes inside it.
  const outers = loops.filter(l => signedArea(l) > 0).sort((a, b) => signedArea(b) - signedArea(a));
  const holes = loops.filter(l => signedArea(l) < 0);
  return outers.map(o => [o, ...holes.filter(h => pointInLoops(centroid(h), [o]))]);
}

function simplifyCollinear(loop) {
  const out = [];
  const n = loop.length;
  for (let i = 0; i < n; i++) {
    const a = loop[(i - 1 + n) % n], b = loop[i], c = loop[(i + 1) % n];
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (cross !== 0) out.push(b);
  }
  return out;
}

/** One letter as footprint pieces (most letters are one piece; ! and ? are two). */
export function letterPieces(ch, x, y, cell = 1) {
  const glyph = FONT[String(ch).toUpperCase()];
  if (!glyph) return [];
  const cells = new Set();
  glyph.forEach((row, gy) => [...row].forEach((c, gx) => { if (c === '#') cells.add(`${gx},${gy}`); }));
  return cellsToLoops(cells).map(loops => loops.map(l => l.map(([px, py]) => [x + px * cell, y + py * cell])));
}

/** Width in plan units of a word set in the block font (letters 5 wide, 1 apart). */
export function wordWidth(text, cell = 1) {
  const n = [...String(text)].length;
  return n ? (n * 6 - 1) * cell : 0;
}

// ── Buildings ────────────────────────────────────────────────────

let nextId = 1;
export function makeBuilding(loops, opts = {}) {
  return {
    id: opts.id ?? `b${Date.now().toString(36)}${(nextId++).toString(36)}`,
    loops: normalizeLoops(loops),
    h: clamp(opts.h ?? 8, 0.5, MAX_HEIGHT),
    ink: MARKERS[opts.ink] ? opts.ink : 'ink',
    fill: ['paper', 'tint', 'solid'].includes(opts.fill) ? opts.fill : 'paper',
    tiers: clamp(Math.round(opts.tiers ?? 1), 1, 4),
    roof: ['flat', 'spire'].includes(opts.roof) ? opts.roof : 'flat'
  };
}

function clamp(v, a, b) { return Math.min(b, Math.max(a, Number.isFinite(+v) ? +v : a)); }

/**
 * Split a building into stacked prisms. Tier 0 takes 55% of the height; each
 * setback shrinks the footprint toward the outline's centroid (the 1916 New York
 * "wedding cake"). Returns [{ loops, z0, z1 }], bottom first.
 */
export function tiersOf(b, h = b.h) {
  const n = b.tiers;
  if (n <= 1) return [{ loops: b.loops, z0: 0, z1: h }];
  const c = centroid(b.loops[0]);
  const out = [];
  let z = 0;
  for (let i = 0; i < n; i++) {
    const share = i === 0 ? 0.55 : 0.45 / (n - 1);
    const z1 = i === n - 1 ? h : z + h * share;
    out.push({ loops: scaleLoops(b.loops, 1 - 0.2 * i, c), z0: z, z1 });
    z = z1;
  }
  return out;
}

export function spireHeight(b, h = b.h) {
  const bb = bounds(b.loops);
  return Math.min(h * 0.45 + 1, Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) * 0.6 + 0.5);
}

// ── One-point perspective, camera looking straight down ──────────

/**
 * view = { ox, oy, s, vx, vy, D }
 *  ox, oy, s : ground plane → screen (screen = o + p · s)
 *  vx, vy    : the camera's spot over the plan (plan units); its screen image is the vanishing point
 *  D         : camera height in plan units
 * A point at height z lands D / (D − z) times as far from the VP as its footprint.
 */
export function perspectiveScale(z, D) {
  return D / Math.max(D - z, D * 0.04);
}

export function project([x, y], z, v) {
  const k = perspectiveScale(z, v.D);
  const vpx = v.ox + v.vx * v.s, vpy = v.oy + v.vy * v.s;
  return [vpx + (v.ox + x * v.s - vpx) * k, vpy + (v.oy + y * v.s - vpy) * k];
}

export function vanishingPoint(v) {
  return [v.ox + v.vx * v.s, v.oy + v.vy * v.s];
}

/** A wall a→b is visible when the camera's plan spot is on its outer side. */
export function wallFacesCamera(a, b, vx, vy) {
  // Loops wind positive on a y-down screen, so the outward normal is (dy, −dx).
  const nx = b[1] - a[1], ny = -(b[0] - a[0]);
  return (vx - a[0]) * nx + (vy - a[1]) * ny > 1e-9;
}

function distToLoops(loops, vx, vy) {
  let best = Infinity;
  for (const l of loops) for (let i = 0; i < l.length; i++) {
    const a = l[i], b = l[(i + 1) % l.length];
    best = Math.min(best, distToSegment(vx, vy, a, b));
  }
  return pointInLoops([vx, vy], loops) ? 0 : best;
}

function distToSegment(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / L));
  return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy);
}

/**
 * Everything the sketch view paints, back to front.
 *
 * Painter's order for a camera straight overhead: along any sight line, the
 * thing nearer the camera's plan spot is always in front (a ray only descends
 * as it travels outward), so buildings sort far → near by footprint distance to
 * the VP. Inside one building, tiers go bottom → top, and within a tier the
 * walls go far → near before the roof, which nothing of its own can cover.
 *
 * Returns [{ kind: 'wall'|'roof'|'spire', b, pts | loops, shade, tier }].
 */
export function sketchOps(buildings, v, heightOf = b => b.h) {
  const order = buildings
    .map(b => ({ b, d: distToLoops(b.loops, v.vx, v.vy) }))
    .sort((p, q) => q.d - p.d);
  const ops = [];
  for (const { b } of order) {
    const h = heightOf(b);
    if (h <= 0.001) {
      ops.push({ kind: 'roof', b, tier: 0, loops: b.loops.map(l => l.map(p => project(p, 0, v))) });
      continue;
    }
    const tiers = tiersOf(b, h);
    tiers.forEach((t, ti) => {
      const walls = [];
      for (const loop of t.loops) {
        for (let i = 0; i < loop.length; i++) {
          const a = loop[i], c = loop[(i + 1) % loop.length];
          if (!wallFacesCamera(a, c, v.vx, v.vy)) continue;
          const mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
          walls.push({
            kind: 'wall', b, tier: ti,
            d: Math.hypot(mid[0] - v.vx, mid[1] - v.vy),
            shade: wallShade(a, c),
            pts: [project(a, t.z0, v), project(c, t.z0, v), project(c, t.z1, v), project(a, t.z1, v)]
          });
        }
      }
      walls.sort((p, q) => q.d - p.d);
      ops.push(...walls);
      ops.push({ kind: 'roof', b, tier: ti, loops: t.loops.map(l => l.map(p => project(p, t.z1, v))) });
    });
    if (b.roof === 'spire') {
      const top = tiers[tiers.length - 1];
      const outline = top.loops[0];
      const c = centroid(outline);
      const zA = top.z1 + spireHeight(b, h);
      const apex = project(c, zA, v);
      const faces = [];
      for (let i = 0; i < outline.length; i++) {
        const a = outline[i], e = outline[(i + 1) % outline.length];
        if (!spireFaceVisible(a, e, c, top.z1, zA, v)) continue;
        const mid = [(a[0] + e[0] + c[0]) / 3, (a[1] + e[1] + c[1]) / 3];
        faces.push({ kind: 'spire', b, tier: tiers.length, d: Math.hypot(mid[0] - v.vx, mid[1] - v.vy), shade: wallShade(a, e) * 0.6, pts: [project(a, top.z1, v), project(e, top.z1, v), apex] });
      }
      faces.sort((p, q) => q.d - p.d);
      ops.push(...faces);
    }
  }
  return ops;
}

function spireFaceVisible(a, e, c, z0, z1, v) {
  // Plane through a, e (at z0) and apex c (at z1); visible if the camera is on its outer side.
  const u = [e[0] - a[0], e[1] - a[1], 0];
  const w = [c[0] - a[0], c[1] - a[1], z1 - z0];
  let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
  if (n[2] < 0) n = n.map(x => -x); // outward faces point up for a pyramid
  const cam = [v.vx - a[0], v.vy - a[1], v.D - z0];
  return n[0] * cam[0] + n[1] * cam[1] + n[2] * cam[2] > 1e-9;
}

/** 0 (lit) … 1 (shadow): light comes from the upper left of the plan. */
export function wallShade(a, b) {
  const nx = b[1] - a[1], ny = -(b[0] - a[0]);
  const L = Math.hypot(nx, ny) || 1;
  const dot = (nx / L) * -0.6 + (ny / L) * -0.8;
  return +(0.5 - dot * 0.5).toFixed(3);
}

// ── Cities ───────────────────────────────────────────────────────

export function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function wordBuildings(text, x, y, opts = {}) {
  const inks = opts.inks || ['green', 'blue', 'red', 'purple', 'orange'];
  const out = [];
  [...String(text).toUpperCase()].forEach((ch, i) => {
    for (const loops of letterPieces(ch, x + i * 6, y)) {
      out.push(makeBuilding(loops, { h: opts.h ?? 6, ink: inks[i % inks.length], fill: opts.fill || 'paper', tiers: 1 }));
    }
  });
  return out;
}

/** The starter city: a ring of blocks around the vanishing point, like the sketchbook page. */
export function sampleCity() {
  const B = (loops, o) => makeBuilding(loops, o);
  const S = (k, x, y, s, o) => B(STAMPS[k].make(x, y, s), o);
  return [
    S('box', 8, 8, 2, { h: 11, ink: 'ink' }),
    S('ell', 15.5, 9, 2, { h: 7, ink: 'ink', tiers: 2 }),
    B([rectLoop(10, 3, 14, 6)], { h: 9, ink: 'ink', roof: 'spire' }),
    S('tri', 5, 12.5, 2, { h: 5, ink: 'ink' }),
    S('hex', 19, 14, 2.5, { h: 8, ink: 'ink', tiers: 3 }),
    S('round', 18.5, 20, 1.5, { h: 4, ink: 'blue' }),
    S('ring', 11, 19, 2.5, { h: 6, ink: 'ink' }),
    B([rectLoop(14, 15, 17, 17)], { h: 3, ink: 'red' }),
    B([rectLoop(9, 13, 10, 16)], { h: 2, ink: 'green', fill: 'solid' }),
    B([rectLoop(19, 2, 23, 5)], { h: 12, ink: 'green', tiers: 2 }),
    S('wedge', 4, 19.5, 2.5, { h: 7, ink: 'purple' }),
    B([rectLoop(19, 7, 22, 11)], { h: 6, ink: 'orange', fill: 'solid' }),
    B([rectLoop(1, 2, 5, 5)], { h: 8, ink: 'green' }),
    S('plus', 6, 15.5, 1.5, { h: 3, ink: 'red', fill: 'tint' })
  ];
}

export function randomCity(seed = Date.now()) {
  const r = mulberry32(seed);
  const keys = Object.keys(STAMPS);
  const inks = Object.keys(MARKERS);
  const out = [];
  const taken = [];
  for (let tries = 0; tries < 400 && out.length < 18; tries++) {
    const s = 1 + Math.round(r() * 4) / 2;
    const x = Math.round(s + 1 + r() * (GRID - 2 * s - 2));
    const y = Math.round(s + 1 + r() * (GRID - 2 * s - 2));
    if (taken.some(t => Math.abs(t.x - x) < t.s + s + 0.6 && Math.abs(t.y - y) < t.s + s + 0.6)) continue;
    taken.push({ x, y, s });
    const k = keys[Math.floor(r() * keys.length)];
    const near = Math.hypot(x - GRID / 2, y - GRID / 2) / (GRID / 2);
    out.push(makeBuilding(STAMPS[k].make(x, y, s), {
      h: Math.round(2 + (1 - near) * 10 + r() * 6),
      ink: r() < 0.55 ? 'ink' : inks[Math.floor(r() * inks.length)],
      fill: r() < 0.15 ? 'solid' : r() < 0.25 ? 'tint' : 'paper',
      tiers: r() < 0.3 ? 2 + Math.floor(r() * 2) : 1,
      roof: r() < 0.15 ? 'spire' : 'flat'
    }));
  }
  return out;
}

// ── Save files ───────────────────────────────────────────────────

export function serializeCity(state) {
  return {
    format: 'classroomos-perspective-city',
    version: 1,
    camera: { vx: +state.vx.toFixed(3), vy: +state.vy.toFixed(3), D: +state.D.toFixed(2) },
    buildings: state.buildings.map(b => ({ loops: b.loops, h: b.h, ink: b.ink, fill: b.fill, tiers: b.tiers, roof: b.roof }))
  };
}

/** Rebuilds a city from untrusted JSON, field by field. Throws on anything unusable. */
export function parseCity(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  if (!data || data.format !== 'classroomos-perspective-city' || !Array.isArray(data.buildings)) throw new Error('Not a Perspective City file.');
  if (data.buildings.length > 400) throw new Error('Too many buildings.');
  const num = (v, lo, hi) => { const n = Number(v); if (!Number.isFinite(n) || n < lo || n > hi) throw new Error('Bad number in file.'); return n; };
  const buildings = data.buildings.map(b => {
    if (!Array.isArray(b.loops) || !b.loops.length || b.loops.length > 30) throw new Error('Bad footprint.');
    const loops = b.loops.map(l => {
      if (!Array.isArray(l) || l.length < 3 || l.length > 400) throw new Error('Bad footprint.');
      return l.map(p => [num(p[0], -GRID, 2 * GRID), num(p[1], -GRID, 2 * GRID)]);
    });
    return makeBuilding(loops, { h: num(b.h, 0, MAX_HEIGHT), ink: String(b.ink), fill: String(b.fill), tiers: num(b.tiers ?? 1, 1, 4), roof: String(b.roof) });
  });
  const cam = data.camera || {};
  return {
    buildings,
    vx: cam.vx == null ? GRID / 2 : num(cam.vx, -GRID, 2 * GRID),
    vy: cam.vy == null ? GRID / 2 : num(cam.vy, -GRID, 2 * GRID),
    D: cam.D == null ? 44 : num(cam.D, 24, 120)
  };
}
