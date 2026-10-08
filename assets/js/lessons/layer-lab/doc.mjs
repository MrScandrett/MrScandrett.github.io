/* doc.mjs — Layer Lab's document model.
 *
 * A document is a stack of layers (bottom → top) composited onto one canvas:
 *   pixel   — a canvas of pixels, placed at (x, y)
 *   text    — live, editable type, drawn fresh every time
 *   shape   — a live rectangle / ellipse
 *   adjust  — no pixels: changes the look of everything below it
 * Any layer can carry a mask (alpha: opaque = show, clear = hide) and layer
 * effects (drop shadow, stroke, outer glow), both applied non-destructively.
 *
 * Undo is copy-on-write: every history step keeps references to the canvases
 * that existed at that moment, and those canvases are frozen. Code that wants
 * to change pixels asks for `writable()` first, which swaps in a private copy
 * if the current canvas is frozen. Steps that touch one layer cost one layer.
 */
import { applyAdjustment, alphaBounds, ADJUSTMENTS } from './pixels.mjs';

export const BLEND_MODES = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn',
  'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];
export const BLEND_LABELS = {
  normal: 'Normal', multiply: 'Multiply', screen: 'Screen', overlay: 'Overlay', darken: 'Darken', lighten: 'Lighten',
  'color-dodge': 'Color Dodge', 'color-burn': 'Color Burn', 'hard-light': 'Hard Light', 'soft-light': 'Soft Light',
  difference: 'Difference', exclusion: 'Exclusion', hue: 'Hue', saturation: 'Saturation', color: 'Color', luminosity: 'Luminosity',
};
export const FONTS = [
  ['Inter, "Segoe UI", system-ui, sans-serif', 'Sans (Inter)'],
  ['Georgia, "Times New Roman", serif', 'Serif (Georgia)'],
  ['Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif', 'Display (Impact)'],
  ['"Trebuchet MS", "Lucida Grande", sans-serif', 'Humanist (Trebuchet)'],
  ['"Courier New", ui-monospace, monospace', 'Mono (Courier)'],
  ['"Brush Script MT", "Segoe Script", cursive', 'Script'],
];

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}
export function cloneCanvas(src) {
  const c = makeCanvas(src.width, src.height);
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}
export function getPixels(canvas, x = 0, y = 0, w = canvas.width, h = canvas.height) {
  return canvas.getContext('2d', { willReadFrequently: true }).getImageData(x, y, w, h);
}
/** Alpha channel of a mask/selection canvas as a Uint8Array. */
export function alphaOf(canvas) {
  const d = getPixels(canvas).data, out = new Uint8Array(canvas.width * canvas.height);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4 + 3];
  return out;
}
/** Build a white canvas whose alpha is `alpha` (a mask or selection). */
export function canvasFromAlpha(alpha, w, h) {
  const c = makeCanvas(w, h), ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < alpha.length; i++) { const j = i * 4; img.data[j] = img.data[j + 1] = img.data[j + 2] = 255; img.data[j + 3] = alpha[i]; }
  ctx.putImageData(img, 0, 0);
  return c;
}

const frozen = new WeakSet();
let nextLayerId = 1;
let nextDocId = 1;

export function defaultFx() {
  return {
    shadow: { on: false, color: '#000000', opacity: 0.55, dx: 8, dy: 10, blur: 14 },
    stroke: { on: false, color: '#ffffff', width: 6 },
    glow: { on: false, color: '#ffd166', opacity: 0.8, blur: 24 },
  };
}
const hasFx = (L) => L.fx && (L.fx.shadow.on || L.fx.stroke.on || L.fx.glow.on);

export function newLayer(kind, props = {}) {
  const L = {
    id: nextLayerId++, kind, name: props.name || 'Layer', visible: true, locked: false, opacity: 1, blend: 'normal',
    x: 0, y: 0, canvas: null, mask: null, editMask: false, text: null, shape: null, adjust: null, fx: defaultFx(),
    ...props,
  };
  if (props.fx) L.fx = { ...defaultFx(), ...props.fx };
  return L;
}

function copyLayer(L) {
  return {
    ...L,
    mask: L.mask && { ...L.mask },
    text: L.text && { ...L.text },
    shape: L.shape && { ...L.shape },
    adjust: L.adjust && { ...L.adjust, params: { ...L.adjust.params } },
    fx: L.fx && { shadow: { ...L.fx.shadow }, stroke: { ...L.fx.stroke }, glow: { ...L.fx.glow } },
  };
}

export class LayerDoc {
  constructor(width, height, name = 'Untitled') {
    this.id = nextDocId++;
    this.width = width; this.height = height; this.name = name;
    this.layers = [];
    this.activeId = null;
    this.selection = null; // canvas, alpha = selected
    this.composite = makeCanvas(width, height);
    this.history = [];
    this.historyIndex = -1;
    this.dirty = false;
    this.view = null;
    this._surfaceCache = new WeakMap();
    this._maskCache = new WeakMap();
  }

  get active() { return this.layers.find((l) => l.id === this.activeId) || null; }
  indexOf(L) { return this.layers.indexOf(L); }

  add(L, index = null) {
    const at = index ?? (this.active ? this.indexOf(this.active) + 1 : this.layers.length);
    this.layers.splice(at, 0, L);
    this.activeId = L.id;
    return L;
  }

  addPixelLayer(name, canvas = null, at = null) {
    const L = newLayer('pixel', { name, canvas: canvas || makeCanvas(this.width, this.height) });
    return this.add(L, at);
  }

  /* ── copy-on-write helpers ─────────────────────────────────────────── */

  /** Make the layer's pixels (or mask) safe to draw on; returns the canvas. */
  writable(L, target = 'pixels') {
    if (target === 'mask') {
      if (frozen.has(L.mask.canvas)) L.mask = { ...L.mask, canvas: cloneCanvas(L.mask.canvas) };
      return L.mask.canvas;
    }
    if (frozen.has(L.canvas)) L.canvas = cloneCanvas(L.canvas);
    return L.canvas;
  }

  writableSelection() {
    if (!this.selection) this.selection = makeCanvas(this.width, this.height);
    else if (frozen.has(this.selection)) this.selection = cloneCanvas(this.selection);
    return this.selection;
  }

  /** Grow a pixel layer's canvas so it covers the whole document (painting after a move). */
  coverDocument(L) {
    const c = L.canvas;
    const x0 = Math.min(L.x, 0), y0 = Math.min(L.y, 0);
    const x1 = Math.max(L.x + c.width, this.width), y1 = Math.max(L.y + c.height, this.height);
    if (x0 === L.x && y0 === L.y && x1 - x0 === c.width && y1 - y0 === c.height) return this.writable(L);
    const next = makeCanvas(x1 - x0, y1 - y0);
    next.getContext('2d').drawImage(c, L.x - x0, L.y - y0);
    L.canvas = next; L.x = x0; L.y = y0;
    return next;
  }

  /* ── history ───────────────────────────────────────────────────────── */

  snapshot(label) {
    const layers = this.layers.map(copyLayer);
    for (const L of layers) {
      if (L.canvas) frozen.add(L.canvas);
      if (L.mask) frozen.add(L.mask.canvas);
    }
    if (this.selection) frozen.add(this.selection);
    return { label, layers, activeId: this.activeId, selection: this.selection, width: this.width, height: this.height };
  }

  commit(label) {
    this.history.length = this.historyIndex + 1;
    this.history.push(this.snapshot(label));
    if (this.history.length > 40) this.history.shift();
    this.historyIndex = this.history.length - 1;
    this.dirty = true;
  }

  restore(index) {
    const s = this.history[index];
    if (!s) return;
    this.historyIndex = index;
    this.layers = s.layers.map(copyLayer);
    this.activeId = s.activeId;
    this.selection = s.selection;
    if (s.width !== this.width || s.height !== this.height) {
      this.width = s.width; this.height = s.height;
      this.composite = makeCanvas(this.width, this.height);
    }
  }

  canUndo() { return this.historyIndex > 0; }
  canRedo() { return this.historyIndex < this.history.length - 1; }
  undo() { if (this.canUndo()) this.restore(this.historyIndex - 1); }
  redo() { if (this.canRedo()) this.restore(this.historyIndex + 1); }

  /* ── surfaces ──────────────────────────────────────────────────────── */

  /** What a layer contributes before mask/effects: { canvas, x, y } or null. */
  surface(L) {
    if (L.kind === 'pixel') return { canvas: L.canvas, x: L.x, y: L.y };
    if (L.kind === 'text') return this._cached(L, JSON.stringify(L.text), () => renderText(L.text));
    if (L.kind === 'shape') return this._cached(L, JSON.stringify(L.shape), () => renderShape(L.shape));
    return null;
  }

  _cached(L, key, make) {
    let hit = this._surfaceCache.get(L.text || L.shape);
    if (!hit || hit.key !== key) { hit = { key, ...make() }; this._surfaceCache.set(L.text || L.shape, hit); }
    return { canvas: hit.canvas, x: L.x + hit.ox, y: L.y + hit.oy };
  }

  /** Layer after mask + effects, ready to composite: { canvas, x, y } */
  finished(L, { skipFx = false } = {}) {
    let s = this.surface(L);
    if (!s) return null;
    if (L._xf) s = scaledSurface(s, L._xf);
    if (L.mask && L.mask.enabled !== false) s = applyMask(s, L.mask);
    if (!skipFx && hasFx(L)) s = applyFx(s, L.fx);
    return s;
  }

  maskAlpha(L) {
    if (!L.mask || L.mask.enabled === false) return null;
    const hit = this._maskCache.get(L.mask.canvas);
    if (hit && hit.x === L.mask.x && hit.y === L.mask.y && hit.w === this.width && hit.h === this.height) return hit.alpha;
    const c = makeCanvas(this.width, this.height), ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, this.width, this.height);
    ctx.clearRect(L.mask.x, L.mask.y, L.mask.canvas.width, L.mask.canvas.height);
    ctx.drawImage(L.mask.canvas, L.mask.x, L.mask.y);
    const alpha = alphaOf(c);
    if (frozen.has(L.mask.canvas)) this._maskCache.set(L.mask.canvas, { x: L.mask.x, y: L.mask.y, w: this.width, h: this.height, alpha });
    return alpha;
  }

  /* ── compositing ───────────────────────────────────────────────────── */

  /** Draw layers [0, upTo) into `target` (defaults to this.composite). */
  render(target = this.composite, upTo = this.layers.length) {
    const ctx = target.getContext('2d', { willReadFrequently: true });
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, target.width, target.height);
    for (let i = 0; i < upTo; i++) {
      const L = this.layers[i];
      if (!L.visible || L.opacity <= 0) continue;
      if (L.kind === 'adjust') {
        const img = ctx.getImageData(0, 0, this.width, this.height);
        let mask = this.maskAlpha(L);
        if (L.opacity < 1) {
          const m = new Uint8Array(this.width * this.height);
          for (let k = 0; k < m.length; k++) m[k] = (mask ? mask[k] : 255) * L.opacity;
          mask = m;
        }
        applyAdjustment(img, L.adjust.kind, L.adjust.params, mask);
        ctx.putImageData(img, 0, 0);
        continue;
      }
      const s = this.finished(L);
      if (!s) continue;
      ctx.globalAlpha = L.opacity;
      ctx.globalCompositeOperation = L.blend === 'normal' ? 'source-over' : L.blend;
      ctx.drawImage(s.canvas, s.x, s.y);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    return target;
  }

  /** Bounds of what a layer shows, in document pixels (null if empty). */
  bounds(L) {
    if (L.kind === 'adjust') return null;
    const s = this.surface(L);
    if (!s) return null;
    if (L.kind !== 'pixel') return { x: s.x, y: s.y, width: s.canvas.width, height: s.canvas.height };
    const b = alphaBounds(getPixels(s.canvas).data, s.canvas.width, s.canvas.height);
    return b && { x: b.x + s.x, y: b.y + s.y, width: b.width, height: b.height };
  }

  /** Is (x, y) a visible pixel of layer L? Used by the Move tool's auto-select. */
  hits(L, x, y) {
    if (!L.visible || L.kind === 'adjust') return false;
    const s = this.finished(L, { skipFx: true });
    if (!s) return false;
    const lx = Math.floor(x - s.x), ly = Math.floor(y - s.y);
    if (lx < 0 || ly < 0 || lx >= s.canvas.width || ly >= s.canvas.height) return false;
    return getPixels(s.canvas, lx, ly, 1, 1).data[3] > 20;
  }

  /** Turn a text/shape layer into pixels (it stops being editable). */
  rasterize(L) {
    const s = this.surface(L);
    const c = makeCanvas(this.width, this.height);
    if (s) c.getContext('2d').drawImage(s.canvas, s.x, s.y);
    L.kind = 'pixel'; L.canvas = c; L.x = 0; L.y = 0; L.text = null; L.shape = null;
  }

  /* ── project files (.layerlab) ─────────────────────────────────────── */

  toProject() {
    return {
      format: 'layerlab', version: 1, app: 'Layer Lab (ClassroomOS)', name: this.name,
      width: this.width, height: this.height, active: this.layers.findIndex((l) => l.id === this.activeId),
      layers: this.layers.map((L) => ({
        name: L.name, kind: L.kind, visible: L.visible, locked: L.locked, opacity: L.opacity, blend: L.blend, x: L.x, y: L.y,
        text: L.text, shape: L.shape, adjust: L.adjust, fx: L.fx,
        png: L.kind === 'pixel' ? L.canvas.toDataURL('image/png') : undefined,
        mask: L.mask ? { x: L.mask.x, y: L.mask.y, enabled: L.mask.enabled !== false, png: L.mask.canvas.toDataURL('image/png') } : undefined,
      })),
    };
  }

  static async fromProject(p) {
    if (p.format !== 'layerlab') throw new Error('This JSON file is not a Layer Lab project.');
    const doc = new LayerDoc(p.width, p.height, p.name || 'Project');
    for (const s of p.layers) {
      const L = newLayer(s.kind, {
        name: s.name, visible: s.visible !== false, locked: !!s.locked, opacity: s.opacity ?? 1, blend: BLEND_MODES.includes(s.blend) ? s.blend : 'normal',
        x: s.x || 0, y: s.y || 0, text: s.text || null, shape: s.shape || null, fx: s.fx || defaultFx(),
        adjust: s.adjust && ADJUSTMENTS[s.adjust.kind] ? s.adjust : null,
      });
      if (L.kind === 'adjust' && !L.adjust) continue;
      if (L.kind === 'pixel') L.canvas = await canvasFromURL(s.png, p.width, p.height);
      if (s.mask) L.mask = { x: s.mask.x || 0, y: s.mask.y || 0, enabled: s.mask.enabled !== false, canvas: await canvasFromURL(s.mask.png, p.width, p.height) };
      doc.layers.push(L);
    }
    const a = doc.layers[p.active] || doc.layers[doc.layers.length - 1];
    doc.activeId = a ? a.id : null;
    return doc;
  }

  /* ── interchange (PSD / ORA) ───────────────────────────────────────── */

  /**
   * Flatten what other apps can't read into plain pixel layers.
   * keepMasks: PSD can store masks; OpenRaster cannot.
   * Returns { layers (IO shape), composite, notes }.
   */
  toInterchange({ keepMasks }) {
    const notes = [];
    const W = this.width, H = this.height;
    const layers = [];
    const below = makeCanvas(W, H);
    this.layers.forEach((L, i) => {
      let io;
      if (L.kind === 'adjust') {
        this.render(below, i);
        const img = getPixels(below);
        const alpha = img.data.map((v, k) => (k % 4 === 3 ? v : 0));
        applyAdjustment(img, L.adjust.kind, L.adjust.params);
        const mask = this.maskAlpha(L);
        for (let k = 0; k < W * H; k++) img.data[k * 4 + 3] = mask ? (alpha[k * 4 + 3] * mask[k]) / 255 : alpha[k * 4 + 3];
        io = { name: `${L.name} (baked)`, left: 0, top: 0, width: W, height: H, rgba: img.data };
        notes.push(`Adjustment layer "${L.name}" was baked into pixels. It now freezes the look of the layers that were below it.`);
      } else {
        const fx = hasFx(L);
        const maskInline = !keepMasks || fx;
        let s = this.surface(L);
        if (!s) return;
        if (L.mask && L.mask.enabled !== false && maskInline) s = applyMask(s, L.mask);
        if (fx) s = applyFx(s, L.fx);
        const full = getPixels(s.canvas);
        const b = alphaBounds(full.data, s.canvas.width, s.canvas.height);
        const crop = b ? getPixels(s.canvas, b.x, b.y, b.width, b.height) : null;
        io = { name: L.name, left: b ? s.x + b.x : 0, top: b ? s.y + b.y : 0, width: b ? b.width : 0, height: b ? b.height : 0, rgba: crop ? crop.data : new Uint8ClampedArray(0) };
        if (L.kind === 'text') notes.push(`Text layer "${L.name}" became pixels; its words can't be edited in the other app.`);
        if (L.kind === 'shape') notes.push(`Shape layer "${L.name}" became pixels.`);
        if (fx) notes.push(`Layer effects on "${L.name}" were baked into its pixels.`);
        if (L.mask && L.mask.enabled !== false) {
          if (maskInline) { if (!fx) notes.push(`The mask on "${L.name}" was applied: hidden pixels are now transparent.`); }
          else {
            const a = this.maskAlpha(L);
            io.mask = { left: 0, top: 0, width: W, height: H, data: a, defaultColor: 255 };
          }
        }
      }
      io.opacity = L.opacity; io.visible = L.visible; io.blend = L.blend;
      layers.push(io);
    });
    const composite = getPixels(this.render(makeCanvas(W, H))).data;
    return { layers, composite, notes };
  }

  static fromInterchange(io, name) {
    const doc = new LayerDoc(io.width, io.height, name);
    const layers = io.layers.length ? io.layers : [{ name: 'Background', left: 0, top: 0, width: io.width, height: io.height, rgba: io.composite, opacity: 1, visible: true, blend: 'normal' }];
    for (const s of layers) {
      const c = makeCanvas(Math.max(1, s.width), Math.max(1, s.height));
      if (s.width > 0 && s.height > 0) c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(s.rgba), s.width, s.height), 0, 0);
      const L = newLayer('pixel', { name: s.name, canvas: c, x: s.left, y: s.top, opacity: s.opacity ?? 1, visible: s.visible !== false, blend: s.blend || 'normal' });
      if (s.mask && s.mask.width > 0) {
        const m = makeCanvas(io.width, io.height), ctx = m.getContext('2d');
        if (s.mask.defaultColor) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, io.width, io.height); }
        ctx.clearRect(s.mask.left, s.mask.top, s.mask.width, s.mask.height);
        ctx.drawImage(canvasFromAlpha(s.mask.data, s.mask.width, s.mask.height), s.mask.left, s.mask.top);
        L.mask = { x: 0, y: 0, canvas: m, enabled: !s.mask.disabled };
      }
      doc.layers.push(L);
    }
    doc.activeId = doc.layers[doc.layers.length - 1].id;
    return doc;
  }
}

async function canvasFromURL(url, w, h) {
  const c = makeCanvas(w, h);
  if (!url) return c;
  const img = new Image();
  img.src = url;
  await img.decode();
  const out = makeCanvas(img.naturalWidth || w, img.naturalHeight || h);
  out.getContext('2d').drawImage(img, 0, 0);
  return out;
}

/* ── live layer rendering ─────────────────────────────────────────────── */

export function renderText(t) {
  const lines = String(t.content ?? '').split('\n');
  const size = Math.max(4, t.size || 48);
  const font = `${t.italic ? 'italic ' : ''}${t.bold ? '800' : '400'} ${size}px ${t.font || FONTS[0][0]}`;
  const lh = size * (t.lineHeight || 1.15);
  const probe = makeCanvas(1, 1).getContext('2d');
  probe.font = font;
  const spacing = t.tracking || 0;
  const widthOf = (s) => probe.measureText(s).width + Math.max(0, s.length - 1) * spacing;
  const w = Math.ceil(Math.max(1, ...lines.map(widthOf)));
  const pad = Math.ceil(size * 0.25);
  const c = makeCanvas(w + pad * 2, Math.ceil(lh * lines.length) + pad * 2);
  const ctx = c.getContext('2d');
  ctx.font = font; ctx.fillStyle = t.color || '#000'; ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`;
  lines.forEach((line, i) => {
    const lw = widthOf(line);
    const x = pad + (t.align === 'center' ? (w - lw) / 2 : t.align === 'right' ? w - lw : 0);
    ctx.fillText(line, x, pad + lh * i + lh / 2);
  });
  return { canvas: c, ox: -pad, oy: -pad };
}

export function renderShape(s) {
  const sw = s.strokeWidth > 0 ? s.strokeWidth : 0;
  const w = Math.max(1, s.w), h = Math.max(1, s.h);
  const c = makeCanvas(w + sw * 2, h + sw * 2);
  const ctx = c.getContext('2d');
  ctx.beginPath();
  if (s.type === 'ellipse') ctx.ellipse(sw + w / 2, sw + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (ctx.roundRect && s.radius) ctx.roundRect(sw, sw, w, h, Math.min(s.radius, w / 2, h / 2));
  else ctx.rect(sw, sw, w, h);
  if (s.fill && s.fill !== 'none') { ctx.fillStyle = s.fill; ctx.fill(); }
  if (sw) { ctx.lineWidth = sw; ctx.strokeStyle = s.stroke || '#000'; ctx.stroke(); }
  return { canvas: c, ox: -sw, oy: -sw };
}

function scaledSurface(s, xf) {
  const c = makeCanvas(Math.max(1, Math.abs(xf.w)), Math.max(1, Math.abs(xf.h)));
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(s.canvas, xf.sx, xf.sy, xf.sw, xf.sh, 0, 0, c.width, c.height);
  return { canvas: c, x: xf.x, y: xf.y };
}

/** Mask (doc coordinates; outside the mask canvas counts as "show"). */
export function applyMask(s, mask) {
  const c = makeCanvas(s.canvas.width, s.canvas.height);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.clearRect(mask.x - s.x, mask.y - s.y, mask.canvas.width, mask.canvas.height);
  ctx.drawImage(mask.canvas, mask.x - s.x, mask.y - s.y);
  ctx.globalCompositeOperation = 'source-in';
  ctx.drawImage(s.canvas, 0, 0);
  return { canvas: c, x: s.x, y: s.y };
}

function silhouette(s, color) {
  const c = makeCanvas(s.canvas.width, s.canvas.height), ctx = c.getContext('2d');
  ctx.drawImage(s.canvas, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color; ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Layer effects, drawn behind the layer: outer glow, drop shadow, outside stroke. */
export function applyFx(s, fx) {
  const pad = Math.ceil(Math.max(
    fx.shadow.on ? fx.shadow.blur * 1.5 + Math.max(Math.abs(fx.shadow.dx), Math.abs(fx.shadow.dy)) : 0,
    fx.stroke.on ? fx.stroke.width + 1 : 0,
    fx.glow.on ? fx.glow.blur * 1.5 : 0,
  )) + 2;
  const c = makeCanvas(s.canvas.width + pad * 2, s.canvas.height + pad * 2);
  const ctx = c.getContext('2d');
  const FAR = 20000;
  const castShadow = (color, opacity, dx, dy, blurPx) => {
    const sil = silhouette(s, color);
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = blurPx; ctx.shadowOffsetX = FAR + dx; ctx.shadowOffsetY = dy;
    ctx.globalAlpha = opacity;
    ctx.drawImage(sil, pad - FAR, pad);
    ctx.restore();
  };
  if (fx.glow.on) { castShadow(fx.glow.color, fx.glow.opacity, 0, 0, fx.glow.blur); castShadow(fx.glow.color, fx.glow.opacity * 0.6, 0, 0, fx.glow.blur / 2); }
  if (fx.shadow.on) castShadow(fx.shadow.color, fx.shadow.opacity, fx.shadow.dx, fx.shadow.dy, fx.shadow.blur);
  if (fx.stroke.on && fx.stroke.width > 0) {
    const sil = silhouette(s, fx.stroke.color);
    const r = fx.stroke.width;
    const steps = Math.max(16, Math.ceil(r * 3));
    for (let ring = r; ring > 0; ring -= Math.max(1, r / 3)) {
      for (let k = 0; k < steps; k++) {
        const a = (k / steps) * Math.PI * 2;
        ctx.drawImage(sil, pad + Math.cos(a) * ring, pad + Math.sin(a) * ring);
      }
    }
  }
  ctx.drawImage(s.canvas, pad, pad);
  return { canvas: c, x: s.x - pad, y: s.y - pad };
}
