/* technic.mjs — LEGO Technic-compatible sizes for Forge's printed gears, worms, racks and beams.
 *
 * The maths is pure (no DOM, no kernel) so `node --test` checks it directly; the three solid helpers at the
 * bottom take Forge's build ctx. Numbers come from published measurements, not guesses:
 *
 *   Stud pitch 8.0 mm (exact), axle 4.8 mm, bearing hole measured 4.9 mm, counterbore measured
 *   6.2 mm across × 0.8 mm deep, beams and liftarms measured 7.4–7.8 mm wide:
 *     R. Cailliau, "Lego Dimensions: General Considerations",
 *     https://www.cailliau.org/Alphabetical/L/Lego/Dimensions/General%20Considerations/%20General%20Considerations-en.html
 *   Axle cross 4.78–4.80 mm tip to tip, arms 1.79–1.83 mm wide; worm about 9.6 mm across, module 1:
 *     fa-mc/vibe-cading, docs/lego-technic.md, https://github.com/fa-mc/vibe-cading/blob/main/docs/lego-technic.md
 *   Gear pitch radius = teeth ÷ 16 studs (so 16 teeth = 1 stud, 24 teeth = 1.5), which on an 8 mm stud is
 *   teeth ÷ 2 mm: module 1. Two 16s mesh 2 studs apart, 8 + 24 and 12 + 20 also 2, 24 + 40 four:
 *     BrickNerd, "Everything You Want To Know About LEGO Gears" (2026),
 *     https://bricknerd.com/home/everything-you-want-to-know-about-lego-gears-5-10-24
 *
 * Not published by any of those: the pressure angle (we use the standard 20°, which meshes with real
 * gears in practice) and the worm's thread form (ours uses 30° flanks so it prints upright, see drive-parts.mjs).
 *
 * "LEGO" is a trademark of the LEGO Group. Forge's parts are only sized to fit; the UI says
 * "LEGO Technic-compatible" and carries no branding.
 */

export const STUD = 8;                                   // mm between neighbouring holes / studs
export const MODULE = 1;                                 // pitch Ø (mm) = teeth × module
export const AXLE = { across: 4.8, arm: 1.8 };           // cross axle: tip to tip, and the width of each arm
export const PIN_HOLE = 4.8;                             // nominal round hole (axles turn in it, pins click into it)
export const COUNTERBORE = { d: 6.2, depth: 0.8 };       // the recess at each end of a pin hole that the pin's collar snaps into
export const BEAM = { width: 7.4, thick: 7.4 };          // low end of the measured 7.4–7.8 mm, so printed beams (which swell) still fit side by side
export const WORM_PITCH_RADIUS = 4;                      // 8 mm pitch Ø + 2 × module = 10 mm tips, about the real worm's 9.6 mm
export const GEAR_TEETH = [8, 12, 16, 20, 24, 36, 40];   // the standard round-gear sizes

export const LEGO_LABEL = 'LEGO Technic-compatible';

/* Holes printed a touch large: half the class clearance on the diameter (c/4 a side). Printed holes come out
   small, so this lands close to the measured 4.9 mm bearing hole at the usual 0.3 mm clearance. */
export const pinHoleDiameter = (clearance) => PIN_HOLE + clearance / 2;

/* Counter-clockwise outline of a cross-axle hole, grown by half the clearance (so a real axle slides in and
   is held without wobble). */
export function crossAxleOutline(clearance = 0.3) {
  const a = (AXLE.across + clearance / 2) / 2;            // half tip-to-tip
  const w = (AXLE.arm + clearance / 2) / 2;               // half arm width
  return [[a, -w], [a, w], [w, w], [w, a], [-w, a], [-w, w], [-a, w], [-a, -w], [-w, -w], [-w, -a], [w, -a], [w, -w]];
}

/* Smallest distance from the hole's edge out to a circle of radius r (the plastic left round the axle). */
export const wallAroundCross = (r, clearance = 0.3) => r - (AXLE.across + clearance / 2) / 2;

/* Where a distance lands on the stud grid: whole studs, half studs, or neither. */
export function studFit(mm, tol = 0.05) {
  const studs = mm / STUD;
  const halves = Math.round(studs * 2);
  const off = Math.abs(studs * 2 - halves) * (STUD / 2);
  if (off > tol) return { studs, kind: 'off', nearest: halves / 2, offBy: off };
  return { studs: halves / 2, kind: halves % 2 === 0 ? 'whole' : 'half', nearest: halves / 2, offBy: off };
}

const fmt = (v) => String(Number(v.toFixed(3)));

/* Standard gear sizes that put a pair with `teeth` on whole studs (or half studs). */
export function gridPartners(teeth, kind = 'whole') {
  return GEAR_TEETH.filter((z) => studFit((MODULE * (teeth + z)) / 2).kind === kind);
}

/* A verdict for anything that must sit on the stud grid. `what` names the distance. */
export function gridVerdict(mm, what, partners = null, onGrid = 'put both axles straight through one beam') {
  const f = studFit(mm);
  if (f.kind === 'whole') return { tone: 'ok', tag: 'ON THE GRID', text: `${what} is ${fmt(mm)} mm, exactly ${fmt(f.studs)} stud${f.studs === 1 ? '' : 's'}: ${onGrid}.` };
  if (f.kind === 'half') return { tone: 'ok', tag: 'HALF STUD', text: `${what} is ${fmt(mm)} mm, ${fmt(f.studs)} studs. That needs a half-stud offset: holes in two beams a half stud apart, a beam with a half-stud hole, or the printed beam.` };
  const tip = partners && partners.length ? ` Sizes that land on whole studs: ${partners.join(', ')} teeth.` : '';
  return { tone: 'warn', tag: 'OFF THE GRID', text: `${what} is ${fmt(mm)} mm (${fmt(f.studs)} studs), not a whole or half stud, so standard beams can't hold the pair at the right spacing. Use the printed beam, which drills the holes exactly that far apart.${tip}` };
}

/* Hole centres for a beam that holds two axles `dist` apart: every whole stud from the first, then the
   second axle's hole. A grid hole closer than ~1.5 hole widths to the second one is dropped so the two
   don't merge (that happens for half-stud and off-grid pairs). Ends one stud past each axle when `extend`. */
export function beamHoles(dist, extend = 1) {
  const xs = [];
  for (let k = -extend; k * STUD < dist + 1e-6; k++) {
    const x = k * STUD;
    if (Math.abs(x - dist) < 1e-6 || dist - x >= 7) xs.push(x);
  }
  if (!xs.some((x) => Math.abs(x - dist) < 1e-6)) xs.push(dist);
  for (let k = 1; k <= extend; k++) xs.push(dist + k * STUD);
  return xs;
}

/* ── solids (need Forge's ctx) ────────────────────────────────────────── */

/* A cross-axle hole through a part `h` tall, as a solid to subtract. */
export function crossHoleSolid(ctx, h, at = [0, 0]) {
  return ctx.CrossSection.ofPolygons([crossAxleOutline(ctx.settings.clearance)]).extrude(h + 2).translate([at[0], at[1], -1]);
}

/* A round Technic pin hole through `h`, with the collar recess at the top (and bottom when `both`). */
export function pinHoleSolid(ctx, h, at = [0, 0], { both = true } = {}) {
  const M = ctx.Manifold;
  const c = ctx.settings.clearance;
  const r = pinHoleDiameter(c) / 2, rc = (COUNTERBORE.d + c / 2) / 2;
  const parts = [M.cylinder(h + 2, r, r, 40).translate([at[0], at[1], -1]), M.cylinder(COUNTERBORE.depth + 1, rc, rc, 40).translate([at[0], at[1], h - COUNTERBORE.depth])];
  if (both) parts.push(M.cylinder(COUNTERBORE.depth + 1, rc, rc, 40).translate([at[0], at[1], -1]));
  return M.union(parts);
}

/* A straight beam (rounded ends) lying flat, with round pin holes at `xs` (mm along x, y = 0). Thickness is a
   full beam, or half for a thin one. Pin holes keep their collar recesses only on a full-thickness beam. */
export function beamSolid(ctx, xs, { thick = BEAM.thick, width = BEAM.width, cross = [] } = {}) {
  const { Manifold: M, CrossSection: CS } = ctx;
  const lo = Math.min(...xs), hi = Math.max(...xs);
  const r = width / 2;
  const outline = CS.hull([CS.circle(r, 48).translate([lo, 0]), CS.circle(r, 48).translate([hi, 0])]);
  let beam = outline.extrude(thick);
  const holes = xs.map((x, i) => (cross.includes(i) ? crossHoleSolid(ctx, thick, [x, 0]) : pinHoleSolid(ctx, thick, [x, 0], { both: thick >= BEAM.thick - 1e-6 })));
  beam = beam.subtract(M.union(holes));
  return beam;
}

/* ── shared params ────────────────────────────────────────────────────── */

export const isLego = (p) => p.fit === 'lego';

export const fitParam = {
  id: 'fit', label: 'Fit', type: 'select', default: 'metric',
  options: [{ value: 'metric', label: 'Metric (pick module and bore)' }, { value: 'lego', label: `${LEGO_LABEL} (module 1, cross axle)` }],
  help: 'LEGO Technic-compatible parts use module 1 teeth, a cross-axle hole and the standard gear sizes, so they mesh with real Technic gears on the 8 mm stud grid.',
};

/* Hide a metric-only spec (module, bore, free tooth count) while the LEGO fit is chosen. */
export const metricOnly = (spec) => ({ ...spec, showIf: (p) => !isLego(p) && (spec.showIf ? spec.showIf(p) : true) });

export const legoTeethParam = (id, label, def, sizes = GEAR_TEETH) => ({
  id, label, type: 'select', default: String(def), showIf: isLego,
  options: sizes.map((z) => ({ value: String(z), label: `${z} teeth` })),
});
