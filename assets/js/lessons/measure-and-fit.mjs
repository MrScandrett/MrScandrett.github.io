/* Measure and Fit lesson: caliper reading lab, fit calculator, fit test coupon (STL).
   The top half is pure (no DOM) and is imported by Node for checks; the bottom half
   mounts the three widgets when it runs in a page. */

/* ── Pure: fits, units, rounding ───────────────────────────────────── */

// Gap per side (radial), in mm, for a real item in a printed FDM feature (PLA, 0.4 mm nozzle).
// Loose matches the 0.35–0.50 mm moving clearance used in print-fidgets.html and 3d-printing.html.
export const FITS = {
  press: { label: 'Press fit', min: 0.05, max: 0.15, use: 0.10, feel: 'Stays put once pushed in. Takes a firm push; it should not fall out when you turn it upside down.' },
  slip: { label: 'Slip fit', min: 0.20, max: 0.30, use: 0.25, feel: 'Slides in and out by hand with no wobble you can feel.' },
  loose: { label: 'Loose fit', min: 0.35, max: 0.50, use: 0.40, feel: 'Drops in, turns freely, and may wobble a little. Also the gap for moving print-in-place parts.' },
};

export const MM_PER_INCH = 25.4; // exact since 1959

export function round(x, step) {
  return Number((Math.round(x / step) * step).toFixed(6));
}

// "7.2", "7,2", "5/16", "1 1/4", "1-1/4", "0.3125" → number in the given unit; NaN if unreadable.
export function parseNumber(text) {
  const t = String(text ?? '').trim().replace(',', '.').replace(/\s*(mm|in|")\s*$/i, '');
  if (!t) return NaN;
  let m = t.match(/^(\d+)[\s-]+(\d+)\s*\/\s*(\d+)$/);
  if (m) return Number(m[1]) + Number(m[2]) / Number(m[3]);
  m = t.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m) return Number(m[2]) ? Number(m[1]) / Number(m[2]) : NaN;
  if (/^[-+]?(\d+\.?\d*|\.\d+)$/.test(t)) return Number(t);
  return NaN;
}

export function toMm(value, unit) {
  return unit === 'in' ? value * MM_PER_INCH : value;
}

// Size to model for a fit. kind 'hole': printed hole/slot around the item (adds the gap).
// kind 'peg': printed peg/post going into the item (subtracts the gap).
// correction: how far your printer misses, from the coupon (holes come out this much small
// on the diameter; pegs this much big), applied so the printed part lands on target.
export function designSize({ item, fit, kind = 'hole', correction = 0 }) {
  const f = FITS[fit];
  if (!f || !Number.isFinite(item) || item <= 0) return null;
  const sign = kind === 'peg' ? -1 : 1;
  const at = (g) => item + sign * (2 * g + (Number.isFinite(correction) ? correction : 0));
  const exact = at(f.use);
  return {
    fit: f,
    exact,
    model: round(exact, 0.05),
    low: Math.min(at(f.min), at(f.max)),
    high: Math.max(at(f.min), at(f.max)),
    gapPerSide: f.use,
  };
}

/* ── Pure: fit test coupon geometry ─────────────────────────────────── */

// Extra size added to the item's measured size, on the diameter (or slot width).
// Per side these are 0, 0.05, 0.10, 0.15, 0.20, 0.30, 0.40, 0.50 mm: press, slip and loose.
export const COUPON_SETS = {
  full: [0, 0.1, 0.2, 0.3, 0.4, 0.6, 0.8, 1.0],
  short: [0.1, 0.3, 0.5, 0.7, 1.0],
};

export function couponSizes(item, set = 'full') {
  return (COUPON_SETS[set] || COUPON_SETS.full).map((d) => round(item + d, 0.01));
}

export function couponLayout({ item, shape = 'round', set = 'full', wall = 3, thickness = 5, slotLength = 20 }) {
  const sizes = couponSizes(item, set);
  const max = sizes[sizes.length - 1];
  const cellW = round(max + 2 * wall, 0.01);
  const cellH = shape === 'slot' ? round(slotLength + 2 * wall, 0.01) : cellW;
  return {
    shape, sizes, wall, thickness, slotLength, cellW, cellH,
    width: round(cellW * sizes.length, 0.01), height: cellH,
    cells: sizes.map((size, i) => ({ size, cx: cellW * (i + 0.5), cy: cellH / 2 })),
  };
}

const SEG = 64; // segments per round hole: 64 sides is within 0.12% of a true circle

// A watertight plate with one hole per cell. Each cell's top face is the ring between its
// hole outline and its own rectangle outline, sampled at matching angles so neighbouring
// cells share vertices exactly; the walls come from the top face's boundary edges.
// Cell 0 gets a notched corner so students can tell which end holds the smallest hole.
export function buildCouponMesh(opts) {
  const L = couponLayout(opts);
  const pts = [];
  const index = new Map();
  const id = (x, y) => {
    const k = Math.round(x * 1e4) + ',' + Math.round(y * 1e4);
    let i = index.get(k);
    if (i === undefined) { i = pts.length; pts.push([x, y]); index.set(k, i); }
    return i;
  };
  const top = [];
  L.cells.forEach((cell, ci) => {
    const ax = L.cellW / 2, ay = L.cellH / 2;
    const hole = [], bound = [];
    if (L.shape === 'slot') {
      const hx = cell.size / 2, hy = L.slotLength / 2;
      const signs = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
      signs.forEach(([sx, sy]) => { hole.push([sx * hx, sy * hy]); bound.push([sx * ax, sy * ay]); });
      if (ci === 0) {
        const c = Math.min(0.7 * L.wall, ax - hx - 0.4, ay - hy - 0.4);
        bound[2] = [-ax + c, -ay + c];
      }
    } else {
      const r = cell.size / 2;
      for (let k = 0; k < SEG; k++) {
        const t = (2 * Math.PI * k) / SEG;
        const c = Math.cos(t), s = Math.sin(t);
        hole.push([r * c, r * s]);
        const d = Math.min(Math.abs(c) > 1e-12 ? ax / Math.abs(c) : Infinity, Math.abs(s) > 1e-12 ? ay / Math.abs(s) : Infinity);
        bound.push([d * c, d * s]);
      }
      if (ci === 0) {
        const kc = (SEG * 5) / 8; // 225°: the lower-left corner
        const c = Math.max(0, Math.min(0.35 * ax, ax - (r + 1) / Math.SQRT2));
        bound[kc] = [-ax + c, -ay + c];
      }
    }
    const n = hole.length;
    const H = hole.map(([x, y]) => id(cell.cx + x, cell.cy + y));
    const B = bound.map(([x, y]) => id(cell.cx + x, cell.cy + y));
    for (let k = 0; k < n; k++) {
      const k1 = (k + 1) % n;
      top.push([H[k], B[k], B[k1]], [H[k], B[k1], H[k1]]);
    }
  });
  const T = L.thickness;
  const positions = [];
  pts.forEach(([x, y]) => { positions.push([x, y, 0], [x, y, T]); });
  const lo = (i) => 2 * i, hi = (i) => 2 * i + 1;
  const tris = [];
  const edges = new Set();
  top.forEach(([a, b, c]) => {
    tris.push([hi(a), hi(b), hi(c)], [lo(a), lo(c), lo(b)]);
    edges.add(a + '>' + b); edges.add(b + '>' + c); edges.add(c + '>' + a);
  });
  edges.forEach((e) => {
    const [a, b] = e.split('>').map(Number);
    if (edges.has(b + '>' + a)) return;
    tris.push([hi(b), hi(a), lo(a)], [hi(b), lo(a), lo(b)]);
  });
  return { layout: L, positions, triangles: tris };
}

export function meshStats(mesh) {
  const count = new Map();
  for (const [a, b, c] of mesh.triangles) {
    for (const [u, v] of [[a, b], [b, c], [c, a]]) {
      const k = u + '>' + v;
      count.set(k, (count.get(k) || 0) + 1);
    }
  }
  let open = 0, doubled = 0;
  count.forEach((n, k) => {
    const [u, v] = k.split('>');
    if (n > 1) doubled++;
    if (!count.has(v + '>' + u)) open++;
  });
  let vol = 0;
  const P = mesh.positions;
  for (const [a, b, c] of mesh.triangles) {
    const [x1, y1, z1] = P[a], [x2, y2, z2] = P[b], [x3, y3, z3] = P[c];
    vol += (x1 * (y2 * z3 - y3 * z2) - x2 * (y1 * z3 - y3 * z1) + x3 * (y1 * z2 - y2 * z1)) / 6;
  }
  return { watertight: open === 0 && doubled === 0, openEdges: open, repeatedEdges: doubled, volume: vol, triangles: mesh.triangles.length };
}

export function meshToStl(mesh, name = 'fit-coupon') {
  const tris = mesh.triangles, P = mesh.positions;
  const buf = new ArrayBuffer(84 + 50 * tris.length);
  const dv = new DataView(buf);
  const head = ('ClassroomOS ' + name).slice(0, 80);
  for (let i = 0; i < head.length; i++) dv.setUint8(i, head.charCodeAt(i) & 0x7f);
  dv.setUint32(80, tris.length, true);
  let o = 84;
  for (const [a, b, c] of tris) {
    const A = P[a], B = P[b], C = P[c];
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2];
    const vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    for (const f of [nx, ny, nz, ...A, ...B, ...C]) { dv.setFloat32(o, f, true); o += 4; }
    dv.setUint16(o, 0, true); o += 2;
  }
  return buf;
}

/* ── Pure: caliper reading ───────────────────────────────────────────── */

// Vernier scales: n divisions spread over span mm; resolution = 1 mm − span/n per line... read as
// line i lines up when i × res equals the fraction of a millimetre past the main-scale line.
export const VERNIERS = {
  v10: { res: 0.1, n: 10, span: 9, label: 'Vernier 0.1 mm' },
  v05: { res: 0.05, n: 20, span: 39, label: 'Vernier 0.05 mm' },
  v02: { res: 0.02, n: 50, span: 49, label: 'Vernier 0.02 mm' },
};

export function vernierRead(value, res) {
  const v = round(value, res);
  const main = Math.floor(v + 1e-9);
  const line = Math.round((v - main) / res);
  return { value: v, main, line, fraction: round(line * res, res) };
}

// Things students measure. size ranges are typical real values (mm); jitter is how much a
// second or third measurement of the same object can differ (round-off, a different flat, squeeze).
export const OBJECTS = [
  { id: 'pencil-flats', kind: 'outside', name: 'hex pencil, across the flats', shape: 'hex', lo: 6.8, hi: 7.4, jitter: 0.04, use: 'a pencil holder hole' },
  { id: 'pencil-corners', kind: 'outside', name: 'hex pencil, across the corners', shape: 'hexc', lo: 7.6, hi: 8.2, jitter: 0.05, use: 'a pencil holder hole (the corners must clear)' },
  { id: 'aa', kind: 'outside', name: 'AA battery', shape: 'circle', lo: 13.9, hi: 14.4, jitter: 0.02, use: 'a battery clip' },
  { id: 'quarter', kind: 'outside', name: 'US quarter (diameter)', shape: 'coin', lo: 24.2, hi: 24.3, jitter: 0.02, use: 'a coin slot or holder' },
  { id: 'phone', kind: 'outside', name: 'phone in its case (thickness)', shape: 'rect', lo: 8.5, hi: 13, jitter: 0.06, use: 'a phone stand slot' },
  { id: 'marker', kind: 'outside', name: 'dry-erase marker barrel', shape: 'circle', lo: 15, hi: 18, jitter: 0.05, use: 'a marker caddy' },
  { id: 'eraser', kind: 'outside', name: 'block eraser (width)', shape: 'rect', lo: 18, hi: 23, jitter: 0.08, use: 'an eraser pocket' },
  { id: 'tape-core', kind: 'inside', name: 'tape roll core (inside diameter)', shape: 'ring', lo: 25.2, hi: 25.8, jitter: 0.08, use: 'a peg for a tape dispenser' },
  { id: 'washer', kind: 'inside', name: 'M6 washer hole', shape: 'ring', lo: 6.4, hi: 6.6, jitter: 0.02, use: 'a peg or bolt hole' },
  { id: 'cap-inside', kind: 'inside', name: 'bottle cap (inside diameter)', shape: 'ring', lo: 26, hi: 28.5, jitter: 0.06, use: 'a plug that pushes into a cap' },
  { id: 'cap-depth', kind: 'depth', name: 'bottle cap (depth)', shape: 'cup', lo: 9, hi: 13, jitter: 0.05, use: 'how tall the plug can be' },
  { id: 'cup-depth', kind: 'depth', name: 'printed pencil cup (depth)', shape: 'cup', lo: 18, hi: 38, jitter: 0.06, use: 'how far the pencil sinks in' },
];

/* ── Page widgets ────────────────────────────────────────────────────── */

const fmt = (x, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : '—');
const rnd = (lo, hi) => lo + Math.random() * (hi - lo);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function bus() {
  const map = {};
  return {
    on(name, fn) { (map[name] ||= []).push(fn); },
    emit(name, data) { (map[name] || []).forEach((fn) => fn(data)); },
  };
}

function mountCaliper(root, events) {
  const $ = (s) => root.querySelector(s);
  const canvas = $('[data-mf-canvas]');
  const box = $('[data-mf-canvas-box]');
  const toolSel = $('[data-mf-tool]');
  const kindSel = $('[data-mf-kind]');
  const prompt = $('[data-mf-prompt]');
  const answer = $('[data-mf-answer]');
  const unitTag = $('[data-mf-answer-unit]');
  const feedback = $('[data-mf-feedback]');
  const trialsEl = $('[data-mf-trials]');
  const digitalBar = $('[data-mf-digital]');
  const btnUnit = $('[data-mf-units]');
  const btnZero = $('[data-mf-zero]');
  const btnClose = $('[data-mf-close]');
  const btnSend = $('[data-mf-send]');

  const S = { tool: toolSel.value, kind: kindSel.value, obj: null, base: 0, v: 0, unit: 'mm', zeroed: true, off: 0, closed: false, reveal: false, trials: [], checked: false };
  // canvas2d() calls onResize once before it returns, so draw() waits until sim/ctx exist.
  let ready = false;
  const sim = window.SimKit && window.SimKit.canvas2d
    ? window.SimKit.canvas2d(canvas, { box, height: 470, onResize: () => { if (ready) draw(); } })
    : null;
  const ctx = sim ? sim.ctx : canvas.getContext('2d');
  ready = true;

  const res = () => (S.tool === 'digital' ? 0.01 : VERNIERS[S.tool].res);
  const shown = () => (S.closed ? 0 : S.v);

  function pickObject() {
    const pool = OBJECTS.filter((o) => S.kind === 'any' || o.kind === S.kind);
    let o = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && S.obj && o.id === S.obj.id) o = pool[(pool.indexOf(o) + 1) % pool.length];
    S.obj = o;
    S.base = rnd(o.lo, o.hi);
    S.trials = [];
    if (S.tool === 'digital' && Math.random() < 0.4) {
      S.zeroed = false;
      S.off = round((Math.random() < 0.5 ? -1 : 1) * rnd(0.03, 0.15), 0.01);
    }
    measureAgain(true);
  }
  function measureAgain(first) {
    const raw = S.base + (first ? 0 : (Math.random() * 2 - 1) * S.obj.jitter);
    S.v = round(Math.max(0.5, raw), res());
    S.closed = false; S.reveal = false; S.checked = false;
    answer.value = '';
    setFeedback('', '');
    updatePrompt();
    draw();
  }
  function setFeedback(text, tone) {
    feedback.textContent = text;
    feedback.dataset.tone = tone || '';
  }
  function jawWord(kind) {
    return kind === 'inside' ? 'inside jaws' : kind === 'depth' ? 'depth rod' : 'outside jaws';
  }
  function updatePrompt() {
    const o = S.obj;
    const n = S.trials.length + 1;
    prompt.innerHTML = `<strong>Measurement ${Math.min(n, 3)} of 3:</strong> the ${esc(o.name)}, using the <strong>${jawWord(o.kind)}</strong>. Read the caliper and type the reading.`;
    const inch = S.tool === 'digital' && S.unit === 'in';
    unitTag.textContent = inch ? 'in' : 'mm';
    answer.step = inch ? '0.0005' : String(res());
    digitalBar.hidden = S.tool !== 'digital';
    btnUnit.textContent = S.unit === 'mm' ? 'Switch to inches' : 'Switch to mm';
    btnClose.textContent = S.closed ? 'Open the jaws on the object' : 'Close the jaws (check zero)';
    btnClose.setAttribute('aria-pressed', S.closed ? 'true' : 'false');
  }
  function displayValue() {
    const raw = shown() + (S.zeroed ? 0 : S.off);
    if (S.unit === 'in') return { text: (round(raw / MM_PER_INCH, 0.0005)).toFixed(4), unit: 'in' };
    return { text: fmt(raw, 2), unit: 'mm' };
  }

  /* drawing */
  function draw() {
    if (!ready || !S.obj) return;
    const W = sim ? sim.width : canvas.clientWidth || 700;
    const Hh = sim ? sim.height : 470;
    ctx.clearRect(0, 0, W, Hh);
    ctx.fillStyle = '#fbfaf6';
    ctx.fillRect(0, 0, W, Hh);
    drawOverview(W);
    if (S.tool === 'digital') drawLcd(W, Hh); else drawVernier(W, Hh);
  }

  function steelRect(x, y, w, h, fill) {
    ctx.fillStyle = fill || '#d5dbe1';
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 1.2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  }
  function poly(points, fill, stroke) {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = stroke || '#4b5563'; ctx.lineWidth = 1.2; ctx.stroke();
  }

  function drawOverview(W) {
    const o = S.obj;
    const v = shown();
    const beamEnd = 120; // mm, drawn short
    const s = Math.min(5.2, (W - 40) / (beamEnd + 22 + 48));
    const X = (mm) => 20 + (mm + 22) * s;
    const yB = 92, hB = 20;
    // object behind jaws
    const objFill = '#f2c94c', objStroke = '#8a6d1b';
    if (!S.closed && o.kind === 'outside') {
      const cx = X(v / 2), cy = yB + hB + 52, R = (v / 2) * s;
      if (o.shape === 'hex' || o.shape === 'hexc') {
        const pts = [];
        for (let i = 0; i < 6; i++) {
          const a = (o.shape === 'hex' ? 0 : Math.PI / 6) + (i * Math.PI) / 3;
          const rr = o.shape === 'hex' ? R / Math.cos(Math.PI / 6) : R;
          pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
        }
        poly(pts, objFill, objStroke);
      } else if (o.shape === 'rect') {
        poly([[X(0), cy - 34], [X(v), cy - 34], [X(v), cy + 34], [X(0), cy + 34]], o.id === 'phone' ? '#334155' : '#f4a6b7', '#1f2937');
      } else {
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = o.shape === 'coin' ? '#c0c6cc' : o.id === 'aa' ? '#3f8f5a' : '#5b8def';
        ctx.fill(); ctx.strokeStyle = '#1f2937'; ctx.stroke();
      }
    }
    if (!S.closed && o.kind === 'inside') {
      const top = 14, bot = yB - 12, wall = Math.max(10, 3 * s);
      ctx.fillStyle = '#cfe3f5'; ctx.strokeStyle = '#2f5d86'; ctx.lineWidth = 1.5;
      ctx.fillRect(X(0) - wall, top, wall, bot - top); ctx.strokeRect(X(0) - wall, top, wall, bot - top);
      ctx.fillRect(X(v), top, wall, bot - top); ctx.strokeRect(X(v), top, wall, bot - top);
      ctx.fillStyle = '#2f5d86'; ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('cut-away ring', X(v) + wall + 6, top + 12);
    }
    // beam + scale ticks
    steelRect(X(-22), yB, (beamEnd + 22) * s, hB);
    ctx.strokeStyle = '#1f2933'; ctx.lineWidth = 1;
    for (let mm = 0; mm <= beamEnd - 4; mm += 1) {
      const len = mm % 10 === 0 ? 8 : mm % 5 === 0 ? 6 : 3.5;
      if (s < 3 && mm % 5 !== 0) continue;
      ctx.beginPath(); ctx.moveTo(X(mm) + 0.5, yB); ctx.lineTo(X(mm) + 0.5, yB + len); ctx.stroke();
    }
    // fixed head and jaws
    poly([[X(-22), yB - 26], [X(0), yB - 26], [X(0), yB], [X(-22), yB]], '#d5dbe1');
    poly([[X(-22), yB + hB], [X(0), yB + hB], [X(0), yB + hB + 108], [X(0) - 6, yB + hB + 120], [X(-14), yB + hB + 60], [X(-22), yB + hB + 40]], '#d5dbe1');
    poly([[X(0), yB - 26], [X(0), 6], [X(0) + 7, 14], [X(0) + 9, yB - 26]], '#d5dbe1');
    // slider
    const sx = X(v);
    poly([[sx, yB + hB + 6], [sx + 26, yB + hB + 6], [sx + 26, yB + hB + 60], [sx + 6, yB + hB + 120], [sx, yB + hB + 108]], '#c9d0d8');
    poly([[sx, yB - 18], [sx, 6], [sx - 7, 14], [sx - 9, yB - 18]], '#c9d0d8');
    ctx.fillStyle = 'rgba(201,208,216,0.95)';
    ctx.fillRect(sx, yB - 18, 150, hB + 24);
    ctx.strokeStyle = '#374151'; ctx.strokeRect(sx + 0.5, yB - 17.5, 150, hB + 24);
    // vernier window marker
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(sx + 4, yB + 2, 140, hB - 4);
    ctx.strokeStyle = '#d9480f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx + 4.5, yB + 2); ctx.lineTo(sx + 4.5, yB + hB - 2); ctx.stroke();
    // depth rod
    const rodX = X(beamEnd);
    ctx.fillStyle = '#9ca3af'; ctx.fillRect(rodX, yB + hB / 2 - 2, v * s, 4);
    if (!S.closed && o.kind === 'depth') {
      const t = 6, yT = yB - 22, yBt = yB + hB + 22, fl = rodX + v * s;
      ctx.fillStyle = '#e7d8c2'; ctx.strokeStyle = '#7a5c2e'; ctx.lineWidth = 1.5;
      ctx.fillRect(rodX, yT, v * s + t, t); ctx.strokeRect(rodX, yT, v * s + t, t);
      ctx.fillRect(rodX, yBt - t, v * s + t, t); ctx.strokeRect(rodX, yBt - t, v * s + t, t);
      ctx.fillRect(fl, yT, t, yBt - yT); ctx.strokeRect(fl, yT, t, yBt - yT);
      ctx.fillStyle = '#7a5c2e'; ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('cap on its side', rodX, yBt + 16);
    }
    // measuring faces in use
    ctx.strokeStyle = '#d9480f'; ctx.lineWidth = 3;
    ctx.beginPath();
    if (o.kind === 'outside') { ctx.moveTo(X(0), yB + hB + 4); ctx.lineTo(X(0), yB + hB + 104); ctx.moveTo(sx, yB + hB + 8); ctx.lineTo(sx, yB + hB + 104); }
    if (o.kind === 'inside') { ctx.moveTo(X(0), 12); ctx.lineTo(X(0), yB - 28); ctx.moveTo(sx, 12); ctx.lineTo(sx, yB - 20); }
    if (o.kind === 'depth') { ctx.moveTo(rodX, yB); ctx.lineTo(rodX, yB + hB); ctx.moveTo(rodX + v * s, yB + hB / 2 - 4); ctx.lineTo(rodX + v * s, yB + hB / 2 + 4); }
    ctx.stroke();
    ctx.fillStyle = '#334155'; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(S.closed ? 'Jaws closed: the reading should be zero' : 'Orange = the faces doing the measuring', W - 12, 16);
  }

  function drawVernier(W, Hh) {
    const V = VERNIERS[S.tool];
    const v = shown();
    const div = V.span / V.n;
    const y0 = 350; // main/vernier boundary (below the overview drawing, which reaches y ≈ 240)
    const from = Math.floor(v) - 4, to = v + V.span + 4;
    const s = (W - 40) / (to - from);
    const X = (mm) => 20 + (mm - from) * s;
    // plates
    ctx.fillStyle = '#e9edf1'; ctx.fillRect(10, y0 - 62, W - 20, 62);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.strokeRect(10.5, y0 - 61.5, W - 21, 62);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(X(v) - 16, y0, V.span * s + 32, 62);
    ctx.strokeRect(X(v) - 15.5, y0 + 0.5, V.span * s + 32, 62);
    ctx.fillStyle = '#334155'; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('Main scale (mm) · magnified', 14, y0 - 66);
    // main ticks
    ctx.strokeStyle = '#111827';
    for (let mm = Math.max(0, Math.ceil(from)); mm <= to; mm++) {
      const len = mm % 10 === 0 ? 30 : mm % 5 === 0 ? 22 : 14;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(X(mm) + 0.5, y0 - len); ctx.lineTo(X(mm) + 0.5, y0); ctx.stroke();
      if (mm % 10 === 0) {
        ctx.fillStyle = '#111827'; ctx.font = '700 16px system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(String(mm / 10), X(mm), y0 - 36);
      }
    }
    // vernier ticks
    const read = vernierRead(v, V.res);
    const every = Math.round(0.1 / V.res);
    for (let i = 0; i <= V.n; i++) {
      const x = X(v + i * div);
      const labelled = i % every === 0;
      const hl = S.reveal && i === read.line;
      ctx.strokeStyle = hl ? '#d9480f' : '#111827';
      ctx.lineWidth = hl ? 3 : 1.2;
      ctx.beginPath(); ctx.moveTo(x + 0.5, y0); ctx.lineTo(x + 0.5, y0 + (labelled ? 24 : 15)); ctx.stroke();
      if (labelled && (V.n <= 20 || (i / every) % 1 === 0)) {
        ctx.fillStyle = '#111827'; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(String(i / every), x, y0 + 40);
      }
    }
    ctx.fillStyle = '#334155'; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(`Vernier · each line ${V.res} mm`, X(v) + V.span * s + 14, y0 + 56);
    if (S.reveal) {
      ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(X(read.main) + 0.5, y0 - 34); ctx.lineTo(X(read.main) + 0.5, y0 - 2); ctx.stroke();
      ctx.fillStyle = '#1d4ed8'; ctx.font = '700 13px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`${read.main} mm`, X(read.main) + 4, y0 - 50);
      ctx.fillStyle = '#b8410c'; ctx.textAlign = 'center';
      ctx.fillText(`line ${read.line} → ${fmt(read.fraction, 2)}`, X(v + read.line * div), y0 + 58 + 14);
    }
  }

  function drawLcd(W, Hh) {
    const d = displayValue();
    const bw = Math.min(380, W - 40), bh = 96, bx = (W - bw) / 2, by = 300;
    ctx.fillStyle = '#374151';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx - 14, by - 14, bw + 28, bh + 28, 14) : ctx.rect(bx - 14, by - 14, bw + 28, bh + 28); ctx.fill();
    ctx.fillStyle = '#c5d3b5'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#1c2a12'; ctx.textAlign = 'right';
    ctx.font = '700 56px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';
    ctx.fillText(d.text, bx + bw - 62, by + 70);
    ctx.font = '700 20px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(d.unit, bx + bw - 52, by + 70);
    ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = '#475569'; ctx.textAlign = 'center';
    ctx.fillText('digital caliper display', W / 2, by + bh + 32);
  }

  /* checking */
  function check() {
    const typed = parseNumber(answer.value);
    if (!Number.isFinite(typed)) { setFeedback('Type the number you read, like 7.25.', 'err'); return; }
    if (S.closed) { setFeedback('Open the jaws on the object first: right now you are checking zero.', 'err'); return; }
    const inch = S.tool === 'digital' && S.unit === 'in';
    const target = inch ? round(S.v / MM_PER_INCH, 0.0005) : S.v;
    const tol = inch ? 0.00026 : res() / 2 - 1e-9;
    const close = (a, b) => Math.abs(a - b) <= tol + 1e-9;
    if (close(typed, target)) {
      if (S.checked) { setFeedback('Already recorded. Press "Measure again" for the next trial.', 'ok'); return; }
      S.checked = true;
      S.reveal = S.tool !== 'digital';
      S.trials.push(S.v);
      const extra = S.tool === 'digital' ? '' : ` (${vernierRead(S.v, res()).main} on the main scale + line ${vernierRead(S.v, res()).line} × ${res()}).`;
      setFeedback(`✓ ${inch ? target.toFixed(4) + ' in = ' : ''}${fmt(S.v, 2)} mm${extra ? extra : '.'} Recorded as trial ${S.trials.length}.`, 'ok');
      renderTrials(); updatePrompt(); draw();
      return;
    }
    if (S.tool === 'digital') {
      const withOff = inch ? round((S.v + S.off) / MM_PER_INCH, 0.0005) : round(S.v + S.off, 0.01);
      if (!S.zeroed && close(typed, withOff)) {
        setFeedback(`You read the display right, but this caliper is not zeroed. Close the jaws: it shows ${inch ? round(S.off / MM_PER_INCH, 0.0005).toFixed(4) : fmt(S.off)} instead of zero. Press ZERO, open on the object and read again.`, 'err');
        return;
      }
      if (inch && close(typed / MM_PER_INCH, target)) { setFeedback('That number is in millimetres, but the display is set to inches. Read what the screen says, or switch units.', 'err'); return; }
      setFeedback('Not quite. Read every digit on the display, including the zeros after the point.', 'err');
      return;
    }
    const r = vernierRead(S.v, res());
    if (close(typed, r.main)) setFeedback(`You found the main-scale millimetres (${r.main}). Now add the vernier: find the one vernier line that lines up exactly.`, 'err');
    else if (close(typed, r.main + 1 + r.fraction) || close(typed, r.main - 1 + r.fraction)) setFeedback('Your vernier part is right, but check the whole millimetres: use the main-scale line just to the left of the vernier 0.', 'err');
    else if (S.tool !== 'v10' && close(typed, r.main + r.line * 0.1)) setFeedback(`Each vernier line is ${res()} mm, not 0.1 mm. The printed numbers count tenths: line ${r.line} is ${r.line} × ${res()}.`, 'err');
    else setFeedback('Not quite. Look along the vernier for the single line that makes a straight line with a main-scale line above it.', 'err');
  }

  function renderTrials() {
    const t = S.trials;
    const cells = [0, 1, 2].map((i) => `<td>${t[i] !== undefined ? fmt(t[i]) : '—'}</td>`).join('');
    let avg = '—', spread = '—';
    if (t.length) {
      avg = fmt(t.reduce((a, b) => a + b, 0) / t.length, 2);
      spread = fmt(Math.max(...t) - Math.min(...t), 2);
    }
    trialsEl.innerHTML = `<table class="mf-table"><caption>Your three measurements of the ${esc(S.obj.name)} (mm)</caption><thead><tr><th scope="col">Trial 1</th><th scope="col">Trial 2</th><th scope="col">Trial 3</th><th scope="col">Average</th><th scope="col">Spread</th></tr></thead><tbody><tr>${cells}<td><strong>${avg}</strong></td><td>${spread}</td></tr></tbody></table>`;
    btnSend.hidden = t.length < 3;
    if (t.length >= 3) {
      const a = t.reduce((x, y) => x + y, 0) / 3;
      const sp = Math.max(...t) - Math.min(...t);
      setFeedback(`${feedback.textContent} Three trials done: average ${fmt(a)} mm, spread ${fmt(sp)} mm${sp > 0.1 ? ' (more than 0.1 mm: measure a fourth time and look for what changed)' : ''}. Use the average for ${S.obj.use}.`, 'ok');
    }
  }

  $('[data-mf-check]').addEventListener('click', check);
  answer.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); check(); } });
  $('[data-mf-new]').addEventListener('click', () => { pickObject(); renderTrials(); });
  $('[data-mf-again]').addEventListener('click', () => {
    if (!S.checked && S.trials.length < 3) { setFeedback('Read and check this measurement first; then measure again.', 'err'); return; }
    if (S.trials.length >= 3) { pickObject(); renderTrials(); return; }
    measureAgain(false);
  });
  $('[data-mf-show]').addEventListener('click', () => {
    if (S.tool === 'digital') {
      const d = displayValue();
      setFeedback(S.zeroed ? `The display says ${d.text} ${d.unit}.` : `The display says ${d.text} ${d.unit}, but close the jaws first: this caliper is not zeroed.`, '');
    } else {
      S.reveal = true;
      const r = vernierRead(S.v, res());
      setFeedback(`Main scale: ${r.main} mm (the line just left of vernier 0). Vernier: line ${r.line} lines up → ${r.line} × ${res()} = ${fmt(r.fraction)} mm. Reading: ${fmt(S.v)} mm. Type it in to record it.`, '');
    }
    draw();
  });
  btnUnit.addEventListener('click', () => { S.unit = S.unit === 'mm' ? 'in' : 'mm'; answer.value = ''; updatePrompt(); draw(); });
  btnZero.addEventListener('click', () => {
    if (!S.closed) { setFeedback('Close the jaws before pressing ZERO, or the caliper will call this size "zero".', 'err'); return; }
    S.zeroed = true; S.off = 0; setFeedback('Zeroed. Open the jaws on the object and read it.', 'ok'); draw();
  });
  btnClose.addEventListener('click', () => { S.closed = !S.closed; S.reveal = false; updatePrompt(); draw(); });
  toolSel.addEventListener('change', () => { S.tool = toolSel.value; if (S.tool !== 'digital') S.unit = 'mm'; pickObject(); renderTrials(); });
  kindSel.addEventListener('change', () => { S.kind = kindSel.value; pickObject(); renderTrials(); });
  btnSend.addEventListener('click', () => {
    const a = S.trials.reduce((x, y) => x + y, 0) / S.trials.length;
    events.emit('measured', { size: round(a, 0.01), kind: S.obj.kind, name: S.obj.name });
    document.getElementById('mf-fit-lab')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  pickObject();
  renderTrials();
  if (!sim) draw();
}

function mountFit(root, events) {
  const $ = (s) => root.querySelector(s);
  const size = $('[data-mf-fit-size]');
  const unit = $('[data-mf-fit-unit]');
  const corr = $('[data-mf-fit-corr]');
  const out = $('[data-mf-fit-out]');
  const note = $('[data-mf-fit-note]');
  const radios = () => root.querySelectorAll('input[name="mf-fit"]');
  const kinds = () => root.querySelectorAll('input[name="mf-kind"]');
  const val = (list) => [...list].find((r) => r.checked)?.value;

  function update() {
    const raw = parseNumber(size.value);
    const item = toMm(raw, unit.value);
    const fit = val(radios()) || 'slip';
    const kind = val(kinds()) || 'hole';
    const c = parseNumber(corr.value);
    const r = designSize({ item, fit, kind, correction: Number.isFinite(c) ? c : 0 });
    if (!r) { out.innerHTML = '<p class="mf-out-empty">Type the item\'s measured size to get a size to model.</p>'; return; }
    const word = kind === 'peg' ? 'peg' : 'hole';
    const sign = kind === 'peg' ? '−' : '+';
    const inchLine = unit.value === 'in' ? ` <span class="mf-out-sub">(${fmt(r.model / MM_PER_INCH, 3)} in; ${fmt(raw, 4)} in = ${fmt(item)} mm)</span>` : '';
    out.innerHTML = `
      <p class="mf-out-big">Model the ${word} at <strong>${fmt(r.model)} mm</strong>${inchLine}</p>
      <p>${esc(r.fit.label)}: ${fmt(item)} mm ${sign} 2 × ${fmt(r.gapPerSide)} mm gap${c ? ` ${sign} ${fmt(Math.abs(c))} mm printer correction` : ''} = ${fmt(r.exact, 3)} mm, rounded to the nearest 0.05 mm.</p>
      <p>The ${esc(r.fit.label.toLowerCase())} range for this item is <strong>${fmt(r.low)}–${fmt(r.high)} mm</strong>. ${esc(r.fit.feel)}</p>`;
    note.textContent = kind === 'peg'
      ? 'A peg goes inside a real hole, so the gap comes off its size. Printed outer surfaces tend to come out slightly big, which is the opposite of holes.'
      : 'Not sure your printer hits this? Print the fit test coupon below: its holes step through every fit around your item.';
    events.emit('fit', { item, fit, kind, model: r.model });
  }
  root.addEventListener('input', update);
  root.addEventListener('change', update);
  events.on('measured', ({ size: s, kind }) => {
    size.value = fmt(s);
    unit.value = 'mm';
    const want = kind === 'inside' ? 'peg' : 'hole';
    kinds().forEach((r) => { r.checked = r.value === want; });
    update();
  });
  update();
}

function mountCoupon(root, events) {
  const $ = (s) => root.querySelector(s);
  const item = $('[data-mf-c-item]');
  const shape = $('[data-mf-c-shape]');
  const set = $('[data-mf-c-set]');
  const thick = $('[data-mf-c-thick]');
  const slotLen = $('[data-mf-c-slot]');
  const slotRow = $('[data-mf-c-slot-row]');
  const preview = $('[data-mf-c-preview]');
  const info = $('[data-mf-c-info]');
  const sheet = $('[data-mf-c-sheet]');
  const dl = $('[data-mf-c-download]');
  const dlNote = $('[data-mf-c-note]');
  let current = null;

  function opts() {
    return {
      item: parseNumber(item.value),
      shape: shape.value,
      set: set.value,
      wall: 3,
      thickness: Math.min(12, Math.max(2, parseNumber(thick.value) || 5)),
      slotLength: Math.min(60, Math.max(8, parseNumber(slotLen.value) || 20)),
    };
  }

  function svgPreview(L) {
    const pad = 6, w = L.width, h = L.height;
    const parts = [];
    parts.push(`<svg viewBox="${-pad} ${-pad - 9} ${w + 2 * pad} ${h + 2 * pad + 18}" role="img" aria-label="Top view of the fit test coupon: ${L.sizes.length} ${L.shape === 'slot' ? 'slots' : 'holes'} from ${fmt(L.sizes[0])} to ${fmt(L.sizes[L.sizes.length - 1])} mm, notched corner at the smallest.">`);
    const c0 = Math.min(0.35 * L.cellW / 2, L.shape === 'slot' ? 0.7 * L.wall : L.cellW / 2 - (L.sizes[0] / 2 + 1) / Math.SQRT2);
    parts.push(`<path d="M${c0} ${h} L0 ${h - c0} V0 H${w} V${h} Z" transform="scale(1,-1) translate(0 ${-h})" fill="#d7e6f3" stroke="#2f5d86" stroke-width="0.4"/>`);
    L.cells.forEach((cell, i) => {
      if (L.shape === 'slot') parts.push(`<rect x="${cell.cx - cell.size / 2}" y="${cell.cy - L.slotLength / 2}" width="${cell.size}" height="${L.slotLength}" fill="#fbfaf6" stroke="#2f5d86" stroke-width="0.3"/>`);
      else parts.push(`<circle cx="${cell.cx}" cy="${cell.cy}" r="${cell.size / 2}" fill="#fbfaf6" stroke="#2f5d86" stroke-width="0.3"/>`);
      parts.push(`<text x="${cell.cx}" y="${h + 6}" font-size="${Math.min(4, L.cellW / 4)}" text-anchor="middle" fill="currentColor">${fmt(cell.size)}</text>`);
      parts.push(`<text x="${cell.cx}" y="-2.5" font-size="${Math.min(3.4, L.cellW / 4.5)}" text-anchor="middle" fill="currentColor">${String.fromCharCode(65 + i)}</text>`);
    });
    parts.push('</svg>');
    return parts.join('');
  }

  function update() {
    const o = opts();
    slotRow.hidden = o.shape !== 'slot';
    if (!Number.isFinite(o.item) || o.item < 1 || o.item > 80) {
      current = null;
      preview.innerHTML = '';
      info.textContent = 'Type the item size in millimetres (1–80 mm).';
      dl.disabled = true;
      return;
    }
    dl.disabled = false;
    const L = couponLayout(o);
    current = { o, L };
    preview.innerHTML = svgPreview(L);
    const big = L.width > 200;
    const word = o.shape === 'slot' ? 'slot' : 'hole';
    info.innerHTML = `Plate ${fmt(L.width, 1)} × ${fmt(L.height, 1)} × ${fmt(o.thickness, 1)} mm · ${L.sizes.length} ${word}s from ${fmt(L.sizes[0])} to ${fmt(L.sizes[L.sizes.length - 1])} mm · the notched corner marks ${word} A, the smallest.${big ? ' <strong>Over 200 mm long:</strong> choose “5 sizes” or check it fits your printer bed.' : ''}`;
    const fitName = (d) => (d < 0.05 ? 'no gap: line-to-line' : d <= 0.3 + 1e-9 ? 'press range' : d <= 0.6 + 1e-9 ? 'slip range' : 'loose range');
    sheet.innerHTML = L.sizes.map((s, i) => {
      const extra = round(s - o.item, 0.01);
      return `<tr><th scope="row">${String.fromCharCode(65 + i)}</th><td>${fmt(s)}</td><td>+${fmt(extra)} (${fmt(extra / 2)} per side, ${fitName(extra)})</td><td><input type="text" inputmode="decimal" aria-label="Printed size of ${word} ${String.fromCharCode(65 + i)}" placeholder="mm"></td><td><select aria-label="How ${word} ${String.fromCharCode(65 + i)} fits"><option value="">—</option><option>Won't go in</option><option>Press: push, stays</option><option>Slip: slides, no wobble</option><option>Loose: drops, turns</option><option>Too loose</option></select></td></tr>`;
    }).join('');
    dlNote.textContent = '';
  }

  dl.addEventListener('click', () => {
    if (!current) return;
    const mesh = buildCouponMesh(current.o);
    const st = meshStats(mesh);
    if (!st.watertight) { dlNote.textContent = 'Something went wrong building the mesh; try a different size.'; return; }
    const name = `fit-coupon-${current.o.shape}-${fmt(current.o.item).replace('.', '_')}mm.stl`;
    const blob = new Blob([meshToStl(mesh, name)], { type: 'model/stl' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    dlNote.textContent = `Saved ${name}: ${st.triangles} triangles, watertight, ${fmt(st.volume / 1000, 1)} cm³ of plastic at 100% infill.`;
  });
  root.addEventListener('input', (e) => { if (!e.target.closest('[data-mf-c-sheet]')) update(); });
  root.addEventListener('change', (e) => { if (!e.target.closest('[data-mf-c-sheet]')) update(); });
  events.on('measured', ({ size: s, kind }) => {
    if (kind === 'outside') { item.value = fmt(s); update(); }
  });
  events.on('fit', ({ item: it, kind }) => {
    if (kind === 'hole' && Number.isFinite(it) && document.activeElement !== item) { item.value = fmt(it); update(); }
  });
  update();
}

function mountConverter(root) {
  const mm = root.querySelector('[data-mf-conv-mm]');
  const inch = root.querySelector('[data-mf-conv-in]');
  const out = root.querySelector('[data-mf-conv-out]');
  const show = (a, b) => { out.textContent = `${a} = ${b}`; };
  mm.addEventListener('input', () => {
    const v = parseNumber(mm.value);
    if (!Number.isFinite(v)) { out.textContent = ''; return; }
    inch.value = fmt(v / MM_PER_INCH, 4);
    show(`${fmt(v)} mm`, `${fmt(v / MM_PER_INCH, 4)} in  (${fmt(v)} ÷ 25.4)`);
  });
  inch.addEventListener('input', () => {
    const v = parseNumber(inch.value);
    if (!Number.isFinite(v)) { out.textContent = ''; return; }
    mm.value = fmt(v * MM_PER_INCH, 2);
    show(`${inch.value.trim()} in`, `${fmt(v * MM_PER_INCH, 2)} mm  (${fmt(v, 4)} × 25.4)`);
  });
}

if (typeof document !== 'undefined') {
  const start = () => {
    const events = bus();
    const fit = document.querySelector('[data-mf-fit]');
    const coupon = document.querySelector('[data-mf-coupon]');
    if (fit) mountFit(fit, events);
    if (coupon) mountCoupon(coupon, events);
    const cal = document.querySelector('[data-mf-caliper]');
    if (cal) mountCaliper(cal, events);
    const conv = document.querySelector('[data-mf-converter]');
    if (conv) mountConverter(conv);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}
