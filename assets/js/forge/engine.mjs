/* engine.mjs — runs Forge parts on the manifold-3d kernel and checks the result
 * the way a slicer would. No DOM: the page and `node --test` share it.
 *
 *   const engine = await createEngine(ManifoldModule, { font });
 *   const result = engine.run(part, params, settings);
 *     → { bodies: [{ name, positions (Z-up mm soup), volume, area }], layout, verdicts, stats, error }
 *
 * manifold-3d objects live in WebAssembly memory and are not garbage
 * collected, so every object created while a part builds is recorded and
 * freed once its triangles have been copied out (the same idea as
 * manifold-3d's own lib/garbage-collector.js).
 */

import { DEFAULT_PRINTER, bounds, edgeReport, printerFit } from '../fab-io.mjs';

const MANIFOLD_STATIC = ['cube', 'cylinder', 'sphere', 'tetrahedron', 'extrude', 'revolve', 'compose', 'union', 'difference', 'intersection', 'ofMesh', 'hull', 'smooth', 'levelSet'];
const MANIFOLD_MEMBER = ['add', 'subtract', 'intersect', 'decompose', 'warp', 'transform', 'translate', 'rotate', 'scale', 'mirror', 'refine', 'refineToLength', 'refineToTolerance', 'simplify', 'asOriginal', 'trimByPlane', 'split', 'splitByPlane', 'hull', 'setTolerance', 'calculateNormals', 'smoothOut', 'smoothByNormals', 'setProperties'];
const SECTION_STATIC = ['square', 'circle', 'union', 'difference', 'intersection', 'compose', 'ofPolygons', 'hull'];
const SECTION_MEMBER = ['add', 'subtract', 'intersect', 'rectClip', 'decompose', 'transform', 'translate', 'rotate', 'scale', 'mirror', 'simplify', 'offset', 'hull', 'extrude', 'revolve', 'warp'];

export const PLA_DENSITY = 1.24;          // g/cm³
const SHELL = 0.8;                        // two 0.4 mm perimeters / top-bottom skin
const INFILL = 0.15;
const FLOW = 2.5;                         // mm³/s a classroom printer really averages
const OVERHANG_LIMIT = 45;                // degrees from vertical
const LAYOUT_GAP = 8;                     // mm between bodies on the bed

function wrapForTracking(wasm, registry) {
  const record = (value) => {
    if (Array.isArray(value)) value.forEach(record);
    else if (value && typeof value.delete === 'function') registry.push(value);
    return value;
  };
  const patch = (target, names) => {
    for (const name of names) {
      const original = target[name];
      if (typeof original !== 'function' || original.__forgeTracked) continue;
      const wrapped = function (...args) { return record(original.apply(this, args)); };
      wrapped.__forgeTracked = true;
      target[name] = wrapped;
    }
  };
  patch(wasm.Manifold, MANIFOLD_STATIC);
  patch(wasm.Manifold.prototype, MANIFOLD_MEMBER);
  patch(wasm.CrossSection, SECTION_STATIC);
  patch(wasm.CrossSection.prototype, SECTION_MEMBER);
}

/* Z-up triangle soup in mm from a manifold. */
function soup(manifold) {
  const mesh = manifold.getMesh();
  const { numProp, vertProperties: v, triVerts: t } = mesh;
  const out = new Float32Array(t.length * 3);
  for (let i = 0; i < t.length; i++) {
    const p = t[i] * numProp;
    out[i * 3] = v[p];
    out[i * 3 + 1] = v[p + 1];
    out[i * 3 + 2] = v[p + 2];
  }
  return out;
}

/* Faces that point down more steeply than the printer can hold up, ignoring
   faces on the bed. Down-facing faces are grouped into connected regions: a
   region narrower than BRIDGE_SPAN in X or Y is a bridge (the ceiling of a
   hole, an engraved letter, a cable slot), which a printer spans in mid-air
   without supports. Everything else is a real overhang. The mask marks each
   triangle 0 (fine), 1 (overhang) or 2 (bridge) for the viewer to paint. */
const BRIDGE_SPAN = 10;

export function overhangs(positions, limitDeg = OVERHANG_LIMIT) {
  const n = positions.length / 9;
  const mask = new Uint8Array(n);
  const threshold = -Math.sin((limitDeg * Math.PI) / 180);  // normal.z below this → too steep
  const areas = new Float64Array(n);
  const down = [];
  for (let t = 0; t < n; t++) {
    const i = t * 9;
    const ux = positions[i + 3] - positions[i], uy = positions[i + 4] - positions[i + 1], uz = positions[i + 5] - positions[i + 2];
    const vx = positions[i + 6] - positions[i], vy = positions[i + 7] - positions[i + 1], vz = positions[i + 8] - positions[i + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-12) continue;
    const highest = Math.max(positions[i + 2], positions[i + 5], positions[i + 8]);
    if (highest < 0.05) continue;                         // on the bed
    if (nz / len < threshold) { down.push(t); areas[t] = len / 2; }
  }

  // union-find over down-facing triangles that share a corner
  const parent = new Map(down.map((t) => [t, t]));
  const find = (t) => { while (parent.get(t) !== t) { parent.set(t, parent.get(parent.get(t))); t = parent.get(t); } return t; };
  const byCorner = new Map();
  const key = (i) => `${Math.round(positions[i] * 1e3)},${Math.round(positions[i + 1] * 1e3)},${Math.round(positions[i + 2] * 1e3)}`;
  for (const t of down) {
    for (let c = 0; c < 3; c++) {
      const k = key(t * 9 + c * 3);
      const other = byCorner.get(k);
      if (other === undefined) byCorner.set(k, t);
      else { const a = find(t), b = find(other); if (a !== b) parent.set(a, b); }
    }
  }
  const regions = new Map();
  for (const t of down) {
    const r = find(t);
    let box = regions.get(r);
    if (!box) { box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, tris: [] }; regions.set(r, box); }
    box.tris.push(t);
    for (let c = 0; c < 3; c++) {
      const x = positions[t * 9 + c * 3], y = positions[t * 9 + c * 3 + 1];
      if (x < box.minX) box.minX = x; if (x > box.maxX) box.maxX = x;
      if (y < box.minY) box.minY = y; if (y > box.maxY) box.maxY = y;
    }
  }
  let area = 0, bridgeArea = 0;
  for (const box of regions.values()) {
    const span = Math.min(box.maxX - box.minX, box.maxY - box.minY);
    const isBridge = span <= BRIDGE_SPAN;
    for (const t of box.tris) {
      mask[t] = isBridge ? 2 : 1;
      if (isBridge) bridgeArea += areas[t]; else area += areas[t];
    }
  }
  return { area, bridgeArea, mask };
}

/* Lays bodies out left to right, centred on the bed, each resting on Z = 0.
   Falls back to a second row when one row is wider than the bed. A 'nested'
   part (print-in-place pieces built inside each other) keeps its pieces where
   the part put them and only centres the group on the bed. */
export function layoutBodies(bodies, printer = DEFAULT_PRINTER, arrange = 'apart') {
  if (arrange === 'nested') {
    const { min, max } = bounds(concat(bodies.map((b) => b.positions)));
    const d = [-(min[0] + max[0]) / 2, -(min[1] + max[1]) / 2, -min[2]];
    const placed = bodies.map((b) => {
      const p = new Float32Array(b.positions.length);
      for (let k = 0; k < p.length; k += 3) { p[k] = b.positions[k] + d[0]; p[k + 1] = b.positions[k + 1] + d[1]; p[k + 2] = b.positions[k + 2] + d[2]; }
      return { ...b, positions: p };
    });
    const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
    return { bodies: placed, size, fit: printerFit(size, printer), nested: true };
  }
  const boxes = bodies.map((b) => bounds(b.positions));
  const rowWidth = (list) => list.reduce((w, i) => w + boxes[i].size[0], 0) + LAYOUT_GAP * Math.max(0, list.length - 1);
  let rows = [bodies.map((_, i) => i)];
  if (bodies.length > 1 && rowWidth(rows[0]) > printer.build.x) {
    const half = Math.ceil(bodies.length / 2);
    rows = [rows[0].slice(0, half), rows[0].slice(half)];
  }
  const rowDepth = rows.map((r) => Math.max(...r.map((i) => boxes[i].size[1])));
  const totalDepth = rowDepth.reduce((a, b) => a + b, 0) + LAYOUT_GAP * (rows.length - 1);
  const offsets = new Array(bodies.length);
  let y = totalDepth / 2;
  rows.forEach((row, r) => {
    let x = -rowWidth(row) / 2;
    const cy = y - rowDepth[r] / 2;
    for (const i of row) {
      const b = boxes[i];
      offsets[i] = [x - b.min[0], cy - (b.min[1] + b.max[1]) / 2, -b.min[2]];
      x += b.size[0] + LAYOUT_GAP;
    }
    y -= rowDepth[r] + LAYOUT_GAP;
  });
  const placed = bodies.map((b, i) => {
    const [dx, dy, dz] = offsets[i];
    const p = new Float32Array(b.positions.length);
    for (let k = 0; k < p.length; k += 3) { p[k] = b.positions[k] + dx; p[k + 1] = b.positions[k + 1] + dy; p[k + 2] = b.positions[k + 2] + dz; }
    return { ...b, positions: p };
  });
  const all = bounds(concat(placed.map((b) => b.positions)));
  return { bodies: placed, size: all.size, fit: printerFit(all.size, printer) };
}

export function concat(arrays) {
  const out = new Float32Array(arrays.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of arrays) { out.set(a, o); o += a.length; }
  return out;
}

export function filamentGrams(volume, area) {
  const shell = Math.min(volume, area * SHELL / 2);       // skin is shared by both faces of thin walls
  const plastic = shell + (volume - shell) * INFILL;
  return { grams: (plastic / 1000) * PLA_DENSITY, plastic };
}

export function printMinutes(plastic) {
  return plastic / FLOW / 60 + 4;                          // + heat-up and first-layer time
}

const round = (v, places = 1) => Number(v.toFixed(places));

export function formatDuration(minutes) {
  const m = Math.max(1, Math.round(minutes));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
}

/* Default values for a part, then whatever the caller supplied, clamped to the
   ranges the part declares — so a hand-edited project file cannot ask for a
   negative wall. */
export function resolveParams(part, given = {}) {
  const out = {};
  for (const spec of part.params) {
    let value = given[spec.id] ?? spec.default;
    if (spec.type === 'range') {
      value = Number(value);
      if (!Number.isFinite(value)) value = spec.default;
      value = Math.min(spec.max, Math.max(spec.min, value));
    } else if (spec.type === 'select') {
      if (!spec.options.some((o) => o.value === value)) value = spec.default;
    } else if (spec.type === 'toggle') {
      value = Boolean(value);
    } else if (spec.type === 'text') {
      value = String(value ?? '').slice(0, spec.maxLength ?? 24);
    }
    out[spec.id] = value;
  }
  return out;
}

export const DEFAULT_SETTINGS = { clearance: 0.3, layer: 0.2, nozzle: DEFAULT_PRINTER.nozzle };

export async function createEngine(ManifoldModule, { font } = {}) {
  const wasm = await ManifoldModule();
  wasm.setup();
  const registry = [];
  wrapForTracking(wasm, registry);
  const { Manifold, CrossSection } = wasm;

  function run(part, givenParams, givenSettings = {}) {
    const params = resolveParams(part, givenParams);
    const settings = { ...DEFAULT_SETTINGS, ...givenSettings };
    const ctx = { Manifold, CrossSection, font, settings, printer: DEFAULT_PRINTER };
    try {
      const built = part.build(ctx, params);
      const bodies = built.bodies.map(({ name, manifold, color }) => {
        const status = manifold.status();
        if (status !== 'NoError') throw new Error(`${name}: ${status}`);
        if (manifold.isEmpty()) throw new Error(`${name} came out empty — a cut removed the whole part`);
        return { name, color, positions: soup(manifold), volume: manifold.volume(), area: manifold.surfaceArea() };
      });
      return { params, settings, ...finish(part, params, settings, bodies, built) };
    } catch (error) {
      return { params, settings, error: error.message || String(error), bodies: [], verdicts: [{ tone: 'bad', tag: 'CAN\'T BUILD', text: error.message || String(error) }], stats: [] };
    } finally {
      for (const obj of registry.splice(0)) { try { obj.delete(); } catch { /* already freed */ } }
    }
  }

  return { run, wasm };
}

function finish(part, params, settings, rawBodies, built) {
  const layout = layoutBodies(rawBodies, DEFAULT_PRINTER, built.layout);
  const bodies = layout.bodies.map((b) => ({ ...b, overhang: overhangs(b.positions) }));
  const verdicts = [];
  const nozzle = settings.nozzle;

  // walls the part says are structural
  for (const spec of part.params) {
    if (spec.kind === 'wall') {
      const v = params[spec.id];
      if (v < nozzle * 2) verdicts.push({ tone: 'bad', tag: 'TOO THIN', text: `${spec.label} is ${v} mm — less than two ${nozzle} mm beads. The slicer will print a single line that snaps.` });
      else if (v < nozzle * 3 - 1e-9) verdicts.push({ tone: 'warn', tag: 'THIN', text: `${spec.label} is ${v} mm, two beads wide. It prints, but ${round(nozzle * 3, 1)} mm or more survives a backpack.` });
    }
  }

  verdicts.push(...(built.verdicts || []));

  // The kernel's output is closed by construction; this catches the rare
  // nanometre pinch a boolean cut leaves at extreme settings.
  const pinched = bodies.filter((b) => !edgeReport(b.positions).watertight).map((b) => b.name);
  if (pinched.length) verdicts.push({ tone: 'warn', tag: 'MESH', text: `${pinched.join(' and ')} has a pinched edge where two surfaces touch. Most slicers repair it automatically; nudging any slider one step usually clears it.` });

  // overhangs
  const overhangArea = bodies.reduce((a, b) => a + b.overhang.area, 0);
  const bridgeArea = bodies.reduce((a, b) => a + b.overhang.bridgeArea, 0);
  if (built.overhangNote) verdicts.push({ tone: 'ok', tag: 'OVERHANGS', text: built.overhangNote });
  else if (overhangArea < 4) verdicts.push({ tone: 'ok', tag: 'NO SUPPORTS', text: bridgeArea > 1
    ? 'No overhangs past 45°. The amber faces are short bridges (ceilings of holes, slots and engraving) that the printer spans in mid-air, so print with supports OFF.'
    : 'Every face is within 45° of vertical or sits on the bed, so this prints without supports.' });
  else if (overhangArea < 60) verdicts.push({ tone: 'warn', tag: 'OVERHANG', text: `${round(overhangArea, 0)} mm² of face hangs past 45° (shown in red). Small areas like this usually bridge; check the slicer preview.` });
  else verdicts.push({ tone: 'bad', tag: 'NEEDS SUPPORTS', text: `${round(overhangArea, 0)} mm² of face hangs past 45° (shown in red). Turn on supports in MakerBot Print, or rotate the part so those faces point up.` });

  // bed fit
  const [w, d, h] = layout.size;
  const printer = DEFAULT_PRINTER;
  if (layout.fit.fits) verdicts.push({ tone: 'ok', tag: 'FITS', text: `${round(w, 0)} × ${round(d, 0)} × ${round(h, 0)} mm${layout.fit.turned ? ' (turn it 90° on the plate)' : ''} — fits the ${printer.name}'s ${printer.build.x} × ${printer.build.y} × ${printer.build.z} mm bed.` });
  else verdicts.push({ tone: 'bad', tag: 'TOO BIG', text: `${round(w, 0)} × ${round(d, 0)} × ${round(h, 0)} mm will not fit the ${printer.name} (${printer.build.x} × ${printer.build.y} × ${printer.build.z} mm). Over by ${layout.fit.overBy.map((v) => round(v, 0)).join(' / ')} mm.` });

  const volume = bodies.reduce((a, b) => a + b.volume, 0);
  const area = bodies.reduce((a, b) => a + b.area, 0);
  const { grams, plastic } = filamentGrams(volume, area);
  const stats = [
    ...(built.stats || []),
    { label: 'Print size', value: `${round(w, 0)} × ${round(d, 0)} × ${round(h, 0)} mm` },
    { label: 'PLA', value: `≈ ${round(grams, grams < 10 ? 1 : 0)} g` },
    { label: 'Print time', value: `≈ ${formatDuration(printMinutes(plastic))}` },
  ];
  return { bodies, layout, verdicts, stats, notes: built.notes || [] };
}
