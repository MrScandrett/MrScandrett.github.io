import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Scenery like trees and grass is built once and never moves, but every part
// used to be its own Mesh -- 40 trees came to ~800 draw calls on their own.
// These helpers let the generators keep building readable little Groups, then
// bake the whole batch down to one Mesh per material before anything renders.

export function createGeometryBatcher() {
    const byMaterial = new Map();

    // Collects every Mesh in `root` (which is never added to the scene) and
    // stores its geometry baked into the batch's shared coordinate space.
    function absorb(root) {
        root.updateMatrixWorld(true);
        root.traverse((node) => {
            if (!node.isMesh) return;
            // mergeGeometries needs matching attributes, and indexed and
            // non-indexed geometry can't be mixed, so flatten everything.
            const geometry = node.geometry.index
                ? node.geometry.toNonIndexed()
                : node.geometry.clone();
            geometry.applyMatrix4(node.matrixWorld);
            geometry.deleteAttribute('uv1');

            let bucket = byMaterial.get(node.material);
            if (!bucket) {
                bucket = [];
                byMaterial.set(node.material, bucket);
            }
            bucket.push(geometry);

            node.geometry.dispose();
        });
    }

    // Emits one Mesh per material into `parent` and drops the source geometry.
    function flush(parent) {
        const meshes = [];
        for (const [material, geometries] of byMaterial) {
            if (geometries.length === 0) continue;
            const merged = mergeGeometries(geometries, false);
            for (const geometry of geometries) geometry.dispose();
            if (!merged) continue;
            merged.computeBoundingSphere();
            const mesh = new THREE.Mesh(merged, material);
            parent.add(mesh);
            meshes.push(mesh);
        }
        byMaterial.clear();
        return meshes;
    }

    return { absorb, flush };
}
