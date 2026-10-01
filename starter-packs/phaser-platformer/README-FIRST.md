# Phaser 3 Game Starter: Star Hop

A complete little platformer built with **Phaser 3**, one of the most widely used
engines for browser games. It is playable before you change anything, so every
edit you make has a clear before and after.

The engine is saved inside this pack (`lib/phaser.min.js`), and every shape is drawn
by code, so the game runs with **no internet connection, no image files, and no install**.

## What you are getting

```
phaser-platformer/
  index.html          the page and the box Phaser draws into
  style.css           page styling (the game itself is drawn by Phaser)
  game.js             the whole game, commented: config, scenes, physics, input
  lib/phaser.min.js   the Phaser engine, version 3.90.0 (do not edit)
  finished-example/   adds double jump, a bouncing hazard, lives, and a timer
  challenges.md       extensions, easy to hard
  troubleshooting.md  what to check when something breaks
  credits.txt         who made what, and the licences
```

## Your first 10-minute success

1. **Unzip the pack first**, then open the `phaser-platformer` folder in VS Code
   (`File > Open Folder`).
2. Double-click `index.html` to open it in a browser. Click the game once so it
   receives your key presses.
3. Move with ← → (or A D), jump with ↑, W, or Space. Collect all six stars.
4. In `game.js`, find the config at the bottom and change `debug: false` to
   `debug: true`. Save and refresh: every physics box is now outlined. Turn it off again.

## How Phaser thinks: scenes with three jobs

A **scene** is one screen of your game (`PlayScene`, `WinScene`). Phaser calls its
methods at the right moment, so you never write your own game loop:

| Method | When Phaser calls it | What goes in it |
|---|---|---|
| `preload()` | before the scene starts | `this.load.image(...)` for files (unused here) |
| `create()` | once, when the scene starts | build platforms, the player, colliders, the HUD |
| `update()` | every frame, about 60 times a second | read keys, set velocities |

Physics objects come in two kinds. **Static** objects (platforms, spikes, stars) never
move. **Dynamic** objects (the player) are moved by gravity and velocity.
`collider` makes two things solid to each other. `overlap` only reports that they touched.

## Guided checkpoints

1. **Tuning:** Change `GRAVITY` and `JUMP_SPEED` together. Find a pair that feels floaty
   and a pair that feels heavy.
2. **Level:** Add a platform to `PLATFORMS` and a star above it. Remember the numbers
   are the platform's **centre**.
3. **Input:** Find `JustDown`. Replace it with `isDown` for the jump and hold the key.
   Explain what changed, then put it back.
4. **Scenes:** Find `this.scene.start("win")`. Add a `TitleScene` that waits for
   Space, and list it first in the `scene: [...]` array.

Open `finished-example/index.html` only after trying these. Every change there is
marked `NEW:` so you can see exactly what was added.

## Adding real images later

`this.load.image("hero", "images/hero.png")` in `preload()` loads a picture, and
then `"hero"` works anywhere `"player"` does now. Browsers block image loading from a
double-clicked file, so once you load files, open the game through the VS Code
**Live Preview** or **Live Server** extension instead.

## Learn more

Phaser examples and docs: https://phaser.io/ (needs internet). This pack uses
Phaser **3**; Phaser 4 changed some APIs, so pick examples labelled Phaser 3.

## Make it a real project

Game Jam Week turns this starter into a finished game in five days: a one-page design document, a scope check, a day-by-day sprint, playtesting, and a showcase demo to the class. Pick Phaser 3 as your tool in its design document builder.

**Lesson:** [Game Jam Week](https://mrscandrett.github.io/lessons/computer-science/graphics-and-games/game-jam-week.html)
