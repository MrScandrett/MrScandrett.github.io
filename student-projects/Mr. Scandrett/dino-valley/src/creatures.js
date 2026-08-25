import * as THREE from 'three';
import { spawnFrom, playAction } from './assets.js';

/**
 * Per-species art data. `fitLength` normalises the wildly different source
 * scales onto a playable herd. Every model in this pack is authored
 * nose-along -Z, which is also the direction `faceAlong` points them, so no
 * per-species yaw correction is needed — `yaw` stays here as the hook if a
 * future model disagrees.
 */
export const SPECIES = {
  triceratops: { fitLength: 20, yaw: 0 },
  parasaurolophus: { fitLength: 17, yaw: 0 },
  stegosaurus: { fitLength: 19, yaw: 0 },
  apatosaurus: { fitLength: 58, yaw: 0 },
  velociraptor: { fitLength: 8, yaw: 0 },
  trex: { fitLength: 32, yaw: 0 },
};

const FRILL_NAMES = ['Amber', 'Moss', 'Clay', 'Umber', 'Sand'];
const HUE_SHIFTS = [0, 0.06, -0.05, 0.1, -0.08];

/**
 * How fast a wary triceratops gives ground. Deliberately below the player's
 * walking speed (22) so patience always closes the distance, and well below
 * the bolt speed it uses when startled.
 */
const RETREAT_SPEED = 14;

const tmpVec = new THREE.Vector3();

function randomPointInRing(inner, outer) {
  const angle = Math.random() * Math.PI * 2;
  const radius = inner + Math.random() * (outer - inner);
  return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
}

/** Distance between two entities on the ground plane, ignoring height. */
export function flatDistance(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

function faceAlong(creature, dirX, dirZ) {
  if (dirX === 0 && dirZ === 0) return;
  creature.mesh.rotation.y = Math.atan2(dirX, dirZ) + Math.PI + creature.yaw;
}

/** Recolour a clone's frill/hide pattern without disturbing its neighbours. */
function tintInstance(instance, hueShift) {
  if (!hueShift) return;
  instance.mesh.traverse((child) => {
    if (!child.isMesh) return;
    const wasArray = Array.isArray(child.material);
    const source = wasArray ? child.material : [child.material];
    const tinted = source.map((mat) => {
      const clone = mat.clone();
      const hsl = { h: 0, s: 0, l: 0 };
      clone.color.getHSL(hsl);
      clone.color.setHSL((hsl.h + hueShift + 1) % 1, hsl.s, hsl.l);
      return clone;
    });
    child.material = wasArray ? tinted : tinted[0];
  });
}

/**
 * A creature is an animated instance plus the small bag of state its
 * behaviour needs. The `kind` drives which update function runs each frame.
 */
function makeCreature(kind, instance, extra = {}) {
  return {
    kind,
    instance,
    mesh: instance.mesh,
    yaw: SPECIES[extra.species ?? kind]?.yaw ?? 0,
    heading: new THREE.Vector3(),
    restTimer: Math.random() * 3,
    speed: 0,
    ...extra,
  };
}

function setAnim(creature, name) {
  playAction(creature.instance, name);
}

// --- Spawning -------------------------------------------------------------

export function populate(world, templates) {
  const creatures = [];
  const { waterhole } = world;

  const scatter = (radius) => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const point = randomPointInRing(60, radius);
      if (flatDistance(point, waterhole.center) > waterhole.radius + 30) return point;
    }
    return randomPointInRing(waterhole.radius + 40, radius);
  };

  // Triceratops: the goal of the game. Each has its own frill tint and
  // temperament, so the player has a reason to shop around before committing.
  for (let i = 0; i < 5; i += 1) {
    const instance = spawnFrom(templates.triceratops);
    tintInstance(instance, HUE_SHIFTS[i]);
    instance.mesh.position.copy(scatter(320));
    world.scene.add(instance.mesh);
    creatures.push(
      makeCreature('triceratops', instance, {
        frill: FRILL_NAMES[i],
        trust: 0,
        tamed: false,
        // Bolder individuals let you get closer but are slower to bond.
        boldness: 0.5 + i * 0.12,
        topSpeed: 26 + Math.random() * 12,
        spooked: 0,
        spookedByPredator: false,
        comfort() {
          return 70 - this.trust * 0.45 - this.boldness * 12;
        },
      })
    );
  }

  // Parasaurolophus: a wary herd. Their crest call is the player's early
  // warning that the rex is nearby.
  for (let i = 0; i < 5; i += 1) {
    const instance = spawnFrom(templates.parasaurolophus);
    instance.mesh.position.copy(scatter(300));
    world.scene.add(instance.mesh);
    creatures.push(makeCreature('parasaurolophus', instance, { calling: 0 }));
  }

  // Stegosaurus: solitary tanks. Harmless until crowded, then a tail swipe
  // sends the player stumbling back.
  for (let i = 0; i < 3; i += 1) {
    const instance = spawnFrom(templates.stegosaurus);
    instance.mesh.position.copy(scatter(280));
    world.scene.add(instance.mesh);
    creatures.push(makeCreature('stegosaurus', instance, { crowdedFor: 0, swingCooldown: 0 }));
  }

  // Apatosaurus: gentle giants. A renewable browse source, and a landmark
  // herd big enough to see from across the valley.
  for (let i = 0; i < 3; i += 1) {
    const instance = spawnFrom(templates.apatosaurus);
    instance.mesh.position.copy(scatter(260));
    world.scene.add(instance.mesh);
    creatures.push(makeCreature('apatosaurus', instance, { browsedOnDay: -1 }));
  }

  // Velociraptor: pack hunters. They pressure the herd, not the player
  // directly — shouting drives the whole pack off at once.
  const pack = [];
  for (let i = 0; i < 4; i += 1) {
    const instance = spawnFrom(templates.velociraptor);
    instance.mesh.position.copy(scatter(300));
    world.scene.add(instance.mesh);
    const raptor = makeCreature('velociraptor', instance, { scaredFor: 0, target: null, packIndex: i });
    pack.push(raptor);
    creatures.push(raptor);
  }

  // The rex: one apex predator that roams the whole valley, answers to
  // nothing, and is the reason nobody in the valley fully relaxes.
  const rex = spawnFrom(templates.trex);
  rex.mesh.position.copy(scatter(360));
  world.scene.add(rex.mesh);
  creatures.push(
    makeCreature('trex', rex, {
      orbitTarget: scatter(360),
      cooldown: 0,
      lunging: 0,
    })
  );

  return creatures;
}

// --- Behaviour ------------------------------------------------------------

function wander(creature, delta, speed, bounds = 380) {
  creature.restTimer -= delta;
  if (creature.restTimer <= 0) {
    creature.restTimer = 2 + Math.random() * 4;
    const angle = Math.random() * Math.PI * 2;
    creature.heading.set(Math.cos(angle), 0, Math.sin(angle));
    if (creature.mesh.position.length() > bounds) {
      creature.heading.copy(creature.mesh.position).setY(0).normalize().negate();
    }
    creature.speed = Math.random() < 0.35 ? 0 : speed;
  }
  if (creature.speed > 0) {
    creature.mesh.position.addScaledVector(creature.heading, creature.speed * delta);
    faceAlong(creature, creature.heading.x, creature.heading.z);
    setAnim(creature, 'walk');
  } else {
    setAnim(creature, 'idle');
  }
}

function flee(creature, from, delta, speed) {
  tmpVec.copy(creature.mesh.position).sub(from).setY(0);
  if (tmpVec.lengthSq() < 1e-4) return;
  tmpVec.normalize();
  creature.mesh.position.addScaledVector(tmpVec, speed * delta);
  faceAlong(creature, tmpVec.x, tmpVec.z);
  setAnim(creature, speed > 20 ? 'run' : 'walk');
}

/** Nearest currently-dangerous predator to a point, or null if none is close. */
function nearestPredator(point, ctx) {
  let best = null;
  let bestDist = Infinity;
  if (ctx.rex) {
    const d = flatDistance(point, ctx.rex.mesh.position);
    if (d < bestDist) {
      best = ctx.rex;
      bestDist = d;
    }
  }
  for (const raptor of ctx.raptors) {
    if (raptor.scaredFor > 0) continue;
    const d = flatDistance(point, raptor.mesh.position);
    if (d < bestDist) {
      best = raptor;
      bestDist = d;
    }
  }
  return best ? { predator: best, distance: bestDist } : null;
}

function updateTriceratops(creature, ctx, delta) {
  const { player, weather } = ctx;
  const distance = flatDistance(creature.mesh.position, player.position);

  if (creature.tamed) {
    if (distance > 32) {
      tmpVec.copy(player.position).sub(creature.mesh.position).setY(0).normalize();
      creature.mesh.position.addScaledVector(tmpVec, Math.min(creature.topSpeed, 24) * delta);
      faceAlong(creature, tmpVec.x, tmpVec.z);
      setAnim(creature, 'walk');
    } else {
      faceAlong(
        creature,
        player.position.x - creature.mesh.position.x,
        player.position.z - creature.mesh.position.z
      );
      setAnim(creature, 'idle');
    }
    return;
  }

  creature.spooked = Math.max(0, creature.spooked - delta);

  const threat = nearestPredator(creature.mesh.position, ctx);
  if (threat && threat.distance < 100) {
    creature.spooked = Math.max(creature.spooked, 1.5);
    creature.spookedByPredator = true;
    creature.trust = Math.max(0, creature.trust - 6 * delta);
    flee(creature, threat.predator.mesh.position, delta, creature.topSpeed);
    return;
  }

  const comfort = creature.comfort();
  const rushing = player.speed > 26;

  if (rushing && distance < comfort + 25) {
    creature.spooked = 2;
    creature.spookedByPredator = false;
    creature.trust = Math.max(0, creature.trust - 10 * delta);
    flee(creature, player.position, delta, creature.topSpeed);
    return;
  }

  if (creature.spooked > 0) {
    flee(creature, player.position, delta, creature.topSpeed);
    return;
  }

  if (distance < comfort) {
    flee(creature, player.position, delta, RETREAT_SPEED);
  } else {
    faceAlong(
      creature,
      player.position.x - creature.mesh.position.x,
      player.position.z - creature.mesh.position.z
    );
    setAnim(creature, 'idle');
  }

  if (distance < comfort + 30) {
    const rate = weather.raining ? 0.6 : 1.4;
    creature.trust = Math.min(100, creature.trust + rate * delta);
    return;
  }

  wander(creature, delta, 11);
}

function updateParasaurolophus(creature, ctx, delta) {
  const threat = nearestPredator(creature.mesh.position, ctx);
  if (threat && threat.distance < 90) {
    creature.calling = 1.4;
    ctx.world.rexAlarm = threat.predator.kind === 'trex' ? 3 : ctx.world.rexAlarm;
    flee(creature, threat.predator.mesh.position, delta, 30);
    return;
  }
  creature.calling = Math.max(0, creature.calling - delta);
  wander(creature, delta, 9);
}

function updateStegosaurus(creature, ctx, delta) {
  const { player } = ctx;
  const distance = flatDistance(creature.mesh.position, player.position);
  creature.swingCooldown = Math.max(0, creature.swingCooldown - delta);

  const threat = nearestPredator(creature.mesh.position, ctx);
  if (threat && threat.distance < 40) {
    // Stegosaurus stands its ground against predators rather than fleeing —
    // its plates are the whole point — so it just turns to face the threat.
    faceAlong(
      creature,
      threat.predator.mesh.position.x - creature.mesh.position.x,
      threat.predator.mesh.position.z - creature.mesh.position.z
    );
    setAnim(creature, 'idle');
    return;
  }

  if (distance < 14) {
    creature.crowdedFor += delta;
    faceAlong(
      creature,
      player.position.x - creature.mesh.position.x,
      player.position.z - creature.mesh.position.z
    );
    if (creature.crowdedFor > 1.5 && creature.swingCooldown === 0) {
      setAnim(creature, 'attack');
      creature.swingCooldown = 4;
      creature.justSwung = true;
    } else {
      setAnim(creature, 'idle');
    }
    return;
  }

  creature.crowdedFor = 0;
  wander(creature, delta, 7);
}

function updateApatosaurus(creature, ctx, delta) {
  const threat = nearestPredator(creature.mesh.position, ctx);
  if (threat && threat.predator.kind === 'trex' && threat.distance < 70) {
    flee(creature, threat.predator.mesh.position, delta, 14);
    return;
  }
  wander(creature, delta, 5);
}

function updateVelociraptor(creature, ctx, delta) {
  if (creature.scaredFor > 0) {
    creature.scaredFor -= delta;
    flee(creature, ctx.player.position, delta, 32);
    return;
  }

  // Hunt the nearest herbivore. Parasaurolophus are jumpier and harder to
  // close on, so a stegosaurus or straggling triceratops wins ties.
  let best = null;
  let bestScore = Infinity;
  for (const other of ctx.creatures) {
    if (!['triceratops', 'parasaurolophus', 'stegosaurus'].includes(other.kind)) continue;
    if (other.kind === 'triceratops' && other.tamed) continue;
    const score = flatDistance(creature.mesh.position, other.mesh.position) * (other.kind === 'parasaurolophus' ? 1.3 : 1);
    if (score < bestScore) {
      bestScore = score;
      best = other;
    }
  }

  creature.target = best;
  if (best && bestScore > 14) {
    tmpVec.copy(best.mesh.position).sub(creature.mesh.position).setY(0).normalize();
    creature.mesh.position.addScaledVector(tmpVec, 20 * delta);
    faceAlong(creature, tmpVec.x, tmpVec.z);
    setAnim(creature, 'run');
    return;
  }

  wander(creature, delta, 12);
}

function updateRex(creature, ctx, delta) {
  const { player, world } = ctx;
  const playerDistance = flatDistance(creature.mesh.position, player.position);

  creature.cooldown = Math.max(0, creature.cooldown - delta);

  if (playerDistance < 130 && creature.cooldown === 0) {
    tmpVec.copy(player.position).sub(creature.mesh.position).setY(0).normalize();
    creature.mesh.position.addScaledVector(tmpVec, 27 * delta);
    faceAlong(creature, tmpVec.x, tmpVec.z);
    setAnim(creature, 'run');
    creature.lunging = playerDistance < 20 ? 1 : 0;
    return;
  }

  creature.lunging = 0;

  // Hunt whatever herbivore is nearest when the player is out of range.
  let best = null;
  let bestDist = Infinity;
  for (const other of ctx.creatures) {
    if (!['triceratops', 'apatosaurus', 'parasaurolophus', 'stegosaurus'].includes(other.kind)) continue;
    const d = flatDistance(creature.mesh.position, other.mesh.position);
    if (d < bestDist) {
      bestDist = d;
      best = other;
    }
  }

  if (best && bestDist < 200) {
    tmpVec.copy(best.mesh.position).sub(creature.mesh.position).setY(0).normalize();
    creature.mesh.position.addScaledVector(tmpVec, 16 * delta);
    faceAlong(creature, tmpVec.x, tmpVec.z);
    setAnim(creature, 'walk');
    return;
  }

  wander(creature, delta, 9, world ? 400 : 380);
}

export function updateCreatures(creatures, ctx, delta, elapsed) {
  ctx.creatures = creatures;
  ctx.raptors = creatures.filter((c) => c.kind === 'velociraptor');
  ctx.rex = creatures.find((c) => c.kind === 'trex');
  ctx.world.rexAlarm = Math.max(0, (ctx.world.rexAlarm ?? 0) - delta);

  for (const creature of creatures) {
    switch (creature.kind) {
      case 'triceratops':
        updateTriceratops(creature, ctx, delta);
        break;
      case 'parasaurolophus':
        updateParasaurolophus(creature, ctx, delta);
        break;
      case 'stegosaurus':
        updateStegosaurus(creature, ctx, delta);
        break;
      case 'apatosaurus':
        updateApatosaurus(creature, ctx, delta);
        break;
      case 'velociraptor':
        updateVelociraptor(creature, ctx, delta);
        break;
      case 'trex':
        updateRex(creature, ctx, delta);
        break;
      default:
        break;
    }
    creature.instance.mixer.update(delta);
  }
}
