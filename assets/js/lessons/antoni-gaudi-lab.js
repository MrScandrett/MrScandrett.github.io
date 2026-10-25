/* Antoni Gaudí lesson: Hanging Chain Lab.
   A chain of point masses joined by fixed-length links (Verlet integration with
   distance constraints) hangs between two pins and settles into a catenary.
   Optional weights (Gaudí's bags of lead shot) are extra mass on evenly spaced
   links, which bends the curve. "Flip" mirrors the settled chain about the pin
   line to show the matching compression-only arch; the red semicircle of the
   same span shows how far an old-style round arch strays from that force line.
   Needs sim-kit.js. */
(function () {
  'use strict';
  if (!window.SimKit) return;
  var canvas = document.getElementById('ga-chain');
  if (!canvas) return;

  var colors = SimKit.theme.colors();
  SimKit.theme.onChange(function (c) { colors = c; });

  var N = 41;                 // points (40 links)
  var GRAVITY = 900;          // px/s^2, in canvas units
  var ITER = 30;              // constraint passes per step
  var span = document.getElementById('ga-span');
  var spanOut = document.getElementById('ga-span-out');
  var loads = document.getElementById('ga-loads');
  var loadsOut = document.getElementById('ga-loads-out');
  var massIn = document.getElementById('ga-mass');
  var massOut = document.getElementById('ga-mass-out');
  var flip = document.getElementById('ga-flip');
  var semi = document.getElementById('ga-semi');
  var shake = document.getElementById('ga-shake');
  var readout = document.getElementById('ga-readout');

  var view = SimKit.canvas2d(canvas, { height: 340 });
  var pts = [];
  var linkLen = 0;
  var lastW = 0;

  // Geometry in canvas px, recomputed from the current size.
  function layout() {
    var W = view.width, H = view.height;
    var chainLen = Math.min(W * 0.9, H * 1.25);
    var gap = chainLen * (+span.value / 100);
    return { W: W, H: H, len: chainLen, gap: gap, y: H * 0.18, x0: W / 2 - gap / 2, x1: W / 2 + gap / 2 };
  }

  function reset() {
    var L = layout();
    linkLen = L.len / (N - 1);
    pts = [];
    for (var i = 0; i < N; i++) {
      var x = L.x0 + (L.x1 - L.x0) * i / (N - 1);
      pts.push({ x: x, y: L.y, px: x, py: L.y, m: 1 });
    }
    applyMasses();
    lastW = view.width;
  }

  function applyMasses() {
    var k = +loads.value, heavy = +massIn.value;
    for (var i = 0; i < N; i++) pts[i].m = 1;
    for (var j = 1; j <= k; j++) {
      var idx = Math.round(j * (N - 1) / (k + 1));
      pts[idx].m = heavy;
    }
  }

  function pinned(i) { return i === 0 || i === N - 1; }

  function step(dt) {
    var L = layout();
    pts[0].x = L.x0; pts[0].y = L.y;
    pts[N - 1].x = L.x1; pts[N - 1].y = L.y;
    var damp = 0.985;
    for (var i = 1; i < N - 1; i++) {
      var p = pts[i];
      var vx = (p.x - p.px) * damp, vy = (p.y - p.py) * damp;
      p.px = p.x; p.py = p.y;
      p.x += vx;
      p.y += vy + GRAVITY * dt * dt;
    }
    for (var it = 0; it < ITER; it++) {
      for (var s = 0; s < N - 1; s++) {
        var a = pts[s], b = pts[s + 1];
        var dx = b.x - a.x, dy = b.y - a.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 1e-6;
        var diff = (d - linkLen) / d;
        // Heavier points move less, so a weight drags its neighbours toward it.
        var wa = pinned(s) ? 0 : 1 / a.m, wb = pinned(s + 1) ? 0 : 1 / b.m;
        var sum = wa + wb;
        if (!sum) continue;
        a.x += dx * diff * wa / sum; a.y += dy * diff * wa / sum;
        b.x -= dx * diff * wb / sum; b.y -= dy * diff * wb / sum;
      }
    }
  }

  // Mirror a chain point about the pin line when flipped.
  function shown(p, L) {
    return flip.checked ? { x: p.x, y: 2 * L.y - p.y + (L.H * 0.62 - L.y) } : { x: p.x, y: p.y };
  }

  function render() {
    var ctx = view.ctx, L = layout();
    ctx.clearRect(0, 0, L.W, L.H);
    var ink = colors.text, muted = colors.textMuted;
    var base = flip.checked ? L.H * 0.62 : L.y; // pin line on screen

    // Ground line when flipped.
    if (flip.checked) {
      ctx.strokeStyle = muted; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, base + 0.5); ctx.lineTo(L.W, base + 0.5); ctx.stroke();
    }

    // Semicircle of the same span for comparison.
    if (semi.checked) {
      var r = L.gap / 2;
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
      ctx.beginPath();
      if (flip.checked) ctx.arc(L.W / 2, base, r, Math.PI, 2 * Math.PI);
      else ctx.arc(L.W / 2, base, r, 0, Math.PI);
      ctx.stroke(); ctx.setLineDash([]);
    }

    // The chain (or arch).
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = flip.checked ? '#b45309' : ink;
    ctx.lineWidth = flip.checked ? 9 : 3;
    ctx.beginPath();
    for (var i = 0; i < N; i++) {
      var q = shown(pts[i], L);
      if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
    if (!flip.checked) {
      ctx.fillStyle = ink;
      for (var j = 0; j < N; j += 2) {
        ctx.beginPath(); ctx.arc(pts[j].x, pts[j].y, 2.2, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      // Voussoir joints: short ticks across the arch, perpendicular to it.
      ctx.strokeStyle = colors.bg; ctx.lineWidth = 1.5;
      for (var v = 2; v < N - 1; v += 3) {
        var a = shown(pts[v - 1], L), b = shown(pts[v + 1], L), c = shown(pts[v], L);
        var tx = b.x - a.x, ty = b.y - a.y, tl = Math.hypot(tx, ty) || 1;
        var nx = -ty / tl * 4.5, ny = tx / tl * 4.5;
        ctx.beginPath(); ctx.moveTo(c.x - nx, c.y - ny); ctx.lineTo(c.x + nx, c.y + ny); ctx.stroke();
      }
    }

    // Weights.
    for (var k = 1; k < N - 1; k++) {
      if (pts[k].m <= 1) continue;
      var w = shown(pts[k], L), size = 5 + pts[k].m * 1.2;
      var dir = flip.checked ? -1 : 1;
      ctx.strokeStyle = muted; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.lineTo(w.x, w.y + dir * 14); ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.beginPath(); ctx.arc(w.x, w.y + dir * (14 + size), size, 0, Math.PI * 2); ctx.fill();
    }

    // Pins.
    ctx.fillStyle = colors.accent;
    [pts[0], pts[N - 1]].forEach(function (p) {
      var q = shown(p, L);
      ctx.beginPath(); ctx.arc(q.x, q.y, 6, 0, Math.PI * 2); ctx.fill();
    });

    updateReadout(L);
  }

  var lastText = '';
  function updateReadout(L) {
    var lowest = 0;
    for (var i = 0; i < N; i++) lowest = Math.max(lowest, pts[i].y - L.y);
    var ratio = lowest / L.gap;
    var text = flip.checked
      ? 'Arch: rise is ' + ratio.toFixed(2) + '× its span. Every joint is only squeezed, so no part of it bends.'
      : 'Chain: sag is ' + ratio.toFixed(2) + '× the span. Every link is only pulled.';
    if (semi.checked) text += ' A semicircle always has a rise of 0.50× its span.';
    if (+loads.value) text += ' ' + loads.value + ' weight' + (+loads.value > 1 ? 's' : '') + ' at ' + massIn.value + '× a link’s mass.';
    if (text !== lastText) { readout.textContent = text; lastText = text; }
  }

  function syncOutputs() {
    spanOut.textContent = span.value + '%';
    loadsOut.textContent = loads.value;
    massOut.textContent = massIn.value + '×';
  }

  span.addEventListener('input', function () { syncOutputs(); });
  loads.addEventListener('input', function () { syncOutputs(); applyMasses(); });
  massIn.addEventListener('input', function () { syncOutputs(); applyMasses(); });
  flip.addEventListener('change', render);
  semi.addEventListener('change', render);
  shake.addEventListener('click', function () {
    for (var i = 1; i < N - 1; i++) pts[i].px -= (Math.random() - 0.5) * 30;
  });

  syncOutputs();
  reset();
  // Let the chain settle before the first frame so a still screenshot or a
  // reduced-motion reader still sees the hanging curve.
  for (var s = 0; s < 400; s++) step(1 / 60);
  render();

  SimKit.loop(function (dt) {
    if (Math.abs(view.width - lastW) > 1) { reset(); for (var s = 0; s < 200; s++) step(1 / 60); }
    var sub = 2, h = Math.min(dt, 1 / 30) / sub;
    for (var i = 0; i < sub; i++) step(h);
    render();
  }, { el: SimKit.stage('#ga-chain') });
})();
