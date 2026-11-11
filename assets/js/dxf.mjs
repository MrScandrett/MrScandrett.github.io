/* dxf.mjs — Blueprint Drafting's DXF reader and writer, plus the checks behind
 * "Build it in Workbench". Pure: no DOM, so it runs in tests and in the page.
 *
 * Drafting data (assets/js/lessons/blueprint-drafting.js):
 *   project = { version: 1, title, guide, views: { front, top, right } }
 *   shape   = { kind: 'line'|'rect'|'dimension', type: 'object'|'hidden'|'center', x1, y1, x2, y2 }
 * in board units: 2 units = 1 mm, y down, each view an 800 × 500 board.
 *
 *   toDxf(project)              → ASCII R12 (AC1009) text, millimetres, third-angle sheet
 *   fromDxf(text)               → { views | shapes, title, units, notes } (throws DxfError)
 *   viewsAgree(project)         → { ok, reason, size: { width, depth, height } } in mm
 *   topOutline(project)         → { loops, openLines } closed outlines of the top view
 *   workbenchSvg(project)       → { svg, filename, size } or { error } for the hand-off
 */

export class DxfError extends Error {
  constructor(message) { super(message); this.name = 'DxfError'; }
}

export const UNITS_PER_MM = 2;
export const BOARD = { w: 800, h: 500 };
/* The part of the board a placed import may use (clear of the borders and the
   title block), in board units. */
export const PLACE = { x0: 40, y0: 80, x1: 760, y1: 400 };
export const MAX_SHAPES = 2000;

const PANEL = { w: BOARD.w / UNITS_PER_MM, h: BOARD.h / UNITS_PER_MM };  // 400 × 250 mm
const GAP = 20;
/* Third-angle: front at the origin, top above it, right to its right. */
export const LAYOUT = {
  front: { x: 0, y: 0 },
  top: { x: 0, y: PANEL.h + GAP },
  right: { x: PANEL.w + GAP, y: 0 },
};
const VIEWS = ['front', 'top', 'right'];
const LAYER_OF = { object: 'OUTLINE', hidden: 'HIDDEN', center: 'CENTER' };

/* ---------------------------------------------------------------- writing */

const num = (v) => {
  const r = Math.round(v * 1e6) / 1e6;
  return Object.is(r, -0) ? '0.0' : Number.isInteger(r) ? r.toFixed(1) : String(r);
};

function pairs(out, ...list) {
  for (let i = 0; i < list.length; i += 2) out.push(String(list[i]), String(list[i + 1]));
}

/* Board point of one view → sheet millimetres, y up. */
function toSheet(name, x, y) {
  const o = LAYOUT[name];
  return [o.x + x / UNITS_PER_MM, o.y + PANEL.h - y / UNITS_PER_MM];
}

export function dimensionLabel(s) {
  return `${Math.round(Math.hypot(s.x2 - s.x1, s.y2 - s.y1) / UNITS_PER_MM)} mm`;
}

function cleanTitle(t) {
  return String(t || 'Blueprint').replace(/[\x00-\x1f]/g, ' ').trim().slice(0, 36) || 'Blueprint';
}

export function toDxf(project) {
  const out = [];
  pairs(out, 0, 'SECTION', 2, 'HEADER',
    9, '$ACADVER', 1, 'AC1009',
    9, '$INSUNITS', 70, 4,
    9, '$MEASUREMENT', 70, 1,
    9, '$EXTMIN', 10, num(0), 20, num(0), 30, num(0),
    9, '$EXTMAX', 10, num(LAYOUT.right.x + PANEL.w), 20, num(LAYOUT.top.y + PANEL.h), 30, num(0),
    0, 'ENDSEC');

  pairs(out, 0, 'SECTION', 2, 'TABLES');
  const ltypes = [
    ['CONTINUOUS', 'Solid line', []],
    ['DASHED', 'Dashed __ __ __', [4.5, -3.5]],
    ['CENTER', 'Center ____ _ ____ _', [10, -3, 2, -3]],
  ];
  pairs(out, 0, 'TABLE', 2, 'LTYPE', 70, ltypes.length);
  for (const [name, desc, pattern] of ltypes) {
    pairs(out, 0, 'LTYPE', 2, name, 70, 0, 3, desc, 72, 65, 73, pattern.length,
      40, num(pattern.reduce((a, b) => a + Math.abs(b), 0)));
    for (const p of pattern) pairs(out, 49, num(p));
  }
  pairs(out, 0, 'ENDTAB');
  const layers = [['0', 7, 'CONTINUOUS'], ['OUTLINE', 7, 'CONTINUOUS'], ['HIDDEN', 8, 'DASHED'], ['CENTER', 1, 'CENTER'], ['DIMENSIONS', 30, 'CONTINUOUS'], ['TITLE', 7, 'CONTINUOUS']];
  pairs(out, 0, 'TABLE', 2, 'LAYER', 70, layers.length);
  for (const [name, color, lt] of layers) pairs(out, 0, 'LAYER', 2, name, 70, 0, 62, color, 6, lt);
  pairs(out, 0, 'ENDTAB', 0, 'ENDSEC');

  pairs(out, 0, 'SECTION', 2, 'ENTITIES');
  const line = (layer, [x1, y1], [x2, y2]) => pairs(out, 0, 'LINE', 8, layer, 10, num(x1), 20, num(y1), 30, num(0), 11, num(x2), 21, num(y2), 31, num(0));
  const text = (layer, [x, y], h, value, angle = 0) => pairs(out, 0, 'TEXT', 8, layer,
    10, num(x), 20, num(y), 30, num(0), 40, num(h), 1, value, ...(angle ? [50, num(angle)] : []),
    72, 1, 11, num(x), 21, num(y), 31, num(0));
  for (const name of VIEWS) {
    for (const s of project.views?.[name] || []) {
      const a = toSheet(name, s.x1, s.y1), b = toSheet(name, s.x2, s.y2);
      if (s.kind === 'dimension') {
        line('DIMENSIONS', a, b);
        let ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
        if (ang > 90.0001) ang -= 180;
        if (ang < -89.9999) ang += 180;
        const r = ang * Math.PI / 180;
        const mid = [(a[0] + b[0]) / 2 - Math.sin(r) * 4, (a[1] + b[1]) / 2 + Math.cos(r) * 4];
        text('DIMENSIONS', mid, 3.5, dimensionLabel(s), Math.round(ang * 1000) / 1000);
      } else if (s.kind === 'rect') {
        const layer = LAYER_OF[s.type] || 'OUTLINE';
        pairs(out, 0, 'POLYLINE', 8, layer, 66, 1, 10, num(0), 20, num(0), 30, num(0), 70, 1);
        for (const [x, y] of [[s.x1, s.y1], [s.x2, s.y1], [s.x2, s.y2], [s.x1, s.y2]]) {
          const p = toSheet(name, x, y);
          pairs(out, 0, 'VERTEX', 8, layer, 10, num(p[0]), 20, num(p[1]), 30, num(0));
        }
        pairs(out, 0, 'SEQEND', 8, layer);
      } else {
        line(LAYER_OF[s.type] || 'OUTLINE', a, b);
      }
    }
    const o = LAYOUT[name];
    text('TITLE', [o.x + PANEL.w / 2, o.y - 8], 5, `${name.toUpperCase()} VIEW`);
  }
  text('TITLE', [LAYOUT.right.x + PANEL.w / 2, LAYOUT.top.y + PANEL.h / 2], 8, cleanTitle(project.title));
  text('TITLE', [LAYOUT.right.x + PANEL.w / 2, LAYOUT.top.y + PANEL.h / 2 - 14], 4, 'THIRD-ANGLE VIEWS · DIMENSIONS IN MM');
  pairs(out, 0, 'ENDSEC', 0, 'EOF');
  return out.join('\n') + '\n';
}

/* ---------------------------------------------------------------- reading */

/* $INSUNITS → millimetres per drawing unit. */
const INSUNITS = {
  1: ['inches', 25.4], 2: ['feet', 304.8], 4: ['millimetres', 1], 5: ['centimetres', 10], 6: ['metres', 1000],
  8: ['microinches', 25.4e-6], 9: ['mils', 0.0254], 10: ['yards', 914.4], 13: ['microns', 0.001], 14: ['decimetres', 100],
};

function tokens(text) {
  const lines = String(text).replace(/^﻿/, '').split(/\r?\n|\r/);
  const list = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number(lines[i].trim());
    if (!Number.isInteger(code)) throw new DxfError('That file is not an ASCII DXF drawing (binary DXF and DWG can’t be read; save as ASCII DXF).');
    list.push([code, lines[i + 1].trim()]);
  }
  return list;
}

/* Split a token list into entity records: { type, g: Map(code → [values]) }. */
function records(list) {
  const out = [];
  let cur = null;
  for (const [code, value] of list) {
    if (code === 0) { cur = { type: value.toUpperCase(), g: new Map(), seq: [] }; out.push(cur); continue; }
    if (!cur) continue;
    cur.seq.push([code, value]);
    if (!cur.g.has(code)) cur.g.set(code, []);
    cur.g.get(code).push(value);
  }
  return out;
}

const gnum = (r, code, d = 0) => {
  const v = r.g.get(code);
  const n = v ? Number(v[0]) : NaN;
  return Number.isFinite(n) ? n : d;
};
const gstr = (r, code, d = '') => (r.g.get(code)?.[0] ?? d);

export function parseDxf(text) {
  if (!/(^|\n)\s*0\s*\r?\n\s*SECTION/i.test(String(text).slice(0, 4096))) {
    throw new DxfError('That file is not an ASCII DXF drawing (it has no SECTION). Save it as DXF from your CAD app.');
  }
  const recs = records(tokens(text));
  const header = {}, layers = new Map(), blocks = new Map(), entities = [];
  let section = null, table = null, block = null, sawEntities = false;
  for (let i = 0; i < recs.length; i++) {
    const r = recs[i];
    if (r.type === 'SECTION') {
      section = gstr(r, 2).toUpperCase();
      if (section === 'ENTITIES') sawEntities = true;
      if (section === 'HEADER') {
        // the header is one record of 9 / value pairs
        let name = null;
        for (const [code, value] of r.seq) {
          if (code === 9) name = value.toUpperCase();
          else if (name && code !== 2 && !(name in header)) header[name] = value;
        }
      }
      continue;
    }
    if (r.type === 'ENDSEC') { section = null; continue; }
    if (r.type === 'EOF') break;
    if (section === 'TABLES') {
      if (r.type === 'TABLE') table = gstr(r, 2).toUpperCase();
      else if (r.type === 'ENDTAB') table = null;
      else if (table === 'LAYER' && r.type === 'LAYER') layers.set(gstr(r, 2).toUpperCase(), { linetype: gstr(r, 6).toUpperCase(), color: gnum(r, 62, 7) });
    } else if (section === 'BLOCKS') {
      if (r.type === 'BLOCK') { block = { name: gstr(r, 2), base: [gnum(r, 10), gnum(r, 20)], entities: [] }; blocks.set(block.name.toUpperCase(), block); }
      else if (r.type === 'ENDBLK') block = null;
      else if (block) block.entities.push(r);
    } else if (section === 'ENTITIES') {
      entities.push(r);
    }
  }
  if (!sawEntities) throw new DxfError('That DXF has no ENTITIES section, so there is nothing to draw.');
  return { header, layers, blocks, entities };
}

function arcPoints(cx, cy, r, a0, a1) {
  let sweep = a1 - a0;
  while (sweep <= 0) sweep += Math.PI * 2;
  const n = Math.max(4, Math.min(64, Math.ceil(sweep / (Math.PI * 2) * 48)));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = a0 + sweep * i / n;
    pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
  }
  return pts;
}

/* A polyline vertex list with bulges → points (bulge = tan(θ/4), + is CCW). */
function bulgePoints(verts, closed) {
  const pts = [];
  const n = verts.length;
  for (let i = 0; i < n; i++) {
    const [x, y, bulge] = verts[i];
    pts.push([x, y]);
    if (i === n - 1 && !closed) break;
    const [x2, y2] = verts[(i + 1) % n];
    if (!bulge || Math.abs(bulge) < 1e-9) continue;
    const theta = 4 * Math.atan(bulge);
    const chord = Math.hypot(x2 - x, y2 - y);
    if (chord < 1e-12) continue;
    const r = chord / (2 * Math.sin(Math.abs(theta) / 2));
    const mx = (x + x2) / 2, my = (y + y2) / 2;
    const h = r * Math.cos(theta / 2) * Math.sign(bulge);  // centre offset from the chord's midpoint, to its left for CCW
    const ux = -(y2 - y) / chord, uy = (x2 - x) / chord;
    const cx = mx + ux * h, cy = my + uy * h;
    const a0 = Math.atan2(y - cy, x - cx);
    const segs = Math.max(2, Math.min(48, Math.ceil(Math.abs(theta) / (Math.PI * 2) * 48)));
    for (let k = 1; k < segs; k++) {
      const t = a0 + theta * k / segs;
      pts.push([cx + Math.abs(r) * Math.cos(t), cy + Math.abs(r) * Math.sin(t)]);
    }
  }
  if (closed && n) pts.push([...pts[0]]);
  return pts;
}

/* Every entity → plain pieces in drawing units:
   { layer, linetype, path: [[x,y]…], closed, rectish } or { text }. */
function flatten(parsed, notes) {
  const skipped = new Map();
  const skip = (name) => skipped.set(name, (skipped.get(name) || 0) + 1);
  const pieces = [];
  let paperSpace = 0;

  function emit(list, xf, insideBlock) {
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (r.type === 'SEQEND' || r.type === 'VERTEX' || r.type === 'ATTRIB' || r.type === 'ATTDEF' || r.type === 'VIEWPORT') continue;
      if (gnum(r, 67) === 1) { paperSpace++; if (r.type === 'POLYLINE') while (list[i + 1] && list[i + 1].type !== 'SEQEND') i++; continue; }
      const layer = gstr(r, 8, '0').toUpperCase();
      const linetype = gstr(r, 6).toUpperCase();
      const mirror = gnum(r, 230, 1) < 0;  // OCS with Z down: x is mirrored
      const ocs = (x, y) => (mirror ? [-x, y] : [x, y]);
      const put = (path, closed = false, extra = {}) => pieces.push({ layer: insideBlock && layer === '0' ? xf.layer : layer, linetype: linetype === 'BYBLOCK' ? xf.linetype : linetype, path: path.map(([x, y]) => xf.apply(x, y)), closed, ...extra });
      switch (r.type) {
        case 'LINE':
          put([[gnum(r, 10), gnum(r, 20)], [gnum(r, 11), gnum(r, 21)]]);
          break;
        case 'LWPOLYLINE': {
          const xs = (r.g.get(10) || []).map(Number), ys = (r.g.get(20) || []).map(Number);
          const verts = [];
          // bulges belong to the vertex they follow; read them in order
          let vi = -1;
          const bul = [];
          for (const [code, value] of r.seq) {
            if (code === 10) { vi++; bul[vi] = 0; } else if (code === 42 && vi >= 0) bul[vi] = Number(value) || 0;
          }
          for (let k = 0; k < Math.min(xs.length, ys.length); k++) verts.push([...ocs(xs[k], ys[k]), mirror ? -(bul[k] || 0) : (bul[k] || 0)]);
          if (verts.length < 2) { skip('LWPOLYLINE (empty)'); break; }
          const closed = (gnum(r, 70) & 1) === 1;
          const hasBulge = verts.some((v) => v[2]);
          put(bulgePoints(verts, closed), closed, { rectish: !hasBulge && closed && verts.length === 4 });
          break;
        }
        case 'POLYLINE': {
          const flags = gnum(r, 70);
          const verts = [];
          let j = i + 1;
          for (; j < list.length && list[j].type === 'VERTEX'; j++) {
            const v = list[j];
            const vf = gnum(v, 70);
            if (vf & (16 | 128)) continue;  // spline frame points, polyface face records
            verts.push([...(flags & 8 ? [gnum(v, 10), gnum(v, 20)] : ocs(gnum(v, 10), gnum(v, 20))), (flags & 8 || !mirror ? 1 : -1) * gnum(v, 42)]);
          }
          if (list[j]?.type === 'SEQEND') i = j; else i = j - 1;
          if (flags & (16 | 64)) { skip(flags & 64 ? 'POLYLINE (polyface mesh)' : 'POLYLINE (3D mesh)'); break; }
          if (verts.length < 2) { skip('POLYLINE (empty)'); break; }
          const closed = (flags & 1) === 1;
          put(bulgePoints(verts, closed), closed, { rectish: closed && verts.length === 4 && !verts.some((v) => v[2]) });
          break;
        }
        case 'CIRCLE': {
          const [cx, cy] = ocs(gnum(r, 10), gnum(r, 20));
          const rad = gnum(r, 40);
          if (!(rad > 0)) { skip('CIRCLE (no radius)'); break; }
          const pts = arcPoints(cx, cy, rad, 0, Math.PI * 2);
          pts[pts.length - 1] = [...pts[0]];
          put(pts, true);
          break;
        }
        case 'ARC': {
          const [cx, cy] = ocs(gnum(r, 10), gnum(r, 20));
          const rad = gnum(r, 40);
          if (!(rad > 0)) { skip('ARC (no radius)'); break; }
          let a0 = gnum(r, 50) * Math.PI / 180, a1 = gnum(r, 51) * Math.PI / 180;
          if (mirror) [a0, a1] = [Math.PI - a1, Math.PI - a0];
          put(arcPoints(cx, cy, rad, a0, a1));
          break;
        }
        case 'TEXT':
        case 'MTEXT':
          pieces.push({ layer: insideBlock && layer === '0' ? xf.layer : layer, text: gstr(r, 1), at: xf.apply(...ocs(gnum(r, 10), gnum(r, 20))), type: r.type });
          break;
        case 'INSERT': {
          if (insideBlock) { skip('INSERT (block inside a block)'); break; }
          const b = parsed.blocks.get(gstr(r, 2).toUpperCase());
          if (!b) { skip('INSERT (missing block)'); break; }
          if (gnum(r, 70, 1) > 1 || gnum(r, 71, 1) > 1) notes.push(`A block array (${gstr(r, 2)}) was placed once, not repeated.`);
          const [ix, iy] = ocs(gnum(r, 10), gnum(r, 20));
          const sx = gnum(r, 41, 1) * (mirror ? -1 : 1), sy = gnum(r, 42, 1);
          const rot = (mirror ? -1 : 1) * gnum(r, 50) * Math.PI / 180;
          const c = Math.cos(rot), s = Math.sin(rot);
          const [bx, by] = b.base;
          const inner = {
            layer, linetype: linetype || 'BYLAYER',
            apply: (x, y) => {
              const px = (x - bx) * sx, py = (y - by) * sy;
              return xf.apply(ix + px * c - py * s, iy + px * s + py * c);
            },
          };
          emit(b.entities, inner, true);
          break;
        }
        default:
          skip(r.type);
      }
    }
  }
  emit(parsed.entities, { layer: '0', linetype: '', apply: (x, y) => [x, y] }, false);
  if (paperSpace) notes.push(`${paperSpace} paper-space item${paperSpace === 1 ? '' : 's'} (layout sheets) left out; only the model is read.`);
  return { pieces, skipped };
}

function lineTypeOf(piece, layers) {
  const lt = piece.linetype && piece.linetype !== 'BYLAYER' ? piece.linetype : (layers.get(piece.layer)?.linetype || '');
  const all = `${lt} ${piece.layer}`;
  if (/CENT|CHAIN|DASHDOT|PHANTOM/.test(all)) return 'center';
  if (/HIDDEN|DASH|DOT/.test(all)) return 'hidden';
  return 'object';
}

const isDimLayer = (layer) => /^DIM/.test(layer) || layer === 'DEFPOINTS';

function bbox(points) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of points) {
    if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y;
    if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y;
  }
  return b;
}

/* Pieces (in mm, y up) → drafting items in mm, y up, still unplaced:
   { kind, type, x1, y1, x2, y2 } with rect corners and line ends. */
function toItems(pieces, layers) {
  const items = [];
  for (const p of pieces) {
    if (!p.path) continue;
    if (isDimLayer(p.layer)) {
      for (let k = 0; k + 1 < p.path.length; k++) items.push({ kind: 'dimension', type: 'object', a: p.path[k], b: p.path[k + 1] });
      continue;
    }
    const type = lineTypeOf(p, layers);
    if (p.rectish) {
      const pts = p.path.slice(0, 4);
      const [x0, y0, x1, y1] = bbox(pts);
      const eps = 1e-6 * Math.max(1, x1 - x0, y1 - y0);
      const axisAligned = pts.every(([x, y]) => (Math.abs(x - x0) < eps || Math.abs(x - x1) < eps) && (Math.abs(y - y0) < eps || Math.abs(y - y1) < eps));
      if (axisAligned && x1 - x0 > eps && y1 - y0 > eps) { items.push({ kind: 'rect', type, a: [x0, y1], b: [x1, y0] }); continue; }
    }
    for (let k = 0; k + 1 < p.path.length; k++) items.push({ kind: 'line', type, a: p.path[k], b: p.path[k + 1] });
  }
  return items;
}

const itemBox = (it) => bbox([it.a, it.b]);

/* Place items (mm, y up) on a board: shift by (dx, dy) mm, flip y, round to
   board units, and drop pieces that rounding made zero-length. */
function place(items, dx, dy, top) {
  const out = [];
  for (const it of items) {
    const s = {
      kind: it.kind, type: it.type,
      x1: Math.round((it.a[0] + dx) * UNITS_PER_MM), y1: Math.round((top - (it.a[1] + dy)) * UNITS_PER_MM),
      x2: Math.round((it.b[0] + dx) * UNITS_PER_MM), y2: Math.round((top - (it.b[1] + dy)) * UNITS_PER_MM),
    };
    const w = s.x1 !== s.x2, h = s.y1 !== s.y2;
    if (s.kind === 'rect' ? !(w && h) : !(w || h)) continue;
    out.push(s);
  }
  return out;
}

const mmBox = (b) => `${+(b[2] - b[0]).toFixed(1)} × ${+(b[3] - b[1]).toFixed(1)} mm`;

/* Centre a group of items in the board's placing area, on the 10 mm grid. */
function centre(items) {
  const b = bbox(items.flatMap((it) => [it.a, it.b]));
  const room = [(PLACE.x1 - PLACE.x0) / UNITS_PER_MM, (PLACE.y1 - PLACE.y0) / UNITS_PER_MM];
  if (b[2] - b[0] > room[0] + 1e-6 || b[3] - b[1] > room[1] + 1e-6) {
    throw new DxfError(`That view is ${mmBox(b)}; the board holds ${room[0]} × ${room[1]} mm at full size. Scale it down in your CAD app (say 1:2) and import it again.`);
  }
  const cx = (PLACE.x0 + PLACE.x1) / 2 / UNITS_PER_MM, cy = (PLACE.y0 + PLACE.y1) / 2 / UNITS_PER_MM;  // board mm, y down
  let left = cx - (b[2] - b[0]) / 2, top = cy - (b[3] - b[1]) / 2;
  // snap the corner to the 10 mm grid when the drawing still fits there
  const sl = Math.round(left / 10) * 10, st = Math.round(top / 10) * 10;
  if (sl >= PLACE.x0 / 2 && sl + (b[2] - b[0]) <= PLACE.x1 / 2) left = sl;
  if (st >= PLACE.y0 / 2 && st + (b[3] - b[1]) <= PLACE.y1 / 2) top = st;
  // board y (down) = top + (b[3] - y)
  return place(items, left - b[0], 0, top + b[3]);
}

/* Is this our own sheet layout? Every item sits inside one of the three panels. */
function ourPanels(items) {
  const groups = { front: [], top: [], right: [] };
  for (const it of items) {
    const [x0, y0, x1, y1] = itemBox(it);
    const hit = VIEWS.find((v) => {
      const o = LAYOUT[v];
      return x0 >= o.x - 1e-6 && x1 <= o.x + PANEL.w + 1e-6 && y0 >= o.y - 1e-6 && y1 <= o.y + PANEL.h + 1e-6;
    });
    if (!hit) return null;
    groups[hit].push(it);
  }
  return VIEWS.filter((v) => groups[v].length).length >= 2 ? groups : null;
}

/* Someone else's three-view sheet: cluster by gaps, then find the L of
   third-angle projection (top above front, right beside it). */
function clusterViews(items) {
  const boxes = items.map(itemBox);
  const all = bbox(items.flatMap((it) => [it.a, it.b]));
  const diag = Math.hypot(all[2] - all[0], all[3] - all[1]) || 1;
  for (let tol = diag * 0.002; tol < diag * 0.25; tol *= 1.6) {
    const parent = boxes.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const order = boxes.map((_, i) => i).sort((a, b) => boxes[a][0] - boxes[b][0]);
    for (let a = 0; a < order.length; a++) {
      const A = boxes[order[a]];
      for (let b = a + 1; b < order.length; b++) {
        const B = boxes[order[b]];
        if (B[0] > A[2] + tol) break;
        if (B[1] <= A[3] + tol && A[1] <= B[3] + tol) parent[find(order[a])] = find(order[b]);
      }
    }
    const groups = new Map();
    items.forEach((it, i) => { const k = find(i); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(it); });
    if (groups.size > 3) continue;
    if (groups.size < 2) return null;
    const list = [...groups.values()].map((g) => {
      const solid = g.filter((it) => it.kind !== 'dimension');
      return { g, b: bbox(g.flatMap((it) => [it.a, it.b])), o: solid.length ? bbox(solid.flatMap((it) => [it.a, it.b])) : null };
    });
    // views of one object share sizes: top's width = front's, right's height = front's
    const same = (a, b) => Math.abs(a - b) <= Math.max(1, 0.05 * Math.max(a, b));
    const overlapX = (p, q) => Math.min(p.b[2], q.b[2]) - Math.max(p.b[0], q.b[0]) > 0 && p.o && q.o && same(p.o[2] - p.o[0], q.o[2] - q.o[0]);
    const overlapY = (p, q) => Math.min(p.b[3], q.b[3]) - Math.max(p.b[1], q.b[1]) > 0 && p.o && q.o && same(p.o[3] - p.o[1], q.o[3] - q.o[1]);
    for (const front of list) {
      const rest = list.filter((c) => c !== front);
      const top = rest.find((c) => c.b[1] >= front.b[3] && overlapX(c, front));
      const right = rest.find((c) => c !== top && c.b[0] >= front.b[2] && overlapY(c, front));
      if ((top ? 1 : 0) + (right ? 1 : 0) === rest.length) return { front: front.g, top: top?.g || [], right: right?.g || [] };
    }
    return null;
  }
  return null;
}

/* Read a DXF into drafting shapes. A three-view sheet (ours, or any third-angle
   layout) comes back as `views`; anything else as `shapes` for the current view. */
export function fromDxf(text) {
  if (String(text).length > 5_000_000) throw new DxfError('That DXF is over 5 MB. Export only the part you need.');
  const parsed = parseDxf(text);
  const notes = [];
  const code = Number.parseInt(parsed.header.$INSUNITS, 10);
  let units;
  if (INSUNITS[code]) units = { name: INSUNITS[code][0], toMm: INSUNITS[code][1], certain: true };
  else {
    units = { name: 'millimetres', toMm: 1, certain: false };
    notes.push(Number.isFinite(code) && code !== 0
      ? `The file’s units (code ${code}) aren’t ones the board knows, so it was read in millimetres.`
      : 'The file doesn’t say its units, so it was read in millimetres. If the size is wrong, set the units in your CAD app and export again.');
  }
  const { pieces, skipped } = flatten(parsed, notes);
  const k = units.toMm;
  for (const p of pieces) {
    if (p.path) p.path = p.path.map(([x, y]) => [x * k, y * k]);
    if (p.at) p.at = [p.at[0] * k, p.at[1] * k];
  }
  // labels on the dimension layer are what the board measures for itself
  for (const p of pieces) if (p.text !== undefined && !isDimLayer(p.layer) && p.layer !== 'TITLE') skipped.set(p.type, (skipped.get(p.type) || 0) + 1);
  const skippedText = [...skipped].sort((a, b) => b[1] - a[1]).map(([name, n]) => `${n} ${name}`).join(', ');
  if (skippedText) notes.push(`${skippedText} skipped: the board draws lines, rectangles and dimensions only.`);

  const items = toItems(pieces, parsed.layers);
  if (!items.length) throw new DxfError(`That DXF has no lines the board can draw.${skippedText ? ` (${skippedText} skipped.)` : ''}`);
  if (items.length > MAX_SHAPES) throw new DxfError(`That DXF makes ${items.length.toLocaleString('en-US')} pieces; the board holds up to ${MAX_SHAPES.toLocaleString('en-US')} per import. Curves cost many: simplify them or import one view at a time.`);
  const titleText = pieces.find((p) => p.layer === 'TITLE' && p.text && !/VIEW/.test(p.text) && !/DIMENSIONS IN/.test(p.text));
  const title = titleText ? cleanTitle(titleText.text) : '';

  const ours = units.toMm === 1 && ourPanels(items);
  if (ours) {
    const views = {};
    for (const v of VIEWS) views[v] = place(ours[v], -LAYOUT[v].x, -LAYOUT[v].y, PANEL.h);
    return { views, title, units, notes, layout: 'blueprint' };
  }
  const split = clusterViews(items);
  if (split) {
    const views = {};
    for (const v of VIEWS) views[v] = split[v].length ? centre(split[v]) : [];
    notes.push('Read as a third-angle sheet: top above front, right beside it.');
    return { views, title, units, notes, layout: 'third-angle' };
  }
  return { shapes: centre(items), title, units, notes, layout: 'single' };
}

/* ------------------------------------------------------- views agree check */

function extents(shapes, types = ['object', 'hidden']) {
  const pts = [];
  for (const s of shapes || []) {
    if (s.kind === 'dimension' || !types.includes(s.type)) continue;
    pts.push([s.x1, s.y1], [s.x2, s.y2]);
  }
  if (!pts.length) return null;
  const b = bbox(pts);
  return { w: (b[2] - b[0]) / UNITS_PER_MM, h: (b[3] - b[1]) / UNITS_PER_MM };
}

/* Do the three views describe one object? Front = width × height, top =
   width × depth, right = depth × height; each shared size must match. */
export function viewsAgree(project, { toleranceMm = 1 } = {}) {
  const e = Object.fromEntries(VIEWS.map((v) => [v, extents(project.views?.[v])]));
  const missing = VIEWS.filter((v) => !e[v]);
  if (missing.length) return { ok: false, reason: `Draw object geometry in the ${missing.join(' and ')} view${missing.length === 1 ? '' : 's'} first.` };
  const pairs = [
    ['width', 'front', e.front.w, 'top', e.top.w],
    ['height', 'front', e.front.h, 'right', e.right.h],
    ['depth', 'top', e.top.h, 'right', e.right.w],
  ];
  for (const [what, a, va, b, vb] of pairs) {
    if (Math.abs(va - vb) > toleranceMm) {
      return { ok: false, reason: `The views don’t agree on ${what}: the ${a} view is ${+va.toFixed(1)} mm, the ${b} view ${+vb.toFixed(1)} mm. Make them match, then try again.` };
    }
  }
  return { ok: true, reason: '', size: { width: e.front.w, depth: e.top.h, height: e.front.h } };
}

/* ------------------------------------------------------------ top outline */

/* Closed outlines among a view's object shapes: every object rectangle, and
   every ring of object lines that meet end to end (no branches). */
export function topOutline(project) {
  const shapes = (project.views?.top || []).filter((s) => s.kind !== 'dimension' && s.type === 'object');
  const loops = [];
  for (const s of shapes) {
    if (s.kind !== 'rect') continue;
    const x0 = Math.min(s.x1, s.x2), x1 = Math.max(s.x1, s.x2), y0 = Math.min(s.y1, s.y2), y1 = Math.max(s.y1, s.y2);
    loops.push([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
  }
  const lines = shapes.filter((s) => s.kind === 'line');
  const key = (x, y) => `${x},${y}`;
  const at = new Map();
  lines.forEach((s, i) => {
    for (const k of [key(s.x1, s.y1), key(s.x2, s.y2)]) {
      if (!at.has(k)) at.set(k, []);
      at.get(k).push(i);
    }
  });
  const seen = new Set();
  let openLines = 0;
  for (let i = 0; i < lines.length; i++) {
    if (seen.has(i)) continue;
    // gather the connected group
    const group = [], stack = [i];
    seen.add(i);
    while (stack.length) {
      const j = stack.pop();
      group.push(j);
      const s = lines[j];
      for (const k of [key(s.x1, s.y1), key(s.x2, s.y2)]) for (const n of at.get(k)) if (!seen.has(n)) { seen.add(n); stack.push(n); }
    }
    const verts = new Set(group.flatMap((j) => [key(lines[j].x1, lines[j].y1), key(lines[j].x2, lines[j].y2)]));
    const ring = group.length >= 3 && [...verts].every((k) => at.get(k).length === 2);
    if (!ring) { openLines += group.length; continue; }
    // walk it
    const used = new Set();
    let j = group[0], here = [lines[j].x1, lines[j].y1];
    const poly = [];
    for (let step = 0; step < group.length; step++) {
      used.add(j);
      const s = lines[j];
      const fromStart = s.x1 === here[0] && s.y1 === here[1];
      poly.push(here);
      here = fromStart ? [s.x2, s.y2] : [s.x1, s.y1];
      j = at.get(key(...here)).find((n) => !used.has(n));
      if (j === undefined) break;
    }
    loops.push(poly);
  }
  return { loops, openLines };
}

/* ------------------------------------------------- Build it in Workbench */

function slug(title) {
  return String(title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'blueprint';
}

/* The top view's outline as an SVG in millimetres, to be pulled up by the
   front view's height. Paths are drawn separately and Workbench unions them,
   so pockets drawn inside the outline don't punch through. */
export function workbenchSvg(project) {
  const agree = viewsAgree(project);
  if (!agree.ok) return { error: agree.reason };
  const { loops, openLines } = topOutline(project);
  if (!loops.length) {
    return { error: `The top view has no closed outline${openLines ? ` (its ${openLines} object line${openLines === 1 ? ' doesn’t' : 's don’t'} close into a loop)` : ''}. Draw the outline with Rectangle, or join the lines end to end.` };
  }
  const b = bbox(loops.flat());
  const mm = (v) => +(v / UNITS_PER_MM).toFixed(3);
  const w = mm(b[2] - b[0]), d = mm(b[3] - b[1]);
  const height = +agree.size.height.toFixed(3);
  const paths = loops.map((ring) => `<path d="M${ring.map(([x, y]) => `${mm(x - b[0])} ${mm(y - b[1])}`).join(' L')} Z"/>`).join('');
  const title = String(project.title || 'Blueprint').replace(/[<>&"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${d}mm" viewBox="0 0 ${w} ${d}" data-workbench-height="${height}"><title>${title} · top view outline</title><g fill="#000" fill-rule="nonzero">${paths}</g></svg>`;
  return { svg, filename: `${slug(project.title)}-top.svg`, size: { width: w, depth: d, height }, openLines };
}
