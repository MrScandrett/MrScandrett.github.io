const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const score1El = document.getElementById("score1");
const score2El = document.getElementById("score2");
const timerEl = document.getElementById("timer");
const startBtn = document.getElementById("startBtn");
const newRoundBtn = document.getElementById("newRoundBtn");
const soundBtn = document.getElementById("soundBtn");
const roundLabelEl = document.getElementById("roundLabel");
const weatherStatusEl = document.getElementById("weatherStatus");
const gameOverlay = document.getElementById("gameOverlay");
const overlayKicker = document.getElementById("overlayKicker");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const announcer = document.getElementById("announcer");

const W = canvas.width;
const H = canvas.height;

const WATER_Y = H - 110; // waterline, side-on view: sky above, pond below
const JUMP_DURATION = 340; // ms
const ROUND_SECONDS = 60;
const FLY_COUNT = 5;
const FLY_MIN_Y = 150; // stay below the clouds so flies don't get lost against them
const FLY_MAX_Y = WATER_Y - 40;

const FROG_SCALE = 0.7; // smaller frogs leave more open lily-pad to move around on
const IDLE_FRAME_W = 96;
const IDLE_FRAMES = 2;
const JUMP_FRAME_W = 96;
const JUMP_FRAMES = 8;
const TONGUE_FRAME_W = 288;
const TONGUE_FRAMES = 3;

// Two distinct lily pads, one per frog, kept well apart so they read as
// separate islands instead of fusing into one shapeless blob. Notches face
// each other across the gap so each frog looks like it's facing its rival.
const PAD_RADIUS_X = 92;
const PAD_RADIUS_Y = 50;

// The whole set of lily pads frogs can hop between -- two big "home" pads
// plus a few smaller stepping-stone pads scattered across the pond. Frogs
// hop pad-to-pad (see hop()); missing a pad means landing in open water.
const PADS = [
  { x: W * 0.3, y: WATER_Y + 6, scale: 1, home: 1 },
  { x: W * 0.7, y: WATER_Y + 6, scale: 1, home: 2 },
  { x: W * 0.5, y: WATER_Y + 30, scale: 0.34 },
  { x: W * 0.14, y: WATER_Y + 55, scale: 0.24 },
  { x: W * 0.86, y: WATER_Y + 55, scale: 0.24 },
];

function padStandY(pad) {
  return pad.y - 6;
}

// A hop must land within this fraction of a pad's radius to count as a safe
// landing; anything wider than that overshoots the pad and hits open water.
const PAD_LANDING_SLACK = 0.85;
const HOP_DISTANCE = 140; // how far a directional hop covers, pad-to-pad
const DROWN_MS = 550; // "split second" a frog is stuck flailing in the water

function findLandingPad(x) {
  let best = null;
  let bestDist = Infinity;
  for (const pad of PADS) {
    const rx = PAD_RADIUS_X * pad.scale * PAD_LANDING_SLACK;
    const d = Math.abs(x - pad.x);
    if (d <= rx && d < bestDist) {
      bestDist = d;
      best = pad;
    }
  }
  return best;
}

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

function makeFrog(homePad, tongueColor, faceDir, filter) {
  const y = padStandY(homePad);
  return {
    homePad,
    pad: homePad, // the pad the frog is currently standing on (null while in water)
    x: homePad.x,
    y,
    tongueColor,
    faceDir, // 1 = faces right, -1 = faces left
    filter, // CSS canvas filter string used to recolor the (green) sprite art
    jumping: false,
    jumpStart: 0,
    from: { x: homePad.x, y },
    to: { x: homePad.x, y },
    action: "catch", // "catch" (tongue lunge back to pad) or "hop" (pad-to-pad move)
    pendingPad: null,
    inWater: false,
    drownUntil: 0,
    caught: false,
    facing: 0,
    score: 0,
  };
}

// Sprite art is drawn green; recolor with a canvas filter to match the
// original's pink-and-white frog pair instead of two identical green frogs.
const p1 = makeFrog(PADS[0], "#ff6f91", 1, "hue-rotate(210deg) saturate(2.4) brightness(1.2)");
const p2 = makeFrog(PADS[1], "#ff6f91", -1, "grayscale(1) brightness(1.5) contrast(0.85)");
const frogs = [p1, p2];

let flies = [];
let running = false;
let timeLeft = ROUND_SECONDS;
let lastTick = 0;
let countdownTimer = null;
let particles = [];
let scorePopups = [];

// Tiny Web Audio cues keep the game self-contained and make catches readable
// even when both players are watching different sides of the pond.
let audioContext = null;
let soundEnabled = true;

function playTone(frequency, duration = 0.08, type = "square", volume = 0.045, delay = 0) {
  if (!soundEnabled) return;
  const AudioApi = window.AudioContext || window.webkitAudioContext;
  if (!AudioApi) return;
  audioContext ||= new AudioApi();
  if (audioContext.state === "suspended") audioContext.resume();
  const start = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

function playCatch(golden) {
  playTone(golden ? 660 : 440, 0.08, "square", 0.04);
  playTone(golden ? 990 : 660, 0.1, "square", 0.035, 0.07);
}

function setOverlay(kicker, title, text, buttonText) {
  overlayKicker.textContent = kicker;
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startBtn.textContent = buttonText;
  gameOverlay.hidden = false;
}

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
let lastWeather = "";

const WEATHER_STATUS = { clear: "☀ Clear skies", fog: "◌ Low fog", rain: "☂ Bog rain", heat: "♨ Heat wave" };

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
  if (weather !== lastWeather) {
    weatherStatusEl.textContent = WEATHER_STATUS[weather];
    lastWeather = weather;
  }
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

function resetFrog(frog) {
  frog.pad = frog.homePad;
  frog.x = frog.homePad.x;
  frog.y = padStandY(frog.homePad);
  frog.jumping = false;
  frog.inWater = false;
  frog.drownUntil = 0;
  frog.targetFly = null;
  frog.pendingPad = null;
  frog.caught = false;
}

function startGame() {
  p1.score = 0;
  p2.score = 0;
  resetFrog(p1);
  resetFrog(p2);
  score1El.textContent = "0";
  score2El.textContent = "0";
  timeLeft = ROUND_SECONDS;
  timerEl.textContent = timeLeft;
  suddenDeath = false;
  resetFlies();
  particles = [];
  scorePopups = [];
  running = true;
  gameOverlay.hidden = true;
  newRoundBtn.hidden = false;
  roundLabelEl.textContent = "Round";
  timerEl.classList.remove("urgent");
  announcer.textContent = "Round started. Sixty seconds on the clock.";
  playTone(330, 0.07, "square", 0.04);
  playTone(495, 0.1, "square", 0.04, 0.08);
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    if (!running) return;
    timeLeft--;
    timerEl.textContent = Math.max(timeLeft, 0);
    timerEl.setAttribute("aria-label", `${Math.max(timeLeft, 0)} seconds`);
    timerEl.classList.toggle("urgent", timeLeft <= 10);
    if (timeLeft <= 0) {
      if (p1.score === p2.score && !suddenDeath) {
        suddenDeath = true;
        timeLeft = SUDDEN_DEATH_SECONDS;
        timerEl.textContent = timeLeft;
        roundLabelEl.textContent = "Sudden death";
        announcer.textContent = "Tie game. Fifteen seconds of sudden death.";
        playTone(220, 0.12, "sawtooth", 0.045);
        playTone(220, 0.12, "sawtooth", 0.045, 0.16);
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
  let title;
  let kicker;
  if (p1.score > p2.score) {
    title = "Pink frog wins!";
    kicker = "Bog champion";
  } else if (p2.score > p1.score) {
    title = "Moon frog wins!";
    kicker = "Bog champion";
  } else {
    title = "A perfect tie!";
    kicker = "Evenly matched";
  }
  timerEl.textContent = "0";
  timerEl.classList.remove("urgent");
  roundLabelEl.textContent = "Final";
  newRoundBtn.hidden = true;
  setOverlay(kicker, title, `Final score: Pink ${p1.score} · Moon ${p2.score}`, "Play again");
  announcer.textContent = `${title} Final score: Pink ${p1.score}, Moon ${p2.score}.`;
  playTone(392, 0.12, "square", 0.04);
  playTone(523, 0.12, "square", 0.04, 0.12);
  playTone(659, 0.2, "square", 0.04, 0.24);
}

function nearestFly(frog) {
  let best = null;
  let bestDist = Infinity;
  for (const fly of flies) {
    if (!fly.alive) continue;
    const dist = manhattan(fly.x, fly.y, frog.x, frog.y);
    if (dist <= JUMP_RANGE && dist < bestDist) {
      bestDist = dist;
      best = fly;
    }
  }
  return best;
}

// Tongue-catch attack: lunges toward the nearest fly (or a plain forward hop
// if none is in range) and always lands back on the pad the frog is
// currently standing on. Can't be used while treading water -- no solid
// footing to launch a tongue strike from.
function jump(frog) {
  if (!running || frog.jumping || frog.inWater) return;
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
    dest = { x: frog.x + frog.faceDir * 30, y: frog.y - 130 };
  }
  frog.from = { x: frog.x, y: frog.y };
  frog.to = dest;
  frog.action = "catch";
  frog.jumping = true;
  frog.jumpStart = performance.now();
  frog.targetFly = target;
  frog.facing = Math.atan2(dest.y - frog.y, dest.x - frog.x);
}

// Directional hop: leap toward the next lily pad in that direction. If the
// hop overshoots every pad within reach, the frog splashes down in open
// water instead and has to hop again to find safety.
function hop(frog, dir) {
  if (!running || frog.jumping) return;
  if (frog.inWater && performance.now() < frog.drownUntil) return; // stuck flailing
  const originX = frog.x;
  const originY = frog.y;
  const destX = Math.max(14, Math.min(W - 14, originX + dir * HOP_DISTANCE));
  const landingPad = findLandingPad(destX);
  frog.from = { x: originX, y: originY };
  frog.to = landingPad ? { x: landingPad.x, y: padStandY(landingPad) } : { x: destX, y: WATER_Y + 20 };
  frog.pendingPad = landingPad;
  frog.action = "hop";
  frog.jumping = true;
  frog.jumpStart = performance.now();
  frog.targetFly = null;
  frog.faceDir = dir;
  frog.facing = Math.atan2(frog.to.y - originY, frog.to.x - originX);
}

// The window (around the lunge's t=0.5 apex) where a catch can land and the
// tongue sprite shows -- shared so the visual and the hit-test agree exactly.
const CATCH_WINDOW = 0.18;

function updateFrog(frog, now) {
  if (!frog.jumping) return;
  const t = Math.min((now - frog.jumpStart) / JUMP_DURATION, 1);
  const arc = Math.sin(t * Math.PI); // 0 -> 1 -> 0, vertical hop arc

  if (frog.action === "catch") {
    // Tongue-catch is a there-and-back lunge: ease out to the target for the
    // first half, then retrace the exact same path back to the pad for the
    // second half, so landing is a smooth continuation of the motion instead
    // of a hard cut back to the pad position.
    const half = t < 0.5 ? t * 2 : (1 - t) * 2; // 0 -> 1 -> 0
    const eased = half < 0.5 ? 2 * half * half : -1 + (4 - 2 * half) * half;
    frog.x = frog.from.x + (frog.to.x - frog.from.x) * eased;
    frog.y = frog.from.y + (frog.to.y - frog.from.y) * eased - arc * 40;
  } else {
    // ease out/in for the horizontal travel, plus a parabolic arc for height
    const linear = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    frog.x = frog.from.x + (frog.to.x - frog.from.x) * linear;
    const baseY = frog.from.y + (frog.to.y - frog.from.y) * linear;
    frog.y = baseY - arc * 40;
  }

  if (
    frog.action === "catch" &&
    t >= 0.5 - CATCH_WINDOW &&
    t <= 0.5 + CATCH_WINDOW &&
    frog.targetFly &&
    frog.targetFly.alive
  ) {
    const dist = manhattan(frog.targetFly.x, frog.targetFly.y, frog.x, frog.y);
    if (dist <= CATCH_MANHATTAN) {
      const wasGolden = frog.targetFly.golden;
      frog.targetFly.alive = false;
      const points = wasGolden ? 3 : 1;
      frog.score += points;
      frog.caught = true;
      spawnParticles(frog.targetFly.x, frog.targetFly.y, frog.tongueColor);
      scorePopups.push({ x: frog.targetFly.x, y: frog.targetFly.y - 8, text: wasGolden ? "+3 GOLD!" : "+1", life: 1, golden: wasGolden });
      playCatch(wasGolden);
      const idx = flies.indexOf(frog.targetFly);
      if (idx >= 0) flies[idx] = randomFly();
      frog.targetFly = null;
      (frog === p1 ? score1El : score2El).textContent = frog.score;
      announcer.textContent = `${frog === p1 ? "Pink" : "Moon"} frog caught ${wasGolden ? "a golden fly for three points" : "a fly"}.`;
    }
  }

  if (t >= 1) {
    frog.jumping = false;
    frog.targetFly = null;
    frog.caught = false;
    if (frog.action === "hop") {
      frog.x = frog.to.x;
      frog.y = frog.to.y;
      if (frog.pendingPad) {
        frog.pad = frog.pendingPad;
        frog.inWater = false;
      } else {
        frog.pad = null;
        frog.inWater = true;
        frog.drownUntil = now + DROWN_MS;
        spawnSplash(frog.x, WATER_Y + 8);
      }
      frog.pendingPad = null;
    } else {
      // the round-trip lunge already eases back to exactly the pad position
      frog.x = frog.pad.x;
      frog.y = padStandY(frog.pad);
    }
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
      size: 3,
    });
  }
}

// A wide, flat splash when a frog belly-flops into open water.
function spawnSplash(x, y) {
  for (let i = 0; i < 10; i++) {
    particles.push({
      x,
      y,
      vx: (lfsrRandom() * 2 - 1) * 3.5,
      vy: -1.5 - lfsrRandom() * 1.5,
      life: 1,
      color: "rgba(210,230,255,0.9)",
      size: 2 + lfsrRandom() * 2,
    });
  }
  playTone(105, 0.16, "sawtooth", 0.035);
}

// Small rising bubbles for a frog treading water, waiting to hop to safety.
function spawnBubbles(x, y) {
  for (let i = 0; i < 2; i++) {
    particles.push({
      x: x + (lfsrRandom() * 2 - 1) * 10,
      y,
      vx: (lfsrRandom() * 2 - 1) * 0.3,
      vy: -0.5 - lfsrRandom() * 0.5,
      life: 1,
      color: "rgba(255,255,255,0.85)",
      size: 1.5 + lfsrRandom() * 1.5,
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
      const d = manhattan(fly.x, fly.y, frog.x, frog.y);
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
  for (const popup of scorePopups) {
    popup.y -= 0.55;
    popup.life -= 0.025;
  }
  scorePopups = scorePopups.filter((popup) => popup.life > 0);
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

// Draw every pad in PADS -- the two home pads get radiating veins and a
// notch facing the other home pad, the smaller stepping-stone pads don't.
function drawLilyPadIsland() {
  for (const pad of PADS) {
    if (pad.home === 1) drawLilyLeaf(pad.x, pad.y, 0, pad.scale, true);
    else if (pad.home === 2) drawLilyLeaf(pad.x, pad.y, Math.PI, pad.scale, true);
    else drawLilyLeaf(pad.x, pad.y, 0, pad.scale, false);
  }
}

function drawLilyLeaf(cx, cy, notchAngle, scale, withVeins) {
  const notchWidth = 0.55;
  const rx = PAD_RADIUS_X * scale;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, PAD_RADIUS_Y / PAD_RADIUS_X);
  ctx.fillStyle = "#3fbf3f";
  ctx.beginPath();
  ctx.arc(0, 0, rx, notchAngle + notchWidth / 2, notchAngle - notchWidth / 2 + Math.PI * 2);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1f7a2f";
  ctx.lineWidth = withVeins ? 5 : 3;
  ctx.stroke();

  if (withVeins) {
    ctx.strokeStyle = "#1f7a2f";
    ctx.lineWidth = 3;
    for (let a = -1.3; a <= 1.3; a += 0.42) {
      if (Math.abs(((a - notchAngle + Math.PI) % (Math.PI * 2)) - Math.PI) < notchWidth) continue;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * rx * 0.92, Math.sin(a) * rx * 0.92);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawFly(fly) {
  if (!fly.alive) return;
  ctx.save();
  ctx.translate(fly.x, fly.y);
  const wing = Math.sin(performance.now() * 0.035 + fly.bob) * 2;
  if (fly.golden) {
    ctx.shadowColor = "#ffe66b";
    ctx.shadowBlur = 12;
  }
  ctx.fillStyle = fly.golden ? "rgba(255,245,190,0.75)" : "rgba(238,244,239,0.65)";
  ctx.beginPath();
  ctx.ellipse(-3, -3, 4, 2 + Math.abs(wing), -0.5, 0, Math.PI * 2);
  ctx.ellipse(3, -3, 4, 2 + Math.abs(wing), 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fly.golden ? "#ffd21f" : fly.state === "fleeing" ? "#4a1a1a" : "#12100f";
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Sprite art faces right by default; mirror horizontally for a leftward-facing frog.
function drawFrog(frog, now) {
  const t = frog.jumping ? Math.min((now - frog.jumpStart) / JUMP_DURATION, 1) : 0;
  const dir = frog.jumping ? (frog.to.x >= frog.from.x ? 1 : -1) : frog.faceDir;
  // Show the tongue sprite exactly around the lunge's reach (same window the
  // catch hit-test uses) instead of a real-time timer, so the tongue frame
  // always lines up with how far out the frog actually is, never popping in
  // on a body that has already landed.
  const flashing = frog.action === "catch" && frog.jumping && frog.caught && Math.abs(t - 0.5) <= CATCH_WINDOW;
  const drowning = frog.inWater && !frog.jumping;
  const bob = drowning ? Math.sin(now * 0.01) * 3 : 0;

  ctx.save();
  ctx.translate(frog.x, frog.y + bob);

  if (drowning) {
    // ripple ring around a frog treading water, drawn unmirrored so it stays symmetric
    ctx.strokeStyle = "rgba(200,225,255,0.55)";
    ctx.lineWidth = 2;
    const r = 15 + Math.sin(now * 0.008) * 3;
    ctx.beginPath();
    ctx.ellipse(0, 10, r, r * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.scale(dir, 1);
  ctx.filter = (frog.filter || "none") + (drowning ? " saturate(0.5) brightness(0.85)" : "");

  if (flashing && sprites.tongue.complete) {
    // Animate out through the tongue frames as the lunge reaches its apex,
    // then back in as it retracts, instead of popping to a single frame.
    const localT = Math.min(1, Math.max(0, (t - (0.5 - CATCH_WINDOW)) / (CATCH_WINDOW * 2)));
    const reach = localT < 0.5 ? localT * 2 : (1 - localT) * 2;
    const frame = Math.min(TONGUE_FRAMES - 1, Math.floor(reach * TONGUE_FRAMES));
    const w = TONGUE_FRAME_W * FROG_SCALE;
    const h = 96 * FROG_SCALE;
    ctx.drawImage(sprites.tongue, frame * TONGUE_FRAME_W, 0, TONGUE_FRAME_W, 96, -w * 0.28, -h * 0.62, w, h);
  } else if (frog.jumping && sprites.jump.complete) {
    const frame = Math.min(JUMP_FRAMES - 1, Math.floor(t * JUMP_FRAMES));
    const w = JUMP_FRAME_W * FROG_SCALE;
    const h = 96 * FROG_SCALE;
    ctx.drawImage(sprites.jump, frame * JUMP_FRAME_W, 0, JUMP_FRAME_W, 96, -w / 2, -h * 0.62, w, h);
  } else if (sprites.idle.complete) {
    const frame = Math.floor(now / (drowning ? 180 : 500)) % IDLE_FRAMES;
    const w = IDLE_FRAME_W * FROG_SCALE;
    const h = 96 * FROG_SCALE;
    if (drowning) {
      // clip so only the top of the sprite pokes out of the water
      ctx.save();
      ctx.beginPath();
      ctx.rect(-w, -h * 0.62, w * 2, h * 0.62 * 0.85);
      ctx.clip();
      ctx.drawImage(sprites.idle, frame * IDLE_FRAME_W, 0, IDLE_FRAME_W, 96, -w / 2, -h * 0.62, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(sprites.idle, frame * IDLE_FRAME_W, 0, IDLE_FRAME_W, 96, -w / 2, -h * 0.62, w, h);
    }
  }

  ctx.restore();
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(p.life, 0);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size || 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = "center";
  ctx.font = "bold 17px ui-monospace, Consolas, monospace";
  for (const popup of scorePopups) {
    ctx.globalAlpha = Math.min(1, popup.life * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(6,20,17,0.8)";
    ctx.strokeText(popup.text, popup.x, popup.y);
    ctx.fillStyle = popup.golden ? "#ffe45e" : "#ffffff";
    ctx.fillText(popup.text, popup.x, popup.y);
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

function draw() {
  const now = performance.now();
  drawScene();
  drawLilyPadIsland();
  for (const fly of flies) drawFly(fly);
  drawFrog(p1, now);
  drawFrog(p2, now);
  drawParticles();
  drawWeather();
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
    for (const frog of frogs) {
      if (frog.inWater && !frog.jumping && frameCounter % 12 === 0) spawnBubbles(frog.x, WATER_Y + 4);
    }
    updateParticles();
  }
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  const key = e.key;
  if (e.code === "Space" || key === " " || key === "Spacebar") {
    e.preventDefault();
    jump(p1);
  } else if (e.code === "Enter" || key === "Enter") {
    e.preventDefault();
    jump(p2);
  } else if (e.code === "KeyA" || key === "a" || key === "A") {
    hop(p1, -1);
  } else if (e.code === "KeyD" || key === "d" || key === "D") {
    hop(p1, 1);
  } else if (e.code === "ArrowLeft" || key === "ArrowLeft") {
    e.preventDefault();
    hop(p2, -1);
  } else if (e.code === "ArrowRight" || key === "ArrowRight") {
    e.preventDefault();
    hop(p2, 1);
  }
});

startBtn.addEventListener("click", startGame);
newRoundBtn.addEventListener("click", startGame);

soundBtn.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundBtn.textContent = soundEnabled ? "Sound on" : "Sound off";
  soundBtn.setAttribute("aria-pressed", String(soundEnabled));
  soundBtn.setAttribute("aria-label", soundEnabled ? "Mute sound" : "Turn sound on");
  if (soundEnabled) playTone(440, 0.08, "square", 0.035);
});

document.querySelectorAll("[data-player][data-action]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const frog = button.dataset.player === "1" ? p1 : p2;
    const action = button.dataset.action;
    if (action === "catch") jump(frog);
    else hop(frog, action === "left" ? -1 : 1);
  });
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) lastTick = 0;
});

draw();
requestAnimationFrame(loop);
