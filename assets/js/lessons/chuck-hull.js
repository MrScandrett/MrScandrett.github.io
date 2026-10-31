/* Chuck Hull lesson: Slicing Lab.
   A solid of revolution is cut into layers the way a slicer does it (each layer takes the shape of
   the model at the layer's middle height). Changing the layer height shows the stair-stepping on
   sloped sides, the number of layers, and how print time compares between layer heights. "Print it"
   animates the layers being made, either Hull's way (SLA: a UV spot draws each layer on the surface of
   a vat of liquid resin and the platform sinks one layer) or the classroom way (FDM: a hot nozzle lays
   plastic lines and rises one layer). Times are comparisons, not forecasts.
   Needs sim-kit.js. Exposes window.HullLab (pure helpers) for tests. */
(function () {
  'use strict';

  /* ── Shapes: outer radius R(z) in mm for 0 ≤ z ≤ H, optional hollow r(z) above a floor ── */
  var SHAPES = {
    dome: {
      label: 'Dome', H: 20,
      R: function (z) { return Math.sqrt(Math.max(0, 400 - z * z)); }
    },
    cone: {
      label: 'Cone', H: 30,
      R: function (z) { return Math.max(0, 15 * (1 - z / 30)); }
    },
    cup: {
      label: 'Small cup', H: 26, floor: 2.4,
      R: function (z) { var t = z / 26; return 9.5 + 5.5 * Math.pow(t, 1.6) + (z < 1.2 ? -0.6 * (1.2 - z) : 0); },
      r: function (z) { return 9.5 + 5.5 * Math.pow(z / 26, 1.6) - 1.6; }
    },
    pawn: {
      label: 'Chess pawn', H: 34,
      R: function (z) {
        if (z < 3) return 12;
        if (z < 6) return 12 - (z - 3) * 1.6;
        if (z < 22) return 7.2 - 3.6 * Math.sqrt((z - 6) / 16);
        if (z < 24) return 6;
        if (z < 25) return 3.6;
        var h = z - 29.5; // head: sphere of radius 4.5 centred at 29.5
        return Math.sqrt(Math.max(0, 4.5 * 4.5 - h * h));
      }
    }
  };
  var HEIGHTS = [0.025, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3];

  // Slicer: layer i covers [i·h, (i+1)·h]; its outline is the model's outline at the mid-height.
  function slice(shape, h) {
    var s = SHAPES[shape], n = Math.max(1, Math.round(s.H / h)), layers = [];
    for (var i = 0; i < n; i++) {
      var z0 = i * h, z1 = Math.min(s.H, (i + 1) * h), zm = (z0 + z1) / 2;
      var hollow = s.r && zm > s.floor ? Math.max(0, s.r(zm)) : 0;
      layers.push({ z0: z0, z1: z1, R: s.R(zm), r: hollow });
    }
    return layers;
  }

  // Biggest sideways gap between the true surface and the printed stair edge, in mm.
  function roughness(shape, h) {
    var s = SHAPES[shape], worst = 0;
    slice(shape, h).forEach(function (L) {
      for (var k = 0; k <= 8; k++) {
        var z = L.z0 + (L.z1 - L.z0) * k / 8;
        var d = Math.abs(s.R(Math.min(z, s.H)) - L.R);
        if (L.R > 0.05 && d > worst && d < 6) worst = d;
      }
    });
    return worst;
  }

  // Relative print time: every layer costs a fixed overhead (recoat/peel for SLA, the move up and
  // travel for FDM) plus time proportional to the area it draws. Only ratios are reported.
  function relativeTime(shape, h, process) {
    var overhead = process === 'sla' ? 1.0 : 0.6;
    var perArea = process === 'sla' ? 0.004 : 0.012;
    return slice(shape, h).reduce(function (t, L) {
      return t + overhead + perArea * Math.PI * (L.R * L.R - L.r * L.r);
    }, 0);
  }

  window.HullLab = { slice: slice, roughness: roughness, relativeTime: relativeTime, heights: HEIGHTS, shapes: Object.keys(SHAPES) };

  /* ── The lab ─────────────────────────────────────────────── */
  var sideCanvas = document.getElementById('ch-side');
  var zoomCanvas = document.getElementById('ch-zoom');
  var topCanvas = document.getElementById('ch-top');
  if (!sideCanvas || !window.SimKit) return;

  var heightInput = document.getElementById('ch-height');
  var heightOut = document.getElementById('ch-height-out');
  var shapeInputs = document.querySelectorAll('input[name="ch-shape"]');
  var procInputs = document.querySelectorAll('input[name="ch-process"]');
  var printBtn = document.getElementById('ch-print');
  var resetBtn = document.getElementById('ch-reset');
  var readout = document.getElementById('ch-readout');
  var bars = document.getElementById('ch-bars');

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var state = { shape: 'dome', h: 0.2, process: 'fdm', zoomZ: 17, print: null };
  var dirty = true;
  var dark = false;
  function readTheme() {
    var m = /rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(getComputedStyle(document.body).backgroundColor) || [];
    dark = m.length ? (0.299 * m[1] + 0.587 * m[2] + 0.114 * m[3]) < 110 : false;
    dirty = true;
  }
  SimKit.theme.onChange(readTheme);

  var side = SimKit.canvas2d(sideCanvas, { height: 340, onResize: function () { dirty = true; } });
  var zoom = SimKit.canvas2d(zoomCanvas, { height: 160, onResize: function () { dirty = true; } });
  var top = SimKit.canvas2d(topCanvas, { height: 160, onResize: function () { dirty = true; } });
  readTheme();

  function pal() {
    return dark ? {
      bg: '#18202b', ink: '#e5e7eb', muted: '#9ca3af', grid: 'rgba(255,255,255,0.07)', true: '#fde047',
      a: '#38bdf8', b: '#0ea5e9', resin: 'rgba(251,146,60,0.22)', resinLine: '#fb923c', laser: '#c084fc', bed: '#64748b', nozzle: '#f87171'
    } : {
      bg: '#f6f7fb', ink: '#111827', muted: '#4b5563', grid: 'rgba(15,23,42,0.06)', true: '#b45309',
      a: '#2563eb', b: '#60a5fa', resin: 'rgba(234,88,12,0.14)', resinLine: '#c2410c', laser: '#7c3aed', bed: '#475569', nozzle: '#b91c1c'
    };
  }

  function radioValue(list) { for (var i = 0; i < list.length; i++) if (list[i].checked) return list[i].value; return null; }
  function fmt(n, d) { return n.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }

  /* Side view geometry: model centred, scaled to fit. Returns a mapping. */
  function sideMap(W, H, s, extraTop) {
    var pad = 26, maxR = 0;
    for (var z = 0; z <= s.H; z += s.H / 60) maxR = Math.max(maxR, s.R(z));
    var sc = Math.min((W - 2 * pad) / (2 * maxR + 4), (H - 2 * pad - (extraTop || 0)) / (s.H + 2));
    var cx = W / 2, base = H - pad;
    return { sc: sc, cx: cx, base: base, x: function (r) { return cx + r * sc; }, y: function (z) { return base - z * sc; } };
  }

  function drawLayers(ctx, layers, m, P, upto, offsetY) {
    offsetY = offsetY || 0;
    for (var i = 0; i < upto && i < layers.length; i++) {
      var L = layers[i];
      if (L.R <= 0) continue;
      var y0 = m.y(L.z1) + offsetY, hh = Math.max(0.6, (L.z1 - L.z0) * m.sc);
      ctx.fillStyle = i % 2 ? P.a : P.b;
      if (L.r > 0) {
        ctx.fillRect(m.x(-L.R), y0, (L.R - L.r) * m.sc, hh);
        ctx.fillRect(m.x(L.r), y0, (L.R - L.r) * m.sc, hh);
      } else {
        ctx.fillRect(m.x(-L.R), y0, 2 * L.R * m.sc, hh);
      }
    }
  }

  function drawTrue(ctx, s, m, P, offsetY) {
    offsetY = offsetY || 0;
    ctx.save();
    ctx.strokeStyle = P.true; ctx.lineWidth = 1.5; ctx.setLineDash([5, 3]);
    [1, -1].forEach(function (side) {
      ctx.beginPath();
      for (var k = 0; k <= 240; k++) {
        var z = s.H * k / 240, x = m.x(side * s.R(z)), y = m.y(z) + offsetY;
        if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
      if (s.r) {
        ctx.beginPath();
        for (var j = 0; j <= 200; j++) {
          var zz = s.floor + (s.H - s.floor) * j / 200, xx = m.x(side * s.r(zz)), yy = m.y(zz) + offsetY;
          if (j) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
        }
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  function renderSide() {
    var ctx = side.ctx, W = side.width, H = side.height, P = pal(), s = SHAPES[state.shape];
    var layers = slice(state.shape, state.h);
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
    var pr = state.print;
    var m = sideMap(W, H, s, pr && state.process === 'sla' ? 40 : 30);
    var upto = pr ? pr.layer + 1 : layers.length;
    var offsetY = 0;

    if (pr && state.process === 'sla') {
      // Hull's patent Fig. 3: the resin surface stays put; the platform sinks one layer each time,
      // so the newest layer is always just under the surface where the UV spot can reach it.
      var cur = layers[Math.min(pr.layer, layers.length - 1)];
      var surfaceY = m.y(s.H) + 6;
      offsetY = surfaceY - m.y(cur.z1);
      var vatL = 12, vatR = W - 12, vatB = H - 6;
      ctx.fillStyle = P.resin; ctx.fillRect(vatL, surfaceY, vatR - vatL, vatB - surfaceY);
      ctx.strokeStyle = P.resinLine; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(vatL, surfaceY - 30); ctx.lineTo(vatL, vatB); ctx.lineTo(vatR, vatB); ctx.lineTo(vatR, surfaceY - 30); ctx.stroke();
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(vatL, surfaceY); ctx.lineTo(vatR, surfaceY); ctx.stroke();
      // platform
      ctx.fillStyle = P.bed; ctx.fillRect(m.x(-s.R(0) - 4), m.y(0) + offsetY, (2 * s.R(0) + 8) * m.sc, 5);
      ctx.fillRect(vatR - 30, Math.min(m.y(0) + offsetY, vatB - 8), 6, -(Math.min(m.y(0) + offsetY, vatB - 8) - (surfaceY - 34)));
      ctx.fillRect(m.x(s.R(0) + 4), m.y(0) + offsetY, vatR - 30 - m.x(s.R(0) + 4), 4);
      drawLayers(ctx, layers, m, P, upto, offsetY);
      // UV spot
      var sx = m.x(spotX(cur, pr.frac));
      ctx.strokeStyle = P.laser; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(W / 2, 6); ctx.lineTo(sx, surfaceY); ctx.stroke();
      ctx.fillStyle = P.laser; ctx.fillRect(W / 2 - 14, 2, 28, 10);
      ctx.beginPath(); ctx.arc(sx, surfaceY, 4, 0, Math.PI * 2); ctx.fill();
      label(ctx, 'UV light', W / 2 + 18, 12, P.ink);
      label(ctx, 'liquid resin', vatL + 6, vatB - 8, P.resinLine);
      label(ctx, 'platform sinks one layer', vatL + 6, surfaceY + 16, P.muted);
    } else {
      // grid
      ctx.strokeStyle = P.grid; ctx.lineWidth = 1;
      for (var g = 0; g <= s.H; g += 5) { ctx.beginPath(); ctx.moveTo(0, m.y(g)); ctx.lineTo(W, m.y(g)); ctx.stroke(); }
      ctx.fillStyle = P.bed; ctx.fillRect(10, m.base, W - 20, 6);
      drawLayers(ctx, layers, m, P, upto, 0);
      if (pr) {
        var L = layers[Math.min(pr.layer, layers.length - 1)];
        var nx = m.x(spotX(L, pr.frac)), ny = m.y(L.z1);
        ctx.fillStyle = P.nozzle;
        ctx.beginPath(); ctx.moveTo(nx - 7, ny - 14); ctx.lineTo(nx + 7, ny - 14); ctx.lineTo(nx, ny - 1); ctx.closePath(); ctx.fill();
        ctx.fillRect(nx - 9, ny - 30, 18, 16);
        label(ctx, 'hot nozzle rises one layer', 12, 16, P.ink);
      } else {
        label(ctx, s.label + ' · ' + layers.length.toLocaleString('en-US') + ' layers of ' + state.h + ' mm', 12, 16, P.ink);
        // zoom window marker
        var zw = zoomWindow(s);
        ctx.strokeStyle = P.ink; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
        ctx.strokeRect(m.x(zw.r0), m.y(zw.z1), (zw.r1 - zw.r0) * m.sc, (zw.z1 - zw.z0) * m.sc);
        ctx.setLineDash([]);
        label(ctx, 'magnified', m.x(zw.r1) + 4, m.y(zw.z1) + 10, P.muted);
      }
    }
    drawTrue(ctx, s, m, P, offsetY);
  }

  function label(ctx, text, x, y, color) {
    ctx.font = '600 12px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }

  // Where the spot/nozzle is across the layer, in mm from the axis (sweeps back and forth).
  function spotX(L, frac) {
    var sweep = Math.sin(frac * Math.PI * 6);
    return L.R * 0.95 * sweep;
  }

  // The magnifier looks at a 3 mm tall window on the right-hand side around zoomZ.
  function zoomWindow(s) {
    var z0 = Math.max(0, Math.min(s.H - 3, state.zoomZ - 1.5)), z1 = z0 + 3;
    var rs = [];
    for (var k = 0; k <= 20; k++) rs.push(s.R(z0 + 3 * k / 20));
    var rmid = (Math.min.apply(null, rs) + Math.max.apply(null, rs)) / 2;
    return { z0: z0, z1: z1, r0: rmid - 1.5 * 1.6, r1: rmid + 1.5 * 1.6 };
  }

  function renderZoom() {
    var ctx = zoom.ctx, W = zoom.width, H = zoom.height, P = pal(), s = SHAPES[state.shape];
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
    var zw = zoomWindow(s);
    var sc = Math.min(W / (zw.r1 - zw.r0), H / (zw.z1 - zw.z0));
    var X = function (r) { return (r - zw.r0) * sc + (W - (zw.r1 - zw.r0) * sc) / 2; };
    var Y = function (z) { return H - (z - zw.z0) * sc; };
    slice(state.shape, state.h).forEach(function (L, i) {
      if (L.z1 < zw.z0 || L.z0 > zw.z1 || L.R <= 0) return;
      ctx.fillStyle = i % 2 ? P.a : P.b;
      var left = L.r > 0 ? L.r : zw.r0 - 1;
      ctx.fillRect(X(left), Y(L.z1), X(L.R) - X(left), Math.max(1, (L.z1 - L.z0) * sc));
    });
    ctx.strokeStyle = P.true; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.beginPath();
    for (var k = 0; k <= 80; k++) { var z = zw.z0 + (zw.z1 - zw.z0) * k / 80, x = X(s.R(z)), y = Y(z); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke(); ctx.setLineDash([]);
    // 1 mm scale bar
    ctx.fillStyle = P.ink; ctx.fillRect(8, H - 12, sc, 3);
    label(ctx, '1 mm', 8, H - 16, P.ink);
    label(ctx, 'Magnified side (×' + Math.round(sc / sideMap(side.width, side.height, s, 30).sc) + ')', 8, 14, P.ink);
  }

  function renderTop() {
    var ctx = top.ctx, W = top.width, H = top.height, P = pal(), s = SHAPES[state.shape];
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
    var layers = slice(state.shape, state.h);
    var idx = state.print ? Math.min(state.print.layer, layers.length - 1) : Math.min(layers.length - 1, Math.floor(layers.length * (state.zoomZ / s.H)));
    var L = layers[idx];
    var maxR = 0;
    for (var z = 0; z <= s.H; z += s.H / 60) maxR = Math.max(maxR, s.R(z));
    var sc = (Math.min(W, H) / 2 - 14) / maxR, cx = W / 2, cy = H / 2 + 6;
    label(ctx, 'Layer ' + (idx + 1).toLocaleString('en-US') + ' from above', 8, 14, P.ink);
    if (L.R <= 0) return;
    ctx.fillStyle = P.b;
    ctx.beginPath(); ctx.arc(cx, cy, L.R * sc, 0, Math.PI * 2);
    if (L.r > 0) ctx.arc(cx, cy, L.r * sc, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    // the path the spot or nozzle takes, drawn up to the current progress
    var frac = state.print ? state.print.frac : 1;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, L.R * sc, 0, Math.PI * 2); if (L.r > 0) ctx.arc(cx, cy, L.r * sc, 0, Math.PI * 2, true); ctx.clip('evenodd');
    ctx.strokeStyle = state.process === 'sla' ? P.laser : P.nozzle; ctx.lineWidth = 1.3;
    var spacing = 5, lines = Math.ceil(2 * L.R * sc / spacing), shown = Math.floor(lines * frac);
    var ang = state.process === 'fdm' ? (idx % 2 ? Math.PI / 4 : -Math.PI / 4) : 0;
    ctx.translate(cx, cy); ctx.rotate(ang);
    for (var i = 0; i < shown; i++) {
      var yy = -L.R * sc + i * spacing;
      ctx.beginPath(); ctx.moveTo(-L.R * sc, yy); ctx.lineTo(L.R * sc, yy); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = state.process === 'sla' ? P.laser : P.nozzle; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, L.R * sc, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, frac * 1.5)); ctx.stroke();
  }

  function updateReadout() {
    var layers = slice(state.shape, state.h);
    var t = relativeTime(state.shape, state.h, state.process), t02 = relativeTime(state.shape, 0.2, state.process);
    var rough = roughness(state.shape, state.h);
    heightOut.textContent = state.h + ' mm';
    readout.textContent = layers.length.toLocaleString('en-US') + ' layers. Roughest step on the side: about ' + fmt(rough, rough < 0.1 ? 3 : 2) +
      ' mm. Print time compared with 0.2 mm layers: ×' + fmt(t / t02, 2) + ' (' + (state.process === 'sla' ? 'SLA resin' : 'FDM filament') + ' model).';
    // bars: one per layer height, longest = 100%
    var all = HEIGHTS.map(function (h) { return relativeTime(state.shape, h, state.process); });
    var mx = Math.max.apply(null, all);
    bars.innerHTML = '';
    HEIGHTS.forEach(function (h, i) {
      var li = document.createElement('li');
      if (h === state.h) li.setAttribute('aria-current', 'true');
      var lab = document.createElement('span'); lab.className = 'ch-bar-label'; lab.textContent = h + ' mm';
      var track = document.createElement('span'); track.className = 'ch-bar-track';
      var fill = document.createElement('span'); fill.className = 'ch-bar-fill'; fill.style.width = (100 * all[i] / mx).toFixed(1) + '%';
      track.appendChild(fill);
      var val = document.createElement('span'); val.className = 'ch-bar-value'; val.textContent = '×' + fmt(all[i] / t02, 1);
      li.appendChild(lab); li.appendChild(track); li.appendChild(val);
      bars.appendChild(li);
    });
  }

  heightInput.addEventListener('input', function () { state.h = HEIGHTS[+heightInput.value] || 0.2; state.print = null; updateReadout(); dirty = true; });
  Array.prototype.forEach.call(shapeInputs, function (el) {
    el.addEventListener('change', function () {
      state.shape = radioValue(shapeInputs);
      state.zoomZ = SHAPES[state.shape].H * 0.82; state.print = null; updateReadout(); dirty = true;
    });
  });
  Array.prototype.forEach.call(procInputs, function (el) {
    el.addEventListener('change', function () { state.process = radioValue(procInputs); updateReadout(); dirty = true; });
  });
  printBtn.addEventListener('click', function () {
    if (state.print) { state.print = null; printBtn.textContent = 'Print it'; dirty = true; return; }
    state.print = { layer: 0, frac: 0, t: 0 };
    printBtn.textContent = 'Stop';
    if (reduced) { state.print.layer = slice(state.shape, state.h).length - 1; state.print.frac = 1; }
  });
  resetBtn.addEventListener('click', function () {
    state.print = null; printBtn.textContent = 'Print it';
    state.shape = 'dome'; state.h = 0.2; state.zoomZ = 17;
    heightInput.value = String(HEIGHTS.indexOf(0.2));
    Array.prototype.forEach.call(shapeInputs, function (el) { el.checked = el.value === 'dome'; });
    updateReadout(); dirty = true;
  });

  // Press or drag on the side view to move the magnifier (and the "from above" slice) up and down.
  function setZoomFrom(e) {
    var r = sideCanvas.getBoundingClientRect(), s = SHAPES[state.shape];
    var m = sideMap(side.width, side.height, s, 30);
    var z = (m.base - (e.clientY - r.top)) / m.sc;
    state.zoomZ = Math.max(1.5, Math.min(s.H - 0.5, z));
    dirty = true;
  }
  var dragging = false;
  sideCanvas.addEventListener('pointerdown', function (e) { if (state.print) return; dragging = true; sideCanvas.setPointerCapture(e.pointerId); setZoomFrom(e); });
  sideCanvas.addEventListener('pointermove', function (e) { if (dragging) setZoomFrom(e); });
  sideCanvas.addEventListener('pointerup', function () { dragging = false; });
  sideCanvas.addEventListener('pointercancel', function () { dragging = false; });
  sideCanvas.addEventListener('keydown', function (e) {
    var s = SHAPES[state.shape];
    if (e.key === 'ArrowUp') state.zoomZ = Math.min(s.H - 0.5, state.zoomZ + 0.5);
    else if (e.key === 'ArrowDown') state.zoomZ = Math.max(1.5, state.zoomZ - 0.5);
    else return;
    e.preventDefault(); dirty = true;
  });

  updateReadout();

  SimKit.loop(function (dt) {
    dt = Math.min(dt, 0.1);
    var pr = state.print;
    if (pr && pr.frac < 1 || pr && pr.layer < slice(state.shape, state.h).length - 1) {
      var n = slice(state.shape, state.h).length;
      // whole print shown in about 10 s whatever the layer count: the animation is not real time
      var perLayer = 10 / n;
      pr.frac += dt / perLayer;
      while (pr.frac >= 1 && pr.layer < n - 1) { pr.frac -= 1; pr.layer++; }
      if (pr.layer >= n - 1 && pr.frac >= 1) { pr.frac = 1; printBtn.textContent = 'Print it'; }
      readout.textContent = (state.process === 'sla' ? 'UV light is drawing' : 'Nozzle is laying') + ' layer ' + (pr.layer + 1).toLocaleString('en-US') + ' of ' + n.toLocaleString('en-US') +
        '. (Sped up: a real print at this layer height takes hours.)';
      dirty = true;
      if (pr.layer >= n - 1 && pr.frac >= 1) { state.print = null; updateReadout(); }
    }
    if (!dirty) return;
    renderSide(); renderZoom(); renderTop();
    dirty = false;
  }, { el: SimKit.stage(sideCanvas, zoomCanvas, topCanvas) });
})();
