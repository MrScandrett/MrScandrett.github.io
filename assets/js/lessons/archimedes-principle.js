/**
 * Archimedes' Principle — Interactive Labs, Density Explorer & Practice Controller
 */
(function () {
  'use strict';

  const AP = window.ArchimedesPhysics;
  if (!AP) return;

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let isDarkTheme = false;

  function detectDark(colors) {
    const attrLight = document.documentElement.getAttribute('data-lighting');
    const attrTheme = document.documentElement.getAttribute('data-theme');
    if (attrLight === 'night') return true;
    if (['vaporwave', 'bark', 'mandelbrot', 'lavalamp'].includes(attrTheme)) return true;
    if (!attrLight && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return true;
    if (colors && colors.bg) {
      const m = colors.bg.match(/#([0-9a-f]{6})/i);
      if (m) {
        const r = parseInt(m[1].slice(0, 2), 16);
        const g = parseInt(m[1].slice(2, 4), 16);
        const b = parseInt(m[1].slice(4, 6), 16);
        if ((0.2126 * r + 0.7152 * g + 0.0722 * b) < 128) return true;
      }
    }
    return false;
  }

  function palette() {
    if (isDarkTheme) {
      return {
        bg: '#0f172a',
        bgGradBottom: '#162238',
        ink: '#f1f5f9',
        muted: '#94a3b8',
        grid: 'rgba(148, 163, 184, 0.14)',
        glassBorder: 'rgba(148, 163, 184, 0.48)',
        glassFill: 'rgba(30, 41, 59, 0.42)',
        pillBg: 'rgba(15, 23, 42, 0.88)',
        weightCol: '#f87171',
        buoyCol: '#4ade80',
        normalCol: '#fbbf24',
        tensionCol: '#38bdf8',
        pressureCol: '#7dd3fc',
        beamCol: '#cbd5e1',
        skyTop: '#0b192c',
        skyBot: '#162c46'
      };
    }
    return {
      bg: '#f0f8ff',
      bgGradBottom: '#e2effb',
      ink: '#0f172a',
      muted: '#475569',
      grid: 'rgba(15, 23, 42, 0.08)',
      glassBorder: 'rgba(15, 23, 42, 0.34)',
      glassFill: 'rgba(255, 255, 255, 0.56)',
      pillBg: 'rgba(255, 255, 255, 0.92)',
      weightCol: '#dc2626',
      buoyCol: '#15803d',
      normalCol: '#b45309',
      tensionCol: '#0369a1',
      pressureCol: '#0369a1',
      beamCol: '#334155',
      skyTop: '#e0f2fe',
      skyBot: '#f0f9ff'
    };
  }

  function drawPill(ctx, text, x, y, color, pal, align) {
    ctx.save();
    ctx.font = '700 11px Inter, system-ui, sans-serif';
    const w = ctx.measureText(text).width + 12;
    const h = 20;
    let rx = x - w / 2;
    if (align === 'left') rx = x;
    else if (align === 'right') rx = x - w;
    const ry = y - h / 2;

    ctx.fillStyle = pal.pillBg;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.roundRect(rx, ry, w, h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, rx + w / 2, ry + h / 2 + 0.5);
    ctx.restore();
  }

  function drawArrow(ctx, x1, y1, x2, y2, color, width) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 3) return;
    const ang = Math.atan2(dy, dx);
    const head = Math.min(9, Math.max(5, len * 0.28));

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width || 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(ang - 0.5), y2 - head * Math.sin(ang - 0.5));
    ctx.lineTo(x2 - head * Math.cos(ang + 0.5), y2 - head * Math.sin(ang + 0.5));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* ========================================================================
     LAB 1: BUOYANCY & DISPLACEMENT TANK
     ======================================================================== */
  function initBuoyancyTank() {
    const canvas = document.getElementById('ap-tank-canvas');
    if (!canvas || !window.SimKit) return null;

    const massSlider = document.getElementById('ap-mass-slider');
    const massOut = document.getElementById('ap-mass-out');
    const volSlider = document.getElementById('ap-vol-slider');
    const volOut = document.getElementById('ap-vol-out');
    const fluidSlider = document.getElementById('ap-fluid-slider');
    const fluidOut = document.getElementById('ap-fluid-out');
    const dipControl = document.getElementById('ap-dip-control');
    const dipSlider = document.getElementById('ap-dip-slider');
    const dipOut = document.getElementById('ap-dip-out');
    const objDensityBadge = document.getElementById('ap-obj-density-badge');
    const objNoteEl = document.getElementById('ap-obj-note');
    const tankHint = document.getElementById('ap-tank-hint');
    const toggleVectors = document.getElementById('ap-toggle-vectors');
    const togglePressure = document.getElementById('ap-toggle-pressure');
    const dropBtn = document.getElementById('ap-drop-btn');
    const logBtn = document.getElementById('ap-log-btn');
    const resetBtn = document.getElementById('ap-reset-btn');
    const clearTrialsBtn = document.getElementById('ap-clear-trials');
    const trialTbody = document.getElementById('ap-trial-tbody');
    const predictFb = document.getElementById('ap-predict-feedback');

    const teleDensity = document.getElementById('ap-t-density');
    const teleDisp = document.getElementById('ap-t-disp');
    const teleWeight = document.getElementById('ap-t-weight');
    const teleBuoy = document.getElementById('ap-t-buoy');
    const teleVerdictLbl = document.getElementById('ap-t-verdict-lbl');
    const teleVerdict = document.getElementById('ap-t-verdict');

    const wrap = canvas.parentElement;
    const c2d = window.SimKit.canvas2d(canvas, {});

    const state = {
      objectId: 'wood',
      objectName: 'Pine Wood',
      icon: '🪵',
      color: '#b47436',
      accent: '#713f12',
      massKg: 0.55,
      volumeL: 1.00,
      fluidId: 'water',
      fluidName: 'Fresh Water',
      fluidDensity: 1.00,
      fluidViscosity: 0.08,
      fluidColor: AP.findFluid('water').color,
      fluidDeepColor: AP.findFluid('water').deepColor,
      fluidSurfaceColor: AP.findFluid('water').surfaceColor,
      mode: 'free', // 'free' | 'scale'
      dipPct: 0,
      showVectors: true,
      showPressure: false,
      prediction: null,
      predictionChecked: false,
      activeDrop: false,
      dragging: false,
      dragOffsetY: 0,
      body: {
        y: 66,
        vy: 0,
        inWater: false,
        submergedFraction: 0,
        effectiveWaterTop: 155,
        onFloor: false
      },
      pourFlow: 0
    };

    const surface = window.LiquidEngine ? new window.LiquidEngine.Surface({
      width: 320,
      restY: 0,
      columns: 64,
      material: 'water'
    }) : null;

    const particles = window.LiquidEngine ? new window.LiquidEngine.Particles({
      max: 90,
      material: 'water'
    }) : null;

    function getMetrics() {
      const W = c2d.width || 600;
      const H = c2d.height || 370;
      const showOverflow = state.mode === 'scale';
      const tankLeft = showOverflow ? Math.round(W * 0.07) : Math.round(W * 0.14);
      const tankW = showOverflow ? Math.round(W * 0.52) : Math.round(W * 0.72);
      const tankRight = tankLeft + tankW;
      const tankTop = 70;
      const tankBottom = H - 28;
      const waterTop = showOverflow ? 150 : 162;
      const blockSize = Math.round(AP.clamp(44 + Math.cbrt(state.volumeL) * 16, 48, 84));
      const risePerLiter = showOverflow ? 0 : 12;
      const cx = tankLeft + tankW / 2;

      return {
        W, H, tankLeft, tankW, tankRight, tankTop, tankBottom, waterTop,
        blockSize, risePerLiter, cx, showOverflow
      };
    }

    function syncBlockToScaleDip() {
      const m = getMetrics();
      const frac = state.dipPct / 100;
      const topY = m.waterTop - m.blockSize / 2 - 14;
      const fullSubY = m.waterTop + m.blockSize / 2 + 12;
      state.body.y = topY + (fullSubY - topY) * frac;
      state.body.vy = 0;
      const geom = AP.computeImmersionGeometry(state.body.y, m.blockSize, m.waterTop, m.risePerLiter, state.volumeL);
      state.body.submergedFraction = geom.submergedFraction;
      state.body.effectiveWaterTop = geom.effectiveWaterTop;
      state.body.inWater = geom.submergedFraction > 0.01;
      state.body.onFloor = false;
    }

    function resetBlockPosition() {
      const m = getMetrics();
      state.activeDrop = false;
      state.predictionChecked = false;
      state.body.vy = 0;
      state.body.inWater = false;
      state.body.onFloor = false;
      if (state.mode === 'scale') {
        state.dipPct = 0;
        dipSlider.value = '0';
        dipOut.textContent = '0%';
        syncBlockToScaleDip();
      } else {
        state.body.y = Math.max(m.blockSize / 2 + 16, m.waterTop - m.blockSize / 2 - 22);
        state.body.submergedFraction = 0;
        state.body.effectiveWaterTop = m.waterTop;
      }
      if (surface) surface.reset();
      if (particles) particles.clear();
      updatePredictionBanner(false);
    }

    function syncControlsUI() {
      massSlider.value = state.massKg.toFixed(2);
      massOut.textContent = state.massKg.toFixed(2) + ' kg';
      volSlider.value = state.volumeL.toFixed(2);
      volOut.textContent = state.volumeL.toFixed(2) + ' L';
      fluidSlider.value = state.fluidDensity.toFixed(2);
      fluidOut.textContent = state.fluidDensity.toFixed(2) + ' g/cm³';

      const rho = state.massKg / state.volumeL;
      objDensityBadge.textContent = rho.toFixed(2) + ' g/cm³';
      const obj = AP.OBJECTS.find(o => o.id === state.objectId);
      objNoteEl.textContent = obj
        ? obj.note
        : `Custom ${state.massKg.toFixed(2)} kg / ${state.volumeL.toFixed(2)} L block (${rho.toFixed(2)} g/cm³).`;

      document.querySelectorAll('#ap-obj-grid .ap-obj-btn').forEach(btn => {
        const active = btn.dataset.object === state.objectId;
        btn.classList.toggle('selected', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      document.querySelectorAll('#ap-fluid-chips .ap-fluid-btn').forEach(btn => {
        const active = btn.dataset.fluid === state.fluidId;
        btn.classList.toggle('selected', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      document.querySelectorAll('.ap-mode-btn').forEach(btn => {
        const active = btn.dataset.tankMode === state.mode;
        btn.classList.toggle('selected', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      dipControl.hidden = state.mode !== 'scale';
      dropBtn.textContent = state.mode === 'scale' ? 'Submerge 100%' : 'Drop Block';
      tankHint.textContent = state.mode === 'scale'
        ? 'Spring Scale mode: Drag the block vertically or slide Dip Depth to measure apparent weight and overflow fluid weight.'
        : 'Tip: Drag the block inside the tank — push a floating block underwater and let go to watch buoyant force launch it back up.';
    }

    function selectObject(objectId) {
      const obj = AP.findObject(objectId);
      state.objectId = obj.id;
      state.objectName = obj.name;
      state.icon = obj.icon;
      state.color = obj.color;
      state.accent = obj.accent;
      state.massKg = obj.massKg;
      state.volumeL = obj.volumeL;
      syncControlsUI();
      resetBlockPosition();
    }

    function selectFluid(fluidId) {
      const fluid = AP.findFluid(fluidId);
      state.fluidId = fluid.id;
      state.fluidName = fluid.name;
      state.fluidDensity = fluid.density;
      state.fluidViscosity = fluid.viscosity;
      state.fluidColor = fluid.color;
      state.fluidDeepColor = fluid.deepColor;
      state.fluidSurfaceColor = fluid.surfaceColor;
      if (surface) surface.setMaterial(fluid.liquidKind || 'water');
      if (particles) particles.material = window.LiquidEngine.material(fluid.liquidKind || 'water');
      syncControlsUI();
      updatePredictionBanner(false);
    }

    function updatePredictionBanner(checkNow) {
      if (!state.prediction) {
        predictFb.className = 'ap-predict-feedback';
        predictFb.textContent = 'Choose a prediction, then test in the tank.';
        return;
      }
      if (!checkNow && !state.predictionChecked) {
        const label = state.prediction === 'float' ? 'Floats' : state.prediction === 'neutral' ? 'Neutral' : 'Sinks';
        predictFb.className = 'ap-predict-feedback';
        predictFb.textContent = `Prediction locked: "${label}" — now run the test!`;
        return;
      }
      state.predictionChecked = true;
      const calc = AP.computeTankState({
        massKg: state.massKg,
        volumeL: state.volumeL,
        fluidDensity: state.fluidDensity,
        submergedFraction: state.body.submergedFraction
      });
      const actualLabel = calc.status === 'float' ? 'Floats' : calc.status === 'neutral' ? 'Neutral' : 'Sinks';
      if (state.prediction === calc.status) {
        predictFb.className = 'ap-predict-feedback is-right';
        predictFb.textContent = `✓ Spot on! ${calc.density.toFixed(2)} vs ${state.fluidDensity.toFixed(2)} g/cm³ → ${actualLabel}.`;
      } else {
        predictFb.className = 'ap-predict-feedback is-wrong';
        predictFb.textContent = `✗ Actual result: ${actualLabel} (${calc.density.toFixed(2)} vs ${state.fluidDensity.toFixed(2)} g/cm³).`;
      }
    }

    function updateTelemetry(tankState) {
      teleDensity.textContent = tankState.density.toFixed(2) + ' g/cm³';
      const pct = Math.round(state.body.submergedFraction * 100);
      teleDisp.textContent = `${tankState.displacedVolumeL.toFixed(2)} L (${pct}%)`;
      teleWeight.textContent = tankState.weightN.toFixed(2) + ' N';
      teleBuoy.textContent = tankState.buoyantForceN.toFixed(2) + ' N';

      teleVerdict.className = 'ap-tele-val';
      if (state.mode === 'scale') {
        teleVerdictLbl.textContent = 'Spring Scale (W_app)';
        teleVerdict.textContent = `${tankState.apparentWeightN.toFixed(2)} N`;
        if (tankState.apparentWeightN < 0.02) teleVerdict.classList.add('is-float');
      } else {
        teleVerdictLbl.textContent = 'Outcome';
        if (!state.activeDrop && !state.dragging && state.body.submergedFraction < 0.02) {
          teleVerdict.textContent = 'Ready to Drop';
        } else if (tankState.status === 'float') {
          teleVerdict.textContent = `Floats (${Math.round(tankState.eqSubmergedFraction * 100)}% eq)`;
          teleVerdict.classList.add('is-float');
        } else if (tankState.status === 'neutral') {
          teleVerdict.textContent = 'Neutral Hover';
          teleVerdict.classList.add('is-warn');
        } else {
          teleVerdict.textContent = 'Sinks ✗';
          teleVerdict.classList.add('is-sink');
        }
      }
    }

    function renderTank(dt) {
      const m = getMetrics();
      const pal = palette();
      const ctx = c2d.ctx;

      if (surface) {
        surface.configure(m.tankW, 0, 64);
        surface.update(reducedMotion ? 0 : dt);
      }
      if (particles) {
        particles.bounds = {
          left: m.tankLeft + 4,
          right: m.tankRight - 4,
          top: 8,
          bottom: m.tankBottom - 4
        };
        particles.update(dt);
      }

      ctx.clearRect(0, 0, m.W, m.H);
      const bgGrad = ctx.createLinearGradient(0, 0, 0, m.H);
      bgGrad.addColorStop(0, pal.bg);
      bgGrad.addColorStop(1, pal.bgGradBottom);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, m.W, m.H);

      const geom = AP.computeImmersionGeometry(state.body.y, m.blockSize, m.waterTop, m.risePerLiter, state.volumeL);
      state.body.submergedFraction = geom.submergedFraction;
      state.body.effectiveWaterTop = geom.effectiveWaterTop;
      const tankState = AP.computeTankState({
        massKg: state.massKg,
        volumeL: state.volumeL,
        fluidDensity: state.fluidDensity,
        submergedFraction: state.body.submergedFraction
      });
      updateTelemetry(tankState);

      // Tank glass backplate
      ctx.save();
      ctx.fillStyle = pal.glassFill;
      ctx.beginPath();
      ctx.roundRect(m.tankLeft, m.tankTop, m.tankW, m.tankBottom - m.tankTop, [4, 4, 12, 12]);
      ctx.fill();
      ctx.restore();

      // Scale lines (every 12px = 1.0 L)
      ctx.save();
      ctx.strokeStyle = pal.grid;
      ctx.fillStyle = pal.muted;
      ctx.font = '600 10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      for (let i = 0; i <= 5; i += 1) {
        const yMark = m.waterTop - i * 12;
        if (yMark < m.tankTop + 14) break;
        ctx.beginPath();
        ctx.moveTo(m.tankLeft + 4, yMark);
        ctx.lineTo(m.tankLeft + 18, yMark);
        ctx.stroke();
        if (i === 0 || i === 2 || i === 4) {
          ctx.fillText((10 + i).toFixed(0) + ' L', m.tankLeft + 22, yMark + 3);
        }
      }
      ctx.restore();

      const waterSurfaceY = state.body.effectiveWaterTop;

      // Draw object BEFORE water overlay so submerged portion gets natural fluid tint
      const half = m.blockSize / 2;
      const bx = m.cx - half;
      const by = state.body.y - half;

      // Spring scale cord in scale mode
      if (m.showOverflow) {
        const rigY = 18;
        ctx.save();
        ctx.strokeStyle = pal.beamCol;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(m.cx, rigY);
        ctx.lineTo(m.cx, by);
        ctx.stroke();

        // Spring dial housing
        ctx.fillStyle = pal.pillBg;
        ctx.strokeStyle = pal.tensionCol;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(m.cx - 42, rigY - 12, 84, 24, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = pal.tensionCol;
        ctx.font = '800 11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Scale: ${tankState.apparentWeightN.toFixed(2)} N`, m.cx, rigY);
        ctx.restore();
      }

      // Draw block
      ctx.save();
      ctx.fillStyle = state.color;
      ctx.strokeStyle = state.accent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(bx, by, m.blockSize, m.blockSize, 10);
      ctx.fill();
      ctx.stroke();

      // Hollow air pocket visual for hollow-steel
      if (state.objectId === 'hollow-steel') {
        ctx.fillStyle = isDarkTheme ? 'rgba(15, 23, 42, 0.72)' : 'rgba(241, 245, 249, 0.85)';
        ctx.beginPath();
        ctx.roundRect(bx + 8, by + 8, m.blockSize - 16, m.blockSize - 16, 6);
        ctx.fill();
      }

      ctx.font = `${Math.round(m.blockSize * 0.44)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(state.icon, m.cx, state.body.y - 4);
      ctx.fillStyle = state.objectId === 'ice' || state.objectId === 'egg' || state.objectId === 'gold'
        ? '#0f172a'
        : '#ffffff';
      ctx.font = '800 10px Inter, system-ui, sans-serif';
      ctx.fillText(tankState.density.toFixed(2), m.cx, state.body.y + m.blockSize * 0.3);
      ctx.restore();

      // Draw fluid fill with animated wave surface
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(m.tankLeft + 1, m.tankTop, m.tankW - 2, m.tankBottom - m.tankTop - 1, [0, 0, 11, 11]);
      ctx.clip();

      const wGrad = ctx.createLinearGradient(0, waterSurfaceY, 0, m.tankBottom);
      wGrad.addColorStop(0, state.fluidColor);
      wGrad.addColorStop(1, state.fluidDeepColor);
      ctx.fillStyle = wGrad;

      ctx.beginPath();
      if (surface && surface.columns.length) {
        const cols = surface.columns;
        for (let i = 0; i < cols.length; i += 1) {
          const sx = m.tankLeft + (i / (cols.length - 1)) * m.tankW;
          const sy = waterSurfaceY + (reducedMotion ? 0 : cols[i].y);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
      } else {
        ctx.moveTo(m.tankLeft, waterSurfaceY);
        ctx.lineTo(m.tankRight, waterSurfaceY);
      }
      ctx.lineTo(m.tankRight, m.tankBottom);
      ctx.lineTo(m.tankLeft, m.tankBottom);
      ctx.closePath();
      ctx.fill();

      // Water surface highlight line
      ctx.strokeStyle = state.fluidSurfaceColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (surface && surface.columns.length) {
        const cols = surface.columns;
        for (let i = 0; i < cols.length; i += 1) {
          const sx = m.tankLeft + (i / (cols.length - 1)) * m.tankW;
          const sy = waterSurfaceY + (reducedMotion ? 0 : cols[i].y);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
      } else {
        ctx.moveTo(m.tankLeft, waterSurfaceY);
        ctx.lineTo(m.tankRight, waterSurfaceY);
      }
      ctx.stroke();

      // Splash droplets
      if (particles && particles.particles.length) {
        ctx.fillStyle = state.fluidSurfaceColor;
        particles.particles.forEach(p => {
          ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // Tank outer walls
      ctx.save();
      ctx.strokeStyle = pal.glassBorder;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(m.tankLeft, m.tankTop);
      ctx.lineTo(m.tankLeft, m.tankBottom - 10);
      ctx.quadraticCurveTo(m.tankLeft, m.tankBottom, m.tankLeft + 10, m.tankBottom);
      ctx.lineTo(m.tankRight - 10, m.tankBottom);
      ctx.quadraticCurveTo(m.tankRight, m.tankBottom, m.tankRight, m.tankBottom - 10);
      if (m.showOverflow) {
        // Overflow spout gap near waterTop
        ctx.lineTo(m.tankRight, m.waterTop + 8);
        ctx.lineTo(m.tankRight + 32, m.waterTop + 20);
        ctx.moveTo(m.tankRight, m.waterTop - 4);
        ctx.lineTo(m.tankRight, m.tankTop);
      } else {
        ctx.lineTo(m.tankRight, m.tankTop);
      }
      ctx.stroke();
      ctx.restore();

      // Baseline vs Risen waterline bracket (Free mode)
      if (!m.showOverflow && tankState.displacedVolumeL > 0.02) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = pal.muted;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(m.tankLeft + 4, m.waterTop);
        ctx.lineTo(m.tankRight - 4, m.waterTop);
        ctx.stroke();
        ctx.setLineDash([]);

        const bX = m.tankRight + 10;
        ctx.strokeStyle = pal.tensionCol;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bX, m.waterTop);
        ctx.lineTo(bX + 6, m.waterTop);
        ctx.moveTo(bX + 6, m.waterTop);
        ctx.lineTo(bX + 6, waterSurfaceY);
        ctx.lineTo(bX, waterSurfaceY);
        ctx.stroke();

        drawPill(ctx, `+${tankState.displacedVolumeL.toFixed(2)} L`, bX + 12, (m.waterTop + waterSurfaceY) / 2, pal.tensionCol, pal, 'left');
        ctx.restore();
      }

      // Overflow catch beaker + scale in Scale mode
      if (m.showOverflow) {
        const cbLeft = m.tankRight + 44;
        const cbW = Math.min(125, m.W - cbLeft - 14);
        const cbBottom = m.tankBottom - 26;
        const cbTop = m.waterTop + 34;
        const cbH = cbBottom - cbTop;

        const maxBeakerL = Math.max(1.0, state.volumeL * 1.15);
        const fillFrac = AP.clamp(tankState.displacedVolumeL / maxBeakerL, 0, 1);
        const fillH = fillFrac * (cbH - 6);

        // Pour stream when fluid displaced
        if (tankState.displacedVolumeL > 0.02) {
          ctx.save();
          ctx.strokeStyle = state.fluidColor;
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(m.tankRight + 28, m.waterTop + 20);
          ctx.quadraticCurveTo(cbLeft + cbW * 0.35, m.waterTop + 24, cbLeft + cbW * 0.35, cbBottom - fillH);
          ctx.stroke();
          ctx.restore();
        }

        // Catch liquid
        if (fillH > 1) {
          ctx.save();
          ctx.fillStyle = state.fluidColor;
          ctx.beginPath();
          ctx.roundRect(cbLeft + 2, cbBottom - fillH, cbW - 4, fillH, [0, 0, 7, 7]);
          ctx.fill();
          ctx.restore();
        }

        // Catch beaker glass
        ctx.save();
        ctx.strokeStyle = pal.glassBorder;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(cbLeft, cbTop, cbW, cbH, [2, 2, 8, 8]);
        ctx.stroke();

        // Digital catch scale pad
        ctx.fillStyle = pal.pillBg;
        ctx.strokeStyle = pal.buoyCol;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(cbLeft - 4, cbBottom + 2, cbW + 8, 26, 7);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = pal.buoyCol;
        ctx.font = '800 10.5px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Overflow = ${tankState.buoyantForceN.toFixed(2)} N`, cbLeft + cbW / 2, cbBottom + 15);

        ctx.fillStyle = pal.muted;
        ctx.font = '700 10px Inter, system-ui, sans-serif';
        ctx.fillText(`Caught: ${tankState.displacedVolumeL.toFixed(2)} L`, cbLeft + cbW / 2, cbTop - 10);
        ctx.restore();
      }

      // Fluid name label inside tank
      ctx.save();
      ctx.fillStyle = pal.ink;
      ctx.font = '700 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${state.fluidName} (${state.fluidDensity.toFixed(2)} g/cm³)`, m.tankRight - 10, m.tankTop + 18);
      ctx.restore();

      // Hydrostatic Pressure Arrows
      if (state.showPressure && state.body.submergedFraction > 0.04) {
        const subTop = Math.max(by, waterSurfaceY);
        const subBot = by + m.blockSize;
        const depthTop = Math.max(2, subTop - waterSurfaceY);
        const depthBot = Math.max(8, subBot - waterSurfaceY);
        const pScale = 0.22;

        // Bottom upward pressure arrows (longest)
        const bLen = AP.clamp(depthBot * pScale + 8, 12, 34);
        [-18, 0, 18].forEach(dx => {
          const ax = m.cx + dx;
          drawArrow(ctx, ax, Math.min(m.tankBottom - 4, subBot + bLen), ax, subBot + 3, pal.pressureCol, 2.2);
        });

        // Top downward pressure arrows (if top face is submerged)
        if (by > waterSurfaceY + 2) {
          const tLen = AP.clamp(depthTop * pScale + 6, 8, 26);
          [-18, 0, 18].forEach(dx => {
            const ax = m.cx + dx;
            drawArrow(ctx, ax, Math.max(waterSurfaceY + 2, by - tLen), ax, by - 3, pal.pressureCol, 2.0);
          });
        }

        // Sideways pressure arrows (grow with depth, cancel symmetrically)
        const midY1 = subTop + (subBot - subTop) * 0.35;
        const midY2 = subTop + (subBot - subTop) * 0.72;
        [midY1, midY2].forEach(py => {
          const len = AP.clamp((py - waterSurfaceY) * pScale + 7, 10, 28);
          drawArrow(ctx, bx - len, py, bx - 3, py, pal.pressureCol, 2.0);
          drawArrow(ctx, bx + m.blockSize + len, py, bx + m.blockSize + 3, py, pal.pressureCol, 2.0);
        });
      }

      // Force Vectors (Weight W, Buoyancy F_b, Normal F_N)
      if (state.showVectors) {
        const fScale = 26;
        const wLen = AP.clamp(Math.sqrt(tankState.weightN / AP.G) * fScale + 12, 16, 62);
        const bLen = tankState.buoyantForceN > 0.05
          ? AP.clamp(Math.sqrt(tankState.buoyantForceN / AP.G) * fScale + 12, 16, 62)
          : 0;

        // Weight downward arrow
        const wStart = by + m.blockSize + 3;
        const wEnd = Math.min(m.H - 12, wStart + wLen);
        if (wEnd - wStart > 6) {
          drawArrow(ctx, m.cx - 8, wStart, m.cx - 8, wEnd, pal.weightCol, 3);
          drawPill(ctx, `W = ${tankState.weightN.toFixed(1)} N`, m.cx - 16, Math.min(m.H - 18, (wStart + wEnd) / 2), pal.weightCol, pal, 'right');
        } else {
          drawPill(ctx, `W = ${tankState.weightN.toFixed(1)} N`, m.cx - 14, state.body.y + 14, pal.weightCol, pal, 'right');
        }

        // Buoyancy upward arrow
        if (bLen > 0) {
          const bStart = by - 3;
          const bEnd = Math.max(14, bStart - bLen);
          drawArrow(ctx, m.cx + 8, bStart, m.cx + 8, bEnd, pal.buoyCol, 3);
          drawPill(ctx, `F_b = ${tankState.buoyantForceN.toFixed(1)} N`, m.cx + 16, Math.max(20, (bStart + bEnd) / 2), pal.buoyCol, pal, 'left');
        }

        // Normal force if resting on floor in Free mode
        if (!m.showOverflow && state.body.onFloor && tankState.normalForceN > 0.1) {
          drawPill(ctx, `Floor F_N = ${tankState.normalForceN.toFixed(1)} N`, m.cx + 16, Math.min(m.H - 16, by + m.blockSize - 6), pal.normalCol, pal, 'left');
        }
      }
    }

    function stepSimulation(dt) {
      const m = getMetrics();
      if (state.mode === 'scale') {
        if (!state.dragging) syncBlockToScaleDip();
      } else if (state.activeDrop && !state.dragging) {
        const res = AP.stepVerticalBody(state.body, {
          blockH: m.blockSize,
          waterTop: m.waterTop,
          tankBottom: m.tankBottom,
          risePerLiter: m.risePerLiter,
          massKg: state.massKg,
          volumeL: state.volumeL,
          fluidDensity: state.fluidDensity,
          viscosity: state.fluidViscosity,
          pxPerMeter: 58
        }, dt);

        state.body.y = res.y;
        state.body.vy = res.vy;
        state.body.inWater = res.inWater;
        state.body.submergedFraction = res.submergedFraction;
        state.body.effectiveWaterTop = res.effectiveWaterTop;
        state.body.onFloor = res.onFloor;

        if (res.justEnteredWater && !reducedMotion) {
          if (surface) surface.impulse(m.tankW / 2, Math.min(340, res.impactSpeed * 1.4), m.blockSize * 0.7);
          if (particles) {
            const count = Math.min(18, Math.max(6, Math.round(res.impactSpeed / 18)));
            for (let i = 0; i < count; i += 1) {
              particles.emit({
                x: m.cx + (Math.random() - 0.5) * m.blockSize,
                y: res.effectiveWaterTop - 2,
                vx: (Math.random() - 0.5) * 120,
                vy: -Math.random() * Math.min(160, res.impactSpeed * 0.7) - 35,
                radius: 2 + Math.random() * 2,
                life: 0.45 + Math.random() * 0.35
              });
            }
          }
        }
        if (state.prediction && !state.predictionChecked && res.submergedFraction > 0.15) {
          updatePredictionBanner(true);
        }
      }
      renderTank(dt);
    }

    // Pointer drag directly inside the tank
    function pointerToCanvas(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }

    canvas.addEventListener('pointerdown', e => {
      const m = getMetrics();
      const pt = pointerToCanvas(e);
      const half = m.blockSize / 2;
      if (Math.abs(pt.x - m.cx) <= half + 18 && Math.abs(pt.y - state.body.y) <= half + 18) {
        state.dragging = true;
        state.activeDrop = true;
        state.dragOffsetY = pt.y - state.body.y;
        canvas.setPointerCapture(e.pointerId);
      }
    });

    canvas.addEventListener('pointermove', e => {
      if (!state.dragging) return;
      const m = getMetrics();
      const pt = pointerToCanvas(e);
      const half = m.blockSize / 2;
      const minY = state.mode === 'scale' ? m.waterTop - half - 14 : half + 12;
      const maxY = state.mode === 'scale' ? m.waterTop + half + 12 : m.tankBottom - half - 4;
      state.body.y = AP.clamp(pt.y - state.dragOffsetY, minY, maxY);
      state.body.vy = 0;
      if (state.mode === 'scale') {
        state.dipPct = Math.round(((state.body.y - minY) / Math.max(1, maxY - minY)) * 100);
        dipSlider.value = String(state.dipPct);
        dipOut.textContent = state.dipPct + '%';
      } else if (surface) {
        const geom = AP.computeImmersionGeometry(state.body.y, m.blockSize, m.waterTop, m.risePerLiter, state.volumeL);
        if (!state.body.inWater && geom.submergedFraction > 0.04) {
          surface.impulse(m.tankW / 2, 120, m.blockSize * 0.6);
        }
        state.body.inWater = geom.submergedFraction > 0.02;
      }
    });

    function stopDrag(e) {
      if (!state.dragging) return;
      state.dragging = false;
      if (e && canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
      if (state.prediction && !state.predictionChecked) updatePredictionBanner(true);
    }

    canvas.addEventListener('pointerup', stopDrag);
    canvas.addEventListener('pointercancel', stopDrag);

    // Controls bindings
    document.querySelectorAll('#ap-obj-grid .ap-obj-btn').forEach(btn => {
      btn.addEventListener('click', () => selectObject(btn.dataset.object));
    });

    function onMassOrVolInput() {
      state.objectId = 'custom';
      state.objectName = 'Custom Block';
      state.icon = '📦';
      state.color = '#7c3aed';
      state.accent = '#4c1d95';
      state.massKg = parseFloat(massSlider.value);
      state.volumeL = parseFloat(volSlider.value);
      syncControlsUI();
      updatePredictionBanner(false);
    }

    massSlider.addEventListener('input', onMassOrVolInput);
    volSlider.addEventListener('input', onMassOrVolInput);

    document.querySelectorAll('#ap-fluid-chips .ap-fluid-btn').forEach(btn => {
      btn.addEventListener('click', () => selectFluid(btn.dataset.fluid));
    });

    fluidSlider.addEventListener('input', () => {
      const val = parseFloat(fluidSlider.value);
      state.fluidId = 'custom';
      state.fluidName = 'Custom Fluid';
      state.fluidDensity = val;
      state.fluidViscosity = val > 1.3 && val < 2.0 ? 0.4 : 0.1;
      state.fluidColor = val > 8 ? 'rgba(169, 184, 196, 0.80)' : 'rgba(14, 165, 233, 0.54)';
      state.fluidDeepColor = val > 8 ? 'rgba(71, 85, 105, 0.94)' : 'rgba(3, 105, 161, 0.82)';
      state.fluidSurfaceColor = 'rgba(224, 242, 254, 0.90)';
      syncControlsUI();
      updatePredictionBanner(false);
    });

    document.querySelectorAll('.ap-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.mode = btn.dataset.tankMode;
        syncControlsUI();
        resetBlockPosition();
      });
    });

    dipSlider.addEventListener('input', () => {
      state.dipPct = parseInt(dipSlider.value, 10) || 0;
      dipOut.textContent = state.dipPct + '%';
      syncBlockToScaleDip();
      if (state.prediction && !state.predictionChecked && state.dipPct > 15) updatePredictionBanner(true);
    });

    toggleVectors.addEventListener('change', () => { state.showVectors = toggleVectors.checked; });
    togglePressure.addEventListener('change', () => { state.showPressure = togglePressure.checked; });

    document.querySelectorAll('.ap-predict-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.prediction = btn.dataset.predict;
        state.predictionChecked = false;
        document.querySelectorAll('.ap-predict-btn').forEach(b => b.classList.toggle('selected', b === btn));
        updatePredictionBanner(false);
      });
    });

    dropBtn.addEventListener('click', () => {
      if (state.mode === 'scale') {
        state.dipPct = 100;
        dipSlider.value = '100';
        dipOut.textContent = '100%';
        syncBlockToScaleDip();
      } else {
        const m = getMetrics();
        state.body.y = Math.max(m.blockSize / 2 + 12, m.waterTop - m.blockSize / 2 - 28);
        state.body.vy = 0;
        state.body.inWater = false;
        state.body.onFloor = false;
        state.activeDrop = true;
      }
      if (state.prediction) updatePredictionBanner(true);
    });

    resetBtn.addEventListener('click', () => {
      state.prediction = null;
      document.querySelectorAll('.ap-predict-btn').forEach(b => b.classList.remove('selected'));
      resetBlockPosition();
    });

    logBtn.addEventListener('click', () => {
      const calc = AP.computeTankState({
        massKg: state.massKg,
        volumeL: state.volumeL,
        fluidDensity: state.fluidDensity,
        submergedFraction: state.body.submergedFraction
      });
      const emptyRow = trialTbody.querySelector('.ap-trial-empty');
      if (emptyRow) emptyRow.remove();

      const tr = document.createElement('tr');
      const statusText = calc.status === 'float' ? 'Floats' : calc.status === 'neutral' ? 'Neutral' : 'Sinks';
      tr.innerHTML = `
        <td>${state.icon} ${state.objectName}</td>
        <td>${state.fluidName}</td>
        <td>${calc.density.toFixed(2)} / ${state.fluidDensity.toFixed(2)}</td>
        <td>${calc.displacedVolumeL.toFixed(2)} L</td>
        <td>${calc.buoyantForceN.toFixed(2)} N / ${calc.weightN.toFixed(2)} N</td>
        <td><span class="ap-status-pill is-${calc.status}">${statusText}</span></td>
      `;
      trialTbody.prepend(tr);
    });

    clearTrialsBtn.addEventListener('click', () => {
      trialTbody.innerHTML = '<tr class="ap-trial-empty"><td colspan="6">Click <strong>Log Trial</strong> after a test to record mass, displaced volume, and forces here.</td></tr>';
    });

    // Guided scenario buttons
    document.querySelectorAll('.ap-scenarios .ap-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.ap-scenarios .ap-chip-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const sc = btn.dataset.scenario;
        if (sc === 'iceberg') {
          state.mode = 'free';
          selectObject('ice');
          selectFluid('water');
          state.activeDrop = true;
        } else if (sc === 'deadsea') {
          state.mode = 'free';
          selectObject('egg');
          selectFluid('deadsea');
          state.activeDrop = true;
        } else if (sc === 'mercury') {
          state.mode = 'free';
          selectObject('steel');
          selectFluid('mercury');
          state.activeDrop = true;
        } else if (sc === 'eureka') {
          state.mode = 'scale';
          selectObject('granite');
          selectFluid('water');
          state.dipPct = 100;
          dipSlider.value = '100';
          dipOut.textContent = '100%';
          syncBlockToScaleDip();
        }
      });
    });

    syncControlsUI();
    resetBlockPosition();
    window.SimKit.loop(stepSimulation, { el: wrap, maxDt: 0.04 });

    return {
      loadCustomMaterial(material, fluidId) {
        if (fluidId) selectFluid(fluidId);
        if (material.kind === 'object') {
          selectObject(material.id);
        } else {
          state.objectId = material.id;
          state.objectName = material.name;
          state.icon = material.icon;
          state.color = '#0ea5e9';
          state.accent = '#0369a1';
          state.massKg = material.massKg;
          state.volumeL = material.volumeL;
          syncControlsUI();
          resetBlockPosition();
        }
        state.mode = 'free';
        syncControlsUI();
        state.activeDrop = true;
      }
    };
  }

  /* ========================================================================
     LAB 2: KING HIERO'S CROWN HYDROSTATIC BALANCE
     ======================================================================== */
  function initCrownLab() {
    const canvas = document.getElementById('ap-crown-canvas');
    if (!canvas || !window.SimKit) return;

    const immSlider = document.getElementById('ap-crown-immersion');
    const immOut = document.getElementById('ap-crown-immersion-out');
    const airBtn = document.getElementById('ap-crown-air-btn');
    const subBtn = document.getElementById('ap-crown-sub-btn');
    const crownLabelEl = document.getElementById('ap-c-crown-label');

    const refVolEl = document.getElementById('ap-c-ref-vol');
    const refFbEl = document.getElementById('ap-c-ref-fb');
    const refAppEl = document.getElementById('ap-c-ref-app');
    const crownVolEl = document.getElementById('ap-c-crown-vol');
    const crownFbEl = document.getElementById('ap-c-crown-fb');
    const crownAppEl = document.getElementById('ap-c-crown-app');
    const crownRhoEl = document.getElementById('ap-c-crown-rho');
    const guessInput = document.getElementById('ap-crown-guess');
    const feedbackEl = document.getElementById('ap-crown-feedback');

    const wrap = canvas.parentElement;
    const c2d = window.SimKit.canvas2d(canvas, {});

    const state = {
      caseKey: 'suspect',
      goldFraction: 0.70,
      immersion: 0,
      targetImmersion: 0,
      currentTilt: 0
    };

    function pickMysteryFraction() {
      const options = [1.0, 0.85, 0.75, 0.65, 0.55, 0.45, 0.35];
      return options[Math.floor(Math.random() * options.length)];
    }

    function setCase(key) {
      state.caseKey = key;
      if (key === 'pure') state.goldFraction = 1.0;
      else if (key === 'suspect') state.goldFraction = 0.70;
      else if (key === 'fraud') state.goldFraction = 0.35;
      else state.goldFraction = pickMysteryFraction();

      crownLabelEl.textContent =
        key === 'pure' ? 'Pure Gold (100%)' :
        key === 'suspect' ? 'Suspect Crown (70/30)' :
        key === 'fraud' ? 'Heavy Fraud (35/65)' : 'Mystery Crown';

      document.querySelectorAll('.ap-crown-cases .ap-chip-btn').forEach(btn => {
        const active = btn.dataset.crownCase === key;
        btn.classList.toggle('selected', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      feedbackEl.className = 'ap-feedback';
      feedbackEl.textContent = '';
      if (guessInput) guessInput.value = '';
    }

    function updateReadouts(alloy) {
      const imm = state.immersion / 100;
      const refDisp = alloy.refVolumeCm3 * imm;
      const crownDisp = alloy.volumeCm3 * imm;
      const refFb = alloy.refBuoyantForceN * imm;
      const crownFb = alloy.buoyantForceN * imm;
      const refApp = alloy.airWeightN - refFb;
      const crownApp = alloy.airWeightN - crownFb;

      refVolEl.textContent = `${refDisp.toFixed(1)} mL`;
      refFbEl.textContent = `${refFb.toFixed(2)} N`;
      refAppEl.textContent = `${refApp.toFixed(2)} N`;

      crownVolEl.textContent = `${crownDisp.toFixed(1)} mL`;
      crownFbEl.textContent = `${crownFb.toFixed(2)} N`;
      crownAppEl.textContent = `${crownApp.toFixed(2)} N`;
      crownRhoEl.textContent = imm > 0.25 ? `${alloy.density.toFixed(2)} g/cm³` : 'Submerge to measure';
    }

    function drawCrownSilhouette(ctx, cx, cy, scale) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-24, 14);
      ctx.lineTo(-28, -10);
      ctx.lineTo(-14, 2);
      ctx.lineTo(0, -18);
      ctx.lineTo(14, 2);
      ctx.lineTo(28, -10);
      ctx.lineTo(24, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Crown jewels
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, -2, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(-14, 6, 2.5, 0, Math.PI * 2);
      ctx.arc(14, 6, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function tick(dt) {
      if (Math.abs(state.targetImmersion - state.immersion) > 0.2) {
        const step = reducedMotion ? 100 : 120 * dt;
        if (state.targetImmersion > state.immersion) state.immersion = Math.min(state.targetImmersion, state.immersion + step);
        else state.immersion = Math.max(state.targetImmersion, state.immersion - step);
        immSlider.value = String(Math.round(state.immersion));
        immOut.textContent = state.immersion < 2 ? '0% (In Air)' : `${Math.round(state.immersion)}% Submerged`;
      }

      const alloy = AP.computeCrownAlloy({ massG: 1000, goldFraction: state.goldFraction, fluidDensity: 1.0 });
      updateReadouts(alloy);

      const imm = state.immersion / 100;
      const targetTilt = alloy.torqueBalanceDeg * imm;
      state.currentTilt += (targetTilt - state.currentTilt) * Math.min(1, dt * 8);

      const W = c2d.width || 700;
      const H = c2d.height || 350;
      const ctx = c2d.ctx;
      const pal = palette();

      ctx.clearRect(0, 0, W, H);
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, pal.bg);
      bgGrad.addColorStop(1, pal.bgGradBottom);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      const pivotX = W / 2;
      const pivotY = 58;
      const armSpan = Math.min(195, W * 0.27);
      const tiltRad = (-state.currentTilt * Math.PI) / 180; // negative tilts left side down

      // Balance pillar
      ctx.save();
      ctx.strokeStyle = pal.beamCol;
      ctx.fillStyle = pal.beamCol;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(pivotX, H - 22);
      ctx.stroke();

      ctx.beginPath();
      ctx.roundRect(pivotX - 46, H - 28, 92, 10, 5);
      ctx.fill();

      // Tilting beam
      const lx = pivotX - Math.cos(tiltRad) * armSpan;
      const ly = pivotY - Math.sin(tiltRad) * armSpan;
      const rx = pivotX + Math.cos(tiltRad) * armSpan;
      const ry = pivotY + Math.sin(tiltRad) * armSpan;

      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(rx, ry);
      ctx.stroke();

      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Beakers geometry
      const beakerW = Math.min(130, W * 0.22);
      const beakerH = 128;
      const beakerTop = H - 26 - beakerH;
      const baseWaterTop = beakerTop + 44;

      function drawSide(cx, beamY, isCrown) {
        const dispVol = (isCrown ? alloy.volumeCm3 : alloy.refVolumeCm3) * imm;
        const appW = isCrown ? (alloy.airWeightN - alloy.buoyantForceN * imm) : (alloy.airWeightN - alloy.refBuoyantForceN * imm);
        const fb = (isCrown ? alloy.buoyantForceN : alloy.refBuoyantForceN) * imm;
        const risePx = dispVol * 0.34;
        const waterLineY = baseWaterTop - risePx;

        // Hanging cord & object Y
        const highY = beakerTop - 28;
        const lowY = beakerTop + 80;
        const objY = highY + (lowY - highY) * imm + (beamY - pivotY) * 0.65;

        ctx.save();
        ctx.strokeStyle = pal.muted;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(cx, beamY);
        ctx.lineTo(cx, objY - 16);
        ctx.stroke();
        ctx.restore();

        // Object
        if (isCrown) {
          drawCrownSilhouette(ctx, cx, objY, 1.0);
        } else {
          ctx.save();
          ctx.fillStyle = '#facc15';
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(cx - 22, objY - 14, 44, 28, 5);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#451a03';
          ctx.font = '800 9.5px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('1 kg Au', cx, objY + 3);
          ctx.restore();
        }

        // Beaker water
        const bLeft = cx - beakerW / 2;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(bLeft + 2, beakerTop, beakerW - 4, beakerH - 2, [0, 0, 10, 10]);
        ctx.clip();

        ctx.fillStyle = 'rgba(56, 189, 248, 0.44)';
        ctx.fillRect(bLeft, waterLineY, beakerW, beakerTop + beakerH - waterLineY);

        ctx.strokeStyle = '#7dd3fc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bLeft, waterLineY);
        ctx.lineTo(bLeft + beakerW, waterLineY);
        ctx.stroke();
        ctx.restore();

        // Baseline mark
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = pal.muted;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(bLeft + 4, baseWaterTop);
        ctx.lineTo(bLeft + beakerW - 4, baseWaterTop);
        ctx.stroke();
        ctx.setLineDash([]);

        // Beaker walls
        ctx.strokeStyle = pal.glassBorder;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.roundRect(bLeft, beakerTop, beakerW, beakerH, [2, 2, 10, 10]);
        ctx.stroke();
        ctx.restore();

        if (imm > 0.05) {
          drawArrow(ctx, cx + 26, objY + 14, cx + 26, objY - 8 - fb * 18, pal.buoyCol, 2.5);
          drawPill(ctx, `+${dispVol.toFixed(1)} mL`, cx, beakerTop + beakerH - 18, pal.tensionCol, pal, 'center');
        }
        drawPill(ctx, `${appW.toFixed(2)} N`, cx, Math.max(24, beamY - 22), pal.ink, pal, 'center');
      }

      drawSide(lx, ly, false);
      drawSide(rx, ry, true);

      // Center verdict hint between beakers
      const extra = (alloy.extraVolumeCm3 * imm);
      const centerMsg = imm < 0.1
        ? 'Equal 9.81 N in Air'
        : Math.abs(extra) < 0.5
          ? 'Equal Displacement → Pure Gold'
          : `Crown displaces +${extra.toFixed(1)} mL more!`;
      drawPill(ctx, centerMsg, pivotX, beakerTop - 16, Math.abs(extra) < 0.5 ? pal.buoyCol : pal.normalCol, pal, 'center');
    }

    document.querySelectorAll('.ap-crown-cases .ap-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => setCase(btn.dataset.crownCase));
    });

    immSlider.addEventListener('input', () => {
      state.targetImmersion = parseFloat(immSlider.value);
      state.immersion = state.targetImmersion;
      immOut.textContent = state.immersion < 2 ? '0% (In Air)' : `${Math.round(state.immersion)}% Submerged`;
    });

    airBtn.addEventListener('click', () => { state.targetImmersion = 0; });
    subBtn.addEventListener('click', () => { state.targetImmersion = 100; });

    document.querySelectorAll('[data-crown-verdict]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (state.immersion < 25) {
          feedbackEl.className = 'ap-feedback wrong';
          feedbackEl.textContent = 'Submerge both objects in water first to compare displacement!';
          return;
        }
        const alloy = AP.computeCrownAlloy({ massG: 1000, goldFraction: state.goldFraction, fluidDensity: 1.0 });
        const pick = btn.dataset.crownVerdict;
        const correctPick = alloy.isPureGold ? 'pure' : 'alloy';
        const truePct = Math.round(state.goldFraction * 100);
        const estRaw = parseFloat(guessInput.value);
        let pctMsg = `Actual composition: ${truePct}% Gold / ${100 - truePct}% Silver (ρ = ${alloy.density.toFixed(2)} g/cm³).`;
        if (!isNaN(estRaw)) {
          const diff = Math.abs(estRaw - truePct);
          pctMsg += diff <= 8 ? ` Your estimate (${estRaw}%) was spot on!` : ` You estimated ${estRaw}%.`;
        }

        if (pick === correctPick) {
          feedbackEl.className = 'ap-feedback correct';
          feedbackEl.textContent = `✓ Correct! ${pctMsg}`;
        } else {
          feedbackEl.className = 'ap-feedback wrong';
          feedbackEl.textContent = `✗ Look closely at the displaced water volume. ${pctMsg}`;
        }
      });
    });

    setCase('suspect');
    window.SimKit.loop(tick, { el: wrap, maxDt: 0.04 });
  }

  /* ========================================================================
     LAB 3: SHIPS, HULL SHAPE & SUBMARINE BALLAST
     ======================================================================== */
  function initShipsSubLab() {
    const canvas = document.getElementById('ap-ships-canvas');
    if (!canvas || !window.SimKit) return;

    const tabHull = document.getElementById('ap-tab-hull');
    const tabSub = document.getElementById('ap-tab-sub');
    const paneHull = document.getElementById('ap-pane-hull');
    const paneSub = document.getElementById('ap-pane-sub');

    const hollowSlider = document.getElementById('ap-hull-hollow');
    const hollowOut = document.getElementById('ap-hull-hollow-out');
    const cargoSlider = document.getElementById('ap-hull-cargo');
    const cargoOut = document.getElementById('ap-hull-cargo-out');
    const plimsollBtn = document.getElementById('ap-plimsoll-preset');

    const ballastSlider = document.getElementById('ap-sub-ballast');
    const ballastOut = document.getElementById('ap-sub-ballast-out');
    const floodBtn = document.getElementById('ap-sub-flood');
    const neutralBtn = document.getElementById('ap-sub-neutral');
    const blowBtn = document.getElementById('ap-sub-blow');
    const challengeEl = document.getElementById('ap-sub-challenge');

    const lbl1 = document.getElementById('ap-s-lbl1');
    const val1 = document.getElementById('ap-s-val1');
    const lbl2 = document.getElementById('ap-s-lbl2');
    const val2 = document.getElementById('ap-s-val2');
    const lbl3 = document.getElementById('ap-s-lbl3');
    const val3 = document.getElementById('ap-s-val3');
    const lbl4 = document.getElementById('ap-s-lbl4');
    const val4 = document.getElementById('ap-s-val4');

    const wrap = canvas.parentElement;
    const c2d = window.SimKit.canvas2d(canvas, {});

    const WATERWAYS = {
      fresh: { name: 'Freshwater River', density: 1.000 },
      ocean: { name: 'Ocean Seawater', density: 1.025 },
      deadsea: { name: 'Dead Sea Brine', density: 1.240 }
    };

    const shipSurface = window.LiquidEngine ? new window.LiquidEngine.Surface({
      width: 600,
      restY: 0,
      columns: 72,
      material: 'water'
    }) : null;

    const state = {
      tab: 'hull', // 'hull' | 'sub'
      hollowness: 0.75,
      cargoTons: 300,
      waterway: 'ocean',
      shipDraftRender: 0.54,
      ballastPct: 48.8,
      prevBallastPct: 48.8,
      subDepthM: 90,
      subVelM: 0,
      hoverTimer: 0,
      hoverDone: false,
      bubbles: [],
      wavePhase: 0
    };

    function switchTab(mode) {
      state.tab = mode;
      const isHull = mode === 'hull';
      tabHull.classList.toggle('selected', isHull);
      tabHull.setAttribute('aria-selected', isHull ? 'true' : 'false');
      tabSub.classList.toggle('selected', !isHull);
      tabSub.setAttribute('aria-selected', !isHull ? 'true' : 'false');
      paneHull.hidden = !isHull;
      paneSub.hidden = isHull;
    }

    function updateHullTelemetry(hull) {
      lbl1.textContent = 'Average Density';
      val1.textContent = `${hull.avgDensity.toFixed(2)} g/cm³`;
      val1.className = 'ap-tele-val';

      lbl2.textContent = 'Draft Submerged';
      val2.textContent = `${Math.min(100, Math.round(hull.draftFraction * 100))}%`;
      val2.className = 'ap-tele-val';

      lbl3.textContent = 'Freeboard Margin';
      val3.textContent = `${Math.round(hull.freeboardPct)}%`;
      val3.className = 'ap-tele-val';

      lbl4.textContent = 'Load Status';
      val4.className = 'ap-tele-val';
      if (hull.status === 'sunk') {
        val4.textContent = 'Sunk ✗';
        val4.classList.add('is-sink');
      } else if (hull.status === 'overloaded') {
        val4.textContent = 'Plimsoll Warning!';
        val4.classList.add('is-warn');
      } else {
        val4.textContent = 'Safe Float ✓';
        val4.classList.add('is-float');
      }
    }

    function updateSubTelemetry(sub) {
      lbl1.textContent = 'Average Density';
      val1.textContent = `${sub.avgDensity.toFixed(3)} g/cm³`;
      val1.className = 'ap-tele-val';

      lbl2.textContent = 'Depth';
      val2.textContent = `${Math.round(state.subDepthM)} m`;
      val2.className = 'ap-tele-val';

      lbl3.textContent = 'Hull Pressure';
      val3.textContent = `${sub.pressureAtm.toFixed(1)} atm`;
      val3.className = 'ap-tele-val';

      lbl4.textContent = 'Buoyancy Trim';
      val4.className = 'ap-tele-val';
      if (sub.state === 'neutral') {
        val4.textContent = 'Neutral Hover ⚖';
        val4.classList.add('is-float');
      } else if (sub.state === 'positive') {
        val4.textContent = 'Positive (Rising ↑)';
        val4.classList.add('is-warn');
      } else {
        val4.textContent = 'Negative (Diving ↓)';
        val4.classList.add('is-sink');
      }
    }

    function drawHullMode(ctx, W, H, dt, pal) {
      const ww = WATERWAYS[state.waterway];
      const hull = AP.computeShipHull({
        hullMassTons: 500,
        hollowness: state.hollowness,
        cargoTons: state.cargoTons,
        fluidDensity: ww.density
      });
      updateHullTelemetry(hull);

      const targetDraft = hull.status === 'sunk' ? 1.55 : AP.clamp(hull.draftFraction, 0.08, 1.0);
      state.shipDraftRender += (targetDraft - state.shipDraftRender) * Math.min(1, dt * 5);

      const waterY = Math.round(H * 0.54);
      const seaFloorY = H - 22;

      // Sky background
      const sky = ctx.createLinearGradient(0, 0, 0, waterY);
      sky.addColorStop(0, pal.skyTop);
      sky.addColorStop(1, pal.skyBot);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, waterY);

      // Hull cross-section dimensions morphing with hollowness
      const hullW = 68 + state.hollowness * 170;
      const hullH = 38 + state.hollowness * 52;
      const maxShipTop = seaFloorY - hullH - 4;
      const rawShipTop = waterY - hullH * (1 - state.shipDraftRender);
      const shipTop = Math.min(maxShipTop, rawShipTop);
      const cx = W / 2;

      // Cargo containers stacked inside/above deck
      const containers = Math.round(state.cargoTons / 100);
      if (state.hollowness > 0.12 && containers > 0) {
        const cols = 4;
        const cw = Math.min(34, (hullW - 28) / cols - 4);
        const ch = 12;
        const paletteBox = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'];
        for (let i = 0; i < containers; i += 1) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = cx - (cols * (cw + 4)) / 2 + col * (cw + 4) + 2;
          const y = shipTop + 14 - row * (ch + 2);
          ctx.fillStyle = paletteBox[i % paletteBox.length];
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(x, y, cw, ch, 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      // Steel outer hull trapezoid
      const topHalf = hullW / 2;
      const botHalf = topHalf * (0.68 + (1 - state.hollowness) * 0.25);
      ctx.save();
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - topHalf, shipTop);
      ctx.lineTo(cx + topHalf, shipTop);
      ctx.lineTo(cx + botHalf, shipTop + hullH);
      ctx.lineTo(cx - botHalf, shipTop + hullH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Trapped air interior cavity
      if (state.hollowness > 0.08) {
        const pad = 9;
        ctx.fillStyle = isDarkTheme ? '#1e293b' : '#f1f5f9';
        ctx.beginPath();
        ctx.moveTo(cx - topHalf + pad, shipTop + 6);
        ctx.lineTo(cx + topHalf - pad, shipTop + 6);
        ctx.lineTo(cx + botHalf - pad, shipTop + hullH - pad);
        ctx.lineTo(cx - botHalf + pad, shipTop + hullH - pad);
        ctx.closePath();
        ctx.fill();
      }

      // Plimsoll Load Line mark on hull side (at 78% draft)
      const plimsollY = shipTop + hullH * (1 - 0.78);
      ctx.strokeStyle = hull.status === 'overloaded' || hull.status === 'sunk' ? '#ef4444' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + topHalf * 0.65, plimsollY, 7, 0, Math.PI * 2);
      ctx.moveTo(cx + topHalf * 0.65 - 12, plimsollY);
      ctx.lineTo(cx + topHalf * 0.65 + 12, plimsollY);
      ctx.stroke();
      ctx.restore();

      // Animated wave water layer (LiquidEngine.Surface + gentle ocean swell)
      if (!reducedMotion) state.wavePhase += dt * 2.0;
      if (shipSurface) {
        shipSurface.configure(W, 0, 72);
        shipSurface.update(reducedMotion ? 0 : dt);
      }
      ctx.save();
      const wGrad = ctx.createLinearGradient(0, waterY, 0, H);
      wGrad.addColorStop(0, state.waterway === 'fresh' ? 'rgba(56, 189, 248, 0.56)' : state.waterway === 'deadsea' ? 'rgba(14, 165, 233, 0.62)' : 'rgba(20, 184, 166, 0.58)');
      wGrad.addColorStop(1, 'rgba(7, 89, 133, 0.88)');
      ctx.fillStyle = wGrad;
      ctx.beginPath();
      const cols = shipSurface ? shipSurface.columns : null;
      if (cols && cols.length) {
        for (let i = 0; i < cols.length; i += 1) {
          const x = (i / (cols.length - 1)) * W;
          const swell = reducedMotion ? 0 : Math.sin(x * 0.025 + state.wavePhase) * 2.2;
          const wy = waterY + swell + (reducedMotion ? 0 : cols[i].y);
          if (i === 0) ctx.moveTo(x, wy);
          else ctx.lineTo(x, wy);
        }
      } else {
        for (let x = 0; x <= W; x += 12) {
          const wy = waterY + (reducedMotion ? 0 : Math.sin(x * 0.03 + state.wavePhase) * 3);
          if (x === 0) ctx.moveTo(x, wy);
          else ctx.lineTo(x, wy);
        }
      }
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Seafloor strip
      ctx.fillStyle = isDarkTheme ? '#334155' : '#94a3b8';
      ctx.fillRect(0, seaFloorY, W, H - seaFloorY);

      drawPill(ctx, `${ww.name} (${ww.density.toFixed(3)} g/cm³)`, 14, waterY + 22, pal.ink, pal, 'left');
      drawPill(ctx, `Hull Avg ρ = ${hull.avgDensity.toFixed(2)} g/cm³`, W - 14, 24, hull.status === 'safe' ? pal.buoyCol : pal.weightCol, pal, 'right');
    }

    function drawSubMode(ctx, W, H, dt, pal) {
      const sub = AP.computeSubmarine({
        ballastPct: state.ballastPct,
        depthM: state.subDepthM,
        fluidDensity: 1.025
      });

      // Vertical submarine kinematics
      const accM = -sub.netBuoyancyRatio * 34;
      state.subVelM += accM * dt;
      state.subVelM *= Math.exp(-1.9 * dt);
      state.subDepthM = AP.clamp(state.subDepthM + state.subVelM * dt, 0, 260);

      // Update challenge timer (110–150 m neutral hover for 3s)
      if (!state.hoverDone) {
        if (state.subDepthM >= 110 && state.subDepthM <= 150 && sub.state === 'neutral' && Math.abs(state.subVelM) < 2.0) {
          state.hoverTimer += dt;
          if (state.hoverTimer >= 3.0) {
            state.hoverDone = true;
            challengeEl.classList.add('is-complete');
            challengeEl.innerHTML = '<strong>✓ Mission Complete!</strong> You held neutral buoyancy inside 110–150 m by matching seawater density (1.025 g/cm³).';
          } else {
            challengeEl.innerHTML = `<strong>Holding steady…</strong> ${(3.0 - state.hoverTimer).toFixed(1)} s remaining inside target zone!`;
          }
        } else {
          state.hoverTimer = 0;
        }
      }

      // Emit bubbles when blowing tanks
      if (state.ballastPct < state.prevBallastPct - 0.1 && !reducedMotion) {
        for (let i = 0; i < 4; i += 1) {
          state.bubbles.push({
            x: W / 2 + (Math.random() - 0.5) * 90,
            y: 44 + (state.subDepthM / 260) * (H - 86),
            vy: -45 - Math.random() * 35,
            r: 2 + Math.random() * 2.5,
            life: 1.2
          });
        }
      }
      state.prevBallastPct = state.ballastPct;
      state.bubbles.forEach(b => { b.y += b.vy * dt; b.life -= dt; });
      state.bubbles = state.bubbles.filter(b => b.life > 0 && b.y > 26);

      const finalSub = AP.computeSubmarine({ ballastPct: state.ballastPct, depthM: state.subDepthM, fluidDensity: 1.025 });
      updateSubTelemetry(finalSub);

      // Ocean depth backdrop
      const surfaceY = 34;
      const seaGrad = ctx.createLinearGradient(0, surfaceY, 0, H);
      seaGrad.addColorStop(0, '#0ea5e9');
      seaGrad.addColorStop(0.5, '#0369a1');
      seaGrad.addColorStop(1, '#082f49');
      ctx.fillStyle = pal.skyTop;
      ctx.fillRect(0, 0, W, surfaceY);
      ctx.fillStyle = seaGrad;
      ctx.fillRect(0, surfaceY, W, H - surfaceY);

      const depthToY = d => surfaceY + (d / 260) * (H - surfaceY - 34);

      // Target hover band 110–150 m
      const bandTop = depthToY(110);
      const bandBot = depthToY(150);
      ctx.save();
      ctx.fillStyle = 'rgba(74, 222, 128, 0.16)';
      ctx.fillRect(0, bandTop, W, bandBot - bandTop);
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.55)';
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(0, bandTop);
      ctx.lineTo(W, bandTop);
      ctx.moveTo(0, bandBot);
      ctx.lineTo(W, bandBot);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#bbf7d0';
      ctx.font = '700 10.5px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Target Hover Band (110–150 m)', W - 14, bandTop + 14);
      ctx.restore();

      // Depth axis labels
      ctx.save();
      ctx.fillStyle = 'rgba(224, 242, 254, 0.85)';
      ctx.font = '700 10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      [0, 50, 100, 150, 200, 250].forEach(d => {
        const y = depthToY(d);
        ctx.fillText(`${d} m`, 10, y + 3);
      });
      ctx.restore();

      // Submarine cutaway body
      const cx = W / 2;
      const subY = depthToY(state.subDepthM);
      ctx.save();
      ctx.translate(cx, subY);

      // Conning tower
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-22, -34, 42, 18, [6, 6, 0, 0]);
      ctx.fill();
      ctx.stroke();

      // Main hull
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(-92, -18, 184, 38, 19);
      ctx.fill();
      ctx.stroke();

      // Fore & aft ballast tanks cutaway
      const waterFrac = state.ballastPct / 100;
      [-58, 30].forEach(tx => {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(tx, -11, 28, 24, 5);
        ctx.fill();

        const fillH = 24 * waterFrac;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.roundRect(tx + 1, 13 - fillH, 26, fillH, [0, 0, 4, 4]);
        ctx.fill();
      });

      // Cabin window
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(-8, 0, 6, 0, Math.PI * 2);
      ctx.arc(10, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Bubbles
      ctx.save();
      ctx.fillStyle = 'rgba(224, 242, 254, 0.8)';
      state.bubbles.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      drawPill(ctx, `Ballast: ${state.ballastPct.toFixed(1)}% · Sub ρ = ${finalSub.avgDensity.toFixed(3)} g/cm³`, W - 14, 20, pal.ink, pal, 'right');
    }

    function tick(dt) {
      const W = c2d.width || 600;
      const H = c2d.height || 360;
      const pal = palette();
      c2d.ctx.clearRect(0, 0, W, H);
      if (state.tab === 'hull') drawHullMode(c2d.ctx, W, H, dt, pal);
      else drawSubMode(c2d.ctx, W, H, dt, pal);
    }

    tabHull.addEventListener('click', () => switchTab('hull'));
    tabSub.addEventListener('click', () => switchTab('sub'));

    hollowSlider.addEventListener('input', () => {
      state.hollowness = parseInt(hollowSlider.value, 10) / 100;
      hollowOut.textContent = `${hollowSlider.value}%`;
    });

    cargoSlider.addEventListener('input', () => {
      state.cargoTons = parseInt(cargoSlider.value, 10);
      cargoOut.textContent = `${state.cargoTons} t`;
      if (shipSurface && !reducedMotion) shipSurface.impulse((c2d.width || 600) / 2, 70, 90);
    });

    document.querySelectorAll('.ap-waterway-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.waterway = btn.dataset.waterway;
        document.querySelectorAll('.ap-waterway-btn').forEach(b => {
          const active = b === btn;
          b.classList.toggle('selected', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
      });
    });

    plimsollBtn.addEventListener('click', () => {
      state.hollowness = 0.75;
      state.cargoTons = 650;
      state.waterway = 'ocean';
      hollowSlider.value = '75';
      hollowOut.textContent = '75%';
      cargoSlider.value = '650';
      cargoOut.textContent = '650 t';
      document.querySelectorAll('.ap-waterway-btn').forEach(b => {
        const active = b.dataset.waterway === 'ocean';
        b.classList.toggle('selected', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    });

    ballastSlider.addEventListener('input', () => {
      state.ballastPct = parseFloat(ballastSlider.value);
      ballastOut.textContent = `${state.ballastPct.toFixed(1)}%`;
    });

    floodBtn.addEventListener('click', () => {
      state.ballastPct = 90;
      ballastSlider.value = '90';
      ballastOut.textContent = '90.0%';
    });

    neutralBtn.addEventListener('click', () => {
      state.ballastPct = 48.8;
      ballastSlider.value = '48.8';
      ballastOut.textContent = '48.8%';
    });

    blowBtn.addEventListener('click', () => {
      state.ballastPct = 10;
      ballastSlider.value = '10';
      ballastOut.textContent = '10.0%';
    });

    window.SimKit.loop(tick, { el: wrap, maxDt: 0.04 });
  }

  /* ========================================================================
     INTERACTIVE DENSITY COMPARISON TABLE
     ======================================================================== */
  function initDensityTable(tankApi) {
    const tbody = document.getElementById('ap-density-tbody');
    const fluidCol = document.getElementById('ap-table-fluid-col');
    if (!tbody) return;

    let currentFluidId = 'water';

    function barPct(density) {
      return Math.min(100, (Math.log10(1 + density) / Math.log10(1 + 20)) * 100);
    }

    function render() {
      const fluid = AP.findFluid(currentFluidId);
      fluidCol.textContent = `Result in ${fluid.name} (${fluid.density.toFixed(2)})`;
      const tickPct = barPct(fluid.density);

      tbody.innerHTML = '';
      AP.REFERENCE_MATERIALS.forEach(mat => {
        const calc = AP.computeTankState({
          massKg: mat.massKg,
          volumeL: mat.volumeL,
          fluidDensity: fluid.density,
          submergedFraction: 1
        });
        const fillPct = barPct(mat.density);
        let badgeText = 'Sinks ✗';
        if (calc.status === 'float') badgeText = `Floats (${Math.round(calc.eqSubmergedFraction * 100)}% sub)`;
        else if (calc.status === 'neutral') badgeText = 'Neutral (100%)';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${mat.icon} <strong>${mat.name}</strong></td>
          <td>${mat.density.toFixed(2)}</td>
          <td>
            <div class="ap-bar-track" aria-hidden="true">
              <div class="ap-bar-fill is-${calc.status}" style="width:${fillPct.toFixed(1)}%"></div>
              <div class="ap-bar-tick" style="left:${tickPct.toFixed(1)}%" title="${fluid.name} threshold"></div>
            </div>
          </td>
          <td><span class="ap-status-pill is-${calc.status}">${badgeText}</span></td>
          <td><button type="button" class="ap-test-row-btn">Test in Tank →</button></td>
        `;
        tr.querySelector('.ap-test-row-btn').addEventListener('click', () => {
          if (tankApi) tankApi.loadCustomMaterial(mat, currentFluidId);
          document.getElementById('buoyancy-lab')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
        });
        tbody.appendChild(tr);
      });
    }

    document.querySelectorAll('[data-table-fluid]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentFluidId = btn.dataset.tableFluid;
        document.querySelectorAll('[data-table-fluid]').forEach(b => {
          const active = b === btn;
          b.classList.toggle('selected', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        render();
      });
    });

    render();
  }

  /* ========================================================================
     PRACTICE PROBLEMS & SCORE TRACKER
     ======================================================================== */
  function initPractice() {
    const scoreEl = document.getElementById('ap-practice-score');
    const solved = new Set();

    function updateScore() {
      if (scoreEl) scoreEl.textContent = `Solved: ${solved.size} / 7`;
    }

    // Problem 1 (Multiple choice)
    document.querySelectorAll('[data-mc="1"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const fb = document.getElementById('afb-1');
        const hint = document.getElementById('ahint-1');
        document.querySelectorAll('[data-mc="1"]').forEach(b => b.classList.toggle('selected', b === btn));
        fb.className = 'ap-feedback';
        if (btn.dataset.choice === 'float') {
          fb.textContent = '✓ Correct! 0.70 < 1.00 g/cm³ → floats.';
          fb.classList.add('correct');
          hint.classList.remove('visible');
          solved.add(1);
        } else {
          fb.textContent = '✗ Try again — compare 0.70 to 1.00.';
          fb.classList.add('wrong');
          hint.classList.add('visible');
        }
        updateScore();
      });
    });

    // Problems 2–7 (Numerical)
    function checkNumeric(num) {
      const input = document.getElementById('aans-' + num);
      const fb = document.getElementById('afb-' + num);
      const hint = document.getElementById('ahint-' + num);
      if (!input || !fb) return;

      const correct = parseFloat(input.dataset.answer);
      const tol = parseFloat(input.dataset.tol || '0.05');
      const val = parseFloat(input.value);

      fb.className = 'ap-feedback';
      if (isNaN(val)) {
        fb.textContent = 'Enter a number.';
        fb.classList.add('wrong');
        return;
      }

      if (Math.abs(val - correct) <= tol) {
        fb.textContent = '✓ Correct!';
        fb.classList.add('correct');
        if (hint) hint.classList.remove('visible');
        input.style.borderColor = '#16a34a';
        solved.add(num);
      } else {
        fb.textContent = '✗ Try again';
        fb.classList.add('wrong');
        if (hint) hint.classList.add('visible');
        input.style.borderColor = '#dc2626';
      }
      updateScore();
    }

    document.querySelectorAll('[data-check]').forEach(btn => {
      btn.addEventListener('click', () => checkNumeric(parseInt(btn.dataset.check, 10)));
    });

    document.querySelectorAll('.ap-problem input[type="number"]').forEach(inp => {
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const num = parseInt(inp.id.replace('aans-', ''), 10);
          checkNumeric(num);
        }
      });
    });

    document.querySelectorAll('[data-hint]').forEach(btn => {
      btn.addEventListener('click', () => {
        const num = btn.dataset.hint;
        const hint = document.getElementById('ahint-' + num);
        if (!hint) return;
        const open = hint.classList.toggle('visible');
        btn.textContent = open ? 'Hide hint' : (num === '1' ? 'Show hint' : 'Hint');
      });
    });

    updateScore();
  }

  /* ========================================================================
     BOOTSTRAP
     ======================================================================== */
  function init() {
    if (window.SimKit && window.SimKit.theme) {
      window.SimKit.theme.onChange(colors => {
        isDarkTheme = detectDark(colors);
      });
    } else {
      isDarkTheme = detectDark();
    }

    const tankApi = initBuoyancyTank();
    initCrownLab();
    initShipsSubLab();
    initDensityTable(tankApi);
    initPractice();

    window.ArchimedesLab = {
      loadMaterial(materialId, fluidId) {
        const mat = AP.REFERENCE_MATERIALS.find(m => m.id === materialId);
        if (mat && tankApi) tankApi.loadCustomMaterial(mat, fluidId);
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
