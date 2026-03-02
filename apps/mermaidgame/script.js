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
    const backgroundImage = new Image();
    let backgroundImageReady = false;
    backgroundImage.onload = () => {
        backgroundImageReady = true;
    };
    backgroundImage.src = 'sprites/background.png';
    const caveImage = new Image();
    let caveImageReady = false;
    caveImage.onload = () => {
        caveImageReady = true;
    };
    caveImage.src = 'sprites/cave.png';

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
        { score: 0, text: "Mermaid: 'I need to collect thingamabobs. Legend says they unlock the Sea Cave.'" }
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
        appearance: { 
            skinColor: '#38bdf8', 
            finColor: '#ec4899', 
            hairType: 'LONG', 
            eyeType: 'ANIME', 
            mouthType: 'SMILE' 
        }
    };

    let items = [];
    let enemies = [];
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
        particles = [];
        
        // Generate New World
        worldMap = generateMap();
        items = generateFlora(worldMap);
        
        // Spawn Player in the middle (surface)
        const cx = Math.floor(MAP_WIDTH / 2) * TILE_SIZE;
        player.x = cx;
        player.y = 200; // Start near top
        player.vel = { x: 0, y: 0 };
        player.facing = 1;
        player.health = 3;
        player.oxygen = 100;
        player.invulnTimer = 0;
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

        // Breach Effect
        if (player.y > SURFACE_Y && nextY <= SURFACE_Y && player.vel.y < -3) {
            audioManager.playBreach();
            for(let i=0; i<8; i++) {
                 particles.push({
                     x: player.x, y: SURFACE_Y, 
                     vx: (Math.random()-0.5)*3, vy: -Math.random()*3,
                     life: 1, size: Math.random()*3, color: 'white', type: 'BUBBLE'
                 });
            }
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
                player.currency += 10; // Add currency
                scoreEl.innerText = score;
                audioManager.playCollect();
                // Sparkles
                for(let k=0; k<3; k++) {
                    particles.push({
                        x: picked.x, y: picked.y, 
                        vx: (Math.random()-0.5)*2, vy: -1 - Math.random(),
                        life: 0.5, size: 2, color: '#facc15', type: 'SPARK'
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

        // 4. Update Particles
        for(let i=particles.length-1; i>=0; i--) {
            const p = particles[i];
            p.x += p.vx; p.y += p.vy;
            p.life -= 0.05;
            if (p.life <= 0) particles.splice(i, 1);
        }
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

        // Draw Deep Ocean Background
        if (backgroundImageReady) {
            const bgStartY = SURFACE_Y;
            ctx.drawImage(backgroundImage, camera.x, bgStartY, V_WIDTH, backgroundImage.height);
        } else {
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
            ctx.fillRect(camera.x, SURFACE_Y, V_WIDTH, MAP_HEIGHT*TILE_SIZE);
        }

        const camCenterY = camera.y + V_HEIGHT/2;
        const currentBiome = getBiomeAtDepth(Math.floor(camCenterY / TILE_SIZE));
        drawParallaxBackground(ctx, camera.x, camera.y, currentBiome);
        drawGodRays(ctx, camera.x, frameCount);

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
            for (let x = startCol; x <= endCol; x++) {
                if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
                    if (worldMap[y][x] === 1) {
                        ctx.fillStyle = BIOME_CONFIG.CORAL.colors.rock;
                        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                        ctx.fillStyle = 'rgba(255,255,255,0.05)'; 
                        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, 2);
                    }
                }
            }
        }

        drawCave(ctx);
        const caveDist = Math.hypot(player.x - CAVE_POS.x, player.y - CAVE_POS.y);
        if (caveUnlocked && caveDist < CAVE_RADIUS + 20) {
            drawPixelText(ctx, "PRESS E TO ENTER", CAVE_POS.x, CAVE_POS.y - 40, '#facc15', 8, 'center');
        } else if (!caveUnlocked && caveDist < CAVE_RADIUS + 20) {
            drawPixelText(ctx, "CAVE LOCKED", CAVE_POS.x, CAVE_POS.y - 40, '#94a3b8', 8, 'center');
        }

        // 3. Draw Items
        ctx.fillStyle = '#ffd700';
        items.forEach(item => {
            ctx.beginPath();
            ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // 4. Draw Enemies
        enemies.forEach(enemy => {
            ctx.save(); ctx.translate(enemy.x, enemy.y);
            
            if (enemy.type === 'SHARK') {
                ctx.scale(enemy.vel.x > 0 ? -1 : 1, 1);
                ctx.fillStyle = COLORS.SHARK_BODY;
                ctx.beginPath(); ctx.ellipse(0, 0, 15, 8, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = COLORS.SHARK_BELLY;
                ctx.beginPath(); ctx.ellipse(0, 2, 12, 5, 0, 0, Math.PI*2); ctx.fill();
                // Fin & Tail
                ctx.fillStyle = COLORS.SHARK_BODY;
                ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(2, -14); ctx.lineTo(8, -6); ctx.fill();
                ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(24, -8); ctx.lineTo(24, 8); ctx.fill();
            } else if (enemy.type === 'JELLYFISH') {
                ctx.fillStyle = COLORS.JELLY_BODY;
                ctx.beginPath(); ctx.arc(0, -4, 10, Math.PI, 0); ctx.fill();
                ctx.strokeStyle = COLORS.JELLY_TENTACLE;
                ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-6 + Math.sin(frameCount*0.2)*2, 12); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0 + Math.sin(frameCount*0.2 + 1)*2, 14); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(6, -4); ctx.lineTo(6 + Math.sin(frameCount*0.2 + 2)*2, 12); ctx.stroke();
            } else {
                // Default Pirate
                ctx.fillStyle = '#1e293b'; 
                ctx.fillRect(-6, -6, 12, 12);
                ctx.fillStyle = 'yellow'; ctx.fillRect(2, -4, 4, 2);
            }
            ctx.restore();
        });

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

    // --- DRAWING HELPERS (Ported from React) ---

    function drawSky(ctx, cameraX, cameraY, width, height, time) {
        const skyTop = cameraY - 100; 
        const skyHeight = SURFACE_Y - skyTop;
        
        if (skyHeight > 0) {
            const grd = ctx.createLinearGradient(0, skyTop, 0, SURFACE_Y);
            grd.addColorStop(0, '#020617');
            grd.addColorStop(1, '#1e1b4b');
            ctx.fillStyle = grd;
            ctx.fillRect(cameraX, skyTop, width, skyHeight);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            for(let i=0; i<50; i++) {
                const x = (i * 47 + cameraX * 0.95) % width + cameraX; 
                const y = ((i * 13) % 200) - 200; 
                if (y < SURFACE_Y && y > skyTop) {
                    const twinkle = Math.sin(time * 0.1 + i) > 0.8 ? 0 : 1;
                    if(twinkle) ctx.fillRect(x, y, 1, 1);
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
        if (caveImageReady) {
            ctx.drawImage(caveImage, 0, 0, V_WIDTH, V_HEIGHT);
        } else {
            ctx.fillStyle = '#020617';
            ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);
        }

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
        const waveAmp = 2.0 + (speed * 1.5);

        // Flowing motion for Ecco-like swimming
        const bodyWiggle = Math.sin(phase * 0.6) * (1 + speed * 0.8);
        const tailWiggle = Math.sin(phase) * (2 + speed * 1.6);

        // Tail
        const tailLen = 22;
        const mX = -tailLen * 0.5; 
        const mY = Math.sin(phase - 0.5) * (waveAmp * 0.6) + bodyWiggle;
        const tX = -tailLen;
        const tY = Math.sin(phase - 1.5) * waveAmp + tailWiggle;

        ctx.fillStyle = p.appearance.finColor;
        ctx.beginPath();
        ctx.moveTo(3, 3); ctx.lineTo(3, -3);
        ctx.bezierCurveTo(0, -3, mX, mY - 4, tX, tY - 1);
        ctx.lineTo(tX, tY + 1); 
        ctx.bezierCurveTo(mX, mY + 4, 0, 3, 3, 3);
        ctx.fill();

        // Fluke
        ctx.save();
        ctx.translate(tX, tY);
        const slope = (tY - mY) / (tX - mX); 
        const flukeRot = Math.atan(slope) * 0.8;
        ctx.rotate(flukeRot);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-12, -10, -18, -6);
        ctx.lineTo(-14, 0);
        ctx.lineTo(-18, 6);
        ctx.quadraticCurveTo(-12, 10, 0, 0);
        ctx.fill();
        ctx.restore();

        // Body
        ctx.fillStyle = p.appearance.skinColor;
        ctx.beginPath(); ctx.ellipse(5, 0, 6, 4, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = p.appearance.finColor;
        ctx.beginPath(); ctx.arc(8, 1, 4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = p.appearance.skinColor;
        ctx.beginPath(); ctx.arc(12, -1, 5.5, 0, Math.PI * 2); ctx.fill();

        // Hair
        const hairWiggle = Math.sin(time * 0.2) * 2;
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.moveTo(14.5, -3);
        ctx.quadraticCurveTo(11, -8, 5, -5);
        ctx.bezierCurveTo(-10, -8, -25, -5 + hairWiggle, -35, -2);
        ctx.bezierCurveTo(-25, 5 + hairWiggle, -15, 8 + hairWiggle, -5, 2);
        ctx.quadraticCurveTo(5, 4, 10, 2);
        ctx.quadraticCurveTo(13, 0, 14.5, -3);
        ctx.fill();

        // Face
        ctx.fillStyle = 'black';
        ctx.beginPath(); ctx.arc(13, -1.5, 1.5, 0, Math.PI*2); ctx.fill();

        // Weapon
        if (p.equippedWeapon && p.equippedWeapon !== 'NONE') {
            ctx.save(); 
            ctx.translate(8, 6); 
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
