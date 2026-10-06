/* outlines.mjs — 2D outlines Forge extrudes into parts. Pure math, no DOM and
 * no geometry kernel, so `node --test` can check them directly.
 *
 *   textOutline(font, text, size) → { contours, width, ascent }
 *       Glyph outlines from a three.js typeface JSON (assets/vendor/fonts/),
 *       flattened to polygons in mm, baseline at y = 0, starting at x = 0.
 *       Contours are returned as-is; fill them with the EvenOdd rule so the
 *       holes in letters like O, A and 8 stay open.
 *
 *   spurGearOutline({ module, teeth, pressureAngle, backlash }) → { points, pitchRadius, ... }
 *       An involute spur gear, the tooth shape real gearboxes use, so two
 *       printed gears with the same module mesh and roll instead of grinding.
 */

/* ── text ─────────────────────────────────────────────────────────────── */

const CURVE_STEPS = { q: 6, b: 8 };

function glyphContours(glyph, scale, offsetX) {
  const contours = [];
  if (!glyph?.o) return contours;
  const cmd = glyph.o.trim().split(/\s+/);
  let current = null;
  let x = 0, y = 0;
  const X = (v) => Number(v) * scale + offsetX;
  const Y = (v) => Number(v) * scale;
  for (let i = 0; i < cmd.length;) {
    const op = cmd[i++];
    if (op === 'm') {
      current = [];
      contours.push(current);
      x = X(cmd[i++]); y = Y(cmd[i++]);
      current.push([x, y]);
    } else if (op === 'l') {
      x = X(cmd[i++]); y = Y(cmd[i++]);
      current.push([x, y]);
    } else if (op === 'q') {
      // typeface.js order: end point first, then the control point
      const ex = X(cmd[i++]), ey = Y(cmd[i++]);
      const cx = X(cmd[i++]), cy = Y(cmd[i++]);
      for (let s = 1; s <= CURVE_STEPS.q; s++) {
        const t = s / CURVE_STEPS.q, u = 1 - t;
        current.push([u * u * x + 2 * u * t * cx + t * t * ex, u * u * y + 2 * u * t * cy + t * t * ey]);
      }
      x = ex; y = ey;
    } else if (op === 'b') {
      const ex = X(cmd[i++]), ey = Y(cmd[i++]);
      const c1x = X(cmd[i++]), c1y = Y(cmd[i++]);
      const c2x = X(cmd[i++]), c2y = Y(cmd[i++]);
      for (let s = 1; s <= CURVE_STEPS.b; s++) {
        const t = s / CURVE_STEPS.b, u = 1 - t;
        current.push([
          u * u * u * x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex,
          u * u * u * y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey,
        ]);
      }
      x = ex; y = ey;
    } else {
      throw new Error(`unknown outline command "${op}"`);
    }
  }
  // drop a closing point that repeats the first, and slivers
  return contours
    .map((c) => {
      const [fx, fy] = c[0], [lx, ly] = c[c.length - 1];
      return Math.hypot(fx - lx, fy - ly) < 1e-6 ? c.slice(0, -1) : c;
    })
    .filter((c) => c.length >= 3);
}

/* `size` is the cap height in mm (the height of a capital letter), which is
   what students measure with calipers, rather than the font's em size. */
export function textOutline(font, text, size) {
  const capHeight = (font.glyphs.H?.o ? glyphBounds(font.glyphs.H).maxY : font.ascender * 0.7) || font.resolution * 0.7;
  const scale = size / capHeight;
  const contours = [];
  let pen = 0;
  for (const ch of String(text)) {
    const glyph = font.glyphs[ch] || font.glyphs['?'];
    contours.push(...glyphContours(glyph, scale, pen));
    pen += (glyph?.ha ?? font.resolution * 0.5) * scale;
  }
  return { contours, width: pen, ascent: size, descent: -font.descender * scale };
}

function glyphBounds(glyph) {
  const nums = glyph.o.trim().split(/\s+/).filter((t) => !/[a-z]/.test(t)).map(Number);
  let maxY = -Infinity;
  for (let i = 1; i < nums.length; i += 2) maxY = Math.max(maxY, nums[i]);
  return { maxY };
}

export function supportedText(font, text) {
  return [...String(text)].every((ch) => Boolean(font.glyphs[ch]));
}

/* ── gears ────────────────────────────────────────────────────────────── */

const inv = (a) => Math.tan(a) - a;

export function gearGeometry({ module: m, teeth: z, pressureAngle = 20 }) {
  const alpha = (pressureAngle * Math.PI) / 180;
  const pitchRadius = (m * z) / 2;
  return {
    pitchRadius,
    baseRadius: pitchRadius * Math.cos(alpha),
    tipRadius: pitchRadius + m,
    rootRadius: pitchRadius - 1.25 * m,
    alpha,
  };
}

export function centerDistance(m, teethA, teethB) {
  return (m * (teethA + teethB)) / 2;
}

/* Counter-clockwise outline of the whole gear. `backlash` (mm, measured along
   the pitch circle) thins each tooth so printed gears have play to turn. */
export function spurGearOutline({ module: m, teeth: z, pressureAngle = 20, backlash = 0, flankSteps = 8, tipSteps = 3, rootSteps = 4 }) {
  const g = gearGeometry({ module: m, teeth: z, pressureAngle });
  const { pitchRadius: r, baseRadius: rb, tipRadius: ra, rootRadius: rf, alpha } = g;
  const toothThickness = (Math.PI * m) / 2 - backlash;
  const halfAtPitch = toothThickness / (2 * r);
  // half-angle of the tooth at radius ρ on the involute
  const half = (rho) => halfAtPitch + inv(alpha) - inv(Math.acos(Math.min(1, rb / rho)));
  const flankStart = Math.max(rb, rf);
  const radii = [];
  for (let s = 0; s <= flankSteps; s++) radii.push(flankStart + ((ra - flankStart) * s) / flankSteps);

  const points = [];
  const at = (rho, angle) => points.push([rho * Math.cos(angle), rho * Math.sin(angle)]);
  const pitchAngle = (2 * Math.PI) / z;
  for (let k = 0; k < z; k++) {
    const c = k * pitchAngle;
    const rootHalf = half(flankStart);
    // root arc up to this tooth (from the previous tooth's trailing flank)
    const prevEnd = c - pitchAngle + rootHalf;
    const thisStart = c - rootHalf;
    for (let s = 1; s < rootSteps; s++) at(rf, prevEnd + ((thisStart - prevEnd) * s) / rootSteps);
    if (rf < rb) at(rf, thisStart);                       // radial line below the base circle
    for (const rho of radii) at(rho, c - Math.max(half(rho), 0));
    const tipHalf = Math.max(half(ra), 0);
    for (let s = 1; s < tipSteps; s++) at(ra, c - tipHalf + (2 * tipHalf * s) / tipSteps);
    for (let i = radii.length - 1; i >= 0; i--) at(radii[i], c + Math.max(half(radii[i]), 0));
    if (rf < rb) at(rf, c + rootHalf);
  }
  return { points, ...g, toothThickness, tipThickness: 2 * Math.max(half(ra), 0) * ra };
}
