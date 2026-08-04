const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const heartsUI = document.getElementById("hearts");
const inventoryUI = document.getElementById("inventory");

const TILE_SIZE = 48;
const TILE_FLOOR = 0;
const TILE_WALL = 1;
const TILE_DOOR = 2;
const TILE_CHEST = 3;
const TILE_POT = 4;

const MAP = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 4, 0, 0, 0, 0, 0, 3, 0, 1],
    [1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 4, 1, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 2, 1],
    [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const player = {
    x: 60,
    y: 350,
    size: 30,
    speed: 3.2,
    dirX: 0,
    dirY: 1,
    action: "idle",
    hp: 3,
    maxHp: 3,
    hasKey: false,
    attackTimer: 0,
    invulnTimer: 0,
    walkFrame: 0
};

let enemies = [
    { x: 200, y: 100, size: 30, speed: 1.25, dirX: 1, dirY: 0, changeDirTimer: 0, hurtTimer: 0 },
    { x: 450, y: 150, size: 30, speed: 1.2, dirX: 0, dirY: 1, changeDirTimer: 0, hurtTimer: 0 },
    { x: 300, y: 350, size: 30, speed: 1.3, dirX: -1, dirY: 0, changeDirTimer: 0, hurtTimer: 0 }
];

const keysPressed = {};
const particles = [];
let screenShake = 0;
let message = "Find the key. Open the east door.";
let messageTimer = 180;

window.addEventListener("keydown", (e) => {
    keysPressed[e.key] = true;

    if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
    }

    if (e.key === " " && player.action !== "attack") {
        player.action = "attack";
        player.attackTimer = 12;
        addSpark(player.x + player.size / 2 + player.dirX * 24, player.y + player.size / 2 + player.dirY * 24, "#fff0a8", 4);
    }
});

window.addEventListener("keyup", (e) => {
    keysPressed[e.key] = false;
});

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y;
}

function tileRect(row, col) {
    return { x: col * TILE_SIZE, y: row * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE };
}

function canMoveTo(x, y, size) {
    const corners = [
        { x, y },
        { x: x + size - 1, y },
        { x, y: y + size - 1 },
        { x: x + size - 1, y: y + size - 1 }
    ];

    return corners.every((corner) => {
        const col = Math.floor(corner.x / TILE_SIZE);
        const row = Math.floor(corner.y / TILE_SIZE);

        if (row < 0 || row >= MAP.length || col < 0 || col >= MAP[row].length) {
            return false;
        }

        const tile = MAP[row][col];
        return tile !== TILE_WALL && tile !== TILE_DOOR && tile !== TILE_CHEST && tile !== TILE_POT;
    });
}

function getSwordRect() {
    if (player.action !== "attack") {
        return null;
    }

    if (player.dirX !== 0) {
        return {
            x: player.x + (player.dirX > 0 ? player.size - 2 : -24),
            y: player.y + 4,
            width: 26,
            height: 22
        };
    }

    return {
        x: player.x + 4,
        y: player.y + (player.dirY > 0 ? player.size - 2 : -24),
        width: 22,
        height: 26
    };
}

function addSpark(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            life: 18 + Math.random() * 10,
            color
        });
    }
}

function setMessage(text) {
    message = text;
    messageTimer = 150;
}

function updateUI() {
    heartsUI.textContent = "LIFE " + "[]".repeat(Math.max(0, player.hp)) + "--".repeat(player.maxHp - player.hp);
    inventoryUI.textContent = "KEY " + (player.hasKey ? "1" : "0");
}

function tryUseTile(row, col) {
    if (row < 0 || row >= MAP.length || col < 0 || col >= MAP[row].length) {
        return;
    }

    if (MAP[row][col] === TILE_CHEST) {
        MAP[row][col] = TILE_FLOOR;
        player.hasKey = true;
        addSpark(col * TILE_SIZE + 24, row * TILE_SIZE + 24, "#f8d66d", 12);
        setMessage("You found a small key.");
        updateUI();
    }

    if (MAP[row][col] === TILE_DOOR && player.hasKey) {
        MAP[row][col] = TILE_FLOOR;
        player.hasKey = false;
        screenShake = 8;
        addSpark(col * TILE_SIZE + 24, row * TILE_SIZE + 24, "#f8d66d", 18);
        setMessage(enemies.length === 0 ? "The way is open." : "Door opened. Monsters remain.");
        updateUI();
    } else if (MAP[row][col] === TILE_DOOR) {
        setMessage("Locked.");
    }
}

function strikeTiles(swordRect) {
    if (!swordRect) return;

    for (let r = 0; r < MAP.length; r++) {
        for (let c = 0; c < MAP[r].length; c++) {
            const tile = MAP[r][c];

            if ((tile === TILE_POT || tile === TILE_CHEST || tile === TILE_DOOR) && checkCollision(swordRect, tileRect(r, c))) {
                if (tile === TILE_POT) {
                    MAP[r][c] = TILE_FLOOR;
                    screenShake = 4;
                    addSpark(c * TILE_SIZE + 24, r * TILE_SIZE + 24, "#d59a54", 14);
                    setMessage("Pot smashed.");
                } else {
                    tryUseTile(r, c);
                }
            }
        }
    }
}

function updatePlayer() {
    let moveX = 0;
    let moveY = 0;

    if (keysPressed.ArrowLeft || keysPressed.a) moveX -= 1;
    if (keysPressed.ArrowRight || keysPressed.d) moveX += 1;
    if (keysPressed.ArrowUp || keysPressed.w) moveY -= 1;
    if (keysPressed.ArrowDown || keysPressed.s) moveY += 1;

    if (moveX !== 0 && moveY !== 0) {
        moveX *= Math.SQRT1_2;
        moveY *= Math.SQRT1_2;
    }

    if (moveX !== 0 || moveY !== 0) {
        player.walkFrame += 0.18;
        if (Math.abs(moveX) > Math.abs(moveY)) {
            player.dirX = Math.sign(moveX);
            player.dirY = 0;
        } else {
            player.dirX = 0;
            player.dirY = Math.sign(moveY);
        }
    }

    const nextX = player.x + moveX * player.speed;
    const nextY = player.y + moveY * player.speed;

    if (canMoveTo(nextX, player.y, player.size)) player.x = nextX;
    if (canMoveTo(player.x, nextY, player.size)) player.y = nextY;

    const centerCol = Math.floor((player.x + player.size / 2) / TILE_SIZE);
    const centerRow = Math.floor((player.y + player.size / 2) / TILE_SIZE);
    const frontCol = centerCol + player.dirX;
    const frontRow = centerRow + player.dirY;

    tryUseTile(centerRow, centerCol);

    if (keysPressed.e) {
        tryUseTile(frontRow, frontCol);
    }

    if (player.attackTimer > 0) {
        player.attackTimer--;
        strikeTiles(getSwordRect());
    } else {
        player.action = "idle";
    }
}

function updateEnemies() {
    const swordRect = getSwordRect();

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        enemy.changeDirTimer--;
        enemy.hurtTimer = Math.max(0, enemy.hurtTimer - 1);

        if (enemy.changeDirTimer <= 0) {
            const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
            const randomDir = dirs[Math.floor(Math.random() * dirs.length)];
            enemy.dirX = randomDir.x;
            enemy.dirY = randomDir.y;
            enemy.changeDirTimer = Math.floor(Math.random() * 70) + 35;
        }

        const nextX = enemy.x + enemy.dirX * enemy.speed;
        const nextY = enemy.y + enemy.dirY * enemy.speed;

        if (canMoveTo(nextX, nextY, enemy.size)) {
            enemy.x = nextX;
            enemy.y = nextY;
        } else {
            enemy.changeDirTimer = 0;
        }

        if (swordRect && checkCollision(swordRect, {
            x: enemy.x,
            y: enemy.y,
            width: enemy.size,
            height: enemy.size
        })) {
            addSpark(enemy.x + enemy.size / 2, enemy.y + enemy.size / 2, "#ff6b5f", 16);
            screenShake = 6;
            enemies.splice(i, 1);
            setMessage(enemies.length === 0 ? "The room falls quiet." : "Monster defeated.");
            continue;
        }

        if (player.invulnTimer <= 0 && checkCollision(
            { x: player.x, y: player.y, width: player.size, height: player.size },
            { x: enemy.x, y: enemy.y, width: enemy.size, height: enemy.size }
        )) {
            player.hp--;
            player.invulnTimer = 70;
            screenShake = 10;
            addSpark(player.x + player.size / 2, player.y + player.size / 2, "#ffffff", 10);
            setMessage("Ouch!");
            updateUI();

            if (player.hp <= 0) {
                setTimeout(() => {
                    alert("Game Over! Try again.");
                    document.location.reload();
                }, 0);
            }
        }
    }
}

function updateEffects() {
    if (screenShake > 0) screenShake--;
    if (messageTimer > 0) messageTimer--;

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04;
        p.life--;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function update() {
    updatePlayer();
    updateEnemies();
    updateEffects();

    if (player.invulnTimer > 0) {
        player.invulnTimer--;
    }
}

function drawFloor(x, y, row, col) {
    ctx.fillStyle = (row + col) % 2 === 0 ? "#557241" : "#4d6a3c";
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = "rgba(35, 52, 30, 0.25)";
    ctx.fillRect(x + 8, y + 14, 4, 4);
    ctx.fillRect(x + 33, y + 28, 5, 3);
}

function drawWall(x, y) {
    ctx.fillStyle = "#5a5442";
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = "#756b50";
    ctx.fillRect(x + 4, y + 4, 40, 15);
    ctx.fillRect(x + 4, y + 27, 40, 14);
    ctx.fillStyle = "#332f28";
    ctx.fillRect(x, y + 19, TILE_SIZE, 3);
    ctx.fillRect(x, y + 41, TILE_SIZE, 3);
}

function drawDoor(x, y) {
    ctx.fillStyle = "#7b5627";
    ctx.fillRect(x + 6, y + 2, 36, 44);
    ctx.fillStyle = "#b98a37";
    ctx.fillRect(x + 10, y + 6, 28, 36);
    ctx.fillStyle = "#1d1812";
    ctx.fillRect(x + 21, y + 20, 6, 13);
    ctx.fillStyle = "#f3d062";
    ctx.fillRect(x + 20, y + 18, 8, 5);
}

function drawChest(x, y) {
    ctx.fillStyle = "#4d2c1a";
    ctx.fillRect(x + 7, y + 17, 34, 21);
    ctx.fillStyle = "#a05a2c";
    ctx.fillRect(x + 9, y + 13, 30, 15);
    ctx.fillStyle = "#f2c84b";
    ctx.fillRect(x + 21, y + 24, 7, 7);
    ctx.fillStyle = "#2d1b12";
    ctx.fillRect(x + 9, y + 28, 30, 3);
}

function drawPot(x, y) {
    ctx.fillStyle = "#5b342b";
    ctx.fillRect(x + 16, y + 16, 16, 23);
    ctx.fillStyle = "#c57945";
    ctx.fillRect(x + 13, y + 18, 22, 18);
    ctx.fillStyle = "#e1a15e";
    ctx.fillRect(x + 16, y + 13, 16, 7);
    ctx.fillStyle = "#3c251f";
    ctx.fillRect(x + 18, y + 15, 12, 3);
}

function drawMap() {
    for (let r = 0; r < MAP.length; r++) {
        for (let c = 0; c < MAP[r].length; c++) {
            const type = MAP[r][c];
            const x = c * TILE_SIZE;
            const y = r * TILE_SIZE;

            drawFloor(x, y, r, c);

            if (type === TILE_WALL) drawWall(x, y);
            if (type === TILE_DOOR) drawDoor(x, y);
            if (type === TILE_CHEST) drawChest(x, y);
            if (type === TILE_POT) drawPot(x, y);
        }
    }
}

function drawEnemy(enemy) {
    const x = enemy.x;
    const y = enemy.y;

    ctx.fillStyle = enemy.hurtTimer > 0 ? "#ffffff" : "#b93535";
    ctx.fillRect(x + 4, y + 8, 22, 18);
    ctx.fillRect(x + 8, y + 4, 14, 26);
    ctx.fillStyle = "#6d1e24";
    ctx.fillRect(x + 3, y + 17, 6, 6);
    ctx.fillRect(x + 21, y + 17, 6, 6);
    ctx.fillStyle = "#111";
    ctx.fillRect(x + 9, y + 12, 4, 4);
    ctx.fillRect(x + 18, y + 12, 4, 4);
}

function drawPlayer() {
    if (player.invulnTimer > 0 && player.invulnTimer % 6 < 3) {
        return;
    }

    const x = player.x;
    const y = player.y;
    const bob = Math.floor(Math.sin(player.walkFrame) * 2);

    ctx.fillStyle = "#1b5f36";
    ctx.fillRect(x + 7, y + 11 + bob, 16, 17);
    ctx.fillStyle = "#2da24f";
    ctx.fillRect(x + 4, y + 13 + bob, 22, 12);
    ctx.fillStyle = "#f0c18b";
    ctx.fillRect(x + 8, y + 5 + bob, 14, 10);
    ctx.fillStyle = "#1b8f46";

    if (player.dirY === -1) {
        ctx.fillRect(x + 7, y - 1 + bob, 16, 9);
    } else if (player.dirX === -1) {
        ctx.fillRect(x + 2, y + 3 + bob, 14, 8);
    } else if (player.dirX === 1) {
        ctx.fillRect(x + 14, y + 3 + bob, 14, 8);
    } else {
        ctx.fillRect(x + 7, y + 1 + bob, 16, 8);
    }

    ctx.fillStyle = "#111";
    if (player.dirY === 1) {
        ctx.fillRect(x + 9, y + 10 + bob, 3, 3);
        ctx.fillRect(x + 18, y + 10 + bob, 3, 3);
    } else if (player.dirX === -1) {
        ctx.fillRect(x + 8, y + 9 + bob, 3, 3);
    } else if (player.dirX === 1) {
        ctx.fillRect(x + 19, y + 9 + bob, 3, 3);
    }

    ctx.fillStyle = "#6b3d1f";
    ctx.fillRect(x + 8, y + 25 + bob, 5, 5);
    ctx.fillRect(x + 17, y + 25 + bob, 5, 5);
}

function drawSword() {
    const swordRect = getSwordRect();
    if (!swordRect) return;

    ctx.fillStyle = "#fff5bf";
    ctx.fillRect(swordRect.x, swordRect.y, swordRect.width, swordRect.height);
    ctx.fillStyle = "#f4d35e";

    if (player.dirX !== 0) {
        ctx.fillRect(swordRect.x, swordRect.y + 8, swordRect.width, 6);
    } else {
        ctx.fillRect(swordRect.x + 8, swordRect.y, 6, swordRect.height);
    }
}

function drawParticles() {
    particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
    });
}

function drawMessage() {
    if (messageTimer <= 0) return;

    ctx.fillStyle = "rgba(17, 14, 10, 0.84)";
    ctx.fillRect(122, 438, 396, 26);
    ctx.strokeStyle = "#d8bd71";
    ctx.strokeRect(122, 438, 396, 26);
    ctx.fillStyle = "#fff3c4";
    ctx.font = "14px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText(message, 320, 456);
    ctx.textAlign = "left";
}

function draw() {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
    }

    drawMap();
    enemies.forEach(drawEnemy);
    drawPlayer();
    drawSword();
    drawParticles();
    drawMessage();
    ctx.restore();
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

updateUI();
loop();
