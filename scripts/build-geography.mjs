// Rebuild map assets from fetch-geography.py's cache, without network access.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';

const localRoutesOnly = process.argv.includes('--local-routes');
const cache = process.argv[2];
if (!localRoutesOnly && !cache) throw new Error('Usage: node scripts/build-geography.mjs CACHE | --local-routes');
const sandbox = {};
sandbox.window = sandbox;
vm.runInNewContext(fs.readFileSync('assets/vendor/d3-geo-runtime.min.js', 'utf8'), sandbox);
const d3 = sandbox.d3;
const sourceHashes = {};
const read = name => {
  const bytes = fs.readFileSync(path.join(cache, name));
  sourceHashes[name] = crypto.createHash('sha256').update(bytes).digest('hex');
  return JSON.parse(bytes);
};
const write = (name, value) => fs.writeFileSync(name, value);
const round = coords => typeof coords[0] === 'number'
  ? coords.map(v => +v.toFixed(4)) : coords.map(round);
// GeoJSON normally uses counterclockwise exteriors; D3 uses clockwise for
// polygons smaller than a hemisphere. Normalize, never delete reversed land.
function orient(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  for (const rings of polygons) {
    rings.forEach((ring, i) => {
      const large = d3.geoArea({ type: 'Polygon', coordinates: [ring] }) > 2 * Math.PI;
      if (large === (i === 0)) ring.reverse();
    });
  }
  return geometry;
}
function compact(data, props = []) {
  return { type: 'FeatureCollection', features: data.features.map(f => ({
    type: 'Feature', properties: Object.fromEntries(props.map(k => [k, f.properties?.[k]])),
    geometry: orient({ type: f.geometry.type, coordinates: round(f.geometry.coordinates) })
  })) };
}
// Simplify rings by `tolerance` degrees in unwrapped lon/lat space.
// Keep every feature, island, hole, seam vertex, and closed ring.
function simplify(ring, tolerance = .025, dropTiny = false) {
  if (ring.length < 8) return ring;
  const points = ring.map(p => p.slice());
  for (let i = 1; i < points.length; i++) {
    while (points[i][0] - points[i - 1][0] > 180) points[i][0] -= 360;
    while (points[i][0] - points[i - 1][0] < -180) points[i][0] += 360;
  }
  const keep = new Set([0, points.length - 1]);
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [x, y] = points[a], dx = points[b][0] - x, dy = points[b][1] - y;
    const denom = dx * dx + dy * dy;
    let best = tolerance * tolerance, index = -1;
    for (let i = a + 1; i < b; i++) {
      const u = denom ? Math.max(0, Math.min(1, ((points[i][0] - x) * dx + (points[i][1] - y) * dy) / denom)) : 0;
      const dist = (points[i][0] - x - u * dx) ** 2 + (points[i][1] - y - u * dy) ** 2;
      if (dist > best) { best = dist; index = i; }
    }
    if (index >= 0) { keep.add(index); stack.push([a, index], [index, b]); }
  }
  const result = ring.filter((_, i) => keep.has(i));
  return result.length >= 4 ? result : (dropTiny ? null : ring);
}
function ringAreaDeg(ring) {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(area) / 2;
}
function simplifyLandForThumb(collection, tolerance = 0.35, minAreaDeg2 = 0.08) {
  const features = [];
  for (const f of collection.features) {
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    const kept = [];
    for (const poly of polys) {
      if (ringAreaDeg(poly[0]) < minAreaDeg2) continue;
      const rings = poly.map(r => simplify(r, tolerance, true)).filter(r => r && r.length >= 4);
      if (rings.length) kept.push(rings);
    }
    if (kept.length) {
      const feat = { type: 'Feature', properties: {}, geometry: orient({ type: 'MultiPolygon', coordinates: kept }) };
      if (d3.geoArea(feat) >= 2 * Math.PI) throw new Error('Simplified land feature inverted past hemisphere');
      features.push(feat);
    }
  }
  return { type: 'FeatureCollection', features };
}
let land, countries, states, disputed;
if (localRoutesOnly) {
  vm.runInNewContext(fs.readFileSync('assets/geodata/world/world-data.js', 'utf8'), sandbox);
  ({ land, countries, disputed } = sandbox.WORLD_GEOGRAPHY);
} else {
  land = compact(read('ne_50m_land.geojson'));
  countries = compact(read('ne_50m_admin_0_countries.geojson'), ['ADMIN', 'ADM0_A3', 'CONTINENT']);
  states = compact(read('ne_50m_admin_1_states_provinces.geojson'), ['name', 'iso_3166_2', 'admin']);
  disputed = compact(read('ne_50m_admin_0_boundary_lines_disputed_areas.geojson'), ['FEATURECLA', 'BRK_NAME', 'NOTE']);
  fs.mkdirSync('assets/geodata/world', { recursive: true });
  write('assets/geodata/world/land-50m.json', JSON.stringify(land) + '\n');
  write('assets/geodata/world/world-data.js', '/* Natural Earth v5.1.2, public domain; generated by scripts/build-geography.mjs. */\nwindow.WORLD_GEOGRAPHY=' + JSON.stringify({ land, countries, disputed }) + ';\n');
}
const sphere = { type: 'Sphere' };
const eq = (w, h, prec = .1) => d3.geoEquirectangular().scale(w / (2 * Math.PI)).translate([w / 2, h / 2]).precision(prec);
const svgPath = (geometry, projection, digits) => (digits != null ? d3.geoPath(projection).digits(digits) : d3.geoPath(projection))(geometry) || '';
const thumbLand = simplifyLandForThumb(land, 0.35, 0.08);
const thumbLandPath = svgPath(thumbLand, eq(720, 360, 0.5), 1);
write('assets/geodata/world/world-land-path-simple.json', JSON.stringify({
  source: 'Natural Earth v5.1.2, 1:50 million land (simplified for 720x360 equirectangular thumbnail), public domain.',
  viewBox: '0 0 720 360',
  d: thumbLandPath
}) + '\n');
write('assets/js/lessons/world-land-path.js', '/* Natural Earth v5.1.2 50m land (simplified), public domain; equirectangular 720x360. Generated by scripts/build-geography.mjs. */\nwindow.WORLD_LAND_PATH=' + JSON.stringify(thumbLandPath) + ';\n');
const escape = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
function svg(w, h, title, desc, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" overflow="hidden" role="img" aria-labelledby="title desc"><title id="title">${escape(title)}</title><desc id="desc">${escape(desc)}</desc><metadata>Natural Earth v5.1.2, 1:50 million, public domain. Generated by scripts/build-geography.mjs. Boundaries follow the dataset's de facto policy and are not an endorsement of sovereignty claims.</metadata>${body}</svg>\n`;
}
const grid = d3.geoGraticule().step([30, 30])();
function base(proj, w, h) {
  return `<rect width="${w}" height="${h}" fill="#0c2440"/><path d="${svgPath(grid, proj)}" fill="none" stroke="#4d738a" stroke-width=".6"/><path d="${svgPath(land, proj)}" fill="#63816a" stroke="#a6b9a1" stroke-width=".5"/>`;
}
// Keep the established EHT pixel transform: x=(lon+180)*1000/360,
// y=(90-lat)*520/180. Nonuniform scaling is explicitly equirectangular.
const eht = base(eq(1000, 500), 1000, 500);
write('assets/images/lessons/eht-world-map.svg', svg(1000, 520, 'Equirectangular world map', 'Natural Earth coastlines; latitude and longitude align with observatory markers.', `<g transform="scale(1 1.04)">${eht}</g>`));
write('assets/images/lessons/clocks-and-time/world-time-base.svg', svg(800, 400, 'Equirectangular world map', 'Natural Earth coastlines for the world time laboratory.', base(eq(800, 400), 800, 400)));
const globe = d3.geoOrthographic().rotate([-15, -10]).scale(98).translate([100, 100]).precision(.1);
write('assets/images/earth-reference-globe.svg', svg(200, 200, 'Earth geographic reference', 'Orthographic globe centered on Africa and Europe. Natural Earth land, with the far hemisphere clipped.', `<circle cx="100" cy="100" r="98" fill="#126a9a"/><path d="${svgPath(land, globe)}" fill="#75a66a" stroke="#bfdaad" stroke-width=".25"/>`));
const britain = { type: 'FeatureCollection', features: countries.features.filter(f => ['GBR', 'IRL'].includes(f.properties.ADM0_A3)) };
const britainProjection = d3.geoConicConformal().parallels([50, 60]).rotate([3, 0]).fitExtent([[4, 4], [156, 236]], britain);
write('assets/images/britain-reference.svg', svg(160, 240, 'Britain and Ireland', 'Real coastlines, including offshore islands; Lambert conformal conic reference projection.', `<path d="${svgPath(britain, britainProjection)}" fill="#70b99a" stroke="#cce8d9" stroke-width=".5"/>`));

// Geographic waypoint diagrams. Lines join selected historical stops; they
// deliberately do not claim to reproduce a surveyed river or sailing track.
function waypoints(proj, stops, opts = {}) {
  const fill = opts.fill || '#ffe49b';
  const stroke = opts.stroke || '#153644';
  const textFill = opts.textFill || '#fff';
  const fontSize = opts.fontSize || 15;
  const halo = opts.halo ? ' stroke="#071626" stroke-width="3" paint-order="stroke" font-weight="600"' : '';
  return stops.map(([name, coord, dx = 8, dy = -10, anchor = 'start']) => {
    const [x, y] = proj(coord);
    const xVal = opts.round ? x.toFixed(1) : x;
    const yVal = opts.round ? y.toFixed(1) : y;
    const tx = opts.round ? (x + dx).toFixed(1) : (x + dx);
    const ty = opts.round ? (y + dy).toFixed(1) : (y + dy);
    const anchorAttr = anchor !== 'start' ? ` text-anchor="${anchor}"` : '';
    const strokeWidthAttr = opts.round ? ' stroke-width="1.4"' : '';
    return `<circle cx="${xVal}" cy="${yVal}" r="5" fill="${fill}" stroke="${stroke}"${strokeWidthAttr}/><text x="${tx}" y="${ty}"${anchorAttr} fill="${textFill}"${halo} font-family="sans-serif" font-size="${fontSize}">${escape(name)}</text>`;
  }).join('');
}
const voyageProjection = eq(1000, 500);
const outward = [[-6.35, 36.78], [-16.5, 28.4], [-23.5, 14.9], [-43.2, -22.9], [-67.7, -49.3], [-68, -52], [-70.5, -53.5], [-74, -53], [-80, -35], [-110, -12], [-150, -8], [170, 5], [144.8, 13.5], [125.7, 10.7], [124, 10.3]];
const homeward = [[124, 10.3], [125, 7], [127.4, .7], [125, -9], [95, -25], [45, -38], [18, -36], [0, -20], [-23.5, 14.9], [-20, 35], [-6.35, 36.78]];
let voyage = base(voyageProjection, 1000, 500);
voyage += `<path d="${svgPath({ type: 'LineString', coordinates: outward }, voyageProjection)}" fill="none" stroke="#ffd178" stroke-width="3"/><path d="${svgPath({ type: 'LineString', coordinates: homeward }, voyageProjection)}" fill="none" stroke="#97deff" stroke-width="3" stroke-dasharray="7 4"/>`;
voyage += waypoints(voyageProjection, [['Spain', [-6.35, 36.78]], ['Strait of Magellan', [-70.5, -53.5], 8, 18], ['Guam', [144.8, 13.5]], ['Mactan', [124, 10.3], -66, -12], ['Tidore', [127.4, .7], 8, 20], ['Cape route', [18, -36], 8, 22]]);
voyage += '<rect y="455" width="1000" height="55" fill="#0c2440"/><text x="18" y="476" fill="#ffd178" font-family="sans-serif" font-size="15">Solid: outward waypoint sequence · dashed blue: Victoria’s return under Elcano</text><text x="18" y="498" fill="#d1e0e5" font-family="sans-serif" font-size="14">Natural Earth 50m · equirectangular · approximate waypoint connections, not exact sailing tracks</text>';
write('assets/images/lessons/magellan/route.svg', svg(1000, 510, 'Magellan and Elcano: geographic waypoint map', 'Real coastline geometry with selected historical stops; ocean routes are approximate waypoint connections.', voyage));
const lewisProjection = d3.geoConicConformal().parallels([35, 50]).rotate([108, 0]).fitExtent([[25, 55], [1075, 460]], { type: 'MultiPoint', coordinates: [[-126, 38], [-89, 38], [-126, 50], [-89, 50]] }).clipExtent([[0, 0], [1100, 530]]);
const lewisStops = [['1 · St. Louis', [-90.2, 38.63], -105, 20], ['2 · Fort Mandan', [-101.28, 47.3], 8, -12], ['3 · Great Falls', [-111.3, 47.5], -25, -12], ['4 · Lolo Pass', [-114.58, 46.64], -65, 28], ['5 · Fort Clatsop', [-123.88, 46.13], -25, 28]];
let lewis = base(lewisProjection, 1100, 530);
lewis += `<path d="${svgPath({ type: 'LineString', coordinates: lewisStops.map(s => s[1]) }, lewisProjection)}" fill="none" stroke="#ffe49b" stroke-width="3" stroke-dasharray="7 4"/>` + waypoints(lewisProjection, lewisStops);
lewis += '<rect y="0" width="1100" height="40" fill="#0c2440"/><text x="24" y="28" fill="#fff" font-family="sans-serif" font-size="22">Lewis and Clark · selected outbound stops, 1804–1805</text><rect y="484" width="1100" height="46" fill="#0c2440"/><text x="24" y="511" fill="#d1e0e5" font-family="sans-serif" font-size="15">Natural Earth 50m · Lambert conformal conic · dashed lines connect stops, not the expedition’s exact trail</text>';
write('assets/images/lessons/lewis-and-clark/route.svg', svg(1100, 530, 'Lewis and Clark geographic waypoint map', 'Real coastal geography and geographic locations of selected stops. Connections are not surveyed routes or river paths.', lewis));

// Amelia Earhart 1937 world flight waypoint map (Natural Earth 50m equirectangular, rotated so Lae → Howland is unbroken)
const earhartProjection = d3.geoEquirectangular().rotate([-20, 0]).scale(1000 / (2 * Math.PI)).translate([500, 275]).precision(0.1).clipExtent([[0, 42], [1000, 465]]);
const earhartCompleted = [
  [-122.27, 37.80], [-80.19, 25.76], [-66.11, 18.47], [-35.21, -5.79],
  [-17.44, 14.69], [32.56, 15.50], [67.01, 24.86], [88.36, 22.57],
  [103.82, 1.35], [130.84, -12.46], [147.00, -6.73]
];
const earhartFinal = [[147.00, -6.73], [-176.62, 0.81]];
const eqY = earhartProjection([0, 0])[1];
const [howX, howY] = earhartProjection([-176.62, 0.81]);
let earhart = base(earhartProjection, 1000, 465);
earhart += `<line x1="0" y1="${eqY.toFixed(1)}" x2="1000" y2="${eqY.toFixed(1)}" stroke="#e5a93c" stroke-width="1" stroke-dasharray="5 5" opacity="0.65"/>`;
earhart += `<text x="200" y="${(eqY - 7).toFixed(1)}" fill="#e5a93c" stroke="#071626" stroke-width="3" paint-order="stroke" font-family="sans-serif" font-size="11" font-weight="700">0° EQUATOR</text>`;
earhart += `<path d="${svgPath({ type: 'LineString', coordinates: earhartCompleted }, earhartProjection)}" fill="none" stroke="#f5882c" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
earhart += `<path d="${svgPath({ type: 'LineString', coordinates: earhartFinal }, earhartProjection)}" fill="none" stroke="#4ee2ec" stroke-width="3" stroke-dasharray="6 4" stroke-linecap="round"/>`;
earhart += waypoints(earhartProjection, [
  ['Oakland', [-122.27, 37.80], 0, -11, 'middle'],
  ['Miami', [-80.19, 25.76], -8, -10, 'end'],
  ['Natal', [-35.21, -5.79], -8, 16, 'end'],
  ['Dakar', [-17.44, 14.69], -8, -8, 'end'],
  ['Khartoum', [32.56, 15.50], 0, -10, 'middle'],
  ['Karachi', [67.01, 24.86], 0, -10, 'middle'],
  ['Singapore', [103.82, 1.35], -8, 16, 'end'],
  ['Darwin', [130.84, -12.46], 0, 18, 'middle'],
  ['Lae (July 2)', [147.00, -6.73], -8, -10, 'end']
], { fill: '#f5882c', stroke: '#fff', fontSize: 12, halo: true, round: true });
earhart += `<circle cx="${howX.toFixed(1)}" cy="${howY.toFixed(1)}" r="8" fill="none" stroke="#ff5252" stroke-width="2.4"/><circle cx="${howX.toFixed(1)}" cy="${howY.toFixed(1)}" r="3.2" fill="#4ee2ec" stroke="#fff" stroke-width="1"/>`;
earhart += `<line x1="${(howX - 11).toFixed(1)}" y1="${(howY + 26).toFixed(1)}" x2="${(howX + 11).toFixed(1)}" y2="${(howY - 26).toFixed(1)}" stroke="#ffeb3b" stroke-width="2" stroke-dasharray="3 3"/>`;
earhart += `<text x="${(howX - 12).toFixed(1)}" y="${(howY - 12).toFixed(1)}" text-anchor="end" fill="#ff9e96" stroke="#071626" stroke-width="3" paint-order="stroke" font-family="sans-serif" font-size="12" font-weight="700">Howland I.</text>`;
earhart += `<text x="${(howX - 12).toFixed(1)}" y="${(howY + 34).toFixed(1)}" text-anchor="end" fill="#fff59d" stroke="#071626" stroke-width="3" paint-order="stroke" font-family="sans-serif" font-size="11" font-weight="700">157°–337° line</text>`;
earhart += '<rect y="0" width="1000" height="42" fill="#0c2440"/><text x="20" y="28" fill="#fff" font-family="sans-serif" font-size="19" font-weight="700">Amelia Earhart · 1937 equatorial flight &amp; Pacific leg</text>';
earhart += '<rect y="465" width="1000" height="60" fill="#0c2440"/><line x1="20" y1="484" x2="54" y2="484" stroke="#f5882c" stroke-width="3"/><text x="64" y="489" fill="#ffd3a8" font-family="sans-serif" font-size="14">Solid orange: completed stops (Oakland → Lae) · dashed cyan: final leg to Howland Island</text><text x="20" y="512" fill="#d1e0e5" font-family="sans-serif" font-size="13">Natural Earth 50m · equirectangular · approximate stop connections, not exact flight tracks</text>';
write('assets/images/lessons/amelia-earhart/route.svg', svg(1000, 525, 'Amelia Earhart: 1937 world flight waypoint map', 'Real coastlines with selected 1937 flight stops from Oakland to Lae and the final Pacific leg toward Howland Island.', earhart));

// David Livingstone African expeditions & watersheds (Natural Earth 50m Mercator)
const livingstoneProjection = d3.geoMercator().fitExtent([[40, 56], [960, 558]], { type: 'MultiPoint', coordinates: [[8, -36], [44, 3]] }).clipExtent([[0, 44], [1000, 575]]);
const livCoast = [
  [23.43, -27.46], [25.86, -17.92], [23.2, -15.2], [13.23, -8.84],
  [23.2, -15.2], [25.86, -17.92], [32.9, -16.1], [36.89, -17.88]
];
const livCentral = [[39.7, -10.3], [35.2, -12.1], [34.4, -14.0], [29.68, -4.91], [26.18, -4.22], [29.68, -4.91], [30.65, -12.90]];
const livReturn = [[30.65, -12.90], [33.5, -10.8], [36.8, -8.2], [38.90, -6.44]];
const zambezi = [[23.2, -14.0], [25.86, -17.92], [30.4, -15.6], [33.5, -16.1], [36.89, -17.88]];
const lualaba = [[26.1, -10.5], [26.18, -4.22], [25.2, 0.5]];
let livingstone = base(livingstoneProjection, 1000, 575);
livingstone += `<path d="${svgPath(countries, livingstoneProjection)}" fill="none" stroke="#85a28c" stroke-width="0.6" opacity="0.55"/>`;
livingstone += `<path d="${svgPath({ type: 'LineString', coordinates: zambezi }, livingstoneProjection)}" fill="none" stroke="#53b8d4" stroke-width="2.2" opacity="0.9"/>`;
livingstone += `<path d="${svgPath({ type: 'LineString', coordinates: lualaba }, livingstoneProjection)}" fill="none" stroke="#53b8d4" stroke-width="2" stroke-dasharray="3 3" opacity="0.9"/>`;
livingstone += `<path d="${svgPath({ type: 'LineString', coordinates: livCoast }, livingstoneProjection)}" fill="none" stroke="#e5a93c" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
livingstone += `<path d="${svgPath({ type: 'LineString', coordinates: livCentral }, livingstoneProjection)}" fill="none" stroke="#e05a47" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>`;
livingstone += `<path d="${svgPath({ type: 'LineString', coordinates: livReturn }, livingstoneProjection)}" fill="none" stroke="#9be382" stroke-width="3" stroke-dasharray="6 4" stroke-linecap="round"/>`;
livingstone += waypoints(livingstoneProjection, [
  ['Kuruman', [23.43, -27.46], 10, 4, 'start'],
  ['Luanda (1854)', [13.23, -8.84], -10, -8, 'end'],
  ['Mosi-oa-Tunya (1855)', [25.86, -17.92], -10, 18, 'end'],
  ['Quelimane (1856)', [36.89, -17.88], 10, 10, 'start'],
  ['Nyangwe (1871)', [26.18, -4.22], -10, -8, 'end'],
  ['Ujiji (1871)', [29.68, -4.91], 10, -6, 'start'],
  ['Chitambo (1873)', [30.65, -12.90], -10, 16, 'end'],
  ['Bagamoyo (1874)', [38.90, -6.44], 10, 4, 'start']
], { fill: '#ffe49b', stroke: '#153644', fontSize: 13, halo: true, round: true });
const [vicX, vicY] = livingstoneProjection([33.0, -1.0]);
livingstone += `<circle cx="${vicX.toFixed(1)}" cy="${vicY.toFixed(1)}" r="4" fill="#53b8d4" stroke="#fff" stroke-width="1"/><text x="${(vicX + 9).toFixed(1)}" y="${(vicY + 4).toFixed(1)}" fill="#9ee8f2" stroke="#071626" stroke-width="3" paint-order="stroke" font-family="sans-serif" font-size="12">L. Victoria</text>`;
livingstone += '<rect y="0" width="1000" height="44" fill="#0c2440"/><text x="20" y="30" fill="#fff" font-family="sans-serif" font-size="20" font-weight="700">David Livingstone · selected expedition stops (1841–1874)</text>';
livingstone += '<rect y="575" width="1000" height="65" fill="#0c2440"/><text x="20" y="597" fill="#ffd178" font-family="sans-serif" font-size="13.5">Gold: 1852–56 crossing · Red: 1866–73 watershed search · Dashed green: Chuma &amp; Susi’s 1873–74 memorial march · Blue: rivers</text><text x="20" y="622" fill="#d1e0e5" font-family="sans-serif" font-size="13">Natural Earth 50m · Mercator · boundaries shown are modern reference coastlines; stop links are approximate schematics</text>';
write('assets/images/lessons/david-livingstone/route.svg', svg(1000, 640, 'David Livingstone: African expeditions waypoint map', 'Real southern and central African coastlines with selected stops from 1841 to 1874.', livingstone));

// Marco Polo Eurasian Silk Road & maritime return (Natural Earth 50m equirectangular)
const poloProjection = d3.geoEquirectangular().fitExtent([[24, 52], [976, 488]], { type: 'MultiPoint', coordinates: [[4, -8], [134, 54]] }).clipExtent([[0, 44], [1000, 500]]);
const poloOutbound = [[12.32, 45.44], [35.07, 32.92], [46.29, 38.08], [56.46, 27.06], [66.90, 36.76], [75.99, 39.47], [94.66, 40.14], [116.18, 42.36], [116.40, 39.90]];
const poloReturn = [[118.68, 24.87], [109.20, 13.80], [97.00, 5.20], [80.70, 7.00], [75.78, 11.25], [56.46, 27.06], [39.72, 41.00], [28.98, 41.01], [12.32, 45.44]];
let polo = base(poloProjection, 1000, 500);
polo += `<path d="${svgPath({ type: 'LineString', coordinates: poloOutbound }, poloProjection)}" fill="none" stroke="#f5ba42" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
polo += `<path d="${svgPath({ type: 'LineString', coordinates: poloReturn }, poloProjection)}" fill="none" stroke="#38c6d9" stroke-width="3" stroke-dasharray="7 4" stroke-linejoin="round" stroke-linecap="round"/>`;
polo += waypoints(poloProjection, [
  ['Venice', [12.32, 45.44], -6, -11, 'end'],
  ['Acre', [35.07, 32.92], -8, 16, 'end'],
  ['Tabriz', [46.29, 38.08], 0, -11, 'middle'],
  ['Hormuz', [56.46, 27.06], 10, 6, 'start'],
  ['Pamirs / Balkh', [66.90, 36.76], -4, -12, 'middle'],
  ['Kashgar', [75.99, 39.47], 4, 17, 'start'],
  ['Dunhuang', [94.66, 40.14], 0, -11, 'middle'],
  ['Shangdu', [116.18, 42.36], 0, -11, 'middle'],
  ['Khanbaliq', [116.40, 39.90], 10, 4, 'start'],
  ['Quanzhou', [118.68, 24.87], 10, 4, 'start'],
  ['Sumatra', [97.00, 5.20], -10, 14, 'end'],
  ['Malabar', [75.78, 11.25], -10, 12, 'end']
], { fill: '#ffe49b', stroke: '#153644', fontSize: 12.5, halo: true, round: true });
polo += '<rect y="0" width="1000" height="44" fill="#0c2440"/><text x="20" y="30" fill="#fff" font-family="sans-serif" font-size="20" font-weight="700">Marco Polo · overland Silk Road &amp; maritime return (1271–1295)</text>';
polo += '<rect y="500" width="1000" height="60" fill="#0c2440"/><text x="20" y="522" fill="#f5ba42" font-family="sans-serif" font-size="14">Solid gold: 1271–1275 outbound overland · dashed cyan: 1291–1295 maritime return via Indian Ocean</text><text x="20" y="544" fill="#d1e0e5" font-family="sans-serif" font-size="13">Natural Earth 50m · equirectangular · approximate stop connections, not surveyed medieval routes</text>';
write('assets/images/lessons/marco-polo/route.svg', svg(1000, 560, 'Marco Polo: Eurasian Silk Road and return waypoint map', 'Real Eurasian and Indian Ocean coastlines with selected stops from 1271 to 1295.', polo));

if (!localRoutesOnly) {
const usa = countries.features.find(f => f.properties.ADM0_A3 === 'USA');
const ny = states.features.find(f => f.properties['iso_3166_2'] === 'US-NY');
if (!usa || !ny) throw new Error('Missing USA or New York geometry');
const northAmerica = { type: 'FeatureCollection', features: countries.features.filter(f => f.properties.CONTINENT === 'North America') };
const usStates = { type: 'FeatureCollection', features: states.features.filter(f => f.properties.admin === 'United States of America') };
for (const [level, title, geometry, projection, highlight] of [
  ['continent', 'Example: North America', northAmerica, d3.geoAzimuthalEqualArea().rotate([100, -45]), usa],
  ['country', 'Example: United States', usa, d3.geoAlbersUsa(), ny],
  ['state', 'Example: New York State', ny, d3.geoConicConformal().parallels([40, 45]).rotate([75, 0]), null]
]) {
  projection.fitExtent([[30, 55], [930, 445]], geometry);
  let body = `<rect width="960" height="500" fill="#0c2440"/><path d="${svgPath(geometry, projection)}" fill="#789257" stroke="#c3d5ac" stroke-width="1"/>`;
  if (level === 'continent') body += `<path d="${svgPath(northAmerica, projection)}" fill="none" stroke="#c3d5ac" stroke-width=".7"/>`;
  if (level === 'country') body += `<path d="${svgPath(usStates, projection)}" fill="none" stroke="#c3d5ac" stroke-width=".7"/>`;
  if (highlight) body += `<path d="${svgPath(highlight, projection)}" fill="#a6ae68" stroke="#ffe49b" stroke-width="2"/>`;
  if (level === 'state') {
    const [x, y] = projection([-74.006, 40.7128]);
    body += `<circle cx="${x}" cy="${y}" r="5" fill="#ffe49b"/><text x="${x - 12}" y="${y - 12}" text-anchor="end" fill="#fff" font-family="sans-serif" font-size="16">New York City</text>`;
  }
  body += `<text x="24" y="30" fill="#fff" font-family="sans-serif" font-size="22">${title}</text><text x="24" y="482" fill="#d1e0e5" font-family="sans-serif" font-size="14">Natural Earth 50m · real reference geography · selected example, not your detected location</text>`;
  write(`assets/images/pale-blue-dot/scene-${level}.svg`, svg(960, 500, title, 'A geographic reference example with real coastlines and boundaries; not a detected user location.', body));
}

// Pangaea coastlines reuse the top-level simplify() helper.
const times = Array.from({ length: 25 }, (_, i) => i * 10);
for (const t of times) {
  const data = compact(read(`coastlines_${t}ma.json`));
  for (const f of data.features) {
    const g = f.geometry;
    if (g.type === 'Polygon') g.coordinates = g.coordinates.map(r => simplify(r));
    if (g.type === 'MultiPolygon') g.coordinates = g.coordinates.map(p => p.map(r => simplify(r)));
    orient(g);
  }
  data.reconstruction = { model: 'MULLER2019', timeMa: t, anchorPlateId: 0, kind: 'reconstructed modern coastline outlines', simplificationDegrees: .025 };
  write(`assets/geodata/pangaea/coastlines_${t}ma_simple.json`, JSON.stringify(data) + '\n');
}
// The former seven-frame bundle and unreferenced raw snapshots have been
// retired. Only these age-stamped JSON assets are used by lessons.
write('assets/geodata/world/sources.json', JSON.stringify({
  checked: '2026-10-12', naturalEarth: { version: '5.1.2', scale: '1:50 million', license: 'public domain', source: 'https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2/geojson', policy: 'https://www.naturalearthdata.com/about/disputed-boundaries-policy/' },
  pangaea: { model: 'MULLER2019', agesMa: times, source: 'https://gws.gplates.org/reconstruct/coastlines/', license: 'EarthByte CC BY 4.0', caveat: 'Reconstructed modern outlines, not independently reconstructed ancient shorelines; no cross-fade or invented intermediate geography.' },
  sha256: sourceHashes
}, null, 2) + '\n');
console.log('Built world maps and 25 Pangaea reconstruction snapshots.');
} else {
  console.log('Built route and world SVGs from local Natural Earth data.');
}
