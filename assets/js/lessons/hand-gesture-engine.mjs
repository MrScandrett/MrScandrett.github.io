/* Hand-gesture engine for Air Chalk (no DOM, unit-testable).
   Works with MediaPipe Hands landmarks (21 points, normalised image space) and,
   when available, `multiHandWorldLandmarks` (metric 3D) which makes finger
   curl measurements independent of camera tilt, depth and hand rotation.

   Pieces:
   - analyzeHand      joint-angle finger states + pose label (3D when possible)
   - assessFrame      rejects frames that are unreliable (low score, cut off, too far)
   - PoseStabilizer   temporal majority vote + dwell time, kills single-frame flicker
   - CommandDetector  dwell-confirmed "command" poses with arm/cooldown logic
   - SwipeDetector    open-hand horizontal/vertical swipe from palm trajectory
*/

const FINGER_IDX = {
  index: [5, 6, 7, 8],
  middle: [9, 10, 11, 12],
  ring: [13, 14, 15, 16],
  pinky: [17, 18, 19, 20]
};

function toVec(p, useWorld, aspect) {
  if (useWorld) return { x: p.x, y: p.y, z: p.z || 0 };
  // Image-space fallback: undo the 4:3 stretch; z is on roughly the x scale but noisy, so damp it.
  return { x: p.x * aspect, y: p.y, z: (p.z || 0) * 0.3 };
}
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); }
function angleAt(a, b, c) { // degrees at b between a and c
  const v1 = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const d = Math.hypot(v1.x, v1.y, v1.z) * Math.hypot(v2.x, v2.y, v2.z);
  if (d < 1e-9) return 0;
  const cos = (v1.x * v2.x + v1.y * v2.y + v1.z * v2.z) / d;
  return Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
}

export function fingerState(v, idx) {
  const mcp = v[idx[0]], pip = v[idx[1]], dip = v[idx[2]], tip = v[idx[3]];
  const pipAngle = angleAt(mcp, pip, dip);
  const dipAngle = angleAt(pip, dip, tip);
  const chain = dist(mcp, pip) + dist(pip, dip) + dist(dip, tip);
  const straightness = chain > 1e-9 ? dist(mcp, tip) / chain : 0;
  return {
    pipAngle, dipAngle, straightness,
    extended: pipAngle > 155 && dipAngle > 145 && straightness > 0.9,
    curled: pipAngle < 140 || straightness < 0.85
  };
}

/**
 * @param lm     image-space landmarks (x,y in 0..1)
 * @param world  optional metric world landmarks (same indexing)
 * @param aspect video width / height
 */
export function analyzeHand(lm, world, aspect) {
  if (!lm || lm.length < 21) return null;
  const useWorld = !!(world && world.length >= 21);
  const v = (useWorld ? world : lm).map((p) => toVec(p, useWorld, aspect || 4 / 3));
  const size = Math.max(1e-6, dist(v[0], v[9]));

  const f = {};
  for (const k of Object.keys(FINGER_IDX)) f[k] = fingerState(v, FINGER_IDX[k]);

  // Thumb: straight IP joint and tip well away from the index knuckle.
  const thumbAngle = angleAt(v[2], v[3], v[4]);
  const thumbReach = dist(v[4], v[5]) / size;
  const thumbExtended = thumbAngle > 150 && thumbReach > 0.45;

  // Thumb direction is always judged in the camera view (what the audience sees).
  const dx = (lm[4].x - lm[2].x) * (aspect || 4 / 3);
  const dy = lm[4].y - lm[2].y;
  const thumbMag = Math.hypot(dx, dy);
  const vertical = thumbMag > 1e-6 && Math.abs(dx) < 0.6 * Math.abs(dy);
  const thumbUp = thumbExtended && vertical && dy < 0;
  const thumbDown = thumbExtended && vertical && dy > 0;

  const allCurled = f.index.curled && f.middle.curled && f.ring.curled && f.pinky.curled;
  let label = "other";
  if (allCurled && thumbUp) label = "thumbsUp";
  else if (allCurled && thumbDown) label = "thumbsDown";
  else if (allCurled) label = "fist";
  else if (f.index.extended && f.middle.curled && f.ring.curled && f.pinky.curled) label = "point";
  else if (f.index.extended && f.middle.extended && f.ring.curled && f.pinky.curled) label = "peace";
  else if (f.index.extended && f.middle.extended && f.ring.extended && f.pinky.curled) label = "three";
  else if (f.index.extended && f.middle.extended && f.ring.extended && f.pinky.extended) label = "palm";

  return {
    label, fingers: f, size, useWorld,
    thumb: { extended: thumbExtended, up: thumbUp, down: thumbDown, angle: thumbAngle, reach: thumbReach }
  };
}

/** Frame-level reliability gate. Returns { ok, reason, hint }. */
export function assessFrame(lm, handednessScore, opts) {
  const o = Object.assign({ minScore: 0.6, maxEdge: 3, minSize: 0.05 }, opts || {});
  if (!lm || lm.length < 21) return { ok: false, reason: "none", hint: "Show your hand" };
  if (handednessScore !== undefined && handednessScore !== null && handednessScore < o.minScore) {
    return { ok: false, reason: "lowScore", hint: "Hand unclear: add light or slow down" };
  }
  let edge = 0;
  for (const p of lm) if (p.x < 0.01 || p.x > 0.99 || p.y < 0.01 || p.y > 0.99) edge++;
  const size = Math.hypot(lm[0].x - lm[9].x, lm[0].y - lm[9].y);
  if (size < o.minSize) return { ok: true, reason: "far", hint: "Move closer to the camera", warn: true };
  if (edge > o.maxEdge) return { ok: true, reason: "edge", hint: "Hand is leaving the frame", warn: true };
  return { ok: true, reason: "", hint: "" };
}

/** Majority-vote label smoothing with dwell tracking. */
export class PoseStabilizer {
  constructor(opts) {
    const o = Object.assign({ window: 6, minVotes: 4 }, opts || {});
    this.window = o.window; this.minVotes = o.minVotes;
    this.buf = []; this.stable = "other"; this.since = 0;
  }
  reset() { this.buf = []; this.stable = "other"; this.since = 0; }
  push(label, tMs) {
    this.buf.push(label);
    if (this.buf.length > this.window) this.buf.shift();
    const counts = {};
    for (const l of this.buf) counts[l] = (counts[l] || 0) + 1;
    let best = this.stable, bestN = counts[this.stable] || 0;
    for (const l of Object.keys(counts)) if (counts[l] > bestN) { best = l; bestN = counts[l]; }
    // A new label needs minVotes to take over; the current one is sticky.
    if (best !== this.stable && bestN >= this.minVotes) { this.stable = best; this.since = tMs; }
    if (this.since === 0) this.since = tMs;
    return { label: this.stable, heldMs: tMs - this.since };
  }
}

/** Dwell-confirmed command poses. A pose must be released before it can fire again. */
export class CommandDetector {
  constructor(opts) {
    const o = Object.assign({
      dwellMs: { thumbsUp: 700, thumbsDown: 700, three: 700 },
      cooldownMs: 1100
    }, opts || {});
    this.dwell = o.dwellMs; this.cooldown = o.cooldownMs;
    this.armedFor = null; this.lastFire = -1e9;
  }
  reset() { this.armedFor = null; }
  update(label, heldMs, tMs, blocked) {
    const idle = { progress: 0, fire: null, candidate: null };
    if (blocked) { this.armedFor = null; return idle; }
    if (this.armedFor && label !== this.armedFor) this.armedFor = null; // pose released → re-arm
    const need = this.dwell[label];
    if (need === undefined) return idle;
    if (this.armedFor === label) return { progress: 1, fire: null, candidate: label }; // fired, wait for release
    if (tMs - this.lastFire < this.cooldown) return { progress: 0, fire: null, candidate: label };
    const progress = Math.max(0, Math.min(1, heldMs / need));
    if (progress >= 1) {
      this.armedFor = label; this.lastFire = tMs;
      return { progress: 1, fire: label, candidate: label };
    }
    return { progress, fire: null, candidate: label };
  }
}

/** Palm-trajectory swipe detector. x is mirrored (right = screen right), units = frame widths. */
export class SwipeDetector {
  constructor(opts) {
    const o = Object.assign({ windowMs: 450, minTravel: 0.26, maxCross: 0.5, minSpeed: 0.6, cooldownMs: 900 }, opts || {});
    Object.assign(this, o);
    this.pts = []; this.lastFire = -1e9;
  }
  reset() { this.pts = []; }
  push(x, y, tMs, eligible) {
    if (!eligible) { this.pts = []; return null; }
    this.pts.push({ x, y, t: tMs });
    while (this.pts.length && tMs - this.pts[0].t > this.windowMs) this.pts.shift();
    if (this.pts.length < 4 || tMs - this.lastFire < this.cooldownMs) return null;
    const a = this.pts[0], b = this.pts[this.pts.length - 1];
    const dx = b.x - a.x, dy = b.y - a.y, dt = Math.max(1, b.t - a.t) / 1000;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax >= this.minTravel && ay <= this.maxCross * ax && ax / dt >= this.minSpeed) {
      this.lastFire = tMs; this.pts = [];
      return dx > 0 ? "swipeRight" : "swipeLeft";
    }
    if (ay >= this.minTravel * 1.3 && ax <= this.maxCross * ay && ay / dt >= this.minSpeed) {
      this.lastFire = tMs; this.pts = [];
      return dy > 0 ? "swipeDown" : "swipeUp";
    }
    return null;
  }
}

export const COMMAND_LABELS = {
  thumbsUp: "👍 Read explanation aloud",
  thumbsDown: "👎 Undo",
  three: "🤟 Cycle unknown / 3D unfold",
  swipeLeft: "👈 Previous tool",
  swipeRight: "👉 Next tool"
};
