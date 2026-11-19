import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { classroomOptions, READABLE_SCALE, MIN_SCALE, MAX_SCALE } from '../assets/js/blockly-classroom.mjs';

test('editors never open below the readable zoom and always get zoom buttons', () => {
  for (const startScale of [undefined, 0.68, 0.72, 0.85]) {
    const out = classroomOptions({ zoom: { controls: false, startScale } }, 'theme');
    assert.equal(out.zoom.controls, true);
    assert.ok(out.zoom.startScale >= READABLE_SCALE, `startScale ${startScale}`);
    assert.ok(out.zoom.minScale >= MIN_SCALE && out.zoom.minScale <= out.zoom.startScale);
    assert.ok(out.zoom.maxScale >= MAX_SCALE);
    assert.equal(out.theme, 'theme');
  }
});

test('fixed-view demos keep their own zoom-button choice', () => {
  assert.equal(classroomOptions({ scrollbars: false, zoom: { controls: false } }).zoom.controls, false);
  assert.equal(classroomOptions({ move: { scrollbars: false } }).zoom.controls, undefined);
});

test('a larger lesson zoom and a lesson theme are kept', () => {
  const out = classroomOptions({ theme: 'own', zoom: { startScale: 1.2, maxScale: 3 } }, 'classroom');
  assert.equal(out.theme, 'own');
  assert.equal(out.zoom.startScale, 1.2);
  assert.equal(out.zoom.maxScale, 3);
});

test('classroom: false opts out untouched', () => {
  const opts = { classroom: false, zoom: { startScale: 0.5 } };
  assert.deepEqual(classroomOptions(opts, 'classroom'), { zoom: { startScale: 0.5 } });
});

test('the vendored Blockly bundle includes the classroom layer', async () => {
  const entry = await readFile(new URL('../scripts/blockly-browser-entry.js', import.meta.url), 'utf8');
  assert.match(entry, /installClassroomBlockly\(/);
  const bundle = await readFile(new URL('../assets/vendor/blockly.min.js', import.meta.url), 'utf8');
  assert.match(bundle, /data-blockly-classroom/, 'run npm run build:blockly');
});
