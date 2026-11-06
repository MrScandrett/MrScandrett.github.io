// Daily Sokoban: a pure, seeded level generator and solver for the home-page puzzles
// (#home-puzzles). No DOM; tests/daily-puzzles.test.mjs exercises it directly.
//
// Levels are generated backwards. A random warehouse is carved, crates are set on their
// goals, and a breadth-first search *pulls* them away, over states of (crate cells, the
// region the worker can reach). The deepest state it finds becomes the start. Because
// every pull is a push played in reverse, the level is solvable by construction, and the
// BFS depth is exactly the fewest pushes that solve it: par is exact, never a guess.

import { rngFor, parseDayKey } from './daily-puzzles-core.mjs';

export const WALL = 1;
export const FLOOR = 0;
export const VOID = 2;

/** Directions in LURD order; a solution string uses these letters (upper case = a push). */
export const DIRS = ['l', 'u', 'r', 'd'];
const OPP = [2, 3, 0, 1];
const deltas = (w) => [-1, -w, 1, w];

/**
 * Room size, crates and search budget per weekday (0 = Sunday). Monday is gentle, Saturday hard.
 * `cap` bounds each backward search (four crates have far more states); `minPar` keeps a day from
 * being trivial: more rooms are tried until one needs at least that many pushes.
 */
const LEVELS = [
  { name: 'Medium', boxes: 3, w: 7, h: 7, cap: 20000, minPar: 14 }, // Sun
  { name: 'Easy', boxes: 2, w: 6, h: 6, cap: 20000, minPar: 8 },    // Mon
  { name: 'Easy', boxes: 2, w: 7, h: 6, cap: 20000, minPar: 10 },   // Tue
  { name: 'Medium', boxes: 3, w: 7, h: 6, cap: 20000, minPar: 13 }, // Wed
  { name: 'Medium', boxes: 3, w: 7, h: 7, cap: 20000, minPar: 15 }, // Thu
  { name: 'Hard', boxes: 3, w: 8, h: 7, cap: 20000, minPar: 18 },   // Fri
  { name: 'Hard', boxes: 4, w: 8, h: 7, cap: 7000, minPar: 20 }     // Sat
];
const ATTEMPTS = 8;

// ── board helpers ─────────────────────────────────────────────────────────

/** A reusable flood fill over floor cells not blocked by `occ`. Returns the smallest cell reached. */
function filler(grid, w) {
  const size = grid.length;
  const queue = new Int32Array(size);
  const stamp = new Uint32Array(size);
  let gen = 0;
  const fill = (occ, start) => {
    gen++;
    let head = 0, tail = 0, min = start;
    stamp[start] = gen; queue[tail++] = start;
    while (head < tail) {
      const c = queue[head++];
      if (c < min) min = c;
      let n = c - 1;
      if (stamp[n] !== gen && grid[n] === FLOOR && !occ[n]) { stamp[n] = gen; queue[tail++] = n; }
      n = c + 1;
      if (stamp[n] !== gen && grid[n] === FLOOR && !occ[n]) { stamp[n] = gen; queue[tail++] = n; }
      n = c - w;
      if (stamp[n] !== gen && grid[n] === FLOOR && !occ[n]) { stamp[n] = gen; queue[tail++] = n; }
      n = c + w;
      if (stamp[n] !== gen && grid[n] === FLOOR && !occ[n]) { stamp[n] = gen; queue[tail++] = n; }
    }
    fill.count = tail;
    return min;
  };
  fill.has = (cell) => stamp[cell] === gen;
  fill.cells = () => Array.from(queue.subarray(0, fill.count));
  return fill;
}

/** Shortest walk for the worker from `from` to `to`, crates as walls. Returns a LURD string or null. */
export function walkPath(board, boxes, from, to) {
  if (from === to) return '';
  const { grid, w } = board;
  const occ = new Uint8Array(grid.length);
  for (const b of boxes) occ[b] = 1;
  if (grid[to] !== FLOOR || occ[to]) return null;
  const prev = new Int32Array(grid.length).fill(-1);
  const how = new Int8Array(grid.length);
  const D = deltas(w);
  const queue = [from];
  prev[from] = from;
  for (let head = 0; head < queue.length; head++) {
    const c = queue[head];
    for (let di = 0; di < 4; di++) {
      const n = c + D[di];
      if (prev[n] !== -1 || grid[n] !== FLOOR || occ[n]) continue;
      prev[n] = c; how[n] = di; queue.push(n);
      if (n === to) {
        let out = '';
        for (let k = to; k !== from; k = prev[k]) out = DIRS[how[k]] + out;
        return out;
      }
    }
  }
  return null;
}

/**
 * One step of the worker. Returns { player, boxes, pushed } (pushed = index into `boxes`, or -1)
 * or null when the way is blocked. `boxes` keeps its order so the UI can animate each crate.
 */
export function step(board, boxes, player, dir) {
  const di = typeof dir === 'number' ? dir : DIRS.indexOf(String(dir).toLowerCase());
  if (di < 0) return null;
  const d = deltas(board.w)[di];
  const to = player + d;
  if (board.grid[to] !== FLOOR) return null;
  const k = boxes.indexOf(to);
  if (k < 0) return { player: to, boxes: boxes.slice(), pushed: -1 };
  const beyond = to + d;
  if (board.grid[beyond] !== FLOOR || boxes.includes(beyond)) return null;
  const next = boxes.slice();
  next[k] = beyond;
  return { player: to, boxes: next, pushed: k };
}

export const isSolved = (board, boxes) => boxes.every((b) => board.goal[b]);

/** Cells where a crate can never reach any goal, even alone (corners and dead walls). */
function deadSquares(board) {
  const { grid, w, goals } = board;
  const D = deltas(w);
  const live = new Uint8Array(grid.length);
  const queue = goals.slice();
  for (const g of goals) live[g] = 1;
  for (let head = 0; head < queue.length; head++) {
    const c = queue[head];
    for (const d of D) {
      // A crate at c could have come from c + d if the worker had room at c + 2d to push it.
      const from = c + d, stand = c + 2 * d;
      if (stand < 0 || stand >= grid.length) continue;
      if (!live[from] && grid[from] === FLOOR && grid[stand] === FLOOR) { live[from] = 1; queue.push(from); }
    }
  }
  return grid.map((t, i) => (t === FLOOR && !live[i] ? 1 : 0));
}

// ── the search ────────────────────────────────────────────────────────────

/**
 * Breadth-first search over (sorted crates, normalised worker) states. `pull` searches backwards
 * from solved positions. Stops at `cap` states or when `done(crates)` is true.
 */
function search(board, starts, { pull = false, cap = 50000, done = null, dead = null } = {}) {
  const { grid, w } = board;
  const size = grid.length;
  const n = starts[0].boxes.length;
  const D = deltas(w);
  const occ = new Uint8Array(size);
  const fillA = filler(grid, w), fillB = filler(grid, w);
  const seen = new Map();
  const boxes = [], player = [], parent = [], via = [], dist = [];
  const keyOf = (bx, p) => { let k = 0; for (const b of bx) k = k * size + b; return k * size + p; };
  const add = (bx, p, from, move) => {
    const k = keyOf(bx, p);
    if (seen.has(k)) return -1;
    const id = player.length;
    seen.set(k, id);
    for (const b of bx) boxes.push(b);
    player.push(p); parent.push(from); via.push(move); dist.push(from < 0 ? 0 : dist[from] + 1);
    return id;
  };
  const out = (found) => ({ n, boxes, player, parent, via, dist, found, count: player.length });

  for (const s of starts) {
    const bx = s.boxes.slice().sort((a, b) => a - b);
    for (const b of bx) occ[b] = 1;
    const p = fillA(occ, s.player);
    for (const b of bx) occ[b] = 0;
    const id = add(bx, p, -1, null);
    if (id >= 0 && done && done(bx)) return out(id);
  }

  for (let s = 0; s < player.length && player.length < cap; s++) {
    const bx = boxes.slice(s * n, s * n + n);
    for (const b of bx) occ[b] = 1;
    fillA(occ, player[s]);
    for (let k = 0; k < n; k++) {
      const b = bx[k];
      for (let di = 0; di < 4; di++) {
        const d = D[di];
        let stand, to, after;
        if (pull) {
          stand = b + d; to = b + d; after = b + 2 * d;
          if (!fillA.has(stand) || grid[after] !== FLOOR || occ[after]) continue;
        } else {
          stand = b - d; to = b + d; after = b;
          if (!fillA.has(stand) || grid[to] !== FLOOR || occ[to] || (dead && dead[to])) continue;
        }
        occ[b] = 0; occ[to] = 1;
        const np = fillB(occ, after);
        occ[to] = 0; occ[b] = 1;
        const nb = bx.slice();
        nb[k] = to;
        for (let i = k; i > 0 && nb[i] < nb[i - 1]; i--) [nb[i], nb[i - 1]] = [nb[i - 1], nb[i]];
        for (let i = k; i < n - 1 && nb[i] > nb[i + 1]; i++) [nb[i], nb[i + 1]] = [nb[i + 1], nb[i]];
        const id = add(nb, np, s, { from: b, to, dir: di, stand, after });
        if (id >= 0 && done && done(nb)) { for (const c of bx) occ[c] = 0; return out(id); }
      }
    }
    for (const b of bx) occ[b] = 0;
  }
  return out(-1);
}

/** Turn a list of pushes ({ stand, from, dir }) into a LURD string, walking between them. */
function pushesToLurd(board, boxes, player, pushes) {
  let bx = boxes.slice(), p = player, out = '';
  for (const push of pushes) {
    const walk = walkPath(board, bx, p, push.stand);
    if (walk == null) return null;
    out += walk + DIRS[push.dir].toUpperCase();
    const k = bx.indexOf(push.from);
    bx[k] = push.from + deltas(board.w)[push.dir];
    p = push.from;
  }
  return out;
}

/**
 * Fewest-push solution from any position, as a LURD string ('' when already solved), or null when
 * the position is stuck (a crate can no longer reach a goal) or too far to search within `cap`.
 */
export function solve(board, boxes, player, { cap = 60000 } = {}) {
  if (isSolved(board, boxes)) return '';
  board.dead ||= deadSquares(board);
  if (boxes.some((b) => board.dead[b])) return null;
  const res = search(board, [{ boxes, player }], { cap, dead: board.dead, done: (bx) => isSolved(board, bx) });
  if (res.found < 0) return null;
  const pushes = [];
  for (let s = res.found; res.parent[s] >= 0; s = res.parent[s]) pushes.unshift(res.via[s]);
  return pushesToLurd(board, boxes, player, pushes);
}

/** Replay a LURD string. Returns { boxes, player, moves, pushes } or null at the first illegal step. */
export function replay(board, boxes, player, lurd) {
  let bx = boxes.slice(), p = player, pushes = 0;
  for (const ch of lurd) {
    const next = step(board, bx, p, ch);
    if (!next) return null;
    if ((next.pushed >= 0) !== (ch !== ch.toLowerCase())) return null;
    if (next.pushed >= 0) pushes++;
    bx = next.boxes; p = next.player;
  }
  return { boxes: bx, player: p, moves: lurd.length, pushes };
}

// ── generation ────────────────────────────────────────────────────────────

// Wall pieces dropped into the room: singles, dominoes and small Ls.
const PIECES = [
  [[0, 0]], [[0, 0]], [[0, 0], [1, 0]], [[0, 0], [0, 1]],
  [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]], [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [0, 2]]
];

/** Carve a connected warehouse with no dead-end pockets, `iw` × `ih` inside a wall border. */
function carveRoom(rnd, iw, ih) {
  const w = iw + 2, h = ih + 2;
  const grid = new Uint8Array(w * h).fill(WALL);
  for (let y = 1; y <= ih; y++) for (let x = 1; x <= iw; x++) grid[y * w + x] = FLOOR;
  const fill = filler(grid, w);
  const none = new Uint8Array(w * h);
  const floorCount = () => grid.reduce((n, t) => n + (t === FLOOR), 0);
  const connected = () => {
    const start = grid.indexOf(FLOOR);
    if (start < 0) return false;
    fill(none, start);
    return fill.count === floorCount();
  };
  const target = Math.round(iw * ih * (0.24 + rnd() * 0.1));
  let walls = 0;
  for (let tries = 0; tries < iw * ih * 4 && walls < target; tries++) {
    const piece = PIECES[Math.floor(rnd() * PIECES.length)];
    const ox = 1 + Math.floor(rnd() * iw), oy = 1 + Math.floor(rnd() * ih);
    const cells = piece.map(([dx, dy]) => (oy + dy) * w + ox + dx);
    if (cells.some((c) => c >= grid.length || grid[c] !== FLOOR || (c % w) > iw)) continue;
    for (const c of cells) grid[c] = WALL;
    if (connected()) walls += cells.length;
    else for (const c of cells) grid[c] = FLOOR;
  }
  // Fill dead ends (a floor cell with three walls around it): a crate pushed in is lost, and
  // the worker never needs to go there. Filling one never disconnects the rest.
  for (let changed = true; changed;) {
    changed = false;
    for (let c = 0; c < grid.length; c++) {
      if (grid[c] !== FLOOR) continue;
      const open = [c - 1, c + 1, c - w, c + w].filter((n) => grid[n] === FLOOR).length;
      if (open <= 1) { grid[c] = WALL; changed = true; }
    }
  }
  return { grid, w, h };
}

function boardOf(grid, w, h, goals) {
  const goal = new Uint8Array(grid.length);
  for (const g of goals) goal[g] = 1;
  return { grid, w, h, goals: goals.slice().sort((a, b) => a - b), goal };
}

/** Pull crates off randomly placed goals; return the deepest start found, or null. */
function levelFromRoom(room, rnd, boxCount, cap) {
  const { grid, w, h } = room;
  const floor = [];
  for (let c = 0; c < grid.length; c++) if (grid[c] === FLOOR) floor.push(c);
  if (floor.length < boxCount * 4 + 8) return null;
  const goals = [];
  const pool = floor.slice();
  while (goals.length < boxCount) goals.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  const board = boardOf(grid, w, h, goals);

  // The solved position, with the worker in each region of floor the crates leave open.
  const occ = new Uint8Array(grid.length);
  for (const g of goals) occ[g] = 1;
  const fill = filler(grid, w);
  const covered = new Uint8Array(grid.length);
  const starts = [];
  for (const c of floor) {
    if (occ[c] || covered[c]) continue;
    fill(occ, c);
    for (const r of fill.cells()) covered[r] = 1;
    starts.push({ boxes: goals, player: c });
  }
  const res = search(board, starts, { pull: true, cap });

  let best = -1;
  for (let s = 0; s < res.count; s++) {
    let off = true;
    for (let k = 0; k < res.n; k++) if (board.goal[res.boxes[s * res.n + k]]) { off = false; break; }
    if (off && (best < 0 || res.dist[s] > res.dist[best])) best = s;
  }
  if (best < 0) return null;

  // Every pull, played forwards, is a push back toward the goals.
  const pushes = [];
  for (let s = best; res.parent[s] >= 0; s = res.parent[s]) {
    const v = res.via[s];
    pushes.push({ stand: v.after, from: v.to, dir: OPP[v.dir] });
  }
  const boxes = res.boxes.slice(best * res.n, best * res.n + res.n);
  for (const b of boxes) occ[b] = 1;
  for (const g of goals) occ[g] = boxes.includes(g) ? 1 : 0;
  fill(occ, res.player[best]);
  const region = fill.cells().sort((a, b) => a - b);
  const player = region[Math.floor(rnd() * region.length)];
  const solution = pushesToLurd(board, boxes, player, pushes);
  if (solution == null) return null;
  // Crates that take turns are what make a level a puzzle rather than a chore.
  const D = deltas(w);
  let switches = 0;
  for (let i = 1; i < pushes.length; i++) if (pushes[i].from !== pushes[i - 1].from + D[pushes[i - 1].dir]) switches++;
  return { board, boxes, player, solution, pushes: pushes.length, score: pushes.length + switches };
}

/** Crop to the floor plus one ring of wall; walls with no floor beside them become VOID. */
function cropLevel(lv) {
  const { board } = lv;
  const { grid, w, h } = board;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let c = 0; c < grid.length; c++) {
    if (grid[c] !== FLOOR) continue;
    const x = c % w, y = Math.floor(c / w);
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  x0--; y0--; x1++; y1++;
  const nw = x1 - x0 + 1, nh = y1 - y0 + 1;
  const map = (c) => (Math.floor(c / w) - y0) * nw + (c % w) - x0;
  const ng = new Uint8Array(nw * nh);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const t = grid[(y + y0) * w + x + x0];
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const yy = y + y0 + dy, xx = x + x0 + dx;
          if (yy >= 0 && yy < h && xx >= 0 && xx < w && grid[yy * w + xx] === FLOOR) { near = true; break; }
        }
      }
      ng[y * nw + x] = t === FLOOR ? FLOOR : near ? WALL : VOID;
    }
  }
  return {
    board: boardOf(ng, nw, nh, board.goals.map(map)),
    boxes: lv.boxes.map(map),
    player: map(lv.player),
    solution: lv.solution,
    pushes: lv.pushes
  };
}

/** XSB text rows (# wall, . goal, $ crate, * crate on goal, @ worker, + worker on goal). */
export function toRows(board, boxes, player) {
  const rows = [];
  for (let y = 0; y < board.h; y++) {
    let row = '';
    for (let x = 0; x < board.w; x++) {
      const c = y * board.w + x;
      const t = board.grid[c];
      if (t === WALL) row += '#';
      else if (t === VOID) row += ' ';
      else if (boxes.includes(c)) row += board.goal[c] ? '*' : '$';
      else if (c === player) row += board.goal[c] ? '+' : '@';
      else row += board.goal[c] ? '.' : '-';
    }
    rows.push(row.replace(/ +$/, ''));
  }
  return rows;
}

/** Parse XSB rows back into { board, boxes, player } (for tests and hand-made levels). */
export function fromRows(rows) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const grid = new Uint8Array(w * h).fill(VOID);
  const goals = [], boxes = [];
  let player = -1;
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const c = y * w + x;
    grid[c] = ch === '#' ? WALL : ch === ' ' ? VOID : FLOOR;
    if ('.*+'.includes(ch)) goals.push(c);
    if ('$*'.includes(ch)) boxes.push(c);
    if ('@+'.includes(ch)) player = c;
  }));
  return { board: boardOf(grid, w, h, goals), boxes, player };
}

function hashRows(rows) {
  let hsh = 2166136261;
  for (const ch of rows.join('/')) hsh = Math.imul(hsh ^ ch.charCodeAt(0), 16777619);
  return (hsh >>> 0).toString(36);
}

/** Today's warehouse: { key, id, level, board, boxes, player, rows, solution, par, parMoves }. */
export function makeSokoban(key, { attempts = ATTEMPTS } = {}) {
  const spec = LEVELS[parseDayKey(key).getDay()];
  const rnd = rngFor(`sokoban:${key}`);
  let best = null;
  for (let i = 0; i < attempts || ((!best || best.pushes < spec.minPar) && i < attempts * 4); i++) {
    const lv = levelFromRoom(carveRoom(rnd, spec.w, spec.h), rnd, spec.boxes, spec.cap);
    if (lv && (!best || lv.score > best.score)) best = lv;
  }
  const lv = cropLevel(best);
  const rows = toRows(lv.board, lv.boxes, lv.player);
  return {
    key,
    id: `soko-${hashRows(rows)}`,
    level: spec.name,
    board: lv.board,
    boxes: lv.boxes,
    player: lv.player,
    rows,
    solution: lv.solution,
    par: lv.pushes,
    parMoves: lv.solution.length
  };
}
