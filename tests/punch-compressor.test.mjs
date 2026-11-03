import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { Processor, normalize, reduction } = createRequire(import.meta.url)('../assets/js/punch-compressor-dsp.js');
const sr = 48000;
function tone(db, seconds = 1) {
  return Float32Array.from({ length: sr * seconds }, (_, i) => Math.SQRT2 * 10 ** (db / 20) * Math.sin(2 * Math.PI * 1000 * i / sr));
}
function rms(data, start = 0) { return Math.sqrt(data.slice(start).reduce((sum, v) => sum + v * v, 0) / (data.length - start)); }
function render(input, params) {
  const processor = new Processor(sr), output = input.map(channel => new Float32Array(channel.length));
  processor.process(input, output, normalize(params));
  return { processor, output };
}
test('hard knee follows threshold and ratio; soft knee is continuous', () => {
  const p = normalize({ threshold: -24, ratio: 4 });
  assert.equal(reduction(-30, p), 0);
  assert.equal(reduction(-24, p), 0);
  assert.equal(reduction(-12, p), 9);
  p.knee = 6;
  assert.equal(reduction(-27, p), 0);
  assert.equal(reduction(-21, p), 2.25);
  let last = 0;
  for (let level = -30; level < -18; level += .01) {
    const next = reduction(level, p);
    assert.ok(next >= last && next - last < .008);
    last = next;
  }
});
test('RMS gain reduction matches the curve and output gain', () => {
  const input = tone(-12), { processor, output } = render([input], { threshold: -24, ratio: 4, output: 3 });
  const change = 20 * Math.log10(rms(output[0], sr / 2) / rms(input, sr / 2));
  assert.ok(Math.abs(change + 6) < .1, `expected -6 dB within detector ripple, got ${change}`);
  assert.ok(Math.abs(processor.reduction - 9) < .1);
});
test('unity ratio passes samples unchanged; both stereo channels share gain', () => {
  const left = tone(-10), right = Float32Array.from(left, v => -v / 4);
  const unity = render([left, right], { ratio: 1 });
  assert.deepEqual(unity.output, [left, right]);
  const compressed = render([left, right], { threshold: -24, ratio: 6 });
  assert.ok(compressed.processor.reduction > 11);
  for (let i = sr / 2; i < sr; i++) assert.equal(compressed.output[1][i], -compressed.output[0][i] / 4);
});
test('silence stays finite and releases; parameter bounds reject corrupt values', () => {
  const processor = new Processor(sr), p = normalize({ threshold: -24, ratio: 4 });
  processor.process([tone(-6)], [new Float32Array(sr)], p);
  assert.ok(processor.reduction > 13);
  const silence = new Float32Array(sr * 3), output = new Float32Array(silence.length);
  processor.process([silence], [output], p);
  assert.ok(processor.reduction < .001);
  assert.ok(output.every(v => v === 0));
  assert.deepEqual(normalize({ threshold: -Infinity, ratio: 100, knee: -8, output: 'bad' }), { threshold: -24, ratio: 20, output: 0, knee: 0 });
});
