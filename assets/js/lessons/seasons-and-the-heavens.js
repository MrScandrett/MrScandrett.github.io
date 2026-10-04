/* ──────────────────────────────────────────────────────────────────────
   Seasons and the Heavens - Interactive JavaScript
   Orbit + globe simulator, year chart, beam-spread demo, precession
   sky map, warm-up poll, and quiz.

   Astronomy model (good to a fraction of a day / degree for teaching):
   - Earth's orbit is a Kepler ellipse, e = 0.0167, perihelion ~Jan 3.
   - Sun's ecliptic longitude λ from the equation of center.
   - Solar declination δ = asin(sin ε · sin λ), ε = axial tilt.
   - Day length and daily-mean top-of-atmosphere sunlight use the
     standard hour-angle formulas (no refraction, no atmosphere).
   ────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var D2R = Math.PI / 180;
  var R2D = 180 / Math.PI;
  var ECC = 0.0167;
  var YEAR = 365.256;
  var PERI_DAY = 2.5;          // ~Jan 3 (day 0 = Jan 1)
  var PERI_LON = 282.94;       // Sun's longitude of perihelion, degrees
  var S0 = 1361;               // solar constant, W/m²
  var EARTH_TILT = 23.44;
  var AU_KM = 149.6;           // million km

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  var KEY_DATES = [
    { day: 78.5, short: 'Mar Eq', name: 'March equinox' },
    { day: 171, short: 'Jun Sol', name: 'June solstice' },
    { day: 264.5, short: 'Sep Eq', name: 'September equinox' },
    { day: 354.5, short: 'Dec Sol', name: 'December solstice' }
  ];

  /* ─── Astronomy helpers ──────────────────────────────────────────── */
  function solar(day, tiltDeg) {
    var M = 2 * Math.PI * (day - PERI_DAY) / YEAR;
    var nu = M + 2 * ECC * Math.sin(M) + 1.25 * ECC * ECC * Math.sin(2 * M);
    var lam = nu + PERI_LON * D2R;
    var r = (1 - ECC * ECC) / (1 + ECC * Math.cos(nu));
    var decl = Math.asin(Math.sin(tiltDeg * D2R) * Math.sin(lam));
    return { lam: lam, r: r, decl: decl };
  }

  // Fraction of a full day the Sun is above the horizon (0..1)
  function hourAngle(latRad, decl) {
    var c = -Math.tan(latRad) * Math.tan(decl);
    if (c >= 1) return 0;
    if (c <= -1) return Math.PI;
    return Math.acos(c);
  }

  function dayLength(latDeg, decl) {
    return 24 * hourAngle(latDeg * D2R, decl) / Math.PI;
  }

  function noonAltitude(latDeg, decl) {
    return 90 - Math.abs(latDeg - decl * R2D);
  }

  // Daily-mean sunlight at the top of the atmosphere, W/m²
  function insolation(latDeg, decl, r) {
    var phi = latDeg * D2R;
    var h0 = hourAngle(phi, decl);
    var q = (S0 / Math.PI) / (r * r) *
      (h0 * Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.sin(h0));
    return Math.max(0, q);
  }

  function dateLabel(day) {
    var d = Math.floor(((day % 365) + 365) % 365);
    for (var m = 0; m < 12; m++) {
      if (d < MDAYS[m]) return MONTHS[m] + ' ' + (d + 1);
      d -= MDAYS[m];
    }
    return 'December 31';
  }

  function latLabel(lat) {
    if (Math.abs(lat) < 0.05) return '0° (Equator)';
    return Math.abs(lat).toFixed(Math.abs(lat) % 1 ? 1 : 0) + '°' + (lat > 0 ? 'N' : 'S');
  }

  function fmtHours(h) {
    if (h >= 23.99) return '24h 0m';
    if (h <= 0.01) return '0h 0m';
    var hh = Math.floor(h);
    var mm = Math.round((h - hh) * 60);
    if (mm === 60) { hh += 1; mm = 0; }
    return hh + 'h ' + mm + 'm';
  }

  function seasonAt(lamRad, lat, tilt) {
    if (tilt < 0.5) return 'No seasons (tilt 0°)';
    var deg = ((lamRad * R2D) % 360 + 360) % 360;
    if (lat < 0) deg = (deg + 180) % 360;
    var names = ['Spring', 'Summer', 'Autumn', 'Winter'];
    var nearest = Math.round(deg / 90) % 4;
    if (Math.abs(deg - Math.round(deg / 90) * 90) < 0.8 && Math.abs(lat) >= 0.05) {
      return names[nearest] + (nearest % 2 ? ' solstice' : ' equinox');
    }
    var s = names[Math.floor(deg / 90)];
    if (Math.abs(lat) < 0.05) return 'Equator: no summer/winter';
    if (Math.abs(lat) < tilt) return s + ' (tropics: mild)';
    return s;
  }

  /* ─── Small vector helpers ───────────────────────────────────────── */
  function v3(x, y, z) { return { x: x, y: y, z: z }; }
  function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
  function cross(a, b) { return v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x); }
  function norm(a) { var l = Math.hypot(a.x, a.y, a.z) || 1; return v3(a.x / l, a.y / l, a.z / l); }
  function scale(a, s) { return v3(a.x * s, a.y * s, a.z * s); }
  function add(a, b) { return v3(a.x + b.x, a.y + b.y, a.z + b.z); }

  // Orthographic camera looking back along `toViewer` (unit vector)
  function camera(toViewer) {
    var v = norm(toViewer);
    var f = scale(v, -1);
    var right = cross(f, v3(0, 0, 1));
    if (Math.hypot(right.x, right.y, right.z) < 1e-6) right = v3(1, 0, 0);
    right = norm(right);
    var up = cross(right, f);
    return { v: v, right: right, up: up };
  }
  function project(cam, p) {
    return { x: dot(p, cam.right), y: dot(p, cam.up), z: dot(p, cam.v) };
  }

  /* ─── Pixel-shaded globe ─────────────────────────────────────────── */
  var globeCache = {};
  function drawGlobe(ctx, key, cx, cy, R, cam, sun, axis, hiLat, dpr) {
    var N = Math.max(4, Math.ceil(2 * R * dpr));
    var entry = globeCache[key];
    if (!entry || entry.N !== N) {
      var c = document.createElement('canvas');
      c.width = N; c.height = N;
      entry = globeCache[key] = { canvas: c, ctx: c.getContext('2d'), N: N };
      entry.img = entry.ctx.createImageData(N, N);
    }
    var d = entry.img.data;
    var hi = hiLat == null ? null : hiLat * D2R;
    var band = Math.max(1.3 * D2R, 1.6 / (R * dpr));
    var eqBand = Math.max(0.5 * D2R, 0.7 / (R * dpr));
    var iceSin = Math.sin(72 * D2R);
    var rt = cam.right, up = cam.up, vv = cam.v;
    for (var j = 0; j < N; j++) {
      var sy = 1 - 2 * (j + 0.5) / N;
      for (var i = 0; i < N; i++) {
        var sx = 2 * (i + 0.5) / N - 1;
        var rr = sx * sx + sy * sy;
        var k = (j * N + i) * 4;
        if (rr > 1) { d[k + 3] = 0; continue; }
        var sz = Math.sqrt(1 - rr);
        var nx = sx * rt.x + sy * up.x + sz * vv.x;
        var ny = sx * rt.y + sy * up.y + sz * vv.y;
        var nz = sx * rt.z + sy * up.z + sz * vv.z;
        var light = nx * sun.x + ny * sun.y + nz * sun.z;
        var sl = nx * axis.x + ny * axis.y + nz * axis.z;
        var r, g, b;
        if (Math.abs(sl) > iceSin) { r = 226; g = 236; b = 246; }
        else { r = 38; g = 112; b = 196; }
        var plat = Math.asin(Math.max(-1, Math.min(1, sl)));
        if (Math.abs(plat) < eqBand) { r = 150; g = 200; b = 240; }
        var onBand = hi !== null && Math.abs(plat - hi) < band;
        var t = Math.max(0, Math.min(1, (light + 0.05) / 0.1));
        var day = 0.62 + 0.38 * Math.max(0, light);
        var shade = (0.16 + (day - 0.16) * t) * (0.78 + 0.22 * sz);
        if (onBand) {
          // lit part of the latitude circle glows gold, dark part dull red
          r = 255 * (0.45 + 0.55 * t); g = 205 * t + 70 * (1 - t); b = 60 * t + 70 * (1 - t);
          shade = 0.95;
        }
        d[k] = r * shade;
        d[k + 1] = g * shade;
        d[k + 2] = Math.min(255, b * shade + (1 - t) * 18);
        var edge = (1 - Math.sqrt(rr)) * R * dpr;
        d[k + 3] = edge < 1 ? Math.max(0, edge) * 255 : 255;
      }
    }
    entry.ctx.putImageData(entry.img, 0, 0);
    ctx.drawImage(entry.canvas, cx - R, cy - R, 2 * R, 2 * R);
    ctx.strokeStyle = 'rgba(150, 190, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  }

  // Draw a 3D polyline on a sphere-centred frame, dimming the far side
  function strokeCircle3D(ctx, cam, cx, cy, R, center, e1, e2, rad, styleFn) {
    var steps = 96;
    var prev = null;
    for (var s = 0; s <= steps; s++) {
      var th = s / steps * Math.PI * 2;
      var p = add(center, add(scale(e1, rad * Math.cos(th)), scale(e2, rad * Math.sin(th))));
      var q = project(cam, p);
      var pt = { x: cx + q.x * R, y: cy - q.y * R, z: q.z, p: p };
      if (prev) {
        var mid = scale(add(prev.p, p), 0.5);
        styleFn(mid, (prev.z + pt.z) / 2);
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
      }
      prev = pt;
    }
  }

  function perpBasis(axis) {
    var helper = Math.abs(axis.x) < 0.9 ? v3(1, 0, 0) : v3(0, 1, 0);
    var e1 = norm(cross(axis, helper));
    var e2 = cross(axis, e1);
    return [e1, e2];
  }

  /* ─── Seasons simulator ──────────────────────────────────────────── */
  function initSimulator() {
    var stage = document.getElementById('sth-sim-stage');
    var canvas = document.getElementById('sth-orbit-canvas');
    var chartBox = document.getElementById('sth-chart-stage');
    var chartCanvas = document.getElementById('sth-year-chart');
    if (!stage || !canvas || !window.SimKit) return;

    var $ = function (id) { return document.getElementById(id); };
    var daySlider = $('sth-day-slider');
    var latSlider = $('sth-lat-slider');
    var tiltSlider = $('sth-tilt-slider');
    var showCircle = $('sth-show-circle');
    var showKeys = $('sth-show-keys');
    var animateBtn = $('sth-animate-btn');

    var state = {
      day: 171, lat: 40, tilt: EARTH_TILT,
      playing: false, az: 200 * D2R, el: 24 * D2R,
      chart: 'daylight', dirty: true
    };

    // Redraw right away (batched per task) instead of waiting for rAF, so the
    // sim still responds while the tab is hidden or printing.
    var pending = false;
    function invalidate() {
      state.dirty = true;
      if (pending) return;
      pending = true;
      Promise.resolve().then(function () { pending = false; if (state.dirty) { state.dirty = false; render(); } });
    }
    var view = SimKit.canvas2d(canvas, { box: stage, onResize: function () { invalidate(); } });
    var chart = SimKit.canvas2d(chartCanvas, { box: chartBox, onResize: function () { invalidate(); } });
    var colors = SimKit.theme.colors();
    SimKit.theme.onChange(function (c) { colors = c; invalidate(); });

    function layout() {
      var w = view.width, h = view.height;
      if (w >= 620) {
        var split = Math.round(w * 0.58);
        return { orbit: { x: 0, y: 0, w: split, h: h }, globe: { x: split, y: 0, w: w - split, h: h } };
      }
      var oh = Math.round(h * 0.55);
      return { orbit: { x: 0, y: 0, w: w, h: oh }, globe: { x: 0, y: oh, w: w, h: h - oh } };
    }

    function axisVec() {
      var e = state.tilt * D2R;
      return v3(0, Math.sin(e), Math.cos(e));
    }

    /* ── Orbit view ── */
    function drawOrbitView(ctx, box, sol, dpr) {
      var cam = camera(v3(Math.cos(state.el) * Math.cos(state.az), Math.cos(state.el) * Math.sin(state.az), Math.sin(state.el)));
      var cx = box.x + box.w / 2;
      var cy = box.y + box.h / 2 + 8;
      var S = Math.min(box.w * 0.4, box.h * 0.62);
      var toScreen = function (p) { var q = project(cam, p); return { x: cx + q.x * S, y: cy - q.y * S, z: q.z }; };
      var earthPosAt = function (s) { return v3(-s.r * Math.cos(s.lam), -s.r * Math.sin(s.lam), 0); };

      // Orbit ellipse (true shape: almost a circle)
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(160, 190, 230, 0.45)';
      ctx.beginPath();
      for (var i = 0; i <= 180; i++) {
        var p = toScreen(earthPosAt(solar(i / 180 * YEAR, state.tilt)));
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.stroke();

      // Direction-of-travel arrow
      var a0 = toScreen(earthPosAt(solar(state.day + 40, state.tilt)));
      var a1 = toScreen(earthPosAt(solar(state.day + 52, state.tilt)));
      drawArrow(ctx, a0.x, a0.y, a1.x, a1.y, 'rgba(160, 190, 230, 0.8)');

      // Key positions
      if (showKeys.checked) {
        ctx.font = '600 11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        var near = function (d) { var x = Math.abs(((state.day - d) % 365 + 365) % 365); return Math.min(x, 365 - x) < 22; };
        var clampX = function (x) { return Math.max(box.x + 30, Math.min(box.x + box.w - 30, x)); };
        KEY_DATES.forEach(function (k) {
          if (near(k.day)) return;
          var s = solar(k.day, state.tilt);
          var p = toScreen(earthPosAt(s));
          ctx.fillStyle = 'rgba(160, 190, 230, 0.55)';
          ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
          var dx = p.x - cx, dy = p.y - cy, L = Math.hypot(dx, dy) || 1;
          ctx.fillStyle = 'rgba(214, 228, 248, 0.85)';
          ctx.fillText(k.short, clampX(p.x + dx / L * 26), p.y + dy / L * 18 + 4);
        });
        [{ day: PERI_DAY, t: 'closest (Jan 3)' }, { day: PERI_DAY + YEAR / 2, t: 'farthest (Jul 4)' }].forEach(function (k) {
          if (near(k.day)) return;
          var p = toScreen(earthPosAt(solar(k.day, state.tilt)));
          var dx = p.x - cx, dy = p.y - cy, L = Math.hypot(dx, dy) || 1;
          ctx.fillStyle = 'rgba(255, 196, 120, 0.85)';
          ctx.font = '500 10px Inter, system-ui, sans-serif';
          ctx.fillText(k.t, clampX(p.x - dx / L * 30), p.y - dy / L * 22 + 3);
        });
      }

      var earth = earthPosAt(sol);
      var ep = toScreen(earth);
      var sp = toScreen(v3(0, 0, 0));
      var ER = Math.max(14, Math.min(30, S * 0.14));

      // Sunlight line from Sun to Earth
      ctx.strokeStyle = 'rgba(255, 210, 90, 0.35)';
      ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(ep.x, ep.y); ctx.stroke();
      ctx.setLineDash([]);

      var drawSun = function () {
        var g = ctx.createRadialGradient(sp.x, sp.y, 2, sp.x, sp.y, 34);
        g.addColorStop(0, 'rgba(255, 244, 200, 1)');
        g.addColorStop(0.45, 'rgba(255, 200, 60, 0.95)');
        g.addColorStop(1, 'rgba(255, 160, 40, 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, 34, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd34d';
        ctx.beginPath(); ctx.arc(sp.x, sp.y, 15, 0, Math.PI * 2); ctx.fill();
      };
      var sunFromEarth = v3(Math.cos(sol.lam), Math.sin(sol.lam), 0);
      var axis = axisVec();
      var drawEarth = function () {
        drawAxis(ctx, cam, ep.x, ep.y, ER, axis, false);
        drawGlobe(ctx, 'orbit', ep.x, ep.y, ER, cam, sunFromEarth, axis, showCircle.checked ? state.lat : null, dpr);
        drawAxis(ctx, cam, ep.x, ep.y, ER, axis, true);
      };
      if (ep.z < 0) { drawEarth(); drawSun(); } else { drawSun(); drawEarth(); }

      // Caption
      ctx.fillStyle = 'rgba(214, 228, 248, 0.9)';
      ctx.font = '700 12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('ORBIT VIEW', box.x + 12, box.y + 20);
      ctx.font = '500 11px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(214, 228, 248, 0.65)';
      ctx.fillText('Drag to turn the view · orbit shape to scale, sizes not', box.x + 12, box.y + 36);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = '700 13px Inter, system-ui, sans-serif';
      ctx.fillText(dateLabel(state.day), ep.x, ep.y + ER + 20);
    }

    function drawAxis(ctx, cam, x, y, R, axis, front) {
      var q = project(cam, axis);
      var len = 1.55;
      var tipN = { x: x + q.x * R * len, y: y - q.y * R * len };
      var tipS = { x: x - q.x * R * len, y: y + q.y * R * len };
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineCap = 'round';
      // North half is in front when the axis points toward the viewer
      var northFront = q.z > 0;
      ctx.beginPath();
      if (front === northFront) { ctx.moveTo(x + q.x * R, y - q.y * R); ctx.lineTo(tipN.x, tipN.y); }
      else { ctx.moveTo(x - q.x * R, y + q.y * R); ctx.lineTo(tipS.x, tipS.y); }
      ctx.stroke();
      if (front === northFront) {
        ctx.fillStyle = '#ff6b6b';
        ctx.font = '800 11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('N', tipN.x + q.x * 9, tipN.y - q.y * 9 + 4);
      }
    }

    /* ── Globe close-up: Sun always on the left ── */
    function drawGlobeView(ctx, box, sol, dpr) {
      var sunDir = v3(Math.cos(sol.lam), Math.sin(sol.lam), 0);
      var cam = camera(cross(v3(0, 0, 1), sunDir));
      var axis = axisVec();
      var R = Math.min(box.w * 0.3, box.h * 0.34);
      var cx = box.x + box.w * 0.56;
      var cy = box.y + box.h * 0.52;

      // Panel divider
      ctx.strokeStyle = 'rgba(160, 190, 230, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (box.x > 0) { ctx.moveTo(box.x + 0.5, box.y + 12); ctx.lineTo(box.x + 0.5, box.y + box.h - 12); }
      else { ctx.moveTo(box.x + 12, box.y + 0.5); ctx.lineTo(box.x + box.w - 12, box.y + 0.5); }
      ctx.stroke();

      // Incoming sunlight
      ctx.strokeStyle = 'rgba(255, 210, 90, 0.55)';
      ctx.lineWidth = 1.5;
      for (var k = -3; k <= 3; k++) {
        var yy = cy + k * R * 0.3;
        drawArrow(ctx, box.x + 10, yy, Math.max(box.x + 20, cx - R - 14), yy, 'rgba(255, 210, 90, 0.55)');
      }

      drawAxis(ctx, cam, cx, cy, R, axis, false);
      drawGlobe(ctx, 'close', cx, cy, R, cam, sunDir, axis, showCircle.checked ? state.lat : null, dpr);

      // Equator (dashed) and chosen latitude circle with lit/dark split
      var basis = perpBasis(axis);
      ctx.lineWidth = 1;
      strokeCircle3D(ctx, cam, cx, cy, R, v3(0, 0, 0), basis[0], basis[1], 1, function (mid, z) {
        ctx.strokeStyle = z >= 0 ? 'rgba(220, 240, 255, 0.7)' : 'rgba(220, 240, 255, 0)';
        ctx.setLineDash([4, 4]);
      });
      ctx.setLineDash([]);
      if (showCircle.checked && Math.abs(state.lat) < 89.5) {
        var phi = state.lat * D2R;
        ctx.lineWidth = 2.5;
        strokeCircle3D(ctx, cam, cx, cy, R, scale(axis, Math.sin(phi)), basis[0], basis[1], Math.cos(phi), function (mid, z) {
          var lit = dot(mid, sunDir) > 0;
          var a = z >= 0 ? 1 : 0.35;
          ctx.strokeStyle = lit ? 'rgba(255, 214, 64,' + a + ')' : 'rgba(150, 180, 255,' + a + ')';
          ctx.setLineDash(z >= 0 ? [] : [3, 4]);
        });
        ctx.setLineDash([]);
      }
      drawAxis(ctx, cam, cx, cy, R, axis, true);

      // Subsolar point marker
      var ss = project(cam, sunDir);
      var sx = cx + ss.x * R, sy = cy - ss.y * R;
      ctx.fillStyle = '#ffd34d';
      ctx.beginPath(); ctx.arc(sx, sy, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1b2433';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(214, 228, 248, 0.9)';
      ctx.font = '700 12px Inter, system-ui, sans-serif';
      ctx.fillText('EARTH, SUN ON THE LEFT', box.x + 12, box.y + 20);
      ctx.font = '500 11px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(214, 228, 248, 0.65)';
      var d = sol.decl * R2D;
      var sub = Math.abs(d) < 0.05 ? 'the Equator' : Math.abs(d).toFixed(1) + '°' + (d > 0 ? 'N' : 'S');
      ctx.fillText('● Sun straight overhead at ' + sub, box.x + 12, box.y + 36);
      if (showCircle.checked) {
        var h = dayLength(state.lat, sol.decl);
        ctx.fillStyle = '#ffd640';
        ctx.fillText('Gold = daylit part of ' + latLabel(state.lat) + ' → ' + fmtHours(h), box.x + 12, box.y + box.h - 14);
      }
    }

    function drawArrow(ctx, x0, y0, x1, y1, color) {
      var ang = Math.atan2(y1 - y0, x1 - x0);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - 7 * Math.cos(ang - 0.45), y1 - 7 * Math.sin(ang - 0.45));
      ctx.lineTo(x1 - 7 * Math.cos(ang + 0.45), y1 - 7 * Math.sin(ang + 0.45));
      ctx.closePath(); ctx.fill();
    }

    /* ── Year chart ── */
    var chartPad = { l: 44, r: 12, t: 14, b: 28 };
    function chartX(day) { return chartPad.l + day / 365 * (chart.width - chartPad.l - chartPad.r); }
    function drawChart() {
      var ctx = chart.ctx, w = chart.width, h = chart.height;
      ctx.clearRect(0, 0, w, h);
      var mode = state.chart;
      var maxY = mode === 'daylight' ? 24 : 560;
      var plotH = h - chartPad.t - chartPad.b;
      var yOf = function (v) { return chartPad.t + plotH * (1 - v / maxY); };
      ctx.font = '500 11px Inter, system-ui, sans-serif';

      // grid
      ctx.strokeStyle = colors.textMuted;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1;
      var step = mode === 'daylight' ? 6 : 100;
      for (var v = 0; v <= maxY; v += step) {
        ctx.beginPath(); ctx.moveTo(chartPad.l, yOf(v) + 0.5); ctx.lineTo(w - chartPad.r, yOf(v) + 0.5); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = colors.textMuted;
      ctx.textAlign = 'right';
      for (v = 0; v <= maxY; v += step) ctx.fillText(mode === 'daylight' ? v + 'h' : String(v), chartPad.l - 6, yOf(v) + 4);
      ctx.textAlign = 'center';
      var acc = 0;
      for (var m = 0; m < 12; m++) {
        ctx.fillText(MONTHS[m].slice(0, 3), chartX(acc + MDAYS[m] / 2), h - 9);
        acc += MDAYS[m];
      }
      // solstice/equinox guides
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = colors.textMuted;
      ctx.globalAlpha = 0.5;
      KEY_DATES.forEach(function (k) {
        ctx.beginPath(); ctx.moveTo(chartX(k.day), chartPad.t); ctx.lineTo(chartX(k.day), h - chartPad.b); ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      var series = function (lat, color, width, dash) {
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []);
        ctx.beginPath();
        for (var d = 0; d <= 365; d += 1) {
          var s = solar(d, state.tilt);
          var val = mode === 'daylight' ? dayLength(lat, s.decl) : insolation(lat, s.decl, s.r);
          var x = chartX(d), y = yOf(val);
          if (d === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      };
      series(0, colors.textMuted, 1.5, [5, 4]);
      if (Math.abs(state.lat) > 0.05) series(-state.lat, 'rgba(139, 127, 191, 0.85)', 1.5, [1, 3]);
      series(state.lat, colors.accent, 3);

      var s = solar(state.day, state.tilt);
      var cur = mode === 'daylight' ? dayLength(state.lat, s.decl) : insolation(state.lat, s.decl, s.r);
      var x = chartX(state.day);
      ctx.strokeStyle = colors.text; ctx.globalAlpha = 0.6; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, chartPad.t); ctx.lineTo(x, h - chartPad.b); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = colors.accent;
      ctx.beginPath(); ctx.arc(x, yOf(cur), 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = colors.bg; ctx.lineWidth = 2; ctx.stroke();

      $('sth-chart-key-lat').textContent = latLabel(state.lat);
      $('sth-chart-key-opp').textContent = latLabel(-state.lat);
    }

    /* ── Readouts ── */
    function updateReadouts(sol) {
      var dDeg = sol.decl * R2D;
      var alt = noonAltitude(state.lat, sol.decl);
      var hours = dayLength(state.lat, sol.decl);
      var q = insolation(state.lat, sol.decl, sol.r);
      $('sth-date-readout').textContent = dateLabel(state.day);
      $('sth-day-label').textContent = dateLabel(state.day);
      $('sth-lat-label').textContent = latLabel(state.lat);
      $('sth-tilt-label').textContent = state.tilt.toFixed(1) + '°';
      $('sth-decl').textContent = (Math.abs(dDeg) < 0.05 ? '0.0°' : Math.abs(dDeg).toFixed(1) + '°' + (dDeg > 0 ? 'N' : 'S'));
      $('sth-noon-alt').textContent = alt > 0 ? alt.toFixed(0) + '°' : 'Below horizon';
      $('sth-daylight-hours').textContent = fmtHours(hours);
      $('sth-insolation').textContent = Math.round(q) + ' W/m²';
      $('sth-distance').textContent = (sol.r * AU_KM).toFixed(1) + ' million km';
      $('sth-season-label').textContent = seasonAt(sol.lam, state.lat, state.tilt);
      ['sth-lat-name-1', 'sth-lat-name-2', 'sth-lat-name-3', 'sth-lat-name-4'].forEach(function (id) {
        var el = $(id); if (el) el.textContent = latLabel(state.lat);
      });
    }

    function render() {
      var ctx = view.ctx, w = view.width, h = view.height;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#0b1222');
      bg.addColorStop(1, '#141d33');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      var sol = solar(state.day, state.tilt);
      var L = layout();
      drawOrbitView(ctx, L.orbit, sol, dpr);
      drawGlobeView(ctx, L.globe, sol, dpr);
      drawChart();
      updateReadouts(sol);
      daySlider.value = Math.round(state.day) % 365;
    }

    /* ── Wiring ── */
    function setDay(d) { state.day = ((d % 365) + 365) % 365; invalidate(); }
    daySlider.addEventListener('input', function () { setDay(+this.value); clearPresets('.sth-date-btn'); });
    latSlider.addEventListener('input', function () { state.lat = +this.value; invalidate(); clearPresets('.sth-lat-btn'); });
    tiltSlider.addEventListener('input', function () { state.tilt = +this.value; invalidate(); clearPresets('.sth-tilt-btn'); });
    showCircle.addEventListener('change', function () { invalidate(); });
    showKeys.addEventListener('change', function () { invalidate(); });

    function clearPresets(sel) {
      document.querySelectorAll(sel).forEach(function (b) { b.classList.remove('active', 'll-active'); b.setAttribute('aria-pressed', 'false'); });
    }
    function presetGroup(sel, attr, apply) {
      document.querySelectorAll(sel).forEach(function (btn) {
        btn.setAttribute('aria-pressed', 'false');
        btn.addEventListener('click', function () {
          apply(+btn.getAttribute(attr));
          clearPresets(sel);
          btn.classList.add('active', 'll-active');
          btn.setAttribute('aria-pressed', 'true');
          invalidate();
        });
      });
    }
    presetGroup('.sth-date-btn', 'data-day', function (d) { setPlaying(false); setDay(d); });
    presetGroup('.sth-lat-btn', 'data-lat', function (v) { state.lat = v; latSlider.value = v; });
    presetGroup('.sth-tilt-btn', 'data-tilt', function (v) { state.tilt = v; tiltSlider.value = v; });

    function setPlaying(on) {
      state.playing = on;
      animateBtn.textContent = on ? '⏸ Pause' : '▶ Play the year';
      animateBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    animateBtn.addEventListener('click', function () { setPlaying(!state.playing); });
    $('sth-reset-btn').addEventListener('click', function () {
      setPlaying(false);
      state.day = 171; state.lat = 40; state.tilt = EARTH_TILT;
      state.az = 200 * D2R; state.el = 24 * D2R;
      latSlider.value = 40; tiltSlider.value = EARTH_TILT;
      showCircle.checked = true; showKeys.checked = true;
      clearPresets('.sth-date-btn'); clearPresets('.sth-lat-btn'); clearPresets('.sth-tilt-btn');
      invalidate();
    });

    document.querySelectorAll('.sth-chart-mode').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.chart = btn.getAttribute('data-mode');
        document.querySelectorAll('.sth-chart-mode').forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        $('sth-chart-title').textContent = state.chart === 'daylight' ? 'Hours of daylight through the year' : 'Daily sunlight energy (W/m², top of atmosphere, 24-hour average)';
        invalidate();
      });
    });

    // Drag to orbit the camera (orbit view only)
    var drag = null;
    canvas.addEventListener('pointerdown', function (e) {
      var r = canvas.getBoundingClientRect();
      var L = layout();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      if (x > L.orbit.x + L.orbit.w || y > L.orbit.y + L.orbit.h) return;
      drag = { x: e.clientX, y: e.clientY, az: state.az, el: state.el };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      state.az = drag.az - (e.clientX - drag.x) * 0.01;
      state.el = Math.max(4 * D2R, Math.min(85 * D2R, drag.el + (e.clientY - drag.y) * 0.008));
      invalidate();
    });
    var endDrag = function () { drag = null; };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    // Click / drag on the chart to pick a date
    var chartDrag = false;
    function chartPick(e) {
      var r = chartCanvas.getBoundingClientRect();
      var frac = (e.clientX - r.left - chartPad.l) / (chart.width - chartPad.l - chartPad.r);
      setPlaying(false);
      setDay(Math.max(0, Math.min(364, frac * 365)));
      clearPresets('.sth-date-btn');
    }
    chartCanvas.addEventListener('pointerdown', function (e) { chartDrag = true; chartCanvas.setPointerCapture(e.pointerId); chartPick(e); });
    chartCanvas.addEventListener('pointermove', function (e) { if (chartDrag) chartPick(e); });
    chartCanvas.addEventListener('pointerup', function () { chartDrag = false; });

    SimKit.loop(function (dt) {
      if (state.playing) { setDay(state.day + Math.min(dt, 0.1) * 30); }
      if (state.dirty) { state.dirty = false; render(); }
    });
  }

  /* ─── Stage 2: beam-spread demo ──────────────────────────────────── */
  function initBeam() {
    var svg = document.getElementById('sth-beam-svg');
    var slider = document.getElementById('sth-beam-slider');
    if (!svg || !slider) return;
    var beam = svg.querySelector('#sth-beam-poly');
    var patch = svg.querySelector('#sth-beam-patch');
    var angleArc = svg.querySelector('#sth-beam-arc');
    var angleText = svg.querySelector('#sth-beam-angle');
    var out = document.getElementById('sth-beam-readout');
    var label = document.getElementById('sth-beam-val');

    function update() {
      var a = +slider.value * D2R;
      var hx = 160, gy = 220, halfW = 26, len = 260;
      var L = halfW / Math.sin(a);
      var ux = -Math.cos(a), uy = -Math.sin(a);
      var p1 = [hx - L, gy], p2 = [hx + L, gy];
      var p3 = [p2[0] + ux * len, p2[1] + uy * len], p4 = [p1[0] + ux * len, p1[1] + uy * len];
      beam.setAttribute('points', [p1, p2, p3, p4].map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '));
      patch.setAttribute('x1', Math.max(4, p1[0]).toFixed(1));
      patch.setAttribute('x2', Math.min(316, p2[0]).toFixed(1));
      var r = 46;
      angleArc.setAttribute('d', 'M ' + (hx - L - r) + ' ' + gy + ' A ' + r + ' ' + r + ' 0 0 1 ' + (hx - L + ux * r).toFixed(1) + ' ' + (gy + uy * r).toFixed(1));
      angleText.setAttribute('x', (hx - L - r - 4).toFixed(1));
      angleText.textContent = slider.value + '°';
      var pct = Math.round(Math.sin(a) * 100);
      var spread = 1 / Math.sin(a);
      label.textContent = slider.value + '°';
      out.innerHTML = 'The same beam covers <strong>' + spread.toFixed(2) + '×</strong> as much ground, so each square meter gets <strong>' + pct + '%</strong> of the energy it would get with the Sun straight overhead.';
    }
    slider.addEventListener('input', update);
    document.querySelectorAll('.sth-beam-btn').forEach(function (b) {
      b.addEventListener('click', function () { slider.value = b.getAttribute('data-angle'); update(); });
    });
    update();
  }

  /* ─── Precession sky map ─────────────────────────────────────────── */
  // J2000 RA (deg) / Dec (deg) / visual magnitude
  var STARS = {
    Polaris: [37.95, 89.264, 1.98], Kochab: [222.68, 74.155, 2.08], Pherkad: [230.18, 71.834, 3.0],
    Yildun: [263.05, 86.586, 4.35], epsUMi: [251.49, 82.037, 4.2], zetUMi: [236.01, 77.795, 4.3], etaUMi: [244.38, 75.755, 4.95],
    Dubhe: [165.93, 61.751, 1.8], Merak: [165.46, 56.382, 2.37], Phecda: [178.46, 53.695, 2.44], Megrez: [183.86, 57.033, 3.31],
    Alioth: [193.51, 55.960, 1.77], Mizar: [200.98, 54.925, 2.04], Alkaid: [206.89, 49.313, 1.86],
    Thuban: [211.10, 64.376, 3.65], Vega: [279.23, 38.784, 0.03], Deneb: [310.36, 45.280, 1.25],
    Alderamin: [319.64, 62.586, 2.45], Errai: [354.84, 77.632, 3.21], iotaHer: [264.87, 46.006, 3.80],
    Schedar: [10.13, 56.537, 2.24], Caph: [2.29, 59.150, 2.28], gamCas: [14.18, 60.717, 2.47], Ruchbah: [21.45, 60.235, 2.68], Segin: [28.60, 63.670, 3.37],
    Sadr: [305.56, 40.257, 2.23], delCyg: [296.24, 45.131, 2.87], Eltanin: [269.15, 51.489, 2.24], Rastaban: [262.61, 52.301, 2.79]
  };
  var LINES = [
    ['Polaris', 'Yildun', 'epsUMi', 'zetUMi', 'Kochab', 'Pherkad', 'etaUMi', 'zetUMi'],
    ['Alkaid', 'Mizar', 'Alioth', 'Megrez', 'Dubhe', 'Merak', 'Phecda', 'Megrez'],
    ['Caph', 'Schedar', 'gamCas', 'Ruchbah', 'Segin'],
    ['Deneb', 'Sadr'], ['Sadr', 'delCyg']
  ];
  var LABELS = {
    Polaris: 'Polaris', Thuban: 'Thuban', Vega: 'Vega', Deneb: 'Deneb', Alderamin: 'Alderamin',
    Errai: 'Errai', iotaHer: 'ι Herculis', Kochab: 'Kochab', delCyg: 'δ Cygni'
  };
  var GROUP_LABELS = [['Dubhe', 'Big Dipper'], ['gamCas', 'Cassiopeia'], ['Pherkad', 'Little Dipper']];

  function toEcliptic(raDeg, decDeg) {
    var e = 23.4393 * D2R, a = raDeg * D2R, d = decDeg * D2R;
    var beta = Math.asin(Math.sin(d) * Math.cos(e) - Math.cos(d) * Math.sin(e) * Math.sin(a));
    var lam = Math.atan2(Math.sin(a) * Math.cos(e) + Math.tan(d) * Math.sin(e), Math.cos(a));
    return { lam: lam, beta: beta };
  }
  function poleAt(year) {
    return { lam: (90 - 50.29 * (year - 2000) / 3600) * D2R, beta: (90 - 23.44) * D2R };
  }
  function angSep(a, b) {
    var c = Math.sin(a.beta) * Math.sin(b.beta) + Math.cos(a.beta) * Math.cos(b.beta) * Math.cos(a.lam - b.lam);
    return Math.acos(Math.max(-1, Math.min(1, c))) * R2D;
  }
  function yearLabel(y) {
    y = Math.round(y);
    return y <= 0 ? (1 - y) + ' BC' : 'AD ' + y;
  }

  function initPrecession() {
    var box = document.getElementById('sth-sky-stage');
    var canvas = document.getElementById('sth-sky-canvas');
    var slider = document.getElementById('sth-year-slider');
    if (!box || !canvas || !slider || !window.SimKit) return;
    var ecl = {};
    Object.keys(STARS).forEach(function (k) { ecl[k] = toEcliptic(STARS[k][0], STARS[k][1]); });
    var view = null;
    var pending = false;
    function invalidate() {
      if (pending) return;
      pending = true;
      Promise.resolve().then(function () { pending = false; if (view) draw(); });
    }
    var MAXR = 46;

    function draw() {
      var ctx = view.ctx, w = view.width, h = view.height;
      var year = +slider.value;
      var cx = w / 2, cy = h / 2, k = Math.min(w, h) / 2 / MAXR * 0.94;
      var P = function (p) {
        var rho = 90 - p.beta * R2D;
        return { x: cx + k * rho * Math.cos(p.lam), y: cy - k * rho * Math.sin(p.lam) };
      };
      var g = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w, h) * 0.7);
      g.addColorStop(0, '#16213d'); g.addColorStop(1, '#070b16');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

      // Precession circle with year ticks
      ctx.strokeStyle = 'rgba(255, 200, 90, 0.4)';
      ctx.setLineDash([4, 5]);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, k * 23.44, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '500 10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      [-5999, -1999, 2000, 6000, 10000, 14000].forEach(function (y) {
        var p = P(poleAt(y));
        ctx.fillStyle = 'rgba(255, 200, 90, 0.65)';
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2); ctx.fill();
        var dx = p.x - cx, dy = p.y - cy, L = Math.hypot(dx, dy) || 1;
        if (w >= 480 || y === 2000) ctx.fillText(yearLabel(y), cx + dx / L * (L - 14), cy + dy / L * (L - 14) + 3);
      });

      // Path the pole has travelled from today to the chosen year
      var y0 = 2026;
      ctx.strokeStyle = 'rgba(255, 200, 90, 0.95)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      var steps = 120;
      for (var i = 0; i <= steps; i++) {
        var p = P(poleAt(y0 + (year - y0) * i / steps));
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      // Constellation lines
      ctx.strokeStyle = 'rgba(150, 180, 230, 0.35)';
      ctx.lineWidth = 1;
      LINES.forEach(function (line) {
        ctx.beginPath();
        line.forEach(function (n, idx) { var p = P(ecl[n]); if (idx === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
        ctx.stroke();
      });

      // Stars
      Object.keys(STARS).forEach(function (n) {
        var p = P(ecl[n]);
        var m = STARS[n][2];
        var r = Math.max(1.1, 4.4 - m * 0.85);
        ctx.fillStyle = n === 'Vega' ? '#dfe9ff' : '#fff6e6';
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.font = '600 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(230, 238, 255, 0.92)';
      Object.keys(LABELS).forEach(function (n) {
        var p = P(ecl[n]);
        ctx.fillText(LABELS[n], p.x + 6, p.y - 5);
      });
      ctx.fillStyle = 'rgba(150, 180, 230, 0.75)';
      ctx.font = 'italic 500 11px Inter, system-ui, sans-serif';
      GROUP_LABELS.forEach(function (gl) {
        var p = P(ecl[gl[0]]);
        ctx.fillText(gl[1], p.x + 8, p.y + 14);
      });

      // Centre of the circle
      ctx.strokeStyle = 'rgba(255, 200, 90, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - 5, cy); ctx.lineTo(cx + 5, cy); ctx.moveTo(cx, cy - 5); ctx.lineTo(cx, cy + 5); ctx.stroke();

      // Current pole
      var pole = poleAt(year);
      var pp = P(pole);
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(pp.x, pp.y, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pp.x - 15, pp.y); ctx.lineTo(pp.x - 5, pp.y); ctx.moveTo(pp.x + 5, pp.y); ctx.lineTo(pp.x + 15, pp.y);
      ctx.moveTo(pp.x, pp.y - 15); ctx.lineTo(pp.x, pp.y - 5); ctx.moveTo(pp.x, pp.y + 5); ctx.lineTo(pp.x, pp.y + 15);
      ctx.stroke();

      // Nearest bright star
      var best = null;
      Object.keys(STARS).forEach(function (n) {
        if (STARS[n][2] > 4) return;
        var s = angSep(pole, ecl[n]);
        if (!best || s < best.sep) best = { name: n, sep: s };
      });
      var nice = LABELS[best.name] || best.name;
      document.getElementById('sth-year-label').textContent = yearLabel(year);
      document.getElementById('sth-pole-readout').innerHTML = best.sep < 5
        ? 'In <strong>' + yearLabel(year) + '</strong>, Earth’s axis points <strong>' + best.sep.toFixed(1) + '°</strong> from <strong>' + nice + '</strong>, so ' + nice + ' would serve as a pole star.'
        : 'In <strong>' + yearLabel(year) + '</strong>, no bright star sits near the pole. The closest is ' + nice + ', ' + best.sep.toFixed(0) + '° away, so there would be no good “North Star.”';
    }

    view = SimKit.canvas2d(canvas, { box: box, onResize: invalidate });
    slider.addEventListener('input', invalidate);
    document.querySelectorAll('.sth-year-btn').forEach(function (b) {
      b.addEventListener('click', function () { slider.value = b.getAttribute('data-year'); invalidate(); });
    });
    invalidate();
  }

  /* ─── Stage tabs ─────────────────────────────────────────────────── */
  function initStages() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.sth-stage-btn'));
    var panels = document.querySelectorAll('.sth-stage-panel');
    function select(btn, focus) {
      var stage = btn.getAttribute('data-stage');
      buttons.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (p) { p.classList.toggle('active', p.getAttribute('data-stage') === stage); });
      if (focus) btn.focus();
    }
    buttons.forEach(function (btn, i) {
      btn.addEventListener('click', function () { select(btn); });
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); select(buttons[(i + 1) % buttons.length], true); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); select(buttons[(i - 1 + buttons.length) % buttons.length], true); }
      });
    });
    document.querySelectorAll('.sth-stage-next').forEach(function (b) {
      b.addEventListener('click', function () {
        var target = buttons[+b.getAttribute('data-goto')];
        if (target) { select(target, true); }
      });
    });
  }

  /* ─── Warm-up poll ───────────────────────────────────────────────── */
  function initPoll() {
    var out = document.getElementById('sth-poll-result');
    if (!out) return;
    var replies = {
      distance: 'That is the most common answer, even among college graduates. Keep it in mind. Further down you will find out exactly how far Earth is from the Sun in January and in July, and the numbers may surprise you.',
      tilt: 'Good instinct. Now the question is <em>how</em> a tilt can make the ground warmer. The five stages below build the full answer.',
      clouds: 'Weather matters for any single day, but it cannot explain why the whole Southern Hemisphere has summer while the north has winter. Look for the bigger cause in the stages below.'
    };
    document.querySelectorAll('.sth-poll-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.sth-poll-btn').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        out.innerHTML = replies[b.getAttribute('data-choice')];
        out.hidden = false;
      });
    });
  }

  /* ─── Quiz ───────────────────────────────────────────────────────── */
  var QUIZ = {
    q1: { a: 'b', why: 'The tilt changes how steeply sunlight strikes the ground and how long the Sun stays up. Distance barely changes, by only about 3%.' },
    q2: { a: 'c', why: 'Perihelion, Earth’s closest approach, comes around January 3, during the Northern Hemisphere’s winter. That is strong evidence that distance does not cause the seasons.' },
    q3: { a: 'a', why: 'A slanted beam spreads the same energy over more ground, so each square meter warms less.' },
    q4: { a: 'd', why: 'The June solstice falls on June 20 or 21. On that day the Sun is straight overhead at the Tropic of Cancer (23.4°N).' },
    q5: { a: 'b', why: 'At an equinox the Sun sits straight over the Equator, and the line between day and night runs through both poles.' },
    q6: { a: 'a', why: 'The line between day and night always cuts the Equator exactly in half, so the Equator gets about 12 hours of daylight all year.' },
    q7: { a: 'c', why: 'Precession is the slow, top-like wobble of Earth’s axis. One full circle takes about 26,000 years.' },
    q8: { a: 'd', why: 'Around AD 14,000 the axis will point near Vega. Use the sky map above to check.' },
    q9: { a: 'b', why: 'With the simulator set to 40°N on June 21, daylight comes out just under 15 hours. Bending of sunlight by the air adds a few more minutes.' },
    q10: { a: 'a', why: 'Opposite hemispheres always have opposite seasons. December brings the start of summer to Australia and Argentina.' },
    q11: { a: 'c', why: 'Genesis 1:14 says the lights are “signs to mark sacred times, and days and years.” They are a calendar, not a fortune-teller.' },
    q12: { a: 'b', why: 'With 0° tilt the Sun would always be overhead at the Equator, and every place would get 12 hours of daylight every day. Try it in the simulator.' }
  };

  function initQuiz() {
    var checkBtn = document.getElementById('sth-quiz-check');
    var clearBtn = document.getElementById('sth-quiz-clear');
    var resultDiv = document.getElementById('sth-quiz-result');
    if (!checkBtn) return;

    checkBtn.addEventListener('click', function () {
      var score = 0, total = 0;
      Object.keys(QUIZ).forEach(function (q) {
        var block = document.querySelector('.sth-quiz-question[data-q="' + q + '"]');
        if (!block) return;
        var fb = block.querySelector('.sth-quiz-feedback');
        var picked = block.querySelector('input:checked');
        block.querySelectorAll('.sth-quiz-option').forEach(function (o) { o.classList.remove('is-right', 'is-wrong'); });
        if (!picked) { fb.hidden = true; block.classList.remove('answered'); return; }
        total++;
        var right = picked.value === QUIZ[q].a;
        if (right) score++;
        picked.closest('.sth-quiz-option').classList.add(right ? 'is-right' : 'is-wrong');
        var correct = block.querySelector('input[value="' + QUIZ[q].a + '"]');
        if (correct) correct.closest('.sth-quiz-option').classList.add('is-right');
        fb.innerHTML = '<strong>' + (right ? '✓ Correct.' : '✗ Not quite.') + '</strong> ' + QUIZ[q].why;
        fb.className = 'sth-quiz-feedback ' + (right ? 'right' : 'wrong');
        fb.hidden = false;
      });
      if (total === 0) {
        resultDiv.innerHTML = 'Answer at least one question first.';
        resultDiv.style.display = 'block';
        return;
      }
      var n = Object.keys(QUIZ).length;
      var pct = Math.round(score / total * 100);
      var msg = pct === 100 ? '<strong>Excellent!</strong> ' : pct >= 75 ? '<strong>Strong work.</strong> ' : '<strong>Keep going.</strong> ';
      resultDiv.innerHTML = msg + score + ' of ' + total + ' correct (' + pct + '%)' + (total < n ? ', with ' + (n - total) + ' left unanswered.' : '.') + ' Read the explanation under each question.';
      resultDiv.style.display = 'block';
    });

    clearBtn.addEventListener('click', function () {
      document.querySelectorAll('.sth-quiz-question input').forEach(function (i) { i.checked = false; });
      document.querySelectorAll('.sth-quiz-option').forEach(function (o) { o.classList.remove('is-right', 'is-wrong'); });
      document.querySelectorAll('.sth-quiz-feedback').forEach(function (f) { f.hidden = true; });
      resultDiv.style.display = 'none';
    });
  }

  // Exposed for quick checks in the console / tests
  window.SeasonsModel = { solar: solar, dayLength: dayLength, noonAltitude: noonAltitude, insolation: insolation, poleAt: poleAt, toEcliptic: toEcliptic, angSep: angSep };

  function init() {
    initStages();
    initBeam();
    initPoll();
    initSimulator();
    initPrecession();
    initQuiz();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
