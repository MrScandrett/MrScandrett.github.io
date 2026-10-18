/* Solar Voyage viewer: a real-time, SpaceEngine-style window on each solar-system stop.
 *
 * One dependency-free WebGL 1 file, so it runs on school Chromebooks, iPads and phones.
 * - Planet stops ray-trace the globe in one full-screen pass: oblate shape, spacecraft-based
 *   surface map, soft terminator, atmosphere glow (sunset-coloured at the limb), Saturn's
 *   rings with shadows both ways, moons with their shadows and eclipses, Earth's ocean glint,
 *   clouds and city lights.
 * - Belt stops show the system from above: a simulated population of asteroids or Kuiper
 *   Belt objects whose Kepler orbits are solved on the GPU, so the Trojans ride with Jupiter,
 *   the Hildas trace their triangle and the Plutinos keep clear of Neptune.
 * - The sky is the real star catalog (assets/data/sky/allsky.json: positions and B−V colour)
 *   over ESO's Milky Way panorama, oriented in true equatorial coordinates.
 * Ephemerides are low-precision mean elements: right for lighting, seasons and where the Sun
 * sits among the stars, not for navigation. The page keeps its photo as the no-WebGL fallback.
 */
(() => {
  'use strict';
  const stop = document.body.dataset.solarStop;
  const win = document.querySelector('.sv-window');
  if (!stop || !win || win.querySelector('.sv-viewer')) return;
  const SRC = (document.currentScript && document.currentScript.src) || location.href;
  const ROOT = new URL('../../../', SRC);
  const TEX = new URL('assets/textures/solar-system/', ROOT).href;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- small vector kit ---------- */
  const D2R = Math.PI / 180, TAU = Math.PI * 2;
  const EPS = 23.4392911 * D2R, cE = Math.cos(EPS), sE = Math.sin(EPS);
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const norm = a => mul(a, 1 / (len(a) || 1));
  const eclToEq = v => [v[0], v[1] * cE - v[2] * sE, v[1] * sE + v[2] * cE];
  const ECL_N = [0, -sE, cE];
  const radec = (ra, dec) => [Math.cos(dec * D2R) * Math.cos(ra * D2R), Math.cos(dec * D2R) * Math.sin(ra * D2R), Math.sin(dec * D2R)];
  const toBody = (v, B) => [dot(v, B[0]), dot(v, B[1]), dot(v, B[2])];
  const fromBody = (v, B) => add(add(mul(B[0], v[0]), mul(B[1], v[1])), mul(B[2], v[2]));
  const dayOf = ms => ms / 86400000 + 2440587.5 - 2451545.0; // days since J2000.0
  const dayAt = iso => dayOf(Date.parse(iso));
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  let seed = 20261018;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(TAU * rnd());
  const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1000, 7) / 1000;

  /* ---------- orbits: a AU, e, i, node, ϖ (longitude of perihelion), L0 at J2000, period (days) ---------- */
  const ORBIT = {
    mercury: [0.38710, 0.20563, 7.005, 48.331, 77.456, 252.251, 87.969],
    venus: [0.72333, 0.00677, 3.395, 76.680, 131.564, 181.980, 224.701],
    earth: [1.00000, 0.01671, 0.000, 0.000, 102.937, 100.464, 365.256],
    mars: [1.52368, 0.09340, 1.850, 49.558, 336.060, 355.453, 686.980],
    jupiter: [5.20289, 0.04839, 1.304, 100.474, 14.728, 34.396, 4332.59],
    saturn: [9.53668, 0.05386, 2.486, 113.662, 92.599, 49.954, 10759.2],
    uranus: [19.18916, 0.04726, 0.773, 74.017, 170.954, 313.238, 30688.5],
    neptune: [30.06992, 0.00859, 1.770, 131.784, 44.965, 304.880, 60182]
  };
  const elements = ([a, e, i, node, peri, L0, P]) => ({ a, e, i, node, peri, L0, n: 360 / P, P });
  // Small bodies: elements plus a perihelion date (positions are approximate).
  function smallBody(a, e, i, node, argp, perihelion) {
    const P = 365.25636 * Math.pow(a, 1.5), peri = node + argp;
    return { a, e, i, node, peri, P, n: 360 / P, L0: peri - (360 / P) * dayAt(perihelion) };
  }
  function kepler(M, e) {
    let E = M + e * Math.sin(M);
    for (let k = 0; k < 6; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    return E;
  }
  // Heliocentric position (AU, J2000 equatorial).
  function helio(el, d) {
    const M = (((el.L0 + el.n * d - el.peri) % 360) + 360) % 360 * D2R;
    const E = kepler(M, el.e);
    const xv = el.a * (Math.cos(E) - el.e), yv = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
    const r = Math.hypot(xv, yv), u = Math.atan2(yv, xv) + (el.peri - el.node) * D2R;
    const O = el.node * D2R, i = el.i * D2R;
    return eclToEq([r * (Math.cos(O) * Math.cos(u) - Math.sin(O) * Math.sin(u) * Math.cos(i)),
      r * (Math.sin(O) * Math.cos(u) + Math.cos(O) * Math.sin(u) * Math.cos(i)), r * Math.sin(u) * Math.sin(i)]);
  }
  // Earth's Moon, geocentric (Astronomical Almanac low-precision series), in Earth radii.
  function moonGeo(d) {
    const T = d / 36525, s = x => Math.sin(x * D2R), c = x => Math.cos(x * D2R);
    const lam = 218.32 + 481267.881 * T + 6.29 * s(135.0 + 477198.87 * T) - 1.27 * s(259.3 - 413335.36 * T)
      + 0.66 * s(235.7 + 890534.22 * T) + 0.21 * s(269.9 + 954397.74 * T) - 0.19 * s(357.5 + 35999.05 * T) - 0.11 * s(186.5 + 966404.03 * T);
    const bet = 5.13 * s(93.3 + 483202.02 * T) + 0.28 * s(228.2 + 960400.89 * T) - 0.28 * s(318.3 + 6003.15 * T) - 0.17 * s(217.6 - 407332.21 * T);
    const par = 0.9508 + 0.0518 * c(135.0 + 477198.87 * T) + 0.0095 * c(259.3 - 413335.36 * T) + 0.0078 * c(235.7 + 890534.22 * T) + 0.0028 * c(269.9 + 954397.74 * T);
    const r = 1 / Math.sin(par * D2R);
    return eclToEq([r * c(bet) * c(lam), r * c(bet) * s(lam), r * s(bet)]);
  }

  /* ---------- the stops ---------- */
  // km = equatorial radius, f = flattening, pole = IAU north pole (RA, Dec), W = prime meridian (deg, deg/day).
  const PLANETS = {
    mercury: { name: 'Mercury', kind: 'Rocky planet · 1st from the Sun', km: 2439.7, f: 0, pole: [281.0103, 61.4155], W: [329.5988, 6.1385108], g: 3.7, tex: 'mercury', hi: 1, avg: [120, 112, 104], dist: 3.6 },
    venus: { name: 'Venus', kind: 'Rocky planet · 2nd from the Sun', km: 6051.8, f: 0, pole: [272.76, 67.16], W: [160.20, -1.4813688], g: 8.87, tex: 'venus', avg: [215, 180, 120], atm: [1.0, 0.82, 0.5, 1.15], atmH: 0.035, dusk: [1.0, 0.55, 0.25], dist: 3.6, note: 'Map: Venus’s cloud tops, which hide the surface.' },
    earth: { name: 'Earth', kind: 'Rocky planet · 3rd from the Sun', km: 6378.1, f: 0.00335, pole: [0, 90], W: [190.147, 360.9856235], g: 9.81, tex: 'earth-day', hi: 1, earth: 1, avg: [40, 60, 90], atm: [0.28, 0.52, 1.0, 1.25], atmH: 0.018, dusk: [1.0, 0.42, 0.18], dist: 3.4,
      moons: [{ name: 'Moon', km: 1737.4, aKm: 384400, P: 27.321661, earthMoon: 1, color: [0.55, 0.55, 0.55] }] },
    mars: { name: 'Mars', kind: 'Rocky planet · 4th from the Sun', km: 3396.2, f: 0.00589, pole: [317.681, 52.887], W: [176.630, 350.89198226], g: 3.72, tex: 'mars', hi: 1, avg: [170, 100, 70], atm: [0.95, 0.62, 0.42, 0.55], atmH: 0.012, dusk: [0.45, 0.62, 1.0], dist: 3.5,
      moons: [{ name: 'Phobos', km: 11.1, aKm: 9376, P: 0.31891, color: [0.3, 0.27, 0.25] }, { name: 'Deimos', km: 6.2, aKm: 23463, P: 1.26244, color: [0.36, 0.33, 0.3] }] },
    jupiter: { name: 'Jupiter', kind: 'Gas giant · 5th from the Sun', km: 71492, f: 0.06487, pole: [268.057, 64.495], W: [284.95, 870.536], g: 24.79, tex: 'jupiter', hi: 1, gas: 1, avg: [200, 170, 135], atm: [0.85, 0.78, 0.68, 0.5], atmH: 0.012, dist: 3.8,
      moons: [{ name: 'Io', km: 1821.6, aKm: 421700, P: 1.769138, color: [0.85, 0.75, 0.4] }, { name: 'Europa', km: 1560.8, aKm: 671034, P: 3.551181, color: [0.8, 0.75, 0.68] },
        { name: 'Ganymede', km: 2634.1, aKm: 1070412, P: 7.154553, color: [0.5, 0.47, 0.43] }, { name: 'Callisto', km: 2410.3, aKm: 1882709, P: 16.689018, color: [0.32, 0.29, 0.26] }] },
    saturn: { name: 'Saturn', kind: 'Gas giant · 6th from the Sun', km: 60268, f: 0.09796, pole: [40.589, 83.537], W: [38.90, 810.7939024], g: 10.44, tex: 'saturn', hi: 1, gas: 1, avg: [210, 190, 150], rings: [1.171, 2.331], atm: [0.95, 0.85, 0.62, 0.45], atmH: 0.012, dist: 6.6, pitch: 0.42,
      moons: [{ name: 'Titan', km: 2574.7, aKm: 1221870, P: 15.945, color: [0.8, 0.6, 0.3] }, { name: 'Rhea', km: 763.8, aKm: 527108, P: 4.518, color: [0.75, 0.73, 0.7] },
        { name: 'Enceladus', km: 252.1, aKm: 237948, P: 1.370, color: [0.95, 0.95, 0.95] }, { name: 'Mimas', km: 198.2, aKm: 185539, P: 0.942, color: [0.7, 0.7, 0.7] }] },
    uranus: { name: 'Uranus', kind: 'Ice giant · 7th from the Sun', km: 25559, f: 0.0229, pole: [257.311, -15.175], W: [203.81, -501.1600928], g: 8.87, tex: 'uranus', gas: 1, avg: [160, 210, 220], atm: [0.55, 0.85, 0.95, 0.9], atmH: 0.02, dist: 3.8,
      moons: [{ name: 'Titania', km: 788.4, aKm: 435910, P: 8.706, color: [0.6, 0.57, 0.55] }, { name: 'Oberon', km: 761.4, aKm: 583520, P: 13.463, color: [0.55, 0.52, 0.5] },
        { name: 'Ariel', km: 578.9, aKm: 190900, P: 2.520, color: [0.7, 0.68, 0.66] }, { name: 'Miranda', km: 235.8, aKm: 129390, P: 1.413, color: [0.65, 0.65, 0.65] }] },
    neptune: { name: 'Neptune', kind: 'Ice giant · 8th from the Sun', km: 24764, f: 0.0171, pole: [299.36, 43.46], W: [249.978, 541.1397757], g: 11.15, tex: 'neptune', gas: 1, avg: [60, 90, 200], atm: [0.35, 0.55, 1.0, 0.95], atmH: 0.02, dist: 3.8,
      moons: [{ name: 'Triton', km: 1353.4, aKm: 354759, P: -5.877, tilt: 23, color: [0.75, 0.7, 0.68] }] }
  };
  const SYSTEMS = {
    'asteroid-belt': {
      name: 'The asteroid belt', planets: ['mercury', 'venus', 'earth', 'mars', 'jupiter'], dist: 13.5, pitch: 1.05, minD: 0.3, maxD: 60, rate: 3,
      named: { Ceres: smallBody(2.7675, 0.0758, 10.59, 80.31, 73.6, '2022-12-07'), Vesta: smallBody(2.3615, 0.0887, 7.14, 103.81, 151.2, '2021-12-26') },
      pops: [
        { id: 'main', label: 'Main belt', color: [0.86, 0.68, 0.48], note: 'Most asteroids orbit 2.1–3.3 AU from the Sun. Jupiter’s pull clears the Kirkwood gaps at 2.50, 2.82, 2.95 and 3.28 AU.' },
        { id: 'trojan', label: 'Jupiter Trojans', color: [0.55, 0.85, 0.55], note: 'Two swarms share Jupiter’s orbit, 60° ahead of it and 60° behind, where the pulls of the Sun and Jupiter balance.' },
        { id: 'hilda', label: 'Hildas', color: [0.78, 0.62, 1.0], note: 'Hildas go around the Sun 3 times for every 2 Jupiter orbits. Their farthest points stay away from Jupiter, so together they trace a triangle.' }
      ],
      card: [['Showing', 'about 11,000 simulated asteroids'], ['Real belt', 'about 1–2 million wider than 1 km'], ['All of it', 'less mass than our Moon']]
    },
    'kuiper-belt': {
      name: 'The Kuiper Belt', planets: ['earth', 'jupiter', 'saturn', 'uranus', 'neptune'], dist: 125, pitch: 0.95, minD: 2, maxD: 600, rate: 4,
      named: { Pluto: smallBody(39.482, 0.2488, 17.16, 110.30, 113.83, '1989-09-05'), Eris: smallBody(67.86, 0.4361, 44.04, 35.95, 151.64, '2257-07-01'),
        Haumea: smallBody(43.13, 0.1912, 28.21, 122.17, 239.04, '2133-04-01'), Makemake: smallBody(45.43, 0.1610, 28.98, 79.62, 294.8, '1880-01-01') },
      pops: [
        { id: 'classical', label: 'Classical belt', color: [0.62, 0.84, 1.0], note: 'Most objects follow calm, nearly circular orbits between 42 and 48 AU.' },
        { id: 'plutino', label: 'Plutinos', color: [1.0, 0.7, 0.42], note: 'Like Pluto, Plutinos orbit twice for every 3 Neptune orbits. At their closest to the Sun, Neptune is always far away.' },
        { id: 'scattered', label: 'Scattered disk', color: [0.8, 0.66, 1.0], note: 'Long, tilted orbits flung outward by Neptune long ago. Eris lives here.' }
      ],
      card: [['Showing', 'about 8,500 simulated objects'], ['Real belt', 'over 100,000 wider than 100 km'], ['Light from the Sun', 'about 5½ hours to get here']]
    }
  };
  const planet = PLANETS[stop];
  const system = SYSTEMS[stop];
  if (!planet && !system) return;
  const MODE = planet ? 'planet' : 'system';

  /* ---------- WebGL ---------- */
  const canvas = document.createElement('canvas');
  canvas.className = 'sv-canvas';
  const gl = canvas.getContext('webgl', { antialias: MODE === 'system', alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  if (!gl) return;
  const derivs = gl.getExtension('OES_standard_derivatives');
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  // No GPU (virtual machines, remote desktops): draw small and only on demand.
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const software = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '');
  const PREC = hp && hp.precision > 0 ? 'precision highp float;\n' : 'precision mediump float;\n';
  const DERIV = derivs ? '#extension GL_OES_standard_derivatives : enable\n#define HAS_D 1\n' : '';

  function program(vs, fs) {
    const make = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, make(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const cache = {};
    p.u = name => (name in cache ? cache[name] : (cache[name] = gl.getUniformLocation(p, name)));
    p.a = name => gl.getAttribLocation(p, name);
    return p;
  }

  const CAMERA = 'uniform vec3 uR, uU, uF; uniform vec2 uTan, uShift;\n';
  const FS_TRI = 'attribute vec2 aP; varying vec2 vP; void main(){ vP = aP; gl_Position = vec4(aP, 0.0, 1.0); }';
  const SKY_FS = DERIV + PREC + CAMERA + `
varying vec2 vP;
uniform mat3 uGal; uniform sampler2D uMW; uniform float uMWb;
uniform vec3 uSunD; uniform float uSunA, uSunI;
void main(){
  vec3 rd = normalize(uF + (vP.x - uShift.x) * uTan.x * uR + (vP.y - uShift.y) * uTan.y * uU);
  vec3 g = uGal * rd;
  float u = 0.5 - atan(g.y, g.x) / 6.2831853;
  float v = 0.5 - asin(clamp(g.z, -1.0, 1.0)) / 3.1415927;
#ifdef HAS_D
  float u2 = fract(u + 0.5) - 0.5;
  u = fwidth(u) <= fwidth(u2) + 1e-6 ? u : u2;
#endif
  vec3 t = texture2D(uMW, vec2(u, v)).rgb;
  vec3 c = t * t * uMWb;
  float a = acos(clamp(dot(rd, uSunD), -1.0, 1.0));
  float disk = 1.0 - smoothstep(uSunA * 0.85, uSunA * 1.15, a);
  float glow = 0.9 * exp(-a / (uSunA * 2.5 + 0.0015)) + 0.05 * exp(-a * 5.0) + 0.00025 / (a * a + 0.00025);
  c += vec3(1.0, 0.93, 0.82) * (disk * 30.0 + glow * uSunI);
  gl_FragColor = vec4(sqrt(1.0 - exp(-c * 1.3)), 1.0);
}`;
  const STAR_VS = CAMERA + `
attribute vec3 aDir; attribute vec4 aCol; attribute float aEnd;
uniform float uPx, uWarp, uFade;
varying vec3 vC;
void main(){
  float z = dot(aDir, uF);
  vec2 p = vec2(dot(aDir, uR) / (z * uTan.x), dot(aDir, uU) / (z * uTan.y));
  p *= 1.0 + aEnd * uWarp;
  gl_Position = z > 0.0 ? vec4(p + uShift, 0.0, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
  gl_PointSize = aCol.a * uPx;
  vC = aCol.rgb * uFade;
}`;
  const STAR_FS = PREC + `
varying vec3 vC; uniform float uLine;
void main(){
  float a = 1.0;
  if (uLine < 0.5) { float d = length(gl_PointCoord - 0.5) * 2.0; a = clamp(1.0 - d, 0.0, 1.0); a *= a; }
  gl_FragColor = vec4(vC * a, 1.0);
}`;
  const BODY_FS = DERIV + PREC + CAMERA + `
varying vec2 vP;
uniform vec3 uCam, uSun;
uniform float uK, uSunA, uExp, uAtmH;
uniform sampler2D uTex, uNight, uCloud, uRing, uMoonTex;
uniform vec4 uOpt;     // x: Earth extras, y: rings, z: moon count, w: gas-giant limb darkening
uniform vec4 uAtm;     // rgb, strength
uniform vec3 uDusk;    // colour of the light at the terminator (sunset)
uniform vec2 uRingR;
uniform vec4 uMoon[4];
uniform vec3 uMoonC[4];
uniform mat3 uMoonM;
const float PI = 3.14159265;
vec3 lin(vec3 c){ return c * c; }
vec2 hitEll(vec3 ro, vec3 rd){
  vec3 o = ro * vec3(1.0, 1.0, uK), d = rd * vec3(1.0, 1.0, uK);
  float a = dot(d, d), b = dot(o, d), c = dot(o, o) - 1.0, h = b * b - a * c;
  if (h < 0.0) return vec2(-1.0);
  h = sqrt(h);
  return vec2(-b - h, -b + h) / a;
}
vec2 hitSph(vec3 ro, vec3 rd, vec4 s){
  vec3 o = ro - s.xyz; float b = dot(o, rd), c = dot(o, o) - s.w * s.w, h = b * b - c;
  if (h < 0.0) return vec2(-1.0);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}
vec2 sphUV(vec3 n){
  float u = atan(n.y, n.x) / (2.0 * PI) + 0.5;
  float v = 0.5 - asin(clamp(n.z, -1.0, 1.0)) / PI;
#ifdef HAS_D
  float u2 = fract(u + 0.5) - 0.5;
  u = fwidth(u) <= fwidth(u2) + 1e-6 ? u : u2;
#endif
  return vec2(u, v);
}
float occlude(vec3 p, vec3 c, float r){
  vec3 oc = c - p; float t = dot(oc, uSun);
  if (t <= 0.0) return 1.0;
  float d = length(oc - uSun * t), pen = t * uSunA + 1e-4;
  return smoothstep(r - pen, r + pen, d);
}
float planetShadow(vec3 p){
  vec3 q = p * vec3(1.0, 1.0, uK);
  vec3 s = normalize(uSun * vec3(1.0, 1.0, uK));
  float t = -dot(q, s);
  if (t <= 0.0) return 1.0;
  float d = length(q + s * t), pen = t * uSunA + 1e-4;
  return smoothstep(1.0 - pen, 1.0 + pen, d);
}
float ringAlpha(float r){
  float x = (r - uRingR.x) / (uRingR.y - uRingR.x);
  if (x <= 0.0 || x >= 1.0) return 0.0;
  return texture2D(uRing, vec2(x, 0.5)).a;
}
float ringShadow(vec3 p){
  if (uOpt.y < 0.5 || abs(uSun.z) < 1e-4) return 1.0;
  float t = -p.z / uSun.z;
  if (t <= 0.0) return 1.0;
  return 1.0 - 0.92 * ringAlpha(length((p + uSun * t).xy));
}
float moonShadow(vec3 p){
  float s = 1.0;
  for (int i = 0; i < 4; i++) { if (float(i) >= uOpt.z) break; s *= occlude(p, uMoon[i].xyz, uMoon[i].w); }
  return s;
}
void main(){
  vec3 rd = normalize(uF + (vP.x - uShift.x) * uTan.x * uR + (vP.y - uShift.y) * uTan.y * uU);
  vec3 ro = uCam;
  vec3 col = vec3(0.0);
  float alpha = 0.0, tHit = 1e20;
  vec2 tp = hitEll(ro, rd);
  bool onPlanet = tp.x > 0.0;
  // Surface point, or the ray's closest approach for misses, so texture derivatives stay smooth.
  vec3 p = ro + rd * (onPlanet ? tp.x : max(-dot(ro, rd), 0.0));
  vec2 uv = sphUV(normalize(p * vec3(1.0, 1.0, uK)));
  vec3 alb = lin(texture2D(uTex, uv).rgb);
  vec3 nightC = lin(texture2D(uNight, uv).rgb);
  float cloud = texture2D(uCloud, uv).r;
  if (onPlanet) {
    tHit = tp.x;
    vec3 n = normalize(p * vec3(1.0, 1.0, uK * uK));
    float ndl = dot(n, uSun), mu = max(dot(n, -rd), 0.0);
    float shade = ringShadow(p) * moonShadow(p);
    float lit = smoothstep(-0.02, 0.25, ndl) * max(ndl, 0.0) * 0.6 + max(ndl, 0.0) * 0.4;
    lit *= shade;
    vec3 c = alb * lit * mix(1.0, 0.45 + 0.55 * pow(mu, 0.35), uOpt.w);
    if (uOpt.x > 0.5) {
      float ocean = smoothstep(0.004, 0.03, alb.b - max(alb.r, alb.g)) * (1.0 - cloud);
      vec3 h = normalize(uSun - rd);
      c += vec3(1.0, 0.9, 0.75) * pow(max(dot(n, h), 0.0), 90.0) * ocean * 1.6 * shade;
      c = mix(c, vec3(0.92) * lit, cloud * 0.9);
      float dark = 1.0 - smoothstep(-0.15, 0.05, ndl);
      c += nightC * vec3(1.0, 0.78, 0.5) * dark * (1.0 - cloud * 0.8) * 1.5;
    }
    if (uAtm.w > 0.0) {
      float day = smoothstep(-0.2, 0.35, ndl) * shade;
      float dusk = smoothstep(-0.12, 0.04, ndl) * (1.0 - smoothstep(0.04, 0.4, ndl));
      vec3 ac = mix(uAtm.rgb, uDusk, dusk * 0.6);
      float haze = clamp(uAtm.w * (0.03 + 0.85 * pow(1.0 - mu, 3.2)), 0.0, 1.0);
      c = c * (1.0 - haze * 0.45) + ac * haze * day * 0.65;
    }
    col = c;
    alpha = 1.0;
  } else if (uAtm.w > 0.0) {
    vec3 o = ro * vec3(1.0, 1.0, uK), d = normalize(rd * vec3(1.0, 1.0, uK));
    float b = -dot(o, d);
    if (b > 0.0) {
      vec3 cp = o + d * b;
      float h = length(cp) - 1.0;
      float dens = exp(-max(h, 0.0) / uAtmH);
      float sl = dot(normalize(cp), uSun);
      float sunT = smoothstep(-0.32, 0.3, sl);
      float fwd = 1.0 + 5.0 * pow(max(dot(rd, uSun), 0.0), 8.0);
      vec3 ac = mix(uAtm.rgb, uDusk, (1.0 - smoothstep(-0.1, 0.45, sl)) * 0.7);
      col = ac * dens * sunT * fwd * uAtm.w * 0.75;
    }
  }
  for (int i = 0; i < 4; i++) {
    if (float(i) >= uOpt.z) break;
    vec2 tm = hitSph(ro, rd, uMoon[i]);
    if (tm.x > 0.0 && tm.x < tHit) {
      tHit = tm.x;
      vec3 q = ro + rd * tm.x, n = (q - uMoon[i].xyz) / uMoon[i].w;
      vec3 a = uMoonC[i];
      if (i == 0 && uOpt.x > 0.5) {
        vec3 m = uMoonM * n;
        a = lin(texture2D(uMoonTex, vec2(atan(m.y, m.x) / (2.0 * PI) + 0.5, 0.5 - asin(clamp(m.z, -1.0, 1.0)) / PI)).rgb);
      }
      col = a * max(dot(n, uSun), 0.0) * planetShadow(q);
      alpha = 1.0;
    }
  }
  if (uOpt.y > 0.5 && abs(rd.z) > 1e-6) {
    float tr = -ro.z / rd.z;
    if (tr > 0.0 && tr < tHit) {
      vec3 q = ro + rd * tr;
      float x = (length(q.xy) - uRingR.x) / (uRingR.y - uRingR.x);
      if (x > 0.0 && x < 1.0) {
        vec4 t = texture2D(uRing, vec2(x, 0.5));
        float a = t.a;
        float litFace = step(0.0, uSun.z * ro.z);
        vec3 rc = vec3(0.95, 0.86, 0.72) * (0.5 + 1.5 * dot(t.rgb, vec3(0.333)));
        float light = mix(a * (1.0 - a) * 1.4 + 0.04, 0.3 + 0.7 * pow(abs(uSun.z), 0.3), litFace) * planetShadow(q);
        col = rc * light * a + col * (1.0 - a);
        alpha = a + alpha * (1.0 - a);
      }
    }
  }
  gl_FragColor = vec4(sqrt(1.0 - exp(-col * uExp)), alpha);
}`;
  // System view: orbit lines, planet dots, and the GPU-solved small-body swarm.
  const DOT_VS = CAMERA + `
attribute vec3 aPos; attribute vec4 aCol;
uniform vec3 uCam; uniform float uPx;
varying vec4 vC;
void main(){
  vec3 v = aPos - uCam; float z = dot(v, uF);
  gl_Position = vec4(dot(v, uR) / uTan.x + uShift.x * z, dot(v, uU) / uTan.y + uShift.y * z, 0.0, z);
  gl_PointSize = aCol.a * uPx;
  vC = aCol;
}`;
  const DOT_FS = PREC + `
varying vec4 vC; uniform float uLine, uAlpha;
void main(){
  if (uLine > 0.5) { gl_FragColor = vec4(vC.rgb * uAlpha, 1.0); return; }
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.55, d);
  gl_FragColor = vec4(vC.rgb * a, 1.0);
}`;
  const SWARM_VS = CAMERA + `
attribute vec3 aA;   // a (AU), e, mean anomaly at the epoch
attribute vec4 aB;   // inclination, node, argument of perihelion, mean motion (rad/day)
attribute float aPop;
uniform vec3 uCam; uniform float uPx, uDt;
uniform vec3 uPopC[3]; uniform vec3 uPopOn;
varying vec3 vC;
void main(){
  float e = aA.y;
  float M = mod(aA.z + aB.w * uDt, 6.2831853);
  float E = M + e * sin(M);
  E -= (E - e * sin(E) - M) / (1.0 - e * cos(E));
  E -= (E - e * sin(E) - M) / (1.0 - e * cos(E));
  E -= (E - e * sin(E) - M) / (1.0 - e * cos(E));
  float xv = aA.x * (cos(E) - e), yv = aA.x * sqrt(1.0 - e * e) * sin(E);
  float r = length(vec2(xv, yv)), u = atan(yv, xv) + aB.z;
  float O = aB.y, inc = aB.x;
  vec3 ec = r * vec3(cos(O) * cos(u) - sin(O) * sin(u) * cos(inc), sin(O) * cos(u) + cos(O) * sin(u) * cos(inc), sin(u) * sin(inc));
  vec3 pos = vec3(ec.x, ec.y * ${cE.toFixed(8)} - ec.z * ${sE.toFixed(8)}, ec.y * ${sE.toFixed(8)} + ec.z * ${cE.toFixed(8)});
  vec3 v = pos - uCam; float z = dot(v, uF);
  int k = int(aPop + 0.5);
  vec3 c = k == 0 ? uPopC[0] : (k == 1 ? uPopC[1] : uPopC[2]);
  float on = k == 0 ? uPopOn.x : (k == 1 ? uPopOn.y : uPopOn.z);
  gl_Position = on > 0.5 ? vec4(dot(v, uR) / uTan.x + uShift.x * z, dot(v, uU) / uTan.y + uShift.y * z, 0.0, z) : vec4(2.0, 2.0, 2.0, 1.0);
  gl_PointSize = uPx;
  vC = c;
}`;
  const SWARM_FS = PREC + `
varying vec3 vC; uniform float uAlpha;
void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; gl_FragColor = vec4(vC * uAlpha * smoothstep(1.0, 0.2, d), 1.0); }`;

  let P;
  try {
    P = { sky: program(FS_TRI, SKY_FS), star: program(STAR_VS, STAR_FS) };
    if (MODE === 'planet') P.body = program(FS_TRI, BODY_FS);
    else { P.dot = program(DOT_VS, DOT_FS); P.swarm = program(SWARM_VS, SWARM_FS); }
  } catch (err) {
    console.warn('Solar Voyage viewer: WebGL shaders unavailable, keeping the photo.', err);
    return;
  }

  /* ---------- textures ---------- */
  const isPow2 = n => (n & (n - 1)) === 0;
  function solid(rgb) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([rgb[0], rgb[1], rgb[2], 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function loadTex(file, { mip = true, fallback = [0, 0, 0] } = {}) {
    const slot = { tex: solid(fallback), ready: false };
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      const pow2 = isPow2(img.width) && isPow2(img.height);
      if (mip && pow2) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      } else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, pow2 ? gl.REPEAT : gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.deleteTexture(slot.tex);
      slot.tex = t;
      slot.ready = true;
      invalidate();
    };
    img.src = TEX + file;
    return slot;
  }
  const tx = { mw: loadTex('milky-way-1k.webp', { fallback: [2, 3, 6] }) };
  if (planet) {
    tx.surface = loadTex(`${planet.tex}-1k.webp`, { fallback: planet.avg });
    tx.night = planet.earth ? loadTex('earth-night-1k.webp') : { tex: solid([0, 0, 0]) };
    tx.cloud = planet.earth ? loadTex('earth-clouds-1k.webp') : { tex: solid([0, 0, 0]) };
    tx.ring = planet.rings ? loadTex('saturn-rings.png', { mip: false }) : { tex: solid([0, 0, 0]) };
    tx.moon = planet.earth ? loadTex('moon-512.webp', { mip: false, fallback: [140, 140, 140] }) : { tex: solid([0, 0, 0]) };
  }
  let hiRequested = false;
  function upgradeTextures() {
    if (hiRequested || !planet || !planet.hi) return;
    hiRequested = true;
    const swap = (key, file) => {
      const slot = loadTex(file, { fallback: [0, 0, 0] });
      const wait = setInterval(() => { if (slot.ready) { clearInterval(wait); tx[key] = slot; invalidate(); } }, 120);
    };
    swap('surface', `${planet.tex}-2k.webp`);
    if (planet.earth) { swap('night', 'earth-night-2k.webp'); swap('cloud', 'earth-clouds-2k.webp'); }
  }

  /* ---------- buffers ---------- */
  const tri = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tri);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const stars = { n: 0, lines: 0 };
  function bvToRgb(bv) {
    const t = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
    const x = clamp((t - 2500) / 9500, 0, 1);
    const r = t < 6600 ? 1 : 1 - 0.32 * x;
    const g = t < 6600 ? 0.62 + 0.36 * clamp((t - 2500) / 4100, 0, 1) : 0.98 - 0.12 * x;
    const b = t < 6600 ? 0.35 + 0.63 * clamp((t - 2500) / 4100, 0, 1) : 1;
    return [r, g, b];
  }
  fetch(new URL('assets/data/sky/allsky.json', ROOT)).then(r => r.json()).then(data => {
    const list = data.stars.slice().sort((a, b) => a[2] - b[2]);
    const pts = [], lines = [];
    for (const [ra, dec, mag, bv] of list) {
      const dir = radec(ra, dec);
      const rgb = bvToRgb(bv == null ? 0.6 : bv);
      const sat = clamp((4.5 - mag) / 4, 0.25, 1); // faint stars look nearly white to the eye
      const k = clamp(Math.pow(10, -0.4 * (mag - 2.2)), 0.16, 1.6);
      const col = rgb.map(c => (1 - sat + sat * c) * k);
      const size = clamp(1.5 + (5.8 - mag) * 0.55, 1.5, 6.5);
      pts.push(...dir, ...col, size, 0);
      if (lines.length < 900 * 18) lines.push(...dir, ...col, 1, 0, ...dir, ...col, 1, 1);
    }
    stars.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, stars.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pts), gl.STATIC_DRAW);
    stars.n = pts.length / 8;
    stars.lineBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, stars.lineBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines), gl.STATIC_DRAW);
    stars.lines = lines.length / 8;
    invalidate();
  }).catch(() => {});

  /* ---------- simulated time ---------- */
  const RATES = MODE === 'planet'
    ? [[0, 'Paused'], [1, 'Real time'], [60, '1 minute / s'], [3600, '1 hour / s'], [86400, '1 day / s']]
    : [[0, 'Paused'], [86400, '1 day / s'], [604800, '1 week / s'], [2592000, '30 days / s'], [31557600, '1 year / s']];
  let rateIndex = reduceMotion || software ? 0 : (planet ? 3 : system.rate);
  let lastRate = planet ? 3 : system.rate;
  let simDay = dayOf(Date.now());

  /* ---------- scene state ---------- */
  const R = planet ? planet.km : 1;
  let poleFrame, bodyBasis = null, sunWorld = [1, 0, 0], helioPos = [1, 0, 0];
  const orbitEl = planet ? elements(ORBIT[stop]) : null;
  if (planet) {
    const pz = radec(planet.pole[0], planet.pole[1]);
    const px = [-Math.sin(planet.pole[0] * D2R), Math.cos(planet.pole[0] * D2R), 0];
    poleFrame = [px, cross(pz, px), pz];
  } else {
    poleFrame = [[1, 0, 0], cross(ECL_N, [1, 0, 0]), ECL_N];
  }
  const moons = (planet && planet.moons) || [];
  const moonPos = moons.map(() => [0, 0, 0]);
  function updateScene() {
    if (planet) {
      helioPos = helio(orbitEl, simDay);
      sunWorld = norm(mul(helioPos, -1));
      const W = (planet.W[0] + planet.W[1] * simDay) * D2R;
      const [Q, PQ, Z] = poleFrame;
      const X = add(mul(Q, Math.cos(W)), mul(PQ, Math.sin(W)));
      bodyBasis = [X, cross(Z, X), Z];
      moons.forEach((m, i) => {
        if (m.earthMoon) { moonPos[i] = moonGeo(simDay).map(v => v * 6378.14 / R); return; }
        const th = TAU * (hash(m.name) + simDay / m.P);
        let v = [Math.cos(th) * m.aKm / R, Math.sin(th) * m.aKm / R, 0];
        if (m.tilt) { const t = m.tilt * D2R; v = [v[0], v[1] * Math.cos(t), v[1] * Math.sin(t)]; }
        moonPos[i] = fromBody(v, poleFrame);
      });
    }
  }

  /* ---------- camera ---------- */
  const cam = { yaw: 0, pitch: 0.2, logD: 0, ty: 0, tp: 0.2, tl: 0, focus: [0, 0, 0], from: [0, 0, 0], blend: 1, focusIdx: -1 };
  function refocus(i) { cam.from = cam.focus.slice(); cam.blend = 0; cam.focusIdx = i; }
  const fovY = () => (innerWidth < 700 && innerHeight > innerWidth ? 58 : 44) * D2R;
  let minD, maxD, homeD;
  function focusRadius() { return cam.focusIdx >= 0 && planet ? moons[cam.focusIdx].km / R : 1; }
  function setLimits() {
    if (planet) {
      const fr = focusRadius();
      minD = fr * (planet.atm ? 1.06 : 1.03);
      const far = moons.reduce((m, o) => Math.max(m, o.aKm / R), 8);
      maxD = Math.max(30, far * 2.6);
      homeD = planet.dist;
    } else { minD = system.minD; maxD = system.maxD; homeD = system.dist; }
  }
  function sunYaw() {
    const s = toBody(sunWorld, poleFrame);
    return Math.atan2(s[1], s[0]);
  }
  function home(animate) {
    if (cam.focusIdx !== -1) refocus(-1);
    setLimits();
    updateScene();
    cam.ty = planet ? sunYaw() - 0.85 : -2.2;
    cam.tp = planet ? (planet.pitch || 0.22) : system.pitch;
    cam.tl = Math.log(homeD);
    if (!animate) { cam.yaw = cam.ty; cam.pitch = cam.tp; cam.logD = cam.tl; }
    selectTarget(null);
  }
  function camBasis(shift) {
    const d = Math.exp(cam.logD);
    const o = [Math.cos(cam.pitch) * Math.cos(cam.yaw), Math.cos(cam.pitch) * Math.sin(cam.yaw), Math.sin(cam.pitch)];
    const pos = add(cam.focus, mul(fromBody(o, poleFrame), d));
    const F = norm(sub(cam.focus, pos));
    let Rv = cross(F, poleFrame[2]);
    if (len(Rv) < 1e-5) Rv = poleFrame[0];
    Rv = norm(Rv);
    const U = cross(Rv, F);
    return { pos, F, R: Rv, U, shift };
  }

  /* ---------- system-view geometry ---------- */
  const sys = {};
  if (system) {
    const PLANET_COLORS = { mercury: [0.7, 0.68, 0.64], venus: [0.95, 0.86, 0.62], earth: [0.45, 0.65, 1.0], mars: [1.0, 0.5, 0.32], jupiter: [0.92, 0.8, 0.62], saturn: [0.93, 0.85, 0.6], uranus: [0.6, 0.88, 0.95], neptune: [0.42, 0.58, 1.0] };
    sys.bodies = system.planets.map(k => ({ key: k, name: PLANETS[k].name, el: elements(ORBIT[k]), color: PLANET_COLORS[k], size: 7 }))
      .concat(Object.entries(system.named).map(([name, el]) => ({ key: name.toLowerCase(), name, el, color: [0.95, 0.95, 0.95], size: 5, small: true })));
    // Orbit lines: one strip per body, drawn as separate LINE_STRIP ranges.
    const verts = [];
    sys.ranges = [];
    for (const b of sys.bodies) {
      const start = verts.length / 7, N = 256;
      for (let k = 0; k <= N; k++) {
        const P = helio({ ...b.el, L0: b.el.peri + (k / N) * 360, n: 0 }, 0);
        verts.push(...P, ...b.color.map(c => c * (b.small ? 0.5 : 0.42)), 1);
      }
      sys.ranges.push([start, N + 1]);
    }
    sys.orbitBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sys.orbitBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    sys.dotBuf = gl.createBuffer();
    // The swarm: elements generated once, solved on the GPU every frame.
    const d0 = simDay;
    sys.epoch = d0;
    const nE = TAU / 365.25636;
    const jup = elements(ORBIT.jupiter), nep = elements(ORBIT.neptune);
    const lamAt = (el, dt) => (el.L0 + el.n * (d0 + dt)) * D2R;
    const A = [], B = [], C = [];
    const push = (a, e, M0, inc, node, argp, n, pop) => { A.push(a, e, M0); B.push(inc, node, argp, n); C.push(pop); };
    const angle = () => rnd() * TAU;
    if (stop === 'asteroid-belt') {
      const gaps = [2.502, 2.825, 2.958, 3.279];
      let made = 0;
      while (made < 8800) {
        const a = 2.06 + rnd() * 1.6;
        let w = a < 3.3 ? 0.35 + 0.65 * Math.exp(-(((a - 2.75) / 0.42) ** 2)) : 0.12;
        for (const g of gaps) w *= 1 - 0.96 * Math.exp(-(((a - g) / 0.014) ** 2));
        if (rnd() > w) continue;
        const e = Math.min(0.25, Math.abs(gauss()) * 0.065), inc = Math.min(30, Math.abs(gauss()) * 6.5) * D2R;
        push(a, e, angle(), inc, angle(), angle(), nE * Math.pow(a, -1.5), 0);
        made++;
      }
      const nJ = jup.n * D2R;
      for (let k = 0; k < 1600; k++) {
        const lead = k % 2 ? 1 : -1;
        const lam = lamAt(jup, 0) + lead * (60 + gauss() * 11) * D2R;
        const node = angle(), argp = angle();
        push(jup.a, Math.abs(gauss()) * 0.06, lam - node - argp, Math.abs(gauss()) * 11 * D2R, node, argp, nJ, 1);
      }
      for (let k = 0; k < 700; k++) {
        const nH = 1.5 * nJ, M0 = angle();
        const dt = (((Math.PI - M0) % TAU) + TAU) % TAU / nH;
        const peri = lamAt(jup, dt) + gauss() * 9 * D2R; // farthest point stays opposite Jupiter
        const node = angle();
        push(3.97, 0.12 + Math.abs(gauss()) * 0.07, M0, Math.abs(gauss()) * 7 * D2R, node, peri - node, nH, 2);
      }
    } else {
      for (let k = 0; k < 4600; k++) {
        const hot = rnd() < 0.35;
        const a = hot ? 40 + rnd() * 8 : 42.4 + rnd() * 5.1;
        push(a, Math.abs(gauss()) * (hot ? 0.08 : 0.035), angle(), Math.abs(gauss()) * (hot ? 15 : 2.5) * D2R, angle(), angle(), nE * Math.pow(a, -1.5), 0);
      }
      const nN = nep.n * D2R, nPl = nN / 1.5;
      for (let k = 0; k < 1700; k++) {
        const M0 = angle();
        const dt = (((TAU - M0) % TAU) + TAU) % TAU / nPl;
        const peri = lamAt(nep, dt) + (k % 2 ? 1 : -1) * (90 + gauss() * 22) * D2R; // closest point ±90° from Neptune
        const node = angle();
        push(39.45, Math.min(0.33, 0.1 + Math.abs(gauss()) * 0.09), M0, Math.abs(gauss()) * 11 * D2R, node, peri - node, nPl, 1);
      }
      for (let k = 0; k < 2200; k++) {
        const a = 50 + 160 * Math.pow(rnd(), 2.2);
        const e = Math.min(1 - 33 / a, 0.25 + rnd() * 0.45);
        push(a, Math.max(e, 0.05), angle(), Math.abs(gauss()) * 18 * D2R, angle(), angle(), nE * Math.pow(a, -1.5), 2);
      }
    }
    sys.count = C.length;
    const mk = arr => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW); return b; };
    sys.aBuf = mk(A); sys.bBuf = mk(B); sys.cBuf = mk(C);
    sys.popOn = [1, 1, 1];
  }

  /* ---------- DOM: the viewer, its HUD and labels ---------- */
  const viewer = document.createElement('div');
  viewer.className = 'sv-viewer';
  viewer.dataset.mode = MODE;
  viewer.setAttribute('data-night-keep', '');
  viewer.setAttribute('data-vr-stage', '');
  viewer.setAttribute('data-memory-ignore', '');
  viewer.setAttribute('data-no-glossary', '');
  const title = planet ? planet.name : system.name;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', planet
    ? `Real-time 3D view of ${planet.name} lit by the Sun from its true direction today, against the real stars. Drag or use the arrow keys to orbit; plus and minus zoom.`
    : `Real-time view of ${system.name} from above the solar system, with simulated small bodies on real Kepler orbits. Drag or use the arrow keys to orbit; plus and minus zoom.`);
  const labelLayer = document.createElement('div');
  labelLayer.className = 'sv-labels';
  const card = document.createElement('section');
  card.className = 'sv-card';
  card.setAttribute('aria-label', 'Target information');
  const bar = document.createElement('div');
  bar.className = 'sv-bar';
  bar.innerHTML = `
    <div class="sv-time" role="group" aria-label="Simulation time">
      <button type="button" data-sv="play" aria-pressed="false" aria-label="Pause time"><span aria-hidden="true">❚❚</span></button>
      <button type="button" data-sv="slower" aria-label="Slower">−</button>
      <output class="sv-rate" aria-live="polite"></output>
      <button type="button" data-sv="faster" aria-label="Faster">+</button>
      <span class="sv-date"></span>
      <button type="button" data-sv="now">Now</button>
    </div>
    <div class="sv-tools">
      <button type="button" data-sv="labels" aria-pressed="true">Labels</button>
      <button type="button" data-sv="home">Reset view</button>
      <button type="button" data-sv="full" aria-label="Full screen (F)"><span aria-hidden="true">⛶</span></button>
    </div>`;
  const hint = document.createElement('p');
  hint.className = 'sv-hint';
  hint.textContent = matchMedia('(pointer: coarse)').matches
    ? 'Swipe sideways to orbit · pinch to zoom · ⛶ for full control'
    : 'Drag to orbit · click the view, then scroll to zoom · click a label to fly there';
  viewer.append(canvas, labelLayer, card, bar, hint);
  let legend = null;
  if (system) {
    legend = document.createElement('div');
    legend.className = 'sv-legend';
    legend.setAttribute('role', 'group');
    legend.setAttribute('aria-label', 'Show or hide groups');
    system.pops.forEach((p, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'true');
      b.title = p.note;
      b.innerHTML = `<i style="background:rgb(${p.color.map(c => Math.round(c * 255)).join(',')})"></i>${p.label}`;
      b.addEventListener('click', () => {
        sys.popOn[i] = sys.popOn[i] ? 0 : 1;
        b.setAttribute('aria-pressed', String(!!sys.popOn[i]));
        showNote(p.note);
        invalidate();
      });
      legend.append(b);
    });
    viewer.append(legend);
  }
  const note = document.createElement('p');
  note.className = 'sv-note';
  note.setAttribute('aria-live', 'polite');
  viewer.append(note);
  let noteTimer = 0;
  function showNote(text) {
    note.textContent = text;
    note.classList.add('is-on');
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => note.classList.remove('is-on'), 7000);
  }

  // Mount: the viewer spans the window; the photo becomes a compare card in the intro.
  const intro = win.querySelector('.sv-intro');
  const photo = win.querySelector('.sv-world');
  const schematic = win.querySelector('.sv-belt');
  win.classList.add('has-viewer');
  win.prepend(viewer);
  if (schematic) schematic.hidden = true;
  if (photo && intro) {
    photo.classList.add('sv-photo');
    const tag = document.createElement('span');
    tag.className = 'sv-photo-tag';
    tag.textContent = /illustrat/i.test(photo.textContent) ? 'Compare: artist’s view' : 'Compare: spacecraft photo';
    photo.prepend(tag);
    intro.append(photo);
  }
  const credit = document.querySelector('.sv-arrival > .sv-model-note');
  if (credit) {
    credit.innerHTML = planet
      ? `Live model. Sunlight comes from ${planet.name}’s real direction to the Sun for the date shown, and the background is the real star sky. Sizes and distances are true to scale within the view; moon positions are approximate${planet.earth ? ', and the clouds are a sample map, not today’s weather' : ''}. ${planet.note || ''}
        Maps: <a href="https://www.solarsystemscope.com/textures/">Solar System Scope</a> (CC BY 4.0, from NASA mission data)${planet.earth ? '; Earth: NASA Blue Marble and Black Marble (public domain)' : ''}. Stars: d3-celestial (BSD). Milky Way: ESO/S. Brunier (CC BY 4.0).`
      : `Live model. Planets follow their real orbits; the small bodies are a simulated population built to match the real belt’s shape, so individual dots are not real objects. Named dwarf planets and asteroids have real orbits, with approximate positions. Dots are drawn much larger than the objects. Stars: d3-celestial (BSD). Milky Way: ESO/S. Brunier (CC BY 4.0).`;
  }

  /* ---------- labels ---------- */
  const labels = [];
  function addLabel(name, kind, getPos, onPick) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `sv-label sv-label--${kind}`;
    el.textContent = name;
    el.setAttribute('aria-label', `${name}: fly there`);
    el.addEventListener('click', e => { e.stopPropagation(); onPick(); });
    labelLayer.append(el);
    labels.push({ el, getPos, kind, name });
  }
  if (planet) {
    moons.forEach((m, i) => addLabel(m.name, 'moon', () => moonPos[i], () => flyToMoon(i)));
    addLabel('Sun', 'sun', () => mul(sunWorld, 1e6), () => showNote(`The Sun is ${helioDistText()} away. Its light takes ${lightText(len(helioPos))} to reach ${planet.name}.`));
    addLabel(planet.name, 'planet', () => [0, 0, 0], () => home(true));
  } else {
    addLabel('Sun', 'sun', () => [0, 0, 0], () => flyToBody(null));
    sys.bodies.forEach((b, i) => addLabel(b.name, b.small ? 'dwarf' : 'planet', () => helio(b.el, simDay), () => flyToBody(i)));
  }
  let showLabels = true;

  /* ---------- HUD text ---------- */
  const fmtKm = km => km < 1e6 ? `${Math.round(km).toLocaleString('en-US')} km` : `${(km / 1e6).toLocaleString('en-US', { maximumFractionDigits: km < 1e7 ? 2 : 1 })} million km`;
  const lightText = au => { const m = au * 8.317; return m < 90 ? `${m.toFixed(1)} min` : `${Math.floor(m / 60)} h ${Math.round(m % 60)} min`; };
  const helioDistText = () => `${len(helioPos).toFixed(len(helioPos) < 10 ? 2 : 1)} AU`;
  const dayText = Wd => {
    const days = 360 / Math.abs(Wd);
    const t = days < 2 ? `${Math.floor(days * 24)} h ${Math.round((days * 24 % 1) * 60)} min` : `${days.toFixed(days < 100 ? 1 : 0)} Earth days`;
    return Wd < 0 ? `${t}, spinning backward` : t;
  };
  const yearText = P => (Math.abs(P) < 1000 ? `${Math.abs(P).toFixed(Math.abs(P) < 10 ? 2 : 0)} Earth days` : `${(Math.abs(P) / 365.25).toFixed(Math.abs(P) < 20000 ? 1 : 0)} Earth years`);
  let selected = null; // planet view: moon index; system view: body index or null (Sun)
  function selectTarget(t) { selected = t; renderCard(); }
  function rows(list) { return list.map(([k, v, id]) => `<div><dt>${k}</dt><dd${id ? ` data-live="${id}"` : ''}>${v}</dd></div>`).join(''); }
  function renderCard() {
    let html;
    if (planet && selected == null) {
      html = `<p class="sv-card-kicker">Target</p><h3>${planet.name}</h3><p class="sv-card-kind">${planet.kind}</p><dl>${rows([
        ['Altitude', '', 'alt'], ['From the Sun', '', 'sun'], ['Sunlight takes', '', 'light'],
        ['Radius', fmtKm(planet.km)], ['One spin', dayText(planet.W[1])], ['Year', yearText(orbitEl.P)], ['Gravity', `${planet.g} m/s²`]])}</dl>`;
    } else if (planet) {
      const m = moons[selected];
      html = `<p class="sv-card-kicker">Moon of ${planet.name}</p><h3>${m.name}</h3><p class="sv-card-kind">Natural satellite</p><dl>${rows([
        ['Altitude', '', 'alt'], ['Radius', fmtKm(m.km)], ['Orbit', `${fmtKm(m.aKm)} from ${planet.name}`], ['Goes around in', `${yearText(m.P)}${m.P < 0 ? ', backward' : ''}`]])}</dl>
        <button type="button" class="sv-card-back" data-sv="home">← Back to ${planet.name}</button>`;
    } else if (selected == null) {
      html = `<p class="sv-card-kicker">Region</p><h3>${system.name}</h3><p class="sv-card-kind">Seen from above the planets’ orbits</p><dl>${rows(system.card.concat([['Camera to Sun', '', 'cam']]))}</dl>`;
    } else {
      const b = sys.bodies[selected];
      html = `<p class="sv-card-kicker">${b.small ? 'Dwarf planet or asteroid' : 'Planet'}</p><h3>${b.name}</h3><p class="sv-card-kind">${b.small ? 'Real orbit · approximate position' : 'Real orbit'}</p><dl>${rows([
        ['From the Sun', '', 'bsun'], ['Average distance', `${b.el.a.toFixed(b.el.a < 10 ? 2 : 1)} AU`], ['Orbit shape (e)', b.el.e.toFixed(3)], ['Tilt to Earth’s orbit', `${b.el.i.toFixed(1)}°`], ['Year', yearText(b.el.P)]])}</dl>
        <button type="button" class="sv-card-back" data-sv="home">← Back to ${system.name}</button>`;
    }
    card.innerHTML = html;
    updateLive();
  }
  function updateLive() {
    const set = (id, text) => { const el = card.querySelector(`[data-live="${id}"]`); if (el && el.textContent !== text) el.textContent = text; };
    if (planet) {
      const c = lastBasis ? lastBasis.pos : [Math.exp(cam.logD), 0, 0];
      const centre = selected == null ? [0, 0, 0] : moonPos[selected];
      const radius = selected == null ? 1 : moons[selected].km / R;
      set('alt', fmtKm(Math.max(0, len(sub(c, centre)) - radius) * R));
      set('sun', helioDistText());
      set('light', lightText(len(helioPos)));
    } else {
      if (lastBasis) set('cam', `${len(lastBasis.pos).toFixed(1)} AU`);
      if (selected != null) { const p = helio(sys.bodies[selected].el, simDay); set('bsun', `${len(p).toFixed(2)} AU`); }
    }
    const date = new Date((simDay + 2451545.0 - 2440587.5) * 86400000);
    const iso = isNaN(date) ? '' : date.toISOString();
    const dateEl = bar.querySelector('.sv-date');
    const text = planet ? `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC` : iso.slice(0, 10);
    if (dateEl.textContent !== text) dateEl.textContent = text;
  }
  function renderRate() {
    bar.querySelector('.sv-rate').textContent = RATES[rateIndex][1];
    const play = bar.querySelector('[data-sv="play"]');
    const paused = rateIndex === 0;
    play.setAttribute('aria-pressed', String(paused));
    play.setAttribute('aria-label', paused ? 'Play time' : 'Pause time');
    play.firstElementChild.textContent = paused ? '▶' : '❚❚';
  }

  /* ---------- flights ---------- */
  function flyToMoon(i) {
    refocus(i);
    setLimits();
    cam.tl = Math.log(moons[i].km / R * 4.2);
    selectTarget(i);
    showNote(`${moons[i].name}: ${fmtKm(moons[i].km * 2)} across, ${fmtKm(moons[i].aKm)} from ${planet.name}.`);
    invalidate();
  }
  function flyToBody(i) {
    refocus(i == null ? -1 : i);
    if (i == null) { cam.tl = Math.log(homeD); selectTarget(null); invalidate(); return; }
    const b = sys.bodies[i];
    cam.tl = Math.log(clamp(b.el.a * 0.9, 1.2, 60));
    selectTarget(i);
    invalidate();
  }

  /* ---------- input ---------- */
  const pointers = new Map();
  let armed = false, lastTap = 0;
  const isFull = () => document.fullscreenElement === viewer || viewer.classList.contains('is-full');
  canvas.addEventListener('pointerdown', e => {
    armed = true;
    canvas.focus({ preventScroll: true });
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId);
    viewer.classList.add('is-active');
  });
  canvas.addEventListener('pointermove', e => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    if (pointers.size === 1) {
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      const k = 0.0055 * Math.min(1, Math.exp(cam.logD) / (planet ? 2.2 : 1) + 0.25);
      cam.ty -= dx * k;
      cam.tp = clamp(cam.tp + dy * k, -1.5, 1.5);
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.entries()].map(([id, p]) => (id === e.pointerId ? { x: e.clientX, y: e.clientY } : p));
      const [pa, pb] = [...pointers.values()];
      const before = Math.hypot(pa.x - pb.x, pa.y - pb.y), after = Math.hypot(a.x - b.x, a.y - b.y);
      if (before > 0 && after > 0) zoomBy(Math.log(before / after) * 1.2);
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    invalidate();
  });
  const release = e => { pointers.delete(e.pointerId); if (!pointers.size) viewer.classList.remove('is-active'); };
  canvas.addEventListener('pointerup', e => {
    release(e);
    const now = performance.now();
    if (e.pointerType === 'touch' && now - lastTap < 320) pickAt(e);
    lastTap = now;
  });
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('dblclick', e => pickAt(e));
  canvas.addEventListener('wheel', e => {
    if (!armed && !isFull()) { showNote('Click the view first, then scroll to zoom (or use + and −).'); return; }
    e.preventDefault();
    zoomBy(clamp(e.deltaY, -120, 120) * 0.0022);
  }, { passive: false });
  document.addEventListener('pointerdown', e => { if (!viewer.contains(e.target)) armed = false; });
  function zoomBy(dl) {
    const fr = planet ? focusRadius() : 0;
    // Near a surface, zoom in steps of altitude rather than of distance.
    if (planet) {
      const d = Math.exp(cam.tl), alt = Math.max(d - fr, fr * 0.002);
      const nd = fr + alt * Math.exp(dl);
      cam.tl = Math.log(clamp(nd, minD, maxD));
    } else cam.tl = clamp(cam.tl + dl, Math.log(minD), Math.log(maxD));
    invalidate();
  }
  function pickAt(e) {
    if (!planet || !lastBasis) return;
    const rect = canvas.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1, ny = 1 - ((e.clientY - rect.top) / rect.height) * 2;
    const b = lastBasis, t = Math.tan(fovY() / 2), asp = rect.width / rect.height;
    const rd = norm(add(add(b.F, mul(b.R, (nx - b.shift[0]) * t * asp)), mul(b.U, (ny - b.shift[1]) * t)));
    let best = null, bestT = Infinity;
    moons.forEach((m, i) => {
      const o = sub(b.pos, moonPos[i]), rr = Math.max(m.km / R, len(o) * 0.02);
      const bq = dot(o, rd), c = dot(o, o) - rr * rr, h = bq * bq - c;
      if (h > 0 && -bq - Math.sqrt(h) > 0 && -bq < bestT) { bestT = -bq; best = i; }
    });
    if (best != null) flyToMoon(best);
  }
  canvas.addEventListener('keydown', e => {
    const step = 0.08;
    const keys = {
      ArrowLeft: () => (cam.ty += step), ArrowRight: () => (cam.ty -= step),
      ArrowUp: () => (cam.tp = clamp(cam.tp + step, -1.5, 1.5)), ArrowDown: () => (cam.tp = clamp(cam.tp - step, -1.5, 1.5)),
      '+': () => zoomBy(-0.25), '=': () => zoomBy(-0.25), '-': () => zoomBy(0.25), _: () => zoomBy(0.25),
      ' ': () => togglePlay(), Home: () => home(true), '0': () => home(true), f: () => toggleFull(), F: () => toggleFull(),
      '[': () => setRate(rateIndex - 1), ']': () => setRate(rateIndex + 1)
    };
    if (keys[e.key]) { e.preventDefault(); keys[e.key](); invalidate(); }
  });
  function setRate(i) { rateIndex = clamp(i, 0, RATES.length - 1); if (rateIndex) lastRate = rateIndex; renderRate(); invalidate(); }
  function togglePlay() { setRate(rateIndex ? 0 : lastRate || 1); }
  function toggleFull() {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    if (viewer.classList.contains('is-full')) { exitPseudoFull(); return; }
    if (viewer.requestFullscreen && document.fullscreenEnabled) viewer.requestFullscreen().catch(enterPseudoFull);
    else enterPseudoFull();
  }
  let placeholder = null;
  function enterPseudoFull() {
    placeholder = document.createComment('sv-viewer');
    viewer.replaceWith(placeholder);
    document.body.append(viewer);
    viewer.classList.add('is-full');
    resize();
  }
  function exitPseudoFull() {
    viewer.classList.remove('is-full');
    if (placeholder) { placeholder.replaceWith(viewer); placeholder = null; }
    resize();
  }
  document.addEventListener('fullscreenchange', () => { viewer.classList.toggle('is-fullscreen', document.fullscreenElement === viewer); resize(); });
  viewer.addEventListener('click', e => {
    const btn = e.target.closest('[data-sv]');
    if (!btn) return;
    const act = btn.dataset.sv;
    if (act === 'play') togglePlay();
    else if (act === 'slower') setRate(rateIndex - 1);
    else if (act === 'faster') setRate(rateIndex + 1);
    else if (act === 'now') { simDay = dayOf(Date.now()); invalidate(); }
    else if (act === 'labels') { showLabels = !showLabels; btn.setAttribute('aria-pressed', String(showLabels)); labelLayer.hidden = !showLabels; invalidate(); }
    else if (act === 'home') { home(true); invalidate(); }
    else if (act === 'full') toggleFull();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && viewer.classList.contains('is-full')) exitPseudoFull(); });

  /* ---------- warp to the next stop ---------- */
  let warp = null;
  document.querySelectorAll('.sv-route a:not([aria-current])').forEach(a => a.addEventListener('click', e => {
    if (reduceMotion || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || !visible) return;
    e.preventDefault();
    warp = { t0: performance.now(), href: a.href };
    invalidate();
    setTimeout(() => { location.href = a.href; }, 900);
  }));
  addEventListener('pageshow', e => { if (e.persisted) { warp = null; invalidate(); } });

  /* ---------- sizing and the frame loop ---------- */
  let scale = software ? 0.4 : 1, dpr = 1, W = 1, H = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2) * scale;
    W = Math.max(1, Math.round(r.width * dpr));
    H = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    invalidate();
  }
  new ResizeObserver(resize).observe(canvas);
  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) invalidate(); }).observe(viewer);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) invalidate(); });

  let raf = 0, started = false, lastT = 0, lastBasis = null, lastCheck = 0, arrival = null;
  const probe = new Uint8Array(4), samples = [];
  function invalidate() { if (!raf && started) raf = requestAnimationFrame(frame); }
  const GAL = [-0.0548755604, 0.4941094279, -0.8676661490, -0.8734370902, -0.4448296300, -0.1980763734, -0.4838350155, 0.7469822445, 0.4559837762];

  function bindTri(p) {
    gl.bindBuffer(gl.ARRAY_BUFFER, tri);
    const a = p.a('aP');
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    return a;
  }
  function camUniforms(p, b, tanX, tanY) {
    gl.uniform3fv(p.u('uR'), b.R);
    gl.uniform3fv(p.u('uU'), b.U);
    gl.uniform3fv(p.u('uF'), b.F);
    gl.uniform2f(p.u('uTan'), tanX, tanY);
    gl.uniform2fv(p.u('uShift'), b.shift);
  }
  function viewShift() {
    if (isFull() || innerWidth < 760) return [0, 0];
    return [0.32, 0];
  }

  function frame(t) {
    raf = 0;
    if (!visible || document.hidden) { lastT = 0; return; }
    const dt = lastT ? Math.min(0.1, (t - lastT) / 1000) : 0;
    lastT = t;
    let busy = false;
    if (RATES[rateIndex][0] && dt) { simDay += (RATES[rateIndex][0] * dt) / 86400; busy = true; }
    updateScene();

    // Camera easing (and the arrival swoop).
    const k = 1 - Math.exp(-dt * (arrival ? 1.6 : 9));
    const ease = (a, b) => a + (b - a) * k;
    cam.yaw = ease(cam.yaw, cam.ty);
    cam.pitch = ease(cam.pitch, cam.tp);
    cam.logD = ease(cam.logD, cam.tl);
    let target = [0, 0, 0];
    if (planet && cam.focusIdx >= 0) target = moonPos[cam.focusIdx];
    if (system && cam.focusIdx >= 0) target = helio(sys.bodies[cam.focusIdx].el, simDay);
    cam.blend = Math.min(1, cam.blend + dt / 1.6);
    const sb = cam.blend * cam.blend * (3 - 2 * cam.blend);
    cam.focus = add(cam.from, mul(sub(target, cam.from), sb));
    if (Math.abs(cam.yaw - cam.ty) + Math.abs(cam.pitch - cam.tp) + Math.abs(cam.logD - cam.tl) > 1e-4 || cam.blend < 1) busy = true;
    if (arrival && Math.abs(cam.logD - cam.tl) < 0.01) arrival = null;

    let warpK = 0;
    if (warp) { warpK = Math.min(1, (t - warp.t0) / 850); cam.tl += dt * 6 * warpK; busy = true; }

    const b = camBasis(viewShift());
    lastBasis = b;
    const tanY = Math.tan(fovY() / 2), tanX = tanY * (W / H);
    // Every second or so, flush earlier GPU work first so the timing below covers only this frame.
    const probing = busy && !software && t - lastCheck > 1000;
    if (probing) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, probe);
    const start = performance.now();
    gl.viewport(0, 0, W, H);
    gl.disable(gl.BLEND);

    // Sky.
    const sunDirCam = planet ? sunWorld : norm(mul(b.pos, -1));
    const sunDist = planet ? len(helioPos) : len(b.pos);
    gl.useProgram(P.sky);
    camUniforms(P.sky, b, tanX, tanY);
    gl.uniformMatrix3fv(P.sky.u('uGal'), false, GAL);
    gl.uniform1f(P.sky.u('uMWb'), (planet ? 0.26 : 0.34) * (1 - warpK * 0.8));
    gl.uniform3fv(P.sky.u('uSunD'), sunDirCam);
    gl.uniform1f(P.sky.u('uSunA'), 0.004652 / sunDist);
    gl.uniform1f(P.sky.u('uSunI'), planet ? 1 : clamp(1.2 / Math.sqrt(sunDist), 0.25, 1.4));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tx.mw.tex);
    gl.uniform1i(P.sky.u('uMW'), 0);
    let a0 = bindTri(P.sky);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(a0);

    // Stars (points, or streaks during the warp).
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    if (stars.n) {
      gl.useProgram(P.star);
      camUniforms(P.star, b, tanX, tanY);
      gl.uniform1f(P.star.u('uPx'), dpr * 0.9);
      gl.uniform1f(P.star.u('uWarp'), warpK * warpK * 1.6);
      gl.uniform1f(P.star.u('uFade'), 1);
      const draw = (buf, mode, count, line) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        const ad = P.star.a('aDir'), ac = P.star.a('aCol'), ae = P.star.a('aEnd');
        gl.enableVertexAttribArray(ad); gl.enableVertexAttribArray(ac); gl.enableVertexAttribArray(ae);
        gl.vertexAttribPointer(ad, 3, gl.FLOAT, false, 32, 0);
        gl.vertexAttribPointer(ac, 4, gl.FLOAT, false, 32, 12);
        gl.vertexAttribPointer(ae, 1, gl.FLOAT, false, 32, 28);
        gl.uniform1f(P.star.u('uLine'), line);
        gl.drawArrays(mode, 0, count);
        gl.disableVertexAttribArray(ad); gl.disableVertexAttribArray(ac); gl.disableVertexAttribArray(ae);
      };
      draw(stars.buf, gl.POINTS, stars.n, 0);
      if (warpK > 0.02) draw(stars.lineBuf, gl.LINES, stars.lines, 1);
    }

    if (planet) {
      const B = bodyBasis;
      const bp = toBody(b.pos, B), bR = toBody(b.R, B), bU = toBody(b.U, B), bF = toBody(b.F, B), bS = toBody(sunWorld, B);
      const pb = P.body;
      gl.useProgram(pb);
      gl.uniform3fv(pb.u('uR'), bR); gl.uniform3fv(pb.u('uU'), bU); gl.uniform3fv(pb.u('uF'), bF);
      gl.uniform2f(pb.u('uTan'), tanX, tanY);
      gl.uniform2fv(pb.u('uShift'), b.shift);
      gl.uniform3fv(pb.u('uCam'), bp);
      gl.uniform3fv(pb.u('uSun'), bS);
      gl.uniform1f(pb.u('uK'), 1 / (1 - planet.f));
      gl.uniform1f(pb.u('uSunA'), 0.004652 / len(helioPos));
      gl.uniform1f(pb.u('uExp'), 1.55);
      gl.uniform4fv(pb.u('uAtm'), planet.atm || [0, 0, 0, 0]);
      gl.uniform1f(pb.u('uAtmH'), planet.atmH || 0.02);
      gl.uniform3fv(pb.u('uDusk'), planet.dusk || (planet.atm ? planet.atm.slice(0, 3).map(c => c * 0.75) : [0, 0, 0]));
      gl.uniform2fv(pb.u('uRingR'), planet.rings || [2, 3]);
      gl.uniform4f(pb.u('uOpt'), planet.earth ? 1 : 0, planet.rings ? 1 : 0, moons.length, planet.gas ? 1 : 0);
      const mArr = new Float32Array(16), cArr = new Float32Array(12);
      moons.forEach((m, i) => { mArr.set([...toBody(moonPos[i], B), m.km / R], i * 4); cArr.set(m.color, i * 3); });
      gl.uniform4fv(pb.u('uMoon'), mArr);
      gl.uniform3fv(pb.u('uMoonC'), cArr);
      if (planet.earth) {
        // The Moon is tidally locked: its prime meridian faces Earth.
        const mp = moonPos[0];
        const X = norm(mul(mp, -1));
        const Z = norm(sub(ECL_N, mul(X, dot(ECL_N, X))));
        const Y = cross(Z, X);
        const rowsB = [toBody(X, B), toBody(Y, B), toBody(Z, B)];
        gl.uniformMatrix3fv(pb.u('uMoonM'), false, [rowsB[0][0], rowsB[1][0], rowsB[2][0], rowsB[0][1], rowsB[1][1], rowsB[2][1], rowsB[0][2], rowsB[1][2], rowsB[2][2]]);
      }
      [['uTex', tx.surface], ['uNight', tx.night], ['uCloud', tx.cloud], ['uRing', tx.ring], ['uMoonTex', tx.moon]].forEach(([name, slot], i) => {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, slot.tex);
        gl.uniform1i(pb.u(name), i);
      });
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      a0 = bindTri(pb);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(a0);
      // Load sharper maps once the globe fills a good part of the screen.
      const pxRadius = (H / 2) * (1 / Math.sqrt(Math.max(1e-6, Math.exp(cam.logD) ** 2 - 1))) / tanY;
      if (pxRadius > 360) upgradeTextures();
    } else {
      const pd = P.dot;
      gl.useProgram(pd);
      camUniforms(pd, b, tanX, tanY);
      gl.uniform3fv(pd.u('uCam'), b.pos);
      gl.uniform1f(pd.u('uPx'), dpr);
      gl.blendFunc(gl.ONE, gl.ONE);
      const ap = pd.a('aPos'), ac = pd.a('aCol');
      gl.enableVertexAttribArray(ap); gl.enableVertexAttribArray(ac);
      if (showLabels) {
        gl.bindBuffer(gl.ARRAY_BUFFER, sys.orbitBuf);
        gl.vertexAttribPointer(ap, 3, gl.FLOAT, false, 28, 0);
        gl.vertexAttribPointer(ac, 4, gl.FLOAT, false, 28, 12);
        gl.uniform1f(pd.u('uLine'), 1);
        gl.uniform1f(pd.u('uAlpha'), 1);
        for (const [s, n] of sys.ranges) gl.drawArrays(gl.LINE_STRIP, s, n);
      }
      // Swarm.
      gl.disableVertexAttribArray(ap); gl.disableVertexAttribArray(ac);
      const ps = P.swarm;
      gl.useProgram(ps);
      camUniforms(ps, b, tanX, tanY);
      gl.uniform3fv(ps.u('uCam'), b.pos);
      gl.uniform1f(ps.u('uPx'), Math.max(1.5, 1.6 * dpr));
      gl.uniform1f(ps.u('uDt'), simDay - sys.epoch);
      gl.uniform1f(ps.u('uAlpha'), system === SYSTEMS['asteroid-belt'] ? 0.55 : 0.8);
      gl.uniform3fv(ps.u('uPopC'), system.pops.flatMap(p => p.color));
      gl.uniform3fv(ps.u('uPopOn'), sys.popOn);
      const attrs = [[sys.aBuf, 'aA', 3], [sys.bBuf, 'aB', 4], [sys.cBuf, 'aPop', 1]].map(([buf, name, size]) => {
        const loc = ps.a(name);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
        return loc;
      });
      gl.drawArrays(gl.POINTS, 0, sys.count);
      attrs.forEach(l => gl.disableVertexAttribArray(l));
      // Planet and dwarf-planet dots.
      gl.useProgram(pd);
      const dots = [];
      for (const body of sys.bodies) dots.push(...helio(body.el, simDay), ...body.color, body.size);
      gl.bindBuffer(gl.ARRAY_BUFFER, sys.dotBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dots), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(ap); gl.enableVertexAttribArray(ac);
      gl.vertexAttribPointer(ap, 3, gl.FLOAT, false, 28, 0);
      gl.vertexAttribPointer(ac, 4, gl.FLOAT, false, 28, 12);
      gl.uniform1f(pd.u('uLine'), 0);
      gl.drawArrays(gl.POINTS, 0, sys.bodies.length);
      gl.disableVertexAttribArray(ap); gl.disableVertexAttribArray(ac);
    }

    // Labels, positioned in CSS pixels.
    const labelStart = performance.now();
    if (showLabels) {
      const rect = { w: canvas.clientWidth, h: canvas.clientHeight };
      const placed = [];
      // Keep labels out from under the intro text that overlays the view on wide screens.
      const cr = canvas.getBoundingClientRect(), ir = intro && !isFull() && innerWidth >= 760 ? intro.getBoundingClientRect() : null;
      const under = (px, py) => ir && px + cr.left < ir.right && py + cr.top > ir.top && py + cr.top < ir.bottom;
      for (const L of labels) {
        const world = L.getPos();
        const v = sub(world, b.pos);
        const z = dot(v, b.F);
        let show = z > 0;
        let x = 0, y = 0;
        if (show) {
          x = (dot(v, b.R) / (z * tanX) + b.shift[0]) * 0.5 + 0.5;
          y = 0.5 - (dot(v, b.U) / (z * tanY) + b.shift[1]) * 0.5;
          show = x > 0.01 && x < 0.97 && y > 0.04 && y < 0.93;
          if (planet && show && L.kind !== 'planet') {
            // Hide labels whose object is behind the planet.
            const d = norm(v), o = b.pos, bq = dot(o, d), c = dot(o, o) - 1, h = bq * bq - c;
            if (h > 0 && -bq - Math.sqrt(h) > 0 && -bq - Math.sqrt(h) < len(v)) show = false;
          }
          if (planet && L.kind === 'planet') {
            const angR = Math.asin(Math.min(1, 1 / len(b.pos)));
            show = show && angR / (fovY() / 2) < 0.05; // only once the planet is a dot
          }
          if (L.kind === 'moon' && cam.focusIdx >= 0 && moons[cam.focusIdx].name === L.name) show = false;
        }
        if (show) {
          const px = x * rect.w, py = y * rect.h;
          if (under(px, py) || placed.some(([qx, qy]) => Math.abs(qx - px) < 64 && Math.abs(qy - py) < 16)) show = false;
          else placed.push([px, py]);
        }
        L.el.hidden = !show;
        if (show) L.el.style.transform = `translate(${(x * rect.w).toFixed(1)}px, ${(y * rect.h).toFixed(1)}px)`;
      }
    }
    updateLive();
    const labelMs = performance.now() - labelStart;

    // Adaptive resolution: about once a second, time a frame to the end of the GPU work and
    // trade pixels for speed only when the GPU is really the bottleneck. (gl.finish() returns
    // at once in Chrome; reading back one pixel is what actually waits for the GPU.)
    if (probing) {
      lastCheck = t;
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, probe);
      samples.push(performance.now() - start - labelMs);
      if (samples.length > 3) samples.shift();
      // Decide on three samples in a row, so one-off spikes (texture uploads) don't count.
      if (samples.length === 3) {
        const lo = Math.min(...samples), hi = Math.max(...samples);
        if (lo > 12 && scale > 0.35) { scale = Math.max(0.35, scale * (lo > 40 ? 0.6 : 0.8)); samples.length = 0; resize(); }
        else if (hi < 6 && scale < 1) { scale = Math.min(1, scale * 1.15); samples.length = 0; resize(); }
      }
    }
    if (busy || warp) invalidate();
    else lastT = 0;
  }

  /* ---------- go ---------- */
  setLimits();
  updateScene();
  home(false);
  renderRate();
  if (!reduceMotion && !software) {
    arrival = true;
    cam.logD = cam.tl + Math.log(planet ? 7 : 4);
    cam.yaw = cam.ty + 0.9;
    cam.pitch = cam.tp + 0.25;
  }
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); cancelAnimationFrame(raf); raf = 0; });
  canvas.addEventListener('webglcontextrestored', () => location.reload());
  // Draw nothing until the lesson itself has loaded.
  const begin = () => { started = true; resize(); };
  if (document.readyState === 'complete') begin();
  else addEventListener('load', begin, { once: true });
})();
