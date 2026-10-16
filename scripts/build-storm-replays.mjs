// Builds data/storm-replays.json from NHC HURDAT2 (public domain best-track archive).
// usage: node scripts/build-storm-replays.mjs <hurdat2.txt>
import fs from 'node:fs';

const SOURCE = 'https://www.nhc.noaa.gov/data/hurdat/hurdat2-1851-2025-092326.txt';
const PICKS = [
  { id: 'AL032004', slug: 'charley-2004', blurb: 'Forecast to hit Tampa Bay, turned right and came ashore near Punta Gorda, then crossed Orlando. A small, fast hurricane: the textbook lesson that the cone is the center’s uncertainty, not the storm’s size.' },
  { id: 'AL112017', slug: 'irma-2017', blurb: 'A huge Category 5 whose wind field covered the whole peninsula. Watch the 34-knot circle: you did not need the center to pass over you.' },
  { id: 'AL092022', slug: 'ian-2022', blurb: 'Category 4 landfall at Cayo Costa, then a slow crawl across central Florida. Rain and river flooding, not wind, did the lasting damage around Orlando and Seminole County.' }
];
const lines = fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/);
const num = s => { const n = Number(s); return n === -999 || !Number.isFinite(n) ? null : n; };
const out = [];
for (const pick of PICKS) {
  const i = lines.findIndex(l => l.startsWith(pick.id + ','));
  if (i < 0) throw new Error('missing ' + pick.id);
  const head = lines[i].split(',').map(s => s.trim());
  const count = Number(head[2]);
  const points = [];
  for (let k = 1; k <= count; k++) {
    const f = lines[i + k].split(',').map(s => s.trim());
    const d = f[0], t = f[1];
    const lat = parseFloat(f[4]) * (f[4].endsWith('S') ? -1 : 1);
    const lon = parseFloat(f[5]) * (f[5].endsWith('W') ? -1 : 1);
    const r34 = f.slice(8, 12).map(num).filter(v => v != null);
    points.push({
      t: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${t.slice(0, 2)}:${t.slice(2, 4)}Z`,
      id: f[2] || undefined, status: f[3], lat, lon, kt: num(f[6]), mb: num(f[7]),
      r34nm: r34.length ? Math.max(...r34) : null
    });
  }
  out.push({ id: pick.id, slug: pick.slug, name: head[1][0] + head[1].slice(1).toLowerCase(), year: Number(pick.id.slice(4)), blurb: pick.blurb, points });
}
fs.writeFileSync(new URL('../data/storm-replays.json', import.meta.url), JSON.stringify({ source: SOURCE, note: 'NHC HURDAT2 best track, 6-hourly (plus landfall records). kt = max sustained wind, mb = central pressure, r34nm = largest radius of 34-kt winds in any quadrant (nautical miles; null before 2004 or when unknown).', storms: out }, null, 1));
console.log(out.map(s => `${s.name}: ${s.points.length} pts, peak ${Math.max(...s.points.map(p => p.kt))} kt`).join('\n'));
