// Original four-bar test composition; no third-party music.
// Binary fields are laid out according to the pinned GP1/GP2 readers.
module.exports = function fixture(version = 'FICHIER GUITAR PRO v2.21') {
  const gp2 = version.includes('v2.'), v = version.endsWith('v1') ? 0 : Number(version.split('.').pop());
  const modern = gp2 || v >= 3, count = modern ? 8 : 1, chunks = [];
  const byte = n => chunks.push(Buffer.from([n & 255]));
  const int = n => { const b = Buffer.alloc(4); b.writeInt32LE(n); chunks.push(b); };
  const zeros = n => chunks.push(Buffer.alloc(n));
  const text = (s, width) => { const b = Buffer.from(s); byte(b.length); chunks.push(b); if (width) zeros(width - b.length); };
  const sized = s => { byte(Buffer.byteLength(s) + 1); text(s); };
  text(version, 30); sized('Local GTP study'); sized('ClassroomOS test'); sized('');
  int(120); int(0); if (modern) int(0);
  for (let t = 0; t < count; t++) { if (gp2 || v >= 2) int(6); [64,59,55,50,45,40].forEach(int); }
  int(4);
  for (let t = 0; t < count; t++) {
    int(24); if (modern) { int(24); sized(t ? 'Other' : 'Guitar'); byte(0); [100,64,0,0,2].forEach(int); }
  }
  if (modern) zeros(10);
  for (let m = 0; m < 4; m++) {
    byte(m === 3 ? 3 : 4); byte(4); zeros(6);
    for (let t = 0; t < count; t++) { zeros(2); byte(t ? 0 : 1); zeros(9); }
    zeros(2); byte(m === 1 ? 1 : m === 2 ? 2 : 0); if (m === 2) byte(1);
    int(0); byte(m === 3 ? 0 : -2); byte(m === 1 ? 64 : m === 3 ? 8 : 0); if (gp2) byte(0);
    if (m !== 1 && m !== 3) {
      byte(32); byte(0); if (gp2) byte(0); // highest string
      byte(m === 2 ? 3 : 0); if (gp2) byte(5);
    }
  }
  return Buffer.concat(chunks);
};
