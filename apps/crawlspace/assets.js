// Grimoire — the 3D asset library for Crawlspace.
//
// Every model here is generated from primitives at load time: there are no
// meshes to download, no textures, no rigs. Rogue drew this dungeon as
// characters on a terminal because a terminal was all it had; this kit builds
// the thing each character stood for and lights it with one carried flame.
//
// The unifying rule is the inverse of a vector game's: nothing glows on its
// own. Every model is a flat-shaded solid with dark carved seams, visible only
// because something nearby is burning. Stone is quarried by hand here, so
// every block gets a seeded wobble in scale and rotation — a perfectly square
// dungeon reads as a spreadsheet, not a ruin.
//
// Convention for every model: one unit is one map cell, +X is east, +Y is
// north (the map's row index runs the other way, so the caller negates it),
// and +Z is up with the floor surface at z = 0.
import * as THREE from "three";

export const PALETTE = {
  dark: "#07060a",
  // Stone is deliberately kept grey and a little cold. Everything warm in the
  // picture should be coming from a flame, not from the rock's own colour.
  flagstone: "#7d7463",
  rubble: "#615343",
  masonry: "#5f594a", // kept under the floor's tone so the walls frame it
  mortar: "#231d18",
  memory: "#3d4c66", // the cold tint of a room you are only remembering
  torch: "#ffb457",
  flame: "#ffd9a0",
  lantern: "#ffcb7a",
  gold: "#e8b64c",
  elixir: "#6fe0b0",
  cloak: "#8c3f3a",
  // Dressed stone, cut brighter and cooler than the floor it interrupts, so
  // the one tile that matters most on a level is the one you cannot miss.
  stairs: "#9a958a",
};

const CELL = 1;

// --- Shared plumbing ------------------------------------------------------

// One radial-gradient sprite, shared by every flame, ember and mote.
let glowTexture = null;
export function getGlowTexture() {
  if (glowTexture) return glowTexture;
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.3, "rgba(255,255,255,0.5)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  glowTexture = new THREE.CanvasTexture(c);
  return glowTexture;
}

export function seededRandom(seed) {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Stone, wood, hide: matte, unlit until a torch finds it. Metalness stays at
// zero for everything but coin and lantern brass.
function hewnMaterial(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: opts.roughness ?? 0.95,
    metalness: opts.metalness ?? 0,
    emissive: opts.emissive ?? "#000000",
    emissiveIntensity: opts.emissiveIntensity ?? 1,
  });
}

// The workhorse: a box, positioned by the centre of its footprint and the
// height it rises to. Saves a translate() at every call site below.
function block(w, d, h, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, d, h), material);
  mesh.position.set(x, y, z + h / 2);
  return mesh;
}

function glowSprite(color, scale, opacity = 0.55) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: getGlowTexture(),
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  sprite.scale.setScalar(scale);
  return sprite;
}

// --- Floors and walls -----------------------------------------------------
//
// Tiles are instanced: a level is a couple of thousand cells, and rebuilding
// them per frame would be the only expensive thing in the game. Each kind gets
// one geometry, one material, and a per-instance matrix and colour. The colour
// is what carries Rogue's seen-versus-visible distinction, so a whole level's
// worth of memory updates in one buffer write per turn.

// Slabs are cut a little smaller than their cell so the black underneath
// shows through as mortar. No extra geometry, and the grid still reads.
function flagstoneGeometry() {
  const geo = new THREE.BoxGeometry(CELL * 0.965, CELL * 0.965, 0.1);
  geo.translate(0, 0, -0.05);
  return geo;
}

function rubbleGeometry() {
  const geo = new THREE.BoxGeometry(CELL * 0.9, CELL * 0.9, 0.07);
  geo.translate(0, 0, -0.035);
  return geo;
}

// Walls are two courses — a block and a narrower cap — so the top edge catches
// torchlight and the coping line reads from the tilted camera. Kept low on
// purpose: at the camera's tilt a wall this tall hides four tenths of a cell
// behind it, which is enough to feel like an enclosure and not enough to hide
// anything the player needs to see.
function wallGeometry() {
  const geo = new THREE.BoxGeometry(CELL, CELL, 0.58);
  geo.translate(0, 0, 0.29);
  return geo;
}

function wallCapGeometry() {
  const geo = new THREE.BoxGeometry(CELL * 0.86, CELL * 0.86, 0.12);
  geo.translate(0, 0, 0.64);
  return geo;
}

const TILE_KINDS = {
  floor: { geometry: flagstoneGeometry, color: PALETTE.flagstone, jitter: 0.015 },
  rubble: { geometry: rubbleGeometry, color: PALETTE.rubble, jitter: 0.07 },
  wall: { geometry: wallGeometry, color: PALETTE.masonry, jitter: 0.015 },
  wallCap: { geometry: wallCapGeometry, color: PALETTE.masonry, jitter: 0.04 },
};

// Builds one InstancedMesh for a kind of tile. `cells` is a list of
// {x, y, seed}; the returned mesh carries a setTint(index, color) helper so
// the caller can repaint memory without knowing about instance matrices.
export function createTileLayer(kind, cells) {
  const spec = TILE_KINDS[kind];
  const geometry = spec.geometry();
  const material = hewnMaterial(spec.color);
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(cells.length, 1));
  mesh.count = cells.length;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const axis = new THREE.Vector3(0, 0, 1);
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const shade = new THREE.Color();
  // Base shades are kept so visibility tinting can multiply into the stone's
  // own tone rather than erasing it.
  const shades = new Float32Array(cells.length);

  cells.forEach((cell, i) => {
    const rnd = seededRandom(cell.seed);
    // Hand-cut stone: a degree or two of rotation and a few percent of scale.
    quat.setFromAxisAngle(axis, (rnd() - 0.5) * spec.jitter * 6);
    const s = 1 + (rnd() - 0.5) * spec.jitter;
    scale.set(s, s, 1 + (rnd() - 0.5) * spec.jitter * 2);
    pos.set(cell.x, cell.y, (rnd() - 0.5) * 0.03);
    matrix.compose(pos, quat, scale);
    mesh.setMatrixAt(i, matrix);
    shades[i] = 0.82 + rnd() * 0.36;
    mesh.setColorAt(i, shade.setScalar(shades[i]));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.userData.shades = shades;
  mesh.userData.cells = cells;
  // A copy of the placements, so a tile the player has never seen can be
  // collapsed to a zero matrix and put back later. Tinting it black is not
  // enough: a black stone still catches a specular highlight and ghosts.
  mesh.userData.matrices = mesh.instanceMatrix.array.slice();
  return mesh;
}

// The void the dungeon is cut out of. Everything unlit falls back to this.
export function createBedrock(cols, rows) {
  const geo = new THREE.PlaneGeometry(cols + 8, rows + 8);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: PALETTE.dark }));
  mesh.position.set(cols / 2, -rows / 2, -0.34);
  return mesh;
}

// --- Stairs ---------------------------------------------------------------
// Rogue's '>' was a promise that the floor keeps going. Five courses of stone
// stepping down into a shaft that is simply not lit.
export function createStairs() {
  const group = new THREE.Group();
  const stone = hewnMaterial(PALETTE.stairs, { roughness: 0.85 });

  // The shaft is open toward the camera and steps down away from it, so the
  // treads stay visible instead of hiding behind their own near lip. The only
  // solid thing down there is the floor of the dark it leads into.
  const bottom = new THREE.Mesh(
    new THREE.PlaneGeometry(CELL * 0.9, CELL * 0.9),
    new THREE.MeshBasicMaterial({ color: "#000000" })
  );
  bottom.position.z = -0.78;
  group.add(bottom);

  // Four chunky treads rather than a fine flight: from almost overhead a stair
  // only reads as a stack of parallel bars, so the bars have to be big enough
  // to count at a glance.
  const steps = 4;
  for (let i = 0; i < steps; i++) {
    const width = CELL * (0.82 - i * 0.05);
    const step = block(width, CELL * 0.19, 0.14, stone, 0, -CELL * 0.32 + i * 0.2, -0.08 - i * 0.19);
    step.rotation.z = (i % 2 ? 1 : -1) * 0.012;
    group.add(step);
  }

  // Two cheek walls, so the treads read as cut into the floor rather than
  // floating over a hole.
  for (const side of [-1, 1]) {
    const cheek = block(0.08, CELL * 0.86, 0.62, stone, side * 0.44, 0.03, -0.66);
    group.add(cheek);
  }

  // A draught comes up the shaft: one faint, cold, slow-breathing glow.
  const draught = glowSprite("#5f7fa8", 1.5, 0.16);
  draught.position.z = 0.2;
  group.add(draught);
  group.userData.draught = draught;
  return group;
}

// --- Torches --------------------------------------------------------------
// Bracket, socket, flame. The flame is two sprites at different scales so the
// flicker has a core and a halo rather than pulsing as one flat disc.
export function createTorch() {
  const group = new THREE.Group();
  const iron = hewnMaterial("#3b332c", { roughness: 0.6, metalness: 0.35 });
  const wood = hewnMaterial("#54402c");

  group.add(block(0.08, 0.22, 0.06, iron, 0, -0.1, 0.52));
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.34, 6), wood);
  shaft.rotation.x = Math.PI / 2.6;
  shaft.position.set(0, -0.2, 0.66);
  group.add(shaft);

  const core = glowSprite(PALETTE.flame, 0.4, 0.9);
  core.position.set(0, -0.26, 0.82);
  // Kept small and faint on purpose: the halo should suggest hot air above the
  // flame, not paint a disc over the wall the sconce is bolted to.
  const halo = glowSprite(PALETTE.torch, 1.1, 0.18);
  halo.position.copy(core.position);
  group.add(halo, core);

  group.userData.core = core;
  group.userData.halo = halo;
  return group;
}

// One flicker curve, shared by every flame in the level so they breathe
// together without ever landing on the same frame.
export function flicker(time, phase) {
  return (
    0.82 +
    Math.sin(time * 0.011 + phase) * 0.1 +
    Math.sin(time * 0.037 + phase * 2.3) * 0.06 +
    Math.sin(time * 0.083 + phase * 5.1) * 0.03
  );
}

// --- The adventurer -------------------------------------------------------
// Rogue's '@' is you, and the only thing you actually bring down here is the
// light. So the model is mostly a cloak: a hooded cone with a lantern held out
// to one side, and the game's key light hangs off that lantern.
export function createAdventurer() {
  const group = new THREE.Group();
  const cloak = hewnMaterial(PALETTE.cloak, { roughness: 0.9 });
  const skin = hewnMaterial("#2a2018");
  const brass = hewnMaterial("#b98b3c", { roughness: 0.35, metalness: 0.7 });

  const body = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.62, 7), cloak);
  body.rotation.x = Math.PI / 2;
  body.position.z = 0.31;
  group.add(body);

  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.19, 7, 5), cloak);
  shoulders.position.z = 0.6;
  shoulders.scale.set(1, 1, 0.7);
  group.add(shoulders);

  // The hood reads as a face only because it is darker than the cloak.
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.3, 6), cloak);
  hood.rotation.x = Math.PI / 2;
  hood.position.set(0, -0.02, 0.76);
  group.add(hood);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), skin);
  face.position.set(0, -0.09, 0.72);
  group.add(face);

  // Lantern: brass cage, a burning core, and the pool of light it throws.
  const arm = new THREE.Group();
  arm.position.set(0.26, -0.04, 0.52);
  const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.16, 6), brass);
  cage.rotation.x = Math.PI / 2;
  arm.add(cage);
  const wick = glowSprite(PALETTE.lantern, 0.45, 0.9);
  arm.add(wick);
  const bail = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 4, 8), brass);
  bail.position.z = 0.12;
  arm.add(bail);
  group.add(arm);

  group.userData.arm = arm;
  group.userData.wick = wick;
  group.userData.body = body;
  return group;
}

// --- Bestiary -------------------------------------------------------------
// One builder per letter Rogue would have printed. They are deliberately built
// from different primitives rather than one rescaled humanoid, because on a
// tilted top-down camera the silhouette is all the player gets to read: the
// rat is long and low, the snake is a coil, the troll breaks the wall line.

function creature(parts, opts = {}) {
  const group = new THREE.Group();
  for (const part of parts) group.add(part);
  group.userData.bobHeight = opts.bobHeight ?? 0.04;
  group.userData.bobSpeed = opts.bobSpeed ?? 0.006;
  return group;
}

function rat() {
  const fur = hewnMaterial("#8a7263");
  const dark = hewnMaterial("#3d3028");
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), fur);
  body.scale.set(1.35, 0.9, 0.72);
  body.position.z = 0.14;
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 5), fur);
  snout.rotation.x = -Math.PI / 2;
  snout.position.set(0, -0.24, 0.12);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, 0.34, 4), dark);
  tail.rotation.x = Math.PI / 2.3;
  tail.position.set(0.02, 0.28, 0.1);
  const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 4), dark);
  ear.rotation.x = -Math.PI / 2;
  ear.position.set(-0.09, -0.08, 0.26);
  const ear2 = ear.clone();
  ear2.position.x = 0.09;
  return creature([body, snout, tail, ear, ear2], { bobHeight: 0.02, bobSpeed: 0.012 });
}

function snake() {
  const scale = hewnMaterial("#4b7c46", { roughness: 0.6 });
  const belly = hewnMaterial("#8fa356", { roughness: 0.6 });
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.07, 5, 12), scale);
  coil.position.z = 0.08;
  const coil2 = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.06, 5, 10), belly);
  coil2.position.z = 0.17;
  coil2.rotation.z = 0.6;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.26, 5), scale);
  neck.rotation.x = 0.35;
  neck.position.set(0, -0.06, 0.34);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 5), scale);
  head.rotation.x = -Math.PI / 2.1;
  head.position.set(0, -0.18, 0.44);
  return creature([coil, coil2, neck, head], { bobHeight: 0.03, bobSpeed: 0.005 });
}

function humanoid(opts) {
  const hide = hewnMaterial(opts.skin);
  const cloth = hewnMaterial(opts.cloth);
  const steel = hewnMaterial("#575d63", { roughness: 0.4, metalness: 0.6 });
  const s = opts.scale;
  const parts = [];

  const legs = block(0.2 * s, 0.16 * s, 0.22 * s, cloth, 0, 0, 0);
  const torso = block(0.3 * s, 0.2 * s, 0.3 * s, hide, 0, 0, 0.2 * s);
  torso.rotation.z = 0.08;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13 * s, 0), hide);
  head.position.z = 0.6 * s;
  parts.push(legs, torso, head);

  if (opts.ears) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05 * s, 0.16 * s, 4), hide);
    ear.rotation.z = Math.PI / 2;
    ear.position.set(-0.16 * s, 0, 0.62 * s);
    const ear2 = ear.clone();
    ear2.rotation.z = -Math.PI / 2;
    ear2.position.x = 0.16 * s;
    parts.push(ear, ear2);
  }
  if (opts.tusks) {
    const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.025 * s, 0.1 * s, 4), hewnMaterial("#d8cfae"));
    tusk.position.set(-0.06 * s, -0.09 * s, 0.6 * s);
    const tusk2 = tusk.clone();
    tusk2.position.x = 0.06 * s;
    parts.push(tusk, tusk2);
  }
  if (opts.weapon === "spear") {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * s, 0.018 * s, 0.7 * s, 4), hewnMaterial("#5b4530"));
    shaft.rotation.x = 0.12;
    shaft.position.set(0.22 * s, 0.02 * s, 0.35 * s);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.045 * s, 0.14 * s, 4), steel);
    tip.position.set(0.22 * s, 0.06 * s, 0.75 * s);
    parts.push(shaft, tip);
  }
  if (opts.weapon === "axe") {
    const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.028 * s, 0.028 * s, 0.6 * s, 5), hewnMaterial("#4a3524"));
    haft.rotation.x = 0.2;
    haft.position.set(0.26 * s, 0.04 * s, 0.3 * s);
    const head2 = block(0.05 * s, 0.22 * s, 0.18 * s, steel, 0.26 * s, 0.02 * s, 0.48 * s);
    parts.push(haft, head2);
  }
  if (opts.arms) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.05 * s, 0.5 * s, 5), hide);
    arm.rotation.x = 0.5;
    arm.position.set(-0.22 * s, 0.06 * s, 0.3 * s);
    const arm2 = arm.clone();
    arm2.position.x = 0.22 * s;
    parts.push(arm, arm2);
  }
  return creature(parts, opts);
}

// Sized so the ladder reads at a glance from the game's camera: a rat is a
// smudge underfoot, a troll stands taller than the wall it came around.
const BESTIARY = {
  r: rat,
  s: snake,
  g: () => humanoid({ scale: 0.85, skin: "#83a55b", cloth: "#544830", ears: true, weapon: "spear", bobSpeed: 0.009 }),
  o: () => humanoid({ scale: 1.1, skin: "#728a63", cloth: "#463a2f", tusks: true, weapon: "axe", bobSpeed: 0.006 }),
  T: () =>
    humanoid({
      scale: 1.6,
      skin: "#7b8268",
      cloth: "#443f33",
      arms: true,
      bobHeight: 0.07,
      bobSpeed: 0.004,
    }),
};

export function createMonster(ch) {
  const build = BESTIARY[ch] || rat;
  return build();
}

// --- Treasure -------------------------------------------------------------
// '$' and '!' are the only two things in Rogue worth bending down for, so they
// are the only two models allowed to emit their own light.
export function createGold(seed = 1) {
  const group = new THREE.Group();
  const metal = hewnMaterial(PALETTE.gold, {
    roughness: 0.3,
    metalness: 0.8,
    emissive: PALETTE.gold,
    emissiveIntensity: 0.12,
  });
  const rnd = seededRandom(seed);
  const coin = new THREE.CylinderGeometry(0.075, 0.075, 0.02, 8);
  coin.rotateX(Math.PI / 2);
  for (let i = 0; i < 7; i++) {
    const mesh = new THREE.Mesh(coin, metal);
    mesh.position.set((rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.3, 0.012 + Math.floor(rnd() * 3) * 0.022);
    mesh.rotation.z = rnd() * Math.PI;
    mesh.rotation.x += (rnd() - 0.5) * 0.4;
    group.add(mesh);
  }
  // Faint and tight: the pile should catch the eye across a dark room without
  // turning into a floating ball of light.
  group.add(glowSprite(PALETTE.gold, 0.6, 0.16));
  return group;
}

export function createPotion() {
  const group = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({
    color: "#9fd8d0",
    flatShading: true,
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.45,
  });
  const brew = hewnMaterial(PALETTE.elixir, {
    roughness: 0.2,
    emissive: PALETTE.elixir,
    emissiveIntensity: 0.9,
  });

  const flask = new THREE.Mesh(new THREE.SphereGeometry(0.17, 7, 6), glass);
  flask.position.z = 0.17;
  const liquid = new THREE.Mesh(new THREE.SphereGeometry(0.13, 7, 6), brew);
  liquid.position.z = 0.15;
  liquid.scale.z = 0.75;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.15, 6), glass);
  neck.rotation.x = Math.PI / 2;
  neck.position.z = 0.37;
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.06, 6), hewnMaterial("#8a6b45"));
  cork.rotation.x = Math.PI / 2;
  cork.position.z = 0.46;

  group.add(flask, liquid, neck, cork, glowSprite(PALETTE.elixir, 0.55, 0.2));
  return group;
}

// --- Air ------------------------------------------------------------------
// Dust hanging in the lantern beam. The caller drifts the points and recycles
// them around the player, which is why the buffer is written every frame.
export function createDustField(capacity) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(capacity * 3), 3));
  geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(capacity * 3), 3));
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 0.07,
      map: getGlowTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  points.frustumCulled = false;
  return points;
}

// --- Light ----------------------------------------------------------------
// The whole aesthetic is here. Ambient is a cold, dim wash that keeps
// remembered stone legible without looking lit; everything warm in the scene
// is a real flame with a real falloff. A fixed set of torch lights is recycled
// to whichever sconces are nearest, so the shader's light count never grows
// with the size of the dungeon. Six covers every sconce one room can hold: a
// flame drawn with no light behind it is just a smudge on dark stone.
export const TORCH_LIGHT_COUNT = 6;

export function createLighting(scene) {
  // Just enough cold light to keep remembered stone legible. Nothing in the
  // dungeon casts this; it stands in for the fact that the player has been
  // here before and can still picture the shape of the room.
  scene.add(new THREE.AmbientLight(0x3c4f70, 0.9));
  scene.add(new THREE.HemisphereLight(0x24344f, 0x05060a, 0.4));

  // Inverse-square falloff on a ten-cell reach: bright at your boots, gone by
  // the far wall. That gradient is the whole reason to light a dungeon at all.
  const lantern = new THREE.PointLight(PALETTE.lantern, 3.6, 10, 2);
  scene.add(lantern);

  const torchLights = [];
  for (let i = 0; i < TORCH_LIGHT_COUNT; i++) {
    const light = new THREE.PointLight(PALETTE.torch, 0, 8, 2);
    scene.add(light);
    torchLights.push(light);
  }
  return { lantern, torchLights };
}

// Frees everything a level built. Materials and geometries are per-level here
// (unlike the shared creature parts), so they have to go back explicitly.
export function disposeLevel(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of materials) m.dispose();
    }
  });
}
