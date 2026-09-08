"use strict";

// ============================================================
// STAR CATCHER
// A keyboard game drawn on one <canvas>. No libraries, no images, no audio.
//
// Order of the file, top to bottom:
//   1. CONFIG   — every number worth tuning, in one place
//   2. ELEMENTS — the parts of the page this file touches
//   3. STATE    — everything the game currently knows
//   4. INPUT    — what the keyboard and the buttons do
//   5. UPDATE   — how one slice of time changes the state
//   6. DRAW     — how the state is painted, deciding nothing
//   7. LOOP     — the rhythm that calls update then draw, forever
//
// The rule that keeps a game readable: update() may change things but must
// never draw, and draw() may paint but must never change things. When a game
// starts behaving differently depending on how fast the computer is, this
// separation is almost always the thing that broke.
// ============================================================


// ---------- 1. CONFIG ----------

// TRY THIS: change one number, reload, and see what it does to the feel of the
// game. That is the whole reason these live at the top instead of being buried
// somewhere in the logic.
const CONFIG = {
  roundSeconds: 60,      // how long one run lasts
  basketSpeed: 460,      // pixels per SECOND, not per frame — see update()
  basketWidth: 124,
  basketHeight: 20,
  starRadius: 13,
  starSpeedMin: 120,     // pixels per second
  starSpeedMax: 260,
  spawnEvery: 0.7,       // seconds between new stars
  maxDelta: 0.05         // ignore time jumps longer than this (see loop())
};


// ---------- 2. ELEMENTS ----------

const canvas = document.querySelector("#stage");
const ctx = canvas.getContext("2d");
const scoreOut = document.querySelector("#score");
const missedOut = document.querySelector("#missed");
const timeOut = document.querySelector("#time");
const statusOut = document.querySelector("#status");
const pauseButton = document.querySelector("#pause");
const restartButton = document.querySelector("#restart");

// WHAT: the canvas's own coordinate system, from its width and height
// attributes. WHY read them instead of typing 720 and 480 again: change the
// attributes in index.html and every calculation below follows automatically.
const W = canvas.width;
const H = canvas.height;
const FLOOR = H - 34;                       // where the basket sits
const BASKET_Y = FLOOR - CONFIG.basketHeight;


// ---------- 3. STATE ----------

// Everything the game knows lives in here. If it is not in this object (or in
// `keysDown`), the game does not know it, and the screen must never be asked —
// pixels are a picture of the state, never a place to store it.
let game = freshGame();

// WHAT: which keys are held down RIGHT NOW.
// WHY a Set: a key is either held or not, and a Set cannot hold the same key
// twice however many keydown events the browser repeats.
const keysDown = new Set();

// The timestamp of the previous frame, so the loop can work out how much time
// has passed. null means "the loop has not run yet".
let lastFrame = null;

function freshGame() {
  return {
    phase: "ready",                 // "ready" | "playing" | "paused" | "over"
    score: 0,
    missed: 0,
    timeLeft: CONFIG.roundSeconds,
    basketX: W / 2 - CONFIG.basketWidth / 2,
    stars: [],                      // each: { x, y, speed, spin }
    spawnTimer: 0
  };
}


// ---------- 4. INPUT ----------

// WHAT: keydown only RECORDS that a key is down. It does not move anything.
// WHY: if the basket moved here, its speed would depend on how fast the
// operating system repeats a held key — which is a setting on somebody else's
// computer, not something you control. Storing the key and moving in update()
// gives smooth movement at a speed you chose.
function handleKeyDown(event) {
  const key = event.key.toLowerCase();

  if (key === "p") {
    togglePause();
    return;
  }
  if (key === "r") {
    restart();
    return;
  }

  if (isMoveKey(key)) {
    keysDown.add(key);
    // WHY preventDefault: the arrow keys scroll the page by default, and a game
    // that scrolls the page out from under itself is unplayable.
    event.preventDefault();
    if (game.phase === "ready") start();
  }
}

function handleKeyUp(event) {
  keysDown.delete(event.key.toLowerCase());
}

function isMoveKey(key) {
  return key === "arrowleft" || key === "arrowright" || key === "a" || key === "d";
}

// Returns -1 for left, 1 for right, 0 for neither or both.
// Holding both keys at once should stand still, and this falls out of the
// arithmetic for free instead of needing a special case.
function steerDirection() {
  const left = keysDown.has("arrowleft") || keysDown.has("a");
  const right = keysDown.has("arrowright") || keysDown.has("d");
  return (right ? 1 : 0) - (left ? 1 : 0);
}


// ---------- 4b. PHASE CHANGES ----------

function start() {
  game.phase = "playing";
  say("Go. Catch as many as you can.");
}

function togglePause() {
  if (game.phase === "playing") {
    game.phase = "paused";
    pauseButton.textContent = "Resume";
    say("Paused. Press P or the Resume button.");
  } else if (game.phase === "paused") {
    game.phase = "playing";
    pauseButton.textContent = "Pause";
    say("Back in.");
  }
}

function restart() {
  game = freshGame();
  keysDown.clear();
  pauseButton.textContent = "Pause";
  say("New round. Press an arrow key to start.");
  refreshReadouts();
}

function finish() {
  game.phase = "over";
  pauseButton.textContent = "Pause";
  // WHY this sentence and not "Game over": a score nobody can hear is a score
  // half the players never get. #status is aria-live="polite", so this is
  // announced to a screen reader as well as printed.
  say("Time. You caught " + game.score + " and missed " + game.missed +
      ". Press R to play again.");
}

// WHAT: the one place that writes to the status line.
function say(message) {
  statusOut.textContent = message;
}


// ---------- 5. UPDATE ----------

// dt is the number of SECONDS since the previous frame — usually about 0.016.
// Every movement below is multiplied by it, which is what makes the game run at
// the same speed on a 60 Hz laptop and a 144 Hz monitor.
function update(dt) {
  if (game.phase !== "playing") return;

  moveBasket(dt);
  countDown(dt);
  spawnStars(dt);
  moveStars(dt);
}

function moveBasket(dt) {
  game.basketX += steerDirection() * CONFIG.basketSpeed * dt;
  // Keep the basket on screen. clamp() is not a JavaScript function, so this is
  // the usual two-step: never below 0, never past the right-hand edge.
  game.basketX = Math.max(0, Math.min(W - CONFIG.basketWidth, game.basketX));
}

function countDown(dt) {
  game.timeLeft -= dt;
  if (game.timeLeft <= 0) {
    game.timeLeft = 0;
    finish();
  }
}

function spawnStars(dt) {
  game.spawnTimer -= dt;
  if (game.spawnTimer > 0) return;

  game.spawnTimer = CONFIG.spawnEvery;
  const r = CONFIG.starRadius;
  game.stars.push({
    x: r + Math.random() * (W - r * 2),
    y: -r,
    speed: CONFIG.starSpeedMin + Math.random() * (CONFIG.starSpeedMax - CONFIG.starSpeedMin),
    spin: Math.random() * Math.PI * 2
  });
}

function moveStars(dt) {
  // WHY the loop counts DOWN: stars are removed from the array inside the loop,
  // and removing an item while walking forwards makes the loop skip the next
  // one. Walking backwards, the items still to visit never move.
  for (let i = game.stars.length - 1; i >= 0; i--) {
    const star = game.stars[i];
    star.y += star.speed * dt;
    star.spin += dt * 2;

    if (caughtByBasket(star)) {
      game.stars.splice(i, 1);
      game.score += 1;
    } else if (star.y - CONFIG.starRadius > H) {
      game.stars.splice(i, 1);
      game.missed += 1;
    }
  }
}

// WHAT: a rectangle test, not a circle test. The star is treated as a box.
// WHY: it is close enough that nobody can feel the difference, and it is short
// enough that you can read it and believe it. Precision you cannot perceive is
// precision nobody needed.
function caughtByBasket(star) {
  const r = CONFIG.starRadius;
  const withinX = star.x + r > game.basketX &&
                  star.x - r < game.basketX + CONFIG.basketWidth;
  const withinY = star.y + r >= BASKET_Y &&
                  star.y - r <= BASKET_Y + CONFIG.basketHeight;
  return withinX && withinY;
}


// ---------- 6. DRAW ----------

// draw() decides nothing. Every value it paints was already worked out in
// update(). If you find yourself changing game.score in here, that belongs
// above instead.
function draw() {
  drawBackground();
  game.stars.forEach(drawStar);
  drawBasket();
  drawOverlay();
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#101b33");
  sky.addColorStop(1, "#080d18");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#1b2740";
  ctx.fillRect(0, FLOOR + CONFIG.basketHeight, W, H);
}

function drawStar(star) {
  // save() and restore() are a bookmark in the drawing settings: everything
  // changed after save() is undone by restore(), so the rotation below cannot
  // leak out and tilt the rest of the scene.
  ctx.save();
  ctx.translate(star.x, star.y);
  ctx.rotate(star.spin);

  ctx.beginPath();
  const points = 5;
  const outer = CONFIG.starRadius;
  const inner = outer * 0.45;
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (i * Math.PI) / points;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();

  ctx.fillStyle = "#ffc857";
  ctx.fill();
  ctx.restore();
}

function drawBasket() {
  ctx.fillStyle = "#7ee0b8";
  ctx.beginPath();
  // roundRect is recent enough that an older browser may not have it, so ask
  // before using it rather than letting the whole draw() call throw. Checking a
  // feature instead of guessing from the browser's name is the habit worth
  // keeping: the browser can tell you the truth, its name cannot.
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(game.basketX, BASKET_Y, CONFIG.basketWidth, CONFIG.basketHeight, 8);
  } else {
    ctx.rect(game.basketX, BASKET_Y, CONFIG.basketWidth, CONFIG.basketHeight);
  }
  ctx.fill();

  // A thin lip so the basket reads as a container rather than a bar.
  ctx.fillStyle = "#a9ecd0";
  ctx.fillRect(game.basketX, BASKET_Y, CONFIG.basketWidth, 4);
}

// WHAT: the words shown over the play area between rounds.
// NOTE: this text is painted, which means it does not exist for a screen
// reader. That is exactly why every message here is also sent to #status,
// which is real text in the page.
function drawOverlay() {
  if (game.phase === "playing") return;

  ctx.fillStyle = "rgba(8, 13, 24, 0.72)";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#edf2fb";
  ctx.textAlign = "center";

  if (game.phase === "ready") {
    ctx.font = "700 34px system-ui, sans-serif";
    ctx.fillText("Star Catcher", W / 2, H / 2 - 16);
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillText("Press an arrow key to start", W / 2, H / 2 + 18);
  } else if (game.phase === "paused") {
    ctx.font = "700 34px system-ui, sans-serif";
    ctx.fillText("Paused", W / 2, H / 2 - 8);
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillText("Press P to carry on", W / 2, H / 2 + 26);
  } else if (game.phase === "over") {
    ctx.font = "700 34px system-ui, sans-serif";
    ctx.fillText("Time", W / 2, H / 2 - 34);
    ctx.font = "20px system-ui, sans-serif";
    ctx.fillText("Caught " + game.score + " · Missed " + game.missed, W / 2, H / 2 + 4);
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillText("Press R to play again", W / 2, H / 2 + 38);
  }
}


// ---------- 6b. THE HTML READOUTS ----------

// WHAT: copies the numbers into the real HTML under the canvas.
// WHY: a canvas is a single image to the browser. Nothing painted on it can be
// read by a screen reader, selected, or zoomed as text. Any number that matters
// has to exist as text somewhere too — and that costs three lines.
function refreshReadouts() {
  scoreOut.textContent = String(game.score);
  missedOut.textContent = String(game.missed);
  timeOut.textContent = Math.ceil(game.timeLeft) + "s";
}


// ---------- 7. LOOP ----------

// requestAnimationFrame asks the browser to call this back just before it next
// paints — roughly 60 times a second, and never while the tab is hidden.
// `now` is a timestamp in milliseconds that the browser hands us.
function loop(now) {
  if (lastFrame === null) lastFrame = now;
  // Divide by 1000 because everything in CONFIG is written per second, which is
  // a unit humans can reason about.
  let dt = (now - lastFrame) / 1000;
  lastFrame = now;

  // WHY the cap: come back to a tab after two minutes and `dt` would be 120
  // seconds. Every star would leap the whole screen in one frame and sail
  // straight past the basket. Capping it means a long gap costs you one slow
  // frame instead of the round.
  if (dt > CONFIG.maxDelta) dt = CONFIG.maxDelta;

  update(dt);
  draw();
  refreshReadouts();

  requestAnimationFrame(loop);
}


// ---------- 8. START ----------

function init() {
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

  pauseButton.addEventListener("click", function () {
    if (game.phase === "ready") start();
    else togglePause();
    // WHY: after clicking, the keyboard focus is on the button, so a Space or
    // Enter would press it again. Nothing here depends on that, but it is worth
    // knowing why games usually keep focus off their controls during play.
  });

  restartButton.addEventListener("click", restart);

  // WHAT: pause when the tab goes away.
  // WHY: requestAnimationFrame already stops in a hidden tab, so the round
  // would freeze mid-air and resume the moment you came back — usually with a
  // star about to land. Pausing on purpose means you come back to a decision,
  // not to a surprise.
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && game.phase === "playing") togglePause();
  });

  // Some browsers pause a hidden tab for so long that the first frame back has
  // a huge timestamp gap. Forgetting the old timestamp avoids one wasted frame.
  window.addEventListener("focus", function () {
    lastFrame = null;
  });

  refreshReadouts();
  requestAnimationFrame(loop);
}

init();
