const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const score1El = document.getElementById("score1");
const score2El = document.getElementById("score2");
const timerEl = document.getElementById("timer");
const startBtn = document.getElementById("startBtn");

const W = canvas.width;
const H = canvas.height;

const WATER_Y = H - 110; // waterline, side-on view: sky above, pond below
const JUMP_DURATION = 340; // ms
const ROUND_SECONDS = 60;
const FLY_COUNT = 5;
const FLY_MIN_Y = 70;
const FLY_MAX_Y = WATER_Y - 50;

const FROG_SCALE = 1.1;
const IDLE_FRAME_W = 96;
const IDLE_FRAMES = 2;
const JUMP_FRAME_W = 96;
const JUMP_FRAMES = 8;
const TONGUE_FRAME_W = 288;
const TONGUE_FRAMES = 3;
const TONGUE_FLASH_MS = 160;

// A big fused lily-pad "island" replaces the old small pad + shore trees,
// matching the original Frog Bog art direction: two broad leaves meeting in
// the middle of the pond instead of separate pads near the shore.
const PAD_RADIUS_X = 175;
const PAD_RADIUS_Y = 95;

/* ------------------------------------------------------------------------
 * 1980s-arcade-style procedural generation
 *
 * Real 6502-era games (River Raid, Pac-Man ghosts, etc.) couldn't afford
 * floating point, sqrt(), or true RNG hardware. This game leans into those
 * constraints on purpose for the fly/weather logic below:
 *   - an 8-bit Linear Feedback Shift Register stands in for Math.random()
 *   - "randomness" for slow events (weather) is gated behind a bitmasked
 *     frame-counter poll, the same trick used for enemy fire rates
 *   - fly targeting uses Manhattan distance (no sqrt) plus a "Pinky the
 *     ghost" style predictive lead, instead of true Euclidean homing
 *   - fly fear/calm behavior is a hysteresis state machine (two different
 *     thresholds for entering vs. leaving a state) so it can't flicker
 * ---------------------------------------------------------------------- */

// --- 8-bit LFSR pseudo-random number generator -----------------------------
const LFSR_POLY = 0xb4;
let lfsrState = (Date.now() & 0xff) || 0x2b; // seed must never be zero

function lfsrNext() {
  const carry = lfsrState & 1;
  lfsrState >>>= 1;
  if (carry) lfsrState ^= LFSR_POLY;
  if (lfsrState === 0) lfsrState = 0x2b; // guard against the dead all-zero state
  return lfsrState;
}

function lfsrRandom() {
  return lfsrNext() / 255;
}

function lfsrRange(min, max) {
  return min + lfsrRandom() * (max - min);
}

// --- frame-timer polling (hardware-trap style "randomness") ---------------
let frameCounter = 0;

function manhattan(x1, y1, x2, y2) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

// Manhattan-distance jump/catch thresholds run a bit larger than the old
// Euclidean ones since Manhattan distance over-measures diagonal reach.
const JUMP_RANGE = 320;
const CATCH_MANHATTAN = 46;
const PREDICT_LEAD_FRAMES = 14; // "Pinky" style lead-the-target offset

// Hysteresis thresholds for fly fear response: a fly only starts fleeing a
// frog once it's well inside FLEE_ENTER, and only calms down again once it's
// well outside FLEE_EXIT. The gap between them stops the state from
// flickering when a fly is hovering right on the boundary.
const FLEE_ENTER = 90;
const FLEE_EXIT = 150;

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

const sprites = {
  idle: loadImage("assets/frog-idle.png"),
  jump: loadImage("assets/frog-jump.png"),
  tongue: loadImage("assets/frog-tongue.png"),
};

function makeFrog(padX, tongueColor, faceDir, filter) {
  return {
    padX,
    padY: WATER_Y - 6,
    x: padX,
    y: WATER_Y - 6,
    tongueColor,
    faceDir, // 1 = faces right, -1 = faces left
    filter, // CSS canvas filter string used to recolor the (green) sprite art
    jumping: false,
    jumpStart: 0,
    from: { x: padX, y: WATER_Y - 6 },
    to: { x: padX, y: WATER_Y - 6 },
    facing: 0,
    score: 0,
  };
}

// Sprite art is drawn green; recolor with a canvas filter to match the
// original's pink-and-white frog pair instead of two identical green frogs.
const p1 = makeFrog(W * 0.42, "#ff6f91", 1, "hue-rotate(210deg) saturate(2.4) brightness(1.2)");
const p2 = makeFrog(W * 0.58, "#ff6f91", -1, "grayscale(1) brightness(1.5) contrast(0.85)");
const frogs = [p1, p2];

let flies = [];
let running = false;
let timeLeft = ROUND_SECONDS;
let lastTick = 0;
let countdownTimer = null;
let particles = [];

// --- weather system ---------------------------------------------------
// NOTE: weather is purely atmospheric for now. Tying specific fly species
// to weather shifts (eat a "sunfly" to trigger heat, etc.) is planned for
// the fly-overhaul update -- not implemented yet.
const WEATHER_TYPES = ["clear", "clear", "clear", "fog", "rain", "heat"];
const WEATHER_CHECK_MASK = 0xff; // only ever consider changing weather every ~256 frames
const WEATHER_MIN_DWELL = 480; // frames a weather state is guaranteed to last (hysteresis)
let weather = "clear";
let weatherTimer = WEATHER_MIN_DWELL;
let raindrops = [];

function updateWeather() {
  if (weatherTimer > 0) {
    weatherTimer--;
  } else if ((frameCounter & WEATHER_CHECK_MASK) === 0) {
    weather = WEATHER_TYPES[lfsrNext() % WEATHER_TYPES.length];
    weatherTimer = WEATHER_MIN_DWELL + lfsrNext() * 3;
  }

  if (weather === "rain" && raindrops.length < 90) {
    for (let i = 0; i < 3; i++) {
      raindrops.push({ x: lfsrRange(0, W), y: -10, speed: 6 + lfsrRandom() * 4 });
    }
  }
  for (const drop of raindrops) drop.y += drop.speed;
  raindrops = raindrops.filter((d) => d.y < H + 10);
}

function randomFly() {
  return {
    x: lfsrRange(0, W),
    y: lfsrRange(FLY_MIN_Y, FLY_MAX_Y),
    dir: lfsrRandom() < 0.5 ? -1 : 1,
    speed: 0.5 + lfsrRandom() * 0.9,
    bob: lfsrRandom() * Math.PI * 2,
    state: "calm", // hysteresis state: "calm" | "fleeing"
    alive: true,
    golden: lfsrRandom() < 0.12, // rare bonus fly worth extra points
  };
}

function resetFlies() {
  flies = [];
  for (let i = 0; i < FLY_COUNT; i++) flies.push(randomFly());
}

function startGame() {
  p1.score = 0;
  p2.score = 0;
  p1.x = p1.padX;
  p1.y = p1.padY;
  p2.x = p2.padX;
  p2.y = p2.padY;
  p1.jumping = false;
  p2.jumping = false;
  score1El.textContent = "0";
  score2El.textContent = "0";
  timeLeft = ROUND_SECONDS;
  timerEl.textContent = timeLeft;
  suddenDeath = false;
  resetFlies();
  particles = [];
  running = true;
  startBtn.textContent = "Restart";
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    if (!running) return;
    timeLeft--;
    timerEl.textContent = Math.max(timeLeft, 0);
    if (timeLeft <= 0) {
      if (p1.score === p2.score && !suddenDeath) {
        suddenDeath = true;
        timeLeft = SUDDEN_DEATH_SECONDS;
        timerEl.textContent = timeLeft;
      } else {
        endGame();
      }
    }
  }, 1000);
}

const SUDDEN_DEATH_SECONDS = 15;
let suddenDeath = false;

function endGame() {
  running = false;
  clearInterval(countdownTimer);
  let message;
  if (p1.score > p2.score) message = "Player 1 wins!";
  else if (p2.score > p1.score) message = "Player 2 wins!";
  else message = "It's a tie!";
  timerEl.textContent = "0";
  setTimeout(() => alert(`Time's up! ${message}\nPlayer 1: ${p1.score}  Player 2: ${p2.score}`), 50);
}

function nearestFly(frog) {
  let best = null;
  let bestDist = Infinity;
  for (const fly of flies) {
    if (!fly.alive) continue;
    const dist = manhattan(fly.x, fly.y, frog.padX, frog.padY);
    if (dist <= JUMP_RANGE && dist < bestDist) {
      bestDist = dist;
      best = fly;
    }
  }
  return best;
}

function jump(frog) {
  if (!running || frog.jumping) return;
  const target = nearestFly(frog);
  let dest;
  if (target) {
    // Predictive "lead the target" aim, same trick as Pac-Man's Pinky:
    // aim ahead of where the fly is heading rather than where it sits now.
    dest = {
      x: target.x + target.dir * target.speed * PREDICT_LEAD_FRAMES,
      y: target.y,
    };
  } else {
    dest = { x: frog.padX + frog.faceDir * 30, y: frog.padY - 130 };
  }
  frog.from = { x: frog.padX, y: frog.padY };
  frog.to = dest;
  frog.jumping = true;
  frog.jumpStart = performance.now();
  frog.targetFly = target;
  frog.facing = Math.atan2(dest.y - frog.padY, dest.x - frog.padX);
}

function updateFrog(frog, now) {
  if (!frog.jumping) return;
  const t = Math.min((now - frog.jumpStart) / JUMP_DURATION, 1);
  // ease out/in for the horizontal travel, plus a parabolic arc for height
  const linear = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  frog.x = frog.from.x + (frog.to.x - frog.from.x) * linear;
  const arc = Math.sin(t * Math.PI); // 0 -> 1 -> 0
  const baseY = frog.from.y + (frog.to.y - frog.from.y) * linear;
  frog.y = baseY - arc * 40;

  if (t >= 0.35 && t <= 0.75 && frog.targetFly && frog.targetFly.alive) {
    const dist = manhattan(frog.targetFly.x, frog.targetFly.y, frog.x, frog.y);
    if (dist <= CATCH_MANHATTAN) {
      frog.targetFly.alive = false;
      frog.score += frog.targetFly.golden ? 3 : 1;
      frog.tongueFlashUntil = now + TONGUE_FLASH_MS;
      spawnParticles(frog.targetFly.x, frog.targetFly.y, frog.tongueColor);
      const idx = flies.indexOf(frog.targetFly);
      if (idx >= 0) flies[idx] = randomFly();
      frog.targetFly = null;
      (frog === p1 ? score1El : score2El).textContent = frog.score;
    }
  }

  if (t >= 1) {
    frog.jumping = false;
    frog.x = frog.padX;
    frog.y = frog.padY;
    frog.targetFly = null;
  }
}

function spawnParticles(x, y, color) {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x,
      y,
      vx: (lfsrRandom() * 2 - 1) * 2.5,
      vy: (lfsrRandom() * 2 - 1) * 2.5,
      life: 1,
      color,
    });
  }
}

function updateFlies(dt) {
  for (const fly of flies) {
    // Hysteresis fear response: enter "fleeing" only once well inside
    // FLEE_ENTER of a frog's pad, and only calm back down once well outside
    // FLEE_EXIT -- the gap between the two stops jittery flip-flopping.
    let nearestPadDist = Infinity;
    for (const frog of frogs) {
      const d = manhattan(fly.x, fly.y, frog.padX, frog.padY);
      if (d < nearestPadDist) nearestPadDist = d;
    }
    if (fly.state === "calm" && nearestPadDist < FLEE_ENTER) {
      fly.state = "fleeing";
    } else if (fly.state === "fleeing" && nearestPadDist > FLEE_EXIT) {
      fly.state = "calm";
    }

    const speedMult = fly.state === "fleeing" ? 2.2 : 1;
    fly.bob += dt * 0.006;
    fly.x += fly.dir * fly.speed * speedMult * dt * 0.07;
    fly.y += Math.sin(fly.bob) * 0.4;
    if (fly.x < -20) fly.x = W + 20;
    if (fly.x > W + 20) fly.x = -20;

    // Frame-timer-polled direction changes: instead of rolling a
    // probability every frame, only even consider a flip when the frame
    // counter hits a bitmasked value, then gate it behind the LFSR.
    if (fly.state === "calm" && (frameCounter & 0x3f) === 0 && (lfsrNext() & 0x03) === 0) {
      fly.dir *= -1;
    }
  }
}

function updateParticles() {
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.04;
  }
  particles = particles.filter((p) => p.life > 0);
}

function drawScene() {
  const dim = weather === "rain" ? 0.72 : weather === "fog" ? 0.9 : 1;

  // sky: warm sunset-orange gradient, like the original cabinet art
  const sky = ctx.createLinearGradient(0, 0, 0, WATER_Y);
  if (weather === "heat") {
    sky.addColorStop(0, "#ff8a1e");
    sky.addColorStop(1, "#ffd23f");
  } else if (weather === "rain") {
    sky.addColorStop(0, `rgba(150,90,30,${dim})`);
    sky.addColorStop(1, `rgba(200,140,60,${dim})`);
  } else if (weather === "fog") {
    sky.addColorStop(0, `rgba(230,140,60,${dim})`);
    sky.addColorStop(1, `rgba(240,190,120,${dim})`);
  } else {
    sky.addColorStop(0, "#ff7a1a");
    sky.addColorStop(1, "#ffbf3f");
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, WATER_Y);

  // big flat golden-yellow clouds
  ctx.fillStyle = "#ffe14d";
  drawCloud(150, 70, 1.5);
  drawCloud(560, 95, 1.1);

  drawReeds();

  // water: flat, saturated blue like the original's solid fill
  ctx.fillStyle = "#1b3fe0";
  ctx.fillRect(0, WATER_Y, W, H - WATER_Y);

  if (weather === "rain") {
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 2;
    const t = performance.now() * 0.001;
    for (let i = 0; i < 4; i++) {
      const ry = WATER_Y + 25 + i * 22;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 24) {
        const y = ry + Math.sin(x * 0.03 + t * 2 + i) * 4;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
}

function drawCloud(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.arc(26, -8, 18, 0, Math.PI * 2);
  ctx.arc(-26, -5, 15, 0, Math.PI * 2);
  ctx.arc(13, 8, 20, 0, Math.PI * 2);
  ctx.arc(-13, 6, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A jagged band of dark reeds with cattail stalks along the shoreline,
// standing in for the original's marsh-grass horizon.
const REED_BAND_H = 90;
const reedLayout = (() => {
  const spacing = 14;
  const count = Math.ceil(W / spacing) + 1;
  const stalks = [];
  for (let i = 0; i < count; i++) {
    const x = i * spacing;
    const jag = 18 + 14 * Math.abs(Math.sin(i * 0.7));
    stalks.push({ x, jag });
  }
  const cattails = [];
  for (let x = 20; x < W - 10; x += 46) {
    cattails.push({ x: x + (x % 3) * 6, h: 60 + 22 * Math.abs(Math.sin(x * 0.05)) });
  }
  return { stalks, cattails };
})();

function drawReeds() {
  const baseY = WATER_Y;
  ctx.fillStyle = "#1f7a1f";
  ctx.beginPath();
  ctx.moveTo(0, baseY);
  for (const s of reedLayout.stalks) {
    ctx.lineTo(s.x, baseY - s.jag);
  }
  ctx.lineTo(W, baseY);
  ctx.closePath();
  ctx.fill();

  for (const c of reedLayout.cattails) {
    ctx.strokeStyle = "#1f7a1f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(c.x, baseY - 10);
    ctx.lineTo(c.x, baseY - c.h);
    ctx.stroke();
    ctx.fillStyle = "#cdbd82";
    ctx.beginPath();
    ctx.ellipse(c.x, baseY - c.h - 12, 5, 13, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Two broad lily-pad leaves fused together in the middle of the pond, each
// with a wedge notch and radiating veins -- the classic Frog Bog "island".
function drawLilyPadIsland() {
  drawLilyLeaf(p1.padX, Math.PI); // notch faces outward (left)
  drawLilyLeaf(p2.padX, 0); // notch faces outward (right)
}

function drawLilyLeaf(cx, notchAngle) {
  const notchWidth = 0.55;
  ctx.save();
  ctx.translate(cx, WATER_Y + 6);
  ctx.scale(1, PAD_RADIUS_Y / PAD_RADIUS_X);
  ctx.fillStyle = "#3fbf3f";
  ctx.beginPath();
  ctx.arc(0, 0, PAD_RADIUS_X, notchAngle + notchWidth / 2, notchAngle - notchWidth / 2 + Math.PI * 2);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1f7a2f";
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.strokeStyle = "#1f7a2f";
  ctx.lineWidth = 3;
  for (let a = -1.3; a <= 1.3; a += 0.42) {
    if (Math.abs(((a - notchAngle + Math.PI) % (Math.PI * 2)) - Math.PI) < notchWidth) continue;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * PAD_RADIUS_X * 0.92, Math.sin(a) * PAD_RADIUS_X * 0.92);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFly(fly) {
  if (!fly.alive) return;
  ctx.save();
  ctx.translate(fly.x, fly.y);
  ctx.fillStyle = fly.golden ? "#d4af0a" : fly.state === "fleeing" ? "#4a1a1a" : "#12100f";
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Sprite art faces right by default; mirror horizontally for a leftward-facing frog.
function drawFrog(frog, now) {
  const t = frog.jumping ? Math.min((now - frog.jumpStart) / JUMP_DURATION, 1) : 0;
  const dir = frog.jumping ? (frog.to.x >= frog.from.x ? 1 : -1) : frog.faceDir;
  const flashing = frog.tongueFlashUntil && now < frog.tongueFlashUntil;

  ctx.save();
  ctx.translate(frog.x, frog.y);
  ctx.scale(dir, 1);
  ctx.filter = frog.filter || "none";

  if (flashing && sprites.tongue.complete) {
    const w = TONGUE_FRAME_W * FROG_SCALE;
    const h = 96 * FROG_SCALE;
    ctx.drawImage(sprites.tongue, TONGUE_FRAME_W * 2, 0, TONGUE_FRAME_W, 96, -w * 0.28, -h * 0.62, w, h);
  } else if (frog.jumping && sprites.jump.complete) {
    const frame = Math.min(JUMP_FRAMES - 1, Math.floor(t * JUMP_FRAMES));
    const w = JUMP_FRAME_W * FROG_SCALE;
    const h = 96 * FROG_SCALE;
    ctx.drawImage(sprites.jump, frame * JUMP_FRAME_W, 0, JUMP_FRAME_W, 96, -w / 2, -h * 0.62, w, h);
  } else if (sprites.idle.complete) {
    const frame = Math.floor(now / 500) % IDLE_FRAMES;
    const w = IDLE_FRAME_W * FROG_SCALE;
    const h = 96 * FROG_SCALE;
    ctx.drawImage(sprites.idle, frame * IDLE_FRAME_W, 0, IDLE_FRAME_W, 96, -w / 2, -h * 0.62, w, h);
  }

  ctx.restore();
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(p.life, 0);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawWeather() {
  if (weather === "fog") {
    ctx.fillStyle = "rgba(230,230,238,0.38)";
    ctx.fillRect(0, 0, W, H);
  } else if (weather === "rain") {
    ctx.fillStyle = "rgba(35,55,85,0.18)";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(210,225,255,0.55)";
    ctx.lineWidth = 1.5;
    for (const d of raindrops) {
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 3, d.y + 12);
      ctx.stroke();
    }
  } else if (weather === "heat") {
    const t = performance.now() * 0.002;
    ctx.fillStyle = "rgba(255,170,60,0.1)";
    ctx.fillRect(0, 0, W, WATER_Y);
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const y = WATER_Y - 20 - i * 14;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 16) {
        const yy = y + Math.sin(x * 0.05 + t * 3 + i) * 3;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  }
}

const WEATHER_LABELS = { clear: "☀️ Clear", fog: "🌫️ Fog", rain: "🌧️ Rain", heat: "🌡️ Heat" };
function drawWeatherLabel() {
  ctx.font = "13px Segoe UI, sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(WEATHER_LABELS[weather] || weather, 10, 20);
}

function draw() {
  const now = performance.now();
  drawScene();
  drawLilyPadIsland();
  for (const fly of flies) drawFly(fly);
  drawFrog(p1, now);
  drawFrog(p2, now);
  drawParticles();
  drawWeather();
  drawWeatherLabel();

  if (!running) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 28px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Press Start Game to play", W / 2, H / 2);
  }
}

function loop(now) {
  const dt = lastTick ? now - lastTick : 16;
  lastTick = now;
  frameCounter = (frameCounter + 1) & 0xffff;
  updateWeather();
  if (running) {
    updateFlies(dt);
    updateFrog(p1, now);
    updateFrog(p2, now);
    updateParticles();
  }
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (e.code === "Space") {
    e.preventDefault();
    jump(p1);
  } else if (e.code === "Enter") {
    e.preventDefault();
    jump(p2);
  }
});

startBtn.addEventListener("click", startGame);

draw();
requestAnimationFrame(loop);
