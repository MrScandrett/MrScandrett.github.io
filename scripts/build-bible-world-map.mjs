// Generates assets/js/bible-world-map.js: projected coastline paths + ancient-realm polygons + wiki text.
// Coastlines: Natural Earth 50m via world-atlas (public domain). Realm outlines are hand-drawn approximations.
import fs from 'node:fs';
import pc from 'polygon-clipping';
const src = process.argv[2];
const topo = JSON.parse(fs.readFileSync(src, 'utf8'));
const [sx, sy] = topo.transform.scale, [tx, ty] = topo.transform.translate;
const arcs = topo.arcs.map(a => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
const ring = idx => idx.flatMap((i, k) => { const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i]; return k ? a.slice(1) : a; });
const B = { w: 4, e: 62, s: 9, n: 47 }, K = Math.cos(28 * Math.PI / 180), S = 17;
const W = Math.round((B.e - B.w) * K * S), H = Math.round((B.n - B.s) * S);
const P = ([lo, la]) => [(lo - B.w) * K * S, (B.n - la) * S];
const path = pts => 'M' + pts.map(p => P(p).map(v => v.toFixed(1)).join(' ')).join('L') + 'Z';
const inBox = r => r.some(([x, y]) => x > B.w - 3 && x < B.e + 3 && y > B.s - 3 && y < B.n + 3);
let base = '';
const landPolys = [];
for (const g of topo.objects.countries.geometries) {
  const polys = g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : [];
  for (const p of polys) { const r = ring(p[0]); if (inBox(r) && r.length > 6) { base += path(r); landPolys.push(p.map(h => ring(h).map(([x, y]) => [x, y]))); } }
}
const realms = JSON.parse(fs.readFileSync(new URL('./bible-world-realms.json', import.meta.url)));
// Smooth hand-drawn outlines (Chaikin corner cutting), then clip to real land so coasts follow true shorelines.
const chaikin = (pts, n) => { for (let k = 0; k < n; k++) { const o = []; pts.forEach((a, i) => { const b = pts[(i + 1) % pts.length]; o.push([.75 * a[0] + .25 * b[0], .75 * a[1] + .25 * b[1]], [.25 * a[0] + .75 * b[0], .25 * a[1] + .75 * b[1]]); }); pts = o; } return pts; };
const closed = r => (r[0][0] === r.at(-1)[0] && r[0][1] === r.at(-1)[1]) ? r : [...r, r[0]];
const land = pc.union(...landPolys.map(p => p.map(closed)).map(p => [p]).map(p => p[0]).map(x => [x]).map(x => x[0]).map(x => [x]));
realms.forEach(r => { const sm = closed(chaikin(r.poly, 4)); const clipped = pc.intersection([sm], land);
  const P2 = ([lo, la]) => P([lo, la]); r.d = clipped.map(poly => poly.map(rg => 'M' + rg.map(q => P2(q).map(v => v.toFixed(1)).join(' ')).join('L') + 'Z').join('')).join(''); const c = r.poly.map(P); r.label = [c.reduce((a, p) => a + p[0], 0) / c.length, c.reduce((a, p) => a + p[1], 0) / c.length].map(v => +v.toFixed(0)); delete r.poly; });
fs.writeFileSync('assets/js/bible-world-map-data.js', 'window.BIBLE_WORLD_MAP=' + JSON.stringify({ w: W, h: H, base, realms }) + ';\n');
console.log(W, H, base.length, realms.length);
