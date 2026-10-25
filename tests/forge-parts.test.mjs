import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import Module from '../assets/vendor/manifold/manifold.js';
import { createEngine, resolveParams } from '../assets/js/forge/engine.mjs';
import { PARTS, spiralConeMath } from '../assets/js/forge/parts.mjs';
import { centerDistance, spurGearOutline, textOutline } from '../assets/js/forge/outlines.mjs';
import { concat } from '../assets/js/forge/engine.mjs';
import { bounds, edgeReport, prepareForPrint, signedVolume } from '../assets/js/fab-io.mjs';

const font = JSON.parse(await readFile(new URL('../assets/vendor/fonts/droid-sans-bold.typeface.json', import.meta.url), 'utf8'));
const engine = await createEngine(Module, { font });
// forge.html loads the locked-ring maths as a classic script
globalThis.FidgetRings = createRequire(import.meta.url)('../assets/js/lessons/fidget-rings.js');

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
        // nested print-in-place pieces may float inside each other; the group sits on the bed
        if (!r.layout.nested) assert.ok(Math.abs(bounds(b.positions).min[2]) < 1e-3, `${label} / ${b.name}: not on the bed`);
      }
      if (r.layout.nested) assert.ok(Math.abs(bounds(concat(r.bodies.map((b) => b.positions))).min[2]) < 1e-3, `${label}: not on the bed`);
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

test('spiral cone: the pair prints nested without touching, and the cone screws through', () => {
  const { Manifold, CrossSection } = engine.wasm;
  const part = PARTS.find((p) => p.id === 'spiral');
  const p = resolveParams(part, {});
  const built = part.build({ Manifold, CrossSection, settings: { nozzle: 0.4, layer: 0.2, clearance: 0.3 } }, p);
  const outer = built.bodies.find((b) => b.name === 'Outer').manifold;
  const inner = built.bodies.find((b) => b.name === 'Inner').manifold;
  const { rate, tipHeight } = spiralConeMath(p);
  // every manifold made here is tracked by the engine and freed by its next run
  const overlap = (m) => outer.intersect(m).volume();
  assert.ok(overlap(inner) < 0.01, 'as printed, the two pieces must not overlap');
  for (const d of [10, 40, tipHeight - 5]) {
    assert.ok(overlap(inner.translate([0, 0, -d]).rotate([0, 0, -rate * d])) < 0.01, `dropping ${d} mm along the twist must be free`);
  }
  assert.ok(overlap(inner.translate([0, 0, -10])) > 100, 'a straight push must jam, so a push has to turn into spin');
  const nested = engine.run(part, p);
  const apart = engine.run(part, { ...p, arrange: 'apart' });
  assert.ok(nested.layout.nested && nested.layout.size[0] < 85, 'nested pair shares one footprint');
  assert.ok(apart.layout.size[0] > 140, 'apart layout puts the pieces side by side');
});

/* Print-in-place fidgets: the pieces must not touch as printed, the moving
   piece must be free to move the way the toy works, and it must be trapped. */
const SETTINGS = { nozzle: 0.4, layer: 0.2, clearance: 0.3 };
function buildPart(id, given = {}) {
  const { Manifold, CrossSection } = engine.wasm;
  const part = PARTS.find((p) => p.id === id);
  const p = resolveParams(part, given);
  const built = part.build({ Manifold, CrossSection, settings: SETTINGS }, p);
  const body = (name) => built.bodies.find((b) => b.name === name).manifold;
  // every manifold made here is tracked by the engine and freed by its next run
  const overlap = (a, b) => a.intersect(b).volume();
  return { p, built, body, overlap };
}

test('captured spinner: the disc turns in place but cannot lift out of the cup', () => {
  const { body, overlap } = buildPart('captured');
  const cup = body('Cup'), disc = body('Disc');
  assert.ok(overlap(cup, disc) < 0.01, 'as printed, cup and disc must not touch');
  for (const a of [7, 45, 90]) assert.ok(overlap(cup, disc.rotate([0, 0, a])) < 0.01, `turning ${a}° must be free`);
  assert.ok(overlap(cup, disc.translate([0, 0, 3])) > 1, 'lifting the disc must hit the lip');
});

test('fidget spinner: the printed hub spins but is trapped both ways', () => {
  const { body, overlap } = buildPart('spinner');
  const spinner = body('Spinner'), hub = body('Hub');
  assert.ok(overlap(spinner, hub) < 0.01, 'as printed, hub and body must not touch');
  assert.ok(overlap(spinner, hub.rotate([0, 0, 33])) < 0.01, 'turning the hub must be free');
  assert.ok(overlap(spinner, hub.translate([0, 0, 1.5])) > 1, 'pushing the hub up must jam on the ridge');
  assert.ok(overlap(spinner, hub.translate([0, 0, -1.5])) > 1, 'pushing the hub down must jam on the ridge');
});

test('hinge: Leaf B folds flat over Leaf A and partway back, but cannot pull off', () => {
  const { p, body, overlap } = buildPart('hinge');
  const a = body('Leaf A'), b = body('Leaf B');
  assert.ok(overlap(a, b) < 0.01, 'as printed, the leaves must not touch');
  const fold = (deg) => b.translate([0, 0, -p.radius]).rotate([0, deg, 0]).translate([0, 0, p.radius]);
  for (const deg of [-45, -90, -135, -175, 30, 60]) assert.ok(overlap(a, fold(deg)) < 0.01, `folding ${deg}° must be free`);
  assert.ok(overlap(a, fold(120)) > 1, 'folding backwards stops where the leaves meet under the axis');
  assert.ok(overlap(a, b.translate([1.5, 0, 0])) > 0.5, 'pulling the leaves apart must catch on the pins');
});

test('locked star fidget: neighbouring rings never touch at rest, slide within their play, and lock', () => {
  const { p, built, overlap } = buildPart('rings');
  const an = globalThis.FidgetRings.analyze(p);
  assert.ok(an.locked);
  const [inner, next] = built.bodies.map((b) => b.manifold);
  assert.ok(overlap(inner, next) < 0.01, 'as printed, rings 1 and 2 must not touch');
  assert.ok(overlap(inner.translate([0, 0, an.up - 0.2]), next) < 0.01, 'sliding up within the play must be free');
  assert.ok(overlap(inner.translate([0, 0, an.up + 0.5]), next) > 0.5, 'sliding past the play must hit the groove');
});
