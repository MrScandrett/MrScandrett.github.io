import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('ClassroomAnimations only requests frames while an animation is queued', () => {
  let now = 0;
  const frames = [];
  const ctx = {
    performance: { now: () => now },
    requestAnimationFrame: (cb) => { frames.push(cb); return frames.length; },
    document: { readyState: 'complete', addEventListener() {} },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('assets/js/classroom-animations.js', 'utf8'), ctx);
  const step = () => { now += 17; const due = frames.splice(0); due.forEach((cb) => cb(now)); return due.length; };

  assert.equal(frames.length, 0, 'init with nothing to animate requests no frame');

  const seen = [];
  let done = false;
  ctx.ClassroomAnimations.animate('fade', (eased, raw) => seen.push(raw), 100, 'linear', () => { done = true; });
  assert.equal(frames.length, 1);
  while (step()) { /* run to completion */ }
  assert.ok(done, 'animation completed');
  assert.ok(seen[0] > 0 && seen[0] < 0.3, `first step is about one frame, got ${seen[0]}`);
  assert.equal(frames.length, 0, 'loop stops once the queue is empty');

  now += 60000;
  ctx.ClassroomAnimations.animate('again', (eased, raw) => seen.push(raw), 100);
  step();
  assert.ok(seen.at(-1) < 0.3, 'an idle gap does not count as animation time');
});
