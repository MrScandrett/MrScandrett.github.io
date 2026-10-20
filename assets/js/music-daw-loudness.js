/* Loudness for Music Lab exports: integrated loudness in LUFS (ITU-R BS.1770 / EBU R128:
 * K-weighting, 400 ms blocks with 75% overlap, absolute -70 LUFS and relative -10 LU gates),
 * sample peak, and gain to reach a target such as -14 LUFS (streaming services).
 * DOM-free so Node tests can run it. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MusicDawLoudness = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  // BS.1770 K-weighting as two biquads, coefficients derived for any sample rate.
  function kFilters(fs) {
    let f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196;
    let K = Math.tan(Math.PI * f0 / fs), Vh = Math.pow(10, G / 20), Vb = Math.pow(Vh, 0.4996667741545416);
    let a0 = 1 + K / Q + K * K;
    const shelf = { b: [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0], a: [2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0] };
    f0 = 38.13547087602444; Q = 0.5003270373238773; K = Math.tan(Math.PI * f0 / fs);
    a0 = 1 + K / Q + K * K;
    const high = { b: [1, -2, 1], a: [2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0] };
    return [shelf, high];
  }
  function biquad(x, { b, a }) {
    const y = new Float32Array(x.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) {
      const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
    }
    return y;
  }

  function measure(channels, sampleRate) {
    const n = channels[0]?.length || 0;
    let peak = 0;
    channels.forEach((c) => { for (let i = 0; i < c.length; i++) { const v = Math.abs(c[i]); if (v > peak) peak = v; } });
    const block = Math.round(sampleRate * 0.4), hop = Math.round(sampleRate * 0.1);
    if (n < block) return { lufs: -Infinity, peakDb: peak ? 20 * Math.log10(peak) : -Infinity };
    const [shelf, high] = kFilters(sampleRate);
    const weighted = channels.slice(0, 2).map((c) => biquad(biquad(c, shelf), high));   // L/R, weight 1.0 each
    // Running sums of squares so each 400 ms block is O(1).
    const sq = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) { let s = 0; for (const w of weighted) s += w[i] * w[i]; sq[i + 1] = sq[i] + s; }
    const blocks = [];
    for (let s = 0; s + block <= n; s += hop) blocks.push((sq[s + block] - sq[s]) / block);
    const loud = (z) => -0.691 + 10 * Math.log10(z);
    const abs = blocks.filter((z) => z > 0 && loud(z) > -70);
    if (!abs.length) return { lufs: -Infinity, peakDb: peak ? 20 * Math.log10(peak) : -Infinity };
    const rel = loud(abs.reduce((a, z) => a + z, 0) / abs.length) - 10;
    const gated = abs.filter((z) => loud(z) > rel);
    return { lufs: loud(gated.reduce((a, z) => a + z, 0) / gated.length), peakDb: 20 * Math.log10(peak) };
  }

  // Gain (linear) to reach targetLufs without letting the sample peak pass ceilingDb.
  function normalizeGain(stats, targetLufs = -14, ceilingDb = -1) {
    if (!Number.isFinite(stats.lufs)) return 1;
    const want = targetLufs - stats.lufs, room = ceilingDb - stats.peakDb;
    return Math.pow(10, Math.min(want, room) / 20);
  }

  return { measure, normalizeGain };
}));
