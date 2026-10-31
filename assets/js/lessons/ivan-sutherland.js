/* Ivan Sutherland lesson: Sketchpad Lab.
   A tiny constraint drawing in the spirit of Sketchpad (1963). The left sheet is the
   MASTER drawing: drag its corners, select sides (click a side, or use the two menus),
   then press a constraint button. A relaxation solver, the method Sutherland's thesis
   falls back on ("choose a variable, re-evaluate it to reduce the total error ... repeat"),
   nudges the corners a little every frame until every condition holds, so you can watch
   the drawing settle. The right sheet holds INSTANCES of the master: each is the same
   drawing moved, turned and scaled, so changing the master changes every copy at once.
   Needs sim-kit.js. Pointer positions use getBoundingClientRect + clientX (zoom-safe for
   sim-present). */
(function () {
  'use strict';
  if (!window.SimKit) return;
  var canvas = document.getElementById('is-sketch');
  if (!canvas) return;

  var $ = function (id) { return document.getElementById(id); };
  var shapeSel = $('is-shape');
  var selA = $('is-line-a');
  var selB = $('is-line-b');
  var consList = $('is-cons');
  var readout = $('is-readout');
  var patternBox = $('is-pattern');
  var goalsEl = $('is-goals');

  var colors = SimKit.theme.colors();
  var view = SimKit.canvas2d(canvas, { onResize: function () { dirty = true; } });

  var SHAPES = {
    quad: { name: 'Quadrilateral', pts: [[-82, -48], [72, -66], [92, 52], [-58, 74]] },
    tri: { name: 'Triangle', pts: [[-86, 62], [88, 48], [-14, -78]] }
  };
  var SYMBOL = { parallel: '∥', perp: '⊥', equal: '=', horiz: 'H', vert: 'V' };
  var NAME = { parallel: 'parallel', perp: 'perpendicular', equal: 'equal length', horiz: 'horizontal', vert: 'vertical' };

  var pts = [];        // master points in model units (about -100..100)
  var lines = [];      // [i, j] index pairs, side k joins point k and k+1
  var cons = [];       // { type, a, b }
  var selected = [];   // up to two line indices
  var drag = -1;       // index of the dragged point (pinned while dragged)
  var dirty = true;
  var err = 0;
  var stuckFrames = 0;
  var lastReadout = '';

  function build(kind) {
    var s = SHAPES[kind] || SHAPES.quad;
    pts = s.pts.map(function (p) { return { x: p[0], y: p[1] }; });
    lines = pts.map(function (_, i) { return [i, (i + 1) % pts.length]; });
    cons = [];
    selected = [];
    fillSelects();
    renderList();
    dirty = true;
  }

  function sideName(i) { return 'side ' + (i + 1); }

  function fillSelects() {
    [selA, selB].forEach(function (sel, k) {
      sel.innerHTML = '';
      var none = document.createElement('option');
      none.value = ''; none.textContent = k ? '(second side)' : '(first side)';
      sel.appendChild(none);
      lines.forEach(function (_, i) {
        var o = document.createElement('option');
        o.value = String(i); o.textContent = sideName(i);
        sel.appendChild(o);
      });
    });
    syncSelects();
  }

  function syncSelects() {
    selA.value = selected[0] != null ? String(selected[0]) : '';
    selB.value = selected[1] != null ? String(selected[1]) : '';
  }

  function readSelects() {
    selected = [];
    if (selA.value !== '') selected.push(+selA.value);
    if (selB.value !== '' && +selB.value !== selected[0]) selected.push(+selB.value);
    dirty = true;
  }

  // ── Geometry helpers ─────────────────────────────────────────────
  function vec(l) { var a = pts[lines[l][0]], b = pts[lines[l][1]]; return { x: b.x - a.x, y: b.y - a.y }; }
  function len(v) { return Math.sqrt(v.x * v.x + v.y * v.y) || 1e-9; }
  function unit(v) { var L = len(v); return { x: v.x / L, y: v.y / L }; }
  function weight(i) { return i === drag ? 0 : 1; }
  function mobility(l) { return weight(lines[l][0]) + weight(lines[l][1]); }

  // Move side l toward direction d (unit) and length L, by fraction k.
  function setLine(l, d, L, k) {
    var ia = lines[l][0], ib = lines[l][1];
    var a = pts[ia], b = pts[ib], wa = weight(ia), wb = weight(ib);
    if (!wa && !wb) return;
    var ta, tb;
    if (!wa) { ta = { x: a.x, y: a.y }; tb = { x: a.x + d.x * L, y: a.y + d.y * L }; }
    else if (!wb) { tb = { x: b.x, y: b.y }; ta = { x: b.x - d.x * L, y: b.y - d.y * L }; }
    else {
      var m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      ta = { x: m.x - d.x * L / 2, y: m.y - d.y * L / 2 };
      tb = { x: m.x + d.x * L / 2, y: m.y + d.y * L / 2 };
    }
    a.x += (ta.x - a.x) * k; a.y += (ta.y - a.y) * k;
    b.x += (tb.x - b.x) * k; b.y += (tb.y - b.y) * k;
  }

  // Error each constraint introduces, in model units (0 = satisfied).
  function consError(c) {
    var u = vec(c.a), Lu = len(u);
    if (c.type === 'horiz') return Math.abs(u.y);
    if (c.type === 'vert') return Math.abs(u.x);
    var v = vec(c.b), Lv = len(v);
    var avg = (Lu + Lv) / 2;
    var cross = (u.x * v.y - u.y * v.x) / (Lu * Lv);
    var dot = (u.x * v.x + u.y * v.y) / (Lu * Lv);
    if (c.type === 'parallel') return Math.abs(cross) * avg;
    if (c.type === 'perp') return Math.abs(dot) * avg;
    if (c.type === 'equal') return Math.abs(Lu - Lv);
    return 0;
  }

  function relaxOnce(k) {
    for (var n = 0; n < cons.length; n++) {
      var c = cons[n];
      var u = vec(c.a), du = unit(u), Lu = len(u);
      if (c.type === 'horiz') { setLine(c.a, { x: du.x >= 0 ? 1 : -1, y: 0 }, Lu, k); continue; }
      if (c.type === 'vert') { setLine(c.a, { x: 0, y: du.y >= 0 ? 1 : -1 }, Lu, k); continue; }
      var v = vec(c.b), dv = unit(v), Lv = len(v);
      // The side that can move less (one corner held by the pen) gets the bigger say.
      var wu = 1 / Math.max(mobility(c.a), 0.5), wv = 1 / Math.max(mobility(c.b), 0.5);
      if (c.type === 'parallel' || c.type === 'perp') {
        // Compare v (turned a quarter for perpendicular) with u, sign-matched.
        var vv = c.type === 'perp' ? { x: -dv.y, y: dv.x } : dv;
        var s = du.x * vv.x + du.y * vv.y < 0 ? -1 : 1;
        var t = unit({ x: du.x * wu + vv.x * s * wv, y: du.y * wu + vv.y * s * wv });
        setLine(c.a, t, Lu, k);
        var back = { x: t.x * s, y: t.y * s };
        if (c.type === 'perp') back = { x: back.y, y: -back.x };
        setLine(c.b, back, Lv, k);
      } else if (c.type === 'equal') {
        var L = Math.max(24, (Lu * wu + Lv * wv) / (wu + wv));
        setLine(c.a, du, L, k);
        setLine(c.b, dv, L, k);
      }
    }
  }

  function totalError() {
    var e = 0;
    for (var i = 0; i < cons.length; i++) e += consError(cons[i]);
    return e;
  }

  // ── Layout: master sheet + instance sheet ────────────────────────
  var INSTANCES = [
    { r: 0, s: 1 }, { r: 30, s: 0.75 }, { r: 90, s: 0.9 },
    { r: 180, s: 0.6 }, { r: -45, s: 1 }, { r: 135, s: 0.8 }
  ];

  function layout() {
    var W = view.width, H = view.height, pad = 10;
    var wide = W >= 620;
    var m, inst;
    if (wide) {
      var mw = Math.round(W * 0.55);
      m = { x: pad, y: pad, w: mw - pad * 1.5, h: H - pad * 2 };
      inst = { x: mw + pad * 0.5, y: pad, w: W - mw - pad * 1.5, h: H - pad * 2 };
    } else {
      var mh = Math.round(H * 0.6);
      m = { x: pad, y: pad, w: W - pad * 2, h: mh - pad * 1.5 };
      inst = { x: pad, y: mh + pad * 0.5, w: W - pad * 2, h: H - mh - pad * 1.5 };
    }
    m.s = Math.min(m.w, m.h - 24) / 250;
    m.cx = m.x + m.w / 2; m.cy = m.y + 24 + (m.h - 24) / 2;
    return { W: W, H: H, m: m, inst: inst };
  }

  function toScreen(L, p) { return { x: L.m.cx + p.x * L.m.s, y: L.m.cy + p.y * L.m.s }; }
  function toModel(L, x, y) { return { x: (x - L.m.cx) / L.m.s, y: (y - L.m.cy) / L.m.s }; }

  // ── Drawing ─────────────────────────────────────────────────────
  function sheet(ctx, r, title) {
    ctx.fillStyle = colors.cardBg;
    ctx.strokeStyle = colors.textMuted;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.rect(r.x + 0.5, r.y + 0.5, r.w, r.h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = colors.textMuted;
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(title, r.x + 8, r.y + 7);
  }

  function drawShape(ctx, map, width, color) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    for (var i = 0; i < lines.length; i++) {
      var a = map(pts[lines[i][0]]), b = map(pts[lines[i][1]]);
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
  }

  function render() {
    var ctx = view.ctx, L = layout();
    ctx.clearRect(0, 0, L.W, L.H);
    sheet(ctx, L.m, 'MASTER drawing: drag corners, click sides');
    sheet(ctx, L.inst, patternBox.checked ? 'INSTANCES as a pattern' : 'INSTANCES of the master');

    // Grid dots on the master sheet (Sketchpad drew on a blank scope; the grid helps us judge).
    ctx.fillStyle = colors.textMuted;
    ctx.globalAlpha = 0.35;
    for (var gx = -120; gx <= 120; gx += 20) {
      for (var gy = -100; gy <= 100; gy += 20) {
        var g = toScreen(L, { x: gx, y: gy });
        if (g.x < L.m.x + 4 || g.x > L.m.x + L.m.w - 4 || g.y < L.m.y + 24 || g.y > L.m.y + L.m.h - 4) continue;
        ctx.fillRect(g.x - 1, g.y - 1, 2, 2);
      }
    }
    ctx.globalAlpha = 1;

    var map = function (p) { return toScreen(L, p); };
    drawShape(ctx, map, 3, colors.text);

    // Selected sides.
    selected.forEach(function (li, k) {
      var a = map(pts[lines[li][0]]), b = map(pts[lines[li][1]]);
      ctx.strokeStyle = k ? '#7c3aed' : '#0e7490';
      ctx.lineWidth = 7; ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // Side labels and constraint tags, set just outside each side.
    var cx = 0, cy = 0;
    pts.forEach(function (p) { cx += p.x; cy += p.y; });
    cx /= pts.length; cy /= pts.length;
    var tags = lines.map(function () { return []; });
    cons.forEach(function (c, n) {
      tags[c.a].push(SYMBOL[c.type] + (n + 1));
      if (c.b != null) tags[c.b].push(SYMBOL[c.type] + (n + 1));
    });
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach(function (ln, i) {
      var a = pts[ln[0]], b = pts[ln[1]];
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      var nx = mx - cx, ny = my - cy, nl = Math.sqrt(nx * nx + ny * ny) || 1;
      var off = 17 / L.m.s;
      var p = map({ x: mx + nx / nl * off, y: my + ny / nl * off });
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillStyle = colors.textMuted;
      ctx.fillText(sideName(i), p.x, p.y - (tags[i].length ? 8 : 0));
      if (tags[i].length) {
        ctx.font = '700 13px system-ui, sans-serif';
        ctx.fillStyle = '#c2410c';
        ctx.fillText(tags[i].join(' '), p.x, p.y + 8);
      }
    });

    // Corners.
    pts.forEach(function (p, i) {
      var q = map(p);
      ctx.fillStyle = i === drag ? '#c2410c' : colors.accent;
      ctx.beginPath(); ctx.arc(q.x, q.y, i === drag ? 8 : 6.5, 0, Math.PI * 2); ctx.fill();
    });

    drawInstances(ctx, L);
    updateReadout();
  }

  function drawInstances(ctx, L) {
    var r = L.inst;
    var top = r.y + 24, h = r.h - 30;
    var list = [];
    if (patternBox.checked) {
      // Tile the master edge to edge: alternate rows turned half a turn, like
      // Sketchpad's hexagon pattern made of one master hexagon.
      var cols = 4, rows = 3;
      for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
        list.push({ x: r.x + (i + 0.5) * r.w / cols, y: top + (j + 0.5) * h / rows, r: (i + j) % 2 ? 180 : 0, s: 1, cell: Math.min(r.w / cols, h / rows) });
      }
    } else {
      var c2 = r.w > r.h * 1.2 ? 3 : 2, r2 = Math.ceil(INSTANCES.length / c2);
      if (r.w < 380 && r.h < 260) { c2 = 3; r2 = 2; }
      INSTANCES.forEach(function (it, k) {
        var i = k % c2, j = Math.floor(k / c2);
        list.push({ x: r.x + (i + 0.5) * r.w / c2, y: top + (j + 0.5) * h / r2, r: it.r, s: it.s, cell: Math.min(r.w / c2, h / r2), label: true });
      });
    }
    list.forEach(function (it) {
      var sc = it.cell / 250 * it.s * 0.95;
      var cos = Math.cos(it.r * Math.PI / 180), sin = Math.sin(it.r * Math.PI / 180);
      var map = function (p) { return { x: it.x + (p.x * cos - p.y * sin) * sc, y: it.y + (p.x * sin + p.y * cos) * sc }; };
      drawShape(ctx, map, 2, colors.accent);
      if (it.label) {
        ctx.fillStyle = colors.textMuted;
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('×' + it.s + ' · ' + it.r + '°', it.x, it.y + it.cell / 2 - 2);
      }
    });
  }

  // ── Goals: checked on the real geometry, so a shape that only looks right
  //    falls apart under "Shake" unless constraints hold it. ───────────────
  function angleAt(i) {
    var n = pts.length, p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    var u = { x: a.x - p.x, y: a.y - p.y }, v = { x: b.x - p.x, y: b.y - p.y };
    var c = (u.x * v.x + u.y * v.y) / (len(u) * len(v));
    return Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI;
  }
  function parallelDeg(l1, l2) {
    var u = unit(vec(l1)), v = unit(vec(l2));
    return Math.asin(Math.min(1, Math.abs(u.x * v.y - u.y * v.x))) * 180 / Math.PI;
  }
  function sidesEqual(list) {
    var Ls = list.map(function (l) { return len(vec(l)); });
    var mx = Math.max.apply(null, Ls), mn = Math.min.apply(null, Ls);
    return (mx - mn) / mx < 0.02;
  }
  function anyRight() {
    for (var i = 0; i < pts.length; i++) if (Math.abs(angleAt(i) - 90) < 1.5) return true;
    return false;
  }

  function goals() {
    if (pts.length === 4) {
      var para = parallelDeg(0, 2) < 1.5 && parallelDeg(1, 3) < 1.5;
      var rect = para && anyRight();
      return [
        ['Parallelogram', para],
        ['Rectangle', rect],
        ['Square', rect && sidesEqual([0, 1, 2, 3])]
      ];
    }
    var iso = sidesEqual([0, 1]) || sidesEqual([1, 2]) || sidesEqual([0, 2]);
    return [
      ['Isosceles', iso],
      ['Right triangle', anyRight()],
      ['Equilateral', sidesEqual([0, 1, 2])]
    ];
  }

  var lastGoals = '';
  function updateReadout() {
    var g = goals();
    var key = g.map(function (x) { return x[0] + x[1]; }).join('|');
    if (key !== lastGoals) {
      lastGoals = key;
      goalsEl.innerHTML = '';
      g.forEach(function (x) {
        var li = document.createElement('li');
        li.dataset.ok = x[1] ? 'true' : 'false';
        li.textContent = (x[1] ? '✓ ' : '') + x[0];
        goalsEl.appendChild(li);
      });
    }
    var text;
    if (!cons.length) text = 'No constraints yet. The drawing is just lines: drag a corner and nothing else cares.';
    else if (err < 0.05 * cons.length + 0.05) text = cons.length + ' constraint' + (cons.length > 1 ? 's' : '') + ' satisfied. Error ' + err.toFixed(2) + '. Drag a corner or press Shake: the drawing re-solves itself.';
    else if (stuckFrames > 150) text = 'Still relaxing after many passes (error ' + err.toFixed(1) + '). Two of these conditions may be fighting each other. Remove one.';
    else text = 'Relaxing… total error ' + err.toFixed(1) + ' and shrinking.';
    if (text !== lastReadout) { readout.textContent = text; lastReadout = text; }
  }

  // ── Constraint list (HTML) ───────────────────────────────────────
  function renderList() {
    consList.innerHTML = '';
    if (!cons.length) {
      var li0 = document.createElement('li');
      li0.textContent = 'None yet.';
      consList.appendChild(li0);
      return;
    }
    cons.forEach(function (c, n) {
      var li = document.createElement('li');
      var label = SYMBOL[c.type] + (n + 1) + ' ' + sideName(c.a) + (c.b != null ? ' and ' + sideName(c.b) : '') + ': ' + NAME[c.type];
      li.appendChild(document.createTextNode(label + ' '));
      var x = document.createElement('button');
      x.type = 'button'; x.textContent = 'Erase';
      x.setAttribute('aria-label', 'Erase constraint ' + (n + 1));
      x.addEventListener('click', function () { cons.splice(n, 1); renderList(); dirty = true; });
      li.appendChild(x);
      consList.appendChild(li);
    });
  }

  function addConstraint(type) {
    var needs = (type === 'horiz' || type === 'vert') ? 1 : 2;
    if (selected.length < needs) {
      readout.textContent = needs === 1 ? 'Select one side first (click it, or pick it in the first menu).' : 'Select two different sides first.';
      lastReadout = readout.textContent;
      return;
    }
    var c = { type: type, a: selected[0], b: needs === 2 ? selected[1] : null };
    var dup = cons.some(function (d) { return d.type === c.type && ((d.a === c.a && d.b === c.b) || (d.a === c.b && d.b === c.a)); });
    if (!dup) cons.push(c);
    stuckFrames = 0;
    renderList();
    dirty = true;
  }

  function shake() {
    pts.forEach(function (p) { p.x += (Math.random() - 0.5) * 50; p.y += (Math.random() - 0.5) * 50; });
    stuckFrames = 0;
    dirty = true;
  }

  // ── Pointer input on the master sheet ───────────────────────────
  function pointer(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (view.width / r.width), y: (e.clientY - r.top) * (view.height / r.height) };
  }
  function distToSeg(p, a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
    var t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
    var x = a.x + t * dx - p.x, y = a.y + t * dy - p.y;
    return Math.sqrt(x * x + y * y);
  }

  canvas.addEventListener('pointerdown', function (e) {
    var L = layout(), p = pointer(e);
    var best = -1, bd = 18;
    pts.forEach(function (q, i) {
      var s = toScreen(L, q), d = Math.hypot(s.x - p.x, s.y - p.y);
      if (d < bd) { bd = d; best = i; }
    });
    if (best >= 0) {
      drag = best;
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
      dirty = true;
      return;
    }
    var bl = -1, bld = 12;
    lines.forEach(function (ln, i) {
      var d = distToSeg(p, toScreen(L, pts[ln[0]]), toScreen(L, pts[ln[1]]));
      if (d < bld) { bld = d; bl = i; }
    });
    if (bl >= 0) {
      var at = selected.indexOf(bl);
      if (at >= 0) selected.splice(at, 1);
      else { selected.push(bl); if (selected.length > 2) selected.shift(); }
    } else if (p.x >= L.m.x && p.x <= L.m.x + L.m.w && p.y >= L.m.y && p.y <= L.m.y + L.m.h) {
      selected = [];
    }
    syncSelects();
    dirty = true;
  });
  canvas.addEventListener('pointermove', function (e) {
    if (drag < 0) return;
    var L = layout(), p = pointer(e), m = toModel(L, p.x, p.y);
    pts[drag].x = Math.max(-120, Math.min(120, m.x));
    pts[drag].y = Math.max(-105, Math.min(105, m.y));
    stuckFrames = 0;
    dirty = true;
  });
  function release() { if (drag >= 0) { drag = -1; dirty = true; } }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  // ── Controls ────────────────────────────────────────────────────
  document.querySelectorAll('[data-is-con]').forEach(function (b) {
    b.addEventListener('click', function () { addConstraint(b.getAttribute('data-is-con')); });
  });
  $('is-shake').addEventListener('click', shake);
  $('is-clear').addEventListener('click', function () { cons = []; renderList(); dirty = true; });
  $('is-reset').addEventListener('click', function () { build(shapeSel.value); });
  shapeSel.addEventListener('change', function () { build(shapeSel.value); });
  selA.addEventListener('change', readSelects);
  selB.addEventListener('change', readSelects);
  patternBox.addEventListener('change', function () { dirty = true; });
  SimKit.theme.onChange(function (c) { colors = c; dirty = true; });

  build('quad');
  render();

  SimKit.loop(function () {
    if (cons.length) {
      for (var i = 0; i < 6; i++) relaxOnce(0.35);
      var e = totalError();
      var moving = Math.abs(e - err) > 1e-4;
      err = e;
      if (err > 0.05 * cons.length + 0.05 && drag < 0) stuckFrames++; else stuckFrames = 0;
      if (moving) dirty = true;
    } else { err = 0; }
    if (!dirty) return;
    dirty = false;
    render();
  }, { el: SimKit.stage(canvas) });
})();
