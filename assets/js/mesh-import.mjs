/* mesh-import.mjs — reads the 3D files students bring from other apps.
 *
 * One importer for every design tool (Print Prep, Marble Studio, …), so a file
 * that opens in one opens in all of them. Pure: no DOM and no Three.js, so it
 * runs in the browser and under `node --test`.
 *
 *   await readMesh(buffer, filename) → {
 *     positions,   // Float32Array triangle soup, Z up, in the file's own units
 *     format,      // 'stl' | 'obj' | '3mf'
 *     units: { unit, certain, reason },   // best reading of the file's units
 *     parts: [{ name, start, count }],    // triangle ranges (OBJ objects, 3MF items)
 *     triangles, warnings,
 *   }
 *   toMillimetres(positions, unit) → soup scaled to mm (UNIT_MM lists the units)
 *
 * Conventions the formats use, which this module turns into one:
 *   STL  no units (nearly always mm), Z up. Binary or ASCII; a binary file may
 *        start with the word "solid", so size decides, not the header.
 *   OBJ  no units, Y up (Blender, Maya, game engines and our own writeObj,
 *        which notes "units: metres"). Polygons are fanned into triangles.
 *   3MF  a ZIP of XML. Units are declared and Z is up. Objects may be built
 *        from components, transformed per build item, and (Bambu Studio,
 *        PrusaSlicer) live in other model files inside the ZIP.
 */

import { cleanTriangles, yUpToZUp } from './fab-io.mjs';

export const UNIT_MM = { um: 0.001, mm: 1, cm: 10, in: 25.4, ft: 304.8, m: 1000 };
export const UNIT_NAMES = { um: 'microns', mm: 'millimetres', cm: 'centimetres', in: 'inches', ft: 'feet', m: 'metres' };
export const ACCEPT = '.stl,.obj,.3mf,model/stl,model/obj,model/3mf';

const MAX_TRIANGLES = 3_000_000;

export class MeshImportError extends Error {}

/* ── format detection ─────────────────────────────────────────────────── */

export function sniffFormat(bytes, name = '') {
  const ext = String(name).toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (ext === 'stl' || ext === 'obj' || ext === '3mf') return ext;
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4) return '3mf';
  if (looksBinaryStl(bytes)) return 'stl';
  const head = new TextDecoder().decode(bytes.subarray(0, 4096));
  if (/^\s*solid\b/i.test(head) && /facet\s+normal/i.test(head)) return 'stl';
  if (/^\s*(v|f|o|g)\s/m.test(head)) return 'obj';
  return null;
}

function looksBinaryStl(bytes) {
  if (bytes.length < 84) return false;
  const n = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(80, true);
  return 84 + n * 50 === bytes.length;
}

/* ── STL ──────────────────────────────────────────────────────────────── */

export function parseStl(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 84) {
    const n = view.getUint32(80, true);
    const exact = 84 + n * 50 === bytes.length;
    // Some exporters pad the end of a binary file; accept that unless the text says ASCII.
    const padded = n > 0 && 84 + n * 50 < bytes.length && bytes.length - (84 + n * 50) < 1024
      && !/facet\s+normal/i.test(new TextDecoder().decode(bytes.subarray(0, 1024)));
    if (exact || padded) {
      if (n > MAX_TRIANGLES) throw new MeshImportError(`This STL has ${n.toLocaleString()} triangles, more than a browser can handle. Simplify it first.`);
      const out = new Float32Array(n * 9);
      for (let t = 0; t < n; t++) {
        const o = 84 + t * 50 + 12;
        for (let k = 0; k < 9; k++) out[t * 9 + k] = view.getFloat32(o + k * 4, true);
      }
      return { positions: out, parts: [{ name: stlName(bytes), start: 0, count: n }] };
    }
  }
  const text = new TextDecoder().decode(bytes);
  if (!/facet/i.test(text)) throw new MeshImportError('That file is not an STL this app can read.');
  const nums = [];
  const parts = [];
  const solidRe = /solid[ \t]*([^\r\n]*)/gi;
  const re = /\b(?:vertex|endsolid)\b(?:\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+))?/gi;
  let m, start = 0;
  const first = solidRe.exec(text);
  let name = first ? first[1].trim() : '';
  while ((m = re.exec(text))) {
    if (m[0].toLowerCase().startsWith('endsolid')) {
      const count = nums.length / 9 - start;
      if (count) parts.push({ name: name || `Solid ${parts.length + 1}`, start, count });
      start = nums.length / 9;
      solidRe.lastIndex = re.lastIndex;
      const next = solidRe.exec(text);
      name = next ? next[1].trim() : '';
      continue;
    }
    nums.push(+m[1], +m[2], +m[3]);
  }
  if (!nums.length || nums.length % 9) throw new MeshImportError('That STL ended part-way through a triangle. It may be damaged.');
  if (nums.length / 9 > start) parts.push({ name: name || `Solid ${parts.length + 1}`, start, count: nums.length / 9 - start });
  return { positions: Float32Array.from(nums), parts };
}

function stlName(bytes) {
  const header = new TextDecoder().decode(bytes.subarray(0, 80)).replace(/\0.*$/s, '').trim();
  return /^solid\b/i.test(header) ? header.slice(5).trim() || 'Model' : 'Model';
}

/* ── OBJ ──────────────────────────────────────────────────────────────── */

export function parseObj(text) {
  const verts = [];
  const out = [];
  const parts = [];
  let name = 'Model', start = 0;
  const close = () => {
    const count = out.length / 9 - start;
    if (count) parts.push({ name, start, count });
    start = out.length / 9;
  };
  const lines = text.split(/\r?\n/);
  for (let li = 0; li < lines.length; li++) {
    let line = lines[li];
    while (line.endsWith('\\') && li + 1 < lines.length) line = line.slice(0, -1) + ' ' + lines[++li];
    const s = line.trim();
    if (!s || s[0] === '#') continue;
    const words = s.split(/\s+/);
    const tag = words[0];
    if (tag === 'v') {
      const w = words.length > 4 ? +words[4] || 1 : 1;
      verts.push(+words[1] / w, +words[2] / w, +words[3] / w);
    } else if (tag === 'f') {
      const ids = [];
      for (let i = 1; i < words.length; i++) {
        let v = parseInt(words[i], 10);
        if (!Number.isFinite(v) || v === 0) continue;
        v = v < 0 ? verts.length / 3 + v : v - 1;
        if (v < 0 || v >= verts.length / 3) throw new MeshImportError(`OBJ line ${li + 1} uses a corner that does not exist.`);
        ids.push(v);
      }
      for (let i = 1; i + 1 < ids.length; i++) {
        for (const v of [ids[0], ids[i], ids[i + 1]]) out.push(verts[v * 3], verts[v * 3 + 1], verts[v * 3 + 2]);
      }
      if (out.length / 9 > MAX_TRIANGLES) throw new MeshImportError('This OBJ has more triangles than a browser can handle. Simplify it first.');
    } else if (tag === 'o' || tag === 'g') {
      close();
      name = words.slice(1).join(' ') || name;
    }
  }
  close();
  if (!out.length) throw new MeshImportError(verts.length ? 'That OBJ has corners but no faces. Export it as a mesh, not points or curves.' : 'That file is not an OBJ this app can read.');
  return { positions: Float32Array.from(out), parts };
}

function objUnitHint(text) {
  const head = text.slice(0, 2000);
  const m = head.match(/^#.*\bunits?\s*[:=]\s*(metres|meters|millimetres|millimeters|centimetres|centimeters|inches|mm|cm|m|in)\b/im);
  if (!m) return null;
  const word = m[1].toLowerCase();
  return word.startsWith('mil') || word === 'mm' ? 'mm' : word.startsWith('cen') || word === 'cm' ? 'cm' : word.startsWith('inch') || word === 'in' ? 'in' : 'm';
}

/* ── ZIP (just enough for 3MF) ────────────────────────────────────────── */

export async function readZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new MeshImportError('That 3MF is not a complete ZIP file. It may be damaged.');
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const entries = new Map();
  const dec = new TextDecoder();
  for (let e = 0; e < count; e++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new MeshImportError('That 3MF has a damaged file list.');
    const method = view.getUint16(p + 10, true);
    const size = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true), extraLen = view.getUint16(p + 30, true), commentLen = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    entries.set(name.replace(/^\/+/, ''), { method, size, local });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return {
    names: [...entries.keys()],
    async read(name) {
      const entry = entries.get(String(name).replace(/^\/+/, ''));
      if (!entry) return null;
      const o = entry.local;
      const start = o + 30 + view.getUint16(o + 26, true) + view.getUint16(o + 28, true);
      const data = bytes.subarray(start, start + entry.size);
      if (entry.method === 0) return data;
      if (entry.method !== 8) throw new MeshImportError('That 3MF uses a compression this app cannot open.');
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    },
  };
}

/* ── 3MF ──────────────────────────────────────────────────────────────── */

const THREEMF_UNITS = { micron: 'um', millimeter: 'mm', centimeter: 'cm', inch: 'in', foot: 'ft', meter: 'm' };

function attrs(s) {
  const out = {};
  for (const m of s.matchAll(/([\w:]+)\s*=\s*"([^"]*)"/g)) out[m[1]] = unescapeXml(m[2]);
  return out;
}

const ENTITIES = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
function unescapeXml(s) {
  return s.indexOf('&') < 0 ? s : s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => (e[0] === '#'
    ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1))
    : ENTITIES[e] ?? m));
}

/* 3MF transforms are 12 numbers for row vectors: p' = [x y z 1] · M. */
const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
function parseTransform(s) {
  if (!s) return IDENTITY;
  const m = s.trim().split(/\s+/).map(Number);
  return m.length === 12 && m.every(Number.isFinite) ? m : IDENTITY;
}
function compose(a, b) { // apply a, then b
  const out = new Array(12);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c] + (r === 3 ? b[9 + c] : 0);
    }
  }
  return out;
}

function parseModel(xml) {
  const unit = THREEMF_UNITS[(xml.match(/<(?:\w+:)?model\b[^>]*\bunit\s*=\s*"([^"]+)"/) || [])[1]] || 'mm';
  const objects = new Map();
  for (const m of xml.matchAll(/<(?:\w+:)?object\b([^>]*?)(\/>|>([\s\S]*?)<\/(?:\w+:)?object>)/g)) {
    const a = attrs(m[1]);
    const body = m[3] || '';
    const obj = { name: a.name || '', type: a.type || 'model', vertices: null, triangles: null, components: [] };
    const vBlock = body.match(/<(?:\w+:)?vertices\b[^>]*>([\s\S]*?)<\/(?:\w+:)?vertices>/);
    if (vBlock) {
      const v = [];
      for (const vm of vBlock[1].matchAll(/<(?:\w+:)?vertex\b([^>]*)\/?>/g)) {
        const va = attrs(vm[1]);
        v.push(+va.x, +va.y, +va.z);
      }
      const t = [];
      const tBlock = body.match(/<(?:\w+:)?triangles\b[^>]*>([\s\S]*?)<\/(?:\w+:)?triangles>/);
      if (tBlock) {
        for (const tm of tBlock[1].matchAll(/<(?:\w+:)?triangle\b([^>]*)\/?>/g)) {
          const ta = attrs(tm[1]);
          t.push(+ta.v1, +ta.v2, +ta.v3);
        }
      }
      obj.vertices = v;
      obj.triangles = t;
    }
    for (const cm of body.matchAll(/<(?:\w+:)?component\b([^>]*)\/?>/g)) {
      const ca = attrs(cm[1]);
      obj.components.push({ id: ca.objectid, transform: parseTransform(ca.transform), path: ca['p:path'] || null });
    }
    objects.set(a.id, obj);
  }
  const items = [];
  const build = xml.match(/<(?:\w+:)?build\b[^>]*>([\s\S]*?)<\/(?:\w+:)?build>/);
  if (build) {
    for (const im of build[1].matchAll(/<(?:\w+:)?item\b([^>]*)\/?>/g)) {
      const ia = attrs(im[1]);
      if (ia.printable === '0') continue;
      items.push({ id: ia.objectid, transform: parseTransform(ia.transform), path: ia['p:path'] || null });
    }
  }
  return { unit, objects, items };
}

export async function parse3mf(bytes) {
  const zip = await readZip(bytes);
  const dec = new TextDecoder();
  const rels = await zip.read('_rels/.rels');
  let rootPath = rels && (dec.decode(rels).match(/Target\s*=\s*"([^"]+\.model)"/i) || [])[1];
  if (!rootPath || !zip.names.includes(rootPath.replace(/^\/+/, ''))) rootPath = zip.names.find((n) => /\.model$/i.test(n));
  if (!rootPath) throw new MeshImportError('That 3MF has no 3D model inside it.');
  const models = new Map();
  const load = async (path) => {
    const key = path.replace(/^\/+/, '');
    if (!models.has(key)) {
      const data = await zip.read(key);
      if (!data) throw new MeshImportError(`That 3MF points to ${key}, which is missing.`);
      models.set(key, parseModel(dec.decode(data)));
    }
    return models.get(key);
  };
  const root = await load(rootPath);
  const out = [];
  const parts = [];
  const emit = async (modelPath, id, matrix, depth) => {
    if (depth > 16) throw new MeshImportError('That 3MF nests its components too deeply.');
    const model = await load(modelPath);
    const obj = model.objects.get(id);
    if (!obj) throw new MeshImportError(`That 3MF builds object ${id}, which it never defines.`);
    if (obj.type === 'support' || obj.type === 'solidsupport') return;
    if (obj.vertices) {
      const v = obj.vertices, t = obj.triangles, m = matrix;
      for (let i = 0; i < t.length; i++) {
        const k = t[i] * 3;
        const x = v[k], y = v[k + 1], z = v[k + 2];
        out.push(x * m[0] + y * m[3] + z * m[6] + m[9], x * m[1] + y * m[4] + z * m[7] + m[10], x * m[2] + y * m[5] + z * m[8] + m[11]);
      }
      if (out.length / 9 > MAX_TRIANGLES) throw new MeshImportError('This 3MF has more triangles than a browser can handle.');
    }
    for (const c of obj.components) await emit(c.path || modelPath, c.id, compose(c.transform, matrix), depth + 1);
  };
  const items = root.items.length ? root.items : [...root.objects.keys()].map((id) => ({ id, transform: IDENTITY }));
  for (const item of items) {
    const start = out.length / 9;
    await emit(item.path || rootPath, item.id, item.transform, 0);
    const name = root.objects.get(item.id)?.name || `Object ${parts.length + 1}`;
    if (out.length / 9 > start) parts.push({ name, start, count: out.length / 9 - start });
  }
  if (!out.length) throw new MeshImportError('That 3MF has no printable triangles.');
  if (out.some((v) => !Number.isFinite(v))) throw new MeshImportError('That 3MF has corners with missing coordinates.');
  return { positions: Float32Array.from(out), parts, unit: root.unit };
}

/* ── units ────────────────────────────────────────────────────────────── */

export function extent(positions) {
  let max = 0;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) { const v = positions[i + k]; if (v < lo[k]) lo[k] = v; if (v > hi[k]) hi[k] = v; }
  }
  for (let k = 0; k < 3; k++) max = Math.max(max, hi[k] - lo[k]);
  return max;
}

/* STL and OBJ don't say what their numbers mean. Size is the best clue: a
   part that is "0.08" across was almost certainly exported in metres. */
export function guessUnits(positions, format) {
  const size = extent(positions);
  if (format === 'obj' && size < 0.6) return { unit: 'm', certain: false, reason: `It is ${trim(size)} units across, so it was probably exported in metres (Y up, like Blender).` };
  if (size < 0.6) return { unit: 'm', certain: false, reason: `It is only ${trim(size)} units across, so it was probably exported in metres.` };
  if (size < 3) return { unit: 'mm', certain: false, reason: `It is ${trim(size)} units across. If that is millimetres it is tiny: check whether it was exported in inches or centimetres.` };
  if (format === 'obj') return { unit: 'mm', certain: false, reason: 'OBJ files do not record units; read as millimetres.' };
  return { unit: 'mm', certain: false, reason: 'STL files do not record units; read as millimetres, as slicers do.' };
}

const trim = (n) => (n >= 10 ? n.toFixed(1) : n.toPrecision(2)).replace(/\.0$/, '');

export function toMillimetres(positions, unit) {
  const k = UNIT_MM[unit] ?? 1;
  if (k === 1) return Float32Array.from(positions);
  const out = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i++) out[i] = positions[i] * k;
  return out;
}

/* ── the one entry point ──────────────────────────────────────────────── */

export async function readMesh(input, name = '') {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (!bytes.length) throw new MeshImportError('That file is empty.');
  const format = sniffFormat(bytes, name);
  if (!format) throw new MeshImportError('This app opens STL, OBJ and 3MF files.');
  const warnings = [];
  let positions, parts, units;
  if (format === 'stl') {
    ({ positions, parts } = parseStl(bytes));
    units = guessUnits(positions, 'stl');
  } else if (format === 'obj') {
    const text = new TextDecoder().decode(bytes);
    ({ positions, parts } = parseObj(text));
    positions = yUpToZUp(positions);
    const hint = objUnitHint(text);
    units = hint ? { unit: hint, certain: true, reason: `The file says its units are ${UNIT_NAMES[hint]}.` } : guessUnits(positions, 'obj');
    warnings.push('OBJ files are Y up, so the model was stood up for the printer (Z up).');
  } else {
    const r = await parse3mf(bytes);
    ({ positions, parts } = r);
    units = { unit: r.unit, certain: true, reason: `The file says its units are ${UNIT_NAMES[r.unit]}.` };
  }
  const before = positions.length / 9;
  let finite = positions;
  if (positions.some((v) => !Number.isFinite(v))) {
    const kept = [];
    for (let i = 0; i < positions.length; i += 9) {
      let ok = true;
      for (let k = 0; k < 9; k++) if (!Number.isFinite(positions[i + k])) { ok = false; break; }
      if (ok) for (let k = 0; k < 9; k++) kept.push(positions[i + k]);
    }
    finite = Float32Array.from(kept);
  }
  // Scale-aware: a metre-sized file has areas around 1e-6, which a fixed cut-off would wipe out.
  const size = extent(finite) || 1;
  const cleaned = cleanTriangles(finite, size * size * 1e-12);
  const dropped = before - cleaned.length / 9;
  if (!cleaned.length) throw new MeshImportError('That file has no solid triangles, only lines or points.');
  if (dropped > 0) {
    warnings.push(`${dropped.toLocaleString()} broken or zero-area triangle${dropped === 1 ? ' was' : 's were'} removed.`);
    parts = [{ name: parts[0]?.name || 'Model', start: 0, count: cleaned.length / 9 }];
  }
  return { positions: cleaned, format, units, parts, triangles: cleaned.length / 9, warnings };
}
