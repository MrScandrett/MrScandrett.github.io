import * as THREE from 'three';
import { SPAWN_FLAT_RADIUS, TERRAIN_SEGMENTS, WORLD_RADIUS } from '../../app/config.js';
import { createGeometryBatcher } from './meshMerge.js';

export function createTerrainSystem(scene) {
    function isInsideWorld(x, z, margin = 0) {
        return Math.hypot(x, z) <= WORLD_RADIUS - margin;
    }

    function randomPointInWorld(radius = WORLD_RADIUS - 2) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius;
        return {
            x: Math.cos(angle) * r,
            z: Math.sin(angle) * r
        };
    }

    function getTerrainHeight(x, z) {
        if (!isInsideWorld(x, z)) return -8;
        const dist = Math.hypot(x, z);
        if (dist < SPAWN_FLAT_RADIUS) return 0;

        const waves =
            Math.sin(x * 0.075) * 2.4 +
            Math.cos(z * 0.082) * 2.0 +
            Math.sin((x + z) * 0.045) * 1.5;
        const edgeFade = THREE.MathUtils.smoothstep(dist, WORLD_RADIUS * 0.68, WORLD_RADIUS);
        return waves * (1 - edgeFade * 0.65);
    }

    const terrainGeometry = new THREE.PlaneGeometry(
        WORLD_RADIUS * 2,
        WORLD_RADIUS * 2,
        TERRAIN_SEGMENTS,
        TERRAIN_SEGMENTS
    );
    const terrainPos = terrainGeometry.attributes.position;
    for (let i = 0; i < terrainPos.count; i++) {
        const x = terrainPos.getX(i);
        const z = terrainPos.getY(i);
        const y = isInsideWorld(x, z) ? getTerrainHeight(x, z) : -8;
        terrainPos.setZ(i, y);
    }
    terrainGeometry.computeVertexNormals();

    const terrainMaterial = new THREE.MeshStandardMaterial({
        color: 0x4d8b45,
        roughness: 0.95,
        metalness: 0.02,
        flatShading: true
    });
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);

    const treeTrunkMaterial = new THREE.MeshStandardMaterial({
        color: 0x6a452f,
        roughness: 0.96,
        metalness: 0.02
    });
    const treeBranchMaterial = new THREE.MeshStandardMaterial({
        color: 0x5c3d2a,
        roughness: 0.96,
        metalness: 0.02
    });
    const treeLeavesMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a7f36,
        roughness: 0.88,
        metalness: 0.0
    });

    const sceneryBatcher = createGeometryBatcher();

    function createTree(x, z) {
        const tree = new THREE.Group();
        const baseHeight = 4.2 + Math.random() * 3.6;
        const trunkBottom = 0.42 + Math.random() * 0.16;
        const trunkTop = trunkBottom * (0.45 + Math.random() * 0.1);

        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(trunkTop, trunkBottom, baseHeight, 12, 3),
            treeTrunkMaterial
        );
        trunk.position.y = baseHeight * 0.5;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        tree.add(trunk);

        const branchCount = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < branchCount; i++) {
            const branchLen = 1.2 + Math.random() * 1.4;
            const branchRadius = trunkTop * (0.45 + Math.random() * 0.2);
            const branch = new THREE.Mesh(
                new THREE.CylinderGeometry(branchRadius * 0.45, branchRadius, branchLen, 8, 1),
                treeBranchMaterial
            );
            const az = (i / branchCount) * Math.PI * 2 + Math.random() * 0.5;
            const y = baseHeight * (0.45 + Math.random() * 0.4);
            branch.position.set(Math.cos(az) * 0.35, y, Math.sin(az) * 0.35);
            branch.rotation.z = 0.85 + Math.random() * 0.35;
            branch.rotation.y = az;
            branch.castShadow = true;
            branch.receiveShadow = true;
            tree.add(branch);

            const leafCluster = new THREE.Mesh(
                new THREE.IcosahedronGeometry(0.8 + Math.random() * 0.45, 1),
                treeLeavesMaterial
            );
            leafCluster.position.set(
                branch.position.x + Math.cos(az) * (branchLen * 0.6),
                y + branchLen * 0.35,
                branch.position.z + Math.sin(az) * (branchLen * 0.6)
            );
            leafCluster.scale.set(
                1.0 + Math.random() * 0.45,
                0.8 + Math.random() * 0.5,
                1.0 + Math.random() * 0.45
            );
            leafCluster.castShadow = true;
            leafCluster.receiveShadow = true;
            tree.add(leafCluster);
        }

        const crownCount = 6 + Math.floor(Math.random() * 4);
        for (let i = 0; i < crownCount; i++) {
            const t = i / crownCount;
            const crown = new THREE.Mesh(
                new THREE.IcosahedronGeometry(1.05 + Math.random() * 0.5, 1),
                treeLeavesMaterial
            );
            const radius = (1.2 - t * 0.5) + Math.random() * 0.25;
            const angle = (i / crownCount) * Math.PI * 2 + Math.random() * 0.7;
            crown.position.set(
                Math.cos(angle) * radius * 0.7,
                baseHeight * (0.8 + t * 0.35),
                Math.sin(angle) * radius * 0.7
            );
            crown.scale.set(
                1.1 + Math.random() * 0.35,
                0.9 + Math.random() * 0.35,
                1.1 + Math.random() * 0.35
            );
            crown.castShadow = true;
            crown.receiveShadow = true;
            tree.add(crown);
        }

        tree.rotation.y = Math.random() * Math.PI * 2;
        tree.position.set(x, getTerrainHeight(x, z), z);
        sceneryBatcher.absorb(tree);
    }

    const grassMaterial = new THREE.MeshStandardMaterial({
        color: 0x2f9e44,
        roughness: 1.0,
        metalness: 0.0,
        side: THREE.DoubleSide
    });

    function createGrassPatch(x, z) {
        const patch = new THREE.Group();
        const height = 0.8 + Math.random() * 0.6;
        const width = 0.3 + Math.random() * 0.2;

        const blade1 = new THREE.Mesh(new THREE.PlaneGeometry(width, height), grassMaterial);
        blade1.position.y = height / 2;
        blade1.castShadow = true;
        patch.add(blade1);

        const blade2 = new THREE.Mesh(new THREE.PlaneGeometry(width, height), grassMaterial);
        blade2.position.y = height / 2;
        blade2.rotation.y = Math.PI / 2;
        blade2.castShadow = true;
        patch.add(blade2);

        patch.position.set(x, getTerrainHeight(x, z), z);
        sceneryBatcher.absorb(patch);
    }

    for (let i = 0; i < 40; i++) {
        const point = randomPointInWorld(WORLD_RADIUS - 3);
        if (Math.hypot(point.x, point.z) < 10) continue;
        createTree(point.x, point.z);
    }

    for (let i = 0; i < 260; i++) {
        const point = randomPointInWorld(WORLD_RADIUS - 1);
        if (Math.hypot(point.x, point.z) < 8) continue;
        createGrassPatch(point.x, point.z);
    }

    // ~800 tree parts and ~520 grass blades collapse into four merged meshes.
    sceneryBatcher.flush(scene);

    return {
        // Exposed so callers can raycast against the ground without walking
        // the whole scene graph.
        terrainMesh: terrain,
        WORLD_RADIUS,
        SPAWN_FLAT_RADIUS,
        isInsideWorld,
        randomPointInWorld,
        getTerrainHeight
    };
}
