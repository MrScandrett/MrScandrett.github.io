/* drive-outlines.mjs — 2D outlines for Forge's printable mechanical drives.
 * Pure math, no DOM and no geometry kernel, so `node --test` checks them directly.
 *
 *   rackOutline({ module, teeth, pressureAngle, backlash, base })
 *       A straight rack that meshes with spurGearOutline() gears of the same module: teeth on top,
 *       pitch line at y = 0, a solid bar `base` mm deep below the tooth roots.
 *
 *   threadSection({ pitchRadius, module, lead, starts, pressureAngle, backlash, steps, addendum?, dedendum? })
 *       The cross-section, square to the axis, of a trapezoid thread (a leadscrew or a worm). Extrude it
 *       with a twist of 360° per `lead` mm and you get the helical thread (right-handed for a positive twist).
 *       Axial tooth shape = a rack of the same module, so a worm meshes with a helical gear of the same
 *       module and pressure angle.
 *
 *   cycloidDiscOutline({ pinCircleRadius, pinRadius, eccentricity, pins, steps })
 *       The lobed disc of a cycloidal drive with `pins − 1` lobes: an epitrochoid offset inward by the
 *       pin radius. Disc centre at the origin; at runtime it rides on an eccentric `eccentricity` off-centre.
 *
 *   cycloidLimits({ pinCircleRadius, pins }) → the largest eccentricity and pin radius that keep the
 *       profile a simple (non-looping) curve with pins that do not touch each other.
 */

const TAU = Math.PI * 2;

export function rackOutline({ module: m, teeth, pressureAngle = 20, backlash = 0, base = 4 }) {
  const a = (pressureAngle * Math.PI) / 180;
  const p = Math.PI * m;
  const half = p / 4 - backlash / 2;                 // half tooth thickness on the pitch line
  const tipHalf = half - m * Math.tan(a);
  const rootHalf = Math.min(p / 2 - 0.05, half + 1.25 * m * Math.tan(a));
  const yTip = m, yRoot = -1.25 * m, yBase = yRoot - base;
  const length = teeth * p;
  const pts = [[0, yBase], [length, yBase]];
  // walk right-to-left along the top so the polygon stays counter-clockwise
  pts.push([length, yRoot]);
  for (let k = teeth - 1; k >= 0; k--) {
    const c = (k + 0.5) * p;
    pts.push([c + rootHalf, yRoot], [c + tipHalf, yTip], [c - tipHalf, yTip], [c - rootHalf, yRoot]);
  }
  pts.push([0, yRoot]);
  // drop exact duplicates where neighbouring root corners meet
  const out = [];
  for (const q of pts) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(last[0] - q[0], last[1] - q[1]) > 1e-6) out.push(q);
  }
  return { points: out, length, pitch: p, tipThickness: 2 * tipHalf, height: yTip - yBase, pitchLineAboveBase: -yBase };
}

/* Radius of a rack-profile thread at axial offset u from a tooth centre. */
function threadRadius(u, { pitch, pitchRadius, tanA, half, add, ded }) {
  let d = ((u % pitch) + pitch) % pitch;
  if (d > pitch / 2) d = pitch - d;                  // distance to the nearest tooth centre
  const r = pitchRadius + (half - d) / tanA;
  return Math.min(pitchRadius + add, Math.max(pitchRadius - ded, r));
}

export function threadSection({ pitchRadius, module: m, lead, starts = 1, pressureAngle = 30, backlash = 0, steps = 0, addendum, dedendum }) {
  const pitch = lead / starts;
  const a = (pressureAngle * Math.PI) / 180;
  const tanA = Math.tan(a);
  const half = pitch / 4 - backlash / 2;
  const n = steps || Math.max(96, Math.ceil(starts * 48 + pitchRadius * 6));
  const add = addendum ?? m, ded = dedendum ?? 1.25 * m;
  const q = { pitch, pitchRadius, tanA, half, add, ded };
  const points = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * TAU;
    // the section at z = 0: the thread at angle θ is lead·θ/2π along the axis from a tooth centre
    const r = threadRadius((th / TAU) * lead, q);
    points.push([r * Math.cos(th), r * Math.sin(th)]);
  }
  return {
    points, pitch, lead,
    majorRadius: pitchRadius + add, minorRadius: pitchRadius - ded,
    leadAngle: (Math.atan(lead / (TAU * pitchRadius)) * 180) / Math.PI,
    tipThickness: 2 * (half - add * tanA)
  };
}

export function cycloidLimits({ pinCircleRadius: R, pins: N }) {
  return {
    maxEccentricity: (0.75 * R) / N,                // R / (e N) > 1 keeps the curve from looping; 0.75 leaves margin
    maxPinRadius: 0.8 * R * Math.sin(Math.PI / N)   // neighbouring pins keep a gap
  };
}

export function cycloidDiscOutline({ pinCircleRadius: R, pinRadius: Rr, eccentricity: e, pins: N, steps = 0 }) {
  const n = steps || Math.max(360, N * 40);
  const points = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    const psi = Math.atan2(Math.sin((1 - N) * t), R / (e * N) - Math.cos((1 - N) * t));
    const x = R * Math.cos(t) - Rr * Math.cos(t + psi) - e * Math.cos(N * t);
    const y = -R * Math.sin(t) + Rr * Math.sin(t + psi) + e * Math.sin(N * t);
    points.push([x, y]);
  }
  // the parametrisation runs clockwise; return it counter-clockwise
  points.reverse();
  return { points, lobes: N - 1, ratio: N - 1 };
}

/* Shoelace area (positive = counter-clockwise) and a simple-polygon check, for tests and verdicts. */
export function polygonArea(points) {
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const [ax, ay] = points[i], [bx, by] = points[(i + 1) % points.length];
    s += ax * by - bx * ay;
  }
  return s / 2;
}

export function isSimplePolygon(points) {
  const n = points.length;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const c = points[j], d = points[(j + 1) % n];
      const d1 = cross(a, b, c), d2 = cross(a, b, d), d3 = cross(c, d, a), d4 = cross(c, d, b);
      if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return false;
    }
  }
  return true;
}
