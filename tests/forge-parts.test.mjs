import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Module from '../assets/vendor/manifold/manifold.js';
import { createEngine, resolveParams } from '../assets/js/forge/engine.mjs';
import { PARTS } from '../assets/js/forge/parts.mjs';
import { centerDistance, spurGearOutline, textOutline } from '../assets/js/forge/outlines.mjs';
import { concat } from '../assets/js/forge/engine.mjs';
import { bounds, edgeReport, prepareForPrint, signedVolume } from '../assets/js/fab-io.mjs';

const font = JSON.parse(await readFile(new URL('../assets/vendor/fonts/droid-sans-bold.typeface.json', import.meta.url), 'utf8'));
const engine = await createEngine(Module, { font });

/* Defaults, every range at its min and at its max, and every select option. */
function variants(part) {
  const base = resolveParams(part, {});
  const out = [['defaults', base]];
  for (const spec of part.params) {
    if (spec.type === 'range') {
      out.push([`${spec.id}=min`, { ...base, [spec.id]: spec.min }]);
      out.push([`${spec.id}=max`, { ...base, [spec.id]: spec.max }]);
    } else if (spec.type === 'select') {
      for (const o of spec.options) out.push([`${spec.id}=${o.value}`, { ...base, [spec.id]: o.value }]);
    } else if (spec.type === 'toggle') {
      out.push([`${spec.id}=${!base[spec.id]}`, { ...base, [spec.id]: !base[spec.id] }]);
    } else if (spec.type === 'text') {
      out.push([`${spec.id}=empty`, { ...base, [spec.id]: '' }]);
    }
  }
  return out;
}

for (const part of PARTS) {
  test(`${part.name}: every variant builds a closed, outward-facing solid on the bed`, () => {
    for (const [label, params] of variants(part)) {
      const r = engine.run(part, params);
      assert.equal(r.error, undefined, `${label}: ${r.error}`);
      assert.ok(r.bodies.length > 0, `${label}: no bodies`);
      for (const b of r.bodies) {
        const report = edgeReport(b.positions);
        assert.ok(report.watertight, `${label} / ${b.name}: ${JSON.stringify(report)}`);
        assert.ok(signedVolume(b.positions) > 0, `${label} / ${b.name}: inside out`);
        assert.ok(Math.abs(bounds(b.positions).min[2]) < 1e-3, `${label} / ${b.name}: not on the bed`);
      }
      assert.ok(r.verdicts.some((v) => v.tag === 'FITS' || v.tag === 'TOO BIG'), `${label}: no bed check`);
    }
  });
}

test('default parts all fit the MakerBot Sketch Large and need no supports', () => {
  for (const part of PARTS) {
    const r = engine.run(part, {});
    const tags = r.verdicts.map((v) => v.tag);
    assert.ok(tags.includes('FITS'), `${part.id}: ${tags}`);
    assert.ok(!tags.includes('NEEDS SUPPORTS'), `${part.id}: ${JSON.stringify(r.verdicts.find((v) => v.tag === 'NEEDS SUPPORTS'))}`);
    assert.ok(!r.verdicts.some((v) => v.tone === 'bad'), `${part.id} default has a red verdict: ${JSON.stringify(r.verdicts.filter((v) => v.tone === 'bad'))}`);
  }
});

test('the layout keeps bodies apart and the whole plate prepares into a valid STL mesh', () => {
  const r = engine.run(PARTS.find((p) => p.id === 'case'), {});
  const [a, b] = r.bodies.map((x) => bounds(x.positions));
  assert.ok(a.max[0] < b.min[0] || b.max[0] < a.min[0] || a.max[1] < b.min[1] || b.max[1] < a.min[1], 'case and lid overlap');
  const plate = prepareForPrint(concat(r.bodies.map((x) => x.positions)), { yUp: false });
  assert.ok(edgeReport(plate).watertight);
});

test('engine clamps hand-edited params to the declared ranges', () => {
  const box = PARTS.find((p) => p.id === 'box');
  const p = resolveParams(box, { wall: -5, w: 9999, dividers: 'lots' });
  assert.equal(p.wall, 0.8);
  assert.equal(p.w, 240);
  assert.equal(p.dividers, 2);
});

test('gear outline: right pitch, centre distance, and backlash thins the teeth', () => {
  const g = spurGearOutline({ module: 2, teeth: 20 });
  assert.equal(g.pitchRadius, 20);
  assert.equal(g.tipRadius, 22);
  assert.equal(centerDistance(2, 12, 24), 36);
  const loose = spurGearOutline({ module: 2, teeth: 20, backlash: 0.2 });
  assert.ok(loose.toothThickness < g.toothThickness);
  const maxR = Math.max(...g.points.map(([x, y]) => Math.hypot(x, y)));
  assert.ok(Math.abs(maxR - 22) < 1e-9);
});

test('text outline is sized by cap height and keeps letter holes', () => {
  const t = textOutline(font, 'O', 10);
  assert.equal(t.contours.length, 2, 'outer ring and the hole of the O');
  const ys = t.contours.flat().map(([, y]) => y);
  assert.ok(Math.max(...ys) > 9.5 && Math.max(...ys) < 10.8, `cap height ${Math.max(...ys)}`);
});
