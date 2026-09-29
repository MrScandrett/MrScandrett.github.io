import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { loadAllSpecies } from './assets.js';
import { SPECIES, populate, updateCreatures, flatDistance } from './creatures.js';
import { buildWorld, WORLD_RADIUS } from './world.js';
import { enableTouchLook } from './touch-look.js';
import { createAudio, createFx, createGhost, createHands, createTrustBar } from './feel.js';
import {
  advanceDay,
  canRide,
  collect,
  createGame,
  dig,
  interactWithCreature,
  interactWithProp,
  nameHorse,
  nextObjective,
  ride,
  strikeProp,
  tryBuildHouse,
  tryBuildStable,
} from './game.js';

const DAY_LENGTH = 150; // seconds for a full day/night cycle
const WALK_SPEED = 22;
const RUN_SPEED = 46;
const EYE_HEIGHT = 12;
const RIDE_HEIGHT = 21;
const RIDE_SPEED = 44;
const GALLOP_SPEED = 90;
const REACH = 34; // how far a swing reaches

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
    dig: document.getElementById('btn-dig'),
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
let swingCooldown = 0;
let strideDistance = 0;
let placing = null; // { kind, ghost } while choosing a build spot

const audio = createAudio();
const fx = createFx(scene, camera, document.getElementById('popups'));
const hands = createHands(camera);
const ghosts = {
  house: createGhost(60, 60),
  stable: createGhost(62, 50),
};
scene.add(ghosts.house, ghosts.stable);

// --- Boot -----------------------------------------------------------------

const templates = await loadAllSpecies(SPECIES, (done, total) => {
  dom.loading.textContent = `Loading animals… ${done}/${total}`;
});

creatures = populate(world, templates);
game.cacheBirds = creatures.filter((creature) => creature.kind === 'toucan');
for (const creature of creatures) {
  if (creature.kind !== 'horse') continue;
  creature.trustBar = createTrustBar();
  creature.trustBar.visible = false;
  scene.add(creature.trustBar);
}
ready = true;
dom.loading.style.display = 'none';
dom.blocker.classList.remove('hidden');

log('You arrive at the field. Somewhere out here is a horse worth keeping.');
log('Hold Shift to run. Horses bolt from a runner — walk when you get close.');
log('Trees take a few chops. Walk over what falls out to pick it up.');
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

controls.addEventListener('lock', () => {
  dom.blocker.classList.add('hidden');
  audio.unlock();
});
controls.addEventListener('unlock', () => {
  if (inventoryOpen || !dom.namePanel.classList.contains('hidden')) return;
  dom.blocker.classList.remove('hidden');
});

document.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement) return;
  keys.add(event.code);

  if (event.repeat) return;
  if (event.code === 'KeyE') interact();
  if (event.code === 'KeyF') doDig();
  if (event.code === 'KeyI') toggleInventory();
  if (event.code === 'KeyR') toggleRide();
  if (event.code === 'KeyB') startPlacing('house');
  if (event.code === 'KeyN') startPlacing('stable');
  if (event.code === 'KeyM') log(audio.toggleMute() ? 'Sound off.' : 'Sound on.');
});

document.addEventListener('keyup', (event) => keys.delete(event.code));

renderer.domElement.addEventListener('mousedown', (event) => {
  if (!controls.isLocked) return;
  if (event.button === 2 && placing) cancelPlacing();
  else if (event.button === 0) interact();
});
renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());

dom.buttons.house.addEventListener('click', () => startPlacing('house'));
dom.buttons.stable.addEventListener('click', () => startPlacing('stable'));
dom.buttons.ride.addEventListener('click', toggleRide);
dom.buttons.dig.addEventListener('click', () => {
  setLocked(true);
  doDig();
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
  if (placing) {
    confirmPlacing();
    return;
  }
  if (game.riding) return;
  const hit = pickUnderCrosshair();
  if (!hit) {
    hands.swing();
    return;
  }

  const creature = creatureForObject(hit.object);
  if (creature) {
    interactCreature(creature, hit.point);
    return;
  }

  const target = hit.object.userData.type ? hit.object : hit.object.parent;
  if (['tree', 'quartz', 'hay'].includes(target?.userData?.type)) {
    swingAt(target, hit);
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

/** One swing of the axe / pickaxe / a scoop of hay. */
function swingAt(prop, hit) {
  if (swingCooldown > 0) return;
  if (hit.distance > REACH) {
    hands.swing();
    log('Too far to reach — step closer.');
    return;
  }
  swingCooldown = 0.32;
  hands.swing();
  const type = prop.userData.type;
  const result = strikeProp(game, prop);
  const at = hit.point.clone();

  if (type === 'tree') {
    audio.play('chop');
    fx.burst(at, 'wood', 6, 14);
    fx.burst(prop.position.clone().setY(28), 'leaf', 4, 8);
    fx.addShake(0.15);
  } else if (type === 'quartz') {
    audio.play('clink');
    fx.burst(at, 'quartz', 5, 14);
    fx.addShake(0.1);
  } else {
    audio.play('rustle');
    fx.burst(at, 'feed', 10, 12);
  }

  if (!result.felled) {
    fx.wobble(prop, type === 'tree' ? 0.08 : 0.05);
    fx.popup(at, '•'.repeat(result.left), '#ffffff');
    return;
  }

  const spill = () => {
    for (let i = 0; i < result.drops; i += 1) {
      const from = type === 'tree'
        ? prop.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 20, 4, (Math.random() - 0.5) * 20))
        : prop.position.clone().setY(4);
      fx.drop(from, result.resource, pickUp);
    }
  };

  if (type === 'tree') {
    audio.play('timber');
    fx.topple(prop, player.position, () => {
      spill();
      fx.burst(prop.position.clone().setY(2), 'dust', 14, 16);
    });
    log('Timber! Walk over the logs to pick them up.');
  } else {
    if (type === 'quartz') audio.play('shatter');
    fx.crumble(prop);
    spill();
  }
}

function pickUp(resource) {
  collect(game, resource);
  audio.play('pickup');
  const label = { wood: 'wood', quartz: 'quartz', feed: 'feed' }[resource];
  fx.popup(player.position.clone().setY(2).add(lookAhead(10)), `+1 ${label}`);
  bumpStat(resource);
  updateHud();
}

function lookAhead(distance) {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  direction.y = 0;
  return direction.normalize().multiplyScalar(distance);
}

function interactCreature(creature, point) {
  const before = { feed: game.feed, quartz: game.quartz, trust: creature.trust };
  const message = interactWithCreature(game, creature, player);
  log(message);

  switch (creature.kind) {
    case 'horse':
      if (game.feed < before.feed) {
        hands.use('hay', 0.8);
        hands.swing('offer');
        audio.play('munch');
        fx.burst(creature.mesh.position.clone().setY(16), 'heart', 3, 6);
        fx.popup(creature.mesh.position, `♥ ${Math.round(creature.trust)}`, '#ff8fa6');
        if (creature.tamed) {
          audio.play('whinny');
          fx.burst(creature.mesh.position.clone().setY(16), 'heart', 12, 10);
        }
      } else if (creature === game.horse) {
        audio.play('whinny');
        fx.burst(creature.mesh.position.clone().setY(16), 'heart', 2, 6);
      } else {
        audio.play('deny');
      }
      break;
    case 'cow':
      if (game.feed > before.feed) {
        audio.play('munch');
        fx.popup(creature.mesh.position, `+${game.feed - before.feed} feed`);
        bumpStat('feed');
      }
      break;
    case 'salamander':
      if (game.quartz > before.quartz) {
        hands.use('pickaxe', 0.6);
        hands.swing();
        audio.play('shatter');
        fx.burst(creature.mesh.position.clone().setY(2), 'quartz', 12, 16);
        fx.popup(creature.mesh.position, `+${game.quartz - before.quartz} quartz`);
        bumpStat('quartz');
      }
      break;
    case 'komodo':
      if (creature.scaredFor > 0) {
        audio.play('shout');
        fx.burst(creature.mesh.position.clone().setY(2), 'dust', 16, 20);
        fx.addShake(0.3);
      }
      break;
    case 'snail':
      if (creature.collected) {
        audio.play('pickup');
        fx.popup(point ?? creature.mesh.position, `snail ${game.snails}/6`, '#b8f0ff');
        bumpStat('snails');
        if (game.snails === 6) audio.play('treasure');
      }
      break;
    case 'dolphin':
    case 'crocodile':
    case 'shark':
      audio.play('splash');
      break;
    default:
      break;
  }

  if (game.horse && !game.horseName) openNamePanel();
  updateHud();
}

function doDig() {
  if (!ready || !controls.isLocked || game.riding) return;
  if (swingCooldown > 0) return;
  swingCooldown = 0.45;
  hands.use('shovel', 0.7);
  hands.swing();
  audio.play('dig');
  const spot = player.position.clone().setY(1).add(lookAhead(6));
  fx.burst(spot, 'dirt', 12, 16);

  const before = { saddle: game.saddle, bridle: game.bridle, quartz: game.quartz, wood: game.wood };
  const message = dig(game, player.position);
  log(message);
  const found = ['saddle', 'bridle', 'quartz', 'wood'].find((k) => game[k] !== before[k]);
  if (found) {
    audio.play('treasure');
    fx.addShake(0.3);
    fx.burst(spot, 'dirt', 24, 26);
    const chest = makeChest();
    chest.position.copy(spot).setY(-4);
    scene.add(chest);
    fx.tween(0.8, (t) => {
      chest.position.y = -4 + t * 5;
      chest.children[1].rotation.x = -t * 1.6;
    });
    fx.popup(spot, found === 'saddle' ? 'SADDLE!' : found === 'bridle' ? 'BRIDLE!' : `+${game[found] - before[found]} ${found}`);
    bumpStat(found === 'saddle' || found === 'bridle' ? 'gear' : found);
    updateHud();
  }
}

function makeChest() {
  const chest = new THREE.Group();
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x7a4f2a });
  const base = new THREE.Mesh(new THREE.BoxGeometry(6, 3.5, 4), woodMat);
  base.position.y = 1.75;
  chest.add(base);
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 3.5, -2);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(6, 1.2, 4), new THREE.MeshLambertMaterial({ color: 0x9a6a3a }));
  lid.position.set(0, 0.6, 2);
  lidPivot.add(lid);
  chest.add(lidPivot);
  chest.rotation.y = Math.random() * Math.PI;
  return chest;
}

// --- Building placement ----------------------------------------------------

function startPlacing(kind) {
  if (!ready || world.buildings[kind]) return;
  const enough = kind === 'house' ? game.wood >= 20 : game.wood >= 10 && game.quartz >= 5;
  if (!enough) {
    audio.play('deny');
    log(kind === 'house' ? 'Not enough wood (20 needed).' : 'Not enough materials (10 wood, 5 quartz).');
    return;
  }
  cancelPlacing();
  placing = { kind, ghost: ghosts[kind] };
  placing.ghost.visible = true;
  log(`Choose a spot for the ${kind}. Click to build, right-click to cancel.`);
  if (!controls.isLocked) setLocked(true);
}

function cancelPlacing() {
  if (!placing) return;
  placing.ghost.visible = false;
  placing = null;
}

function confirmPlacing() {
  const { kind, ghost } = placing;
  const spot = ghost.position.clone();
  cancelPlacing();
  const message = kind === 'house' ? tryBuildHouse(game, spot) : tryBuildStable(game, spot);
  log(message);
  const building = world.buildings[kind];
  if (building) {
    building.rotation.y = ghost.rotation.y;
    fx.rise(building);
    fx.burst(spot.clone().setY(2), 'dust', 30, 26);
    audio.play('build');
  }
  updateHud();
}

function updatePlacing() {
  if (!placing) return;
  const spot = placementSpot();
  placing.ghost.position.set(spot.x, 0, spot.z);
  // Face the building's doorway (+Z) back toward the player.
  placing.ghost.rotation.y = Math.atan2(player.position.x - spot.x, player.position.z - spot.z);
}

// --- Riding ---------------------------------------------------------------

function toggleRide() {
  if (!ready) return;
  if (!canRide(game)) {
    if (game.horse) {
      audio.play('deny');
      log(`Not ready to ride: ${nextObjective(game).toLowerCase()}.`);
    }
    return;
  }
  const horse = game.horse;
  if (!game.riding && flatDistance(horse.mesh.position, player.position) > 60) {
    log(`${game.horseName} is too far away — walk over to them first.`);
    return;
  }
  const message = ride(game);
  log(message);
  audio.play('whinny');
  if (game.riding) {
    cancelPlacing();
    player.position.x = horse.mesh.position.x;
    player.position.z = horse.mesh.position.z;
    hands.setVisible(false);
    if (message.includes('did it')) {
      fx.burst(horse.mesh.position.clone().setY(20), 'heart', 20, 12);
      fx.popup(horse.mesh.position, 'YOU DID IT!', '#9fe08a');
    }
  } else {
    horse.mesh.position.y = 0;
    horse.mesh.rotation.x = 0;
    horse.mesh.position.add(lookAhead(-14).applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));
    hands.setVisible(true);
  }
  updateHud();
}

function carryHorse(moving, running) {
  const horse = game.horse;
  const dir = lookAhead(1);
  horse.mesh.position.set(player.position.x - dir.x * 3, 0, player.position.z - dir.z * 3);
  horse.mesh.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI + horse.yaw;
  const gait = moving ? (running ? 11 : 7) : 0;
  const bounce = moving ? Math.abs(Math.sin(elapsed * gait)) * (running ? 2.2 : 1) : Math.sin(elapsed * 1.5) * 0.15;
  horse.mesh.position.y = bounce;
  horse.mesh.rotation.x = moving ? Math.sin(elapsed * gait) * (running ? 0.08 : 0.03) : 0;
  player.position.y = RIDE_HEIGHT + bounce * 0.8;
}

function bumpStat(key) {
  const el = dom.stats[key];
  if (!el) return;
  el.parentElement.classList.remove('bump');
  void el.parentElement.offsetWidth; // restart the CSS animation
  el.parentElement.classList.add('bump');
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
  dom.buttons.ride.textContent = game.riding ? '[R] Dismount' : '[R] Ride';

  dom.objective.textContent = nextObjective(game);
}

/** Contextual crosshair hint, refreshed a few times a second. */
function updatePrompt() {
  if (!controls.isLocked) {
    dom.prompt.textContent = '';
    return;
  }
  if (placing) {
    dom.prompt.textContent = `[Click] Build ${placing.kind} here · [Right-click] cancel`;
    return;
  }
  if (game.riding) {
    dom.prompt.textContent = '';
    return;
  }

  const hit = pickUnderCrosshair();
  if (!hit) {
    dom.prompt.textContent = '';
    hands.hold(null);
    return;
  }

  const creature = creatureForObject(hit.object);
  hands.hold(creature ? (creature.kind === 'horse' && game.feed > 0 ? 'hay' : creature.kind === 'salamander' ? 'pickaxe' : null) : null);
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
  const tool = { tree: 'axe', quartz: 'pickaxe', hay: 'hay' }[prop?.userData?.type] ?? null;
  hands.hold(tool);
  const hits = prop?.userData?.hits ?? 0;
  const labels = {
    tree: hits ? `[E] Chop — ${3 - hits} more` : '[E] Chop for wood',
    quartz: hits ? `[E] Mine — ${4 - hits} more` : '[E] Mine quartz',
    hay: '[E] Scoop hay',
    bed: '[E] Sleep',
    trough: '[E] Stable your horse',
  };
  dom.prompt.textContent = tool && tool !== 'hay' && hit.distance > REACH
    ? `${labels[prop.userData.type]} — walk closer`
    : labels[prop?.userData?.type] ?? '';
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
  const target = game.riding ? (running ? GALLOP_SPEED : RIDE_SPEED) : running ? RUN_SPEED : WALK_SPEED;

  const forward =
    Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
  const strafe =
    Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));

  const moving = controls.isLocked && (forward !== 0 || strafe !== 0);
  hands.update(delta, moving, target);
  if (game.riding) carryHorse(moving, running);

  if (!moving) {
    player.speed *= Math.max(0, 1 - delta * 8);
    if (!game.riding) player.position.y = EYE_HEIGHT;
    return;
  }

  const magnitude = Math.hypot(forward, strafe) || 1;
  const step = target * delta;
  controls.moveForward((forward / magnitude) * step);
  controls.moveRight((strafe / magnitude) * step);
  // While riding, horses see a calm rider, not a sprinting stranger.
  player.speed = game.riding ? 0 : target;

  // Footsteps (or hoofbeats) and a little head bob.
  strideDistance += target * delta;
  const stride = game.riding ? (running ? 9 : 12) : running ? 11 : 9;
  if (strideDistance > stride) {
    strideDistance = 0;
    audio.play(game.riding ? 'hoof' : 'step');
    if (game.riding && running) audio.play('hoof');
  }

  // Keep the player on the field.
  const flat = new THREE.Vector2(player.position.x, player.position.z);
  if (flat.length() > WORLD_RADIUS + 120) {
    flat.setLength(WORLD_RADIUS + 120);
    player.position.x = flat.x;
    player.position.z = flat.y;
  }
  if (!game.riding) player.position.y = EYE_HEIGHT + Math.abs(Math.sin(strideDistance / stride * Math.PI)) * (running ? 0.9 : 0.5);
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

  swingCooldown = Math.max(0, swingCooldown - delta);
  updateMovement(delta);
  updatePlacing();
  fx.update(delta, player.position);
  updateSky(delta);
  updateWeather(delta);

  if (ready) {
    updateCreatures(creatures, { player, world, weather }, delta, elapsed);
    updateHazards();
    updateTrustBars();
  }

  promptTimer -= delta;
  if (promptTimer <= 0) {
    promptTimer = 0.15;
    updatePrompt();
  }

  const shakeX = fx.shakeOffset();
  const shakeY = fx.shakeOffset();
  camera.position.x += shakeX;
  camera.position.y += shakeY;
  renderer.render(scene, camera);
  camera.position.x -= shakeX;
  camera.position.y -= shakeY;
}

function updateTrustBars() {
  for (const creature of creatures) {
    const bar = creature.trustBar;
    if (!bar) continue;
    const near = flatDistance(creature.mesh.position, player.position) < 140;
    bar.visible = !creature.tamed && near && (creature.trust > 0 || creature.spooked > 0);
    if (!bar.visible) continue;
    bar.position.copy(creature.mesh.position).setY(18);
    bar.userData.set(creature.trust, creature.spooked > 0);
  }
}

renderer.setAnimationLoop(animate);
