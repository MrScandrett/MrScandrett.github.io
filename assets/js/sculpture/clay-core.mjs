import {
  createStone, fromCm, idx, meshRegion, normalAt, signedDistance, toCm, voxelizeMesh,
  toBase64, fromBase64,
} from './marble-core.mjs';

const STEP = 0.0625;
const BLOCK = { w: 4.5, h: 4.5, d: 4.5 };
const BAND = STEP * 4;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const mix = (a, b, t) => a + (b - a) * t;

export const BODIES = {
  earthenware: { label: 'Red earthenware', wet: '#9b6050', fired: '#bd6042', shrink: 0.08 },
  stoneware: { label: 'Buff stoneware', wet: '#8b7466', fired: '#ba9677', shrink: 0.12 },
  porcelain: { label: 'White porcelain', wet: '#a9a5a0', fired: '#eee4d3', shrink: 0.14 },
};
export const FINISHES = {
  bare: { label: 'Bare clay', roughness: 0.84 },
  burnished: { label: 'Burnished clay', roughness: 0.38, color: '#44352f' },
  clear: { label: 'Clear glaze', roughness: 0.22 },
  jade: { label: 'Jade glaze', roughness: 0.2, color: '#799483' },
};
export const STAGES = ['Wet clay', 'Leather-hard', 'Bone dry', 'Fired'];
export const POT_PRESETS = {
  lump: { label: 'Wheel lump', height: 0.8, profile: [0.56, 0.79, 0.76, 0.5], open: false, wobble: 0.19 },
  pinch: { label: 'Pinch cup', height: 0.89, profile: [0.48, 0.56, 0.66, 0.72], wobble: 0.08 },
  coil: { label: 'Coil bowl base', height: 0.39, profile: [0.68, 0.8, 0.91], wobble: 0.028 },
  greek: { label: 'Greek neck jar study', height: 2.48, profile: [0.61, 0.69, 1.03, 1.12, 1.0, 0.64, 0.49, 0.54] },
  moon: { label: 'Joseon moon jar study', height: 2.55, profile: [0.58, 0.82, 1.16, 1.29, 1.26, 1.06, 0.69, 0.53], body: 'porcelain', finish: 'clear', wobble: 0.026 },
};
export const SCULPT_PRESETS = {
  lump: 'Clay lump', slab: 'Relief slab', figure: 'Figurine blank', bust: 'Portrait bust blank',
};

function interpolate(values, t) {
  const position = clamp(t, 0, 1) * (values.length - 1);
  const index = Math.min(values.length - 2, Math.floor(position));
  return mix(values[index], values[index + 1], position - index);
}

export function newPot(preset) {
  const { profile, height, open = true, wobble = 0, body = 'earthenware', finish = 'bare' } = POT_PRESETS[preset];
  return {
    kind: 'pot', body, finish, stage: 0, heightMm: 120,
    pot: {
      height, open, wobble, coils: [], pinches: [],
      radius: Array.from({ length: 25 }, (_, i) => interpolate(profile, i / 24)),
      wall: Array(25).fill(preset === 'pinch' ? 0.23 : 0.16),
    },
  };
}

export function potProfile(pot) {
  const { height, open, wobble, radius, wall, coils } = pot;
  const outer = [], inner = [];
  const steps = Math.max(70, Math.ceil(height * 35));
  const floor = Math.min(height * 0.46, 0.15);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ridge = coils.reduce((sum, coil) => sum + coil.depth * Math.exp(-((t - coil.at) ** 2) / (2 * (0.042 / height) ** 2)), 0);
    outer.push([interpolate(radius, t) + ridge, t * height]);
    if (open) {
      const y = mix(floor, height, t), u = y / height;
      inner.push([Math.max(0.12, interpolate(radius, u) - interpolate(wall, u)), y]);
    }
  }
  const rim = outer.at(-1)[0];
  const lip = open ? (rim - inner.at(-1)[0]) / 2 : Math.min(0.07, height * 0.1);
  const profile = [[0, 0], ...outer];
  if (open) {
    for (let i = 1; i < 8; i++) {
      const angle = Math.PI * i / 8;
      profile.push([rim - lip + lip * Math.cos(angle), height + lip * Math.sin(angle)]);
    }
    profile.push(...inner.reverse(), [0, floor]);
  } else {
    profile.push([rim * 0.55, height + lip], [0, height + lip * 1.15]);
  }
  return { profile, wobble };
}

export function addCoil(pot) {
  if (!pot.open || pot.height >= 3.3) return false;
  const oldHeight = pot.height;
  pot.height = Math.min(3.45, oldHeight + 0.18);
  const ratio = oldHeight / pot.height;
  pot.radius = pot.radius.map((_, i) => interpolate(pot.radius, i / (24 * ratio)));
  pot.wall = pot.wall.map((_, i) => interpolate(pot.wall, i / (24 * ratio)));
  pot.pinches = pot.pinches.map(mark => ({ ...mark, at: mark.at * ratio }));
  pot.coils = [...pot.coils.map(coil => ({ ...coil, at: coil.at * ratio })), { at: (1 + ratio) / 2, depth: 0.065 }];
  return true;
}

export function shapePot(pot, tool, y, across, up, size, angle = 0) {
  if (tool === 'center') {
    pot.wobble = 0;
    pot.pinches = [];
    return;
  }
  if (tool === 'open') {
    pot.open = true;
    return;
  }
  const t = clamp(y / pot.height, 0, 1);
  const range = 0.1 + size * 0.23;
  const outer = pot.radius.slice();
  const wall = pot.wall.slice();
  const delta = clamp(across * 0.009, -0.15, 0.15);
  if (tool === 'pinch' && delta) {
    const recent = pot.pinches.at(-1);
    if (recent && Math.abs(recent.at - t) < 0.06 && Math.cos(recent.angle - angle) > 0.93) {
      recent.depth = clamp(recent.depth + delta * 0.16, -0.2, 0.2);
    } else {
      pot.pinches.push({ at: t, angle, range, depth: delta * 0.16 });
      if (pot.pinches.length > 28) pot.pinches.shift();
    }
  }
  for (let i = 0; i < outer.length; i++) {
    const distance = Math.abs(i / (outer.length - 1) - t);
    const weight = Math.exp(-2.2 * (distance / range) ** 2);
    const prior = outer[Math.max(0, i - 1)], next = outer[Math.min(outer.length - 1, i + 1)];
    if (tool === 'rib') pot.radius[i] = mix(outer[i], (prior + next) / 2, weight * 0.55);
    if (tool === 'pull' || tool === 'pinch') pot.radius[i] = clamp(outer[i] + delta * weight * (tool === 'pinch' ? 0.52 : 1), 0.22, 1.68);
    if (tool === 'pinch') pot.wall[i] = clamp(wall[i] - (Math.abs(delta) * 0.28 + 0.003) * weight, 0.045, pot.radius[i] - 0.12);
    if (tool === 'pull' && up > 0) pot.wall[i] = clamp(wall[i] - up * weight * 0.0012, 0.045, pot.radius[i] - 0.12);
    if (tool === 'trim' && i < 7) {
      const removed = Math.max(0, Math.min(wall[i] - 0.045, weight * (0.006 + Math.abs(delta) * 0.33)));
      pot.radius[i] -= removed;
      pot.wall[i] -= removed;
    }
    pot.wall[i] = Math.min(pot.wall[i], pot.radius[i] - 0.12);
  }
  if (tool === 'pull' && up > 0) pot.height = clamp(pot.height + up * 0.008 * (0.2 + t * 0.8), 0.3, 3.45);
  if (tool === 'rib') {
    pot.wobble *= 0.96;
    for (const marks of [pot.coils, pot.pinches]) {
      for (const mark of marks) if (Math.abs(mark.at - t) < range) mark.depth *= 0.75;
    }
  }
}

function emptyGrid() {
  return createStone({ h: STEP, block: BLOCK });
}

const ellipsoid = (x, y, z, [cx, cy, cz, a, b, c]) =>
  (Math.hypot((x - cx) / a, (y - cy) / b, (z - cz) / c) - 1) * Math.min(a, b, c);
const smoothMin = (a, b, width) =>
  Math.min(a, b) - Math.max(0, width - Math.abs(a - b)) ** 2 / (4 * width);

const FORMS = {
  lump: [[0, 0.64, 0, 0.87, 0.65, 0.73]],
  figure: [[0, 0.2, 0, 0.6, 0.21, 0.45], [0, 0.89, 0, 0.47, 0.87, 0.36], [0, 1.91, 0.045, 0.37, 0.44, 0.34]],
  bust: [[0, 0.35, 0, 0.94, 0.38, 0.47], [0, 0.92, 0, 0.41, 0.64, 0.39], [0, 1.75, 0.025, 0.59, 0.77, 0.53]],
};

export function newSculpture(preset) {
  const grid = emptyGrid();
  const field = new Float32Array(grid.density.length).fill(BAND);
  for (let z = 1; z < grid.nz - 1; z++) for (let y = 1; y < grid.ny - 1; y++) for (let x = 1; x < grid.nx - 1; x++) {
    const [px, py, pz] = toCm(grid, x, y, z);
    let distance = BAND;
    if (preset === 'slab') {
      const a = Math.abs(px) - 0.93, b = Math.abs(py - 0.98) - 0.92, c = Math.abs(pz) - 0.195;
      distance = Math.hypot(Math.max(a, 0), Math.max(b, 0), Math.max(c, 0)) + Math.min(0, Math.max(a, b, c)) - 0.06;
    } else {
      for (const part of FORMS[preset]) distance = smoothMin(distance, ellipsoid(px, py, pz, part), 0.17);
    }
    field[idx(grid, x, y, z)] = clamp(Math.max(-py, distance), -BAND, BAND);
  }
  return volumeProject(field);
}

function volumeProject(field) {
  return { kind: 'volume', field, body: 'earthenware', finish: 'bare', stage: 0, heightMm: 120 };
}

export function importClay(positions, up = 'z') {
  const grid = emptyGrid();
  const { mask } = voxelizeMesh(grid, positions, { up, marginCm: 0.34 });
  const inside = mask.reduce((sum, value) => sum + value, 0);
  if (inside < 8) throw new Error('The model has too little solid volume. Try a closed mesh with thicker walls.');
  const field = signedDistance(mask, grid.nx, grid.ny, grid.nz);
  for (let i = 0; i < field.length; i++) field[i] = clamp(field[i] * STEP, -BAND, BAND);
  return volumeProject(field);
}

export function brushClay(field, tool, point, normal, radius, strength) {
  const grid = VOLUME_GRID;
  const offset = tool === 'join' ? radius * 0.35 : tool === 'loop' ? radius * 0.51 : 0;
  const center = point.map((value, i) => value + normal[i] * offset);
  const coords = fromCm(grid, ...center);
  const reach = (radius + BAND) / STEP;
  const low = coords.map(value => Math.max(1, Math.floor(value - reach)));
  const high = coords.map((value, i) => Math.min([grid.nx, grid.ny, grid.nz][i] - 2, Math.ceil(value + reach)));
  const source = tool === 'rib' ? field.slice() : field;
  const layer = grid.nx * grid.ny;
  let changed = false;
  for (let z = low[2]; z <= high[2]; z++) for (let y = low[1]; y <= high[1]; y++) for (let x = low[0]; x <= high[0]; x++) {
    const i = idx(grid, x, y, z);
    const length = Math.hypot(x - coords[0], y - coords[1], z - coords[2]) * STEP;
    const d = source[i];
    let next = d;
    if (tool === 'rib') {
      const weight = Math.max(0, 1 - length / radius) * strength;
      const avg = (source[i - 1] + source[i + 1] + source[i - grid.nx] + source[i + grid.nx] + source[i - layer] + source[i + layer]) / 6;
      next = mix(d, avg, weight);
    } else if (tool === 'loop') {
      next = Math.max(d, radius * strength - length);
    } else {
      next = smoothMin(d, length - radius * strength, tool === 'join' ? 0.135 : 0.08);
    }
    next = clamp(Math.max(next, -(y - 0.5) * STEP), -BAND, BAND);
    changed ||= Math.abs(d - next) > 0.00001;
    field[i] = next;
  }
  return changed;
}

const VOLUME_GRID = emptyGrid();

// Use consistently split cubes when a thin cut leaves an ambiguous surface-net edge.
const TETRAHEDRA = [
  [0, 1, 3, 7], [0, 3, 2, 7], [0, 2, 6, 7],
  [0, 6, 4, 7], [0, 4, 5, 7], [0, 5, 1, 7],
];
const CORNERS = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];

function tetraMesh(grid) {
  const { nx, ny, nz, density } = grid;
  const positions = [], normals = [], index = [];
  const edges = new Map();
  const layer = nx * ny;
  const offsets = CORNERS.map(([x, y, z]) => x + y * nx + z * layer);
  for (let z = 0; z < nz - 1; z++) for (let y = 0; y < ny - 1; y++) for (let x = 0; x < nx - 1; x++) {
    const origin = idx(grid, x, y, z);
    const values = offsets.map(offset => density[origin + offset]);
    if (values.every(value => value >= 128) || values.every(value => value < 128)) continue;

    const crossing = (first, second) => {
      const a = Math.min(first, second), b = Math.max(first, second);
      const key = (origin + offsets[a]) * density.length + origin + offsets[b];
      const saved = edges.get(key);
      if (saved !== undefined) return saved;
      const t = (127.5 - values[a]) / (values[b] - values[a]);
      const i = positions.length / 3;
      const [ax, ay, az] = CORNERS[a], [bx, by, bz] = CORNERS[b];
      const point = [x + mix(ax, bx, t), y + mix(ay, by, t), z + mix(az, bz, t)];
      positions.push(...point);
      normals.push(...normalAt(grid, ...point));
      edges.set(key, i);
      return i;
    };
    const face = (a, b, c, inside, outside) => {
      const lo = CORNERS[inside], hi = CORNERS[outside];
      const ab = positions.slice(b * 3, b * 3 + 3).map((v, i) => v - positions[a * 3 + i]);
      const ac = positions.slice(c * 3, c * 3 + 3).map((v, i) => v - positions[a * 3 + i]);
      const normal = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
      const outward = normal.reduce((sum, n, i) => sum + n * (hi[i] - lo[i]), 0);
      index.push(a, ...(outward > 0 ? [b, c] : [c, b]));
    };
    for (const tet of TETRAHEDRA) {
      const solid = tet.filter(corner => values[corner] >= 128);
      const air = tet.filter(corner => values[corner] < 128);
      if (solid.length === 1) {
        const a = solid[0];
        face(...air.map(b => crossing(a, b)), a, air[0]);
      } else if (air.length === 1) {
        const a = air[0];
        face(...solid.map(b => crossing(a, b)), solid[0], a);
      } else if (solid.length === 2) {
        const [a, b] = solid, [c, d] = air;
        const ac = crossing(a, c), ad = crossing(a, d), bc = crossing(b, c), bd = crossing(b, d);
        face(ac, ad, bd, a, c);
        face(ac, bd, bc, a, c);
      }
    }
  }
  return index.length ? {
    positions: Float32Array.from(positions), normals: Float32Array.from(normals),
    index: positions.length / 3 > 65535 ? Uint32Array.from(index) : Uint16Array.from(index),
  } : null;
}

export function volumeMesh(field, precise = false) {
  const grid = VOLUME_GRID;
  for (let i = 0; i < field.length; i++) grid.density[i] = clamp(Math.round(127.5 - field[i] * 125 / BAND), 0, 255);
  const mesh = precise ? tetraMesh(grid) : meshRegion(grid, 0, 0, 0, grid.nx - 1, grid.ny - 1, grid.nz - 1);
  if (!mesh) return null;
  const { positions } = mesh;
  for (let i = 0; i < positions.length; i += 3) positions.set(toCm(grid, positions[i], positions[i + 1], positions[i + 2]), i);
  return mesh;
}

export function saveClay(project) {
  const { field, ...data } = project;
  return JSON.stringify({ version: 1, ...data, ...(field && { field: toBase64(new Uint8Array(field.buffer)) }) });
}

const within = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;

export function openClay(json) {
  const { version, kind, body, finish, stage, heightMm, pot, field } = JSON.parse(json);
  if (version !== 1 || !Object.hasOwn(BODIES, body) || !Object.hasOwn(FINISHES, finish) ||
      !Number.isInteger(stage) || !within(stage, 0, 3) || !within(heightMm, 20, 500)) throw new Error('This is not a valid clay project.');
  const settings = { kind, body, finish, stage, heightMm };
  if (kind === 'pot' && pot && within(pot.height, 0.3, 3.45) && within(pot.wobble, 0, 0.2) && typeof pot.open === 'boolean' &&
      [pot.radius, pot.wall].every(values => Array.isArray(values) && values.length === 25 && values.every(v => within(v, 0.04, 2))) &&
      Array.isArray(pot.coils) && pot.coils.length <= 30 && pot.coils.every(c => c && within(c.at, 0, 1) && within(c.depth, 0, 0.07)) &&
      Array.isArray(pot.pinches) && pot.pinches.length <= 28 && pot.pinches.every(m => m && within(m.at, 0, 1) &&
        within(m.angle, -Math.PI, Math.PI) && within(m.range, 0.1, 0.34) && within(m.depth, -0.2, 0.2))) {
    return { ...settings, pot };
  }
  if (kind === 'volume' && typeof field === 'string' && field.length === 4 * Math.ceil(VOLUME_GRID.density.length * 4 / 3)) {
    const values = new Float32Array(fromBase64(field).buffer);
    if (values.length === VOLUME_GRID.density.length && values.every(value => within(value, -BAND, BAND))) {
      return { ...settings, field: values };
    }
  }
  throw new Error('This clay project has damaged geometry.');
}
