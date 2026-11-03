import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { Processor, normalize, rt60, impulseResponse, defaults, limits } = createRequire(import.meta.url)('../assets/js/studio-reverb-dsp.js');
const sr = 48000, block = 128;
function noise(n, seed = 7) { let s = seed; return Float32Array.from({ length: n }, () => { s = (s * 1664525 + 1013904223) >>> 0; return (s / 4294967296 * 2 - 1) * .5; }); }
function run(channels, params) {
  const processor = new Processor(sr), frames = channels[0].length, out = [new Float32Array(frames), new Float32Array(frames)];
  for (let i = 0; i < frames; i += block) processor.process(channels.map(c => c.subarray(i, i + block)), out.map(c => c.subarray(i, i + block)), params);
  return { out, processor };
}
const rms = (a, s = 0, e = a.length) => Math.sqrt(a.slice(s, e).reduce((t, v) => t + v * v, 0) / (e - s));
const impulse = seconds => { const x = new Float32Array(sr * seconds); x[0] = 1; return x; };
// Reverb time from Schroeder backward integration (T20 extrapolated to 60 dB).
function measuredRt60(left) {
  const energy = new Float64Array(left.length); let sum = 0;
  for (let i = left.length - 1; i >= 0; i--) { sum += left[i] ** 2; energy[i] = sum; }
  let a = 0, b = 0;
  for (let i = 0; i < left.length; i++) { const db = 10 * Math.log10(energy[i] / energy[0]); if (!a && db < -5) a = i; if (db < -25) { b = i; break; } }
  return (b - a) / sr * 3;
}
const bare = { wet: 1, early: 0, predelay: 0, lowcut: 20, highcut: 20000, damping: 0 };

test('parameters are clamped and corrupt values fall back to defaults', () => {
  assert.deepEqual(normalize({}), defaults);
  const bad = normalize({ decay: 99, size: -5, predelay: NaN, damping: 'x', wet: 2, lowcut: Infinity, highcut: 0 });
  assert.equal(bad.decay, limits.decay[1]); assert.equal(bad.size, limits.size[0]); assert.equal(bad.predelay, defaults.predelay);
  assert.equal(bad.damping, defaults.damping); assert.equal(bad.wet, 1); assert.equal(bad.lowcut, defaults.lowcut); assert.equal(bad.highcut, limits.highcut[0]);
});
test('measured reverb time follows the Decay knob', () => {
  for (const decay of [.5, 1.5, 4]) {
    const { out } = run([impulse(decay * 3 + 4)], { ...bare, decay }), measured = measuredRt60(out[0]);
    assert.ok(measured > decay * .75 && measured < decay * 1.15, `decay ${decay}: measured ${measured.toFixed(2)}`);
  }
});
test('the displayed reverb times come from the same filters the processor runs', () => {
  const flat = rt60({ ...bare, decay: 2.4 });
  assert.ok(Math.abs(flat.mid - 2.4) / 2.4 < .08, `mid ${flat.mid}`);
  assert.ok(flat.low >= flat.mid, 'bass rings at least as long as the mids');
  const dark = rt60({ decay: 2.4, damping: 85 });
  assert.ok(dark.high < dark.mid * .5, `high ${dark.high} vs mid ${dark.mid}`);
});
test('damping removes treble from the tail', () => {
  const treble = x => { const y = new Float32Array(x.length); let s = 0; for (let i = 0; i < x.length; i++) { s += .1 * (x[i] - s); y[i] = x[i] - s; } return y; };
  const bright = treble(run([impulse(4)], { ...bare, decay: 3, damping: 0 }).out[0]), dark = treble(run([impulse(4)], { ...bare, decay: 3, damping: 90 }).out[0]);
  assert.ok(rms(dark, sr, sr * 3) < rms(bright, sr, sr * 3) * .25);
});
test('tail loudness stays in a narrow band as Decay changes', () => {
  const x = noise(sr * 8), levels = [.4, 2, 8].map(decay => rms(run([x, x.map(v => -v)], { ...bare, decay }).out[0], sr * 5) / rms(x));
  const spread = 20 * Math.log10(Math.max(...levels) / Math.min(...levels));
  assert.ok(spread < 5, `spread ${spread.toFixed(1)} dB`);
  assert.ok(levels.every(v => v > .15 && v < 1.5), levels.join(','));
});
test('stays finite and bounded at the extremes, and falls silent', () => {
  const loud = noise(sr * 3).map(v => v * 4), extreme = { ...bare, decay: 15, size: 100, diffusion: 100, early: 100, wet: 1 };
  const { out, processor } = run([loud, loud], extreme);
  assert.ok(out.every(c => c.every(Number.isFinite)));
  assert.ok(out[0].reduce((m, v) => Math.max(m, Math.abs(v)), 0) < 40, 'no runaway feedback');
});
test('the loop is passive at every damping setting, and the tail dies to true silence', () => {
  for (const damping of [0, 50, 100]) {
    const { out } = run([noise(sr)], { ...bare, decay: .3, damping, wet: 1 }), tail = new Float32Array(sr * 12), left = new Float32Array(tail.length), right = new Float32Array(tail.length);
    const processor = new Processor(sr);
    for (let i = 0; i < sr; i += block) processor.process([noise(sr).subarray(i, i + block)], [new Float32Array(block), new Float32Array(block)], { ...bare, decay: .3, damping });
    for (let i = 0; i < tail.length; i += block) processor.process([tail.subarray(i, i + block)], [left.subarray(i, i + block), right.subarray(i, i + block)], { ...bare, decay: .3, damping });
    assert.ok(rms(left, tail.length - sr) < 1e-15, `damping ${damping}: tail ${rms(left, tail.length - sr)}`);
    assert.ok(out[0].every(Number.isFinite));
  }
});
test('wet 0 passes the input through untouched, mono input feeds both sides', () => {
  const x = noise(sr), dry = run([x], { wet: 0 });
  assert.deepEqual(dry.out[0], x);
  const wet = run([x], { ...bare, decay: 1 });
  assert.ok(rms(wet.out[0], sr / 2) > 0 && rms(wet.out[1], sr / 2) > 0);
});
test('the two sides of the tail are decorrelated, not a mono copy', () => {
  const { out } = run([impulse(3)], { ...bare, decay: 2 }), a = out[0].subarray(sr / 2, sr * 2), b = out[1].subarray(sr / 2, sr * 2);
  let ab = 0, aa = 0, bb = 0; for (let i = 0; i < a.length; i++) { ab += a[i] * b[i]; aa += a[i] ** 2; bb += b[i] ** 2; }
  assert.ok(Math.abs(ab / Math.sqrt(aa * bb)) < .35, `correlation ${ab / Math.sqrt(aa * bb)}`);
});
test('a hard-left source gives a left-leaning early image; pre-delay holds the wet back', () => {
  const x = noise(sr / 2), silent = new Float32Array(x.length);
  const { out } = run([x, silent], { ...bare, early: 100, predelay: 40, decay: .5 });
  assert.equal(out[0].subarray(0, sr * .03).every(v => v === 0), true, 'nothing before the pre-delay');
  assert.ok(rms(out[0], sr * .06, sr * .3) > rms(out[1], sr * .06, sr * .3) * 1.1);
});
test('the fallback impulse response is stereo, finite and long enough to hold the tail', () => {
  const [l, r] = impulseResponse({ decay: 2 }, sr);
  assert.equal(l.length, r.length); assert.ok(l.length > sr * 2);
  assert.ok(l.every(Number.isFinite) && r.every(Number.isFinite));
  assert.ok(rms(l, 0, sr) > rms(l, l.length - sr / 2));
});
