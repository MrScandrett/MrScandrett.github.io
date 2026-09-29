import * as THREE from './vendor/three.module.min.js';

/* =====================================================================
   Oddkin: Wild Worlds
   Build a creature, land on a world, and evolve five times by
   befriending, outcompeting, and out-surviving the local species.
   ===================================================================== */

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const { clamp, lerp, smoothstep } = THREE.MathUtils;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------
const PLANETS = [
  {
    name: 'Verdara', biome: 'Lush · Gentle', danger: 1, color: '#68b976',
    blurb: 'Rolling meadows and plenty of fruit. Most locals are curious, not hungry.',
    sky: 0x9bd5ca, nightSky: 0x172a3d, fog: 0xb8ddd0, nightFog: 0x1b3140,
    ground: 0x4c985c, accent: 0xd8ef66, water: 0x7fd6c8,
    leaf: [0x5fae55, 0x74c062, 0x4e9a4a, 0x86c95b], trunk: 0x6a4d34, rock: 0x70847b,
    flowers: [0xf9d56e, 0xf58a9d, 0xc9a5ff, 0xffffff], tree: 'round',
    predators: 0.12, hunger: 1, dayLight: 1
  },
  {
    name: 'Emberune', biome: 'Volcanic · Fierce', danger: 3, color: '#e56d43',
    blurb: 'Lava pools scorch the careless and predators hunt in the ash. Fortune favors the bold.',
    sky: 0x8a5249, nightSky: 0x241012, fog: 0x8a544a, nightFog: 0x2a1413,
    ground: 0x6d3923, accent: 0xffa240, water: 0xff5a1f,
    leaf: [0xbd4939, 0xd0643a, 0x9c3a30, 0xe07a3c], trunk: 0x3b2320, rock: 0x57403a,
    flowers: [0xffb347, 0xff7043], tree: 'spire',
    predators: 0.45, hunger: 1.1, dayLight: 0.9, lava: true
  },
  {
    name: 'Lumora', biome: 'Biolume · Strange', danger: 2, color: '#5b70cf',
    blurb: 'Endless twilight. Glowing fungi feed skittish, strange life that startles easily.',
    sky: 0x2b4078, nightSky: 0x0b1030, fog: 0x324b73, nightFog: 0x111a3a,
    ground: 0x31486f, accent: 0x6ff4d0, water: 0x6ff4d0,
    leaf: [0x53d8b5, 0x7ae0ff, 0xb18cff, 0x53d8b5], trunk: 0xcfd6ff, rock: 0x4b5a86,
    flowers: [0x6ff4d0, 0xb18cff, 0x7ae0ff], tree: 'mushroom', glow: true,
    predators: 0.28, hunger: 1, dayLight: 0.55
  },
  {
    name: 'Aridia', biome: 'Desert · Sparse', danger: 2, color: '#dcad5e',
    blurb: 'Blazing dunes where hunger bites fast. The oasis is your lifeline.',
    sky: 0xe8bf82, nightSky: 0x221d3a, fog: 0xd6aa6b, nightFog: 0x2a2440,
    ground: 0xb98542, accent: 0xd5e968, water: 0x5cc3d6,
    leaf: [0x578d4b, 0x6b9e52, 0x4f8045], trunk: 0x8a6a45, rock: 0x9b7548,
    flowers: [0xff8fb1, 0xffd166], tree: 'cactus',
    predators: 0.3, hunger: 1.45, dayLight: 1.05
  }
];

const TRAITS = {
  diet: [['Herbivore', '🌿', 0], ['Omnivore', '🍎', 12], ['Carnivore', '🦷', 18]],
  body: [['Cephalized', '●', 0], ['Fusiform', '⬭', 10], ['Osteoderms', '⬢', 22]],
  mouth: [['Grinding', '◡', 0], ['Keratin Beak', '◇', 8], ['Carnassial', '⋀', 18]],
  legs: [['Plantigrade', '∩', 0], ['Digitigrade', '⟋', 14], ['Saltatorial', '⌁', 18]]
};
const BIOLOGY = {
  diet: ['Herbivores digest plant tissue only, but social species are easier to befriend.', 'Omnivores eat anything, though each meal is a little less efficient.', 'Carnivores gain the most from meat and hit harder, but timid prey flee sooner.'],
  body: ['Cephalization concentrates sensory structures at the anterior end.', 'A fusiform profile reduces drag and supports efficient forward locomotion.', 'Osteoderms are dermal bone plates that trade flexibility and speed for protection.'],
  mouth: ['Broad grinding surfaces process fibrous plant tissue.', 'A keratinized beak shears food without mineralized teeth.', 'Carnassial-like edges concentrate force for slicing animal tissue.'],
  legs: ['Plantigrade feet contact the ground from heel to toe for stability.', 'Digitigrade posture elevates the heel and lengthens effective stride.', 'Saltatorial hindlimbs store and release elastic energy for jumping.']
};
const COLORS = ['#d8ef66', '#ff8b62', '#75ded1', '#a993e9', '#f2d7a0', '#e95d72', '#6fb2ff', '#f5b84b'];
const WILD_COLORS = ['#d8ef66', '#ff8b62', '#75ded1', '#a993e9', '#f2d7a0', '#e95d72', '#8fd46b', '#f5b84b', '#6fb2ff', '#c77dff', '#ffd166', '#4ecdc4'];

const ADAPTATIONS = [
  { id: 'fleet', name: 'Fleet Feet', icon: '⚡', text: '+18% move speed per rank. Longer, springier legs.' },
  { id: 'thorn', name: 'Thorn Hide', icon: '✦', text: 'Take 25% less damage per rank. Grows dorsal thorns.' },
  { id: 'kindred', name: 'Kindred Call', icon: '♫', text: 'Wider harmony window and +1 pack size per rank. Grows a crest.' },
  { id: 'fang', name: 'Apex Jaw', icon: '⚔', text: '+2 bite damage per rank for you and your pack. Grows tusks.' },
  { id: 'senses', name: 'Keen Senses', icon: '◉', text: '+40% radar range per rank. Grows glowing antennae.' },
  { id: 'gut', name: 'Iron Gut', icon: '♨', text: 'Hunger drains 25% slower per rank. Rank 2 digests anything.' }
];
const MAX_RANK = 3;
const MAX_TIER = 5;
const BASE_GENES = 100;
const WORLD_RADIUS = 84;
const NEST_RADIUS = 7;
const DAY_LENGTH = 240;
const SAVE_KEY = 'oddkin-wild-worlds-save-v2';
const TEMPER = {
  curious: { label: 'CURIOUS', mood: 'Curious about you', window: 1.35, hostile: false },
  timid: { label: 'TIMID', mood: 'Skittish, ready to bolt', window: 1.0, hostile: false },
  territorial: { label: 'TERRITORIAL', mood: 'Guarding its ground', window: 0.85, hostile: true },
  predator: { label: 'PREDATOR', mood: 'Sizing you up as prey', window: 0.62, hostile: true }
};

const defaultGenome = () => ({ diet: 0, body: 0, mouth: 0, legs: 0, arms: 0, legPairs: 1, spine: 1, width: 1, color: COLORS[0], faceX: 0, faceY: 0 });
const freshAdapt = () => Object.fromEntries(ADAPTATIONS.map((a) => [a.id, 0]));

const state = {
  screen: 'planet', planet: 0, name: 'Pip', genome: defaultGenome(),
  tier: 0, adapt: freshAdapt(), bones: 0, boneGoal: 5,
  health: 100, hunger: 100, clock: DAY_LENGTH * 0.08,
  player: { x: 0, z: 0 }, entities: [], species: [], journal: new Set(),
  stats: { friends: 0, defeats: 0, bones: 0, time: 0 },
  paused: false, creatorMode: 'new', victory: false, keepExploring: false
};

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
function seeded(seed) { return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) | 0) >>> 0) / 4294967296; }
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
const hexNum = (c) => (typeof c === 'string' ? parseInt(c.slice(1), 16) : c);
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
function terrainHeight(x, z) {
  return Math.sin(x * 0.045) * 2 + Math.cos(z * 0.052) * 1.55 + Math.sin((x + z) * 0.025) * 1.2 + Math.sin(Math.hypot(x, z) * 0.07) * 0.65;
}

const geoCache = new Map();
function geo(key, make) {
  let g = geoCache.get(key);
  if (!g) { g = make(); geoCache.set(key, g); }
  return g;
}
const matCache = new Map();
function mat(color, rough = 0.78, emissive = 0, opts = {}) {
  const key = [color, rough, emissive, opts.flat ? 1 : 0, opts.opacity ?? 1, opts.glow ?? 0.6].join('|');
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color, roughness: rough, metalness: 0, emissive, emissiveIntensity: emissive ? opts.glow ?? 0.6 : 0,
      flatShading: !!opts.flat, transparent: (opts.opacity ?? 1) < 1, opacity: opts.opacity ?? 1
    });
    matCache.set(key, m);
  }
  return m;
}
function mesh(g, m, cast = true) {
  const o = new THREE.Mesh(g, m);
  o.castShadow = cast;
  o.receiveShadow = true;
  return o;
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
function tm(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
}

/** Batches repeated props into one InstancedMesh per part type. */
class Scatter {
  constructor() { this.sets = new Map(); }
  add(key, geometry, material, matrix, color = 0xffffff, cast = true) {
    let set = this.sets.get(key);
    if (!set) { set = { geometry, material, cast, items: [] }; this.sets.set(key, set); }
    set.items.push({ matrix, color });
  }
  build(parent) {
    for (const set of this.sets.values()) {
      const im = new THREE.InstancedMesh(set.geometry, set.material, set.items.length);
      set.items.forEach((it, i) => { im.setMatrixAt(i, it.matrix); im.setColorAt(i, _c.set(it.color)); });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = set.cast;
      im.receiveShadow = true;
      im.computeBoundingSphere();
      im.userData.dispose = true;
      parent.add(im);
    }
  }
}

// ---------------------------------------------------------------------
// Sound (tiny WebAudio synth — no files)
// ---------------------------------------------------------------------
const audio = { ctx: null, muted: false };
try { audio.muted = localStorage.getItem('oddkin-muted') === '1'; } catch { /* storage blocked */ }
function tone(freq, dur = 0.12, type = 'sine', vol = 0.12, when = 0, slide = 0) {
  if (audio.muted) return;
  try {
    audio.ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audio.ctx, t = ctx.currentTime + when;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch { /* audio unavailable */ }
}
const sfx = {
  pickup: () => { tone(660, 0.1, 'triangle'); tone(990, 0.14, 'triangle', 0.1, 0.07); },
  eat: () => { tone(320, 0.08, 'square', 0.05); tone(260, 0.1, 'square', 0.05, 0.08); },
  bite: () => tone(220, 0.12, 'sawtooth', 0.07, 0, -120),
  hurt: () => tone(140, 0.25, 'sawtooth', 0.09, 0, -60),
  beat: (n) => tone([523, 659, 784][n] || 784, 0.18, 'sine', 0.14),
  miss: () => tone(160, 0.18, 'square', 0.06, 0, -40),
  friend: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.1, i * 0.08)),
  evolve: () => [392, 494, 587, 784].forEach((f, i) => tone(f, 0.6, 'sine', 0.08, i * 0.05)),
  discover: () => { tone(880, 0.1, 'sine', 0.07); tone(1320, 0.18, 'sine', 0.06, 0.09); }
};

// ---------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------
function geneLimit() { return BASE_GENES + state.tier * 10; }
function buildCost(g = state.genome) {
  return ['diet', 'body', 'mouth', 'legs'].reduce((sum, t) => sum + TRAITS[t][g[t]][2], 0) + g.arms * 10 + (g.legPairs - 1) * 12;
}
function getStats() {
  const g = state.genome, a = state.adapt;
  return {
    speed: 4 + g.legs * 2 + a.fleet * 2 - (g.body === 2 ? 1 : 0),
    social: 5 + (g.mouth === 0 ? 2 : 0) + (g.diet === 0 ? 1 : 0) + g.arms + a.kindred * 2,
    attack: 2 + g.mouth * 2 + g.body + (g.diet === 2 ? 1 : 0) + a.fang * 2,
    health: 5 + g.body * 2 + (g.legPairs - 1)
  };
}
const maxHealth = () => 60 + getStats().health * 8;
const packMax = () => 3 + state.adapt.kindred;
const radarRange = () => 34 * (1 + state.adapt.senses * 0.4);
const playerScale = () => 0.85 + state.tier * 0.07;
function canEat(kind) {
  const d = state.genome.diet;
  return d === 1 || state.adapt.gut >= 2 || (d === 0 && kind === 'plant') || (d === 2 && kind === 'meat');
}

// ---------------------------------------------------------------------
// Creature model
// ---------------------------------------------------------------------
function mutationsFromAdapt(a) { return { ...a }; }

function makeCreature(g, { scale = 1, mut = null, cheapShadows = false } = {}) {
  const root = new THREE.Group();
  const torso = new THREE.Group();
  root.add(torso);
  const color = hexNum(g.color);
  const skin = mat(color, 0.62);
  const dark = mat(0x173d35, 0.6);
  const white = mat(0xfffdf0, 0.3);
  const pupil = mat(0x102a26, 0.25);
  const accent = mat(new THREE.Color(color).offsetHSL(0.02, -0.08, -0.2).getHex(), 0.7);
  const glow = mat(0xe7ff70, 0.4, 0xe7ff70, { glow: 1.2 });
  const legScale = 1 + (mut?.fleet || 0) * 0.12;
  const lift = (legScale - 1) * 1.05;
  const shadow = (o) => { o.castShadow = !cheapShadows; return o; };

  // Body
  const bodyGeo = g.body === 1 ? geo('b1', () => new THREE.CapsuleGeometry(0.72, 1.25, 10, 18))
    : g.body === 2 ? geo('b2', () => new THREE.SphereGeometry(1.02, 24, 16))
      : geo('b0', () => new THREE.SphereGeometry(1, 24, 18));
  const base = g.body === 1 ? [1, 0.82, 1.35] : [1.15, 1, 1.05];
  const radiusZ = (g.body === 1 ? 0.72 : g.body === 2 ? 1.02 : 1) * base[2] * g.spine;
  const body = mesh(bodyGeo, skin);
  body.scale.set(base[0] * g.width, base[1] * (0.85 + 0.15 * g.spine), base[2] * g.spine);
  body.position.y = 1.55;
  torso.add(body);

  const belly = mesh(geo('belly', () => new THREE.SphereGeometry(0.76, 20, 14)), mat(color, 0.8, 0, { opacity: 0.4 }), false);
  belly.scale.set(g.width, 0.72, 0.95);
  belly.position.set(0, 1.35, -radiusZ * 0.55);
  torso.add(belly);

  // Legs
  const limbs = [];
  const upperLength = g.legs === 2 ? 0.72 : 0.5, lowerLength = g.legs === 0 ? 0.42 : 0.66;
  for (let pair = 0; pair < g.legPairs; pair++) {
    for (const side of [-1, 1]) {
      const limb = new THREE.Group();
      const row = g.legPairs === 1 ? 0 : (pair / (g.legPairs - 1) - 0.5) * 1.15 * g.spine;
      limb.position.set(side * 0.48 * g.width, 0.9 * legScale + lift * 0.1, row);
      limb.scale.y = legScale;
      const upper = shadow(mesh(geo(`up${upperLength}`, () => new THREE.CapsuleGeometry(0.16, upperLength, 8, 12)), skin));
      upper.position.set(side * 0.1, -upperLength * 0.45, 0);
      upper.rotation.z = side * (g.legs === 2 ? 0.42 : 0.12);
      const knee = shadow(mesh(geo('knee', () => new THREE.SphereGeometry(0.18, 12, 9)), skin));
      knee.position.set(side * (g.legs === 2 ? 0.3 : 0.1), -0.48, 0);
      const lower = shadow(mesh(geo(`lo${lowerLength}`, () => new THREE.CapsuleGeometry(0.13, lowerLength, 8, 12)), skin));
      lower.position.set(side * (g.legs === 1 ? 0.24 : 0.13), -0.7, 0);
      lower.rotation.z = side * (g.legs === 1 ? -0.35 : g.legs === 2 ? -0.22 : 0.04);
      const foot = shadow(mesh(geo('foot', () => new THREE.SphereGeometry(0.25, 16, 10)), dark));
      foot.scale.set(g.legs === 0 ? 1.55 : 1.05, 0.38, g.legs === 2 ? 1.9 : 1.45);
      foot.position.set(side * (g.legs === 1 ? 0.36 : 0.16), -1.05, -0.12);
      limb.add(upper, knee, lower, foot);
      // Hoppers (saltatorial) push off with both legs together; walkers alternate.
      limb.userData.phase = g.legs === 2 ? pair * 0.6 : (side > 0 ? 0 : Math.PI) + pair * Math.PI;
      limbs.push(limb);
      root.add(limb);
    }
  }

  // Arms
  const arms = [];
  for (let pair = 0; pair < g.arms; pair++) {
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.82 * g.width, 1.72 + pair * 0.26, -0.1 * g.spine + pair * 0.3);
      const bone = shadow(mesh(geo('arm', () => new THREE.CapsuleGeometry(0.12, 0.72, 8, 12)), skin));
      bone.position.set(side * 0.2, -0.25, 0);
      bone.rotation.z = side * (0.75 - pair * 0.12);
      const hand = shadow(mesh(geo('hand', () => new THREE.SphereGeometry(0.19, 14, 10)), dark));
      hand.position.set(side * 0.36, -0.52, 0);
      arm.add(bone, hand);
      arm.userData.phase = side > 0 ? Math.PI : 0;
      arms.push(arm);
      torso.add(arm);
    }
  }

  // Face
  const fx = g.faceX / 105, fy = g.faceY / 100;
  for (const side of [-1, 1]) {
    const eye = mesh(geo('eye', () => new THREE.SphereGeometry(0.29, 18, 14)), white);
    eye.position.set(fx + side * 0.39, 1.98 - fy, -radiusZ * 0.8);
    const dot = mesh(geo('pupil', () => new THREE.SphereGeometry(0.12, 14, 10)), pupil);
    dot.position.set(fx + side * 0.41, 1.98 - fy, -radiusZ * 0.8 - 0.24);
    eye.userData.editPart = dot.userData.editPart = 'face';
    torso.add(eye, dot);
  }
  if (g.mouth === 1) {
    const beak = mesh(geo('beak', () => new THREE.ConeGeometry(0.33, 0.8, 8)), mat(0xffcc55));
    beak.rotation.x = -Math.PI / 2;
    beak.position.set(fx, 1.5 - fy, -radiusZ * 1.02);
    beak.userData.editPart = 'face';
    torso.add(beak);
  } else {
    const mouth = mesh(geo('mouth', () => new THREE.TorusGeometry(0.3, 0.055, 8, 18, Math.PI)), dark);
    mouth.rotation.set(0, 0, Math.PI);
    mouth.position.set(fx, 1.52 - fy, -radiusZ * 0.97);
    mouth.userData.editPart = 'face';
    torso.add(mouth);
    if (g.mouth === 2) {
      for (const side of [-1, 1]) {
        const tooth = mesh(geo('tooth', () => new THREE.ConeGeometry(0.06, 0.18, 5)), white, false);
        tooth.rotation.x = Math.PI;
        tooth.position.set(fx + side * 0.14, 1.5 - fy, -radiusZ * 0.99);
        tooth.userData.editPart = 'face';
        torso.add(tooth);
      }
    }
  }

  // Osteoderm plates
  if (g.body === 2) {
    for (let i = -2; i <= 2; i++) {
      const plate = shadow(mesh(geo('plate', () => new THREE.ConeGeometry(0.13, 0.42, 5)), dark));
      plate.position.set(0, 2.5 - Math.abs(i) * 0.05, i * 0.32 * g.spine);
      torso.add(plate);
    }
  }

  // Evolution mutations
  if (mut) {
    for (let i = 0; i < mut.thorn * 3; i++) {
      const t = (i + 0.5) / (mut.thorn * 3);
      const thorn = mesh(geo('thorn', () => new THREE.ConeGeometry(0.1, 0.55, 5)), accent);
      const a = lerp(-1.1, 1.1, t);
      thorn.position.set(Math.sin(i * 2.4) * 0.35 * g.width, 1.55 + Math.cos(a) * 0.98, Math.sin(a) * radiusZ);
      thorn.rotation.x = a;
      torso.add(thorn);
    }
    if (mut.kindred) {
      for (let i = 0; i < 2 + mut.kindred; i++) {
        const feather = mesh(geo('feather', () => new THREE.ConeGeometry(0.07, 0.8, 4)), mat(0xff8bd1, 0.5, 0x5a1440));
        feather.position.set((i - (1 + mut.kindred) / 2) * 0.18, 2.62, -radiusZ * 0.25);
        feather.rotation.set(-0.35, 0, (i - (1 + mut.kindred) / 2) * 0.35);
        feather.scale.y = 0.8 + mut.kindred * 0.2;
        torso.add(feather);
      }
    }
    if (mut.senses) {
      for (const side of [-1, 1]) {
        const stalk = mesh(geo('stalk', () => new THREE.CylinderGeometry(0.025, 0.035, 0.7, 6)), dark, false);
        stalk.position.set(side * 0.3, 2.65, -radiusZ * 0.55);
        stalk.rotation.set(-0.5, 0, side * -0.4);
        const bulb = mesh(geo('bulb', () => new THREE.SphereGeometry(0.1 + 0.02, 10, 8)), glow, false);
        bulb.position.set(side * 0.44, 2.95, -radiusZ * 0.72);
        bulb.scale.setScalar(0.8 + mut.senses * 0.25);
        torso.add(stalk, bulb);
      }
    }
    if (mut.fang) {
      for (const side of [-1, 1]) {
        const tusk = mesh(geo('tusk', () => new THREE.ConeGeometry(0.08, 0.5, 6)), white);
        tusk.position.set(fx + side * 0.34, 1.34 - fy, -radiusZ * 0.95);
        tusk.rotation.set(-0.6, 0, side * 0.3);
        tusk.scale.setScalar(0.8 + mut.fang * 0.25);
        torso.add(tusk);
      }
    }
  }

  torso.position.y = lift;
  root.scale.setScalar(scale);
  root.userData = { torso, body, limbs, arms, lift, hop: g.legs === 2 };
  return root;
}

function animateCreature(obj, time, stride, offset = 0) {
  const u = obj.userData;
  const t = time + offset;
  const f = 7 + stride * 5;
  const bounce = u.hop ? Math.abs(Math.sin(t * f * 0.5)) * 0.28 * stride : Math.abs(Math.sin(t * f)) * 0.07 * stride;
  u.torso.position.y = u.lift + bounce + Math.sin(t * 2.1) * 0.025;
  u.torso.rotation.z = Math.sin(t * f * 0.5) * 0.03 * stride;
  for (const l of u.limbs) l.rotation.x = Math.sin(t * (u.hop ? f * 0.5 : f) + l.userData.phase) * (u.hop ? 0.35 : 0.55) * stride;
  for (const a of u.arms) a.rotation.x = Math.sin(t * f + a.userData.phase) * 0.4 * stride + Math.sin(t * 1.6) * 0.06;
}

// ---------------------------------------------------------------------
// Species
// ---------------------------------------------------------------------
const NAME_A = ['Moss', 'Nib', 'Brum', 'Zig', 'Tuff', 'Glim', 'Snor', 'Plum', 'Vex', 'Wob', 'Quill', 'Fen'];
const NAME_B = ['whisk', 'ble', 'snout', 'kin', 'aroo', 'hopper', 'munch', 'ling', 'beak', 'tail', 'fang', 'drift'];

function makeSpecies(planetIndex) {
  const planet = PLANETS[planetIndex];
  const rnd = seeded(1300 + planetIndex * 977);
  const list = [];
  for (let i = 0; i < 6; i++) {
    const temper = i === 0 ? 'curious' : i === 1 ? 'timid' : i === 5 ? 'predator'
      : rnd() < planet.predators ? 'predator' : pick(rnd, ['curious', 'timid', 'territorial']);
    const diet = temper === 'predator' ? 2 : temper === 'timid' ? 0 : Math.floor(rnd() * 2);
    const genome = {
      diet,
      body: temper === 'territorial' ? 2 : Math.floor(rnd() * 3),
      mouth: diet === 2 ? 2 : diet === 0 ? 0 : 1,
      legs: temper === 'timid' ? 1 + Math.floor(rnd() * 2) : Math.floor(rnd() * 3),
      arms: rnd() < 0.3 ? 1 : 0,
      legPairs: rnd() < 0.25 ? 2 : 1,
      spine: 0.8 + rnd() * 0.7,
      width: 0.8 + rnd() * 0.45,
      color: pick(rnd, WILD_COLORS),
      faceX: (rnd() - 0.5) * 20,
      faceY: (rnd() - 0.5) * 16
    };
    const name = NAME_A[(i * 7 + planetIndex * 3 + Math.floor(rnd() * 3)) % NAME_A.length] + NAME_B[(i * 5 + planetIndex) % NAME_B.length];
    list.push({
      id: i, name, genome, temper,
      size: temper === 'predator' ? 0.95 + rnd() * 0.3 : temper === 'territorial' ? 0.85 + rnd() * 0.2 : 0.55 + rnd() * 0.3,
      hp: { curious: 7, timid: 6, territorial: 13, predator: 16 }[temper],
      attack: { curious: 3, timid: 0, territorial: 7, predator: 10 }[temper],
      speed: { curious: 3, timid: 5.2, territorial: 3.6, predator: 4.6 }[temper],
      herds: temper === 'predator' ? 2 : 3,
      herdSize: temper === 'predator' ? [1, 2] : [2, 4]
    });
  }
  return list;
}
function speciesNote(sp) {
  const g = sp.genome;
  const diet = TRAITS.diet[g.diet][0].toLowerCase();
  return `A ${diet} with ${TRAITS.body[g.body][0].toLowerCase()} build and ${TRAITS.legs[g.legs][0].toLowerCase()} legs. ${BIOLOGY.legs[g.legs]}`;
}

// ---------------------------------------------------------------------
// UI: planet select + creator
// ---------------------------------------------------------------------
function initUI() {
  $('#planet-list').innerHTML = PLANETS.map((p, i) => `
    <button class="planet-option" role="radio" aria-checked="${i === 0}" data-i="${i}">
      <i class="planet-orb" style="background:${p.color}"></i>
      <span><strong>${p.name.toUpperCase()}</strong><small>${p.biome} · <span class="danger-pips" aria-label="Danger ${p.danger} of 3">${'▲'.repeat(p.danger)}</span></small><span class="blurb">${p.blurb}</span></span>
      <b>0${i + 1}</b>
    </button>`).join('');
  $$('.planet-option').forEach((b) => b.addEventListener('click', () => selectPlanet(+b.dataset.i)));

  for (const type of ['diet', 'body', 'mouth', 'legs']) {
    $(`#${type}-options`).innerHTML = TRAITS[type].map((t, i) =>
      `<button class="trait-btn" data-type="${type}" data-i="${i}"><span aria-hidden="true">${t[1]}</span>${t[0]}<small>${t[2] ? `${t[2]} genes` : 'FREE'}</small></button>`).join('');
  }
  $('#color-options').innerHTML = COLORS.map((c, i) => `<button class="swatch" data-i="${i}" style="background:${c}" aria-label="Color ${i + 1}"></button>`).join('');
  $$('.trait-btn').forEach((b) => b.addEventListener('click', () => selectTrait(b.dataset.type, +b.dataset.i)));
  $$('.swatch').forEach((b) => b.addEventListener('click', () => { state.genome.color = COLORS[+b.dataset.i]; genomeChanged(); }));
  $('#spine-slider').addEventListener('input', (e) => { state.genome.spine = +e.target.value / 100; genomeChanged(); });
  $('#width-slider').addEventListener('input', (e) => { state.genome.width = +e.target.value / 100; genomeChanged(); });
  $$('[data-counter]').forEach((b) => b.addEventListener('click', () => changeCounter(b.dataset.counter, +b.dataset.delta)));
  $('#randomize-btn').addEventListener('click', randomizeGenome);

  $('#choose-planet').addEventListener('click', () => openCreator('new'));
  $('#continue-btn').addEventListener('click', continueGame);
  $('#back-planets').addEventListener('click', () => showScreen('planet'));
  $('#begin-game').addEventListener('click', () => (state.creatorMode === 'evolve' ? returnFromReshape() : startGame()));
  $('#pause-btn').addEventListener('click', () => pause(true));
  $('#resume-btn').addEventListener('click', () => pause(false));
  $('#restart-btn').addEventListener('click', abandon);
  $('#evolve-btn').addEventListener('click', openEvolution);
  $('#keep-exploring').addEventListener('click', () => { state.keepExploring = true; $('#victory-modal').classList.add('hidden'); state.paused = false; save(); });
  $('#victory-new').addEventListener('click', abandon);
  $('#mute-btn').addEventListener('click', toggleMute);
  updateMuteButton();
  refreshContinue();
  updateCreator();
}

function selectPlanet(i) {
  state.planet = i;
  $$('.planet-option').forEach((x) => x.setAttribute('aria-checked', String(+x.dataset.i === i)));
  $('#selected-name').textContent = PLANETS[i].name.toUpperCase();
  buildWorld(false);
}

function selectTrait(type, i) {
  const previous = state.genome[type];
  state.genome[type] = i;
  if (buildCost() > geneLimit()) { state.genome[type] = previous; toast('That adaptation exceeds your gene budget', 'bad'); return; }
  genomeChanged();
}
function changeCounter(key, delta) {
  const [min, max] = key === 'arms' ? [0, 2] : [1, 3];
  const previous = state.genome[key];
  state.genome[key] = clamp(previous + delta, min, max);
  if (buildCost() > geneLimit()) { state.genome[key] = previous; toast('Not enough genes left for another limb set', 'bad'); return; }
  genomeChanged();
}
function randomizeGenome() {
  const rnd = Math.random;
  const g = state.genome;
  for (let tries = 0; tries < 40; tries++) {
    Object.assign(g, {
      diet: Math.floor(rnd() * 3), body: Math.floor(rnd() * 3), mouth: Math.floor(rnd() * 3), legs: Math.floor(rnd() * 3),
      arms: Math.floor(rnd() * 3), legPairs: 1 + Math.floor(rnd() * 3), spine: 0.7 + rnd(), width: 0.7 + rnd() * 0.75,
      color: pick(rnd, COLORS), faceX: (rnd() - 0.5) * 30, faceY: (rnd() - 0.5) * 24
    });
    if (buildCost() <= geneLimit()) break;
  }
  while (buildCost() > geneLimit()) { if (g.arms) g.arms--; else if (g.legPairs > 1) g.legPairs--; else g.body = 0; }
  const names = ['Pip', 'Ziggle', 'Mox', 'Tuft', 'Bramble', 'Quibble', 'Nox', 'Jinx', 'Puddle', 'Snorkel', 'Wisp', 'Gumbo'];
  if (state.creatorMode === 'new') $('#creature-name').value = pick(rnd, names);
  genomeChanged();
}
function genomeChanged() { updateCreator(); refreshPreview3D(); refreshPlayer(); }

function updateCreator() {
  const g = state.genome, limit = geneLimit(), cost = buildCost();
  $('#budget-value').textContent = limit - cost;
  $('.budget').classList.toggle('low', limit - cost < 15);
  $$('.trait-btn').forEach((b) => {
    const type = b.dataset.type, i = +b.dataset.i;
    const affordable = cost - TRAITS[type][g[type]][2] + TRAITS[type][i][2] <= limit;
    b.classList.toggle('selected', i === g[type]);
    b.setAttribute('aria-pressed', String(i === g[type]));
    b.disabled = !affordable;
    b.title = BIOLOGY[type][i];
  });
  $$('.swatch').forEach((b) => b.classList.toggle('selected', COLORS[+b.dataset.i] === g.color));
  $$('[data-counter]').forEach((b) => {
    const key = b.dataset.counter, delta = +b.dataset.delta;
    const [min, max] = key === 'arms' ? [0, 2] : [1, 3];
    const next = clamp(g[key] + delta, min, max);
    b.disabled = next === g[key] || cost + (key === 'arms' ? 10 : 12) * (next - g[key]) > limit;
  });
  $('#arms-count').textContent = g.arms;
  $('#leg-pairs-count').textContent = g.legPairs;
  $('#spine-slider').value = Math.round(g.spine * 100);
  $('#width-slider').value = Math.round(g.width * 100);
  const stats = getStats();
  $('#stats').innerHTML = Object.entries(stats).map(([k, v]) =>
    `<div class="stat"><span>${k.toUpperCase()}</span><div><i style="width:${Math.min(v, 12) / 12 * 100}%"></i></div><b>${v}</b></div>`).join('');
  $('#anatomy-note').textContent = `${BIOLOGY.diet[g.diet]} ${BIOLOGY.body[g.body]} ${BIOLOGY.mouth[g.mouth]} ${BIOLOGY.legs[g.legs]}`;
}

function openCreator(mode) {
  state.creatorMode = mode;
  const evolve = mode === 'evolve';
  $('#creator-eyebrow').textContent = evolve ? `EVOLUTION ${state.tier} · RESHAPE` : 'THE BIRTH POOL';
  $('#creator-heading').textContent = evolve ? `Reshape ${state.name}` : 'Build your first Oddkin';
  $('#creator-sub').textContent = evolve
    ? `You now have ${geneLimit()} genes to spend. Changes carry into the wild.`
    : 'Every trait changes how you survive. Evolving later earns more genes to reshape with.';
  $('#back-planets').classList.toggle('hidden', evolve);
  $('#creature-name').disabled = evolve;
  $('#begin-game').innerHTML = evolve ? 'RETURN TO THE WILD <b>→</b>' : 'HATCH <b>→</b>';
  if (!evolve) { state.tier = 0; state.adapt = freshAdapt(); }
  updateCreator();
  refreshPreview3D();
  showScreen('creator');
}

function showScreen(name) {
  state.screen = name;
  $$('.screen').forEach((s) => s.classList.remove('active'));
  $(`#${name}-screen`).classList.add('active');
  if (playerMesh) playerMesh.visible = name !== 'creator';
  if (name === 'planet') refreshContinue();
}

// ---------------------------------------------------------------------
// Creator preview (separate small renderer)
// ---------------------------------------------------------------------
const preview = $('#preview');
const PREVIEW_DEFAULT = { yaw: Math.PI + 0.35, pitch: 0.08, zoom: 7 };
const pv = { renderer: null, scene: null, camera: null, creature: null, yaw: PREVIEW_DEFAULT.yaw, pitch: PREVIEW_DEFAULT.pitch, zoom: PREVIEW_DEFAULT.zoom, zoomTarget: PREVIEW_DEFAULT.zoom, drag: false, mode: 'rotate', last: { x: 0, y: 0 } };
const pvRay = new THREE.Raycaster(), pvPointer = new THREE.Vector2();

function initPreview3D() {
  pv.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  pv.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  pv.renderer.shadowMap.enabled = true;
  pv.renderer.outputColorSpace = THREE.SRGBColorSpace;
  pv.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  pv.renderer.toneMappingExposure = 1.15;
  preview.appendChild(pv.renderer.domElement);
  pv.scene = new THREE.Scene();
  pv.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
  pv.scene.add(new THREE.HemisphereLight(0xfff7df, 0x24443c, 3));
  const key = new THREE.DirectionalLight(0xffefc9, 4);
  key.position.set(-4, 7, -4);
  key.castShadow = true;
  pv.scene.add(key);
  const rim = new THREE.DirectionalLight(0x83ffd7, 2);
  rim.position.set(5, 3, 4);
  pv.scene.add(rim);
  const platform = mesh(new THREE.CylinderGeometry(2.25, 2.5, 0.28, 48), mat(0x254d44, 0.72));
  platform.position.y = -0.15;
  pv.scene.add(platform);
  refreshPreview3D();

  const hitsFace = () => pvRay.intersectObject(pv.creature, true).some((h) => h.object.userData.editPart === 'face');
  const setPointer = (e) => {
    const r = preview.getBoundingClientRect();
    pvPointer.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1));
    pvRay.setFromCamera(pvPointer, pv.camera);
  };
  const endDrag = () => { pv.drag = false; pv.mode = 'rotate'; delete preview.dataset.mode; preview.classList.remove('dragging'); };
  preview.addEventListener('pointerdown', (e) => {
    setPointer(e);
    pv.mode = hitsFace() ? 'face' : 'rotate';
    pv.drag = true;
    pv.last = { x: e.clientX, y: e.clientY };
    preview.dataset.mode = pv.mode;
    preview.classList.add('dragging');
    preview.setPointerCapture(e.pointerId);
  });
  preview.addEventListener('pointermove', (e) => {
    if (!pv.drag) { setPointer(e); preview.dataset.hover = hitsFace() ? 'face' : 'body'; return; }
    const dx = e.clientX - pv.last.x, dy = e.clientY - pv.last.y;
    if (pv.mode === 'face') {
      // Rotate screen drag into the creature's local frame so the face follows the pointer from any angle.
      const facingCamera = Math.cos(pv.yaw) < 0 ? 1 : -1;
      state.genome.faceX = clamp(state.genome.faceX - dx * 0.55 * facingCamera, -30, 30);
      state.genome.faceY = clamp(state.genome.faceY + dy * 0.45, -24, 24);
      refreshPreview3D();
      refreshPlayer();
    } else {
      pv.yaw += dx * 0.009;
      pv.pitch = clamp(pv.pitch + dy * 0.006, -0.35, 0.45);
    }
    pv.last = { x: e.clientX, y: e.clientY };
  });
  preview.addEventListener('pointerleave', () => delete preview.dataset.hover);
  preview.addEventListener('pointerup', (e) => { endDrag(); if (preview.hasPointerCapture(e.pointerId)) preview.releasePointerCapture(e.pointerId); });
  preview.addEventListener('pointercancel', endDrag);
  preview.addEventListener('wheel', (e) => {
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? preview.clientHeight : 1;
    pv.zoomTarget = clamp(pv.zoomTarget + clamp(e.deltaY * unit, -100, 100) * 0.0035, 5.6, 9);
    e.preventDefault();
  }, { passive: false });
  preview.addEventListener('dblclick', () => { pv.yaw = PREVIEW_DEFAULT.yaw; pv.pitch = PREVIEW_DEFAULT.pitch; pv.zoomTarget = PREVIEW_DEFAULT.zoom; });
}
function refreshPreview3D() {
  if (!pv.scene) return;
  if (pv.creature) pv.scene.remove(pv.creature);
  const s = 1.15 * (state.creatorMode === 'evolve' ? 1 + state.tier * 0.03 : 1);
  pv.creature = makeCreature(state.genome, { scale: s, mut: mutationsFromAdapt(state.adapt) });
  pv.creature.position.y = 0.05;
  pv.scene.add(pv.creature);
}
function renderPreview(time) {
  if (!pv.renderer || state.screen !== 'creator') return;
  const r = preview.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height), pr = pv.renderer.getPixelRatio();
  if (pv.renderer.domElement.width !== Math.floor(w * pr) || pv.renderer.domElement.height !== Math.floor(h * pr)) {
    pv.renderer.setSize(w, h, false);
    pv.camera.aspect = w / h;
    pv.camera.updateProjectionMatrix();
  }
  pv.zoom = lerp(pv.zoom, pv.zoomTarget, 0.16);
  if (pv.creature) {
    pv.creature.rotation.y = pv.yaw + (pv.drag ? 0 : Math.sin(time * 0.35) * 0.08);
    pv.creature.rotation.x = pv.pitch;
    animateCreature(pv.creature, time, 0);
  }
  pv.camera.position.set(0, 2.1, pv.zoom);
  pv.camera.lookAt(0, 1.35, 0);
  pv.renderer.render(pv.scene, pv.camera);
}
/** Snapshot of the creature for the HUD badge. */
function capturePortrait() {
  if (!pv.renderer) return;
  const saved = { yaw: pv.yaw, pitch: pv.pitch };
  refreshPreview3D();
  pv.renderer.setSize(160, 160, false);
  pv.camera.aspect = 1;
  pv.camera.updateProjectionMatrix();
  pv.creature.rotation.set(0, Math.PI + 0.45, 0);
  pv.camera.position.set(0, 2.2, 5.6);
  pv.camera.lookAt(0, 1.5, 0);
  pv.renderer.render(pv.scene, pv.camera);
  try { $('#portrait').src = pv.renderer.domElement.toDataURL('image/png'); } catch { /* ignore */ }
  pv.renderer.domElement.width = 0; // forces a resize on next preview frame
  Object.assign(pv, saved);
}

// ---------------------------------------------------------------------
// World
// ---------------------------------------------------------------------
const canvas = $('#game');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch {
  $('#webgl-error').classList.remove('hidden');
  throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 500);
const worldRoot = new THREE.Group();
scene.add(worldRoot);
const sky = { hemi: null, sun: null, day: 1, lastDay: 1 };
let inExpedition = false, playerMesh = null, obstacles = [], hazards = [], nestRing = null;
const keys = {};
const motion = { velocity: new THREE.Vector3(), yaw: Math.PI, pitch: 0.38, distance: 10.5, dragging: false, lastX: 0, lastY: 0, lunge: 0, attackCd: 0 };

// Stars (visible at night)
const stars = (() => {
  const rnd = seeded(42), pts = [];
  for (let i = 0; i < 700; i++) {
    const u = rnd() * TAU, v = rnd() * 0.9 + 0.08;
    const r = 260;
    pts.push(Math.cos(u) * Math.cos(v * Math.PI / 2) * r, Math.sin(v * Math.PI / 2) * r, Math.sin(u) * Math.cos(v * Math.PI / 2) * r);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const m = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const p = new THREE.Points(g, m);
  scene.add(p);
  return p;
})();

// Particles (one instanced mesh, recycled)
const particles = (() => {
  const COUNT = 220;
  const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.09, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), COUNT);
  im.frustumCulled = false;
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const list = Array.from({ length: COUNT }, () => ({ life: 0, max: 1, pos: new THREE.Vector3(), vel: new THREE.Vector3(), size: 1 }));
  for (let i = 0; i < COUNT; i++) { im.setMatrixAt(i, tm(0, -999, 0, 0, 0, 0, 0)); im.setColorAt(i, _c.set(0xffffff)); }
  scene.add(im);
  let cursor = 0;
  return {
    burst(x, y, z, color, n = 14, speed = 3, up = 3) {
      for (let k = 0; k < n; k++) {
        const p = list[cursor];
        p.life = p.max = 0.6 + Math.random() * 0.5;
        p.pos.set(x, y, z);
        p.vel.set((Math.random() - 0.5) * speed, Math.random() * up + 1, (Math.random() - 0.5) * speed);
        p.size = 0.7 + Math.random() * 1.1;
        im.setColorAt(cursor, _c.set(color));
        cursor = (cursor + 1) % COUNT;
      }
      im.instanceColor.needsUpdate = true;
    },
    update(dt) {
      for (let i = 0; i < COUNT; i++) {
        const p = list[i];
        if (p.life <= 0) continue;
        p.life -= dt;
        p.vel.y -= 7 * dt;
        p.pos.addScaledVector(p.vel, dt);
        const s = Math.max(0, p.life / p.max) * p.size;
        im.setMatrixAt(i, p.life > 0 ? tm(p.pos.x, p.pos.y, p.pos.z, 0, 0, 0, s) : tm(0, -999, 0, 0, 0, 0, 0));
      }
      im.instanceMatrix.needsUpdate = true;
    }
  };
})();

function clearWorld() {
  worldRoot.traverse((o) => {
    if (o.userData.dispose) { o.dispose?.(); if (o.userData.ownGeometry) o.geometry.dispose(); if (o.userData.ownMaterial) o.material.dispose(); }
  });
  while (worldRoot.children.length) worldRoot.remove(worldRoot.children[0]);
  obstacles = [];
  hazards = [];
  state.entities = [];
  playerMesh = null;
}

function addTree(sc, p, rnd, x, z) {
  const s = 0.7 + rnd() * 1.2, ry = rnd() * TAU, y = terrainHeight(x, z);
  const root = tm(x, y, z, 0, ry, 0, s);
  const part = (key, g, m, local, color, cast = true) => sc.add(key, g, m, root.clone().multiply(local), color, cast);
  const leaf = () => new THREE.Color(pick(rnd, p.leaf)).offsetHSL((rnd() - 0.5) * 0.03, 0, (rnd() - 0.5) * 0.08).getHex();
  if (p.tree === 'round') {
    part('trunk', geo('trunk', () => new THREE.CylinderGeometry(0.2, 0.42, 2.8, 7)), mat(0xffffff, 0.9, 0, { flat: true }), tm(0, 1.4, 0, 0, 0, (rnd() - 0.5) * 0.12), p.trunk);
    const crowns = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < crowns; i++) {
      const a = (i / crowns) * TAU + rnd();
      const cs = 0.9 + rnd() * 0.5;
      part('crown', geo('crown', () => new THREE.IcosahedronGeometry(1, 0)), mat(0xffffff, 0.88, 0, { flat: true }),
        tm(Math.cos(a) * 0.65, 3 + rnd() * 0.7, Math.sin(a) * 0.55, rnd(), rnd(), 0, cs * 1.1, cs * 0.9, cs), leaf());
    }
  } else if (p.tree === 'spire') {
    part('trunk', geo('trunk', () => new THREE.CylinderGeometry(0.2, 0.42, 2.8, 7)), mat(0xffffff, 0.9, 0, { flat: true }), tm(0, 1.4, 0, 0, 0, (rnd() - 0.5) * 0.2), p.trunk);
    for (let i = 0; i < 2; i++) {
      part('spire', geo('spire', () => new THREE.ConeGeometry(1, 2.2, 6)), mat(0xffffff, 0.7, 0x5a1800, { flat: true, glow: 0.5 }),
        tm((rnd() - 0.5) * 0.3, 2.9 + i * 1.1, 0, 0, rnd(), 0, 1 - i * 0.3), leaf());
    }
  } else if (p.tree === 'mushroom') {
    part('stalk', geo('stalk-m', () => new THREE.CylinderGeometry(0.22, 0.34, 2.4, 8)), mat(0xffffff, 0.6, 0x223355, { glow: 0.4 }), tm(0, 1.2, 0, 0, 0, (rnd() - 0.5) * 0.2), p.trunk);
    part('cap', geo('cap', () => new THREE.SphereGeometry(1.4, 14, 8, 0, TAU, 0, Math.PI / 2)), mat(0xffffff, 0.45, 0x1a7a66, { flat: true, glow: 0.9 }),
      tm(0, 2.3, 0, 0, 0, 0, 1, 0.6 + rnd() * 0.3, 1), leaf());
  } else {
    const c = leaf();
    part('cactus', geo('cactus', () => new THREE.CapsuleGeometry(0.34, 2.1, 6, 10)), mat(0xffffff, 0.8, 0, { flat: true }), tm(0, 1.4, 0), c);
    for (const side of [-1, 1]) {
      if (rnd() < 0.3) continue;
      const h = 1.1 + rnd() * 0.8;
      part('cactus-arm', geo('cactus-arm', () => new THREE.CapsuleGeometry(0.2, 0.7, 6, 8)), mat(0xffffff, 0.8, 0, { flat: true }), tm(side * 0.6, h + 0.35, 0), c);
      part('cactus-arm', geo('cactus-arm', () => new THREE.CapsuleGeometry(0.2, 0.7, 6, 8)), mat(0xffffff, 0.8, 0, { flat: true }), tm(side * 0.35, h, 0, 0, 0, Math.PI / 2, 0.8), c);
    }
  }
  if (s > 0.9) obstacles.push({ x, z, r: (p.tree === 'cactus' ? 0.6 : 1.1) * s });
}

function buildWorld(play = true) {
  clearWorld();
  inExpedition = play;
  const p = PLANETS[state.planet];
  const rnd = seeded(800 + state.planet * 541);
  scene.background = new THREE.Color(p.sky);
  scene.fog = new THREE.FogExp2(p.fog, 0.0095);

  sky.hemi = new THREE.HemisphereLight(0xfff4d6, p.ground, 2.2);
  sky.sun = new THREE.DirectionalLight(0xfff0c2, 3.2);
  sky.sun.castShadow = true;
  sky.sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sky.sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, far: 160 });
  sky.sun.shadow.bias = -0.0006;
  worldRoot.add(sky.hemi, sky.sun, sky.sun.target);

  // Terrain with vertex-color noise
  const g = new THREE.PlaneGeometry(190, 190, 110, 110);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, cols = [];
  const baseC = new THREE.Color(p.ground), light = baseC.clone().offsetHSL(0.025, 0.03, 0.09), darkC = baseC.clone().offsetHSL(-0.015, 0.02, -0.08);
  const lavaScorch = new THREE.Color(0x2a1612), nestClearing = new THREE.Color(p.ground).offsetHSL(0, -0.05, 0.12);
  const lavaSpots = p.lava ? [[27, -22, 9], [-38, 30, 7], [44, 34, 6], [-20, -52, 7]] : [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, terrainHeight(x, z));
    const n = Math.sin(x * 0.19) * Math.cos(z * 0.17) * 0.5 + 0.5;
    const c = darkC.clone().lerp(light, n * 0.7 + 0.15);
    for (const [lx, lz, lr] of lavaSpots) {
      const d = dist(x, z, lx, lz);
      if (d < lr + 5) c.lerp(lavaScorch, (1 - smoothstep(d, lr, lr + 5)) * 0.85);
    }
    if (dist(x, z, 0, 0) < 9) c.lerp(nestClearing, (1 - smoothstep(dist(x, z, 0, 0), 4, 9)) * 0.6);
    cols.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.computeVertexNormals();
  const terrain = mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), false);
  terrain.userData.dispose = terrain.userData.ownGeometry = true;
  worldRoot.add(terrain);

  // Water / lava
  const pools = p.lava ? lavaSpots : [[27, -22, 9]];
  for (const [x, z, r] of pools) {
    const poolMat = p.lava
      ? mat(0xff6a2a, 0.4, 0xff3a00, { glow: 1.4 })
      : new THREE.MeshPhysicalMaterial({ color: p.water, transparent: true, opacity: 0.7, roughness: 0.12, emissive: p.glow ? p.water : 0, emissiveIntensity: p.glow ? 0.35 : 0 });
    const pool = mesh(geo(`pool${r}`, () => new THREE.CircleGeometry(r, 40)), poolMat, false);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x, terrainHeight(x, z) + 0.18, z);
    if (!p.lava) pool.userData.dispose = pool.userData.ownMaterial = true;
    worldRoot.add(pool);
    if (p.lava) hazards.push({ x, z, r: r - 0.6 });
  }

  // Nest (safe zone)
  const nest = new THREE.Group();
  for (let i = 0; i < 18; i++) {
    const stick = mesh(geo('stick', () => new THREE.CylinderGeometry(0.06, 0.08, 2.3, 5)), mat(0x745131));
    stick.rotation.set(Math.PI / 2, (i % 3) * 0.2, (i / 18) * TAU);
    stick.position.set(Math.cos((i / 18) * TAU) * 1.2, 0.1, Math.sin((i / 18) * TAU) * 1.2);
    nest.add(stick);
  }
  nest.position.set(0, terrainHeight(0, 0) + 0.1, 0);
  worldRoot.add(nest);
  nestRing = new THREE.Mesh(geo('nest-ring', () => new THREE.RingGeometry(NEST_RADIUS - 0.25, NEST_RADIUS, 64)), new THREE.MeshBasicMaterial({ color: p.accent, transparent: true, opacity: 0.35, depthWrite: false }));
  nestRing.rotation.x = -Math.PI / 2;
  nestRing.position.set(0, terrainHeight(0, 0) + 0.6, 0);
  worldRoot.add(nestRing);

  // Flora
  const sc = new Scatter();
  const clear = (x, z) => dist(x, z, 0, 0) > 8 && !pools.some(([px, pz, pr]) => dist(x, z, px, pz) < pr + 2);
  const treeCount = p.tree === 'cactus' ? 70 : 130;
  for (let i = 0; i < treeCount; i++) {
    const a = rnd() * TAU, d = 10 + Math.sqrt(rnd()) * 78, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (clear(x, z)) addTree(sc, p, rnd, x, z);
  }
  // Ring of trees/rocks marking the world edge
  for (let i = 0; i < 70; i++) {
    const a = (i / 70) * TAU + rnd() * 0.05, d = WORLD_RADIUS + 4 + rnd() * 5;
    addTree(sc, p, rnd, Math.cos(a) * d, Math.sin(a) * d);
  }
  for (let i = 0; i < 55; i++) {
    const a = rnd() * TAU, d = 9 + Math.sqrt(rnd()) * 80, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (!clear(x, z)) continue;
    const s = 0.6 + rnd() * 1.6;
    sc.add('rock', geo('rock', () => new THREE.DodecahedronGeometry(1, 0)), mat(0xffffff, 0.9, 0, { flat: true }),
      tm(x, terrainHeight(x, z) + s * 0.1, z, rnd(), rnd() * TAU, rnd() * 0.3, s * 1.15, s * (0.45 + rnd() * 0.45), s * 0.9),
      new THREE.Color(p.rock).offsetHSL(0, 0, (rnd() - 0.5) * 0.08).getHex());
    if (s > 1.1) obstacles.push({ x, z, r: s * 0.95 });
  }
  const grassMat = mat(0xffffff, 0.92, p.glow ? p.accent : 0, { glow: 0.35 });
  const grassCount = p.tree === 'cactus' ? 700 : 1700;
  const grassBase = new THREE.Color(p.tree === 'cactus' ? 0xc9b36a : p.accent);
  for (let i = 0; i < grassCount; i++) {
    const a = rnd() * TAU, d = 3 + Math.sqrt(rnd()) * 84, x = Math.cos(a) * d, z = Math.sin(a) * d;
    const h = 0.5 + rnd() * 0.9;
    sc.add('grass', geo('grass', () => new THREE.ConeGeometry(0.07, 1, 4)), grassMat,
      tm(x, terrainHeight(x, z) + h * 0.45, z, (rnd() - 0.5) * 0.3, rnd() * TAU, (rnd() - 0.5) * 0.3, 0.8, h, 0.5),
      grassBase.clone().offsetHSL((rnd() - 0.5) * 0.04, 0, (rnd() - 0.5) * 0.18).getHex(), false);
  }
  for (let i = 0; i < 160; i++) {
    const a = rnd() * TAU, d = 5 + Math.sqrt(rnd()) * 80, x = Math.cos(a) * d, z = Math.sin(a) * d;
    const y = terrainHeight(x, z), s = 0.7 + rnd() * 0.8;
    sc.add('stem', geo('stem', () => new THREE.CylinderGeometry(0.025, 0.035, 0.45, 5)), mat(0x4f994d), tm(x, y + 0.22 * s, z, 0, 0, 0, s), 0xffffff, false);
    sc.add('bloom', geo('bloom', () => new THREE.IcosahedronGeometry(0.16, 0)), mat(0xffffff, 0.6, p.glow || p.lava ? 0x444444 : 0, { flat: true, glow: 0.8 }),
      tm(x, y + 0.5 * s, z, rnd(), rnd(), 0, s, s * 0.7, s), pick(rnd, p.flowers), false);
  }
  sc.build(worldRoot);

  if (play) spawnGameplay();
  else {
    playerMesh = makeCreature(state.genome, { scale: 2, mut: mutationsFromAdapt(state.adapt) });
    playerMesh.position.set(0, terrainHeight(0, 0), 0);
    worldRoot.add(playerMesh);
  }
}

// ---------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------
function randomSpot(rnd, minD, maxD, avoidNest = 10) {
  for (let t = 0; t < 30; t++) {
    const a = rnd() * TAU, d = minD + Math.sqrt(rnd()) * (maxD - minD), x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (dist(x, z, 0, 0) < avoidNest) continue;
    if (hazards.some((h) => dist(x, z, h.x, h.z) < h.r + 2)) continue;
    if (obstacles.some((o) => dist(x, z, o.x, o.z) < o.r + 1)) continue;
    return { x, z };
  }
  return { x: minD, z: 0 };
}

function spawnCreature(sp, x, z, opts = {}) {
  const tierHp = 1 + state.tier * 0.18;
  const obj = makeCreature(sp.genome, { scale: sp.size, cheapShadows: true });
  obj.position.set(x, terrainHeight(x, z), z);
  worldRoot.add(obj);
  const e = {
    type: 'creature', sp, x, z, angle: Math.random() * TAU, hp: Math.round(sp.hp * tierHp), maxHp: Math.round(sp.hp * tierHp),
    mode: 'wander', mesh: obj, homeX: opts.homeX ?? x, homeZ: opts.homeZ ?? z, cd: 0, callCd: 0, turnT: 0,
    ally: false, dead: false, dying: 0, provoked: 0, stride: 0, offset: Math.random() * 10, pop: 0
  };
  state.entities.push(e);
  return e;
}

function spawnHerd(sp, rnd, minD = 16) {
  const spot = randomSpot(rnd, sp.temper === 'predator' ? Math.max(28, minD) : minD, 78, sp.temper === 'predator' ? 24 : 12);
  const n = sp.herdSize[0] + Math.floor(rnd() * (sp.herdSize[1] - sp.herdSize[0] + 1));
  for (let i = 0; i < n; i++) spawnCreature(sp, spot.x + (rnd() - 0.5) * 5, spot.z + (rnd() - 0.5) * 5, { homeX: spot.x, homeZ: spot.z });
}

function makeBone() {
  const g = new THREE.Group(), ivory = mat(0xfff0bd, 0.45, 0x594712);
  const shaft = mesh(geo('bone-shaft', () => new THREE.CylinderGeometry(0.14, 0.14, 1.2, 10)), ivory);
  shaft.rotation.z = Math.PI / 2;
  g.add(shaft);
  for (const x of [-0.64, 0.64]) for (const z of [-0.13, 0.13]) {
    const end = mesh(geo('bone-end', () => new THREE.SphereGeometry(0.22, 12, 9)), ivory);
    end.position.set(x, 0, z);
    g.add(end);
  }
  const ring = mesh(geo('bone-ring', () => new THREE.TorusGeometry(0.9, 0.035, 8, 30)), new THREE.MeshBasicMaterial({ color: 0xe7ff70, transparent: true, opacity: 0.7 }), false);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.28;
  g.add(ring);
  // Tall faint beacon so bones read from a distance.
  const beam = new THREE.Mesh(geo('beam', () => new THREE.CylinderGeometry(0.12, 0.12, 14, 6, 1, true)), new THREE.MeshBasicMaterial({ color: 0xe7ff70, transparent: true, opacity: 0.16, depthWrite: false, fog: false }));
  beam.position.y = 7;
  beam.visible = false;
  g.add(beam);
  g.userData.beam = beam;
  g.scale.setScalar(1.2);
  return g;
}
function makeFood(kind) {
  const g = new THREE.Group();
  const p = PLANETS[state.planet];
  if (kind === 'plant') {
    const fruit = mesh(geo('fruit', () => new THREE.SphereGeometry(0.32, 16, 12)), p.glow ? mat(0x7ae0ff, 0.4, 0x1a8aa0, { glow: 0.9 }) : mat(0xe45b66, 0.55));
    fruit.scale.y = 0.82;
    const leafM = mesh(geo('fruit-leaf', () => new THREE.SphereGeometry(0.18, 10, 7)), mat(0x4f9c50), false);
    leafM.scale.set(1.5, 0.25, 0.75);
    leafM.position.set(0.12, 0.32, 0);
    g.add(fruit, leafM);
  } else {
    const meat = mesh(geo('meat', () => new THREE.CapsuleGeometry(0.22, 0.55, 8, 12)), mat(0xd97868, 0.62));
    meat.rotation.z = Math.PI / 2;
    const bone = mesh(geo('meat-bone', () => new THREE.CylinderGeometry(0.07, 0.07, 0.95, 7)), mat(0xf2dfb7), false);
    bone.rotation.z = Math.PI / 2;
    g.add(meat, bone);
  }
  return g;
}
function spawnItem(type, x, z, kind) {
  const obj = type === 'bone' ? makeBone() : makeFood(kind);
  obj.position.set(x, terrainHeight(x, z) + 0.5, z);
  worldRoot.add(obj);
  const e = { type, kind, x, z, taken: false, mesh: obj, phase: Math.random() * TAU, age: 0 };
  state.entities.push(e);
  return e;
}

function spawnGameplay() {
  const rnd = seeded(4200 + state.planet * 131 + state.tier * 17);
  state.species = makeSpecies(state.planet);
  motion.velocity.set(0, 0, 0);
  playerMesh = makeCreature(state.genome, { scale: playerScale(), mut: mutationsFromAdapt(state.adapt) });
  playerMesh.position.set(state.player.x, terrainHeight(state.player.x, state.player.z), state.player.z);
  worldRoot.add(playerMesh);

  for (const sp of state.species) for (let h = 0; h < sp.herds; h++) spawnHerd(sp, rnd);
  for (let i = 0; i < Math.min(state.tier, 3); i++) spawnHerd(state.species[5], rnd, 30);

  spawnItem('bone', 4, 0);
  for (let i = 0; i < 20; i++) { const s = randomSpot(rnd, 8, 78, 6); spawnItem('bone', s.x, s.z); }
  const p = PLANETS[state.planet];
  for (let i = 0; i < 44; i++) {
    // Aridia's fruit clusters around the oasis
    const s = p.tree === 'cactus' && i < 16 ? { x: 27 + Math.cos(i) * (10 + rnd() * 5), z: -22 + Math.sin(i) * (10 + rnd() * 5) } : randomSpot(rnd, 5, 78, 4);
    spawnItem('food', s.x, s.z, rnd() > 0.68 ? 'meat' : 'plant');
  }
}

function refreshPlayer() {
  if (!playerMesh) return;
  const { x, z } = playerMesh.position, ry = playerMesh.rotation.y;
  worldRoot.remove(playerMesh);
  playerMesh = makeCreature(state.genome, { scale: inExpedition ? playerScale() : 2, mut: mutationsFromAdapt(state.adapt) });
  playerMesh.position.set(x, terrainHeight(x, z), z);
  playerMesh.rotation.y = ry;
  playerMesh.visible = state.screen !== 'creator';
  worldRoot.add(playerMesh);
}

// ---------------------------------------------------------------------
// Game flow
// ---------------------------------------------------------------------
function resetRun() {
  Object.assign(state, { tier: 0, adapt: freshAdapt(), bones: 0, boneGoal: 5, clock: DAY_LENGTH * 0.08, victory: false, keepExploring: false });
  state.stats = { friends: 0, defeats: 0, bones: 0, time: 0 };
  state.journal = new Set();
  state.player.x = state.player.z = 0;
}

function startGame() {
  state.name = $('#creature-name').value.trim() || 'Pip';
  resetRun();
  state.health = maxHealth();
  state.hunger = 100;
  buildWorld(true);
  enterPlay();
  toast(`Welcome to ${PLANETS[state.planet].name}, ${state.name}! Your first bone glows near the nest.`, 'good');
  save();
}

function enterPlay() {
  state.paused = false;
  capturePortrait();
  motion.yaw = Math.PI;
  camera.position.set(state.player.x, 12, state.player.z + 12);
  showScreen('play');
  updateHud();
}

function returnFromReshape() {
  state.health = Math.min(state.health, maxHealth());
  refreshPlayer();
  enterPlay();
  toast(`${state.name} returns, reshaped.`, 'good');
  save();
}

function continueGame() {
  const data = loadSave();
  if (!data) return;
  Object.assign(state, {
    planet: data.planet, name: data.name, genome: { ...defaultGenome(), ...data.genome }, tier: data.tier,
    adapt: { ...freshAdapt(), ...data.adapt }, bones: data.bones, boneGoal: data.boneGoal, health: data.health, hunger: data.hunger,
    clock: data.clock, stats: { ...state.stats, ...data.stats }, journal: new Set(data.journal), victory: !!data.victory, keepExploring: !!data.keepExploring
  });
  state.player.x = state.player.z = 0;
  $('#creature-name').value = state.name;
  state.creatorMode = 'new';
  buildWorld(true);
  for (const id of data.allies || []) {
    const sp = state.species[id];
    if (!sp) continue;
    const e = spawnCreature(sp, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    befriend(e, true);
  }
  enterPlay();
  toast(`Welcome back, ${state.name}. Day ${Math.floor(state.clock / DAY_LENGTH) + 1} on ${PLANETS[state.planet].name}.`, 'good');
}

function abandon() {
  clearSave();
  state.paused = false;
  $$('.modal').forEach((m) => m.classList.add('hidden'));
  endCall(false);
  resetRun();
  state.genome = defaultGenome();
  $('#creature-name').value = 'Pip';
  state.health = 100;
  buildWorld(false);
  showScreen('planet');
  updateCreator();
}

function pause(on) {
  if (state.screen !== 'play') return;
  if (!$('#evolve-modal').classList.contains('hidden') || !$('#victory-modal').classList.contains('hidden')) return;
  state.paused = on;
  clearInput();
  if (on) { endCall(false); renderJournal(); }
  $('#pause-modal').classList.toggle('hidden', !on);
  if (on) $('#resume-btn').focus();
}

function renderJournal() {
  const s = state.stats;
  const summary = [
    [`${state.tier}/${MAX_TIER}`, 'EVOLUTIONS'], [state.journal.size + '/' + state.species.length, 'SPECIES'],
    [s.friends, 'BEFRIENDED'], [s.defeats, 'DEFEATED']
  ];
  $('#journal-summary').innerHTML = summary.map(([v, k]) => `<div><b>${v}</b><small>${k}</small></div>`).join('');
  $('#journal-list').innerHTML = state.species.map((sp) => state.journal.has(sp.id)
    ? `<div class="journal-entry"><i style="background:${sp.genome.color}"></i><div><strong>${sp.name.toUpperCase()}</strong><em class="${sp.temper}">${TEMPER[sp.temper].label}</em><p>${speciesNote(sp)}</p></div></div>`
    : '<div class="journal-entry unknown"><i style="background:#bbb"></i><div><strong>UNKNOWN SPECIES</strong><p>Explore further to observe it.</p></div></div>').join('');
}

// ---------------------------------------------------------------------
// Evolution
// ---------------------------------------------------------------------
function openEvolution() {
  if (state.bones < state.boneGoal || state.screen !== 'play' || state.paused) return;
  endCall(false);
  state.paused = true;
  clearInput();
  const rnd = seeded(77 + state.tier * 13 + state.planet);
  const options = ADAPTATIONS.filter((a) => state.adapt[a.id] < MAX_RANK).sort(() => rnd() - 0.5).slice(0, 3);
  if (!options.length) { state.paused = false; toast('Every adaptation is maxed out. You are complete.', 'good'); return; }
  $('#evolve-eyebrow').textContent = state.tier >= MAX_TIER ? 'BONUS EVOLUTION' : `EVOLUTION ${state.tier + 1} OF ${MAX_TIER}`;
  $('#evolve-title').textContent = 'Choose an adaptation';
  $('#evolve-sub').textContent = 'Your discoveries have unlocked a permanent trait.';
  $('#evolution-options').innerHTML = options.map((o) =>
    `<button class="evolution-option" data-id="${o.id}"><span aria-hidden="true">${o.icon}</span><strong>${o.name} · RANK ${state.adapt[o.id] + 1}</strong><small>${o.text}</small></button>`).join('');
  $$('.evolution-option').forEach((b) => b.addEventListener('click', () => applyEvolution(ADAPTATIONS.find((a) => a.id === b.dataset.id))));
  $('#evolve-modal').classList.remove('hidden');
  $('.evolution-option').focus();
}

function applyEvolution(a) {
  state.tier++;
  state.adapt[a.id]++;
  state.bones -= state.boneGoal;
  state.boneGoal += 2;
  const mh = maxHealth();
  state.health = mh;
  refreshPlayer();
  sfx.evolve();
  const pp = playerMesh.position;
  particles.burst(pp.x, pp.y + 2, pp.z, 0xe7ff70, 40, 6, 5);
  // The world pushes back: another predator pack moves in.
  spawnHerd(state.species[5], Math.random, 30);
  save();

  if (state.tier >= MAX_TIER && !state.victory) {
    $('#evolve-modal').classList.add('hidden');
    showVictory();
    return;
  }
  $('#evolve-eyebrow').textContent = `EVOLUTION ${state.tier} COMPLETE`;
  $('#evolve-title').textContent = `${a.name} awakened`;
  $('#evolve-sub').textContent = `You now have ${geneLimit()} genes (+10). Reshape your body in the Birth Pool, or head straight back out.`;
  $('#evolution-options').innerHTML = `
    <button class="evolution-option" data-next="reshape"><span aria-hidden="true">🧬</span><strong>RESHAPE</strong><small>Spend your new genes on diet, body, and limbs.</small></button>
    <button class="evolution-option wide" data-next="wild"><span aria-hidden="true">🌿</span><strong>BACK TO THE WILD</strong><small>Keep your current form. You can reshape at your next evolution.</small></button>`;
  $$('[data-next]').forEach((b) => b.addEventListener('click', () => {
    $('#evolve-modal').classList.add('hidden');
    if (b.dataset.next === 'reshape') openCreator('evolve');
    else { state.paused = false; updateHud(); toast(`Evolution ${state.tier}: ${a.name} rank ${state.adapt[a.id]}!`, 'good'); }
  }));
  $('.evolution-option').focus();
  updateHud();
}

function showVictory() {
  state.victory = true;
  state.paused = true;
  const s = state.stats, p = PLANETS[state.planet];
  $('#victory-title').textContent = `Apex of ${p.name}`;
  const pack = state.entities.filter((e) => e.ally && !e.dead).length;
  $('#victory-sub').textContent = `${state.name} has evolved five times and now shapes life on ${p.name}. ${pack ? `A pack of ${pack} runs at your side.` : 'You made it alone — a true solitary apex.'}`;
  $('#victory-stats').innerHTML = [
    [Math.floor(s.time / 60) + 'm', 'EXPEDITION'], [s.friends, 'BEFRIENDED'], [s.defeats, 'DEFEATED'], [`${state.journal.size}/${state.species.length}`, 'SPECIES']
  ].map(([v, k]) => `<div><b>${v}</b><small>${k}</small></div>`).join('');
  $('#victory-modal').classList.remove('hidden');
  $('#keep-exploring').focus();
  save();
}

// ---------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------
function nearest(filter, radius) {
  let best = null, bestD = radius;
  for (const e of state.entities) {
    if (!filter(e)) continue;
    const d = dist(e.x, e.z, state.player.x, state.player.z);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}
const isWild = (e) => e.type === 'creature' && !e.dead && !e.ally;
const isItem = (e) => (e.type === 'bone' || e.type === 'food') && !e.taken;

function interact(action) {
  if (state.screen !== 'play' || state.paused) return;
  if (action === 'collect') collect();
  else if (action === 'friend') call.active ? callPress() : startCall();
  else if (action === 'attack') attack();
}

function collect() {
  const t = nearest(isItem, 3.8);
  if (!t) { toast('Move closer to food or a glowing bone'); return; }
  if (t.type === 'bone') {
    t.taken = true;
    t.mesh.visible = false;
    awardBone('Evolution bone collected!');
    sfx.pickup();
    particles.burst(t.x, t.mesh.position.y, t.z, 0xe7ff70, 18);
    return;
  }
  if (!canEat(t.kind)) { toast(`Your ${TRAITS.diet[state.genome.diet][0].toLowerCase()} gut can't digest that`, 'bad'); return; }
  t.taken = true;
  t.mesh.visible = false;
  const d = state.genome.diet;
  const gain = d === 1 || (state.adapt.gut >= 2 && !((d === 0 && t.kind === 'plant') || (d === 2 && t.kind === 'meat'))) ? 24 : t.kind === 'meat' ? 36 : 30;
  state.hunger = Math.min(100, state.hunger + gain);
  state.health = Math.min(maxHealth(), state.health + 8);
  sfx.eat();
  particles.burst(t.x, t.mesh.position.y, t.z, t.kind === 'plant' ? 0x9be36b : 0xff9a7a, 10, 2, 2);
  toast(t.kind === 'plant' ? `Fruit! +${gain} hunger` : `Protein! +${gain} hunger`);
}

function awardBone(message) {
  state.bones++;
  state.stats.bones++;
  if (message) toast(state.bones === state.boneGoal ? 'Your DNA is ready — press V to evolve!' : message, 'good');
  updateHud();
}

function attack() {
  if (motion.attackCd > 0) return;
  motion.attackCd = 0.5;
  motion.lunge = 1;
  const t = nearest(isWild, 3.4 + playerScale());
  sfx.bite();
  if (!t) return;
  const dmg = getStats().attack + Math.floor(Math.random() * 3);
  damageCreature(t, dmg, true);
}

function damageCreature(t, dmg, byPlayer) {
  t.hp -= dmg;
  t.provoked = 12;
  t.pop = 1;
  particles.burst(t.x, t.mesh.position.y + 1.5 * t.sp.size, t.z, 0xffffff, 8, 3, 2);
  // Herd reacts: fighters rally, prey scatter.
  for (const o of state.entities) {
    if (o !== t && isWild(o) && o.sp === t.sp && dist(o.x, o.z, t.x, t.z) < 12) o.provoked = 10;
  }
  if (t.hp > 0) return;
  t.dead = true;
  t.dying = 0.45;
  state.stats.defeats++;
  spawnItem('food', t.x, t.z, 'meat');
  awardBone(`${t.sp.name} defeated. DNA gained.`);
  if (byPlayer && state.target === t) state.target = null;
}

// Harmony call: press F while the pulse sweeps through the green arc.
const call = { active: false, target: null, angle: 0, speed: 3.4, zone: 0, width: 1, hits: 0, misses: 0, flash: 0, flashColor: '' };
const callCanvas = $('#call-canvas'), callCtx = callCanvas.getContext('2d');

function startCall() {
  const t = nearest(isWild, 5.5);
  if (!t) { toast('Get closer to a wild creature to call to it'); return; }
  if (state.entities.filter((e) => e.ally && !e.dead).length >= packMax()) { toast(`Your pack is full (${packMax()}). Evolve Kindred Call for more room.`, 'bad'); return; }
  if (t.callCd > 0) { toast(`${t.sp.name} is ignoring you for now`); return; }
  if (t.mode === 'chase' && t.provoked > 0) { toast(`${t.sp.name} is too riled up to listen!`, 'bad'); return; }
  const social = getStats().social;
  Object.assign(call, {
    active: true, target: t, angle: -Math.PI / 2, hits: 0, misses: 0, flash: 0,
    speed: 3.2 + (TEMPER[t.sp.temper].hostile ? 0.8 : 0) + state.tier * 0.1,
    width: clamp(TEMPER[t.sp.temper].window + social * 0.045 + state.adapt.kindred * 0.18, 0.45, 2.2)
  });
  call.zone = call.angle + 1.6 + Math.random() * 2.4;
  t.mode = 'listen';
  $('#call').classList.remove('hidden');
  $('#call-text').innerHTML = `Calling ${t.sp.name}: press <b>F</b> in the green`;
}
function inZone() {
  const d = angleDelta(call.zone, call.angle);
  return Math.abs(d) <= call.width / 2;
}
function callPress() {
  if (!call.active) return;
  if (inZone()) {
    sfx.beat(call.hits);
    call.hits++;
    call.flash = 1; call.flashColor = '#d5f164';
    particles.burst(call.target.x, call.target.mesh.position.y + 2.2, call.target.z, 0xff8bd1, 6, 1.5, 2);
    if (call.hits >= 3) { befriend(call.target); endCall(true); return; }
    call.zone = call.angle + 1.4 + Math.random() * 2.8;
  } else {
    sfx.miss();
    call.misses++;
    call.flash = 1; call.flashColor = '#ff7058';
    if (call.misses >= 2) {
      const t = call.target;
      endCall(false);
      t.callCd = 8;
      if (TEMPER[t.sp.temper].hostile) { t.provoked = 8; toast(`${t.sp.name} took that as a threat!`, 'bad'); }
      else { t.provoked = 5; toast(`${t.sp.name} lost interest.`, 'bad'); }
    }
  }
}
function endCall() {
  if (call.target && call.target.mode === 'listen') call.target.mode = 'wander';
  call.active = false;
  call.target = null;
  $('#call').classList.add('hidden');
}
function drawCall(dt) {
  if (!call.active) return;
  call.angle += call.speed * dt;
  call.flash = Math.max(0, call.flash - dt * 3);
  const c = callCtx, W = callCanvas.width, cx = W / 2, r = W * 0.36;
  c.clearRect(0, 0, W, W);
  c.lineCap = 'round';
  c.lineWidth = 22;
  c.strokeStyle = 'rgba(7,27,25,.6)';
  c.beginPath(); c.arc(cx, cx, r, 0, TAU); c.stroke();
  c.strokeStyle = '#7fffc4';
  c.beginPath(); c.arc(cx, cx, r, call.zone - call.width / 2, call.zone + call.width / 2); c.stroke();
  c.fillStyle = '#fff';
  const px = cx + Math.cos(call.angle) * r, py = cx + Math.sin(call.angle) * r;
  c.beginPath(); c.arc(px, py, 16, 0, TAU); c.fill();
  if (call.flash > 0) {
    c.globalAlpha = call.flash;
    c.fillStyle = call.flashColor;
    c.beginPath(); c.arc(cx, cx, r - 26, 0, TAU); c.fill();
    c.globalAlpha = 1;
  }
  for (let i = 0; i < 3; i++) {
    c.fillStyle = i < call.hits ? '#d5f164' : 'rgba(255,255,255,.3)';
    c.beginPath(); c.arc(cx + (i - 1) * 34, cx, 11, 0, TAU); c.fill();
  }
  c.fillStyle = '#ff7058';
  for (let i = 0; i < call.misses; i++) { c.beginPath(); c.arc(cx + (i - 0.5) * 26, cx + 40, 6, 0, TAU); c.fill(); }
  const t = call.target;
  if (!t || t.dead || dist(t.x, t.z, state.player.x, state.player.z) > 8) { endCall(); toast('The call faded.'); }
}

function befriend(e, silent = false) {
  e.ally = true;
  e.mode = 'follow';
  e.provoked = 0;
  if (silent) return;
  state.stats.friends++;
  sfx.friend();
  particles.burst(e.x, e.mesh.position.y + 2, e.z, 0xff8bd1, 22, 3, 4);
  awardBone(`${e.sp.name} joined your pack!`);
  save();
}

// ---------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------
const touch = { x: 0, y: 0, id: null, sprint: false };
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.code === 'Escape' && state.screen === 'play') { e.preventDefault(); pause(!state.paused); return; }
  if (e.code === 'KeyM' && state.screen === 'play') { toggleMute(); return; }
  if (state.screen !== 'play' || state.paused) return;
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'KeyE') interact('collect');
  if (e.code === 'KeyF') interact('friend');
  if (e.code === 'Space') interact('attack');
  if (e.code === 'KeyV') openEvolution();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => { if (document.hidden && state.screen === 'play' && !state.paused) pause(true); });

canvas.addEventListener('pointerdown', (e) => {
  if (state.screen !== 'play') return;
  motion.dragging = true;
  motion.lastX = e.clientX;
  motion.lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('looking');
});
canvas.addEventListener('pointermove', (e) => {
  if (!motion.dragging) return;
  const dx = e.clientX - motion.lastX, dy = e.clientY - motion.lastY;
  motion.lastX = e.clientX;
  motion.lastY = e.clientY;
  motion.yaw -= dx * 0.006;
  motion.pitch = clamp(motion.pitch + dy * 0.004, 0.12, 0.85);
});
const endLook = (e) => { motion.dragging = false; if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId); canvas.classList.remove('looking'); };
canvas.addEventListener('pointerup', endLook);
canvas.addEventListener('pointercancel', endLook);
canvas.addEventListener('wheel', (e) => {
  if (state.screen !== 'play') return;
  motion.distance = clamp(motion.distance + Math.sign(e.deltaY), 6.5, 16);
  e.preventDefault();
}, { passive: false });

function clearInput() {
  for (const k of Object.keys(keys)) keys[k] = false;
  motion.dragging = false;
  touch.x = touch.y = 0;
  canvas.classList.remove('looking');
}

// Touch: virtual stick + action buttons
function enableTouchMode() { document.body.classList.add('touch-mode'); }
if (matchMedia('(pointer: coarse)').matches) enableTouchMode();
addEventListener('touchstart', enableTouchMode, { once: true, passive: true });
const stick = $('#stick'), knob = $('#stick-knob');
stick.addEventListener('pointerdown', (e) => { touch.id = e.pointerId; stick.setPointerCapture(e.pointerId); moveStick(e); });
stick.addEventListener('pointermove', (e) => { if (e.pointerId === touch.id) moveStick(e); });
const releaseStick = () => { touch.id = null; touch.x = touch.y = 0; knob.style.transform = ''; };
stick.addEventListener('pointerup', releaseStick);
stick.addEventListener('pointercancel', releaseStick);
function moveStick(e) {
  const r = stick.getBoundingClientRect(), max = r.width / 2;
  let dx = e.clientX - (r.left + max), dy = e.clientY - (r.top + max);
  const len = Math.hypot(dx, dy);
  if (len > max) { dx *= max / len; dy *= max / len; }
  touch.x = dx / max;
  touch.y = -dy / max;
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
}
$$('.touch-actions button').forEach((b) => b.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const a = b.dataset.action;
  if (a === 'sprint') { touch.sprint = !touch.sprint; b.classList.toggle('on', touch.sprint); }
  else interact(a);
}));

function toggleMute() {
  audio.muted = !audio.muted;
  try { localStorage.setItem('oddkin-muted', audio.muted ? '1' : '0'); } catch { /* ignore */ }
  updateMuteButton();
}
function updateMuteButton() {
  const b = $('#mute-btn');
  b.setAttribute('aria-pressed', String(audio.muted));
  b.setAttribute('aria-label', audio.muted ? 'Unmute sound' : 'Mute sound');
}

// ---------------------------------------------------------------------
// Save / load
// ---------------------------------------------------------------------
function save() {
  if (state.screen !== 'play' && state.creatorMode !== 'evolve') return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v: 2, planet: state.planet, name: state.name, genome: state.genome, tier: state.tier, adapt: state.adapt,
      bones: state.bones, boneGoal: state.boneGoal, health: Math.round(state.health), hunger: Math.round(state.hunger),
      clock: state.clock, stats: state.stats, journal: [...state.journal], victory: state.victory, keepExploring: state.keepExploring,
      allies: state.entities.filter((e) => e.ally && !e.dead).map((e) => e.sp.id)
    }));
  } catch { /* storage blocked */ }
}
function loadSave() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    return d && d.v === 2 && PLANETS[d.planet] ? d : null;
  } catch { return null; }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } }
function refreshContinue() {
  const d = loadSave();
  $('#continue-btn').classList.toggle('hidden', !d);
  if (d) $('#continue-label').textContent = `${d.name.toUpperCase()} · ${PLANETS[d.planet].name.toUpperCase()} · TIER ${d.tier}`;
}

// ---------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------
function toast(text, tone = '') {
  const el = $('#toast');
  el.textContent = text;
  el.className = `toast show ${tone}`;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 2600);
}
function updateHud() {
  const mh = maxHealth();
  $('#hud-name').textContent = state.name.toUpperCase();
  $('#hud-diet').textContent = TRAITS.diet[state.genome.diet][0].toUpperCase();
  $('#hud-tier').textContent = state.victory ? 'APEX SPECIES' : `EVOLUTION ${state.tier} OF ${MAX_TIER}`;
  $('#pack-count').textContent = state.entities.filter((e) => e.ally && !e.dead).length;
  $('#pack-max').textContent = packMax();
  $('#bone-count').textContent = state.bones;
  $('#bone-goal').textContent = state.boneGoal;
  const n = Math.min(state.bones, state.boneGoal), ready = n >= state.boneGoal;
  $('#objective-progress').style.width = `${(n / state.boneGoal) * 100}%`;
  $('#objective-text').textContent = ready ? 'Your DNA is ready — evolve!'
    : state.victory ? 'Apex reached. The world is yours to explore.'
      : n === 0 && state.tier === 0 ? 'Find your first bone'
        : `Gather ${state.boneGoal - n} more evolution bone${state.boneGoal - n === 1 ? '' : 's'}`;
  $('#evolve-btn').classList.toggle('hidden', !ready);
  $('.bones').classList.toggle('ready', ready);
  $('#health-bar').style.width = `${(state.health / mh) * 100}%`;
  $('#health-text').textContent = Math.ceil(state.health);
  $('#hunger-bar').style.width = `${state.hunger}%`;
  $('#hunger-text').textContent = Math.ceil(state.hunger);
  $('#hunger-bar').style.background = state.hunger < 25 ? 'var(--coral)' : '';
}

let lastTargetKey = '';
function updateTargetCard() {
  const t = state.target;
  const card = $('#target-card');
  if (!t) { card.classList.add('hidden'); lastTargetKey = ''; return; }
  card.classList.remove('hidden');
  const creature = t.type === 'creature';
  const hpEl = $('#target-hp');
  hpEl.classList.toggle('hidden', !creature);
  if (creature) hpEl.firstElementChild.style.width = `${Math.max(0, t.hp / t.maxHp) * 100}%`;
  const key = creature ? `${t.sp.id}:${t.mode}:${t.provoked > 0}` : `${t.type}:${t.kind}`;
  if (key === lastTargetKey) return;
  lastTargetKey = key;
  if (t.type === 'bone') {
    $('#target-kind').textContent = 'ANCIENT REMAINS';
    $('#target-name').textContent = 'EVOLUTION BONE';
    $('#target-mood').textContent = 'Glowing with old DNA';
    $('#target-actions').innerHTML = '<b>E</b> Collect';
    card.classList.remove('hostile');
  } else if (t.type === 'food') {
    const ok = canEat(t.kind);
    $('#target-kind').textContent = 'EDIBLE FIND';
    $('#target-name').textContent = t.kind === 'plant' ? 'WILD FRUIT' : 'FRESH MEAT';
    $('#target-mood').textContent = ok ? 'You can digest this' : `Your ${TRAITS.diet[state.genome.diet][0].toLowerCase()} gut can't digest this`;
    $('#target-actions').innerHTML = ok ? '<b>E</b> Eat' : '';
    card.classList.toggle('hostile', !ok);
  } else {
    const tmp = TEMPER[t.sp.temper];
    const angry = t.mode === 'chase' || (tmp.hostile && t.provoked > 0);
    $('#target-kind').textContent = `${tmp.label} · ${TRAITS.diet[t.sp.genome.diet][0].toUpperCase()}`;
    $('#target-name').textContent = t.sp.name.toUpperCase();
    $('#target-mood').textContent = angry ? 'Hostile — it will attack!' : t.mode === 'flee' ? 'Fleeing' : tmp.mood;
    $('#target-actions').innerHTML = '<b>F</b> Call <b>SPACE</b> Bite';
    card.classList.toggle('hostile', angry);
  }
}

const radar = $('#radar'), rctx = radar.getContext('2d');
function drawRadar() {
  const W = radar.width, c = W / 2, range = radarRange();
  rctx.clearRect(0, 0, W, W);
  rctx.save();
  rctx.beginPath(); rctx.arc(c, c, c - 2, 0, TAU); rctx.clip();
  rctx.strokeStyle = 'rgba(255,255,255,.12)';
  rctx.lineWidth = 2;
  for (const f of [0.33, 0.66]) { rctx.beginPath(); rctx.arc(c, c, (c - 2) * f, 0, TAU); rctx.stroke(); }
  // Rotate so "up" is the camera's forward direction.
  const cos = Math.cos(motion.yaw), sin = Math.sin(motion.yaw);
  const plot = (x, z, color, r) => {
    const dx = x - state.player.x, dz = z - state.player.z;
    const rx = dx * cos - dz * sin, rz = dx * sin + dz * cos;
    let px = rx / range * (c - 10), py = rz / range * (c - 10);
    const len = Math.hypot(px, py);
    if (len > c - 10) { if (color !== '#e7ff70') return; px *= (c - 10) / len; py *= (c - 10) / len; r *= 0.7; }
    rctx.fillStyle = color;
    rctx.beginPath(); rctx.arc(c + px, c + py, r, 0, TAU); rctx.fill();
  };
  plot(0, 0, 'rgba(213,241,100,.35)', NEST_RADIUS / range * (c - 10));
  for (const e of state.entities) {
    if (e.type === 'bone' && !e.taken) plot(e.x, e.z, '#e7ff70', 7);
    else if (e.type === 'food' && !e.taken && canEat(e.kind)) plot(e.x, e.z, 'rgba(255,255,255,.55)', 3.5);
    else if (e.type === 'creature' && !e.dead) plot(e.x, e.z, e.ally ? '#7fffc4' : e.sp.temper === 'predator' ? '#ff7058' : e.sp.temper === 'territorial' ? '#f1bd54' : '#cfe7ff', 6);
  }
  rctx.restore();
  rctx.fillStyle = '#fff';
  rctx.beginPath(); rctx.moveTo(c, c - 12); rctx.lineTo(c - 8, c + 8); rctx.lineTo(c + 8, c + 8); rctx.closePath(); rctx.fill();
}

// ---------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------
function collides(x, z, r = 0.5) { return obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + r); }

let hudTimer = 0, hurtTimer = 0, hazardToast = 0, saveTimer = 0, respawnTimer = 0;
function hurtPlayer(amount, message) {
  const dmg = Math.max(1, amount * Math.pow(0.75, state.adapt.thorn));
  state.health = Math.max(0, state.health - dmg);
  $('#vignette').classList.add('hurt');
  clearTimeout(hurtTimer);
  hurtTimer = setTimeout(() => $('#vignette').classList.remove('hurt'), 220);
  if (state.health <= 0) faint(message);
}
function faint(message) {
  const lost = Math.floor(state.bones / 2);
  state.bones -= lost;
  state.health = maxHealth() * 0.6;
  state.hunger = Math.max(state.hunger, 55);
  state.player.x = state.player.z = 0;
  motion.velocity.set(0, 0, 0);
  endCall();
  for (const e of state.entities) if (e.type === 'creature' && e.mode === 'chase') { e.mode = 'wander'; e.provoked = 0; }
  sfx.hurt();
  toast(`${message} You woke at the nest${lost ? ` and dropped ${lost} bone${lost > 1 ? 's' : ''}` : ''}.`, 'bad');
  updateHud();
}

function updateSky(dt) {
  const p = PLANETS[state.planet];
  if (state.screen === 'play' && !state.paused) state.clock += dt;
  const phase = (state.clock / DAY_LENGTH) % 1;
  const elev = Math.sin(phase * TAU);
  const day = smoothstep(elev + 0.3, -0.1, 0.4) * p.dayLight;
  sky.day = day;
  const nightSky = new THREE.Color(p.nightSky), daySky = new THREE.Color(p.sky);
  scene.background.copy(nightSky).lerp(daySky, Math.min(1, day));
  scene.fog.color.copy(new THREE.Color(p.nightFog)).lerp(new THREE.Color(p.fog), Math.min(1, day));
  if (sky.hemi) {
    sky.hemi.intensity = lerp(0.75, 2.2, Math.min(1, day));
    sky.sun.intensity = lerp(0.35, 3.2, Math.min(1, day));
    sky.sun.color.set(day > 0.5 ? 0xfff0c2 : 0xffc7a0).lerp(new THREE.Color(0x9fb4ff), 1 - Math.min(1, day * 1.6));
    const px = state.screen === 'play' ? state.player.x : 0, pz = state.screen === 'play' ? state.player.z : 0;
    const a = phase * TAU;
    sky.sun.position.set(px + Math.cos(a) * 45, Math.max(18, Math.abs(Math.sin(a)) * 60), pz + 28);
    sky.sun.target.position.set(px, 0, pz);
  }
  stars.material.opacity = clamp(1 - day * 1.6, 0, 1);
  if (nestRing) nestRing.material.opacity = 0.2 + (1 - day) * 0.3;
  const dayNum = Math.floor(state.clock / DAY_LENGTH) + 1;
  const label = day > 0.8 ? 'DAY' : day < 0.2 ? 'NIGHT' : Math.cos(phase * TAU) > 0 ? 'DAWN' : 'DUSK';
  const text = `DAY ${dayNum} · ${label}${day < 0.2 ? ' · PREDATORS PROWL' : ''}`;
  if (text !== updateSky.last) { $('#clock-label').textContent = text; updateSky.last = text; }
  // Bone beacons at night or with Keen Senses
  const beacons = day < 0.35 || state.adapt.senses > 0;
  for (const e of state.entities) if (e.type === 'bone' && e.mesh.userData.beam) e.mesh.userData.beam.visible = beacons && !e.taken;
}

function updatePlayer(dt, time) {
  const inCall = call.active;
  const side = inCall ? 0 : (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + touch.x;
  const forward = inCall ? 0 : (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + touch.y;
  const input = Math.min(1, Math.hypot(side, forward));
  const camF = new THREE.Vector3(-Math.sin(motion.yaw), 0, -Math.cos(motion.yaw));
  const camR = new THREE.Vector3(-camF.z, 0, camF.x);
  const wish = new THREE.Vector3().addScaledVector(camF, forward).addScaledVector(camR, side);
  if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(input);
  const sprinting = (keys.ShiftLeft || keys.ShiftRight || touch.sprint) && input > 0.1;
  const stats = getStats();
  const maxSpeed = (sprinting ? 9.2 : 5.4) * (1 + state.adapt.fleet * 0.18) * (0.84 + stats.speed * 0.03);
  motion.velocity.lerp(wish.multiplyScalar(maxSpeed), 1 - Math.exp(-(input > 0 ? 11 : 8) * dt));
  if (motion.velocity.length() < 0.035) motion.velocity.set(0, 0, 0);
  const r = 0.45 * playerScale();
  const nx = state.player.x + motion.velocity.x * dt, nz = state.player.z + motion.velocity.z * dt;
  if (Math.hypot(nx, state.player.z) < WORLD_RADIUS && !collides(nx, state.player.z, r)) state.player.x = nx; else motion.velocity.x = 0;
  if (Math.hypot(state.player.x, nz) < WORLD_RADIUS && !collides(state.player.x, nz, r)) state.player.z = nz; else motion.velocity.z = 0;
  if (Math.hypot(nx, nz) >= WORLD_RADIUS - 0.5 && input > 0 && hazardToast <= 0) { toast('The wilds end here — turn back.'); hazardToast = 3; }

  const speed = motion.velocity.length();
  if (speed > 0.2) {
    const target = Math.atan2(-motion.velocity.x, -motion.velocity.z);
    playerMesh.rotation.y += angleDelta(playerMesh.rotation.y, target) * (1 - Math.exp(-13 * dt));
  } else if (inCall && call.target) {
    const target = Math.atan2(-(call.target.x - state.player.x), -(call.target.z - state.player.z));
    playerMesh.rotation.y += angleDelta(playerMesh.rotation.y, target) * (1 - Math.exp(-8 * dt));
  }
  const stride = Math.min(1.2, speed / 5.4);
  animateCreature(playerMesh, time, stride);
  motion.lunge = Math.max(0, motion.lunge - dt * 4);
  motion.attackCd = Math.max(0, motion.attackCd - dt);
  const lunge = Math.sin(motion.lunge * Math.PI) * 0.6;
  playerMesh.position.set(
    state.player.x - Math.sin(playerMesh.rotation.y) * lunge,
    terrainHeight(state.player.x, state.player.z),
    state.player.z - Math.cos(playerMesh.rotation.y) * lunge
  );

  // Hunger, hazards, healing
  const p = PLANETS[state.planet];
  const drain = (input > 0 ? (sprinting ? 0.72 : 0.38) : 0.19) * p.hunger * Math.pow(0.75, state.adapt.gut);
  state.hunger = Math.max(0, state.hunger - dt * drain);
  if (state.hunger === 0) hurtPlayer(dt * 4, 'Hunger got the better of you.');
  const atNest = Math.hypot(state.player.x, state.player.z) < NEST_RADIUS;
  if (atNest) state.health = Math.min(maxHealth(), state.health + dt * 8);
  else if (state.hunger > 60) state.health = Math.min(maxHealth(), state.health + dt * 0.6);
  hazardToast -= dt;
  for (const h of hazards) {
    if (dist(state.player.x, state.player.z, h.x, h.z) < h.r) {
      hurtPlayer(dt * 16, 'The lava was too much.');
      if (Math.random() < dt * 20) particles.burst(state.player.x, playerMesh.position.y + 0.3, state.player.z, 0xffa240, 2, 1.5, 2);
      if (hazardToast <= 0) { toast('Too hot! Get out of the lava!', 'bad'); hazardToast = 2.5; }
    }
  }
  return { sprinting, atNest };
}

function updateCreatures(dt, time, ctx) {
  const px = state.player.x, pz = state.player.z;
  const night = sky.day < 0.35;
  const allies = [];
  let near = null, nearD = 5.2;
  let hostileNear = null, hostileD = 12;

  for (const e of state.entities) {
    if (e.type === 'bone' || e.type === 'food') {
      if (e.taken) continue;
      e.mesh.rotation.y += dt * (e.type === 'bone' ? 1 : 0.55);
      e.mesh.position.y = terrainHeight(e.x, e.z) + (e.type === 'bone' ? 0.6 : 0.35) + Math.sin(time * 2 + e.phase) * (e.type === 'bone' ? 0.15 : 0.06);
      const d = dist(e.x, e.z, px, pz);
      if (d < nearD) { nearD = d; near = e; }
      continue;
    }
    if (e.dead) {
      if (e.dying > 0) {
        e.dying -= dt;
        e.mesh.scale.setScalar(Math.max(0.01, e.sp.size * (e.dying / 0.45)));
        if (e.dying <= 0) { e.mesh.visible = false; worldRoot.remove(e.mesh); }
      }
      continue;
    }
    e.cd = Math.max(0, e.cd - dt);
    e.callCd = Math.max(0, e.callCd - dt);
    e.provoked = Math.max(0, e.provoked - dt);
    e.pop = Math.max(0, e.pop - dt * 5);
    const dx = px - e.x, dz = pz - e.z, d = Math.hypot(dx, dz);
    const toPlayer = Math.atan2(dx, dz);
    const sp = e.sp, tmp = sp.temper;
    let desired = null, speed = 0;

    if (!e.mesh.visible && d < 90) e.mesh.visible = true;
    if (d > 95) { e.mesh.visible = false; continue; }

    if (e.ally) {
      allies.push(e);
      // Fight whatever is threatening the player, otherwise follow.
      const foe = e.foe && !e.foe.dead && dist(e.foe.x, e.foe.z, px, pz) < 16 ? e.foe : null;
      if (foe) {
        const fd = dist(foe.x, foe.z, e.x, e.z);
        desired = Math.atan2(foe.x - e.x, foe.z - e.z);
        speed = fd > 1.8 + foe.sp.size ? sp.speed * 1.5 : 0;
        if (fd < 2.2 + foe.sp.size && e.cd <= 0) {
          e.cd = 1.1;
          e.pop = 1;
          damageCreature(foe, 2 + state.adapt.fang * 2 + Math.round(sp.attack * 0.3), false);
        }
      } else {
        const slot = allies.length * 1.3;
        const fx = px + Math.sin(playerMesh.rotation.y + 2.4 + slot) * 3.2, fz = pz + Math.cos(playerMesh.rotation.y + 2.4 + slot) * 3.2;
        const fd = dist(fx, fz, e.x, e.z);
        if (fd > 1) { desired = Math.atan2(fx - e.x, fz - e.z); speed = Math.min(sp.speed * 1.8, fd * 1.6); }
        if (d > 40) { e.x = px + (Math.random() - 0.5) * 4; e.z = pz + (Math.random() - 0.5) * 4; }
      }
    } else if (e.mode === 'listen') {
      desired = null;
      e.angle += angleDelta(e.angle, toPlayer) * (1 - Math.exp(-6 * dt));
    } else {
      let mode = 'wander';
      const homeD = dist(e.x, e.z, e.homeX, e.homeZ);
      if (tmp === 'predator') {
        const aggro = (10 + state.tier * 1.5) * (night ? 1.5 : 1) * (ctx.sprinting ? 1.2 : 1);
        if ((d < aggro || (e.provoked > 0 && d < 30)) && !ctx.atNest) mode = 'chase';
      } else if (tmp === 'territorial') {
        if ((dist(px, pz, e.homeX, e.homeZ) < 7 || e.provoked > 0) && !ctx.atNest && d < 20) mode = 'chase';
      } else if (tmp === 'timid') {
        const fear = (ctx.sprinting ? 10 : 6) + (state.genome.diet === 2 ? 3 : 0);
        if (d < fear || e.provoked > 0) mode = 'flee';
      } else if (tmp === 'curious') {
        if (e.provoked > 0) mode = 'flee';
        else if (d < 12 && d > 3.4) mode = 'approach';
        else if (d <= 3.4) mode = 'idle';
      }
      if (mode === 'chase' && dist(e.x, e.z, 0, 0) < NEST_RADIUS + 1.5) mode = 'wander';
      e.mode = mode;

      if (mode === 'chase') {
        desired = toPlayer;
        speed = d > 1.8 + sp.size ? sp.speed * (1 + state.tier * 0.06) * (night ? 1.1 : 1) : 0;
        if (d < 2.3 + sp.size * 0.8 && e.cd <= 0) {
          e.cd = 1.25;
          e.pop = 1;
          sfx.hurt();
          hurtPlayer(sp.attack * (1 + state.tier * 0.12), `${sp.name} knocked you out!`);
          particles.burst(px, playerMesh.position.y + 1.4, pz, 0xff7058, 8, 3, 2);
        }
        if (!hostileNear || d < hostileD) { hostileNear = e; hostileD = d; }
      } else if (mode === 'flee') {
        desired = toPlayer + Math.PI;
        speed = sp.speed;
      } else if (mode === 'approach') {
        desired = toPlayer;
        speed = sp.speed * 0.5;
      } else if (mode === 'wander') {
        e.turnT -= dt;
        if (e.turnT <= 0) { e.turnT = 2 + Math.random() * 4; e.wanderAngle = homeD > 8 ? Math.atan2(e.homeX - e.x, e.homeZ - e.z) : Math.random() * TAU; e.resting = Math.random() < 0.35; }
        desired = e.wanderAngle;
        speed = e.resting ? 0 : sp.speed * 0.3;
      }
    }

    // Steering + movement
    if (desired != null) e.angle += angleDelta(e.angle, desired) * (1 - Math.exp(-5 * dt));
    if (speed > 0) {
      const nx = e.x + Math.sin(e.angle) * speed * dt, nz = e.z + Math.cos(e.angle) * speed * dt;
      const blocked = collides(nx, nz, 0.4 * sp.size) || Math.hypot(nx, nz) > WORLD_RADIUS - 1 || hazards.some((h) => dist(nx, nz, h.x, h.z) < h.r + 1);
      if (!blocked) { e.x = nx; e.z = nz; } else { e.angle += 1.4; e.turnT = 0; }
    }
    e.stride = lerp(e.stride, Math.min(1.2, speed / 4), 1 - Math.exp(-8 * dt));
    e.mesh.position.set(e.x, terrainHeight(e.x, e.z), e.z);
    // Model faces -Z, movement angle is measured from +Z.
    e.mesh.rotation.y = e.angle + Math.PI;
    e.mesh.scale.setScalar(sp.size * (1 + e.pop * 0.12));
    animateCreature(e.mesh, time, e.stride, e.offset);

    if (!e.ally && d < nearD) { nearD = d; near = e; }
  }

  // Allies pick a foe: whoever is chasing the player, else the player's last bite target.
  for (const a of allies) {
    if (!a.foe || a.foe.dead) a.foe = hostileNear || (state.target && state.target.type === 'creature' && state.target.provoked > 0 && !state.target.ally ? state.target : null);
  }
  state.target = near;
}

function updateDiscovery() {
  for (const e of state.entities) {
    if (e.type !== 'creature' || e.dead || state.journal.has(e.sp.id)) continue;
    if (dist(e.x, e.z, state.player.x, state.player.z) < 14) {
      state.journal.add(e.sp.id);
      sfx.discover();
      toast(`New species logged: ${e.sp.name} (${TEMPER[e.sp.temper].label.toLowerCase()})`, e.sp.temper === 'predator' ? 'bad' : '');
    }
  }
}

function respawn(dt) {
  respawnTimer -= dt;
  if (respawnTimer > 0) return;
  respawnTimer = 15;
  const rnd = Math.random;
  // Cull collected items so the entity list doesn't grow forever.
  state.entities = state.entities.filter((e) => {
    if ((e.type === 'bone' || e.type === 'food') && e.taken) { worldRoot.remove(e.mesh); return false; }
    if (e.type === 'creature' && e.dead && e.dying <= 0) return false;
    return true;
  });
  const far = () => { for (let t = 0; t < 20; t++) { const s = randomSpot(rnd, 10, 78, 6); if (dist(s.x, s.z, state.player.x, state.player.z) > 25) return s; } return randomSpot(rnd, 10, 78, 6); };
  const count = (type) => state.entities.filter((e) => e.type === type && !e.taken).length;
  while (count('bone') < 8) { const s = far(); spawnItem('bone', s.x, s.z); }
  if (count('food') < 30) for (let i = 0; i < 6; i++) { const s = far(); spawnItem('food', s.x, s.z, rnd() > 0.65 ? 'meat' : 'plant'); }
  const wild = state.entities.filter((e) => e.type === 'creature' && !e.dead && !e.ally).length;
  if (wild < 22) spawnHerd(pick(rnd, state.species), rnd, 30);
}

function update(dt, time) {
  if (state.screen !== 'play' || state.paused || !playerMesh) return;
  state.stats.time += dt;
  const ctx = updatePlayer(dt, time);
  updateCreatures(dt, time, ctx);
  updateDiscovery();
  respawn(dt);
  drawCall(dt);
  updateTargetCard();
  hudTimer -= dt;
  if (hudTimer <= 0) { hudTimer = 0.1; drawRadar(); updateHud(); }
  saveTimer -= dt;
  if (saveTimer <= 0) { saveTimer = 10; save(); }
}

// ---------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------
let lastTime = performance.now(), frameCount = 0;
function animate(now) {
  requestAnimationFrame(animate);
  frameCount++;
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  const time = now / 1000;
  updateSky(dt);
  update(dt, time);
  particles.update(dt);
  if (nestRing) nestRing.rotation.z += dt * 0.1;

  if (state.screen === 'play' && playerMesh) {
    const focusY = terrainHeight(state.player.x, state.player.z) + 1.45 * playerScale() + 0.2;
    const focus = new THREE.Vector3(state.player.x, focusY, state.player.z);
    const dist3 = motion.distance * (0.9 + playerScale() * 0.12);
    const h = Math.cos(motion.pitch) * dist3;
    const desired = new THREE.Vector3(focus.x + Math.sin(motion.yaw) * h, focus.y + Math.sin(motion.pitch) * dist3, focus.z + Math.cos(motion.yaw) * h);
    desired.y = Math.max(desired.y, terrainHeight(desired.x, desired.z) + 1.1);
    camera.position.lerp(desired, 1 - Math.exp(-7 * dt));
    camera.lookAt(focus.add(motion.velocity.clone().multiplyScalar(0.22)));
  } else {
    if (playerMesh && state.screen === 'planet') animateCreature(playerMesh, time, 0);
    camera.position.set(Math.sin(time * 0.08) * 18, 10, Math.cos(time * 0.08) * 18);
    camera.lookAt(0, 1.5, 0);
  }
  renderer.render(scene, camera);
  renderPreview(time);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
});
renderer.setSize(innerWidth, innerHeight, false);

// Test hook: open with #debug to drive the game from devtools or Playwright.
if (location.hash === '#debug') window.oddkin = { state, call, interact, openEvolution, applyEvolution, startCall, callPress, inZone, ADAPTATIONS, frames: () => frameCount };

initPreview3D();
initUI();
buildWorld(false);
requestAnimationFrame(animate);
