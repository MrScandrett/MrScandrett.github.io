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
      why: 'Top of bow = 42° − Sun height. Above 42° of Sun height, the primary bow is fully below the horizon (though you could still see one from a plane or in a garden-hose spray aimed downward).' }
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
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
