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
  var W = 520, H = 185, L = 38, R = 10, T = 10, B = 24;
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

  // Optional Web Audio comb-filter audition (Dry | Both Mics | Polarity Ø)
  var audioSys = null, combNodes = null, audioMode = 'off'; // 'off' | 'dry' | 'both' | 'invert'
  var btnDry = $('tto-hear-dry');
  var btnBoth = $('tto-hear-both');
  var btnInv = $('tto-hear-inv');

  function ensureCombAudio() {
    if (audioSys) return audioSys;
    var synth = window.AudioLabSynth;
    audioSys = synth ? synth.createContext({ gain: 0.36 }) : null;
    if (!audioSys) return null;
    var ctx = audioSys.ctx;
    var buf = synth.createKeysPhraseBuffer(ctx);
    var src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    var dryGain = ctx.createGain(); dryGain.gain.value = 1;
    var delayNode = ctx.createDelay(0.2);
    var bleedGain = ctx.createGain(); bleedGain.gain.value = 0;
    var outGate = ctx.createGain(); outGate.gain.value = 0;

    var noise = ctx.createBufferSource();
    noise.buffer = synth.createNoiseBuffer(ctx, 2, 'pink', 197);
    noise.loop = true;
    var voiceLevel = ctx.createGain();
    var noiseLevel = ctx.createGain();
    noiseLevel.gain.value = 0;
    var mix = ctx.createGain();
    src.connect(voiceLevel).connect(mix);
    noise.connect(noiseLevel).connect(mix);
    noise.start();
    mix.connect(dryGain).connect(outGate);
    mix.connect(delayNode).connect(bleedGain).connect(outGate);
    outGate.connect(audioSys.input);
    src.start();
    combNodes = { voiceLevel: voiceLevel, noiseLevel: noiseLevel, dryGain: dryGain, delayNode: delayNode, bleedGain: bleedGain, outGate: outGate };
    return audioSys;
  }

  function updateCombAudio() {
    if (!combNodes || !audioSys) return;
    var ctx = audioSys.ctx;
    var sm = window.AudioLabSynth.smooth;
    var noiseSelected = $('tto-source') && $('tto-source').value === 'noise';
    sm(combNodes.voiceLevel.gain, noiseSelected ? 0 : 1, ctx, 0.018);
    sm(combNodes.noiseLevel.gain, noiseSelected ? 1 : 0, ctx, 0.018);
    var near = Number(nearIn.value) / 100;
    var far = Math.max(near + 0.01, Number(farIn.value) / 100);
    var tau = Math.abs(far - near) / S.SPEED_OF_SOUND;
    var bleedAmp = near / far;
    sm(combNodes.delayNode.delayTime, Math.min(0.19, tau), ctx, 0.018);
    if (audioMode === 'both') {
      sm(combNodes.bleedGain.gain, bleedAmp, ctx, 0.018);
    } else if (audioMode === 'invert') {
      sm(combNodes.bleedGain.gain, -bleedAmp, ctx, 0.018);
    } else {
      sm(combNodes.bleedGain.gain, 0, ctx, 0.018);
    }
    sm(combNodes.outGate.gain, audioMode !== 'off' && !document.hidden ? 1 : 0, ctx, 0.02);
  }

  function syncAudioButtons() {
    if (btnDry) {
      btnDry.setAttribute('aria-pressed', audioMode === 'dry' ? 'true' : 'false');
      btnDry.classList.toggle('audio-on', audioMode === 'dry');
    }
    if (btnBoth) {
      btnBoth.setAttribute('aria-pressed', audioMode === 'both' ? 'true' : 'false');
      btnBoth.classList.toggle('audio-on', audioMode === 'both');
    }
    if (btnInv) {
      btnInv.setAttribute('aria-pressed', audioMode === 'invert' ? 'true' : 'false');
      btnInv.classList.toggle('audio-on', audioMode === 'invert');
    }
  }

  function toggleAudioMode(mode) {
    audioMode = audioMode === mode ? 'off' : mode;
    if (audioMode !== 'off') {
      ensureCombAudio();
      if (audioSys) audioSys.resume();
    }
    syncAudioButtons();
    updateCombAudio();
  }

  if ($('tto-source')) $('tto-source').addEventListener('change', updateCombAudio);
  if (btnDry) btnDry.addEventListener('click', function () { toggleAudioMode('dry'); });
  if (btnBoth) btnBoth.addEventListener('click', function () { toggleAudioMode('both'); });
  if (btnInv) btnInv.addEventListener('click', function () { toggleAudioMode('invert'); });
  document.addEventListener('visibilitychange', updateCombAudio);

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
      el('text', { x: fx(f), y: H - 8, fill: '#aab4c2', 'font-size': 10, 'text-anchor': 'middle' }, f >= 1000 ? (f / 1000) + 'k' : f);
    });
    [6, 0, -6, -12, -18].forEach(function (d) {
      el('line', { x1: L, x2: W - R, y1: dy(d), y2: dy(d), stroke: d === 0 ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.07)' });
      el('text', { x: L - 5, y: dy(d) + 3, fill: '#aab4c2', 'font-size': 10, 'text-anchor': 'end' }, d);
    });

    // Sample min/max per pixel column at high frequencies so rapid comb teeth render as a clean envelope instead of aliasing
    var tau = Math.abs(far - near) / S.SPEED_OF_SOUND;
    var strokeColor = r.passes ? '#66d28a' : '#ff766c';
    var fillColor = r.passes ? 'rgba(102, 210, 138, 0.24)' : 'rgba(255, 118, 108, 0.24)';
    var linePath = '';
    var envTop = '';
    var envBot = [];
    var startedEnv = false;

    var cols = Math.round(W - L - R);
    for (var px = 0; px <= cols; px++) {
      var x = L + px;
      var f0 = F0 * Math.pow(F1 / F0, px / cols);
      var f1 = F0 * Math.pow(F1 / F0, (px + 1) / cols);
      var cyclesInCol = (f1 - f0) * tau;
      if (cyclesInCol < 0.22) {
        var db = S.combResponse(near, far, f0);
        linePath += (linePath ? 'L' : 'M') + x.toFixed(1) + ' ' + dy(db).toFixed(1);
      } else {
        if (!startedEnv) {
          // Join curve smoothly into the high-frequency envelope band
          var joinDb = S.combResponse(near, far, f0);
          linePath += (linePath ? 'L' : 'M') + x.toFixed(1) + ' ' + dy(joinDb).toFixed(1);
          startedEnv = true;
        }
        var minDb = Infinity, maxDb = -Infinity;
        var sub = 8;
        for (var k = 0; k < sub; k++) {
          var fk = f0 + (f1 - f0) * (k / (sub - 1));
          var val = S.combResponse(near, far, fk);
          if (val < minDb) minDb = val;
          if (val > maxDb) maxDb = val;
        }
        if (cyclesInCol >= 1) {
          maxDb = r.peakDb;
          minDb = r.notchDb;
        }
        envTop += (envTop ? 'L' : 'M') + x.toFixed(1) + ' ' + dy(maxDb).toFixed(1);
        envBot.unshift(x.toFixed(1) + ' ' + dy(minDb).toFixed(1));
      }
    }
    if (linePath) {
      el('path', { d: linePath, fill: 'none', stroke: strokeColor, 'stroke-width': 1.6, 'stroke-linejoin': 'round' });
    }
    if (envTop && envBot.length) {
      el('path', { d: envTop + 'L' + envBot.join('L') + 'Z', fill: fillColor, stroke: strokeColor, 'stroke-width': 1 });
    }

    $('tto-ratio').textContent = r.ratio.toFixed(1) + ' : 1';
    $('tto-bleed').textContent = r.bleedDb.toFixed(1) + ' dB';
    $('tto-swing').textContent = '+' + r.peakDb.toFixed(1) + ' / ' + (r.notchDb === -Infinity ? '−∞' : r.notchDb.toFixed(1)) + ' dB';
    $('tto-notch').textContent = r.firstNotchHz >= 1000 ? (r.firstNotchHz / 1000).toFixed(2) + ' kHz' : r.firstNotchHz + ' Hz';
    var o = $('tto-readout');
    var need = nearCm * 3;
    if (r.passes) {
      o.className = 'te-readout good';
      o.innerHTML = '<strong>Passes 3:1.</strong> Bleed is ' + Math.abs(r.bleedDb).toFixed(1) + ' dB down; notches stay within ' + Math.abs(r.notchDb).toFixed(1) + ' dB (minor ripple).';
    } else {
      o.className = 'te-readout bad';
      o.innerHTML = '<strong>Fails 3:1.</strong> Bleed is only ' + Math.abs(r.bleedDb).toFixed(1) + ' dB down, carving ' + (r.notchDb === -Infinity ? 'deep total' : Math.abs(r.notchDb).toFixed(1) + ' dB') + ' notches starting at ' + $('tto-notch').textContent + '. Move the second mic to at least <strong>' + need + ' cm</strong>.';
    }
    updateCombAudio();
  }

  [nearIn, farIn].forEach(function (i) { i.addEventListener('input', render); });
  render();
}());
