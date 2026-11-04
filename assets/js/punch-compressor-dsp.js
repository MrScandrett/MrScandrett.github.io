/* Original educational RMS compressor. No hardware code, circuit model, or
 * measured response is used. Shared by the AudioWorklet and offline unit tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PunchCompressorDSP = api;
}(globalThis, function () {
  'use strict';
  const defaults = { threshold: -24, ratio: 4, output: 0, knee: 0, sidechain: 20 };
  const limits = { threshold: [-60, 0], ratio: [1, 20], output: [-12, 12], knee: [0, 12], sidechain: [20, 500] };
  function normalize(values = {}) {
    return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
      const value = Number(values[key]), [min, max] = limits[key];
      return [key, Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback];
    }));
  }
  function reduction(level, p) {
    const over = level - p.threshold, slope = 1 - 1 / p.ratio;
    if (p.knee > 0 && Math.abs(over) < p.knee / 2) return slope * (over + p.knee / 2) ** 2 / (2 * p.knee);
    return Math.max(0, over) * slope;
  }
  class Processor {
    constructor(sampleRate) {
      this.sampleRate = sampleRate;
      this.detectorState = [];
      this.power = 0;
      this.reduction = 0;
      this.outputDb = 0;
      this.detector = Math.exp(-1 / (sampleRate * .003));
      this.outputSmoothing = Math.exp(-1 / (sampleRate * .005));
    }
    process(input, output, p) {
      const frames = output[0]?.length || 0;
      const hp = Math.exp(-2 * Math.PI * (p.sidechain ?? 20) / this.sampleRate);
      for (let i = 0; i < frames; i++) {
        // One detector for all channels preserves the stereo image. Opposite
        // polarity channels cannot cancel in this power measurement.
        let power = 0;
        for (let ch = 0; ch < input.length; ch++) {
          const state = this.detectorState[ch] ||= { x: 0, y: 0 }, x = input[ch][i] || 0;
          const y = hp * (state.y + x - state.x); state.x = x; state.y = y;
          power = Math.max(power, y * y);
        }
        this.power = this.detector * this.power + (1 - this.detector) * power;
        const level = 10 * Math.log10(Math.max(1e-12, this.power));
        const target = reduction(level, p);
        // Stronger overshoots react faster; deeper compression recovers more
        // slowly. These are our own time constants, not a hardware calibration.
        const over = Math.max(0, level - p.threshold);
        const attack = Math.max(.001, .015 / (1 + (over / 10) ** 2));
        const release = .04 + .008 * this.reduction;
        const smoothing = Math.exp(-1 / (this.sampleRate * (target > this.reduction ? attack : release)));
        this.reduction = smoothing * this.reduction + (1 - smoothing) * target;
        this.outputDb = this.outputSmoothing * this.outputDb + (1 - this.outputSmoothing) * p.output;
        const gain = 10 ** ((this.outputDb - this.reduction) / 20);
        for (let ch = 0; ch < output.length; ch++) output[ch][i] = (input[ch]?.[i] ?? 0) * gain;
      }
    }
  }
  return { defaults, limits, normalize, reduction, Processor };
}));
