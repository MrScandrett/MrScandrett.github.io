/* fab-io.mjs — file formats and print checks for the 3D design & fabrication tools.
 *
 * Pure functions, no DOM and no Three.js, so they run in the browser and under
 * `node --test`. Meshes are triangle soup: a flat array of numbers, nine per
 * triangle (x,y,z for each of three corners), in millimetres — exactly what a
 * non-indexed THREE.BufferGeometry's position attribute holds.
 *
 *   yUpToZUp(positions)        → new soup rotated from Three's Y-up to the Z-up printers use
 *   cleanTriangles(positions)  → soup with zero-area triangles removed
 *   signedVolume(positions)    → mm³; negative means the faces point inward
 *   orientOutward(positions)   → soup whose faces point out of the solid
 *   placeOnBed(positions)      → soup centred on X/Y with its lowest point on Z = 0
 *   bounds(positions)          → { min, max, size }
 *   edgeReport(positions)      → { watertight, openEdges, overusedEdges, flippedEdges, vertices }
 *   printerFit(size, printer)  → { fits, overBy }
 *   prepareForPrint(positions, { yUp }) → the four steps above in order
 *   writeBinaryStl(positions, header) → ArrayBuffer (binary STL)
 *   readBinaryStl(buffer)      → soup
 *
 * Printers are listed in PRINTERS so a lesson can name the school's machine
 * rather than hard-coding numbers.
 */

export const PRINTERS = {
  'makerbot-sketch-large': {
    name: 'MakerBot Sketch Large',
    build: { x: 260, y: 160, z: 230 },
    nozzle: 0.4,
    material: 'PLA',
  },
};

export const DEFAULT_PRINTER = PRINTERS['makerbot-sketch-large'];

function triangleCount(positions) {
  if (positions.length % 9 !== 0) throw new Error(`mesh has ${positions.length} numbers, not a multiple of 9`);
  return positions.length / 9;
}

/* Rotate +90° about X: Three's up (Y) becomes the printer's up (Z). A proper
   rotation, so faces keep their winding and the solid is not mirrored. */
export function yUpToZUp(positions) {
  const out = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    out[i] = positions[i];
    out[i + 1] = -positions[i + 2];
    out[i + 2] = positions[i + 1];
  }
  return out;
}

function cross(ax, ay, az, bx, by, bz) {
  return [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
}

function triangleNormal(p, i) {
  const ux = p[i + 3] - p[i], uy = p[i + 4] - p[i + 1], uz = p[i + 5] - p[i + 2];
  const vx = p[i + 6] - p[i], vy = p[i + 7] - p[i + 1], vz = p[i + 8] - p[i + 2];
  return cross(ux, uy, uz, vx, vy, vz);
}

/* Drops triangles whose area is (near) zero. Sweeps that pinch to a point — the
   start of a ribbon trimmed by the bed, the tip of a cone — leave these behind,
   and they confuse edge counting and some slicers' repair passes. */
export function cleanTriangles(positions, minArea = 1e-9) {
  const n = triangleCount(positions);
  const kept = [];
  for (let t = 0; t < n; t++) {
    const i = t * 9;
    const [nx, ny, nz] = triangleNormal(positions, i);
    if (Math.hypot(nx, ny, nz) / 2 > minArea) {
      for (let k = 0; k < 9; k++) kept.push(positions[i + k]);
    }
  }
  return Float32Array.from(kept);
}

/* Sum of signed tetrahedra from the origin (divergence theorem). Positive for a
   closed mesh whose triangles wind counter-clockwise seen from outside. */
export function signedVolume(positions) {
  const n = triangleCount(positions);
  let six = 0;
  for (let t = 0; t < n; t++) {
    const i = t * 9;
    const [cx, cy, cz] = cross(positions[i + 3], positions[i + 4], positions[i + 5], positions[i + 6], positions[i + 7], positions[i + 8]);
    six += positions[i] * cx + positions[i + 1] * cy + positions[i + 2] * cz;
  }
  return six / 6;
}

function flipAll(positions) {
  const out = Float32Array.from(positions);
  for (let i = 0; i < out.length; i += 9) {
    for (let k = 0; k < 3; k++) {
      const a = out[i + 3 + k];
      out[i + 3 + k] = out[i + 6 + k];
      out[i + 6 + k] = a;
    }
  }
  return out;
}

export function orientOutward(positions) {
  return signedVolume(positions) < 0 ? flipAll(positions) : Float32Array.from(positions);
}

export function bounds(positions) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = positions[i + k];
      if (v < min[k]) min[k] = v;
      if (v > max[k]) max[k] = v;
    }
  }
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}

export function placeOnBed(positions) {
  const { min, max } = bounds(positions);
  const dx = -(min[0] + max[0]) / 2;
  const dy = -(min[1] + max[1]) / 2;
  const dz = -min[2];
  const out = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    out[i] = positions[i] + dx;
    out[i + 1] = positions[i + 1] + dy;
    out[i + 2] = positions[i + 2] + dz;
  }
  return out;
}

/* A solid a slicer can trust has every edge shared by exactly two triangles,
   walked in opposite directions. Corners are matched by position rounded to
   `tolerance` mm, because triangle soup repeats every shared vertex. 10 nm is
   about the float32 rounding of an STL coordinate near 100 mm: boolean cuts
   can leave distinct vertices a few nanometres apart, and a coarser grid
   would weld them into false pinches. */
export function edgeReport(positions, tolerance = 1e-5) {
  const n = triangleCount(positions);
  const ids = new Map();
  const key = (i) => `${Math.round(positions[i] / tolerance)},${Math.round(positions[i + 1] / tolerance)},${Math.round(positions[i + 2] / tolerance)}`;
  const id = (i) => {
    const k = key(i);
    let v = ids.get(k);
    if (v === undefined) { v = ids.size; ids.set(k, v); }
    return v;
  };
  const directed = new Map();
  for (let t = 0; t < n; t++) {
    const v = [id(t * 9), id(t * 9 + 3), id(t * 9 + 6)];
    for (let e = 0; e < 3; e++) {
      const a = v[e], b = v[(e + 1) % 3];
      if (a === b) continue;
      const k = `${a}>${b}`;
      directed.set(k, (directed.get(k) || 0) + 1);
    }
  }
  let openEdges = 0, overusedEdges = 0, flippedEdges = 0;
  const seen = new Set();
  for (const [k, count] of directed) {
    const [a, b] = k.split('>');
    const pair = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seen.has(pair)) continue;
    seen.add(pair);
    const back = directed.get(`${b}>${a}`) || 0;
    const uses = count + back;
    if (uses === 1) openEdges++;                       // a hole in the skin
    else if (uses > 2) overusedEdges++;                // fins or touching solids
    else if (count !== 1) flippedEdges++;              // two neighbours wound the same way
  }
  return {
    watertight: openEdges === 0 && overusedEdges === 0 && flippedEdges === 0,
    openEdges, overusedEdges, flippedEdges, vertices: ids.size,
  };
}

export function printerFit(size, printer = DEFAULT_PRINTER) {
  const { x, y, z } = printer.build;
  // A part may be turned 90° on the bed, so try both footprints.
  const over = (a, b) => [Math.max(0, size[0] - a), Math.max(0, size[1] - b), Math.max(0, size[2] - z)];
  const straight = over(x, y);
  const turned = over(y, x);
  const sum = (v) => v[0] + v[1] + v[2];
  const best = sum(turned) < sum(straight) ? turned : straight;
  return { fits: sum(best) === 0, turned: best === turned && sum(straight) > 0, overBy: best };
}

/* The usual path from a lesson's Three.js geometry to a file a slicer accepts. */
export function prepareForPrint(positions, { yUp = true } = {}) {
  let p = yUp ? yUpToZUp(positions) : Float32Array.from(positions);
  p = cleanTriangles(p);
  p = orientOutward(p);
  return placeOnBed(p);
}

/* Binary STL: 80-byte header, uint32 triangle count, then per triangle a
   float32 normal, three float32 corners and a uint16 attribute word. */
export function writeBinaryStl(positions, header = 'ClassroomOS fab-io') {
  const n = triangleCount(positions);
  const buffer = new ArrayBuffer(84 + n * 50);
  const view = new DataView(buffer);
  const text = String(header).slice(0, 80);
  for (let i = 0; i < text.length; i++) view.setUint8(i, text.charCodeAt(i) & 0x7f);
  view.setUint32(80, n, true);
  let o = 84;
  for (let t = 0; t < n; t++) {
    const i = t * 9;
    const [nx, ny, nz] = triangleNormal(positions, i);
    const len = Math.hypot(nx, ny, nz) || 1;
    view.setFloat32(o, nx / len, true);
    view.setFloat32(o + 4, ny / len, true);
    view.setFloat32(o + 8, nz / len, true);
    o += 12;
    for (let k = 0; k < 9; k++) { view.setFloat32(o, positions[i + k], true); o += 4; }
    view.setUint16(o, 0, true);
    o += 2;
  }
  return buffer;
}

/* Reads a binary STL back into triangle soup — used by tests and by the
   print-readiness checker for files students bring from Blender. */
export function readBinaryStl(buffer) {
  const view = new DataView(buffer);
  const n = view.getUint32(80, true);
  if (84 + n * 50 !== buffer.byteLength) throw new Error('not a binary STL (size does not match triangle count)');
  const out = new Float32Array(n * 9);
  let o = 84;
  for (let t = 0; t < n; t++) {
    o += 12;
    for (let k = 0; k < 9; k++) { out[t * 9 + k] = view.getFloat32(o, true); o += 4; }
    o += 2;
  }
  return out;
}

/* ── game-engine exports ──────────────────────────────────────────────────
   Printers think in Z-up millimetres; Godot, Blender's glTF importer, Unity
   and three.js expect Y-up metres. Bodies are { name, positions (Z-up mm
   soup), color? '#rrggbb' } and keep their names as separate objects. */

function toGameSpace(positions) {
  const out = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    out[i] = positions[i] / 1000;
    out[i + 1] = positions[i + 2] / 1000;
    out[i + 2] = -positions[i + 1] / 1000;
  }
  return out;
}

function faceNormals(positions) {
  const out = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 9) {
    const [nx, ny, nz] = triangleNormal(positions, i);
    const len = Math.hypot(nx, ny, nz) || 1;
    for (let c = 0; c < 3; c++) { out[i + c * 3] = nx / len; out[i + c * 3 + 1] = ny / len; out[i + c * 3 + 2] = nz / len; }
  }
  return out;
}

function hexToLinear(hex = '#e8792a') {
  const n = parseInt(String(hex).replace('#', ''), 16) || 0;
  const srgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  return srgb.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
}

/* Binary glTF 2.0 (.glb): one node + mesh + material per body, flat-shaded. */
export function writeGlb(bodies, { generator = 'ClassroomOS Forge' } = {}) {
  const chunks = [];
  let offset = 0;
  const json = { asset: { version: '2.0', generator }, scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], materials: [], accessors: [], bufferViews: [], buffers: [] };
  bodies.forEach((body, b) => {
    const pos = toGameSpace(body.positions);
    const nor = faceNormals(pos);
    const { min, max } = bounds(pos);
    const count = pos.length / 3;
    for (const [data, target] of [[pos, 'POSITION'], [nor, 'NORMAL']]) {
      json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: data.byteLength, target: 34962 });
      json.accessors.push({ bufferView: json.bufferViews.length - 1, componentType: 5126, count, type: 'VEC3', ...(target === 'POSITION' ? { min, max } : {}) });
      chunks.push(data);
      offset += data.byteLength;
    }
    json.materials.push({ name: `${body.name} PLA`, pbrMetallicRoughness: { baseColorFactor: [...hexToLinear(body.color), 1], metallicFactor: 0, roughnessFactor: 0.65 } });
    json.meshes.push({ name: body.name, primitives: [{ attributes: { POSITION: json.accessors.length - 2, NORMAL: json.accessors.length - 1 }, material: b }] });
    json.nodes.push({ name: body.name, mesh: b });
    json.scenes[0].nodes.push(b);
  });
  json.buffers.push({ byteLength: offset });

  const enc = new TextEncoder();
  let jsonBytes = enc.encode(JSON.stringify(json));
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4;
  const binPad = (4 - (offset % 4)) % 4;
  const total = 12 + 8 + jsonBytes.length + jsonPad + 8 + offset + binPad;
  const out = new ArrayBuffer(total);
  const view = new DataView(out);
  const bytes = new Uint8Array(out);
  view.setUint32(0, 0x46546c67, true);           // 'glTF'
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonBytes.length + jsonPad, true);
  view.setUint32(16, 0x4e4f534a, true);          // 'JSON'
  bytes.set(jsonBytes, 20);
  bytes.fill(0x20, 20 + jsonBytes.length, 20 + jsonBytes.length + jsonPad);
  let o = 20 + jsonBytes.length + jsonPad;
  view.setUint32(o, offset + binPad, true);
  view.setUint32(o + 4, 0x004e4942, true);       // 'BIN\0'
  o += 8;
  for (const c of chunks) { bytes.set(new Uint8Array(c.buffer, c.byteOffset, c.byteLength), o); o += c.byteLength; }
  return out;
}

/* Wavefront OBJ, Y-up metres, shared vertices, one `o` object per body. */
export function writeObj(bodies, { comment = 'ClassroomOS Forge' } = {}) {
  const lines = [`# ${comment}`, '# units: metres, Y-up'];
  let base = 0;
  for (const body of bodies) {
    const pos = toGameSpace(body.positions);
    const ids = new Map();
    const verts = [];
    const faces = [];
    for (let t = 0; t < pos.length; t += 9) {
      const f = [];
      for (let c = 0; c < 3; c++) {
        const x = pos[t + c * 3], y = pos[t + c * 3 + 1], z = pos[t + c * 3 + 2];
        const k = `${x},${y},${z}`;
        let id = ids.get(k);
        if (id === undefined) { id = verts.length; ids.set(k, id); verts.push(`v ${+x.toFixed(6)} ${+y.toFixed(6)} ${+z.toFixed(6)}`); }
        f.push(base + id + 1);
      }
      faces.push(`f ${f.join(' ')}`);
    }
    lines.push(`o ${String(body.name).replace(/\s+/g, '_')}`, ...verts, ...faces);
    base += verts.length;
  }
  return lines.join('\n') + '\n';
}
