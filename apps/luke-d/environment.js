import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function addEnvironment(scene, mapSize) {
    const obstacleCount = 50; // number of trees/rocks
    const obstacleMinDist = 5; // min distance from player spawn (0,0)

    const treeGeometry = new THREE.CylinderGeometry(0, 0.5, 2, 8);
    const treeMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });

    const rockGeometry = new THREE.DodecahedronGeometry(0.5);
    const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });

    for (let i = 0; i < obstacleCount; i++) {
        let obj;
        const isTree = Math.random() < 0.7;

        // Random position avoiding player spawn
        let x, z;
        do {
            x = (Math.random() - 0.5) * mapSize * 2;
            z = (Math.random() - 0.5) * mapSize * 2;
        } while (Math.sqrt(x * x + z * z) < obstacleMinDist);

        if (isTree) {
            obj = new THREE.Group();

            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.y = 0.5;
            trunk.castShadow = true;
            trunk.receiveShadow = true;

            const foliage = new THREE.Mesh(treeGeometry, treeMaterial);
            foliage.position.y = 1.5;
            foliage.castShadow = true;

            obj.add(trunk, foliage);
            obj.userData.radius = 1; // collision radius
        } else {
            obj = new THREE.Mesh(rockGeometry, rockMaterial);
            obj.position.y = 0.5;
            obj.castShadow = true;
            obj.receiveShadow = true;
            obj.userData.radius = 0.7;
        }

        obj.position.x = x;
        obj.position.z = z;
        obj.userData.isObstacle = true;

        scene.add(obj);
    }
}
