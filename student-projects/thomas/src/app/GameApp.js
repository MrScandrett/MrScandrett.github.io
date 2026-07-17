import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { COMBAT, PLAYER } from '/src/app/config.js';
// Default player values to prevent NaN errors if config is missing values.
const PLAYER_STAND_HEIGHT = PLAYER.STAND_HEIGHT || 5.0;
const PLAYER_SLIDE_HEIGHT = PLAYER.SLIDE_HEIGHT || 2.5;
import { createTerrainSystem } from '/src/features/world/terrainSystem.js';
import { createTowerSystem } from '/src/features/structures/towerSystem.js';
import { createHealthDisplay } from '/src/ui/hud.js';
import { createMinimap } from '/src/ui/minimap.js';
import { createFpsMeter } from '/src/diagnostics/fpsMeter.js';
import { LOBBY_GAMES } from '/src/app/gameRegistry.js';
import { createLobbyWorld } from '/src/features/lobby/lobbyWorld.js';
import { createLavaParkourWorld } from '/src/features/lava/lavaParkourWorld.js';
import { createVegetationSystem, createStarfield } from '/src/features/world/vegetationSystem.js';
import { createParticleSystem } from '/src/features/world/particleSystem.js';
import { createBot, shootBotSnowball, createProjectileMesh } from '/src/features/combat/combatSystem.js';
import { createShopUi, WEAPONS } from '/src/ui/shopUi.js';

export function startGame() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x050510, 0.015);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance", stencil: false, depth: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(0.5);
    renderer.shadowMap.enabled = false;
    renderer.shadowMap.type = THREE.BasicShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.0;
    document.body.appendChild(renderer.domElement);

    camera.position.set(0, PLAYER_STAND_HEIGHT, 20);
    scene.add(camera);

    const light = new THREE.DirectionalLight(0xffffff, 2.0);
    light.position.set(20, 50, 20);
    light.castShadow = false;
    light.shadow.mapSize.width = 512;
    light.shadow.mapSize.height = 512;
    light.shadow.bias = -0.0001;
    scene.add(light);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x050510, 0.6);
    scene.add(hemiLight);

    createStarfield(scene);

    const terrain = createTerrainSystem(scene);
    const { WORLD_RADIUS, getTerrainHeight, randomPointInWorld, isInsideWorld } = terrain;

    const vegSystem = createVegetationSystem(scene, getTerrainHeight);
    const snowSystem = vegSystem ? vegSystem.snowSystem : null;

    const towerSystem = createTowerSystem(scene, getTerrainHeight, randomPointInWorld, WORLD_RADIUS);
    const lobbyWorld = createLobbyWorld(scene, LOBBY_GAMES);
    lobbyWorld.setVisible(true);
    const lavaParkourWorld = createLavaParkourWorld(scene);

    const controls = new PointerLockControls(camera, document.body);

    // --- GRAPPLE HOOK ---
    let isGrappling = false;
    const grapplePoint = new THREE.Vector3();
    const grappleRaycaster = new THREE.Raycaster();
    grappleRaycaster.far = 200;
    const grappleLineMat = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const grappleLineGeo = new THREE.BufferGeometry();
    const grappleLine = new THREE.Line(grappleLineGeo, grappleLineMat);
    grappleLine.frustumCulled = false;
    grappleLine.visible = false;
    scene.add(grappleLine);

    // --- CROSSHAIR ---
    const crosshair = document.createElement('div');
    crosshair.style.position = 'absolute';
    crosshair.style.top = '50%';
    crosshair.style.left = '50%';
    crosshair.style.width = '6px';
    crosshair.style.height = '6px';
    crosshair.style.backgroundColor = 'white';
    crosshair.style.borderRadius = '50%';
    crosshair.style.transform = 'translate(-50%, -50%)';
    crosshair.style.pointerEvents = 'none';
    crosshair.style.zIndex = '1000';
    crosshair.style.border = '1px solid rgba(0,0,0,0.5)';
    crosshair.style.boxShadow = '0 0 4px white';
    document.body.appendChild(crosshair);

    let currentWeaponIndex = 0;
    let unlockedWeapons = [0];

    // HUD: Ammo & Dash
    const combatHud = document.createElement('div');
    combatHud.style.position = 'absolute';
    combatHud.style.bottom = '30px';
    combatHud.style.right = '30px';
    combatHud.style.color = '#00ffff';
    combatHud.style.fontFamily = 'Segoe UI, sans-serif';
    combatHud.style.fontSize = '24px';
    combatHud.style.fontWeight = 'bold';
    combatHud.style.textShadow = '0 0 10px #00ffff';
    combatHud.style.display = 'none';
    document.body.appendChild(combatHud);

    let instructions = document.getElementById('instructions');
    if (!instructions) {
        instructions = document.createElement('div');
        instructions.id = 'instructions';
        document.body.appendChild(instructions);
    }
    instructions.innerHTML = '';
    instructions.style.position = 'absolute';
    instructions.style.top = '50%';
    instructions.style.left = '50%';
    instructions.style.transform = 'translate(-50%, -50%)';
    instructions.style.textAlign = 'center';
    instructions.style.color = 'white';
    instructions.style.backgroundColor = 'rgba(0,0,0,0.5)';
    instructions.style.padding = '20px';
    instructions.style.cursor = 'pointer';
    instructions.style.display = 'block';
    instructions.style.zIndex = '10000';
    const instructionsTitle = document.createElement('h1');
    const instructionsSubtitle = document.createElement('p');
    instructions.appendChild(instructionsTitle);
    instructions.appendChild(instructionsSubtitle);

    function setInstructionsText(title, subtitle) {
        instructionsTitle.innerText = title;
        instructionsSubtitle.innerText = subtitle;
    }

    setInstructionsText('Click to Enter Lobby', '(WASD = Move, V = Dash, E = Grapple, B = Shop)');

    let useMic = false;
    const micBtn = document.createElement('button');
    micBtn.innerText = 'Microphone: OFF';
    micBtn.style.display = 'block';
    micBtn.style.margin = '20px auto 0 auto';
    micBtn.style.padding = '10px 20px';
    micBtn.style.fontSize = '16px';
    micBtn.style.cursor = 'pointer';
    micBtn.onclick = async (e) => {
        e.stopPropagation();
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Microphone API not available in this browser.');
            return;
        }
        if (!useMic) {
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
                useMic = true;
                micBtn.innerText = 'Microphone: ON';
                micBtn.style.backgroundColor = '#44ff44';
            } catch (err) {
                alert('Microphone access denied. Please allow permission.');
            }
        } else {
            useMic = false;
            micBtn.innerText = 'Microphone: OFF';
            micBtn.style.backgroundColor = '';
        }
    };
    instructions.appendChild(micBtn);

    const lobbyReturnBtn = document.createElement('button');
    lobbyReturnBtn.innerText = 'Return to Lobby';
    lobbyReturnBtn.style.display = 'none';
    lobbyReturnBtn.style.margin = '10px auto 0 auto';
    lobbyReturnBtn.style.padding = '10px 16px';
    lobbyReturnBtn.style.fontSize = '15px';
    lobbyReturnBtn.style.cursor = 'pointer';
    lobbyReturnBtn.style.backgroundColor = '#4f8cff';
    lobbyReturnBtn.style.color = 'white';
    lobbyReturnBtn.style.border = 'none';
    lobbyReturnBtn.style.borderRadius = '8px';
    instructions.appendChild(lobbyReturnBtn);

    const libraryContainer = document.createElement('div');
    libraryContainer.style.position = 'absolute';
    libraryContainer.style.bottom = '0';
    libraryContainer.style.left = '0';
    libraryContainer.style.width = '100%';
    libraryContainer.style.height = '220px';
    libraryContainer.style.overflowX = 'auto';
    libraryContainer.style.whiteSpace = 'nowrap';
    libraryContainer.style.background = 'rgba(0,0,0,0.8)';
    libraryContainer.style.display = 'none';
    libraryContainer.style.padding = '10px';
    libraryContainer.style.zIndex = '1000';
    document.body.appendChild(libraryContainer);

    const libTitle = document.createElement('h3');
    libTitle.innerText = 'Recordings Library';
    libTitle.style.color = 'white';
    libTitle.style.margin = '0 0 10px 0';
    libraryContainer.appendChild(libTitle);

    let mediaRecorder;
    let recordedChunks = [];
    async function startRecording() {
        recordedChunks = [];
        let finalStream;
        try {
            if (typeof MediaRecorder === 'undefined') return;
            const canvasStream = renderer.domElement.captureStream(30);
            finalStream = canvasStream;

            if (useMic) {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                finalStream = new MediaStream([
                    ...canvasStream.getVideoTracks(),
                    ...audioStream.getAudioTracks()
                ]);
            }

            mediaRecorder = new MediaRecorder(finalStream, { mimeType: 'video/webm' });
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) recordedChunks.push(e.data);
            };
            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);

                const itemContainer = document.createElement('div');
                itemContainer.style.display = 'inline-block';
                itemContainer.style.marginRight = '10px';
                itemContainer.style.verticalAlign = 'top';
                itemContainer.style.textAlign = 'center';

                const video = document.createElement('video');
                video.src = url;
                video.controls = true;
                video.loop = true;
                video.playbackRate = 1.0;
                video.style.height = '150px';
                video.style.display = 'block';

                const saveBtn = document.createElement('button');
                saveBtn.innerText = 'Save Video';
                saveBtn.style.marginTop = '5px';
                saveBtn.style.cursor = 'pointer';
                saveBtn.onclick = () => {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'letsplay_' + Date.now() + '.webm';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                };

                const deleteBtn = document.createElement('button');
                deleteBtn.innerText = 'Delete';
                deleteBtn.style.marginTop = '5px';
                deleteBtn.style.marginLeft = '5px';
                deleteBtn.style.cursor = 'pointer';
                deleteBtn.style.backgroundColor = '#ff4444';
                deleteBtn.style.color = 'white';
                deleteBtn.style.border = 'none';
                deleteBtn.onclick = () => {
                    itemContainer.remove();
                    URL.revokeObjectURL(url);
                };

                itemContainer.appendChild(video);
                itemContainer.appendChild(saveBtn);
                itemContainer.appendChild(deleteBtn);
                libraryContainer.appendChild(itemContainer);
                finalStream.getTracks().forEach(track => track.stop());
            };
            mediaRecorder.start();
        } catch (e) {
            console.warn('MediaRecorder setup failed', e);
        }
    }

    instructions.addEventListener('click', () => controls.lock());
    const interactionPrompt = document.createElement('div');
    interactionPrompt.style.position = 'absolute';
    interactionPrompt.style.left = '50%';
    interactionPrompt.style.bottom = '96px';
    interactionPrompt.style.transform = 'translateX(-50%)';
    interactionPrompt.style.padding = '10px 14px';
    interactionPrompt.style.borderRadius = '10px';
    interactionPrompt.style.background = 'rgba(0,0,0,0.62)';
    interactionPrompt.style.border = '1px solid rgba(255,255,255,0.28)';
    interactionPrompt.style.color = '#f0f6ff';
    interactionPrompt.style.fontFamily = 'Segoe UI, sans-serif';
    interactionPrompt.style.fontSize = '14px';
    interactionPrompt.style.display = 'none';
    interactionPrompt.style.pointerEvents = 'none';
    interactionPrompt.style.zIndex = '1200';
    document.body.appendChild(interactionPrompt);

    const lavaHud = document.createElement('div');
    lavaHud.style.position = 'absolute';
    lavaHud.style.top = '20px';
    lavaHud.style.left = '50%';
    lavaHud.style.transform = 'translateX(-50%)';
    lavaHud.style.padding = '8px 12px';
    lavaHud.style.borderRadius = '10px';
    lavaHud.style.background = 'rgba(0,0,0,0.55)';
    lavaHud.style.border = '1px solid rgba(255,255,255,0.25)';
    lavaHud.style.color = '#ffe2cf';
    lavaHud.style.fontFamily = 'Segoe UI, sans-serif';
    lavaHud.style.fontSize = '14px';
    lavaHud.style.zIndex = '1200';
    lavaHud.style.display = 'none';
    lavaHud.innerText = 'Lava Rising';
    document.body.appendChild(lavaHud);

    let mode = 'lobby';
    const LOCAL_GAME_ID = 'thomas-snowball-fps';
    const LAVA_GAME_ID = 'lava-rising-parkour';
    let lastPortalTrigger = 0;
    const LAVA_BEST_KEY = 'lava_parkour_best_ms';
    let lavaRunStart = 0;
    let lavaBestMs = Number(localStorage.getItem(LAVA_BEST_KEY) || 0);
    let lavaDeaths = 0;

    const player = controls.getObject();
    player.position.copy(lobbyWorld.spawnPosition);

    function returnToLobby(keepLocked = false) {
        if (mode !== 'game' && mode !== 'library' && mode !== 'lava') return;
        mode = 'lobby';
        lobbyWorld.setVisible(true);
        lavaParkourWorld.setVisible(false);
        interactionPrompt.style.display = 'none';
        combatHud.style.display = 'none';
        healthUi.element.style.display = 'none';
        minimap.canvas.style.display = 'none';
        lavaHud.style.display = 'none';
        libraryContainer.style.display = 'none';
        setInstructionsText('Click to Enter Lobby', '(WASD = Move, V = Dash, E = Grapple, B = Shop)');
        instructions.style.display = keepLocked ? 'none' : 'block';
        lobbyReturnBtn.style.display = 'none';
        player.position.copy(lobbyWorld.spawnPosition);
        velocity.set(0, 0, 0);
        moveForward = false;
        moveBackward = false;
        moveLeft = false;
        moveRight = false;
        isSliding = false;
        canJump = false;
        jumpQueuedUntil = -Infinity;
        lastGroundedAt = -Infinity;
        isShielding = false;
        shieldMesh.visible = false;
        isGrappling = false;
        grappleLine.visible = false;
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
        if (!keepLocked && controls.isLocked) {
            controls.unlock();
        }
    }

    lobbyReturnBtn.onclick = (e) => {
        e.stopPropagation();
        returnToLobby();
    };

    controls.addEventListener('lock', () => {
        instructions.style.display = 'none';
        lobbyReturnBtn.style.display = 'none';
        prevTime = performance.now();
        if (mode === 'game') {
            libraryContainer.style.display = 'none';
            startRecording();
            combatHud.style.display = 'block';
        } else if (mode === 'library') {
            libraryContainer.style.display = 'block';
        } else if (mode === 'lava') {
            libraryContainer.style.display = 'none';
            lavaHud.style.display = 'block';
        } else {
            libraryContainer.style.display = 'none';
            lavaHud.style.display = 'none';
        }
    });

    controls.addEventListener('unlock', () => {
        if (shopUi && shopUi.isOpen()) {
            instructions.style.display = 'none';
            return;
        }
        instructions.style.display = 'block';
        if (mode === 'game') {
            setInstructionsText('Paused', 'Click to Continue');
            libraryContainer.style.display = 'none';
            lobbyReturnBtn.style.display = 'block';
        } else if (mode === 'library') {
            setInstructionsText('Library Paused', 'Click to Continue');
            libraryContainer.style.display = 'block';
            lobbyReturnBtn.style.display = 'block';
        } else if (mode === 'lava') {
            setInstructionsText('Lava Parkour Paused', 'Click to Continue');
            libraryContainer.style.display = 'none';
            lobbyReturnBtn.style.display = 'block';
            lavaHud.style.display = 'none';
        } else {
            setInstructionsText('Click to Enter Lobby', '(WASD = Move, V = Dash, E = Grapple, B = Shop)');
            libraryContainer.style.display = 'none';
            lobbyReturnBtn.style.display = 'none';
            lavaHud.style.display = 'none';
        }
        isShielding = false;
        shieldMesh.visible = false;
        combatHud.style.display = 'none';
        isGrappling = false;
        grappleLine.visible = false;
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
    });

    const healthUi = createHealthDisplay();
    const minimap = createMinimap(WORLD_RADIUS);
    const fpsMeter = createFpsMeter();
    healthUi.element.style.display = 'none';
    minimap.canvas.style.display = 'none';

    let playerHealth = 100;
    let playerLevel = 1;
    let score = 0;
    let lastDashTime = 0;
    const DASH_COOLDOWN = 1500;
    let lastDamageTime = 0;

    function updateHealthDisplay() {
        healthUi.update(playerHealth, playerLevel, score);
    }
    updateHealthDisplay();

    const shopUi = createShopUi(
        controls,
        (index) => { currentWeaponIndex = index; },
        (index, cost) => {
            if (score >= cost) {
                score -= cost;
                updateHealthDisplay();
                return true;
            }
            return false;
        }
    );

    let moveForward = false;
    let moveBackward = false;
    let moveLeft = false;
    let moveRight = false;
    let canJump = false;
    let isSliding = false;
    let currentHeight = PLAYER_STAND_HEIGHT;
    let isFlipping = false;
    let flipStartTime = 0;
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const snowballs = [];
    const bots = [];
    const JUMP_VELOCITY = 165;
    const JUMP_BUFFER_MS = 140;
    const COYOTE_TIME_MS = 140;
    let jumpQueuedUntil = -Infinity;
    let lastGroundedAt = -Infinity;
    const _botDir = new THREE.Vector3();
    const _grappleDir = new THREE.Vector3();
    let frameCount = 0;

    function applyGravity(delta) {
        velocity.y -= PLAYER.GRAVITY * delta;
    }

    function tryConsumeJump(now, allow = true) {
        if (!allow) return false;
        const buffered = now <= jumpQueuedUntil;
        const coyote = canJump || (now - lastGroundedAt <= COYOTE_TIME_MS);
        if (!buffered || !coyote) return false;
        velocity.y = Math.max(velocity.y, JUMP_VELOCITY);
        canJump = false;
        jumpQueuedUntil = -Infinity;
        return true;
    }

    const onKeyDown = (e) => {
        if (e.code === 'KeyW') moveForward = true;
        if (e.code === 'KeyS') moveBackward = true;
        if (e.code === 'KeyA') moveLeft = true;
        if (e.code === 'KeyD') moveRight = true;
        if (e.code === 'Space') {
            jumpQueuedUntil = performance.now() + JUMP_BUFFER_MS;
        }
        if (e.code === 'ShiftLeft') isSliding = true;
        if (e.code === 'KeyF' && !isFlipping) {
            isFlipping = true;
            flipStartTime = performance.now();
            velocity.y += 50;
            velocity.z += 100;
        }
        if (e.code === 'KeyV') {
            const now = performance.now();
            if (now - lastDashTime > DASH_COOLDOWN && mode === 'game') {
                lastDashTime = now;
                const dashDir = new THREE.Vector3();
                controls.getObject().getWorldDirection(dashDir);
                velocity.add(dashDir.multiplyScalar(800));
                velocity.y += 20; // Small hop
            }
        }
        if (e.code === 'KeyB' && mode === 'game') {
            if (shopUi && shopUi.isOpen()) {
                shopUi.toggleShop(false);
            } else if (shopUi) {
                shopUi.updateState(score, unlockedWeapons, currentWeaponIndex);
                shopUi.toggleShop(true);
                instructions.style.display = 'none';
            }
        }
        if (e.code === 'KeyE' && mode === 'game') {
            grappleRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
            const intersects = grappleRaycaster.intersectObjects(scene.children, true);
            for (const hit of intersects) {
                if (hit.object.type === 'Points') continue;
                if (hit.distance > 2) {
                    isGrappling = true;
                    grapplePoint.copy(hit.point);
                    grappleLine.visible = true;
                    break;
                }
            }
        }
    };
    const onKeyUp = (e) => {
        if (e.code === 'KeyW') moveForward = false;
        if (e.code === 'KeyS') moveBackward = false;
        if (e.code === 'KeyA') moveLeft = false;
        if (e.code === 'KeyD') moveRight = false;
        if (e.code === 'ShiftLeft') isSliding = false;
        if (e.code === 'KeyE') {
            isGrappling = false;
            grappleLine.visible = false;
        }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    const particleSystem = createParticleSystem(scene);

    const shieldGeometry = new THREE.SphereGeometry(1.5, 32, 32);
    const shieldMaterial = new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
    const shieldMesh = new THREE.Mesh(shieldGeometry, shieldMaterial);
    shieldMesh.visible = false;
    scene.add(shieldMesh);
    let isShielding = false;

    function createSnowball() {
        const weapon = WEAPONS[currentWeaponIndex];
        const snowball = createProjectileMesh(false, weapon);
        snowball.position.copy(controls.getObject().position);
        const initialVelocity = new THREE.Vector3();
        controls.getObject().getWorldDirection(initialVelocity);
        initialVelocity.multiplyScalar(weapon.speed);
        snowball.velocity = initialVelocity;
        snowball.isEnemy = false;
        snowball.damage = weapon.damage;
        return snowball;
    }

    document.addEventListener('mousedown', (event) => {
        if (!controls.isLocked || mode !== 'game') return;
        if (event.button === 0) {
            const snowball = createSnowball();
            snowballs.push(snowball);
            scene.add(snowball);
        } else if (event.button === 2) {
            isShielding = true;
            shieldMesh.visible = true;
        }
    });

    document.addEventListener('mouseup', (event) => {
        if (mode !== 'game') return;
        if (event.button === 2) {
            isShielding = false;
            shieldMesh.visible = false;
        }
    });
    document.addEventListener('contextmenu', (event) => event.preventDefault());

    let lastBotSpawn = 0;
    let prevTime = performance.now();

    function startSelectedGame(gameId) {
        lastPortalTrigger = performance.now();
        if (gameId === LOCAL_GAME_ID) {
            mode = 'game';
            lobbyWorld.setVisible(false);
            lavaParkourWorld.setVisible(false);
            interactionPrompt.style.display = 'none';
            healthUi.element.style.display = 'block';
            minimap.canvas.style.display = 'block';
            lavaHud.style.display = 'none';
            libraryContainer.style.display = 'none';
            instructions.style.display = 'none';
            combatHud.style.display = 'block';
            player.position.set(0, PLAYER.STAND_HEIGHT, 20);
            velocity.set(0, 0, 0);
            jumpQueuedUntil = -Infinity;
            lastGroundedAt = -Infinity;
            if (controls.isLocked) {
                startRecording();
            }
        } else if (gameId === LAVA_GAME_ID) {
            mode = 'lava';
            lobbyWorld.setVisible(false);
            lavaParkourWorld.setVisible(true);
            lavaParkourWorld.reset();
            lavaRunStart = performance.now();
            lavaDeaths = 0;
            interactionPrompt.style.display = 'none';
            healthUi.element.style.display = 'none';
            minimap.canvas.style.display = 'none';
            lavaHud.style.display = 'block';
            libraryContainer.style.display = 'none';
            instructions.style.display = 'none';
            combatHud.style.display = 'none';
            player.position.copy(lavaParkourWorld.spawnPosition);
            velocity.set(0, 0, 0);
            jumpQueuedUntil = -Infinity;
            lastGroundedAt = -Infinity;
        }
    }

    function startLibraryMode() {
        mode = 'library';
        lastPortalTrigger = performance.now();
        lobbyWorld.setVisible(true);
        lavaParkourWorld.setVisible(false);
        interactionPrompt.style.display = 'none';
        healthUi.element.style.display = 'none';
        minimap.canvas.style.display = 'none';
        lavaHud.style.display = 'none';
        libraryContainer.style.display = controls.isLocked ? 'block' : 'none';
        instructions.style.display = 'none';
        combatHud.style.display = 'none';
        player.position.copy(lobbyWorld.librarySpawnPosition);
        velocity.set(0, 0, 0);
        jumpQueuedUntil = -Infinity;
        lastGroundedAt = -Infinity;
    }

    function animate() {
        requestAnimationFrame(animate);
        const time = performance.now();
        let delta = (time - prevTime) / 1000;
        delta = Math.min(delta, 0.05);
        frameCount++;
        if (mode === 'lobby' || mode === 'library') {
            lobbyWorld.update(time * 0.001);
        }

        if (isNaN(velocity.x) || isNaN(velocity.y) || isNaN(velocity.z)) {
            velocity.set(0, 0, 0);
        }

        if (controls.isLocked) {
            if (mode === 'lobby') {
                if (canJump) lastGroundedAt = time;
                tryConsumeJump(time);
                const friction = 10.0;
                const damping = Math.max(0, 1 - friction * delta);
                velocity.x *= damping;
                velocity.z *= damping;
                direction.z = Number(moveForward) - Number(moveBackward);
                direction.x = Number(moveRight) - Number(moveLeft);
                direction.normalize();

                if (moveForward || moveBackward) velocity.z -= direction.z * PLAYER.MOVE_FORCE * delta;
                if (moveLeft || moveRight) velocity.x -= direction.x * PLAYER.MOVE_FORCE * delta;
                applyGravity(delta);

                controls.moveRight(-velocity.x * delta);
                controls.moveForward(-velocity.z * delta);
                player.position.y += velocity.y * delta;

                const targetHeight = isSliding ? PLAYER_SLIDE_HEIGHT : PLAYER_STAND_HEIGHT;
                currentHeight += (targetHeight - currentHeight) * 10.0 * delta;
                const targetFOV = isSliding ? PLAYER.SLIDE_FOV : PLAYER.BASE_FOV;
                if (Math.abs(camera.fov - targetFOV) > 0.1) {
                    camera.fov += (targetFOV - camera.fov) * 10.0 * delta;
                    camera.updateProjectionMatrix();
                }

                const groundedInLobby = lobbyWorld.constrainPlayerToLobby(player, velocity, currentHeight, 'lobby');
                if (groundedInLobby) {
                    canJump = true;
                    lastGroundedAt = time;
                }
                const nearbyPortal = lobbyWorld.getPortalAtPosition(player.position, 'lobby', 4.2, currentHeight);
                if (nearbyPortal) {
                    interactionPrompt.innerText = `Walk through portal to enter ${nearbyPortal.title}`;
                    interactionPrompt.style.display = 'block';
                } else {
                    interactionPrompt.style.display = 'none';
                }
                if (time - lastPortalTrigger > 900) {
                    const portalHit = lobbyWorld.getPortalAtPosition(player.position, 'lobby', 1.85, currentHeight);
                    if (portalHit) {
                        if (portalHit.id === 'recordings-library') {
                            startLibraryMode();
                        } else {
                            startSelectedGame(portalHit.id);
                        }
                    }
                }
            } else if (mode === 'library') {
                if (canJump) lastGroundedAt = time;
                tryConsumeJump(time);
                const friction = 10.0;
                const damping = Math.max(0, 1 - friction * delta);
                velocity.x *= damping;
                velocity.z *= damping;
                direction.z = Number(moveForward) - Number(moveBackward);
                direction.x = Number(moveRight) - Number(moveLeft);
                direction.normalize();

                if (moveForward || moveBackward) velocity.z -= direction.z * PLAYER.MOVE_FORCE * delta;
                if (moveLeft || moveRight) velocity.x -= direction.x * PLAYER.MOVE_FORCE * delta;
                applyGravity(delta);

                controls.moveRight(-velocity.x * delta);
                controls.moveForward(-velocity.z * delta);
                player.position.y += velocity.y * delta;

                const targetHeight = isSliding ? PLAYER_SLIDE_HEIGHT : PLAYER_STAND_HEIGHT;
                currentHeight += (targetHeight - currentHeight) * 10.0 * delta;
                const targetFOV = isSliding ? PLAYER.SLIDE_FOV : PLAYER.BASE_FOV;
                if (Math.abs(camera.fov - targetFOV) > 0.1) {
                    camera.fov += (targetFOV - camera.fov) * 10.0 * delta;
                    camera.updateProjectionMatrix();
                }

                const groundedInLibrary = lobbyWorld.constrainPlayerToLobby(player, velocity, currentHeight, 'library');
                if (groundedInLibrary) {
                    canJump = true;
                    lastGroundedAt = time;
                }
                interactionPrompt.innerText = 'Walk through portal to return to lobby';
                interactionPrompt.style.display = 'block';
                if (time - lastPortalTrigger > 900) {
                    const portalHit = lobbyWorld.getPortalAtPosition(player.position, 'library', 1.85, currentHeight);
                    if (portalHit && portalHit.id === 'lobby-return') {
                        returnToLobby(true);
                    }
                }
            } else if (mode === 'lava') {
                if (canJump) lastGroundedAt = time;
                tryConsumeJump(time);
                const friction = (isSliding && canJump) ? 2.0 : 10.0;
                const damping = Math.max(0, 1 - friction * delta);
                velocity.x *= damping;
                velocity.z *= damping;
                direction.z = Number(moveForward) - Number(moveBackward);
                direction.x = Number(moveRight) - Number(moveLeft);
                direction.normalize();
                applyGravity(delta);
                canJump = false;

                if (moveForward || moveBackward) velocity.z -= direction.z * PLAYER.MOVE_FORCE * delta;
                if (moveLeft || moveRight) velocity.x -= direction.x * PLAYER.MOVE_FORCE * delta;

                controls.moveRight(-velocity.x * delta);
                controls.moveForward(-velocity.z * delta);
                player.position.y += velocity.y * delta;

                const targetHeight = isSliding ? PLAYER_SLIDE_HEIGHT : PLAYER_STAND_HEIGHT;
                currentHeight += (targetHeight - currentHeight) * 10.0 * delta;
                const targetFOV = isSliding ? PLAYER.SLIDE_FOV : PLAYER.BASE_FOV;
                if (Math.abs(camera.fov - targetFOV) > 0.1) {
                    camera.fov += (targetFOV - camera.fov) * 10.0 * delta;
                    camera.updateProjectionMatrix();
                }

                lavaParkourWorld.constrainPlayer(player, velocity, currentHeight);
                if (lavaParkourWorld.resolvePlatformCollision(player, velocity, currentHeight)) {
                    canJump = true;
                    lastGroundedAt = time;
                }
                lavaParkourWorld.updateCheckpointState(player.position);
                lavaParkourWorld.update(delta, time * 0.001);

                const lavaY = lavaParkourWorld.getLavaY();
                const elapsedMs = Math.max(0, performance.now() - lavaRunStart);
                const elapsedSeconds = (elapsedMs / 1000).toFixed(2);
                const bestText = lavaBestMs > 0 ? (lavaBestMs / 1000).toFixed(2) + 's' : '--';
                lavaHud.innerText = `Lava: ${Math.round(lavaY)} | Time: ${elapsedSeconds}s | Best: ${bestText} | Deaths: ${lavaDeaths}`;
                const playerFeetY = player.position.y - currentHeight;
                if (playerFeetY <= lavaY + 0.2) {
                    lavaDeaths += 1;
                    player.position.copy(lavaParkourWorld.getRespawnPosition());
                    velocity.set(0, 0, 0);
                }
                if (lavaParkourWorld.didReachFinish()) {
                    if (!lavaBestMs || elapsedMs < lavaBestMs) {
                        lavaBestMs = Math.round(elapsedMs);
                        localStorage.setItem(LAVA_BEST_KEY, String(lavaBestMs));
                    }
                    lavaHud.innerText = `Finished in ${(elapsedMs / 1000).toFixed(2)}s! Best: ${(lavaBestMs / 1000).toFixed(2)}s`;
                    lavaParkourWorld.reset();
                    lavaRunStart = performance.now();
                    player.position.copy(lavaParkourWorld.spawnPosition);
                    velocity.set(0, 0, 0);
                }
            } else {
            
            // Combat HUD Update
            const dashReady = (time - lastDashTime > DASH_COOLDOWN);
            combatHud.innerHTML = `<span style="font-size:16px; color:${dashReady ? '#0f0' : '#555'}">DASH [V]</span>`;

            // Snow System Follow
            if (snowSystem) {
                snowSystem.position.copy(player.position);
                snowSystem.position.y = 0;
            }

            if (isGrappling) {
                const playerPos = player.position;
                const handOffset = new THREE.Vector3(0.5, -0.5, -0.5).applyQuaternion(camera.quaternion);
                const start = playerPos.clone().add(handOffset);
                grappleLineGeo.setFromPoints([start, grapplePoint]);
                
                const dist = _grappleDir.subVectors(grapplePoint, playerPos).length();
                if (dist > 2.5) {
                    _grappleDir.normalize();
                    const pullStep = Math.min(dist - 2.5, 56 * delta);
                    player.position.addScaledVector(_grappleDir, pullStep);
                    velocity.y = Math.max(velocity.y, _grappleDir.y * 110);
                } else {
                    isGrappling = false;
                    grappleLine.visible = false;
                }
            } else {
                grappleLine.visible = false;
            }

            if (canJump) lastGroundedAt = time;
            const friction = (isSliding && canJump) ? 2.0 : 10.0;
            const damping = Math.max(0, 1 - friction * delta);
            velocity.x *= damping;
            velocity.z *= damping;
            direction.z = Number(moveForward) - Number(moveBackward);
            direction.x = Number(moveRight) - Number(moveLeft);
            direction.normalize();

            const playerPos = player.position;
            const activeLadder = towerSystem.getLadderAt(playerPos);
            if (activeLadder) {
                velocity.y = 0;
                if (moveForward) velocity.y = 25;
                if (moveBackward) velocity.y = -20;
                player.position.x += (activeLadder.position.x - player.position.x) * 0.35;
                player.position.z += (activeLadder.position.z - player.position.z) * 0.35;
                canJump = true;
                lastGroundedAt = time;
            } else {
                tryConsumeJump(time);
                applyGravity(delta);
            }

            if (!activeLadder) {
                if (moveForward || moveBackward) velocity.z -= direction.z * PLAYER.MOVE_FORCE * delta;
                if (moveLeft || moveRight) velocity.x -= direction.x * PLAYER.MOVE_FORCE * delta;
            } else {
                velocity.x *= 0.2;
                velocity.z *= 0.2;
            }

            controls.moveRight(-velocity.x * delta);
            controls.moveForward(-velocity.z * delta);
            player.position.y += velocity.y * delta;

            const targetHeight = isSliding ? PLAYER_SLIDE_HEIGHT : PLAYER_STAND_HEIGHT;
            currentHeight += (targetHeight - currentHeight) * 10.0 * delta;
            const targetFOV = isSliding ? PLAYER.SLIDE_FOV : PLAYER.BASE_FOV;
            if (Math.abs(camera.fov - targetFOV) > 0.1) {
                camera.fov += (targetFOV - camera.fov) * 10.0 * delta;
                camera.updateProjectionMatrix();
            }

            const groundHeight = getTerrainHeight(playerPos.x, playerPos.z);
            if (player.position.y < groundHeight + currentHeight) {
                velocity.y = 0;
                player.position.y = groundHeight + currentHeight;
                canJump = true;
                lastGroundedAt = time;
            }

            if (isFlipping) {
                const progress = (time - flipStartTime) / 600;
                if (progress < 1) {
                    const ease = progress * progress * (3 - 2 * progress);
                    camera.rotation.x = Math.PI * 2 * ease;
                } else {
                    camera.rotation.x = 0;
                    isFlipping = false;
                }
            }

            const playerDist = Math.hypot(player.position.x, player.position.z);
            const maxPlayerRadius = WORLD_RADIUS - 1;
            if (playerDist > maxPlayerRadius) {
                const scale = maxPlayerRadius / playerDist;
                player.position.x *= scale;
                player.position.z *= scale;
                velocity.x = 0;
                velocity.z = 0;
            }

            if (towerSystem.resolvePlayerCollisions(player, velocity, currentHeight)) {
                canJump = true;
                lastGroundedAt = time;
            }

            shieldMesh.position.copy(player.position);

            // Health Regen
            if (time - lastDamageTime > 5000 && playerHealth < 100) {
                playerHealth = Math.min(100, playerHealth + 10 * delta);
                updateHealthDisplay();
            }

            if (time - lastBotSpawn > 3000 && bots.length < 3) {
                const spawn = randomPointInWorld(WORLD_RADIUS - 30);
                const bot = createBot(spawn.x, spawn.z, getTerrainHeight);
                scene.add(bot);
                bots.push(bot);
                lastBotSpawn = time;
            }

            for (let i = 0; i < bots.length; i++) {
                const bot = bots[i];
                bot.lookAt(playerPos.x, playerPos.y, playerPos.z);
                if (bot.userData.ring) {
                    bot.userData.ring.rotation.z += 5.0 * delta;
                }

                _botDir.set(playerPos.x - bot.position.x, 0, playerPos.z - bot.position.z).normalize();
                bot.position.add(_botDir.multiplyScalar(3.5 * delta));

                const botDist = Math.hypot(bot.position.x, bot.position.z);
                const maxBotRadius = WORLD_RADIUS - 1.5;
                if (botDist > maxBotRadius) {
                    const scale = maxBotRadius / botDist;
                    bot.position.x *= scale;
                    bot.position.z *= scale;
                }
                bot.position.y = getTerrainHeight(bot.position.x, bot.position.z) + (bot.userData.heightOffset || 3.0);

                if (time - bot.lastShot > 2000) {
                    shootBotSnowball(bot, playerPos, scene, snowballs);
                    bot.lastShot = time;
                }

                if (bot.position.distanceToSquared(playerPos) < 2.25 && !isShielding) {
                    const damageMultiplier = Math.max(0.1, 1 - (playerLevel * 5) / 100);
                    playerHealth = Math.max(0, playerHealth - (20 * delta) * damageMultiplier);
                    lastDamageTime = time;
                    updateHealthDisplay();
                }
            }

            for (let i = 0; i < snowballs.length; i++) {
                const snowball = snowballs[i];
                snowball.position.addScaledVector(snowball.velocity, delta);
                if (snowball.userData.shell) {
                    snowball.userData.shell.rotation.x += 5.0 * delta;
                    snowball.userData.shell.rotation.y += 5.0 * delta;
                }

                if (towerSystem.snowballHitsStructure(snowball)) {
                    particleSystem.createExplosion(snowball.position);
                    scene.remove(snowball);
                    snowballs.splice(i, 1);
                    i--;
                    continue;
                }

                if (snowball.isEnemy) {
                    if (snowball.position.distanceToSquared(player.position) < 2.25) {
                        particleSystem.createExplosion(snowball.position);
                        if (!isShielding) {
                            const damageMultiplier = Math.max(0.1, 1 - (playerLevel * 5) / 100);
                            playerHealth = Math.max(0, playerHealth - (10 * damageMultiplier));
                            lastDamageTime = time;
                            updateHealthDisplay();
                        }
                        scene.remove(snowball);
                        snowballs.splice(i, 1);
                        i--;
                        continue;
                    }
                } else {
                    let hitBot = false;
                    for (let j = 0; j < bots.length; j++) {
                        const bot = bots[j];
                        if (snowball.position.distanceToSquared(bot.position) < 2.25) {
                            particleSystem.createExplosion(snowball.position);
                            bot.health -= snowball.damage || 25;
                            bot.healthBar.scale.x = Math.max(0, bot.health / 100);

                            if (bot.health <= 0) {
                                particleSystem.createExplosion(bot.position);
                                scene.remove(bot);
                                bots.splice(j, 1);
                                playerLevel += 1;
                                score += 100;
                                updateHealthDisplay();
                            }
                            hitBot = true;
                            break;
                        }
                    }
                    if (hitBot) {
                        scene.remove(snowball);
                        snowballs.splice(i, 1);
                        i--;
                        continue;
                    }
                }

                if (snowball.position.y <= getTerrainHeight(snowball.position.x, snowball.position.z) + 0.5 ||
                    !isInsideWorld(snowball.position.x, snowball.position.z)) {
                    particleSystem.createExplosion(snowball.position);
                    scene.remove(snowball);
                    snowballs.splice(i, 1);
                    i--;
                    continue;
                }

                if (snowball.position.distanceToSquared(player.position) > 10000) {
                    scene.remove(snowball);
                    snowballs.splice(i, 1);
                    i--;
                }
            }

            if (particleSystem) {
                particleSystem.update(delta);
            }
            }
        }

        if (mode === 'game' && frameCount % 3 === 0) {
            minimap.render(towerSystem.towers, bots, controls.getObject().position);
        }
        fpsMeter.update(delta);
        prevTime = time;
        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
