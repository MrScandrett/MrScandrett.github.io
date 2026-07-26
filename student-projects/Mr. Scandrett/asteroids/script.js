// Vector Rocks: Recharged — 1979's rock shoot, rendered with the Newwave kit.
//
// The simulation is the same flat, top-down, wrapping playfield the original
// used: every position below is still a pixel coordinate on an 800x600 field
// and every collision is still a circle test. Only the drawing changed. A
// tilted orthographic camera looks at that field from just off vertical, so
// the shapes keep their arcade-exact size and screen position while showing
// enough of a side to read as solid.
import * as THREE from "three";
import {
  PALETTE,
  ROCK_VARIANTS,
  createAsteroid,
  createBoundary,
  createBullet,
  createDebrisField,
  createGridFloor,
  createLighting,
  createSaucer,
  createShip,
  createStarfield,
} from "./assets.js";

const canvas = document.getElementById("game");
const W = canvas.width;
const H = canvas.height;

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const waveEl = document.getElementById("wave");
const startBtn = document.getElementById("startBtn");
const overlay = document.getElementById("overlay");

const SHIP_SIZE = 16;
const SHIP_TURN_SPEED = 4.2;
const SHIP_THRUST = 180;
const SHIP_FRICTION = 0.6;
const BULLET_SPEED = 420;
const BULLET_LIFE = 1.1;
const SAFE_RADIUS = 120;
const HYPERSPACE_COOLDOWN = 3;
const SAUCER_RADIUS = 22;
const SAUCER_SPEED = 90;
const SAUCER_FIRE_INTERVAL = 1.6;
const MAX_PARTICLES = 400;

// How far off vertical the camera sits. Small enough that an object's height
// never shifts it more than a couple of pixels from where it collides.
const CAMERA_TILT = 0.34;

let ship, bullets, asteroids, particles, saucer;
let saucerTimer = 0;
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
    // Rocks tumble on all three axes now; the original could only spin flat.
    tumble: [rand(-0.8, 0.8), rand(-0.8, 0.8)],
    tilt: [rand(0, Math.PI), rand(0, Math.PI)],
    variant: Math.floor(rand(0, ROCK_VARIANTS)),
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
  spawnDebris(a.x, a.y, PALETTE.rockEdge);
  if (a.size === "large") {
    asteroids.push(spawnAsteroid(a.x, a.y, "medium"));
    asteroids.push(spawnAsteroid(a.x, a.y, "medium"));
  } else if (a.size === "medium") {
    asteroids.push(spawnAsteroid(a.x, a.y, "small"));
    asteroids.push(spawnAsteroid(a.x, a.y, "small"));
  }
}

function spawnDebris(x, y, color = PALETTE.thrust, count = 14) {
  const tint = new THREE.Color(color);
  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) break;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 140);
    particles.push({
      x,
      y,
      z: rand(-6, 10),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      vz: rand(-30, 40),
      life: rand(0.3, 0.8),
      color: tint,
    });
  }
}

function resetGame() {
  ship = newShip();
  bullets = [];
  particles = [];
  saucer = null;
  saucerTimer = rand(12, 20);
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
  spawnDebris(ship.x, ship.y, PALETTE.hullEdge, 24);
  if (lives <= 0) {
    running = false;
    startBtn.textContent = "Play Again";
    syncOverlay();
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
    angle: ship.angle,
    life: BULLET_LIFE,
    hostile: false,
  });
}

function hyperspace() {
  if (ship.hyperspaceCooldown > 0) return;
  spawnDebris(ship.x, ship.y, PALETTE.bullet, 18);
  ship.x = rand(0, W);
  ship.y = rand(0, H);
  ship.vx = 0;
  ship.vy = 0;
  ship.hyperspaceCooldown = HYPERSPACE_COOLDOWN;
  // small chance of materializing inside a rock, same as the original
  ship.invulnerable = 1;
  spawnDebris(ship.x, ship.y, PALETTE.bullet, 18);
}

function spawnSaucer() {
  const fromLeft = Math.random() < 0.5;
  saucer = {
    x: fromLeft ? -SAUCER_RADIUS : W + SAUCER_RADIUS,
    y: rand(H * 0.15, H * 0.85),
    vx: fromLeft ? SAUCER_SPEED : -SAUCER_SPEED,
    vy: 0,
    spin: 0,
    weave: rand(0, Math.PI * 2),
    fireIn: SAUCER_FIRE_INTERVAL,
  };
}

function saucerFire() {
  const angle = Math.atan2(ship.y - saucer.y, ship.x - saucer.x) + rand(-0.22, 0.22);
  bullets.push({
    x: saucer.x + Math.cos(angle) * SAUCER_RADIUS,
    y: saucer.y + Math.sin(angle) * SAUCER_RADIUS,
    vx: Math.cos(angle) * BULLET_SPEED * 0.65,
    vy: Math.sin(angle) * BULLET_SPEED * 0.65,
    angle,
    life: 2.2,
    hostile: true,
  });
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
    if (Math.random() < 0.5) {
      spawnDebris(
        ship.x - Math.cos(ship.angle) * SHIP_SIZE,
        ship.y - Math.sin(ship.angle) * SHIP_SIZE,
        PALETTE.thrust,
        1
      );
    }
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
    a.tilt[0] += a.tumble[0] * dt;
    a.tilt[1] += a.tumble[1] * dt;
    wrap(a);
  }

  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.life -= dt;
  }
  particles = particles.filter((p) => p.life > 0);

  // saucer: drifts across, weaves, and takes wild shots at the player
  if (saucer) {
    saucer.weave += dt * 1.8;
    saucer.vy = Math.sin(saucer.weave) * 60;
    saucer.x += saucer.vx * dt;
    saucer.y += saucer.vy * dt;
    saucer.y = Math.max(SAUCER_RADIUS, Math.min(H - SAUCER_RADIUS, saucer.y));
    saucer.spin += dt * 2.4;
    saucer.fireIn -= dt;
    if (saucer.fireIn <= 0) {
      saucerFire();
      saucer.fireIn = SAUCER_FIRE_INTERVAL;
    }
    if (saucer.x < -SAUCER_RADIUS * 3 || saucer.x > W + SAUCER_RADIUS * 3) {
      saucer = null;
      saucerTimer = rand(14, 24);
    }
  } else {
    saucerTimer -= dt;
    if (saucerTimer <= 0) spawnSaucer();
  }

  // bullet vs asteroid
  for (const a of asteroids.slice()) {
    for (const b of bullets.slice()) {
      if (b.hostile) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) < a.radius) {
        asteroids.splice(asteroids.indexOf(a), 1);
        bullets.splice(bullets.indexOf(b), 1);
        splitAsteroid(a);
        break;
      }
    }
  }

  // bullet vs saucer
  if (saucer) {
    for (const b of bullets.slice()) {
      if (b.hostile) continue;
      if (Math.hypot(saucer.x - b.x, saucer.y - b.y) < SAUCER_RADIUS) {
        bullets.splice(bullets.indexOf(b), 1);
        spawnDebris(saucer.x, saucer.y, PALETTE.saucerEdge, 22);
        score += 200;
        scoreEl.textContent = score;
        saucer = null;
        saucerTimer = rand(14, 24);
        break;
      }
    }
  }

  // ship vs everything
  if (ship.invulnerable <= 0) {
    let hit = asteroids.some(
      (a) => Math.hypot(a.x - ship.x, a.y - ship.y) < a.radius + SHIP_SIZE * 0.6
    );
    if (!hit && saucer) {
      hit = Math.hypot(saucer.x - ship.x, saucer.y - ship.y) < SAUCER_RADIUS + SHIP_SIZE * 0.6;
    }
    if (!hit) {
      const shot = bullets.find(
        (b) => b.hostile && Math.hypot(b.x - ship.x, b.y - ship.y) < SHIP_SIZE * 0.7
      );
      if (shot) {
        bullets.splice(bullets.indexOf(shot), 1);
        hit = true;
      }
    }
    if (hit) loseLife();
  }

  if (asteroids.length === 0 && running) {
    wave++;
    waveEl.textContent = wave;
    spawnWave();
  }
}

// --- Renderer -------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(W, H, false);
renderer.setClearColor(PALETTE.space, 1);

const scene = new THREE.Scene();

// Playfield coordinates map to world space as x -> x and y -> -y, so screen
// up is +Y and model height runs along +Z.
const CX = W / 2;
const CY = -H / 2;

// Orthographic, because a top-down shooter's rocks must not change size as
// they cross the screen. The tilt only costs vertical extent, hence the cos.
const camera = new THREE.OrthographicCamera(
  -W / 2,
  W / 2,
  (H / 2) * Math.cos(CAMERA_TILT),
  (-H / 2) * Math.cos(CAMERA_TILT),
  1,
  3000
);
const camDist = 1200;
camera.position.set(
  CX,
  CY - Math.sin(CAMERA_TILT) * camDist,
  Math.cos(CAMERA_TILT) * camDist
);
camera.up.set(0, 1, 0);
camera.lookAt(CX, CY, 0);

createLighting(scene, W, H);

const stars = createStarfield(W, H);
stars.position.set(CX, CY, 0);
scene.add(stars);
scene.add(createGridFloor(W, H));
scene.add(createBoundary(W, H));

const shipModel = createShip(SHIP_SIZE);
scene.add(shipModel);

const debris = createDebrisField(MAX_PARTICLES);
scene.add(debris);

let saucerModel = null;

// Models are pooled by key so a whole wave of rocks costs a handful of scene
// edits rather than an allocation per frame.
function makePool(factory) {
  const inUse = new Map();
  return {
    begin() {
      for (const list of inUse.values()) for (const m of list) m.userData.claimed = false;
    },
    claim(key) {
      let list = inUse.get(key);
      if (!list) inUse.set(key, (list = []));
      let model = list.find((m) => !m.userData.claimed);
      if (!model) {
        model = factory(key);
        list.push(model);
        scene.add(model);
      }
      model.userData.claimed = true;
      model.visible = true;
      return model;
    },
    end() {
      for (const list of inUse.values()) {
        for (const m of list) if (!m.userData.claimed) m.visible = false;
      }
    },
  };
}

const rockPool = makePool((key) => {
  const [radius, variant] = key.split(":").map(Number);
  return createAsteroid(radius, variant);
});
const bulletPool = makePool(() => createBullet());

// The wrap-around is now visible geometry, so anything near an edge is drawn
// again on the far side rather than popping across.
function placements(x, y, radius) {
  const out = [[x, y]];
  const dx = x < radius ? W : x > W - radius ? -W : 0;
  const dy = y < radius ? H : y > H - radius ? -H : 0;
  if (dx) out.push([x + dx, y]);
  if (dy) out.push([x, y + dy]);
  if (dx && dy) out.push([x + dx, y + dy]);
  return out;
}

function place(model, x, y, z = 0) {
  model.position.set(x, -y, z);
}

const debrisColor = new THREE.Color();

function draw(time) {
  // rocks
  rockPool.begin();
  for (const a of asteroids) {
    for (const [x, y] of placements(a.x, a.y, a.radius)) {
      const m = rockPool.claim(`${a.radius}:${a.variant}`);
      place(m, x, y);
      m.rotation.set(a.tilt[0], a.tilt[1], -a.angle);
    }
  }
  rockPool.end();

  // shots
  bulletPool.begin();
  for (const b of bullets) {
    for (const [x, y] of placements(b.x, b.y, 8)) {
      const m = bulletPool.claim("bullet");
      place(m, x, y, 2);
      m.rotation.z = -b.angle;
      const tint = b.hostile ? PALETTE.saucer : PALETTE.bullet;
      m.children[0].material.color.set(tint);
      m.children[1].material.color.set(tint);
    }
  }
  bulletPool.end();

  // ship
  shipModel.visible = running;
  if (running) {
    place(shipModel, ship.x, ship.y, 3);
    shipModel.rotation.z = -ship.angle;
    // Bank into the turn — free character, no extra geometry.
    shipModel.rotation.x = keys["ArrowLeft"] ? -0.3 : keys["ArrowRight"] ? 0.3 : 0;
    shipModel.userData.flame.visible = ship.thrusting;
    if (ship.thrusting) {
      shipModel.userData.flame.scale.x = 0.75 + Math.sin(time * 0.04) * 0.25;
    }
    const blink = ship.invulnerable > 0 && Math.floor(ship.invulnerable * 8) % 2 === 0;
    shipModel.userData.mesh.material.transparent = blink;
    shipModel.userData.mesh.material.opacity = blink ? 0.25 : 1;
    shipModel.userData.lines.material.opacity = blink ? 0.3 : 0.9;
  }

  // saucer
  if (saucer) {
    if (!saucerModel) {
      saucerModel = createSaucer(SAUCER_RADIUS);
      scene.add(saucerModel);
    }
    saucerModel.visible = true;
    place(saucerModel, saucer.x, saucer.y, 6);
    saucerModel.rotation.z = saucer.spin;
  } else if (saucerModel) {
    saucerModel.visible = false;
  }

  // debris
  const pos = debris.geometry.attributes.position;
  const col = debris.geometry.attributes.color;
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const p = particles[i];
    if (p) {
      pos.setXYZ(i, p.x, -p.y, p.z);
      debrisColor.copy(p.color).multiplyScalar(Math.min(p.life * 1.6, 1));
      col.setXYZ(i, debrisColor.r, debrisColor.g, debrisColor.b);
    } else {
      col.setXYZ(i, 0, 0, 0);
      pos.setXYZ(i, 0, 0, -5000);
    }
  }
  pos.needsUpdate = true;
  col.needsUpdate = true;

  // The starfield drifts against the ship for a touch of parallax.
  stars.position.x = CX - (ship.x - CX) * 0.03;
  stars.position.y = CY - (-ship.y - CY) * 0.03;

  renderer.render(scene, camera);
}

// The title and game-over cards live in the DOM, where text belongs.
function syncOverlay() {
  overlay.hidden = running;
  if (running) return;
  overlay.querySelector(".overlay-title").textContent =
    lives <= 0 ? "GAME OVER" : "VECTOR ROCKS";
  overlay.querySelector(".overlay-sub").textContent =
    lives <= 0 ? `Final score ${score} — press Start to try again` : "Press Start to play";
}

let lastTime = 0;
function loop(t) {
  const dt = Math.min((t - lastTime) / 1000, 0.05) || 0;
  lastTime = t;
  if (running) update(dt);
  draw(t);
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
  syncOverlay();
});

resetGame();
syncOverlay();
requestAnimationFrame(loop);
