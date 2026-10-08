/* zip.mjs — the smallest ZIP that OpenRaster needs.
 *
 * Writes STORE-only archives (layer PNGs are already compressed) and reads
 * STORE or DEFLATE entries, using the platform's DecompressionStream for the
 * latter (browsers and Node 18+). Used by ora.mjs; no dependencies.
 */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const enc = new TextEncoder();

/** files: [{ name, data: Uint8Array|string }] → Uint8Array (order is kept). */
export function zipStore(files) {
  const entries = files.map((f) => {
    const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
    return { name: enc.encode(f.name), data, crc: crc32(data) };
  });
  let size = 22;
  for (const e of entries) size += 30 + e.name.length + e.data.length + 46 + e.name.length;
  const out = new Uint8Array(size);
  const dv = new DataView(out.buffer);
  let p = 0;
  const DOS_TIME = 0, DOS_DATE = (2026 - 1980) << 9 | 1 << 5 | 1;
  for (const e of entries) {
    e.offset = p;
    dv.setUint32(p, 0x04034b50, true); dv.setUint16(p + 4, 10, true); dv.setUint16(p + 6, 0x0800, true);
    dv.setUint16(p + 8, 0, true); dv.setUint16(p + 10, DOS_TIME, true); dv.setUint16(p + 12, DOS_DATE, true);
    dv.setUint32(p + 14, e.crc, true); dv.setUint32(p + 18, e.data.length, true); dv.setUint32(p + 22, e.data.length, true);
    dv.setUint16(p + 26, e.name.length, true); dv.setUint16(p + 28, 0, true);
    out.set(e.name, p + 30); p += 30 + e.name.length;
    out.set(e.data, p); p += e.data.length;
  }
  const cdStart = p;
  for (const e of entries) {
    dv.setUint32(p, 0x02014b50, true); dv.setUint16(p + 4, 20, true); dv.setUint16(p + 6, 10, true);
    dv.setUint16(p + 8, 0x0800, true); dv.setUint16(p + 10, 0, true); dv.setUint16(p + 12, DOS_TIME, true);
    dv.setUint16(p + 14, DOS_DATE, true); dv.setUint32(p + 16, e.crc, true);
    dv.setUint32(p + 20, e.data.length, true); dv.setUint32(p + 24, e.data.length, true);
    dv.setUint16(p + 28, e.name.length, true);
    // extra, comment, disk, internal attrs, external attrs = 0
    dv.setUint32(p + 42, e.offset, true);
    out.set(e.name, p + 46); p += 46 + e.name.length;
  }
  dv.setUint32(p, 0x06054b50, true);
  dv.setUint16(p + 8, entries.length, true); dv.setUint16(p + 10, entries.length, true);
  dv.setUint32(p + 12, p - cdStart, true); dv.setUint32(p + 16, cdStart, true);
  return out;
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot unpack compressed ZIP entries.');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Uint8Array → Map(name → Uint8Array). Throws on anything that is not a ZIP. */
export async function unzip(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a ZIP archive.');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const files = new Map();
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('Damaged ZIP directory.');
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nlen));
    p += 46 + nlen + xlen + clen;
    const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    const raw = bytes.subarray(start, start + csize);
    if (method === 0) files.set(name, raw.slice());
    else if (method === 8) files.set(name, await inflateRaw(raw));
    else throw new Error(`ZIP entry ${name} uses an unsupported compression method (${method}).`);
  }
  return files;
}
