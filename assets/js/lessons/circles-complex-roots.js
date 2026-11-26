/* Circles & Complex Roots lesson: the four labs and the practice checker.
 * The maths (exact fractions, radicals, steps, generators) is in circle-complex-math.js,
 * which this file expects as window.CircleComplex; drawing uses SimKit.
 */
(function () {
  'use strict';
  var C = window.CircleComplex, SK = window.SimKit;
  if (!C || !SK) return;
  var TAU = Math.PI * 2, MINUS = C.MINUS;
  var page = document.querySelector('.cc-page');
  function $(id) { return document.getElementById(id); }
  function cssVar(name, fallback) {
    var v = page ? getComputedStyle(page).getPropertyValue(name).trim() : '';
    return v || fallback;
  }
  function pal() {
    var c = SK.theme.colors();
    return {
      text: c.text, muted: c.textMuted, accent: c.accent,
      blue: cssVar('--sin', '#2563eb'), orange: cssVar('--cos', '#c84b0a'),
      green: cssVar('--tan', '#16a34a'), violet: cssVar('--im', '#7c3aed')
    };
  }
  function fmt(x, d) {
    var r = Math.round(x * Math.pow(10, d == null ? 2 : d)) / Math.pow(10, d == null ? 2 : d);
    if (Object.is(r, -0)) r = 0;
    return r < 0 ? MINUS + (-r) : String(r);
  }
  function line(ctx, x1, y1, x2, y2, color, w, dash) {
    ctx.beginPath(); ctx.setLineDash(dash || []); ctx.strokeStyle = color; ctx.lineWidth = w || 1;
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
  }
  function dot(ctx, x, y, r, color) { ctx.beginPath(); ctx.fillStyle = color; ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function ring(ctx, x, y, r, color) { ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.arc(x, y, r, 0, TAU); ctx.stroke(); }
  function label(ctx, t, x, y, color, align, size, base) {
    ctx.fillStyle = color; ctx.font = '600 ' + (size || 11) + "px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.textAlign = align || 'left'; ctx.textBaseline = base || 'middle'; ctx.fillText(t, x, y);
  }
  // Square coordinate plane centred on (cx0, cy0) showing ±span, with equal scale.
  function plane(ctx, w, h, c, opt) {
    opt = opt || {};
    var span = opt.span || 10, cx0 = opt.cx || 0, cy0 = opt.cy || 0;
    var sc = Math.min(w, h) / (2 * span + 2);
    function X(x) { return w / 2 + (x - cx0) * sc; }
    function Y(y) { return h / 2 - (y - cy0) * sc; }
    var x0 = cx0 - (w / 2) / sc, x1 = cx0 + (w / 2) / sc, y0 = cy0 - (h / 2) / sc, y1 = cy0 + (h / 2) / sc;
    ctx.save(); ctx.globalAlpha = 0.28;
    for (var gx = Math.ceil(x0); gx <= x1; gx++) line(ctx, X(gx), 0, X(gx), h, c.muted, 1);
    for (var gy = Math.ceil(y0); gy <= y1; gy++) line(ctx, 0, Y(gy), w, Y(gy), c.muted, 1);
    ctx.restore();
    line(ctx, 0, Y(0), w, Y(0), c.text, 1.4); line(ctx, X(0), 0, X(0), h, c.text, 1.4);
    var step = opt.step || 5;
    for (var t = Math.ceil(x0 / step) * step; t <= x1; t += step) if (t) label(ctx, fmt(t), X(t), Y(0) + 11, c.muted, 'center', 10);
    for (var u = Math.ceil(y0 / step) * step; u <= y1; u += step) if (u) label(ctx, fmt(u) + (opt.imag ? 'i' : ''), X(0) - 5, Y(u), c.muted, 'right', 10);
    if (opt.xName) label(ctx, opt.xName, w - 6, Y(0) - 10, c.muted, 'right', 10);
    if (opt.yName) label(ctx, opt.yName, X(0) + 6, 10, c.muted, 'left', 10);
    return { X: X, Y: Y, sc: sc, x0: x0, x1: x1, y0: y0, y1: y1 };
  }
  function kit(canvasId, boxId, draw) { return SK.canvas2d($(canvasId), { box: $(boxId), onResize: function () { draw(); } }); }
  // Pointer → canvas CSS pixels; zoom-safe (sim-present scales the block with CSS zoom).
  function pointer(e, canvas, k) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (k.width / r.width), y: (e.clientY - r.top) * (k.height / r.height) };
  }
  function setStatus(el, text, ok) { el.textContent = text; el.className = 'tc-status' + (ok === true ? ' ok' : (ok === false ? ' no' : '')); }
  function renderSteps(box, steps, shown) {
    box.innerHTML = '';
    steps.slice(0, shown).forEach(function (s, i) {
      var li = document.createElement('li');
      var t = document.createElement('strong'); t.textContent = (i + 1) + '. ' + s.title;
      li.appendChild(t);
      if (s.math) { var m = document.createElement('div'); m.className = 'cc-step-math'; m.textContent = s.math; li.appendChild(m); }
      if (s.note) { var n = document.createElement('div'); n.className = 'cc-step-note'; n.textContent = s.note; li.appendChild(n); }
      box.appendChild(li);
    });
    box.hidden = shown === 0;
  }

  /* ── Lab 1: build a circle (it is Pythagoras) ─────────────────── */
  var cb = { h: 2, k: -1, r: 5, theta: 40 }, cbKit, cbDrag = null;
  function drawBuild() {
    if (!cbKit) return;
    var c = pal(), ctx = cbKit.ctx, w = cbKit.width, h = cbKit.height;
    ctx.clearRect(0, 0, w, h);
    var P = plane(ctx, w, h, c, { xName: 'x', yName: 'y' });
    var cx = P.X(cb.h), cy = P.Y(cb.k), R = cb.r * P.sc;
    ring(ctx, cx, cy, R, c.blue);
    var th = cb.theta * Math.PI / 180, px = cb.h + cb.r * Math.cos(th), py = cb.k + cb.r * Math.sin(th);
    // Right triangle: legs (x − h) and (y − k), hypotenuse r.
    line(ctx, cx, cy, P.X(px), cy, c.orange, 2.5);
    line(ctx, P.X(px), cy, P.X(px), P.Y(py), c.green, 2.5);
    line(ctx, cx, cy, P.X(px), P.Y(py), c.text, 2, [6, 4]);
    label(ctx, 'x ' + MINUS + ' h = ' + fmt(px - cb.h), (cx + P.X(px)) / 2, cy + (py >= cb.k ? 13 : -13), c.orange, 'center', 11);
    label(ctx, 'y ' + MINUS + ' k = ' + fmt(py - cb.k), P.X(px) + (px >= cb.h ? 6 : -6), (cy + P.Y(py)) / 2, c.green, px >= cb.h ? 'left' : 'right', 11);
    dot(ctx, cx, cy, 6, c.blue);
    var pLeft = Math.cos(th) < 0;
    label(ctx, '(' + fmt(cb.h) + ', ' + fmt(cb.k) + ')', cx + (pLeft ? 9 : -9), cy + (py >= cb.k ? 13 : -13), c.text, pLeft ? 'left' : 'right', 11);
    dot(ctx, P.X(px), P.Y(py), 6, c.accent);
    label(ctx, 'P', P.X(px) + 8, P.Y(py) - 9, c.text, 'left', 12);
    // Edge handle on the right of the circle for resizing.
    dot(ctx, cx + R, cy, 5, c.blue);
  }
  function updateBuild() {
    $('cb-h').value = cb.h; $('cb-k').value = cb.k; $('cb-r').value = cb.r; $('cb-t').value = cb.theta;
    $('cb-hv').textContent = fmt(cb.h); $('cb-kv').textContent = fmt(cb.k); $('cb-rv').textContent = fmt(cb.r); $('cb-tv').textContent = cb.theta + '°';
    var e = C.expandCircle(cb.h, cb.k, cb.r);
    $('cb-std').textContent = e.standard;
    $('cb-gen').textContent = e.general;
    var th = cb.theta * Math.PI / 180, dx = cb.r * Math.cos(th), dy = cb.r * Math.sin(th);
    $('cb-pyth').textContent = '(' + fmt(dx) + ')² + (' + fmt(dy) + ')² = ' + fmt(dx * dx) + ' + ' + fmt(dy * dy) + ' = ' + fmt(dx * dx + dy * dy, 1) + ' = ' + fmt(cb.r) + '²';
    drawBuild();
  }
  cbKit = kit('cb-canvas', 'cb-box', drawBuild);
  [['cb-h', 'h'], ['cb-k', 'k'], ['cb-r', 'r'], ['cb-t', 'theta']].forEach(function (p) {
    $(p[0]).addEventListener('input', function () { cb[p[1]] = +this.value; updateBuild(); });
  });
  (function () {
    var cv = $('cb-canvas');
    function geom() { var w = cbKit.width, h = cbKit.height, sc = Math.min(w, h) / 22; return { w: w, h: h, sc: sc }; }
    function toWorld(pt) { var g = geom(); return { x: (pt.x - g.w / 2) / g.sc, y: -(pt.y - g.h / 2) / g.sc }; }
    cv.addEventListener('pointerdown', function (e) {
      var w = toWorld(pointer(e, cv, cbKit)), d = Math.hypot(w.x - cb.h, w.y - cb.k);
      cbDrag = Math.abs(d - cb.r) < 0.8 ? 'edge' : (d < 1.2 ? 'centre' : null);
      if (cbDrag) { cv.setPointerCapture(e.pointerId); e.preventDefault(); }
    });
    cv.addEventListener('pointermove', function (e) {
      var w = toWorld(pointer(e, cv, cbKit));
      if (!cbDrag) {
        var d = Math.hypot(w.x - cb.h, w.y - cb.k);
        cv.style.cursor = Math.abs(d - cb.r) < 0.8 ? 'ew-resize' : (d < 1.2 ? 'grab' : 'default');
        return;
      }
      if (cbDrag === 'centre') { cb.h = Math.max(-8, Math.min(8, Math.round(w.x))); cb.k = Math.max(-8, Math.min(8, Math.round(w.y))); }
      else cb.r = Math.max(0.5, Math.min(9, Math.round(Math.hypot(w.x - cb.h, w.y - cb.k) * 2) / 2));
      updateBuild();
    });
    function end() { cbDrag = null; }
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  })();

  /* ── Lab 2: un-hide the circle (complete the square twice) ────── */
  var uh = { p: null, sol: null, shown: 0, solved: false, level: 'starter' }, uhKit;
  var FOLDER_CIRCLE = { A: 1, D: 10, E: -6, F: 18, text: C.generalText(1, 10, -6, 18) };
  function drawUnhide() {
    if (!uhKit || !uh.sol) return;
    var c = pal(), ctx = uhKit.ctx, w = uhKit.width, h = uhKit.height, s = uh.sol;
    ctx.clearRect(0, 0, w, h);
    var P = plane(ctx, w, h, c, { xName: 'x', yName: 'y' });
    if (uh.solved || uh.shown >= uh.sol.steps.length) {
      ring(ctx, P.X(s.hValue), P.Y(s.kValue), s.radiusValue * P.sc, c.blue);
      dot(ctx, P.X(s.hValue), P.Y(s.kValue), 6, c.blue);
      line(ctx, P.X(s.hValue), P.Y(s.kValue), P.X(s.hValue + s.radiusValue), P.Y(s.kValue), c.orange, 2.5);
      label(ctx, 'r = ' + s.radiusText, P.X(s.hValue + s.radiusValue / 2), P.Y(s.kValue) - 11, c.orange, 'center', 11);
    } else {
      label(ctx, 'Find the centre and radius to reveal the circle', w / 2, 16, c.muted, 'center', 12);
    }
  }
  function newUnhide(p) {
    uh.p = p || C.makeCircleProblem(Math.random, uh.level);
    uh.sol = C.circleFromGeneral(uh.p);
    uh.shown = 0; uh.solved = false;
    $('uh-eq').textContent = uh.p.text;
    ['uh-h', 'uh-k', 'uh-r'].forEach(function (id) { $(id).value = ''; });
    setStatus($('uh-status'), '');
    renderSteps($('uh-steps'), uh.sol.steps, 0);
    $('uh-next').disabled = false;
    drawUnhide();
  }
  function checkUnhide() {
    var s = uh.sol, st = $('uh-status');
    var h = C.parseNumber($('uh-h').value), k = C.parseNumber($('uh-k').value), r = C.parseNumber($('uh-r').value);
    if ([h, k, r].some(isNaN)) { setStatus(st, 'Enter h, k and r. Fractions (7/2) and roots (2√3 or sqrt(12)) are fine.'); return; }
    var okH = Math.abs(h - s.hValue) < 0.011, okK = Math.abs(k - s.kValue) < 0.011, okR = Math.abs(r - s.radiusValue) < 0.011;
    if (okH && okK && okR) {
      uh.solved = true;
      setStatus(st, '✔ Centre (' + C.fmtFrac(s.h) + ', ' + C.fmtFrac(s.k) + '), radius ' + s.radiusText + '. ' + s.standard, true);
    } else {
      var tips = [];
      if (!okH && Math.abs(h + s.hValue) < 0.011) tips.push('the sign of h is flipped: (x + 5)² means h = −5');
      else if (!okH) tips.push('the value of h is off');
      if (!okK && Math.abs(k + s.kValue) < 0.011) tips.push('the sign of k is flipped: (y − 3)² means k = 3');
      else if (!okK) tips.push('the value of k is off');
      if (!okR && Math.abs(r - s.r2Value) < 0.011) tips.push('that is r², not r: take the square root');
      else if (!okR) tips.push('the radius is off: did you add both squares to the right-hand side?');
      var msg = tips.join('; ');
      setStatus(st, 'Not yet. ' + msg.charAt(0).toUpperCase() + msg.slice(1) + '.', false);
    }
    drawUnhide();
  }
  uhKit = kit('uh-canvas', 'uh-box', drawUnhide);
  document.querySelectorAll('[data-uh-level]').forEach(function (b) {
    b.addEventListener('click', function () {
      uh.level = b.dataset.uhLevel;
      document.querySelectorAll('[data-uh-level]').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      newUnhide();
    });
  });
  $('uh-new').addEventListener('click', function () { newUnhide(); });
  function clearPressed(attr) { document.querySelectorAll('[' + attr + ']').forEach(function (o) { o.setAttribute('aria-pressed', 'false'); }); }
  $('uh-folder').addEventListener('click', function () { clearPressed('data-uh-level'); newUnhide(FOLDER_CIRCLE); });
  $('uh-check').addEventListener('click', checkUnhide);
  ['uh-h', 'uh-k', 'uh-r'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') checkUnhide(); }); });
  $('uh-next').addEventListener('click', function () {
    uh.shown = Math.min(uh.sol.steps.length, uh.shown + 1);
    renderSteps($('uh-steps'), uh.sol.steps, uh.shown);
    if (uh.shown >= uh.sol.steps.length) this.disabled = true;
    drawUnhide();
  });

  /* ── Lab 3: when the parabola lifts off ───────────────────────── */
  var pb = { a: 1, b: -4, c: 8, mirror: true, trail: [], sweep: null }, pbKit, cpKit;
  function pbState() {
    var a = pb.a, b = pb.b, c = pb.c;
    var p = a ? -b / (2 * a) : 0, K = a ? c - b * b / (4 * a) : c;
    return { a: a, b: b, c: c, p: p, K: K, D: b * b - 4 * a * c, roots: C.rootsNumeric(a, b, c) };
  }
  function drawParabola() {
    if (!pbKit) return;
    var c = pal(), ctx = pbKit.ctx, w = pbKit.width, h = pbKit.height, s = pbState();
    ctx.clearRect(0, 0, w, h);
    // Follow the vertex up or down so it stays on screen while keeping the x-axis in view.
    var P = plane(ctx, w, h, c, { span: 8, cy: s.a ? Math.max(-5, Math.min(5, s.K / 2)) : 0, xName: 'x', yName: 'y' });
    function curve(f, color, width, dash) {
      ctx.beginPath(); ctx.setLineDash(dash || []); ctx.strokeStyle = color; ctx.lineWidth = width;
      for (var i = 0; i <= 240; i++) { var x = P.x0 + (P.x1 - P.x0) * i / 240, y = f(x), yy = Math.max(-60, Math.min(60, y)); if (i) ctx.lineTo(P.X(x), P.Y(yy)); else ctx.moveTo(P.X(x), P.Y(yy)); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    curve(function (x) { return s.a * x * x + s.b * x + s.c; }, c.blue, 3);
    if (s.a) dot(ctx, P.X(s.p), P.Y(s.K), 5, c.blue);
    var complex = s.D < 0 && s.a;
    if (complex && pb.mirror) {
      // Flip the parabola about its vertex: its x-crossings sit at p ± q, the size of the imaginary part.
      curve(function (x) { return -s.a * (x - s.p) * (x - s.p) + s.K; }, c.violet, 2, [7, 5]);
      var q = Math.sqrt(s.K / s.a);
      [s.p - q, s.p + q].forEach(function (x) { dot(ctx, P.X(x), P.Y(0), 5, c.violet); });
      line(ctx, P.X(s.p), P.Y(0) + 16, P.X(s.p + q), P.Y(0) + 16, c.violet, 2);
      label(ctx, 'q = ' + fmt(q), P.X(s.p + q / 2), P.Y(0) + 27, c.violet, 'center', 11);
    }
    s.roots.forEach(function (r) { if (!r.im) dot(ctx, P.X(r.re), P.Y(0), 6, c.orange); });
    label(ctx, complex ? 'No x-intercepts' : (s.D === 0 ? 'Touches once' : 'Crosses twice'), 8, 12, c.muted, 'left', 11);
  }
  function drawComplexPlane() {
    if (!cpKit) return;
    var c = pal(), ctx = cpKit.ctx, w = cpKit.width, h = cpKit.height, s = pbState();
    ctx.clearRect(0, 0, w, h);
    var P = plane(ctx, w, h, c, { span: 8, xName: 'real', yName: 'imaginary', imag: true });
    ctx.save(); ctx.globalAlpha = 0.55;
    pb.trail.forEach(function (t) { dot(ctx, P.X(t.re), P.Y(t.im), 2, c.accent); });
    ctx.restore();
    s.roots.forEach(function (r) {
      dot(ctx, P.X(r.re), P.Y(r.im), 7, r.im ? c.violet : c.orange);
      label(ctx, fmt(r.re) + (r.im ? (r.im > 0 ? ' + ' : ' ' + MINUS + ' ') + fmt(Math.abs(r.im)) + 'i' : ''), P.X(r.re) + 10, P.Y(r.im) - 10, c.text, 'left', 11);
    });
    if (s.roots.length === 2 && s.roots[0].im) line(ctx, P.X(s.p), P.Y(s.roots[0].im), P.X(s.p), P.Y(s.roots[1].im), c.violet, 1.5, [4, 4]);
  }
  function updateParabola() {
    var s = pbState();
    $('pb-av').textContent = fmt(pb.a); $('pb-bv').textContent = fmt(pb.b); $('pb-cv').textContent = fmt(pb.c);
    var eq = 'y = ' + (s.a ? fmt(s.a) + 'x²' : '') + (s.b ? (s.b < 0 ? ' ' + MINUS + ' ' : (s.a ? ' + ' : '')) + fmt(Math.abs(s.b)) + 'x' : '') + (s.c ? (s.c < 0 ? ' ' + MINUS + ' ' : ' + ') + fmt(Math.abs(s.c)) : '');
    $('pb-eq').textContent = eq.replace('= 1x', '= x').replace(' 1x', ' x');
    $('pb-d').textContent = fmt(s.D);
    $('pb-vx').textContent = s.a ? '(' + fmt(s.p) + ', ' + fmt(s.K) + ')' : 'none (a line)';
    $('pb-roots').textContent = !s.a ? 'a = 0 is a line, not a parabola' :
      (s.D < 0 ? fmt(s.p) + ' ± ' + fmt(s.roots[0].im) + 'i' : s.roots.map(function (r) { return fmt(r.re); }).filter(function (v, i, arr) { return arr.indexOf(v) === i; }).join(' and '));
    $('pb-kind').textContent = !s.a ? '' : (s.D > 0 ? 'D > 0: two real roots on the real axis.' :
      (s.D === 0 ? 'D = 0: the two roots collide at the vertex.' : 'D < 0: the roots leave the real axis and become p ± qi, straight above and below the vertex.'));
    drawParabola(); drawComplexPlane();
  }
  pbKit = kit('pb-canvas', 'pb-box', drawParabola);
  cpKit = kit('cp-canvas', 'cp-box', drawComplexPlane);
  [['pb-a', 'a'], ['pb-b', 'b'], ['pb-c', 'c']].forEach(function (p) {
    $(p[0]).addEventListener('input', function () { pb[p[1]] = +this.value; pb.trail = []; updateParabola(); });
  });
  $('pb-mirror').addEventListener('change', function () { pb.mirror = this.checked; drawParabola(); });
  $('pb-sweep').addEventListener('click', function () {
    var btn = this;
    if (pb.sweep) { pb.sweep.stop(); pb.sweep = null; btn.textContent = '▶ Sweep c'; return; }
    pb.trail = []; pb.c = -6; btn.textContent = '■ Stop';
    var hi = 12;
    pb.sweep = SK.loop(function (dt) {
      pb.c = Math.min(hi, pb.c + dt * 3.5);
      $('pb-c').value = Math.round(pb.c * 2) / 2;
      C.rootsNumeric(pb.a, pb.b, pb.c).forEach(function (r) { pb.trail.push(r); });
      updateParabola();
      if (pb.c >= hi) { pb.sweep.stop(); pb.sweep = null; btn.textContent = '▶ Sweep c'; pb.c = hi; }
    }, { el: SK.stage($('pb-canvas'), $('cp-canvas')), maxDt: 0.05 });
  });

  /* ── Lab 4: quadratic formula workbench ───────────────────────── */
  var qf = { p: null, sol: null, shown: 0, level: 'whole' };
  function newFormula(p) {
    qf.p = p || C.makeComplexProblem(Math.random, qf.level);
    qf.sol = C.quadratic(qf.p);
    qf.shown = 0;
    $('qf-eq').textContent = qf.p.text;
    $('qf-var').textContent = qf.p.v;
    ['qf-d', 'qf-re', 'qf-im'].forEach(function (id) { $(id).value = ''; });
    setStatus($('qf-status'), '');
    renderSteps($('qf-steps'), qf.sol.steps, 0);
    $('qf-next').disabled = false;
  }
  function checkFormula() {
    var s = qf.sol, st = $('qf-status'), msgs = [], allOk = true;
    var d = C.parseNumber($('qf-d').value), re = C.parseNumber($('qf-re').value), im = C.parseNumber($('qf-im').value);
    if ([d, re, im].some(isNaN)) { setStatus(st, 'Fill in all three boxes. You can type 1/2, √95/10 or sqrt(95)/10.'); return; }
    if (Math.abs(d - s.D) > 0.001) {
      allOk = false;
      msgs.push(Math.abs(d - (s.b * s.b + 4 * s.a * s.c)) < 0.001 ? 'discriminant: −4ac subtracts, so watch the sign of c' :
        (Math.abs(d + s.D) < 0.001 ? 'discriminant has the wrong sign' : 'recheck b² − 4ac: square b first, with its sign'));
    }
    if (Math.abs(re - s.re) > 0.011) {
      allOk = false;
      msgs.push(Math.abs(re + s.re) < 0.011 ? 'real part is −b/2a: the minus flips the sign of b' : 'real part is off: it is −b ÷ 2a');
    }
    if (Math.abs(Math.abs(im) - s.im) > 0.011) {
      allOk = false;
      msgs.push(Math.abs(im - Math.sqrt(-s.D)) < 0.011 ? 'imaginary part: divide √|D| by 2a too' : 'imaginary part is off: it is √|D| ÷ 2|a|');
    }
    if (allOk) setStatus(st, '✔ ' + s.exact + (s.split && s.split !== s.exact ? '   =   ' + s.split : ''), true);
    else setStatus(st, 'Not yet: ' + msgs.join('; ') + '.', false);
  }
  document.querySelectorAll('[data-qf-level]').forEach(function (b) {
    b.addEventListener('click', function () {
      qf.level = b.dataset.qfLevel;
      document.querySelectorAll('[data-qf-level]').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      newFormula();
    });
  });
  $('qf-new').addEventListener('click', function () { newFormula(); });
  $('qf-folder').addEventListener('click', function () { clearPressed('data-qf-level'); newFormula({ a: 5, b: -5, c: 6, v: 'y', text: C.fmtQuadratic(5, -5, 6, 'y') }); });
  $('qf-folder2').addEventListener('click', function () { clearPressed('data-qf-level'); newFormula({ a: 1, b: 1, c: 4, v: 'x', text: C.fmtQuadratic(1, 1, 4, 'x') }); });
  $('qf-check').addEventListener('click', checkFormula);
  ['qf-d', 'qf-re', 'qf-im'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') checkFormula(); }); });
  $('qf-next').addEventListener('click', function () {
    qf.shown = Math.min(qf.sol.steps.length, qf.shown + 1);
    renderSteps($('qf-steps'), qf.sol.steps, qf.shown);
    if (qf.shown >= qf.sol.steps.length) this.disabled = true;
  });

  /* ── Practice ─────────────────────────────────────────────────── */
  document.querySelectorAll('.cc-practice .tc-practice-item').forEach(function (item) {
    var input = item.querySelector('input'), fb = item.querySelector('.fb');
    function check() {
      var v = C.parseNumber(input.value);
      if (isNaN(v)) { fb.textContent = 'Enter a number (fractions and √ are fine).'; fb.className = 'fb no'; return; }
      var ok = Math.abs(v - C.parseNumber(item.dataset.answer)) <= 0.011;
      fb.textContent = ok ? '✔ Correct.' : 'Not yet. Hint: ' + item.dataset.hint;
      fb.className = 'fb ' + (ok ? 'ok' : 'no');
    }
    item.querySelector('button').addEventListener('click', check);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
  });

  SK.theme.onChange(function () { drawBuild(); drawUnhide(); drawParabola(); drawComplexPlane(); });
  updateBuild(); newUnhide(FOLDER_CIRCLE); updateParabola(); newFormula({ a: 5, b: -5, c: 6, v: 'y', text: C.fmtQuadratic(5, -5, 6, 'y') });
})();
