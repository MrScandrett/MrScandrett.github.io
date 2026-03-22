import * as THREE from 'three';
import { PLAYER } from '/src/app/config.js';

// Default player height to prevent NaN errors if config is missing values.
const PLAYER_STAND_HEIGHT = PLAYER.STAND_HEIGHT || 5.0;

function createLabelTexture(title, subtitle, accent) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const grad = ctx.createLinearGradient(0, 0, 512, 256);
    grad.addColorStop(0, '#111a2a');
    grad.addColorStop(1, '#090d17');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.strokeRect(14, 14, 484, 228);

    ctx.fillStyle = '#f4f7ff';
    ctx.font = 'bold 40px Segoe UI';
    ctx.fillText(title, 32, 110);

    ctx.fillStyle = '#b8c5de';
    ctx.font = '24px Segoe UI';
    ctx.fillText(subtitle, 32, 156);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
}

function createFloorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
    grad.addColorStop(0, '#152235');
    grad.addColorStop(1, '#0a111d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    ctx.strokeStyle = 'rgba(118, 165, 255, 0.20)';
    ctx.lineWidth = 2;
    for (let i = 64; i < 1024; i += 64) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 1024);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(1024, i);
        ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(66, 226, 170, 0.4)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
        const size = 930 - i * 130;
        const start = (1024 - size) / 2;
        ctx.strokeRect(start, start, size, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.2, 1.2);
    return texture;
}

export function createLobbyWorld(scene, games) {
    const group = new THREE.Group();
    group.position.set(0, 56, 0);
    scene.add(group);

    const animated = [];
    const floorTexture = createFloorTexture();
    const LOBBY_OFFSET_X = 0;
    const LIBRARY_OFFSET_X = 112;

    const floor = new THREE.Mesh(
        new THREE.BoxGeometry(70, 1, 70),
        new THREE.MeshStandardMaterial({
            color: 0x1a2538,
            roughness: 0.3,
            metalness: 0.6,
            map: floorTexture,
            emissive: 0x09131f,
            emissiveMap: floorTexture,
            emissiveIntensity: 0.5
        })
    );
    floor.position.y = 0;
    floor.receiveShadow = true;
    group.add(floor);

    const centerPlatform = new THREE.Mesh(
        new THREE.CylinderGeometry(7.8, 9.8, 1.1, 32),
        new THREE.MeshStandardMaterial({
            color: 0x2b3d59,
            roughness: 0.55,
            metalness: 0.35,
            emissive: 0x0c2531,
            emissiveIntensity: 0.6
        })
    );
    centerPlatform.position.y = 0.55;
    centerPlatform.receiveShadow = true;
    group.add(centerPlatform);

    const core = new THREE.Mesh(
        new THREE.CylinderGeometry(2.4, 2.4, 6.4, 24),
        new THREE.MeshStandardMaterial({
            color: 0x203147,
            roughness: 0.4,
            metalness: 0.5,
            emissive: 0x2b6b78,
            emissiveIntensity: 0.9
        })
    );
    core.position.y = 4.4;
    core.castShadow = true;
    group.add(core);

    const holoRing = new THREE.Mesh(
        new THREE.TorusGeometry(4.2, 0.09, 12, 64),
        new THREE.MeshBasicMaterial({ color: 0x6de5ff, transparent: true, opacity: 0.8 })
    );
    holoRing.position.y = 6.8;
    holoRing.rotation.x = Math.PI / 2;
    group.add(holoRing);
    animated.push({
        update(t) {
            holoRing.rotation.z = t * 0.8;
        }
    });

    const innerRing = new THREE.Mesh(
        new THREE.TorusGeometry(2.4, 0.08, 10, 64),
        new THREE.MeshBasicMaterial({ color: 0x62f1b0, transparent: true, opacity: 0.76 })
    );
    innerRing.position.y = 5.8;
    innerRing.rotation.x = Math.PI / 2;
    group.add(innerRing);
    animated.push({
        update(t) {
            innerRing.rotation.z = -t * 1.25;
            innerRing.position.y = 5.8 + Math.sin(t * 1.5) * 0.18;
        }
    });

    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x182232,
        roughness: 0.4,
        metalness: 0.6
    });
    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(1, 14, 70), wallMaterial);
    wallLeft.position.set(-35, 7, 0);
    const wallRight = new THREE.Mesh(new THREE.BoxGeometry(1, 14, 70), wallMaterial);
    wallRight.position.set(35, 7, 0);
    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(70, 14, 1), wallMaterial);
    wallBack.position.set(0, 7, -35);
    const wallFront = new THREE.Mesh(new THREE.BoxGeometry(70, 14, 1), wallMaterial);
    wallFront.position.set(0, 7, 35);
    wallLeft.receiveShadow = true;
    wallRight.receiveShadow = true;
    wallBack.receiveShadow = true;
    wallFront.receiveShadow = true;
    group.add(wallLeft, wallRight, wallBack, wallFront);

    const trimMaterial = new THREE.MeshStandardMaterial({
        color: 0x26374f,
        roughness: 0.58,
        metalness: 0.46,
        emissive: 0x0b1a31,
        emissiveIntensity: 0.8
    });
    const trimTop = new THREE.Mesh(new THREE.BoxGeometry(70, 0.5, 1.4), trimMaterial);
    trimTop.position.set(0, 11.6, -34.2);
    const trimBottom = trimTop.clone();
    trimBottom.position.z = 34.2;
    const trimLeft = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 70), trimMaterial);
    trimLeft.position.set(-34.2, 11.6, 0);
    const trimRight = trimLeft.clone();
    trimRight.position.x = 34.2;
    group.add(trimTop, trimBottom, trimLeft, trimRight);

    const pillarMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a3a53,
        roughness: 0.3,
        metalness: 0.7
    });
    const pillarGlowMat = new THREE.MeshBasicMaterial({ color: 0x5ec6ff, transparent: true, opacity: 0.35 });
    const corners = [
        [-31.5, -31.5], [31.5, -31.5], [-31.5, 31.5], [31.5, 31.5]
    ];
    for (const [x, z] of corners) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 12, 2.2), pillarMaterial);
        pillar.position.set(x, 6, z);
        pillar.castShadow = true;
        group.add(pillar);

        const pillarGlow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10, 0.5), pillarGlowMat);
        pillarGlow.position.set(x, 6, z);
        group.add(pillarGlow);
    }

    const ceiling = new THREE.Mesh(
        new THREE.BoxGeometry(70, 1, 70),
        new THREE.MeshStandardMaterial({
            color: 0x111a28,
            roughness: 0.82,
            metalness: 0.2,
            emissive: 0x080f18,
            emissiveIntensity: 0.5
        })
    );
    ceiling.position.y = 14;
    ceiling.receiveShadow = true;
    group.add(ceiling);

    const beamMaterial = new THREE.MeshStandardMaterial({
        color: 0x23344d,
        roughness: 0.62,
        metalness: 0.35
    });
    for (let i = -2; i <= 2; i++) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(62, 0.35, 1.1), beamMaterial);
        beam.position.set(0, 13.2, i * 8);
        group.add(beam);
    }

    const light1 = new THREE.PointLight(0x77a8ff, 1.6, 120);
    light1.position.set(-18, 10, -10);
    const light2 = new THREE.PointLight(0x56f0ab, 1.4, 120);
    light2.position.set(18, 10, -8);
    const light3 = new THREE.PointLight(0xffc77a, 1.1, 90);
    light3.position.set(0, 9, 12);
    group.add(light1, light2, light3);

    animated.push({
        update(t) {
            light1.intensity = 1.2 + Math.sin(t * 1.1) * 0.35;
            light2.intensity = 1.1 + Math.sin(t * 1.5 + 1.1) * 0.28;
            light3.intensity = 0.9 + Math.sin(t * 1.9 + 2.0) * 0.18;
        }
    });

    const terminals = [];
    const portals = [];
    const radius = 18;
    const count = Math.max(1, games.length);
    for (let i = 0; i < games.length; i++) {
        const game = games[i];
        const angle = ((i / count) - 0.5) * Math.PI * 0.8;
        const tx = Math.sin(angle) * radius;
        const tz = -Math.cos(angle) * radius - 6;

        const terminal = new THREE.Group();
        terminal.position.set(tx, 0.6, tz);
        group.add(terminal);

        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(2.5, 3.0, 1.2, 18),
            new THREE.MeshStandardMaterial({
                color: 0x2f3a4d,
                roughness: 0.65,
                metalness: 0.32,
                emissive: 0x0c1422,
                emissiveIntensity: 0.6
            })
        );
        base.castShadow = true;
        base.receiveShadow = true;
        terminal.add(base);

        const column = new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 3.2, 0.9),
            new THREE.MeshStandardMaterial({
                color: 0x3a4d6a,
                roughness: 0.5,
                metalness: 0.4
            })
        );
        column.position.y = 2;
        column.castShadow = true;
        terminal.add(column);

        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(1.55, 0.08, 10, 40),
            new THREE.MeshBasicMaterial({
                color: new THREE.Color(game.accent || '#3b82f6'),
                transparent: true,
                opacity: 0.8
            })
        );
        ring.position.y = 2.7;
        ring.rotation.x = Math.PI / 2;
        terminal.add(ring);

        const screen = new THREE.Mesh(
            new THREE.PlaneGeometry(5.4, 2.7),
            new THREE.MeshBasicMaterial({
                map: createLabelTexture(game.title, 'Walk Through Portal', game.accent || '#3b82f6')
            })
        );
        screen.position.set(0, 4.2, 0);
        screen.rotation.y = Math.PI;
        terminal.add(screen);

        const screenBack = new THREE.Mesh(
            new THREE.BoxGeometry(5.8, 3.1, 0.2),
            new THREE.MeshStandardMaterial({ color: 0x0e1420, roughness: 0.7, metalness: 0.3 })
        );
        screenBack.position.set(0, 4.2, -0.12);
        terminal.add(screenBack);

        const glow = new THREE.PointLight(new THREE.Color(game.accent || '#3b82f6'), 0.8, 14);
        glow.position.set(0, 3.8, 2.0);
        terminal.add(glow);

        const portalGroup = new THREE.Group();
        portalGroup.position.set(0, 2.15, -2.45);
        terminal.add(portalGroup);

        const portalRingOuter = new THREE.Mesh(
            new THREE.TorusGeometry(1.35, 0.12, 12, 64),
            new THREE.MeshBasicMaterial({
                color: new THREE.Color(game.accent || '#3b82f6'),
                transparent: true,
                opacity: 0.9
            })
        );
        portalRingOuter.rotation.y = Math.PI / 2;
        portalGroup.add(portalRingOuter);

        const portalRingInner = new THREE.Mesh(
            new THREE.TorusGeometry(1.02, 0.08, 10, 64),
            new THREE.MeshBasicMaterial({
                color: 0xc8ecff,
                transparent: true,
                opacity: 0.7
            })
        );
        portalRingInner.rotation.y = Math.PI / 2;
        portalGroup.add(portalRingInner);

        const portalCore = new THREE.Mesh(
            new THREE.CircleGeometry(0.95, 48),
            new THREE.MeshBasicMaterial({
                color: new THREE.Color(game.accent || '#3b82f6'),
                transparent: true,
                opacity: 0.28
            })
        );
        portalCore.rotation.y = Math.PI / 2;
        portalGroup.add(portalCore);

        const portalLight = new THREE.PointLight(new THREE.Color(game.accent || '#3b82f6'), 1.0, 10);
        portalLight.position.set(0, 0, 0);
        portalGroup.add(portalLight);

        animated.push({
            update(t) {
                ring.rotation.z = t * 1.3 + i;
                ring.position.y = 2.7 + Math.sin(t * 2.2 + i) * 0.08;
                glow.intensity = 0.65 + Math.sin(t * 2.8 + i) * 0.25;
                portalRingOuter.rotation.z = t * 1.7 + i;
                portalRingInner.rotation.z = -t * 2.1 - i;
                portalCore.material.opacity = 0.2 + Math.sin(t * 3.5 + i) * 0.08;
                portalLight.intensity = 0.85 + Math.sin(t * 2.6 + i) * 0.25;
            }
        });

        terminal.lookAt(0, 2, 18);
        terminals.push({
            id: game.id,
            title: game.title,
            object: terminal
        });
        portals.push({
            id: game.id,
            title: game.title,
            area: 'lobby',
            object: portalGroup
        });
    }

    const banner = new THREE.Mesh(
        new THREE.PlaneGeometry(22, 3.8),
        new THREE.MeshBasicMaterial({ color: 0x142032 })
    );
    banner.position.set(0, 10.4, 31.4);
    banner.rotation.y = Math.PI;
    group.add(banner);

    // Library entrance portal in the main lobby.
    const libraryPortalStand = new THREE.Group();
    libraryPortalStand.position.set(25, 1.8, 16);
    group.add(libraryPortalStand);

    const libraryStandBase = new THREE.Mesh(
        new THREE.CylinderGeometry(2.1, 2.5, 1.4, 20),
        new THREE.MeshStandardMaterial({ color: 0x2b3549, roughness: 0.62, metalness: 0.33 })
    );
    libraryStandBase.position.y = -1.1;
    libraryStandBase.castShadow = true;
    libraryStandBase.receiveShadow = true;
    libraryPortalStand.add(libraryStandBase);

    const libraryPortalOuter = new THREE.Mesh(
        new THREE.TorusGeometry(1.75, 0.15, 14, 72),
        new THREE.MeshBasicMaterial({ color: 0xd78dff, transparent: true, opacity: 0.92 })
    );
    libraryPortalOuter.rotation.y = Math.PI / 2;
    libraryPortalStand.add(libraryPortalOuter);

    const libraryPortalInner = new THREE.Mesh(
        new THREE.TorusGeometry(1.3, 0.08, 12, 64),
        new THREE.MeshBasicMaterial({ color: 0xf6d5ff, transparent: true, opacity: 0.75 })
    );
    libraryPortalInner.rotation.y = Math.PI / 2;
    libraryPortalStand.add(libraryPortalInner);

    const libraryPortalCore = new THREE.Mesh(
        new THREE.CircleGeometry(1.22, 48),
        new THREE.MeshBasicMaterial({ color: 0xc35dff, transparent: true, opacity: 0.3 })
    );
    libraryPortalCore.rotation.y = Math.PI / 2;
    libraryPortalStand.add(libraryPortalCore);

    const libraryPortalLight = new THREE.PointLight(0xdc78ff, 1.1, 11);
    libraryPortalStand.add(libraryPortalLight);

    const libraryMarker = new THREE.Mesh(
        new THREE.PlaneGeometry(4.8, 1.2),
        new THREE.MeshBasicMaterial({
            map: createLabelTexture('Recordings Library', 'Walk Through Portal', '#d78dff')
        })
    );
    libraryMarker.position.set(0, 2.8, 0);
    libraryMarker.rotation.y = Math.PI;
    libraryPortalStand.add(libraryMarker);

    animated.push({
        update(t) {
            libraryPortalOuter.rotation.z = t * 1.55;
            libraryPortalInner.rotation.z = -t * 2.0;
            libraryPortalCore.material.opacity = 0.23 + Math.sin(t * 3.2) * 0.1;
            libraryPortalLight.intensity = 1.0 + Math.sin(t * 2.5) * 0.2;
        }
    });

    portals.push({
        id: 'recordings-library',
        title: 'Recordings Library',
        area: 'lobby',
        object: libraryPortalStand
    });

    // Separate library room area.
    const libraryFloor = new THREE.Mesh(
        new THREE.BoxGeometry(44, 1, 44),
        new THREE.MeshStandardMaterial({
            color: 0x2a2038,
            roughness: 0.68,
            metalness: 0.24,
            emissive: 0x140f22,
            emissiveIntensity: 0.65
        })
    );
    libraryFloor.position.set(LIBRARY_OFFSET_X, 0, 0);
    libraryFloor.receiveShadow = true;
    group.add(libraryFloor);

    const libWallMat = new THREE.MeshStandardMaterial({
        color: 0x261d35,
        roughness: 0.72,
        metalness: 0.2
    });
    const libWallL = new THREE.Mesh(new THREE.BoxGeometry(1, 12, 44), libWallMat);
    libWallL.position.set(LIBRARY_OFFSET_X - 22, 6, 0);
    const libWallR = libWallL.clone();
    libWallR.position.x = LIBRARY_OFFSET_X + 22;
    const libWallB = new THREE.Mesh(new THREE.BoxGeometry(44, 12, 1), libWallMat);
    libWallB.position.set(LIBRARY_OFFSET_X, 6, -22);
    const libWallF = libWallB.clone();
    libWallF.position.z = 22;
    group.add(libWallL, libWallR, libWallB, libWallF);

    const libCeiling = new THREE.Mesh(
        new THREE.BoxGeometry(44, 1, 44),
        new THREE.MeshStandardMaterial({
            color: 0x1c1429,
            roughness: 0.78,
            metalness: 0.18,
            emissive: 0x090612,
            emissiveIntensity: 0.5
        })
    );
    libCeiling.position.set(LIBRARY_OFFSET_X, 12, 0);
    group.add(libCeiling);

    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x3a2a52, roughness: 0.8, metalness: 0.12 });
    for (let i = -2; i <= 2; i++) {
        const shelfLeft = new THREE.Mesh(new THREE.BoxGeometry(1.6, 6.5, 5.8), shelfMat);
        shelfLeft.position.set(LIBRARY_OFFSET_X - 17.5, 3.5, i * 7.5);
        const shelfRight = shelfLeft.clone();
        shelfRight.position.x = LIBRARY_OFFSET_X + 17.5;
        shelfLeft.castShadow = true;
        shelfRight.castShadow = true;
        group.add(shelfLeft, shelfRight);
    }

    const libLightA = new THREE.PointLight(0xc08dff, 1.25, 70);
    libLightA.position.set(LIBRARY_OFFSET_X - 8, 8.5, -6);
    const libLightB = new THREE.PointLight(0x7ac4ff, 1.1, 70);
    libLightB.position.set(LIBRARY_OFFSET_X + 8, 8.5, 6);
    group.add(libLightA, libLightB);
    animated.push({
        update(t) {
            libLightA.intensity = 1.05 + Math.sin(t * 1.6) * 0.22;
            libLightB.intensity = 0.95 + Math.sin(t * 1.9 + 0.6) * 0.2;
        }
    });

    const returnPortal = new THREE.Group();
    returnPortal.position.set(LIBRARY_OFFSET_X, 2.0, -15.5);
    group.add(returnPortal);

    const returnOuter = new THREE.Mesh(
        new THREE.TorusGeometry(1.7, 0.14, 12, 72),
        new THREE.MeshBasicMaterial({ color: 0x72d0ff, transparent: true, opacity: 0.92 })
    );
    returnOuter.rotation.y = Math.PI / 2;
    returnPortal.add(returnOuter);

    const returnInner = new THREE.Mesh(
        new THREE.TorusGeometry(1.24, 0.07, 12, 64),
        new THREE.MeshBasicMaterial({ color: 0xd9f2ff, transparent: true, opacity: 0.75 })
    );
    returnInner.rotation.y = Math.PI / 2;
    returnPortal.add(returnInner);

    const returnCore = new THREE.Mesh(
        new THREE.CircleGeometry(1.15, 48),
        new THREE.MeshBasicMaterial({ color: 0x64bfff, transparent: true, opacity: 0.28 })
    );
    returnCore.rotation.y = Math.PI / 2;
    returnPortal.add(returnCore);

    const returnLight = new THREE.PointLight(0x72d0ff, 1.0, 10);
    returnPortal.add(returnLight);

    const returnMarker = new THREE.Mesh(
        new THREE.PlaneGeometry(4.8, 1.2),
        new THREE.MeshBasicMaterial({
            map: createLabelTexture('Back To Lobby', 'Walk Through Portal', '#72d0ff')
        })
    );
    returnMarker.position.set(0, 2.8, 0);
    returnMarker.rotation.y = Math.PI;
    returnPortal.add(returnMarker);

    animated.push({
        update(t) {
            returnOuter.rotation.z = -t * 1.5;
            returnInner.rotation.z = t * 2.1;
            returnCore.material.opacity = 0.22 + Math.sin(t * 2.8 + 1.2) * 0.1;
            returnLight.intensity = 0.9 + Math.sin(t * 2.2 + 1.3) * 0.23;
        }
    });

    portals.push({
        id: 'lobby-return',
        title: 'Lobby',
        area: 'library',
        object: returnPortal
    });

    const particlesGeometry = new THREE.BufferGeometry();
    const particleCount = 180;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        particlePositions[idx] = (Math.random() - 0.5) * 58;
        particlePositions[idx + 1] = 2.0 + Math.random() * 10.0;
        particlePositions[idx + 2] = (Math.random() - 0.5) * 58;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
        particlesGeometry,
        new THREE.PointsMaterial({
            color: 0x8cd9ff,
            size: 0.12,
            transparent: true,
            opacity: 0.85
        })
    );
    group.add(particles);

    animated.push({
        update(t) {
            particles.rotation.y = t * 0.03;
        }
    });

    const spawnPosition = new THREE.Vector3(
        group.position.x + LOBBY_OFFSET_X,
        group.position.y + PLAYER_STAND_HEIGHT,
        group.position.z
    );
    const librarySpawnPosition = new THREE.Vector3(
        group.position.x + LIBRARY_OFFSET_X,
        group.position.y + PLAYER_STAND_HEIGHT + 0.6,
        group.position.z + 14
    );

    function setVisible(visible) {
        group.visible = visible;
    }

    function constrainPlayerToLobby(player, velocity, currentHeight, area = 'lobby') {
        const areaX = area === 'library' ? LIBRARY_OFFSET_X : LOBBY_OFFSET_X;
        const halfSize = area === 'library' ? 20 : 33;
        let grounded = false;
        const floorY = group.position.y + 0.5;
        if (player.position.y < floorY + currentHeight) {
            player.position.y = floorY + currentHeight;
            velocity.y = 0;
            grounded = true;
        }

        const minX = group.position.x + areaX - halfSize;
        const maxX = group.position.x + areaX + halfSize;
        const minZ = group.position.z - halfSize;
        const maxZ = group.position.z + halfSize;

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

        return grounded;
    }

    function getNearestGame(playerPosition, maxDistance = 5.2) {
        let best = null;
        let bestDist = Infinity;
        for (const terminal of terminals) {
            const world = new THREE.Vector3();
            terminal.object.getWorldPosition(world);
            const dist = playerPosition.distanceTo(world);
            if (dist < maxDistance && dist < bestDist) {
                bestDist = dist;
                best = { id: terminal.id, title: terminal.title, distance: dist };
            }
        }
        return best;
    }

    function getPortalAtPosition(playerPosition, area = 'lobby', radiusThreshold = 1.85, playerHeight = PLAYER_STAND_HEIGHT) {
        let bestDist = Infinity;
        let hit = null;

        for (const portal of portals) {
            if (portal.area !== area) continue;
            const world = new THREE.Vector3();
            portal.object.getWorldPosition(world);
            const dx = playerPosition.x - world.x;
            const dz = playerPosition.z - world.z;
            const distXZ = Math.hypot(dx, dz);
            const feetY = playerPosition.y - playerHeight;
            const headY = playerPosition.y;
            const withinY = world.y >= feetY - 0.4 && world.y <= headY + 0.8;
            if (!withinY) continue;
            if (distXZ <= radiusThreshold && distXZ < bestDist) {
                bestDist = distXZ;
                hit = { id: portal.id, title: portal.title, distance: distXZ };
            }
        }
        return hit;
    }

    function update(timeSeconds) {
        const t = timeSeconds || 0;
        for (const item of animated) {
            item.update(t);
        }
    }

    return {
        spawnPosition,
        librarySpawnPosition,
        setVisible,
        constrainPlayerToLobby,
        getNearestGame,
        getPortalAtPosition,
        update
    };
}
