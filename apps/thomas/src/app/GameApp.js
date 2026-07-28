import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { enableTouchLook } from '../touch-look.js';
import { COMBAT, PLAYER } from './config.js';
// Default player values to prevent NaN errors if config is missing values.
const PLAYER_STAND_HEIGHT = PLAYER.STAND_HEIGHT || 5.0;
const PLAYER_SLIDE_HEIGHT = PLAYER.SLIDE_HEIGHT || 2.5;
import { createTerrainSystem } from '../features/world/terrainSystem.js';
import { createTowerSystem } from '../features/structures/towerSystem.js';
import { createHud } from '../ui/hud.js';
import { createRunSummary, loadBestRun } from '../ui/runSummary.js';
import { createFeedback } from '../ui/feedback.js';
import { createWaveRunner, killReward, clearBonus } from '../features/combat/waveSystem.js';
import { sfx, unlock as unlockAudio, setMuted, isMuted } from '../audio/sfx.js';
import { createMinimap } from '../ui/minimap.js';
import { createFpsMeter } from '../diagnostics/fpsMeter.js';
import { createAdaptiveResolution } from '../diagnostics/adaptiveResolution.js';
import { LOBBY_GAMES } from './gameRegistry.js';
import { createLobbyWorld } from '../features/lobby/lobbyWorld.js';
import { createLavaParkourWorld } from '../features/lava/lavaParkourWorld.js';
import { createVegetationSystem, createStarfield } from '../features/world/vegetationSystem.js';
import { createParticleSystem } from '../features/world/particleSystem.js';
import { createBot, shootBotSnowball, createProjectileMesh, disposeBot } from '../features/combat/combatSystem.js';
import { createShopUi, WEAPONS, UPGRADES } from '../ui/shopUi.js';

export function startGame() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x050510, 0.015);

    // The arena reaches WORLD_RADIUS in every direction, so a 1000-unit far
    // plane used to slice the corners of the map off against the sky.
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.5, 2600);
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance", stencil: false, depth: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Render scale is chosen at runtime from measured frame times rather than
    // hardcoded, so the same build stays smooth on a phone and sharp on a desktop.
    const adaptiveResolution = createAdaptiveResolution(renderer);
    renderer.shadowMap.enabled = false;
    renderer.shadowMap.type = THREE.BasicShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.0;
    document.body.appendChild(renderer.domElement);

    // PointerLockControls owns the pitch of whatever object it drives, so the
    // flip used to fight it: writing camera.rotation.x got overwritten on the
    // next mouse move and left the aim snapped somewhere else. Giving the rig
    // its own object means look-direction and stunt-rotation stop sharing an
    // axis -- `aim` is the player and is what controls steers, while `camera`
    // rides along as its child and is free to tumble.
    const aim = new THREE.Object3D();
    aim.position.set(0, PLAYER_STAND_HEIGHT, 20);
    aim.add(camera);
    scene.add(aim);

    const light = new THREE.DirectionalLight(0xffffff, 2.0);
    light.position.set(20, 50, 20);
    light.castShadow = false;
    scene.add(light);

    // The old ground colour was nearly black, so every surface facing away from
    // the sun crushed to a silhouette -- trees and towers rendered as cut-outs.
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x2b3550, 0.85);
    scene.add(hemiLight);

    // Everything belonging to the snowball arena hangs off one group. The lobby
    // and lava worlds already had their own, but the arena used to be parented
    // straight to the scene, so its terrain, trees, rocks and starfield were
    // still drawn while you stood in the lobby -- which is why stars showed
    // through the lobby walls and an idle menu ran at ~23fps.
    const arenaGroup = new THREE.Group();
    scene.add(arenaGroup);

    createStarfield(arenaGroup);

    const terrain = createTerrainSystem(arenaGroup);
    const { WORLD_RADIUS, getTerrainHeight, randomPointInWorld, isInsideWorld } = terrain;

    const vegSystem = createVegetationSystem(arenaGroup, getTerrainHeight);
    const snowSystem = vegSystem ? vegSystem.snowSystem : null;

    const towerSystem = createTowerSystem(arenaGroup, getTerrainHeight, randomPointInWorld, WORLD_RADIUS);
    // Solid, climbable geometry -- what the grapple is allowed to catch on.
    const grappleTargets = [terrain.terrainMesh, ...towerSystem.towers, ...towerSystem.bridges];
    const lobbyWorld = createLobbyWorld(scene, LOBBY_GAMES);
    const lavaParkourWorld = createLavaParkourWorld(scene);

    // The interiors are small enough that the original dense fog never showed,
    // but in a 900-unit arena it hid the map from about 100 units out.
    const FOG_DENSITY = { lobby: 0.015, library: 0.015, arena: 0.0035, lava: 0.015 };

    // Single place that decides which world is on screen, so a mode can never
    // leave another world's geometry rendering behind it.
    function setActiveWorld(name) {
        arenaGroup.visible = name === 'arena';
        lobbyWorld.setVisible(name === 'lobby' || name === 'library');
        lavaParkourWorld.setVisible(name === 'lava');
        scene.fog.density = FOG_DENSITY[name] ?? FOG_DENSITY.lobby;
    }
    setActiveWorld('lobby');

    const controls = new PointerLockControls(aim, document.body);

    // --- GRAPPLE HOOK ---
    let isGrappling = false;
    const grapplePoint = new THREE.Vector3();
    const grappleRaycaster = new THREE.Raycaster();
    grappleRaycaster.far = 200;
    const _screenCentre = new THREE.Vector2(0, 0);
    const grappleLineMat = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const grappleLineGeo = new THREE.BufferGeometry();
    const grappleLine = new THREE.Line(grappleLineGeo, grappleLineMat);
    grappleLine.frustumCulled = false;
    grappleLine.visible = false;
    arenaGroup.add(grappleLine);

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

    setInstructionsText('Click to Enter Lobby', 'WASD move  ·  SPACE jump  ·  SHIFT slide  ·  V dash  ·  E grapple  ·  F flip  ·  B workshop  ·  M mute');

    let useMic = false;
    let micStream = null;

    function releaseMicStream() {
        if (!micStream) return;
        micStream.getTracks().forEach((track) => track.stop());
        micStream = null;
    }
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
                // Held onto rather than discarded: the old code opened a stream
                // here purely to trigger the permission prompt, then opened a
                // second one to record with and never stopped either, so the
                // browser's "mic in use" indicator stayed lit for good.
                micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                useMic = true;
                micBtn.innerText = 'Microphone: ON';
                micBtn.style.backgroundColor = '#44ff44';
            } catch (err) {
                alert('Microphone access denied. Please allow permission.');
            }
        } else {
            useMic = false;
            releaseMicStream();
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

            if (useMic && micStream) {
                finalStream = new MediaStream([
                    ...canvasStream.getVideoTracks(),
                    ...micStream.getAudioTracks()
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
                canvasStream.getTracks().forEach(track => track.stop());
            };
            mediaRecorder.start();
        } catch (e) {
            console.warn('MediaRecorder setup failed', e);
        }
    }

    // Phones and tablets can't pointer-lock, so tap-to-play plus drag-to-look
    // stands in for it; on a mouse this returns null and lock works as before.
    const touchLook = enableTouchLook({
        controls,
        camera: aim,
        domElement: renderer.domElement,
        blocker: instructions,
    });

    instructions.addEventListener('click', () => {
        if (!touchLook) controls.lock();
    });
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

    // Leaving the arena has to take its live entities with it, or they pile up
    // across visits and the bot cap silently blocks new spawns.
    function clearArenaEntities() {
        for (const bot of bots) {
            arenaGroup.remove(bot);
            disposeBot(bot);
        }
        bots.length = 0;
        for (const snowball of snowballs) arenaGroup.remove(snowball);
        snowballs.length = 0;
    }

    function returnToLobby(keepLocked = false) {
        if (mode !== 'game' && mode !== 'library' && mode !== 'lava') return;
        mode = 'lobby';
        setActiveWorld('lobby');
        interactionPrompt.style.display = 'none';
        combatHud.style.display = 'none';
        hud.setVisible(false);
        minimap.canvas.style.display = 'none';
        lavaHud.style.display = 'none';
        libraryContainer.style.display = 'none';
        setInstructionsText('Click to Enter Lobby', 'WASD move  ·  SPACE jump  ·  SHIFT slide  ·  V dash  ·  E grapple  ·  F flip  ·  B workshop  ·  M mute');
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
        wantsShield = false;
        wantsToFire = false;
        shieldMesh.visible = false;
        isGrappling = false;
        grappleLine.visible = false;
        runActive = false;
        playerDead = false;
        runSummary.hide();
        feedback.hideAll();
        feedback.setCritical(false);
        clearArenaEntities();
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
        if (!keepLocked && controls.isLocked) {
            if (touchLook) touchLook.setLocked(false);
            else controls.unlock();
        }
    }

    lobbyReturnBtn.onclick = (e) => {
        e.stopPropagation();
        returnToLobby();
    };

    controls.addEventListener('lock', () => {
        // Browsers only allow audio to start from a real interaction, and the
        // click that grabs pointer lock is the first one we're guaranteed.
        unlockAudio();
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
        // A finished run has its own screen; a "Paused / Click to Continue"
        // panel on top of it would be nonsense.
        if (playerDead) {
            instructions.style.display = 'none';
            combatHud.style.display = 'none';
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
            setInstructionsText('Click to Enter Lobby', 'WASD move  ·  SPACE jump  ·  SHIFT slide  ·  V dash  ·  E grapple  ·  F flip  ·  B workshop  ·  M mute');
            libraryContainer.style.display = 'none';
            lobbyReturnBtn.style.display = 'none';
            lavaHud.style.display = 'none';
        }
        isShielding = false;
        wantsShield = false;
        wantsToFire = false;
        shieldMesh.visible = false;
        combatHud.style.display = 'none';
        isGrappling = false;
        grappleLine.visible = false;
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
    });

    const hud = createHud();
    const minimap = createMinimap(WORLD_RADIUS);
    const fpsMeter = createFpsMeter();
    const feedback = createFeedback(camera);
    minimap.canvas.style.display = 'none';

    // ── run state ──────────────────────────────────────────────────────────
    // A "run" is one attempt at the wave ladder. Everything here resets when a
    // new run starts; nothing carries over, so every attempt is a fair comparison.
    const BASE_MAX_HEALTH = 100;
    const waveRunner = createWaveRunner();
    const upgradeLevels = { parka: 0, warmers: 0, rations: 0 };

    let runActive = false;
    let playerDead = false;
    let maxHealth = BASE_MAX_HEALTH;
    let playerHealth = BASE_MAX_HEALTH;
    let score = 0;
    let kills = 0;
    let shotsFired = 0;
    let shotsHit = 0;
    let runStartedAt = 0;
    let lastDashTime = 0;
    const DASH_COOLDOWN = 1500;
    const DASH_SPEED = 420;
    let lastDamageTime = 0;

    function upgradeCount(id) {
        return upgradeLevels[id] || 0;
    }

    // Damage reduction is bought, not accrued. The old code handed out 5% per
    // kill with no ceiling, so by roughly level 20 the player was untouchable
    // and the rest of the run had no stakes.
    function incomingDamageMultiplier() {
        return Math.max(0.3, 1 - upgradeCount('parka') * 0.12);
    }

    function refreshHud() {
        hud.updateHealth(playerHealth, maxHealth);
        hud.updateScore(score, kills, upgradeCount('parka'), upgradeCount('warmers'), upgradeCount('rations'));
    }

    function damagePlayer(amount, { shake = 0.5 } = {}) {
        if (playerDead || isShielding) return;
        const dealt = amount * incomingDamageMultiplier();
        playerHealth = Math.max(0, playerHealth - dealt);
        lastDamageTime = performance.now();
        feedback.flashDamage(Math.min(1, dealt / 18));
        feedback.shake(shake);
        sfx.playerHurt();
        refreshHud();
        if (playerHealth <= 0) endRun();
    }

    function startRun() {
        const now = performance.now();
        clearArenaEntities();
        waveRunner.reset(now);
        for (const key of Object.keys(upgradeLevels)) upgradeLevels[key] = 0;
        maxHealth = BASE_MAX_HEALTH;
        playerHealth = BASE_MAX_HEALTH;
        score = 0;
        kills = 0;
        shotsFired = 0;
        shotsHit = 0;
        runStartedAt = now;
        runActive = true;
        playerDead = false;
        unlockedWeapons = [0];
        currentWeaponIndex = 0;
        player.position.set(0, PLAYER.STAND_HEIGHT, 20);
        velocity.set(0, 0, 0);
        jumpQueuedUntil = -Infinity;
        lastGroundedAt = -Infinity;
        shieldEnergy = SHIELD_MAX;
        shieldBroken = false;
        wantsShield = false;
        wantsToFire = false;
        lastShotAt = -Infinity;
        fireQueuedUntil = -Infinity;
        feedback.hideAll();
        feedback.showBanner('HOLD THE CITADEL', 'Wave 1 incoming', 2600);
        refreshHud();
        hud.updateWave(0, 0, 4);
        hud.setVisible(true);
    }

    function endRun() {
        if (playerDead) return;
        playerDead = true;
        runActive = false;
        feedback.hideAll();
        feedback.setCritical(false);
        sfx.gameOver();
        clearArenaEntities();
        hud.setVisible(false);
        if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
        if (controls.isLocked) {
            if (touchLook) touchLook.setLocked(false);
            else controls.unlock();
        }
        runSummary.show({
            wave: waveRunner.waveNumber,
            kills,
            score: Math.floor(score),
            shots: shotsFired,
            hits: shotsHit,
            survivedMs: performance.now() - runStartedAt
        });
    }

    const runSummary = createRunSummary({
        onRetry: () => {
            startRun();
            if (touchLook) touchLook.setLocked(true);
            else controls.lock();
        },
        onReturnToLobby: () => {
            playerDead = false;
            returnToLobby();
        }
    });

    const shopUi = createShopUi(
        controls,
        (index) => { currentWeaponIndex = index; },
        (index, cost) => {
            if (score < cost) { sfx.denied(); return false; }
            score -= cost;
            sfx.purchase();
            refreshHud();
            return true;
        },
        (id, cost) => {
            if (score < cost) { sfx.denied(); return false; }
            score -= cost;
            upgradeLevels[id] = upgradeCount(id) + 1;
            if (id === 'rations') {
                // Buying max health grants the new headroom immediately, so it
                // reads as a heal rather than an empty bar extension.
                maxHealth = BASE_MAX_HEALTH + upgradeCount('rations') * 25;
                playerHealth = Math.min(maxHealth, playerHealth + 25);
            }
            sfx.purchase();
            refreshHud();
            return true;
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
    const SNOWBALL_MAX_RANGE_SQ = 900 * 900;
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
        sfx.jump();
        return true;
    }

    function updateStanceAndFov(delta) {
        const targetHeight = isSliding ? PLAYER_SLIDE_HEIGHT : PLAYER_STAND_HEIGHT;
        currentHeight += (targetHeight - currentHeight) * 10.0 * delta;
        const targetFOV = isSliding ? PLAYER.SLIDE_FOV : PLAYER.BASE_FOV;
        if (Math.abs(camera.fov - targetFOV) > 0.1) {
            camera.fov += (targetFOV - camera.fov) * 10.0 * delta;
            camera.updateProjectionMatrix();
        }
    }

    // Every mode moves the player identically; this used to be the same ~40
    // lines copy-pasted into the lobby, library, lava and arena branches, so a
    // fix to one of them silently left the other three behind.
    //
    // Callers run their own ground/collision pass afterwards and set `canJump`
    // from it. `slideFriction` is for the modes that let you keep speed in a
    // slide; `ladder` overrides normal movement with a climb.
    function updatePlayerMovement(delta, time, { slideFriction = false, ladder = null } = {}) {
        if (canJump) lastGroundedAt = time;

        const friction = (slideFriction && isSliding && canJump) ? 2.0 : 10.0;
        const damping = Math.max(0, 1 - friction * delta);
        velocity.x *= damping;
        velocity.z *= damping;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (ladder) {
            velocity.y = 0;
            if (moveForward) velocity.y = 25;
            if (moveBackward) velocity.y = -20;
            player.position.x += (ladder.position.x - player.position.x) * 0.35;
            player.position.z += (ladder.position.z - player.position.z) * 0.35;
            velocity.x *= 0.2;
            velocity.z *= 0.2;
            canJump = true;
            lastGroundedAt = time;
        } else {
            tryConsumeJump(time);
            applyGravity(delta);
            // Cleared every frame so walking off a ledge can't leave you with a
            // stale mid-air jump; the caller's ground check restores it, and
            // coyote time still covers the honest last-moment jump.
            canJump = false;
            if (moveForward || moveBackward) velocity.z -= direction.z * PLAYER.MOVE_FORCE * delta;
            if (moveLeft || moveRight) velocity.x -= direction.x * PLAYER.MOVE_FORCE * delta;
        }

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
        player.position.y += velocity.y * delta;

        updateStanceAndFov(delta);
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
                // Dash along the ground you're facing, not the full look
                // vector -- aiming up used to fling you clean out of the map.
                const dashDir = new THREE.Vector3();
                player.getWorldDirection(dashDir);
                dashDir.y = 0;
                if (dashDir.lengthSq() < 1e-6) dashDir.set(0, 0, -1);
                dashDir.normalize();
                velocity.addScaledVector(dashDir, DASH_SPEED);
                velocity.y = Math.max(velocity.y, 20); // small hop
                sfx.dash();
                feedback.shake(0.3);
            }
        }
        if (e.code === 'KeyM') {
            setMuted(!isMuted());
            feedback.showBanner('', isMuted() ? 'Sound off' : 'Sound on', 1100);
        }
        if (e.code === 'KeyB' && mode === 'game') {
            if (shopUi && shopUi.isOpen()) {
                shopUi.toggleShop(false);
            } else if (shopUi) {
                shopUi.updateState(score, unlockedWeapons, currentWeaponIndex, upgradeLevels);
                shopUi.toggleShop(true);
                instructions.style.display = 'none';
            }
        }
        if (e.code === 'KeyE' && mode === 'game') {
            grappleRaycaster.setFromCamera(_screenCentre, camera);
            // Only the things worth grappling to. This used to walk the whole
            // arena recursively -- snowfall, starfield and every merged scenery
            // mesh included -- on each press, which hitched the frame.
            const intersects = grappleRaycaster.intersectObjects(grappleTargets, false);
            for (const hit of intersects) {
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

    const particleSystem = createParticleSystem(arenaGroup);

    const shieldGeometry = new THREE.SphereGeometry(1.5, 32, 32);
    const shieldMaterial = new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
    const shieldMesh = new THREE.Mesh(shieldGeometry, shieldMaterial);
    shieldMesh.visible = false;
    arenaGroup.add(shieldMesh);
    let isShielding = false;
    let wantsShield = false;
    let wantsToFire = false;
    let lastShotAt = -Infinity;
    let fireQueuedUntil = -Infinity;
    const FIRE_BUFFER_MS = 220;

    // The shield used to be free and unlimited: holding right click made you
    // immune for the whole run, which cancelled the entire difficulty curve.
    // It's now a short, recharging burst you have to spend deliberately.
    const SHIELD_MAX = 100;
    const SHIELD_DRAIN_PER_SEC = 55;      // ~1.8s of uptime from full
    const SHIELD_RECHARGE_PER_SEC = 32;
    const SHIELD_RECHARGE_DELAY_MS = 900;
    const SHIELD_MIN_TO_RAISE = 25;       // must recover this much after a break
    let shieldEnergy = SHIELD_MAX;
    let shieldBroken = false;
    let shieldLoweredAt = -Infinity;

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

    // Both buttons only record intent. The arena loop decides whether a shot is
    // off cooldown and whether the shield still has the energy to be up, so the
    // rate of fire can't be beaten by clicking faster.
    document.addEventListener('mousedown', (event) => {
        if (!controls.isLocked || mode !== 'game') return;
        if (playerDead) return;
        if (event.button === 0) {
            wantsToFire = true;
            // A quick tap can begin and end between two frames, so latch it the
            // same way jumps are buffered -- otherwise clicking rather than
            // holding would throw nothing at all.
            fireQueuedUntil = performance.now() + FIRE_BUFFER_MS;
        }
        else if (event.button === 2) wantsShield = true;
    });

    document.addEventListener('mouseup', (event) => {
        if (mode !== 'game') return;
        if (event.button === 0) wantsToFire = false;
        else if (event.button === 2) wantsShield = false;
    });
    document.addEventListener('contextmenu', (event) => event.preventDefault());

    let prevTime = performance.now();

    // Waves arrive from somewhere you can see. The old spawner picked any point
    // in a 900-unit world, so most snowmen spent the whole wave walking toward
    // you across empty ground and a lot of them never arrived at all.
    const _spawnPoint = { x: 0, z: 0 };
    function spawnPointNearPlayer(playerPos) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 58 + Math.random() * 46;
        let x = playerPos.x + Math.cos(angle) * distance;
        let z = playerPos.z + Math.sin(angle) * distance;
        // Fold anything that lands outside the arena back in along the same ray.
        const fromCentre = Math.hypot(x, z);
        const limit = WORLD_RADIUS - 30;
        if (fromCentre > limit) {
            const scale = limit / fromCentre;
            x *= scale;
            z *= scale;
        }
        _spawnPoint.x = x;
        _spawnPoint.z = z;
        return _spawnPoint;
    }

    function startSelectedGame(gameId) {
        lastPortalTrigger = performance.now();
        if (gameId === LOCAL_GAME_ID) {
            mode = 'game';
            setActiveWorld('arena');
            clearArenaEntities();
            interactionPrompt.style.display = 'none';
            hud.setVisible(true);
            minimap.canvas.style.display = 'block';
            lavaHud.style.display = 'none';
            libraryContainer.style.display = 'none';
            instructions.style.display = 'none';
            combatHud.style.display = 'block';
            startRun();
            if (controls.isLocked) {
                startRecording();
            }
        } else if (gameId === LAVA_GAME_ID) {
            mode = 'lava';
            setActiveWorld('lava');
            lavaParkourWorld.reset();
            lavaRunStart = performance.now();
            lavaDeaths = 0;
            interactionPrompt.style.display = 'none';
            hud.setVisible(false);
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
        setActiveWorld('library');
        interactionPrompt.style.display = 'none';
        hud.setVisible(false);
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
                updatePlayerMovement(delta, time);

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
                updatePlayerMovement(delta, time);

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
                updatePlayerMovement(delta, time, { slideFriction: true });

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
            
            const weapon = WEAPONS[currentWeaponIndex];

            // Rate-limited fire. Holding the button throws at the weapon's own
            // cadence, so the Ice Dart's speed and the Glacier Orb's punch are
            // an actual trade instead of "click as fast as you physically can".
            const firing = wantsToFire || time <= fireQueuedUntil;
            if (firing && !playerDead && time - lastShotAt >= weapon.fireRate) {
                const snowball = createSnowball();
                snowballs.push(snowball);
                arenaGroup.add(snowball);
                shotsFired += 1;
                lastShotAt = time;
                fireQueuedUntil = -Infinity;
                sfx.throwSnowball();
            }

            // Shield energy: drains while up, recharges after a beat once lowered,
            // and a full drain breaks it until it has recovered enough to re-raise.
            const shieldAvailable = !shieldBroken && shieldEnergy > 0 && !playerDead;
            isShielding = wantsShield && shieldAvailable;
            if (isShielding) {
                shieldEnergy = Math.max(0, shieldEnergy - SHIELD_DRAIN_PER_SEC * delta);
                shieldLoweredAt = time;
                if (shieldEnergy <= 0) {
                    shieldBroken = true;
                    isShielding = false;
                    sfx.shieldBreak();
                    feedback.shake(0.45);
                    feedback.showBanner('', 'Shield broken', 900);
                }
            } else if (time - shieldLoweredAt > SHIELD_RECHARGE_DELAY_MS) {
                shieldEnergy = Math.min(SHIELD_MAX, shieldEnergy + SHIELD_RECHARGE_PER_SEC * delta);
                if (shieldBroken && shieldEnergy >= SHIELD_MIN_TO_RAISE) shieldBroken = false;
            }
            shieldMesh.visible = isShielding;
            if (isShielding) {
                // Fades from blue to red as it runs down, so the wearer can see
                // it failing without looking away from the fight.
                shieldMaterial.color.setHSL(0.55 * (shieldEnergy / SHIELD_MAX), 0.85, 0.55);
            }
            hud.updateShield(shieldEnergy, SHIELD_MAX, isShielding, shieldBroken);

            // Combat HUD Update
            const dashReady = (time - lastDashTime > DASH_COOLDOWN);
            combatHud.innerHTML =
                `<span style="font-size:15px;color:#9fd0ff">${weapon.name}</span>` +
                `<span style="font-size:16px;color:${dashReady ? '#0f0' : '#555'};margin-left:14px">DASH [V]</span>`;

            // Snow System Follow
            if (snowSystem) {
                snowSystem.position.copy(player.position);
                snowSystem.position.y = 0;
            }

            if (isGrappling) {
                const playerPos = player.position;
                const handOffset = new THREE.Vector3(0.5, -0.5, -0.5).applyQuaternion(aim.quaternion);
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

            const playerPos = player.position;
            const activeLadder = towerSystem.getLadderAt(playerPos);
            updatePlayerMovement(delta, time, { slideFriction: true, ladder: activeLadder });

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

            // Out-of-combat regen. Hand Warmers make the breather between waves
            // meaningfully shorter, which is most of why they're worth buying.
            const regenDelay = 5000 - upgradeCount('warmers') * 900;
            if (time - lastDamageTime > regenDelay && playerHealth < maxHealth) {
                const regenRate = 8 + upgradeCount('warmers') * 8;
                playerHealth = Math.min(maxHealth, playerHealth + regenRate * delta);
                refreshHud();
            }

            // Health is low enough that the next hit could matter -- say so.
            feedback.setCritical(!playerDead && playerHealth > 0 && playerHealth / maxHealth <= 0.25);

            // ── wave progression ───────────────────────────────────────────
            if (runActive) {
                const waveEvents = waveRunner.update(time, bots.length);

                if (waveEvents.waveStarted) {
                    sfx.waveStart();
                    feedback.showBanner(`WAVE ${waveRunner.waveNumber}`, `${waveRunner.totalThisWave} snowmen inbound`);
                }

                if (waveEvents.spawn) {
                    const spawn = spawnPointNearPlayer(playerPos);
                    const bot = createBot(spawn.x, spawn.z, getTerrainHeight, waveRunner.config);
                    arenaGroup.add(bot);
                    bots.push(bot);
                }

                if (waveEvents.waveCleared) {
                    const bonus = clearBonus(waveRunner.waveNumber);
                    score += bonus;
                    sfx.waveCleared();
                    feedback.showBanner(`WAVE ${waveRunner.waveNumber} CLEARED`, `+${bonus} score  ·  press B to spend it`, 2600);
                    refreshHud();
                }

                hud.updateWave(waveRunner.waveNumber, waveRunner.remaining, waveEvents.secondsToNextWave);
            }

            for (let i = 0; i < bots.length; i++) {
                const bot = bots[i];
                bot.lookAt(playerPos.x, playerPos.y, playerPos.z);
                if (bot.userData.ring) {
                    bot.userData.ring.rotation.z += 5.0 * delta;
                }

                _botDir.set(playerPos.x - bot.position.x, 0, playerPos.z - bot.position.z).normalize();
                bot.position.add(_botDir.multiplyScalar((bot.speed || 3.5) * delta));

                // Light mutual repulsion. Without it a wave converges into one
                // stack of overlapping snowmen that reads as a single enemy.
                for (let j = i + 1; j < bots.length; j++) {
                    const other = bots[j];
                    const dx = other.position.x - bot.position.x;
                    const dz = other.position.z - bot.position.z;
                    const distSq = dx * dx + dz * dz;
                    if (distSq > 0.0001 && distSq < 9) {
                        const dist = Math.sqrt(distSq);
                        const push = (3 - dist) * 0.5 * delta * 6;
                        const nx = dx / dist;
                        const nz = dz / dist;
                        bot.position.x -= nx * push;
                        bot.position.z -= nz * push;
                        other.position.x += nx * push;
                        other.position.z += nz * push;
                    }
                }

                const botDist = Math.hypot(bot.position.x, bot.position.z);
                const maxBotRadius = WORLD_RADIUS - 1.5;
                if (botDist > maxBotRadius) {
                    const scale = maxBotRadius / botDist;
                    bot.position.x *= scale;
                    bot.position.z *= scale;
                }
                bot.position.y = getTerrainHeight(bot.position.x, bot.position.z) + (bot.userData.heightOffset || 3.0);

                if (time - bot.lastShot > (bot.fireRate || 2000)) {
                    shootBotSnowball(bot, playerPos, arenaGroup, snowballs, 8 + waveRunner.waveNumber);
                    bot.lastShot = time;
                }

                // Compared in the horizontal plane: the bot's origin sits about
                // 2.85 units below the camera, so the old 3D check could never
                // drop under its 1.5-unit threshold and melee never once fired.
                const botTouchDistSq = (bot.position.x - playerPos.x) ** 2 + (bot.position.z - playerPos.z) ** 2;
                const botTouchDy = Math.abs(bot.position.y - playerPos.y);
                if (botTouchDistSq < 4.0 && botTouchDy < 5.0) {
                    damagePlayer(22 * delta, { shake: 0.12 });
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
                    arenaGroup.remove(snowball);
                    snowballs.splice(i, 1);
                    i--;
                    continue;
                }

                if (snowball.isEnemy) {
                    if (snowball.position.distanceToSquared(player.position) < 2.25) {
                        particleSystem.createExplosion(snowball.position);
                        damagePlayer(snowball.damage || 10, { shake: 0.55 });
                        arenaGroup.remove(snowball);
                        snowballs.splice(i, 1);
                        i--;
                        continue;
                    }
                } else {
                    let hitBot = false;
                    for (let j = 0; j < bots.length; j++) {
                        const bot = bots[j];
                        // Slightly generous, and measured against the bot's chest
                        // rather than its base, so shots that visibly connect count.
                        const hitRadiusSq = 3.2 * (bot.scale.x || 1) ** 2;
                        if (snowball.position.distanceToSquared(bot.position) < hitRadiusSq) {
                            particleSystem.createExplosion(snowball.position);
                            bot.health -= snowball.damage || 25;
                            bot.healthBar.scale.x = Math.max(0, bot.health / bot.maxHealth);
                            shotsHit += 1;
                            feedback.showHitMarker();
                            sfx.hit();

                            if (bot.health <= 0) {
                                particleSystem.createExplosion(bot.position);
                                arenaGroup.remove(bot);
                                disposeBot(bot);
                                bots.splice(j, 1);
                                kills += 1;
                                waveRunner.recordKill();
                                const reward = killReward(waveRunner.waveNumber);
                                score += reward;
                                feedback.scorePopup(`+${reward}`);
                                feedback.shake(0.16);
                                sfx.kill();
                                refreshHud();
                            }
                            hitBot = true;
                            break;
                        }
                    }
                    if (hitBot) {
                        arenaGroup.remove(snowball);
                        snowballs.splice(i, 1);
                        i--;
                        continue;
                    }
                }

                if (snowball.position.y <= getTerrainHeight(snowball.position.x, snowball.position.z) + 0.5 ||
                    !isInsideWorld(snowball.position.x, snowball.position.z)) {
                    particleSystem.createExplosion(snowball.position);
                    arenaGroup.remove(snowball);
                    snowballs.splice(i, 1);
                    i--;
                    continue;
                }

                // Backstop for anything that escapes the terrain and world
                // bounds checks. The old limit was 100 units, so shots
                // evaporated mid-flight in a 900-unit arena.
                if (snowball.position.distanceToSquared(player.position) > SNOWBALL_MAX_RANGE_SQ) {
                    arenaGroup.remove(snowball);
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
        // Runs outside the isLocked branch so a shake still settles while paused.
        feedback.update(delta);
        adaptiveResolution.update(delta, time);
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
