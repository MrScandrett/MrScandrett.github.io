"use strict";

// ============================================================
// BOUNCE LAB
// A 2D bouncing-ball simulation on one <canvas>. No libraries.
//
// Order of the file, top to bottom:
//   1. CONFIG    — the numbers that are not on a slider
//   2. ELEMENTS  — the parts of the page this file touches
//   3. STATE     — the balls, and whether the clock is running
//   4. SETTINGS  — reading the sliders
//   5. PHYSICS   — one step of the world
//   6. DRAW      — painting the world, deciding nothing
//   7. LOOP      — step, draw, repeat
//
// The same rule as any simulation: step() may change the world but must never
// draw it, and draw() may paint it but must never change it. Keeping those
// apart is what lets you pause the clock and still have a picture on screen.
// ============================================================


// ---------- 1. CONFIG ----------

const CONFIG = {
  radiusMin: 10,
  radiusMax: 22,
  startSpeed: 220,     // pixels per second, in a random direction
  maxDelta: 0.05,      // ignore time jumps longer than this — see loop()
  restThreshold: 26    // below this speed on the floor, a ball is called still
};

const COLORS = ["#8ecdf7", "#7ee0b8", "#ffc857", "#f79fd0", "#c4a6ff"];


// ---------- 2. ELEMENTS ----------

const canvas = document.querySelector("#stage");
const ctx = canvas.getContext("2d");

const gravityInput = document.querySelector("#gravity");
const bounceInput = document.querySelector("#bounce");
const countInput = document.querySelector("#count");
const gravityOut = document.querySelector("#gravity-out");
const bounceOut = document.querySelector("#bounce-out");
const countOut = document.querySelector("#count-out");

const runButton = document.querySelector("#run");
const resetButton = document.querySelector("#reset");
const statusOut = document.querySelector("#status");
const ballCountOut = document.querySelector("#ball-count");
const avgSpeedOut = document.querySelector("#avg-speed");
const bouncesOut = document.querySelector("#bounces");

// The canvas's own coordinate system, taken from its width and height
// attributes rather than typed in again.
const W = canvas.width;
const H = canvas.height;


// ---------- 3. STATE ----------

let balls = [];
let running = true;
let bounceCount = 0;
let lastFrame = null;


// ---------- 4. SETTINGS ----------

// WHAT: the sliders are read every frame, so a change takes effect immediately
// — even mid-fall. WHY not copy them into variables on change: one source of
// truth. The slider IS the setting; nothing can drift out of step with it.
//
// A range input's value is always a STRING, even though it looks like a number.
// "900" * 1 is 900, but "900" + 1 is "9001", which is the kind of bug that
// takes an hour to find. Number() converts it once, here, on purpose.
function gravity() {
  return Number(gravityInput.value);
}

// The slider is 0–100 because a range input is easier to reason about in whole
// numbers. The physics wants 0–1, so divide at the point of use.
function restitution() {
  return Number(bounceInput.value) / 100;
}

function wantedBallCount() {
  return Number(countInput.value);
}

// Keep the printed values beside the sliders in step with them.
function refreshControlLabels() {
  gravityOut.textContent = gravity() + " px/s²";
  bounceOut.textContent = restitution().toFixed(2);
  countOut.textContent = String(wantedBallCount());
}


// ---------- 4b. THE BALLS ----------

function makeBall() {
  const r = CONFIG.radiusMin + Math.random() * (CONFIG.radiusMax - CONFIG.radiusMin);
  // WHAT: a random direction, then a fixed speed along it.
  // WHY not random vx and random vy: that gives faster balls diagonally than
  // straight, because the two add up. An angle keeps every ball's speed equal.
  const angle = Math.random() * Math.PI * 2;
  return {
    x: r + Math.random() * (W - r * 2),
    y: r + Math.random() * (H * 0.5),
    vx: Math.cos(angle) * CONFIG.startSpeed,
    vy: Math.sin(angle) * CONFIG.startSpeed,
    r: r,
    color: COLORS[Math.floor(Math.random() * COLORS.length)]
  };
}

// Add or remove balls until there are as many as the slider asks for.
// WHY not rebuild the array every time the slider moves: dragging from 8 to 24
// would then throw away and re-drop the balls forty times on the way. Adding
// only what is missing keeps the ones already in flight exactly as they were.
function matchBallCount() {
  const wanted = wantedBallCount();
  while (balls.length < wanted) balls.push(makeBall());
  while (balls.length > wanted) balls.pop();
}

function reset() {
  balls = [];
  bounceCount = 0;
  matchBallCount();
  say("Fresh set of balls dropped.");
}


// ---------- 5. PHYSICS ----------

// One step of the world. dt is the number of SECONDS since the last step, so
// every speed below is in pixels per second — a unit you can read and predict.
function step(dt) {
  const g = gravity();
  const bounce = restitution();

  balls.forEach(function (ball) {
    // Gravity is an acceleration: it changes the SPEED.
    ball.vy += g * dt;
    // Speed changes the POSITION. Doing these in this order (rather than moving
    // first and then accelerating) is called semi-implicit Euler, and it is the
    // stable one — the other order slowly adds energy that was never there.
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    bounceOffWalls(ball, bounce);
    settleOnFloor(ball, g);
  });

  collideBalls(bounce);
}

// WHAT: a wall bounce is "put it back inside, then reverse that axis".
// WHY put it back first: the ball has already moved past the wall by the time
// we notice. Leaving it there means next frame it is still outside, and it gets
// flipped again — the classic ball that vibrates inside a wall forever.
function bounceOffWalls(ball, bounce) {
  if (ball.x - ball.r < 0) {
    ball.x = ball.r;
    ball.vx = -ball.vx * bounce;
    bounceCount += 1;
  } else if (ball.x + ball.r > W) {
    ball.x = W - ball.r;
    ball.vx = -ball.vx * bounce;
    bounceCount += 1;
  }

  if (ball.y - ball.r < 0) {
    ball.y = ball.r;
    ball.vy = -ball.vy * bounce;
    bounceCount += 1;
  } else if (ball.y + ball.r > H) {
    ball.y = H - ball.r;
    ball.vy = -ball.vy * bounce;
    bounceCount += 1;
  }
}

// WHAT: a ball moving very slowly on the floor is told to stop.
// WHY: with any bounce below 1, the arithmetic gives smaller and smaller
// hops that never quite reach zero, so the ball buzzes on the floor forever and
// the bounce counter climbs all night. Real simulations all have some version
// of this rule. It is a lie, and it is the honest kind: without it the model
// looks broken in a way the real world is not.
function settleOnFloor(ball, g) {
  const onFloor = ball.y + ball.r >= H - 0.5;
  if (onFloor && g > 0 && Math.abs(ball.vy) < CONFIG.restThreshold) {
    ball.vy = 0;
    ball.y = H - ball.r;
  }
}

// Compare every ball with every ball after it in the array.
// WHY j starts at i + 1: comparing A with B is the same as comparing B with A,
// and doing both would resolve every collision twice. This is also why the cost
// grows with the square of the ball count — 24 balls is 276 comparisons.
function collideBalls(bounce) {
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i];
      const b = balls[j];

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      const touching = distance > 0 && distance < a.r + b.r;
      if (!touching) continue;

      separate(a, b, dx, dy, distance);
      exchangeVelocities(a, b, dx / distance, dy / distance, bounce);
      bounceCount += 1;
    }
  }
}

// Push two overlapping balls apart along the line between their centres, half
// the overlap each. Without this they sink into each other and the collision
// fires again next frame, which looks like sticking.
function separate(a, b, dx, dy, distance) {
  const overlap = (a.r + b.r - distance) / 2;
  const nx = dx / distance;
  const ny = dy / distance;
  a.x -= nx * overlap;
  a.y -= ny * overlap;
  b.x += nx * overlap;
  b.y += ny * overlap;
}

// WHAT: an elastic collision between two balls of EQUAL mass, along the line
// joining their centres (nx, ny is that line, one unit long).
//
// The idea: split each ball's velocity into the part along that line and the
// part across it. The across part is untouched by the collision. The along part
// is simply swapped between the two balls — that is what equal masses do. The
// bounce setting then scales how much of that exchange survives.
//
// Equal masses is what keeps this short. Different masses needs the general
// formula, which is challenge 5 in challenges.md.
function exchangeVelocities(a, b, nx, ny, bounce) {
  // How fast they are closing on each other along the line.
  const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;

  // Already moving apart — separate() has done its job and reversing them now
  // would suck them back together. This check prevents a very common jitter.
  if (relative > 0) return;

  const impulse = -(1 + bounce) * relative / 2;
  a.vx -= impulse * nx;
  a.vy -= impulse * ny;
  b.vx += impulse * nx;
  b.vy += impulse * ny;
}


// ---------- 6. DRAW ----------

function draw() {
  ctx.fillStyle = "#0a1120";
  ctx.fillRect(0, 0, W, H);

  // A faint floor line, so "resting on the floor" is visible rather than
  // something you have to take on trust.
  ctx.strokeStyle = "#1b2740";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, H - 1);
  ctx.lineTo(W, H - 1);
  ctx.stroke();

  balls.forEach(function (ball) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
  });
}


// ---------- 6b. MEASUREMENTS ----------

// WHAT: the average speed of every ball, in pixels per second.
// WHY it is worth showing: it is the number that answers "did turning the
// bounce down actually take energy out?" A picture of balls moving is not
// evidence; a number that falls to zero is.
function averageSpeed() {
  if (balls.length === 0) return 0;
  let total = 0;
  balls.forEach(function (ball) {
    total += Math.hypot(ball.vx, ball.vy);
  });
  return total / balls.length;
}

function refreshReadouts() {
  ballCountOut.textContent = String(balls.length);
  avgSpeedOut.textContent = Math.round(averageSpeed()) + " px/s";
  bouncesOut.textContent = String(bounceCount);
}

function say(message) {
  statusOut.textContent = message;
}


// ---------- 7. LOOP ----------

function loop(now) {
  if (lastFrame === null) lastFrame = now;
  let dt = (now - lastFrame) / 1000;
  lastFrame = now;

  // WHY the cap: return to a tab after a minute away and dt would be 60
  // seconds. Every ball would teleport thousands of pixels in one step, clean
  // through the walls, and the simulation would never recover. A capped step
  // costs one slightly slow frame instead.
  if (dt > CONFIG.maxDelta) dt = CONFIG.maxDelta;

  if (running) step(dt);
  draw();
  refreshReadouts();

  requestAnimationFrame(loop);
}


// ---------- 8. START ----------

function setRunning(next) {
  running = next;
  runButton.textContent = running ? "Pause" : "Run";
  runButton.setAttribute("aria-pressed", String(running));
  say(running ? "Running." : "Paused. The picture stays; the clock stops.");
}

function init() {
  refreshControlLabels();
  reset();
  say("Running.");

  // input fires while a slider is being dragged; change fires only when it is
  // let go. input is the one that makes a control feel connected to the thing
  // it controls.
  [gravityInput, bounceInput, countInput].forEach(function (slider) {
    slider.addEventListener("input", function () {
      refreshControlLabels();
      matchBallCount();
    });
  });

  runButton.addEventListener("click", function () {
    setRunning(!running);
  });

  resetButton.addEventListener("click", function () {
    reset();
  });

  // WHAT: Space toggles the clock — but only when the focus is not already on a
  // control. WHY: Space presses a focused button and adjusts a focused slider.
  // Hijacking it everywhere would break the keyboard behaviour the browser
  // gives you for free, and keyboard users would lose the buttons entirely.
  window.addEventListener("keydown", function (event) {
    if (event.key !== " ") return;
    const onControl = event.target.closest("button, input");
    if (onControl) return;
    event.preventDefault();
    setRunning(!running);
  });

  window.addEventListener("focus", function () {
    lastFrame = null;
  });

  requestAnimationFrame(loop);
}

init();
