// ================================================================
// STAR HOP — PHASER 3 PLATFORMER STARTER
// Read README-FIRST.md before changing this file.
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
    g.destroy();
  }

  create() {
    this.makeTextures();
    this.score = 0;

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

    // WHY blocked.down: true only while standing on something solid.
    if (jump && this.player.body.blocked.down) this.player.setVelocityY(-JUMP_SPEED);

    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) this.scene.restart();
  }

  collectStar(player, star) {
    star.destroy();
    this.score += 1;
    this.updateHud();
    if (this.score === STARS.length) this.scene.start("win");
  }

  respawn() {
    // TRY THIS: Add lives here and start a "lose" scene when they run out.
    this.player.setPosition(START.x, START.y).setVelocity(0, 0);
  }

  updateHud() {
    this.hud.setText(`Stars ${this.score} / ${STARS.length}`);
  }
}

class WinScene extends Phaser.Scene {
  constructor() {
    super("win");
  }

  create() {
    const style = { fontFamily: "system-ui, sans-serif", color: "#eef3ff" };
    this.add.text(WIDTH / 2, HEIGHT / 2 - 20, "YOU GOT EVERY STAR!", { ...style, fontSize: "40px", color: "#ffd34d" }).setOrigin(0.5);
    this.add.text(WIDTH / 2, HEIGHT / 2 + 30, "Press R or Space to play again", { ...style, fontSize: "20px" }).setOrigin(0.5);
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
  scene: [PlayScene, WinScene], // the first scene listed starts first
});
