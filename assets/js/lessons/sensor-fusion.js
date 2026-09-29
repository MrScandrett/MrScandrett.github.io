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
  var SERIES = {
    truth: { color: '#e8f6fb', width: 3, label: 'True angle' },
    gyro: { color: '#c65e2e', width: 2, label: 'Gyro only' },
    accel: { color: '#70c8e5', width: 1, label: 'Accel only' },
    comp: { color: '#b8d84b', width: 2, label: 'Complementary' },
    kalman: { color: '#f2bf3f', width: 2, label: 'Kalman' }
  };
  var t, truth, prevTruth, est, hist, running = true, acc = 0, kf;

  function reset() {
    t = 0; truth = 0; prevTruth = 0; hist = [];
    est = { gyro: 0, accel: 0, comp: 0, kalman: 0 };
    kf = { angle: 0, bias: 0, P: [[1, 0], [0, 1]] };
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
    ['gyro', 'comp', 'kalman'].forEach(function (k) {
      if (!visible(k)) return;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(est[k]);
      ctx.strokeStyle = SERIES[k].color; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -120); ctx.stroke(); ctx.restore();
    });
    ctx.setLineDash([]);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(truth);
    ctx.fillStyle = '#146b8c'; ctx.strokeStyle = '#e8f6fb'; ctx.lineWidth = 2;
    ctx.fillRect(-16, -110, 32, 100); ctx.strokeRect(-16, -110, 32, 100);
    ctx.fillStyle = '#f2bf3f'; ctx.fillRect(-8, -60, 16, 12);
    ctx.restore();
    ctx.fillStyle = '#29424b'; ctx.beginPath(); ctx.arc(cx, cy + 8, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d4e0df'; ctx.font = '600 11px IBM Plex Mono, monospace'; ctx.textAlign = 'center';
    ctx.fillText('IMU', cx, cy - 64 + 30);
    ctx.fillText('tilt ' + (truth * DEG).toFixed(1) + '°', cx, 24);

    // Right: strip chart.
    var x0 = PANEL + 10, x1 = W - 10, y0 = 14, y1 = H - 20, range = 45;
    function X(tt) { return x0 + (tt - (t - SPAN)) / SPAN * (x1 - x0); }
    function Y(a) { return (y0 + y1) / 2 - Math.max(-range, Math.min(range, a * DEG)) / range * (y1 - y0) / 2; }
    ctx.strokeStyle = 'rgba(112,200,229,.12)'; ctx.lineWidth = 1;
    [-30, -15, 0, 15, 30].forEach(function (d) { ctx.beginPath(); ctx.moveTo(x0, Y(d / DEG)); ctx.lineTo(x1, Y(d / DEG)); ctx.stroke(); });
    ctx.fillStyle = '#8fa7a4'; ctx.textAlign = 'right'; ctx.font = '10px IBM Plex Mono, monospace';
    [-30, 0, 30].forEach(function (d) { ctx.fillText(d + '°', x0 + 26, Y(d / DEG) - 3); });
    ['accel', 'gyro', 'comp', 'kalman', 'truth'].forEach(function (k) {
      if (!visible(k) || hist.length < 2) return;
      ctx.strokeStyle = SERIES[k].color; ctx.lineWidth = SERIES[k].width; ctx.globalAlpha = k === 'accel' ? 0.7 : 1;
      ctx.beginPath();
      hist.forEach(function (h, i) { if (i) ctx.lineTo(X(h.t), Y(h[k])); else ctx.moveTo(X(h.t), Y(h[k])); });
      ctx.stroke(); ctx.globalAlpha = 1;
    });

    // Error scoreboard over the visible window.
    var err = { gyro: 0, accel: 0, comp: 0, kalman: 0 };
    hist.forEach(function (h) { Object.keys(err).forEach(function (k) { err[k] += (h[k] - h.truth) * (h[k] - h.truth); }); });
    var n = Math.max(1, hist.length);
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
  ui.run.addEventListener('click', function () {
    running = !running;
    ui.run.textContent = running ? 'Pause' : 'Resume';
    ui.run.setAttribute('aria-pressed', String(!running));
  });
  reset();
  RA.loop(function (dt) {
    if (running) { acc += dt; while (acc >= DT) { acc -= DT; sample(); } }
    draw();
  });
})();
