/* Locked-ring fidget geometry for the Tinkercad Codeblocks lesson.

   Nested rings only make a fidget if they can't be lifted apart. Each ring here
   is a "chevron" wall: it climbs outward in small slabs (a loop!), runs straight
   for a while, then steps back in. The next ring out wears the same chevron as
   a groove, so ring i-1's ridge sits inside ring i's groove and cannot pass the
   narrow mouth. Every slab is a plain extruded tube (or star tube), which is
   exactly what the Codeblocks program stacks, and every ring rests on the bed
   so it prints in place.

   Radii here are "tip" radii, the number you type into the Radius slot. A star's
   flat sides sit closer to the centre than its points, so the true air gap
   across a side is the tip gap times sideFactor(). All checks are done on the
   true cross-section (tip radius × sideFactor), not on the tip numbers.

   Pure functions, no DOM: loaded by the lab as a script and by the tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FidgetRings = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SLAB = 0.5;                         // mm of height per slab = two printed layers
  var STAR_POINTS = 8, STAR_DEPTH = 0.76; // the star the class builds: 8 points, 76% inner radius
  var ROUND_SEGMENTS = 48;

  /* ── outlines ──────────────────────────────────────────────────────── */
  function unitOutline(shape) {
    var out = [], k, n;
    if (shape === 'round') {
      for (k = 0; k < ROUND_SEGMENTS; k++) out.push([Math.cos(2 * Math.PI * k / ROUND_SEGMENTS), Math.sin(2 * Math.PI * k / ROUND_SEGMENTS)]);
      return out;
    }
    n = STAR_POINTS * 2;
    for (k = 0; k < n; k++) {
      var a = Math.PI * k / STAR_POINTS, r = k % 2 ? STAR_DEPTH : 1;
      out.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return out;
  }

  // Distance from the centre to a flat side, divided by the tip radius.
  function sideFactor(shape) {
    if (shape === 'round') return 1;
    var o = unitOutline('star'), a = o[0], b = o[1];
    var len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return Math.abs(a[0] * b[1] - b[0] * a[1]) / len;
  }

  function unitArea(shape) {
    var o = unitOutline(shape), s = 0;
    for (var i = 0; i < o.length; i++) {
      var p = o[i], q = o[(i + 1) % o.length];
      s += p[0] * q[1] - q[0] * p[1];
    }
    return Math.abs(s) / 2;
  }

  // Radius added per slab so the wall leans at 45° across a side: SLAB / sideFactor.
  function slabRun(shape) { return Math.round(SLAB / sideFactor(shape) * 10) / 10; }

  /* ── one ring ──────────────────────────────────────────────────────── */
  // p: { shape, n, r, w, g, k, flat, step }
  //   r    tip radius of ring 1 at its base       w   wall
  //   g    tip gap between neighbouring walls     k   slabs that climb (and descend)
  //   flat height of ring 1's straight middle     step  how much taller each ring out is
  function ringSlabs(p, i) {
    var run = slabRun(p.shape);
    var base = p.r + (i - 1) * (p.w + p.g);
    var flat = p.flat + (i - 1) * p.step;
    var zs = [0], ros = [], j;
    for (j = 0; j < p.k; j++) { ros.push(base + j * run); zs.push((j + 1) * SLAB); }
    ros.push(base + p.k * run); zs.push(p.k * SLAB + flat);
    for (j = p.k - 1; j >= 0; j--) { ros.push(base + j * run); zs.push(zs[zs.length - 1] + SLAB); }
    return ros.map(function (ro, s) { return { z0: zs[s], z1: zs[s + 1], ro: ro, ri: ro - p.w }; });
  }

  function ringHeight(p, i) { var s = ringSlabs(p, i); return s[s.length - 1].z1; }

  // Closed cross-section outline in (tip radius, z), counter-clockwise.
  function ringOutline(p, i) {
    var s = ringSlabs(p, i), pts = [], j;
    for (j = 0; j < s.length; j++) { pts.push([s[j].ro, s[j].z0]); pts.push([s[j].ro, s[j].z1]); }
    for (j = s.length - 1; j >= 0; j--) { pts.push([s[j].ri, s[j].z1]); pts.push([s[j].ri, s[j].z0]); }
    // drop repeated points (the tube's top edge and the next slab's start coincide)
    return pts.filter(function (q, m) { var b = pts[(m + pts.length - 1) % pts.length]; return q[0] !== b[0] || q[1] !== b[1]; });
  }

  /* ── true cross-sections and distances ─────────────────────────────── */
  function truePolygon(p, i, dz) {
    var h = sideFactor(p.shape);
    return ringOutline(p, i).map(function (q) { return [q[0] * h, q[1] + (dz || 0)]; });
  }

  function ptSeg(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    var t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  function cross(ax, ay, bx, by, cx, cy) { return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax); }
  function segSeg(a, b, c, d) {
    var d1 = cross(a[0], a[1], b[0], b[1], c[0], c[1]), d2 = cross(a[0], a[1], b[0], b[1], d[0], d[1]);
    var d3 = cross(c[0], c[1], d[0], d[1], a[0], a[1]), d4 = cross(c[0], c[1], d[0], d[1], b[0], b[1]);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return 0;
    return Math.min(ptSeg(a[0], a[1], c[0], c[1], d[0], d[1]), ptSeg(b[0], b[1], c[0], c[1], d[0], d[1]),
      ptSeg(c[0], c[1], a[0], a[1], b[0], b[1]), ptSeg(d[0], d[1], a[0], a[1], b[0], b[1]));
  }
  function polyDistance(A, B) {
    var best = Infinity;
    for (var i = 0; i < A.length; i++) {
      var a = A[i], b = A[(i + 1) % A.length];
      for (var j = 0; j < B.length; j++) {
        var d = segSeg(a, b, B[j], B[(j + 1) % B.length]);
        if (d < best) best = d;
        if (best === 0) return 0;
      }
    }
    return best;
  }

  /* ── does it lock? ─────────────────────────────────────────────────── */
  // How far can ring i-1 move up (+) and down (−) relative to ring i before the
  // two touch? Infinity means nothing stops it: the rings fall apart.
  function playBetween(p, i) {
    var outer = truePolygon(p, i, 0), LIMIT = 25, STEP = 0.1;
    function free(d) { return polyDistance(truePolygon(p, i - 1, d), outer) > 1e-6; }
    function reach(sign) {
      var lo = 0, hi = null, d;
      for (d = STEP; d <= LIMIT; d += STEP) { if (!free(sign * d)) { hi = d; break; } lo = d; }
      if (hi === null) return Infinity;
      for (var k = 0; k < 14; k++) { var mid = (lo + hi) / 2; if (free(sign * mid)) lo = mid; else hi = mid; }
      return sign * lo;
    }
    return { down: reach(-1), up: reach(1) };
  }

  /* Everything the lab needs in one call. */
  function analyze(p) {
    var h = sideFactor(p.shape), i, rest = Infinity;
    for (i = 2; i <= p.n; i++) rest = Math.min(rest, polyDistance(truePolygon(p, i - 1), truePolygon(p, i)));
    var play = p.n >= 2 ? playBetween(p, 2) : { down: 0, up: 0 };
    var locked = p.n >= 2 && isFinite(play.down) && isFinite(play.up);
    var run = slabRun(p.shape);
    var ridge = p.k * run * h, gapTrue = p.g * h, wallTrue = p.w * h;
    return {
      h: h, run: run, ridge: ridge, gapTrue: gapTrue, wallTrue: wallTrue,
      clearance: p.n >= 2 ? rest : Infinity,
      down: play.down, up: play.up, locked: locked,
      play: locked ? play.up - play.down : Infinity
    };
  }

  /* Lift the outer ring by L and let the others hang. Returns each ring's rise. */
  function lift(p, an, L) {
    var z = [], i;
    for (i = 0; i < p.n; i++) z.push(0);
    z[p.n - 1] = Math.max(0, L);
    for (i = p.n - 1; i >= 1; i--) z[i - 1] = Math.max(0, z[i] + (isFinite(an.down) ? an.down : -1e9));
    return z;
  }

  /* ── numbers ───────────────────────────────────────────────────────── */
  function volume(p) {
    var A = unitArea(p.shape), v = 0;
    for (var i = 1; i <= p.n; i++) ringSlabs(p, i).forEach(function (s) { v += A * (s.ro * s.ro - s.ri * s.ri) * (s.z1 - s.z0); });
    return v;
  }
  function slabCount(p) { return p.n * (2 * p.k + 1); }

  /* ── mesh: each ring is one closed shell ───────────────────────────── */
  function triangles(p) {
    var u = unitOutline(p.shape), N = u.length, tris = [], i;
    function pt(rho, z, k) { return [rho * u[k % N][0], rho * u[k % N][1], z]; }
    for (i = 1; i <= p.n; i++) {
      var o = ringOutline(p, i);
      for (var e = 0; e < o.length; e++) {
        var P = o[e], Q = o[(e + 1) % o.length];
        for (var k = 0; k < N; k++) {
          var A = pt(P[0], P[1], k), B = pt(P[0], P[1], k + 1), C = pt(Q[0], Q[1], k + 1), D = pt(Q[0], Q[1], k);
          tris.push([A, B, C], [A, C, D]);
        }
      }
    }
    return tris;
  }

  function binaryStl(p) {
    var tris = triangles(p), buf = new ArrayBuffer(84 + tris.length * 50), dv = new DataView(buf), off = 84;
    var label = 'ClassroomOS locked ring fidget';
    for (var c = 0; c < label.length; c++) dv.setUint8(c, label.charCodeAt(c));
    dv.setUint32(80, tris.length, true);
    tris.forEach(function (t) {
      var ux = t[1][0] - t[0][0], uy = t[1][1] - t[0][1], uz = t[1][2] - t[0][2];
      var vx = t[2][0] - t[0][0], vy = t[2][1] - t[0][1], vz = t[2][2] - t[0][2];
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1;
      [nx / l, ny / l, nz / l].forEach(function (f) { dv.setFloat32(off, f, true); off += 4; });
      t.forEach(function (v) { v.forEach(function (f) { dv.setFloat32(off, f, true); off += 4; }); });
      dv.setUint16(off, 0, true); off += 2;
    });
    return buf;
  }

  var DEFAULTS = {
    star:  { shape: 'star',  n: 6, r: 14, w: 3, g: 1.5, k: 4, flat: 2, step: 1 },
    round: { shape: 'round', n: 6, r: 10, w: 2, g: 1,   k: 4, flat: 2, step: 1 }
  };

  return {
    SLAB: SLAB, DEFAULTS: DEFAULTS,
    unitOutline: unitOutline, sideFactor: sideFactor, unitArea: unitArea, slabRun: slabRun,
    ringSlabs: ringSlabs, ringHeight: ringHeight, ringOutline: ringOutline, truePolygon: truePolygon,
    polyDistance: polyDistance, analyze: analyze, lift: lift, volume: volume, slabCount: slabCount,
    triangles: triangles, binaryStl: binaryStl
  };
});
