/**
 * 3D & 2D Viscosimeter Simulator
 * Powered by ClassroomOS shared fluid engines:
 *   - assets/js/liquid-engine.js (StokesColumn, Surface, DepthField, Particles)
 *   - assets/js/liquid-engine-three.mjs (createLiquidSurface, createDepthFieldMesh, createUnderwaterLighting)
 *   - assets/js/sim-kit.js & assets/js/sim-kit-three.mjs
 */
import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';
import {
  createLiquidSurface,
  createDepthFieldMesh,
  createUnderwaterLighting
} from '../liquid-engine-three.mjs';

const LiquidEngine = window.LiquidEngine;
const SimKit = window.SimKit;

const COLUMN_HEIGHT_M = 0.50; // 50 cm laboratory column
const TUBE_H = 4.4;
const TUBE_R = 1.04;
const TUBE_TOP_Y = TUBE_H * 0.5;
const TUBE_BOT_Y = -TUBE_H * 0.5;

const FLUIDS = {
  boilingWater: {
    key: 'boilingWater',
    name: 'Boiling Water (100°C)',
    short: 'Boiling Water',
    eta: 0.000282,
    rho: 958,
    tempC: 100,
    color: 0x0e7490,
    deep: 0x083344,
    opacity: 0.34,
    emissive: 0x000000,
    emissiveIntensity: 0,
    glow: 0x7dd3fc,
    glowInt: 0.35,
    canvasColor: 'rgba(103,232,249,0.45)',
    accent: '#0284c7',
    particleMode: 'boil',
    fluidity: 0.98,
    cooling: 0
  },
  water: {
    key: 'water',
    name: 'Water (20°C)',
    short: 'Water (20°C)',
    eta: 0.001,
    rho: 998,
    tempC: 20,
    color: 0x1878c9,
    deep: 0x062e58,
    opacity: 0.38,
    emissive: 0x000000,
    emissiveIntensity: 0,
    glow: 0x38bdf8,
    glowInt: 0.18,
    canvasColor: 'rgba(100,180,255,0.45)',
    accent: '#30b0c7',
    particleMode: 'tracer',
    fluidity: 0.94,
    cooling: 0
  },
  coldWater: {
    key: 'coldWater',
    name: 'Cold Water (2°C)',
    short: 'Cold Water',
    eta: 0.00167,
    rho: 1000,
    tempC: 2,
    color: 0x0284c7,
    deep: 0x072540,
    opacity: 0.44,
    emissive: 0x000000,
    emissiveIntensity: 0,
    glow: 0x38bdf8,
    glowInt: 0.22,
    canvasColor: 'rgba(56,189,248,0.52)',
    accent: '#0369a1',
    particleMode: 'ice',
    fluidity: 0.90,
    cooling: 0
  },
  oil: {
    key: 'oil',
    name: 'Motor Oil (SAE 30)',
    short: 'Motor Oil',
    eta: 0.10,
    rho: 880,
    tempC: 20,
    color: 0x785c28,
    deep: 0x161108,
    opacity: 0.70,
    emissive: 0x000000,
    emissiveIntensity: 0,
    glow: 0x94a3b8,
    glowInt: 0.06,
    canvasColor: 'rgba(165,125,52,0.58)',
    accent: '#9a6f20',
    particleMode: 'tracer',
    fluidity: 0.72,
    cooling: 0
  },
  glycerol: {
    key: 'glycerol',
    name: 'Glycerol (20°C)',
    short: 'Glycerol',
    eta: 1.40,
    rho: 1260,
    tempC: 20,
    color: 0x10b981,
    deep: 0x064e3b,
    opacity: 0.50,
    emissive: 0x000000,
    emissiveIntensity: 0,
    glow: 0x34d399,
    glowInt: 0.22,
    canvasColor: 'rgba(52,211,153,0.48)',
    accent: '#059669',
    particleMode: 'tracer',
    fluidity: 0.42,
    cooling: 0
  },
  honey: {
    key: 'honey',
    name: 'Honey (20°C)',
    short: 'Honey',
    eta: 10.0,
    rho: 1400,
    tempC: 20,
    color: 0xd9951d,
    deep: 0x5c2b06,
    opacity: 0.76,
    emissive: 0x3b1903,
    emissiveIntensity: 0.18,
    glow: 0xf59e0b,
    glowInt: 0.36,
    canvasColor: 'rgba(220,170,40,0.68)',
    accent: '#d97706',
    particleMode: 'bubble',
    fluidity: 0.18,
    cooling: 0
  },
  lava: {
    key: 'lava',
    name: 'Basaltic Lava (1150°C)',
    short: 'Basaltic Lava',
    eta: 100.0,
    rho: 2700,
    tempC: 1150,
    color: 0xf04a18,
    deep: 0x3d0804,
    opacity: 0.94,
    emissive: 0xd9380f,
    emissiveIntensity: 0.92,
    glow: 0xff5a1f,
    glowInt: 3.4,
    canvasColor: 'rgba(240,74,24,0.85)',
    accent: '#ea580c',
    particleMode: 'molten',
    fluidity: 0.26,
    cooling: 0.35
  },
  magma: {
    key: 'magma',
    name: 'Silicic Magma (850°C)',
    short: 'Silicic Magma',
    eta: 1000.0,
    rho: 2400,
    tempC: 850,
    color: 0x991b1b,
    deep: 0x1c0504,
    opacity: 0.97,
    emissive: 0x9f1212,
    emissiveIntensity: 0.68,
    glow: 0xef4444,
    glowInt: 2.3,
    canvasColor: 'rgba(220,38,38,0.88)',
    accent: '#dc2626',
    particleMode: 'molten',
    fluidity: 0.05,
    cooling: 0.62
  }
};

const SPHERE_MATERIALS = {
  plastic: { key: 'plastic', name: 'Plastic', rho: 1200, color: 0xa78bfa, hex: '#a78bfa', metalness: 0.06, roughness: 0.36, transparent: false, opacity: 1 },
  glass:   { key: 'glass',   name: 'Glass',   rho: 2500, color: 0x7dd3fc, hex: '#7dd3fc', metalness: 0.12, roughness: 0.08, transparent: true,  opacity: 0.86 },
  steel:   { key: 'steel',   name: 'Steel',   rho: 7800, color: 0xcbd5e1, hex: '#94a3b8', metalness: 0.88, roughness: 0.22, transparent: false, opacity: 1 },
  tungsten:{ key: 'tungsten',name: 'Tungsten',rho: 15600,color: 0x475569, hex: '#475569', metalness: 0.94, roughness: 0.16, transparent: false, opacity: 1 }
};

const RACE_PRESETS = {
  temp: { label: 'Temperature & Everyday', fluids: ['boilingWater', 'coldWater', 'oil', 'honey'] },
  classic: { label: 'Classic Lab Quartet', fluids: ['water', 'oil', 'glycerol', 'honey'] },
  extreme: { label: 'Extreme Rheology (Oil → Magma)', fluids: ['oil', 'honey', 'lava', 'magma'] }
};

function hasWebGL() {
  try {
    const probe = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (probe.getContext('webgl') || probe.getContext('experimental-webgl')));
  } catch {
    return false;
  }
}

function formatVelocity(v) {
  if (!Number.isFinite(v) || v <= 0) return '0.00 cm/s';
  const cm = v * 100;
  if (cm >= 1000) return `${v.toFixed(1)} m/s`;
  if (cm >= 10) return `${cm.toFixed(1)} cm/s`;
  if (cm >= 0.1) return `${cm.toFixed(2)} cm/s`;
  if (cm >= 0.001) return `${(v * 1000).toFixed(3)} mm/s`;
  return `${(v * 1000).toFixed(4)} mm/s`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return 'Floats';
  if (seconds < 0.01) return `${(seconds * 1000).toFixed(2)} ms`;
  if (seconds < 10) return `${seconds.toFixed(2)} s`;
  if (seconds < 120) return `${seconds.toFixed(1)} s`;
  const mins = Math.floor(seconds / 60);
  const rem = Math.round(seconds % 60);
  return `${mins}m ${rem}s`;
}

function formatViscosity(eta) {
  if (eta < 0.001) return `${eta.toFixed(6)} Pa·s`;
  if (eta < 0.01) return `${eta === 0.001 ? '0.0010' : Number(eta.toFixed(5))} Pa·s`;
  if (eta < 10) return `${eta.toFixed(2)} Pa·s`;
  return `${eta.toFixed(0)} Pa·s`;
}

function formatReynolds(re) {
  if (!Number.isFinite(re) || re <= 0) return '0';
  if (re >= 1000) return Math.round(re).toLocaleString();
  if (re >= 1) return re.toFixed(1);
  if (re >= 0.01) return re.toFixed(3);
  return re.toExponential(1);
}

function formatMultiplier(m) {
  if (m >= 100) return `${Math.round(m)}×`;
  if (m >= 10) return `${m.toFixed(0)}×`;
  if (m >= 1) return `${m.toFixed(1)}×`;
  if (m >= 0.01) return `${m.toFixed(3)}×`;
  return `${m.toFixed(4)}×`;
}

function makeRulerTexture() {
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 512;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = 'rgba(15, 23, 42, 0.72)';
  g.fillRect(10, 8, 140, 496);
  g.strokeStyle = 'rgba(148, 163, 184, 0.4)';
  g.lineWidth = 2;
  g.strokeRect(10, 8, 140, 496);

  const topY = 24;
  const botY = 488;
  for (let cm = 0; cm <= 50; cm += 2) {
    const t = cm / 50;
    const y = topY + t * (botY - topY);
    const major = cm % 10 === 0;
    g.strokeStyle = major ? '#38bdf8' : 'rgba(203, 213, 225, 0.55)';
    g.lineWidth = major ? 3 : 1.5;
    g.beginPath();
    g.moveTo(major ? 96 : 114, y);
    g.lineTo(146, y);
    g.stroke();
    if (major) {
      g.fillStyle = '#e2e8f0';
      g.font = '700 22px Inter, system-ui, sans-serif';
      g.textAlign = 'right';
      g.textBaseline = 'middle';
      g.fillText(`${cm} cm`, 88, y);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

function makeSpriteLabel() {
  const c = document.createElement('canvas');
  c.width = 360;
  c.height = 136;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.05, 0.78, 1);
  let lastKey = '';

  function setText(title, subtitle, status, accent = '#38bdf8') {
    const key = `${title}|${subtitle}|${status}|${accent}`;
    if (key === lastKey) return;
    lastKey = key;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(10, 18, 30, 0.84)';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(6, 6, c.width - 12, c.height - 12, 18);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 24px Inter, system-ui, sans-serif';
    ctx.fillText(title, c.width / 2, 42);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 19px Inter, system-ui, sans-serif';
    ctx.fillText(subtitle, c.width / 2, 74);

    ctx.fillStyle = accent;
    ctx.font = '700 22px Inter, system-ui, sans-serif';
    ctx.fillText(status, c.width / 2, 108);
    tex.needsUpdate = true;
  }

  return { sprite, setText, dispose() { tex.dispose(); mat.dispose(); } };
}

function makeForceArrow(colorHex, labelText) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.35,
    roughness: 0.3
  });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 1, 14), mat);
  shaft.position.y = 0.5;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.088, 0.22, 16), mat);
  head.position.y = 1.05;
  group.add(shaft, head);

  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 48;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(9, 14, 24, 0.82)';
  ctx.beginPath();
  ctx.roundRect(4, 4, 88, 40, 12);
  ctx.fill();
  ctx.fillStyle = `#${colorHex.toString(16).padStart(6, '0')}`;
  ctx.font = '800 24px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(labelText, 48, 25);
  const tex = new THREE.CanvasTexture(c);
  const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const badge = new THREE.Sprite(spriteMat);
  badge.scale.set(0.48, 0.24, 1);
  badge.position.set(0.26, 0.65, 0);
  group.add(badge);

  function setLength(len, dirSign = 1) {
    const visible = len > 0.03;
    group.visible = visible;
    if (!visible) return;
    const clamped = Math.min(1.65, Math.max(0.14, len));
    group.scale.y = dirSign;
    shaft.scale.y = Math.max(0.08, clamped - 0.18);
    shaft.position.y = shaft.scale.y * 0.5;
    head.position.y = shaft.scale.y + 0.09;
    badge.position.y = Math.max(0.28, clamped * 0.72);
    badge.scale.y = 0.24 * dirSign;
  }

  return { group, setLength, dispose() { mat.dispose(); tex.dispose(); spriteMat.dispose(); } };
}

function initViscosimeter() {
  const canvas3d = document.getElementById('vis-3d-canvas');
  const canvas2d = document.getElementById('vis-canvas');
  const fallbackEl = document.getElementById('vis-webgl-fallback');
  const hudEl = document.getElementById('vis-hud-badge');
  const floatBadgeEl = document.getElementById('vis-float-badge');
  const raceControlsBar = document.getElementById('vis-race-bar');
  const flowControlsBar = document.getElementById('vis-flow-bar');
  const raceSelect = document.getElementById('vis-race-preset');
  const radiusSliders = Array.from(new Set(document.querySelectorAll('[data-vis-radius], #vis-radius')));
  const radiusLabels = Array.from(new Set(document.querySelectorAll('[data-vis-radius-label], #vis-r-label')));
  const timeScaleSelect = document.getElementById('vis-timescale');
  const vectorsToggle = document.getElementById('vis-vectors-toggle');
  const dropBtnMain = document.getElementById('vis-drop-main');
  const dropBtnSide = document.getElementById('vis-drop-side');

  if (!canvas3d || !canvas2d || !LiquidEngine) return;

  const state = {
    view: 'tube', // 'tube' | 'race' | 'flow' | '2d'
    fluidKey: 'water',
    matKey: 'steel',
    radiusMm: 3,
    timeMode: 'auto', // 'auto' | '0.01' | '1' | '25' | '500'
    showVectors: true,
    racePreset: 'temp',
    running: false,
    done: false,
    floated: false,
    pouring: true,
    enteredFluid: false,
    hoverOffset: 0.34,
    activeTimeScale: 1,
    velocityHistory: [],
    lastHistoryT: -1,
    webglReady: false
  };

  const column = LiquidEngine.createStokesColumn({
    fluid: state.fluidKey,
    eta: FLUIDS[state.fluidKey].eta,
    fluidDensity: FLUIDS[state.fluidKey].rho,
    sphereDensity: SPHERE_MATERIALS[state.matKey].rho,
    radius: state.radiusMm * 0.001,
    columnHeight: COLUMN_HEIGHT_M
  });

  const raceColumns = RACE_PRESETS[state.racePreset].fluids.map((key) =>
    LiquidEngine.createStokesColumn({
      fluid: key,
      eta: FLUIDS[key].eta,
      fluidDensity: FLUIDS[key].rho,
      sphereDensity: SPHERE_MATERIALS[state.matKey].rho,
      radius: state.radiusMm * 0.001,
      columnHeight: COLUMN_HEIGHT_M
    })
  );

  // 2D surface model (for 2D view & fallback)
  const surface2d = LiquidEngine.createSurface({
    material: state.fluidKey,
    width: 140,
    restY: 80,
    columns: 44,
    maxColumns: 64
  });

  // ── 3D Scene Construction ──────────────────────────────────────
  let sceneBundle = null;
  let controls = null;
  let tubeGroup, raceGroup, flowGroup;
  let tubeFluidMat, tubeFluidMesh, tubeMeniscus, tubeSphere, tubeLight;
  let tubeParticlesMesh, tubeSteamMesh;
  let tubeForceGroup, arrowFg, arrowFb, arrowFd, tubeWakeRings;
  let raceSlots = [];
  let depthField, depthFieldMesh, flowPourStream, flowSpoutLight;

  const particleStates = [];
  const steamStates = [];
  const particleDummy = new THREE.Object3D();

  function visualSphereRadius3D(scale = 1) {
    return (0.11 + (state.radiusMm - 1) * 0.032) * scale;
  }

  function applySphereAppearance(mesh) {
    const m = SPHERE_MATERIALS[state.matKey];
    mesh.material.color.setHex(m.color);
    mesh.material.metalness = m.metalness;
    mesh.material.roughness = m.roughness;
    mesh.material.transparent = m.transparent;
    mesh.material.opacity = m.opacity;
    mesh.material.needsUpdate = true;
  }

  function init3D() {
    if (!hasWebGL()) return false;
    try {
      sceneBundle = createScene(canvas3d, {
        THREE,
        fov: 40,
        near: 0.1,
        far: 120,
        clearColor: 0x0b1320,
        maxDpr: 2
      });
    } catch {
      return false;
    }

    const { renderer, scene, camera } = sceneBundle;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    scene.background = new THREE.Color(0x0b1320);

    controls = new OrbitControls(camera, canvas3d);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3.5;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI * 0.88;

    scene.add(new THREE.HemisphereLight(0xe0f2fe, 0x111827, 1.15));
    const keyLight = new THREE.DirectionalLight(0xfff5e4, 2.2);
    keyLight.position.set(6, 10, 7);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.9);
    rimLight.position.set(-7, 4, -6);
    scene.add(rimLight);
    const uw = createUnderwaterLighting(THREE, { intensity: 0.75 });
    scene.add(uw.light);

    // Subtle dark laboratory pedestal grid
    const benchGeo = new THREE.CylinderGeometry(7.2, 7.6, 0.25, 64);
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x111b2a, roughness: 0.78, metalness: 0.22 });
    const bench = new THREE.Mesh(benchGeo, benchMat);
    bench.position.y = -2.68;
    scene.add(bench);

    buildTubeView(scene);
    buildRaceView(scene);
    buildFlowView(scene);
    setCameraForView(state.view);
    syncFluidVisuals();
    return true;
  }

  function buildTubeView(scene) {
    tubeGroup = new THREE.Group();
    scene.add(tubeGroup);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.85, roughness: 0.25 });
    const darkRubberMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.1 });

    // Stand base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.62, 0.26, 48), metalMat);
    base.position.y = TUBE_BOT_Y - 0.18;
    tubeGroup.add(base);

    const cushion = new THREE.Mesh(new THREE.CylinderGeometry(1.14, 1.14, 0.08, 48), darkRubberMat);
    cushion.position.y = TUBE_BOT_Y - 0.03;
    tubeGroup.add(cushion);

    // Outer glass wall
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xe2f4ff,
      transparent: true,
      opacity: 0.20,
      roughness: 0.07,
      metalness: 0.05,
      reflectivity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const glassWall = new THREE.Mesh(new THREE.CylinderGeometry(1.11, 1.11, TUBE_H + 0.65, 48, 1, true), glassMat);
    glassWall.position.y = 0.28;
    glassWall.renderOrder = 4;
    tubeGroup.add(glassWall);

    const topRim = new THREE.Mesh(new THREE.TorusGeometry(1.11, 0.038, 16, 48), glassMat);
    topRim.rotation.x = Math.PI / 2;
    topRim.position.y = TUBE_TOP_Y + 0.60;
    tubeGroup.add(topRim);

    // Graduation rings on cylinder
    const tickMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.55 });
    for (let i = 0; i <= 5; i += 1) {
      const y = TUBE_TOP_Y - (i / 5) * TUBE_H;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.008, 8, 48), tickMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      tubeGroup.add(ring);
    }

    // Crisp side ruler board
    const rulerTex = makeRulerTexture();
    const rulerMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.95, TUBE_H + 0.3),
      new THREE.MeshBasicMaterial({ map: rulerTex, transparent: true, side: THREE.DoubleSide })
    );
    rulerMesh.position.set(-1.72, 0, 0);
    tubeGroup.add(rulerMesh);

    // Inner fluid column
    tubeFluidMat = new THREE.MeshStandardMaterial({
      color: 0x1878c9,
      roughness: 0.16,
      metalness: 0.04,
      transparent: true,
      opacity: 0.38,
      depthWrite: false
    });
    tubeFluidMesh = new THREE.Mesh(new THREE.CylinderGeometry(TUBE_R, TUBE_R, TUBE_H, 48), tubeFluidMat);
    tubeFluidMesh.renderOrder = 2;
    tubeGroup.add(tubeFluidMesh);

    // Meniscus disc using shared liquid-engine-three.mjs
    tubeMeniscus = createLiquidSurface(THREE, {
      material: state.fluidKey,
      width: TUBE_R * 2.1,
      depth: TUBE_R * 2.1,
      discRadius: TUBE_R - 0.01,
      segments: 72,
      y: TUBE_TOP_Y + 0.01,
      visualScale: 0.14
    });
    tubeMeniscus.mesh.renderOrder = 3;
    tubeGroup.add(tubeMeniscus.mesh);

    // Column internal glow light (used heavily for lava/magma & subtle tint)
    tubeLight = new THREE.PointLight(0x38bdf8, 0.25, 8);
    tubeLight.position.set(0, 0.3, 0.8);
    tubeGroup.add(tubeLight);

    // Sphere
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.88,
      roughness: 0.22
    });
    tubeSphere = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), sphereMat);
    applySphereAppearance(tubeSphere);
    tubeSphere.renderOrder = 1;
    tubeGroup.add(tubeSphere);

    // Wake rings behind sphere
    tubeWakeRings = [];
    for (let i = 0; i < 3; i += 1) {
      const wMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
      const wMesh = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.014, 10, 28), wMat);
      wMesh.rotation.x = Math.PI / 2;
      tubeGroup.add(wMesh);
      tubeWakeRings.push({ mesh: wMesh, mat: wMat });
    }

    // 3D Force vector arrows
    tubeForceGroup = new THREE.Group();
    arrowFg = makeForceArrow(0xf97316, 'Fg');
    arrowFb = makeForceArrow(0x38bdf8, 'Fb');
    arrowFd = makeForceArrow(0x34d399, 'Fd');
    arrowFg.group.position.set(0, 0, 0);
    arrowFb.group.position.set(-0.24, 0, 0);
    arrowFd.group.position.set(0.24, 0, 0);
    tubeForceGroup.add(arrowFg.group, arrowFb.group, arrowFd.group);
    tubeGroup.add(tubeForceGroup);

    // Internal fluid particles (bubbles / ice / tracers / magma vesicles)
    const pGeo = new THREE.SphereGeometry(0.036, 10, 8);
    const pMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.72,
      roughness: 0.2
    });
    const P_COUNT = 72;
    tubeParticlesMesh = new THREE.InstancedMesh(pGeo, pMat, P_COUNT);
    tubeParticlesMesh.renderOrder = 3;
    for (let i = 0; i < P_COUNT; i += 1) {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.sqrt(Math.random()) * (TUBE_R - 0.12);
      particleStates.push({
        x: Math.cos(ang) * rad,
        y: TUBE_BOT_Y + 0.1 + Math.random() * (TUBE_H - 0.2),
        z: Math.sin(ang) * rad,
        vy: 0.15 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
        scale: 0.55 + Math.random() * 0.9
      });
    }
    tubeGroup.add(tubeParticlesMesh);

    // Steam wisps above boiling water
    const sGeo = new THREE.SphereGeometry(0.085, 10, 8);
    const sMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.26, depthWrite: false });
    const S_COUNT = 26;
    tubeSteamMesh = new THREE.InstancedMesh(sGeo, sMat, S_COUNT);
    for (let i = 0; i < S_COUNT; i += 1) {
      steamStates.push({
        x: (Math.random() - 0.5) * 1.1,
        y: TUBE_TOP_Y + 0.05 + Math.random() * 1.7,
        z: (Math.random() - 0.5) * 1.1,
        life: Math.random(),
        speed: 0.35 + Math.random() * 0.45
      });
    }
    tubeGroup.add(tubeSteamMesh);
  }

  function buildRaceView(scene) {
    raceGroup = new THREE.Group();
    raceGroup.visible = false;
    scene.add(raceGroup);

    const xs = [-3.3, -1.1, 1.1, 3.3];
    const rH = 4.0;
    const rR = 0.68;
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.82, roughness: 0.28 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xe2f4ff,
      transparent: true,
      opacity: 0.20,
      roughness: 0.07,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const tray = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.24, 2.2), metalMat);
    tray.position.set(0, -2.14, 0);
    raceGroup.add(tray);

    raceSlots = xs.map((x, idx) => {
      const slotGroup = new THREE.Group();
      slotGroup.position.set(x, 0, 0);
      raceGroup.add(slotGroup);

      const glass = new THREE.Mesh(new THREE.CylinderGeometry(rR + 0.05, rR + 0.05, rH + 0.5, 36, 1, true), glassMat);
      glass.position.y = 0.22;
      glass.renderOrder = 4;
      slotGroup.add(glass);

      const fMat = new THREE.MeshStandardMaterial({
        color: 0x1878c9,
        transparent: true,
        opacity: 0.4,
        roughness: 0.16,
        depthWrite: false
      });
      const fMesh = new THREE.Mesh(new THREE.CylinderGeometry(rR, rR, rH, 36), fMat);
      fMesh.renderOrder = 2;
      slotGroup.add(fMesh);

      const meniscus = createLiquidSurface(THREE, {
        material: RACE_PRESETS[state.racePreset].fluids[idx],
        width: rR * 2.1,
        depth: rR * 2.1,
        discRadius: rR - 0.01,
        segments: 48,
        y: rH * 0.5 + 0.01,
        visualScale: 0.12
      });
      meniscus.mesh.renderOrder = 3;
      slotGroup.add(meniscus.mesh);

      const sMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.88, roughness: 0.22 });
      const sMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), sMat);
      applySphereAppearance(sMesh);
      slotGroup.add(sMesh);

      const label = makeSpriteLabel();
      label.sprite.position.set(0, rH * 0.5 + 1.05, 0);
      slotGroup.add(label.sprite);

      const light = new THREE.PointLight(0xff5a1f, 0, 4.5);
      light.position.set(0, 0.2, 0.5);
      slotGroup.add(light);

      return { slotGroup, fMesh, fMat, meniscus, sMesh, label, light, rH, entered: false };
    });
  }

  function rampGroundAt(x, z) {
    // Inclined laboratory chute sloping from z = -4.8 down to z = +2.2, then flat catch basin
    const slopeZ = Math.min(z, 2.1);
    let y = (2.1 - slopeZ) * 0.27 - 0.45;
    // Slight channel concavity along center
    y += Math.min(0.18, (x * x) * 0.045);
    // Catch basin depression at bottom
    if (z > 2.1 && z < 4.35 && Math.abs(x) < 1.85) {
      y -= 0.16 * Math.sin(((z - 2.1) / 2.25) * Math.PI);
    }
    // Raised containment walls
    if (Math.abs(x) > 1.75) y += (Math.abs(x) - 1.75) * 1.45;
    if (z > 4.25) y += (z - 4.25) * 1.45;
    if (z < -4.55) y += (-4.55 - z) * 1.45;
    return y;
  }

  function buildFlowView(scene) {
    flowGroup = new THREE.Group();
    flowGroup.visible = false;
    scene.add(flowGroup);

    // Build terrain mesh matching rampGroundAt
    const cols = 30;
    const rows = 46;
    const cellSize = 0.22;
    const w = (cols - 1) * cellSize;
    const d = (rows - 1) * cellSize;
    const terrainGeo = new THREE.PlaneGeometry(w, d, cols - 1, rows - 1);
    terrainGeo.rotateX(-Math.PI / 2);
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, rampGroundAt(x, z));
    }
    terrainGeo.computeVertexNormals();
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.72,
      metalness: 0.25,
      side: THREE.DoubleSide
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    flowGroup.add(terrainMesh);

    // Spout nozzle above top of ramp
    const spoutMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.85, roughness: 0.24 });
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.75, 24), spoutMat);
    spout.position.set(0, 2.28, -4.1);
    flowGroup.add(spout);

    flowPourStream = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.14, 0.88, 20),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.78, roughness: 0.15 })
    );
    flowPourStream.position.set(0, 1.56, -4.1);
    flowGroup.add(flowPourStream);

    flowSpoutLight = new THREE.PointLight(0xff5a1f, 0, 8);
    flowSpoutLight.position.set(0, 1.4, -2.5);
    flowGroup.add(flowSpoutLight);

    // Shared LiquidEngine DepthField + createDepthFieldMesh
    depthField = LiquidEngine.createDepthField({
      material: state.fluidKey,
      cols,
      rows,
      cellSize,
      groundAt: rampGroundAt,
      fluidity: FLUIDS[state.fluidKey].fluidity,
      supply: 0.65,
      yieldDrop: 0.08,
      solidus: 0.12,
      cooling: FLUIDS[state.fluidKey].cooling,
      fixedStep: 0.05
    });
    depthField.addSource(0, -4.1, 1.2);

    depthFieldMesh = createDepthFieldMesh(THREE, depthField, {
      subdivisions: 2,
      lift: 0.025,
      threshold: 0.014,
      fluid: state.fluidKey,
      groundAt: rampGroundAt
    });
    flowGroup.add(depthFieldMesh.mesh);
  }

  function setCameraForView(view) {
    if (!sceneBundle || !controls) return;
    const { camera } = sceneBundle;
    if (view === 'tube') {
      camera.position.set(0.35, 1.25, 7.35);
      controls.target.set(0, 0.12, 0);
    } else if (view === 'race') {
      camera.position.set(0, 2.1, 10.9);
      controls.target.set(0, 0.2, 0);
    } else if (view === 'flow') {
      camera.position.set(5.4, 5.1, 7.4);
      controls.target.set(0, -0.3, 0.15);
    }
    controls.update();
  }

  function syncFluidVisuals() {
    const f = FLUIDS[state.fluidKey];
    if (tubeFluidMat) {
      tubeFluidMat.color.setHex(f.color);
      tubeFluidMat.opacity = f.opacity;
      tubeFluidMat.emissive.setHex(f.emissive);
      tubeFluidMat.emissiveIntensity = f.emissiveIntensity;
      tubeFluidMat.needsUpdate = true;
    }
    if (tubeLight) {
      tubeLight.color.setHex(f.glow);
      tubeLight.intensity = f.glowInt;
    }
    if (tubeMeniscus) {
      tubeMeniscus.setMaterial(f.key);
      tubeMeniscus.uniforms.uWaveHeight.value = f.key === 'boilingWater' ? 0.44 : (f.key === 'lava' || f.key === 'magma') ? 0.22 : f.key === 'honey' ? 0.14 : 0.28;
      tubeMeniscus.uniforms.uFlow.value = f.key === 'boilingWater' ? 1.85 : f.key === 'magma' ? 0.16 : f.key === 'honey' ? 0.3 : 1.0;
    }
    if (tubeParticlesMesh) {
      const pMat = tubeParticlesMesh.material;
      if (f.particleMode === 'boil') {
        pMat.color.setHex(0xe0f7ff);
        pMat.emissive.setHex(0x7dd3fc);
        pMat.emissiveIntensity = 0.45;
        pMat.opacity = 0.72;
      } else if (f.particleMode === 'ice') {
        pMat.color.setHex(0xe0f2fe);
        pMat.emissive.setHex(0x38bdf8);
        pMat.emissiveIntensity = 0.35;
        pMat.opacity = 0.6;
      } else if (f.particleMode === 'molten') {
        pMat.color.setHex(0xffe066);
        pMat.emissive.setHex(0xff5a1f);
        pMat.emissiveIntensity = 1.4;
        pMat.opacity = 0.85;
      } else if (f.particleMode === 'bubble') {
        pMat.color.setHex(0xfef3c7);
        pMat.emissive.setHex(0xf59e0b);
        pMat.emissiveIntensity = 0.25;
        pMat.opacity = 0.55;
      } else {
        pMat.color.setHex(0xdbeafe);
        pMat.emissive.setHex(f.glow);
        pMat.emissiveIntensity = 0.2;
        pMat.opacity = 0.42;
      }
      pMat.needsUpdate = true;
    }
    if (tubeSteamMesh) {
      tubeSteamMesh.visible = f.key === 'boilingWater';
    }
    if (depthField && depthFieldMesh) {
      depthField.fluidity = f.fluidity;
      depthField.cooling = f.cooling;
      depthField.material = LiquidEngine.material(f.key);
      depthFieldMesh.setFluidPalette(f.key);
      if (flowPourStream) {
        flowPourStream.material.color.setHex(f.color);
        flowPourStream.material.emissive.setHex(f.emissive);
        flowPourStream.material.emissiveIntensity = f.emissiveIntensity;
        flowPourStream.material.opacity = Math.max(0.55, f.opacity);
      }
      if (flowSpoutLight) {
        flowSpoutLight.color.setHex(f.glow);
        flowSpoutLight.intensity = (f.key === 'lava' || f.key === 'magma') ? 2.4 : 0.3;
      }
    }
    surface2d.setMaterial(f.key);
  }

  function syncRaceVisuals() {
    const keys = RACE_PRESETS[state.racePreset].fluids;
    raceSlots.forEach((slot, i) => {
      const f = FLUIDS[keys[i]];
      const col = raceColumns[i];
      col.configure({
        fluid: f.key,
        eta: f.eta,
        fluidDensity: f.rho,
        sphereDensity: SPHERE_MATERIALS[state.matKey].rho,
        radius: state.radiusMm * 0.001,
        columnHeight: COLUMN_HEIGHT_M
      });
      slot.fMat.color.setHex(f.color);
      slot.fMat.opacity = f.opacity;
      slot.fMat.emissive.setHex(f.emissive);
      slot.fMat.emissiveIntensity = f.emissiveIntensity;
      slot.fMat.needsUpdate = true;
      slot.light.color.setHex(f.glow);
      slot.light.intensity = (f.key === 'lava' || f.key === 'magma') ? 1.8 : 0;
      slot.meniscus.setMaterial(f.key);
      slot.meniscus.uniforms.uWaveHeight.value = f.key === 'boilingWater' ? 0.36 : (f.key === 'lava' || f.key === 'magma') ? 0.18 : f.key === 'honey' ? 0.10 : 0.22;
      slot.meniscus.uniforms.uFlow.value = f.key === 'boilingWater' ? 1.85 : f.key === 'magma' ? 0.16 : f.key === 'honey' ? 0.3 : 1.0;
      applySphereAppearance(slot.sMesh);
      const r3d = visualSphereRadius3D(0.76);
      slot.sMesh.scale.setScalar(r3d);
    });
  }

  function computeAutoTimeScale(fallSeconds) {
    if (!Number.isFinite(fallSeconds) || fallSeconds <= 0) return 1;
    if (fallSeconds < 0.5) return Math.min(0.4, Math.max(0.00025, fallSeconds / 2.2));
    if (fallSeconds <= 7.0) return 1;
    return Math.min(4500, Math.max(1, fallSeconds / 4.2));
  }

  function getActiveTimeScale() {
    if (state.timeMode !== 'auto') return Number(state.timeMode) || 1;
    if (state.view === 'race') {
      const remaining = raceColumns
        .filter((c) => !c.done && !c.metrics.floats && c.metrics.vt > 0)
        .map((c) => Math.max(0.0005, (c.columnHeight - c.depth) / c.metrics.vt));
      if (!remaining.length) return 1;
      const minLeft = Math.min(...remaining);
      return computeAutoTimeScale(minLeft);
    }
    return computeAutoTimeScale(column.metrics.fallTime);
  }

  function syncTubePositions() {
    const r3d = visualSphereRadius3D(1);
    if (tubeSphere) {
      tubeSphere.scale.setScalar(r3d);
      if (state.floated) {
        const bob = Math.sin(performance.now() * 0.004) * 0.035;
        tubeSphere.position.set(0, TUBE_TOP_Y + r3d * 0.22 + bob, 0);
      } else if (!state.running && !state.done) {
        tubeSphere.position.set(0, TUBE_TOP_Y + state.hoverOffset + r3d, 0);
      } else {
        const frac = column.progress();
        const minY = TUBE_BOT_Y + r3d;
        const maxY = TUBE_TOP_Y - r3d * 0.1;
        const y = maxY - frac * (maxY - minY);
        tubeSphere.position.set(0, y, 0);
      }
    }

    if (tubeForceGroup && tubeSphere) {
      tubeForceGroup.visible = state.showVectors;
      tubeForceGroup.position.copy(tubeSphere.position);
      const fg = column.metrics.fg || 1;
      const fbRatio = column.metrics.fb / fg;
      const fdRatio = column.dragForce() / fg;
      arrowFg.setLength(0.95, -1);
      arrowFb.setLength(0.95 * fbRatio, 1);
      arrowFd.setLength(state.running ? 0.95 * fdRatio : 0, 1);
    }

    if (tubeWakeRings && tubeSphere) {
      const moving = state.running && !state.floated && column.velocity > 0.00001;
      tubeWakeRings.forEach((w, i) => {
        w.mesh.visible = moving;
        if (!moving) return;
        w.mesh.position.set(0, Math.min(TUBE_TOP_Y - 0.05, tubeSphere.position.y + r3d * (1.2 + i * 1.1)), 0);
        const s = (0.7 + i * 0.25) * (r3d / 0.18);
        w.mesh.scale.setScalar(s);
        w.mat.opacity = Math.max(0.04, 0.26 - i * 0.07);
      });
    }
  }

  function syncRacePositions() {
    const r3d = visualSphereRadius3D(0.76);
    const keys = RACE_PRESETS[state.racePreset].fluids;
    raceSlots.forEach((slot, i) => {
      const col = raceColumns[i];
      const f = FLUIDS[keys[i]];
      const topY = slot.rH * 0.5;
      const botY = -slot.rH * 0.5;
      if (col.floated) {
        const bob = Math.sin(performance.now() * 0.004 + i) * 0.025;
        slot.sMesh.position.set(0, topY + r3d * 0.2 + bob, 0);
      } else if (!state.running && !state.done) {
        slot.sMesh.position.set(0, topY + 0.28 + r3d, 0);
      } else {
        const frac = col.progress();
        const minY = botY + r3d;
        const maxY = topY - r3d * 0.1;
        slot.sMesh.position.set(0, maxY - frac * (maxY - minY), 0);
      }

      let statusText = `Ready · η ${f.eta < 0.01 ? f.eta.toFixed(4) : f.eta} Pa·s`;
      if (col.floated || col.metrics.floats) {
        statusText = `Floats (ρs ≤ ${f.rho})`;
      } else if (col.done) {
        statusText = `Done · t = ${formatDuration(col.elapsed)}`;
      } else if (state.running) {
        statusText = `t = ${formatDuration(col.elapsed)} · ${formatVelocity(col.velocity)}`;
      }
      slot.label.setText(f.short, `${f.tempC}°C · ρ ${f.rho}`, statusText, f.accent);
    });
  }

  function updateReadouts() {
    const m = column.metrics;
    const vtEl = document.getElementById('vis-r-vt');
    const etaEl = document.getElementById('vis-r-eta');
    const timeEl = document.getElementById('vis-r-time');
    const reEl = document.getElementById('vis-r-re');
    if (vtEl) vtEl.textContent = m.floats ? '0 (Floats)' : formatVelocity(m.vt);
    if (etaEl) etaEl.textContent = formatViscosity(m.eta);
    if (timeEl) {
      if (state.floated || m.floats) timeEl.textContent = 'Floats';
      else if (state.running || state.done) timeEl.textContent = formatDuration(column.elapsed);
      else timeEl.textContent = formatDuration(m.fallTime);
    }
    if (reEl) reEl.textContent = m.floats ? '—' : formatReynolds(m.reynolds);

    if (floatBadgeEl) {
      if (m.floats) {
        floatBadgeEl.hidden = false;
        floatBadgeEl.textContent = `Floats! ${SPHERE_MATERIALS[state.matKey].name} (ρ=${m.sphereDensity} kg/m³) ≤ ${FLUIDS[state.fluidKey].short} (ρ=${m.fluidDensity} kg/m³)`;
      } else {
        floatBadgeEl.hidden = true;
      }
    }

    if (hudEl) {
      const f = FLUIDS[state.fluidKey];
      const scaleText = state.timeMode === 'auto'
        ? `Auto ${formatMultiplier(state.activeTimeScale)}`
        : `${formatMultiplier(state.activeTimeScale)}`;
      if (state.view === 'flow') {
        hudEl.textContent = `${f.name} · Inclined DepthField · ${state.pouring ? 'Pouring' : 'Paused'} · Drag to orbit`;
      } else if (state.view === 'race') {
        hudEl.textContent = `4-Fluid Race (${RACE_PRESETS[state.racePreset].label}) · Speed ${scaleText} · Drag to orbit`;
      } else {
        const vNow = state.running
          ? (column.metrics.floats ? ' · Floats' : state.hoverOffset > 0 ? ' · Releasing…' : ` · v = ${formatVelocity(column.velocity)}`)
          : '';
        hudEl.textContent = `${f.name} · Speed ${scaleText}${vNow} · Drag to orbit`;
      }
    }
  }

  // ── 2D Schematic & v(t) Graph Renderer ─────────────────────────
  const canvas2dKit = SimKit?.canvas2d ? SimKit.canvas2d(canvas2d, { height: 420 }) : null;

  function draw2D() {
    const ctx = canvas2dKit ? canvas2dKit.ctx : canvas2d.getContext('2d');
    const W = canvas2dKit ? canvas2dKit.width : (canvas2d.width = canvas2d.clientWidth || 680);
    const H = canvas2dKit ? canvas2dKit.height : (canvas2d.height = 420);
    if (!ctx || W < 10 || H < 10) return;

    const isDark = document.documentElement.getAttribute('data-lighting') === 'night' ||
      document.documentElement.getAttribute('data-theme') === 'vaporwave' ||
      document.documentElement.getAttribute('data-theme') === 'bark' ||
      document.documentElement.getAttribute('data-theme') === 'lavalamp' ||
      document.documentElement.getAttribute('data-theme') === 'mandelbrot';
    const bg = isDark ? '#141923' : '#f7f9fc';
    const textCol = isDark ? 'rgba(241,245,249,0.88)' : '#1e293b';
    const mutedCol = isDark ? 'rgba(148,163,184,0.85)' : '#64748b';
    const gridCol = isDark ? 'rgba(148,163,184,0.16)' : 'rgba(15,23,42,0.1)';

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const f = FLUIDS[state.fluidKey];
    const m = SPHERE_MATERIALS[state.matKey];
    const colW = Math.min(130, W * 0.24);
    const colX = Math.max(66, W * 0.18 - colW * 0.5);
    const colTop = 58;
    const colH = H - 102;
    const colBot = colTop + colH;

    // Configure shared 1D LiquidEngine surface across column width
    surface2d.configure(colW, 18, 44);
    ctx.save();
    ctx.translate(colX, colTop - 18);
    LiquidEngine.drawSurface(ctx, surface2d, {
      width: colW,
      bottom: colH + 18,
      phase: performance.now() * 0.002,
      color: f.canvasColor,
      caustics: true,
      reflection: true,
      foam: f.key === 'boilingWater' || f.key === 'water',
      causticsOpacity: 0.12
    });
    ctx.restore();

    // Glass wall border
    ctx.strokeStyle = isDark ? 'rgba(226,232,240,0.35)' : 'rgba(15,23,42,0.28)';
    ctx.lineWidth = 2;
    ctx.strokeRect(colX, colTop - 14, colW, colH + 14);

    // Ruler ticks (0 cm .. 50 cm)
    ctx.fillStyle = mutedCol;
    ctx.font = '600 10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 5; i += 1) {
      const py = colTop + (i / 5) * colH;
      ctx.fillRect(colX - 8, py, 7, 1.5);
      ctx.fillText(`${i * 10} cm`, colX - 12, py);
    }

    // Column title
    ctx.fillStyle = textCol;
    ctx.font = '700 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.name, colX + colW * 0.5, 24);

    // Sphere
    const rPx = Math.max(6, Math.min(18, 5 + state.radiusMm * 1.6));
    const sx = colX + colW * 0.5;
    let sy = colTop - 18 - rPx;
    if (state.floated) sy = colTop + 2;
    else if (state.running || state.done) sy = colTop + rPx + column.progress() * (colH - rPx * 2);

    ctx.beginPath();
    ctx.arc(sx, sy, rPx, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(sx - rPx * 0.3, sy - rPx * 0.3, rPx * 0.1, sx, sy, rPx);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, m.hex);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Right half: v(t) vs t convergence graph
    const gx = Math.max(colX + colW + 46, W * 0.46);
    const gw = W - gx - 28;
    const gy = 58;
    const gh = colH - 20;

    if (gw > 120) {
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)';
      ctx.strokeStyle = gridCol;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(gx, gy, gw, gh, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = textCol;
      ctx.font = '700 12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Velocity v(t) toward Terminal Velocity vₜ', gx, 24);

      const vt = Math.max(1e-7, column.metrics.vt);
      const maxT = Math.max(0.002, Number.isFinite(column.metrics.fallTime) ? column.metrics.fallTime : 1, column.elapsed);
      const padL = 16;
      const padR = 16;
      const padT = 28;
      const padB = 34;
      const px0 = gx + padL;
      const py0 = gy + padT;
      const pw = gw - padL - padR;
      const ph = gh - padT - padB;

      // Dashed vt line
      const vtY = py0 + ph * 0.18;
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = f.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px0, vtY);
      ctx.lineTo(px0 + pw, vtY);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = f.accent;
      ctx.font = '700 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(column.metrics.floats ? 'Floats (vₜ ≤ 0)' : `vₜ = ${formatVelocity(column.metrics.vt)}`, px0 + pw, vtY - 10);

      // Axes
      ctx.strokeStyle = mutedCol;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(px0, py0);
      ctx.lineTo(px0, py0 + ph);
      ctx.lineTo(px0 + pw, py0 + ph);
      ctx.stroke();

      // Plot v(t) samples
      if (!column.metrics.floats && state.velocityHistory.length > 1) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        state.velocityHistory.forEach((pt, idx) => {
          const tx = px0 + Math.min(1, pt.t / maxT) * pw;
          const vy = py0 + ph - Math.min(1.1, pt.v / vt) * (ph * 0.82);
          if (idx === 0) ctx.moveTo(tx, vy);
          else ctx.lineTo(tx, vy);
        });
        ctx.stroke();
      }

      // Force summary bar inside graph footer
      const fg = column.metrics.fg || 1;
      const fbFrac = Math.min(1, column.metrics.fb / fg);
      const fdFrac = Math.min(1, column.dragForce() / fg);
      ctx.fillStyle = mutedCol;
      ctx.font = '600 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Force Balance:  Buoyancy ${(fbFrac * 100).toFixed(1)}%  +  Drag ${(fdFrac * 100).toFixed(1)}%  =  ${((fbFrac + fdFrac) * 100).toFixed(1)}% of Weight Fg`, px0, gy + gh - 12);
    }
  }

  // ── Simulation Step & Render Loop ──────────────────────────────
  function stepParticles(dt, clock) {
    const f = FLUIDS[state.fluidKey];
    if (!tubeParticlesMesh) return;

    const r3d = visualSphereRadius3D(1);
    const sx = tubeSphere ? tubeSphere.position.x : 0;
    const sy = tubeSphere ? tubeSphere.position.y : 99;
    const sz = tubeSphere ? tubeSphere.position.z : 0;

    for (let i = 0; i < particleStates.length; i += 1) {
      const p = particleStates[i];
      if (f.particleMode === 'boil') {
        p.y += (0.85 + p.vy * 1.45) * dt;
        p.x += Math.sin(clock * 5.2 + p.phase) * 0.25 * dt;
        p.z += Math.cos(clock * 4.7 + p.phase) * 0.25 * dt;
        if (p.y > TUBE_TOP_Y - 0.04) {
          p.y = TUBE_BOT_Y + 0.06 + Math.random() * 0.3;
          const ang = Math.random() * Math.PI * 2;
          const rad = Math.sqrt(Math.random()) * (TUBE_R - 0.14);
          p.x = Math.cos(ang) * rad;
          p.z = Math.sin(ang) * rad;
        }
      } else if (f.particleMode === 'ice') {
        p.y += Math.sin(clock * 0.7 + p.phase) * 0.06 * dt;
        p.x += Math.cos(clock * 0.5 + p.phase) * 0.04 * dt;
      } else if (f.particleMode === 'molten') {
        const rate = f.key === 'lava' ? 0.16 : 0.04;
        p.y += (0.15 + p.vy) * rate * dt;
        if (p.y > TUBE_TOP_Y - 0.06) p.y = TUBE_BOT_Y + 0.08;
      } else if (f.particleMode === 'bubble') {
        p.y += (0.04 + p.vy * 0.06) * dt;
        if (p.y > TUBE_TOP_Y - 0.05) p.y = TUBE_BOT_Y + 0.08;
      } else {
        p.y += (0.06 + p.vy * 0.14) * dt;
        if (p.y > TUBE_TOP_Y - 0.05) p.y = TUBE_BOT_Y + 0.08;
      }

      // Gentle wake repulsion from falling sphere
      const dx = p.x - sx;
      const dy = p.y - sy;
      const dz = p.z - sz;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 0.001 && dist < r3d + 0.18 && state.running) {
        const push = (r3d + 0.18 - dist) * 0.6;
        p.x += (dx / dist) * push * dt * 10;
        p.z += (dz / dist) * push * dt * 10;
      }

      const radial = Math.hypot(p.x, p.z);
      if (radial > TUBE_R - 0.1) {
        p.x *= (TUBE_R - 0.12) / radial;
        p.z *= (TUBE_R - 0.12) / radial;
      }

      particleDummy.position.set(p.x, p.y, p.z);
      const s = f.particleMode === 'boil'
        ? p.scale * (0.75 + 0.6 * ((p.y - TUBE_BOT_Y) / TUBE_H))
        : p.scale * 0.72;
      particleDummy.scale.setScalar(s);
      particleDummy.updateMatrix();
      tubeParticlesMesh.setMatrixAt(i, particleDummy.matrix);
    }
    tubeParticlesMesh.instanceMatrix.needsUpdate = true;

    if (tubeSteamMesh && tubeSteamMesh.visible) {
      for (let i = 0; i < steamStates.length; i += 1) {
        const s = steamStates[i];
        s.life += dt * s.speed * 0.45;
        if (s.life >= 1) {
          s.life = 0;
          s.x = (Math.random() - 0.5) * 1.1;
          s.z = (Math.random() - 0.5) * 1.1;
        }
        particleDummy.position.set(
          s.x + Math.sin(clock * 2 + i) * 0.12,
          TUBE_TOP_Y + 0.1 + s.life * 1.8,
          s.z + Math.cos(clock * 1.7 + i) * 0.12
        );
        const scale = Math.sin(s.life * Math.PI) * 1.3;
        particleDummy.scale.setScalar(Math.max(0.01, scale));
        particleDummy.updateMatrix();
        tubeSteamMesh.setMatrixAt(i, particleDummy.matrix);
      }
      tubeSteamMesh.instanceMatrix.needsUpdate = true;
    }
  }

  let lastTs = performance.now();
  const stageWrap = canvas3d.parentElement || canvas3d;
  function animate(now) {
    SimKit.frame(stageWrap, animate);
    const realDt = Math.min(0.05, Math.max(0, (now - lastTs) / 1000));
    lastTs = now;
    const clock = now * 0.001;

    state.activeTimeScale = getActiveTimeScale();

    if (state.view === 'tube' || state.view === '2d') {
      if (state.running) {
        if (state.hoverOffset > 0 && !state.floated) {
          state.hoverOffset = Math.max(0, state.hoverOffset - realDt * 1.8);
          if (state.hoverOffset === 0 && !state.enteredFluid) {
            state.enteredFluid = true;
            if (tubeMeniscus) tubeMeniscus.impulse(column.metrics.floats ? 0.5 : 1.0, 0, 0);
            surface2d.impulse(surface2d.width * 0.5, 22, 24);
          }
        } else {
          const physDt = realDt * state.activeTimeScale;
          column.step(physDt);
          if (column.floated) {
            state.floated = true;
            state.running = false;
            state.done = true;
          } else if (column.done) {
            state.running = false;
            state.done = true;
          }
          if (column.elapsed - state.lastHistoryT > Math.max(0.0001, state.activeTimeScale * 0.03) || column.done) {
            state.velocityHistory.push({ t: column.elapsed, v: column.velocity });
            if (state.velocityHistory.length > 240) state.velocityHistory.shift();
            state.lastHistoryT = column.elapsed;
          }
        }
      }
      if (tubeMeniscus) tubeMeniscus.update(realDt);
      surface2d.update(realDt);
      stepParticles(realDt, clock);
      syncTubePositions();
    } else if (state.view === 'race') {
      if (state.running) {
        const physDt = realDt * state.activeTimeScale;
        let allDone = true;
        raceColumns.forEach((col, i) => {
          if (!col.done) {
            if (!raceSlots[i].entered) {
              raceSlots[i].entered = true;
              raceSlots[i].meniscus.impulse(0.85, 0, 0);
            }
            col.step(physDt);
          }
          if (!col.done) allDone = false;
        });
        if (allDone) {
          state.running = false;
          state.done = true;
        }
      }
      raceSlots.forEach((slot) => slot.meniscus.update(realDt));
      syncRacePositions();
    } else if (state.view === 'flow') {
      if (depthField && depthFieldMesh) {
        if (state.pouring) {
          const steps = depthField.update(realDt * 2.2);
          if (steps > 0) depthFieldMesh.sync();
        }
        depthFieldMesh.update(realDt);
        if (flowPourStream) flowPourStream.visible = state.pouring;
      }
    }

    updateReadouts();

    if (state.view === '2d' || !state.webglReady) {
      draw2D();
    } else if (sceneBundle) {
      sceneBundle.syncSize();
      controls.update();
      sceneBundle.renderer.render(sceneBundle.scene, sceneBundle.camera);
    }
  }

  // ── Public Controls & Event Wiring ─────────────────────────────
  function syncUI() {
    document.querySelectorAll('[data-fluid]').forEach((btn) => {
      const active = btn.dataset.fluid === state.fluidKey;
      btn.classList.toggle('selected', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-mat]').forEach((btn) => {
      const active = btn.dataset.mat === state.matKey;
      btn.classList.toggle('selected', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-vis-view]').forEach((btn) => {
      const active = btn.dataset.visView === state.view;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    radiusSliders.forEach((slider) => {
      if (Number(slider.value) !== state.radiusMm) slider.value = String(state.radiusMm);
    });
    radiusLabels.forEach((label) => {
      label.textContent = `${state.radiusMm} mm`;
    });
    if (raceControlsBar) raceControlsBar.hidden = state.view !== 'race';
    if (flowControlsBar) flowControlsBar.hidden = state.view !== 'flow';

    const show2d = state.view === '2d' || !state.webglReady;
    canvas3d.hidden = show2d;
    canvas2d.hidden = !show2d;
    if (fallbackEl) fallbackEl.hidden = state.webglReady;

    if (tubeGroup) tubeGroup.visible = state.view === 'tube';
    if (raceGroup) raceGroup.visible = state.view === 'race';
    if (flowGroup) flowGroup.visible = state.view === 'flow';

    const dropLabel = state.view === 'flow'
      ? (state.pouring ? 'Pause Pour' : 'Pour Fluid')
      : (state.view === 'race' ? 'Drop All 4 Spheres' : 'Drop Sphere');
    if (dropBtnMain) dropBtnMain.textContent = dropLabel;
    if (dropBtnSide) dropBtnSide.textContent = dropLabel;
  }

  function resetSim() {
    state.running = false;
    state.done = false;
    state.floated = false;
    state.enteredFluid = false;
    state.hoverOffset = 0.34;
    state.velocityHistory = [{ t: 0, v: 0 }];
    state.lastHistoryT = 0;

    const f = FLUIDS[state.fluidKey];
    const m = SPHERE_MATERIALS[state.matKey];
    column.configure({
      fluid: f.key,
      eta: f.eta,
      fluidDensity: f.rho,
      sphereDensity: m.rho,
      radius: state.radiusMm * 0.001,
      columnHeight: COLUMN_HEIGHT_M
    }).reset();

    raceColumns.forEach((col) => {
      col.configure({
        sphereDensity: m.rho,
        radius: state.radiusMm * 0.001,
        columnHeight: COLUMN_HEIGHT_M
      }).reset();
    });
    raceSlots.forEach((s) => { s.entered = false; });

    if (tubeSphere) applySphereAppearance(tubeSphere);
    syncFluidVisuals();
    syncRaceVisuals();
    syncTubePositions();
    syncRacePositions();
    syncUI();
    updateReadouts();
    if (state.view === '2d' || !state.webglReady) draw2D();
  }

  function dropSim() {
    if (state.view === 'flow') {
      state.pouring = !state.pouring;
      syncUI();
      updateReadouts();
      return;
    }
    if (state.done || state.floated) resetSim();
    if (state.running) return;
    state.running = true;
    state.done = false;
    state.floated = false;
    state.velocityHistory = [{ t: 0, v: 0 }];
    state.lastHistoryT = 0;
    if (column.metrics.floats && state.view !== 'race') {
      state.enteredFluid = true;
      state.floated = true;
      state.running = false;
      state.done = true;
      if (tubeMeniscus) tubeMeniscus.impulse(0.6, 0, 0);
      surface2d.impulse(surface2d.width * 0.5, 14, 22);
    }
    updateReadouts();
  }

  function setFluid(key) {
    if (!FLUIDS[key]) return;
    state.fluidKey = key;
    if (depthField && state.view === 'flow') {
      depthField.reset();
    }
    resetSim();
  }

  function setMat(key) {
    if (!SPHERE_MATERIALS[key]) return;
    state.matKey = key;
    resetSim();
  }

  function setView(view) {
    if (!['tube', 'race', 'flow', '2d'].includes(view)) return;
    state.view = view;
    if (view === 'flow') {
      state.pouring = true;
      if (depthField && depthFieldMesh) {
        depthField.reset();
        depthField.fluidity = FLUIDS[state.fluidKey].fluidity;
        depthField.cooling = FLUIDS[state.fluidKey].cooling;
        depthFieldMesh.setFluidPalette(state.fluidKey);
        depthFieldMesh.sync();
      }
    }
    setCameraForView(view);
    syncUI();
    updateReadouts();
    if (view === '2d' && canvas2dKit) canvas2dKit.resize();
  }

  // Expose compatibility globals
  window.visSetFluid = setFluid;
  window.visSetMat = setMat;
  window.visDrop = dropSim;
  window.visReset = () => {
    if (state.view === 'flow' && depthField && depthFieldMesh) {
      depthField.reset();
      depthFieldMesh.sync();
      state.pouring = true;
    }
    resetSim();
  };
  window.visSetView = setView;

  // Bind UI elements
  document.querySelectorAll('[data-fluid]').forEach((btn) => {
    btn.addEventListener('click', () => setFluid(btn.dataset.fluid));
  });
  document.querySelectorAll('[data-mat]').forEach((btn) => {
    btn.addEventListener('click', () => setMat(btn.dataset.mat));
  });
  document.querySelectorAll('[data-vis-view]').forEach((btn) => {
    btn.addEventListener('click', () => setView(btn.dataset.visView));
  });
  radiusSliders.forEach((slider) => {
    slider.addEventListener('input', () => {
      state.radiusMm = parseInt(slider.value, 10) || 3;
      resetSim();
    });
  });
  if (timeScaleSelect) {
    timeScaleSelect.addEventListener('change', () => {
      state.timeMode = timeScaleSelect.value;
      updateReadouts();
    });
  }
  if (vectorsToggle) {
    vectorsToggle.addEventListener('change', () => {
      state.showVectors = vectorsToggle.checked;
      syncTubePositions();
    });
  }
  if (raceSelect) {
    raceSelect.addEventListener('change', () => {
      if (!RACE_PRESETS[raceSelect.value]) return;
      state.racePreset = raceSelect.value;
      resetSim();
    });
  }

  document.getElementById('vis-drop-main')?.addEventListener('click', () => window.visDrop());
  document.getElementById('vis-drop-side')?.addEventListener('click', () => window.visDrop());
  document.getElementById('vis-reset-main')?.addEventListener('click', () => window.visReset());
  document.getElementById('vis-reset-side')?.addEventListener('click', () => window.visReset());

  document.getElementById('vis-flow-reset')?.addEventListener('click', () => {
    if (depthField && depthFieldMesh) {
      depthField.reset();
      depthFieldMesh.sync();
      state.pouring = true;
      syncUI();
      updateReadouts();
    }
  });

  document.addEventListener('creation-app-resize', () => {
    if (sceneBundle) sceneBundle.syncSize();
    if (canvas2dKit) canvas2dKit.resize();
  });

  // Boot 3D scene
  state.webglReady = init3D();
  if (!state.webglReady) {
    state.view = '2d';
  }
  resetSim();
  SimKit.frame(stageWrap, animate);
}

initViscosimeter();
