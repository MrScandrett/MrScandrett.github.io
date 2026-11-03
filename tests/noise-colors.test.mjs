import test from 'node:test';
import assert from 'node:assert/strict';
import { NOISE_COLORS, createNoise } from '../assets/js/noise-colors.mjs';

// Small seeded generator so the measurements are the same on every run.
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function fftPower(re) {
  const n = re.length, im = new Float64Array(n);
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) [re[i], re[j]] = [re[j], re[i]];
  }
  for (let len = 2; len <= n; len <<= 1) {
    const step = -2 * Math.PI / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const c = Math.cos(step * k), s = Math.sin(step * k);
        const a = i + k, b = a + len / 2;
        const tr = re[b] * c - im[b] * s, ti = re[b] * s + im[b] * c;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
      }
    }
  }
  return Array.from({ length: n / 2 }, (_, k) => re[k] ** 2 + im[k] ** 2);
}
// Welch-averaged power spectral density, then the dB change per octave across 250 Hz–8 kHz.
function slopePerOctave(id) {
  const rate = 48000, size = 4096, next = createNoise(id, { sampleRate: rate, random: mulberry32(7) });
  for (let i = 0; i < rate; i++) next();
  const psd = new Float64Array(size / 2);
  for (let segment = 0; segment < 64; segment++) {
    const frame = Float64Array.from({ length: size }, (_, i) => next() * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / size)));
    fftPower(frame).forEach((p, k) => { psd[k] += p; });
  }
  const level = hz => {
    const lo = Math.round(hz / Math.SQRT2 / rate * size), hi = Math.round(hz * Math.SQRT2 / rate * size);
    let sum = 0;
    for (let k = lo; k < hi; k++) sum += psd[k];
    return 10 * Math.log10(sum / (hi - lo));
  };
  return (level(8000) - level(250)) / 5;
}

test('every colour has the slope it claims', () => {
  for (const color of NOISE_COLORS) {
    const claimed = Number(color.slope.replace('−', '-').replace(/ dB.*/, ''));
    const measured = slopePerOctave(color.id);
    assert.ok(Math.abs(measured - claimed) < 0.6, `${color.id}: ${measured.toFixed(2)} dB/octave, expected ${claimed}`);
  }
});

test('every colour comes out at its loudness and never clips', () => {
  for (const color of NOISE_COLORS) {
    const next = createNoise(color.id, { random: mulberry32(11) });
    let sum = 0, peak = 0;
    const n = 480000;
    for (let i = 0; i < n; i++) { const v = next(); sum += v * v; peak = Math.max(peak, Math.abs(v)); }
    const rms = Math.sqrt(sum / n);
    assert.ok(Math.abs(rms / color.rms - 1) < 0.08, `${color.id}: RMS ${rms.toFixed(4)}, expected ${color.rms}`);
    assert.ok(peak < 0.95, `${color.id}: peak ${peak.toFixed(3)}`);
  }
});

test('colours are complete and unknown colours are refused', () => {
  const ids = NOISE_COLORS.map(c => c.id);
  assert.deepEqual(ids, ['white', 'pink', 'brown', 'blue', 'violet']);
  assert.equal(new Set(NOISE_COLORS.map(c => c.hue)).size, ids.length);
  for (const color of NOISE_COLORS) assert.ok(color.name && color.about && /^#[0-9a-f]{6}$/.test(color.swatch));
  assert.throws(() => createNoise('plaid'), /Unknown noise colour/);
});
