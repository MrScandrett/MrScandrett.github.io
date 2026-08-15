const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d", { alpha: false });
const setup = document.querySelector("#setup");
const startButton = document.querySelector("#startButton");
const teamAColorInput = document.querySelector("#teamAColor");
const teamBColorInput = document.querySelector("#teamBColor");
const difficultyInput = document.querySelector("#difficulty");
const scoreTargetInput = document.querySelector("#scoreTarget");
const roundLabel = document.querySelector("#roundLabel");
const scoreLabel = document.querySelector("#scoreLabel");
const statusLabel = document.querySelector("#statusLabel");
const weaponLabel = document.querySelector("#weaponLabel");
const healthFill = document.querySelector("#healthFill");
const fuelFill = document.querySelector("#fuelFill");
const timeLabel = document.querySelector("#timeLabel");
const pauseButton = document.querySelector("#pauseButton");
const announcement = document.querySelector("#announcement");
const announcementKicker = document.querySelector("#announcementKicker");
const announcementTitle = document.querySelector("#announcementTitle");
const weaponButtons = [...document.querySelectorAll(".weapon")];

const MatterLib = window.Matter;
if (!MatterLib) {
  statusLabel.textContent = "Matter.js failed to load";
  throw new Error("Matter.js is required to run Mechaterra.");
}
const { Engine, World, Bodies, Body, Vector, Query } = MatterLib;

const worldWidth = 4200;
const worldHeight = 1500;
const terrainStep = 18;
const terrainBodyWidth = terrainStep + 6;
const terrainScanStep = 9;
const terrainDepth = 54;
const spriteColumns = 4;
const spriteRows = 2;
const animationColumns = 7;
const animationRows = 5;
const gravity = 1.05;
const playerWalkSpeed = 6.5;
const playerWalkAcceleration = 34;
const playerAirAcceleration = 16;
const mechsPerTeam = 4;
const roundLimit = 180;
const weapons = ["Grav Well", "Excavator", "Bulwark"];
const mechNames = [
  ["Nova Scout", "Bolt Buddy", "Rocket Pip", "Star Hopper"],
  ["Comet Cub", "Gear Gleam", "Moon Zippy", "Astro Sprout"]
];
const keys = new Set();
const pointer = { x: 0, y: 0, down: false };

let engine;
let terrainCanvas;
let terrainCtx;
let terrainPixels;
let terrainDepthCanvas;
let terrainBodies = [];
let terrainHeights = [];
let mechs = [];
let projectiles = [];
let impacts = [];
let particles = [];
let camera = { x: 0, y: 0 };
let selectedWeapon = 0;
let running = false;
let paused = false;
let lastTime = 0;
let match;
let mechSprites;
let mechAnimationAtlas;
let sceneTransition = 0;
let cameraShake = 0;
let damageFlash = 0;
let announcementVersion = 0;

const difficultyMap = {
  easy: { aim: 0.55, fireDelay: 1500, aggression: 0.5, evade: 0.25, jet: 0.35 },
  normal: { aim: 0.78, fireDelay: 950, aggression: 0.75, evade: 0.55, jet: 0.65 },
  hard: { aim: 0.94, fireDelay: 620, aggression: 1, evade: 0.85, jet: 0.9 }
};

loadMechSprites();
loadMechAnimationAtlas();

function resize() {
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * scale);
  canvas.height = Math.floor(window.innerHeight * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  if (pointer.x === 0 && pointer.y === 0) {
    pointer.x = window.innerWidth / 2;
    pointer.y = window.innerHeight / 2;
  }
}

function showAnnouncement(kicker, title, duration = 1200) {
  const version = ++announcementVersion;
  announcementKicker.textContent = kicker;
  announcementTitle.textContent = title;
  announcement.classList.remove("hidden");
  window.setTimeout(() => {
    if (version === announcementVersion) announcement.classList.add("hidden");
  }, duration);
}

function selectWeapon(index) {
  selectedWeapon = (index + weapons.length) % weapons.length;
  weaponLabel.textContent = weapons[selectedWeapon];
  weaponButtons.forEach((button, buttonIndex) => button.classList.toggle("active", buttonIndex === selectedWeapon));
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  pointer.down = false;
  pauseButton.textContent = paused ? "▶" : "Ⅱ";
  pauseButton.setAttribute("aria-label", paused ? "Resume game" : "Pause game");
  statusLabel.textContent = paused ? "Battle paused" : "Round live";
  if (paused) showAnnouncement("Systems on hold", "Paused", 60 * 60 * 1000);
  else {
    announcementVersion += 1;
    announcement.classList.add("hidden");
    lastTime = performance.now();
  }
}

function startMatch() {
  const requestedTarget = Number(scoreTargetInput.value);
  match = {
    colors: [teamAColorInput.value, teamBColorInput.value],
    difficulty: difficultyMap[difficultyInput.value],
    target: Math.max(1, Math.min(mechsPerTeam, Number.isFinite(requestedTarget) ? requestedTarget : mechsPerTeam)),
    round: 1,
    roundWins: [0, 0],
    scores: [0, 0],
    timeLeft: roundLimit,
    finished: false
  };
  setup.classList.add("hidden");
  paused = false;
  pauseButton.textContent = "Ⅱ";
  pauseButton.setAttribute("aria-label", "Pause game");
  startRound();
}

function startRound() {
  engine = Engine.create({ gravity: { x: 0, y: gravity } });
  engine.positionIterations = 12;
  engine.velocityIterations = 10;
  engine.constraintIterations = 4;
  projectiles = [];
  impacts = [];
  particles = [];
  mechs = [];
  match.scores = [0, 0];
  match.timeLeft = roundLimit;
  createTerrain();
  spawnMechs();
  running = true;
  lastTime = performance.now();
  statusLabel.textContent = "Round live";
  sceneTransition = 1;
  cameraShake = 0;
  damageFlash = 0;
  updateHud();
  showAnnouncement(`Round ${match.round}`, "Deploy!", 1200);
  requestAnimationFrame(update);
}

function createTerrain() {
  terrainCanvas = document.createElement("canvas");
  terrainCanvas.width = worldWidth;
  terrainCanvas.height = worldHeight;
  terrainCtx = terrainCanvas.getContext("2d", { willReadFrequently: true });
  terrainCtx.clearRect(0, 0, worldWidth, worldHeight);
  terrainHeights = [];

  const soilGradient = terrainCtx.createLinearGradient(0, 500, 0, worldHeight);
  soilGradient.addColorStop(0, "#6a5d37");
  soilGradient.addColorStop(0.38, "#3f3a24");
  soilGradient.addColorStop(1, "#211d12");
  terrainCtx.fillStyle = soilGradient;
  terrainCtx.beginPath();
  terrainCtx.moveTo(0, worldHeight);
  for (let x = 0; x <= worldWidth; x += terrainStep) {
    const base = 870 + Math.sin(x * 0.006) * 105 + Math.sin(x * 0.017) * 38;
    const ridge = Math.sin(x * 0.0017 + 3) * 150;
    const y = Math.max(530, Math.min(1120, base + ridge));
    terrainHeights.push(y);
    terrainCtx.lineTo(x, y);
  }
  terrainCtx.lineTo(worldWidth, worldHeight);
  terrainCtx.closePath();
  terrainCtx.fill();

  // Cache alpha once and use direct array lookups for collision. Calling
  // getImageData for every individual terrain probe stalls the game badly.
  syncTerrainPixels();

  for (let i = 0; i < 46000; i++) {
    const x = Math.random() * worldWidth;
    const y = Math.random() * worldHeight;
    if (isTerrainPixel(x, y)) {
      const warm = 95 + Math.random() * 120;
      const mineral = Math.random() < 0.22;
      terrainCtx.fillStyle = mineral
        ? `rgba(${warm * 1.15}, ${warm * 0.95}, ${warm * 0.46}, ${0.12 + Math.random() * 0.18})`
        : `rgba(${warm * 0.78}, ${warm * 0.67}, ${warm * 0.38}, ${0.07 + Math.random() * 0.16})`;
      terrainCtx.fillRect(x, y, 1 + Math.random() * 7, 1 + Math.random() * 4);
    }
  }

  addTerrainStrata();

  // Derive spawn positions from the finished terrain texture.
  for (let i = 0; i < terrainHeights.length; i++) terrainHeights[i] = findTerrainTop(i * terrainStep);

  rebuildTerrainBodies();
}

function addTerrainStrata() {
  terrainCtx.save();
  terrainCtx.globalCompositeOperation = "source-atop";
  for (let layer = 0; layer < 24; layer++) {
    const y = 560 + layer * 38 + Math.sin(layer * 1.3) * 18;
    terrainCtx.strokeStyle = layer % 3 === 0 ? "rgba(229, 196, 111, 0.11)" : "rgba(29, 24, 14, 0.18)";
    terrainCtx.lineWidth = 1 + Math.random() * 3;
    terrainCtx.beginPath();
    for (let x = 0; x <= worldWidth; x += 70) {
      const waveY = y + Math.sin(x * 0.009 + layer) * 12 + Math.sin(x * 0.027) * 5;
      if (x === 0) terrainCtx.moveTo(x, waveY);
      else terrainCtx.lineTo(x, waveY);
    }
    terrainCtx.stroke();
  }
  terrainCtx.restore();
}

function rebuildTerrainBodies() {
  rebuildTerrainDepthCache();
  if (terrainBodies.length) World.remove(engine.world, terrainBodies);
  terrainBodies = [];
  const columns = Math.floor(worldWidth / terrainStep);
  for (let i = 0; i < columns; i++) {
    const x = i * terrainStep + terrainStep / 2;
    let segmentStart = null;
    for (let y = 0; y <= worldHeight; y += terrainScanStep) {
      const solid = y < worldHeight && isTerrainPixel(x, y);
      if (solid && segmentStart === null) segmentStart = y;
      if ((!solid || y >= worldHeight) && segmentStart !== null) {
        const h = y - segmentStart;
        if (h > terrainScanStep) {
          terrainBodies.push(Bodies.rectangle(x, segmentStart + h / 2, terrainBodyWidth, h + 2, {
            isStatic: true,
            friction: 0.96,
            render: { visible: false }
          }));
        }
        segmentStart = null;
      }
    }
  }
  // A thick catch floor begins at the visible world edge. This remains intact even
  // when destructible terrain is rebuilt, so no dynamic body can leave the map.
  terrainBodies.push(Bodies.rectangle(worldWidth / 2, worldHeight + 40, worldWidth, 160, {
    isStatic: true,
    friction: 1,
    restitution: 0
  }));
  terrainBodies.push(Bodies.rectangle(-60, worldHeight / 2, 120, worldHeight, { isStatic: true }));
  terrainBodies.push(Bodies.rectangle(worldWidth + 60, worldHeight / 2, 120, worldHeight, { isStatic: true }));
  World.add(engine.world, terrainBodies);
}

function spawnMechs() {
  for (let team = 0; team < 2; team++) {
    for (let i = 0; i < mechsPerTeam; i++) {
      const x = team === 0 ? 360 + i * 130 : worldWidth - 360 - i * 130;
      const y = sampleTerrainHeight(x) - 80;
      const body = Bodies.rectangle(x, y, 44, 64, {
        friction: 0.55,
        frictionAir: 0.025,
        restitution: 0.02,
        density: 0.004,
        // Mechs are self-balancing walkers; impacts can push them but cannot
        // topple their collision body onto its side.
        inertia: Infinity
      });
      Body.setAngle(body, 0);
      Body.setAngularVelocity(body, 0);
      World.add(engine.world, body);
      mechs.push({
        id: `${team}-${i}`,
        name: mechNames[team][i],
        team,
        body,
        health: 100,
        fuel: 100,
        heat: 0,
        cooldown: 0,
        firedAt: 0,
        jetting: false,
        aiTimer: 0,
        targetX: x,
        isPlayer: team === 0 && i === 0,
        alive: true
      });
    }
  }
}

function update(time) {
  if (!running) return;
  if (paused) {
    lastTime = time;
    render();
    requestAnimationFrame(update);
    return;
  }
  const realDt = Math.min((time - lastTime) / 1000, 0.25);
  const dt = Math.min(realDt, 0.033);
  lastTime = time;
  match.timeLeft -= realDt;
  sceneTransition = Math.max(0, sceneTransition - realDt * 0.9);
  cameraShake = Math.max(0, cameraShake - realDt * 18);
  damageFlash = Math.max(0, damageFlash - realDt * 2.8);

  handlePlayer(dt);
  handleAI(dt);
  updateProjectiles(dt);
  updateEnvironmentPowers(dt);
  updateParticles(dt);
  // Smaller physics steps prevent fast jetting/blast movement from tunnelling
  // through the narrow terrain columns.
  const substeps = Math.max(2, Math.min(5, Math.ceil(dt / (1 / 120))));
  for (let step = 0; step < substeps; step++) Engine.update(engine, (dt * 1000) / substeps);
  resolveTerrainPenetration();
  cleanupDead();
  updateRoundState();
  updateCamera(dt);
  updateHud();
  render();
  requestAnimationFrame(update);
}

function handlePlayer(dt) {
  const player = mechs.find((mech) => mech.isPlayer && mech.alive);
  if (!player) return;
  player.jetting = false;
  const move = (keys.has("a") || keys.has("arrowleft") ? -1 : 0) + (keys.has("d") || keys.has("arrowright") ? 1 : 0);
  if (move) {
    const acceleration = isGrounded(player.body) ? playerWalkAcceleration : playerAirAcceleration;
    const targetVelocity = move * playerWalkSpeed;
    const velocityChange = Math.max(
      -acceleration * dt,
      Math.min(acceleration * dt, targetVelocity - player.body.velocity.x)
    );
    Body.setVelocity(player.body, {
      x: player.body.velocity.x + velocityChange,
      y: player.body.velocity.y
    });
  }
  if ((keys.has("w") || keys.has(" ")) && isGrounded(player.body)) {
    Body.applyForce(player.body, player.body.position, { x: 0, y: -0.19 });
  }
  if (keys.has("shift")) useJetpack(player, dt, move);
  else player.fuel = Math.min(100, player.fuel + dt * (isGrounded(player.body) ? 24 : 9));
  player.cooldown = Math.max(0, player.cooldown - dt);
  player.heat = Math.max(0, player.heat - dt * 16);
  if (pointer.down && player.cooldown <= 0) firePower(player, screenToWorld(pointer.x, pointer.y));
  weaponLabel.textContent = weapons[selectedWeapon];
  healthFill.style.transform = `scaleX(${Math.max(0, player.health / 100)})`;
  fuelFill.style.transform = `scaleX(${Math.max(0, player.fuel / 100)})`;
}

function handleAI(dt) {
  for (const mech of mechs) {
    if (!mech.alive || mech.isPlayer) continue;
    mech.jetting = false;
    mech.cooldown = Math.max(0, mech.cooldown - dt);
    mech.aiTimer -= dt;
    const enemies = mechs.filter((candidate) => candidate.alive && candidate.team !== mech.team);
    if (!enemies.length) continue;
    const target = enemies.sort((a, b) => Vector.magnitude(Vector.sub(a.body.position, mech.body.position)) - Vector.magnitude(Vector.sub(b.body.position, mech.body.position)))[0];
    const dx = target.body.position.x - mech.body.position.x;
    const dy = target.body.position.y - mech.body.position.y;
    const distance = Math.hypot(dx, dy);
    const desired = Math.sign(dx);
    const wallAhead = isTerrainPixel(mech.body.position.x + desired * 58, mech.body.position.y + 6);
    const pitAhead = !isTerrainPixel(mech.body.position.x + desired * 86, mech.body.position.y + 72);
    const incoming = projectiles.some((projectile) => projectile.team !== mech.team && Vector.magnitude(Vector.sub(projectile.body.position, mech.body.position)) < 240);
    Body.applyForce(mech.body, mech.body.position, { x: desired * 0.0042 * match.difficulty.aggression, y: 0 });
    const jetChance = 1 - Math.exp(-match.difficulty.jet * 5 * dt);
    if ((wallAhead || pitAhead || dy < -100 || incoming) && mech.fuel > 8 && Math.random() < jetChance) {
      useJetpack(mech, dt, desired);
    } else {
      mech.fuel = Math.min(100, mech.fuel + dt * (isGrounded(mech.body) ? 22 : 8));
    }
    if ((wallAhead || pitAhead) && isGrounded(mech.body)) Body.applyForce(mech.body, mech.body.position, { x: 0, y: -0.16 });
    const evadeChance = 1 - Math.exp(-match.difficulty.evade * 4 * dt);
    if (incoming && Math.random() < evadeChance) Body.applyForce(mech.body, mech.body.position, { x: -desired * 0.01, y: -0.06 });
    if (distance < 720 && mech.cooldown <= 0) {
      const noise = (1 - match.difficulty.aim) * 360;
      firePower(mech, {
        x: target.body.position.x + (Math.random() - 0.5) * noise,
        y: target.body.position.y + (Math.random() - 0.5) * noise
      }, chooseAIWeapon(mech, target, wallAhead));
      mech.cooldown = match.difficulty.fireDelay / 1000;
    }
    if (Math.random() < dt * 0.28 && isGrounded(mech.body)) Body.applyForce(mech.body, mech.body.position, { x: 0, y: -0.14 });
  }
}

function useJetpack(mech, dt, direction) {
  if (mech.fuel <= 0) return;
  const velocity = mech.body.velocity;
  // Flight uses explicit acceleration as well as force. This makes climb power
  // consistent across frame rates and after gravity or explosion knockback.
  const climbAcceleration = velocity.y > 0 ? 28 : 20;
  const nextY = Math.max(-18, velocity.y - climbAcceleration * dt);
  const nextX = velocity.x + direction * 7 * dt;
  Body.setVelocity(mech.body, { x: nextX, y: nextY });
  Body.applyForce(mech.body, mech.body.position, { x: direction * 0.0048, y: -0.018 });
  mech.fuel = Math.max(0, mech.fuel - dt * 22);
  mech.jetting = true;
  spawnJetParticles(mech);
}

function chooseAIWeapon(mech, target, wallAhead) {
  if (wallAhead) return 1;
  if (target.body.position.y < mech.body.position.y - 80) return 0;
  if (Math.random() < 0.16) return 2;
  return 0;
}

function firePower(mech, target, weaponOverride = null) {
  if (mech.heat > 88) return;
  const origin = Vector.add(mech.body.position, { x: 0, y: -34 });
  const direction = Vector.normalise(Vector.sub(target, origin));
  const type = weaponOverride ?? selectedWeapon;
  if (type === 0) {
    const body = Bodies.circle(origin.x, origin.y, 10, { frictionAir: 0.01, restitution: 0.2 });
    Body.setVelocity(body, Vector.mult(direction, 14));
    World.add(engine.world, body);
    projectiles.push({ body, team: mech.team, type, life: 2.4 });
    spawnMuzzleParticles(origin.x, origin.y, direction, match.colors[mech.team]);
  } else if (type === 1) {
    carveTerrain(target.x, target.y, 74);
    blast(target.x, target.y, 130, 0.017, mech.team);
    spawnDust(target.x, target.y, 52, 1.2);
    rebuildTerrainBodies();
  } else {
    raiseTerrain(target.x, target.y, 92);
    spawnDust(target.x, target.y, 38, 0.7);
    rebuildTerrainBodies();
  }
  mech.cooldown = 0.35;
  mech.firedAt = performance.now();
  mech.heat += 18;
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i];
    projectile.life -= dt;
    const position = projectile.body.position;
    const terrainHit = isTerrainPixel(position.x, position.y);
    const mechHit = Query.collides(projectile.body, mechs.filter((mech) => mech.alive && mech.team !== projectile.team).map((mech) => mech.body)).length > 0;
    if (projectile.life <= 0 || terrainHit || mechHit) {
      carveTerrain(position.x, position.y, 96);
      blast(position.x, position.y, 190, 0.028, projectile.team);
      impacts.push({ x: position.x, y: position.y, r: 10, life: 0.55 });
      spawnExplosion(position.x, position.y);
      World.remove(engine.world, projectile.body);
      projectiles.splice(i, 1);
      rebuildTerrainBodies();
    }
  }
}

function updateEnvironmentPowers(dt) {
  for (const mech of mechs) {
    if (!mech.alive) continue;
    if (mech.body.position.y > worldHeight + 200) killMech(mech, 1 - mech.team);
    mech.health -= Math.max(0, mech.heat - 92) * dt * 0.2;
    if (mech.health <= 0) killMech(mech, 1 - mech.team);
  }
  impacts = impacts.filter((impact) => {
    impact.life -= dt;
    impact.r += dt * 350;
    return impact.life > 0;
  });
}

function resolveTerrainPenetration() {
  for (const mech of mechs) {
    if (!mech.alive) continue;
    Body.setAngle(mech.body, 0);
    Body.setAngularVelocity(mech.body, 0);
    const position = mech.body.position;
    const halfHeight = 34;
    const footY = position.y + halfHeight;
    const leftFootSolid = isTerrainPixel(position.x - 16, footY);
    const centerFootSolid = isTerrainPixel(position.x, footY);
    const rightFootSolid = isTerrainPixel(position.x + 16, footY);
    const coreBuried = isTerrainPixel(position.x, position.y);

    // Last-resort world-floor clamp. Matter's static floor handles normal contact;
    // this guard makes the invariant absolute after extreme explosion impulses.
    if (position.y + halfHeight > worldHeight) {
      Body.setPosition(mech.body, { x: position.x, y: worldHeight - halfHeight });
      Body.setVelocity(mech.body, { x: mech.body.velocity.x * 0.85, y: Math.min(0, mech.body.velocity.y) });
      Body.setAngularVelocity(mech.body, mech.body.angularVelocity * 0.5);
      continue;
    }

    if (!leftFootSolid && !centerFootSolid && !rightFootSolid && !coreBuried) continue;

    for (let y = Math.floor(footY); y > 0; y -= 2) {
      const clear =
        !isTerrainPixel(position.x - 18, y) &&
        !isTerrainPixel(position.x, y) &&
        !isTerrainPixel(position.x + 18, y);
      const floor =
        isTerrainPixel(position.x - 18, y + 8) ||
        isTerrainPixel(position.x, y + 8) ||
        isTerrainPixel(position.x + 18, y + 8);

      if (clear && floor) {
        Body.setPosition(mech.body, { x: position.x, y: y - halfHeight });
        if (mech.body.velocity.y > 0) Body.setVelocity(mech.body, { x: mech.body.velocity.x, y: 0 });
        break;
      }
    }
  }
}

function updateParticles(dt) {
  particles = particles.filter((particle) => {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 1 - particle.drag * dt;
    particle.vy += particle.gravity * dt;
    particle.radius += particle.grow * dt;
    return particle.life > 0;
  });
}

function blast(x, y, radius, force, team) {
  cameraShake = Math.max(cameraShake, radius / 22);
  for (const mech of mechs) {
    if (!mech.alive || mech.team === team) continue;
    const offset = Vector.sub(mech.body.position, { x, y });
    const distance = Math.max(1, Vector.magnitude(offset));
    if (distance < radius) {
      const amount = (1 - distance / radius);
      Body.applyForce(mech.body, mech.body.position, Vector.mult(Vector.normalise(offset), force * amount));
      mech.health -= amount * 38;
      if (mech.isPlayer) damageFlash = Math.max(damageFlash, amount * 0.68);
      if (mech.health <= 0) killMech(mech, team);
    }
  }
}

function killMech(mech, scoringTeam) {
  if (!mech.alive) return;
  const wasPlayer = mech.isPlayer;
  mech.alive = false;
  mech.isPlayer = false;
  match.scores[scoringTeam] += 1;
  World.remove(engine.world, mech.body);
  impacts.push({ x: mech.body.position.x, y: mech.body.position.y, r: 20, life: 0.8 });
  spawnExplosion(mech.body.position.x, mech.body.position.y);
  cameraShake = Math.max(cameraShake, 16);

  if (wasPlayer) {
    const replacement = mechs.find((candidate) => candidate.alive && candidate.team === 0);
    if (replacement) {
      replacement.isPlayer = true;
      showAnnouncement("Mech lost", `Control: ${replacement.name}`, 1100);
    }
  }
}

function cleanupDead() {
  mechs = mechs.filter((mech) => mech.alive);
}

function updateRoundState() {
  const aliveTeams = [0, 1].map((team) => mechs.some((mech) => mech.alive && mech.team === team));
  const winnerByScore = match.scores.findIndex((score) => score >= match.target);
  let winner = winnerByScore;
  if (winner < 0 && aliveTeams.filter(Boolean).length === 1) winner = aliveTeams[0] ? 0 : 1;
  if (winner < 0 && match.timeLeft <= 0) {
    const health = [0, 1].map((team) => mechs
      .filter((mech) => mech.alive && mech.team === team)
      .reduce((sum, mech) => sum + Math.max(0, mech.health), 0));
    if (health[0] !== health[1]) winner = health[0] > health[1] ? 0 : 1;
    else {
      match.timeLeft = 15;
      statusLabel.textContent = "Sudden death";
    }
  }
  if (winner >= 0) {
    match.roundWins[winner] += 1;
    if (match.roundWins[winner] >= 2) {
      running = false;
      statusLabel.textContent = `Team ${winner + 1} wins match`;
      showAnnouncement("Match complete", winner === 0 ? "Alpha victorious" : "Vector victorious", 2400);
      setup.classList.remove("hidden");
      startButton.textContent = "Deploy again";
    } else {
      match.round += 1;
      statusLabel.textContent = `Team ${winner + 1} wins round`;
      showAnnouncement(`Team ${winner + 1}`, "Round secured", 1250);
      setTimeout(startRound, 1400);
      running = false;
    }
  }
  roundLabel.textContent = `Round ${match.round} | ${match.roundWins[0]}-${match.roundWins[1]}`;
  scoreLabel.textContent = `${match.scores[0]} - ${match.scores[1]}`;
}

function updateHud() {
  const secondsLeft = Math.max(0, Math.ceil(match.timeLeft));
  timeLabel.textContent = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;
  timeLabel.classList.toggle("danger", secondsLeft <= 15);
  weaponLabel.textContent = weapons[selectedWeapon];
  weaponButtons.forEach((button, index) => button.classList.toggle("active", index === selectedWeapon));
}

function updateCamera(dt) {
  const player = mechs.find((mech) => mech.isPlayer && mech.alive);
  const focus = player ? player.body.position : { x: worldWidth / 2, y: 700 };
  const targetX = focus.x - window.innerWidth / 2;
  const targetY = focus.y - window.innerHeight / 2;
  camera.x += (targetX - camera.x) * Math.min(1, dt * 5);
  camera.y += (targetY - camera.y) * Math.min(1, dt * 5);
  camera.x = Math.max(0, Math.min(worldWidth - window.innerWidth, camera.x));
  camera.y = Math.max(0, Math.min(worldHeight - window.innerHeight, camera.y));
}

function render() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  ctx.fillStyle = "#111713";
  ctx.fillRect(0, 0, width, height);
  drawSky(width, height);
  ctx.save();
  const shakeX = cameraShake > 0 ? (Math.random() - 0.5) * cameraShake : 0;
  const shakeY = cameraShake > 0 ? (Math.random() - 0.5) * cameraShake * 0.65 : 0;
  ctx.translate(-camera.x + shakeX, -camera.y + shakeY);
  drawTerrainDepth();
  drawTerrain();
  for (const projectile of projectiles) drawProjectile(projectile);
  for (const particle of particles) drawParticle(particle);
  for (const mech of mechs) if (mech.alive) drawMech(mech);
  for (const impact of impacts) drawImpact(impact);
  ctx.restore();
  drawCombatOverlay(width, height);
  drawSceneTransition(width, height);
}

function drawCombatOverlay(width, height) {
  if (!running) return;
  const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.08;
  ctx.save();
  ctx.translate(pointer.x, pointer.y);
  ctx.strokeStyle = "rgba(241, 226, 173, 0.9)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 10 * pulse, 0, Math.PI * 2);
  ctx.moveTo(-18, 0); ctx.lineTo(-7, 0);
  ctx.moveTo(18, 0); ctx.lineTo(7, 0);
  ctx.moveTo(0, -18); ctx.lineTo(0, -7);
  ctx.moveTo(0, 18); ctx.lineTo(0, 7);
  ctx.stroke();
  ctx.restore();

  if (damageFlash > 0) {
    const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.18, width / 2, height / 2, height * 0.78);
    vignette.addColorStop(0, "rgba(170, 28, 18, 0)");
    vignette.addColorStop(1, `rgba(170, 28, 18, ${damageFlash})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  if (paused) {
    ctx.fillStyle = "rgba(3, 5, 4, 0.7)";
    ctx.fillRect(0, 0, width, height);
  }
}

function drawSky(width, height) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#25312b");
  gradient.addColorStop(0.48, "#354036");
  gradient.addColorStop(1, "#171a13");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(239, 224, 172, 0.11)";
  for (let i = 0; i < 42; i++) ctx.fillRect((i * 193 - camera.x * 0.12) % width, 90 + Math.sin(i) * 70, 120, 1);
  ctx.fillStyle = "rgba(112, 154, 132, 0.08)";
  ctx.fillRect(0, 0, width, height);

  drawRetroParallax(width, height);

  // Perspective horizon and distant silhouettes sell depth while keeping the
  // deterministic side-on combat plane readable.
  const horizon = height * 0.57;
  ctx.save();
  ctx.translate(-((camera.x * 0.08) % 420), 0);
  for (let layer = 0; layer < 3; layer++) {
    ctx.fillStyle = `rgba(${35 + layer * 10}, ${44 + layer * 12}, ${38 + layer * 8}, ${0.42 - layer * 0.08})`;
    ctx.beginPath();
    ctx.moveTo(-500, height);
    for (let x = -500; x < width + 900; x += 210) {
      const peak = horizon - 45 - layer * 28 + Math.sin(x * 0.011 + layer) * 35;
      ctx.lineTo(x, peak);
      ctx.lineTo(x + 105, horizon + 42 + layer * 18);
    }
    ctx.lineTo(width + 900, height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(213, 224, 192, 0.075)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const t = i / 12;
    const y = horizon + Math.pow(t, 2.15) * (height - horizon);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  for (let x = -width; x <= width * 2; x += 110) {
    ctx.beginPath();
    ctx.moveTo(width / 2, horizon);
    ctx.lineTo(x - ((camera.x * 0.15) % 110), height);
    ctx.stroke();
  }
}

function drawRetroParallax(width, height) {
  const time = performance.now() * 0.001;
  const horizon = height * 0.57;
  ctx.save();

  // Pixel sun with animated scan bands.
  const sunX = width * 0.78 - camera.x * 0.018;
  const sunY = height * 0.24;
  const sun = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 92);
  sun.addColorStop(0, "rgba(255,245,179,0.95)");
  sun.addColorStop(0.46, "rgba(231,154,91,0.62)");
  sun.addColorStop(1, "rgba(231,154,91,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(sunX - 100, sunY - 100, 200, 200);
  ctx.fillStyle = "rgba(255,225,142,0.72)";
  for (let y = -54; y <= 54; y += 10) {
    const half = Math.sqrt(Math.max(0, 58 * 58 - y * y));
    ctx.fillRect(Math.round(sunX - half), Math.round(sunY + y), Math.round(half * 2), 5);
  }

  // Three looping, stepped silhouette layers evoke 16-bit platformer scenery.
  const layers = [
    { speed: 0.07, base: horizon + 12, step: 190, color: "rgba(31,45,48,0.72)", height: 95 },
    { speed: 0.14, base: horizon + 76, step: 132, color: "rgba(39,61,50,0.82)", height: 64 },
    { speed: 0.25, base: horizon + 128, step: 86, color: "rgba(44,72,49,0.9)", height: 42 }
  ];
  for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
    const layer = layers[layerIndex];
    const offset = -((camera.x * layer.speed + time * (5 + layerIndex * 3)) % layer.step);
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    ctx.moveTo(-layer.step, height);
    for (let x = offset - layer.step; x < width + layer.step; x += layer.step) {
      const variation = ((Math.floor((x - offset) / layer.step) * 37 + layerIndex * 19) % 31) - 15;
      ctx.lineTo(Math.round(x), Math.round(layer.base));
      ctx.lineTo(Math.round(x + layer.step * 0.22), Math.round(layer.base - layer.height - variation));
      ctx.lineTo(Math.round(x + layer.step * 0.52), Math.round(layer.base - layer.height * 0.55));
      ctx.lineTo(Math.round(x + layer.step * 0.75), Math.round(layer.base - layer.height * 0.82 + variation));
      ctx.lineTo(Math.round(x + layer.step), Math.round(layer.base));
    }
    ctx.lineTo(width + layer.step, height);
    ctx.closePath();
    ctx.fill();
  }

  // Fast foreground flecks add motion when the camera travels.
  ctx.fillStyle = "rgba(171,205,140,0.2)";
  for (let i = 0; i < 38; i++) {
    const x = ((i * 173 - camera.x * 0.38 - time * 9) % (width + 80) + width + 80) % (width + 80) - 40;
    const y = horizon + 55 + ((i * 47) % Math.max(80, height - horizon - 70));
    ctx.fillRect(Math.round(x), Math.round(y), 12 + (i % 4) * 7, 2);
  }
  ctx.restore();
}

function drawTerrainDepth() {
  if (terrainDepthCanvas) ctx.drawImage(terrainDepthCanvas, 0, 0);
}

function rebuildTerrainDepthCache() {
  if (!terrainCanvas) return;
  terrainDepthCanvas ??= document.createElement("canvas");
  terrainDepthCanvas.width = worldWidth + terrainDepth;
  terrainDepthCanvas.height = worldHeight + terrainDepth;
  const depthCtx = terrainDepthCanvas.getContext("2d");
  depthCtx.clearRect(0, 0, terrainDepthCanvas.width, terrainDepthCanvas.height);
  depthCtx.globalAlpha = 0.9;
  for (let depth = terrainDepth; depth >= 8; depth -= 8) {
    depthCtx.drawImage(terrainCanvas, depth * 0.72, -depth * 0.32);
  }
  depthCtx.globalCompositeOperation = "source-atop";
  depthCtx.fillStyle = "rgba(7, 9, 7, 0.36)";
  depthCtx.fillRect(0, 0, terrainDepthCanvas.width, terrainDepthCanvas.height);
  depthCtx.globalCompositeOperation = "source-over";
  depthCtx.globalAlpha = 1;
}

function drawTerrain() {
  ctx.drawImage(terrainCanvas, 0, 0);
  ctx.globalCompositeOperation = "overlay";
  const light = ctx.createLinearGradient(0, 420, 0, worldHeight);
  light.addColorStop(0, "rgba(226, 197, 121, 0.26)");
  light.addColorStop(0.48, "rgba(108, 142, 102, 0.16)");
  light.addColorStop(1, "rgba(0, 0, 0, 0.34)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, worldWidth, worldHeight);
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = "rgba(235, 219, 172, 0.18)";
  ctx.lineWidth = 2;
  for (let x = 0; x < worldWidth; x += 120) {
    const y = sampleTerrainHeight(x);
    ctx.beginPath();
    ctx.moveTo(x, y + 8);
    ctx.lineTo(x + 60, sampleTerrainHeight(x + 60) + 5);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
  ctx.fillRect(0, worldHeight - 72, worldWidth, 72);
}

function drawMech(mech) {
  const { x, y } = mech.body.position;
  const angle = mech.body.angle;
  drawGroundShadow(mech, x, y);
  if (mech.isPlayer) drawPlayerBeacon(mech, x, y);
  if (mechAnimationAtlas?.ready) {
    const action = getMechAction(mech);
    const frame = getAnimationFrame(mech, action);
    const sx = frame * mechAnimationAtlas.cellWidth;
    const sy = action * mechAnimationAtlas.cellHeight;
    const facing = mech.body.velocity.x < -0.15 ? -1 : 1;

    ctx.save();
    ctx.translate(x, y - 8);
    ctx.rotate(angle * 0.25);
    ctx.scale(facing, 1);
    drawTeamAura(mech, 0, 58);
    drawSpriteDepth(mechAnimationAtlas.canvas, sx, sy, mechAnimationAtlas.cellWidth, mechAnimationAtlas.cellHeight, -46, -72, 92, 118);
    ctx.drawImage(mechAnimationAtlas.canvas, sx, sy, mechAnimationAtlas.cellWidth, mechAnimationAtlas.cellHeight, -46, -72, 92, 118);
    ctx.restore();
    drawMechBars(mech, x, y);
    return;
  }

  if (mechSprites?.ready) {
    const spriteIndex = mech.team === 0 ? mech.id.endsWith("-0") ? 0 : (Number(mech.id.split("-")[1]) % 4) : 4 + (Number(mech.id.split("-")[1]) % 4);
    const sx = (spriteIndex % spriteColumns) * mechSprites.cellWidth;
    const sy = Math.floor(spriteIndex / spriteColumns) * mechSprites.cellHeight;
    const facing = mech.body.velocity.x < -0.15 ? -1 : 1;

    ctx.save();
    ctx.translate(x, y - 10);
    ctx.rotate(angle * 0.35);
    ctx.scale(facing, 1);
    drawTeamAura(mech, 0, 58);
    drawSpriteDepth(mechSprites.canvas, sx, sy, mechSprites.cellWidth, mechSprites.cellHeight, -42, -70, 84, 112);
    ctx.drawImage(mechSprites.canvas, sx, sy, mechSprites.cellWidth, mechSprites.cellHeight, -42, -70, 84, 112);
    ctx.restore();
    drawMechBars(mech, x, y);
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = darken(match.colors[mech.team], 0.35);
  ctx.fillRect(-20, -26, 40, 50);
  ctx.fillStyle = match.colors[mech.team];
  ctx.fillRect(-15, -34, 30, 18);
  ctx.fillStyle = "#1a1d1a";
  ctx.fillRect(-24, 6, 14, 38);
  ctx.fillRect(10, 6, 14, 38);
  ctx.fillStyle = "rgba(235, 225, 182, 0.75)";
  ctx.fillRect(-9, -29, 18, 4);
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.fillRect(-18, -12, 36, 3);
  ctx.fillStyle = "rgba(190, 220, 226, 0.42)";
  ctx.fillRect(-8, 24, 16, 10);
  ctx.restore();

  drawMechBars(mech, x, y);
}

function drawSpriteDepth(image, sx, sy, sw, sh, dx, dy, dw, dh) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 0.2;
  ctx.filter = "brightness(0.12) saturate(0.4)";
  for (let depth = 7; depth >= 2; depth -= 2) {
    ctx.drawImage(image, sx, sy, sw, sh, dx + depth, dy - depth * 0.35, dw, dh);
  }
  ctx.filter = "none";
  ctx.restore();
}

function drawPlayerBeacon(mech, x, y) {
  const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.08;
  ctx.save();
  ctx.strokeStyle = match.colors[mech.team];
  ctx.fillStyle = "rgba(5, 8, 6, 0.88)";
  ctx.lineWidth = 3;
  ctx.shadowColor = match.colors[mech.team];
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.ellipse(x, y + 48, 48 * pulse, 14 * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function roundedRectPath(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.arcTo(x + width, y, x + width, y + r, r);
  context.lineTo(x + width, y + height - r);
  context.arcTo(x + width, y + height, x + width - r, y + height, r);
  context.lineTo(x + r, y + height);
  context.arcTo(x, y + height, x, y + height - r, r);
  context.lineTo(x, y + r);
  context.arcTo(x, y, x + r, y, r);
  context.closePath();
}

function drawGroundShadow(mech, x, y) {
  let floorY = y + 36;
  for (let scan = Math.floor(y + 34); scan < Math.min(worldHeight, y + 190); scan += 4) {
    if (isTerrainPixel(x, scan)) {
      floorY = scan;
      break;
    }
  }
  const distance = Math.max(0, floorY - (y + 34));
  ctx.save();
  ctx.globalAlpha = Math.max(0.1, 0.46 - distance / 380);
  ctx.fillStyle = "#030403";
  ctx.beginPath();
  ctx.ellipse(x + 12, floorY + 5, Math.max(14, 38 - distance * 0.08), 9, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function getMechAction(mech) {
  const speed = Math.abs(mech.body.velocity.x);
  const recentlyFired = performance.now() - mech.firedAt < 260;
  if (mech.jetting) return 3;
  if (recentlyFired && speed > 1.1) return 4;
  if (recentlyFired) return 2;
  if (speed > 1.1) return 1;
  return 0;
}

function getAnimationFrame(mech, action) {
  const speed = Math.max(1, Math.abs(mech.body.velocity.x));
  const rate = action === 0 ? 5 : action === 2 ? 14 : 9 + speed * 1.4;
  const phase = Number(mech.id.split("-")[1]) * 0.17;
  return Math.floor((performance.now() / 1000 + phase) * rate) % animationColumns;
}

function drawTeamAura(mech, x, y) {
  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.strokeStyle = match.colors[mech.team];
  ctx.lineWidth = 3;
  ctx.shadowColor = match.colors[mech.team];
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.ellipse(x, y, 34, 9, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawTeamLights(mech) {
  ctx.save();
  ctx.fillStyle = match.colors[mech.team];
  ctx.shadowColor = match.colors[mech.team];
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(12, -38, 3.8, 0, Math.PI * 2);
  ctx.arc(-17, -22, 3.2, 0, Math.PI * 2);
  ctx.arc(19, 16, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMechBars(mech, x, y) {
  const barY = y - 82;
  ctx.save();
  ctx.font = "800 12px Inter, ui-sans-serif, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(4, 7, 5, 0.9)";
  ctx.strokeText(mech.name, x, barY - 6);
  ctx.fillStyle = "#f5f3df";
  ctx.fillText(mech.name, x, barY - 6);
  ctx.fillStyle = "rgba(5, 7, 5, 0.8)";
  ctx.fillRect(x - 29, barY, 58, 7);
  ctx.fillStyle = match.colors[mech.team];
  ctx.fillRect(x - 28, barY + 1, 56 * Math.max(0, mech.health / 100), 5);
  ctx.strokeStyle = "rgba(235, 240, 218, 0.38)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 29, barY, 58, 7);
  ctx.restore();
}

function drawParticle(particle) {
  const alpha = Math.max(0, particle.life / particle.maxLife);
  if (!Number.isFinite(particle.x) || !Number.isFinite(particle.y)) return;
  const radius = Math.max(0.5, Number.isFinite(particle.radius) ? particle.radius : 0.5);
  const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, radius);
  gradient.addColorStop(0, particle.color.replace("ALPHA", `${alpha}`));
  gradient.addColorStop(1, particle.color.replace("ALPHA", "0"));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawProjectile(projectile) {
  const { x, y } = projectile.body.position;
  const velocity = projectile.body.velocity;
  const angle = Math.atan2(velocity.y, velocity.x);
  const flicker = Math.sin(performance.now() * 0.025 + x * 0.08) * 2;
  ctx.save();

  // Soft contact shadow preserves the scene's depth without making the shot
  // resemble a floating planet.
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(x + 7, y + 15, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalCompositeOperation = "lighter";

  // Layered flame tail, aligned opposite the projectile's travel direction.
  const tail = ctx.createLinearGradient(-52, 0, 8, 0);
  tail.addColorStop(0, "rgba(50,130,255,0)");
  tail.addColorStop(0.32, "rgba(70,155,255,0.32)");
  tail.addColorStop(0.68, "rgba(255,93,34,0.7)");
  tail.addColorStop(1, "rgba(255,235,146,0.95)");
  ctx.fillStyle = tail;
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.quadraticCurveTo(-14, -12 - flicker, -50 - flicker * 2, -2);
  ctx.quadraticCurveTo(-28, 4 + flicker, -7, 7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(130,205,255,0.72)";
  for (let i = 0; i < 4; i++) {
    const sparkX = -18 - i * 10 - ((performance.now() * 0.05 + i * 13) % 9);
    const sparkY = Math.sin(performance.now() * 0.018 + i * 2.3) * (4 + i);
    ctx.fillRect(sparkX, sparkY, 7 - i, 2);
  }

  const glow = ctx.createRadialGradient(-3, -4, 1, 0, 0, 17);
  glow.addColorStop(0, "#ffffff");
  glow.addColorStop(0.22, "#fff3a1");
  glow.addColorStop(0.5, "#ff7938");
  glow.addColorStop(0.76, "rgba(82,157,255,0.72)");
  glow.addColorStop(1, "rgba(36,102,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fffef0";
  ctx.beginPath();
  ctx.ellipse(3, -2, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawImpact(impact) {
  ctx.save();
  ctx.strokeStyle = `rgba(232, 217, 134, ${impact.life})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(impact.x, impact.y, impact.r, impact.r * 0.42, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(118, 164, 190, ${impact.life * 0.7})`;
  ctx.beginPath();
  ctx.ellipse(impact.x + 8, impact.y - 8, impact.r * 0.72, impact.r * 0.3, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSceneTransition(width, height) {
  if (sceneTransition <= 0) return;
  const eased = sceneTransition * sceneTransition;
  ctx.save();
  const focusX = width / 2;
  const focusY = height * 0.56;
  const radius = Math.max(width, height) * (1.25 - eased * 1.18);
  ctx.fillStyle = "rgba(4,7,6,0.96)";
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.arc(focusX, focusY, Math.max(1, radius), 0, Math.PI * 2, true);
  ctx.fill("evenodd");
  ctx.restore();
}

function carveTerrain(x, y, radius) {
  terrainCtx.save();
  terrainCtx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2;
    const distance = Math.random() * radius * 0.3;
    terrainCtx.beginPath();
    terrainCtx.ellipse(
      x + Math.cos(angle) * distance,
      y + Math.sin(angle) * distance,
      radius * (0.64 + Math.random() * 0.2),
      radius * (0.46 + Math.random() * 0.22),
      Math.random() * Math.PI,
      0,
      Math.PI * 2
    );
    terrainCtx.fill();
  }
  terrainCtx.restore();
  syncTerrainPixels();
  stainTerrainEdge(x, y, radius);
  refreshHeightsAround(x, radius + 80);
}

function raiseTerrain(x, y, radius) {
  terrainCtx.save();
  const gradient = terrainCtx.createRadialGradient(x, y, 8, x, y, radius);
  gradient.addColorStop(0, "#4c4735");
  gradient.addColorStop(1, "#211d13");
  terrainCtx.fillStyle = gradient;
  terrainCtx.beginPath();
  terrainCtx.arc(x, y + 44, radius, Math.PI, Math.PI * 2);
  terrainCtx.lineTo(x + radius, worldHeight);
  terrainCtx.lineTo(x - radius, worldHeight);
  terrainCtx.closePath();
  terrainCtx.fill();
  terrainCtx.restore();
  syncTerrainPixels();
  stainTerrainEdge(x, y, radius);
  refreshHeightsAround(x, radius + 80);
}

function stainTerrainEdge(x, y, radius) {
  terrainCtx.save();
  terrainCtx.globalCompositeOperation = "source-atop";
  const gradient = terrainCtx.createRadialGradient(x, y, radius * 0.2, x, y, radius * 1.35);
  gradient.addColorStop(0, "rgba(18, 14, 10, 0.05)");
  gradient.addColorStop(0.48, "rgba(204, 145, 74, 0.18)");
  gradient.addColorStop(1, "rgba(19, 14, 10, 0)");
  terrainCtx.fillStyle = gradient;
  terrainCtx.beginPath();
  terrainCtx.arc(x, y, radius * 1.35, 0, Math.PI * 2);
  terrainCtx.fill();
  terrainCtx.restore();
}

function spawnJetParticles(mech) {
  const base = mech.body.position;
  for (let i = 0; i < 3; i++) {
    particles.push({
      x: base.x + (Math.random() - 0.5) * 24,
      y: base.y + 32,
      vx: (Math.random() - 0.5) * 90 - mech.body.velocity.x * 10,
      vy: 120 + Math.random() * 95,
      radius: 4 + Math.random() * 5,
      grow: 24,
      gravity: -18,
      drag: 1.8,
      life: 0.34 + Math.random() * 0.18,
      maxLife: 0.52,
      color: Math.random() < 0.45 ? "rgba(125, 184, 202, ALPHA)" : "rgba(232, 217, 134, ALPHA)"
    });
  }
}

function spawnMuzzleParticles(x, y, direction, color) {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x,
      y,
      vx: direction.x * (180 + Math.random() * 260) + (Math.random() - 0.5) * 80,
      vy: direction.y * (180 + Math.random() * 260) + (Math.random() - 0.5) * 80,
      radius: 2 + Math.random() * 4,
      grow: 8,
      gravity: 80,
      drag: 2.4,
      life: 0.18 + Math.random() * 0.18,
      maxLife: 0.36,
      color: colorToRgba(color, "ALPHA")
    });
  }
}

function spawnExplosion(x, y) {
  spawnDust(x, y, 86, 1.3);
  for (let i = 0; i < 38; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 90 + Math.random() * 430;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 8,
      grow: 18,
      gravity: 240,
      drag: 1.7,
      life: 0.35 + Math.random() * 0.45,
      maxLife: 0.8,
      color: Math.random() < 0.45 ? "rgba(232, 217, 134, ALPHA)" : "rgba(116, 101, 74, ALPHA)"
    });
  }
}

function spawnDust(x, y, count, intensity) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (40 + Math.random() * 170) * intensity;
    particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      radius: 5 + Math.random() * 13,
      grow: 10 + Math.random() * 24,
      gravity: 155,
      drag: 1.15,
      life: 0.55 + Math.random() * 0.75,
      maxLife: 1.3,
      color: "rgba(93, 82, 58, ALPHA)"
    });
  }
}

function refreshHeightsAround(x, radius) {
  const start = Math.max(0, Math.floor((x - radius) / terrainStep));
  const end = Math.min(terrainHeights.length - 1, Math.ceil((x + radius) / terrainStep));
  for (let i = start; i <= end; i++) terrainHeights[i] = findTerrainTop(i * terrainStep);
}

function findTerrainTop(x) {
  for (let y = 0; y < worldHeight; y += 3) {
    if (isTerrainPixel(x, y)) return y;
  }
  return worldHeight;
}

function sampleTerrainHeight(x) {
  const i = Math.max(0, Math.min(terrainHeights.length - 1, Math.floor(x / terrainStep)));
  return terrainHeights[i] || worldHeight;
}

function syncTerrainPixels() {
  terrainPixels = terrainCtx.getImageData(0, 0, worldWidth, worldHeight).data;
}

function isTerrainPixel(x, y) {
  if (x < 0 || y < 0 || x >= worldWidth || y >= worldHeight) return false;
  if (!terrainPixels) return false;
  const index = (Math.floor(y) * worldWidth + Math.floor(x)) * 4 + 3;
  return terrainPixels[index] > 10;
}

function isGrounded(body) {
  const y = body.position.y + 42;
  return isTerrainPixel(body.position.x - 18, y) || isTerrainPixel(body.position.x, y) || isTerrainPixel(body.position.x + 18, y);
}

function screenToWorld(x, y) {
  return { x: x + camera.x, y: y + camera.y };
}

function darken(hex, amount) {
  const value = hex.replace("#", "");
  const r = Math.max(0, parseInt(value.slice(0, 2), 16) * (1 - amount));
  const g = Math.max(0, parseInt(value.slice(2, 4), 16) * (1 - amount));
  const b = Math.max(0, parseInt(value.slice(4, 6), 16) * (1 - amount));
  return `rgb(${r}, ${g}, ${b})`;
}

function colorToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function loadMechSprites() {
  const image = new Image();
  image.src = "assets/mecha-spritesheet.png?v=4";
  mechSprites = { image, canvas: document.createElement("canvas"), ready: false, cellWidth: 1, cellHeight: 1 };
  image.addEventListener("load", () => {
    mechSprites.canvas.width = image.naturalWidth;
    mechSprites.canvas.height = image.naturalHeight;
    mechSprites.cellWidth = image.naturalWidth / spriteColumns;
    mechSprites.cellHeight = image.naturalHeight / spriteRows;
    const spriteCtx = mechSprites.canvas.getContext("2d", { willReadFrequently: true });
    spriteCtx.drawImage(image, 0, 0);
    const pixels = spriteCtx.getImageData(0, 0, image.naturalWidth, image.naturalHeight);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const r = pixels.data[i];
      const g = pixels.data[i + 1];
      const b = pixels.data[i + 2];
      const isBrightBackground = r > 218 && g > 218 && b > 212;
      const isNeutralGrid = Math.abs(r - g) < 10 && Math.abs(g - b) < 14 && r > 190;
      if (isBrightBackground || isNeutralGrid) {
        const alpha = Math.max(0, 255 - (Math.min(r, g, b) - 222) * 8);
        pixels.data[i + 3] = Math.min(pixels.data[i + 3], alpha);
      }
    }
    spriteCtx.putImageData(pixels, 0, 0);
    mechSprites.ready = true;
  });
}

function loadMechAnimationAtlas() {
  const image = new Image();
  image.src = "assets/mecha-animation-atlas.png?v=4";
  mechAnimationAtlas = { image, canvas: document.createElement("canvas"), ready: false, cellWidth: 1, cellHeight: 1 };
  image.addEventListener("load", () => {
    mechAnimationAtlas.canvas.width = image.naturalWidth;
    mechAnimationAtlas.canvas.height = image.naturalHeight;
    mechAnimationAtlas.cellWidth = image.naturalWidth / animationColumns;
    mechAnimationAtlas.cellHeight = image.naturalHeight / animationRows;
    const spriteCtx = mechAnimationAtlas.canvas.getContext("2d", { willReadFrequently: true });
    spriteCtx.drawImage(image, 0, 0);
    const pixels = spriteCtx.getImageData(0, 0, image.naturalWidth, image.naturalHeight);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const r = pixels.data[i];
      const g = pixels.data[i + 1];
      const b = pixels.data[i + 2];
      const greenDominance = g - Math.max(r, b);
      const isGreenKey = g > 92 && greenDominance > 24 && g > r * 1.18 && g > b * 1.12;
      const isWhiteGrid = r > 210 && g > 210 && b > 200;
      // The generated atlas contains tiny saturated-red rigging markers around
      // character joints. Remove only that narrow color range, leaving armor,
      // team lighting, and orange jet flames intact.
      const isRedRigMarker = r > 145 && g < 78 && b < 68 && r > g * 2;
      if (isGreenKey || isWhiteGrid || isRedRigMarker) {
        pixels.data[i + 3] = isWhiteGrid || isRedRigMarker ? 0 : Math.max(0, 255 - greenDominance * 6);
        if (isGreenKey) {
          pixels.data[i] = Math.min(r, 38);
          pixels.data[i + 1] = Math.min(g, 44);
          pixels.data[i + 2] = Math.min(b, 34);
        }
      }
    }
    spriteCtx.putImageData(pixels, 0, 0);
    mechAnimationAtlas.ready = true;
  });
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
  if (["a", "d", "w", " ", "arrowleft", "arrowright"].includes(event.key.toLowerCase())) event.preventDefault();
  if (event.key === "1") selectWeapon(0);
  if (event.key === "2") selectWeapon(1);
  if (event.key === "3") selectWeapon(2);
  if (event.key.toLowerCase() === "p" && !event.repeat) togglePause();
});
window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
  if (["a", "d", "w", " ", "arrowleft", "arrowright"].includes(event.key.toLowerCase())) event.preventDefault();
});
canvas.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});
canvas.addEventListener("pointerdown", () => {
  if (!paused) pointer.down = true;
});
window.addEventListener("pointerup", () => {
  pointer.down = false;
});
canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  selectWeapon(selectedWeapon + (event.deltaY > 0 ? 1 : -1));
}, { passive: false });
weaponButtons.forEach((button) => {
  button.addEventListener("click", () => selectWeapon(Number(button.dataset.weapon)));
});
pauseButton.addEventListener("click", togglePause);
startButton.addEventListener("click", () => {
  startMatch();
});

resize();
renderIdle();

function renderIdle() {
  if (running) return;
  ctx.fillStyle = "#111713";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  drawSky(window.innerWidth, window.innerHeight);
  requestAnimationFrame(renderIdle);
}
