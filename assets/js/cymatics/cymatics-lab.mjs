/* Cymatics lesson: the interactive Chladni plate.
   Physics lives in plate-physics.mjs (modes, drive, ring-up, Faraday waves)
   and granular.mjs (sand / powder hopping, spatial-hash separation). This file
   wires them to the page: controls, the top-down canvas, the response curve,
   the mode browser and the lazy 3D view. */

import { MATERIALS, buildPlate, modalForces, relaxAmplitude, steadyAmplitude, rmsDisplacement, faradayWavenumber, G } from './plate-physics.mjs';
import { GrainBed, sampleField } from './granular.mjs';

const $ = id => document.getElementById(id);
const F_MIN = 20, F_MAX = 20000;
const STROBE_PERIOD = 1.6; // seconds per displayed vibration cycle (slow-motion strobe)

const S = {
  shape: 'square', material: 'steel', size: 0.24, thickness: 0.0008, Q: 500,
  drive: 'driver', driverG: 0.5, bowForce: 0.3, bow: { x: 1, y: 0.42 },
  f: 0, muted: false, sweeping: false, sweepDir: 1,
  medium: 'sand', air: true, speed: 1, view: '3d', overlay: false
};

let plate = null, amps = [], forces = null, forcesKey = '';
let field = null, mask = null, bed = null, slime = [];
let peakA = 0, peakGamma = 0, airborne = 0, phase = 0;
let frfDirty = true, solving = false;
let frozenEx = 0, drivenPeakRef = 0;
let lastFrfRenderKey = '';

/* ── Optional Web Audio tone + ring-down ──────────────────────── */
let toneCtx = null, toneOsc = null, toneFilter = null, toneGain = null, toneOn = false;

function ensureTone() {
  if (toneCtx) return toneCtx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  toneCtx = new AC();
  toneOsc = toneCtx.createOscillator();
  toneOsc.type = 'sine';
  toneOsc.frequency.value = S.f || 440;
  toneFilter = toneCtx.createBiquadFilter();
  toneFilter.type = 'lowpass';
  toneFilter.frequency.value = 3200;
  toneFilter.Q.value = 0.7;
  const limiter = toneCtx.createDynamicsCompressor();
  limiter.threshold.value = -4;
  limiter.ratio.value = 12;
  toneGain = toneCtx.createGain();
  toneGain.gain.value = 0;
  toneOsc.connect(toneFilter);
  toneFilter.connect(toneGain);
  toneGain.connect(limiter);
  limiter.connect(toneCtx.destination);
  toneOsc.start();
  return toneCtx;
}

function updateTone() {
  if (!toneCtx || !toneOsc || !toneGain) return;
  const now = toneCtx.currentTime;
  toneOsc.frequency.setTargetAtTime(Math.max(20, Math.min(18000, S.f)), now, 0.02);
  let targetGain = 0;
  if (toneOn && !document.hidden) {
    // Gentle high-frequency comfort roll-off above 2.5 kHz
    const comfort = S.f > 2500 ? Math.max(0.25, 2500 / S.f) : 1;
    const driveLevel = S.drive === 'bow' ? Math.min(1, S.bowForce / 1.5) : Math.min(1, Math.sqrt(S.driverG / 2));
    if (!S.muted) {
      targetGain = (0.045 + 0.085 * driveLevel) * comfort;
    } else if (drivenPeakRef > 0 && peakA > 0) {
      const ratio = Math.min(1, peakA / drivenPeakRef);
      targetGain = (0.045 + 0.085 * driveLevel) * comfort * ratio;
    }
  }
  toneGain.gain.setTargetAtTime(targetGain, now, 0.025);
}

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
    else if (S.view === '3d') init3D();
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
  const bowSlider = $('cy-bow-slider');
  if (bowSlider) {
    let deg = Math.round((Math.atan2(S.bow.y, S.bow.x) * 180 / Math.PI + 360) % 360);
    bowSlider.value = deg;
    const bowOut = $('cy-bow-val');
    if (bowOut) bowOut.textContent = deg + '°';
  }
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

const MATTER_RADIUS = { sand: 0.68, powder: 0.48 }; // mm: each dot stands for a pinch of grains
const COUNT = { sand: 3000, powder: 3000, slime: 560 };

function spawn(rng) {
  for (;;) {
    const x = rng() * 2 - 1, y = rng() * 2 - 1;
    if (plate.inside(x, y) && Math.hypot(x, y) > plate.bolt * 1.6) return [x * 0.985, y * 0.985];
  }
}

function resetMedium() {
  bed = null; slime = [];
  if (S.medium === 'sand' || S.medium === 'powder') {
    bed = new GrainBed({ count: COUNT[S.medium], kind: S.medium, inside: (x, y) => plate.inside(x, y), spawn });
  } else if (S.medium === 'slime') {
    slime = Array.from({ length: COUNT.slime }, () => {
      const [x, y] = spawn(Math.random);
      return { x, y, spike: 0, rad: 0.75 + 0.55 * Math.random(), ang: Math.random() * Math.PI * 2 };
    });
  }
}

/* Resting grains can't overlap: a fast spatial-hash pass pushes them apart
   preferentially along nodal contours, so nodal line width reflects grain count. */
function separateGrains() {
  const minDist = (2 * MATTER_RADIUS[S.medium] / 1000) / plate.s;
  bed.separate(minDist, field);
}

function stepSlime(dt) {
  const smp = {}, omega = 2 * Math.PI * S.f;
  for (const p of slime) {
    sampleField(field, p.x, p.y, smp);
    const gamma = omega * omega * smp.A / G;
    const target = gamma > 3 ? Math.min(1, (gamma - 3) / 36) : 0;
    p.spike += (target - p.spike) * (target > p.spike ? 0.35 : 0.08);
    if (p.spike < 0.06 && gamma > 0.6) {
      const gm = Math.hypot(smp.gx, smp.gy) || 1, mob = Math.min(1, gamma / 30) * dt;
      p.x += -smp.gx / gm * 0.045 * mob + (Math.random() * 2 - 1) * 0.03 * mob;
      p.y += -smp.gy / gm * 0.045 * mob + (Math.random() * 2 - 1) * 0.03 * mob;
    }
    if (!plate.inside(p.x, p.y) || Math.hypot(p.x, p.y) < plate.bolt * 1.35) {
      const [x, y] = spawn(Math.random);
      p.x = x; p.y = y; p.spike = 0;
    }
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
let offImg = null, sheenTmp = null;
const waterCanvas = document.createElement('canvas'), waterCtx = waterCanvas.getContext('2d');
const W_RES = 320;
let waterImg = null;
const waterMacro = new Float32Array(W_RES * W_RES);
const waterCap = new Float32Array(W_RES * W_RES);
const waterAmp = new Float32Array(W_RES * W_RES);
const PILE_N = 112;
const pileCanvas = document.createElement('canvas'), pileCtx = pileCanvas.getContext('2d');
pileCanvas.width = pileCanvas.height = PILE_N;
const pileImg = pileCtx.createImageData(PILE_N, PILE_N);
const pileBuf = new Float32Array(PILE_N * PILE_N), pileTmp = new Float32Array(PILE_N * PILE_N);
const plateCache = document.createElement('canvas'), plateCacheCtx = plateCache.getContext('2d');
let plateCacheKey = '';
let cachedFaradayF = -1, cachedFaradayK = 0;
let layout = { cx: 0, cy: 0, half: 1 };

function getFaradayK(omega) {
  if (S.f !== cachedFaradayF) {
    cachedFaradayF = S.f;
    cachedFaradayK = faradayWavenumber(omega, 0.0015);
  }
  return cachedFaradayK;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shade(hex, amt) {
  const ch = hexToRgb(hex);
  return 'rgb(' + ch.map(v => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))).join(',') + ')';
}

function plateOutline(c, cx, cy, half) {
  c.beginPath();
  if (S.shape === 'circle') c.arc(cx, cy, half, 0, Math.PI * 2);
  else c.rect(cx - half, cy - half, half * 2, half * 2);
}

function ensurePlateSurface(half, dpr) {
  const size = Math.max(64, Math.round(half * 2 * dpr));
  const key = S.shape + ':' + S.material + ':' + size;
  if (key === plateCacheKey) return;
  plateCacheKey = key;
  plateCache.width = plateCache.height = size;
  const c = plateCacheCtx, cx = size * 0.5, cy = size * 0.5, r = size * 0.5;
  const mat = MATERIALS[S.material];
  const clear = S.material === 'glass' || S.material === 'acrylic';

  c.save();
  plateOutline(c, cx, cy, r);
  c.clip();

  if (clear) {
    // Optical bench visible faintly behind translucent glass/acrylic
    c.fillStyle = '#111824';
    c.fillRect(0, 0, size, size);
    c.strokeStyle = 'rgba(148,163,184,0.08)';
    c.lineWidth = Math.max(1, size / 240);
    const step = size / 10;
    c.beginPath();
    for (let g = step; g < size; g += step) { c.moveTo(g, 0); c.lineTo(g, size); c.moveTo(0, g); c.lineTo(size, g); }
    c.stroke();

    const tint = S.material === 'glass' ? 'rgba(130, 196, 188, ' : 'rgba(205, 226, 244, ';
    const g = c.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.08, cx, cy, r * 1.45);
    g.addColorStop(0, tint + '0.32)');
    g.addColorStop(0.65, tint + '0.18)');
    g.addColorStop(1, tint + '0.34)');
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);

    // Subtle specular reflection sweep across glass/acrylic
    const spec = c.createLinearGradient(0, 0, size, size);
    spec.addColorStop(0, 'rgba(255,255,255,0.16)');
    spec.addColorStop(0.35, 'rgba(255,255,255,0.03)');
    spec.addColorStop(0.65, 'rgba(255,255,255,0)');
    spec.addColorStop(1, 'rgba(255,255,255,0.08)');
    c.fillStyle = spec;
    c.fillRect(0, 0, size, size);
  } else {
    const grad = c.createRadialGradient(cx - r * 0.32, cy - r * 0.38, r * 0.08, cx, cy, r * 1.5);
    grad.addColorStop(0, shade(mat.color, 0.24));
    grad.addColorStop(0.55, shade(mat.color, -0.06));
    grad.addColorStop(1, shade(mat.color, -0.42));
    c.fillStyle = grad;
    c.fillRect(0, 0, size, size);

    // Anisotropic brushed-metal specular band
    const sheen = c.createLinearGradient(0, size * 0.15, size, size * 0.85);
    sheen.addColorStop(0, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.42, 'rgba(255,255,255,0.09)');
    sheen.addColorStop(0.52, 'rgba(255,255,255,0.14)');
    sheen.addColorStop(0.65, 'rgba(255,255,255,0)');
    c.fillStyle = sheen;
    c.fillRect(0, 0, size, size);

    // Deterministic brushed metal micro-grain lines
    let seed = 1337;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const streaks = 260;
    c.lineWidth = Math.max(0.75, size / 420);
    for (let i = 0; i < streaks; i++) {
      const y = rnd() * size;
      const x0 = rnd() * size * 0.7;
      const len = size * (0.18 + 0.55 * rnd());
      c.strokeStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.032)' : 'rgba(0,0,0,0.036)';
      c.beginPath();
      c.moveTo(x0, y);
      c.lineTo(x0 + len, y + (rnd() - 0.5) * 1.5);
      c.stroke();
    }
  }

  // Chamfered rim highlight / bevel
  c.lineWidth = Math.max(2, size * 0.012);
  if (S.shape === 'circle') {
    const rim = c.createLinearGradient(0, 0, size, size);
    rim.addColorStop(0, clear ? 'rgba(210,245,240,0.5)' : 'rgba(255,255,255,0.34)');
    rim.addColorStop(0.5, 'rgba(255,255,255,0.08)');
    rim.addColorStop(1, 'rgba(0,0,0,0.45)');
    c.strokeStyle = rim;
    c.beginPath(); c.arc(cx, cy, r - c.lineWidth * 0.5, 0, Math.PI * 2); c.stroke();
  } else {
    c.strokeStyle = clear ? 'rgba(210,245,240,0.45)' : 'rgba(255,255,255,0.28)';
    c.beginPath(); c.moveTo(0, size); c.lineTo(0, 0); c.lineTo(size, 0); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,0.42)';
    c.beginPath(); c.moveTo(size, 0); c.lineTo(size, size); c.lineTo(0, size); c.stroke();
  }
  c.restore();
}

function drawSheenAndOverlay() {
  const N = plate.N;
  if (!offImg || off.width !== N) {
    off.width = off.height = N;
    offImg = offCtx.createImageData(N, N);
    sheenTmp = new Float32Array(N * N);
  }
  const d = offImg.data, omega = 2 * Math.PI * S.f;
  const cp = Math.cos(phase), sp = Math.sin(phase);
  const showSheen = peakA > 0 && peakGamma > 0.05;
  const sheenGain = showSheen ? Math.min(1, Math.sqrt(peakGamma / 4)) : 0;
  if (showSheen) {
    for (let k = 0; k < N * N; k++) sheenTmp[k] = (field.re[k] * cp - field.im[k] * sp) / peakA;
  }
  for (let gy = 0; gy < N; gy++) {
    const ym = gy > 0 ? gy - 1 : 0, yp = gy < N - 1 ? gy + 1 : N - 1;
    for (let gx = 0; gx < N; gx++) {
      const k = gy * N + gx, o = k * 4;
      if (!mask[k]) { d[o + 3] = 0; continue; }
      let r = 0, g = 0, b = 0, a = 0;
      if (showSheen) {
        const xm = gx > 0 ? gx - 1 : 0, xp = gx < N - 1 ? gx + 1 : N - 1;
        const sx = sheenTmp[gy * N + xp] - sheenTmp[gy * N + xm];
        const sy = sheenTmp[yp * N + gx] - sheenTmp[ym * N + gx];
        const s = (-0.6 * sx - 0.7 * sy) * 0.85 * sheenGain;
        if (s > 0.005) { r = 255; g = 255; b = 255; a = Math.min(38, s * 110); }
        else if (s < -0.005) { r = 0; g = 0; b = 0; a = Math.min(34, -s * 100); }
      }
      if (S.overlay && omega * omega * Math.hypot(field.re[k], field.im[k]) < G) {
        const oa = 95 / 255, ia = a / 255, outA = oa + ia * (1 - oa);
        r = (34 * oa + r * ia * (1 - oa)) / outA;
        g = (211 * oa + g * ia * (1 - oa)) / outA;
        b = (238 * oa + b * ia * (1 - oa)) / outA;
        a = outA * 255;
      }
      d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = a;
    }
  }
  offCtx.putImageData(offImg, 0, 0);
}

function drawWater() {
  if (!waterImg) {
    waterCanvas.width = waterCanvas.height = W_RES;
    waterImg = waterCtx.createImageData(W_RES, W_RES);
  }
  const N = plate.N, s = plate.s, omega = 2 * Math.PI * S.f;
  const cp = Math.cos(phase), sp = Math.sin(phase), cpHalf = Math.cos(phase * 0.5);
  const k = getFaradayK(omega);
  const pxPhys = (2 * s) / W_RES, kNyq = Math.PI / pxPhys;
  const visFactor = k <= 0.45 * kNyq ? 1 : Math.max(0, 1 - (k - 0.45 * kNyq) / (0.35 * kNyq));
  const threshold = 1.8 + 0.002 * S.f;
  const visGain = peakA > 0 ? Math.min(1, Math.max(peakGamma / 0.25, peakA / 5e-6)) : 0;
  const activeFaraday = !S.muted && visFactor > 0 && k > 0;
  // Rotate capillary axes 18 deg off grid axes to prevent raster Moiré while preserving lattice symmetry
  const c1 = 0.95106, s1 = 0.30902, dCos = 0.70711;
  const isCircle = S.shape === 'circle';
  const denom = Math.max(1.5, 0.35 * threshold + 0.07 * peakGamma);

  for (let gy = 0; gy < W_RES; gy++) {
    const y = -1 + 2 * gy / (W_RES - 1);
    const fy = (gy / (W_RES - 1)) * (N - 1);
    const j0 = Math.min(N - 2, Math.floor(fy)), ty = fy - j0;
    const ym = y * s;
    for (let gx = 0; gx < W_RES; gx++) {
      const idx = gy * W_RES + gx;
      const x = -1 + 2 * gx / (W_RES - 1);
      if (isCircle && x * x + y * y > 1) {
        waterMacro[idx] = 0; waterCap[idx] = 0; waterAmp[idx] = -1;
        continue;
      }
      const fx = (gx / (W_RES - 1)) * (N - 1);
      const i0 = Math.min(N - 2, Math.floor(fx)), tx = fx - i0;
      const k00 = j0 * N + i0;
      const re = (field.re[k00] * (1 - tx) + field.re[k00 + 1] * tx) * (1 - ty)
               + (field.re[k00 + N] * (1 - tx) + field.re[k00 + N + 1] * tx) * ty;
      const im = (field.im[k00] * (1 - tx) + field.im[k00 + 1] * tx) * (1 - ty)
               + (field.im[k00 + N] * (1 - tx) + field.im[k00 + N + 1] * tx) * ty;
      const amp = Math.hypot(re, im);
      const relAmp = peakA > 0 ? (amp / peakA) * visGain : 0;
      const wInst = re * cp - im * sp;
      const wNorm = peakA > 0 ? (wInst / peakA) * visGain : 0;
      waterMacro[idx] = wNorm;
      waterAmp[idx] = relAmp;

      let cH = 0;
      if (activeFaraday) {
        const gamma = omega * omega * amp / G;
        if (gamma > threshold) {
          const onset = Math.min(1, Math.sqrt((gamma - threshold) / denom));
          const rippleScale = Math.min(1, 1.55 / Math.max(0.35, k * pxPhys));
          const fAmp = 1.05 * visFactor * rippleScale * onset * (0.30 + 0.70 * relAmp);
          const xm = x * s, xr = xm * c1 - ym * s1, yr = xm * s1 + ym * c1;
          const d1 = (xr + yr) * dCos, d2 = (xr - yr) * dCos;
          const warp = wNorm * 0.45;
          let pat = 0.25 * (Math.cos(k * xr + warp) + Math.cos(k * yr + warp) + Math.cos(k * d1) + Math.cos(k * d2));
          if (isCircle) {
            pat = 0.60 * pat + 0.40 * Math.cos(k * Math.hypot(xm, ym) - warp * 0.8);
          }
          // Subharmonic f/2 oscillation + weak nonlinear Stokes rectification so steep crests stay faintly visible at zero-crossing
          cH = fAmp * (pat * cpHalf + 0.22 * (pat * pat - 0.32));
        }
      }
      waterCap[idx] = cH;
    }
  }

  // Normalize key & rim half-vectors for overhead studio ring/softbox lighting
  const h1Len = Math.hypot(-0.42, -0.52, 1.35), h1x = -0.42 / h1Len, h1y = -0.52 / h1Len, h1z = 1.35 / h1Len;
  const h2Len = Math.hypot(0.52, 0.44, 1.25), h2x = 0.52 / h2Len, h2y = 0.44 / h2Len, h2z = 1.25 / h2Len;
  const d = waterImg.data;

  for (let gy = 0; gy < W_RES; gy++) {
    for (let gx = 0; gx < W_RES; gx++) {
      const idx = gy * W_RES + gx, o = idx * 4;
      const env = waterAmp[idx];
      if (env < 0) { d[o + 3] = 0; continue; }

      // Neumann boundary stencil: fall back to center cell outside circular free edge
      const okL = gx > 0 && waterAmp[idx - 1] >= 0;
      const okR = gx < W_RES - 1 && waterAmp[idx + 1] >= 0;
      const okU = gy > 0 && waterAmp[idx - W_RES] >= 0;
      const okD = gy < W_RES - 1 && waterAmp[idx + W_RES] >= 0;
      const mC = waterMacro[idx], cC = waterCap[idx];
      const mL = okL ? waterMacro[idx - 1] : mC, mR = okR ? waterMacro[idx + 1] : mC;
      const mU = okU ? waterMacro[idx - W_RES] : mC, mD = okD ? waterMacro[idx + W_RES] : mC;
      const cL = okL ? waterCap[idx - 1] : cC, cR = okR ? waterCap[idx + 1] : cC;
      const cU = okU ? waterCap[idx - W_RES] : cC, cD = okD ? waterCap[idx + W_RES] : cC;

      const hxM = (mR - mL) * 0.5, hyM = (mD - mU) * 0.5;
      const lapM = mL + mR + mU + mD - 4 * mC;
      const hxC = (cR - cL) * 0.5, hyC = (cD - cU) * 0.5;
      const lapC = cL + cR + cU + cD - 4 * cC;
      const caustic = Math.max(0.62, Math.min(1.70, 1 - lapM * 48 - lapC * 0.44));

      const nx0 = -(hxM * 14 + hxC * 1.15), ny0 = -(hyM * 14 + hyC * 1.15), nz0 = 1;
      const nLen = Math.hypot(nx0, ny0, nz0);
      const nx = nx0 / nLen, ny = ny0 / nLen, nz = nz0 / nLen;
      const ndh1 = Math.max(0, nx * h1x + ny * h1y + nz * h1z);
      const broadSoftbox = Math.pow(ndh1, 8) * 68;
      const spec1 = Math.pow(ndh1, 42);
      const spec2 = Math.pow(Math.max(0, nx * h2x + ny * h2y + nz * h2z), 16);
      const fres = 0.04 + 0.36 * Math.pow(1 - Math.max(0, nz), 2.4);
      // Steep ripple walls deflect upward light away from the dark optical bench
      const slopeShade = 0.68 + 0.32 * nz;

      const crestLift = (0.80 + 0.26 * mC + 0.16 * env) * slopeShade;
      const hi = spec1 * 215 + broadSoftbox + spec2 * 95 + fres * 82;
      d[o]     = Math.min(255, 14 * crestLift * caustic + hi);
      d[o + 1] = Math.min(255, (92 * crestLift + env * 18) * caustic + hi * 1.02);
      d[o + 2] = Math.min(255, (148 * crestLift + env * 28) * caustic + hi * 1.06);
      d[o + 3] = Math.min(255, 126 + 40 * Math.max(0, -mC) + env * 28 + (1 - nz) * 75 + hi * 0.65);
    }
  }
  waterCtx.putImageData(waterImg, 0, 0);
}

function drawQuietOverlay() {
  const N = plate.N;
  if (!offImg || off.width !== N) { off.width = off.height = N; offImg = offCtx.createImageData(N, N); }
  const d = offImg.data, omega = 2 * Math.PI * S.f;
  for (let k = 0; k < N * N; k++) {
    const o = k * 4;
    if (!mask[k]) { d[o + 3] = 0; continue; }
    const quiet = omega * omega * Math.hypot(field.re[k], field.im[k]) < G;
    d[o] = 34; d[o + 1] = 211; d[o + 2] = 238; d[o + 3] = quiet ? 95 : 0;
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

  // Optical-bench drop shadow under the suspended plate
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.68)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 9;
  plateOutline(ctx, cx, cy, half);
  ctx.fillStyle = '#0b0e14';
  ctx.fill();
  ctx.restore();

  ensurePlateSurface(half, dpr);

  ctx.save();
  plateOutline(ctx, cx, cy, half); ctx.clip();
  if (S.medium === 'water') {
    ctx.drawImage(plateCache, cx - half, cy - half, half * 2, half * 2);
    drawWater();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(waterCanvas, cx - half, cy - half, half * 2, half * 2);
    if (S.overlay) { drawQuietOverlay(); ctx.drawImage(off, cx - half, cy - half, half * 2, half * 2); }
  } else {
    ctx.drawImage(plateCache, cx - half, cy - half, half * 2, half * 2);
    if (S.overlay || (peakA > 0 && peakGamma > 0.05)) {
      drawSheenAndOverlay();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(off, cx - half, cy - half, half * 2, half * 2);
    }
    if (bed) drawGrains(cx, cy, half, pxPerM);
    else drawSlime(cx, cy, half);
  }
  ctx.restore();

  plateOutline(ctx, cx, cy, half);
  ctx.strokeStyle = 'rgba(148,163,184,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
  drawBolt(cx, cy, half);
  if (S.drive === 'bow') drawBow(cx, cy, half);
  drawScaleBar(W, H, pxPerM);
}

function drawBolt(cx, cy, half) {
  const br = Math.max(4, plate.bolt * half);
  // Machined washer with drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
  ctx.beginPath(); ctx.arc(cx, cy, br * 1.45, 0, Math.PI * 2);
  const wg = ctx.createRadialGradient(cx - br * 0.4, cy - br * 0.4, br * 0.2, cx, cy, br * 1.45);
  wg.addColorStop(0, '#cbd5e1'); wg.addColorStop(0.65, '#64748b'); wg.addColorStop(1, '#334155');
  ctx.fillStyle = wg; ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(226,232,240,0.45)'; ctx.lineWidth = 0.8; ctx.stroke();

  // Chamfered hex cap head
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3 + 0.26;
    const hx = cx + Math.cos(a) * br, hy = cy + Math.sin(a) * br;
    i ? ctx.lineTo(hx, hy) : ctx.moveTo(hx, hy);
  }
  ctx.closePath();
  const hg = ctx.createLinearGradient(cx - br, cy - br, cx + br, cy + br);
  hg.addColorStop(0, '#94a3b8'); hg.addColorStop(0.5, '#475569'); hg.addColorStop(1, '#1e293b');
  ctx.fillStyle = hg; ctx.fill();
  ctx.strokeStyle = 'rgba(241,245,249,0.55)'; ctx.lineWidth = 0.9; ctx.stroke();

  // Recessed hex socket
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3 + 0.26;
    const hx = cx + Math.cos(a) * br * 0.5, hy = cy + Math.sin(a) * br * 0.5;
    i ? ctx.lineTo(hx, hy) : ctx.moveTo(hx, hy);
  }
  ctx.closePath();
  ctx.fillStyle = '#0f172a'; ctx.fill();
}

function drawPileRelief(cx, cy, half) {
  pileBuf.fill(0);
  const pm = PILE_N - 1;
  for (const g of bed.grains) {
    if (g.airborne) continue;
    const fx = (g.x + 1) * 0.5 * pm, fy = (g.y + 1) * 0.5 * pm;
    const i0 = Math.max(0, Math.min(PILE_N - 2, Math.floor(fx))), j0 = Math.max(0, Math.min(PILE_N - 2, Math.floor(fy)));
    const tx = fx - i0, ty = fy - j0, idx = j0 * PILE_N + i0;
    pileBuf[idx] += (1 - tx) * (1 - ty);
    pileBuf[idx + 1] += tx * (1 - ty);
    pileBuf[idx + PILE_N] += (1 - tx) * ty;
    pileBuf[idx + PILE_N + 1] += tx * ty;
  }
  // Separable 3-tap blur for smooth sand ridges / velvety powder dunes
  for (let y = 0; y < PILE_N; y++) {
    const row = y * PILE_N;
    for (let x = 0; x < PILE_N; x++) {
      const xm = x > 0 ? x - 1 : 0, xp = x < pm ? x + 1 : pm;
      pileTmp[row + x] = 0.25 * pileBuf[row + xm] + 0.5 * pileBuf[row + x] + 0.25 * pileBuf[row + xp];
    }
  }
  for (let y = 0; y < PILE_N; y++) {
    const ym = (y > 0 ? y - 1 : 0) * PILE_N, yc = y * PILE_N, yp = (y < pm ? y + 1 : pm) * PILE_N;
    for (let x = 0; x < PILE_N; x++) {
      pileBuf[yc + x] = 0.25 * pileTmp[ym + x] + 0.5 * pileTmp[yc + x] + 0.25 * pileTmp[yp + x];
    }
  }
  const d = pileImg.data, isPowder = S.medium === 'powder';
  const br = isPowder ? 246 : 214, bg = isPowder ? 234 : 190, bb = isPowder ? 178 : 138;
  const thresh = isPowder ? 0.07 : 0.14;
  const alphaGain = isPowder ? 0.44 : 0.28, maxAlpha = isPowder ? 0.88 : 0.64;
  for (let y = 0; y < PILE_N; y++) {
    const ym = (y > 0 ? y - 1 : 0) * PILE_N, yc = y * PILE_N, yp = (y < pm ? y + 1 : pm) * PILE_N;
    for (let x = 0; x < PILE_N; x++) {
      const idx = yc + x, o = idx * 4, h = pileBuf[idx];
      if (h <= thresh) { d[o + 3] = 0; continue; }
      const xm = x > 0 ? x - 1 : 0, xp = x < pm ? x + 1 : pm;
      const slope = (pileBuf[yc + xm] - pileBuf[yc + xp]) + (pileBuf[ym + x] - pileBuf[yp + x]);
      const lit = 1 + Math.max(-0.35, Math.min(0.35, slope * 0.55));
      d[o] = Math.min(255, br * lit);
      d[o + 1] = Math.min(255, bg * lit);
      d[o + 2] = Math.min(255, bb * lit);
      d[o + 3] = Math.min(maxAlpha, (h - thresh) * alphaGain) * 255;
    }
  }
  pileCtx.putImageData(pileImg, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(pileCanvas, cx - half, cy - half, half * 2, half * 2);
}

const SAND_TONES = ['#cbb07a', '#dfc798', '#ede0be', '#faf0d6'];
const POWDER_TONES = ['#efe09c', '#fbf2c6'];

function drawGrains(cx, cy, half, pxPerM) {
  drawPileRelief(cx, cy, half);
  const isPowder = S.medium === 'powder';
  const baseR = Math.max(isPowder ? 0.7 : 0.9, MATTER_RADIUS[S.medium] / 1000 * pxPerM);
  const tones = isPowder ? POWDER_TONES : SAND_TONES;
  const flying = [];
  const buckets = tones.map(() => []);
  const glints = [];

  for (const g of bed.grains) {
    if (g.airborne) { flying.push(g); continue; }
    const bi = Math.min(tones.length - 1, Math.floor(g.tone * tones.length));
    buckets[bi].push(g);
    if (!isPowder && g.glint > 0.88) glints.push(g);
  }

  for (let b = 0; b < tones.length; b++) {
    ctx.fillStyle = tones[b];
    ctx.beginPath();
    for (const g of buckets[b]) {
      const r = baseR * (isPowder ? 0.85 : 1) * g.rScale;
      const x = cx + g.x * half, y = cy + g.y * half;
      ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  if (glints.length) {
    ctx.fillStyle = 'rgba(255, 253, 245, 0.85)';
    ctx.beginPath();
    for (const g of glints) {
      const r = baseR * 0.45 * g.rScale;
      const x = cx + g.x * half - r * 0.4, y = cy + g.y * half - r * 0.4;
      ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  if (flying.length) {
    const poses = flying.map(g => ({ p: bed.pose(g), r: baseR * g.rScale, tone: g.tone }));
    // Cast shadows on the plate directly under each hopping grain
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    for (const { p, r } of poses) {
      const x = cx + p.x * half + p.z * pxPerM * 0.25, y = cy + p.y * half + p.z * pxPerM * 0.35;
      ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();

    // Airborne grains lifted above the plate
    ctx.fillStyle = isPowder ? '#fcf5d4' : '#f4e8c6';
    ctx.beginPath();
    for (const { p, r } of poses) {
      const liftR = r * (1.08 + Math.min(0.4, p.z * 200));
      const x = cx + p.x * half, y = cy + p.y * half - p.z * pxPerM;
      ctx.moveTo(x + liftR, y); ctx.arc(x, y, liftR, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}

function drawSlime(cx, cy, half) {
  // Continuous creamy cornstarch suspension puddle across the plate
  const puddleAlpha = S.overlay ? 0.5 : 0.86;
  ctx.save();
  ctx.beginPath();
  if (S.shape === 'circle') ctx.arc(cx, cy, half * 0.94, 0, Math.PI * 2);
  else ctx.roundRect(cx - half * 0.92, cy - half * 0.92, half * 1.84, half * 1.84, half * 0.14);
  const poolGrad = ctx.createRadialGradient(cx - half * 0.25, cy - half * 0.3, half * 0.08, cx, cy, half);
  poolGrad.addColorStop(0, 'rgba(248, 244, 234, ' + puddleAlpha + ')');
  poolGrad.addColorStop(0.75, 'rgba(232, 224, 206, ' + puddleAlpha + ')');
  poolGrad.addColorStop(1, 'rgba(206, 196, 174, ' + puddleAlpha + ')');
  ctx.fillStyle = poolGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(182, 170, 145, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.clip();

  // Cohesive height-field relief so jammed oobleck ridges merge seamlessly out of the pool
  pileBuf.fill(0);
  const pm = PILE_N - 1;
  for (const p of slime) {
    const fx = (p.x + 1) * 0.5 * pm, fy = (p.y + 1) * 0.5 * pm;
    const i0 = Math.max(0, Math.min(PILE_N - 2, Math.floor(fx))), j0 = Math.max(0, Math.min(PILE_N - 2, Math.floor(fy)));
    const tx = fx - i0, ty = fy - j0, idx = j0 * PILE_N + i0;
    const w = (0.45 + p.spike * 2.4) * p.rad;
    pileBuf[idx] += w * (1 - tx) * (1 - ty);
    pileBuf[idx + 1] += w * tx * (1 - ty);
    pileBuf[idx + PILE_N] += w * (1 - tx) * ty;
    pileBuf[idx + PILE_N + 1] += w * tx * ty;
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < PILE_N; y++) {
      const row = y * PILE_N;
      for (let x = 0; x < PILE_N; x++) {
        const xm = x > 0 ? x - 1 : 0, xp = x < pm ? x + 1 : pm;
        pileTmp[row + x] = 0.25 * pileBuf[row + xm] + 0.5 * pileBuf[row + x] + 0.25 * pileBuf[row + xp];
      }
    }
    for (let y = 0; y < PILE_N; y++) {
      const ym = (y > 0 ? y - 1 : 0) * PILE_N, yc = y * PILE_N, yp = (y < pm ? y + 1 : pm) * PILE_N;
      for (let x = 0; x < PILE_N; x++) {
        pileBuf[yc + x] = 0.25 * pileTmp[ym + x] + 0.5 * pileTmp[yc + x] + 0.25 * pileTmp[yp + x];
      }
    }
  }
  const d = pileImg.data;
  for (let y = 0; y < PILE_N; y++) {
    const ym = (y > 0 ? y - 1 : 0) * PILE_N, yc = y * PILE_N, yp = (y < pm ? y + 1 : pm) * PILE_N;
    for (let x = 0; x < PILE_N; x++) {
      const idx = yc + x, o = idx * 4, h = pileBuf[idx];
      if (h <= 0.04) { d[o + 3] = 0; continue; }
      const xm = x > 0 ? x - 1 : 0, xp = x < pm ? x + 1 : pm;
      const sx = pileBuf[yc + xm] - pileBuf[yc + xp], sy = pileBuf[ym + x] - pileBuf[yp + x];
      const slope = sx + sy;
      const spec = Math.max(0, slope) > 0.15 ? Math.min(30, (slope - 0.15) * 85) : 0;
      const lit = 1 + Math.max(-0.22, Math.min(0.16, slope * 0.45));
      d[o] = Math.min(255, 240 * lit + spec);
      d[o + 1] = Math.min(255, 234 * lit + spec);
      d[o + 2] = Math.min(255, 218 * lit + spec);
      d[o + 3] = Math.min(235, h * 260);
    }
  }
  pileCtx.putImageData(pileImg, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(pileCanvas, cx - half, cy - half, half * 2, half * 2);

  // Subtle wet glossy crests on the highest jammed DST finger tips
  ctx.fillStyle = 'rgba(255, 253, 246, 0.55)';
  ctx.beginPath();
  for (const p of slime) {
    if (p.spike < 0.35) continue;
    const tx = cx + p.x * half - p.spike * 2.5, ty = cy + p.y * half - p.spike * 6;
    const r = (1.6 + p.spike * 2.8) * p.rad;
    ctx.moveTo(tx + r, ty); ctx.arc(tx, ty, r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

function drawBow(cx, cy, half) {
  const x = cx + S.bow.x * half, y = cy + S.bow.y * half;
  const nx = S.shape === 'circle' ? S.bow.x : (Math.abs(S.bow.x) > Math.abs(S.bow.y) ? Math.sign(S.bow.x) : 0);
  const ny = S.shape === 'circle' ? S.bow.y : (Math.abs(S.bow.x) > Math.abs(S.bow.y) ? 0 : Math.sign(S.bow.y));
  const tx = -ny, ty = nx, L = 34;
  const stroke = S.muted ? 0 : Math.sin(phase) * 7;
  const bx = x + tx * stroke, by = y + ty * stroke;

  // Horsehair ribbon tangent to plate edge
  const hx0 = bx - tx * L + nx * 3.5, hy0 = by - ty * L + ny * 3.5;
  const hx1 = bx + tx * L + nx * 3.5, hy1 = by + ty * L + ny * 3.5;
  ctx.strokeStyle = '#f4efe2'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hx0, hy0); ctx.lineTo(hx1, hy1); ctx.stroke();

  // Arched Pernambuco wooden bow stick
  const sx0 = bx - tx * L + nx * 10, sy0 = by - ty * L + ny * 10;
  const sx1 = bx + tx * L + nx * 10, sy1 = by + ty * L + ny * 10;
  const mx = bx + nx * 13.5, my = by + ny * 13.5;
  ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.quadraticCurveTo(mx, my, sx1, sy1); ctx.stroke();
  ctx.strokeStyle = '#a14a24'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.quadraticCurveTo(mx, my, sx1, sy1); ctx.stroke();

  // Ebony frog & silver ferrule at trailing end
  ctx.fillStyle = '#1c1917';
  ctx.beginPath(); ctx.arc(sx0, sy0, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath(); ctx.arc((sx0 + hx0) * 0.5, (sy0 + hy0) * 0.5, 2, 0, Math.PI * 2); ctx.fill();

  // Rosin contact point
  ctx.fillStyle = 'rgba(255, 244, 214, 0.92)';
  ctx.beginPath(); ctx.arc(x, y, 2.8, 0, Math.PI * 2); ctx.fill();
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
  const fallback2D = () => {
    $('cy-webgl-fallback').hidden = false;
    S.view = '2d';
    pressGroup(['cy-view-2d-btn', 'cy-view-3d-btn'], 'cy-view-2d-btn');
    canvas2d.hidden = false;
    canvas.hidden = true;
    $('cy-3d-scale').hidden = true;
  };
  let mod;
  try { mod = await import('../../vendor/three-bundle.min.js'); } catch { fallback2D(); return; }
  const { THREE, OrbitControls } = mod;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); } catch { fallback2D(); return; }
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
  const col = new Float32Array((R + 1) * (R + 1) * 3);
  const idx = [];
  for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) { const a = j * (R + 1) + i, b = a + 1, c = a + R + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geom.setIndex(idx);
  const plateMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, color: 0xffffff, metalness: 0.6, roughness: 0.35, vertexColors: true });
  const waterMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, color: 0xffffff, metalness: 0.18, roughness: 0.08, vertexColors: true });
  const baseCol = new THREE.Color(), waterCol = new THREE.Color(0x247ba0), quietCol = new THREE.Color(0x22d3ee);
  const mesh = new THREE.Mesh(geom, plateMat);
  scene.add(mesh);
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  let downPos = null;
  renderer.domElement.addEventListener('pointerdown', e => {
    controls.autoRotate = false;
    downPos = { x: e.clientX, y: e.clientY };
  });
  renderer.domElement.addEventListener('pointerup', e => {
    if (S.drive !== 'bow' || !downPos) return;
    const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
    downPos = null;
    if (moved > 6) return;
    const r = canvas.getBoundingClientRect();
    pointerNdc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointerNdc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObject(mesh);
    if (hits.length) {
      S.bow = { x: hits[0].point.x, y: hits[0].point.z };
      snapBow(); renderModeList(); updateStatus();
    }
  });

  const boltGroup = new THREE.Group();
  const metalDark = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.28 });
  const metalBright = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
  const socketMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.5, roughness: 0.6 });
  const washer = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.018, 32), metalBright);
  washer.position.y = 0.009;
  const hexHead = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.045, 6), metalDark);
  hexHead.position.y = 0.038;
  const hexSocket = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.012, 6), socketMat);
  hexSocket.position.y = 0.056;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.14, 20), metalDark);
  shaft.position.y = -0.06;
  boltGroup.add(washer, hexHead, hexSocket, shaft);
  scene.add(boltGroup);

  // 3D violin bow (local +X = outward radial normal, +Z = plate-edge tangent)
  const bowMesh = new THREE.Group();
  const bowInner = new THREE.Group();
  bowInner.rotation.set(0.18, 0, -0.32);
  const bowHair = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.014, 0.72),
    new THREE.MeshStandardMaterial({ color: 0xf4efe2, roughness: 0.75, metalness: 0.02 })
  );
  bowHair.position.set(0.024, 0, 0);
  const bowStick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.007, 0.011, 0.76, 10),
    new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.35, metalness: 0.08 })
  );
  bowStick.rotation.x = Math.PI / 2;
  bowStick.position.set(0.085, 0.022, 0);
  const bowTip = new THREE.Mesh(
    new THREE.BoxGeometry(0.068, 0.014, 0.018),
    new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.35, metalness: 0.08 })
  );
  bowTip.position.set(0.055, 0.011, 0.365);
  const bowFrog = new THREE.Mesh(
    new THREE.BoxGeometry(0.062, 0.024, 0.075),
    new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.55, metalness: 0.05 })
  );
  bowFrog.position.set(0.055, 0.008, -0.34);
  const bowFerrule = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, 0.018, 0.018),
    metalBright
  );
  bowFerrule.position.set(0.032, 0.003, -0.305);
  bowInner.add(bowHair, bowStick, bowTip, bowFrog, bowFerrule);
  bowMesh.add(bowInner);
  scene.add(bowMesh);

  const ptsGeom = new THREE.BufferGeometry();
  const MAX_PTS = Math.max(COUNT.sand, COUNT.powder, COUNT.slime);
  ptsGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_PTS * 3), 3));
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
    baseCol.set(mat.color);
    plateMat.color.setHex(0xffffff);
    const clear = S.material === 'glass' || S.material === 'acrylic';
    plateMat.transparent = clear; plateMat.opacity = clear ? 0.72 : 1;
    plateMat.metalness = clear ? 0.05 : 0.6; plateMat.roughness = clear ? 0.08 : 0.35;
    boltGroup.scale.set(plate.bolt, 1, plate.bolt);
    resize();
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function frame() {
    let ex = 0;
    if (peakA > 0) {
      if (S.muted) {
        ex = frozenEx > 0 ? Math.min(frozenEx, 0.1 / peakA) : (0.1 / peakA);
      } else {
        ex = 0.1 / peakA;
        frozenEx = ex;
      }
    }
    const cp = Math.cos(phase), sp = Math.sin(phase), cpHalf = Math.cos(phase * 0.5), N = plate.N;
    const omega = 2 * Math.PI * S.f;
    const isWater = S.medium === 'water';
    const kFar = isWater ? getFaradayK(omega) : 0;
    const kNyq3d = Math.PI / ((2 * plate.s) / R);
    const vis3d = kFar <= 0.7 * kNyq3d ? 1 : Math.max(0, 1 - (kFar - 0.7 * kNyq3d) / (0.3 * kNyq3d));
    const threshold = 1.8 + 0.002 * S.f;
    const activeFaraday = isWater && !S.muted && vis3d > 0 && kFar > 0;
    const showOverlay = S.overlay;

    const sampleHeightAndAmp = (x, y) => {
      const fx = (x + 1) / 2 * (N - 1), fy = (y + 1) / 2 * (N - 1);
      const i0 = Math.max(0, Math.min(N - 2, Math.floor(fx))), j0 = Math.max(0, Math.min(N - 2, Math.floor(fy)));
      const tx = fx - i0, ty = fy - j0, k = j0 * N + i0;
      const reVal = (field.re[k] * (1 - tx) + field.re[k + 1] * tx) * (1 - ty) + (field.re[k + N] * (1 - tx) + field.re[k + N + 1] * tx) * ty;
      const imVal = (field.im[k] * (1 - tx) + field.im[k + 1] * tx) * (1 - ty) + (field.im[k + N] * (1 - tx) + field.im[k + N + 1] * tx) * ty;
      let h = (reVal * cp - imVal * sp) * ex;
      const amp = Math.hypot(reVal, imVal);
      if (activeFaraday) {
        const gamma = omega * omega * amp / G;
        if (gamma > threshold) {
          const fAmp = 0.028 * vis3d * Math.min(1, Math.sqrt((gamma - threshold) / 6));
          h += fAmp * 0.5 * (Math.cos(kFar * x * plate.s) + Math.cos(kFar * y * plate.s)) * cpHalf;
        }
      }
      return { h, amp };
    };
    const heightAt = (x, y) => sampleHeightAndAmp(x, y).h;

    const srcCol = isWater ? waterCol : baseCol;
    for (let k = 0; k < xz.length / 2; k++) {
      const sHA = sampleHeightAndAmp(xz[k * 2], xz[k * 2 + 1]);
      pos[k * 3 + 1] = sHA.h;
      const quiet = showOverlay && omega * omega * sHA.amp < G;
      const t = quiet ? 0.55 : 0;
      col[k * 3]     = srcCol.r * (1 - t) + quietCol.r * t;
      col[k * 3 + 1] = srcCol.g * (1 - t) + quietCol.g * t;
      col[k * 3 + 2] = srcCol.b * (1 - t) + quietCol.b * t;
    }
    geom.attributes.position.needsUpdate = true;
    geom.attributes.color.needsUpdate = true;
    geom.computeVertexNormals();
    mesh.material = isWater ? waterMat : plateMat;
    const Z = S.drive === 'driver' && !S.muted ? driverStroke(S.f) * cp * ex : 0;
    boltGroup.position.set(0, Z, 0);
    bowMesh.visible = S.drive === 'bow';
    if (bowMesh.visible) {
      const nx = S.shape === 'circle' ? S.bow.x : (Math.abs(S.bow.x) > Math.abs(S.bow.y) ? Math.sign(S.bow.x) : 0);
      const ny = S.shape === 'circle' ? S.bow.y : (Math.abs(S.bow.x) > Math.abs(S.bow.y) ? 0 : Math.sign(S.bow.y));
      const nLen = Math.hypot(nx, ny) || 1;
      const ux = nx / nLen, uz = ny / nLen, tx = -uz, tz = ux;
      const stroke = S.muted ? 0 : Math.sin(phase) * 0.14;
      bowMesh.position.set(S.bow.x + tx * stroke, heightAt(S.bow.x * 0.98, S.bow.y * 0.98) + 0.015, S.bow.y + tz * stroke);
      bowMesh.rotation.set(0, Math.atan2(-uz, ux), 0);
    }
    const p = ptsGeom.attributes.position.array;
    let n = 0;
    if (bed) {
      ptsMat.color.set(S.medium === 'sand' ? 0xeadbad : 0xfff4c2); ptsMat.size = 0.016;
      for (const g of bed.grains) {
        const q = bed.pose(g);
        const liftZ = peakA > 0 ? 0.45 * Math.tanh(q.z * ex / 0.35) : q.z / plate.s;
        p[n * 3] = q.x; p[n * 3 + 1] = heightAt(q.x, q.y) + 0.008 + liftZ; p[n * 3 + 2] = q.y; n++;
      }
    } else if (slime.length) {
      ptsMat.color.set(0xf4efe4); ptsMat.size = 0.045;
      for (const q of slime) { p[n * 3] = q.x; p[n * 3 + 1] = heightAt(q.x, q.y) + 0.01 + q.spike * 0.25; p[n * 3 + 2] = q.y; n++; }
    }
    ptsGeom.setDrawRange(0, n);
    ptsGeom.attributes.position.needsUpdate = true;
    controls.update();
    renderer.render(scene, camera);
    const label = $('cy-3d-scale');
    label.hidden = false;
    const settling = S.muted && peakA < drivenPeakRef * 0.005;
    label.textContent = peakA > 0 && !settling
      ? 'Heights ×' + Math.round(ex * plate.s).toLocaleString() + ' (real peak ' + fmtLen(peakA) + ') · slow-motion strobe'
      : 'Plate at rest';
  }

  three = { frame, resize, rebuild };
  rebuild();
  frame();
  window.addEventListener('resize', resize);
  document.addEventListener('creation-app-resize', resize);
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
    if (!S.muted && peakA > 0) drivenPeakRef = peakA;
    if (bed) { airborne = bed.step(dt, { field, omega: 2 * Math.PI * S.f, air: S.air }); separateGrains(); }
    else if (slime.length) stepSlime(dt);
    phase = (phase + 2 * Math.PI * realDt / STROBE_PERIOD) % (2 * Math.PI);
    if (S.view === '2d') draw2D(); else if (three) three.frame();
    let frfUpdated = false;
    if (frfDirty) { computeFRF(); frfUpdated = true; }
    const frfCanvas = $('cy-frf');
    const frfKey = S.f.toFixed(2) + ':' + frfCanvas.clientWidth + ':' + frfCanvas.clientHeight + ':' + (document.documentElement.dataset.lighting || '');
    if (frfUpdated || frfKey !== lastFrfRenderKey) {
      lastFrfRenderKey = frfKey;
      drawFRF();
    }
    updateTone();
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

function syncQSlider(q) {
  $('cy-q-slider').value = Math.round(1000 * Math.log(q / 20) / Math.log(100));
  $('cy-q-val').textContent = q;
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
    const list = excitableModes();
    const pool = list.length ? list : plate.modes;
    let best = pool[0], bestDist = Infinity;
    for (const m of pool) {
      const d = Math.abs(m.f - S.f);
      if (d < bestDist) { bestDist = d; best = m; }
    }
    if (!best) return;
    const rawH = S.thickness * S.f / best.f;
    const h = Math.max(0.0003, Math.min(0.004, rawH));
    S.thickness = h;
    $('cy-thick-slider').value = Math.round(h * 1e5);
    $('cy-thick-val').textContent = (h * 1000).toFixed(2) + ' mm';
    rebuildPlate();
    if (Math.abs(rawH - h) > 1e-6) {
      setTimeout(() => {
        const pn = $('cy-plate-note');
        if (pn) pn.textContent += ' (Thickness hit the 0.30–4.00 mm limit; change plate size to reach this pitch.)';
      }, 45);
    }
  });

  const audioBtn = $('cy-audio-btn');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      toneOn = !toneOn;
      if (toneOn) {
        const ctx = ensureTone();
        if (ctx && ctx.state === 'suspended') ctx.resume();
      }
      audioBtn.classList.toggle('audio-on', toneOn);
      audioBtn.setAttribute('aria-pressed', toneOn ? 'true' : 'false');
      audioBtn.textContent = toneOn ? '🔊 Sound: On' : '🔇 Sound: Off';
      updateTone();
    });
  }

  const bowPosWrap = $('cy-bow-pos-wrap');
  const bowSlider = $('cy-bow-slider');
  if (bowSlider) {
    bowSlider.addEventListener('input', e => {
      const rad = (+e.target.value * Math.PI) / 180;
      S.bow = { x: Math.cos(rad), y: Math.sin(rad) };
      snapBow();
      renderModeList();
      updateStatus();
    });
  }

  const driveIds = ['cy-drive-driver', 'cy-drive-bow'];
  for (const [id, kind] of [['cy-drive-driver', 'driver'], ['cy-drive-bow', 'bow']]) {
    $(id).addEventListener('click', () => {
      S.drive = kind; pressGroup(driveIds, id); forcesKey = '';
      if (bowPosWrap) bowPosWrap.hidden = kind !== 'bow';
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
  matSel.addEventListener('change', () => {
    S.material = matSel.value;
    S.Q = MATERIALS[S.material].defaultQ || 500;
    syncQSlider(S.Q);
    rebuildPlate();
  });
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
    $('cy-webgl-fallback').hidden = true;
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

  // Controls | Modes | Guide tab switching inside #cy-lab
  const tabBtns = document.querySelectorAll('.cy-tab-btn[data-pane]');
  const panes = document.querySelectorAll('.cy-pane');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.pane;
      tabBtns.forEach(b => b.setAttribute('aria-selected', b === btn ? 'true' : 'false'));
      panes.forEach(p => { p.hidden = p.id !== targetId; });
    });
  });

  document.addEventListener('visibilitychange', updateTone);
  document.addEventListener('creation-app-resize', () => { lastFrfRenderKey = ''; });
}

wire();
syncAmpSlider();
syncQSlider(S.Q);
rebuildPlate({ keepFrequency: false });
SimKit.loop(tick, { el: SimKit.stage(canvas2d, $('cy-canvas3d')), maxDt: 0.05 });
