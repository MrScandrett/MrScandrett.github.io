/* fake-book-violin.js — the Violin tab of the Fake Book's chord views.

   A violin doesn't grip chord shapes: it plays chord tones one at a time (an arpeggio) on a
   fretless board. So a chord, triad or scale is shown as every place its tones sit in first
   position (open string through 4th finger), labelled R / 3 / 5 / 7 with the finger to use and
   a ↓ / ↑ when that finger sits low or high. Click a dot to hear it.

   Pure functions returning SVG strings / numbers; exported for tests. */
(function (root) {
  'use strict';

  var OPEN = [55, 62, 69, 76];                  // G D A E, sounding as written
  var NAMES = ['G', 'D', 'A', 'E'];
  var SPAN = 7;                                 // first position: open string through 4th finger
  // offset above the open string -> [finger, placement]
  var FINGER = [[0, ''], [1, 'low'], [1, ''], [2, 'low'], [2, ''], [3, ''], [3, 'high'], [4, '']];
  var DEG = ['R', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♯5', '6', '♭7', '7'];

  function mod(n, m) { return ((n % m) + m) % m; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* intervals: semitones above the root; labels: optional matching names (scale degrees).
     Returns { [semitones above root mod 12]: { label, root } } */
  function toneMap(intervals, labels) {
    var m = {};
    intervals.forEach(function (iv, i) { m[mod(iv, 12)] = { label: (labels && labels[i]) || DEG[mod(iv, 12)], root: mod(iv, 12) === 0 }; });
    return m;
  }

  // Every first-position spot whose pitch class is in the map.
  function spots(rootPC, map) {
    var out = [];
    for (var s = 0; s < OPEN.length; s++) {
      for (var off = 0; off <= SPAN; off++) {
        var t = map[mod(OPEN[s] + off - rootPC, 12)];
        if (t) out.push({ s: s, off: off, midi: OPEN[s] + off, label: t.label, root: t.root, finger: FINGER[off][0], place: FINGER[off][1] });
      }
    }
    return out;
  }

  // The tones climbing from the lowest root on the instrument, for playing the chord or scale.
  function climb(rootPC, intervals, top) {
    var r0 = OPEN[0]; while (mod(r0, 12) !== mod(rootPC, 12)) r0++;
    var out = intervals.slice().sort(function (a, b) { return a - b; }).map(function (iv) { return r0 + iv; });
    if (top) out.push(r0 + 12);
    return out;
  }

  function draw(rootPC, map, label) {
    var list = spots(rootPC, map), nutX = 52, colW = 62, W = nutX + SPAN * colW + 16, H = 150;
    var strY = [124, 94, 64, 34];                      // G at the bottom, E on top
    var xOf = function (off) { return off === 0 ? nutX - 20 : nutX + (off - 0.5) * colW; };
    var o = ['<rect class="fb-vv-board" x="' + (nutX - 4) + '" y="18" width="' + (SPAN * colW + 8) + '" height="124" rx="8"/>'];
    for (var k = 1; k <= SPAN; k++) o.push('<text class="fb-vv-col" x="' + xOf(k) + '" y="12">' + FINGER[k][0] + (FINGER[k][1] ? (FINGER[k][1] === 'low' ? '↓' : '↑') : '') + '</text>');
    o.push('<line class="fb-vv-nut" x1="' + nutX + '" y1="18" x2="' + nutX + '" y2="142"/>');
    strY.forEach(function (y, s) {
      o.push('<line class="fb-vv-string" x1="' + nutX + '" y1="' + y + '" x2="' + (W - 12) + '" y2="' + y + '" stroke-width="' + (1 + (3 - s) * 0.45).toFixed(1) + '"/>');
      o.push('<text class="fb-vv-tag" x="12" y="' + y + '">' + NAMES[s] + '</text>');
    });
    list.forEach(function (n) {
      var cx = xOf(n.off), cy = strY[n.s];
      o.push('<g class="fb-vv-spot' + (n.root ? ' is-root' : '') + '" data-vm="' + n.midi + '">' +
        '<circle class="fb-vv-dot" cx="' + cx + '" cy="' + cy + '" r="12"/>' +
        '<text class="fb-vv-lbl" x="' + cx + '" y="' + cy + '">' + esc(n.label) + '</text>' +
        (n.off > 0 ? '<text class="fb-vv-fing" x="' + (cx + 15) + '" y="' + (cy - 13) + '">' + n.finger + (n.place === 'low' ? '↓' : n.place === 'high' ? '↑' : '') + '</text>' : '') +
        '</g>');
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label || 'Violin fingerboard, first position: chord tones with finger numbers') + '">' + o.join('') + '</svg>';
  }

  // Small card version for the bar pop-up.
  function mini(rootPC, map) {
    var list = spots(rootPC, map), nutX = 14, colW = 17, W = nutX + SPAN * colW + 6, strY = [48, 36, 24, 12];
    var xOf = function (off) { return off === 0 ? 7 : nutX + (off - 0.5) * colW; };
    var o = [];
    strY.forEach(function (y) { o.push('<line x1="' + nutX + '" y1="' + y + '" x2="' + (W - 2) + '" y2="' + y + '" class="fb-vv-mstring"/>'); });
    o.push('<line x1="' + nutX + '" y1="6" x2="' + nutX + '" y2="54" class="fb-vv-nut"/>');
    list.forEach(function (n) {
      o.push('<circle cx="' + xOf(n.off).toFixed(1) + '" cy="' + strY[n.s] + '" r="5" class="fb-vv-mdot' + (n.root ? ' is-root' : '') + '"/>');
    });
    return '<svg class="fb-mini-vln" viewBox="0 0 ' + W + ' 60" role="img" aria-label="Violin first-position chord tones">' + o.join('') + '</svg>';
  }

  var exported = { toneMap: toneMap, spots: spots, climb: climb, draw: draw, mini: mini, OPEN: OPEN, SPAN: SPAN, DEG: DEG };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  else root.FakeBookViolin = exported;
})(typeof window !== 'undefined' ? window : globalThis);
