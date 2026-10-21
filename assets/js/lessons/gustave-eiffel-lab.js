/* Gustave Eiffel lesson: Wind Load Lab.
   The tower's side silhouette is built from its real widths at the ground and
   each platform. Wind pressure q = ½ρv² (optionally growing with height by a
   1/7 power law) pushes on the iron fraction of each 1 m slice; summing
   force × height gives the overturning moment about the downwind feet, which
   is compared with the restoring moment of the tower's weight × half the base.
   Needs sim-kit.js. */
(function () {
  'use strict';
  if (!window.SimKit) return;
  var canvas = document.getElementById('ge-wind');
  if (!canvas) return;

  var colors = SimKit.theme.colors();
  SimKit.theme.onChange(function (c) { colors = c; render(); });

  var RHO = 1.2, CD = 1.3, HEIGHT = 300, BASE = 125;
  var MASS = 10100e3, G = 9.81;
  var HOLD = MASS * G * (BASE / 2);     // N·m restoring moment
  // [height m, full width m] at the ground, platforms and top.
  var PROFILE = [[0, 125], [57, 70], [116, 40], [200, 22], [276, 10], [300, 3]];

  var vIn = document.getElementById('ge-v'), vOut = document.getElementById('ge-v-out');
  var solIn = document.getElementById('ge-sol'), solOut = document.getElementById('ge-sol-out');
  var gust = document.getElementById('ge-gust');
  var readout = document.getElementById('ge-readout');
  var barWind = document.getElementById('ge-bar-wind');
  var barWeight = document.getElementById('ge-bar-weight');

  function widthAt(h) {
    for (var i = 1; i < PROFILE.length; i++) {
      var a = PROFILE[i - 1], b = PROFILE[i];
      if (h <= b[0]) return a[1] + (b[1] - a[1]) * (h - a[0]) / (b[0] - a[0]);
    }
    return 0;
  }

  function speedAt(v, h) {
    // Slider speed is measured at 10 m, as weather stations do.
    return gust.checked ? v * Math.pow(Math.max(h, 1) / 10, 1 / 7) : v;
  }

  function compute() {
    var v = +vIn.value, sol = +solIn.value / 100;
    var force = 0, moment = 0;
    for (var h = 0.5; h < HEIGHT; h += 1) {
      var u = speedAt(v, h);
      var f = 0.5 * RHO * u * u * CD * widthAt(h) * sol;
      force += f; moment += f * h;
    }
    return { v: v, sol: sol, force: force, moment: moment, at: force ? moment / force : 0 };
  }

  var view = SimKit.canvas2d(canvas, { height: 380, onResize: function () { render(); } });

  function render() {
    if (!view) return;
    var ctx = view.ctx, W = view.width, H = view.height;
    var r = compute();
    ctx.clearRect(0, 0, W, H);
    var pad = 24, ground = H - 28;
    var scale = Math.min((ground - pad) / HEIGHT, (W * 0.5) / BASE);
    var cx = W * 0.58;
    function X(off) { return cx + off * scale; }
    function Y(h) { return ground - h * scale; }

    // Ground.
    ctx.strokeStyle = colors.textMuted; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, ground + 0.5); ctx.lineTo(W, ground + 0.5); ctx.stroke();

    // Silhouette: solid fill scaled by iron fraction, plus lattice lines.
    ctx.beginPath();
    for (var i = 0; i < PROFILE.length; i++) ctx.lineTo(X(-PROFILE[i][1] / 2), Y(PROFILE[i][0]));
    for (var j = PROFILE.length - 1; j >= 0; j--) ctx.lineTo(X(PROFILE[j][1] / 2), Y(PROFILE[j][0]));
    ctx.closePath();
    ctx.save();
    ctx.globalAlpha = 0.12 + 0.75 * r.sol;
    ctx.fillStyle = '#7c2d12';
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 2; ctx.stroke();

    // Lattice cross-bracing, thinner as the tower gets more solid.
    if (r.sol < 1) {
      ctx.save(); ctx.clip();
      ctx.strokeStyle = '#7c2d12'; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
      var step = 10 * scale;
      for (var d = -W; d < W * 2; d += step) {
        ctx.beginPath(); ctx.moveTo(d, ground); ctx.lineTo(d + H, ground - H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(d, ground); ctx.lineTo(d - H, ground - H); ctx.stroke();
      }
      ctx.restore();
    }
    // The arch under the first platform.
    ctx.fillStyle = colors.bg;
    ctx.beginPath(); ctx.ellipse(cx, Y(0), 38 * scale, 40 * scale, 0, Math.PI, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, Y(0), 38 * scale, 40 * scale, 0, Math.PI, 2 * Math.PI); ctx.stroke();

    // Wind arrows on the left, length ~ local pressure.
    var maxQ = 0.5 * RHO * Math.pow(speedAt(100, HEIGHT), 2);
    ctx.strokeStyle = '#2563eb'; ctx.fillStyle = '#2563eb'; ctx.lineWidth = 2;
    for (var h = 20; h < HEIGHT; h += 35) {
      var q = 0.5 * RHO * Math.pow(speedAt(r.v, h), 2);
      var len = 8 + (W * 0.32) * (q / maxQ);
      if (!r.v) continue;
      var tip = X(-widthAt(h) / 2) - 6, y = Y(h);
      arrow(ctx, tip - len, y, tip, y, 7);
    }

    // Resultant force at its centre of pressure.
    if (r.force > 0) {
      var ya = Y(r.at), tipx = X(-widthAt(r.at) / 2);
      ctx.strokeStyle = '#dc2626'; ctx.fillStyle = '#dc2626'; ctx.lineWidth = 4;
      arrow(ctx, tipx - 70, ya, tipx + 4, ya, 12);
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillText('F = ' + fmtN(r.force), Math.max(4, tipx - 150), ya - 10);
      ctx.fillText('at ' + Math.round(r.at) + ' m', Math.max(4, tipx - 150), ya + 18);
    }

    // Weight arrow and pivot.
    ctx.strokeStyle = '#1d4ed8'; ctx.fillStyle = '#1d4ed8'; ctx.lineWidth = 4;
    arrow(ctx, cx, Y(90), cx, Y(30), 12);
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText('weight 99 MN', cx + 8, Y(70));
    ctx.fillStyle = colors.text;
    ctx.beginPath(); ctx.moveTo(X(BASE / 2), ground); ctx.lineTo(X(BASE / 2) - 8, ground + 14); ctx.lineTo(X(BASE / 2) + 8, ground + 14); ctx.closePath(); ctx.fill();
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('pivot', X(BASE / 2) + 10, ground + 14);

    updateText(r);
  }

  function arrow(ctx, x0, y0, x1, y1, head) {
    var a = Math.atan2(y1 - y0, x1 - x0);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - head * Math.cos(a - 0.45), y1 - head * Math.sin(a - 0.45));
    ctx.lineTo(x1 - head * Math.cos(a + 0.45), y1 - head * Math.sin(a + 0.45));
    ctx.closePath(); ctx.fill();
  }

  function fmtN(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + ' GN';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + ' MN';
    if (n >= 1e3) return (n / 1e3).toFixed(0) + ' kN';
    return Math.round(n) + ' N';
  }

  function updateText(r) {
    vOut.textContent = r.v + ' m/s (' + Math.round(r.v * 3.6) + ' km/h)';
    solOut.textContent = Math.round(r.sol * 100) + '%';
    var q = 0.5 * RHO * r.v * r.v;
    var sf = r.moment > 0 ? HOLD / r.moment : Infinity;
    var verdict = !isFinite(sf) ? 'No wind, nothing to tip it.'
      : sf >= 2 ? 'Stands easily.'
      : sf >= 1 ? 'Still stands, but with little margin. Engineers want much more.'
      : 'Tips over: the wind wins.';
    readout.textContent = 'Pressure at 10 m: ' + Math.round(q) + ' Pa. Wind force: ' + fmtN(r.force) +
      '. Tipping moment: ' + (r.moment / 1e9).toFixed(2) + ' GN·m vs. weight holding ' + (HOLD / 1e9).toFixed(2) +
      ' GN·m. Safety factor: ' + (isFinite(sf) ? sf.toFixed(1) : '∞') + '. ' + verdict;
    var biggest = Math.max(HOLD, r.moment);
    barWind.style.width = (100 * r.moment / biggest).toFixed(1) + '%';
    barWeight.style.width = (100 * HOLD / biggest).toFixed(1) + '%';
  }

  vIn.addEventListener('input', render);
  solIn.addEventListener('input', render);
  gust.addEventListener('change', render);
  document.getElementById('ge-solid').addEventListener('click', function () { solIn.value = 100; render(); });
  document.getElementById('ge-lattice').addEventListener('click', function () { solIn.value = 20; render(); });
  render();
})();
