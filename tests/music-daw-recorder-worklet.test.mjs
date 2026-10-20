import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { captureFrames } = require('../assets/js/music-daw-audio.js');

function loadProcessor() {
  const posted = [];
  let Processor;
  const ctx = {
    currentFrame: 0,
    AudioWorkletProcessor: class { constructor() { this.port = { postMessage: (m) => posted.push(m) }; } },
    registerProcessor: (_n, cls) => { Processor = cls; },
  };
  vm.runInNewContext(fs.readFileSync(new URL('../assets/js/music-daw-recorder.worklet.js', import.meta.url), 'utf8'), ctx);
  return { proc: new Processor(), posted, ctx };
}

test('recorder batches blocks, keeps frames contiguous and flushes the tail on stop', () => {
  const { proc, posted, ctx } = loadProcessor();
  proc.port.onmessage({ data: 'start' });
  const blocks = 20;
  for (let b = 0; b < blocks; b++) {
    ctx.currentFrame = b * 128;
    proc.process([[new Float32Array(128).fill(b), new Float32Array(128).fill(-b)]]);
  }
  proc.port.onmessage({ data: 'stop' });
  const chunks = posted.filter((m) => m.channels);
  assert.ok(chunks.length < blocks / 4, 'messages are batched');
  assert.equal(posted.at(-1).stopped, true);
  const result = captureFrames(chunks);
  assert.equal(result.length, blocks * 128);
  assert.equal(result.droppedFrames, 0);
  assert.equal(result.channelCount, 2);
  const out = [new Float32Array(result.length), new Float32Array(result.length)];
  captureFrames(chunks, out);
  assert.equal(out[0][19 * 128 + 5], 19);
  assert.equal(out[1][3 * 128], -3);
});
