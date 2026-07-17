import * as THREE from 'https://unpkg.com/three@0.152.0/build/three.module.js';
import * as CANNON from 'https://unpkg.com/cannon-es@0.20.0/dist/cannon-es.js';

const container = document.getElementById('game-root');
if (!container) throw new Error('Missing #game-root');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(10, 8, 10);
camera.lookAt(0, 3, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setClearColor(0x000000, 0);
container.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(5, 10, 7);
scene.add(dir);

// physics world
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);
world.solver.iterations = 10;

// materials
const groundMaterial = new CANNON.Material('ground');
const blockMaterial = new CANNON.Material('block');
const contactMat = new CANNON.ContactMaterial(groundMaterial, blockMaterial, { friction: 0.4, restitution: 0.2 });
world.addContactMaterial(contactMat);

// ground
const groundGeo = new THREE.PlaneGeometry(50, 50);
const groundMat = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, side: THREE.DoubleSide });
const groundMesh = new THREE.Mesh(groundGeo, groundMat);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.position.y = 0;
scene.add(groundMesh);

const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: groundMaterial });
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

// tower params
const layers = 12;
const blocksPerLayer = 3;
const blockSize = 1.0; // make blocks same width and length
const blockWidth = blockSize;
const blockLength = blockSize;
const blockHeight = 0.6;
const gap = 0.02; // small gap so blocks are close but not overlapping

const blocks = [];

function buildTower(){
  // remove old
  blocks.forEach(b => {
    scene.remove(b.mesh);
    world.removeBody(b.body);
  });
  blocks.length = 0;

    const boxMat = new THREE.MeshStandardMaterial({ color: 0xC19A6B, roughness: 0.7, metalness: 0.05 });


  for (let i = 0; i < layers; i++){
    const y = blockHeight/2 + i * (blockHeight + gap);
    const horizontal = (i % 2) === 0;
    for (let j = 0; j < blocksPerLayer; j++){
      const sx = horizontal ? blockLength : blockWidth;
      const sz = horizontal ? blockWidth : blockLength;
      const geo = new THREE.BoxGeometry(sx, blockHeight, sz);
        // use plain wood-like material (no letter)
        const mesh = new THREE.Mesh(geo, boxMat.clone());
      // place blocks side-by-side along their short side so three of them form a square footprint
      const spacing = blockWidth + gap;
      const centerIndex = (blocksPerLayer - 1) / 2;
      const offset = (j - centerIndex) * spacing;
      // place blocks side-by-side along the short side (perpendicular to their long axis)
      if (horizontal) mesh.position.set(0, y, offset);
      else mesh.position.set(offset, y, 0);
      scene.add(mesh);

      // physics body
      const shape = new CANNON.Box(new CANNON.Vec3(sx/2, blockHeight/2, sz/2));
      const body = new CANNON.Body({ mass: 2, shape, material: blockMaterial });
      body.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
        // set orientation so block lies flat along its long axis
        body.quaternion.setFromEuler(0, horizontal ? 0 : Math.PI/2, 0);
        // ensure no initial angular velocity so blocks spawn placed
        body.angularVelocity.set(0,0,0);
        world.addBody(body);
        // put body to sleep so it does not move until interacted with
        body.sleep && body.sleep();

      blocks.push({ mesh, body, horizontal });
    }
  }
}

buildTower();

// sync loop
const fixedTimeStep = 1/60;
let lastTime;
function animate(time){
  requestAnimationFrame(animate);
  if (lastTime !== undefined){
    const dt = (time - lastTime) / 1000;
    world.step(fixedTimeStep, dt, 3);
  }
  lastTime = time;

  // copy physics -> mesh
  blocks.forEach(b => {
    b.mesh.position.copy(b.body.position);
    b.mesh.quaternion.copy(b.body.quaternion);
  });

  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

// raycast, hover and drag interaction
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hoverMesh = null;
let drag = null; // { body, horizontal }

function getIntersects(clientX, clientY){
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = - ((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const meshes = blocks.map(b=>b.mesh);
  return raycaster.intersectObjects(meshes);
}

function getWorldPointFromMouse(clientX, clientY, height){
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = - ((clientY - rect.top) / rect.height) * 2 + 1;
  const mouseVec = new THREE.Vector3(x, y, 0.5);
  mouseVec.unproject(camera);
  const dir = mouseVec.sub(camera.position).normalize();
  const t = (height - camera.position.y) / dir.y;
  if (!isFinite(t)) return null;
  return camera.position.clone().add(dir.multiplyScalar(t));
}

renderer.domElement.style.touchAction = 'none';

renderer.domElement.addEventListener('pointermove', (e)=>{
  const hits = getIntersects(e.clientX, e.clientY);
  // hover effect
  if (hits.length){
    const mesh = hits[0].object;
    if (hoverMesh !== mesh){
      if (hoverMesh) hoverMesh.material.emissive && (hoverMesh.material.emissive.setHex(0x000000));
      hoverMesh = mesh;
      hoverMesh.material.emissive && (hoverMesh.material.emissive.setHex(0x222222));
    }
  } else {
    if (hoverMesh) hoverMesh.material.emissive && (hoverMesh.material.emissive.setHex(0x000000));
    hoverMesh = null;
  }

  if (drag){
    // compute target point at the block's current height and move body toward it
    const target = getWorldPointFromMouse(e.clientX, e.clientY, drag.body.position.y);
    if (target){
      const desired = new CANNON.Vec3(target.x, target.y, target.z);
      const curr = drag.body.position;
      const vel = desired.vsub(curr).scale(8);
      drag.body.velocity.set(vel.x, vel.y, vel.z);
      // damp rotation a bit while dragging
      drag.body.angularVelocity.scale(0.2, drag.body.angularVelocity);
    }
  }
});

renderer.domElement.addEventListener('pointerdown', (e)=>{
  const hits = getIntersects(e.clientX, e.clientY);
  if (hits.length){
    const mesh = hits[0].object;
    const found = blocks.find(b => b.mesh === mesh);
    if (found){
      // start dragging this block
      drag = { body: found.body, horizontal: found.horizontal };
      // wake up body
      drag.body.wakeUp && drag.body.wakeUp();
    }
  }
});

window.addEventListener('pointerup', ()=>{
  if (drag){
    // release: give a small outward impulse so block continues moving
    const b = drag.body;
    const signX = Math.sign(b.position.x) || (Math.random()>0.5?1:-1);
    const signZ = Math.sign(b.position.z) || (Math.random()>0.5?1:-1);
    const impulse = new CANNON.Vec3((drag.horizontal?signX:0) * (2 + Math.random()*2), 0.5 + Math.random(), (drag.horizontal?0:signZ) * (2 + Math.random()*2));
    b.applyImpulse(impulse, b.position);
    drag = null;
  }
});

function updateHUD(){
  const count = blocks.filter(b=> b.body.position.y < -1 || b.body.position.y > 50 || b.body.sleepState === CANNON.Body.SLEEPING && b.body.position.y < 0).length;
  const el = document.getElementById('removed-count');
  if (el) el.textContent = `Removed/Out: ${count}`;
}

// reset
const resetBtn = document.getElementById('reset');
if (resetBtn) resetBtn.addEventListener('click', ()=>{
  // remove bodies and meshes
  blocks.forEach(b=>{ world.removeBody(b.body); scene.remove(b.mesh); });
  buildTower();
});

// resize handling
function onResize(){
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
const ro = new ResizeObserver(onResize);
ro.observe(container);

window.addEventListener('pagehide', ()=>{
  ro.disconnect();
  renderer.dispose();
});
