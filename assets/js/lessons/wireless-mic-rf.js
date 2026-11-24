import {
  BAND, GRID, tvChannelEdge, tvChannelOf, wavelengthM, productCounts, products, analyze,
  freeRanges, coordinate, GOLOMB, PRESETS,
} from '../wireless-rf-core.mjs';

const Synth = window.AudioLabSynth;
const SK = window.SimKit;
const $ = (id) => document.getElementById(id);

let C = {
  teal: '#5ad1c7',
  red: '#ff6b57',
  orange: '#f6a553',
  grid: 'rgba(150,200,196,0.14)',
  text: '#bfd2d2',
  tv: '#263036',
  tvLine: '#6a7478',
  amber: '#f6c453',
};

function syncThemeColors() {
  if (!SK || !SK.theme) return;
  const tc = SK.theme.colors();
  if (tc && tc.bad) C.red = tc.bad;
}
syncThemeColors();

/* ── 1 · Wavelength Calculator ───────────────────────────────────────────── */
(function () {
  const s = $('s-freq');
  if (!s) return;
  function update() {
    const f = +s.value, lam = wavelengthM(f);
    $('v-freq').textContent = f + ' MHz';
    $('o-lambda').textContent = lam >= 1 ? lam.toFixed(2) + ' m' : (lam * 100).toFixed(1) + ' cm';
    const q = lam / 4;
    $('o-quarter').textContent = q >= 1 ? q.toFixed(2) + ' m' : (q * 100).toFixed(1) + ' cm';
    const ch = tvChannelOf(f);
    $('o-tv').textContent = ch ? 'ch ' + ch : '—';
    $('o-note').textContent = ch
      ? 'Sits in US TV channel ' + ch + ' (' + tvChannelEdge(ch) + '–' + (tvChannelEdge(ch) + 6) + ' MHz). Mics here must clear occupied stations.'
      : f < 470 ? 'Below UHF TV band — longer waves need longer whips (e.g., FM radio).'
      : f > 608 && f < 1000 ? '900 MHz unlicensed ISM band, shared with industrial & home links.'
      : f >= 2300 ? '2.4 GHz band: tiny antennas, shared with dense Wi-Fi and Bluetooth traffic.'
      : 'Outside US UHF TV mic band (470–608 MHz).';
  }
  s.addEventListener('input', update);
  document.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { s.value = b.dataset.f; update(); }));
  update();
})();

/* ── 2 · Interactive RF Coordinator State ────────────────────────────────── */
const st = {
  n: 4,
  freqs: [500, 500.5, 501, 501.5, 502, 502.5, 503, 503.5],
  sel: 0,
  clearance: 0.25,
  preset: 'empty',
  start: 498,
  width: 12,
};
const snap = (f) => Math.min(BAND.hi - 0.1, Math.max(BAND.lo + 0.1, Math.round(f / GRID) * GRID));
const minSpacing = () => st.clearance;
const active = () => st.freqs.slice(0, st.n);
const blocked = () => PRESETS[st.preset].blocked;
const fmt = (f) => f.toFixed(3);

let analysis = null;
const specC = SK.canvas2d($('spec'), { box: $('spec-box'), onResize: drawAll });
const overC = SK.canvas2d($('over'), { box: $('over-box'), onResize: drawAll });
const scaleC = SK.canvas2d($('scale'), { box: $('scale-box'), onResize: drawAll });

if (SK && SK.theme && SK.theme.onChange) {
  SK.theme.onChange(() => { syncThemeColors(); drawAll(); });
}

function clampWindow() {
  st.start = Math.max(BAND.lo, Math.min(BAND.hi - st.width, st.start));
}
function centerOn(f) { st.start = f - st.width / 2; clampWindow(); }

function recompute() {
  const f = active();
  analysis = analyze(f, { clearance: st.clearance, minSpacing: minSpacing() });
  analysis.inTv = [];
  f.forEach((hz, i) => {
    const ch = tvChannelOf(hz);
    if (ch && blocked().includes(ch)) analysis.inTv.push({ mic: i, ch });
  });
  // Unified troubled set across IMD victims AND TV collisions (no double counting or teal TV bugs!)
  analysis.troubled = new Set(analysis.victims);
  analysis.inTv.forEach((t) => analysis.troubled.add(t.mic));
  analysis.products = products(f);
}

function niceStep(width) { return width <= 6 ? 0.5 : width <= 12 ? 1 : width <= 24 ? 2 : 6; }

function drawSpectrum() {
  const { ctx, width: W, height: H } = specC;
  if (!W || !H) return;
  ctx.clearRect(0, 0, W, H);
  const padL = 10, padR = 10, top = 30, axisY = H - 24;
  const x = (f) => padL + ((f - st.start) / st.width) * (W - padL - padR);
  const lo = st.start, hi = st.start + st.width;

  // TV channels
  ctx.save();
  for (let ch = 14; ch <= 36; ch++) {
    const a = tvChannelEdge(ch), b = a + 6;
    if (b < lo || a > hi) continue;
    const x0 = x(Math.max(a, lo)), x1 = x(Math.min(b, hi));
    if (blocked().includes(ch)) {
      ctx.fillStyle = C.tv;
      ctx.fillRect(x0, 0, x1 - x0, axisY);
      ctx.strokeStyle = 'rgba(130,145,150,0.35)';
      ctx.lineWidth = 1;
      for (let k = x0 - axisY; k < x1; k += 9) {
        ctx.beginPath(); ctx.moveTo(k, axisY); ctx.lineTo(k + axisY, 0); ctx.stroke();
      }
      ctx.save();
      ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, axisY); ctx.clip();
      ctx.fillStyle = C.text;
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('TV ' + ch, x0 + 6, 15);
      ctx.restore();
    }
    ctx.strokeStyle = C.tvLine;
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(x0, axisY); ctx.lineTo(x0, axisY + 5); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // Grid + axis
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillStyle = C.text;
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 1;
  const step = niceStep(st.width);
  for (let f = Math.ceil(lo / step) * step; f <= hi + 1e-9; f += step) {
    const px = x(f);
    ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px, axisY); ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillText(f.toFixed(step < 1 ? 1 : 0), px, axisY + 13);
  }
  ctx.textAlign = 'right';
  ctx.fillText('MHz', W - 4, axisY + 22);
  ctx.strokeStyle = C.tvLine;
  ctx.beginPath(); ctx.moveTo(padL, axisY); ctx.lineTo(W - padR, axisY); ctx.stroke();

  const f = active();
  const troubled = analysis.troubled;

  // Non-hit IMD ticks
  const prodH = 42;
  analysis.products.forEach((p) => {
    if (p.f < lo || p.f > hi) return;
    const isHit = analysis.hits.some((h) => h.from.join() === p.from.join() && h.kind === p.kind);
    if (isHit) return;
    ctx.strokeStyle = 'rgba(246,165,83,0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x(p.f), axisY); ctx.lineTo(x(p.f), axisY - prodH); ctx.stroke();
  });

  // Arcs linking source carriers h.from to their hitting IMD tick
  const barTop = top + 16;
  analysis.hits.slice(0, 6).forEach((h) => {
    if (h.f < lo || h.f > hi) return;
    const hitX = x(h.f);
    const hitY = axisY - prodH - 9;
    h.from.forEach((srcIdx) => {
      const sf = f[srcIdx];
      if (sf < lo - st.clearance || sf > hi + st.clearance) return;
      const sx = x(sf);
      ctx.save();
      ctx.strokeStyle = h.victim === st.sel ? 'rgba(255,107,87,0.72)' : 'rgba(246,165,83,0.34)';
      ctx.lineWidth = h.victim === st.sel ? 1.5 : 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(sx, barTop + 8);
      ctx.quadraticCurveTo((sx + hitX) / 2, barTop + 34, hitX, hitY);
      ctx.stroke();
      ctx.restore();
    });
  });

  // Carriers
  f.forEach((hz, i) => {
    if (hz < lo - st.clearance || hz > hi + st.clearance) return;
    const px = x(hz), bad = troubled.has(i), sel = i === st.sel;
    const w = (st.clearance * 2 / st.width) * (W - padL - padR);
    ctx.fillStyle = bad ? 'rgba(255,107,87,0.16)' : 'rgba(90,209,199,0.12)';
    ctx.fillRect(px - w / 2, barTop - 5, w, axisY - barTop + 5);
    ctx.strokeStyle = bad ? C.red : C.teal;
    ctx.lineWidth = sel ? 4 : 2.5;
    ctx.beginPath(); ctx.moveTo(px, axisY); ctx.lineTo(px, barTop); ctx.stroke();
    ctx.fillStyle = bad ? C.red : C.teal;
    ctx.beginPath(); ctx.arc(px, barTop, sel ? 10 : 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#041512';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), px, barTop + 3.5);
    if (sel) {
      ctx.strokeStyle = C.amber;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, barTop, 14, 0, Math.PI * 2); ctx.stroke();
    }
  });

  // Collision markers on top
  analysis.hits.forEach((h) => {
    if (h.f < lo || h.f > hi) return;
    ctx.strokeStyle = C.red;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x(h.f), axisY); ctx.lineTo(x(h.f), axisY - prodH - 9); ctx.stroke();
    ctx.fillStyle = C.red;
    ctx.beginPath(); ctx.arc(x(h.f), axisY - prodH - 9, 3.5, 0, Math.PI * 2); ctx.fill();
  });

  // Clear rounded pill badge top-right (never collides with hatched TV labels on the left)
  const badge = 'Window ' + lo.toFixed(1) + '–' + hi.toFixed(1) + ' MHz · ' + ((hi - lo) / 6).toFixed(1).replace(/\.0$/, '') + ' TV ch';
  ctx.font = '600 10.5px system-ui, sans-serif';
  const bw = ctx.measureText(badge).width + 14;
  ctx.fillStyle = 'rgba(6, 10, 12, 0.86)';
  ctx.fillRect(W - padR - bw, 5, bw, 18);
  ctx.fillStyle = '#d4e4e4';
  ctx.textAlign = 'right';
  ctx.fillText(badge, W - padR - 6, 17);

  specC.map = { x, padL, padR, W };
}

function drawOverview() {
  const { ctx, width: W, height: H } = overC;
  if (!W || !H) return;
  ctx.clearRect(0, 0, W, H);
  const x = (f) => 6 + ((f - BAND.lo) / (BAND.hi - BAND.lo)) * (W - 12);
  const base = H - 14;
  for (let ch = 14; ch <= 36; ch++) {
    const a = tvChannelEdge(ch), x0 = x(a), x1 = x(a + 6);
    ctx.fillStyle = blocked().includes(ch) ? C.tv : 'rgba(90,209,199,0.06)';
    ctx.fillRect(x0 + 0.5, 4, x1 - x0 - 1, base - 4);
    if (blocked().includes(ch)) {
      ctx.fillStyle = C.text;
      ctx.font = '9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ch, (x0 + x1) / 2, 15);
    }
  }
  const troubled = analysis.troubled;
  active().forEach((hz, i) => {
    ctx.strokeStyle = troubled.has(i) ? C.red : C.teal;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x(hz), base); ctx.lineTo(x(hz), 18); ctx.stroke();
  });
  ctx.strokeStyle = C.amber;
  ctx.lineWidth = 2;
  ctx.strokeRect(x(st.start), 2, x(st.start + st.width) - x(st.start), base - 1);
  ctx.fillStyle = C.text;
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('470', 4, H - 2);
  ctx.textAlign = 'right';
  ctx.fillText('608 MHz', W - 4, H - 2);
  overC.map = { x };
}

function ordinal(p) {
  const n = (k) => 'Mic ' + (k + 1);
  return p.kind === 2 ? '2×' + n(p.from[0]) + ' − ' + n(p.from[1]) : n(p.from[0]) + ' + ' + n(p.from[1]) + ' − ' + n(p.from[2]);
}

/* ── Live Selected-Mic RF Squelch Audio ──────────────────────────────────── */
let rfActx = null, rfGraph = null, rfListenOn = false;

function ensureRfAudio() {
  if (!rfActx) rfActx = Synth ? Synth.createContext() : new (window.AudioContext || window.webkitAudioContext)();
  if (rfActx.state === 'suspended') rfActx.resume();
  if (rfGraph || !Synth) return;

  const voxSrc = rfActx.createBufferSource();
  voxSrc.buffer = Synth.createVocalPhraseBuffer(rfActx, { seconds: 2.4 });
  voxSrc.loop = true;

  const noiseSrc = rfActx.createBufferSource();
  noiseSrc.buffer = Synth.createNoiseBuffer(rfActx, 2.4, 'white', 77);
  noiseSrc.loop = true;

  // Choppy FM squelch flutter LFO for dropouts when mic hits TV or IMD
  const sqLfo = rfActx.createOscillator();
  sqLfo.type = 'square';
  sqLfo.frequency.value = 6.5;
  const sqDepth = rfActx.createGain();
  sqDepth.gain.value = 0;

  const bp = rfActx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2600;
  bp.Q.value = 1.4;

  const voxGain = rfActx.createGain();
  const noiseGain = rfActx.createGain();
  const master = rfActx.createGain();
  master.gain.value = 0;

  voxSrc.connect(voxGain).connect(master);
  noiseSrc.connect(bp).connect(noiseGain).connect(master);
  sqLfo.connect(sqDepth).connect(noiseGain.gain);
  master.connect(rfActx.destination);

  voxSrc.start();
  noiseSrc.start();
  sqLfo.start();
  rfGraph = { voxGain, noiseGain, sqDepth, master };
}

function updateRfAudio() {
  if (!rfGraph || !rfActx || !analysis) return;
  if (!rfListenOn) {
    Synth.smooth(rfGraph.master.gain, 0, rfActx, 0.02);
    return;
  }
  const hasTrouble = analysis.troubled.has(st.sel);
  Synth.smooth(rfGraph.master.gain, 0.45, rfActx, 0.02);
  Synth.smooth(rfGraph.voxGain.gain, hasTrouble ? 0.25 : 0.72, rfActx, 0.02);
  Synth.smooth(rfGraph.noiseGain.gain, hasTrouble ? 0.28 : 0, rfActx, 0.02);
  Synth.smooth(rfGraph.sqDepth.gain, hasTrouble ? 0.22 : 0, rfActx, 0.02);
}

const listenBtn = $('b-listen');
if (listenBtn) {
  listenBtn.addEventListener('click', () => {
    if (!rfListenOn) ensureRfAudio();
    rfListenOn = !rfListenOn;
    listenBtn.setAttribute('aria-pressed', String(rfListenOn));
    listenBtn.textContent = rfListenOn ? '🔇 Stop Mic ' + (st.sel + 1) : '🔊 Listen to Selected Mic';
    updateRfAudio();
  });
}

function updateReadout() {
  const f = active(), pc = productCounts(f.length);
  $('o-prod').textContent = pc.total;
  $('o-hits').textContent = analysis.hits.length + analysis.close.length + analysis.inTv.length;
  $('o-span').textContent = f.length > 1 ? (Math.max(...f) - Math.min(...f)).toFixed(2) + ' MHz' : '—';
  $('v-n').textContent = st.n;
  $('v-clear').textContent = st.clearance.toFixed(2) + ' MHz';
  $('v-wid').textContent = st.width + ' MHz';

  const v = $('verdict'), list = $('issues');
  list.innerHTML = '';
  const troubled = analysis.troubled;
  if (troubled.size === 0 && analysis.clean) {
    v.className = 'rf-verdict good';
    v.textContent = f.length === 1 ? 'Single carrier clear of blocked TV stations.' : '✔ Clean coordination across all ' + f.length + ' mics (' + pc.total + ' IMD products checked).';
  } else {
    v.className = 'rf-verdict bad';
    const k = troubled.size;
    v.textContent = '✘ ' + k + ' mic' + (k === 1 ? ' is' : 's are') + ' colliding (IMD or TV channel). Drag red markers or click Auto-coordinate.';
    const seen = new Set();
    analysis.hits.slice(0, 40).forEach((h) => {
      const key = h.victim + ordinal(h);
      if (seen.has(key) || seen.size >= 3) return;
      seen.add(key);
      const li = document.createElement('li');
      li.textContent = 'Mic ' + (h.victim + 1) + ' (' + fmt(f[h.victim]) + ') hit by ' + ordinal(h) + ' = ' + fmt(h.f);
      list.appendChild(li);
    });
    analysis.close.slice(0, 2).forEach(([a, b]) => {
      const li = document.createElement('li');
      li.textContent = 'Mics ' + (a + 1) + ' & ' + (b + 1) + ' only ' + Math.abs(f[a] - f[b]).toFixed(3) + ' MHz apart.';
      list.appendChild(li);
    });
    analysis.inTv.slice(0, 2).forEach((t) => {
      const li = document.createElement('li');
      li.textContent = 'Mic ' + (t.mic + 1) + ' overlaps active TV ch ' + t.ch + '.';
      list.appendChild(li);
    });
  }

  const chips = $('chips');
  chips.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (i >= st.n ? ' off' : '') + (troubled.has(i) && i < st.n ? ' bad' : '');
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', i === st.sel ? 'true' : 'false');
    b.disabled = i >= st.n;
    b.textContent = (i + 1) + ' · ' + (i < st.n ? st.freqs[i].toFixed(3) : '—');
    b.addEventListener('click', () => { st.sel = i; centerOnIfOut(st.freqs[i]); render(); });
    chips.appendChild(b);
  }
  $('n-freq').value = st.freqs[st.sel].toFixed(3);
  if (listenBtn && rfListenOn) listenBtn.textContent = '🔇 Stop Mic ' + (st.sel + 1);
  updateRfAudio();
}

function centerOnIfOut(f) {
  if (f < st.start + 0.2 || f > st.start + st.width - 0.2) centerOn(f);
}

function drawAll() { if (analysis) { drawSpectrum(); drawOverview(); drawScale(); } }
function render() { recompute(); updateReadout(); drawAll(); }
function setFreq(i, f) { st.freqs[i] = +snap(f).toFixed(3); }

/* Drag & keyboard tuning on spectrum canvas */
(function () {
  const cv = $('spec');
  let drag = -1;
  const toF = (ev) => {
    const r = cv.getBoundingClientRect(), m = specC.map;
    const px = ev.clientX - r.left;
    return st.start + ((px - m.padL) / (r.width - m.padL - m.padR)) * st.width;
  };
  const hit = (ev) => {
    const r = cv.getBoundingClientRect(), m = specC.map;
    const px = ev.clientX - r.left;
    let best = -1, bd = 22;
    active().forEach((hz, i) => {
      const d = Math.abs(m.x(hz) - px);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  };
  cv.addEventListener('pointerdown', (ev) => {
    const i = hit(ev);
    if (i < 0) return;
    drag = i;
    st.sel = i;
    cv.setPointerCapture(ev.pointerId);
    cv.focus({ preventScroll: true });
    render();
  });
  cv.addEventListener('pointermove', (ev) => {
    if (drag < 0) return;
    setFreq(drag, toF(ev));
    render();
  });
  const end = () => { drag = -1; };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
  cv.addEventListener('keydown', (ev) => {
    const big = ev.shiftKey ? 10 : 1;
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
      ev.preventDefault();
      setFreq(st.sel, st.freqs[st.sel] + (ev.key === 'ArrowRight' ? 1 : -1) * GRID * big);
      centerOnIfOut(st.freqs[st.sel]);
      render();
    } else if (/^[1-8]$/.test(ev.key) && +ev.key <= st.n) {
      st.sel = +ev.key - 1;
      centerOnIfOut(st.freqs[st.sel]);
      render();
    }
  });

  const ov = $('over');
  const moveWin = (ev) => {
    const r = ov.getBoundingClientRect();
    const f = BAND.lo + ((ev.clientX - r.left - 6) / (r.width - 12)) * (BAND.hi - BAND.lo);
    centerOn(f);
    drawAll();
  };
  let od = false;
  ov.addEventListener('pointerdown', (ev) => { od = true; ov.setPointerCapture(ev.pointerId); moveWin(ev); });
  ov.addEventListener('pointermove', (ev) => { if (od) moveWin(ev); });
  ov.addEventListener('pointerup', () => { od = false; });
  ov.addEventListener('pointercancel', () => { od = false; });
})();

/* Controls & Presets */
$('s-n').addEventListener('input', (e) => {
  st.n = +e.target.value;
  if (st.sel >= st.n) st.sel = st.n - 1;
  renderGolomb();
  render();
});
$('s-clear').addEventListener('input', (e) => { st.clearance = +e.target.value; render(); renderGolomb(); });
$('s-wid').addEventListener('input', (e) => { st.width = +e.target.value; clampWindow(); render(); });
$('s-tv').addEventListener('change', (e) => { st.preset = e.target.value; render(); });
$('n-freq').addEventListener('change', (e) => {
  const v = parseFloat(e.target.value);
  if (!isNaN(v)) { setFreq(st.sel, v); centerOnIfOut(st.freqs[st.sel]); render(); }
});
$('b-minus').addEventListener('click', () => { setFreq(st.sel, st.freqs[st.sel] - GRID); centerOnIfOut(st.freqs[st.sel]); render(); });
$('b-plus').addEventListener('click', () => { setFreq(st.sel, st.freqs[st.sel] + GRID); centerOnIfOut(st.freqs[st.sel]); render(); });

Object.entries(PRESETS).forEach(([k, p]) => {
  const o = document.createElement('option');
  o.value = k;
  o.textContent = p.label;
  $('s-tv').appendChild(o);
});

function placeAll(arr, note) {
  arr.forEach((f, i) => { st.freqs[i] = +snap(f).toFixed(3); });
  const span = arr.length > 1 ? Math.max(...arr) - Math.min(...arr) : 0;
  // Auto-expand zoom window when coordinated span exceeds current width
  if (span > st.width - 1.5) {
    const needed = Math.min(48, Math.ceil((span + 2) / 6) * 6);
    st.width = Math.max(st.width, needed);
    $('s-wid').value = String(st.width);
  }
  centerOn((Math.min(...arr) + Math.max(...arr)) / 2);
  render();
  if (note) $('verdict').textContent += ' ' + note;
}

$('b-auto').addEventListener('click', () => {
  const r = coordinate(st.n, freeRanges(blocked()), { clearance: st.clearance, minSpacing: minSpacing() });
  if (r.ok) placeAll(r.freqs, 'Cleanly placed lowest-first across free TV gaps.');
  else {
    render();
    $('verdict').className = 'rf-verdict bad';
    $('verdict').textContent = 'No collision-free layout fits in remaining gaps — reduce mic count, clearance, or TV blockers.';
  }
});
$('b-even').addEventListener('click', () => {
  const c = st.start + st.width / 2, step = 0.5;
  placeAll(Array.from({ length: st.n }, (_, i) => c + (i - (st.n - 1) / 2) * step), 'Equal spacing forces IMD collisions!');
});
$('b-golomb').addEventListener('click', () => {
  const g = st.n === 1 ? [0] : GOLOMB[st.n];
  const span = g[g.length - 1] * st.clearance;
  const room = freeRanges(blocked()).find(([a, b]) => b - a - 0.2 >= span);
  const base = room ? room[0] + 0.1 : Math.min(st.start + 0.2, BAND.hi - 0.1 - span);
  placeAll(g.map((m) => base + m * st.clearance), room ? 'Golomb ruler: every pair difference is unique.' : 'Span exceeds open TV stretch — crosses an active station.');
});
$('b-rand').addEventListener('click', () => {
  const lo = st.start + 0.2, hi = st.start + st.width - 0.2;
  placeAll(Array.from({ length: st.n }, () => lo + Math.random() * (hi - lo)));
});

/* ── 3 · Scaling Chart ───────────────────────────────────────────────────── */
function drawScale() {
  const { ctx, width: W, height: H } = scaleC;
  if (!W || !H) return;
  ctx.clearRect(0, 0, W, H);
  const padL = 36, padB = 22, padT = 14, padR = 8, N = 16;
  const maxV = productCounts(N).total;
  const bw = (W - padL - padR) / N;
  const y = (v) => padT + (1 - v / maxV) * (H - padT - padB);
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillStyle = C.text;
  ctx.strokeStyle = C.grid;
  ctx.textAlign = 'right';
  [0, 500, 1000, 1500, 2000].forEach((v) => {
    if (v > maxV) return;
    ctx.beginPath(); ctx.moveTo(padL, y(v)); ctx.lineTo(W - padR, y(v)); ctx.stroke();
    ctx.fillText(v, padL - 4, y(v) + 3);
  });
  const sel = +$('s-count').value;
  for (let n = 1; n <= N; n++) {
    const c = productCounts(n), x0 = padL + (n - 1) * bw + 2, w = bw - 4;
    ctx.fillStyle = n === sel ? C.amber : C.orange;
    ctx.globalAlpha = n === sel ? 1 : 0.72;
    ctx.fillRect(x0, y(c.two), w, y(0) - y(c.two));
    ctx.fillStyle = n === sel ? '#fff' : C.teal;
    ctx.fillRect(x0, y(c.total), w, y(c.two) - y(c.total));
    ctx.globalAlpha = 1;
    ctx.fillStyle = n === sel ? '#fff' : C.text;
    ctx.textAlign = 'center';
    ctx.fillText(n, x0 + w / 2, H - 7);
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = C.orange;
  ctx.fillText('■ 2fa − fb', padL + 6, padT + 8);
  ctx.fillStyle = C.teal;
  ctx.fillText('■ fa + fb − fc', padL + 78, padT + 8);
}

function updateCount() {
  const n = +$('s-count').value, c = productCounts(n);
  $('v-count').textContent = n;
  $('o-count').innerHTML = '<strong>' + n + ' mic' + (n === 1 ? '' : 's') + '</strong> generate ' + c.two + ' two-carrier + ' + c.three + ' three-carrier products = <strong>' + c.total + '</strong> third-order hazards.';
  drawScale();
}
$('s-count').addEventListener('input', updateCount);

/* ── 4 · Golomb Table (tracks st.n dynamically!) ─────────────────────────── */
function renderGolomb() {
  const tb = document.querySelector('#golomb-table tbody');
  if (!tb) return;
  tb.innerHTML = '';
  for (let n = 2; n <= 10; n++) {
    const marks = GOLOMB[n], span = marks[marks.length - 1] * st.clearance;
    const tr = document.createElement('tr');
    if (n === st.n) tr.className = 'me';
    tr.innerHTML = '<td>' + n + '</td><td>' + marks.join(', ') + '</td><td>' + span.toFixed(2) + ' MHz</td><td>' + (span / 6).toFixed(2) + '</td>';
    tb.appendChild(tr);
  }
}

/* ── 5 · Performer B Line-of-Sight Toggle on Section 4 Antenna SVG ────────── */
const perfBtn = $('b-perf-b');
if (perfBtn) {
  let blockedB = true;
  const syncPerfB = () => {
    const group = $('svg-perf-b'), path = $('svg-path-b'), xMark = $('svg-blocked-x'), label = $('svg-label-b');
    if (blockedB) {
      if (group) group.setAttribute('transform', 'translate(0, 0)');
      if (path) {
        path.setAttribute('d', 'M90 190 L330 330');
        path.setAttribute('stroke', '#ff6b57');
        path.setAttribute('stroke-dasharray', '9 7');
      }
      if (xMark) xMark.style.display = '';
      if (label) label.textContent = 'behind metal set piece (dropouts)';
      perfBtn.textContent = 'Move Performer B Clear of Set';
      perfBtn.setAttribute('aria-pressed', 'false');
    } else {
      if (group) group.setAttribute('transform', 'translate(135, 35)');
      if (path) {
        path.setAttribute('d', 'M225 225 L330 330');
        path.setAttribute('stroke', '#5ad1c7');
        path.removeAttribute('stroke-dasharray');
      }
      if (xMark) xMark.style.display = 'none';
      if (label) label.textContent = 'clear sightline to FOH antennas';
      perfBtn.textContent = 'Place Performer B Behind Set';
      perfBtn.setAttribute('aria-pressed', 'true');
    }
  };
  perfBtn.addEventListener('click', () => { blockedB = !blockedB; syncPerfB(); });
  syncPerfB();
}

/* ── 6 · Check Yourself Quiz (with Reset) ────────────────────────────────── */
const QUIZ = [
  { q: 'Why is a bodypack’s UHF whip antenna roughly 15 cm long?', o: ['It equals one quarter of a ~60 cm UHF wavelength around 500 MHz.', 'Taller whips violate venue ceiling codes.', 'It improves battery efficiency in the pack.'], a: 0, why: 'λ = c / f ≈ 0.60 m at 500 MHz, giving a compact 15 cm quarter-wave whip.' },
  { q: 'You put 8 mics on 8 distinct frequencies, yet Channel 3 still cracks and hisses. Likeliest cause?', o: ['Batteries run faster on Channel 3.', 'Third-order intermodulation products (2f₁ − f₂ / f₁ + f₂ − f₃) landed on Channel 3.', 'Digital desks limit rigs to 4 mics.'], a: 1, why: 'Nonlinear RF stages mix transmitters into new third-order frequencies that jam uncoordinated neighbors.' },
  { q: 'Mics sit on 500.0, 500.5, and 501.0 MHz. Which IMD product jams 501.0 MHz?', o: ['2(500.5) − 500.0 = 501.0 MHz', '500.5 ÷ 2 = 250.25 MHz', '500.0 + 501.0 = 1001 MHz'], a: 0, why: 'Uniformly spaced channels guarantee that 2f₂ − f₁ falls straight onto the third carrier.' },
  { q: 'How many total 3rd-order products (2-carrier + 3-carrier) do 8 mics create?', o: ['16', '56', '224'], a: 2, why: '8×7 = 56 two-carrier plus 8×7×6÷2 = 168 three-carrier products = 224 potential hits.' },
  { q: 'What mathematical property keeps a layout free of 3rd-order IMD collisions?', o: ['All carriers must sit in one TV channel.', 'Every frequency spacing between pairs of mics is unique (a Golomb ruler).', 'All frequencies must be integer MHz.'], a: 1, why: 'Unique pair differences ensure neither 2f₁−f₂ nor f₁+f₂−f₃ equals any other carrier.' },
  { q: 'Rehearsal in an empty hall was clean, but opening night broke up. What changed?', o: ['Room acoustics shifted frequency.', 'New local RF (wireless IEMs, DMX lighting, cameras, active TV) arrived on stage.', 'Mic whips shrink when cooled.'], a: 1, why: 'Always scan at the show venue with lighting walls, IEMs, and broadcast trucks powered on.' },
  { q: 'Where should dual diversity receiver antennas be placed?', o: ['Inside the sealed steel rack beside power amps.', 'Elevated with clear line of sight to stage, spaced neatly via antenna distribution.', 'Flat underneath the apron risers.'], a: 1, why: 'Human bodies, steel scenery, and walls shield UHF; high line-of-sight placement stops dropouts.' },
];

(function () {
  let i = 0, score = 0, answered = false, done = false;
  const q = $('quiz-q'), opts = $('quiz-opts'), why = $('quiz-why'), next = $('quiz-next'), sc = $('quiz-score'), rst = $('quiz-reset');
  function show() {
    answered = false;
    why.textContent = '';
    next.hidden = true;
    const item = QUIZ[i];
    q.textContent = (i + 1) + ' / ' + QUIZ.length + ' · ' + item.q;
    opts.innerHTML = '';
    item.o.forEach((t, k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'quiz-opt';
      b.textContent = t;
      b.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const ok = k === item.a;
        if (ok) score++;
        b.classList.add(ok ? 'right' : 'wrong');
        if (!ok) opts.children[item.a].classList.add('right');
        Array.from(opts.children).forEach((c) => { c.disabled = true; });
        why.textContent = (ok ? '✔ ' : '✘ ') + item.why;
        sc.textContent = 'Score: ' + score + ' / ' + (i + 1);
        next.textContent = i === QUIZ.length - 1 ? 'See result' : 'Next question →';
        next.hidden = false;
      });
      opts.appendChild(b);
    });
  }
  next.addEventListener('click', () => {
    if (done) { i = 0; score = 0; done = false; sc.textContent = ''; show(); return; }
    if (i < QUIZ.length - 1) { i++; show(); return; }
    done = true;
    q.textContent = 'Finished: ' + score + ' / ' + QUIZ.length + (score === QUIZ.length ? ' — Clean coordination!' : ' — Review the Golomb & antenna sections and retry.');
    opts.innerHTML = '';
    why.textContent = '';
    next.textContent = 'Try again';
  });
  if (rst) {
    rst.addEventListener('click', () => { i = 0; score = 0; done = false; sc.textContent = ''; show(); });
  }
  show();
})();

centerOn(501.25);
renderGolomb();
updateCount();
render();
