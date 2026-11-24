/**
 * Shared Web Audio synthesis and impulse-response helpers for Audio Engineering labs.
 * Works completely offline, clamps/limits output for classroom ear safety, and
 * generates deterministic, repeatable buffers for acoustic & mixing experiments.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AudioLabSynth = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createContext(opts) {
    opts = opts || {};
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    var ctx = new AC();
    var master = ctx.createGain();
    master.gain.value = typeof opts.gain === 'number' ? opts.gain : 0.65;

    var limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = typeof opts.threshold === 'number' ? opts.threshold : -2;
    limiter.knee.value = 2;
    limiter.ratio.value = 14;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.08;

    master.connect(limiter);
    limiter.connect(ctx.destination);

    function resume() {
      if (ctx.state === 'suspended') return ctx.resume();
      return Promise.resolve();
    }

    return { ctx: ctx, input: master, limiter: limiter, resume: resume };
  }

  function smooth(param, value, ctx, tc) {
    if (!param) return;
    var now = ctx ? ctx.currentTime : 0;
    if (typeof param.setTargetAtTime === 'function' && ctx) {
      param.setTargetAtTime(value, now, tc || 0.015);
    } else {
      param.value = value;
    }
  }

  function createNoiseBuffer(ctx, seconds, type, seed) {
    seconds = seconds || 2.0;
    type = type || 'pink';
    var sr = ctx.sampleRate || 44100;
    var len = Math.max(1, Math.floor(sr * seconds));
    var buf = ctx.createBuffer(1, len, sr);
    var d = buf.getChannelData(0);
    var rand = mulberry32(seed || 1337);
    var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (var i = 0; i < len; i++) {
      var w = rand() * 2 - 1;
      if (type === 'white') {
        d[i] = w * 0.35;
      } else {
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.09;
        b6 = w * 0.115926;
      }
    }
    return buf;
  }

  function createClapBuffer(ctx) {
    var sr = ctx.sampleRate || 44100;
    var len = Math.floor(sr * 0.12);
    var buf = ctx.createBuffer(1, len, sr);
    var d = buf.getChannelData(0);
    var rand = mulberry32(4207);
    var bursts = [0, 0.009, 0.018, 0.029];
    var lp = 0;
    for (var i = 0; i < len; i++) {
      var t = i / sr;
      var env = 0;
      for (var b = 0; b < bursts.length; b++) {
        var dt = t - bursts[b];
        if (dt >= 0) env += Math.exp(-dt / (b === 3 ? 0.022 : 0.004)) * (b === 3 ? 1.0 : 0.55);
      }
      var w = rand() * 2 - 1;
      lp = lp * 0.55 + w * 0.45;
      d[i] = Math.max(-0.95, Math.min(0.95, (w - lp * 0.65) * env * 0.85));
    }
    return buf;
  }

  function createRoomIR(ctx, opts) {
    opts = opts || {};
    var sr = ctx.sampleRate || 44100;
    var rt60 = Math.max(0.12, Math.min(5.5, opts.rt60 || 1.2));
    var dur = Math.min(4.8, Math.max(0.25, rt60 * 1.15));
    var len = Math.floor(sr * dur);
    var buf = ctx.createBuffer(2, len, sr);
    var L = buf.getChannelData(0);
    var R = buf.getChannelData(1);
    var rand = mulberry32(9001);
    var preDelay = Math.max(0.002, (opts.preDelayMs || 6) / 1000);
    var damping = Math.max(0.05, Math.min(0.9, opts.damping == null ? 0.45 : opts.damping));

    // Early reflections calibrated roughly to room boundaries
    var l = opts.l || 14;
    var w = opts.w || 10;
    var h = opts.h || 5;
    var c = 343;
    var taps = [
      { t: Math.min(0.18, preDelay + (w * 0.45) / c), gL: 0.42, gR: 0.16 },
      { t: Math.min(0.22, preDelay + (w * 0.65) / c), gL: 0.14, gR: 0.40 },
      { t: Math.min(0.25, preDelay + (h * 0.85) / c), gL: 0.28, gR: 0.28 },
      { t: Math.min(0.30, preDelay + (l * 0.55) / c), gL: 0.22, gR: 0.20 },
      { t: Math.min(0.35, preDelay + ((l + w) * 0.45) / c), gL: 0.14, gR: 0.18 }
    ];
    for (var k = 0; k < taps.length; k++) {
      var idx = Math.floor(taps[k].t * sr);
      if (idx > 0 && idx < len) {
        L[idx] += taps[k].gL * (1 - damping * 0.35);
        R[idx] += taps[k].gR * (1 - damping * 0.35);
      }
    }

    // Diffuse tail: 60 dB decay at rt60 => exp(-6.9078 * t / rt60)
    var lpL = 0, lpR = 0;
    var lpMix = 0.2 + damping * 0.65;
    var tailGain = Math.min(0.38, 0.14 + Math.min(2.5, rt60) * 0.08);
    for (var i = Math.floor(preDelay * sr); i < len; i++) {
      var t = i / sr;
      var fadeIn = Math.min(1, (t - preDelay) / 0.025);
      var env = Math.exp(-6.907755 * t / rt60) * fadeIn;
      var wL = rand() * 2 - 1;
      var wR = rand() * 2 - 1;
      lpL = lpL * lpMix + wL * (1 - lpMix);
      lpR = lpR * lpMix + wR * (1 - lpMix);
      L[i] += lpL * env * tailGain;
      R[i] += lpR * env * tailGain;
    }
    return buf;
  }

  function createDrumLoopBuffer(ctx, opts) {
    opts = opts || {};
    var sr = opts.sr || ctx.sampleRate || 44100;
    var dur = opts.seconds || 2.0;
    var len = Math.floor(sr * dur);
    var buf = ctx.createBuffer(1, len, sr);
    var d = buf.getChannelData(0);
    var rand = mulberry32(2026);
    var hot = opts.hotPeak ? 1.24 : 0.92;
    for (var i = 0; i < len; i++) {
      var t = i / sr;
      var beat = (t * 2) % 1;
      var bar = t % 1;
      var kick = Math.sin(2 * Math.PI * (52 + 120 * Math.exp(-beat * 28)) * beat) * Math.exp(-beat * 12) * 0.72;
      var snareT = (bar + 0.5) % 1;
      var snareNoise = (rand() * 2 - 1) * Math.exp(-snareT * 18) * 0.52;
      var snareTone = Math.sin(2 * Math.PI * 192 * snareT) * Math.exp(-snareT * 24) * 0.34;
      var hatT = (t * 4) % 1;
      var hat = (rand() * 2 - 1) * Math.exp(-hatT * 46) * 0.22;
      var sum = (kick + snareNoise + snareTone + hat) * hot;
      d[i] = opts.hotPeak ? sum : Math.max(-0.98, Math.min(0.98, sum));
    }
    return buf;
  }

  function createVocalPhraseBuffer(ctx, opts) {
    opts = opts || {};
    var sr = opts.sr || ctx.sampleRate || 44100;
    var dur = opts.seconds || 2.4;
    var len = Math.floor(sr * dur);
    var buf = ctx.createBuffer(1, len, sr);
    var d = buf.getChannelData(0);
    var scale = opts.hotPeak ? 1.18 : 0.78;
    var phase = 0;
    for (var i = 0; i < len; i++) {
      var t = i / sr;
      var syllable = Math.max(0, Math.sin(Math.PI * ((t * 1.25) % 1)));
      var env = Math.pow(syllable, 0.55) * (0.25 + 0.75 * Math.sin(Math.PI * t / dur));
      var f0 = 196 * (1 + 0.12 * Math.sin(2 * Math.PI * 0.65 * t) + 0.012 * Math.sin(2 * Math.PI * 5.2 * t));
      phase += (2 * Math.PI * f0) / sr;
      // Warm harmonic vocal stack shaped across 3 formants (~450, 1150, 2600 Hz)
      var s = 0;
      for (var h = 1; h <= 14; h++) {
        var freq = f0 * h;
        var w1 = Math.exp(-Math.pow((freq - 440) / 260, 2));
        var w2 = 0.62 * Math.exp(-Math.pow((freq - 1180) / 420, 2));
        var w3 = 0.28 * Math.exp(-Math.pow((freq - 2550) / 650, 2));
        s += Math.sin(phase * h) * (0.28 / Math.sqrt(h) + w1 + w2 + w3);
      }
      d[i] = Math.max(-1.25, Math.min(1.25, s * env * 0.26 * scale));
    }
    return buf;
  }

  function createBandStems(ctx, opts) {
    opts = opts || {};
    var sr = opts.sr || ctx.sampleRate || 44100;
    var dur = opts.seconds || 2.4;
    var len = Math.floor(sr * dur);
    var kickBuf = ctx.createBuffer(1, len, sr);
    var vocalBuf = createVocalPhraseBuffer(ctx, { sr: sr, seconds: dur });
    var guitarBuf = ctx.createBuffer(1, len, sr);
    var keysBuf = ctx.createBuffer(1, len, sr);
    var kd = kickBuf.getChannelData(0);
    var gd = guitarBuf.getChannelData(0);
    var ky = keysBuf.getChannelData(0);
    var chords = [261.63, 329.63, 392.00, 493.88];
    var bass = [130.81, 164.81, 196.00, 146.83];

    for (var i = 0; i < len; i++) {
      var t = i / sr;
      var beat = (t * 2) % 1;
      var step = Math.floor((t / dur) * 4) % 4;
      kd[i] = Math.sin(2 * Math.PI * (50 + 110 * Math.exp(-beat * 26)) * beat) * Math.exp(-beat * 11) * 0.72;

      var strum = Math.exp(-((t * 2 + 0.5) % 1) * 6.5);
      var gf = bass[step] * 2;
      gd[i] = (
        0.5 * Math.sin(2 * Math.PI * gf * t) +
        0.3 * Math.sin(2 * Math.PI * gf * 1.498 * t) +
        0.18 * Math.sin(2 * Math.PI * gf * 2 * t)
      ) * strum * 0.45;

      var keyEnv = 0.75 + 0.25 * Math.sin(2 * Math.PI * (t / dur) * 2);
      var ks = 0;
      for (var c = 0; c < 3; c++) {
        ks += Math.sin(2 * Math.PI * chords[(step + c) % 4] * t) * 0.24;
      }
      ky[i] = ks * keyEnv * 0.65;
    }
    return { kick: kickBuf, vocal: vocalBuf, guitar: guitarBuf, keys: keysBuf };
  }

  function createHardClipCurve(samples) {
    samples = samples || 1024;
    var curve = new Float32Array(samples);
    for (var i = 0; i < samples; i++) {
      var x = (i * 2) / (samples - 1) - 1;
      curve[i] = Math.max(-0.98, Math.min(0.98, Math.tanh(x * 2.4)));
    }
    return curve;
  }

  return {
    createContext: createContext,
    smooth: smooth,
    createNoiseBuffer: createNoiseBuffer,
    createClapBuffer: createClapBuffer,
    createRoomIR: createRoomIR,
    createDrumLoopBuffer: createDrumLoopBuffer,
    createVocalPhraseBuffer: createVocalPhraseBuffer,
    createBandStems: createBandStems,
    createHardClipCurve: createHardClipCurve
  };
});
