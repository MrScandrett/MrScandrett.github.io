/**
 * Conservation of Momentum — Interactive Labs, Benchmarks & Practice Controller
 */
(function () {
  'use strict';

  const MP = window.MomentumPhysics;
  if (!MP) return;

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
        if (0.2126 * r + 0.7152 * g + 0.0722 * b < 128) return true;
      }
    }
    return false;
  }

  function palette() {
    if (isDarkTheme) {
      return {
        bg: '#0b1220',
        bgSub: '#111a2e',
        ink: '#f1f5f9',
        muted: '#94a3b8',
        grid: 'rgba(148, 163, 184, 0.14)',
        border: 'rgba(148, 163, 184, 0.34)',
        pillBg: 'rgba(15, 23, 42, 0.90)',
        cyan: '#38bdf8',
        cyanSoft: 'rgba(56, 189, 248, 0.24)',
        orange: '#fb923c',
        orangeSoft: 'rgba(251, 146, 60, 0.24)',
        green: '#4ade80',
        greenSoft: 'rgba(74, 222, 128, 0.22)',
        violet: '#a78bfa',
        violetSoft: 'rgba(167, 139, 250, 0.24)',
        rose: '#fb7185',
        roseSoft: 'rgba(251, 113, 133, 0.24)',
        trackRail: '#334155',
        felt: '#0f2922',
        feltGrid: 'rgba(74, 222, 128, 0.12)'
      };
    }
    return {
      bg: '#f8fbff',
      bgSub: '#eef5fc',
      ink: '#0f172a',
      muted: '#475569',
      grid: 'rgba(15, 23, 42, 0.08)',
      border: 'rgba(15, 23, 42, 0.24)',
      pillBg: 'rgba(255, 255, 255, 0.94)',
      cyan: '#0284c7',
      cyanSoft: 'rgba(2, 132, 199, 0.18)',
      orange: '#ea580c',
      orangeSoft: 'rgba(234, 88, 12, 0.18)',
      green: '#15803d',
      greenSoft: 'rgba(21, 128, 61, 0.18)',
      violet: '#6d28d9',
      violetSoft: 'rgba(109, 40, 217, 0.18)',
      rose: '#be123c',
      roseSoft: 'rgba(190, 18, 60, 0.18)',
      trackRail: '#94a3b8',
      felt: '#ecfdf5',
      feltGrid: 'rgba(21, 128, 61, 0.10)'
    };
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
    ctx.lineWidth = width || 2.5;
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

  function redrawOnResize(canvas, fn) {
    if (!canvas || !window.ResizeObserver) return;
    // Registered after SimKit.canvas2d's own observer, so it runs after the canvas is resized (and cleared).
    new ResizeObserver(() => fn()).observe(canvas.parentElement);
  }

  function fmtSigned(n, digits = 2) {
    const val = Math.abs(n) < 1e-4 ? 0 : n;
    return (val > 0 ? '+' : '') + val.toFixed(digits);
  }

  /* ========================================================================
     LAB 1: 1D AIR-TRACK COLLISION & RECOIL LAB
     ======================================================================== */
  function initAirTrackLab() {
    const trackCanvas = document.getElementById('cm-track-canvas');
    const barCanvas = document.getElementById('cm-bar-canvas');
    if (!trackCanvas || !barCanvas || !window.SimKit) return null;

    const m1Slider = document.getElementById('cm-m1-slider');
    const m1Out = document.getElementById('cm-m1-out');
    const v1Slider = document.getElementById('cm-v1-slider');
    const v1Out = document.getElementById('cm-v1-out');
    const m2Slider = document.getElementById('cm-m2-slider');
    const m2Out = document.getElementById('cm-m2-out');
    const v2Slider = document.getElementById('cm-v2-slider');
    const v2Out = document.getElementById('cm-v2-out');
    const eSlider = document.getElementById('cm-e-slider');
    const eOut = document.getElementById('cm-e-out');

    const toggleVectors = document.getElementById('cm-toggle-vectors');
    const toggleCom = document.getElementById('cm-toggle-com');
    const toggleSlow = document.getElementById('cm-toggle-slow');

    const launchBtn = document.getElementById('cm-launch-btn');
    const stepBtn = document.getElementById('cm-step-btn');
    const logBtn = document.getElementById('cm-log-btn');
    const resetBtn = document.getElementById('cm-reset-btn');
    const clearTrialsBtn = document.getElementById('cm-clear-trials');
    const trialTbody = document.getElementById('cm-trial-tbody');
    const presetNote = document.getElementById('cm-preset-note');
    const predictFb = document.getElementById('cm-predict-feedback');

    const telePBefore = document.getElementById('cm-t-pbefore');
    const telePAfter = document.getElementById('cm-t-pafter');
    const teleVCom = document.getElementById('cm-t-vcom');
    const teleKeBefore = document.getElementById('cm-t-kebefore');
    const teleKeAfter = document.getElementById('cm-t-keafter');
    const teleStatus = document.getElementById('cm-t-status');

    const trackC2d = window.SimKit.canvas2d(trackCanvas, {});
    const barC2d = window.SimKit.canvas2d(barCanvas, {});

    const TRACK_LEN = 12.0; // meters

    const state = {
      presetId: 'head-on',
      mode: 'collision', // 'collision' | 'recoil'
      springEnergyJ: 48,
      m1: 2.0,
      v1Init: 5.0,
      m2: 3.0,
      v2Init: -4.0,
      e: 1.0,
      frame: 'lab', // 'lab' | 'com'
      boundaryMode: 'open', // 'open' | 'walls'
      showVectors: true,
      showCom: true,
      slowMo: false,
      running: true,
      prediction: null,
      predictionChecked: false,
      recoilTriggered: false,
      flashTimer: 0,
      flashX: 6.0,
      sparks: [],
      track: null
    };

    function cartHalfWidthM(m) {
      return 0.28 + Math.cbrt(m) * 0.11;
    }

    function computeBeforeStats() {
      if (state.mode === 'recoil') {
        const recoil = MP.computeRecoil({ m1: state.m1, m2: state.m2, springEnergyJ: state.springEnergyJ });
        return {
          pBefore: 0,
          keBefore: 0,
          vCom: 0,
          recoil
        };
      }
      const pBefore = state.m1 * state.v1Init + state.m2 * state.v2Init;
      const keBefore = 0.5 * state.m1 * state.v1Init * state.v1Init + 0.5 * state.m2 * state.v2Init * state.v2Init;
      const vCom = pBefore / (state.m1 + state.m2);
      return { pBefore, keBefore, vCom, recoil: null };
    }

    function syncControlOutputs() {
      if (m1Slider) m1Slider.value = String(state.m1);
      if (m1Out) m1Out.textContent = state.m1.toFixed(1) + ' kg';
      if (v1Slider) {
        v1Slider.value = String(state.v1Init);
        v1Slider.disabled = state.mode === 'recoil';
      }
      if (v1Out) v1Out.textContent = state.mode === 'recoil' ? '0.0 m/s (rest)' : fmtSigned(state.v1Init, 1) + ' m/s';
      if (m2Slider) m2Slider.value = String(state.m2);
      if (m2Out) m2Out.textContent = state.m2.toFixed(1) + ' kg';
      if (v2Slider) {
        v2Slider.value = String(state.v2Init);
        v2Slider.disabled = state.mode === 'recoil';
      }
      if (v2Out) v2Out.textContent = state.mode === 'recoil' ? '0.0 m/s (rest)' : fmtSigned(state.v2Init, 1) + ' m/s';
      if (eSlider) {
        eSlider.value = String(state.e);
        eSlider.disabled = state.mode === 'recoil';
      }
      if (eOut) {
        if (state.mode === 'recoil') {
          eOut.textContent = 'Spring (48 J)';
        } else if (state.e >= 0.99) {
          eOut.textContent = '1.00 (Elastic)';
        } else if (state.e <= 0.01) {
          eOut.textContent = '0.00 (Stick)';
        } else {
          eOut.textContent = state.e.toFixed(2) + ' (Partial)';
        }
      }
      if (launchBtn) {
        launchBtn.textContent = state.running ? 'Pause' : (state.mode === 'recoil' && !state.recoilTriggered ? 'Fire Spring' : 'Launch');
      }
    }

    function resetTrack(autoStart) {
      const r1M = cartHalfWidthM(state.m1);
      const r2M = cartHalfWidthM(state.m2);
      const isRecoil = state.mode === 'recoil';
      state.recoilTriggered = false;
      state.predictionChecked = false;
      state.sparks = [];
      state.flashTimer = 0;

      state.track = {
        x1: isRecoil ? 6.0 - r1M - 0.02 : 2.8,
        x2: isRecoil ? 6.0 + r2M + 0.02 : 9.2,
        v1: isRecoil ? 0 : state.v1Init,
        v2: isRecoil ? 0 : state.v2Init,
        m1: state.m1,
        m2: state.m2,
        r1M,
        r2M,
        e: state.e,
        trackLengthM: TRACK_LEN,
        boundaryMode: state.boundaryMode,
        stuck: false,
        collided: false,
        wallHit: false,
        externalImpulse: 0,
        lastCollision: null
      };
      state.running = Boolean(autoStart);
      if (isRecoil && autoStart) {
        triggerRecoil();
      }
      syncControlOutputs();
      updateTelemetry();
      drawAll();
    }

    function triggerRecoil() {
      if (state.mode !== 'recoil' || state.recoilTriggered || !state.track) return;
      const recoil = MP.computeRecoil({ m1: state.m1, m2: state.m2, springEnergyJ: state.springEnergyJ });
      state.track.v1 = recoil.v1;
      state.track.v2 = recoil.v2;
      state.track.collided = true;
      state.recoilTriggered = true;
      state.flashTimer = 0.45;
      state.flashX = (state.track.x1 + state.track.x2) / 2;
      spawnSparks(state.flashX, 12);
      checkPredictionIfArmed();
    }

    function spawnSparks(trackX, count) {
      const colors = ['#38bdf8', '#fb923c', '#facc15', '#ffffff'];
      for (let i = 0; i < count; i += 1) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 0.8 + Math.random() * 2.8;
        state.sparks.push({
          xM: trackX,
          yOff: (Math.random() - 0.5) * 14,
          vxM: Math.cos(ang) * spd * 0.4,
          vyPx: Math.sin(ang) * spd * 18 - 18,
          life: 1.0,
          decay: 1.8 + Math.random() * 1.4,
          color: colors[i % colors.length]
        });
      }
    }

    function checkPredictionIfArmed() {
      if (!state.prediction || state.predictionChecked || !predictFb) return;
      state.predictionChecked = true;
      predictFb.className = 'cm-predict-feedback';
      if (state.boundaryMode === 'walls' && state.track && state.track.wallHit) {
        predictFb.textContent = 'Notice: a bumper wall just supplied an external force, so the system is no longer isolated!';
        return;
      }
      if (state.prediction === 'same') {
        predictFb.classList.add('is-right');
        predictFb.textContent = '✓ Spot on! Internal forces cancel in equal-and-opposite pairs, so total momentum stays identical.';
      } else {
        predictFb.classList.add('is-wrong');
        predictFb.textContent = '✗ Look at p_before vs. p_after: kinetic energy may drop, but total momentum stays identical!';
      }
    }

    function updateTelemetry() {
      if (!state.track) return;
      const before = computeBeforeStats();
      const t = state.track;
      const pNow = t.m1 * t.v1 + t.m2 * t.v2;
      const keNow = 0.5 * t.m1 * t.v1 * t.v1 + 0.5 * t.m2 * t.v2 * t.v2;
      const comNow = pNow / (t.m1 + t.m2);

      if (telePBefore) telePBefore.textContent = fmtSigned(before.pBefore, 2) + ' kg·m/s';
      if (telePAfter) {
        telePAfter.textContent = fmtSigned(pNow, 2) + ' kg·m/s';
        telePAfter.className = 'cm-tele-val ' + (t.wallHit ? 'is-warn' : 'is-good');
      }
      if (teleVCom) teleVCom.textContent = fmtSigned(comNow, 2) + ' m/s';
      if (teleKeBefore) teleKeBefore.textContent = (state.mode === 'recoil' ? state.springEnergyJ : before.keBefore).toFixed(1) + ' J';
      if (teleKeAfter) teleKeAfter.textContent = keNow.toFixed(1) + ' J';

      if (teleStatus) {
        teleStatus.className = 'cm-tele-val';
        if (t.wallHit) {
          teleStatus.textContent = 'External Wall Hit!';
          teleStatus.classList.add('is-warn');
        } else if (!t.collided) {
          teleStatus.textContent = state.running ? 'Approaching' : 'Ready';
        } else if (state.mode === 'recoil') {
          teleStatus.textContent = 'Recoil Split (p = 0)';
          teleStatus.classList.add('is-good');
        } else if (t.stuck) {
          teleStatus.textContent = 'Coupled (Inelastic)';
          teleStatus.classList.add('is-orange');
        } else if (state.e >= 0.99) {
          teleStatus.textContent = 'Elastic (KE Saved)';
          teleStatus.classList.add('is-good');
        } else {
          teleStatus.textContent = 'Inelastic (KE Lost)';
          teleStatus.classList.add('is-cyan');
        }
      }
    }

    function drawTrackCanvas() {
      const pal = palette();
      const ctx = trackC2d.ctx;
      const W = trackC2d.width || 640;
      const H = trackC2d.height || 268;
      const t = state.track;
      if (!t) return;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = pal.bg;
      ctx.fillRect(0, 0, W, H);

      const marginX = 44;
      const trackPxW = Math.max(200, W - marginX * 2);
      const pxPerM = trackPxW / TRACK_LEN;
      const railY = H - 56;

      // Center-of-mass inertial frame offset shifts world coordinates so COM stays centered
      const com = MP.computeCenterOfMass([
        { m: t.m1, x: t.x1, v: t.v1 },
        { m: t.m2, x: t.x2, v: t.v2 }
      ]);
      const frameShiftM = state.frame === 'com' ? (TRACK_LEN * 0.5 - com.x) : 0;
      const frameVelShift = state.frame === 'com' ? -com.vx : 0;

      const toScreenX = xM => marginX + (xM + frameShiftM) * pxPerM;

      // Background grid & moving ruler ticks (so inertial frame motion is unmistakable)
      ctx.strokeStyle = pal.grid;
      ctx.lineWidth = 1;
      const startTickM = Math.floor(-frameShiftM - 2);
      const endTickM = Math.ceil(TRACK_LEN - frameShiftM + 2);
      ctx.font = '600 10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      for (let m = startTickM; m <= endTickM; m += 1) {
        const sx = toScreenX(m);
        if (sx < 10 || sx > W - 10) continue;
        ctx.beginPath();
        ctx.moveTo(sx, 24);
        ctx.lineTo(sx, railY);
        ctx.stroke();

        ctx.strokeStyle = pal.border;
        ctx.beginPath();
        ctx.moveTo(sx, railY);
        ctx.lineTo(sx, railY + 7);
        ctx.stroke();
        ctx.fillStyle = pal.muted;
        ctx.fillText(m + 'm', sx, railY + 20);
        ctx.strokeStyle = pal.grid;
      }

      // Air-track beam
      ctx.fillStyle = pal.bgSub;
      ctx.fillRect(marginX - 10, railY, trackPxW + 20, 12);
      ctx.strokeStyle = pal.trackRail;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(marginX - 10, railY);
      ctx.lineTo(marginX + trackPxW + 10, railY);
      ctx.stroke();

      // End bumpers if boundaryMode === 'walls'
      if (state.boundaryMode === 'walls') {
        const leftWallX = toScreenX(0);
        const rightWallX = toScreenX(TRACK_LEN);
        [leftWallX, rightWallX].forEach((wx, idx) => {
          const bx = idx === 0 ? wx - 12 : wx;
          ctx.fillStyle = pal.orange;
          ctx.fillRect(bx, railY - 64, 12, 64);
          ctx.strokeStyle = pal.ink;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bx, railY - 64, 12, 64);
        });
      }

      // Frame badge & status chip
      const frameLabel = state.frame === 'com'
        ? `Center-of-Mass Frame (camera rides at ${fmtSigned(com.vx, 2)} m/s)`
        : 'Lab Frame (stationary track)';
      drawPill(ctx, frameLabel, 14, 20, pal.violet, pal, 'left');
      if (t.wallHit) {
        drawPill(ctx, `External Wall Impulse: ${fmtSigned(t.externalImpulse, 1)} N·s`, W - 14, 20, pal.orange, pal, 'right');
      } else {
        drawPill(ctx, 'Isolated System (F_ext = 0)', W - 14, 20, pal.green, pal, 'right');
      }

      // Center of mass marker
      if (state.showCom) {
        const comSx = toScreenX(com.x);
        if (comSx > 8 && comSx < W - 8) {
          ctx.save();
          ctx.strokeStyle = pal.green;
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(comSx, 44);
          ctx.lineTo(comSx, railY);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = pal.green;
          ctx.beginPath();
          ctx.arc(comSx, railY - 26, 5.5, 0, Math.PI * 2);
          ctx.fill();
          drawPill(ctx, `COM v=${fmtSigned(com.vx + frameVelShift, 2)}`, comSx, railY + 38, pal.green, pal);
          ctx.restore();
        }
      }

      // Impact flash ring & sparks
      if (state.flashTimer > 0) {
        const fx = toScreenX(state.flashX);
        const radius = (0.45 - state.flashTimer) * 110 + 8;
        ctx.save();
        ctx.strokeStyle = pal.orange;
        ctx.globalAlpha = Math.max(0, state.flashTimer * 2);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(fx, railY - 26, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      for (const sp of state.sparks) {
        const sx = toScreenX(sp.xM);
        ctx.save();
        ctx.globalAlpha = Math.max(0, sp.life);
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sx, railY - 26 + sp.yOff, 2.6 * sp.life + 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Carts 1 & 2
      const carts = [
        { xM: t.x1, v: t.v1, m: t.m1, rM: t.r1M, color: pal.cyan, soft: pal.cyanSoft, label: 'Cart 1' },
        { xM: t.x2, v: t.v2, m: t.m2, rM: t.r2M, color: pal.orange, soft: pal.orangeSoft, label: 'Cart 2' }
      ];

      carts.forEach((cart, idx) => {
        const cx = toScreenX(cart.xM);
        const wPx = cart.rM * 2 * pxPerM;
        const hPx = 38 + cart.m * 3.5;
        const topY = railY - hPx - 6;

        // Air cushion glow under cart
        ctx.fillStyle = cart.soft;
        ctx.fillRect(cx - wPx * 0.45, railY - 5, wPx * 0.9, 5);

        // Wheels / magnetic glider pads
        ctx.fillStyle = pal.ink;
        ctx.beginPath();
        ctx.arc(cx - wPx * 0.28, railY - 4, 4.5, 0, Math.PI * 2);
        ctx.arc(cx + wPx * 0.28, railY - 4, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Cart body
        ctx.save();
        ctx.fillStyle = cart.color;
        ctx.strokeStyle = pal.ink;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(cx - wPx / 2, topY, wPx, hPx, 8);
        ctx.fill();
        ctx.stroke();

        // Mass text inside cart
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 12px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cart.m.toFixed(1) + ' kg', cx, topY + hPx / 2);
        ctx.restore();

        // Velocity & momentum vectors
        const relV = cart.v + frameVelShift;
        const pShown = cart.m * relV;
        if (state.showVectors) {
          const arrowLen = MP.clamp(relV * 11, -95, 95);
          const arrowY = topY - 14;
          if (Math.abs(arrowLen) > 4) {
            drawArrow(ctx, cx, arrowY, cx + arrowLen, arrowY, cart.color, 2.8);
          }
          const pillY = idx === 0 ? topY - 32 : topY - 52;
          const labelTxt = `${cart.label}: v=${fmtSigned(relV, 1)} · p=${fmtSigned(pShown, 1)}`;
          drawPill(ctx, labelTxt, MP.clamp(cx, 92, W - 92), Math.max(46, pillY), cart.color, pal);
        }
      });

      // Spring icon between carts before recoil launch
      if (state.mode === 'recoil' && !state.recoilTriggered) {
        const midX = toScreenX((t.x1 + t.x2) / 2);
        drawPill(ctx, 'Compressed Spring (48 J) — Click Fire Spring', midX, railY - 76, pal.violet, pal);
      }
    }

    function drawBarsCanvas() {
      const pal = palette();
      const ctx = barC2d.ctx;
      const W = barC2d.width || 640;
      const H = barC2d.height || 136;
      const t = state.track;
      if (!t) return;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = pal.bgSub;
      ctx.fillRect(0, 0, W, H);

      const splitX = Math.round(W * 0.54);
      ctx.strokeStyle = pal.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(splitX, 10);
      ctx.lineTo(splitX, H - 10);
      ctx.stroke();

      // Left half: Signed Momentum Budget (p1, p2, p_total)
      const p1 = t.m1 * t.v1;
      const p2 = t.m2 * t.v2;
      const pTot = p1 + p2;
      const maxP = Math.max(20, Math.abs(p1) + Math.abs(p2) + 4, Math.abs(pTot) * 1.25);
      const zeroX = Math.round(splitX * 0.52);
      const halfSpan = Math.max(60, splitX * 0.36);

      ctx.fillStyle = pal.ink;
      ctx.font = '800 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('MOMENTUM BUDGET (kg·m/s)', 14, 20);

      ctx.strokeStyle = pal.muted;
      ctx.beginPath();
      ctx.moveTo(zeroX, 28);
      ctx.lineTo(zeroX, H - 12);
      ctx.stroke();

      const pRows = [
        { label: 'p₁', val: p1, y: 38, color: pal.cyan },
        { label: 'p₂', val: p2, y: 66, color: pal.orange },
        { label: 'p_total', val: pTot, y: 94, color: t.wallHit ? pal.orange : pal.green }
      ];

      pRows.forEach(row => {
        const w = (row.val / maxP) * halfSpan;
        ctx.fillStyle = pal.muted;
        ctx.font = '700 11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(row.label, 14, row.y + 13);

        ctx.fillStyle = row.color;
        ctx.beginPath();
        ctx.roundRect(w >= 0 ? zeroX : zeroX + w, row.y, Math.max(2, Math.abs(w)), 18, 4);
        ctx.fill();

        ctx.fillStyle = pal.ink;
        ctx.font = '700 11px JetBrains Mono, monospace';
        ctx.textAlign = w >= 0 ? 'left' : 'right';
        ctx.fillText(fmtSigned(row.val, 1), w >= 0 ? zeroX + w + 6 : zeroX + w - 6, row.y + 13);
      });

      // Right half: Kinetic Energy + Heat/Sound Loss
      const before = computeBeforeStats();
      const eInitial = state.mode === 'recoil' ? state.springEnergyJ : before.keBefore;
      const ke1 = 0.5 * t.m1 * t.v1 * t.v1;
      const ke2 = 0.5 * t.m2 * t.v2 * t.v2;
      const keTot = ke1 + ke2;
      const keLost = t.collided ? Math.max(0, eInitial - keTot) : 0;
      const maxE = Math.max(10, eInitial, keTot);

      const rx = splitX + 16;
      const barWMax = Math.max(80, W - rx - 22);
      ctx.fillStyle = pal.ink;
      ctx.font = '800 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('KINETIC ENERGY & THERMAL LOSS (J)', rx, 20);

      // Stacked bar: KE1 + KE2 + Lost Heat
      const barY = 46;
      const barH = 26;
      ctx.fillStyle = pal.bg;
      ctx.strokeStyle = pal.border;
      ctx.beginPath();
      ctx.roundRect(rx, barY, barWMax, barH, 6);
      ctx.fill();
      ctx.stroke();

      const w1 = (ke1 / maxE) * barWMax;
      const w2 = (ke2 / maxE) * barWMax;
      const wLost = (keLost / maxE) * barWMax;

      let cursorX = rx;
      if (w1 > 0.5) {
        ctx.fillStyle = pal.cyan;
        ctx.fillRect(cursorX, barY, w1, barH);
        cursorX += w1;
      }
      if (w2 > 0.5) {
        ctx.fillStyle = pal.orange;
        ctx.fillRect(cursorX, barY, w2, barH);
        cursorX += w2;
      }
      if (wLost > 0.5) {
        ctx.fillStyle = pal.roseSoft;
        ctx.fillRect(cursorX, barY, wLost, barH);
      }

      ctx.font = '700 11px Inter, system-ui, sans-serif';
      ctx.fillStyle = pal.cyan;
      ctx.fillText(`KE₁: ${ke1.toFixed(1)} J`, rx, 94);
      ctx.fillStyle = pal.orange;
      ctx.fillText(`KE₂: ${ke2.toFixed(1)} J`, rx + Math.min(115, barWMax * 0.36), 94);
      ctx.fillStyle = keLost > 0.1 ? pal.rose : pal.green;
      ctx.fillText(keLost > 0.1 ? `Heat lost: ${keLost.toFixed(1)} J` : '0.0 J lost', rx, 114);
    }

    function drawAll() {
      drawTrackCanvas();
      drawBarsCanvas();
    }

    function stepPhysics(dt) {
      if (!state.track) return;
      const effDt = dt * (state.slowMo ? 0.25 : 1.0);
      const prev = state.track;
      const next = MP.step1DAirTrack(prev, effDt);
      state.track = next;

      if (next.justCollided && next.contactX != null) {
        state.flashTimer = 0.45;
        state.flashX = next.contactX;
        spawnSparks(next.contactX, 14);
        checkPredictionIfArmed();
      }
      if (next.justHitWall) {
        checkPredictionIfArmed();
      }

      // Wrap off-screen carts gracefully back into view if on open track far off-screen
      if (state.boundaryMode === 'open') {
        const outRight = next.x1 - next.r1M > TRACK_LEN + 2 && next.x2 - next.r2M > TRACK_LEN + 2 && next.v1 >= 0 && next.v2 >= 0;
        const outLeft = next.x1 + next.r1M < -2 && next.x2 + next.r2M < -2 && next.v1 <= 0 && next.v2 <= 0;
        const separatedOff =
          (next.x1 + next.r1M < -2 && next.v1 <= 0 && next.x2 - next.r2M > TRACK_LEN + 2 && next.v2 >= 0);
        if (outRight || outLeft || separatedOff) {
          state.running = false;
          syncControlOutputs();
        }
      }
    }

    function tick(dt) {
      const clampedDt = Math.min(typeof dt === 'number' && dt > 0 ? dt : 0.016, 0.04);
      if (state.flashTimer > 0) state.flashTimer = Math.max(0, state.flashTimer - clampedDt);
      state.sparks = state.sparks.filter(sp => {
        sp.xM += sp.vxM * clampedDt;
        sp.yOff += sp.vyPx * clampedDt;
        sp.vyPx += 65 * clampedDt;
        sp.life -= sp.decay * clampedDt;
        return sp.life > 0;
      });

      if (state.running) {
        stepPhysics(clampedDt);
        updateTelemetry();
      }
      drawAll();
    }

    function applyScenario(id) {
      const preset = MP.findCollisionPreset(id);
      state.presetId = preset.id;
      state.mode = preset.mode;
      state.m1 = preset.m1;
      state.v1Init = preset.v1;
      state.m2 = preset.m2;
      state.v2Init = preset.v2;
      state.e = preset.e;
      state.springEnergyJ = preset.springEnergyJ || 48;
      if (presetNote) presetNote.textContent = preset.note;

      document.querySelectorAll('[data-cm-scenario]').forEach(btn => {
        const active = btn.dataset.cmScenario === id;
        btn.classList.toggle('selected', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      resetTrack(true);
    }

    // Wire events
    document.querySelectorAll('[data-cm-scenario]').forEach(btn => {
      btn.addEventListener('click', () => applyScenario(btn.dataset.cmScenario));
    });

    document.querySelectorAll('[data-cm-predict]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.prediction = btn.dataset.cmPredict;
        state.predictionChecked = false;
        document.querySelectorAll('[data-cm-predict]').forEach(b => {
          b.classList.toggle('selected', b === btn);
        });
        if (predictFb) {
          predictFb.className = 'cm-predict-feedback';
          predictFb.textContent = 'Prediction locked — press Launch to test your hypothesis!';
        }
      });
    });

    [
      [m1Slider, v => { state.m1 = v; }],
      [v1Slider, v => { state.v1Init = v; }],
      [m2Slider, v => { state.m2 = v; }],
      [v2Slider, v => { state.v2Init = v; }],
      [eSlider, v => { state.e = v; }]
    ].forEach(([el, setter]) => {
      if (!el) return;
      el.addEventListener('input', () => {
        setter(parseFloat(el.value));
        if (presetNote) {
          presetNote.textContent = state.mode === 'recoil'
            ? 'Custom spring recoil — press Fire Spring to release both carts.'
            : 'Custom setup — press Launch to run collision.';
        }
        resetTrack(false);
      });
    });

    document.querySelectorAll('[data-cm-frame]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.frame = btn.dataset.cmFrame;
        document.querySelectorAll('[data-cm-frame]').forEach(b => {
          const active = b === btn;
          b.classList.toggle('selected', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        drawAll();
      });
    });

    document.querySelectorAll('[data-cm-boundary]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.boundaryMode = btn.dataset.cmBoundary;
        if (state.track) state.track.boundaryMode = state.boundaryMode;
        document.querySelectorAll('[data-cm-boundary]').forEach(b => {
          const active = b === btn;
          b.classList.toggle('selected', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        drawAll();
      });
    });

    if (toggleVectors) toggleVectors.addEventListener('change', () => { state.showVectors = toggleVectors.checked; drawAll(); });
    if (toggleCom) toggleCom.addEventListener('change', () => { state.showCom = toggleCom.checked; drawAll(); });
    if (toggleSlow) toggleSlow.addEventListener('change', () => { state.slowMo = toggleSlow.checked; });

    if (launchBtn) {
      launchBtn.addEventListener('click', () => {
        if (!state.running) {
          // If carts already went off-track, reset before launching
          if (state.track && (state.track.x1 < -1.5 || state.track.x2 > TRACK_LEN + 1.5)) {
            resetTrack(true);
            return;
          }
          if (state.mode === 'recoil' && !state.recoilTriggered) {
            triggerRecoil();
          }
          state.running = true;
        } else {
          state.running = false;
        }
        syncControlOutputs();
      });
    }

    if (stepBtn) {
      stepBtn.addEventListener('click', () => {
        state.running = false;
        if (state.mode === 'recoil' && !state.recoilTriggered) {
          triggerRecoil();
        }
        stepPhysics(0.03);
        updateTelemetry();
        syncControlOutputs();
        drawAll();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => resetTrack(false));
    }

    if (logBtn && trialTbody) {
      logBtn.addEventListener('click', () => {
        if (!state.track) return;
        const emptyRow = trialTbody.querySelector('.cm-trial-empty');
        if (emptyRow) emptyRow.remove();

        const before = computeBeforeStats();
        const t = state.track;
        const pNow = t.m1 * t.v1 + t.m2 * t.v2;
        const keBefore = state.mode === 'recoil' ? state.springEnergyJ : before.keBefore;
        const keNow = 0.5 * t.m1 * t.v1 * t.v1 + 0.5 * t.m2 * t.v2 * t.v2;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${state.mode === 'recoil' ? 'Spring Recoil' : `e = ${state.e.toFixed(2)}`}</td>
          <td>${t.m1.toFixed(1)} kg / ${t.m2.toFixed(1)} kg</td>
          <td>${fmtSigned(before.pBefore, 2)}</td>
          <td>${fmtSigned(pNow, 2)}</td>
          <td>${keBefore.toFixed(1)} J → ${keNow.toFixed(1)} J</td>
          <td>${t.wallHit ? 'Wall Hit' : (t.collided ? 'Conserved ✓' : 'Pre-impact')}</td>
        `;
        trialTbody.appendChild(tr);
      });
    }

    if (clearTrialsBtn && trialTbody) {
      clearTrialsBtn.addEventListener('click', () => {
        trialTbody.innerHTML = '<tr class="cm-trial-empty"><td colspan="6">Click <strong>Log Trial</strong> to record initial vs. final momentum and kinetic energy here.</td></tr>';
      });
    }

    redrawOnResize(trackCanvas, drawAll);
    redrawOnResize(barCanvas, drawAll);
    applyScenario('head-on');
    window.SimKit.loop(tick, { el: window.SimKit.stage(trackCanvas, barCanvas) });

    return {
      redraw: drawAll,
      loadPreset(id) {
        applyScenario(id);
      }
    };
  }

  /* ========================================================================
     LAB 2: IMPULSE & CRASH-SAFETY LAB
     ======================================================================== */
  function initImpulseLab() {
    const canvas = document.getElementById('cm-impulse-canvas');
    if (!canvas || !window.SimKit) return null;

    const massSlider = document.getElementById('cm-imp-mass-slider');
    const massOut = document.getElementById('cm-imp-mass-out');
    const speedSlider = document.getElementById('cm-imp-speed-slider');
    const speedOut = document.getElementById('cm-imp-speed-out');
    const dtSlider = document.getElementById('cm-imp-dt-slider');
    const dtOut = document.getElementById('cm-imp-dt-out');
    const eSlider = document.getElementById('cm-imp-e-slider');
    const eOut = document.getElementById('cm-imp-e-out');
    const ghostCheck = document.getElementById('cm-imp-ghost');
    const runBtn = document.getElementById('cm-imp-run-btn');
    const resetBtn = document.getElementById('cm-imp-reset-btn');
    const noteEl = document.getElementById('cm-imp-note');

    const teleJ = document.getElementById('cm-imp-j');
    const teleDt = document.getElementById('cm-imp-dt-val');
    const teleFAvg = document.getElementById('cm-imp-favg');
    const teleFPeak = document.getElementById('cm-imp-fpeak');
    const teleG = document.getElementById('cm-imp-g');
    const teleOutcome = document.getElementById('cm-imp-outcome');

    const c2d = window.SimKit.canvas2d(canvas, {});
    const SAFE_N = 250;

    const state = {
      surfaceId: 'foam',
      surfaceColor: '#0284c7',
      massKg: 4.0,
      speedMs: 6.0,
      durationS: 0.140,
      restitution: 0.05,
      showGhost: true,
      phase: 'done', // 'approach' | 'impact' | 'rebound' | 'done'
      simT: 0.140,
      cartFrac: 0.72,
      activeCurve: null,
      steelCurve: null
    };

    function recompute() {
      state.activeCurve = MP.computeImpulseCurve({
        massKg: state.massKg,
        speedMs: state.speedMs,
        durationS: state.durationS,
        restitution: state.restitution,
        safeForceN: SAFE_N
      });
      state.steelCurve = MP.computeImpulseCurve({
        massKg: state.massKg,
        speedMs: state.speedMs,
        durationS: 0.012,
        restitution: 0.05,
        safeForceN: SAFE_N
      });

      if (massOut) massOut.textContent = state.massKg.toFixed(1) + ' kg';
      if (speedOut) speedOut.textContent = state.speedMs.toFixed(1) + ' m/s';
      if (dtOut) dtOut.textContent = Math.round(state.durationS * 1000) + ' ms';
      if (eOut) eOut.textContent = state.restitution.toFixed(2);

      const c = state.activeCurve;
      if (teleJ) teleJ.textContent = c.impulseNs.toFixed(1) + ' N·s';
      if (teleDt) teleDt.textContent = (c.durationS * 1000).toFixed(0) + ' ms';
      if (teleFAvg) teleFAvg.textContent = Math.round(c.avgForceN) + ' N';
      if (teleFPeak) {
        teleFPeak.textContent = Math.round(c.peakForceN) + ' N';
        teleFPeak.className = 'cm-tele-val ' + (c.survives ? 'is-good' : 'is-bad');
      }
      if (teleG) teleG.textContent = c.peakG.toFixed(1) + ' g';
      if (teleOutcome) {
        teleOutcome.textContent = c.survives ? 'Payload Intact ✓' : 'Crushed (> 250 N)';
        teleOutcome.className = 'cm-tele-val ' + (c.survives ? 'is-good' : 'is-bad');
      }
    }

    function startTest() {
      recompute();
      state.phase = 'approach';
      state.simT = 0;
      state.cartFrac = 0.08;
    }

    function applySurface(id) {
      const surf = MP.findImpulseSurface(id);
      state.surfaceId = surf.id;
      state.surfaceColor = surf.color;
      state.durationS = surf.durationS;
      state.restitution = surf.restitution;
      if (dtSlider) dtSlider.value = String(Math.round(surf.durationS * 1000));
      if (eSlider) eSlider.value = String(surf.restitution);
      if (noteEl) noteEl.textContent = surf.note;

      document.querySelectorAll('[data-cm-surface]').forEach(btn => {
        const active = btn.dataset.cmSurface === id;
        btn.classList.toggle('selected', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      startTest();
    }

    function draw() {
      const pal = palette();
      const ctx = c2d.ctx;
      const W = c2d.width || 640;
      const H = c2d.height || 360;
      if (!state.activeCurve) recompute();

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = pal.bg;
      ctx.fillRect(0, 0, W, H);

      const topH = Math.round(H * 0.43);
      const trackY = topH - 22;
      const wallX = W - 64;
      const padThick = MP.clamp(Math.round(14 + state.durationS * 240), 14, 78);

      // Top crash track
      ctx.fillStyle = pal.bgSub;
      ctx.fillRect(0, 0, W, topH);
      ctx.strokeStyle = pal.border;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(20, trackY);
      ctx.lineTo(W - 20, trackY);
      ctx.stroke();

      // Rigid backing wall
      ctx.fillStyle = pal.trackRail;
      ctx.fillRect(wallX, 24, 16, trackY - 24);

      // Compression calculation during impact
      let compression = 0;
      if (state.phase === 'impact') {
        compression = Math.sin((Math.PI * state.simT) / state.durationS) * padThick * 0.58;
      } else if ((state.phase === 'done' || state.phase === 'rebound') && state.restitution < 0.25) {
        compression = padThick * 0.24;
      }
      const curPadThick = Math.max(8, padThick - compression);
      const padLeft = wallX - curPadThick;

      // Barrier cushion
      ctx.save();
      ctx.fillStyle = state.surfaceColor;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.roundRect(padLeft, 34, curPadThick, trackY - 34, 6);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(padLeft, 34, curPadThick, trackY - 34);

      // Cart & fragile egg sensor payload
      const cartW = 68;
      const cartH = 32;
      const startX = 48;
      const contactCartX = padLeft - cartW;
      let cartX;
      if (state.phase === 'approach') {
        cartX = startX + (contactCartX - startX) * state.cartFrac;
      } else if (state.phase === 'impact') {
        cartX = contactCartX;
      } else if (state.phase === 'rebound') {
        cartX = contactCartX - state.cartFrac * (contactCartX - startX) * state.restitution;
      } else {
        cartX = contactCartX - (state.restitution > 0.2 ? 95 * state.restitution : 0);
      }

      // Cart body
      ctx.fillStyle = pal.cyan;
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cartX, trackY - cartH - 6, cartW, cartH, 7);
      ctx.fill();
      ctx.stroke();

      // Wheels
      ctx.fillStyle = pal.ink;
      ctx.beginPath();
      ctx.arc(cartX + 16, trackY - 4, 4.5, 0, Math.PI * 2);
      ctx.arc(cartX + cartW - 16, trackY - 4, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Egg payload perched on cart
      const eggX = cartX + cartW * 0.5;
      const eggY = trackY - cartH - 18;
      const crushed = !state.activeCurve.survives && (state.phase === 'done' || state.phase === 'rebound' || (state.phase === 'impact' && state.activeCurve.forceAt(state.simT) > SAFE_N));
      ctx.save();
      ctx.fillStyle = crushed ? pal.roseSoft : '#fef3c7';
      ctx.strokeStyle = crushed ? pal.rose : '#b45309';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(eggX, eggY, 10, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (crushed) {
        ctx.beginPath();
        ctx.moveTo(eggX - 5, eggY - 4);
        ctx.lineTo(eggX + 1, eggY + 1);
        ctx.lineTo(eggX - 3, eggY + 6);
        ctx.stroke();
      }
      ctx.restore();

      const statusTxt = crushed ? 'CRUSHED!' : (state.phase === 'done' ? 'SAFE STOP ✓' : `Impact F=${Math.round(state.activeCurve.forceAt(state.simT))} N`);
      drawPill(ctx, statusTxt, 16, 20, crushed ? pal.rose : pal.green, pal, 'left');
      drawPill(ctx, `${state.massKg.toFixed(1)} kg @ ${state.speedMs.toFixed(1)} m/s`, Math.max(180, cartX + cartW / 2), 20, pal.cyan, pal);

      // Bottom: Force vs Time graph
      const gx = 58;
      const gy = topH + 20;
      const gw = W - gx - 24;
      const gh = H - gy - 34;

      const c = state.activeCurve;
      const steel = state.steelCurve;
      const maxTime = Math.max(0.28, c.durationS * 1.15);
      const yScalePeak = Math.max(SAFE_N * 2.2, c.peakForceN * 1.18, state.showGhost ? Math.min(steel.peakForceN * 1.1, c.peakForceN * 3.5) : 0);

      // Axes
      ctx.strokeStyle = pal.border;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx, gy + gh);
      ctx.lineTo(gx + gw, gy + gh);
      ctx.stroke();

      ctx.fillStyle = pal.muted;
      ctx.font = '700 10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(yScalePeak) + ' N', gx - 6, gy + 8);
      ctx.fillText('0 N', gx - 6, gy + gh);
      ctx.textAlign = 'center';
      ctx.fillText('0 ms', gx, gy + gh + 16);
      ctx.fillText(Math.round(maxTime * 500) + ' ms', gx + gw * 0.5, gy + gh + 16);
      ctx.fillText(Math.round(maxTime * 1000) + ' ms', gx + gw, gy + gh + 16);

      // Safe force dashed line
      const safeY = gy + gh - (SAFE_N / yScalePeak) * gh;
      if (safeY > gy && safeY < gy + gh) {
        ctx.save();
        ctx.strokeStyle = pal.green;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(gx, safeY);
        ctx.lineTo(gx + gw, safeY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = pal.green;
        ctx.font = '700 10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Safe Limit (250 N)', gx + gw - 4, safeY - 5);
        ctx.restore();
      }

      // Ghost steel curve comparison (clipped to graph area cleanly)
      if (state.showGhost && state.surfaceId !== 'steel') {
        ctx.save();
        ctx.beginPath();
        ctx.rect(gx, gy, gw, gh);
        ctx.clip();
        ctx.strokeStyle = pal.muted;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(gx, gy + gh);
        const pts = steel.samplePoints(40);
        pts.forEach(pt => {
          const px = gx + (pt.t / maxTime) * gw;
          const py = gy + gh - (pt.f / yScalePeak) * gh;
          ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = pal.muted;
        ctx.font = '700 10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Steel peak: ${Math.round(steel.peakForceN)} N`, gx + 14, gy + 14);
      }

      // Active shaded impulse area J = integral F dt
      const activePts = c.samplePoints(90);
      ctx.save();
      ctx.fillStyle = c.survives ? pal.greenSoft : pal.orangeSoft;
      ctx.beginPath();
      ctx.moveTo(gx, gy + gh);
      activePts.forEach(pt => {
        const px = gx + (pt.t / maxTime) * gw;
        const py = Math.max(gy, gy + gh - (pt.f / yScalePeak) * gh);
        ctx.lineTo(px, py);
      });
      ctx.lineTo(gx + (c.durationS / maxTime) * gw, gy + gh);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = c.survives ? pal.green : pal.orange;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      activePts.forEach((pt, idx) => {
        const px = gx + (pt.t / maxTime) * gw;
        const py = Math.max(gy, gy + gh - (pt.f / yScalePeak) * gh);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.restore();

      // Label shaded area
      const areaCenterX = gx + ((c.durationS * 0.5) / maxTime) * gw;
      const peakPlotY = Math.max(gy + 16, gy + gh - (c.peakForceN / yScalePeak) * gh);
      drawPill(ctx, `Area J = ${c.impulseNs.toFixed(1)} N·s`, Math.max(gx + 68, areaCenterX), Math.min(gy + gh - 20, peakPlotY + 26), c.survives ? pal.green : pal.orange, pal);

      // Moving dot along F(t) during impact
      if (state.phase === 'impact') {
        const curF = c.forceAt(state.simT);
        const dotX = gx + (state.simT / maxTime) * gw;
        const dotY = Math.max(gy, gy + gh - (curF / yScalePeak) * gh);
        ctx.fillStyle = pal.ink;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function tick(dt) {
      const stepDt = Math.min(typeof dt === 'number' && dt > 0 ? dt : 0.016, 0.032);
      if (state.phase === 'approach') {
        state.cartFrac += stepDt * (1.2 + state.speedMs * 0.14);
        if (state.cartFrac >= 1) {
          state.cartFrac = 1;
          state.phase = 'impact';
          state.simT = 0;
        }
      } else if (state.phase === 'impact') {
        // Slow motion 0.35x playback for millisecond curves so human eye sees the pulse grow
        state.simT += stepDt * Math.max(0.2, state.durationS * 2.2);
        if (state.simT >= state.durationS) {
          state.simT = state.durationS;
          state.phase = state.restitution > 0.15 ? 'rebound' : 'done';
          state.cartFrac = 0;
        }
      } else if (state.phase === 'rebound') {
        state.cartFrac += stepDt * 1.1;
        if (state.cartFrac >= 1) {
          state.cartFrac = 1;
          state.phase = 'done';
        }
      }
      draw();
    }

    document.querySelectorAll('[data-cm-surface]').forEach(btn => {
      btn.addEventListener('click', () => applySurface(btn.dataset.cmSurface));
    });

    [
      [massSlider, v => { state.massKg = v; }],
      [speedSlider, v => { state.speedMs = v; }],
      [dtSlider, v => { state.durationS = v / 1000; }],
      [eSlider, v => { state.restitution = v; }]
    ].forEach(([el, setter]) => {
      if (!el) return;
      el.addEventListener('input', () => {
        setter(parseFloat(el.value));
        if (noteEl) noteEl.textContent = 'Custom barrier parameters — run impact test to inspect the F(t) area.';
        recompute();
        draw();
      });
    });

    if (ghostCheck) ghostCheck.addEventListener('change', () => { state.showGhost = ghostCheck.checked; draw(); });
    if (runBtn) runBtn.addEventListener('click', startTest);
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state.massKg = 4.0;
        state.speedMs = 6.0;
        if (massSlider) massSlider.value = '4';
        if (speedSlider) speedSlider.value = '6';
        applySurface('foam');
      });
    }

    redrawOnResize(canvas, draw);
    recompute();
    window.SimKit.loop(tick, { el: window.SimKit.stage(canvas) });

    return { redraw: draw };
  }

  /* ========================================================================
     LAB 3: TABBED 2D VECTOR BILLIARDS & DEEP-SPACE ROCKET LAB
     ======================================================================== */
  function initVectorRocketLab() {
    const tabBilliards = document.getElementById('cm-tab-billiards');
    const tabRocket = document.getElementById('cm-tab-rocket');
    const paneBilliards = document.getElementById('cm-pane-billiards');
    const paneRocket = document.getElementById('cm-pane-rocket');

    const c2dCanvas = document.getElementById('cm-2d-canvas');
    const rkCanvas = document.getElementById('cm-rocket-canvas');
    if (!c2dCanvas || !rkCanvas || !window.SimKit) return null;

    // ── Tab A: 2D Billiards ──
    const offsetSlider = document.getElementById('cm-2d-offset-slider');
    const offsetOut = document.getElementById('cm-2d-offset-out');
    const m1Slider = document.getElementById('cm-2d-m1-slider');
    const m1Out = document.getElementById('cm-2d-m1-out');
    const m2Slider = document.getElementById('cm-2d-m2-slider');
    const m2Out = document.getElementById('cm-2d-m2-out');
    const v1Slider = document.getElementById('cm-2d-v1-slider');
    const v1Out = document.getElementById('cm-2d-v1-out');
    const eSlider = document.getElementById('cm-2d-e-slider');
    const eOut = document.getElementById('cm-2d-e-out');
    const breakBtn = document.getElementById('cm-2d-break-btn');
    const reset2dBtn = document.getElementById('cm-2d-reset-btn');
    const note2d = document.getElementById('cm-2d-note');

    const telePx = document.getElementById('cm-2d-px');
    const telePy = document.getElementById('cm-2d-py');
    const teleAngle = document.getElementById('cm-2d-angle');
    const teleKe = document.getElementById('cm-2d-ke');

    const b2d = window.SimKit.canvas2d(c2dCanvas, {});
    const bState = {
      m1: 2.0,
      m2: 2.0,
      speed1: 5.0,
      offset: 0.52,
      e: 1.0,
      running: false,
      collided: false,
      dragging: false,
      pBefore: { px: 10, py: 0, ke: 25 },
      result: null,
      disks: null,
      trails: [[], []]
    };

    function resetBilliards(autoRun) {
      const r1 = 0.28 + Math.cbrt(bState.m1) * 0.08;
      const r2 = 0.28 + Math.cbrt(bState.m2) * 0.08;
      const yOffset = bState.offset * (r1 + r2);
      bState.collided = false;
      bState.running = Boolean(autoRun);
      bState.trails = [[], []];
      bState.disks = [
        { x: 1.8, y: 2.2 + yOffset, vx: bState.speed1, vy: 0, m: bState.m1, r: r1 },
        { x: 4.5, y: 2.2, vx: 0, vy: 0, m: bState.m2, r: r2 }
      ];
      bState.pBefore = {
        px: bState.m1 * bState.speed1,
        py: 0,
        ke: 0.5 * bState.m1 * bState.speed1 * bState.speed1
      };

      // Pre-compute analytical hit for preview triangle
      const hitX = 4.5 - Math.sqrt(Math.max(0.01, (r1 + r2) * (r1 + r2) - yOffset * yOffset));
      bState.result = MP.compute2DCollision({
        m1: bState.m1, x1: hitX, y1: 2.2 + yOffset, vx1: bState.speed1, vy1: 0,
        m2: bState.m2, x2: 4.5, y2: 2.2, vx2: 0, vy2: 0,
        e: bState.e
      });

      if (offsetOut) offsetOut.textContent = (bState.offset >= 0 ? '+' : '') + bState.offset.toFixed(2) + ' R';
      if (m1Out) m1Out.textContent = bState.m1.toFixed(1) + ' kg';
      if (m2Out) m2Out.textContent = bState.m2.toFixed(1) + ' kg';
      if (v1Out) v1Out.textContent = bState.speed1.toFixed(1) + ' m/s';
      if (eOut) eOut.textContent = bState.e.toFixed(2);
      update2dTelemetry();
      drawBilliards();
    }

    function update2dTelemetry() {
      const [d1, d2] = bState.disks;
      const pxAfter = d1.m * d1.vx + d2.m * d2.vx;
      const pyAfter = d1.m * d1.vy + d2.m * d2.vy;
      const keAfter = 0.5 * d1.m * (d1.vx * d1.vx + d1.vy * d1.vy) + 0.5 * d2.m * (d2.vx * d2.vx + d2.vy * d2.vy);
      const res = bState.result;

      if (telePx) telePx.textContent = `${bState.pBefore.px.toFixed(1)} → ${(bState.collided ? pxAfter : bState.pBefore.px).toFixed(1)}`;
      if (telePy) telePy.textContent = `0.0 → ${(bState.collided ? pyAfter : 0).toFixed(1)}`;
      if (teleAngle) teleAngle.textContent = res && res.separationDeg > 0.1 ? res.separationDeg.toFixed(1) + '°' : '0.0°';
      if (teleKe) {
        const pct = bState.pBefore.ke > 1e-6 ? ((bState.collided ? keAfter : res.keAfter) / bState.pBefore.ke) * 100 : 100;
        teleKe.textContent = pct.toFixed(0) + '%';
      }
    }

    function drawBilliards() {
      const pal = palette();
      const ctx = b2d.ctx;
      const W = b2d.width || 640;
      const H = b2d.height || 360;
      if (!bState.disks) return;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = pal.bg;
      ctx.fillRect(0, 0, W, H);

      const tableW = Math.round(W * 0.66);
      const scale = Math.min(tableW / 8.0, H / 4.4);
      const originX = 16;
      const originY = (H - 4.4 * scale) * 0.5;
      const toPx = (mx, my) => [originX + mx * scale, originY + my * scale];

      // Felt collision table
      ctx.fillStyle = pal.felt;
      ctx.strokeStyle = pal.border;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(10, 12, tableW - 18, H - 24, 14);
      ctx.fill();
      ctx.stroke();

      // Subtle grid on felt
      ctx.strokeStyle = pal.feltGrid;
      ctx.lineWidth = 1;
      for (let gx = 1; gx < 8; gx += 1) {
        const [sx] = toPx(gx, 0);
        if (sx < tableW - 14) {
          ctx.beginPath();
          ctx.moveTo(sx, 14);
          ctx.lineTo(sx, H - 14);
          ctx.stroke();
        }
      }
      for (let gy = 0.5; gy < 4.2; gy += 0.7) {
        const [, sy] = toPx(0, gy);
        ctx.beginPath();
        ctx.moveTo(12, sy);
        ctx.lineTo(tableW - 10, sy);
        ctx.stroke();
      }

      const [d1, d2] = bState.disks;
      const [c1x, c1y] = toPx(d1.x, d1.y);
      const [c2x, c2y] = toPx(d2.x, d2.y);

      // Dashed aim sightline before collision
      if (!bState.collided) {
        ctx.save();
        ctx.strokeStyle = pal.cyan;
        ctx.globalAlpha = 0.45;
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(c1x, c1y);
        ctx.lineTo(c2x + 30, c1y);
        ctx.stroke();
        ctx.restore();
      }

      // Trails
      bState.trails.forEach((tr, idx) => {
        if (tr.length < 2) return;
        ctx.save();
        ctx.strokeStyle = idx === 0 ? pal.cyan : pal.orange;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        tr.forEach((pt, j) => {
          const [tx, ty] = toPx(pt.x, pt.y);
          if (j === 0) ctx.moveTo(tx, ty);
          else ctx.lineTo(tx, ty);
        });
        ctx.stroke();
        ctx.restore();
      });

      // Draw disks
      [
        { d: d1, cx: c1x, cy: c1y, color: pal.cyan, tag: '1' },
        { d: d2, cx: c2x, cy: c2y, color: pal.orange, tag: '2' }
      ].forEach(item => {
        const rPx = item.d.r * scale;
        ctx.fillStyle = item.color;
        ctx.strokeStyle = pal.ink;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(item.cx, item.cy, rPx, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '800 11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.d.m.toFixed(1) + 'kg', item.cx, item.cy);

        const spd = Math.hypot(item.d.vx, item.d.vy);
        if (spd > 0.08) {
          drawArrow(ctx, item.cx, item.cy, item.cx + item.d.vx * 11, item.cy + item.d.vy * 11, pal.ink, 2.2);
        }
      });

      // Drag hint pill on cue disk before break
      if (!bState.collided && !bState.running) {
        drawPill(ctx, 'Drag up/down to aim', c1x, Math.max(28, c1y - d1.r * scale - 16), pal.cyan, pal);
      }

      // Right 34%: Head-to-Tail Vector Triangle Inset
      const boxX = tableW + 4;
      const boxW = W - boxX - 10;
      ctx.fillStyle = pal.bgSub;
      ctx.strokeStyle = pal.border;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(boxX, 12, boxW, H - 24, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = pal.ink;
      ctx.font = '800 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VECTOR ADDITION', boxX + boxW / 2, 30);
      ctx.fillStyle = pal.muted;
      ctx.font = '600 10px Inter, system-ui, sans-serif';
      ctx.fillText("p₁' + p₂' = p_initial", boxX + boxW / 2, 46);

      const res = bState.result;
      if (res) {
        const pInitX = bState.pBefore.px;
        const p1x = bState.m1 * res.vx1After;
        const p1y = bState.m1 * res.vy1After;
        const p2x = bState.m2 * res.vx2After;
        const p2y = bState.m2 * res.vy2After;

        const maxSpan = Math.max(1e-3, Math.abs(pInitX), Math.abs(p1x) + Math.abs(p2x), Math.abs(p1y) * 2.2);
        const vecScale = Math.min((boxW - 44) / Math.max(pInitX, 1), (H - 120) / maxSpan) * 0.85;
        const vx0 = boxX + 22;
        const vy0 = Math.round(H * 0.56);

        // Initial p_total (emerald)
        drawArrow(ctx, vx0, vy0, vx0 + pInitX * vecScale, vy0, pal.green, 3);
        // p1' from origin (cyan)
        const midX = vx0 + p1x * vecScale;
        const midY = vy0 + p1y * vecScale;
        drawArrow(ctx, vx0, vy0, midX, midY, pal.cyan, 2.6);
        // p2' head-to-tail from tip of p1' (orange)
        drawArrow(ctx, midX, midY, midX + p2x * vecScale, midY + p2y * vecScale, pal.orange, 2.6);

        // Legend pills
        drawPill(ctx, `p₁' = (${p1x.toFixed(1)}, ${p1y.toFixed(1)})`, boxX + boxW / 2, H - 72, pal.cyan, pal);
        drawPill(ctx, `p₂' = (${p2x.toFixed(1)}, ${p2y.toFixed(1)})`, boxX + boxW / 2, H - 46, pal.orange, pal);
        if (res.separationDeg > 0.1) {
          drawPill(ctx, `Split ∠ = ${res.separationDeg.toFixed(1)}°`, boxX + boxW / 2, 72, pal.violet, pal);
        }
      }
    }

    function tickBilliards(dt) {
      if (!bState.running || !bState.disks) {
        drawBilliards();
        return;
      }
      const stepDt = Math.min(typeof dt === 'number' && dt > 0 ? dt : 0.016, 0.03);
      const [d1, d2] = bState.disks;
      d1.x += d1.vx * stepDt;
      d1.y += d1.vy * stepDt;
      d2.x += d2.vx * stepDt;
      d2.y += d2.vy * stepDt;

      if (bState.collided) {
        bState.trails[0].push({ x: d1.x, y: d1.y });
        bState.trails[1].push({ x: d2.x, y: d2.y });
      }

      const dist = Math.hypot(d2.x - d1.x, d2.y - d1.y);
      if (!bState.collided && dist <= d1.r + d2.r) {
        const res = MP.compute2DCollision({
          m1: d1.m, x1: d1.x, y1: d1.y, vx1: d1.vx, vy1: d1.vy,
          m2: d2.m, x2: d2.x, y2: d2.y, vx2: d2.vx, vy2: d2.vy,
          e: bState.e
        });
        if (res.collided) {
          d1.vx = res.vx1After; d1.vy = res.vy1After;
          d2.vx = res.vx2After; d2.vy = res.vy2After;
          bState.result = res;
          bState.collided = true;
          bState.trails[0].push({ x: d1.x, y: d1.y });
          bState.trails[1].push({ x: d2.x, y: d2.y });
          update2dTelemetry();
        }
      }

      if (d1.x > 8.6 || d2.x > 8.6 || d1.y < -0.8 || d1.y > 5.2 || d2.y < -0.8 || d2.y > 5.2) {
        bState.running = false;
      }
      drawBilliards();
    }

    // Zoom-safe pointer drag on 2D cue aim
    function updateOffsetFromPointer(clientY) {
      const rect = c2dCanvas.getBoundingClientRect();
      const H = rect.height || 360;
      const norm = ((clientY - rect.top) / H - 0.5) * 2.2;
      bState.offset = MP.clamp(Math.round(norm * 50) / 50, -0.90, 0.90);
      if (offsetSlider) offsetSlider.value = String(bState.offset);
      resetBilliards(false);
    }

    c2dCanvas.addEventListener('pointerdown', e => {
      if (bState.running || bState.collided) return;
      bState.dragging = true;
      c2dCanvas.setPointerCapture(e.pointerId);
      updateOffsetFromPointer(e.clientY);
    });
    c2dCanvas.addEventListener('pointermove', e => {
      if (!bState.dragging) return;
      updateOffsetFromPointer(e.clientY);
    });
    const endDrag = e => {
      if (!bState.dragging) return;
      bState.dragging = false;
      if (c2dCanvas.hasPointerCapture(e.pointerId)) c2dCanvas.releasePointerCapture(e.pointerId);
    };
    c2dCanvas.addEventListener('pointerup', endDrag);
    c2dCanvas.addEventListener('pointercancel', endDrag);

    function applyBilliardsPreset(id) {
      const p = MP.findBilliardsPreset(id);
      bState.m1 = p.m1;
      bState.m2 = p.m2;
      bState.speed1 = p.speed1;
      bState.offset = p.offset;
      bState.e = p.e;
      if (m1Slider) m1Slider.value = String(p.m1);
      if (m2Slider) m2Slider.value = String(p.m2);
      if (v1Slider) v1Slider.value = String(p.speed1);
      if (offsetSlider) offsetSlider.value = String(p.offset);
      if (eSlider) eSlider.value = String(p.e);
      if (note2d) note2d.innerHTML = p.note;

      document.querySelectorAll('[data-cm-2d-preset]').forEach(btn => {
        const active = btn.dataset.cm2dPreset === id;
        btn.classList.toggle('selected', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      resetBilliards(false);
    }

    document.querySelectorAll('[data-cm-2d-preset]').forEach(btn => {
      btn.addEventListener('click', () => applyBilliardsPreset(btn.dataset.cm2dPreset));
    });

    [
      [offsetSlider, v => { bState.offset = v; }],
      [m1Slider, v => { bState.m1 = v; }],
      [m2Slider, v => { bState.m2 = v; }],
      [v1Slider, v => { bState.speed1 = v; }],
      [eSlider, v => { bState.e = v; }]
    ].forEach(([el, setter]) => {
      if (!el) return;
      el.addEventListener('input', () => {
        setter(parseFloat(el.value));
        resetBilliards(false);
      });
    });

    if (breakBtn) breakBtn.addEventListener('click', () => resetBilliards(true));
    if (reset2dBtn) reset2dBtn.addEventListener('click', () => resetBilliards(false));

    // ── Tab B: Deep-Space Rocket ──
    const veSlider = document.getElementById('cm-rk-ve-slider');
    const veOut = document.getElementById('cm-rk-ve-out');
    const fuelSlider = document.getElementById('cm-rk-fuel-slider');
    const fuelOut = document.getElementById('cm-rk-fuel-out');
    const pulseBtn = document.getElementById('cm-rk-pulse-btn');
    const burnBtn = document.getElementById('cm-rk-burn-btn');
    const resetRkBtn = document.getElementById('cm-rk-reset-btn');

    const teleRkDv = document.getElementById('cm-rk-dv');
    const teleRkPR = document.getElementById('cm-rk-procket');
    const teleRkPE = document.getElementById('cm-rk-pexhaust');
    const teleRkPTot = document.getElementById('cm-rk-ptot');
    const teleRkTsiol = document.getElementById('cm-rk-tsiolkovsky');

    const rk2d = window.SimKit.canvas2d(rkCanvas, {});
    const DRY_MASS = 1000;
    const rkState = {
      ve: 2800,
      fuelInit: 3000,
      fuelLeft: 3000,
      rocketX: 0, // world m (starts at COM = 0)
      rocketVx: 0,
      burning: false,
      burnTimer: 0,
      exhaust: []
    };

    const stars = Array.from({ length: 56 }, (_, idx) => ({
      fx: ((idx * 173 + 29) % 100) / 100,
      fy: ((idx * 311 + 53) % 100) / 100,
      r: (idx % 3 === 0) ? 1.7 : 1.0
    }));

    function syncRocketBurnBtn() {
      if (burnBtn) burnBtn.textContent = rkState.burning ? 'Pause Burn' : 'Ignite Full Burn';
    }

    function resetRocket() {
      rkState.fuelLeft = rkState.fuelInit;
      rkState.rocketX = 0;
      rkState.rocketVx = 0;
      rkState.burning = false;
      rkState.burnTimer = 0;
      rkState.exhaust = [];
      if (veOut) veOut.textContent = rkState.ve + ' m/s';
      if (fuelOut) fuelOut.textContent = rkState.fuelInit + ' kg';
      syncRocketBurnBtn();
      updateRocketTelemetry();
      drawRocket();
    }

    function firePulse(pulseMassKg) {
      if (rkState.fuelLeft <= 1) {
        rkState.burning = false;
        return;
      }
      const dm = Math.min(rkState.fuelLeft, pulseMassKg);
      const totalM = DRY_MASS + rkState.fuelLeft;
      const step = MP.stepRocketPulse({
        rocketMassKg: totalM,
        rocketVx: rkState.rocketVx,
        pulseMassKg: dm,
        exhaustSpeedMs: rkState.ve
      });
      rkState.exhaust.push({
        m: step.pulseMassKg,
        x: rkState.rocketX - 24,
        vx: step.pulseVx,
        yJitter: (Math.random() - 0.5) * 14
      });
      rkState.fuelLeft = Math.max(0, rkState.fuelLeft - step.pulseMassKg);
      rkState.rocketVx = step.nextVx;
      updateRocketTelemetry();
    }

    function updateRocketTelemetry() {
      const mRocket = DRY_MASS + rkState.fuelLeft;
      const pRocket = mRocket * rkState.rocketVx;
      let pExhaust = 0;
      for (const ex of rkState.exhaust) pExhaust += ex.m * ex.vx;
      const pTotal = pRocket + pExhaust;
      const ideal = MP.computeRocketBurn({ dryMassKg: DRY_MASS, fuelMassKg: rkState.fuelInit, exhaustSpeedMs: rkState.ve, burnFraction: 1 });

      if (teleRkDv) teleRkDv.textContent = Math.round(rkState.rocketVx) + ' m/s';
      if (teleRkPR) teleRkPR.textContent = '+' + Math.round(pRocket).toLocaleString() + ' kg·m/s';
      if (teleRkPE) teleRkPE.textContent = Math.round(pExhaust).toLocaleString() + ' kg·m/s';
      if (teleRkPTot) teleRkPTot.textContent = fmtSigned(pTotal, 1) + ' kg·m/s';
      if (teleRkTsiol) teleRkTsiol.textContent = Math.round(ideal.deltaVMs) + ' m/s';
    }

    function drawRocket() {
      const ctx = rk2d.ctx;
      const W = rk2d.width || 640;
      const H = rk2d.height || 360;

      ctx.clearRect(0, 0, W, H);
      // Deep space background in all themes so stars & exhaust glow cleanly
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#040914');
      grad.addColorStop(1, '#0b1426');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Stars
      ctx.fillStyle = 'rgba(226, 232, 240, 0.65)';
      stars.forEach(s => {
        ctx.beginPath();
        ctx.arc(s.fx * W, s.fy * H, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      const cy = Math.round(H * 0.50);
      const originPxX = Math.round(W * 0.52);
      const pxPerM = 0.045; // compress high exhaust displacement cleanly inside view

      // Fixed System Center-of-Mass marker at x = 0
      const bodies = [{ m: DRY_MASS + rkState.fuelLeft, x: rkState.rocketX, vx: rkState.rocketVx }, ...rkState.exhaust];
      const com = MP.computeCenterOfMass(bodies);
      const comScreenX = originPxX + com.x * pxPerM;

      ctx.save();
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(comScreenX, 34);
      ctx.lineTo(comScreenX, H - 34);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#4ade80';
      ctx.beginPath();
      ctx.roundRect(comScreenX - 78, H - 30, 156, 22, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#86efac';
      ctx.font = '700 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('System COM (p_tot = 0)', comScreenX, H - 15);
      ctx.restore();

      // Draw exhaust packets moving left
      rkState.exhaust.forEach(ex => {
        const exX = originPxX + ex.x * pxPerM;
        if (exX < -30 || exX > W + 30) return;
        const r = MP.clamp(4 + Math.sqrt(ex.m) * 0.25, 5, 11);
        ctx.fillStyle = 'rgba(251, 146, 60, 0.82)';
        ctx.beginPath();
        ctx.arc(exX, cy + ex.yJitter, r, 0, Math.PI * 2);
        ctx.fill();
        drawArrow(ctx, exX, cy + ex.yJitter, exX - 24, cy + ex.yJitter, '#fb923c', 1.6);
      });

      // Draw rocket body moving right
      const rx = MP.clamp(originPxX + rkState.rocketX * pxPerM, 60, W - 76);
      ctx.save();
      ctx.translate(rx, cy);

      // Flame when firing
      if (rkState.burning && rkState.fuelLeft > 1) {
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.moveTo(-42, -10);
        ctx.lineTo(-76 - Math.random() * 14, 0);
        ctx.lineTo(-42, 10);
        ctx.closePath();
        ctx.fill();
      }

      // Hull
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(46, 0);
      ctx.lineTo(14, -18);
      ctx.lineTo(-40, -18);
      ctx.lineTo(-40, 18);
      ctx.lineTo(14, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Nozzle
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-48, -10, 8, 20);

      // Fuel tank gauge inside hull
      const fuelRatio = rkState.fuelInit > 0 ? rkState.fuelLeft / rkState.fuelInit : 0;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-30, -9, 44, 18);
      ctx.fillStyle = fuelRatio > 0.25 ? '#38bdf8' : '#fb923c';
      ctx.fillRect(-28, -7, 40 * fuelRatio, 14);
      ctx.restore();

      // Forward rocket momentum arrow
      if (rkState.rocketVx > 1) {
        const len = MP.clamp(rkState.rocketVx * 0.04, 24, 95);
        drawArrow(ctx, rx + 50, cy, rx + 50 + len, cy, '#38bdf8', 2.8);
      }

      // Status pill top-left
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(14, 14, 215, 24, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#7dd3fc';
      ctx.font = '700 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Fuel left: ${Math.round(rkState.fuelLeft)} kg · v = ${Math.round(rkState.rocketVx)} m/s`, 22, 30);
    }

    function tickRocket(dt) {
      const stepDt = Math.min(typeof dt === 'number' && dt > 0 ? dt : 0.016, 0.03);
      if (rkState.burning && rkState.fuelLeft > 1) {
        rkState.burnTimer += stepDt;
        if (rkState.burnTimer >= 0.09) {
          rkState.burnTimer = 0;
          firePulse(Math.min(rkState.fuelLeft, Math.max(80, rkState.fuelInit * 0.07)));
        }
      } else if (rkState.fuelLeft <= 1 && rkState.burning) {
        rkState.burning = false;
        syncRocketBurnBtn();
      }

      // Move rocket & exhaust visually using scaled speed so both drift realistically
      rkState.rocketX += rkState.rocketVx * stepDt * 1.4;
      for (const ex of rkState.exhaust) {
        ex.x += ex.vx * stepDt * 1.4;
      }

      // Keep rocket comfortably framed if it reaches far right
      if (rkState.rocketX > 4200 && rkState.burning) {
        rkState.burning = false;
        syncRocketBurnBtn();
      }
      drawRocket();
    }

    if (veSlider) veSlider.addEventListener('input', () => { rkState.ve = parseFloat(veSlider.value); resetRocket(); });
    if (fuelSlider) fuelSlider.addEventListener('input', () => { rkState.fuelInit = parseFloat(fuelSlider.value); resetRocket(); });
    if (pulseBtn) pulseBtn.addEventListener('click', () => firePulse(Math.max(120, rkState.fuelInit * 0.1)));
    if (burnBtn) burnBtn.addEventListener('click', () => { rkState.burning = !rkState.burning; syncRocketBurnBtn(); });
    if (resetRkBtn) resetRkBtn.addEventListener('click', resetRocket);

    // Loops & tab switching
    const billiardsLoop = window.SimKit.loop(tickBilliards, { el: window.SimKit.stage(c2dCanvas) });
    const rocketLoop = window.SimKit.loop(tickRocket, { el: window.SimKit.stage(rkCanvas) });
    rocketLoop.pause();

    function switchTab(tab) {
      const isBilliards = tab === 'billiards';
      if (tabBilliards) {
        tabBilliards.classList.toggle('selected', isBilliards);
        tabBilliards.setAttribute('aria-selected', isBilliards ? 'true' : 'false');
      }
      if (tabRocket) {
        tabRocket.classList.toggle('selected', !isBilliards);
        tabRocket.setAttribute('aria-selected', !isBilliards ? 'true' : 'false');
      }
      if (paneBilliards) paneBilliards.hidden = !isBilliards;
      if (paneRocket) paneRocket.hidden = isBilliards;

      if (isBilliards) {
        rocketLoop.pause();
        b2d.resize();
        drawBilliards();
        billiardsLoop.resume();
      } else {
        billiardsLoop.pause();
        rk2d.resize();
        drawRocket();
        rocketLoop.resume();
      }
    }

    if (tabBilliards) tabBilliards.addEventListener('click', () => switchTab('billiards'));
    if (tabRocket) tabRocket.addEventListener('click', () => switchTab('rocket'));

    redrawOnResize(c2dCanvas, drawBilliards);
    redrawOnResize(rkCanvas, drawRocket);
    applyBilliardsPreset('glancing-90');
    resetRocket();

    return {
      redraw() {
        drawBilliards();
        drawRocket();
      }
    };
  }

  /* ========================================================================
     SECTION 5: RELATIVISTIC MOMENTUM CURVE EXPLORER
     ======================================================================== */
  function initRelativisticExplorer() {
    const canvas = document.getElementById('cm-rel-canvas');
    if (!canvas || !window.SimKit) return null;

    const betaSlider = document.getElementById('cm-rel-beta-slider');
    const betaOut = document.getElementById('cm-rel-beta-out');
    const gammaVal = document.getElementById('cm-rel-gamma');
    const ratioVal = document.getElementById('cm-rel-ratio');
    const keRatioVal = document.getElementById('cm-rel-ke-ratio');
    const pcVal = document.getElementById('cm-rel-pc');

    const c2d = window.SimKit.canvas2d(canvas, {});
    let beta = 0.866;

    function updateReadouts() {
      const rel = MP.computeRelativisticMomentum({ massKg: 1.0, beta });
      if (betaOut) betaOut.textContent = beta.toFixed(3) + ' c';
      if (gammaVal) gammaVal.textContent = rel.gamma.toFixed(3);
      if (ratioVal) ratioVal.textContent = rel.gamma.toFixed(2) + '× mv';
      if (keRatioVal) {
        const keRatio = rel.keClassicalJ > 1e-12 ? rel.keRelativisticJ / rel.keClassicalJ : 1;
        keRatioVal.textContent = keRatio.toFixed(2) + '× ½mv²';
      }
      if (pcVal) pcVal.textContent = (rel.pcJ / rel.restEnergyJ).toFixed(2) + ' mc²';
    }

    function draw() {
      const pal = palette();
      const ctx = c2d.ctx;
      const W = c2d.width || 640;
      const H = c2d.height || 290;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = pal.bg;
      ctx.fillRect(0, 0, W, H);

      // Left 62%: p/(mc) vs v/c curve
      const splitX = Math.round(W * 0.63);
      const gx = 52;
      const gy = 26;
      const gw = splitX - gx - 24;
      const gh = H - gy - 38;
      const maxY = 7.0;

      ctx.strokeStyle = pal.border;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx, gy + gh);
      ctx.lineTo(gx + gw, gy + gh);
      ctx.stroke();

      // Light-speed asymptote at v/c = 1.0
      ctx.save();
      ctx.strokeStyle = pal.rose;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(gx + gw, gy);
      ctx.lineTo(gx + gw, gy + gh);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = pal.muted;
      ctx.font = '700 10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('7 mc', gx - 6, gy + 8);
      ctx.fillText('1 mc', gx - 6, gy + gh - (1 / maxY) * gh + 4);
      ctx.fillText('0', gx - 6, gy + gh);
      ctx.textAlign = 'center';
      ctx.fillText('0', gx, gy + gh + 16);
      ctx.fillText('0.5 c', gx + gw * 0.5, gy + gh + 16);
      ctx.fillStyle = pal.rose;
      ctx.fillText('c (limit)', gx + gw - 10, gy + gh + 16);

      // Classical line p/(mc) = beta
      ctx.save();
      ctx.strokeStyle = pal.muted;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(gx, gy + gh);
      ctx.lineTo(gx + gw, gy + gh - (1 / maxY) * gh);
      ctx.stroke();
      ctx.restore();

      // Relativistic curve p/(mc) = gamma * beta
      ctx.save();
      ctx.strokeStyle = pal.violet;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      for (let i = 0; i <= 99; i += 1) {
        const b = i / 100;
        const g = 1 / Math.sqrt(1 - b * b);
        const yVal = Math.min(maxY, g * b);
        const px = gx + b * gw;
        const py = gy + gh - (yVal / maxY) * gh;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();

      // Current slider dot
      const rel = MP.computeRelativisticMomentum({ massKg: 1.0, beta });
      const pNorm = rel.gamma * beta;
      const curX = gx + beta * gw;
      const curY = Math.max(gy + 4, gy + gh - (Math.min(maxY, pNorm) / maxY) * gh);
      ctx.fillStyle = pal.violet;
      ctx.beginPath();
      ctx.arc(curX, curY, 5.5, 0, Math.PI * 2);
      ctx.fill();

      drawPill(ctx, `p = ${pNorm.toFixed(2)} mc`, MP.clamp(curX - 38, gx + 48, gx + gw - 48), Math.max(gy + 16, curY - 16), pal.violet, pal);
      drawPill(ctx, 'Classical p = mv', gx + gw * 0.72, gy + gh - (1 / maxY) * gh - 16, pal.muted, pal);

      // Right 37%: Energy-Momentum Right Triangle E^2 = (pc)^2 + (mc^2)^2
      const tx = splitX + 12;
      const tw = W - tx - 14;
      ctx.fillStyle = pal.bgSub;
      ctx.strokeStyle = pal.border;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(tx, 12, tw, H - 24, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = pal.ink;
      ctx.font = '800 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('E² = (pc)² + (mc²)²', tx + tw / 2, 32);

      // Scale triangle nicely
      const baseLen = Math.min(tw * 0.42, 72);
      const pcRatio = pNorm; // pc / (mc^2) = gamma * beta
      const legH = MP.clamp(baseLen * pcRatio, 6, H - 108);
      const ox = tx + (tw - baseLen) * 0.44;
      const oy = H - 46;

      // Base: mc^2
      ctx.strokeStyle = pal.cyan;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + baseLen, oy);
      ctx.stroke();

      // Height: pc
      ctx.strokeStyle = pal.orange;
      ctx.beginPath();
      ctx.moveTo(ox + baseLen, oy);
      ctx.lineTo(ox + baseLen, oy - legH);
      ctx.stroke();

      // Hypotenuse: E = gamma mc^2
      ctx.strokeStyle = pal.violet;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + baseLen, oy - legH);
      ctx.stroke();

      ctx.font = '700 10px Inter, system-ui, sans-serif';
      ctx.fillStyle = pal.cyan;
      ctx.fillText('mc²', ox + baseLen / 2, oy + 14);
      ctx.fillStyle = pal.orange;
      ctx.textAlign = 'left';
      ctx.fillText(`pc=${pcRatio.toFixed(2)}`, ox + baseLen + 6, oy - legH * 0.45);
      ctx.fillStyle = pal.violet;
      ctx.textAlign = 'right';
      ctx.fillText(`E=${rel.gamma.toFixed(2)}`, ox + baseLen * 0.48 - 4, oy - legH * 0.55);
    }

    if (betaSlider) {
      betaSlider.addEventListener('input', () => {
        beta = parseFloat(betaSlider.value);
        document.querySelectorAll('[data-cm-rel-beta]').forEach(b => {
          const match = Math.abs(parseFloat(b.dataset.cmRelBeta) - beta) < 0.005;
          b.classList.toggle('selected', match);
          b.setAttribute('aria-pressed', match ? 'true' : 'false');
        });
        updateReadouts();
        draw();
      });
    }

    document.querySelectorAll('[data-cm-rel-beta]').forEach(btn => {
      btn.addEventListener('click', () => {
        beta = parseFloat(btn.dataset.cmRelBeta);
        if (betaSlider) betaSlider.value = String(beta);
        document.querySelectorAll('[data-cm-rel-beta]').forEach(b => {
          const active = b === btn;
          b.classList.toggle('selected', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        updateReadouts();
        draw();
      });
    });

    redrawOnResize(canvas, draw);
    updateReadouts();
    draw();

    return { redraw: draw };
  }

  /* ========================================================================
     BENCHMARK TABLE (MOMENTUM VS KINETIC ENERGY)
     ======================================================================== */
  function initBenchmarkTable() {
    const tbody = document.getElementById('cm-bench-tbody');
    if (!tbody) return;
    let currentCat = 'all';

    function formatSci(val) {
      if (val >= 1e6 || (val > 0 && val < 1e-2)) {
        return val.toExponential(2);
      }
      if (val >= 100) return Math.round(val).toLocaleString();
      return val.toFixed(2);
    }

    function render() {
      tbody.innerHTML = '';
      const rows = MP.MOMENTUM_BENCHMARKS.filter(b => currentCat === 'all' || b.category === currentCat);
      const maxLog = Math.log10(1e10);
      const minLog = Math.log10(1e-16);

      rows.forEach(item => {
        const logP = Math.log10(Math.max(1e-16, item.momentumKgMs));
        const pct = MP.clamp(((logP - minLog) / (maxLog - minLog)) * 100, 4, 100);
        const catLabel = item.category === 'everyday' ? 'Everyday' : item.category === 'vehicles' ? 'Vehicles' : 'Relativistic';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${item.name}</strong><br><small style="color:var(--cm-muted)">${item.note}</small></td>
          <td><span class="cm-cat-pill cat-${item.category}">${catLabel}</span></td>
          <td>${formatSci(item.massKg)} kg</td>
          <td>${formatSci(item.speedMs)} m/s</td>
          <td><strong>${formatSci(item.momentumKgMs)} kg·m/s</strong></td>
          <td>${formatSci(item.keJ)} J</td>
          <td><div class="cm-bench-bar-track" aria-hidden="true"><div class="cm-bench-bar-fill" style="width:${pct.toFixed(1)}%"></div></div></td>
        `;
        tbody.appendChild(tr);
      });
    }

    document.querySelectorAll('[data-cm-bench-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentCat = btn.dataset.cmBenchCat;
        document.querySelectorAll('[data-cm-bench-cat]').forEach(b => {
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
    const scoreEl = document.getElementById('cm-practice-score');
    const solved = new Set();

    function updateScore() {
      if (scoreEl) scoreEl.textContent = `Solved: ${solved.size} / 7`;
    }

    document.querySelectorAll('[data-mc="1"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const fb = document.getElementById('mfb-1');
        const hint = document.getElementById('mhint-1');
        document.querySelectorAll('[data-mc="1"]').forEach(b => b.classList.toggle('selected', b === btn));
        if (!fb) return;
        fb.className = 'cm-feedback';
        if (btn.dataset.choice === 'longer') {
          fb.textContent = '✓ Correct! Same Δp over a longer Δt lowers F = Δp / Δt.';
          fb.classList.add('correct');
          if (hint) hint.classList.remove('visible');
          solved.add(1);
        } else {
          fb.textContent = '✗ Try again — the final momentum is still zero, so total Δp is unchanged.';
          fb.classList.add('wrong');
          if (hint) hint.classList.add('visible');
        }
        updateScore();
      });
    });

    function checkNumeric(num) {
      const input = document.getElementById('mans-' + num);
      const fb = document.getElementById('mfb-' + num);
      const hint = document.getElementById('mhint-' + num);
      if (!input || !fb) return;

      const correct = parseFloat(input.dataset.answer);
      const tol = parseFloat(input.dataset.tol || '0.05');
      const val = parseFloat(input.value);

      fb.className = 'cm-feedback';
      if (Number.isNaN(val)) {
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
        input.style.borderColor = '#e11d48';
      }
      updateScore();
    }

    document.querySelectorAll('[data-check]').forEach(btn => {
      btn.addEventListener('click', () => checkNumeric(parseInt(btn.dataset.check, 10)));
    });

    document.querySelectorAll('.cm-problem input[type="number"]').forEach(inp => {
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const num = parseInt(inp.id.replace('mans-', ''), 10);
          checkNumeric(num);
        }
      });
    });

    document.querySelectorAll('[data-hint]').forEach(btn => {
      btn.addEventListener('click', () => {
        const num = btn.dataset.hint;
        const hint = document.getElementById('mhint-' + num);
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
    let airTrackApi = null;
    let impulseApi = null;
    let vectorRocketApi = null;
    let relApi = null;

    if (window.SimKit && window.SimKit.theme) {
      window.SimKit.theme.onChange(colors => {
        isDarkTheme = detectDark(colors);
        if (airTrackApi) airTrackApi.redraw();
        if (impulseApi) impulseApi.redraw();
        if (vectorRocketApi) vectorRocketApi.redraw();
        if (relApi) relApi.redraw();
      });
    } else {
      isDarkTheme = detectDark();
    }

    airTrackApi = initAirTrackLab();
    impulseApi = initImpulseLab();
    vectorRocketApi = initVectorRocketLab();
    relApi = initRelativisticExplorer();
    initBenchmarkTable();
    initPractice();

    window.MomentumLab = {
      loadPreset(id) {
        if (airTrackApi) airTrackApi.loadPreset(id);
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
