/* LEGO Technic-compatible option in Forge: the sizes in technic.mjs, and every gear-type part built with
   fit = 'lego' (cross-axle holes, module 1, the standard tooth counts, centres on the 8 mm stud grid). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Module from '../assets/vendor/manifold/manifold.js';
import { createEngine, resolveParams } from '../assets/js/forge/engine.mjs';
import { partById } from '../assets/js/forge/parts.mjs';
import { spurGearOutline } from '../assets/js/forge/outlines.mjs';
import { edgeReport, signedVolume, bounds } from '../assets/js/fab-io.mjs';
import {
  AXLE, BEAM, COUNTERBORE, GEAR_TEETH, MODULE, PIN_HOLE, STUD, beamHoles, crossAxleOutline, gridPartners, gridVerdict,
  pinHoleDiameter, studFit,
} from '../assets/js/forge/technic.mjs';

const font = JSON.parse(await readFile(new URL('../assets/vendor/fonts/droid-sans-bold.typeface.json', import.meta.url), 'utf8'));
const engine = await createEngine(Module, { font });
const SETTINGS = { nozzle: 0.4, layer: 0.2, clearance: 0.3 };

test('the published Technic sizes', () => {
  // Cailliau: 8.0 mm pitch, 4.8 mm axle, 6.2 × 0.8 mm counterbore, beams 7.4–7.8 mm
  assert.equal(STUD, 8);
  assert.equal(PIN_HOLE, 4.8);
  assert.equal(AXLE.across, 4.8);
  assert.ok(AXLE.arm >= 1.79 && AXLE.arm <= 1.83);
  assert.deepEqual(COUNTERBORE, { d: 6.2, depth: 0.8 });
  assert.ok(BEAM.width >= 7.4 && BEAM.width <= 7.8);
  // BrickNerd: pitch radius = teeth / 16 studs, so module 1
  assert.equal(MODULE, 1);
  for (const z of GEAR_TEETH) assert.equal(spurGearOutline({ module: MODULE, teeth: z }).pitchRadius, (z / 16) * STUD);
  assert.deepEqual(GEAR_TEETH, [8, 12, 16, 20, 24, 36, 40]);
});

test('holes are grown by the class clearance', () => {
  assert.equal(pinHoleDiameter(0.3), 4.95);
  const pts = crossAxleOutline(0.3);
  const xs = pts.map(([x]) => x), ys = pts.map(([, y]) => y);
  assert.ok(Math.abs(Math.max(...xs) - Math.min(...xs) - 4.95) < 1e-9, 'tip to tip');
  assert.ok(Math.abs(Math.max(...ys) - Math.min(...ys) - 4.95) < 1e-9);
  const arm = pts.filter(([x]) => x > 2).map(([, y]) => y);
  assert.ok(Math.abs(Math.max(...arm) - Math.min(...arm) - 1.95) < 1e-9, 'arm width');
});

test('stud grid: whole, half and off', () => {
  assert.equal(studFit(16).kind, 'whole');
  assert.equal(studFit(12).kind, 'half');
  assert.equal(studFit(18).kind, 'off');
  // BrickNerd's pairs: 8 + 24 and 12 + 20 two studs, 16 + 16 two, 24 + 40 four; 16 + 24 is 2.5
  for (const [a, b, studs] of [[8, 24, 2], [12, 20, 2], [16, 16, 2], [24, 40, 4], [16, 24, 2.5], [16, 8, 1.5]]) {
    assert.equal(studFit((a + b) / 2).studs, studs, `${a} + ${b}`);
  }
  assert.deepEqual(gridPartners(8), [8, 24, 40]);
  assert.deepEqual(gridPartners(12), [20, 36]);
  assert.equal(gridVerdict(16, 'x').tag, 'ON THE GRID');
  assert.equal(gridVerdict(12, 'x').tag, 'HALF STUD');
  assert.equal(gridVerdict(18, 'x').tone, 'warn');
});

test('beam holes: the grid plus the second axle, never closer than they can print', () => {
  assert.deepEqual(beamHoles(16), [-8, 0, 8, 16, 24]);
  assert.deepEqual(beamHoles(12), [-8, 0, 12, 20]);
  for (const d of [10, 12, 14, 16, 18, 20, 22, 24, 32]) {
    const xs = beamHoles(d);
    assert.ok(xs.includes(0) && xs.includes(d), `${d}: both axles get a hole`);
    for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] >= 7, `${d}: holes ${xs[i - 1]} and ${xs[i]} merge`);
  }
});

/* Every gear-type part with fit = 'lego': defaults, each LEGO tooth option, and each other range at its ends. */
const LEGO_PARTS = ['gears', 'helical', 'bevel', 'worm', 'rack'];
function legoVariants(part) {
  const base = resolveParams(part, { fit: 'lego' });
  const out = [['lego defaults', base]];
  for (const spec of part.params) {
    if (spec.id === 'fit' || (spec.showIf && !spec.showIf(base))) continue;
    if (spec.type === 'select') for (const o of spec.options) out.push([`${spec.id}=${o.value}`, { ...base, [spec.id]: o.value }]);
    else if (spec.type === 'range') out.push([`${spec.id}=min`, { ...base, [spec.id]: spec.min }], [`${spec.id}=max`, { ...base, [spec.id]: spec.max }]);
    else if (spec.type === 'toggle') out.push([`${spec.id}=${!base[spec.id]}`, { ...base, [spec.id]: !base[spec.id] }]);
  }
  return out;
}

for (const id of LEGO_PARTS) {
  test(`${id} (LEGO fit): every variant builds closed solids on the bed, and the defaults fit with no supports`, () => {
    for (const [label, params] of legoVariants(partById(id))) {
      const r = engine.run(partById(id), params);
      assert.equal(r.error, undefined, `${label}: ${r.error}`);
      for (const b of r.bodies) {
        assert.ok(edgeReport(b.positions).watertight, `${label} / ${b.name}`);
        assert.ok(signedVolume(b.positions) > 0, `${label} / ${b.name}: inside out`);
        assert.ok(Math.abs(bounds(b.positions).min[2]) < 1e-3, `${label} / ${b.name}: not on the bed`);
      }
      assert.ok(r.verdicts.some((v) => v.tag === 'LEGO FIT' || v.tag === 'ON THE GRID' || v.tag === 'SPACERS'), `${label}: no LEGO verdict`);
    }
    const r = engine.run(partById(id), { fit: 'lego' });
    const tags = r.verdicts.map((v) => v.tag);
    assert.ok(tags.includes('FITS'), `${id}: ${tags}`);
    assert.ok(!tags.includes('NEEDS SUPPORTS'), `${id}: needs supports`);
    assert.ok(!r.verdicts.some((v) => v.tone === 'bad'), `${id}: ${JSON.stringify(r.verdicts.filter((v) => v.tone === 'bad'))}`);
  });

  test(`${id} (LEGO fit): the demo runs without pieces overlapping`, () => {
    const r = engine.demoCheck(partById(id), { fit: 'lego' }, {}, 12);
    assert.equal(r.error, undefined, r.error);
    assert.equal(r.worst, null, r.worst && `${r.worst.a} hits ${r.worst.b} (${r.worst.volume.toFixed(2)} mm³ at u = ${r.worst.u.toFixed(2)})`);
  });
}

test('LEGO gear pairs mesh at every standard size, and the spur pair sits on the grid by default', () => {
  for (const [a, b] of [['8', '40'], ['12', '20'], ['16', '16'], ['36', '12'], ['24', '24']]) {
    const r = engine.demoCheck(partById('gears'), { fit: 'lego', legoA: a, legoB: b }, {}, 8);
    assert.equal(r.worst, null, `${a} + ${b}: ${r.worst && `${r.worst.a} × ${r.worst.b}`}`);
  }
  const r = engine.run(partById('gears'), { fit: 'lego' });
  assert.ok(r.verdicts.some((v) => v.tag === 'ON THE GRID'), '12 + 20 is two studs');
  assert.ok(engine.run(partById('gears'), { fit: 'lego', legoA: '12', legoB: '24' }).verdicts.some((v) => v.tag === 'OFF THE GRID'));
  for (const teeth of ['16', '24', '40']) {
    const w = engine.demoCheck(partById('worm'), { fit: 'lego', legoTeeth: teeth }, {}, 8);
    assert.equal(w.worst, null, `worm + ${teeth}: ${w.worst && `${w.worst.a} × ${w.worst.b} ${w.worst.volume.toFixed(2)}`}`);
  }
});

/* Build a part's raw manifolds (no layout) to probe the holes. */
function built(id, given) {
  const { Manifold, CrossSection } = engine.wasm;
  const part = partById(id);
  const ctx = { Manifold, CrossSection, settings: SETTINGS, track: (m) => m };
  return { M: Manifold, CS: CrossSection, out: part.build(ctx, resolveParams(part, given)) };
}

test('a real cross axle slides into the printed gear, and nothing fatter does', () => {
  const { M, CS, out } = built('gears', { fit: 'lego' });
  const gear = out.bodies[0].manifold;
  const cross = (across, arm) => {
    const a = across / 2, w = arm / 2;
    return CS.ofPolygons([[[a, -w], [a, w], [w, w], [w, a], [-w, a], [-w, w], [-a, w], [-a, -w], [-w, -w], [-w, -a], [w, -a], [w, -w]]]).extrude(40).translate([0, 0, -10]);
  };
  assert.ok(gear.intersect(cross(AXLE.across, AXLE.arm)).volume() < 1e-6, 'a 4.8 mm axle fits');
  assert.ok(gear.intersect(cross(AXLE.across + 0.3, AXLE.arm + 0.3)).volume() > 0.1, 'the hole grips: an axle 0.3 mm fatter would not go in');
  assert.ok(gear.intersect(M.cylinder(40, 2.4, 2.4, 48).translate([0, 0, -10])).volume() > 0.1, 'the hole is a cross, not round');
});

test('the printed beam: 4.8 mm pins go through every 8 mm, centred', () => {
  const { M, out } = built('technic-beam', { holes: 5 });
  const beam = out.bodies[0].manifold;
  const pin = (x, r = PIN_HOLE / 2) => M.cylinder(40, r, r, 48).translate([x, 0, -10]);
  for (let k = 0; k < 5; k++) assert.ok(beam.intersect(pin(k * STUD)).volume() < 1e-6, `pin ${k} fits`);
  assert.ok(beam.intersect(pin(STUD + 0.3)).volume() > 0.1, 'a hole 0.3 mm off the grid would not take the pin');
  const b = beam.boundingBox();
  assert.ok(Math.abs(b.max[2] - b.min[2] - BEAM.thick) < 1e-6);
  assert.ok(Math.abs(b.max[1] - b.min[1] - BEAM.width) < 0.05);
  // collar recess at the top of each hole
  assert.ok(beam.intersect(M.cylinder(COUNTERBORE.depth - 0.05, COUNTERBORE.d / 2, COUNTERBORE.d / 2, 48).translate([0, 0, BEAM.thick - COUNTERBORE.depth + 0.02])).volume() < 1e-6);
});

test('the gear-pair beam puts holes at both gear centres', () => {
  const { M, out } = built('gears', { fit: 'lego', legoA: '16', legoB: '8' });   // 1.5 studs
  const beam = out.bodies[2].manifold;
  for (const x of [0, 12]) assert.ok(beam.intersect(M.cylinder(40, 2.4, 2.4, 48).translate([x, 0, -10])).volume() < 1e-6, `axle at ${x}`);
});

test('LEGO rack: the pinion axle sits a whole or half number of studs above the rack\'s holes', () => {
  for (const z of ['12', '16', '20', '24', '36', '40']) {
    const r = engine.run(partById('rack'), { fit: 'lego', legoPinion: z });
    const grid = r.verdicts.find((v) => v.tag === 'ON THE GRID' || v.tag === 'HALF STUD');
    assert.ok(grid, `${z}: ${r.verdicts.map((v) => v.tag)}`);
  }
});
