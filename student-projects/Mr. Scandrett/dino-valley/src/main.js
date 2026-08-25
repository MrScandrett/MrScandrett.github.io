import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { loadAllSpecies } from './assets.js';
import { SPECIES, flatDistance, populate, updateCreatures } from './creatures.js';
import { buildWorld, scatterCairns, WORLD_RADIUS } from './world.js';
import { enableTouchLook } from './touch-look.js';
import {
  advanceDay,
  canRide,
  createGame,
  dig,
  interactWithCreature,
  interactWithProp,
  nameTrike,
  nextObjective,
  ride,
  tryBuildCamp,
  tryBuildCorral,
} from './game.js';

const DAY_LENGTH = 150;
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
  nameInput: document.getElementById('trike-name-input'),
  nameSubmit: document.getElementById('name-submit'),
  stats: {
    wood: document.getElementById('stat-wood'),
    amber: document.getElementById('stat-amber'),
    ferns: document.getElementById('stat-ferns'),
    eggs: document.getElementById('stat-eggs'),
    trike: document.getElementById('stat-trike'),
    gear: document.getElementById('stat-gear'),
  },
  buttons: {
    camp: document.getElementById('btn-camp'),
    corral: document.getElementById('btn-corral'),
    ride: document.getElementById('btn-ride'),
  },
};

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('scene').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 240, 940);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.5, 2200);
const hemiLight = new THREE.HemisphereLight(0xcfe6ff, 0x4a6538, 1);
const sunLight = new THREE.DirectionalLight(0xfff2d8, 1.1);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 900;
Object.assign(sunLight.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260 });
sunLight.shadow.camera.updateProjectionMatrix();
scene.add(hemiLight, sunLight, sunLight.target);

const sunDisc = new THREE.Mesh(
  new THREE.SphereGeometry(26, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffe98a })
);
const moonDisc = new THREE.Mesh(
  new THREE.SphereGeometry(18, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xdfe6f2 })
);
scene.add(sunDisc, moonDisc);

const rain = createRain();
scene.add(rain);

const controls = new PointerLockControls(camera, renderer.domElement);
const playerObject = controls.getObject();
scene.add(playerObject);
playerObject.position.set(0, EYE_HEIGHT, 90);

const world = buildWorld(scene);
const game = createGame(world);
const player = { position: playerObject.position, speed: 0 };
const weather = { raining: false, nextChange: 45 };
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const keys = new Set();

let creatures = [];
let cycleTime = DAY_LENGTH * 0.15;
let elapsed = 0;
let ready = false;
let inventoryOpen = false;
let dangerCooldown = 0;
let promptTimer = 0;
let rexWarned = false;

const cairnData = [
  { position: new THREE.Vector3(-185, 0, -120), contents: 'yoke', looted: false },
  { position: new THREE.Vector3(230, 0, 175), contents: 'reins', looted: false },
  { position: new THREE.Vector3(-265, 0, 190), contents: 'amber', looted: false },
  { position: new THREE.Vector3(105, 0, 285), contents: 'wood', looted: false },
];
scatterCairns(world, cairnData.map((site) => site.position));
game.cairnSites = cairnData;

const templates = await loadAllSpecies(SPECIES, (done, total) => {
  dom.loading.textContent = `Loading dinosaurs… ${done}/${total}`;
});

creatures = populate(world, templates);
ready = true;
dom.loading.style.display = 'none';
dom.blocker.classList.remove('hidden');
log('You enter Dino Valley. A triceratops can become an ally, but only if you earn its trust.');
log('Walk near a triceratops. Running makes it bolt.');
log('Watch for a rex on the horizon — a parasaurolophus call means it is close.');
updateHud();

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
  if (event.code === 'KeyF') {
    log(dig(game, player.position));
    updateHud();
  }
  if (event.code === 'KeyI') toggleInventory();
});
document.addEventListener('keyup', (event) => keys.delete(event.code));
renderer.domElement.addEventListener('mousedown', (event) => {
  if (event.button === 0 && controls.isLocked) interact();
});

dom.buttons.camp.addEventListener('click', () => {
  log(tryBuildCamp(game, placementSpot()));
  updateHud();
});
dom.buttons.corral.addEventListener('click', () => {
  log(tryBuildCorral(game, placementSpot()));
  updateHud();
});
dom.buttons.ride.addEventListener('click', () => {
  const message = ride(game);
  if (message) log(message);
  updateHud();
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

function interactionTargets() {
  return [...world.interactables, ...creatures.filter((creature) => creature.mesh.visible).map((creature) => creature.mesh)];
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
  raycaster.far = 62;
  return raycaster.intersectObjects(interactionTargets(), true)[0] ?? null;
}

function interact() {
  if (!ready || !controls.isLocked) return;
  const hit = pickUnderCrosshair();
  if (!hit) return;

  const creature = creatureForObject(hit.object);
  if (creature) {
    log(interactWithCreature(game, creature, player));
    if (game.trike && !game.trikeName) openNamePanel();
    updateHud();
    return;
  }

  const prop = hit.object.userData.type ? hit.object : hit.object.parent;
  if (prop?.userData?.type === 'firepit') {
    if (isNight()) {
      cycleTime = DAY_LENGTH * 0.05;
      advanceDay(game).forEach(log);
    } else {
      log('The fire is ready, but it is too early to sleep.');
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
  return player.position.clone().addScaledVector(direction.normalize(), 80);
}

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
  log(nameTrike(game, dom.nameInput.value));
  if (!game.trikeName) return;
  dom.namePanel.classList.add('hidden');
  updateHud();
  setLocked(true);
}

function toggleInventory() {
  inventoryOpen = !inventoryOpen;
  dom.panel.classList.toggle('expanded', inventoryOpen);
  setLocked(!inventoryOpen);
}

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
  dom.stats.amber.textContent = game.amber;
  dom.stats.ferns.textContent = game.ferns;
  dom.stats.eggs.textContent = `${game.eggs}/6`;
  dom.stats.trike.textContent = game.trikeName ?? (game.trike ? 'Unnamed' : 'None');
  const gear = [game.yoke && 'Yoke', game.reins && 'Reins'].filter(Boolean);
  dom.stats.gear.textContent = gear.length ? gear.join(' + ') : 'None';
  dom.buttons.camp.disabled = game.wood < 20 || Boolean(world.buildings.camp);
  dom.buttons.corral.disabled = game.wood < 10 || game.amber < 5 || Boolean(world.buildings.corral);
  dom.buttons.ride.disabled = !canRide(game);
  dom.objective.textContent = nextObjective(game);
}

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
    if (creature.kind === 'triceratops' && !creature.tamed) {
      dom.prompt.textContent = `[E] Offer ferns — ${creature.frill} frill, trust ${Math.round(creature.trust)}/100`;
    } else if (creature.kind === 'parasaurolophus' && creature.calling > 0) {
      dom.prompt.textContent = '[E] Listen to its warning call';
    } else if (creature.kind === 'velociraptor') {
      dom.prompt.textContent = '[E] Shout and drive it off';
    } else {
      dom.prompt.textContent = `[E] ${creature.kind}`;
    }
    return;
  }
  const prop = hit.object.userData.type ? hit.object : hit.object.parent;
  const labels = {
    log: '[E] Break up for wood',
    amber: '[E] Collect amber',
    fern: '[E] Gather ferns',
    egg: '[E] Examine clutch',
    firepit: '[E] Rest by the fire',
    hide: '[E] Settle your triceratops',
  };
  dom.prompt.textContent = labels[prop?.userData?.type] ?? '';
}

function isNight() {
  return sunDisc.position.y < 0;
}

function createRain() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(3000 * 3);
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = Math.random() * 700 - 350;
    positions[i + 1] = Math.random() * 250;
    positions[i + 2] = Math.random() * 700 - 350;
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
    log(weather.raining ? 'Rain sweeps across the valley. The herd grows restless.' : 'The rain clears.');
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
  sunLight.position.copy(sunDisc.position).multiplyScalar(0.4).add(player.position);
  sunLight.target.position.copy(player.position);
  sunLight.intensity = 0.15 + brightness * (weather.raining ? 0.4 : 1);
  hemiLight.intensity = 0.25 + brightness * 0.85;
  const daySky = weather.raining ? 0x8fa3b0 : 0x87ceeb;
  const skyColour = new THREE.Color(0x0a1030).lerp(new THREE.Color(daySky), brightness);
  scene.background.copy(skyColour);
  scene.fog.color.copy(skyColour);
}

function updateMovement(delta) {
  const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const target = running ? RUN_SPEED : WALK_SPEED;
  const forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
  const strafe = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
  if (!controls.isLocked || (forward === 0 && strafe === 0)) {
    player.speed *= Math.max(0, 1 - delta * 8);
    return;
  }
  const magnitude = Math.hypot(forward, strafe) || 1;
  controls.moveForward((forward / magnitude) * target * delta);
  controls.moveRight((strafe / magnitude) * target * delta);
  player.speed = target;
  const flat = new THREE.Vector2(player.position.x, player.position.z);
  if (flat.length() > WORLD_RADIUS + 120) {
    flat.setLength(WORLD_RADIUS + 120);
    player.position.x = flat.x;
    player.position.z = flat.y;
  }
  player.position.y = EYE_HEIGHT;
}

function updateHazards(delta) {
  dangerCooldown = Math.max(0, dangerCooldown - delta);
  const rex = creatures.find((creature) => creature.kind === 'trex');
  if (rex && dangerCooldown === 0 && rex.lunging && flatDistance(rex.mesh.position, player.position) < 20) {
    dangerCooldown = 7;
    rex.cooldown = 8;
    const lost = Math.min(game.ferns, Math.ceil(game.ferns / 2));
    game.ferns -= lost;
    log(lost ? `The rex charges. You escape, but drop ${lost} ferns.` : 'The rex charges. You barely escape its jaws.');
    const away = player.position.clone().sub(rex.mesh.position).setY(0).normalize();
    if (away.lengthSq() === 0) away.set(1, 0, 0);
    player.position.addScaledVector(away, 70);
    player.position.y = EYE_HEIGHT;
    updateHud();
    return;
  }

  for (const stego of creatures) {
    if (stego.kind !== 'stegosaurus' || !stego.justSwung) continue;
    stego.justSwung = false;
    if (flatDistance(stego.mesh.position, player.position) > 18) continue;
    log('The stegosaurus swings its tail. You are knocked back onto the grass.');
    const away = player.position.clone().sub(stego.mesh.position).setY(0).normalize();
    if (away.lengthSq() === 0) away.set(1, 0, 0);
    player.position.addScaledVector(away, 30);
    player.position.y = EYE_HEIGHT;
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
    updateHazards(delta);

    if (world.rexAlarm > 0 && !rexWarned) {
      rexWarned = true;
      log('A parasaurolophus lets out a warning call. The rex is close.');
    } else if (world.rexAlarm <= 0) {
      rexWarned = false;
    }
  }
  promptTimer -= delta;
  if (promptTimer <= 0) {
    promptTimer = 0.15;
    updatePrompt();
  }
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
