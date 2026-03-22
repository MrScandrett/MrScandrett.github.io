# Frostline: Citadel Zero

## Directory Scaffold

```txt
index.html
game.js
src/
  main.js
  app/
    GameApp.js
    config.js
  features/
    world/
      terrainSystem.js
    structures/
      towerSystem.js
  ui/
    hud.js
    minimap.js
  diagnostics/
    fpsMeter.js
docs/
  architecture.md
```

## Notes
- `game.js` is a compatibility shim that forwards to the modular app entry.
- Main game logic now lives in `src/app/GameApp.js` and delegates feature concerns to modules.
