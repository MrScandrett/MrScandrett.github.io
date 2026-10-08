/* psd.mjs — read and write layered Photoshop (.psd) files.
 *
 * Covers what a class needs to move work between Layer Lab, Photoshop,
 * Photopea, GIMP and Krita: 8-bit RGB (and grayscale on read), pixel layers
 * with position, opacity, visibility, blend mode, Unicode names and layer
 * masks, plus the flattened "merged" image every PSD carries.
 *
 * Not covered (reported in `notes` on read): 16/32-bit, CMYK, PSB, live text
 * (its rendered pixels are kept), adjustment layers, groups (flattened).
 *
 * IO layer shape, shared with ora.mjs:
 *   { name, left, top, width, height, rgba: Uint8ClampedArray, opacity 0–1,
 *     visible, blend, mask?: { left, top, width, height, data: Uint8Array, defaultColor } }
 * Layers are listed bottom → top.
 */

export const BLEND_TO_PSD = {
  normal: 'norm', multiply: 'mul ', screen: 'scrn', overlay: 'over', darken: 'dark', lighten: 'lite',
  'color-dodge': 'div ', 'color-burn': 'idiv', 'hard-light': 'hLit', 'soft-light': 'sLit',
  difference: 'diff', exclusion: 'smud', hue: 'hue ', saturation: 'sat ', color: 'colr', luminosity: 'lum ',
};
const PSD_TO_BLEND = Object.fromEntries(Object.entries(BLEND_TO_PSD).map(([k, v]) => [v, k]));

const ADJUSTMENT_KEYS = {
  brit: 'Brightness/Contrast', levl: 'Levels', curv: 'Curves', expA: 'Exposure', vibA: 'Vibrance',
  hue2: 'Hue/Saturation', hue: 'Hue/Saturation', blnc: 'Color Balance', blwh: 'Black & White',
  phfl: 'Photo Filter', mixr: 'Channel Mixer', clrL: 'Color Lookup', nvrt: 'Invert', post: 'Posterize',
  thrs: 'Threshold', grdm: 'Gradient Map', selc: 'Selective Color', SoCo: 'Solid color fill',
  GdFl: 'Gradient fill', PtFl: 'Pattern fill',
};

/* ── PackBits (the RLE Photoshop uses) ─────────────────────────────────── */

export function packBits(src, start, n, out) {
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && j - i < 127 && src[start + j + 1] === src[start + i]) j++;
    const run = j - i + 1;
    if (run >= 3) {
      out.push((257 - run) & 255, src[start + i]);
      i = j + 1;
    } else {
      const s = i;
      while (i < n && i - s < 128) {
        if (i + 2 < n && src[start + i] === src[start + i + 1] && src[start + i] === src[start + i + 2]) break;
        i++;
      }
      out.push(i - s - 1);
      for (let k = s; k < i; k++) out.push(src[start + k]);
    }
  }
}

function unpackBits(bytes, p, end, out, o, n) {
  const stop = o + n;
  while (p < end && o < stop) {
    let h = bytes[p++];
    if (h > 127) h -= 256;
    if (h >= 0) { for (let k = 0; k <= h && o < stop; k++) out[o++] = bytes[p++]; }
    else if (h !== -128) { const v = bytes[p++]; for (let k = 0; k < 1 - h && o < stop; k++) out[o++] = v; }
  }
  return p;
}

/* ── byte writer ───────────────────────────────────────────────────────── */

class Writer {
  constructor() { this.buf = new Uint8Array(1 << 16); this.dv = new DataView(this.buf.buffer); this.p = 0; }
  need(n) {
    if (this.p + n <= this.buf.length) return;
    let size = this.buf.length * 2;
    while (size < this.p + n) size *= 2;
    const next = new Uint8Array(size); next.set(this.buf); this.buf = next; this.dv = new DataView(next.buffer);
  }
  u8(v) { this.need(1); this.buf[this.p++] = v; }
  u16(v) { this.need(2); this.dv.setUint16(this.p, v); this.p += 2; }
  i16(v) { this.need(2); this.dv.setInt16(this.p, v); this.p += 2; }
  u32(v) { this.need(4); this.dv.setUint32(this.p, v); this.p += 4; }
  i32(v) { this.need(4); this.dv.setInt32(this.p, v); this.p += 4; }
  str(s) { for (const ch of s) this.u8(ch.charCodeAt(0)); }
  bytes(b) { this.need(b.length); this.buf.set(b, this.p); this.p += b.length; }
  zeros(n) { this.need(n); this.p += n; }
  mark() { const at = this.p; this.u32(0); return at; }
  close(at) { this.dv.setUint32(at, this.p - at - 4); }
  done() { return this.buf.slice(0, this.p); }
}

/** Encode `count` planes (each width×height bytes) as RLE: all row counts, then all rows. */
function rlePlanes(planes, width, height) {
  const counts = [], data = [];
  for (const plane of planes) {
    for (let y = 0; y < height; y++) {
      const before = data.length;
      packBits(plane, y * width, width, data);
      counts.push(data.length - before);
    }
  }
  const out = new Uint8Array(counts.length * 2 + data.length);
  const dv = new DataView(out.buffer);
  counts.forEach((c, i) => dv.setUint16(i * 2, c));
  out.set(data, counts.length * 2);
  return out;
}

function splitPlanes(rgba, n) {
  const planes = [new Uint8Array(n), new Uint8Array(n), new Uint8Array(n), new Uint8Array(n)];
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    planes[0][i] = rgba[j]; planes[1][i] = rgba[j + 1]; planes[2][i] = rgba[j + 2]; planes[3][i] = rgba[j + 3];
  }
  return planes;
}

function pascalName(w, name) {
  const ascii = String(name || 'Layer').replace(/[^\x20-\x7e]/g, '?').slice(0, 63);
  w.u8(ascii.length); w.str(ascii);
  const total = 1 + ascii.length;
  w.zeros((4 - (total % 4)) % 4);
}

function unicodeName(w, name) {
  const s = String(name || 'Layer');
  w.str('8BIM'); w.str('luni');
  const len = 4 + s.length * 2;
  const padded = len + ((4 - (len % 4)) % 4);
  w.u32(padded);
  w.u32(s.length);
  for (let i = 0; i < s.length; i++) w.u16(s.charCodeAt(i));
  w.zeros(padded - len);
}

/** doc: { width, height, layers (bottom → top), composite: Uint8ClampedArray } → Uint8Array */
export function writePSD(doc) {
  const { width: W, height: H, layers } = doc;
  const w = new Writer();
  w.str('8BPS'); w.u16(1); w.zeros(6); w.u16(4); w.u32(H); w.u32(W); w.u16(8); w.u16(3);
  w.u32(0); // color mode data
  w.u32(0); // image resources

  const lm = w.mark();
  const li = w.mark();
  w.i16(-layers.length); // negative: first alpha channel is the merged transparency

  const channelData = layers.map((L) => {
    const chans = [];
    const empty = !(L.width > 0 && L.height > 0);
    const planes = empty ? null : splitPlanes(L.rgba, L.width * L.height);
    const order = [[-1, 3], [0, 0], [1, 1], [2, 2]];
    for (const [id, k] of order) {
      chans.push({ id, data: empty ? new Uint8Array([0, 0]) : withCompression(rlePlanes([planes[k]], L.width, L.height)) });
    }
    if (L.mask && L.mask.width > 0 && L.mask.height > 0) {
      chans.push({ id: -2, data: withCompression(rlePlanes([L.mask.data], L.mask.width, L.mask.height)) });
    }
    return chans;
  });

  layers.forEach((L, i) => {
    const empty = !(L.width > 0 && L.height > 0);
    const top = empty ? 0 : L.top, left = empty ? 0 : L.left;
    w.i32(top); w.i32(left); w.i32(empty ? 0 : top + L.height); w.i32(empty ? 0 : left + L.width);
    const chans = channelData[i];
    w.u16(chans.length);
    for (const c of chans) { w.i16(c.id); w.u32(c.data.length); }
    w.str('8BIM'); w.str(BLEND_TO_PSD[L.blend] || 'norm');
    w.u8(Math.round(Math.max(0, Math.min(1, L.opacity ?? 1)) * 255));
    w.u8(0);
    w.u8((L.visible === false ? 2 : 0) | 8); // bit 3: bit 4 is meaningful
    w.u8(0);
    const extra = w.mark();
    const m = L.mask && L.mask.width > 0 && L.mask.height > 0 ? L.mask : null;
    if (m) {
      w.u32(20); w.i32(m.top); w.i32(m.left); w.i32(m.top + m.height); w.i32(m.left + m.width);
      w.u8(m.defaultColor ?? 0); w.u8(0); w.u16(0);
    } else {
      w.u32(0);
    }
    w.u32(0); // blending ranges
    pascalName(w, L.name);
    unicodeName(w, L.name);
    w.close(extra);
  });
  for (const chans of channelData) for (const c of chans) w.bytes(c.data);
  if ((w.p - li - 4) % 2) w.u8(0);
  w.close(li);
  w.u32(0); // global layer mask info
  w.close(lm);

  w.u16(1);
  w.bytes(rlePlanes(splitPlanes(doc.composite, W * H), W, H));
  return w.done();
}

function withCompression(rle) {
  const out = new Uint8Array(rle.length + 2);
  out[1] = 1;
  out.set(rle, 2);
  return out;
}

/* ── reading ───────────────────────────────────────────────────────────── */

async function inflate(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot unpack ZIP-compressed PSD channels.');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Read one channel at bytes[p..end) into a width×height plane. */
async function readChannel(bytes, dv, p, end, width, height) {
  const n = width * height;
  const plane = new Uint8Array(n);
  if (n === 0 || end - p < 2) return plane;
  const comp = dv.getUint16(p); p += 2;
  if (comp === 0) {
    plane.set(bytes.subarray(p, Math.min(end, p + n)));
  } else if (comp === 1) {
    const counts = [];
    for (let y = 0; y < height; y++) { counts.push(dv.getUint16(p)); p += 2; }
    for (let y = 0; y < height; y++) { unpackBits(bytes, p, p + counts[y], plane, y * width, width); p += counts[y]; }
  } else if (comp === 2 || comp === 3) {
    const raw = await inflate(bytes.subarray(p, end));
    plane.set(raw.subarray(0, n));
    if (comp === 3) for (let y = 0; y < height; y++) for (let x = 1; x < width; x++) plane[y * width + x] = (plane[y * width + x] + plane[y * width + x - 1]) & 255;
  } else {
    throw new Error(`Unknown PSD channel compression ${comp}.`);
  }
  return plane;
}

/** Uint8Array → { width, height, layers (bottom → top), composite, notes } */
export async function readPSD(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const sig = String.fromCharCode(...bytes.subarray(0, 4));
  if (sig !== '8BPS') throw new Error('This is not a Photoshop file (missing 8BPS signature).');
  const version = dv.getUint16(4);
  if (version === 2) throw new Error('This is a PSB (large document) file. Save it as a regular PSD first.');
  const channels = dv.getUint16(12);
  const height = dv.getUint32(14), width = dv.getUint32(18);
  const depth = dv.getUint16(22), mode = dv.getUint16(24);
  if (depth !== 8) throw new Error(`This PSD is ${depth}-bit. Change it to 8 bits per channel before exporting.`);
  if (mode !== 3 && mode !== 1) throw new Error('Only RGB and grayscale PSD files can be opened (this one uses ' + (mode === 4 ? 'CMYK' : 'another color mode') + ').');
  const notes = [];
  let p = 26;
  p += 4 + dv.getUint32(p); // color mode data
  p += 4 + dv.getUint32(p); // image resources
  const lmLen = dv.getUint32(p); p += 4;
  const lmEnd = p + lmLen;
  const layers = [];
  if (lmLen > 0) {
    const liLen = dv.getUint32(p); p += 4;
    const liEnd = p + liLen;
    if (liLen > 0) {
      const count = Math.abs(dv.getInt16(p)); p += 2;
      const recs = [];
      for (let i = 0; i < count; i++) {
        const r = { top: dv.getInt32(p), left: dv.getInt32(p + 4), bottom: dv.getInt32(p + 8), right: dv.getInt32(p + 12) };
        p += 16;
        const nch = dv.getUint16(p); p += 2;
        r.channels = [];
        for (let c = 0; c < nch; c++) { r.channels.push({ id: dv.getInt16(p), len: dv.getUint32(p + 2) }); p += 6; }
        p += 4; // 8BIM
        r.blendKey = String.fromCharCode(...bytes.subarray(p, p + 4)); p += 4;
        r.opacity = bytes[p]; r.flags = bytes[p + 2]; p += 4;
        const extraLen = dv.getUint32(p); p += 4;
        const extraEnd = p + extraLen;
        const maskLen = dv.getUint32(p); p += 4;
        if (maskLen >= 18) {
          r.mask = { top: dv.getInt32(p), left: dv.getInt32(p + 4), bottom: dv.getInt32(p + 8), right: dv.getInt32(p + 12), defaultColor: bytes[p + 16], flags: bytes[p + 17] };
        }
        p += maskLen;
        p += 4 + dv.getUint32(p); // blending ranges
        const nameLen = bytes[p];
        r.name = new TextDecoder('latin1').decode(bytes.subarray(p + 1, p + 1 + nameLen));
        p += 1 + nameLen; p += (4 - ((1 + nameLen) % 4)) % 4;
        while (p + 12 <= extraEnd) {
          const key = String.fromCharCode(...bytes.subarray(p + 4, p + 8));
          const len = dv.getUint32(p + 8);
          const d = p + 12;
          if (key === 'luni') {
            const n = dv.getUint32(d); let s = '';
            for (let k = 0; k < n; k++) s += String.fromCharCode(dv.getUint16(d + 4 + k * 2));
            r.name = s.replace(/\0+$/, '');
          } else if (key === 'lsct' || key === 'lsdk') {
            r.section = dv.getUint32(d);
          } else if (key === 'TySh' || key === 'tySh') {
            r.text = true;
          } else if (ADJUSTMENT_KEYS[key]) {
            r.adjustment = ADJUSTMENT_KEYS[key];
          } else if (key === 'SoLd' || key === 'PlLd' || key === 'SoLE') {
            r.smart = true;
          }
          p = d + len + (len % 2);
        }
        p = extraEnd;
        recs.push(r);
      }
      for (const r of recs) {
        const lw = Math.max(0, r.right - r.left), lh = Math.max(0, r.bottom - r.top);
        const planes = {};
        for (const c of r.channels) {
          const isMask = c.id === -2 && r.mask;
          const cw = isMask ? r.mask.right - r.mask.left : lw;
          const ch = isMask ? r.mask.bottom - r.mask.top : lh;
          planes[c.id] = await readChannel(bytes, dv, p, p + c.len, Math.max(0, cw), Math.max(0, ch));
          p += c.len;
        }
        if (r.section) { if (r.section === 1 || r.section === 2) notes.push(`Group "${r.name}" was flattened into separate layers.`); continue; }
        if (r.adjustment) { notes.push(`Skipped ${r.adjustment} adjustment layer "${r.name}" (Layer Lab cannot read Photoshop's adjustment settings).`); continue; }
        if (r.text) notes.push(`Text layer "${r.name}" arrived as pixels; the words are no longer editable.`);
        if (r.smart) notes.push(`Smart object "${r.name}" arrived as pixels.`);
        const n = lw * lh;
        const rgba = new Uint8ClampedArray(n * 4);
        const gray = mode === 1;
        for (let i = 0, j = 0; i < n; i++, j += 4) {
          const R = planes[0] ? planes[0][i] : 0;
          rgba[j] = R;
          rgba[j + 1] = gray ? R : planes[1] ? planes[1][i] : 0;
          rgba[j + 2] = gray ? R : planes[2] ? planes[2][i] : 0;
          rgba[j + 3] = planes[-1] ? planes[-1][i] : 255;
        }
        const L = {
          name: r.name || `Layer ${layers.length + 1}`, left: r.left, top: r.top, width: lw, height: lh, rgba,
          opacity: r.opacity / 255, visible: !(r.flags & 2), blend: PSD_TO_BLEND[r.blendKey] || 'normal',
        };
        if (!PSD_TO_BLEND[r.blendKey]) notes.push(`Layer "${L.name}" used a blend mode Layer Lab does not have (${r.blendKey.trim()}); it is set to Normal.`);
        if (r.mask && planes[-2]) {
          L.mask = {
            left: r.mask.left, top: r.mask.top, width: r.mask.right - r.mask.left, height: r.mask.bottom - r.mask.top,
            data: planes[-2], defaultColor: r.mask.defaultColor, disabled: !!(r.mask.flags & 2),
          };
        }
        layers.push(L);
      }
    }
    p = lmEnd;
  } else {
    p = lmEnd;
  }

  const n = width * height;
  const composite = new Uint8ClampedArray(n * 4);
  const comp = dv.getUint16(p); p += 2;
  const planes = [];
  if (comp === 1) {
    const counts = [];
    for (let i = 0; i < channels * height; i++) { counts.push(dv.getUint16(p)); p += 2; }
    let row = 0;
    for (let c = 0; c < channels; c++) {
      const plane = new Uint8Array(n);
      for (let y = 0; y < height; y++, row++) { unpackBits(bytes, p, p + counts[row], plane, y * width, width); p += counts[row]; }
      planes.push(plane);
    }
  } else if (comp === 0) {
    for (let c = 0; c < channels; c++) { planes.push(bytes.slice(p, p + n)); p += n; }
  } else {
    const raw = await inflate(bytes.subarray(p));
    for (let c = 0; c < channels; c++) planes.push(raw.subarray(c * n, (c + 1) * n));
  }
  const gray = mode === 1;
  const alphaIndex = gray ? 1 : 3;
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    composite[j] = planes[0][i];
    composite[j + 1] = gray ? planes[0][i] : planes[1][i];
    composite[j + 2] = gray ? planes[0][i] : planes[2][i];
    composite[j + 3] = planes[alphaIndex] ? planes[alphaIndex][i] : 255;
  }
  return { width, height, layers, composite, notes };
}
