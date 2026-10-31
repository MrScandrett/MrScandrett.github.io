# Timeline engine status

Lesson pages that mention "timeline", and how each one renders. Checked 2026-10-20 by loading
every page in Playwright.

**Every real chronology already renders through the shared engine.** `lesson-print-button.js`
loads `timeline.js` on any page with a `*timeline*` list; the engine then upgrades plain
`ol`/`ul` timelines automatically and adapts the old card styles named in `LEGACY_TIMELINES`.
So there is no visible migration left. Making a page explicit (adding `data-timeline`, deleting
its now-unused timeline CSS) is housekeeping: do it when you are editing that page anyway.

| Status | Pages | Meaning |
|---|---|---|
| Explicit `data-timeline` | 20 | Marked in the HTML; old CSS removed. |
| Engine via auto-upgrade | 22 | Plain list, upgraded at load. Optional cleanup. |
| Engine via `LEGACY_TIMELINES` | 21 | Old card markup adapted at load. Optional cleanup. |
| Custom widget (on purpose) | 7 | Era picker / sim / activity; leave as is. |
| Not a chronology | 5 | Steps or a process; leave as is. |
| Word only | 23 | Mentions the word; nothing to do. |

| Status | Page | Notes |
|---|---|---|
| Explicit `data-timeline` | lessons/chemistry/pioneers/dalton-atomic-theory.html | section#timeline.pioneer-card 5/5 dates parse |
| Explicit `data-timeline` | lessons/chemistry/pioneers/lavoisier-conservation.html | section#timeline.pioneer-card 5/5 dates parse |
| Explicit `data-timeline` | lessons/chemistry/pioneers/mendeleev-periodic-law.html | section#timeline.pioneer-card 6/6 dates parse |
| Explicit `data-timeline` | lessons/cosmology/apollo-moon-landing.html | ul.sm-timeline 7/7 dates parse |
| Explicit `data-timeline` | lessons/cosmology/constellations.html | ul.timeline 9/9 dates parse |
| Explicit `data-timeline` | lessons/cosmology/heliocentrism.html | ul.hs-timeline 7/7 dates parse |
| Explicit `data-timeline` | lessons/cosmology/origins-of-the-universe.html | ol.og-timeline 11/11 dates parse |
| Explicit `data-timeline` | lessons/cosmology/pioneers/tycho-brahe.html | ul.tb-timeline 12/12 dates parse |
| Explicit `data-timeline` | lessons/cosmology/universe-expansion.html | ol.ue-timeline 9/9 dates parse |
| Explicit `data-timeline` | lessons/cosmology/uraniborg.html | ul.ur-timeline 8/8 dates parse |
| Explicit `data-timeline` | lessons/language-literature/dante-inferno.html | ol.x-timeline 7/7 dates parse |
| Explicit `data-timeline` | lessons/language-literature/dylan-thomas-poetry.html | ol.x-timeline 7/7 dates parse |
| Explicit `data-timeline` | lessons/language-literature/milton-paradise-lost.html | ol.x-timeline 8/8 dates parse |
| Explicit `data-timeline` | lessons/language-literature/pilgrims-progress.html | ol.x-timeline 8/8 dates parse |
| Explicit `data-timeline` | lessons/language-literature/tolkien-worldbuilding.html | ol.x-timeline 9/9 dates parse |
| Explicit `data-timeline` | lessons/physics/pioneers/albert-einstein.html | ol.ae-timeline 8/8 dates parse |
| Explicit `data-timeline` | lessons/physics/pioneers/james-clerk-maxwell.html | ol.jcm-timeline 12/12 dates parse |
| Explicit `data-timeline` | lessons/physics/pioneers/marie-curie.html | ol.mc-timeline 11/11 dates parse |
| Explicit `data-timeline` | lessons/physics/pioneers/nikola-tesla.html | ol.ntl-timeline 10/10 dates parse |
| Explicit `data-timeline` | lessons/physics/pioneers/wright-brothers.html | ol.wb-timeline 5/5 dates parse |
| Engine via auto-upgrade | lessons/computer-science/algorithms-and-ai/ai-concepts-foundations.html | section#timeline.origins-section 17/17 dates parse |
| Engine via auto-upgrade | lessons/computer-science/algorithms-and-ai/ai-eliza.html | ol.eliza1966-timeline 5/5 dates parse |
| Engine via auto-upgrade | lessons/computer-science/algorithms-and-ai/perceptron-lab.html | article.card 7/7 dates parse |
| Engine via auto-upgrade | lessons/computer-science/graphics-and-games/ascii-art-and-games.html | ul.as-timeline 7/7 dates parse |
| Engine via auto-upgrade | lessons/computer-science/graphics-and-games/perlin-noise.html | ol.pn-timeline 5/5 dates parse |
| Engine via auto-upgrade | lessons/computer-science/pioneers/ada-lovelace.html | section#al-sec-timeline.al-card 11/11 dates parse |
| Engine via auto-upgrade | lessons/computer-science/pioneers/margaret-hamilton.html | ol.mh-timeline: minute-by-minute Apollo 11 landing, July 20 1969 |
| Engine via auto-upgrade | lessons/earth-science/earth-circumference.html | ul.ec-timeline 7/7 dates parse |
| Engine via auto-upgrade | lessons/humanities/frankfurt-school-culture-industry.html | ol.fs-timeline 17/17 dates parse |
| Engine via auto-upgrade | lessons/humanities/quadrivium.html | ol.fl-timeline 7/7 dates parse |
| Engine via auto-upgrade | lessons/language-literature/tower-babel-library-internet.html | ul.atlas-timeline 8/8 dates parse |
| Engine via auto-upgrade | lessons/language-literature/william-blake-songs.html | ol.bk-timeline 11/11 dates parse |
| Engine via auto-upgrade | lessons/life-sciences/kpg-extinction.html | ol.kpg-timeline: Before 66 Ma → impact → weeks → years (relative steps; engine spaces evenly) |
| Engine via auto-upgrade | lessons/life-sciences/pioneers/alexander-von-humboldt.html | ol.hv-timeline 10/10 dates parse |
| Engine via auto-upgrade | lessons/mathematics/advanced-and-calculus/eulers-number.html | ul.en-timeline 5/5 dates parse |
| Engine via auto-upgrade | lessons/mathematics/foundations/numbers.html | ul.num-timeline 6/6 dates parse |
| Engine via auto-upgrade | lessons/mathematics/geometry-and-trigonometry/pi.html | ul.pi-timeline 6/6 dates parse |
| Engine via auto-upgrade | lessons/music/instruments/guitar.html | ol.gtr-timeline 9/9 dates parse |
| Engine via auto-upgrade | lessons/music/instruments/piano.html | ol.pno-timeline 9/9 dates parse |
| Engine via auto-upgrade | lessons/music/theory/music-modes-evolution.html | ol.mm-timeline 10/10 dates parse |
| Engine via auto-upgrade | lessons/physics/modern-and-thermal/quantum-physics.html | ol.qp-timeline 13/13 dates parse |
| Engine via auto-upgrade | lessons/physics/modern-and-thermal/speed-of-light.html | ul.sol-timeline 5/5 dates parse |
| Engine via `LEGACY_TIMELINES` | lessons/applied-physics-materials/dispersive-prism.html | div.prism-timeline 6/6 dates parse |
| Engine via `LEGACY_TIMELINES` | lessons/applied-physics-materials/vr-technology.html | div.vr-mini-timeline 4/4 dates parse |
| Engine via `LEGACY_TIMELINES` | lessons/chemistry/periodic-table.html | div.pt-timeline 8/8 dates parse |
| Engine via `LEGACY_TIMELINES` | lessons/computer-science/algorithms-and-ai/turing-test.html | div.tt-timeline 3/3 dates parse |
| Engine via `LEGACY_TIMELINES` | lessons/computer-science/foundations/python-foundations.html | div.pf-timeline 5/5 dates parse |
| Engine via `LEGACY_TIMELINES` | lessons/computer-science/graphics-and-games/cgi-water.html | div.cgi-timeline 6/6 dates parse |
| Engine via `LEGACY_TIMELINES` | lessons/humanities/panama-canal.html | div.timeline 5/5 dates parse |
| Engine via `LEGACY_TIMELINES` | lessons/humanities/pioneers/leonardo-da-vinci.html | div.dv-timeline 4/4 dates parse |
| Engine via `LEGACY_TIMELINES` | lessons/humanities/school-of-athens.html | div.athens-timeline 8/8 dates parse |
| Engine via `LEGACY_TIMELINES` | lessons/life-sciences/amino-acids.html | div.aa-timeline 8/8 dates parse |
| Engine via `LEGACY_TIMELINES` | lessons/life-sciences/animalia/index.html | div.timeline 5/5 dates parse |
| Engine via `LEGACY_TIMELINES` | lessons/life-sciences/cambrian-explosion.html | div.c-timeline 4/4 dates parse |
| Engine via `LEGACY_TIMELINES` | lessons/life-sciences/cryptozoology.html | div.timeline 3/3 dates parse |
| Engine via `LEGACY_TIMELINES` | lessons/life-sciences/entomology.html | div.timeline 4/4 dates parse |
| Engine via `LEGACY_TIMELINES` | lessons/mathematics/advanced-and-calculus/fourier-series.html | div.four-timeline 7/7 dates parse |
| Engine via `LEGACY_TIMELINES` | lessons/mathematics/foundations/clocks-and-time.html | div.ct-timeline 8/8 dates parse |
| Engine via `LEGACY_TIMELINES` | lessons/mathematics/foundations/measuring-length.html | div.ml-timeline 6/7 dates parse |
| Engine via `LEGACY_TIMELINES` | lessons/physics/mechanics/levers.html | div.lv-timeline 7/7 dates parse |
| Engine via `LEGACY_TIMELINES` | lessons/physics/mechanics/wheel-and-axle.html | div.wa-timeline 7/7 dates parse |
| Engine via `LEGACY_TIMELINES` | lessons/physics/waves-and-sound/physics-of-music.html | div.music-timeline 8/8 dates parse |
| Custom widget (on purpose) | lessons/computer-science/algorithms-and-ai/expert-system.html | "AI Timeline Placement" activity — students place items; not a display timeline |
| Custom widget (on purpose) | lessons/computer-science/graphics-and-games/game-design-thinking.html | div#history-timeline.history-timeline 9/9 dates parse |
| Custom widget (on purpose) | lessons/humanities/evolution-of-steam.html | "Interactive flight log" era picker, 1954–present |
| Custom widget (on purpose) | lessons/humanities/gold-rush.html | button picker ("Select a stop"), 5 dated stops |
| Custom widget (on purpose) | lessons/humanities/history-of-medicine.html | era slider sim tied to a life-expectancy chart; custom by design |
| Engine via `LEGACY_TIMELINES` | lessons/life-sciences/evolution-of-wood.html | click-the-marker widget, geologic periods in Mya |
| Custom widget (on purpose) | lessons/life-sciences/nutrition.html | div.timeline 3/5 dates parse |
| Custom widget (on purpose) | lessons/physics/electricity-and-magnetism/what-is-electricity.html | era nav buttons drive a panel, 10 dated eras |
| Not a chronology | lessons/computer-science/algorithms-and-ai/chess-origins-how-to-play.html | figcaption.ch-timeline-body 3 items, 1 dated |
| Not a chronology | lessons/earth-science/pangaea-continental-drift.html | div.pd-timeline 3 items, 2 dated |
| Not a chronology | lessons/earth-science/volcano-simulator.html | div#timeline-overlay.timeline-overlay 3 items, 1 dated |
| Not a chronology | lessons/earth-science/weather-watch.html | div.ww-radar-timeline 3 items, 0 dated |
| Not a chronology | lessons/life-sciences/human-ear-anatomy.html | ol.fl-timeline is numbered steps of hearing (1–7), not dates |
| Word only | lessons/2d-design/2d-game-dev/2d-pathway.html | mention only |
| Word only | lessons/3d-design/blender/blender-interface-basics.html | mention only |
| Word only | lessons/3d-design/blender/blender-workspaces-pathway.html | mention only |
| Word only | lessons/3d-design/game-asset-studio/game-asset-character-animation.html | mention only |
| Word only | lessons/bible-studies/kingdoms-prophets-exile.html | mention only |
| Word only | lessons/bible-studies/world-of-the-bible.html | mention only |
| Word only | lessons/computer-science/algorithms-and-ai/chess-ai-core.html | mention only |
| Word only | lessons/computer-science/algorithms-and-ai/go-ai.html | mention only |
| Word only | lessons/cosmology/seti-search.html | mention only |
| Word only | lessons/design/origami.html | mention only |
| Word only | lessons/2d-design/pioneers/katsushika-hokusai.html | mention only |
| Word only | lessons/earth-science/ocean-zones.html | mention only |
| Word only | lessons/engineering/arduino-and-electronics/electronics-capstone.html | mention only |
| Word only | lessons/engineering/mechanical-and-civil-design/biomimicry.html | mention only |
| Word only | lessons/godot/godot-animation-game-feel.html | mention only |
| Word only | lessons/godot/godot-pathway.html | mention only |
| Word only | lessons/humanities/history-of-copyright-law.html | mention only |
| Word only | lessons/humanities/nobel-prize.html | mention only |
| Word only | lessons/humanities/social-media-algorithms.html | mention only |
| Word only | lessons/life-sciences/axolotl-neoteny.html | mention only |
| Word only | lessons/mathematics/statistics-and-probability/probability-pachinko.html | mention only |
| Word only | lessons/technical-elements/audio-engineering/audio-compression.html | mention only |
| Word only | lessons/technical-elements/audio-engineering/cymatics.html | mention only |
