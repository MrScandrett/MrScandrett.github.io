/* Tinkercad Codeblocks lesson: Ring Stack Lab.
   Five parameters drive one loop, exactly like the Codeblocks program shown
   beside the model: ring i has radius r0 + (i-1)·dr and either sits on top of
   the previous ring (stack) or on the same floor (concentric). The view is a
   painter's-order three-quarter projection; the STL is built from the same
   ring list, so what you see is what you download. The Locked fidget layout
   builds its rings with fidget-rings.js (which also has the tests) and shows
   them twice: a real 3-D model (fidget-rings-3d.mjs, loaded with Three.js the
   first time the layout opens) above a cutaway that shows the lock. Needs
   sim-kit.js and fidget-rings.js. */
(function () {
  'use strict';
  if (!window.SimKit) return;
  var FR = window.FidgetRings;
  var scriptSrc = document.currentScript && document.currentScript.src;
  var canvas = document.getElementById('cb-canvas');
  if (!canvas || !FR) return;

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

  /* ── Locked fidget layout ─────────────────────────────────────────── */
  var fIds = ['n', 'r', 'w', 'g', 'k', 'flat', 'step', 'lift'];
  var fIn = {}, fOut = {};
  fIds.forEach(function (k) { fIn[k] = document.getElementById('cb-f-' + k); fOut[k] = document.getElementById('cb-f-' + k + '-out'); });
  var shapeInputs = document.querySelectorAll('input[name="cb-shape"]');
  var statusEl = document.getElementById('cb-status');
  var groups = document.querySelectorAll('[data-cb-for]');
  var canvasLabel = canvas.getAttribute('aria-label');

  function fShape() {
    for (var i = 0; i < shapeInputs.length; i++) if (shapeInputs[i].checked) return shapeInputs[i].value;
    return 'star';
  }
  function fParams() {
    var p = { shape: fShape() };
    fIds.forEach(function (k) { p[k] = +fIn[k].value; });
    return p;
  }
  function setFidgetInputs(d) {
    fIds.forEach(function (k) { if (k !== 'lift' && d[k] !== undefined) fIn[k].value = d[k]; });
  }
  function currentMode() {
    for (var i = 0; i < modeInputs.length; i++) if (modeInputs[i].checked) return modeInputs[i].value;
    return 'stack';
  }

  var analysisKey = '', analysis = null;
  function analyzed(p) {
    var key = [p.shape, p.n, p.r, p.w, p.g, p.k, p.flat, p.step].join('|');
    if (key !== analysisKey) { analysis = FR.analyze(p); analysisKey = key; }
    return analysis;
  }

  function ringColor(i, n, light) {
    var hue = 190 - (i - 1) * (150 / Math.max(1, n - 1));
    return 'hsl(' + hue + ',' + (light ? '65%,60%' : '60%,30%') + ')';
  }

  // Cutaway through the middle of one side: x is distance from the centre line,
  // measured in true mm across the side (tip radius × side factor).
  function renderFidget() {
    var p = fParams(), an = analyzed(p);
    var ctx = view.ctx, W = view.width, H = view.height, i;
    ctx.clearRect(0, 0, W, H);
    var h = an.h, xMax = 0, zMax = 0, polys = [];
    for (i = 1; i <= p.n; i++) {
      var poly = FR.truePolygon(p, i, 0);
      polys.push(poly);
      poly.forEach(function (q) { xMax = Math.max(xMax, q[0]); zMax = Math.max(zMax, q[1]); });
    }
    // The slider runs just past the point where the whole fidget has left the bed.
    var hang = isFinite(an.down) ? (p.n - 1) * Math.abs(an.down) : 0;
    fIn.lift.max = isFinite(an.down) ? Math.ceil(hang) + 2 : 6;
    if (+fIn.lift.value > +fIn.lift.max) fIn.lift.value = fIn.lift.max;
    var liftCap = +fIn.lift.max + 1;
    var s = Math.max(0.01, Math.min((W - 60) / (xMax * 1.04), (H - 70) / (zMax + liftCap)));
    var x0 = 30, floor = H - 26;
    var z = FR.lift(p, an, +fIn.lift.value);
    if (fidget3d) fidget3d.update(p, z);

    // bed
    ctx.strokeStyle = colors.text; ctx.fillStyle = colors.text; ctx.lineWidth = 2; ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.moveTo(8, floor); ctx.lineTo(W - 8, floor); ctx.stroke();
    ctx.setLineDash([5, 5]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, floor + 6); ctx.lineTo(x0, floor - zMax * s - 14); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 1; ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('bed', W - 34, floor + 16);
    ctx.fillText('centre', x0 - 18, floor + 16);

    for (i = 0; i < polys.length; i++) {
      ctx.beginPath();
      polys[i].forEach(function (q, m) {
        var px = x0 + q[0] * s, py = floor - (q[1] + z[i]) * s;
        if (m) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      });
      ctx.closePath();
      ctx.fillStyle = ringColor(i + 1, p.n, true); ctx.fill();
      ctx.strokeStyle = ringColor(i + 1, p.n, false); ctx.lineWidth = 1.2; ctx.stroke();
    }

    // Mark the air gap between rings 1 and 2 where the ridge sits in the groove.
    ctx.fillStyle = colors.text; ctx.strokeStyle = colors.text; ctx.lineWidth = 1.5; ctx.font = '12px system-ui, sans-serif';
    if (p.n >= 2) {
      var gx0 = x0 + (p.r + p.k * an.run) * h * s, gx1 = gx0 + p.g * h * s;
      var gy = floor - (FR.ringHeight(p, 1) / 2 + z[0]) * s;
      ctx.beginPath(); ctx.moveTo(gx0 - 10, gy); ctx.lineTo(gx0, gy); ctx.moveTo(gx1, gy); ctx.lineTo(gx1 + 10, gy); ctx.stroke();
      ctx.fillText('air gap', gx1 + 12, gy + 4);
    }
    ctx.fillText(p.k > 0 ? 'Cutaway: ridge sits in the next groove' : 'Cutaway: straight walls, nothing locks', 10, 18);

    // Top view inset: the outlines the stacked slabs make.
    var u = FR.unitOutline(p.shape), maxTip = p.r + (p.n - 1) * (p.w + p.g) + p.k * an.run, R = 44, cx = W - R - 14, cy = R + 14;
    ctx.save();
    ctx.globalAlpha = W < 460 ? 0 : 0.9;
    for (i = p.n; i >= 1; i--) {
      var tip = p.r + (i - 1) * (p.w + p.g) + p.k * an.run;
      ctx.beginPath();
      [tip, tip - p.w].forEach(function (rr) {
        u.forEach(function (q, m) { var px = cx + q[0] * rr / maxTip * R, py = cy + q[1] * rr / maxTip * R; if (m) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
        ctx.closePath();
      });
      ctx.fillStyle = ringColor(i, p.n, true); ctx.fill('evenodd');
      ctx.strokeStyle = ringColor(i, p.n, false); ctx.lineWidth = 0.8; ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = colors.text; ctx.font = '11px system-ui, sans-serif'; if (W >= 460) ctx.fillText('top view', cx - 22, cy + R + 14);

    // Scale bar: 5 mm.
    ctx.strokeStyle = colors.text; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(12, H - 8); ctx.lineTo(12 + 5 * s, H - 8); ctx.stroke();
    ctx.font = '12px system-ui, sans-serif'; ctx.fillText('5 mm', 16 + 5 * s, H - 4);

    updateFidgetText(p, an);
  }

  /* ── Locked fidget in 3-D ─────────────────────────────────────────── */
  var canvas3d = document.getElementById('cb-canvas-3d');
  var cut3d = document.getElementById('cb-3d-cut');
  var fidget3d = null, loading3d = false;
  function load3d() {
    if (fidget3d || loading3d || !canvas3d || !scriptSrc) return;
    loading3d = true;
    import(new URL('fidget-rings-3d.mjs', scriptSrc).href).then(function (m) {
      fidget3d = m.mount(canvas3d, FR);
      fidget3d.setCut(cut3d.checked);
      if (window.ResizeObserver) new ResizeObserver(function () { fidget3d.resize(); }).observe(canvas3d);
      render();
    }).catch(function () {
      // No WebGL, or the module failed to load: the cutaway still teaches the lock.
      canvas3d.closest('.cb-3d').remove();
    });
  }
  if (cut3d) cut3d.addEventListener('change', function () { if (fidget3d) fidget3d.setCut(cut3d.checked); });
  var view3d = document.getElementById('cb-3d-view');
  if (view3d) view3d.addEventListener('click', function () { if (fidget3d) fidget3d.resetView(); });

  function renderMode() { if (currentMode() === 'fidget') renderFidget(); else render(); }

  function slotNum(v) { return slot(fmt(v)); }
  function fidgetProgram(p, an) {
    var run = an.run, spacing = p.w + p.g;
    var slabT = block('cb-def', 'Define Template ' + slot('slab')) +
      '<div class="cb-indent">' +
        block('cb-shape', 'Add Star solid Sides ' + slot(8) + ' Radius ' + slot('r') + ' Inner Radius(%) ' + slot('0.76') + ' H ' + slot('thick')) +
        block('cb-mod', 'Move Z-axis min to ' + slot('z')) +
        block('cb-shape', 'Add Star hole Sides ' + slot(8) + ' Radius ' + slot('r − wall') + ' Inner Radius(%) ' + slot('0.76') + ' H ' + slot('thick')) +
        block('cb-mod', 'Move Z-axis min to ' + slot('z')) +
        block('cb-mod', 'Group Selection') +
        block('cb-data', 'Change ' + slot('z') + ' by ' + slot('thick')) +
      '</div>';
    if (p.shape === 'round') {
      slabT = slabT.replace(/Add Star solid Sides <span class="cb-slot">8<\/span> Radius/, 'Add Cylinder solid Radius')
        .replace(/ Inner Radius\(%\) <span class="cb-slot">0\.76<\/span> H/g, ' H')
        .replace(/Add Star hole Sides <span class="cb-slot">8<\/span> Radius/, 'Add Cylinder hole Radius');
    }
    var ringT = block('cb-def', 'Define Template ' + slot('ring')) +
      '<div class="cb-indent">' +
        block('cb-data', 'Set ' + slot('r') + ' to ' + slot('radius')) +
        block('cb-data', 'Set ' + slot('z') + ' to ' + slot(0)) +
        block('cb-data', 'Set ' + slot('thick') + ' to ' + slot(0.5)) +
        block('cb-control', 'Repeat ' + slot('lock') + ' Times') +
        '<div class="cb-indent">' + block('cb-def', 'Create from Template ' + slot('slab')) + block('cb-data', 'Change ' + slot('r') + ' by ' + slot('run')) + '</div>' +
        block('cb-data', 'Set ' + slot('thick') + ' to ' + slot('flat')) +
        block('cb-def', 'Create from Template ' + slot('slab')) +
        block('cb-data', 'Set ' + slot('thick') + ' to ' + slot(0.5)) +
        block('cb-control', 'Repeat ' + slot('lock') + ' Times') +
        '<div class="cb-indent">' + block('cb-data', 'Change ' + slot('r') + ' by ' + slot('−run')) + block('cb-def', 'Create from Template ' + slot('slab')) + '</div>' +
        block('cb-mod', 'Group Selection') +
      '</div>';
    var main =
      block('cb-data', 'Set ' + slot('rings') + ' to ' + slot(p.n)) +
      block('cb-data', 'Set ' + slot('radius') + ' to ' + slotNum(p.r)) +
      block('cb-data', 'Set ' + slot('wall') + ' to ' + slotNum(p.w)) +
      block('cb-data', 'Set ' + slot('flat') + ' to ' + slotNum(p.flat)) +
      block('cb-data', 'Set ' + slot('run') + ' to ' + slotNum(run)) +
      block('cb-data', 'Set ' + slot('lock') + ' to ' + slot(p.k)) +
      block('cb-control', 'Count with ' + slot('i') + ' from 1 to ' + slot('rings') + ' by 1') +
      '<div class="cb-indent">' + block('cb-def', 'Create from Template ' + slot('ring')) +
        block('cb-data', 'Change ' + slot('radius') + ' by ' + slotNum(spacing)) +
        block('cb-data', 'Change ' + slot('flat') + ' by ' + slotNum(p.step)) + '</div>';
    return main + '<div class="cb-prog-gap"></div>' + ringT + '<div class="cb-prog-gap"></div>' + slabT;
  }

  function updateFidgetText(p, an) {
    fIds.forEach(function (k) { fOut[k].textContent = fmt(p[k]); });
    var html = fidgetProgram(p, an);
    if (html !== lastProgram) { program.innerHTML = html; lastProgram = html; }

    var vol = FR.volume(p), tall = FR.ringHeight(p, p.n);
    var notes = [];
    if (p.k === 0) notes.push('With no lock steps each ring is a plain tube: the same loose rings as before.');
    else if (!an.locked) notes.push('The ridge (' + fmt(an.ridge) + ' mm) is not deeper than the gap (' + fmt(an.gapTrue) + ' mm), so the rings can slide apart. Add lock steps or shrink the gap.');
    if (an.clearance < 0.35) notes.push('Air gap under 0.35 mm: most printers will fuse the rings together.');
    else if (an.clearance > 0.9) notes.push('Air gap over 0.9 mm: the fidget will rattle.');
    if (p.r - p.w < 3) notes.push('The innermost ring is nearly solid: raise the start radius or thin the wall.');
    if (an.wallTrue < 1.2) notes.push('Wall under 1.2 mm is thin for a print; thicken it.');
    if (p.shape === 'star') notes.push('Sizes across a flat side are ' + fmt(Math.round(an.h * 100) / 100) + ' × the point numbers.');
    var gapTxt = isFinite(an.clearance) ? (Math.round(an.clearance * 100) / 100) + ' mm' : '–';
    readout.textContent = p.n + ' rings · ' + fmt(tall) + ' mm tall · ' + FR.slabCount(p) + ' slabs (' + 2 * FR.slabCount(p) + ' star shapes) · air gap ' + gapTxt +
      (an.locked ? ' · each ring slides ' + (Math.round(an.play * 10) / 10) + ' mm in all' : '') +
      ' · plastic ' + fmt(vol / 1000) + ' cm³ ≈ ' + fmt(vol / 1000 * PLA) + ' g of PLA. ' + notes.join(' ');
    statusEl.hidden = false;
    var lifted = +fIn.lift.value;
    statusEl.dataset.locked = an.locked ? 'true' : 'false';
    if (an.locked) {
      var off = FR.lift(p, an, lifted).filter(function (v) { return v > 0.001; }).length;
      statusEl.textContent = '✓ Locked: ' + (off === p.n ? 'the whole fidget comes up in one piece.' : off > 1 ? off + ' of ' + p.n + ' rings are off the bed. Keep lifting.' : 'use the lift test and the other rings follow the outer one.');
    } else {
      statusEl.textContent = '✗ Falls apart: lift the outer ring and the inner rings stay behind.';
    }
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
    if (currentMode() === 'fidget') { renderFidget(); return; }
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

  function saveBlob(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  document.getElementById('cb-stl').addEventListener('click', function () {
    if (currentMode() === 'fidget') {
      var fp = fParams();
      saveBlob(new Blob([FR.binaryStl(fp)], { type: 'model/stl' }), 'locked-' + fp.shape + '-fidget-' + fp.n + 'rings.stl');
      return;
    }
    var p = params(), list = rings(p);
    // Concentric rings that touch would share faces; nudge them 0.01 mm apart.
    if (p.mode === 'concentric') {
      list = list.map(function (g) { return { R: g.R - 0.005, r: g.r ? g.r + 0.005 : 0, z: g.z, h: g.h, i: g.i }; });
    }
    saveBlob(new Blob([stl(list)], { type: 'model/stl' }), 'ring-stack-' + p.n + 'x' + fmt(p.r) + 'mm.stl');
  });

  function showControls() {
    var mode = currentMode();
    for (var g = 0; g < groups.length; g++) groups[g].hidden = groups[g].getAttribute('data-cb-for') !== (mode === 'fidget' ? 'fidget' : 'classic');
    statusEl.hidden = mode !== 'fidget';
    if (mode === 'fidget') load3d();
    canvas.setAttribute('aria-label', mode === 'fidget' ? 'Cutaway of the locked ring fidget: each ring has a ridge that sits in a groove of the next ring out' : canvasLabel);
    lastProgram = '';
  }

  document.getElementById('cb-reset').addEventListener('click', function () {
    ids.forEach(function (k) { inputs[k].value = DEFAULTS[k]; });
    modeInputs[0].checked = true;
    shapeInputs[0].checked = true;
    setFidgetInputs(FR.DEFAULTS.star);
    fIn.lift.value = 0;
    if (cut3d) { cut3d.checked = false; if (fidget3d) fidget3d.setCut(false); }
    showControls();
    render();
  });

  ids.forEach(function (k) { inputs[k].addEventListener('input', render); });
  fIds.forEach(function (k) { fIn[k].addEventListener('input', render); });
  for (var i = 0; i < modeInputs.length; i++) modeInputs[i].addEventListener('change', function () { showControls(); render(); });
  // Each outline has its own sensible starting numbers: a star's sides sit closer in than its points.
  for (var j = 0; j < shapeInputs.length; j++) shapeInputs[j].addEventListener('change', function () {
    setFidgetInputs(FR.DEFAULTS[fShape()]); fIn.lift.value = 0; render();
  });
  // Buttons elsewhere in the lesson can open the lab in a given layout.
  Array.prototype.forEach.call(document.querySelectorAll('[data-cb-mode]'), function (btn) {
    btn.addEventListener('click', function () {
      for (var m = 0; m < modeInputs.length; m++) modeInputs[m].checked = modeInputs[m].value === btn.getAttribute('data-cb-mode');
      showControls(); render();
      var lab = document.getElementById('cb-lab');
      if (lab) lab.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    });
  });
  showControls();
  render();
})();
