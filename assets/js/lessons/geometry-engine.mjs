/* Pure geometry helpers for the Smart Blackboard (no DOM, unit-testable).
   Lengths are returned in "cm" = pixels / scale. */

export const DEG = 180 / Math.PI;
export const MIN_SIDE_CM = 0.2;      // shorter than this reads as a collapsed side
export const MIN_HEIGHT_CM = 0.05;   // thinner than this reads as collinear points

function clampUnit(v) { return Math.max(-1, Math.min(1, v)); }

/** Interior angle (degrees) opposite side `opp`, given the two adjacent sides. */
export function angleFromSides(opp, adj1, adj2) {
  const den = 2 * adj1 * adj2;
  if (den < 1e-9) return 0;
  return Math.acos(clampUnit((adj1 * adj1 + adj2 * adj2 - opp * opp) / den)) * DEG;
}

/**
 * Solve a triangle from three points (A, B, C). Side a = BC, b = AC, c = AB.
 * Everything is computed at full precision; round only when displaying.
 * `valid` is false when a side collapses or the points are (nearly) collinear.
 */
export function solveTriangle(pA, pB, pC, scale) {
  const s = scale || 1;
  const a = Math.hypot(pB.x - pC.x, pB.y - pC.y) / s;
  const b = Math.hypot(pA.x - pC.x, pA.y - pC.y) / s;
  const c = Math.hypot(pA.x - pB.x, pA.y - pB.y) / s;

  const cross = ((pB.x - pA.x) * (pC.y - pA.y) - (pB.y - pA.y) * (pC.x - pA.x)) / (s * s);
  const area = Math.abs(cross) / 2;
  const perim = a + b + c;
  const h = c > 1e-9 ? (2 * area) / c : 0;

  const angA = angleFromSides(a, b, c);
  const angB = angleFromSides(b, a, c);
  const angC = Math.max(0, 180 - angA - angB);

  // Foot of the altitude from C onto line AB, measured along AB from A.
  const dx = pB.x - pA.x, dy = pB.y - pA.y;
  const len2 = dx * dx + dy * dy;
  const u = len2 === 0 ? 0 : ((pC.x - pA.x) * dx + (pC.y - pA.y) * dy) / len2;
  const d1 = Math.abs(u) * c;          // |AD|
  const d2 = Math.abs(1 - u) * c;      // |BD|
  const footInside = u >= 0 && u <= 1; // false → obtuse at A or B, c = |d1 − d2|

  let reason = "";
  if (Math.min(a, b, c) < MIN_SIDE_CM) reason = "Two vertices are on top of each other.";
  else if (h < MIN_HEIGHT_CM) reason = "The three points are in a straight line, so there is no triangle.";

  return { a, b, c, angA, angB, angC, area, perim, h, u, d1, d2, footInside, valid: reason === "", reason };
}

/**
 * Place a triangle with sides a, b, c (cm) with A at `origin`, B along +x
 * (before `flip`), and C on the side given by `flip` (+1 = canvas-up).
 * Returns null if the sides violate the triangle inequality.
 */
export function pointsFromSides(a, b, c, origin, scale, flip) {
  if (!(a > 0 && b > 0 && c > 0)) return null;
  if (a + b <= c || a + c <= b || b + c <= a) return null;
  const cosA = clampUnit((b * b + c * c - a * a) / (2 * b * c));
  const A = Math.acos(cosA);
  const dir = flip >= 0 ? -1 : 1; // canvas y grows downward
  return [
    { x: origin.x, y: origin.y },
    { x: origin.x + c * scale, y: origin.y },
    { x: origin.x + b * scale * Math.cos(A), y: origin.y + dir * b * scale * Math.sin(A) }
  ];
}

/** Cone: sector angle of the unrolled lateral surface, degrees. */
export function coneSectorAngle(r, slant) { return 360 * (r / slant); }

export function circleMetrics(r) {
  return { d: 2 * r, circumference: 2 * Math.PI * r, area: Math.PI * r * r };
}

/** Polygon area by the shoelace formula (absolute value). */
export function polygonArea(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    s += p.x * q.y - q.x * p.y;
  }
  return Math.abs(s) / 2;
}

/** True when no two non-adjacent edges of the polygon cross. */
export function isSimplePolygon(pts) {
  const n = pts.length;
  const ccw = (p, q, r) => (r.y - p.y) * (q.x - p.x) - (q.y - p.y) * (r.x - p.x);
  const cross = (p1, p2, p3, p4) =>
    ccw(p1, p3, p4) * ccw(p2, p3, p4) < 0 && ccw(p1, p2, p3) * ccw(p1, p2, p4) < 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      if (cross(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) return false;
    }
  }
  return true;
}
