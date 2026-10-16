/* sax-key-map.js — the labelled key map in the saxophone lesson's key guide.
   The Fake Book's flat key drawing (fake-book-sax.js geometry) enlarged, each key named.
   svg(pressed, highlight): pressed = key ids drawn solid; highlight = one id ringed in orange.
   Also used by scripts/build-sax-key-map.mjs to write the static key-map.svg. */
(function (root) {
  'use strict';
  var FB = root.FakeBookSax || (typeof require === 'function' ? require('./fake-book-sax.js') : null);
  var S = 5.4, M = 190, INK = '#111';
  var NAMES = {
    octave: ['Octave key (thumb)', 'l'], bis: ['Bis B♭', 'l'], lowB: ['Low B', 'l'], highE: ['High E (side)', 'l'], sideC: ['Side C', 'l'], sideBflat: ['Side B♭', 'l'],
    palmEflat: ['Palm E♭', 'r'], palmD: ['Palm D', 'r'], palmF: ['Palm F', 'r'], Gsharp: ['G♯', 'r'], lowCsharp: ['Low C♯', 'r'], lowBflat: ['Low B♭', 'r'], Eflat: ['E♭ (little finger)', 'r'], lowC: ['Low C (little finger)', 'r']
  };
  function svg(pressedKeys, highlight) {
    var pressed = {}; (pressedKeys || []).forEach(function (k) { pressed[k] = true; });
    var width = FB.W * S + M * 2, height = FB.H * S;
    var o = '<rect width="' + width + '" height="' + (height + 40) + '" fill="#fff"/><g transform="translate(0 20)" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="' + INK + '">';
    o += '<line x1="' + (M + 7 * S) + '" x2="' + (M + 27 * S) + '" y1="' + 56 * S + '" y2="' + 56 * S + '" stroke="' + INK + '" stroke-width="1.2" opacity=".45"/>';
    o += '<text x="' + (width - 6) + '" y="12" text-anchor="end" font-weight="700" fill="#556">LEFT HAND ▲</text><text x="' + (width - 6) + '" y="' + (height - 4) + '" text-anchor="end" font-weight="700" fill="#556">RIGHT HAND ▼</text>';
    FB.geometry.forEach(function (g) {
      var id = g[0], shape = g[1], cx = g[2], cy = g[3], rx = g[4], ry = g[5], on = !!pressed[id], x = M + cx * S, y = cy * S;
      var paint = on ? 'fill="' + INK + '" stroke="' + INK + '" stroke-width="1.6"' : 'fill="none" stroke="' + INK + '" stroke-width="1.6" opacity=".55"';
      if (id === highlight) o += (shape === 'c' ? '<circle cx="' + x + '" cy="' + y + '" r="' + (rx * S + 7) + '"' : '<ellipse cx="' + x + '" cy="' + y + '" rx="' + (rx * S + 7) + '" ry="' + (ry * S + 7) + '"') + ' fill="none" stroke="#ea580c" stroke-width="4"/>';
      o += shape === 'c' ? '<circle cx="' + x + '" cy="' + y + '" r="' + rx * S + '" ' + paint + '/>' : '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx * S + '" ry="' + ry * S + '" ' + paint + '/>';
      if (/^[LR][123]$/.test(id)) o += '<text x="' + x + '" y="' + (y + 5) + '" text-anchor="middle" font-size="15" font-weight="800" fill="' + (on ? '#fff' : INK) + '">' + id[1] + '</text>';
      var n = NAMES[id];
      if (n) { var half = rx * S + 8; o += n[1] === 'l' ? '<text x="' + (x - half) + '" y="' + (y + 5) + '" text-anchor="end">' + n[0] + '</text>' : '<text x="' + (x + half) + '" y="' + (y + 5) + '">' + n[0] + '</text>'; }
    });
    o += '</g>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + (height + 40) + '" role="img" aria-labelledby="t d"><title id="t">Saxophone key map</title><desc id="d">Top half is the left hand: octave key, numbered main keys, bis key, palm keys and little-finger table. Bottom half is the right hand: side keys, numbered main keys and little-finger keys. Solid shapes are pressed keys.</desc>' + o + '</svg>';
  }
  var api = { svg: svg };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SaxKeyMap = api;
})(typeof window !== 'undefined' ? window : globalThis);
