/* Pinball core: pure, DOM-free. A table is plain JSON (parts on a 600 x 900 board);
   createGame() turns it into a running simulation that advance() steps.
   Units are board pixels, y down, seconds. Everything the UI needs to draw or hear
   comes out of game.events, so this file can be tested headless. */

export const W = 600;
export const H = 900;
export const BALL_R = 9;
export const GRID = 10;
export const FORMAT = 'pinball-construction-set';
export const MAX_PARTS = 200;

const GRAVITY = 1150;       // board tilt, not real g: a ball takes ~1.3 s to fall the board
const MAX_SPEED = 2200;
const SUBSTEP = 1 / 480;    // fastest things move ~5 px per substep, less than a ball radius
const LANE_X = 538;         // inner wall of the plunger lane
const FLIP = { rest: 0.52, up: -0.5, speed: 24, r0: 11, r1: 6 };

/* The parts bin. `kind` tells the editor how a part is shaped and dragged. */
export const PART_TYPES = {
  wall:     { label: 'Wall',      kind: 'segment', color: '#4cc9f0', hint: 'A solid rail. Balls bounce off it.' },
  bumper:   { label: 'Bumper',    kind: 'circle',  color: '#ff3d9a', hint: 'Kicks the ball away hard. 100 points.' },
  flipper:  { label: 'Flipper',   kind: 'flipper', color: '#ffd166', hint: 'The part you control. Left side uses Z or ←, right side uses / or →.' },
  sling:    { label: 'Slingshot', kind: 'segment', color: '#7bf1a8', hint: 'A rail with a spring in it: it kicks back when hit fast. 10 points.' },
  target:   { label: 'Target',    kind: 'segment', color: '#ff9f43', hint: '500 points the first time you hit it. Light them all for a bonus and a bigger multiplier.' },
  rollover: { label: 'Rollover',  kind: 'circle',  color: '#b388ff', hint: 'A sensor the ball rolls through. 100 points, no bounce.' },
  post:     { label: 'Post',      kind: 'circle',  color: '#e8ecf4', hint: 'A small fixed peg.' },
};

/* Fixed machine: outer walls, the arch over the top, and the plunger lane.
   Not editable, so a table can never lose its shell. */
export const FRAME = (() => {
  const segs = [
    [30, 300, 30, 700],
    [570, 300, 570, 884],
    [LANE_X, 345, LANE_X, 884],
    [LANE_X, 884, 570, 884],
  ];
  const cx = 300, cy = 300, rad = 270, n = 28;
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI + (Math.PI * i) / n, a1 = Math.PI + (Math.PI * (i + 1)) / n;
    segs.push([cx + rad * Math.cos(a0), cy + rad * Math.sin(a0), cx + rad * Math.cos(a1), cy + rad * Math.sin(a1)]);
  }
  return segs;
})();

export const PLUNGER = { x: 554, y: 884 - BALL_R };

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const snap = (v, g = GRID) => Math.round(v / g) * g;
export { clamp, snap };

let counter = 0;
export function newId(type) { counter += 1; return `${type}-${Date.now().toString(36)}${counter.toString(36)}`; }

/* ── Parts ───────────────────────────────────────────────────── */
export function makePart(type, x, y) {
  const def = PART_TYPES[type];
  if (!def) throw new Error(`Unknown part: ${type}`);
  const p = { id: newId(type), type, x, y };
  if (def.kind === 'segment') {
    const len = type === 'target' ? 40 : type === 'sling' ? 70 : 90;
    p.x2 = x + len; p.y2 = y;
  } else if (def.kind === 'circle') {
    p.r = type === 'bumper' ? 26 : type === 'rollover' ? 14 : 6;
  } else {
    p.side = x < W / 2 ? 'left' : 'right';
    p.len = 85;
  }
  return p;
}

/* Where a flipper's two ends are at a given "left-equivalent" angle. */
export function flipperGeom(p, a) {
  const dx = p.side === 'right' ? -Math.cos(a) : Math.cos(a);
  const dy = Math.sin(a);
  return { x1: p.x, y1: p.y, x2: p.x + dx * p.len, y2: p.y + dy * p.len, r1: FLIP.r0, r2: FLIP.r1 };
}
export const FLIPPER_REST = FLIP.rest;
export const FLIPPER_UP = FLIP.up;

export function partLength(p) { return Math.hypot(p.x2 - p.x, p.y2 - p.y); }

/* ── The starter table (what you get on "New table") ─────────── */
export function defaultTable() {
  const mk = (type, x, y, extra = {}) => ({ ...makePart(type, x, y), ...extra });
  const parts = [
    mk('wall', 30, 700, { x2: 190, y2: 800 }),
    mk('wall', LANE_X, 700, { x2: 380, y2: 800 }),
    mk('flipper', 195, 815, { side: 'left' }),
    mk('flipper', 375, 815, { side: 'right' }),
    mk('sling', 85, 590, { x2: 145, y2: 680 }),
    mk('sling', 483, 590, { x2: 423, y2: 680 }),
    mk('bumper', 220, 330, { r: 28 }),
    mk('bumper', 380, 330, { r: 28 }),
    mk('bumper', 300, 430, { r: 28 }),
    mk('target', 210, 190, { x2: 250, y2: 190 }),
    mk('target', 280, 170, { x2: 320, y2: 170 }),
    mk('target', 350, 190, { x2: 390, y2: 190 }),
    mk('rollover', 200, 100, { r: 13 }),
    mk('rollover', 300, 85, { r: 13 }),
    mk('rollover', 400, 100, { r: 13 }),
    mk('post', 105, 520, { r: 7 }),
    mk('post', 463, 520, { r: 7 }),
  ];
  return { format: FORMAT, version: 1, name: 'Starter table', parts };
}
export function blankTable() {
  const t = defaultTable();
  t.name = 'My table';
  t.parts = t.parts.filter((p) => p.type === 'flipper' || (p.type === 'wall'));
  return t;
}

/* ── Save format ─────────────────────────────────────────────── */
export function exportTable(table) {
  return JSON.stringify({ format: FORMAT, version: 1, name: table.name || 'My table', parts: table.parts }, null, 1);
}

/* Accepts an object or a JSON string. Never throws; returns { ok, table, errors }.
   Unknown parts are dropped and coordinates clamped, so a hand-edited or corrupt
   file cannot put geometry outside the board or crash the simulation. */
export function validateTable(input) {
  const errors = [];
  let obj = input;
  if (typeof input === 'string') {
    try { obj = JSON.parse(input); } catch { return { ok: false, table: null, errors: ['That file is not valid JSON.'] }; }
  }
  if (!obj || typeof obj !== 'object' || obj.format !== FORMAT || !Array.isArray(obj.parts)) {
    return { ok: false, table: null, errors: ['That is not a Pinball Construction Set table.'] };
  }
  const num = (v, lo, hi, dflt) => (Number.isFinite(v) ? clamp(v, lo, hi) : dflt);
  const seen = new Set();
  const parts = [];
  for (const raw of obj.parts.slice(0, MAX_PARTS)) {
    const def = raw && PART_TYPES[raw.type];
    if (!def) { errors.push(`Skipped an unknown part (${String(raw && raw.type).slice(0, 20)}).`); continue; }
    let id = typeof raw.id === 'string' && raw.id.length < 60 && !seen.has(raw.id) ? raw.id : newId(raw.type);
    seen.add(id);
    const p = { id, type: raw.type, x: num(raw.x, 0, W, W / 2), y: num(raw.y, 0, H, H / 2) };
    if (def.kind === 'segment') {
      p.x2 = num(raw.x2, 0, W, p.x + 40); p.y2 = num(raw.y2, 0, H, p.y);
      if (Math.hypot(p.x2 - p.x, p.y2 - p.y) < 4) p.x2 = p.x + 4;
    } else if (def.kind === 'circle') {
      p.r = num(raw.r, 4, 60, 20);
    } else {
      p.side = raw.side === 'right' ? 'right' : 'left';
      p.len = num(raw.len, 40, 140, 85);
    }
    parts.push(p);
  }
  return { ok: true, errors, table: { format: FORMAT, version: 1, name: String(obj.name || 'My table').slice(0, 60), parts } };
}

/* ── Geometry ────────────────────────────────────────────────── */
function closest(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return { t, x: ax + dx * t, y: ay + dy * t };
}
export function distToSegment(px, py, ax, ay, bx, by) {
  const c = closest(px, py, ax, ay, bx, by);
  return Math.hypot(px - c.x, py - c.y);
}
function contact(b, ax, ay, bx, by, ra, rb) {
  const c = closest(b.x, b.y, ax, ay, bx, by);
  const rad = ra + (rb - ra) * c.t + BALL_R;
  let dx = b.x - c.x, dy = b.y - c.y;
  const d2 = dx * dx + dy * dy;
  if (d2 >= rad * rad) return null;
  let d = Math.sqrt(d2);
  if (d < 1e-6) { dx = 0; dy = -1; d = 0; } else { dx /= d; dy /= d; }
  return { nx: dx, ny: dy, pen: rad - d, t: c.t };
}
/* Push the ball out and reflect its velocity relative to the surface. Returns impact speed. */
function bounce(b, c, e, svx = 0, svy = 0) {
  b.x += c.nx * c.pen; b.y += c.ny * c.pen;
  const vn = (b.vx - svx) * c.nx + (b.vy - svy) * c.ny;
  if (vn >= 0) return 0;
  b.vx -= (1 + e) * vn * c.nx; b.vy -= (1 + e) * vn * c.ny;
  return -vn;
}

/* ── The game ────────────────────────────────────────────────── */
export function createGame(table, { balls = 3 } = {}) {
  const parts = table.parts.map((p) => ({ ...p }));
  const g = {
    parts,
    flippers: parts.filter((p) => p.type === 'flipper').map((p) => ({ id: p.id, a: FLIP.rest })),
    ball: null,
    balls,
    score: 0,
    multiplier: 1,
    status: 'ready',           // ready | playing | over
    events: [],
    lit: {},                   // target id -> true once hit
    flash: {},                 // part id -> seconds of glow left (for drawing)
    inside: {},                // rollover id -> ball currently in it
    plunger: { charge: 0, down: false },
    time: 0,
    still: 0,
    stats: { bumper: 0, target: 0, sling: 0, rollover: 0 },
  };
  spawnBall(g);
  return g;
}

export function spawnBall(g) {
  g.ball = { x: PLUNGER.x, y: PLUNGER.y, vx: 0, vy: 0 };
  g.status = 'ready';
  g.still = 0;
}

function emit(g, type, part, strength = 0) { g.events.push({ type, id: part && part.id, x: part ? part.x : g.ball.x, y: part ? part.y : g.ball.y, strength }); }
function award(g, pts, type, part) {
  g.score += pts * g.multiplier;
  emit(g, type, part, pts);
}

function inLane(b) { return b.x > LANE_X && b.y > 560; }

function stepOnce(g, dt, input) {
  g.time += dt;
  for (const k in g.flash) { g.flash[k] -= dt; if (g.flash[k] <= 0) delete g.flash[k]; }

  // Flippers swing toward their target at a fixed angular speed.
  const prev = new Map();
  for (const f of g.flippers) {
    const part = g.parts.find((p) => p.id === f.id);
    const want = (part.side === 'right' ? input.right : input.left) ? FLIP.up : FLIP.rest;
    prev.set(f.id, f.a);
    f.a += clamp(want - f.a, -FLIP.speed * dt, FLIP.speed * dt);
  }

  const b = g.ball;
  if (!b) return;
  b.vy += GRAVITY * dt;
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > MAX_SPEED) { b.vx *= MAX_SPEED / sp; b.vy *= MAX_SPEED / sp; }
  b.x += b.vx * dt; b.y += b.vy * dt;

  for (const s of FRAME) {
    const c = contact(b, s[0], s[1], s[2], s[3], 3, 3);
    if (c) bounce(b, c, 0.45);
  }

  for (const p of g.parts) {
    const kind = PART_TYPES[p.type].kind;
    if (p.type === 'wall') {
      const c = contact(b, p.x, p.y, p.x2, p.y2, 3, 3);
      if (c) bounce(b, c, 0.45);
    } else if (p.type === 'sling' || p.type === 'target') {
      const c = contact(b, p.x, p.y, p.x2, p.y2, p.type === 'target' ? 4 : 5, p.type === 'target' ? 4 : 5);
      if (!c) continue;
      const hit = bounce(b, c, p.type === 'sling' ? 0.5 : 0.35);
      if (p.type === 'sling' && hit > 120) {
        b.vx += c.nx * 420; b.vy += c.ny * 420;
        g.flash[p.id] = 0.15; g.stats.sling++;
        award(g, 10, 'sling', p);
      } else if (p.type === 'target' && hit > 30) {
        g.flash[p.id] = 0.25;
        if (!g.lit[p.id]) {
          g.lit[p.id] = true; g.stats.target++;
          award(g, 500, 'target', p);
          const targets = g.parts.filter((q) => q.type === 'target');
          if (targets.length && targets.every((q) => g.lit[q.id])) {
            g.score += 5000 * g.multiplier;
            g.multiplier = Math.min(5, g.multiplier + 1);
            g.lit = {};
            emit(g, 'bonus', p, 5000);
          }
        } else emit(g, 'thud', p, hit);
      }
    } else if (kind === 'circle') {
      const dx = b.x - p.x, dy = b.y - p.y, rad = p.r + BALL_R, d2 = dx * dx + dy * dy;
      if (p.type === 'rollover') {
        const inside = d2 < p.r * p.r;
        if (inside && !g.inside[p.id]) {
          g.inside[p.id] = true; g.flash[p.id] = 0.4; g.stats.rollover++;
          award(g, 100, 'rollover', p);
        } else if (!inside) g.inside[p.id] = false;
        continue;
      }
      if (d2 >= rad * rad) continue;
      const d = Math.sqrt(d2) || 1e-6;
      const c = { nx: dx / d, ny: dy / d, pen: rad - d };
      const hit = bounce(b, c, p.type === 'bumper' ? 0.6 : 0.45);
      if (p.type === 'bumper') {
        const vn = b.vx * c.nx + b.vy * c.ny;
        if (vn < 560) { b.vx += (560 - vn) * c.nx; b.vy += (560 - vn) * c.ny; }
        g.flash[p.id] = 0.18; g.stats.bumper++;
        award(g, 100, 'bumper', p);
      } else if (hit > 150) emit(g, 'tick', p, hit);
    } else if (kind === 'flipper') {
      const f = g.flippers.find((q) => q.id === p.id);
      const now = flipperGeom(p, f.a), was = flipperGeom(p, prev.get(p.id));
      const c = contact(b, now.x1, now.y1, now.x2, now.y2, now.r1, now.r2);
      if (!c) continue;
      const t = c.t; // surface velocity at the contact point, from how far it moved this substep
      const svx = ((now.x1 + (now.x2 - now.x1) * t) - (was.x1 + (was.x2 - was.x1) * t)) / dt;
      const svy = ((now.y1 + (now.y2 - now.y1) * t) - (was.y1 + (was.y2 - was.y1) * t)) / dt;
      const hit = bounce(b, c, 0.25, svx, svy);
      if (hit > 200) emit(g, 'flipper', p, hit);
    }
  }

  if (b.y > H + 30) {
    g.balls -= 1;
    emit(g, 'drain', null, 0);
    g.multiplier = 1; g.lit = {};
    if (g.balls > 0) spawnBall(g); else { g.status = 'over'; emit(g, 'over', null, 0); g.ball = null; }
    return;
  }
  if (g.status === 'ready' && !inLane(b)) g.status = 'playing';
}

/* Advance by a frame's worth of time, in fixed substeps.
   input: { left, right, plunge } booleans (what the player is holding right now). */
export function advance(g, dt, input = {}) {
  if (g.status === 'over') return;
  dt = Math.min(dt, 1 / 20);

  // The plunger: hold to draw the spring back, release to launch the ball sitting in front of it.
  const pl = g.plunger;
  if (input.plunge) { pl.down = true; pl.charge = Math.min(1, pl.charge + dt * 1.1); }
  else if (pl.down) {
    pl.down = false;
    const b = g.ball;
    if (b && inLane(b) && pl.charge > 0.04) { b.vy = -(650 + 1450 * pl.charge); b.vx = 0; emit(g, 'launch', null, pl.charge); }
    pl.charge = 0;
  }

  const n = Math.max(1, Math.ceil(dt / SUBSTEP));
  const h = dt / n;
  for (let i = 0; i < n && g.status !== 'over'; i++) stepOnce(g, h, input);

  // A ball that has stopped dead on the playfield for 4 s is stuck: give it a nudge.
  const b = g.ball;
  if (b && g.status === 'playing') {
    g.still = Math.hypot(b.vx, b.vy) < 8 ? g.still + dt : 0;
    if (g.still > 4) { b.vx += (Math.random() - 0.5) * 500; b.vy -= 300; g.still = 0; emit(g, 'nudge', null, 0); }
  }
}
