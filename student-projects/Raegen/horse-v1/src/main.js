import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { loadAllSpecies } from './assets.js';
import { SPECIES, populate, updateCreatures, flatDistance } from './creatures.js';
import { buildWorld, WORLD_RADIUS } from './world.js';
import { enableTouchLook } from './touch-look.js';
import {
  advanceDay,
  canRide,
  createGame,
  dig,
  interactWithCreature,
  interactWithProp,
  nameHorse,
  nextObjective,
  ride,
  tryBuildHouse,
  tryBuildStable,
} from './game.js';

const DAY_LENGTH = 150; // seconds for a full day/night cycle
const WALK_SPEED = 22;
const RUN_SPEED = 46;
const EYE_HEIGHT = 12;

const dom = {
  blocker: document.getElementById('blocker'),
  instructions: document.getElementById('instructions'),
  loading: document.getElementById('loading'),
  log: document.getElementById('log'),
  objective: document.getElementById('objective'),
  prompt: document.getElementById('prompt'),
  panel: document.getElementById('panel'),
  namePanel: document.getElementById('name-panel'),
  nameInput: document.getElementById('horse-name-input'),
  nameSubmit: document.getElementById('name-submit'),
  stats: {
    wood: document.getElementById('stat-wood'),
    quartz: document.getElementById('stat-quartz'),
    feed: document.getElementById('stat-feed'),
    snails: document.getElementById('stat-snails'),
    horse: document.getElementById('stat-horse'),
    gear: document.getElementById('stat-gear'),
  },
  buttons: {
    house: document.getElementById('btn-house'),
    stable: document.getElementById('btn-stable'),
    ride: document.getElementById('btn-ride'),
  },
};

// --- Renderer / scene -----------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('scene').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 220, 900);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.5, 2000);

const hemiLight = new THREE.HemisphereLight(0xcfe6ff, 0x54703f, 1.0);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfff2d8, 1.1);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 900;
Object.assign(sunLight.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260 });
sunLight.shadow.camera.updateProjectionMatrix();
scene.add(sunLight);
scene.add(sunLight.target);

const sunDisc = new THREE.Mesh(
  new THREE.SphereGeometry(26, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffe98a })
);
scene.add(sunDisc);

const moonDisc = new THREE.Mesh(
  new THREE.SphereGeometry(18, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xdfe6f2 })
);
scene.add(moonDisc);

const rain = createRain();
scene.add(rain);

// In this build of three, getObject() returns the camera itself; the player's
// position and the camera's are one and the same.
const controls = new PointerLockControls(camera, renderer.domElement);
const playerObject = controls.getObject();
scene.add(playerObject);
playerObject.position.set(0, EYE_HEIGHT, 90);

// --- State ----------------------------------------------------------------

const world = buildWorld(scene);
const game = createGame(world);

const player = {
  position: playerObject.position,
  speed: 0,
};

const weather = { raining: false, nextChange: 40 };
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const keys = new Set();

let creatures = [];
let cycleTime = DAY_LENGTH * 0.15; // start mid-morning
let elapsed = 0;
let ready = false;
let inventoryOpen = false;
let soakedUntil = 0;
let promptTimer = 0;

// --- Boot -----------------------------------------------------------------

const templates = await loadAllSpecies(SPECIES, (done, total) => {
  dom.loading.textContent = `Loading animals… ${done}/${total}`;
});

creatures = populate(world, templates);
game.cacheBirds = creatures.filter((creature) => creature.kind === 'toucan');
ready = true;
dom.loading.style.display = 'none';
dom.blocker.classList.remove('hidden');

log('You arrive at the field. Somewhere out here is a horse worth keeping.');
log('Hold Shift to run. Horses bolt from a runner — walk when you get close.');
updateHud();

// --- Input ----------------------------------------------------------------

// Phones and tablets can't pointer-lock, so they get tap-to-play plus
// drag-to-look instead; on a mouse this returns null and nothing changes.
const touchLook = enableTouchLook({
  controls,
  camera,
  domElement: renderer.domElement,
  blocker: dom.blocker,
  canLook: () => !inventoryOpen && dom.namePanel.classList.contains('hidden'),
});

dom.instructions.addEventListener('click', () => {
  if (!touchLook) controls.lock();
});

controls.addEventListener('lock', () => dom.blocker.classList.add('hidden'));
controls.addEventListener('unlock', () => {
  if (inventoryOpen || !dom.namePanel.classList.contains('hidden')) return;
  dom.blocker.classList.remove('hidden');
});

document.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement) return;
  keys.add(event.code);

  if (event.code === 'KeyE') interact();
  if (event.code === 'KeyF') log(dig(game, player.position));
  if (event.code === 'KeyI') toggleInventory();
});

document.addEventListener('keyup', (event) => keys.delete(event.code));

renderer.domElement.addEventListener('mousedown', (event) => {
  if (event.button === 0 && controls.isLocked) interact();
});

dom.buttons.house.addEventListener('click', () => {
  log(tryBuildHouse(game, placementSpot()));
  updateHud();
});

dom.buttons.stable.addEventListener('click', () => {
  log(tryBuildStable(game, placementSpot()));
  updateHud();
});

dom.buttons.ride.addEventListener('click', () => {
  const message = ride(game);
  if (message) {
    log(message);
    updateHud();
  }
});

dom.nameSubmit.addEventListener('click', submitName);
dom.nameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') submitName();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Interaction ----------------------------------------------------------

/** Everything the crosshair can hit: props plus every visible creature. */
function interactionTargets() {
  return [...world.interactables, ...creatures.filter((c) => c.mesh.visible).map((c) => c.mesh)];
}

function creatureForObject(object) {
  let node = object;
  while (node) {
    const match = creatures.find((creature) => creature.mesh === node);
    if (match) return match;
    node = node.parent;
  }
  return null;
}

function pickUnderCrosshair() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  raycaster.far = 60;
  const hits = raycaster.intersectObjects(interactionTargets(), true);
  return hits.length > 0 ? hits[0] : null;
}

function interact() {
  if (!ready || !controls.isLocked) return;
  const hit = pickUnderCrosshair();
  if (!hit) return;

  const creature = creatureForObject(hit.object);
  if (creature) {
    log(interactWithCreature(game, creature, player));
    if (game.horse && !game.horseName) openNamePanel();
    updateHud();
    return;
  }

  // The bed drives the clock, which lives here rather than in game.js.
  const prop = hit.object.userData.type ? hit.object : hit.object.parent;
  if (prop?.userData?.type === 'bed') {
    if (isNight()) {
      cycleTime = DAY_LENGTH * 0.05;
      advanceDay(game).forEach(log);
    } else {
      log('You can only sleep at night.');
    }
    updateHud();
    return;
  }

  log(interactWithProp(game, hit.object));
  updateHud();
}

function placementSpot() {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  direction.y = 0;
  direction.normalize();
  return player.position.clone().addScaledVector(direction, 80);
}

// Touch mode has no real pointer lock, so flip the flag the game reads instead.
function setLocked(locked) {
  if (touchLook) touchLook.setLocked(locked);
  else if (locked) controls.lock();
  else controls.unlock();
}

function openNamePanel() {
  dom.namePanel.classList.remove('hidden');
  setLocked(false);
  dom.nameInput.focus();
}

function submitName() {
  log(nameHorse(game, dom.nameInput.value));
  if (!game.horseName) return;
  dom.namePanel.classList.add('hidden');
  updateHud();
  setLocked(true);
}

function toggleInventory() {
  inventoryOpen = !inventoryOpen;
  dom.panel.classList.toggle('expanded', inventoryOpen);
  if (inventoryOpen) setLocked(false);
  else setLocked(true);
}

// --- HUD ------------------------------------------------------------------

function log(message) {
  if (!message) return;
  const line = document.createElement('div');
  line.textContent = message;
  dom.log.appendChild(line);
  while (dom.log.childElementCount > 40) dom.log.removeChild(dom.log.firstChild);
  dom.log.scrollTop = dom.log.scrollHeight;
}

function updateHud() {
  dom.stats.wood.textContent = game.wood;
  dom.stats.quartz.textContent = game.quartz;
  dom.stats.feed.textContent = game.feed;
  dom.stats.snails.textContent = `${game.snails}/6`;

  if (game.horseName) dom.stats.horse.textContent = game.horseName;
  else if (game.horse) dom.stats.horse.textContent = 'Unnamed';
  else dom.stats.horse.textContent = 'None';

  const gear = [game.saddle && 'Saddle', game.bridle && 'Bridle'].filter(Boolean);
  dom.stats.gear.textContent = gear.length ? gear.join(' + ') : 'None';

  dom.buttons.house.disabled = game.wood < 20 || Boolean(world.buildings.house);
  dom.buttons.stable.disabled = game.wood < 10 || game.quartz < 5 || Boolean(world.buildings.stable);
  dom.buttons.ride.disabled = !canRide(game);

  dom.objective.textContent = nextObjective(game);
}

/** Contextual crosshair hint, refreshed a few times a second. */
function updatePrompt() {
  if (!controls.isLocked) {
    dom.prompt.textContent = '';
    return;
  }

  const hit = pickUnderCrosshair();
  if (!hit) {
    dom.prompt.textContent = '';
    return;
  }

  const creature = creatureForObject(hit.object);
  if (creature) {
    if (creature.kind === 'horse' && !creature.tamed) {
      dom.prompt.textContent = `[E] Offer feed — ${creature.coat} horse, trust ${Math.round(creature.trust)}/100`;
    } else if (creature.kind === 'snail' && !creature.collected) {
      dom.prompt.textContent = '[E] Pick up snail';
    } else if (creature.kind === 'komodo') {
      dom.prompt.textContent = '[E] Drive off the komodo';
    } else {
      dom.prompt.textContent = `[E] ${creature.kind}`;
    }
    return;
  }

  const prop = hit.object.userData.type ? hit.object : hit.object.parent;
  const labels = {
    tree: '[E] Chop for wood',
    quartz: '[E] Mine quartz',
    hay: '[E] Gather feed',
    bed: '[E] Sleep',
    trough: '[E] Stable your horse',
  };
  dom.prompt.textContent = labels[prop?.userData?.type] ?? '';
}

// --- Simulation -----------------------------------------------------------

function isNight() {
  return sunDisc.position.y < 0;
}

function createRain() {
  const geometry = new THREE.BufferGeometry();
  const count = 3000;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = Math.random() * 700 - 350;
    positions[i * 3 + 1] = Math.random() * 250;
    positions[i * 3 + 2] = Math.random() * 700 - 350;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: 0xb8cbdd, size: 1.2, transparent: true, opacity: 0.7 })
  );
  points.visible = false;
  return points;
}

function updateWeather(delta) {
  weather.nextChange -= delta;
  if (weather.nextChange <= 0) {
    weather.raining = !weather.raining;
    weather.nextChange = weather.raining ? 25 + Math.random() * 25 : 50 + Math.random() * 60;
    log(weather.raining ? 'Rain moves in. The horses are edgier in the wet.' : 'The rain clears.');
  }

  rain.visible = weather.raining;
  if (!weather.raining) return;

  rain.position.set(player.position.x, 0, player.position.z);
  const positions = rain.geometry.attributes.position.array;
  for (let i = 1; i < positions.length; i += 3) {
    positions[i] -= 260 * delta;
    if (positions[i] < 0) positions[i] = 250;
  }
  rain.geometry.attributes.position.needsUpdate = true;
}

function updateSky(delta) {
  cycleTime = (cycleTime + delta) % DAY_LENGTH;
  const angle = (cycleTime / DAY_LENGTH) * Math.PI * 2;
  const radius = 700;

  sunDisc.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, radius * 0.2);
  moonDisc.position.copy(sunDisc.position).negate();

  const daylight = THREE.MathUtils.clamp(sunDisc.position.y / 300, -1, 1);
  const brightness = THREE.MathUtils.smoothstep(daylight, -0.25, 0.35);

  // Keep the shadow frustum travelling with the player so a 2048 map covers
  // the area actually on screen rather than the whole 1600-unit field.
  sunLight.position.copy(sunDisc.position).multiplyScalar(0.4).add(player.position);
  sunLight.target.position.copy(player.position);
  sunLight.intensity = 0.15 + brightness * (weather.raining ? 0.4 : 1.0);
  hemiLight.intensity = 0.25 + brightness * 0.85;

  const daySky = weather.raining ? 0x8fa3b0 : 0x87ceeb;
  const skyColour = new THREE.Color(0x0a1030).lerp(new THREE.Color(daySky), brightness);
  scene.background.copy(skyColour);
  scene.fog.color.copy(skyColour);
}

function updateMovement(delta) {
  const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const target = running ? RUN_SPEED : WALK_SPEED;

  const forward =
    Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
  const strafe =
    Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));

  if (!controls.isLocked || (forward === 0 && strafe === 0)) {
    player.speed *= Math.max(0, 1 - delta * 8);
    return;
  }

  const magnitude = Math.hypot(forward, strafe) || 1;
  const step = target * delta;
  controls.moveForward((forward / magnitude) * step);
  controls.moveRight((strafe / magnitude) * step);
  player.speed = target;

  // Keep the player on the field.
  const flat = new THREE.Vector2(player.position.x, player.position.z);
  if (flat.length() > WORLD_RADIUS + 120) {
    flat.setLength(WORLD_RADIUS + 120);
    player.position.x = flat.x;
    player.position.z = flat.y;
  }
  player.position.y = EYE_HEIGHT;
}

function updateHazards() {
  const croc = creatures.find((creature) => creature.kind === 'crocodile');
  if (!croc || elapsed < soakedUntil) return;

  if (croc.lunging && flatDistance(croc.mesh.position, player.position) < 16) {
    soakedUntil = elapsed + 6;
    croc.cooldown = 8;
    const lost = Math.min(game.feed, Math.ceil(game.feed / 2));
    game.feed -= lost;
    log(
      lost > 0
        ? `The crocodile lunges. You scramble back up the bank and drop ${lost} feed.`
        : 'The crocodile lunges. You scramble back up the bank.'
    );

    // Shove the player back onto dry land.
    const away = player.position.clone().sub(world.pond.center).setY(0).normalize();
    player.position.copy(world.pond.center).addScaledVector(away, world.pond.radius + 40);
    player.position.y = EYE_HEIGHT;
    updateHud();
  }
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.1);
  elapsed += delta;

  updateMovement(delta);
  updateSky(delta);
  updateWeather(delta);

  if (ready) {
    updateCreatures(creatures, { player, world, weather }, delta, elapsed);
    updateHazards();
  }

  promptTimer -= delta;
  if (promptTimer <= 0) {
    promptTimer = 0.15;
    updatePrompt();
  }

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
