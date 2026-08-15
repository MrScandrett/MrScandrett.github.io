// Blockopolis — a tribute to 1989's original city-building sim.
//
// The simulation is a plain 2D grid of tiles; the renderer is three.js, drawing
// each tile with a model from the KayKit "City Builder Bits" kit (CC0, Kay
// Lousberg — see models/License.txt). The kit is authored on a 2x2 unit lot, so
// one grid cell maps to one 2x2 patch of world space with no rescaling.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const canvas = document.getElementById("game");
const loadingEl = document.getElementById("loading");
const fundsEl = document.getElementById("funds");
const popEl = document.getElementById("population");
const dateEl = document.getElementById("date");
const taxRateInput = document.getElementById("taxRate");
const taxRateValueEl = document.getElementById("taxRateValue");
const toolbar = document.getElementById("toolbar");
const newCityBtn = document.getElementById("newCityBtn");
const pauseBtn = document.getElementById("pauseBtn");

// World size of one lot, fixed by the KayKit kit's own modelling grid.
const TILE = 2;
const COLS = 28;
const ROWS = 18;

const TOOLS = {
  bulldoze: { cost: 1 },
  road: { cost: 10 },
  rzone: { cost: 20 },
  czone: { cost: 25 },
  izone: { cost: 25 },
  power: { cost: 15 },
  plant: { cost: 500 },
};

const COLORS = {
  sky: "#8fc7e8",
  grassA: "#5fbf62",
  grassB: "#57b25a",
  rzoneEmpty: "#cdeccb",
  czoneEmpty: "#cfe3f5",
  izoneEmpty: "#f0e2bd",
  power: "#8a8a2f",
  powerLive: "#ffe14d",
  pole: "#4a4030",
};

let grid = [];
let tool = "bulldoze";
let funds = 10000;
let population = 0;
let jobs = 0;
let monthCounter = 0;
let taxRate = 9;
let running = true;
let painting = false;

function emptyTile() {
  return { type: "grass", level: 0, powered: false };
}

function newCity() {
  grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) row.push(emptyTile());
    grid.push(row);
  }
  funds = 10000;
  population = 0;
  jobs = 0;
  monthCounter = 0;
  updateHUD();
}

function updateHUD() {
  fundsEl.textContent = `$${Math.max(0, Math.floor(funds)).toLocaleString()}`;
  popEl.textContent = population.toLocaleString();
  const year = 1900 + Math.floor(monthCounter / 12);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  dateEl.textContent = `${monthNames[monthCounter % 12]} ${year}`;
  taxRateValueEl.textContent = `${taxRate}%`;
}

function neighbors4(r, c) {
  return [
    [r - 1, c],
    [r + 1, c],
    [r, c - 1],
    [r, c + 1],
  ].filter(([nr, nc]) => nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS);
}

function nearRoad(r, c) {
  return neighbors4(r, c).some(([nr, nc]) => grid[nr][nc].type === "road");
}

function isConductive(tile) {
  return tile.type === "power" || tile.type === "plant" || tile.type === "road";
}

// Flood-fill power outward from every plant across the conductive network
// (power lines, roads, and the plants themselves).
function updatePower() {
  for (const row of grid) for (const t of row) t.powered = false;
  const queue = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c].type === "plant") {
        grid[r][c].powered = true;
        queue.push([r, c]);
      }
    }
  }
  while (queue.length) {
    const [r, c] = queue.shift();
    for (const [nr, nc] of neighbors4(r, c)) {
      const t = grid[nr][nc];
      if (!t.powered && isConductive(t)) {
        t.powered = true;
        queue.push([nr, nc]);
      }
    }
  }
  // zoned lots draw power from an adjacent powered conductor without being
  // conductors themselves (so power doesn't leapfrog across whole districts)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = grid[r][c];
      if (t.type === "rzone" || t.type === "czone" || t.type === "izone") {
        t.powered = neighbors4(r, c).some(([nr, nc]) => grid[nr][nc].powered);
      }
    }
  }
}

function simulateTick() {
  updatePower();

  population = 0;
  jobs = 0;
  for (const row of grid) {
    for (const t of row) {
      if (t.type === "rzone") population += t.level * 18;
      if (t.type === "czone" || t.type === "izone") jobs += t.level * 12;
    }
  }

  const jobDemand = jobs > 0 ? Math.min(1, jobs / Math.max(1, population)) : 0.3;
  const workerDemand = population > 0 ? Math.min(1, population / Math.max(1, jobs)) : 0.3;

  let roadCount = 0;
  let powerCount = 0;
  let plantCount = 0;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = grid[r][c];
      if (t.type === "road") roadCount++;
      if (t.type === "power") powerCount++;
      if (t.type === "plant") plantCount++;

      const isZone = t.type === "rzone" || t.type === "czone" || t.type === "izone";
      if (!isZone || t.level >= 3) continue;
      if (!t.powered || !nearRoad(r, c)) continue;

      const demand = t.type === "rzone" ? jobDemand : workerDemand;
      const chance = 0.03 + demand * 0.12;
      if (Math.random() < chance) t.level++;
    }
  }

  const upkeep = roadCount * 0.4 + powerCount * 0.3 + plantCount * 40;
  const income = (population + jobs) * (taxRate / 100) * 0.6;
  funds += income - upkeep;

  monthCounter++;
  updateHUD();
}

function applyTool(r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
  const t = grid[r][c];
  const def = TOOLS[tool];

  if (tool === "bulldoze") {
    if (t.type === "grass") return;
    grid[r][c] = emptyTile();
    funds -= def.cost;
    updateHUD();
    return;
  }

  if (t.type !== "grass") return; // build on empty land only
  if (funds < def.cost) return;

  const typeMap = { road: "road", rzone: "rzone", czone: "czone", izone: "izone", power: "power", plant: "plant" };
  grid[r][c] = { type: typeMap[tool], level: 0, powered: false };
  funds -= def.cost;
  updateHUD();
}

// ---------------------------------------------------------------------------
// 3D renderer
// ---------------------------------------------------------------------------

const MODEL_DIR = "models/";
const MODEL_NAMES = [
  "base",
  "road_straight", "road_straight_crossing", "road_corner", "road_tsplit", "road_junction",
  "building_A", "building_B", "building_C", "building_D",
  "building_E", "building_F", "building_G", "building_H",
  "watertower", "bush", "bench", "dumpster", "box_A", "box_B",
  "firehydrant", "streetlight", "trafficlight_A", "trash_A",
  "car_sedan", "car_taxi", "car_hatchback", "car_stationwagon", "car_police",
];

// Which kit building stands in for each zone type at growth levels 1-3.
// Industrial level 1 is a yard of crates rather than a building, so it reads as
// "zoned and working" without pretending to be an office block.
const ZONE_BUILDINGS = {
  rzone: ["building_A", "building_B", "building_E"],
  czone: ["building_F", "building_D", "building_H"],
  izone: [null, "building_C", "building_G"],
};

const CARS = ["car_sedan", "car_taxi", "car_hatchback", "car_stationwagon", "car_police"];

const models = new Map();

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.sky);
scene.fog = new THREE.Fog(COLORS.sky, 80, 200);

const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 400);
camera.position.set(0, 31, 33);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 14;
controls.maxDistance = 130;
controls.maxPolarAngle = 1.35;
controls.target.set(0, 0, 0);
// Left button paints; orbiting is on the right button (two fingers on touch) so
// that dragging out a row of road never spins the camera.
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE };
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x6f8a5c, 1.05));
scene.add(new THREE.AmbientLight(0xffffff, 0.2));

const sun = new THREE.DirectionalLight(0xfff4dd, 1.5);
sun.position.set(34, 58, 26);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 160;
sun.shadow.camera.left = -45;
sun.shadow.camera.right = 45;
sun.shadow.camera.top = 45;
sun.shadow.camera.bottom = -45;
sun.shadow.bias = -0.0015;
scene.add(sun);

const cityGroup = new THREE.Group();
scene.add(cityGroup);

const WORLD_W = COLS * TILE;
const WORLD_H = ROWS * TILE;
const HALF_PI = Math.PI / 2;

function tileX(c) {
  return (c - (COLS - 1) / 2) * TILE;
}

function tileZ(r) {
  return (r - (ROWS - 1) / 2) * TILE;
}

// Two-tone checkerboard ground, the 2D version's grass carried over as a texture.
function makeGroundTexture() {
  const size = 64;
  const tile = document.createElement("canvas");
  tile.width = size * 2;
  tile.height = size * 2;
  const g = tile.getContext("2d");
  g.fillStyle = COLORS.grassA;
  g.fillRect(0, 0, size, size);
  g.fillRect(size, size, size, size);
  g.fillStyle = COLORS.grassB;
  g.fillRect(size, 0, size, size);
  g.fillRect(0, size, size, size);
  const texture = new THREE.CanvasTexture(tile);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(COLS / 2, ROWS / 2);
  texture.magFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(WORLD_W, WORLD_H),
  new THREE.MeshStandardMaterial({ map: makeGroundTexture(), roughness: 1 })
);
ground.rotation.x = -HALF_PI;
ground.receiveShadow = true;
scene.add(ground);

// Skirt of plain grass so the city doesn't float on a hard-edged slab.
const skirt = new THREE.Mesh(
  new THREE.PlaneGeometry(WORLD_W * 4, WORLD_H * 4),
  new THREE.MeshStandardMaterial({ color: COLORS.grassB, roughness: 1 })
);
skirt.rotation.x = -HALF_PI;
skirt.position.y = -0.02;
scene.add(skirt);

// Materials we build ourselves; everything else rides the kit's texture atlas.
const zoneTintMaterials = {
  rzone: new THREE.MeshStandardMaterial({ color: COLORS.rzoneEmpty, roughness: 0.85 }),
  czone: new THREE.MeshStandardMaterial({ color: COLORS.czoneEmpty, roughness: 0.85 }),
  izone: new THREE.MeshStandardMaterial({ color: COLORS.izoneEmpty, roughness: 0.85 }),
};
const poleMaterial = new THREE.MeshStandardMaterial({ color: COLORS.pole, roughness: 0.8 });
const wireLiveMaterial = new THREE.MeshStandardMaterial({
  color: COLORS.powerLive,
  emissive: 0x6b5a00,
  roughness: 0.5,
});
const wireDeadMaterial = new THREE.MeshStandardMaterial({ color: COLORS.power, roughness: 0.8 });
const alertMaterial = new THREE.MeshStandardMaterial({
  color: 0xd94f3d,
  emissive: 0x5a1a12,
  roughness: 0.5,
});

const poleGeometry = new THREE.BoxGeometry(0.12, 1.6, 0.12);
const armGeometry = new THREE.BoxGeometry(0.9, 0.1, 0.1);
const wireGeometry = new THREE.BoxGeometry(2, 0.06, 0.06);
const alertGeometry = new THREE.OctahedronGeometry(0.22);
const stackGeometry = new THREE.CylinderGeometry(0.16, 0.2, 1.5, 10);
const lampGeometry = new THREE.SphereGeometry(0.16, 12, 12);

// Deterministic per-tile randomness, so decor doesn't reshuffle every rebuild.
function hash(r, c, salt) {
  const n = Math.sin((r + 1) * 127.1 + (c + 1) * 311.7 + salt * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function instance(name) {
  const proto = models.get(name);
  if (!proto) return new THREE.Group();
  const clone = proto.clone(true);
  clone.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
  });
  return clone;
}

const DIR = { N: 1, S: 2, E: 4, W: 8 };

function roadMask(r, c) {
  let mask = 0;
  if (r > 0 && grid[r - 1][c].type === "road") mask |= DIR.N;
  if (r < ROWS - 1 && grid[r + 1][c].type === "road") mask |= DIR.S;
  if (c < COLS - 1 && grid[r][c + 1].type === "road") mask |= DIR.E;
  if (c > 0 && grid[r][c - 1].type === "road") mask |= DIR.W;
  return mask;
}

// Road pieces are authored open along -Z/+Z (straight), +X/+Z (corner) and
// everything-but--X (T-split); these rotations spin them onto the neighbour mask.
function roadPiece(mask, crossing) {
  const n = !!(mask & DIR.N);
  const s = !!(mask & DIR.S);
  const e = !!(mask & DIR.E);
  const w = !!(mask & DIR.W);
  const count = n + s + e + w;

  if (count === 4) return { name: "road_junction", rot: 0 };
  if (count === 3) {
    if (!w) return { name: "road_tsplit", rot: 0 };
    if (!s) return { name: "road_tsplit", rot: HALF_PI };
    if (!e) return { name: "road_tsplit", rot: Math.PI };
    return { name: "road_tsplit", rot: 3 * HALF_PI };
  }
  if (count === 2 && ((n && s) || (e && w))) {
    const name = crossing ? "road_straight_crossing" : "road_straight";
    return { name, rot: n && s ? 0 : HALF_PI };
  }
  if (count === 2) {
    if (e && s) return { name: "road_corner", rot: 0 };
    if (n && e) return { name: "road_corner", rot: HALF_PI };
    if (n && w) return { name: "road_corner", rot: Math.PI };
    return { name: "road_corner", rot: 3 * HALF_PI };
  }
  // Dead ends and lone tiles: lay a straight piece along whichever axis it joins.
  if (e || w) return { name: "road_straight", rot: HALF_PI };
  return { name: "road_straight", rot: 0 };
}

// A straight road gets painted crosswalks where it runs past a grown lot.
function wantsCrossing(r, c) {
  return neighbors4(r, c).some(([nr, nc]) => {
    const t = grid[nr][nc];
    return (t.type === "rzone" || t.type === "czone" || t.type === "izone") && t.level > 0;
  });
}

const bobbing = [];

function buildGrassTile(group, r, c) {
  const roll = hash(r, c, 3);
  if (roll < 0.1) {
    const bush = instance("bush");
    bush.position.set((hash(r, c, 4) - 0.5) * 1.2, 0, (hash(r, c, 5) - 0.5) * 1.2);
    bush.scale.setScalar(1.4 + hash(r, c, 6) * 0.8);
    group.add(bush);
  } else if (roll < 0.13) {
    const trash = instance("trash_A");
    trash.position.set((hash(r, c, 7) - 0.5) * 1.2, 0, (hash(r, c, 8) - 0.5) * 1.2);
    group.add(trash);
  }
}

function buildRoadTile(group, r, c, mask) {
  const { name, rot } = roadPiece(mask, wantsCrossing(r, c));
  const road = instance(name);
  road.rotation.y = rot;
  // Flat plates: let them receive shadows but not cast, which only causes acne.
  road.traverse((obj) => {
    if (obj.isMesh) obj.castShadow = false;
  });
  group.add(road);

  const bits = hash(r, c, 11);
  if (name === "road_junction" && bits < 0.6) {
    const light = instance("trafficlight_A");
    light.position.set(0.78, 0.1, 0.78);
    light.rotation.y = Math.PI;
    group.add(light);
  } else if (bits < 0.18) {
    const lamp = instance("streetlight");
    lamp.position.set(0.85, 0.1, hash(r, c, 12) - 0.5);
    lamp.rotation.y = rot;
    group.add(lamp);
  } else if (bits < 0.34) {
    const car = instance(CARS[Math.floor(hash(r, c, 13) * CARS.length) % CARS.length]);
    car.position.set(0, 0.1, (hash(r, c, 14) - 0.5) * 0.9);
    car.rotation.y = rot + (hash(r, c, 15) < 0.5 ? 0 : Math.PI);
    group.add(car);
  } else if (bits < 0.4) {
    const hydrant = instance("firehydrant");
    hydrant.position.set(-0.82, 0.1, hash(r, c, 16) - 0.5);
    group.add(hydrant);
  }
}

function buildZoneTile(group, r, c, type, level, powered) {
  const lot = instance("base");
  if (level === 0) {
    // An empty lot is the kit's blank base plate, tinted to the zone colour.
    lot.traverse((obj) => {
      if (obj.isMesh) obj.material = zoneTintMaterials[type];
    });
  }
  group.add(lot);

  if (level === 0) {
    const marker = instance(hash(r, c, 21) < 0.5 ? "box_A" : "box_B");
    marker.position.set((hash(r, c, 22) - 0.5) * 1.1, 0.1, (hash(r, c, 23) - 0.5) * 1.1);
    group.add(marker);
  } else {
    const name = ZONE_BUILDINGS[type][level - 1];
    if (name) {
      const building = instance(name);
      // Buildings ship with their own base plate; drop it on top of the lot.
      building.position.y = 0.1;
      building.rotation.y = Math.floor(hash(r, c, 24) * 4) * HALF_PI;
      group.add(building);
    } else {
      // Industrial level 1: a working yard rather than a building.
      const dumpster = instance("dumpster");
      dumpster.position.set(-0.4, 0.1, -0.4);
      dumpster.rotation.y = HALF_PI * Math.floor(hash(r, c, 25) * 4);
      group.add(dumpster);
      for (let i = 0; i < 3; i++) {
        const box = instance(i % 2 ? "box_A" : "box_B");
        box.position.set(0.2 + hash(r, c, 26 + i) * 0.6, 0.1, 0.1 + hash(r, c, 30 + i) * 0.7);
        box.scale.setScalar(1.6);
        group.add(box);
      }
    }

    if (type === "rzone" && hash(r, c, 33) < 0.4) {
      const bench = instance("bench");
      bench.position.set(-0.75, 0.1, 0.7);
      bench.scale.setScalar(1.6);
      group.add(bench);
    }
  }

  if (!powered) {
    // Floating red marker: this lot is zoned but unpowered, so it won't grow.
    const alert = new THREE.Mesh(alertGeometry, alertMaterial);
    alert.position.set(0, 2.4, 0);
    group.add(alert);
    bobbing.push({ mesh: alert, phase: hash(r, c, 34) * Math.PI * 2 });
  }
}

function buildPowerTile(group, powered) {
  const pole = new THREE.Mesh(poleGeometry, poleMaterial);
  pole.position.y = 0.8;
  pole.castShadow = true;
  group.add(pole);

  const arm = new THREE.Mesh(armGeometry, poleMaterial);
  arm.position.y = 1.5;
  arm.castShadow = true;
  group.add(arm);

  // Wires run both ways so a line reads as connected from any angle.
  for (const rot of [0, HALF_PI]) {
    const wire = new THREE.Mesh(wireGeometry, powered ? wireLiveMaterial : wireDeadMaterial);
    wire.position.y = 1.5;
    wire.rotation.y = rot;
    group.add(wire);
  }
}

function buildPlantTile(group, powered) {
  group.add(instance("base"));

  const tower = instance("watertower");
  tower.position.set(-0.45, 0.1, -0.4);
  tower.scale.setScalar(1.9);
  group.add(tower);

  const stack = new THREE.Mesh(stackGeometry, poleMaterial);
  stack.position.set(0.5, 0.85, 0.35);
  stack.castShadow = true;
  group.add(stack);

  const dumpster = instance("dumpster");
  dumpster.position.set(0.45, 0.1, -0.6);
  group.add(dumpster);

  const lamp = new THREE.Mesh(lampGeometry, powered ? wireLiveMaterial : wireDeadMaterial);
  lamp.position.set(0.5, 1.72, 0.35);
  group.add(lamp);
}

function buildTile(r, c, tile, mask) {
  const group = new THREE.Group();
  group.position.set(tileX(c), 0, tileZ(r));

  switch (tile.type) {
    case "road":
      buildRoadTile(group, r, c, mask);
      break;
    case "power":
      buildPowerTile(group, tile.powered);
      break;
    case "plant":
      buildPlantTile(group, tile.powered);
      break;
    case "rzone":
    case "czone":
    case "izone":
      buildZoneTile(group, r, c, tile.type, tile.level, tile.powered);
      break;
    default:
      buildGrassTile(group, r, c);
  }

  return group;
}

// One signature per tile; a tile is only rebuilt when its own signature moves,
// which keeps a 500-lot city to a handful of scene edits per simulated month.
function signature(r, c, tile) {
  if (tile.type === "road") {
    return `road|${roadMask(r, c)}|${wantsCrossing(r, c) ? 1 : 0}`;
  }
  if (tile.type === "grass") return "grass";
  return `${tile.type}|${tile.level}|${tile.powered ? 1 : 0}`;
}

let tileNodes = [];
let tileSignatures = [];

function resetTiles() {
  for (const row of tileNodes) {
    for (const node of row) if (node) cityGroup.remove(node);
  }
  tileNodes = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
  tileSignatures = Array.from({ length: ROWS }, () => new Array(COLS).fill(""));
  bobbing.length = 0;
}

function dropTile(r, c) {
  const old = tileNodes[r][c];
  if (!old) return;
  cityGroup.remove(old);
  for (let i = bobbing.length - 1; i >= 0; i--) {
    if (bobbing[i].mesh.parent === old) bobbing.splice(i, 1);
  }
}

function syncScene() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const sig = signature(r, c, grid[r][c]);
      if (tileNodes[r][c] && sig === tileSignatures[r][c]) continue;

      dropTile(r, c);
      const node = buildTile(r, c, grid[r][c], roadMask(r, c));
      cityGroup.add(node);
      tileNodes[r][c] = node;
      tileSignatures[r][c] = sig;
    }
  }
}

// --- picking -------------------------------------------------------------

const pickPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(WORLD_W, WORLD_H),
  new THREE.MeshBasicMaterial({ visible: false })
);
pickPlane.rotation.x = -HALF_PI;
scene.add(pickPlane);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const hoverGeometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-1, 0, -1),
  new THREE.Vector3(1, 0, -1),
  new THREE.Vector3(1, 0, 1),
  new THREE.Vector3(-1, 0, 1),
  new THREE.Vector3(-1, 0, -1),
]);
const hover = new THREE.Line(hoverGeometry, new THREE.LineBasicMaterial({ color: 0xf4c430 }));
hover.position.y = 0.16;
hover.visible = false;
scene.add(hover);

function cellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(pickPlane, false)[0];
  if (!hit) return null;
  const c = Math.floor(hit.point.x / TILE + COLS / 2);
  const r = Math.floor(hit.point.z / TILE + ROWS / 2);
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
  return { r, c };
}

function updateHover(cell) {
  if (!cell) {
    hover.visible = false;
    return;
  }
  hover.visible = true;
  hover.position.x = tileX(cell.c);
  hover.position.z = tileZ(cell.r);
  const affordable = tool === "bulldoze" || funds >= TOOLS[tool].cost;
  hover.material.color.set(affordable ? 0xf4c430 : 0xd94f3d);
}

// A single touch is a tap-to-build; two fingers orbit and pinch, so a one-finger
// drag isn't treated as a paint stroke (see controls.touches above).
let touchStart = null;

canvas.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "touch") {
    touchStart = e.isPrimary ? cellFromEvent(e) : null;
    return;
  }
  if (e.button !== 0) return;
  painting = true;
  canvas.setPointerCapture(e.pointerId);
  const cell = cellFromEvent(e);
  if (cell) applyTool(cell.r, cell.c);
});

canvas.addEventListener("pointermove", (e) => {
  if (e.pointerType === "touch") return;
  const cell = cellFromEvent(e);
  updateHover(cell);
  if (!painting || !cell) return;
  applyTool(cell.r, cell.c);
});

canvas.addEventListener("pointerup", (e) => {
  if (e.pointerType === "touch") {
    const cell = cellFromEvent(e);
    if (touchStart && cell && cell.r === touchStart.r && cell.c === touchStart.c) {
      applyTool(cell.r, cell.c);
    }
    touchStart = null;
    return;
  }
  painting = false;
});

canvas.addEventListener("pointercancel", () => {
  painting = false;
  touchStart = null;
});
window.addEventListener("pointerup", () => (painting = false));
canvas.addEventListener("pointerleave", () => (hover.visible = false));

// --- shell wiring --------------------------------------------------------

toolbar.addEventListener("click", (e) => {
  const btn = e.target.closest(".tool");
  if (!btn) return;
  tool = btn.dataset.tool;
  for (const el of toolbar.querySelectorAll(".tool")) el.classList.toggle("active", el === btn);
});

taxRateInput.addEventListener("input", () => {
  taxRate = Number(taxRateInput.value);
  updateHUD();
});

newCityBtn.addEventListener("click", () => {
  newCity();
  resetTiles();
});

pauseBtn.addEventListener("click", () => {
  running = !running;
  pauseBtn.textContent = running ? "Pause" : "Resume";
});

function resize() {
  const width = canvas.clientWidth || 1;
  const height = canvas.clientHeight || 1;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);

// --- boot ----------------------------------------------------------------

function loadModels() {
  const loader = new GLTFLoader();
  return Promise.all(
    MODEL_NAMES.map(
      (name) =>
        new Promise((resolve, reject) => {
          loader.load(
            `${MODEL_DIR}${name}.gltf`,
            (gltf) => {
              models.set(name, gltf.scene);
              resolve();
            },
            undefined,
            reject
          );
        })
    )
  );
}

let lastTick = 0;
function loop(now) {
  if (running && now - lastTick > 1000) {
    lastTick = now;
    simulateTick();
  }
  syncScene();

  const t = now / 1000;
  for (const item of bobbing) {
    item.mesh.position.y = 2.4 + Math.sin(t * 2.4 + item.phase) * 0.16;
    item.mesh.rotation.y = t * 1.2 + item.phase;
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

newCity();
resetTiles();
resize();

loadModels()
  .then(() => {
    if (loadingEl) loadingEl.remove();
    requestAnimationFrame(loop);
  })
  .catch((error) => {
    console.error("Blockopolis: failed to load the city kit", error);
    if (loadingEl) loadingEl.textContent = "Couldn't load the city models.";
  });
