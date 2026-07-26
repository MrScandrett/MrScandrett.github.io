import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

// Every model in the pack shares one flat colour atlas, so a single texture
// lookup per species is all the material needs. The atlas is a grid of solid
// patches — filtering it would bleed neighbouring colours across UV seams.
function loadAtlas(name) {
  const texture = textureLoader.load(`./textures/${name}.png`);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  // These atlases are loaded as plain images rather than through GLTFLoader, so
  // they keep the TextureLoader's default flipY — which is what the FBX-authored
  // UVs baked into the GLBs expect. Setting flipY = false scrambles every coat.
  return texture;
}

/**
 * Load one species and return a template group, normalised so that its longest
 * axis measures `fitLength` world units and its feet sit on y = 0. The source
 * files are wildly inconsistent in scale — the static animals are ~3 units
 * long, the skinned ones ~400 — so nothing can be positioned by hand.
 */
async function loadSpecies(name, { fitLength, tint }) {
  const gltf = await gltfLoader.loadAsync(`./models/${name}.glb`);
  const atlas = loadAtlas(name);

  const model = gltf.scene;
  const material = new THREE.MeshLambertMaterial({
    map: atlas,
    color: tint ?? 0xffffff,
  });

  model.traverse((child) => {
    if (!child.isMesh) return;
    child.material = material;
    child.castShadow = true;
    child.receiveShadow = true;
  });

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = fitLength / Math.max(size.x, size.y, size.z);
  model.scale.setScalar(scale);

  // The source meshes are not authored around their own origin — some sit
  // ~90 units off in X — so re-measure after scaling and pull the model back
  // to a predictable anchor: centred on X/Z, feet on y = 0. Without this every
  // animal renders far from the position the simulation thinks it occupies.
  const scaledBox = new THREE.Box3().setFromObject(model);
  const centre = scaledBox.getCenter(new THREE.Vector3());
  model.position.x -= centre.x;
  model.position.z -= centre.z;
  model.position.y -= scaledBox.min.y;

  // Wrap in a group so callers can rotate/position the animal without
  // disturbing the centring transform applied above.
  const template = new THREE.Group();
  template.add(model);
  template.userData.height = scaledBox.max.y - scaledBox.min.y;
  template.userData.material = material;
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
 * Clone a template for use as an individual animal. Materials are shared by
 * default; pass a tint to give this individual its own coat colour.
 */
export function spawnFrom(template, tint) {
  const instance = template.clone(true);
  if (tint !== undefined) {
    const material = template.userData.material.clone();
    material.color.setHex(tint);
    instance.traverse((child) => {
      if (child.isMesh) child.material = material;
    });
  }
  instance.userData.height = template.userData.height;
  return instance;
}
