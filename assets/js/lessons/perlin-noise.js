/* Perlin Noise lesson — lessons/computer-science/graphics-and-games/perlin-noise.html
   Every demo draws from one seeded noise engine so "same seed, same world" holds. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Seeded PRNG ── */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function fadeQuintic(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function fadeCubic(t) { return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + t * (b - a); }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* ── Improved Perlin noise (Perlin 2002), seeded permutation ── */
  function createNoise(seed) {
    var rand = mulberry32(seed);
    var p = new Uint8Array(256);
    var perm = new Uint8Array(512);
    var i;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    for (i = 0; i < 512; i++) perm[i] = p[i & 255];

    function grad(hash, x, y, z) {
      var h = hash & 15;
      var u = h < 8 ? x : y;
      var v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
      return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
    }

    function noise3(x, y, z) {
      var fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z);
      var X = fx & 255, Y = fy & 255, Z = fz & 255;
      x -= fx; y -= fy; z -= fz;
      var u = fadeQuintic(x), v = fadeQuintic(y), w = fadeQuintic(z);
      var A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z;
      var B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
      return lerp(
        lerp(lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
             lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
        lerp(lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
             lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v),
        w);
    }

    // Normalized fBm: roughly -1..1 regardless of octave count.
    function fbm(x, y, z, octaves, persistence, lacunarity) {
      var sum = 0, amp = 1, freq = 1, norm = 0;
      for (var o = 0; o < octaves; o++) {
        sum += amp * noise3(x * freq, y * freq, z * freq + o * 17.3);
        norm += amp;
        amp *= persistence;
        freq *= lacunarity;
      }
      return sum / norm;
    }

    return { noise3: noise3, fbm: fbm, rand: rand };
  }

  function themeColors() {
    return window.SimKit ? SimKit.theme.colors() : { text: '#1d1d1f', textMuted: '#6e6e73' };
  }

  function onVisible(el, start) {
    if (!('IntersectionObserver' in window)) { start(true); return; }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { start(e.isIntersecting); });
    }, { rootMargin: '120px' }).observe(el);
  }

  function relPoint(canvas, evt) {
    var r = canvas.getBoundingClientRect();
    return { x: evt.clientX - r.left, y: evt.clientY - r.top };
  }

  /* ── Terrain palette (interpolated stops) ── */
  var TERRAIN = [
    [-1.00, [12, 42, 96]],
    [-0.25, [26, 86, 170]],
    [-0.04, [64, 150, 215]],
    [0.00, [226, 212, 156]],
    [0.05, [118, 176, 72]],
    [0.28, [52, 122, 48]],
    [0.46, [110, 98, 78]],
    [0.62, [150, 142, 134]],
    [0.74, [244, 246, 252]],
    [1.00, [255, 255, 255]]
  ];
  function ramp(stops, v, out) {
    if (v <= stops[0][0]) { var c0 = stops[0][1]; out[0] = c0[0]; out[1] = c0[1]; out[2] = c0[2]; return out; }
    for (var i = 1; i < stops.length; i++) {
      if (v <= stops[i][0]) {
        var a = stops[i - 1], b = stops[i];
        var t = (v - a[0]) / (b[0] - a[0]);
        out[0] = a[1][0] + (b[1][0] - a[1][0]) * t;
        out[1] = a[1][1] + (b[1][1] - a[1][1]) * t;
        out[2] = a[1][2] + (b[1][2] - a[1][2]) * t;
        return out;
      }
    }
    var cl = stops[stops.length - 1][1]; out[0] = cl[0]; out[1] = cl[1]; out[2] = cl[2];
    return out;
  }
  var FIRE = [[0, [0, 0, 0]], [0.25, [90, 8, 4]], [0.5, [220, 60, 10]], [0.72, [255, 160, 30]], [0.9, [255, 235, 120]], [1, [255, 255, 230]]];
  var CLOUD = [[0, [58, 118, 196]], [0.45, [110, 170, 230]], [0.7, [220, 232, 245]], [1, [255, 255, 255]]];
  var MARBLE = [[0, [40, 44, 52]], [0.35, [150, 150, 158]], [0.6, [228, 226, 222]], [1, [250, 249, 246]]];
  var WOOD = [[0, [110, 62, 28]], [0.5, [168, 108, 58]], [1, [206, 152, 94]]];

  /* Shared shading: every style maps (height, x, y, z) to rgb. */
  function styleColor(mode, h, n, x, y, z, warpVal, out) {
    var v;
    switch (mode) {
      case 'gray':
        v = clamp01((h + 1) * 0.5) * 255;
        out[0] = out[1] = out[2] = v; return out;
      case 'clouds':
        return ramp(CLOUD, clamp01(h * 1.3 + 0.45), out);
      case 'marble':
        v = 0.5 + 0.5 * Math.sin(x * 3.2 + h * 9);
        return ramp(MARBLE, Math.pow(v, 0.6), out);
      case 'wood':
        var cx = x - 2, cy = y - 1.5;
        var rings = Math.sqrt(cx * cx + cy * cy) * 7 + h * 3.5;
        v = rings - Math.floor(rings);
        return ramp(WOOD, Math.pow(v, 2.4), out);
      case 'fire':
        return ramp(FIRE, clamp01(y * 0.55 - 0.15 + h * 0.9), out);
      case 'warp':
        return ramp([[0, [18, 12, 48]], [0.35, [120, 40, 140]], [0.6, [240, 120, 90]], [0.85, [255, 214, 140]], [1, [255, 250, 230]]], clamp01((h + 1) * 0.5 + warpVal * 0.2), out);
      default:
        return ramp(TERRAIN, h, out);
    }
  }

  /* ════════════════ Hero banner ════════════════ */
  (function hero() {
    var canvas = document.getElementById('pn-hero');
    if (!canvas || !window.SimKit) return;
    var N = createNoise(1983);
    var off = document.createElement('canvas');
    var octx = off.getContext('2d');
    var img = null, W = 0, H = 0;
    var view = SimKit.canvas2d(canvas, { height: canvas.clientHeight || 170, dpr: false });
    var t = 0, rgb = [0, 0, 0];
    function render() {
      var cw = view.width, ch = view.height;
      var w = Math.max(40, Math.round(cw / 3)), h = Math.max(20, Math.round(ch / 3));
      if (w !== W || h !== H) { W = off.width = w; H = off.height = h; img = octx.createImageData(w, h); }
      var d = img.data, k = 0;
      for (var py = 0; py < H; py++) {
        for (var px = 0; px < W; px++) {
          var x = px * 0.035 + t, y = py * 0.035;
          var e = N.fbm(x, y, 0.5, 5, 0.5, 2) * 1.5 + 0.08;
          ramp(TERRAIN, e, rgb);
          d[k] = rgb[0]; d[k + 1] = rgb[1]; d[k + 2] = rgb[2]; d[k + 3] = 255; k += 4;
        }
      }
      octx.putImageData(img, 0, 0);
      view.ctx.imageSmoothingEnabled = true;
      view.ctx.drawImage(off, 0, 0, cw, ch);
    }
    render();
    if (reduceMotion) return;
    var loop = null;
    onVisible(canvas, function (vis) {
      if (vis && !loop) loop = SimKit.loop(function (dt) { t += dt * 0.12; render(); });
      else if (!vis && loop) { loop.stop(); loop = null; }
    });
  })();

  /* ════════════════ Part 1: comparison ════════════════ */
  (function compare() {
    var canvas = document.getElementById('pn-compare');
    if (!canvas || !window.SimKit) return;
    var view = SimKit.canvas2d(canvas, { height: 300, onResize: function () { draw(); } });
    var white = [], vals = [], slopes = [];
    var CELLS = 12, SAMPLES = 240;
    function roll() {
      var r = mulberry32((Math.random() * 1e9) | 0);
      white = []; vals = []; slopes = [];
      for (var i = 0; i < SAMPLES; i++) white.push(r() * 2 - 1);
      for (i = 0; i <= CELLS + 1; i++) { vals.push(r() * 2 - 1); slopes.push(r() * 2 - 1); }
    }
    function valueNoise(x) {
      var i = Math.floor(x), t = x - i;
      return lerp(vals[i], vals[i + 1], fadeQuintic(t));
    }
    function perlin1(x) {
      var i = Math.floor(x), t = x - i;
      return lerp(slopes[i] * t, slopes[i + 1] * (t - 1), fadeQuintic(t)) * 2;
    }
    function draw() {
      if (!view || !white.length) return;
      var ctx = view.ctx, W = view.width, H = view.height, th = themeColors();
      ctx.clearRect(0, 0, W, H);
      var rows = [
        { label: 'White noise', color: '#ff453a', f: function (s) { return white[Math.min(SAMPLES - 1, Math.floor(s * SAMPLES))]; } },
        { label: 'Value noise', color: '#ff9f0a', f: function (s) { return valueNoise(s * CELLS); } },
        { label: 'Perlin noise', color: '#30d158', f: function (s) { return perlin1(s * CELLS); } }
      ];
      var rowH = H / 3, pad = 12;
      ctx.font = '600 12px Inter, system-ui, sans-serif';
      rows.forEach(function (row, ri) {
        var top = ri * rowH, mid = top + rowH / 2, amp = rowH / 2 - pad - 6;
        // lattice lines
        ctx.strokeStyle = 'rgba(128,128,128,0.18)'; ctx.lineWidth = 1;
        if (ri > 0) {
          for (var c = 0; c <= CELLS; c++) {
            var gx = c / CELLS * W;
            ctx.beginPath(); ctx.moveTo(gx, top + 6); ctx.lineTo(gx, top + rowH - 6); ctx.stroke();
          }
        }
        ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();
        // filled ground
        ctx.beginPath(); ctx.moveTo(0, top + rowH);
        for (var px = 0; px <= W; px += 1) {
          ctx.lineTo(px, mid - row.f(px / W * 0.99999) * amp);
        }
        ctx.lineTo(W, top + rowH); ctx.closePath();
        ctx.fillStyle = row.color + '22'; ctx.fill();
        ctx.beginPath();
        for (px = 0; px <= W; px += 1) {
          var yy = mid - row.f(px / W * 0.99999) * amp;
          if (px === 0) ctx.moveTo(px, yy); else ctx.lineTo(px, yy);
        }
        ctx.strokeStyle = row.color; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = th.text; ctx.fillText(row.label, 10, top + 16);
      });
    }
    roll(); draw();
    document.getElementById('pn-compare-roll').addEventListener('click', function () { roll(); draw(); });
    SimKit.theme.onChange(draw);
  })();

  /* ════════════════ Part 2: 1D builder ════════════════ */
  (function oneD() {
    var canvas = document.getElementById('pn-1d-canvas');
    if (!canvas || !window.SimKit) return;
    var CELLS = 8;
    var slopes = [];
    var fadeMode = 'quintic';
    var showLines = true;
    var probe = 2.35;
    var dragIdx = -1;
    var view = SimKit.canvas2d(canvas, { height: 280, onResize: function () { draw(); } });
    var fades = { linear: function (t) { return t; }, cubic: fadeCubic, quintic: fadeQuintic };

    function randomize() {
      var r = mulberry32((Math.random() * 1e9) | 0);
      slopes = [];
      for (var i = 0; i <= CELLS; i++) slopes.push(Math.round((r() * 2 - 1) * 20) / 10);
    }
    function parts(x) {
      var i = Math.min(CELLS - 1, Math.max(0, Math.floor(x)));
      var t = x - i;
      var a = slopes[i] * t, b = slopes[i + 1] * (t - 1), f = fades[fadeMode](t);
      return { i: i, t: t, a: a, b: b, f: f, n: lerp(a, b, f) };
    }
    function geom() {
      var W = view.width, H = view.height, padX = 26;
      return { W: W, H: H, x0: padX, sx: (W - padX * 2) / CELLS, mid: H / 2, sy: H * 0.34 };
    }
    function draw() {
      if (!view || !slopes.length) return;
      var ctx = view.ctx, g = geom(), th = themeColors();
      ctx.clearRect(0, 0, g.W, g.H);
      ctx.font = '600 11px Inter, system-ui, sans-serif';
      // grid
      ctx.strokeStyle = 'rgba(128,128,128,0.25)'; ctx.lineWidth = 1;
      for (var i = 0; i <= CELLS; i++) {
        var gx = g.x0 + i * g.sx;
        ctx.beginPath(); ctx.moveTo(gx, 8); ctx.lineTo(gx, g.H - 18); ctx.stroke();
        ctx.fillStyle = th.textMuted; ctx.textAlign = 'center'; ctx.fillText(String(i), gx, g.H - 5);
      }
      ctx.beginPath(); ctx.moveTo(g.x0, g.mid); ctx.lineTo(g.W - g.x0, g.mid); ctx.stroke();

      // slope contribution lines for the probed cell
      var pp = parts(probe);
      if (showLines) {
        var lx = g.x0 + pp.i * g.sx;
        ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#0a84ff';
        ctx.beginPath(); ctx.moveTo(lx, g.mid); ctx.lineTo(lx + g.sx, g.mid - slopes[pp.i] * g.sy); ctx.stroke();
        ctx.strokeStyle = '#ff9f0a';
        ctx.beginPath(); ctx.moveTo(lx, g.mid + slopes[pp.i + 1] * g.sy); ctx.lineTo(lx + g.sx, g.mid); ctx.stroke();
        ctx.setLineDash([]);
      }

      // noise curve
      ctx.beginPath();
      var steps = Math.max(200, Math.round(g.W));
      for (var s = 0; s <= steps; s++) {
        var x = s / steps * CELLS * 0.99999;
        var y = g.mid - parts(x).n * g.sy;
        var px = g.x0 + x * g.sx;
        if (s === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
      }
      ctx.strokeStyle = '#30d158'; ctx.lineWidth = 3; ctx.stroke();

      // gradient handles
      for (i = 0; i <= CELLS; i++) {
        var hx = g.x0 + i * g.sx, len = g.sx * 0.32;
        var dx = len / Math.sqrt(1 + slopes[i] * slopes[i] * (g.sy / g.sx) * (g.sy / g.sx));
        var dy = slopes[i] * dx * (g.sy / g.sx);
        ctx.strokeStyle = '#5856d6'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(hx - dx, g.mid + dy); ctx.lineTo(hx + dx, g.mid - dy); ctx.stroke();
        ctx.fillStyle = '#5856d6';
        ctx.beginPath(); ctx.arc(hx + dx, g.mid - dy, i === dragIdx ? 8 : 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hx, g.mid, 3.5, 0, Math.PI * 2); ctx.fill();
      }

      // probe
      var prx = g.x0 + probe * g.sx, pry = g.mid - pp.n * g.sy;
      ctx.strokeStyle = th.text; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(prx, 8); ctx.lineTo(prx, g.H - 18); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#30d158'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(prx, pry, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'left';
      if (showLines) {
        ctx.fillStyle = '#0a84ff'; ctx.fillText('left slope line', 8, 18);
        ctx.fillStyle = '#ff9f0a'; ctx.fillText('right slope line', 110, 18);
      }

      set('pn-1d-x', probe.toFixed(2));
      set('pn-1d-t', pp.t.toFixed(2));
      set('pn-1d-f', pp.f.toFixed(3));
      set('pn-1d-a', pp.a.toFixed(3));
      set('pn-1d-b', pp.b.toFixed(3));
      set('pn-1d-n', pp.n.toFixed(3));
    }
    function set(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }

    function handleAt(pt) {
      var g = geom();
      for (var i = 0; i <= CELLS; i++) {
        var hx = g.x0 + i * g.sx, len = g.sx * 0.32;
        var dx = len / Math.sqrt(1 + slopes[i] * slopes[i] * (g.sy / g.sx) * (g.sy / g.sx));
        var dy = slopes[i] * dx * (g.sy / g.sx);
        var ex = hx + dx, ey = g.mid - dy;
        if ((pt.x - ex) * (pt.x - ex) + (pt.y - ey) * (pt.y - ey) < 196) return i;
        if (Math.abs(pt.x - hx) < 10 && Math.abs(pt.y - g.mid) < 10) return i;
      }
      return -1;
    }
    function setProbe(pt) {
      var g = geom();
      probe = Math.min(CELLS - 0.001, Math.max(0, (pt.x - g.x0) / g.sx));
    }
    function setSlope(pt) {
      var g = geom();
      var hx = g.x0 + dragIdx * g.sx;
      var dx = Math.max(12, pt.x - hx);
      var s = ((g.mid - pt.y) / g.sy) / (dx / g.sx);
      slopes[dragIdx] = Math.max(-3, Math.min(3, Math.round(s * 10) / 10));
    }
    canvas.addEventListener('pointerdown', function (e) {
      var pt = relPoint(canvas, e);
      dragIdx = handleAt(pt);
      canvas.setPointerCapture(e.pointerId);
      if (dragIdx < 0) setProbe(pt); else setSlope(pt);
      draw();
    });
    canvas.addEventListener('pointermove', function (e) {
      var pt = relPoint(canvas, e);
      if (dragIdx >= 0) setSlope(pt);
      else if (e.pointerType === 'mouse' || e.buttons) setProbe(pt);
      canvas.style.cursor = dragIdx >= 0 || handleAt(pt) >= 0 ? 'ns-resize' : 'crosshair';
      draw();
    });
    canvas.addEventListener('pointerup', function () { dragIdx = -1; draw(); });
    canvas.addEventListener('pointercancel', function () { dragIdx = -1; });

    document.querySelectorAll('[data-fade]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        fadeMode = btn.getAttribute('data-fade');
        document.querySelectorAll('[data-fade]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        draw();
      });
    });
    document.getElementById('pn-1d-random').addEventListener('click', function () { randomize(); draw(); });
    document.getElementById('pn-1d-flat').addEventListener('click', function () {
      for (var i = 0; i <= CELLS; i++) slopes[i] = 0;
      draw();
    });
    document.getElementById('pn-1d-lines').addEventListener('change', function () { showLines = this.checked; draw(); });

    slopes = [0.8, -1.2, 1.5, -0.6, -1.4, 1.1, 0.3, -1.6, 0.9];
    draw();
    SimKit.theme.onChange(draw);
  })();

  /* ════════════════ Part 3: 2D gradient grid ════════════════ */
  (function twoD() {
    var canvas = document.getElementById('pn-2d-canvas');
    if (!canvas || !window.SimKit) return;
    var COLS = 7, ROWS = 3;
    var grads = [];
    var probe = { x: 2.4, y: 1.35 };
    var showArrows = true, showGrid = true;
    var base = document.createElement('canvas');
    var view = SimKit.canvas2d(canvas, { height: 340, onResize: function () { bake(); draw(); } });

    function randomize() {
      var r = mulberry32((Math.random() * 1e9) | 0);
      grads = [];
      for (var j = 0; j <= ROWS; j++) {
        var row = [];
        for (var i = 0; i <= COLS; i++) { var a = r() * Math.PI * 2; row.push([Math.cos(a), Math.sin(a)]); }
        grads.push(row);
      }
    }
    function corners(x, y) {
      var i = Math.min(COLS - 1, Math.floor(x)), j = Math.min(ROWS - 1, Math.floor(y));
      var tx = x - i, ty = y - j;
      function dot(ci, cj, ox, oy) { var gv = grads[cj][ci]; return gv[0] * ox + gv[1] * oy; }
      var tl = dot(i, j, tx, ty), tr = dot(i + 1, j, tx - 1, ty);
      var bl = dot(i, j + 1, tx, ty - 1), br = dot(i + 1, j + 1, tx - 1, ty - 1);
      var u = fadeQuintic(tx), v = fadeQuintic(ty);
      return { i: i, j: j, tl: tl, tr: tr, bl: bl, br: br, n: lerp(lerp(tl, tr, u), lerp(bl, br, u), v) };
    }
    function geom() {
      var W = view.width, H = view.height;
      var cell = Math.min((W - 60) / COLS, (H - 50) / ROWS);
      return { W: W, H: H, cell: cell, ox: (W - cell * COLS) / 2, oy: (H - cell * ROWS) / 2 };
    }
    function bake() {
      if (!grads.length) return;
      var g = geom();
      var w = Math.max(1, Math.round(g.cell * COLS / 2)), h = Math.max(1, Math.round(g.cell * ROWS / 2));
      base.width = w; base.height = h;
      var bctx = base.getContext('2d'), img = bctx.createImageData(w, h), d = img.data, k = 0;
      for (var py = 0; py < h; py++) {
        for (var px = 0; px < w; px++) {
          var n = corners((px + 0.5) / w * COLS, (py + 0.5) / h * ROWS).n;
          var v = clamp01(0.5 + n * 0.9) * 255;
          d[k] = v * 0.86 + 20; d[k + 1] = v * 0.9 + 16; d[k + 2] = v + 0; d[k + 3] = 255; k += 4;
        }
      }
      bctx.putImageData(img, 0, 0);
    }
    function arrow(ctx, x, y, dx, dy, color, width) {
      var ex = x + dx, ey = y + dy, a = Math.atan2(dy, dx), hl = 8;
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex, ey);
      ctx.lineTo(ex - hl * Math.cos(a - 0.45), ey - hl * Math.sin(a - 0.45));
      ctx.lineTo(ex - hl * Math.cos(a + 0.45), ey - hl * Math.sin(a + 0.45));
      ctx.closePath(); ctx.fill();
    }
    function fmt(v) { return (v >= 0 ? '+' : '') + v.toFixed(2); }
    function draw() {
      if (!view || !grads.length) return;
      var ctx = view.ctx, g = geom();
      ctx.clearRect(0, 0, g.W, g.H);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(base, g.ox, g.oy, g.cell * COLS, g.cell * ROWS);
      var i, j;
      if (showGrid) {
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1;
        for (i = 0; i <= COLS; i++) { ctx.beginPath(); ctx.moveTo(g.ox + i * g.cell, g.oy); ctx.lineTo(g.ox + i * g.cell, g.oy + ROWS * g.cell); ctx.stroke(); }
        for (j = 0; j <= ROWS; j++) { ctx.beginPath(); ctx.moveTo(g.ox, g.oy + j * g.cell); ctx.lineTo(g.ox + COLS * g.cell, g.oy + j * g.cell); ctx.stroke(); }
      }
      var c = corners(probe.x, probe.y);
      if (showArrows) {
        for (j = 0; j <= ROWS; j++) for (i = 0; i <= COLS; i++) {
          var gv = grads[j][i];
          arrow(ctx, g.ox + i * g.cell, g.oy + j * g.cell, gv[0] * g.cell * 0.36, gv[1] * g.cell * 0.36, 'rgba(88,86,214,0.95)', 2.5);
        }
      }
      // highlight probe cell
      var px = g.ox + probe.x * g.cell, py = g.oy + probe.y * g.cell;
      var cs = [[c.i, c.j, c.tl], [c.i + 1, c.j, c.tr], [c.i, c.j + 1, c.bl], [c.i + 1, c.j + 1, c.br]];
      ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 2.5;
      ctx.strokeRect(g.ox + c.i * g.cell, g.oy + c.j * g.cell, g.cell, g.cell);
      ctx.setLineDash([4, 3]);
      cs.forEach(function (k) {
        ctx.strokeStyle = 'rgba(255,214,10,0.95)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(g.ox + k[0] * g.cell, g.oy + k[1] * g.cell); ctx.lineTo(px, py); ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.font = '700 12px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
      cs.forEach(function (k, idx) {
        // Labels sit just outside their corner so they never cover the probe cell.
        var cx = g.ox + k[0] * g.cell + (idx % 2 ? 26 : -26);
        var cy = g.oy + k[1] * g.cell + (idx < 2 ? -8 : 18);
        cx = Math.max(24, Math.min(g.W - 24, cx));
        cy = Math.max(14, Math.min(g.H - 6, cy));
        var label = fmt(k[2]);
        var w = ctx.measureText(label).width + 10;
        ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(cx - w / 2, cy - 12, w, 17);
        ctx.fillStyle = k[2] >= 0 ? '#5ee07e' : '#ff6961'; ctx.fillText(label, cx, cy + 1);
      });
      ctx.fillStyle = '#ffd60a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'left';
      set('pn-2d-tl', fmt(c.tl)); set('pn-2d-tr', fmt(c.tr));
      set('pn-2d-bl', fmt(c.bl)); set('pn-2d-br', fmt(c.br)); set('pn-2d-n', fmt(c.n));
    }
    function set(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
    function move(e) {
      var g = geom(), pt = relPoint(canvas, e);
      probe.x = Math.min(COLS - 0.001, Math.max(0, (pt.x - g.ox) / g.cell));
      probe.y = Math.min(ROWS - 0.001, Math.max(0, (pt.y - g.oy) / g.cell));
      draw();
    }
    canvas.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' || e.buttons) move(e); });
    canvas.addEventListener('pointerdown', function (e) { canvas.setPointerCapture(e.pointerId); move(e); });
    canvas.style.cursor = 'crosshair';
    document.getElementById('pn-2d-random').addEventListener('click', function () { randomize(); bake(); draw(); });
    document.getElementById('pn-2d-arrows').addEventListener('change', function () { showArrows = this.checked; draw(); });
    document.getElementById('pn-2d-grid').addEventListener('change', function () { showGrid = this.checked; draw(); });
    grads = [];
    var r0 = mulberry32(1985);
    for (var j0 = 0; j0 <= ROWS; j0++) { var row0 = []; for (var i0 = 0; i0 <= COLS; i0++) { var a0 = r0() * Math.PI * 2; row0.push([Math.cos(a0), Math.sin(a0)]); } grads.push(row0); }
    bake(); draw();
  })();

  /* ════════════════ Part 4: octave stack ════════════════ */
  (function octaves() {
    var canvas = document.getElementById('pn-oct-canvas');
    if (!canvas || !window.SimKit) return;
    var N = createNoise(7);
    var state = { n: 4, p: 0.5, l: 2 };
    var COLORS = ['#0a84ff', '#5856d6', '#bf5af2', '#ff375f', '#ff9f0a', '#ffd60a'];
    var view = SimKit.canvas2d(canvas, { height: 380, onResize: function () { draw(); } });
    function draw() {
      if (!view) return;
      var ctx = view.ctx, W = view.width, H = view.height, th = themeColors();
      ctx.clearRect(0, 0, W, H);
      var sumH = H * 0.34, laneH = (H - sumH - 16) / state.n;
      var span = 5;
      ctx.font = '600 11px Inter, system-ui, sans-serif';
      var sums = new Float32Array(Math.ceil(W) + 1), maxAmp = 0;
      for (var o = 0; o < state.n; o++) {
        var amp = Math.pow(state.p, o), freq = Math.pow(state.l, o);
        maxAmp += amp;
        var mid = o * laneH + laneH / 2, scale = laneH * 0.9;
        ctx.strokeStyle = 'rgba(128,128,128,0.2)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();
        ctx.beginPath();
        for (var px = 0; px <= W; px++) {
          var v = N.noise3(px / W * span * freq, 0.37 + o * 3.1, 0.5) * amp;
          sums[px] += v;
          var y = mid - v * scale;
          if (px === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
        }
        ctx.strokeStyle = COLORS[o]; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = th.text;
        ctx.fillText('octave ' + (o + 1) + '  ·  freq ×' + freq.toFixed(freq % 1 ? 2 : 0) + '  ·  amp ' + amp.toFixed(3), 8, o * laneH + 13);
      }
      // sum as landscape
      var top = H - sumH, base = H - 6, mid2 = top + sumH * 0.55, sc = sumH * 0.62 / Math.max(0.5, maxAmp * 0.6);
      var grd = ctx.createLinearGradient(0, top, 0, base);
      grd.addColorStop(0, '#9ccc65'); grd.addColorStop(1, '#2e7d32');
      ctx.beginPath(); ctx.moveTo(0, base);
      for (px = 0; px <= W; px++) ctx.lineTo(px, Math.max(top + 4, mid2 - sums[px] * sc));
      ctx.lineTo(W, base); ctx.closePath();
      ctx.fillStyle = grd; ctx.fill();
      ctx.strokeStyle = '#1b5e20'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = th.text; ctx.fillText('SUM of all ' + state.n + ' octave' + (state.n > 1 ? 's' : ''), 8, top + 4);
    }
    function bind(id, key, digits) {
      var input = document.getElementById(id), out = document.getElementById(id + '-v');
      input.addEventListener('input', function () {
        state[key] = parseFloat(input.value);
        out.textContent = state[key].toFixed(digits);
        draw();
      });
    }
    bind('pn-oct-n', 'n', 0); bind('pn-oct-p', 'p', 2); bind('pn-oct-l', 'l', 1);
    draw();
    SimKit.theme.onChange(draw);
  })();

  /* ════════════════ Part 5: World Builder ════════════════ */
  (function worldBuilder() {
    var canvas = document.getElementById('pn-canvas');
    if (!canvas || !window.SimKit) return;
    var DEFAULTS = { mode: 'terrain', seed: 1983, zoom: 1, octaves: 5, persistence: 0.5, sea: 0, speed: 0.3, island: false, shade: true, warp: false };
    var s = {};
    var N = null;
    var time = 0, panX = 0, panY = 0;
    var off = document.createElement('canvas'), octx = off.getContext('2d');
    var img = null, W = 0, H = 0, heights = null;
    var dirty = true;
    var view = SimKit.canvas2d(canvas, { height: 340, dpr: false, onResize: function () { dirty = true; } });
    var rgb = [0, 0, 0];
    var MODE_NAMES = { terrain: 'Terrain', gray: 'Grayscale', clouds: 'Clouds', fire: 'Fire', marble: 'Marble', wood: 'Wood' };

    function $(id) { return document.getElementById(id); }

    function apply(settings) {
      s = Object.assign({}, settings);
      N = createNoise(s.seed);
      $('pn-seed').value = s.seed;
      $('pn-scale').value = s.zoom; $('pn-scale-val').textContent = s.zoom.toFixed(1) + '×';
      $('pn-oct').value = s.octaves; $('pn-oct-val').textContent = s.octaves;
      $('pn-pers').value = s.persistence; $('pn-pers-val').textContent = s.persistence.toFixed(2);
      $('pn-sea').value = s.sea; $('pn-sea-val').textContent = s.sea.toFixed(2);
      $('pn-speed').value = s.speed; $('pn-speed-val').textContent = s.speed.toFixed(1) + '×';
      $('pn-island').checked = s.island; $('pn-shade').checked = s.shade; $('pn-warp').checked = s.warp;
      document.querySelectorAll('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === s.mode)); });
      dirty = true;
    }

    function render() {
      var cw = view.width, ch = view.height;
      var res = cw > 700 ? 3 : 2;
      var w = Math.max(40, Math.round(cw / res)), h = Math.max(30, Math.round(ch / res));
      if (w !== W || h !== H) {
        W = off.width = w; H = off.height = h;
        img = octx.createImageData(w, h);
        heights = new Float32Array(w * h);
      }
      var d = img.data;
      var freq = 3.2 / s.zoom / (W / 1);
      var aspect = H / W;
      var z = time;
      var mode = s.mode;
      var fireScroll = mode === 'fire' ? time * 2.2 : 0;
      var water = 0, i = 0, x, y, px, py, hgt, warpVal = 0;
      var octs = s.octaves, pers = s.persistence, isTerrain = mode === 'terrain';

      for (py = 0; py < H; py++) {
        for (px = 0; px < W; px++, i++) {
          x = px * freq + panX; y = py * freq + panY + fireScroll;
          if (s.warp) {
            var wx = N.fbm(x + 5.2, y + 1.3, z, 3, 0.5, 2);
            var wy = N.fbm(x + 1.7, y + 9.2, z, 3, 0.5, 2);
            warpVal = wx;
            x += wx * 1.6; y += wy * 1.6;
          }
          hgt = N.fbm(x, y, z, octs, pers, 2) * 1.45;
          if (s.island) {
            var ux = px / W - 0.5, uy = (py / H - 0.5) * aspect / 0.62;
            var dist = Math.sqrt(ux * ux + uy * uy) * 2;
            hgt = hgt + 0.35 - dist * dist * 0.9;
          }
          if (isTerrain) { hgt -= s.sea; if (hgt < 0) water++; }
          heights[i] = hgt;
          styleColor(mode, hgt, 0, x - panX, mode === 'fire' ? (H - py) / H * 2 : y - panY, z, warpVal, rgb);
          var k = i * 4;
          d[k] = rgb[0]; d[k + 1] = rgb[1]; d[k + 2] = rgb[2]; d[k + 3] = 255;
        }
      }
      // hill shading from the height field (light from the upper left)
      if (isTerrain && s.shade) {
        var strength = 110 * res / 3;
        for (py = 1; py < H; py++) {
          for (px = 1; px < W; px++) {
            i = py * W + px;
            var hh = heights[i];
            if (hh < 0) continue;
            var slope = (heights[i - W - 1] - hh) * strength;
            var shade = slope > 0.35 ? 0.35 : slope < -0.35 ? -0.35 : slope;
            var f = 1 - shade;
            var kk = i * 4;
            d[kk] = Math.min(255, d[kk] * f); d[kk + 1] = Math.min(255, d[kk + 1] * f); d[kk + 2] = Math.min(255, d[kk + 2] * f);
          }
        }
      }
      octx.putImageData(img, 0, 0);
      view.ctx.imageSmoothingEnabled = true;
      view.ctx.drawImage(off, 0, 0, cw, ch);
      $('pn-r-mode').textContent = MODE_NAMES[mode];
      $('pn-r-seed').textContent = s.seed;
      $('pn-r-oct').textContent = s.octaves;
      $('pn-r-water').textContent = isTerrain ? Math.round(water / (W * H) * 100) + '%' : '–';
      dirty = false;
    }

    // controls
    document.querySelectorAll('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () {
        s.mode = b.getAttribute('data-mode');
        document.querySelectorAll('[data-mode]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        dirty = true;
      });
    });
    function slider(id, key, fmt) {
      $(id).addEventListener('input', function () {
        s[key] = parseFloat(this.value);
        $(id + '-val').textContent = fmt(s[key]);
        dirty = true;
      });
    }
    slider('pn-scale', 'zoom', function (v) { return v.toFixed(1) + '×'; });
    slider('pn-oct', 'octaves', function (v) { return String(v); });
    slider('pn-pers', 'persistence', function (v) { return v.toFixed(2); });
    slider('pn-sea', 'sea', function (v) { return v.toFixed(2); });
    slider('pn-speed', 'speed', function (v) { return v.toFixed(1) + '×'; });
    ['island', 'shade', 'warp'].forEach(function (key) {
      $('pn-' + key).addEventListener('change', function () { s[key] = this.checked; dirty = true; });
    });
    function setSeed(v) {
      v = Math.max(0, Math.min(999999, Math.floor(Number(v) || 0)));
      s.seed = v; N = createNoise(v); $('pn-seed').value = v;
      time = 0; panX = 0; panY = 0; dirty = true;
    }
    $('pn-seed').addEventListener('change', function () { setSeed(this.value); });
    $('pn-seed-random').addEventListener('click', function () { setSeed(Math.floor(Math.random() * 1000000)); });
    $('pn-reset').addEventListener('click', function () { time = 0; panX = 0; panY = 0; apply(DEFAULTS); });

    // drag to pan
    var drag = null;
    canvas.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, y: e.clientY, px: panX, py: panY };
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var unit = 3.2 / s.zoom / view.width;
      panX = drag.px - (e.clientX - drag.x) * unit;
      panY = drag.py - (e.clientY - drag.y) * unit;
      dirty = true;
    });
    function endDrag() { drag = null; canvas.style.cursor = ''; }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    apply(DEFAULTS);
    render();

    var loop = null;
    onVisible(canvas, function (vis) {
      if (vis && !loop) {
        loop = SimKit.loop(function (dt) {
          var moving = s.speed > 0 && !reduceMotion;
          if (moving) time += Math.min(dt, 0.1) * s.speed * 0.15;
          if (moving || dirty) render();
        });
      } else if (!vis && loop) { loop.stop(); loop = null; }
    });
  })();

  /* ════════════════ Part 6: gallery ════════════════ */
  function buildGallery() {
    var host = document.getElementById('pn-gallery');
    if (!host) return;
    var N = createNoise(2002);
    var tiles = [
      { mode: 'terrain', title: 'Terrain', text: 'Height mapped to a color ramp: water, sand, grass, rock, snow. Six octaves give coastlines with bays inside bays.', oct: 6, freq: 3 },
      { mode: 'clouds', title: 'Clouds', text: 'The same heights mapped from sky blue to white. Low persistence keeps the edges soft.', oct: 5, freq: 2.5, pers: 0.45 },
      { mode: 'marble', title: 'Marble', text: 'A sine wave of stripes, bent sideways by noise: sin(x + noise). The noise controls how much the veins wander.', oct: 5, freq: 2 },
      { mode: 'wood', title: 'Wood', text: 'Rings are circles around a center. Adding noise to the distance wobbles each ring like real growth rings.', oct: 3, freq: 1.6 },
      { mode: 'fire', title: 'Fire', text: 'Bright at the bottom, fading upward, with noise tearing the edge into flames. Scroll the noise upward to animate it.', oct: 5, freq: 3 },
      { mode: 'warp', title: 'Warped', text: 'Domain warping: the sample point is pushed around by another noise first, so the pattern swirls like paint.', oct: 5, freq: 2.2, warp: true }
    ];
    var W = 360, H = 270, rgb = [0, 0, 0];
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var cx = c.getContext('2d');
    var idx = 0;
    function next() {
      if (idx >= tiles.length) return;
      var t = tiles[idx++];
      var img = cx.createImageData(W, H), d = img.data, k = 0;
      var f = t.freq / W;
      for (var py = 0; py < H; py++) {
        for (var px = 0; px < W; px++) {
          var x = px * f, y = py * f, wv = 0;
          if (t.warp) {
            var wx = N.fbm(x + 5.2, y + 1.3, 0.3, 4, 0.5, 2), wy = N.fbm(x + 1.7, y + 9.2, 0.3, 4, 0.5, 2);
            wv = wx; x += wx * 2; y += wy * 2;
          }
          var h = N.fbm(x, y, 0.3 + idx, t.oct, t.pers || 0.5, 2) * 1.45;
          if (t.mode === 'terrain') h += 0.05;
          styleColor(t.mode, h, 0, x, t.mode === 'fire' ? (H - py) / H * 2 : y, 0, wv, rgb);
          d[k] = rgb[0]; d[k + 1] = rgb[1]; d[k + 2] = rgb[2]; d[k + 3] = 255; k += 4;
        }
      }
      cx.putImageData(img, 0, 0);
      var fig = document.createElement('figure');
      fig.setAttribute('data-zoomable', '');
      fig.setAttribute('data-lightbox-group', 'perlin-gallery');
      var im = document.createElement('img');
      im.src = c.toDataURL('image/png');
      im.alt = t.title + ' texture generated with Perlin noise';
      im.width = W; im.height = H;
      var cap = document.createElement('figcaption');
      cap.innerHTML = '<strong>' + t.title + '</strong> ' + t.text;
      fig.appendChild(im); fig.appendChild(cap);
      host.appendChild(fig);
      setTimeout(next, 0);
    }
    next();
  }
  if ('requestIdleCallback' in window) requestIdleCallback(buildGallery, { timeout: 1500 });
  else setTimeout(buildGallery, 200);

  /* ════════════════ Practice ════════════════ */
  (function practice() {
    var root = document.getElementById('pn-practice');
    if (!root) return;
    var problems = Array.prototype.slice.call(root.querySelectorAll('.pn-problem'));
    var solved = {};
    problems.forEach(function (prob, n) {
      var input = prob.querySelector('.pn-ans');
      var fb = prob.querySelector('.pn-feedback');
      var hint = prob.querySelector('.pn-hint');
      var answer = prob.getAttribute('data-answer');
      var tol = prob.getAttribute('data-tol');
      prob.querySelector('.pn-check').addEventListener('click', function () {
        var raw = String(input.value).trim().toLowerCase();
        if (!raw) { fb.textContent = input.tagName === 'SELECT' ? 'Make a selection.' : 'Enter a number.'; fb.className = 'pn-feedback err'; return; }
        var ok = tol != null ? Math.abs(parseFloat(raw) - parseFloat(answer)) <= parseFloat(tol) : raw === answer;
        fb.textContent = ok ? 'Correct!' : 'Not quite. Try again.';
        fb.className = 'pn-feedback ' + (ok ? 'ok' : 'err');
        hint.classList.toggle('show', !ok);
        if (ok) solved[n] = true;
        var count = Object.keys(solved).length;
        document.getElementById('pn-score').textContent = count + ' of ' + problems.length + ' correct' + (count === problems.length ? '. Nice work!' : '');
      });
    });
  })();
})();
