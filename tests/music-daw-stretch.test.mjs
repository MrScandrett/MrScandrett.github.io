import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { stretchChannels, pitchShiftChannels } = createRequire(import.meta.url)('../assets/js/music-daw-stretch.js');

const sr = 22050;
const tone = (hz, sec) => Float32Array.from({ length: Math.round(sr * sec) }, (_, i) => Math.sin(2 * Math.PI * hz * i / sr));
// Autocorrelation pitch estimate (first peak, parabolic refinement) over the middle.
function pitchOf(d) {
  const a = Math.floor(d.length * .3), n = Math.min(4000, d.length - a - 400);
  const r = (L) => { let s = 0; for (let i = 0; i < n; i++) s += d[a + i] * d[a + i + L]; return s; };
  const vals = []; for (let L = 0; L < 400; L++) vals.push(r(L));
  let L = 1; while (L < 399 && vals[L] <= vals[L - 1]) L++;        // past the zero-lag lobe
  let best = L; for (; L < 399; L++) { if (vals[L] > vals[best]) best = L; if (vals[L] < 0 && vals[best] > 0.8 * vals[0]) break; }
  const [y0, y1, y2] = [vals[best - 1], vals[best], vals[best + 1]];
  return sr / (best + (y0 - y2) / (2 * (y0 - 2 * y1 + y2)));
}

test('stretch changes length but keeps pitch', () => {
  const [slow] = stretchChannels([tone(440, 1)], 1.5, sr);
  assert.ok(Math.abs(slow.length - sr * 1.5) < 2);
  assert.ok(Math.abs(pitchOf(slow) - 440) < 0.03 * 440, `pitch ${pitchOf(slow)}`);
  const [fast] = stretchChannels([tone(440, 1)], 0.6, sr);
  assert.ok(Math.abs(pitchOf(fast) - 440) < 0.03 * 440, `pitch ${pitchOf(fast)}`);
});

test('pitch shift changes pitch but keeps length', () => {
  const [up] = pitchShiftChannels([tone(440, 1)], 12, sr);
  assert.ok(Math.abs(up.length - sr) < 4);
  assert.ok(Math.abs(pitchOf(up) - 880) < 0.03 * 880, `pitch ${pitchOf(up)}`);
  const [down] = pitchShiftChannels([tone(440, 1)], -5, sr);
  assert.ok(Math.abs(pitchOf(down) - 440 * Math.pow(2, -5 / 12)) < 0.03 * 440, `pitch ${pitchOf(down)}`);
});
