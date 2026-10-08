/* ora.mjs — OpenRaster (.ora), the open layered format shared by Krita, GIMP,
 * MyPaint and Pinta. An .ora file is a ZIP holding `mimetype`, `stack.xml`
 * (the layer list, top → bottom), one PNG per layer, `mergedimage.png` and a
 * thumbnail. https://www.openraster.org/
 *
 * PNG encoding/decoding needs a canvas, so callers pass it in:
 *   encodePNG(width, height, rgba) → Promise<Uint8Array>
 *   decodePNG(bytes)               → Promise<{ width, height, rgba }>
 * Layer objects use the IO shape documented in psd.mjs (bottom → top).
 * OpenRaster has no layer masks: callers bake masks into alpha first.
 */
import { zipStore, unzip } from './zip.mjs';

export const BLEND_TO_ORA = {
  normal: 'svg:src-over', multiply: 'svg:multiply', screen: 'svg:screen', overlay: 'svg:overlay',
  darken: 'svg:darken', lighten: 'svg:lighten', 'color-dodge': 'svg:color-dodge', 'color-burn': 'svg:color-burn',
  'hard-light': 'svg:hard-light', 'soft-light': 'svg:soft-light', difference: 'svg:difference',
  hue: 'svg:hue', saturation: 'svg:saturation', color: 'svg:color', luminosity: 'svg:luminosity',
};
const ORA_TO_BLEND = Object.fromEntries(Object.entries(BLEND_TO_ORA).map(([k, v]) => [v, k]));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** Returns { bytes, notes } */
export async function writeORA(doc, { encodePNG, thumbnail }) {
  const notes = [];
  const files = [{ name: 'mimetype', data: 'image/openraster' }];
  const xml = [`<?xml version="1.0" encoding="UTF-8"?>`, `<image version="0.0.5" w="${doc.width}" h="${doc.height}" xres="72" yres="72">`, '<stack>'];
  const top = doc.layers.slice().reverse();
  for (let i = 0; i < top.length; i++) {
    const L = top[i];
    const src = `data/layer${top.length - 1 - i}.png`;
    let op = BLEND_TO_ORA[L.blend];
    if (!op) { op = 'svg:src-over'; notes.push(`OpenRaster has no ${L.blend} blend mode, so "${L.name}" was saved as Normal.`); }
    const w = Math.max(1, L.width), h = Math.max(1, L.height);
    const rgba = L.width > 0 && L.height > 0 ? L.rgba : new Uint8ClampedArray(4);
    files.push({ name: src, data: await encodePNG(w, h, rgba) });
    xml.push(`<layer name="${esc(L.name)}" src="${src}" x="${L.left | 0}" y="${L.top | 0}" opacity="${(L.opacity ?? 1).toFixed(3)}" visibility="${L.visible === false ? 'hidden' : 'visible'}" composite-op="${op}"/>`);
  }
  xml.push('</stack>', '</image>');
  files.splice(1, 0, { name: 'stack.xml', data: xml.join('\n') });
  files.push({ name: 'mergedimage.png', data: await encodePNG(doc.width, doc.height, doc.composite) });
  if (thumbnail) files.push({ name: 'Thumbnails/thumbnail.png', data: await encodePNG(thumbnail.width, thumbnail.height, thumbnail.rgba) });
  return { bytes: zipStore(files), notes };
}

function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) out[m[1]] = unesc(m[3] ?? m[4]);
  return out;
}

/** Uint8Array → { width, height, layers (bottom → top), composite?, notes } */
export async function readORA(bytes, { decodePNG }) {
  const files = await unzip(bytes);
  const mime = files.get('mimetype');
  if (!mime || new TextDecoder().decode(mime).trim() !== 'image/openraster') throw new Error('This ZIP is not an OpenRaster file.');
  const xml = new TextDecoder().decode(files.get('stack.xml') || new Uint8Array());
  const imageTag = xml.match(/<image\b[^>]*>/);
  if (!imageTag) throw new Error('OpenRaster file has no <image> in stack.xml.');
  const img = attrs(imageTag[0]);
  const width = parseInt(img.w, 10), height = parseInt(img.h, 10);
  const notes = [];
  if ((xml.match(/<stack\b/g) || []).length > 1) notes.push('Layer groups were flattened into separate layers.');
  const layers = [];
  for (const m of xml.matchAll(/<(layer|text)\b[^>]*\/?>/g)) {
    if (m[1] === 'text') { notes.push('Skipped a text element (OpenRaster text is not supported).'); continue; }
    const a = attrs(m[0]);
    const data = files.get(a.src);
    if (!data) { notes.push(`Layer "${a.name}" points at a missing file (${a.src}).`); continue; }
    const png = await decodePNG(data);
    const op = a['composite-op'] || 'svg:src-over';
    if (!ORA_TO_BLEND[op]) notes.push(`Layer "${a.name}" used ${op}; it is set to Normal.`);
    layers.push({
      name: a.name || `Layer ${layers.length + 1}`, left: parseInt(a.x || '0', 10), top: parseInt(a.y || '0', 10),
      width: png.width, height: png.height, rgba: png.rgba,
      opacity: a.opacity == null ? 1 : parseFloat(a.opacity), visible: a.visibility !== 'hidden', blend: ORA_TO_BLEND[op] || 'normal',
    });
  }
  layers.reverse();
  let composite = null;
  if (files.get('mergedimage.png')) composite = (await decodePNG(files.get('mergedimage.png'))).rgba;
  return { width, height, layers, composite, notes };
}
