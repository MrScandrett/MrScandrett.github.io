// Glyphs © Steinberg Media Technologies GmbH. SIL OFL 1.1, assets/fonts/BRAVURA-LICENSE.txt.
const rhythmOutlines = {
  "note1": "M0 1c0 74 90 135 235 135c101 0 224 -58 224 -135c0 -76 -57 -138 -235 -138c-162 0 -224 65 -224 138zM117 41c0 -70 69 -153 141 -153c49 0 83 22 83 77c0 66 -60 146 -134 146c-51 0 -90 -14 -90 -70z",
  "note2": "M112 -145c-63 0 -112 35 -112 96c0 60 54 194 227 194c35 0 64 -10 84 -27v757h30v-827c0 -39 -39 -193 -229 -193zM34 -51c0 -28 26 -49 53 -49c25 0 61 12 113 47c81 53 105 81 105 104c0 26 -24 46 -49 46c-55 0 -222 -91 -222 -148z",
  "note4": "M109 -141c-61 0 -109 35 -109 94c0 97 99 188 222 188c33 0 61 -9 80 -26v760h30v-828c0 -95 -123 -188 -223 -188z",
  "note8": "M0 -44c0 97 99 188 222 188c33 0 61 -9 80 -26v746c1 7 5 9 10 9c19 0 27 -6 30 -22c16 -96 58 -178 109 -257c63 -100 115 -218 115 -343c0 -78 -26 -173 -26 -173c-5 -17 -17 -21 -26 -20l-2 1c-6 4 -16 13 -16 29c0 4 1 9 3 15c17 45 24 92 24 137 c0 59 -9 116 -24 150c-31 73 -105 183 -167 221v-561c0 -95 -123 -188 -223 -188c-61 0 -109 35 -109 94z",
  "note16": "M109 -138c-61 0 -109 35 -109 94c0 97 99 188 222 188c33 0 61 -9 80 -26v754s11 1 17 1s18 -2 20 -13c17 -106 73 -122 127 -180c72 -78 98 -106 108 -174c2 -12 3 -23 3 -36c0 -61 -22 -121 -25 -127c-1 -3 -1 -5 -1 -7c0 -4 1 -6 1 -9c18 -37 29 -78 29 -120v-22 c0 -48 -3 -105 -7 -110c-6 -13 -13 -17 -20 -17c-14 0 -22 13 -22 26c0 3 0 5 1 9c5 30 8 60 8 89c0 52 -9 101 -32 149c-60 122 -122 139 -177 143v-424c0 -95 -123 -188 -223 -188zM342 644c0 -1 0 -2 1 -3c21 -82 67 -106 114 -160c21 -24 38 -44 54 -69c2 -3 4 -4 7 -4 c5 0 12 3 13 6c5 8 5 18 7 26c1 7 1 13 1 20c0 32 -9 63 -27 89c-33 49 -87 105 -148 105h-8c-8 0 -14 -6 -14 -10z",
  "rest4": "M117 -366c-73 56 -116 105 -116 155c0 53 39 96 82 96c5 0 11 -3 16 -3c4 -1 12 -3 16 -3c5 0 9 1 11 5c1 1 1 3 1 4c0 2 -4 10 -6 14c-13 21 -27 40 -43 60l-49 60s-10 10 -10 24c0 8 4 19 14 29c45 47 60 90 60 127c0 72 -57 123 -61 134c-3 6 -4 11 -4 16 c0 14 10 21 20 21c6 0 13 -3 18 -8c17 -17 165 -193 165 -193s4 -9 4 -19c0 -5 -1 -10 -4 -15c-26 -41 -62 -89 -66 -147c0 -4 -1 -9 -1 -13c0 -56 31 -93 69 -139c11 -12 37 -45 37 -57c0 -3 -2 -4 -5 -4c-2 0 -4 0 -7 1c-1 0 -2 1 -3 1c-16 6 -49 17 -78 17 c-42 0 -63 -32 -63 -73c0 -9 1 -18 4 -26c2 -9 13 -36 26 -36c8 -7 16 -15 16 -24c0 -2 -1 -4 -2 -7c-1 -4 -8 -6 -15 -6c-8 0 -18 3 -26 9z",
  "rest8": "M27 56c-15 12 -27 30 -27 51c0 37 30 67 67 67s67 -30 67 -67v-10c33 0 83 60 90 66c6 4 9 4 11 4c2 -1 12 -6 12 -16c-1 -5 -6 -21 -10 -39c0 0 -98 -351 -101 -353c-10 -8 -24 -10 -35 -10c-6 0 -29 1 -29 13c18 66 90 265 93 280c1 4 1 8 1 11c0 5 -1 9 -5 9 c-1 0 -3 0 -5 -1c-13 -7 -22 -11 -36 -15c-11 -4 -25 -7 -39 -7c-19 0 -38 6 -54 17z",
  "rest16": "M80 -209c-38 0 -80 27 -80 68c0 38 30 68 68 68c37 0 68 -30 68 -68c0 -3 0 -6 -1 -10c14 0 41 12 49 31c7 15 58 164 58 180c0 5 -2 7 -5 7c-2 0 -4 -1 -7 -2c-23 -13 -51 -22 -78 -22c-38 0 -80 27 -80 68c0 38 31 68 68 68c38 0 68 -30 68 -68v-10c34 1 84 61 91 67 c3 2 6 4 11 4c2 -1 10 -5 10 -11c0 -1 -1 -2 -1 -4c-2 -13 -27 -101 -27 -101s-19 -67 -45 -152l-116 -381c-4 -11 -9 -23 -38 -23c-22 0 -31 10 -31 18c0 1 1 2 1 3l95 283c0 1 1 2 1 3c0 3 -2 5 -4 5c-23 -12 -49 -21 -75 -21z"
};
// A single-line rhythm staff. Each event carries a printed value and a time span,
// which differ for triplets. Bravura outlines keep enlarged scores self-contained.
function drawRhythm(id, signature, lanes, caption) {
  const figure = document.getElementById(id);
  const total = lanes[0].notes.reduce((sum, note) => sum + note.span, 0);
  const longest = Math.max(...lanes.map(lane => lane.notes.length));
  const start = lanes.length > 1 ? 92 : 54;
  const width = start + Math.max(230, longest * 31);
  const height = lanes.length * 93 + 8;
  const ink = '#173d38';
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#fffdf5"/><g fill="${ink}" font-family="sans-serif">`];
  const xAt = t => start + t / total * (width-start-14);
  const line = (x,y,end,bottom,color=ink,weight=1) => parts.push(`<path d="M${x} ${y} L${end} ${bottom}" stroke="${color}" stroke-width="${weight}"/>`);
  const label = (x,y,value,size) => parts.push(`<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}">${String(value).replaceAll('&','&amp;')}</text>`);
  const glyph = (key,x,y) => parts.push(`<path transform="translate(${x} ${y}) scale(.037 -.037)" d="${rhythmOutlines[key]}"/>`);
  lanes.forEach((lane,index) => {
    const y = 55 + index*93;
    if (lane.name) label(24,y+4,lane.name,12);
    const left = start-42;
    line(left,y,width-6,y,'#a8b8ac');
    line(width-6,y-10,width-6,y+10);
    signature.split('/').forEach((n,i) => label(left+12,y-2+i*17,n,18));
    let at = 0;
    let beamStart = 0, previousGroup;
    for (const note of lane.notes) {
      const x = xAt(at);
      if (note.beam !== undefined) {
        glyph('note4',x,y);
        const stem = x+11.7;
        if (previousGroup === note.beam) line(beamStart,y-31,stem,y-31,ink,4);
        beamStart = stem;
        previousGroup = note.beam;
      } else {
        glyph((note.rest ? 'rest' : 'note')+note.value,x,y);
      }
      if (note.dot) parts.push(`<circle cx="${x+19}" cy="${y-4}" r="2.6"/>`);
      if (note.count) label(x+5,y+23,note.count,13);
      if (note.triplet) {
        const end = xAt(at+1)-4, mid = (x+end)/2;
        line(x, y-40,mid-7,y-40); line(mid+7,y-40,end,y-40);
        line(x,y-40,x,y-36); line(end,y-40,end,y-36); label(mid,y-36,'3',12);
      }
      at += note.span;
    }
  });
  parts.push('</g></svg>');
  const img = figure.querySelector('img');
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(parts.join(''));
  img.alt = caption;
  figure.querySelector('figcaption').textContent = caption;
}
