/* Rainbows — lessons/earth-science/rainbows.html
   Three linked sims: a ray-traced raindrop, an exit-angle graph with a
   "where the light piles up" histogram, and a sky view that paints the bow
   around the antisolar point. All angles come from Snell's law with a
   Cauchy fit for water: n(λ) = 1.3247 + 3088 / λ² (λ in nm), which gives
   n ≈ 1.331 at 700 nm and 1.344 at 400 nm. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var DEG = Math.PI / 180;

  /* ── Optics ─────────────────────────────────────────────────────── */
  function indexOf(lambda) { return 1.3247 + 3088 / (lambda * lambda); }

  // Angle (degrees) between the exit ray and the antisolar direction for a
  // ray hitting at impact parameter b (0..1) after k internal reflections.
  function exitAngle(b, k, n) {
    var i = Math.asin(b), r = Math.asin(b / n);
    var D = 2 * (i - r) + k * (Math.PI - 2 * r);
    return (k === 1 ? Math.PI - D : D - Math.PI) / DEG;
  }

  // The turning point has a closed form: cos i = sqrt((n² − 1) / (k(k + 2))).
  function peak(k, n) {
    var c = Math.sqrt((n * n - 1) / (k * (k + 2)));
    var b = Math.sqrt(1 - c * c);
    return { b: b, theta: exitAngle(b, k, n) };
  }

  var BOW = [];   // per-wavelength bow radii, 400..700 nm
  for (var wl = 400; wl <= 700; wl += 2) {
    var nn = indexOf(wl);
    BOW.push({ wl: wl, p: peak(1, nn).theta, s: peak(2, nn).theta });
  }
  var P_VIOLET = BOW[0].p, P_RED = BOW[BOW.length - 1].p;
  var S_RED = BOW[BOW.length - 1].s, S_VIOLET = BOW[0].s;

  function wavelengthAt(theta, key) {
    var best = BOW[0], bestErr = Infinity;
    BOW.forEach(function (row) {
      var err = Math.abs(row[key] - theta);
      if (err < bestErr) { bestErr = err; best = row; }
    });
    return best.wl;
  }

  // Approximate visible-spectrum colour (after Dan Bruton's mapping).
  function wlRGB(l) {
    var r = 0, g = 0, b = 0;
    if (l < 440) { r = -(l - 440) / 60; b = 1; }
    else if (l < 490) { g = (l - 440) / 50; b = 1; }
    else if (l < 510) { g = 1; b = -(l - 510) / 20; }
    else if (l < 580) { r = (l - 510) / 70; g = 1; }
    else if (l < 645) { r = 1; g = -(l - 645) / 65; }
    else { r = 1; }
    var f = l < 420 ? 0.35 + 0.65 * (l - 400) / 20 : l > 680 ? 0.35 + 0.65 * (700 - l) / 20 : 1;
    f = Math.max(0.35, f);
    return [Math.round(255 * Math.pow(r * f, 0.8)), Math.round(255 * Math.pow(g * f, 0.8)), Math.round(255 * Math.pow(b * f, 0.8))];
  }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function colorName(l) {
    if (l >= 625) return 'red';
    if (l >= 590) return 'orange';
    if (l >= 565) return 'yellow';
    if (l >= 500) return 'green';
    if (l >= 450) return 'blue';
    return 'violet';
  }

  var WHITE_SET = [700, 655, 610, 580, 550, 520, 490, 460, 430, 405];

  /* ── Shared lesson state ────────────────────────────────────────── */
  var state = {
    b: 0.86,
    light: 'white',
    wl: 650,
    order: 1,
    bundle: false,
    normals: true,
    exaggerate: false
  };

  /* ── 1 · Raindrop ray tracer ────────────────────────────────────── */
  var dropCanvas = $('rb-drop-canvas');
  var drop = null;
  var pulse = 0;

  function effIndex(lambda) {
    var n = indexOf(lambda);
    if (!state.exaggerate) return n;
    var mid = indexOf(550);
    return mid + (n - mid) * 6;
  }

  function dot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
  function refract(d, N, eta) {         // N must face the incoming ray
    var ci = -dot(N, d);
    var k = 1 - eta * eta * (1 - ci * ci);
    if (k < 0) return null;
    var f = eta * ci - Math.sqrt(k);
    return [eta * d[0] + f * N[0], eta * d[1] + f * N[1]];
  }

  // Trace in canvas coordinates. Primary rays enter the upper half and
  // secondary rays the lower half, so both leave heading down-left toward
  // an observer standing below the drop.
  function traceRay(cx, cy, R, b, k, n) {
    var side = k === 1 ? -1 : 1;
    var y = cy + side * b * R;
    var p = [cx - Math.sqrt(Math.max(0, R * R - (b * R) * (b * R))), y];
    var pts = [p];
    var leaks = [];
    var normals = [];
    var Nout = [(p[0] - cx) / R, (p[1] - cy) / R];
    normals.push({ p: p, N: Nout });
    var d = refract([1, 0], Nout, 1 / n);
    for (var j = 0; j <= k; j++) {
      var rel = [p[0] - cx, p[1] - cy];
      var t = -2 * dot(rel, d);
      p = [p[0] + t * d[0], p[1] + t * d[1]];
      pts.push(p);
      Nout = [(p[0] - cx) / R, (p[1] - cy) / R];
      normals.push({ p: p, N: Nout });
      var out = refract(d, [-Nout[0], -Nout[1]], n);
      if (j < k) {
        if (out) leaks.push({ p: p, d: out });
        var q = 2 * dot(d, Nout);
        d = [d[0] - q * Nout[0], d[1] - q * Nout[1]];
      } else {
        d = out;
      }
    }
    return { entryY: y, pts: pts, exit: d, leaks: leaks, normals: normals };
  }

  function dropGeom(w, h) {
    var R = Math.min(w * 0.26, h * 0.34);
    return { R: R, cx: w * 0.62, cy: h * 0.42 };
  }

  function strokePath(ctx, pts, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }

  function rayToEdge(p, d, w, h) {
    var t = Infinity;
    if (d[0] < 0) t = Math.min(t, -p[0] / d[0]);
    if (d[0] > 0) t = Math.min(t, (w - p[0]) / d[0]);
    if (d[1] < 0) t = Math.min(t, -p[1] / d[1]);
    if (d[1] > 0) t = Math.min(t, (h - p[1]) / d[1]);
    return [p[0] + t * d[0], p[1] + t * d[1]];
  }

  function drawFullRay(ctx, w, h, g, tr, color, width, alpha) {
    var pts = [[0, tr.entryY]].concat(tr.pts);
    ctx.globalAlpha = alpha;
    strokePath(ctx, pts, color, width);
    var end = rayToEdge(tr.pts[tr.pts.length - 1], tr.exit, w, h);
    strokePath(ctx, [tr.pts[tr.pts.length - 1], end], color, width);
    ctx.globalAlpha = 1;
    return end;
  }

  // Draws the shorter arc from angle a0 to a1 and labels its midpoint.
  function drawArcLabel(ctx, p, a0, a1, r, label, color) {
    var delta = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(p[0], p[1], r, a0, a0 + delta, delta < 0);
    ctx.stroke();
    var am = a0 + delta / 2;
    ctx.fillStyle = color;
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, p[0] + Math.cos(am) * (r + 16), p[1] + Math.sin(am) * (r + 14));
  }

  function drawDrop() {
    if (!drop) return;
    var ctx = drop.ctx, w = drop.width, h = drop.height;
    var g = dropGeom(w, h);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    var bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0d1626');
    bg.addColorStop(1, '#070b14');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Sun label
    ctx.fillStyle = 'rgba(255, 214, 102, 0.85)';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('☀ sunlight →', 10, 10);

    // The drop
    var dg = ctx.createRadialGradient(g.cx - g.R * 0.3, g.cy - g.R * 0.35, g.R * 0.1, g.cx, g.cy, g.R);
    dg.addColorStop(0, 'rgba(140, 200, 255, 0.22)');
    dg.addColorStop(1, 'rgba(40, 110, 200, 0.16)');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, g.R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150, 205, 255, 0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();

    var k = state.order;
    ctx.globalCompositeOperation = 'lighter';
    var main = null;

    if (state.bundle) {
      var lam = state.light === 'single' ? state.wl : 580;
      var col = state.light === 'single' ? rgba(wlRGB(lam), 1) : 'rgb(255, 246, 220)';
      for (var i = 0; i < 30; i++) {
        var bb = 0.02 + i * (0.97 / 29);
        var trb = traceRay(g.cx, g.cy, g.R, bb, k, effIndex(lam));
        drawFullRay(ctx, w, h, g, trb, col, 1, 0.28);
      }
      main = traceRay(g.cx, g.cy, g.R, state.b, k, effIndex(lam));
      drawFullRay(ctx, w, h, g, main, col, 2.6, 0.95);
    } else if (state.light === 'single') {
      main = traceRay(g.cx, g.cy, g.R, state.b, k, effIndex(state.wl));
      main.leaks.forEach(function (lk) {
        var e = rayToEdge(lk.p, lk.d, w, h);
        ctx.globalAlpha = 0.22;
        strokePath(ctx, [lk.p, e], rgba(wlRGB(state.wl), 1), 1.5);
      });
      ctx.globalAlpha = 1;
      drawFullRay(ctx, w, h, g, main, rgba(wlRGB(state.wl), 1), 2.6, 1);
    } else {
      WHITE_SET.forEach(function (lam) {
        var tr = traceRay(g.cx, g.cy, g.R, state.b, k, effIndex(lam));
        tr.leaks.forEach(function (lk) {
          var e = rayToEdge(lk.p, lk.d, w, h);
          ctx.globalAlpha = 0.07;
          strokePath(ctx, [lk.p, e], rgba(wlRGB(lam), 1), 1.5);
        });
        drawFullRay(ctx, w, h, g, tr, rgba(wlRGB(lam), 1), 2.2, 0.55);
      });
      main = traceRay(g.cx, g.cy, g.R, state.b, k, effIndex(550));
    }
    ctx.globalCompositeOperation = 'source-over';

    // Travelling light pulse along the highlighted path
    var path = [[0, main.entryY]].concat(main.pts);
    var tail = rayToEdge(main.pts[main.pts.length - 1], main.exit, w, h);
    path.push(tail);
    var lens = [], total = 0;
    for (var s = 1; s < path.length; s++) {
      var L = Math.hypot(path[s][0] - path[s - 1][0], path[s][1] - path[s - 1][1]);
      lens.push(L); total += L;
    }
    var dist = pulse * total;
    for (var s2 = 0; s2 < lens.length; s2++) {
      if (dist <= lens[s2]) {
        var f = dist / lens[s2];
        var px = path[s2][0] + (path[s2 + 1][0] - path[s2][0]) * f;
        var py = path[s2][1] + (path[s2 + 1][1] - path[s2][1]) * f;
        var glow = ctx.createRadialGradient(px, py, 0, px, py, 12);
        glow.addColorStop(0, 'rgba(255,255,255,0.95)');
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2); ctx.fill();
        break;
      }
      dist -= lens[s2];
    }

    if (state.normals) {
      var muted = 'rgba(200, 220, 240, 0.55)';
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = muted;
      ctx.lineWidth = 1;
      main.normals.forEach(function (nm, idx) {
        if (idx > 0 && idx < main.normals.length - 1) return;
        ctx.beginPath();
        ctx.moveTo(nm.p[0] + nm.N[0] * 46, nm.p[1] + nm.N[1] * 46);
        ctx.lineTo(nm.p[0] - nm.N[0] * 40, nm.p[1] - nm.N[1] * 40);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      var n0 = indexOf(state.light === 'single' ? state.wl : 550);
      var iDeg = Math.asin(state.b) / DEG;
      var rDeg = Math.asin(state.b / n0) / DEG;
      var entry = main.normals[0];
      var outAng = Math.atan2(entry.N[1], entry.N[0]);
      var inAng = Math.PI;           // direction back toward the Sun
      if (state.b > 0.05) {
        drawArcLabel(ctx, entry.p, outAng, inAng, 26, 'i ' + iDeg.toFixed(0) + '°', '#ffd666');
        var inside = Math.atan2(main.pts[1][1] - entry.p[1], main.pts[1][0] - entry.p[0]);
        drawArcLabel(ctx, entry.p, inside, outAng + Math.PI, 34, 'r ' + rDeg.toFixed(0) + '°', '#8fd3ff');
      }

      // Exit angle measured against a line parallel to the sunlight.
      var ex = main.pts[main.pts.length - 1];
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = 'rgba(255, 214, 102, 0.55)';
      ctx.beginPath();
      ctx.moveTo(ex[0], ex[1]);
      ctx.lineTo(Math.max(8, ex[0] - 150), ex[1]);
      ctx.stroke();
      ctx.setLineDash([]);
      var exAng = Math.atan2(main.exit[1], main.exit[0]);
      var th = exitAngle(state.b, k, n0);
      drawArcLabel(ctx, ex, Math.PI, exAng, 70, th.toFixed(1) + '°', '#ffffff');
      ctx.fillStyle = 'rgba(220, 232, 245, 0.7)';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('parallel to the sunlight', ex[0] - 6, ex[1] - 4);
    }

    // Observer hint
    ctx.fillStyle = 'rgba(220, 232, 245, 0.75)';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('↙ toward you', 10, h - 10);
    ctx.restore();
  }

  function updateDropReadouts() {
    var lam = state.light === 'single' ? state.wl : 550;
    var n = indexOf(lam);
    var iDeg = Math.asin(state.b) / DEG;
    var rDeg = Math.asin(state.b / n) / DEG;
    var D = 2 * (iDeg - rDeg) + state.order * (180 - 2 * rDeg);
    $('rb-r-i').textContent = iDeg.toFixed(1) + '°';
    $('rb-r-r').textContent = rDeg.toFixed(1) + '°';
    $('rb-r-d').textContent = D.toFixed(1) + '°';
    if (state.light === 'single') {
      $('rb-r-theta').textContent = exitAngle(state.b, state.order, n).toFixed(1) + '°';
    } else {
      $('rb-r-theta').textContent = exitAngle(state.b, state.order, indexOf(700)).toFixed(1) + '° red · ' +
        exitAngle(state.b, state.order, indexOf(400)).toFixed(1) + '° violet';
    }
    $('rb-drop-tag').textContent = state.order === 1 ? 'Primary bow · 1 internal reflection' : 'Secondary bow · 2 internal reflections';
  }

  /* ── 2 · Exit-angle graph + histogram ───────────────────────────── */
  var graphCanvas = $('rb-graph-canvas');
  var graph = null;
  var HIST = (function () {
    // Sunlight lands evenly across the drop's face, so sample b uniformly.
    var bins1 = new Float32Array(91), bins2 = new Float32Array(91);
    var n = indexOf(550), N = 6000;
    for (var i = 0; i < N; i++) {
      var b = (i + 0.5) / N;
      var t1 = exitAngle(b, 1, n), t2 = exitAngle(b, 2, n);
      if (t1 >= 0 && t1 <= 90) bins1[Math.floor(t1)] += 1;
      if (t2 >= 0 && t2 <= 90) bins2[Math.floor(t2)] += 0.45;
    }
    return { p: bins1, s: bins2 };
  })();

  function drawGraph() {
    if (!graph) return;
    var ctx = graph.ctx, w = graph.width, h = graph.height;
    var narrow = w < 520;
    var m = { l: 46, r: narrow ? 70 : 120, t: 16, b: 40 };
    var pw = w - m.l - m.r, ph = h - m.t - m.b;
    var X = function (b) { return m.l + b * pw; };
    var Y = function (t) { return m.t + ph - (t / 90) * ph; };
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a111e';
    ctx.fillRect(0, 0, w, h);

    // Alexander's dark band (between the two turning points)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(m.l, Y(S_RED), pw + m.r - 8, Y(P_RED) - Y(S_RED));
    ctx.fillStyle = 'rgba(200, 215, 235, 0.55)';
    ctx.font = 'italic 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(narrow ? 'dark band: no light' : "no light leaves here: Alexander's dark band", m.l + 8, (Y(S_RED) + Y(P_RED)) / 2);

    // Grid + axes
    ctx.strokeStyle = 'rgba(160, 190, 220, 0.12)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(200, 215, 235, 0.7)';
    ctx.font = '11px system-ui, sans-serif';
    for (var t = 0; t <= 90; t += 15) {
      ctx.beginPath(); ctx.moveTo(m.l, Y(t)); ctx.lineTo(m.l + pw, Y(t)); ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(t + '°', m.l - 6, Y(t));
    }
    for (var bx = 0; bx <= 1.0001; bx += 0.25) {
      ctx.beginPath(); ctx.moveTo(X(bx), m.t); ctx.lineTo(X(bx), m.t + ph); ctx.stroke();
      ctx.textAlign = bx > 0.99 ? 'right' : 'center';
      ctx.fillText(bx.toFixed(2), X(bx) + (bx > 0.99 ? 4 : 0), m.t + ph + 13);
    }
    ctx.fillText('where the beam hits the drop (0 = center, 1 = edge)', m.l + pw / 2, h - 10);
    ctx.save();
    ctx.translate(12, m.t + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('angle from antisolar point', 0, 0);
    ctx.restore();

    // Curves (both orders; the active one is bold)
    [1, 2].forEach(function (k) {
      [700, 400].forEach(function (lam) {
        var n = indexOf(lam);
        ctx.strokeStyle = rgba(wlRGB(lam), k === state.order ? 1 : 0.35);
        ctx.lineWidth = k === state.order ? 2.4 : 1.4;
        ctx.beginPath();
        var started = false;
        for (var i = 0; i <= 300; i++) {
          var b = i / 300 * 0.999;
          var th = exitAngle(b, k, n);
          if (th > 90) { started = false; continue; }
          if (!started) { ctx.moveTo(X(b), Y(th)); started = true; }
          else ctx.lineTo(X(b), Y(th));
        }
        ctx.stroke();
      });
    });

    // Peak markers for the active order
    [700, 400].forEach(function (lam) {
      var pk = peak(state.order, indexOf(lam));
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = rgba(wlRGB(lam), 0.6);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(pk.b), Y(pk.theta)); ctx.lineTo(m.l + pw, Y(pk.theta)); ctx.stroke();
      ctx.setLineDash([]);
    });
    var pkLabel = peak(state.order, indexOf(700));
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(state.order === 1 ? 'flat top → light piles up' : 'flat bottom → light piles up',
      X(pkLabel.b) - 10, state.order === 1 ? Y(pkLabel.theta) + 14 : Y(pkLabel.theta) + 8);

    // Current hit point
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(X(state.b), m.t); ctx.lineTo(X(state.b), m.t + ph); ctx.stroke();
    ctx.setLineDash([]);
    [700, 400].forEach(function (lam) {
      var th = exitAngle(state.b, state.order, indexOf(lam));
      if (th > 90) return;
      ctx.fillStyle = rgba(wlRGB(lam), 1);
      ctx.strokeStyle = '#0a111e';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X(state.b), Y(th), 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });

    // Histogram: how much light leaves at each angle
    var hx = m.l + pw + 8, hw = m.r - 16;
    var max = 0;
    for (var i2 = 0; i2 <= 90; i2++) max = Math.max(max, HIST.p[i2], HIST.s[i2]);
    for (var a = 0; a < 90; a++) {
      var vP = HIST.p[a] / max, vS = HIST.s[a] / max;
      var y0 = Y(a + 1), bh = Math.max(1, Y(a) - Y(a + 1) - 0.5);
      if (vP > 0) {
        ctx.fillStyle = 'rgba(255, 236, 190,' + (state.order === 1 ? 0.9 : 0.4) + ')';
        ctx.fillRect(hx, y0, Math.max(1, Math.sqrt(vP) * hw), bh);
      }
      if (vS > 0) {
        ctx.fillStyle = 'rgba(190, 210, 255,' + (state.order === 2 ? 0.9 : 0.4) + ')';
        ctx.fillRect(hx, y0, Math.max(1, Math.sqrt(vS) * hw), bh);
      }
    }
    ctx.fillStyle = 'rgba(200, 215, 235, 0.75)';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('light leaving', hx, 2);
    ctx.fillText('at each angle', hx + 6, m.t + ph + 18);
  }

  /* ── 3 · Sky view ───────────────────────────────────────────────── */
  var skyCanvas = $('rb-sky-canvas');
  var sky = null;
  var sk = { sun: 15, walk: 0, rain: 80, secondary: true, guides: true, plane: false, probe: null };
  var streaks = [];
  for (var si = 0; si < 140; si++) streaks.push({ x: Math.random(), y: Math.random(), v: 0.6 + Math.random() * 0.6, l: 0.6 + Math.random() * 0.8 });
  var TREES = [];
  (function () {
    var seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var i = 0; i < 26; i++) TREES.push({ x: -170 + i * 13 + rnd() * 9, s: 0.6 + rnd() * 0.7, row: rnd() < 0.5 ? 0 : 1 });
  })();

  function skyGeom(w, h) {
    if (sk.plane) {
      var ppd = Math.min(w / 2, h / 2) / 57;
      return { ppd: ppd, ax: w / 2, ay: h / 2, horizon: -1 };
    }
    var horizon = h * 0.7;
    var ppd2 = Math.min(w / 120, horizon / 58);
    return { ppd: ppd2, ax: w / 2, ay: horizon + sk.sun * ppd2, horizon: horizon };
  }

  function ring(ctx, x, y, r0, r1) {
    ctx.beginPath();
    ctx.arc(x, y, r1, 0, Math.PI * 2);
    if (r0 > 0) ctx.arc(x, y, r0, 0, Math.PI * 2, true);
  }

  function drawSky(time) {
    if (!sky) return;
    var ctx = sky.ctx, w = sky.width, h = sky.height;
    var G = skyGeom(w, h);
    var rain = sk.rain / 100;
    var lowSun = Math.max(0, 1 - sk.sun / 40);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    // Sky
    var sg = ctx.createLinearGradient(0, 0, 0, sk.plane ? h : G.horizon);
    if (sk.plane) {
      sg.addColorStop(0, '#5b6b80');
      sg.addColorStop(1, '#46566c');
    } else {
      sg.addColorStop(0, 'rgb(' + Math.round(48 + 20 * (1 - rain)) + ',' + Math.round(62 + 30 * (1 - rain)) + ',' + Math.round(86 + 40 * (1 - rain)) + ')');
      sg.addColorStop(1, 'rgb(' + Math.round(120 + 40 * lowSun) + ',' + Math.round(132 + 20 * lowSun) + ',' + Math.round(150 - 10 * lowSun) + ')');
    }
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, h);

    // Sky brightness pattern from the drops: brighter inside the bow,
    // darker between the bows.
    if (!sk.plane) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, w, G.horizon); ctx.clip();
    }
    var r1 = P_VIOLET * G.ppd, r2 = S_RED * G.ppd;
    ctx.fillStyle = 'rgba(255,255,255,' + (0.13 * rain) + ')';
    ring(ctx, G.ax, G.ay, 0, r1); ctx.fill('evenodd');
    ctx.fillStyle = 'rgba(0,0,0,' + (0.16 * rain) + ')';
    ring(ctx, G.ax, G.ay, P_RED * G.ppd, r2); ctx.fill('evenodd');

    // Rain streaks
    ctx.strokeStyle = 'rgba(210, 225, 240,' + (0.18 * rain) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath();
    var count = Math.round(streaks.length * rain);
    var top = sk.plane ? h : G.horizon;
    for (var i = 0; i < count; i++) {
      var s = streaks[i];
      var y = ((s.y + time * 0.00035 * s.v) % 1) * top;
      var x = s.x * w;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3 * s.l, y + 14 * s.l);
    }
    ctx.stroke();

    // The bows
    ctx.globalCompositeOperation = 'lighter';
    // Each wavelength ring is smeared by the Sun's 0.5° disk, so neighbouring
    // rings overlap. Divide by the overlap count so the primary keeps a fixed
    // brightness and the secondary stays visibly fainter at any canvas size.
    var bandW = Math.max(1.5, G.ppd * 0.55);
    var steps = BOW.length - 1;
    var overlapP = Math.max(1, bandW / ((P_RED - P_VIOLET) / steps * G.ppd));
    var overlapS = Math.max(1, bandW / ((S_VIOLET - S_RED) / steps * G.ppd));
    var alphaP = 0.75 * rain / overlapP, alphaS = 0.3 * rain / overlapS;
    BOW.forEach(function (row) {
      var c = wlRGB(row.wl);
      ctx.strokeStyle = rgba(c, alphaP);
      ctx.lineWidth = bandW;
      ctx.beginPath(); ctx.arc(G.ax, G.ay, row.p * G.ppd, 0, Math.PI * 2); ctx.stroke();
      if (sk.secondary) {
        ctx.strokeStyle = rgba(c, alphaS);
        ctx.beginPath(); ctx.arc(G.ax, G.ay, row.s * G.ppd, 0, Math.PI * 2); ctx.stroke();
      }
    });
    ctx.globalCompositeOperation = 'source-over';
    if (!sk.plane) ctx.restore();

    if (sk.plane) {
      // Glory + the plane's shadow at the antisolar point
      ctx.globalCompositeOperation = 'lighter';
      [[2.2, [120, 180, 255]], [3.0, [255, 220, 120]], [3.8, [255, 120, 140]]].forEach(function (g) {
        ctx.strokeStyle = rgba(g[1], 0.3);
        ctx.lineWidth = G.ppd * 0.6;
        ctx.beginPath(); ctx.arc(G.ax, G.ay, g[0] * G.ppd, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(20, 28, 40, 0.75)';
      ctx.save();
      ctx.translate(G.ax, G.ay);
      ctx.beginPath();
      ctx.ellipse(0, 0, G.ppd * 1.6, G.ppd * 0.28, 0, 0, Math.PI * 2);
      ctx.ellipse(-G.ppd * 0.1, 0, G.ppd * 0.28, G.ppd * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      drawGround(ctx, w, h, G);
    }

    if (sk.guides) drawGuides(ctx, w, h, G);
    if (sk.probe) drawProbe(ctx, w, h, G);

    // Sun badge
    ctx.fillStyle = 'rgba(8, 14, 24, 0.7)';
    var label = sk.plane ? '☀ Sun behind and above you' : '☀ Sun behind you, ' + sk.sun + '° up';
    ctx.font = '600 12px system-ui, sans-serif';
    var tw = ctx.measureText(label).width;
    roundRect(ctx, w - tw - 28, 10, tw + 18, 24, 12); ctx.fill();
    ctx.fillStyle = '#ffd666';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, w - 19, 22);
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawGround(ctx, w, h, G) {
    var H = G.horizon;
    var light = 0.55 + 0.45 * Math.min(1, sk.sun / 30);
    // Far hills
    ctx.fillStyle = 'rgb(' + Math.round(52 * light) + ',' + Math.round(82 * light) + ',' + Math.round(70 * light) + ')';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var x = 0; x <= w; x += 12) {
      var wx = (x - w / 2) / G.ppd + sk.walk * 0.15;
      ctx.lineTo(x, H - 6 - 5 * Math.sin(wx * 0.09) - 3 * Math.sin(wx * 0.23 + 1));
    }
    ctx.lineTo(w, H); ctx.closePath(); ctx.fill();
    // Field
    var fg = ctx.createLinearGradient(0, H, 0, h);
    fg.addColorStop(0, 'rgb(' + Math.round(70 * light) + ',' + Math.round(110 * light) + ',' + Math.round(62 * light) + ')');
    fg.addColorStop(1, 'rgb(' + Math.round(96 * light) + ',' + Math.round(140 * light) + ',' + Math.round(70 * light) + ')');
    ctx.fillStyle = fg;
    ctx.fillRect(0, H, w, h - H);
    // Trees slide past as you walk; the bow does not.
    TREES.forEach(function (t) {
      var parallax = t.row === 0 ? 1.4 : 2.6;
      var x = w / 2 + (t.x - sk.walk) * parallax * G.ppd * 0.18;
      if (x < -30 || x > w + 30) return;
      var base = H + (t.row === 0 ? 3 : 10);
      var size = t.s * (t.row === 0 ? 11 : 18) * G.ppd / 6;
      ctx.fillStyle = 'rgb(' + Math.round(30 * light) + ',' + Math.round(58 * light) + ',' + Math.round(40 * light) + ')';
      ctx.beginPath();
      ctx.moveTo(x, base - size * 2.2);
      ctx.lineTo(x + size * 0.7, base);
      ctx.lineTo(x - size * 0.7, base);
      ctx.closePath();
      ctx.fill();
    });
    // Your shadow points at the antisolar point.
    var feetY = h + 4;
    var tipY = Math.min(G.ay, h - 4);
    ctx.fillStyle = 'rgba(10, 20, 14, 0.45)';
    ctx.beginPath();
    ctx.moveTo(G.ax - 16, feetY);
    ctx.lineTo(G.ax + 16, feetY);
    ctx.lineTo(G.ax + 5, tipY + 6);
    ctx.lineTo(G.ax - 5, tipY + 6);
    ctx.closePath();
    ctx.fill();
    if (G.ay < h) {
      ctx.beginPath(); ctx.ellipse(G.ax, tipY, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    }
    // Viewer seen from behind
    ctx.fillStyle = '#121a26';
    ctx.beginPath(); ctx.arc(G.ax, h - 46, 11, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(G.ax - 22, h);
    ctx.quadraticCurveTo(G.ax - 22, h - 34, G.ax, h - 34);
    ctx.quadraticCurveTo(G.ax + 22, h - 34, G.ax + 22, h);
    ctx.closePath(); ctx.fill();
  }

  function drawGuides(ctx, w, h, G) {
    ctx.save();
    // Hidden part of the circle, below the horizon
    if (!sk.plane) {
      ctx.beginPath(); ctx.rect(0, G.horizon, w, h - G.horizon); ctx.clip();
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(G.ax, G.ay, 42 * G.ppd, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.save();
    }
    // Antisolar point marker
    var vis = G.ay < h - 2;
    if (vis) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(G.ax - 8, G.ay); ctx.lineTo(G.ax + 8, G.ay);
      ctx.moveTo(G.ax, G.ay - 8); ctx.lineTo(G.ax, G.ay + 8);
      ctx.stroke();
      ctx.fillStyle = 'rgba(8, 14, 24, 0.7)';
      ctx.font = '600 11px system-ui, sans-serif';
      var t = sk.plane ? 'antisolar point (your shadow)' : 'antisolar point (your head’s shadow)';
      if (ctx.measureText(t).width + 40 > w / 2) t = 'antisolar point';
      var tw = ctx.measureText(t).width;
      roundRect(ctx, G.ax + 12, G.ay - 9, tw + 12, 18, 9); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(t, G.ax + 18, G.ay);
    }
    // Radius spokes
    var spokes = [[42, -Math.PI / 2 - 0.5, '42°']];
    if (sk.secondary) spokes.push([51, -Math.PI / 2 + 0.5, '51°']);
    spokes.forEach(function (sp) {
      var ex = G.ax + Math.cos(sp[1]) * sp[0] * G.ppd, ey = G.ay + Math.sin(sp[1]) * sp[0] * G.ppd;
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(G.ax, G.ay); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.setLineDash([]);
      var mx = G.ax + Math.cos(sp[1]) * sp[0] * G.ppd * 0.55, my = G.ay + Math.sin(sp[1]) * sp[0] * G.ppd * 0.55;
      if (my > 0 && my < h) {
        ctx.fillStyle = 'rgba(8, 14, 24, 0.72)';
        roundRect(ctx, mx - 18, my - 10, 36, 20, 10); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '700 11px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(sp[2], mx, my);
      }
    });
    ctx.restore();
  }

  function probeInfo() {
    var p = sk.probe;
    var theta = Math.hypot(p.az, p.el + (sk.plane ? 0 : sk.sun));
    if (sk.plane) theta = Math.hypot(p.az, p.el);
    var info = { theta: theta, color: null, text: '' };
    if (!sk.plane && p.el < 0) {
      info.text = 'That’s the ground. No raindrops there to light up, so this part of the circle is hidden.';
      info.ground = true;
      return info;
    }
    if (theta < P_VIOLET) {
      info.text = 'This drop is ' + theta.toFixed(1) + '° from your shadow, inside the bow. Rays that missed the 42° peak still reach you here, mixed into white light, so the sky inside the bow looks brighter.';
    } else if (theta <= P_RED) {
      var wl = wavelengthAt(theta, 'p');
      info.color = wl;
      info.text = 'This drop is ' + theta.toFixed(1) + '° from your shadow. It sends you ' + colorName(wl) + ' (about ' + wl + ' nm) from the primary bow. Every other color it sends misses your eye.';
    } else if (theta < S_RED) {
      info.text = 'This drop is ' + theta.toFixed(1) + '° from your shadow, in Alexander’s dark band. One-bounce light can’t leave a drop at more than 42.4°, and two-bounce light can’t leave at less than 50.4°, so it sends you almost nothing.';
    } else if (theta <= S_VIOLET) {
      var wl2 = wavelengthAt(theta, 's');
      info.color = wl2;
      info.text = 'This drop is ' + theta.toFixed(1) + '° from your shadow. After two bounces it sends you ' + colorName(wl2) + ' (about ' + wl2 + ' nm) from the secondary bow.' + (sk.secondary ? '' : ' (Turn on the secondary bow to see it.)');
    } else {
      info.text = 'This drop is ' + theta.toFixed(1) + '° from your shadow, outside both bows. Only a little two-bounce light arrives from here, so the sky looks a bit brighter than the dark band but plain.';
    }
    return info;
  }

  function drawProbe(ctx, w, h, G) {
    var p = sk.probe;
    var x = G.ax + p.az * G.ppd;
    var y = sk.plane ? G.ay - p.el * G.ppd : G.horizon - p.el * G.ppd;
    var info = probeInfo();
    ctx.save();
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.2;
    if (!info.ground && G.ay < h + 400) {
      ctx.beginPath(); ctx.moveTo(G.ax, G.ay); ctx.lineTo(x, y); ctx.stroke();
    }
    ctx.setLineDash([]);
    var c = info.color ? wlRGB(info.color) : [235, 240, 248];
    var gl = ctx.createRadialGradient(x, y, 0, x, y, 16);
    gl.addColorStop(0, rgba(c, 0.9));
    gl.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba(c, 1);
    ctx.strokeStyle = '#0b1220';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 9);
    ctx.quadraticCurveTo(x + 7, y + 1, x, y + 6);
    ctx.quadraticCurveTo(x - 7, y + 1, x, y - 9);
    ctx.fill(); ctx.stroke();
    if (!info.ground) {
      ctx.fillStyle = 'rgba(8, 14, 24, 0.75)';
      ctx.font = '700 11px system-ui, sans-serif';
      var t = info.theta.toFixed(1) + '°';
      var tw = ctx.measureText(t).width;
      roundRect(ctx, x + 12, y - 22, tw + 12, 18, 9); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(t, x + 18, y - 13);
    }
    ctx.restore();
  }

  function updateSkyText() {
    var msg = '';
    if (sk.plane) {
      msg = 'Seen from above: with raindrops below you, nothing blocks the lower half, so the bow is a full circle around your plane’s shadow. The small colored rings right around the shadow are a glory, a different, wave-based effect.';
    } else if (sk.sun > S_VIOLET && sk.secondary) {
      msg = 'Sun at ' + sk.sun + '°: both bows are below the horizon. No rainbow, however hard it rains.';
    } else if (sk.sun > P_RED) {
      msg = 'Sun at ' + sk.sun + '°: higher than 42°, so the whole primary bow is below the horizon.' + (sk.secondary && sk.sun < S_VIOLET ? ' Only the top of the faint secondary bow peeks out.' : '');
    } else if (sk.rain < 8) {
      msg = 'No rain, no drops, no rainbow. The angles are still there, but nothing is sitting at them.';
    } else {
      msg = 'Top of the bow: ' + (42 - sk.sun).toFixed(0) + '° above the horizon (42° − ' + sk.sun + '° of Sun height).';
    }
    $('rb-sky-msg').textContent = msg;
    var probe = $('rb-probe');
    if (sk.probe) probe.innerHTML = '<strong>Your drop:</strong> ' + probeInfo().text;
    else probe.innerHTML = '<strong>Test a drop:</strong> click or tap anywhere in the sky to see what that one raindrop sends to your eye.';
  }

  function setProbeAt(theta) {
    // A vertical sample keeps azimuth at zero. Its elevation is measured from
    // the horizon, while the antisolar point sits `sun` degrees below it.
    sk.probe = { az: 0, el: theta - sk.sun };
  }

  function sampleResult(target) {
    var copy = {
      inside: '<strong>Inside the primary:</strong> 35° is inside the 40.5–42.4° color band. Some off-peak rays still arrive, mixed together, so this sky is brighter but not a clean spectral color.',
      primary: '<strong>On the primary:</strong> about 42° is where one-bounce rays crowd together. This is the bright, colored primary bow — red is at its outer edge and violet at its inner edge.',
      dark: '<strong>In Alexander’s dark band:</strong> 46° lies between the one-bounce and two-bounce turnaround angles. Neither path sends much light toward you, so the sky is comparatively dark.',
      secondary: '<strong>On the secondary:</strong> about 52° is the fainter two-bounce bow. It is wider and its color order is reversed; turn on “Secondary bow” if you have hidden it.'
    };
    return copy[target];
  }

  /* ── 5 · Rainbow designer: drop size and other liquids ──────────────
     Ray tracing says where the bow is; wave optics says what it looks like.
     Airy's theory treats the light leaving a drop near the rainbow ray as a
     wavefront bent into a cubic, which gives an intensity Ai²(−z) with
       z = Δθ · x^(2/3) · (2 / θ'')^(1/3),   x = π·d / λ
     where Δθ is the angle from the geometric bow toward its lit side and
     θ'' is how sharply the exit-angle curve turns (Part 2's graph). Small
     drops smear each color across many degrees (fogbows); large ones are
     vivid, with supernumerary stripes just inside. Each liquid gets a Cauchy
     fit n(λ) = n_D + B·(1/λ² − 1/589²). */
  var LIQUIDS = {
    water:   { n: 1.3336, B: 3088,  label: 'Water rain', place: 'Earth' },
    methane: { n: 1.29,   B: 2600,  label: 'Liquid methane rain', place: 'Titan' },
    acid:    { n: 1.44,   B: 3800,  label: 'Sulfuric acid droplets', place: 'Venus' },
    glass:   { n: 1.50,   B: 4200,  label: 'Glass beads', place: 'road paint' },
    diamond: { n: 2.417,  B: 13000, label: 'Diamonds', place: 'what if?' }
  };
  var LIQUID_COPY = {
    water: 'Ordinary rain. Try the drop sizes: fog makes a broad white bow, drizzle-sized drops make the clearest supernumerary stripes, and big drops make the brightest, most saturated colors.',
    methane: 'Saturn’s moon Titan has rain made of liquid methane, which bends light less than water. Snell’s law moves the bow out to about 49°. The two-bounce bow lands <em>inside</em> it, near 39°, so instead of Alexander’s dark band there would be a strip lit by both bows.',
    acid: 'Venus is wrapped in clouds of sulfuric acid droplets. In 1974, astronomers matched a rainbow-shaped feature in how sunlight reflects off those clouds to droplets with n ≈ 1.44, which is how we learned what the clouds are made of. The real droplets are only about 2 µm across, so a Venus bow would look like a fogbow.',
    glass: 'Road-marking paint has tiny glass beads mixed in, so headlights bounce back to drivers. Sunlight does the same thing: on a field of beads you can see a small, bright “glass-bead bow” only about 22° from your shadow, much tighter than a rainbow.',
    diamond: 'Scientists think it may “rain” diamonds deep inside Uranus and Neptune, where crushing pressure squeezes carbon (there’s no sunlight down there). Diamond bends light so strongly that a one-bounce ray can never turn around, so there is <strong>no primary bow at all</strong>. The two-bounce bow lands about 12° from the Sun, behind you.'
  };
  var DROP_PRESETS = [
    { id: 'fog', d: 0.02, label: 'Fog' },
    { id: 'drizzle', d: 0.25, label: 'Drizzle' },
    { id: 'shower', d: 0.7, label: 'Shower' },
    { id: 'downpour', d: 2, label: 'Downpour' }
  ];

  var ds = { n: 1.3336, liquid: 'water', d: 0.7, sunBlur: true, mixed: true, secondary: true, rings: true };
  var dsCanvas = $('rb-ds-canvas');
  var dsKit = null, dsLut = null, dsInfo = null, dsQueued = false;
  var DS_VIEW = 64;         // degrees of sky from the antisolar point to the top edge
  var DS_MAX = 95;          // the LUT reaches the canvas corners
  var DS_STEP = 0.05;       // LUT resolution, degrees

  function dispersionB(n) {
    var pts = Object.keys(LIQUIDS).map(function (k) { return LIQUIDS[k]; }).sort(function (a, b) { return a.n - b.n; });
    if (n <= pts[0].n) return pts[0].B;
    for (var i = 1; i < pts.length; i++) {
      if (n <= pts[i].n) {
        var t = (n - pts[i - 1].n) / (pts[i].n - pts[i - 1].n);
        return pts[i - 1].B + t * (pts[i].B - pts[i - 1].B);
      }
    }
    return pts[pts.length - 1].B;
  }
  function dsIndex(lambda) { return ds.n + dispersionB(ds.n) * (1 / (lambda * lambda) - 1 / (589 * 589)); }

  // Bow angle plus how sharply the exit-angle curve turns there (rad / b²).
  function bowShape(k, n) {
    var c2 = (n * n - 1) / (k * (k + 2));
    if (c2 >= 1) return null;
    var b = Math.sqrt(1 - c2), h = 1e-3;
    var t0 = exitAngle(b, k, n), tp = exitAngle(Math.min(b + h, 0.999999), k, n), tm = exitAngle(b - h, k, n);
    return { theta: t0, curv: Math.abs(tp - 2 * t0 + tm) * DEG / (h * h) };
  }

  // Airy function: power series near zero, asymptotic forms in the tails.
  function airySeries(z) {
    if (z < -9) {
      var x = -z, zeta = 2 / 3 * Math.pow(x, 1.5) + Math.PI / 4;
      return Math.pow(x, -0.25) / Math.sqrt(Math.PI) * (Math.sin(zeta) - 5 / (72 * (zeta - Math.PI / 4)) * Math.cos(zeta));
    }
    if (z > 7) return Math.exp(-2 / 3 * Math.pow(z, 1.5)) / (2 * Math.sqrt(Math.PI) * Math.pow(z, 0.25));
    var f = 1, g = z, tf = 1, tg = z, z3 = z * z * z;
    for (var k = 1; k < 80; k++) {
      tf *= z3 / ((3 * k - 1) * (3 * k));
      tg *= z3 / ((3 * k) * (3 * k + 1));
      f += tf; g += tg;
      if (Math.abs(tf) + Math.abs(tg) < 1e-16) break;
    }
    return 0.355028053887817 * f - 0.258819403792807 * g;
  }
  // Tabulate once and interpolate: the build calls this ~10⁶ times.
  var AIRY_LO = -30, AIRY_HI = 7, AIRY_DZ = 0.004;
  var AIRY_TAB = (function () {
    var n = Math.round((AIRY_HI - AIRY_LO) / AIRY_DZ) + 1, t = new Float64Array(n);
    for (var i = 0; i < n; i++) t[i] = airySeries(AIRY_LO + i * AIRY_DZ);
    return t;
  })();
  function airyAi(z) {
    if (z < AIRY_LO || z >= AIRY_HI) return airySeries(z);
    var u = (z - AIRY_LO) / AIRY_DZ, i = u | 0, f = u - i;
    return AIRY_TAB[i] + f * (AIRY_TAB[i + 1] - AIRY_TAB[i]);
  }

  // CIE 1931 colour-matching functions (Wyman, Sloan & Shirley 2013 fit).
  function lobe(l, mu, s1, s2) { var t = (l - mu) / (l < mu ? s1 : s2); return Math.exp(-0.5 * t * t); }
  function cmf(l) {
    return [
      1.056 * lobe(l, 599.8, 37.9, 31.0) + 0.362 * lobe(l, 442.0, 16.0, 26.7) - 0.065 * lobe(l, 501.1, 20.4, 26.2),
      0.821 * lobe(l, 568.8, 46.9, 40.5) + 0.286 * lobe(l, 530.9, 16.3, 31.1),
      1.217 * lobe(l, 437.0, 11.8, 36.0) + 0.681 * lobe(l, 459.0, 26.0, 13.8)
    ];
  }
  function xyzToLin(X, Y, Z) {
    return [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.2040 * Y + 1.0570 * Z];
  }
  var DS_WLS = [];
  for (var dl = 400; dl <= 700; dl += 10) DS_WLS.push(dl);
  // Flat (white) sunlight should come out white: scale each channel by
  // what a flat spectrum with luminance Y = 1 produces.
  var DS_WHITE = (function () {
    var s = [0, 0, 0];
    DS_WLS.forEach(function (l) { var c = cmf(l); s[0] += c[0]; s[1] += c[1]; s[2] += c[2]; });
    var lin = xyzToLin(s[0] / s[1], 1, s[2] / s[1]);
    return lin;
  })();

  function buildDesignerLut() {
    var N = Math.round(DS_MAX / DS_STEP) + 1;
    var X = new Float32Array(N), Y = new Float32Array(N), Z = new Float32Array(N);
    // Real rain is a mix of sizes; averaging over ±25% blurs the stripes.
    var sizes = ds.mixed ? [0.75, 0.87, 1, 1.13, 1.25] : [1];
    var zSmooth = ds.mixed || ds.sunBlur ? -30 : -40;
    var orders = ds.secondary ? [1, 2] : [1];
    var info = { primary: null, secondary: null, primaryVisible: false, secondaryVisible: false };
    orders.forEach(function (k) {
      var weight = k === 1 ? 1 : 0.43;   // the second bounce leaks light
      var sideLit = k === 1 ? -1 : 1;      // lit side: inside the primary, outside the secondary
      DS_WLS.forEach(function (l) {
        var shape = bowShape(k, dsIndex(l));
        if (!shape) return;
        if (l === 550) info[k === 1 ? 'primary' : 'secondary'] = shape.theta;
        var c = cmf(l);
        sizes.forEach(function (f) {
          var x = Math.PI * ds.d * f * 1e6 / l;
          var scale = Math.pow(x, 2 / 3) * Math.pow(2 / shape.curv, 1 / 3) * DEG;   // per degree
          // Only fill bins that can matter (Ai² is ~0 a few units onto the dark side).
          var reach = 9 / scale;
          var lo = Math.max(0, Math.floor((sideLit < 0 ? 0 : shape.theta - reach) / DS_STEP));
          var hi = Math.min(N - 1, Math.ceil((sideLit < 0 ? shape.theta + reach : DS_MAX) / DS_STEP));
          var wgt = weight / sizes.length;
          for (var i = lo; i <= hi; i++) {
            var dth = sideLit * (i * DS_STEP - shape.theta);       // positive on the lit side
            var z = -dth * scale, I;
            if (z < zSmooth) {
              // Far onto the lit side the wiggles are finer than the blur
              // (and than our 10 nm colour steps), so use their average.
              I = wgt / (2 * Math.PI * Math.sqrt(-z));
            } else {
              var a = airyAi(z);
              I = wgt * a * a;
            }
            X[i] += I * c[0]; Y[i] += I * c[1]; Z[i] += I * c[2];
          }
        });
      });
    });
    // Smear by the Sun's 0.53° disk.
    if (ds.sunBlur) {
      var half = Math.round(0.265 / DS_STEP), ker = [], ks = 0;
      for (var j = -half; j <= half; j++) { var u = j / (half + 0.5); var wgt = Math.sqrt(Math.max(0, 1 - u * u)); ker.push(wgt); ks += wgt; }
      [X, Y, Z].forEach(function (arr) {
        var src = Float32Array.from(arr);
        for (var i = 0; i < N; i++) {
          var s = 0;
          for (var j = -half; j <= half; j++) { var q = Math.min(N - 1, Math.max(0, i + j)); s += src[q] * ker[j + half]; }
          arr[i] = s / ks;
        }
      });
    }
    // Normalise so the brightest part of the bow sits at a fixed exposure.
    var peakY = 0, peakAt = 0;
    for (var p = 0; p < N; p++) if (Y[p] > peakY) { peakY = Y[p]; peakAt = p; }
    var lut = new Uint8ClampedArray(N * 3);
    var expo = peakY > 0 ? 0.85 / peakY : 0;
    var sat = 0, satN = 0;
    for (var m = 0; m < N; m++) {
      var lin = xyzToLin(X[m] * expo, Y[m] * expo, Z[m] * expo);
      var rgb = [lin[0] / DS_WHITE[0], lin[1] / DS_WHITE[1], lin[2] / DS_WHITE[2]];
      if (Y[m] > peakY * 0.35) {
        var mx = Math.max(rgb[0], rgb[1], rgb[2]), mn = Math.max(0, Math.min(rgb[0], rgb[1], rgb[2]));
        if (mx > 0) { sat += (mx - mn) / mx; satN++; }
      }
      // Added straight onto the sky (no gamma lift), so the faint glow
      // inside the bow stays faint next to the bow itself.
      var over = Math.max(1, rgb[0], rgb[1], rgb[2]);
      for (var ch = 0; ch < 3; ch++) lut[m * 3 + ch] = Math.round(235 * Math.max(0, rgb[ch]) / over);
    }
    info.peakAt = peakAt * DS_STEP;
    // Where the primary actually looks brightest (small drops pull it inward).
    if (info.primary != null) {
      var pk = 0, pkY = -1, lim = Math.min(N - 1, Math.round((info.primary + 1.5) / DS_STEP));
      for (var q2 = 0; q2 <= lim; q2++) if (Y[q2] > pkY) { pkY = Y[q2]; pk = q2; }
      info.primarySeen = pk * DS_STEP;
    }
    info.saturation = satN ? sat / satN : 0;
    // Width of the bright band around the main peak (luminance above half max).
    var a0 = peakAt, a1 = peakAt;
    while (a0 > 0 && Y[a0 - 1] > peakY * 0.5) a0--;
    while (a1 < N - 1 && Y[a1 + 1] > peakY * 0.5) a1++;
    info.width = (a1 - a0) * DS_STEP;
    // Supernumeraries: distinct luminance bumps on the lit side of the primary.
    var bumps = 0;
    if (info.primary != null) {
      var i0 = Math.round(info.primary / DS_STEP);
      var lastMin = Infinity;
      for (var s2 = Math.min(i0, N - 2); s2 > 1; s2--) {
        lastMin = Math.min(lastMin, Y[s2]);
        if (Y[s2] > Y[s2 - 1] && Y[s2] >= Y[s2 + 1] && s2 * DS_STEP < info.primarySeen - 0.2) {
          if (Y[s2] - lastMin > peakY * 0.04 && Y[s2] > peakY * 0.12) bumps++;
          lastMin = Y[s2];
          if (bumps >= 4) break;
        }
      }
    }
    info.supernumeraries = bumps;
    info.primaryVisible = info.primary != null && info.primary < DS_VIEW;
    info.secondaryVisible = info.secondary != null && info.secondary < DS_VIEW;
    dsLut = lut;
    dsInfo = info;
  }

  function dsGeom(w, h) {
    var ppd = h / (DS_VIEW * 0.97);
    return { ppd: ppd, ax: w / 2, ay: h + ppd * 0.6 };
  }

  var dsImage = null;
  function drawDesigner() {
    if (!dsKit || !dsLut) return;
    var ctx = dsKit.ctx, w = dsKit.width, h = dsKit.height;
    if (w < 2 || h < 2) return;
    var G = dsGeom(w, h);
    // Paint the bow at CSS-pixel resolution, then let drawImage scale it.
    var off = dsImage && dsImage.width === w && dsImage.height === h ? dsImage : null;
    if (!off) { off = document.createElement('canvas'); off.width = w; off.height = h; dsImage = off; }
    var octx = off.getContext('2d');
    var img = octx.createImageData(w, h), px = img.data;
    var N = dsLut.length / 3;
    for (var y = 0; y < h; y++) {
      // A grey rain-cloud sky that lightens toward the horizon.
      var t = y / h;
      var br = 46 + 30 * t, bgc = 56 + 32 * t, bb = 74 + 30 * t;
      var dy2 = (y - G.ay) * (y - G.ay), toBin = 1 / (G.ppd * DS_STEP);
      for (var x = 0, o = y * w * 4; x < w; x++, o += 4) {
        var dx = x - G.ax;
        var li = Math.min(N - 1, (Math.sqrt(dx * dx + dy2) * toBin + 0.5) | 0) * 3;
        px[o] = br + dsLut[li]; px[o + 1] = bgc + dsLut[li + 1]; px[o + 2] = bb + dsLut[li + 2]; px[o + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    ctx.save();
    ctx.drawImage(off, 0, 0, w, h);

    if (ds.rings) {
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      [10, 20, 30, 40, 50, 60].forEach(function (deg) {
        ctx.beginPath(); ctx.arc(G.ax, G.ay, deg * G.ppd, Math.PI, Math.PI * 2); ctx.stroke();
        var lx = G.ax + Math.cos(-Math.PI * 0.64) * deg * G.ppd, ly = G.ay + Math.sin(-Math.PI * 0.64) * deg * G.ppd;
        if (ly > 44 && lx > 16) {
          ctx.fillStyle = 'rgba(8, 14, 24, 0.7)';
          roundRect(ctx, lx - 15, ly - 9, 30, 18, 9); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillText(deg + '°', lx, ly);
        }
      });
      ctx.setLineDash([]);
    }
    // The viewer's shadow marks the centre.
    ctx.fillStyle = 'rgba(8, 14, 24, 0.75)';
    var cap = 'your shadow · antisolar point';
    ctx.font = '600 11px system-ui, sans-serif';
    var tw = ctx.measureText(cap).width;
    roundRect(ctx, G.ax - tw / 2 - 8, h - 24, tw + 16, 18, 9); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(cap, G.ax, h - 15);
    // Badge
    var liq = LIQUIDS[ds.liquid];
    var badge = (liq ? liq.label : 'Custom liquid') + ' · n = ' + ds.n.toFixed(3) + ' · drops ' + formatDrop(ds.d);
    ctx.font = '600 12px system-ui, sans-serif';
    var bw = ctx.measureText(badge).width;
    ctx.fillStyle = 'rgba(8, 14, 24, 0.72)';
    roundRect(ctx, 10, 10, bw + 18, 24, 12); ctx.fill();
    ctx.fillStyle = '#ffd666';
    ctx.textAlign = 'left';
    ctx.fillText(badge, 19, 22);
    if (!dsInfo.primaryVisible && !dsInfo.secondaryVisible) {
      var none = 'No bow anywhere in this half of the sky';
      ctx.font = '700 15px system-ui, sans-serif';
      var nw = ctx.measureText(none).width;
      ctx.fillStyle = 'rgba(8, 14, 24, 0.8)';
      roundRect(ctx, w / 2 - nw / 2 - 14, h * 0.5 - 17, nw + 28, 34, 17); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(none, w / 2, h * 0.5);
    }
    ctx.restore();
  }

  function formatDrop(d) {
    return d < 0.1 ? Math.round(d * 1000) + ' µm' : d.toFixed(d < 1 ? 2 : 1) + ' mm';
  }

  function updateDesignerText() {
    var I = dsInfo;
    $('rb-ds-n-out').textContent = ds.n.toFixed(3);
    $('rb-ds-d-out').textContent = formatDrop(ds.d);
    var cells = {
      radius: I.primary != null ? I.primarySeen.toFixed(1) + '°' : 'none',
      second: I.secondary != null ? (I.secondary > DS_VIEW ? Math.round(I.secondary) + '° · behind you' : I.secondary.toFixed(1) + '°') : 'none',
      look: I.saturation > 0.55 ? 'vivid' : I.saturation > 0.3 ? 'pastel' : 'nearly white',
      supers: I.supernumeraries ? I.supernumeraries + (I.supernumeraries >= 4 ? '+' : '') + ' visible' : 'washed out'
    };
    if (I.primary == null) { cells.look = '—'; cells.supers = '—'; }
    if (ds.n >= 2 && I.primary == null) cells.radius = 'none (n ≥ 2)';
    Object.keys(cells).forEach(function (k) { $('rb-ds-' + k).textContent = cells[k]; });

    var note;
    if (I.primary == null) {
      note = 'With n = ' + ds.n.toFixed(2) + ', a one-bounce ray’s exit angle keeps changing all the way to the edge of the drop. It never turns around, so light never piles up and there is no bow. The turnaround disappears once n reaches 2.';
    } else if (ds.d < 0.06) {
      note = 'Fog-sized drops are only a few dozen wavelengths across. Each color spreads into a band several degrees wide, the bands overlap, and they add up to white. The bow also shrinks a few degrees inward.';
    } else if (I.supernumeraries >= 2) {
      note = 'Look just inside the main bow: those pastel stripes are supernumerary bows. Two rays that leave the drop in the same direction travel slightly different distances inside it, so their waves add up in some directions and cancel in others.';
    } else if (ds.mixed || ds.sunBlur) {
      note = 'Big drops make the narrowest, most saturated colors. The supernumerary stripes are still there, but they are packed tightly, so the mix of drop sizes in real rain' + (ds.sunBlur ? ' and the Sun’s half-degree disk' : '') + ' blur them away. Turn those off to see the stripes hiding there.';
    } else {
      note = 'Perfectly identical drops lit by a point of light: the stripes are packed tight inside the bow. Real rain never looks like this, which is why supernumeraries are a rare treat.';
    }
    $('rb-ds-note').textContent = note;
    $('rb-ds-liquid-note').innerHTML = LIQUIDS[ds.liquid] ? LIQUID_COPY[ds.liquid] : 'A made-up liquid. As n grows, the bow shrinks toward your shadow. At n = 2 the primary bow vanishes completely.';
  }

  // Slider drags fire faster than a rebuild, so coalesce them into one per frame.
  function designerChanged() {
    if (dsQueued) return;
    dsQueued = true;
    requestAnimationFrame(function () {
      dsQueued = false;
      buildDesignerLut();
      updateDesignerText();
      drawDesigner();
    });
  }

  function initDesigner() {
    if (!dsCanvas) return;
    dsKit = SimKit.canvas2d(dsCanvas, { onResize: function () { drawDesigner(); } });
    var dSlider = $('rb-ds-d'), nSlider = $('rb-ds-n');
    function setDrop(d) {
      ds.d = d;
      dSlider.value = Math.log10(d).toFixed(3);
      document.querySelectorAll('[data-ds-drop]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(Math.abs(Number(b.getAttribute('data-ds-drop')) - d) < 1e-6));
      });
    }
    function setLiquid(key) {
      ds.liquid = key;
      if (LIQUIDS[key]) { ds.n = LIQUIDS[key].n; nSlider.value = ds.n; }
      setPressed('ds-liquid', key);
    }
    dSlider.addEventListener('input', function () { setDrop(Math.pow(10, Number(dSlider.value))); designerChanged(); });
    nSlider.addEventListener('input', function () {
      ds.n = Number(nSlider.value);
      var match = Object.keys(LIQUIDS).filter(function (k) { return Math.abs(LIQUIDS[k].n - ds.n) < 0.003; })[0];
      setLiquid(match || 'custom');
      designerChanged();
    });
    document.querySelectorAll('[data-ds-drop]').forEach(function (b) {
      b.addEventListener('click', function () { setDrop(Number(b.getAttribute('data-ds-drop'))); designerChanged(); });
    });
    document.querySelectorAll('[data-ds-liquid]').forEach(function (b) {
      b.addEventListener('click', function () { setLiquid(b.getAttribute('data-ds-liquid')); designerChanged(); });
    });
    [['rb-ds-blur', 'sunBlur'], ['rb-ds-mixed', 'mixed'], ['rb-ds-secondary', 'secondary'], ['rb-ds-rings', 'rings']].forEach(function (pair) {
      $(pair[0]).addEventListener('change', function (e) { ds[pair[1]] = e.target.checked; designerChanged(); });
    });
    setDrop(ds.d);
    setLiquid(ds.liquid);
    designerChanged();
  }

  /* ── Quiz ───────────────────────────────────────────────────────── */
  var QUIZ = [
    { q: 'You see a rainbow late in the afternoon. Where is the Sun?', options: ['In front of you, behind the rain', 'Behind you, low in the sky', 'Directly overhead', 'It doesn’t matter'], a: 1,
      why: 'The bow is centered on the antisolar point, opposite the Sun. A low Sun behind you puts that point just below the horizon, so most of the bow shows.' },
    { q: 'Inside a raindrop, what happens to a ray that makes the primary rainbow?', options: ['It reflects once off the front of the drop', 'It refracts in, reflects once off the back, and refracts out', 'It passes straight through without bending', 'It reflects twice and never refracts'], a: 1,
      why: 'Refraction going in, one internal reflection, then refraction coming out. Two internal reflections make the secondary bow.' },
    { q: 'Why is the rainbow bright at about 42° and not spread evenly across the sky?', options: ['Raindrops only exist at that height', 'Red light is stronger than other colors', 'Exit angles from a whole band of hit points bunch together near the maximum, so light piles up there', 'Clouds focus the light'], a: 2,
      why: 'Near the turning point of the exit-angle curve, many hit points give nearly the same angle. That bunching (minimum deviation) concentrates light into a bright ring.' },
    { q: 'Why is red on the outside of the primary bow and violet on the inside?', options: ['Water bends violet a bit more, so violet’s peak angle is smaller (≈40.5°) than red’s (≈42.4°)', 'Red light is heavier and falls lower', 'Violet light gets absorbed by the rain', 'The Sun gives off more red light'], a: 0,
      why: 'Dispersion: water’s index of refraction is slightly higher for violet, which lowers violet’s peak angle. So red drops sit farther from your shadow.' },
    { q: 'What causes Alexander’s dark band between the two bows?', options: ['The shadow of a cloud', 'No light can leave a drop between about 42° and 50° from the antisolar point', 'The colors cancel out to make black', 'Your eyes adjust to the bright bow'], a: 1,
      why: 'One-bounce light tops out near 42° and two-bounce light bottoms out near 51°. Drops in between have no path to send sunlight to your eye.' },
    { q: 'You walk 100 m toward a rainbow. What happens?', options: ['You get closer to the end', 'The rainbow moves with you, because a new set of drops sits at 42° from your new shadow', 'The rainbow disappears', 'The colors reverse'], a: 1,
      why: 'The bow is a direction from your eye, not an object. Move, and different drops do the job.' },
    { q: 'At noon in summer the Sun is 70° high. Why don’t you see a rainbow even in a sun shower?', options: ['The drops are too warm', 'The antisolar point is 70° below the horizon, so the 42° circle is entirely underground', 'Sunlight is too white at noon', 'Rainbows only happen in the morning'], a: 1,
      why: 'Top of bow = 42° − Sun height. Above 42° of Sun height, the primary bow is fully below the horizon (though you could still see one from a plane or in a garden-hose spray aimed downward).' },
    { q: 'A bow in thick fog looks almost white. Why?', options: ['Fog absorbs all the colors', 'The droplets are so tiny that each color spreads over several degrees, and the overlapping colors blend into white', 'Fog only reflects light, it never refracts it', 'The Sun is always behind clouds in fog'], a: 1,
      why: 'Light is a wave. In a drop only a few dozen wavelengths across, each color’s bow becomes a broad smear. Overlap enough smears and you get white: a fogbow.' },
    { q: 'Liquid methane on Titan bends light less than water does. What happens to its rainbow?', options: ['There is no rainbow on Titan', 'It is smaller, closer to your shadow', 'It is bigger, about 49° from your shadow instead of 42°', 'Its colors are reversed'], a: 2,
      why: 'Less bending means a ray has to turn around farther from the antisolar point. A lower index of refraction makes a wider bow, and a higher one (like glass beads) makes a tighter bow.' }
  ];

  function buildQuiz() {
    var el = $('rb-quiz-list');
    if (!el) return;
    var answered = 0, correct = 0;
    el.innerHTML = QUIZ.map(function (item, qi) {
      return '<div class="rb-q" data-q="' + qi + '"><p>' + (qi + 1) + '. ' + item.q + '</p><div class="rb-q-opts" role="group" aria-label="Question ' + (qi + 1) + ' choices">' +
        item.options.map(function (o, oi) { return '<button type="button" class="rb-q-opt" data-o="' + oi + '">' + o + '</button>'; }).join('') +
        '</div><p class="rb-q-fb" aria-live="polite"></p></div>';
    }).join('');
    el.addEventListener('click', function (ev) {
      var btn = ev.target.closest('.rb-q-opt');
      if (!btn || btn.disabled) return;
      var box = btn.closest('.rb-q'), item = QUIZ[Number(box.dataset.q)], pick = Number(btn.dataset.o);
      box.querySelectorAll('.rb-q-opt').forEach(function (b) {
        b.disabled = true;
        if (Number(b.dataset.o) === item.a) b.classList.add('right');
      });
      if (pick !== item.a) btn.classList.add('wrong'); else correct++;
      answered++;
      var fb = box.querySelector('.rb-q-fb');
      fb.textContent = (pick === item.a ? 'Correct. ' : 'Not quite. ') + item.why;
      fb.classList.add(pick === item.a ? 'right' : 'wrong');
      if (answered === QUIZ.length) {
        $('rb-quiz-score').innerHTML = 'Score: ' + correct + ' of ' + QUIZ.length + '. <button type="button" class="rb-btn" id="rb-quiz-reset">Try again</button>';
        $('rb-quiz-reset').addEventListener('click', function () { $('rb-quiz-score').textContent = ''; buildQuiz(); });
      }
    });
  }

  /* ── Wiring ─────────────────────────────────────────────────────── */
  function setPressed(attr, value) {
    document.querySelectorAll('[data-' + attr + ']').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-' + attr) === String(value)));
    });
  }

  function redrawStatic() {
    updateDropReadouts();
    drawGraph();
    if (!visible.drop) drawDrop();
  }

  var visible = { drop: false, sky: false };

  function init() {
    if (!window.SimKit) return;
    drop = SimKit.canvas2d(dropCanvas, { onResize: function () { drawDrop(); } });
    graph = SimKit.canvas2d(graphCanvas, { onResize: function () { drawGraph(); } });
    sky = SimKit.canvas2d(skyCanvas, { onResize: function () { drawSky(performance.now()); } });

    $('rb-b').addEventListener('input', function (e) {
      state.b = Number(e.target.value);
      $('rb-b-out').textContent = state.b.toFixed(2);
      redrawStatic();
    });
    $('rb-wl').addEventListener('input', function (e) {
      state.wl = Number(e.target.value);
      $('rb-wl-out').textContent = state.wl + ' nm · ' + colorName(state.wl);
      redrawStatic();
    });
    document.querySelectorAll('[data-light]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.light = btn.getAttribute('data-light');
        setPressed('light', state.light);
        $('rb-wl-control').hidden = state.light !== 'single';
        redrawStatic();
      });
    });
    document.querySelectorAll('[data-order]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.order = Number(btn.getAttribute('data-order'));
        setPressed('order', state.order);
        // Jump near the new turning point so the bow ray is on screen.
        var target = state.order === 1 ? 0.86 : 0.95;
        state.b = target;
        $('rb-b').value = target;
        $('rb-b-out').textContent = target.toFixed(2);
        redrawStatic();
      });
    });
    [['rb-bundle', 'bundle'], ['rb-normals', 'normals'], ['rb-exaggerate', 'exaggerate']].forEach(function (pair) {
      $(pair[0]).addEventListener('change', function (e) { state[pair[1]] = e.target.checked; redrawStatic(); });
    });
    $('rb-wl-out').textContent = state.wl + ' nm · ' + colorName(state.wl);

    // Sky controls
    function skyChanged() { updateSkyText(); if (!visible.sky) drawSky(performance.now()); }
    $('rb-sun').addEventListener('input', function (e) {
      sk.sun = Number(e.target.value);
      $('rb-sun-out').textContent = sk.sun + '°';
      skyChanged();
    });
    $('rb-walk').addEventListener('input', function (e) {
      sk.walk = Number(e.target.value);
      $('rb-walk-out').textContent = (sk.walk > 0 ? '+' : '') + sk.walk + ' m';
      skyChanged();
    });
    $('rb-rain').addEventListener('input', function (e) {
      sk.rain = Number(e.target.value);
      $('rb-rain-out').textContent = sk.rain < 8 ? 'none' : sk.rain < 35 ? 'light' : sk.rain < 70 ? 'steady' : 'heavy';
      skyChanged();
    });
    [['rb-secondary', 'secondary'], ['rb-guides', 'guides'], ['rb-plane', 'plane']].forEach(function (pair) {
      $(pair[0]).addEventListener('change', function (e) {
        sk[pair[1]] = e.target.checked;
        if (pair[1] === 'plane') {
          sk.probe = null;
          $('rb-sun').disabled = sk.plane;
          $('rb-walk').disabled = sk.plane;
        }
        skyChanged();
      });
    });
    skyCanvas.addEventListener('click', function (e) {
      var rect = skyCanvas.getBoundingClientRect();
      var x = e.clientX - rect.left, y = e.clientY - rect.top;
      var G = skyGeom(sky.width, sky.height);
      sk.probe = {
        az: (x - G.ax) / G.ppd,
        el: sk.plane ? (G.ay - y) / G.ppd : (G.horizon - y) / G.ppd
      };
      skyChanged();
    });
    skyCanvas.addEventListener('keydown', function (e) {
      var slider = $('rb-sun');
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { slider.value = Math.min(60, sk.sun + 1); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { slider.value = Math.max(0, sk.sun - 1); }
      else return;
      e.preventDefault();
      slider.dispatchEvent(new Event('input'));
    });
    document.querySelectorAll('[data-rb-target]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-rb-target');
        var angles = { inside: 35, primary: 41.5, dark: 46, secondary: 52 };
        if (sk.plane) {
          $('rb-plane').checked = false;
          $('rb-plane').dispatchEvent(new Event('change'));
        }
        setProbeAt(angles[target]);
        document.querySelectorAll('[data-rb-target]').forEach(function (other) {
          other.setAttribute('aria-pressed', String(other === btn));
        });
        $('rb-sample-result').innerHTML = sampleResult(target);
        skyChanged();
      });
    });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.target === dropCanvas) visible.drop = en.isIntersecting;
          if (en.target === skyCanvas) visible.sky = en.isIntersecting;
        });
      });
      io.observe(dropCanvas);
      io.observe(skyCanvas);
    } else {
      visible.drop = visible.sky = true;
    }

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var clock = 0;
    SimKit.loop(function (dt) {
      if (!reduceMotion) clock += dt * 1000;
      if (visible.drop) {
        if (!reduceMotion) pulse = (pulse + dt / 2.6) % 1;
        drawDrop();
      }
      if (visible.sky) drawSky(clock);
    });

    updateDropReadouts();
    updateSkyText();
    drawDrop();
    drawGraph();
    drawSky(0);
    buildQuiz();
    initDesigner();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
