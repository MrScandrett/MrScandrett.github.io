import * as THREE from 'three';

function createSnowField() {
    const count = 500;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 160;
        positions[i3 + 1] = 6 + Math.random() * 48;
        positions[i3 + 2] = (Math.random() - 0.5) * 160;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0xf4fbff,
        size: 0.45,
        transparent: true,
        opacity: 0.85,
        depthWrite: false
    });

    const snowSystem = new THREE.Points(geometry, material);
    snowSystem.frustumCulled = false;
    return snowSystem;
}

export function createStarfield(scene) {
    const count = 1400;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const radius = 280 + Math.random() * 520;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(1 - Math.random() * 0.92);
        positions[i3] = Math.sin(phi) * Math.cos(theta) * radius;
        positions[i3 + 1] = Math.cos(phi) * radius;
        positions[i3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0xd9efff,
        size: 1.2,
        transparent: true,
        opacity: 0.9,
        depthWrite: false
    });

    const starfield = new THREE.Points(geometry, material);
    starfield.userData.isBackdrop = true;
    scene.add(starfield);
    return starfield;
}

export function createVegetationSystem(scene, getTerrainHeight) {
    const rockMaterial = new THREE.MeshStandardMaterial({
        color: 0x91a7bc,
        roughness: 0.94,
        metalness: 0.04
    });

    for (let i = 0; i < 70; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 18 + Math.sqrt(Math.random()) * 820;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = getTerrainHeight(x, z);
        if (y <= -7.5) continue;

        const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.8 + Math.random() * 1.6, 0),
            rockMaterial
        );
        const scaleY = 0.45 + Math.random() * 0.8;
        rock.position.set(x, y + 0.4 * scaleY, z);
        rock.scale.setScalar(1.0 + Math.random() * 0.9);
        rock.scale.y *= scaleY;
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        rock.castShadow = true;
        rock.receiveShadow = true;
        scene.add(rock);
    }

    const snowSystem = createSnowField();
    scene.add(snowSystem);

    return { snowSystem };
}
