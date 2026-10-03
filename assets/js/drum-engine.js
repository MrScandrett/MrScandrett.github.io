/* drum-engine.js — shared drum synthesis and generated PCM sample library.
 *
 * Used by lessons/technical-elements/drums.html and music-lab.html.
 *
 *   var kit = DrumEngine.create(audioCtx, destinationNode);
 *   kit.hit('snare', audioCtx.currentTime + 0.1, 0.8);
 *   kit.hit('tomLo', t, 1, { pitch: 90 });      // optional tuning in Hz (toms)
 *
 * Voices: kick, snare, rim, hat, ohat, ride, crash, tomHi, tomMid, tomLo,
 * clap, perc.  Legacy Music Lab names (tom1, tom2) are aliased.
 * A closed-hat hit chokes any open hat still ringing, like a real hi-hat pedal.
 */
(function (root) {
  'use strict';

  var noiseBuffers = typeof WeakMap === 'function' ? new WeakMap() : null;

  function noiseBuffer(ctx) {
    var cached = noiseBuffers && noiseBuffers.get(ctx);
    if (cached) return cached;
    var buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2), ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (noiseBuffers) noiseBuffers.set(ctx, buf);
    return buf;
  }

  var ALIASES = { tom1: 'tomHi', tom2: 'tomLo', tom3: 'tomMid', hihat: 'hat', openhat: 'ohat' };
  var METAL = [205.3, 304.4, 369.6, 522.7, 540, 800];       // inharmonic square partials (808-style metal)
  var TOM_DEFAULT = { tomHi: 210, tomMid: 155, tomLo: 105 };

  function createSynth(ctx, out) {
    var nb = noiseBuffer(ctx);
    var openHatGain = null;

    function amp(t, peak, decay, attack) {
      var g = ctx.createGain();
      var a = attack || 0.002;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(Math.max(peak, 0.0002), t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + decay);
      g.connect(out);
      return g;
    }

    function osc(type, f0, f1, t, sweep, peak, decay) {
      var o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + sweep);
      var g = amp(t, peak, decay);
      o.connect(g);
      o.start(t); o.stop(t + decay + 0.05);
      return g;
    }

    function noise(t, filterType, freq, q, peak, decay, offset) {
      var n = ctx.createBufferSource();
      n.buffer = nb;
      var f = ctx.createBiquadFilter();
      f.type = filterType; f.frequency.value = freq; f.Q.value = q || 0.7;
      var g = amp(t, peak, decay, 0.001);
      n.connect(f); f.connect(g);
      n.start(t, offset === undefined ? Math.random() : offset); n.stop(t + decay + 0.05);
      return g;
    }

    function metal(t, peak, decay, hp, bp, mult) {
      var mix = ctx.createGain();
      var hpf = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = hp;
      var bpf = ctx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = bp; bpf.Q.value = 0.6;
      mix.connect(bpf); bpf.connect(hpf);
      var g = amp(t, peak, decay, 0.001);
      hpf.connect(g);
      for (var i = 0; i < METAL.length; i++) {
        var o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = METAL[i] * (mult || 1);
        var og = ctx.createGain(); og.gain.value = 0.16;
        o.connect(og); og.connect(mix);
        o.start(t); o.stop(t + decay + 0.06);
      }
      return g;
    }

    var voices = {
      kick: function (t, v) {
        osc('sine', 170, 46, t, 0.085, 1.0 * v, 0.34);         // body: fast pitch drop
        osc('triangle', 95, 52, t, 0.12, 0.35 * v, 0.2);       // low thump
        noise(t, 'highpass', 2600, 0.7, 0.28 * v, 0.014);      // beater click
      },
      snare: function (t, v) {
        osc('triangle', 205, 165, t, 0.06, 0.45 * v, 0.11);    // shell tone
        osc('triangle', 335, 290, t, 0.06, 0.22 * v, 0.08);    // second head mode
        noise(t, 'highpass', 1400, 0.6, 0.62 * v, 0.2);        // snare wires
        noise(t, 'bandpass', 4600, 0.9, 0.3 * v, 0.14);        // wire brightness
        noise(t, 'highpass', 3000, 0.7, 0.35 * v, 0.012);      // stick attack
      },
      rim: function (t, v) {
        osc('square', 1750, 1650, t, 0.02, 0.22 * v, 0.03);
        osc('triangle', 480, 420, t, 0.03, 0.4 * v, 0.06);
        noise(t, 'bandpass', 3200, 1.2, 0.2 * v, 0.03);
      },
      hat: function (t, v) {
        if (openHatGain) {                                     // pedal down chokes the open hat
          openHatGain.gain.cancelScheduledValues(t);
          openHatGain.gain.setTargetAtTime(0.0001, t, 0.008);
          openHatGain = null;
        }
        metal(t, 0.42 * v, 0.055, 7000, 10000);
        noise(t, 'highpass', 8000, 0.7, 0.16 * v, 0.04);
      },
      ohat: function (t, v) {
        var g = metal(t, 0.4 * v, 0.42, 6500, 9500);
        noise(t, 'highpass', 7500, 0.7, 0.14 * v, 0.3);
        openHatGain = g;
      },
      ride: function (t, v) {
        metal(t, 0.2 * v, 1.0, 5200, 7500, 1.35);
        noise(t, 'bandpass', 7200, 0.8, 0.14 * v, 0.7);
        osc('sine', 3150, 3150, t, 0.01, 0.1 * v, 0.6);        // ping
        osc('sine', 4720, 4720, t, 0.01, 0.06 * v, 0.4);
      },
      crash: function (t, v) {
        noise(t, 'highpass', 3200, 0.6, 0.5 * v, 1.7);
        metal(t, 0.28 * v, 1.4, 4200, 8000, 1.2);
        noise(t, 'bandpass', 6000, 0.6, 0.25 * v, 0.9);
      },
      clap: function (t, v) {
        [0, 0.011, 0.024, 0.038].forEach(function (dt, i) {
          noise(t + dt, 'bandpass', 1500, 0.9, (i === 3 ? 0.55 : 0.32) * v, i === 3 ? 0.16 : 0.03);
        });
      },
      perc: function (t, v) {                                  // cowbell-style bell tone
        var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.2;
        var g = amp(t, 0.3 * v, 0.22, 0.001);
        f.connect(g);
        [587, 845].forEach(function (hz) {
          var o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = hz;
          o.connect(f); o.start(t); o.stop(t + 0.3);
        });
      }
    };

    ['tomHi', 'tomMid', 'tomLo'].forEach(function (name) {
      voices[name] = function (t, v, opts) {
        var f = (opts && opts.pitch) || TOM_DEFAULT[name];
        var decay = 0.28 + 30 / f;                             // lower drums ring longer
        osc('sine', f * 1.7, f, t, 0.045, 0.85 * v, decay);
        osc('triangle', f * 1.68, f * 1.62, t, 0.08, 0.16 * v, 0.14);
        noise(t, 'bandpass', 2800, 1, 0.22 * v, 0.02);
      };
    });

    function hit(name, when, vel, opts) {
      var key = ALIASES[name] || name;
      var voice = voices[key] || voices.perc;
      if (ctx.state === 'suspended' && ctx.resume && !ctx.startRendering) ctx.resume();
      var t = when === undefined ? ctx.currentTime : when;
      voice(t, vel === undefined ? 0.8 : Math.max(0.05, Math.min(1, vel)), opts);
    }

    return { hit: hit, names: Object.keys(voices), defaultTomPitch: TOM_DEFAULT };
  }

  // Locally generated PCM one-shots: no downloads or recording licenses required.
  var SAMPLES = {
    kick: ['Round kick', 48, .55, 0], sub: ['Sub kick', 34, 1.1, 0], punch: ['Punch kick', 65, .22, .08],
    snare: ['Studio snare', 185, .24, .8], tight: ['Tight snare', 240, .12, .75], brush: ['Brush snare', 170, .48, 1],
    hat: ['Closed hat', 8000, .065, 1], ohat: ['Open hat', 7300, .5, 1], ride: ['Ride cymbal', 4300, 1.2, .65], crash: ['Crash cymbal', 6100, 1.7, .9],
    clap: ['Hand clap', 1300, .22, 1], rim: ['Rim click', 1600, .075, .12],
    tomHi: ['High tom', 210, .38, .04], tomMid: ['Mid tom', 155, .45, .04], tomLo: ['Floor tom', 105, .6, .04],
    perc: ['Cowbell', 587, .3, 0], wood: ['Woodblock', 850, .12, 0], shaker: ['Shaker', 9500, .16, 1], tamb: ['Tambourine', 5400, .3, .85], conga: ['Conga', 280, .25, .03]
  };
  var KITS = {
    studio: { name: 'Studio kit', map: {} },
    electronic: { name: 'Analog machine', map: { kick: 'sub', snare: 'tight', tomHi: 'conga', tomLo: 'sub', perc: 'wood' } },
    brush: { name: 'Soft / brushed', map: { kick: 'kick', snare: 'brush', hat: 'shaker', ohat: 'tamb', crash: 'ride', clap: 'rim' } },
    percussion: { name: 'Hand percussion', map: { kick: 'tomLo', snare: 'conga', hat: 'shaker', ohat: 'tamb', tomHi: 'wood', tomLo: 'conga', crash: 'tamb', clap: 'clap', perc: 'perc' } }
  };
  var cache = new WeakMap();
  function sample(ctx, id, decay) {
    decay = Math.max(.1, Math.min(2, decay || 1));
    var cacheKey = id + ":" + decay;
    var bank = cache.get(ctx); if (!bank) { bank = {}; cache.set(ctx, bank); }
    if (bank[cacheKey]) return bank[cacheKey];
    var spec = SAMPLES[id], duration = spec[2] * 5 * decay;
    var b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate), d = b.getChannelData(0);
    var seed = 12345, phase = 0, last = 0;
    for (var i = 0; i < d.length; i++) {
      var t = i / ctx.sampleRate;
      seed = (1664525 * seed + 1013904223) >>> 0;
      var n = seed / 2147483648 - 1;
      var high = n - last; last = n;
      var freq = spec[1] * (1 + (spec[1] < 400 ? 2.5 : .15) * Math.exp(-t * 65));
      phase += 2 * Math.PI * freq / ctx.sampleRate;
      var tone = Math.sin(phase);
      if (id === 'perc' || id === 'wood') tone = (Math.sin(phase) + .5 * Math.sin(phase * 1.44)) / 1.5;
      var noise = spec[1] > 3000 ? high * .5 : n;
      var envelope = Math.min(1, t / .0015) * Math.exp(-t / (spec[2] * decay) * 4);
      if (id === 'clap') envelope *= t < .045 ? .25 + .75 * Math.pow(Math.sin(t * 280), 2) : 1;
      d[i] = .65 * envelope * (tone * (1 - spec[3]) + noise * spec[3]);
    }
    bank[cacheKey] = b; return b;
  }
  function create(ctx, out) {
    var synth = createSynth(ctx, out), open = null;
    function hit(name, when, vel, opts) {
      if (!opts || !opts.sample) return synth.hit(name, when, vel, opts);
      if (opts.level === 0 || vel === 0) return;
      var id = SAMPLES[opts.sample] ? opts.sample : 'kick';
      var t = Math.max(ctx.currentTime, when === undefined ? ctx.currentTime : when);
      if (ctx.state === 'suspended' && !ctx.startRendering) ctx.resume();
      if ((ALIASES[name] || name) === 'hat' && open) { open.gain.cancelScheduledValues(t); open.gain.setTargetAtTime(.0001, t, .006); }
      var src = ctx.createBufferSource(); src.buffer = sample(ctx, id, opts.decay);
      src.playbackRate.value = Math.pow(2, (opts.tune || 0) / 12);
      var filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = opts.tone || 18000;
      var drive = ctx.createWaveShaper(), curve = new Float32Array(512), amount = 1 + (opts.drive || 0) * 12;
      for (var i = 0; i < curve.length; i++) { var x = i * 2 / 511 - 1; curve[i] = opts.drive ? Math.tanh(x * amount) / Math.tanh(amount) : x; }
      drive.curve = curve; drive.oversample = '2x';
      var gain = ctx.createGain(), length = src.buffer.duration / src.playbackRate.value;
      var peak = Math.max(.0001, (vel === undefined ? .8 : vel) * (opts.level === undefined ? 1 : opts.level));
      gain.gain.setValueAtTime(peak, t); gain.gain.exponentialRampToValueAtTime(.0001, t + Math.max(.02, length));
      var pan = ctx.createStereoPanner(); pan.pan.value = opts.pan || 0;
      src.connect(filter); filter.connect(drive); drive.connect(gain); gain.connect(pan); pan.connect(out);
      if ((ALIASES[name] || name) === 'ohat') open = gain;
      src.onended = function () { src.disconnect(); filter.disconnect(); drive.disconnect(); gain.disconnect(); pan.disconnect(); if (open === gain) open = null; };
      src.start(t); src.stop(t + Math.max(.02, length) + .01);
    }
    return { hit: hit, names: synth.names, defaultTomPitch: TOM_DEFAULT };
  }
  root.DrumEngine = { create: create, samples: SAMPLES, kits: KITS, aliases: ALIASES };
})(typeof window !== 'undefined' ? window : this);
