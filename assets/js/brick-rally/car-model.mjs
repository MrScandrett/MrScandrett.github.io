// Brick Rally car model (pure: no DOM, no Three.js).
//
// A car is a small voxel grid of bricks: W studs wide (x), L studs long (z, +z is the nose),
// H bricks tall (y, up). Each cell holds a palette index (0 = empty). Everything the game
// needs from a car comes from this grid: its look (buildCarMesh), its handling (carStats),
// and the short string it travels the network as (encodeCar / decodeCar).

export const W = 10;
export const L = 16;
export const H = 7;

// Real-world size of one cell in track units (a track is ~16 units wide).
export const CELL = 0.25;
export const LAYER = 0.3;
export const WHEEL_R = 0.45;

export const PALETTE = [
  null,
  { name: 'Red', hex: '#c91a09' },
  { name: 'Blue', hex: '#0055bf' },
  { name: 'Yellow', hex: '#f2cd37' },
  { name: 'Green', hex: '#237841' },
  { name: 'Black', hex: '#1b2a34' },
  { name: 'White', hex: '#f4f4f4' },
  { name: 'Orange', hex: '#fe8a18' },
  { name: 'Lime', hex: '#bbe90b' },
  { name: 'Sky', hex: '#36aebf' },
  { name: 'Dark grey', hex: '#6c6e68' },
  { name: 'Light grey', hex: '#a0a5a9' },
  { name: 'Pink', hex: '#e4adc8' },
  { name: 'Purple', hex: '#81007b' },
  { name: 'Tan', hex: '#e4cd9e' },
  { name: 'Glass', hex: '#aee9ef' },
];

export const idx = (x, y, z) => x + W * (z + L * y);

export function emptyCar() {
  return new Uint8Array(W * L * H);
}

export function get(cells, x, y, z) {
  if (x < 0 || y < 0 || z < 0 || x >= W || y >= H || z >= L) return 0;
  return cells[idx(x, y, z)];
}

export function set(cells, x, y, z, v) {
  if (x < 0 || y < 0 || z < 0 || x >= W || y >= H || z >= L) return false;
  cells[idx(x, y, z)] = v;
  return true;
}

export function fillBox(cells, x0, y0, z0, x1, y1, z1, v) {
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) set(cells, x, y, z, v);
  return cells;
}

export function countBricks(cells) {
  let n = 0;
  for (const c of cells) if (c) n++;
  return n;
}

export function bounds(cells) {
  const b = { x0: W, x1: -1, y0: H, y1: -1, z0: L, z1: -1 };
  for (let y = 0; y < H; y++) for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    if (!cells[idx(x, y, z)]) continue;
    if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x;
    if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
    if (z < b.z0) b.z0 = z; if (z > b.z1) b.z1 = z;
  }
  return b.x1 < 0 ? null : b;
}

/** Most common colour, used for the car's dot on the minimap and its name chip. */
export function mainColor(cells) {
  const counts = new Array(PALETTE.length).fill(0);
  for (const c of cells) if (c && c !== 5 && c !== 15) counts[c]++;
  let best = 1;
  for (let i = 1; i < counts.length; i++) if (counts[i] > counts[best]) best = i;
  return PALETTE[best].hex;
}

// ---------------------------------------------------------------------------------------
// Handling. Every build trades something: wide and low grips, light accelerates, a small
// nose cuts through the air, and lots of bricks are heavy but planted.

export function carStats(cells) {
  const b = bounds(cells);
  if (!b) return { bricks: 0, topSpeed: 30, accel: 18, grip: 2.2, mass: 1, bars: { speed: 1, accel: 1, grip: 1, weight: 1 } };
  const bricks = countBricks(cells);
  const width = b.x1 - b.x0 + 1;
  // frontal area: cells seen from the nose
  let frontal = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    for (let z = 0; z < L; z++) if (cells[idx(x, y, z)]) { frontal++; break; }
  }
  let ySum = 0;
  for (let y = 0; y < H; y++) for (let i = 0; i < W * L; i++) if (cells[y * W * L + i]) ySum += y;
  const cg = ySum / bricks / (H - 1);              // 0 low … 1 high
  const mass = 0.6 + Math.min(1, bricks / 650);    // 0.6 … 1.6
  const aero = 1 - frontal / (W * H);              // 0 … 1
  const topSpeed = 40 + aero * 9 - (mass - 0.6) * 4;   // ≈ 37 … 48
  const accel = 26 / mass;                         // ≈ 16 … 40
  const grip = 2.0 + (width / W) * 0.9 - cg * 1.2 + (mass - 0.6) * 1.4;
  const norm = (v, lo, hi) => Math.max(1, Math.min(10, Math.round(1 + 9 * (v - lo) / (hi - lo))));
  return {
    bricks, topSpeed, accel, grip: Math.max(1.4, grip), mass,
    bars: { speed: norm(topSpeed, 37, 48), accel: norm(accel, 16, 36), grip: norm(grip, 1.8, 4.2), weight: norm(mass, 0.6, 1.6) },
  };
}

// ---------------------------------------------------------------------------------------
// Network/storage format: "v1:" + run-length pairs of hex colour + base-36 run.
// A packed car is a few hundred characters at most.

export function encodeCar(cells) {
  let out = 'v1:';
  let i = 0;
  while (i < cells.length) {
    const v = cells[i];
    let run = 1;
    while (i + run < cells.length && cells[i + run] === v) run++;
    out += v.toString(16) + run.toString(36) + '.';
    i += run;
  }
  return out;
}

export function decodeCar(text) {
  const cells = emptyCar();
  if (typeof text !== 'string' || !text.startsWith('v1:') || text.length > 8000) return null;
  let i = 0;
  for (const part of text.slice(3).split('.')) {
    if (!part) continue;
    const v = parseInt(part[0], 16);
    const run = parseInt(part.slice(1), 36);
    if (!(v >= 0 && v < PALETTE.length) || !(run > 0) || i + run > cells.length) return null;
    cells.fill(v, i, i + run);
    i += run;
  }
  return i === cells.length ? cells : null;
}

// ---------------------------------------------------------------------------------------
// Presets. Plain shapes so students can see how each was built and edit from there.

function chassis(c, color, { x0 = 1, x1 = 8, z0 = 1, z1 = 14 } = {}) {
  fillBox(c, x0, 0, z0, x1, 0, z1, color);
}

export const PRESETS = [
  {
    id: 'roadster', name: 'Roadster',
    build() {
      const c = emptyCar();
      chassis(c, 5);
      fillBox(c, 1, 1, 1, 8, 1, 14, 1);
      fillBox(c, 2, 2, 2, 7, 2, 5, 1);            // rear deck
      fillBox(c, 2, 2, 9, 7, 2, 13, 1);           // bonnet
      fillBox(c, 2, 2, 8, 7, 3, 8, 15);           // windscreen
      fillBox(c, 3, 2, 6, 6, 2, 7, 5);            // seats
      fillBox(c, 1, 2, 1, 8, 3, 1, 5);            // spoiler post
      fillBox(c, 1, 4, 0, 8, 4, 1, 1);            // spoiler
      set(c, 1, 1, 15, 3); set(c, 8, 1, 15, 3);  // headlights
      return c;
    },
  },
  {
    id: 'brick-truck', name: 'Brick Truck',
    build() {
      const c = emptyCar();
      chassis(c, 10, { x0: 0, x1: 9, z0: 0, z1: 15 });
      fillBox(c, 0, 1, 0, 9, 3, 8, 3);            // dump bed
      fillBox(c, 1, 2, 1, 8, 3, 7, 0);            // hollow it out
      fillBox(c, 1, 1, 10, 8, 4, 14, 3);          // cab
      fillBox(c, 2, 3, 15, 7, 4, 15, 15);         // windscreen
      fillBox(c, 1, 1, 15, 8, 2, 15, 5);          // grille
      fillBox(c, 3, 5, 11, 6, 5, 13, 7);          // beacon bar
      return c;
    },
  },
  {
    id: 'arrow', name: 'Arrow',
    build() {
      const c = emptyCar();
      chassis(c, 5, { x0: 2, x1: 7, z0: 0, z1: 15 });
      for (let z = 0; z < L; z++) {
        const half = z > 11 ? 1 : 3;
        fillBox(c, 4.5 - half | 0, 1, z, 4 + half, 1, z, 2);
      }
      fillBox(c, 3, 2, 3, 6, 2, 9, 2);
      fillBox(c, 4, 3, 5, 5, 3, 7, 15);           // canopy
      fillBox(c, 0, 1, 1, 9, 1, 3, 9);            // rear wing
      fillBox(c, 4, 3, 0, 5, 4, 1, 2);            // fin
      return c;
    },
  },
  {
    id: 'bug', name: 'Bug',
    build() {
      const c = emptyCar();
      chassis(c, 5, { x0: 1, x1: 8, z0: 2, z1: 13 });
      fillBox(c, 1, 1, 2, 8, 2, 13, 4);
      fillBox(c, 2, 3, 4, 7, 4, 11, 4);
      fillBox(c, 2, 3, 10, 7, 3, 10, 15);
      fillBox(c, 2, 3, 5, 7, 3, 5, 15);
      fillBox(c, 3, 5, 6, 6, 5, 9, 4);
      set(c, 2, 2, 14, 6); set(c, 7, 2, 14, 6);
      return c;
    },
  },
  {
    id: 'rocket', name: 'Rocket',
    build() {
      const c = emptyCar();
      chassis(c, 5, { x0: 2, x1: 7, z0: 0, z1: 15 });
      fillBox(c, 3, 1, 0, 6, 2, 15, 5);
      fillBox(c, 4, 1, 15, 5, 1, 15, 7);
      fillBox(c, 3, 1, 0, 6, 2, 0, 7);            // exhaust glow
      fillBox(c, 1, 1, 2, 8, 1, 5, 13);           // side pods
      fillBox(c, 4, 3, 6, 5, 3, 9, 15);
      fillBox(c, 4, 3, 1, 5, 5, 2, 13);
      return c;
    },
  },
];

export function preset(id) {
  return (PRESETS.find(p => p.id === id) || PRESETS[0]).build();
}

export function mirrorX(cells) {
  const out = emptyCar();
  for (let y = 0; y < H; y++) for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) out[idx(W - 1 - x, y, z)] = cells[idx(x, y, z)];
  return out;
}

// ---------------------------------------------------------------------------------------
// Mesh: one triangle soup (positions, normals, colours) with hidden faces culled and a
// stud on every exposed top. Origin: centre of the car's footprint, y = 0 at the bottom of
// the lowest brick. The renderer lifts it by the wheel radius.

const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
  { n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
];

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

export function buildCarMesh(cells, { studs = true, studSides = 8, fixedOrigin = false } = {}) {
  const pos = [], nrm = [], col = [];
  const b = bounds(cells) || { x0: 0, x1: W - 1, z0: 0, z1: L - 1, y0: 0, y1: 0 };
  const ox = fixedOrigin ? W / 2 : (b.x0 + b.x1 + 1) / 2, oz = fixedOrigin ? L / 2 : (b.z0 + b.z1 + 1) / 2, oy = fixedOrigin ? 0 : b.y0;
  const push = (p, n, c) => { pos.push(p[0], p[1], p[2]); nrm.push(n[0], n[1], n[2]); col.push(c[0], c[1], c[2]); };
  const quad = (a, bb, cc, d, n, c) => { push(a, n, c); push(bb, n, c); push(cc, n, c); push(a, n, c); push(cc, n, c); push(d, n, c); };
  for (let y = 0; y < H; y++) for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    const v = cells[idx(x, y, z)];
    if (!v) continue;
    const rgb = hexToRgb(PALETTE[v].hex);
    for (const f of FACES) {
      if (get(cells, x + f.n[0], y + f.n[1], z + f.n[2])) continue;
      // darken bottoms and sides a touch so the blocks read without heavy lighting
      const shade = f.n[1] < 0 ? 0.7 : 1;
      const c = [rgb[0] * shade, rgb[1] * shade, rgb[2] * shade];
      const p = f.c.map(k => [(x + k[0] - ox) * CELL, (y + k[1] - oy) * LAYER, (z + k[2] - oz) * CELL]);
      quad(p[0], p[1], p[2], p[3], f.n, c);
    }
    if (studs && !get(cells, x, y + 1, z)) {
      const cx = (x + 0.5 - ox) * CELL, cz = (z + 0.5 - oz) * CELL;
      const y0 = (y + 1 - oy) * LAYER, y1 = y0 + 0.05, r = CELL * 0.3;
      const c = rgb.map(k => Math.min(1, k * 1.08));
      for (let s = 0; s < studSides; s++) {
        const a0 = (s / studSides) * Math.PI * 2, a1 = ((s + 1) / studSides) * Math.PI * 2;
        const p0 = [cx + Math.cos(a0) * r, cz + Math.sin(a0) * r], p1 = [cx + Math.cos(a1) * r, cz + Math.sin(a1) * r];
        const am = (a0 + a1) / 2, n = [Math.cos(am), 0, Math.sin(am)];
        quad([p0[0], y0, p0[1]], [p1[0], y0, p1[1]], [p1[0], y1, p1[1]], [p0[0], y1, p0[1]], n, c);
        push([cx, y1, cz], [0, 1, 0], c); push([p1[0], y1, p1[1]], [0, 1, 0], c); push([p0[0], y1, p0[1]], [0, 1, 0], c);
      }
    }
  }
  return {
    positions: new Float32Array(pos), normals: new Float32Array(nrm), colors: new Float32Array(col),
    size: { w: (b.x1 - b.x0 + 1) * CELL, l: (b.z1 - b.z0 + 1) * CELL, h: (b.y1 - b.y0 + 1) * LAYER },
    origin: { ox, oy, oz },
  };
}

/** Wheel centres in car space (same origin as buildCarMesh). */
export function wheelLayout(cells, { fixedOrigin = false } = {}) {
  const b = bounds(cells) || { x0: 1, x1: 8, z0: 1, z1: 14 };
  const halfW = (b.x1 - b.x0 + 1) * CELL / 2;
  const len = (b.z1 - b.z0 + 1) * CELL;
  // with a fixed origin the footprint's centre is offset from the grid's centre
  const cx = fixedOrigin ? ((b.x0 + b.x1 + 1) / 2 - W / 2) * CELL : 0;
  const cz = fixedOrigin ? ((b.z0 + b.z1 + 1) / 2 - L / 2) * CELL : 0;
  const zf = cz + len * 0.3, zr = cz - len * 0.3;
  const x = halfW + 0.06;
  return [
    { x: cx - x, z: zf, front: true }, { x: cx + x, z: zf, front: true },
    { x: cx - x, z: zr, front: false }, { x: cx + x, z: zr, front: false },
  ];
}
