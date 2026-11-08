import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// FourierKit is a classic browser script; it only touches window.matchMedia at load time.
const sandbox = { window: { matchMedia: () => ({ matches: false }) }, Math, Float32Array, Float64Array };
vm.runInNewContext(fs.readFileSync('assets/js/lessons/fourier-kit.js', 'utf8') + '\nthis.FourierKit = FourierKit;', sandbox);
const K = sandbox.FourierKit;

const series = (type, count, x, duty) => {
  const wave = K.WAVES[type];
  return K.sumAt(K.terms(type, count, duty), x, wave.dc(duty));
};

test('wrap puts angles in (−π, π]', () => {
  for (const a of [-10, -Math.PI / 2, 0, 1, 3 * Math.PI, 7.5]) {
    const w = K.wrap(a);
    assert.ok(w > -Math.PI - 1e-12 && w <= Math.PI + 1e-12, `wrap(${a}) = ${w}`);
    assert.ok(Math.abs(Math.sin(w) - Math.sin(a)) < 1e-12 && Math.abs(Math.cos(w) - Math.cos(a)) < 1e-12);
  }
});

test('square wave: odd harmonics only, amplitude 4/(nπ)', () => {
  assert.equal(K.WAVES.square.harmonic(2), null);
  assert.ok(Math.abs(K.WAVES.square.harmonic(3).amp - 4 / (3 * Math.PI)) < 1e-15);
  assert.deepEqual(Array.from(K.terms('square', 4), (h) => h.n), [1, 3, 5, 7]);
});

test('every wave converges to its own target away from the jumps', () => {
  // all at least 0.2 from any jump (square/saw at 0 and ±π, the 30% pulse at ±0.3π ≈ ±0.94)
  const xs = [0.4, 1.3, 1.9, 2.6, -0.6, -2.2];
  for (const type of Object.keys(K.WAVES)) {
    const wave = K.WAVES[type];
    for (const x of xs) {
      const got = series(type, 300, x, 0.3);
      const want = wave.target(x, 0.3);
      assert.ok(Math.abs(got - want) < 0.02, `${type} at x=${x}: series ${got.toFixed(4)} vs target ${want.toFixed(4)}`);
    }
  }
});

test('Gibbs: the square wave overshoots by ~8.95% of the jump, however many terms', () => {
  for (const N of [20, 80, 200]) {
    let peak = 0;
    for (let i = 1; i <= 400; i++) peak = Math.max(peak, series('square', N, (i / 400) * (Math.PI / N) * 2, 0));
    const overshoot = ((peak - 1) / 2) * 100;          // percent of the jump from −1 to 1
    assert.ok(Math.abs(overshoot - 8.95) < 0.15, `N=${N}: overshoot ${overshoot.toFixed(3)}%`);
  }
});

test('Parseval: square-wave energy in the harmonics adds up to the wave\'s power', () => {
  // mean of f² over a period is 1 for a ±1 square wave; Σ amp²/2 must approach it.
  // terms() stops at n = 400, so the missing tail is (8/π²)·Σ_{odd n>400} 1/n² ≈ 8/(π²·800).
  const energy = K.terms('square', 4000).reduce((sum, h) => sum + (h.amp * h.amp) / 2, 0);
  const tail = 8 / (Math.PI * Math.PI * 800);
  assert.ok(Math.abs(energy + tail - 1) < 1e-5, `Σ amp²/2 = ${energy}, tail ≈ ${tail}`);
});
