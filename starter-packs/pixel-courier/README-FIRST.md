# Pixel Courier: 2D Game Starter

The finished game from the **2D Game Developer Pathway** (ClassroomOS), in plain
JavaScript with **no engine, no install and no internet needed**. It is playable before
you change anything, so every edit has a clear before and after.

## What you are getting

```
pixel-courier/
  index.html          the page and the 320 × 180 canvas
  style.css           scales the canvas up with sharp pixels
  art.js              YOUR art: palette, sprite frames, tiles, level (replace this)
  game.js             the whole game, commented by lesson number
  challenges.md       extensions, easy to hard
  troubleshooting.md  what to check when something breaks
  credits.txt         who made what, and the licences
```

## Your first 10-minute success

1. **Unzip the pack first**, then open the `pixel-courier` folder in VS Code.
2. Double-click `index.html`. Click the game, press Space, and deliver all the parcels.
3. In the pathway's lesson 10, press **Download my art.js**. Put that file in this
   folder (replace the old `art.js`) and refresh. Your courier, tiles and level appear.
4. In `game.js`, change `JUMP_VEL` from `280` to `340`. Save, refresh, and jump. Then
   put it back. You just tuned a game.

## How the art file works

Every sprite frame and tile is a string of 256 characters: one character per pixel,
16 per row. Each character is a palette index from `0` to `f` (`0` = transparent).

```js
level: [
  "..S......P.....",   // S spawn, P parcel, M mailbox, F checkpoint
  "GGGGGGGGGGGGGGG",   // tile letters: G grass, D dirt, B brick, C crate, = plank, ^ spikes
]
```

You can edit `art.js` by hand, but the pathway's editors are faster.

## Where each idea is explained

| In `game.js` | Pathway lesson |
| --- | --- |
| `bake()`, `imageSmoothingEnabled` | 01 Pixel Art & Sprites |
| `frameOf()` | 02 Sprite Sheets & Animation |
| `loadLevel()`, `tileAt()` | 03 Tilesets & Tilemaps |
| `frame()` and `STEP` | 04 Game Loop & Rendering |
| tuning constants, coyote, buffer | 05 Movement & Jump Feel |
| `moveX()`, `moveY()`, `overlaps()` | 06 Collision & Response |
| camera block, parallax hills | 07 Cameras, Layers & Parallax |
| `next = "idle"` … state machine | 08 Animation State Machines |
| squash, particles, shake, hit-stop | 09 Level Design & Game Feel |
| `mode`, best time | 10 Menus, Saving & Shipping |
