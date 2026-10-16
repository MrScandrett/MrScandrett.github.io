/* fake-book-sax.js — saxophone fingerings for the Fake Book's sheet.

   Every saxophone (soprano, alto, tenor, bari) fingers a *written* note the same way, so a
   fingering is looked up from the note as printed on the page. The fingerings themselves are not
   kept here: they come from saxophone-fingerings.js (window.SaxFingerings), the table the
   Saxophone lesson teaches from, so a correction there fixes both pages. This file only draws them.

   The diagram is tall and skinny so a whole bar of sixteenths fits under the staff:
     top half    = left hand: octave key (thumb), 1 · bis · 2 · 3, palm keys (E♭, D, F) at the
                   right, pinky table (G♯ / B · C♯ / B♭) underneath
     bottom half = right hand: side keys (high E, side C, side B♭) at the left, 1 · 2 · 3,
                   pinky keys (E♭, low C) underneath
   A filled key is pressed.

   Pure functions returning data / SVG strings; exported for tests. */
(function (root) {
  'use strict';

  if (!root.SaxFingerings && typeof require === 'function') require('./saxophone-fingerings.js');
  var F = root.SaxFingerings;
  // The standard (first) fingering of every note in the shared table, lesson range plus palm keys.
  var STANDARD = {}, LOW = Infinity, HIGH = -Infinity, LABELS = {};
  F.notes.concat(F.palmNotes || []).forEach(function (n) {
    STANDARD[n.midi] = n.variants[0].keys;
    LOW = Math.min(LOW, n.midi); HIGH = Math.max(HIGH, n.midi);
  });
  F.keys.concat(F.palmKeys || []).forEach(function (k) { LABELS[k.id] = k.label; });

  // { keys: [...], played: midi actually fingered, shift: +12 / -12 / 0 } or null for a non-number.
  // Notes outside the horn's range are fingered an octave in (shift says which way).
  function fingering(writtenMidi) {
    if (typeof writtenMidi !== 'number' || !isFinite(writtenMidi)) return null;
    var m = Math.round(writtenMidi), shift = 0;
    while (m < LOW) { m += 12; shift += 12; }
    while (m > HIGH) { m -= 12; shift -= 12; }
    if (!STANDARD[m]) return null;                 // a gap in the shared table
    return { keys: STANDARD[m].slice(), played: m, shift: shift };
  }

  // Key drawings, ids as in saxophone-fingerings.js: [id, shape, cx, cy, rx, ry].
  // 'c' = circle (rx = r), 'e' = ellipse. Side C is drawn for orientation; no standard fingering uses it.
  var W = 30, H = 101;
  var KEYS = [
    ['octave', 'c', 5, 6, 2.6],
    ['L1', 'c', 15, 9, 4.4],
    ['bis', 'c', 15, 16.2, 1.7],
    ['L2', 'c', 15, 23.4, 4.4],
    ['L3', 'c', 15, 34.4, 4.4],
    ['palmEflat', 'e', 26, 4, 1.9, 2.9],
    ['palmD', 'e', 26, 10.6, 1.9, 2.9],
    ['palmF', 'e', 26, 17.2, 1.9, 2.9],
    ['Gsharp', 'e', 23, 42.2, 4.3, 1.7],
    ['lowB', 'c', 20.6, 46.6, 1.8],
    ['lowCsharp', 'c', 25.4, 46.6, 1.8],
    ['lowBflat', 'e', 23, 51, 4.3, 1.7],
    ['highE', 'e', 4.6, 61, 1.6, 3.3],
    ['sideC', 'e', 4.6, 68.4, 1.6, 3.3],
    ['sideBflat', 'e', 4.6, 75.8, 1.6, 3.3],
    ['R1', 'c', 15, 62, 4.4],
    ['R2', 'c', 15, 73, 4.4],
    ['R3', 'c', 15, 84, 4.4],
    ['Eflat', 'e', 15, 92.4, 4.3, 1.7],
    ['lowC', 'e', 15, 97.6, 4.3, 1.7]
  ];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function describe(f) {
    if (!f) return '';
    return f.keys.length ? f.keys.map(function (k) { return LABELS[k] || k; }).join(', ') : 'all keys open';
  }

  // name: the note's printed name (for the aria label). Returns an <svg> string.
  function draw(writtenMidi, name) {
    var f = fingering(writtenMidi);
    if (!f) return '';
    var on = {};
    f.keys.forEach(function (k) { on[k] = true; });
    var o = ['<line x1="7" y1="56" x2="27" y2="56" stroke="currentColor" stroke-width=".6" opacity=".45"/>'];
    KEYS.forEach(function (k) {
      var pressed = !!on[k[0]];
      var paint = pressed ? ' fill="currentColor" stroke="currentColor" stroke-width=".8"' : ' fill="none" stroke="currentColor" stroke-width=".8" opacity=".55"';
      o.push(k[1] === 'c'
        ? '<circle class="fb-sx-key" data-key="' + k[0] + '" cx="' + k[2] + '" cy="' + k[3] + '" r="' + k[4] + '"' + paint + '/>'
        : '<ellipse class="fb-sx-key" data-key="' + k[0] + '" cx="' + k[2] + '" cy="' + k[3] + '" rx="' + k[4] + '" ry="' + k[5] + '"' + paint + '/>');
    });
    var label = 'Saxophone fingering' + (name ? ' for ' + name : '') + (f.shift > 0 ? ', played an octave higher' : f.shift < 0 ? ', played an octave lower' : '') + ': ' + describe(f);
    return '<svg class="fb-sx-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label) + '">' + o.join('') + '</svg>';
  }

  var exported = { fingering: fingering, draw: draw, describe: describe, LOW: LOW, HIGH: HIGH, KEYS: KEYS.map(function (k) { return k[0]; }) };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  else root.FakeBookSax = exported;
})(typeof window !== 'undefined' ? window : globalThis);
