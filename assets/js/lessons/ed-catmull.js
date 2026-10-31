/* Ed Catmull lesson: Subdivision & Z-buffer Lab.
   A low-poly "cage" (cube, pyramid, L-block) is smoothed with real Catmull–Clark subdivision
   (Catmull & Clark, 1978), then drawn by a tiny software renderer that works the way Catmull's
   1974 thesis describes: every triangle is rasterized into pixels, a depth buffer (z-buffer)
   keeps the nearest surface at each pixel, and texture coordinates are interpolated across each
   face (texture mapping). Nothing here uses the GPU; the pixels you see are the ones this file fills.
   Needs sim-kit.js. Exposes window.CatmullLab (pure helpers) for tests. */
(function () {
  'use strict';

  /* ── Meshes: vertices [x,y,z], faces = vertex index lists, uvs = per-corner [u,v] ── */
  function cube() {
    var v = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
    var f = [[0,3,2,1],[4,5,6,7],[0,1,5,4],[2,3,7,6],[1,2,6,5],[0,4,7,3]];
    return withUVs({ verts: v, faces: f });
  }
  function pyramid() {
    var v = [[-1.15,-0.9,-1.15],[1.15,-0.9,-1.15],[1.15,-0.9,1.15],[-1.15,-0.9,1.15],[0,1.35,0]];
    var f = [[0,1,2,3],[1,0,4],[2,1,4],[3,2,4],[0,3,4]];
    return withUVs({ verts: v, faces: f });
  }
  // An L-shaped block: an L outline (6 corners) extruded through z. Its top and bottom are hexagons.
  function lBlock() {
    var outline = [[-1.2,-1.1],[1.2,-1.1],[1.2,-0.1],[0,-0.1],[0,1.3],[-1.2,1.3]];
    var n = outline.length, v = [], f = [], i;
    for (i = 0; i < n; i++) v.push([outline[i][0], outline[i][1], -0.6]);
    for (i = 0; i < n; i++) v.push([outline[i][0], outline[i][1], 0.6]);
    var back = [], front = [];
    for (i = n - 1; i >= 0; i--) back.push(i);
    for (i = 0; i < n; i++) front.push(n + i);
    f.push(back, front);
    for (i = 0; i < n; i++) { var j = (i + 1) % n; f.push([i, j, n + j, n + i]); }
    return withUVs({ verts: v, faces: f });
  }

  // Each original face gets its own square of texture: quads use the unit square corners,
  // other polygons are fitted into it from their own plane.
  function withUVs(mesh) {
    mesh.uvs = mesh.faces.map(function (face) {
      if (face.length === 4) return [[0,0],[1,0],[1,1],[0,1]];
      if (face.length === 3) return [[0,0],[1,0],[0.5,1]];
      var pts = face.map(function (i) { return mesh.verts[i]; });
      var n = newellNormal(pts);
      var ax = Math.abs(n[0]) > Math.abs(n[1]) ? (Math.abs(n[0]) > Math.abs(n[2]) ? 0 : 2) : (Math.abs(n[1]) > Math.abs(n[2]) ? 1 : 2);
      var a = ax === 0 ? 1 : 0, b = ax === 2 ? 1 : 2;
      var lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
      pts.forEach(function (p) { lo[0] = Math.min(lo[0], p[a]); hi[0] = Math.max(hi[0], p[a]); lo[1] = Math.min(lo[1], p[b]); hi[1] = Math.max(hi[1], p[b]); });
      return pts.map(function (p) { return [(p[a] - lo[0]) / (hi[0] - lo[0] || 1), (p[b] - lo[1]) / (hi[1] - lo[1] || 1)]; });
    });
    mesh.group = mesh.faces.map(function (_, i) { return i; });
    return mesh;
  }

  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function avg(list) {
    var s = [0, 0, 0];
    for (var i = 0; i < list.length; i++) s = add(s, list[i]);
    return scale(s, 1 / list.length);
  }
  function newellNormal(pts) {
    var n = [0, 0, 0];
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], q = pts[(i + 1) % pts.length];
      n[0] += (p[1] - q[1]) * (p[2] + q[2]);
      n[1] += (p[2] - q[2]) * (p[0] + q[0]);
      n[2] += (p[0] - q[0]) * (p[1] + q[1]);
    }
    var len = Math.hypot(n[0], n[1], n[2]) || 1;
    return [n[0] / len, n[1] / len, n[2] / len];
  }
  function edgeKey(a, b) { return a < b ? a + '_' + b : b + '_' + a; }

  /* ── One step of Catmull–Clark subdivision (closed meshes) ──
     face point  = average of the face's corners
     edge point  = average of the edge's two ends and the two neighbouring face points
     moved vertex = (F + 2R + (n − 3)P) / n
       F = average of the face points around it, R = average of the midpoints of its edges,
       P = where it was, n = how many edges meet there
     Every n-sided face becomes n quads. */
  function subdivide(mesh) {
    var V = mesh.verts, F = mesh.faces;
    var facePts = F.map(function (face) { return avg(face.map(function (i) { return V[i]; })); });
    var edges = {};
    F.forEach(function (face, fi) {
      for (var k = 0; k < face.length; k++) {
        var a = face[k], b = face[(k + 1) % face.length], key = edgeKey(a, b);
        if (!edges[key]) edges[key] = { a: a, b: b, faces: [] };
        edges[key].faces.push(fi);
      }
    });
    var vertFaces = V.map(function () { return []; });
    var vertEdges = V.map(function () { return []; });
    F.forEach(function (face, fi) { face.forEach(function (i) { vertFaces[i].push(fi); }); });
    Object.keys(edges).forEach(function (key) { var e = edges[key]; vertEdges[e.a].push(e); vertEdges[e.b].push(e); });

    var out = [];
    // moved original vertices first (same indices)
    V.forEach(function (P, i) {
      var n = vertEdges[i].length;
      var Fa = avg(vertFaces[i].map(function (fi) { return facePts[fi]; }));
      var R = avg(vertEdges[i].map(function (e) { return scale(add(V[e.a], V[e.b]), 0.5); }));
      out.push(scale(add(add(Fa, scale(R, 2)), scale(P, n - 3)), 1 / n));
    });
    var faceIdx = facePts.map(function (p) { out.push(p); return out.length - 1; });
    var edgeIdx = {};
    Object.keys(edges).forEach(function (key) {
      var e = edges[key];
      var p = e.faces.length === 2
        ? scale(add(add(V[e.a], V[e.b]), add(facePts[e.faces[0]], facePts[e.faces[1]])), 0.25)
        : scale(add(V[e.a], V[e.b]), 0.5);
      out.push(p);
      edgeIdx[key] = out.length - 1;
    });

    var faces = [], uvs = [], group = [];
    F.forEach(function (face, fi) {
      var uv = mesh.uvs[fi], n = face.length;
      var cu = [0, 0];
      uv.forEach(function (t) { cu[0] += t[0] / n; cu[1] += t[1] / n; });
      for (var k = 0; k < n; k++) {
        var prev = (k + n - 1) % n, next = (k + 1) % n;
        faces.push([face[k], edgeIdx[edgeKey(face[k], face[next])], faceIdx[fi], edgeIdx[edgeKey(face[prev], face[k])]]);
        uvs.push([
          uv[k],
          [(uv[k][0] + uv[next][0]) / 2, (uv[k][1] + uv[next][1]) / 2],
          cu,
          [(uv[k][0] + uv[prev][0]) / 2, (uv[k][1] + uv[prev][1]) / 2]
        ]);
        group.push(mesh.group[fi]);
      }
    });
    return { verts: out, faces: faces, uvs: uvs, group: group };
  }

  function countEdges(mesh) {
    var seen = {}, n = 0;
    mesh.faces.forEach(function (face) {
      for (var k = 0; k < face.length; k++) {
        var key = edgeKey(face[k], face[(k + 1) % face.length]);
        if (!seen[key]) { seen[key] = 1; n++; }
      }
    });
    return n;
  }

  var SHAPES = { cube: cube, pyramid: pyramid, lblock: lBlock };
  function build(shape, level) {
    var m = (SHAPES[shape] || cube)();
    for (var i = 0; i < level; i++) m = subdivide(m);
    return m;
  }

  window.CatmullLab = { subdivide: subdivide, build: build, countEdges: countEdges, shapes: Object.keys(SHAPES) };

  /* ── The lab ─────────────────────────────────────────────── */
  var canvas = document.getElementById('ec-canvas');
  if (!canvas || !window.SimKit) return;

  var levelInput = document.getElementById('ec-level');
  var levelOut = document.getElementById('ec-level-out');
  var shapeInputs = document.querySelectorAll('input[name="ec-shape"]');
  var viewInputs = document.querySelectorAll('input[name="ec-view"]');
  var cageBox = document.getElementById('ec-cage');
  var edgeBox = document.getElementById('ec-edges');
  var spinBox = document.getElementById('ec-spin');
  var stepsBtn = document.getElementById('ec-play');
  var watchBtn = document.getElementById('ec-watch');
  var resetBtn = document.getElementById('ec-reset');
  var readout = document.getElementById('ec-readout');
  var inspect = document.getElementById('ec-inspect');

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var colors = SimKit.theme.colors();
  var dark = false;
  function readTheme(c) {
    colors = c || SimKit.theme.colors();
    var m = /rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(getComputedStyle(document.body).backgroundColor) || [];
    var lum = m.length ? (0.299 * m[1] + 0.587 * m[2] + 0.114 * m[3]) : 240;
    dark = lum < 110;
    dirty = true;
  }

  var view = SimKit.canvas2d(canvas, { height: 360, onResize: function () { dirty = true; } });
  var off = document.createElement('canvas');
  var offCtx = off.getContext('2d');
  var img = null, zbuf = null, idbuf = null, over = null, RW = 0, RH = 0;

  var state = {
    shape: 'cube', level: 0, view: 'shade', cage: true, edges: true, spin: !reduced,
    yaw: 0.65, pitch: -0.45, mesh: null, cageMesh: null, watch: null, steps: null
  };
  var dirty = true;
  SimKit.theme.onChange(readTheme);
  readTheme();

  // Face colours by original cage face, so you can see each cage face spread into its patch.
  var PALETTE = [[66,133,244],[234,88,12],[22,163,74],[219,39,119],[124,58,237],[202,138,4],[8,145,178],[220,38,38]];

  function rebuild() {
    state.mesh = build(state.shape, state.level);
    state.cageMesh = build(state.shape, 0);
    state.order = state.mesh.faces.map(function (_, i) { return i; });
    dirty = true;
    updateReadout();
  }

  function updateReadout() {
    var m = state.mesh, V = m.verts.length, F = m.faces.length, E = countEdges(m);
    levelOut.textContent = String(state.level);
    var cageF = state.cageMesh.faces.length;
    var line = 'Step ' + state.level + ': ' + F.toLocaleString('en-US') + ' faces · ' + V.toLocaleString('en-US') + ' vertices · ' +
      E.toLocaleString('en-US') + ' edges. V − E + F = ' + (V - E + F) + '.';
    if (state.level === 0) line += ' This is the cage you design (' + cageF + ' faces).';
    else line += ' Every face of the step before became ' + (state.level === 1 && state.shape !== 'cube' ? 'as many quads as it had corners' : '4 quads') + '.';
    readout.textContent = line;
  }

  function ensureBuffers(w, h) {
    var rw = Math.max(160, Math.min(720, Math.round(w)));
    var rh = Math.max(120, Math.round(rw * h / w));
    if (rw === RW && rh === RH) return;
    RW = rw; RH = rh;
    off.width = RW; off.height = RH;
    img = offCtx.createImageData(RW, RH);
    zbuf = new Float32Array(RW * RH);
    idbuf = new Int32Array(RW * RH);
    over = new Uint8Array(RW * RH);
  }

  function rotate(p) {
    var cy = Math.cos(state.yaw), sy = Math.sin(state.yaw), cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
    var x = p[0] * cy + p[2] * sy, z = -p[0] * sy + p[2] * cy;
    var y = p[1] * cp - z * sp; z = p[1] * sp + z * cp;
    return [x, y, z];
  }

  var CAM = 5.2;
  function project(p, f) {
    var zc = CAM - p[2];
    return [RW / 2 + f * p[0] / zc, RH / 2 - f * p[1] / zc, zc];
  }

  function bgRGB() { return dark ? [24, 30, 40] : [244, 246, 250]; }

  function render(limit) {
    ensureBuffers(view.width, view.height);
    var m = state.mesh, f = Math.min(RW, RH) * 1.55;
    var bg = bgRGB(), data = img.data, N = RW * RH, i;
    for (i = 0; i < N; i++) { zbuf[i] = 0; idbuf[i] = -1; over[i] = 0; var o = i * 4; data[o] = bg[0]; data[o + 1] = bg[1]; data[o + 2] = bg[2]; data[o + 3] = 255; }

    var rv = m.verts.map(rotate);
    var pv = rv.map(function (p) { return project(p, f); });
    var light = norm3([-0.45, 0.65, 0.62]);
    var count = limit == null ? m.faces.length : Math.min(limit, m.faces.length);
    var order = limit == null ? null : state.order;
    for (var n = 0; n < count; n++) {
      var fi = order ? order[n] : n;
      var face = m.faces[fi];
      var nrm = newellNormal(face.map(function (k) { return rv[k]; }));
      // Back faces point away from the camera; skipping them halves the work (Catmull's renderer did too).
      var ctr = avg(face.map(function (k) { return rv[k]; }));
      var toCam = [-ctr[0], -ctr[1], CAM - ctr[2]];
      if (nrm[0] * toCam[0] + nrm[1] * toCam[1] + nrm[2] * toCam[2] <= 0) continue;
      var lam = Math.max(0, nrm[0] * light[0] + nrm[1] * light[1] + nrm[2] * light[2]);
      var shade = 0.32 + 0.68 * lam;
      var base = PALETTE[m.group[fi] % PALETTE.length];
      var uv = m.uvs[fi];
      for (var t = 1; t + 1 < face.length; t++) {
        raster(pv[face[0]], pv[face[t]], pv[face[t + 1]], uv[0], uv[t], uv[t + 1], fi, base, shade);
      }
    }
    if (state.view === 'depth') paintDepth();
    if (state.edges && state.level > 0) drawEdges(m, pv, rv, dark ? [255, 255, 255] : [20, 24, 32], 0.22);
    offCtx.putImageData(img, 0, 0);

    var ctx = view.ctx, W = view.width, H = view.height;
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, 0, 0, W, H);
    if (state.cage) drawCage(ctx, W / RW, f);
    ctx.restore();
  }

  function norm3(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }

  // Triangle rasterizer with a depth test. Depth uses 1/z (larger = nearer); texture coordinates
  // are interpolated as u/z, v/z and divided back per pixel (perspective-correct texture mapping).
  function raster(a, b, c, ta, tb, tc, id, base, shade) {
    var minX = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
    var maxX = Math.min(RW - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    var minY = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
    var maxY = Math.min(RH - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    var area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (Math.abs(area) < 1e-9) return;
    var ia = 1 / a[2], ib = 1 / b[2], ic = 1 / c[2];
    var data = img.data, view_ = state.view;
    for (var y = minY; y <= maxY; y++) {
      var py = y + 0.5;
      for (var x = minX; x <= maxX; x++) {
        var px = x + 0.5;
        var w0 = ((b[0] - px) * (c[1] - py) - (b[1] - py) * (c[0] - px)) / area;
        var w1 = ((c[0] - px) * (a[1] - py) - (c[1] - py) * (a[0] - px)) / area;
        var w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        var iz = w0 * ia + w1 * ib + w2 * ic;
        var k = y * RW + x;
        if (over[k] < 255) over[k]++;
        if (iz <= zbuf[k]) continue;          // something nearer is already here: keep it
        zbuf[k] = iz; idbuf[k] = id;
        var r = base[0], g = base[1], bl = base[2];
        if (view_ === 'texture') {
          var u = (w0 * ta[0] * ia + w1 * tb[0] * ib + w2 * tc[0] * ic) / iz;
          var v = (w0 * ta[1] * ia + w1 * tb[1] * ib + w2 * tc[1] * ic) / iz;
          var check = (Math.floor(u * 6) + Math.floor(v * 6)) & 1;
          var ring = Math.abs(Math.hypot(u - 0.5, v - 0.5) - 0.3) < 0.035;
          if (ring) { r = 250; g = 204; bl = 21; }
          else if (check) { r = 245; g = 245; bl = 240; }
          else { r = 30; g = 41; bl = 59; }
        }
        var o = k * 4;
        data[o] = Math.min(255, r * shade); data[o + 1] = Math.min(255, g * shade); data[o + 2] = Math.min(255, bl * shade);
      }
    }
  }

  function paintDepth() {
    var lo = Infinity, hi = -Infinity, i, N = RW * RH, data = img.data;
    for (i = 0; i < N; i++) if (zbuf[i] > 0) { lo = Math.min(lo, zbuf[i]); hi = Math.max(hi, zbuf[i]); }
    var span = hi - lo || 1, bg = bgRGB();
    for (i = 0; i < N; i++) {
      var o = i * 4;
      if (zbuf[i] <= 0) { data[o] = bg[0]; data[o + 1] = bg[1]; data[o + 2] = bg[2]; continue; }
      var g = Math.round(40 + 215 * (zbuf[i] - lo) / span); // near = white, far = dark
      data[o] = g; data[o + 1] = g; data[o + 2] = g;
    }
  }

  // Mesh edges drawn into the image with the same depth test, so hidden edges stay hidden.
  function drawEdges(m, pv, rv, rgb, alpha) {
    var seen = {}, data = img.data;
    m.faces.forEach(function (face) {
      for (var k = 0; k < face.length; k++) {
        var a = face[k], b = face[(k + 1) % face.length], key = edgeKey(a, b);
        if (seen[key]) continue; seen[key] = 1;
        var A = pv[a], B = pv[b];
        var steps = Math.ceil(Math.max(Math.abs(B[0] - A[0]), Math.abs(B[1] - A[1]))) || 1;
        for (var s = 0; s <= steps; s++) {
          var t = s / steps;
          var x = Math.round(A[0] + (B[0] - A[0]) * t - 0.5), y = Math.round(A[1] + (B[1] - A[1]) * t - 0.5);
          if (x < 0 || y < 0 || x >= RW || y >= RH) continue;
          var iz = 1 / (A[2] + (B[2] - A[2]) * t);
          var idx = y * RW + x;
          if (iz < zbuf[idx] * 0.995) continue;
          var o = idx * 4;
          data[o] += (rgb[0] - data[o]) * alpha; data[o + 1] += (rgb[1] - data[o + 1]) * alpha; data[o + 2] += (rgb[2] - data[o + 2]) * alpha;
        }
      }
    });
  }

  // The original cage, drawn on top as dashed lines: the shape a modeler actually edits.
  function drawCage(ctx, sx, f) {
    var c = state.cageMesh, pts = c.verts.map(function (p) { return project(rotate(p), f); });
    ctx.save();
    ctx.lineWidth = 1.6;
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = dark ? 'rgba(253, 224, 71, 0.95)' : 'rgba(180, 83, 9, 0.95)';
    var seen = {};
    c.faces.forEach(function (face) {
      for (var k = 0; k < face.length; k++) {
        var a = face[k], b = face[(k + 1) % face.length], key = edgeKey(a, b);
        if (seen[key]) continue; seen[key] = 1;
        ctx.beginPath(); ctx.moveTo(pts[a][0] * sx, pts[a][1] * sx); ctx.lineTo(pts[b][0] * sx, pts[b][1] * sx); ctx.stroke();
      }
    });
    ctx.setLineDash([]);
    ctx.fillStyle = ctx.strokeStyle;
    pts.forEach(function (p) { ctx.beginPath(); ctx.arc(p[0] * sx, p[1] * sx, 3.2, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
  }

  /* ── Controls ── */
  function radioValue(list) { for (var i = 0; i < list.length; i++) if (list[i].checked) return list[i].value; return null; }

  levelInput.addEventListener('input', function () { state.level = +levelInput.value; state.steps = null; rebuild(); });
  Array.prototype.forEach.call(shapeInputs, function (el) { el.addEventListener('change', function () { state.shape = radioValue(shapeInputs); rebuild(); }); });
  Array.prototype.forEach.call(viewInputs, function (el) { el.addEventListener('change', function () { state.view = radioValue(viewInputs); dirty = true; }); });
  cageBox.addEventListener('change', function () { state.cage = cageBox.checked; dirty = true; });
  edgeBox.addEventListener('change', function () { state.edges = edgeBox.checked; dirty = true; });
  spinBox.checked = state.spin;
  spinBox.addEventListener('change', function () { state.spin = spinBox.checked; });

  stepsBtn.addEventListener('click', function () {
    state.steps = { t: 0 };
    state.level = 0; levelInput.value = '0'; rebuild();
  });
  watchBtn.addEventListener('click', function () {
    // shuffle the draw order: the z-buffer gives the same final picture whatever the order
    var o = state.order;
    for (var i = o.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = o[i]; o[i] = o[j]; o[j] = tmp; }
    state.watch = { t: 0, total: reduced ? 0.01 : 4 };
    state.spin = false; spinBox.checked = false;
  });
  resetBtn.addEventListener('click', function () {
    state.yaw = 0.65; state.pitch = -0.45; state.level = 0; levelInput.value = '0'; state.watch = null; state.steps = null;
    rebuild();
  });

  // Drag to turn; a click without a drag reads the z-buffer at that pixel.
  var drag = null;
  canvas.addEventListener('pointerdown', function (e) {
    drag = { x: e.clientX, y: e.clientY, yaw: state.yaw, pitch: state.pitch, moved: false };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (!drag.moved) return;
    state.yaw = drag.yaw + dx * 0.01;
    state.pitch = Math.max(-1.4, Math.min(1.4, drag.pitch + dy * 0.01));
    state.spin = false; spinBox.checked = false;
    dirty = true;
  });
  canvas.addEventListener('pointerup', function (e) {
    if (drag && !drag.moved) probe(e);
    drag = null;
  });
  canvas.addEventListener('pointercancel', function () { drag = null; });

  function probe(e) {
    var r = canvas.getBoundingClientRect();
    var x = Math.floor((e.clientX - r.left) / r.width * RW), y = Math.floor((e.clientY - r.top) / r.height * RH);
    if (x < 0 || y < 0 || x >= RW || y >= RH || !zbuf) return;
    var k = y * RW + x;
    if (idbuf[k] < 0) { inspect.textContent = 'Pixel (' + x + ', ' + y + '): empty. No surface covers it, so the background shows.'; return; }
    var dist = (1 / zbuf[k]).toFixed(2);
    var n = over[k];
    inspect.textContent = 'Pixel (' + x + ', ' + y + '): ' + n + ' surface' + (n === 1 ? '' : 's') + ' landed here (back faces skipped). The z-buffer kept face #' + idbuf[k] +
      ', the nearest, ' + dist + ' units from the camera' + (n > 1 ? '; the farther one' + (n > 2 ? 's were' : ' was') + ' thrown away.' : '.');
  }

  canvas.addEventListener('keydown', function (e) {
    var step = 0.12;
    if (e.key === 'ArrowLeft') state.yaw -= step;
    else if (e.key === 'ArrowRight') state.yaw += step;
    else if (e.key === 'ArrowUp') state.pitch = Math.max(-1.4, state.pitch - step);
    else if (e.key === 'ArrowDown') state.pitch = Math.min(1.4, state.pitch + step);
    else if (e.key === '+' || e.key === '=') { state.level = Math.min(4, state.level + 1); levelInput.value = String(state.level); rebuild(); }
    else if (e.key === '-') { state.level = Math.max(0, state.level - 1); levelInput.value = String(state.level); rebuild(); }
    else return;
    e.preventDefault();
    state.spin = false; spinBox.checked = false; dirty = true;
  });

  rebuild();

  SimKit.loop(function (dt) {
    dt = Math.min(dt, 0.1);
    if (state.spin) { state.yaw += dt * 0.45; dirty = true; }
    if (state.steps) {
      state.steps.t += dt;
      if (state.steps.t > 1.1) {
        state.steps.t = 0;
        if (state.level < 4) { state.level++; levelInput.value = String(state.level); rebuild(); }
        else state.steps = null;
      }
    }
    if (state.watch) {
      state.watch.t += dt;
      var frac = Math.min(1, state.watch.t / state.watch.total);
      render(Math.ceil(frac * state.mesh.faces.length));
      readout.textContent = 'Drawing faces in a random order: ' + Math.ceil(frac * state.mesh.faces.length) + ' of ' + state.mesh.faces.length +
        '. Far faces drawn late never cover near ones, because each pixel keeps only its nearest depth.';
      if (frac >= 1) { state.watch = null; updateReadout(); }
      dirty = false;
      return;
    }
    if (dirty) { render(); dirty = false; }
  }, { el: SimKit.stage(canvas) });
})();
