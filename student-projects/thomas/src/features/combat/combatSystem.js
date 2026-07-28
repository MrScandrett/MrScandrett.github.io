import * as THREE from 'three';
import { COMBAT } from '../../app/config.js';

const BOT_HEIGHT = 2.15;

// Every bot used to allocate its own copies of these. Bots spawn continuously
// and were never disposed on death, so each wave leaked another seven materials
// (and their compiled shader programs) onto the GPU.
const BOT_MATERIALS = {
    snow: new THREE.MeshStandardMaterial({ color: 0xf2f7ff, roughness: 0.92, metalness: 0.02 }),
    packedSnow: new THREE.MeshStandardMaterial({ color: 0xe3eefc, roughness: 0.88, metalness: 0.03 }),
    coal: new THREE.MeshStandardMaterial({ color: 0x1c2430, roughness: 0.76, metalness: 0.2 }),
    scarf: new THREE.MeshStandardMaterial({ color: 0xc63b4a, roughness: 0.68, metalness: 0.08 }),
    hat: new THREE.MeshStandardMaterial({ color: 0x1f2f4b, roughness: 0.56, metalness: 0.12 }),
    twig: new THREE.MeshStandardMaterial({ color: 0x5b3d26, roughness: 0.94, metalness: 0.02 }),
    carrot: new THREE.MeshStandardMaterial({ color: 0xff8c42, roughness: 0.7, metalness: 0.05 }),
    eye: new THREE.MeshBasicMaterial({ color: 0x7de8ff }),
    core: new THREE.MeshStandardMaterial({ color: 0x8fe7ff, roughness: 0.38, metalness: 0.16, emissive: 0x1b4b66, emissiveIntensity: 0.5 }),
    ring: new THREE.MeshBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0.75 }),
    healthTrack: new THREE.MeshBasicMaterial({ color: 0x2b2b2b, transparent: true, opacity: 0.85 }),
    healthBar: new THREE.MeshBasicMaterial({ color: 0x45e27a })
};

// Materials are shared, so only a bot's own geometry is ours to release.
// Projectiles share both and need no teardown beyond removal from the scene.
export function disposeBot(bot) {
    bot.traverse((node) => {
        if (node.isMesh) node.geometry.dispose();
    });
}

// Projectiles are the hottest allocation in the game -- one per click and one
// per bot every two seconds -- and each used to build two fresh materials and
// two fresh geometries that were never disposed. Both are now cached per look.
const PROJECTILE_GEOMETRY = {
    enemyCore: new THREE.IcosahedronGeometry(0.42, 1),
    playerCore: new THREE.IcosahedronGeometry(0.36, 1),
    enemyShell: new THREE.IcosahedronGeometry(0.56, 1),
    playerShell: new THREE.IcosahedronGeometry(0.48, 1)
};

const projectileMaterialCache = new Map();

function projectileMaterials(isEnemy, primaryColor) {
    const key = isEnemy ? 'enemy' : `player:${primaryColor}`;
    let cached = projectileMaterialCache.get(key);
    if (!cached) {
        cached = {
            core: new THREE.MeshStandardMaterial({
                color: primaryColor,
                roughness: 0.32,
                metalness: 0.08,
                emissive: isEnemy ? 0xff5722 : 0x5ec8ff,
                emissiveIntensity: 0.6
            }),
            shell: new THREE.MeshBasicMaterial({
                color: isEnemy ? 0xffd4c3 : 0xeefaff,
                wireframe: true,
                transparent: true,
                opacity: 0.45
            })
        };
        projectileMaterialCache.set(key, cached);
    }
    return cached;
}

export function createProjectileMesh(isEnemy = false, weapon = null) {
    const projectile = new THREE.Group();
    const primaryColor = isEnemy ? 0xff8a5b : (weapon && weapon.color) || 0xbfe8ff;
    const materials = projectileMaterials(isEnemy, primaryColor);

    const core = new THREE.Mesh(
        isEnemy ? PROJECTILE_GEOMETRY.enemyCore : PROJECTILE_GEOMETRY.playerCore,
        materials.core
    );
    core.castShadow = true;
    projectile.add(core);

    const shell = new THREE.Mesh(
        isEnemy ? PROJECTILE_GEOMETRY.enemyShell : PROJECTILE_GEOMETRY.playerShell,
        materials.shell
    );
    projectile.add(shell);

    projectile.userData.shell = shell;
    projectile.isEnemy = isEnemy;
    projectile.damage = weapon && weapon.damage ? weapon.damage : 10;
    return projectile;
}

// `stats` comes from the current wave, so the same snowman gets tougher and
// pushier as a run goes on instead of being identical from wave 1 to wave 12.
export function createBot(x, z, getTerrainHeight, stats = {}) {
    const bot = new THREE.Group();
    bot.maxHealth = stats.health || 100;
    bot.health = bot.maxHealth;
    bot.speed = stats.speed || 3.5;
    bot.fireRate = stats.fireRate || 2000;
    // Staggered so a wave that spawns together doesn't volley in lockstep.
    bot.lastShot = -Math.random() * (stats.fireRate || 2000);
    bot.userData.heightOffset = BOT_HEIGHT;
    bot.userData.projectileOffset = 0.95;

    const lowerBody = new THREE.Mesh(
        new THREE.SphereGeometry(1.05, 24, 24),
        BOT_MATERIALS.packedSnow
    );
    lowerBody.position.y = -1.05;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    bot.add(lowerBody);

    const middleBody = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 24, 24),
        BOT_MATERIALS.snow
    );
    middleBody.position.y = 0.05;
    middleBody.castShadow = true;
    middleBody.receiveShadow = true;
    bot.add(middleBody);

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.58, 20, 20),
        BOT_MATERIALS.snow
    );
    head.position.y = 1.35;
    head.castShadow = true;
    head.receiveShadow = true;
    bot.add(head);

    const hatBrim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.52, 0.6, 0.12, 24),
        BOT_MATERIALS.hat
    );
    hatBrim.position.y = 1.88;
    hatBrim.castShadow = true;
    bot.add(hatBrim);

    const hatTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.42, 0.56, 20),
        BOT_MATERIALS.hat
    );
    hatTop.position.y = 2.16;
    hatTop.castShadow = true;
    bot.add(hatTop);

    const scarf = new THREE.Mesh(
        new THREE.TorusGeometry(0.43, 0.12, 10, 24),
        BOT_MATERIALS.scarf
    );
    scarf.position.y = 0.8;
    scarf.rotation.x = Math.PI / 2;
    bot.add(scarf);

    const scarfTail = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.7, 0.14),
        BOT_MATERIALS.scarf
    );
    scarfTail.position.set(0.26, 0.32, 0.42);
    scarfTail.rotation.z = -0.18;
    bot.add(scarfTail);

    const goggles = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.16, 0.2),
        BOT_MATERIALS.coal
    );
    goggles.position.set(0, 1.42, 0.38);
    bot.add(goggles);

    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), BOT_MATERIALS.eye);
    leftEye.position.set(-0.16, 1.42, 0.5);
    const rightEye = leftEye.clone();
    rightEye.position.x = 0.16;
    bot.add(leftEye, rightEye);

    const nose = new THREE.Mesh(
        new THREE.ConeGeometry(0.07, 0.46, 12),
        BOT_MATERIALS.carrot
    );
    nose.position.set(0, 1.26, 0.68);
    nose.rotation.x = Math.PI / 2;
    bot.add(nose);

    for (let i = 0; i < 3; i++) {
        const button = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), BOT_MATERIALS.coal);
        button.position.set(0, 0.38 - i * 0.34, 0.73 - i * 0.02);
        bot.add(button);
    }

    for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.05, 1.45, 8),
            BOT_MATERIALS.twig
        );
        arm.position.set(side * 0.94, 0.22, 0.05);
        arm.rotation.z = side * 1.06;
        arm.rotation.x = 0.2;
        arm.castShadow = true;
        bot.add(arm);
    }

    const body = new THREE.Mesh(
        new THREE.TorusGeometry(0.72, 0.05, 10, 24),
        BOT_MATERIALS.core
    );
    body.position.y = -0.18;
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    bot.add(body);

    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.18, 0.08, 10, 32),
        BOT_MATERIALS.ring
    );
    ring.position.y = -0.82;
    ring.rotation.x = Math.PI / 2;
    bot.add(ring);
    bot.userData.ring = ring;

    const healthBarTrack = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 0.22),
        BOT_MATERIALS.healthTrack
    );
    healthBarTrack.position.set(0, 2.72, 0);
    bot.add(healthBarTrack);

    const healthBar = new THREE.Mesh(
        new THREE.PlaneGeometry(2.0, 0.14),
        BOT_MATERIALS.healthBar
    );
    healthBar.position.set(0, 2.73, 0.01);
    bot.add(healthBar);
    bot.healthBar = healthBar;

    const sizeBoost = Math.min(1.35, 1 + (bot.maxHealth - 50) / 520);
    bot.scale.setScalar(sizeBoost);
    bot.userData.heightOffset = BOT_HEIGHT * sizeBoost;
    bot.position.set(x, getTerrainHeight(x, z) + bot.userData.heightOffset, z);
    return bot;
}

export function shootBotSnowball(bot, targetPos, scene, snowballs, damage = 10) {
    const snowball = createProjectileMesh(true);
    snowball.position.copy(bot.position);
    snowball.position.y += bot.userData.projectileOffset || 1.25;

    const direction = new THREE.Vector3().subVectors(targetPos, snowball.position);
    if (direction.lengthSq() === 0) {
        direction.set(0, 0, -1);
    } else {
        direction.normalize();
    }

    snowball.velocity = direction.multiplyScalar(COMBAT.BOT_SNOWBALL_SPEED);
    snowball.damage = damage;
    snowball.isEnemy = true;
    scene.add(snowball);
    snowballs.push(snowball);
    return snowball;
}
