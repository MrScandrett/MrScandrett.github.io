/* fake-book-position.js — "Finger positions" under the staff: one small fingerboard per measure
   with the melody's fingers placed on it, as an alternative to tab.

   The whole melody is routed in one pass (fake-book-melody.js, Viterbi over hand positions), so each
   measure begins in the hand position the last one ended in. Each diagram shows where the previous
   measure's last note was (dashed ring) so the eye can follow the hand from bar to bar.

   plan() and draw() are pure (draw returns an SVG string); exported for tests. */
(function (root) {
  'use strict';

  var MV = (typeof module !== 'undefined' && module.exports) ? require('./fake-book-melody.js') : root.FakeBookMelody;
  var STRINGS = { guitar: 6, violin: 4 };
  var NAMES = { guitar: ['E', 'A', 'D', 'G', 'B', 'e'], violin: ['G', 'D', 'A', 'E'] };
  var TAG = { guitar: 'GTR', violin: 'VLN' };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function col(n, inst) { return inst === 'violin' ? n.off : n.f; }     // fret or semitone above the open string

  /* notes: [{ bar, midi, name }] in playing order (concert pitch). Returns
     { inst, shift, bars: { [bar]: { spots: [{ s, c, finger, place, name, pos, shift }], first, last, from, positions } } } */
  function plan(inst, notes, pos) {
    inst = inst === 'violin' ? 'violin' : 'guitar';
    var out = { inst: inst, shift: 0, bars: {}, order: [] };
    if (!notes.length || !MV) return out;
    var fit = MV.fitRoute(inst, notes.map(function (n) { return n.midi; }), pos);
    out.shift = fit.shift;
    var prev = null;
    notes.forEach(function (n, i) {
      var r = fit.plan[i];
      if (!r) { return; }
      var b = out.bars[n.bar];
      if (!b) { b = out.bars[n.bar] = { spots: [], from: prev, positions: [] }; out.order.push(n.bar); }
      b.spots.push({ s: r.s, c: col(r, inst), finger: r.finger, place: r.place || '', name: n.name, pos: r.pos, shift: !!r.shift });
      if (b.positions[b.positions.length - 1] !== r.pos) b.positions.push(r.pos);
      prev = b.spots[b.spots.length - 1];
    });
    return out;
  }

  function posName(inst, p) { return inst === 'guitar' && p === 0 ? 'open' : MV.ROMAN[p]; }

  /* One bar's diagram in the box (x, y, w, h). S is the staff space. */
  function draw(inst, bar, x, y, w, h, S) {
    if (!bar || !bar.spots.length) return '';
    var nS = STRINGS[inst], spots = bar.spots, g = ['<g class="fb-pos" pointer-events="none">'];
    var cols = spots.map(function (n) { return n.c; }).filter(function (c) { return c > 0; });
    var hasOpen = spots.some(function (n) { return n.c === 0; });
    var p0 = spots[0].pos, base;
    // The window: the hand's position, stretched to hold every note in the bar.
    if (inst === 'violin') base = [0, 2, 4, 5, 7, 9, 11, 12][p0] - 1;
    else base = p0 === 0 ? 1 : p0;
    var c0 = Math.max(1, Math.min.apply(null, cols.concat([base]))), c1 = Math.max.apply(null, cols.concat([c0 + (inst === 'violin' ? 6 : 3)]));
    var from = bar.from;
    var fromIn = from && from.c > 0 && from.c >= c0 && from.c <= c1;
    var ncols = c1 - c0 + 1, pad = 0.6 * S, openW = 2 * S, labelH = 2 * S;
    var gx = x + pad + openW, gw = w - 2 * pad - openW, cw = gw / ncols;
    var top = y + labelH + 0.6 * S, bot = y + h - 0.7 * S, step = (bot - top) / (nS - 1);
    var xOf = function (c) { return c === 0 ? x + pad + openW * 0.45 : gx + (c - c0 + 0.5) * cw; };
    var yOf = function (s) { return bot - s * step; };               // lowest string at the bottom
    var r = Math.min(0.8 * S, cw * 0.42, step * 0.47), fs = r * 1.25;
    // label: where the hand is, and where it travels to
    var label = bar.positions.length > 1 ? posName(inst, bar.positions[0]) + ' → ' + posName(inst, bar.positions[bar.positions.length - 1]) : posName(inst, bar.positions[0]);
    var shifted = spots[0].shift || bar.positions.length > 1;
    g.push('<text class="fb-pos-label' + (shifted ? ' is-shift' : '') + '" x="' + (x + pad).toFixed(1) + '" y="' + (y + 1.4 * S).toFixed(1) + '" font-size="' + (1.15 * S).toFixed(1) + '">' +
      esc(inst === 'violin' ? label + ' pos.' : (label === 'open' ? 'open pos.' : 'pos. ' + label)) + (spots[0].shift ? ' ⇢ shift' : '') + '</text>');
    // board: column shading alternates, strings run across
    for (var k = 0; k < ncols; k++) {
      g.push('<rect class="fb-pos-col' + (k % 2 ? ' is-odd' : '') + '" x="' + (gx + k * cw).toFixed(1) + '" y="' + (top - 0.5 * step).toFixed(1) + '" width="' + cw.toFixed(1) + '" height="' + (bot - top + step).toFixed(1) + '"/>');
      g.push('<text class="fb-pos-colnum" x="' + (gx + (k + 0.5) * cw).toFixed(1) + '" y="' + (y + h - 0.05 * S).toFixed(1) + '" font-size="' + (0.75 * S).toFixed(1) + '">' + (c0 + k) + '</text>');
    }
    for (var s = 0; s < nS; s++) {
      g.push('<line class="fb-pos-string" x1="' + (x + pad).toFixed(1) + '" y1="' + yOf(s).toFixed(1) + '" x2="' + (gx + gw).toFixed(1) + '" y2="' + yOf(s).toFixed(1) + '" stroke-width="' + (0.07 * S * (1 + (nS - 1 - s) * 0.18)).toFixed(2) + '"/>');
    }
    g.push('<line class="fb-pos-nut" x1="' + gx.toFixed(1) + '" y1="' + (top - 0.5 * step).toFixed(1) + '" x2="' + gx.toFixed(1) + '" y2="' + (bot + 0.5 * step).toFixed(1) + '"/>');
    // voice leading: the last note of the previous bar, then this bar's path
    if (fromIn) g.push('<circle class="fb-pos-from" cx="' + xOf(from.c).toFixed(1) + '" cy="' + yOf(from.s).toFixed(1) + '" r="' + (r + 0.25 * S).toFixed(1) + '"/>');
    var pts = spots.map(function (n) { return xOf(n.c).toFixed(1) + ',' + yOf(n.s).toFixed(1); });
    if (fromIn) pts.unshift(xOf(from.c).toFixed(1) + ',' + yOf(from.s).toFixed(1));
    if (pts.length > 1) g.push('<polyline class="fb-pos-path" points="' + pts.join(' ') + '" stroke-width="' + (0.12 * S).toFixed(2) + '"/>');
    var seen = {};
    spots.forEach(function (n, i) {
      var id = n.s + ':' + n.c;
      if (seen[id]) return;
      seen[id] = true;
      var cx = xOf(n.c), cy = yOf(n.s), open = n.c === 0;
      g.push('<circle class="fb-pos-dot' + (open ? ' is-open' : '') + (i === 0 ? ' is-first' : '') + '" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) + '"/>');
      g.push('<text class="fb-pos-fing' + (open ? ' is-open' : '') + '" x="' + cx.toFixed(1) + '" y="' + cy.toFixed(1) + '" font-size="' + fs.toFixed(1) + '">' + (open ? 'o' : n.finger) + '</text>');
      if (n.place) g.push('<text class="fb-pos-place" x="' + (cx + r).toFixed(1) + '" y="' + (cy - r).toFixed(1) + '" font-size="' + (fs * 0.9).toFixed(1) + '">' + (n.place === 'low' ? '↓' : '↑') + '</text>');
    });
    g.push('</g>');
    return g.join('');
  }

  var exported = { plan: plan, draw: draw, height: function (inst, S) { return (inst === 'guitar' ? 11.5 : 9) * S; }, TAG: TAG, NAMES: NAMES };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  else root.FakeBookPosition = exported;
})(typeof window !== 'undefined' ? window : globalThis);
