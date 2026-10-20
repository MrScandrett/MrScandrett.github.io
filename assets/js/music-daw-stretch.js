/* Offline time-stretch and pitch-shift for Music Lab audio clips (WSOLA).
 * Waveform-similarity overlap-add: windows of the source are laid down at a fixed
 * output hop; each next window is taken near where the time ratio says, nudged to the
 * offset that best lines up with what was just written, so pitch stays put while the
 * length changes. Pitch shift = stretch by the pitch ratio, then resample back.
 * DOM-free, so Node tests can run it. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MusicDawStretch = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function hann(n) {
    const w = new Float32Array(n);
    for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n);
    return w;
  }

  // ratio > 1 makes the audio longer (slower), < 1 shorter (faster).
  function stretchChannels(channels, ratio, sampleRate) {
    ratio = Math.max(0.25, Math.min(4, Number(ratio) || 1));
    const input = channels[0], len = input.length;
    if (Math.abs(ratio - 1) < 1e-4 || len < 8) return channels.map((c) => Float32Array.from(c));
    const N = Math.max(256, Math.round((sampleRate || 44100) * 0.046 / 2) * 2);   // ~46 ms windows
    const Hs = N / 4, Ha = Hs / ratio, tol = Math.round(N / 8), win = hann(N);
    const outLen = Math.max(1, Math.round(len * ratio));
    const out = channels.map(() => new Float32Array(outLen + N)), norm = new Float32Array(outLen + N);
    const at = (data, i) => (i >= 0 && i < len ? data[i] : 0);
    let prev = 0;   // where the last window was read from
    for (let k = 0, o = 0; o < outLen; k++, o += Hs) {
      const ideal = Math.round(k * Ha);
      let best = ideal;
      if (k > 0) {
        // Continue the previous window naturally: compare its next hop with candidates.
        const natural = prev + Hs;
        const score = (cand, stride) => { let sum = 0; for (let i = 0; i < N / 2; i += stride) sum += at(input, natural + i) * at(input, cand + i); return sum; };
        let bestScore = -Infinity;
        for (let d = -tol; d <= tol; d += 6) { const v = score(ideal + d, 4); if (v > bestScore) { bestScore = v; best = ideal + d; } }
        const coarse = best;   // refine to the exact sample
        bestScore = -Infinity;
        for (let d = -5; d <= 5; d++) { const v = score(coarse + d, 2); if (v > bestScore) { bestScore = v; best = coarse + d; } }
      }
      prev = best;
      for (let ch = 0; ch < channels.length; ch++) {
        const src = channels[ch], dst = out[ch];
        for (let i = 0; i < N; i++) dst[o + i] += at(src, best + i) * win[i];
      }
      for (let i = 0; i < N; i++) norm[o + i] += win[i];
    }
    return out.map((dst) => {
      const r = new Float32Array(outLen);
      for (let i = 0; i < outLen; i++) r[i] = norm[i] > 1e-3 ? dst[i] / norm[i] : 0;
      return r;
    });
  }

  function resample(data, factor) {
    // factor > 1 reads faster (raises pitch, shortens).
    const outLen = Math.max(1, Math.round(data.length / factor)), r = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const x = i * factor, j = Math.floor(x), f = x - j;
      r[i] = (data[j] || 0) * (1 - f) + (data[j + 1] || 0) * f;
    }
    return r;
  }

  function pitchShiftChannels(channels, semitones, sampleRate) {
    const factor = Math.pow(2, (Number(semitones) || 0) / 12);
    if (Math.abs(factor - 1) < 1e-4) return channels.map((c) => Float32Array.from(c));
    return stretchChannels(channels, factor, sampleRate).map((c) => resample(c, factor));
  }

  return { stretchChannels, pitchShiftChannels, resample };
}));
