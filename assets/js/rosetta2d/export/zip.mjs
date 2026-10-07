// zip.mjs — a tiny zip writer (stored, no compression) so exports download as one file.
// files: { 'path/in/zip.txt': string | Uint8Array }  →  Uint8Array of a .zip

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function makeZip(files) {
  const enc = new TextEncoder();
  const entries = Object.keys(files).sort().map((name) => {
    const v = files[name];
    const data = typeof v === 'string' ? enc.encode(v) : v;
    return { name: enc.encode(name), data, crc: crc32(data) };
  });
  const DOS_TIME = 0; // 00:00:00
  const DOS_DATE = (2026 - 1980) << 9 | 1 << 5 | 1; // 2026-01-01: fixed, so exports are reproducible
  let size = 22;
  for (const e of entries) size += 30 + e.name.length + e.data.length + 46 + e.name.length;
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  let p = 0;
  const u16 = (v) => { view.setUint16(p, v, true); p += 2; };
  const u32 = (v) => { view.setUint32(p, v, true); p += 4; };
  for (const e of entries) {
    e.offset = p;
    u32(0x04034b50); u16(20); u16(0x0800); u16(0); u16(DOS_TIME); u16(DOS_DATE);
    u32(e.crc); u32(e.data.length); u32(e.data.length); u16(e.name.length); u16(0);
    out.set(e.name, p); p += e.name.length;
    out.set(e.data, p); p += e.data.length;
  }
  const dirStart = p;
  for (const e of entries) {
    u32(0x02014b50); u16(20); u16(20); u16(0x0800); u16(0); u16(DOS_TIME); u16(DOS_DATE);
    u32(e.crc); u32(e.data.length); u32(e.data.length); u16(e.name.length); u16(0); u16(0); u16(0); u16(0);
    u32(0); u32(e.offset);
    out.set(e.name, p); p += e.name.length;
  }
  const dirSize = p - dirStart;
  u32(0x06054b50); u16(0); u16(0); u16(entries.length); u16(entries.length); u32(dirSize); u32(dirStart); u16(0);
  return out;
}
