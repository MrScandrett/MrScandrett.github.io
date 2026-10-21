/* Tinkercad Codeblocks lesson: Ring Stack Lab.
   Five parameters drive one loop, exactly like the Codeblocks program shown
   beside the model: ring i has radius r0 + (i-1)·dr and either sits on top of
   the previous ring (stack) or on the same floor (concentric). The view is a
   painter's-order three-quarter projection; the STL is built from the same
   ring list, so what you see is what you download. Needs sim-kit.js. */
(function () {
  'use strict';
  if (!window.SimKit) return;
  var canvas = document.getElementById('cb-canvas');
  if (!canvas) return;

  var colors = SimKit.theme.colors();
  SimKit.theme.onChange(function (c) { colors = c; render(); });

  var SQUASH = 0.42;         // ellipse height / width for the three-quarter view
  var PLA = 1.24;            // g/cm³
  var DEFAULTS = { n: 8, r: 30, dr: -3, h: 5, w: 3, mode: 'stack' };
  var ids = ['n', 'r', 'dr', 'h', 'w'];
  var inputs = {}, outputs = {};
  ids.forEach(function (k) {
    inputs[k] = document.getElementById('cb-' + k);
    outputs[k] = document.getElementById('cb-' + k + '-out');
  });
  var modeInputs = document.querySelectorAll('input[name="cb-mode"]');
  var program = document.getElementById('cb-program');
  var readout = document.getElementById('cb-readout');

  function params() {
    var p = {};
    ids.forEach(function (k) { p[k] = +inputs[k].value; });
    p.mode = 'stack';
    for (var i = 0; i < modeInputs.length; i++) if (modeInputs[i].checked) p.mode = modeInputs[i].value;
    return p;
  }

  // The loop, run in JavaScript. Rings whose radius has shrunk below the wall
  // are skipped, just as Tinkercad can't make a tube with no hole.
  function rings(p) {
    var out = [], radius = p.r;
    for (var i = 1; i <= p.n; i++) {
      if (radius > 0.5) {
        out.push({
          i: i,
          R: radius,
          r: Math.max(0, radius - p.w),
          z: p.mode === 'stack' ? (i - 1) * p.h : 0,
          h: p.h
        });
      }
      radius += p.dr;
    }
    return out;
  }

  var view = SimKit.canvas2d(canvas, { height: 340, onResize: function () { render(); } });

  function render() {
    if (!view) return;
    var p = params(), list = rings(p);
    var ctx = view.ctx, W = view.width, H = view.height;
    ctx.clearRect(0, 0, W, H);
    if (!list.length) { updateText(p, list); return; }

    var maxR = 0, top = 0;
    list.forEach(function (g) { maxR = Math.max(maxR, g.R); top = Math.max(top, g.z + g.h); });
    var s = Math.max(0.01, Math.min((W - 40) / (2 * maxR), (H - 40) / (top + 2 * maxR * SQUASH)));
    var cx = W / 2, base = H - 20 - maxR * SQUASH * s;

    // Floor shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath(); ctx.ellipse(cx, base, maxR * s * 1.05, maxR * s * SQUASH * 1.05, 0, 0, Math.PI * 2); ctx.fill();

    // Concentric rings share a floor and a top, so draw outermost first and
    // let each inner top sit in the hole of the one around it.
    var order = p.mode === 'stack' ? list : list.slice().sort(function (a, b) { return b.R - a.R; });
    order.forEach(function (g, k) {
      var hue = 190 - (g.i - 1) * (150 / Math.max(1, p.n - 1));
      var y0 = base - g.z * s, y1 = base - (g.z + g.h) * s;
      var rx = g.R * s, ry = g.R * s * SQUASH;
      var showSide = p.mode === 'stack' || k === 0;
      if (showSide) {
        var grad = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
        grad.addColorStop(0, 'hsl(' + hue + ',60%,32%)');
        grad.addColorStop(0.45, 'hsl(' + hue + ',65%,52%)');
        grad.addColorStop(1, 'hsl(' + hue + ',60%,28%)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, y0, rx, ry, 0, 0, Math.PI);
        ctx.lineTo(cx - rx, y1);
        ctx.ellipse(cx, y1, rx, ry, 0, Math.PI, 0, true);
        ctx.closePath();
        ctx.fill();
      }
      // Top face: the ring outline, then the hole.
      ctx.fillStyle = 'hsl(' + hue + ',70%,64%)';
      ctx.beginPath(); ctx.ellipse(cx, y1, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'hsl(' + hue + ',60%,25%)'; ctx.lineWidth = 1; ctx.stroke();
      if (g.r > 0) {
        ctx.fillStyle = 'hsl(' + hue + ',45%,18%)';
        ctx.beginPath(); ctx.ellipse(cx, y1, g.r * s, g.r * s * SQUASH, 0, 0, Math.PI * 2); ctx.fill();
      }
    });

    // Scale bar: 10 mm.
    ctx.strokeStyle = colors.text; ctx.fillStyle = colors.text; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(12, H - 12); ctx.lineTo(12 + 10 * s, H - 12); ctx.stroke();
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('10 mm', 14 + 10 * s, H - 8);

    updateText(p, list);
  }

  function fmt(n) { return (Math.round(n * 10) / 10).toString(); }

  function block(cls, html) { return '<div class="cb-block ' + cls + '">' + html + '</div>'; }
  function slot(v) { return '<span class="cb-slot">' + v + '</span>'; }

  var lastProgram = '';
  function updateText(p, list) {
    ids.forEach(function (k) { outputs[k].textContent = fmt(p[k]); });

    var inner = block('cb-shape', 'Add Tube radius ' + slot('radius') + ' wall ' + slot(fmt(p.w)) + ' height ' + slot('height'));
    if (p.mode === 'stack') inner += block('cb-mod', 'Move z ' + slot('(i − 1) × height'));
    inner += block('cb-data', 'Change ' + slot('radius') + ' by ' + slot(fmt(p.dr)));
    var html =
      block('cb-data', 'Set ' + slot('rings') + ' to ' + slot(p.n)) +
      block('cb-data', 'Set ' + slot('radius') + ' to ' + slot(fmt(p.r))) +
      block('cb-data', 'Set ' + slot('height') + ' to ' + slot(fmt(p.h))) +
      block('cb-control', 'Count with ' + slot('i') + ' from 1 to ' + slot('rings') + ' by 1') +
      '<div class="cb-indent">' + inner + '</div>';
    if (html !== lastProgram) { program.innerHTML = html; lastProgram = html; }

    var vol = 0, circ = 0;
    list.forEach(function (g) {
      vol += Math.PI * (g.R * g.R - g.r * g.r) * g.h;
      circ += 2 * Math.PI * g.R;
    });
    var note = '';
    if (list.length < p.n) note = ' ' + (p.n - list.length) + ' ring' + (p.n - list.length > 1 ? 's' : '') + ' skipped: the radius shrank to nothing.';
    else if (list.some(function (g) { return g.r === 0; })) note = ' Some rings are solid discs: their radius is smaller than the wall.';
    if (p.mode === 'concentric') {
      if (p.dr < p.w && p.dr > 0) note += ' Rings overlap: change radius by less than the wall.';
      else if (p.dr === p.w) note += ' Rings just touch: change radius by = wall.';
      else if (p.dr <= 0) note += ' Use a positive change so the rings grow outward.';
    }
    var height = list.reduce(function (m, g) { return Math.max(m, g.z + g.h); }, 0);
    readout.textContent = list.length + ' rings · ' + fmt(height) + ' mm tall · outer edges total ' +
      Math.round(circ) + ' mm around (2πr each) · plastic ' + fmt(vol / 1000) + ' cm³ ≈ ' + fmt(vol / 1000 * PLA) + ' g of PLA.' + note;
  }

  /* ── STL (ASCII), one closed tube per ring ─────────────────────────── */
  function stl(list) {
    var SEG = 64, out = ['solid ring_stack'];
    function facet(a, b, c) {
      var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      var vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      var l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      out.push(' facet normal ' + (nx / l).toFixed(5) + ' ' + (ny / l).toFixed(5) + ' ' + (nz / l).toFixed(5),
        '  outer loop',
        '   vertex ' + a.map(f).join(' '), '   vertex ' + b.map(f).join(' '), '   vertex ' + c.map(f).join(' '),
        '  endloop', ' endfacet');
    }
    function f(n) { return n.toFixed(4); }
    function quad(a, b, c, d) { facet(a, b, c); facet(a, c, d); }
    list.forEach(function (g) {
      var z0 = g.z, z1 = g.z + g.h, R = g.R, r = g.r;
      for (var k = 0; k < SEG; k++) {
        var a0 = 2 * Math.PI * k / SEG, a1 = 2 * Math.PI * (k + 1) / SEG;
        var c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
        var o00 = [R * c0, R * s0, z0], o10 = [R * c1, R * s1, z0], o01 = [R * c0, R * s0, z1], o11 = [R * c1, R * s1, z1];
        quad(o00, o10, o11, o01);                                         // outer wall
        if (r > 0) {
          var i00 = [r * c0, r * s0, z0], i10 = [r * c1, r * s1, z0], i01 = [r * c0, r * s0, z1], i11 = [r * c1, r * s1, z1];
          quad(i10, i00, i01, i11);                                       // inner wall
          quad(o01, o11, i11, i01);                                       // top
          quad(o10, o00, i00, i10);                                       // bottom
        } else {
          facet([0, 0, z1], o01, o11);
          facet([0, 0, z0], o10, o00);
        }
      }
    });
    out.push('endsolid ring_stack');
    return out.join('\n');
  }

  document.getElementById('cb-stl').addEventListener('click', function () {
    var p = params(), list = rings(p);
    // Concentric rings that touch would share faces; nudge them 0.01 mm apart.
    if (p.mode === 'concentric') {
      list = list.map(function (g) { return { R: g.R - 0.005, r: g.r ? g.r + 0.005 : 0, z: g.z, h: g.h, i: g.i }; });
    }
    var blob = new Blob([stl(list)], { type: 'model/stl' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ring-stack-' + p.n + 'x' + fmt(p.r) + 'mm.stl';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  document.getElementById('cb-reset').addEventListener('click', function () {
    ids.forEach(function (k) { inputs[k].value = DEFAULTS[k]; });
    modeInputs[0].checked = true;
    render();
  });

  ids.forEach(function (k) { inputs[k].addEventListener('input', render); });
  for (var i = 0; i < modeInputs.length; i++) modeInputs[i].addEventListener('change', render);
  render();
})();
