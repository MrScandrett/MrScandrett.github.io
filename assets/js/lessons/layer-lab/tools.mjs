/* tools.mjs — Layer Lab's toolbox. Each tool gets pointer events in document
 * pixels from the studio (studio.mjs) and draws its own on-canvas overlay.
 * Tool ids, keys and groups follow the conventions most photo editors share
 * (V move, M marquee, L lasso, W wand, B brush, …) so the habits transfer.
 */
import { makeCanvas, getPixels, alphaOf, canvasFromAlpha, newLayer, cloneCanvas } from './doc.mjs';
import { magicWand, contentAwareFill } from './pixels.mjs';

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function dab(size, hardness, color) {
  const d = Math.max(1, Math.ceil(size));
  const c = makeCanvas(d, d), ctx = c.getContext('2d');
  const r = d / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  const h = Math.min(0.99, Math.max(0, hardness));
  g.addColorStop(0, color); g.addColorStop(h, color);
  g.addColorStop(1, color.replace(/^#(..)(..)(..)$/, (m, a, b2, cc) => `rgba(${parseInt(a, 16)},${parseInt(b2, 16)},${parseInt(cc, 16)},0)`));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, d, d);
  return c;
}

function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
}

/** Rect from two points, optionally square (shift). */
function rectFrom(a, b, square) {
  let w = b.x - a.x, h = b.y - a.y;
  if (square) { const s = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * s; h = Math.sign(h || 1) * s; }
  return { x: Math.min(a.x, a.x + w), y: Math.min(a.y, a.y + h), w: Math.abs(w), h: Math.abs(h) };
}

function selMode(studio, e) {
  if (e.shiftKey && e.altKey) return 'intersect';
  if (e.shiftKey) return 'add';
  if (e.altKey) return 'subtract';
  return studio.opts.selMode || 'new';
}

/* ── shared painting engine: brush, eraser, mask painting ─────────────── */

class Stroke {
  constructor(studio, { erase = false, color, opacity, size, hardness }) {
    const t = studio.paintTarget();
    if (!t) { this.dead = true; return; }
    this.studio = studio; this.t = t;
    this.canvas = t.canvas;
    this.base = cloneCanvas(this.canvas); // the layer as it was when the stroke began
    this.ox = t.ox; this.oy = t.oy;
    // a mask has only one color: hide (black) or show (white)
    this.mode = t.kind === 'mask' ? (erase || lum(color) < 128 ? 'destination-out' : 'source-over') : erase ? 'destination-out' : 'source-over';
    this.paint = makeCanvas(this.canvas.width, this.canvas.height);
    this.dab = dab(size, hardness, t.kind === 'mask' ? '#ffffff' : color);
    this.size = size; this.opacity = opacity;
    this.clip = studio.selectionCanvasFor(this.canvas.width, this.canvas.height, this.ox, this.oy);
    this.last = null;
  }
  to(p) {
    if (this.dead) return;
    const q = { x: p.x - this.ox, y: p.y - this.oy };
    const ctx = this.paint.getContext('2d');
    const r = this.dab.width / 2;
    if (!this.last) ctx.drawImage(this.dab, q.x - r, q.y - r);
    else {
      const d = dist(this.last, q), step = Math.max(1, this.size * 0.12);
      for (let s = step; s <= d; s += step) {
        const k = s / d;
        ctx.drawImage(this.dab, this.last.x + (q.x - this.last.x) * k - r, this.last.y + (q.y - this.last.y) * k - r);
      }
    }
    this.last = q;
    this.compose();
  }
  compose() {
    let src = this.paint;
    if (this.clip) {
      src = cloneCanvas(this.paint);
      const c = src.getContext('2d');
      c.globalCompositeOperation = 'destination-in';
      c.drawImage(this.clip, 0, 0);
    }
    const ctx = this.canvas.getContext('2d');
    ctx.save();
    ctx.globalCompositeOperation = 'copy';
    ctx.drawImage(this.base, 0, 0);
    ctx.globalCompositeOperation = this.mode;
    ctx.globalAlpha = this.opacity;
    ctx.drawImage(src, 0, 0);
    ctx.restore();
    this.studio.changed();
  }
}

/* ── the tools ──────────────────────────────────────────────────────────── */

export const TOOLS = {};
function tool(id, def) { TOOLS[id] = { id, ...def }; }

tool('move', {
  label: 'Move', key: 'V', group: 'move', cursor: 'move',
  tip: 'Drag a layer. Smart guides snap to the canvas center and edges. Turn on Transform (Ctrl+T) to resize with the corner handles.',
  options: ['autoSelect', 'showTransform', 'align'],
  down(s, p, e) {
    const doc = s.doc;
    const handle = s.opts.showTransform && this.handleAt(s, p);
    if (handle) return this.startTransform(s, handle, p, e);
    if (s.opts.autoSelect || e.ctrlKey || e.metaKey) {
      const hit = [...doc.layers].reverse().find((L) => !L.locked && doc.hits(L, p.x, p.y));
      if (hit) { doc.activeId = hit.id; s.refreshPanels(); }
    }
    const L = doc.active;
    if (!L || L.kind === 'adjust') return s.toast('Pick a layer with something on it to move.');
    if (L.locked) return s.toast(`"${L.name}" is locked. Unlock it in the Layers panel first.`);
    this.drag = { L, start: p, x: L.x, y: L.y, mx: L.mask?.x, my: L.mask?.y, b: doc.bounds(L), moved: false };
  },
  move(s, p, e) {
    if (this.xf) return this.dragTransform(s, p, e);
    const d = this.drag;
    if (!d) return;
    let dx = Math.round(p.x - d.start.x), dy = Math.round(p.y - d.start.y);
    if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
    s.guides = [];
    if (d.b && s.opts.snap !== false) {
      const tol = 6 / s.view.zoom;
      const xs = [0, s.doc.width / 2, s.doc.width], ys = [0, s.doc.height / 2, s.doc.height];
      for (const L of s.doc.layers) {
        if (L === d.L || !L.visible) continue;
        const b = s.doc.bounds(L);
        if (b) { xs.push(b.x, b.x + b.width / 2, b.x + b.width); ys.push(b.y, b.y + b.height / 2, b.y + b.height); }
      }
      const snap = (pos, size, lines) => {
        let best = null;
        for (const edge of [0, size / 2, size]) for (const line of lines) {
          const off = line - (pos + edge);
          if (Math.abs(off) <= tol && (!best || Math.abs(off) < Math.abs(best.off))) best = { off, line };
        }
        return best;
      };
      const sx = snap(d.b.x + dx, d.b.width, xs), sy = snap(d.b.y + dy, d.b.height, ys);
      if (sx) { dx += Math.round(sx.off); s.guides.push({ x: sx.line }); }
      if (sy) { dy += Math.round(sy.off); s.guides.push({ y: sy.line }); }
    }
    d.L.x = d.x + dx; d.L.y = d.y + dy;
    if (d.L.mask) { d.L.mask.x = d.mx + dx; d.L.mask.y = d.my + dy; }
    d.moved = dx || dy;
    s.changed();
  },
  up(s) {
    if (this.xf) return this.endTransform(s);
    if (this.drag?.moved) s.commit('Move', { event: 'move' });
    this.drag = null; s.guides = []; s.redraw();
  },
  handleAt(s, p) {
    const L = s.doc.active;
    const b = L && s.doc.bounds(L);
    if (!b) return null;
    const tol = 8 / s.view.zoom;
    const pts = { nw: [b.x, b.y], ne: [b.x + b.width, b.y], sw: [b.x, b.y + b.height], se: [b.x + b.width, b.y + b.height] };
    for (const [k, [x, y]] of Object.entries(pts)) if (Math.abs(p.x - x) <= tol && Math.abs(p.y - y) <= tol) return k;
    return null;
  },
  startTransform(s, handle, p) {
    const L = s.doc.active;
    if (L.locked) return s.toast('That layer is locked.');
    const b = s.doc.bounds(L), surf = s.doc.surface(L);
    this.xf = { L, handle, b, surf, start: p };
  },
  dragTransform(s, p, e) {
    const { L, handle, b, surf } = this.xf;
    const ax = handle.includes('w') ? b.x + b.width : b.x, ay = handle.includes('n') ? b.y + b.height : b.y;
    let w = Math.max(4, Math.abs(p.x - ax)), h = Math.max(4, Math.abs(p.y - ay));
    if (!e.shiftKey) { const k = Math.max(w / b.width, h / b.height); w = b.width * k; h = b.height * k; }
    const x = handle.includes('w') ? ax - w : ax, y = handle.includes('n') ? ay - h : ay;
    this.xf.rect = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
    L._xf = { x: this.xf.rect.x, y: this.xf.rect.y, w: this.xf.rect.w, h: this.xf.rect.h, sx: b.x - surf.x, sy: b.y - surf.y, sw: b.width, sh: b.height };
    s.changed();
  },
  endTransform(s) {
    const { L, b, rect } = this.xf;
    this.xf = null;
    delete L._xf;
    if (!rect) return;
    const k = rect.h / b.height, kx = rect.w / b.width;
    if (L.kind === 'text') {
      L.text = { ...L.text, size: Math.max(4, Math.round(L.text.size * k)) };
      const nb = s.doc.bounds(L);
      L.x += rect.x - nb.x; L.y += rect.y - nb.y;
    } else if (L.kind === 'shape') {
      L.shape = { ...L.shape, w: Math.round(L.shape.w * kx), h: Math.round(L.shape.h * k) };
      const nb = s.doc.bounds(L);
      L.x += rect.x - nb.x; L.y += rect.y - nb.y;
    } else {
      const src = L.canvas, sx = b.x - L.x, sy = b.y - L.y;
      const c = makeCanvas(rect.w, rect.h), ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(src, sx, sy, b.width, b.height, 0, 0, rect.w, rect.h);
      L.canvas = c; L.x = rect.x; L.y = rect.y;
      if (kx > 1.05 || k > 1.05) s.toast('Scaled up: the computer had to invent the new pixels, so look for softness. Shrinking is safer than enlarging.');
    }
    s.commit('Free Transform', { event: 'transform' });
  },
  onKey(s, e) {
    const L = s.doc.active;
    const step = e.shiftKey ? 10 : 1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d || !L || L.locked || L.kind === 'adjust') return false;
    L.x += d[0]; L.y += d[1];
    if (L.mask) { L.mask.x += d[0]; L.mask.y += d[1]; }
    s.commit('Nudge');
    return true;
  },
  overlay(s, ctx) {
    const L = s.doc.active;
    if (!L || L.kind === 'adjust') return;
    const b = this.xf?.rect ? { x: this.xf.rect.x, y: this.xf.rect.y, width: this.xf.rect.w, height: this.xf.rect.h } : s.doc.bounds(L);
    if (!b) return;
    const v = s.view;
    const [x, y] = s.toScreen(b.x, b.y);
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1; ctx.setLineDash(s.opts.showTransform ? [] : [4, 3]);
    ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, b.width * v.zoom, b.height * v.zoom);
    ctx.setLineDash([]);
    if (s.opts.showTransform) {
      ctx.fillStyle = '#fff';
      for (const [hx, hy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        ctx.fillRect(x + hx * b.width * v.zoom - 4, y + hy * b.height * v.zoom - 4, 8, 8);
        ctx.strokeRect(x + hx * b.width * v.zoom - 4 + 0.5, y + hy * b.height * v.zoom - 4 + 0.5, 8, 8);
      }
    }
  },
});

function marquee(id, label, ellipse) {
  tool(id, {
    label, key: 'M', group: 'marquee', cursor: 'crosshair',
    tip: `Drag to select. Shift adds to the selection, Alt subtracts. Shift while dragging (new selection) makes a ${ellipse ? 'circle' : 'square'}.`,
    options: ['selMode', 'feather'],
    down(s, p, e) { this.a = p; this.b = p; this.mode = selMode(s, e); },
    move(s, p, e) { if (!this.a) return; this.b = p; this.square = e.shiftKey && this.mode === 'new'; s.redraw(); },
    up(s) {
      const r = rectFrom(this.a, this.b, this.square);
      this.a = null;
      if (r.w < 2 || r.h < 2) { if (this.mode === 'new') s.deselect(); return; }
      const c = makeCanvas(s.doc.width, s.doc.height), ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      if (ellipse) { ctx.beginPath(); ctx.ellipse(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, r.h / 2, 0, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h));
      s.setSelection(c, this.mode, label);
    },
    overlay(s, ctx) {
      if (!this.a) return;
      const r = rectFrom(this.a, this.b, this.square);
      const [x, y] = s.toScreen(r.x, r.y), z = s.view.zoom;
      ctx.strokeStyle = '#fff'; ctx.setLineDash([4, 4]); ctx.beginPath();
      if (ellipse) ctx.ellipse(x + r.w * z / 2, y + r.h * z / 2, r.w * z / 2, r.h * z / 2, 0, 0, Math.PI * 2); else ctx.rect(x, y, r.w * z, r.h * z);
      ctx.stroke(); ctx.strokeStyle = '#000'; ctx.lineDashOffset = 4; ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
    },
  });
}
marquee('marquee', 'Rectangular Marquee', false);
marquee('ellipse', 'Elliptical Marquee', true);

tool('lasso', {
  label: 'Lasso', key: 'L', group: 'lasso', cursor: 'crosshair',
  tip: 'Draw around something freehand. Let go to close the loop. Shift adds, Alt subtracts.',
  options: ['selMode', 'feather'],
  down(s, p, e) { this.pts = [p]; this.mode = selMode(s, e); },
  move(s, p) { if (!this.pts) return; if (dist(p, this.pts[this.pts.length - 1]) * s.view.zoom > 2) { this.pts.push(p); s.redraw(); } },
  up(s) {
    const pts = this.pts; this.pts = null;
    if (!pts || pts.length < 3) { if (this.mode === 'new') s.deselect(); return; }
    const c = makeCanvas(s.doc.width, s.doc.height), ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath(); ctx.fill();
    s.setSelection(c, this.mode, 'Lasso');
  },
  overlay(s, ctx) {
    if (!this.pts) return;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath();
    this.pts.forEach((q, i) => { const [x, y] = s.toScreen(q.x, q.y); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
  },
});

tool('wand', {
  label: 'Magic Wand', key: 'W', group: 'wand', cursor: 'crosshair', smart: true,
  tip: 'Click a color. Every pixel within Tolerance of it is selected. Contiguous keeps the selection to touching pixels. Shift adds, Alt subtracts.',
  options: ['selMode', 'tolerance', 'contiguous', 'sampleAll'],
  down(s, p, e) {
    const img = s.sampleImage();
    if (!img) return;
    const m = magicWand(img, Math.floor(p.x), Math.floor(p.y), s.opts.tolerance, s.opts.contiguous);
    s.setSelection(canvasFromAlpha(m, s.doc.width, s.doc.height), selMode(s, e), 'Magic Wand', { smart: 'wand' });
  },
});

tool('crop', {
  label: 'Crop', key: 'C', group: 'crop', cursor: 'crosshair',
  tip: 'Drag the area to keep, then press Enter (or Apply). Esc cancels. Layer pixels outside are kept, just off-canvas, so you can move them back.',
  options: ['cropApply'],
  down(s, p) { this.a = p; this.b = p; this.rect = null; },
  move(s, p, e) { if (!this.a) return; this.b = p; this.rect = rectFrom(this.a, this.b, e.shiftKey); s.redraw(); },
  up() { this.a = null; },
  apply(s) {
    const r = this.rect;
    if (!r || r.w < 4 || r.h < 4) return s.toast('Drag a crop box first.');
    s.cropTo(Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h));
    this.rect = null;
  },
  onKey(s, e) {
    if (e.key === 'Enter') { this.apply(s); return true; }
    if (e.key === 'Escape') { this.rect = null; s.redraw(); return true; }
    return false;
  },
  overlay(s, ctx) {
    const r = this.rect;
    if (!r) return;
    const [x, y] = s.toScreen(r.x, r.y), z = s.view.zoom;
    const [dx, dy] = s.toScreen(0, 0);
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.beginPath(); ctx.rect(dx, dy, s.doc.width * z, s.doc.height * z); ctx.rect(x, y, r.w * z, r.h * z); ctx.fill('evenodd');
    ctx.strokeStyle = '#fff'; ctx.strokeRect(x, y, r.w * z, r.h * z);
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.beginPath();
    for (const k of [1 / 3, 2 / 3]) { ctx.moveTo(x + r.w * z * k, y); ctx.lineTo(x + r.w * z * k, y + r.h * z); ctx.moveTo(x, y + r.h * z * k); ctx.lineTo(x + r.w * z, y + r.h * z * k); }
    ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '12px system-ui'; ctx.fillText(`${Math.round(r.w)} × ${Math.round(r.h)} px`, x + 4, y - 6);
  },
});

tool('eyedropper', {
  label: 'Eyedropper', key: 'I', group: 'eyedropper', cursor: 'crosshair',
  tip: 'Click to pick a color from the image as your foreground. Alt-click sets the background color.',
  options: ['sampleAll'],
  down(s, p, e) { this.pick(s, p, e); this.on = true; },
  move(s, p, e) { if (this.on) this.pick(s, p, e); },
  up() { this.on = false; },
  pick(s, p, e) {
    const c = s.colorAt(p.x, p.y, s.opts.sampleAll);
    if (!c || c[3] === 0) return;
    const hex = '#' + c.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');
    s.setColor(e.altKey ? 'bg' : 'fg', hex);
  },
});

tool('heal', {
  label: 'Spot Healing Brush', key: 'J', group: 'heal', cursor: 'none', smart: true, brush: true,
  tip: 'Paint over a spot, speck or small object. When you let go, the hole is filled from the pixels around it (content-aware).',
  options: ['size'],
  down(s, p) {
    const t = s.paintTarget({ pixelsOnly: true });
    if (!t) return;
    this.pts = [p];
    s.redraw();
  },
  move(s, p) { if (this.pts) { this.pts.push(p); s.redraw(); } },
  up(s) {
    const pts = this.pts; this.pts = null;
    if (!pts) return;
    const t = s.paintTarget({ pixelsOnly: true });
    if (!t) return;
    const canvas = t.writable();
    const m = makeCanvas(canvas.width, canvas.height), mc = m.getContext('2d');
    mc.strokeStyle = mc.fillStyle = '#fff'; mc.lineCap = mc.lineJoin = 'round'; mc.lineWidth = s.opts.size * 1.15;
    mc.beginPath(); pts.forEach((q, i) => (i ? mc.lineTo(q.x - t.ox, q.y - t.oy) : mc.moveTo(q.x - t.ox, q.y - t.oy)));
    if (pts.length === 1) { mc.arc(pts[0].x - t.ox, pts[0].y - t.oy, s.opts.size * 0.575, 0, Math.PI * 2); mc.fill(); } else mc.stroke();
    const img = getPixels(canvas);
    contentAwareFill(img, alphaOf(m), { seed: pts.length * 7919 });
    canvas.getContext('2d').putImageData(img, 0, 0);
    s.commit('Spot Healing Brush', { event: 'heal' });
  },
  overlay(s, ctx) {
    if (!this.pts) return;
    ctx.strokeStyle = 'rgba(244,63,94,.55)'; ctx.lineCap = ctx.lineJoin = 'round'; ctx.lineWidth = s.opts.size * 1.15 * s.view.zoom;
    ctx.beginPath(); this.pts.forEach((q, i) => { const [x, y] = s.toScreen(q.x, q.y); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    if (this.pts.length === 1) ctx.lineTo(...s.toScreen(this.pts[0].x + 0.01, this.pts[0].y));
    ctx.stroke();
  },
});

tool('clone', {
  label: 'Clone Stamp', key: 'S', group: 'clone', cursor: 'none', brush: true,
  tip: 'Alt-click (Option-click) to set the source. Then paint: pixels are copied from the source, which follows your brush.',
  options: ['size', 'hardness', 'opacity'],
  down(s, p, e) {
    if (e.altKey) { this.source = p; this.offset = null; s.toast('Clone source set. Now paint somewhere else.'); s.redraw(); return; }
    if (!this.source) return s.toast('Alt-click (Option-click) first to choose where to copy from.');
    const t = s.paintTarget({ pixelsOnly: true });
    if (!t) return;
    if (!this.offset) this.offset = { x: this.source.x - p.x, y: this.source.y - p.y };
    this.t = t; this.base = cloneCanvas(t.canvas); this.canvas = t.writable(); this.last = null;
    this.dab = dab(s.opts.size, s.opts.hardness, '#000000');
    this.stamp(s, p);
  },
  move(s, p) { this.hover = p; if (this.t) this.stamp(s, p); else s.redraw(); },
  up(s) { if (this.t) { this.t = null; s.commit('Clone Stamp', { event: 'clone' }); } },
  stamp(s, p) {
    const pts = [];
    if (!this.last) pts.push(p);
    else { const d = dist(this.last, p), step = Math.max(1, s.opts.size * 0.15); for (let k = step; k <= d; k += step) pts.push({ x: this.last.x + (p.x - this.last.x) * k / d, y: this.last.y + (p.y - this.last.y) * k / d }); }
    if (!pts.length) return;
    this.last = pts[pts.length - 1];
    const size = this.dab.width, r = size / 2;
    const tmp = makeCanvas(size, size), tc = tmp.getContext('2d');
    const ctx = this.canvas.getContext('2d');
    for (const q of pts) {
      const lx = q.x - this.t.ox, ly = q.y - this.t.oy;
      tc.globalCompositeOperation = 'copy';
      tc.drawImage(this.base, -(lx + this.offset.x - r), -(ly + this.offset.y - r));
      tc.globalCompositeOperation = 'destination-in';
      tc.drawImage(this.dab, 0, 0);
      ctx.globalAlpha = s.opts.opacity;
      ctx.drawImage(tmp, lx - r, ly - r);
      ctx.globalAlpha = 1;
    }
    s.changed();
  },
  overlay(s, ctx) {
    const at = this.t && this.last ? { x: this.last.x + this.offset.x, y: this.last.y + this.offset.y } : this.source;
    if (!at) return;
    const [x, y] = s.toScreen(at.x, at.y);
    ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y); ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7); ctx.stroke();
    ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, s.opts.size * s.view.zoom / 2, 0, Math.PI * 2); ctx.stroke();
  },
});

function brushTool(id, label, key, erase) {
  tool(id, {
    label, key, group: id === 'pencil' ? 'brush' : id, cursor: 'none', brush: true,
    tip: erase
      ? 'Erases pixels for good (only Undo brings them back). To hide pixels and keep them, paint black on a layer mask instead.'
      : 'Paint with the foreground color. Shift-click draws a straight line from the last point. On a mask, black hides and white shows. [ and ] change size.',
    options: ['size', 'hardness', 'opacity'],
    down(s, p, e) {
      const color = s.colors.fg;
      this.stroke = new Stroke(s, { erase, color, opacity: s.opts.opacity, size: s.opts.size, hardness: s.opts.hardness });
      if (this.stroke.dead) { this.stroke = null; return; }
      if (e.shiftKey && this.lastPoint) this.stroke.to(this.lastPoint);
      this.stroke.to(p);
    },
    move(s, p) { if (this.stroke) this.stroke.to(p); else s.redraw(); },
    up(s) {
      if (!this.stroke) return;
      const st = this.stroke; this.stroke = null;
      this.lastPoint = st.last && { x: st.last.x + st.ox, y: st.last.y + st.oy };
      const onMask = st.t.kind === 'mask';
      s.commit(onMask ? `${label} (mask)` : label, { event: onMask ? (st.mode === 'destination-out' ? 'mask-hide' : 'mask-show') : erase ? 'erase' : 'paint' });
    },
  });
}
brushTool('brush', 'Brush', 'B', false);
brushTool('eraser', 'Eraser', 'E', true);

tool('bucket', {
  label: 'Paint Bucket', key: 'G', group: 'fill', cursor: 'crosshair',
  tip: 'Fills the clicked color region (within Tolerance) with the foreground color. Inside a selection it stays inside.',
  options: ['tolerance', 'contiguous', 'sampleAll', 'opacity'],
  down(s, p) {
    const t = s.paintTarget({ pixelsOnly: true });
    if (!t) return;
    const img = s.opts.sampleAll ? s.sampleImage() : null;
    let m;
    if (img) m = magicWand(img, Math.floor(p.x), Math.floor(p.y), s.opts.tolerance, s.opts.contiguous);
    const canvas = t.writable();
    const W = canvas.width, H = canvas.height;
    let maskCanvas;
    if (m) {
      maskCanvas = makeCanvas(W, H);
      maskCanvas.getContext('2d').drawImage(canvasFromAlpha(m, s.doc.width, s.doc.height), -t.ox, -t.oy);
    } else {
      const local = magicWand(getPixels(canvas), Math.floor(p.x - t.ox), Math.floor(p.y - t.oy), s.opts.tolerance, s.opts.contiguous);
      maskCanvas = canvasFromAlpha(local, W, H);
    }
    const fill = makeCanvas(W, H), fc = fill.getContext('2d');
    fc.fillStyle = s.colors.fg; fc.fillRect(0, 0, W, H);
    fc.globalCompositeOperation = 'destination-in'; fc.drawImage(maskCanvas, 0, 0);
    const clip = s.selectionCanvasFor(W, H, t.ox, t.oy);
    if (clip) fc.drawImage(clip, 0, 0);
    const ctx = canvas.getContext('2d');
    ctx.globalAlpha = s.opts.opacity; ctx.drawImage(fill, 0, 0); ctx.globalAlpha = 1;
    s.commit('Paint Bucket', { event: 'paint' });
  },
});

tool('gradient', {
  label: 'Gradient', key: 'G', group: 'fill', cursor: 'crosshair',
  tip: 'Drag to draw a gradient from the foreground to the background color. On a mask, a black-to-white gradient fades the layer out smoothly.',
  options: ['gradientType', 'gradientToClear', 'opacity'],
  down(s, p) {
    this.t = s.paintTarget();
    if (!this.t) return;
    this.a = p; this.b = p;
  },
  move(s, p, e) {
    if (!this.a) return;
    this.b = p;
    if (e.shiftKey) { const a = Math.round(Math.atan2(p.y - this.a.y, p.x - this.a.x) / (Math.PI / 4)) * Math.PI / 4, d = dist(this.a, p); this.b = { x: this.a.x + Math.cos(a) * d, y: this.a.y + Math.sin(a) * d }; }
    s.redraw();
  },
  up(s) {
    const { a, b, t } = this;
    this.a = null;
    if (!t || !a || dist(a, b) < 2) return;
    const canvas = t.writable();
    const W = canvas.width, H = canvas.height;
    const g = makeCanvas(W, H), gc = g.getContext('2d');
    const ax = a.x - t.ox, ay = a.y - t.oy, bx = b.x - t.ox, by = b.y - t.oy;
    const grad = s.opts.gradientType === 'radial' ? gc.createRadialGradient(ax, ay, 0, ax, ay, Math.hypot(bx - ax, by - ay)) : gc.createLinearGradient(ax, ay, bx, by);
    if (t.kind === 'mask') {
      const a0 = lum(s.colors.fg) / 255, a1 = lum(s.colors.bg) / 255;
      grad.addColorStop(0, `rgba(255,255,255,${a0})`); grad.addColorStop(1, `rgba(255,255,255,${a1})`);
    } else {
      grad.addColorStop(0, s.colors.fg);
      grad.addColorStop(1, s.opts.gradientToClear ? s.colors.fg + '00' : s.colors.bg);
    }
    gc.fillStyle = grad; gc.fillRect(0, 0, W, H);
    const clip = s.selectionCanvasFor(W, H, t.ox, t.oy);
    const ctx = canvas.getContext('2d');
    if (t.kind === 'mask') {
      if (clip) { gc.globalCompositeOperation = 'destination-in'; gc.drawImage(clip, 0, 0); ctx.globalCompositeOperation = 'destination-out'; ctx.drawImage(clip, 0, 0); ctx.globalCompositeOperation = 'source-over'; }
      else ctx.clearRect(0, 0, W, H);
      ctx.drawImage(g, 0, 0);
    } else {
      if (clip) { gc.globalCompositeOperation = 'destination-in'; gc.drawImage(clip, 0, 0); }
      ctx.globalAlpha = s.opts.opacity; ctx.drawImage(g, 0, 0); ctx.globalAlpha = 1;
    }
    s.commit('Gradient', { event: t.kind === 'mask' ? 'mask-hide' : 'paint' });
  },
  overlay(s, ctx) {
    if (!this.a) return;
    const [x0, y0] = s.toScreen(this.a.x, this.a.y), [x1, y1] = s.toScreen(this.b.x, this.b.y);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.fillStyle = s.colors.fg; ctx.beginPath(); ctx.arc(x0, y0, 5, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = s.colors.bg; ctx.beginPath(); ctx.arc(x1, y1, 5, 0, 7); ctx.fill(); ctx.stroke();
  },
});

tool('type', {
  label: 'Type', key: 'T', group: 'type', cursor: 'text',
  tip: 'Click to add live text, then type in the Properties panel. Click existing text to edit it. Text stays editable until you rasterize it.',
  options: ['font', 'fontSize'],
  down(s, p) {
    const hit = [...s.doc.layers].reverse().find((L) => L.kind === 'text' && L.visible && (() => { const b = s.doc.bounds(L); return b && p.x >= b.x && p.y >= b.y && p.x <= b.x + b.width && p.y <= b.y + b.height; })());
    if (hit) { s.doc.activeId = hit.id; s.refreshPanels(); s.focusTextEditor(); return; }
    const L = newLayer('text', {
      name: 'Text', x: Math.round(p.x), y: Math.round(p.y - s.opts.fontSize * 0.6),
      text: { content: 'Your text', font: s.opts.font, size: s.opts.fontSize, color: s.colors.fg, bold: true, italic: false, align: 'left', lineHeight: 1.15, tracking: 0 },
    });
    s.doc.add(L);
    s.commit('Type Layer', { event: 'text' });
    s.focusTextEditor(true);
  },
});

tool('shape', {
  label: 'Shape', key: 'U', group: 'shape', cursor: 'crosshair',
  tip: 'Drag to draw a live shape layer filled with the foreground color. Shift makes squares and circles. Edit size, corners and stroke in Properties.',
  options: ['shapeType', 'radius', 'strokeWidth'],
  down(s, p) { this.a = p; this.b = p; },
  move(s, p, e) { if (!this.a) return; this.b = p; this.sq = e.shiftKey; s.redraw(); },
  up(s) {
    if (!this.a) return;
    const r = rectFrom(this.a, this.b, this.sq);
    this.a = null;
    if (r.w < 3 || r.h < 3) return s.redraw();
    const type = s.opts.shapeType;
    const L = newLayer('shape', {
      name: type === 'ellipse' ? 'Ellipse' : 'Rectangle', x: Math.round(r.x), y: Math.round(r.y),
      shape: { type, w: Math.round(r.w), h: Math.round(r.h), radius: type === 'rect' ? s.opts.radius : 0, fill: s.colors.fg, stroke: s.colors.bg, strokeWidth: s.opts.strokeWidth },
    });
    s.doc.add(L);
    s.commit('Shape Layer', { event: 'shape' });
  },
  overlay(s, ctx) {
    if (!this.a) return;
    const r = rectFrom(this.a, this.b, this.sq);
    const [x, y] = s.toScreen(r.x, r.y), z = s.view.zoom;
    ctx.fillStyle = s.colors.fg; ctx.globalAlpha = 0.6; ctx.beginPath();
    if (s.opts.shapeType === 'ellipse') ctx.ellipse(x + r.w * z / 2, y + r.h * z / 2, r.w * z / 2, r.h * z / 2, 0, 0, 7); else ctx.rect(x, y, r.w * z, r.h * z);
    ctx.fill(); ctx.globalAlpha = 1;
  },
});

tool('hand', {
  label: 'Hand', key: 'H', group: 'view', cursor: 'grab',
  tip: 'Drag to scroll around. Hold the space bar to use the Hand from any tool.',
  down(s, p, e) { this.start = { x: e.clientX, y: e.clientY, px: s.view.panX, py: s.view.panY }; },
  move(s, p, e) { if (!this.start) return; s.view.panX = this.start.px + e.clientX - this.start.x; s.view.panY = this.start.py + e.clientY - this.start.y; s.redraw(); },
  up() { this.start = null; },
});

tool('zoom', {
  label: 'Zoom', key: 'Z', group: 'view', cursor: 'zoom-in',
  tip: 'Click to zoom in, Alt-click to zoom out. Zoom past 800% to see the pixel grid: every photo is a grid of colored squares.',
  down(s, p, e) { s.zoomAt(e.altKey ? 1 / 1.6 : 1.6, e.clientX, e.clientY); },
});

/** Toolbox layout: groups in order; the first tool in each group is shown first. */
export const TOOLBOX = [
  ['move'], ['marquee', 'ellipse'], ['lasso'], ['wand'], ['crop'], ['eyedropper'],
  ['heal', 'clone'], ['brush'], ['eraser'], ['bucket', 'gradient'], ['type'], ['shape'], ['hand'], ['zoom'],
];
