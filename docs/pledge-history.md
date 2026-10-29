# Pledge page history reader

Source page: `projects/pledge-flag-simulator.html`; styles: `assets/css/pages/pledge.css`; widget: `assets/js/pledge-history.js`. This standalone page is not generated from student projects.

The widget uses the device's local calendar, including a local-midnight rollover. The date picker explores month/day anniversaries; its year is not the year of the event. It first reads `assets/data/american-history-days.json`, containing 42 selected calendar dates. Library of Congress titles and introductory excerpts are credited, and original ClassroomOS anniversary summaries carry their own credit and institution source URL.

For dates without a saved entry, the widget requests the Library of Congress's public JSON endpoint. It extracts headings and introductory text, removes accessibility icon labels, and displays text only; it never inserts remote articles or their images into the page. The request times out after eight seconds. Rate limits, network errors, or an unavailable article leave a clearly labeled direct link to the selected date's archive, rather than an unrelated event. Fast consecutive date selections cannot overwrite the latest selection. February 29 has its own archive link.

Bulk downloading encountered archive rate limits, so the saved file intentionally does not claim complete annual coverage. Additional dates can be added with the same `MM-DD`, `source`, and `entries` structure. Include source attribution; do not import third-party images without checking rights individually.

The illustrated overview is a starting point for discussion rather than a complete survey textbook. Every image has a teaching caption, credit, source/rights link, and shared photo-lightbox markup. New local image provenance is recorded in `assets/images/american-history/README.md`.

The people pathway links to 19 existing lessons. Four founding-generation cards are explicitly labeled future lesson topics, linking to real archives rather than nonexistent lesson files. When those lessons are published, replace the preview cards with direct local links.

## Era navigation and pre-1492 history

The overview now begins with a dedicated pre-1492 section covering Indigenous diversity, agriculture and exchange, Cahokia, Ancestral Pueblo communities, and the wider Americas. It includes a locally saved, NPS-credited public-domain Long House photograph with the shared lightbox. Ten independently labeled post-1492 sections run from Atlantic contact through contemporary America. All eleven sections have stable anchors and an era navigation menu. Date boundaries are teaching guides rather than claims that every community changed at the same moment.
