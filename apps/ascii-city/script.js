import { THREE, OrbitControls } from '../../../assets/vendor/three-bundle.min.js';

// ASCII City: a real Three.js scene is rendered at a tiny resolution (one
// pixel per character cell), then every pixel is turned into a glyph whose
// density matches its brightness and whose colour matches its hue.

var canvas = document.getElementById("game");
var ctx = canvas.getContext("2d");
var minimap = document.getElementById("minimap");
var mctx = minimap.getContext("2d");
var bootOverlay = document.getElementById("bootOverlay");
var regenBtn = document.getElementById("regenBtn");
var modeBtn = document.getElementById("modeBtn");
var statSector = document.getElementById("stat-sector");
var statHeading = document.getElementById("stat-heading");
var statMode = document.getElementById("stat-mode");
var statFps = document.getElementById("stat-fps");

// ---- character grid ---------------------------------------------------
var COLS = 160;
var ROWS = 62;
var CELL_W = 6;
var CELL_H = 10;
var FONT = '10px "Courier New", monospace';
canvas.width = COLS * CELL_W;
canvas.height = ROWS * CELL_H;

var SHADE = " .'`,:;-~=+*!?%#&$@";

// Glyph atlas: each shade character drawn once in white, then stamped per cell.
var atlas = document.createElement("canvas");
atlas.width = SHADE.length * CELL_W;
atlas.height = CELL_H;
var actx = atlas.getContext("2d");
actx.font = FONT;
actx.textBaseline = "top";
actx.fillStyle = "#fff";
for (var s = 0; s < SHADE.length; s++) actx.fillText(SHADE[s], s * CELL_W, 0);

// Colour layer: the low-res frame with each pixel pushed to full saturation,
// multiplied over the white glyphs so brightness lives in the glyph, hue in the tint.
var tint = document.createElement("canvas");
tint.width = COLS;
tint.height = ROWS;
var tctx = tint.getContext("2d", { willReadFrequently: true });

// ---- three.js scene ---------------------------------------------------
var glCanvas = document.createElement("canvas");
var renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(COLS, ROWS, false);
renderer.setClearColor(0x010003);

var scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x010003, 18, 95);
// Character cells are taller than wide, so stretch the aspect to match.
var camera = new THREE.PerspectiveCamera(62, (COLS * CELL_W) / (ROWS * CELL_H), 0.1, 400);

scene.add(new THREE.HemisphereLight(0x5a4d9a, 0x120818, 0.9));
var moon = new THREE.DirectionalLight(0xff7ce8, 0.8);
moon.position.set(30, 60, 20);
scene.add(moon);

var controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.8;
controls.maxPolarAngle = Math.PI * 0.47;
controls.minDistance = 20;
controls.maxDistance = 140;

// ---- city layout ------------------------------------------------------
var BLOCKS = 7;        // city blocks per side
var BLOCK = 10;        // block width in world units
var ROAD = 4;          // road width
var PERIOD = BLOCK + ROAD;
var SIZE = BLOCKS * PERIOD;
var HALF = SIZE / 2;

var NEON = [0x7cfcf0, 0xff7ce8, 0xffd166, 0x7cff9c, 0x9d7cff];

// A few shared window textures; each building picks one and a random offset.
function windowTexture(seed) {
  var c = document.createElement("canvas");
  c.width = 64; c.height = 128;
  var g = c.getContext("2d");
  g.fillStyle = "#000";
  g.fillRect(0, 0, 64, 128);
  var hues = ["#ffe6a8", "#7cfcf0", "#ff9cf0", "#ffffff"];
  for (var y = 4; y < 128; y += 8) {
    for (var x = 4; x < 64; x += 8) {
      if (Math.random() < 0.38 + seed * 0.1) {
        g.fillStyle = hues[(Math.random() * hues.length) | 0];
        g.fillRect(x, y, 4, 5);
      }
    }
  }
  var tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}
var windowTex = [0, 1, 2].map(windowTexture);

var city = new THREE.Group();
scene.add(city);
var solids = [];   // axis-aligned footprints for street-mode collision
var cars = [];
var mapTiles = []; // for the minimap: {x, z, w, d, color}

function disposeCity() {
  city.traverse(function (o) {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      if (o.material.emissiveMap) o.material.emissiveMap.dispose();
      o.material.dispose();
    }
  });
  scene.remove(city);
  city = new THREE.Group();
  scene.add(city);
  solids = []; cars = []; mapTiles = [];
}

function box(w, h, d, mat, x, y, z) {
  var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  city.add(m);
  return m;
}

function blockOrigin(i) { return -HALF + i * PERIOD + ROAD / 2; }

function generateCity() {
  disposeCity();

  var ground = new THREE.Mesh(
    new THREE.PlaneGeometry(SIZE * 3, SIZE * 3),
    new THREE.MeshLambertMaterial({ color: 0x14101c })
  );
  ground.rotation.x = -Math.PI / 2;
  city.add(ground);

  // Lane stripes down the middle of every road.
  var stripeMat = new THREE.MeshBasicMaterial({ color: 0x5a5470 });
  for (var r = 0; r <= BLOCKS; r++) {
    var p = -HALF + r * PERIOD;
    for (var t = -HALF; t < HALF; t += 3) {
      box(1.4, 0.02, 0.15, stripeMat, t, 0.02, p);
      box(0.15, 0.02, 1.4, stripeMat, p, 0.02, t);
    }
  }

  for (var bx = 0; bx < BLOCKS; bx++) {
    for (var bz = 0; bz < BLOCKS; bz++) {
      var ox = blockOrigin(bx), oz = blockOrigin(bz);
      var cx = ox + BLOCK / 2, cz = oz + BLOCK / 2;
      var centre = Math.hypot(cx, cz) / HALF;           // 0 downtown, ~1.4 at corners
      var roll = Math.random();

      // Sidewalk slab under every block.
      box(BLOCK, 0.2, BLOCK, new THREE.MeshLambertMaterial({ color: 0x2a2438 }), cx, 0.1, cz);

      if (roll < 0.12) {
        // Park: grass plus a scatter of cone trees.
        box(BLOCK - 1, 0.25, BLOCK - 1, new THREE.MeshLambertMaterial({ color: 0x1d5a34 }), cx, 0.2, cz);
        mapTiles.push({ x: ox, z: oz, w: BLOCK, d: BLOCK, color: "#1f7a45" });
        var leaf = new THREE.MeshLambertMaterial({ color: 0x4fd67c, emissive: 0x0c3018 });
        for (var k = 0; k < 7; k++) {
          var tree = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.6, 6), leaf);
          tree.position.set(ox + 1.5 + Math.random() * (BLOCK - 3), 1.6, oz + 1.5 + Math.random() * (BLOCK - 3));
          city.add(tree);
        }
        continue;
      }

      // 1–4 towers per block; taller toward the middle of town.
      var split = Math.random() < 0.5 ? 1 : 2;
      var cell = (BLOCK - 1) / split;
      for (var ix = 0; ix < split; ix++) {
        for (var iz = 0; iz < split; iz++) {
          var w = cell - 0.6 - Math.random() * 1.2;
          var d = cell - 0.6 - Math.random() * 1.2;
          var h = (4 + Math.random() * 10) * (1 + Math.max(0, 1.2 - centre) * 2.2);
          var x = ox + 0.5 + cell * (ix + 0.5);
          var z = oz + 0.5 + cell * (iz + 0.5);

          var tex = windowTex[(Math.random() * windowTex.length) | 0].clone();
          tex.needsUpdate = true;
          tex.repeat.set(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 4)));
          tex.offset.set(Math.random(), Math.random());
          var mat = new THREE.MeshLambertMaterial({
            color: new THREE.Color().setHSL(0.7 + Math.random() * 0.1, 0.25, 0.12 + Math.random() * 0.08),
            emissive: 0xffffff,
            emissiveMap: tex,
            emissiveIntensity: 0.85
          });
          box(w, h, d, mat, x, h / 2 + 0.2, z);
          solids.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
          mapTiles.push({ x: x - w / 2, z: z - d / 2, w: w, d: d, color: h > 22 ? "#ff7ce8" : "#5b4f86" });

          // Neon rooftop trim or antenna on some towers.
          if (Math.random() < 0.45) {
            var neon = NEON[(Math.random() * NEON.length) | 0];
            box(w + 0.1, 0.25, d + 0.1, new THREE.MeshBasicMaterial({ color: neon }), x, h + 0.2, z);
          }
          if (h > 24 && Math.random() < 0.6) {
            box(0.2, 5, 0.2, new THREE.MeshBasicMaterial({ color: 0xff3b5c }), x, h + 2.7, z);
          }
        }
      }
    }
  }

  // Traffic: cars loop around the roads with headlights and taillights.
  var carColors = [0xffd166, 0x7cfcf0, 0xff7ce8, 0xe0e0ff];
  var head = new THREE.MeshBasicMaterial({ color: 0xffffee });
  var tail = new THREE.MeshBasicMaterial({ color: 0xff2040 });
  for (var c = 0; c < 46; c++) {
    var alongX = Math.random() < 0.5;
    var dir = Math.random() < 0.5 ? 1 : -1;
    var road = -HALF + ((Math.random() * (BLOCKS + 1)) | 0) * PERIOD;
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
    var lane = dir * 0.9 * (alongX ? 1 : -1);
    var s0 = (Math.random() - 0.5) * SIZE;
    if (alongX) car.position.set(s0, 0, road + lane);
    else car.position.set(road + lane, 0, s0);
    city.add(car);
    cars.push({ mesh: car, alongX: alongX, dir: dir, speed: 6 + Math.random() * 8 });
  }
}

// ---- modes: orbiting flyover vs. walking the streets -------------------
var mode = "orbit";
var walker = { x: -HALF, z: -HALF + 0.001, yaw: Math.PI / 4 };
var keys = {};

function setMode(m) {
  mode = m;
  controls.enabled = m === "orbit";
  // Street level wants a close fog wall for depth; the flyover needs to see the whole grid.
  scene.fog.near = m === "orbit" ? 60 : 12;
  scene.fog.far = m === "orbit" ? 190 : 80;
  if (m === "orbit") {
    camera.position.set(48, 38, 48);
    controls.target.set(0, 6, 0);
  } else {
    walker.x = -HALF; walker.z = -HALF; walker.yaw = Math.PI / 4;
  }
  statMode.textContent = m === "orbit" ? "FLYOVER" : "STREET";
  modeBtn.textContent = m === "orbit" ? "Walk the Streets" : "Fly Over";
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
  var speed = (keys.ShiftLeft || keys.ShiftRight ? 16 : 8) * dt;
  var fx = Math.sin(walker.yaw), fz = Math.cos(walker.yaw);
  var dx = (fx * fwd - fz * strafe) * speed;
  var dz = (fz * fwd + fx * strafe) * speed;
  if (!blocked(walker.x + dx, walker.z)) walker.x += dx;
  if (!blocked(walker.x, walker.z + dz)) walker.z += dz;

  camera.position.set(walker.x, 1.7, walker.z);
  camera.lookAt(walker.x + fx, 1.9, walker.z + fz);
}

var dragging = false, lastX = 0;
canvas.addEventListener("pointerdown", function (e) { dragging = true; lastX = e.clientX; });
window.addEventListener("pointerup", function () { dragging = false; });
window.addEventListener("pointermove", function (e) {
  if (!dragging || mode !== "street") return;
  walker.yaw -= (e.clientX - lastX) * 0.006;
  lastX = e.clientX;
});

window.addEventListener("keydown", function (e) {
  if (e.target.tagName === "BUTTON" && (e.code === "Space" || e.code === "Enter")) return;
  keys[e.code] = true;
  if (e.code === "KeyR") generateCity();
  if (e.code === "KeyM") minimap.classList.toggle("hidden");
  if (e.code === "KeyC") setMode(mode === "orbit" ? "street" : "orbit");
  if (mode === "street" && /^Arrow/.test(e.code)) e.preventDefault();
});
window.addEventListener("keyup", function (e) { keys[e.code] = false; });
window.addEventListener("blur", function () { keys = {}; });

regenBtn.addEventListener("click", function () { generateCity(); });
modeBtn.addEventListener("click", function () { setMode(mode === "orbit" ? "street" : "orbit"); });
bootOverlay.addEventListener("click", function () { bootOverlay.classList.add("hidden"); });

// ---- ASCII conversion ---------------------------------------------------
function drawAscii() {
  tctx.drawImage(glCanvas, 0, 0);
  var img = tctx.getImageData(0, 0, COLS, ROWS);
  var px = img.data;

  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  var last = SHADE.length - 1;
  for (var y = 0; y < ROWS; y++) {
    for (var x = 0; x < COLS; x++) {
      var i = (y * COLS + x) * 4;
      var r = px[i], g = px[i + 1], b = px[i + 2];
      var lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      var gi = Math.min(last, Math.floor(Math.pow(lum, 0.6) * last * 1.15));
      if (gi > 0) ctx.drawImage(atlas, gi * CELL_W, 0, CELL_W, CELL_H, x * CELL_W, y * CELL_H, CELL_W, CELL_H);
      // Normalize to full brightness so the glyph, not the tint, carries the shading.
      var m = Math.max(r, g, b, 1);
      var k = 255 / m;
      px[i] = r * k * 0.85 + 38;
      px[i + 1] = g * k * 0.85 + 38;
      px[i + 2] = b * k * 0.85 + 38;
    }
  }
  tctx.putImageData(img, 0, 0);

  ctx.globalCompositeOperation = "multiply";
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tint, 0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-over";
}

// ---- minimap --------------------------------------------------------------
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
  mctx.fillStyle = "#ffd166";
  for (var c = 0; c < cars.length; c++) {
    var p = cars[c].mesh.position;
    mctx.fillRect(mx(p.x) - 1, mx(p.z) - 1, 2, 2);
  }
  var cp = mode === "street" ? walker : { x: camera.position.x, z: camera.position.z };
  var dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  var px = Math.max(5, Math.min(W - 5, mx(cp.x))), pz = Math.max(5, Math.min(W - 5, mx(cp.z)));
  mctx.strokeStyle = "#7cfcf0";
  mctx.lineWidth = 2;
  mctx.beginPath();
  mctx.moveTo(px, pz);
  mctx.lineTo(px + dir.x * 12, pz + dir.z * 12);
  mctx.stroke();
  mctx.fillStyle = "#7cfcf0";
  mctx.beginPath();
  mctx.arc(px, pz, 3, 0, Math.PI * 2);
  mctx.fill();
}

// ---- main loop ------------------------------------------------------------
var COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
var lastT = performance.now(), frames = 0, acc = 0;

function loop(now) {
  requestAnimationFrame(loop);
  var dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  var edge = HALF + 4;
  for (var i = 0; i < cars.length; i++) {
    var c = cars[i], p = c.mesh.position, step = c.dir * c.speed * dt;
    if (c.alongX) { p.x += step; if (p.x > edge) p.x = -edge; if (p.x < -edge) p.x = edge; }
    else { p.z += step; if (p.z > edge) p.z = -edge; if (p.z < -edge) p.z = edge; }
  }

  if (mode === "street") updateWalker(dt);
  else controls.update();

  renderer.render(scene, camera);
  drawAscii();
  drawMinimap();

  var dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  // -z is north on the minimap.
  var deg = (Math.atan2(dir.x, -dir.z) * 180 / Math.PI + 360) % 360;
  statHeading.textContent = COMPASS[Math.round(deg / 45) % 8];
  var sx = Math.floor((camera.position.x + HALF) / PERIOD);
  var sz = Math.floor((camera.position.z + HALF) / PERIOD);
  statSector.textContent = String(sx).padStart(2, "0") + "," + String(sz).padStart(2, "0");

  frames++; acc += dt;
  if (acc > 0.5) { statFps.textContent = Math.round(frames / acc); frames = 0; acc = 0; }
}

generateCity();
setMode("orbit");
requestAnimationFrame(loop);
