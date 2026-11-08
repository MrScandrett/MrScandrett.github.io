/* Parallel (New York) compression explorer for audio-compression.html#serial-parallel.
 * Curves come from StudioSignal.compress / .parallel (tests/studio-signal.test.mjs). */
(function () {
  'use strict';
  var S = window.StudioSignal;
  var host = document.querySelector('[data-parallel-compression]');
  if (!S || !host) return;
  var svg = host.querySelector('svg');
  var NS = 'http://www.w3.org/2000/svg';
  var W = 420, H = 300, L = 44, R = 12, T = 12, B = 34;
  var X0 = -60, X1 = 0, Y0 = -60, Y1 = 6;
  var $ = function (id) { return document.getElementById(id); };
  var wet = $('pc-wet'), thr = $('pc-threshold'), ratio = $('pc-ratio');

  function sx(db) { return L + (db - X0) / (X1 - X0) * (W - L - R); }
  function sy(db) { return T + (Y1 - Math.max(Y0, Math.min(Y1, db))) / (Y1 - Y0) * (H - T - B); }
  function el(name, attrs, text) {
    var n = document.createElementNS(NS, name);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    svg.appendChild(n);
    return n;
  }
  function curve(fn, color, width, dash) {
    var d = '';
    for (var x = X0; x <= X1 + 1e-9; x += 0.5) d += (d ? 'L' : 'M') + sx(x).toFixed(1) + ' ' + sy(fn(x)).toFixed(1);
    el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': width, 'stroke-dasharray': dash || 'none', 'stroke-linejoin': 'round' });
  }

  function render() {
    var c = { threshold: Number(thr.value), ratio: Number(ratio.value), wetDb: Number(wet.value), dryDb: 0 };
    $('pc-wet-out').textContent = (c.wetDb > 0 ? '+' : '') + c.wetDb + ' dB';
    $('pc-threshold-out').textContent = c.threshold + ' dB';
    $('pc-ratio-out').textContent = c.ratio + ':1';
    while (svg.lastChild && svg.lastChild.nodeName !== 'title') svg.removeChild(svg.lastChild);
    for (var g = -60; g <= 0; g += 10) {
      el('line', { x1: sx(g), x2: sx(g), y1: T, y2: H - B, stroke: 'rgba(255,255,255,.07)' });
      el('line', { x1: L, x2: W - R, y1: sy(g), y2: sy(g), stroke: 'rgba(255,255,255,.07)' });
      el('text', { x: sx(g), y: H - B + 14, fill: '#aab4c2', 'font-size': 10, 'text-anchor': 'middle' }, g);
      el('text', { x: L - 6, y: sy(g) + 3, fill: '#aab4c2', 'font-size': 10, 'text-anchor': 'end' }, g);
    }
    el('text', { x: (L + W - R) / 2, y: H - 4, fill: '#aab4c2', 'font-size': 10, 'text-anchor': 'middle' }, 'Input level (dB)');
    el('text', { x: 12, y: (T + H - B) / 2, fill: '#aab4c2', 'font-size': 10, 'text-anchor': 'middle', transform: 'rotate(-90 12 ' + (T + H - B) / 2 + ')' }, 'Output (dB)');
    curve(function (x) { return x; }, '#6f7f8f', 1.6, '5 4');
    curve(function (x) { return S.compress(x, c) + c.wetDb; }, '#ff766c', 1.8);
    curve(function (x) { return S.parallel(x, c); }, '#59c8d8', 2.8);

    var quiet = S.parallel(-50, c) + 50, loud = S.parallel(-6, c) + 6;
    $('pc-readout').innerHTML = 'A quiet ghost note at −50 dB comes up <strong>' + quiet.toFixed(1) + ' dB</strong>; a loud hit at −6 dB comes up only <strong>' + loud.toFixed(1) + ' dB</strong>. ' +
      'The blend squeezes the dynamic range from the bottom up and leaves the peaks (the punch) mostly alone. Serial compression does the opposite: it turns the peaks down. ' +
      'Remember to level-match before you judge it, because the blend is louder overall.';
  }
  [wet, thr, ratio].forEach(function (i) { i.addEventListener('input', render); });
  render();
}());
