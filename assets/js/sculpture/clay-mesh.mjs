import { THREE, DRACOLoader, GLTFLoader, MeshoptDecoder } from '../../vendor/three-bundle.min.js';
import { bounds, cleanTriangles, edgeReport, orientOutward, placeOnBed, yUpToZUp } from '../fab-io.mjs';
import { potProfile, volumeMesh } from './clay-core.mjs';

export const MAX_TRIANGLES = 150000;

export function potGeometry(pot) {
  const { profile, wobble } = potProfile(pot);
  const geometry = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 112);
  const p = geometry.attributes.position;
  if (wobble || pot.pinches.length) {
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const angle = Math.atan2(x, z);
      const local = pot.pinches.reduce((sum, mark) => {
        const vertical = (y / pot.height - mark.at) / mark.range;
        const angular = 1 - Math.cos(angle - mark.angle);
        return sum + mark.depth * Math.exp(-2.2 * vertical ** 2 - 5 * angular);
      }, 0);
      const factor = 1 + wobble * (0.52 * Math.cos(angle + y) + 0.26 * Math.sin(3 * angle + y * 2)) +
        Math.max(-0.26, Math.min(0.26, local));
      p.setXYZ(i, x * factor, y, z * factor);
    }
    geometry.computeVertexNormals();
  }
  return geometry;
}

export function clayGeometry(field, precise = false) {
  const surface = volumeMesh(field, precise);
  if (!surface) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(surface.positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(surface.normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(surface.index, 1));
  return geometry;
}

function triangles(geometry) {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  const result = Float32Array.from(flat.attributes.position.array);
  if (flat !== geometry) flat.dispose();
  return result;
}


export async function readGlb(buffer) {
  const view = new DataView(buffer);
  if (view.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67) throw new Error('Choose a self-contained GLB file.');
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)));
  if ([...(json.images || []), ...(json.buffers || [])].some(item => item.uri && !item.uri.startsWith('data:'))) {
    throw new Error('Choose a self-contained GLB with embedded geometry and images.');
  }
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const draco = new DRACOLoader().setDecoderPath(new URL('../../vendor/draco/', import.meta.url).href);
  loader.setDRACOLoader(draco);
  let scene;
  try {
    ({ scene } = await loader.parseAsync(buffer, ''));
  } finally {
    draco.dispose();
  }
  scene.updateMatrixWorld(true);
  const soup = [];
  const point = new THREE.Vector3();
  try {
    scene.traverseVisible(object => {
      if (!object.isMesh) return;
      const { geometry, matrixWorld } = object;
      const attribute = geometry.attributes.position;
      const index = geometry.index;
      const count = index ? index.count : attribute.count;
      if (soup.length / 9 + count / 3 > MAX_TRIANGLES) throw new Error('Simplify the model to 150,000 triangles or fewer and try again.');
      if (object.isInstancedMesh) throw new Error('Apply the instances in your 3D editor before exporting the GLB.');
      for (let i = 0; i < count; i++) {
        point.fromBufferAttribute(attribute, index ? index.getX(i) : i).applyMatrix4(matrixWorld);
        soup.push(point.x, point.y, point.z);
      }
    });
    if (!soup.length) throw new Error('This GLB has no mesh surface.');
    return { positions: Float32Array.from(soup), up: 'y', mm: 1000 };
  } finally {
    scene.traverse(object => {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material) continue;
        for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
        material.dispose();
      }
    });
  }
}

export function prepareClayImport(data) {
  if (data.positions.length / 9 > MAX_TRIANGLES) throw new Error('Simplify the model to 150,000 triangles or fewer and try again.');
  const span = Math.max(...bounds(data.positions).size);
  const positions = cleanTriangles(data.positions, span * span * 1e-12);
  const printMesh = data.up === 'y' ? yUpToZUp(positions) : positions;
  if (!printMesh.length || !edgeReport(printMesh, span * 1e-6).watertight) {
    throw new Error('The model needs a closed surface with consistent face direction. Repair it in your 3D editor and try again.');
  }
  return { positions, heightMm: bounds(printMesh).size[2] * data.mm };
}

export function printableClay(geometry, heightMm) {
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const factor = heightMm / (max.y - min.y);
  const pos = triangles(geometry);
  for (let i = 0; i < pos.length; i++) pos[i] *= factor;
  return placeOnBed(orientOutward(cleanTriangles(yUpToZUp(pos))));
}

export function prepareClayExport(geometry, heightMm, field) {
  const printable = printableClay(geometry, heightMm);
  const edges = edgeReport(printable);
  const refined = field && !edges.watertight ? clayGeometry(field, true) : null;
  if (!refined) return { printable, edges, refined };
  const surface = printableClay(refined, heightMm);
  return { printable: surface, edges: edgeReport(surface), refined };
}

export async function clayGlb(geometry, sourceMaterial, heightMm, name) {
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const factor = heightMm / ((max.y - min.y) * 1000);
  const copy = geometry.clone();
  const material = sourceMaterial.clone();
  try {
    copy.translate(-(min.x + max.x) / 2, -min.y, -(min.z + max.z) / 2);
    copy.scale(factor, factor, factor);
    const mesh = new THREE.Mesh(copy, material);
    mesh.name = name;
    const { GLTFExporter } = await import('../../vendor/three-extras.min.js');
    return await new GLTFExporter().parseAsync(mesh, { binary: true });
  } finally {
    copy.dispose();
    material.dispose();
  }
}
