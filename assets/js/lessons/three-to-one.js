/* 3:1 rule explorer for microphone-polar-patterns.html#three-to-one.
 * Maths in StudioSignal.threeToOne / .combResponse (tests/studio-signal.test.mjs). */
(function () {
  'use strict';
  var S = window.StudioSignal;
  var host = document.querySelector('[data-three-to-one]');
  if (!S || !host) return;
  var $ = function (id) { return document.getElementById(id); };
  var nearIn = $('tto-near'), farIn = $('tto-far');
  var svg = host.querySelector('svg');
  var NS = 'http://www.w3.org/2000/svg';
  var W = 520, H = 200, L = 38, R = 10, T = 12, B = 26;
  var F0 = 20, F1 = 20000, D0 = -24, D1 = 9;

  function fx(f) { return L + Math.log(f / F0) / Math.log(F1 / F0) * (W - L - R); }
  function dy(db) { return T + (D1 - Math.max(D0, Math.min(D1, db))) / (D1 - D0) * (H - T - B); }
  function el(name, attrs, text) {
    var n = document.createElementNS(NS, name);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    svg.appendChild(n);
    return n;
  }

  function render() {
    var nearCm = Number(nearIn.value), farCm = Number(farIn.value);
    if (farCm <= nearCm) { farCm = nearCm + 1; farIn.value = farCm; }
    $('tto-near-out').textContent = nearCm + ' cm';
    $('tto-far-out').textContent = farCm + ' cm';
    var near = nearCm / 100, far = farCm / 100;
    var r = S.threeToOne(near, far);

    while (svg.lastChild && svg.lastChild.nodeName !== 'title') svg.removeChild(svg.lastChild);
    [50, 100, 200, 500, 1000, 2000, 5000, 10000].forEach(function (f) {
      el('line', { x1: fx(f), x2: fx(f), y1: T, y2: H - B, stroke: 'rgba(255,255,255,.07)' });
      el('text', { x: fx(f), y: H - 10, fill: '#aab4c2', 'font-size': 10, 'text-anchor': 'middle' }, f >= 1000 ? (f / 1000) + 'k' : f);
    });
    [6, 0, -6, -12, -18].forEach(function (d) {
      el('line', { x1: L, x2: W - R, y1: dy(d), y2: dy(d), stroke: d === 0 ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.07)' });
      el('text', { x: L - 5, y: dy(d) + 3, fill: '#aab4c2', 'font-size': 10, 'text-anchor': 'end' }, d);
    });
    var d = '';
    for (var i = 0; i <= 900; i++) {
      var f = F0 * Math.pow(F1 / F0, i / 900);
      d += (i ? 'L' : 'M') + fx(f).toFixed(1) + ' ' + dy(S.combResponse(near, far, f)).toFixed(1);
    }
    el('path', { d: d, fill: 'none', stroke: r.passes ? '#66d28a' : '#ff766c', 'stroke-width': 1.6, 'stroke-linejoin': 'round' });

    $('tto-ratio').textContent = r.ratio.toFixed(1) + ' : 1';
    $('tto-bleed').textContent = r.bleedDb.toFixed(1) + ' dB';
    $('tto-swing').textContent = r.swingDb === Infinity ? 'total' : '±' + (r.swingDb / 2).toFixed(1) + ' dB';
    $('tto-notch').textContent = r.firstNotchHz >= 1000 ? (r.firstNotchHz / 1000).toFixed(2) + ' kHz' : r.firstNotchHz + ' Hz';
    var o = $('tto-readout');
    var need = nearCm * 3;
    if (r.passes) {
      o.className = 'te-readout good';
      o.innerHTML = '<strong>Passes 3:1.</strong> The leak into the guitar mic is ' + Math.abs(r.bleedDb).toFixed(1) + ' dB down, so the notches are only ' + Math.abs(r.notchDb).toFixed(1) + ' dB deep. The comb is still there, just too shallow to hear as "phasey."';
    } else {
      o.className = 'te-readout bad';
      o.innerHTML = '<strong>Fails 3:1.</strong> The leak is only ' + Math.abs(r.bleedDb).toFixed(1) + ' dB down, so notches cut ' + (r.notchDb === -Infinity ? 'all the way' : Math.abs(r.notchDb).toFixed(1) + ' dB') + ' into her voice, starting at ' + $('tto-notch').textContent + '. Move the guitar mic to at least <strong>' + need + ' cm</strong> from her, or move her closer to her own mic.';
    }
  }
  [nearIn, farIn].forEach(function (i) { i.addEventListener('input', render); });
  render();
}());
