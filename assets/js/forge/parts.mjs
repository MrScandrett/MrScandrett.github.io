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
  lesson: { href: 'lessons/3d-design/cad-and-printing/print-fidgets.html', label: 'Print-in-place fidgets' },
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

/* ── print-in-place fidgets ───────────────────────────────────────────── */

/* A polygon in either winding, as a filled cross-section. */
function poly(CS, pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; s += ax * by - bx * ay; }
  return CS.ofPolygons([s < 0 ? [...pts].reverse() : pts]);
}

/* A profile drawn as (radius, height) spun into a solid round the Z axis.
   Anything left of the axis is clipped off first. */
function spin(CS, section, segments = 96) {
  return section.intersect(CS.square([500, 1000]).translate([0, -500])).revolve(segments);
}

/* The captured spinner from the Print Fidgets lesson: a disc printed inside
   a cup whose lip is narrower than the disc. Defaults are the lesson's own
   numbers (Ø40 cup, 0.4 mm at the side, one layer above and below). */
const captured = {
  id: 'captured',
  name: 'Captured spinner',
  group: 'Fidgets',
  blurb: 'A disc that spins inside a cup, printed as one piece. The lip is narrower than the disc, so it can turn but never fall out.',
  lesson: { href: 'lessons/3d-design/cad-and-printing/print-fidgets.html', label: 'Print-in-place fidgets' },
  params: [
    { id: 'radius', label: 'Cup radius', type: 'range', min: 14, max: 35, step: 0.5, default: 20, unit: 'mm' },
    { id: 'wall', label: 'Cup wall', type: 'range', min: 1.2, max: 5, step: 0.2, default: 3.4, unit: 'mm', kind: 'wall' },
    { id: 'floor', label: 'Cup floor', type: 'range', min: 1.2, max: 4, step: 0.2, default: 2.6, unit: 'mm', kind: 'wall' },
    { id: 'disc', label: 'Disc thickness', type: 'range', min: 2, max: 8, step: 0.2, default: 4, unit: 'mm', kind: 'wall' },
    { id: 'hole', label: 'Finger hole radius', type: 'range', min: 0, max: 12, step: 0.5, default: 8, unit: 'mm', help: '0 makes a solid disc.' },
    { id: 'lip', label: 'Lip reach', type: 'range', min: 1, max: 5, step: 0.2, default: 3, unit: 'mm', help: 'How far the lip reaches in over the groove. Its underside slopes at 45°, so it needs no supports.' },
    { id: 'gap', label: 'Side gap', type: 'range', min: 0.2, max: 0.8, step: 0.05, default: 0.4, unit: 'mm', help: 'Air between the disc rim and the cup wall. The gaps above and below are one layer.' },
  ],
  build(ctx, p) {
    const { CrossSection: CS } = ctx;
    const { layer, nozzle, clearance } = ctx.settings;
    const groove = p.radius - p.wall;
    const discR = groove - p.gap;
    const lipR = groove - p.lip;
    const z0 = p.floor + layer, z1 = z0 + p.disc;      // the disc floats one layer up
    const ceil = z1 + layer;                           // groove ceiling at the outer wall
    const top = ceil + p.lip;                          // 45°: up as far as it reaches in
    const hole = Math.min(p.hole, discR - 3 * nozzle);

    const cup = spin(CS, poly(CS, [[0, 0], [p.radius, 0], [p.radius, top], [lipR, top], [groove, ceil], [groove, p.floor], [0, p.floor]]));
    const disc = spin(CS, CS.square([discR - hole, p.disc]).translate([hole, z0]));

    const verdicts = [];
    if (hole < p.hole) verdicts.push({ tone: 'bad', tag: 'DISC', text: `A ${p.hole} mm finger hole leaves no rim on a ${round(discR)} mm disc. It has been shrunk to ${round(hole)} mm; make the hole smaller or the cup wider.` });
    if (p.gap < clearance) verdicts.push({ tone: 'bad', tag: 'FUSED', text: `${p.gap} mm at the side is less than your class clearance (${clearance} mm, from the comb). The disc rim will weld to the wall.` });
    else if (p.gap > clearance + 0.4) verdicts.push({ tone: 'warn', tag: 'LOOSE', text: `${p.gap} mm at the side is well over your class clearance. It spins, but rattles and wobbles.` });
    else verdicts.push({ tone: 'ok', tag: 'SIDE GAP', text: `${p.gap} mm of air all round the rim: at or above your class clearance (${clearance} mm), so the slicer keeps it open.` });
    verdicts.push({ tone: 'ok', tag: 'CAPTURED', text: `The lip opening (Ø${round(2 * lipR)}) is ${round(2 * (discR - lipR))} mm narrower than the disc (Ø${round(2 * discR)}), so it turns but cannot come out.` });
    if (hole > 0 && lipR - hole < 2) verdicts.push({ tone: 'warn', tag: 'NO GRIP', text: `Only ${round(Math.max(0, lipR - hole))} mm of disc shows between the finger hole and the lip. Shrink the hole or the lip so a finger can push the disc round.` });

    return {
      bodies: [{ name: 'Cup', manifold: cup }, { name: 'Disc', manifold: disc }],
      layout: 'nested',
      verdicts,
      overhangNote: `The disc's underside shows red because it is not on the bed: it prints one ${layer} mm layer above the cup's floor, on plastic that has already cooled, so the two don't bond. The lip's underside slopes at 45°, the steepest a printer holds by itself. Print with supports OFF — support would fill the gaps and lock the disc.`,
      stats: [
        { label: 'Gaps (side / below / above)', value: `${p.gap} / ${layer} / ${layer} mm` },
        { label: 'Disc / lip opening', value: `Ø${round(2 * discR)} / Ø${round(2 * lipR)} mm` },
      ],
    };
  },
};

/* The locked star fidget from the Tinkercad Codeblocks lesson. The ring maths
   (slabs, chevron ridges, the lift test) lives in lessons/fidget-rings.js,
   which forge.html loads as a classic script; this part only turns each slab
   into a solid, exactly as the Codeblocks program stacks them. */
const fidgetRings = () => {
  const FR = globalThis.FidgetRings;
  if (!FR) throw new Error('The ring maths (fidget-rings.js) is not loaded on this page.');
  return FR;
};

const rings = {
  id: 'rings',
  name: 'Locked star fidget',
  group: 'Fidgets',
  blurb: 'Nested star rings that click up and down but can\'t be pulled apart: each ring\'s ridge is trapped in the next ring\'s groove.',
  lesson: { href: 'lessons/3d-design/cad-and-printing/tinkercad-codeblocks.html', label: 'Tinkercad Codeblocks' },
  params: [
    { id: 'shape', label: 'Ring shape', type: 'select', default: 'star', options: [{ value: 'star', label: 'Star (slides in clicks)' }, { value: 'round', label: 'Round (spins too)' }] },
    { id: 'n', label: 'Rings', type: 'range', min: 2, max: 12, step: 1, default: 6 },
    { id: 'r', label: 'Inner ring radius', type: 'range', min: 6, max: 30, step: 1, default: 14, unit: 'mm', help: 'Measured to the star\'s points, as in Codeblocks.' },
    { id: 'w', label: 'Wall', type: 'range', min: 1.5, max: 5, step: 0.5, default: 3, unit: 'mm', help: 'To the points. Across a flat side a star is about 0.7 of this.' },
    { id: 'g', label: 'Gap', type: 'range', min: 0.5, max: 3, step: 0.1, default: 1.5, unit: 'mm', help: 'To the points. Forge reports the real air across the leaning sides.' },
    { id: 'k', label: 'Lock steps', type: 'range', min: 0, max: 6, step: 1, default: 4, help: 'Slabs that climb out (and back in) to make the ridge. 0 gives loose rings.' },
    { id: 'flat', label: 'Straight middle', type: 'range', min: 1, max: 8, step: 0.5, default: 2, unit: 'mm' },
    { id: 'step', label: 'Extra height per ring', type: 'range', min: 0, max: 2, step: 0.5, default: 1, unit: 'mm', help: 'How far each ring can slide.' },
  ],
  build(ctx, p) {
    const { Manifold: M, CrossSection: CS } = ctx;
    const FR = fidgetRings();
    const { nozzle, clearance } = ctx.settings;
    if (p.r - p.w < 1) throw new Error(`The inner ring has no hole: its radius (${p.r} mm) must be at least 1 mm more than the wall (${p.w} mm).`);
    const unit = FR.unitOutline(p.shape);
    const outline = (rho) => CS.ofPolygons([unit.map(([x, y]) => [x * rho, y * rho])]);
    const bodies = [];
    for (let i = 1; i <= p.n; i++) {
      const slabs = FR.ringSlabs(p, i).map((s, j, all) =>
        // each slab reaches a hair into the next so the stack fuses into one ring
        outline(s.ro).subtract(outline(s.ri)).extrude(s.z1 - s.z0 + (j < all.length - 1 ? 0.01 : 0)).translate([0, 0, s.z0]));
      bodies.push({ name: i === 1 ? 'Ring 1 (inner)' : i === p.n ? `Ring ${i} (outer)` : `Ring ${i}`, manifold: M.union(slabs) });
    }

    const an = FR.analyze(p);
    const verdicts = [];
    if (!an.locked) verdicts.push({ tone: 'bad', tag: 'FALLS APART', text: p.k === 0
      ? 'With no lock steps each ring is a plain tube. Lift the outer ring and the rest stay on the table.'
      : `The ridge (${round(an.ridge, 2)} mm) is not deeper than the gap (${round(an.gapTrue, 2)} mm), so the rings slide apart. Add lock steps or shrink the gap.` });
    else verdicts.push({ tone: 'ok', tag: 'LOCKED', text: `Each ridge is trapped in the next ring's groove. Lift the outer ring and the whole fidget comes up; each ring slides ${round(an.play)} mm.` });
    if (an.clearance < clearance) verdicts.push({ tone: 'bad', tag: 'FUSED', text: `Only ${round(an.clearance, 2)} mm of real air between neighbours, under your class clearance (${clearance} mm). The rings print as one lump. Raise the gap.` });
    else if (an.clearance > 0.9) verdicts.push({ tone: 'warn', tag: 'RATTLES', text: `${round(an.clearance, 2)} mm of air between neighbours. It moves, but rattles. Lower the gap.` });
    else verdicts.push({ tone: 'ok', tag: 'AIR GAP', text: `${round(an.clearance, 2)} mm of real air between neighbours${p.shape === 'star' ? ', measured across a flat side' : ''}: free, without rattling.` });
    if (an.wallTrue < nozzle * 3) verdicts.push({ tone: 'warn', tag: 'THIN', text: `Across a side the wall is only ${round(an.wallTrue, 2)} mm. Thicken it so the rings survive a pocket.` });

    return {
      bodies,
      layout: 'nested',
      verdicts,
      overhangNote: `Each ring climbs out and steps back in ${FR.SLAB} mm at a time (two layers), so the walls lean at about 45°. The red faces are those small steps, each only ${round(an.run * an.h, 2)} mm across a side, which the printer bridges. Print with supports OFF — support would fill the gaps and glue the rings.`,
      stats: [
        { label: 'Real air between rings', value: `${round(an.clearance, 2)} mm` },
        { label: 'Slide per ring', value: an.locked ? `${round(an.play)} mm` : 'falls apart' },
        { label: 'Outer ring height', value: `${round(FR.ringHeight(p, p.n))} mm` },
        { label: 'Slabs', value: `${FR.slabCount(p)}` },
      ],
    };
  },
};

/* A fidget spinner, either on a 608 skateboard bearing or on a printed hub
   that needs no hardware: the hub carries a diamond ridge riding in a matching
   groove in the body, every face at 40° from vertical so neither needs supports. */
const BEARING_608 = { od: 22, width: 7, bore: 8 };
const PENNY = { d: 19.05, t: 1.52 };
const HUB = { r: 9, ridge: 1.6, bevel: 1.2, lift: 1.2, lean: (40 * Math.PI) / 180 };

/* Hub profile and the hole it turns in, as (radius, height) sections. */
function printedHub(CS, T, g) {
  const { r, ridge: d, bevel, lift } = HUB;
  const t = Math.tan(HUB.lean);
  const e = d / t, zm = T / 2, hb = bevel / t, R0 = r + g + bevel;
  const hub = poly(CS, [[0, 0], [r, 0], [r, zm - e], [r + d, zm], [r, zm + e], [r, T + lift], [0, T + lift]]);
  // the bevels on both faces leave the hub standing proud for your fingers
  const hole = CS.union([
    hub.offset(g, 'Miter', 4),
    poly(CS, [[0, -1], [R0 + t, -1], [r + g, hb], [0, hb]]),
    poly(CS, [[0, T + 1], [R0 + t, T + 1], [r + g, T - hb], [0, T - hb]]),
  ]);
  // narrowest the hole gets above and below the ridge (the hole radius at z
  // is the widest of the bevel, the straight bore and the groove)
  const holeR = (z) => Math.max(r + g, R0 - Math.min(z, T - z) * t, r + g / Math.cos(HUB.lean) + (e - Math.abs(z - zm)) * t);
  let narrowest = 0;
  for (const [a, b] of [[0, zm], [zm, T]]) {
    let m = Infinity;
    for (let k = 0; k <= 200; k++) m = Math.min(m, holeR(a + ((b - a) * k) / 200));
    narrowest = Math.max(narrowest, m);
  }
  return { hub, hole, holeR: Math.max(r + g + d, R0), trap: r + d - narrowest };
}

const spinner = {
  id: 'spinner',
  name: 'Fidget spinner',
  group: 'Fidgets',
  blurb: 'Two to six arms around a hub that spins on a 608 skateboard bearing, or on a printed hub that needs no hardware at all.',
  lesson: { href: 'lessons/3d-design/cad-and-printing/print-fidgets.html', label: 'Print-in-place fidgets' },
  params: [
    { id: 'hub', label: 'Centre', type: 'select', default: 'printed', options: [
      { value: 'printed', label: 'Printed hub — no hardware, one print' },
      { value: 'bearing', label: '608 bearing + two finger caps' },
    ] },
    { id: 'weights', label: 'Arm weights', type: 'select', default: 'none', options: [
      { value: 'none', label: 'Solid arms' },
      { value: 'bearing', label: '608 bearings pressed in' },
      { value: 'penny', label: 'Stacks of US pennies' },
    ], help: 'Weight out at the tips makes it spin longer.' },
    { id: 'arms', label: 'Arms', type: 'range', min: 2, max: 6, step: 1, default: 3 },
    { id: 'thickness', label: 'Thickness', type: 'range', min: 6, max: 12, step: 0.5, default: 7, unit: 'mm', help: 'A 608 bearing is 7 mm wide.' },
    { id: 'rim', label: 'Rim round each hole', type: 'range', min: 1.6, max: 5, step: 0.2, default: 3, unit: 'mm', kind: 'wall' },
    { id: 'gap', label: 'Hub gap', type: 'range', min: 0.25, max: 0.8, step: 0.05, default: 0.4, unit: 'mm', showIf: (p) => p.hub === 'printed' },
    { id: 'fit', label: 'Press-fit allowance', type: 'range', min: 0, max: 0.6, step: 0.05, default: 0.2, unit: 'mm', help: 'Added to bearing and penny holes, which print a little small.', showIf: (p) => p.hub === 'bearing' || p.weights !== 'none' },
  ],
  build(ctx, p) {
    const { Manifold: M, CrossSection: CS } = ctx;
    const { clearance } = ctx.settings;
    const T = p.thickness;
    const printed = p.hub === 'printed' ? printedHub(CS, T, p.gap) : null;
    const hubHoleR = printed ? printed.holeR : (BEARING_608.od + p.fit) / 2;
    const pocketR = p.weights === 'bearing' ? (BEARING_608.od + p.fit) / 2 : p.weights === 'penny' ? (PENNY.d + p.fit) / 2 : 0;
    const lobeCore = pocketR || 8;
    const reach = hubHoleR + p.rim + lobeCore;          // hub centre to lobe centre
    const lobeR = lobeCore + p.rim;
    const tips = Array.from({ length: p.arms }, (_, i) => {
      const a = (2 * Math.PI * i) / p.arms + Math.PI / 2;
      return [reach * Math.cos(a), reach * Math.sin(a)];
    });

    // circles for hub and lobes, then a fillet where they meet
    const outline = CS.union([CS.circle(hubHoleR + p.rim, 96), ...tips.map((c) => CS.circle(lobeR, 96).translate(c))]).offset(5, 'Round', 2, 48).offset(-5, 'Round', 2, 48).simplify(0.005);
    let body = outline.extrude(T);
    const cuts = [];
    if (printed) cuts.push(spin(CS, printed.hole));
    else cuts.push(M.cylinder(T + 2, hubHoleR, hubHoleR, 96).translate([0, 0, -1]));
    if (pocketR) for (const c of tips) cuts.push(M.cylinder(T + 2, pocketR, pocketR, 96).translate([c[0], c[1], -1]));
    body = body.subtract(M.union(cuts));

    const bodies = [{ name: 'Spinner', manifold: body }];
    if (printed) bodies.push({ name: 'Hub', manifold: spin(CS, printed.hub) });
    else {
      // a small boss presses only on the bearing's inner race, so the caps don't rub the body
      const cap = () => M.union([
        M.cylinder(1.6, 10, 10, 72),
        M.cylinder(0.62, 5.5, 5.5, 48).translate([0, 0, 1.59]),
        M.cylinder(2.9, (BEARING_608.bore - 0.1) / 2, (BEARING_608.bore - 0.1) / 2, 48).translate([0, 0, 2.2]),
      ]);
      bodies.push({ name: 'Cap 1', manifold: cap() }, { name: 'Cap 2', manifold: cap() });
    }

    const verdicts = [];
    const bearings = (p.hub === 'bearing' ? 1 : 0) + (p.weights === 'bearing' ? p.arms : 0);
    if (printed) {
      if (p.gap < clearance) verdicts.push({ tone: 'bad', tag: 'FUSED', text: `A ${p.gap} mm hub gap is under your class clearance (${clearance} mm). The hub will weld into the body.` });
      else if (p.gap > clearance + 0.4) verdicts.push({ tone: 'warn', tag: 'WOBBLY', text: `${p.gap} mm round the hub is well over your class clearance. It spins, but wobbles.` });
      else verdicts.push({ tone: 'ok', tag: 'PRINTED HUB', text: `The hub prints inside the body with ${p.gap} mm of air on every face. Its ridge is ${round(printed.trap, 2)} mm wider than the narrowest part of the hole, so it can't push out. Twist it once to break the first layer free.` });
      if (printed.trap < 0.6) verdicts.push({ tone: 'warn', tag: 'SHALLOW RIDGE', text: `The hub's ridge overlaps the hole by only ${round(printed.trap, 2)} mm. A hard pinch could pop it out.` });
    }
    if (bearings) verdicts.push({ tone: 'ok', tag: 'HARDWARE', text: `Needs ${bearings} × 608 bearing (22 mm across, 7 mm wide — the skateboard size). Holes are ${p.fit} mm oversize; press bearings in with a vise or a flat book, not a hammer.` });
    if ((p.hub === 'bearing' || p.weights === 'bearing') && T < BEARING_608.width) verdicts.push({ tone: 'warn', tag: 'BEARING PROUD', text: `The body is ${T} mm thick and a 608 bearing is 7 mm wide, so the bearings stick out. Make it 7 mm.` });
    if (p.hub === 'bearing' && T > BEARING_608.width + 0.6) verdicts.push({ tone: 'warn', tag: 'CAPS RUB', text: `The bearing sits ${round((T - BEARING_608.width) / 2)} mm below each face, deeper than the caps' boss. The caps will rub the body. Make it 7 mm.` });
    if (p.weights === 'penny') verdicts.push({ tone: 'ok', tag: 'PENNIES', text: `Each arm holds a stack of ${Math.floor(T / PENNY.t)} pennies (${p.arms * Math.floor(T / PENNY.t)} in all). A drop of glue keeps the stacks in.` });
    if (p.weights === 'none') verdicts.push({ tone: 'ok', tag: 'NO WEIGHTS', text: 'Solid arms make it light, so it spins for seconds, not minutes. Weights out at the tips store more spin.' });

    return {
      bodies,
      layout: printed ? 'nested' : 'apart',
      verdicts,
      stats: [
        { label: 'Across the arms', value: `${round(2 * (reach + lobeR))} mm` },
        { label: 'Hardware', value: bearings ? `${bearings} × 608 bearing` : p.weights === 'penny' ? `${p.arms * Math.floor(T / PENNY.t)} pennies` : 'none' },
      ],
    };
  },
};

/* A hinge that prints flat and already assembled. Knuckles alternate between
   the two leaves; a cone pin on each Leaf A knuckle sits in a matching socket
   in the next Leaf B knuckle. Knuckles have a flat foot on the bed and every
   face that points down leans 40° from vertical, so no supports are needed. */
const HINGE_LEAN = (40 * Math.PI) / 180;

const hinge = {
  id: 'hinge',
  name: 'Print-in-place hinge',
  group: 'Fidgets',
  blurb: 'Two leaves joined by knuckles and cone pins, printed flat and already assembled. One leaf folds right over onto the other.',
  lesson: { href: 'lessons/3d-design/cad-and-printing/print-fidgets.html', label: 'Print-in-place fidgets' },
  params: [
    { id: 'width', label: 'Hinge length', type: 'range', min: 20, max: 80, step: 1, default: 40, unit: 'mm' },
    { id: 'leaf', label: 'Leaf width', type: 'range', min: 12, max: 40, step: 1, default: 22, unit: 'mm' },
    { id: 'knuckles', label: 'Knuckles', type: 'range', min: 3, max: 9, step: 2, default: 5 },
    { id: 'radius', label: 'Knuckle radius', type: 'range', min: 2.5, max: 6, step: 0.5, default: 3.5, unit: 'mm' },
    { id: 'thick', label: 'Leaf thickness', type: 'range', min: 1.2, max: 3, step: 0.2, default: 2, unit: 'mm', kind: 'wall' },
    { id: 'gap', label: 'Clearance', type: 'range', min: 0.25, max: 0.8, step: 0.05, default: 0.4, unit: 'mm' },
    { id: 'ring', label: 'Keyring hole', type: 'toggle', default: true },
  ],
  build(ctx, p) {
    const { Manifold: M, CrossSection: CS } = ctx;
    const { clearance } = ctx.settings;
    const r = p.radius, g = p.gap, L = p.leaf, W = p.width;
    const n = 2 * Math.floor(p.knuckles / 2) + 1;      // odd, so both ends belong to Leaf A
    const seg = (W - (n - 1) * g) / n;
    const t = Math.tan(HINGE_LEAN);

    // knuckle section in (x, z): the axis circle hulled to a narrow foot whose
    // sides lean 40° from vertical; Rs is how far it reaches when it turns
    const foot = r * Math.tan((Math.PI / 2 - HINGE_LEAN) / 2);
    const knuckle = CS.hull([CS.circle(r, 64).translate([0, r]), CS.square([2 * foot, 0.2], true).translate([0, 0.1])]);
    const Rs = Math.hypot(foot, r);
    // section in (x, z), extruded along the hinge axis from y0 to y1
    const alongY = (section, y0, y1) => section.extrude(y1 - y0).rotate([90, 0, 0]).translate([0, y1, 0]);

    // cone pin, half-angle 50° so its underside leans 40°; sized so two
    // sockets fit in one knuckle
    const deep = g / Math.cos(HINGE_LEAN);
    const rp = Math.min(0.55 * r, (seg / 2 - 0.4 - deep) / t);
    const hp = rp * t;
    const pinSection = poly(CS, [[0, -0.3], [rp, -0.3], [rp, 0], [0, hp]]);
    const pin = spin(CS, pinSection, 48), socket = spin(CS, pinSection.offset(g, 'Miter', 4), 48);
    // +1: the pin points up the axis (+y); −1: down it
    const place = (solid, y, dir) => solid.rotate([dir > 0 ? -90 : 90, 0, 0]).translate([0, y, r]);

    const ranges = Array.from({ length: n }, (_, j) => {
      const y0 = -W / 2 + j * (seg + g);
      return { y0, y1: y0 + seg, a: j % 2 === 0 };
    });
    const leaf = (side) => {
      // x from the axis outward; only the outer corners are rounded
      const plate = roundedRect(CS, L + 4, W, 3).translate([side * (L + 4) / 2 - side * 4, 0])
        .intersect(CS.square([L + 1, W + 2]).translate([side > 0 ? 0 : -L - 1, -W / 2 - 1]));
      let solid = plate.extrude(p.thick);
      const mine = ranges.filter((k) => k.a === (side < 0));
      const theirs = ranges.filter((k) => k.a !== (side < 0));
      solid = solid.subtract(M.union(theirs.map((k) => alongY(CS.circle(Rs + g, 64).translate([0, r]), k.y0 - g, k.y1 + g))));
      return solid.add(M.union(mine.map((k) => alongY(knuckle, k.y0, k.y1))));
    };

    let A = leaf(-1), B = leaf(1);
    const pins = [], sockets = [];
    ranges.forEach((k, j) => {
      if (!k.a) return;
      if (j > 0) { pins.push(place(pin, k.y0, -1)); sockets.push(place(socket, k.y0, -1)); }
      if (j < n - 1) { pins.push(place(pin, k.y1, 1)); sockets.push(place(socket, k.y1, 1)); }
    });
    A = A.add(M.union(pins));
    B = B.subtract(M.union(sockets));
    if (p.ring) A = A.subtract(M.cylinder(p.thick + 2, 2.5, 2.5, 40).translate([-L + 5, 0, -1]));

    const verdicts = [];
    if (g < clearance) verdicts.push({ tone: 'bad', tag: 'FUSED', text: `${g} mm round the knuckles is under your class clearance (${clearance} mm). The hinge will print stuck.` });
    else verdicts.push({ tone: 'ok', tag: 'PRINT-IN-PLACE', text: `${g} mm of air round every knuckle and pin. Flex it gently both ways after printing to break the first layer free.` });
    if (rp < 1) verdicts.push({ tone: 'warn', tag: 'SMALL PINS', text: `Each knuckle is only ${round(seg)} mm long, so the cone pins shrink to ${round(2 * rp)} mm across and may snap. Use fewer knuckles or a longer hinge.` });
    if (p.thick >= r) verdicts.push({ tone: 'warn', tag: 'HALF FOLD', text: `Leaves ${p.thick} mm thick on ${r} mm knuckles hit each other before folding flat. Make the knuckles bigger than the leaves are thick.` });

    return {
      bodies: [{ name: 'Leaf A', manifold: A }, { name: 'Leaf B', manifold: B }],
      layout: 'nested',
      verdicts,
      stats: [
        { label: 'Knuckles', value: `${n} × ${round(seg)} mm` },
        { label: 'Cone pins', value: `${n - 1} × Ø${round(2 * rp)} mm` },
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
  lesson: { href: 'lessons/3d-design/cad-and-printing/print-fidgets.html', label: 'Print-in-place fidgets' },
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

/* ── mechanisms & 3-in-1 print-in-place challenges ────────────────────── */

const wheelAxle = {
  id: 'wheel-axle',
  name: 'Captive wheel & axle',
  group: 'Mechanisms',
  blurb: 'A wheel captured on a central axle by a 45° conical retaining head. Prints in place without supports or assembly.',
  lesson: { href: 'lessons/3d-design/cad-and-printing/3d-printing.html#pip-mechanisms', label: '3D printing & mechanisms' },
  params: [
    { id: 'wheelD', label: 'Wheel diameter', type: 'range', min: 20, max: 70, step: 2, default: 40, unit: 'mm' },
    { id: 'wheelW', label: 'Wheel width', type: 'range', min: 6, max: 24, step: 1, default: 10, unit: 'mm', kind: 'wall' },
    { id: 'axleD', label: 'Axle diameter', type: 'range', min: 5, max: 14, step: 1, default: 8, unit: 'mm' },
    { id: 'gap', label: 'Clearance gap', type: 'range', min: 0.25, max: 0.8, step: 0.05, default: 0.4, unit: 'mm', help: 'Air gap between axle shaft and wheel bore.' },
    { id: 'spokes', label: 'Wheel pattern', type: 'select', default: 'spoked', options: [
      { value: 'spoked', label: '4-spoke cutouts' },
      { value: 'solid', label: 'Solid disc' },
      { value: 'gear', label: 'Gear / cog teeth' },
    ] },
    { id: 'tool', label: 'Tool feature', type: 'select', default: 'plain', options: [
      { value: 'plain', label: 'Plain test wheel' },
      { value: 'measuring', label: 'Measuring index pointer & marks' },
      { value: 'spool', label: 'Cord / wire spool groove' },
    ] },
  ],
  build(ctx, p) {
    const { Manifold: M, CrossSection: CS } = ctx;
    const { nozzle, clearance } = ctx.settings;
    const g = p.gap;
    const axleR = p.axleD / 2;
    const wheelR = p.wheelD / 2;
    const wheelW = p.wheelW;
    const baseT = 3.2;
    const baseW = Math.max(p.wheelD + 10, 42);
    const baseD = Math.max(axleR * 4 + 14, 26);

    const plate = CS.square([baseW, baseD], true).offset(3, 'Round', 2, 24).extrude(baseT);
    const holeR = 2.2;
    const holeX = baseW / 2 - 2;
    const holes = M.union([
      M.cylinder(baseT + 2, holeR, holeR, 20).translate([-holeX, 0, -1]),
      M.cylinder(baseT + 2, holeR, holeR, 20).translate([holeX, 0, -1]),
    ]);
    const base = plate.subtract(holes);

    const bossH = 1.0;
    const boss = M.cylinder(bossH, axleR + bossH, axleR, 36).translate([0, 0, baseT - 0.01]);

    const capH = Math.min(2.2, axleR * 0.45);
    const capR = axleR + capH;
    const shaftH = bossH + g + wheelW + g;
    const shaft = M.cylinder(shaftH, axleR, axleR, 36).translate([0, 0, baseT]);

    const headZ = baseT + bossH + g + wheelW;
    const capCone = M.cylinder(capH, axleR, capR, 36).translate([0, 0, headZ]);
    const capTop = M.cylinder(1.0, capR, Math.max(axleR, capR - 1.0), 36).translate([0, 0, headZ + capH - 0.01]);

    let pointer = null;
    if (p.tool === 'measuring') {
      const ptrSec = CS.hull([
        CS.circle(1.8, 16).translate([0, -baseD / 2 + 2]),
        CS.square([1.8, 3.5], true).translate([0, -wheelR + 1]),
      ]);
      pointer = ptrSec.extrude(baseT + bossH + g + 2);
    }

    let mount = M.union([base, boss, shaft, capCone, capTop]);
    if (pointer) mount = mount.add(pointer);

    const z0 = baseT + bossH + g;
    const hubR = axleR + g + 3;

    let wheelSolid = M.cylinder(wheelW, wheelR, wheelR, 48).translate([0, 0, z0]);

    const boreBottom = M.cylinder(bossH + 0.1, axleR + g + bossH, axleR + g, 36).translate([0, 0, z0 - 0.05]);
    const boreMain = M.cylinder(wheelW + 1, axleR + g, axleR + g, 36).translate([0, 0, z0 - 0.5]);
    const boreTop = M.cylinder(capH + g + 0.1, axleR + g, capR + g, 36).translate([0, 0, headZ - g]);
    const boreCapRelief = M.cylinder(2, capR + g, capR + g, 36).translate([0, 0, headZ + capH - 0.01]);

    let wheel = wheelSolid.subtract(M.union([boreBottom, boreMain, boreTop, boreCapRelief]));

    if (p.spokes === 'spoked' && wheelR - hubR > 5) {
      const spokeCutters = [];
      const nSpokes = 4;
      const cutR = Math.max(1.5, (wheelR - hubR - 2) / 2);
      const cutDist = hubR + cutR;
      for (let i = 0; i < nSpokes; i++) {
        const ang = (2 * Math.PI * i) / nSpokes + Math.PI / 4;
        const cx = cutDist * Math.cos(ang), cy = cutDist * Math.sin(ang);
        spokeCutters.push(M.cylinder(wheelW + 2, cutR, cutR, 24).translate([cx, cy, z0 - 1]));
      }
      wheel = wheel.subtract(M.union(spokeCutters));
    } else if (p.spokes === 'gear') {
      const teeth = Math.max(8, Math.floor(p.wheelD * 0.7));
      const notchW = 2, notchD = 1.5;
      const cutters = [];
      for (let i = 0; i < teeth; i++) {
        const ang = (2 * Math.PI * i) / teeth;
        cutters.push(M.cube([notchW, notchD * 2, wheelW + 2], true).translate([0, wheelR, z0 + wheelW / 2]).rotate([0, 0, (ang * 180) / Math.PI]));
      }
      wheel = wheel.subtract(M.union(cutters));
    }

    if (p.tool === 'measuring') {
      const marks = [];
      const nMarks = 8;
      for (let i = 0; i < nMarks; i++) {
        const ang = (2 * Math.PI * i) / nMarks;
        marks.push(M.cube([1.2, 2.0, 1.2], true).translate([0, wheelR - 0.8, z0 + wheelW - 0.6]).rotate([0, 0, (ang * 180) / Math.PI]));
      }
      wheel = wheel.subtract(M.union(marks));
    }

    if (p.tool === 'spool' && wheelW >= 10 && wheelR - hubR > 4) {
      const grooveH = wheelW - 4;
      const grooveD = Math.min(5, (wheelR - hubR) * 0.45);
      const groove = M.cylinder(grooveH, wheelR + 1, wheelR + 1, 48).translate([0, 0, z0 + 2])
        .subtract(M.cylinder(grooveH + 2, wheelR - grooveD, wheelR - grooveD, 48).translate([0, 0, z0 + 1]));
      wheel = wheel.subtract(groove);
    }

    const verdicts = [];
    if (g < clearance) {
      verdicts.push({ tone: 'bad', tag: 'FUSED', text: `${g} mm clearance is below your class clearance (${clearance} mm). The wheel will weld to the axle.` });
    } else if (g > clearance + 0.35) {
      verdicts.push({ tone: 'warn', tag: 'LOOSE', text: `${g} mm clearance leaves too much wobble.` });
    } else {
      verdicts.push({ tone: 'ok', tag: 'CAPTIVE FIT', text: `${g} mm air gap keeps the wheel free to rotate while permanently retained by the 45° conical head.` });
    }

    verdicts.push({ tone: 'ok', tag: 'SUPPORTS OFF', text: 'Axle retaining head and base boss use 45° self-supporting angles. Turn SUPPORTS OFF in the slicer — support material would fill the axle gap and lock the wheel.' });
    verdicts.push({ tone: 'ok', tag: 'ADHESION SKIRT', text: 'Use a Skirt only — never a Brim. A standard brim bridges across the 0.4 mm gap at layer 1, gluing the wheel to the base.' });

    const solidWalls = Math.ceil(axleR / nozzle);
    verdicts.push({ tone: 'ok', tag: 'SHELL STRENGTH', text: `Axle radius is ${axleR} mm. Set Wall Count to at least ${Math.min(4, solidWalls)} perimeters (≥1.2 mm shell) so the axle prints solid for maximum shear strength.` });

    return {
      bodies: [{ name: 'Mount & Axle', manifold: mount }, { name: 'Wheel', manifold: wheel }],
      layout: 'nested',
      overhangNote: 'The wheel floats above the base on a calibrated clearance gap. Print with supports OFF — slicer supports will fill the radial gap and fuse the wheel to the axle.',
      verdicts,
      stats: [
        { label: 'Wheel diameter / width', value: `Ø${p.wheelD} × ${p.wheelW} mm` },
        { label: 'Axle diameter', value: `Ø${p.axleD} mm` },
        { label: 'Radial & axial clearance', value: `${g} mm` },
        { label: 'Retaining head overlap', value: `${round(capR - axleR, 2)} mm` },
      ],
    };
  },
};

const rollingTool = {
  id: 'rolling-tool',
  name: 'Rolling creature tool',
  group: 'Mechanisms',
  blurb: 'A 3-in-1 print-in-place design challenge: a functional desk tool, sculpted in the likeness of an animal or vehicle, with captive rolling wheels on axles.',
  lesson: { href: 'lessons/3d-design/3d-design.html#grand-challenge', label: '3-in-1 Design Challenge' },
  params: [
    { id: 'likeness', label: 'Likeness form', type: 'select', default: 'turtle', options: [
      { value: 'turtle', label: 'Sea turtle / tortoise' },
      { value: 'beetle', label: 'Scarab beetle' },
      { value: 'rover', label: 'Planetary rover' },
      { value: 'armadillo', label: 'Armadillo' },
    ] },
    { id: 'tool', label: 'Tool utility', type: 'select', default: 'caddy', options: [
      { value: 'caddy', label: 'Desk pencil & tool caddy' },
      { value: 'tape', label: 'Tape / cord dispenser & reel' },
      { value: 'gauge', label: 'Distance measuring wheel' },
    ] },
    { id: 'wheelD', label: 'Wheel diameter', type: 'range', min: 20, max: 48, step: 2, default: 30, unit: 'mm' },
    { id: 'wheelW', label: 'Wheel width', type: 'range', min: 6, max: 18, step: 1, default: 10, unit: 'mm', kind: 'wall' },
    { id: 'axleD', label: 'Axle diameter', type: 'range', min: 5, max: 12, step: 1, default: 7, unit: 'mm' },
    { id: 'gap', label: 'Clearance gap', type: 'range', min: 0.25, max: 0.8, step: 0.05, default: 0.4, unit: 'mm' },
    { id: 'bodyL', label: 'Body length', type: 'range', min: 60, max: 120, step: 2, default: 80, unit: 'mm' },
    { id: 'bodyW', label: 'Body width', type: 'range', min: 36, max: 70, step: 2, default: 50, unit: 'mm' },
    { id: 'bodyH', label: 'Body height', type: 'range', min: 20, max: 46, step: 1, default: 28, unit: 'mm' },
    { id: 'tread', label: 'Wheel tread', type: 'select', default: 'ribbed', options: [
      { value: 'smooth', label: 'Smooth' },
      { value: 'ribbed', label: 'Ribbed notches' },
      { value: 'knobby', label: 'Knobby studs' },
    ] },
  ],
  build(ctx, p) {
    const { Manifold: M, CrossSection: CS } = ctx;
    const { nozzle, clearance } = ctx.settings;
    const g = p.gap;
    const wD = p.wheelD;
    const wR = wD / 2;
    const wW = p.wheelW;
    const aD = p.axleD;
    const aR = aD / 2;
    const bL = p.bodyL;
    const bW = p.bodyW;
    const bH = p.bodyH;

    let bodySec;
    if (p.likeness === 'turtle') {
      bodySec = CS.circle(1, 36).scale([bL / 2, bW / 2]);
      const head = CS.circle(bW * 0.2, 24).translate([bL * 0.52, 0]);
      const tail = CS.hull([CS.circle(1, 12).translate([-bL * 0.56, 0]), CS.square([2, bW * 0.15], true).translate([-bL * 0.46, 0])]);
      const fL = CS.hull([CS.circle(bW * 0.1, 16).translate([bL * 0.2, bW * 0.46]), CS.circle(bW * 0.05, 16).translate([bL * 0.3, bW * 0.58])]);
      const fR = fL.mirror([0, 1]);
      const rL = CS.hull([CS.circle(bW * 0.08, 16).translate([-bL * 0.22, bW * 0.4]), CS.circle(bW * 0.04, 16).translate([-bL * 0.3, bW * 0.5])]);
      const rR = rL.mirror([0, 1]);
      bodySec = CS.union([bodySec, head, tail, fL, fR, rL, rR]);
    } else if (p.likeness === 'beetle') {
      const thorax = CS.circle(1, 24).scale([bL * 0.2, bW * 0.4]).translate([bL * 0.18, 0]);
      const abdomen = CS.circle(1, 24).scale([bL * 0.3, bW * 0.44]).translate([-bL * 0.16, 0]);
      const horns = CS.hull([CS.circle(2, 12).translate([bL * 0.54, bW * 0.14]), CS.circle(3, 12).translate([bL * 0.36, 0])]);
      const hornR = horns.mirror([0, 1]);
      bodySec = CS.union([thorax, abdomen, horns, hornR]);
    } else if (p.likeness === 'rover') {
      bodySec = CS.square([bL * 0.82, bW * 0.78], true).offset(3, 'Round', 2, 20);
      const mast = CS.square([bL * 0.14, bW * 0.32], true).translate([bL * 0.44, 0]);
      bodySec = CS.union([bodySec, mast]);
    } else {
      bodySec = CS.hull([
        CS.circle(bW * 0.22, 24).translate([bL * 0.44, 0]),
        CS.circle(bW * 0.42, 24).translate([0, 0]),
        CS.circle(bW * 0.14, 24).translate([-bL * 0.44, 0]),
      ]);
    }

    const floorT = 3.0;
    let bodySolid = bodySec.extrude(bH);

    const wellL = wD + 2 * g + 4;
    const wellW = wW + 2 * g + 2;
    const wellH = bH + 2;
    const wellCavity = M.cube([wellL, wellW, wellH], true).translate([0, 0, bH / 2 + 1]);

    const capH = Math.min(2.2, aR * 0.45);
    const capR = aR + capH;
    const axleBaseZ = floorT;
    const wheelZ0 = axleBaseZ + g + 0.8;
    const axleShaftH = wheelZ0 + wW + g - axleBaseZ;

    const axleBoss = M.cylinder(0.8, aR + 0.8, aR, 32).translate([0, 0, axleBaseZ]);
    const axleShaft = M.cylinder(axleShaftH, aR, aR, 32).translate([0, 0, axleBaseZ]);
    const headZ = wheelZ0 + wW;
    const axleCap = M.cylinder(capH, aR, capR, 32).translate([0, 0, headZ]);
    const axleCapTop = M.cylinder(1.0, capR, aR, 32).translate([0, 0, headZ + capH - 0.01]);
    const axleAssembly = M.union([axleBoss, axleShaft, axleCap, axleCapTop]);

    let chassis = bodySolid.subtract(wellCavity).add(axleAssembly);

    if (p.tool === 'caddy') {
      const wellR = Math.max(3, Math.min(9, (bW * 0.3) / 2));
      const wellDepth = Math.max(5, bH - floorT - 1);
      const frontWellX = Math.min(bL * 0.36, (bL + wellL) / 4 + wellL / 2);
      const backWellX = -frontWellX;
      const penWells = M.union([
        M.cylinder(wellDepth + 2, wellR, wellR, 24).translate([frontWellX, 0, floorT + 1]),
        M.cylinder(wellDepth + 2, wellR, wellR, 24).translate([backWellX, 0, floorT + 1]),
      ]);
      chassis = chassis.subtract(penWells);
    } else if (p.tool === 'tape') {
      const slotW = Math.min(14, wW + 4);
      const feedSlot = M.cube([bL * 0.38, slotW, bH + 2], true).translate([bL * 0.34, 0, bH / 2]);
      chassis = chassis.subtract(feedSlot);
    } else if (p.tool === 'gauge') {
      const pointer = CS.hull([
        CS.circle(1.5, 12).translate([-wellL / 2 - 2, 0]),
        CS.square([1.5, 3], true).translate([-wR - g, 0]),
      ]).extrude(Math.min(12, bH * 0.7)).translate([0, 0, floorT]);
      chassis = chassis.add(pointer);
    }

    let wheelSolid = M.cylinder(wW, wR, wR, 48).translate([0, 0, wheelZ0]);
    const boreBottom = M.cylinder(1.0, aR + g + 0.8, aR + g, 32).translate([0, 0, wheelZ0 - 0.1]);
    const boreMain = M.cylinder(wW + 1, aR + g, aR + g, 32).translate([0, 0, wheelZ0 - 0.5]);
    const boreTop = M.cylinder(capH + g + 0.1, aR + g, capR + g, 32).translate([0, 0, headZ - g]);
    const boreRelief = M.cylinder(2, capR + g, capR + g, 32).translate([0, 0, headZ + capH - 0.01]);
    let wheel = wheelSolid.subtract(M.union([boreBottom, boreMain, boreTop, boreRelief]));

    if (p.tread === 'knobby') {
      const teeth = 14;
      const cutters = [];
      for (let i = 0; i < teeth; i++) {
        const ang = (2 * Math.PI * i) / teeth;
        cutters.push(M.cylinder(wW + 2, 1.2, 1.2, 12).translate([wR * Math.cos(ang), wR * Math.sin(ang), wheelZ0 - 1]));
      }
      wheel = wheel.subtract(M.union(cutters));
    } else if (p.tread === 'ribbed') {
      const ribs = 10;
      const cuts = [];
      for (let i = 0; i < ribs; i++) {
        const ang = (2 * Math.PI * i) / ribs;
        cuts.push(M.cube([1.4, 1.8, wW + 2], true).translate([0, wR, wheelZ0 + wW / 2]).rotate([0, 0, (ang * 180) / Math.PI]));
      }
      wheel = wheel.subtract(M.union(cuts));
    }

    const verdicts = [];
    if (g < clearance) {
      verdicts.push({ tone: 'bad', tag: 'FUSED', text: `${g} mm clearance is below class clearance (${clearance} mm). The captive wheel will weld to the chassis axle.` });
    } else if (g > clearance + 0.35) {
      verdicts.push({ tone: 'warn', tag: 'WOBBLY', text: `${g} mm clearance leaves too much play.` });
    } else {
      verdicts.push({ tone: 'ok', tag: 'CAPTIVE ROLL', text: `${g} mm clearance keeps the wheel free to roll while trapped captive on the central axle post.` });
    }

    verdicts.push({ tone: 'ok', tag: 'SUPPORTS OFF', text: 'All retaining flanges use 45° self-supporting angles. Disable slicer supports so the axle cavity stays clean.' });
    verdicts.push({ tone: 'ok', tag: 'ADHESION SKIRT', text: 'Print with Skirt only. Never use a Brim, as it bridges the wheel-to-chassis air gap on layer 1.' });

    const solidWalls = Math.ceil(aR / nozzle);
    verdicts.push({ tone: 'ok', tag: 'WALL COUNT', text: `Use 3 to 4 perimeters (Wall count ≥ 3) so the ${round(aD)} mm axle prints solid concentric loops for maximum shear strength.` });

    return {
      bodies: [{ name: 'Chassis & Axle', manifold: chassis }, { name: 'Wheel', manifold: wheel }],
      layout: 'nested',
      overhangNote: 'The captive wheel prints in-place around the axle with self-supporting 45° angles. Print with supports OFF to prevent fusing the bearing journal.',
      verdicts,
      stats: [
        { label: 'Likeness', value: p.likeness },
        { label: 'Tool mode', value: p.tool },
        { label: 'Wheel diameter / width', value: `Ø${wD} × ${wW} mm` },
        { label: 'Axle diameter', value: `Ø${aD} mm` },
        { label: 'Clearance', value: `${g} mm` },
      ],
    };
  },
};

export const PARTS = [rollingTool, wheelAxle, caseCase, captured, spinner, hinge, rings, gears, spiral, tag, storage, stand, clip, comb];
export const PART_GROUPS = ['Mechanisms', 'Electronics housings', 'Fidgets', 'Everyday', 'Calibration'];
export const partById = (id) => PARTS.find((p) => p.id === id);
