/* parts.mjs — Forge's parametric part library.
 *
 * Every part is plain data plus a build function:
 *
 *   { id, name, group, blurb, lesson?: { href, label },
 *     params: [{ id, label, type: 'range'|'select'|'toggle'|'text', ...,
 *                kind?: 'wall', showIf?: (p) => boolean, help? }],
 *     build(ctx, p) → { bodies: [{ name, manifold }], verdicts?, stats?, overhangNote? } }
 *
 * ctx = { Manifold, CrossSection, font, settings: { clearance, layer, nozzle }, printer }.
 * Units are millimetres, Z is up, and each body is built resting on Z = 0 the
 * way it should sit on the print bed. engine.mjs lays the bodies out, checks
 * walls, overhangs and bed fit for every part, and frees the WebAssembly
 * objects, so parts only describe shape and their own design rules.
 */

import { centerDistance, spurGearOutline, supportedText, textOutline } from './outlines.mjs';

const round = (v, places = 1) => Number(Number(v).toFixed(places));
const SEG = 64;

/* ── shared shape helpers ─────────────────────────────────────────────── */

function roundedRect(CS, w, d, r) {
  const rr = Math.min(r, w / 2 - 0.05, d / 2 - 0.05);
  if (rr <= 0.05) return CS.square([w, d], true);
  return CS.square([w - 2 * rr, d - 2 * rr], true).offset(rr, 'Round', 2, SEG);
}

function bar(CS, [ax, ay], [bx, by], width) {
  const r = width / 2;
  return CS.hull([CS.circle(r, 32).translate([ax, ay]), CS.circle(r, 32).translate([bx, by])]);
}

/* Text as a solid `height` tall, centred on the origin in X/Y. */
function textSolid(ctx, text, size, height) {
  const { contours, width } = textOutline(ctx.font, text, size);
  if (!contours.length) return null;
  // A tiny grow merges letters whose outlines touch at one point (W–A, R–A),
  // which would otherwise leave a pinched edge slicers reject; simplify then
  // drops the near-duplicate corners the grow itself leaves behind.
  const section = ctx.CrossSection.ofPolygons(contours, 'EvenOdd').offset(0.02, 'Round', 2, 8).simplify(0.005).translate([-width / 2, -size / 2]);
  return { solid: section.extrude(height), width };
}

/* An open-top box with a lid that drops in on an inner lip. Shared by the
   storage box and the electronics case. Inner sizes are the usable space. */
function boxWithLid(ctx, { innerW, innerD, innerH, wall, floor, radius, lipH, lipW = 1.6 }) {
  const { CrossSection: CS } = ctx;
  const c = ctx.settings.clearance;
  const outerW = innerW + 2 * wall, outerD = innerD + 2 * wall;
  const outer = roundedRect(CS, outerW, outerD, radius).extrude(floor + innerH);
  const cavity = roundedRect(CS, innerW, innerD, Math.max(radius - wall, 0.5)).extrude(innerH + 1).translate([0, 0, floor]);
  const box = outer.subtract(cavity);

  const plate = roundedRect(CS, outerW, outerD, radius).extrude(wall);
  const lipOuter = roundedRect(CS, innerW - 2 * c, innerD - 2 * c, Math.max(radius - wall - c, 0.5));
  const lipInner = roundedRect(CS, innerW - 2 * c - 2 * lipW, innerD - 2 * c - 2 * lipW, Math.max(radius - wall - c - lipW, 0.3));
  const lip = lipOuter.subtract(lipInner).extrude(lipH).translate([0, 0, wall - 0.01]);
  return { box, lid: plate.add(lip), outerW, outerD, lipW };
}

function lidVents(ctx, lidSpan, wall) {
  const { Manifold: M } = ctx;
  const [w, d] = lidSpan;
  const pitch = 5, slot = 2;
  const count = Math.max(1, Math.floor((w * 0.6) / pitch));
  const cutters = [];
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * pitch;
    cutters.push(M.cube([slot, d * 0.5, wall + 2], true).translate([x, 0, wall / 2]));
  }
  return M.union(cutters);
}

/* ── boards for the electronics case ──────────────────────────────────── */
/* Board origin is the corner by the power jack; X runs along the long edge
   away from the USB/power end, Y across. Mounting holes and connector
   positions follow Arduino's published UNO drawing. Ports sit on the X = 0
   edge and are measured from the PCB's top surface. */
export const BOARDS = {
  'uno-r3': {
    label: 'Arduino UNO R3', w: 68.6, d: 53.3, pcb: 1.6,
    holes: [[13.97, 2.54], [15.24, 50.8], [66.04, 7.62], [66.04, 35.56]],
    ports: [{ name: 'USB-B', center: 35.9, width: 12.0, height: 10.9 }, { name: 'power jack', center: 8.1, width: 9.0, height: 10.9 }],
    parts: 'four M3 × 6 mm screws',
  },
  'uno-r4': {
    label: 'Arduino UNO R4 WiFi / Minima', w: 68.6, d: 53.3, pcb: 1.6,
    holes: [[13.97, 2.54], [15.24, 50.8], [66.04, 7.62], [66.04, 35.56]],
    ports: [{ name: 'USB-C plug', center: 35.9, width: 12.0, height: 7.5 }, { name: 'power jack', center: 8.1, width: 9.0, height: 10.9 }],
    parts: 'four M3 × 6 mm screws',
  },
  'half-breadboard': {
    label: 'Half-size breadboard', w: 82.5, d: 54.6, pcb: 8.5, holes: [], ports: [],
    parts: 'the breadboard\'s own sticky back',
  },
  custom: { label: 'Custom board (measure it)', holes: [], ports: [] },
};

/* ── the parts ────────────────────────────────────────────────────────── */

const caseCase = {
  id: 'case',
  name: 'Electronics case',
  group: 'Electronics housings',
  blurb: 'A screw-down case and drop-in lid for an Arduino or breadboard, with openings where the cables plug in.',
  lesson: { href: 'lessons/engineering/arduino-and-electronics/arduino-choosing-your-board.html', label: 'Choosing your board' },
  params: [
    { id: 'board', label: 'Board', type: 'select', default: 'uno-r3', options: Object.entries(BOARDS).map(([value, b]) => ({ value, label: b.label })) },
    { id: 'customW', label: 'Board length', type: 'range', min: 20, max: 160, step: 0.5, default: 60, unit: 'mm', showIf: (p) => p.board === 'custom', help: 'Measure the long edge with calipers.' },
    { id: 'customD', label: 'Board width', type: 'range', min: 15, max: 120, step: 0.5, default: 40, unit: 'mm', showIf: (p) => p.board === 'custom' },
    { id: 'headroom', label: 'Space above the board', type: 'range', min: 6, max: 50, step: 1, default: 16, unit: 'mm', help: 'Tallest part on the board (or wires) plus room for the lid lip.' },
    { id: 'margin', label: 'Gap around the board', type: 'range', min: 0.5, max: 8, step: 0.5, default: 2, unit: 'mm' },
    { id: 'standoff', label: 'Standoff height', type: 'range', min: 3, max: 12, step: 0.5, default: 5, unit: 'mm', help: 'Lifts the solder joints off the floor.', showIf: (p) => (BOARDS[p.board]?.holes || []).length > 0 },
    { id: 'screw', label: 'Screw hole', type: 'range', min: 2, max: 3.4, step: 0.1, default: 2.6, unit: 'mm', help: '2.5–2.8 mm lets an M3 screw cut its own thread in PLA.', showIf: (p) => (BOARDS[p.board]?.holes || []).length > 0 },
    { id: 'portNudge', label: 'Port nudge', type: 'range', min: -5, max: 5, step: 0.25, default: 0, unit: 'mm', help: 'Slide the cable openings if your board measures differently.', showIf: (p) => (BOARDS[p.board]?.ports || []).length > 0 },
    { id: 'wall', label: 'Wall', type: 'range', min: 0.8, max: 4, step: 0.2, default: 2, unit: 'mm', kind: 'wall' },
    { id: 'floor', label: 'Floor', type: 'range', min: 0.8, max: 4, step: 0.2, default: 2, unit: 'mm', kind: 'wall' },
    { id: 'radius', label: 'Corner radius', type: 'range', min: 0, max: 10, step: 0.5, default: 3, unit: 'mm' },
    { id: 'lipH', label: 'Lid lip depth', type: 'range', min: 1.5, max: 6, step: 0.5, default: 3, unit: 'mm' },
    { id: 'vents', label: 'Vent slots in lid', type: 'toggle', default: true },
    { id: 'label', label: 'Lid label', type: 'text', default: 'ROBOT BRAIN', maxLength: 18 },
  ],
  build(ctx, p) {
    const { Manifold: M } = ctx;
    const board = p.board === 'custom' ? { ...BOARDS.custom, w: p.customW, d: p.customD, pcb: 1.6 } : BOARDS[p.board];
    const hasHoles = board.holes.length > 0;
    const standoff = hasHoles ? p.standoff : 0;
    const innerW = board.w + 2 * p.margin;
    const innerD = board.d + 2 * p.margin;
    const innerH = standoff + board.pcb + p.headroom;
    const shell = boxWithLid(ctx, { innerW, innerD, innerH, wall: p.wall, floor: p.floor, radius: p.radius, lipH: p.lipH });
    let box = shell.box;
    const bx = -innerW / 2 + p.margin, by = -innerD / 2 + p.margin;   // board origin

    if (hasHoles) {
      const posts = [], bores = [];
      for (const [hx, hy] of board.holes) {
        posts.push(M.cylinder(standoff + 0.02, 3, 3, 32).translate([bx + hx, by + hy, p.floor - 0.01]));
        bores.push(M.cylinder(standoff + 2, p.screw / 2, p.screw / 2, 24).translate([bx + hx, by + hy, p.floor - 1]));
      }
      box = box.add(M.union(posts)).subtract(M.union(bores));
    }

    const pcbTop = p.floor + standoff + board.pcb;
    const top = p.floor + innerH;
    const portClear = 1;
    if (board.ports.length) {
      const notches = board.ports.map((port) => {
        const w = port.width + 2 * portClear;
        const z0 = pcbTop - 0.5;
        return M.cube([p.wall + 2 + p.margin, w, top - z0 + 1]).translate([-innerW / 2 - p.wall - 1, by + port.center + p.portNudge - w / 2, z0]);
      });
      box = box.subtract(M.union(notches));
    }

    let lid = shell.lid;
    if (p.vents) lid = lid.subtract(lidVents(ctx, [innerW - 2 * shell.lipW - 6, innerD - 2 * shell.lipW - 6], p.wall));
    const label = p.label.trim();
    const verdicts = [];
    if (label) {
      if (!supportedText(ctx.font, label)) verdicts.push({ tone: 'warn', tag: 'LABEL', text: 'Some label characters are not in the font and print as "?". Stick to letters, numbers and punctuation.' });
      const size = Math.min(8, (innerD * 0.22));
      const t = textSolid(ctx, label, size, 0.61);
      if (t) {
        const fit = Math.min(1, (shell.outerW - 12) / t.width);
        // engraved into the face that prints on the bed, mirrored so it reads right way up on the closed case
        lid = lid.subtract(t.solid.scale([fit, fit, 1]).mirror([1, 0, 0]).translate([0, p.vents ? innerD * 0.34 : 0, -0.01]));
      }
    }

    const tallestPort = Math.max(0, ...board.ports.map((x) => x.height));
    if (tallestPort && p.headroom < tallestPort + p.lipH) {
      verdicts.push({ tone: 'bad', tag: 'LID CLASH', text: `The ${board.ports.find((x) => x.height === tallestPort).name} stands ${tallestPort} mm above the board, but the lid lip reaches down to ${round(p.headroom - p.lipH)} mm. Raise "Space above the board" to at least ${Math.ceil(tallestPort + p.lipH)} mm.` });
    }
    if (hasHoles) verdicts.push({ tone: 'ok', tag: 'STANDOFFS', text: `${board.holes.length} posts at the board's real mounting holes, ${p.screw} mm bores for ${board.parts}. The board's solder joints clear the floor by ${p.standoff} mm.` });
    if (board.ports.length) verdicts.push({ tone: 'ok', tag: 'PORTS', text: `${board.ports.map((x) => x.name).join(' and ')} openings are open at the top, so the board drops straight in. Measure your board: if a plug does not line up, use Port nudge.` });
    verdicts.push({ tone: 'ok', tag: 'LID FIT', text: `The lid lip is ${ctx.settings.clearance} mm smaller than the opening on every side — your class clearance. Too tight? Raise the clearance in Printer settings.` });

    return {
      bodies: [{ name: 'Case', manifold: box }, { name: 'Lid', manifold: lid }],
      verdicts,
      stats: [
        { label: 'Inside', value: `${round(innerW)} × ${round(innerD)} × ${round(innerH)} mm` },
        { label: 'Board', value: `${board.label}` },
      ],
    };
  },
};

/* The spiral cone is two prints that screw through each other: a cone carved
   into a twisted star (Inner) and the cone it was carved from with a slightly
   fatter copy of that star cut out of it (Outer). Push the tip and the cone
   spins down through the sleeve and drops out the bottom. Defaults are
   measured from the classroom's reference pair of STLs. */
const CONE_TIP = 4;          // radius where the inner cone is cut flat
const SLEEVE_LIP = 1.2;      // plastic left around the core at the top of the sleeve

/* Everything the build, the verdicts and the lesson's animation share. */
export function spiralConeMath(p, nozzle = 0.4) {
  const R = p.radius, H = p.height;
  const lip = p.core + p.gap + SLEEVE_LIP;           // sleeve radius at its top
  const slope = (R - lip) / H;                       // cone radius lost per mm of height
  const tipHeight = (R - CONE_TIP) / slope;          // where the inner cone reaches CONE_TIP
  const rate = p.twist / H;                          // degrees of twist per mm of height
  const rateRad = (rate * Math.PI) / 180;
  const reach = Math.min(p.reach, R - p.gap - 0.6);  // fin tips stay inside the base
  const leanTip = Math.atan(reach * rateRad);        // fin-tip face lean from vertical
  const air = p.gap * Math.cos(leanTip);             // true air across the leaning face
  const collar = Math.max(0, (R - reach - p.gap) / slope);  // solid ring height of the sleeve
  // sleeve finger width a couple of beads out from its inner edge
  const fr = p.core + p.gap + 2 * nozzle;
  const halfSlot = p.finWidth / 2 + p.gap;
  const finger = halfSlot >= fr ? 0 : fr * ((2 * Math.PI) / p.fins - 2 * Math.asin(halfSlot / fr));
  const lead = rate > 0 ? 360 / rate : Infinity;     // mm of drop per full turn
  return { R, H, lip, slope, tipHeight, rate, rateRad, reach, leanTip, leanDeg: (leanTip * 180) / Math.PI, coneDeg: (Math.atan(slope) * 180) / Math.PI, air, collar, finger, lead };
}

/* The star: a round core with `fins` round-ended fins out to `reach`. */
function starSection(CS, p, reach, grow = 0) {
  const r = p.finWidth / 2 + grow;
  const from = p.core * 0.5, to = Math.max(reach + grow - r, from + 0.1);
  const fin = CS.hull([CS.circle(r, 16).translate([to, 0]), CS.square([0.01, 2 * r], true).translate([from, 0])]);
  const parts = [CS.circle(p.core + grow, 54)];
  for (let i = 0; i < p.fins; i++) parts.push(fin.rotate((360 * i) / p.fins));
  return CS.union(parts);
}

const spiral = {
  id: 'spiral',
  name: 'Spiral cone fidget',
  group: 'Fidgets',
  blurb: 'Two prints: a twisted-star cone and the sleeve it screws through. Push the tip and it spins down and drops out the bottom.',
  lesson: { href: 'lessons/applied-physics-materials/print-fidgets.html', label: 'Print-in-place fidgets' },
  params: [
    { id: 'radius', label: 'Base radius', type: 'range', min: 25, max: 50, step: 0.5, default: 41, unit: 'mm' },
    { id: 'height', label: 'Sleeve height', type: 'range', min: 40, max: 100, step: 1, default: 82, unit: 'mm' },
    { id: 'fins', label: 'Fins', type: 'range', min: 3, max: 12, step: 1, default: 9 },
    { id: 'twist', label: 'Twist through the sleeve', type: 'range', min: 0, max: 200, step: 1, default: 117, unit: '°' },
    { id: 'finWidth', label: 'Fin width', type: 'range', min: 2, max: 10, step: 0.5, default: 6, unit: 'mm', kind: 'wall' },
    { id: 'reach', label: 'Fin reach', type: 'range', min: 15, max: 45, step: 0.5, default: 32.5, unit: 'mm', help: 'How far the fin tips reach from the axis. Below where the cone is wider than this, the sleeve stays a solid ring.' },
    { id: 'core', label: 'Core radius', type: 'range', min: 6, max: 16, step: 0.5, default: 11.5, unit: 'mm' },
    { id: 'gap', label: 'Clearance', type: 'range', min: 0.2, max: 1.4, step: 0.05, default: 0.75, unit: 'mm' },
    { id: 'arrange', label: 'Print', type: 'select', default: 'nested', options: [
      { value: 'nested', label: 'Nested — one print, already assembled' },
      { value: 'apart', label: 'Side by side — screw together after' },
    ] },
  ],
  build(ctx, p) {
    const { Manifold: M, CrossSection: CS } = ctx;
    const { nozzle, layer } = ctx.settings;
    const m = spiralConeMath(p, nozzle);
    if (m.slope <= 0.05) throw new Error(`The base radius has to be wider than the top of the sleeve (${round(m.lip, 1)} mm). Widen the base or shrink the core.`);

    // One twisted star for each piece, extruded over the same span with the
    // same twist rate, so the fin and its slot line up at every height.
    const span = m.tipHeight + 2;
    const divisions = Math.ceil(span / 2);
    const twisted = (section) => section.extrude(span, divisions, m.rate * span).translate([0, 0, -1]).rotate([0, 0, -m.rate]);
    const star = twisted(starSection(CS, p, m.reach));
    const slot = twisted(starSection(CS, p, m.reach, p.gap));

    // cones turned half a facet so their corners never line up with a fin edge
    const inner = M.cylinder(m.tipHeight, m.R, CONE_TIP, 96).rotate([0, 0, 1.875]).intersect(star);
    const outer = M.cylinder(m.H, m.R, m.lip, 96).rotate([0, 0, 1.875]).subtract(slot);

    const verdicts = [];
    if (m.air < nozzle * 0.75) verdicts.push({ tone: 'bad', tag: 'WELDED', text: `The twist leans the fin faces ${round(m.leanDeg)}°, so ${p.gap} mm of clearance is only ${round(m.air, 2)} mm of real air — too thin for the slicer to leave empty. The cone prints fused into its sleeve.` });
    else if (m.air < nozzle) verdicts.push({ tone: 'warn', tag: 'TIGHT', text: `${round(m.air, 2)} mm of real air across the leaning fins — under one ${nozzle} mm bead. It may free up with a hard push, or the slicer may fill the slot.` });
    else if (m.air <= nozzle * 1.75) verdicts.push({ tone: 'ok', tag: 'FREE', text: `${round(m.air, 2)} mm of real air across the leaning fins: one bead of nothing, so the cone comes off the bed already free to spin.` });
    else verdicts.push({ tone: 'warn', tag: 'LOOSE', text: `${round(m.air, 2)} mm of air. It will fall straight through and rattle on the way.` });

    if (m.leanDeg > 45) verdicts.push({ tone: 'bad', tag: 'OVERHANG', text: `At the fin tips the twist leans the faces ${round(m.leanDeg)}° from vertical. Past 45° each layer hangs off the one below, and supports would fill the slot. Twist less, or pull the fins in.` });
    else if (m.leanDeg > 40) verdicts.push({ tone: 'warn', tag: 'LEAN', text: `${round(m.leanDeg)}° of lean at the fin tips is close to the 45° limit. Run the fan at 100%.` });

    if (p.twist < 1) verdicts.push({ tone: 'warn', tag: 'NO SPIN', text: 'With no twist the fins are straight, so the cone slides through without turning. It works — it just is not a spiral.' });
    else if (p.twist < 40) verdicts.push({ tone: 'warn', tag: 'LAZY', text: `Only ${p.twist}° through the whole sleeve. The cone barely turns as it drops.` });

    if (m.collar < 2) verdicts.push({ tone: 'bad', tag: 'NO COLLAR', text: `The fins reach the outside of the base, so nothing holds the sleeve's fingers together — it prints as ${p.fins} loose strips. Pull the fin reach in.` });
    else if (m.collar < 8) verdicts.push({ tone: 'warn', tag: 'COLLAR', text: `The sleeve's solid ring is only ${round(m.collar)} mm tall. The fingers will flex apart under a push.` });

    if (m.finger < nozzle * 2) verdicts.push({ tone: 'bad', tag: 'FINGERS', text: `Between the slots the sleeve is only ${round(m.finger, 2)} mm wide near the core — less than two beads. Use fewer or narrower fins, or a bigger core.` });
    else if (m.finger < nozzle * 3) verdicts.push({ tone: 'warn', tag: 'FINGERS', text: `The sleeve's fingers are ${round(m.finger, 2)} mm wide near the core. They print, but are fragile.` });

    if (m.lip - p.core - p.gap < layer) verdicts.push({ tone: 'bad', tag: 'TIP', text: 'The top of the sleeve is thinner than a layer.' });

    const bodies = [{ name: 'Outer', manifold: outer }, { name: 'Inner', manifold: inner }];
    return {
      bodies,
      layout: p.arrange === 'nested' ? 'nested' : 'apart',
      verdicts,
      overhangNote: m.leanDeg <= 45
        ? 'No face leans past 45°: the fins twist, but every layer still sits on the one below, and the gap between the pieces is a slot, not a ceiling. Print with supports OFF — support material would fill the slot and lock the cone.'
        : null,
      stats: [
        { label: 'Twist rate', value: `${round(m.rate, 2)}°/mm` },
        { label: 'Real air across the fins', value: `${round(m.air, 2)} mm` },
        { label: 'Lean at fin tips', value: `${round(m.leanDeg)}°` },
        { label: 'Cone height', value: `${round(m.tipHeight)} mm` },
        { label: 'Sleeve collar', value: `${round(m.collar)} mm` },
      ],
    };
  },
};

const gears = {
  id: 'gears',
  name: 'Gear pair + peg board',
  group: 'Fidgets',
  blurb: 'Two involute spur gears that really mesh, and a board with pegs at exactly the right distance apart.',
  lesson: { href: 'lessons/engineering/mechanical-and-civil-design/mechanisms-gears.html', label: 'Mechanisms & gears' },
  params: [
    { id: 'module', label: 'Module (tooth size)', type: 'select', default: '2', options: ['1.5', '2', '2.5', '3'].map((v) => ({ value: v, label: `${v} mm` })), help: 'Gears only mesh with gears of the same module.' },
    { id: 'teethA', label: 'Teeth on gear A', type: 'range', min: 8, max: 60, step: 1, default: 12 },
    { id: 'teethB', label: 'Teeth on gear B', type: 'range', min: 8, max: 60, step: 1, default: 24 },
    { id: 'thickness', label: 'Gear thickness', type: 'range', min: 3, max: 15, step: 0.5, default: 6, unit: 'mm' },
    { id: 'bore', label: 'Bore', type: 'range', min: 3, max: 10, step: 0.5, default: 5, unit: 'mm' },
    { id: 'board', label: 'Print a peg board', type: 'toggle', default: true },
  ],
  build(ctx, p) {
    const { Manifold: M, CrossSection: CS } = ctx;
    const m = Number(p.module);
    const c = ctx.settings.clearance;
    const gear = (teeth) => {
      const g = spurGearOutline({ module: m, teeth, backlash: c / 2 });
      const body = CS.ofPolygons([g.points]).extrude(p.thickness).subtract(M.cylinder(p.thickness + 2, p.bore / 2, p.bore / 2, 48).translate([0, 0, -1]));
      return { body, g };
    };
    const A = gear(p.teethA), B = gear(p.teethB);
    const dist = centerDistance(m, p.teethA, p.teethB);
    const bodies = [{ name: `Gear A (${p.teethA} teeth)`, manifold: A.body }, { name: `Gear B (${p.teethB} teeth)`, manifold: B.body }];
    if (p.board) {
      const plateT = 3, pad = 6;
      const len = dist + A.g.tipRadius + B.g.tipRadius + 2 * pad;
      const wid = 2 * Math.max(A.g.tipRadius, B.g.tipRadius) + 2 * pad;
      const x0 = -len / 2 + pad + A.g.tipRadius;
      const pegR = p.bore / 2 - c;
      const peg = (x) => M.cylinder(p.thickness + 2, pegR, pegR * 0.8, 40).translate([x, 0, plateT - 0.01]);
      // a thin washer under each gear so it spins on the washer instead of rubbing the plate
      const washer = (x) => M.cylinder(0.6, pegR + 2, pegR + 2, 40).translate([x, 0, plateT - 0.01]);
      const plate = roundedRect(CS, len, wid, 4).extrude(plateT);
      bodies.push({ name: 'Peg board', manifold: M.union([plate, peg(x0), peg(x0 + dist), washer(x0), washer(x0 + dist)]) });
    }
    const ratio = p.teethB / p.teethA;
    const verdicts = [];
    const nozzle = ctx.settings.nozzle;
    const thinTip = Math.min(A.g.tipThickness, B.g.tipThickness);
    if (thinTip < nozzle * 1.5) verdicts.push({ tone: 'warn', tag: 'SHARP TEETH', text: `Tooth tips are ${round(thinTip, 2)} mm wide — under 1.5 nozzle widths, so they print as a single wobbly line. Use a bigger module.` });
    if (Math.min(p.teethA, p.teethB) < 12) verdicts.push({ tone: 'warn', tag: 'UNDERCUT', text: 'Gears under about 12 teeth (at 20° pressure angle) get thin at the root. They still turn, but go gently.' });
    if (p.bore / 2 + 1.2 > Math.min(A.g.rootRadius, B.g.rootRadius)) verdicts.push({ tone: 'bad', tag: 'BORE', text: 'The bore cuts into the tooth roots of the small gear. Make the bore smaller or add teeth.' });
    verdicts.push({ tone: 'ok', tag: 'MESH', text: `Same ${m} mm module, centres ${round(dist, 2)} mm apart, and ${c / 2} mm thinner teeth (half your class clearance) for play. Print flat, no supports.` });
    return {
      bodies,
      verdicts,
      stats: [
        { label: 'Gear ratio', value: `1 : ${round(ratio, 2)}` },
        { label: 'Centre distance', value: `${round(dist, 2)} mm` },
        { label: 'Pitch Ø A / B', value: `${round(2 * A.g.pitchRadius)} / ${round(2 * B.g.pitchRadius)} mm` },
        { label: 'B speed / torque', value: `${round(1 / ratio, 2)}× / ${round(ratio, 2)}×` },
      ],
    };
  },
};

const tag = {
  id: 'tag',
  name: 'Name tag / keychain',
  group: 'Everyday',
  blurb: 'Raised or engraved lettering on a rounded plate, with an optional keyring hole.',
  params: [
    { id: 'text', label: 'Text', type: 'text', default: 'MAKER', maxLength: 16 },
    { id: 'size', label: 'Letter height', type: 'range', min: 4, max: 30, step: 0.5, default: 10, unit: 'mm' },
    { id: 'style', label: 'Lettering', type: 'select', default: 'raised', options: [{ value: 'raised', label: 'Raised' }, { value: 'engraved', label: 'Engraved' }] },
    { id: 'base', label: 'Plate thickness', type: 'range', min: 1, max: 6, step: 0.2, default: 2.4, unit: 'mm', kind: 'wall' },
    { id: 'depth', label: 'Letter depth', type: 'range', min: 0.4, max: 3, step: 0.2, default: 1, unit: 'mm' },
    { id: 'pad', label: 'Border', type: 'range', min: 1.5, max: 10, step: 0.5, default: 4, unit: 'mm' },
    { id: 'ring', label: 'Keyring hole', type: 'toggle', default: true },
  ],
  build(ctx, p) {
    const { Manifold: M, CrossSection: CS } = ctx;
    const text = p.text.trim();
    const t = text ? textSolid(ctx, text, p.size, p.depth + 0.02) : null;
    const textW = t ? t.width : p.size * 2;
    const holeD = 5, holeRoom = p.ring ? holeD + p.pad : 0;
    const w = textW + 2 * p.pad + holeRoom, d = p.size + 2 * p.pad;
    let plate = roundedRect(CS, w, d, Math.min(d / 2, 4)).extrude(p.base).translate([0, 0, 0]);
    const textX = holeRoom / 2;
    if (p.ring) plate = plate.subtract(M.cylinder(p.base + 2, holeD / 2, holeD / 2, 40).translate([-w / 2 + p.pad / 2 + holeD / 2 + 1, 0, -1]));
    const verdicts = [];
    if (t) {
      if (p.style === 'raised') plate = plate.add(t.solid.translate([textX, 0, p.base - 0.01]));
      else plate = plate.subtract(t.solid.translate([textX, 0, p.base - p.depth]));
      if (!supportedText(ctx.font, text)) verdicts.push({ tone: 'warn', tag: 'CHARACTERS', text: 'Some characters are not in the font and print as "?".' });
    }
    if (p.style === 'engraved' && p.depth > p.base - 0.8) verdicts.push({ tone: 'bad', tag: 'TOO DEEP', text: `Engraving ${p.depth} mm into a ${p.base} mm plate leaves less than 0.8 mm under the letters. Make the plate thicker.` });
    if (p.size < 6) verdicts.push({ tone: 'warn', tag: 'SMALL TEXT', text: `At ${p.size} mm the strokes of each letter are only about ${round(p.size * 0.16, 1)} mm wide — under three ${ctx.settings.nozzle} mm beads. Letters will look blobby.` });
    const layers = p.depth / ctx.settings.layer;
    if (layers < 3) verdicts.push({ tone: 'warn', tag: 'SHALLOW', text: `${round(layers)} layers of lettering barely shows. Go to ${round(ctx.settings.layer * 4, 1)} mm or more.` });
    if (p.style === 'raised') verdicts.push({ tone: 'ok', tag: 'TWO COLOURS', text: `Pause the print at ${round(p.base, 1)} mm and swap filament to get letters in a second colour.` });
    return { bodies: [{ name: 'Tag', manifold: plate }], verdicts };
  },
};

const storage = {
  id: 'box',
  name: 'Box with lid',
  group: 'Everyday',
  blurb: 'A rounded box with optional dividers and a lid that drops on and stays.',
  params: [
    { id: 'w', label: 'Inside length', type: 'range', min: 15, max: 240, step: 1, default: 80, unit: 'mm' },
    { id: 'd', label: 'Inside width', type: 'range', min: 15, max: 150, step: 1, default: 50, unit: 'mm' },
    { id: 'h', label: 'Inside height', type: 'range', min: 8, max: 120, step: 1, default: 30, unit: 'mm' },
    { id: 'dividers', label: 'Dividers', type: 'range', min: 0, max: 6, step: 1, default: 2 },
    { id: 'wall', label: 'Wall', type: 'range', min: 0.8, max: 4, step: 0.2, default: 1.6, unit: 'mm', kind: 'wall' },
    { id: 'floor', label: 'Floor', type: 'range', min: 0.8, max: 4, step: 0.2, default: 1.6, unit: 'mm', kind: 'wall' },
    { id: 'radius', label: 'Corner radius', type: 'range', min: 0, max: 15, step: 0.5, default: 4, unit: 'mm' },
    { id: 'lipH', label: 'Lid lip depth', type: 'range', min: 1.5, max: 8, step: 0.5, default: 3, unit: 'mm' },
  ],
  build(ctx, p) {
    const { Manifold: M } = ctx;
    const shell = boxWithLid(ctx, { innerW: p.w, innerD: p.d, innerH: p.h, wall: p.wall, floor: p.floor, radius: p.radius, lipH: p.lipH });
    let box = shell.box;
    if (p.dividers > 0) {
      const divH = Math.max(2, p.h - p.lipH - 0.5);
      const walls = [];
      for (let i = 1; i <= p.dividers; i++) {
        const x = -p.w / 2 + (p.w * i) / (p.dividers + 1);
        walls.push(M.cube([p.wall, p.d + 0.2, divH]).translate([x - p.wall / 2, -p.d / 2 - 0.1, p.floor - 0.01]));
      }
      box = box.add(M.union(walls));
    }
    const verdicts = [{ tone: 'ok', tag: 'LID FIT', text: `The lid lip is ${ctx.settings.clearance} mm inside the opening on every side — your class clearance.` }];
    if (p.dividers > 0) verdicts.push({ tone: 'ok', tag: 'DIVIDERS', text: `Dividers stop ${round(p.lipH + 0.5)} mm below the rim so the lid lip clears them.` });
    return { bodies: [{ name: 'Box', manifold: box }, { name: 'Lid', manifold: shell.lid }], verdicts, stats: [{ label: 'Compartment', value: `${round(p.w / (p.dividers + 1))} × ${p.d} mm` }] };
  },
};

const stand = {
  id: 'stand',
  name: 'Phone / tablet stand',
  group: 'Everyday',
  blurb: 'An angled stand with a front lip and a cable slot, printed on its side so the layers run the strong way.',
  params: [
    { id: 'width', label: 'Stand width', type: 'range', min: 30, max: 150, step: 1, default: 70, unit: 'mm' },
    { id: 'angle', label: 'Lean angle', type: 'range', min: 45, max: 85, step: 1, default: 65, unit: '°', help: 'Measured from the desk.' },
    { id: 'device', label: 'Device thickness (with case)', type: 'range', min: 5, max: 20, step: 0.5, default: 11, unit: 'mm' },
    { id: 'back', label: 'Back rest length', type: 'range', min: 40, max: 140, step: 1, default: 85, unit: 'mm' },
    { id: 'lip', label: 'Front lip height', type: 'range', min: 4, max: 25, step: 1, default: 10, unit: 'mm' },
    { id: 'thick', label: 'Frame thickness', type: 'range', min: 2, max: 8, step: 0.5, default: 4.5, unit: 'mm', kind: 'wall' },
    { id: 'cable', label: 'Cable slot', type: 'toggle', default: true },
  ],
  build(ctx, p) {
    const { Manifold: M, CrossSection: CS } = ctx;
    const t = p.thick, a = (p.angle * Math.PI) / 180;
    const slot = p.device / Math.sin(a) + 2 * ctx.settings.clearance + 1;
    const restStart = [t + slot + t / (2 * Math.sin(a)), t / 2];
    const dir = [Math.cos(a), Math.sin(a)];
    const restEnd = [restStart[0] + p.back * dir[0], restStart[1] + p.back * dir[1]];
    const brace = [restStart[0] + 0.62 * p.back * dir[0], restStart[1] + 0.62 * p.back * dir[1]];
    const depth = Math.max(restEnd[0] + t, brace[0] + brace[1] * 0.45, restStart[0] + 30);
    const foot = [depth - t / 2, t / 2];
    const profile = CS.union([
      bar(CS, [t / 2, t / 2], foot, t),                       // base
      bar(CS, [t / 2, t / 2], [t / 2, t / 2 + p.lip], t),     // front lip
      bar(CS, restStart, restEnd, t),                         // back rest
      bar(CS, brace, foot, t),                                // brace
    ]);
    let body = profile.extrude(p.width);
    if (p.cable) {
      body = body.subtract(M.cube([restStart[0] + 1, t + 2, 12]).translate([-1, -1, p.width / 2 - 6]));
    }
    const verdicts = [];
    if (p.angle < 55) verdicts.push({ tone: 'warn', tag: 'SHALLOW', text: `At ${p.angle}° a heavy phone pushes hard on the lip. 60–75° is the sweet spot.` });
    if (p.angle > 78) verdicts.push({ tone: 'warn', tag: 'STEEP', text: `At ${p.angle}° the device is nearly upright and tips forward when you tap it.` });
    if (p.lip < p.device * 0.6) verdicts.push({ tone: 'warn', tag: 'LOW LIP', text: `A ${p.lip} mm lip on an ${p.device} mm device lets it slide out. Raise the lip to at least ${Math.ceil(p.device * 0.6)} mm.` });
    verdicts.push({ tone: 'ok', tag: 'ON ITS SIDE', text: 'It prints lying on its side, so every layer runs along the frame. Printed standing up, the lip would snap off along a layer line.' });
    return {
      bodies: [{ name: 'Stand', manifold: body }],
      verdicts,
      stats: [{ label: 'Slot at the bottom', value: `${round(slot)} mm` }, { label: 'Footprint', value: `${round(depth)} × ${p.width} mm` }],
    };
  },
};

const clip = {
  id: 'clip',
  name: 'Cable clip',
  group: 'Everyday',
  blurb: 'Snap-in clips for one to four cables, with screw tabs or a flat base for tape.',
  params: [
    { id: 'cable', label: 'Cable diameter', type: 'range', min: 2, max: 15, step: 0.5, default: 5, unit: 'mm' },
    { id: 'count', label: 'Cables', type: 'range', min: 1, max: 4, step: 1, default: 2 },
    { id: 'wall', label: 'Wall', type: 'range', min: 0.8, max: 3, step: 0.2, default: 1.6, unit: 'mm', kind: 'wall' },
    { id: 'width', label: 'Clip width', type: 'range', min: 4, max: 25, step: 1, default: 10, unit: 'mm' },
    { id: 'opening', label: 'Opening', type: 'range', min: 50, max: 95, step: 5, default: 75, unit: '% of cable' },
    { id: 'mount', label: 'Mount', type: 'select', default: 'screw', options: [{ value: 'screw', label: 'Screw tabs' }, { value: 'tape', label: 'Flat base for tape' }] },
  ],
  build(ctx, p) {
    const { Manifold: M, CrossSection: CS } = ctx;
    const r = p.cable / 2 + ctx.settings.clearance / 2;
    const outerR = r + p.wall;
    const pitch = 2 * outerR + 1;
    const span = (p.count - 1) * pitch;
    const base = p.wall;
    const tab = p.mount === 'screw' ? 9 : 2;
    const cy = base + r;
    const rings = [], openings = [], holes = [];
    for (let i = 0; i < p.count; i++) {
      const x = -span / 2 + i * pitch;
      rings.push(CS.circle(outerR, 64).translate([x, cy]));
      holes.push(CS.circle(r, 64).translate([x, cy]));
      const ow = (p.cable * p.opening) / 100;
      openings.push(CS.square([ow, outerR + 1]).translate([x - ow / 2, cy]));
    }
    const baseBar = CS.square([span + 2 * outerR + 2 * tab, base]).translate([-(span / 2 + outerR + tab), 0]);
    const profile = CS.union([...rings, baseBar]).subtract(CS.union([...holes, ...openings]));
    let body = profile.extrude(p.width);
    if (p.mount === 'screw') {
      const hx = span / 2 + outerR + tab / 2;
      for (const x of [-hx, hx]) body = body.subtract(M.cylinder(base + 2, 1.8, 1.8, 24).rotate([-90, 0, 0]).translate([x, -1, p.width / 2]));
    }
    const verdicts = [{ tone: 'ok', tag: 'ON ITS SIDE', text: 'Printed lying down, the C-shaped arms bend along their layers instead of peeling apart, so they snap over the cable without cracking.' }];
    if (p.opening > 85) verdicts.push({ tone: 'warn', tag: 'LOOSE', text: 'An opening this wide barely grips. Cables will pop out.' });
    if (p.wall > 2.4 && p.opening < 65) verdicts.push({ tone: 'warn', tag: 'STIFF', text: 'Thick arms with a narrow opening may crack instead of flexing. Thin the wall or widen the opening.' });
    return { bodies: [{ name: 'Clip', manifold: body }], verdicts };
  },
};

const COMB_SETS = {
  lesson: [0.15, 0.2, 0.25, 0.3, 0.4, 0.5],
  fine: [0.1, 0.15, 0.2, 0.25, 0.3, 0.35],
  wide: [0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
};

const comb = {
  id: 'comb',
  name: 'Clearance comb',
  group: 'Calibration',
  blurb: 'Six slots from tight to loose. Print it once per printer to find your class clearance — every lid and peg here uses it.',
  lesson: { href: 'lessons/applied-physics-materials/print-fidgets.html', label: 'Print-in-place fidgets' },
  params: [
    { id: 'set', label: 'Slot widths', type: 'select', default: 'lesson', options: [
      { value: 'lesson', label: '0.15 – 0.5 mm (lesson)' }, { value: 'fine', label: '0.10 – 0.35 mm (tuned printer)' }, { value: 'wide', label: '0.3 – 0.8 mm (worn nozzle)' },
    ] },
    { id: 'thickness', label: 'Plate thickness', type: 'range', min: 2, max: 6, step: 0.5, default: 3, unit: 'mm', kind: 'wall' },
    { id: 'labels', label: 'Engrave the sizes', type: 'toggle', default: true },
  ],
  build(ctx, p) {
    const { Manifold: M } = ctx;
    const slots = COMB_SETS[p.set];
    let plate = M.cube([50, 24, p.thickness]).translate([-25, -12, 0]);
    const cuts = slots.map((w, i) => M.cube([w, 17, p.thickness + 2]).translate([-20 + 8 * i - w / 2, -13, -1]));
    plate = plate.subtract(M.union(cuts));
    if (p.labels) {
      const marks = [];
      slots.forEach((w, i) => {
        const t = textSolid(ctx, String(Math.round(w * 100)), 3.2, 0.61);
        if (t) marks.push(t.solid.translate([-20 + 8 * i, 8, p.thickness - 0.6]));
      });
      if (marks.length) plate = plate.subtract(M.union(marks));
    }
    return {
      bodies: [{ name: 'Comb', manifold: plate }],
      verdicts: [{ tone: 'ok', tag: 'HOW TO READ IT', text: `Print flat with supports off. Hold it to a light: the narrowest slot you can see through and whose finger flexes on its own is your clearance (numbers are hundredths of a mm). Enter it in Printer settings — currently ${ctx.settings.clearance} mm.` }],
    };
  },
};

export const PARTS = [caseCase, spiral, gears, tag, storage, stand, clip, comb];
export const PART_GROUPS = ['Electronics housings', 'Fidgets', 'Everyday', 'Calibration'];
export const partById = (id) => PARTS.find((p) => p.id === id);
