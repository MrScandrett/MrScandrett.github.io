/* Sensor Fusion Lab: estimate a robot's tilt from a drifting gyro and a noisy
   accelerometer, alone and fused with a complementary or Kalman filter. */
(function () {
  'use strict';
  var RA = window.RobotAutonomy;
  var canvas = document.getElementById('sf-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  var PANEL = 170, SPAN = 8, RATE = 100, DT = 1 / RATE; // seconds shown, sensor Hz
  var DEG = 180 / Math.PI;
  var ui = {
    alpha: document.getElementById('sf-alpha'), bias: document.getElementById('sf-bias'),
    noise: document.getElementById('sf-noise'), bumps: document.getElementById('sf-bumps'),
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
  var t, truth, prevTruth, est, hist, running = !RA.reducedMotion, acc = 0, kf, lastErr = null;

  function reset() {
    t = 0; truth = 0; prevTruth = 0; hist = [];
    est = { gyro: 0, accel: 0, comp: 0, kalman: 0 };
    kf = { angle: 0, bias: 0, P: [[1, 0], [0, 1]] };
    // When the sim starts paused (reduced motion), fill the chart so there is
    // something to read before anyone presses Play.
    if (!running) for (var i = 0; i < SPAN * RATE; i++) sample();
  }

  // Classic two-state (angle, gyro bias) Kalman filter used on hobby balancing robots.
  function kalmanStep(rate, measured) {
    var Qa = 0.001, Qb = 0.003, Rm = Math.pow(Math.max(0.5, +ui.noise.value) / DEG, 2);
    var P = kf.P;
    kf.angle += DT * (rate - kf.bias);
    P[0][0] += DT * (DT * P[1][1] - P[0][1] - P[1][0] + Qa);
    P[0][1] -= DT * P[1][1];
    P[1][0] -= DT * P[1][1];
    P[1][1] += Qb * DT;
    var S = P[0][0] + Rm, K0 = P[0][0] / S, K1 = P[1][0] / S, y = measured - kf.angle;
    kf.angle += K0 * y; kf.bias += K1 * y;
    var p00 = P[0][0], p01 = P[0][1];
    P[0][0] -= K0 * p00; P[0][1] -= K0 * p01; P[1][0] -= K1 * p00; P[1][1] -= K1 * p01;
    return kf.angle;
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
    var a = +ui.alpha.value;
    est.gyro += gyro * DT;
    est.accel = accelAngle;
    est.comp = a * (est.comp + gyro * DT) + (1 - a) * accelAngle;
    est.kalman = kalmanStep(gyro, accelAngle);
    hist.push({ t: t, truth: truth, gyro: est.gyro, accel: est.accel, comp: est.comp, kalman: est.kalman });
    while (hist.length && hist[0].t < t - SPAN) hist.shift();
  }

  function visible(key) {
    var el = document.querySelector('[data-sf-show="' + key + '"]');
    return !el || el.checked;
  }

  function draw() {
    ctx.fillStyle = '#0f1d23'; ctx.fillRect(0, 0, W, H);
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
    RA.roundRect(ctx, -18, -112, 36, 102, 10);
    ctx.fillStyle = '#146b8c'; ctx.fill(); ctx.strokeStyle = '#e8f6fb'; ctx.lineWidth = 2; ctx.stroke();
    RA.roundRect(ctx, -12, -104, 24, 20, 6); ctx.fillStyle = '#e8f6fb'; ctx.fill();
    ctx.fillStyle = '#12202a'; ctx.beginPath(); ctx.arc(-5, -94, 2.6, 0, Math.PI * 2); ctx.arc(5, -94, 2.6, 0, Math.PI * 2); ctx.fill();
    RA.roundRect(ctx, -10, -62, 20, 16, 3); ctx.fillStyle = '#12202a'; ctx.fill();
    ctx.fillStyle = '#f2bf3f'; ctx.fillRect(-6, -58, 12, 8);
    ctx.restore();
    ctx.fillStyle = '#0b1418'; ctx.beginPath(); ctx.arc(cx, cy + 8, 17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4d6a73'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy + 8, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#d4e0df'; ctx.font = '600 11px IBM Plex Mono, monospace'; ctx.textAlign = 'center';
    ctx.fillText('tilt ' + (truth * DEG).toFixed(1) + '°', cx, 24);
    ctx.fillStyle = '#8fa7a4'; ctx.fillText('yellow chip = IMU', cx, H - 10);

    // Right: strip chart.
    var x0 = PANEL + 10, x1 = W - 10, y0 = 14, y1 = H - 20, range = 45;
    function X(tt) { return x0 + (tt - (t - SPAN)) / SPAN * (x1 - x0); }
    function Y(a) { return (y0 + y1) / 2 - Math.max(-range, Math.min(range, a * DEG)) / range * (y1 - y0) / 2; }
    ctx.strokeStyle = 'rgba(112,200,229,.12)'; ctx.lineWidth = 1;
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
    var err = { gyro: 0, accel: 0, comp: 0, kalman: 0 };
    hist.forEach(function (h) { Object.keys(err).forEach(function (k) { err[k] += (h[k] - h.truth) * (h[k] - h.truth); }); });
    var n = Math.max(1, hist.length);
    lastErr = {};
    Object.keys(err).forEach(function (k) { lastErr[k] = Math.sqrt(err[k] / n) * DEG; });
    ui.readout.textContent = 'Average error (last ' + SPAN + ' s): ' + Object.keys(err).map(function (k) {
      return SERIES[k].label.toLowerCase() + ' ' + (Math.sqrt(err[k] / n) * DEG).toFixed(1) + '°';
    }).join(' · ');
  }

  [['alpha', 3], ['bias', 1], ['noise', 0], ['tilt', 0]].forEach(function (pair) {
    var el = ui[pair[0]], out = document.getElementById('sf-' + pair[0] + '-out');
    el.addEventListener('input', function () { out.textContent = (+el.value).toFixed(pair[1]); });
  });
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
  });
})();
