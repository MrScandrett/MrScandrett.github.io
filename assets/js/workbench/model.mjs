/* model.mjs — Workbench projects: the file format, transforms, and the scene
 * evaluation the page and `node --test` share. No DOM.
 *
 * A project is a tree. Every node has pos / rot (degrees, Euler XYZ like
 * Three.js) / scale and a pivot (the point, in the node's own space, that it
 * rotates and scales around), so
 *
 *   local = T(pos) · R(rot) · S(scale) · T(−pivot)
 *
 * Shape nodes hold a shape id and its params; group nodes hold children. A
 * node marked `hole` cuts every solid in its own group (holes at the top
 * level cut everything), the way holes work in Tinkercad. Units are the
 * preset's (mm or m), Z is up, and every shape is centred on its bounding box
 * (axial shapes keep their axis as the X/Y centre).
 *
 * evaluate() and printBodies() must run inside engine.scoped / engine.run so
 * the WebAssembly objects they make are freed.
 */

import { SHAPES, shapeById } from './shapes.mjs';

export const FORMAT = 'classroomos-workbench';
export const VERSION = 1;
export const MAX_NODES = 400;
const MAX_DEPTH = 8;

/* scale: how a shape's tabletop-millimetre defaults land in this project, by kind. */
export const PRESETS = {
  print: { id: 'print', label: '3D print', hint: 'Millimetres, on the MakerBot bed', units: 'mm', toMm: 1, grid: 1, major: 10, plane: [260, 160], scale: { object: 1, handheld: 1, building: 1 }, printScale: 1 },
  product: { id: 'product', label: 'Product prototype', hint: 'Millimetres, a desk-sized workplane', units: 'mm', toMm: 1, grid: 1, major: 10, plane: [300, 300], scale: { object: 1.5, handheld: 1.5, building: 1 }, printScale: 1 },
  building: { id: 'building', label: 'Architecture', hint: 'Metres, a 30 m site; prints as a 1:100 model', units: 'm', toMm: 1000, grid: 0.1, major: 1, plane: [30, 30], scale: { object: 0.05, handheld: 0.012, building: 0.1 }, printScale: 100 },
  game: { id: 'game', label: 'Game & animation', hint: 'Metres, Y-up GLB for game engines', units: 'm', toMm: 1000, grid: 0.05, major: 0.5, plane: [8, 8], scale: { object: 0.025, handheld: 0.012, building: 0.1 }, printScale: 20 },
};

export const FINISHES = {
  matte: { label: 'Matte', roughness: 0.85, metalness: 0 },
  satin: { label: 'Satin', roughness: 0.5, metalness: 0 },
  gloss: { label: 'Glossy', roughness: 0.18, metalness: 0 },
  metal: { label: 'Metal', roughness: 0.32, metalness: 1 },
  glow: { label: 'Glow', roughness: 0.6, metalness: 0, emissive: 0.9 },
  glass: { label: 'Glass', roughness: 0.05, metalness: 0, opacity: 0.45 },
};

export const EASES = { smooth: 'Ease in & out', linear: 'Steady', in: 'Speed up', out: 'Slow down', step: 'Jump' };

export const nice = (v) => Number(Number(v).toPrecision(4));
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every((x) => Number.isFinite(x));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const kindScale = (preset, shape) => (PRESETS[preset] || PRESETS.print).scale[shape.kind] ?? 1;

/* ── shape params ─────────────────────────────────────────────────────── */

export function paramLimits(spec, factor) {
  const f = spec.len ? factor : 1;
  return { min: nice(spec.min * f), max: nice(spec.max * f), step: nice(spec.step * f), default: spec.len ? nice(spec.default * f) : spec.default };
}

export function defaultParams(shape, preset) {
  const f = kindScale(preset, shape);
  const out = {};
  for (const spec of shape.params) {
    if (spec.type === 'points') out[spec.id] = spec.default.map(([x, y]) => [nice(x * f), nice(y * f)]);
    else if (spec.len) out[spec.id] = nice(spec.default * f);
    else out[spec.id] = spec.default;
  }
  return out;
}

/* The shape's defaults, then whatever was given, held inside the shape's ranges. */
export function resolveParams(shape, given = {}, preset = 'print') {
  const f = kindScale(preset, shape);
  const base = defaultParams(shape, preset);
  const out = {};
  for (const spec of shape.params) {
    let v = given?.[spec.id];
    if (spec.type === 'select') v = spec.options.some((o) => o.value === v) ? v : base[spec.id];
    else if (spec.type === 'toggle') v = typeof v === 'boolean' ? v : base[spec.id];
    else if (spec.type === 'text') v = typeof v === 'string' ? v.slice(0, spec.maxLength ?? 24) : base[spec.id];
    else if (spec.type === 'points') {
      const lim = spec.max * f;
      v = Array.isArray(v) && v.length >= 2 && v.length <= 64 && v.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))
        ? v.map(([x, y]) => [clamp(x, -lim, lim), clamp(y, -lim, lim)]) : base[spec.id];
    } else {
      const { min, max } = paramLimits(spec, f);
      v = Number(v);
      v = Number.isFinite(v) ? clamp(v, min, max) : base[spec.id];
    }
    out[spec.id] = v;
  }
  return out;
}

export const shapeScale = (preset, shapeId) => kindScale(preset, shapeById(shapeId));

/* ── projects ─────────────────────────────────────────────────────────── */

export function freshProject(preset = 'print', name = '') {
  return {
    format: FORMAT, version: VERSION, name, preset: PRESETS[preset] ? preset : 'print',
    objects: [],
    animation: { duration: 2, loop: true, tracks: {} },
    print: { arrange: 'asBuilt', printScale: (PRESETS[preset] || PRESETS.print).printScale },
  };
}

export function walk(nodes, fn, parent = null, depth = 0) {
  for (const node of nodes) {
    if (fn(node, parent, depth) === false) return false;
    if (node.type === 'group' && walk(node.children, fn, node, depth + 1) === false) return false;
  }
  return true;
}

export function countNodes(nodes) { let n = 0; walk(nodes, () => { n++; }); return n; }

/* { node, parent (group node or null), list (the array holding it), index } */
export function findNode(project, id) {
  let hit = null;
  walk(project.objects, (node, parent) => {
    if (node.id !== id) return true;
    const list = parent ? parent.children : project.objects;
    hit = { node, parent, list, index: list.indexOf(node) };
    return false;
  });
  return hit;
}

export function nextId(project) {
  let max = 0;
  walk(project.objects, (n) => { const m = /^n(\d+)$/.exec(n.id); if (m) max = Math.max(max, Number(m[1])); });
  return `n${max + 1}`;
}

export function newShapeNode(project, shapeId, extra = {}) {
  const shape = shapeById(shapeId);
  if (!shape) throw new Error(`Unknown shape: ${shapeId}`);
  return {
    id: nextId(project), type: 'shape', shape: shapeId, name: shape.name,
    params: resolveParams(shape, extra.params, project.preset),
    color: extra.color || '#e8792a', finish: extra.finish || 'matte', hole: Boolean(extra.hole),
    pos: extra.pos || [0, 0, 0], rot: extra.rot || [0, 0, 0], scale: extra.scale || [1, 1, 1], pivot: extra.pivot || [0, 0, 0],
  };
}

/* Throws a sentence a student can act on; returns a clean copy. */
export function validateProject(raw) {
  if (!raw || raw.format !== FORMAT) throw new Error('This is not a Workbench project (.workbench.json).');
  if (raw.version !== VERSION) throw new Error(`This project was saved by a newer Workbench (version ${raw.version}).`);
  const project = freshProject(raw.preset, typeof raw.name === 'string' ? raw.name.slice(0, 60) : '');
  const ids = new Set();
  let count = 0;
  const vec = (v, fallback, lo = -1e6, hi = 1e6) => (isVec3(v) ? v.map((x) => clamp(x, lo, hi) || 0) : fallback);
  const node = (n, depth) => {
    if (++count > MAX_NODES) throw new Error(`A project can hold up to ${MAX_NODES} shapes.`);
    if (depth > MAX_DEPTH) throw new Error('Groups are nested too deeply.');
    if (!n || typeof n.id !== 'string' || !/^[A-Za-z0-9_-]{1,24}$/.test(n.id) || ids.has(n.id)) throw new Error('The project has a shape with a missing or repeated id.');
    ids.add(n.id);
    const base = {
      id: n.id, type: n.type === 'group' ? 'group' : 'shape',
      name: typeof n.name === 'string' && n.name.trim() ? n.name.slice(0, 40) : (n.type === 'group' ? 'Group' : 'Shape'),
      color: /^#[0-9a-f]{6}$/i.test(n.color) ? n.color.toLowerCase() : '#e8792a',
      finish: FINISHES[n.finish] ? n.finish : 'matte', hole: n.hole === true,
      pos: vec(n.pos, [0, 0, 0]), rot: vec(n.rot, [0, 0, 0], -1e5, 1e5),
      scale: (isVec3(n.scale) ? n.scale : [1, 1, 1]).map((s) => (Math.abs(s) < 1e-3 ? Math.sign(s || 1) * 1e-3 : clamp(s, -1e3, 1e3))),
      pivot: vec(n.pivot, [0, 0, 0]),
    };
    if (base.type === 'group') {
      if (!Array.isArray(n.children)) throw new Error(`Group “${base.name}” has no shapes in it.`);
      base.children = n.children.map((c) => node(c, depth + 1));
      return base;
    }
    const shape = shapeById(n.shape);
    if (!shape) throw new Error(`This project uses a shape Workbench doesn't know (“${String(n.shape).slice(0, 30)}”).`);
    return { ...base, shape: shape.id, params: resolveParams(shape, n.params, project.preset) };
  };
  if (!Array.isArray(raw.objects)) throw new Error('The project file has no shapes list.');
  project.objects = raw.objects.map((n) => node(n, 0));

  const a = raw.animation || {};
  project.animation.duration = Number.isFinite(a.duration) ? clamp(a.duration, 0.25, 60) : 2;
  project.animation.loop = a.loop !== false;
  for (const [id, keys] of Object.entries(a.tracks || {})) {
    if (!ids.has(id) || !Array.isArray(keys)) continue;
    const clean = keys.slice(0, 200).filter((k) => k && Number.isFinite(k.t) && isVec3(k.pos) && isVec3(k.rot) && isVec3(k.scale))
      .map((k) => ({ t: clamp(k.t, 0, project.animation.duration), pos: [...k.pos], rot: [...k.rot], scale: [...k.scale], ease: EASES[k.ease] ? k.ease : 'smooth' }))
      .sort((x, y) => x.t - y.t);
    if (clean.length) project.animation.tracks[id] = clean;
  }
  const pr = raw.print || {};
  if (pr.arrange === 'apart') project.print.arrange = 'apart';
  if (Number.isFinite(pr.printScale) && pr.printScale >= 1 && pr.printScale <= 1000) project.print.printScale = pr.printScale;
  return project;
}

/* ── 4×4 matrices, column-major (the layout Manifold and Three.js use) ─── */

export function compose(pos, rot, scale, pivot = [0, 0, 0]) {
  const [x, y, z] = rot.map((d) => (d * Math.PI) / 180);
  const a = Math.cos(x), b = Math.sin(x), c = Math.cos(y), d = Math.sin(y), e = Math.cos(z), f = Math.sin(z);
  const ae = a * e, af = a * f, be = b * e, bf = b * f;
  // Three.js Matrix4.makeRotationFromEuler, order XYZ
  const r = [c * e, af + be * d, bf - ae * d, -c * f, ae - bf * d, be + af * d, d, -b * c, a * c];
  const m = new Float64Array(16);
  for (let col = 0; col < 3; col++) for (let row = 0; row < 3; row++) m[col * 4 + row] = r[col * 3 + row] * scale[col];
  for (let row = 0; row < 3; row++) m[12 + row] = pos[row] - (m[row] * pivot[0] + m[4 + row] * pivot[1] + m[8 + row] * pivot[2]);
  m[15] = 1;
  return m;
}

export const localMatrix = (n, pose) => compose(pose?.pos ?? n.pos, pose?.rot ?? n.rot, pose?.scale ?? n.scale, n.pivot);

export function mul(a, b) {
  const out = new Float64Array(16);
  for (let col = 0; col < 4; col++) for (let row = 0; row < 4; row++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + row] * b[col * 4 + k];
    out[col * 4 + row] = s;
  }
  return out;
}

export const IDENTITY = compose([0, 0, 0], [0, 0, 0], [1, 1, 1]);

/* Inverse of an affine matrix. */
export function invert(m) {
  const [a, b, c, , d, e, f, , g, h, i] = m;
  const det = a * (e * i - f * h) - d * (b * i - c * h) + g * (b * f - c * e);
  if (Math.abs(det) < 1e-18) throw new Error('A shape is squashed flat (a scale of zero).');
  const r = [(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det,
    (f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det,
    (d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det];
  const out = new Float64Array(16);
  for (let col = 0; col < 3; col++) for (let row = 0; row < 3; row++) out[col * 4 + row] = r[col * 3 + row];
  for (let row = 0; row < 3; row++) out[12 + row] = -(out[row] * m[12] + out[4 + row] * m[13] + out[8 + row] * m[14]);
  out[15] = 1;
  return out;
}

export function applyPoint(m, [x, y, z]) {
  return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
}

export function applyVector(m, [x, y, z]) {
  return [m[0] * x + m[4] * y + m[8] * z, m[1] * x + m[5] * y + m[9] * z, m[2] * x + m[6] * y + m[10] * z];
}

export function transformPositions(m, positions) {
  const out = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    out[i] = m[0] * x + m[4] * y + m[8] * z + m[12];
    out[i + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
    out[i + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
  }
  return out;
}

/* pos / rot / scale for a matrix, keeping `pivot` (exact unless the matrix shears). */
export function decompose(m, pivot = [0, 0, 0]) {
  const cols = [0, 1, 2].map((c) => [m[c * 4], m[c * 4 + 1], m[c * 4 + 2]]);
  const scale = cols.map((v) => Math.hypot(...v));
  const det = m[0] * (m[5] * m[10] - m[6] * m[9]) - m[4] * (m[1] * m[10] - m[2] * m[9]) + m[8] * (m[1] * m[6] - m[2] * m[5]);
  if (det < 0) scale[0] = -scale[0];
  const r = cols.map((v, c) => v.map((x) => x / (scale[c] || 1)));
  // Three.js Euler.setFromRotationMatrix, order XYZ; r[col][row]
  const m13 = clamp(r[2][0], -1, 1);
  const ry = Math.asin(m13);
  let rx, rz;
  if (Math.abs(m13) < 0.9999999) { rx = Math.atan2(-r[2][1], r[2][2]); rz = Math.atan2(-r[1][0], r[0][0]); } else { rx = Math.atan2(r[1][2], r[1][1]); rz = 0; }
  const rot = [rx, ry, rz].map((v) => nice((v * 180) / Math.PI) || 0);
  const pos = applyVector(m, pivot).map((v, k) => nice(v + m[12 + k]));
  return { pos, rot, scale: scale.map(nice) };
}

/* ── scene evaluation ─────────────────────────────────────────────────── */

export function createShapeCache() { return new Map(); }
const CACHE_LIMIT = 240;

/* The shape centred on its bounding box, as cached mesh data. */
function shapeData(ctx, cache, node) {
  const key = `${node.shape}|${JSON.stringify(node.params)}`;
  let hit = cache.get(key);
  if (hit) { cache.delete(key); cache.set(key, hit); return hit; }
  const shape = shapeById(node.shape);
  const m = shape.build(ctx, node.params);
  const status = m.status();
  if (status !== 'NoError') throw new Error(`This shape could not be built (${status}). Try changing one setting.`);
  if (m.isEmpty()) throw new Error('These settings leave nothing to build.');
  const { min, max } = m.boundingBox();
  const mesh = m.translate(min.map((v, k) => (shape.axial && k < 2 ? 0 : -(v + max[k]) / 2))).getMesh();
  hit = { numProp: mesh.numProp, vertProperties: Float32Array.from(mesh.vertProperties), triVerts: Uint32Array.from(mesh.triVerts), size: max.map((v, k) => v - min[k]) };
  hit.soup = soupOf(hit);
  cache.set(key, hit);
  while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
  return hit;
}

/* Size of a shape node's bounding box before its own transform. */
export function shapeSize(ctx, node, opts = {}) {
  return shapeData({ ...ctx, noise: opts.noise }, opts.cache || createShapeCache(), node).size;
}

/* The shape's triangles, centred, before its own transform (library pictures). */
export function shapeSoup(ctx, node, opts = {}) {
  return shapeData({ ...ctx, noise: opts.noise }, opts.cache || createShapeCache(), node).soup;
}

function soupOf({ numProp, vertProperties: v, triVerts: t }) {
  const out = new Float32Array(t.length * 3);
  for (let i = 0; i < t.length; i++) { const p = t[i] * numProp; out[i * 3] = v[p]; out[i * 3 + 1] = v[p + 1]; out[i * 3 + 2] = v[p + 2]; }
  return out;
}

function manifoldSoup(m) {
  const mesh = m.getMesh();
  return soupOf({ numProp: mesh.numProp, vertProperties: mesh.vertProperties, triVerts: mesh.triVerts });
}

const overlaps = (a, b) => a.min.every((v, k) => v <= b.max[k] && b.min[k] <= a.max[k]);
const growBounds = (acc, b) => (!b ? acc : !acc ? { min: [...b.min], max: [...b.max] } : { min: acc.min.map((v, k) => Math.min(v, b.min[k])), max: acc.max.map((v, k) => Math.max(v, b.max[k])) });

function evaluator(ctx, opts) {
  const { Manifold: M } = ctx;
  const cache = opts.cache || createShapeCache();
  const sctx = { ...ctx, noise: opts.noise };
  const errors = [];
  const leaf = (node, world) => {
    try {
      const data = shapeData(sctx, cache, node);
      const m = ctx.track(new M(new ctx.Mesh({ numProp: data.numProp, vertProperties: data.vertProperties, triVerts: data.triVerts })));
      return { data, manifold: m.transform(Array.from(world)) };
    } catch (error) {
      errors.push({ id: node.id, message: error.message || String(error) });
      return null;
    }
  };
  /* Every solid under `node` as world-space manifolds, with the holes of each
     group applied to its own members. */
  function solids(node, parentWorld, cutters, out) {
    const world = mul(parentWorld, localMatrix(node));
    if (node.type === 'group') {
      const scope = withHoles(node.children, world, cutters);
      for (const c of node.children) if (!c.hole) solids(c, world, scope, out);
      return;
    }
    const built = leaf(node, world);
    if (!built) return;
    let m = built.manifold, cut = false;
    const box = m.boundingBox();
    for (const c of cutters) if (overlaps(box, c.box)) { m = m.subtract(c.manifold); cut = true; }
    if (cut && m.isEmpty()) { errors.push({ id: node.id, message: 'A hole cuts this shape away completely.' }); return; }
    out.push({ node, world, manifold: m, cut, data: built.data });
  }
  function cutterOf(node, parentWorld) {
    const parts = [];
    solids(node, parentWorld, [], parts);
    if (!parts.length) return null;
    const manifold = parts.length === 1 ? parts[0].manifold : M.union(parts.map((p) => p.manifold));
    return { manifold, box: manifold.boundingBox() };
  }
  function withHoles(children, world, cutters) {
    const own = children.filter((c) => c.hole).map((c) => cutterOf(c, world)).filter(Boolean);
    if (!own.length) return cutters;
    const manifold = own.length === 1 ? own[0].manifold : M.union(own.map((c) => c.manifold));
    return [...cutters, { manifold, box: manifold.boundingBox() }];
  }
  return { solids, withHoles, leaf, errors, cache };
}

/* What the page draws: each solid with its cuts, in its own local frame (so
   animation can move it), each hole as a see-through ghost, and the world
   bounds of every node (`bounds` counts holes, `solid` leaves them out). */
export function evaluate(ctx, project, opts = {}) {
  const ev = evaluator(ctx, opts);
  const pieces = [], ghosts = [], bounds = {}, solid = {};
  const rootScope = ev.withHoles(project.objects, IDENTITY, []);
  // returns [bounds including holes, bounds of solids only]
  function visit(node, parentWorld, cutters, ghost) {
    const world = mul(parentWorld, localMatrix(node));
    if (node.type === 'group') {
      const scope = ghost ? [] : ev.withHoles(node.children, world, cutters);
      let box = null, solidBox = null;
      for (const c of node.children) {
        const [b, sb] = visit(c, world, scope, ghost || c.hole);
        box = growBounds(box, b);
        solidBox = growBounds(solidBox, sb);
      }
      if (box) bounds[node.id] = box;
      if (solidBox) solid[node.id] = solidBox;
      else if (box) solid[node.id] = box;        // a hole group measures by its own shapes
      return [box, ghost ? null : solidBox];
    }
    if (ghost) {
      const built = ev.leaf(node, world);
      if (!built) return [null, null];
      ghosts.push({ id: node.id, local: built.data.soup, world });
      bounds[node.id] = solid[node.id] = built.manifold.boundingBox();
      return [bounds[node.id], null];
    }
    const out = [];
    ev.solids(node, parentWorld, cutters, out);
    if (!out.length) return [null, null];
    const [p] = out;
    const local = p.cut ? manifoldSoup(p.manifold.transform(Array.from(invert(world)))) : p.data.soup;
    pieces.push({ id: node.id, local, world, cut: p.cut });
    bounds[node.id] = solid[node.id] = p.manifold.boundingBox();
    return [bounds[node.id], bounds[node.id]];
  }
  let all = null, solidAll = null;
  for (const n of project.objects) {
    const [b, sb] = visit(n, IDENTITY, rootScope, n.hole);
    all = growBounds(all, b);
    solidAll = growBounds(solidAll, sb);
  }
  const sizes = {};
  walk(project.objects, (n) => { if (n.type === 'shape') { const hit = ev.cache.get(`${n.shape}|${JSON.stringify(n.params)}`); if (hit) sizes[n.id] = hit.size; } });
  return { pieces, ghosts, bounds, solid, all, solidAll: solidAll || all, sizes, errors: ev.errors };
}

/* One print body per top-level solid (its pieces unioned), in millimetres at
   the project's print scale. For engine.run. */
export function printBodies(ctx, project, opts = {}) {
  const { Manifold: M } = ctx;
  const ev = evaluator(ctx, opts);
  const preset = PRESETS[project.preset] || PRESETS.print;
  const k = preset.toMm / (project.print?.printScale || preset.printScale || 1);
  const rootScope = ev.withHoles(project.objects, IDENTITY, []);
  const bodies = [];
  const names = new Map();
  for (const node of project.objects) {
    if (node.hole) continue;
    const parts = [];
    ev.solids(node, IDENTITY, rootScope, parts);
    if (!parts.length) continue;
    let manifold = parts.length === 1 ? parts[0].manifold : M.union(parts.map((p) => p.manifold));
    if (k !== 1) manifold = manifold.scale([k, k, k]);
    const n = (names.get(node.name) || 0) + 1;
    names.set(node.name, n);
    bodies.push({ name: n > 1 ? `${node.name} ${n}` : node.name, manifold, color: node.type === 'shape' ? node.color : firstColor(node) });
  }
  return { bodies, errors: ev.errors };
}

function firstColor(node) {
  let color = '#e8792a';
  walk([node], (n) => { if (n.type === 'shape' && !n.hole) { color = n.color; return false; } return true; });
  return color;
}

/* ── editing helpers ──────────────────────────────────────────────────── */

/* World matrix of a node's parent (identity at the top level). */
export function parentWorld(project, id) {
  const chain = [];
  const seek = (nodes, trail) => {
    for (const n of nodes) {
      if (n.id === id) { chain.push(...trail); return true; }
      if (n.type === 'group' && seek(n.children, [...trail, n])) return true;
    }
    return false;
  };
  seek(project.objects, []);
  return chain.reduce((m, n) => mul(m, localMatrix(n)), IDENTITY);
}

/* Wrap sibling nodes in a new group whose origin is `centre` (in their parent's space). */
export function groupNodes(project, ids, centre, name = 'Group') {
  const hits = ids.map((id) => findNode(project, id)).filter(Boolean);
  if (hits.length < 1) return null;
  const list = hits[0].list;
  if (hits.some((h) => h.list !== list)) throw new Error('Pick shapes from the same group to group them together.');
  const at = Math.min(...hits.map((h) => h.index));
  const children = list.filter((n) => ids.includes(n.id));
  for (const c of children) c.pos = c.pos.map((v, k) => nice(v - centre[k]));
  const group = { id: nextId(project), type: 'group', name, color: children[0]?.color || '#e8792a', finish: 'matte', hole: false, pos: centre.map(nice), rot: [0, 0, 0], scale: [1, 1, 1], pivot: [0, 0, 0], children };
  const rest = list.filter((n) => !ids.includes(n.id));
  rest.splice(Math.min(at, rest.length), 0, group);
  list.splice(0, list.length, ...rest);
  return group;
}

/* Put a group's children back in its parent, keeping where they are in the world. */
export function ungroup(project, id) {
  const hit = findNode(project, id);
  if (!hit || hit.node.type !== 'group') return [];
  const g = localMatrix(hit.node);
  const children = hit.node.children.map((c) => {
    Object.assign(c, decompose(mul(g, localMatrix(c)), c.pivot));
    if (hit.node.hole) c.hole = true;
    return c;
  });
  hit.list.splice(hit.index, 1, ...children);
  delete project.animation.tracks[id];
  return children;
}

/* Move a node's pivot to `pivot` (its own space) without moving the node. */
export function setPivot(node, pivot) {
  const before = localMatrix(node);
  node.pivot = pivot.map(nice);
  const after = localMatrix(node);
  node.pos = node.pos.map((v, k) => nice(v + before[12 + k] - after[12 + k]));
}

/* A deep copy with fresh ids. `taken` collects ids handed out but not yet in
   the project, so several copies made in a row never collide. */
export function cloneNode(project, node, taken = new Set()) {
  const copy = JSON.parse(JSON.stringify(node));
  let max = 0;
  const see = (id) => { const m = /^n(\d+)$/.exec(id); if (m) max = Math.max(max, Number(m[1])); };
  walk(project.objects, (n) => see(n.id));
  taken.forEach(see);
  walk([copy], (n) => { n.id = `n${++max}`; taken.add(n.id); });
  return copy;
}

/* Give a copy the same animation as its original (the trees match node for node). */
export function cloneTracks(project, original, copy) {
  const a = [], b = [];
  walk([original], (n) => { a.push(n.id); });
  walk([copy], (n) => { b.push(n.id); });
  a.forEach((id, i) => { const keys = project.animation.tracks[id]; if (keys) project.animation.tracks[b[i]] = JSON.parse(JSON.stringify(keys)); });
}

/* Copies of a node in a line (`step` apart) or a circle (about Z through
   `centre`, in the parent's space). Returns the copies; the caller adds them. */
export function patternCopies(project, node, { mode, count, step = [0, 0, 0], centre = [0, 0, 0], angle = 360 }) {
  const n = Math.max(2, Math.min(64, Math.round(count)));
  const base = localMatrix(node), taken = new Set(), copies = [];
  for (let i = 1; i < n; i++) {
    const copy = cloneNode(project, node, taken);
    if (mode === 'circle') {
      const a = angle >= 360 ? (360 * i) / n : (angle * i) / (n - 1);
      const about = mul(compose(centre, [0, 0, a], [1, 1, 1]), compose(centre.map((v) => -v), [0, 0, 0], [1, 1, 1]));
      Object.assign(copy, decompose(mul(about, base), copy.pivot));
    } else {
      copy.pos = node.pos.map((v, k) => nice(v + step[k] * i));
    }
    copies.push(copy);
  }
  return copies;
}

/* ── animation ────────────────────────────────────────────────────────── */

export function ease(kind, u) {
  if (kind === 'linear') return u;
  if (kind === 'in') return u * u;
  if (kind === 'out') return 1 - (1 - u) * (1 - u);
  if (kind === 'step') return u < 1 ? 0 : 1;
  return u * u * (3 - 2 * u);
}

const lerp3 = (a, b, u) => a.map((v, k) => v + (b[k] - v) * u);

/* Pose of a track at time t; null when the node has no keys. */
export function samplePose(keys, t) {
  if (!keys?.length) return null;
  const pose = (k) => ({ pos: [...k.pos], rot: [...k.rot], scale: [...k.scale] });
  if (t <= keys[0].t) return pose(keys[0]);
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i].t) {
      const a = keys[i - 1], b = keys[i];
      const u = ease(a.ease, (t - a.t) / (b.t - a.t || 1));
      return { pos: lerp3(a.pos, b.pos, u), rot: lerp3(a.rot, b.rot, u), scale: lerp3(a.scale, b.scale, u) };
    }
  }
  return pose(keys[keys.length - 1]);
}

/* Record a node's current transform at time t (replacing a key already there).
   A node's first key also keys its resting pose at 0 so motion starts from it. */
export function setKey(project, id, t, pose, easeKind = 'smooth') {
  const tracks = project.animation.tracks;
  const keys = tracks[id] || (tracks[id] = []);
  const rest = findNode(project, id)?.node;
  if (!keys.length && t > 1e-3 && rest) keys.push({ t: 0, pos: [...rest.pos], rot: [...rest.rot], scale: [...rest.scale], ease: easeKind });
  const key = { t: nice(t), pos: pose.pos.map(nice), rot: pose.rot.map(nice), scale: pose.scale.map(nice), ease: easeKind };
  const at = keys.findIndex((k) => Math.abs(k.t - t) < 1e-3);
  if (at >= 0) keys[at] = { ...key, ease: keys[at].ease };
  else keys.push(key);
  keys.sort((a, b) => a.t - b.t);
  return keys;
}

/* A steady spin: `turns` whole turns about one axis over the loop. */
export function addSpin(project, id, axis, turns) {
  const node = findNode(project, id)?.node;
  if (!node) return;
  const k = { x: 0, y: 1, z: 2 }[axis] ?? 2;
  const end = [...node.rot];
  end[k] += 360 * turns;
  project.animation.tracks[id] = [
    { t: 0, pos: [...node.pos], rot: [...node.rot], scale: [...node.scale], ease: 'linear' },
    { t: project.animation.duration, pos: [...node.pos], rot: end, scale: [...node.scale], ease: 'linear' },
  ];
}

export function pruneTracks(project) {
  const ids = new Set();
  walk(project.objects, (n) => { ids.add(n.id); });
  for (const id of Object.keys(project.animation.tracks)) if (!ids.has(id)) delete project.animation.tracks[id];
}

export { SHAPES };
