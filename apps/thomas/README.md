# Frostline: Citadel Zero

Survive as many waves of snowmen as you can. Between waves, spend what you
earned in the workshop, then brace for a bigger wave.

## Controls

| Key | Action |
| --- | --- |
| `W` `A` `S` `D` | Move |
| Mouse | Look |
| Left click | Throw |
| Right click (hold) | Shield |
| `SPACE` | Jump |
| `SHIFT` | Slide |
| `V` | Dash |
| `E` (hold) | Grapple |
| `F` | Flip |
| `B` | Workshop |
| `M` | Mute |

The lobby also has portals to Lava Rising Parkour and the recordings library.

## How a run works

1. A short "get ready", then wave 1 arrives.
2. Clear every snowman in the wave to earn a clear bonus.
3. You get about nine seconds to spend score in the workshop.
4. The next wave is bigger, tougher and faster. Repeat until you go down.

Your best run is saved in the browser and shown on the summary screen.

## Directory Scaffold

```txt
index.html
game.js
src/
  main.js
  app/
    GameApp.js         app bootstrap and the main loop
    config.js          player and combat tuning values
    gameRegistry.js    which games the lobby offers
  features/
    world/             terrain, vegetation, particles, mesh merging
    structures/        towers, ladders, bridges
    combat/            snowmen, projectiles, the wave ladder
    lobby/  lava/      the other two worlds
  ui/                  hud, minimap, workshop, run summary, feedback
  audio/               sfx.js — synthesised, no audio files
  diagnostics/
    fpsMeter.js
docs/
  architecture.md
```

## Ideas to build on

The pieces are deliberately separated so each of these is a small change:

- **Reshape the difficulty** — edit `WAVE_TABLE` in
  `src/features/combat/waveSystem.js`. Try a boss wave with one enormous, slow
  snowman, or a rush wave of many weak fast ones.
- **New enemy types** — `createBot()` already takes a stats object. Add fields
  to a wave row (a jump height, a shield, a different colour) and read them there.
- **New gear** — add an entry to `UPGRADES` in `src/ui/shopUi.js` and handle its
  id in the upgrade callback in `GameApp.js`.
- **A third game mode** — add it to `gameRegistry.js` and the lobby grows a
  portal for it automatically.
- **New sounds** — add to the `sfx` object in `src/audio/sfx.js`; it's all
  oscillators, so no files to manage.

## Notes
- `game.js` is a compatibility shim that forwards to the modular app entry.
- Main game logic lives in `src/app/GameApp.js` and delegates feature concerns
  to modules. See `docs/architecture.md` for the scene-graph and camera-rig
  rules worth knowing before adding to the arena.
