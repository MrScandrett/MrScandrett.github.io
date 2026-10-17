/* export.mjs — Workbench to game engines and other 3D apps.
 *
 * GLB is built the way engines expect it: Y-up, metres, one node per shape
 * and group (so pivots survive), holes already cut, and the loop as a glTF
 * animation sampled at 30 fps. The project is Z-up in mm or m, so every
 * position, rotation, scale and vertex is converted with
 *   C = k · Rx(−90°)   (x, y, z) → k · (x, z, −y)
 * and node transforms become C · T · C⁻¹, which keeps the hierarchy exact.
 */

import { THREE } from '../../vendor/three-bundle.min.js';
import { GLTFExporter } from '../../vendor/three-extras.min.js';
import { PRESETS, applyPoint, samplePose, walk } from './model.mjs';
import { geometryFromSoup, materialFor } from './view.mjs';

const DEG = Math.PI / 180;
const Q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
const Qi = Q.clone().invert();
const FPS = 30;

const yUp = ([x, y, z], k) => [x * k, z * k, -y * k];
const yUpScale = ([x, y, z]) => [x, z, y];
function yUpQuat(rot) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0] * DEG, rot[1] * DEG, rot[2] * DEG, 'XYZ'));
  return Q.clone().multiply(q).multiply(Qi);
}

export const nodeName = (node) => `${String(node.name).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'part'}_${node.id}`;

/* evaluation result → THREE.Scene in glTF space + the animation clip. */
export function buildExportScene(project, result, { animate = true } = {}) {
  const k = (PRESETS[project.preset] || PRESETS.print).toMm / 1000;
  const pieces = new Map(result.pieces.map((p) => [p.id, p]));
  const scene = new THREE.Scene();
  const made = new Map();
  let meshes = 0;
  // groups that hold nothing solid (all holes) are left out
  const solidUnder = new Map();
  const hasSolid = (node) => {
    if (node.hole) return false;
    if (solidUnder.has(node.id)) return solidUnder.get(node.id);
    const v = node.type === 'group' ? node.children.some(hasSolid) : pieces.has(node.id);
    solidUnder.set(node.id, v);
    return v;
  };
  walk(project.objects, (node, parent) => {
    if (!hasSolid(node)) return true;
    const object = new THREE.Object3D();
    object.name = nodeName(node);
    object.position.set(...yUp(node.pos, k));
    object.quaternion.copy(yUpQuat(node.rot));
    object.scale.set(...yUpScale(node.scale));
    const holder = parent ? made.get(parent.id) : scene;
    holder.add(object);
    let inner = object;
    if (node.pivot.some((v) => v !== 0)) {
      inner = new THREE.Object3D();
      inner.name = `${object.name}_pivot`;
      inner.position.set(...yUp(node.pivot.map((v) => -v), k));
      object.add(inner);
    }
    made.set(node.id, inner);
    if (node.type === 'shape') {
      const piece = pieces.get(node.id);
      const src = piece.local, pos = new Float32Array(src.length);
      for (let i = 0; i < src.length; i += 3) [pos[i], pos[i + 1], pos[i + 2]] = yUp([src[i], src[i + 1], src[i + 2]], k);
      const mesh = new THREE.Mesh(geometryFromSoup(pos), materialFor(node.color, node.finish, null));
      mesh.name = `${object.name}_mesh`;
      mesh.material.name = `${node.name} ${node.finish}`;
      inner.add(mesh);
      meshes++;
    }
    return true;
  });

  const clips = [];
  const { duration, tracks } = project.animation;
  if (animate) {
    const out = [];
    const frames = Math.max(2, Math.round(duration * FPS) + 1);
    const times = Array.from({ length: frames }, (_, i) => (i / (frames - 1)) * duration);
    for (const [id, keys] of Object.entries(tracks)) {
      const node = findIn(project, id);
      if (!node || !hasSolid(node) || !keys.length) continue;
      const name = nodeName(node), p = [], q = [], s = [];
      let prev = null;
      for (const t of times) {
        const pose = samplePose(keys, t);
        p.push(...yUp(pose.pos, k));
        const quat = yUpQuat(pose.rot);
        if (prev && prev.dot(quat) < 0) quat.set(-quat.x, -quat.y, -quat.z, -quat.w);   // keep spins continuous
        q.push(quat.x, quat.y, quat.z, quat.w);
        prev = quat;
        s.push(...yUpScale(pose.scale));
      }
      out.push(new THREE.VectorKeyframeTrack(`${name}.position`, times, p), new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, q), new THREE.VectorKeyframeTrack(`${name}.scale`, times, s));
    }
    if (out.length) clips.push(new THREE.AnimationClip(project.name ? `${project.name} loop` : 'Loop', duration, out));
  }
  return { scene, clips, meshes };
}

function findIn(project, id) {
  let hit = null;
  walk(project.objects, (n) => { if (n.id === id) { hit = n; return false; } return true; });
  return hit;
}

export async function writeAnimatedGlb(project, result) {
  const { scene, clips, meshes } = buildExportScene(project, result);
  if (!meshes) throw new Error('There is nothing solid to export yet.');
  const exporter = new GLTFExporter();
  const glb = await exporter.parseAsync(scene, { binary: true, animations: clips, onlyVisible: false });
  scene.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  return { glb, animated: clips.length > 0 };
}

/* World-space bodies (Z-up mm) for fab-io's writeObj, one per shape. */
export function worldBodies(project, result) {
  const toMm = (PRESETS[project.preset] || PRESETS.print).toMm;
  const names = new Map();
  walk(project.objects, (n) => { names.set(n.id, n); });
  return result.pieces.map((piece) => {
    const node = names.get(piece.id);
    const src = piece.local, out = new Float32Array(src.length);
    for (let i = 0; i < src.length; i += 3) {
      const [x, y, z] = applyPoint(piece.world, [src[i], src[i + 1], src[i + 2]]);
      out[i] = x * toMm; out[i + 1] = y * toMm; out[i + 2] = z * toMm;
    }
    return { name: node?.name || piece.id, color: node?.color, positions: out };
  });
}
