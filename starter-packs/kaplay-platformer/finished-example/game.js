// ================================================================
// COIN CLIMB — FINISHED REFERENCE BUILD
// Try the challenges in ../game.js first. Search for "NEW:" to find the four
// additions: double jump, a patrolling enemy, three lives, and a clear time.
// Comment key: WHAT = the job · WHY = the reason · TRY THIS = a safe experiment
// ================================================================

// WHAT: kaplay() starts the engine and adds its functions (add, pos, rect...) to the page.
kaplay({
  canvas: document.querySelector("#game"),
  width: 800,
  height: 450,
  background: [16, 22, 40],
  letterbox: true, // WHY: keeps the 16:9 shape when the canvas is resized by CSS
});

// WHAT: Named constants collect every tuning number in one place.
// TRY THIS: Change one value, predict what will happen, then test it.
const GRAVITY = 1600;   // how hard the world pulls down (pixels per second²)
const SPEED = 260;      // left/right speed (pixels per second)
const JUMP_FORCE = 640; // upward launch speed
const START = vec2(60, 360);
const START_LIVES = 3;    // NEW
const ENEMY_SPEED = 90;   // NEW: patrol speed (pixels per second)

// WHY: Without gravity, body() objects float. KAPLAY starts with gravity at 0.
setGravity(GRAVITY);

// WHAT: A level is a list of rectangles: [x, y, width, height].
// TRY THIS: Add a platform, move one, or make one narrower to raise the difficulty.
const PLATFORMS = [
  [0, 410, 800, 40],   // ground
  [140, 330, 140, 18],
  [340, 260, 120, 18],
  [540, 200, 140, 18],
  [300, 140, 110, 18],
  [80, 200, 110, 18],
];

// WHAT: Coins sit just above platforms. Spikes punish a missed jump.
const COINS = [[210, 300], [400, 230], [610, 170], [355, 110], [135, 170], [720, 380]];
const SPIKES = [[470, 392], [500, 392]];

// WHAT: A scene is one screen of the game. go("play") starts or restarts it.
scene("play", () => {
  let score = 0;
  let lives = START_LIVES; // NEW
  let elapsed = 0;         // NEW: seconds since the round began

  for (const [x, y, w, h] of PLATFORMS) {
    add([
      rect(w, h, { radius: 4 }),
      pos(x, y),
      color(70, 110, 190),
      area(),                    // WHAT: gives it a collision shape
      body({ isStatic: true }),  // WHY: static bodies block movement but never fall
      "platform",
    ]);
  }

  for (const [x, y] of COINS) {
    add([circle(9), pos(x, y), anchor("center"), color(255, 211, 77), area(), "coin"]);
  }

  for (const [x, y] of SPIKES) {
    // WHY: A triangle is a polygon with three points, drawn relative to pos.
    add([polygon([vec2(0, 18), vec2(14, 0), vec2(28, 18)]), pos(x, y), color(255, 85, 110), area(), "spike"]);
  }

  // WHAT: The player. "body()" means gravity and platforms affect it.
  const player = add([
    rect(28, 34, { radius: 6 }),
    pos(START),
    anchor("bot"), // WHY: pos is the player's feet, which makes landing maths easier
    color(120, 235, 200),
    area(),
    body(),
    // NEW: doubleJump(2) is a KAPLAY component that allows two jumps before landing.
    // WHY use it: it tracks the jump count for us and resets it on landing.
    doubleJump(2),
    "player",
  ]);

  // NEW: A patrolling enemy walks back and forth along platform 4 (the high one).
  // WHY these numbers: the platform spans x = 540…680, so the enemy turns at the edges.
  const enemy = add([
    rect(26, 22, { radius: 4 }),
    pos(560, 200),
    anchor("bot"),
    color(255, 85, 110),
    area(),
    "spike", // WHY: reusing the spike tag means touching it already costs a life
    { dir: 1 },
  ]);
  enemy.onUpdate(() => {
    enemy.move(ENEMY_SPEED * enemy.dir, 0);
    if (enemy.pos.x > 667) enemy.dir = -1;
    if (enemy.pos.x < 553) enemy.dir = 1;
  });

  // WHAT: fixed() keeps the HUD in place on screen. z(100) draws it on top.
  const hud = add([text("", { size: 22 }), pos(16, 14), fixed(), z(100)]);
  function updateHud() {
    hud.text = `Coins ${score} / ${COINS.length}   Lives ${lives}   Time ${elapsed.toFixed(1)}`;
  }
  updateHud();

  // INPUT: onKeyDown runs every frame while the key is held → smooth movement.
  onKeyDown(["left", "a"], () => player.move(-SPEED, 0));
  onKeyDown(["right", "d"], () => player.move(SPEED, 0));

  // INPUT: onKeyPress runs once per press → one jump per press.
  onKeyPress(["up", "w", "space"], () => {
    // NEW: doubleJump() replaces the isGrounded() check; the component decides
    // whether a jump is still available.
    player.doubleJump(JUMP_FORCE);
  });
  onKeyPress("r", () => go("play"));

  // COLLISION: onCollide runs once when the player first touches something with that tag.
  player.onCollide("coin", (coin) => {
    destroy(coin);
    score += 1;
    updateHud();
    if (score === COINS.length) go("win", elapsed); // NEW: pass the time to the win scene
  });

  player.onCollide("spike", () => respawn());

  // UPDATE: keep the player on screen and catch falls.
  player.onUpdate(() => {
    elapsed += dt(); // NEW: dt() is the seconds since the last frame
    updateHud();
    player.pos.x = Math.max(14, Math.min(width() - 14, player.pos.x));
    if (player.pos.y > height() + 60) respawn();
  });

  function respawn() {
    // NEW: Each respawn costs a life; the last one ends the round.
    lives -= 1;
    if (lives <= 0) {
      go("lose", score);
      return;
    }
    updateHud();
    player.pos = START.clone();
    player.vel = vec2(0, 0);
  }
});

scene("win", (time) => {
  add([text(`EVERY COIN IN ${time.toFixed(1)} s!`, { size: 40 }), pos(center().sub(0, 20)), anchor("center"), color(255, 211, 77)]);
  add([text("Press R or Space to play again", { size: 20 }), pos(center().add(0, 30)), anchor("center")]);
  onKeyPress(["r", "space"], () => go("play"));
});

// NEW: A lose scene, reached when lives run out. go() passes the score as data.
scene("lose", (coins) => {
  add([text("OUT OF LIVES", { size: 40 }), pos(center().sub(0, 20)), anchor("center"), color(255, 85, 110)]);
  add([text(`You collected ${coins} coins. Press R or Space to try again`, { size: 20 }), pos(center().add(0, 30)), anchor("center")]);
  onKeyPress(["r", "space"], () => go("play"));
});

go("play");
