"use strict";

// ================================================================
// SIGNAL SWEEP — FINISHED REFERENCE BUILD
// Try the checkpoints and challenges in ../game.js first. This copy adds
// three features; search for "NEW:" to find every changed section:
//   1. Dash (Shift): a short burst of speed with a cooldown.
//   2. Lives: three hits instead of one, with a brief safety period.
//   3. Best time: the fastest win is remembered while the tab stays open.
// ================================================================

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreLabel = document.querySelector("#score");
const statusLabel = document.querySelector("#status");
const restartButton = document.querySelector("#restart");
const livesLabel = document.querySelector("#lives"); // NEW
const bestLabel = document.querySelector("#best");   // NEW

// WHAT: Named constants collect tuning choices in one visible place.
// WHY: "Magic numbers" scattered through code are difficult to balance.
// TRY THIS: Change one value, predict the effect, then test your prediction.
const PLAYER_SPEED = 220;
const GLITCH_SPEED = 125;
const TOTAL_SIGNALS = 5;

// NEW: Dash tuning. Duration and cooldown are separate so each can be balanced.
const DASH_SPEED = 620;
const DASH_DURATION = 0.16; // seconds the burst lasts
const DASH_COOLDOWN = 0.9;  // seconds before another dash may start

// NEW: Lives tuning.
const START_LIVES = 3;
const SAFE_TIME = 1.2; // seconds of invulnerability after a hit

// WHAT: The keys object remembers which controls are held down.
// WHY: A game needs continuous input, not just one action per key press.
const keys = {};

// WHAT: State is the changing truth of the current play session.
// TRY THIS: Add lives, a timer, a high score, or a difficulty level.
const state = {
  mode: "playing",
  collected: 0,
  lives: START_LIVES,     // NEW
  safeTimer: 0,           // NEW: counts down after a hit
  dashTimer: 0,           // NEW: > 0 while dashing
  dashCooldown: 0,        // NEW: > 0 while dash is recharging
  dashDir: { x: 1, y: 0 },// NEW: direction locked in when the dash starts
  elapsed: 0,             // NEW: seconds since this round began
  bestTime: null,         // NEW: fastest win this session
  player: { x: 70, y: 210, w: 28, h: 28 },
  glitch: { x: 640, y: 180, w: 38, h: 38, vx: -GLITCH_SPEED, vy: GLITCH_SPEED * 0.72 },
  signals: []
};

// WHAT: Key events flip the switches stored in keys.
window.addEventListener("keydown", (event) => {
  keys[event.code] = true;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
    event.preventDefault();
  }
  if (event.code === "KeyR") resetGame();
  // NEW: event.repeat is true for auto-repeated keydowns while a key is held.
  // WHY: Ignoring repeats means holding Shift starts exactly one dash.
  if ((event.code === "ShiftLeft" || event.code === "ShiftRight") && !event.repeat) tryDash();
});
window.addEventListener("keyup", (event) => { keys[event.code] = false; });
restartButton.addEventListener("click", resetGame);

function resetGame() {
  state.mode = "playing";
  state.collected = 0;
  state.lives = START_LIVES;
  state.safeTimer = 0;
  state.dashTimer = 0;
  state.dashCooldown = 0;
  state.elapsed = 0;
  Object.assign(state.player, { x: 70, y: 210 });
  Object.assign(state.glitch, { x: 640, y: 180, vx: -GLITCH_SPEED, vy: GLITCH_SPEED * 0.72 });

  // WHAT: These fixed positions make the lesson repeatable and easy to debug.
  // TRY THIS: Replace them with random positions after the base game works.
  const positions = [[180, 80], [315, 335], [430, 150], [590, 350], [720, 75]];
  state.signals = positions.map(([x, y]) => ({ x, y, w: 20, h: 20, active: true }));
  updateHud();
}

// WHAT: Axis-aligned bounding-box collision compares rectangle edges.
// WHY: It is fast, readable, and perfect for a first game.
function overlaps(a, b) {
  return a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y;
}

function readDirection() {
  let dx = 0;
  let dy = 0;
  if (keys.ArrowLeft || keys.KeyA) dx -= 1;
  if (keys.ArrowRight || keys.KeyD) dx += 1;
  if (keys.ArrowUp || keys.KeyW) dy -= 1;
  if (keys.ArrowDown || keys.KeyS) dy += 1;
  // WHY: Diagonal input would otherwise be about 41% faster.
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length, moving: dx !== 0 || dy !== 0 };
}

// NEW: A dash may start only while playing, not dashing, and fully recharged.
function tryDash() {
  if (state.mode !== "playing" || state.dashTimer > 0 || state.dashCooldown > 0) return;
  const dir = readDirection();
  if (!dir.moving) return; // a dash needs a direction
  state.dashDir = { x: dir.x, y: dir.y };
  state.dashTimer = DASH_DURATION;
  state.dashCooldown = DASH_COOLDOWN;
}

function updatePlayer(dt) {
  // NEW: Both timers count toward zero every frame.
  state.dashTimer = Math.max(0, state.dashTimer - dt);
  state.dashCooldown = Math.max(0, state.dashCooldown - dt);

  // NEW: While dashing, the locked direction and DASH_SPEED replace normal input.
  const dashing = state.dashTimer > 0;
  const dir = dashing ? state.dashDir : readDirection();
  const speed = dashing ? DASH_SPEED : PLAYER_SPEED;
  state.player.x += dir.x * speed * dt;
  state.player.y += dir.y * speed * dt;

  // WHAT: Clamp keeps the whole player inside the playfield.
  state.player.x = Math.max(0, Math.min(canvas.width - state.player.w, state.player.x));
  state.player.y = Math.max(0, Math.min(canvas.height - state.player.h, state.player.y));
}

function updateGlitch(dt) {
  const g = state.glitch;
  g.x += g.vx * dt;
  g.y += g.vy * dt;
  if (g.x <= 0 || g.x + g.w >= canvas.width) g.vx *= -1;
  if (g.y <= 0 || g.y + g.h >= canvas.height) g.vy *= -1;
}

function update(dt) {
  if (state.mode !== "playing") return;
  state.elapsed += dt;                                   // NEW
  state.safeTimer = Math.max(0, state.safeTimer - dt);   // NEW
  updatePlayer(dt);
  updateGlitch(dt);

  for (const signal of state.signals) {
    if (signal.active && overlaps(state.player, signal)) {
      signal.active = false;
      state.collected += 1;
      updateHud();
    }
  }

  // NEW: A hit costs a life, then the safety timer prevents losing every life
  // in the same instant while the two rectangles are still overlapping.
  if (state.safeTimer === 0 && overlaps(state.player, state.glitch)) {
    state.lives -= 1;
    state.safeTimer = SAFE_TIME;
    if (state.lives <= 0) state.mode = "lost";
    updateHud();
  } else if (state.collected === TOTAL_SIGNALS) {
    state.mode = "won";
    // NEW: Keep the smaller time. null means no win yet this session.
    if (state.bestTime === null || state.elapsed < state.bestTime) state.bestTime = state.elapsed;
    updateHud();
  }
}

function updateHud() {
  scoreLabel.textContent = `${state.collected} / ${TOTAL_SIGNALS}`;
  livesLabel.textContent = "♥".repeat(state.lives) || "—";                                  // NEW
  bestLabel.textContent = state.bestTime === null ? "—" : `${state.bestTime.toFixed(1)} s`; // NEW
  statusLabel.textContent = state.mode === "playing" ? "Searching" : state.mode === "won" ? "Network restored!" : "Signal lost — press R";
}

function drawGrid() {
  ctx.strokeStyle = "#15304a";
  ctx.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }
}

function render() {
  // WHY: Clear and repaint every frame; otherwise moving objects leave trails.
  ctx.fillStyle = "#081321";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  for (const signal of state.signals) {
    if (!signal.active) continue;
    ctx.fillStyle = "#55e6c1";
    ctx.beginPath();
    ctx.arc(signal.x + 10, signal.y + 10, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#ff557a";
  ctx.fillRect(state.glitch.x, state.glitch.y, state.glitch.w, state.glitch.h);
  // NEW: Blink while safe so the player can see the invulnerability window.
  const blinkOff = state.safeTimer > 0 && Math.floor(state.safeTimer * 10) % 2 === 0;
  if (!blinkOff) {
    ctx.fillStyle = state.dashTimer > 0 ? "#55e6c1" : "#fff";
    ctx.fillRect(state.player.x, state.player.y, state.player.w, state.player.h);
  }

  // NEW: Dash recharge bar under the player: full width means ready.
  const ready = 1 - state.dashCooldown / DASH_COOLDOWN;
  ctx.fillStyle = "#15304a";
  ctx.fillRect(state.player.x, state.player.y + state.player.h + 4, state.player.w, 4);
  ctx.fillStyle = ready >= 1 ? "#55e6c1" : "#9bb4c8";
  ctx.fillRect(state.player.x, state.player.y + state.player.h + 4, state.player.w * ready, 4);

  if (state.mode !== "playing") {
    ctx.fillStyle = "#07111fdd";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = state.mode === "won" ? "#55e6c1" : "#ff557a";
    ctx.font = "700 38px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(state.mode === "won" ? `NETWORK RESTORED IN ${state.elapsed.toFixed(1)} s` : "SIGNAL LOST", canvas.width / 2, 210);
    ctx.fillStyle = "#eef8ff";
    ctx.font = "20px system-ui";
    ctx.fillText("Press R or choose Restart", canvas.width / 2, 250);
    ctx.textAlign = "start";
  }
}

let previousTime = performance.now();
function gameLoop(now) {
  // WHAT: dt is elapsed time in seconds, capped after tab switches.
  const dt = Math.min((now - previousTime) / 1000, 0.05);
  previousTime = now;
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

resetGame();
requestAnimationFrame(gameLoop);
