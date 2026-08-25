import * as THREE from 'three';

export const WORLD_RADIUS = 420;

const materials = {
  grass: new THREE.MeshLambertMaterial({ color: 0x4d7a3b }),
  log: new THREE.MeshLambertMaterial({ color: 0x5a4127 }),
  fern: new THREE.MeshLambertMaterial({ color: 0x2f7a3e }),
  amber: new THREE.MeshLambertMaterial({ color: 0xd98a2b }),
  water: new THREE.MeshLambertMaterial({ color: 0x2c6f7a, transparent: true, opacity: 0.8 }),
  mud: new THREE.MeshLambertMaterial({ color: 0x5a4a30 }),
  wood: new THREE.MeshLambertMaterial({ color: 0x6b4626 }),
  thatch: new THREE.MeshLambertMaterial({ color: 0x8a7238 }),
  hide: new THREE.MeshLambertMaterial({ color: 0xb0552e }),
  fence: new THREE.MeshLambertMaterial({ color: 0x4a3627 }),
  stone: new THREE.MeshLambertMaterial({ color: 0x8b877c }),
  egg: new THREE.MeshLambertMaterial({ color: 0xe4d9a8 }),
};

export function buildWorld(scene) {
  const waterhole = { center: new THREE.Vector3(160, 0, -150), radius: 66 };

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1700, 1700), materials.grass);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const water = new THREE.Mesh(new THREE.CircleGeometry(waterhole.radius, 48), materials.water);
  water.rotation.x = -Math.PI / 2;
  water.position.copy(waterhole.center).setY(0.4);
  scene.add(water);

  const bank = new THREE.Mesh(
    new THREE.RingGeometry(waterhole.radius, waterhole.radius + 12, 48),
    materials.mud
  );
  bank.rotation.x = -Math.PI / 2;
  bank.position.copy(waterhole.center).setY(0.2);
  scene.add(bank);

  const world = {
    scene,
    waterhole,
    logs: [],
    amber: [],
    ferns: [],
    eggs: [],
    caches: [],
    buildings: {},
    interactables: [],
  };

  scatterLogs(world);
  scatterAmber(world);
  scatterFerns(world);
  scatterEggs(world);

  return world;
}

function awayFromWater(waterhole, radius, clearance) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * (radius - 50);
    const point = new THREE.Vector3(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);
    const dx = point.x - waterhole.center.x;
    const dz = point.z - waterhole.center.z;
    if (Math.hypot(dx, dz) > waterhole.radius + clearance) return point;
  }
  return new THREE.Vector3(0, 0, 0);
}

function scatterLogs(world) {
  const geo = new THREE.CylinderGeometry(3, 3.4, 26, 7);

  for (let i = 0; i < 60; i += 1) {
    const spot = awayFromWater(world.waterhole, WORLD_RADIUS, 24);
    const log = new THREE.Mesh(geo, materials.log);
    log.position.copy(spot).setY(3);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = Math.random() * Math.PI;
    log.scale.setScalar(0.8 + Math.random() * 0.5);
    log.castShadow = true;
    log.userData = { type: 'log', yields: 3 };

    world.scene.add(log);
    world.logs.push(log);
    world.interactables.push(log);
  }
}

function scatterAmber(world) {
  const geo = new THREE.OctahedronGeometry(4.5);

  for (let i = 0; i < 24; i += 1) {
    const spot = awayFromWater(world.waterhole, WORLD_RADIUS, 18);
    const chunk = new THREE.Mesh(geo, materials.amber);
    chunk.position.copy(spot).setY(3);
    chunk.rotation.set(Math.random(), Math.random(), Math.random());
    chunk.scale.setScalar(0.7 + Math.random() * 0.7);
    chunk.castShadow = true;
    chunk.userData = { type: 'amber', yields: 1 };

    world.scene.add(chunk);
    world.amber.push(chunk);
    world.interactables.push(chunk);
  }
}

function scatterFerns(world) {
  const geo = new THREE.ConeGeometry(5, 8, 6);

  for (let i = 0; i < 34; i += 1) {
    const spot = awayFromWater(world.waterhole, WORLD_RADIUS, 20);
    const clump = new THREE.Mesh(geo, materials.fern);
    clump.position.copy(spot).setY(4);
    clump.rotation.y = Math.random() * Math.PI;
    clump.castShadow = true;
    clump.userData = { type: 'fern', yields: 2 };

    world.scene.add(clump);
    world.ferns.push(clump);
    world.interactables.push(clump);
  }
}

function scatterEggs(world) {
  // Six hidden clutches, deliberately easy to walk past — same spirit as a
  // collectible you find by exploring rather than by following a marker.
  for (let i = 0; i < 6; i += 1) {
    const spot = awayFromWater(world.waterhole, WORLD_RADIUS, 22);
    const clutch = new THREE.Group();
    for (let j = 0; j < 3; j += 1) {
      const egg = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 8), materials.egg);
      egg.scale.set(1, 1.3, 1);
      egg.position.set((Math.random() - 0.5) * 3, 1.4, (Math.random() - 0.5) * 3);
      egg.castShadow = true;
      clutch.add(egg);
    }
    clutch.position.copy(spot).setY(0);
    clutch.userData = { type: 'egg' };

    world.scene.add(clutch);
    world.eggs.push(clutch);
    world.interactables.push(clutch);
  }
}

/** Remove a harvested prop from the scene and every list that tracks it. */
export function removeProp(world, object) {
  world.scene.remove(object);
  for (const list of [world.logs, world.amber, world.ferns, world.eggs, world.interactables]) {
    const index = list.indexOf(object);
    if (index !== -1) list.splice(index, 1);
  }
}

export function buildCamp(world, position) {
  const camp = new THREE.Group();

  const floor = new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 1, 16), materials.mud);
  floor.position.y = 0.5;
  floor.receiveShadow = true;
  camp.add(floor);

  // A ring of lean-to posts around a shared fire — enough to read as a camp
  // without pretending a first-person player builds walls by hand.
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 20, 6), materials.wood);
    post.position.set(Math.cos(angle) * 22, 10, Math.sin(angle) * 22);
    post.rotation.z = Math.cos(angle) * 0.35;
    post.rotation.x = -Math.sin(angle) * 0.35;
    post.castShadow = true;
    camp.add(post);
  }

  const canopy = new THREE.Mesh(new THREE.ConeGeometry(30, 16, 8), materials.thatch);
  canopy.position.y = 22;
  canopy.castShadow = true;
  camp.add(canopy);

  // The firepit is the interactable that lets the player skip the night.
  const firepit = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4, 0.8, 8, 16), materials.stone);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.6;
  firepit.add(ring);
  const embers = new THREE.Mesh(
    new THREE.ConeGeometry(2.6, 3, 6),
    new THREE.MeshBasicMaterial({ color: 0xff7a1a })
  );
  embers.position.y = 1.6;
  firepit.add(embers);
  firepit.position.set(0, 0, 0);
  firepit.userData = { type: 'firepit' };
  camp.add(firepit);

  camp.position.copy(position).setY(0);
  world.scene.add(camp);
  world.buildings.camp = camp;
  world.interactables.push(firepit);
  return camp;
}

export function buildCorral(world, position) {
  const corral = new THREE.Group();

  const floor = new THREE.Mesh(new THREE.CylinderGeometry(34, 34, 1, 20), materials.mud);
  floor.position.y = 0.5;
  floor.receiveShadow = true;
  corral.add(floor);

  const railGeo = new THREE.CylinderGeometry(1, 1, 8, 6);
  for (let i = 0; i < 16; i += 1) {
    const angle = (i / 16) * Math.PI * 2;
    const post = new THREE.Mesh(railGeo, materials.fence);
    post.position.set(Math.cos(angle) * 34, 4, Math.sin(angle) * 34);
    post.castShadow = true;
    corral.add(post);

    const rail = new THREE.Mesh(new THREE.TorusGeometry(34, 0.6, 6, 32, (Math.PI * 2) / 16), materials.fence);
    rail.rotation.x = Math.PI / 2;
    rail.rotation.z = angle;
    rail.position.y = 6.5;
    corral.add(rail);
  }

  // The feeding hide is where a tamed triceratops is settled for the night.
  const hide = new THREE.Mesh(new THREE.BoxGeometry(18, 3, 10), materials.hide);
  hide.position.set(0, 1.5, 14);
  hide.castShadow = true;
  hide.userData = { type: 'hide' };
  corral.add(hide);

  corral.position.copy(position).setY(0);
  world.scene.add(corral);
  world.buildings.corral = corral;
  world.interactables.push(hide);
  return corral;
}

/** A dug-up cache leaves a visible mound so the player can see it is spent. */
export function markCache(world, position) {
  const mound = new THREE.Mesh(
    new THREE.SphereGeometry(6, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2),
    materials.mud
  );
  mound.position.copy(position).setY(0.5);
  world.scene.add(mound);
  world.caches.push(mound);
}

/** Visible cairns mark a fossil dig; digging (F) near one within range pays out. */
export function scatterCairns(world, positions) {
  const cairns = [];
  const geo = new THREE.DodecahedronGeometry(3.4);

  for (const position of positions) {
    const cairn = new THREE.Group();
    for (let i = 0; i < 3; i += 1) {
      const rock = new THREE.Mesh(geo, materials.stone);
      rock.position.set((Math.random() - 0.5) * 3, 2 + i * 2.4, (Math.random() - 0.5) * 3);
      rock.scale.setScalar(1 - i * 0.18);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      cairn.add(rock);
    }
    cairn.position.copy(position).setY(0);
    world.scene.add(cairn);
    cairns.push(cairn);
  }

  return cairns;
}
