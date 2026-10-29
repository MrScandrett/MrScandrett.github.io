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

## Lesson folders and moving a lesson

`lessons/<module>/` holds each module; big modules split into topic subfolders, and
person-centred lessons (biographies, "Dalton and the Atomic Theory") go in that module's
`pioneers/`. 3D design is one tree: `lessons/3d-design/3d-design.html` (curriculum home),
`cad-and-printing/`, `blender/`, `game-asset-studio/`. Technical Elements splits into
`audio-engineering/`, `stagecraft/`, `camera/`, `pioneers/`; Music into `pioneers/`,
`instruments/`, `theory/`.

Saved links, bookmarks and students' saved work point at old URLs, so moving a lesson means:
- `git mv` it, then fix every reference: relative links in pages (they change with depth),
  `lessons/...` strings in `data/*.json`, `assets/js`, `scripts/`, `tests/`, and maps keyed
  by path under `lessons/` (e.g. `assets/js/lesson-related.js`). `npm run check:integrity`
  catches broken page links, not JS strings, so grep the old path too.
- Add old → new to `assets/js/lesson-moves.js` and bump its `version` together with
  `MOVES_VERSION` in `visitor-memory.js`. `404.html` forwards old links with that map, and
  visitor-memory re-keys history, favorites and saved answers once per version.

## Performance notes

- Only `dist/` (from `npm run build:dist`, what Pages deploys) is optimized. It minifies CSS/JS/MJS/HTML/JSON
  and inlines the `@import`s of `classroom-fonts.css` and `components/lesson-shell.css` into the CSS that
  imports them. Source CSS keeps the `@import`s, so `serve-local.js` still shows the extra round trip;
  judge load speed against a served `dist/`, not the dev server. It also: gives PNG/JPGs over 150 KB a WebP
  (≤1920 px) and points `<img src>`/`data-full` at it; lazy-loads every `<img>` after a page's first two;
  splits `score-library.json` into `data/scores/<id>.json` (serve-local.js serves the same URLs);
  meshopt-compresses the models in `MESHOPT_MODELS` (only add one whose viewer has a meshopt decoder);
  and writes `sw.js`, a content-hashed asset cache for repeat visits (`scripts/sw-template.js`; production
  only, `?sw=on` on localhost).
- `npm run audit:perf` serves `dist/` with a 4× CPU throttle and reports LCP, blocking time, bytes, and
  main-thread/rAF cost before and after scrolling every sim off-screen. `--all` ranks every lesson;
  `--check` (run on deploy) fails on JS/request growth against `docs/perf-baseline.json` and warns about
  sims still animating off-screen (`--strict-frames` fails on those too; use it locally, since frame counts
  depend on the machine). `--save-baseline` after a deliberate change.
- **Sims pause when nobody can see them.** Drive animation with `SimKit.loop(fn, { el: SimKit.stage(canvas) })`,
  or in a hand-rolled loop write `SimKit.frame(canvas, draw)` where it said `requestAnimationFrame(draw)`
  (`SimKit.frame.cancel(canvas, id)` for `cancelAnimationFrame`; `SimKit.raf(el)` gives a reusable gate).
  Frames are held while the element is >200px off-screen, in a hidden panel, or in a hidden tab, and the
  paused time is skipped so `dt` stays one frame on resume. Point `el` at what the loop draws (the canvas,
  SVG or Three.js `renderer.domElement`); `SimKit.stage(a, b)` lists several and runs while any shows. It
  widens each to its own `<figure>` but never to `.ll-sim`/`<section>`/`<main>`, which never leave the
  screen. Make sure the page loads `sim-kit.js`. Rosetta 2D games and `classroom-animations.js` pause on
  their own. Tests: `tests/sim-kit-raf.test.mjs`, `tests/classroom-animations.test.mjs`.
- The animated site background (`canvas-bg.js`) draws t-driven looks at 30 fps and freezes after 60 s
  without input; keep new background looks cheap (batch canvas paths, no per-item `stroke()`).
- Fonts are self-hosted (`assets/fonts/`). Don't add Google Fonts / CDN font `@import`s to shared CSS.
- Homepage JS lives in `assets/js/pages/index-*.js` (deferred), not inline. The featured video is picked
  from `data/video-library.json` and plays in `watch.html`; don't point it at `assets/videos/*.mp4` files
  that aren't committed.
- Big model files: give `<model-viewer>` `loading="lazy"`.

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
- For a set of photos (real equipment, archival pictures), use the shared gallery:
  `assets/css/components/photo-gallery.css` (`.pg-grid` of `figure.pg-card`, credit in `.pg-credit`
  with `data-no-glossary`; `.pg-contain` for plans and book pages). Pages with their own palette set
  the `--pg-*` properties. Self-host images under `assets/images/lessons/<lesson>/`.
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

## Lesson rule: sims fill the screen for the projector

`assets/js/sim-present.js` (loaded by lesson-print-button.js on any page with a canvas, svg or
`<model-viewer>`) puts a ⛶ pill on each sim block. Pressing it fills the screen with that sim: in
the lesson layout the whole `.ll-stage` goes full screen (so the side panel's controls come along)
with everything else in `.ll-sim` hidden; elsewhere the block's parent does, with the block's siblings
hidden. The block is then narrowed toward the screen's shape and CSS-`zoom`ed up to fit (≤ 2.25×), so
labels are readable from the back of the room. iPhone gets a fixed overlay instead.

- The block is the sim's `<figure>` / `[data-present]` / `[data-vr-stage]`, else the biggest wrapper
  under one screen tall. Put `data-present` on the right wrapper when the guess is wrong, and
  `data-present="off"` to opt out. Blocks with their own full-screen button are skipped.
- Read pointer positions with `getBoundingClientRect()` + `clientX` (zoom-safe). `offsetX/Y` are
  corrected while presenting, but nothing else is.

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

## Lesson rule: timelines go through the Timeline engine

Don't hand-build another timeline (lessons accumulated ~40 one-off `*-timeline` styles).
`assets/js/timeline.js` + `assets/css/components/timeline.css` is the shared engine:

- Write a plain list and mark it: `<ol data-timeline data-timeline-title="…">` with
  `<li data-when="1906">…</li>`. The date can also come from a `<time>` or a short leading
  element (`<span class="fl-tl-year">1906</span>`), so existing lists upgrade by adding the
  attribute. lesson-print-button.js loads the engine whenever a page has `[data-timeline]`.
- Dates: `1906`, `500 BC`, `AD 70`, `c. 627 BC`, `1928–34`, `1770s–80s`, `5th century BC`,
  `March 1876`, `1947-09-09`, `66 Ma`, `4.5 Ga`, `12 ka`, `present`. If any date won't parse
  (or they're step numbers 1, 2, 3), events are spaced evenly in source order instead.
- Track cards show an item's first sentence, whole or on two lines when there's room, and cut it
  when it's longer; give long items a `data-label` headline (the full text stays in the card).
  Engine CSS is scoped `.tl .tl-…` so lesson-wide `button`/`input` rules can't restyle the track,
  and nothing inside `.tl-canvas` transitions unless the engine asks (a page's reduced-motion
  `transition-duration` reset otherwise makes the engine read stale sizes).
- The track draws its own context: gridlines and minor ticks, Deep time's powers-of-ten stripes,
  a dotted BC|AD line, ranges as spans on the axis, and a reading line with the selected date on
  the axis. Eras without `data-color` get an ordered colour each (oldest to newest), and an era's
  name stays on screen while you scroll through it.
- Crowded dots fold into count pills (press to zoom in). Long timelines (25+ events or Deep time)
  get an overview strip under the track (drag the window to move, its edges to zoom);
  `data-timeline-overview="on|off"` forces it either way.
- Approximate dates (`c. 627 BC`, `1452?`) draw as rings. The detail card lifts an item's first
  photo beside the text (and opens it in the lightbox). The List view puts dates in one gutter and
  colours the rail by era; lessons whose own CSS lays the list out sideways keep dates inline.
  `npm run audit:timeline` screenshots and measures reference timelines against
  `docs/timeline-audit-baseline.json` (`--save-baseline` after a deliberate change).
- Per item: `data-label` (short track label), `data-group` (colour + filter chips),
  `data-color`, `data-era` (a band, not an event). Per list: `data-timeline-scale="time|even|log"`,
  `data-timeline-view`, `data-timeline-gaps` ("12 years later").
- Students get List and Track views (to scale; drag, Ctrl+wheel or +/− to zoom, ←/→ to
  step, a detail card with "N years ago"). Their view choice is remembered site-wide.
  Print always uses the list.
- From lesson JS: `ClassroomOSTimeline.create(host, { title, events: [{ when, label, text|html, group, era }] })`.
  `instance.setMatch(fn)` adds a page-level filter (fn(item) → show?) on top of chips and search.
- Only use it for real chronology. Numbered how-to steps styled as a timeline aren't one.
- Tests: `node --test tests/timeline.test.mjs` (also fails if a lesson's `data-when` won't parse).
- Big timelines: `data-timeline-search` (search box), `data-timeline-scales="log time"` (Deep time /
  True scale switch), `data-timeline-lanes="7"`, and `data-major` on an item so its label
  wins space when the view is crowded. Eras get "Zoom to" buttons automatically.
- Moving between distant events *flies* (zoom out, pan, zoom in; van Wijk–Nuij path) unless the
  reader prefers reduced motion, and every track has a ⛶ full-screen button (F) for the projector.
  `data-timeline-tour` adds **▶ Play the story** (Space pauses): it flies stop to stop through the
  `data-major` items, framing each in its neighbourhood, and stops the moment the reader grabs the
  track. `data-timeline-cosmic` adds Sagan's Cosmic Calendar to the detail card (the universe as one
  year: "Dec 31, 4.6 seconds before midnight"). From JS: `zoomToRange(startYear, endYear)` returns
  `{ fits, zoom }` (True scale can't zoom past what a browser can lay out), plus `play()` / `stopTour()`.
- Phones: a pinch zooms the track, not the page (Safari gesture events, else two touch pointers under
  `touch-action: pan-x pan-y`); lanes shrink to fit the screen's height; chip rows scroll sideways.
  iPhone has no element fullscreen, so ⛶ there moves the timeline to `<body>` as a fixed overlay
  (keeping the lesson's `--font-*`, paper and accent); on a phone held sideways the card sits beside
  the track. Stems and axis dots are their own layer (`.tl-stems`) under every label.

**The Grand Timeline** (`#grand-timeline` in `lessons/humanities/the-ages.html`) is the
site's one-line story of everything and the hub of The Ages lesson. All of it is generated by
`npm run build:ages-timeline` (`scripts/build-ages-timeline.mjs`) from two files:

- `data/ages-timeline.json`: site-wide milestones only (the iPhone, relativity, Origin of
  Species), not every event a lesson lists, each with a `lesson` link and a `strand`.
- `data/ages-lesson.json`: everything The Ages itself teaches: the ages (Era Atlas chapters, plus
  Middle Ages / Renaissance as bridge bands shown inside a chapter), the four systems lenses,
  breakthrough plates, turning points, communication leaps, Daniel 2, and the 3D artifacts. A card
  with `timeline: { join: "<label or artifact key>" }` attaches to an existing item; one with
  `{ when, label, strand }` makes a new item.

The build writes every `<!-- ages:NAME -->` region of the page (timeline, systems lens, Era Atlas,
chronology, Daniel 2, hero stats, and the `#ages-data` JSON the page script reads), so never edit
those regions or copy era data into the script. The Grand Timeline uses the tour and Cosmic Calendar; its last tour stop is "Ages to come?". Above it,
"First, feel the scale" (`#ages-powers`, hand-written, not generated) is four nested bars, each the glowing
sliver of the one above; it pins the selected event on every bar that holds it, and pressing a bar flies the
timeline to that span at True scale (or says how many km wide True scale would need, and uses Deep time).
On phones the Ages "Jump to Age" panel is the lesson-layout bottom drawer: the page script starts it
collapsed (`data-ll-collapsed`), since this page doesn't load lesson-layout.js.
The page reads both ways: timeline items carry
"In this lesson" links (`data-ages-open`) that open and flash the card, cards have "Show on the
timeline" buttons (`data-ages-show` / `data-ages-zoom`), selecting an item opens its age in the
readout and Era Atlas (`data-ages-eras`), and a layer toggle uses the engine's `setMatch(fn)` to
show only this lesson's evidence. `npm test` fails if the page is stale, a date won't parse, a join
matches nothing, or a lesson link or image is missing. When a new lesson teaches a true turning
point, add one milestone for it.

## Dark themes: lessons match the theme automatically

Night, Lava Lamp, Mandelbrot, Vaporwave and Bark all set `html[data-lighting="night"]`. Lessons that hard-code light
panels (`#fff` cards, pastel callouts, a cream page) used to glare in them. `assets/js/contrast-guard.js` (loaded by
nav-mobile.js and lesson-print-button.js on every page) now does two passes, in this order, on every theme change and
DOM change:

1. **Surface pass (`softenSurfaces`)**: re-tones large light panels, controls and light page backgrounds to the theme's
   `--surface-elevated` / `--bg` (neutrals) or a deep version of their own hue (tinted callouts), with matching borders.
   It never touches `img`, `svg`, `canvas`, `video`, small tiles/keys/swatches (square or tall, no words), or anything
   inside `[data-night-keep]`, `[data-score]`, `.fb-shell`, `.as-page`. Media sitting on a panel it darkened gets the
   light backing it was drawn for, so transparent diagrams with dark linework stay readable. Everything is inline and
   undone by `restore()`, so printing (Day theme) is unaffected.
2. **Text pass (`inspect`)**: flips any text that no longer meets 4.5:1 to black or white.

So for a new lesson: use theme tokens where you can (`var(--surface-elevated)`, `var(--text)`), and the guard covers the
rest. To keep something light on purpose (a paper, a colour swatch board, a white-background chart), put
`data-night-keep` on it. A page that must not be themed at all sets `data-theme-scope="independent"` (Color Theory Lab).
Don't paint light panels with `!important` inline styles from lesson JS; the guard's inline colors would lose.

`npm run audit:night` (needs `node serve-local.js`) loads every lesson in a dark theme (`--theme=lavalamp|night|...`)
and counts low-contrast text and bright panels, excluding the shared header. Use `--match=<path fragment>`,
`--save-baseline` / `--check` (data/night-audit-baseline.json), and `--out=report.json` for per-element detail.
Measure after settling: the guard throttles itself on heavy pages, so the default wait is 2.8s.

## Home-page class calendar

`#home-calendar` on `index.html` is a month calendar driven by `assets/js/home-calendar.mjs`
(styles in `assets/css/home-calendar.css`, classes `hcal-*`). Mon/Wed/Fri are the STEAM /
Microschool / Study Hall class days (`CLASS_DAYS`), shown as quiet color tints. It opens in a roomy
Week view (full text, no clipping) with a Month toggle (dots only; details sit below). Everything
else is a marker with a category (holiday, birthday, history, science & sky):

- **Computed, never hand-listed:** US holidays, Easter-based dates (Holy Week, Pentecost),
  Rosh Hashanah / Yom Kippur / Sukkot / Passover / Hanukkah (via the `Intl` Hebrew calendar),
  and equinoxes/solstices (Meeus). Tests: `node --test tests/home-calendar.test.mjs`.
- **Curated:** `data/calendar-events.json` (`md` = `MM-DD`, `y` = original year, which drives the
  "Nth birthday / years ago / ★ milestone every 25 years" text). Each entry links to the lesson
  that teaches it, and the test fails if that lesson file doesn't exist. When you add a lesson
  about a person or dated event, add its entry here.
- **Closures:** add `{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "label": "…" }` to `noClass`
  and Mon/Wed/Fri inside the range render as "No class". It ships empty; nothing is invented.

## Daily puzzles (mini crossword + sudoku + daily double)

`#home-puzzles` on `index.html` (Today tab, under the verse of the day) is a new crossword, sudoku,
and Daily Double every day, generated in the browser from the date: no server, no stored puzzles,
and every student sees the same ones. It reuses the `.home-widget--schedule` surface like the class calendar,
so all themes style it.

- `assets/js/daily-puzzles-core.mjs`: pure, seeded generators. `makeSudoku(key)` digs a solved grid down in
  180° symmetric pairs, keeping a removal only while the answer stays unique (givens by weekday: Monday
  easy, Friday/Saturday hard). `makeCrossword(key, bank)` tries ~24 random free-form layouts (words cross,
  never touch side by side) and keeps the densest, squarest one (12 words, at most 11×11).
  `makeDailyDouble(key, bank)` builds a 5×5 STEAM Jeopardy spoof board (Science, Technology, Engineering,
  Art, Math across $400–$2000 Double Jeopardy values = 25 tiles) with 2 secret "TRIPLE DOUBLE to the power of π"
  wager tiles per day.
- `assets/js/daily-puzzles.mjs` (UI) + `assets/css/daily-puzzles.css` (`dp-*`): tabs, ‹ › day nav (30 days
  back), pencil notes, hints, Check, Reveal, streak. Daily Double uses a "Who Wants to Be a Millionaire"
  multiple-choice console (A/B/C/D) with suspense animations, synth audio, explanations, and links to real STEAM lessons.
  Progress is one localStorage key (`classroomos:puzzles:v1`, 60 days kept); solving any puzzle counts toward the streak.
- **Banks:** `data/crossword-bank.json` (crossword vocab) and `data/daily-double-bank.json` (100 curated STEAM
  questions linked to lessons).
- Tests: `node --test tests/daily-puzzles.test.mjs` (unique sudoku solutions, crossword runs, daily double bank hygiene,
  deterministic boards, 2 triple doubles per day).

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
It's injected by nav-mobile.js, lesson-print-button.js and ui.js like visitor-memory.js, but only when it
will switch on (a headset browser, a saved "on", or `?vr=`; choosing On in Settings loads it);
pages without those load it with a plain `<script … vr-mode.js defer>`.
`lib/touch-controls.js` also shows the student-game pads in headsets (rebuild the slugs
in `data/touch-controls.json` after changing it).

**360° page sphere** (`vr/page-sphere.html?src=<page>`, 🥽 VR menu → "360° page"): wraps any same-origin
page around the viewer. WebXR can't take a live DOM as a texture, so the page runs in a hidden same-origin
iframe (`name="classroomos-vr-sphere"`; `vr-mode.js` keeps itself off in it), `assets/js/page-raster.mjs` draws
it to an image (clone the doc, wrap in SVG `<foreignObject>`, inline CSS/fonts/images as data: URLs), and
`assets/js/vr/sphere-layout.mjs` (pure, tested) cuts it into 1280×720 screens: a horizon ring of 8, then a ring
below (max 15; longer pages are cut and say so). A laser hit becomes a page coordinate and the click is replayed
in the iframe, so a link navigates the iframe and the immersive session survives (a real navigation ends it).
Things that will bite: draw from a **data:** URL, never blob: (Chrome taints the canvas, texImage2D then throws);
a nested `<html>` paints no background, so a wrapper div carries it; `:root` rules are rewritten to
`html[data-vr-snap]`; `vh` is pinned to 720 px; app-shell lessons (document one screen tall, an inner panel
scrolls) are found by `findMainScroller()` and expanded in the copy; copy *every* attribute when swapping a
`<canvas>` for an `<img>` (rules key off `id`). Not supported: typing, `<select>`, dragging, live video/WebGL,
cross-origin images without CORS. Tests: `node --test tests/page-sphere.test.mjs`, and
`SPHERE_URL=http://localhost:8080 node tests/page-sphere-browser.mjs` against `serve-local.js`.

**The site theme is the sphere's world.** `vr/sphere-environment.mjs` is one inward-facing sphere (radius 20,
drawn first, no depth test) with one fragment shader and a look per theme from `vr/sphere-theme.mjs`
(`environmentFor(registryTheme)`, pure, tested against every theme in `theme-registry.js`): Lava Lamp is
`LiquidEngine.ThermalBlobs` wax wrapped onto the sphere (`blobToSphere`: box x → longitude, y → latitude, the
heater pool under your feet; don't write a second lava sim), Vaporwave a neon grid floor and striped sun,
Mandelbrot a seam-free stereographic fractal, Night stars, Bark wood grain, and every light theme a tinted sky.
It reads `html[data-theme]` through a MutationObserver, so a theme changed in another tab or in Settings inside
the sphere re-colours it live (theme-lighting.js already turns the `storage` event into `data-theme`); the
control row restyles through `createPanel(...).userData.setStyle`. To add a theme look: add a case to
`environmentFor` and a shader function, then `npm test` (it fails if a registry theme has no valid palette).
Two things bite: a metaball's 1/d² tail is harmless on a flat screen but on a sphere two dozen tails sum past the
threshold everywhere, so each blob's reach is windowed to ~3 radii; and **motion is a comfort setting**, not
decoration: Motion = Auto (calm in a headset, still under reduced motion, full on a flat screen) / Calm / Still /
Full, stored in `classroomos-sphere-motion`. Never make the world move faster than `motionScale()` allows.

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

## Composer scores are complete and guided

Scores on the music lessons (`<figure data-score>`, `assets/js/score-engine.js`, data in
`data/score-library.json`) are whole pieces students can dissect bar by bar, at the same level as the Fake
Book: song map with named `sections`, Shift-click loop ranges, a measure-by-measure `guide` that follows
playback, and a `source.full` link to the complete printed score. Don't add chunked excerpts. Import new
pieces from LilyPond sources with `scripts/score-import/` (LilyPond reads the source; the result is checked
note by note against its MIDI). A genuine excerpt must say so: `excerpt: { label, of }`.
`npm run check:scores` enforces all of this for `lessons/music/`; engine tests:
`node --test tests/score-engine-whole-pieces.test.mjs`.

## Shared sim helpers

New lesson sims should reach for these instead of hand-rolling canvas/Three/Matter
boilerplate (and instead of pulling Three.js from yet another CDN version — lessons
have accumulated r128, r134, and three different 0.16x pins alongside the vendored
copy):

- `<script src="../assets/js/sim-kit.js"></script>` — `SimKit.canvas2d(canvas, opts)`
  for DPR-aware canvas sizing/resize, `SimKit.loop(fn)` for a rAF loop that pauses
  when the tab is hidden, `SimKit.theme.colors()` / `SimKit.theme.onChange(cb)` for
  reading the site's `--bg`/`--text`/`--accent` CSS custom properties instead of
  branching on `dataset.theme` by hand. `SimKit.noise.fbm(x, y, octaves)` (plus
  `.value`, `.hash`) is the deterministic value noise for procedural terrain/clouds/
  turbulence; don't paste another `hashN`/`fbm` stack into a lesson
  (`tests/sim-kit-noise.test.mjs` pins its output).
- `assets/vendor/three-bundle.min.js` (rebuild with `npm run build:three`, source in
  `scripts/three-bundle-entry.js`) — the single pinned Three.js build (matches the
  `three` devDependency used by `scripts/build-breadboard-model.mjs`), plus
  `OrbitControls`/`OBJLoader`/`GLTFLoader`/`DRACOLoader`. Pair with
  `assets/js/sim-kit-three.mjs`'s `createScene(canvas, { THREE, ... })` for
  renderer/camera/resize setup. See `lessons/3d-design/cad-and-printing/cad-camera-controls.html` for a worked
  example.
- `assets/vendor/matter-bundle.min.js` (rebuild with `npm run build:matter`, source
  in `scripts/matter-bundle-entry.js`) — a pinned Matter.js build (`Engine`,
  `Bodies`, `Body`, `Composite`, `World`) for sims that need real 2D rigid-body
  collision instead of independently-moving points. See `assets/js/cymatics/cymatics-lab.mjs`
  (`separateGrains`, the Cymatics lesson's sand) for a worked example.
- `assets/js/cymatics/plate-physics.mjs` — real Chladni-plate physics in SI units: Kirchhoff plate
  modes for a centre-bolted square or circle (polar Rayleigh–Ritz with the bolt clamped exactly),
  driver/bow modal forcing and ring-up, with `granular.mjs` for sand that lifts off where Γ = ω²A/g > 1
  and Faraday's air-streamed powder. Tests (`tests/cymatics-plate.test.mjs`) check it against the exact
  free-circle Bessel solution and Leissa's square-plate values; keep them passing if you touch the
  solver, and keep `SQUARE_TRUST` honest (the lesson shades frequencies above it as "beyond the model").
- `<script src="../assets/js/liquid-engine.js"></script>` — `LiquidEngine` for liquids:
  `Surface` (1-D waves), `Particles`/`FlowParticles`, `DepthField` (2-D depth-averaged grid
  flow over terrain for lava fields, floods and mudflows; conserves volume, has a yield threshold
  and cooling, `stats().balanceError`) and `ThermalBlobs` (buoyant lava-lamp wax that merges and
  splits). `liquid-engine-three.mjs` renders them (`createLiquidSurface`, `createDepthFieldMesh`
  drapes a DepthField over terrain). Don't hand-roll another lava/flood grid; see
  `lessons/earth-science/volcano-simulator.html` and `assets/js/canvas-bg-lava.js`. Tests:
  `node --test tests/liquid-engine.test.mjs`.

- `<script src="../assets/js/arduino-art.js"></script>` — the one illustration engine for
  every Arduino drawn on the site (UNO R3, UNO R4 WiFi, UNO Q, Nano Every). Drop in
  `<span data-arduino-art="uno-r3"></span>`, or call `ArduinoArt.create(model)` to get an
  SVG `<g>` plus real pin/part coordinates (`pins['13']`, `pins['GND#2']`, `anchors.usb`)
  for wiring, hotspots and LED states. Don't hand-draw a new board; add a model there.
  Schematic symbols ("U1 Arduino Uno" blocks) stay as schematics.

Existing lessons on other Three.js versions or hand-rolled canvas loops don't need to
be migrated proactively — migrate opportunistically when touching that lesson anyway.

## 3D design tools: Workbench and Forge

Both run on the Manifold kernel through `assets/js/forge/engine.mjs` (`engine.run(part)` builds and
print-checks; `engine.scoped(fn)` builds anything and frees the WebAssembly objects; build code that
uses `new Manifold(...)` must pass it to `ctx.track`).

- **Forge** (`forge.html`, `assets/js/forge/`) is parametric: pick one of the parts, set numbers, print.
- **Workbench** (`workbench.html`, `assets/js/workbench/`) is the free-form builder: shapes + holes
  (Tinkercad-style; a hole cuts the solids in its own group, top-level holes cut everything), groups
  with pivots, patterns, a keyframe timeline, print check, STL / animated GLB / OBJ / PNG.
  - `shapes.mjs`: the shape library (plain data + `build(ctx, p)`). `len` params are written as
    tabletop millimetres and scaled per project preset and shape `kind` (a wall drops into an
    Architecture project at 6 m, into a print project at 60 mm). Mark radially built shapes
    `axial: true` so they keep their axis as the centre.
  - `model.mjs`: project format (`.workbench.json`, validated), transforms (`T·R·S·T(−pivot)`, Z-up),
    evaluation, print bodies, animation keys. `templates.mjs`: the starter gallery; `workbench.html?
    template=<id>` (or `?new=<preset>`) opens one from a lesson link.
  - `export.mjs` converts Z-up mm/m to glTF's Y-up metres node by node, so pivots and the animation
    survive. The page uses `TransformControls` from `three-extras.min.js`.
  - Tests: `npm run test:workbench` (every shape at its range ends must be closed, every template
    must build, round-trip and fit the printer at its print scale). When you add a shape or template,
    the test covers it automatically.

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

## Recent Updates

When shipping a meaningful lesson update, add an entry to `data/updates.json`
with `date` (YYYY-MM-DD), `lesson` (live catalog ID), `title`, and a short,
student-friendly `what`. Run `npm run build:updates` and commit the generated
homepage, `updates.html`, and `data/updates-first-added.json` cache. New lessons
use the first-added git date; student projects use manifest `date_added`.
Generate locally with full git history after committing new lesson files.
Routine maintenance and site-wide edits do not need curated entries.

## Sheet music that exists only as a scan

When a public-domain piece has no LilyPond/MusicXML source (early jazz and ragtime: Morton isn't on
Mutopia), follow `scripts/scan-transcribe/README.md`: `fetch-imslp.mjs` downloads the IMSLP PDF,
`omr.sh` runs Audiveris for a MusicXML draft (pitches mostly right; fix durations, 8va and key
changes), and `zoom.py` checks each bar against the scan. Don't read noteheads by eye from scratch;
it's far slower. Jazz standards go to `data/fake-book.json` as lead sheets.
`scripts/scan-transcribe/morton-notes.md` tracks the unfinished Morton pieces.
