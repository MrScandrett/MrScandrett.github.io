# Oddkin: Wild Worlds

An original creature-evolution game inspired by playful ecosystem sandbox games.
Build a creature, land on a world, and evolve five times to become its apex species.

## Play

Open `index.html` in a browser (it runs straight from the prebuilt `game.bundle.js`),
or serve the folder with any static server, e.g. `python3 -m http.server 8080`.

1. **Pick a world.** Each one plays differently:
   - **Verdara**: gentle and fruit-rich.
   - **Emberune**: lava pools hurt, and predators are common.
   - **Lumora**: endless twilight with skittish glowing life.
   - **Aridia**: hunger drains fast, so stay near the oasis.
2. **Build your Oddkin** in the Birth Pool within the gene budget. Diet decides what you can eat. Body, dentition, legs, and limbs set your speed, social, attack, and health stats.
3. **Explore.** Every world has six species, each with a temperament:
   - *Curious*: wanders over to meet you.
   - *Timid*: bolts when you get close.
   - *Territorial*: defends its home ground.
   - *Predator*: hunts you, and harder at night.
4. **Earn evolution bones** by collecting glowing bones, befriending creatures, or defeating them.
5. **Evolve.** Choose one of three adaptations. Each one visibly changes your body. You also gain 10 genes to reshape yourself in the Birth Pool. Five evolutions wins the world.

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move / look | WASD or arrows · drag mouse · wheel to zoom | Left stick · drag screen |
| Sprint | Shift | ⇧ toggle |
| Collect / eat | E | E |
| Harmony call (befriend) | F: press when the pulse is in the green, 3 hits before 2 misses | ♫ |
| Bite | Space | ⚔ |
| Evolve | V | Evolve button |
| Field journal / pause | Esc | Ⅱ |
| Mute | M | ♪ |

The nest is a safe zone: predators won't follow you in, and you heal while resting there.
Progress saves automatically in the browser; **Continue** picks up where you left off.

## Developing

`game.js` is the source and `game.bundle.js` is built from it (Three.js is bundled in).
After editing `game.js`, rebuild from the repo root:

```bash
npx esbuild student-projects/Johnathan/oddkin-wild-worlds/game.js --bundle --format=iife --minify --target=es2020 \
  --outfile=student-projects/Johnathan/oddkin-wild-worlds/game.bundle.js
```

Open the game with `#debug` on the URL to expose `window.oddkin` for testing.

## Open-source engine

The 3D world uses Three.js r185, distributed under the MIT license. A copy of the license is included in `vendor/THREE-LICENSE.txt`.
