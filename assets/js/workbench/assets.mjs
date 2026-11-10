/* assets.mjs — imported models in Workbench (STL, OBJ, 3MF from other apps).
 *
 * An imported model is an asset: welded corners + triangles, in the units of
 * the file it came from, with its name, source and licence. A project node
 * points at it by id (`{ shape: 'mesh', params: { asset, units } }`), so the
 * project tree, the undo history and the localStorage autosave stay small; the
 * page keeps assets in a Map (and IndexedDB), and a saved .workbench.json
 * carries the ones it uses in an `assets` section.
 *
 * The id is a hash of the geometry, so the same file imported twice is one
 * asset, and an id in a project always means exactly that shape.
 *
 * A second kind, `kind: 'outline'`, holds a 2D drawing from an SVG
 * (svg-outline.mjs): filled outlines in millimetres, centred, with a fill rule
 * per path. Its node is `{ shape: 'svg', params: { asset, w, h } }` and it is
 * always a solid (it is extruded, never imported as triangles).
 *
 * Pure: no DOM, no WebAssembly (checkSolid takes the engine's ctx).
 */

export const MAX_IMPORT_TRIANGLES = 100_000;
export const MAX_PROJECT_TRIANGLES = 250_000;
export const ASSET_ID = /^m[0-9a-z]{6,20}$/;

/* Triangle soup → shared corners. Corners closer than a millionth of the
   model's size are the same corner (STL repeats each one per triangle). */
export function weld(soup) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < soup.length; i++) { const v = soup[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
  const q = Math.max(hi - lo, 1e-9) * 1e-6;
  const ids = new Map();
  const verts = [];
  const tris = new Uint32Array(soup.length / 3);
  for (let i = 0, c = 0; i < soup.length; i += 3, c++) {
    const key = `${Math.round(soup[i] / q)},${Math.round(soup[i + 1] / q)},${Math.round(soup[i + 2] / q)}`;
    let id = ids.get(key);
    if (id === undefined) { id = verts.length / 3; ids.set(key, id); verts.push(soup[i], soup[i + 1], soup[i + 2]); }
    tris[c] = id;
  }
  // drop triangles that welded down to a line or a point, then any corner left unused
  const kept = [];
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t], b = tris[t + 1], c = tris[t + 2];
    if (a !== b && b !== c && a !== c) kept.push(a, b, c);
  }
  const remap = new Int32Array(verts.length / 3).fill(-1);
  const used = [];
  const triangles = new Uint32Array(kept.length);
  for (let i = 0; i < kept.length; i++) {
    const v = kept[i];
    if (remap[v] < 0) { remap[v] = used.length / 3; used.push(verts[v * 3], verts[v * 3 + 1], verts[v * 3 + 2]); }
    triangles[i] = remap[v];
  }
  return { vertices: Float32Array.from(used), triangles };
}

/* cyrb53 over the raw bytes: fast, stable, plenty for telling models apart. */
export function hashGeometry(vertices, triangles) {
  return hashBytes([vertices, triangles]);
}

/* An outline's id hashes its canonical JSON (rules, then every coordinate). */
export function hashOutline(shapes) {
  return hashBytes([new TextEncoder().encode(JSON.stringify(shapes.map((sh) => [sh.rule, sh.contours])))]);
}

function hashBytes(arrays) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (const arr of arrays) {
    const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
    for (let i = 0; i < bytes.length; i++) {
      h1 = Math.imul(h1 ^ bytes[i], 2654435761);
      h2 = Math.imul(h2 ^ bytes[i], 1597334677);
    }
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 'm' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36).padStart(8, '0');
}

const cleanText = (s, n) => (typeof s === 'string' ? s.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n) : '');

/* A soup from mesh-import.mjs (Z up, file units) → an asset. */
export function makeAsset(soup, { name = 'Imported model', source = '', license = '' } = {}) {
  const { vertices, triangles } = weld(soup);
  const count = triangles.length / 3;
  if (!count) throw new Error('That model has no solid triangles.');
  if (count > MAX_IMPORT_TRIANGLES) throw new Error(`That model has ${count.toLocaleString()} triangles; Workbench takes up to ${MAX_IMPORT_TRIANGLES.toLocaleString()}. Simplify it first (Blender: Decimate modifier; Meshmixer: Reduce).`);
  return { id: hashGeometry(vertices, triangles), name: cleanText(name, 60) || 'Imported model', source: cleanText(source, 200), license: cleanText(license, 80), solid: null, vertices, triangles };
}

/* parseSvg()'s result → an outline asset. */
export function makeOutlineAsset(parsed, { name = 'Drawing', source = '', license = '' } = {}) {
  const shapes = parsed.shapes.map((sh) => ({ rule: sh.rule === 'evenodd' ? 'evenodd' : 'nonzero', contours: sh.contours.map((c) => [...c]) }));
  return { id: hashOutline(shapes), kind: 'outline', name: cleanText(name, 60) || 'Drawing', source: cleanText(source, 200), license: cleanText(license, 80), solid: true, shapes, size: outlineSize(shapes) };
}

function outlineSize(shapes) {
  const lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (const sh of shapes) for (const c of sh.contours) for (let j = 0; j < c.length; j += 2) {
    for (let q = 0; q < 2; q++) { if (c[j + q] < lo[q]) lo[q] = c[j + q]; if (c[j + q] > hi[q]) hi[q] = c[j + q]; }
  }
  return [hi[0] - lo[0], hi[1] - lo[1]];
}

export const MAX_OUTLINE_POINTS = 20_000;

/* Can Manifold treat it as a solid (closed, every edge shared by two faces)?
   Run inside engine.scoped. Mesh.merge() first welds corners that sit a hair
   apart, which is what most "almost closed" exports need. */
export function checkSolid(ctx, asset) {
  try {
    const mesh = new ctx.Mesh({ numProp: 3, vertProperties: asset.vertices, triVerts: asset.triangles });
    mesh.merge();
    const m = ctx.track(new ctx.Manifold(mesh));
    return m.status() === 'NoError' && !m.isEmpty();
  } catch {
    return false;
  }
}

/* ── budget ───────────────────────────────────────────────────────────── */

export function projectTriangles(project, assets) {
  let n = 0;
  const visit = (nodes) => {
    for (const node of nodes) {
      if (node.type === 'group') visit(node.children);
      else if (node.shape === 'mesh') n += (assets.get(node.params?.asset)?.triangles.length || 0) / 3;
    }
  };
  visit(project.objects);
  return n;
}

export function assetIds(project) {
  const ids = new Set();
  const visit = (nodes) => {
    for (const node of nodes) {
      if (node.type === 'group') visit(node.children);
      else if ((node.shape === 'mesh' || node.shape === 'svg') && node.params?.asset) ids.add(node.params.asset);
    }
  };
  visit(project.objects);
  return ids;
}

/* ── in a .workbench.json ─────────────────────────────────────────────── */

function toBase64(arr) {
  const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(text, Type) {
  const s = atob(text);
  if (s.length % Type.BYTES_PER_ELEMENT) throw new Error('bad length');
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return new Type(bytes.buffer);
}

/* Little-endian on every machine Workbench runs on; the file says so. */
export function encodeAssets(assets, ids) {
  const out = {};
  for (const id of ids) {
    const a = assets.get(id);
    if (!a) continue;
    if (a.kind === 'outline') { out[id] = { kind: 'outline', name: a.name, source: a.source, license: a.license, shapes: a.shapes }; continue; }
    out[id] = { name: a.name, source: a.source, license: a.license, solid: a.solid === true, encoding: 'base64-le', vertices: toBase64(a.vertices), triangles: toBase64(a.triangles) };
  }
  return out;
}

/* Throws a sentence a student can act on; checks every index and number, and
   that the id matches the geometry (so a hand-edited file can't swap a shape
   in under someone else's id). */
export function decodeAssets(raw) {
  const out = new Map();
  if (raw === undefined || raw === null) return out;
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error('The imported models in this project file are damaged.');
  let total = 0;
  for (const [id, a] of Object.entries(raw)) {
    const fail = (why) => { throw new Error(`The imported model “${cleanText(a?.name, 40) || id}” in this file is damaged (${why}).`); };
    if (!ASSET_ID.test(id) || !a || typeof a !== 'object') fail('bad id');
    if (a.kind === 'outline') {
      if (!Array.isArray(a.shapes) || !a.shapes.length) fail('no outlines');
      let points = 0;
      const shapes = a.shapes.map((sh) => {
        if (!sh || !Array.isArray(sh.contours) || !sh.contours.length) fail('an empty outline');
        return { rule: sh.rule === 'evenodd' ? 'evenodd' : 'nonzero', contours: sh.contours.map((c) => {
          if (!Array.isArray(c) || c.length < 6 || c.length % 2 || !c.every((v) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1e6)) fail('an outline with bad points');
          points += c.length / 2;
          return [...c];
        }) };
      });
      if (points > MAX_OUTLINE_POINTS) fail('too many points');
      if (hashOutline(shapes) !== id || shapes.some((sh, k) => sh.rule !== a.shapes[k].rule)) fail('its id does not match its shape');
      out.set(id, { id, kind: 'outline', name: cleanText(a.name, 60) || 'Drawing', source: cleanText(a.source, 200), license: cleanText(a.license, 80), solid: true, shapes, size: outlineSize(shapes) });
      continue;
    }
    let vertices, triangles;
    try { vertices = fromBase64(String(a.vertices), Float32Array); triangles = fromBase64(String(a.triangles), Uint32Array); } catch { fail('unreadable data'); }
    if (vertices.length % 3 || triangles.length % 3 || !triangles.length) fail('wrong length');
    const nv = vertices.length / 3;
    for (let i = 0; i < vertices.length; i++) if (!Number.isFinite(vertices[i])) fail('missing coordinates');
    for (let i = 0; i < triangles.length; i++) if (triangles[i] >= nv) fail('a corner that does not exist');
    total += triangles.length / 3;
    if (triangles.length / 3 > MAX_IMPORT_TRIANGLES || total > MAX_PROJECT_TRIANGLES * 4) fail('too many triangles');
    if (hashGeometry(vertices, triangles) !== id) fail('its id does not match its shape');
    out.set(id, { id, name: cleanText(a.name, 60) || 'Imported model', source: cleanText(a.source, 200), license: cleanText(a.license, 80), solid: a.solid === true ? true : null, vertices, triangles });
  }
  return out;
}

/* ── geometry for the evaluator ───────────────────────────────────────── */

export const UNIT_TO_MM = { mm: 1, cm: 10, in: 25.4, ft: 304.8, m: 1000 };

/* Corners scaled into project units and centred on the bounding box, like
   every other Workbench shape. */
export function placedVertices(asset, unit, toMm) {
  const k = (UNIT_TO_MM[unit] ?? 1) / (toMm || 1);
  const v = asset.vertices;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < v.length; i += 3) for (let a = 0; a < 3; a++) { const x = v[i + a]; if (x < lo[a]) lo[a] = x; if (x > hi[a]) hi[a] = x; }
  const c = lo.map((l, a) => (l + hi[a]) / 2);
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i += 3) for (let a = 0; a < 3; a++) out[i + a] = (v[i + a] - c[a]) * k;
  return { vertices: out, size: hi.map((h, a) => (h - lo[a]) * k) };
}
