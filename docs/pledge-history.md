# Pledge page history reader

Source page: `projects/pledge-flag-simulator.html`; styles: `assets/css/pages/pledge.css`; widget: `assets/js/pledge-history.js`. This standalone page is not generated from student projects.

The widget uses the device's local calendar, including a local-midnight rollover. The date picker explores month/day anniversaries; its year is not the year of the event. It first reads `assets/data/american-history-days.json`, containing 42 selected calendar dates. Library of Congress titles and introductory excerpts are credited, and original ClassroomOS anniversary summaries carry their own credit and institution source URL.

For dates without a saved entry, the widget requests the Library of Congress's public JSON endpoint. It extracts headings and introductory text, removes accessibility icon labels, and displays text only; it never inserts remote articles or their images into the page. The request times out after eight seconds. Rate limits, network errors, or an unavailable article leave a clearly labeled direct link to the selected date's archive, rather than an unrelated event. Fast consecutive date selections cannot overwrite the latest selection. February 29 has its own archive link.

Bulk downloading encountered archive rate limits, so the saved file intentionally does not claim complete annual coverage. Additional dates can be added with the same `MM-DD`, `source`, and `entries` structure. Include source attribution; do not import third-party images without checking rights individually.

The illustrated overview is a starting point for discussion rather than a complete survey textbook. Every image has a teaching caption, credit, source/rights link, and shared photo-lightbox markup. New local image provenance is recorded in `assets/images/american-history/README.md`.

The people pathway links to 19 existing lessons. Four founding-generation cards are explicitly labeled future lesson topics, linking to real archives rather than nonexistent lesson files. When those lessons are published, replace the preview cards with direct local links.

## Era navigation and pre-1492 history

The overview now begins with a dedicated pre-1492 section covering Indigenous diversity, agriculture and exchange, Cahokia, Ancestral Pueblo communities, and the wider Americas. It includes a locally saved, NPS-credited public-domain Long House photograph with the shared lightbox. Ten independently labeled post-1492 sections run from Atlantic contact through contemporary America. All eleven sections have stable anchors and an era navigation menu. Date boundaries are teaching guides rather than claims that every community changed at the same moment.

## Flag presentation

The presentation uses `assets/js/pledge-presentation.js` for four stationary,
measured passages (9, 7, 6, and 6 seconds), with pause, resume, restart, progress,
and optional instrumental music. Music starts disabled. Playback waits while the
presentation is off screen or the tab is hidden. Native fullscreen has an expanded
page fallback for browsers without that API; Escape exits the fallback.

`assets/js/pledge-flag.mjs` uses the shared vendored Three.js bundle,
`sim-kit-three.mjs`, and `SimKit.loop`. The cloth is attached to an upright pole;
its primary folds integrate tangent angles to preserve length along the fly.
Fine woven relief, double-stitched hems, grommets, a silver pole, a small brass
finial, and directional daylight provide detail without decorative effects.
The motion is an illustration, not a physical cloth simulation. Wind presets
blend gradually. A separate flag pause control and live reduced-motion preference
keep motion optional. Rendering pauses when hidden or away from the viewport.

The original vector construction, `assets/images/american-flag.svg`, is both
the cloth texture and the static fallback if WebGL is unavailable. It has fifty
five-pointed stars in nine alternating rows of six and five, thirteen equal
stripes beginning and ending with red, a 10:19 outline, a union covering seven
stripes with a fly of 0.76 times the flag's hoist, and stars whose diameter is
0.0616 times the hoist. Star centers divide the union into twelve horizontal
and ten vertical intervals. These use the construction ratios accompanying
[Executive Order 10834](https://www.govinfo.gov/content/pkg/USCODE-2022-title4/html/USCODE-2022-title4-chap1-sec1.htm).
SVG colors are screen approximations; lighting and cloth folds affect their
appearance. The former GLB model and fireworks are no longer loaded by this page.

## Optional national-landmark webcam

Added 2026-10-29. `assets/js/pledge-camera.js` supplies a view selector alongside
the existing pledge. The initial view remains the local rendered flag, and no
webcam request is made until the user selects it. The current free option is the
National Park Service's Devils Tower visitor-center flag camera:

- [Official camera page](https://www.nps.gov/media/webcam/view.htm?id=353840EE-9D49-67A6-C3D2292B5251E4DD)
- [Published image endpoint](https://www.nps.gov/webcams-deto/deto5.jpg)
- [NPS ownership and reuse notice](https://www.nps.gov/aboutus/disclaimer.htm)

The NPS camera page identifies this as a still image updated every 60 seconds,
not streaming video. Its published image URL was verified directly and the image
visually checked for the American flag on 2026-10-29. The camera is NPS-operated
with no separate third-party credit on its camera page; the NPS ownership notice
generally places its own work in the public domain unless otherwise indicated.
The page credits NPS, links to the source, preserves the full camera frame, and
uses neither NPS insignia nor a claim of NPS endorsement. Recheck the owning
source and its credits before adding or replacing any camera.

Images are requested directly from NPS, at most once per minute automatically;
manual refresh is also available. The displayed receipt time is explicitly not
a camera capture time or a guarantee of freshness. Automatic updates stop when
the user freezes the image, pauses the pledge, hides the tab, scrolls away, or
returns to the rendered flag. Automatic offscreen work and all tab-hidden or
superseded requests are canceled; explicit selections/manual refreshes may finish
below the fold or while pledge playback is paused. Late callbacks cannot replace a newly selected view. The first request times out after
12 seconds and returns to the rendered flag on failure. A later refresh failure
keeps the previous image and labels it as the last received image. The shared
photo lightbox enlarges the current snapshot with its caption and credit.

Fort McHenry and Pearl Harbor are provided as links to official/provider pages,
not embedded feeds. [EarthCam's FAQ](https://www.earthcam.com/faq.php) directs
website embedding requests to licensing; its NPS partnerships do not establish
free reuse permission. The NPS Pearl Harbor camera listing currently has no
working embedded player in its served HTML, so the link uses the actual EarthCam
provider page. The old CamStreamer Frying Pan flag listing was not admitted:
[the station operator](https://fpsls.com/stay) says no camera currently operates
there, despite old listings describing it as live. No accounts, paid services,
stream extraction, proxying, or archived footage presented as live are involved.
