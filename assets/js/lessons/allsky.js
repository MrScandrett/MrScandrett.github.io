/*
 * All-sky map for lessons/cosmology/constellations.html.
 *
 * Draws the whole celestial sphere at once on the lesson's canvas as an equirectangular chart
 * (right ascension runs east-to-west from left to right, as on printed star charts): all 88 IAU
 * constellation regions with their official boundaries and stick figures, about 3,400 naked-eye
 * stars, the Milky Way, the ecliptic and zodiac band, galaxies / nebulae / clusters, the Sun,
 * Moon and planets for today, and a set of "anomalies" such as black holes and pulsars.
 *
 * Data: assets/data/sky/allsky.json (built by scripts/build-allsky-data.mjs) and
 * assets/js/lessons/allsky-extras.js.
 */
(function () {
  'use strict';

  var RAD = Math.PI / 180;
  var X = window.ALLSKY_EXTRAS;

  var KIND_COLOR = {
    bh: '#ff9d3c', ns: '#5ee7ff', snr: '#ff6f6f', sn: '#ff8f8f', xr: '#c99bff', qso: '#ffd75e',
    star: '#ffb454', exo: '#7dffb0', spot: '#9fb4d6', sig: '#ff7bd0', dir: '#ffffff', probe: '#a8ffea', gal: '#c4a0ff', dark: '#8b8f9c'
  };
  var DSO_COLOR = { gal: '#c4a0ff', gc: '#ffb070', oc: '#ffe58a', pn: '#7dffb0', neb: '#ff8fc7', snr: '#ff7a7a' };
  var DSO_LABEL = { gal: 'Galaxy', gc: 'Globular cluster', oc: 'Open cluster', pn: 'Planetary nebula', neb: 'Nebula', snr: 'Supernova remnant' };
  var PLANET_COLOR = {
    Sun: '#ffd84a', Moon: '#e6ecf5', Mercury: '#b7b7b7', Venus: '#fff0b0', Mars: '#ff7a4a',
    Jupiter: '#e9c48f', Saturn: '#f2dc9a', Uranus: '#8be9f0', Neptune: '#6f8cff'
  };

  function create(opts) {
    var canvas = opts.canvas;
    var card = opts.card;
    var api = {};
    var data = null;
    var loading = null;
    var active = false;

    var view = { cra: 180, cdec: 0, s: 2 };
    var minS = 1, maxS = 60;
    var layers = { bounds: true, figures: true, names: true, stars: true, deep: true, planets: true, anomalies: true, milky: true, ecliptic: true, grid: false };
    var hover = null;       // { kind, obj }
    var selected = null;    // constellation id
    var pointerConst = null;
    var planets = [];
    var planetsAt = 0;
    var milkyLine = null;
    var milkyBands = [];
    var milkyTexture = [];
    var hits = [];
    var mapLabels = [];
    var drag = null;
    var pinch = null;
    var frameBox = { left: 0, top: 46, right: 0, bottom: 72, W: 800, H: 600 };
    var idIndex = {};

    // ── math ────────────────────────────────────────────────────────────
    function wrap180(d) { return ((d + 540) % 360) - 180; }
    function galToEq(l, b) {
      var aG = 192.85948 * RAD, dG = 27.12825 * RAD, th = 122.93192 * RAD;
      l *= RAD; b *= RAD;
      var sinD = Math.sin(b) * Math.sin(dG) + Math.cos(b) * Math.cos(dG) * Math.cos(th - l);
      var dec = Math.asin(sinD);
      var ra = aG + Math.atan2(Math.cos(b) * Math.sin(th - l), Math.sin(b) * Math.cos(dG) - Math.cos(b) * Math.sin(dG) * Math.cos(th - l));
      return [((ra / RAD) % 360 + 360) % 360, dec / RAD];
    }
    function bvToColor(bv) {
      var t = Math.max(-0.3, Math.min(1.8, bv));
      var r, g, b;
      if (t < 0) { r = 155 + (t + 0.3) * 240; g = 176 + (t + 0.3) * 190; b = 255; }
      else if (t < 0.6) { r = 210 + t * 75; g = 224 + t * 25; b = 255 - t * 60; }
      else if (t < 1.2) { r = 255; g = 239 - (t - 0.6) * 90; b = 219 - (t - 0.6) * 250; }
      else { r = 255; g = 185 - (t - 1.2) * 130; b = 69 - (t - 1.2) * 90; }
      function c(v) { return Math.max(0, Math.min(255, Math.round(v))); }
      return 'rgb(' + c(r) + ',' + c(g) + ',' + c(b) + ')';
    }

    // Stable pseudo-random values let diffuse objects keep the same structure
    // from frame to frame without shipping bitmap artwork for every object.
    function noise(n) {
      var x = Math.sin(n * 91.3458 + 17.13) * 47453.5453;
      return x - Math.floor(x);
    }

    function rgba(hex, alpha) {
      var value = parseInt(hex.slice(1), 16);
      return 'rgba(' + ((value >> 16) & 255) + ',' + ((value >> 8) & 255) + ',' + (value & 255) + ',' + alpha + ')';
    }

    // ── viewport / projection ───────────────────────────────────────────
    function box() {
      var b = frameBox;
      return { l: b.left, t: b.top, r: b.W - b.right, b: b.H - b.bottom };
    }
    function center() { var v = box(); return { x: (v.l + v.r) / 2, y: (v.t + v.b) / 2, w: v.r - v.l, h: v.b - v.t }; }
    function px(ra) { var c = center(); return c.x - wrap180(ra - view.cra) * view.s; }
    function py(dec) { var c = center(); return c.y - (dec - view.cdec) * view.s; }
    function pxRaw(lon) { var c = center(); return c.x - (lon - view.cra) * view.s; }
    function screenToSky(x, y) {
      var c = center();
      return { ra: (((view.cra - (x - c.x) / view.s) % 360) + 360) % 360, dec: view.cdec - (y - c.y) / view.s };
    }
    function fitScale() {
      var c = center();
      return Math.max(0.6, Math.min(c.w / 360, c.h / 180));
    }
    function clampView() {
      minS = fitScale();
      view.s = Math.max(minS, Math.min(maxS, view.s));
      var c = center();
      var halfDeg = (c.h / 2) / view.s;
      var lim = Math.max(0, 90 - halfDeg);
      view.cdec = Math.max(-lim, Math.min(lim, view.cdec));
      if (halfDeg >= 90) view.cdec = 0;
      view.cra = ((view.cra % 360) + 360) % 360;
    }
    function zoomAt(x, y, factor) {
      var before = screenToSky(x, y);
      view.s = Math.max(minS, Math.min(maxS, view.s * factor));
      var c = center();
      view.cra = before.ra + (x - c.x) / view.s;
      view.cdec = before.dec + (y - c.y) / view.s;
      clampView();
    }

    // ── geometry helpers ────────────────────────────────────────────────
    function pointInPoly(lon, lat, poly) {
      var inside = false;
      for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
        if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
      }
      return inside;
    }
    function constAt(ra, dec) {
      if (!data) return null;
      for (var i = 0; i < data.con.length; i++) {
        var c = data.con[i];
        if (!c.b.length || dec < c.minLat || dec > c.maxLat) continue;
        for (var k = -2; k <= 2; k++) {
          var lon = ra + 360 * k;
          if (lon < c.minLon || lon > c.maxLon) continue;
          if (pointInPoly(lon, dec, c.b)) return c;
        }
      }
      return null;
    }

    // ── data ────────────────────────────────────────────────────────────
    var featuredIds = Object.keys(X.featured).map(function (k) { return X.featured[k]; });
    function prepare(json) {
      json.con.forEach(function (c) {
        var lo = 1e9, hi = -1e9, la = 1e9, lb = -1e9;
        c.b.forEach(function (p) { lo = Math.min(lo, p[0]); hi = Math.max(hi, p[0]); la = Math.min(la, p[1]); lb = Math.max(lb, p[1]); });
        c.minLon = lo; c.maxLon = hi; c.minLat = la; c.maxLat = lb;
        c.meaning = X.meanings[c.id] || '';
        c.origin = X.originOf(c.id);
        c.abbr = c.id.replace(/2$/, '');
        c.featured = featuredIds.indexOf(c.id) >= 0;
        idIndex[c.id] = c;
      });
      json.stars.forEach(function (s) { s.color = bvToColor(s[3]); });
      json.dso.forEach(function (d) {
        var nm = X.messierNames[d[0]];
        d.label = nm || d[6] || d[0];
        d.short = d[0];
      });
      function galacticTrack(lat, wobble) {
        var track = [];
        for (var l = 0; l <= 360; l += 2) {
          track.push(galToEq(l, lat + Math.sin((l * 1.7 + wobble) * RAD) * 0.8));
        }
        var prev = track[0][0];
        for (var i = 1; i < track.length; i++) {
          var a = track[i][0];
          while (a - prev > 180) a -= 360;
          while (a - prev < -180) a += 360;
          track[i][0] = a; prev = a;
        }
        return track;
      }
      milkyLine = galacticTrack(0, 0);
      milkyBands = [-10, -6, -3, 3, 6, 10].map(function (lat, i) {
        return galacticTrack(lat, i * 41);
      });
      milkyTexture = [];
      for (var m = 0; m < 210; m++) {
        var gl = noise(m + 2) * 360;
        var gb = (noise(m + 91) + noise(m + 117) - 1) * 11;
        var eq = galToEq(gl, gb);
        var centerDistance = Math.min(gl, 360 - gl);
        milkyTexture.push({
          ra: eq[0], dec: eq[1],
          r: 0.7 + noise(m + 211) * 2.2,
          a: (0.018 + noise(m + 307) * 0.045) * (1.35 - Math.min(1, centerDistance / 150)),
          warm: centerDistance < 65
        });
      }
      return json;
    }

    function load() {
      if (data) return Promise.resolve(data);
      if (loading) return loading;
      loading = fetch(opts.dataUrl).then(function (r) {
        if (!r.ok) throw new Error('sky data ' + r.status);
        return r.json();
      }).then(function (j) { data = prepare(j); refreshPlanets(true); return data; });
      return loading;
    }

    function refreshPlanets(force) {
      var now = Date.now();
      if (!force && now - planetsAt < 60000) return;
      planetsAt = now;
      planets = X.ephemeris(new Date(now));
    }

    // ── drawing ─────────────────────────────────────────────────────────
    function tracePoly(pts, k) {
      for (var i = 0; i < pts.length; i++) {
        var x = pxRaw(pts[i][0] + 360 * k), y = py(pts[i][1]);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    }

    var ctx = null;

    function drawBackground(v) {
      var g = ctx.createLinearGradient(0, v.t, 0, v.b);
      g.addColorStop(0, '#02050b');
      g.addColorStop(0.5, '#030711');
      g.addColorStop(1, '#010308');
      ctx.fillStyle = '#010207';
      ctx.fillRect(0, 0, frameBox.W, frameBox.H);
      ctx.fillStyle = g;
      ctx.fillRect(v.l, v.t, v.r - v.l, v.b - v.t);
    }

    function drawMilkyWay() {
      if (!layers.milky || !milkyLine) return;
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      // To dark-adapted eyes the Milky Way is smoky gray, not electric blue.
      [[30, 0.027], [20, 0.034], [11, 0.04]].forEach(function (w) {
        ctx.lineWidth = w[0] * view.s;
        ctx.strokeStyle = 'rgba(216,211,197,' + w[1] + ')';
        for (var k = -2; k <= 2; k++) {
          ctx.beginPath();
          tracePoly(milkyLine, k);
          ctx.stroke();
        }
      });
      milkyBands.forEach(function (band, index) {
        ctx.lineWidth = (1.5 + (index % 3)) * view.s;
        ctx.strokeStyle = index < 3 ? 'rgba(186,194,202,0.028)' : 'rgba(224,216,195,0.022)';
        for (var k = -2; k <= 2; k++) {
          ctx.beginPath(); tracePoly(band, k); ctx.stroke();
        }
      });
      ctx.globalCompositeOperation = 'screen';
      milkyTexture.forEach(function (p) {
        var y = py(p.dec);
        forCopies(p.ra, function (x) {
          var rr = p.r * Math.min(2.2, Math.max(0.75, view.s * 0.65));
          ctx.fillStyle = p.warm ? 'rgba(231,205,161,' + p.a + ')' : 'rgba(197,207,211,' + p.a + ')';
          ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
        });
      });
      // Galactic center bulge
      var gx = px(266.417), gy = py(-29.008);
      var rad = 14 * view.s;
      var gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad);
      gr.addColorStop(0, 'rgba(231,198,145,0.16)');
      gr.addColorStop(0.45, 'rgba(204,191,169,0.075)');
      gr.addColorStop(1, 'rgba(204,191,169,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(gx, gy, rad, 0, Math.PI * 2); ctx.fill();
      // The Great Rift is a real foreground dust lane, so subtract light rather
      // than drawing another colored ribbon.
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = Math.max(2, 2.4 * view.s);
      ctx.strokeStyle = 'rgba(1,3,8,0.22)';
      for (var dk = -2; dk <= 2; dk++) {
        ctx.beginPath(); tracePoly(milkyBands[2], dk); ctx.stroke();
      }
      ctx.restore();
    }

    function eclipticDec(ra) {
      return Math.atan(Math.tan(23.4393 * RAD) * Math.sin(ra * RAD)) / RAD;
    }

    function drawEcliptic(v) {
      if (!layers.ecliptic) return;
      ctx.save();
      // zodiac band (+/- 8 degrees)
      ctx.fillStyle = 'rgba(246,183,60,0.06)';
      for (var k = -2; k <= 2; k++) {
        ctx.beginPath();
        var first = true, ra, x, y;
        for (ra = 0; ra <= 360; ra += 3) {
          x = pxRaw(ra + 360 * k); y = py(eclipticDec(ra) + 8);
          if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
        }
        for (ra = 360; ra >= 0; ra -= 3) ctx.lineTo(pxRaw(ra + 360 * k), py(eclipticDec(ra) - 8));
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(246,183,60,0.7)';
      ctx.lineWidth = 1.3;
      ctx.setLineDash([6, 5]);
      for (k = -2; k <= 2; k++) {
        ctx.beginPath();
        for (ra = 0; ra <= 360; ra += 2) {
          x = pxRaw(ra + 360 * k); y = py(eclipticDec(ra));
          if (ra === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(246,183,60,0.85)';
      ctx.font = '600 10px "Space Mono", monospace';
      var lx = px(200);
      ctx.fillText('ECLIPTIC · the Sun’s yearly path', Math.max(v.l + 8, Math.min(v.r - 200, lx)), py(eclipticDec(200)) - 12);
      ctx.restore();
    }

    function drawGrid(v) {
      ctx.save();
      ctx.font = '500 9px "Space Mono", monospace';
      ctx.lineWidth = 1;
      var k, ra, dec;
      // Celestial equator is always useful.
      ctx.strokeStyle = 'rgba(160,190,230,0.28)';
      ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.moveTo(v.l, py(0)); ctx.lineTo(v.r, py(0)); ctx.stroke();
      ctx.setLineDash([]);
      if (layers.grid) {
        ctx.strokeStyle = 'rgba(120,160,220,0.14)';
        ctx.fillStyle = 'rgba(150,180,220,0.6)';
        for (dec = -60; dec <= 60; dec += 30) {
          ctx.beginPath(); ctx.moveTo(v.l, py(dec)); ctx.lineTo(v.r, py(dec)); ctx.stroke();
          ctx.fillText(dec + '°', v.l + 4, py(dec) - 3);
        }
        for (ra = 0; ra < 360; ra += 30) {
          var x = px(ra);
          if (x < v.l || x > v.r) continue;
          ctx.beginPath(); ctx.moveTo(x, v.t); ctx.lineTo(x, v.b); ctx.stroke();
          ctx.fillText((ra / 15) + 'h', x + 3, v.b - 5);
        }
      }
      ctx.restore();
    }

    function drawBoundaries() {
      var hoverId = pointerConst && pointerConst.id;
      var v = box();
      data.con.forEach(function (c) {
        if (!c.b.length) return;
        var featured = c.featured;
        var isSel = selected === c.id, isHover = hoverId === c.id;
        for (var k = -2; k <= 2; k++) {
          var x0 = pxRaw(c.maxLon + 360 * k), x1 = pxRaw(c.minLon + 360 * k);
          if (x0 > v.r + 40 || x1 < v.l - 40) continue;
          ctx.beginPath();
          tracePoly(c.b, k);
          ctx.closePath();
          if (isSel || isHover || featured) {
            ctx.fillStyle = isSel ? 'rgba(45,212,191,0.18)' : isHover ? 'rgba(124,156,255,0.15)' : 'rgba(45,212,191,0.045)';
            ctx.fill();
          }
          if (layers.bounds || isSel || isHover) {
            ctx.strokeStyle = isSel ? 'rgba(45,212,191,0.95)' : isHover ? 'rgba(190,205,255,0.9)' : 'rgba(150,170,205,0.32)';
            ctx.lineWidth = isSel ? 2 : isHover ? 1.6 : 0.9;
            ctx.stroke();
          }
        }
      });
    }

    function drawFigures() {
      if (!layers.figures) return;
      ctx.save();
      ctx.lineWidth = Math.min(1.8, 1 + view.s * 0.03);
      var v = box();
      data.con.forEach(function (c) {
        ctx.strokeStyle = c.featured ? 'rgba(45,212,191,0.75)' : 'rgba(75,190,200,0.5)';
        for (var k = -2; k <= 2; k++) {
          var x0 = pxRaw(c.maxLon + 360 * k), x1 = pxRaw(c.minLon + 360 * k);
          if (x0 > v.r + 40 || x1 < v.l - 40) continue;
          ctx.beginPath();
          c.l.forEach(function (seg) { tracePoly(seg, k); });
          ctx.stroke();
        }
      });
      ctx.restore();
    }

    function forCopies(ra, fn) {
      var v = box();
      var base = px(ra);
      var period = 360 * view.s;
      for (var k = -2; k <= 2; k++) {
        var x = base + k * period;
        if (x < v.l - 30 || x > v.r + 30) continue;
        fn(x);
      }
    }

    function drawMapLabel(text, x, y, color, important) {
      var width = ctx.measureText(text).width;
      var candidates = [
        { x: x, y: y },
        { x: x, y: y + 14 },
        { x: x - width - 8, y: y },
        { x: x, y: y - 13 }
      ];
      var chosen = null;
      for (var i = 0; i < candidates.length; i++) {
        var c = candidates[i];
        var b = { l: c.x - 2, r: c.x + width + 2, t: c.y - 11, b: c.y + 4 };
        var overlap = mapLabels.some(function (o) { return !(b.r < o.l || b.l > o.r || b.b < o.t || b.t > o.b); });
        if (!overlap) { chosen = { p: c, b: b }; break; }
      }
      if (!chosen && !important) return false;
      if (!chosen) chosen = { p: candidates[0], b: { l: x - 2, r: x + width + 2, t: y - 11, b: y + 4 } };
      mapLabels.push(chosen.b);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(1,3,8,0.9)';
      ctx.strokeText(text, chosen.p.x, chosen.p.y);
      ctx.fillStyle = color;
      ctx.fillText(text, chosen.p.x, chosen.p.y);
      return true;
    }

    function drawStars() {
      if (!layers.stars) return;
      var v = box();
      var scale = Math.min(1.8, 0.72 + view.s * 0.065);
      var maxMag = view.s < 3 ? 5.0 : view.s < 6 ? 5.4 : 5.6;
      for (var i = 0; i < data.stars.length; i++) {
        var s = data.stars[i];
        if (s[2] > maxMag) continue;
        var y = py(s[1]);
        if (y < v.t - 4 || y > v.b + 4) continue;
        // Apparent magnitude is logarithmic. This compressed flux curve keeps
        // Sirius visibly dominant without turning every catalog star into a bead.
        var flux = Math.pow(10, -0.4 * (s[2] + 1.46));
        var r = Math.max(0.42, Math.min(3.8, (0.48 + Math.pow(flux, 0.28) * 2.15) * scale));
        forCopies(s[0], function (x) {
          if (s[2] < 1.3) {
            ctx.save();
            ctx.globalAlpha = Math.max(0.08, 0.22 - s[2] * 0.035);
            var halo = ctx.createRadialGradient(x, y, 0, x, y, r * 3.4);
            halo.addColorStop(0, s.color);
            halo.addColorStop(0.3, s.color);
            halo.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = halo;
            ctx.beginPath(); ctx.arc(x, y, r * 3.4, 0, 6.2832); ctx.fill();
            ctx.restore();
          }
          // Faint stars are nearly colorless to human night vision. Temperature
          // color becomes readable only on the brighter stars.
          ctx.globalAlpha = s[2] < 2.5 ? 0.95 : Math.max(0.48, 0.88 - (s[2] - 2.5) * 0.13);
          ctx.fillStyle = s[2] < 3 ? s.color : '#dfe7ee';
          ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
          if (s[2] < 2) {
            ctx.globalAlpha = 0.88;
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(x, y, Math.max(0.45, r * 0.34), 0, 6.2832); ctx.fill();
          }
          ctx.globalAlpha = 1;
        });
      }
      // Named stars
      ctx.font = '500 10px Inter, sans-serif';
      X.namedStars.forEach(function (n) {
        var y = py(n[2]);
        if (y < v.t || y > v.b) return;
        forCopies(n[1], function (x) {
          if (view.s >= 2.6) {
            drawMapLabel(n[0], x + 6, y - 5, 'rgba(200,220,255,0.82)', false);
          }
          hits.push({ kind: 'star', x: x, y: y, r: 9, obj: n });
        });
      });
    }

    function drawDiffuseDso(t, x, y, r, seed) {
      var col = DSO_COLOR[t] || '#d7dce5';
      ctx.save();
      if (t === 'gal') {
        ctx.translate(x, y);
        ctx.rotate(-0.38 + (noise(seed) - 0.5) * 0.45);
        ctx.scale(1.65, 0.72);
        var gg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.25);
        gg.addColorStop(0, 'rgba(255,244,220,0.62)');
        gg.addColorStop(0.18, 'rgba(218,209,221,0.34)');
        gg.addColorStop(0.55, rgba(col, 0.13));
        gg.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.3, 0, 6.2832); ctx.fill();
      } else if (t === 'oc' || t === 'gc') {
        var count = t === 'gc' ? 24 : 13;
        for (var i = 0; i < count; i++) {
          var a = noise(seed + i * 3) * 6.2832;
          var spread = Math.pow(noise(seed + i * 3 + 1), t === 'gc' ? 1.8 : 0.75) * r;
          var rr = 0.35 + noise(seed + i * 3 + 2) * (t === 'gc' ? 0.75 : 1.05);
          ctx.globalAlpha = 0.28 + noise(seed + i * 5) * 0.55;
          ctx.fillStyle = i % 5 === 0 ? '#ffe5b8' : '#eef4ff';
          ctx.beginPath(); ctx.arc(x + Math.cos(a) * spread, y + Math.sin(a) * spread, rr, 0, 6.2832); ctx.fill();
        }
        if (t === 'gc') {
          var cg = ctx.createRadialGradient(x, y, 0, x, y, r);
          cg.addColorStop(0, 'rgba(255,226,177,0.25)'); cg.addColorStop(1, 'rgba(255,226,177,0)');
          ctx.globalAlpha = 1; ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
        }
      } else if (t === 'pn') {
        var pg = ctx.createRadialGradient(x, y, r * 0.12, x, y, r);
        pg.addColorStop(0, 'rgba(245,255,252,0.9)');
        pg.addColorStop(0.22, 'rgba(112,255,192,0.1)');
        pg.addColorStop(0.62, 'rgba(78,222,185,0.34)');
        pg.addColorStop(1, 'rgba(78,222,185,0)');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
      } else if (t === 'snr') {
        ctx.strokeStyle = rgba(col, 0.34);
        ctx.lineWidth = Math.max(0.7, r * 0.09);
        for (var f = 0; f < 7; f++) {
          var start = noise(seed + f * 5) * 6.2832;
          ctx.beginPath();
          ctx.arc(x, y, r * (0.6 + noise(seed + f * 5 + 1) * 0.4), start, start + 0.45 + noise(seed + f * 5 + 2) * 1.1);
          ctx.stroke();
        }
      } else {
        // Emission nebulae are irregular clouds, not solid pink boxes.
        for (var n = 0; n < 5; n++) {
          var nx = x + (noise(seed + n * 7) - 0.5) * r * 1.1;
          var ny = y + (noise(seed + n * 7 + 1) - 0.5) * r * 0.75;
          var nr = r * (0.42 + noise(seed + n * 7 + 2) * 0.45);
          var ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
          ng.addColorStop(0, rgba(col, t === 'snr' ? 0.22 : 0.18));
          ng.addColorStop(1, rgba(col, 0));
          ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(nx, ny, nr, 0, 6.2832); ctx.fill();
        }
      }
      ctx.restore();
    }

    function drawDeepSky() {
      if (!layers.deep) return;
      var v = box();
      ctx.save();
      ctx.font = '500 10px Inter, sans-serif';
      data.dso.forEach(function (d) {
        var mag = d[4];
        var famous = X.messierNames[d[0]] || d[6];
        // Declutter: show only brighter objects when zoomed out.
        if (view.s < 3 && !(famous && (mag === null || mag <= 5.5 || d[0] === 'M31'))) return;
        if (view.s < 6 && mag !== null && mag > 8 && !famous) return;
        var y = py(d[3]);
        if (y < v.t - 10 || y > v.b + 10) return;
        var size = d[5] || 6;
        var r = Math.max(4, Math.min(16, size * 0.5 * view.s / 8 + 4));
        forCopies(d[2], function (x) {
          var seed = d[0].split('').reduce(function (sum, ch) { return sum + ch.charCodeAt(0); }, 0);
          drawDiffuseDso(d[1], x, y, Math.max(5, r * 1.25), seed);
          if (view.s >= 3.4 || d[0] === 'M31' || d[0] === 'M45' || d[0] === 'M42') {
            drawMapLabel(d.label, x + r + 3, y + 3, 'rgba(226,229,236,0.88)', d[0] === 'M31');
          }
          hits.push({ kind: 'dso', x: x, y: y, r: Math.max(9, r + 3), obj: d });
        });
      });
      ctx.restore();
    }

    function glyphAnomaly(kind, x, y, t) {
      var col = KIND_COLOR[kind] || '#fff';
      ctx.save();
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.6;
      var pulse = 0.5 + 0.5 * Math.sin(t / 380);
      ctx.globalAlpha = 0.25 + 0.3 * pulse;
      ctx.beginPath(); ctx.arc(x, y, 9 + pulse * 5, 0, 6.2832); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      switch (kind) {
        case 'bh': ctx.arc(x, y, 6, 0, 6.2832); ctx.stroke(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, 3.4, 0, 6.2832); ctx.fill(); break;
        case 'ns': for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; ctx.moveTo(x + Math.cos(a) * 2, y + Math.sin(a) * 2); ctx.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); } ctx.stroke(); break;
        case 'snr': case 'sn': ctx.arc(x, y, 6, 0, 6.2832); ctx.stroke(); ctx.moveTo(x - 9, y); ctx.lineTo(x - 4, y); ctx.moveTo(x + 4, y); ctx.lineTo(x + 9, y); ctx.moveTo(x, y - 9); ctx.lineTo(x, y - 4); ctx.moveTo(x, y + 4); ctx.lineTo(x, y + 9); ctx.stroke(); break;
        case 'xr': ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6); ctx.moveTo(x + 6, y - 6); ctx.lineTo(x - 6, y + 6); ctx.stroke(); break;
        case 'qso': ctx.moveTo(x, y - 7); ctx.lineTo(x + 7, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 7, y); ctx.closePath(); ctx.stroke(); ctx.globalAlpha = 0.35; ctx.fill(); break;
        case 'star': ctx.moveTo(x, y - 7); ctx.lineTo(x + 6.5, y + 5); ctx.lineTo(x - 6.5, y + 5); ctx.closePath(); ctx.stroke(); break;
        case 'exo': ctx.arc(x, y, 3, 0, 6.2832); ctx.fill(); ctx.beginPath(); ctx.arc(x + 5, y - 4, 2, 0, 6.2832); ctx.stroke(); break;
        case 'spot': ctx.setLineDash([3, 2]); ctx.rect(x - 6, y - 6, 12, 12); ctx.stroke(); ctx.setLineDash([]); break;
        case 'sig': ctx.arc(x, y, 3, -1, 1); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 6, -1, 1); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 9, -1, 1); ctx.stroke(); break;
        case 'dir': ctx.moveTo(x - 8, y); ctx.lineTo(x + 6, y); ctx.moveTo(x + 1, y - 5); ctx.lineTo(x + 7, y); ctx.lineTo(x + 1, y + 5); ctx.stroke(); break;
        case 'probe': ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.stroke(); break;
        case 'dark': ctx.arc(x, y, 6, 0, 6.2832); ctx.stroke(); ctx.globalAlpha = 0.4; ctx.fill(); break;
        default: ctx.ellipse(x, y, 8, 4.5, -0.5, 0, 6.2832); ctx.stroke();
      }
      ctx.restore();
    }

    function drawAnomalies(t) {
      if (!layers.anomalies) return;
      var v = box();
      ctx.save();
      ctx.font = '600 10px Inter, sans-serif';
      X.anomalies.forEach(function (a) {
        var y = py(a.dec);
        if (y < v.t - 12 || y > v.b + 12) return;
        forCopies(a.ra, function (x) {
          glyphAnomaly(a.kind, x, y, t);
          if (view.s >= 2.4) {
            drawMapLabel(a.name, x + 12, y + 3, KIND_COLOR[a.kind] || '#fff', false);
          }
          hits.push({ kind: 'anomaly', x: x, y: y, r: 12, obj: a });
        });
      });
      ctx.restore();
    }

    function drawPlanetDisc(p, x, y, r) {
      var col = PLANET_COLOR[p.name];
      ctx.save();
      if (p.name === 'Sun') {
        var corona = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 4);
        corona.addColorStop(0, 'rgba(255,239,161,0.7)');
        corona.addColorStop(0.28, 'rgba(255,199,72,0.22)');
        corona.addColorStop(1, 'rgba(255,180,40,0)');
        ctx.fillStyle = corona; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, 6.2832); ctx.fill();
      } else {
        var pointGlow = ctx.createRadialGradient(x, y, 0, x, y, r * 2.8);
        pointGlow.addColorStop(0, 'rgba(255,255,255,0.5)');
        pointGlow.addColorStop(0.2, rgba(col, 0.22));
        pointGlow.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = pointGlow; ctx.beginPath(); ctx.arc(x, y, r * 2.8, 0, 6.2832); ctx.fill();
      }

      if (p.name === 'Moon') {
        var f = (1 - Math.cos((p.elong || 0) * RAD)) / 2;
        var right = (p.elong || 0) < 180;
        ctx.fillStyle = '#26303f';
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#d9dde0';
        ctx.beginPath();
        ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, !right);
        ctx.ellipse(x, y, Math.max(0.01, r * Math.abs(1 - 2 * f)), r, 0, Math.PI / 2, -Math.PI / 2, right === (f < 0.5));
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.38)'; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.stroke();
        ctx.restore();
        return;
      }

      var disc = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r * 1.12);
      disc.addColorStop(0, '#fff8dc');
      disc.addColorStop(0.24, col);
      disc.addColorStop(0.78, col);
      disc.addColorStop(1, '#151923');
      ctx.fillStyle = disc;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();

      if (p.name === 'Jupiter') {
        ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.clip();
        ctx.strokeStyle = 'rgba(111,70,45,0.6)'; ctx.lineWidth = Math.max(0.8, r * 0.22);
        [-0.48, 0.12, 0.5].forEach(function (dy) { ctx.beginPath(); ctx.moveTo(x - r, y + dy * r); ctx.lineTo(x + r, y + dy * r); ctx.stroke(); });
        ctx.fillStyle = 'rgba(168,72,45,0.82)'; ctx.beginPath(); ctx.ellipse(x + r * 0.38, y + r * 0.34, r * 0.22, r * 0.11, 0, 0, 6.2832); ctx.fill();
        ctx.restore();
      } else if (p.name === 'Saturn') {
        ctx.strokeStyle = '#d8c483'; ctx.lineWidth = Math.max(1, r * 0.24);
        ctx.beginPath(); ctx.ellipse(x, y, r * 2.05, r * 0.62, -0.24, 0, 6.2832); ctx.stroke();
        // Redraw the near half of the ring over the planet.
        ctx.strokeStyle = '#f2dfa0'; ctx.lineWidth = Math.max(0.7, r * 0.14);
        ctx.beginPath(); ctx.ellipse(x, y, r * 2.05, r * 0.62, -0.24, 0, Math.PI); ctx.stroke();
      } else if (p.name === 'Mars') {
        ctx.fillStyle = 'rgba(74,38,34,0.65)'; ctx.beginPath(); ctx.arc(x + r * 0.24, y - r * 0.1, Math.max(0.7, r * 0.2), 0, 6.2832); ctx.fill();
        ctx.fillStyle = 'rgba(245,230,205,0.78)'; ctx.beginPath(); ctx.ellipse(x, y - r * 0.82, r * 0.28, r * 0.1, 0, 0, 6.2832); ctx.fill();
      } else if (p.name === 'Mercury') {
        ctx.fillStyle = 'rgba(65,65,70,0.55)';
        [[-.35,-.2,.13],[.28,-.34,.1],[.22,.28,.16],[-.18,.42,.08]].forEach(function (crater) {
          ctx.beginPath(); ctx.arc(x + crater[0] * r, y + crater[1] * r, Math.max(0.5, crater[2] * r), 0, 6.2832); ctx.fill();
        });
      } else if (p.name === 'Venus') {
        ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.clip();
        ctx.strokeStyle = 'rgba(255,250,219,0.58)'; ctx.lineWidth = Math.max(0.8, r * 0.1);
        [-.48,-.12,.24,.54].forEach(function (dy, i) { ctx.beginPath(); ctx.moveTo(x - r, y + dy * r); ctx.quadraticCurveTo(x + (i % 2 ? -.2 : .2) * r, y + (dy + .12) * r, x + r, y + dy * r); ctx.stroke(); });
        ctx.restore();
      } else if (p.name === 'Uranus') {
        ctx.strokeStyle = 'rgba(176,230,229,0.45)'; ctx.lineWidth = Math.max(0.6, r * 0.045);
        ctx.beginPath(); ctx.ellipse(x, y, r * 1.62, r * 0.3, 1.36, 0, 6.2832); ctx.stroke();
      } else if (p.name === 'Neptune') {
        ctx.fillStyle = 'rgba(28,42,116,0.68)'; ctx.beginPath(); ctx.ellipse(x + r * 0.28, y + r * 0.18, r * 0.2, r * 0.11, -0.25, 0, 6.2832); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 0.65;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.stroke();
      ctx.restore();
    }

    function drawPlanets() {
      if (!layers.planets) return;
      var v = box();
      ctx.save();
      ctx.font = '700 11px Inter, sans-serif';
      planets.forEach(function (p) {
        var y = py(p.dec);
        if (y < v.t - 14 || y > v.b + 14) return;
        var r = p.name === 'Sun' ? 8 : p.name === 'Moon' ? 6.5 : p.name === 'Jupiter' || p.name === 'Saturn' ? 5.5 : 4.2;
        forCopies(p.ra, function (x) {
          drawPlanetDisc(p, x, y, r);
          drawMapLabel(p.name, x + r + 5, y + 4, '#fff', true);
          hits.push({ kind: 'planet', x: x, y: y, r: r + 8, obj: p });
        });
      });
      ctx.restore();
    }

    function drawLabels() {
      if (!layers.names) return;
      var v = box();
      var full = view.s >= 2.7;
      var size = Math.max(9, Math.min(15, 8 + view.s * 0.35));
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '600 ' + size + 'px Inter, sans-serif';
      data.con.forEach(function (c) {
        var y = py(c.y);
        if (y < v.t + 6 || y > v.b - 6) return;
        var text = full ? c.name.toUpperCase() : c.abbr.toUpperCase();
        var isSel = selected === c.id;
        ctx.fillStyle = isSel ? '#7dffe9' : c.featured ? 'rgba(125,255,233,0.85)' : 'rgba(190,205,235,0.6)';
        forCopies(c.x, function (x) { ctx.fillText(text, x, y); });
      });
      ctx.restore();
    }

    function draw(context, W, H, t, frame) {
      if (!data) {
        context.fillStyle = '#02060d';
        context.fillRect(0, 0, W, H);
        context.fillStyle = '#9fb4d6';
        context.font = '600 14px Inter, sans-serif';
        context.textAlign = 'center';
        context.fillText('Loading the sky…', W / 2, H / 2);
        context.textAlign = 'start';
        return;
      }
      ctx = context;
      frameBox = { left: frame.left, top: frame.top, right: frame.right, bottom: frame.bottom, W: W, H: H };
      refreshPlanets(false);
      clampView();
      hits = [];
      mapLabels = [];
      var v = box();
      drawBackground(v);
      ctx.save();
      ctx.beginPath(); ctx.rect(v.l, v.t, v.r - v.l, v.b - v.t); ctx.clip();
      drawMilkyWay();
      drawEcliptic(v);
      drawGrid(v);
      drawBoundaries();
      drawFigures();
      drawStars();
      drawDeepSky();
      drawAnomalies(t);
      drawPlanets();
      drawLabels();
      ctx.restore();
      ctx.strokeStyle = 'rgba(50,120,190,0.35)';
      ctx.strokeRect(v.l + 0.5, v.t + 0.5, v.r - v.l - 1, v.b - v.t - 1);
    }

    // ── cards ───────────────────────────────────────────────────────────
    function el(tag, cls, text) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text) n.textContent = text;
      return n;
    }

    var PHOTO_PORTRAITS = {
      M42: {
        src: '../../assets/images/orion-nebula-hubble.jpg',
        alt: 'Hubble mosaic of the Orion Nebula, showing glowing gas, dark dust and newborn stars',
        caption: 'Real Hubble mosaic of the Orion Nebula in visible light.',
        credit: 'NASA, ESA, M. Robberto (STScI/ESA) and the Hubble Orion Treasury Project Team · public domain'
      },
      M31: {
        src: '../../assets/images/lessons/roman-space-telescope/andromeda-spitzer.jpg',
        alt: 'Spitzer infrared image of the Andromeda Galaxy showing its bright center and broad rings of dust',
        caption: 'Real Spitzer infrared view of Andromeda; infrared wavelengths are mapped into visible colors.',
        credit: 'NASA/JPL-Caltech · NASA educational media',
        href: 'https://science.nasa.gov/photojournal/the-infrared-face-of-the-andromeda-galaxy/'
      },
      Sun: {
        src: '../../assets/images/sun-sdo-hmi-nasa.jpg',
        alt: 'Visible-light image of the Sun from the Solar Dynamics Observatory',
        caption: 'Real visible-light view; dark marks are sunspots.',
        credit: 'NASA Solar Dynamics Observatory, HMI · public domain'
      },
      Moon: {
        src: '../../assets/images/moon-lro-nasa.jpg',
        alt: 'Detailed global portrait of the Moon assembled from Lunar Reconnaissance Orbiter data',
        caption: 'Real lunar surface data assembled into a global portrait.',
        credit: 'NASA Scientific Visualization Studio / Lunar Reconnaissance Orbiter · public domain'
      },
      Jupiter: {
        src: '../../assets/images/jupiter-cassini-nasa.jpg',
        alt: 'Cassini true-color portrait of Jupiter with cloud bands and the Great Red Spot',
        caption: 'Real Cassini true-color portrait of Jupiter.',
        credit: 'NASA/JPL/Space Science Institute · public domain'
      }
    };

    function photoPortrait(key) {
      var p = PHOTO_PORTRAITS[key];
      if (!p) return null;
      var fig = el('figure', 'as-portrait');
      fig.dataset.zoomable = '';
      fig.dataset.lightboxGroup = 'allsky-object-portraits';
      fig.dataset.full = p.src;
      if (key === 'M31') fig.dataset.object = 'andromeda';
      var img = el('img');
      img.src = p.src; img.alt = p.alt; img.loading = 'eager'; img.decoding = 'async';
      fig.appendChild(img);
      var cap = el('figcaption');
      cap.appendChild(el('span', 'as-caption-lead', p.caption + ' '));
      var credit = el('span', 'as-credit', p.credit);
      if (p.href) {
        credit.appendChild(document.createTextNode(' · '));
        var source = el('a', '', 'source'); source.href = p.href; source.target = '_blank'; source.rel = 'noopener';
        credit.appendChild(source);
      }
      cap.appendChild(credit); fig.appendChild(cap);
      return fig;
    }

    function portraitShell(label, caption) {
      var fig = el('figure', 'as-portrait');
      var canvasEl = el('canvas');
      canvasEl.width = 620; canvasEl.height = 312;
      canvasEl.setAttribute('role', 'img');
      canvasEl.setAttribute('aria-label', label);
      fig.appendChild(canvasEl);
      var cap = el('figcaption');
      cap.appendChild(el('strong', '', caption + ' '));
      cap.appendChild(document.createTextNode('Colors and contrast are enhanced for teaching; this is a depiction, not a photograph.'));
      fig.appendChild(cap);
      return { figure: fig, canvas: canvasEl, context: canvasEl.getContext('2d') };
    }

    function portraitBackdrop(pc, seed) {
      var w = pc.canvas.width, h = pc.canvas.height;
      var bg = pc.createRadialGradient(w * 0.5, h * 0.48, 0, w * 0.5, h * 0.5, w * 0.62);
      bg.addColorStop(0, '#071020'); bg.addColorStop(1, '#010308');
      pc.fillStyle = bg; pc.fillRect(0, 0, w, h);
      for (var i = 0; i < 95; i++) {
        pc.globalAlpha = 0.2 + noise(seed + i * 5) * 0.65;
        pc.fillStyle = i % 11 === 0 ? '#ffe0ad' : '#e9f1ff';
        pc.beginPath();
        pc.arc(noise(seed + i * 5 + 1) * w, noise(seed + i * 5 + 2) * h, 0.35 + noise(seed + i * 5 + 3) * 1.25, 0, 6.2832);
        pc.fill();
      }
      pc.globalAlpha = 1;
    }

    function objectSeed(id) {
      return String(id).split('').reduce(function (sum, ch, i) { return sum + ch.charCodeAt(0) * (i + 3); }, 23);
    }

    function galaxyStyle(id) {
      if (['M65', 'M82', 'M90', 'M98', 'M104', 'M108', 'NGC 253', 'NGC 3115', 'NGC 4631', 'NGC 5128', 'NGC 4565'].indexOf(id) >= 0) return 'edge-on';
      if (['M32', 'M49', 'M59', 'M60', 'M84', 'M85', 'M86', 'M87', 'M89', 'M105', 'M110', 'NGC 1316'].indexOf(id) >= 0) return 'elliptical';
      if (['NGC 292', 'NGC 2068'].indexOf(id) >= 0) return 'irregular';
      if (['M33', 'M51', 'M58', 'M61', 'M63', 'M64', 'M74', 'M77', 'M81', 'M83', 'M88', 'M91', 'M94', 'M95', 'M96', 'M99', 'M100', 'M101', 'M106', 'M109', 'NGC 6946'].indexOf(id) >= 0) return 'face-on spiral';
      return 'spiral galaxy';
    }

    function drawGalaxyPortrait(pc, o, seed) {
      var w = pc.canvas.width, h = pc.canvas.height, cx = w / 2, cy = h / 2;
      var style = galaxyStyle(o[0]);
      pc.save(); pc.translate(cx, cy); pc.rotate(-0.16);
      if (style === 'edge-on') {
        pc.scale(2.7, 0.58);
        var edge = pc.createRadialGradient(0, 0, 3, 0, 0, 98);
        edge.addColorStop(0, '#fff4d0'); edge.addColorStop(0.17, 'rgba(244,217,173,0.9)'); edge.addColorStop(0.6, 'rgba(171,186,211,0.34)'); edge.addColorStop(1, 'rgba(130,150,190,0)');
        pc.fillStyle = edge; pc.beginPath(); pc.arc(0, 0, 104, 0, 6.2832); pc.fill();
        pc.scale(1 / 2.7, 1 / 0.58);
        pc.strokeStyle = 'rgba(16,12,13,0.82)'; pc.lineWidth = o[0] === 'M104' ? 8 : 4;
        pc.beginPath(); pc.moveTo(-230, 2); pc.quadraticCurveTo(0, -5, 230, 3); pc.stroke();
      } else if (style === 'elliptical') {
        pc.scale(1.65, 0.95);
        var ell = pc.createRadialGradient(-10, -6, 1, 0, 0, 112);
        ell.addColorStop(0, '#fff7d8'); ell.addColorStop(0.14, '#e8cfa0'); ell.addColorStop(0.5, 'rgba(205,184,151,0.44)'); ell.addColorStop(1, 'rgba(173,162,151,0)');
        pc.fillStyle = ell; pc.beginPath(); pc.arc(0, 0, 120, 0, 6.2832); pc.fill();
      } else if (style === 'irregular') {
        for (var c = 0; c < 16; c++) {
          var ix = (noise(seed + c * 7) - 0.5) * 270, iy = (noise(seed + c * 7 + 1) - 0.5) * 105;
          var ir = 18 + noise(seed + c * 7 + 2) * 42;
          var ig = pc.createRadialGradient(ix, iy, 0, ix, iy, ir);
          ig.addColorStop(0, c % 4 ? 'rgba(188,210,236,0.28)' : 'rgba(255,164,178,0.3)'); ig.addColorStop(1, 'rgba(130,170,215,0)');
          pc.fillStyle = ig; pc.beginPath(); pc.arc(ix, iy, ir, 0, 6.2832); pc.fill();
        }
      } else {
        var faceOn = style === 'face-on spiral';
        pc.scale(faceOn ? 1 : 1.7, faceOn ? 0.9 : 0.58);
        for (var arm = 0; arm < 2; arm++) {
          for (var i = 0; i < 210; i++) {
            var radius = 8 + i * 0.58;
            var angle = arm * Math.PI + i * 0.047 + (noise(seed + i + arm * 300) - 0.5) * 0.22;
            var spread = (noise(seed + i * 3 + arm) - 0.5) * (5 + radius * 0.09);
            var sx = Math.cos(angle) * (radius + spread), sy = Math.sin(angle) * (radius + spread);
            pc.globalAlpha = 0.15 + noise(seed + i * 9) * 0.5;
            pc.fillStyle = i % 13 === 0 ? '#ffc2bc' : i % 7 === 0 ? '#a9cfff' : '#dce8ff';
            pc.beginPath(); pc.arc(sx, sy, 0.8 + noise(seed + i * 11) * 2.2, 0, 6.2832); pc.fill();
          }
        }
        var core = pc.createRadialGradient(0, 0, 0, 0, 0, 55);
        core.addColorStop(0, '#fff8d7'); core.addColorStop(0.22, 'rgba(244,210,151,0.82)'); core.addColorStop(1, 'rgba(210,190,170,0)');
        pc.globalAlpha = 1; pc.fillStyle = core; pc.beginPath(); pc.arc(0, 0, 58, 0, 6.2832); pc.fill();
        if (o[0] === 'M64') { pc.strokeStyle = 'rgba(15,10,14,0.9)'; pc.lineWidth = 10; pc.beginPath(); pc.arc(0, 0, 47, -2.5, -0.35); pc.stroke(); }
      }
      pc.restore();
    }

    function drawClusterPortrait(pc, o, seed) {
      var w = pc.canvas.width, h = pc.canvas.height, cx = w / 2, cy = h / 2;
      var globular = o[1] === 'gc', count = globular ? 520 : 135;
      for (var i = 0; i < count; i++) {
        var angle = noise(seed + i * 5) * 6.2832;
        var radial = Math.pow(noise(seed + i * 5 + 1), globular ? 2.2 : 0.72) * (globular ? 126 : 150);
        var x = cx + Math.cos(angle) * radial * (globular ? 1 : 1.45), y = cy + Math.sin(angle) * radial * (globular ? 0.84 : 0.7);
        var rr = 0.45 + noise(seed + i * 5 + 2) * (globular ? 1.7 : 2.7);
        pc.globalAlpha = 0.35 + noise(seed + i * 5 + 3) * 0.65;
        pc.fillStyle = i % 9 === 0 ? '#ffd29d' : i % 7 === 0 ? '#a9cfff' : '#fff8e8';
        pc.beginPath(); pc.arc(x, y, rr, 0, 6.2832); pc.fill();
      }
      pc.globalAlpha = 1;
    }

    function drawNebulaPortrait(pc, o, seed) {
      var w = pc.canvas.width, h = pc.canvas.height, cx = w / 2, cy = h / 2;
      if (o[1] === 'pn') {
        var dumbbell = ['M27', 'M76'].indexOf(o[0]) >= 0;
        if (dumbbell) {
          pc.save(); pc.translate(cx, cy); pc.rotate(-0.35);
          [-1, 1].forEach(function (side) {
            var dg = pc.createRadialGradient(side * 45, 0, 4, side * 45, 0, 95);
            dg.addColorStop(0, 'rgba(170,255,222,0.72)'); dg.addColorStop(0.52, 'rgba(79,220,184,0.32)'); dg.addColorStop(1, 'rgba(50,160,155,0)');
            pc.fillStyle = dg; pc.beginPath(); pc.ellipse(side * 42, 0, 92, 67, 0, 0, 6.2832); pc.fill();
          }); pc.restore();
        } else {
          var ring = pc.createRadialGradient(cx, cy, 14, cx, cy, 105);
          ring.addColorStop(0, 'rgba(1,3,8,0.9)'); ring.addColorStop(0.32, 'rgba(60,206,187,0.12)'); ring.addColorStop(0.58, 'rgba(94,244,202,0.62)'); ring.addColorStop(0.78, 'rgba(87,150,238,0.34)'); ring.addColorStop(1, 'rgba(70,100,190,0)');
          pc.fillStyle = ring; pc.beginPath(); pc.ellipse(cx, cy, 118, 91, -0.2, 0, 6.2832); pc.fill();
        }
        pc.fillStyle = '#fff'; pc.beginPath(); pc.arc(cx, cy, 2.4, 0, 6.2832); pc.fill();
        return;
      }
      if (o[1] === 'snr') {
        pc.strokeStyle = 'rgba(255,126,124,0.65)'; pc.lineWidth = 2;
        for (var f = 0; f < 38; f++) {
          var a = noise(seed + f * 4) * 6.2832, span = 0.12 + noise(seed + f * 4 + 1) * 0.42;
          pc.beginPath(); pc.arc(cx, cy, 48 + noise(seed + f * 4 + 2) * 86, a, a + span); pc.stroke();
        }
        return;
      }
      var palette = o[0] === 'M20' ? ['255,75,123', '103,137,255'] : ['255,74,122', '122,105,255'];
      for (var n = 0; n < 25; n++) {
        var nx = cx + (noise(seed + n * 7) - 0.5) * 330, ny = cy + (noise(seed + n * 7 + 1) - 0.5) * 145;
        var nr = 35 + noise(seed + n * 7 + 2) * 82;
        var ng = pc.createRadialGradient(nx, ny, 0, nx, ny, nr);
        ng.addColorStop(0, 'rgba(' + palette[n % palette.length] + ',' + (0.16 + noise(seed + n) * 0.2) + ')');
        ng.addColorStop(1, 'rgba(' + palette[n % palette.length] + ',0)');
        pc.fillStyle = ng; pc.beginPath(); pc.arc(nx, ny, nr, 0, 6.2832); pc.fill();
      }
      if (o[0] === 'M20') {
        pc.strokeStyle = 'rgba(1,3,8,0.78)'; pc.lineWidth = 12;
        [-0.5, 0.55, 1.6].forEach(function (angle) { pc.beginPath(); pc.moveTo(cx, cy); pc.lineTo(cx + Math.cos(angle) * 180, cy + Math.sin(angle) * 180); pc.stroke(); });
      } else if (o[0] === 'M16') {
        pc.fillStyle = 'rgba(12,18,20,0.9)';
        [-42, 0, 44].forEach(function (dx, i) { pc.beginPath(); pc.moveTo(cx + dx - 16, cy + 108); pc.quadraticCurveTo(cx + dx - 10, cy - 20 - i * 12, cx + dx + 7, cy - 68 - i * 7); pc.quadraticCurveTo(cx + dx + 26, cy + 5, cx + dx + 22, cy + 108); pc.closePath(); pc.fill(); });
      }
    }

    function dsoPortrait(o) {
      var real = photoPortrait(o[0]);
      if (real) return real;
      var label = DSO_LABEL[o[1]] || 'deep-sky object';
      var morphology = o[1] === 'gal' ? galaxyStyle(o[0]) : o[1] === 'gc' ? 'dense spherical globular cluster' : o[1] === 'oc' ? 'loose open star cluster' : o[1] === 'pn' ? (['M27', 'M76'].indexOf(o[0]) >= 0 ? 'two-lobed planetary nebula' : 'expanding planetary-nebula shell') : o[1] === 'snr' ? 'filamentary supernova-remnant shell' : 'glowing emission and reflection cloud';
      var shell = portraitShell('Teaching depiction of ' + o.label + ' as a ' + morphology, 'Scientifically grounded ' + morphology + '.');
      var seed = objectSeed(o[0]); portraitBackdrop(shell.context, seed);
      if (o[1] === 'gal') drawGalaxyPortrait(shell.context, o, seed);
      else if (o[1] === 'gc' || o[1] === 'oc') drawClusterPortrait(shell.context, o, seed);
      else drawNebulaPortrait(shell.context, o, seed);
      return shell.figure;
    }

    function planetPortrait(p) {
      var real = photoPortrait(p.name);
      if (real) return real;
      var shell = portraitShell('Teaching depiction of ' + p.name, 'Telescope-style depiction of ' + p.name + '.');
      portraitBackdrop(shell.context, objectSeed(p.name));
      var previous = ctx; ctx = shell.context;
      drawPlanetDisc(p, shell.canvas.width / 2, shell.canvas.height / 2, p.name === 'Saturn' ? 62 : 74);
      ctx = previous;
      return shell.figure;
    }

    function simpleObjectPortrait(hit) {
      var o = hit.obj, name = hit.kind === 'star' ? o[0] : o.name;
      var shell = portraitShell('Scientific depiction of ' + name, 'Scientific teaching depiction of ' + name + '.');
      var pc = shell.context, seed = objectSeed(name); portraitBackdrop(pc, seed);
      var cx = shell.canvas.width / 2, cy = shell.canvas.height / 2;
      if (hit.kind === 'star') {
        var sg = pc.createRadialGradient(cx, cy, 0, cx, cy, 82); sg.addColorStop(0, '#fff'); sg.addColorStop(0.12, '#d8e8ff'); sg.addColorStop(0.42, 'rgba(123,173,255,0.35)'); sg.addColorStop(1, 'rgba(123,173,255,0)');
        pc.fillStyle = sg; pc.beginPath(); pc.arc(cx, cy, 84, 0, 6.2832); pc.fill();
      } else if (o.kind === 'bh') {
        pc.save(); pc.translate(cx, cy); pc.rotate(-0.22); pc.scale(1, 0.32);
        var ag = pc.createRadialGradient(0, 0, 38, 0, 0, 130); ag.addColorStop(0, 'rgba(255,245,220,0)'); ag.addColorStop(0.38, 'rgba(255,198,94,0.92)'); ag.addColorStop(0.7, 'rgba(255,91,42,0.45)'); ag.addColorStop(1, 'rgba(255,70,30,0)');
        pc.fillStyle = ag; pc.beginPath(); pc.arc(0, 0, 135, 0, 6.2832); pc.fill(); pc.restore();
        pc.fillStyle = '#000'; pc.beginPath(); pc.arc(cx, cy, 37, 0, 6.2832); pc.fill(); pc.strokeStyle = 'rgba(255,230,170,0.65)'; pc.lineWidth = 3; pc.stroke();
      } else {
        var pseudo = [name, o.kind === 'gal' ? 'gal' : o.kind === 'snr' || o.kind === 'sn' ? 'snr' : 'pn'];
        drawNebulaPortrait(pc, pseudo, seed);
      }
      return shell.figure;
    }

    function insideList(c) {
      var out = [];
      function test(ra, dec, name, tag) {
        if (constAt(ra, dec) === c) out.push({ name: name, tag: tag });
      }
      X.anomalies.forEach(function (a) { test(a.ra, a.dec, a.name, X.anomalyLabels[a.kind]); });
      data.dso.forEach(function (d) {
        if (X.messierNames[d[0]] || d[6]) test(d[2], d[3], d.label, DSO_LABEL[d[1]] || 'Deep-sky object');
      });
      planets.forEach(function (p) { test(p.ra, p.dec, p.name, 'Right now'); });
      var seen = {};
      return out.filter(function (o) { if (seen[o.name]) return false; seen[o.name] = 1; return true; });
    }

    function showCard(build) {
      card.textContent = '';
      card.hidden = false;
      var close = el('button', 'as-close', '✕');
      close.type = 'button';
      close.setAttribute('aria-label', 'Close details');
      close.addEventListener('click', function () { selected = null; card.hidden = true; });
      card.appendChild(close);
      build(card);
    }

    function showConstellation(c) {
      selected = c.id;
      var featuredKey = null;
      Object.keys(X.featured).forEach(function (k) { if (X.featured[k] === c.id) featuredKey = k; });
      showCard(function (root) {
        root.appendChild(el('div', 'as-kind', 'CONSTELLATION · ' + c.abbr));
        root.appendChild(el('h3', 'as-title', c.name));
        root.appendChild(el('p', 'as-sub', c.meaning ? 'Latin for ' + c.meaning : ''));
        root.appendChild(el('p', 'as-body', c.origin));
        var inside = insideList(c);
        if (inside.length) {
          root.appendChild(el('div', 'as-h', 'Inside its borders'));
          var ul = el('ul', 'as-list');
          inside.slice(0, 10).forEach(function (o) {
            var li = el('li');
            li.appendChild(el('strong', '', o.name));
            li.appendChild(document.createTextNode(' · ' + o.tag));
            ul.appendChild(li);
          });
          if (inside.length > 10) ul.appendChild(el('li', '', '…and ' + (inside.length - 10) + ' more'));
          root.appendChild(ul);
        }
        var row = el('div', 'as-actions');
        var zoom = el('button', 'as-btn', 'Zoom to it');
        zoom.type = 'button';
        zoom.addEventListener('click', function () { flyToConstellation(c); });
        row.appendChild(zoom);
        if (featuredKey) {
          var open = el('button', 'as-btn as-btn-main', 'Open detailed map + dossier');
          open.type = 'button';
          open.addEventListener('click', function () { opts.onOpenDetail(featuredKey); });
          row.appendChild(open);
        }
        root.appendChild(row);
      });
      opts.announce(c.name + ', ' + (c.meaning || ''));
    }

    function showObject(hit) {
      var o = hit.obj;
      showCard(function (root) {
        if (hit.kind === 'anomaly') {
          root.appendChild(simpleObjectPortrait(hit));
          root.appendChild(el('div', 'as-kind', (X.anomalyLabels[o.kind] || 'Anomaly').toUpperCase()));
          root.appendChild(el('h3', 'as-title', o.name));
          root.appendChild(el('p', 'as-body', o.tip));
          var c = constAt(o.ra, o.dec);
          if (c) root.appendChild(el('p', 'as-sub', 'In ' + c.name + ' (' + c.meaning + ')' + (o.approx ? ' · position approximate' : '')));
          if (o.link) {
            var a = el('a', 'as-link', 'Learn more: ' + o.link[1] + ' →');
            a.href = o.link[0];
            root.appendChild(a);
          }
        } else if (hit.kind === 'dso') {
          root.appendChild(dsoPortrait(o));
          root.appendChild(el('div', 'as-kind', (DSO_LABEL[o[1]] || 'Deep-sky object').toUpperCase()));
          root.appendChild(el('h3', 'as-title', o.label));
          var facts = [o[0]];
          if (o[4] !== null) facts.push('magnitude ' + o[4]);
          if (o[5]) facts.push('about ' + o[5] + '′ across');
          root.appendChild(el('p', 'as-body', facts.join(' · ')));
          var cc = constAt(o[2], o[3]);
          if (cc) root.appendChild(el('p', 'as-sub', 'In ' + cc.name + ' (' + cc.meaning + ')'));
          if (o[0] === 'M13') {
            var lk = el('a', 'as-link', 'Aim of the Arecibo message →'); lk.href = 'arecibo-message.html'; root.appendChild(lk);
          }
        } else if (hit.kind === 'planet') {
          root.appendChild(planetPortrait(o));
          root.appendChild(el('div', 'as-kind', o.name === 'Sun' || o.name === 'Moon' ? 'TODAY’S SKY' : 'PLANET · TODAY’S POSITION'));
          root.appendChild(el('h3', 'as-title', o.name));
          var pc = constAt(o.ra, o.dec);
          root.appendChild(el('p', 'as-body', 'Right now ' + o.name + ' is in ' + (pc ? pc.name + ' (' + pc.meaning + ')' : 'the sky') + '. ' +
            (o.name === 'Sun' ? 'It moves about 1° east along the ecliptic every day, spending different lengths of time in each constellation.' :
             o.name === 'Moon' ? 'It circles the whole zodiac in about 27 days.' :
             'Planets always stay close to the ecliptic, which is why the zodiac constellations are the planets’ neighborhood.')));
          root.appendChild(el('p', 'as-sub', 'Computed from a low-precision model for this moment; accurate to well under a degree, good enough for finding it, not for pointing a telescope.'));
        } else {
          root.appendChild(simpleObjectPortrait(hit));
          root.appendChild(el('div', 'as-kind', 'STAR'));
          root.appendChild(el('h3', 'as-title', o[0]));
          root.appendChild(el('p', 'as-body', o[4] + ' Apparent magnitude ' + o[3] + '.'));
          var sc = constAt(o[1], o[2]);
          if (sc) root.appendChild(el('p', 'as-sub', 'In ' + sc.name + ' (' + sc.meaning + ')'));
        }
      });
    }

    // ── camera moves ────────────────────────────────────────────────────
    function flyTo(ra, dec, s) {
      var start = { cra: view.cra, cdec: view.cdec, s: view.s };
      var target = { cra: ra, cdec: dec, s: Math.max(minS, Math.min(maxS, s)) };
      var dRa = wrap180(target.cra - start.cra);
      var t0 = performance.now();
      var dur = 700;
      (function step(now) {
        var k = Math.min(1, (now - t0) / dur);
        var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        view.cra = start.cra + dRa * e;
        view.cdec = start.cdec + (target.cdec - start.cdec) * e;
        view.s = start.s + (target.s - start.s) * e;
        clampView();
        if (k < 1 && active) requestAnimationFrame(step);
      }(t0));
    }

    function flyToConstellation(c) {
      var spanRa = (c.maxLon - c.minLon), spanDec = (c.maxLat - c.minLat);
      var cs = center();
      var cosd = Math.max(0.3, Math.cos(((c.maxLat + c.minLat) / 2) * RAD));
      var s = Math.min(cs.w / (Math.min(spanRa * cosd, 120) + 10), cs.h / (spanDec + 10));
      flyTo((c.minLon + c.maxLon) / 2, (c.maxLat + c.minLat) / 2, Math.min(s, 14));
    }

    function focusFeatured(key) {
      var id = X.featured[key];
      var c = id && idIndex[id];
      if (!c) return;
      showConstellation(c);
      flyToConstellation(c);
    }

    // ── pointer / keyboard input ────────────────────────────────────────
    function pos(e) {
      var r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function insideView(p) { var v = box(); return p.x >= v.l && p.x <= v.r && p.y >= v.t && p.y <= v.b; }
    function hitAt(p) {
      var best = null, bd = 1e9;
      for (var i = 0; i < hits.length; i++) {
        var h = hits[i];
        var d = Math.hypot(h.x - p.x, h.y - p.y);
        if (d <= h.r && d < bd) { best = h; bd = d; }
      }
      return best;
    }

    function onDown(e) {
      if (!active || e.button > 0) return;
      var p = pos(e);
      if (!insideView(p)) return;
      drag = { x: p.x, y: p.y, cra: view.cra, cdec: view.cdec, moved: false };
    }
    function onMove(e) {
      if (!active) return;
      var p = pos(e);
      if (drag) {
        var dx = p.x - drag.x, dy = p.y - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
        view.cra = drag.cra + dx / view.s;
        view.cdec = drag.cdec + dy / view.s;
        clampView();
        canvas.style.cursor = 'grabbing';
        return;
      }
      if (!insideView(p)) { hover = null; pointerConst = null; opts.onHover('', p); return; }
      var sky = screenToSky(p.x, p.y);
      opts.onCursor(sky.ra, sky.dec);
      hover = hitAt(p);
      pointerConst = hover ? null : constAt(sky.ra, sky.dec);
      canvas.style.cursor = hover ? 'pointer' : 'grab';
      opts.onHover(hover ? (hover.obj.label || hover.obj.name || hover.obj[0]) : (pointerConst ? pointerConst.name : ''), p);
    }
    function onUp(e) {
      if (!active || !drag) return;
      var moved = drag.moved;
      var p = pos(e);
      drag = null;
      canvas.style.cursor = 'grab';
      if (moved || !insideView(p)) return;
      var h = hitAt(p);
      if (h) { selected = null; showObject(h); return; }
      var sky = screenToSky(p.x, p.y);
      var c = constAt(sky.ra, sky.dec);
      if (c) showConstellation(c); else { selected = null; card.hidden = true; }
    }
    function onWheel(e) {
      if (!active) return;
      var p = pos(e);
      if (!insideView(p)) return;
      e.preventDefault();
      zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0015));
    }
    function onKey(e) {
      if (!active) return;
      var step = 40 / view.s;
      var handled = true;
      switch (e.key) {
        case 'ArrowLeft': view.cra += step; break;
        case 'ArrowRight': view.cra -= step; break;
        case 'ArrowUp': view.cdec += step; break;
        case 'ArrowDown': view.cdec -= step; break;
        case '+': case '=': zoomAt(center().x, center().y, 1.25); break;
        case '-': case '_': zoomAt(center().x, center().y, 0.8); break;
        case 'Escape': selected = null; card.hidden = true; break;
        default: handled = false;
      }
      if (handled) { e.preventDefault(); clampView(); }
    }
    function touchPos(t) { return pos(t); }
    function onTouchStart(e) {
      if (!active) return;
      if (e.touches.length === 2) {
        var a = touchPos(e.touches[0]), b = touchPos(e.touches[1]);
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: view.s };
        drag = null;
      } else if (e.touches.length === 1) {
        var p = touchPos(e.touches[0]);
        if (insideView(p)) drag = { x: p.x, y: p.y, cra: view.cra, cdec: view.cdec, moved: false };
      }
    }
    function onTouchMove(e) {
      if (!active) return;
      if (pinch && e.touches.length === 2) {
        var a = touchPos(e.touches[0]), b = touchPos(e.touches[1]);
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, (pinch.s * d / pinch.d) / view.s);
        e.preventDefault();
      } else if (drag && e.touches.length === 1) {
        var p = touchPos(e.touches[0]);
        if (Math.abs(p.x - drag.x) + Math.abs(p.y - drag.y) > 6) drag.moved = true;
        view.cra = drag.cra + (p.x - drag.x) / view.s;
        view.cdec = drag.cdec + (p.y - drag.y) / view.s;
        clampView();
        e.preventDefault();
      }
    }
    function onTouchEnd(e) {
      if (!active) return;
      if (pinch) { if (e.touches.length < 2) pinch = null; return; }
      if (drag && !drag.moved && e.changedTouches[0]) {
        var p = touchPos(e.changedTouches[0]);
        drag = null;
        var h = hitAt(p);
        if (h) { showObject(h); return; }
        var sky = screenToSky(p.x, p.y);
        var c = constAt(sky.ra, sky.dec);
        if (c) showConstellation(c);
      } else { drag = null; }
    }

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', function (e) { onMove(e); });
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('keydown', onKey);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });

    // ── public api ──────────────────────────────────────────────────────
    api.load = load;
    api.draw = draw;
    api.layers = layers;
    api.focusFeatured = focusFeatured;
    api.select = function (id) { var c = idIndex[id]; if (c) { showConstellation(c); flyToConstellation(c); } };
    api.reset = function () { view.cra = 180; view.cdec = 0; view.s = fitScale(); clampView(); selected = null; card.hidden = true; };
    api.setActive = function (on, focusKey) {
      active = !!on;
      card.hidden = true;
      selected = null;
      if (active) {
        load().then(function () {
          minS = fitScale();
          if (focusKey) { view.cra = 180; view.cdec = 0; view.s = minS; focusFeatured(focusKey); }
          else api.reset();
        });
      }
    };
    Object.defineProperty(api, 'active', { get: function () { return active; } });
    api.todaySummary = function () {
      if (!data) return '';
      var sun = planets.filter(function (p) { return p.name === 'Sun'; })[0];
      var c = sun && constAt(sun.ra, sun.dec);
      return c ? 'The Sun is in ' + c.name + ' today.' : '';
    };
    return api;
  }

  window.AllSkyMap = { create: create };
}());
