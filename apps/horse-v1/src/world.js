import * as THREE from 'three';

export const WORLD_RADIUS = 400;

const materials = {
  grass: new THREE.MeshLambertMaterial({ color: 0x5f8b4c }),
  trunk: new THREE.MeshLambertMaterial({ color: 0x5c3a21 }),
  leaves: new THREE.MeshLambertMaterial({ color: 0x2f6b30 }),
  quartz: new THREE.MeshLambertMaterial({ color: 0xf2f2ee }),
  water: new THREE.MeshLambertMaterial({ color: 0x2f6f9f, transparent: true, opacity: 0.78 }),
  stone: new THREE.MeshLambertMaterial({ color: 0x9a9a94 }),
  wood: new THREE.MeshLambertMaterial({ color: 0x6b4626 }),
  roof: new THREE.MeshLambertMaterial({ color: 0x4a3c31 }),
  hay: new THREE.MeshLambertMaterial({ color: 0xd8c169 }),
  dirt: new THREE.MeshLambertMaterial({ color: 0x6b563f }),
};

export function buildWorld(scene) {
  const pond = { center: new THREE.Vector3(150, 0, -140), radius: 70 };

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), materials.grass);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Pond: a shallow basin so the swimmers read as being *in* something.
  const water = new THREE.Mesh(new THREE.CircleGeometry(pond.radius, 48), materials.water);
  water.rotation.x = -Math.PI / 2;
  water.position.copy(pond.center).setY(0.4);
  scene.add(water);

  const bank = new THREE.Mesh(new THREE.RingGeometry(pond.radius, pond.radius + 10, 48), materials.dirt);
  bank.rotation.x = -Math.PI / 2;
  bank.position.copy(pond.center).setY(0.2);
  scene.add(bank);

  const world = {
    scene,
    pond,
    trees: [],
    quartz: [],
    hay: [],
    caches: [],
    buildings: {},
    interactables: [],
  };

  scatterTrees(world);
  scatterQuartz(world);
  scatterHay(world);

  return world;
}

function awayFromPond(pond, radius, clearance) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * (radius - 50);
    const point = new THREE.Vector3(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);
    const dx = point.x - pond.center.x;
    const dz = point.z - pond.center.z;
    if (Math.hypot(dx, dz) > pond.radius + clearance) return point;
  }
  return new THREE.Vector3(0, 0, 0);
}

function scatterTrees(world) {
  const trunkGeo = new THREE.CylinderGeometry(2.4, 3.2, 22, 6);
  const leafGeo = new THREE.ConeGeometry(11, 22, 7);

  for (let i = 0; i < 70; i += 1) {
    const spot = awayFromPond(world.pond, WORLD_RADIUS, 24);
    const tree = new THREE.Group();

    const trunk = new THREE.Mesh(trunkGeo, materials.trunk);
    trunk.position.y = 11;
    trunk.castShadow = true;
    tree.add(trunk);

    const leaves = new THREE.Mesh(leafGeo, materials.leaves);
    leaves.position.y = 30;
    leaves.castShadow = true;
    tree.add(leaves);

    tree.position.copy(spot);
    tree.rotation.y = Math.random() * Math.PI;
    tree.scale.setScalar(0.8 + Math.random() * 0.5);
    tree.userData = { type: 'tree', yields: 2 };

    world.scene.add(tree);
    world.trees.push(tree);
    world.interactables.push(tree);
  }
}

function scatterQuartz(world) {
  const geo = new THREE.DodecahedronGeometry(5);

  for (let i = 0; i < 26; i += 1) {
    const spot = awayFromPond(world.pond, WORLD_RADIUS, 18);
    const rock = new THREE.Mesh(geo, materials.quartz);
    rock.position.copy(spot).setY(3);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.scale.setScalar(0.7 + Math.random() * 0.7);
    rock.castShadow = true;
    rock.userData = { type: 'quartz', yields: 1 };

    world.scene.add(rock);
    world.quartz.push(rock);
    world.interactables.push(rock);
  }
}

function scatterHay(world) {
  const geo = new THREE.ConeGeometry(4.5, 7, 5);

  for (let i = 0; i < 30; i += 1) {
    const spot = awayFromPond(world.pond, WORLD_RADIUS, 20);
    const bale = new THREE.Mesh(geo, materials.hay);
    bale.position.copy(spot).setY(3.5);
    bale.rotation.y = Math.random() * Math.PI;
    bale.castShadow = true;
    bale.userData = { type: 'hay', yields: 2 };

    world.scene.add(bale);
    world.hay.push(bale);
    world.interactables.push(bale);
  }
}

/** Remove a harvested prop from the scene and every list that tracks it. */
export function removeProp(world, object) {
  world.scene.remove(object);
  for (const list of [world.trees, world.quartz, world.hay, world.interactables]) {
    const index = list.indexOf(object);
    if (index !== -1) list.splice(index, 1);
  }
}

export function buildHouse(world, position) {
  const house = new THREE.Group();
  const wall = (w, h, d, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials.stone);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    house.add(mesh);
  };

  const floor = new THREE.Mesh(new THREE.BoxGeometry(60, 1, 60), materials.wood);
  floor.position.y = 0.5;
  floor.receiveShadow = true;
  house.add(floor);

  wall(60, 34, 2, 0, 17, -29);
  wall(2, 34, 60, -29, 17, 0);
  wall(2, 34, 60, 29, 17, 0);
  wall(22, 34, 2, -19, 17, 29);
  wall(22, 34, 2, 19, 17, 29);
  wall(16, 12, 2, 0, 28, 29);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(48, 20, 4), materials.roof);
  roof.position.y = 44;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  house.add(roof);

  // The bed is the interactable that lets the player skip the night.
  const bed = new THREE.Group();
  const mattress = new THREE.Mesh(
    new THREE.BoxGeometry(12, 4, 20),
    new THREE.MeshLambertMaterial({ color: 0xa03535 })
  );
  mattress.position.y = 3;
  bed.add(mattress);
  const pillow = new THREE.Mesh(
    new THREE.BoxGeometry(10, 2, 5),
    new THREE.MeshLambertMaterial({ color: 0xf0f0e6 })
  );
  pillow.position.set(0, 6, -6);
  bed.add(pillow);
  bed.position.set(-18, 1, -18);
  bed.userData = { type: 'bed' };
  house.add(bed);

  house.position.copy(position).setY(0);
  world.scene.add(house);
  world.buildings.house = house;
  world.interactables.push(bed);
  return house;
}

export function buildStable(world, position) {
  const stable = new THREE.Group();

  const floor = new THREE.Mesh(new THREE.BoxGeometry(56, 1, 44), materials.dirt);
  floor.position.y = 0.5;
  floor.receiveShadow = true;
  stable.add(floor);

  const post = (x, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(3, 26, 3), materials.wood);
    mesh.position.set(x, 13, z);
    mesh.castShadow = true;
    stable.add(mesh);
  };
  [-26, -9, 9, 26].forEach((x) => {
    post(x, -21);
    post(x, 21);
  });

  const back = new THREE.Mesh(new THREE.BoxGeometry(56, 26, 2), materials.wood);
  back.position.set(0, 13, -21);
  back.castShadow = true;
  stable.add(back);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(62, 2, 50), materials.roof);
  roof.position.y = 27;
  roof.castShadow = true;
  stable.add(roof);

  // The trough is where a tamed horse is stabled for the night.
  const trough = new THREE.Mesh(new THREE.BoxGeometry(20, 5, 8), materials.hay);
  trough.position.set(0, 3, 12);
  trough.userData = { type: 'trough' };
  stable.add(trough);

  stable.position.copy(position).setY(0);
  world.scene.add(stable);
  world.buildings.stable = stable;
  world.interactables.push(trough);
  return stable;
}

/** A dug-up cache leaves a visible mound so the player can see it is spent. */
export function markCache(world, position) {
  const mound = new THREE.Mesh(
    new THREE.SphereGeometry(6, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2),
    materials.dirt
  );
  mound.position.copy(position).setY(0.5);
  world.scene.add(mound);
  world.caches.push(mound);
}
