import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS, DIRECTIONS, createProject, validateProject, demoFrame, flood, transform, frameAt, clipMetadata, face } from '../assets/js/lessons/sprite-studio/model.mjs';

test('all camera / resolution examples round-trip every pose and timing', () => {
  for (const view of ['side', 'top']) for (const size of [16, 32]) {
    const project = createProject(view, size);
    assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))), project);
    assert.equal(Object.keys(project.clips).length, Object.keys(ACTIONS).length * DIRECTIONS[view].length);
    for (const [key, clip] of Object.entries(project.clips)) {
      assert.ok(new Set(clip.frames.map(f => f.pixels)).size > 1, `${key} needs distinct poses`);
      for (const f of clip.frames) assert.match(f.pixels, new RegExp(`^[0-9a-f]{${size ** 2}}$`));
    }
  }
});
test('imports reject invalid sizes, timing, palettes and missing directions', () => {
  const corruptions = [p => { p.size = 1024; }, p => { p.view = '__proto__'; }, p => { p.palette[1] = 'url(https://example.com)'; }, p => { p.clips['idle-right'].frames[0].pixels = 'f'; }, p => { p.clips['idle-right'].frames[0].ms = 0; }, p => { p.clips['idle-right'].frames[0].ms = NaN; }, p => { delete p.clips['idle-left']; }, p => { p.clips['idle-right'].frames = Array(25).fill(p.clips['idle-right'].frames[0]); }];
  for (const mutate of corruptions) { const p = createProject(); mutate(p); assert.throws(() => validateProject(p)); }
});
test('fill stays within connected regions and transforms crop predictably', () => {
  const pixels = '1000100010001000';
  assert.equal(flood(pixels, 4, 1, 1, 'a'), '1aaa1aaa1aaa1aaa');
  assert.equal(transform(transform(pixels, 4, 'flip'), 4, 'flip'), pixels);
  assert.equal(transform(pixels, 4, 'left'), '0'.repeat(16));
  assert.equal(transform(pixels, 4, 'right'), '0100010001000100');
});
test('variable timing honours boundaries, looping and held final poses', () => {
  const clip = { loop: false, frames: [{ ms: 70 }, { ms: 180 }, { ms: 600 }] };
  assert.equal(frameAt(clip, 69), 0); assert.equal(frameAt(clip, 70), 1);
  assert.equal(frameAt(clip, 249), 1); assert.equal(frameAt(clip, 250), 2);
  assert.equal(frameAt(clip, 9000), 2);
  clip.loop = true; assert.equal(frameAt(clip, 850), 0); assert.equal(frameAt(clip, 920), 1);
});
test('export rectangles and pose descriptions match each native strip', () => {
  const p = createProject('top', 32), meta = clipMetadata(p, 'sword', 'up');
  assert.equal(meta.image, 'sword-up.png'); assert.equal(meta.loop, false);
  assert.equal(meta.frames[2].x, 64); assert.equal(meta.frames[2].width, 32);
  assert.equal(meta.frames[2].durationMs, p.clips['sword-up'].frames[2].ms);
  assert.equal(meta.frames[2].description, 'Fast slash');
});
test('face stamps leave back views untouched and preserve non-face art', () => {
  const p = demoFrame('idle', 'up', 0);
  assert.equal(face(p, 16, 'worried', 'up'), p);
  const front = demoFrame('idle', 'down', 0), worried = face(front, 16, 'worried');
  assert.equal(worried.slice(128), front.slice(128)); assert.notEqual(worried, front);
});
