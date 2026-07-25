const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1400 },
            debug: false
        }
    },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);
let player, cursors, platforms, bgFar, bgMid;
let coins, score, scoreText;
let jumpsLeft, maxJumps = 2;

function preload() {
    this.load.image('ground', 'https://labs.phaser.io/assets/sprites/platform.png');
    this.load.spritesheet('knight', 'https://labs.phaser.io/assets/sprites/dude.png', { frameWidth: 32, frameHeight: 48 });
    this.load.image('bgFar', 'https://labs.phaser.io/assets/skies/space2.png');
    this.load.image('bgMid', 'https://labs.phaser.io/assets/skies/nebula.png');
}

function create() {
    this.physics.world.setBounds(0, 0, 3200, 600);

    // Parallax Setup
    bgFar = this.add.tileSprite(400, 300, 800, 600, 'bgFar').setScrollFactor(0).setAlpha(0.4).setTint(0x222244);
    bgMid = this.add.tileSprite(400, 300, 800, 600, 'bgMid').setScrollFactor(0).setAlpha(0.2).setBlendMode(Phaser.BlendModes.ADD);

    // World Building
    platforms = this.physics.add.staticGroup();
    for (let x = 0; x < 3200; x += 400) {
        platforms.create(x, 585, 'ground').setScale(2).refreshBody().setTint(0x111122);
    }
    platforms.create(600, 450, 'ground').setTint(0x1a1a33);
    platforms.create(1100, 350, 'ground').setTint(0x1a1a33);

    // Player
    player = this.physics.add.sprite(100, 450, 'knight');
    player.setCollideWorldBounds(true);

    // Camera
    this.cameras.main.setBounds(0, 0, 3200, 600);
    this.cameras.main.startFollow(player, true, 0.08, 0.08);
    this.cameras.main.setBackgroundColor('#050510');

    this.physics.add.collider(player, platforms);
    cursors = this.input.keyboard.createCursorKeys();
    jumpsLeft = maxJumps;

    // Coins
    const coinGfx = this.add.graphics();
    coinGfx.fillStyle(0xffe066, 1);
    coinGfx.fillCircle(8, 8, 8);
    coinGfx.generateTexture('coin', 16, 16);
    coinGfx.destroy();

    coins = this.physics.add.group({ allowGravity: false });
    [500, 900, 1400, 1900, 2500].forEach((x) => coins.create(x, 400, 'coin'));
    this.physics.add.overlap(player, coins, collectCoin, null, this);

    score = 0;
    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '20px', fill: '#fff' }).setScrollFactor(0);
    // IDEA: add a hazard (e.g. a tinted spike platform) that resets the
    // player to the start position on touch, using this.physics.add.overlap.
}

function collectCoin(player, coin) {
    coin.disableBody(true, true);
    score += 10;
    scoreText.setText('Score: ' + score);
}

function update() {
    bgFar.tilePositionX = this.cameras.main.scrollX * 0.1; 
    bgMid.tilePositionX = this.cameras.main.scrollX * 0.4;

    if (cursors.left.isDown) {
        player.setVelocityX(-300);
        player.setFlipX(true); 
    } else if (cursors.right.isDown) {
        player.setVelocityX(300);
        player.setFlipX(false);
    } else {
        player.setVelocityX(0);
    }

    if (player.body.touching.down) {
        jumpsLeft = maxJumps;
    }
    if (Phaser.Input.Keyboard.JustDown(cursors.up) && jumpsLeft > 0) {
        player.setVelocityY(-650);
        jumpsLeft -= 1;
    }
    if (cursors.up.isUp && player.body.velocity.y < 0) {
        player.setVelocityY(player.body.velocity.y * 0.5);
    }
}