# Repo guide

Static site for the STEAM Lab / Microschool showcase, published straight from
`main` via GitHub Pages.

## The one rule that matters: `apps/` is generated output

`apps/<slug>/` is **build output, not source**. `build-showcase.js` regenerates it
from `student-projects/`, and the first thing it does for every project is:

```js
await fs.rm(outputDir, { recursive: true, force: true });   // build-showcase.js
```

It deletes the whole `apps/<slug>/` directory, then rebuilds it from the student
source. It also removes app dirs whose slug left the manifest, and wipes the dir
outright if a project fails to build.

**Any edit made directly in `apps/` is destroyed by the next `npm run build`.**
That is the cause of updated projects "reverting to their original" — the work was
never in the source tree, so the rebuild had nothing to rebuild it from.

### So: edit `student-projects/<Student>/<project>/`, then rebuild

`apps/` should only ever change as the *result* of a build. A commit that touches
`apps/<slug>/` with no matching `student-projects/` change is a bug — the work is
one build away from being erased.

Quick audit of any commit:

```bash
git show --name-only --format= <sha> | grep '^student-projects/' | head
```

Empty output plus `apps/` changes means the source was never updated.

## Building

`npm run build` rebuilds every project and rewrites `apps/manifest.json`. To
rebuild a single app instead, run the same pipeline `processProject()` uses —
esbuild bundle+minify to `app.min.js`, `cleancss -O2` to `style.min.css`, verbatim
copies of `script.js`/`style.css` for secondary pages, then `html-minifier-terser`
on the entry HTML with `style.css`→`style.min.css` and `script.js`→`app.min.js`
rewritten. Confirm a targeted build matches the real pipeline by checking that
`apps/<slug>/index.html` comes out byte-identical when nothing in the source HTML
changed.

Project metadata (display name, student, tags, thumbnail) comes from
`data/manifest-overrides.json`, keyed by slug — not from the app itself.

### Web Studio submissions → student-projects → apps

Students build in `lessons/web-design/web-studio.html` (Draw / Blocks / Code on one
project, saved in their browser) and hand in a `<name>-<title>.webstudio.json` file.
Import it as the teacher, never by hand-copying into `apps/`:

- OSeditor (`ADMIN_PASS=… node serve-local.js`): **Import submission** previews it,
  writes `student-projects/<Name>/<slug>/` + its `manifest-overrides.json` entry, and
  opens it for review; **Publish to class site** runs `build-showcase.js --only=<slug>`.
- Or `node scripts/import-studio-submission.mjs <file> [--dry-run] [--replace] [--build]`.

Both use `lib/studio-submission.mjs`, which re-validates with the studio's own
`validateProject()`. Read the student's `script.js` before publishing; it runs on
the class site. Studio code lives in `assets/js/web-studio/` (`draw-model.mjs` is the
pure grid model and code generator); tests: `node --test tests/web-studio.test.mjs`
and `node tests/web-studio-browser.mjs` against a running `serve-local.js`.

## Checks

- `npm run check:integrity` — local references and asset signatures
- `npm run check:themes` — theme contrast
- `npm run a11y` — pa11y-ci

## Lesson rule: every photo must open in the lightbox

Lessons are presented to a class, so any photo, portrait, or figure in a lesson must be
click-to-enlarge (centered on screen, large caption) so the class can focus on one image
and discuss it. This applies to every new lesson and to any lesson you touch.

- Add `<script src="../assets/js/photo-lightbox.js"></script>` (adjust the path to the lesson's depth).
- Mark each figure `<figure data-zoomable>` with an `<img>` and a `<figcaption>`. Write captions
  that carry the teaching point, since the lightbox shows the caption at large size.
- Optional: `data-full="URL"` for a higher-resolution image, and `data-lightbox-group="name"`
  so the arrow keys (and the on-screen buttons) step through a set. Figures added by JS work too.
- Always show credit and license for outside images. See `lessons/chemistry/periodic-table.html`
  (element gallery) for a worked example.

## Lesson rule: every video plays in the ClassroomOS player

No raw YouTube/Vimeo `<iframe>`s in lessons. Videos go through the in-house player
(the video counterpart of the reader), which keeps students on the site:

- Add `<script src="../assets/js/video-embed.js"></script>` (adjust the path to the lesson's depth).
- Put `<figure data-video="slug-or-link">` where the video goes. `slug` is a key in
  `data/video-library.json`; a link is any source `assets/js/video-sources.mjs` allows
  (YouTube, Vimeo, Wikimedia Commons / NASA / Internet Archive files, `assets/videos/…`).
  Optional: `data-title`, `data-start`/`data-end` (a clip), `data-captions` (local .vtt),
  child `<p data-pause="1:30">question</p>` (stops the video and asks) and
  `<p data-chapter="2:00">label</p>`, plus a `<figcaption>`.
- Easiest path: open `watch.html?src=<link>` (or `?v=<slug>`), press **Put in a lesson**,
  mark the clip/pauses/chapters while watching, and copy the snippet.
- `npm run check:videos` validates the catalog and every embed (and flags raw iframes);
  `-- --online` also confirms each video still exists and allows embedding.

How it stays safe: nothing loads from a provider until Play; no provider JS runs in our
origin (embeds are driven over postMessage); embeds are sandboxed without popups or
top-navigation; the player is pinned to the chosen video and removes the frame at the
end instead of showing the provider's end screen. Never draw over a provider's player —
YouTube's embed terms forbid overlays; our controls sit below the frame. To allow a new
host, add a narrow rule to `video-sources.mjs` and to `watch.html`'s CSP `media-src`.

## Lesson rule: lessons print cleanly on letter paper

Teachers print lessons as handouts (the Print / Save PDF pill). Shared pieces do most of
the work: `lesson-print.css` (page setup, hides site chrome, forces a white page) and the
`beforeprint` pass in `lesson-print-button.js`, which estimates each box's printed height
and marks it (`data-print-keep` small cards stay whole, `data-print-split` page-sized
boxes may flow, `data-print-with-next` eyebrows stay with their heading), repaints dark
text boxes as light ones, darkens light text, reveals scroll fade-ins, unrolls sideways
flex scrollers, and prints in the Day theme. When writing lesson CSS:

- Nothing may be wider than the paper (~694px). A fixed `min-width`, a wide grid, or a
  bare `1fr` track next to wide content makes Chrome shrink *every* page (down to 67%).
  Use `minmax(0, 1fr)`, and give wide widgets a print rule (`zoom`, fewer columns).
- Don't set `color-scheme: dark` without the print reset — it paints the page margins
  black. `lesson-print.css` resets it on `:root, body, main, .ll-*`; wrappers elsewhere
  need their own.
- Don't put `break-inside: avoid` on whole sections; the planner decides by size.
- Check with `npm run audit:print-layout -- --lesson=<path-fragment> --keep-pdf`
  (PDFs + report in `tmp/print-layout-audit/`). It flags ink-heavy pages, blank and
  half-empty pages, stranded headings, one-line paragraph splits, and shrunk printouts.

## Visitor memory (My Stuff)

`assets/js/visitor-memory.js` gives returning visitors a profile with no account and
no consent prompt, because nothing leaves the browser: one localStorage key
(`classroomos:memory:v1`) plus the reader's existing `reader:pos:*` keys, which it reads
but never rewrites. nav-mobile.js, lesson-print-button.js and ui.js load it; it shows up
as the **My Stuff** settings tab, a heart | save | print pill on every lesson, hearts on
showcase cards, and a "welcome back" strip on the homepage.

- Hearts are declarative: `<button data-memory-like="project|lesson" data-memory-id …>`.
  `<a data-memory-play …>` adds to "Recently played".
- **Save answers** snapshots a lesson's textareas, text/number inputs, selects and
  checkboxes inside `<main>`, then autosaves as the student types. Restoring is explicit,
  so opening a lesson never overwrites saved work. Put `data-memory-ignore` on any
  container whose inputs are sim controls rather than answers.
- **Profile pictures** are curated lesson images listed in `data/avatars.json` (credit,
  license, source, lesson). To add one, append an entry and run `npm run build:avatars`.
  The entry's `src` must be an image its `lesson` actually uses; `npm run check:avatars`
  (part of `npm run quality`) enforces that, so credits stay tied to real usage.

## VR headsets (VR mode + VR Lab)

`assets/js/vr-mode.js` (+ `assets/css/vr-mode.css`) makes the flat site usable from a
headset browser. It turns on automatically in Quest/Pico/Wolvic/Vision Pro browsers
(preference `classroomos-vr-mode` = auto|on|off, Settings → Access, or `?vr=on`): ~48px
targets, a hover ring for the laser, the animated background paused, and a 🥽 VR menu with
Full view (fullscreens the biggest on-screen sim's `.ll-sim`/`figure`, or `[data-vr-stage]`),
text size, and on-screen keys (arrows/Space/Enter, or `<body data-vr-keys="KeyW Space">`).
It's injected by nav-mobile.js, lesson-print-button.js and ui.js like visitor-memory.js;
pages without those load it with a plain `<script … vr-mode.js defer>`.
`lib/touch-controls.js` also shows the student-game pads in headsets (rebuild the slugs
in `data/touch-controls.json` after changing it).

Immersive pages live in `vr/` and are listed in `vr.html` from `data/xr-experiences.json`.
Build new ones on `assets/js/xr-kit.mjs` (Enter VR button with honest status, controller/
hand lasers, teleport floors via `userData.teleport`, 30° snap turn, canvas text panels,
drag-to-look desktop preview) and drive them with `renderer.setAnimationLoop` — headsets
pause `requestAnimationFrame` during a session. Comfort rule: teleport and snap turn only,
no smooth artificial motion. Keep a flat HTML version of the same content on the page.

## Bible reader

`bible.html` + `assets/js/bible-reader.mjs` is the Bible's own reader (the library's
"The Holy Bible" spine opens it; reader.html does not). Text is all 66 books in BSB, KJV
and ASV (all public domain), generated into `assets/data/bible/` by `npm run build:bible`
from a pinned source; don't hand-edit those files. Progress is per-browser
(`bible:progress:v1`) and mirrored to `reader:pos:bible.html` so library shelves and My
Stuff list it. The homepage verse of the day links in via `bible.html#/go/<reference>`;
the library has a "The Holy Bible" card under the collection cards.

Every lesson in `lessons/bible-studies/` loads `assets/js/bible-quicklink.js` (add it to new
Bible lessons, after lesson-print-button.js). It adds a 📖 Bible pill to the header (look up
a passage, continue reading, open the lesson's book) and links scripture references in the
lesson text ("Daniel 2:31–45", "1 Kings 18") to a passage peek with a link on to the reader.
Link to a passage from lesson JS with `<a data-bible-ref href="../../bible.html#/go/John 3:16">`
rather than to an outside Bible site. `data-bible-ref-skip` opts an element out.

## Shared sim helpers

New lesson sims should reach for these instead of hand-rolling canvas/Three/Matter
boilerplate (and instead of pulling Three.js from yet another CDN version — lessons
have accumulated r128, r134, and three different 0.16x pins alongside the vendored
copy):

- `<script src="../assets/js/sim-kit.js"></script>` — `SimKit.canvas2d(canvas, opts)`
  for DPR-aware canvas sizing/resize, `SimKit.loop(fn)` for a rAF loop that pauses
  when the tab is hidden, `SimKit.theme.colors()` / `SimKit.theme.onChange(cb)` for
  reading the site's `--bg`/`--text`/`--accent` CSS custom properties instead of
  branching on `dataset.theme` by hand.
- `assets/vendor/three-bundle.min.js` (rebuild with `npm run build:three`, source in
  `scripts/three-bundle-entry.js`) — the single pinned Three.js build (matches the
  `three` devDependency used by `scripts/build-breadboard-model.mjs`), plus
  `OrbitControls`/`OBJLoader`/`GLTFLoader`/`DRACOLoader`. Pair with
  `assets/js/sim-kit-three.mjs`'s `createScene(canvas, { THREE, ... })` for
  renderer/camera/resize setup. See `lessons/cad-camera-controls.html` for a worked
  example.
- `assets/vendor/matter-bundle.min.js` (rebuild with `npm run build:matter`, source
  in `scripts/matter-bundle-entry.js`) — a pinned Matter.js build (`Engine`,
  `Bodies`, `Body`, `Composite`, `World`) for sims that need real 2D rigid-body
  collision instead of independently-moving points. See `lessons/cymatics.html`'s
  sand-grain physics for a worked example.

- `<script src="../assets/js/arduino-art.js"></script>` — the one illustration engine for
  every Arduino drawn on the site (UNO R3, UNO R4 WiFi, UNO Q, Nano Every). Drop in
  `<span data-arduino-art="uno-r3"></span>`, or call `ArduinoArt.create(model)` to get an
  SVG `<g>` plus real pin/part coordinates (`pins['13']`, `pins['GND#2']`, `anchors.usb`)
  for wiring, hotspots and LED states. Don't hand-draw a new board; add a model there.
  Schematic symbols ("U1 Arduino Uno" blocks) stay as schematics.

Existing lessons on other Three.js versions or hand-rolled canvas loops don't need to
be migrated proactively — migrate opportunistically when touching that lesson anyway.

## Engine-neutral game lessons: Tool Rosetta + Rosetta 2D

Game and 3D lessons teach ideas, not brands. Don't write engine-specific comparison
tables or "do this in Godot/Blender" steps by hand:

- **Tool Rosetta** (`assets/js/tool-rosetta.js`, data `data/tool-rosetta.json`): drop
  `<div data-rosetta="loop.frame cam.follow"></div>` in a lesson to show one idea across
  every engine (`game` family) or 3D app (`model` family). Students' column choice persists
  site-wide. Add a new idea as a concept with a cell for *every* tool in its family;
  `npm run test:rosetta` fails on empty cells or unknown ids in lessons. Reference page:
  `lessons/computer-science/graphics-and-games/tool-rosetta.html`.
- **Rosetta 2D** (`assets/js/rosetta2d/rosetta2d.mjs`): the in-house engine, one
  dependency-free ES module (~10 KB gzipped). Node tree with `ready` / `update(dt)` /
  `fixedUpdate(dt)` (fixed 60 Hz), `Body` (moves + collides), `Area` (enter/exit),
  `TileMap` (`fromRows`, Tiled JSON in/out), `Sprite`, `Shape`, `Text`, `Timer`, camera,
  named input actions, layers/masks. Conventions: pixels, y down, x/y = centre, dt in
  seconds. Scenes serialise with `toJSON()`/`fromJSON()` (custom classes need
  `static type` + `register()`); that JSON is what future engine exporters translate, so
  keep new features serialisable. Its `r2d` Rosetta column must stay in sync with the
  real API. Examples in `assets/js/rosetta2d/examples/`; page
  `lessons/computer-science/graphics-and-games/rosetta-2d.html`; tests
  `tests/rosetta2d.test.mjs` (headless: `new Game()` + `game.step(dt)`). Keyboard input
  goes to `Game.active` (last clicked/focused/started) so several games can share a page.

## ELEGOO robot car (Robot Car Pilot lesson)

`lessons/engineering/robotics/robot-car-pilot.html` drives the class ELEGOO Smart Robot Car
V4.0. `assets/js/elegoo-car.js` holds the JSON protocol (taken from ELEGOO's firmware), the
Bluetooth/Wi-Fi/USB/simulator links, and `SimCar`, which obeys the same commands. Browsers
can't open the car's raw TCP port, so Wi-Fi goes through `npm run robot-car`
(`scripts/robot-car-bridge.mjs`, zero dependencies, `--mock` for no car). Tests:
`npm run test:robot-car`.

## Verifying game/app changes

Dev server: `node serve-local.js`. Playwright is a devDependency but only the full
Chromium build is cached, not the headless shell or Puppeteer's own Chrome.
`lib/find-chromium.mjs` finds the newest `chromium-NNNN` build in the Playwright cache
(`$PLAYWRIGHT_BROWSERS_PATH` or `~/.cache/ms-playwright`), so `npm run check:new-games`
and `npm run a11y` work without pinning a build number; override with
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` / `PUPPETEER_EXECUTABLE_PATH`. Ad-hoc Playwright
scripts should launch with `executablePath: findChromium()` the same way.
Driving the real page is the only reliable check for canvas games; a blank canvas
and a game with no render loop look identical to static inspection.
