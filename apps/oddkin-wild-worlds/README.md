# Oddkin: Wild Worlds

A self-contained, original creature-evolution game inspired by playful ecosystem sandbox games.

## Play

From this folder, start a local server and open the address it prints. For example:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`. A local server is required because the Three.js renderer uses standard JavaScript modules.

1. Pick one of four worlds.
2. Build a creature within the 100-point gene budget.
3. Explore with camera-relative **WASD**, sprint with **Shift**, drag the mouse to look around, and use the mouse wheel to zoom.
4. Press **E** to collect bones, **F** to befriend nearby creatures, or **Space** to attack.
5. Gather enough bones to unlock a permanent evolution, then continue into harder evolution cycles.

The game saves no data; **New World** starts a fresh expedition. Press **Escape** at any time during play to pause or resume.

## Open-source engine

The 3D world uses Three.js r185, distributed under the MIT license. A copy of the license is included in `vendor/THREE-LICENSE.txt`.
