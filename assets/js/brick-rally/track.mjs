// Brick Rally tracks (pure). A track is a closed Catmull-Rom curve through a few control
// points, sampled every ~1 unit. Everything else (where the road is, which way is forward,
// how far round the lap a car is) is a lookup into those samples.

export const TRACKS = [
  {
    id: 'baseplate', name: 'Baseplate Loop', width: 16, theme: 'baseplate',
    points: [[0, -70], [60, -70], [100, -45], [105, 10], [80, 55], [30, 60], [0, 35], [-30, 60], [-80, 60], [-105, 20], [-100, -40], [-60, -70]],
  },
  {
    id: 'snake', name: 'Snake Canyon', width: 15, theme: 'desert',
    points: [[0, -90], [70, -95], [110, -60], [80, -25], [110, 15], [95, 70], [40, 90], [10, 55], [-25, 90], [-90, 85], [-115, 35], [-75, 0], [-110, -45], [-70, -90]],
  },
  {
    id: 'volcano', name: 'Volcano Ring', width: 17, theme: 'volcano',
    points: [[0, -85], [65, -75], [95, -25], [85, 40], [40, 80], [-20, 85], [-75, 55], [-95, 0], [-70, -60]],
  },
];

export const WALL_GAP = 6; // grass between the road edge and the barrier

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
}

export function buildTrack(def) {
  const P = def.points, n = P.length;
  const raw = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    const steps = Math.max(8, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 2));
    for (let s = 0; s < steps; s++) raw.push(catmull(p0, p1, p2, p3, s / steps));
  }
  // resample to an even spacing of ~1 unit
  const dense = [raw[0]];
  let acc = 0;
  for (let i = 1; i <= raw.length; i++) {
    const a = raw[i - 1], b = raw[i % raw.length];
    acc += Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (acc >= 1) { dense.push(b); acc = 0; }
  }
  if (Math.hypot(dense.at(-1)[0] - dense[0][0], dense.at(-1)[1] - dense[0][1]) < 0.5) dense.pop();
  const N = dense.length;
  const xs = new Float32Array(N), zs = new Float32Array(N), tx = new Float32Array(N), tz = new Float32Array(N), s = new Float32Array(N), curv = new Float32Array(N);
  let len = 0;
  for (let i = 0; i < N; i++) {
    xs[i] = dense[i][0]; zs[i] = dense[i][1];
    if (i) len += Math.hypot(xs[i] - xs[i - 1], zs[i] - zs[i - 1]);
    s[i] = len;
  }
  len += Math.hypot(xs[0] - xs[N - 1], zs[0] - zs[N - 1]);
  for (let i = 0; i < N; i++) {
    const a = (i - 1 + N) % N, b = (i + 1) % N;
    const dx = xs[b] - xs[a], dz = zs[b] - zs[a], m = Math.hypot(dx, dz) || 1;
    tx[i] = dx / m; tz[i] = dz / m;
  }
  for (let i = 0; i < N; i++) {
    const a = (i - 3 + N) % N, b = (i + 3) % N;
    const a1 = Math.atan2(tx[a], tz[a]), a2 = Math.atan2(tx[b], tz[b]);
    curv[i] = Math.abs(angleDiff(a2, a1)) / 6;
  }
  return { def, N, xs, zs, tx, tz, s, curv, length: len, half: def.width / 2, wall: def.width / 2 + WALL_GAP };
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Nearest centreline sample to (x, z). `hint` (last index) makes it a local search.
 * Returns { i, lateral (signed: + is to the right of travel), s (distance along the lap) }.
 */
export function locate(track, x, z, hint = -1) {
  const { N, xs, zs } = track;
  let best = 0, bestD = Infinity;
  const scan = (i) => {
    const d = (xs[i] - x) ** 2 + (zs[i] - z) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  };
  if (hint >= 0) for (let k = -30; k <= 30; k++) scan((hint + k + N) % N);
  if (hint < 0 || bestD > 400) for (let i = 0; i < N; i++) scan(i);
  // right of travel: forward (tx,tz) rotated -90° → (tz, -tx)
  const lateral = (x - xs[best]) * track.tz[best] - (z - zs[best]) * track.tx[best];
  return { i: best, lateral, s: track.s[best] };
}

export function pointAt(track, s) {
  const t = ((s % track.length) + track.length) % track.length;
  let lo = 0, hi = track.N - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (track.s[m] <= t) lo = m; else hi = m - 1; }
  return { x: track.xs[lo], z: track.zs[lo], tx: track.tx[lo], tz: track.tz[lo], i: lo };
}

/** Grid slots behind the start line: two columns, staggered. */
export function gridSlot(track, slot) {
  const row = Math.floor(slot / 2), side = slot % 2 ? 1 : -1;
  const p = pointAt(track, -6 - row * 6 - (slot % 2) * 2.5);
  const off = side * track.half * 0.4;
  return { x: p.x + p.tz * off, z: p.z - p.tx * off, h: Math.atan2(p.tx, p.tz) };
}
