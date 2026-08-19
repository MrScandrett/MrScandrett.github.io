import * as THREE from "three";

function hasWebGL() {
  try {
    const probe = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (probe.getContext("webgl") || probe.getContext("experimental-webgl")));
  } catch (e) {
    return false;
  }
}

const canvas = document.getElementById("game");
const stageEl = document.getElementById("stage");
const flashEl = document.getElementById("flash");
const bootOverlay = document.getElementById("bootOverlay");
const startBtn = document.getElementById("startBtn");
const muteBtn = document.getElementById("muteBtn");
const promptEl = document.getElementById("prompt");
const statScoreEl = document.getElementById("stat-score");
const comboEl = document.getElementById("combo");
const statComboEl = document.getElementById("stat-combo");
const buffFlyEl = document.getElementById("buff-fly");
const buffFlyBarEl = document.getElementById("buff-fly-bar");
const buffDirtyEl = document.getElementById("buff-dirty");
const shopOverlay = document.getElementById("shopOverlay");
const shopCloseBtn = document.getElementById("shopCloseBtn");
const shopLineEl = document.getElementById("shopLine");
const shopBalanceEl = document.getElementById("shopBalance");
const panelUpgradesEl = document.getElementById("panel-upgrades");
const panelCosmeticsEl = document.getElementById("panel-cosmetics");

if (!hasWebGL()) {
  bootOverlay.querySelector(".boot-card").innerHTML =
    '<h2>No WebGL here</h2><p>Bark Park needs WebGL 3D support, which this browser or device does not have available right now.</p>';
} else {
  runGame();
}

function runGame() {
  // ------------------------------------------------------------ constants
  const PARK_HALF = 34;
  const GRAVITY = -20;
  const FRISBEE_GRAVITY = -4.4;
  const OWNER_POS = new THREE.Vector3(-25, 0, -24);
  const INTERACT_RADIUS = 3.3;
  const BEE_HOME = new THREE.Vector3(22, 0, 18);
  const SAVE_KEY = "barkpark_save_v1";

  const COATS = [
    { id: "golden", label: "Golden", color: "#c88a4a", price: 0 },
    { id: "choco", label: "Choc", color: "#6b4326", price: 40 },
    { id: "black", label: "Midnight", color: "#2b2b2e", price: 40 },
    { id: "cream", label: "Snow", color: "#f2ecd8", price: 40 },
    { id: "blue", label: "Heeler", color: "#4a6fa5", price: 60 },
    { id: "pink", label: "Bubblegum", color: "#e888c2", price: 80 },
  ];
  const BANDANAS = [
    { id: "none", label: "None", color: "#e5e5e5", price: 0 },
    { id: "red", label: "Red", color: "#e2453c", price: 15 },
    { id: "blue", label: "Blue", color: "#3c78e2", price: 15 },
    { id: "purple", label: "Purple", color: "#9a4ce2", price: 15 },
    { id: "yellow", label: "Yellow", color: "#e2c53c", price: 15 },
  ];
  const HATS = [
    { id: "none", label: "None", color: "#e5e5e5", price: 0 },
    { id: "cap", label: "Cap", color: "#c0392b", price: 40 },
    { id: "party", label: "Party", color: "#d6539e", price: 50 },
  ];
  const UPGRADES = {
    speed: { label: "Zoomies", desc: "+8% run speed per level", max: 5, baseCost: 20, costStep: 1.55, mul: (l) => 1 + 0.08 * l },
    jump: { label: "Springy Legs", desc: "+10% jump height per level", max: 5, baseCost: 20, costStep: 1.55, mul: (l) => 1 + 0.1 * l },
    catch: { label: "Big Mouth", desc: "+catch range per level", max: 4, baseCost: 25, costStep: 1.6, mul: (l) => 1 + 0.22 * l },
    bark: { label: "Loud Bark", desc: "+bark range & push per level", max: 4, baseCost: 25, costStep: 1.6, mul: (l) => 1 + 0.28 * l },
  };
  const FRISBEE_TIERS = [
    { id: "easy", color: 0x53c95b, points: 10, flightTime: 3.0, radius: 0.42, weight: 45 },
    { id: "medium", color: 0xe8c53c, points: 25, flightTime: 2.2, radius: 0.4, weight: 32 },
    { id: "hard", color: 0xe2453c, points: 50, flightTime: 1.5, radius: 0.38, weight: 18 },
    { id: "rare", color: 0xb060f0, points: 100, flightTime: 1.9, radius: 0.36, weight: 5, wobble: true },
  ];
  const OWNER_LINES = [
    "Hey pup! Spend your treats on upgrades or a new look.",
    "Lookin' good today! Want an upgrade?",
    "Fresh gear just for you. Take a look!",
    "Good dog! Let's see what you can afford.",
  ];

  // ------------------------------------------------------------- helpers
  function rand(min, max) { return min + Math.random() * (max - min); }
  function weightedPick(list) {
    const total = list.reduce((s, i) => s + i.weight, 0);
    let r = Math.random() * total;
    for (const item of list) { if (r < item.weight) return item; r -= item.weight; }
    return list[list.length - 1];
  }
  function randomParkPoint(margin) {
    return new THREE.Vector3(rand(-PARK_HALF + margin, PARK_HALF - margin), 0, rand(-PARK_HALF + margin, PARK_HALF - margin));
  }
  function dampAngle(current, target, lambda, dt) {
    let diff = target - current;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    return current + diff * Math.min(1, lambda * dt);
  }
  function clampToBounds(pos) {
    const m = PARK_HALF - 1.5;
    pos.x = THREE.MathUtils.clamp(pos.x, -m, m);
    pos.z = THREE.MathUtils.clamp(pos.z, -m, m);
  }
  function shade(hex, amt) {
    const c = new THREE.Color(hex);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    hsl.l = THREE.MathUtils.clamp(hsl.l + amt, 0, 1);
    c.setHSL(hsl.h, hsl.s, hsl.l);
    return c;
  }
  function upgradeCost(def, level) { return Math.round(def.baseCost * Math.pow(def.costStep, level)); }

  // ---------------------------------------------------------------- save
  function defaultSave() {
    return {
      treats: 0,
      levels: { speed: 0, jump: 0, catch: 0, bark: 0 },
      unlocked: { coat: ["golden"], bandana: ["none"], hat: ["none"] },
      equipped: { coat: "golden", bandana: "none", hat: "none" },
    };
  }
  function loadSave() {
    const def = defaultSave();
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return def;
      const p = JSON.parse(raw);
      return {
        treats: typeof p.treats === "number" ? p.treats : 0,
        levels: { ...def.levels, ...(p.levels || {}) },
        unlocked: {
          coat: Array.isArray(p.unlocked && p.unlocked.coat) ? p.unlocked.coat : def.unlocked.coat,
          bandana: Array.isArray(p.unlocked && p.unlocked.bandana) ? p.unlocked.bandana : def.unlocked.bandana,
          hat: Array.isArray(p.unlocked && p.unlocked.hat) ? p.unlocked.hat : def.unlocked.hat,
        },
        equipped: { ...def.equipped, ...(p.equipped || {}) },
      };
    } catch (e) { return def; }
  }
  function persistSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage unavailable */ }
  }
  const save = loadSave();

  // -------------------------------------------------------------- audio
  class SoundEngine {
    constructor() { this.ctx = null; this.master = null; this.muted = false; this.ambientStarted = false; this.flyOsc = null; this.flyGain = null; }
    ensure() {
      if (this.ctx) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.7;
      this.master.connect(this.ctx.destination);
    }
    resume() { this.ensure(); if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); }
    setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.7; }
    tone({ freq = 440, duration = 0.2, type = "sine", gain = 0.25, glideTo = null, delay = 0 }) {
      if (!this.ctx || this.muted) return;
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (glideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t0 + duration);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(g); g.connect(this.master);
      osc.start(t0); osc.stop(t0 + duration + 0.02);
    }
    noiseBurst({ duration = 0.25, gain = 0.3, filterFreq = 1200, filterType = "bandpass", q = 1 }) {
      if (!this.ctx || this.muted) return;
      const t0 = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      const src = this.ctx.createBufferSource(); src.buffer = buffer;
      const filt = this.ctx.createBiquadFilter(); filt.type = filterType; filt.frequency.value = filterFreq; filt.Q.value = q;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(gain, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      src.connect(filt); filt.connect(g); g.connect(this.master);
      src.start(t0);
    }
    bark() { this.noiseBurst({ duration: 0.12, gain: 0.5, filterFreq: 900, q: 0.7 }); this.tone({ freq: 220, duration: 0.14, type: "square", gain: 0.18, glideTo: 140 }); }
    catchSound(tierId) {
      const base = tierId === "rare" ? 880 : tierId === "hard" ? 740 : tierId === "medium" ? 600 : 520;
      this.tone({ freq: base, duration: 0.18, type: "triangle", gain: 0.28, glideTo: base * 1.5 });
      this.tone({ freq: base * 1.5, duration: 0.22, type: "sine", gain: 0.16, delay: 0.05, glideTo: base * 2 });
    }
    squelch() { this.noiseBurst({ duration: 0.3, gain: 0.35, filterFreq: 400, filterType: "lowpass", q: 0.6 }); }
    sting() { this.tone({ freq: 1400, duration: 0.1, type: "sawtooth", gain: 0.2, glideTo: 200 }); }
    steal() { this.tone({ freq: 300, duration: 0.15, type: "square", gain: 0.15, glideTo: 180 }); }
    yelp() { this.tone({ freq: 500, duration: 0.09, type: "sawtooth", gain: 0.16, glideTo: 900 }); }
    nectar() { this.tone({ freq: 900, duration: 0.12, type: "sine", gain: 0.2, glideTo: 1500 }); }
    purchase() { this.tone({ freq: 520, duration: 0.1, type: "triangle", gain: 0.22, glideTo: 780 }); this.tone({ freq: 780, duration: 0.14, type: "triangle", gain: 0.18, delay: 0.08 }); }
    uiClick() { this.tone({ freq: 440, duration: 0.06, type: "square", gain: 0.12 }); }
    jump() { this.tone({ freq: 300, duration: 0.08, type: "square", gain: 0.1, glideTo: 500 }); }
    buzz() { this.tone({ freq: 220, duration: 0.15, type: "sawtooth", gain: 0.05, glideTo: 260 }); }
    footstep() { this.noiseBurst({ duration: 0.06, gain: 0.1, filterFreq: 220, filterType: "lowpass", q: 0.5 }); }
    startAmbient() {
      if (this.ambientStarted || !this.ctx) return;
      this.ambientStarted = true;
      const dur = 4;
      const bufferSize = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < bufferSize; i++) { const white = Math.random() * 2 - 1; last = (last + 0.02 * white) / 1.02; data[i] = last * 3.2; }
      const src = this.ctx.createBufferSource(); src.buffer = buffer; src.loop = true;
      const filt = this.ctx.createBiquadFilter(); filt.type = "lowpass"; filt.frequency.value = 500;
      const g = this.ctx.createGain(); g.gain.value = 0.05;
      src.connect(filt); filt.connect(g); g.connect(this.master); src.start();
      const padFreqs = [130.8, 164.8, 196];
      this.padOscs = padFreqs.map((f) => {
        const o = this.ctx.createOscillator(); o.type = "sine"; o.frequency.value = f;
        const gg = this.ctx.createGain(); gg.gain.value = 0.02;
        o.connect(gg); gg.connect(this.master); o.start();
        return o;
      });
      this._birdAcc = 2;
    }
    updateAmbient(dt) {
      if (!this.ctx || this.muted) return;
      this._birdAcc = (this._birdAcc || 0) - dt;
      if (this._birdAcc <= 0) {
        this._birdAcc = 1.4 + Math.random() * 3.2;
        const base = 1600 + Math.random() * 900;
        this.tone({ freq: base, duration: 0.08, type: "sine", gain: 0.05, glideTo: base * 1.4 });
        if (Math.random() < 0.4) this.tone({ freq: base * 0.8, duration: 0.07, type: "sine", gain: 0.04, delay: 0.1, glideTo: base });
      }
    }
    flyLoopStart() {
      if (!this.ctx || this.flyOsc) return;
      const o = this.ctx.createOscillator(); o.type = "sine"; o.frequency.value = 700;
      const g = this.ctx.createGain(); g.gain.value = 0;
      o.connect(g); g.connect(this.master); o.start();
      this.flyOsc = o; this.flyGain = g;
      g.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 0.4);
    }
    flyLoopUpdate(t) { if (this.flyOsc) this.flyOsc.frequency.value = 700 + Math.sin(t * 3) * 40; }
    flyLoopStop() {
      if (!this.flyOsc) return;
      const t = this.ctx.currentTime;
      this.flyGain.gain.linearRampToValueAtTime(0, t + 0.3);
      const o = this.flyOsc;
      setTimeout(() => { try { o.stop(); } catch (e) { /* already stopped */ } }, 350);
      this.flyOsc = null; this.flyGain = null;
    }
  }
  const soundEngine = new SoundEngine();

  // -------------------------------------------------------- renderer/scene
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fd4f7);
  scene.fog = new THREE.Fog(0x8fd4f7, 40, 105);

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
  camera.position.set(0, 5, 12);
  camera.lookAt(0, 1, 0);

  scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x6f8a4c, 1.0));
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const sun = new THREE.DirectionalLight(0xfff4dd, 1.35);
  sun.position.set(30, 42, 18);
  scene.add(sun);

  function resize() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);

  // -------------------------------------------------------------- shadows
  const shadowGeo = new THREE.CircleGeometry(1, 16);
  function makeBlobShadow(radius) {
    const mesh = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.scale.set(radius, radius, 1);
    mesh.position.y = 0.02;
    return { mesh, baseRadius: radius };
  }
  function updateBlobShadow(shadow, worldPos) {
    shadow.mesh.position.x = worldPos.x;
    shadow.mesh.position.z = worldPos.z;
    const height = Math.max(0, worldPos.y);
    const scaleMul = Math.max(0.3, 1 - height * 0.12);
    shadow.mesh.scale.set(shadow.baseRadius * scaleMul, shadow.baseRadius * scaleMul, 1);
    shadow.mesh.material.opacity = 0.34 * scaleMul;
  }

  // ---------------------------------------------------------------- world
  function makeGrassTexture() {
    const size = 32;
    const c = document.createElement("canvas"); c.width = size; c.height = size;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#5fae4a"; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 140; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? "#4f9c3d" : "#6fc158";
      ctx.fillRect(Math.floor(Math.random() * size), Math.floor(Math.random() * size), 1, 1);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(24, 24);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(PARK_HALF * 3, PARK_HALF * 3),
    new THREE.MeshStandardMaterial({ map: makeGrassTexture(), roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  function createFence() {
    const group = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
    const railMat = new THREE.MeshStandardMaterial({ color: 0xe8dfc0, flatShading: true });
    const postGeo = new THREE.BoxGeometry(0.22, 1.1, 0.22);
    const spacing = 4;
    const sides = [
      { axis: "x", fixed: PARK_HALF }, { axis: "x", fixed: -PARK_HALF },
      { axis: "z", fixed: PARK_HALF }, { axis: "z", fixed: -PARK_HALF },
    ];
    for (const side of sides) {
      for (let p = -PARK_HALF; p <= PARK_HALF; p += spacing) {
        const post = new THREE.Mesh(postGeo, postMat);
        if (side.axis === "x") post.position.set(side.fixed, 0.55, p); else post.position.set(p, 0.55, side.fixed);
        group.add(post);
      }
      const railLen = PARK_HALF * 2 + 0.3;
      const railGeo = new THREE.BoxGeometry(side.axis === "x" ? 0.08 : railLen, 0.1, side.axis === "x" ? railLen : 0.08);
      const railTop = new THREE.Mesh(railGeo, railMat);
      const railBottom = new THREE.Mesh(railGeo, railMat);
      if (side.axis === "x") { railTop.position.set(side.fixed, 0.9, 0); railBottom.position.set(side.fixed, 0.45, 0); }
      else { railTop.position.set(0, 0.9, side.fixed); railBottom.position.set(0, 0.45, side.fixed); }
      group.add(railTop, railBottom);
    }
    return group;
  }
  scene.add(createFence());

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, flatShading: true });
  const leafColors = [0x3f8f3a, 0x4fa843, 0x379134];
  function createTree() {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.4, 6), trunkMat);
    trunk.position.y = 0.7;
    group.add(trunk);
    for (let i = 0; i < 3; i++) {
      const leaf = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.75 - i * 0.08, 0),
        new THREE.MeshStandardMaterial({ color: leafColors[i % leafColors.length], flatShading: true })
      );
      leaf.position.set((Math.random() - 0.5) * 0.3, 1.5 + i * 0.5, (Math.random() - 0.5) * 0.3);
      group.add(leaf);
    }
    return group;
  }
  for (let i = 0; i < 18; i++) {
    const tree = createTree();
    const angle = (i / 18) * Math.PI * 2 + rand(-0.12, 0.12);
    const r = PARK_HALF + rand(2, 7);
    tree.position.set(Math.sin(angle) * r, 0, Math.cos(angle) * r);
    tree.scale.setScalar(rand(0.85, 1.25));
    scene.add(tree);
  }

  function createBench() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x8a5a34, flatShading: true });
    const group = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.5), mat);
    seat.position.y = 0.5; group.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 0.1), mat);
    back.position.set(0, 0.78, -0.2); group.add(back);
    for (const x of [-0.65, 0.65]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.45), mat);
      leg.position.set(x, 0.25, 0); group.add(leg);
    }
    return group;
  }
  const bench = createBench();
  bench.position.set(OWNER_POS.x + 2.4, 0, OWNER_POS.z + 0.5);
  bench.rotation.y = -0.4;
  scene.add(bench);

  function createHydrant() {
    const mat = new THREE.MeshStandardMaterial({ color: 0xd6392b, flatShading: true });
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.55, 8), mat);
    body.position.y = 0.32; group.add(body);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mat);
    cap.position.y = 0.62; group.add(cap);
    return group;
  }
  const hydrant = createHydrant();
  hydrant.position.set(10, 0, -6);
  scene.add(hydrant);

  function createSign() {
    const group = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, flatShading: true });
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xf2ecd8, flatShading: true });
    for (const x of [-0.55, 0.55]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.12), postMat);
      post.position.set(x, 0.8, 0); group.add(post);
    }
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 0.08), boardMat);
    board.position.set(0, 1.5, 0); group.add(board);
    return group;
  }
  const sign = createSign();
  sign.position.set(0, 0, PARK_HALF - 3);
  scene.add(sign);

  function createFlowerPatch(pos) {
    const group = new THREE.Group();
    const petalColors = [0xe2453c, 0xe8c53c, 0xe888c2, 0x9a4ce2];
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: petalColors[i % petalColors.length], flatShading: true });
      const flower = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 5), mat);
      flower.position.set(pos.x + rand(-1.6, 1.6), 0.08, pos.z + rand(-1.6, 1.6));
      group.add(flower);
    }
    return group;
  }
  scene.add(createFlowerPatch(BEE_HOME));

  const clouds = [];
  function createCloud() {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
    const group = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(rand(1.6, 2.6), rand(0.8, 1.2), rand(1.4, 2.2)), mat);
      box.position.set(rand(-1.4, 1.4), rand(-0.2, 0.2), rand(-0.8, 0.8));
      group.add(box);
    }
    return group;
  }
  for (let i = 0; i < 6; i++) {
    const cloud = createCloud();
    cloud.position.set(rand(-60, 60), rand(16, 23), rand(-55, 55));
    scene.add(cloud);
    clouds.push({ mesh: cloud, speed: rand(0.4, 1.2) });
  }
  function updateClouds(dt) {
    for (const c of clouds) {
      c.mesh.position.x += c.speed * dt;
      if (c.mesh.position.x > 70) c.mesh.position.x = -70;
    }
  }

  // ----------------------------------------------------------- dog builder
  const legGeo = new THREE.BoxGeometry(0.2, 0.5, 0.2);
  const bodyGeo = new THREE.BoxGeometry(0.95, 0.6, 1.6);
  const headGeo = new THREE.BoxGeometry(0.5, 0.42, 0.46);
  const snoutGeo = new THREE.BoxGeometry(0.28, 0.24, 0.32);
  const noseGeo = new THREE.BoxGeometry(0.08, 0.08, 0.05);
  const earGeo = new THREE.BoxGeometry(0.16, 0.22, 0.06);
  const tailGeo = new THREE.BoxGeometry(0.13, 0.13, 0.5);
  const eyeGeo = new THREE.SphereGeometry(0.045, 6, 6);
  const bandanaGeo = new THREE.BoxGeometry(0.58, 0.16, 0.5);
  const hatCapGeo = new THREE.BoxGeometry(0.34, 0.14, 0.34);
  const hatPartyGeo = new THREE.ConeGeometry(0.2, 0.34, 8);

  function buildDog(opts) {
    const coat = (opts && opts.coat) || "#c88a4a";
    const bodyMat = new THREE.MeshStandardMaterial({ color: coat, flatShading: true, roughness: 0.9 });
    const darkMat = new THREE.MeshStandardMaterial({ color: shade(coat, -0.25), flatShading: true, roughness: 0.9 });
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x2b2320, flatShading: true });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x171310 });
    const bandanaMat = new THREE.MeshStandardMaterial({ color: 0xe2453c, flatShading: true });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, flatShading: true });

    const root = new THREE.Group();
    const legHeight = 0.5;
    const legSpecs = [["FL", 0.34, 0.55], ["FR", -0.34, 0.55], ["BL", 0.34, -0.55], ["BR", -0.34, -0.55]];
    const legs = {};
    for (const [name, x, z] of legSpecs) {
      const hip = new THREE.Object3D();
      hip.position.set(x, legHeight, z);
      const leg = new THREE.Mesh(legGeo, darkMat);
      leg.position.y = -legHeight / 2;
      hip.add(leg);
      root.add(hip);
      legs[name] = hip;
    }

    const bodyY = legHeight + 0.3;
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, bodyY, 0);
    root.add(body);

    const headPivot = new THREE.Object3D();
    headPivot.position.set(0, bodyY + 0.28, 0.95);
    root.add(headPivot);
    headPivot.add(new THREE.Mesh(headGeo, bodyMat));
    const snout = new THREE.Mesh(snoutGeo, bodyMat);
    snout.position.set(0, -0.06, 0.36);
    headPivot.add(snout);
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.02, 0.53);
    headPivot.add(nose);
    const earL = new THREE.Mesh(earGeo, darkMat); earL.position.set(0.2, 0.24, -0.05); earL.rotation.z = 0.3; headPivot.add(earL);
    const earR = new THREE.Mesh(earGeo, darkMat); earR.position.set(-0.2, 0.24, -0.05); earR.rotation.z = -0.3; headPivot.add(earR);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(0.15, 0.06, 0.24); headPivot.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat); eyeR.position.set(-0.15, 0.06, 0.24); headPivot.add(eyeR);

    const hatCap = new THREE.Mesh(hatCapGeo, hatMat);
    hatCap.position.set(0, 0.24, 0.02); hatCap.visible = false; headPivot.add(hatCap);
    const hatParty = new THREE.Mesh(hatPartyGeo, hatMat);
    hatParty.position.set(0, 0.35, 0.02); hatParty.visible = false; headPivot.add(hatParty);

    const tailPivot = new THREE.Object3D();
    tailPivot.position.set(0, bodyY + 0.18, -0.82);
    root.add(tailPivot);
    const tail = new THREE.Mesh(tailGeo, darkMat);
    tail.position.set(0, 0, -0.22);
    tail.rotation.x = -0.4;
    tailPivot.add(tail);

    const bandana = new THREE.Mesh(bandanaGeo, bandanaMat);
    bandana.position.set(0, bodyY + 0.18, 0.62);
    bandana.visible = false;
    root.add(bandana);

    const shadow = makeBlobShadow(0.55);

    return {
      root, legs, headPivot, tailPivot, shadow, walkPhase: 0, tailPhase: 0,
      setCoat(color) { bodyMat.color.set(color); darkMat.color.set(shade(color, -0.25)); },
      setBandana(color) { if (!color) { bandana.visible = false; } else { bandana.visible = true; bandanaMat.color.set(color); } },
      setHat(type, color) {
        hatCap.visible = false; hatParty.visible = false;
        if (color) hatMat.color.set(color);
        if (type === "cap") hatCap.visible = true;
        else if (type === "party") hatParty.visible = true;
      },
    };
  }
  function addDogToScene(dog, pos) {
    dog.root.position.copy(pos);
    scene.add(dog.root);
    scene.add(dog.shadow.mesh);
  }
  function updateDogAnim(dog, state, dt) {
    dog.walkPhase += dt * (state.moving ? 8 + (state.speedFactor || 1) * 2 : 2);
    const swing = state.moving ? 0.5 : 0.06;
    dog.legs.FL.rotation.x = Math.sin(dog.walkPhase) * swing;
    dog.legs.BR.rotation.x = Math.sin(dog.walkPhase) * swing;
    dog.legs.FR.rotation.x = Math.sin(dog.walkPhase + Math.PI) * swing;
    dog.legs.BL.rotation.x = Math.sin(dog.walkPhase + Math.PI) * swing;
    if (state.jumping) {
      dog.legs.FL.rotation.x = -0.4; dog.legs.FR.rotation.x = -0.4;
      dog.legs.BL.rotation.x = 0.5; dog.legs.BR.rotation.x = 0.5;
    }
    dog.tailPhase += dt * (state.excited ? 13 : 4.5);
    dog.tailPivot.rotation.y = Math.sin(dog.tailPhase) * (state.excited ? 0.85 : 0.35);
    if (state.barking) dog.headPivot.rotation.x = THREE.MathUtils.lerp(dog.headPivot.rotation.x, -0.35, 0.4);
    else dog.headPivot.rotation.x = THREE.MathUtils.lerp(dog.headPivot.rotation.x, 0, 0.15);
  }

  // --------------------------------------------------------- human builder
  function buildHuman() {
    const skin = new THREE.MeshStandardMaterial({ color: 0xe8b48a, flatShading: true });
    const shirt = new THREE.MeshStandardMaterial({ color: 0x3c78b0, flatShading: true });
    const pants = new THREE.MeshStandardMaterial({ color: 0x41372c, flatShading: true });
    const capMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, flatShading: true });

    const root = new THREE.Group();
    const legGeo2 = new THREE.BoxGeometry(0.26, 0.75, 0.26);
    const legL = new THREE.Mesh(legGeo2, pants); legL.position.set(0.16, 0.375, 0); root.add(legL);
    const legR = new THREE.Mesh(legGeo2, pants); legR.position.set(-0.16, 0.375, 0); root.add(legR);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.75, 0.34), shirt); torso.position.set(0, 1.125, 0); root.add(torso);

    const armGeo = new THREE.BoxGeometry(0.2, 0.65, 0.2);
    const armPivotL = new THREE.Object3D(); armPivotL.position.set(0.42, 1.44, 0); root.add(armPivotL);
    const armL = new THREE.Mesh(armGeo, skin); armL.position.set(0, -0.32, 0); armPivotL.add(armL);
    const armPivotR = new THREE.Object3D(); armPivotR.position.set(-0.42, 1.44, 0); root.add(armPivotR);
    const armR = new THREE.Mesh(armGeo, skin); armR.position.set(0, -0.32, 0); armPivotR.add(armR);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), skin); head.position.set(0, 1.72, 0); root.add(head);
    const capMesh = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.44), capMat); capMesh.position.set(0, 1.98, 0.02); root.add(capMesh);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.05, 0.16), capMat); brim.position.set(0, 1.92, 0.26); root.add(brim);

    return {
      root,
      idle(t) { armPivotR.rotation.x = Math.sin(t * 1.2) * 0.08; armPivotL.rotation.x = Math.sin(t * 1.2 + 1) * 0.08; head.rotation.y = Math.sin(t * 0.6) * 0.15; },
      wave(t) { armPivotR.rotation.x = -1.6 + Math.sin(t * 3.4) * 0.35; armPivotR.rotation.z = -0.2; head.rotation.y = 0; },
    };
  }
  const owner = buildHuman();
  owner.root.position.copy(OWNER_POS);
  scene.add(owner.root);

  // ------------------------------------------------------------- player
  const player = {
    dog: buildDog({ coat: COATS[0].color }),
    heading: 0,
    velY: 0,
    onGround: true,
    moving: false,
    baseSpeed: 6.4,
    turnSpeed: 2.7,
    jumpVel: 8.4,
    flySpeed: 5.2,
    speedMul: 1, jumpMul: 1, catchRadius: 1.3, barkRadius: 3.4, barkPush: 2.4,
    knockback: new THREE.Vector3(),
    dirtyTimer: 0,
    stingCooldown: 0,
    barkCooldown: 0,
    barkPulseTimer: 0,
    barkAnimTimer: 0,
    excitedTimer: 0,
    flyTimer: 0,
    flying: false,
    comboCount: 1,
    comboTimer: 0,
    stepAcc: 0,
  };
  addDogToScene(player.dog, new THREE.Vector3(0, 0, 6));

  function applyUpgrades() {
    player.speedMul = UPGRADES.speed.mul(save.levels.speed);
    player.jumpMul = UPGRADES.jump.mul(save.levels.jump);
    player.catchRadius = 1.3 * UPGRADES.catch.mul(save.levels.catch);
    const barkMul = UPGRADES.bark.mul(save.levels.bark);
    player.barkRadius = 3.4 * barkMul;
    player.barkPush = 2.4 * barkMul;
  }
  function applyCosmetics() {
    const coat = COATS.find((c) => c.id === save.equipped.coat) || COATS[0];
    player.dog.setCoat(coat.color);
    const band = BANDANAS.find((b) => b.id === save.equipped.bandana);
    player.dog.setBandana(band && band.id !== "none" ? band.color : null);
    const hat = HATS.find((h) => h.id === save.equipped.hat);
    player.dog.setHat(hat ? hat.id : "none", hat ? hat.color : null);
  }
  applyUpgrades();
  applyCosmetics();

  // -------------------------------------------------------------- camera
  const camState = { yawOffset: 0, distance: 6.5, height: 3.1, targetHeight: 1.05 };
  const camLookCurrent = new THREE.Vector3(0, 1, 6);
  let dragging = false;
  let lastPointerX = 0;
  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") return;
    dragging = true; lastPointerX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastPointerX; lastPointerX = e.clientX;
    camState.yawOffset -= dx * 0.006;
  });
  window.addEventListener("pointerup", () => { dragging = false; });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  function desiredCamera() {
    const totalYaw = player.heading + camState.yawOffset;
    const forward = new THREE.Vector3(Math.sin(totalYaw), 0, Math.cos(totalYaw));
    const pos = player.dog.root.position.clone().addScaledVector(forward, -camState.distance);
    pos.y += camState.height;
    if (pos.y < 1.2) pos.y = 1.2;
    const lookTarget = player.dog.root.position.clone();
    lookTarget.y += camState.targetHeight;
    return { pos, lookTarget };
  }
  function snapCamera() {
    const { pos, lookTarget } = desiredCamera();
    camera.position.copy(pos);
    camLookCurrent.copy(lookTarget);
    camera.lookAt(camLookCurrent);
  }
  function updateCamera(dt) {
    if (!dragging) camState.yawOffset += (0 - camState.yawOffset) * Math.min(1, dt * 2.5);
    const { pos, lookTarget } = desiredCamera();
    camera.position.lerp(pos, 1 - Math.exp(-6 * dt));
    camLookCurrent.lerp(lookTarget, 1 - Math.exp(-8 * dt));
    camera.lookAt(camLookCurrent);
  }

  // ------------------------------------------------------- npc dog steering
  function steerTowards(npc, target, dt, speed) {
    const pos = npc.dog.root.position;
    const dx = target.x - pos.x, dz = target.z - pos.z;
    const dist = Math.hypot(dx, dz);
    const desired = Math.atan2(dx, dz);
    npc.heading = dampAngle(npc.heading, desired, 7, dt);
    npc.dog.root.rotation.y = npc.heading;
    const mv = Math.min(speed, dist * 4) * dt;
    pos.x += Math.sin(npc.heading) * mv;
    pos.z += Math.cos(npc.heading) * mv;
    clampToBounds(pos);
  }
  function steerDirection(npc, dir, dt, speed) {
    const desired = Math.atan2(dir.x, dir.z);
    npc.heading = dampAngle(npc.heading, desired, 7, dt);
    npc.dog.root.rotation.y = npc.heading;
    npc.dog.root.position.x += Math.sin(npc.heading) * speed * dt;
    npc.dog.root.position.z += Math.cos(npc.heading) * speed * dt;
    clampToBounds(npc.dog.root.position);
  }
  function faceTowards(npc, target, dt) {
    const pos = npc.dog.root.position;
    const desired = Math.atan2(target.x - pos.x, target.z - pos.z);
    npc.heading = dampAngle(npc.heading, desired, 5, dt);
    npc.dog.root.rotation.y = npc.heading;
  }

  // ------------------------------------------------------------- npc dogs
  const NPC_COATS = ["#8a8a8a", "#2b2b2e", "#f4f4f0", "#b5742f", "#4a6fa5"];
  const npcs = [];
  function createNpc(i) {
    const dog = buildDog({ coat: NPC_COATS[i % NPC_COATS.length] });
    addDogToScene(dog, randomParkPoint(6));
    return {
      dog, heading: Math.random() * Math.PI * 2, state: "wander", stateTimer: rand(1, 3),
      wanderTarget: randomParkPoint(4), sniffCooldown: rand(4, 9), targetFrisbeeId: null, moving: true,
    };
  }
  for (let i = 0; i < 3; i++) npcs.push(createNpc(i));

  function updateNpc(npc, dt) {
    const pos = npc.dog.root.position;
    npc.stateTimer -= dt;

    if (npc.state === "flee") {
      npc.moving = true;
      const dir = new THREE.Vector3(pos.x - player.dog.root.position.x, 0, pos.z - player.dog.root.position.z);
      if (dir.lengthSq() < 0.0001) dir.set(1, 0, 0);
      dir.normalize();
      steerDirection(npc, dir, dt, 6.8);
      if (npc.stateTimer <= 0) { npc.state = "wander"; npc.stateTimer = rand(2, 4); npc.wanderTarget = randomParkPoint(4); }
    } else if (npc.state === "sniff") {
      const toPlayer = new THREE.Vector3(player.dog.root.position.x - pos.x, 0, player.dog.root.position.z - pos.z);
      const dist = toPlayer.length();
      if (dist > 1.1) {
        npc.moving = true;
        steerTowards(npc, player.dog.root.position, dt, 3.4);
      } else {
        npc.moving = false;
        faceTowards(npc, player.dog.root.position, dt);
        if (toPlayer.lengthSq() > 0.0001) {
          const push = toPlayer.clone().normalize().multiplyScalar(-1.6 * dt);
          player.knockback.x += push.x; player.knockback.z += push.z;
        }
      }
      if (player.barkPulseTimer > 0 && dist < player.barkRadius) {
        npc.state = "flee"; npc.stateTimer = 3;
        soundEngine.yelp();
      }
      if (npc.stateTimer <= 0) { npc.state = "wander"; npc.stateTimer = rand(3, 6); npc.wanderTarget = randomParkPoint(4); }
    } else if (npc.state === "chase") {
      const fb = frisbees.find((f) => f.id === npc.targetFrisbeeId);
      if (!fb) { npc.state = "wander"; npc.stateTimer = rand(1, 2); npc.wanderTarget = randomParkPoint(4); }
      else {
        npc.moving = true;
        steerTowards(npc, fb.pos, dt, 5.4);
        if (pos.distanceTo(fb.pos) < 0.85 && fb.pos.y < 1.6) {
          soundEngine.steal();
          despawnFrisbee(fb);
          npc.state = "wander"; npc.stateTimer = rand(2, 4); npc.wanderTarget = randomParkPoint(4);
        }
      }
    } else {
      npc.moving = true;
      if (pos.distanceTo(npc.wanderTarget) < 1.2 || npc.stateTimer <= 0) {
        npc.wanderTarget = randomParkPoint(4);
        npc.stateTimer = rand(3, 6);
      }
      steerTowards(npc, npc.wanderTarget, dt, 2.7);

      npc.sniffCooldown -= dt;
      if (npc.sniffCooldown <= 0) {
        npc.sniffCooldown = rand(7, 12);
        if (pos.distanceTo(player.dog.root.position) < 15 && Math.random() < 0.45) {
          npc.state = "sniff"; npc.stateTimer = 8;
        }
      }
    }

    updateDogAnim(npc.dog, { moving: npc.moving, speedFactor: 1, excited: npc.state === "flee", jumping: false, barking: false }, dt);
    updateBlobShadow(npc.dog.shadow, pos);
  }

  // -------------------------------------------------------------- frisbees
  const frisbees = [];
  let frisbeeIdSeq = 0;
  let frisbeeSpawnTimer = 2;
  const frisbeeGeoCache = new Map();
  function frisbeeGeo(radius) {
    if (!frisbeeGeoCache.has(radius)) frisbeeGeoCache.set(radius, new THREE.CylinderGeometry(radius, radius * 0.9, 0.1, 20));
    return frisbeeGeoCache.get(radius);
  }
  function makeFrisbeeMesh(tier) {
    const mat = new THREE.MeshStandardMaterial({
      color: tier.color, flatShading: true, roughness: 0.45,
      emissive: tier.wobble ? 0x4a1f7a : 0x000000, emissiveIntensity: tier.wobble ? 0.5 : 0,
    });
    return new THREE.Mesh(frisbeeGeo(tier.radius), mat);
  }
  function spawnFrisbee() {
    const tier = weightedPick(FRISBEE_TIERS);
    const angle = Math.random() * Math.PI * 2;
    const originR = PARK_HALF + 6;
    const origin = new THREE.Vector3(Math.sin(angle) * originR, 1.5 + Math.random(), Math.cos(angle) * originR);
    const biasAngle = Math.random() * Math.PI * 2;
    const biasR = 3 + Math.random() * 8;
    const m = PARK_HALF - 4;
    const tx = THREE.MathUtils.clamp(player.dog.root.position.x + Math.sin(biasAngle) * biasR, -m, m);
    const tz = THREE.MathUtils.clamp(player.dog.root.position.z + Math.cos(biasAngle) * biasR, -m, m);
    const targetY = 1.0;
    const t = tier.flightTime;
    const vel = new THREE.Vector3((tx - origin.x) / t, 0, (tz - origin.z) / t);
    vel.y = (targetY - origin.y - 0.5 * FRISBEE_GRAVITY * t * t) / t;
    const mesh = makeFrisbeeMesh(tier);
    mesh.position.copy(origin);
    scene.add(mesh);
    const shadow = makeBlobShadow(tier.radius * 1.3);
    scene.add(shadow.mesh);
    frisbees.push({ id: ++frisbeeIdSeq, tier, mesh, shadow, pos: origin.clone(), vel, state: "flying", landedTimer: 0, claimed: false, wobbleT: 0, spinPhase: 0 });
  }
  function updateFrisbeeSpawner(dt) {
    if (frisbees.length >= 6) { frisbeeSpawnTimer = Math.min(frisbeeSpawnTimer, 1); return; }
    frisbeeSpawnTimer -= dt;
    if (frisbeeSpawnTimer <= 0) { spawnFrisbee(); frisbeeSpawnTimer = rand(2.4, 4.6); }
  }
  function despawnFrisbee(fb) {
    scene.remove(fb.mesh); fb.mesh.material.dispose();
    scene.remove(fb.shadow.mesh);
    const idx = frisbees.indexOf(fb);
    if (idx >= 0) frisbees.splice(idx, 1);
    for (const npc of npcs) {
      if (npc.targetFrisbeeId === fb.id) {
        npc.targetFrisbeeId = null;
        if (npc.state === "chase") { npc.state = "wander"; npc.stateTimer = rand(1, 2); }
      }
    }
  }
  function catchFrisbee(fb) {
    if (player.comboTimer > 0) player.comboCount += 1; else player.comboCount = 1;
    player.comboTimer = 2.6;
    const mult = 1 + 0.15 * (player.comboCount - 1);
    const pts = Math.round(fb.tier.points * mult);
    const hex = "#" + fb.tier.color.toString(16).padStart(6, "0");
    addPoints(pts, fb.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), hex);
    soundEngine.catchSound(fb.tier.id);
    player.excitedTimer = 1.1;
    despawnFrisbee(fb);
  }
  function updateFrisbees(dt) {
    for (let i = frisbees.length - 1; i >= 0; i--) {
      const fb = frisbees[i];
      if (fb.state === "flying") {
        fb.vel.y += FRISBEE_GRAVITY * dt;
        fb.pos.addScaledVector(fb.vel, dt);
        if (fb.tier.wobble) {
          fb.wobbleT += dt;
          fb.pos.x += Math.sin(fb.wobbleT * 13) * 0.045;
          fb.pos.z += Math.cos(fb.wobbleT * 10) * 0.045;
        }
        fb.mesh.position.copy(fb.pos);
        fb.spinPhase += dt * 11;
        fb.mesh.rotation.y = fb.spinPhase;
        fb.mesh.rotation.x = Math.sin(fb.spinPhase * 0.4) * 0.08;
        updateBlobShadow(fb.shadow, fb.pos);

        const mouth = player.dog.root.position.clone(); mouth.y += 0.85;
        if (mouth.distanceTo(fb.pos) <= player.catchRadius + fb.tier.radius * 0.7) { catchFrisbee(fb); continue; }

        if (fb.pos.y <= 0.06 && fb.vel.y <= 0) {
          fb.pos.y = 0.06; fb.vel.set(0, 0, 0); fb.mesh.position.copy(fb.pos);
          fb.state = "landed"; fb.landedTimer = 5;
        } else if (Math.abs(fb.pos.x) > PARK_HALF + 10 || Math.abs(fb.pos.z) > PARK_HALF + 10 || fb.pos.y < -4) {
          despawnFrisbee(fb);
        }
      } else {
        fb.landedTimer -= dt;
        const mouth = player.dog.root.position.clone(); mouth.y += 0.5;
        if (mouth.distanceTo(fb.pos) <= player.catchRadius + fb.tier.radius * 0.7) { catchFrisbee(fb); continue; }
        if (fb.landedTimer <= 0) despawnFrisbee(fb);
      }
    }
  }
  function maybeAssignFrisbeeChasers(dt) {
    for (const fb of frisbees) {
      if (fb.claimed) continue;
      if (Math.random() < dt * 0.4) {
        const idle = npcs.filter((n) => n.state === "wander");
        if (idle.length) {
          const npc = idle[Math.floor(Math.random() * idle.length)];
          npc.state = "chase"; npc.stateTimer = 6; npc.targetFrisbeeId = fb.id; fb.claimed = true;
        }
      }
    }
  }

  // -------------------------------------------------------------- doodoo
  const doodoos = [];
  let doodooTimer = 1.5;
  const doodooMat = new THREE.MeshStandardMaterial({ color: 0x5b4326, flatShading: true, roughness: 1 });
  function spawnDoodoo() {
    const pos = randomParkPoint(6);
    if (pos.distanceTo(OWNER_POS) < 5) pos.x += 6;
    const group = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.17 - i * 0.03, 8, 6), doodooMat);
      s.scale.y = 0.65;
      s.position.set((Math.random() - 0.5) * 0.1, 0.05 + i * 0.08, (Math.random() - 0.5) * 0.1);
      group.add(s);
    }
    group.position.copy(pos); group.position.y = 0;
    scene.add(group);
    doodoos.push({ mesh: group, pos, radius: 0.5 });
  }
  function updateDoodooSpawner(dt) {
    doodooTimer -= dt;
    if (doodooTimer <= 0) {
      doodooTimer = rand(4, 8);
      if (doodoos.length < 6) spawnDoodoo();
    }
  }
  function checkDoodooContact() {
    if (player.dog.root.position.y > 0.6) return;
    for (let i = doodoos.length - 1; i >= 0; i--) {
      const d = doodoos[i];
      const dist = Math.hypot(player.dog.root.position.x - d.pos.x, player.dog.root.position.z - d.pos.z);
      if (dist < d.radius + 0.5) {
        scene.remove(d.mesh);
        doodoos.splice(i, 1);
        player.dirtyTimer = 2.2;
        addPoints(-5, d.pos.clone().add(new THREE.Vector3(0, 0.4, 0)), "#7a5327");
        flashScreen("yuck");
        soundEngine.squelch();
      }
    }
  }

  // ---------------------------------------------------------------- bees
  const bees = [];
  const beeMat = new THREE.MeshStandardMaterial({ color: 0xf4c542, flatShading: true });
  const beeStripeMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, flatShading: true });
  const beeWingGeo = new THREE.PlaneGeometry(0.12, 0.08);
  const beeWingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  function createBee() {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), beeMat));
    const stripe = new THREE.Mesh(new THREE.SphereGeometry(0.093, 8, 6), beeStripeMat);
    stripe.scale.set(1, 1, 0.35);
    group.add(stripe);
    const wL = new THREE.Mesh(beeWingGeo, beeWingMat); wL.position.set(0.07, 0.06, 0); wL.rotation.x = 0.3; group.add(wL);
    const wR = new THREE.Mesh(beeWingGeo, beeWingMat); wR.position.set(-0.07, 0.06, 0); wR.rotation.x = 0.3; group.add(wR);
    return group;
  }
  for (let i = 0; i < 4; i++) {
    const mesh = createBee();
    scene.add(mesh);
    bees.push({ mesh, home: BEE_HOME.clone().add(new THREE.Vector3(rand(-1, 1), 0, rand(-1, 1))), phase: rand(0, 10) });
  }
  function updateBees(dt) {
    for (const bee of bees) {
      bee.phase += dt;
      const p = bee.home;
      bee.mesh.position.set(
        p.x + Math.sin(bee.phase * 1.3) * 1.3,
        p.y + 0.5 + Math.sin(bee.phase * 2.1) * 0.3,
        p.z + Math.cos(bee.phase * 1.7) * 1.3
      );
      bee.mesh.rotation.y += dt * 6;
    }
  }
  let beeBuzzCooldown = 0;
  function checkBeeContact(dt) {
    beeBuzzCooldown -= dt;
    const nearBee = bees.some((b) => player.dog.root.position.distanceTo(b.mesh.position) < 3);
    if (nearBee && beeBuzzCooldown <= 0) { beeBuzzCooldown = 0.5; soundEngine.buzz(); }
    if (player.stingCooldown > 0) return;
    const mouth = player.dog.root.position.clone().add(new THREE.Vector3(0, 0.7, 0));
    for (const bee of bees) {
      if (mouth.distanceTo(bee.mesh.position) < 0.42) {
        player.stingCooldown = 1.0;
        addPoints(-8, bee.mesh.position.clone(), "#c0392b");
        flashScreen("hurt");
        soundEngine.sting();
        const dir = new THREE.Vector3(player.dog.root.position.x - bee.mesh.position.x, 0, player.dog.root.position.z - bee.mesh.position.z);
        if (dir.lengthSq() < 0.0001) dir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
        dir.normalize();
        player.knockback.add(dir.multiplyScalar(5));
        break;
      }
    }
  }

  // ----------------------------------------------------------- butterflies
  let butterflySwarm = null;
  let butterflySpawnCooldown = rand(14, 24);
  const butterflyWingGeo = new THREE.PlaneGeometry(0.22, 0.18);
  function makeButterflyMesh() {
    const color = Math.random() < 0.5 ? 0xff9d3c : 0x4fb0ff;
    const mat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, flatShading: true, roughness: 0.6 });
    const group = new THREE.Group();
    const wingL = new THREE.Mesh(butterflyWingGeo, mat); wingL.position.x = 0.11; wingL.rotation.y = 0.5; group.add(wingL);
    const wingR = new THREE.Mesh(butterflyWingGeo, mat); wingR.position.x = -0.11; wingR.rotation.y = -0.5; group.add(wingR);
    group.userData.wingL = wingL; group.userData.wingR = wingR;
    return group;
  }
  function spawnButterflySwarm() {
    const center = randomParkPoint(6); center.y = 1.4;
    const count = 6 + Math.floor(Math.random() * 3);
    const flies = [];
    for (let i = 0; i < count; i++) {
      const mesh = makeButterflyMesh();
      mesh.position.copy(center);
      scene.add(mesh);
      flies.push({ mesh, phase: Math.random() * 10, flapPhase: Math.random() * 10, radius: 0.6 + Math.random() * 0.6, speed: 1 + Math.random() * 0.8, yOff: Math.random() * 0.6, alive: true });
    }
    butterflySwarm = { flies, center, timer: 22, drift: new THREE.Vector3((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6) };
  }
  function maybeSpawnButterflies(dt) {
    if (butterflySwarm) return;
    butterflySpawnCooldown -= dt;
    if (butterflySpawnCooldown <= 0) {
      butterflySpawnCooldown = rand(20, 35);
      if (Math.random() < 0.35) spawnButterflySwarm();
    }
  }
  function updateButterflies(dt) {
    if (!butterflySwarm) return;
    const sw = butterflySwarm;
    sw.timer -= dt;
    sw.center.addScaledVector(sw.drift, dt);
    const m = PARK_HALF - 6;
    sw.center.x = THREE.MathUtils.clamp(sw.center.x, -m, m);
    sw.center.z = THREE.MathUtils.clamp(sw.center.z, -m, m);
    const mouth = player.dog.root.position.clone().add(new THREE.Vector3(0, 0.8, 0));
    for (const b of sw.flies) {
      if (!b.alive) continue;
      b.phase += dt * b.speed * 2.2;
      b.flapPhase += dt * 18;
      const pos = new THREE.Vector3(
        sw.center.x + Math.sin(b.phase) * b.radius,
        sw.center.y + b.yOff + Math.sin(b.phase * 1.7) * 0.25,
        sw.center.z + Math.cos(b.phase * 1.3) * b.radius
      );
      b.mesh.position.copy(pos);
      b.mesh.rotation.y += dt * 1.5;
      b.mesh.userData.wingL.rotation.y = 0.5 + Math.sin(b.flapPhase) * 0.9;
      b.mesh.userData.wingR.rotation.y = -0.5 - Math.sin(b.flapPhase) * 0.9;

      if (mouth.distanceTo(pos) < 0.85) {
        b.alive = false;
        scene.remove(b.mesh);
        b.mesh.children.forEach((c) => c.material && c.material.dispose());
        addPoints(5, pos, "#ff9d3c");
        player.flyTimer = Math.min(player.flyTimer + 4.5, 26);
        soundEngine.nectar();
      }
    }
    sw.flies = sw.flies.filter((b) => b.alive);
    if (sw.flies.length === 0 || sw.timer <= 0) {
      for (const b of sw.flies) scene.remove(b.mesh);
      butterflySwarm = null;
    }
  }

  // ---------------------------------------------------------- score / fx
  function addPoints(n, worldPos, color) {
    save.treats = Math.max(0, save.treats + n);
    persistSave();
    if (worldPos) spawnFloatingText(worldPos, (n > 0 ? "+" : "") + n, color || (n < 0 ? "#c0392b" : "#2e7d32"));
  }
  function flashScreen(kind) {
    const colors = { hurt: "rgba(200,40,20,0.4)", yuck: "rgba(120,90,40,0.4)", good: "rgba(255,255,255,0.25)" };
    flashEl.style.setProperty("--flash-color", colors[kind] || colors.good);
    flashEl.classList.remove("pulse");
    void flashEl.offsetWidth;
    flashEl.classList.add("pulse");
  }
  function spawnFloatingText(worldPos, text, color) {
    const div = document.createElement("div");
    div.className = "floatie";
    div.textContent = text;
    div.style.color = color || "#fff";
    stageEl.appendChild(div);
    const v = worldPos.clone().project(camera);
    const rect = stageEl.getBoundingClientRect();
    div.style.left = ((v.x * 0.5 + 0.5) * rect.width) + "px";
    div.style.top = ((1 - (v.y * 0.5 + 0.5)) * rect.height) + "px";
    requestAnimationFrame(() => { div.style.transform = "translate(-50%,-160%)"; div.style.opacity = "0"; });
    setTimeout(() => div.remove(), 850);
  }

  // -------------------------------------------------------------- owner
  function updateOwner(dt, t) {
    const dist = player.dog.root.position.distanceTo(OWNER_POS);
    const near = dist < INTERACT_RADIUS;
    if (near) owner.wave(t); else owner.idle(t);
  }
  function onInteractPressed() {
    if (shopOpen) { closeShop(); return; }
    if (player.dog.root.position.distanceTo(OWNER_POS) < INTERACT_RADIUS) openShop();
  }

  // --------------------------------------------------------------- shop
  let shopOpen = false;
  function openShop() {
    shopOpen = true;
    shopOverlay.hidden = false;
    shopLineEl.textContent = OWNER_LINES[Math.floor(Math.random() * OWNER_LINES.length)];
    renderUpgradesPanel();
    renderCosmeticsPanel();
    updateShopBalance();
    soundEngine.uiClick();
  }
  function closeShop() {
    shopOpen = false;
    shopOverlay.hidden = true;
    soundEngine.uiClick();
  }
  function updateShopBalance() { shopBalanceEl.textContent = save.treats; }
  function upgradeCostFor(key) { return upgradeCost(UPGRADES[key], save.levels[key]); }
  function buyUpgrade(key) {
    const def = UPGRADES[key];
    const level = save.levels[key];
    if (level >= def.max) return;
    const cost = upgradeCostFor(key);
    if (save.treats < cost) { soundEngine.uiClick(); return; }
    save.treats -= cost;
    save.levels[key] = level + 1;
    persistSave();
    applyUpgrades();
    renderUpgradesPanel();
    updateShopBalance();
    soundEngine.purchase();
  }
  function renderUpgradesPanel() {
    panelUpgradesEl.innerHTML = "";
    for (const key of Object.keys(UPGRADES)) {
      const def = UPGRADES[key];
      const level = save.levels[key];
      const maxed = level >= def.max;
      const row = document.createElement("div");
      row.className = "shop-row";
      const info = document.createElement("div");
      info.className = "shop-row-info";
      const title = document.createElement("span");
      title.className = "shop-row-title";
      title.textContent = def.label + " " + "★".repeat(level) + "☆".repeat(def.max - level);
      const desc = document.createElement("span");
      desc.className = "shop-row-desc";
      desc.textContent = def.desc;
      info.appendChild(title); info.appendChild(desc);
      row.appendChild(info);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "shop-buy" + (maxed ? " owned" : "");
      btn.textContent = maxed ? "MAX" : upgradeCostFor(key) + " treats";
      btn.disabled = maxed || save.treats < upgradeCostFor(key);
      if (!maxed) btn.addEventListener("click", () => buyUpgrade(key));
      row.appendChild(btn);
      panelUpgradesEl.appendChild(row);
    }
  }
  function cosmeticSection(title, list, slot) {
    const wrap = document.createElement("div");
    const h = document.createElement("div");
    h.className = "shop-row-title";
    h.style.margin = "10px 0 6px";
    h.textContent = title;
    wrap.appendChild(h);
    const grid = document.createElement("div");
    grid.className = "cosmetic-grid";
    for (const item of list) {
      const unlocked = save.unlocked[slot].includes(item.id);
      const equipped = save.equipped[slot] === item.id;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cosmetic-swatch" + (equipped ? " equipped" : "") + (!unlocked ? " locked" : "");
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.style.background = item.color;
      btn.appendChild(chip);
      const label = document.createElement("div");
      label.textContent = item.label;
      btn.appendChild(label);
      if (!unlocked) {
        const price = document.createElement("div");
        price.className = "price";
        price.textContent = item.price + "t";
        btn.appendChild(price);
      }
      btn.addEventListener("click", () => {
        if (unlocked) {
          save.equipped[slot] = item.id;
          persistSave(); applyCosmetics(); renderCosmeticsPanel(); soundEngine.uiClick();
        } else if (save.treats >= item.price) {
          save.treats -= item.price;
          save.unlocked[slot].push(item.id);
          save.equipped[slot] = item.id;
          persistSave(); applyCosmetics(); renderCosmeticsPanel(); updateShopBalance(); soundEngine.purchase();
        } else {
          soundEngine.uiClick();
        }
      });
      grid.appendChild(btn);
    }
    wrap.appendChild(grid);
    return wrap;
  }
  function renderCosmeticsPanel() {
    panelCosmeticsEl.innerHTML = "";
    panelCosmeticsEl.appendChild(cosmeticSection("Coat", COATS, "coat"));
    panelCosmeticsEl.appendChild(cosmeticSection("Bandana", BANDANAS, "bandana"));
    panelCosmeticsEl.appendChild(cosmeticSection("Hat", HATS, "hat"));
  }
  document.querySelectorAll(".shop-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".shop-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const which = tab.dataset.tab;
      panelUpgradesEl.hidden = which !== "upgrades";
      panelCosmeticsEl.hidden = which !== "cosmetics";
      soundEngine.uiClick();
    });
  });
  shopCloseBtn.addEventListener("click", closeShop);
  shopOverlay.addEventListener("click", (e) => { if (e.target === shopOverlay) closeShop(); });

  // ---------------------------------------------------------------- hud
  function updatePrompt() {
    if (shopOpen) { promptEl.hidden = true; return; }
    const sniffing = npcs.some((n) => n.state === "sniff" && n.dog.root.position.distanceTo(player.dog.root.position) < 2.2);
    const nearOwner = player.dog.root.position.distanceTo(OWNER_POS) < INTERACT_RADIUS;
    if (sniffing) { promptEl.hidden = false; promptEl.textContent = "A dog is sniffing you! Press B to bark it off."; }
    else if (nearOwner) { promptEl.hidden = false; promptEl.textContent = "Press E to open the shop"; }
    else promptEl.hidden = true;
  }
  function updateHud() {
    statScoreEl.textContent = save.treats;
    comboEl.hidden = player.comboCount < 2;
    statComboEl.textContent = player.comboCount;
    buffFlyEl.hidden = !player.flying;
    if (player.flying) buffFlyBarEl.style.width = Math.max(0, (player.flyTimer / 26) * 100) + "%";
    buffDirtyEl.hidden = player.dirtyTimer <= 0;
    updatePrompt();
  }

  // -------------------------------------------------------------- input
  const keys = new Set();
  function keyHeld(code) { return keys.has(code); }
  const BLOCK_DEFAULT = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
  window.addEventListener("keydown", (e) => {
    if (BLOCK_DEFAULT.has(e.code)) e.preventDefault();
    const isRepeat = keys.has(e.code);
    keys.add(e.code);
    if (isRepeat || !gameStarted) return;
    if (e.code === "KeyB") triggerBark();
    if (e.code === "KeyE") onInteractPressed();
    if (e.code === "Escape" && shopOpen) closeShop();
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  muteBtn.addEventListener("click", () => {
    const muted = !soundEngine.muted;
    soundEngine.setMuted(muted);
    muteBtn.textContent = muted ? "🔇" : "🔊";
  });

  function triggerBark() {
    if (player.barkCooldown > 0) return;
    player.barkCooldown = 0.5;
    player.barkPulseTimer = 0.4;
    player.barkAnimTimer = 0.3;
    soundEngine.bark();
  }

  // ------------------------------------------------------------- physics
  function updatePlayer(dt) {
    const turnInput = ((keyHeld("KeyD") || keyHeld("ArrowRight")) ? 1 : 0) - ((keyHeld("KeyA") || keyHeld("ArrowLeft")) ? 1 : 0);
    player.heading += turnInput * player.turnSpeed * dt;
    player.dog.root.rotation.y = player.heading;

    const moveInput = ((keyHeld("KeyW") || keyHeld("ArrowUp")) ? 1 : 0) - ((keyHeld("KeyS") || keyHeld("ArrowDown")) ? 1 : 0);
    player.moving = moveInput !== 0;
    const speed = player.baseSpeed * player.speedMul * (player.dirtyTimer > 0 ? 0.55 : 1);
    if (player.moving) {
      const fx = Math.sin(player.heading), fz = Math.cos(player.heading);
      player.dog.root.position.x += fx * moveInput * speed * dt;
      player.dog.root.position.z += fz * moveInput * speed * dt;
      player.stepAcc += dt * speed;
      if (player.stepAcc > 2.4 && player.onGround) { player.stepAcc = 0; soundEngine.footstep(); }
    }

    if (player.flying) {
      const asc = keyHeld("Space");
      const desc = keyHeld("ShiftLeft") || keyHeld("KeyC");
      const targetVy = asc ? player.flySpeed : desc ? -player.flySpeed : 0;
      player.velY += (targetVy - player.velY) * Math.min(1, 6 * dt);
    } else {
      if (player.onGround && keyHeld("Space")) {
        player.velY = player.jumpVel * player.jumpMul;
        player.onGround = false;
        soundEngine.jump();
      }
      player.velY += GRAVITY * dt;
    }
    player.dog.root.position.y += player.velY * dt;
    if (player.dog.root.position.y <= 0) {
      player.dog.root.position.y = 0;
      player.velY = 0;
      player.onGround = true;
    }

    player.dog.root.position.x += player.knockback.x * dt;
    player.dog.root.position.z += player.knockback.z * dt;
    player.knockback.multiplyScalar(Math.max(0, 1 - 6 * dt));
    clampToBounds(player.dog.root.position);

    player.dirtyTimer = Math.max(0, player.dirtyTimer - dt);
    player.stingCooldown = Math.max(0, player.stingCooldown - dt);
    player.barkCooldown = Math.max(0, player.barkCooldown - dt);
    player.barkPulseTimer = Math.max(0, player.barkPulseTimer - dt);
    player.barkAnimTimer = Math.max(0, player.barkAnimTimer - dt);
    player.excitedTimer = Math.max(0, player.excitedTimer - dt);
    player.comboTimer = Math.max(0, player.comboTimer - dt);
    if (player.comboTimer <= 0) player.comboCount = 1;

    if (player.flyTimer > 0) {
      player.flyTimer -= dt;
      if (!player.flying) { player.flying = true; soundEngine.flyLoopStart(); }
    } else if (player.flying) {
      player.flying = false; soundEngine.flyLoopStop();
    }

    updateDogAnim(player.dog, {
      moving: player.moving && player.onGround,
      speedFactor: player.speedMul,
      jumping: !player.onGround && !player.flying,
      barking: player.barkAnimTimer > 0,
      excited: player.excitedTimer > 0 || player.barkPulseTimer > 0,
    }, dt);
    updateBlobShadow(player.dog.shadow, player.dog.root.position);
  }

  // --------------------------------------------------------------- loop
  let gameStarted = false;
  startBtn.addEventListener("click", () => {
    bootOverlay.hidden = true;
    soundEngine.resume();
    soundEngine.startAmbient();
    gameStarted = true;
    snapCamera();
  });

  resize();
  snapCamera();

  let running = !document.hidden;
  document.addEventListener("visibilitychange", () => { running = !document.hidden; });
  let last = null;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!running) return;
    if (last === null) last = now;
    let dt = (now - last) / 1000;
    last = now;
    dt = Math.min(dt, 1 / 20);
    resize();

    const t = now / 1000;
    if (!shopOpen) {
      updatePlayer(dt);
      updateCamera(dt);
      updateFrisbeeSpawner(dt);
      updateFrisbees(dt);
      maybeAssignFrisbeeChasers(dt);
      updateDoodooSpawner(dt);
      checkDoodooContact();
      updateBees(dt);
      checkBeeContact(dt);
      for (const npc of npcs) updateNpc(npc, dt);
      maybeSpawnButterflies(dt);
      updateButterflies(dt);
      updateOwner(dt, t);
      updateClouds(dt);
      soundEngine.updateAmbient(dt);
      if (player.flying) soundEngine.flyLoopUpdate(t);
      updateHud();
    }

    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}
