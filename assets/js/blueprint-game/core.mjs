// Fold & Unfold blueprint game: the pure model (no DOM, runs in node for tests).
//
// A part is a height map, heights[row][col], row 0 at the back. Every column rises
// straight up from the build plate, so every part prints without supports.
// World axes: x = column (left → right), y = up, z = row (back → front).
//
// Each orthographic view uses grid coordinates (u, v), v up, origin at the part's
// lower-left corner, laid out in third-angle projection:
//   top    u = x,     v = D - z   (front edge at the bottom: drawn above FRONT)
//   front  u = x,     v = y
//   right  u = D - z, v = y       (front edge on the left: drawn right of FRONT)
// A drawing is { visible: Set, hidden: Set } of unit segments: "h:u,v" runs from
// (u,v) to (u+1,v) and "v:u,v" from (u,v) to (u,v+1).

export const VIEWS = ['top', 'front', 'right'];

export const LEVELS = {
  easy: { label: 'Easy', hidden: false, blurb: 'small parts, no hidden lines' },
  medium: { label: 'Medium', hidden: false, blurb: 'steps and towers' },
  hard: { label: 'Hard', hidden: true, blurb: 'hidden lines count' },
};

// Hand-made parts first, in teaching order; after these the game generates parts.
export const PUZZLES = {
  easy: [
    { name: 'L-bracket', heights: [[3, 3], [1, 1], [1, 1]] },
    { name: 'Step block', heights: [[2, 2, 2], [1, 1, 1]] },
    { name: 'Corner post', heights: [[2, 1], [1, 1]] },
    { name: 'Bench', heights: [[2, 1, 2]] },
    { name: 'Stair', heights: [[3, 3], [2, 2], [1, 1]] },
    { name: 'T-plate', heights: [[1, 1, 1], [0, 1, 0]] },
  ],
  medium: [
    { name: 'Tower on a base', heights: [[1, 1, 1], [1, 3, 1], [1, 1, 1]] },
    { name: 'Phone stand', heights: [[3, 3, 3], [1, 1, 1], [2, 2, 2]] },
    { name: 'U-channel', heights: [[2, 1, 2], [2, 1, 2], [2, 1, 2]] },
    { name: 'Corner stair', heights: [[3, 2, 1], [2, 1, 0], [1, 0, 0]] },
    { name: 'Stepped pyramid', heights: [[1, 1, 1, 1], [1, 2, 2, 1], [1, 2, 2, 1], [1, 1, 1, 1]] },
    { name: 'Ridge', heights: [[1, 2, 1], [2, 3, 2], [1, 2, 1]] },
  ],
  hard: [
    { name: 'Pocket block', heights: [[2, 2, 2], [2, 0, 2], [2, 2, 2]] },
    { name: 'Hidden step', heights: [[1, 3, 1], [2, 2, 2]] },
    { name: 'Castle', heights: [[3, 1, 3], [1, 1, 1], [3, 1, 3]] },
    { name: 'Gate', heights: [[1, 1, 1], [3, 1, 3]] },
    { name: 'Clamp', heights: [[2, 2, 2], [1, 1, 1], [2, 1, 2]] },
    { name: 'Desk organizer', heights: [[3, 3, 3, 3], [3, 0, 1, 3], [3, 3, 3, 3]] },
  ],
};

// Drop empty border rows and columns; offsets say where the kept block started.
export function crop(heights) {
  const width = Math.max(0, ...heights.map((row) => row.length));
  const rows = heights.map((row) => Array.from({ length: width }, (_, c) => Math.max(0, Math.round(+row[c] || 0))));
  let r0 = 0, r1 = rows.length - 1, c0 = Infinity, c1 = -1;
  while (r0 <= r1 && rows[r0].every((h) => !h)) r0++;
  while (r1 >= r0 && rows[r1].every((h) => !h)) r1--;
  if (r0 > r1) return { heights: [], r0: 0, c0: 0 };
  for (let r = r0; r <= r1; r++) rows[r].forEach((h, c) => { if (h) { c0 = Math.min(c0, c); c1 = Math.max(c1, c); } });
  return { heights: rows.slice(r0, r1 + 1).map((row) => row.slice(c0, c1 + 1)), r0, c0 };
}

export const trim = (heights) => crop(heights).heights;

export function size(heights) {
  const D = heights.length, W = D ? heights[0].length : 0;
  let H = 0;
  heights.forEach((row) => row.forEach((h) => { if (h > H) H = h; }));
  return { W, D, H };
}

export const segKey = (dir, u, v) => dir + ':' + u + ',' + v;

export function parseSeg(key) {
  const [dir, rest] = key.split(':');
  const [u, v] = rest.split(',').map(Number);
  return { dir, u, v };
}

// An edge line has four voxels around it. It is a real edge unless they make a
// flat surface: one or three filled, or two filled diagonally (a, d / b, c).
function crease(a, b, c, d) {
  const n = a + b + c + d;
  return n % 2 === 1 || (n === 2 && a === d);
}

// The three views of a part: which projected edges show, and which are hidden.
export function drawings(input) {
  const h = trim(input);
  const { W, D, H } = size(h);
  const f = (x, y, z) => (x >= 0 && z >= 0 && x < W && z < D && y >= 0 && y < h[z][x] ? 1 : 0);
  const all = { top: new Set(), front: new Set(), right: new Set() };

  for (let c = 0; c < W; c++) for (let k = 0; k <= H; k++) for (let m = 0; m <= D; m++) {
    // edge along x at height k, depth m
    if (crease(f(c, k - 1, m - 1), f(c, k, m - 1), f(c, k - 1, m), f(c, k, m))) {
      all.front.add(segKey('h', c, k));
      all.top.add(segKey('h', c, D - m));
    }
  }
  for (let j = 0; j < H; j++) for (let k = 0; k <= W; k++) for (let m = 0; m <= D; m++) {
    // edge along y at x = k, depth m
    if (crease(f(k - 1, j, m - 1), f(k, j, m - 1), f(k - 1, j, m), f(k, j, m))) {
      all.front.add(segKey('v', k, j));
      all.right.add(segKey('v', D - m, j));
    }
  }
  for (let r = 0; r < D; r++) for (let k = 0; k <= W; k++) for (let j = 0; j <= H; j++) {
    // edge along z at x = k, height j
    if (crease(f(k - 1, j - 1, r), f(k, j - 1, r), f(k - 1, j, r), f(k, j, r))) {
      all.top.add(segKey('v', k, D - 1 - r));
      all.right.add(segKey('h', D - 1 - r, j));
    }
  }

  // Depth of the nearest surface seen through each view cell (-1: nothing there).
  // An edge is visible exactly where that depth jumps across it.
  const depth = {
    top(u, v) { const z = D - 1 - v; return u >= 0 && u < W && z >= 0 && z < D && h[z][u] ? h[z][u] : -1; },
    front(u, v) { for (let z = D - 1; z >= 0; z--) if (f(u, v, z)) return z; return -1; },
    right(u, v) { const z = D - 1 - u; for (let x = W - 1; x >= 0; x--) if (f(x, v, z)) return x; return -1; },
  };
  const out = {};
  for (const view of VIEWS) {
    const visible = new Set(), hidden = new Set(), d = depth[view];
    for (const key of all[view]) {
      const { dir, u, v } = parseSeg(key);
      const jump = dir === 'h' ? d(u, v - 1) !== d(u, v) : d(u - 1, v) !== d(u, v);
      (jump ? visible : hidden).add(key);
    }
    out[view] = { visible, hidden };
  }
  return out;
}

// Unit segments along a horizontal or vertical line; null for a slanted one.
export function unitSegments(u1, v1, u2, v2) {
  if (u1 !== u2 && v1 !== v2) return null;
  const out = [];
  if (v1 === v2) for (let u = Math.min(u1, u2); u < Math.max(u1, u2); u++) out.push(segKey('h', u, v1));
  else for (let v = Math.min(v1, v2); v < Math.max(v1, v2); v++) out.push(segKey('v', u1, v));
  return out;
}

export function shiftKey(key, du, dv) {
  const { dir, u, v } = parseSeg(key);
  return segKey(dir, u + du, v + dv);
}

// Grade one hand-drawn view against the true one. The student may draw the view
// anywhere on the grid, so try every placement and keep the one that matches best
// (ties keep the UCS origin). Results are in the student's own grid coordinates.
export function gradeView(target, drawn, { hidden: hiddenCounts = false } = {}) {
  const drawnAll = [...drawn.visible, ...drawn.hidden];
  let best = { score: -1, du: 0, dv: 0 };
  if (drawnAll.length) {
    const reach = 16;
    for (let du = -reach; du <= reach; du++) for (let dv = -reach; dv <= reach; dv++) {
      let score = 0;
      for (const k of drawn.visible) if (target.visible.has(shiftKey(k, -du, -dv))) score += 2;
      for (const k of drawn.hidden) if (target.hidden.has(shiftKey(k, -du, -dv))) score += 1;
      const tie = score === best.score && Math.abs(du) + Math.abs(dv) < Math.abs(best.du) + Math.abs(best.dv);
      if (score > best.score || tie) best = { score, du, dv };
    }
  }
  const { du, dv } = best;
  const toStudent = (k) => shiftKey(k, du, dv);
  const toTarget = (k) => shiftKey(k, -du, -dv);
  const missingVisible = [...target.visible].map(toStudent).filter((k) => !drawn.visible.has(k));
  const extraVisible = [...drawn.visible].filter((k) => !target.visible.has(toTarget(k)));
  const wrongLayer = extraVisible.filter((k) => target.hidden.has(toTarget(k)));
  const missingHidden = [...target.hidden].map(toStudent).filter((k) => !drawn.hidden.has(k) && !drawn.visible.has(k));
  const extraHidden = [...drawn.hidden].filter((k) => !target.hidden.has(toTarget(k)));
  const ok = !missingVisible.length && !extraVisible.length
    && (!hiddenCounts || (!missingHidden.length && !extraHidden.length));
  return { ok, du, dv, missingVisible, extraVisible, wrongLayer, missingHidden: hiddenCounts ? missingHidden : [], extraHidden };
}

export function gradeUnfold(target, drawn, options) {
  const views = {};
  for (const view of VIEWS) views[view] = gradeView(target[view], drawn[view], options);
  return { ok: VIEWS.every((v) => views[v].ok), views };
}

// A built solid passes when all three of its views match the blueprint, visible
// and hidden lines alike. A different solid with the same views counts too: that is
// the drawing's fault, not the builder's.
export function gradeFold(targetHeights, builtHeights) {
  const target = drawings(targetHeights), built = drawings(builtHeights);
  const views = {};
  for (const view of VIEWS) {
    const missing = [], extra = [];
    for (const layer of ['visible', 'hidden']) {
      for (const k of target[view][layer]) if (!built[view][layer].has(k)) missing.push({ key: k, layer });
      for (const k of built[view][layer]) if (!target[view][layer].has(k)) extra.push({ key: k, layer });
    }
    views[view] = { ok: !missing.length && !extra.length, missing, extra };
  }
  return { ok: VIEWS.every((v) => views[v].ok), views, built };
}

export function hasHiddenLines(heights) {
  const d = drawings(heights);
  return VIEWS.some((v) => d[v].hidden.size > 0);
}

const sameShape = (a, b) => JSON.stringify(trim(a)) === JSON.stringify(trim(b));

function connected(h) {
  const cells = [];
  h.forEach((row, r) => row.forEach((x, c) => { if (x) cells.push(r + ',' + c); }));
  if (!cells.length) return false;
  const seen = new Set([cells[0]]), stack = [cells[0]];
  while (stack.length) {
    const [r, c] = stack.pop().split(',').map(Number);
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const key = (r + dr) + ',' + (c + dc);
      if (h[r + dr]?.[c + dc] && !seen.has(key)) { seen.add(key); stack.push(key); }
    }
  }
  return seen.size === cells.length;
}

const GEN = {
  easy: { w: [2, 3], d: [2, 3], h: 3, features: [1, 2], cuts: false },
  medium: { w: [3, 4], d: [3, 4], h: 3, features: [1, 3], cuts: true },
  hard: { w: [3, 5], d: [3, 4], h: 4, features: [2, 3], cuts: true },
};

// A machined-looking part: a base slab, then a few raised blocks and cut pockets.
export function randomPart(level = 'easy', rng = Math.random, avoid = []) {
  const g = GEN[level] || GEN.easy;
  const pick = ([lo, hi]) => lo + Math.floor(rng() * (hi - lo + 1));
  for (let attempt = 0; attempt < 400; attempt++) {
    const W = pick(g.w), D = pick(g.d), base = rng() < 0.7 ? 1 : 2;
    const h = Array.from({ length: D }, () => Array(W).fill(base));
    const features = pick(g.features);
    for (let i = 0; i < features; i++) {
      const w = pick([1, W - 1]), d = pick([1, D]), c = pick([0, W - w]), r = pick([0, D - d]);
      const cut = g.cuts ? rng() < 0.35 : rng() < 0.15;
      for (let z = r; z < r + d; z++) for (let x = c; x < c + w; x++) {
        h[z][x] = cut ? Math.max(0, h[z][x] - pick([1, 2])) : Math.min(g.h, h[z][x] + pick([1, 2]));
      }
    }
    const { W: tw, D: td, H } = size(trim(h));
    const flat = h.flat().filter(Boolean);
    if (tw !== W || td !== D || H < 2 || new Set(flat).size < 2 || !connected(h)) continue;
    if (level === 'hard' && !hasHiddenLines(h)) continue;
    if (avoid.some((a) => sameShape(a, h))) continue;
    return { name: 'Part ' + (1000 + Math.floor(rng() * 9000)), heights: h, generated: true };
  }
  return { ...PUZZLES[level][0] };
}
