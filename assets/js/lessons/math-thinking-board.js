/* Pure geometry and state helpers for the Math Foundations "Explain your thinking" workboard.
 * Zero DOM dependencies so it can be unit-tested in Node and shared by the lab UI.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MathThinkingBoard = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function pluralize(count, singular, plural) {
    return count === 1 ? singular : (plural || singular + 's');
  }

  function toPixelPoints(counters, width, height) {
    var w = width > 0 ? width : 400;
    var h = height > 0 ? height : 220;
    return counters.map(function (c) {
      return {
        x: c.x * w,
        y: c.y * h,
        group: c.group === 1 ? 1 : 0
      };
    });
  }

  function detectRectangularArray(pts) {
    if (pts.length < 4) return null;
    var sorted = pts.slice().sort(function (a, b) {
      return a.y - b.y || a.x - b.x;
    });
    var rows = [];
    sorted.forEach(function (pt) {
      var lastRow = rows[rows.length - 1];
      if (!lastRow) {
        rows.push({ sumY: pt.y, items: [pt] });
        return;
      }
      var meanY = lastRow.sumY / lastRow.items.length;
      if (Math.abs(pt.y - meanY) <= 22) {
        lastRow.items.push(pt);
        lastRow.sumY += pt.y;
      } else {
        rows.push({ sumY: pt.y, items: [pt] });
      }
    });

    if (rows.length < 2) return null;
    var cols = rows[0].items.length;
    if (cols < 2 || rows.length * cols !== pts.length) return null;

    for (var r = 0; r < rows.length; r++) {
      if (rows[r].items.length !== cols) return null;
      rows[r].items.sort(function (a, b) { return a.x - b.x; });
    }

    for (var c = 0; c < cols; c++) {
      var minX = Infinity;
      var maxX = -Infinity;
      for (var r2 = 0; r2 < rows.length; r2++) {
        var x = rows[r2].items[c].x;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
      if (maxX - minX > 28) return null;
    }

    return { rows: rows.length, cols: cols };
  }

  function detectSpatialGroups(pts) {
    if (pts.length < 2) return null;
    var maxD = 0;
    var seed1 = pts[0];
    var seed2 = pts[1];
    for (var i = 0; i < pts.length; i++) {
      for (var j = i + 1; j < pts.length; j++) {
        var d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d > maxD) {
          maxD = d;
          seed1 = pts[i];
          seed2 = pts[j];
        }
      }
    }
    if (maxD <= 60) return null;

    var c1 = { x: seed1.x, y: seed1.y };
    var c2 = { x: seed2.x, y: seed2.y };
    var g1 = [];
    var g2 = [];
    for (var iter = 0; iter < 5; iter++) {
      g1 = [];
      g2 = [];
      for (var k = 0; k < pts.length; k++) {
        var d1 = Math.hypot(pts[k].x - c1.x, pts[k].y - c1.y);
        var d2 = Math.hypot(pts[k].x - c2.x, pts[k].y - c2.y);
        if (d1 <= d2) g1.push(pts[k]);
        else g2.push(pts[k]);
      }
      if (!g1.length || !g2.length) return null;
      var sx1 = 0, sy1 = 0, sx2 = 0, sy2 = 0;
      g1.forEach(function (p) { sx1 += p.x; sy1 += p.y; });
      g2.forEach(function (p) { sx2 += p.x; sy2 += p.y; });
      c1 = { x: sx1 / g1.length, y: sy1 / g1.length };
      c2 = { x: sx2 / g2.length, y: sy2 / g2.length };
    }

    var clusterDist = Math.hypot(c1.x - c2.x, c1.y - c2.y);
    var rad1 = 0;
    var rad2 = 0;
    g1.forEach(function (p) { rad1 = Math.max(rad1, Math.hypot(p.x - c1.x, p.y - c1.y)); });
    g2.forEach(function (p) { rad2 = Math.max(rad2, Math.hypot(p.x - c2.x, p.y - c2.y)); });

    if (clusterDist <= 56 || clusterDist <= (rad1 + rad2) * 1.15) return null;

    var minGap = Infinity;
    for (var a = 0; a < g1.length; a++) {
      for (var b = 0; b < g2.length; b++) {
        var gap = Math.hypot(g1[a].x - g2[b].x, g1[a].y - g2[b].y);
        if (gap < minGap) minGap = gap;
      }
    }
    if (minGap <= 68) return null;

    function maxNearestNeighbor(group) {
      if (group.length < 2) return 0;
      var maxNn = 0;
      for (var x = 0; x < group.length; x++) {
        var nearest = Infinity;
        for (var y = 0; y < group.length; y++) {
          if (x === y) continue;
          var d = Math.hypot(group[x].x - group[y].x, group[x].y - group[y].y);
          if (d < nearest) nearest = d;
        }
        if (nearest > maxNn) maxNn = nearest;
      }
      return maxNn;
    }
    var maxInternal = Math.max(maxNearestNeighbor(g1), maxNearestNeighbor(g2));
    if (maxInternal > 0 && minGap <= maxInternal * 1.45) return null;

    var firstIs1 = Math.abs(c1.x - c2.x) >= 12 ? c1.x <= c2.x : c1.y <= c2.y;
    return firstIs1 ? { n1: g1.length, n2: g2.length } : { n1: g2.length, n2: g1.length };
  }

  function analyzeBoard(state) {
    var opts = state || {};
    var strokes = Array.isArray(opts.strokes) ? opts.strokes : [];
    var counters = Array.isArray(opts.counters) ? opts.counters : [];
    var width = opts.width > 0 ? opts.width : 400;
    var height = opts.height > 0 ? opts.height : 220;

    var counterCount = counters.length;
    var strokeCount = strokes.length;

    if (counterCount === 0 && strokeCount === 0) {
      return {
        hasWork: false,
        counterCount: 0,
        strokeCount: 0,
        kind: 'empty',
        summary: 'Draw or place counters to show your strategy.',
        noteText: ''
      };
    }

    if (counterCount === 0) {
      return {
        hasWork: true,
        counterCount: 0,
        strokeCount: strokeCount,
        kind: 'sketch',
        summary: 'Sketch on board (' + strokeCount + ' ' + pluralize(strokeCount, 'stroke') + ')',
        noteText: 'My sketch shows my strategy: '
      };
    }

    var pts = toPixelPoints(counters, width, height);
    var solidCount = 0;
    var outlinedCount = 0;
    pts.forEach(function (p) {
      if (p.group === 1) outlinedCount++;
      else solidCount++;
    });

    var kind = 'count';
    var baseSummary;
    var noteText;
    var arr;
    var spatial;

    if (solidCount > 0 && outlinedCount > 0) {
      kind = 'two-groups';
      baseSummary = '2 groups: ' + solidCount + ' + ' + outlinedCount + ' = ' + counterCount + ' counters';
      noteText = 'My model shows 2 groups: ' + solidCount + ' + ' + outlinedCount + ' = ' + counterCount + ' counters.';
    } else if ((arr = detectRectangularArray(pts))) {
      kind = 'array';
      baseSummary = 'Array: ' + arr.rows + ' × ' + arr.cols + ' = ' + counterCount + ' counters';
      noteText = 'My model shows an array of ' + arr.rows + ' rows × ' + arr.cols + ' columns = ' + counterCount + ' counters.';
    } else if ((spatial = detectSpatialGroups(pts))) {
      kind = 'spatial-groups';
      baseSummary = '2 groups: ' + spatial.n1 + ' + ' + spatial.n2 + ' = ' + counterCount + ' counters';
      noteText = 'My model shows 2 groups: ' + spatial.n1 + ' + ' + spatial.n2 + ' = ' + counterCount + ' counters.';
    } else {
      var unit = pluralize(counterCount, 'counter');
      baseSummary = counterCount + ' ' + unit;
      noteText = 'My model shows ' + counterCount + ' ' + unit + '.';
    }

    return {
      hasWork: true,
      counterCount: counterCount,
      strokeCount: strokeCount,
      kind: kind,
      summary: strokeCount > 0 ? baseSummary + ' · with sketch' : baseSummary,
      noteText: noteText
    };
  }

  function hitTestCounter(counters, px, py, width, height, radius) {
    if (!Array.isArray(counters) || !counters.length) return -1;
    var w = width > 0 ? width : 400;
    var h = height > 0 ? height : 220;
    var r = typeof radius === 'number' && radius > 0 ? radius : 16;
    for (var i = counters.length - 1; i >= 0; i--) {
      var c = counters[i];
      if (Math.hypot(c.x * w - px, c.y * h - py) <= r) return i;
    }
    return -1;
  }

  function pointToSegmentDistance(px, py, ax, ay, bx, by) {
    var dx = bx - ax;
    var dy = by - ay;
    var lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - ax, py - ay);
    var t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  function hitTestStroke(strokes, px, py, width, height, threshold) {
    if (!Array.isArray(strokes) || !strokes.length) return -1;
    var w = width > 0 ? width : 400;
    var h = height > 0 ? height : 220;
    var maxDist = typeof threshold === 'number' && threshold > 0 ? threshold : 12;
    for (var i = strokes.length - 1; i >= 0; i--) {
      var pts = strokes[i] && strokes[i].points;
      if (!pts || !pts.length) continue;
      if (pts.length === 1) {
        if (Math.hypot(pts[0].x * w - px, pts[0].y * h - py) <= maxDist) return i;
        continue;
      }
      for (var j = 1; j < pts.length; j++) {
        var dist = pointToSegmentDistance(
          px, py,
          pts[j - 1].x * w, pts[j - 1].y * h,
          pts[j].x * w, pts[j].y * h
        );
        if (dist <= maxDist) return i;
      }
    }
    return -1;
  }

  function appendNote(existingText, generatedNote) {
    var rawExisting = existingText == null ? '' : String(existingText);
    var rawNote = generatedNote == null ? '' : String(generatedNote);
    var trimmedNote = rawNote.trim();
    if (!trimmedNote) return rawExisting;
    var trimmedRight = rawExisting.replace(/\s+$/, '');
    if (!trimmedRight) return rawNote;
    if (trimmedRight.endsWith(trimmedNote)) {
      return rawExisting;
    }
    return trimmedRight + '\n' + rawNote;
  }

  function cloneState(strokes, counters) {
    return {
      strokes: (strokes || []).map(function (st) {
        return {
          points: (st && st.points ? st.points : []).map(function (p) {
            return { x: p.x, y: p.y };
          })
        };
      }),
      counters: (counters || []).map(function (c) {
        return { x: c.x, y: c.y, group: c.group === 1 ? 1 : 0 };
      })
    };
  }

  return {
    analyzeBoard: analyzeBoard,
    hitTestCounter: hitTestCounter,
    hitTestStroke: hitTestStroke,
    appendNote: appendNote,
    cloneState: cloneState
  };
}));
