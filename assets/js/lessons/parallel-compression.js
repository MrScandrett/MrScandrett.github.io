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

  // Real Web Audio parallel drum audition
  var audioSys = null, pcNodes = null, pcMode = 'off'; // 'off' | 'dry' | 'wet' | 'blend'
  var btnDry = $('pc-hear-dry'), btnWet = $('pc-hear-wet'), btnBlend = $('pc-hear-blend');
  var matchCheck = $('pc-level-match'), resetBtn = $('pc-reset');

  function ensurePcAudio() {
    if (audioSys) return audioSys;
    var synth = window.AudioLabSynth;
    audioSys = synth ? synth.createContext({ gain: 0.48 }) : null;
    if (!audioSys) return null;
    var ctx = audioSys.ctx;
    var buf = synth.createDrumLoopBuffer(ctx, { seconds: 2.0, sr: 44100 });
    var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;

    var dryG = ctx.createGain();
    var comp = ctx.createDynamicsCompressor();
    comp.attack.value = 0.004;
    comp.release.value = 0.14;
    comp.knee.value = 2;
    var wetMakeup = ctx.createGain();
    var wetG = ctx.createGain();
    var trimG = ctx.createGain();
    var outGate = ctx.createGain(); outGate.gain.value = 0;

    src.connect(dryG).connect(trimG);
    src.connect(comp).connect(wetMakeup).connect(wetG).connect(trimG);
    trimG.connect(outGate).connect(audioSys.input);
    src.start();
    pcNodes = { dryG: dryG, comp: comp, wetMakeup: wetMakeup, wetG: wetG, trimG: trimG, outGate: outGate };
    return audioSys;
  }

  function updatePcAudio() {
    if (!pcNodes || !audioSys) return;
    var ctx = audioSys.ctx, sm = window.AudioLabSynth.smooth;
    var thrVal = Number(thr.value), ratioVal = Number(ratio.value), wetDb = Number(wet.value);
    sm(pcNodes.comp.threshold, thrVal, ctx, 0.02);
    sm(pcNodes.comp.ratio, ratioVal, ctx, 0.02);
    var auto = -0.6 * (S.compress(0, { threshold: thrVal, ratio: ratioVal, knee: 2 }) - 0);
    sm(pcNodes.wetMakeup.gain, Math.pow(10, (wetDb - auto) / 20), ctx, 0.02);
    sm(pcNodes.dryG.gain, pcMode === 'wet' ? 0 : 1, ctx, 0.02);
    sm(pcNodes.wetG.gain, pcMode === 'dry' ? 0 : 1, ctx, 0.02);
    var matchTrim = matchCheck && matchCheck.checked && pcMode === 'blend' ? 0.62 : 1;
    sm(pcNodes.trimG.gain, matchTrim, ctx, 0.025);
    sm(pcNodes.outGate.gain, pcMode !== 'off' && !document.hidden ? 1 : 0, ctx, 0.025);
  }

  function syncButtons() {
    [['dry', btnDry], ['wet', btnWet], ['blend', btnBlend]].forEach(function (pair) {
      if (!pair[1]) return;
      var active = pcMode === pair[0];
      pair[1].setAttribute('aria-pressed', active ? 'true' : 'false');
      pair[1].classList.toggle('audio-on', active);
    });
  }

  function toggleMode(m) {
    pcMode = pcMode === m ? 'off' : m;
    if (pcMode !== 'off') { ensurePcAudio(); if (audioSys) audioSys.resume(); }
    syncButtons();
    updatePcAudio();
  }

  if (btnDry) btnDry.addEventListener('click', function () { toggleMode('dry'); });
  if (btnWet) btnWet.addEventListener('click', function () { toggleMode('wet'); });
  if (btnBlend) btnBlend.addEventListener('click', function () { toggleMode('blend'); });
  if (matchCheck) matchCheck.addEventListener('change', updatePcAudio);
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      wet.value = 10; thr.value = -40; ratio.value = 10;
      render();
    });
  }
  document.addEventListener('visibilitychange', updatePcAudio);

  function render() {
    var c = { threshold: Number(thr.value), ratio: Number(ratio.value), wetDb: Number(wet.value), dryDb: 0 };
    $('pc-wet-out').textContent = (c.wetDb > 0 ? '+' : '') + c.wetDb + ' dB';
    $('pc-threshold-out').textContent = c.threshold + ' dB';
    $('pc-ratio-out').textContent = c.ratio + ':1';
    while (svg.lastChild && svg.lastChild.nodeName !== 'title') svg.removeChild(svg.lastChild);
    for (var g = -60; g <= 0; g += 10) {
      el('line', { x1: sx(g), x2: sx(g), y1: T, y2: H - B, stroke: 'rgba(255,255,255,.07)' });
      el('line', { x1: L, x2: W - R, y1: sy(g), y2: sy(g), stroke: g === 0 ? 'rgba(255,118,108,0.45)' : 'rgba(255,255,255,.07)', 'stroke-dasharray': g === 0 ? '4 4' : 'none' });
      el('text', { x: sx(g), y: H - B + 14, fill: '#aab4c2', 'font-size': 10, 'text-anchor': 'middle' }, g);
      el('text', { x: L - 6, y: sy(g) + 3, fill: '#aab4c2', 'font-size': 10, 'text-anchor': 'end' }, g);
    }
    el('text', { x: W - R - 4, y: sy(0) - 4, fill: '#ff948b', 'font-size': 9, 'text-anchor': 'end' }, '0 dBFS ceiling');
    el('text', { x: (L + W - R) / 2, y: H - 4, fill: '#aab4c2', 'font-size': 10, 'text-anchor': 'middle' }, 'Input level (dB)');
    el('text', { x: 12, y: (T + H - B) / 2, fill: '#aab4c2', 'font-size': 10, 'text-anchor': 'middle', transform: 'rotate(-90 12 ' + (T + H - B) / 2 + ')' }, 'Output (dB)');
    curve(function (x) { return x; }, '#6f7f8f', 1.6, '5 4');
    curve(function (x) { return S.compress(x, c) + c.wetDb; }, '#ff766c', 1.8);
    curve(function (x) { return S.parallel(x, c); }, '#59c8d8', 2.8);

    var quiet = S.parallel(-50, c) + 50, loud = S.parallel(-6, c) + 6;
    $('pc-readout').innerHTML = 'Quiet ghost note (−50 dB) lifts <strong>+' + quiet.toFixed(1) + ' dB</strong>; loud hit (−6 dB) lifts only <strong>+' + loud.toFixed(1) + ' dB</strong>. ' +
      'Parallel blend brings up room sustain and low-level detail from underneath while leaving crisp transient punch intact.';
    updatePcAudio();
  }

  [wet, thr, ratio].forEach(function (i) { i.addEventListener('input', render); });
  render();
}());
