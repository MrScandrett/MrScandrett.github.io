# Pinball Construction Set: what's next

Foundation shipped: `assets/js/pinball/pinball-core.mjs` (pure physics + table format),
`pinball-studio.mjs` (editor, renderer, input, sound), `assets/css/pinball-studio.css`,
`lessons/computer-science/graphics-and-games/pinball-construction-set.html`,
`tests/pinball-core.test.mjs`.

Not yet run on this lesson: `npm run a11y` (canvas-only editor, expect baseline work),
`build:dist`, `audit:perf -- --check`.

## In order

1. **Tune the feel by playing it.** Gravity (1150), bumper kick (560), flipper speed (24 rad/s),
   restitution per part. Constants sit at the top of the core. Re-run the tests after.
2. **More parts.** Spinner, kicker/saucer, drop-target banks, magnet, one-way gate, ball-save,
   multiball. Each is a `PART_TYPES` entry + a collision case in `stepOnce` + a draw case in
   the studio + a validate clamp. The "every part type builds and simulates" test covers new ones.
3. **Goals in Build.** Wire parts to objectives ("light all three targets", "reach 10,000") so a
   table has a win condition; show it in the HUD.
4. **Table gallery.** Student tables as `.pinball.json` in the showcase, loaded by link
   (`?table=<path>`), validated through `validateTable`.
5. **Keyboard-accessible editing.** Arrow-key nudge, Tab through parts, announce selection
   (the canvas is the a11y risk). Then `npm run a11y:update-baseline` and confirm it only shrinks.
6. **Tests.** A `tests/browser/pinball.test.mjs` (place a part, play, score) and a
   `tests/pinball-studio` pass for the pure bits of the editor.
7. **Polish.** Per-theme cabinet skin, backglass art, ball trail on lane launch, plunger sound
   by charge, a "tilt" nudge, high-score table per table name.
8. **Hand-offs.** Open a table in Workbench as a 3D playfield; add a Tool Rosetta concept
   (`collide.substep`) once the core is stable.

## Gotchas
- Never let a ball move more than its radius per substep (SUBSTEP 1/480, MAX_SPEED 2200).
- Frame walls are fixed in code (`FRAME`), not part of the saved table.
- `events` are drained by the renderer each frame; headless callers must clear them.
