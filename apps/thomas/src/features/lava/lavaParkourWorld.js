import * as THREE from 'three';
import { PLAYER } from '../../app/config.js';

export function createLavaParkourWorld(scene) {
    const group = new THREE.Group();
    group.position.set(-140, 46, 0);
    group.visible = false;
    scene.add(group);

    const worldHalf = 30;
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x33291f, roughness: 0.86, metalness: 0.08 });
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x1d1b23, roughness: 0.92, metalness: 0.02 });
    const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x6f7a89, roughness: 0.74, metalness: 0.22 });
    const movingMaterial = new THREE.MeshStandardMaterial({ color: 0x86a3c4, roughness: 0.6, metalness: 0.32 });
    const checkpointMaterial = new THREE.MeshStandardMaterial({ color: 0x2dd4bf, roughness: 0.6, metalness: 0.2 });
    const finishMaterial = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.56, metalness: 0.3 });

    const baseFloor = new THREE.Mesh(new THREE.BoxGeometry(worldHalf * 2, 1, worldHalf * 2), floorMaterial);
    baseFloor.position.y = -8;
    baseFloor.receiveShadow = true;
    group.add(baseFloor);

    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(1, 64, worldHalf * 2), wallMaterial);
    wallLeft.position.set(-worldHalf, 20, 0);
    const wallRight = wallLeft.clone();
    wallRight.position.x = worldHalf;
    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(worldHalf * 2, 64, 1), wallMaterial);
    wallBack.position.set(0, 20, -worldHalf);
    const wallFront = wallBack.clone();
    wallFront.position.z = worldHalf;
    group.add(wallLeft, wallRight, wallBack, wallFront);

    const platforms = [];
    const movingPlatforms = [];

    function addPlatform(x, y, z, sx, sz, type = 'normal') {
        const material = type === 'checkpoint' ? checkpointMaterial :
            type === 'finish' ? finishMaterial : platformMaterial;
        const platform = new THREE.Mesh(new THREE.BoxGeometry(sx, 1, sz), material);
        platform.position.set(x, y, z);
        platform.castShadow = true;
        platform.receiveShadow = true;
        platform.userData.halfX = sx * 0.5;
        platform.userData.halfZ = sz * 0.5;
        platform.userData.type = type;
        group.add(platform);
        platforms.push(platform);
        return platform;
    }

    function addMovingPlatform(x, y, z, sx, sz, axis, amplitude, speed) {
        const platform = new THREE.Mesh(new THREE.BoxGeometry(sx, 1, sz), movingMaterial);
        platform.position.set(x, y, z);
        platform.castShadow = true;
        platform.receiveShadow = true;
        platform.userData.halfX = sx * 0.5;
        platform.userData.halfZ = sz * 0.5;
        platform.userData.baseX = x;
        platform.userData.baseY = y;
        platform.userData.baseZ = z;
        platform.userData.axis = axis;
        platform.userData.amplitude = amplitude;
        platform.userData.speed = speed;
        platform.userData.type = 'moving';
        group.add(platform);
        platforms.push(platform);
        movingPlatforms.push(platform);
        return platform;
    }

    addPlatform(0, 0, 22, 10, 10, 'start');
    addPlatform(9, 3.5, 15, 7, 7);
    addPlatform(-7, 6.5, 11, 7, 7);
    addMovingPlatform(12, 10, 6, 6, 6, 'x', 5.5, 1.8);
    addPlatform(-11, 13.5, 3, 6, 6);
    addMovingPlatform(8, 17, -1, 5, 5, 'z', 5.0, 2.1);
    const checkpointA = addPlatform(-10, 21, -5, 7, 7, 'checkpoint');
    addPlatform(-2, 25, -10, 5, 5);
    addMovingPlatform(10, 29, -14, 4.5, 4.5, 'x', 7.0, 2.2);
    addPlatform(-12, 33, -18, 4.5, 4.5);
    addMovingPlatform(2, 37, -21, 4.5, 4.5, 'z', 6.0, 2.35);
    const checkpointB = addPlatform(14, 41, -20, 6, 6, 'checkpoint');
    addPlatform(6, 45, -25, 5, 5);
    addPlatform(-6, 48, -26, 5, 5);
    const finishPlatform = addPlatform(0, 52, -24, 10, 10, 'finish');

    const lavaMaterial = new THREE.MeshStandardMaterial({
        color: 0xff4d21,
        emissive: 0xff2a00,
        emissiveIntensity: 1.2,
        roughness: 0.55,
        metalness: 0.0,
        transparent: true,
        opacity: 0.95
    });
    const lava = new THREE.Mesh(new THREE.BoxGeometry(worldHalf * 2 - 2, 1.3, worldHalf * 2 - 2), lavaMaterial);
    group.add(lava);

    const lavaStartY = -7.5;
    const lavaRiseSpeed = 1.55;
    let lavaElapsed = 0;
    lava.position.y = lavaStartY;

    const lavaLight = new THREE.PointLight(0xff5b21, 1.8, 120);
    lavaLight.position.set(0, lava.position.y + 3, 0);
    group.add(lavaLight);

    const checkpointMeshes = [checkpointA, checkpointB];
    const checkpointPositions = checkpointMeshes.map((cp) => new THREE.Vector3(
        group.position.x + cp.position.x,
        group.position.y + cp.position.y + PLAYER.STAND_HEIGHT + 0.8,
        group.position.z + cp.position.z
    ));
    const startSpawn = new THREE.Vector3(
        group.position.x,
        group.position.y + PLAYER.STAND_HEIGHT + 1.2,
        group.position.z + 22
    );
    let activeCheckpointIndex = -1;
    let finishReached = false;

    function setVisible(visible) {
        group.visible = visible;
    }

    function reset() {
        lavaElapsed = 0;
        lava.position.y = lavaStartY;
        lavaLight.position.y = lava.position.y + 3;
        activeCheckpointIndex = -1;
        finishReached = false;
    }

    function update(delta, timeSeconds) {
        lavaElapsed += delta;
        lava.position.y = lavaStartY + lavaElapsed * lavaRiseSpeed;
        lavaLight.position.y = lava.position.y + 3;
        lavaLight.intensity = 1.6 + Math.sin(timeSeconds * 4.2) * 0.35;

        for (let i = 0; i < movingPlatforms.length; i++) {
            const p = movingPlatforms[i];
            const offset = Math.sin(timeSeconds * p.userData.speed + i) * p.userData.amplitude;
            if (p.userData.axis === 'x') {
                p.position.x = p.userData.baseX + offset;
            } else {
                p.position.z = p.userData.baseZ + offset;
            }
        }

        for (let i = 0; i < checkpointMeshes.length; i++) {
            const cp = checkpointMeshes[i];
            if (i <= activeCheckpointIndex) {
                cp.material.emissive = new THREE.Color(0x34d399);
                cp.material.emissiveIntensity = 0.5;
            } else {
                cp.material.emissive = new THREE.Color(0x0);
                cp.material.emissiveIntensity = 0;
            }
        }
        finishPlatform.material.emissive = finishReached ? new THREE.Color(0xfef08a) : new THREE.Color(0);
        finishPlatform.material.emissiveIntensity = finishReached ? 0.8 : 0;
    }

    function getLavaY() {
        return group.position.y + lava.position.y + 0.65;
    }

    function constrainPlayer(player, velocity, currentHeight) {
        const minX = group.position.x - worldHalf + 1.5;
        const maxX = group.position.x + worldHalf - 1.5;
        const minZ = group.position.z - worldHalf + 1.5;
        const maxZ = group.position.z + worldHalf - 1.5;

        if (player.position.x < minX) {
            player.position.x = minX;
            velocity.x = 0;
        } else if (player.position.x > maxX) {
            player.position.x = maxX;
            velocity.x = 0;
        }
        if (player.position.z < minZ) {
            player.position.z = minZ;
            velocity.z = 0;
        } else if (player.position.z > maxZ) {
            player.position.z = maxZ;
            velocity.z = 0;
        }

        const minY = group.position.y - 9 + currentHeight;
        if (player.position.y < minY) {
            player.position.y = minY;
            velocity.y = 0;
        }
    }

    function resolvePlatformCollision(player, velocity, currentHeight) {
        let grounded = false;
        for (const p of platforms) {
            const px = group.position.x + p.position.x;
            const pyTop = group.position.y + p.position.y + 0.5;
            const pz = group.position.z + p.position.z;
            const dx = Math.abs(player.position.x - px);
            const dz = Math.abs(player.position.z - pz);
            if (dx > p.userData.halfX + 0.6 || dz > p.userData.halfZ + 0.6) continue;

            const topEyeY = pyTop + currentHeight;
            if (player.position.y >= pyTop - 3.4 && player.position.y < topEyeY + 1.2) {
                player.position.y = topEyeY;
                velocity.y = 0;
                grounded = true;
            }
        }
        return grounded;
    }

    function updateCheckpointState(playerPosition) {
        for (let i = 0; i < checkpointPositions.length; i++) {
            if (i <= activeCheckpointIndex) continue;
            if (playerPosition.distanceTo(checkpointPositions[i]) < 2.4) {
                activeCheckpointIndex = i;
            }
        }

        const finishPos = new THREE.Vector3(
            group.position.x + finishPlatform.position.x,
            group.position.y + finishPlatform.position.y + PLAYER.STAND_HEIGHT + 0.8,
            group.position.z + finishPlatform.position.z
        );
        if (playerPosition.distanceTo(finishPos) < 3.3) {
            finishReached = true;
        }
    }

    function getRespawnPosition() {
        if (activeCheckpointIndex >= 0) return checkpointPositions[activeCheckpointIndex].clone();
        return startSpawn.clone();
    }

    function didReachFinish() {
        return finishReached;
    }

    return {
        spawnPosition: startSpawn,
        setVisible,
        reset,
        update,
        getLavaY,
        constrainPlayer,
        resolvePlatformCollision,
        updateCheckpointState,
        getRespawnPosition,
        didReachFinish
    };
}
