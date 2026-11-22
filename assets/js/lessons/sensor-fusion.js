/* Sensor Fusion Lab: estimate a robot's tilt from a drifting gyro and a noisy
   accelerometer, alone and fused with a complementary or Kalman filter. */
(function () {
  'use strict';
  var RA = window.RobotAutonomy;
  var SF = window.SensorFusionEngine;
  var canvas = document.getElementById('sf-canvas');
  if (!canvas || !SF) return;
  var W = 640, H = 320;
  var ctx = RA.setupHiDpiCanvas(canvas, W, H).ctx;
  var PANEL = 170, SPAN = 8, RATE = 100, DT = 1 / RATE; // seconds shown, sensor Hz
  var DEG = SF.DEG;
  var ui = {
    alpha: document.getElementById('sf-alpha'), bias: document.getElementById('sf-bias'),
    noise: document.getElementById('sf-noise'), bumps: document.getElementById('sf-bumps'),
    shock: document.getElementById('sf-shock'),
    motion: document.getElementById('sf-motion'), tilt: document.getElementById('sf-tilt'),
    reset: document.getElementById('sf-reset'), run: document.getElementById('sf-run'),
    readout: document.getElementById('sf-readout'), show: document.querySelectorAll('[data-sf-show]')
  };
  // Each line also has its own dash pattern and an end label, so the chart
  // reads without relying on colour.
  var SERIES = {
    truth: { color: '#e8f6fb', width: 3.5, dash: [], label: 'True angle', tag: 'TRUE' },
    gyro: { color: '#ff9a6b', width: 2.5, dash: [10, 5], label: 'Gyro only', tag: 'GYRO' },
    accel: { color: '#70c8e5', width: 1.2, dash: [], label: 'Accel only', tag: 'ACCEL' },
    comp: { color: '#b8d84b', width: 2.5, dash: [2, 4], label: 'Complementary', tag: 'COMP' },
    kalman: { color: '#f2bf3f', width: 2.5, dash: [14, 4, 2, 4], label: 'Kalman', tag: 'KALMAN' }
  };
  var t, truth, prevTruth, est, hist, running = !RA.reducedMotion, acc = 0, kf, lastErr = null, shockTimer = 0;

  function reset() {
    t = 0; truth = 0; prevTruth = 0; hist = []; shockTimer = 0;
    est = { gyro: 0, accel: 0, comp: 0, kalman: 0 };
    kf = SF.createKalmanState();
    // When the sim starts paused (reduced motion), fill the chart so there is
    // something to read before anyone presses Play.
    if (!running) for (var i = 0; i < SPAN * RATE; i++) sample();
  }

  function kalmanStep(rate, measured) {
    return SF.kalmanStep({
      state: kf,
      gyroRate: rate,
      accelAngle: measured,
      dt: DT,
      qAngle: 0.001,
      qBias: 0.003,
      rMeasure: Math.pow(Math.max(0.5, +ui.noise.value) / DEG, 2)
    });
  }

  function trueAngle(time) {
    if (ui.motion.value === 'manual') return +ui.tilt.value / DEG;
    if (ui.motion.value === 'still') return 0.2;
    return (18 * Math.sin(time * 1.3) + 9 * Math.sin(time * 3.7 + 1) + 5 * Math.sin(time * 0.4)) / DEG;
  }

  function sample() {
    t += DT;
    prevTruth = truth;
    // Manual tilt eases toward the slider so the gyro sees a real rate.
    var target = trueAngle(t);
    truth = ui.motion.value === 'manual' ? truth + (target - truth) * 0.08 : target;
    var rate = (truth - prevTruth) / DT;
    var gyro = rate + (+ui.bias.value) / DEG + RA.gauss() * 0.6 / DEG;
    var accelAngle = truth + RA.gauss() * (+ui.noise.value) / DEG;
    // Bumps: linear acceleration from driving shakes the accelerometer, not the gyro.
    if (ui.bumps.checked && Math.random() < 0.04) accelAngle += (Math.random() - 0.5) * 50 / DEG;
    if (shockTimer > 0) {
      var phase = (0.25 - shockTimer) / 0.25;
      shockTimer = Math.max(0, shockTimer - DT);
      accelAngle += (32 * Math.sin(phase * Math.PI * 2)) / DEG;
    }
    var a = +ui.alpha.value;
    est.gyro += gyro * DT;
    est.accel = accelAngle;
    est.comp = SF.complementaryStep({ est: est.comp, gyroRate: gyro, accelAngle: accelAngle, dt: DT, alpha: a });
    est.kalman = kalmanStep(gyro, accelAngle);
    hist.push({ t: t, truth: truth, gyro: est.gyro, accel: est.accel, comp: est.comp, kalman: est.kalman });
    while (hist.length && hist[0].t < t - SPAN) hist.shift();
  }

  function visible(key) {
    var el = document.querySelector('[data-sf-show="' + key + '"]');
    return !el || el.checked;
  }

  function draw() {
    RoboticsVisuals.floor(ctx, W, H, { step: 0 });
    RoboticsVisuals.plate(ctx, 5, 5, PANEL - 8, H - 10, 7, '#0e213064', '#8cb8c44a');
    RoboticsVisuals.plate(ctx, PANEL + 4, 5, W - PANEL - 9, H - 10, 7, '#0a1726a0', '#8cb8c44a');
    // Left: the robot body, true tilt solid, estimates as ghost lines.
    var cx = PANEL / 2, cy = H / 2 + 50;
    ctx.fillStyle = '#29424b'; ctx.fillRect(12, cy + 22, PANEL - 24, 6);
    // Protractor arc behind the robot
    ctx.strokeStyle = 'rgba(112,200,229,.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, 128, -Math.PI / 2 - 0.8, -Math.PI / 2 + 0.8); ctx.stroke();
    [-40, -20, 0, 20, 40].forEach(function (d) {
      var a = -Math.PI / 2 + d / DEG;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 122, cy + Math.sin(a) * 122); ctx.lineTo(cx + Math.cos(a) * 134, cy + Math.sin(a) * 134); ctx.stroke();
    });
    ['gyro', 'comp', 'kalman'].forEach(function (k) {
      if (!visible(k)) return;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(est[k]);
      ctx.strokeStyle = SERIES[k].color; ctx.lineWidth = 2.5; ctx.setLineDash(SERIES[k].dash.length ? SERIES[k].dash : [5, 4]);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -124); ctx.stroke(); ctx.restore();
    });
    ctx.setLineDash([]);
    // Balancing robot: wheel, body, head with eyes, IMU chip
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(truth);
    RoboticsVisuals.plate(ctx, -18, -112, 36, 102, 10,
      RoboticsVisuals.gradient(ctx, -18, -112, 18, -10, ['#9ce7ec', '#2486a0', '#174354']), '#b9e9ee', 1.5);
    RoboticsVisuals.plate(ctx, -13, -74, 26, 46, 4, '#193745', '#76a8b7');
    ctx.fillStyle = '#b9d3db';
    for (var pin = -8; pin <= 8; pin += 4) {
      ctx.fillRect(pin, -65, 2, 5);
      ctx.fillRect(pin, -49, 2, 5);
    }
    RA.roundRect(ctx, -12, -104, 24, 20, 6); ctx.fillStyle = '#e8f6fb'; ctx.fill();
    ctx.fillStyle = '#12202a'; ctx.beginPath(); ctx.arc(-5, -94, 2.6, 0, Math.PI * 2); ctx.arc(5, -94, 2.6, 0, Math.PI * 2); ctx.fill();
    RA.roundRect(ctx, -10, -62, 20, 16, 3); ctx.fillStyle = '#12202a'; ctx.fill();
    ctx.fillStyle = '#f2bf3f'; ctx.fillRect(-6, -58, 12, 8);
    ctx.restore();
    RoboticsVisuals.shadow(ctx, cx + 3, cy + 24, 26, 8);
    RoboticsVisuals.disc(ctx, cx, cy + 8, 17, '#0b1418');
    RoboticsVisuals.joint(ctx, cx, cy + 8, 11);
    ctx.fillStyle = '#d4e0df'; ctx.font = '600 11px IBM Plex Mono, monospace'; ctx.textAlign = 'center';
    ctx.fillText('tilt ' + (truth * DEG).toFixed(1) + '°', cx, 24);
    ctx.fillStyle = '#8fa7a4'; ctx.fillText('yellow chip = IMU', cx, H - 10);

    // Right: strip chart.
    var x0 = PANEL + 10, x1 = W - 10, y0 = 14, y1 = H - 20, range = 45;
    function X(tt) { return x0 + (tt - (t - SPAN)) / SPAN * (x1 - x0); }
    function Y(a) { return (y0 + y1) / 2 - Math.max(-range, Math.min(range, a * DEG)) / range * (y1 - y0) / 2; }
    ctx.strokeStyle = '#92c7d62b'; ctx.lineWidth = 1;
    for (var secondsAgo = 0; secondsAgo <= SPAN; secondsAgo += 2) {
      var gx = X(t - secondsAgo);
      ctx.beginPath(); ctx.moveTo(gx, y0); ctx.lineTo(gx, y1); ctx.stroke();
      ctx.fillStyle = '#9bb6bf'; ctx.font = '10px IBM Plex Mono, monospace';
      ctx.textAlign = secondsAgo === 0 ? 'right' : 'left'; ctx.textBaseline = 'top';
      ctx.fillText(secondsAgo ? '−' + secondsAgo + ' s' : 'now', gx, y1 + 4);
    }
    ctx.textBaseline = 'alphabetic';
    [-30, -15, 0, 15, 30].forEach(function (d) { ctx.beginPath(); ctx.moveTo(x0, Y(d / DEG)); ctx.lineTo(x1, Y(d / DEG)); ctx.stroke(); });
    ctx.fillStyle = '#8fa7a4'; ctx.textAlign = 'right'; ctx.font = '10px IBM Plex Mono, monospace';
    [-30, 0, 30].forEach(function (d) { ctx.fillText(d + '°', x0 + 26, Y(d / DEG) - 3); });
    var labels = [];
    ['accel', 'gyro', 'comp', 'kalman', 'truth'].forEach(function (k) {
      if (!visible(k) || hist.length < 2) return;
      ctx.strokeStyle = SERIES[k].color; ctx.lineWidth = SERIES[k].width; ctx.globalAlpha = k === 'accel' ? 0.7 : 1;
      ctx.setLineDash(SERIES[k].dash);
      ctx.beginPath();
      hist.forEach(function (h, i) { if (i) ctx.lineTo(X(h.t), Y(h[k])); else ctx.moveTo(X(h.t), Y(h[k])); });
      ctx.stroke(); ctx.globalAlpha = 1; ctx.setLineDash([]);
      labels.push({ k: k, y: Y(hist[hist.length - 1][k]) });
    });
    // End labels, nudged apart so they never overlap.
    labels.sort(function (a, b) { return a.y - b.y; });
    for (var li = 1; li < labels.length; li++) if (labels[li].y - labels[li - 1].y < 13) labels[li].y = labels[li - 1].y + 13;
    ctx.font = '700 10px IBM Plex Mono, monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    labels.forEach(function (l) {
      var w = ctx.measureText(SERIES[l.k].tag).width + 8;
      ctx.fillStyle = 'rgba(15,29,35,.85)'; ctx.fillRect(x1 - w - 2, l.y - 7, w + 2, 14);
      ctx.fillStyle = SERIES[l.k].color; ctx.fillText(SERIES[l.k].tag, x1 - 4, l.y);
    });
    ctx.textBaseline = 'alphabetic';

    // Error scoreboard over the visible window.
    var err = { gyro: [], accel: [], comp: [], kalman: [] };
    hist.forEach(function (h) {
      Object.keys(err).forEach(function (k) { err[k].push(h[k] - h.truth); });
    });
    lastErr = {};
    Object.keys(err).forEach(function (k) { lastErr[k] = SF.rmseDeg(err[k]); });
    ui.readout.textContent = 'Average error (last ' + SPAN + ' s): ' + Object.keys(err).map(function (k) {
      return SERIES[k].label.toLowerCase() + ' ' + lastErr[k].toFixed(1) + '°';
    }).join(' · ') + ' · Kalman learned bias: ' + (kf.bias * DEG).toFixed(1) + '°/s (true ' + (+ui.bias.value).toFixed(1) + '°/s)';
  }

  function updateAlphaReadout() {
    var out = document.getElementById('sf-alpha-out');
    if (!out || !ui.alpha) return;
    var a = +ui.alpha.value;
    var tau = SF.crossoverTimeConstant(a, DT);
    var tauText = !isFinite(tau) ? '∞' : (tau >= 10 ? tau.toFixed(1) : tau.toFixed(2)) + ' s';
    out.textContent = a.toFixed(3) + ' (τ = ' + tauText + ')';
  }
  updateAlphaReadout();
  if (ui.alpha) ui.alpha.addEventListener('input', updateAlphaReadout);

  [['bias', 1], ['noise', 0], ['tilt', 0]].forEach(function (pair) {
    var el = ui[pair[0]], out = document.getElementById('sf-' + pair[0] + '-out');
    el.addEventListener('input', function () { out.textContent = (+el.value).toFixed(pair[1]); });
  });
  if (ui.shock) {
    ui.shock.addEventListener('click', function () {
      shockTimer = 0.25;
      if (!running) { running = true; syncRun(); }
      RA.announce('Injecting 0.25 second lateral shock disturbance to the accelerometer.', true);
    });
  }
  ui.motion.addEventListener('change', function () { ui.tilt.disabled = ui.motion.value !== 'manual'; });
  ui.reset.addEventListener('click', reset);
  function syncRun() {
    ui.run.textContent = running ? 'Pause' : 'Play';
    ui.run.setAttribute('aria-pressed', String(!running));
  }
  ui.run.addEventListener('click', function () { running = !running; syncRun(); });
  syncRun();
  // Spoken / text summary of the chart for anyone who can't see it.
  var describeBtn = document.getElementById('sf-describe');
  if (describeBtn) describeBtn.addEventListener('click', function () {
    if (!lastErr) return;
    var keys = ['gyro', 'accel', 'comp', 'kalman'].filter(visible);
    if (!keys.length) { RA.announce('Turn on at least one estimate to compare.', true); return; }
    keys.sort(function (a, b) { return lastErr[a] - lastErr[b]; });
    var best = keys[0], worst = keys[keys.length - 1];
    var msg = 'The true tilt is ' + (truth * DEG).toFixed(0) + ' degrees. Over the last ' + SPAN + ' seconds, ' +
      SERIES[best].label + ' is closest to the truth, off by ' + lastErr[best].toFixed(1) + ' degrees on average' +
      (keys.length > 1 ? ', and ' + SERIES[worst].label + ' is furthest off, by ' + lastErr[worst].toFixed(1) + ' degrees.' : '.') +
      (visible('gyro') && est.gyro - truth > 0.17 ? ' The gyro line has drifted upward.' : visible('gyro') && truth - est.gyro > 0.17 ? ' The gyro line has drifted downward.' : '');
    var out = document.getElementById('sf-description');
    if (out) out.textContent = msg;
    RA.announce(msg, true);
  });
  reset();
  RA.loop(function (dt) {
    if (running) { acc += dt; while (acc >= DT) { acc -= DT; sample(); } }
    draw();
  }, canvas);

  /* ── Sim 2: Competition autonomous navigation & gyro turn ──────── */
  (function navSim() {
    var navCanvas = document.getElementById('sf-nav-canvas');
    if (!navCanvas) return;
    var NW = 640, NH = 340;
    var nctx = RA.setupHiDpiCanvas(navCanvas, NW, NH).ctx;
    var nui = {
      modes: document.querySelectorAll('[data-sf-nav]'),
      asym: document.getElementById('sf-asym'),
      asymOut: document.getElementById('sf-asym-out'),
      bump: document.getElementById('sf-nav-bump'),
      cal: document.getElementById('sf-nav-cal'),
      run: document.getElementById('sf-nav-run'),
      all: document.getElementById('sf-nav-all'),
      readout: document.getElementById('sf-nav-readout')
    };

    var MODES = {
      timed: { label: 'Open-loop timed', color: '#ff9a6b', dash: [8, 4] },
      encoders: { label: 'Wheel encoders only', color: '#70c8e5', dash: [4, 4] },
      rawgyro: { label: 'Uncalibrated gyro', color: '#f2bf3f', dash: [10, 4, 2, 4] },
      fused: { label: 'Fused IMU + Encoders', color: '#b8d84b', dash: [] }
    };
    var START = { x: 85, y: 255 }, GOAL = { x: 470, y: 100 };
    var BUMP = { x: 245, w: 36 }, PX_PER_CM = 2; // 2 px = 1 cm

    var activeMode = 'fused';
    var runs = [];
    var playing = false;

    function createAgent(modeKey) {
      return {
        mode: modeKey,
        x: START.x, y: START.y, a: 0,
        estHeading: 0, estDist: 0,
        phase: 0, // 0: straight1 (385px), 1: turn -90°, 2: straight2 (155px), 3: done
        t: 0, bumpDone: false, encSlip: 0,
        pts: [{ x: START.x, y: START.y }],
        done: false, ptsEarned: 0, errCm: 0
      };
    }

    function scoreAgent(ag) {
      var errPx = Math.hypot(ag.x - GOAL.x, ag.y - GOAL.y);
      ag.errCm = errPx / PX_PER_CM;
      ag.ptsEarned = ag.errCm <= 12 ? 40 : ag.errCm <= 25 ? 20 : ag.errCm <= 45 ? 10 : 0;
    }

    function stepAgent(ag, dt) {
      if (ag.done) return;
      ag.t += dt;
      var asym = (+nui.asym.value) / 100;
      var bumpOn = nui.bump.checked;
      var calOn = nui.cal.checked;
      var gyroBias = (ag.mode === 'rawgyro' || (ag.mode === 'fused' && !calOn)) ? (3.8 / DEG) : 0;
      var V = 135, W = 1.9, TRACK = 26;

      var vL = 0, vR = 0;
      if (ag.phase === 0) {
        if (ag.mode === 'timed') {
          vL = V; vR = V;
          if (ag.t >= 385 / V) ag.phase = 1;
        } else if (ag.mode === 'encoders') {
          // Encoder loop balances wheel speeds, eliminating motor asymmetry!
          vL = V; vR = V;
          ag.estDist += V * dt * (ag.inBump ? 0.65 : 1);
          if (ag.estDist >= 385) ag.phase = 1;
        } else {
          // Gyro heading hold keeps heading near 0
          var err0 = 0 - ag.estHeading;
          var corr0 = Math.max(-45, Math.min(45, err0 * 140));
          vL = V + corr0; vR = V - corr0;
          ag.estDist += V * dt * (ag.mode === 'fused' ? 1 : (ag.inBump ? 0.85 : 1));
          if (ag.estDist >= 385) ag.phase = 1;
        }
      } else if (ag.phase === 1) {
        var turnW = W;
        // Screen y points down, so turning upward toward GOAL (-90°) needs negative ω (vL < vR).
        if (ag.mode === 'timed') {
          vL = -turnW * TRACK / 2; vR = turnW * TRACK / 2;
          if (ag.t >= 385 / V + (Math.PI / 2) / turnW) { ag.phase = 2; ag.estDist = 0; }
        } else if (ag.mode === 'encoders') {
          vL = -turnW * TRACK / 2; vR = turnW * TRACK / 2;
          ag.encTurn = (ag.encTurn || 0) + turnW * dt;
          if (ag.encTurn >= Math.PI / 2) { ag.phase = 2; ag.estDist = 0; }
        } else {
          vL = -turnW * TRACK / 2; vR = turnW * TRACK / 2;
          if (ag.estHeading <= -Math.PI / 2) { ag.phase = 2; ag.estDist = 0; }
        }
      } else if (ag.phase === 2) {
        if (ag.mode === 'timed') {
          vL = V; vR = V;
          if (ag.t >= 385 / V + (Math.PI / 2) / W + 155 / V) ag.phase = 3;
        } else if (ag.mode === 'encoders') {
          vL = V; vR = V;
          ag.estDist += V * dt;
          if (ag.estDist >= 155) ag.phase = 3;
        } else {
          var err2 = (-Math.PI / 2) - ag.estHeading;
          var corr2 = Math.max(-45, Math.min(45, err2 * 140));
          vL = V + corr2; vR = V - corr2;
          ag.estDist += V * dt;
          if (ag.estDist >= 155) ag.phase = 3;
        }
      }

      if (ag.phase === 3) {
        ag.done = true;
        scoreAgent(ag);
        return;
      }

      // Physical chassis motion with motor asymmetry (encoders/gyro cancel it via feedback, timed does not)
      var trueL = vL * (ag.mode === 'timed' ? (1 - asym * 0.65) : 1);
      var trueR = vR * (ag.mode === 'timed' ? (1 + asym * 0.65) : 1);
      var vTrue = (trueL + trueR) / 2;
      var wTrue = (trueL - trueR) / TRACK;

      ag.inBump = bumpOn && ag.x >= BUMP.x && ag.x <= BUMP.x + BUMP.w && ag.y > 210;
      if (ag.inBump && !ag.bumpDone) {
        ag.bumpDone = true;
        // Floor seam kicks the robot 12° off course instantaneously
        var kick = 12 / DEG;
        ag.a += kick;
        if (ag.mode === 'rawgyro' || ag.mode === 'fused') ag.estHeading += kick;
      }

      ag.a += wTrue * dt;
      ag.estHeading += (wTrue + gyroBias) * dt;
      ag.x += Math.cos(ag.a) * vTrue * dt;
      ag.y += Math.sin(ag.a) * vTrue * dt;
      var last = ag.pts[ag.pts.length - 1];
      if (!last || Math.hypot(last.x - ag.x, last.y - ag.y) > 4) ag.pts.push({ x: ag.x, y: ag.y });
    }

    function launch(modeList, instant) {
      runs = modeList.map(createAgent);
      playing = true;
      if (instant || RA.reducedMotion) {
        for (var k = 0; k < 600 && runs.some(function (r) { return !r.done; }); k++) {
          runs.forEach(function (r) { stepAgent(r, 0.02); });
        }
        playing = false;
        reportNav();
      }
      drawNav();
    }

    function reportNav() {
      if (!runs.length) return;
      var summary = runs.map(function (r) {
        return MODES[r.mode].label + ': ' + r.errCm.toFixed(1) + ' cm err (' + r.ptsEarned + ' pts)';
      }).join(' · ');
      nui.readout.textContent = summary;
      if (!playing) RA.announce(summary);
    }

    function drawNav() {
      RoboticsVisuals.floor(nctx, NW, NH, { step: 20, frame: true });

      // Ideal planned route
      nctx.setLineDash([5, 5]); nctx.strokeStyle = 'rgba(232,246,251,.3)'; nctx.lineWidth = 2;
      nctx.beginPath(); nctx.moveTo(START.x, START.y); nctx.lineTo(GOAL.x, START.y); nctx.lineTo(GOAL.x, GOAL.y); nctx.stroke();
      nctx.setLineDash([]);

      // Floor bump hazard strip
      if (nui.bump.checked) {
        nctx.fillStyle = 'rgba(198,94,46,.32)';
        nctx.fillRect(BUMP.x, 195, BUMP.w, 120);
        nctx.strokeStyle = '#c65e2e'; nctx.lineWidth = 2;
        nctx.strokeRect(BUMP.x, 195, BUMP.w, 120);
        nctx.fillStyle = '#ffd6b8'; nctx.font = '700 10px "IBM Plex Mono", monospace'; nctx.textAlign = 'center';
        nctx.fillText('FLOOR SEAM', BUMP.x + BUMP.w / 2, 188);
      }

      // Scoring target concentric boxes
      [
        { r: 45 * PX_PER_CM, col: 'rgba(112,200,229,.12)', stroke: 'rgba(112,200,229,.45)', label: '10 pts' },
        { r: 25 * PX_PER_CM, col: 'rgba(242,191,63,.16)', stroke: 'rgba(242,191,63,.65)', label: '20 pts' },
        { r: 12 * PX_PER_CM, col: 'rgba(184,216,75,.28)', stroke: '#b8d84b', label: '40 pts' }
      ].forEach(function (z) {
        nctx.fillStyle = z.col; nctx.strokeStyle = z.stroke; nctx.lineWidth = 1.5;
        nctx.beginPath(); nctx.arc(GOAL.x, GOAL.y, z.r, 0, Math.PI * 2); nctx.fill(); nctx.stroke();
      });
      nctx.fillStyle = '#e8f6fb'; nctx.font = '700 11px "IBM Plex Mono", monospace'; nctx.textAlign = 'center';
      nctx.fillText('40 PT BULLSEYE', GOAL.x, GOAL.y - 12 * PX_PER_CM - 6);

      // Start pad
      RA.drawPad(nctx, START.x, START.y, 16, '#3fa6cc', 'START');

      // Agent paths & bots
      runs.forEach(function (ag) {
        var meta = MODES[ag.mode];
        nctx.strokeStyle = meta.color; nctx.lineWidth = 3; nctx.setLineDash(meta.dash);
        nctx.beginPath();
        ag.pts.forEach(function (p, i) { if (i) nctx.lineTo(p.x, p.y); else nctx.moveTo(p.x, p.y); });
        nctx.stroke(); nctx.setLineDash([]);
        RA.drawRobot(nctx, ag.x, ag.y, ag.a, 10, { body: meta.color, outline: '#0f1d23', ghost: ag.done ? 0.95 : 1 });
      });

      if (playing && runs.every(function (r) { return r.done; })) {
        playing = false;
        reportNav();
      }
    }

    nui.modes.forEach(function (b) {
      b.addEventListener('click', function () {
        activeMode = b.dataset.sfNav;
        nui.modes.forEach(function (m) { m.setAttribute('aria-pressed', String(m === b)); });
        launch([activeMode], false);
      });
    });
    nui.asym.addEventListener('input', function () { nui.asymOut.textContent = nui.asym.value + '%'; });
    nui.run.addEventListener('click', function () { launch([activeMode], false); });
    nui.all.addEventListener('click', function () { launch(['timed', 'encoders', 'rawgyro', 'fused'], false); });
    [nui.asym, nui.bump, nui.cal].forEach(function (el) {
      el.addEventListener('change', function () { launch(runs.length > 1 ? ['timed', 'encoders', 'rawgyro', 'fused'] : [activeMode], true); });
    });

    launch(['timed', 'encoders', 'rawgyro', 'fused'], true);
    RA.loop(function (dt) {
      if (playing) {
        var stepDt = 0.02, rem = Math.min(0.05, dt);
        while (rem > 0) {
          var h = Math.min(stepDt, rem);
          runs.forEach(function (r) { stepAgent(r, h); });
          rem -= h;
        }
        drawNav();
      }
    }, navCanvas);
  })();
})();
