# Architecture

## Entry Flow
- `index.html` loads `src/main.js`.
- `src/main.js` calls `startGame()` from `src/app/GameApp.js`.

## Module Layout
- `src/app/`: app bootstrap and shared config.
- `src/features/world/`: terrain/world generation.
- `src/features/structures/`: towers, ladders, bridges, structure collisions.
- `src/ui/`: HUD and minimap UI modules.
- `src/diagnostics/`: runtime diagnostics (FPS meter).

## Runtime Dependencies
- `GameApp` composes world + structures + UI + diagnostics modules and coordinates input, bots, projectiles, and loop timing.
