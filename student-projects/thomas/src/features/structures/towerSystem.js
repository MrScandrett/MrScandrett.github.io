import * as THREE from 'three';

export function createTowerSystem(scene, getTerrainHeight, randomPointInWorld, worldRadius) {
    const towers = [];
    const ladders = [];
    const bridges = [];

    const towerGeometry = new THREE.BoxGeometry(10, 40, 10);
    const towerMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const ladderGeometry = new THREE.BoxGeometry(10, 40, 1);
    const ladderMaterial = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
    const bridgeMaterial = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9, metalness: 0.05 });

    function createTower(x, z) {
        const baseY = getTerrainHeight(x, z);
        const tower = new THREE.Mesh(towerGeometry, towerMaterial);
        tower.position.set(x, baseY + 20, z);
        tower.userData.baseY = baseY;
        tower.userData.topY = baseY + 40;
        tower.castShadow = true;
        tower.receiveShadow = true;
        scene.add(tower);
        towers.push(tower);

        const ladder = new THREE.Mesh(ladderGeometry, ladderMaterial);
        ladder.position.set(x, baseY + 20, z + 6);
        ladder.userData.halfWidth = 5;
        ladder.userData.halfDepth = 0.5;
        scene.add(ladder);
        ladders.push(ladder);
    }

    function createBridge(fromTower, toTower) {
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 6), bridgeMaterial);
        const dx = toTower.position.x - fromTower.position.x;
        const dz = toTower.position.z - fromTower.position.z;
        const distance = Math.hypot(dx, dz);
        const towerHalfWidth = 5;
        const spanLength = Math.max(2, distance - towerHalfWidth * 2);
        const bridgeTopY = Math.min(fromTower.position.y + 20, toTower.position.y + 20);

        bridge.scale.x = spanLength;
        bridge.position.set(
            (fromTower.position.x + toTower.position.x) * 0.5,
            bridgeTopY - 0.6,
            (fromTower.position.z + toTower.position.z) * 0.5
        );
        bridge.rotation.y = Math.atan2(dz, dx);
        bridge.castShadow = true;
        bridge.receiveShadow = true;

        bridge.userData.topY = bridgeTopY;
        bridge.userData.spanLength = spanLength;
        scene.add(bridge);
        bridges.push(bridge);
    }

    function spawnRandomTowers(count) {
        const maxAttempts = count * 60;
        let placed = 0;

        for (let attempt = 0; attempt < maxAttempts && placed < count; attempt++) {
            const p = randomPointInWorld(worldRadius - 30);
            if (Math.hypot(p.x, p.z) < 70) continue;

            let tooClose = false;
            for (const tower of towers) {
                const dist = Math.hypot(p.x - tower.position.x, p.z - tower.position.z);
                if (dist < 85) {
                    tooClose = true;
                    break;
                }
            }
            if (tooClose) continue;

            createTower(p.x, p.z);
            placed++;
        }
    }

    createTower(-30, -30);
    createTower(30, 30);
    createTower(-30, 30);
    createTower(30, -30);

    createBridge(towers[0], towers[3]);
    createBridge(towers[3], towers[1]);
    createBridge(towers[1], towers[2]);
    createBridge(towers[2], towers[0]);

    spawnRandomTowers(18);

    function getLadderAt(playerPos) {
        for (const ladder of ladders) {
            const dx = Math.abs(playerPos.x - ladder.position.x);
            const dz = Math.abs(playerPos.z - ladder.position.z);
            const withinX = dx <= ladder.userData.halfWidth + 1.0;
            const withinZ = dz <= ladder.userData.halfDepth + 1.2;
            const withinY = playerPos.y >= ladder.position.y - 21 && playerPos.y <= ladder.position.y + 21;
            if (withinX && withinZ && withinY) {
                return ladder;
            }
        }
        return null;
    }

    function resolvePlayerCollisions(player, velocity, currentHeight) {
        let groundedOnStructure = false;

        for (const tower of towers) {
            const minDist = 6;
            const dx = Math.abs(player.position.x - tower.position.x);
            const dz = Math.abs(player.position.z - tower.position.z);
            const towerTopFeetY = tower.userData.topY;
            const towerTopEyeY = towerTopFeetY + currentHeight;

            if (dx < minDist && dz < minDist) {
                if (player.position.y >= towerTopFeetY - 3.5) {
                    if (player.position.y < towerTopEyeY + 1.5) {
                        player.position.y = towerTopEyeY;
                        velocity.y = 0;
                        groundedOnStructure = true;
                    }
                } else if (dx > dz) {
                    player.position.x = tower.position.x + (player.position.x > tower.position.x ? minDist : -minDist);
                } else {
                    player.position.z = tower.position.z + (player.position.z > tower.position.z ? minDist : -minDist);
                }
            }
        }

        for (const bridge of bridges) {
            const relX = player.position.x - bridge.position.x;
            const relY = player.position.y - bridge.position.y;
            const relZ = player.position.z - bridge.position.z;
            const cos = Math.cos(bridge.rotation.y);
            const sin = Math.sin(bridge.rotation.y);
            const localX = relX * cos + relZ * sin;
            const localZ = -relX * sin + relZ * cos;
            const halfLength = bridge.userData.spanLength * 0.5;
            const halfWidth = 3;
            if (Math.abs(localX) > halfLength || Math.abs(localZ) > halfWidth) continue;

            const bridgeTopEyeY = bridge.userData.topY + currentHeight;
            const bridgeTopFeetY = bridge.userData.topY;
            if (player.position.y >= bridgeTopFeetY - 2.5 && player.position.y < bridgeTopEyeY + 1.5) {
                player.position.y = bridgeTopEyeY;
                velocity.y = 0;
                groundedOnStructure = true;
            } else if (player.position.y < bridgeTopFeetY - 2.5) {
                const pushX = halfLength - Math.abs(localX);
                const pushZ = halfWidth - Math.abs(localZ);
                if (pushX < pushZ) {
                    const correctedLocalX = localX > 0 ? halfLength : -halfLength;
                    player.position.x = bridge.position.x + correctedLocalX * cos - localZ * sin;
                    player.position.z = bridge.position.z + correctedLocalX * sin + localZ * cos;
                } else {
                    const correctedLocalZ = localZ > 0 ? halfWidth : -halfWidth;
                    player.position.x = bridge.position.x + localX * cos - correctedLocalZ * sin;
                    player.position.z = bridge.position.z + localX * sin + correctedLocalZ * cos;
                }
            }
        }

        return groundedOnStructure;
    }

    function snowballHitsStructure(snowball, radius = 0.5) {
        for (const tower of towers) {
            const dx = Math.abs(snowball.position.x - tower.position.x);
            const dz = Math.abs(snowball.position.z - tower.position.z);
            const insideXZ = dx <= 5 + radius && dz <= 5 + radius;
            const insideY = snowball.position.y >= tower.userData.baseY - radius &&
                snowball.position.y <= tower.userData.topY + radius;
            if (insideXZ && insideY) return true;
        }

        for (const bridge of bridges) {
            const relX = snowball.position.x - bridge.position.x;
            const relY = snowball.position.y - bridge.position.y;
            const relZ = snowball.position.z - bridge.position.z;
            const cos = Math.cos(bridge.rotation.y);
            const sin = Math.sin(bridge.rotation.y);
            const localX = relX * cos + relZ * sin;
            const localZ = -relX * sin + relZ * cos;

            const withinX = Math.abs(localX) <= (bridge.userData.spanLength * 0.5) + radius;
            const withinY = Math.abs(relY) <= 0.6 + radius;
            const withinZ = Math.abs(localZ) <= 3 + radius;
            if (withinX && withinY && withinZ) return true;
        }

        return false;
    }

    return {
        towers,
        ladders,
        bridges,
        getLadderAt,
        resolvePlayerCollisions,
        snowballHitsStructure
    };
}
