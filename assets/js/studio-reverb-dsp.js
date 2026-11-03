/* Studio Reverb: an original stereo algorithmic reverb for Music Lab.
 *
 * Signal path: pre-delay -> input diffusion (4 all-pass stages per side) -> an
 * 8-line feedback delay network (Hadamard mixing, per-line bass/treble decay
 * control, slow delay modulation) -> decorrelated stereo taps, plus a separate
 * early-reflection tap pattern -> low-cut / high-cut -> wet/dry.
 *
 * It belongs to the family of high-resolution stereo digital reverb processors
 * (rooms, plates, chambers, halls) but is written from textbook FDN theory
 * (Jot, Schroeder, Stautner & Puckette). It copies no commercial algorithm,
 * impulse response, or measured response, and is not an emulation of any unit.
 * Shared by the AudioWorklet, the ConvolverNode fallback, and the unit tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StudioReverbDSP = api;
}(globalThis, function () {
  'use strict';
  const defaults = { decay: 2.4, size: 70, predelay: 12, damping: 45, diffusion: 80, early: 40, lowcut: 80, highcut: 12000, wet: .3 };
  const limits = { decay: [.2, 15], size: [20, 100], predelay: [0, 250], damping: [0, 100], diffusion: [0, 100], early: [0, 100], lowcut: [20, 1000], highcut: [1000, 20000], wet: [0, 1] };
  function normalize(values = {}) {
    return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
      const value = Number(values[key]), [min, max] = limits[key];
      return [key, Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback];
    }));
  }

  const LINES = 8;
  // Delay-line lengths (ms) at full size: irregular so the lines never share a common period.
  const BASE_MS = [31.3, 37.7, 41.9, 47.3, 53.9, 61.1, 67.3, 73.9];
  const MOD_RATE = [.11, .17, .23, .29, .13, .19, .31, .37];       // Hz, one slow LFO per line
  const MOD_SAMPLES = 5;                                            // depth at 48 kHz
  const BASS_RATIO = 1.15;                                          // low frequencies ring a little longer than mids
  const SPLIT_HZ = 250;                                             // where "bass" ends in the loop
  const DIFFUSER_L = [4.77, 3.59, 12.73, 9.31];                     // all-pass delays, ms
  const DIFFUSER_R = [4.38, 3.91, 11.97, 8.42];
  const EARLY_L = [5.3, 11.7, 17.9, 25.1, 33.7, 43.3, 53.9];        // early-reflection taps at full size, ms
  const EARLY_R = [7.1, 13.3, 21.9, 28.7, 38.9, 47.1, 58.3];
  const EARLY_GAIN = [.9, -.8, .7, -.6, .5, -.42, .34];
  const WALSH = (row) => Array.from({ length: LINES }, (_, i) => (popcount(i & row) & 1 ? -1 : 1));
  function popcount(n) { let c = 0; for (; n; n &= n - 1) c++; return c; }
  const OUT_L = WALSH(3), OUT_R = WALSH(5);
  const SIGN_IN = WALSH(6);
  const OUT_SCALE = .75;

  const scaleFor = size => .3 + .7 * size / 100;                    // room-dimension factor on every length
  const dampHz = damping => 20000 * (1200 / 20000) ** (damping / 100);
  const onePole = (hz, sr) => 1 - Math.exp(-2 * Math.PI * Math.min(hz, sr * .45) / sr);

  // Per-round-trip gains that give the requested reverb time (RT60) for a line of `length` samples.
  function lineGains(length, decay, sr) {
    const trip = length / sr;
    return { mid: Math.min(.99995, 10 ** (-3 * trip / decay)), low: Math.min(.99995, 10 ** (-3 * trip / (decay * BASS_RATIO))) };
  }

  /* Reverb times the loop filter produces at a few frequencies, computed from
   * the same filters the processor runs (not looked up from a table). */
  function rt60(values, sr = 48000) {
    const p = normalize(values), scale = scaleFor(p.size);
    const length = BASE_MS.reduce((sum, ms) => sum + ms, 0) / LINES * scale * sr / 1000;
    const g = lineGains(length, p.decay, sr), lowK = onePole(SPLIT_HZ, sr), dampK = onePole(dampHz(p.damping), sr);
    const at = hz => {
      const w = 2 * Math.PI * hz / sr, zr = Math.cos(w), zi = -Math.sin(w);          // z^-1
      const pole = k => { const dr = 1 - (1 - k) * zr, di = -(1 - k) * zi, d = dr * dr + di * di; return [k * dr / d, -k * di / d]; };
      const [lr, li] = pole(lowK), [pr, pi] = pole(dampK);
      // Loop filter = gMid * damping(z) + (gLow - gMid) * bassLowpass(z). Both filters have gain <= 1,
      // so |H| <= gMid + (gLow - gMid) = gLow < 1: the loop can never grow, at any frequency.
      const re = g.mid * pr + (g.low - g.mid) * lr, im = g.mid * pi + (g.low - g.mid) * li;
      const magnitude = Math.max(1e-9, Math.hypot(re, im));
      return magnitude >= 1 ? Infinity : 60 / (-20 * Math.log10(magnitude)) * length / sr;
    };
    return { low: at(125), mid: at(1000), high: at(4000) };
  }

  class Biquad {
    constructor() { this.x1 = this.x2 = this.y1 = this.y2 = 0; this.b0 = 1; this.b1 = this.b2 = this.a1 = this.a2 = 0; }
    set(type, hz, sr) {
      const w = 2 * Math.PI * Math.min(hz, sr * .45) / sr, cos = Math.cos(w), alpha = Math.sin(w) / (2 * Math.SQRT1_2), a0 = 1 + alpha;
      const high = type === 'highpass';
      this.b0 = (high ? (1 + cos) / 2 : (1 - cos) / 2) / a0;
      this.b1 = (high ? -(1 + cos) : 1 - cos) / a0;
      this.b2 = this.b0;
      this.a1 = -2 * cos / a0; this.a2 = (1 - alpha) / a0;
    }
    tick(x) {
      const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
      this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
      return y;
    }
  }

  const pow2 = n => { let v = 1; while (v < n) v <<= 1; return v; };
  // A circular buffer with fractional (linearly interpolated) reads.
  class Delay {
    constructor(maxSamples) { this.size = pow2(maxSamples + 4); this.mask = this.size - 1; this.data = new Float32Array(this.size); this.pos = 0; }
    write(v) { this.data[this.pos] = v; this.pos = (this.pos + 1) & this.mask; }
    read(delay) {
      const d = Math.max(1, delay), whole = Math.floor(d), frac = d - whole;
      const a = this.data[(this.pos - whole) & this.mask], b = this.data[(this.pos - whole - 1) & this.mask];
      return a + (b - a) * frac;
    }
    tap(whole) { return this.data[(this.pos - whole) & this.mask]; }
  }
  class Allpass {
    constructor(samples) { this.length = Math.max(2, Math.round(samples)); this.data = new Float32Array(this.length); this.i = 0; }
    tick(x, k) {
      const d = this.data[this.i], w = x + k * d;
      this.data[this.i] = w; if (++this.i === this.length) this.i = 0;
      return d - k * w;
    }
  }

  class Processor {
    constructor(sampleRate) {
      const sr = this.sampleRate = sampleRate;
      this.maxLine = Math.ceil(BASE_MS[LINES - 1] * sr / 1000 + MOD_SAMPLES * sr / 48000 + 8);
      this.lines = BASE_MS.map(() => new Delay(this.maxLine));
      this.lowState = new Float64Array(LINES);
      this.dampState = new Float64Array(LINES);
      this.phase = Float64Array.from(BASE_MS, (_, i) => i / LINES);
      this.modStep = Float64Array.from(MOD_RATE, hz => hz / sr);
      this.diffL = DIFFUSER_L.map(ms => new Allpass(ms * sr / 1000));
      this.diffR = DIFFUSER_R.map(ms => new Allpass(ms * sr / 1000));
      const buffer = Math.ceil(.25 * sr + BASE_MS[LINES - 1] * sr / 1000 + 16);
      this.inL = new Delay(buffer); this.inR = new Delay(buffer);
      this.hpL = new Biquad(); this.hpR = new Biquad(); this.lpL = new Biquad(); this.lpR = new Biquad();
      this.scale = null; this.pre = null;                    // slewed state, started at the first block
      this.sig = ''; this.cache = null;
      this.level = 0;                                        // smoothed wet level, dB (for the meter)
      this.levelPower = 0;
      this.mix = new Float64Array(LINES);
      this.taps = new Float64Array(LINES);
    }
    // Recompute only what changed. Per-block, so a knob turn is a handful of multiplies.
    prepare(p) {
      const sig = Object.values(p).join('|');
      if (sig === this.sig) return;
      this.sig = sig;
      const sr = this.sampleRate;
      this.target = { scale: scaleFor(p.size), pre: p.predelay * sr / 1000 };
      this.lowK = onePole(SPLIT_HZ, sr); this.dampK = onePole(dampHz(p.damping), sr);
      this.diffK = .15 + .6 * p.diffusion / 100;
      this.early = p.early / 100 * .45;
      this.hpL.set('highpass', p.lowcut, sr); this.hpR.set('highpass', p.lowcut, sr);
      this.lpL.set('lowpass', p.highcut, sr); this.lpR.set('lowpass', p.highcut, sr);
      this.p = p;
    }
    process(input, output, values) {
      const frames = output[0]?.length || 0, sr = this.sampleRate, p = normalize(values);
      this.prepare(p);
      if (this.scale === null) { this.scale = this.target.scale; this.pre = this.target.pre; }
      const L = input[0], R = input[1] || input[0], outL = output[0], outR = output[1] || null;
      const wet = p.wet, dry = 1 - p.wet;
      const slewScale = .35 / sr, slewPre = .1;
      const depth = MOD_SAMPLES * sr / 48000;
      const lengths = new Float64Array(LINES), gMid = new Float64Array(LINES), gLow = new Float64Array(LINES), inGain = new Float64Array(LINES);
      const { lowK, dampK, diffK, early, hpL, hpR, lpL, lpR } = this;
      const mix = this.mix, taps = this.taps, lines = this.lines, lowState = this.lowState, dampState = this.dampState, phase = this.phase, modStep = this.modStep;
      let power = 0, lastGainScale = -1;
      // lastGainScale resets every block, so a new decay time is picked up within one block.
      for (let n = 0; n < frames; n++) {
        // Glide the room size and pre-delay (a click-free "pitch glide" rather than a jump).
        const dScale = this.target.scale - this.scale;
        this.scale += Math.abs(dScale) <= slewScale ? dScale : Math.sign(dScale) * slewScale;
        const dPre = this.target.pre - this.pre;
        this.pre += Math.abs(dPre) <= slewPre ? dPre : Math.sign(dPre) * slewPre;
        if (this.scale !== lastGainScale) {
          lastGainScale = this.scale;
          for (let i = 0; i < LINES; i++) {
            lengths[i] = BASE_MS[i] * this.scale * sr / 1000;
            const g = lineGains(lengths[i], p.decay, sr);
            gMid[i] = g.mid; gLow[i] = g.low;
            inGain[i] = Math.sqrt(1 - g.mid * g.mid);        // keeps tail level steady as decay changes
          }
        }
        const xl = L ? (L[n] || 0) : 0, xr = R ? (R[n] || 0) : 0;
        this.inL.write(xl); this.inR.write(xr);
        const pl = this.inL.read(this.pre + 1), pr = this.inR.read(this.pre + 1);
        let dl = pl, dr = pr;
        for (let s = 0; s < 4; s++) { dl = this.diffL[s].tick(dl, diffK); dr = this.diffR[s].tick(dr, diffK); }
        // Read every line, apply low/high decay, then mix with an orthogonal Hadamard matrix.
        let yl = 0, yr = 0;
        for (let i = 0; i < LINES; i++) {
          phase[i] += modStep[i]; if (phase[i] >= 1) phase[i] -= 1;
          const d = lines[i].read(lengths[i] + depth * Math.sin(2 * Math.PI * phase[i]));
          taps[i] = d;
          lowState[i] += lowK * (d - lowState[i]);
          dampState[i] += dampK * (d - dampState[i]);
          mix[i] = gMid[i] * dampState[i] + (gLow[i] - gMid[i]) * lowState[i];
          yl += OUT_L[i] * d; yr += OUT_R[i] * d;
        }
        for (let h = 1; h < LINES; h <<= 1) {
          for (let i = 0; i < LINES; i += h << 1) {
            for (let j = i; j < i + h; j++) { const a = mix[j], b = mix[j + h]; mix[j] = a + b; mix[j + h] = a - b; }
          }
        }
        const norm = Math.SQRT1_2 * .5;                       // 1 / sqrt(8)
        for (let i = 0; i < LINES; i++) {
          let v = mix[i] * norm + SIGN_IN[i] * inGain[i] * ((i & 1) ? dr : dl) * .5;
          if (v < 1e-18 && v > -1e-18) v = 0;                 // flush denormals in the silent tail
          lines[i].write(v);
        }
        // Early reflections come straight from the pre-delayed input, spaced by room size.
        let el = 0, er = 0;
        if (early > 0) {
          for (let t = 0; t < EARLY_L.length; t++) {
            el += EARLY_GAIN[t] * this.inL.read(this.pre + EARLY_L[t] * this.scale * sr / 1000 + 1) + .35 * EARLY_GAIN[t] * this.inR.read(this.pre + EARLY_R[t] * this.scale * sr / 1000 + 1);
            er += EARLY_GAIN[t] * this.inR.read(this.pre + EARLY_R[t] * this.scale * sr / 1000 + 1) + .35 * EARLY_GAIN[t] * this.inL.read(this.pre + EARLY_L[t] * this.scale * sr / 1000 + 1);
          }
        }
        let wl = yl * OUT_SCALE + el * early, wr = yr * OUT_SCALE + er * early;
        wl = lpL.tick(hpL.tick(wl)); wr = lpR.tick(hpR.tick(wr));
        power += wl * wl + wr * wr;
        outL[n] = xl * dry + wl * wet;
        if (outR) outR[n] = xr * dry + wr * wet;
      }
      this.levelPower = .8 * this.levelPower + .2 * (frames ? power / (2 * frames) : 0);
      this.level = 10 * Math.log10(Math.max(1e-12, this.levelPower));
    }
  }

  /* A static stereo impulse response of the reverb (modulation and early
   * reflections included), for browsers without AudioWorklet. Heavy parts run
   * once per knob change, never per audio block. */
  function impulseResponse(values, sr) {
    const p = normalize({ ...values, wet: 1 }), times = rt60(p, sr);
    const seconds = Math.min(18, Math.max(.3, Math.max(times.low, times.mid) * 1.15 + p.predelay / 1000 + .1));
    const length = Math.ceil(seconds * sr), processor = new Processor(sr);
    const left = new Float32Array(length), right = new Float32Array(length), impulse = new Float32Array(length);
    impulse[0] = 1;
    processor.process([impulse], [left, right], p);
    return [left, right];
  }

  return { defaults, limits, normalize, rt60, impulseResponse, Processor, LINES };
}));
