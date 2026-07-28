# Architecture

## Entry Flow
- `index.html` loads `src/main.js`.
- `src/main.js` calls `startGame()` from `src/app/GameApp.js`.

## Module Layout
- `src/app/`: app bootstrap (`GameApp.js`), shared tuning values (`config.js`),
  and the list of games the lobby offers (`gameRegistry.js`).
- `src/features/world/`: terrain, vegetation, particles, and `meshMerge.js`.
- `src/features/structures/`: towers, ladders, bridges, structure collisions.
- `src/features/combat/`: snowmen and projectiles (`combatSystem.js`) and the
  wave ladder (`waveSystem.js`).
- `src/features/lobby/`, `src/features/lava/`: the other two worlds.
- `src/ui/`: HUD, minimap, workshop, run summary, and screen feedback.
- `src/audio/`: `sfx.js`, a small synthesiser — there are no audio files.
- `src/diagnostics/`: runtime diagnostics (FPS meter).

## Scene Graph
Each world owns one group, and only the active one is ever visible:

- `arenaGroup` — terrain, scenery, towers, starfield, bots, projectiles
- the lobby world's group — lobby and library rooms
- the lava world's group — parkour platforms

`setActiveWorld(name)` in `GameApp.js` is the single switch. Anything added to
the arena must go on `arenaGroup`, not on `scene`, or it will render in the
lobby too.

## The Camera Rig
`PointerLockControls` drives `aim` (a plain `Object3D`), and the real camera is
a child of it. That separation matters: `aim` is where the player is and where
their shots go, while the camera is free to tumble for the flip and to jitter
for screen shake without ever disturbing the aim.

## Performance Notes
- Static scenery (trees, grass, rocks) is generated as small groups and then
  merged into one mesh per material by `meshMerge.js`. Keep new scenery on that
  path — a few hundred individual meshes is what dragged the lobby to ~23fps.
- The renderer runs at the device pixel ratio, capped at 2.

## Where to Tune the Game
- **Difficulty and pacing** — `WAVE_TABLE` in `src/features/combat/waveSystem.js`.
  Each row is one wave: how many snowmen, how tough, how fast, how often they
  throw. Rows past the end of the table are generated automatically.
- **Weapons and gear** — `WEAPONS` and `UPGRADES` in `src/ui/shopUi.js`.
- **Player movement** — `PLAYER` in `src/app/config.js`, plus `JUMP_VELOCITY`
  and `DASH_SPEED` in `GameApp.js`.
- **Sounds** — the `sfx` object at the bottom of `src/audio/sfx.js`.

## Runtime Dependencies
- `GameApp` composes world + structures + combat + UI + audio modules and
  coordinates input, the wave loop, projectiles, and loop timing.
