# KAPLAY 2D Game Starter: Coin Climb

A complete little platformer built with **KAPLAY** (the engine that used to be
called Kaboom.js). It is playable before you change anything, so every edit you
make has a clear before and after.

The engine is saved inside this pack (`lib/kaplay.js`), so the game runs with **no
internet connection and no install**.

## What you are getting

```
kaplay-platformer/
  index.html          the page and the canvas the game draws into
  style.css           page styling (the game itself is drawn by KAPLAY)
  game.js             the whole game, commented: level, player, coins, scenes
  lib/kaplay.js       the KAPLAY engine, version 3001.0.19 (do not edit)
  finished-example/   adds double jump, an enemy, lives, and a timer
  challenges.md       extensions, easy to hard
  troubleshooting.md  what to check when something breaks
  credits.txt         who made what, and the licences
```

## Your first 10-minute success

1. **Unzip the pack first**, then open the `kaplay-platformer` folder in VS Code
   (`File > Open Folder`).
2. Double-click `index.html` to open it in a browser. Click the game once so it
   receives your key presses.
3. Move with ← → (or A D), jump with ↑, W, or Space. Collect all six coins.
4. In `game.js`, change `JUMP_FORCE` from `640` to `900`. Save, refresh, and jump.
   Then put it back. You just tuned a game.

## How KAPLAY thinks: objects made of components

Everything in the game is made with `add([...])`, and the list inside is the
object's **components**: what it is and what it can do.

```js
add([
  rect(28, 34),   // what it looks like
  pos(60, 360),   // where it is
  area(),         // it can touch things
  body(),         // gravity and platforms affect it
  "player",       // a tag, so other code can find it
]);
```

Remove `body()` from the player and it floats. Add `body({ isStatic: true })` to
something and it becomes a solid platform. Most of KAPLAY is choosing components.

## Guided checkpoints

1. **Level:** Add a seventh platform to `PLATFORMS` and a coin above it. Make sure
   you can still reach it.
2. **Input:** Find `onKeyDown` and `onKeyPress`. Explain why movement uses one and
   jumping uses the other. (Hint: try swapping them.)
3. **Collision:** Find `player.onCollide("coin", ...)`. Add a second tag, such as a
   `"gem"` worth 5 points.
4. **Scenes:** Find `scene("win", ...)` and `go("win")`. Add a `"title"` scene that
   starts the game when Space is pressed.

Open `finished-example/index.html` only after trying these. Every change there is
marked `NEW:` so you can see exactly what was added.

## Running from a local server (optional)

Opening `index.html` directly works for this pack. If you later add image or sound
files with `loadSprite()` or `loadSound()`, the browser will block them from a
double-clicked file. Then use the VS Code **Live Preview** or **Live Server**
extension to open the page instead.

## Learn more

The KAPLAY docs and examples: https://kaplayjs.com/ (needs internet). This pack
uses version 3001, so pick the v3001 docs.

## Make it a real project

Game Jam Week turns this starter into a finished game in five days: a one-page design document, a scope check, a day-by-day sprint, playtesting, and a showcase demo to the class. Pick KAPLAY as your tool in its design document builder.

**Lesson:** [Game Jam Week](https://mrscandrett.github.io/lessons/computer-science/graphics-and-games/game-jam-week.html)
