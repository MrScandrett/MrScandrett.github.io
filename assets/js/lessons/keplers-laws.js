(() => {
  'use strict';

  if (!window.SimKit) return;

  /* ── Sim 1: Exact Kepler's Equation + True Equal-Area Sweeps ─────────────── */
  const kepCanvas = document.getElementById('kepCanvas');
  const eccSl = document.getElementById('eccSl');
  const spdSl = document.getElementById('spdSl');
  const eccLbl = document.getElementById('eccLabel');
  const spdLbl = document.getElementById('spdLabel');
  const areaToggle = document.getElementById('areaToggle');
  const playPauseBtn = document.getElementById('playPauseBtn');

  const eccVal = document.getElementById('eccVal');
  const speedVal = document.getElementById('speedVal');
  const distVal = document.getElementById('distVal');
  const periAphVal = document.getElementById('periAphVal');
  const wedgeAreaVal = document.getElementById('wedgeAreaVal');

  const ORBIT_PRESETS = {
    mercury: { e: 0.206, a: 0.387, name: 'Mercury' },
    earth: { e: 0.017, a: 1.000, name: 'Earth' },
    mars: { e: 0.093, a: 1.524, name: 'Mars' },
    pluto: { e: 0.249, a: 39.48, name: 'Pluto' },
    comet: { e: 0.78, a: 5.00, name: 'Comet' }
  };

  const sim1 = {
    e: Number(eccSl.value) || 0.5,
    aAU: 1.0,
    speed: Number(spdSl.value) || 1.0,
    showAreas: true,
    playing: true,
    M: 0,
    lastBin: 0,
    wedges: [] // each wedge = { points: [{xNorm, yNorm}], label }
  };

  function solveKepler(M, e) {
    let E = M + e * Math.sin(M);
    for (let k = 0; k < 6; k++) {
      E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }
    return E;
  }

  function ellipseNormPoint(E, e) {
    // Normalized in semi-major axis units (a = 1), focus at origin (0, 0)
    const x = Math.cos(E) - e;
    const y = Math.sqrt(1 - e * e) * Math.sin(E);
    return { x, y };
  }

  function buildBinWedge(binIdx, e) {
    const N = 12;
    const m0 = (binIdx / N) * Math.PI * 2;
    const m1 = ((binIdx + 1) / N) * Math.PI * 2;
    const pts = [];
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const m = m0 + (m1 - m0) * (i / steps);
      const E = solveKepler(m, e);
      pts.push(ellipseNormPoint(E, e));
    }
    return { binIdx, pts };
  }

  // Pre-seed two contrasting equal-time wedges (perihelion vs aphelion) when preset/e changes
  function seedContrastWedges() {
    sim1.wedges = [
      buildBinWedge(0, sim1.e),   // just after perihelion
      buildBinWedge(5, sim1.e)    // approaching aphelion
    ];
  }

  let kepView = null;
  kepView = window.SimKit.canvas2d(kepCanvas, { height: 380, onResize: () => drawSim1() });

  function drawSim1() {
    if (!kepView) return;
    const { ctx, width: W, height: H } = kepView;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#010409';
    ctx.fillRect(0, 0, W, H);

    // Subtle background starfield
    ctx.fillStyle = 'rgba(220, 232, 255, 0.28)';
    for (let i = 0; i < 65; i++) {
      const sx = ((i * 137 + 29) % 1000) / 1000 * W;
      const sy = ((i * 89 + 53) % 1000) / 1000 * H;
      ctx.fillRect(sx, sy, 1.3, 1.3);
    }

    const e = sim1.e;
    const aPx = Math.min(W * 0.36, H * 0.42 / Math.max(0.25, Math.sqrt(1 - e * e)));
    const bPx = aPx * Math.sqrt(1 - e * e);
    const cx = W * 0.5;
    const cy = H * 0.5;
    // Focus (Sun) at +a*e from ellipse center
    const sx = cx + aPx * e;
    const sy = cy;
    const emptyFx = cx - aPx * e;

    // Major axis line
    ctx.strokeStyle = 'rgba(190, 205, 235, 0.14)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx - aPx - 12, cy);
    ctx.lineTo(cx + aPx + 12, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Orbit path
    ctx.strokeStyle = 'rgba(244, 196, 48, 0.36)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(cx, cy, aPx, bPx, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Equal area wedges (all represent exactly 1/12 = 8.33% of orbit area)
    if (sim1.showAreas) {
      sim1.wedges.forEach((w, idx) => {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        w.pts.forEach(pt => {
          ctx.lineTo(sx + pt.x * aPx, sy - pt.y * aPx);
        });
        ctx.closePath();
        ctx.fillStyle = idx % 2 === 0 ? 'rgba(52, 211, 153, 0.22)' : 'rgba(96, 165, 250, 0.22)';
        ctx.fill();
        ctx.strokeStyle = idx % 2 === 0 ? 'rgba(52, 211, 153, 0.72)' : 'rgba(96, 165, 250, 0.72)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });
    }

    // Current planet state via Kepler's equation
    const E = solveKepler(sim1.M, e);
    const normPt = ellipseNormPoint(E, e);
    const px = sx + normPt.x * aPx;
    const py = sy - normPt.y * aPx;
    const rNorm = 1 - e * Math.cos(E);
    const rAU = sim1.aAU * rNorm;

    // Velocity vector direction (tangent to ellipse)
    const vxDir = -Math.sin(E);
    const vyDir = -Math.sqrt(1 - e * e) * Math.cos(E);
    const vMag = Math.hypot(vxDir, vyDir) || 1;
    const vKmS = 29.78 * Math.sqrt(Math.max(0.01, 2 / rAU - 1 / sim1.aAU));
    const vRef = 29.78 / Math.sqrt(sim1.aAU);
    const arrowLen = Math.min(58, Math.max(16, 26 * (vKmS / vRef)));

    // Radius vector line
    ctx.strokeStyle = 'rgba(244, 196, 48, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(px, py);
    ctx.stroke();

    // Velocity vector arrow
    const ax = px + (vxDir / vMag) * arrowLen;
    const ay = py + (vyDir / vMag) * arrowLen;
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(ax, ay);
    ctx.stroke();

    // Empty focus marker
    ctx.fillStyle = 'rgba(226, 235, 248, 0.45)';
    ctx.beginPath();
    ctx.arc(emptyFx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = '#b0c3de';
    ctx.fillText('Empty focus', emptyFx - 30, cy + 16);

    // Sun at active focus
    const sunGrd = ctx.createRadialGradient(sx, sy, 0, sx, sy, 20);
    sunGrd.addColorStop(0, '#fff9d6');
    sunGrd.addColorStop(0.45, '#f59e0b');
    sunGrd.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = sunGrd;
    ctx.beginPath();
    ctx.arc(sx, sy, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // Planet body
    ctx.fillStyle = '#60a5fa';
    ctx.strokeStyle = '#dbeafe';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Safe perihelion & aphelion labels inside canvas
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = '#fde68a';
    const periX = Math.min(W - 68, cx + aPx - 28);
    const aphX = Math.max(10, cx - aPx - 22);
    ctx.fillText('Perihelion', periX, cy + 18);
    ctx.fillText('Aphelion', aphX, cy - 12);

    // Readouts
    const qPeri = sim1.aAU * (1 - e);
    const qAph = sim1.aAU * (1 + e);
    eccVal.textContent = e.toFixed(3);
    speedVal.textContent = `${vKmS.toFixed(1)} km/s`;
    distVal.textContent = `${rAU.toFixed(3)} AU`;
    periAphVal.textContent = `${qPeri.toFixed(2)} / ${qAph.toFixed(2)} AU`;
    wedgeAreaVal.textContent = sim1.showAreas ? '8.33% (equal Δt)' : 'Hidden';
  }

  eccSl.addEventListener('input', () => {
    sim1.e = Number(eccSl.value);
    eccLbl.textContent = sim1.e.toFixed(2);
    document.querySelectorAll('[data-kep-preset]').forEach(b => b.setAttribute('aria-pressed', 'false'));
    seedContrastWedges();
    drawSim1();
  });

  spdSl.addEventListener('input', () => {
    sim1.speed = Number(spdSl.value);
    spdLbl.textContent = `${sim1.speed.toFixed(1)}×`;
  });

  areaToggle.addEventListener('click', () => {
    sim1.showAreas = !sim1.showAreas;
    areaToggle.setAttribute('aria-pressed', String(sim1.showAreas));
    areaToggle.textContent = sim1.showAreas ? 'Equal Areas: On' : 'Equal Areas: Off';
    drawSim1();
  });

  playPauseBtn.addEventListener('click', () => {
    sim1.playing = !sim1.playing;
    playPauseBtn.setAttribute('aria-pressed', String(sim1.playing));
    playPauseBtn.textContent = sim1.playing ? 'Pause' : 'Play';
  });

  document.querySelectorAll('[data-kep-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = ORBIT_PRESETS[btn.dataset.kepPreset];
      if (!p) return;
      sim1.e = p.e;
      sim1.aAU = p.a;
      eccSl.value = p.e.toFixed(2);
      eccLbl.textContent = p.e.toFixed(2);
      document.querySelectorAll('[data-kep-preset]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      seedContrastWedges();
      drawSim1();
    });
  });

  seedContrastWedges();
  drawSim1();

  window.SimKit.loop(dt => {
    if (!sim1.playing) return;
    sim1.M = (sim1.M + dt * 0.72 * sim1.speed) % (Math.PI * 2);
    const bin = Math.floor((sim1.M / (Math.PI * 2)) * 12) % 12;
    if (bin !== sim1.lastBin) {
      sim1.lastBin = bin;
      sim1.wedges.push(buildBinWedge(bin, sim1.e));
      if (sim1.wedges.length > 4) sim1.wedges.shift();
    }
    drawSim1();
  }, { el: kepCanvas, maxDt: 0.05 });

  /* ── Sim 2: Harmonic Law (T² = a³ / M) Orbit Race & Log-Log Plot ────────── */
  const harmCanvas = document.getElementById('harmonicCanvas');
  const harmASl = document.getElementById('harmASl');
  const harmMSl = document.getElementById('harmMSl');
  const harmALbl = document.getElementById('harmALabel');
  const harmMLbl = document.getElementById('harmMLabel');

  const harmAVal = document.getElementById('harmAVal');
  const harmTVal = document.getElementById('harmTVal');
  const harmT2Val = document.getElementById('harmT2Val');
  const harmA3Val = document.getElementById('harmA3Val');
  const harmRatioVal = document.getElementById('harmRatioVal');

  if (!harmCanvas) return;

  const SOLAR_REFS = [
    { name: 'Mercury', a: 0.387, color: '#cbd5e1' },
    { name: 'Earth', a: 1.0, color: '#60a5fa' },
    { name: 'Mars', a: 1.524, color: '#f87171' },
    { name: 'Ceres', a: 2.77, color: '#c4b5fd' },
    { name: 'Jupiter', a: 5.203, color: '#fbbf24' },
    { name: 'Saturn', a: 9.537, color: '#fde68a' }
  ];

  const sim2 = {
    a: Number(harmASl.value) || 1.52,
    mStar: Number(harmMSl.value) || 1.0,
    timeYr: 0
  };

  let harmView = null;
  harmView = window.SimKit.canvas2d(harmCanvas, { height: 360, onResize: () => drawSim2() });

  function updateHarmReadouts() {
    const tYr = Math.sqrt(Math.pow(sim2.a, 3) / sim2.mStar);
    const t2 = tYr * tYr;
    const a3 = Math.pow(sim2.a, 3);
    const ratio = t2 / a3;

    harmALbl.textContent = `${sim2.a.toFixed(2)} AU`;
    harmMLbl.textContent = `${sim2.mStar.toFixed(2)} M☉`;
    harmAVal.textContent = `${sim2.a.toFixed(2)} AU`;
    harmTVal.textContent = `${tYr.toFixed(2)} yr`;
    harmT2Val.textContent = t2.toFixed(2);
    harmA3Val.textContent = a3.toFixed(2);
    harmRatioVal.textContent = ratio.toFixed(3);
  }

  function drawSim2() {
    if (!harmView) return;
    const { ctx, width: W, height: H } = harmView;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#010409';
    ctx.fillRect(0, 0, W, H);

    const splitX = W * 0.5;
    // Left pane: top-down orbit race (Earth reference + Test planet)
    const cx = splitX * 0.5;
    const cy = H * 0.5;
    const maxR = Math.min(splitX, H) * 0.43;
    const rScale = a => maxR * Math.pow(a / 10.5, 0.52);

    ctx.fillStyle = '#b0c3de';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Top-down orbit comparison (Earth = 1 AU, 1.00 yr)', 14, 20);

    // Reference rings
    [0.39, 1.0, 1.52, 5.2, 9.54].forEach(ra => {
      ctx.strokeStyle = ra === 1.0 ? 'rgba(96, 165, 250, 0.45)' : 'rgba(190, 205, 235, 0.14)';
      ctx.lineWidth = ra === 1.0 ? 1.5 : 1;
      ctx.beginPath();
      ctx.arc(cx, cy, rScale(ra), 0, Math.PI * 2);
      ctx.stroke();
    });

    // Earth reference planet (at 1 AU around 1 M_sun)
    const earthAng = sim2.timeYr * Math.PI * 2;
    const ex = cx + Math.cos(earthAng) * rScale(1.0);
    const ey = cy - Math.sin(earthAng) * rScale(1.0);
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(ex, ey, 5, 0, Math.PI * 2);
    ctx.fill();

    // Test planet orbit & body
    const testR = rScale(sim2.a);
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.72)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy, testR, 0, Math.PI * 2);
    ctx.stroke();

    const tPeriod = Math.sqrt(Math.pow(sim2.a, 3) / sim2.mStar);
    const testAng = (sim2.timeYr / tPeriod) * Math.PI * 2;
    const tx = cx + Math.cos(testAng) * testR;
    const ty = cy - Math.sin(testAng) * testR;
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(tx, ty, 7, 0, Math.PI * 2);
    ctx.fill();

    // Star at center scaled gently with mass
    const starR = 7 + sim2.mStar * 3.5;
    ctx.fillStyle = sim2.mStar < 0.6 ? '#fb923c' : sim2.mStar > 1.5 ? '#dbeafe' : '#fde68a';
    ctx.beginPath();
    ctx.arc(cx, cy, starR, 0, Math.PI * 2);
    ctx.fill();

    // Divider
    ctx.strokeStyle = 'rgba(190, 205, 235, 0.18)';
    ctx.beginPath();
    ctx.moveTo(splitX, 12);
    ctx.lineTo(splitX, H - 12);
    ctx.stroke();

    // Right pane: Log-log plot log10(a) vs log10(T)
    const padL = splitX + 46;
    const padR = W - 22;
    const padT = 36;
    const padB = H - 36;
    const pw = padR - padL;
    const ph = padB - padT;

    // log10(a) from -0.5 to 1.1; log10(T) from -0.8 to 1.7
    const xOf = a => padL + ((Math.log10(a) + 0.5) / 1.6) * pw;
    const yOf = t => padB - ((Math.log10(t) + 0.8) / 2.5) * ph;

    ctx.strokeStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padB);
    ctx.lineTo(padR, padB);
    ctx.stroke();

    ctx.fillStyle = '#b0c3de';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Log–Log Harmonic Law: log₁₀(T) vs log₁₀(a)', splitX + 16, 20);
    ctx.fillText('Semi-major axis a (AU, log)', padL + pw * 0.25, H - 10);
    ctx.fillText('T (yr)', splitX + 10, padT + 8);

    // 1 M_sun baseline dashed line
    ctx.strokeStyle = 'rgba(244, 196, 48, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(xOf(0.35), yOf(Math.pow(0.35, 1.5)));
    ctx.lineTo(xOf(11), yOf(Math.pow(11, 1.5)));
    ctx.stroke();
    ctx.setLineDash([]);

    // Current M_star line
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xOf(0.35), yOf(Math.sqrt(Math.pow(0.35, 3) / sim2.mStar)));
    ctx.lineTo(xOf(11), yOf(Math.sqrt(Math.pow(11, 3) / sim2.mStar)));
    ctx.stroke();

    // Solar system reference dots
    SOLAR_REFS.forEach(ref => {
      const rx = xOf(ref.a);
      const ry = yOf(Math.pow(ref.a, 1.5));
      ctx.fillStyle = ref.color;
      ctx.beginPath();
      ctx.arc(rx, ry, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d0dfef';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(ref.name, rx + 6, ry + 3);
    });

    // Live test planet dot
    const lx = xOf(sim2.a);
    const ly = yOf(tPeriod);
    ctx.fillStyle = '#34d399';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(lx, ly, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  harmASl.addEventListener('input', () => {
    sim2.a = Number(harmASl.value);
    document.querySelectorAll('[data-harm-preset]').forEach(b => b.setAttribute('aria-pressed', 'false'));
    updateHarmReadouts();
    drawSim2();
  });

  harmMSl.addEventListener('input', () => {
    sim2.mStar = Number(harmMSl.value);
    updateHarmReadouts();
    drawSim2();
  });

  document.querySelectorAll('[data-harm-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      sim2.a = Number(btn.dataset.harmPreset);
      sim2.mStar = 1.0;
      harmASl.value = sim2.a.toFixed(2);
      harmMSl.value = '1.00';
      document.querySelectorAll('[data-harm-preset]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      updateHarmReadouts();
      drawSim2();
    });
  });

  updateHarmReadouts();
  drawSim2();

  window.SimKit.loop(dt => {
    sim2.timeYr += dt * 0.45;
    drawSim2();
  }, { el: harmCanvas, maxDt: 0.05 });
})();
