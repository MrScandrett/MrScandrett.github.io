(() => {
  'use strict';

  const PRESETS = {
    earth: { rp: 1.0, rs: 1.0, a: 1.0, b: 0.15, label: 'Earth–Sun' },
    hotJupiter: { rp: 11.2, rs: 1.15, a: 0.047, b: 0.45, label: 'Hot Jupiter (HD 209458 b)' },
    trappist1e: { rp: 0.92, rs: 0.12, a: 0.029, b: 0.2, label: 'TRAPPIST-1e' },
    kepler186f: { rp: 1.17, rs: 0.52, a: 0.43, b: 0.25, label: 'Kepler-186f' },
    cancri55e: { rp: 1.88, rs: 0.94, a: 0.015, b: 0.35, label: '55 Cancri e' }
  };

  const state = {
    rp: 11.2,
    rs: 1.15,
    a: 0.047,
    b: 0.45,
    playing: true,
    phase: 0.18,
    mysteryKey: 'hotJupiter',
    methodKey: 'transit',
    methodTime: 0
  };

  const rpSl = document.getElementById('exo-rp');
  const rsSl = document.getElementById('exo-rs');
  const aSl = document.getElementById('exo-a');
  const bSl = document.getElementById('exo-b');
  const rpOut = document.getElementById('exo-rp-val');
  const rsOut = document.getElementById('exo-rs-val');
  const aOut = document.getElementById('exo-a-val');
  const bOut = document.getElementById('exo-b-val');
  const playBtn = document.getElementById('exo-play-toggle');

  const depthEl = document.getElementById('exo-depth');
  const periodEl = document.getElementById('exo-period');
  const teqEl = document.getElementById('exo-teq');
  const hzEl = document.getElementById('exo-hz');

  const transitCanvas = document.getElementById('exo-transit-canvas');
  const detectiveCanvas = document.getElementById('exo-detective-canvas');
  const methodCanvas = document.getElementById('exo-method-canvas');

  if (!transitCanvas || !window.SimKit) return;

  function starProps(rs) {
    // Main-sequence empirical scaling: M ~ R^1.25, T_eff ~ 5778 * R^0.42
    const mStar = Math.pow(rs, 1.25);
    const tStar = 5778 * Math.pow(rs, 0.42);
    const lStar = rs * rs * Math.pow(tStar / 5778, 4);
    let color = '#fff2c2';
    let limb = '#d97706';
    let spectral = 'G-type';
    if (rs < 0.45) {
      color = '#ff9a62';
      limb = '#9a3412';
      spectral = 'M-dwarf';
    } else if (rs < 0.82) {
      color = '#ffd08a';
      limb = '#c2410c';
      spectral = 'K-dwarf';
    } else if (rs > 1.35) {
      color = '#dbeafe';
      limb = '#3b82f6';
      spectral = 'F-type';
    }
    return { mStar, tStar, lStar, color, limb, spectral };
  }

  function computeMetrics() {
    // 1 Solar radius = 109.1 Earth radii
    const ratio = state.rp / (state.rs * 109.1);
    const depth = ratio * ratio;
    const { mStar, lStar, spectral } = starProps(state.rs);
    const periodDays = 365.25 * Math.sqrt(Math.pow(state.a, 3) / mStar);
    // Equilibrium temp (Bond albedo ~0.30, full redistribution): 255 * L^0.25 / sqrt(a)
    const teqK = 255 * Math.pow(lStar, 0.25) / Math.sqrt(state.a);
    const teqC = teqK - 273.15;
    // Conservative habitable zone flux ~ 0.32 to 1.45 Earth flux
    const flux = lStar / (state.a * state.a);
    let hzClass = 'exo-hz-temperate';
    let hzText = 'Temperate Zone';
    if (flux > 1.45) {
      hzClass = 'exo-hz-hot';
      hzText = 'Too Hot (Runaway)';
    } else if (flux < 0.32) {
      hzClass = 'exo-hz-cold';
      hzText = 'Too Cold (Frozen)';
    }
    return { ratio, depth, periodDays, teqK, teqC, hzClass, hzText, spectral };
  }

  function transitFluxAtPhase(phase, ratio, b) {
    // Center transit at phase = 0.5; scaled ingress/egress window
    const halfSpan = 0.14;
    const dx = (phase - 0.5) / halfSpan;
    const dist = Math.hypot(dx, b);
    if (dist >= 1 + ratio) return 1.0;
    let overlap;
    if (dist <= 1 - ratio) {
      overlap = 1.0;
    } else {
      const t = (1 + ratio - dist) / (2 * ratio);
      overlap = Math.max(0, Math.min(1, t));
      overlap = overlap * overlap * (3 - 2 * overlap);
    }
    // Simple limb-darkening factor (brighter center, dimmer edge)
    const rNorm = Math.min(1, dist);
    const limbFactor = 1 - 0.28 * (1 - Math.sqrt(Math.max(0, 1 - rNorm * rNorm)));
    return 1 - ratio * ratio * overlap * (1.12 - 0.22 * (1 - limbFactor));
  }

  function updateUI() {
    rpOut.textContent = `${state.rp.toFixed(2)} R⊕`;
    rsOut.textContent = `${state.rs.toFixed(2)} R☉`;
    aOut.textContent = `${state.a.toFixed(3)} AU`;
    bOut.textContent = state.b.toFixed(2);

    const m = computeMetrics();
    const pct = m.depth * 100;
    const ppm = Math.round(m.depth * 1e6);
    depthEl.textContent = pct >= 0.1 ? `${pct.toFixed(2)}% (${ppm.toLocaleString()} ppm)` : `${ppm.toLocaleString()} ppm`;
    periodEl.textContent = m.periodDays < 100 ? `${m.periodDays.toFixed(1)} days` : `${(m.periodDays / 365.25).toFixed(2)} yr`;
    teqEl.textContent = `${Math.round(m.teqK)} K (${Math.round(m.teqC)} °C)`;
    hzEl.className = `exo-hz-badge ${m.hzClass}`;
    hzEl.textContent = `${m.hzText} · ${m.spectral}`;
  }

  let transitView = null;
  transitView = window.SimKit.canvas2d(transitCanvas, { height: 340, onResize: () => drawTransit() });

  function drawTransit() {
    if (!transitView) return;
    const { ctx, width: W, height: H } = transitView;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#030711';
    ctx.fillRect(0, 0, W, H);

    const splitY = Math.round(H * 0.56);
    const starCx = W * 0.5;
    const starCy = splitY * 0.5;
    const starR = Math.min(W, splitY) * (0.18 + 0.18 * (state.rs / 2.0));
    const { color, limb } = starProps(state.rs);
    const m = computeMetrics();

    // Subtle background stars
    ctx.fillStyle = 'rgba(210, 228, 255, 0.35)';
    for (let i = 0; i < 28; i++) {
      const sx = ((i * 97 + 41) % 100) / 100 * W;
      const sy = ((i * 53 + 19) % 100) / 100 * splitY;
      ctx.fillRect(sx, sy, 1.4, 1.4);
    }

    // Star disk with limb darkening
    const glow = ctx.createRadialGradient(starCx, starCy, starR * 0.7, starCx, starCy, starR * 1.9);
    glow.addColorStop(0, color + '55');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(starCx, starCy, starR * 1.9, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createRadialGradient(starCx - starR * 0.18, starCy - starR * 0.18, starR * 0.1, starCx, starCy, starR);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.55, color);
    grad.addColorStop(1, limb);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(starCx, starCy, starR, 0, Math.PI * 2);
    ctx.fill();

    // Transit chord guide
    const py = starCy + state.b * starR;
    ctx.strokeStyle = 'rgba(196, 181, 253, 0.28)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(starCx - starR * 1.9, py);
    ctx.lineTo(starCx + starR * 1.9, py);
    ctx.stroke();
    ctx.setLineDash([]);

    // Planet crossing star
    const span = starR * 1.65;
    const px = starCx + ((state.phase - 0.5) / 0.14) * starR;
    const planetR = Math.max(2.5, Math.min(starR * 0.65, starR * m.ratio));
    if (px >= starCx - span * 1.6 && px <= starCx + span * 1.6) {
      ctx.fillStyle = '#040814';
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, planetR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Divider & light-curve plot
    ctx.strokeStyle = '#293d61';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, splitY);
    ctx.lineTo(W, splitY);
    ctx.stroke();

    const padL = 58;
    const padR = 22;
    const padT = splitY + 24;
    const padB = H - 28;
    const plotW = W - padL - padR;
    const plotH = padB - padT;

    // Auto-zoom vertical scale so even Earth's 84 ppm dip is visible, labeled clearly
    const maxDip = Math.max(0.00025, m.depth * 1.45);

    ctx.strokeStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padB);
    ctx.lineTo(padL + plotW, padB);
    ctx.stroke();

    ctx.fillStyle = '#b9cce3';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.fillText('1.000', 12, padT + 4);
    const minLabel = (1 - maxDip).toFixed(maxDip < 0.002 ? 5 : 3);
    ctx.fillText(minLabel, 12, padB);
    ctx.fillText('Orbital Phase →', padL + plotW - 92, H - 8);
    ctx.fillText('Relative Starlight (F / F₀)', padL + 8, splitY + 15);

    // Light curve polyline
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const steps = 180;
    for (let i = 0; i <= steps; i++) {
      const ph = i / steps;
      const flux = transitFluxAtPhase(ph, m.ratio, state.b);
      const x = padL + ph * plotW;
      const y = padT + ((1 - flux) / maxDip) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Live measurement dot
    const curFlux = transitFluxAtPhase(state.phase, m.ratio, state.b);
    const curX = padL + state.phase * plotW;
    const curY = padT + ((1 - curFlux) / maxDip) * plotH;
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(curX, curY, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Light-Curve Detective challenge
  const MYSTERIES = {
    hotJupiter: {
      name: 'Signal A',
      desc: 'Flat-bottomed 1.2% dip repeating every 3.5 days.',
      depth: 0.012,
      b: 0.3,
      answer: 'hotJupiter',
      explain: 'A ~1% flat-bottomed dip on a 3.5-day period is the classic signature of a Hot Jupiter (~10% the star’s radius) orbiting very close to its star.'
    },
    earthTwin: {
      name: 'Signal B',
      desc: 'Tiny 0.0084% (84 ppm) dip zoomed in 100×, repeating once per year.',
      depth: 0.000084,
      b: 0.2,
      zoomScale: 0.00014,
      answer: 'earthTwin',
      explain: 'An 84 ppm dip (~0.0084%) with a 365-day period matches an Earth-sized rocky planet orbiting a Sun-like star at 1 AU.'
    },
    grazing: {
      name: 'Signal C',
      desc: 'Sharp V-shaped 18% brightness drop every 4.2 days.',
      depth: 0.18,
      b: 0.85,
      vShape: true,
      answer: 'eclipsingBinary',
      explain: 'A deep V-shaped drop (15–30%) usually means a grazing eclipsing binary star — two stars eclipsing each other — not a planet!'
    },
    redDwarf: {
      name: 'Signal D',
      desc: '0.6% dip around a tiny dim M-dwarf star every 6.1 days.',
      depth: 0.006,
      b: 0.25,
      answer: 'temperateDwarf',
      explain: 'Because M-dwarfs are tiny, even an Earth-sized planet blocks ~0.5% of the star’s light — and a 6-day orbit around a cool red dwarf can sit right in the temperate zone!'
    }
  };

  let detView = null;
  if (detectiveCanvas) detView = window.SimKit.canvas2d(detectiveCanvas, { height: 185, onResize: () => drawDetective() });

  function drawDetective() {
    if (!detView) return;
    const { ctx, width: W, height: H } = detView;
    const sig = MYSTERIES[state.mysteryKey];
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#040917';
    ctx.fillRect(0, 0, W, H);

    const padL = 44;
    const padR = 16;
    const padT = 28;
    const padB = H - 24;
    const plotW = W - padL - padR;
    const plotH = padB - padT;
    const maxScale = sig.zoomScale || sig.depth * 1.35;

    ctx.strokeStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padB);
    ctx.lineTo(padL + plotW, padB);
    ctx.stroke();

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.fillText(`${sig.name}: ${sig.desc}`, 14, 18);

    ctx.strokeStyle = '#c4b5fd';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const ratio = Math.sqrt(sig.depth);
    for (let i = 0; i <= 140; i++) {
      const ph = i / 140;
      let flux = transitFluxAtPhase(ph, ratio, sig.b);
      if (sig.vShape) {
        const d = Math.abs(ph - 0.5) / 0.14;
        flux = d < 1 ? 1 - sig.depth * (1 - d) : 1;
      }
      const x = padL + ph * plotW;
      const y = padT + ((1 - flux) / maxScale) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Sample points with realistic tiny scatter
    ctx.fillStyle = '#fde68a';
    for (let i = 0; i <= 32; i++) {
      const ph = i / 32;
      let flux = transitFluxAtPhase(ph, ratio, sig.b);
      if (sig.vShape) {
        const d = Math.abs(ph - 0.5) / 0.14;
        flux = d < 1 ? 1 - sig.depth * (1 - d) : 1;
      }
      const jitter = Math.sin(i * 19.7) * maxScale * 0.025;
      const x = padL + ph * plotW;
      const y = padT + ((1 - (flux + jitter)) / maxScale) * plotH;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Five detection methods explorer
  const METHODS = {
    transit: {
      title: 'Transit Photometry',
      measures: 'Planet radius relative to its star (Rₚ / R★) and orbital period (T).',
      strength: 'Monitors hundreds of thousands of stars at once; allows atmospheric spectroscopy.',
      limit: 'Only ~0.5% to 5% of orbits align edge-on with Earth.',
      observatories: 'Kepler, TESS, PLATO, JWST'
    },
    rv: {
      title: 'Radial Velocity (Doppler Wobble)',
      measures: 'Gravitational tug of the planet on its star — gives minimum planet mass (Mₚ sin i).',
      strength: 'Works without edge-on alignment; reveals planet density when paired with transits.',
      limit: 'Best for massive, close-in planets; stellar flares mimic small wobbles.',
      observatories: 'HARPS, ESPRESSO, KECK HIRES, NEID'
    },
    lensing: {
      title: 'Gravitational Microlensing',
      measures: 'Starlight bent by a foreground star + planet acting as a temporary gravity lens.',
      strength: 'Sensitive to cold, wide-orbit planets and free-floating rogue worlds.',
      limit: 'One-time alignment that never repeats for the same star.',
      observatories: 'OGLE, MOA, Nancy Grace Roman Space Telescope'
    },
    imaging: {
      title: 'Direct Imaging (Coronagraphy)',
      measures: 'Photons emitted or reflected directly by the planet itself.',
      strength: 'Directly tracks full wide orbits and captures clean planetary spectra.',
      limit: 'Star is billions of times brighter; currently favors young, glowing giants far from stars.',
      observatories: 'JWST, VLT-SPHERE, Gemini Planet Imager, Roman CGI'
    },
    astrometry: {
      title: 'Astrometry',
      measures: 'Tiny side-to-side wobble of a star’s sky position against background stars.',
      strength: 'Measures true 3D orbit inclination and exact planet mass.',
      limit: 'Requires micro-arcsecond precision — like spotting a coin on the Moon from Earth.',
      observatories: 'ESA Gaia Mission'
    }
  };

  let methodView = null;
  if (methodCanvas) methodView = window.SimKit.canvas2d(methodCanvas, { height: 220, onResize: () => drawMethod(state.methodTime) });
  const methodTitleEl = document.getElementById('exo-method-title');
  const methodMeasuresEl = document.getElementById('exo-method-measures');
  const methodStrengthEl = document.getElementById('exo-method-strength');
  const methodLimitEl = document.getElementById('exo-method-limit');
  const methodObsEl = document.getElementById('exo-method-obs');

  function updateMethodInfo() {
    const info = METHODS[state.methodKey];
    if (!info) return;
    methodTitleEl.textContent = info.title;
    methodMeasuresEl.textContent = info.measures;
    methodStrengthEl.textContent = info.strength;
    methodLimitEl.textContent = info.limit;
    methodObsEl.textContent = info.observatories;
  }

  function drawMethod(t) {
    if (!methodView) return;
    const { ctx, width: W, height: H } = methodView;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#040917';
    ctx.fillRect(0, 0, W, H);
    const cx = W * 0.5;
    const cy = H * 0.5;

    if (state.methodKey === 'transit') {
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(cx, cy, 42, 0, Math.PI * 2);
      ctx.fill();
      const x = cx + Math.sin(t * 1.4) * 110;
      if (Math.cos(t * 1.4) > 0) {
        ctx.fillStyle = '#040917';
        ctx.strokeStyle = '#7dd3fc';
        ctx.beginPath();
        ctx.arc(x, cy + 8, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = '#c8d7ec';
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.fillText('Planet blocks a fraction of starlight each orbit', 14, H - 12);
    } else if (state.methodKey === 'rv') {
      const ang = t * 1.8;
      const sx = cx + Math.cos(ang) * 16;
      const sy = cy + Math.sin(ang) * 10;
      const px = cx - Math.cos(ang) * 86;
      const py = cy - Math.sin(ang) * 44;
      ctx.strokeStyle = 'rgba(196,181,253,0.35)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 86, 44, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Center of mass cross
      ctx.strokeStyle = '#fde68a';
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy);
      ctx.lineTo(cx + 6, cy);
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx, cy + 6);
      ctx.stroke();
      const shiftColor = Math.sin(ang) > 0 ? '#93c5fd' : '#fca5a5';
      ctx.fillStyle = shiftColor;
      ctx.beginPath();
      ctx.arc(sx, sy, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7dd3fc';
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c8d7ec';
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.fillText(Math.sin(ang) > 0 ? 'Star wobbles toward Earth (blueshift)' : 'Star wobbles away from Earth (redshift)', 14, H - 12);
    } else if (state.methodKey === 'lensing') {
      // Background star + bent light arcs
      ctx.fillStyle = '#93c5fd';
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
      const fx = cx + Math.sin(t * 0.9) * 115;
      ctx.strokeStyle = 'rgba(253, 230, 138, 0.75)';
      ctx.lineWidth = 2;
      const closeness = Math.max(0, 1 - Math.abs(fx - cx) / 70);
      ctx.beginPath();
      ctx.arc(cx, cy, 18 + closeness * 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffb703';
      ctx.beginPath();
      ctx.arc(fx, cy + 12, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7dd3fc';
      ctx.beginPath();
      ctx.arc(fx + 26, cy - 8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c8d7ec';
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.fillText('Foreground gravity warps & magnifies background starlight', 14, H - 12);
    } else if (state.methodKey === 'imaging') {
      // Star masked by coronagraph disk, faint planet visible outside
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fde68a';
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.fillText('Star Masked', cx - 30, cy + 4);
      const ang = t * 0.9;
      const px = cx + Math.cos(ang) * 92;
      const py = cy + Math.sin(ang) * 58;
      ctx.fillStyle = '#a7f3d0';
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c8d7ec';
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.fillText('Coronagraph blocks star glare so orbiting planet appears', 14, H - 12);
    } else {
      // Astrometry
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      [[-110, -55], [105, -48], [-95, 58], [115, 52]].forEach(([dx, dy]) => {
        ctx.beginPath();
        ctx.arc(cx + dx, cy + dy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
      const ang = t * 1.4;
      const sx = cx + Math.cos(ang) * 14;
      const sy = cy + Math.sin(ang) * 14;
      ctx.strokeStyle = 'rgba(253, 230, 138, 0.4)';
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(sx, sy, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c8d7ec';
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.fillText('Star traces a tiny circle on the sky relative to distant stars', 14, H - 12);
    }
  }

  // Event wiring
  document.querySelectorAll('[data-exo-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = PRESETS[btn.dataset.exoPreset];
      if (!p) return;
      state.rp = p.rp;
      state.rs = p.rs;
      state.a = p.a;
      state.b = p.b;
      rpSl.value = p.rp;
      rsSl.value = p.rs;
      aSl.value = p.a;
      bSl.value = p.b;
      document.querySelectorAll('[data-exo-preset]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      updateUI();
      drawTransit();
    });
  });

  [rpSl, rsSl, aSl, bSl].forEach(sl => {
    sl.addEventListener('input', () => {
      state.rp = Number(rpSl.value);
      state.rs = Number(rsSl.value);
      state.a = Number(aSl.value);
      state.b = Number(bSl.value);
      document.querySelectorAll('[data-exo-preset]').forEach(b => b.setAttribute('aria-pressed', 'false'));
      updateUI();
      drawTransit();
    });
  });

  playBtn.addEventListener('click', () => {
    state.playing = !state.playing;
    playBtn.setAttribute('aria-pressed', String(state.playing));
    playBtn.textContent = state.playing ? 'Pause Transit' : 'Play Transit';
  });

  document.querySelectorAll('[data-mystery]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.mysteryKey = btn.dataset.mystery;
      document.querySelectorAll('[data-mystery]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      document.getElementById('exo-detective-feedback').textContent = 'Inspect the light curve shape, depth, and period, then select the matching object below.';
      drawDetective();
    });
  });

  document.querySelectorAll('[data-guess]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sig = MYSTERIES[state.mysteryKey];
      const ok = btn.dataset.guess === sig.answer;
      document.getElementById('exo-detective-feedback').textContent = (ok ? 'Correct! ' : 'Not quite — ') + sig.explain;
    });
  });

  document.querySelectorAll('[data-method-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      state.methodKey = tab.dataset.methodTab;
      document.querySelectorAll('[data-method-tab]').forEach(t => t.setAttribute('aria-selected', String(t === tab)));
      updateMethodInfo();
      drawMethod(state.methodTime);
    });
  });

  document.querySelectorAll('.exo-quiz-item').forEach(item => {
    const status = item.querySelector('.exo-quiz-status');
    item.querySelectorAll('button[data-correct]').forEach(btn => {
      btn.addEventListener('click', () => {
        const ok = btn.dataset.correct === 'true';
        status.textContent = ok ? `Correct! ${btn.dataset.explain}` : `Try again. ${btn.dataset.explain}`;
        item.querySelectorAll('button[data-correct]').forEach(b => b.classList.toggle('is-active', b === btn));
      });
    });
  });

  updateUI();
  updateMethodInfo();
  drawTransit();
  drawDetective();
  drawMethod(0);

  window.SimKit.loop(dt => {
    if (state.playing) {
      state.phase = (state.phase + dt * 0.16) % 1;
      drawTransit();
    }
  }, { el: transitCanvas, maxDt: 0.05 });

  window.SimKit.loop(dt => {
    state.methodTime += dt;
    drawMethod(state.methodTime);
  }, { el: methodCanvas, maxDt: 0.05 });
})();
