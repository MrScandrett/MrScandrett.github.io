/* svg-outline.mjs — turns an SVG drawing into filled outlines in millimetres,
 * ready to extrude (Workbench's "SVG → extrude" shape).
 *
 *   parseSvg(text, { tolerance, maxPoints }) → {
 *     shapes: [{ rule: 'nonzero'|'evenodd', contours: [[x0,y0,x1,y1,…], …] }],
 *     size: [w, h] (mm), units: { certain, reason }, points, warnings,
 *   }
 *
 * Pure: no DOM and no XML parser. The file is read as text by a small
 * tokenizer, never inserted into a page, so nothing inside an SVG (scripts,
 * event handlers, external links) can run or load.
 *
 * What counts is what a cutter or extruder would see: *filled* areas.
 *   paths (every command, arcs included), rect (rounded too), circle, ellipse,
 *   polygon, polyline; nested <g> with transforms; fill / fill-rule /
 *   display / visibility from attributes, style="" and simple <style> rules
 *   (.class, #id, tag). Curves are flattened to `tolerance` mm.
 * What doesn't, with a warning that says how to fix it in Inkscape:
 *   text (Object to Path), stroke-only lines (Stroke to Path), embedded
 *   pictures (Trace Bitmap), <use> clones (Unlink Clone). Hidden layers,
 *   <defs>, masks, clip paths and patterns are skipped.
 * Y is flipped: SVG's y runs down the page, a workplane's y runs away from you.
 */

const SKIP_SUBTREE = new Set(['defs', 'clipPath', 'mask', 'symbol', 'pattern', 'marker', 'metadata', 'title', 'desc', 'style', 'script', 'linearGradient', 'radialGradient', 'filter', 'foreignObject', 'sodipodi:namedview']);
const UNITS = { mm: 1, cm: 10, in: 25.4, pt: 25.4 / 72, pc: 25.4 / 6, px: 25.4 / 96, '': 25.4 / 96 };

export class SvgError extends Error {}

/* ── 2D affine matrices [a b c d e f]: x' = a x + c y + e, y' = b x + d y + f ── */

const I = [1, 0, 0, 1, 0, 0];
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const scaleOf = (m) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1;

export function parseTransform(s) {
  let m = I;
  if (!s) return m;
  for (const [, name, args] of String(s).matchAll(/([a-zA-Z]+)\s*\(([^)]*)\)/g)) {
    const v = (args.match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g) || []).map(Number);
    const rad = (d) => (d * Math.PI) / 180;
    let t = I;
    if (name === 'matrix' && v.length === 6) t = v;
    else if (name === 'translate') t = [1, 0, 0, 1, v[0] || 0, v[1] || 0];
    else if (name === 'scale') t = [v[0] ?? 1, 0, 0, v[1] ?? v[0] ?? 1, 0, 0];
    else if (name === 'rotate') {
      const a = rad(v[0] || 0), c = Math.cos(a), sn = Math.sin(a);
      t = [c, sn, -sn, c, 0, 0];
      if (v.length >= 3) t = mul(mul([1, 0, 0, 1, v[1], v[2]], t), [1, 0, 0, 1, -v[1], -v[2]]);
    } else if (name === 'skewX') t = [1, 0, Math.tan(rad(v[0] || 0)), 1, 0, 0];
    else if (name === 'skewY') t = [1, Math.tan(rad(v[0] || 0)), 0, 1, 0, 0];
    m = mul(m, t);
  }
  return m;
}

/* ── path data ────────────────────────────────────────────────────────── */

/* Every subpath of `d` as flat [x,y,…] polylines in user units; curves become
   enough straight pieces that none strays more than `tol` from the curve. */
export function parsePath(d, tol = 0.1) {
  const s = String(d || '');
  let i = 0;
  const skip = () => { while (i < s.length && /[\s,]/.test(s[i])) i++; };
  const num = () => {
    skip();
    const m = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(s.slice(i, i + 40));
    if (!m) return null;
    i += m[0].length;
    return Number(m[0]);
  };
  const flag = () => { skip(); const c = s[i]; if (c !== '0' && c !== '1') return null; i++; return c === '1'; };
  const out = [];
  let cur = null, x = 0, y = 0, sx = 0, sy = 0, cmd = '', lastCtrl = null, lastQuad = null;
  const start = (nx, ny) => { if (cur && cur.length > 2) out.push(cur); cur = [nx, ny]; x = sx = nx; y = sy = ny; };
  const line = (nx, ny) => { if (!cur) cur = [x, y]; cur.push(nx, ny); x = nx; y = ny; };
  const cubic = (x1, y1, x2, y2, x3, y3) => {
    const dd = Math.max(Math.hypot(x - 2 * x1 + x2, y - 2 * y1 + y2), Math.hypot(x1 - 2 * x2 + x3, y1 - 2 * y2 + y3));
    const n = Math.min(256, Math.max(1, Math.ceil(Math.sqrt((0.75 * dd) / tol))));
    const x0 = x, y0 = y;
    for (let k = 1; k <= n; k++) {
      const t = k / n, u = 1 - t;
      line(u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3);
    }
    lastCtrl = [x2, y2];
  };
  const quad = (x1, y1, x2, y2) => {
    const dd = Math.hypot(x - 2 * x1 + x2, y - 2 * y1 + y2);
    const n = Math.min(256, Math.max(1, Math.ceil(Math.sqrt((0.25 * dd) / tol))));
    const x0 = x, y0 = y;
    for (let k = 1; k <= n; k++) {
      const t = k / n, u = 1 - t;
      line(u * u * x0 + 2 * u * t * x1 + t * t * x2, u * u * y0 + 2 * u * t * y1 + t * t * y2);
    }
    lastQuad = [x1, y1];
  };
  // SVG 1.1 F.6.5: endpoint arc → centre form, then even steps
  const arc = (rx, ry, phi, large, sweep, x2, y2) => {
    if (!rx || !ry) { line(x2, y2); return; }
    rx = Math.abs(rx); ry = Math.abs(ry);
    const a = (phi * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
    const dx = (x - x2) / 2, dy = (y - y2) / 2;
    const x1p = c * dx + sn * dy, y1p = -sn * dx + c * dy;
    const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    const num2 = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
    const k = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num2 / (rx * rx * y1p * y1p + ry * ry * x1p * x1p)));
    const cxp = (k * rx * y1p) / ry, cyp = (-k * ry * x1p) / rx;
    const cx = c * cxp - sn * cyp + (x + x2) / 2, cy = sn * cxp + c * cyp + (y + y2) / 2;
    const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!sweep && dt > 0) dt -= 2 * Math.PI; else if (sweep && dt < 0) dt += 2 * Math.PI;
    const r = Math.max(rx, ry);
    const step = r > tol ? 2 * Math.acos(Math.max(-1, 1 - tol / r)) : Math.PI / 2;
    const n = Math.min(256, Math.max(2, Math.ceil(Math.abs(dt) / step)));
    for (let j = 1; j <= n; j++) {
      const t = t1 + (dt * j) / n;
      line(j === n ? x2 : cx + rx * Math.cos(t) * c - ry * Math.sin(t) * sn, j === n ? y2 : cy + rx * Math.cos(t) * sn + ry * Math.sin(t) * c);
    }
  };
  while (i < s.length) {
    skip();
    if (i >= s.length) break;
    if (/[A-Za-z]/.test(s[i])) { cmd = s[i++]; if (cmd === 'Z' || cmd === 'z') { if (cur) { x = sx; y = sy; if (cur.length > 2) out.push(cur); cur = null; } lastCtrl = lastQuad = null; continue; } }
    else if (!cmd) throw new SvgError('A path does not start with a command.');
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    const C = cmd.toUpperCase();
    const before = i;
    const need = (vals) => { if (vals.some((v) => v === null)) throw new SvgError('A path ends part-way through a command.'); return vals; };
    if (C === 'M') { const [a, b] = need([num(), num()]); start(a + ox, b + oy); cmd = rel ? 'l' : 'L'; lastCtrl = lastQuad = null; }
    else if (C === 'L') { const [a, b] = need([num(), num()]); line(a + ox, b + oy); lastCtrl = lastQuad = null; }
    else if (C === 'H') { const [a] = need([num()]); line(a + ox, y); lastCtrl = lastQuad = null; }
    else if (C === 'V') { const [b] = need([num()]); line(x, b + oy); lastCtrl = lastQuad = null; }
    else if (C === 'C') { const v = need([num(), num(), num(), num(), num(), num()]); cubic(v[0] + ox, v[1] + oy, v[2] + ox, v[3] + oy, v[4] + ox, v[5] + oy); lastQuad = null; }
    else if (C === 'S') {
      const v = need([num(), num(), num(), num()]);
      const [rx1, ry1] = lastCtrl ? [2 * x - lastCtrl[0], 2 * y - lastCtrl[1]] : [x, y];
      cubic(rx1, ry1, v[0] + ox, v[1] + oy, v[2] + ox, v[3] + oy); lastQuad = null;
    } else if (C === 'Q') { const v = need([num(), num(), num(), num()]); quad(v[0] + ox, v[1] + oy, v[2] + ox, v[3] + oy); lastCtrl = null; }
    else if (C === 'T') {
      const v = need([num(), num()]);
      const [qx, qy] = lastQuad ? [2 * x - lastQuad[0], 2 * y - lastQuad[1]] : [x, y];
      quad(qx, qy, v[0] + ox, v[1] + oy); lastCtrl = null;
    } else if (C === 'A') {
      const rx = num(), ry = num(), rot = num(), large = flag(), sweep = flag(), ex = num(), ey = num();
      need([rx, ry, rot, large, sweep, ex, ey]);
      arc(rx, ry, rot, large, sweep, ex + ox, ey + oy); lastCtrl = lastQuad = null;
    } else throw new SvgError(`A path uses a command this importer doesn't know (“${cmd}”).`);
    if (i === before) throw new SvgError('A path has something in it that is not a number.');
  }
  if (cur && cur.length > 2) out.push(cur);
  return out;
}

/* ── the document ─────────────────────────────────────────────────────── */

function attrs(s) {
  const out = {};
  for (const m of s.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) out[m[1]] = (m[2] ?? m[3]).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return out;
}

function declarations(s) {
  const out = {};
  for (const part of String(s || '').split(';')) {
    const k = part.indexOf(':');
    if (k > 0) out[part.slice(0, k).trim().toLowerCase()] = part.slice(k + 1).replace(/!important/, '').trim();
  }
  return out;
}

/* .a, #b, path and comma lists only; enough for Illustrator's .cls-1 rules. */
function styleRules(text) {
  const rules = [];
  const css = text.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const decls = declarations(m[2]);
    for (const sel of m[1].split(',').map((x) => x.trim())) if (/^([.#]?[\w-]+)$/.test(sel)) rules.push([sel, decls]);
  }
  return rules;
}

function unitLength(v) {
  const m = /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*([a-z%]*)\s*$/i.exec(String(v ?? ''));
  if (!m || m[2] === '%' || !(m[2].toLowerCase() in UNITS)) return null;
  return { value: Number(m[1]), unit: m[2].toLowerCase() };
}

const area2 = (c) => { let a = 0; for (let i = 0, n = c.length; i < n; i += 2) { const j = (i + 2) % n; a += c[i] * c[j + 1] - c[j] * c[i + 1]; } return a / 2; };

/* Ramer–Douglas–Peucker on a closed ring. */
function simplify(c, eps) {
  const n = c.length / 2;
  if (n <= 4 || eps <= 0) return c;
  const keep = new Uint8Array(n);
  keep[0] = 1;
  // split at the point farthest from the start, so the ring's two halves simplify separately
  let far = 0, fd = -1;
  for (let i = 1; i < n; i++) { const d = (c[2 * i] - c[0]) ** 2 + (c[2 * i + 1] - c[1]) ** 2; if (d > fd) { fd = d; far = i; } }
  keep[far] = 1;
  const stack = [[0, far], [far, n]];
  const P = (k) => [c[2 * (k % n)], c[2 * (k % n) + 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    if (b - a < 2) continue;
    const [ax, ay] = P(a), [bx, by] = P(b);
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    let best = -1, bd = -1;
    for (let k = a + 1; k < b; k++) {
      const [px, py] = P(k);
      const d = Math.abs(dy * (px - ax) - dx * (py - ay)) / len;
      if (d > bd) { bd = d; best = k; }
    }
    if (bd > eps) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  const out = [];
  for (let k = 0; k < n; k++) if (keep[k]) out.push(c[2 * k], c[2 * k + 1]);
  return out;
}

export function parseSvg(text, { tolerance = 0.05, maxPoints = 6000 } = {}) {
  const src = String(text || '').replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<!DOCTYPE[\s\S]*?>/i, '').replace(/<\?[\s\S]*?\?>/g, '');
  const rootM = /<svg\b([^>]*)>/i.exec(src);
  if (!rootM) throw new SvgError('That file is not an SVG drawing.');
  const root = attrs(rootM[1]);
  const rules = [];
  for (const m of src.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) rules.push(...styleRules(m[1]));

  // user units → millimetres, from width/height and the viewBox
  const vb = (root.viewBox || '').trim().split(/[\s,]+/).map(Number);
  const hasVb = vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0;
  const W = unitLength(root.width), H = unitLength(root.height);
  let k = UNITS.px, certain = false, reason = 'The drawing has no real size, so it is read at 96 pixels to the inch.';
  if (W && W.unit && W.unit !== 'px') {
    const mmW = W.value * UNITS[W.unit];
    k = hasVb ? mmW / vb[2] : UNITS[W.unit];
    certain = true;
    reason = `The drawing says it is ${+mmW.toFixed(2)} mm wide.`;
  } else if (W) {
    k = hasVb ? (W.value * UNITS.px) / vb[2] : UNITS.px;
    reason = 'The drawing is sized in pixels, read at 96 to the inch.';
  } else if (H && H.unit && H.unit !== 'px' && hasVb) {
    k = (H.value * UNITS[H.unit]) / vb[3];
    certain = true;
    reason = `The drawing says it is ${+(H.value * UNITS[H.unit]).toFixed(2)} mm tall.`;
  }
  const base = mul([k, 0, 0, -k, 0, 0], hasVb ? [1, 0, 0, 1, -vb[0], -vb[1]] : I);

  const skipped = { text: 0, stroke: 0, image: 0, use: 0 };
  const shapes = [];
  const style0 = { fill: 'black', 'fill-rule': 'nonzero', stroke: 'none', display: 'inline', visibility: 'visible', 'fill-opacity': '1', opacity: '1' };
  const stack = [{ m: base, style: style0, hidden: false }];
  let skipDepth = 0;
  const body = src.slice(rootM.index + rootM[0].length);
  const tagRe = /<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
  for (const t of body.matchAll(tagRe)) {
    const [, closing, name, attrText, selfClose] = t;
    const local = name.replace(/^svg:/, '');
    if (closing) {
      if (skipDepth) { skipDepth--; continue; }
      if (stack.length > 1) stack.pop();
      continue;
    }
    if (skipDepth) { if (!selfClose) skipDepth++; continue; }
    if (SKIP_SUBTREE.has(local) || SKIP_SUBTREE.has(name)) { if (!selfClose) skipDepth = 1; continue; }
    const a = attrs(attrText);
    const parent = stack[stack.length - 1];
    const style = { ...parent.style };
    for (const key of Object.keys(style0)) if (a[key] !== undefined) style[key] = a[key].trim();
    const classes = (a.class || '').split(/\s+/).filter(Boolean);
    for (const [sel, decls] of rules) {
      if ((sel[0] === '.' && classes.includes(sel.slice(1))) || (sel[0] === '#' && a.id === sel.slice(1)) || sel === local) Object.assign(style, decls);
    }
    Object.assign(style, declarations(a.style));
    const m = mul(parent.m, parseTransform(a.transform));
    const hidden = parent.hidden || style.display === 'none' || style.visibility === 'hidden';
    const frame = { m, style, hidden };
    const enter = () => { if (!selfClose) stack.push(frame); };

    if (local === 'text') { if (!hidden) skipped.text++; if (!selfClose) skipDepth = 1; continue; }
    if (local === 'image') { if (!hidden) skipped.image++; if (!selfClose) skipDepth = 1; continue; }
    if (local === 'use') { if (!hidden) skipped.use++; if (!selfClose) skipDepth = 1; continue; }
    const kind = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line'].includes(local) ? local : null;
    if (!kind) { enter(); continue; }   // g, a, svg, switch… : a group
    enter();
    if (hidden) continue;
    const fill = String(style.fill).toLowerCase();
    const noFill = fill === 'none' || fill === 'transparent' || Number(style['fill-opacity']) === 0 || Number(style.opacity) === 0 || kind === 'line';
    if (noFill) { if (String(style.stroke).toLowerCase() !== 'none' || kind === 'line') skipped.stroke++; continue; }
    const tol = tolerance / Math.max(1e-9, scaleOf(m));
    const n = (v, d = 0) => { const x = parseFloat(v); return Number.isFinite(x) ? x : d; };
    let rings = [];
    if (kind === 'path') rings = parsePath(a.d, tol);
    else if (kind === 'rect') {
      const x = n(a.x), y = n(a.y), w = n(a.width), h = n(a.height);
      if (w > 0 && h > 0) {
        let rx = a.rx !== undefined ? n(a.rx) : a.ry !== undefined ? n(a.ry) : 0, ry = a.ry !== undefined ? n(a.ry) : rx;
        rx = Math.min(Math.max(rx, 0), w / 2); ry = Math.min(Math.max(ry, 0), h / 2);
        const d = rx && ry
          ? `M${x + rx},${y}H${x + w - rx}A${rx},${ry} 0 0 1 ${x + w},${y + ry}V${y + h - ry}A${rx},${ry} 0 0 1 ${x + w - rx},${y + h}H${x + rx}A${rx},${ry} 0 0 1 ${x},${y + h - ry}V${y + ry}A${rx},${ry} 0 0 1 ${x + rx},${y}Z`
          : `M${x},${y}H${x + w}V${y + h}H${x}Z`;
        rings = parsePath(d, tol);
      }
    } else if (kind === 'circle' || kind === 'ellipse') {
      const cx = n(a.cx), cy = n(a.cy), rx = kind === 'circle' ? n(a.r) : n(a.rx), ry = kind === 'circle' ? n(a.r) : n(a.ry);
      if (rx > 0 && ry > 0) rings = parsePath(`M${cx - rx},${cy}A${rx},${ry} 0 1 0 ${cx + rx},${cy}A${rx},${ry} 0 1 0 ${cx - rx},${cy}Z`, tol);
    } else {
      const v = (a.points || '').match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g)?.map(Number) || [];
      if (v.length >= 6) rings = [v.slice(0, v.length - (v.length % 2))];
    }
    const contours = [];
    for (const r of rings) {
      const out = [];
      for (let j = 0; j < r.length; j += 2) {
        const px = m[0] * r[j] + m[2] * r[j + 1] + m[4], py = m[1] * r[j] + m[3] * r[j + 1] + m[5];
        if (out.length && Math.abs(out[out.length - 2] - px) < 1e-9 && Math.abs(out[out.length - 1] - py) < 1e-9) continue;
        out.push(px, py);
      }
      if (out.length >= 4 && Math.abs(out[0] - out[out.length - 2]) < 1e-9 && Math.abs(out[1] - out[out.length - 1]) < 1e-9) out.length -= 2;
      if (out.length >= 6) contours.push(out);
    }
    if (contours.length) shapes.push({ rule: String(style['fill-rule']).toLowerCase() === 'evenodd' ? 'evenodd' : 'nonzero', contours });
  }

  // tidy: simplify until the drawing fits the point budget, drop slivers
  let eps = tolerance / 4, points = 0, tidied = shapes;
  for (let pass = 0; pass < 14; pass++) {
    tidied = shapes.map((sh) => ({ rule: sh.rule, contours: sh.contours.map((c) => simplify(c, eps)).filter((c) => c.length >= 6 && Math.abs(area2(c)) > tolerance * tolerance) }))
      .filter((sh) => sh.contours.length);
    points = tidied.reduce((acc, sh) => acc + sh.contours.reduce((b, c) => b + c.length / 2, 0), 0);
    if (points <= maxPoints) break;
    eps *= 2;
  }
  const warnings = [];
  if (skipped.text) warnings.push(`${skipped.text} text item${skipped.text > 1 ? 's were' : ' was'} left out: turn text into outlines first (Inkscape: Path → Object to Path).`);
  if (skipped.stroke) warnings.push(`${skipped.stroke} line${skipped.stroke > 1 ? 's have' : ' has'} a stroke but no fill, so ${skipped.stroke > 1 ? 'they were' : 'it was'} left out (Inkscape: Path → Stroke to Path).`);
  if (skipped.image) warnings.push(`${skipped.image} embedded picture${skipped.image > 1 ? 's were' : ' was'} left out: trace it into shapes first (Inkscape: Path → Trace Bitmap).`);
  if (skipped.use) warnings.push(`${skipped.use} clone${skipped.use > 1 ? 's were' : ' was'} left out (Inkscape: Edit → Clone → Unlink Clone).`);
  if (eps > tolerance) warnings.push(`The drawing was simplified to ${points.toLocaleString()} points; tiny details may be smoother.`);
  if (!tidied.length) {
    throw new SvgError(warnings.length ? `Nothing filled to extrude. ${warnings.join(' ')}` : 'That SVG has no filled shapes to extrude.');
  }
  const lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (const sh of tidied) for (const c of sh.contours) for (let j = 0; j < c.length; j += 2) {
    for (let q = 0; q < 2; q++) { if (c[j + q] < lo[q]) lo[q] = c[j + q]; if (c[j + q] > hi[q]) hi[q] = c[j + q]; }
  }
  // centre on the bounding box and round to a micron: smaller files, stable ids
  const cx = (lo[0] + hi[0]) / 2, cy = (lo[1] + hi[1]) / 2;
  const r = (v) => Math.round(v * 1000) / 1000;
  for (const sh of tidied) sh.contours = sh.contours.map((c) => c.map((v, j) => r(v - (j % 2 ? cy : cx))));
  return { shapes: tidied, size: [hi[0] - lo[0], hi[1] - lo[1]], units: { certain, reason }, points, warnings };
}
