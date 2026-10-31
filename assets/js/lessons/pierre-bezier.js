/* Pierre Bézier lesson: de Casteljau Lab + Trace the Outline challenge.
   A cubic Bézier curve with four draggable control points. The de Casteljau
   construction runs live: at parameter t, cut each side of the control polygon
   at the fraction t (3 green points), cut the two green lines at t (2 orange
   points), and cut that last line at t: the dot is the point on the curve.
   Play sweeps t back and forth; the loop is SimKit.loop, so it holds its
   frames while the canvas is off-screen or the tab is hidden.
   Challenges: match a target segment of a car-body side profile or a letter.
   Pointer positions use getBoundingClientRect + clientX (zoom-safe). Needs sim-kit.js. */
(function () {
  'use strict';
  if (!window.SimKit) return;
  var canvas = document.getElementById('pb-curve');
  if (!canvas) return;
  var $ = function (id) { return document.getElementById(id); };

  var tIn = $('pb-t'), tOut = $('pb-t-out');
  var playBtn = $('pb-play');
  var showCon = $('pb-construction');
  var showW = $('pb-weights');
  var chSel = $('pb-challenge');
  var activeSel = $('pb-active');
  var readout = $('pb-readout');
  var goalsEl = $('pb-goals');
  var answerBtn = $('pb-answer');

  var colors = SimKit.theme.colors();
  var view = SimKit.canvas2d(canvas, { onResize: function () { dirty = true; } });
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Logical drawing space: 1000 × 560, y down.
  var LW = 1000, LH = 560;

  function P(x, y) { return { x: x, y: y }; }
  function lerp(a, b, t) { return P(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t); }
  function bez(c, t) {
    var u = 1 - t;
    return P(u * u * u * c[0].x + 3 * u * u * t * c[1].x + 3 * u * t * t * c[2].x + t * t * t * c[3].x,
      u * u * u * c[0].y + 3 * u * u * t * c[1].y + 3 * u * t * t * c[2].y + t * t * t * c[3].y);
  }

  // A 1960s-style hatchback side profile, built only from cubic Béziers and lines.
  var CAR = [
    ['M', 95, 395],
    ['C', 85, 350, 100, 315, 160, 305],
    ['C', 260, 295, 340, 290, 395, 280],
    ['C', 430, 250, 465, 205, 520, 190],
    ['C', 600, 170, 720, 170, 790, 195],
    ['C', 840, 215, 880, 260, 895, 310],
    ['C', 905, 345, 905, 380, 890, 395],
    ['L', 815, 395],
    ['C', 815, 322, 705, 322, 705, 395],
    ['L', 305, 395],
    ['C', 305, 322, 195, 322, 195, 395],
    ['Z']
  ];

  function drawCar(ctx, map, s) {
    ctx.beginPath();
    CAR.forEach(function (c) {
      var a, b, d;
      if (c[0] === 'M') { a = map(P(c[1], c[2])); ctx.moveTo(a.x, a.y); }
      else if (c[0] === 'L') { a = map(P(c[1], c[2])); ctx.lineTo(a.x, a.y); }
      else if (c[0] === 'C') { a = map(P(c[1], c[2])); b = map(P(c[3], c[4])); d = map(P(c[5], c[6])); ctx.bezierCurveTo(a.x, a.y, b.x, b.y, d.x, d.y); }
      else ctx.closePath();
    });
    ctx.fillStyle = 'rgba(148,163,184,0.18)';
    ctx.fill();
    ctx.strokeStyle = colors.textMuted; ctx.lineWidth = 2; ctx.stroke();
    // Windows: one cubic for the glasshouse line.
    var w0 = map(P(470, 278)), w1 = map(P(520, 215)), w2 = map(P(760, 205)), w3 = map(P(845, 285));
    ctx.beginPath(); ctx.moveTo(w0.x, w0.y); ctx.bezierCurveTo(w1.x, w1.y, w2.x, w2.y, w3.x, w3.y); ctx.closePath();
    ctx.stroke();
    [[250, 405], [760, 405]].forEach(function (w) {
      var c = map(P(w[0], w[1]));
      ctx.beginPath(); ctx.arc(c.x, c.y, 45 * s, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(c.x, c.y, 18 * s, 0, Math.PI * 2); ctx.stroke();
    });
    var g0 = map(P(40, 450)), g1 = map(P(960, 450));
    ctx.beginPath(); ctx.moveTo(g0.x, g0.y); ctx.lineTo(g1.x, g1.y); ctx.stroke();
  }

  var S_SPINE = [P(650, 140), P(300, 60), P(700, 500), P(350, 420)];
  function drawLetterS(ctx, map, s) {
    var c = S_SPINE.map(map);
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.lineWidth = 64 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(c[0].x, c[0].y); ctx.bezierCurveTo(c[1].x, c[1].y, c[2].x, c[2].y, c[3].x, c[3].y); ctx.stroke();
    ctx.lineCap = 'butt';
  }

  var START = [P(200, 500), P(400, 500), P(600, 500), P(800, 500)];
  var CHALLENGES = {
    free: { name: 'Free play', start: [P(140, 430), P(260, 110), P(720, 110), P(860, 420)] },
    roof: { name: 'Car roofline', context: drawCar, target: [P(520, 190), P(600, 170), P(720, 170), P(790, 195)],
      tip: 'A long, gentle curve: the handles sit low and far apart.' },
    arch: { name: 'Wheel arch', context: drawCar, target: [P(815, 395), P(815, 322), P(705, 322), P(705, 395)],
      tip: 'A half circle from one cubic: the handles go straight up from the ends, about 4/3 of the radius high.' },
    s: { name: 'Letter S', context: drawLetterS, target: S_SPINE,
      tip: 'An S bends two ways. Put the handles on opposite sides of the line from start to end.' }
  };

  var cps = CHALLENGES.free.start.map(function (p) { return P(p.x, p.y); });
  var current = 'free';
  var t = 0.5, dir = 1;
  var playing = !reduce;
  var drag = -1, active = 0;
  var dirty = true;
  var tween = null;
  var lastText = '';
  var lastGoals = '';

  function layout() {
    var W = view.width, H = view.height;
    var s = Math.min(W / LW, H / LH);
    return { W: W, H: H, s: s, ox: (W - LW * s) / 2, oy: (H - LH * s) / 2 };
  }
  function mapper(L) { return function (p) { return P(L.ox + p.x * L.s, L.oy + p.y * L.s); }; }

  function setChallenge(id) {
    current = id;
    var ch = CHALLENGES[id];
    var start = ch.start || START;
    cps = start.map(function (p) { return P(p.x, p.y); });
    tween = null;
    answerBtn.disabled = !ch.target;
    lastGoals = '';
    dirty = true;
  }

  // Average gap between the student's curve and the target, in drawing units.
  function gap(target) {
    function samples(c, n) { var out = []; for (var i = 0; i <= n; i++) out.push(bez(c, i / n)); return out; }
    var A = samples(cps, 48), B = samples(target, 160), A2 = samples(cps, 160), B2 = samples(target, 48);
    function mean(from, to) {
      var sum = 0;
      for (var i = 0; i < from.length; i++) {
        var best = 1e9;
        for (var j = 0; j < to.length; j++) {
          var dx = from[i].x - to[j].x, dy = from[i].y - to[j].y, d = dx * dx + dy * dy;
          if (d < best) best = d;
        }
        sum += Math.sqrt(best);
      }
      return sum / from.length;
    }
    return Math.max(mean(A, B), mean(B2, A2));
  }

  function endsOk(target) {
    function d(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    var fwd = Math.max(d(cps[0], target[0]), d(cps[3], target[3]));
    var rev = Math.max(d(cps[0], target[3]), d(cps[3], target[0]));
    return Math.min(fwd, rev) < 15;
  }

  function render() {
    var ctx = view.ctx, L = layout(), map = mapper(L), s = L.s;
    ctx.clearRect(0, 0, L.W, L.H);
    var ch = CHALLENGES[current];

    if (ch.context) ch.context(ctx, map, s);
    if (ch.target) {
      var tg = ch.target.map(map);
      ctx.save();
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(tg[0].x, tg[0].y); ctx.bezierCurveTo(tg[1].x, tg[1].y, tg[2].x, tg[2].y, tg[3].x, tg[3].y); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#1d4ed8';
      ctx.font = '700 13px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('Target: ' + ch.name + ' (dashed blue)', 10, 10);
    }

    var c = cps.map(map);
    // Control polygon.
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = colors.textMuted; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(c[0].x, c[0].y); ctx.lineTo(c[1].x, c[1].y); ctx.lineTo(c[2].x, c[2].y); ctx.lineTo(c[3].x, c[3].y); ctx.stroke();
    ctx.setLineDash([]);

    // The whole curve, thin, then the part traced so far, thick.
    ctx.strokeStyle = colors.text; ctx.lineWidth = 2; ctx.globalAlpha = 0.45;
    ctx.beginPath(); ctx.moveTo(c[0].x, c[0].y); ctx.bezierCurveTo(c[1].x, c[1].y, c[2].x, c[2].y, c[3].x, c[3].y); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#c2410c'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    var steps = Math.max(2, Math.round(80 * t));
    for (var i = 0; i <= steps; i++) {
      var q = map(bez(cps, t * i / steps));
      if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
    }
    ctx.stroke(); ctx.lineCap = 'butt';

    // de Casteljau construction at t.
    var q0 = lerp(cps[0], cps[1], t), q1 = lerp(cps[1], cps[2], t), q2 = lerp(cps[2], cps[3], t);
    var r0 = lerp(q0, q1, t), r1 = lerp(q1, q2, t), b = lerp(r0, r1, t);
    if (showCon.checked) {
      var Q = [q0, q1, q2].map(map), R = [r0, r1].map(map);
      ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(Q[0].x, Q[0].y); ctx.lineTo(Q[1].x, Q[1].y); ctx.lineTo(Q[2].x, Q[2].y); ctx.stroke();
      ctx.fillStyle = '#16a34a';
      Q.forEach(function (p) { ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill(); });
      ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(R[0].x, R[0].y); ctx.lineTo(R[1].x, R[1].y); ctx.stroke();
      ctx.fillStyle = '#ea580c';
      R.forEach(function (p) { ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill(); });
    }
    var B = map(b);
    ctx.fillStyle = '#c2410c'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(B.x, B.y, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // Control points.
    ctx.font = '700 14px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    c.forEach(function (p, i) {
      var end = i === 0 || i === 3;
      ctx.lineWidth = 3;
      ctx.strokeStyle = colors.accent;
      ctx.fillStyle = end ? colors.accent : colors.cardBg;
      ctx.beginPath(); ctx.arc(p.x, p.y, i === drag ? 11 : 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (i === active) { ctx.beginPath(); ctx.arc(p.x, p.y, 15, 0, Math.PI * 2); ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.fillStyle = colors.text;
      ctx.fillText('P' + i, p.x, p.y - 14);
    });

    if (showW.checked) drawWeights(ctx, L);
    updateReadout(b);
  }

  // Bernstein weights: how hard each control point pulls at this t.
  function drawWeights(ctx, L) {
    var u = 1 - t, w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    var bw = 18, gapX = 8, h = 70;
    var x0 = L.W - (bw * 4 + gapX * 3) - 14, y0 = 32;
    ctx.fillStyle = colors.cardBg; ctx.globalAlpha = 0.9;
    ctx.fillRect(x0 - 8, y0 - 22, bw * 4 + gapX * 3 + 16, h + 46);
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.text; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('pull of each point', x0 - 4, y0 - 18);
    w.forEach(function (v, i) {
      var x = x0 + i * (bw + gapX);
      ctx.fillStyle = 'rgba(148,163,184,0.35)'; ctx.fillRect(x, y0, bw, h);
      ctx.fillStyle = i === 0 || i === 3 ? colors.accent : '#7c3aed';
      ctx.fillRect(x, y0 + h * (1 - v), bw, h * v);
      ctx.fillStyle = colors.text; ctx.textAlign = 'center';
      ctx.fillText('P' + i, x + bw / 2, y0 + h + 4);
    });
  }

  function updateReadout(b) {
    var ch = CHALLENGES[current];
    var u = 1 - t;
    var text = 't = ' + t.toFixed(2) + ' → point (' + Math.round(b.x) + ', ' + Math.round(b.y) + '). Weights ' +
      [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t].map(function (v) { return v.toFixed(2); }).join(' + ') + ' = 1.';
    var goals = [];
    if (ch.target) {
      var g = gap(ch.target), ends = endsOk(ch.target);
      text += ' Average gap to the target: ' + g.toFixed(1) + ' units.';
      goals = [['Ends on the ends', ends], ['Gap under 8 units', g < 8], ['Traced!', ends && g < 4]];
      if (ends && g < 4) text += ' Traced! ' + ch.tip;
    }
    if (text !== lastText) { readout.textContent = text; lastText = text; }
    var key = goals.map(function (x) { return x[0] + x[1]; }).join('|');
    if (key !== lastGoals) {
      lastGoals = key;
      goalsEl.innerHTML = '';
      goals.forEach(function (x) {
        var li = document.createElement('li');
        li.dataset.ok = x[1] ? 'true' : 'false';
        li.textContent = (x[1] ? '✓ ' : '') + x[0];
        goalsEl.appendChild(li);
      });
      goalsEl.hidden = !goals.length;
    }
  }

  function syncT() { tIn.value = String(t); tOut.textContent = t.toFixed(2); }
  function setPlaying(on) {
    playing = on;
    playBtn.textContent = on ? 'Pause' : 'Play';
    playBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    dirty = true;
  }

  // ── Pointer + keyboard ─────────────────────────────────────────
  function pointer(e) {
    var r = canvas.getBoundingClientRect();
    return P((e.clientX - r.left) * (view.width / r.width), (e.clientY - r.top) * (view.height / r.height));
  }
  canvas.addEventListener('pointerdown', function (e) {
    var L = layout(), map = mapper(L), p = pointer(e), best = -1, bd = 26;
    cps.forEach(function (q, i) { var s = map(q), d = Math.hypot(s.x - p.x, s.y - p.y); if (d < bd) { bd = d; best = i; } });
    if (best < 0) return;
    drag = best; active = best; activeSel.value = String(best);
    tween = null;
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
    dirty = true;
  });
  canvas.addEventListener('pointermove', function (e) {
    if (drag < 0) return;
    var L = layout(), p = pointer(e);
    cps[drag] = P(Math.max(0, Math.min(LW, (p.x - L.ox) / L.s)), Math.max(0, Math.min(LH, (p.y - L.oy) / L.s)));
    dirty = true;
  });
  function release() { if (drag >= 0) { drag = -1; dirty = true; } }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('keydown', function (e) {
    var step = e.shiftKey ? 20 : 5, p = cps[active], moved = true;
    if (e.key === 'ArrowLeft') p.x -= step;
    else if (e.key === 'ArrowRight') p.x += step;
    else if (e.key === 'ArrowUp') p.y -= step;
    else if (e.key === 'ArrowDown') p.y += step;
    else if (/^[0-3]$/.test(e.key)) { active = +e.key; activeSel.value = e.key; }
    else moved = false;
    if (moved) { e.preventDefault(); tween = null; dirty = true; }
  });

  tIn.addEventListener('input', function () { t = +tIn.value; tOut.textContent = t.toFixed(2); setPlaying(false); });
  playBtn.addEventListener('click', function () { setPlaying(!playing); });
  showCon.addEventListener('change', function () { dirty = true; });
  showW.addEventListener('change', function () { dirty = true; });
  chSel.addEventListener('change', function () { setChallenge(chSel.value); });
  activeSel.addEventListener('change', function () { active = +activeSel.value; dirty = true; });
  $('pb-reset').addEventListener('click', function () { setChallenge(current); });
  answerBtn.addEventListener('click', function () {
    var ch = CHALLENGES[current];
    if (!ch.target) return;
    tween = { from: cps.map(function (p) { return P(p.x, p.y); }), to: ch.target, k: 0 };
    if (reduce) { cps = ch.target.map(function (p) { return P(p.x, p.y); }); tween = null; }
    dirty = true;
  });
  SimKit.theme.onChange(function (c) { colors = c; dirty = true; });

  setChallenge('free');
  setPlaying(playing);
  syncT();
  render();

  SimKit.loop(function (dt) {
    dt = Math.min(dt, 0.1);
    if (playing) {
      t += dir * dt / 3.5;
      if (t >= 1) { t = 1; dir = -1; } else if (t <= 0) { t = 0; dir = 1; }
      syncT();
      dirty = true;
    }
    if (tween) {
      tween.k = Math.min(1, tween.k + dt / 1.2);
      var e = tween.k < 0.5 ? 2 * tween.k * tween.k : 1 - Math.pow(-2 * tween.k + 2, 2) / 2;
      cps = tween.from.map(function (p, i) { return lerp(p, tween.to[i], e); });
      if (tween.k >= 1) tween = null;
      dirty = true;
    }
    if (!dirty) return;
    dirty = false;
    render();
  }, { el: SimKit.stage(canvas) });
})();
