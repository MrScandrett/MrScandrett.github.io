# Mr. Scandrett's ClassroomOS

A static STEAM learning platform, lesson library, application directory, and
student showcase published from `main` with GitHub Pages.

## Run locally

```bash
npm ci
node serve-local.js
```

Open <http://localhost:8080/>.

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
