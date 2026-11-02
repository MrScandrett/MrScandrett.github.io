import { THREE, STLLoader, GLTFLoader, CSS2DRenderer, CSS2DObject } from '../vendor/three-bundle.min.js';
import { createScene } from './sim-kit-three.mjs';

// ── Constants ──────────────────────────────────────────────────────────────
const BOUNDS   = { x: 10, y: 5.5, z: 4.5 };  // tank half-extents
const FISH_SPEED  = 0.022;
const FISH_SIZE   = 0.55;
const FOOD_COUNT  = 12;
const MAX_DIRTY   = 100;
const DIRTY_PER_FEED = 15;

// ── Scene globals ──────────────────────────────────────────────────────────
let renderer, labelRenderer, scene, camera;
let simulationTime = 0;
let animationLoop;
let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
let selectedFish = null;
let cardReturnFocus = null;
let previewMode = false;
let namesVisible = true;
try { namesVisible = localStorage.getItem('class-tank-names') !== 'off'; } catch {}
let raycaster = new THREE.Raycaster();
let pointer   = new THREE.Vector2();

// ── Live objects ───────────────────────────────────────────────────────────
let fishes       = [];   // { group, data, target, speed, tailGroup, tailPhase, tailSpeed, state, feedTarget, waitTicks }
let foodResources = [];
let foods        = [];   // { mesh, vy, eaten }
let bubbles      = [];   // { mesh, vel, life, decay }
let dirtBits     = [];   // { mesh, drift }
let plankton     = [];   // { mesh, drift }
let seaweeds     = [];   // { group, segments:[{mesh,idx}], phase }
let anemones     = [];   // { group, tentacles:[{mesh,angle,baseRotZ,baseRotX}], phase }

// ── State ──────────────────────────────────────────────────────────────────
let dirtiness    = 0;
let isFeeding    = false;
let isCleaning   = false;

// ── Systems simulation state ───────────────────────────────────────────────
let waterTemp      = 75.0;   // °F
let tempTarget     = 75.0;   // heater set-point °F
let filterHealth   = 100;    // 0–100 %
let phLevel        = 7.20;
let phDrift        = 0;
let heatCooldown   = 0;      // seconds remaining on heater button
let filterCooldown = 0;      // seconds remaining on filter button
let feedRemaining = 0;
let cleanRemaining = 0;
let cleanStart = 0;

// ── DOM ────────────────────────────────────────────────────────────────────
const $canvas   = document.getElementById('tank-canvas');
const $labels   = document.getElementById('label-layer');
const $dirty    = document.getElementById('dirty-overlay');
const $mfill    = document.getElementById('meter-fill');
const $count    = document.getElementById('fish-count');
const $feedBtn  = document.getElementById('feedBtn');
const $cleanBtn = document.getElementById('cleanBtn');
const $loading  = document.getElementById('loading');
const $toast    = document.getElementById('toast');
const $card     = document.getElementById('fish-card');

// ═══════════════════════════════════════════════════════════════════════════
// SCENE SETUP
// ═══════════════════════════════════════════════════════════════════════════

function initScene() {
  // Renderer
  ({ renderer, scene, camera } = createScene($canvas, { THREE, fov: 58, far: 100, maxDpr: 1.5 }));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // CSS2D renderer for name labels
  labelRenderer = new CSS2DRenderer({ element: $labels });

  // Scene
  scene.background = makeBgTexture();
  scene.fog = new THREE.FogExp2(0x0b3444, 0.021);

  // Camera
  camera.position.set(0, 0.5, 18);
  camera.lookAt(0, 0, 0);

  resize();
  new ResizeObserver(resize).observe(document.getElementById('canvas-wrap'));
  $canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    animationLoop?.stop();
    window.showTankLoadError?.('The 3D view was interrupted. Reload the aquarium to continue.');
    $loading.classList.remove('gone');
    $loading.removeAttribute('aria-hidden');
    $loading.inert = false;
  });

  // Lighting
  scene.add(new THREE.AmbientLight(0x639aa3, 1.7));

  const sun = new THREE.DirectionalLight(0xffefd6, 2.5);
  sun.position.set(3, 12, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(512, 512);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 50;
  scene.add(sun);

  const fill = new THREE.PointLight(0x003366, 4, 30);
  fill.position.set(0, -10, 0);
  scene.add(fill);

  const side = new THREE.PointLight(0x004488, 2, 22);
  side.position.set(-9, 2, 4);
  scene.add(side);
}

function makeBgTexture() {
  const c = document.createElement('canvas');
  c.width = 2; c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0,    '#13546a');
  g.addColorStop(0.35, '#0b3a51');
  g.addColorStop(0.75, '#082a40');
  g.addColorStop(1,    '#062231');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2, 512);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function resize() {
  const w = $canvas.clientWidth, h = $canvas.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  // Preserve the habitat's floor and headroom while fitting the tank's width.
  const halfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  camera.position.z = Math.max(15.5, 11 / (halfFov * camera.aspect));
  camera.lookAt(0, -0.3, 0);
  camera.updateProjectionMatrix();
  renderFrame();
}

// ═══════════════════════════════════════════════════════════════════════════
// ENVIRONMENT
// ═══════════════════════════════════════════════════════════════════════════

function buildEnvironment() {
  // Sandy floor
  const floorGeo = new THREE.PlaneGeometry(BOUNDS.x * 3, 90, 24, 24);
  const fp = floorGeo.attributes.position;
  for (let i = 0; i < fp.count; i++) fp.setZ(i, (Math.random() - 0.5) * 0.18);
  floorGeo.computeVertexNormals();
  const floor = new THREE.Mesh(floorGeo,
    new THREE.MeshStandardMaterial({ color: 0xc8a860, roughness: 0.95, metalness: 0.0 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -BOUNDS.y;
  floor.position.z = 35;
  floor.receiveShadow = true;
  scene.add(floor);

  // Seaweed clusters — more coverage than before
  const swPositions = [
    [-8,-2],[-5.5,-1.5],[-3,-3.5],[0,-2],[3,-3],[5.5,-1.8],[8.5,-2.5],[-1.5,-3.8],
    [-7,-3],[6.5,-3.2],[2,-1.5],[-4,-1],[9,-1.5],[-9,-3.5]
  ];
  swPositions.forEach(([x, z]) => addSeaweed(x, z));

  // Coral formations
  [[-7,-3.5],[-4.5,-2.5],[-2,-4],[1.5,-3.5],[4,-2],[7,-3],[9.5,-2],[-6,-1],[0.5,-4.2]]
    .forEach(([x, z]) => addCoral(x + (Math.random()-0.5)*0.8, z + (Math.random()-0.5)*0.6));

  // Anemones
  [[-6.5,-2.5],[3.5,-3.8],[7.5,-1.5],[-2.5,-2],[0,-4.0]].forEach(([x, z]) => addAnemone(x, z));

  // Starfish
  for (let i = 0; i < 7; i++)
    addStarfish((Math.random()-0.5)*BOUNDS.x*1.7, (Math.random()-0.5)*BOUNDS.z*1.5);

  // Pebbles
  addPebbles();

  // Rocks
  for (let i = 0; i < 8; i++) {
    addRock((Math.random() - 0.5) * BOUNDS.x * 1.6,
            (Math.random() - 0.5) * BOUNDS.z * 1.3);
  }

  // Ambient plankton
  const plankMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.22 });
  for (let i = 0; i < 35; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.018 + Math.random() * 0.024, 4, 4), plankMat);
    m.position.set(
      (Math.random() - 0.5) * BOUNDS.x * 2,
      (Math.random() - 0.5) * BOUNDS.y * 1.8,
      (Math.random() - 0.5) * BOUNDS.z * 1.8
    );
    scene.add(m);
    plankton.push({ mesh: m, drift: new THREE.Vector3(
      (Math.random() - 0.5) * 0.006,
      (Math.random() - 0.5) * 0.004,
      (Math.random() - 0.5) * 0.005
    )});
  }


}

function addSeaweed(x, z) {
  const group = new THREE.Group();
  const segments = [];
  const palette = [0x338e68, 0x4eaa76, 0x28785e, 0x72b57e];
  const material = new THREE.MeshStandardMaterial({ color: palette[Math.random() * palette.length | 0], roughness: .8, side: THREE.DoubleSide });
  for (let i = 0; i < 5; i++) {
    const height = 1.1 + Math.random() * 2.1;
    const width = .1 + Math.random() * .12;
    const bend = (Math.random() - .5) * .7;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(-width, height * .3, bend - width, height * .75, bend, height);
    shape.bezierCurveTo(bend + width, height * .65, width, height * .2, 0, 0);
    const leaf = new THREE.Mesh(new THREE.ShapeGeometry(shape, 10), material);
    leaf.position.set((i - 2) * .13, 0, (Math.random() - .5) * .25);
    leaf.rotation.y = (Math.random() - .5) * 1.2;
    leaf.castShadow = true;
    group.add(leaf);
    segments.push({ mesh: leaf, idx: i });
  }
  group.position.set(x, -BOUNDS.y, z);
  scene.add(group);
  seaweeds.push({ group, segments, phase: Math.random() * Math.PI * 2 });
}

function addRock(x, z) {
  const geo = new THREE.DodecahedronGeometry(0.28 + Math.random() * 0.38, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setX(i, pos.getX(i) * (0.75 + Math.random() * 0.45));
    pos.setY(i, pos.getY(i) * (0.55 + Math.random() * 0.35));
    pos.setZ(i, pos.getZ(i) * (0.75 + Math.random() * 0.45));
  }
  geo.computeVertexNormals();
  const cols = [0x5a5a5a, 0x7a6a5a, 0x4a4a5a, 0x6a5a4a];
  const rock = new THREE.Mesh(geo,
    new THREE.MeshStandardMaterial({ color: cols[cols.length * Math.random() | 0], roughness: 0.9 }));
  rock.position.set(x, -BOUNDS.y + 0.15, z);
  rock.rotation.set(Math.random() * 2, Math.random() * 6, Math.random() * 2);
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
}

function addCoral(x, z) {
  const group = new THREE.Group();
  const palette = [0xe84393, 0xff7043, 0x9b59b6, 0xef4444, 0xf59e0b, 0x06b6d4, 0xec4899];
  const col = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
  const mat     = new THREE.MeshStandardMaterial({ color: col, roughness: 0.65, metalness: 0.05 });
  const darkMat = new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.55), roughness: 0.8 });

  const stemH = 0.5 + Math.random() * 1.0;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.09, stemH, 7), darkMat);
  stem.position.y = stemH / 2;
  stem.castShadow = true;
  group.add(stem);

  const numBranches = 2 + Math.floor(Math.random() * 4);
  for (let b = 0; b < numBranches; b++) {
    const branchH = 0.22 + Math.random() * 0.42;
    const angle = (b / numBranches) * Math.PI * 2 + Math.random() * 0.4;
    const tilt  = 0.45 + Math.random() * 0.35;
    const startY = stemH * (0.35 + Math.random() * 0.45);

    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.04, branchH, 5), mat);
    branch.position.set(Math.cos(angle) * 0.12, startY + Math.cos(tilt) * branchH * 0.5, Math.sin(angle) * 0.12);
    branch.rotation.z = Math.cos(angle) * tilt;
    branch.rotation.x = Math.sin(angle) * tilt;
    branch.castShadow = true;
    group.add(branch);

    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.055 + Math.random() * 0.04, 8, 6), mat);
    tip.position.set(
      branch.position.x + Math.cos(angle) * Math.sin(tilt) * branchH * 0.5,
      branch.position.y + Math.cos(tilt) * branchH * 0.5 + 0.04,
      branch.position.z + Math.sin(angle) * Math.sin(tilt) * branchH * 0.5
    );
    group.add(tip);
  }

  group.position.set(x, -BOUNDS.y, z);
  scene.add(group);
}

function addStarfish(x, z) {
  const palette = [0xe85d04, 0xc1121f, 0x7b2d8b, 0xff6b6b, 0xfca311];
  const col = palette[Math.floor(Math.random() * palette.length)];
  const shape = new THREE.Shape();
  const arms = 5, outer = 0.14 + Math.random() * 0.1, inner = outer * 0.4;
  for (let i = 0; i < arms * 2; i++) {
    const a = (i * Math.PI) / arms - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    i === 0 ? shape.moveTo(Math.cos(a)*r, Math.sin(a)*r) : shape.lineTo(Math.cos(a)*r, Math.sin(a)*r);
  }
  shape.closePath();
  const mesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01 }),
    new THREE.MeshStandardMaterial({ color: col, roughness: 0.75 })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = Math.random() * Math.PI * 2;
  mesh.position.set(x, -BOUNDS.y + 0.01, z);
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function addPebbles() {
  const cols = [0x8b7355, 0x9e9e9e, 0x7b6b4f, 0xa0a0a0, 0xb5a48a, 0x6b7280, 0x795548];
  const mats = cols.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }));
  for (let i = 0; i < 55; i++) {
    const r = 0.04 + Math.random() * 0.08;
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mats[Math.floor(Math.random() * mats.length)]);
    mesh.position.set(
      (Math.random()-0.5)*BOUNDS.x*2.0, -BOUNDS.y + r*0.4,
      (Math.random()-0.5)*BOUNDS.z*2.0
    );
    mesh.rotation.set(Math.random()*6, Math.random()*6, Math.random()*6);
    mesh.scale.set(1+Math.random()*0.7, 0.5+Math.random()*0.5, 1+Math.random()*0.7);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
}

function addAnemone(x, z) {
  const group = new THREE.Group();
  const col = new THREE.Color([0xff6b9d, 0xff8c42, 0x9b59b6, 0x06b6d4][Math.floor(Math.random()*4)]);
  const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 });
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });

  const base = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), baseMat);
  base.scale.set(1, 0.7, 1);
  base.position.y = 0.09;
  group.add(base);

  const tentacles = [];
  const count = 9 + Math.floor(Math.random() * 7);
  const tipMat = new THREE.MeshStandardMaterial({ color: col.clone().lerp(new THREE.Color(0xffffff), 0.4), roughness: 0.4 });
  for (let i = 0; i < count; i++) {
    const tentH = 0.18 + Math.random() * 0.18;
    const angle = (i / count) * Math.PI * 2;
    const radius = 0.04 + Math.random() * 0.055;
    const tent = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.014, tentH, 4), mat);
    const bRotZ = Math.cos(angle) * 0.32;
    const bRotX = Math.sin(angle) * 0.32;
    tent.position.set(Math.cos(angle)*radius, 0.1 + tentH/2, Math.sin(angle)*radius);
    tent.rotation.z = bRotZ;
    tent.rotation.x = bRotX;
    const tipBall = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 5), tipMat);
    tipBall.position.y = tentH / 2 + 0.01;
    tent.add(tipBall);
    group.add(tent);
    tentacles.push({ mesh: tent, angle, baseRotZ: bRotZ, baseRotX: bRotX });
  }

  group.position.set(x, -BOUNDS.y, z);
  scene.add(group);
  anemones.push({ group, tentacles, phase: Math.random() * Math.PI * 2 });
}

// ═══════════════════════════════════════════════════════════════════════════
// FISH
// ═══════════════════════════════════════════════════════════════════════════

function makeProceduralFish(colorHex, sizeMul) {
  const group = new THREE.Group();
  const s = FISH_SIZE * sizeMul;
  const col = new THREE.Color(colorHex);
  const darkCol = col.clone().multiplyScalar(0.55);

  const bodyMat = new THREE.MeshStandardMaterial({ color: col,     roughness: 0.42, metalness: 0.08 });
  const finMat  = new THREE.MeshStandardMaterial({ color: darkCol, roughness: 0.5,  side: THREE.DoubleSide });

  // Body: fish faces +X, body is elongated along X
  const body = new THREE.Mesh(new THREE.SphereGeometry(s, 14, 10), bodyMat);
  body.scale.set(1.75, 1, 0.82);
  body.castShadow = true;
  group.add(body);

  // Tail group (sits at -X end; wags on Y)
  const tailGrp = new THREE.Group();
  tailGrp.position.x = -s * 1.55;
  const tv = new Float32Array([
    0,      0,        0,
    -s*0.7, s*0.62,   0,
    -s*0.7, -s*0.62,  0,
  ]);
  const tailGeo = new THREE.BufferGeometry();
  tailGeo.setAttribute('position', new THREE.BufferAttribute(tv, 3));
  tailGeo.computeVertexNormals();
  tailGrp.add(new THREE.Mesh(tailGeo, bodyMat));
  group.add(tailGrp);
  group.userData.tailGrp = tailGrp;

  // Dorsal fin
  const dv = new Float32Array([
    s*0.15,  s*0.95, 0,
    -s*0.3,  s*0.12, 0,
    s*0.15,  s*0.12, 0,
  ]);
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute('position', new THREE.BufferAttribute(dv, 3));
  dGeo.computeVertexNormals();
  group.add(new THREE.Mesh(dGeo, finMat));

  // Pectoral fin (right side, z+)
  const pv = new Float32Array([
    0,    -s*0.1, s*0.12,
    -s*0.5,-s*0.38,s*0.58,
    0,    -s*0.38, s*0.12,
  ]);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pv, 3));
  pGeo.computeVertexNormals();
  group.add(new THREE.Mesh(pGeo, finMat));

  // Eye
  const eyeMat  = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 0.115, 8, 8), eyeMat);
  eye.position.set(s * 1.12, s * 0.17, s * 0.5);
  group.add(eye);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(s * 0.048, 6, 6), whiteMat);
  pupil.position.set(s * 1.24, s * 0.17, s * 0.54);
  group.add(pupil);

  return group;
}

function makeSTLFish(geometry, colorHex, sizeMul, dots) {
  geometry.computeBoundingBox();
  const center = new THREE.Vector3();
  geometry.boundingBox.getCenter(center);
  geometry.translate(-center.x, -center.y, -center.z);

  const size = new THREE.Vector3();
  geometry.boundingBox.getSize(size);
  const targetSize = FISH_SIZE * 2.8 * sizeMul;
  const geoScale = targetSize / Math.max(size.x, size.y, size.z);
  geometry.scale(geoScale, geoScale, geoScale);

  // Orient model using student-placed dots
  if (dots?.head && dots?.tail) {
    const toTank = targetSize / (dots.scale || 2.5);
    const headV = new THREE.Vector3(...dots.head).multiplyScalar(toTank);
    const tailV = new THREE.Vector3(...dots.tail).multiplyScalar(toTank);
    const basisX = new THREE.Vector3().subVectors(headV, tailV).normalize(); // forward → +X

    if (dots.back) {
      // Full 3-point orientation: head + tail + back (dorsal) → no roll ambiguity
      const backV  = new THREE.Vector3(...dots.back).multiplyScalar(toTank);
      const upHint = new THREE.Vector3().subVectors(backV, tailV).normalize();
      const basisZ = new THREE.Vector3().crossVectors(basisX, upHint).normalize(); // right
      const basisY = new THREE.Vector3().crossVectors(basisZ, basisX).normalize(); // true up
      // Rotation matrix whose columns are the fish's axes → transpose = inverse = what we apply
      geometry.applyMatrix4(new THREE.Matrix4().makeBasis(basisX, basisY, basisZ).transpose());
    } else {
      // 2-point fallback: orient forward, then roll-correct by keeping original +Y as up
      const q1 = new THREE.Quaternion().setFromUnitVectors(basisX, new THREE.Vector3(1, 0, 0));
      geometry.applyQuaternion(q1);
      const rotatedUp = new THREE.Vector3(0, 1, 0).applyQuaternion(q1);
      const projUp = new THREE.Vector3(0, rotatedUp.y, rotatedUp.z);
      if (projUp.lengthSq() > 0.001) {
        geometry.applyQuaternion(
          new THREE.Quaternion().setFromUnitVectors(projUp.normalize(), new THREE.Vector3(0, 1, 0))
        );
      }
    }
  }

  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex), roughness: 0.5, metalness: 0.12, side: THREE.DoubleSide
  }));
  mesh.castShadow = true;

  // Gentle full-body wag group (amplitude is smaller than procedural tail, see updateFishes)
  const wagGrp = new THREE.Group();
  wagGrp.add(mesh);

  const group = new THREE.Group();
  group.add(wagGrp);
  group.userData.tailGrp = wagGrp;
  group.userData.isSTL   = true;
  return group;
}

function makeGLBFish(gltfScene, sizeMul, dots) {
  const box    = new THREE.Box3().setFromObject(gltfScene);
  const center = box.getCenter(new THREE.Vector3());
  const bsize  = box.getSize(new THREE.Vector3());
  const targetSize = FISH_SIZE * 2.8 * sizeMul;
  const s = targetSize / Math.max(bsize.x, bsize.y, bsize.z);

  // Center and scale (scale first so position offset is in scaled space)
  gltfScene.scale.multiplyScalar(s);
  gltfScene.position.sub(center.multiplyScalar(s));

  // Apply dot-based orientation (same math as STL, applied to the scene group)
  if (dots?.head && dots?.tail) {
    const toTank = targetSize / (dots.scale || 2.5);
    const headV  = new THREE.Vector3(...dots.head).multiplyScalar(toTank);
    const tailV  = new THREE.Vector3(...dots.tail).multiplyScalar(toTank);
    const basisX = new THREE.Vector3().subVectors(headV, tailV).normalize();

    if (dots.back) {
      const backV  = new THREE.Vector3(...dots.back).multiplyScalar(toTank);
      const upHint = new THREE.Vector3().subVectors(backV, tailV).normalize();
      const basisZ = new THREE.Vector3().crossVectors(basisX, upHint).normalize();
      const basisY = new THREE.Vector3().crossVectors(basisZ, basisX).normalize();
      gltfScene.applyMatrix4(new THREE.Matrix4().makeBasis(basisX, basisY, basisZ).transpose());
    } else {
      gltfScene.applyMatrix4(
        new THREE.Matrix4().makeRotationFromQuaternion(
          new THREE.Quaternion().setFromUnitVectors(basisX, new THREE.Vector3(1, 0, 0))
        )
      );
    }
  }

  gltfScene.traverse(m => { if (m.isMesh) m.castShadow = true; });

  const wagGrp = new THREE.Group();
  wagGrp.add(gltfScene);

  const group = new THREE.Group();
  group.add(wagGrp);
  group.userData.tailGrp = wagGrp;
  group.userData.isSTL   = true;  // use gentle wag amplitude
  return group;
}

function makeProceduralBottomFeeder(colorHex, sizeMul) {
  const group = new THREE.Group();
  const s = FISH_SIZE * sizeMul;
  const col = new THREE.Color(colorHex);
  const mat     = new THREE.MeshStandardMaterial({ color: col, roughness: 0.72 });
  const darkMat = new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.6), roughness: 0.82 });

  // Flat oval carapace body
  const body = new THREE.Mesh(new THREE.SphereGeometry(s * 0.85, 12, 8), mat);
  body.scale.set(1.32, 0.4, 1.02);
  body.castShadow = true;
  group.add(body);

  // Carapace ridge
  const ridge = new THREE.Mesh(new THREE.SphereGeometry(s * 0.62, 10, 6), darkMat);
  ridge.scale.set(1.08, 0.28, 0.76);
  ridge.position.y = s * 0.13;
  group.add(ridge);

  // Eye stalks + eyes
  const eyeBlackMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const side of [-1, 1]) {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, s * 0.26, 5), mat);
    stalk.position.set(s * 0.68, s * 0.2, side * s * 0.28);
    stalk.rotation.z = side * 0.22;
    group.add(stalk);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 0.1, 8, 8), eyeWhiteMat);
    eye.position.set(s * 0.68 + side * 0.03, s * 0.4, side * s * 0.34);
    group.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(s * 0.056, 6, 6), eyeBlackMat);
    pupil.position.set(s * 0.76 + side * 0.03, s * 0.4, side * s * 0.36);
    group.add(pupil);
  }

  // Front claws
  for (const side of [-1, 1]) {
    const claw = new THREE.Mesh(new THREE.SphereGeometry(s * 0.19, 8, 6), mat);
    claw.scale.set(1.1, 0.55, 0.88);
    claw.position.set(s * 1.05, -s * 0.04, side * s * 0.26);
    group.add(claw);
    const pincer = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, s * 0.24, 4), darkMat);
    pincer.position.set(s * 1.22, s * 0.06, side * s * 0.26);
    pincer.rotation.z = 1.45 + side * 0.28;
    group.add(pincer);
  }

  // 3 legs per side
  for (let i = 0; i < 3; i++) {
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, s * 0.52, 4), darkMat);
      leg.position.set((i - 1) * s * 0.36, -s * 0.1, side * s * 0.54);
      leg.rotation.x = side * -0.68;
      leg.rotation.z = side * 0.12;
      leg.castShadow = true;
      group.add(leg);
    }
  }

  group.userData.tailGrp  = null;
  group.userData.isBottom = true;
  return group;
}

function makeProceduralWallCrawler(colorHex, sizeMul) {
  const group = new THREE.Group();
  const s = FISH_SIZE * sizeMul * 0.88;
  const col = new THREE.Color(colorHex);
  const shellCol = col.clone().lerp(new THREE.Color(0x8B6914), 0.55);
  const bodyMat  = new THREE.MeshStandardMaterial({ color: col, roughness: 0.82 });
  const shellMat = new THREE.MeshStandardMaterial({ color: shellCol, roughness: 0.56, metalness: 0.07 });
  const shellInMat = new THREE.MeshStandardMaterial({ color: shellCol.clone().multiplyScalar(0.7), roughness: 0.72 });

  // Flat foot/body clinging to the wall (thin in local X = wall-normal direction)
  const foot = new THREE.Mesh(new THREE.SphereGeometry(s * 0.76, 12, 8), bodyMat);
  foot.scale.set(0.28, 0.68, 1.02);
  foot.position.set(-s * 0.04, 0, 0);
  group.add(foot);

  // Main shell
  const shell = new THREE.Mesh(new THREE.SphereGeometry(s * 0.7, 14, 10), shellMat);
  shell.scale.set(0.8, 1.08, 0.8);
  shell.position.set(-s * 0.2, s * 0.3, 0);
  shell.castShadow = true;
  group.add(shell);

  // Whorl inner — gives impression of spiral depth
  const whorl = new THREE.Mesh(new THREE.SphereGeometry(s * 0.46, 10, 8), shellInMat);
  whorl.scale.set(0.74, 1.02, 0.74);
  whorl.position.set(-s * 0.16, s * 0.28, 0);
  group.add(whorl);

  // Shell apex nub
  const apex = new THREE.Mesh(new THREE.SphereGeometry(s * 0.17, 8, 6), shellInMat);
  apex.position.set(-s * 0.08, s * 0.86, 0);
  group.add(apex);

  // Head
  const headMat = new THREE.MeshStandardMaterial({
    color: col.clone().lerp(new THREE.Color(0xffffff), 0.1), roughness: 0.78 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(s * 0.28, 10, 8), headMat);
  head.position.set(s * 0.36, s * 0.08, 0);
  group.add(head);

  // Antennae with eye tips
  const eyeBlack = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const antMat   = new THREE.MeshStandardMaterial({ color: col, roughness: 0.82 });
  for (const side of [-1, 1]) {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, s * 0.44, 4), antMat);
    ant.position.set(s * 0.44, s * 0.28, side * s * 0.16);
    ant.rotation.z = -0.52; ant.rotation.x = side * 0.24;
    group.add(ant);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(s * 0.068, 6, 6), eyeBlack);
    tip.position.set(s * 0.55, s * 0.52, side * s * 0.22);
    group.add(tip);
  }

  group.userData.tailGrp = null;
  group.userData.isWall  = true;
  return group;
}

function makeProceduralEel(colorHex, sizeMul) {
  const group = new THREE.Group();
  const s     = FISH_SIZE * sizeMul;
  const col   = new THREE.Color(colorHex);
  const mat     = new THREE.MeshStandardMaterial({ color: col, roughness: 0.72 });
  const darkMat = new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.52), roughness: 0.84 });

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(s * 0.3, 10, 8), mat);
  head.scale.set(1.4, 0.86, 0.82);
  head.position.x = s * 0.22;
  head.castShadow = true;
  group.add(head);

  // Eyes
  const eyeBlack = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const eyeWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const side of [-1, 1]) {
    const ew = new THREE.Mesh(new THREE.SphereGeometry(s * 0.09, 7, 7), eyeWhite);
    ew.position.set(s * 0.3, s * 0.1, side * s * 0.24);
    group.add(ew);
    const ep = new THREE.Mesh(new THREE.SphereGeometry(s * 0.053, 6, 6), eyeBlack);
    ep.position.set(s * 0.37, s * 0.1, side * s * 0.26);
    group.add(ep);
  }

  // Body segments — each stored so we can animate them per-frame
  const SEGS    = 8;
  const SEG_LEN = s * 0.50;
  const segs    = [];
  for (let i = 0; i < SEGS; i++) {
    const r = s * Math.max(0.26 - i * 0.025, 0.04);
    const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), i < 5 ? mat : darkMat);
    seg.scale.set(1.0, 0.76, 0.74);
    seg.position.x = -(i * SEG_LEN + s * 0.12);
    seg.castShadow = true;
    group.add(seg);
    segs.push(seg);
  }

  // Dorsal fin strip
  const finMat = new THREE.MeshStandardMaterial({
    color: col.clone().multiplyScalar(0.7), transparent: true, opacity: 0.65, side: THREE.DoubleSide });
  const finGeo = new THREE.PlaneGeometry(SEGS * SEG_LEN * 0.9, s * 0.24);
  const dorsal = new THREE.Mesh(finGeo, finMat);
  dorsal.position.set(-(SEGS * SEG_LEN) * 0.42, s * 0.28, 0);
  group.add(dorsal);
  group.userData.dorsal = dorsal;

  group.userData.tailGrp      = null;
  group.userData.bodySegments = segs;
  group.userData.isEel        = true;
  return group;
}

function makeProceduralJellyfish(colorHex, sizeMul) {
  const group = new THREE.Group();
  const s     = FISH_SIZE * sizeMul;
  const col   = new THREE.Color(colorHex);
  const glowCol = col.clone().lerp(new THREE.Color(0xffffff), 0.38);

  const bellMat  = new THREE.MeshStandardMaterial({
    color: glowCol, transparent: true, opacity: 0.68,
    roughness: 0.14, metalness: 0.06, side: THREE.DoubleSide });
  const innerMat = new THREE.MeshStandardMaterial({
    color: col, transparent: true, opacity: 0.42, roughness: 0.22, side: THREE.DoubleSide });
  const tentMat  = new THREE.MeshStandardMaterial({
    color: col, transparent: true, opacity: 0.52, roughness: 0.55 });

  // Open bell — hemisphere facing down
  const bell = new THREE.Mesh(
    new THREE.SphereGeometry(s * 1.0, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), bellMat);
  bell.castShadow = true;
  group.add(bell);
  group.userData.jellyBell = bell;

  // Inner dome for depth
  const inner = new THREE.Mesh(
    new THREE.SphereGeometry(s * 0.82, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), innerMat);
  group.add(inner);

  // Oral arms (4 thicker trailing arms close to center)
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.01, s * 1.7, 5), tentMat.clone());
    arm.position.set(Math.cos(angle) * s * 0.28, -s * 0.88, Math.sin(angle) * s * 0.28);
    group.add(arm);
  }

  // Thin trailing tentacles
  const tentacles = [];
  for (let i = 0; i < 12; i++) {
    const angle  = (i / 12) * Math.PI * 2;
    const radius = s * (0.62 + Math.random() * 0.28);
    const len    = s * (1.5 + Math.random() * 1.8);
    const bx = Math.cos(angle) * radius;
    const bz = Math.sin(angle) * radius;
    const tent = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.003, len, 4), tentMat.clone());
    tent.position.set(bx, -len * 0.5 - s * 0.36, bz);
    group.add(tent);
    tentacles.push({ mesh: tent, bx, bz, angle });
  }

  group.userData.tentacles = tentacles;
  group.userData.tailGrp   = null;
  group.userData.isJelly   = true;
  return group;
}

async function spawnFish(data, isCurrent = () => true) {
  const { name, color = '#4FC3F7', size = 1.0, model } = data;
  const role = data.role || 'fish';
  let group;

  const proceduralFallback = () =>
    role === 'bottom' ? makeProceduralBottomFeeder(color, size) :
    role === 'wall'   ? makeProceduralWallCrawler(color, size)  :
    role === 'eel'    ? makeProceduralEel(color, size)          :
    role === 'jelly'  ? makeProceduralJellyfish(color, size)    :
    makeProceduralFish(color, size);

  if (model) {
    try {
      if (data.modelType === 'glb') {
        const loader = new GLTFLoader();
        const gltf = await loadModel(loader, model);
        group = makeGLBFish(gltf.scene, size, data.dots);
      } else {
        const loader = new STLLoader();
        const geo = await loadModel(loader, model);
        group = makeSTLFish(geo, color, size, data.dots);
      }
    } catch {
      group = proceduralFallback();
    }
  } else {
    group = proceduralFallback();
  }

  if (!isCurrent()) { disposeObject(group); return; }

  // Position and orient by role
  let wallSide;
  if (role === 'bottom') {
    group.position.set(
      (Math.random() - 0.5) * BOUNDS.x * 1.6,
      -BOUNDS.y + 0.22,
      (Math.random() - 0.5) * BOUNDS.z * 0.85
    );
  } else if (role === 'wall') {
    wallSide = Math.floor(Math.random() * 3);
    switch (wallSide) {
      case 0:
        group.position.set(-BOUNDS.x + 0.15, (Math.random()-0.5)*BOUNDS.y, (Math.random()-0.5)*BOUNDS.z*0.8);
        group.rotation.y =  Math.PI / 2;
        break;
      case 1:
        group.position.set( BOUNDS.x - 0.15, (Math.random()-0.5)*BOUNDS.y, (Math.random()-0.5)*BOUNDS.z*0.8);
        group.rotation.y = -Math.PI / 2;
        break;
      default:
        group.position.set((Math.random()-0.5)*BOUNDS.x*0.8, (Math.random()-0.5)*BOUNDS.y, -BOUNDS.z + 0.15);
        group.rotation.y = Math.PI;
        break;
    }
  } else if (role === 'eel') {
    group.position.set(
      (Math.random() - 0.5) * BOUNDS.x * 1.6,
      -BOUNDS.y + 0.6 + Math.random() * 1.2,
      (Math.random() - 0.5) * BOUNDS.z * 0.85
    );
  } else if (role === 'jelly') {
    group.position.set(
      (Math.random() - 0.5) * BOUNDS.x * 1.3,
      Math.random() * BOUNDS.y * 0.55,
      (Math.random() - 0.5) * BOUNDS.z * 0.8
    );
  } else {
    group.position.set(
      (Math.random() - 0.5) * BOUNDS.x * 1.6,
      (Math.random() - 0.5) * BOUNDS.y * 0.9,
      (Math.random() - 0.5) * BOUNDS.z * 0.85
    );
  }
  scene.add(group);

  // Label
  const labelDiv = document.createElement('div');
  labelDiv.className = 'fish-label';
  labelDiv.textContent = name;
  const label = new CSS2DObject(labelDiv);
  label.position.set(0,
    role === 'bottom' ? FISH_SIZE * size * 1.6 :
    role === 'wall'   ? FISH_SIZE * size * 1.9 :
    role === 'eel'    ? FISH_SIZE * size * 1.8 :
    role === 'jelly'  ? FISH_SIZE * size * 2.6 :
    FISH_SIZE * size * 2.1, 0);
  group.add(label);

  const entry = {
    group, data,
    target:     role === 'bottom' ? randomFloorTarget() :
                role === 'wall'   ? randomWallTarget(wallSide) :
                role === 'eel'    ? randomEelTarget()          :
                role === 'jelly'  ? randomJellyTarget()        :
                randomTarget(),
    speed:      FISH_SPEED * (0.7 + Math.random() * 0.6),
    tailGroup:  group.userData.tailGrp,
    tailPhase:  Math.random() * Math.PI * 2,
    tailSpeed:  2.6 + Math.random() * 1.6,
    state:      'wander',
    feedTarget: null,
    waitTicks:  0,
  };
  if (role === 'wall') entry.wallSide = wallSide;
  fishes.push(entry);
  updateCount();
  renderFrame();
}

function randomTarget() {
  return new THREE.Vector3(
    (Math.random() - 0.5) * BOUNDS.x * 1.7,
    (Math.random() - 0.5) * BOUNDS.y * 1.0,
    (Math.random() - 0.5) * BOUNDS.z * 0.9
  );
}

function randomFloorTarget() {
  return new THREE.Vector3(
    (Math.random() - 0.5) * BOUNDS.x * 1.7,
    -BOUNDS.y + 0.22,
    (Math.random() - 0.5) * BOUNDS.z * 0.9
  );
}

function randomWallTarget(wallSide) {
  switch (wallSide) {
    case 0: return new THREE.Vector3(-BOUNDS.x + 0.15, (Math.random()-0.5)*BOUNDS.y*1.4, (Math.random()-0.5)*BOUNDS.z*1.5);
    case 1: return new THREE.Vector3( BOUNDS.x - 0.15, (Math.random()-0.5)*BOUNDS.y*1.4, (Math.random()-0.5)*BOUNDS.z*1.5);
    default: return new THREE.Vector3((Math.random()-0.5)*BOUNDS.x*1.6, (Math.random()-0.5)*BOUNDS.y*1.4, -BOUNDS.z + 0.15);
  }
}

function randomEelTarget() {
  return new THREE.Vector3(
    (Math.random() - 0.5) * BOUNDS.x * 1.7,
    -BOUNDS.y + 0.5 + Math.random() * 1.5,
    (Math.random() - 0.5) * BOUNDS.z * 0.9
  );
}

function randomJellyTarget() {
  return new THREE.Vector3(
    (Math.random() - 0.5) * BOUNDS.x * 1.5,
    Math.random() * BOUNDS.y * 0.6,
    (Math.random() - 0.5) * BOUNDS.z * 0.85
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FISH UPDATE
// ═══════════════════════════════════════════════════════════════════════════

function updateFishes(t) {
  for (const fish of fishes) {
    const role = fish.data.role || 'fish';
    if (role === 'bottom') {
      updateBottomFeeder(fish, t);
    } else if (role === 'wall') {
      updateWallCrawler(fish, t);
    } else if (role === 'eel') {
      updateEel(fish, t);
    } else if (role === 'jelly') {
      updateJellyfish(fish, t);
    } else {
      updateSwimmer(fish, t);
    }
  }
}

function updateSwimmer(fish, t) {
  const pos = fish.group.position;
  let dest;

  if (fish.state === 'feed' && fish.feedTarget) {
    dest = fish.feedTarget;
  } else {
    dest = fish.target;
  }

  const dir = new THREE.Vector3().subVectors(dest, pos);

  if (fish.state === 'wander') {
    if (dir.length() < 0.45) {
      if (fish.waitTicks-- <= 0) {
        fish.target = randomTarget();
        fish.waitTicks = (Math.random() * 80) | 0;
      }
    }
  } else if (fish.state === 'feed') {
    let nearDist = Infinity, nearFood = null;
    for (const f of foods) {
      if (f.eaten) continue;
      const d = pos.distanceTo(f.mesh.position);
      if (d < nearDist) { nearDist = d; nearFood = f; }
    }
    if (nearFood) {
      fish.feedTarget = nearFood.mesh.position;
      if (nearDist < 0.6) { nearFood.eaten = true; spawnBubbles(pos.x, pos.y, pos.z, 4); }
      dir.subVectors(fish.feedTarget, pos);
    } else {
      fish.state = 'wander';
      fish.feedTarget = null;
    }
  }

  const speed = fish.state === 'feed' ? fish.speed * 1.9 : fish.speed;
  if (dir.length() > 0.08) {
    dir.normalize();
    pos.addScaledVector(dir, speed);
    const tY = Math.atan2(-dir.z, dir.x);
    let dY = tY - fish.group.rotation.y;
    if (dY >  Math.PI) dY -= Math.PI * 2;
    if (dY < -Math.PI) dY += Math.PI * 2;
    fish.group.rotation.y += dY * 0.07;
  }

  pos.y += Math.sin(t * 0.85 + fish.tailPhase) * 0.0025;
  pos.x = clamp(pos.x, -BOUNDS.x, BOUNDS.x);
  pos.y = clamp(pos.y, -BOUNDS.y * 0.82, BOUNDS.y * 0.88);
  pos.z = clamp(pos.z, -BOUNDS.z, BOUNDS.z);

  if (fish.tailGroup) {
    const amp = fish.group.userData.isSTL ? 0.2 : 0.48;
    fish.tailGroup.rotation.y = Math.sin(t * fish.tailSpeed + fish.tailPhase) * amp;
  }
}

function updateBottomFeeder(fish, t) {
  const pos = fish.group.position;

  if (fish.state === 'feed') {
    // Bottom feeders eat food that has sunk to the floor
    let nearFood = null, nearDist = Infinity;
    for (const f of foods) {
      if (f.eaten) continue;
      if (f.mesh.position.y > -BOUNDS.y + 0.65) continue;
      const d = pos.distanceTo(f.mesh.position);
      if (d < nearDist) { nearDist = d; nearFood = f; }
    }
    if (nearFood) {
      fish.feedTarget = new THREE.Vector3(nearFood.mesh.position.x, -BOUNDS.y + 0.22, nearFood.mesh.position.z);
      if (nearDist < 0.7) { nearFood.eaten = true; spawnBubbles(pos.x, pos.y, pos.z, 3); }
    } else {
      fish.state = 'wander';
      fish.feedTarget = null;
    }
  }

  const dest = (fish.state === 'feed' && fish.feedTarget) ? fish.feedTarget : fish.target;
  const dir  = new THREE.Vector3(dest.x - pos.x, 0, dest.z - pos.z);
  const dist = dir.length();

  if (dist < 0.4) {
    if (fish.waitTicks-- <= 0) {
      fish.target   = randomFloorTarget();
      fish.waitTicks = (Math.random() * 150) | 0;
    }
  } else {
    dir.normalize();
    pos.addScaledVector(dir, fish.speed * 0.5);
    const tY = Math.atan2(-dir.z, dir.x);
    let dY = tY - fish.group.rotation.y;
    if (dY >  Math.PI) dY -= Math.PI * 2;
    if (dY < -Math.PI) dY += Math.PI * 2;
    fish.group.rotation.y += dY * 0.06;
  }

  pos.y = -BOUNDS.y + 0.22;
  pos.x = clamp(pos.x, -BOUNDS.x * 0.93, BOUNDS.x * 0.93);
  pos.z = clamp(pos.z, -BOUNDS.z * 0.88, BOUNDS.z * 0.88);
  fish.group.rotation.z = Math.sin(t * 4.5 + fish.tailPhase) * 0.07;
}

function updateWallCrawler(fish, t) {
  const pos      = fish.group.position;
  const wallSide = fish.wallSide ?? 0;
  const dest     = fish.target;
  const dir      = new THREE.Vector3().subVectors(dest, pos);
  const dist     = dir.length();

  if (dist < 0.35) {
    if (fish.waitTicks-- <= 0) {
      fish.target    = randomWallTarget(wallSide);
      fish.waitTicks = (Math.random() * 240) | 0;
    }
  } else {
    dir.normalize();
    pos.addScaledVector(dir, fish.speed * 0.28);
  }

  // Clamp to wall surface
  switch (wallSide) {
    case 0: pos.x = -BOUNDS.x + 0.15; break;
    case 1: pos.x =  BOUNDS.x - 0.15; break;
    default: pos.z = -BOUNDS.z + 0.15; break;
  }
  pos.y = clamp(pos.y, -BOUNDS.y * 0.88, BOUNDS.y * 0.88);
  if (wallSide < 2) pos.z = clamp(pos.z, -BOUNDS.z * 0.88, BOUNDS.z * 0.88);
  else              pos.x = clamp(pos.x, -BOUNDS.x * 0.9,  BOUNDS.x * 0.9);

  fish.group.rotation.z = Math.sin(t * 0.7 + fish.tailPhase) * 0.04;
}

function updateEel(fish, t) {
  const pos = fish.group.position;

  const dist = pos.distanceTo(fish.target);
  if (dist < 0.45) {
    if (fish.waitTicks-- <= 0) {
      fish.target    = randomEelTarget();
      fish.waitTicks = (Math.random() * 90) | 0;
    }
  }

  const dir = new THREE.Vector3().subVectors(fish.target, pos);
  if (dir.length() > 0.1) {
    dir.normalize();
    pos.addScaledVector(dir, fish.speed * 0.88);
    const tY = Math.atan2(-dir.z, dir.x);
    let dY = tY - fish.group.rotation.y;
    if (dY >  Math.PI) dY -= Math.PI * 2;
    if (dY < -Math.PI) dY += Math.PI * 2;
    fish.group.rotation.y += dY * 0.055;
  }

  pos.y = clamp(pos.y, -BOUNDS.y + 0.4, -BOUNDS.y * 0.18);
  pos.x = clamp(pos.x, -BOUNDS.x * 0.9, BOUNDS.x * 0.9);
  pos.z = clamp(pos.z, -BOUNDS.z * 0.88, BOUNDS.z * 0.88);

  // Traveling sine wave through body segments (Z = side-to-side in local space)
  if (fish.group.userData.bodySegments) {
    fish.group.userData.bodySegments.forEach((seg, i) => {
      seg.position.z = Math.sin(t * 2.6 - i * 0.72 + fish.tailPhase) * (0.04 + i * 0.032);
    });
  }
  if (fish.group.userData.dorsal) {
    fish.group.userData.dorsal.rotation.z = Math.sin(t * 2.6 + fish.tailPhase) * 0.1;
  }
}

function updateJellyfish(fish, t) {
  const pos = fish.group.position;

  const dist = pos.distanceTo(fish.target);
  if (dist < 0.5) {
    if (fish.waitTicks-- <= 0) {
      fish.target    = randomJellyTarget();
      fish.waitTicks = (Math.random() * 200) | 0;
    }
  } else {
    const dir = new THREE.Vector3().subVectors(fish.target, pos).normalize();
    pos.addScaledVector(dir, fish.speed * 0.2);
  }

  // Gentle vertical drift
  pos.y += Math.sin(t * 0.58 + fish.tailPhase) * 0.009;
  pos.x  = clamp(pos.x, -BOUNDS.x * 0.88, BOUNDS.x * 0.88);
  pos.y  = clamp(pos.y, -BOUNDS.y * 0.55, BOUNDS.y * 0.84);
  pos.z  = clamp(pos.z, -BOUNDS.z * 0.88, BOUNDS.z * 0.88);

  // Pulse bell: contract radially as it pushes down
  const pulse = 0.84 + Math.sin(t * 2.1 + fish.tailPhase) * 0.18;
  const bell  = fish.group.userData.jellyBell;
  if (bell) {
    bell.scale.y = pulse;
    bell.scale.x = 1 + (1 - pulse) * 0.18;
    bell.scale.z = 1 + (1 - pulse) * 0.18;
  }

  // Tentacle lazy sway
  const tents = fish.group.userData.tentacles;
  if (tents) {
    tents.forEach((tent, i) => {
      const w = Math.sin(t * 1.3 + fish.tailPhase + i * 0.52) * 0.11;
      tent.mesh.position.x = tent.bx + w * Math.cos(tent.angle + Math.PI / 2);
      tent.mesh.position.z = tent.bz + w * Math.sin(tent.angle + Math.PI / 2);
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FOOD
// ═══════════════════════════════════════════════════════════════════════════

function dropFood() {
  const geo = new THREE.SphereGeometry(0.075, 7, 7);
  const mat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
  foodResources = [geo, mat];
  for (let i = 0; i < FOOD_COUNT; i++) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      (Math.random() - 0.5) * BOUNDS.x * 0.9,
      BOUNDS.y * 0.92,
      (Math.random() - 0.5) * BOUNDS.z * 0.5
    );
    mesh.castShadow = true;
    scene.add(mesh);
    foods.push({ mesh, vy: 0, eaten: false });
  }
}

function updateFood() {
  foods = foods.filter(f => {
    if (f.eaten) { scene.remove(f.mesh); return false; }
    f.vy -= 0.0075;
    f.mesh.position.y += f.vy;
    if (f.mesh.position.y < -BOUNDS.y + 0.08) { f.vy = 0; f.mesh.position.y = -BOUNDS.y + 0.08; }
    return true;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// BUBBLES
// ═══════════════════════════════════════════════════════════════════════════

function spawnBubbles(x, y, z, count = 1) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xadd8e6, transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0.6 });
  for (let i = 0; i < count; i++) {
    const r = 0.04 + Math.random() * 0.07;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 6), mat.clone());
    mesh.position.set(x + (Math.random() - 0.5) * 0.45, y, z + (Math.random() - 0.5) * 0.3);
    scene.add(mesh);
    bubbles.push({
      mesh,
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.01, 0.016 + Math.random() * 0.012, (Math.random() - 0.5) * 0.008),
      life: 1.0,
      decay: 0.0042 + Math.random() * 0.003,
    });
  }
  mat.dispose();
}

function updateBubbles() {
  bubbles = bubbles.filter(b => {
    b.mesh.position.add(b.vel);
    b.life -= b.decay;
    b.mesh.material.opacity = b.life * 0.32;
    if (b.life <= 0 || b.mesh.position.y > BOUNDS.y + 1) {
      scene.remove(b.mesh); disposeObject(b.mesh); return false;
    }
    return true;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// DIRT
// ═══════════════════════════════════════════════════════════════════════════

function spawnDirt(n) {
  for (let i = 0; i < n; i++) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.05 + Math.random() * 0.07, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0x2d5a27, transparent: true, opacity: 0.55 })
    );
    mesh.position.set(
      (Math.random() - 0.5) * BOUNDS.x * 1.85,
      (Math.random() - 0.5) * BOUNDS.y * 1.65,
      (Math.random() - 0.5) * BOUNDS.z * 1.1
    );
    scene.add(mesh);
    dirtBits.push({ mesh, drift: new THREE.Vector3(
      (Math.random() - 0.5) * 0.005,
      (Math.random() - 0.5) * 0.003,
      (Math.random() - 0.5) * 0.003
    )});
  }
}

function updateDirt() {
  for (const d of dirtBits) {
    d.mesh.position.add(d.drift);
    if (Math.abs(d.mesh.position.x) > BOUNDS.x) d.drift.x *= -1;
    if (Math.abs(d.mesh.position.y) > BOUNDS.y) d.drift.y *= -1;
    if (Math.abs(d.mesh.position.z) > BOUNDS.z) d.drift.z *= -1;
  }
}

function clearDirt() {
  dirtBits.forEach(d => { scene.remove(d.mesh); disposeObject(d.mesh); });
  dirtBits = [];
}

// ═══════════════════════════════════════════════════════════════════════════
// PLANKTON
// ═══════════════════════════════════════════════════════════════════════════

function updatePlankton() {
  for (const p of plankton) {
    p.mesh.position.add(p.drift);
    if (Math.abs(p.mesh.position.x) > BOUNDS.x * 1.1) p.drift.x *= -1;
    if (Math.abs(p.mesh.position.y) > BOUNDS.y * 1.1) p.drift.y *= -1;
    if (Math.abs(p.mesh.position.z) > BOUNDS.z * 1.1) p.drift.z *= -1;
  }
}

function updateSeaweeds(t) {
  for (const sw of seaweeds) {
    sw.segments.forEach(({ mesh, idx }) => {
      mesh.rotation.z = Math.sin(t * 0.65 + sw.phase + idx * 0.55) * 0.16;
      mesh.rotation.x = Math.sin(t * 0.45 + sw.phase * 1.3 + idx * 0.38) * 0.07;
    });
  }
}

function updateAnemones(t) {
  for (const an of anemones) {
    an.tentacles.forEach(({ mesh, angle, baseRotZ, baseRotX }, i) => {
      const wave = Math.sin(t * 1.1 + an.phase + i * 0.65) * 0.18;
      mesh.rotation.z = baseRotZ + wave * Math.cos(angle);
      mesh.rotation.x = baseRotX + wave * Math.sin(angle);
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DIRTY UI
// ═══════════════════════════════════════════════════════════════════════════

function setDirtiness(val) {
  dirtiness = clamp(val, 0, MAX_DIRTY);
  const pct = dirtiness / MAX_DIRTY;
  const clarity = Math.round(100 - pct * 100);
  $mfill.style.width = `${clarity}%`;
  $mfill.style.background = clarity > 65 ? '#a9e4cd' : clarity > 30 ? '#ffce88' : '#ffb8b0';
  document.getElementById('water-value').textContent = `${clarity}%`;
  document.getElementById('meter-track').setAttribute('aria-valuenow', clarity);
  document.getElementById('care-summary').textContent = clarity > 65 ? 'Water looks clear.' : clarity > 30 ? 'Time for a clean.' : 'The water needs a clean.';
  $dirty.style.opacity = pct * 0.62;
}

// ═══════════════════════════════════════════════════════════════════════════
// FISH CLICK / TAP
// ═══════════════════════════════════════════════════════════════════════════


function showCard(fish) {
  if (!$card.contains(document.activeElement)) cardReturnFocus = document.activeElement;
  const role = fish.data.role || 'fish';
  const emoji = { fish: '🐟', bottom: '🦀', wall: '🐌', eel: '🐍', jelly: '🪼' }[role] || '🐟';
  const sub = fish.data.model ? 'Student 3D design' : ROLE_DETAILS[role]?.label || 'Class fish';
  document.getElementById('fish-card-emoji').textContent = emoji;
  document.getElementById('fish-card-name').textContent  = fish.data.name;
  document.getElementById('fish-card-sub').textContent   = sub;
  document.getElementById('fish-card-behavior').textContent = ROLE_DETAILS[role]?.description || ROLE_DETAILS.fish.description;
  selectedFish = fish;
  fishes.forEach(f => f.group.traverse(child => {
    if (child.isCSS2DObject) child.element.classList.toggle('selected', f === fish);
  }));
  $card.hidden = false;
  $card.focus({ preventScroll: true });
  document.getElementById('scene-hint').hidden = true;
  renderFrame();
}

function handlePointerUp(e) {
  const rect = $canvas.getBoundingClientRect();
  const clientX = e.touches ? e.changedTouches[0].clientX : e.clientX;
  const clientY = e.touches ? e.changedTouches[0].clientY : e.clientY;
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const all = [];
  fishes.forEach(f => f.group.traverse(m => { if (m.isMesh) all.push(m); }));
  const hits = raycaster.intersectObjects(all);
  if (!hits.length) return;
  const hitMesh = hits[0].object;
  const fish = fishes.find(f => { let ok = false; f.group.traverse(m => { if (m === hitMesh) ok = true; }); return ok; });
  if (fish) showCard(fish);
}

$canvas.addEventListener('pointerup', handlePointerUp);

// ═══════════════════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

window.onFeed = function () {
  if (isFeeding || isCleaning || !fishes.length) return;
  setPaused(false);
  isFeeding = true;
  feedRemaining = 13;
  $feedBtn.disabled = true;
  dropFood();
  fishes.forEach(f => { f.state = 'feed'; f.feedTarget = null; });
  setDirtiness(dirtiness + DIRTY_PER_FEED);
  spawnDirt(Math.ceil(DIRTY_PER_FEED * 0.6));
  filterHealth = clamp(filterHealth - 6, 0, 100);
  toast('Feeding time! Watch the fish find their food.');
};

window.onClean = function () {
  if (isCleaning) return;
  setPaused(false);
  isCleaning = true;
  cleanStart = dirtiness;
  cleanRemaining = 3.5;
  $cleanBtn.disabled = true;
  $feedBtn.disabled = true;
  toast('A fresh start for the water…');
  [-7, 0, 7].forEach(x => spawnBubbles(x, -BOUNDS.y + 0.4, 0, 15));
};

function updateCare(dt) {
  heatCooldown = Math.max(0, heatCooldown - dt);
  filterCooldown = Math.max(0, filterCooldown - dt);
  if (isFeeding) {
    feedRemaining = Math.max(0, feedRemaining - dt);
    const text = `Feeding… ${Math.ceil(feedRemaining)}s`;
    if ($feedBtn.textContent !== text) $feedBtn.textContent = text;
    if (!feedRemaining) {
      foods.forEach(f => scene.remove(f.mesh));
      foods = [];
      foodResources.forEach(resource => resource.dispose());
      foodResources = [];
      fishes.forEach(f => { f.state = 'wander'; f.feedTarget = null; });
      isFeeding = false;
      $feedBtn.disabled = !fishes.length;
      $feedBtn.textContent = 'Feed fish';
    }
  }
  if (isCleaning) {
    cleanRemaining = Math.max(0, cleanRemaining - dt);
    setDirtiness(cleanStart * cleanRemaining / 3.5);
    $cleanBtn.textContent = 'Cleaning…';
    if (!cleanRemaining) {
      clearDirt();
      isCleaning = false;
      $cleanBtn.disabled = false;
      $cleanBtn.textContent = 'Clean water';
      $feedBtn.disabled = isFeeding || !fishes.length;
      toast('The water is clear again.');
    }
  }
}

window.toggleFS = async function () {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
  } catch { toast('Fullscreen is unavailable in this window.'); }
};
document.getElementById('fsBtn').addEventListener('click', window.toggleFS);
document.addEventListener('fullscreenchange', () => {
  const active = !!document.fullscreenElement;
  const button = document.getElementById('fsBtn');
  button.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
  button.title = active ? 'Exit fullscreen' : 'Enter fullscreen';
});

// Hide fullscreen button on iOS where the API isn't supported
if (!document.documentElement.requestFullscreen) {
  document.getElementById('fsBtn').style.display = 'none';
}

// ── Aquarium Systems ─────────────────────────────────────────────────────────

function updateSystems(dt) {
  // Temperature: drift toward set-point + small random noise
  const err = tempTarget - waterTemp;
  waterTemp += err * 0.0008 + (Math.random() - 0.5) * 0.003;
  waterTemp = clamp(waterTemp, 60, 92);
  // Natural drift: occasionally shift the set-point slightly
  if (Math.random() < 0.0008) tempTarget = clamp(tempTarget + (Math.random() - 0.5) * 2, 71, 79);

  // Filter: degrades with time and fish count
  const rate = (0.003 + fishes.length * 0.0008) * dt;
  filterHealth = clamp(filterHealth - rate, 0, 100);

  // pH: random slow drift
  phDrift += (Math.random() - 0.5) * 0.00015;
  phDrift  = clamp(phDrift, -0.004, 0.004);
  phLevel  = clamp(phLevel + phDrift, 6.3, 7.9);


  // Render UI only when panel is open
  if (document.getElementById('systems-panel').open) {
    if (Math.floor(simulationTime * 4) !== Math.floor((simulationTime - dt) * 4)) renderSystemsUI();
  }
}

function renderSystemsUI() {
  const tempC = ((waterTemp - 32) * 5 / 9).toFixed(1);
  document.getElementById('temp-lcd').textContent = `${waterTemp.toFixed(1)}°F`;
  document.getElementById('temp-c').textContent   = `${tempC}°C`;

  // Thermometer fill: 66–82°F mapped to 0–100%
  const pct = clamp((waterTemp - 66) / (82 - 66), 0, 1);
  const tf  = document.getElementById('thermo-fill');
  tf.style.height = `${pct * 100}%`;
  tf.style.background =
    waterTemp < 70 ? 'linear-gradient(to top,#3b82f6,#60a5fa)' :
    waterTemp > 79 ? 'linear-gradient(to top,#ef4444,#f87171)' :
                     'linear-gradient(to top,#059669,#34d399)';

  const ts = document.getElementById('temp-status');
  const hb = document.getElementById('heatBtn');
  if (waterTemp < 70)      { ts.textContent = '⚠ Too Cold!'; ts.className = 'sys-bad'; }
  else if (waterTemp > 79) { ts.textContent = '⚠ Too Warm!'; ts.className = 'sys-bad'; }
  else                     { ts.textContent = '✓ Optimal';   ts.className = 'sys-ok';  }
  hb.disabled    = heatCooldown > 0;
  hb.textContent = heatCooldown > 0 ? `⏳ ${Math.ceil(heatCooldown)}s` : '🌡️ Adjust Heater';

  // Filter bar
  const ff = document.getElementById('filter-fill');
  ff.style.width = `${filterHealth}%`;
  ff.style.background =
    filterHealth > 60 ? 'linear-gradient(to right,#059669,#34d399)' :
    filterHealth > 25 ? 'linear-gradient(to right,#d97706,#fbbf24)' :
                        'linear-gradient(to right,#dc2626,#f87171)';
  document.getElementById('filter-lcd').textContent = `${Math.round(filterHealth)}% Efficiency`;
  const fs2 = document.getElementById('filter-status');
  const fb  = document.getElementById('filterBtn');
  if (filterHealth > 60)      { fs2.textContent = '✓ Running Clean'; fs2.className = 'sys-ok';   }
  else if (filterHealth > 25) { fs2.textContent = '⚠ Filter Dirty';  fs2.className = 'sys-warn'; }
  else                        { fs2.textContent = '🚨 Clogged!';      fs2.className = 'sys-bad';  }
  fb.disabled    = filterCooldown > 0;
  fb.textContent = filterCooldown > 0 ? `⏳ ${Math.ceil(filterCooldown)}s` : '🔧 Replace Filter';

  // pH
  document.getElementById('ph-lcd').textContent = phLevel.toFixed(2);
  const ps = document.getElementById('ph-status');
  if (phLevel < 6.6 || phLevel > 7.6) { ps.textContent = '⚠ Out of Range'; ps.className = 'sys-warn'; }
  else                                 { ps.textContent = '✓ Neutral';       ps.className = 'sys-ok';   }
}

window.onAdjustHeater = function () {
  if (heatCooldown > 0) return;
  tempTarget   = 75.0;
  heatCooldown = 30;
  renderSystemsUI();
  toast('🌡️ Heater adjusted — targeting 75°F');
};

window.onReplaceFilter = function () {
  if (filterCooldown > 0) return;
  filterHealth   = 100;
  filterCooldown = 45;
  renderSystemsUI();
  toast('🔧 Filter replaced — running at full efficiency!');
};

window.toggleSystems = function () {
  const panel = document.getElementById('systems-panel');
  if (panel.open) panel.close();
  else { renderSystemsUI(); panel.showModal(); }
};
window.closeSystems = function () { document.getElementById('systems-panel').close(); };
document.getElementById('systemsBtn').addEventListener('click', window.toggleSystems);

// ── Ambient Classical Music ──────────────────────────────────────────────────
// Transcribed opening motifs — public domain works performed on synthesis.
// Each event: [beatTime, note|notes[], durationBeats, velocity 0-1]

const CLASSICAL_PIECES = [
  {
    name: 'La Cathédrale Engloutie',
    composer: 'Debussy', year: '1910',
    bpm: 52, loopBeats: 72,           // 12 bars × 6/4
    atk: 0.20, rel: 5.5,
    events: [
      // Parallel open-5ths rise from the depths (pp, sans nuances)
      [0,  ['C3','G3','C4','G4'],        6, 0.22],
      [6,  ['D3','A3','D4','A4'],        6, 0.22],
      [12, ['E3','B3','E4','B4'],        3, 0.24],
      [15, ['F3','C4','F4','C5'],        3, 0.24],
      [18, ['G3','D4','G4','D5'],        6, 0.26],
      [24, ['Bb2','F3','Bb3','F4'],      6, 0.23],
      [30, ['Ab2','Eb3','Ab3','Eb4'],    6, 0.22],
      // Descending — cathedral submerges again
      [36, ['G2','D3','G3','D4'],        6, 0.21],
      [42, ['F2','C3','F3','C4'],        6, 0.20],
      [48, ['E2','B2','E3','B3'],        6, 0.19],
      [54, ['D2','A2','D3','A3'],        6, 0.19],
      [60, ['C2','G2','C3','G3','C4'], 12, 0.17],
    ]
  },
  {
    name: 'Clair de Lune',
    composer: 'Debussy', year: '1905',
    bpm: 60, loopBeats: 72,           // 8 bars × 9 eighth-note beats (9/8)
    atk: 0.08, rel: 4.0,
    events: [
      // Rolling Db major arpeggios — moonlight on water
      // Bar 1: Db major (I)
      [0,'Db3',9,0.28],  [0,'Db4',1,0.18],[1,'F4',1,0.16],[2,'Ab4',1,0.16],
      [3,'Db5',1,0.20],  [4,'F5',1,0.18], [5,'Ab5',1,0.18],[6,'Db5',1,0.17],
      [7,'Ab4',1,0.16],  [8,'F4',1,0.16],
      // Bar 2: Ab major (V)
      [9,'Ab2',9,0.26],  [9,'Ab3',1,0.17],[10,'C4',1,0.15],[11,'Eb4',1,0.15],
      [12,'Ab4',1,0.18], [13,'C5',1,0.17],[14,'Eb5',1,0.16],[15,'Ab5',1,0.18],
      [16,'Eb5',1,0.16], [17,'C5',1,0.15],
      // Bar 3: Gb major (IV)
      [18,'Gb2',9,0.25], [18,'Gb3',1,0.16],[19,'Bb3',1,0.15],[20,'Db4',1,0.15],
      [21,'Gb4',1,0.18], [22,'Bb4',1,0.17],[23,'Db5',1,0.16],[24,'Gb5',1,0.19],
      [25,'Db5',1,0.16], [26,'Bb4',1,0.15],
      // Bar 4: Db/F (I⁶)
      [27,'F2',9,0.26],  [27,'Db4',1,0.16],[28,'F4',1,0.16],[29,'Ab4',1,0.16],
      [30,'Db5',1,0.18], [31,'F5',1,0.17], [32,'Ab5',1,0.18],[33,'Db5',1,0.16],
      [34,'Ab4',1,0.16], [35,'F4',1,0.15],
      // Bar 5: Bbm (vi)
      [36,'Bb2',9,0.24], [36,'Bb3',1,0.16],[37,'Db4',1,0.15],[38,'F4',1,0.15],
      [39,'Bb4',1,0.17], [40,'Db5',1,0.16],[41,'F5',1,0.16], [42,'Bb5',1,0.19],
      [43,'F5',1,0.16],  [44,'Db5',1,0.15],
      // Bar 6: Ebm (iim)
      [45,'Eb2',9,0.23], [45,'Eb3',1,0.15],[46,'Gb3',1,0.14],[47,'Bb3',1,0.14],
      [48,'Eb4',1,0.16], [49,'Gb4',1,0.15],[50,'Bb4',1,0.15],[51,'Eb5',1,0.17],
      [52,'Bb4',1,0.15], [53,'Gb4',1,0.14],
      // Bar 7: Ab major (V)
      [54,'Ab2',9,0.25], [54,'Ab3',1,0.16],[55,'C4',1,0.15],[56,'Eb4',1,0.15],
      [57,'Ab4',1,0.18], [58,'C5',1,0.17], [59,'Eb5',1,0.17],[60,'Ab5',1,0.20],
      [61,'Eb5',1,0.17], [62,'C5',1,0.16],
      // Bar 8: Db (I) — resolution
      [63,'Db2',9,0.27], [63,'Db4',1,0.17],[64,'F4',1,0.16],[65,'Ab4',1,0.16],
      [66,'Db5',1,0.20], [67,'F5',1,0.18], [68,'Ab5',1,0.18],[69,'Db5',1,0.17],
      [70,'Ab4',1,0.16], [71,'F4',1,0.16],
    ]
  },
  {
    name: "Jeux d'eau",
    composer: 'Ravel', year: '1901',
    bpm: 120, loopBeats: 48,          // 6 bars, 8th-note pulse
    atk: 0.03, rel: 2.5,
    events: [
      // E major cascading fountain — up then down each bar
      // Bar 1: E major
      [0,'E2',8,0.25],
      [0,'E4',.5,0.18],[.5,'G#4',.5,0.16],[1,'B4',.5,0.16],[1.5,'E5',.5,0.18],
      [2,'G#5',.5,0.17],[2.5,'B5',.5,0.17],[3,'E6',.5,0.22],
      [3.5,'B5',.5,0.17],[4,'G#5',.5,0.16],[4.5,'E5',.5,0.16],
      [5,'B4',.5,0.15],[5.5,'G#4',.5,0.15],[6,'E4',.5,0.14],[6.5,'B3',.5,0.14],[7,'G#3',.5,0.13],[7.5,'E3',.5,0.13],
      // Bar 2: F# major
      [8,'F#2',8,0.22],
      [8,'F#3',.5,0.16],[8.5,'A#3',.5,0.15],[9,'C#4',.5,0.15],[9.5,'F#4',.5,0.17],
      [10,'A#4',.5,0.16],[10.5,'C#5',.5,0.16],[11,'F#5',.5,0.20],
      [11.5,'C#5',.5,0.16],[12,'A#4',.5,0.15],[12.5,'F#4',.5,0.15],
      [13,'C#4',.5,0.14],[13.5,'A#3',.5,0.14],[14,'F#3',.5,0.13],[14.5,'C#3',.5,0.13],[15,'A#2',.5,0.12],[15.5,'F#2',.5,0.12],
      // Bar 3: B major
      [16,'B2',8,0.23],
      [16,'B3',.5,0.16],[16.5,'D#4',.5,0.15],[17,'F#4',.5,0.15],[17.5,'B4',.5,0.17],
      [18,'D#5',.5,0.16],[18.5,'F#5',.5,0.16],[19,'B5',.5,0.20],
      [19.5,'F#5',.5,0.16],[20,'D#5',.5,0.15],[20.5,'B4',.5,0.15],
      [21,'F#4',.5,0.14],[21.5,'D#4',.5,0.14],[22,'B3',.5,0.13],[22.5,'F#3',.5,0.13],[23,'D#3',.5,0.12],[23.5,'B2',.5,0.12],
      // Bar 4: A major (IV)
      [24,'A2',8,0.22],
      [24,'A3',.5,0.16],[24.5,'C#4',.5,0.15],[25,'E4',.5,0.15],[25.5,'A4',.5,0.17],
      [26,'C#5',.5,0.16],[26.5,'E5',.5,0.16],[27,'A5',.5,0.20],
      [27.5,'E5',.5,0.16],[28,'C#5',.5,0.15],[28.5,'A4',.5,0.15],
      [29,'E4',.5,0.14],[29.5,'C#4',.5,0.14],[30,'A3',.5,0.13],[30.5,'E3',.5,0.13],[31,'C#3',.5,0.12],[31.5,'A2',.5,0.12],
      // Bar 5: E major (return)
      [32,'E2',8,0.24],
      [32,'E4',.5,0.18],[32.5,'G#4',.5,0.17],[33,'B4',.5,0.17],[33.5,'E5',.5,0.19],
      [34,'G#5',.5,0.17],[34.5,'B5',.5,0.17],[35,'E6',.5,0.21],
      [35.5,'B5',.5,0.17],[36,'G#5',.5,0.16],[36.5,'E5',.5,0.16],
      [37,'B4',.5,0.15],[37.5,'G#4',.5,0.15],[38,'E4',.5,0.14],[38.5,'B3',.5,0.14],[39,'G#3',.5,0.13],[39.5,'E3',.5,0.13],
      // Bar 6: G#m (vi) — shadow before return
      [40,'G#2',8,0.21],
      [40,'G#3',.5,0.15],[40.5,'B3',.5,0.14],[41,'D#4',.5,0.14],[41.5,'G#4',.5,0.16],
      [42,'B4',.5,0.15],[42.5,'D#5',.5,0.15],[43,'G#5',.5,0.18],
      [43.5,'D#5',.5,0.15],[44,'B4',.5,0.14],[44.5,'G#4',.5,0.14],
      [45,'D#4',.5,0.13],[45.5,'B3',.5,0.13],[46,'G#3',.5,0.12],[46.5,'D#3',.5,0.12],[47,'B2',.5,0.11],[47.5,'G#2',.5,0.11],
    ]
  },
];

let _musicReady   = false;
let _musicPlaying = false;
let _musicIdx     = 0;
let _musicPart    = null;
let _musicSynth   = null;
let _musicReverb  = null;
let _musicVol     = null;

async function _initMusic() {
  if (_musicReady) return;
  if (typeof Tone === 'undefined') { toast('⚠ Music engine unavailable'); return; }
  await Tone.start();
  _musicReverb = new Tone.Reverb({ decay: 5.5, preDelay: 0.04, wet: 0.62 });
  await _musicReverb.generate();
  _musicVol = new Tone.Volume(-10).toDestination();
  _musicSynth = new Tone.PolySynth(Tone.Synth, {
    maxPolyphony: 28,
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.14, decay: 0.6, sustain: 0.55, release: 4.5 }
  });
  _musicSynth.connect(_musicReverb);
  _musicReverb.connect(_musicVol);
  // Initial volume from slider
  const vol = document.getElementById('music-vol');
  if (vol) setMusicVol(vol.value);
  _musicReady = true;
}

async function _playPiece() {
  await _initMusic();
  if (!_musicReady) return;

  const p   = CLASSICAL_PIECES[_musicIdx];
  const spb = 60 / p.bpm;

  // Reconfigure synth for this piece's articulation
  _musicSynth.set({
    envelope: { attack: p.atk, decay: 0.6, sustain: 0.55, release: p.rel }
  });

  // Tear down existing part
  if (_musicPart) { _musicPart.stop(); _musicPart.dispose(); _musicPart = null; }
  Tone.Transport.stop();
  Tone.Transport.cancel();

  const evts = p.events.map(([bt, n, d, v]) => [
    bt * spb,
    { notes: Array.isArray(n) ? n : [n], dur: d * spb, vel: v }
  ]);

  _musicPart = new Tone.Part((time, ev) => {
    _musicSynth.triggerAttackRelease(ev.notes, ev.dur, time, ev.vel);
  }, evts);
  _musicPart.loop    = true;
  _musicPart.loopEnd = p.loopBeats * spb;
  _musicPart.start(0);

  Tone.Transport.start();
  _musicPlaying = true;
  _updateMusicUI();
}

function _stopMusic() {
  if (_musicPart) { _musicPart.stop(); _musicPart.dispose(); _musicPart = null; }
  if (typeof Tone !== 'undefined' && Tone.Transport) { Tone.Transport.stop(); Tone.Transport.cancel(); }
  _musicPlaying = false;
  _updateMusicUI();
}

function _updateMusicUI() {
  const p    = CLASSICAL_PIECES[_musicIdx];
  const btn  = document.getElementById('mPlayBtn');
  const pulse = document.getElementById('mpulse');
  const title = document.getElementById('music-title');
  const sub   = document.getElementById('music-sub');
  if (!btn) return;
  title.title = `${p.name} · ${p.composer}`;
  btn.setAttribute('aria-pressed', String(_musicPlaying));
  if (_musicPlaying) {
    btn.textContent = 'Pause music';
    btn.classList.add('on');
    pulse.classList.add('on');
    title.textContent = p.name;
    sub.textContent = `${p.composer} (${p.year}) · synthesized piano`;
  } else {
    btn.textContent = 'Play music';
    btn.classList.remove('on');
    pulse.classList.remove('on');
    title.textContent = p.name;
    sub.textContent = `${p.composer} · synthesized piano`;
  }
}

window.toggleMusic = function () {
  if (_musicPlaying) _stopMusic(); else playMusicSafely();
};
window.musicPrev = function () {
  const wrap = CLASSICAL_PIECES.length;
  _musicIdx  = ((_musicIdx - 1 + wrap) % wrap);
  if (_musicPlaying) playMusicSafely(); else _updateMusicUI();
};
window.musicNext = function () {
  _musicIdx = (_musicIdx + 1) % CLASSICAL_PIECES.length;
  if (_musicPlaying) playMusicSafely(); else _updateMusicUI();
};
window.setMusicVol = function (v) {
  if (!_musicVol) return;
  _musicVol.volume.value = parseFloat(v) < 0.02 ? -80 : Tone.gainToDb(parseFloat(v));
};

// Initialize title display
_updateMusicUI();

// ── Admin Panel ─────────────────────────────────────────────────────────────
const $admin       = document.getElementById('admin-panel');
const $adminList   = document.getElementById('admin-fish-list');
const $adminStatus = document.getElementById('admin-status');

function openAdmin() {
  renderAdminList();
  if (!previewMode) $admin.showModal();
  else toast('The preview tank is local. Connect to the class tank to manage fish.');
}
window.closeAdmin = function () { $admin.close(); };

const ROLE_BADGE = {
  fish:   { cls: 'role-badge-fish',   label: '🐟 Fish'       },
  bottom: { cls: 'role-badge-bottom', label: '🦀 Bottom'     },
  wall:   { cls: 'role-badge-wall',   label: '🐌 Wall'       },
  eel:    { cls: 'role-badge-eel',    label: '🐍 Eel'        },
  jelly:  { cls: 'role-badge-jelly',  label: '🪼 Jellyfish'  },
};

function renderAdminList() {
  $adminList.innerHTML = '';
  if (fishes.length === 0) {
    $adminList.innerHTML = '<div class="resident-empty">No creatures in the tank</div>';
  } else {
    fishes.forEach(fish => {
      const role = fish.data.role || 'fish';
      const rb   = ROLE_BADGE[role] || ROLE_BADGE.fish;
      const row  = document.createElement('div');
      row.className = 'admin-fish-row';
      row.id = `admin-row-${fish.data.id}`;
      const swatch = document.createElement('div');
      swatch.className = 'admin-fish-swatch';
      swatch.style.background = fish.data.color;
      const name = document.createElement('div');
      name.className = 'admin-fish-name';
      name.textContent = fish.data.name;
      const meta = document.createElement('div');
      meta.className = 'admin-fish-meta';
      meta.textContent = `size ${fish.data.size}${fish.data.model ? ' · model' : ''}`;
      const roleButton = document.createElement('button');
      roleButton.className = `role-badge ${rb.cls}`;
      roleButton.textContent = rb.label;
      roleButton.title = `Change role for ${fish.data.name}`;
      roleButton.addEventListener('click', () => window.cycleCreatureRole(fish.data.id));
      const removeButton = document.createElement('button');
      removeButton.className = 'admin-remove-btn';
      removeButton.textContent = 'Remove';
      removeButton.setAttribute('aria-label', `Remove ${fish.data.name}`);
      removeButton.addEventListener('click', () => window.removeFishById(fish.data.id));
      row.append(swatch, name, meta, roleButton, removeButton);
      $adminList.appendChild(row);
    });
  }
  $adminStatus.textContent = `${fishes.length} creatures in tank · Esc to close`;
}

function updateCount() {
  const count = fishes.length;
  $count.textContent = `${count} ${count === 1 ? 'resident' : 'residents'}`;
  document.getElementById('resident-count').textContent = count;
  $feedBtn.disabled = isFeeding || isCleaning || count === 0;
  document.getElementById('empty-tank').hidden = count > 0;
  if (residentsPanel.open) renderResidents();
  if ($admin.open) renderAdminList();
}

function removeFishVisually(id) {
  const index = fishes.findIndex(fish => fish.data.id === id);
  if (index < 0) return;
  const fish = fishes[index];
  if (selectedFish === fish) closeCard();
  scene.remove(fish.group);
  disposeObject(fish.group);
  fishes.splice(index, 1);
  updateCount();
  renderFrame();
}

window.removeFishById = async function (id) {
  if (previewMode) return;
  try { await window.__db.ref('fish/' + id).remove(); }
  catch { toast('The fish could not be removed. Check your connection and try again.'); }
};

window.cycleCreatureRole = async function (id) {
  const fish = fishes.find(f => f.data.id === id);
  if (!fish || previewMode) return;
  const roles = ['fish', 'bottom', 'wall', 'eel', 'jelly'];
  const next = roles[(roles.indexOf(fish.data.role || 'fish') + 1) % roles.length];
  try { await window.__db.ref('fish/' + id + '/role').set(next); }
  catch { toast('The role could not be changed. Check your connection and try again.'); }
};

window.clearDuplicates = async function () {
  if (previewMode) return;
  const seen = new Set();
  const toRemove = [];
  fishes.forEach(f => {
    const key = f.data.name.toLowerCase().trim();
    if (seen.has(key)) toRemove.push(f.data.id);
    else seen.add(key);
  });
  if (toRemove.length === 0) { toast('✅ No duplicate names found!'); return; }
  const changes = Object.fromEntries(toRemove.map(id => [id, null]));
  try { await window.__db.ref('fish').update(changes); toast('Duplicate names removed.'); }
  catch { toast('Duplicates could not be removed. Try again when connected.'); }
};

window.resetToDefault = async function () {
  if (previewMode) return;
  if (!confirm('Reset the tank to default fish? All student fish will be removed.')) return;
  const fishRef = window.__db.ref('fish');
  const replacements = Object.fromEntries(DEFAULTS.map(d => [fishRef.push().key, d]));
  try {
    await fishRef.set(replacements);
    closeAdmin();
    toast('Tank reset to default fish.');
  } catch { toast('The tank could not be reset. Check your connection and try again.'); }
};


// Secret key sequence: type ADMIN (uppercase letters) to open admin panel
let _seq = '';
document.addEventListener('keydown', e => {
  if ($admin.open) { if (e.key === 'Escape') closeAdmin(); return; }
  if (document.getElementById('systems-panel').open) {
    if (e.key === 'Escape') closeSystems();
    return;
  }
  if (document.querySelector('dialog[open]') || e.target.closest('input, textarea, select, [contenteditable]') || e.ctrlKey || e.altKey || e.metaKey) return;
  _seq = (_seq + e.key.toUpperCase()).slice(-5);
  if (_seq === 'ADMIN') { _seq = ''; openAdmin(); }
});

// ═══════════════════════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════════════════════

let toastTimer;
function toast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $toast.classList.remove('show'), 3600);
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER LOOP
// ═══════════════════════════════════════════════════════════════════════════

let nextLabelLayout = 0;
function renderFrame() {
  if (!renderer || !camera || !labelRenderer) return;
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  const now = performance.now();
  if (paused || now >= nextLabelLayout) {
    nextLabelLayout = now + 150;
    const occupied = [];
    const sorted = [...fishes].sort((a, b) => (b === selectedFish) - (a === selectedFish) || b.group.position.z - a.group.position.z);
    sorted.forEach(fish => fish.group.traverse(child => {
      if (!child.isCSS2DObject) return;
      const bounds = child.element.getBoundingClientRect();
      const overlaps = occupied.some(other => bounds.left < other.right + 4 && bounds.right > other.left - 4 && bounds.top < other.bottom + 4 && bounds.bottom > other.top - 4);
      child.element.classList.toggle('label-overlap', overlaps && fish !== selectedFish);
      if (!overlaps) occupied.push(bounds);
    }));
  }
}

function animate() {
  let accumulator = 0;
  animationLoop = SimKit.loop(dt => {
    updateCare(dt);
    accumulator += Math.min(dt, .05);
    // Existing swim physics use 60 Hz steps, independent of display refresh rate.
    while (accumulator >= 1 / 60) {
      accumulator -= 1 / 60;
      simulationTime += 1 / 60;
      updateFishes(simulationTime);
      updateFood();
      updateBubbles();
      updateDirt();
      updatePlankton();
      updateSeaweeds(simulationTime);
      updateAnemones(simulationTime);
      updateSystems(1 / 60);
      if (Math.random() < .022) spawnBubbles(-5, -BOUNDS.y, -1);
      if (Math.random() < .015) spawnBubbles(6, -BOUNDS.y, -.5);
    }
    renderFrame();
  }, { el: $canvas });
  setPaused(paused);
}

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// ── Firebase ───────────────────────────────────────────────────────────────
const DEFAULTS = [
  { name: 'Bubbles', color: '#4FC3F7', size: 1.0 },
  { name: 'Coral',   color: '#FF7043', size: 0.9 },
  { name: 'Finn',    color: '#66BB6A', size: 1.1 },
  { name: 'Pearl',   color: '#CE93D8', size: 0.85 },
  { name: 'Neptune', color: '#FFD54F', size: 1.2 },
];

const ROLE_DETAILS = {
  fish: { label: 'Swimmer', description: 'Watch me explore the open water and chase a bite to eat.' },
  bottom: { label: 'Bottom feeder', description: 'Look along the sand. I wait for food to drift down to me.' },
  wall: { label: 'Wall crawler', description: 'Slow down and look at the edges. I like to explore the glass.' },
  eel: { label: 'Eel', description: 'Follow my winding path as I weave close to the bottom.' },
  jelly: { label: 'Jellyfish', description: 'Watch my bell gently pulse as I drift through the water.' },
};

function applyNames() {
  $labels.classList.toggle('names-hidden', !namesVisible);
  document.getElementById('namesBtn').setAttribute('aria-pressed', String(namesVisible));
}
document.getElementById('namesBtn').addEventListener('click', () => {
  namesVisible = !namesVisible;
  try { localStorage.setItem('class-tank-names', namesVisible ? 'on' : 'off'); } catch {}
  applyNames();
});

function setPaused(value) {
  paused = value;
  const button = document.getElementById('pauseBtn');
  button.setAttribute('aria-pressed', String(paused));
  button.textContent = paused ? 'Resume' : 'Pause';
  button.setAttribute('aria-label', paused ? 'Resume aquarium motion' : 'Pause aquarium motion');
  if (paused) animationLoop?.pause();
  else animationLoop?.resume();
  renderFrame();
}
document.getElementById('pauseBtn').addEventListener('click', () => setPaused(!paused));
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => setPaused(event.matches));

function closeCard() {
  const restoreFocus = $card.contains(document.activeElement);
  $card.hidden = true;
  if (restoreFocus) (cardReturnFocus?.isConnected ? cardReturnFocus : document.getElementById('residentsBtn'))?.focus({ preventScroll: true });
  selectedFish = null;
  document.getElementById('scene-hint').hidden = false;
  fishes.forEach(f => f.group.traverse(child => {
    if (child.isCSS2DObject) child.element.classList.remove('selected');
  }));
}
document.getElementById('fish-card-close').addEventListener('click', closeCard);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !document.querySelector('dialog[open]')) closeCard();
});

const residentsPanel = document.getElementById('residents-panel');
const residentSearch = document.getElementById('resident-search');
document.getElementById('residentsBtn').addEventListener('click', () => {
  residentSearch.value = '';
  renderResidents();
  residentsPanel.showModal();
  residentSearch.focus();
});
document.getElementById('residents-close').addEventListener('click', () => residentsPanel.close());
residentSearch.addEventListener('input', renderResidents);
function renderResidents() {
  const list = document.getElementById('residents-list');
  const query = residentSearch.value.trim().toLocaleLowerCase();
  list.replaceChildren();
  const matches = fishes.filter(f => f.data.name.toLocaleLowerCase().includes(query));
  matches.sort((a, b) => a.data.name.localeCompare(b.data.name)).forEach(fish => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'resident';
    const swatch = document.createElement('span');
    swatch.className = 'resident-swatch';
    swatch.style.background = fish.data.color;
    swatch.setAttribute('aria-hidden', 'true');
    const copy = document.createElement('span');
    copy.className = 'resident-copy';
    const name = document.createElement('span');
    name.className = 'resident-name';
    name.textContent = fish.data.name;
    const role = document.createElement('span');
    role.className = 'resident-role';
    role.textContent = `${ROLE_DETAILS[fish.data.role]?.label || 'Swimmer'}${fish.data.model ? ' · Student 3D design' : ''}`;
    copy.append(name, role);
    button.append(swatch, copy);
    button.addEventListener('click', () => { residentsPanel.close(); showCard(fish); });
    list.appendChild(button);
  });
  if (!matches.length) {
    const empty = document.createElement('p');
    empty.className = 'resident-empty';
    empty.textContent = fishes.length ? 'No fish with that name. Try another search.' : 'Your first fish could be the start. Choose Add a fish to join the tank.';
    list.appendChild(empty);
  }
  document.getElementById('residents-note').textContent = previewMode ? 'Sample fish in a local preview. Your class fish appear when connected.' : 'Choose a fish to see its details in the tank.';
}

for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
}
document.getElementById('reconnectBtn').addEventListener('click', () => location.reload());
function setConnection(text, mode) {
  const status = document.getElementById('connection-status');
  status.textContent = text;
  status.parentElement.dataset.mode = mode;
  document.getElementById('reconnectBtn').hidden = mode === 'live';
}
function finishLoading() {
  window.__clearTankLoadTimer?.();
  $loading.classList.add('gone');
  // Keep the status node available if WebGL context is lost later.
  $loading.setAttribute('aria-hidden', 'true');
  $loading.inert = true;
  $cleanBtn.disabled = isCleaning;
  updateCount();
  renderFrame();
}

// Every loaded object owns its geometry/materials. Release GPU memory on removal.
function disposeObject(object) {
  const resources = new Set();
  object.traverse(child => {
    if (child.isCSS2DObject) child.element.remove();
    if (child.geometry) resources.add(child.geometry);
    const materials = child.material ? (Array.isArray(child.material) ? child.material : [child.material]) : [];
    materials.forEach(material => {
      resources.add(material);
      Object.values(material).forEach(value => { if (value?.isTexture) resources.add(value); });
    });
  });
  resources.forEach(resource => resource.dispose());
}
function loadModel(loader, url) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const timeout = setTimeout(() => {
      finished = true;
      reject(new Error('Model load timed out'));
    }, 8000);
    loader.load(url, result => {
      clearTimeout(timeout);
      if (finished) {
        if (result.scene) disposeObject(result.scene);
        else result.dispose?.();
        return;
      }
      finished = true;
      resolve(result);
    }, undefined, error => {
      clearTimeout(timeout);
      if (!finished) { finished = true; reject(error); }
    });
  });
}

const desiredFish = new Map();
function normalizeFish(data) {
  return {
    id: String(data.id),
    name: (typeof data.name === 'string' && data.name.trim() ? data.name.trim() : 'Class fish').slice(0, 60),
    color: /^#[\da-f]{6}$/i.test(data.color) ? data.color : '#4FC3F7',
    size: clamp(Number(data.size) || 1, .35, 2),
    role: Object.hasOwn(ROLE_DETAILS, data.role) ? data.role : 'fish',
    model: typeof data.model === 'string' ? data.model : null,
    modelType: data.modelType === 'glb' ? 'glb' : 'stl',
    dots: data.dots || null,
  };
}
async function reconcileFish(records) {
  const next = new Map(records.map(record => { const data = normalizeFish(record); return [data.id, data]; }));
  for (const id of desiredFish.keys()) {
    if (!next.has(id)) { desiredFish.delete(id); removeFishVisually(id); }
  }
  const spawns = [];
  for (const [id, data] of next) {
    const previous = desiredFish.get(id);
    if (previous && JSON.stringify(previous) === JSON.stringify(data)) continue;
    desiredFish.set(id, data);
    removeFishVisually(id);
    spawns.push(spawnFish(data, () => desiredFish.get(id) === data).catch(error => {
      console.warn('Could not display a fish:', error);
    }));
  }
  await Promise.all(spawns);
  updateCount();
  renderFrame();
}

let musicStarting = false;
async function playMusicSafely() {
  if (musicStarting) return;
  musicStarting = true;
  const button = document.getElementById('mPlayBtn');
  button.disabled = true;
  try { await _playPiece(); }
  catch { _stopMusic(); toast('Music could not start. Try Play music again.'); }
  finally { musicStarting = false; button.disabled = false; }
}

// Read-only viewing never seeds or overwrites the shared class tank.
async function main() {
  initScene();
  buildEnvironment();
  setDirtiness(0);
  applyNames();
  animate();
  renderFrame();

  let hasLiveSnapshot = false;
  let previewStarted = false;
  const showPreview = async () => {
    if (hasLiveSnapshot || previewStarted) return;
    previewStarted = true;
    previewMode = true;
    setConnection('Preview tank · sample fish', 'preview');
    await reconcileFish(DEFAULTS.map((data, i) => ({ ...data, id: `preview-${i}` })));
    if (!hasLiveSnapshot) finishLoading();
  };
  const fallbackTimer = setTimeout(showPreview, 6000);
  if (window.__tankBootstrapError || !window.__db) {
    clearTimeout(fallbackTimer);
    await showPreview();
    return;
  }

  const fishRef = window.__db.ref('fish');
  // One snapshot subscription reconciles additions, edits, removals, and re-added IDs.
  fishRef.on('value', async snapshot => {
    hasLiveSnapshot = true;
    clearTimeout(fallbackTimer);
    const wasPreview = previewMode;
    previewMode = false;
    const data = [];
    snapshot.forEach(child => data.push({ ...child.val(), id: child.key }));
    setConnection('Class tank · live', 'live');
    await reconcileFish(data);
    finishLoading();
    if (wasPreview) toast('Connected. These are your class fish.');
  }, () => {
    clearTimeout(fallbackTimer);
    if (!hasLiveSnapshot) showPreview();
    else setConnection('Class tank · connection unavailable', 'offline');
  });
  window.__db.ref('.info/connected').on('value', snapshot => {
    if (hasLiveSnapshot) setConnection(snapshot.val() ? 'Class tank · live' : 'Class tank · reconnecting…', snapshot.val() ? 'live' : 'offline');
  });
}

main().catch(error => {
  console.error('Fish tank startup failed:', error);
  window.showTankLoadError?.('This device could not start the 3D aquarium. Try reloading, or return to ClassroomOS using Home.');
});
