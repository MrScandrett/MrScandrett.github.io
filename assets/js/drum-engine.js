/* drum-engine.js — shared synthesized drum kit (Web Audio, no samples).
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

  function create(ctx, out) {
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
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var t = when === undefined ? ctx.currentTime : when;
      voice(t, vel === undefined ? 0.8 : Math.max(0.05, Math.min(1, vel)), opts);
    }

    return { hit: hit, names: Object.keys(voices), defaultTomPitch: TOM_DEFAULT };
  }

  root.DrumEngine = { create: create };
})(typeof window !== 'undefined' ? window : this);
