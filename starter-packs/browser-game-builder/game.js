"use strict";

// ================================================================
// SIGNAL SWEEP — GUIDED BROWSER GAME STARTER
// Read README-FIRST.md before changing this file.
// ================================================================

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreLabel = document.querySelector("#score");
const statusLabel = document.querySelector("#status");
const restartButton = document.querySelector("#restart");

// WHAT: Named constants collect tuning choices in one visible place.
// WHY: "Magic numbers" scattered through code are difficult to balance.
// TRY THIS: Change one value, predict the effect, then test your prediction.
const PLAYER_SPEED = 220;
const GLITCH_SPEED = 125;
const TOTAL_SIGNALS = 5;

// WHAT: The keys object remembers which controls are held down.
// WHY: A game needs continuous input, not just one action per key press.
const keys = {};

// WHAT: State is the changing truth of the current play session.
// TRY THIS: Add lives, a timer, a high score, or a difficulty level.
const state = {
  mode: "playing",
  collected: 0,
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
});
window.addEventListener("keyup", (event) => { keys[event.code] = false; });
restartButton.addEventListener("click", resetGame);

function resetGame() {
  state.mode = "playing";
  state.collected = 0;
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

function updatePlayer(dt) {
  let dx = 0;
  let dy = 0;
  if (keys.ArrowLeft || keys.KeyA) dx -= 1;
  if (keys.ArrowRight || keys.KeyD) dx += 1;
  if (keys.ArrowUp || keys.KeyW) dy -= 1;
  if (keys.ArrowDown || keys.KeyS) dy += 1;

  // WHY: Diagonal input would otherwise be about 41% faster.
  const length = Math.hypot(dx, dy) || 1;
  state.player.x += (dx / length) * PLAYER_SPEED * dt;
  state.player.y += (dy / length) * PLAYER_SPEED * dt;

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
  updatePlayer(dt);
  updateGlitch(dt);

  for (const signal of state.signals) {
    if (signal.active && overlaps(state.player, signal)) {
      signal.active = false;
      state.collected += 1;
      updateHud();
    }
  }

  if (overlaps(state.player, state.glitch)) {
    state.mode = "lost";
    updateHud();
  } else if (state.collected === TOTAL_SIGNALS) {
    state.mode = "won";
    updateHud();
  }
}

function updateHud() {
  scoreLabel.textContent = `${state.collected} / ${TOTAL_SIGNALS}`;
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
  ctx.fillStyle = "#fff";
  ctx.fillRect(state.player.x, state.player.y, state.player.w, state.player.h);

  if (state.mode !== "playing") {
    ctx.fillStyle = "#07111fdd";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = state.mode === "won" ? "#55e6c1" : "#ff557a";
    ctx.font = "700 38px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(state.mode === "won" ? "NETWORK RESTORED" : "SIGNAL LOST", canvas.width / 2, 210);
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
