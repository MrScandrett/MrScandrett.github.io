/* Seeing Breath in Wi-Fi: the room lab, the decode lab, and the live ESP32 link.
 * Physics and signal chain live in wifi-sensing-core.mjs (tested in tests/wifi-sensing.test.mjs). */
import * as W from './wifi-sensing-core.mjs';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const PAL = { bg: '#0b1220', grid: 'rgba(148,163,184,.22)', text: '#cbd5e1', dim: '#94a3b8', accent: '#38bdf8', warm: '#fbbf24', ok: '#34d399', bad: '#f87171' };
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FS = 20; // simulated packets per second

/* ------------------------------------------------------------------ canvas helpers */

function fit(cv, aspect, fixedH) {
  const box = cv.parentElement;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(220, Math.floor(box.clientWidth));
  const h = fixedH || Math.round(w * aspect);
  if (cv._w !== w || cv._h !== h || cv._d !== dpr) {
    cv.width = Math.floor(w * dpr); cv.height = Math.floor(h * dpr);
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    cv._w = w; cv._h = h; cv._d = dpr;
  }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function range(arr, from = 0) {
  let lo = Infinity, hi = -Infinity;
  for (let i = from; i < arr.length; i++) { const v = arr[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
  return [lo, hi];
}

function plot(ctx, ys, x, y, w, h, { lo, hi, color = PAL.accent, width = 1.6, dash = null } = {}) {
  if (!ys.length) return;
  if (lo == null) [lo, hi] = range(ys);
  if (hi - lo < 1e-9) { hi = lo + 1; }
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  for (let i = 0; i < ys.length; i++) {
    const px = x + (ys.length === 1 ? 0 : (i / (ys.length - 1)) * w);
    const py = y + h - ((ys[i] - lo) / (hi - lo)) * h;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

function frameBox(ctx, w, h, label) {
  ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = PAL.grid; ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) { const yy = (h * i) / 4; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke(); }
  if (label) { ctx.fillStyle = PAL.dim; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(label, 8, 15); }
}

const ramp = (v) => {
  // dark violet -> teal -> yellow
  const stops = [[48, 20, 90], [30, 140, 150], [250, 225, 60]];
  const s = Math.min(0.999, Math.max(0, v)) * 2;
  const i = Math.floor(s), f = s - i;
  const a = stops[i], b = stops[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
};

/* ------------------------------------------------------------------ room lab */

const synth = new W.CsiSynth({ seed: 11, bpm: 16, mm: 5, noise: 0.25, pos: [1.9, 0.55], quantize: false, drift: 0 });
const room = synth.room;
const roomFrames = [];
const ROOM_KEEP = FS * 90;
let paused = false;
let selIdx = 26;           // index into SUB_K, near the middle of the band
let mapMode = 'off';       // off | one | best
let showTrue = true;
let mapCache = null, mapKey = '', mapTimer = 0;

const roomCv = $('#ws-room');
const traceCv = $('#ws-trace');
const phasorCv = $('#ws-phasor');

function ui(id) { return document.getElementById(id); }

function refreshMap() {
  if (mapMode === 'off') { mapCache = null; return; }
  const key = [synth.band, mapMode, selIdx, synth.breather.mm].join('|');
  if (key === mapKey && mapCache) return;
  const m = W.sensitivityMap(room, { band: synth.band, k: mapMode === 'best' ? 'best' : W.SUB_K[selIdx], chestMm: synth.breather.mm, nx: 200, ny: 120 });
  const off = document.createElement('canvas');
  off.width = m.nx; off.height = m.ny;
  const octx = off.getContext('2d');
  const img = octx.createImageData(m.nx, m.ny);
  for (let i = 0; i < m.values.length; i++) {
    const v = m.values[i];
    const [r, g, b] = ramp(v);
    img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 70 + 170 * v;
  }
  octx.putImageData(img, 0, 0);
  mapCache = off; mapKey = key;
}
function scheduleMap() { clearTimeout(mapTimer); mapTimer = setTimeout(() => { refreshMap(); }, 80); }

function drawRoom(now) {
  if (!roomCv) return;
  const { ctx, w, h } = fit(roomCv, room.h / room.w);
  const s = w / room.w;
  ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, w, h);
  if (mapMode !== 'off' && mapCache) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(mapCache, 0, 0, w, h);
  }
  // 1 m grid
  ctx.strokeStyle = 'rgba(148,163,184,.14)'; ctx.lineWidth = 1;
  for (let x = 1; x < room.w; x++) { ctx.beginPath(); ctx.moveTo(x * s, 0); ctx.lineTo(x * s, h); ctx.stroke(); }
  for (let y = 1; y < room.h; y++) { ctx.beginPath(); ctx.moveTo(0, y * s); ctx.lineTo(w, y * s); ctx.stroke(); }
  const lam = W.wavelengthM(synth.f0);
  // wavefronts leaving the router
  if (!reduceMotion) {
    ctx.strokeStyle = 'rgba(56,189,248,.16)'; ctx.lineWidth = 1;
    const phase = ((now / 1000) * 0.25) % 1;
    for (let r = (phase - 1) * lam; r < 3.6; r += lam) {
      if (r <= 0) continue;
      ctx.beginPath(); ctx.arc(room.tx[0] * s, room.tx[1] * s, r * s, -1.2, 1.2); ctx.stroke();
    }
  }
  const tx = [room.tx[0] * s, room.tx[1] * s], rx = [room.rx[0] * s, room.rx[1] * s];
  // direct path
  ctx.strokeStyle = 'rgba(148,163,184,.8)'; ctx.lineWidth = 2; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(tx[0], tx[1]); ctx.lineTo(rx[0], rx[1]); ctx.stroke();
  // person
  const last = roomFrames[roomFrames.length - 1];
  const d = last ? last.chestMm / 1000 : 0;
  const n = W.chestNormal(room, synth.pos);
  const EX = 25; // exaggeration so 5 mm is visible
  const px = synth.pos[0] * s, py = synth.pos[1] * s;
  const cx = px + n[0] * d * EX * s, cy = py + n[1] * d * EX * s;
  ctx.strokeStyle = 'rgba(56,189,248,.9)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(tx[0], tx[1]); ctx.lineTo(cx, cy); ctx.lineTo(rx[0], rx[1]); ctx.stroke();
  ctx.fillStyle = '#e2e8f0'; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(px - n[0] * 0.04 * s, py - n[1] * 0.12 * s, 0.26 * s, 0.14 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = PAL.warm; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - 0.16 * s, cy); ctx.lineTo(cx + 0.16 * s, cy); ctx.stroke();
  ctx.lineCap = 'butt';
  // routers
  for (const [p, label] of [[tx, 'Router'], [rx, 'Receiver']]) {
    ctx.fillStyle = '#334155'; ctx.fillRect(p[0] - 16, p[1] - 8, 32, 16);
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(p[0] - 10, p[1] - 24, 3, 16); ctx.fillRect(p[0] + 7, p[1] - 24, 3, 16);
    ctx.fillStyle = PAL.text; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(label, p[0], p[1] + 26);
  }
  // wavelength scale bar
  ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 2;
  const bx = 12, by = h - 14;
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + lam * s, by); ctx.moveTo(bx, by - 4); ctx.lineTo(bx, by + 4); ctx.moveTo(bx + lam * s, by - 4); ctx.lineTo(bx + lam * s, by + 4); ctx.stroke();
  ctx.fillStyle = '#f8fafc'; ctx.textAlign = 'left'; ctx.font = '12px Inter, sans-serif';
  ctx.fillText(w < 560 ? `λ = ${(lam * 100).toFixed(1)} cm` : `one wavelength = ${(lam * 100).toFixed(1)} cm`, bx + lam * s + 8, by + 4);
  ctx.fillStyle = PAL.dim; ctx.textAlign = 'right';
  ctx.fillText(w < 560 ? 'chest ×25' : 'chest motion drawn ×25 so you can see it', w - 10, h - 10);
  if (synth.walking) { ctx.fillStyle = PAL.bad; ctx.font = '700 13px Inter, sans-serif'; ctx.fillText(w < 560 ? 'someone walks by' : 'someone is walking through the beam', w - 10, 20); }
  if (mapMode !== 'off') {
    ctx.fillStyle = 'rgba(11,18,32,.75)'; ctx.fillRect(8, 8, w < 560 ? 150 : 232, 22);
    ctx.fillStyle = PAL.text; ctx.textAlign = 'left'; ctx.font = '12px Inter, sans-serif';
    ctx.fillText(w < 560 ? 'bright = easy to see' : 'bright = a breath here is easy to see', 14, 23);
  }
}

function drawTrace() {
  if (!traceCv) return;
  const { ctx, w, h } = fit(traceCv, 0, 190);
  const kk = `${W.SUB_K[selIdx] > 0 ? '+' : ''}${W.SUB_K[selIdx]}`;
  frameBox(ctx, w, h, w < 560 ? `Subcarrier ${kk}, last 20 s` : `Amplitude on subcarrier ${kk}, last 20 s`);
  const n = Math.min(roomFrames.length, FS * 20);
  if (n < 4) return;
  const slice = roomFrames.slice(-n);
  const a = slice.map((f) => f.amps[selIdx]);
  let [lo, hi] = range(a);
  const mid = (lo + hi) / 2, half = Math.max(3, ((hi - lo) / 2) * 1.3);
  lo = mid - half; hi = mid + half;
  const padL = 40, padB = 20;
  ctx.fillStyle = PAL.dim; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'right';
  ctx.fillText(hi.toFixed(0), padL - 6, 28); ctx.fillText(lo.toFixed(0), padL - 6, h - padB);
  if (showTrue) {
    const chest = slice.map((f) => f.chestMm);
    const am = a.reduce((x, y) => x + y, 0) / a.length;
    let dot = 0; slice.forEach((f, i) => { dot += (a[i] - am) * f.chestMm; });
    const sign = dot < 0 ? -1 : 1;
    const cm = Math.max(0.5, ...chest.map(Math.abs));
    plot(ctx, chest.map((c) => mid + sign * (c / cm) * half * 0.85), padL, 20, w - padL - 8, h - 20 - padB, { lo, hi, color: PAL.warm, width: 2, dash: [6, 5] });
  }
  plot(ctx, a, padL, 20, w - padL - 8, h - 20 - padB, { lo, hi, color: PAL.accent });
  const pp = hi - lo;
  const swing = Math.max(...a) - Math.min(...a);
  ctx.fillStyle = PAL.text; ctx.textAlign = 'right'; ctx.font = '12px Inter, sans-serif';
  const pct = ((swing / (a.reduce((x, y) => x + y, 0) / a.length)) * 100).toFixed(1);
  if (w < 560) ctx.fillText(`swing ${pct}%`, w - 10, 15);
  else ctx.fillText(`swing ${swing.toFixed(0)} counts (${pct}% of the signal)`, w - 10, 15);
  ctx.textAlign = 'left'; ctx.fillStyle = PAL.warm; ctx.fillText(showTrue ? '- - true chest position' : '', padL + 4, h - 6);
  ctx.fillStyle = PAL.dim; ctx.textAlign = 'right'; ctx.fillText('20 s ago → now', w - 10, h - 6);
  void pp;
}

const trail = [];
function drawPhasor() {
  if (!phasorCv) return;
  const { ctx, w, h } = fit(phasorCv, 0, 230);
  frameBox(ctx, w, h, 'Phasors: arrow length = amplitude');
  const f = W.subFreq(synth.f0, W.SUB_K[selIdx]);
  const S = W.staticField(room, f);
  const last = roomFrames[roomFrames.length - 1];
  const d = last ? last.chestMm / 1000 : 0;
  const vec = (dd) => {
    const p = W.bodyPath(room, synth.pos, dd);
    const a = -W.TAU * f * p.len / W.C0 + p.phase;
    return [p.gain * Math.cos(a), p.gain * Math.sin(a)];
  };
  const B = vec(d), B0 = vec(0);
  const MAG = 6;
  trail.push([B[0] - B0[0], B[1] - B0[1]]);
  if (trail.length > 50) trail.shift();
  const mag = Math.hypot(S[0], S[1]);
  const sc = Math.min(w * 0.38, h * 0.42) / Math.max(0.8, mag * 0.9);
  const ox = w * 0.5 - S[0] * sc * 0.5, oy = h * 0.55 + S[1] * sc * 0.5;
  const P = (v) => [ox + v[0] * sc, oy - v[1] * sc];
  const arrow = (a, b, color, width = 3) => {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    ctx.beginPath(); ctx.moveTo(b[0], b[1]);
    ctx.lineTo(b[0] - 9 * Math.cos(ang - 0.4), b[1] - 9 * Math.sin(ang - 0.4));
    ctx.lineTo(b[0] - 9 * Math.cos(ang + 0.4), b[1] - 9 * Math.sin(ang + 0.4)); ctx.fill();
  };
  const o = P([0, 0]);
  const sTip = P(S);
  const bTip = P([S[0] + B0[0], S[1] + B0[1]]);
  arrow(o, sTip, '#94a3b8');
  arrow(sTip, bTip, PAL.accent, 2.5);
  // the wobble, magnified
  ctx.strokeStyle = PAL.warm; ctx.lineWidth = 2; ctx.beginPath();
  trail.forEach((t, i) => {
    const p = P([S[0] + B0[0] + t[0] * MAG, S[1] + B0[1] + t[1] * MAG]);
    if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]);
  });
  ctx.stroke();
  ctx.setLineDash([5, 4]); arrow(o, bTip, PAL.ok, 2); ctx.setLineDash([]);
  ctx.fillStyle = PAL.dim; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('grey: walls + direct (fixed)', 10, h - 40);
  ctx.fillStyle = PAL.accent; ctx.fillText('blue: chest reflection', 10, h - 25);
  ctx.fillStyle = PAL.warm; ctx.fillText(`gold: its wobble, magnified ×${MAG}`, 10, h - 10);
  ctx.fillStyle = PAL.ok; ctx.textAlign = 'right';
  const tot = Math.hypot(S[0] + B[0], S[1] + B[1]);
  ctx.fillText(`green = ideal CSI magnitude: ${(tot * W.AMP_SCALE).toFixed(1)}`, w - 10, 15);
}

/* ------------------------------------------------------------------ pointer and keyboard */

function clampPos(x, y) { return [Math.min(room.w - 0.35, Math.max(0.55, x)), Math.min(room.h - 0.3, Math.max(0.3, y))]; }
function setPos(x, y) {
  synth.set({ pos: clampPos(x, y) });
  trail.length = 0;
  const l = ui('ws-pos'); if (l) l.textContent = `${synth.pos[0].toFixed(2)} m, ${synth.pos[1].toFixed(2)} m`;
}
if (roomCv) {
  let drag = false;
  const at = (e) => { const r = roomCv.getBoundingClientRect(); setPos(((e.clientX - r.left) / r.width) * room.w, ((e.clientY - r.top) / r.height) * room.h); };
  roomCv.addEventListener('pointerdown', (e) => { drag = true; roomCv.setPointerCapture(e.pointerId); at(e); });
  roomCv.addEventListener('pointermove', (e) => { if (drag) at(e); });
  roomCv.addEventListener('pointerup', () => { drag = false; });
  roomCv.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 0.2 : 0.03;
    const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (mv) { e.preventDefault(); setPos(synth.pos[0] + mv[0], synth.pos[1] + mv[1]); }
  });
}

/* ------------------------------------------------------------------ panel controls */

function bind(id, fn) {
  const el = ui(id); if (!el) return;
  const run = () => fn(el);
  el.addEventListener('input', run); el.addEventListener('change', run); run();
}
bind('ws-band', (el) => { synth.set({ band: el.value }); mapKey = ''; scheduleMap(); trail.length = 0; });
bind('ws-bpm', (el) => { synth.set({ bpm: +el.value }); ui('ws-bpm-v').textContent = el.value + ' breaths/min'; });
bind('ws-mm', (el) => { synth.set({ mm: +el.value }); ui('ws-mm-v').textContent = el.value + ' mm'; mapKey = ''; scheduleMap(); });
bind('ws-noise', (el) => { synth.set({ noise: +el.value }); ui('ws-noise-v').textContent = (+el.value).toFixed(2); });
bind('ws-sub', (el) => { selIdx = +el.value; const k = W.SUB_K[selIdx]; ui('ws-sub-v').textContent = `k = ${k > 0 ? '+' : ''}${k} (${((W.BANDS[synth.band].f0 + k * W.SUB_SPACING_HZ) / 1e9).toFixed(4)} GHz)`; mapKey = ''; scheduleMap(); trail.length = 0; });
bind('ws-map', (el) => { mapMode = el.value; mapKey = ''; refreshMap(); });
bind('ws-true', (el) => { showTrue = el.checked; });
bind('ws-quant', (el) => { synth.set({ quantize: el.checked }); });
bind('ws-drift', (el) => { synth.set({ drift: el.checked ? 5 : 0 }); });
ui('ws-walk')?.addEventListener('click', () => synth.triggerWalker(6));
ui('ws-pause')?.addEventListener('click', (e) => { paused = !paused; e.currentTarget.setAttribute('aria-pressed', String(paused)); e.currentTarget.textContent = paused ? '▶ Resume' : '⏸ Pause'; });
ui('ws-sit')?.addEventListener('click', () => setPos(1.9, 0.55));
setPos(synth.pos[0], synth.pos[1]);

/* ------------------------------------------------------------------ decode lab */

const dec = {
  src: 'room',              // room | practice | file | serial
  window: 30,
  filter: true,
  best: true,
  sub: 26,
  frames: { practice: [], file: [], serial: [] },
  ph: 0,                    // playhead (s) for recordings
  playing: false,
  hidden: false,            // challenge: hide the machine's answer
  truth: null,
  last: null,
};

function srcFrames() {
  if (dec.src === 'room') return roomFrames;
  const all = dec.frames[dec.src];
  if (dec.src === 'serial') return all;
  if (!all.length) return all;
  const t0 = all[0].t;
  let end = all.length;
  while (end > 0 && all[end - 1].t - t0 > dec.ph) end--;
  return all.slice(0, end);
}
function srcDuration() { const a = dec.frames[dec.src]; return a && a.length ? a[a.length - 1].t - a[0].t : 0; }

function buildPractice({ seed = 21, bpm = 14, pos = [1.2, 0.4], noise = 0.3, seconds = 90, walkAt = 40 } = {}) {
  const s = new W.CsiSynth({ seed, bpm, pos, noise });
  const out = [];
  for (let i = 0; i < seconds * FS; i++) {
    if (walkAt != null && i === walkAt * FS) s.triggerWalker(6);
    out.push(s.step());
  }
  return out;
}

const stage = { wf: $('#ws-wf'), raw: $('#ws-raw'), band: $('#ws-band-sig'), spec: $('#ws-spec') };

function peaksOf(sig, fs) {
  const [lo, hi] = range(sig);
  const amp = Math.max(Math.abs(lo), Math.abs(hi));
  const out = [];
  const minGap = Math.round(1.5 * fs);
  for (let i = 1; i < sig.length - 1; i++) {
    if (sig[i] > sig[i - 1] && sig[i] >= sig[i + 1] && sig[i] > 0.25 * amp) {
      if (out.length && i - out[out.length - 1] < minGap) { if (sig[i] > sig[out[out.length - 1]]) out[out.length - 1] = i; } else out.push(i);
    }
  }
  return out;
}

function runDecode() {
  const frames = srcFrames();
  const a = W.analyze(frames, { window: dec.window, filter: dec.filter, sub: dec.best ? null : dec.sub });
  dec.last = a;
  drawDecode(a, frames);
}

function drawDecode(a, frames) {
  const out = ui('ws-readout'), conf = ui('ws-conf'), count = ui('ws-count');
  // waterfall
  if (stage.wf) {
    const { ctx, w, h } = fit(stage.wf, 0, 150);
    frameBox(ctx, w, h, '');
    if (a && !a.tooShort) {
      const cols = a.columns, n = cols[0].length;
      const off = document.createElement('canvas'); off.width = n; off.height = cols.length;
      const octx = off.getContext('2d'); const img = octx.createImageData(n, cols.length);
      // remove what every subcarrier shares (gain drift) so the per-subcarrier pattern shows
      const common = new Float64Array(n);
      for (let i = 0; i < n; i++) { let t = 0; for (let r = 0; r < cols.length; r++) t += cols[r][i]; common[i] = t / cols.length; }
      cols.forEach((c, r) => {
        let m = 0; for (let i = 0; i < n; i++) m += c[i] - common[i]; m /= n;
        for (let i = 0; i < n; i++) {
          const v = Math.max(-1, Math.min(1, (c[i] - common[i] - m) / 2.5));
          const px = (r * n + i) * 4;
          img.data[px] = v > 0 ? 255 : 255 + v * 215; img.data[px + 1] = 255 - Math.abs(v) * 190; img.data[px + 2] = v < 0 ? 255 : 255 - v * 215; img.data[px + 3] = 255;
        }
      });
      octx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, 0, 14, w - 10, h - 14);
      ctx.fillStyle = PAL.dim; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillStyle = '#e2e8f0'; ctx.fillText(w < 700 ? '52 subcarriers over time (red = above its average)' : '52 subcarriers (rows) over time, shared drift removed: red = stronger than its own average, blue = weaker', 8, 11);
      ctx.fillStyle = PAL.ok;
      const rowH = (h - 14) / cols.length;
      a.picks.forEach((p) => ctx.fillRect(w - 10, 14 + p * rowH, 10, Math.max(2, rowH)));
    }
  }
  const msg = (cv, text) => { const { ctx, w, h } = fit(cv, 0, 150); frameBox(ctx, w, h, ''); ctx.fillStyle = PAL.dim; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, w / 2, h / 2); };
  if (!a || a.tooShort) {
    const need = a && a.tooShort ? `Need about 12 s of data, have ${a.span.toFixed(0)} s.` : 'Waiting for data…';
    ['raw', 'band', 'spec'].forEach((k) => stage[k] && msg(stage[k], need));
    if (out) out.textContent = '–';
    if (conf) conf.textContent = need;
    if (count) count.textContent = '';
    return;
  }
  const n = a.raw.length;
  // raw
  if (stage.raw) {
    const { ctx, w, h } = fit(stage.raw, 0, 150);
    frameBox(ctx, w, h, w < 560 ? 'Step 1: raw, strongest subcarrier' : 'Step 1: raw amplitude, strongest subcarrier');
    plot(ctx, a.raw, 8, 22, w - 16, h - 30, { color: PAL.dim });
  }
  // band
  const pk = peaksOf(a.band, a.fs);
  if (stage.band) {
    const { ctx, w, h } = fit(stage.band, 0, 150);
    frameBox(ctx, w, h, dec.filter ? (w < 560 ? 'Step 2: band-passed, best six' : 'Step 2: after the band-pass and combining the best six') : (w < 560 ? 'Step 2: filter OFF' : 'Step 2: filter OFF, only the drift removed (look at that slow wave)'));
    const [lo, hi] = range(a.band);
    const m = Math.max(Math.abs(lo), Math.abs(hi), 1e-6);
    plot(ctx, a.band, 8, 22, w - 16, h - 30, { lo: -m, hi: m, color: PAL.accent });
    ctx.fillStyle = PAL.warm;
    pk.forEach((i) => { const x = 8 + (i / (n - 1)) * (w - 16); const y = 22 + (h - 30) - ((a.band[i] + m) / (2 * m)) * (h - 30); ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); });
  }
  // spectrum
  if (stage.spec) {
    const { ctx, w, h } = fit(stage.spec, 0, 170);
    frameBox(ctx, w, h, w < 560 ? 'Step 3: spectrum (x = breaths/min)' : 'Step 3: how strong is each rhythm?  (x = breaths per minute)');
    const f0 = a.spec.f[0], f1 = a.spec.f[a.spec.f.length - 1];
    const X = (f) => 8 + ((f - f0) / (f1 - f0)) * (w - 16);
    ctx.fillStyle = 'rgba(52,211,153,.10)'; ctx.fillRect(X(0.1), 20, X(0.6) - X(0.1), h - 44);
    const mx = Math.max(...a.spec.p);
    ctx.strokeStyle = PAL.accent; ctx.lineWidth = 1.8; ctx.beginPath();
    a.spec.p.forEach((p, i) => { const x = X(a.spec.f[i]), y = h - 24 - (p / mx) * (h - 52); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.stroke();
    ctx.fillStyle = PAL.dim; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    for (const bpm of [6, 12, 18, 24, 30, 36, 42]) { const x = X(bpm / 60); ctx.fillText(String(bpm), x, h - 8); ctx.fillRect(x, h - 24, 1, 4); }
    if (!dec.hidden) {
      const x = X(a.est.hz);
      ctx.strokeStyle = PAL.warm; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(x, 22); ctx.lineTo(x, h - 24); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = PAL.warm; ctx.textAlign = x > w - 90 ? 'right' : 'left'; ctx.font = '700 12px Inter, sans-serif';
      ctx.fillText(`${a.est.bpm.toFixed(1)}`, x + (x > w - 90 ? -6 : 6), 34);
    }
    ctx.fillStyle = 'rgba(52,211,153,.9)'; ctx.textAlign = 'left'; ctx.font = '11px Inter, sans-serif'; ctx.fillText('breathing band', X(0.1) + 4, h - 30 - 2);
  }
  const outOfRange = a.est.bpm < 6 || a.est.bpm > 36;
  const level = outOfRange || !dec.filter ? 'weak' : a.est.snr >= 60 ? 'strong' : a.est.snr >= 15 ? 'fair' : 'weak';
  if (out) out.textContent = dec.hidden ? '?' : `${a.est.bpm.toFixed(1)} breaths/min`;
  if (conf) {
    conf.textContent = dec.hidden ? 'Read the spectrum or count the gold dots, then enter your answer below.' : (outOfRange ? `The strongest detected rhythm is ${a.est.bpm.toFixed(1)} per minute, outside this lab's selected 6–36 range. Check the signal and reference count.` : !dec.filter ? 'A tall peak is not proof. With the filter off, slow drift can win.' : `Peak-to-median spectrum ratio: ${a.est.snr >= 100 ? '100+' : a.est.snr.toFixed(0)}× (${level}). This is a signal-strength clue, not a validated confidence score or proof of breathing.`);
    conf.dataset.level = level;
  }
  if (count) {
    if (pk.length >= 3) {
      const secs = (pk[pk.length - 1] - pk[0]) / a.fs;
      count.textContent = dec.hidden ? `Gold dots in the window: ${pk.length}. Window: ${a.span.toFixed(0)} s.` : `Counting the gold dots: ${pk.length} peaks over ${secs.toFixed(0)} s = ${(60 * (pk.length - 1) / secs).toFixed(1)} breaths/min.`;
    } else count.textContent = '';
  }
  const st = ui('ws-src-status');
  if (st && dec.src !== 'serial') {
    const dur = srcDuration();
    st.textContent = dec.src === 'room' ? `Live from the room lab above: ${frames.length} packets in memory.` : `${dec.frames[dec.src].length} packets, ${dur.toFixed(0)} s recording, playhead ${dec.ph.toFixed(0)} s.`;
  }
}

function setSource(src) {
  dec.src = src;
  $$('[data-ws-source]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.wsSource === src)));
  const rec = src === 'practice' || src === 'file';
  ui('ws-playbar').hidden = !rec;
  if (rec) { dec.ph = srcDuration(); const sl = ui('ws-ph'); sl.max = String(Math.max(1, Math.ceil(srcDuration()))); sl.value = String(Math.ceil(dec.ph)); }
  if (src !== 'practice') { dec.hidden = false; ui('ws-guess-row').hidden = true; }
  runDecode();
}

$$('[data-ws-source]').forEach((b) => b.addEventListener('click', () => {
  const s = b.dataset.wsSource;
  if (s === 'practice') {
    dec.frames.practice = buildPractice();
    dec.hidden = false;
  }
  if (s === 'file') { ui('ws-file').click(); return; }
  if (s === 'serial') { connectSerial(); return; }
  setSource(s);
}));
ui('ws-file')?.addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  const frames = W.parseCsv(await f.text());
  const st = ui('ws-src-status');
  if (frames.length < 40) { st.textContent = `That file has only ${frames.length} readable lines. Lines should look like C,seq,ms,rssi,a1…a52.`; return; }
  dec.frames.file = frames;
  setSource('file');
});
ui('ws-window')?.addEventListener('change', (e) => { dec.window = +e.target.value; runDecode(); });
ui('ws-filter')?.addEventListener('change', (e) => { dec.filter = e.target.checked; runDecode(); });
ui('ws-best')?.addEventListener('change', (e) => { dec.best = e.target.checked; ui('ws-pick-row').hidden = dec.best; runDecode(); });
ui('ws-pick')?.addEventListener('input', (e) => { dec.sub = +e.target.value; const k = W.SUB_K[dec.sub]; ui('ws-pick-v').textContent = `k = ${k > 0 ? '+' : ''}${k}`; runDecode(); });
ui('ws-ph')?.addEventListener('input', (e) => { dec.ph = +e.target.value; runDecode(); });
ui('ws-play')?.addEventListener('click', (e) => {
  dec.playing = !dec.playing;
  if (dec.playing && dec.ph >= srcDuration() - 0.5) dec.ph = 0;
  e.currentTarget.textContent = dec.playing ? '⏸ Pause' : '▶ Play';
});
ui('ws-save')?.addEventListener('click', () => {
  const frames = dec.src === 'room' ? roomFrames : dec.frames[dec.src];
  if (!frames.length) return;
  const blob = new Blob([W.framesToCsv(frames)], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `wifi-sensing-${dec.src}.csv`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});

/* mystery breather */
ui('ws-mystery')?.addEventListener('click', () => {
  const bpm = 8 + Math.floor(Math.random() * 23);
  const pos = clampPos(0.8 + Math.random() * 2.4, 0.4 + Math.random() * 1.6);
  dec.truth = bpm;
  dec.frames.practice = buildPractice({ seed: 100 + Math.floor(Math.random() * 900), bpm, pos, noise: 0.3 + Math.random() * 0.4, walkAt: null, seconds: 60 });
  dec.hidden = true;
  ui('ws-guess-row').hidden = false; ui('ws-guess').value = ''; ui('ws-guess-fb').textContent = '';
  setSource('practice');
  dec.hidden = true; runDecode();
});
ui('ws-guess-check')?.addEventListener('click', () => {
  const g = parseFloat(ui('ws-guess').value);
  const fb = ui('ws-guess-fb');
  if (!Number.isFinite(g)) { fb.textContent = 'Type a number of breaths per minute.'; fb.className = 'ws-fb err'; return; }
  const ok = Math.abs(g - dec.truth) <= 1.5;
  fb.textContent = ok ? `Yes. The hidden rate was ${dec.truth} breaths/min.` : `Not quite: you said ${g}; try the peak of the spectrum again. (Within 1.5 counts as right.)`;
  fb.className = 'ws-fb ' + (ok ? 'ok' : 'err');
  if (ok) { dec.hidden = false; runDecode(); }
});
ui('ws-reveal')?.addEventListener('click', () => {
  dec.hidden = false; runDecode();
  const fb = ui('ws-guess-fb'); fb.textContent = `Hidden rate: ${dec.truth} breaths/min. The machine said ${dec.last && dec.last.est ? dec.last.est.bpm.toFixed(1) : '?'}.`; fb.className = 'ws-fb ok';
});

/* ------------------------------------------------------------------ live ESP32 over Web Serial */

let serial = null;
const rate = { n: 0, t: 0, pps: 0, rssi: 0 };

async function connectSerial() {
  const st = ui('ws-src-status');
  if (!('serial' in navigator)) { st.textContent = 'This browser has no Web Serial. Use Chrome or Edge on a laptop (not Safari, Firefox or a phone), or save the Serial Monitor text to a file and use "My CSV file".'; return; }
  if (serial) { await disconnectSerial(); return; }
  try {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: +(ui('ws-baud')?.value || 921600) });
    dec.frames.serial = [];
    serial = { port, stop: false };
    setSource('serial');
    ui('ws-serial-btn').textContent = 'Disconnect ESP32';
    st.textContent = 'Connected. Waiting for packets… (is the sketch running and the ESP32 joined to your Wi-Fi?)';
    readLoop(serial);
  } catch (err) {
    st.textContent = `Could not open the port: ${err && err.message ? err.message : err}. Close the Arduino Serial Monitor first, then try again.`;
    serial = null;
  }
}
async function readLoop(s) {
  const decoder = new TextDecoderStream();
  const closed = s.port.readable.pipeTo(decoder.writable).catch(() => {});
  s.reader = decoder.readable.getReader();
  s.closed = closed;
  let buf = '';
  const frames = dec.frames.serial;
  try {
    while (!s.stop) {
      const { value, done } = await s.reader.read();
      if (done) break;
      buf += value;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        const fr = W.parseCsiLine(line);
        if (!fr) continue;
        if (frames.length && fr.t < frames[frames.length - 1].t) frames.length = 0; // board rebooted
        frames.push(fr);
        rate.n++; rate.rssi = fr.rssi;
        const t = frames[frames.length - 1].t;
        while (frames.length && t - frames[0].t > 120) frames.shift();
      }
    }
  } catch (err) { /* unplugged */ }
  if (serial === s) await disconnectSerial();
}
async function disconnectSerial() {
  const s = serial; if (!s) return;
  serial = null; s.stop = true;
  try { await s.reader?.cancel(); } catch (e) { /* ignore */ }
  try { await s.closed; } catch (e) { /* ignore */ }
  try { await s.port.close(); } catch (e) { /* ignore */ }
  ui('ws-serial-btn').textContent = 'Connect ESP32';
  ui('ws-src-status').textContent = 'Disconnected. The last packets stay on screen; press "Save recording" to keep them.';
}
ui('ws-serial-btn')?.addEventListener('click', () => connectSerial());
if (ui('ws-serial-btn') && !('serial' in navigator)) ui('ws-serial-note').hidden = false;

setInterval(() => {
  if (dec.src === 'serial' && serial) {
    const now = performance.now();
    rate.pps = rate.n / ((now - (rate.t || now - 1000)) / 1000); rate.n = 0; rate.t = now;
    const f = dec.frames.serial;
    ui('ws-src-status').textContent = f.length ? `Live: ${rate.pps.toFixed(0)} packets/s, RSSI ${rate.rssi} dBm, ${f.length} packets (${(f[f.length - 1].t - f[0].t).toFixed(0)} s) in memory.` : 'Connected. Waiting for packets…';
  }
}, 1000);

/* ------------------------------------------------------------------ main loops */

let acc = 0, lastT = performance.now(), lastDecode = 0;
function tick(now) {
  const dt = Math.min(0.25, (now - lastT) / 1000); lastT = now;
  if (!paused) {
    acc += dt;
    while (acc >= 1 / FS) { acc -= 1 / FS; roomFrames.push(synth.step()); if (roomFrames.length > ROOM_KEEP) roomFrames.shift(); }
  }
  if (dec.playing) {
    dec.ph += dt;
    if (dec.ph >= srcDuration()) { dec.ph = srcDuration(); dec.playing = false; ui('ws-play').textContent = '▶ Play'; }
    ui('ws-ph').value = String(Math.floor(dec.ph));
  }
  drawRoom(now); drawTrace(); drawPhasor();
  if (now - lastDecode > 450) { lastDecode = now; runDecode(); }
  requestAnimationFrame(tick);
}
// warm the buffer so the page opens with a breath already on screen
for (let i = 0; i < FS * 25; i++) roomFrames.push(synth.step());
refreshMap();
let started = false;
function start() { if (started) return; started = true; requestAnimationFrame((t) => { lastT = t; tick(t); }); }
start();
document.addEventListener('visibilitychange', () => { lastT = performance.now(); });
window.addEventListener('resize', () => { mapKey = ''; });

/* ------------------------------------------------------------------ recipe helpers and questions */

ui('ws-copy-fw')?.addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  try { await navigator.clipboard.writeText(ui('ws-firmware').textContent); btn.textContent = 'Copied ✓'; } catch (err) { btn.textContent = 'Select the code and copy it'; }
  setTimeout(() => { btn.textContent = 'Copy code'; }, 2000);
});

$$('.ws-q').forEach((q) => {
  const fb = q.querySelector('.ws-fb');
  q.querySelectorAll('button[data-v]').forEach((b) => b.addEventListener('click', () => {
    const ok = b.dataset.v === q.dataset.answer;
    fb.textContent = ok ? `Correct. ${q.dataset.explain}` : 'Not yet. Look back at the section above and try again.';
    fb.className = 'ws-fb ' + (ok ? 'ok' : 'err');
  }));
});

const predictFb = ui('ws-predict-fb');
$$('[data-pv]').forEach((b) => b.addEventListener('click', () => {
  const ok = b.dataset.pv === 'c';
  $$('[data-pv]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  predictFb.textContent = ok
    ? 'Yes. Centimetre moves change the reflected path by a good fraction of a 12 cm wavelength, so you pass through strong spots and blind spots. Now go and find them.'
    : 'Test it: drag the person a few centimetres at a time and watch the blue wave. Then come back and see if you would change your answer.';
  predictFb.className = 'ws-fb ' + (ok ? 'ok' : 'err');
}));

window.__wifiSensing = { synth, dec, W, roomFrames }; // for the browser check
