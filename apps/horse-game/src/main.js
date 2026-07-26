import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const HORSE_MODEL_PATH = 'horse-riggedgame-ready/source/horse.glb';
const WINTER_SCENE_PATH = 'low-poly-winter-tree-pack/source/WINTER_TREE_PACK/SOURCE/WINTER_TREE_PACK.obj';
const WINTER_TEXTURE_PATH = 'low-poly-winter-tree-pack/textures/';

const MODEL_FACING_OFFSET = Math.PI;

const canvas = document.getElementById('game');
const loadingEl = document.getElementById('loading');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb6d4ec);
scene.fog = new THREE.Fog(0xb6d4ec, 60, 260);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 700);
camera.position.set(0, 5, 9);

const hemiLight = new THREE.HemisphereLight(0xcfe8ff, 0x8d9fb3, 1.1);
scene.add(hemiLight);

const ambient = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.15);
sun.position.set(45, 80, -28);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 220;
sun.shadow.camera.left = -95;
sun.shadow.camera.right = 95;
sun.shadow.camera.top = 95;
sun.shadow.camera.bottom = -95;
scene.add(sun);

const textureLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();
const objLoader = new OBJLoader();
const clock = new THREE.Clock();

const keysDown = new Set();

const state = {
  speed: 0,
  heading: Math.PI,
  cameraYaw: 0,
  cameraPitch: 0.34,
  cameraDistance: 8.7,
  dragging: false,
  worldRadius: 110,
};

const lookTarget = new THREE.Vector3();
const desiredCameraPos = new THREE.Vector3();
const tmpForward = new THREE.Vector3();
const yAxis = new THREE.Vector3(0, 1, 0);
const down = new THREE.Vector3(0, -1, 0);
const raycaster = new THREE.Raycaster();

let winterRoot = null;
let horseRig = null;
let horseVisual = null;
let horseMixer = null;
let activeAction = null;
const groundCollisionMeshes = [];

const horseActions = {
  idle: null,
  walk: null,
  run: null,
};

window.addEventListener('keydown', (event) => {
  keysDown.add(event.code);
});

window.addEventListener('keyup', (event) => {
  keysDown.delete(event.code);
});

canvas.addEventListener('mousedown', (event) => {
  if (event.button !== 0) {
    return;
  }

  state.dragging = true;
  canvas.dataset.lastX = String(event.clientX);
  canvas.dataset.lastY = String(event.clientY);
});

window.addEventListener('mouseup', () => {
  state.dragging = false;
});

window.addEventListener('mousemove', (event) => {
  if (!state.dragging) {
    return;
  }

  const prevX = Number(canvas.dataset.lastX || event.clientX);
  const prevY = Number(canvas.dataset.lastY || event.clientY);
  const dx = event.clientX - prevX;
  const dy = event.clientY - prevY;

  state.cameraYaw -= dx * 0.005;
  state.cameraPitch = THREE.MathUtils.clamp(state.cameraPitch - dy * 0.0035, 0.17, 0.62);

  canvas.dataset.lastX = String(event.clientX);
  canvas.dataset.lastY = String(event.clientY);
});

canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  state.cameraDistance = THREE.MathUtils.clamp(state.cameraDistance + event.deltaY * 0.012, 4.8, 15.5);
}, { passive: false });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

function setLoading(text) {
  loadingEl.textContent = text;
}

function hideLoading() {
  loadingEl.style.display = 'none';
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatProgress(event) {
  if (!event || !event.total) {
    return null;
  }
  const pct = Math.max(0, Math.min(100, (event.loaded / event.total) * 100));
  return `${pct.toFixed(0)}%`;
}

function withTimeout(promise, ms, label) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} loading timed out after ${Math.round(ms / 1000)}s`));
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
}

function loadTexture(name, srgb = false) {
  const texture = textureLoader.load(`${WINTER_TEXTURE_PATH}${name}`);
  if (srgb) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  return texture;
}

function createWinterMaterials() {
  const snowDiffuse = loadTexture('Snow_Diffuse.png', true);
  const snowNormal = loadTexture('Snow_Normal.png');
  const snowRoughness = loadTexture('Snow_Roughness.png');

  const meltDiffuse = loadTexture('Snow_Melting_Diffuse.png', true);
  const meltNormal = loadTexture('Snow_Melting_Normal.png');
  const meltRoughness = loadTexture('Snow_Melting_Roughness.png');

  const branchesDiffuse = loadTexture('Winter_Trees_Branches_Diffuse.png', true);
  const branchesNormal = loadTexture('Winter_Trees_Branches_Normal.png');
  const branchesRoughness = loadTexture('Winter_Trees_Branches_Roughness.png');
  const branchesOpacity = loadTexture('Winter_Trees_Branches_Opacity.png');

  const planesDiffuse = loadTexture('Winter_Trees_Planes_Difffuse.png', true);
  const planesNormal = loadTexture('Winter_Trees_Planes_Normal.png');
  const planesRoughness = loadTexture('Winter_Trees_Planes_Roughness.png');
  const planesOpacity = loadTexture('Winter_Trees_Planes_Opacity.png');

  return {
    Snow: new THREE.MeshStandardMaterial({
      map: snowDiffuse,
      normalMap: snowNormal,
      roughnessMap: snowRoughness,
      roughness: 0.88,
      metalness: 0.02,
    }),
    Snow_Melting: new THREE.MeshStandardMaterial({
      map: meltDiffuse,
      normalMap: meltNormal,
      roughnessMap: meltRoughness,
      roughness: 0.84,
      metalness: 0.03,
    }),
    Winter_Trees_Branches: new THREE.MeshStandardMaterial({
      map: branchesDiffuse,
      normalMap: branchesNormal,
      roughnessMap: branchesRoughness,
      alphaMap: branchesOpacity,
      transparent: true,
      alphaTest: 0.4,
      side: THREE.DoubleSide,
      roughness: 1,
      metalness: 0,
    }),
    Winter_Trees_Planes: new THREE.MeshStandardMaterial({
      map: planesDiffuse,
      normalMap: planesNormal,
      roughnessMap: planesRoughness,
      alphaMap: planesOpacity,
      transparent: true,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 1,
      metalness: 0,
    }),
  };
}

function createSnowField() {
  const diffuse = loadTexture('Snow_Diffuse.png', true);
  const normal = loadTexture('Snow_Normal.png');
  const rough = loadTexture('Snow_Roughness.png');

  diffuse.wrapS = diffuse.wrapT = THREE.RepeatWrapping;
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  rough.wrapS = rough.wrapT = THREE.RepeatWrapping;

  diffuse.repeat.set(48, 48);
  normal.repeat.set(48, 48);
  rough.repeat.set(48, 48);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 420, 1, 1),
    new THREE.MeshStandardMaterial({
      map: diffuse,
      normalMap: normal,
      roughnessMap: rough,
      roughness: 0.9,
      metalness: 0,
    })
  );

  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.position.y = -0.03;
  scene.add(ground);
}

function chooseClip(clips, regex) {
  return clips.find((clip) => regex.test(clip.name.toLowerCase())) || null;
}

function setAction(nextAction) {
  if (!nextAction || nextAction === activeAction) {
    return;
  }

  if (activeAction) {
    activeAction.fadeOut(0.25);
  }

  nextAction.reset().fadeIn(0.25).play();
  activeAction = nextAction;
}

async function loadWinterScene() {
  return new Promise((resolve, reject) => {
    const winterMaterials = createWinterMaterials();
    groundCollisionMeshes.length = 0;

    objLoader.load(
      WINTER_SCENE_PATH,
      (obj) => {
        obj.traverse((child) => {
          if (!child.isMesh) {
            return;
          }

          const sourceMaterial = Array.isArray(child.material) ? child.material[0] : child.material;
          const sourceName = sourceMaterial?.name || '';

          if (winterMaterials[sourceName]) {
            child.material = winterMaterials[sourceName].clone();
          }

          if (sourceName === 'Snow' || sourceName === 'Snow_Melting') {
            groundCollisionMeshes.push(child);
          }

          if (child.geometry.attributes.uv && !child.geometry.attributes.uv2) {
            child.geometry.setAttribute('uv2', child.geometry.attributes.uv);
          }

          child.castShadow = true;
          child.receiveShadow = true;
        });

        const bounds = new THREE.Box3().setFromObject(obj);
        const center = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3());

        obj.position.x -= center.x;
        obj.position.z -= center.z;
        obj.position.y -= bounds.min.y;

        const span = Math.max(size.x, size.z);
        const desiredSpan = 220;
        const scale = span > desiredSpan ? desiredSpan / span : 1;
        obj.scale.setScalar(scale);

        state.worldRadius = Math.max(45, (span * scale) * 0.45);

        winterRoot = obj;
        scene.add(obj);
        alignHorseToGround(true);

        resolve();
      },
      undefined,
      reject
    );
  });
}

async function loadHorse(onProgress = undefined) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      HORSE_MODEL_PATH,
      (gltf) => {
        horseRig = new THREE.Group();
        horseRig.position.set(0, 0, 0);
        horseRig.rotation.y = state.heading;

        horseVisual = gltf.scene;
        horseVisual.rotation.y = MODEL_FACING_OFFSET;

        const bounds = new THREE.Box3().setFromObject(horseVisual);
        const horseHeight = bounds.getSize(new THREE.Vector3()).y || 1;
        const targetHeight = 2.1;
        const scale = targetHeight / horseHeight;
        horseVisual.scale.setScalar(scale);

        const scaledBounds = new THREE.Box3().setFromObject(horseVisual);
        horseVisual.position.y -= scaledBounds.min.y;

        horseVisual.traverse((child) => {
          if (!child.isMesh) {
            return;
          }

          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material?.map) {
            child.material.map.colorSpace = THREE.SRGBColorSpace;
          }
        });

        horseRig.add(horseVisual);
        scene.add(horseRig);

        if (gltf.animations.length) {
          horseMixer = new THREE.AnimationMixer(horseVisual);
          const idleClip = chooseClip(gltf.animations, /idle|stand|breath/) || gltf.animations[0];
          const walkClip =
            chooseClip(gltf.animations, /walk|trot|pace/) || gltf.animations[Math.min(1, gltf.animations.length - 1)];
          const runClip = chooseClip(gltf.animations, /run|gallop|canter/) || walkClip;

          horseActions.idle = horseMixer.clipAction(idleClip);
          horseActions.walk = horseMixer.clipAction(walkClip);
          horseActions.run = horseMixer.clipAction(runClip);

          setAction(horseActions.idle);
        }

        resolve();
      },
      onProgress,
      reject
    );
  });
}

function createHorseFallback() {
  horseRig = new THREE.Group();
  horseRig.position.set(0, 0, 0);
  horseRig.rotation.y = state.heading;

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x7d593a, roughness: 0.85, metalness: 0.05 });
  const maneMat = new THREE.MeshStandardMaterial({ color: 0x2d2017, roughness: 0.95, metalness: 0 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1, 0.75), bodyMat);
  body.position.set(0, 1.4, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  horseRig.add(body);

  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.95, 0.45), bodyMat);
  neck.position.set(-0.85, 1.95, 0);
  neck.rotation.z = 0.18;
  neck.castShadow = true;
  neck.receiveShadow = true;
  horseRig.add(neck);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.45, 0.4), bodyMat);
  head.position.set(-1.25, 2.3, 0);
  head.castShadow = true;
  head.receiveShadow = true;
  horseRig.add(head);

  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.2), maneMat);
  mane.position.set(-0.65, 2.02, 0);
  mane.castShadow = true;
  horseRig.add(mane);

  const legGeo = new THREE.BoxGeometry(0.23, 1.22, 0.23);
  const legOffsets = [
    [-0.65, 0.61, -0.22],
    [0.65, 0.61, -0.22],
    [-0.65, 0.61, 0.22],
    [0.65, 0.61, 0.22],
  ];

  for (const [x, y, z] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, bodyMat);
    leg.position.set(x, y, z);
    leg.castShadow = true;
    leg.receiveShadow = true;
    horseRig.add(leg);
  }

  scene.add(horseRig);
  alignHorseToGround(true);
}

function sampleGroundHeight(x, z) {
  if (!groundCollisionMeshes.length) {
    return 0;
  }

  raycaster.set(new THREE.Vector3(x, 250, z), down);
  const hits = raycaster.intersectObjects(groundCollisionMeshes, false);
  if (!hits.length) {
    return 0;
  }

  return hits[0].point.y;
}

function alignHorseToGround(snap = false) {
  if (!horseRig) {
    return;
  }

  const targetY = sampleGroundHeight(horseRig.position.x, horseRig.position.z);
  if (snap) {
    horseRig.position.y = targetY;
    return;
  }

  horseRig.position.y = THREE.MathUtils.lerp(horseRig.position.y, targetY, 0.32);
}

function updateHorseMovement(delta) {
  if (!horseRig) {
    return;
  }

  const accelerate = keysDown.has('KeyW');
  const reverse = keysDown.has('KeyS');
  const turnLeft = keysDown.has('KeyA');
  const turnRight = keysDown.has('KeyD');

  const maxForward = 9.6;
  const maxReverse = -3.6;
  const acceleration = 16;
  const reverseAccel = 12;
  const drag = 10;
  const brake = 18;

  if (accelerate && !reverse) {
    state.speed += acceleration * delta;
  } else if (reverse && !accelerate) {
    state.speed -= reverseAccel * delta;
  } else {
    if (state.speed > 0) {
      state.speed = Math.max(0, state.speed - drag * delta);
    } else {
      state.speed = Math.min(0, state.speed + drag * delta);
    }
  }

  if ((accelerate && state.speed < 0) || (reverse && state.speed > 0)) {
    state.speed -= Math.sign(state.speed) * brake * delta;
  }

  state.speed = THREE.MathUtils.clamp(state.speed, maxReverse, maxForward);

  let steer = 0;
  if (turnLeft) {
    steer += 1;
  }
  if (turnRight) {
    steer -= 1;
  }

  if (steer !== 0) {
    const speedRatio = Math.min(Math.abs(state.speed) / maxForward, 1);
    const turnRate = THREE.MathUtils.lerp(1.7, 2.5, speedRatio);
    const reverseFactor = state.speed < 0 ? -1 : 1;
    state.heading += steer * turnRate * delta * reverseFactor;
  }

  horseRig.rotation.y = state.heading;

  tmpForward.set(0, 0, -1).applyAxisAngle(yAxis, state.heading);
  horseRig.position.addScaledVector(tmpForward, state.speed * delta);

  const radius = Math.hypot(horseRig.position.x, horseRig.position.z);
  if (radius > state.worldRadius) {
    const clamp = state.worldRadius / radius;
    horseRig.position.x *= clamp;
    horseRig.position.z *= clamp;
  }

  alignHorseToGround(false);

  const speedAbs = Math.abs(state.speed);
  if (horseMixer) {
    if (speedAbs < 0.25) {
      setAction(horseActions.idle);
    } else if (speedAbs < 5.2) {
      horseActions.walk.timeScale = THREE.MathUtils.clamp(speedAbs / 3, 0.75, 1.6);
      setAction(horseActions.walk);
    } else {
      horseActions.run.timeScale = THREE.MathUtils.clamp(speedAbs / 6.2, 0.85, 1.45);
      setAction(horseActions.run);
    }
  }
}

function updateCamera(delta) {
  if (!horseRig) {
    return;
  }

  const target = horseRig.position;
  lookTarget.set(target.x, target.y + 1.55, target.z);

  const followYaw = state.heading + state.cameraYaw;
  const dist = state.cameraDistance;
  const pitch = state.cameraPitch;

  const horizontalDistance = Math.cos(pitch) * dist;
  desiredCameraPos.set(
    lookTarget.x + Math.sin(followYaw) * horizontalDistance,
    lookTarget.y + Math.sin(pitch) * dist + 0.45,
    lookTarget.z + Math.cos(followYaw) * horizontalDistance
  );

  const blend = 1 - Math.exp(-delta * 7.5);
  camera.position.lerp(desiredCameraPos, blend);
  camera.lookAt(lookTarget);
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);

  updateHorseMovement(delta);
  updateCamera(delta);

  if (horseMixer) {
    horseMixer.update(delta);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

async function init() {
  try {
    createSnowField();
    setLoading('Loading horse...');
    await withTimeout(
      loadHorse((event) => {
        const progress = formatProgress(event);
        if (progress) {
          setLoading(`Loading horse... ${progress}`);
        }
      }),
      30000,
      'Horse'
    );
    alignHorseToGround(true);
    hideLoading();
    animate();

    loadWinterScene().catch((error) => {
      console.warn('Winter scene failed to load:', error);
    });
  } catch (error) {
    console.warn('Horse model failed to load, using fallback model:', error);
    createHorseFallback();
    setLoading('Horse load failed. Using fallback horse model.');
    animate();
    await wait(1400);
    hideLoading();

    loadWinterScene().catch((sceneError) => {
      console.warn('Winter scene failed to load:', sceneError);
    });
  }
}

init();
