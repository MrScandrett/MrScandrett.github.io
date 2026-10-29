/* fake-book-fingering.js — the words and pictures for choosing how a tab column is fingered.

   The Fake Book's "Choose fingerings" mode lets a player click a beat in the tab and pick another
   playable fingering for it (FakeBookTab.choices); the pick is pinned and the tab re-routes around it.
   This file holds the pure parts of that chooser: a small fretboard picture of one fingering, how
   far the hand moves to reach it, the beat's name, and where the tab's hand position changes.

   Fingerings are [[string, fret]…], string 1 = highest. Pure functions, exported for tests. */
(function (root) {
  'use strict';

  var STD_NAMES = ['high e', 'B', 'G', 'D', 'A', 'low E'];
  var ROMAN = ['open', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII'];

  function frets(f) { return f.filter(function (x) { return x[1] > 0; }).map(function (x) { return x[1]; }); }
  function span(f) {
    var fr = frets(f);
    return fr.length ? { lo: Math.min.apply(null, fr), hi: Math.max.apply(null, fr) } : null;
  }
  function stringName(s, names) { return (names || STD_NAMES)[s - 1] || 'string ' + s; }
  function posName(p) { return p ? 'pos. ' + ROMAN[p] : 'open position'; }
  // The hand's position for a fingering (its lowest fretted fret), 0 when only open strings ring.
  function hand(f) { var sp = span(f); return sp ? sp.lo : 0; }

  /* "fret 7 on the G string" / "B string fret 3 + low E string open" (highest string first). */
  function describe(f, names) {
    var list = f.slice().sort(function (a, b) { return a[0] - b[0]; });
    if (list.length === 1) return (list[0][1] ? 'fret ' + list[0][1] + ' on the ' : 'open ') + stringName(list[0][0], names) + ' string';
    return list.map(function (x) { return stringName(x[0], names) + ' ' + (x[1] ? 'fret ' + x[1] : 'open'); }).join(' + ');
  }

  /* How the hand gets from the previous fingering to this one: { kind, frets, text }.
     kind: 'free' (open strings only), 'stay' (both fit under one hand), 'shift' (frets > 0 up, < 0 down). */
  function handMove(prev, next) {
    var b = span(next);
    if (!b) return { kind: 'free', frets: 0, text: 'open strings: the hand is free' };
    var a = prev && span(prev);
    if (!a) return { kind: 'stay', frets: 0, text: prev ? 'after open strings' : 'first note' };
    var lo = Math.min(a.lo, b.lo), hi = Math.max(a.hi, b.hi);
    if (hi - lo <= 3 + (lo >= 7 ? 1 : 0)) return { kind: 'stay', frets: 0, text: 'stays under the hand' };
    var d = b.lo - a.lo;
    return { kind: 'shift', frets: d, text: 'shift ' + Math.abs(d) + ' fret' + (Math.abs(d) === 1 ? '' : 's') + (d > 0 ? ' up the neck' : ' down the neck') };
  }

  /* Where the hand moves to a new position across a tab: { [event index]: fret }. A column outside
     the current hand (one finger per fret, a fret further from the 7th up) starts a new position. */
  function handMarks(events) {
    var out = {}, cur = null;
    events.forEach(function (e, i) {
      var sp = e && e.f && span(e.f);
      if (!sp) return;
      var reach = cur !== null && cur >= 7 ? 4 : 3;
      if (cur === null || sp.lo < cur || sp.hi > cur + reach) {
        cur = sp.lo;
        out[i] = cur;
      }
    });
    return out;
  }

  /* "beat 2", "beat 2&", "beat 3e", "beat 4a": the count a player says for a moment in the bar.
     rel = beats from the start of the bar. */
  function beatName(rel) {
    var whole = Math.floor(rel + 1e-6), frac = rel - whole, near = function (x) { return Math.abs(frac - x) < 1e-3; };
    return 'beat ' + (whole + 1) + (near(0) ? '' : near(0.5) ? '&' : near(0.25) ? 'e' : near(0.75) ? 'a' : ' + ' + frac.toFixed(2).replace(/^0/, ''));
  }

  /* A small fretboard picture of one fingering: high e on top (as in tab), five frets wide.
     opts: { strings (default 6), width (default 132), title }. Returns an SVG string. */
  function miniBoard(f, opts) {
    opts = opts || {};
    var n = opts.strings || 6, W = opts.width || 132, H = Math.round(W * 0.72);
    var sp = span(f);
    var w0 = sp ? Math.max(1, Math.min(sp.lo - 1, sp.hi - 4)) : 1;     // a fret of room below the hand when it fits
    var cols = sp ? Math.max(5, sp.hi - w0 + 1) : 5;                   // an imported tab may stretch further
    var L = 16, R = W - 6, T = 8, B = H - 16, cw = (R - L) / cols, step = (B - T) / (n - 1);
    var yOf = function (s) { return T + (s - 1) * step; };
    var g = ['<svg class="fb-fing-board" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true" focusable="false">'];
    for (var c = 0; c <= cols; c++) {
      var x = L + c * cw;
      g.push('<line class="fb-fing-fret' + (c === 0 && w0 === 1 ? ' is-nut' : '') + '" x1="' + x.toFixed(1) + '" y1="' + T + '" x2="' + x.toFixed(1) + '" y2="' + B + '"/>');
    }
    for (var s = 1; s <= n; s++) g.push('<line class="fb-fing-string" x1="' + L + '" y1="' + yOf(s).toFixed(1) + '" x2="' + R + '" y2="' + yOf(s).toFixed(1) + '"/>');
    g.push('<text class="fb-fing-num" x="' + (L + cw / 2).toFixed(1) + '" y="' + (H - 3) + '">' + w0 + '</text>');
    g.push('<text class="fb-fing-num" x="' + (L + (cols - 0.5) * cw).toFixed(1) + '" y="' + (H - 3) + '">' + (w0 + cols - 1) + '</text>');
    var r = Math.min(cw * 0.42, step * 0.56);
    f.forEach(function (x) {
      var y = yOf(x[0]);
      if (x[1] === 0) { g.push('<circle class="fb-fing-open" cx="' + (L - 8) + '" cy="' + y.toFixed(1) + '" r="' + (r * 0.75).toFixed(1) + '"/>'); return; }
      var cx = L + (x[1] - w0 + 0.5) * cw;
      g.push('<circle class="fb-fing-dot" cx="' + cx.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) + '"/>');
      g.push('<text class="fb-fing-dot-num" x="' + cx.toFixed(1) + '" y="' + (y + r * 0.42).toFixed(1) + '" font-size="' + (r * 1.15).toFixed(1) + '">' + x[1] + '</text>');
    });
    g.push('</svg>');
    return g.join('');
  }

  var exported = { describe: describe, handMove: handMove, handMarks: handMarks, beatName: beatName, miniBoard: miniBoard, posName: posName, hand: hand, STD_NAMES: STD_NAMES, ROMAN: ROMAN };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  else root.FakeBookFingering = exported;
})(typeof window !== 'undefined' ? window : globalThis);
