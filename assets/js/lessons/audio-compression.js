/* Audio Compression Workbench — Transfer Curve, Timeline, Audio Engine & Challenges */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var cv = $('curve'), tl = $('timeline');
  if (!cv || !tl) return;

  var fitCv = window.SimKit ? SimKit.canvas2d(cv, { box: cv.parentElement }) : null;
  var fitTl = window.SimKit ? SimKit.canvas2d(tl, { box: tl.parentElement }) : null;
  var cx = fitCv ? fitCv.ctx : cv.getContext('2d');
  var tx = fitTl ? fitTl.ctx : tl.getContext('2d');

  var SR = 44100, DUR = 4, BLOCK = 0.005, NB = Math.round(DUR / BLOCK);
  var TAU = Math.PI * 2;

  function rng(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return (seed / 4294967296) * 2 - 1;
    };
  }
  function db2a(d) { return Math.pow(10, d / 20); }
  function a2db(a) { return 20 * Math.log10(Math.max(a, 1e-6)); }

  function makeVocal() {
    var d = new Float32Array(SR * DUR);
    var phrases = [[0.05, 0.9, 220, -24], [1.0, 1.9, 262, -4], [2.0, 2.9, 196, -19], [3.0, 3.9, 247, -2]];
    phrases.forEach(function (phInfo) {
      var t0 = phInfo[0], t1 = phInfo[1], f = phInfo[2], lv = phInfo[3];
      var a = db2a(lv), s0 = Math.floor(t0 * SR), s1 = Math.floor(t1 * SR), ph = 0;
      for (var i = s0; i < s1; i++) {
        var t = (i - s0) / SR, len = t1 - t0;
        var env = Math.min(1, t / 0.05) * Math.min(1, (len - t) / 0.1) * (0.8 + 0.2 * Math.sin(TAU * 1.7 * t));
        ph += TAU * f * (1 + 0.008 * Math.sin(TAU * 5.5 * t)) / SR;
        var v = 0;
        for (var h = 1; h <= 10; h++) v += (Math.sin(ph * h) / h) * (h === 2 || h === 3 ? 1.6 : 1);
        d[i] += v * 0.42 * a * env;
      }
    });
    return { data: d, regions: phrases.map(function (p) { return [p[0] + 0.1, p[1] - 0.15]; }) };
  }

  function makeDrums() {
    var d = new Float32Array(SR * DUR), r = rng(7);
    var hits = [];
    for (var b = 0; b < 16; b++) {
      var t = b * 0.25;
      hits.push(['h', t, -19]);
      if (b % 4 === 0) hits.push(['k', t, b % 8 === 0 ? -1.5 : -5.5]);
      if (b % 4 === 2) hits.push(['s', t, b === 6 || b === 14 ? -2 : -8]);
    }
    hits.forEach(function (h) {
      var k = h[0], t0 = h[1], lv = h[2];
      var a = db2a(lv), s0 = Math.floor(t0 * SR), ph = 0, prev = 0;
      for (var i = 0; i < SR * 0.35 && s0 + i < d.length; i++) {
        var t = i / SR, v = 0;
        if (k === 'k') { ph += TAU * (45 + 85 * Math.exp(-t * 30)) / SR; v = Math.sin(ph) * Math.exp(-t * 9); }
        else if (k === 's') { v = (r() * 0.8 + Math.sin(TAU * 185 * t) * 0.5) * Math.exp(-t * 18); }
        else { var n = r(); v = (n - prev) * 0.65 * Math.exp(-t * 58); prev = n; }
        d[s0 + i] += v * a;
      }
    });
    return { data: d, regions: [] };
  }

  function makeBass() {
    var d = new Float32Array(SR * DUR);
    var notes = [[0, 55, -1.5], [0.5, 55, -15], [1, 73.4, -7], [1.5, 65.4, -19], [2, 55, -0.8], [2.5, 82.4, -13], [3, 73.4, -5], [3.5, 61.7, -17]];
    notes.forEach(function (nt) {
      var t0 = nt[0], f = nt[1], lv = nt[2];
      var a = db2a(lv), s0 = Math.floor(t0 * SR);
      for (var i = 0; i < SR * 0.48 && s0 + i < d.length; i++) {
        var t = i / SR, env = Math.min(1, t / 0.004) * Math.exp(-t * 3.5), v = 0;
        for (var h = 1; h <= 6; h++) v += (Math.sin(TAU * f * h * t) / (h * h)) * 1.35;
        d[s0 + i] += v * 0.58 * a * env;
      }
    });
    return { data: d, regions: [] };
  }

  var sources = { vocal: makeVocal(), drums: makeDrums(), bass: makeBass() };
  Object.keys(sources).forEach(function (key) {
    var s = sources[key], per = Math.round(BLOCK * SR);
    s.level = new Float32Array(NB);
    for (var b = 0; b < NB; b++) {
      var pk = 0;
      for (var i = b * per; i < (b + 1) * per; i++) pk = Math.max(pk, Math.abs(s.data[i]));
      s.level[b] = Math.max(-72, a2db(pk));
    }
  });

  function params() {
    return {
      T: +$('threshold').value, R: +$('ratio').value, W: +$('knee').value,
      A: +$('attack').value / 1000, Rl: +$('release').value / 1000, M: +$('makeup').value
    };
  }

  function curve(x, p) {
    var o = x - p.T;
    if (2 * o < -p.W) return x;
    if (p.W > 0 && 2 * Math.abs(o) <= p.W) return x + (1 / p.R - 1) * Math.pow(o + p.W / 2, 2) / (2 * p.W);
    return p.T + o / p.R;
  }

  function simulate(src, p) {
    var out = new Float32Array(NB), gr = new Float32Array(NB), g = 0;
    var ca = p.A > 0 ? Math.exp(-BLOCK / p.A) : 0, cr = Math.exp(-BLOCK / p.Rl);
    for (var pass = 0; pass < 2; pass++) {
      for (var b = 0; b < NB; b++) {
        var x = src.level[b], target = curve(x, p) - x, c = target < g ? ca : cr;
        g = c * g + (1 - c) * target;
        if (pass) { gr[b] = g; out[b] = x + g + p.M; }
      }
    }
    return { out: out, gr: gr };
  }

  function stats(src, sim) {
    function loudBlocks(a) {
      var regs = src.regions.length ? src.regions : [[0, DUR]];
      return regs.map(function (rg) {
        var v = [];
        for (var b = Math.floor(rg[0] / BLOCK); b < Math.floor(rg[1] / BLOCK); b++) {
          if (src.level[b] > -50) v.push(a[b]);
        }
        v.sort(function (m, n) { return m - n; });
        return v.length ? v[Math.floor(v.length * 0.9)] : -72;
      });
    }
    var inR, outR;
    if (src.regions.length) {
      var ii = loudBlocks(src.level), oo = loudBlocks(sim.out);
      inR = Math.max.apply(null, ii) - Math.min.apply(null, ii);
      outR = Math.max.apply(null, oo) - Math.min.apply(null, oo);
    } else {
      var win = src === sources.bass ? 0.5 : 0.25;
      var peaks = function (a) {
        var r = [];
        for (var t = 0; t < DUR; t += win) {
          var m = -99;
          for (var b = Math.floor(t / BLOCK); b < Math.floor((t + win) / BLOCK); b++) m = Math.max(m, a[b]);
          r.push(m);
        }
        return r;
      };
      var ip = peaks(src.level), op = peaks(sim.out);
      inR = Math.max.apply(null, ip) - Math.min.apply(null, ip);
      outR = Math.max.apply(null, op) - Math.min.apply(null, op);
    }
    var pk = -99, pg = 0;
    for (var b = 0; b < NB; b++) { pk = Math.max(pk, sim.out[b]); pg = Math.min(pg, sim.gr[b]); }
    return { inR: inR, outR: outR, outPeak: pk, peakGR: -pg };
  }

  var playPos = null, liveGR = 0;

  function drawCurve(p, src) {
    var W = fitCv ? fitCv.width : cv.width, H = fitCv ? fitCv.height : cv.height;
    if (!W || !H) return;
    var mL = 36, mB = 28, mT = 12, mR = 12;
    var S = Math.max(40, Math.min(W - mL - mR, H - mT - mB));
    var lo = -60;
    var X = function (d) { return mL + ((d - lo) / (-lo)) * S; };
    var Y = function (d) { return mT + S - ((d - lo) / (-lo)) * S; };

    cx.fillStyle = '#0a1018'; cx.fillRect(0, 0, W, H);
    cx.strokeStyle = 'rgba(255,255,255,0.08)'; cx.lineWidth = 1;
    cx.font = '10px ui-monospace, monospace'; cx.fillStyle = '#8492a0';
    for (var d = lo; d <= 0; d += 12) {
      cx.beginPath(); cx.moveTo(X(d), Y(lo)); cx.lineTo(X(d), Y(0));
      cx.moveTo(X(lo), Y(d)); cx.lineTo(X(0), Y(d)); cx.stroke();
      cx.textAlign = 'center'; cx.fillText(d, X(d), mT + S + 13);
      cx.textAlign = 'right'; cx.fillText(d, mL - 5, Y(d) + 3);
    }
    cx.textAlign = 'center'; cx.fillStyle = '#b9c4ce'; cx.font = '700 10px system-ui, sans-serif';
    cx.fillText('INPUT dB', mL + S / 2, H - 3);
    cx.save(); cx.translate(10, mT + S / 2); cx.rotate(-Math.PI / 2); cx.fillText('OUTPUT dB', 0, 0); cx.restore();

    cx.setLineDash([4, 4]); cx.strokeStyle = 'rgba(255,255,255,0.24)';
    cx.beginPath(); cx.moveTo(X(lo), Y(lo)); cx.lineTo(X(0), Y(0)); cx.stroke();
    cx.strokeStyle = 'rgba(240,180,72,0.75)';
    cx.beginPath(); cx.moveTo(X(p.T), Y(lo)); cx.lineTo(X(p.T), Y(0)); cx.stroke();
    cx.setLineDash([]);

    if (p.W > 0) {
      cx.fillStyle = 'rgba(240,180,72,0.09)';
      cx.fillRect(X(p.T - p.W / 2), Y(0), X(p.T + p.W / 2) - X(p.T - p.W / 2), S);
    }
    cx.strokeStyle = '#59c8d8'; cx.lineWidth = 2.4; cx.beginPath();
    for (var dd = lo; dd <= 0; dd += 0.5) {
      var yy = Math.min(0, curve(dd, p) + p.M);
      if (dd === lo) cx.moveTo(X(dd), Y(Math.max(lo, yy)));
      else cx.lineTo(X(dd), Y(Math.max(lo, yy)));
    }
    cx.stroke();

    // Prevent label clipping off right edge when Threshold > -22 dB
    cx.fillStyle = '#f0b448'; cx.font = '800 11px system-ui, sans-serif';
    if (p.T > -22) {
      cx.textAlign = 'right';
      cx.fillText('T ' + p.T + ' dB · ' + p.R + ':1', X(p.T) - 5, Y(lo) - 7);
    } else {
      cx.textAlign = 'left';
      cx.fillText('T ' + p.T + ' dB · ' + p.R + ':1', X(p.T) + 5, Y(lo) - 7);
    }

    if (playPos !== null) {
      var b = Math.min(NB - 1, Math.floor(playPos / BLOCK)), x = src.level[b];
      if (x > -60) {
        var y = curve(x, p) + p.M;
        cx.beginPath(); cx.arc(X(x), Y(Math.max(lo, Math.min(0, y))), 5.5, 0, TAU);
        cx.fillStyle = '#fff'; cx.fill(); cx.strokeStyle = '#59c8d8'; cx.lineWidth = 2.5; cx.stroke();
      }
    }
  }

  function drawTimeline(p, src, sim) {
    var W = fitTl ? fitTl.width : tl.width, H = fitTl ? fitTl.height : tl.height;
    if (!W || !H) return;
    var m = 34, top = 12, bot = H - 24, lo = -60;
    var X = function (b) { return m + (b / NB) * (W - m - 10); };
    var Y = function (d) { return top + (Math.max(lo, Math.min(0, d)) / lo) * (bot - top); };

    tx.fillStyle = '#0a1018'; tx.fillRect(0, 0, W, H);
    tx.font = '10px ui-monospace, monospace'; tx.strokeStyle = 'rgba(255,255,255,0.08)';
    tx.fillStyle = '#8492a0'; tx.lineWidth = 1;
    for (var d = 0; d >= lo; d -= 12) {
      tx.beginPath(); tx.moveTo(m, Y(d)); tx.lineTo(W - 10, Y(d)); tx.stroke();
      tx.textAlign = 'right'; tx.fillText(d, m - 5, Y(d) + 3);
    }
    for (var s = 0; s <= DUR; s++) {
      tx.textAlign = 'center'; tx.fillText(s + 's', X(s / BLOCK), H - 7);
    }

    tx.setLineDash([4, 4]); tx.strokeStyle = 'rgba(240,180,72,0.75)';
    tx.beginPath(); tx.moveTo(m, Y(p.T)); tx.lineTo(W - 10, Y(p.T)); tx.stroke(); tx.setLineDash([]);

    tx.fillStyle = 'rgba(111,127,143,0.36)'; tx.beginPath(); tx.moveTo(X(0), Y(lo));
    for (var b = 0; b < NB; b++) tx.lineTo(X(b), Y(src.level[b]));
    tx.lineTo(X(NB), Y(lo)); tx.fill();

    tx.strokeStyle = '#59c8d8'; tx.lineWidth = 1.6; tx.beginPath();
    for (var b2 = 0; b2 < NB; b2++) {
      var y = src.level[b2] > -70 ? sim.out[b2] : lo;
      if (b2 === 0) tx.moveTo(X(b2), Y(y)); else tx.lineTo(X(b2), Y(y));
    }
    tx.stroke();

    tx.fillStyle = 'rgba(255,118,108,0.55)';
    var bw = Math.max(1, X(1) - X(0));
    for (var b3 = 0; b3 < NB; b3++) {
      var g = -sim.gr[b3];
      if (g > 0.05) tx.fillRect(X(b3), top, bw, (g / (-lo)) * (bot - top));
    }
    tx.fillStyle = '#ff766c'; tx.font = '800 10px system-ui, sans-serif'; tx.textAlign = 'left';
    tx.fillText('▼ GAIN REDUCTION', m + 6, top + 11);

    if (playPos !== null) {
      var px = X(playPos / BLOCK);
      tx.strokeStyle = '#fff'; tx.lineWidth = 1.8;
      tx.beginPath(); tx.moveTo(px, top); tx.lineTo(px, bot); tx.stroke();
    }
  }

  // Web Audio Compressor + Hard-Clipper + SimKit.loop (zero IntersectionObserver leak!)
  var ac = null, node = null, comp = null, wet = null, dry = null, makeup = null, clipNode = null, startT = 0, bypass = false;

  function makeHardClip() {
    var n = 1024, c = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var x = (i / (n - 1)) * 2 - 1;
      c[i] = Math.max(-0.98, Math.min(0.98, x));
    }
    return c;
  }

  function audioSync(p) {
    if (!comp || !ac) return;
    var t = ac.currentTime;
    comp.threshold.setTargetAtTime(p.T, t, 0.02);
    comp.ratio.setTargetAtTime(p.R, t, 0.02);
    comp.knee.setTargetAtTime(p.W, t, 0.02);
    comp.attack.setTargetAtTime(Math.max(0.0001, p.A), t, 0.02);
    comp.release.setTargetAtTime(p.Rl, t, 0.02);
    var auto = -0.6 * (curve(0, p) - 0);
    makeup.gain.setTargetAtTime(db2a(p.M - auto), t, 0.02);
    wet.gain.setTargetAtTime(bypass ? 0 : 1, t, 0.025);
    dry.gain.setTargetAtTime(bypass ? 1 : 0, t, 0.025);
  }

  var simLoop = null;
  function tick() {
    if (!ac) return;
    playPos = Math.max(0, (ac.currentTime - startT) % DUR);
    liveGR = bypass ? 0 : (typeof comp.reduction === 'number' ? comp.reduction : comp.reduction.value || 0);
    $('gr-fill').style.width = Math.min(100, (-liveGR / 24) * 100) + '%';
    $('gr-live').textContent = liveGR.toFixed(1) + ' dB';
    render();
  }

  function start() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { $('readout').textContent = 'Web Audio unavailable in this browser.'; return; }
    ac = new AC();
    var src = sources[$('source').value];
    var buf = ac.createBuffer(1, src.data.length, SR);
    if (buf.copyToChannel) buf.copyToChannel(src.data, 0);
    else buf.getChannelData(0).set(src.data);

    node = ac.createBufferSource(); node.buffer = buf; node.loop = true;
    comp = AudioEffects.compressorNode(ac);
    makeup = ac.createGain();
    wet = ac.createGain();
    dry = ac.createGain();
    clipNode = ac.createWaveShaper();
    clipNode.curve = makeHardClip();
    var master = ac.createGain(); master.gain.value = 0.52;

    node.connect(comp).connect(makeup).connect(wet).connect(clipNode);
    node.connect(dry).connect(clipNode);
    clipNode.connect(master).connect(ac.destination);

    audioSync(params());
    startT = ac.currentTime + 0.04;
    node.start(startT);
    $('play').textContent = '■ Stop';
    $('play').classList.add('audio-on');
    if (simLoop) simLoop.resume();
    else if (window.SimKit && SimKit.loop) simLoop = SimKit.loop(tick, { el: tl, maxDt: 0.05 });
  }

  function stop() {
    if (simLoop) simLoop.pause();
    if (ac) { ac.close(); ac = null; comp = null; }
    playPos = null; liveGR = 0;
    $('play').textContent = '▶ Play';
    $('play').classList.remove('audio-on');
    $('gr-fill').style.width = '0';
    $('gr-live').textContent = '0.0 dB';
    update();
  }

  var last = null;
  function render() {
    var p = params(), src = sources[$('source').value];
    if (!last) last = simulate(src, p);
    drawCurve(p, src);
    drawTimeline(p, src, last);
  }

  function update() {
    var p = params(), src = sources[$('source').value];
    $('threshold-out').value = p.T + ' dB';
    $('ratio-out').value = p.R >= 20 ? '20:1 (limit)' : p.R + ':1';
    $('knee-out').value = p.W ? p.W + ' dB' : 'hard';
    $('attack-out').value = (p.A * 1000).toFixed(0) + ' ms';
    $('release-out').value = (p.Rl * 1000).toFixed(0) + ' ms';
    $('makeup-out').value = '+' + p.M + ' dB';

    last = simulate(src, p);
    var s = stats(src, last);
    $('in-range').textContent = s.inR.toFixed(1) + ' dB';
    $('out-range').textContent = s.outR.toFixed(1) + ' dB';
    $('peak-gr').textContent = s.peakGR.toFixed(1) + ' dB';
    $('out-peak').textContent = s.outPeak.toFixed(1) + ' dBFS';

    var o = $('readout');
    if (s.outPeak > 0) {
      o.className = 'te-readout bad';
      o.innerHTML = '<strong>Clipping!</strong> Output exceeds 0 dBFS. Lower Makeup Gain or raise Threshold.';
    } else if (p.R <= 1 || s.peakGR < 0.5) {
      o.className = 'te-readout';
      o.innerHTML = '<strong>Barely touching it.</strong> Lower Threshold until red Gain Reduction bars appear.';
    } else if (s.peakGR > 15) {
      o.className = 'te-readout warn';
      o.innerHTML = '<strong>Heavy squash (' + s.peakGR.toFixed(0) + ' dB GR).</strong> Range squeezed to ' + s.outR.toFixed(1) + ' dB — listen for pumping.';
    } else {
      o.className = 'te-readout good';
      o.innerHTML = '<strong>Controlled.</strong> Dynamic range tightened from ' + s.inR.toFixed(1) + ' to ' + s.outR.toFixed(1) + ' dB (' + s.peakGR.toFixed(1) + ' dB GR).';
    }
    audioSync(p);
    render();
    return s;
  }

  ['threshold', 'ratio', 'knee', 'attack', 'release', 'makeup'].forEach(function (id) {
    $(id).addEventListener('input', update);
  });
  $('source').addEventListener('change', function () {
    var was = !!ac;
    if (was) stop();
    update();
    if (was) start();
  });
  $('play').addEventListener('click', function () { ac ? stop() : start(); });
  $('bypass').addEventListener('click', function (e) {
    bypass = !bypass;
    e.currentTarget.setAttribute('aria-pressed', String(bypass));
    e.currentTarget.textContent = bypass ? 'Bypass ON (original)' : 'Bypass (hear original)';
    audioSync(params());
  });

  // Topology presets & Auto Level-Match
  var presets = {
    gentle: { threshold: -20, ratio: 4, knee: 6, attack: 10, release: 200, makeup: 0 },
    vca:    { threshold: -18, ratio: 4, knee: 4, attack: 15, release: 120, makeup: 3 },
    fet:    { threshold: -22, ratio: 8, knee: 0, attack: 1,  release: 70,  makeup: 5 },
    opto:   { threshold: -24, ratio: 3, knee: 14, attack: 25, release: 420, makeup: 4 }
  };
  document.querySelectorAll('[data-cmp-preset]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var p = presets[btn.dataset.cmpPreset];
      if (!p) return;
      Object.keys(p).forEach(function (k) { $(k).value = p[k]; });
      update();
    });
  });

  var levelMatchBtn = $('cmp-level-match');
  if (levelMatchBtn) {
    levelMatchBtn.addEventListener('click', function () {
      var src = sources[$('source').value], p = params();
      var noMakeup = { T: p.T, R: p.R, W: p.W, A: p.A, Rl: p.Rl, M: 0 };
      var sim = simulate(src, noMakeup);
      var inSum = 0, outSum = 0, count = 0;
      for (var b = 0; b < NB; b++) {
        if (src.level[b] > -42) {
          inSum += src.level[b];
          outSum += sim.out[b];
          count++;
        }
      }
      var matchDb = count ? Math.max(0, Math.min(24, Math.round((inSum - outSum) / count * 2) / 2)) : 0;
      $('makeup').value = matchDb;
      update();
    });
  }

  document.querySelectorAll('[data-load]').forEach(function (b) {
    b.addEventListener('click', function () {
      $('source').value = b.dataset.load;
      var was = !!ac;
      if (was) stop();
      Object.keys(presets.gentle).forEach(function (k) { $(k).value = k === 'ratio' ? 1 : presets.gentle[k]; });
      update();
      if (was) start();
    });
  });

  var checks = {
    vocal: function () {
      if ($('source').value !== 'vocal') return [false, 'Load the singer first.'];
      var s = update(), e = [];
      if (s.outR > 10) e.push('output range is ' + s.outR.toFixed(1) + ' dB (need ≤ 10)');
      if (s.peakGR > 15) e.push('peak reduction is ' + s.peakGR.toFixed(1) + ' dB (need ≤ 15)');
      if (s.outPeak < -6 || s.outPeak > 0) e.push('loudest output is ' + s.outPeak.toFixed(1) + ' dBFS (need −6 to 0)');
      return e.length ? [false, 'Not yet: ' + e.join('; ') + '.'] : [true, 'Nice vocal ride! Phrases sit evenly with clean headroom.'];
    },
    drums: function () {
      if ($('source').value !== 'drums') return [false, 'Load the drums first.'];
      var s = update(), p = params(), e = [];
      if (s.peakGR < 3 || s.peakGR > 10) e.push('peak reduction is ' + s.peakGR.toFixed(1) + ' dB (need 3–10)');
      if (p.A < 0.02) e.push('attack is ' + (p.A * 1000).toFixed(0) + ' ms (need ≥ 20 ms for punch)');
      if (s.outPeak > 0) e.push('output clips above 0 dBFS');
      return e.length ? [false, 'Not yet: ' + e.join('; ') + '.'] : [true, 'Punchy & controlled — transients slip through before GR clamps down!'];
    },
    limiter: function () {
      var s = update(), p = params(), e = [];
      if (p.R < 20) e.push('ratio must be 20:1');
      if (p.W > 3) e.push('knee must be ≤ 3 dB');
      if (p.A > 0.001) e.push('attack must be ≤ 1 ms');
      if (p.T < -12) e.push('threshold is below −12 dB');
      if (s.peakGR < 1.0) e.push('gain reduction is ' + s.peakGR.toFixed(1) + ' dB — lower Threshold below the source peaks so limiting actually engages (≥ 1 dB GR)');
      if (s.outPeak > -1) e.push('output peak is ' + s.outPeak.toFixed(1) + ' dBFS (need ≤ −1)');
      return e.length ? [false, 'Not yet: ' + e.join('; ') + '.'] : [true, 'Brickwall engaged (' + s.peakGR.toFixed(1) + ' dB GR): peaks caught cleanly below −1 dBFS.'];
    }
  };

  document.querySelectorAll('[data-check]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.dataset.check, res = checks[k]();
      var o = $('check-' + k), wbStatus = $('wb-challenge-status');
      if (o) { o.className = 'te-readout ' + (res[0] ? 'good' : 'bad'); o.textContent = res[1]; }
      if (wbStatus) { wbStatus.className = 'te-readout ' + (res[0] ? 'good' : 'bad'); wbStatus.textContent = res[1]; }
    });
  });

  // Math practice with Enter key & NaN guard
  var q;
  function newQ() {
    var R = [2, 3, 4, 5, 8, 10][Math.floor(Math.random() * 6)];
    var T = -6 * (2 + Math.floor(Math.random() * 4));
    var over = R * (1 + Math.floor(Math.random() * 4));
    q = { R: R, T: T, x: T + over, y: T + over / R };
    $('quiz-q').innerHTML = 'A snare hits at <strong>' + q.x + ' dB</strong>. The threshold is <strong>' + q.T + ' dB</strong> and the ratio is <strong>' + q.R + ':1</strong>. What level comes out?';
    $('quiz-a').value = '';
    $('quiz-out').className = 'te-readout';
    $('quiz-out').textContent = 'Work it out, then check.';
  }
  function checkMath() {
    var raw = $('quiz-a').value.trim();
    var a = parseFloat(raw), o = $('quiz-out');
    if (!raw || isNaN(a)) {
      o.className = 'te-readout warn';
      o.textContent = 'Enter a number in dB first.';
      return;
    }
    if (Math.abs(a - q.y) < 0.26) {
      o.className = 'te-readout good';
      o.innerHTML = '<strong>Correct: ' + q.y + ' dB.</strong> Overshoot was ' + (q.x - q.T) + ' dB; ' + (q.x - q.T) + ' ÷ ' + q.R + ' = ' + ((q.x - q.T) / q.R) + ' dB over. Gain reduction = <strong>' + (q.x - q.y) + ' dB</strong>.';
    } else {
      o.className = 'te-readout bad';
      o.innerHTML = 'Not quite. Compute overshoot first: ' + q.x + ' − (' + q.T + ') = ' + (q.x - q.T) + ' dB, divide by ' + q.R + ', and add back to ' + q.T + ' dB.';
    }
  }
  $('quiz-new').addEventListener('click', newQ);
  $('quiz-check').addEventListener('click', checkMath);
  $('quiz-a').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); checkMath(); } });

  document.addEventListener('creation-app-resize', function () {
    if (fitCv) fitCv.resize();
    if (fitTl) fitTl.resize();
    render();
  });

  newQ();
  update();
})();
