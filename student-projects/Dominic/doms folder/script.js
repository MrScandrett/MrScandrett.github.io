const canvas = document.getElementById("gameCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;

if (!canvas || !ctx) {
    throw new Error("Game canvas failed to initialize.");
}

const homeScreen = document.getElementById("home-screen");
const kaijuGrid = document.getElementById("kaiju-grid");
const playBtn = document.getElementById("play-btn");
const homeGCells = document.getElementById("home-gcells");
const gameGCells = document.getElementById("game-gcells");

const log = document.getElementById("log");
const healthBar = document.getElementById("playerHealth");
const ultimateBar = document.getElementById("ultimateBar");

const pauseMenu = document.getElementById("pause-menu");
const resumeBtn = document.getElementById("resume-btn");
const quitBtn = document.getElementById("quit-btn");

const cdOverlays = {
    1: document.getElementById("cd-1"),
    2: document.getElementById("cd-2"),
    3: document.getElementById("cd-3"),
    4: document.getElementById("cd-4")
};

const worldWidth = 2000;
const worldHeight = 2000;

// =========================
// SPRITE
// =========================
function createSprite(fileName) {
    const img = new Image();
    // Relative path keeps sprite loading stable in /apps/* builds.
    img.src = `./assets/sprites/${fileName}`;
    return img;
}

const godzillaImg = createSprite("godzilla.png");
const kongImg = createSprite("kong.png");
const mothraImg = createSprite("mothra.png");
const rodanImg = createSprite("rodan.png");
const mechaImg = createSprite("mecha.png");

// =========================
// ENTITY
// =========================
class Entity {
    constructor(x, y, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.size = 64;
        this.maxHealth = isPlayer ? 500 : 100;
        this.health = this.maxHealth;
        this.isPlayer = isPlayer;
        this.speed = isPlayer ? 3 : 1.5;
        this.dirX = 0;
        this.dirY = 0;
        this.attackCooldown = 0;
        this.facing = 1; // 1 = right, -1 = left
        this.z = 0;      // Height off ground
        this.vz = 0;     // Vertical velocity
        this.isStomping = false;
        this.isBoss = false;
        this.thermoTimer = 0; // Timer for Thermo Nuclear state
        this.img = godzillaImg;
        this.fallbackColor = "#4CAF50";
    }

    draw() {
        // Shadow
        // Shadow shrinks as entity goes higher
        const shadowScale = Math.max(0.5, 1 - this.z / 100);
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(this.x + this.size / 2, this.y + this.size - 2, (this.size / 3) * shadowScale, (this.size / 8) * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(this.x + this.size / 2, this.y - this.z); // Draw sprite higher based on Z
        
        // Thermo Nuclear Effect (Glow)
        if (this.thermoTimer > 0) {
            const pulseFactor = Math.abs(Math.sin(this.thermoTimer * 0.1));
            ctx.shadowBlur = 20 + pulseFactor * 20; // Pulse from 20 to 40
            ctx.shadowColor = "orange";
            ctx.globalCompositeOperation = "lighter";
        }

        ctx.scale(this.facing, 1);
        // Never crash the loop if a sprite is missing.
        if (this.img && this.img.complete && this.img.naturalWidth > 0) {
            ctx.drawImage(this.img, -this.size / 2, 0, this.size, this.size);
        } else {
            ctx.fillStyle = this.fallbackColor;
            ctx.fillRect(-this.size / 2, 0, this.size, this.size);
            ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
            ctx.fillRect(-this.size / 2 + 6, 6, this.size - 12, 12);
        }
        ctx.restore();

        // Improved Health Bar
        const barW = this.size;
        const barH = 6;
        const barX = this.x;
        const barY = this.y - 12 - this.z; // Moves with entity height

        // Border
        ctx.fillStyle = "#000";
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

        // Background (Dark Red)
        ctx.fillStyle = "#500";
        ctx.fillRect(barX, barY, barW, barH);

        // Foreground (Gradient)
        const hpPct = Math.max(0, this.health / this.maxHealth);
        if (hpPct > 0) {
            const grad = ctx.createLinearGradient(0, barY, 0, barY + barH);
            if (this.isBoss) {
                grad.addColorStop(0, "#ffaa00");
                grad.addColorStop(1, "#aa4400");
            } else {
                grad.addColorStop(0, "#00ff00");
                grad.addColorStop(1, "#006600");
            }
            ctx.fillStyle = grad;
            ctx.fillRect(barX, barY, barW * hpPct, barH);

            // Glossy Shine
            ctx.fillStyle = "rgba(255,255,255,0.25)";
            ctx.fillRect(barX, barY, barW * hpPct, barH / 2);
        }
    }

    move(dx, dy) {
        this.x += dx * this.speed;
        this.y += dy * this.speed;

        this.x = Math.max(0, Math.min(worldWidth - this.size, this.x));
        this.y = Math.max(0, Math.min(worldHeight - this.size, this.y));
    }
}

// =========================
// GAME STATE
// =========================
const player = new Entity(200, 200, true);
let enemies = [];
spawnEnemies();

function spawnEnemies() {
    enemies = [
        new Entity(700, 200),
        new Entity(800, 400),
        new Entity(600, 100)
    ];
}

let civilians = [];
spawnCivilians();

function spawnCivilians() {
    civilians = [];
    for (let i = 0; i < 40; i++) {
        civilians.push(createCivilian());
    }
}

function spawnBoss() {
    bossActive = true;
    const boss = new Entity(worldWidth - 200, worldHeight / 2 - 75);
    boss.size = 150;
    boss.maxHealth = 3000;
    boss.health = boss.maxHealth;
    boss.speed = 2.5;
    boss.isBoss = true;
    enemies = [boss];
    log.textContent = "⚠️ BOSS BATTLE STARTED! ⚠️";
}

function createCivilian() {
    const roadSpacing = 200;
    const roadOffset = 100;
    const isCar = Math.random() > 0.7;
    const isVertical = Math.random() > 0.5;
    
    let x, y, dirX, dirY;

    if (isVertical) {
        const col = Math.floor(Math.random() * (worldWidth / roadSpacing));
        x = col * roadSpacing + roadOffset;
        y = Math.random() * (worldHeight + 200) - 100;
        dirX = 0;
        dirY = Math.random() > 0.5 ? 1 : -1;
    } else {
        const row = Math.floor(Math.random() * (worldHeight / roadSpacing));
        y = row * roadSpacing + roadOffset;
        x = Math.random() * (worldWidth + 200) - 100;
        dirX = Math.random() > 0.5 ? 1 : -1;
        dirY = 0;
    }

    return {
        x, y,
        type: isCar ? "car" : "human",
        speed: isCar ? (Math.random() * 3 + 3) : (Math.random() * 1.5 + 1),
        dirX, dirY,
        color: isCar ? `hsl(${Math.random() * 360}, 70%, 50%)` : "#ffccaa"
    };
}

const keys = {};
let ultimateCharge = 0;

const projectiles = []; // tailwind
const effects = [];     // visual effects
const pendingUltimates = []; // delayed attacks

// ultimate beam
let beamTimer = 0;
let beamData = null;
let shakeAmount = 0;
const floatingTexts = [];
let isGameOver = false;
let regenTimer = 0;
let selectedKaiju = "godzilla";

function safeStorageGet(key, fallbackValue) {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallbackValue : raw;
    } catch (_) {
        return fallbackValue;
    }
}

function safeStorageSet(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (_) {
        // Ignore storage write issues to keep gameplay running.
    }
}

function readUnlockedKaijus() {
    try {
        const raw = safeStorageGet("kaiju_unlocked", null);
        if (!raw) return ["godzilla"];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return ["godzilla"];
        if (!parsed.includes("godzilla")) parsed.unshift("godzilla");
        return parsed;
    } catch (_) {
        return ["godzilla"];
    }
}

let gCells = Number.parseInt(safeStorageGet("kaiju_gcells", "0"), 10) || 0;
let unlockedKaijus = readUnlockedKaijus();
let isGameRunning = false;
let enemiesDefeated = 0;
let bossActive = false;
let gameMode = "survival";
let isPaused = false;
let selectedUltimate = "thermo";
let isVictory = false;

// =========================
// SOUND SYSTEM (Web Audio API)
// =========================
const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
if (AudioCtxClass) {
    try {
        audioCtx = new AudioCtxClass();
    } catch (_) {
        audioCtx = null;
    }
}

function playSound(type) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === "tailwhip") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === "stomp") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    } else if (type === "hit") {
        osc.type = "square";
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === "laser") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.linearRampToValueAtTime(200, now + 1.0);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 1.0);
        osc.start(now);
        osc.stop(now + 1.0);
    }
}

// cooldowns (frames)
const moveCooldowns = {
    1: { duration: 40, remaining: 0 },
    2: { duration: 80, remaining: 0 },
    3: { duration: 90, remaining: 0 },
    4: { duration: 100, remaining: 0 }
};

// =========================
// INPUT
// =========================
document.addEventListener("keydown", e => {
    keys[e.key] = true;

    if ((isGameOver || isVictory) && e.key.toLowerCase() === "r") {
        returnToMenu();
        return;
    }
    if (e.key.toLowerCase() === "escape" && isGameRunning && !isGameOver && !isVictory) {
        togglePause();
        return;
    }

    if (["1", "2", "3", "4", "5"].includes(e.key)) {
        useMove(parseInt(e.key), player);
    }
});

document.addEventListener("keyup", e => {
    keys[e.key] = false;
});

document.querySelectorAll(".move-slot").forEach(button => {
    button.addEventListener("click", () => {
        const move = parseInt(button.dataset.move);
        if (move) {
            useMove(move, player);
        }
    });
});

resumeBtn.addEventListener("click", () => {
    if (isPaused) togglePause();
});

quitBtn.addEventListener("click", () => {
    if (isPaused) togglePause();
    returnToMenu();
});

function togglePause() {
    if (!isGameRunning || isGameOver) return;
    isPaused = !isPaused;
    pauseMenu.classList.toggle("hidden", !isPaused);
}

// =========================
// HITBOX HELPERS
// =========================
function rectHitbox(x, y, w, h) {
    return { x, y, w, h };
}

function circleHitbox(x, y, r) {
    return { x, y, r, circle: true };
}

function hitboxCollides(hitbox, entity) {
    if (hitbox.circle) {
        const dx = (entity.x + entity.size / 2) - hitbox.x;
        const dy = (entity.y + entity.size / 2) - hitbox.y;
        return dx * dx + dy * dy <= hitbox.r * hitbox.r;
    }
    return (
        hitbox.x < entity.x + entity.size &&
        hitbox.x + hitbox.w > entity.x &&
        hitbox.y < entity.y + entity.size &&
        hitbox.y + hitbox.h > entity.y
    );
}

// =========================
// EFFECTS
// =========================
function addEffect(type, data, duration = 12) {
    effects.push({ type, data, timer: duration, max: duration });
}

function drawEffects() {
    for (let i = effects.length - 1; i >= 0; i--) {
        const e = effects[i];
        const alpha = e.timer / e.max;

        ctx.save();
        switch (e.type) {
            case "stomp":
                ctx.strokeStyle = `rgba(200,200,200,${alpha})`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(e.data.x, e.data.y, e.data.r, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case "bite":
                ctx.fillStyle = `rgba(255,0,0,${alpha})`;
                ctx.fillRect(e.data.x, e.data.y, e.data.w, e.data.h);
                break;
            case "punch":
                ctx.fillStyle = `rgba(255,255,0,${alpha})`;
                ctx.fillRect(e.data.x, e.data.y, e.data.w, e.data.h);
                break;
            case "beam":
                ctx.globalCompositeOperation = "lighter";
                const color = e.data.color || "blue";
                const isRed = color === "orange" || color === "red";
                
                // Outer glow
                ctx.shadowBlur = 20;
                ctx.shadowColor = isRed ? `rgba(255, 50, 0, ${alpha})` : `rgba(0, 100, 255, ${alpha})`;
                ctx.fillStyle = isRed ? `rgba(255, 0, 0, ${alpha * 0.5})` : `rgba(0, 150, 255, ${alpha * 0.5})`;
                ctx.fillRect(e.data.x, e.data.y - 8, e.data.w, e.data.h + 16);

                // Inner core
                ctx.shadowBlur = 10;
                ctx.shadowColor = "white";
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.fillRect(e.data.x, e.data.y + 4, e.data.w, e.data.h - 8);
                break;
            case "tailAura":
                ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`;
                ctx.beginPath();
                ctx.ellipse(e.data.x, e.data.y, 30, 15, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
            case "charge":
                const owner = e.data.owner;
                const cx = owner.x + owner.size / 2;
                const cy = owner.y + owner.size / 2;
                const chargeRatio = 1 - (e.timer / e.max);
                
                ctx.shadowBlur = 15 * chargeRatio;
                ctx.shadowColor = "cyan";
                ctx.fillStyle = `rgba(0, 255, 255, ${chargeRatio})`;
                ctx.beginPath();
                ctx.arc(cx, cy, 10 + 30 * chargeRatio, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                break;
            case "splat":
                ctx.fillStyle = "rgba(200, 0, 0, 0.8)";
                ctx.beginPath();
                ctx.arc(e.data.x, e.data.y, 6, 0, Math.PI * 2);
                ctx.fill();
                break;
            case "thermoPulse":
                ctx.strokeStyle = `rgba(255, 100, 0, ${alpha})`;
                ctx.lineWidth = 10 * alpha;
                ctx.fillStyle = `rgba(255, 50, 0, ${alpha * 0.3})`;
                ctx.beginPath();
                ctx.arc(e.data.x, e.data.y, e.data.r * (1 - alpha), 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;
        }
        ctx.restore();

        e.timer--;
        if (e.timer <= 0) effects.splice(i, 1);
    }
}

function drawBackground(camX, camY) {
    // Asphalt base
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, worldWidth, worldHeight);
    
    const blockSize = 200;
    const centerX = camX + canvas.width / 2;
    const centerY = camY + canvas.height / 2;

    // Optimize loops to only draw visible area
    const startX = Math.floor((camX - 100) / blockSize) * blockSize + 100;
    const endX = camX + canvas.width + 100;
    const startY = Math.floor((camY - 100) / blockSize) * blockSize + 100;
    const endY = camY + canvas.height + 100;

    // Road lines (Draw first so buildings overlap them)
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 20]);
    
    for (let x = startX; x <= endX; x += blockSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, worldHeight);
        ctx.stroke();
    }
    for (let y = startY; y <= endY; y += blockSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(worldWidth, y);
        ctx.stroke();
    }
    ctx.setLineDash([]);
    
    // Draw city blocks
    for (let x = startX - 200; x <= endX; x += blockSize) {
        for (let y = startY - 200; y <= endY; y += blockSize) {
            // Sidewalk
            ctx.fillStyle = "#444";
            ctx.fillRect(x + 10, y + 10, blockSize - 20, blockSize - 20);

            // Building Props
            const seed = (x * 17 + y * 23);
            const hue = Math.abs(seed) % 360;
            const inset = 25;
            
            // Base Rect
            const bX = x + inset;
            const bY = y + inset;
            const bW = blockSize - inset * 2;
            const bH = blockSize - inset * 2;

            // 3D Perspective (Towering effect)
            const vecX = (bX + bW/2) - centerX;
            const vecY = (bY + bH/2) - centerY;
            const heightFactor = 0.25; // How "tall" they look
            const offX = vecX * heightFactor;
            const offY = vecY * heightFactor;

            const rX = bX + offX;
            const rY = bY + offY;

            // Draw Sides (Darker)
            ctx.fillStyle = `hsl(${hue}, 15%, 15%)`;
            ctx.beginPath(); ctx.moveTo(bX, bY); ctx.lineTo(bX + bW, bY); ctx.lineTo(rX + bW, rY); ctx.lineTo(rX, rY); ctx.fill(); // Top
            ctx.beginPath(); ctx.moveTo(bX + bW, bY); ctx.lineTo(bX + bW, bY + bH); ctx.lineTo(rX + bW, rY + bH); ctx.lineTo(rX + bW, rY); ctx.fill(); // Right
            ctx.beginPath(); ctx.moveTo(bX + bW, bY + bH); ctx.lineTo(bX, bY + bH); ctx.lineTo(rX, rY + bH); ctx.lineTo(rX + bW, rY + bH); ctx.fill(); // Bottom
            ctx.beginPath(); ctx.moveTo(bX, bY + bH); ctx.lineTo(bX, bY); ctx.lineTo(rX, rY); ctx.lineTo(rX, rY + bH); ctx.fill(); // Left
            
            // Draw Roof (Lighter)
            ctx.fillStyle = `hsl(${hue}, 15%, 25%)`;
            ctx.fillRect(rX, rY, bW, bH);
            
            // Roof Detail
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            if (seed % 2 === 0) {
                // AC Unit
                ctx.fillRect(rX + 10, rY + 10, 30, 30);
            } else {
                // Helipad circle
                ctx.beginPath();
                ctx.arc(rX + bW/2, rY + bH/2, 20, 0, Math.PI*2);
                ctx.fill();
            }
        }
    }
}

function addFloatingText(x, y, text, color = "255, 255, 255") {
    floatingTexts.push({ x, y, text, life: 40, vy: -1.5, color });
}

// =========================
// MOVES
// =========================
function canUseMove(move, attacker) {
    if (!attacker.isPlayer) return attacker.attackCooldown <= 0;
    if (attacker.attackCooldown > 0) return false;
    if (move >= 1 && move <= 4 && moveCooldowns[move].remaining > 0) return false;
    if (move === 5 && ultimateCharge < 100 && attacker.isPlayer) return false;
    return true;
}

function useMove(move, attacker) {
    if (isGameOver) return;
    if (!canUseMove(move, attacker)) {
        if (attacker.isPlayer && move === 5 && ultimateCharge < 100) {
            log.textContent = "Ultimate not ready!";
        }
        return;
    }

    attacker.attackCooldown = 20;

    switch (move) {
        case 1:
            tailwhip(attacker);
            if (attacker.isPlayer) {
                startCooldown(1);
                log.textContent = "Tailwhip!";
                playSound("tailwhip");
            }
            break;
        case 2:
            stomp(attacker);
            if (attacker.isPlayer) {
                startCooldown(2);
                log.textContent = "Jump!";
            }
            break;
        case 3:
            bite(attacker);
            if (attacker.isPlayer) {
                startCooldown(3);
                log.textContent = "Bite!";
                playSound("hit");
            }
            break;
        case 4:
            if (attacker.isPlayer) {
                fireBeam(attacker); // Move 4 is now Beam for player
                startCooldown(4);
                log.textContent = "Atomic Breath!";
            } else {
                punch(attacker); // AI still punches
            }
            break;
        case 5:
            if (attacker.isPlayer) {
                if (selectedUltimate === "burning") {
                    fireBurningBreath(attacker);
                    log.textContent = "BURNING ATOMIC BREATH!";
                } else {
                    activateThermo(attacker);
                    log.textContent = "THERMO NUCLEAR PULSE!";
                }

                ultimateCharge = 0;
            }
            break;
    }
}

function startCooldown(move) {
    moveCooldowns[move].remaining = moveCooldowns[move].duration;
}

// Tailwhip: projectile + knockback
function tailwhip(attacker) {
    const damage = 12;
    const dir = attacker.facing;
    const proj = {
        x: attacker.x + (dir === 1 ? attacker.size : -40),
        y: attacker.y + attacker.size / 3,
        w: 40,
        h: 20,
        vx: 7 * dir,
        damage,
        knockback: 25,
        owner: attacker
    };
    projectiles.push(proj);
}

// Stomp: Jump then Slam
function stomp(attacker) {
    if (attacker.z > 0) return; // Cannot stomp if already in air
    attacker.vz = 15; // Jump velocity
    attacker.isStomping = true;
}

function triggerStompLand(attacker) {
    const damage = 20;
    const cx = attacker.x + attacker.size / 2;
    const cy = attacker.y + attacker.size / 2;
    const r = 80;
    
    const hitbox = circleHitbox(cx, cy, r);
    const targets = getTargets(attacker);
    
    addEffect("stomp", { x: cx, y: cy, r }, 15);
    applyDamage(hitbox, attacker, targets, damage, 0);

    // Squash civilians in range
    for (let i = civilians.length - 1; i >= 0; i--) {
        const c = civilians[i];
        const dx = c.x - cx;
        const dy = c.y - cy;
        if (dx * dx + dy * dy < r * r) {
            addEffect("splat", { x: c.x, y: c.y }, 20);
            civilians.splice(i, 1);
            civilians.push(createCivilian());
        }
    }
    playSound("stomp");
}

// Bite: front
function bite(attacker) {
    const damage = 30;
    const w = 40, h = 40;
    const x = attacker.facing === 1 ? attacker.x + attacker.size : attacker.x - w;
    const y = attacker.y + 10;

    const hitbox = rectHitbox(x, y, w, h);
    const targets = getTargets(attacker);

    addEffect("bite", { x, y, w, h }, 10);
    applyDamage(hitbox, attacker, targets, damage, 5);
}

// Punch: front
function punch(attacker) {
    const damage = 40;
    const w = 50, h = 50;
    const x = attacker.facing === 1 ? attacker.x + attacker.size : attacker.x - w;
    const y = attacker.y + 5;

    const hitbox = rectHitbox(x, y, w, h);
    const targets = getTargets(attacker);

    addEffect("punch", { x, y, w, h }, 10);
    applyDamage(hitbox, attacker, targets, damage, 10);
}

// New Ultimate: Thermo Nuclear Pulse
function activateThermo(attacker) {
    attacker.thermoTimer = 600; // Lasts 10 seconds (60fps * 10)
    addEffect("charge", { owner: attacker }, 20);
}

function fireBurningBreath(attacker) {
    const damage = 10000; // Instant kill
    const w = 800, h = 50; // Larger beam

    beamData = { attacker, w, h, color: "red", damage: damage, continuous: true };
    beamTimer = 60; //Shorter duration for regular move

    playSound("laser");
}

function fireBeam(attacker) {
    const damage = 120;
    const w = 600, h = 24;
    const x = attacker.facing === 1 ? attacker.x + attacker.size : attacker.x - w;
    const y = attacker.y + attacker.size / 3;

    const hitbox = rectHitbox(x, y, w, h);
    const targets = getTargets(attacker);

    beamData = { attacker, w, h, color: "blue" };
    beamTimer = 40; // Shorter duration for regular move

    applyDamage(hitbox, attacker, targets, 50, 15); // Reduced damage for regular move
    
    if (attacker.isPlayer) {
        // log.textContent = "Atomic Breath!";
        playSound("laser");
    }
}

// =========================
// DAMAGE + TARGETS
// =========================
function getTargets(attacker) {
    if (attacker.isPlayer) return enemies;
    return [player, ...enemies.filter(e => e !== attacker)];
}

function applyDamage(hitbox, attacker, targets, damage, knockback) {
    targets.forEach(target => {
        if (target.health > 0 && hitboxCollides(hitbox, target)) {
            target.health -= damage;
            playSound("hit");
            
            if (damage >= 10000) {
                addFloatingText(target.x + target.size / 2, target.y, "MELTED!", "orange");
            } else {
                addFloatingText(target.x + target.size / 2, target.y, damage);
            }
            if (damage > 15 && damage < 10000) shakeAmount = Math.min(20, shakeAmount + damage / 4);

            if (knockback > 0) {
                const dirX = Math.sign(target.x - attacker.x) || 1;
                target.x += dirX * knockback;
            }

            if (attacker.isPlayer && damage > 0 && damage < 120) {
                ultimateCharge = Math.min(100, ultimateCharge + damage * 0.5);
            }

            if (target.health <= 0 && attacker.isPlayer) {
                log.textContent = "Enemy defeated!";
                let reward = 10;
                if (target.isBoss) {
                    reward = 500;
                    log.textContent = "BOSS SLAIN! +500 G";
                } else {
                    enemiesDefeated++;
                }

                gCells += reward;
                safeStorageSet("kaiju_gcells", String(gCells));
                updateGCellsUI();
                addFloatingText(target.x + target.size / 2, target.y, `+${reward} G`, "255, 215, 0");
            }
        }
    });
}

// =========================
// AI
// =========================
function aiBehavior(enemy) {
    if (enemy.attackCooldown > 0) enemy.attackCooldown--;

    const targets = [player, ...enemies.filter(e => e !== enemy)];
    let nearest = null;
    let distSq = Infinity;

    targets.forEach(t => {
        if (t.health <= 0) return;
        const dx = (t.x + t.size / 2) - (enemy.x + enemy.size / 2);
        const dy = (t.y + t.size / 2) - (enemy.y + enemy.size / 2);
        const d = dx * dx + dy * dy;
        if (d < distSq) {
            distSq = d;
            nearest = t;
        }
    });

    if (nearest) {
        const dx = nearest.x - enemy.x;
        const dy = nearest.y - enemy.y;
        const dist = Math.sqrt(distSq);

        // Chase behavior
        if (dist > 60) {
            enemy.dirX = Math.sign(dx) * 0.8; // Move towards target
            enemy.dirY = Math.sign(dy) * 0.8;
        } else {
            enemy.dirX = 0;
            enemy.dirY = 0;
        }
        enemy.move(enemy.dirX, enemy.dirY);
        enemy.facing = Math.sign(dx) || enemy.facing;

        // Attack Logic
        if (enemy.attackCooldown <= 0) {
            if (dist < 80) {
                // Close range: Mix of Stomp, Bite, Punch
                const roll = Math.random();
                if (roll < 0.3) useMove(2, enemy);      // Stomp
                else if (roll < 0.6) useMove(3, enemy); // Bite
                else useMove(4, enemy);                 // Punch
                enemy.attackCooldown = 60; // Slower attacks for AI
            } else if (dist < 250 && Math.random() < 0.05) {
                // Mid range: Tailwhip
                useMove(1, enemy);
                enemy.attackCooldown = 80;
            }
        }
    } else {
        // Idle wander
        if (Math.random() < 0.02) {
            enemy.dirX = Math.random() * 2 - 1;
            enemy.dirY = Math.random() * 2 - 1;
        }
        enemy.move(enemy.dirX, enemy.dirY);
    }
}

// =========================
// FACING + TAIL AURA
// =========================
function updateFacing(entity, dx) {
    if (dx !== 0) {
        entity.facing = dx > 0 ? 1 : -1;
        return;
    }

    const targets = entity.isPlayer
        ? enemies.filter(e => e.health > 0)
        : [player, ...enemies.filter(e => e !== entity && e.health > 0)];

    if (targets.length === 0) {
        entity.facing = 1;
        return;
    }

    let nearest = null;
    let dist = Infinity;
    targets.forEach(t => {
        const dx = t.x - entity.x;
        const dy = t.y - entity.y;
        const d = dx * dx + dy * dy;
        if (d < dist) {
            dist = d;
            nearest = t;
        }
    });

    if (nearest) {
        entity.facing = Math.sign(nearest.x - entity.x) || entity.facing;
    }
}

function maybeTailAura() {
    let close = false;
    enemies.forEach(e => {
        if (e.health <= 0) return;
        const dx = (e.x + e.size / 2) - (player.x + player.size / 2);
        const dy = (e.y + e.size / 2) - (player.y + player.size / 2);
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 120) close = true;
    });

    if (close) {
        const tailX = player.facing === 1 ? player.x - 20 : player.x + player.size + 20;
        const tailY = player.y + player.size / 2;
        addEffect("tailAura", { x: tailX, y: tailY }, 8);
    }
}

function drawGameOver() {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 10;
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);

    ctx.font = "24px sans-serif";
    ctx.fillText("Press 'R' to Return to Menu", canvas.width / 2, canvas.height / 2 + 40);
    ctx.restore();
}

function drawVictory() {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "gold";
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "orange";
    ctx.shadowBlur = 20;
    ctx.fillText("VICTORY!", canvas.width / 2, canvas.height / 2 - 20);

    ctx.fillStyle = "white";
    ctx.font = "24px sans-serif";
    ctx.shadowBlur = 0;
    ctx.fillText("Boss Defeated! +1000 GCells", canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillText("Press 'R' to Return to Menu", canvas.width / 2, canvas.height / 2 + 60);
    ctx.restore();
}

function setupMatch() {
    const stats = kaijuData[selectedKaiju];
    if (!stats) return;
    player.maxHealth = stats.hp;
    player.health = player.maxHealth;
    player.speed = stats.speed;
    player.img = stats.img;
    player.fallbackColor = stats.fallbackColor || "#4CAF50";
    player.x = 200;
    player.y = 200;
    
    projectiles.length = 0;
    effects.length = 0;
    pendingUltimates.length = 0;
    ultimateCharge = 0;
    isGameOver = false;
    isVictory = false;
    isPaused = false;
    regenTimer = 0;
    enemiesDefeated = 0;
    bossActive = false;

    if (gameMode === "boss") {
        spawnBoss();
    } else {
        spawnEnemies();
    }
    spawnCivilians();
    log.textContent = "Battle Start!";
}

function updateGCellsUI() {
    homeGCells.textContent = `Gcells: ${gCells}`;
    gameGCells.textContent = `Gcells: ${gCells}`;
}

// =========================
// GAME LOOP
// =========================
function update() {
    // If the game is paused or not running, we keep the animation loop alive
    // but skip all game logic and drawing updates.
    if (isPaused || !isGameRunning) {
        requestAnimationFrame(update);
        return;
    }

    ctx.save();
    
    // Camera Logic
    let camX = player.x + player.size / 2 - canvas.width / 2;
    let camY = player.y + player.size / 2 - canvas.height / 2;
    camX = Math.max(0, Math.min(camX, worldWidth - canvas.width));
    camY = Math.max(0, Math.min(camY, worldHeight - canvas.height));

    if (shakeAmount > 0) {
        const dx = (Math.random() - 0.5) * shakeAmount;
        const dy = (Math.random() - 0.5) * shakeAmount;
        ctx.translate(dx, dy);
        shakeAmount *= 0.9;
        if (shakeAmount < 0.5) shakeAmount = 0;
    }
    ctx.translate(-camX, -camY);
    drawBackground(camX, camY);

    // Thermo Nuclear Pulse Logic
    if (player.thermoTimer > 0) {
        player.thermoTimer--;
        
        // Pulse Effect every 60 frames (slower cooldown)
        if (player.thermoTimer % 120 === 0) {
            addEffect("thermoPulse", { 
                x: player.x + player.size / 2, 
                y: player.y + player.size / 2, 
                r: 400 
            }, 30);
            shakeAmount = 10;
        }

        // Kill Aura
        enemies.forEach(e => {
            const dx = (e.x + e.size/2) - (player.x + player.size/2);
            const dy = (e.y + e.size/2) - (player.y + player.size/2);
            if (Math.sqrt(dx*dx + dy*dy) < 400 && e.health > 0) {
                if (e.isBoss) {
                    e.health -= 5; // Damage over time for boss
                    if (player.thermoTimer % 10 === 0) {
                        addFloatingText(e.x + e.size/2, e.y, "5", "orange");
                    }
                    if (e.health <= 0) {
                        // Manual reward since we bypass applyDamage
                        gCells += 500;
                        safeStorageSet("kaiju_gcells", String(gCells));
                        updateGCellsUI();
                        addFloatingText(e.x + e.size / 2, e.y, "+500 G", "255, 215, 0");
                        log.textContent = "BOSS SLAIN! +500 G";
                    }
                } else {
                    e.health = 0; // Instant Kill
                    addFloatingText(e.x, e.y, "MELTED!", "red");
                    addEffect("splat", {x: e.x, y: e.y}, 20);
                }
            }
        });
    }

    // Civilians Logic (Run away & Get Squashed)
    for (let i = civilians.length - 1; i >= 0; i--) {
        const c = civilians[i];
        c.x += c.dirX * c.speed;
        c.y += c.dirY * c.speed;

        // Draw Civilian
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(Math.atan2(c.dirY, c.dirX));
        ctx.fillStyle = c.color;
        if (c.type === "car") {
            ctx.fillRect(-6, -3, 12, 6);
        } else {
            ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();

        // Squash by walking (Player feet)
        if (player.z < 10) { // Only if player is on ground
            const footX = player.x + 15;
            const footY = player.y + player.size - 20;
            const footW = player.size - 30;
            const footH = 20;
            
            if (c.x > footX && c.x < footX + footW && c.y > footY && c.y < footY + footH) {
                addEffect("splat", { x: c.x, y: c.y }, 20);
                civilians.splice(i, 1);
                civilians.push(createCivilian());
                continue;
            }
        }

        // Remove if off screen
        if (c.x < -100 || c.x > worldWidth + 100 || c.y < -100 || c.y > worldHeight + 100) {
            civilians.splice(i, 1);
            civilians.push(createCivilian());
        }
    }

    if (player.health <= 0) isGameOver = true;

    if (isGameOver) {
        // Draw everything static then overlay
        player.draw();
        enemies.forEach(e => e.draw());
        ctx.restore(); // Restore to screen coordinates for UI
        drawGameOver();
        requestAnimationFrame(update);
        return;
    }

    if (isVictory) {
        player.draw();
        enemies.forEach(e => e.draw());
        ctx.restore();
        drawVictory();
        requestAnimationFrame(update);
        return;
    }

    // Physics (Gravity & Z-axis)
    [player, ...enemies].forEach(e => {
        if (e.z > 0 || e.vz !== 0) {
            e.z += e.vz;
            e.vz -= 1; // Gravity
            if (e.z < 0) {
                e.z = 0;
                e.vz = 0;
                if (e.isStomping) {
                    e.isStomping = false;
                    triggerStompLand(e);
                }
            }
        }
    });

    // Player movement + facing
    let dx = 0, dy = 0;
    if (keys["w"]) dy = -1;
    if (keys["s"]) dy = 1;
    if (keys["a"]) dx = -1;
    if (keys["d"]) dx = 1;
    player.move(dx, dy);
    updateFacing(player, dx);

    if (player.attackCooldown > 0) player.attackCooldown--;

    // Process charging ultimates
    for (let i = pendingUltimates.length - 1; i >= 0; i--) {
        const u = pendingUltimates[i];
        u.timer--;
        if (u.timer <= 0) {
            if (u.type === "burning") {
                fireBurningBreath(u.attacker);
                log.textContent = "BURNING ATOMIC BREATH!";
            }
            pendingUltimates.splice(i, 1);
        }
    }

    // Tailwind projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx;

        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillRect(p.x, p.y, p.w, p.h);

        const targets = getTargets(p.owner);
        const hitbox = rectHitbox(p.x, p.y, p.w, p.h);
        let hit = false;

        targets.forEach(target => {
            if (target.health > 0 && hitboxCollides(hitbox, target)) {
                target.health -= p.damage;
                addFloatingText(target.x + target.size / 2, target.y, p.damage);

                const dirX = Math.sign(target.x - p.owner.x) || 1;
                target.x += dirX * p.knockback;
                hit = true;

                if (p.owner.isPlayer) {
                    ultimateCharge = Math.min(100, ultimateCharge + p.damage * 0.5);
                    if (target.health <= 0) log.textContent = "Enemy defeated!";
                }
            }
        });

        if (hit || p.x > worldWidth + 100 || p.x < -100) {
            projectiles.splice(i, 1);
        }
    }

    // Draw player
    player.draw();

    // AI
    enemies.forEach(enemy => {
        if (enemy.health > 0) {
            aiBehavior(enemy);
            enemy.draw();
        }
    });

    // Respawn enemies
    if (enemies.every(e => e.health <= 0)) {
        if (bossActive) {
            isVictory = true;
            gCells += 1000; // Win Bonus
            safeStorageSet("kaiju_gcells", String(gCells));
            updateGCellsUI();
            log.textContent = "VICTORY! +1000 G";
        } else if (enemiesDefeated >= 10) {
            spawnBoss();
        } else {
            spawnEnemies();
            log.textContent = "New enemies have appeared!";
        }
    }

    // Ultimate beam (visual only; damage already applied)
    if (beamTimer > 0 && beamData) {
        const att = beamData.attacker;
        const bx = att.facing === 1 ? att.x + att.size : att.x - beamData.w;
        const by = att.y + att.size / 3;

        // Add a controlled screen shake for the ultimate beam
        if (beamData.color === "orange" || beamData.color === "red") {
            shakeAmount = Math.max(shakeAmount, 10);
        }

        if (beamData.continuous) {
            const hitbox = rectHitbox(bx, by, beamData.w, beamData.h);
            const targets = getTargets(att);
            // Apply damage every frame
            applyDamage(hitbox, att, targets, beamData.damage, 40);
        }

        addEffect("beam", { x: bx, y: by, w: beamData.w, h: beamData.h, color: beamData.color }, 2);
        beamTimer--;
        if (beamTimer <= 0) beamData = null;
    }

    // Tail aura when close
    maybeTailAura();
    // Regen Logic (Heal when safe)
    let isSafe = true;
    for (const e of enemies) {
        if (e.health > 0) {
            const dx = (e.x + e.size / 2) - (player.x + player.size / 2);
            const dy = (e.y + e.size / 2) - (player.y + player.size / 2);
            if (Math.sqrt(dx * dx + dy * dy) < 300) {
                isSafe = false;
                break;
            }
        }
    }

    if (isSafe && player.health < player.maxHealth && player.health > 0) {
        regenTimer++;
        if (regenTimer >= 60) {
            player.health = Math.min(player.maxHealth, player.health + 5);
            addFloatingText(player.x + player.size / 2, player.y, "+5", "0, 255, 0");
            regenTimer = 0;
        }
    } else {
        regenTimer = 0;
    }

    // Effects
    drawEffects();

    // Floating Texts
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y += ft.vy;
        ft.life--;
        ctx.fillStyle = `rgba(${ft.color}, ${ft.life / 40})`;
        ctx.strokeStyle = `rgba(0, 0, 0, ${ft.life / 40})`;
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillText(ft.text, ft.x, ft.y);
        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    ctx.restore(); // End shake

    // UI
    healthBar.style.width = Math.max(0, (player.health / player.maxHealth) * 100) + "%";
    ultimateBar.style.width = ultimateCharge + "%";

    // Cooldowns
    for (let m = 1; m <= 4; m++) {
        const cd = moveCooldowns[m];
        if (cd.remaining > 0) {
            cd.remaining--;
            const ratio = cd.remaining / cd.duration;
            cdOverlays[m].style.transform = `scaleY(${ratio})`;
        } else {
            cdOverlays[m].style.transform = "scaleY(0)";
        }
    }

    requestAnimationFrame(update);
}

// =========================
// MENU & KAIJU SELECTION
// =========================
const kaijuData = {
    godzilla: { name: "Godzilla", hp: 500, speed: 3, desc: "Balanced", price: 0, img: godzillaImg, fallbackColor: "#4CAF50" },
    kong: { name: "Kong", hp: 700, speed: 2.5, desc: "Tank", price: 500, img: kongImg, fallbackColor: "#8D6E63" },
    mothra: { name: "Mothra", hp: 300, speed: 5, desc: "Speedster", price: 300, img: mothraImg, fallbackColor: "#BA68C8" },
    rodan: { name: "Rodan", hp: 400, speed: 4, desc: "Aerial", price: 100, img: rodanImg, fallbackColor: "#EF5350" },
    mecha: { name: "Mecha Godzilla", hp: 450, speed: 3.5, desc: "Attacker", price: 1000, img: mechaImg, fallbackColor: "#90A4AE" }
};

document.getElementById("mode-survival").onclick = () => setGameMode("survival");
document.getElementById("mode-boss").onclick = () => setGameMode("boss");
function setGameMode(mode) {
    gameMode = mode;
    document.getElementById("mode-survival").classList.toggle("selected", mode === "survival");
    document.getElementById("mode-boss").classList.toggle("selected", mode === "boss");
}

document.getElementById("ult-thermo").onclick = () => setUltimate("thermo");
document.getElementById("ult-burning").onclick = () => setUltimate("burning");
function setUltimate(type) {
    selectedUltimate = type;
    document.getElementById("ult-thermo").classList.toggle("selected", type === "thermo");
    document.getElementById("ult-burning").classList.toggle("selected", type === "burning");
}

function initMenu() {
    updateGCellsUI();
    kaijuGrid.innerHTML = ""; // Clear grid to redraw

    // 1. Create Kaiju Buttons
    const keys = Object.keys(kaijuData);
    keys.forEach(key => {
        const k = kaijuData[key];
        const isUnlocked = unlockedKaijus.includes(key);
        const btn = document.createElement("div");
        btn.className = "kaiju-btn";
        
        if (isUnlocked) {
            if (key === selectedKaiju) btn.classList.add("selected");
            btn.innerHTML = `<span>${k.name}</span><span style='font-size:10px; color:#aaa'>${k.desc}</span>`;
            btn.onclick = () => {
                selectedKaiju = key;
                initMenu(); // Redraw to update selection highlight
            };
        } else {
            // Locked State
            btn.style.borderColor = "#550000";
            btn.style.opacity = "0.8";
            btn.innerHTML = `<span style="color:red">LOCKED</span><span style='font-size:12px; color:gold'>${k.price} G</span>`;
            btn.onclick = () => {
                if (gCells >= k.price) {
                    gCells -= k.price;
                    unlockedKaijus.push(key);
                    safeStorageSet("kaiju_gcells", String(gCells));
                    safeStorageSet("kaiju_unlocked", JSON.stringify(unlockedKaijus));
                    selectedKaiju = key;
                    initMenu(); // Redraw to show unlocked
                } else {
                    alert(`Need ${k.price} Gcells to unlock ${k.name}!`);
                }
            };
        }
        kaijuGrid.appendChild(btn);
    });

    // 2. Add Question Marks (Future Updates)
    for (let i = 0; i < 4; i++) {
        const btn = document.createElement("div");
        btn.className = "kaiju-btn";
        btn.setAttribute("disabled", "true");
        btn.innerHTML = "<span style='font-size: 24px'>?</span>";
        kaijuGrid.appendChild(btn);
    }

    // 3. Play Button
    playBtn.onclick = () => {
        startGame();
    };
}

function startGame() {
    if (!unlockedKaijus.includes(selectedKaiju)) {
        selectedKaiju = "godzilla";
    }

    // Setup game state
    setupMatch();

    // Hide Menu, Show Game
    homeScreen.classList.add("hidden");
    document.getElementById("top-ui").classList.remove("hidden");
    document.getElementById("bottom-ui").classList.remove("hidden");
    document.getElementById("gameCanvas").classList.remove("hidden");
    document.getElementById("log").classList.remove("hidden");
    document.getElementById("game-gcells").classList.remove("hidden");

    // Start Loop if not already running
    if (!isGameRunning) {
        isGameRunning = true;
        update();
    }
}

function returnToMenu() {
    isGameRunning = false;
    isPaused = false;
    pauseMenu.classList.add("hidden");
    homeScreen.classList.remove("hidden");
    document.getElementById("top-ui").classList.add("hidden");
    document.getElementById("bottom-ui").classList.add("hidden");
    document.getElementById("gameCanvas").classList.add("hidden");
    document.getElementById("log").classList.add("hidden");
    document.getElementById("game-gcells").classList.add("hidden");
    updateGCellsUI();
}

initMenu();
