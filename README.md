# Mr. Scandrett's ClassroomOS

A static STEAM learning platform, lesson library, application directory, and
student showcase published from `main` with GitHub Pages.

## Run locally

```bash
npm ci
node serve-local.js
```

Open <http://localhost:8080/>.

### Local OSeditor

Open any page on <http://localhost:8080/>, then choose **Settings → Editor → Edit this page**
to open that page in OSeditor (the editor's page picker lets you switch pages once inside;
`/OSeditor.html?page=/path/to/page.html` is the underlying link). Edit and preview site files there. Student
workspace downloads are always available. Writing back to the repository is
disabled by default; start the server with an explicit password to enable the
**Write to source** button:

```bash
ADMIN_PASS='choose-a-strong-password' node serve-local.js
```

The development server binds to `127.0.0.1` by default. Do not expose the editor
to a classroom network. The password is kept only in the server process and is
requested again for each save.

OSeditor is one universal guided workbench. Choose a page or student project to
open its connected editable files, or select **Entire ClassroomOS source** when
you need the complete source tree. Code Coach identifies common HTML, CSS, and
JavaScript patterns, explains their purpose, and points to useful edits by file
and line number.

Experiment in the isolated preview and download a reopenable workspace ZIP. Use
**Open workspace ZIP** to continue that work later or bring it back by USB. ZIP
work remains temporary unless someone deliberately confirms **Write to source**
and supplies the server password. Review the resulting Git diff before committing
or pushing.

## Repository map

- `lessons/` — interactive lesson pages
- `data/lessons.json` — lesson catalog metadata
- `student-projects/` — canonical student project sources
- `apps/` — generated showcase output
- `assets/` — shared styles, scripts, images, models, video, and data
- `scripts/` — build, synchronization, and verification tools
- `portal/` — local-only publishing portal

## Student showcase pipeline

`apps/` is generated output. Never make a lasting fix directly in an app
directory: the next build deletes it and rebuilds from `student-projects/`.

Add web apps under:

```text
student-projects/<Student>/<Project>/index.html
```

Scratch, STL/OBJ, and Pivot files are also supported. Build every showcase
project from its canonical source with:

```bash
npm run build -- --strict
```

The build writes app bundles under `apps/<slug>/` and regenerates
`apps/manifest.json`. Display metadata and thumbnails can be customized in
`data/manifest-overrides.json`.

## Quality checks

```bash
npm run quality
npm run a11y
npm run check:theme-readability
```

`npm run quality` verifies local references, asset signatures, theme tokens,
lesson print controls, compendium coverage, and interactive student games.
The accessibility and full theme-readability sweeps launch a local Chromium
browser and take longer.

The accessibility runner audits every URL in `.pa11yci.json` with isolated
browser workers, reduced-motion emulation, and a no-WebGL audit mode so GPU-heavy
lessons cannot stall the rest of the sweep. It writes the complete machine-readable
result to `reports/accessibility/latest.json` and compares violations with
`data/a11y-baseline.json`; technical failures and any issue above the checked-in
baseline fail the command. For a quick source-page check, run:

```bash
npm run a11y:page -- ohms-law
```

Only refresh the ratchet after reviewing and accepting the complete report:

```bash
npm run a11y:update-baseline
```

## Release build

```bash
npm run build:dist
npm run check:dist
```

The release builder creates a minified `dist/`, generates `sitemap.xml` and
`robots.txt`, and excludes canonical student sources, local portal code, build
scripts, and internal documentation. `check:dist` enforces that public/private
boundary and the artifact-size budget.

GitHub Actions performs a strict full showcase rebuild, runs the quality gate,
builds `dist/`, validates it, and then deploys the artifact to Pages.
