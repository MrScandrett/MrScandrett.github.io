/* Scan a Likeness: triangulation lab, shooting-plan checker and scale calculator.
   lessons/3d-design/sculpture/scan-a-likeness.html
   The triangulation lab is a top-down 2D model of photogrammetry: every camera that
   sees a surface feature casts a ray through it, and the 3D point is where the rays
   cross. Each ray carries a small angular error (the matching error, in pixels, on a
   4000-pixel-wide photo with a 65° field of view), so the crossing is a small region,
   not a point. The region is drawn larger than life so it can be seen; the numbers
   report its real size. Redraws only on input, so nothing runs while it is idle. */
(function () {
  'use strict';

  var DEG = Math.PI / 180;
  var FOV = 65 * DEG;            // horizontal field of view of a typical phone main camera
  var PHOTO_PX = 4000;           // photo width in pixels
  var DRAW_GAIN = 60;            // the uncertainty region is drawn this many times larger
  var MATCH_LIMIT = 40;          // views more different than this (seen from the feature) are treated as unmatchable
  var GRAZING_LIMIT = 78;        // a surface seen more edge-on than this (from its normal) can't be matched
  var VIEW = { x0: -80, x1: 80, y0: -42, y1: 58 }; // world window in cm (top view, y down the screen)
  var OBJ = { x: 0, y: -8, rx: 10, ry: 7.5 };      // the figurine, seen from above

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function wrapAngle(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function fmt(n, d) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }

  /* ---------- geometry ---------- */
  function surfacePoint(phi) {
    var x = OBJ.x + OBJ.rx * Math.cos(phi), y = OBJ.y + OBJ.ry * Math.sin(phi);
    var nx = Math.cos(phi) / OBJ.rx, ny = Math.sin(phi) / OBJ.ry, nl = Math.hypot(nx, ny);
    return { x: x, y: y, nx: nx / nl, ny: ny / nl, phi: phi };
  }
  function nearestPhi(x, y) {
    var best = 0, bd = Infinity;
    for (var i = 0; i < 360; i++) {
      var p = surfacePoint(i * DEG), d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) { bd = d; best = i * DEG; }
    }
    return best;
  }
  function placeCam(angleDeg, dist) {
    var a = angleDeg * DEG;
    return { x: OBJ.x + dist * Math.sin(a), y: OBJ.y + dist * Math.cos(a) };
  }
  // Does camera c see surface point p, and how squarely?
  function seeInfo(c, p) {
    var vx = c.x - p.x, vy = c.y - p.y, d = Math.hypot(vx, vy);
    var cosN = (vx * p.nx + vy * p.ny) / d;
    var look = Math.atan2(OBJ.y - c.y, OBJ.x - c.x), toP = Math.atan2(p.y - c.y, p.x - c.x);
    var inFov = Math.abs(wrapAngle(toP - look)) <= FOV / 2;
    var incidence = Math.acos(clamp(cosN, -1, 1)) / DEG;
    return { sees: cosN > 0 && inFov && incidence <= GRAZING_LIMIT, facing: cosN > 0, inFov: inFov, incidence: incidence, dist: d, dir: Math.atan2(-vy, -vx) };
  }
  // Angle between two cameras as seen from the point.
  function viewAngle(a, b, p) {
    var a1 = Math.atan2(a.y - p.y, a.x - p.x), a2 = Math.atan2(b.y - p.y, b.x - p.x);
    return Math.abs(wrapAngle(a1 - a2)) / DEG;
  }
  // Cameras that see p and can be matched with at least one other seeing camera.
  function matchedSet(cams, p) {
    var seeing = cams.filter(function (c) { return seeInfo(c, p).sees; });
    var matched = seeing.filter(function (c) {
      return seeing.some(function (o) { return o !== c && viewAngle(c, o, p) <= MATCH_LIMIT; });
    });
    return { seeing: seeing, matched: matched };
  }
  // Sutherland–Hodgman clip of a polygon by the half-plane n·(q - o) >= 0
  function clipHalf(poly, ox, oy, nx, ny) {
    var out = [];
    for (var i = 0; i < poly.length; i++) {
      var a = poly[i], b = poly[(i + 1) % poly.length];
      var da = (a[0] - ox) * nx + (a[1] - oy) * ny, db = (b[0] - ox) * nx + (b[1] - oy) * ny;
      if (da >= 0) out.push(a);
      if ((da >= 0) !== (db >= 0)) { var t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  }
  // Region consistent with every matched ray, each allowed ±sigma (radians).
  function uncertaintyRegion(cams, p, sigma, box) {
    var poly = [[p.x - box, p.y - box], [p.x + box, p.y - box], [p.x + box, p.y + box], [p.x - box, p.y + box]];
    cams.forEach(function (c) {
      var th = Math.atan2(p.y - c.y, p.x - c.x);
      // left edge of wedge at th - sigma: keep points counter-clockwise of it, and vice versa
      var l = th - sigma, r = th + sigma;
      poly = clipHalf(poly, c.x, c.y, -Math.sin(l), Math.cos(l));
      poly = clipHalf(poly, c.x, c.y, Math.sin(r), -Math.cos(r));
    });
    return poly;
  }
  function extentAlong(poly, ux, uy) {
    var lo = Infinity, hi = -Infinity;
    poly.forEach(function (q) { var d = q[0] * ux + q[1] * uy; lo = Math.min(lo, d); hi = Math.max(hi, d); });
    return hi - lo;
  }

  /* ---------- triangulation lab ---------- */
  function initTriLab(root) {
    var canvas = root.querySelector('canvas');
    if (!canvas || !window.SimKit) return;
    var out = function (k) { return root.querySelector('[data-sal-out="' + k + '"]'); };
    var errInput = root.querySelector('[data-sal-input="error"]');
    var thirdInput = root.querySelector('[data-sal-input="third"]');
    var coverInput = root.querySelector('[data-sal-input="coverage"]');
    var verdict = root.querySelector('[data-sal-verdict]');
    var state = {
      cams: [placeCam(-8, 45), placeCam(8, 45), placeCam(30, 45)],
      phi: 90 * DEG, // the feature: front of the figurine, facing the cameras
      drag: -1,
      selected: 0
    };
    var view = SimKit.canvas2d(canvas, { height: null, onResize: function () { draw(); } });
    var geom = { s: 1, ox: 0, oy: 0 };

    function activeCams() { return thirdInput && thirdInput.checked ? state.cams : state.cams.slice(0, 2); }
    function toScreen(x, y) { return [geom.ox + (x - VIEW.x0) * geom.s, geom.oy + (y - VIEW.y0) * geom.s]; }
    function toWorld(px, py) { return [(px - geom.ox) / geom.s + VIEW.x0, (py - geom.oy) / geom.s + VIEW.y0]; }

    function palette() {
      var c = SimKit.theme.colors();
      var m = /#([0-9a-f]{6})/i.exec(c.bg || '');
      var dark = false;
      if (m) { var n = parseInt(m[1], 16); dark = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 110; }
      return dark ? { bg: '#1b2227', grid: 'rgba(255,255,255,0.07)', ink: '#e8eef0', muted: '#9fb0b6', obj: '#8a6f4d', fov: 'rgba(160,190,200,0.10)' }
                  : { bg: '#f7f5ee', grid: 'rgba(25,63,73,0.08)', ink: '#193f49', muted: '#5b7076', obj: '#d9c3a0', fov: 'rgba(30,95,105,0.07)' };
    }
    var CAM_COLORS = ['#c2410c', '#1d4ed8', '#7c3aed'];

    function analyse() {
      var cams = activeCams();
      var p = surfacePoint(state.phi);
      var ms = matchedSet(cams, p);
      var sigma = (Number(errInput ? errInput.value : 1) * (FOV / DEG) / PHOTO_PX) * DEG; // radians
      var res = { p: p, cams: cams, ms: ms, sigma: sigma };
      if (ms.matched.length >= 2) {
        var region = uncertaintyRegion(ms.matched, p, sigma * DRAW_GAIN, 60);
        // average viewing direction from the matched cameras to the point = "depth" direction
        var ux = 0, uy = 0;
        ms.matched.forEach(function (c) { var d = Math.hypot(p.x - c.x, p.y - c.y); ux += (p.x - c.x) / d; uy += (p.y - c.y) / d; });
        var ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
        res.region = region;
        res.depthCm = extentAlong(region, ux, uy) / DRAW_GAIN;
        res.sideCm = extentAlong(region, -uy, ux) / DRAW_GAIN;
        var maxAng = 0, maxBase = 0;
        for (var i = 0; i < ms.matched.length; i++) for (var j = i + 1; j < ms.matched.length; j++) {
          maxAng = Math.max(maxAng, viewAngle(ms.matched[i], ms.matched[j], p));
          maxBase = Math.max(maxBase, Math.hypot(ms.matched[i].x - ms.matched[j].x, ms.matched[i].y - ms.matched[j].y));
        }
        res.angle = maxAng; res.baseline = maxBase;
      } else if (ms.seeing.length === 1) {
        res.region = uncertaintyRegion(ms.seeing, p, sigma * DRAW_GAIN, 60);
      }
      // surface coverage: share of the outline seen by 2+ matchable cameras
      var n = 144, good = 0, seg = [];
      for (var k = 0; k < n; k++) {
        var q = surfacePoint(k / n * 2 * Math.PI), m = matchedSet(cams, q);
        var level = m.matched.length >= 2 ? 2 : m.seeing.length >= 1 ? 1 : 0;
        if (level === 2) good++;
        seg.push(level);
      }
      res.coverage = good / n; res.segments = seg;
      var all = [];
      for (var a = 0; a < cams.length; a++) for (var b = a + 1; b < cams.length; b++) all.push(Math.hypot(cams[a].x - cams[b].x, cams[a].y - cams[b].y));
      res.camBaseline = all.length ? Math.min.apply(null, all) : 0;
      return res;
    }

    function draw() {
      var ctx = view.ctx, W = view.width, H = view.height;
      if (!W || !H) return;
      var pal = palette();
      geom.s = Math.min(W / (VIEW.x1 - VIEW.x0), H / (VIEW.y1 - VIEW.y0));
      geom.ox = (W - (VIEW.x1 - VIEW.x0) * geom.s) / 2; geom.oy = (H - (VIEW.y1 - VIEW.y0) * geom.s) / 2;
      var s = geom.s;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H);
      // 10 cm grid
      ctx.strokeStyle = pal.grid; ctx.lineWidth = 1; ctx.beginPath();
      for (var gx = VIEW.x0; gx <= VIEW.x1; gx += 10) { var a = toScreen(gx, VIEW.y0), b = toScreen(gx, VIEW.y1); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
      for (var gy = VIEW.y0 + 2; gy <= VIEW.y1; gy += 10) { var c0 = toScreen(VIEW.x0, gy), c1 = toScreen(VIEW.x1, gy); ctx.moveTo(c0[0], c0[1]); ctx.lineTo(c1[0], c1[1]); }
      ctx.stroke();
      var r = analyse();
      // camera fields of view
      r.cams.forEach(function (c) {
        var look = Math.atan2(OBJ.y - c.y, OBJ.x - c.x), L = 220, cs = toScreen(c.x, c.y);
        var e1 = toScreen(c.x + L * Math.cos(look - FOV / 2), c.y + L * Math.sin(look - FOV / 2));
        var e2 = toScreen(c.x + L * Math.cos(look + FOV / 2), c.y + L * Math.sin(look + FOV / 2));
        ctx.fillStyle = pal.fov; ctx.beginPath(); ctx.moveTo(cs[0], cs[1]); ctx.lineTo(e1[0], e1[1]); ctx.lineTo(e2[0], e2[1]); ctx.closePath(); ctx.fill();
      });
      // object
      ctx.beginPath();
      for (var k = 0; k <= 72; k++) { var sp = surfacePoint(k / 72 * 2 * Math.PI), q = toScreen(sp.x, sp.y); if (k) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }
      ctx.fillStyle = pal.obj; ctx.fill();
      // coverage-coloured outline
      if (!coverInput || coverInput.checked) {
        var n = r.segments.length;
        ctx.lineWidth = Math.max(4, s * 0.9); ctx.lineCap = 'round';
        for (var i = 0; i < n; i++) {
          var p0 = surfacePoint(i / n * 2 * Math.PI), p1 = surfacePoint((i + 1) / n * 2 * Math.PI), a0 = toScreen(p0.x, p0.y), a1 = toScreen(p1.x, p1.y);
          ctx.strokeStyle = r.segments[i] === 2 ? '#15803d' : r.segments[i] === 1 ? '#d97706' : '#b91c1c';
          ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.stroke();
        }
      } else {
        ctx.strokeStyle = pal.ink; ctx.lineWidth = 2; ctx.stroke();
      }
      // uncertainty wedges and region
      var ps = toScreen(r.p.x, r.p.y);
      var raySet = r.ms.matched.length >= 2 ? r.ms.matched : r.ms.seeing;
      raySet.forEach(function (c) {
        var idx = state.cams.indexOf(c), col = CAM_COLORS[idx];
        var th = Math.atan2(r.p.y - c.y, r.p.x - c.x), sg = r.sigma * DRAW_GAIN, cs = toScreen(c.x, c.y), L = 140;
        ctx.strokeStyle = col; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
        [-sg, sg].forEach(function (d) { var e = toScreen(c.x + L * Math.cos(th + d), c.y + L * Math.sin(th + d)); ctx.beginPath(); ctx.moveTo(cs[0], cs[1]); ctx.lineTo(e[0], e[1]); ctx.stroke(); });
        ctx.globalAlpha = 1; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
        ctx.beginPath(); ctx.moveTo(cs[0], cs[1]); ctx.lineTo(ps[0], ps[1]); ctx.stroke(); ctx.setLineDash([]);
      });
      if (r.region && r.region.length > 2) {
        ctx.beginPath();
        r.region.forEach(function (q, j) { var t = toScreen(q[0], q[1]); if (j) ctx.lineTo(t[0], t[1]); else ctx.moveTo(t[0], t[1]); });
        ctx.closePath(); ctx.fillStyle = r.ms.matched.length >= 2 ? 'rgba(234,88,12,0.45)' : 'rgba(185,28,28,0.18)'; ctx.fill();
        ctx.strokeStyle = r.ms.matched.length >= 2 ? '#c2410c' : '#b91c1c'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      // feature point
      ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(ps[0], ps[1], Math.max(5, s * 0.9), 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(ps[0], ps[1], Math.max(2.5, s * 0.45), 0, 2 * Math.PI); ctx.fill();
      // cameras
      r.cams.forEach(function (c, i) {
        var cs = toScreen(c.x, c.y), look = Math.atan2(OBJ.y - c.y, OBJ.x - c.x), sz = Math.max(11, s * 3.2);
        ctx.save(); ctx.translate(cs[0], cs[1]); ctx.rotate(look);
        ctx.fillStyle = CAM_COLORS[i];
        ctx.fillRect(-sz, -sz * 0.6, sz * 1.2, sz * 1.2);
        ctx.beginPath(); ctx.moveTo(sz * 0.2, -sz * 0.4); ctx.lineTo(sz * 0.8, -sz * 0.75); ctx.lineTo(sz * 0.8, sz * 0.75); ctx.lineTo(sz * 0.2, sz * 0.4); ctx.closePath(); ctx.fill();
        if (i === state.selected) { ctx.strokeStyle = pal.ink; ctx.lineWidth = 2; ctx.strokeRect(-sz - 4, -sz * 0.6 - 4, sz * 1.2 + 8, sz * 1.2 + 8); }
        ctx.restore();
        ctx.fillStyle = pal.ink; ctx.font = '700 ' + Math.max(12, Math.round(s * 2.4)) + 'px system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(String(i + 1), cs[0], cs[1] + sz * 1.9);
      });
      // scale bar + note
      var sb0 = toScreen(VIEW.x0 + 4, VIEW.y1 - 4), sb1 = toScreen(VIEW.x0 + 14, VIEW.y1 - 4);
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sb0[0], sb0[1]); ctx.lineTo(sb1[0], sb1[1]); ctx.stroke();
      ctx.font = Math.max(11, Math.round(s * 2.1)) + 'px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = pal.ink;
      ctx.fillText('10 cm', sb0[0], sb0[1] - 7);
      ctx.textAlign = 'right'; ctx.fillStyle = pal.muted;
      ctx.fillText('Top view · orange region drawn ' + DRAW_GAIN + '× larger than life', W - 10, H - 10);
      report(r);
    }

    function report(r) {
      var set = function (k, v) { var o = out(k); if (o) o.textContent = v; };
      set('seeing', r.ms.matched.length >= 2 ? r.ms.matched.length + ' matched' : r.ms.seeing.length + ' see it, ' + r.ms.matched.length + ' matched');
      set('angle', r.angle != null ? fmt(r.angle, 0) + '°' : '–');
      set('baseline', r.baseline != null ? fmt(r.baseline, 0) + ' cm' : '–');
      set('depth', r.depthCm != null ? '± ' + fmt(r.depthCm * 10 / 2, 2) + ' mm' : 'unknown');
      set('coverage', fmt(r.coverage * 100, 0) + '%');
      var msg, tone;
      if (r.ms.seeing.length === 0) { msg = 'No camera can see this feature. It will be a hole in the model.'; tone = 'bad'; }
      else if (r.ms.seeing.length === 1) { msg = 'Only one camera sees it. One ray gives a direction but no distance: the point could be anywhere along the red sliver.'; tone = 'bad'; }
      else if (r.ms.matched.length < 2) { msg = 'Two cameras see it, but their views differ by more than ' + MATCH_LIMIT + '°, so the app cannot recognise it as the same feature. Add a camera in between.'; tone = 'bad'; }
      else if (r.angle < 6) { msg = 'Matched, but the rays are almost parallel (' + fmt(r.angle, 0) + '°). The depth is stretched out; move the cameras further apart.'; tone = 'warn'; }
      else if (r.coverage < 0.5) { msg = 'This point is solid, but only ' + fmt(r.coverage * 100, 0) + '% of the outline is seen by two matching cameras. The rest will be holes; you need more positions around the object.'; tone = 'warn'; }
      else { msg = 'Solid: the rays cross at ' + fmt(r.angle, 0) + '° and the point is pinned to within about ' + fmt(r.depthCm * 10 / 2, 2) + ' mm in depth.'; tone = 'good'; }
      if (verdict) { verdict.textContent = msg; verdict.dataset.tone = tone; }
    }

    // presets (camera angles in degrees around the front, distance in cm)
    var PRESETS = {
      close: { angles: [-1.5, 1.5, 0], dist: 45, third: false, phi: 90 },
      good: { angles: [-8, 8, 0], dist: 45, third: false, phi: 90 },
      wide: { angles: [-35, 35, 0], dist: 45, third: false, phi: 90 },
      three: { angles: [-16, 0, 16], dist: 45, third: true, phi: 90 },
      far: { angles: [-8, 8, 0], dist: 58, third: false, phi: 90 },
      side: { angles: [-8, 8, 0], dist: 45, third: false, phi: 10 }
    };
    root.querySelectorAll('[data-sal-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pr = PRESETS[btn.dataset.salPreset]; if (!pr) return;
        state.cams = pr.angles.map(function (a) { return placeCam(a, pr.dist); });
        if (pr.angles.length === 3 && !pr.third) state.cams[2] = placeCam(40, pr.dist);
        if (thirdInput) thirdInput.checked = pr.third;
        state.phi = pr.phi * DEG;
        draw();
      });
    });
    [errInput, thirdInput, coverInput].forEach(function (inp) { if (inp) inp.addEventListener('input', function () { if (inp === errInput) { var o = out('error'); if (o) o.textContent = inp.value + ' px'; } draw(); }); });

    function eventWorld(e) {
      var rect = canvas.getBoundingClientRect();
      // getBoundingClientRect + clientX keeps this right when sim-present zooms the stage
      var sx = (e.clientX - rect.left) * (view.width / rect.width), sy = (e.clientY - rect.top) * (view.height / rect.height);
      return toWorld(sx, sy);
    }
    canvas.addEventListener('pointerdown', function (e) {
      var w = eventWorld(e), cams = activeCams(), best = -1, bd = Infinity;
      cams.forEach(function (c, i) { var d = Math.hypot(c.x - w[0], c.y - w[1]); if (d < bd) { bd = d; best = i; } });
      var p = surfacePoint(state.phi), dp = Math.hypot(p.x - w[0], p.y - w[1]);
      var nearObj = Math.hypot((w[0] - OBJ.x) / OBJ.rx, (w[1] - OBJ.y) / OBJ.ry) < 1.6;
      if (bd < 6) { state.drag = best; state.selected = best; }
      else if (dp < 6 || nearObj) { state.drag = 'p'; state.phi = nearestPhi(w[0], w[1]); }
      else return;
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
      draw();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (state.drag === -1) return;
      var w = eventWorld(e);
      if (state.drag === 'p') state.phi = nearestPhi(w[0], w[1]);
      else moveCam(state.drag, w[0], w[1]);
      draw();
    });
    function endDrag() { state.drag = -1; }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    function moveCam(i, x, y) {
      x = clamp(x, VIEW.x0 + 3, VIEW.x1 - 3); y = clamp(y, VIEW.y0 + 3, VIEW.y1 - 3);
      // keep cameras outside the object
      var k = Math.hypot((x - OBJ.x) / (OBJ.rx + 8), (y - OBJ.y) / (OBJ.ry + 8));
      if (k < 1) { x = OBJ.x + (x - OBJ.x) / k; y = OBJ.y + (y - OBJ.y) / k; }
      state.cams[i] = { x: x, y: y };
    }
    canvas.addEventListener('keydown', function (e) {
      var cams = activeCams();
      if (/^[123]$/.test(e.key) && Number(e.key) <= cams.length) { state.selected = Number(e.key) - 1; draw(); e.preventDefault(); return; }
      var step = e.shiftKey ? 5 : 1, c = state.cams[state.selected], dx = 0, dy = 0;
      if (e.key === 'ArrowLeft') dx = -step; else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step; else if (e.key === 'ArrowDown') dy = step;
      else if (e.key === '[' || e.key === ']') { state.phi += (e.key === '[' ? -5 : 5) * DEG; draw(); e.preventDefault(); return; }
      else return;
      e.preventDefault();
      moveCam(state.selected, c.x + dx, c.y + dy);
      draw();
    });
    SimKit.theme.onChange(function () { draw(); });
    draw();
    root.salDebug = { analyse: analyse, state: state, draw: draw };
  }

  /* ---------- shooting-plan checker ---------- */
  function initPlan(root) {
    var form = root.querySelector('form') || root;
    var list = root.querySelector('[data-sal-plan-list]');
    var summary = root.querySelector('[data-sal-plan-summary]');
    var stats = root.querySelector('[data-sal-plan-stats]');
    function val(name) { var el = form.querySelector('[name="' + name + '"]'); return el ? (el.type === 'checkbox' ? el.checked : el.value) : ''; }

    function evaluate() {
      var size = Math.max(0.5, Number(val('size')) || 0);
      var dist = Math.max(1, Number(val('dist')) || 0);
      var per = Math.max(1, Math.round(Number(val('per')) || 0));
      var rings = Number(val('rings')) || 1;
      var step = 360 / per;
      // A patch of surface can be matched while you see it within about 45° of face-on,
      // so it stays in view for about 90° of travel around the object.
      var overlap = Math.max(0, 1 - step / 90);
      var views = Math.floor(90 / step);
      var frameW = 2 * dist * Math.tan(FOV / 2);
      var fill = size / frameW;
      var total = per * rings * (val('under') === 'flip' ? 2 : 1);
      var checks = [];
      function add(tone, title, why) { checks.push({ tone: tone, title: title, why: why }); }

      if (overlap >= 0.75) add('good', 'Overlap ' + Math.round(overlap * 100) + '%', 'Photos ' + fmt(step, 1) + '° apart: every spot is in about ' + views + ' photos of each ring.');
      else if (overlap >= 0.6) add('warn', 'Overlap ' + Math.round(overlap * 100) + '%', 'Photos ' + fmt(step, 1) + '° apart just meets the 60% minimum; each spot is in about ' + views + ' photos. Add a few more if you can.');
      else add('bad', 'Overlap only ' + Math.round(overlap * 100) + '%', 'Photos ' + fmt(step, 1) + '° apart: neighbours share too little, so the app can lose track. Aim for 24 or more photos per ring (15° steps).');
      if (per > 72) add('warn', per + ' photos per ring', 'More than you need: processing gets slow and the extra photos add little. 24 to 48 is plenty for a classroom object.');

      if (fill > 0.95) add('warn', 'Object fills ' + Math.round(fill * 100) + '% of the frame', 'Parts will be cut off at the edges of some photos. Step back a little.');
      else if (fill >= 0.5) add('good', 'Object fills ' + Math.round(fill * 100) + '% of the frame', 'Close enough that its details cover lots of pixels.');
      else if (fill >= 0.3) add('warn', 'Object fills ' + Math.round(fill * 100) + '% of the frame', 'Move closer: the object should fill most of each photo, or its details will be only a few pixels across.');
      else add('bad', 'Object fills only ' + Math.round(fill * 100) + '% of the frame', 'Most of every photo is background. Move much closer (about ' + Math.round(size / (0.7 * 2 * Math.tan(FOV / 2))) + ' cm away fills 70%).');

      if (rings === 1) add('warn', 'One ring of photos', 'The top of the object is seen only at a grazing angle, so expect a hole there. Add a ring from about 30° above.');
      else add('good', rings + ' rings of photos', 'Seen from more than one height, so the top and the sides both get covered.');

      var under = val('under');
      if (under === 'base') add('good', 'Flat base on the table', 'The underside won\'t be captured; you will crop the floor and close the base flat in cleanup.');
      else if (under === 'flip') add('good', 'Flip and shoot again', 'Two sets of photos, so the app must join them. Keep the same light and a textured mat so the two halves line up.');
      else add('warn', 'Propped up on a stand', 'The stand will be scanned too and must be cropped out. Use a thin, plain stand.');

      var method = val('method'), bg = val('bg');
      if (method === 'turntable' && bg === 'busy') add('bad', 'Turntable with a busy background', 'The object turns but the room doesn\'t, so the app sees two motions that disagree. Use a plain, even backdrop, or walk around the object instead.');
      else if (method === 'turntable') add('good', 'Turntable with a plain backdrop', 'The backdrop gives the app nothing to match, so it only tracks the turning object.');
      else if (bg === 'plain') add('warn', 'Walking around in plain surroundings', 'Walking around works best when the table has texture too. Put the object on a newspaper or patterned mat.');
      else add('good', 'Walking around a textured scene', 'The textured table and room help the app work out where each photo was taken.');

      var light = val('light');
      if (light === 'diffuse') add('good', 'Soft, even light', 'No hard shadows and no glare: the surface looks the same from every side.');
      else if (light === 'room') add('warn', 'Ceiling lights only', 'Usually fine. Watch for your own shadow falling on the object as you move around it.');
      else if (light === 'hard') add('bad', 'Direct sun or a spotlight', 'Hard shadows and bright highlights change from photo to photo. Move into shade, or bounce the light off a white card.');
      else add('bad', 'Camera flash', 'The flash moves with the camera, so the shading and glare spots change in every photo. Turn it off and add light instead.');

      var surf = val('surface');
      if (surf === 'matte') add('good', 'Matte with plenty of detail', 'Ideal: lots of distinct marks for the app to match.');
      else if (surf === 'plain') add('warn', 'Matte but plain, one colour', 'Few features to match. Add removable markers (small stickers or bits of masking tape) or put it on a patterned base.');
      else if (surf === 'satin') add('warn', 'A little shiny', 'Highlights move with your viewpoint and confuse matching. Use soft light; expect some bumpy patches to clean up.');
      else if (surf === 'mirror') add('bad', 'Shiny metal or mirror', 'The camera photographs reflections, not the surface. Choose another object, or only on something you own and can wash, dust it with a temporary matte coating.');
      else add('bad', 'Glass or clear plastic', 'The camera sees straight through it. Photogrammetry can\'t capture it; choose another object.');

      var thin = val('thin');
      if (thin === 'none') add('good', 'No thin parts', 'Everything is thick enough to show up in many pixels.');
      else if (thin === 'some') add('warn', 'Some thin parts', 'Thin handles, ears and tails may come out broken or melted. Plan to rebuild them in CAD.');
      else add('bad', 'Hair, fur, wire or leaves', 'Too fine and too many: they come out as a fuzzy blob. Pick a smoother subject.');

      var scale = val('scale');
      if (scale === 'none') add('bad', 'No size reference', 'Photos alone can\'t tell how big the object is, so the model\'s size will be a guess. Put a ruler in the shots or measure it with calipers.');
      else add('good', scale === 'ruler' ? 'Ruler in the photos' : 'Measure with calipers', 'You will be able to scale the model to its real size.');

      var perm = val('perm');
      if (perm === 'own') add('good', 'Your own object', 'You can scan, share and print it.');
      else if (perm === 'borrowed') add('good', 'Borrowed, with permission', 'Ask the owner whether you may share the scan too, not just make it.');
      else if (perm === 'person') add('warn', 'A person', 'Only with their clear OK and your teacher\'s. A face scan is personal data: ask before you share it, and delete it if they ask. They must hold still for the whole shoot.');
      else add('bad', 'Not sure who owns it', 'Ask first. Museums and owners may not allow scanning, and sacred or cultural objects may need a community\'s permission.');

      if (list) {
        list.innerHTML = '';
        checks.forEach(function (c) {
          var li = document.createElement('li'); li.dataset.tone = c.tone;
          var mark = document.createElement('span'); mark.className = 'sal-mark'; mark.setAttribute('aria-hidden', 'true'); mark.textContent = c.tone === 'good' ? '✓' : c.tone === 'warn' ? '!' : '✗';
          var body = document.createElement('div'); var strong = document.createElement('strong'); strong.textContent = c.title; var p = document.createElement('span'); p.textContent = c.why;
          var sr = document.createElement('span'); sr.className = 'sal-sr'; sr.textContent = c.tone === 'good' ? 'OK: ' : c.tone === 'warn' ? 'Warning: ' : 'Problem: ';
          body.append(sr, strong, p); li.append(mark, body); list.appendChild(li);
        });
      }
      var bad = checks.filter(function (c) { return c.tone === 'bad'; }).length, warn = checks.filter(function (c) { return c.tone === 'warn'; }).length;
      if (summary) {
        summary.dataset.tone = bad ? 'bad' : warn ? 'warn' : 'good';
        summary.textContent = bad ? 'Fix ' + bad + ' problem' + (bad > 1 ? 's' : '') + ' before you shoot.' : warn ? 'Ready to shoot, with ' + warn + ' thing' + (warn > 1 ? 's' : '') + ' to watch.' : 'Ready to shoot.';
      }
      if (stats) stats.textContent = total + ' photos in total · ' + fmt(step, 1) + '° between shots · frame ' + Math.round(frameW) + ' cm wide at ' + Math.round(dist) + ' cm';
      return { overlap: overlap, fill: fill, total: total, checks: checks };
    }
    form.addEventListener('input', evaluate);
    form.addEventListener('change', evaluate);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    evaluate();
    root.salDebug = { evaluate: evaluate };
  }

  /* ---------- scale calculator ---------- */
  function initScale(root) {
    var real = root.querySelector('[name="real"]'), model = root.querySelector('[name="model"]'), other = root.querySelector('[name="other"]');
    var outEl = root.querySelector('[data-sal-scale-out]');
    function update() {
      var r = Number(real.value), m = Number(model.value), o = Number(other && other.value);
      if (!(r > 0) || !(m > 0)) { outEl.textContent = 'Enter both measurements.'; return; }
      var f = r / m;
      var text = 'Scale factor ' + fmt(f, f >= 10 ? 1 : 3) + ' (type ' + fmt(f * 100, 1) + '% into a slicer that reads the file as millimetres).';
      if (o > 0) text += ' The other dimension becomes ' + fmt(o * f, 1) + ' mm.';
      outEl.textContent = text;
    }
    [real, model, other].forEach(function (i) { if (i) i.addEventListener('input', update); });
    update();
  }

  function boot() {
    document.querySelectorAll('[data-sal-tri]').forEach(initTriLab);
    document.querySelectorAll('[data-sal-plan]').forEach(initPlan);
    document.querySelectorAll('[data-sal-scale]').forEach(initScale);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
