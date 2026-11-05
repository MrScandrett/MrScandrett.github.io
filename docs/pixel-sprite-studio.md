# Pixel sprite studio

The creator on `lessons/2d-design/2d-game-dev/pixel-art-sprites.html` uses
`assets/js/lessons/sprite-studio/model.mjs` for project validation, example poses,
transforms, timing and metadata. `studio.mjs` owns the accessible DOM drawing grid,
preview, timeline, local saving, import/export and pathway transfer controls.

The application is first in `<main>`, uses the shared fullscreen control, and
is registered in `data/creation-app-pages.json`. Original expression artwork is
SVG so its lesson figure can use the shared photo lightbox.

## Editable format

`classroomos-sprite-studio`, version 1, stores 16 or 32 pixel square frames, a
16-slot palette (slot zero is transparent), project name/description, camera
(`side` or `top`), and clips keyed by `action-direction`. Side projects have left
and right views; top-down projects also have up and down. Each clip contains
`loop` and 1–24 frames of `{pixels, ms, label}`. Pixels are row-major hexadecimal
palette indices. Durations are integer milliseconds from 50 to 2000. Actions
are enumerated in the model. Import validates every required clip and rebuilds
an explicit object; arbitrary extra fields are discarded. JSON is never executed.

Projects save to `classroomos-sprite-studio-v1` in localStorage. Failed storage
writes leave the editor usable in memory and display a backup instruction.
Undo and redo retain up to 40 project snapshots, including project replacement.
The PNG frame importer checks the PNG header and exact dimensions before decode,
then maps colours into the project palette. Inputs are limited to 4 MB.

## Files and game integration

A clip PNG is one horizontal strip at native resolution. Its JSON records
rectangles, duration, loop behavior, facing and pose descriptions. The ZIP contains
every strip, `animations.json`, editable `project.sprite.json` and a README.
It requires the existing local `assets/vendor/jszip.min.js` library. No upload,
account, API or build is needed. Character descriptions can include outside-art
credits. The 32-pixel examples are doubled 16-pixel drawings, ready for students
to add original detail.

Studio art is separate from the shared Pixel Courier store, whose schema accepts
only its original animations and up to eight 16-pixel frames. The explicit transfer
buttons map colours to the destination palette. Importing the pathway courier
changes only the selected studio frame. Copying back changes only the courier's
first idle frame, preserving all other pathway art and animations.

The preview begins paused and has explicit play, pause and step controls. A
one-shot holds its last pose. No scripted flashing is used. Game movement,
health changes, hitboxes, physics and retry behavior belong to the receiving game.

## Verification

```sh
node --test tests/sprite-studio.test.mjs
node serve-local.js
# In a second terminal:
node scripts/check-sprite-studio.mjs
npm run check:creation-apps
npm run a11y:page -- pixel-art-sprites
```

The browser check uses the repository's cached Chromium finder and covers keyboard
and pointer drawing, file round-trips, native PNG dimensions, ZIP timing data,
four directions, mobile layouts and fullscreen. Optional `SPRITE_STUDIO_URL`
selects another local preview server. It writes preview screenshots to `/tmp`.

## Make → test → revise → package

`animation-states.html` now hosts the DIY Sprite Asset Test Bench. It reads the
same validated studio project using `project-io.mjs`; it supports the full 16/32
pixel and side/top-down format, rather than copying one frame into Pixel Courier.
Importing a project on the bench explicitly updates that shared studio save.
The older courier games retain their original five-state art store.

`engine.mjs` implements movement, collision, jump phases, state priority, action
interruptions and frame-triggered effects. `stage.mjs` draws the scene; `controls.mjs`
provides canvas-scoped keyboard input and labelled button controls. `bench.mjs`
connects these to coverage, inspection, revision notes and exports. The scene starts
paused, supports 1/30-second steps and clears held inputs on blur/backgrounding.

Jump frames 1–6 are prepare, rise, apex, descent, landing and recovery. The engine
uses physical height/velocity and ground contact to pick these phases; it does not
play a full timed jump strip while airborne. Short clips reuse their last frame;
extra phases require adapting the small receiving game. Ledge falls use the fall
clip. Top-down position on the ground is separate from jump height.

Sword, potion and hurt are one-shot actions. Their artwork's preview-loop setting
does not make game actions repeat. The chosen sword frame opens one active window,
with at most one practice-target hit per swing. The chosen potion frame restores
health once. Damage interrupts actions; defeat and victory hold until retry. The
movement-lock option controls moving during an action. Two intentional bug options
show the difference between desired input and actual motion, and between a running
animation clock and one that restarts every step.

`package.mjs` builds a playable ZIP containing the complete art pack, a report,
rules and an editable classic-script browser demo. It assembles the trusted local
model/engine/stage/controls sources, avoiding module/file-URL restrictions. Art data
is serialized separately and embedded safely in `game.js`. The bundle uses only
local `sim-kit.js` and `game.js`: unzip and open `index.html`, including offline.
The demo is an asset test scene, not the full Pixel Courier platformer. The editable
JSON art master and the demo's embedded artwork are separate files; after revising
art, re-export the kit or update the demo's embedded data.

Studio links can target `?action=sword&facing=left`; parameters are checked against
the project's available actions/directions. The bench's Edit this clip and coverage
links use these routes, creating a precise test → edit → reload cycle.

Additional checks:

```sh
node --test tests/sprite-state-engine.test.mjs
node scripts/check-sprite-state-bench.mjs
npm run a11y:page -- animation-states
```

`SPRITE_BENCH_URL` can select another preview port. Browser checks include the
shared-project handoff, blank and invalid imports, physical gameplay, action
interruptions, scene/report downloads, and execution of the exported ZIP with
`file://` URLs and HTTP/HTTPS traffic blocked.
