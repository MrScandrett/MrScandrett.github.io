import * as THREE from 'three';
import { spawnFrom } from './assets.js';

/**
 * Per-species art data. `fitLength` normalises the wildly different source
 * scales. Every model in this pack is authored nose-down -Z, which is also the
 * direction `faceAlong` points them, so no per-species yaw correction is
 * needed — `yaw` stays here as the hook if a future model disagrees.
 */
export const SPECIES = {
  horse: { fitLength: 18, yaw: 0 },
  cow: { fitLength: 17, yaw: 0 },
  komodo: { fitLength: 22, yaw: 0 },
  salamander: { fitLength: 9, yaw: 0 },
  toucan: { fitLength: 7, yaw: 0 },
  'toucan-large': { fitLength: 9, yaw: 0 },
  snail: { fitLength: 7, yaw: 0 },
  crocodile: { fitLength: 30, yaw: 0 },
  dolphin: { fitLength: 24, yaw: 0 },
  shark: { fitLength: 20, yaw: 0 },
};

export const COAT_TINTS = [0xffffff, 0xd8b48a, 0x8a5a3b, 0x4a3a34, 0xe8e2d4];

const COAT_NAMES = ['Cream', 'Dun', 'Chestnut', 'Bay', 'Grey'];

/**
 * How fast a wary horse gives ground. Deliberately below the player's walking
 * speed (22) so patience always closes the distance, and well below the bolt
 * speed it uses when startled.
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

/**
 * A creature is a mesh plus the small bag of state its behaviour needs. The
 * `kind` drives which update function runs each frame.
 */
function makeCreature(kind, mesh, extra = {}) {
  return {
    kind,
    mesh,
    yaw: SPECIES[extra.species ?? kind]?.yaw ?? 0,
    heading: new THREE.Vector3(),
    restTimer: Math.random() * 3,
    speed: 0,
    ...extra,
  };
}

// --- Spawning -------------------------------------------------------------

export function populate(world, templates) {
  const creatures = [];
  const { pond } = world;

  const scatter = (radius) => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const point = randomPointInRing(60, radius);
      if (flatDistance(point, pond.center) > pond.radius + 30) return point;
    }
    return randomPointInRing(pond.radius + 40, radius);
  };

  // Wild horses: the goal of the game. Each has its own coat and temperament,
  // so the player has a reason to shop around before committing to one.
  for (let i = 0; i < 5; i += 1) {
    const mesh = spawnFrom(templates.horse, COAT_TINTS[i]);
    mesh.position.copy(scatter(320));
    world.scene.add(mesh);
    creatures.push(
      makeCreature('horse', mesh, {
        coat: COAT_NAMES[i],
        trust: 0,
        tamed: false,
        // Bolder horses let you get closer but are slower to bond.
        boldness: 0.5 + i * 0.12,
        topSpeed: 26 + Math.random() * 14,
        spooked: 0,
        // Flight distance, shared by the AI and the HUD readout so the two
        // can never disagree about how skittish this horse currently is.
        comfort() {
          return 70 - this.trust * 0.45 - this.boldness * 12;
        },
      })
    );
  }

  // Cows: a renewable feed source, and bait that pulls the komodo off the herd.
  for (let i = 0; i < 4; i += 1) {
    const mesh = spawnFrom(templates.cow);
    mesh.position.copy(scatter(280));
    world.scene.add(mesh);
    creatures.push(makeCreature('cow', mesh, { milkedOnDay: -1 }));
  }

  // Komodo: the pressure. It hunts whatever warm body is nearest.
  const komodo = spawnFrom(templates.komodo);
  komodo.position.copy(scatter(300));
  world.scene.add(komodo);
  creatures.push(makeCreature('komodo', komodo, { scaredFor: 0, target: null }));

  // Salamanders: sit on quartz seams. Startling one exposes its seam.
  for (let i = 0; i < 6; i += 1) {
    const mesh = spawnFrom(templates.salamander);
    mesh.position.copy(scatter(300));
    world.scene.add(mesh);
    creatures.push(makeCreature('salamander', mesh, { startled: 0, revealed: false }));
  }

  // Toucans: each circles a buried cache, which is how gear is found.
  const cacheContents = ['saddle', 'bridle', 'quartz', 'wood'];
  cacheContents.forEach((contents, i) => {
    const species = i % 2 === 0 ? 'toucan' : 'toucan-large';
    const mesh = spawnFrom(templates[species]);
    const cache = scatter(300);
    mesh.position.copy(cache);
    world.scene.add(mesh);
    creatures.push(
      makeCreature('toucan', mesh, {
        species,
        cache: cache.clone(),
        contents,
        looted: false,
        orbit: Math.random() * Math.PI * 2,
        orbitRadius: 26 + Math.random() * 10,
        altitude: 44 + Math.random() * 18,
      })
    );
  });

  // Snails: six hidden collectibles, deliberately easy to walk past.
  for (let i = 0; i < 6; i += 1) {
    const mesh = spawnFrom(templates.snail);
    mesh.position.copy(scatter(340));
    world.scene.add(mesh);
    creatures.push(makeCreature('snail', mesh, { collected: false }));
  }

  // Pond life. The croc patrols the shallows; the shark and dolphin hold to
  // deeper laps so the water reads as occupied from the bank.
  const croc = spawnFrom(templates.crocodile);
  croc.position.copy(pond.center).setY(-1);
  world.scene.add(croc);
  creatures.push(
    makeCreature('crocodile', croc, {
      orbit: 0,
      lunging: 0,
      cooldown: 0,
      home: pond.center.clone(),
    })
  );

  ['shark', 'dolphin'].forEach((kind, i) => {
    const mesh = spawnFrom(templates[kind]);
    world.scene.add(mesh);
    creatures.push(
      makeCreature(kind, mesh, {
        orbit: i * Math.PI,
        orbitRadius: pond.radius * (0.45 + i * 0.22),
        home: pond.center.clone(),
      })
    );
  });

  return creatures;
}

// --- Behaviour ------------------------------------------------------------

function wander(creature, delta, speed, bounds = 360) {
  creature.restTimer -= delta;
  if (creature.restTimer <= 0) {
    creature.restTimer = 2 + Math.random() * 4;
    const angle = Math.random() * Math.PI * 2;
    creature.heading.set(Math.cos(angle), 0, Math.sin(angle));
    // Steer back toward the middle if we have drifted to the map edge.
    if (creature.mesh.position.length() > bounds) {
      creature.heading.copy(creature.mesh.position).setY(0).normalize().negate();
    }
    creature.speed = Math.random() < 0.35 ? 0 : speed;
  }
  if (creature.speed > 0) {
    creature.mesh.position.addScaledVector(creature.heading, creature.speed * delta);
    faceAlong(creature, creature.heading.x, creature.heading.z);
  }
}

function flee(creature, from, delta, speed) {
  tmpVec.copy(creature.mesh.position).sub(from).setY(0);
  if (tmpVec.lengthSq() < 1e-4) return;
  tmpVec.normalize();
  creature.mesh.position.addScaledVector(tmpVec, speed * delta);
  faceAlong(creature, tmpVec.x, tmpVec.z);
}

function updateHorse(creature, ctx, delta) {
  const { player, komodo, weather } = ctx;
  const distance = flatDistance(creature.mesh.position, player.position);

  if (creature.tamed) {
    // A tamed horse trails the player at a polite distance.
    if (distance > 30) {
      tmpVec.copy(player.position).sub(creature.mesh.position).setY(0).normalize();
      creature.mesh.position.addScaledVector(tmpVec, Math.min(creature.topSpeed, 24) * delta);
      faceAlong(creature, tmpVec.x, tmpVec.z);
    } else {
      faceAlong(
        creature,
        player.position.x - creature.mesh.position.x,
        player.position.z - creature.mesh.position.z
      );
    }
    return;
  }

  creature.spooked = Math.max(0, creature.spooked - delta);

  // A hunting komodo nearby overrides everything else and burns off trust.
  if (komodo && !komodo.scaredFor && flatDistance(creature.mesh.position, komodo.mesh.position) < 90) {
    creature.spooked = Math.max(creature.spooked, 1.5);
    creature.trust = Math.max(0, creature.trust - 6 * delta);
    flee(creature, komodo.mesh.position, delta, creature.topSpeed);
    return;
  }

  // Flight distance: how close the horse tolerates you before giving ground.
  // It shrinks as trust builds, which is what eventually lets you reach it.
  const comfort = creature.comfort();
  const rushing = player.speed > 26;

  // Sprinting at a horse makes it bolt outright and costs trust. This is the
  // one thing a player can do that actively undoes progress.
  if (rushing && distance < comfort + 25) {
    creature.spooked = 2;
    creature.trust = Math.max(0, creature.trust - 10 * delta);
    flee(creature, player.position, delta, creature.topSpeed);
    return;
  }

  if (creature.spooked > 0) {
    flee(creature, player.position, delta, creature.topSpeed);
    return;
  }

  // Walking into its comfort zone makes it back off at a pace slower than the
  // player's walk, so a patient approach closes the gap without ever catching
  // it by force. Trust still accrues the whole time.
  if (distance < comfort) {
    flee(creature, player.position, delta, RETREAT_SPEED);
  } else {
    faceAlong(
      creature,
      player.position.x - creature.mesh.position.x,
      player.position.z - creature.mesh.position.z
    );
  }

  // Calm and nearby: the horse settles and warms to you on its own.
  if (distance < comfort + 30) {
    const rate = weather.raining ? 0.6 : 1.4;
    creature.trust = Math.min(100, creature.trust + rate * delta);
    return;
  }

  wander(creature, delta, 12);
}

function updateKomodo(creature, ctx, delta) {
  if (creature.scaredFor > 0) {
    creature.scaredFor -= delta;
    flee(creature, ctx.player.position, delta, 34);
    return;
  }

  // Hunt the nearest horse or cow. Cows are easier prey, so they win ties —
  // which is what makes them useful as a decoy.
  let best = null;
  let bestScore = Infinity;
  for (const other of ctx.creatures) {
    if (other.kind !== 'horse' && other.kind !== 'cow') continue;
    const score =
      flatDistance(creature.mesh.position, other.mesh.position) * (other.kind === 'cow' ? 0.6 : 1);
    if (score < bestScore) {
      bestScore = score;
      best = other;
    }
  }

  creature.target = best;
  if (best && bestScore > 12) {
    tmpVec.copy(best.mesh.position).sub(creature.mesh.position).setY(0).normalize();
    creature.mesh.position.addScaledVector(tmpVec, 16 * delta);
    faceAlong(creature, tmpVec.x, tmpVec.z);
    return;
  }

  wander(creature, delta, 10);
}

function updateCow(creature, ctx, delta) {
  const komodo = ctx.komodo;
  if (komodo && !komodo.scaredFor && flatDistance(creature.mesh.position, komodo.mesh.position) < 50) {
    flee(creature, komodo.mesh.position, delta, 18);
    return;
  }
  wander(creature, delta, 7);
}

function updateSalamander(creature, ctx, delta) {
  const distance = flatDistance(creature.mesh.position, ctx.player.position);
  if (creature.startled > 0) {
    creature.startled -= delta;
    flee(creature, ctx.player.position, delta, 30);
    return;
  }
  if (distance < 22) {
    creature.startled = 1.2;
    return;
  }
  wander(creature, delta, 9);
}

function updateToucan(creature, delta, elapsed) {
  // Circling directly over its cache is the whole tell — the bird is a
  // waypoint marker the player learns to read.
  creature.orbit += delta * 0.7;
  const { cache, orbitRadius, altitude } = creature;
  creature.mesh.position.set(
    cache.x + Math.cos(creature.orbit) * orbitRadius,
    altitude + Math.sin(elapsed * 2 + creature.orbit) * 3,
    cache.z + Math.sin(creature.orbit) * orbitRadius
  );
  // Face along the tangent of the circle.
  faceAlong(creature, -Math.sin(creature.orbit), Math.cos(creature.orbit));
  creature.mesh.rotation.z = Math.sin(elapsed * 8) * 0.2;
}

function updateCrocodile(creature, ctx, delta) {
  const { pond } = ctx.world;
  const playerDistance = flatDistance(creature.mesh.position, ctx.player.position);
  const playerInWater = flatDistance(ctx.player.position, pond.center) < pond.radius + 12;

  creature.cooldown = Math.max(0, creature.cooldown - delta);

  if (playerInWater && creature.cooldown === 0) {
    tmpVec.copy(ctx.player.position).sub(creature.mesh.position).setY(0).normalize();
    creature.mesh.position.addScaledVector(tmpVec, 30 * delta);
    faceAlong(creature, tmpVec.x, tmpVec.z);
    creature.lunging = playerDistance < 18 ? 1 : 0;
    return;
  }

  creature.lunging = 0;
  // Idle patrol: a slow lap of the shallows, mostly submerged.
  creature.orbit += delta * 0.25;
  const radius = pond.radius * 0.8;
  creature.mesh.position.set(
    pond.center.x + Math.cos(creature.orbit) * radius,
    -1.5,
    pond.center.z + Math.sin(creature.orbit) * radius
  );
  faceAlong(creature, -Math.sin(creature.orbit), Math.cos(creature.orbit));
}

function updateSwimmer(creature, delta, elapsed) {
  const speed = creature.kind === 'dolphin' ? 0.5 : 0.35;
  creature.orbit += delta * speed;
  const { home, orbitRadius } = creature;
  // The dolphin breaches; the shark keeps its fin at the waterline.
  const bob =
    creature.kind === 'dolphin'
      ? Math.max(-4, Math.sin(elapsed * 1.4 + creature.orbit) * 9 - 3)
      : -2 + Math.sin(elapsed * 2) * 0.6;
  creature.mesh.position.set(
    home.x + Math.cos(creature.orbit) * orbitRadius,
    bob,
    home.z + Math.sin(creature.orbit) * orbitRadius
  );
  faceAlong(creature, -Math.sin(creature.orbit), Math.cos(creature.orbit));
  if (creature.kind === 'dolphin') {
    creature.mesh.rotation.x = Math.cos(elapsed * 1.4 + creature.orbit) * 0.5;
  }
}

export function updateCreatures(creatures, ctx, delta, elapsed) {
  ctx.creatures = creatures;
  ctx.komodo = creatures.find((c) => c.kind === 'komodo');

  for (const creature of creatures) {
    switch (creature.kind) {
      case 'horse':
        updateHorse(creature, ctx, delta);
        break;
      case 'cow':
        updateCow(creature, ctx, delta);
        break;
      case 'komodo':
        updateKomodo(creature, ctx, delta);
        break;
      case 'salamander':
        updateSalamander(creature, ctx, delta);
        break;
      case 'toucan':
        updateToucan(creature, delta, elapsed);
        break;
      case 'snail':
        wander(creature, delta, 1.2);
        break;
      case 'crocodile':
        updateCrocodile(creature, ctx, delta);
        break;
      case 'shark':
      case 'dolphin':
        updateSwimmer(creature, delta, elapsed);
        break;
      default:
        break;
    }
  }
}
