# Troubleshooting

## The page shows but the game area is empty

- Open the console (`F12` → *Console*) and read the first red error.
- `Phaser is not defined`: `lib/phaser.min.js` is missing or its `<script>` path is
  wrong. Phaser must load **before** `game.js`.
- Did you unzip? A game opened from inside a ZIP cannot load `lib/phaser.min.js`.

## The keys do nothing

- Click the game once so the page has focus.
- Key names in `addKeys("W,A,D,R")` are capital letters with no spaces inside names.

## The player falls through a platform

- Platforms must be in `this.platforms` and there must be a
  `this.physics.add.collider(this.player, this.platforms)` line.
- After changing a static object's size or position, call `.refreshBody()`.
  Turn on `debug: true` to see where the physics box really is.

## The player cannot jump

- Jumping needs `this.player.body.blocked.down`, which is only true while standing on
  something solid.
- If you raised `GRAVITY` a lot, raise `JUMP_SPEED` too.

## Stars cannot be collected

- Check the `overlap` line names `this.stars` and `this.collectStar`.
- With `debug: true`, check the star's box actually reaches the player.

## Images will not load ("Failed to process file")

- Browsers block `this.load.image` from a double-clicked file. Use the VS Code Live
  Preview or Live Server extension and open the page through it.
- Check the path and capital letters in the file name.
