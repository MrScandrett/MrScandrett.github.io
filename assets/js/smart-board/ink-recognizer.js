/* Ink recogniser: reads a handwritten line on the AI Smart Blackboard. No DOM, no network, no model.
 *
 *   InkRecognizer.readLine(strokes)   → { text: 'y=x^2-4', mode: 'math', confidence, symbols: [...] }
 *   InkRecognizer.sample('y=x^2-4')   → strokes written in the built-in hand (demos and tests)
 *
 * strokes = [[{ x, y }, …], …] in screen pixels (y down), one array per pen stroke.
 *
 * How it works:
 *   1. Strokes whose left-to-right extents overlap are one symbol (the two bars of "=", the three
 *      strokes of "H"). Write symbols with a little space between them.
 *   2. Each symbol becomes a 32-point cloud, scaled and centred, and is matched against template
 *      clouds ($P point-cloud matching, Vatavu/Anthony/Wobbrock 2012: stroke order and direction
 *      don't matter).
 *   3. Layout turns symbols into a line: a small symbol sitting high after a digit, letter or ")"
 *      is an exponent; context settles look-alikes ("0"/"O", "("/"C", "1"/"(").
 *
 * What it reads: digits, x y, + − = ( ) / . ^ and, for chemistry, the capitals H C N O.
 * It is a template matcher, not a trained model: neat print works, cursive doesn't.
 * Tests: node --test tests/smart-board.test.mjs
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.InkRecognizer = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var N = 32;
  var PI = Math.PI;

  /* ── Template glyphs. Box: x right, y down; 0 = top of a capital, 1 = the baseline. ── */
  function L() {
    var out = [];
    for (var i = 0; i < arguments.length; i += 2) out.push({ x: arguments[i], y: arguments[i + 1] });
    return out;
  }
  function A(cx, cy, rx, ry, t0, t1) {
    var out = [], n = 24;
    for (var i = 0; i <= n; i++) {
      var t = t0 + (t1 - t0) * (i / n);
      out.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) });
    }
    return out;
  }
  function join() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) out = out.concat(arguments[i]);
    return out;
  }

  var GLYPHS = {
    '0': [[A(0.3, 0.5, 0.28, 0.5, 0, 2 * PI)]],
    '1': [[L(0.3, 0, 0.3, 1)], [L(0.08, 0.28, 0.3, 0, 0.3, 1)]],
    '2': [[join(A(0.3, 0.28, 0.27, 0.28, PI, 2.3 * PI), L(0.02, 1, 0.6, 1))]],
    '3': [[join(A(0.28, 0.25, 0.25, 0.25, 1.15 * PI, 2.5 * PI), A(0.28, 0.75, 0.27, 0.25, 1.5 * PI, 2.85 * PI))]],
    '4': [[L(0.45, 0, 0, 0.68, 0.62, 0.68), L(0.45, 0, 0.45, 1)], [L(0.08, 0, 0.08, 0.55, 0.6, 0.55), L(0.48, 0, 0.48, 1)]],
    '5': [
      [join(L(0.55, 0, 0.1, 0, 0.08, 0.45), A(0.27, 0.68, 0.3, 0.32, 1.3 * PI, 2.8 * PI))],
      [join(L(0.1, 0, 0.08, 0.45), A(0.27, 0.68, 0.3, 0.32, 1.3 * PI, 2.8 * PI)), L(0.1, 0, 0.55, 0)]
    ],
    '6': [[join(A(0.62, 0.72, 0.58, 0.72, 1.5 * PI, PI), A(0.3, 0.72, 0.26, 0.28, PI, -PI))]],
    '7': [[L(0, 0, 0.6, 0, 0.2, 1)], [L(0, 0, 0.6, 0, 0.2, 1), L(0.15, 0.5, 0.5, 0.5)]],
    '8': [[A(0.3, 0.25, 0.22, 0.25, 0, 2 * PI), A(0.3, 0.75, 0.27, 0.25, 0, 2 * PI)]],
    '9': [[A(0.3, 0.28, 0.26, 0.28, 0, 2 * PI), L(0.56, 0.28, 0.5, 1)]],
    'x': [[L(0, 0.4, 0.55, 1), L(0.55, 0.4, 0, 1)]],
    'y': [[L(0, 0.4, 0.3, 0.95), L(0.6, 0.4, 0.12, 1.4)]],
    '+': [[L(0.3, 0.35, 0.3, 0.95), L(0, 0.65, 0.6, 0.65)]],
    '-': [[L(0, 0.65, 0.55, 0.65)]],
    '=': [[L(0, 0.52, 0.55, 0.52), L(0, 0.78, 0.55, 0.78)]],
    '(': [[A(0.42, 0.5, 0.3, 0.62, 0.72 * PI, 1.28 * PI)]],
    ')': [[A(0, 0.5, 0.3, 0.62, -0.28 * PI, 0.28 * PI)]],
    '/': [[L(0.5, 0, 0, 1)]],
    '^': [[L(0, 0.3, 0.2, 0, 0.4, 0.3)]],
    'H': [[L(0, 0, 0, 1), L(0.6, 0, 0.6, 1), L(0, 0.5, 0.6, 0.5)]],
    'N': [[L(0, 1, 0, 0, 0.6, 1, 0.6, 0)]],
    'C': [[A(0.4, 0.5, 0.4, 0.5, 0.3 * PI, 1.7 * PI)]]
  };

  /* ── $P point clouds ── */
  function pathLength(stroke) {
    var d = 0;
    for (var i = 1; i < stroke.length; i++) d += Math.hypot(stroke[i].x - stroke[i - 1].x, stroke[i].y - stroke[i - 1].y);
    return d;
  }

  function resample(strokes, n) {
    var total = 0;
    strokes.forEach(function (s) { total += pathLength(s); });
    var first = strokes[0][0];
    if (total < 1e-9) {
      var dot = [];
      for (var k = 0; k < n; k++) dot.push({ x: first.x, y: first.y });
      return dot;
    }
    var interval = total / (n - 1);
    var out = [];
    var D = 0;
    strokes.forEach(function (stroke) {
      var pts = stroke.map(function (p) { return { x: p.x, y: p.y }; });
      out.push({ x: pts[0].x, y: pts[0].y });
      for (var i = 1; i < pts.length; i++) {
        var d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        if (d > 0 && D + d >= interval) {
          var t = (interval - D) / d;
          var q = { x: pts[i - 1].x + t * (pts[i].x - pts[i - 1].x), y: pts[i - 1].y + t * (pts[i].y - pts[i - 1].y) };
          out.push(q);
          pts.splice(i, 0, q);
          D = 0;
        } else D += d;
      }
    });
    while (out.length < n) out.push({ x: out[out.length - 1].x, y: out[out.length - 1].y });
    return out.slice(0, n);
  }

  function bounds(points) {
    var b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    points.forEach(function (p) {
      if (p.x < b.minX) b.minX = p.x;
      if (p.x > b.maxX) b.maxX = p.x;
      if (p.y < b.minY) b.minY = p.y;
      if (p.y > b.maxY) b.maxY = p.y;
    });
    b.w = b.maxX - b.minX; b.h = b.maxY - b.minY;
    return b;
  }

  function cloudOf(strokes) {
    var usable = strokes.filter(function (s) { return s && s.length; });
    var pts = resample(usable, N);
    var b = bounds(pts);
    var size = Math.max(b.w, b.h, 1e-6);
    var cx = 0, cy = 0;
    pts.forEach(function (p) { cx += p.x / pts.length; cy += p.y / pts.length; });
    return pts.map(function (p) { return { x: (p.x - cx) / size, y: (p.y - cy) / size }; });
  }

  function cloudDistance(a, b, start) {
    var n = a.length, matched = new Array(n), sum = 0, i = start;
    do {
      var best = Infinity, index = -1;
      for (var j = 0; j < n; j++) {
        if (matched[j]) continue;
        var d = Math.hypot(a[i].x - b[j].x, a[i].y - b[j].y);
        if (d < best) { best = d; index = j; }
      }
      matched[index] = true;
      sum += (1 - ((i - start + n) % n) / n) * best;
      i = (i + 1) % n;
    } while (i !== start);
    return sum;
  }

  function greedyMatch(a, b) {
    var step = Math.floor(Math.sqrt(a.length)), best = Infinity;
    for (var i = 0; i < a.length; i += step) {
      best = Math.min(best, cloudDistance(a, b, i), cloudDistance(b, a, i));
    }
    return best;
  }

  var TEMPLATES = [];
  Object.keys(GLYPHS).forEach(function (ch) {
    GLYPHS[ch].forEach(function (variant) { TEMPLATES.push({ ch: ch, cloud: cloudOf(variant) }); });
  });

  // A cloud distance of 0 is a perfect copy; by about 5 the shapes have little in common.
  var REJECT = 5;

  /** One symbol's strokes → { ch, score (0–1), distance, alts: [{ ch, score }] } */
  function recognizeSymbol(strokes) {
    var cloud = cloudOf(strokes);
    var byChar = {};
    TEMPLATES.forEach(function (t) {
      var d = greedyMatch(cloud, t.cloud);
      if (!(t.ch in byChar) || d < byChar[t.ch]) byChar[t.ch] = d;
    });
    var ranked = Object.keys(byChar).map(function (ch) {
      return { ch: ch, distance: byChar[ch], score: Math.max(0, 1 - byChar[ch] / REJECT) };
    }).sort(function (p, q) { return p.distance - q.distance; });
    return { ch: ranked[0].ch, score: ranked[0].score, distance: ranked[0].distance, alts: ranked.slice(0, 4) };
  }

  /* ── Symbols from strokes ── */
  function groupSymbols(strokes) {
    var items = strokes.filter(function (s) { return s && s.length; }).map(function (s) { return { stroke: s, box: bounds(s) }; });
    if (!items.length) return { groups: [], lineHeight: 0 };
    var lineHeight = 0;
    items.forEach(function (it) { lineHeight = Math.max(lineHeight, it.box.h, it.box.w * 0.6); });
    var pad = lineHeight * 0.06;
    items.sort(function (p, q) { return p.box.minX - q.box.minX; });
    var groups = [];
    items.forEach(function (it) {
      var lo = it.box.minX - pad, hi = it.box.maxX + pad;
      var g = groups[groups.length - 1];
      if (g) {
        var overlap = Math.min(g.hi, hi) - Math.max(g.lo, lo);
        if (overlap > 0.25 * Math.min(g.hi - g.lo, hi - lo)) {
          g.strokes.push(it.stroke);
          g.lo = Math.min(g.lo, lo); g.hi = Math.max(g.hi, hi);
          return;
        }
      }
      groups.push({ strokes: [it.stroke], lo: lo, hi: hi });
    });
    groups.forEach(function (g) {
      var all = [];
      g.strokes.forEach(function (s) { all = all.concat(s); });
      g.box = bounds(all);
    });
    return { groups: groups, lineHeight: lineHeight };
  }

  var BASE = /[0-9xy)]/;

  /** A whole handwritten line → { text, mode: 'math'|'chem', confidence, symbols } */
  function readLine(strokes) {
    var seg = groupSymbols(strokes);
    var H = seg.lineHeight;
    var symbols = seg.groups.map(function (g) {
      var box = g.box;
      if (box.w < H * 0.18 && box.h < H * 0.18) return { ch: '.', score: 0.8, box: box, alts: [] };
      var r = recognizeSymbol(g.strokes);
      return { ch: r.ch, score: r.score, box: box, alts: r.alts };
    });
    if (!symbols.length) return { text: '', mode: 'math', confidence: 0, symbols: [] };

    var chem = symbols.some(function (s) { return (s.ch === 'H' || s.ch === 'N') && s.score > 0.45; });
    symbols.forEach(function (s) {
      if (chem) {
        if (s.ch === '0') s.ch = 'O';
        if (s.ch === '(') s.ch = 'C';
      } else if (s.ch === 'C') s.ch = '(';
      else if (s.ch === 'H' || s.ch === 'N') {
        var alt = s.alts.filter(function (a) { return 'HNC'.indexOf(a.ch) < 0; })[0];
        if (alt) { s.ch = alt.ch; s.score = alt.score; }
      }
    });

    var text = '';
    if (chem) {
      symbols.forEach(function (s) { text += s.ch === '^' || s.ch === '.' ? '' : s.ch; });
      if (text.indexOf('=') < 0) text = text.replace('-', '=');
    } else {
      // Brackets that never close are almost always a "1" drawn with a curve.
      var depth = 0;
      symbols.forEach(function (s) {
        if (s.ch === '(') depth++;
        else if (s.ch === ')') { if (depth === 0) s.ch = '1'; else depth--; }
      });
      for (var k = symbols.length - 1; k >= 0 && depth > 0; k--) {
        if (symbols[k].ch === '(') { symbols[k].ch = '1'; depth--; }
      }
      var raised = false;
      var base = null;
      symbols.forEach(function (s, i) {
        var prev = symbols[i - 1];
        var isUp = false;
        var ref = raised ? base : prev;
        if (ref && (raised || BASE.test(ref.ch)) && /[0-9xy+\-]/.test(s.ch)) {
          var mid = (s.box.minY + s.box.maxY) / 2;
          isUp = s.box.h < H * 0.8 && s.box.maxY < ref.box.minY + ref.box.h * 0.6 && mid < ref.box.minY + ref.box.h * 0.3;
        }
        if (isUp && !raised) { text += '^('; raised = true; base = prev; }
        else if (!isUp && raised) { text += ')'; raised = false; base = null; }
        text += s.ch;
      });
      if (raised) text += ')';
      text = text.replace(/\^\(([0-9xy])\)/g, '^$1').replace(/\^\^/g, '^');
      // A "2" that opens "2 = … y …" is a z: nobody writes that equation starting with a two.
      if (/^2=/.test(text) && /y/.test(text)) text = 'z' + text.slice(1);
    }

    var confidence = 1;
    symbols.forEach(function (s) { confidence = Math.min(confidence, s.score); });
    return { text: text, mode: chem ? 'chem' : 'math', confidence: confidence, symbols: symbols };
  }

  /* ── The built-in hand: text → strokes (demos, tests) ── */
  function sample(text, opts) {
    opts = opts || {};
    var size = opts.size || 60;
    var x = opts.x || 0, y0 = opts.y || 0;
    var jitter = opts.jitter || 0;
    var seed = opts.seed || 1;
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 - 0.5; }
    var slant = opts.slant || 0;
    var strokes = [];
    var up = 0;
    var chars = String(text).split('');
    for (var i = 0; i < chars.length; i++) {
      var ch = chars[i];
      if (ch === ' ') { x += size * 0.35; continue; }
      if (ch === '^') { up = chars[i + 1] === '(' ? 2 : 1; continue; }
      if (up === 2 && ch === '(') continue;
      if (up === 2 && ch === ')') { up = 0; continue; }
      var key = ch === 'O' ? '0' : (ch === 'z' ? '2' : ch);
      if (ch === '.') {
        strokes.push([{ x: x + size * 0.1, y: y0 + size * 0.97 }, { x: x + size * 0.12, y: y0 + size }]);
        x += size * 0.4;
        continue;
      }
      var variants = GLYPHS[key];
      if (!variants) continue;
      var glyph = variants[(opts.variant || 0) % variants.length];
      var scale = up ? size * 0.5 : size;
      var top = up ? y0 - size * 0.28 : y0;
      var gb = bounds(join.apply(null, glyph));
      var wobX = rnd() * jitter * 0.6, wobY = rnd() * jitter * 0.6, grow = 1 + rnd() * jitter * 0.01;
      glyph.forEach(function (stroke) {
        strokes.push(stroke.map(function (p) {
          var gx = (p.x - gb.minX) * scale * grow, gy = p.y * scale * grow;
          return { x: x + gx - slant * (gy - scale) + wobX + rnd() * jitter, y: top + gy + wobY + rnd() * jitter };
        }));
      });
      x += gb.w * scale + size * (up ? 0.22 : 0.34);
      if (up === 1) up = 0;
    }
    return strokes;
  }

  return {
    GLYPHS: GLYPHS,
    recognizeSymbol: recognizeSymbol,
    groupSymbols: groupSymbols,
    readLine: readLine,
    sample: sample,
    cloudOf: cloudOf
  };
}));
