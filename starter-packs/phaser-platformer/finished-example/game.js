// ================================================================
// STAR HOP — FINISHED REFERENCE BUILD
// Try the challenges in ../game.js first. Search for "NEW:" to find the four
// additions: double jump, a bouncing hazard, three lives, and a clear time.
// Comment key: WHAT = the job · WHY = the reason · TRY THIS = a safe experiment
// ================================================================

// WHAT: Named constants collect every tuning number in one place.
// TRY THIS: Change one value, predict what will happen, then test it.
const WIDTH = 800;
const HEIGHT = 450;
const GRAVITY = 900;     // downward pull (pixels per second²)
const SPEED = 220;       // left/right speed (pixels per second)
const JUMP_SPEED = 460;  // upward launch speed
const START = { x: 60, y: 360 };
const MAX_JUMPS = 2;     // NEW: 2 = double jump
const START_LIVES = 3;   // NEW

// WHAT: The level as data. Each platform is [centre x, centre y, width, height].
// WHY centres: Phaser positions sprites by their centre point by default.
const PLATFORMS = [
  [400, 430, 800, 40],  // ground
  [210, 340, 140, 18],
  [400, 270, 120, 18],
  [610, 210, 140, 18],
  [355, 150, 110, 18],
  [135, 210, 110, 18],
];
const STARS = [[210, 312], [400, 242], [610, 182], [355, 122], [135, 182], [720, 392]];
const SPIKES = [[485, 401], [515, 401]];

// WHAT: A Scene is one screen of the game. Phaser calls its methods for you:
//   preload() → load files, create() → build the world once, update() → every frame.
class PlayScene extends Phaser.Scene {
  constructor() {
    super("play");
  }

  // WHAT: Draw simple shapes once and save them as textures (images in memory).
  // WHY: No image files to download, so nothing can be missing or blocked.
  // TRY THIS: Replace a texture with your own image using this.load.image() in preload().
  makeTextures() {
    if (this.textures.exists("player")) return; // only on the first run
    const g = this.add.graphics();
    g.fillStyle(0x78ebc8).fillRoundedRect(0, 0, 28, 34, 6).generateTexture("player", 28, 34).clear();
    g.fillStyle(0xffffff).fillRect(0, 0, 32, 32).generateTexture("block", 32, 32).clear();
    g.fillStyle(0xffd34d).fillCircle(10, 10, 10).generateTexture("star", 20, 20).clear();
    g.fillStyle(0xff556e).fillTriangle(0, 18, 14, 0, 28, 18).generateTexture("spike", 28, 18).clear();
    g.fillStyle(0xff556e).fillCircle(11, 11, 11).generateTexture("bomb", 22, 22).clear(); // NEW
    g.destroy();
  }

  create() {
    this.makeTextures();
    this.score = 0;
    this.lives = START_LIVES; // NEW
    this.jumpsUsed = 0;       // NEW: counts jumps since last touching the ground
    this.startTime = this.time.now; // NEW: scene clock in milliseconds

    // WHAT: A static group holds objects that block movement but never move.
    this.platforms = this.physics.add.staticGroup();
    for (const [x, y, w, h] of PLATFORMS) {
      // WHY refreshBody(): after resizing a static object, its physics box must be updated too.
      this.platforms.create(x, y, "block").setDisplaySize(w, h).setTint(0x466ebe).refreshBody();
    }

    // WHAT: Stars and spikes do not need gravity; they sit where they are placed.
    this.stars = this.physics.add.staticGroup();
    for (const [x, y] of STARS) this.stars.create(x, y, "star");
    this.spikes = this.physics.add.staticGroup();
    for (const [x, y] of SPIKES) this.spikes.create(x, y, "spike");

    // WHAT: The player is a dynamic sprite: gravity and collisions move it.
    this.player = this.physics.add.sprite(START.x, START.y, "player");
    this.player.setCollideWorldBounds(true);

    // WHAT: collider = solid contact. overlap = "they touched", with no push-back.
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(this.player, this.stars, this.collectStar, null, this);
    this.physics.add.overlap(this.player, this.spikes, this.respawn, null, this);

    // NEW: A bouncing hazard. setBounce(1) keeps all its energy, so it never settles.
    // WHY a collider with platforms: it should bounce off them, not pass through.
    this.bomb = this.physics.add.sprite(700, 60, "bomb");
    this.bomb.setBounce(1).setCollideWorldBounds(true).setVelocity(-140, 0);
    this.physics.add.collider(this.bomb, this.platforms);
    this.physics.add.overlap(this.player, this.bomb, this.respawn, null, this);

    // INPUT: arrow keys plus W, A, D, R, and Space.
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,D,R");

    this.hud = this.add.text(16, 12, "", { fontFamily: "system-ui, sans-serif", fontSize: "22px", color: "#eef3ff" });
    this.updateHud();
  }

  update() {
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    // WHY JustDown: true for ONE frame per press, so holding the key gives one jump.
    const jump = Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.keys.W);

    if (left) this.player.setVelocityX(-SPEED);
    else if (right) this.player.setVelocityX(SPEED);
    else this.player.setVelocityX(0);

    // NEW: Landing refills the jumps; each jump spends one until MAX_JUMPS is reached.
    if (this.player.body.blocked.down) this.jumpsUsed = 0;
    if (jump && this.jumpsUsed < MAX_JUMPS) {
      this.player.setVelocityY(-JUMP_SPEED);
      this.jumpsUsed += 1;
    }
    this.updateHud(); // NEW: refresh the timer every frame

    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) this.scene.restart();
  }

  collectStar(player, star) {
    star.destroy();
    this.score += 1;
    this.updateHud();
    // NEW: pass the clear time to the win scene as data.
    if (this.score === STARS.length) this.scene.start("win", { time: this.elapsed() });
  }

  respawn() {
    // NEW: A hit costs a life; the last one ends the round.
    this.lives -= 1;
    if (this.lives <= 0) {
      this.scene.start("lose", { stars: this.score });
      return;
    }
    this.player.setPosition(START.x, START.y).setVelocity(0, 0);
    // WHY: Move the bomb away too, so it cannot hit the player again on respawn.
    this.bomb.setPosition(700, 60).setVelocity(-140, 0);
  }

  elapsed() {
    return (this.time.now - this.startTime) / 1000;
  }

  updateHud() {
    this.hud.setText(`Stars ${this.score} / ${STARS.length}   Lives ${this.lives}   Time ${this.elapsed().toFixed(1)}`);
  }
}

class WinScene extends Phaser.Scene {
  constructor() {
    super("win");
  }

  create(data) {
    const style = { fontFamily: "system-ui, sans-serif", color: "#eef3ff" };
    this.add.text(WIDTH / 2, HEIGHT / 2 - 20, `EVERY STAR IN ${data.time.toFixed(1)} s!`, { ...style, fontSize: "40px", color: "#ffd34d" }).setOrigin(0.5);
    this.add.text(WIDTH / 2, HEIGHT / 2 + 30, "Press R or Space to play again", { ...style, fontSize: "20px" }).setOrigin(0.5);
    this.input.keyboard.once("keydown-R", () => this.scene.start("play"));
    this.input.keyboard.once("keydown-SPACE", () => this.scene.start("play"));
  }
}

// NEW: Reached when lives run out. scene.start() passed the star count in as data.
class LoseScene extends Phaser.Scene {
  constructor() {
    super("lose");
  }

  create(data) {
    const style = { fontFamily: "system-ui, sans-serif", color: "#eef3ff" };
    this.add.text(WIDTH / 2, HEIGHT / 2 - 20, "OUT OF LIVES", { ...style, fontSize: "40px", color: "#ff556e" }).setOrigin(0.5);
    this.add.text(WIDTH / 2, HEIGHT / 2 + 30, `You collected ${data.stars} stars. Press R or Space to try again`, { ...style, fontSize: "20px" }).setOrigin(0.5);
    this.input.keyboard.once("keydown-R", () => this.scene.start("play"));
    this.input.keyboard.once("keydown-SPACE", () => this.scene.start("play"));
  }
}

// WHAT: The game configuration. Phaser reads this once and builds everything.
const game = new Phaser.Game({
  type: Phaser.AUTO,          // WebGL if available, otherwise Canvas
  parent: "game",             // the <div id="game"> in index.html
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: "#10162a",
  physics: {
    default: "arcade",        // simple, fast box physics
    arcade: { gravity: { y: GRAVITY }, debug: false }, // TRY THIS: debug: true shows every hitbox
  },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [PlayScene, WinScene, LoseScene], // the first scene listed starts first
});
