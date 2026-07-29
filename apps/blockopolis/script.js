// Blockopolis — a tribute to 1989's original city-building sim.
//
// The simulation is a plain 2D grid of tiles; the renderer is three.js, drawing
// each tile with a model from the KayKit "City Builder Bits" kit (CC0, Kay
// Lousberg — see models/License.txt). The kit is authored on a 2x2 unit lot, so
// one grid cell maps to one 2x2 patch of world space with no rescaling.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

const canvas = document.getElementById("game");
const loadingEl = document.getElementById("loading");
const fundsEl = document.getElementById("funds");
const popEl = document.getElementById("population");
const dateEl = document.getElementById("date");
const happinessEl = document.getElementById("happiness");
const qualityOfLifeEl = document.getElementById("qualityOfLife");
const employmentEl = document.getElementById("employment");
const advisorEl = document.getElementById("advisor");
const coverageEls = Object.fromEntries(
  ["school", "police", "hospital", "park", "library", "water", "fire", "sanitation", "transit", "cityhall"].map((type) => [
    type,
    document.getElementById(`${type}Coverage`),
  ])
);
const demandEls = {
  rzone: {
    bar: document.getElementById("residentialDemand"),
    value: document.getElementById("residentialDemandValue"),
  },
  czone: {
    bar: document.getElementById("commercialDemand"),
    value: document.getElementById("commercialDemandValue"),
  },
  izone: {
    bar: document.getElementById("industrialDemand"),
    value: document.getElementById("industrialDemandValue"),
  },
};
const taxRateInput = document.getElementById("taxRate");
const taxRateValueEl = document.getElementById("taxRateValue");
const toolbar = document.getElementById("toolbar");
const newCityBtn = document.getElementById("newCityBtn");
const pauseBtn = document.getElementById("pauseBtn");
const menuNewCityBtn = document.getElementById("menuNewCityBtn");
const menuPauseBtn = document.getElementById("menuPauseBtn");
const menuClock = document.getElementById("menuClock");

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
  water: { cost: 350 },
  school: { cost: 800 },
  police: { cost: 900 },
  hospital: { cost: 1200 },
  park: { cost: 300 },
  library: { cost: 650 },
  fire: { cost: 950 },
  sanitation: { cost: 700 },
  transit: { cost: 850 },
  cityhall: { cost: 1500 },
};

const SERVICES = {
  school: { upkeep: 28, radius: 6, capacity: 540, model: "building_A", label: "School" },
  police: { upkeep: 35, radius: 7, capacity: 720, model: "building_B", label: "Police station" },
  hospital: { upkeep: 45, radius: 6, capacity: 630, model: "building_D", label: "Hospital" },
  park: { upkeep: 12, radius: 4, capacity: 360, model: null, label: "Park" },
  library: { upkeep: 22, radius: 5, capacity: 450, model: "building_F", label: "Library" },
  fire: { upkeep: 36, radius: 7, capacity: 720, model: "building_E", label: "Fire protection" },
  sanitation: { upkeep: 30, radius: 8, capacity: 900, model: "building_C", label: "Waste collection" },
  transit: { upkeep: 32, radius: 8, capacity: 900, model: "building_H", label: "Public transit" },
  cityhall: { upkeep: 55, radius: 10, capacity: 1500, model: "building_G", label: "Civic services" },
};

const SERVICE_TYPES = new Set(Object.keys(SERVICES));

const COLORS = {
  sky: "#8fc7e8",
  grassA: "#66aa5f",
  grassB: "#4f914f",
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
let commercialJobs = 0;
let industrialJobs = 0;
let happiness = 50;
let qualityOfLife = 50;
let employment = 100;
let serviceCoverage = {
  school: 0, police: 0, hospital: 0, park: 0, library: 0,
  fire: 0, sanitation: 0, transit: 0, cityhall: 0, water: 0,
};
let zoneDemand = { rzone: 50, czone: 50, izone: 50 };
let advisorMessage = "Zone homes and jobs, then connect them to roads and power.";
let monthlyBalance = 0;
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
  commercialJobs = 0;
  industrialJobs = 0;
  happiness = 50;
  qualityOfLife = 50;
  employment = 100;
  serviceCoverage = {
    school: 0, police: 0, hospital: 0, park: 0, library: 0,
    fire: 0, sanitation: 0, transit: 0, cityhall: 0, water: 0,
  };
  zoneDemand = { rzone: 50, czone: 50, izone: 50 };
  advisorMessage = "Zone homes and jobs, then connect them to roads and power.";
  monthlyBalance = 0;
  monthCounter = 0;
  updateHUD();
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function updateHUD() {
  const roundedFunds = Math.floor(funds);
  fundsEl.textContent = roundedFunds < 0
    ? `-$${Math.abs(roundedFunds).toLocaleString()}`
    : `$${roundedFunds.toLocaleString()}`;
  fundsEl.classList.toggle("danger", roundedFunds < 0);
  fundsEl.title = `Last month: ${monthlyBalance >= 0 ? "+" : "-"}$${Math.abs(Math.round(monthlyBalance)).toLocaleString()}`;
  popEl.textContent = population.toLocaleString();
  const year = 1900 + Math.floor(monthCounter / 12);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  dateEl.textContent = `${monthNames[monthCounter % 12]} ${year}`;
  taxRateValueEl.textContent = `${taxRate}%`;
  happinessEl.textContent = `${Math.round(happiness)}%`;
  qualityOfLifeEl.textContent = `${Math.round(qualityOfLife)}%`;
  employmentEl.textContent = `${Math.round(employment)}%`;
  advisorEl.textContent = advisorMessage;
  for (const [type, coverage] of Object.entries(serviceCoverage)) {
    coverageEls[type].textContent = `${Math.round(coverage)}%`;
  }
  for (const [type, demand] of Object.entries(zoneDemand)) {
    const rounded = Math.round(demand);
    demandEls[type].bar.style.width = `${rounded}%`;
    demandEls[type].bar.style.backgroundColor = rounded < 30 ? "#d95d4f" : rounded < 60 ? "#f4c430" : "#6fd276";
    demandEls[type].value.textContent = rounded;
  }
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
  // Lots and civic buildings draw from an adjacent powered conductor without
  // becoming conductors themselves, so power cannot leapfrog through a district.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = grid[r][c];
      if (
        t.type === "rzone" ||
        t.type === "czone" ||
        t.type === "izone" ||
        t.type === "water" ||
        SERVICE_TYPES.has(t.type)
      ) {
        t.powered = neighbors4(r, c).some(([nr, nc]) => grid[nr][nc].powered);
      }
    }
  }
}

function countCity() {
  population = 0;
  jobs = 0;
  commercialJobs = 0;
  industrialJobs = 0;
  for (const row of grid) {
    for (const t of row) {
      if (t.type === "rzone") population += t.level * 18;
      if (t.type === "czone") commercialJobs += t.level * 12;
      if (t.type === "izone") industrialJobs += t.level * 16;
    }
  }
  jobs = commercialJobs + industrialJobs;
}

function isServiceActive(r, c, type) {
  const tile = grid[r][c];
  if (tile.type !== type || !nearRoad(r, c)) return false;
  return type === "park" || tile.powered;
}

function calculateCoverage(type, radius, capacity) {
  if (population === 0) return 0;
  const sites = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (isServiceActive(r, c, type)) sites.push([r, c]);
    }
  }
  if (!sites.length) return 0;

  let reached = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = grid[r][c];
      if (tile.type !== "rzone" || tile.level === 0) continue;
      if (sites.some(([sr, sc]) => Math.abs(sr - r) + Math.abs(sc - c) <= radius)) {
        reached += tile.level * 18;
      }
    }
  }
  return clamp((Math.min(reached, sites.length * capacity) / population) * 100);
}

function calculatePollution() {
  if (population === 0) return 0;
  let exposed = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = grid[r][c];
      if (tile.type !== "rzone" || tile.level === 0) continue;
      let severity = 0;
      for (let sr = Math.max(0, r - 5); sr <= Math.min(ROWS - 1, r + 5); sr++) {
        for (let sc = Math.max(0, c - 5); sc <= Math.min(COLS - 1, c + 5); sc++) {
          const distance = Math.abs(sr - r) + Math.abs(sc - c);
          if (grid[sr][sc].type === "izone" && grid[sr][sc].level > 0 && distance <= 3) severity += 0.35;
          if (grid[sr][sc].type === "plant" && distance <= 5) severity += 0.5;
        }
      }
      exposed += tile.level * 18 * Math.min(1, severity);
    }
  }
  return clamp((exposed / population) * 100);
}

function calculateWellbeing() {
  for (const [type, def] of Object.entries(SERVICES)) {
    serviceCoverage[type] = calculateCoverage(type, def.radius, def.capacity);
  }
  serviceCoverage.water = calculateCoverage("water", 8, 900);

  const workforce = population * 0.48;
  employment = workforce > 0 ? clamp((Math.min(workforce, jobs) / workforce) * 100) : 100;
  const pollution = calculatePollution();
  const roadCount = grid.flat().filter((tile) => tile.type === "road").length;
  const trips = population * 0.32 + jobs * 0.45;
  const roadCapacity = Math.max(12, roadCount * 9);
  const rawTraffic = clamp(((trips - roadCapacity) / roadCapacity) * 100);
  const trafficPressure = clamp(rawTraffic - serviceCoverage.transit * 0.55);
  const uncollectedWaste = population > 0 ? 100 - serviceCoverage.sanitation : 0;
  const essentialCoverage =
    serviceCoverage.school * 0.14 +
    serviceCoverage.police * 0.12 +
    serviceCoverage.hospital * 0.15 +
    serviceCoverage.fire * 0.08 +
    serviceCoverage.sanitation * 0.12 +
    serviceCoverage.water * 0.14 +
    serviceCoverage.park * 0.08 +
    serviceCoverage.library * 0.06 +
    serviceCoverage.transit * 0.06 +
    serviceCoverage.cityhall * 0.05;
  qualityOfLife = population === 0
    ? 50
    : clamp(
      22 +
      essentialCoverage * 0.72 +
      employment * 0.14 -
      pollution * 0.25 -
      trafficPressure * 0.12 -
      uncollectedWaste * 0.08
    );

  const jobBalance = workforce > 0
    ? clamp(100 - (Math.abs(jobs - workforce) / Math.max(workforce, jobs, 1)) * 100)
    : 70;
  const taxEffect = (10 - taxRate) * 2;
  happiness = population === 0
    ? 50
    : clamp(
      18 +
      qualityOfLife * 0.54 +
      jobBalance * 0.22 +
      taxEffect -
      pollution * 0.2 -
      trafficPressure * 0.08
    );

  const wantedCommercial = population * 0.2;
  const wantedIndustrial = population * 0.28;
  const availableJobs = jobs - workforce;
  zoneDemand.rzone = clamp(48 + availableJobs * 0.6 + (happiness - 50) * 0.55 - Math.max(0, taxRate - 10) * 3);
  zoneDemand.czone = clamp(
    population === 0 ? 25 : 48 + ((wantedCommercial - commercialJobs) / Math.max(12, wantedCommercial)) * 42 + (happiness - 50) * 0.18
  );
  zoneDemand.izone = clamp(
    population === 0 ? 35 : 48 + ((wantedIndustrial - industrialJobs) / Math.max(16, wantedIndustrial)) * 42 - Math.max(0, pollution - 35) * 0.2
  );

  const missing = Object.entries(serviceCoverage).sort((a, b) => a[1] - b[1])[0];
  if (funds < 0) {
    advisorMessage = "The city is in debt. Raise taxes or reduce service upkeep.";
  } else if (population === 0) {
    advisorMessage = "Zone homes and jobs, then connect them to roads and power.";
  } else if (employment < 65) {
    advisorMessage = "Unemployment is high. Add commercial or industrial jobs.";
  } else if (jobs > workforce * 1.7) {
    advisorMessage = "Businesses need workers. Zone more residential land.";
  } else if (pollution > 35) {
    advisorMessage = "Homes are too close to industry or the power plant.";
  } else if (trafficPressure > 35) {
    advisorMessage = "Traffic is slowing the city. Add roads or a transit depot.";
  } else if (uncollectedWaste > 60) {
    advisorMessage = "Uncollected waste is hurting quality of life.";
  } else if (missing[1] < 35) {
    const label = missing[0] === "water" ? "water towers" : `${SERVICES[missing[0]].label.toLowerCase()} coverage`;
    advisorMessage = `Residents need better ${label}.`;
  } else if (happiness >= 80) {
    advisorMessage = "The city is thriving. Keep services funded as it grows.";
  } else {
    advisorMessage = "Growth is steady. Watch demand and expand service coverage.";
  }
}

function simulateTick() {
  updatePower();
  countCity();
  calculateWellbeing();

  let roadCount = 0;
  let powerCount = 0;
  let plantCount = 0;
  let waterCount = 0;
  let serviceUpkeep = 0;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = grid[r][c];
      if (t.type === "road") roadCount++;
      if (t.type === "power") powerCount++;
      if (t.type === "plant") plantCount++;
      if (t.type === "water") waterCount++;
      if (SERVICE_TYPES.has(t.type)) serviceUpkeep += SERVICES[t.type].upkeep;

      const isZone = t.type === "rzone" || t.type === "czone" || t.type === "izone";
      if (!isZone) continue;

      const demand = zoneDemand[t.type];
      const viable = t.powered && nearRoad(r, c);
      const residentialReady = t.type !== "rzone" || t.level === 0 || serviceCoverage.water > 0;
      if (viable && residentialReady && t.level < 3 && demand > 20) {
        const chance = 0.012 + (demand / 100) * 0.11 + (qualityOfLife / 100) * 0.025;
        if (Math.random() < chance) t.level++;
      } else if (t.level > 0 && (!viable || demand < 12 || (t.type === "rzone" && happiness < 18))) {
        if (Math.random() < 0.035) t.level--;
      }
    }
  }

  countCity();
  calculateWellbeing();
  const upkeep = roadCount * 0.4 + powerCount * 0.3 + plantCount * 40 + waterCount * 18 + serviceUpkeep;
  const taxableActivity = population + commercialJobs * 1.25 + industrialJobs;
  const administrationBonus = 1 + (serviceCoverage.cityhall / 100) * 0.15;
  const income = taxableActivity * (taxRate / 100) * 0.7 * administrationBonus;
  monthlyBalance = income - upkeep;
  funds += monthlyBalance;

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

  const typeMap = {
    road: "road",
    rzone: "rzone",
    czone: "czone",
    izone: "izone",
    power: "power",
    plant: "plant",
    water: "water",
    school: "school",
    police: "police",
    hospital: "hospital",
    park: "park",
    library: "library",
    fire: "fire",
    sanitation: "sanitation",
    transit: "transit",
    cityhall: "cityhall",
  };
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
  "road_straight", "road_straight_crossing", "road_corner", "road_corner_curved", "road_tsplit", "road_junction",
  "building_A", "building_B", "building_C", "building_D",
  "building_E", "building_F", "building_G", "building_H",
  "building_A_withoutBase", "building_B_withoutBase", "building_C_withoutBase",
  "building_D_withoutBase", "building_E_withoutBase", "building_F_withoutBase",
  "building_G_withoutBase", "building_H_withoutBase",
  "watertower", "bush", "bench", "dumpster", "box_A", "box_B",
  "firehydrant", "streetlight", "trafficlight_A", "trafficlight_B", "trafficlight_C", "trash_A", "trash_B",
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

const CARS = ["car_sedan", "car_taxi", "car_hatchback", "car_stationwagon"];

const models = new Map();

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbad6d8, 95, 245);

const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 400);
camera.fov = 52;
camera.position.set(0, 24, 50);
camera.updateProjectionMatrix();

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 14;
controls.maxDistance = 130;
controls.maxPolarAngle = 1.35;
controls.target.set(0, 0.4, 0);
// Left button paints; orbiting is on the right button (two fingers on touch) so
// that dragging out a row of road never spins the camera.
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE };
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

const sunDirection = new THREE.Vector3();
sunDirection.setFromSphericalCoords(1, THREE.MathUtils.degToRad(70), THREE.MathUtils.degToRad(225));

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(260, 40, 20),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      horizonColor: { value: new THREE.Color(0x9fc9d2) },
      zenithColor: { value: new THREE.Color(0x326b9d) },
      sunColor: { value: new THREE.Color(0xffe6b2) },
      sunDirection: { value: sunDirection },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 horizonColor;
      uniform vec3 zenithColor;
      uniform vec3 sunColor;
      uniform vec3 sunDirection;
      varying vec3 vWorldPosition;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i++) {
          value += amplitude * noise(p);
          p = p * 2.03 + vec2(17.1, 9.2);
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec3 direction = normalize(vWorldPosition);
        float height = normalize(vWorldPosition + vec3(0.0, 28.0, 0.0)).y;
        float blend = pow(smoothstep(-0.08, 0.72, height), 0.72);
        vec3 skyColor = mix(horizonColor, zenithColor, blend);

        vec2 cloudUv = direction.xz / max(0.16, direction.y + 0.4);
        float clouds = fbm(cloudUv * 1.45 + vec2(2.3, -1.7));
        float cloudBand = smoothstep(-0.02, 0.2, direction.y) *
          (1.0 - smoothstep(0.62, 0.86, direction.y));
        float cloudMask = smoothstep(0.5, 0.69, clouds) * cloudBand * 0.42;
        skyColor = mix(skyColor, vec3(0.93, 0.95, 0.95), cloudMask);

        float sunCore = pow(max(dot(direction, normalize(sunDirection)), 0.0), 850.0);
        float sunGlow = pow(max(dot(direction, normalize(sunDirection)), 0.0), 28.0);
        skyColor += sunColor * (sunCore * 1.1 + sunGlow * 0.12);
        gl_FragColor = vec4(skyColor, 1.0);
      }
    `,
  })
);
sky.renderOrder = -100;
scene.add(sky);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const grainPass = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    amount: { value: 0.018 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float amount;
    varying vec2 vUv;

    float random(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float grain = random(vUv * vec2(1439.0, 917.0) + fract(time * 7.0)) - 0.5;
      float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      color.rgb += grain * amount * (0.7 + (1.0 - luminance) * 0.3);
      gl_FragColor = color;
    }
  `,
});
composer.addPass(grainPass);
composer.addPass(new OutputPass());

scene.add(new THREE.HemisphereLight(0xd9efff, 0x56714b, 1.25));
scene.add(new THREE.AmbientLight(0xfff7e8, 0.16));

const sun = new THREE.DirectionalLight(0xfff4dd, 1.5);
sun.position.copy(sunDirection).multiplyScalar(85);
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
const terrainDecor = new THREE.Group();
scene.add(terrainDecor);

const WORLD_W = COLS * TILE;
const WORLD_H = ROWS * TILE;
const HALF_PI = Math.PI / 2;

function tileX(c) {
  return (c - (COLS - 1) / 2) * TILE;
}

function tileZ(r) {
  return (r - (ROWS - 1) / 2) * TILE;
}

// A lightly mottled lot texture keeps the grid readable without looking like a
// perfectly flat checkerboard.
function makeGroundTexture() {
  const size = 256;
  const tile = document.createElement("canvas");
  tile.width = size;
  tile.height = size;
  const g = tile.getContext("2d");
  g.fillStyle = COLORS.grassA;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 1800; i++) {
    const shade = 72 + Math.floor(Math.random() * 34);
    g.fillStyle = `rgba(${shade}, ${125 + Math.floor(Math.random() * 34)}, ${shade}, 0.12)`;
    const radius = 1 + Math.random() * 3;
    g.fillRect(Math.random() * size, Math.random() * size, radius, radius);
  }
  g.strokeStyle = "rgba(43, 93, 45, 0.22)";
  g.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    const p = (i * size) / 4;
    g.beginPath();
    g.moveTo(p, 0);
    g.lineTo(p, size);
    g.stroke();
    g.beginPath();
    g.moveTo(0, p);
    g.lineTo(size, p);
    g.stroke();
  }
  const texture = new THREE.CanvasTexture(tile);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(COLS / 4, ROWS / 4);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
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

// Rolling terrain surrounds the flat construction grid. The falloff keeps every
// buildable lot level while progressively revealing hills toward the horizon.
function terrainHeight(x, z) {
  const cityDistance = Math.max(
    Math.abs(x) - WORLD_W * 0.54,
    Math.abs(z) - WORLD_H * 0.58,
    0
  );
  const falloff = THREE.MathUtils.smoothstep(cityDistance, 0, 35);
  const broad = Math.sin(x * 0.065) * 2.4 + Math.cos(z * 0.075) * 1.9;
  const detail = Math.sin((x + z) * 0.1) * 0.42 + Math.cos((x - z) * 0.08) * 0.34;
  const ridge = Math.pow(Math.max(0, Math.sin(x * 0.03 + z * 0.018)), 3) * 3.2;
  return (broad + detail + ridge) * falloff - 0.32;
}

function makeTerrain() {
  const geometry = new THREE.PlaneGeometry(320, 260, 128, 104);
  const position = geometry.attributes.position;
  const colors = [];
  const low = new THREE.Color(0x477c48);
  const meadow = new THREE.Color(0x679b55);
  const high = new THREE.Color(0x7f8b67);
  const color = new THREE.Color();

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = -position.getY(i);
    const height = terrainHeight(x, z);
    position.setZ(i, height);
    if (height < 0.5) color.copy(low).lerp(meadow, THREE.MathUtils.smoothstep(height, -1, 0.5));
    else color.copy(meadow).lerp(high, THREE.MathUtils.smoothstep(height, 0.5, 7));
    const variation =
      (Math.sin(x * 0.23) * Math.cos(z * 0.19) + Math.sin(x * 0.11 + z * 0.17)) * 0.014;
    color.offsetHSL(0, 0, variation);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const terrain = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.96,
      metalness: 0,
    })
  );
  terrain.rotation.x = -HALF_PI;
  terrain.position.y = -0.18;
  terrain.receiveShadow = true;
  return terrain;
}

scene.add(makeTerrain());

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
const serviceMaterials = {
  school: new THREE.MeshStandardMaterial({ color: 0xf2c94c, roughness: 0.7 }),
  police: new THREE.MeshStandardMaterial({ color: 0x4b8fdd, roughness: 0.65 }),
  hospital: new THREE.MeshStandardMaterial({ color: 0xe95f55, roughness: 0.65 }),
  library: new THREE.MeshStandardMaterial({ color: 0xa877c8, roughness: 0.7 }),
  fire: new THREE.MeshStandardMaterial({ color: 0xf07835, roughness: 0.65 }),
  sanitation: new THREE.MeshStandardMaterial({ color: 0x68b36b, roughness: 0.7 }),
  transit: new THREE.MeshStandardMaterial({ color: 0x54b9bd, roughness: 0.65 }),
  cityhall: new THREE.MeshStandardMaterial({ color: 0xe7d9b4, roughness: 0.7 }),
};

const poleGeometry = new THREE.BoxGeometry(0.12, 1.6, 0.12);
const armGeometry = new THREE.BoxGeometry(0.9, 0.1, 0.1);
const wireGeometry = new THREE.BoxGeometry(2, 0.06, 0.06);
const alertGeometry = new THREE.OctahedronGeometry(0.22);
const stackGeometry = new THREE.CylinderGeometry(0.16, 0.2, 1.5, 10);
const lampGeometry = new THREE.SphereGeometry(0.16, 12, 12);
const serviceMarkerGeometry = new THREE.CylinderGeometry(0.28, 0.28, 0.12, 12);

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

function buildTerrainDecor() {
  terrainDecor.clear();
  for (let i = 0; i < 190; i++) {
    const x = (hash(i, 71, 1) - 0.5) * 290;
    const z = (hash(i, 72, 2) - 0.5) * 230;
    const outsideCity =
      Math.abs(x) > WORLD_W * 0.58 ||
      Math.abs(z) > WORLD_H * 0.64;
    if (!outsideCity) continue;

    const bush = instance("bush");
    bush.position.set(x, terrainHeight(x, z) - 0.12, z);
    bush.rotation.y = hash(i, 73, 3) * Math.PI * 2;
    bush.scale.setScalar(1.6 + hash(i, 74, 4) * 2.4);
    terrainDecor.add(bush);
  }
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
    const trash = instance(hash(r, c, 9) < 0.5 ? "trash_A" : "trash_B");
    trash.position.set((hash(r, c, 7) - 0.5) * 1.2, 0, (hash(r, c, 8) - 0.5) * 1.2);
    group.add(trash);
  }
}

function buildRoadTile(group, r, c, mask) {
  const { name, rot } = roadPiece(mask, wantsCrossing(r, c));
  const modelName = name === "road_corner" && hash(r, c, 10) < 0.35 ? "road_corner_curved" : name;
  const road = instance(modelName);
  road.rotation.y = rot;
  // Flat plates: let them receive shadows but not cast, which only causes acne.
  road.traverse((obj) => {
    if (obj.isMesh) obj.castShadow = false;
  });
  group.add(road);

  const bits = hash(r, c, 11);
  if (name === "road_junction" && bits < 0.6) {
    const lightNames = ["trafficlight_A", "trafficlight_B", "trafficlight_C"];
    const light = instance(lightNames[Math.floor(hash(r, c, 17) * lightNames.length)]);
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
    addInactiveAlert(group, r, c);
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

  const building = instance("building_G_withoutBase");
  building.position.y = 0.1;
  group.add(building);

  const stack = new THREE.Mesh(stackGeometry, poleMaterial);
  stack.position.set(0.62, 2.05, 0.48);
  stack.castShadow = true;
  group.add(stack);

  const dumpster = instance("dumpster");
  dumpster.position.set(0.45, 0.1, -0.6);
  group.add(dumpster);

  const lamp = new THREE.Mesh(lampGeometry, powered ? wireLiveMaterial : wireDeadMaterial);
  lamp.position.set(0.62, 2.84, 0.48);
  group.add(lamp);
}

function addInactiveAlert(group, r, c) {
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);
  const baseY = Number.isFinite(bounds.max.y) ? bounds.max.y + 0.35 : 2.4;
  const alert = new THREE.Mesh(alertGeometry, alertMaterial);
  alert.position.set(0, baseY, 0);
  group.add(alert);
  bobbing.push({ mesh: alert, baseY, phase: hash(r, c, 48) * Math.PI * 2 });
}

function buildWaterTile(group, r, c, powered) {
  group.add(instance("base"));
  const tower = instance("watertower");
  tower.position.y = 0.1;
  tower.scale.setScalar(2.5);
  group.add(tower);
  if (!powered || !nearRoad(r, c)) addInactiveAlert(group, r, c);
}

function buildServiceTile(group, r, c, type, powered) {
  group.add(instance("base"));
  const def = SERVICES[type];

  if (type === "park") {
    for (let i = 0; i < 4; i++) {
      const bush = instance("bush");
      bush.position.set(i < 2 ? -0.62 : 0.62, 0.1, i % 2 ? -0.62 : 0.62);
      bush.scale.setScalar(1.5 + hash(r, c, 50 + i) * 0.45);
      group.add(bush);
    }
    const bench = instance("bench");
    bench.position.set(0, 0.1, 0);
    bench.scale.setScalar(1.7);
    bench.rotation.y = HALF_PI;
    group.add(bench);
  } else {
    const building = instance(`${def.model}_withoutBase`);
    building.position.y = 0.1;
    building.rotation.y = Math.floor(hash(r, c, 55) * 4) * HALF_PI;
    group.add(building);

    const marker = new THREE.Mesh(serviceMarkerGeometry, serviceMaterials[type]);
    building.updateMatrixWorld(true);
    const buildingTop = new THREE.Box3().setFromObject(building).max.y;
    marker.position.set(0, buildingTop + 0.14, 0);
    marker.castShadow = true;
    group.add(marker);

    if (type === "police") {
      const car = instance("car_police");
      car.position.set(0.54, 0.1, 0.62);
      car.rotation.y = Math.PI;
      group.add(car);
    } else if (type === "hospital") {
      const hydrant = instance("firehydrant");
      hydrant.position.set(-0.72, 0.1, 0.68);
      group.add(hydrant);
    } else if (type === "library") {
      const bench = instance("bench");
      bench.position.set(-0.62, 0.1, 0.68);
      bench.scale.setScalar(1.45);
      group.add(bench);
    } else if (type === "fire") {
      for (const x of [-0.68, 0.68]) {
        const hydrant = instance("firehydrant");
        hydrant.position.set(x, 0.1, 0.68);
        group.add(hydrant);
      }
    } else if (type === "sanitation") {
      const dumpster = instance("dumpster");
      dumpster.position.set(0.58, 0.1, 0.55);
      dumpster.rotation.y = HALF_PI;
      group.add(dumpster);
      const trash = instance("trash_B");
      trash.position.set(-0.62, 0.1, 0.65);
      group.add(trash);
    } else if (type === "transit") {
      const taxi = instance("car_taxi");
      taxi.position.set(0.54, 0.1, 0.64);
      taxi.rotation.y = Math.PI;
      group.add(taxi);
      const sedan = instance("car_sedan");
      sedan.position.set(-0.54, 0.1, 0.64);
      sedan.rotation.y = Math.PI;
      group.add(sedan);
    } else if (type === "cityhall") {
      for (const x of [-0.62, 0.62]) {
        const bench = instance("bench");
        bench.position.set(x, 0.1, 0.68);
        bench.scale.setScalar(1.35);
        group.add(bench);
      }
    }
  }

  if (!isServiceActive(r, c, type)) addInactiveAlert(group, r, c);
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
    case "water":
      buildWaterTile(group, r, c, tile.powered);
      break;
    case "rzone":
    case "czone":
    case "izone":
      buildZoneTile(group, r, c, tile.type, tile.level, tile.powered);
      break;
    default:
      if (SERVICE_TYPES.has(tile.type)) buildServiceTile(group, r, c, tile.type, tile.powered);
      else buildGrassTile(group, r, c);
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
  const roadAccess = tile.type === "water" || SERVICE_TYPES.has(tile.type) ? nearRoad(r, c) : false;
  return `${tile.type}|${tile.level}|${tile.powered ? 1 : 0}|${roadAccess ? 1 : 0}`;
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

function resetCity() {
  newCity();
  resetTiles();
}

function togglePause() {
  running = !running;
  pauseBtn.textContent = running ? "Pause" : "Resume";
  menuPauseBtn.textContent = running ? "Pause" : "Resume";
}

function updateMenuClock() {
  menuClock.textContent = new Intl.DateTimeFormat([], {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

newCityBtn.addEventListener("click", resetCity);
menuNewCityBtn.addEventListener("click", resetCity);
pauseBtn.addEventListener("click", togglePause);
menuPauseBtn.addEventListener("click", togglePause);
updateMenuClock();
setInterval(updateMenuClock, 1000);

function resize() {
  const width = canvas.clientWidth || 1;
  const height = canvas.clientHeight || 1;
  renderer.setSize(width, height, false);
  composer.setSize(width, height);
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
  grainPass.uniforms.time.value = t;
  for (const item of bobbing) {
    item.mesh.position.y = item.baseY + Math.sin(t * 2.4 + item.phase) * 0.16;
    item.mesh.rotation.y = t * 1.2 + item.phase;
  }

  controls.update();
  composer.render();
  requestAnimationFrame(loop);
}

newCity();
resetTiles();
resize();

loadModels()
  .then(() => {
    buildTerrainDecor();
    if (loadingEl) loadingEl.remove();
    requestAnimationFrame(loop);
  })
  .catch((error) => {
    console.error("Blockopolis: failed to load the city kit", error);
    if (loadingEl) loadingEl.textContent = "Couldn't load the city models.";
  });
