/* io.mjs — getting work in and out of Layer Lab.
 *
 * Opening sniffs the file's first bytes (not its name), the way real apps do:
 * 8BPS = Photoshop, PK + image/openraster = OpenRaster, { = a Layer Lab
 * project, anything else goes to the browser's own image decoder (PNG, JPEG,
 * GIF, WebP, BMP, SVG, AVIF).
 *
 * The Workshop Drive is an IndexedDB folder in this browser: exports land there
 * so students can reopen them and see what survived the trip. Nothing leaves
 * the device unless they press Download.
 */
import { LayerDoc, makeCanvas, getPixels } from './doc.mjs';
import { writePSD, readPSD } from './psd.mjs';
import { writeORA, readORA } from './ora.mjs';

export const FORMATS = {
  png: { label: 'PNG', ext: 'png', mime: 'image/png', layers: false, transparency: true, text: false, masks: false, adjust: false, lossy: false,
    use: 'Graphics, logos, screenshots, anything with sharp edges or see-through parts.', opens: 'Every app and browser' },
  jpeg: { label: 'JPEG', ext: 'jpg', mime: 'image/jpeg', layers: false, transparency: false, text: false, masks: false, adjust: false, lossy: true, quality: true,
    use: 'Photographs. Small files, but each save throws away detail, and see-through areas turn white.', opens: 'Every app and browser' },
  webp: { label: 'WebP', ext: 'webp', mime: 'image/webp', layers: false, transparency: true, text: false, masks: false, adjust: false, lossy: true, quality: true,
    use: 'Websites. Usually smaller than JPEG or PNG at the same look, and it keeps transparency.', opens: 'Modern browsers and most editors' },
  psd: { label: 'PSD (layered)', ext: 'psd', mime: 'image/vnd.adobe.photoshop', layers: true, transparency: true, text: false, masks: true, adjust: false, lossy: false,
    use: 'Handing layered work to someone using Photoshop, Photopea, GIMP, Krita or Affinity Photo.', opens: 'Photoshop, Photopea, GIMP, Krita, Affinity' },
  ora: { label: 'OpenRaster (layered)', ext: 'ora', mime: 'image/openraster', layers: true, transparency: true, text: false, masks: false, adjust: false, lossy: false,
    use: 'The open, documented layered format: a ZIP of PNG layers plus a list (stack.xml).', opens: 'Krita, GIMP, MyPaint, Pinta' },
  layerlab: { label: 'Layer Lab project', ext: 'layerlab', mime: 'application/json', layers: true, transparency: true, text: true, masks: true, adjust: true, lossy: false,
    use: 'Your working file. Keeps everything editable: live text, shapes, masks, effects, adjustment layers.', opens: 'Layer Lab only (a native format)' },
};

export const SAMPLES = [
  { id: 'poster', name: 'STEAM Night poster (starter).layerlab', kind: 'build', credit: 'Built for this lesson', about: 'A layered poster with text, shapes, a mask and an adjustment layer. Take it apart.' },
  { id: 'beach', name: 'Beach litter.png', kind: 'build', credit: 'Drawn with code for this lesson', about: 'Practice the Spot Healing Brush and Content-Aware Fill: remove the litter.' },
  { id: 'moon', name: 'Moon (NASA LRO).jpg', kind: 'url', url: 'assets/images/moon-lro-nasa.jpg', credit: 'NASA, public domain', about: 'A gray subject on black: perfect for Select › Subject or the Magic Wand.' },
  { id: 'earth', name: 'Earth Blue Marble (NASA).jpg', kind: 'url', url: 'assets/images/earth-blue-marble-nasa.jpg', credit: 'NASA, public domain', about: 'Cut it out and place it on your poster.' },
  { id: 'jupiter', name: 'Jupiter (NASA Cassini).jpg', kind: 'url', url: 'assets/images/jupiter-cassini-nasa.jpg', credit: 'NASA/JPL, public domain', about: 'Try Hue/Saturation to recolor the bands.' },
  { id: 'flight', name: 'First flight 1903 (Library of Congress).jpg', kind: 'url', url: 'assets/images/wright-brothers/first-flight.jpg', credit: 'John T. Daniels, 1903 · Library of Congress, public domain', about: 'A black-and-white photo. Colorize it with a layer set to the Color blend mode.' },
];

/* ── PNG helpers for OpenRaster ──────────────────────────────────────── */

async function encodePNG(w, h, rgba) {
  const c = makeCanvas(w, h);
  if (rgba.length) c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h), 0, 0);
  const blob = await toBlob(c, 'image/png');
  return new Uint8Array(await blob.arrayBuffer());
}

async function decodePNG(bytes) {
  const c = await canvasFromBlob(new Blob([bytes], { type: 'image/png' }));
  return { width: c.width, height: c.height, rgba: getPixels(c).data };
}

export function toBlob(canvas, mime, quality) {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('The browser could not encode this image.'))), mime, quality));
}

export async function canvasFromBlob(blob, { svgWidth = 1200 } = {}) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    let w = img.naturalWidth, h = img.naturalHeight;
    const isSvg = blob.type === 'image/svg+xml';
    if (isSvg && (!w || w < svgWidth)) { const k = svgWidth / (w || 300); w = Math.round((w || 300) * k); h = Math.round((h || 150) * k); }
    const c = makeCanvas(w, h);
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    return c;
  } catch {
    throw new Error('This browser could not read that image. Try PNG, JPEG, WebP or GIF.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ── opening ─────────────────────────────────────────────────────────── */

function sniff(bytes, name = '') {
  const s = String.fromCharCode(...bytes.subarray(0, 12));
  if (s.startsWith('8BPS')) return 'psd';
  if (s.startsWith('PK\x03\x04')) return 'zip';
  if (s.startsWith('\x89PNG')) return 'png';
  if (s.startsWith('\xff\xd8\xff')) return 'jpeg';
  if (s.startsWith('GIF8')) return 'gif';
  if (s.startsWith('RIFF') && s.slice(8, 12) === 'WEBP') return 'webp';
  if (s.startsWith('BM')) return 'bmp';
  if (s.slice(4, 12).includes('ftypheic') || s.slice(4, 12).includes('ftypmif1')) return 'heic';
  if (/^\s*\{/.test(s)) return 'json';
  if (/^\s*</.test(s) || /\.svg$/i.test(name)) return 'svg';
  return 'unknown';
}

const stripExt = (n) => n.replace(/\.[^.]+$/, '');

/** Open any supported file as a new document. Returns { doc, kind, notes }. */
export async function openFile(blob, name) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const kind = sniff(bytes, name);
  const notes = [];
  if (kind === 'psd') {
    const io = await readPSD(bytes);
    notes.push(`Photoshop file: ${io.layers.length || 1} layer${io.layers.length === 1 ? '' : 's'} came through.`, ...io.notes);
    return { doc: LayerDoc.fromInterchange(io, stripExt(name)), kind: 'psd', notes };
  }
  if (kind === 'zip') {
    const io = await readORA(bytes, { decodePNG });
    notes.push(`OpenRaster file: ${io.layers.length} layer${io.layers.length === 1 ? '' : 's'} came through.`, ...io.notes);
    return { doc: LayerDoc.fromInterchange(io, stripExt(name)), kind: 'ora', notes };
  }
  if (kind === 'json') {
    let p;
    try { p = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error('That file looks like JSON but is damaged.'); }
    const doc = await LayerDoc.fromProject(p);
    notes.push('Layer Lab project: everything is still editable (text, shapes, masks, effects, adjustments).');
    return { doc, kind: 'layerlab', notes };
  }
  if (kind === 'heic') throw new Error('HEIC photos (from iPhones) can\'t be opened in a browser editor. Export it as JPEG first.');
  if (kind === 'unknown') throw new Error(`Layer Lab doesn't recognise "${name}". Try PNG, JPEG, WebP, GIF, SVG, PSD, ORA or a .layerlab project.`);
  const typed = kind === 'svg' ? new Blob([bytes], { type: 'image/svg+xml' }) : blob;
  const c = await canvasFromBlob(typed);
  const doc = new LayerDoc(c.width, c.height, stripExt(name));
  doc.addPixelLayer('Background', c);
  notes.push(`${kind.toUpperCase()} image: one flat layer, ${c.width} × ${c.height} pixels.`);
  if (kind === 'jpeg') notes.push('JPEG has no layers and no transparency, so there was only ever one layer to open.');
  if (kind === 'svg') notes.push(`SVG is a vector format. It was rasterized (turned into pixels) at ${c.width} px wide; enlarging it later will look soft.`);
  if (kind === 'gif') notes.push('Only the first frame of an animated GIF is opened.');
  return { doc, kind, notes };
}

/** Open a file and flatten it to one canvas (for Place). */
export async function openAsCanvas(blob, name) {
  const { doc, kind, notes } = await openFile(blob, name);
  return { canvas: doc.render(makeCanvas(doc.width, doc.height)), kind, notes, name: stripExt(name) };
}

/* ── exporting ───────────────────────────────────────────────────────── */

/** Returns { blob, filename, notes } */
export async function exportDoc(doc, format, { quality = 0.85, scale = 1, filename } = {}) {
  const f = FORMATS[format];
  const base = (filename || doc.name || 'untitled').replace(/[\\/:*?"<>|]+/g, '-');
  const name = `${base}.${f.ext}`;
  const notes = [];
  if (format === 'layerlab') {
    const blob = new Blob([JSON.stringify(doc.toProject())], { type: f.mime });
    return { blob, filename: name, notes: ['Native project: nothing was flattened.'] };
  }
  if (format === 'psd' || format === 'ora') {
    const io = doc.toInterchange({ keepMasks: format === 'psd' });
    notes.push(...io.notes);
    if (format === 'psd') {
      const bytes = writePSD({ width: doc.width, height: doc.height, layers: io.layers, composite: io.composite });
      return { blob: new Blob([bytes], { type: f.mime }), filename: name, notes };
    }
    const tw = Math.min(256, doc.width), th = Math.max(1, Math.round(doc.height * tw / doc.width));
    const thumb = makeCanvas(tw, th);
    thumb.getContext('2d').drawImage(doc.render(makeCanvas(doc.width, doc.height)), 0, 0, tw, th);
    const ora = await writeORA({ width: doc.width, height: doc.height, layers: io.layers, composite: io.composite },
      { encodePNG, thumbnail: { width: tw, height: th, rgba: getPixels(thumb).data } });
    notes.push(...ora.notes);
    return { blob: new Blob([ora.bytes], { type: f.mime }), filename: name, notes };
  }
  const full = doc.render(makeCanvas(doc.width, doc.height));
  const w = Math.max(1, Math.round(doc.width * scale)), h = Math.max(1, Math.round(doc.height * scale));
  const out = makeCanvas(w, h), ctx = out.getContext('2d');
  if (format === 'jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); notes.push('JPEG cannot store transparency: see-through pixels were filled with white.'); }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(full, 0, 0, w, h);
  if (scale !== 1) notes.push(`Resampled to ${w} × ${h} pixels (${Math.round(scale * 100)}%).`);
  notes.push(`All ${doc.layers.length} layer${doc.layers.length === 1 ? ' was' : 's were'} flattened into one picture.`);
  let blob = await toBlob(out, f.mime, f.quality ? quality : undefined);
  let filename = name;
  if (blob.type !== f.mime) {
    notes.push(`This browser can't write ${f.label}, so a PNG was saved instead.`);
    filename = `${base}.png`;
    blob = await toBlob(out, 'image/png');
  }
  return { blob, filename, notes };
}

export function download(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  return `${(n / 1048576).toFixed(2)} MB`;
}

/* ── Workshop Drive (IndexedDB, falls back to memory) ─────────────────── */

export class Drive {
  constructor(dbName = 'classroomos-layerlab') {
    this.dbName = dbName;
    this.mem = new Map();
    this.memId = 1;
    this.ready = this.open();
    this.listeners = new Set();
  }
  async open() {
    try {
      this.db = await new Promise((res, rej) => {
        const r = indexedDB.open(this.dbName, 1);
        r.onupgradeneeded = () => r.result.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    } catch { this.db = null; }
  }
  tx(mode, fn) {
    return new Promise((res, rej) => {
      const t = this.db.transaction('files', mode);
      const req = fn(t.objectStore('files'));
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error);
    });
  }
  async list() {
    await this.ready;
    const all = this.db ? await this.tx('readonly', (s) => s.getAll()) : [...this.mem.values()];
    return all.sort((a, b) => b.created - a.created);
  }
  async put(rec) {
    await this.ready;
    const row = { created: Date.now(), ...rec, size: rec.blob.size };
    if (row.id == null) delete row.id;
    let id;
    try {
      id = this.db ? await this.tx('readwrite', (s) => s.put(row)) : null;
    } catch { id = null; }
    if (id == null) { id = row.id ?? this.memId++; this.mem.set(id, { ...row, id }); }
    this.emit();
    return id;
  }
  async get(id) {
    await this.ready;
    return this.db ? this.tx('readonly', (s) => s.get(id)) : this.mem.get(id);
  }
  async remove(id) {
    await this.ready;
    if (this.db) await this.tx('readwrite', (s) => s.delete(id)); else this.mem.delete(id);
    this.emit();
  }
  onChange(fn) { this.listeners.add(fn); }
  emit() { for (const fn of this.listeners) fn(); }
}
