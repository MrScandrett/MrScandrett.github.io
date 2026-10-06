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
