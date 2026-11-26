/* drive-parts.mjs — Forge's printable mechanical drives, the hands-on side of
 * lessons/engineering/mechanical-and-civil-design/mechanical-drives.html.
 *
 * Same contract as parts.mjs: plain data + build(ctx, p) → { bodies, verdicts, stats, overhangNote? }.
 * Every gear shares spurGearOutline() (involute) so anything with the same module meshes; threads and the
 * worm use threadSection() with 30° flanks, the steepest a printer can stack (each 0.2 mm layer steps out
 * about 0.35 mm, under one nozzle width), so they print upright with supports off.
 *
 * Not here on purpose: harmonic drives (the flexspline must bend, so it needs TPU and a lot of tuning),
 * belts and chains (buy the belt or chain; pulleys and sprockets are a later addition).
 */

import { centerDistance, spurGearOutline } from './outlines.mjs';
import { cycloidDiscOutline, cycloidLimits, rackOutline, threadSection } from './drive-outlines.mjs';
import {
  BEAM, GEAR_TEETH, LEGO_LABEL, MODULE, STUD, WORM_PITCH_RADIUS, beamHoles, beamSolid, crossHoleSolid, fitParam, gridPartners,
  gridVerdict, isLego, legoTeethParam, metricOnly, pinHoleDiameter, pinHoleSolid, studFit, wallAroundCross,
} from './technic.mjs';

const round = (v, places = 1) => Number(Number(v).toFixed(places));
const DEG = 180 / Math.PI;
/* Angle (deg) for gear B so its gap faces gear A's tooth along +x, as gear A (at angle a) turns. */
const meshAngle = (a, zA, zB) => 180 - 180 / zB - (a * zA) / zB;
const SEG = 64;
const LESSON = { href: 'lessons/engineering/mechanical-and-civil-design/mechanical-drives.html', label: 'Mechanical drives' };
const PLA_FRICTION_DEG = 16.7;   // atan(0.3): PLA sliding on PLA


const moduleSelect = (def, values = ['1.5', '2', '2.5', '3']) => ({
  id: 'module', label: 'Module (tooth size)', type: 'select', default: def,
  options: values.map((v) => ({ value: v, label: `${v} mm` })), help: 'Parts only mesh with parts of the same module.'
});
const boreParam = (def = 5) => ({ id: 'bore', label: 'Bore (axle hole)', type: 'range', min: 3, max: 8, step: 0.5, default: def, unit: 'mm', help: 'A 5 mm bore fits a 5 mm dowel, rod or M5 bolt.' });

function roundedRect(CS, w, d, r) {
  const rr = Math.min(r, w / 2 - 0.05, d / 2 - 0.05);
  if (rr <= 0.05) return CS.square([w, d], true);
  return CS.square([w - 2 * rr, d - 2 * rr], true).offset(rr, 'Round', 2, SEG);
}

function hole(M, r, h, at = [0, 0]) {
  return M.cylinder(h + 2, r, r, 48).translate([at[0], at[1], -1]);
}

/* One gear: outline → extrusion (with optional twist or taper) → bore. */
function gearSolid(ctx, { module: m, teeth, thickness, bore, pressureAngle = 20, twist = 0, scaleTop = 1, extraBacklash = 0, radial = 1 }) {
  const { CrossSection: CS, Manifold: M } = ctx;
  const g = spurGearOutline({ module: m, teeth, pressureAngle, backlash: ctx.settings.clearance / 2 + extraBacklash });
  if (radial !== 1) {
    // stretch tooth depth about the pitch circle, keeping each point's angle
    const rp = g.pitchRadius;
    g.points = g.points.map(([x, y]) => { const r = Math.hypot(x, y), k = (rp + (r - rp) * radial) / r; return [x * k, y * k]; });
    g.tipRadius = rp + (g.tipRadius - rp) * radial;
    g.rootRadius = rp + (g.rootRadius - rp) * radial;
  }
  const divisions = twist ? Math.max(4, Math.ceil(Math.abs(twist) / 2)) : scaleTop !== 1 ? 6 : 0;
  let body = CS.ofPolygons([g.points]).extrude(thickness, divisions, twist, scaleTop === 1 ? [1, 1] : [scaleTop, scaleTop]);
  body = cutAxle(ctx, body, bore, thickness);
  return { body, g };
}

/* Axle hole through a part `h` tall: a round bore (mm), the LEGO cross ('cross'), or none (0). */
function cutAxle(ctx, body, bore, h, at = [0, 0]) {
  if (bore === 'cross') return body.subtract(crossHoleSolid(ctx, h, at));
  return bore > 0 ? body.subtract(hole(ctx.Manifold, bore / 2, h, at)) : body;
}

/* Module, bore and tooth counts for a gear part, from either fit. */
export function legoOr(p, ids) {
  const lego = isLego(p);
  const out = { lego, module: lego ? MODULE : Number(p.module), bore: lego ? 'cross' : p.bore };
  for (const [key, metricId, legoId] of ids) out[key] = lego ? Number(p[legoId]) : p[metricId];
  return out;
}

/* LEGO checks for a gear: the plastic left between the cross hole and the tooth roots. */
export function crossWallCheck(ctx, verdicts, outlines) {
  const root = Math.min(...outlines.map((g) => g.rootRadius));
  const wall = wallAroundCross(root, ctx.settings.clearance);
  if (wall < ctx.settings.nozzle * 2) verdicts.push({ tone: 'warn', tag: 'THIN WALL', text: `Only ${round(wall, 2)} mm of plastic between the cross hole's arms and the tooth roots of the smallest gear. It prints (the real small gears are tight here too), but push the axle in gently.` });
}

/* The LEGO version of a peg board: a printed beam with pin holes on the stud grid and one at exactly the
   pair's centre distance. Real axles turn in its round holes; the gears' cross holes lock them to the axles. */
export function legoBeam(ctx, dist) {
  const xs = beamHoles(dist, 1);
  const beam = beamSolid(ctx, xs);
  beam.x0 = 0;
  beam.top = BEAM.thick + 0.3;
  beam.holes = xs.length;
  return beam;
}

const LEGO_STAT = (dist) => ({ label: 'Centre distance', value: `${round(dist, 2)} mm = ${round(dist / STUD, 3)} studs` });

/* Twist (degrees) across `h` mm for a helix angle measured at the pitch radius. */
const helixTwist = (h, helixDeg, pitchRadius) => (h * Math.tan((helixDeg * Math.PI) / 180) / pitchRadius) * 180 / Math.PI;

function pegBoard(ctx, { dist, rA, rB, height, bore }) {
  const { Manifold: M, CrossSection: CS } = ctx;
  const c = ctx.settings.clearance;
  const plateT = 3, pad = 6;
  const len = dist + rA + rB + 2 * pad, wid = 2 * Math.max(rA, rB) + 2 * pad;
  const x0 = -len / 2 + pad + rA;
  const pegR = bore / 2 - c;
  const peg = (x) => M.cylinder(height + 2, pegR, pegR * 0.8, 40).translate([x, 0, plateT - 0.01]);
  const washer = (x) => M.cylinder(0.6, pegR + 2, pegR + 2, 40).translate([x, 0, plateT - 0.01]);
  const board = M.union([roundedRect(CS, len, wid, 4).extrude(plateT), peg(x0), peg(x0 + dist), washer(x0), washer(x0 + dist)]);
  board.x0 = x0;
  board.top = plateT + 0.6;
  return board;
}

/* Demo for a gear pair (optionally on its peg board): gear A turns once per demo turn. */
function pairDemo(zA, zB, dist, board) {
  const x0 = board ? board.x0 : 0, z = board ? board.top + 0.2 : 0;
  return {
    mode: 'spin', input: 'Turn gear A',
    note: `Gear B turns ${round(zB / zA, 2)} times slower, the other way.`,
    pose(u) {
      const a = 360 * u;
      return [[['z', a], ['t', x0, 0, z]], [['z', meshAngle(a, zA, zB)], ['t', x0 + dist, 0, z]], []];
    },
  };
}

export const SHARP_FIX = (lego) => (lego ? 'Module 1 is the Technic size, so it can\'t grow: print slowly at 0.1 mm layers, or with a 0.25 mm nozzle.' : 'Use a bigger module.');

function toothChecks(ctx, verdicts, outlines, minTeeth, lego = false) {
  const nozzle = ctx.settings.nozzle;
  const thin = Math.min(...outlines.map((g) => g.tipThickness));
  if (thin < nozzle * 1.5) verdicts.push({ tone: 'warn', tag: 'SHARP TEETH', text: `Tooth tips are ${round(thin, 2)} mm wide, under 1.5 nozzle widths, so they print as one wobbly line. ${SHARP_FIX(lego)}` });
  if (minTeeth < 12) verdicts.push({ tone: 'warn', tag: 'UNDERCUT', text: 'Gears under about 12 teeth get thin at the root. They still turn, but go gently.' });
}

const THREAD_NOTE = 'The thread flanks show red because they lean 60° from upright, past the 45° rule of thumb. They are only a millimetre or two deep, and at 30° each 0.2 mm layer steps out about 0.35 mm, less than one nozzle width, so they print cleanly upright. Supports OFF: support inside a thread never comes out.';

/* ── helical and herringbone gears ────────────────────────────────────── */

const helical = {
  id: 'helical',
  name: 'Helical / herringbone gears',
  group: 'Drives',
  blurb: 'A pair of gears with slanted teeth: smoother and quieter than spur gears. Herringbone cancels the side thrust.',
  lesson: LESSON,
  params: [
    fitParam,
    metricOnly(moduleSelect('2')),
    metricOnly({ id: 'teethA', label: 'Teeth on gear A', type: 'range', min: 10, max: 50, step: 1, default: 14 }),
    metricOnly({ id: 'teethB', label: 'Teeth on gear B', type: 'range', min: 10, max: 50, step: 1, default: 28 }),
    legoTeethParam('legoA', 'Teeth on gear A', 12, GEAR_TEETH.filter((z) => z >= 12)),
    legoTeethParam('legoB', 'Teeth on gear B', 20, GEAR_TEETH.filter((z) => z >= 12)),
    { id: 'helix', label: 'Helix angle', type: 'range', min: 10, max: 40, step: 1, default: 20, unit: '°', help: 'Steeper teeth share the load more smoothly but push the gear sideways harder.' },
    { id: 'style', label: 'Style', type: 'select', default: 'herringbone', options: [{ value: 'helical', label: 'Helical (one slant)' }, { value: 'herringbone', label: 'Herringbone (V-shaped, no side thrust)' }] },
    { id: 'thickness', label: 'Gear thickness', type: 'range', min: 6, max: 20, step: 0.5, default: 10, unit: 'mm' },
    metricOnly(boreParam()),
    { id: 'board', label: 'Print a peg board (a beam for the LEGO fit)', type: 'toggle', default: true },
  ],
  build(ctx, p) {
    const L = legoOr(p, [['zA', 'teethA', 'legoA'], ['zB', 'teethB', 'legoB']]);
    const m = L.module, h = p.thickness, zA = L.zA, zB = L.zB;
    const make = (teeth, hand) => {
      const rp = (m * teeth) / 2;
      if (p.style === 'herringbone') {
        const half = gearSolid(ctx, { module: m, teeth, thickness: h / 2, bore: 0, twist: hand * helixTwist(h / 2, p.helix, rp) });
        const body = cutAxle(ctx, half.body.add(half.body.mirror([0, 0, 1]).translate([0, 0, h])), L.bore, h);
        return { body, g: half.g };
      }
      return gearSolid(ctx, { module: m, teeth, thickness: h, bore: L.bore, twist: hand * helixTwist(h, p.helix, rp) });
    };
    // mating helical gears have opposite hands
    const A = make(zA, 1), B = make(zB, -1);
    const dist = centerDistance(m, zA, zB);
    const word = p.style === 'herringbone' ? 'herringbone' : 'helical';
    const bodies = [{ name: `Gear A (${zA} teeth, ${word})`, manifold: A.body }, { name: `Gear B (${zB} teeth, ${word})`, manifold: B.body }];
    const board = !p.board ? null : L.lego ? legoBeam(ctx, dist) : pegBoard(ctx, { dist, rA: A.g.tipRadius, rB: B.g.tipRadius, height: h, bore: p.bore });
    if (board) bodies.push({ name: L.lego ? `Technic-compatible beam (${board.holes} holes)` : 'Peg board', manifold: board });
    const verdicts = [];
    toothChecks(ctx, verdicts, [A.g, B.g], Math.min(zA, zB), L.lego);
    if (L.lego) {
      crossWallCheck(ctx, verdicts, [A.g, B.g]);
      verdicts.push(gridVerdict(dist, 'The centre distance', gridPartners(zA)));
      verdicts.push({ tone: 'ok', tag: 'LEGO FIT', text: `${LEGO_LABEL}: module 1 with cross-axle holes, so the pair drops into a Technic build. Slanted teeth only mesh with another printed gear of the opposite slant, not with a real straight-cut gear.` });
    }
    const thrust = Math.tan((p.helix * Math.PI) / 180);
    verdicts.push(p.style === 'herringbone'
      ? { tone: 'ok', tag: 'NO THRUST', text: 'The two halves slant opposite ways, so their sideways pushes cancel. That is why herringbone gears need no thrust bearing.' }
      : { tone: 'ok', tag: 'SIDE THRUST', text: `Each gear is pushed along its axle with ${round(thrust * 100, 0)} % of the tooth force. Put a washer or collar on the peg to take it.` });
    verdicts.push({ tone: 'ok', tag: 'MESH', text: `Same ${m} mm module (measured across the face), centres ${round(dist, 2)} mm apart, opposite hands. Print flat, no supports.` });
    return {
      bodies, verdicts, demo: pairDemo(zA, zB, dist, board),
      stats: [
        { label: 'Gear ratio', value: `1 : ${round(zB / zA, 2)}` },
        L.lego ? LEGO_STAT(dist) : { label: 'Centre distance', value: `${round(dist, 2)} mm` },
        { label: 'Twist through A', value: `${round(helixTwist(p.style === 'herringbone' ? h / 2 : h, p.helix, A.g.pitchRadius), 1)}°` },
        { label: 'Side thrust', value: p.style === 'herringbone' ? 'cancels' : `${round(thrust * 100, 0)} % of tooth force` },
      ],
    };
  },
};

/* ── bevel gears ──────────────────────────────────────────────────────── */

const bevel = {
  id: 'bevel',
  name: 'Bevel gear pair (90°)',
  group: 'Drives',
  blurb: 'Two cone-shaped gears that turn the drive round a corner. Printed big end down, so no supports.',
  lesson: LESSON,
  params: [
    fitParam,
    metricOnly(moduleSelect('2')),
    metricOnly({ id: 'teethA', label: 'Teeth on the pinion', type: 'range', min: 12, max: 30, step: 1, default: 15 }),
    metricOnly({ id: 'teethB', label: 'Teeth on the gear', type: 'range', min: 12, max: 45, step: 1, default: 30 }),
    legoTeethParam('legoA', 'Teeth on the pinion', 12, [12, 20]),
    legoTeethParam('legoB', 'Teeth on the gear', 20, [12, 20, 36]),
    { id: 'face', label: 'Face width', type: 'range', min: 20, max: 35, step: 1, default: 30, unit: '% of cone', help: 'How far the teeth run toward the cone point. More than about a third makes the small end too fine to print.' },
    { id: 'hub', label: 'Hub height', type: 'range', min: 0, max: 12, step: 0.5, default: 5, unit: 'mm' },
    metricOnly(boreParam()),
  ],
  build(ctx, p) {
    const L = legoOr(p, [['zA', 'teethA', 'legoA'], ['zB', 'teethB', 'legoB']]);
    const m = L.module, zA = L.zA, zB = L.zB;
    const boreR = L.lego ? pinHoleDiameter(ctx.settings.clearance) / 2 : p.bore / 2;
    const deltaA = Math.atan(zA / zB), deltaB = Math.PI / 2 - deltaA;
    const cone = (m * zA) / 2 / Math.sin(deltaA);          // cone distance, the same for both gears
    const faceW = cone * (p.face / 100);
    const scaleTop = 1 - p.face / 100;
    // a hub points at the crossing; where it would reach into the other gear's small end it is cut short
    const hubRFor = (z) => Math.max(boreR + 2, Math.min(((m * z) / 2 - 1.25 * m) * scaleTop - 0.5, boreR + 6));
    const backFace = (z, delta) => (m * z) / 2 / Math.tan(delta);
    const smallFace = (z, delta) => backFace(z, delta) - faceW * Math.cos(delta);
    const smallTipR = (z, delta) => ((m * z) / 2 + m / Math.cos(delta)) * scaleTop;
    const hubFor = (z, delta, zo, deltaO) => (hubRFor(z) + 0.5 < smallFace(zo, deltaO) ? p.hub : Math.min(p.hub, Math.max(0, round(smallFace(z, delta) - smallTipR(zo, deltaO) - 0.5, 1))));
    const make = (teeth, delta, hubLen) => {
      const { Manifold: M } = ctx;
      const h = faceW * Math.cos(delta);
      // tooth depth is measured square to the pitch cone, so seen along the axis it is 1/cos δ deeper
      // (the virtual-gear idea); without this the pinion's tips hit the gear's roots
      const { body, g } = gearSolid(ctx, { module: m, teeth, thickness: h, bore: 0, scaleTop, radial: 1 / Math.cos(delta) });
      const hubR = hubRFor(teeth);
      let solid = body;
      if (hubLen > 0) solid = solid.add(M.cylinder(hubLen + 0.01, hubR, hubR, 48).translate([0, 0, h - 0.01]));
      solid = cutAxle(ctx, solid, L.bore, h + hubLen);
      return { solid, g, h, hubR, hubLen, mount: g.pitchRadius / Math.tan(delta), smallTip: g.tipThickness * scaleTop };
    };
    const A = make(zA, deltaA, hubFor(zA, deltaA, zB, deltaB)), B = make(zB, deltaB, hubFor(zB, deltaB, zA, deltaA));
    const verdicts = [];
    if (p.hub > 0 && Math.min(A.hubLen, B.hubLen) < p.hub) verdicts.push({ tone: 'ok', tag: 'HUB', text: `Hubs cut to ${round(A.hubLen, 1)} / ${round(B.hubLen, 1)} mm so they stop short of the other gear's small end.` });
    if (L.lego) {
      crossWallCheck(ctx, verdicts, [{ rootRadius: A.g.rootRadius * scaleTop }, { rootRadius: B.g.rootRadius * scaleTop }]);
      const studs = (v) => `${round(v, 1)} mm (${round(v / STUD, 2)} studs)`;
      const onGrid = [A.mount, B.mount].every((v) => studFit(v).kind !== 'off');
      verdicts.push({ tone: onGrid ? 'ok' : 'warn', tag: onGrid ? 'ON THE GRID' : 'SPACERS', text: `${LEGO_LABEL}: module 1 and cross-axle holes. Each back face must sit this far from where the axles cross: pinion ${studs(A.mount)}, gear ${studs(B.mount)}. ${onGrid ? 'Both land on half studs, so bushings set them.' : 'Those are not whole or half studs, so pack the gap behind each gear with bushings and a printed washer of the leftover thickness.'} These are printed (Tredgold) bevels: they mesh with each other, not reliably with a real bevel gear.` });
    }
    const nozzle = ctx.settings.nozzle;
    const smallTip = Math.min(A.smallTip, B.smallTip);
    if (smallTip < nozzle * 1.5) verdicts.push({ tone: 'warn', tag: 'SHARP TEETH', text: `At the small end the tooth tips are only ${round(smallTip, 2)} mm wide. ${L.lego ? `Shorten the face width. ${SHARP_FIX(true)}` : 'Shorten the face width or use a bigger module.'}` });
    if (A.hubLen > 0 && A.hubR > A.g.rootRadius * scaleTop) verdicts.push({ tone: 'warn', tag: 'HUB', text: 'The pinion\'s hub is wider than its tooth roots at the small end, so it may rub the other gear. Lower the hub or the bore.' });
    if (!L.lego) verdicts.push({ tone: 'ok', tag: 'MOUNTING', text: `The axles must cross at 90°, and both cone points must meet there: pinion back face ${round(A.mount, 1)} mm from the crossing point, gear back face ${round(B.mount, 1)} mm. These are approximate (Tredgold) teeth: fine for printed models and light loads.` });
    return {
      bodies: [{ name: `Pinion (${zA} teeth)`, manifold: A.solid }, { name: `Gear (${zB} teeth)`, manifold: B.solid }],
      verdicts,
      demo: {
        mode: 'spin', input: 'Turn the pinion', tolerance: 2,
        note: `The gear turns ${round(zB / zA, 2)} times slower, round a 90° corner.`,
        // pinion axis along +x pointing at the shared cone point, gear axis up; both cone points meet
        pose: (u) => [[['z', 360 * u], ['y', 90], ['t', -A.mount, 0, B.mount]], [['z', meshAngle(360 * u, zA, zB)]]],
      },
      stats: [
        { label: 'Gear ratio', value: `1 : ${round(zB / zA, 2)}` },
        { label: 'Cone angles', value: `${round((deltaA * 180) / Math.PI, 1)}° / ${round((deltaB * 180) / Math.PI, 1)}°` },
        { label: 'Back face to axis crossing', value: `${round(A.mount, 1)} / ${round(B.mount, 1)} mm` },
        { label: 'Face width', value: `${round(faceW, 1)} mm` },
      ],
    };
  },
};

/* ── worm and wheel ───────────────────────────────────────────────────── */

const worm = {
  id: 'worm',
  name: 'Worm + worm wheel + frame',
  group: 'Drives',
  blurb: 'A screw that turns a gear one tooth per turn: a 30 : 1 reduction in one step, and it holds its load when you let go.',
  lesson: LESSON,
  params: [
    fitParam,
    metricOnly(moduleSelect('2', ['1.5', '2', '2.5'])),
    metricOnly({ id: 'teeth', label: 'Teeth on the wheel', type: 'range', min: 16, max: 50, step: 1, default: 30 }),
    legoTeethParam('legoTeeth', 'Teeth on the wheel', 24, GEAR_TEETH.filter((z) => z >= 16)),
    { id: 'starts', label: 'Thread starts', type: 'select', default: '1', options: [{ value: '1', label: '1 start (biggest ratio, self-locking)' }, { value: '2', label: '2 starts (twice as fast)' }] },
    { id: 'length', label: 'Worm length', type: 'range', min: 20, max: 60, step: 1, default: 30, unit: 'mm' },
    { id: 'thickness', label: 'Wheel thickness', type: 'range', min: 6, max: 14, step: 0.5, default: 8, unit: 'mm' },
    metricOnly(boreParam()),
    { id: 'frame', label: 'Print a frame (and an axle, for the metric fit)', type: 'toggle', default: true },
  ],
  build(ctx, p) {
    const { Manifold: M, CrossSection: CS } = ctx;
    const c = ctx.settings.clearance;
    const L = legoOr(p, [['teeth', 'teeth', 'legoTeeth']]);
    const m = L.module, starts = Number(p.starts), teeth = L.teeth;
    // LEGO: the worm's pitch circle is fixed by the grid (4 mm, so it meets a 24-tooth gear 2 studs away) and the
    // thread roots are kept a little shallower to leave plastic round the cross hole; the wheel is a plain 20° spur
    // gear like the real ones, so a real worm drives it too
    const rw = L.lego ? WORM_PITCH_RADIUS : Math.max(4 * m, p.bore / 2 + 1.6 + 1.25 * m);     // worm pitch radius
    const lead = Math.PI * m * starts;
    const t = threadSection({ pitchRadius: rw, module: m, lead, starts, pressureAngle: 30, backlash: c / 2, dedendum: L.lego ? 1.15 * m : undefined });
    const wormBody = cutAxle(ctx, CS.ofPolygons([t.points]).extrude(p.length, Math.ceil((p.length / lead) * 36), (360 * p.length) / lead), L.bore, p.length);
    const rpW = (m * teeth) / 2;
    const wheelTwist = L.lego ? 0 : helixTwist(p.thickness, t.leadAngle, rpW);
    const wheel = gearSolid(ctx, { module: m, teeth, thickness: p.thickness, bore: L.bore, pressureAngle: L.lego ? 20 : 30, twist: wheelTwist });
    const dist = rw + rpW;
    const bodies = [{ name: `Worm (${starts} start${starts > 1 ? 's' : ''})`, manifold: wormBody }, { name: `Worm wheel (${teeth} teeth)`, manifold: wheel.body }];
    const holeR = L.lego ? pinHoleDiameter(c) / 2 : p.bore / 2;          // what the frame's walls are sized round
    let frameInfo = null;

    if (p.frame) {
      const plateT = 3, pad = 5, wallT = 4, gap = 1;
      const spacer = Math.max(0.6, t.majorRadius + 1.2 - p.thickness / 2);
      const zc = plateT + spacer + p.thickness / 2;            // shared height of the wheel's mid-plane and the worm axis
      const pegR = L.lego ? holeR : p.bore / 2 - c;
      const yWall = p.length / 2 + gap + wallT / 2;
      const xMin = -(wheel.g.tipRadius + pad), xMax = dist + holeR + 4 + pad;
      const yHalf = Math.max(wheel.g.tipRadius + pad, yWall + wallT / 2 + pad);
      const plate = roundedRect(CS, xMax - xMin, 2 * yHalf, 4).extrude(plateT).translate([(xMin + xMax) / 2, 0, 0]);
      const boss = M.cylinder(spacer + 0.01, pegR + 2.5, pegR + 2.5, 48).translate([0, 0, plateT - 0.01]);
      const wallH = zc + holeR + 4;
      const wallW = 2 * holeR + 8;
      const wall = (y) => M.cube([wallW, wallT, wallH - plateT + 0.01]).translate([dist - wallW / 2, y - wallT / 2, plateT - 0.01]);
      const axleHole = M.cylinder(2 * yHalf + 4, L.lego ? holeR : p.bore / 2 + c, L.lego ? holeR : p.bore / 2 + c, 48).rotate([90, 0, 0]).translate([dist, yHalf + 2, zc]);
      let frame;
      if (L.lego) {
        // real axles: the wheel's turns in a pin hole through the plate and boss, the worm's in the two walls
        frame = M.union([plate, boss, wall(yWall), wall(-yWall)]).subtract(axleHole).subtract(hole(M, holeR, plateT + spacer));
      } else {
        const peg = M.cylinder(spacer + p.thickness + 2, pegR, pegR * 0.85, 40).translate([0, 0, plateT - 0.01]);
        frame = M.union([plate, boss, peg, wall(yWall), wall(-yWall)]).subtract(axleHole);
      }
      bodies.push({ name: 'Frame', manifold: frame });
      const axleLen = 2 * (yWall + wallT / 2) + 6;
      if (!L.lego) bodies.push({ name: 'Worm axle', manifold: M.cylinder(axleLen, p.bore / 2 - c, p.bore / 2 - c, 40) });
      frameInfo = { zc, base: plateT + spacer, axleLen, axle: !L.lego };
    }

    const verdicts = [];
    toothChecks(ctx, verdicts, [wheel.g, { tipThickness: t.tipThickness }], teeth, L.lego);
    if (L.lego) {
      crossWallCheck(ctx, verdicts, [{ rootRadius: rw - 1.15 * m }, wheel.g]);
      verdicts.push(gridVerdict(dist, 'The worm axle to wheel axle distance', GEAR_TEETH.filter((z) => z >= 16 && studFit(rw + z / 2).kind === 'whole'), 'the axles cross that far apart, so standard beams and connectors hold them'));
      verdicts.push({ tone: 'ok', tag: 'LEGO FIT', text: `${LEGO_LABEL}: module 1, cross-axle holes, a ${round(2 * t.majorRadius, 1)} mm worm (real ones are about 9.6 mm). The wheel is a plain 20° gear, so a real worm drives it; the printed worm's 30° thread (for printing upright) drives real gears too, a little less smoothly.${p.frame ? ' The frame takes real axles: no printed axle.' : ''}` });
    }
    const locks = t.leadAngle < PLA_FRICTION_DEG;
    verdicts.push({ tone: 'ok', tag: locks ? 'SELF-LOCKING' : 'BACK-DRIVES', text: locks
      ? `Lead angle ${round(t.leadAngle, 1)}° is under PLA's friction angle (about ${PLA_FRICTION_DEG}°), so turning the wheel by hand will not turn the worm. Try it.`
      : `Lead angle ${round(t.leadAngle, 1)}° is over PLA's friction angle, so the wheel can drive the worm backwards.` });
    if (!L.lego) verdicts.push({ tone: 'ok', tag: 'MESH', text: `Same ${m} mm module, 30° teeth on both, wheel slanted ${round(t.leadAngle, 1)}° to match the thread. Worm axis ${round(dist, 2)} mm from the wheel axis. Print the worm and axle standing up.` });
    const zc = frameInfo ? frameInfo.zc : p.thickness / 2;
    const base = frameInfo ? frameInfo.base : 0;
    const demo = {
      mode: 'spin', input: 'Turn the worm', turns: Math.min(4, teeth / starts), tolerance: 3,
      note: `Each turn of the worm moves the wheel ${starts} tooth${starts > 1 ? 's' : ''}: ${round(teeth / starts, 1)} turns for one turn of the wheel.`,
      pose(u) {
        const th = 2 * Math.PI * u;
        // the thread tooth facing the wheel sits this far along the worm axis
        const yT = (lead * (Math.PI - th)) / (2 * Math.PI) - p.length / 2;
        const phi = (yT / rpW - Math.PI / teeth) * DEG - wheelTwist / 2;
        const out = [
          [['z', th * DEG], ['x', -90], ['t', dist, -p.length / 2, zc]],
          [['z', phi], ['t', 0, 0, base]],
        ];
        if (frameInfo) out.push([]);
        if (frameInfo?.axle) out.push([['z', th * DEG], ['x', -90], ['t', dist, -frameInfo.axleLen / 2, zc]]);
        return out;
      },
    };
    return {
      bodies, verdicts, overhangNote: THREAD_NOTE, demo,
      stats: [
        { label: 'Ratio', value: `${round(teeth / starts, 1)} : 1` },
        { label: 'Lead / lead angle', value: `${round(lead, 2)} mm / ${round(t.leadAngle, 1)}°` },
        L.lego ? LEGO_STAT(dist) : { label: 'Centre distance', value: `${round(dist, 2)} mm` },
        { label: 'Worm Ø (outside)', value: `${round(2 * t.majorRadius, 1)} mm` },
      ],
    };
  },
};

/* ── planetary gearset ────────────────────────────────────────────────── */

const planetary = {
  id: 'planetary',
  name: 'Planetary gearset',
  group: 'Drives',
  blurb: 'Sun, three planets, a ring with inside teeth and a carrier. Hold any one part and you get a different ratio.',
  lesson: LESSON,
  params: [
    moduleSelect('1.5', ['1', '1.5', '2']),
    { id: 'sun', label: 'Teeth on the sun', type: 'range', min: 9, max: 30, step: 3, default: 12 },
    { id: 'planet', label: 'Teeth on each planet', type: 'range', min: 9, max: 30, step: 3, default: 18, help: 'Multiples of 3 keep the three planets evenly spaced. The ring gets sun + 2 × planet teeth.' },
    { id: 'thickness', label: 'Gear thickness', type: 'range', min: 5, max: 15, step: 0.5, default: 8, unit: 'mm' },
    { id: 'rim', label: 'Ring rim', type: 'range', min: 3, max: 8, step: 0.5, default: 4, unit: 'mm', kind: 'wall' },
    boreParam(),
  ],
  build(ctx, p) {
    const { Manifold: M, CrossSection: CS } = ctx;
    const c = ctx.settings.clearance;
    const m = Number(p.module), h = p.thickness;
    const zr = p.sun + 2 * p.planet;
    const sun = gearSolid(ctx, { module: m, teeth: p.sun, thickness: h, bore: p.bore });
    const planetRoot = (m * p.planet) / 2 - 1.25 * m;
    const planetBore = Math.min(p.bore, 2 * (planetRoot - 1.2));
    const planet = gearSolid(ctx, { module: m, teeth: p.planet, thickness: h, bore: planetBore });
    // ring: a disc minus a slightly fat external gear of the ring's tooth count, and its tip circle
    const ringOutline = spurGearOutline({ module: m, teeth: zr, backlash: 0 });
    const rpR = (m * zr) / 2;
    const outerR = rpR + 1.25 * m + p.rim;
    const cut = CS.ofPolygons([ringOutline.points]).offset(c / 2, 'Round', 2, 8).add(CS.circle(rpR - m, 128));
    const ring = CS.circle(outerR, 160).subtract(cut).extrude(h);
    // carrier: a plate with three pegs for the planets and the sun's bore through the middle
    const orbit = (m * (p.sun + p.planet)) / 2;
    const pegR = planetBore / 2 - c;
    const plateT = 3;
    const carrierR = orbit + pegR + 3.5;
    let carrier = CS.circle(carrierR, 96).extrude(plateT);
    for (let i = 0; i < 3; i++) {
      const a = (i * 2 * Math.PI) / 3;
      carrier = carrier.add(M.cylinder(h + 1, pegR, pegR * 0.85, 40).translate([orbit * Math.cos(a), orbit * Math.sin(a), plateT - 0.01]));
    }
    carrier = carrier.subtract(hole(M, p.bore / 2 + c, plateT));
    const bodies = [
      { name: `Sun (${p.sun} teeth)`, manifold: sun.body },
      { name: `Planet 1 (${p.planet} teeth)`, manifold: planet.body },
      { name: `Planet 2 (${p.planet} teeth)`, manifold: planet.body.translate([0, 0, 0]) },
      { name: `Planet 3 (${p.planet} teeth)`, manifold: planet.body.translate([0, 0, 0]) },
      { name: `Ring (${zr} teeth inside)`, manifold: ring },
      { name: 'Carrier with 3 pegs', manifold: carrier },
    ];
    const verdicts = [];
    toothChecks(ctx, verdicts, [sun.g, planet.g], Math.min(p.sun, p.planet));
    if (pegR < 1.2) verdicts.push({ tone: 'bad', tag: 'PEGS', text: `The planets are too small for a strong peg (${round(2 * pegR, 1)} mm). Give the planets more teeth or use a bigger module.` });
    else if (planetBore < p.bore) verdicts.push({ tone: 'warn', tag: 'PLANET BORE', text: `Planet holes shrunk to ${round(planetBore, 1)} mm so the teeth keep enough material. The carrier pegs match.` });
    verdicts.push({ tone: 'ok', tag: 'ASSEMBLE', text: 'Drop the sun in the ring\'s centre, slot the three planets in between, then press the carrier pegs into the planets. A dab of grease helps.' });
    const r = (x) => `${round(x, 2)} : 1`;
    const zs = p.sun, zp = p.planet;
    const demo = {
      mode: 'spin', input: 'Turn the sun (ring held)', turns: 1 + zr / zs,
      ghost: [5],                      // the carrier sits on top; show it see-through so the planets show
      note: `The carrier makes one turn for every ${round(1 + zr / zs, 2)} turns of the sun.`,
      pose(u) {
        const ts = 2 * Math.PI * u, tc = (ts * zs) / (zs + zr);
        const planets = [0, 1, 2].map((i) => {
          const al = tc + (i * 2 * Math.PI) / 3;
          const tp = al + Math.PI - ((2 * Math.PI) / zp) * (0.5 - (zs * (al - ts)) / (2 * Math.PI));
          return { al, tp };
        });
        const q0 = (zp * (planets[0].al - planets[0].tp)) / (2 * Math.PI);
        // the ring is cut with an external gear's outline, so its gaps sit where that outline has teeth
        const tr = planets[0].al - ((2 * Math.PI) / zr) * q0;
        return [
          [['z', ts * DEG]],
          ...planets.map(({ al, tp }) => [['z', tp * DEG], ['t', orbit * Math.cos(al), orbit * Math.sin(al), 0]]),
          [['z', tr * DEG]],
          [['x', 180], ['z', tc * DEG], ['t', 0, 0, h + plateT + 0.3]],
        ];
      },
    };
    return {
      bodies, verdicts, demo,
      stats: [
        { label: 'Ring held (sun in → carrier out)', value: r(1 + zr / p.sun) },
        { label: 'Sun held (ring in → carrier out)', value: r(1 + p.sun / zr) },
        { label: 'Carrier held (sun in → ring out)', value: `${r(zr / p.sun)}, reversed` },
        { label: 'Ring outside Ø', value: `${round(2 * outerR, 1)} mm` },
      ],
    };
  },
};

/* ── rack and pinion ──────────────────────────────────────────────────── */

const rack = {
  id: 'rack',
  name: 'Rack and pinion',
  group: 'Drives',
  blurb: 'A gear rolling along a toothed bar turns spin into a straight push, like a car\'s steering.',
  lesson: LESSON,
  params: [
    fitParam,
    metricOnly(moduleSelect('2')),
    metricOnly({ id: 'pinion', label: 'Teeth on the pinion', type: 'range', min: 10, max: 30, step: 1, default: 16 }),
    legoTeethParam('legoPinion', 'Teeth on the pinion', 16, GEAR_TEETH.filter((z) => z >= 12)),
    { id: 'rackTeeth', label: 'Teeth on the rack', type: 'range', min: 8, max: 40, step: 1, default: 18 },
    { id: 'thickness', label: 'Thickness', type: 'range', min: 5, max: 12, step: 0.5, default: 8, unit: 'mm', help: 'For the LEGO fit this is the pinion; the rack is always one beam thick.' },
    metricOnly(boreParam()),
  ],
  build(ctx, p) {
    const { CrossSection: CS, Manifold: M } = ctx;
    const L = legoOr(p, [['pinion', 'pinion', 'legoPinion']]);
    const m = L.module, zP = L.pinion;
    const rp = (m * zP) / 2;
    // LEGO: a row of pin holes half a stud above the rack's bottom edge, like a beam, and the bar made just tall
    // enough that the pinion's axle sits a whole or half number of studs above that row
    let base = Math.max(4, 2 * m), holeLine = null;
    if (L.lego) {
      const minBase = 4 + pinHoleDiameter(ctx.settings.clearance) / 2 + 1.2;                // hole + 1.2 mm wall under the tooth roots
      const above = (b) => b + 1.25 * m - 4 + rp;                                            // hole row to pinion axle
      const half = STUD / 2;
      base = Math.max(minBase, Math.ceil((above(minBase) - 1e-6) / half) * half - (1.25 * m - 4 + rp));
      holeLine = 4;
    }
    const r = rackOutline({ module: m, teeth: p.rackTeeth, backlash: ctx.settings.clearance / 2, base });
    const barT = L.lego ? BEAM.thick : p.thickness;
    let bar = CS.ofPolygons([r.points]).extrude(barT);
    let rackHoles = 0;
    if (L.lego) {
      // the outline's bottom edge is at y = -pitchLineAboveBase; holes every stud along it
      const y = -r.pitchLineAboveBase + holeLine;
      const xs = [];
      for (let x = STUD / 2; x <= r.length - STUD / 2 + 1e-6; x += STUD) xs.push(x);
      if (xs.length) bar = bar.subtract(M.union(xs.map((x) => pinHoleSolid(ctx, barT, [x, y]))));
      rackHoles = xs.length;
    }
    const pinion = gearSolid(ctx, { module: m, teeth: zP, thickness: p.thickness, bore: L.bore });
    const perTurn = Math.PI * m * zP;
    const verdicts = [];
    toothChecks(ctx, verdicts, [pinion.g, r], zP, L.lego);
    const axleAbove = pinion.g.pitchRadius + r.pitchLineAboveBase;
    if (L.lego) {
      crossWallCheck(ctx, verdicts, [pinion.g]);
      verdicts.push(gridVerdict(axleAbove - holeLine, "The pinion's axle above the rack's row of holes", null, 'a beam pinned to the rack carries the pinion\'s axle'));
      verdicts.push({ tone: 'ok', tag: 'LEGO FIT', text: `${LEGO_LABEL}: module 1, so the rack takes real Technic gears and the pinion runs on a real rack. ${rackHoles} pin hole${rackHoles === 1 ? '' : 's'} on the stud grid bolt the rack to beams; the axle sits ${round(axleAbove, 2)} mm above the rack's bottom edge.` });
    } else {
      verdicts.push({ tone: 'ok', tag: 'MESH', text: `Same ${m} mm module. Put the pinion's axle ${round(axleAbove, 2)} mm above the rack's bottom edge. Print both flat.` });
    }
    const X = -(Math.floor(p.rackTeeth / 2) + 0.5) * r.pitch;
    const thMax = Math.max(0.2, (r.length / 2 - 1.5 * r.pitch) / rp);
    return {
      bodies: [{ name: `Pinion (${zP} teeth)`, manifold: pinion.body }, { name: `Rack (${p.rackTeeth} teeth)`, manifold: bar }],
      verdicts,
      demo: {
        mode: 'swing', input: 'Turn the pinion back and forth',
        note: `Every turn slides the rack ${round(perTurn, 1)} mm.`,
        pose(u) {
          const th = thMax * u;
          return [[['z', (-Math.PI / 2 + Math.PI / zP + th) * DEG], ['t', 0, rp, 0]], [['t', X + rp * th, 0, 0]]];
        },
      },
      stats: [
        { label: 'Rack travel per pinion turn', value: `${round(perTurn, 1)} mm` },
        { label: 'Rack length', value: `${round(r.length, 1)} mm` },
        { label: 'Full travel', value: `${round(r.length / perTurn, 2)} turns` },
        { label: 'Axle above rack base', value: `${round(axleAbove, 2)} mm` },
      ],
    };
  },
};

/* ── cycloidal drive ──────────────────────────────────────────────────── */

const cycloidal = {
  id: 'cycloidal',
  name: 'Cycloidal drive',
  group: 'Drives',
  blurb: 'An eccentric cam wobbles a lobed disc round a ring of pins: one lobe per wobble, so 11 lobes is 11 : 1.',
  lesson: LESSON,
  params: [
    { id: 'lobes', label: 'Lobes on the disc', type: 'range', min: 7, max: 23, step: 1, default: 11, help: 'The ratio. The housing gets one more pin than the disc has lobes.' },
    { id: 'radius', label: 'Pin circle radius', type: 'range', min: 20, max: 45, step: 0.5, default: 30, unit: 'mm' },
    { id: 'ecc', label: 'Wobble (eccentricity)', type: 'range', min: 30, max: 100, step: 5, default: 70, unit: '% of max', help: 'More wobble makes deeper lobes that grip better but shake more.' },
    { id: 'pin', label: 'Pin size', type: 'range', min: 40, max: 100, step: 5, default: 70, unit: '% of max' },
    { id: 'thickness', label: 'Disc thickness', type: 'range', min: 4, max: 10, step: 0.5, default: 6, unit: 'mm' },
    boreParam(),
  ],
  build(ctx, p) {
    const { Manifold: M, CrossSection: CS } = ctx;
    const c = ctx.settings.clearance;
    const N = p.lobes + 1, R = p.radius;
    const lim = cycloidLimits({ pinCircleRadius: R, pins: N });
    const e = lim.maxEccentricity * (p.ecc / 100);
    const Rr = lim.maxPinRadius * (p.pin / 100);
    const plateT = 3;
    // disc profile drawn for pins a little fatter than real, which leaves clearance all round
    const disc0 = cycloidDiscOutline({ pinCircleRadius: R, pinRadius: Rr + c / 2, eccentricity: e, pins: N });
    const rMin = Math.min(...disc0.points.map(([x, y]) => Math.hypot(x, y)));
    const camR = p.bore / 2 + e + 2.4;
    const inner = camR + c + 1.4, outer = rMin - 1.4;
    const K = 6;
    const Rh = (inner + outer) / 2;
    const holeR = Math.max(0.5, Math.min((outer - inner) / 2, Rh * Math.sin(Math.PI / K) - 0.8));
    const outPinR = Math.min(4, holeR - e - c / 2);
    let discCS = CS.ofPolygons([disc0.points]).subtract(CS.circle(camR + c, 64));
    for (let k = 0; k < K; k++) {
      const a = (k * 2 * Math.PI) / K;
      discCS = discCS.subtract(CS.circle(Math.min(holeR, outPinR + e + c / 2), 48).translate([Rh * Math.cos(a), Rh * Math.sin(a)]));
    }
    const disc = discCS.extrude(p.thickness);
    // housing: a plate with the ring of pins
    let housing = CS.circle(R + Rr + 6, 128).subtract(CS.circle(p.bore / 2 + c, 48)).extrude(plateT);
    for (let k = 0; k < N; k++) {
      const a = (k * 2 * Math.PI) / N;
      housing = housing.add(M.cylinder(p.thickness + 0.3, Rr, Rr, 32).translate([R * Math.cos(a), R * Math.sin(a), plateT - 0.01]));
    }
    // eccentric cam: the disc spins on it, the input axle goes through it e off-centre
    const cam = CS.circle(camR, 64).subtract(CS.circle(p.bore / 2, 48).translate([-e, 0])).extrude(p.thickness);
    // output plate: pins that ride in the disc's holes
    const outR = Rh + Math.max(outPinR, 1) + 4;
    let output = CS.circle(outR, 96).subtract(CS.circle(p.bore / 2 + c, 48)).extrude(plateT);
    if (outPinR >= 1) {
      for (let k = 0; k < K; k++) {
        const a = (k * 2 * Math.PI) / K;
        output = output.add(M.cylinder(p.thickness, outPinR, outPinR, 32).translate([Rh * Math.cos(a), Rh * Math.sin(a), plateT - 0.01]));
      }
    }
    const verdicts = [];
    if (outPinR < 1.5) verdicts.push({ tone: 'bad', tag: 'OUTPUT PINS', text: `There is only room for ${round(2 * Math.max(outPinR, 0), 1)} mm output pins. Use a bigger pin circle, less wobble or a smaller bore.` });
    verdicts.push({ tone: 'ok', tag: 'BALANCE', text: 'One disc wobbles, so it shakes at speed. Real drives stack two discs 180° apart; print a second disc and cam and fit it turned half a turn.' });
    verdicts.push({ tone: 'ok', tag: 'ASSEMBLE', text: 'Housing pins up, then the disc over the pins, the cam inside the disc on the input axle, and the output plate pins-down into the disc holes. The output turns the opposite way to the input.' });
    return {
      bodies: [
        { name: `Housing (${N} pins)`, manifold: housing },
        { name: `Cycloid disc (${p.lobes} lobes)`, manifold: disc },
        { name: 'Eccentric cam', manifold: cam },
        { name: `Output plate (${K} pins)`, manifold: output },
      ],
      verdicts,
      demo: {
        mode: 'spin', input: 'Turn the cam', turns: p.lobes,
        ghost: [3],
        note: `The output turns once, backwards, for every ${p.lobes} turns of the cam.`,
        pose(u) {
          const te = 360 * u, rot = -te / p.lobes, ex = (e * Math.cos((te * Math.PI) / 180)), ey = (e * Math.sin((te * Math.PI) / 180));
          const z = plateT + 0.3;
          return [
            [],
            [['z', rot], ['t', ex, ey, z]],
            [['t', e, 0, 0], ['z', te], ['t', 0, 0, z]],
            [['x', 180], ['z', rot], ['t', 0, 0, z + p.thickness + 0.3 + plateT]],
          ];
        },
      },
      stats: [
        { label: 'Ratio', value: `${p.lobes} : 1, reversed` },
        { label: 'Eccentricity', value: `${round(e, 2)} mm` },
        { label: 'Housing pin Ø', value: `${round(2 * Rr, 1)} mm` },
        { label: 'Output pin Ø', value: `${round(2 * Math.max(outPinR, 0), 1)} mm` },
      ],
    };
  },
};

/* ── leadscrew and nut ────────────────────────────────────────────────── */

const leadscrew = {
  id: 'leadscrew',
  name: 'Leadscrew + nut',
  group: 'Drives',
  blurb: 'A printable threaded rod and nut. Fine threads hold a load with the power off; coarse ones move faster.',
  lesson: LESSON,
  params: [
    { id: 'diameter', label: 'Screw diameter', type: 'range', min: 10, max: 24, step: 1, default: 14, unit: 'mm' },
    { id: 'pitch', label: 'Thread pitch', type: 'range', min: 3, max: 8, step: 0.5, default: 4, unit: 'mm', help: 'Distance between neighbouring threads. Under 3 mm the teeth get too small to print well.' },
    { id: 'starts', label: 'Thread starts', type: 'select', default: '1', options: [{ value: '1', label: '1 start' }, { value: '2', label: '2 starts (lead = 2 × pitch)' }, { value: '3', label: '3 starts (lead = 3 × pitch)' }] },
    { id: 'length', label: 'Screw length', type: 'range', min: 30, max: 120, step: 1, default: 60, unit: 'mm' },
    { id: 'nutLength', label: 'Nut length', type: 'range', min: 8, max: 30, step: 1, default: 14, unit: 'mm' },
    { id: 'knob', label: 'Knob on the end', type: 'toggle', default: true },
  ],
  build(ctx, p) {
    const { Manifold: M, CrossSection: CS } = ctx;
    const c = ctx.settings.clearance;
    const starts = Number(p.starts), lead = p.pitch * starts;
    const depth = 0.35 * p.pitch;
    const rp = p.diameter / 2 - depth / 2;
    const spec = { pitchRadius: rp, module: 0, lead, starts, pressureAngle: 30, addendum: depth / 2, dedendum: depth / 2 };
    const t = threadSection({ ...spec, backlash: c / 2 });
    const twistPerMm = 360 / lead;
    const knobH = p.knob ? 6 : 0;
    let screw = CS.ofPolygons([t.points]).extrude(p.length, Math.ceil((p.length / lead) * 36), twistPerMm * p.length).translate([0, 0, knobH]);
    if (p.knob) {
      const knobR = p.diameter / 2 + 6;
      let knob = CS.circle(knobR, 64);
      for (let k = 0; k < 12; k++) { const a = (k * 2 * Math.PI) / 12; knob = knob.subtract(CS.circle(1.6, 16).translate([knobR * Math.cos(a), knobR * Math.sin(a)])); }
      screw = screw.add(knob.extrude(knobH + 0.01));
    }
    // nut: a hexagon with the screw's own thread cut through it, grown by the clearance
    const across = p.diameter + 10;
    const hex = CS.circle(across / Math.sqrt(3), 6);
    const cutSection = CS.ofPolygons([threadSection({ ...spec, backlash: 0 }).points]).offset(c, 'Round', 2, 8);
    const cutLen = p.nutLength + 2;
    const nutCut = cutSection.extrude(cutLen, Math.ceil((cutLen / lead) * 36), twistPerMm * cutLen).translate([0, 0, -1]);
    const nut = hex.extrude(p.nutLength).subtract(nutCut);
    const lam = t.leadAngle;
    const verdicts = [];
    if (t.tipThickness < ctx.settings.nozzle * 1.5) verdicts.push({ tone: 'warn', tag: 'SHARP THREAD', text: `Thread tips are ${round(t.tipThickness, 2)} mm wide. Use a coarser pitch.` });
    verdicts.push({ tone: 'ok', tag: lam < PLA_FRICTION_DEG ? 'SELF-LOCKING' : 'BACK-DRIVES', text: lam < PLA_FRICTION_DEG
      ? `Lead angle ${round(lam, 1)}° is under PLA's friction angle (about ${PLA_FRICTION_DEG}°): push on the nut and the screw will not turn. It holds a load with no motor.`
      : `Lead angle ${round(lam, 1)}° is over PLA's friction angle: push hard on the nut and the screw spins. Fast, but it needs a brake to hold a load.` });
    verdicts.push({ tone: 'ok', tag: 'FIT', text: `The nut's thread is ${c} mm bigger all round (your class clearance). If it binds, raise the clearance in settings and reprint just the nut.` });
    const span = Math.max(1, p.length - p.nutLength - 2);
    return {
      bodies: [{ name: `Leadscrew Ø${p.diameter} × ${p.length}`, manifold: screw }, { name: 'Hex nut', manifold: nut }],
      verdicts, overhangNote: THREAD_NOTE,
      demo: {
        mode: 'swing', input: 'Turn the screw', tolerance: 2,
        note: `The nut rides ${round(lead, 1)} mm per turn without turning itself.`,
        pose(u) {
          const rise = (span / 2) * (1 + u);                 // how far up the nut has gone
          const turnDeg = -rise * twistPerMm;               // the screw turns; the nut only climbs
          return [[['z', turnDeg]], [['t', 0, 0, knobH + 1 + rise]]];
        },
      },
      stats: [
        { label: 'Lead (travel per turn)', value: `${round(lead, 1)} mm` },
        { label: 'Lead angle', value: `${round(lam, 1)}°` },
        { label: 'Full travel', value: `${round(Math.max(0, p.length - p.nutLength) / lead, 1)} turns` },
        { label: 'Thread depth', value: `${round(depth, 2)} mm` },
      ],
    };
  },
};

/* ── LEGO Technic-compatible beam ─────────────────────────────────────── */

const technicBeam = {
  id: 'technic-beam',
  name: 'Technic-compatible beam',
  group: 'Drives',
  blurb: 'A straight beam with pin holes every 8 mm, sized to take real LEGO Technic pins and axles, to hold printed gears at stud spacing.',
  lesson: LESSON,
  params: [
    { id: 'holes', label: 'Holes', type: 'range', min: 2, max: 15, step: 1, default: 7 },
    { id: 'thick', label: 'Thickness', type: 'select', default: 'full', options: [{ value: 'full', label: `Full (${BEAM.thick} mm, one stud)` }, { value: 'thin', label: `Thin (${BEAM.thick / 2} mm, half)` }] },
    { id: 'ends', label: 'End holes', type: 'select', default: 'round', options: [{ value: 'round', label: 'Round pin holes (axles turn)' }, { value: 'cross', label: 'Cross-axle holes (axles locked)' }] },
    { id: 'gap', label: 'Second-axle offset', type: 'range', min: 0, max: 4, step: 0.5, default: 0, unit: 'mm', help: 'Moves the last hole this much further out, for a gear pair that sits half a stud off the grid (0 = all on the grid).' },
  ],
  build(ctx, p) {
    const thick = p.thick === 'thin' ? BEAM.thick / 2 : BEAM.thick;
    const xs = Array.from({ length: p.holes }, (_, i) => i * STUD);
    if (p.gap > 0) xs[xs.length - 1] += p.gap;
    const cross = p.ends === 'cross' ? [0, xs.length - 1] : [];
    const beam = beamSolid(ctx, xs, { thick, cross });
    const span = xs[xs.length - 1] - xs[0];
    return {
      bodies: [{ name: `Beam (${p.holes} holes)`, manifold: beam }],
      verdicts: [
        { tone: 'ok', tag: 'LEGO FIT', text: `${LEGO_LABEL}: pin holes ${round(pinHoleDiameter(ctx.settings.clearance), 2)} mm across (4.8 mm nominal plus a quarter of your clearance a side) with collar recesses${thick < BEAM.thick ? ' left off on a thin beam' : ''}, every ${STUD} mm. Print flat: the holes stand upright, so they come out round.` },
        gridVerdict(span, 'First hole to last hole', null, 'every hole lines up with a standard beam'),
      ],
      stats: [
        { label: 'Length', value: `${round(span + BEAM.width, 1)} mm` },
        { label: 'Hole pitch', value: `${STUD} mm` },
        { label: 'Pin hole', value: `${round(pinHoleDiameter(ctx.settings.clearance), 2)} mm` },
        { label: 'Thickness', value: `${thick} mm` },
      ],
    };
  },
};

export const DRIVE_PARTS = [helical, bevel, worm, planetary, rack, cycloidal, leadscrew, technicBeam];
