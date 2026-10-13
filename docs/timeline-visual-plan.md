# Timeline engine: visual improvement plan

Scope: `assets/js/timeline.js` + `assets/css/components/timeline.css`. These changes reach all 27
`data-timeline` lessons, the 24 legacy timelines the engine adapts, and the Grand Timeline in
`lessons/humanities/the-ages.html`. The engine's structure stays as it is: a real `<ol>` as the
content, DOM buttons for marks, print always uses the list. Nothing here moves rendering to canvas.

## What the track looks like today

Screenshots (1280×900 and 1920×1080 full screen, light and dark, 390px phone) of Grace Hopper,
Bach, Jeremiah and the Grand Timeline show these problems:

| # | Problem | Evidence |
|---|---------|----------|
| 1 | **Labels are cut off even when there's room.** Every mark is capped at 168px and the label text at 34 characters. | Hopper: 12 of 12 labels end in "…" while 1960–1985 is empty. Bach: 10 of 10. |
| 2 | **Close events stack into tall diagonal staircases.** | Hopper stacks 5 lanes over 1928–1952. On a phone it is 6 lanes, 43% of the screen, with one tick label ("2000"). |
| 3 | **Crowded events become one smear on the axis.** Compact dots overlap. | Grand Timeline: 109 of 141 events are compact dots. From 5,000 to 50 years ago they make one solid multicoloured bar. |
| 4 | **Once zoomed in, you can't see where you are.** There's no overview. | After "Zoom to Bronze Age" nothing shows where that span sits in 13.8 billion years. |
| 5 | **Era bands are hard to tell apart.** Every band uses the same accent tint at 4% or 10%. Band labels in rows 2–3 drift away from their band. A band label that starts off screen is cut off. | Grand Timeline: Agricultural, Bronze and Iron Age look like one beige block. "MIDD…" is clipped at the right edge. |
| 6 | **Ranges are drawn in the wrong place.** The span is a thin bar under the label, up in the lane, not on the axis. | Bach "1717–23", Ages "Sumerian Axe", "Coal forests". |
| 7 | **The axis is sparse.** No minor ticks, no gridlines. Deep time doesn't show that each step is ×10. | Labels in high lanes are hard to read against a date. A phone gets one tick. |
| 8 | **Projector type is too small.** Full screen keeps .7rem dates and .8rem labels on a 1920px wall. `LANE_H = 52` is a JS constant, so the CSS can't enlarge marks. | 1920×1080 full screen: small labels with roughly 30% empty space above the lanes. |
| 9 | **The selected event barely stands out.** It gets a thicker border and a solid stem, and that's all. | During ▶ Play it's hard to find the current stop in a crowded view. |
| 10 | **Groups don't read at a glance.** Colour is only a 3px left border. `data-major` affects placement but not how a mark looks. | Grand Timeline: nine groups look like one grey wall of cards. |
| 11 | **The search box turns dark in Day theme.** `main.css:1199` styles every `input[type="search"]`, and that overrides `.tl-search`. | Visible in the Grand Timeline toolbar. |
| 12 | **The list view is flat.** Every row has the same weight. Era rows barely stand out from events. | Hopper and Jeremiah list views. |

## Principles

- **Legibility first.** A label you can read beats any effect. Spend free horizontal space on text
  before adding lanes.
- **Every visual cue must teach something.** Use colour for group, size for importance, the axis for
  the date, and a dashed or fuzzy edge for uncertainty. No decoration for its own sake.
- **Colour comes from tokens.** Use `--tl-c`, `--tl-accent`, `--tl-paper` and `color-mix()`, never
  hex values in rules. Every change must pass `npm run check:themes` in Day and Night, and must also
  look right inside VR mode.
- **Motion is optional.** Every new animation sits behind `prefers-reduced-motion`, and none runs
  while printing.
- **Defaults beat new attributes.** New features turn on by heuristics (event count, span, scale),
  so all 50+ timelines improve without editing any lessons. Add an attribute only to opt out.

## Phase 0: measure before changing (done)

`npm run audit:timeline` (`scripts/audit-timeline-visual.mjs`) renders five timelines through the
real engine in Track view at Fit zoom:
- Hopper, Bach, Jeremiah
- the Grand Timeline
- Python, a legacy `.pf-timeline` the engine adapts

Each is rendered at three sizes (1280×900 inline, 1920×1080 full screen, a 390×844 phone) in Day and
Night. It saves screenshots to `tmp/timeline-audit/` and prints the metrics. Every run is compared
against `docs/timeline-audit-baseline.json` and shows changed values as `new (old)`. After a phase
lands, re-record the baseline with `--save-baseline`. To run a subset, use
`--case=hopper,ages --size=phone --theme=day`. Like `audit:print-layout`, it is a dev tool and not
part of `npm test`.

Baseline (2026-10-13; Day and Night are identical, since geometry doesn't depend on theme):

| Case | Events | Compact | Cut labels | Lanes | Dot hits | Ticks | Track % of screen | Unused full-screen % |
|------|-------:|--------:|-----------:|------:|---------:|------:|------------------:|---------------------:|
| Hopper desktop | 12 | 0 | 12 | 5 | 0 | 5 | 34.7 | |
| Hopper projector | 12 | 0 | 12 | 4 | 0 | 11 | 24.1 | 64.8 |
| Hopper phone | 12 | 6 | 6 | 6 | 1 | 1 | 43.1 | |
| Bach desktop | 10 | 0 | 10 | 6 | 0 | 7 | 40.4 | |
| Bach projector | 10 | 0 | 10 | 4 | 0 | 7 | 24.1 | 64.8 |
| Bach phone | 10 | 4 | 6 | 6 | 1 | 2 | 43.1 | |
| Jeremiah desktop | 4 | 0 | 1 | 2 | 0 | 4 | 17.3 | |
| Jeremiah projector | 4 | 0 | 1 | 1 | 0 | 8 | 9.6 | 74.3 |
| Jeremiah phone | 4 | 0 | 3 | 4 | 0 | 1 | 30.8 | |
| Ages desktop | 141 | 109 | 7 | 7 | 103 | 9 | 54.9 | |
| Ages projector | 141 | 86 | 14 | 11 | 74 | 13 | 65.0 | 8.8 |
| Ages phone | 141 | 128 | 3 | 7 | 123 | 2 | 58.5 | |
| Python desktop | 5 | 0 | 4 | 2 | 0 | 5 | 17.3 | |
| Python projector | 5 | 0 | 4 | 2 | 0 | 9 | 14.4 | 70.2 |
| Python phone | 5 | 0 | 4 | 5 | 0 | 3 | 37.0 | |

The baseline confirms the problems in the table above, with numbers:
- **Type size never changes.** Every case renders dates at 11.2px and labels at 12.8px, including
  1920px full screen.
- **Label overlaps are 0 everywhere.** The lane packer is correct; the problem is how it spends
  space.
- **Ages band labels go missing:** 3 hidden or clipped on desktop, 7 on a phone.
- **The Ages search field is opaque** in both themes.
- **Small timelines leave most of the full screen empty:** 65–74%.

## Phase 1: legibility (done)

What shipped, all in `timeline.js` and `timeline.css`, with no lesson edits:

**1a. Labels use the room they have** (#1, #2)
- Marks show up to a sentence of the item (`it.text`, ~90 characters). `it.label`, the short
  label that pages read, is unchanged.
- In each lane, a label tries three shapes before moving up a lane: its whole width on one line
  (≤ 300px), wrapped onto two lines (≤ 250px; that lane grows from 52px to 68px), then cut to 168px.
- `placeBest()` compares this with the old layout, where every label is cut. It keeps the most
  generous tier that hides no more labels and adds at most 3 lanes of height. The track is still
  capped at 68% of the screen inline.
- Labels are measured exactly and rounded up. `offsetWidth` rounds down, and that alone put "…"
  on labels that fit.
- Labels are measured again when a web font finishes loading. A weight first used by the track
  starts loading during the first measurement, which then uses the fallback font.

**1b. Sizes come from one unit** (#8)
- Every track size is a multiple of `--tl-u`, which is `--tl-type` × 1rem/16. JS lays out with the
  same numbers (`SIZE`). Lanes now scale with the site's text-size setting too: before, a larger
  root font made labels overlap.
- In full screen the engine picks the largest type in 1.8, 1.6, 1.4 or 1.2 (capped at the screen's
  width / 1000) that keeps at least 75% of the labels shown at 1×. Small timelines get 1.8× and
  Ages gets 1.2×. The track stays centred between the toolbar and the card. I tried stretching it
  to fill the screen, and a small timeline ended up as a few cards at the foot of an empty box.

**1c. Group colour and importance at a glance** (#10)
- Marks are tinted 7% with their group colour.
- `data-major` marks get a 5px edge, a larger bold label and a 14px axis dot.

**1d. Phones** (#2, #7)
- Phone ticks are spaced closer (overlapping labels are still dropped), and deep-time ticks use a
  short form ("500M yrs ago").
- A label is never wider than half the canvas, so it always fits on one side of its dot. On a
  320px phone canvas a centred event had become a dot for that reason.
- Inline phone tracks are capped at half the screen.
- **Changed from the plan: no one-line flags.** Measured, they were worse. A phone is short on
  width, not height, so flags cut labels to about 8 characters, and a 30% height cap hid more
  labels as dots.

**1e. Lesson CSS no longer leaks into the track** (#11, plus a bug the audit found)
- Engine selectors are scoped as `.tl .tl-…`. That fixes the opaque search field (`main.css`
  `input[type=search]`). It also fixes `.dan-page button` in `daniel.css`, which forced
  `padding: 11px 16px` onto every timeline mark in the prophet lessons and squashed their text.

Results against the Phase 0 baseline (Day; Night is identical):

| Case | Cut labels | Lanes | Track % | Ticks | Date / label px | Unused full screen % |
|------|-----------:|------:|--------:|------:|----------------:|---------------------:|
| Hopper desktop | 12 → 5 | 5 → 7 | 34.7 → 51.1 | 5 | | |
| Hopper projector | 12 → 5 | | | | 11.2/12.8 → 20.2/23.0 | 65.9 → 16.4 |
| Hopper phone | 6 | 6 | 43.1 | 1 → 5 | | |
| Bach desktop | 10 → 8 | 6 | 40.4 → 51.1 | 7 | | |
| Bach projector | 10 → 8 | | | | 11.2/12.8 → 20.2/23.0 | 65.9 → 7.7 |
| Jeremiah desktop | 3 → 0 | 2 | 17.3 | 4 | | |
| Ages desktop | 7 → 0 | 7 → 8 | 54.9 → 56.7 | 9 | | |
| Ages projector | 14 → 0 | | | | 11.2/12.8 → 13.4/15.4 | 10.1 → 9.8 |
| Ages phone | 3 → 0 | 7 → 6 | 58.5 → 48.1 | 2 | | |
| Python projector | 4 → 3 | | | | 11.2/12.8 → 20.2/23.0 | 71.3 → 54.0 |

Label overlaps stay at 0 everywhere, and `searchBg` is false. Compact dots are unchanged within
±3 everywhere except the Ages projector (86 → 97), which trades 11 labels for 20% larger type.
That's the 75% rule above. Phase 3's clusters are the fix for crowding there.

Targets missed, and why:
- **≤ 3 lanes on Hopper and Bach desktop was not reachable.** Hopper has 7 events within 31 years
  (about 300px), so labels of a readable width need at least 5 lanes. The track grew to about
  half the screen in exchange for whole or two-line labels.
- **Hopper and Bach still have 5–8 "cut" labels.** These are sentences longer than two lines at
  250px. Adding `data-label` to an item gives it a short headline, and the full sentence still
  appears in the card.
- **Jeremiah and Python projector stay 54–60% empty.** A 4- or 5-event timeline can't fill a
  projector at 1.8× type.
- **Phones stay at 43% of the screen.** Shrinking them meant hiding labels (see 1d).
- **Ages projector date text is 13.4px, not ≥ 15.** Larger type there would hide over a quarter of
  its labels.

Performance: one `layout()` on the Grand Timeline takes about 10ms, against 22ms before. A full
zoom step, including ticks and scroll, is about the same as before (40–60ms median, noisy).

## Phase 2: context on the axis

**2a. A better axis** (#7)
- Add unlabelled minor ticks between major ticks: 5 per step on linear scales, and the 2/5 steps on
  log scales.
- Draw faint vertical gridlines at major ticks through the lane area, beneath bands and stems, at
  about 6% ink. These connect high labels to the date scale.
- In Deep time, shade every other power of ten very lightly and label the first one "each band = ×10
  further back". This makes the compression itself something students can see.
- On True scale, when the range crosses 0, mark the BC|AD boundary as a dotted line.

**2b. Ranges sit on the axis** (#6)
- Draw each range event as a capsule on the axis itself, in the stem layer, from `start` to `end`.
  The stem rises from the capsule's start.
- Remove the floating `.tl-range` bar from inside the mark.
- Overlapping ranges stack as thin capsules just above the axis, up to 3, and beyond that become
  hatched.

**2c. Era bands people can tell apart** (#5)
- When eras have no `data-color`, colour them from an ordered strata ramp: one hue family, stepped in
  lightness, with neighbouring bands alternating light and dark. Grand Timeline bands then read as
  rock layers.
- Add a 4px cap bar in the band's colour along the top edge of each band, with the label sitting on
  it.
- Make band labels sticky: if a band starts off screen left, pin its label to the viewport's left
  edge until the band ends. Do the same at the right edge. This is computed in `renderTicks()`,
  which already runs every scroll frame.
- Keep a label in rows 2–3 next to its own band's left edge, joined by a short leader line, so it
  never floats over a neighbouring band.

**2d. A reading cursor for the selected event** (#9)
- Draw a full-height hairline through the canvas at the selected event's date.
- Add an axis callout chip that shows the exact date where the line meets the axis.
- Pulse the halo on the event's axis dot, as the `today` tick already does.
- During ▶ Play, unselected marks fade to 55% opacity, so the stop is unmistakable on a projector.
- Hovering any mark shows a light preview cursor in the same style.

## Phase 3: density and navigation

**3a. Clusters instead of smears** (#3)
- When compact dots would overlap (centres < 12px apart), merge them into one cluster pill. It shows
  the count (`+14`) and is split into the colours of the groups inside it, like a small stacked bar.
- Clicking a cluster flies to the zoom where its events get labels (reusing the `targetFor` logic).
  Arrow-key stepping still visits each event.
- Clusters are built in `layout()` after lane placement, so their cost stays proportional to the
  number of visible events.
- Target: `dotHits` 0 in every case (Ages now 74–123).

**3b. Overview strip (minimap)** (#4)
- Add a 28px strip under the axis showing the whole timeline at Fit zoom: era bands as colour blocks,
  every event as a 1px tick in its group colour, and a window rectangle for the current view.
- Dragging the window pans. Dragging its edges zooms. Clicking elsewhere flies there with `flyTo`.
- The window animates live during flights and tours, so a jump from the Big Bang to the iPhone shows
  where you left and where you landed.
- Turn it on automatically when the timeline has ≥ 25 events or uses log scale, or whenever the zoom
  is above 3. Opt out with `data-timeline-overview="off"`.
- It is `aria-hidden`. The keyboard path stays the arrow keys and +/−.

## Phase 4: polish

**4a. Motion that explains**
- When a compact dot turns into a card as you zoom in, fade and scale the card up (about 160ms)
  instead of popping it in. Cards turning back into dots fade out.
- The first time a track scrolls into view, grow the dots along the axis from left to right with a
  stagger, no more than 600ms total. This runs once, through an IntersectionObserver.

**4b. Uncertainty you can see**
- When `parsed.approx` is set, draw the event's dot as a ring and give its range capsule soft
  gradient ends. Add a small "about" note on the axis callout.
- This shows students the difference between "c. 3000 BC" and "July 20, 1969".

**4c. A richer detail card**
- If the item contains an `<img>`, show the first one as a thumbnail floated right in the card,
  marked `data-zoomable` so it opens in the lightbox (lesson rule). The Grand Timeline has 34 of
  these.
- When the selection changes, cross-fade the card's content.
- Inline, keep the card height stable so the page doesn't jump while stepping.

**4d. List view with structure** (#12)
- Put dates in a fixed-width gutter column so they line up.
- Make era rows section headers: the rail turns the era's colour from that header to the next one.
- Show `data-major` rows with a bigger dot and a bold title.
- With `data-timeline-gaps`, a long gap gets a dashed break in the rail.
- All of this is print-safe and goes under the existing `@media print` rules. Check with
  `npm run audit:print-layout -- --lesson=grace-hopper`.

**4e. Toolbar tidy-up**
- Group view, step and zoom into joined segmented controls.
- Use one icon set: the ⛶ icon is smaller than the others today.
- Make category chips use a colour swatch dot, plus a "Show all" reset once a chip is off.

## Order and effort

| Phase | Effort | Why this order |
|-------|--------|----------------|
| 0 Audit | 0.5 day | Every later target is measured with it. |
| 1 Legibility | 2–3 days | Fixes what every student sees on every timeline. All of it lives in layout and CSS. |
| 2 Axis context | 2 days | Gridlines, ranges and bands depend on 1b's CSS-driven sizes. |
| 3 Density + overview | 3 days | Mostly helps the Grand Timeline. The overview depends on clusters for its own legibility. |
| 4 Polish | 2 days | Each item is independent and can ship on its own. |

Ship each phase as its own commit, with before/after screenshots from the audit.

## Checks for every phase

- `node --test tests/timeline.test.mjs` and `npm test` (the Grand Timeline staleness checks)
- `npm run audit:timeline`: the metrics hit the phase target with no regressions elsewhere
- `npm run check:themes`, `npm run a11y`
- `npm run audit:print-layout -- --lesson=the-ages` and `--lesson=grace-hopper`: print stays the
  list and doesn't shrink
- Manual: ▶ Play the story on the Grand Timeline, full screen on a 1920 display, iPhone
  pseudo-fullscreen (rotate the phone), VR mode `?vr=on`, and reduced motion turned on
- Update the timeline section of `CLAUDE.md` for any new attribute (`data-timeline-overview`) or
  behaviour (clusters, the overview strip)

## Out of scope

- Moving rendering to canvas or WebGL. DOM marks keep screen readers, focus and VR laser targets
  working.
- Changes to the date parser or the Grand Timeline data or build.
- Migrating legacy timelines to `data-timeline` markup. They benefit automatically.
