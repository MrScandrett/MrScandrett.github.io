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

## Checks

- `npm run check:integrity` — local references and asset signatures
- `npm run check:themes` — theme contrast
- `npm run a11y` — pa11y-ci

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

Existing lessons on other Three.js versions or hand-rolled canvas loops don't need to
be migrated proactively — migrate opportunistically when touching that lesson anyway.

## Verifying game/app changes

Dev server: `node serve-local.js`. Playwright is a devDependency but only the full
Chromium build is cached, not the headless shell — launch with
`executablePath: "~/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome"`.
Driving the real page is the only reliable check for canvas games; a blank canvas
and a game with no render loop look identical to static inspection.
