/* Cymatics lesson: the interactive Chladni plate.
   Physics lives in plate-physics.mjs (modes, drive, ring-up) and granular.mjs
   (sand / powder hopping). This file wires them to the page: controls, the
   top-down canvas, the response curve, the mode browser and the lazy 3D view. */

import { Engine, Bodies, Body, Composite } from '../../vendor/matter-bundle.min.js';
import { MATERIALS, buildPlate, modalForces, relaxAmplitude, steadyAmplitude, rmsDisplacement, G } from './plate-physics.mjs';
import { GrainBed, sampleField } from './granular.mjs';

const $ = id => document.getElementById(id);
const F_MIN = 20, F_MAX = 20000;
const STROBE_PERIOD = 1.6; // seconds per displayed vibration cycle (slow-motion strobe)

const S = {
  shape: 'square', material: 'steel', size: 0.24, thickness: 0.0008, Q: 500,
  drive: 'driver', driverG: 0.5, bowForce: 0.3, bow: { x: 1, y: 0.42 },
  f: 0, muted: false, sweeping: false, sweepDir: 1,
  medium: 'sand', air: true, speed: 1, view: '2d', overlay: false
};

let plate = null, amps = [], forces = null, forcesKey = '';
let field = null, mask = null, bed = null, slime = [];
let peakA = 0, peakGamma = 0, airborne = 0, phase = 0;
let frfDirty = true, solving = false;

/* ── Plate setup ──────────────────────────────────────────────── */

function rebuildPlate({ keepFrequency = true } = {}) {
  const solvingEl = $('cy-solving');
  solving = true; solvingEl.hidden = false;
  // let the "Solving…" note paint before the (up to ~1 s) first solve for a shape
  setTimeout(() => {
    plate = buildPlate({ shape: S.shape, material: S.material, size: S.size, thickness: S.thickness, boltDiameter: 0.012 });
    amps = plate.modes.map(() => [0, 0]);
    forcesKey = '';
    const N = plate.N;
    field = { N, re: new Float32Array(N * N), im: new Float32Array(N * N), s: plate.s };
    mask = new Uint8Array(N * N);
    for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) {
      const x = plate.coords[gx], y = plate.coords[gy];
      mask[gy * N + gx] = (S.shape === 'circle' ? x * x + y * y <= 1 : 1) ? 1 : 0;
    }
    snapBow();
    if (!keepFrequency || !S.f) {
      const target = 300;
      const pick = excitableModes().reduce((best, m) => Math.abs(m.f - target) < Math.abs(best.f - target) ? m : best, excitableModes()[0]);
      S.f = pick ? Math.round(pick.f * 10) / 10 : 440;
    }
    resetMedium();
    frfDirty = true;
    renderModeList();
    updatePlateNote();
    setFrequency(S.f);
    if (three) three.rebuild();
    solving = false; solvingEl.hidden = true;
  }, 30);
}

function snapBow() {
  let { x, y } = S.bow;
  if (S.shape === 'circle') { const r = Math.hypot(x, y) || 1; x /= r; y /= r; }
  else if (Math.abs(x) >= Math.abs(y)) { x = Math.sign(x || 1); y = Math.max(-1, Math.min(1, y)); }
  else { y = Math.sign(y || 1); x = Math.max(-1, Math.min(1, x)); }
  S.bow = { x: x * 0.985, y: y * 0.985 };
  forcesKey = '';
}

/* A moving-coil wave driver at a fixed volume runs above its own resonance, where
   it delivers roughly constant acceleration: its stroke shrinks as 1/f². So the
   control is the bolt's acceleration, and the stroke follows from it. */
const driverStroke = f => S.driverG * G / (2 * Math.PI * f) ** 2;

/* Unit-amplitude coupling of each mode to the current drive (cached). */
function coupling() {
  const key = S.drive + ':' + S.bow.x + ':' + S.bow.y;
  if (key !== forcesKey) {
    forcesKey = key;
    forces = S.drive === 'bow'
      ? modalForces(plate, 1, { type: 'bow', amplitude: 1, x: S.bow.x, y: S.bow.y })
      : plate.modes.map(m => m.participation);
    frfDirty = true;
  }
  return forces;
}

function modalForce(i, omega) {
  const c = coupling()[i];
  return S.drive === 'bow' ? c * S.bowForce : c * omega * omega * driverStroke(omega / (2 * Math.PI));
}

function excitableModes() {
  const c = coupling();
  const max = Math.max(...c.map(Math.abs));
  const seen = new Set();
  return plate.modes.filter((m, i) => {
    if (Math.abs(c[i]) < 1e-6 * max || m.f > plate.trustedF) return false;
    const k = m.f.toFixed(3);
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}

/* ── Medium on the plate ──────────────────────────────────────── */

const MATTER_RADIUS = { sand: 0.8, powder: 0.55 }; // mm: each dot stands for a pinch of grains
const COUNT = { sand: 1500, powder: 1500, slime: 480 };
const matterEngine = Engine.create({ gravity: { x: 0, y: 0 }, positionIterations: 4, velocityIterations: 2 });

function spawn(rng) {
  for (;;) {
    const x = rng() * 2 - 1, y = rng() * 2 - 1;
    if (plate.inside(x, y) && Math.hypot(x, y) > plate.bolt * 1.6) return [x * 0.985, y * 0.985];
  }
}

function resetMedium() {
  Composite.clear(matterEngine.world, false);
  bed = null; slime = [];
  if (S.medium === 'sand' || S.medium === 'powder') {
    bed = new GrainBed({ count: COUNT[S.medium], kind: S.medium, inside: (x, y) => plate.inside(x, y), spawn });
    const mm = plate.s * 1000;
    for (const g of bed.grains) {
      g.body = Bodies.circle(g.x * mm, g.y * mm, MATTER_RADIUS[S.medium], { frictionAir: 1, restitution: 0, friction: 0, slop: 0.02 });
      Composite.add(matterEngine.world, g.body);
    }
  } else if (S.medium === 'slime') {
    slime = Array.from({ length: COUNT.slime }, () => { const [x, y] = spawn(Math.random); return { x, y, spike: 0 }; });
  }
}

/* Resting grains can't overlap: a quick Matter.js pass pushes them apart, so a
   nodal line's width reflects how much sand is on it. Airborne grains skip it. */
function separateGrains() {
  const mm = plate.s * 1000;
  for (const g of bed.grains) {
    const p = bed.pose(g);
    g.body.collisionFilter.mask = g.airborne ? 0 : 0xFFFFFFFF;
    Body.setPosition(g.body, { x: p.x * mm, y: p.y * mm });
    Body.setVelocity(g.body, { x: 0, y: 0 });
  }
  Engine.update(matterEngine, 1000 / 60);
  for (const g of bed.grains) {
    if (g.airborne) continue;
    const nx = g.body.position.x / mm, ny = g.body.position.y / mm;
    if (plate.inside(nx, ny)) { g.x = nx; g.y = ny; }
  }
}

function stepSlime(dt) {
  const smp = {}, omega = 2 * Math.PI * S.f;
  for (const p of slime) {
    sampleField(field, p.x, p.y, smp);
    const gamma = omega * omega * smp.A / G;
    const target = gamma > 3 ? Math.min(1, (gamma - 3) / 40) : 0;
    p.spike += (target - p.spike) * (target > p.spike ? 0.35 : 0.08);
    if (p.spike < 0.05 && gamma > 1) {
      const gm = Math.hypot(smp.gx, smp.gy) || 1, mob = Math.min(1, gamma / 30) * dt;
      p.x += -smp.gx / gm * 0.05 * mob + (Math.random() * 2 - 1) * 0.04 * mob;
      p.y += -smp.gy / gm * 0.05 * mob + (Math.random() * 2 - 1) * 0.04 * mob;
    }
    if (!plate.inside(p.x, p.y)) { const [x, y] = spawn(Math.random); p.x = x; p.y = y; p.spike = 0; }
  }
}

/* ── Dynamics ─────────────────────────────────────────────────── */

function stepModes(dt) {
  const omega = 2 * Math.PI * S.f, zeta = 1 / (2 * S.Q);
  for (let i = 0; i < amps.length; i++) {
    const Fi = S.muted ? 0 : modalForce(i, omega);
    amps[i] = relaxAmplitude(amps[i], Fi, plate.modes[i].omega, omega, zeta, dt);
  }
}

/* Absolute displacement amplitude (complex) on the display grid. */
function computeField() {
  const { re, im, N } = field;
  re.fill(0); im.fill(0);
  let maxQ = 0;
  for (const a of amps) maxQ = Math.max(maxQ, Math.hypot(a[0], a[1]));
  for (let i = 0; i < amps.length; i++) {
    const a = amps[i];
    if (Math.hypot(a[0], a[1]) < 1e-4 * maxQ || maxQ === 0) continue;
    const m = plate.modes[i], g = m.grid, qr = a[0] * m.scale, qi = a[1] * m.scale;
    for (let k = 0; k < g.length; k++) { re[k] += qr * g[k]; im[k] += qi * g[k]; }
  }
  const Z = S.drive === 'driver' && !S.muted ? driverStroke(S.f) : 0;
  const omega = 2 * Math.PI * S.f;
  peakA = 0;
  for (let k = 0; k < N * N; k++) {
    re[k] += Z;
    if (!mask[k]) continue;
    const A = Math.hypot(re[k], im[k]);
    if (A > peakA) peakA = A;
  }
  peakGamma = omega * omega * peakA / G;
}

/* ── Frequency control ────────────────────────────────────────── */

const sliderToF = v => F_MIN * Math.pow(F_MAX / F_MIN, v / 3000);
const fToSlider = f => Math.round(3000 * Math.log(f / F_MIN) / Math.log(F_MAX / F_MIN));

function setFrequency(f, { fromSlider = false } = {}) {
  S.f = Math.max(F_MIN, Math.min(F_MAX, Math.round(f * 10) / 10));
  if (!fromSlider) $('cy-freq-slider').value = fToSlider(S.f);
  $('cy-freq-big').textContent = formatHz(S.f);
  updateStatus();
  updateDriveNote();
}

function formatHz(f) {
  return (f >= 1000 ? f.toLocaleString(undefined, { maximumFractionDigits: 1 }) : f.toFixed(1)) + ' Hz';
}

function nearestMode() {
  let best = null, d = Infinity;
  for (const m of plate.modes) { const dd = Math.abs(m.f - S.f); if (dd < d) { d = dd; best = m; } }
  return best;
}

function updateStatus() {
  if (!plate) return;
  const m = nearestMode(), el = $('cy-freq-status');
  const bw = m.f / S.Q, det = Math.abs(S.f - m.f) / bw;
  const reachable = Math.abs(coupling()[m.index]) > 1e-9 * Math.max(...coupling().map(Math.abs));
  if (S.f > plate.trustedF) { el.textContent = 'Beyond the model'; el.className = 'cy-freq-status unlocked'; return; }
  if (det < 0.5) { el.textContent = reachable ? '● On resonance' : '● Mode the drive can’t reach'; el.className = 'cy-freq-status ' + (reachable ? 'locked' : 'near'); }
  else if (det < 4) { el.textContent = '◐ Near a mode'; el.className = 'cy-freq-status near'; }
  else { el.textContent = '○ Between modes'; el.className = 'cy-freq-status unlocked'; }
}

function jumpMode(dir) {
  const list = excitableModes();
  const next = dir > 0 ? list.find(m => m.f > S.f + 0.05) : [...list].reverse().find(m => m.f < S.f - 0.05);
  if (next) { stopSweep(); setFrequency(next.f); }
}

function stopSweep() {
  S.sweeping = false;
  const b = $('cy-sweep-btn'); b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); b.textContent = '▶ Sweep';
}

/* ── Readouts and notes ───────────────────────────────────────── */

const fmtLen = m => m >= 1e-3 ? (m * 1000).toFixed(m >= 0.01 ? 1 : 2) + ' mm' : m >= 1e-6 ? (m * 1e6).toFixed(m >= 1e-5 ? 0 : 1) + ' µm' : (m * 1e9).toFixed(0) + ' nm';

function updateReadouts() {
  const m = nearestMode();
  $('cy-r-freq').textContent = S.muted ? 'stopped' : formatHz(S.f);
  $('cy-r-mode').textContent = '#' + (m.index + 1) + ' · ' + formatHz(m.f);
  $('cy-r-disp').textContent = fmtLen(peakA);
  $('cy-r-accel').textContent = (peakGamma >= 100 ? peakGamma.toFixed(0) : peakGamma.toFixed(peakGamma >= 10 ? 1 : 2)) + ' g';
  $('cy-r-lambda').textContent = fmtLen(plate.bendingWavelength(S.f));
  $('cy-r-air').textContent = bed ? Math.round(airborne * 100) + '%' : '—';
}

function updateDriveNote() {
  if (!plate) return;
  const note = $('cy-drive-note'), over = S.drive === 'driver' && S.driverG > 1;
  note.classList.toggle('cy-warn', over);
  note.textContent = S.drive === 'bow'
    ? 'A steady sine push at the bow point. Click near the plate’s edge to move the bow.'
    : 'At ' + formatHz(S.f) + ' the bolt moves ±' + fmtLen(driverStroke(S.f)) + ' (a real driver’s stroke shrinks as 1/f² at a fixed volume). '
      + (over ? 'Over 1 g, the whole plate throws sand, so no pattern can settle. Turn it down.' : 'Resonance multiplies the plate’s motion far beyond that.');
}

function updatePlateNote() {
  const mat = MATERIALS[S.material];
  $('cy-plate-note').textContent = mat.label + ': E = ' + (mat.E / 1e9).toFixed(mat.E < 1e10 ? 1 : 0) + ' GPa, ρ = ' + mat.rho.toLocaleString() + ' kg/m³, ν = ' + mat.nu
    + '. Plate mass ' + (plate.mass * 1000).toFixed(0) + ' g. Modes verified to 0.05% up to ' + formatHz(Math.min(plate.trustedF, F_MAX)) + '.';
}

/* ── Mode browser ─────────────────────────────────────────────── */

function renderModeList() {
  const list = $('cy-mode-list');
  list.textContent = '';
  const c = coupling(), maxC = Math.max(...c.map(Math.abs));
  const shown = plate.modes.filter(m => m.f <= Math.min(plate.trustedF, F_MAX));
  $('cy-modes-note').textContent = shown.length + ' modes below ' + formatHz(Math.min(plate.trustedF, F_MAX)) + ' for this plate. Click one to drive it. ✓ = the current excitation can ring it. Pairs with the same frequency are the same pattern turned 90°.';
  for (const m of shown.slice(0, 160)) {
    const row = document.createElement('button');
    row.type = 'button'; row.className = 'cy-mode-row';
    const thumb = document.createElement('canvas');
    thumb.width = thumb.height = 44;
    drawThumb(thumb, m);
    const reach = Math.abs(c[m.index]) > 1e-6 * maxC;
    const text = document.createElement('span');
    text.innerHTML = '<b>#' + (m.index + 1) + ' · ' + formatHz(m.f) + '</b><small>' + m.label + '</small>';
    const badge = document.createElement('span');
    badge.className = 'cy-mode-badge' + (reach ? ' on' : '');
    badge.textContent = reach ? '✓' : '—';
    badge.title = reach ? 'The current excitation can ring this mode' : 'The current excitation can’t ring this mode';
    row.append(thumb, text, badge);
    row.addEventListener('click', () => { stopSweep(); setFrequency(m.f); });
    list.appendChild(row);
  }
}

function drawThumb(canvas, m) {
  const ctx = canvas.getContext('2d'), W = canvas.width, N = plate.N;
  const img = ctx.createImageData(W, W);
  let max = 1e-12;
  for (let k = 0; k < m.grid.length; k++) if (mask[k]) max = Math.max(max, Math.abs(m.grid[k]));
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const k = Math.round(y / (W - 1) * (N - 1)) * N + Math.round(x / (W - 1) * (N - 1));
    const o = (y * W + x) * 4;
    if (!mask[k]) { img.data[o + 3] = 0; continue; }
    const v = m.grid[k] / max, a = Math.abs(v);
    const quiet = a < 0.08;
    img.data[o] = quiet ? 233 : v > 0 ? 40 + 50 * a : 30;
    img.data[o + 1] = quiet ? 217 : v > 0 ? 70 + 40 * a : 60 + 40 * a;
    img.data[o + 2] = quiet ? 168 : v > 0 ? 110 : 90 + 60 * a;
    img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

/* ── Response curve ───────────────────────────────────────────── */

let frfData = null;

/* RMS acceleration over the plate, in g: what decides whether sand moves. */
function computeFRF() {
  const n = 480, zeta = 1 / (2 * S.Q), c = coupling();
  const fs = new Float64Array(n), acc = new Float64Array(n);
  for (let j = 0; j < n; j++) {
    const f = F_MIN * Math.pow(F_MAX / F_MIN, j / (n - 1)), w = 2 * Math.PI * f;
    fs[j] = f;
    const q = plate.modes.map((m, i) => steadyAmplitude(S.drive === 'bow' ? c[i] * S.bowForce : c[i] * S.driverG * G, m.omega, w, zeta));
    acc[j] = w * w * rmsDisplacement(plate, q) / G;
  }
  frfData = { fs, acc };
  frfDirty = false;
}

function drawFRF() {
  const canvas = $('cy-frf'), dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = Math.max(200, canvas.clientWidth), H = canvas.clientHeight || 150;
  if (canvas.width !== Math.round(W * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const ink = getComputedStyle(canvas).color || '#334155';
  ctx.clearRect(0, 0, W, H);
  if (!frfData) return;
  const padL = 44, padR = 8, padT = 8, padB = 20, pw = W - padL - padR, ph = H - padT - padB;
  const xOf = f => padL + pw * Math.log(f / F_MIN) / Math.log(F_MAX / F_MIN);
  let top = 1;
  frfData.fs.forEach((f, j) => { if (f <= Math.min(plate.trustedF, F_MAX)) top = Math.max(top, frfData.acc[j]); });
  const decTop = Math.ceil(Math.log10(top)), decBot = Math.min(-2, decTop - 5);
  const yOf = v => padT + ph * (1 - (Math.log10(Math.max(v, 1e-30)) - decBot) / (decTop - decBot));
  ctx.font = '10px system-ui, sans-serif';
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.18; ctx.strokeStyle = ink;
  ctx.beginPath();
  for (let d = decBot; d <= decTop; d++) { const y = Math.round(yOf(10 ** d)) + 0.5; ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); }
  for (const f of [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]) { const x = Math.round(xOf(f)) + 0.5; ctx.moveTo(x, padT); ctx.lineTo(x, padT + ph); }
  ctx.stroke();
  ctx.globalAlpha = 0.75; ctx.fillStyle = ink;
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let d = decBot; d <= decTop; d++) if ((d - decTop) % 2 === 0 || d === 0) ctx.fillText((10 ** d).toLocaleString(undefined, { maximumSignificantDigits: 1 }) + ' g', padL - 4, yOf(10 ** d));
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (const [f, t] of [[20, '20'], [100, '100'], [1000, '1k'], [10000, '10k'], [20000, '20 kHz']]) ctx.fillText(t, Math.min(W - 18, xOf(f)), padT + ph + 4);
  ctx.globalAlpha = 1;
  if (plate.trustedF < F_MAX) {
    const x0 = xOf(plate.trustedF);
    ctx.fillStyle = 'rgba(148,163,184,0.22)'; ctx.fillRect(x0, padT, W - padR - x0, ph);
    ctx.fillStyle = ink; ctx.globalAlpha = 0.7; ctx.textAlign = 'left'; ctx.fillText('beyond the model', x0 + 4, padT + 2); ctx.globalAlpha = 1;
  }
  // 1 g: below this nothing on the plate can launch a grain
  const y1 = Math.round(yOf(1)) + 0.5;
  ctx.setLineDash([4, 3]); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(padL, y1); ctx.lineTo(W - padR, y1); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = '#0891b2'; ctx.lineWidth = 1.6;
  ctx.beginPath();
  frfData.fs.forEach((f, j) => { const x = xOf(f), y = Math.min(padT + ph, yOf(frfData.acc[j])); j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.stroke();
  const c = coupling(), maxC = Math.max(...c.map(Math.abs));
  for (const m of plate.modes) {
    if (m.f > F_MAX) continue;
    const on = Math.abs(c[m.index]) > 1e-6 * maxC;
    ctx.fillStyle = on ? '#0891b2' : 'rgba(148,163,184,0.7)';
    ctx.fillRect(Math.round(xOf(m.f)), padT + ph - (on ? 6 : 3), 1, on ? 6 : 3);
  }
  const xm = xOf(S.f);
  ctx.strokeStyle = '#ec4899'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(xm, padT); ctx.lineTo(xm, padT + ph); ctx.stroke();
  canvas._xToF = x => F_MIN * Math.pow(F_MAX / F_MIN, Math.max(0, Math.min(1, (x - padL) / pw)));
}

/* ── Top-down canvas ──────────────────────────────────────────── */

const canvas2d = $('cy-canvas2d'), ctx = canvas2d.getContext('2d');
const off = document.createElement('canvas'), offCtx = off.getContext('2d');
let offImg = null;
let layout = { cx: 0, cy: 0, half: 1 };

function plateFill(c, cx, cy, half) {
  const mat = MATERIALS[S.material];
  const grad = c.createRadialGradient(cx - half * 0.3, cy - half * 0.4, half * 0.1, cx, cy, half * 1.5);
  grad.addColorStop(0, shade(mat.color, 0.15));
  grad.addColorStop(1, shade(mat.color, -0.45));
  return grad;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16), ch = [n >> 16, (n >> 8) & 255, n & 255];
  return 'rgb(' + ch.map(v => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))).join(',') + ')';
}

function plateOutline(c, cx, cy, half) {
  c.beginPath();
  if (S.shape === 'circle') c.arc(cx, cy, half, 0, Math.PI * 2);
  else c.rect(cx - half, cy - half, half * 2, half * 2);
}

function drawField(kind) {
  const N = plate.N;
  if (!offImg || off.width !== N) { off.width = off.height = N; offImg = offCtx.createImageData(N, N); }
  const d = offImg.data, omega = 2 * Math.PI * S.f;
  const cp = Math.cos(phase), sp = Math.sin(phase);
  for (let k = 0; k < N * N; k++) {
    const o = k * 4;
    if (!mask[k]) { d[o + 3] = 0; continue; }
    if (kind === 'water') {
      const v = peakA > 0 ? (field.re[k] * cp - field.im[k] * sp) / peakA : 0;
      const t = (v + 1) / 2;
      d[o] = 10 + t * t * 210; d[o + 1] = 40 + t * 170; d[o + 2] = 95 + t * 140; d[o + 3] = 255;
    } else {
      const quiet = omega * omega * Math.hypot(field.re[k], field.im[k]) < G;
      d[o] = 34; d[o + 1] = 211; d[o + 2] = 238; d[o + 3] = quiet ? 95 : 0;
    }
  }
  offCtx.putImageData(offImg, 0, 0);
}

function draw2D() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = canvas2d.clientWidth || 600, H = canvas2d.clientHeight || 420;
  if (canvas2d.width !== Math.round(W * dpr) || canvas2d.height !== Math.round(H * dpr)) { canvas2d.width = Math.round(W * dpr); canvas2d.height = Math.round(H * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0b0e14'; ctx.fillRect(0, 0, W, H);
  const half = Math.min(W, H) / 2 - 22, cx = W / 2, cy = H / 2;
  layout = { cx, cy, half };
  const pxPerM = half / plate.s;

  ctx.save();
  plateOutline(ctx, cx, cy, half); ctx.clip();
  if (S.medium === 'water') {
    drawField('water');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, cx - half, cy - half, half * 2, half * 2);
  } else {
    ctx.fillStyle = plateFill(ctx, cx, cy, half); ctx.fillRect(cx - half, cy - half, half * 2, half * 2);
    if (S.overlay) { drawField('quiet'); ctx.imageSmoothingEnabled = true; ctx.drawImage(off, cx - half, cy - half, half * 2, half * 2); }
    if (bed) drawGrains(cx, cy, half, pxPerM);
    else drawSlime(cx, cy, half);
  }
  ctx.restore();

  plateOutline(ctx, cx, cy, half);
  ctx.strokeStyle = 'rgba(148,163,184,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
  // the bolt
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(3, plate.bolt * half), 0, Math.PI * 2);
  ctx.fillStyle = '#1e293b'; ctx.fill(); ctx.strokeStyle = 'rgba(226,232,240,0.75)'; ctx.lineWidth = 1; ctx.stroke();
  if (S.drive === 'bow') drawBow(cx, cy, half);
  drawScaleBar(W, H, pxPerM);
}

function drawGrains(cx, cy, half, pxPerM) {
  const r = Math.max(1, MATTER_RADIUS[S.medium] / 1000 * pxPerM);
  const color = S.medium === 'sand' ? '#eadbad' : '#fff4c2';
  ctx.fillStyle = color;
  ctx.beginPath();
  const flying = [];
  for (const g of bed.grains) {
    if (g.airborne) { flying.push(g); continue; }
    const x = cx + g.x * half, y = cy + g.y * half;
    ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fill();
  // airborne grains: shadow where they'll land under, grain lifted by its real height
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  const poses = flying.map(g => bed.pose(g));
  for (const p of poses) { const x = cx + p.x * half, y = cy + p.y * half; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); }
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const p of poses) { const x = cx + p.x * half, y = cy + p.y * half - p.z * pxPerM; ctx.moveTo(x + r * 1.1, y); ctx.arc(x, y, r * 1.1, 0, Math.PI * 2); }
  ctx.fill();
}

function drawSlime(cx, cy, half) {
  ctx.shadowColor = '#a3e635';
  for (const p of slime) {
    ctx.shadowBlur = 3 + p.spike * 10;
    ctx.fillStyle = 'rgba(163,230,53,' + (0.45 + p.spike * 0.5).toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(cx + p.x * half, cy + p.y * half, 2.2 + p.spike * 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function drawBow(cx, cy, half) {
  const x = cx + S.bow.x * half, y = cy + S.bow.y * half;
  const nx = S.shape === 'circle' ? S.bow.x : (Math.abs(S.bow.x) > Math.abs(S.bow.y) ? Math.sign(S.bow.x) : 0);
  const ny = S.shape === 'circle' ? S.bow.y : (Math.abs(S.bow.x) > Math.abs(S.bow.y) ? 0 : Math.sign(S.bow.y));
  const tx = -ny, ty = nx, L = 26;
  ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - tx * L + nx * 6, y - ty * L + ny * 6); ctx.lineTo(x + tx * L + nx * 6, y + ty * L + ny * 6); ctx.stroke();
  ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.lineCap = 'butt';
}

function drawScaleBar(W, H, pxPerM) {
  const len = S.size >= 0.3 ? 0.1 : 0.05, px = len * pxPerM;
  const x = 14, y = H - 14;
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + px, y); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.moveTo(x + px, y - 4); ctx.lineTo(x + px, y + 4); ctx.stroke();
  ctx.fillStyle = '#e2e8f0'; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  ctx.fillText(len * 100 + ' cm', x, y - 6);
  ctx.textAlign = 'right';
  ctx.fillText(MATERIALS[S.material].label + ' · ' + (S.thickness * 1000).toFixed(2) + ' mm · ' + (S.size * 100) + ' cm' + (S.air ? '' : ' · vacuum'), W - 12, y + 4);
}

/* ── 3D view (Three.js is loaded only when asked for) ─────────── */

let three = null;

async function init3D() {
  if (three) { three.resize(); return; }
  const canvas = $('cy-canvas3d');
  let mod;
  try { mod = await import('../../vendor/three-bundle.min.js'); } catch { $('cy-webgl-fallback').hidden = false; return; }
  const { THREE, OrbitControls } = mod;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); } catch { $('cy-webgl-fallback').hidden = false; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0e14);
  scene.fog = new THREE.FogExp2(0x0b0e14, 0.12);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 100);
  camera.position.set(1.9, 1.6, 1.9);
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(2, 3, 1.5); scene.add(sun);
  const rim = new THREE.DirectionalLight(0x88bbff, 0.35); rim.position.set(-2, 1.5, -1.5); scene.add(rim);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 1.1; controls.maxDistance = 5; controls.maxPolarAngle = Math.PI * 0.49;
  controls.autoRotate = true; controls.autoRotateSpeed = 0.5;
  renderer.domElement.addEventListener('pointerdown', () => { controls.autoRotate = false; });

  const R = 96;
  const geom = new THREE.BufferGeometry();
  const pos = new Float32Array((R + 1) * (R + 1) * 3);
  const idx = [];
  for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) { const a = j * (R + 1) + i, b = a + 1, c = a + R + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geom.setIndex(idx);
  const plateMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, metalness: 0.6, roughness: 0.35 });
  const waterMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, color: 0x2a7fa8, metalness: 0.1, roughness: 0.15 });
  const mesh = new THREE.Mesh(geom, plateMat);
  scene.add(mesh);
  const boltMesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.12, 24), new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 }));
  scene.add(boltMesh);
  const bowMesh = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0x4a2a00 }));
  scene.add(bowMesh);
  const ptsGeom = new THREE.BufferGeometry();
  ptsGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(2000 * 3), 3));
  const ptsMat = new THREE.PointsMaterial({ size: 0.016, color: 0xeadbad, sizeAttenuation: true });
  const points = new THREE.Points(ptsGeom, ptsMat);
  scene.add(points);
  const xz = new Float32Array((R + 1) * (R + 1) * 2);

  function rebuild() {
    for (let j = 0, k = 0; j <= R; j++) for (let i = 0; i <= R; i++, k++) {
      const u = i / R * 2 - 1, v = j / R * 2 - 1;
      // squircle → disk mapping keeps the circle's mesh evenly spaced
      const x = S.shape === 'circle' ? u * Math.sqrt(Math.max(0, 1 - v * v / 2)) : u;
      const y = S.shape === 'circle' ? v * Math.sqrt(Math.max(0, 1 - u * u / 2)) : v;
      xz[k * 2] = x; xz[k * 2 + 1] = y;
      pos[k * 3] = x; pos[k * 3 + 2] = y;
    }
    const mat = MATERIALS[S.material];
    plateMat.color.set(mat.color);
    const clear = S.material === 'glass' || S.material === 'acrylic';
    plateMat.transparent = clear; plateMat.opacity = clear ? 0.72 : 1;
    plateMat.metalness = clear ? 0.05 : 0.6; plateMat.roughness = clear ? 0.08 : 0.35;
    boltMesh.scale.set(plate.bolt, 1, plate.bolt);
    resize();
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function frame() {
    const ex = peakA > 0 ? 0.1 / peakA : 0; // world units per metre of displacement (half-size = 1 unit)
    const cp = Math.cos(phase), sp = Math.sin(phase), N = plate.N;
    const heightAt = (x, y) => {
      const fx = (x + 1) / 2 * (N - 1), fy = (y + 1) / 2 * (N - 1);
      const i0 = Math.max(0, Math.min(N - 2, Math.floor(fx))), j0 = Math.max(0, Math.min(N - 2, Math.floor(fy)));
      const tx = fx - i0, ty = fy - j0, k = j0 * N + i0;
      const v = q => field.re[q] * cp - field.im[q] * sp;
      return ((v(k) * (1 - tx) + v(k + 1) * tx) * (1 - ty) + (v(k + N) * (1 - tx) + v(k + N + 1) * tx) * ty) * ex;
    };
    for (let k = 0; k < xz.length / 2; k++) pos[k * 3 + 1] = heightAt(xz[k * 2], xz[k * 2 + 1]);
    geom.attributes.position.needsUpdate = true;
    geom.computeVertexNormals();
    mesh.material = S.medium === 'water' ? waterMat : plateMat;
    const Z = S.drive === 'driver' && !S.muted ? driverStroke(S.f) * cp * ex : 0;
    boltMesh.position.set(0, Z - 0.055, 0);
    bowMesh.visible = S.drive === 'bow';
    if (bowMesh.visible) bowMesh.position.set(S.bow.x, heightAt(S.bow.x * 0.98, S.bow.y * 0.98) + 0.03, S.bow.y);
    const p = ptsGeom.attributes.position.array;
    let n = 0;
    if (bed) {
      ptsMat.color.set(S.medium === 'sand' ? 0xeadbad : 0xfff4c2); ptsMat.size = 0.016;
      for (const g of bed.grains) {
        const q = bed.pose(g);
        p[n * 3] = q.x; p[n * 3 + 1] = heightAt(q.x, q.y) + 0.008 + q.z / plate.s; p[n * 3 + 2] = q.y; n++;
      }
    } else if (slime.length) {
      ptsMat.color.set(0xa3e635); ptsMat.size = 0.04;
      for (const q of slime) { p[n * 3] = q.x; p[n * 3 + 1] = heightAt(q.x, q.y) + 0.01 + q.spike * 0.25; p[n * 3 + 2] = q.y; n++; }
    }
    ptsGeom.setDrawRange(0, n);
    ptsGeom.attributes.position.needsUpdate = true;
    controls.update();
    renderer.render(scene, camera);
    const label = $('cy-3d-scale');
    label.hidden = false;
    label.textContent = peakA > 0 ? 'Heights ×' + Math.round(ex * plate.s).toLocaleString() + ' (real peak ' + fmtLen(peakA) + ') · slow-motion strobe' : 'Plate at rest';
  }

  three = { frame, resize, rebuild };
  rebuild();
  window.addEventListener('resize', resize);
}

/* ── Main loop ────────────────────────────────────────────────── */

function tick(realDt) {
  if (plate && !solving) {
    const dt = realDt * S.speed;
    if (S.sweeping) {
      let f = S.f * Math.pow(2, S.sweepDir * realDt / 6); // a sixth of an octave per second
      if (f >= F_MAX) { f = F_MAX; S.sweepDir = -1; }
      if (f <= F_MIN) { f = F_MIN; S.sweepDir = 1; }
      setFrequency(f);
    }
    stepModes(dt);
    computeField();
    if (bed) { airborne = bed.step(dt, { field, omega: 2 * Math.PI * S.f, air: S.air }); separateGrains(); }
    else if (slime.length) stepSlime(dt);
    phase = (phase + 2 * Math.PI * realDt / STROBE_PERIOD) % (2 * Math.PI);
    if (S.view === '2d') draw2D(); else if (three) three.frame();
    if (frfDirty) computeFRF();
    drawFRF();
    updateReadouts();
  }
}

/* ── Wiring ───────────────────────────────────────────────────── */

function pressGroup(ids, active) {
  for (const id of ids) { const b = $(id), on = id === active; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }
}

const ampToValue = {
  driver: v => 0.01 * Math.pow(500, v / 1000),     // 0.01 g … 5 g at the bolt
  bow: v => 0.01 * Math.pow(300, v / 1000)         // 0.01 N … 3 N
};
function syncAmpSlider() {
  const v = S.drive === 'bow'
    ? Math.round(1000 * Math.log(S.bowForce / 0.01) / Math.log(300))
    : Math.round(1000 * Math.log(S.driverG / 0.01) / Math.log(500));
  $('cy-amp-slider').value = v;
  $('cy-amp-label').textContent = S.drive === 'bow' ? 'Bow force' : 'Driver strength (bolt acceleration)';
  $('cy-amp-val').textContent = S.drive === 'bow' ? S.bowForce.toFixed(S.bowForce < 0.1 ? 3 : 2) + ' N' : S.driverG.toFixed(S.driverG < 0.1 ? 3 : 2) + ' g';
}

function wire() {
  const matSel = $('cy-material');
  for (const [key, m] of Object.entries(MATERIALS)) matSel.add(new Option(m.label, key, key === S.material, key === S.material));

  $('cy-freq-slider').addEventListener('input', e => { stopSweep(); setFrequency(sliderToF(+e.target.value), { fromSlider: true }); });
  $('cy-fine-row').addEventListener('click', e => { const b = e.target.closest('[data-df]'); if (b) { stopSweep(); setFrequency(S.f + parseFloat(b.dataset.df)); } });
  $('cy-prev-mode').addEventListener('click', () => jumpMode(-1));
  $('cy-next-mode').addEventListener('click', () => jumpMode(1));
  $('cy-sweep-btn').addEventListener('click', () => {
    if (S.sweeping) { stopSweep(); return; }
    S.sweeping = true; const b = $('cy-sweep-btn');
    b.classList.add('active'); b.setAttribute('aria-pressed', 'true'); b.textContent = '⏸ Pause';
  });
  $('cy-mute-btn').addEventListener('click', () => {
    S.muted = !S.muted; const b = $('cy-mute-btn');
    b.classList.toggle('active', S.muted); b.setAttribute('aria-pressed', S.muted ? 'true' : 'false');
    b.textContent = S.muted ? '▶ Start drive' : '⏹ Stop drive (watch it ring down)';
  });
  $('cy-pitch-row').addEventListener('click', e => { const c = e.target.closest('.cy-pitch-chip'); if (c) { stopSweep(); setFrequency(+c.dataset.freq); } });
  $('cy-tune-btn').addEventListener('click', () => {
    const m = nearestMode();
    const h = Math.max(0.0003, Math.min(0.004, S.thickness * S.f / m.f));
    S.thickness = h;
    $('cy-thick-slider').value = Math.round(h * 1e5);
    $('cy-thick-val').textContent = (h * 1000).toFixed(2) + ' mm';
    rebuildPlate();
  });

  const driveIds = ['cy-drive-driver', 'cy-drive-bow'];
  for (const [id, kind] of [['cy-drive-driver', 'driver'], ['cy-drive-bow', 'bow']]) {
    $(id).addEventListener('click', () => {
      S.drive = kind; pressGroup(driveIds, id); forcesKey = '';
      syncAmpSlider(); updateDriveNote(); renderModeList(); updateStatus();
    });
  }
  $('cy-amp-slider').addEventListener('input', e => {
    if (S.drive === 'bow') S.bowForce = ampToValue.bow(+e.target.value); else S.driverG = ampToValue.driver(+e.target.value);
    syncAmpSlider(); updateDriveNote(); frfDirty = true;
  });

  const shapeIds = ['cy-shape-square', 'cy-shape-circle'];
  for (const [id, shape] of [['cy-shape-square', 'square'], ['cy-shape-circle', 'circle']]) {
    $(id).addEventListener('click', () => { if (S.shape === shape) return; S.shape = shape; pressGroup(shapeIds, id); rebuildPlate({ keepFrequency: false }); });
  }
  matSel.addEventListener('change', () => { S.material = matSel.value; rebuildPlate(); });
  $('cy-size').addEventListener('change', e => { S.size = +e.target.value; rebuildPlate(); });
  $('cy-thick-slider').addEventListener('input', e => {
    S.thickness = +e.target.value / 1e5;
    $('cy-thick-val').textContent = (S.thickness * 1000).toFixed(2) + ' mm';
  });
  $('cy-thick-slider').addEventListener('change', () => rebuildPlate());
  $('cy-q-slider').addEventListener('input', e => {
    S.Q = Math.round(20 * Math.pow(100, +e.target.value / 1000));
    $('cy-q-val').textContent = S.Q; frfDirty = true; updateStatus();
  });

  const medIds = ['cy-mat-sand', 'cy-mat-powder', 'cy-mat-water', 'cy-mat-slime'];
  for (const id of medIds) $(id).addEventListener('click', () => { S.medium = id.slice(7); pressGroup(medIds, id); resetMedium(); });
  const airIds = ['cy-air-on', 'cy-air-off'];
  $('cy-air-on').addEventListener('click', () => { S.air = true; pressGroup(airIds, 'cy-air-on'); });
  $('cy-air-off').addEventListener('click', () => { S.air = false; pressGroup(airIds, 'cy-air-off'); });
  const speedIds = ['cy-speed-1', 'cy-speed-4'];
  $('cy-speed-1').addEventListener('click', () => { S.speed = 1; pressGroup(speedIds, 'cy-speed-1'); });
  $('cy-speed-4').addEventListener('click', () => { S.speed = 4; pressGroup(speedIds, 'cy-speed-4'); });
  $('cy-resprinkle-btn').addEventListener('click', resetMedium);
  $('cy-overlay').addEventListener('change', e => { S.overlay = e.target.checked; });

  $('cy-view-2d-btn').addEventListener('click', () => {
    S.view = '2d'; pressGroup(['cy-view-2d-btn', 'cy-view-3d-btn'], 'cy-view-2d-btn');
    canvas2d.hidden = false; $('cy-canvas3d').hidden = true; $('cy-3d-scale').hidden = true;
  });
  $('cy-view-3d-btn').addEventListener('click', () => {
    S.view = '3d'; pressGroup(['cy-view-2d-btn', 'cy-view-3d-btn'], 'cy-view-3d-btn');
    canvas2d.hidden = true; $('cy-canvas3d').hidden = false;
    init3D();
  });

  canvas2d.addEventListener('click', e => {
    if (S.drive !== 'bow') return;
    const r = canvas2d.getBoundingClientRect();
    S.bow = { x: (e.clientX - r.left - layout.cx) / layout.half, y: (e.clientY - r.top - layout.cy) / layout.half };
    snapBow(); renderModeList(); updateStatus();
  });
  $('cy-frf').addEventListener('click', e => {
    const c = $('cy-frf'), r = c.getBoundingClientRect();
    if (c._xToF) { stopSweep(); setFrequency(c._xToF(e.clientX - r.left)); }
  });
  document.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    const sim = document.querySelector('.cy-sim-card');
    if (!sim || sim.getBoundingClientRect().bottom < 0 || sim.getBoundingClientRect().top > innerHeight) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { stopSweep(); setFrequency(S.f + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 0.1 : 1)); e.preventDefault(); }
    else if (e.key === 'PageUp' || e.key === 'PageDown') { jumpMode(e.key === 'PageUp' ? 1 : -1); e.preventDefault(); }
  });
}

wire();
syncAmpSlider();
$('cy-q-slider').value = Math.round(1000 * Math.log(S.Q / 20) / Math.log(100));
$('cy-q-val').textContent = S.Q;
rebuildPlate({ keepFrequency: false });
SimKit.loop(tick, { el: SimKit.stage(canvas2d, $('cy-canvas3d')), maxDt: 0.05 });
