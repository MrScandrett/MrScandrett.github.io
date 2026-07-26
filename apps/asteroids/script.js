const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const waveEl = document.getElementById("wave");
const startBtn = document.getElementById("startBtn");

const SHIP_SIZE = 16;
const SHIP_TURN_SPEED = 4.2;
const SHIP_THRUST = 180;
const SHIP_FRICTION = 0.6;
const BULLET_SPEED = 420;
const BULLET_LIFE = 1.1;
const SAFE_RADIUS = 120;
const HYPERSPACE_COOLDOWN = 3;

let ship, bullets, asteroids, particles, saucer;
let score = 0;
let lives = 3;
let wave = 1;
let running = false;
let keys = {};

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function wrap(pos) {
  if (pos.x < 0) pos.x += W;
  if (pos.x > W) pos.x -= W;
  if (pos.y < 0) pos.y += H;
  if (pos.y > H) pos.y -= H;
}

function newShip() {
  return {
    x: W / 2,
    y: H / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    thrusting: false,
    hyperspaceCooldown: 0,
    invulnerable: 2,
  };
}

function spawnAsteroid(x, y, size) {
  const speed = rand(20, 60) * (size === "large" ? 1 : size === "medium" ? 1.4 : 1.9);
  const angle = rand(0, Math.PI * 2);
  const sizes = { large: 45, medium: 25, small: 13 };
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size,
    radius: sizes[size],
    spin: rand(-1, 1),
    angle: 0,
    shape: Array.from({ length: 10 }, () => rand(0.75, 1.15)),
  };
}

function spawnWave() {
  asteroids = [];
  const count = 3 + wave;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - ship.x, y - ship.y) < SAFE_RADIUS);
    asteroids.push(spawnAsteroid(x, y, "large"));
  }
}

function splitAsteroid(a) {
  score += a.size === "large" ? 20 : a.size === "medium" ? 50 : 100;
  scoreEl.textContent = score;
  spawnDebris(a.x, a.y);
  if (a.size === "large") {
    asteroids.push(spawnAsteroid(a.x, a.y, "medium"));
    asteroids.push(spawnAsteroid(a.x, a.y, "medium"));
  } else if (a.size === "medium") {
    asteroids.push(spawnAsteroid(a.x, a.y, "small"));
    asteroids.push(spawnAsteroid(a.x, a.y, "small"));
  }
}

function spawnDebris(x, y) {
  for (let i = 0; i < 8; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 120);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(0.3, 0.7),
    });
  }
}

function resetGame() {
  ship = newShip();
  bullets = [];
  particles = [];
  saucer = null;
  score = 0;
  lives = 3;
  wave = 1;
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  waveEl.textContent = wave;
  spawnWave();
}

function loseLife() {
  lives--;
  livesEl.textContent = lives;
  spawnDebris(ship.x, ship.y);
  if (lives <= 0) {
    running = false;
    startBtn.textContent = "Play Again";
    return;
  }
  ship = newShip();
}

function fire() {
  bullets.push({
    x: ship.x + Math.cos(ship.angle) * SHIP_SIZE,
    y: ship.y + Math.sin(ship.angle) * SHIP_SIZE,
    vx: ship.vx + Math.cos(ship.angle) * BULLET_SPEED,
    vy: ship.vy + Math.sin(ship.angle) * BULLET_SPEED,
    life: BULLET_LIFE,
  });
}

function hyperspace() {
  if (ship.hyperspaceCooldown > 0) return;
  ship.x = rand(0, W);
  ship.y = rand(0, H);
  ship.vx = 0;
  ship.vy = 0;
  ship.hyperspaceCooldown = HYPERSPACE_COOLDOWN;
  // small chance of materializing inside a rock, same as the original
  ship.invulnerable = 1;
}

let lastFireKey = false;
let lastHyperKey = false;

function update(dt) {
  if (keys["ArrowLeft"]) ship.angle -= SHIP_TURN_SPEED * dt;
  if (keys["ArrowRight"]) ship.angle += SHIP_TURN_SPEED * dt;

  ship.thrusting = !!keys["ArrowUp"];
  if (ship.thrusting) {
    ship.vx += Math.cos(ship.angle) * SHIP_THRUST * dt;
    ship.vy += Math.sin(ship.angle) * SHIP_THRUST * dt;
  }
  ship.vx *= 1 - SHIP_FRICTION * dt;
  ship.vy *= 1 - SHIP_FRICTION * dt;
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  wrap(ship);

  if (ship.invulnerable > 0) ship.invulnerable -= dt;
  if (ship.hyperspaceCooldown > 0) ship.hyperspaceCooldown -= dt;

  const fireKey = !!keys[" "];
  if (fireKey && !lastFireKey) fire();
  lastFireKey = fireKey;

  const hyperKey = !!keys["Shift"];
  if (hyperKey && !lastHyperKey) hyperspace();
  lastHyperKey = hyperKey;

  for (const b of bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    wrap(b);
  }
  bullets = bullets.filter((b) => b.life > 0);

  for (const a of asteroids) {
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.angle += a.spin * dt;
    wrap(a);
  }

  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  particles = particles.filter((p) => p.life > 0);

  // bullet vs asteroid
  for (const a of asteroids.slice()) {
    for (const b of bullets.slice()) {
      if (Math.hypot(a.x - b.x, a.y - b.y) < a.radius) {
        asteroids.splice(asteroids.indexOf(a), 1);
        bullets.splice(bullets.indexOf(b), 1);
        splitAsteroid(a);
        break;
      }
    }
  }

  // ship vs asteroid
  if (ship.invulnerable <= 0) {
    for (const a of asteroids) {
      if (Math.hypot(a.x - ship.x, a.y - ship.y) < a.radius + SHIP_SIZE * 0.6) {
        loseLife();
        break;
      }
    }
  }

  if (asteroids.length === 0 && running) {
    wave++;
    waveEl.textContent = wave;
    spawnWave();
  }
}

function drawShip() {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  if (ship.invulnerable > 0 && Math.floor(ship.invulnerable * 8) % 2 === 0) {
    ctx.globalAlpha = 0.35;
  }
  ctx.strokeStyle = "#eafcff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(SHIP_SIZE, 0);
  ctx.lineTo(-SHIP_SIZE * 0.7, SHIP_SIZE * 0.7);
  ctx.lineTo(-SHIP_SIZE * 0.4, 0);
  ctx.lineTo(-SHIP_SIZE * 0.7, -SHIP_SIZE * 0.7);
  ctx.closePath();
  ctx.stroke();
  if (ship.thrusting) {
    ctx.strokeStyle = "#ffb84d";
    ctx.beginPath();
    ctx.moveTo(-SHIP_SIZE * 0.4, 0);
    ctx.lineTo(-SHIP_SIZE * 1.2, 0);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAsteroid(a) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.angle);
  ctx.strokeStyle = "#9fb0d8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < a.shape.length; i++) {
    const ang = (i / a.shape.length) * Math.PI * 2;
    const r = a.radius * a.shape[i];
    const x = Math.cos(ang) * r;
    const y = Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = "#7cffe0";
  for (const b of bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const a of asteroids) drawAsteroid(a);

  ctx.fillStyle = "#ffb84d";
  for (const p of particles) {
    ctx.globalAlpha = Math.max(p.life, 0);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (running) drawShip();

  if (!running) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#eafcff";
    ctx.textAlign = "center";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(lives <= 0 ? "GAME OVER" : "VECTOR ROCKS", W / 2, H / 2 - 10);
    ctx.font = "16px sans-serif";
    ctx.fillText("Press Start to play", W / 2, H / 2 + 20);
  }
}

let lastTime = 0;
function loop(t) {
  const dt = Math.min((t - lastTime) / 1000, 0.05) || 0;
  lastTime = t;
  if (running) update(dt);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
  keys[e.key] = true;
});
window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});
window.addEventListener("blur", () => {
  keys = {};
});

startBtn.addEventListener("click", () => {
  resetGame();
  running = true;
  startBtn.textContent = "Restart";
});

resetGame();
draw();
requestAnimationFrame(loop);
