import * as THREE from 'three';

export function createParticleSystem(scene) {
    const bursts = [];

    function createExplosion(position) {
        const count = 24;
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            positions[i3] = position.x;
            positions[i3 + 1] = position.y;
            positions[i3 + 2] = position.z;

            const dir = new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() * 0.8,
                Math.random() - 0.5
            ).normalize().multiplyScalar(5 + Math.random() * 8);

            velocities[i3] = dir.x;
            velocities[i3 + 1] = dir.y;
            velocities[i3 + 2] = dir.z;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xe7f7ff,
            size: 0.28,
            transparent: true,
            opacity: 0.95,
            depthWrite: false
        });

        const points = new THREE.Points(geometry, material);
        scene.add(points);
        bursts.push({
            geometry,
            material,
            points,
            velocities,
            life: 0.55
        });
    }

    function update(delta) {
        for (let i = bursts.length - 1; i >= 0; i--) {
            const burst = bursts[i];
            const positions = burst.geometry.attributes.position.array;
            burst.life -= delta;

            for (let j = 0; j < positions.length; j += 3) {
                burst.velocities[j + 1] -= 14 * delta;
                positions[j] += burst.velocities[j] * delta;
                positions[j + 1] += burst.velocities[j + 1] * delta;
                positions[j + 2] += burst.velocities[j + 2] * delta;
            }

            burst.geometry.attributes.position.needsUpdate = true;
            burst.material.opacity = Math.max(0, burst.life / 0.55);

            if (burst.life <= 0) {
                scene.remove(burst.points);
                burst.geometry.dispose();
                burst.material.dispose();
                bursts.splice(i, 1);
            }
        }
    }

    return {
        createExplosion,
        update
    };
}
