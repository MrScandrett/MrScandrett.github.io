const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const bestScoreElement = document.getElementById("best-score");
const finalScoreElement = document.getElementById("final-score");
const startScreen = document.getElementById("start-screen");
const gameOverScreen = document.getElementById("game-over");
const startButton = document.getElementById("start-button");
const restartButton = document.getElementById("restart-button");
const speedSlider = document.getElementById("speedSlider");
const speedValue = document.getElementById("speed-value");

function loadSprite(path) {
    const image = new Image();
    image.src = path;
    return image;
}

const sprites = {
    player: loadSprite("assets/kenney/player-fish.png"),
    shark: loadSprite("assets/kenney/red-shark.png"),
    rock: loadSprite("assets/kenney/rock.png"),
    seaweedGreen: loadSprite("assets/kenney/seaweed-green.png"),
    seaweedPink: loadSprite("assets/kenney/seaweed-pink.png")
};

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const player = { x: 185, y: HEIGHT / 2, radius: 15, facing: 1 };
const keys = new Set();
const bubbles = Array.from({ length: 32 }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    radius: 1 + Math.random() * 4,
    speed: 0.15 + Math.random() * 0.45,
    alpha: 0.08 + Math.random() * 0.18
}));

let sharks = [];
let gameState = "ready";
let startTime = 0;
let elapsed = 0;
let lastFrame = performance.now();
let sharkSpeed = Number(speedSlider.value);
let bestScore = loadBestScore();
bestScoreElement.textContent = `${bestScore.toFixed(1)}s`;

function loadBestScore() {
    try { return Number(localStorage.getItem("red-shark-best")) || 0; }
    catch { return 0; }
}

function saveBestScore(value) {
    try { localStorage.setItem("red-shark-best", String(value)); }
    catch { /* The game still works when storage is unavailable. */ }
}

class Shark {
    constructor(index) {
        this.index = index;
        this.reset(true);
    }

    reset(firstRun = false) {
        this.radius = 24 + Math.random() * 10;
        this.x = firstRun ? WIDTH + 150 + this.index * 145 : WIDTH + 80 + Math.random() * 300;
        this.y = 80 + Math.random() * (HEIGHT - 150);
        this.speedFactor = 0.72 + Math.random() * 0.75;
        this.wobble = Math.random() * Math.PI * 2;
    }

    update(delta) {
        this.x -= sharkSpeed * this.speedFactor * delta * 18;
        this.wobble += delta * 2;
        this.y += Math.sin(this.wobble) * delta * 6;
        if (this.x + this.radius < -60) this.reset();
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = "rgba(0, 11, 24, 0.22)";
        ctx.beginPath();
        ctx.ellipse(3, this.radius * 0.62, this.radius * 1.1, this.radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        if (sprites.shark.complete && sprites.shark.naturalWidth) {
            // Kenney's sprite faces right. Sharks travel left, so flip it once.
            ctx.scale(-1, 1);
            const size = this.radius * 2.75;
            ctx.drawImage(sprites.shark, -size / 2, -size / 2, size, size);
        } else {
            ctx.fillStyle = "#ff5964";
            ctx.beginPath();
            ctx.ellipse(0, 0, this.radius, this.radius * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

function resetGame() {
    player.x = 185;
    player.y = HEIGHT / 2;
    sharks = Array.from({ length: 8 }, (_, index) => new Shark(index));
    elapsed = 0;
    scoreElement.textContent = "0.0s";
    gameOverScreen.classList.add("hidden");
    startScreen.classList.add("hidden");
    gameState = "playing";
    startTime = performance.now();
    lastFrame = startTime;
    canvas.focus({ preventScroll: true });
}

function endGame() {
    if (gameState !== "playing") return;
    gameState = "over";
    if (elapsed > bestScore) {
        bestScore = elapsed;
        saveBestScore(bestScore);
        bestScoreElement.textContent = `${bestScore.toFixed(1)}s`;
    }
    finalScoreElement.textContent = `${elapsed.toFixed(1)} seconds`;
    gameOverScreen.classList.remove("hidden");
    restartButton.focus({ preventScroll: true });
}

function movePlayerTo(clientX, clientY) {
    if (gameState !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    const nextX = (clientX - rect.left) * (WIDTH / rect.width);
    const nextY = (clientY - rect.top) * (HEIGHT / rect.height);
    player.facing = nextX >= player.x ? 1 : -1;
    player.x = Math.max(player.radius, Math.min(WIDTH - player.radius, nextX));
    player.y = Math.max(player.radius, Math.min(HEIGHT - player.radius, nextY));
}

canvas.addEventListener("pointermove", (event) => movePlayerTo(event.clientX, event.clientY));
canvas.addEventListener("pointerdown", (event) => {
    canvas.setPointerCapture?.(event.pointerId);
    movePlayerTo(event.clientX, event.clientY);
});

speedSlider.addEventListener("input", () => {
    sharkSpeed = Number(speedSlider.value);
    speedValue.textContent = String(sharkSpeed);
});

window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
        event.preventDefault();
        keys.add(key);
    }
    if ((event.key === "Enter" || event.key === " ") && gameState !== "playing") {
        event.preventDefault();
        resetGame();
    }
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
startButton.addEventListener("click", resetGame);
restartButton.addEventListener("click", resetGame);

function updateKeyboard(delta) {
    const distance = 260 * delta;
    let dx = 0;
    let dy = 0;
    if (keys.has("arrowleft") || keys.has("a")) dx -= distance;
    if (keys.has("arrowright") || keys.has("d")) dx += distance;
    if (keys.has("arrowup") || keys.has("w")) dy -= distance;
    if (keys.has("arrowdown") || keys.has("s")) dy += distance;
    if (dx) player.facing = Math.sign(dx);
    player.x = Math.max(player.radius, Math.min(WIDTH - player.radius, player.x + dx));
    player.y = Math.max(player.radius, Math.min(HEIGHT - player.radius, player.y + dy));
}

function checkCollision(shark) {
    const dx = player.x - shark.x;
    const dy = player.y - shark.y;
    const hitRadius = player.radius + shark.radius * 0.67;
    return dx * dx + dy * dy < hitRadius * hitRadius;
}

function drawBackground(time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, "#0d87a8");
    gradient.addColorStop(0.48, "#075375");
    gradient.addColorStop(1, "#042842");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "rgba(173, 246, 255, 0.07)";
    for (let x = -100; x < WIDTH + 180; x += 180) {
        ctx.beginPath();
        ctx.moveTo(x + Math.sin(time * 0.0004) * 22, 0);
        ctx.lineTo(x + 145, HEIGHT);
        ctx.lineTo(x + 255, HEIGHT);
        ctx.lineTo(x + 75, 0);
        ctx.closePath();
        ctx.fill();
    }

    bubbles.forEach((bubble) => {
        bubble.y -= bubble.speed;
        if (bubble.y < -10) {
            bubble.y = HEIGHT + 10;
            bubble.x = Math.random() * WIDTH;
        }
        ctx.strokeStyle = `rgba(210, 250, 255, ${bubble.alpha})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.stroke();
    });

    ctx.fillStyle = "#06334a";
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT - 30);
    for (let x = 0; x <= WIDTH; x += 40) {
        ctx.lineTo(x, HEIGHT - 25 - Math.sin(x * 0.04) * 9);
    }
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.lineTo(0, HEIGHT);
    ctx.fill();

    drawDecoration(sprites.seaweedGreen, 34, HEIGHT - 110, 104, 104, -0.04);
    drawDecoration(sprites.seaweedPink, 92, HEIGHT - 94, 88, 88, 0.03);
    drawDecoration(sprites.rock, 5, HEIGHT - 88, 90, 90, 0);
    drawDecoration(sprites.seaweedPink, 675, HEIGHT - 104, 98, 98, -0.025);
    drawDecoration(sprites.seaweedGreen, 728, HEIGHT - 118, 112, 112, 0.035);
    drawDecoration(sprites.rock, 714, HEIGHT - 91, 96, 96, 0);
}

function drawDecoration(image, x, y, width, height, rotation) {
    if (!image.complete || !image.naturalWidth) return;
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(rotation);
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.scale(player.facing, 1);
    ctx.fillStyle = "rgba(0, 12, 24, 0.22)";
    ctx.beginPath();
    ctx.ellipse(-1, 17, 23, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    if (sprites.player.complete && sprites.player.naturalWidth) {
        ctx.drawImage(sprites.player, -34, -34, 68, 68);
    } else {
        ctx.fillStyle = "#55f4cf";
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function gameLoop(now) {
    const delta = Math.min((now - lastFrame) / 1000, 0.033);
    lastFrame = now;
    drawBackground(now);

    if (gameState === "playing") {
        elapsed = (now - startTime) / 1000;
        scoreElement.textContent = `${elapsed.toFixed(1)}s`;
        updateKeyboard(delta);
        sharks.forEach((shark) => {
            shark.update(delta);
            shark.draw();
            if (checkCollision(shark)) endGame();
        });
    } else {
        sharks.forEach((shark) => shark.draw());
    }

    drawPlayer();
    requestAnimationFrame(gameLoop);
}

sharks = Array.from({ length: 8 }, (_, index) => new Shark(index));
requestAnimationFrame(gameLoop);
