/* scale-models.mjs — Scale Models lesson (lessons/3d-design/architecture/scale-models.html).
 *
 * Two widgets:
 *   [data-sm-calc]   scale calculator: real ↔ model, and "which scale fits my printer?"
 *   [data-sm-maker]  plan → model: draw rooms on a 0.5 m grid, choose a scale, extrude
 *                    walls (or a solid massing block), see which walls print too thin,
 *                    split the storeys for printing, and download an STL.
 *
 * The geometry is pure (exported, no DOM) so it can be checked in Node:
 * planToBodies() turns rooms into labelled boxes, then voxelises them on a
 * rectilinear grid whose lines are exactly the boxes' faces. Every face of
 * that grid is shared by the two cells beside it, so the skin it emits is
 * closed and needs no boolean kernel.
 */

import { DEFAULT_PRINTER, printerFit, writeBinaryStl, edgeReport } from '../fab-io.mjs';

export const GRID = 0.5;                       // plan grid, metres
export const NOZZLE = DEFAULT_PRINTER.nozzle;  // 0.4 mm
export const LAYER = 0.2;                      // mm, classroom default
export const WALL_MIN = 2 * NOZZLE;            // 0.8 mm: two beads, the least that holds together
export const WALL_SAFE = 3 * NOZZLE;           // 1.2 mm: survives handling (same rule Forge uses)
export const SLAB_MIN = 4 * LAYER;             // 0.8 mm: four layers make a solid floor
export const STANDARD_SCALES = [1, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 1250, 2500];
export const PERSON_HEIGHT = 1.7;              // m

const UNIT_TO_M = { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048 };

/* ── scale arithmetic ─────────────────────────────────────────────────── */

export const toModelMm = (metres, scale) => (metres * 1000) / scale;
export const toRealM = (modelMm, scale) => (modelMm * scale) / 1000;
export const unitToMetres = (value, unit) => value * (UNIT_TO_M[unit] ?? 1);

export function wallVerdict(mm) {
  if (mm < WALL_MIN - 1e-9) return { tone: 'bad', tag: 'TOO THIN', text: `${fmt(mm)} mm is less than two ${NOZZLE} mm beads: it won’t print, or it snaps.` };
  if (mm < WALL_SAFE - 1e-9) return { tone: 'warn', tag: 'THIN', text: `${fmt(mm)} mm is two beads wide: it prints, but it is fragile.` };
  return { tone: 'ok', tag: 'OK', text: `${fmt(mm)} mm is ${Math.floor(mm / NOZZLE + 1e-9)} beads wide: strong enough to handle.` };
}

export function slabVerdict(mm) {
  if (mm < SLAB_MIN - 1e-9) return { tone: 'bad', tag: 'TOO THIN', text: `${fmt(mm)} mm is fewer than four ${LAYER} mm layers: it prints as a floppy sheet.` };
  return { tone: 'ok', tag: 'OK', text: `${fmt(mm)} mm is ${Math.round(mm / LAYER)} layers.` };
}

/* Largest standard scale (smallest N in 1:N) at which a building of
   l × w × h metres fits the printer, with a margin around it. */
export function scaleThatFits(l, w, h, { printer = DEFAULT_PRINTER, margin = 10, scales = STANDARD_SCALES } = {}) {
  const rows = scales.map((n) => {
    const size = [toModelMm(l, n), toModelMm(w, n), toModelMm(h, n)];
    const fit = printerFit(size.map((v, i) => v + (i < 2 ? margin : 0)), printer);
    return { scale: n, size, fits: fit.fits, turned: fit.turned };
  });
  const best = rows.find((r) => r.fits) || null;
  return { rows, best };
}

export function fmt(v, digits) {
  if (!Number.isFinite(v)) return '–';
  const a = Math.abs(v);
  const d = digits ?? (a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 2);
  return Number(v.toFixed(d)).toLocaleString('en-US', { maximumFractionDigits: d });
}

/* ── plans ────────────────────────────────────────────────────────────── */
/* A plan is { rooms: [{x0,y0,x1,y1}] in grid cells, doors: ['h:i:j', 'v:i:j'] }.
   'h:i:j' is the horizontal grid edge along y = j from x = i to i + 1;
   'v:i:j' the vertical edge along x = i from y = j to j + 1. */

export const PRESETS = {
  classroom: {
    label: 'Classroom 9 × 7 m',
    plan: { rooms: [{ x0: 4, y0: 3, x1: 22, y1: 17 }], doors: ['h:16:3', 'h:17:3'] },
    settings: { storeys: 1, height: 3.0 },
  },
  school: {
    label: 'School block (matches the Workbench template)',
    plan: { rooms: [{ x0: 4, y0: 3, x1: 15, y1: 17 }, { x0: 15, y0: 3, x1: 24, y1: 17 }], doors: ['h:13:3', 'h:14:3', 'v:15:9', 'v:15:10'] },
    settings: { storeys: 2, height: 3.1 },
  },
  house: {
    label: 'Small house, 5 rooms',
    plan: {
      rooms: [
        { x0: 4, y0: 3, x1: 14, y1: 11 }, { x0: 14, y0: 3, x1: 20, y1: 11 },
        { x0: 4, y0: 11, x1: 12, y1: 18 }, { x0: 12, y0: 11, x1: 16, y1: 18 }, { x0: 16, y0: 11, x1: 20, y1: 18 },
      ],
      doors: ['h:7:3', 'h:8:3', 'v:14:6', 'v:14:7', 'h:9:11', 'h:10:11', 'h:13:11', 'h:14:11', 'h:17:11', 'h:18:11'],
    },
    settings: { storeys: 1, height: 2.7 },
  },
  blank: { label: 'Blank site', plan: { rooms: [], doors: [] }, settings: {} },
};

export const DEFAULT_SETTINGS = {
  scale: 100, storeys: 1, height: 3.0, slab: 0.3, ext: 0.3, int: 0.1,
  mode: 'walls', thicken: false, split: false, person: true,
};

export function ownerGrid(plan) {
  const owner = new Map();
  plan.rooms.forEach((r, n) => {
    for (let i = Math.min(r.x0, r.x1); i < Math.max(r.x0, r.x1); i++) for (let j = Math.min(r.y0, r.y1); j < Math.max(r.y0, r.y1); j++) owner.set(`${i},${j}`, n);
  });
  return owner;
}

/* Wall segments: maximal runs of grid edges with different rooms on each
   side and no door, merged by line and kind. */
export function wallSegments(plan) {
  const owner = ownerGrid(plan);
  const own = (i, j) => (owner.has(`${i},${j}`) ? owner.get(`${i},${j}`) : -1);
  const doors = new Set(plan.doors || []);
  const edges = [];
  if (!owner.size) return [];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const k of owner.keys()) { const [i, j] = k.split(',').map(Number); x0 = Math.min(x0, i); x1 = Math.max(x1, i + 1); y0 = Math.min(y0, j); y1 = Math.max(y1, j + 1); }
  for (let j = y0; j <= y1; j++) for (let i = x0; i < x1; i++) {
    const a = own(i, j - 1), b = own(i, j);
    if (a !== b && !doors.has(`h:${i}:${j}`)) edges.push({ dir: 'h', line: j, at: i, kind: a < 0 || b < 0 ? 'ext' : 'int' });
  }
  for (let i = x0; i <= x1; i++) for (let j = y0; j < y1; j++) {
    const a = own(i - 1, j), b = own(i, j);
    if (a !== b && !doors.has(`v:${i}:${j}`)) edges.push({ dir: 'v', line: i, at: j, kind: a < 0 || b < 0 ? 'ext' : 'int' });
  }
  edges.sort((p, q) => (p.dir + p.kind + String(p.line).padStart(6, '0')).localeCompare(q.dir + q.kind + String(q.line).padStart(6, '0')) || p.at - q.at);
  const segs = [];
  for (const e of edges) {
    const last = segs[segs.length - 1];
    if (last && last.dir === e.dir && last.kind === e.kind && last.line === e.line && last.to === e.at) last.to = e.at + 1;
    else segs.push({ dir: e.dir, kind: e.kind, line: e.line, from: e.at, to: e.at + 1 });
  }
  return segs;
}

/* Effective wall and slab thicknesses (metres, real) after optional thickening. */
export function thicknesses(s) {
  const minReal = (mm) => toRealM(mm, s.scale);
  const t = { ext: s.ext, int: s.int, slab: s.slab };
  if (s.thicken) {
    t.ext = Math.max(t.ext, minReal(WALL_SAFE));
    t.int = Math.max(t.int, minReal(WALL_SAFE));
    t.slab = Math.max(t.slab, minReal(SLAB_MIN));
  }
  return t;
}

/* Labelled boxes (metres) for each body. Labels: 1 slab/roof, 2 ext wall, 3 int wall, 4 massing. */
export function planBoxes(plan, s) {
  const segs = wallSegments(plan);
  const t = thicknesses(s);
  const g = GRID;
  const footprint = plan.rooms.map((r) => ({ x0: Math.min(r.x0, r.x1) * g, x1: Math.max(r.x0, r.x1) * g, y0: Math.min(r.y0, r.y1) * g, y1: Math.max(r.y0, r.y1) * g }));
  const walls = segs.map((sg) => {
    const th = sg.kind === 'ext' ? t.ext : t.int;
    const a = sg.from * g - th / 2, b = sg.to * g + th / 2, c = sg.line * g;
    const rect = sg.dir === 'h' ? { x0: a, x1: b, y0: c - th / 2, y1: c + th / 2 } : { x0: c - th / 2, x1: c + th / 2, y0: a, y1: b };
    return { ...rect, kind: sg.kind };
  });
  // the slab covers the rooms and the outer half of the outside walls
  const slabRects = [...footprint, ...walls.filter((w) => w.kind === 'ext')];
  const H = s.height, n = Math.max(1, s.storeys | 0);
  const bodies = [];
  if (!footprint.length) return { bodies, t, segs };
  if (s.mode === 'massing') {
    bodies.push({ name: 'Massing block', boxes: slabRects.map((r) => ({ ...r, z0: 0, z1: n * H, label: 4 })) });
  } else {
    const storey = (k, z) => [
      ...slabRects.map((r) => ({ ...r, z0: z, z1: z + t.slab, label: 1 })),
      ...walls.map((w) => ({ ...w, z0: z + t.slab, z1: z + H, label: w.kind === 'ext' ? 2 : 3 })),
    ];
    const roof = (z) => slabRects.map((r) => ({ ...r, z0: z, z1: z + t.slab, label: 1 }));
    if (s.split) {
      for (let k = 0; k < n; k++) bodies.push({ name: k === 0 ? 'Ground floor' : `Floor ${k + 1}`, boxes: storey(k, 0), stackZ: k * H });
      bodies.push({ name: 'Roof', boxes: roof(0), stackZ: n * H });
    } else {
      const all = [];
      for (let k = 0; k < n; k++) all.push(...storey(k, k * H));
      all.push(...roof(n * H));
      bodies.push({ name: 'Whole building', boxes: all });
    }
  }
  return { bodies, t, segs };
}

const PRIORITY = [0, 1, 4, 3, 2];  // ext wall shows over int wall over massing over slab

/* Voxelise boxes on the grid made by their own faces; emit the boundary.
   Returns { positions: Float32Array, labels: Uint8Array (per triangle), bounds }. */
export function meshBoxes(boxes, k = 1, offset = [0, 0, 0]) {
  const key = (v) => Math.round(v * 1e6) / 1e6;
  const uniq = (arr) => [...new Set(arr.map(key))].sort((a, b) => a - b);
  const xs = uniq(boxes.flatMap((b) => [b.x0, b.x1]));
  const ys = uniq(boxes.flatMap((b) => [b.y0, b.y1]));
  const zs = uniq(boxes.flatMap((b) => [b.z0, b.z1]));
  const nx = xs.length - 1, ny = ys.length - 1, nz = zs.length - 1;
  if (nx < 1 || ny < 1 || nz < 1) return { positions: new Float32Array(0), labels: new Uint8Array(0) };
  const occ = new Uint8Array(nx * ny * nz);
  const idx = (i, j, l) => (l * ny + j) * nx + i;
  const find = (arr, v) => { let lo = 0, hi = arr.length - 1; v = key(v); while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < v) lo = m + 1; else hi = m; } return lo; };
  for (const b of boxes) {
    const i0 = find(xs, b.x0), i1 = find(xs, b.x1), j0 = find(ys, b.y0), j1 = find(ys, b.y1), l0 = find(zs, b.z0), l1 = find(zs, b.z1);
    for (let l = l0; l < l1; l++) for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
      const c = idx(i, j, l);
      if (PRIORITY[b.label] > PRIORITY[occ[c]]) occ[c] = b.label;
    }
  }
  const at = (i, j, l) => (i < 0 || j < 0 || l < 0 || i >= nx || j >= ny || l >= nz ? 0 : occ[idx(i, j, l)]);
  const P = [], L = [];
  const X = (i) => xs[i] * k + offset[0], Y = (j) => ys[j] * k + offset[1], Z = (l) => zs[l] * k + offset[2];
  const quad = (a, b, c, d, label) => { P.push(...a, ...b, ...c, ...a, ...c, ...d); L.push(label, label); };
  for (let l = 0; l < nz; l++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const lab = occ[idx(i, j, l)];
    if (!lab) continue;
    const x0 = X(i), x1 = X(i + 1), y0 = Y(j), y1 = Y(j + 1), z0 = Z(l), z1 = Z(l + 1);
    if (!at(i - 1, j, l)) quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], lab);
    if (!at(i + 1, j, l)) quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], lab);
    if (!at(i, j - 1, l)) quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], lab);
    if (!at(i, j + 1, l)) quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], lab);
    if (!at(i, j, l - 1)) quad([x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], lab);
    if (!at(i, j, l + 1)) quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], lab);
  }
  return {
    positions: Float32Array.from(P), labels: Uint8Array.from(L),
    min: [X(0), Y(0), Z(0)], max: [X(nx), Y(ny), Z(nz)],
  };
}

/* A plain block person, 0.5 × 0.3 × 1.7 m: the scale figure. */
export function personBox(k, at) {
  const w = 0.5 * k, d = 0.3 * k, h = PERSON_HEIGHT * k;
  return meshBoxes([{ x0: 0, x1: w, y0: 0, y1: d, z0: 0, z1: h, label: 4 }], 1, at);
}

/* Everything the maker shows and exports, in model millimetres. */
export function buildModel(plan, settings) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const k = 1000 / s.scale;
  const { bodies, t, segs } = planBoxes(plan, s);
  const gap = 8;                     // mm between parts on the bed, as Forge and Workbench lay them out
  const meshes = [];
  const raws = bodies.map((body) => ({ body, raw: meshBoxes(body.boxes, k) })).filter((r) => r.raw.positions.length);
  // split parts go left to right, wrapping to a new row when the bed is full
  let x = 0, y = 0, rowDepth = 0;
  for (const { body, raw } of raws) {
    let offset = null;
    if (s.split && raws.length > 1) {
      const w = raw.max[0] - raw.min[0], d = raw.max[1] - raw.min[1];
      if (x > 0 && x + w > DEFAULT_PRINTER.build.x) { x = 0; y -= rowDepth + gap; rowDepth = 0; }
      offset = [x - raw.min[0], y - raw.max[1], 0];
      x += w + gap; rowDepth = Math.max(rowDepth, d);
    }
    const moved = offset ? meshBoxes(body.boxes, k, offset) : raw;
    meshes.push({ name: body.name, ...moved, stackZ: (body.stackZ || 0) * k });
  }
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const m of meshes) for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], m.min[a]); max[a] = Math.max(max[a], m.max[a]); }
  const size = meshes.length ? max.map((v, a) => v - min[a]) : [0, 0, 0];
  const hasExt = segs.some((sg) => sg.kind === 'ext'), hasInt = segs.some((sg) => sg.kind === 'int');
  const printed = { ext: t.ext * k, int: t.int * k, slab: t.slab * k };
  const verdicts = [];
  if (s.mode !== 'massing') {
    if (hasExt) verdicts.push({ part: 'Outside walls', ...wallVerdict(printed.ext) });
    if (hasInt) verdicts.push({ part: 'Inside walls', ...wallVerdict(printed.int) });
    verdicts.push({ part: 'Floors and roof', ...slabVerdict(printed.slab) });
  }
  const fit = meshes.length ? printerFit(size) : { fits: true, turned: false, overBy: [0, 0, 0] };
  const partFits = meshes.map((m) => printerFit(m.max.map((v, a) => v - m.min[a])).fits);
  return { s, k, meshes, size, min, max, printed, verdicts, fit, partFits, segs, thick: t };
}

export function stlFor(model) {
  const parts = model.meshes.map((m) => m.positions);
  const n = parts.reduce((a, p) => a + p.length, 0);
  const all = new Float32Array(n);
  let o = 0;
  for (const p of parts) { all.set(p, o); o += p.length; }
  // rest on the bed, centred
  const [x0, y0, z0] = model.min, [x1, y1] = model.max;
  for (let i = 0; i < all.length; i += 3) { all[i] -= (x0 + x1) / 2; all[i + 1] -= (y0 + y1) / 2; all[i + 2] -= z0; }
  return { positions: all, buffer: writeBinaryStl(all, `ClassroomOS scale model 1:${model.s.scale}`) };
}

export { edgeReport };

/* ═════════════════════════════════ DOM ═════════════════════════════════ */

const SCALE_OPTIONS = [20, 50, 100, 200, 500];
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage off */ } },
};
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [a, v] of Object.entries(attrs)) {
    if (a === 'class') n.className = v; else if (a === 'text') n.textContent = v; else if (a.startsWith('on')) n.addEventListener(a.slice(2), v); else n.setAttribute(a, v);
  }
  for (const kid of kids) if (kid != null) n.append(kid);
  return n;
};

/* ── calculator ─────────────────────────────────────────────────────────── */

function mountCalculator(root) {
  const $ = (s) => root.querySelector(s);
  const len = $('[data-sm-len]'), unit = $('[data-sm-unit]'), scaleSel = $('[data-sm-scale]'), custom = $('[data-sm-custom]');
  const out = $('[data-sm-out]'), bar = $('[data-sm-bar]');
  const modelIn = $('[data-sm-model]'), realOut = $('[data-sm-real]');
  const fitL = $('[data-sm-fit-l]'), fitW = $('[data-sm-fit-w]'), fitH = $('[data-sm-fit-h]'), fitOut = $('[data-sm-fit-out]'), fitTable = $('[data-sm-fit-table]');
  const scale = () => {
    const v = scaleSel.value === 'custom' ? Number(custom.value) : Number(scaleSel.value);
    return Number.isFinite(v) && v > 0 ? v : 100;
  };
  function update() {
    custom.hidden = scaleSel.value !== 'custom';
    const n = scale();
    const m = unitToMetres(Number(len.value) || 0, unit.value);
    const mm = toModelMm(m, n);
    out.innerHTML = '';
    out.append(
      el('p', { class: 'sm-big' }, el('strong', { text: `${fmt(mm)} mm` }), ` on the model (${fmt(mm / 25.4)} in)`),
      el('p', { text: `${fmt(Number(len.value) || 0)} ${unit.value} ÷ ${n.toLocaleString('en-US')} = ${fmt(m)} m ÷ ${n.toLocaleString('en-US')} = ${fmt(mm)} mm. A 1.7 m person at 1:${n.toLocaleString('en-US')} is ${fmt(toModelMm(PERSON_HEIGHT, n))} mm tall; a 0.1 m partition wall is ${fmt(toModelMm(0.1, n))} mm thick (${wallVerdict(toModelMm(0.1, n)).tag.toLowerCase()}).` }),
    );
    drawBar(bar, n, m);
    const model = Number(modelIn.value) || 0;
    realOut.textContent = `${fmt(model)} mm on a 1:${n.toLocaleString('en-US')} model is ${fmt(toRealM(model, n))} m in real life.`;
    const r = scaleThatFits(Number(fitL.value) || 0, Number(fitW.value) || 0, Number(fitH.value) || 0);
    fitOut.textContent = r.best
      ? `The largest standard scale that fits the ${DEFAULT_PRINTER.name} (${DEFAULT_PRINTER.build.x} × ${DEFAULT_PRINTER.build.y} × ${DEFAULT_PRINTER.build.z} mm, with 5 mm to spare on each side) is 1:${r.best.scale}: ${r.best.size.map((v) => fmt(v, 0)).join(' × ')} mm.`
      : 'Even at 1:2500 this doesn’t fit. Split it into parts, or use a site-plan scale.';
    fitTable.innerHTML = '';
    for (const row of r.rows.filter((x) => x.scale >= 20)) {
      fitTable.append(el('tr', { class: row === r.best ? 'sm-best' : '' },
        el('td', { text: `1:${row.scale}` }),
        el('td', { text: row.size.map((v) => fmt(v, v < 10 ? 1 : 0)).join(' × ') }),
        el('td', { text: row.fits ? (row.turned ? 'fits (turned 90°)' : 'fits') : 'too big' })));
    }
  }
  root.addEventListener('input', update);
  root.addEventListener('change', update);
  root.querySelectorAll('[data-sm-example]').forEach((b) => b.addEventListener('click', () => {
    const [v, u, s] = b.dataset.smExample.split('|');
    len.value = v; unit.value = u; scaleSel.value = s; update();
  }));
  update();
}

/* An SVG scale bar for the chosen scale, plus the measured length, drawn at 2 px per model mm. */
function drawBar(svg, n, metres) {
  const PX = 2.2, W = 640;
  const mm = toModelMm(metres, n);
  // choose a bar step: a round number of metres that is 15–60 px long
  const steps = [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  const step = steps.find((st) => toModelMm(st, n) * PX >= 18) || 1000;
  const segPx = toModelMm(step, n) * PX;
  const count = Math.max(1, Math.min(5, Math.floor((W - 60) / segPx)));
  const ns = 'http://www.w3.org/2000/svg';
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${W} 120`);
  const add = (tag, a, text) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); if (text != null) e.textContent = text; svg.append(e); return e; };
  const x0 = 20;
  for (let i = 0; i < count; i++) add('rect', { x: x0 + i * segPx, y: 18, width: segPx, height: 8, class: i % 2 ? 'sm-bar-light' : 'sm-bar-dark' });
  for (let i = 0; i <= count; i++) add('text', { x: x0 + i * segPx, y: 14, 'text-anchor': 'middle', class: 'sm-bar-label' }, `${fmt(step * i)}`);
  add('text', { x: x0 + count * segPx + 8, y: 26, class: 'sm-bar-label' }, `m  (scale 1:${n.toLocaleString('en-US')})`);
  // the measured length and a 1.7 m person, at the same magnification
  const lenPx = Math.min(mm * PX, W - 60);
  add('rect', { x: x0, y: 60, width: Math.max(1, lenPx), height: 10, class: 'sm-bar-len' });
  add('text', { x: x0, y: 54, class: 'sm-bar-label' }, `your length: ${fmt(mm)} mm${mm * PX > W - 60 ? ' (runs off the strip)' : ''}`);
  const ph = Math.max(1, toModelMm(PERSON_HEIGHT, n) * PX);
  const px = W - 40;
  add('rect', { x: px - Math.max(1, ph * 0.15), y: 110 - ph, width: Math.max(2, ph * 0.3), height: ph, rx: 2, class: 'sm-bar-person' });
  add('text', { x: px - 6, y: 116 - Math.min(ph, 90) - 10, 'text-anchor': 'end', class: 'sm-bar-label' }, `1.7 m person: ${fmt(toModelMm(PERSON_HEIGHT, n))} mm`);
  add('line', { x1: x0, x2: W - 10, y1: 110, y2: 110, class: 'sm-bar-ground' });
}

/* ── plan → model maker ─────────────────────────────────────────────────── */

const SITE = { w: 32, h: 22 };   // grid cells (16 × 11 m site)
const KEY = 'classroomos:scale-models:maker:v1';
const COLORS = { 1: '#b9b4aa', 2: '#e9dcc0', 3: '#f4f1ea', 4: '#d9cfb8' };
const TONE = { ok: '#2f9e5a', warn: '#d98a0b', bad: '#d6403a' };

function mountMaker(root) {
  const $ = (s) => root.querySelector(s);
  const planCanvas = $('[data-sm-plan]'), view = $('[data-sm-view]');
  const saved = store.get(KEY);
  let plan = saved?.plan && Array.isArray(saved.plan.rooms) ? saved.plan : structuredClone(PRESETS.school.plan);
  let settings = { ...DEFAULT_SETTINGS, ...PRESETS.school.settings, ...(saved?.settings || {}) };
  let tool = 'room';
  let drag = null;
  let hover = null;
  const history = [];
  let model = null;

  // canvas2d sizes the canvas (and calls onResize) before it returns, so the
  // first draw waits until planKit exists
  let planKit = null;
  planKit = window.SimKit.canvas2d(planCanvas, { onResize: () => { if (planKit) drawPlan(); } });
  const cell = () => planKit.width / SITE.w;

  const controls = {
    scale: $('[data-sm-set="scale"]'), storeys: $('[data-sm-set="storeys"]'), height: $('[data-sm-set="height"]'),
    ext: $('[data-sm-set="ext"]'), int: $('[data-sm-set="int"]'), mode: root.querySelectorAll('[data-sm-set="mode"]'),
    thicken: $('[data-sm-set="thicken"]'), split: $('[data-sm-set="split"]'), person: $('[data-sm-set="person"]'),
  };
  function syncControls() {
    controls.scale.value = String(settings.scale);
    controls.storeys.value = String(settings.storeys);
    controls.height.value = String(settings.height);
    controls.ext.value = String(settings.ext);
    controls.int.value = String(settings.int);
    controls.mode.forEach((r) => { r.checked = r.value === settings.mode; });
    controls.thicken.checked = settings.thicken; controls.split.checked = settings.split; controls.person.checked = settings.person;
    root.querySelectorAll('[data-sm-out]').forEach((o) => {
      const k = o.dataset.smOut;
      o.textContent = k === 'height' ? `${fmt(settings.height)} m` : k === 'storeys' ? String(settings.storeys) : `${fmt(settings[k])} m`;
    });
  }
  function readControls() {
    settings.scale = Number(controls.scale.value);
    settings.storeys = Number(controls.storeys.value);
    settings.height = Number(controls.height.value);
    settings.ext = Number(controls.ext.value);
    settings.int = Number(controls.int.value);
    settings.mode = [...controls.mode].find((r) => r.checked)?.value || 'walls';
    settings.thicken = controls.thicken.checked; settings.split = controls.split.checked; settings.person = controls.person.checked;
  }
  root.querySelector('[data-sm-settings]').addEventListener('input', () => { readControls(); syncControls(); rebuild(); });
  root.querySelector('[data-sm-settings]').addEventListener('change', () => { readControls(); syncControls(); rebuild(); });

  root.querySelectorAll('[data-sm-tool]').forEach((b) => b.addEventListener('click', () => {
    tool = b.dataset.smTool;
    root.querySelectorAll('[data-sm-tool]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    drawPlan();
  }));
  root.querySelectorAll('[data-sm-preset]').forEach((b) => b.addEventListener('click', () => {
    const p = PRESETS[b.dataset.smPreset];
    remember();
    plan = structuredClone(p.plan);
    settings = { ...settings, ...p.settings };
    syncControls(); rebuild();
  }));
  $('[data-sm-undo]').addEventListener('click', () => { if (history.length) { plan = history.pop(); rebuild(); } });
  $('[data-sm-stl]').addEventListener('click', download);
  $('[data-sm-add]').addEventListener('submit', (e) => {
    e.preventDefault();
    const w = Math.round(Number($('[data-sm-add-w]').value) / GRID), d = Math.round(Number($('[data-sm-add-d]').value) / GRID);
    if (!(w >= 2 && d >= 2)) return;
    // place it to the right of the existing rooms, sharing their wall, top-aligned
    const right = plan.rooms.reduce((a, r) => Math.max(a, r.x1), 2);
    const top = plan.rooms.length ? Math.min(...plan.rooms.map((r) => r.y0)) : 2;
    const x0 = Math.min(right, SITE.w - w), y0 = Math.min(top, SITE.h - d);
    if (x0 < 0 || y0 < 0) return;
    remember();
    plan.rooms.push({ x0, y0, x1: x0 + w, y1: y0 + d });
    rebuild();
  });

  function remember() { history.push(structuredClone(plan)); if (history.length > 40) history.shift(); }

  /* pointer → grid */
  const toGrid = (e) => {
    const r = planCanvas.getBoundingClientRect();
    return { gx: ((e.clientX - r.left) / r.width) * SITE.w, gy: ((e.clientY - r.top) / r.height) * SITE.h };
  };
  const nearestEdge = ({ gx, gy }) => {
    const fx = gx - Math.floor(gx), fy = gy - Math.floor(gy);
    const dh = Math.min(fy, 1 - fy), dv = Math.min(fx, 1 - fx);
    if (Math.min(dh, dv) > 0.35) return null;
    if (dh < dv) return { dir: 'h', i: Math.floor(gx), j: Math.round(gy) };
    return { dir: 'v', i: Math.round(gx), j: Math.floor(gy) };
  };
  planCanvas.addEventListener('pointerdown', (e) => {
    const p = toGrid(e);
    if (tool === 'room') {
      const c = { x: Math.max(0, Math.min(SITE.w, Math.round(p.gx))), y: Math.max(0, Math.min(SITE.h, Math.round(p.gy))) };
      drag = { a: c, b: c };
      planCanvas.setPointerCapture(e.pointerId);
    } else if (tool === 'door') {
      const ed = nearestEdge(p);
      if (!ed) return;
      const wallKeys = new Set(wallSegments({ ...plan, doors: [] }).flatMap((sg) => {
        const out = []; for (let a = sg.from; a < sg.to; a++) out.push(sg.dir === 'h' ? `h:${a}:${sg.line}` : `v:${sg.line}:${a}`); return out;
      }));
      const k1 = ed.dir === 'h' ? `h:${ed.i}:${ed.j}` : `v:${ed.i}:${ed.j}`;
      const k2 = ed.dir === 'h' ? `h:${ed.i + 1}:${ed.j}` : `v:${ed.i}:${ed.j + 1}`;
      const doors = new Set(plan.doors);
      if (!wallKeys.has(k1) && !doors.has(k1)) return;
      remember();
      if (doors.has(k1)) { doors.delete(k1); const k0 = ed.dir === 'h' ? `h:${ed.i - 1}:${ed.j}` : `v:${ed.i}:${ed.j - 1}`; if (doors.has(k2)) doors.delete(k2); else doors.delete(k0); }
      else { doors.add(k1); if (wallKeys.has(k2)) doors.add(k2); }
      plan.doors = [...doors];
      rebuild();
    } else if (tool === 'erase') {
      const n = plan.rooms.map((r, i) => [r, i]).reverse().find(([r]) => p.gx >= r.x0 && p.gx <= r.x1 && p.gy >= r.y0 && p.gy <= r.y1);
      if (!n) return;
      remember();
      plan.rooms.splice(n[1], 1);
      rebuild();
    }
  });
  planCanvas.addEventListener('pointermove', (e) => {
    const p = toGrid(e);
    hover = p;
    if (drag) drag.b = { x: Math.max(0, Math.min(SITE.w, Math.round(p.gx))), y: Math.max(0, Math.min(SITE.h, Math.round(p.gy))) };
    drawPlan();
  });
  planCanvas.addEventListener('pointerleave', () => { hover = null; drawPlan(); });
  planCanvas.addEventListener('pointerup', () => {
    if (!drag) return;
    const r = { x0: Math.min(drag.a.x, drag.b.x), y0: Math.min(drag.a.y, drag.b.y), x1: Math.max(drag.a.x, drag.b.x), y1: Math.max(drag.a.y, drag.b.y) };
    drag = null;
    if (r.x1 - r.x0 >= 2 && r.y1 - r.y0 >= 2) { remember(); plan.rooms.push(r); rebuild(); } else drawPlan();
  });

  /* plan drawing */
  let colors = window.SimKit.theme.colors();
  window.SimKit.theme.onChange((c) => { colors = c; drawPlan(); });
  function drawPlan() {
    const ctx = planKit.ctx, W = planKit.width, H = planKit.height, c = cell();
    if (!W || !H) return;
    const night = document.documentElement.dataset.lighting === 'night';
    const ink = night ? '#e8e6e1' : '#1f2933', faint = night ? 'rgba(255,255,255,0.08)' : 'rgba(31,41,51,0.08)', major = night ? 'rgba(255,255,255,0.2)' : 'rgba(31,41,51,0.2)';
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = night ? '#1c2127' : '#f7f4ec'; ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 1;
    for (let i = 0; i <= SITE.w; i++) { ctx.strokeStyle = i % 2 ? faint : major; ctx.beginPath(); ctx.moveTo(i * c + 0.5, 0); ctx.lineTo(i * c + 0.5, H); ctx.stroke(); }
    for (let j = 0; j <= SITE.h; j++) { ctx.strokeStyle = j % 2 ? faint : major; ctx.beginPath(); ctx.moveTo(0, j * c + 0.5); ctx.lineTo(W, j * c + 0.5); ctx.stroke(); }
    // rooms
    plan.rooms.forEach((r, n) => {
      ctx.fillStyle = night ? 'rgba(126,170,214,0.16)' : 'rgba(47,111,214,0.10)';
      ctx.fillRect(r.x0 * c, r.y0 * c, (r.x1 - r.x0) * c, (r.y1 - r.y0) * c);
      ctx.fillStyle = ink; ctx.font = `600 ${Math.max(10, c * 0.7)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${fmt((r.x1 - r.x0) * GRID)} × ${fmt((r.y1 - r.y0) * GRID)} m`, ((r.x0 + r.x1) / 2) * c, ((r.y0 + r.y1) / 2) * c);
      ctx.font = `${Math.max(9, c * 0.55)}px system-ui, sans-serif`;
      ctx.fillText(`Room ${n + 1}`, ((r.x0 + r.x1) / 2) * c, ((r.y0 + r.y1) / 2) * c + Math.max(12, c * 0.8));
    });
    // walls, drawn at their real thickness, coloured by how they print
    const m = model;
    if (m) {
      const tone = { ext: settings.mode === 'massing' ? 'ok' : wallVerdict(m.printed.ext).tone, int: settings.mode === 'massing' ? 'ok' : wallVerdict(m.printed.int).tone };
      for (const sg of m.segs) {
        const th = Math.max(2, (sg.kind === 'ext' ? m.thick.ext : m.thick.int) / GRID * c);
        ctx.fillStyle = tone[sg.kind] === 'ok' ? ink : TONE[tone[sg.kind]];
        if (sg.dir === 'h') ctx.fillRect(sg.from * c - th / 2, sg.line * c - th / 2, (sg.to - sg.from) * c + th, th);
        else ctx.fillRect(sg.line * c - th / 2, sg.from * c - th / 2, th, (sg.to - sg.from) * c + th);
      }
      // door swings
      ctx.strokeStyle = ink; ctx.lineWidth = 1;
      const doorKeys = new Set(plan.doors);
      for (const d of plan.doors) {
        const [dir, a, b] = d.split(':'); const i = Number(a), j = Number(b);
        const next = dir === 'h' ? `h:${i + 1}:${j}` : `v:${i}:${j + 1}`;
        const prev = dir === 'h' ? `h:${i - 1}:${j}` : `v:${i}:${j - 1}`;
        if (doorKeys.has(prev)) continue;           // draw each door once, from its first edge
        const span = doorKeys.has(next) ? 2 : 1;
        ctx.beginPath();
        if (dir === 'h') { ctx.moveTo(i * c, j * c); ctx.arc(i * c, j * c, span * c, 0, Math.PI / 2); }
        else { ctx.moveTo(i * c, j * c); ctx.arc(i * c, j * c, span * c, 0, Math.PI / 2); }
        ctx.closePath(); ctx.stroke();
      }
    }
    // drag preview
    if (drag) {
      const r = { x0: Math.min(drag.a.x, drag.b.x), y0: Math.min(drag.a.y, drag.b.y), x1: Math.max(drag.a.x, drag.b.x), y1: Math.max(drag.a.y, drag.b.y) };
      ctx.setLineDash([6, 4]); ctx.strokeStyle = '#2f6fd6'; ctx.lineWidth = 2;
      ctx.strokeRect(r.x0 * c, r.y0 * c, (r.x1 - r.x0) * c, (r.y1 - r.y0) * c); ctx.setLineDash([]);
      ctx.fillStyle = ink; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.font = `600 ${Math.max(11, c * 0.7)}px system-ui, sans-serif`;
      ctx.fillText(`${fmt((r.x1 - r.x0) * GRID)} × ${fmt((r.y1 - r.y0) * GRID)} m`, r.x0 * c + 4, r.y0 * c - 3);
    } else if (hover && tool === 'door') {
      const ed = nearestEdge(hover);
      if (ed) {
        ctx.strokeStyle = '#2f6fd6'; ctx.lineWidth = 4; ctx.beginPath();
        if (ed.dir === 'h') { ctx.moveTo(ed.i * c, ed.j * c); ctx.lineTo((ed.i + 2) * c, ed.j * c); } else { ctx.moveTo(ed.i * c, ed.j * c); ctx.lineTo(ed.i * c, (ed.j + 2) * c); }
        ctx.stroke();
      }
    }
    // scale bar (real metres) and north arrow
    ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineWidth = 1;
    const by = H - c * 0.9, bx = c * 0.8;
    for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? (night ? '#1c2127' : '#f7f4ec') : ink; ctx.fillRect(bx + i * 2 * c, by, 2 * c, c * 0.3); }
    ctx.strokeRect(bx, by, 8 * c, c * 0.3);
    ctx.fillStyle = ink; ctx.font = `${Math.max(9, c * 0.55)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    for (let i = 0; i <= 4; i++) ctx.fillText(`${i}`, bx + i * 2 * c, by - 2);
    ctx.textAlign = 'left'; ctx.fillText('m · grid 0.5 m', bx + 8 * c + 6, by + c * 0.4);
    const nx = W - c * 1.2, ny = c * 1.6;
    ctx.beginPath(); ctx.moveTo(nx, ny - c); ctx.lineTo(nx + c * 0.4, ny); ctx.lineTo(nx, ny - c * 0.3); ctx.lineTo(nx - c * 0.4, ny); ctx.closePath(); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('N', nx, ny - c - 2);
  }

  /* 3D view (vendored Three.js), rendered on demand */
  let three = null;
  async function initThree() {
    const [{ THREE, OrbitControls }, { createScene }] = await Promise.all([
      import('../../vendor/three-bundle.min.js'), import('../sim-kit-three.mjs'),
    ]);
    const { renderer, scene, camera, syncSize } = createScene(view, { THREE, alpha: true, near: 1, far: 5000, fov: 35 });
    camera.up.set(0, 0, 1);
    camera.position.set(220, -300, 240);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(-200, -300, 500); scene.add(sun);
    const controls = new OrbitControls(camera, view);
    controls.enableDamping = false;
    const group = new THREE.Group(); scene.add(group);
    const bed = new THREE.Group(); scene.add(bed);
    const render = () => { syncSize(); renderer.render(scene, camera); };
    controls.addEventListener('change', render);
    new ResizeObserver(render).observe(view);
    three = { THREE, scene, camera, controls, group, bed, render };
    showModel(true);
  }

  function showModel(frame = false) {
    if (!three || !model) return;
    const { THREE, group, bed, camera, controls, render } = three;
    group.clear(); bed.clear();
    const hex = (h) => new THREE.Color(h);
    const thinTone = { 2: wallVerdict(model.printed.ext).tone, 3: wallVerdict(model.printed.int).tone, 1: slabVerdict(model.printed.slab).tone };
    const colorFor = (label) => {
      if (settings.mode !== 'massing' && thinTone[label] && thinTone[label] !== 'ok') return hex(TONE[thinTone[label]]);
      return hex(COLORS[label] || '#cccccc');
    };
    const cx = (model.min[0] + model.max[0]) / 2, cy = (model.min[1] + model.max[1]) / 2;
    for (const m of model.meshes) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
      const col = new Float32Array(m.positions.length);
      for (let t = 0; t < m.labels.length; t++) { const c = colorFor(m.labels[t]); for (let v = 0; v < 3; v++) col.set([c.r, c.g, c.b], t * 9 + v * 3); }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }));
      mesh.position.set(-cx, -cy, 0);
      group.add(mesh);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(g, 30), new THREE.LineBasicMaterial({ color: 0x3a3a3a, transparent: true, opacity: 0.35 }));
      edges.position.copy(mesh.position);
      group.add(edges);
    }
    if (settings.person && model.meshes.length) {
      const k = model.k;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * k, 0.2 * k, PERSON_HEIGHT * k, 12), new THREE.MeshStandardMaterial({ color: 0x2b2b2e }));
      p.rotation.x = Math.PI / 2;
      p.position.set(model.min[0] - cx - 1.2 * k, model.min[1] - cy - 1.2 * k, (PERSON_HEIGHT * k) / 2);
      group.add(p);
    }
    // the print bed, to scale
    const { x, y } = DEFAULT_PRINTER.build;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(x, y), new THREE.MeshBasicMaterial({ color: 0x9aa3ad, transparent: true, opacity: 0.18, side: THREE.DoubleSide }));
    plate.position.z = -0.05; bed.add(plate);
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(x, y)), new THREE.LineBasicMaterial({ color: model.fit.fits ? 0x2f9e5a : 0xd6403a }));
    bed.add(outline);
    const grid = new THREE.GridHelper(Math.max(x, y), Math.max(x, y) / 10, 0x8b95a1, 0xc7ccd1);
    grid.rotation.x = Math.PI / 2; grid.material.transparent = true; grid.material.opacity = 0.25; bed.add(grid);
    if (frame) {
      const r = Math.max(120, Math.hypot(...model.size) * 0.9, 160);
      camera.position.set(r * 0.75, -r * 1.05, r * 0.85);
      controls.target.set(0, 0, model.size[2] / 3);
      controls.update();
    }
    render();
  }

  /* readouts */
  function report() {
    const m = model;
    const box = $('[data-sm-report]');
    box.innerHTML = '';
    if (!m.meshes.length) { box.append(el('p', { text: 'Draw a room: drag a rectangle on the plan, or type a size below it.' })); return; }
    const sz = m.size.map((v) => fmt(v, v < 10 ? 1 : 0)).join(' × ');
    box.append(el('p', {}, el('strong', { text: `1:${settings.scale}` }), ` · ${settings.mode === 'massing' ? 'massing model' : 'walls and floors'} · ${settings.split && settings.mode !== 'massing' ? `${m.meshes.length} parts laid out on the bed` : 'one piece'} · ${sz} mm`));
    const ul = el('ul', { class: 'sm-verdicts' });
    for (const v of m.verdicts) ul.append(el('li', { 'data-tone': v.tone }, el('b', { text: `${v.tag} · ${v.part}: ` }), v.text));
    if (settings.thicken && settings.mode !== 'massing') {
      const notes = [];
      if (m.thick.ext > settings.ext + 1e-9) notes.push(`outside walls ${fmt(settings.ext)} → ${fmt(m.thick.ext)} m`);
      if (m.thick.int > settings.int + 1e-9) notes.push(`inside walls ${fmt(settings.int)} → ${fmt(m.thick.int)} m`);
      if (m.thick.slab > settings.slab + 1e-9) notes.push(`floors ${fmt(settings.slab)} → ${fmt(m.thick.slab)} m`);
      if (notes.length) ul.append(el('li', { 'data-tone': 'warn' }, el('b', { text: 'THICKENED · ' }), `To print, the model exaggerates: ${notes.join('; ')} (real sizes).`));
    }
    const fitText = m.fit.fits ? `Fits the ${DEFAULT_PRINTER.name} bed (${DEFAULT_PRINTER.build.x} × ${DEFAULT_PRINTER.build.y} mm)${m.fit.turned ? ', turned 90°' : ''}.`
      : (m.partFits.every(Boolean) ? 'The parts are too wide to print together; print them one or two at a time.' : `Too big for the ${DEFAULT_PRINTER.name} (${DEFAULT_PRINTER.build.x} × ${DEFAULT_PRINTER.build.y} × ${DEFAULT_PRINTER.build.z} mm). Try a smaller scale (a bigger number after the colon).`);
    ul.append(el('li', { 'data-tone': m.fit.fits ? 'ok' : (m.partFits.every(Boolean) ? 'warn' : 'bad') }, el('b', { text: m.fit.fits ? 'FITS · ' : 'TOO BIG · ' }), fitText));
    ul.append(el('li', { 'data-tone': 'ok' }, el('b', { text: 'SCALE FIGURE · ' }), `A 1.7 m person is ${fmt(toModelMm(PERSON_HEIGHT, settings.scale))} mm tall on this model; one storey is ${fmt(toModelMm(settings.height, settings.scale))} mm.`));
    box.append(ul);
  }

  function rebuild() {
    model = buildModel(plan, settings);
    store.set(KEY, { plan, settings });
    root.dataset.smState = JSON.stringify({ rooms: plan.rooms.length, doors: plan.doors.length, parts: model.meshes.length, size: model.size.map((v) => +v.toFixed(2)), verdicts: model.verdicts.map((v) => `${v.part}:${v.tag}`), fits: model.fit.fits });
    drawPlan(); report(); showModel(false);
  }

  function download() {
    if (!model?.meshes.length) return;
    const { buffer } = stlFor(model);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([buffer], { type: 'model/stl' }));
    a.download = `scale-model-1-${settings.scale}-${settings.mode}${settings.split ? '-split' : ''}.stl`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  syncControls();
  rebuild();
  // start the 3D view only when the maker comes near the screen
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); initThree().catch((err) => { view.replaceWith(el('p', { class: 'sm-error', text: `The 3D view could not start (${err.message}). The plan, checks and STL download still work.` })); }); }
  }, { rootMargin: '400px' });
  io.observe(view);
}

if (typeof document !== 'undefined') {
  const start = () => {
    document.querySelectorAll('[data-sm-calc]').forEach(mountCalculator);
    if (window.SimKit) document.querySelectorAll('[data-sm-maker]').forEach(mountMaker);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
}
