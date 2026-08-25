import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

const fbxLoader = new FBXLoader();

// Recognised action names inside each source clip's name, e.g.
// "Armature|TRex_Walk" or "Armature|Triceratops_Attack".
const ACTION_KEYS = ['idle', 'walk', 'run', 'attack', 'death', 'jump'];

function classifyClip(clip) {
  const lower = clip.name.toLowerCase();
  return ACTION_KEYS.find((key) => lower.includes(key)) ?? null;
}

/**
 * Load one species and return a template group, normalised so that its
 * longest axis measures `fitLength` world units and its feet sit on y = 0.
 * Every FBX in this pack carries its own flat-colour materials baked in (no
 * image textures), so the only material work needed is swapping Phong for
 * Lambert so the low-poly shading matches the rest of the scene.
 */
async function loadSpecies(name, { fitLength }) {
  const fbx = await fbxLoader.loadAsync(`./models/${name}.fbx`);

  fbx.traverse((child) => {
    if (!child.isMesh) return;
    const wasArray = Array.isArray(child.material);
    const sourceMaterials = wasArray ? child.material : [child.material];
    const converted = sourceMaterials.map((mat) => {
      // FBXLoader reads each material's Kd straight into `color` without
      // converting colour space. Blender writes that diffuse value in linear
      // light, so taken at face value every dinosaur renders near-black —
      // converting to sRGB is what recovers the pack's intended palette.
      const color = mat.color ? mat.color.clone() : new THREE.Color(0xffffff);
      color.convertLinearToSRGB();
      return new THREE.MeshLambertMaterial({ color });
    });
    child.material = wasArray ? converted : converted[0];
    child.castShadow = true;
    child.receiveShadow = true;
  });

  const box = new THREE.Box3().setFromObject(fbx);
  const size = box.getSize(new THREE.Vector3());
  const scale = fitLength / Math.max(size.x, size.y, size.z);
  fbx.scale.setScalar(scale);

  const scaledBox = new THREE.Box3().setFromObject(fbx);
  const centre = scaledBox.getCenter(new THREE.Vector3());
  fbx.position.x -= centre.x;
  fbx.position.z -= centre.z;
  fbx.position.y -= scaledBox.min.y;

  const template = new THREE.Group();
  template.add(fbx);
  template.userData.height = scaledBox.max.y - scaledBox.min.y;

  const clipsByAction = {};
  for (const clip of fbx.animations) {
    const key = classifyClip(clip);
    if (key && !clipsByAction[key]) clipsByAction[key] = clip;
  }
  template.userData.clips = clipsByAction;

  return template;
}

export async function loadAllSpecies(specs, onProgress) {
  const names = Object.keys(specs);
  const templates = {};
  let done = 0;

  await Promise.all(
    names.map(async (name) => {
      templates[name] = await loadSpecies(name, specs[name]);
      done += 1;
      onProgress?.(done, names.length);
    })
  );

  return templates;
}

/**
 * Clone a template for use as an individual animal. Skinned meshes need
 * SkeletonUtils.clone rather than Object3D.clone — a plain clone shares the
 * source skeleton, so every instance would puppet the same bones and move
 * in lockstep.
 */
export function spawnFrom(template) {
  const mesh = cloneSkeleton(template);
  mesh.userData.height = template.userData.height;

  const mixer = new THREE.AnimationMixer(mesh);
  const actions = {};
  for (const [key, clip] of Object.entries(template.userData.clips)) {
    const action = mixer.clipAction(clip);
    if (key === 'death' || key === 'attack' || key === 'jump') {
      action.clampWhenFinished = true;
      action.loop = THREE.LoopOnce;
    }
    actions[key] = action;
  }

  const instance = { mesh, mixer, actions, current: null };
  if (actions.idle) playAction(instance, 'idle', 0);
  return instance;
}

/** Crossfade to a named action; a no-op if that species has no such clip. */
export function playAction(instance, name, fadeDuration = 0.25) {
  const next = instance.actions[name] ?? instance.actions.idle;
  if (!next || instance.current === next) return;

  next.reset().fadeIn(fadeDuration).play();
  if (instance.current) instance.current.fadeOut(fadeDuration);
  instance.current = next;
}
