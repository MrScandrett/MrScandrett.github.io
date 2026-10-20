import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { measure, normalizeGain } = createRequire(import.meta.url)('../assets/js/music-daw-loudness.js');

test('a 1 kHz sine at -18 dBFS in both channels reads about -18 LUFS', () => {
  // EBU Tech 3341: a 997 Hz sine peaking at -18 dBFS in both channels measures -18 LUFS.
  const sr = 48000, amp = Math.pow(10, -18 / 20);
  const tone = Float32Array.from({ length: sr * 3 }, (_, i) => amp * Math.sin(2 * Math.PI * 997 * i / sr));
  const { lufs } = measure([tone, tone], sr);
  assert.ok(Math.abs(lufs + 18) < 0.2, `lufs ${lufs}`);
});

test('normalize gain respects the peak ceiling', () => {
  assert.ok(Math.abs(20 * Math.log10(normalizeGain({ lufs: -20, peakDb: -10 }, -14, -1)) - 6) < 1e-9);
  assert.ok(Math.abs(20 * Math.log10(normalizeGain({ lufs: -20, peakDb: -3 }, -14, -1)) - 2) < 1e-9);
  assert.equal(normalizeGain({ lufs: -Infinity, peakDb: -Infinity }), 1);
});
