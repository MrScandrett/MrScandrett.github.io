window.onload = function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const healthEl = document.getElementById('health');
    const storyBox = document.getElementById('story-box');
    const storyText = document.getElementById('story-text');
    const startScreen = document.getElementById('start-screen');
    const storeMenu = document.getElementById('store-menu');
    const storeItemsContainer = document.getElementById('store-items');

    const surfaceBackgrounds = {
        day: new Image(),
        night: new Image()
    };
    const surfaceBackgroundReady = { day: false, night: false };
    surfaceBackgrounds.day.onload = () => { surfaceBackgroundReady.day = true; };
    surfaceBackgrounds.night.onload = () => { surfaceBackgroundReady.night = true; };
    surfaceBackgrounds.day.src = 'sprites/surface-day.png';
    surfaceBackgrounds.night.src = 'sprites/surface-night.png';

    // Use Virtual Resolution for Pixel Art Look
    canvas.width = V_WIDTH;
    canvas.height = V_HEIGHT;

    function resizeCanvas() {
        // Keep internal resolution fixed, scale canvas to fit viewport
        canvas.width = V_WIDTH;
        canvas.height = V_HEIGHT;
        const scale = Math.min(window.innerWidth / V_WIDTH, window.innerHeight / V_HEIGHT);
        canvas.style.width = `${Math.floor(V_WIDTH * scale)}px`;
        canvas.style.height = `${Math.floor(V_HEIGHT * scale)}px`;
    }

    // Handle window resizing
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    let score = 0;
    let gameState = 'START'; // 'START', 'PLAYING', 'STORY', 'CAVE', 'GAMEOVER', 'HUMAN', 'WIN'
    let storyIndex = 0;
    let frameCount = 0;
    
    let worldMap = [];
    let camera = { x: 0, y: 0 };
    let particles = [];
    let showStore = false;
    let caveUnlocked = false;
    let caveHintShown = false;
    let potionConsumed = false;
    let cavePotionCharge = 0;

    const CAVE_UNLOCK_SCORE = 15;
    const CAVE_POS = {
        x: MAP_WIDTH * TILE_SIZE - 240,
        y: MAP_HEIGHT * TILE_SIZE - 220
    };
    const CAVE_RADIUS = 36;
    const CAVE_DOOR_RADIUS = 18;
    const CAVE_HINT_RADIUS = 200;
    const CAVE_PLAYER_START = { x: V_WIDTH * 0.28, y: V_HEIGHT * 0.72 };
    const CAVE_POTION_POS = { x: V_WIDTH * 0.68, y: V_HEIGHT * 0.64 };
    const CAVE_POTION_RADIUS = 12;
    const CAVE_BOUNDS = { left: 24, right: V_WIDTH - 24, top: 24, bottom: V_HEIGHT - 24 };

    // --- STORY EVENTS ---
    const storyEvents = [
        { score: 0, text: "Melissa: 'The Sea Cave holds my answer. Swim upward with speed—and hold Shift—to breach the surface.'" }
    ];

    // --- PLAYER SETTINGS ---
    let player = { 
        x: 0, y: 0, 
        vel: { x: 0, y: 0 },
        width: 20, height: 20, radius: 8,
        angle: 0, facing: 1,
        speed: 0, tailPhase: 0,
        currency: 0,
        equippedWeapon: 'NONE',
        attackCooldown: 0, attackTimer: 0,
        health: 3, maxHealth: 3,
        oxygen: 100,
        invulnTimer: 0,
        shockTimer: 0,
        dashTimer: 0,
        airborneFromBreach: false,
        appearance: { 
            skinColor: '#d99578',
            finColor: '#0f8a9d',
            hairColor: '#39245f',
            hairType: 'LONG',
            eyeType: 'FOCUSED',
            mouthType: 'STERN'
        }
    };

    let items = [];
    let enemies = [];
    let wildlife = [];
    const keys = {};

    // Start Game Loop immediately
    requestAnimationFrame(gameLoop);

    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (gameState === 'START' && e.code === 'Enter') {
            startScreen.style.display = 'none';
            audioManager.init(); // Initialize audio context on user gesture
            resetGame();
        } else if (gameState === 'GAMEOVER' && e.code === 'Enter') {
            resetGame();
        } else if (gameState === 'WIN' && e.code === 'Enter') {
            resetGame();
        } else if (gameState === 'HUMAN' && e.code === 'Enter') {
            resetGame();
        } else if (gameState === 'STORY' && e.code === 'Enter') {
            storyBox.style.display = 'none';
            gameState = 'PLAYING';
        } else if (gameState === 'PLAYING' && e.code === 'KeyB') {
            toggleStore();
        } else if (gameState === 'PLAYING' && e.code === 'Space') {
            performAttack();
        } else if (gameState === 'PLAYING' && e.code === 'KeyE') {
            tryEnterCave();
        }

        // Character Select Inputs
        if (gameState === 'CHARACTER_SELECT') {
            if (e.code === 'KeyR') randomizeAppearance();
        }
    });
    window.addEventListener('keyup', (e) => keys[e.code] = false);

    // Mouse interaction for Character Select
    canvas.addEventListener('click', (e) => {
        if (gameState !== 'CHARACTER_SELECT') return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = V_WIDTH / rect.width;
        const scaleY = V_HEIGHT / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        // Simple hit detection for buttons (approximate coordinates based on draw)
        if (y > 160 && y < 220) {
            randomizeAppearance();
        }
    });

    function randomizeAppearance() {
        const randArr = (arr) => arr[Math.floor(Math.random() * arr.length)];
        
        player.appearance.skinColor = randArr(SKIN_COLORS);
        player.appearance.finColor = randArr(FIN_COLORS);
        player.appearance.hairColor = randArr(HAIR_COLORS);
        player.appearance.hairType = randArr(APPEARANCE_OPTIONS.HAIR);
        player.appearance.eyeType = randArr(APPEARANCE_OPTIONS.EYES);
        player.appearance.mouthType = randArr(APPEARANCE_OPTIONS.MOUTHS);
    }

    function toggleStore() {
        showStore = !showStore;
        storeMenu.style.display = showStore ? 'block' : 'none';
        if (showStore) renderStoreItems();
    }

    function resetGame() {
        score = 0;
        storyIndex = 0;
        scoreEl.innerText = score;
        
        // Reset Player Stats but keep appearance
        player.currency = 0;
        player.equippedWeapon = 'NONE';
        healthEl.innerText = 3;
        items = [];
        enemies = [];
        wildlife = [];
        particles = [];
        
        // Generate New World
        worldMap = generateMap();
        items = generateFlora(worldMap);
        wildlife = generateWildlife(worldMap);
        
        // Spawn Player in the middle (surface)
        const cx = Math.floor(MAP_WIDTH / 2) * TILE_SIZE;
        player.x = cx;
        player.y = 200; // Start near top
        player.vel = { x: 0, y: 0 };
        player.facing = 1;
        player.health = 3;
        player.oxygen = 100;
        player.invulnTimer = 0;
        player.airborneFromBreach = false;
        camera.x = Math.max(0, Math.min(player.x - V_WIDTH / 2, MAP_WIDTH * TILE_SIZE - V_WIDTH));
        camera.y = Math.max(-100, Math.min(player.y - V_HEIGHT / 2, MAP_HEIGHT * TILE_SIZE - V_HEIGHT));
        caveUnlocked = false;
        caveHintShown = false;
        potionConsumed = false;
        cavePotionCharge = 0;
        
        // Add some initial enemies
        for(let i=0; i<10; i++) {
            spawnEnemy();
        }
        
        gameState = 'PLAYING';
        
        // Reset Story
        storyBox.style.display = 'none';
        checkStoryTrigger();
    }

    function spawnEnemy() {
        const x = Math.random() * MAP_WIDTH * TILE_SIZE;
        const y = 200 + Math.random() * (MAP_HEIGHT * TILE_SIZE - 200);
        
        const tileY = Math.floor(y / TILE_SIZE);
        let type = 'PIRATE_SCUBA';
        let w = 20, h = 20;
        
        if (tileY >= 70 && tileY < 130) { type = 'JELLYFISH'; w=20; h=20; }
        else if (tileY >= 130 && tileY < 190) { type = 'SHARK'; w=30; h=16; }
        else if (tileY >= 190) { type = 'PIRATE_DAN'; w=24; h=24; }

        if(!checkWallCollision({x,y}, 10, worldMap)) {
            enemies.push({
                x, y, vel: {x:0, y:0}, width: w, height: h, type: type, active: true, shockTimer: 0
            });
        }
    }

    function checkStoryTrigger() {
        if (storyIndex < storyEvents.length && score >= storyEvents[storyIndex].score) {
            gameState = 'STORY';
            storyText.innerText = storyEvents[storyIndex].text;
            storyBox.style.display = 'block';
            storyIndex++;
        }
    }

    function checkCaveProximity() {
        if (caveHintShown) return;
        const dist = Math.hypot(player.x - CAVE_POS.x, player.y - CAVE_POS.y);
        if (dist <= CAVE_HINT_RADIUS) {
            gameState = 'STORY';
            storyText.innerText = "Mermaid: 'I'm getting near the cave.'";
            storyBox.style.display = 'block';
            caveHintShown = true;
        }
    }

    function handleCaveInteraction() {
        const dist = Math.hypot(player.x - CAVE_POS.x, player.y - CAVE_POS.y);
        if (!caveUnlocked && dist < CAVE_DOOR_RADIUS + player.radius) {
            const pushX = (player.x - CAVE_POS.x) / (dist || 1);
            const pushY = (player.y - CAVE_POS.y) / (dist || 1);
            player.x = CAVE_POS.x + pushX * (CAVE_DOOR_RADIUS + player.radius + 2);
            player.y = CAVE_POS.y + pushY * (CAVE_DOOR_RADIUS + player.radius + 2);
            player.vel.x *= -0.3;
            player.vel.y *= -0.3;
            return;
        }
    }

    function tryEnterCave() {
        if (!caveUnlocked) return;
        const dist = Math.hypot(player.x - CAVE_POS.x, player.y - CAVE_POS.y);
        if (dist < CAVE_RADIUS) {
            gameState = 'CAVE';
            player.x = CAVE_PLAYER_START.x;
            player.y = CAVE_PLAYER_START.y;
            player.vel = { x: 0, y: 0 };
            cavePotionCharge = 0;
        }
    }

    function performAttack() {
        if (player.attackCooldown > 0 || player.equippedWeapon === 'NONE') return;
        
        const stats = WEAPON_STATS[player.equippedWeapon];
        player.attackCooldown = stats.cooldown;
        player.attackTimer = 10;
        // audioManager.playAttack(); // Assuming this exists or add it

        // Hitbox
        const aimAngle = player.facing === 1 ? 0 : Math.PI;
        const hitX = player.x + Math.cos(aimAngle) * stats.range;
        const hitY = player.y + Math.sin(aimAngle) * stats.range;

        enemies.forEach(ent => {
            if (!ent.active) return;
            const dist = Math.hypot(ent.x - hitX, ent.y - hitY);
            if (dist < (ent.width + stats.range/2)) {
                // Hit enemy
                ent.active = false; // One hit kill for now
                audioManager.playImpact();
                // Spawn particles
                for(let i=0; i<5; i++) {
                    particles.push({
                        x: ent.x, y: ent.y, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4,
                        life: 0.5, size: 3, color: '#ef4444', type: 'SPARK'
                    });
                }
            }
        });
    }

    function renderStoreItems() {
        storeItemsContainer.innerHTML = '';
        STORE_CATALOG.forEach(item => {
            const div = document.createElement('div');
            div.style.border = '1px solid #334155';
            div.style.padding = '10px';
            div.style.cursor = 'pointer';
            div.style.background = player.currency >= item.cost ? '#0f172a' : '#330000';
            div.innerHTML = `<div style="color:#facc15">${item.name}</div><div style="font-size:10px; margin:5px 0;">${item.description}</div><div style="color:white">${item.cost} Things</div>`;
            div.onclick = () => buyItem(item);
            storeItemsContainer.appendChild(div);
        });
    }

    function buyItem(item) {
        if (player.currency >= item.cost) {
            player.currency -= item.cost;
            scoreEl.innerText = score; // Keep score display consistent
            
            if (item.type === 'WEAPON') {
                player.equippedWeapon = item.weaponType;
            } else if (item.type === 'HEAL') {
                player.health = Math.min(player.health + 1, player.maxHealth);
                healthEl.innerText = player.health;
            }
            renderStoreItems();
            audioManager.playCollect();
        }
    }

    function spawnSurfaceSplash(x, direction, force = 6) {
        const count = 10 + Math.round(force);
        for (let i = 0; i < count; i++) {
            const spread = (Math.random() - 0.5) * (3.5 + force * 0.25);
            particles.push({
                x: x + (Math.random() - 0.5) * 14,
                y: SURFACE_Y + direction * 2,
                vx: spread,
                vy: direction * (0.8 + Math.random() * (2.2 + force * 0.18)),
                life: 0.65 + Math.random() * 0.45,
                size: 1 + Math.random() * 2.5,
                color: Math.random() > 0.35 ? '#e0f7ff' : '#7dd3fc',
                type: 'BUBBLE'
            });
        }
    }

    function update() {
        frameCount++;
        
        if (gameState === 'CHARACTER_SELECT') {
            // Rotate preview
            player.angle += 0.05;
            return;
        }

        if (gameState === 'CAVE') {
            updateCave();
            return;
        }

        if (gameState !== 'PLAYING') return;
        if (showStore) return; // Pause when store is open

        // Check for story progression
        checkStoryTrigger();

        // --- PHYSICS ENGINE ---
        const inWater = player.y > SURFACE_Y;
        const up = keys['ArrowUp'] || keys['KeyW'];
        const down = keys['ArrowDown'] || keys['KeyS'];
        const left = keys['ArrowLeft'] || keys['KeyA'];
        const right = keys['ArrowRight'] || keys['KeyD'];
        const dash = keys['ShiftLeft'] || keys['ShiftRight'];

        if (inWater) {
            let inputX = 0;
            let inputY = 0;
            if (left) inputX -= 1;
            if (right) inputX += 1;
            if (up) inputY -= 1;
            if (down) inputY += 1;

            // Normalize input
            if (inputX !== 0 || inputY !== 0) {
                const len = Math.hypot(inputX, inputY);
                inputX /= len;
                inputY /= len;
                if (Math.random() < 0.05) audioManager.playSwim();
            }

            player.vel.x += inputX * WATER_ACCEL;
            player.vel.y += inputY * WATER_ACCEL;

            // Dash Logic
            if (dash && player.dashTimer <= 0) {
                player.dashTimer = 20;
                const dashDirX = (inputX !== 0 || inputY !== 0) ? inputX : (player.facing);
                const dashDirY = (inputX !== 0 || inputY !== 0) ? inputY : 0;
                
                player.vel.x += dashDirX * WATER_ACCEL * 4;
                player.vel.y += dashDirY * WATER_ACCEL * 4;
                
                // Dash Particles
                for(let i=0; i<5; i++) {
                    particles.push({
                        x: player.x, y: player.y,
                        vx: -dashDirX*2 + Math.random(),
                        vy: -dashDirY*2 + Math.random(),
                        life: 0.5, size: 2, color: 'white', type: 'BUBBLE'
                    });
                }
            }
            if (player.dashTimer > 0) player.dashTimer--;

            // Drag
            player.vel.x *= WATER_DRAG;
            player.vel.y *= WATER_DRAG;

            // Cap Speed
            const speed = Math.hypot(player.vel.x, player.vel.y);
            const max = player.dashTimer > 0 ? MAX_WATER_SPEED * 1.5 : MAX_WATER_SPEED;
            if (speed > max) {
                const scale = max / speed;
                player.vel.x *= scale;
                player.vel.y *= scale;
            }

            // Oxygen
            player.oxygen = 100;

        } else {
            // Air Physics
            player.vel.y += GRAVITY;
            if (left) player.vel.x -= AIR_ACCEL;
            if (right) player.vel.x += AIR_ACCEL;
            
            player.vel.x = Math.max(-MAX_AIR_SPEED_X, Math.min(MAX_AIR_SPEED_X, player.vel.x));
            player.vel.y = Math.max(-MAX_AIR_SPEED_Y, Math.min(MAX_AIR_SPEED_Y, player.vel.y));

            player.oxygen = Math.min(100, player.oxygen + 1);
        }

        // Update Angle & Facing
        if (Math.hypot(player.vel.x, player.vel.y) > 0.1) {
            if (inWater) player.angle = Math.atan2(player.vel.y, player.vel.x);
            if (player.vel.x > 0.1) player.facing = 1;
            if (player.vel.x < -0.1) player.facing = -1;
        }

        // Animation State
        player.speed = Math.hypot(player.vel.x, player.vel.y);
        player.tailPhase += 0.15 + (player.speed * 0.05);
        if (player.invulnTimer > 0) player.invulnTimer--;
        if (player.attackCooldown > 0) player.attackCooldown--;
        if (player.attackTimer > 0) player.attackTimer--;

        // Collision & Movement
        let nextX = player.x + player.vel.x;
        let nextY = player.y + player.vel.y;

        if (checkWallCollision({x: nextX, y: player.y}, player.radius, worldMap)) {
            player.vel.x *= -0.5; nextX = player.x;
        }
        if (checkWallCollision({x: nextX, y: nextY}, player.radius, worldMap)) {
            player.vel.y *= -0.5; nextY = player.y;
        }

        const leavingWater = player.y > SURFACE_Y && nextY <= SURFACE_Y;
        const reenteringWater = player.y <= SURFACE_Y && nextY > SURFACE_Y;

        // Convert upward swimming momentum into a much stronger aerial arc.
        // Shift is optional, but adds enough force for a dramatic high breach.
        if (leavingWater && player.vel.y <= -BREACH_MIN_SPEED) {
            const upwardMomentum = Math.min(Math.abs(player.vel.y), MAX_WATER_SPEED * 1.5);
            const dashBonus = dash ? BREACH_DASH_BONUS : 0;
            player.vel.y = -Math.min(
                BREACH_MAX_SPEED,
                BREACH_LAUNCH_SPEED + upwardMomentum * 0.28 + dashBonus
            );
            nextY = SURFACE_Y - 1;
            player.airborneFromBreach = true;
            audioManager.playBreach();
            spawnSurfaceSplash(player.x, -1);
        } else if (reenteringWater) {
            const impact = Math.min(Math.abs(player.vel.y), BREACH_MAX_SPEED);
            player.vel.y *= 0.58;
            player.vel.x *= 0.92;
            nextY = SURFACE_Y + 1;
            if (player.airborneFromBreach || impact > 3) {
                audioManager.playBreach();
                spawnSurfaceSplash(player.x, 1, impact);
            }
            player.airborneFromBreach = false;
        }

        player.x = nextX;
        player.y = nextY;

        // Clamp to map
        player.x = Math.max(20, Math.min(MAP_WIDTH*TILE_SIZE - 20, player.x));
        player.y = Math.max(-200, Math.min(MAP_HEIGHT*TILE_SIZE - 20, player.y));

        if (!caveUnlocked && score >= CAVE_UNLOCK_SCORE) {
            caveUnlocked = true;
        }
        checkCaveProximity();
        handleCaveInteraction();

        // Update Camera to follow player
        camera.x += (player.x - V_WIDTH/2 - camera.x) * 0.1;
        camera.y += (player.y - V_HEIGHT/2 - camera.y) * 0.1;
        camera.x = Math.max(0, Math.min(camera.x, MAP_WIDTH * TILE_SIZE - V_WIDTH));
        camera.y = Math.max(-100, Math.min(camera.y, MAP_HEIGHT * TILE_SIZE - V_HEIGHT));

        // Update Audio Ambience
        audioManager.update(player, enemies);

        // 2. Update Items
        for (let i = items.length - 1; i >= 0; i--) {
            // Collision detection for bigger player
            if (checkCollisionCircle(player, items[i])) {
                const picked = items[i];
                items.splice(i, 1);
                score++;
                player.currency += ITEM_VALUES[picked.type] ?? 10;
                scoreEl.innerText = score;
                audioManager.playCollect();
                // Sparkles
                const sparkColor = (ITEM_ICONS[picked.type] || {}).color || '#facc15';
                for(let k=0; k<3; k++) {
                    particles.push({
                        x: picked.x, y: picked.y,
                        vx: (Math.random()-0.5)*2, vy: -1 - Math.random(),
                        life: 0.5, size: 2, color: sparkColor, type: 'SPARK'
                    });
                }
            }
        }

        // 3. Update Enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
            const ent = enemies[i];
            if (!ent.active) continue;

            // Simple AI: Move towards player if close
            const dist = Math.hypot(player.x - ent.x, player.y - ent.y);
            
            if (ent.type === 'JELLYFISH') {
                ent.vel.y += Math.sin(frameCount * 0.05 + ent.x) * 0.02; // Bobbing
                if (dist < 120) {
                     ent.vel.x += (player.x - ent.x) * 0.0005;
                     ent.vel.y += (player.y - ent.y) * 0.0005;
                }
            } else if (ent.type === 'SHARK') {
                if (dist < 250) {
                    const angle = Math.atan2(player.y - ent.y, player.x - ent.x);
                    ent.vel.x += Math.cos(angle) * 0.08;
                    ent.vel.y += Math.sin(angle) * 0.08;
                }
            } else {
                if (dist < 150) {
                    const angle = Math.atan2(player.y - ent.y, player.x - ent.x);
                    ent.vel.x += Math.cos(angle) * 0.05;
                    ent.vel.y += Math.sin(angle) * 0.05;
                }
            }
            ent.vel.x *= 0.95; ent.vel.y *= 0.95;
            ent.x += ent.vel.x;
            ent.y += ent.vel.y;

            // Collision detection
            if (dist < 15) { 
                if (player.invulnTimer <= 0) {
                    player.health--;
                    healthEl.innerText = player.health; // Update UI
                    player.invulnTimer = 60;
                    audioManager.playImpact();
                    if (player.health <= 0) gameState = 'GAMEOVER';
                }
            }
        }

        updateWildlife();

        // 4. Update Particles
        for(let i=particles.length-1; i>=0; i--) {
            const p = particles[i];
            p.x += p.vx; p.y += p.vy;
            p.life -= 0.05;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    function updateWildlife() {
        wildlife.forEach(fish => {
            const species = FISH_SPECIES[fish.biome][fish.speciesIndex];
            fish.phase += 0.035 + species.speed * 0.035;
            if (fish.turnCooldown > 0) fish.turnCooldown--;

            let speedBoost = 1;
            const dx = fish.x - player.x;
            const dy = fish.y - player.y;
            const playerDist = Math.hypot(dx, dy);
            if (playerDist < 55) {
                fish.facing = dx >= 0 ? 1 : -1;
                speedBoost = 2.25 - playerDist / 44;
            }

            const swimSpeed = species.speed * fish.speedScale * speedBoost;
            const nextX = fish.x + fish.facing * swimSpeed;
            const targetY = fish.homeY + Math.sin(fish.phase + fish.school * 0.7) * 7;
            const verticalStep = Math.max(-0.22, Math.min(0.22, (targetY - fish.y) * 0.035));
            const nextY = Math.max(fish.minY, Math.min(fish.maxY, fish.y + verticalStep));

            if (
                fish.turnCooldown <= 0 &&
                (
                    nextX < TILE_SIZE * 1.5 ||
                    nextX > MAP_WIDTH * TILE_SIZE - TILE_SIZE * 1.5 ||
                    checkWallCollision({ x: nextX, y: nextY }, 4, worldMap)
                )
            ) {
                fish.facing *= -1;
                fish.turnCooldown = 24;
                fish.homeY = Math.max(fish.minY, Math.min(fish.maxY, fish.homeY + (Math.random() - 0.5) * 18));
            } else {
                fish.x = nextX;
                fish.y = nextY;
            }
        });
    }

    function draw() {
        // Clear
        ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);

        if (gameState === 'CHARACTER_SELECT') {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);
            drawPixelText(ctx, "CUSTOMIZE MERMAID", V_WIDTH/2, 40, 'white', 16, 'center');
            
            // Draw Preview
            ctx.save();
            ctx.translate(V_WIDTH/2, V_HEIGHT/2);
            ctx.scale(2, 2);
            drawMermaid(ctx, { ...player, x: 0, y: 0, vel: {x:0,y:0}, facing: 1 }, frameCount);
            ctx.restore();

            drawPixelText(ctx, "[R] RANDOMIZE", V_WIDTH/2, V_HEIGHT - 80, '#facc15', 10, 'center');
            drawPixelText(ctx, "PRESS ENTER TO START", V_WIDTH/2, V_HEIGHT - 40, 'white', 10, 'center');
            return;
        }
        if (gameState === 'CAVE') {
            drawCaveScene(ctx);
            return;
        }

        // 1. Draw Sky & Background
        ctx.save();
        ctx.translate(-camera.x, -camera.y);

        drawSky(ctx, camera.x, camera.y, V_WIDTH, V_HEIGHT, frameCount);

        const camCenterY = camera.y + V_HEIGHT/2;
        const currentBiome = getBiomeAtDepth(Math.floor(camCenterY / TILE_SIZE));

        // Draw Deep Ocean Background
        const bgGrad = ctx.createLinearGradient(0, SURFACE_Y, 0, MAP_HEIGHT*TILE_SIZE);
        bgGrad.addColorStop(0, BIOME_CONFIG.CORAL.colors.bgTop);
        bgGrad.addColorStop(0.25, BIOME_CONFIG.CORAL.colors.bgBot);
        bgGrad.addColorStop(0.251, BIOME_CONFIG.BAYOU.colors.bgTop);
        bgGrad.addColorStop(0.5, BIOME_CONFIG.BAYOU.colors.bgBot);
        bgGrad.addColorStop(0.501, BIOME_CONFIG.ARCTIC.colors.bgTop);
        bgGrad.addColorStop(0.75, BIOME_CONFIG.ARCTIC.colors.bgBot);
        bgGrad.addColorStop(0.751, BIOME_CONFIG.TRENCH.colors.bgTop);
        bgGrad.addColorStop(1, BIOME_CONFIG.TRENCH.colors.bgBot);
        ctx.fillStyle = bgGrad;
        ctx.beginPath();
        const wLeft = camera.x - 10, wRight = camera.x + V_WIDTH + 10;
        ctx.moveTo(wLeft, waterSurfaceY(wLeft, frameCount));
        for (let x = wLeft; x <= wRight; x += 10) {
            ctx.lineTo(x, waterSurfaceY(x, frameCount));
        }
        ctx.lineTo(wRight, MAP_HEIGHT * TILE_SIZE);
        ctx.lineTo(wLeft, MAP_HEIGHT * TILE_SIZE);
        ctx.closePath();
        ctx.fill();

        // Everything below is underwater-only atmosphere; clip so none of it
        // leaks above the surface when the player breaches into open air.
        ctx.save();
        ctx.beginPath();
        ctx.rect(camera.x - 10, SURFACE_Y, V_WIDTH + 20, MAP_HEIGHT * TILE_SIZE);
        ctx.clip();
        drawParallaxBackground(ctx, camera.x, camera.y, currentBiome);
        drawWaterCaustics(ctx, camera.x, camera.y, frameCount);
        drawAmbientBubbles(ctx, camera.x, camera.y, frameCount);
        ctx.restore();

        drawGodRays(ctx, camera.x, frameCount);
        drawWaterSurfaceWave(ctx, camera.x, camera.y, frameCount);

        if (!worldMap.length || !worldMap[0]) {
            ctx.restore();
            return;
        }

        // 2. Draw Map Tiles
        const startCol = Math.floor(camera.x / TILE_SIZE);
        const endCol = startCol + (V_WIDTH / TILE_SIZE) + 1;
        const startRow = Math.floor(camera.y / TILE_SIZE);
        const endRow = startRow + (V_HEIGHT / TILE_SIZE) + 1;

        for (let y = startRow; y <= endRow; y++) {
            if (y < 0 || y >= MAP_HEIGHT) continue;
            const rockColors = BIOME_CONFIG[getBiomeAtDepth(y)].colors;
            for (let x = startCol; x <= endCol; x++) {
                if (x >= 0 && x < MAP_WIDTH && worldMap[y][x] === 1) {
                    drawRockTile(ctx, x, y, rockColors);
                }
            }
        }

        wildlife.forEach(fish => {
            if (
                fish.x > camera.x - 30 && fish.x < camera.x + V_WIDTH + 30 &&
                fish.y > camera.y - 20 && fish.y < camera.y + V_HEIGHT + 20
            ) {
                drawPassiveFish(ctx, fish, frameCount);
            }
        });

        drawCave(ctx);
        const caveDist = Math.hypot(player.x - CAVE_POS.x, player.y - CAVE_POS.y);
        if (caveUnlocked && caveDist < CAVE_RADIUS + 20) {
            drawPixelText(ctx, "PRESS E TO ENTER", CAVE_POS.x, CAVE_POS.y - 40, '#facc15', 8, 'center');
        } else if (!caveUnlocked && caveDist < CAVE_RADIUS + 20) {
            drawPixelText(ctx, "CAVE LOCKED", CAVE_POS.x, CAVE_POS.y - 40, '#94a3b8', 8, 'center');
        }

        // 3. Draw Items
        items.forEach(item => drawItemIcon(ctx, item, frameCount));

        // 4. Draw Enemies
        enemies.forEach(enemy => drawEnemy(ctx, enemy, frameCount));

        // 5. Draw Mermaid (Procedural)
        if (player.invulnTimer % 4 < 2) { 
            drawMermaid(ctx, player, frameCount);
        }

        // 6. Draw Particles
        particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, p.size, p.size);
            ctx.globalAlpha = 1;
        });

        ctx.restore(); // Restore camera for UI

        // Draw UI Overlay for Weapon
        if (gameState === 'PLAYING') {
            drawPixelText(ctx, `WEAPON: ${player.equippedWeapon}`, 10, V_HEIGHT - 20, '#94a3b8', 8);
            drawPixelText(ctx, `[B] SHOP`, V_WIDTH - 60, 20, '#facc15', 8);
        }

        // 7. Draw Game Over Overlay
        if (gameState === 'GAMEOVER') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);
            
            ctx.fillStyle = 'white';
            ctx.font = '24px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', V_WIDTH / 2, V_HEIGHT / 2 - 20);
            
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText(`Score: ${score}`, V_WIDTH / 2, V_HEIGHT / 2 + 20);
            ctx.fillText('Press ENTER to Restart', V_WIDTH / 2, V_HEIGHT / 2 + 60);
        } else if (gameState === 'HUMAN') {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);
            
            ctx.fillStyle = 'white';
            ctx.font = '16px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('HUMAN WORLD', V_WIDTH / 2, V_HEIGHT / 2 - 40);
            
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText(`To be continued...`, V_WIDTH / 2, V_HEIGHT / 2 - 10);
            ctx.fillText(`Press ENTER to Restart`, V_WIDTH / 2, V_HEIGHT / 2 + 10);
            
        }
    }

    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    function drawPixelText(ctx, text, x, y, color = 'white', size = 8, align = 'left') {
        ctx.save();
        ctx.fillStyle = color;
        ctx.font = `${size}px "Press Start 2P"`; 
        ctx.textAlign = align;
        ctx.fillStyle = 'black';
        ctx.fillText(text, x + 1, y + 1);
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        ctx.restore();
    }

    // Dense, folded stone inspired by 16-bit ocean caverns. Geometry still
    // follows the collision grid, while texture and exposed rims disguise it.
    function drawRockTile(ctx, x, y, palette) {
        const px = x * TILE_SIZE, py = y * TILE_SIZE;
        const r = TILE_SIZE * 0.3;
        const solid = (nx, ny) => nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT && worldMap[ny][nx] === 1;
        const up = solid(x, y - 1), down = solid(x, y + 1), left = solid(x - 1, y), right = solid(x + 1, y);
        const rTL = (!up && !left) ? r : 0;
        const rTR = (!up && !right) ? r : 0;
        const rBR = (!down && !right) ? r : 0;
        const rBL = (!down && !left) ? r : 0;

        ctx.beginPath();
        ctx.moveTo(px + rTL, py);
        ctx.lineTo(px + TILE_SIZE - rTR, py);
        if (rTR) ctx.arcTo(px + TILE_SIZE, py, px + TILE_SIZE, py + rTR, rTR);
        ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE - rBR);
        if (rBR) ctx.arcTo(px + TILE_SIZE, py + TILE_SIZE, px + TILE_SIZE - rBR, py + TILE_SIZE, rBR);
        ctx.lineTo(px + rBL, py + TILE_SIZE);
        if (rBL) ctx.arcTo(px, py + TILE_SIZE, px, py + TILE_SIZE - rBL, rBL);
        ctx.lineTo(px, py + rTL);
        if (rTL) ctx.arcTo(px, py, px + rTL, py, rTL);
        ctx.closePath();

        ctx.fillStyle = palette.rock;
        ctx.fill();

        // Clip the interior markings to the rounded collision silhouette.
        ctx.save();
        ctx.clip();

        // Three jagged diagonal folds per tile. The dark under-stroke gives
        // each pale ridge the engraved, high-contrast Genesis-era appearance.
        const seed = hashCoord(x, y);
        for (let i = 0; i < 3; i++) {
            const startY = py + ((i * 9 + Math.floor(seed * 11) + x * 3 + y * 5) % 29) - 2;
            const bend = ((Math.floor(seed * 97) + i * 3) % 5) - 2;
            ctx.beginPath();
            ctx.moveTo(px - 3, startY + 7);
            ctx.lineTo(px + 6, startY + bend);
            ctx.lineTo(px + 13, startY - 3 - bend);
            ctx.lineTo(px + 27, startY - 10);
            ctx.strokeStyle = palette.rockDark;
            ctx.lineWidth = 4;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(px - 3, startY + 5);
            ctx.lineTo(px + 6, startY - 2 + bend);
            ctx.lineTo(px + 13, startY - 5 - bend);
            ctx.lineTo(px + 27, startY - 12);
            ctx.strokeStyle = i === 1 ? palette.rockLight : palette.rockMid;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Small deterministic pits break up repeated diagonal bands.
        for (let i = 0; i < 4; i++) {
            const pitX = px + 3 + ((Math.floor(seed * 997) + i * 7) % 19);
            const pitY = py + 3 + ((Math.floor(seed * 577) + i * 11) % 19);
            ctx.fillStyle = palette.rockDark;
            ctx.fillRect(pitX, pitY, i % 3 === 0 ? 2 : 1, i % 2 === 0 ? 2 : 1);
            if (i % 2 === 0) {
                ctx.fillStyle = palette.rockMid;
                ctx.fillRect(pitX + 1, pitY - 1, 1, 1);
            }
        }
        ctx.restore();

        // Exposed faces get a dark lip plus a bright mineral rim, matching the
        // readable ledges and cavern walls in the reference.
        if (!up) {
            ctx.strokeStyle = palette.rockDark;
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(px + rTL, py + 3); ctx.lineTo(px + TILE_SIZE - rTR, py + 3); ctx.stroke();
            ctx.strokeStyle = palette.rockEdge;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(px + rTL, py + 1); ctx.lineTo(px + TILE_SIZE - rTR, py + 1); ctx.stroke();
        }
        if (!down) {
            ctx.strokeStyle = palette.rockDark;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(px + rBL, py + TILE_SIZE - 1); ctx.lineTo(px + TILE_SIZE - rBR, py + TILE_SIZE - 1); ctx.stroke();
            ctx.strokeStyle = palette.rockMid;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(px + rBL + 1, py + TILE_SIZE - 3); ctx.lineTo(px + TILE_SIZE - rBR - 1, py + TILE_SIZE - 3); ctx.stroke();
        }
        if (!left) {
            ctx.strokeStyle = palette.rockDark;
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(px + 2, py + rTL); ctx.lineTo(px + 2, py + TILE_SIZE - rBL); ctx.stroke();
            ctx.strokeStyle = palette.rockEdge;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(px + 1, py + rTL); ctx.lineTo(px + 1, py + TILE_SIZE - rBL); ctx.stroke();
        }
        if (!right) {
            ctx.strokeStyle = palette.rockDark;
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(px + TILE_SIZE - 2, py + rTR); ctx.lineTo(px + TILE_SIZE - 2, py + TILE_SIZE - rBR); ctx.stroke();
            ctx.strokeStyle = palette.rockMid;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(px + TILE_SIZE - 4, py + rTR + 1); ctx.lineTo(px + TILE_SIZE - 4, py + TILE_SIZE - rBR - 1); ctx.stroke();
        }
    }

    // --- DRAWING HELPERS (Ported from React) ---

    // Matches the wavy top of the water fill/highlight so the surface reads as
    // one continuous body instead of a flat rectangle with a line floating over it.
    function waterSurfaceY(x, time) {
        return SURFACE_Y + Math.sin(x * 0.045 + time * 0.05) * 3 + Math.sin(x * 0.11 + time * 0.09) * 1.5;
    }

    function drawSky(ctx, cameraX, cameraY, width, height, time) {
        const skyTop = cameraY - 100;
        // Extend a few px past SURFACE_Y so the wavy water's troughs never expose a gap.
        const skyBottom = SURFACE_Y + 6;
        const skyHeight = skyBottom - skyTop;

        if (skyHeight > 0) {
            // One complete day every minute: day at the start, night halfway through.
            const daylight = (Math.cos((time / 3600) * Math.PI * 2) + 1) / 2;
            const dayBlend = daylight * daylight * (3 - 2 * daylight);
            const grd = ctx.createLinearGradient(0, skyTop, 0, skyBottom);
            grd.addColorStop(0, dayBlend > 0.5 ? '#08a99a' : '#020617');
            grd.addColorStop(1, dayBlend > 0.5 ? '#f1c7a5' : '#3b2866');
            ctx.fillStyle = grd;
            ctx.fillRect(cameraX, skyTop, width, skyHeight);

            const drawSurfaceLayer = (image, alpha) => {
                if (alpha <= 0.001) return;
                const assetTop = -100;
                const assetHeight = SURFACE_Y - assetTop;
                const parallaxOffset = ((cameraX * 0.16) % width + width) % width;
                const firstX = cameraX - parallaxOffset;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.imageSmoothingEnabled = false;
                for (let x = firstX; x < cameraX + width; x += width) {
                    ctx.drawImage(image, Math.floor(x), assetTop, width + 1, assetHeight);
                }
                ctx.restore();
            };

            if (surfaceBackgroundReady.night) {
                drawSurfaceLayer(surfaceBackgrounds.night, 1);
            }
            if (surfaceBackgroundReady.day) {
                drawSurfaceLayer(surfaceBackgrounds.day, dayBlend);
            }

            // Keep a few stars in the loading fallback and during the darkest night.
            if (!surfaceBackgroundReady.night && dayBlend < 0.5) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                for(let i=0; i<50; i++) {
                    const x = (i * 47 + cameraX * 0.95) % width + cameraX;
                    const y = ((i * 13) % 200) - 200;
                    if (y < SURFACE_Y && y > skyTop && Math.sin(time * 0.1 + i) <= 0.8) {
                        ctx.fillRect(x, y, 1, 1);
                    }
                }
            }
        }
    }

    function updateCave() {
        const up = keys['ArrowUp'] || keys['KeyW'];
        const down = keys['ArrowDown'] || keys['KeyS'];
        const left = keys['ArrowLeft'] || keys['KeyA'];
        const right = keys['ArrowRight'] || keys['KeyD'];

        let inputX = 0;
        let inputY = 0;
        if (left) inputX -= 1;
        if (right) inputX += 1;
        if (up) inputY -= 1;
        if (down) inputY += 1;

        if (inputX !== 0 || inputY !== 0) {
            const len = Math.hypot(inputX, inputY);
            inputX /= len;
            inputY /= len;
        }

        player.vel.x += inputX * WATER_ACCEL;
        player.vel.y += inputY * WATER_ACCEL;
        player.vel.x *= WATER_DRAG;
        player.vel.y *= WATER_DRAG;

        const speed = Math.hypot(player.vel.x, player.vel.y);
        const max = 2.5;
        if (speed > max) {
            const scale = max / speed;
            player.vel.x *= scale;
            player.vel.y *= scale;
        }

        player.x += player.vel.x;
        player.y += player.vel.y;
        player.x = Math.max(CAVE_BOUNDS.left, Math.min(CAVE_BOUNDS.right, player.x));
        player.y = Math.max(CAVE_BOUNDS.top, Math.min(CAVE_BOUNDS.bottom, player.y));

        player.speed = Math.hypot(player.vel.x, player.vel.y);
        player.tailPhase += 0.15 + (player.speed * 0.05);
        if (player.vel.x > 0.1) player.facing = 1;
        if (player.vel.x < -0.1) player.facing = -1;

        const potionDist = Math.hypot(player.x - CAVE_POTION_POS.x, player.y - CAVE_POTION_POS.y);
        if (potionDist <= CAVE_POTION_RADIUS + 14 && keys['KeyE']) {
            cavePotionCharge = Math.min(1, cavePotionCharge + 0.03);
        } else {
            cavePotionCharge = Math.max(0, cavePotionCharge - 0.003);
        }

        if (!potionConsumed && cavePotionCharge >= 1) {
            potionConsumed = true;
            gameState = 'HUMAN';
        }
    }

    function drawCave(ctx) {
        ctx.save();
        ctx.translate(CAVE_POS.x, CAVE_POS.y);

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, CAVE_RADIUS + 10, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(-CAVE_RADIUS - 10, 0, (CAVE_RADIUS + 10) * 2, 20);

        ctx.fillStyle = caveUnlocked ? '#020617' : '#1f2937';
        ctx.beginPath();
        ctx.arc(0, 2, CAVE_RADIUS, Math.PI, 0);
        ctx.fill();

        if (!caveUnlocked) {
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.arc(0, 10, CAVE_DOOR_RADIUS, Math.PI, 0);
            ctx.fill();
            ctx.fillRect(-CAVE_DOOR_RADIUS, 10, CAVE_DOOR_RADIUS * 2, 10);
        }

        ctx.restore();
    }

    function drawCaveScene(ctx) {
        ctx.save();
        drawCaveBackground(ctx, frameCount);

        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.arc(CAVE_POTION_POS.x, CAVE_POTION_POS.y, CAVE_POTION_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#93c5fd';
        ctx.fillRect(CAVE_POTION_POS.x - 6, CAVE_POTION_POS.y - 18, 12, 8);

        drawMermaid(ctx, player, frameCount);

        const ringRadius = CAVE_POTION_RADIUS + 10;
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(CAVE_POTION_POS.x, CAVE_POTION_POS.y, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(
            CAVE_POTION_POS.x,
            CAVE_POTION_POS.y,
            ringRadius,
            -Math.PI / 2,
            -Math.PI / 2 + Math.PI * 2 * cavePotionCharge
        );
        ctx.stroke();

        const potionDist = Math.hypot(player.x - CAVE_POTION_POS.x, player.y - CAVE_POTION_POS.y);
        if (potionDist <= CAVE_POTION_RADIUS + 18) {
            drawPixelText(ctx, "MASH E TO DRINK", V_WIDTH / 2, V_HEIGHT - 24, '#facc15', 8, 'center');
        } else {
            drawPixelText(ctx, "FIND THE POTION", V_WIDTH / 2, V_HEIGHT - 24, '#e2e8f0', 8, 'center');
        }
        ctx.restore();
    }

    function drawParallaxBackground(ctx, cameraX, cameraY, biome) {
        const config = BIOME_CONFIG[biome];
        const baseColor = config.colors.rock;
        
        const drawLayer = (depthFactor, alpha, startYOffset, noiseScale, amp) => {
            const parallaxY = cameraY * (1 - depthFactor) + startYOffset;
            ctx.fillStyle = baseColor;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            const step = 20;
            const startX = cameraX - 50;
            const endX = cameraX + V_WIDTH + 50;
            const bottomY = cameraY + V_HEIGHT + 400;

            ctx.moveTo(startX, bottomY);
            for (let x = startX; x <= endX; x += step) {
                const noiseX = (x * noiseScale) + (cameraX * (1 - depthFactor) * noiseScale);
                const noise = Math.sin(noiseX) * amp + Math.sin(noiseX * 2.5) * (amp * 0.5);
                const y = parallaxY + noise;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(endX, bottomY);
            ctx.lineTo(startX, bottomY);
            ctx.fill();
        };

        drawLayer(0.2, 0.2, SURFACE_Y + 200, 0.005, 80);
        drawLayer(0.5, 0.4, SURFACE_Y + 300, 0.008, 50);
        drawLayer(0.8, 0.6, SURFACE_Y + 380, 0.012, 30);
        ctx.globalAlpha = 1.0;
    }

    function drawGodRays(ctx, cameraX, time) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        const gradient = ctx.createLinearGradient(0, SURFACE_Y, 0, SURFACE_Y + 300);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        
        for(let i=0; i<5; i++) {
            const offset = (time * 0.5 + (i * 100)); 
            const x = cameraX - 100 + (offset % (V_WIDTH + 200)); 
            const width = 30 + Math.sin(time * 0.02 + i) * 10;
            const skew = Math.sin(time * 0.01) * 20;
            ctx.beginPath();
            ctx.moveTo(x, SURFACE_Y);
            ctx.lineTo(x + width, SURFACE_Y);
            ctx.lineTo(x + width + skew, SURFACE_Y + 400);
            ctx.lineTo(x + skew, SURFACE_Y + 400);
            ctx.fill();
        }
        ctx.restore();
    }

    // Continuous field of rising bubbles for underwater atmosphere
    function drawAmbientBubbles(ctx, cameraX, cameraY, time) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        for (let i = 0; i < 20; i++) {
            const seed = i * 137.5;
            const speed = 0.3 + (i % 5) * 0.15;
            const x = cameraX + ((seed * 13) % (V_WIDTH + 100)) - 50;
            const riseY = (time * speed + seed * 7) % (V_HEIGHT + 200);
            const y = cameraY + V_HEIGHT + 100 - riseY;
            const r = 1 + (i % 3);
            ctx.globalAlpha = 0.15 + (i % 4) * 0.05;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // Slow, undulating bands of light that drift through the water column to
    // sell a sense of fluid depth rather than a static painted backdrop.
    function drawWaterCaustics(ctx, cameraX, cameraY, time) {
        // Plain alpha blending (not 'overlay') so this never blows out to solid
        // white over the lighter Arctic background - overlay pushes light bases
        // toward white regardless of how faint the blend color is.
        ctx.save();
        const rows = 6;
        const step = 16;
        for (let r = 0; r < rows; r++) {
            const bandY = cameraY + (r / rows) * (V_HEIGHT + 40) - 20 + Math.sin(time * 0.015 + r * 1.7) * 10;
            const grad = ctx.createLinearGradient(0, bandY - 12, 0, bandY + 12);
            grad.addColorStop(0, 'rgba(224,247,255,0)');
            grad.addColorStop(0.5, 'rgba(224,247,255,0.12)');
            grad.addColorStop(1, 'rgba(224,247,255,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            const left = cameraX - 20, right = cameraX + V_WIDTH + 20;
            ctx.moveTo(left, bandY - 12 + Math.sin(left * 0.04 + time * 0.06 + r) * 6);
            for (let x = left; x <= right; x += step) {
                ctx.lineTo(x, bandY - 12 + Math.sin(x * 0.04 + time * 0.06 + r) * 6);
            }
            for (let x = right; x >= left; x -= step) {
                ctx.lineTo(x, bandY + 12 + Math.sin(x * 0.04 + time * 0.06 + r + 1.5) * 6);
            }
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    // A wavy highlight tracing the ocean surface line so it reads as moving
    // liquid instead of a flat color boundary. Only drawn when in view.
    function drawWaterSurfaceWave(ctx, cameraX, cameraY, time) {
        if (cameraY > SURFACE_Y + 60 || cameraY + V_HEIGHT < SURFACE_Y - 40) return;
        ctx.save();
        const step = 10;
        const left = cameraX - 10, right = cameraX + V_WIDTH + 10;
        ctx.beginPath();
        for (let x = left; x <= right; x += step) {
            const y = waterSurfaceY(x, time);
            if (x === left) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(224,247,255,0.55)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Sparkle flecks riding the crests
        for (let i = 0; i < 12; i++) {
            const x = left + (i / 12) * (right - left) + Math.sin(time * 0.03 + i) * 8;
            const y = waterSurfaceY(x, time) - 1;
            ctx.globalAlpha = 0.3 + Math.sin(time * 0.1 + i * 2) * 0.3;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, y, 1, 1);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    function drawItemIcon(ctx, item, time) {
        const bob = Math.sin(time * 0.06 + item.x * 0.05) * 2;
        const icon = ITEM_ICONS[item.type] || { color: COLORS.ITEM_GLOW, glow: 'rgba(250,204,21,0.5)' };
        ctx.save();
        ctx.translate(item.x, item.y + bob);

        const pulse = 0.6 + Math.sin(time * 0.08 + item.x) * 0.4;
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, item.radius * 1.6);
        glow.addColorStop(0, icon.glow);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = pulse;
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(0, 0, item.radius * 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = icon.color;
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;

        switch (item.type) {
            case EntityType.ITEM_SHELL:
                ctx.beginPath();
                ctx.moveTo(0, -6);
                for (let i = -3; i <= 3; i++) ctx.lineTo(i * 2, 5 + Math.abs(i) * 0.5);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(i * 2, 4); ctx.stroke(); }
                break;
            case EntityType.ITEM_FORK:
                ctx.fillRect(-1, -2, 2, 10);
                for (let i = -3; i <= 3; i += 3) ctx.fillRect(i - 0.5, -7, 1, 6);
                break;
            case EntityType.ITEM_BOTTLE:
                ctx.beginPath();
                ctx.moveTo(-3, 6); ctx.lineTo(-3, -2); ctx.lineTo(-1.5, -5); ctx.lineTo(-1.5, -7);
                ctx.lineTo(1.5, -7); ctx.lineTo(1.5, -5); ctx.lineTo(3, -2); ctx.lineTo(3, 6);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#78350f';
                ctx.fillRect(-1.5, -8, 3, 2);
                break;
            case EntityType.ITEM_BOOT:
            default:
                ctx.beginPath();
                ctx.moveTo(-4, 6); ctx.lineTo(-4, -4); ctx.lineTo(0, -6); ctx.lineTo(2, -4);
                ctx.lineTo(2, 2); ctx.lineTo(6, 2); ctx.lineTo(6, 6); ctx.closePath();
                ctx.fill(); ctx.stroke();
                break;
        }
        ctx.restore();
    }

    function drawPassiveFish(ctx, fish, time) {
        const species = FISH_SPECIES[fish.biome][fish.speciesIndex];
        const bob = Math.sin(fish.phase + fish.school * 0.6) * 0.8;
        const tailWag = Math.sin(fish.phase * 2.4) * (1.2 + species.speed);
        let bodyW = 7.5, bodyH = 4;
        if (species.shape === 'SLENDER') { bodyW = 9; bodyH = 2.5; }
        if (species.shape === 'LONG') { bodyW = 9; bodyH = 3.5; }
        if (species.shape === 'TALL') { bodyW = 7; bodyH = 5.5; }

        ctx.save();
        ctx.translate(fish.x, fish.y + bob);
        ctx.scale(fish.facing * species.size, species.size);

        if (species.pattern === 'GLOW') {
            ctx.shadowColor = species.accent;
            ctx.shadowBlur = 4;
        }

        // Flexible tail and translucent fins move independently from the body.
        ctx.fillStyle = species.accent;
        ctx.strokeStyle = species.dark;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-bodyW + 1, -1.3);
        ctx.lineTo(-bodyW - 5, -bodyH - 1 + tailWag);
        ctx.lineTo(-bodyW - 4, tailWag);
        ctx.lineTo(-bodyW - 5, bodyH + 1 + tailWag);
        ctx.lineTo(-bodyW + 1, 1.3);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = species.body;
        ctx.beginPath();
        ctx.ellipse(0, 0, bodyW, bodyH, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = species.dark;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.globalAlpha = 0.75;
        ctx.fillStyle = species.accent;
        ctx.beginPath();
        ctx.moveTo(-2, -bodyH + 0.5);
        ctx.lineTo(1, -bodyH - 3);
        ctx.lineTo(3, -bodyH + 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, 1);
        ctx.lineTo(-3, bodyH + 2.5 + tailWag * 0.2);
        ctx.lineTo(4, bodyH - 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        // Species-specific markings keep schools identifiable at a glance.
        ctx.strokeStyle = species.accent;
        ctx.fillStyle = species.accent;
        ctx.lineWidth = 1.3;
        if (species.pattern === 'BANDS') {
            [-3, 2].forEach(x => { ctx.beginPath(); ctx.moveTo(x, -bodyH + 0.5); ctx.lineTo(x + 1, bodyH - 0.5); ctx.stroke(); });
        } else if (species.pattern === 'MASK') {
            ctx.strokeStyle = species.dark;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(3.5, -bodyH + 0.6); ctx.lineTo(4.5, bodyH - 0.6); ctx.stroke();
            ctx.strokeStyle = species.accent;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(-1, -bodyH + 0.5); ctx.lineTo(-2, bodyH - 0.5); ctx.stroke();
        } else if (species.pattern === 'SWOOP') {
            ctx.strokeStyle = species.dark;
            ctx.lineWidth = 2.2;
            ctx.beginPath(); ctx.moveTo(-5, -2); ctx.quadraticCurveTo(-1, 3.5, 5, -2.5); ctx.stroke();
            ctx.fillStyle = species.accent;
            ctx.fillRect(-4, bodyH - 1.4, 6, 1);
        } else if (species.pattern === 'SPOTS' || species.pattern === 'MOTTLED') {
            for (let i = 0; i < 4; i++) {
                const spotX = -4 + i * 2.5;
                const spotY = Math.sin(i * 4.7 + fish.school) * (bodyH * 0.5);
                ctx.beginPath(); ctx.arc(spotX, spotY, species.pattern === 'MOTTLED' ? 1.1 : 0.7, 0, Math.PI * 2); ctx.fill();
            }
        } else if (species.pattern === 'LINE' || species.pattern === 'GLASS') {
            ctx.globalAlpha = species.pattern === 'GLASS' ? 0.65 : 1;
            ctx.strokeStyle = species.accent;
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(-bodyW + 2, 0); ctx.lineTo(bodyW - 1, 0); ctx.stroke();
            ctx.globalAlpha = 1;
        } else if (species.pattern === 'GLOW') {
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(-5 + i * 3, bodyH * 0.45, 1, 1);
            }
        }

        if (species.pattern === 'WHISKERS') {
            ctx.strokeStyle = species.accent;
            ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(bodyW - 1, 1); ctx.lineTo(bodyW + 5, 3); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(bodyW - 1, 1.5); ctx.lineTo(bodyW + 4, 5); ctx.stroke();
        }
        if (species.pattern === 'FANGS') {
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath(); ctx.moveTo(bodyW - 1, 1); ctx.lineTo(bodyW + 1, 1); ctx.lineTo(bodyW, 3.5); ctx.fill();
        }

        // Bright eye pixel, dark pupil, gill, and one scale glint.
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath(); ctx.arc(bodyW * 0.58, -bodyH * 0.25, 1.15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#020617';
        ctx.beginPath(); ctx.arc(bodyW * 0.75, -bodyH * 0.25, 0.65, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = species.dark;
        ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.arc(bodyW * 0.35, 0, 1.8, -Math.PI / 2, Math.PI / 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(-1, -bodyH * 0.55, 2, 0.7);

        ctx.restore();
    }

    function drawEnemy(ctx, enemy, time) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        if (enemy.type === 'SHARK') drawShark(ctx, enemy, time);
        else if (enemy.type === 'JELLYFISH') drawJellyfish(ctx, enemy, time);
        else if (enemy.type === 'PIRATE_DAN') drawPirate(ctx, enemy, time, true);
        else drawPirate(ctx, enemy, time, false);
        ctx.restore();
    }

    function drawShark(ctx, enemy, time) {
        ctx.scale(enemy.vel.x > 0 ? -1 : 1, 1);
        const bodyGrad = ctx.createLinearGradient(0, -8, 0, 8);
        bodyGrad.addColorStop(0, '#94a3b8');
        bodyGrad.addColorStop(1, '#475569');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath(); ctx.ellipse(0, 0, 15, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = COLORS.SHARK_BELLY;
        ctx.beginPath(); ctx.ellipse(0, 3, 12, 4.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(15,23,42,0.4)'; ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(4 + i * 2, -3); ctx.lineTo(4 + i * 2, 3); ctx.stroke(); }
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(10, -2, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = bodyGrad;
        ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(2, -14); ctx.lineTo(8, -6); ctx.fill();
        const tailWag = Math.sin(time * 0.3) * 4;
        ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(24, -8 + tailWag); ctx.lineTo(24, 8 + tailWag); ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.moveTo(13, 1); ctx.lineTo(15, 1); ctx.lineTo(14, 3); ctx.fill();
    }

    function drawJellyfish(ctx, enemy, time) {
        const bellGrad = ctx.createRadialGradient(0, -6, 1, 0, -4, 12);
        bellGrad.addColorStop(0, 'rgba(232,207,255,0.9)');
        bellGrad.addColorStop(1, COLORS.JELLY_BODY);
        ctx.fillStyle = bellGrad;
        ctx.beginPath(); ctx.arc(0, -4, 10, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = 'rgba(232,121,249,0.6)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, -4, 10, Math.PI, 0); ctx.stroke();
        ctx.strokeStyle = COLORS.JELLY_TENTACLE; ctx.lineWidth = 1.5;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 6, -4);
            ctx.lineTo(i * 6 + Math.sin(time * 0.2 + i) * 2, 12 + Math.abs(i));
            ctx.stroke();
        }
    }

    function drawPirate(ctx, enemy, time, isBoss) {
        ctx.save();
        const scale = isBoss ? 1.3 : 1;
        ctx.scale(scale, scale);
        const speed = Math.hypot(enemy.vel.x, enemy.vel.y);
        const facing = Math.abs(enemy.vel.x) > 0.04
            ? Math.sign(enemy.vel.x)
            : (player.x >= enemy.x ? 1 : -1);
        ctx.scale(facing, 1);
        const pitch = Math.atan2(enemy.vel.y, Math.abs(enemy.vel.x) + 0.2);
        ctx.rotate(Math.max(-0.48, Math.min(0.48, pitch)));

        const suitColor = isBoss ? '#7f1d1d' : '#1e293b';
        const accentColor = isBoss ? '#facc15' : '#38bdf8';
        const suitLight = isBoss ? '#b93434' : '#475569';
        const metalColor = isBoss ? '#9a7b22' : '#64748b';
        const swimPhase = time * (0.12 + Math.min(speed, 2) * 0.04) + enemy.x * 0.025;

        // Tank, valve, and straps sit behind the diver.
        const tankGrad = ctx.createLinearGradient(-10, -7, -4, 7);
        tankGrad.addColorStop(0, '#94a3b8');
        tankGrad.addColorStop(0.35, metalColor);
        tankGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = tankGrad;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-11, -7, 5, 14, 2.5);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = accentColor;
        ctx.fillRect(-10, -3, 3, 1);
        ctx.fillRect(-10, 3, 3, 1);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-9.5, -9, 2, 2);

        // Alternating frog kick: jointed thighs, shins, and broad fins.
        const drawLeg = (side, phaseOffset) => {
            const legKick = Math.sin(swimPhase + phaseOffset) * (3 + Math.min(speed, 2));
            const hipX = -4, hipY = side * 4;
            const kneeX = -10, kneeY = side * (5.5 + legKick * 0.45);
            const ankleX = -16, ankleY = side * (5 - legKick);
            ctx.strokeStyle = side < 0 ? suitLight : shadeColor(suitColor, -18);
            ctx.lineWidth = 3.2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(hipX, hipY);
            ctx.lineTo(kneeX, kneeY);
            ctx.lineTo(ankleX, ankleY);
            ctx.stroke();
            ctx.fillStyle = isBoss ? '#eab308' : '#f59e0b';
            ctx.strokeStyle = '#422006';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(ankleX + 1, ankleY - side * 1.3);
            ctx.lineTo(-25, ankleY - side * (2.5 + legKick * 0.25));
            ctx.lineTo(-19, ankleY + side * 3.2);
            ctx.lineTo(ankleX - 1, ankleY + side * 1.2);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
        };
        drawLeg(1, 0);
        drawLeg(-1, Math.PI);

        // Ribbed wetsuit torso with a readable waist and shoulder silhouette.
        const bodyGrad = ctx.createLinearGradient(0, -7, 0, 7);
        bodyGrad.addColorStop(0, suitColor);
        bodyGrad.addColorStop(0.45, suitLight);
        bodyGrad.addColorStop(1, '#020617');
        ctx.fillStyle = bodyGrad;
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-7, -6); ctx.lineTo(3, -7); ctx.quadraticCurveTo(7, 0, 3, 7);
        ctx.lineTo(-7, 6); ctx.quadraticCurveTo(-9, 0, -7, -6);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-4, -5); ctx.lineTo(-2, 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(1, -6); ctx.lineTo(-1, 6); ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-7, -1, 11, 2);
        ctx.fillStyle = accentColor;
        ctx.fillRect(-3, -1, 3, 2);

        // Jointed arms paddle subtly instead of remaining fused to the body.
        const armSweep = Math.sin(swimPhase * 0.7 + 1.2) * 2;
        const drawArm = (side, front) => {
            const shoulderX = 2, shoulderY = side * 5;
            const elbowX = 7, elbowY = side * (6 + armSweep * 0.4);
            const handX = 12, handY = side * (3.5 - armSweep);
            ctx.strokeStyle = front ? suitLight : shadeColor(suitColor, -25);
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.lineTo(elbowX, elbowY); ctx.lineTo(handX, handY); ctx.stroke();
            ctx.fillStyle = isBoss ? '#d6a36f' : '#c58a64';
            ctx.beginPath(); ctx.arc(handX, handY, 1.4, 0, Math.PI * 2); ctx.fill();
        };
        drawArm(1, false);
        drawArm(-1, true);

        // Hood, face, glass mask, regulator, and air hose.
        ctx.fillStyle = shadeColor(suitColor, -10);
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(7, 0, 6.5, 6.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#b97858';
        ctx.beginPath(); ctx.ellipse(8.5, 0, 4.2, 4.2, 0, 0, Math.PI * 2); ctx.fill();
        const maskGrad = ctx.createLinearGradient(7, -3, 12, 3);
        maskGrad.addColorStop(0, '#d9fbff');
        maskGrad.addColorStop(0.35, accentColor);
        maskGrad.addColorStop(1, '#075985');
        ctx.fillStyle = maskGrad;
        ctx.strokeStyle = '#071522';
        ctx.beginPath();
        ctx.moveTo(7, -3); ctx.lineTo(12, -2.5); ctx.lineTo(12, 2.2); ctx.lineTo(7, 2.8); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(8, -2, 2, 1);
        ctx.fillStyle = '#111827';
        ctx.beginPath(); ctx.arc(12.5, 3.2, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(11.5, 3.5);
        ctx.bezierCurveTo(5, 10, -7, 9, -8.5, 5);
        ctx.stroke();

        // Staggered bubbles rise from the regulator.
        ctx.strokeStyle = 'rgba(224,247,255,0.65)';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 3; i++) {
            const rise = (time * 0.28 + i * 5 + enemy.x * 0.1) % 15;
            const bx = 13 + Math.sin(time * 0.08 + i) * 1.5;
            const by = 1 - rise;
            ctx.beginPath(); ctx.arc(bx, by, 0.8 + i * 0.25, 0, Math.PI * 2); ctx.stroke();
        }

        if (isBoss) {
            ctx.fillStyle = '#dc2626';
            ctx.strokeStyle = '#450a0a';
            ctx.beginPath(); ctx.moveTo(2, -5); ctx.lineTo(8, -8); ctx.lineTo(12, -6); ctx.lineTo(7, -5); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#facc15';
            ctx.fillRect(-5, -4, 2, 2);
        }
        ctx.restore();
    }

    // Procedural glowing crystal cave, replaces the old raster background
    function drawCaveBackground(ctx, time) {
        const grad = ctx.createLinearGradient(0, 0, 0, V_HEIGHT);
        grad.addColorStop(0, '#0b1120');
        grad.addColorStop(0.6, '#132036');
        grad.addColorStop(1, '#030712');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

        const waterGrad = ctx.createLinearGradient(0, V_HEIGHT * 0.7, 0, V_HEIGHT);
        waterGrad.addColorStop(0, 'rgba(56,189,248,0.05)');
        waterGrad.addColorStop(1, 'rgba(56,189,248,0.15)');
        ctx.fillStyle = waterGrad;
        ctx.fillRect(0, V_HEIGHT * 0.7, V_WIDTH, V_HEIGHT * 0.3);

        const crystalCount = 14;
        for (let i = 0; i < crystalCount; i++) {
            const rnd = hashCoord(i * 91.7, i * 3.3);
            const x = (i / crystalCount) * V_WIDTH + rnd * 20 - 10;
            const fromTop = i % 3 !== 0;
            const len = 30 + rnd * 60;
            const width = 6 + rnd * 8;
            const glowColor = rnd > 0.6 ? '#a78bfa' : '#22d3ee';
            ctx.save();
            ctx.translate(x, fromTop ? 0 : V_HEIGHT);
            const grdC = ctx.createLinearGradient(0, 0, 0, fromTop ? len : -len);
            grdC.addColorStop(0, glowColor);
            grdC.addColorStop(1, 'rgba(15,23,42,0.9)');
            ctx.fillStyle = grdC;
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            if (fromTop) { ctx.moveTo(-width / 2, 0); ctx.lineTo(width / 2, 0); ctx.lineTo(0, len); }
            else { ctx.moveTo(-width / 2, 0); ctx.lineTo(width / 2, 0); ctx.lineTo(0, -len); }
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 0.5 + Math.sin(time * 0.05 + i) * 0.2;
            ctx.fillStyle = glowColor;
            ctx.beginPath(); ctx.arc(0, fromTop ? len : -len, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        for (let i = 0; i < 25; i++) {
            const rnd = hashCoord(i * 53.7, i * 1.1);
            const x = (rnd * V_WIDTH * 1.3) % V_WIDTH;
            const y = ((time * 0.15 + i * 21) % (V_HEIGHT + 40)) - 20;
            const alpha = Math.max(0, 0.2 + Math.sin(time * 0.03 + i) * 0.15);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#67e8f9';
            ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function drawMermaid(ctx, p, time) {
        ctx.save();
        ctx.translate(p.x, p.y);
        
        // Side View
        ctx.scale(p.facing, 1);
        const pitch = Math.atan2(p.vel.y, Math.abs(p.vel.x || 0.1));
        const clampedPitch = Math.max(-Math.PI/3, Math.min(Math.PI/3, pitch));
        ctx.rotate(clampedPitch);

        const speed = p.speed;
        const phase = p.tailPhase;
        const swimEffort = Math.min(1, speed / MAX_WATER_SPEED);
        const waveAmp = 1.5 + swimEffort * 4.5;

        // A traveling wave passes from waist to fluke, yielding many smooth
        // in-between poses rather than toggling between two tail positions.
        const bodyWiggle = Math.sin(phase * 0.7) * (0.35 + swimEffort * 0.8);

        // Tail
        const tailLen = 22;
        const mX = -tailLen * 0.5;
        const mY = Math.sin(phase - 0.65) * (waveAmp * 0.55) + bodyWiggle;
        const tX = -tailLen;
        const tY = Math.sin(phase - 1.55) * waveAmp;
        const tailGrad = ctx.createLinearGradient(3, 0, tX, 0);
        tailGrad.addColorStop(0, p.appearance.finColor);
        tailGrad.addColorStop(1, shadeColor(p.appearance.finColor, -35));
        ctx.fillStyle = tailGrad;
        ctx.beginPath();
        ctx.moveTo(3, 3); ctx.lineTo(3, -3);
        ctx.bezierCurveTo(0, -3, mX, mY - 4, tX, tY - 1);
        ctx.lineTo(tX, tY + 1);
        ctx.bezierCurveTo(mX, mY + 4, 0, 3, 3, 3);
        ctx.fill();
        ctx.strokeStyle = shadeColor(p.appearance.finColor, -55);
        ctx.lineWidth = 1;
        ctx.stroke();

        // Iridescent lateral line and a pelvic fin add readable detail while
        // remaining attached to the animated tail curve.
        ctx.strokeStyle = shadeColor(p.appearance.finColor, 42);
        ctx.globalAlpha = 0.65;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(1, -1);
        ctx.quadraticCurveTo(mX, mY - 1, tX + 3, tY - 0.5);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = shadeColor(p.appearance.finColor, 16);
        ctx.beginPath();
        ctx.moveTo(mX + 3, mY + 1);
        ctx.quadraticCurveTo(mX - 1, mY + 8 + swimEffort * 2, mX - 6, mY + 2);
        ctx.quadraticCurveTo(mX - 2, mY + 3, mX + 3, mY + 1);
        ctx.fill();

        // Alternating scale plates give the tail a hand-drawn 16-bit texture.
        for (let s = 0.16, row = 0; s < 0.9; s += 0.15, row++) {
            const sx = mX + (tX - mX) * s;
            const sy = mY + (tY - mY) * s;
            ctx.fillStyle = row % 2
                ? shadeColor(p.appearance.finColor, 24)
                : shadeColor(p.appearance.finColor, -18);
            ctx.globalAlpha = 0.78;
            ctx.beginPath();
            ctx.moveTo(sx - 2.2, sy);
            ctx.lineTo(sx, sy - 1.8);
            ctx.lineTo(sx + 2.2, sy);
            ctx.lineTo(sx, sy + 1.8);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Fluke - twin-lobed fish tail with a center notch
        ctx.save();
        ctx.translate(tX, tY);
        const slope = (tY - mY) / (tX - mX);
        const flukeRot = Math.atan(slope) * 0.8;
        ctx.rotate(flukeRot);
        const flukeGrad = ctx.createLinearGradient(2, 0, -17, 0);
        flukeGrad.addColorStop(0, p.appearance.finColor);
        flukeGrad.addColorStop(1, shadeColor(p.appearance.finColor, -25));
        ctx.fillStyle = flukeGrad;
        ctx.beginPath();
        ctx.moveTo(2, -3);
        ctx.quadraticCurveTo(-8, -6, -17, -11);
        ctx.quadraticCurveTo(-11, -3, -6, -1);
        ctx.quadraticCurveTo(-11, 3, -17, 11);
        ctx.quadraticCurveTo(-8, 6, 2, 3);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shadeColor(p.appearance.finColor, -55);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(-2, -1); ctx.lineTo(-14, -8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-2, 1); ctx.lineTo(-14, 8); ctx.stroke();
        ctx.restore();

        // Torso - broad shoulders tapering to a narrow waist (hourglass), so it
        // reads as a human upper body instead of a continuation of the fish tail.
        const waistX = 2, waistW = 2.1;
        const shoulderX = 10, shoulderW = 5.5;
        const neckX = shoulderX + 1.5, neckW = 2.2;
        const armPhase = Math.sin(phase * 0.6 + 1) * 2.5;

        // Trailing arm (drawn behind torso)
        ctx.strokeStyle = shadeColor(p.appearance.skinColor, -5);
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderW - 1);
        ctx.quadraticCurveTo(shoulderX - 5, shoulderW + 4 - armPhase * 0.4, shoulderX - 8, waistW + 3 - armPhase);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(shoulderX - 8, waistW + 3 - armPhase, 1, 0, Math.PI * 2); ctx.fill();

        const bodyGrad = ctx.createLinearGradient(waistX, -shoulderW, shoulderX, shoulderW);
        bodyGrad.addColorStop(0, shadeColor(p.appearance.skinColor, -10));
        bodyGrad.addColorStop(0.5, shadeColor(p.appearance.skinColor, 22));
        bodyGrad.addColorStop(1, p.appearance.skinColor);
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(waistX, -waistW);
        ctx.quadraticCurveTo(shoulderX - 4, -shoulderW, shoulderX, -shoulderW);
        ctx.lineTo(neckX, -neckW);
        ctx.lineTo(neckX, neckW);
        ctx.lineTo(shoulderX, shoulderW);
        ctx.quadraticCurveTo(shoulderX - 4, shoulderW, waistX, waistW);
        ctx.quadraticCurveTo(waistX - 1.5, 0, waistX, -waistW);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = shadeColor(p.appearance.skinColor, -38);
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Leading arm (in front of torso)
        ctx.strokeStyle = shadeColor(p.appearance.skinColor, 10);
        ctx.beginPath();
        ctx.moveTo(shoulderX, -shoulderW + 1);
        ctx.quadraticCurveTo(shoulderX - 5, -shoulderW - 4 + armPhase * 0.4, shoulderX - 8, -waistW - 3 + armPhase);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(shoulderX - 8, -waistW - 3 + armPhase, 1, 0, Math.PI * 2); ctx.fill();

        // Shell top
        ctx.fillStyle = p.appearance.finColor;
        ctx.beginPath(); ctx.ellipse(shoulderX - 1.5, -2.3, 2.4, 1.7, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(shoulderX - 1.5, 2.3, 2.4, 1.7, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = shadeColor(p.appearance.finColor, -55);
        ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(shoulderX - 4, 0); ctx.lineTo(shoulderX + 1, 0); ctx.stroke();

        // Head & neck
        const headX = neckX + 6, headY = -1;
        ctx.fillStyle = shadeColor(p.appearance.skinColor, 5);
        ctx.fillRect(neckX - 0.5, -2.2, headX - neckX + 1, 4.4);
        const headGrad = ctx.createRadialGradient(headX - 1.5, headY - 2, 1, headX, headY, 7);
        headGrad.addColorStop(0, shadeColor(p.appearance.skinColor, 32));
        headGrad.addColorStop(1, p.appearance.skinColor);
        ctx.fillStyle = headGrad;
        ctx.beginPath(); ctx.ellipse(headX, headY, 6, 6.5, 0, 0, Math.PI * 2); ctx.fill();

        // Hair - back layer, bold and darker than skin/fin so it always reads
        // clearly regardless of the chosen palette. One cohesive mass with a
        // rounded tip (not several thin pointed locks fanning out, which reads
        // as tentacles) plus a couple of inner strand lines for texture.
        const hairColor = p.appearance.hairColor || '#39245f';
        const drawHairMass = (topY, botY, length, tipSpread, waviness) => {
            const rootX = headX - 1, tipX = rootX - length;
            const wave = Math.sin(phase - length * 0.035) * waviness * (0.55 + swimEffort * 0.45);
            const tipY = headY + (topY + botY) / 2 + wave;
            const bendX = rootX - length * 0.42;

            ctx.beginPath();
            ctx.moveTo(rootX, headY + topY);
            ctx.quadraticCurveTo(bendX, headY + topY - length * 0.08 + wave * 0.6, tipX, tipY - tipSpread);
            ctx.quadraticCurveTo(tipX - length * 0.06, tipY, tipX, tipY + tipSpread);
            ctx.quadraticCurveTo(bendX, headY + botY + length * 0.05 + wave * 0.4, rootX, headY + botY);
            ctx.closePath();
            ctx.fill();

            // Inner strand lines for texture, kept well inside the silhouette
            ctx.strokeStyle = shadeColor(hairColor, -18);
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(rootX - length * 0.15, headY + (topY * 0.6 + botY * 0.4));
            ctx.quadraticCurveTo(bendX, tipY - tipSpread * 0.3 + wave * 0.3, tipX + length * 0.08, tipY);
            ctx.stroke();
        };
        ctx.fillStyle = hairColor;
        if (p.appearance.hairType === 'BUN') {
            ctx.beginPath(); ctx.arc(headX + 1, headY - 7.5, 3.8, 0, Math.PI * 2); ctx.fill();
            drawHairMass(-6, -1, 9, 1.2, 1.2);
        } else if (p.appearance.hairType === 'WAVY') {
            drawHairMass(-7.5, -1.5, 16, 1.6, 2.4);
        } else { // LONG
            drawHairMass(-8, -1, 32, 1.9, 3);
        }
        // Two broad, tapered locks echo the dramatic wind-and-water swept hair
        // of early-'90s fantasy illustration without turning into thin tendrils.
        if (p.appearance.hairType !== 'BUN') {
            const lockWave = Math.sin(phase - 0.9) * (1.2 + swimEffort * 1.5);
            ctx.fillStyle = shadeColor(hairColor, 18);
            ctx.beginPath();
            ctx.moveTo(headX - 2, headY - 6);
            ctx.quadraticCurveTo(headX - 12, headY - 13 + lockWave, headX - 22, headY - 9 + lockWave);
            ctx.quadraticCurveTo(headX - 13, headY - 8 + lockWave, headX - 3, headY - 3);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = shadeColor(hairColor, -15);
            ctx.beginPath();
            ctx.moveTo(headX - 3, headY - 2);
            ctx.quadraticCurveTo(headX - 15, headY + 6 - lockWave, headX - 27, headY + 3 - lockWave);
            ctx.quadraticCurveTo(headX - 15, headY + 2 - lockWave, headX - 2, headY + 1);
            ctx.closePath();
            ctx.fill();
        }
        // Cap the root so the head-to-hair seam reads cleanly
        ctx.beginPath(); ctx.ellipse(headX, headY - 5, 3, 3.6, -0.2, 0, Math.PI * 2); ctx.fill();

        // Serious profile: low brow, narrow eye, defined nose, and restrained mouth.
        const eyeX = headX + 2.1, eyeY = headY - 1.4;
        const ink = shadeColor(hairColor, -38);
        ctx.strokeStyle = ink;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(eyeX - 2.1, eyeY - 2.2);
        ctx.lineTo(eyeX + 1.8, eyeY - 1.4);
        ctx.stroke();

        const blinkFrame = (time + Math.floor(p.x)) % 173;
        const blinking = blinkFrame < 6;
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(eyeX - 1.7, eyeY);
        ctx.quadraticCurveTo(eyeX, eyeY - (blinking ? 0.05 : 1.2), eyeX + 1.8, eyeY - 0.1);
        ctx.quadraticCurveTo(eyeX, eyeY + (blinking ? 0.05 : 0.8), eyeX - 1.7, eyeY);
        ctx.fill();
        ctx.stroke();
        if (!blinking) {
            ctx.fillStyle = '#172033';
            ctx.beginPath(); ctx.arc(eyeX + 0.45, eyeY - 0.05, 0.8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(eyeX + 0.55, eyeY - 0.5, 0.5, 0.5);
        }
        if (p.appearance.eyeType === 'LASHES') {
            ctx.beginPath(); ctx.moveTo(eyeX + 1.6, eyeY - 0.3); ctx.lineTo(eyeX + 2.8, eyeY - 1.2); ctx.stroke();
        }

        ctx.strokeStyle = shadeColor(p.appearance.skinColor, -45);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(headX + 4.2, headY - 0.2);
        ctx.lineTo(headX + 5.2, headY + 1.1);
        ctx.lineTo(headX + 4.2, headY + 1.5);
        ctx.stroke();

        const mouthX = headX + 2.6, mouthY = headY + 3.2;
        ctx.strokeStyle = '#713b46';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        if (p.appearance.mouthType === 'OPEN') {
            ctx.fillStyle = '#542435';
            ctx.ellipse(mouthX + 0.5, mouthY, 1.4, 0.75, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (p.appearance.mouthType === 'NEUTRAL') {
            ctx.moveTo(mouthX - 1.3, mouthY);
            ctx.lineTo(mouthX + 1.5, mouthY);
            ctx.stroke();
        } else {
            ctx.moveTo(mouthX - 1.4, mouthY - 0.1);
            ctx.quadraticCurveTo(mouthX + 0.2, mouthY - 0.65, mouthX + 1.7, mouthY + 0.25);
            ctx.stroke();
        }

        // Hair - front bangs layer for depth over the forehead
        ctx.fillStyle = hairColor;
        ctx.beginPath();
        ctx.moveTo(headX - 1, headY - 5.5);
        ctx.quadraticCurveTo(headX + 2, headY - 6.5, headX + 4.5, headY - 4);
        ctx.quadraticCurveTo(headX + 2, headY - 3.5, headX - 1, headY - 5.5);
        ctx.fill();

        // Weapon
        if (p.equippedWeapon && p.equippedWeapon !== 'NONE') {
            ctx.save();
            ctx.translate(shoulderX - 3, waistW + 3);
            if (p.attackTimer > 0) {
                // Stab animation
                ctx.translate(5, 0);
            }
            ctx.rotate(Math.PI / 4);
            const wStats = WEAPON_STATS[p.equippedWeapon];
            ctx.fillStyle = wStats ? wStats.color : 'white';
            ctx.fillRect(0, -1, 12, 2);
            ctx.restore();
        }

        ctx.restore();
    }
};
