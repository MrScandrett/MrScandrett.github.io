/* Forge's Demonstrate button: every part with moving pieces describes how they assemble and move
   (build(...).demo), and engine.demoCheck() moves the real solids through that motion looking for
   overlaps. Defaults must run free; a design that binds must be caught. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import Module from '../assets/vendor/manifold/manifold.js';
import { createEngine } from '../assets/js/forge/engine.mjs';
import { PARTS, partById } from '../assets/js/forge/parts.mjs';

const font = JSON.parse(await readFile(new URL('../assets/vendor/fonts/droid-sans-bold.typeface.json', import.meta.url), 'utf8'));
const engine = await createEngine(Module, { font });
globalThis.FidgetRings = createRequire(import.meta.url)('../assets/js/lessons/fidget-rings.js');

const MOVING = ['wheel-axle', 'captured', 'spinner', 'hinge', 'rings', 'gears', 'helical', 'bevel', 'worm', 'planetary', 'rack', 'cycloidal', 'leadscrew', 'spiral'];

test('every part with moving pieces has a demo with one pose per body', () => {
  for (const id of MOVING) {
    const r = engine.run(partById(id), {});
    assert.ok(r.demo, `${id} has no demo`);
    assert.ok(['spin', 'swing'].includes(r.demo.mode), id);
    assert.ok(r.demo.input && r.demo.note, `${id} demo needs an input label and a note`);
    for (const u of [0, 0.37, -0.6, 1]) {
      const pose = r.demo.pose(u);
      assert.equal(pose.length, r.bodies.length, `${id}: pose for each body`);
      for (const ops of pose) for (const op of ops) assert.ok(['x', 'y', 'z', 't'].includes(op[0]) && op.slice(1).every((v) => Array.isArray(v) || Number.isFinite(v)), `${id}: bad op ${JSON.stringify(op)}`);
    }
    for (const b of r.bodies) assert.equal(b.offset.length, 3, `${id}: layout offset recorded`);
  }
});

for (const id of MOVING) {
  test(`${id}: the default design moves through its whole demo without pieces overlapping`, () => {
    const r = engine.demoCheck(partById(id), {}, {}, 12);
    assert.equal(r.error, undefined, r.error);
    assert.equal(r.worst, null, r.worst && `${r.worst.a} hits ${r.worst.b} (${r.worst.volume.toFixed(2)} mm³ at u = ${r.worst.u.toFixed(2)})`);
  });
}

test('drive gears still mesh at the ends of their ranges', () => {
  const cases = [
    ['planetary', { sun: 9, planet: 30 }], ['planetary', { sun: 30, planet: 9, module: '1' }],
    ['bevel', { teethA: 12, teethB: 45 }], ['bevel', { teethA: 30, teethB: 12 }],
    ['helical', { teethA: 10, teethB: 50, style: 'helical' }], ['rack', { pinion: 30, rackTeeth: 8 }],
    ['cycloidal', { lobes: 23, ecc: 100, pin: 100 }], ['cycloidal', { lobes: 7, ecc: 30 }],
  ];
  for (const [id, p] of cases) {
    const r = engine.demoCheck(partById(id), p, {}, 8);
    assert.equal(r.worst, null, `${id} ${JSON.stringify(p)}: ${r.worst && `${r.worst.a} × ${r.worst.b} ${r.worst.volume.toFixed(2)} mm³`}`);
  }
});

test('the check catches a design that binds', () => {
  // leaves thicker than the knuckles crash into each other before folding flat
  const r = engine.demoCheck(partById('hinge'), { thick: 3, radius: 2.5 }, {}, 12);
  assert.ok(r.worst, 'a hinge with fat leaves should collide when folded');
});

test('non-moving parts have no demo', () => {
  for (const part of PARTS) if (!MOVING.includes(part.id) && part.id !== 'rolling-tool') assert.equal(engine.run(part, {}).demo, null, part.id);
});
