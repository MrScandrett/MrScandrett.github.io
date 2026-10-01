import { THREE, OrbitControls } from '../../../assets/vendor/three-bundle.min.js';

// ASCII City: a real Three.js scene is rendered at a tiny resolution (one
// pixel per character cell), then every pixel is turned into a glyph whose
// density matches its brightness and whose colour matches its hue.

var canvas = document.getElementById("game");
var ctx = canvas.getContext("2d");
var minimap = document.getElementById("minimap");
var mctx = minimap.getContext("2d");
var bootOverlay = document.getElementById("bootOverlay");
var bootSeed = document.getElementById("bootSeed");
var toast = document.getElementById("toast");
var rampStrip = document.getElementById("rampStrip");
var customRamp = document.getElementById("customRamp");
var stat = {
  sector: document.getElementById("stat-sector"),
  heading: document.getElementById("stat-heading"),
  mode: document.getElementById("stat-mode"),
  seed: document.getElementById("stat-seed"),
  grid: document.getElementById("stat-grid"),
  fps: document.getElementById("stat-fps")
};

// ---- seeded randomness ----------------------------------------------------
// Every city comes from one number, so a seed in the URL rebuilds the same city.
var seed = 0;
var rng = Math.random;
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick(arr) { return arr[(rng() * arr.length) | 0]; }

// ---- display settings -----------------------------------------------------
var RAMPS = {
  classic: " .'`,:;-~=+*!?%#&$@",
  blocks: " ░▒▓█",
  binary: " 01",
  matrix: " ｰｨｼｦﾂﾊﾐﾘﾈﾓﾜﾎﾑﾒ",
  custom: " .oO@"
};
// Ramps whose order should come from measured ink, not the order typed.
var SORT_BY_INK = { matrix: true, custom: true };

// Integer cell sizes keep every glyph on whole pixels; all land near 960 wide.
var DETAIL = {
  low:    { cols: 96,  rows: 37,  cw: 10, ch: 17 },
  normal: { cols: 160, rows: 62,  cw: 6,  ch: 10 },
  high:   { cols: 192, rows: 77,  cw: 5,  ch: 8 },
  max:    { cols: 240, rows: 103, cw: 4,  ch: 6 }
};
var PALETTES = {
  neon: null,                 // per-pixel hue from the 3D frame
  phosphor: "#46ff7a",
  amber: "#ffb43c"
};
var EDGE_GLYPHS = "|/-\\";

var settings = {
  ramp: "classic",
  detail: "normal",
  palette: "neon",
  view: "ascii",             // ascii | split | pixels
  edges: false,
  rain: false
};

var COLS, ROWS, CELL_W, CELL_H;
var glyphs = [];              // ramp after ordering, space first
var atlas = document.createElement("canvas");
var actx = atlas.getContext("2d", { willReadFrequently: true });
var tint = document.createElement("canvas");
var tctx = tint.getContext("2d", { willReadFrequently: true });
var luma = new Float32Array(0);
var frameGlyph = new Int16Array(0); // last frame, for "copy as text"

// Draw each glyph once in white; frames then stamp cells from this atlas.
// Wide glyphs (katakana, emoji) are squeezed to fit the cell.
function buildAtlas() {
  var src = Array.from(RAMPS[settings.ramp]).filter(function (g, i, a) { return a.indexOf(g) === i; });
  if (src.indexOf(" ") < 0) src.unshift(" ");
  var all = src.concat(Array.from(EDGE_GLYPHS));
  atlas.width = all.length * CELL_W;
  atlas.height = CELL_H;
  actx.clearRect(0, 0, atlas.width, atlas.height);
  var size = Math.round(CELL_H * 0.98);
  actx.font = size + 'px "Courier New", "DejaVu Sans Mono", monospace';
  actx.textBaseline = "middle";
  actx.textAlign = "center";
  actx.fillStyle = "#fff";
  all.forEach(function (g, i) {
    var w = actx.measureText(g).width;
    var sx = w > CELL_W ? CELL_W / w : 1;
    actx.setTransform(sx, 0, 0, 1, i * CELL_W + CELL_W / 2, CELL_H / 2 + 0.5);
    actx.fillText(g, 0, 0);
  });
  actx.setTransform(1, 0, 0, 1, 0, 0);

  // Measure how much light each glyph puts in its cell: the ramp's true brightness
  // order. Weighting by colour as well as coverage ranks emoji like 🌑 as dark.
  var px = actx.getImageData(0, 0, atlas.width, CELL_H).data;
  var ink = all.map(function (g, i) {
    var sum = 0;
    for (var y = 0; y < CELL_H; y++) {
      for (var x = 0; x < CELL_W; x++) {
        var o = (y * atlas.width + i * CELL_W + x) * 4;
        sum += px[o + 3] * (px[o] * 0.299 + px[o + 1] * 0.587 + px[o + 2] * 0.114) / 255;
      }
    }
    return sum / (CELL_W * CELL_H * 255);
  });
  var order = src.map(function (g, i) { return i; });
  if (SORT_BY_INK[settings.ramp]) {
    order.sort(function (a, b) { return src[a] === " " ? -1 : src[b] === " " ? 1 : ink[a] - ink[b]; });
  }
  // Re-pack the atlas in brightness order so a glyph's index is its shade.
  var copy = document.createElement("canvas");
  copy.width = atlas.width; copy.height = atlas.height;
  copy.getContext("2d").drawImage(atlas, 0, 0);
  actx.clearRect(0, 0, atlas.width, atlas.height);
  glyphs = [];
  order.forEach(function (from, to) {
    actx.drawImage(copy, from * CELL_W, 0, CELL_W, CELL_H, to * CELL_W, 0, CELL_W, CELL_H);
    glyphs.push({ ch: src[from], ink: ink[from] });
  });
  for (var e = 0; e < EDGE_GLYPHS.length; e++) {
    var at = src.length + e;
    actx.drawImage(copy, at * CELL_W, 0, CELL_W, CELL_H, at * CELL_W, 0, CELL_W, CELL_H);
  }
  renderRampStrip();
}

function renderRampStrip() {
  rampStrip.textContent = "";
  var maxInk = Math.max.apply(null, glyphs.map(function (g) { return g.ink; })) || 1;
  glyphs.forEach(function (g, i) {
    var cell = document.createElement("span");
    cell.className = "ramp-cell";
    var shade = Math.round((i / Math.max(1, glyphs.length - 1)) * 100);
    cell.title = (g.ch === " " ? "space" : g.ch) + ": used for brightness ~" + shade +
      "%, inks " + Math.round((g.ink / maxInk) * 100) + "% as much as the darkest glyph";
    var ch = document.createElement("span");
    ch.className = "ramp-ch";
    ch.textContent = g.ch === " " ? " " : g.ch;
    var bar = document.createElement("span");
    bar.className = "ramp-bar";
    bar.style.background = "hsl(0 0% " + (8 + shade * 0.85) + "%)";
    cell.appendChild(ch);
    cell.appendChild(bar);
    rampStrip.appendChild(cell);
  });
}

// ---- three.js scene ---------------------------------------------------------
var glCanvas = document.createElement("canvas");
var renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setClearColor(0x020006);

var scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x020006, 60, 190);
var camera = new THREE.PerspectiveCamera(62, 1.5, 0.1, 600);

scene.add(new THREE.HemisphereLight(0x5a4d9a, 0x120818, 0.55));
// The moon lights east and north faces, so every tower shows one bright and one
// dark side from the flyover: two shades the glyph ramp can tell apart.
var moonLight = new THREE.DirectionalLight(0xffb8f0, 1.6);
moonLight.position.set(70, 55, -30);
scene.add(moonLight);

// Sky: stars and a moon that ignore fog, so they read as '.' and '@' up high.
(function buildSky() {
  var n = 700, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), r = mulberry32(7);
  for (var i = 0; i < n; i++) {
    // Mostly faint stars, a few bright ones: they land on '.', ':', '*' instead of all '@'.
    var lum = 0.12 + Math.pow(r(), 3) * 0.6;
    col[i * 3] = lum * 0.9; col[i * 3 + 1] = lum * 0.95; col[i * 3 + 2] = lum;
    var th = r() * Math.PI * 2, ph = r() * Math.PI * 0.42;
    pos[i * 3] = Math.cos(th) * Math.sin(ph) * 420;
    pos[i * 3 + 1] = Math.cos(ph) * 420 + 20;
    pos[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * 420;
  }
  var g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ vertexColors: true, size: 1, sizeAttenuation: false, fog: false })));
  var moon = new THREE.Mesh(new THREE.SphereGeometry(18, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe9c8, fog: false }));
  moon.position.set(-220, 210, -300);
  scene.add(moon);
})();

var controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.8;
controls.maxPolarAngle = Math.PI * 0.47;
controls.minDistance = 20;
controls.maxDistance = 160;

// ---- city layout ------------------------------------------------------------
var BLOCKS = 7;        // city blocks per side
var BLOCK = 10;        // block width in world units
var ROAD = 4;          // road width
var PERIOD = BLOCK + ROAD;
var SIZE = BLOCKS * PERIOD;
var HALF = SIZE / 2;

var NEON = [0x7cfcf0, 0xff7ce8, 0xffd166, 0x7cff9c, 0x9d7cff];
var SIGN_WORDS = ["ASCII", "@", "0x41", "ROGUE", "8-BIT", "HELLO", "#", "$$$", ">_", "NEON"];

// Window grids are shared; each tower clones one with its own repeat and offset.
function windowTexture(r, density) {
  var c = document.createElement("canvas");
  c.width = 64; c.height = 128;
  var g = c.getContext("2d");
  g.fillStyle = "#000";
  g.fillRect(0, 0, 64, 128);
  var hues = ["#ffe6a8", "#7cfcf0", "#ff9cf0", "#ffffff"];
  for (var y = 4; y < 128; y += 8) {
    for (var x = 4; x < 64; x += 8) {
      if (r() < density) {
        g.fillStyle = hues[(r() * hues.length) | 0];
        g.fillRect(x, y, 4, 5);
      }
    }
  }
  var tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}
var windowTex = [0.3, 0.42, 0.55].map(function (d, i) { return windowTexture(mulberry32(i + 1), d); });

function signTexture(word, color) {
  var c = document.createElement("canvas");
  c.width = 128; c.height = 48;
  var g = c.getContext("2d");
  g.fillStyle = "#08040e";
  g.fillRect(0, 0, 128, 48);
  g.strokeStyle = color;
  g.lineWidth = 4;
  g.strokeRect(3, 3, 122, 42);
  g.fillStyle = color;
  g.font = 'bold 30px "Courier New", monospace';
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(word, 64, 26);
  return new THREE.CanvasTexture(c);
}

var city = new THREE.Group();
scene.add(city);
var solids = [];     // axis-aligned footprints for street-mode collision
var cars = [];
var flyers = [];
var beams = [];
var signs = [];
var mapTiles = [];   // for the minimap: {x, z, w, d, color}

function disposeCity() {
  city.traverse(function (o) {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      if (o.material.emissiveMap) o.material.emissiveMap.dispose();
      if (o.material.map) o.material.map.dispose();
      o.material.dispose();
    }
  });
  scene.remove(city);
  city = new THREE.Group();
  scene.add(city);
  solids = []; cars = []; flyers = []; beams = []; signs = []; mapTiles = [];
}

function box(w, h, d, mat, x, y, z, parent) {
  var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  (parent || city).add(m);
  return m;
}

function blockOrigin(i) { return -HALF + i * PERIOD + ROAD / 2; }
function roadLine(k) { return -HALF + k * PERIOD; }

function towerMaterial(w, h) {
  var tex = pick(windowTex).clone();
  tex.needsUpdate = true;
  tex.repeat.set(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 4)));
  tex.offset.set(rng(), rng());
  return new THREE.MeshLambertMaterial({
    color: new THREE.Color().setHSL(0.7 + rng() * 0.1, 0.35, 0.16 + rng() * 0.06),
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: 0.6
  });
}

function addTower(x, z, w, d, h) {
  box(w, h, d, towerMaterial(w, h), x, h / 2 + 0.2, z);
  solids.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
  mapTiles.push({ x: x - w / 2, z: z - d / 2, w: w, d: d, color: h > 22 ? "#ff7ce8" : "#5b4f86" });

  var top = h + 0.2;
  // Tall towers step back into a narrower crown, like real skyscraper setbacks.
  if (h > 18 && rng() < 0.6) {
    var cw = w * (0.5 + rng() * 0.2), cd = d * (0.5 + rng() * 0.2), chh = h * (0.2 + rng() * 0.25);
    box(cw, chh, cd, towerMaterial(cw, chh), x, top + chh / 2, z);
    top += chh;
    w = cw; d = cd;
  }
  if (rng() < 0.45) {
    box(w + 0.1, 0.25, d + 0.1, new THREE.MeshBasicMaterial({ color: pick(NEON) }), x, top, z);
  }
  if (h > 24 && rng() < 0.6) {
    box(0.2, 5, 0.2, new THREE.MeshBasicMaterial({ color: 0xff3b5c }), x, top + 2.5, z);
  }
  return top;
}

// A neon sign bolted to one face of a tower, facing the street.
function addSign(x, z, w, d, h) {
  var face = (rng() * 4) | 0;
  var color = pick(NEON);
  var hex = "#" + color.toString(16).padStart(6, "0");
  var sw = Math.min(5, (face < 2 ? d : w) * 0.8), sh = sw * 0.375;
  var mat = new THREE.MeshBasicMaterial({ map: signTexture(pick(SIGN_WORDS), hex), side: THREE.DoubleSide });
  var m = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), mat);
  var y = 3 + rng() * Math.max(1, h - 6);
  if (face === 0) { m.position.set(x + w / 2 + 0.06, y, z); m.rotation.y = Math.PI / 2; }
  if (face === 1) { m.position.set(x - w / 2 - 0.06, y, z); m.rotation.y = -Math.PI / 2; }
  if (face === 2) { m.position.set(x, y, z + d / 2 + 0.06); }
  if (face === 3) { m.position.set(x, y, z - d / 2 - 0.06); m.rotation.y = Math.PI; }
  city.add(m);
  signs.push({ mat: mat, phase: rng() * 10, flicker: rng() < 0.3 });
}

function addSearchlight(x, y, z) {
  var pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  var len = 70;
  var cone = new THREE.Mesh(
    new THREE.ConeGeometry(7, len, 20, 1, true),
    new THREE.MeshBasicMaterial({
      color: pick([0x7cfcf0, 0xff7ce8, 0xbfd4ff]),
      transparent: true, opacity: 0.09, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false
    })
  );
  cone.position.y = len / 2;
  cone.rotation.x = Math.PI;      // narrow end at the lamp, wide end in the sky
  pivot.add(cone);
  city.add(pivot);
  beams.push({ pivot: pivot, speed: 0.3 + rng() * 0.4, phase: rng() * 6, tilt: 0.35 + rng() * 0.3 });
}

function generateCity(newSeed) {
  seed = newSeed >>> 0;
  rng = mulberry32(seed);
  disposeCity();

  var ground = new THREE.Mesh(
    new THREE.PlaneGeometry(SIZE * 4, SIZE * 4),
    new THREE.MeshLambertMaterial({ color: 0x0c0a12 })
  );
  ground.rotation.x = -Math.PI / 2;
  city.add(ground);

  // Lane stripes down the middle of every road.
  var stripeMat = new THREE.MeshBasicMaterial({ color: 0x5a5470 });
  for (var r = 0; r <= BLOCKS; r++) {
    var p = roadLine(r);
    for (var t = -HALF; t < HALF; t += 3) {
      box(1.4, 0.02, 0.15, stripeMat, t, 0.02, p);
      box(0.15, 0.02, 1.4, stripeMat, p, 0.02, t);
    }
  }

  var tallest = [];
  for (var bx = 0; bx < BLOCKS; bx++) {
    for (var bz = 0; bz < BLOCKS; bz++) {
      var ox = blockOrigin(bx), oz = blockOrigin(bz);
      var cx = ox + BLOCK / 2, cz = oz + BLOCK / 2;
      var centre = Math.hypot(cx, cz) / HALF;           // 0 downtown, ~1.4 at corners
      var roll = rng();

      box(BLOCK, 0.2, BLOCK, new THREE.MeshLambertMaterial({ color: 0x1c1828 }), cx, 0.1, cz);

      if (roll < 0.12 && centre > 0.3) {
        // Park: grass, cone trees, and a ring of path lamps.
        box(BLOCK - 1, 0.25, BLOCK - 1, new THREE.MeshLambertMaterial({ color: 0x1d5a34 }), cx, 0.2, cz);
        mapTiles.push({ x: ox, z: oz, w: BLOCK, d: BLOCK, color: "#1f7a45" });
        var leaf = new THREE.MeshLambertMaterial({ color: 0x4fd67c, emissive: 0x0c3018 });
        for (var k = 0; k < 7; k++) {
          var tree = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.6, 6), leaf);
          tree.position.set(ox + 1.5 + rng() * (BLOCK - 3), 1.6, oz + 1.5 + rng() * (BLOCK - 3));
          city.add(tree);
          solids.push({ x0: tree.position.x - 0.4, x1: tree.position.x + 0.4, z0: tree.position.z - 0.4, z1: tree.position.z + 0.4 });
        }
        var lampMat = new THREE.MeshBasicMaterial({ color: 0xffe6a8 });
        for (var l = 0; l < 4; l++) {
          box(0.35, 0.35, 0.35, lampMat, cx + (l & 1 ? 3.5 : -3.5), 2.2, cz + (l & 2 ? 3.5 : -3.5));
        }
        continue;
      }

      // 1–4 towers per block; taller toward the middle of town.
      var split = rng() < 0.5 ? 1 : 2;
      var cell = (BLOCK - 1) / split;
      for (var ix = 0; ix < split; ix++) {
        for (var iz = 0; iz < split; iz++) {
          var w = cell - 0.6 - rng() * 1.2;
          var d = cell - 0.6 - rng() * 1.2;
          var h = (4 + rng() * 10) * (1 + Math.max(0, 1.2 - centre) * 2.2);
          var x = ox + 0.5 + cell * (ix + 0.5);
          var z = oz + 0.5 + cell * (iz + 0.5);
          var top = addTower(x, z, w, d, h);
          if (rng() < 0.35) addSign(x, z, w, d, h);
          tallest.push({ x: x, z: z, top: top });
        }
      }
    }
  }

  // Searchlights sweep from the three tallest roofs.
  tallest.sort(function (a, b) { return b.top - a.top; });
  tallest.slice(0, 3).forEach(function (t) { addSearchlight(t.x, t.top, t.z); });

  // Traffic: every lane has one speed, so cars in a lane never pass through each other.
  var carColors = [0xffd166, 0x7cfcf0, 0xff7ce8, 0xe0e0ff];
  var head = new THREE.MeshBasicMaterial({ color: 0xffffee });
  var tail = new THREE.MeshBasicMaterial({ color: 0xff2040 });
  var lanes = {};
  for (var c = 0; c < 46; c++) {
    var alongX = rng() < 0.5;
    var dir = rng() < 0.5 ? 1 : -1;
    var road = roadLine((rng() * (BLOCKS + 1)) | 0);
    var laneKey = (alongX ? "x" : "z") + road + ":" + dir;
    if (!lanes[laneKey]) lanes[laneKey] = { speed: 6 + rng() * 8, used: [] };
    var lane = lanes[laneKey];
    var s0 = (rng() - 0.5) * SIZE;
    // Skip spots already taken by another car in this lane.
    if (lane.used.some(function (u) { return Math.abs(u - s0) < 4; })) continue;
    lane.used.push(s0);

    var car = new THREE.Group();
    var body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 1),
      new THREE.MeshLambertMaterial({ color: carColors[c % carColors.length], emissive: 0x111122 }));
    body.position.y = 0.55;
    car.add(body);
    var hl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.8), head);
    hl.position.set(1.02, 0.6, 0);
    car.add(hl);
    var tl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.8), tail);
    tl.position.set(-1.02, 0.6, 0);
    car.add(tl);
    car.rotation.y = alongX ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? -Math.PI / 2 : Math.PI / 2);
    var off = dir * 0.9 * (alongX ? 1 : -1);
    if (alongX) car.position.set(s0, 0, road + off);
    else car.position.set(road + off, 0, s0);
    city.add(car);
    cars.push({ mesh: car, alongX: alongX, dir: dir, speed: lane.speed, wrapped: false });
  }

  // Flying cars circle the skyline on their own altitude bands.
  for (var f = 0; f < 7; f++) {
    var fl = new THREE.Group();
    var neon = pick(NEON);
    box(2.2, 0.6, 1.1, new THREE.MeshLambertMaterial({ color: 0x2a2a40, emissive: 0x111122 }), 0, 0, 0, fl);
    box(2.4, 0.12, 1.3, new THREE.MeshBasicMaterial({ color: neon }), 0, -0.36, 0, fl);
    box(0.1, 0.2, 0.7, head, 1.15, 0.05, 0, fl);
    city.add(fl);
    flyers.push({ mesh: fl, r: 18 + rng() * 32, y: 20 + rng() * 18, speed: (0.1 + rng() * 0.15) * (rng() < 0.5 ? 1 : -1), a: rng() * Math.PI * 2 });
  }

  rideIndex = 0;
  stat.seed.textContent = seed;
  bootSeed.textContent = seed;
  try { history.replaceState(null, "", "#seed=" + seed); } catch (e) { /* file:// or sandboxed */ }
}

// ---- rain -----------------------------------------------------------------------
// Short line segments falling through the whole city. In ASCII they come out as
// faint ':' and, with edge glyphs on, as slanted '/' streaks.
var RAIN_N = 2600;
var rainPos = new Float32Array(RAIN_N * 6);
var rainGeo = new THREE.BufferGeometry();
rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
var rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x8fa8d8, transparent: true, opacity: 0.8 }));
rain.frustumCulled = false;
rain.visible = false;
scene.add(rain);
(function seedRain() {
  for (var i = 0; i < RAIN_N; i++) {
    var x = (Math.random() - 0.5) * (SIZE + 30), y = Math.random() * 70, z = (Math.random() - 0.5) * (SIZE + 30);
    rainPos.set([x, y, z, x - 0.25, y + 1.6, z], i * 6);
  }
})();
function updateRain(dt) {
  var fall = 38 * dt, drift = 6 * dt;
  for (var i = 0; i < RAIN_N; i++) {
    var o = i * 6;
    rainPos[o + 1] -= fall; rainPos[o + 4] -= fall;
    rainPos[o] += drift; rainPos[o + 3] += drift;
    if (rainPos[o + 1] < 0) {
      var x = (Math.random() - 0.5) * (SIZE + 30), z = (Math.random() - 0.5) * (SIZE + 30);
      rainPos.set([x, 70, z, x - 0.25, 71.6, z], o);
    }
  }
  rainGeo.attributes.position.needsUpdate = true;
}

// ---- views: flyover, street, ride-along -------------------------------------------
var MODES = ["orbit", "street", "ride"];
var MODE_NAMES = { orbit: "FLYOVER", street: "STREET", ride: "RIDE-ALONG" };
var mode = "orbit";
var walker = { x: 0, z: 0, yaw: 0, pitch: 0, bob: 0 };
var rideIndex = 0;
var keys = {};

function applyFog() {
  var near = mode === "orbit" ? 60 : 12, far = mode === "orbit" ? 190 : 80;
  if (settings.rain) { near *= 0.5; far *= 0.6; }
  scene.fog.near = near;
  scene.fog.far = far;
}

function setMode(m) {
  mode = m;
  controls.enabled = m === "orbit";
  if (document.pointerLockElement && m !== "street") document.exitPointerLock();
  applyFog();
  if (m === "orbit") {
    camera.position.set(64, 24, 64);
    controls.target.set(0, 10, 0);
  } else if (m === "street") {
    // Start at the intersection nearest downtown, looking up the avenue.
    var k = Math.floor(BLOCKS / 2);
    walker.x = roadLine(k); walker.z = roadLine(k) + PERIOD / 2;
    walker.yaw = Math.PI; walker.pitch = 0.08;
  } else {
    snapRide = true;
  }
  stat.mode.textContent = MODE_NAMES[m];
  setPressed("mode", m);
}

function blocked(x, z) {
  var r = 0.6;
  if (Math.abs(x) > HALF + 6 || Math.abs(z) > HALF + 6) return true;
  for (var i = 0; i < solids.length; i++) {
    var b = solids[i];
    if (x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) return true;
  }
  return false;
}

function updateWalker(dt) {
  var turn = (keys.ArrowLeft || keys.KeyQ ? 1 : 0) - (keys.ArrowRight || keys.KeyE ? 1 : 0);
  walker.yaw += turn * 2.2 * dt;
  var fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  var strafe = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  var running = keys.ShiftLeft || keys.ShiftRight;
  var speed = (running ? 16 : 8) * dt;
  var fx = Math.sin(walker.yaw), fz = Math.cos(walker.yaw);
  var dx = (fx * fwd - fz * strafe) * speed;
  var dz = (fz * fwd + fx * strafe) * speed;
  if (!blocked(walker.x + dx, walker.z)) walker.x += dx;
  if (!blocked(walker.x, walker.z + dz)) walker.z += dz;
  if (fwd || strafe) walker.bob += dt * (running ? 14 : 9);

  var eye = 1.7 + Math.sin(walker.bob) * 0.06;
  var cp = Math.cos(walker.pitch);
  camera.position.set(walker.x, eye, walker.z);
  camera.lookAt(walker.x + fx * cp, eye + Math.sin(walker.pitch), walker.z + fz * cp);
}

var snapRide = true;
var rideFrom = new THREE.Vector3(), rideLook = new THREE.Vector3(), rideLookNow = new THREE.Vector3();
function updateRide(dt) {
  if (!cars.length) return;
  var c = cars[rideIndex % cars.length];
  var p = c.mesh.position;
  var fx = c.alongX ? c.dir : 0, fz = c.alongX ? 0 : c.dir;
  rideFrom.set(p.x - fx * 6, 2.6, p.z - fz * 6);
  rideLook.set(p.x + fx * 8, 1.2, p.z + fz * 8);
  if (snapRide || c.wrapped) {
    camera.position.copy(rideFrom);
    rideLookNow.copy(rideLook);
    snapRide = false;
  } else {
    var k = 1 - Math.exp(-dt * 5);
    camera.position.lerp(rideFrom, k);
    rideLookNow.lerp(rideLook, k);
  }
  camera.lookAt(rideLookNow);
}

function nextCar(step) {
  if (!cars.length) return;
  rideIndex = (rideIndex + step + cars.length) % cars.length;
  snapRide = true;
}

// Street look: pointer lock with a mouse, plain drag with touch or pen.
var dragging = false, lastX = 0, lastY = 0;
function look(dx, dy) {
  walker.yaw -= dx * 0.005;
  walker.pitch = Math.max(-0.9, Math.min(0.9, walker.pitch - dy * 0.004));
}
canvas.addEventListener("pointerdown", function (e) {
  if (mode !== "street") return;
  if (e.pointerType === "mouse" && canvas.requestPointerLock) {
    try { canvas.requestPointerLock(); } catch (err) { /* fall back to drag */ }
  }
  dragging = true; lastX = e.clientX; lastY = e.clientY;
});
window.addEventListener("pointerup", function () { dragging = false; });
window.addEventListener("pointermove", function (e) {
  if (mode !== "street") return;
  if (document.pointerLockElement === canvas) { look(e.movementX, e.movementY); return; }
  if (!dragging) return;
  look(e.clientX - lastX, e.clientY - lastY);
  lastX = e.clientX; lastY = e.clientY;
});

// ---- settings UI ----------------------------------------------------------------------
function setPressed(group, value) {
  document.querySelectorAll('[data-group="' + group + '"]').forEach(function (b) {
    b.setAttribute("aria-pressed", String(b.dataset.value === value));
  });
}

function setDetail(name) {
  settings.detail = name;
  var d = DETAIL[name];
  COLS = d.cols; ROWS = d.rows; CELL_W = d.cw; CELL_H = d.ch;
  canvas.width = COLS * CELL_W;
  canvas.height = ROWS * CELL_H;
  tint.width = COLS; tint.height = ROWS;
  luma = new Float32Array(COLS * ROWS);
  frameGlyph = new Int16Array(COLS * ROWS);
  renderer.setSize(COLS, ROWS, false);
  // Character cells are taller than wide, so the 3D camera uses the canvas aspect.
  camera.aspect = canvas.width / canvas.height;
  camera.updateProjectionMatrix();
  buildAtlas();
  stat.grid.textContent = COLS + "×" + ROWS;
  setPressed("detail", name);
}

function setRamp(name) {
  settings.ramp = name;
  buildAtlas();
  setPressed("ramp", name);
  customRamp.classList.toggle("active", name === "custom");
}

function setPalette(name) { settings.palette = name; setPressed("palette", name); }
function setView(name) { settings.view = name; setPressed("view", name); }
function setToggle(name, on) {
  settings[name] = on;
  setPressed(name, String(on));
  if (name === "rain") { rain.visible = on; applyFog(); }
}

function cycle(list, current) { return list[(list.indexOf(current) + 1) % list.length]; }

document.querySelectorAll("[data-group]").forEach(function (b) {
  b.addEventListener("click", function () {
    var g = b.dataset.group, v = b.dataset.value;
    if (g === "mode") setMode(v);
    else if (g === "ramp") setRamp(v);
    else if (g === "detail") setDetail(v);
    else if (g === "palette") setPalette(v);
    else if (g === "view") setView(v);
    else setToggle(g, !settings[g]);
  });
});

customRamp.addEventListener("input", function () {
  var v = customRamp.value;
  RAMPS.custom = v.length ? v : " .oO@";
  setRamp("custom");
});

function newCity() { generateCity((Math.random() * 1e9) >>> 0); setMode(mode); }

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast.t);
  showToast.t = setTimeout(function () { toast.classList.remove("show"); }, 1800);
}

// The frame as plain text, one line per row, ready to paste anywhere monospace.
function frameText() {
  var lines = [];
  for (var y = 0; y < ROWS; y++) {
    var s = "";
    for (var x = 0; x < COLS; x++) {
      var gi = frameGlyph[y * COLS + x];
      s += gi < 0 ? EDGE_GLYPHS[-gi - 1] : glyphs[gi].ch;
    }
    lines.push(s.replace(/\s+$/, ""));
  }
  return lines.join("\n");
}

function copyFrame() {
  var text = frameText();
  var done = function () { showToast("Copied " + COLS + "×" + ROWS + " characters. Paste into any text box!"); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, function () { downloadText(text); });
  } else {
    downloadText(text);
  }
}

function downloadText(text) {
  var a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  a.download = "ascii-city-" + seed + ".txt";
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  showToast("Saved the frame as a .txt file");
}

document.getElementById("regenBtn").addEventListener("click", newCity);
document.getElementById("copyBtn").addEventListener("click", copyFrame);
bootOverlay.addEventListener("click", function () { bootOverlay.classList.add("hidden"); });

var RAMP_ORDER = ["classic", "blocks", "binary", "matrix", "custom"];
var DETAIL_KEYS = { Digit1: "low", Digit2: "normal", Digit3: "high", Digit4: "max" };

window.addEventListener("keydown", function (e) {
  if (e.target.tagName === "INPUT") return;
  if (e.target.tagName === "BUTTON" && (e.code === "Space" || e.code === "Enter")) return;
  keys[e.code] = true;
  if (e.repeat) return;
  bootOverlay.classList.add("hidden");
  switch (e.code) {
    case "KeyR": newCity(); break;
    case "KeyM": minimap.classList.toggle("hidden"); break;
    case "KeyC": setMode(cycle(MODES, mode)); break;
    case "KeyG": setRamp(cycle(RAMP_ORDER, settings.ramp)); break;
    case "KeyH": setPalette(cycle(Object.keys(PALETTES), settings.palette)); break;
    case "KeyP": setView(cycle(["ascii", "split", "pixels"], settings.view)); break;
    case "KeyX": setToggle("edges", !settings.edges); break;
    case "KeyT": setToggle("rain", !settings.rain); break;
    case "KeyF": copyFrame(); break;
  }
  if (DETAIL_KEYS[e.code]) setDetail(DETAIL_KEYS[e.code]);
  if (mode === "ride" && (e.code === "ArrowLeft" || e.code === "ArrowRight" || e.code === "KeyQ" || e.code === "KeyE")) {
    nextCar(e.code === "ArrowRight" || e.code === "KeyE" ? 1 : -1);
  }
  if (mode !== "orbit" && /^Arrow/.test(e.code)) e.preventDefault();
});
window.addEventListener("keyup", function (e) { keys[e.code] = false; });
window.addEventListener("blur", function () { keys = {}; });

// ---- ASCII conversion ---------------------------------------------------------------
function drawAscii(now) {
  tctx.drawImage(glCanvas, 0, 0);
  var img = tctx.getImageData(0, 0, COLS, ROWS);
  var px = img.data;
  var n = COLS * ROWS;

  for (var i = 0; i < n; i++) {
    luma[i] = (px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114) / 255;
  }

  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  var last = glyphs.length - 1;
  var edgeBase = glyphs.length;
  var edges = settings.edges;
  for (var y = 0; y < ROWS; y++) {
    for (var x = 0; x < COLS; x++) {
      var c = y * COLS + x;
      var gi = Math.min(last, Math.floor(Math.pow(luma[c], 0.7) * last * 1.15));
      var cellGlyph = gi;
      var atlasIndex = gi;

      // Edge glyphs: where brightness changes sharply, draw a stroke along the edge
      // instead of a shade. Sobel finds the gradient; the edge runs across it.
      if (edges && gi > 0 && x > 0 && y > 0 && x < COLS - 1 && y < ROWS - 1) {
        var tl = luma[c - COLS - 1], tc = luma[c - COLS], tr = luma[c - COLS + 1];
        var ml = luma[c - 1], mr = luma[c + 1];
        var bl = luma[c + COLS - 1], bc = luma[c + COLS], br = luma[c + COLS + 1];
        var gx = (tr + 2 * mr + br) - (tl + 2 * ml + bl);
        var gy = (bl + 2 * bc + br) - (tl + 2 * tc + tr);
        if (gx * gx + gy * gy > 0.36) {
          // Measure the angle in screen space: cells are taller than they are wide.
          var a = Math.atan2(gy / CELL_H, gx / CELL_W) * 180 / Math.PI;
          if (a < 0) a += 180;
          var e = a < 22.5 || a >= 157.5 ? 0 : a < 67.5 ? 1 : a < 112.5 ? 2 : 3;
          atlasIndex = edgeBase + e;
          cellGlyph = -e - 1;
        }
      }
      frameGlyph[c] = cellGlyph;
      if (atlasIndex > 0) ctx.drawImage(atlas, atlasIndex * CELL_W, 0, CELL_W, CELL_H, x * CELL_W, y * CELL_H, CELL_W, CELL_H);

      // Neon: push each pixel to full brightness so the glyph, not the tint, carries the shading.
      var o = c * 4, r = px[o], g = px[o + 1], b = px[o + 2];
      var k = 255 / Math.max(r, g, b, 1);
      px[o] = r * k * 0.85 + 38;
      px[o + 1] = g * k * 0.85 + 38;
      px[o + 2] = b * k * 0.85 + 38;
    }
  }

  ctx.globalCompositeOperation = "multiply";
  var mono = PALETTES[settings.palette];
  if (mono) {
    ctx.fillStyle = mono;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    tctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tint, 0, 0, canvas.width, canvas.height);
  }
  ctx.globalCompositeOperation = "source-over";

  if (settings.view !== "ascii") drawPixels(now);
}

// Peek behind the curtain: the raw low-res frame the characters were chosen from.
function drawPixels() {
  var split = settings.view === "split";
  var W = canvas.width, H = canvas.height, half = Math.round(COLS / 2);
  ctx.imageSmoothingEnabled = false;
  if (split) ctx.drawImage(glCanvas, 0, 0, half, ROWS, 0, 0, half * CELL_W, H);
  else ctx.drawImage(glCanvas, 0, 0, W, H);
  ctx.font = 'bold 13px "Courier New", monospace';
  ctx.textBaseline = "top";
  if (split) {
    var sx = half * CELL_W;
    ctx.fillStyle = "#7cfcf0";
    ctx.fillRect(sx - 1, 0, 2, H);
    label("PIXELS", sx - 10, "right");
    label("ASCII", sx + 10, "left");
  } else {
    label("RAW " + COLS + "×" + ROWS + " PIXELS", W - 12, "right");
  }
  function label(text, x, align) {
    ctx.textAlign = align;
    var w = ctx.measureText(text).width + 12;
    ctx.fillStyle = "rgba(5,5,14,0.75)";
    ctx.fillRect(align === "right" ? x - w + 6 : x - 6, H - 30, w, 20);
    ctx.fillStyle = "#7cfcf0";
    ctx.fillText(text, x, H - 27);
  }
  ctx.textAlign = "left";
}

// ---- minimap -------------------------------------------------------------------------
var tmpDir = new THREE.Vector3();
function drawMinimap() {
  if (minimap.classList.contains("hidden")) return;
  var W = minimap.width, sc = (W - 10) / SIZE;
  function mx(v) { return 5 + (v + HALF) * sc; }
  mctx.clearRect(0, 0, W, W);
  mctx.fillStyle = "#1a1526";
  mctx.fillRect(5, 5, W - 10, W - 10);
  for (var i = 0; i < mapTiles.length; i++) {
    var t = mapTiles[i];
    mctx.fillStyle = t.color;
    mctx.fillRect(mx(t.x), mx(t.z), t.w * sc, t.d * sc);
  }
  for (var c = 0; c < cars.length; c++) {
    var p = cars[c].mesh.position;
    var riding = mode === "ride" && c === rideIndex % cars.length;
    mctx.fillStyle = riding ? "#ffffff" : "#ffd166";
    var s = riding ? 4 : 2;
    mctx.fillRect(mx(p.x) - s / 2, mx(p.z) - s / 2, s, s);
  }
  camera.getWorldDirection(tmpDir);
  var px = Math.max(5, Math.min(W - 5, mx(camera.position.x))), pz = Math.max(5, Math.min(W - 5, mx(camera.position.z)));
  mctx.strokeStyle = "#7cfcf0";
  mctx.lineWidth = 2;
  mctx.beginPath();
  mctx.moveTo(px, pz);
  mctx.lineTo(px + tmpDir.x * 12, pz + tmpDir.z * 12);
  mctx.stroke();
  mctx.fillStyle = "#7cfcf0";
  mctx.beginPath();
  mctx.arc(px, pz, 3, 0, Math.PI * 2);
  mctx.fill();
}

// ---- main loop -------------------------------------------------------------------------
var COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
var lastT = performance.now(), frames = 0, acc = 0;

function animateCity(t, dt) {
  var edge = HALF + 4;
  for (var i = 0; i < cars.length; i++) {
    var c = cars[i], p = c.mesh.position, step = c.dir * c.speed * dt;
    c.wrapped = false;
    if (c.alongX) {
      p.x += step;
      if (p.x > edge) { p.x = -edge; c.wrapped = true; } else if (p.x < -edge) { p.x = edge; c.wrapped = true; }
    } else {
      p.z += step;
      if (p.z > edge) { p.z = -edge; c.wrapped = true; } else if (p.z < -edge) { p.z = edge; c.wrapped = true; }
    }
  }
  for (var f = 0; f < flyers.length; f++) {
    var fl = flyers[f];
    fl.a += fl.speed * dt;
    fl.mesh.position.set(Math.cos(fl.a) * fl.r, fl.y + Math.sin(t * 0.7 + f) * 0.8, Math.sin(fl.a) * fl.r);
    fl.mesh.rotation.y = -fl.a - (fl.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
  }
  for (var b = 0; b < beams.length; b++) {
    var bm = beams[b];
    bm.pivot.rotation.set(Math.sin(t * bm.speed + bm.phase) * bm.tilt, 0, Math.cos(t * bm.speed * 0.8 + bm.phase) * bm.tilt);
  }
  for (var s = 0; s < signs.length; s++) {
    var sg = signs[s];
    if (!sg.flicker) continue;
    // A dying neon tube: mostly on, with a stutter every few seconds.
    var ph = (t + sg.phase) % 4;
    sg.mat.color.setScalar(ph > 3.4 && Math.sin(t * 60) > 0 ? 0.15 : 1);
  }
  if (settings.rain) updateRain(dt);
}

function loop(now) {
  requestAnimationFrame(loop);
  var dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  var t = now / 1000;

  animateCity(t, dt);
  if (mode === "street") updateWalker(dt);
  else if (mode === "ride") updateRide(dt);
  else controls.update();

  renderer.render(scene, camera);
  drawAscii(now);
  drawMinimap();

  camera.getWorldDirection(tmpDir);
  // -z is north on the minimap.
  var deg = (Math.atan2(tmpDir.x, -tmpDir.z) * 180 / Math.PI + 360) % 360;
  stat.heading.textContent = COMPASS[Math.round(deg / 45) % 8];
  var sx = Math.max(0, Math.min(BLOCKS - 1, Math.floor((camera.position.x + HALF) / PERIOD)));
  var sz = Math.max(0, Math.min(BLOCKS - 1, Math.floor((camera.position.z + HALF) / PERIOD)));
  stat.sector.textContent = String(sx).padStart(2, "0") + "," + String(sz).padStart(2, "0");

  frames++; acc += dt;
  if (acc > 0.5) { stat.fps.textContent = Math.round(frames / acc); frames = 0; acc = 0; }
}

// Expose a little state for anyone poking at the page from the console.
window.asciiCity = { settings: settings, frameText: function () { return frameText(); }, get seed() { return seed; } };

var hashSeed = /seed=(\d+)/.exec(location.hash);
setDetail("normal");
setRamp("classic");
setPalette("neon");
setView("ascii");
setToggle("edges", false);
setToggle("rain", false);
generateCity(hashSeed ? Number(hashSeed[1]) : (Math.random() * 1e9) >>> 0);
setMode("orbit");
requestAnimationFrame(loop);
