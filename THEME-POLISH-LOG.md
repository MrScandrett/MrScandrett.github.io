## Phase 1 — 2026-04-21
- Files changed: 6 (`assets/css/main.css`, `assets/css/lesson-layout.css`, `test-themes.html`, `scripts/check-theme-contrast.mjs`, `package.json`, `THEME-POLISH-LOG.md`)
- Worktree before phase: `THEME-POLISH-PLAN.md` was already untracked from the planning handoff.
- Tokens added: `--surface-0`, `--surface-3`, `--text-strong`, `--text-body`, `--text-muted`, `--text-inverse`, `--text-on-image`, `--border-subtle`, `--border-strong`, `--accent`, `--accent-hover`, `--accent-contrast`, semantic color/contrast pairs, `--focus-ring`, `--font-sans`, `--font-mono`, `--fs-100` through `--fs-800`, `--lh-tight`, `--lh-normal`, `--lh-loose`, `--fw-regular`, `--fw-medium`, `--fw-semibold`, `--fw-bold`, `--space-1` through `--space-10`.
- Contrast fixes: darkened sakura muted text to `#744054`, emerald muted text to `#3e614b`, topaz muted text to `#6f4c00`, moved topaz accent roles to darker AA-safe amber/brown values, strengthened vaporwave line/border roles, and added AA-safe semantic contrast pairs per theme.
- Verification commands:
  - `npm run check:themes` passed for 7 themes and 14 token pairs.
  - `rg -n -- '--ll-[a-z0-9-]+:\s*(#[0-9a-fA-F]{3,8}|rgba?\()' assets/css/lesson-layout.css` returned no matches.
  - `rg -n 'data-theme="honey"|honey' test-themes.html` returned no matches.
  - `git status --short` reviewed before and after phase.
- Deviations from plan: `test-themes.html` intentionally keeps local canary-only CSS and inline swatch `style` attributes that reference CSS variables, because the page is a diagnostic harness rather than production chrome. The broad repo `style=` and `<style>` audits still return many matches; those are explicitly assigned to Phases 2, 4, and 5.
- Screenshots: not captured in this CLI pass. `test-themes.html` is now ready for browser review across all 7 themes.
- Open questions for director: Should Phase 2 include `class-downloads.html`, `quizzes.html`, and `recipe-book.html` as shell pages, or keep the Phase 2 scope exactly to the listed shell files?

## Phase 2 — 2026-04-21
- Files changed: 8 Phase 2 files directly (`index.html`, `about.html`, `applications.html`, `steam-lessons.html`, `showcase.html`, `video-library.html`, `assets/css/classroom-home.css`, `assets/css/liquid-woodland.css`). Phase 1 files remain modified from the prior phase.
- Worktree before phase: Phase 1 changes were still unstaged, including `assets/css/main.css`, `assets/css/lesson-layout.css`, `package.json`, `test-themes.html`, `THEME-POLISH-PLAN.md`, `THEME-POLISH-LOG.md`, and `scripts/check-theme-contrast.mjs`.
- Tokens added: no new canonical color roles; added a compatibility token bridge in `classroom-home.css` for pages that load it without `main.css`.
- Contrast fixes: removed shell inline text colors from `about.html` and `applications.html`; tokenized shell-facing tab, modal, tooltip, search, chip, and card text/surface styles in the listed shell pages; removed old external font imports from shell pages and shared shell CSS.
- Verification commands:
  - `rg -n 'style="[^"]*(color|background|font-family)' index.html about.html applications.html steam-lessons.html browse.html showcase.html students.html project.html video-library.html` returned no matches.
  - `rg -n 'fonts\.googleapis|fonts\.gstatic|fonts\.cdnfonts' index.html about.html applications.html steam-lessons.html browse.html showcase.html students.html project.html video-library.html assets/css/main.css assets/css/classroom-home.css assets/css/liquid-woodland.css` returned no matches.
  - `npm run check:themes` passed for 7 themes and 14 token pairs.
  - Playwright captured 63 screenshots, covering 9 shell pages across 7 themes.
- Deviations from plan: `applications.html` and `video-library.html` still contain intentional simulation/theater/intrinsic media colors in local CSS and JS; those belong to Phase 6. `class-downloads.html`, `quizzes.html`, and `recipe-book.html` were kept out of Phase 2 scope per director shorthand.
- Screenshots: `screenshots/phase-2/` contains 63 PNGs named `<page>-<theme>.png`.
- Open questions for director: none.

### Phase 2 Hold Follow-up — 2026-04-21
- Issue: director spot-check found `applications-vaporwave.png` and `video-library-diamond.png` rendered with light palettes.
- Root cause: the screenshot harness set only `html[data-theme]`, while some existing page CSS still keys theme-specific rules from `body[data-theme]` and `html[data-site-theme]`. A manual `html[data-theme]` change could therefore fail to propagate on pages that rely on those compatibility selectors.
- Fix: updated `assets/js/theme-lighting.js` with a `MutationObserver` that mirrors canonical `html[data-theme]` / `html[data-lighting]` changes onto `body[data-theme]`, `body[data-lighting]`, and `html[data-site-theme]`.
- Verification commands:
  - `node --check assets/js/theme-lighting.js` passed.
  - `npm run check:themes` passed.
  - Phase 2 inline-style acceptance grep still returned no matches.
- Screenshot note: browser automation was unreliable for the two full pages because `applications.html` has parser-blocking external CDN scripts and large inline app initialization. Multiple attempts were stopped after hangs. The underlying propagation bug is fixed in code; the two screenshot artifacts should be recaptured through the normal browser UI or a later hardened harness that seeds theme through `ClassroomOSThemeLighting.setTheme()`.

### Phase 2 Spot-check Gate — 2026-04-21
- Additional issue found: `classroom-home.css` had late duplicate diamond token blocks that redefined `html[data-site-theme="diamond"]` as a pale blue/day-like palette. This made non-liquid shell pages such as `applications.html` render light even when the theme propagation path was correct.
- Fix: replaced both shell diamond definitions in `assets/css/classroom-home.css` with the dark diamond token set used by `main.css`.
- Additional issue found: the `MutationObserver` mirror wrote observed `data-theme` / `data-lighting` values back to `html` unconditionally. In Chromium this could create an observer loop when the theme API changed themes.
- Fix: changed `mirrorHtmlThemeAttributes()` so it only writes mirrored attributes when values differ.
- Verification commands:
  - `node --check assets/js/theme-lighting.js` passed.
  - `node --check scripts/spotcheck-theme-settings.mjs` passed.
  - `npm run check:themes` passed.
  - Phase 2 inline-style acceptance grep still returned no matches.
- Spot-check evidence: `scripts/spotcheck-theme-settings.mjs` generated `screenshots/phase-2-spotcheck/` for `applications.html` vaporwave/diamond, `video-library.html` vaporwave/diamond/topaz, and `steam-lessons.html` topaz. The harness uses the same public theme API that the Settings theme chips call, with the relevant page body classes and theme selectors.
- Result: vaporwave and diamond render dark with legible text; topaz renders amber/cream with legible text.

## Phase 3 — 2026-04-21
- Files changed by this phase: `assets/css/components/lesson-shell.css`, `assets/css/main.css`, `assets/css/rainbows.css`, `assets/css/water-cycle.css`, `assets/css/seasons-and-the-heavens.css`, `lessons/rainbows.html`, `lessons/water-cycle.html`, `scripts/capture-phase-3-screenshots.mjs`, `THEME-POLISH-LOG.md`.
- Worktree note: pre-existing user changes were present in `.claude/launch.json`, `assets/js/rainbows.js`, `lessons/optics.html`, and `lessons/rainbows.html`; those were not reverted. `lessons/rainbows.html` was touched only to add the shared CSS entry point while preserving the existing content changes.
- Component extraction: created `assets/css/components/lesson-shell.css` with token-only rules for lesson headers, TOCs, sections, callouts, figures, data tables, code, quiz cards/options/states, control panels, slider readouts, and HUD overlays. Added compatibility aliases for current lesson classes (`.content-section`, `.wc-card`, `.sth-card`, `.table-of-contents`, `.quiz-question`, `.answer-btn`, `.controls-panel`, `.control-value`, etc.) to avoid broad HTML rewrites.
- Entry point: imported `lesson-shell.css` once from `assets/css/main.css`; `lessons/rainbows.html` and `lessons/water-cycle.html` now load `main.css` before their lesson-specific CSS so the shared chrome applies.
- Dedupe: removed duplicated chrome from `rainbows.css`, `water-cycle.css`, and `seasons-and-the-heavens.css`; kept lesson-specific visuals, simulations, diagrams, hero artwork, custom stage buttons, and bespoke lesson color accents.
- Line counts before/after: `rainbows.css` 1151 -> 773 lines (32.8% shrink); `water-cycle.css` 1019 -> 751 lines (26.3% shrink); `seasons-and-the-heavens.css` 1073 -> 791 lines (26.3% shrink). `liquid-woodland.css` stayed 2191 lines and `classroom-home.css` stayed 14367 lines because their matching rules were broad shell/theme infrastructure rather than removable lesson chrome in this phase.
- Verification commands:
  - `test -f assets/css/components/lesson-shell.css` passed.
  - `rg -n 'lesson-shell.css' assets lessons` returned one import: `assets/css/main.css:1`.
  - `wc -l assets/css/liquid-woodland.css assets/css/classroom-home.css assets/css/seasons-and-the-heavens.css assets/css/rainbows.css assets/css/water-cycle.css` passed and showed the after counts above.
  - `rg -n '#[0-9A-Fa-f]{3,8}' assets/css/components/lesson-shell.css` returned no matches.
  - `node --check scripts/capture-phase-3-screenshots.mjs` passed.
  - `npm run check:themes` passed.
- Screenshots: captured 35 PNGs in `screenshots/phase-3/` for `rainbows.html`, `water-cycle.html`, `seasons-and-the-heavens.html`, `event-horizon-telescope.html`, and `archimedes-principle.html` across day/night/sakura/diamond/emerald/topaz/vaporwave.
- Spot-check notes: dark and light theme body colors apply correctly after fixing the screenshot harness fallback to mirror `html[data-lighting]`. `rainbows.html` intentionally keeps its sky-blue hero illustration under dark palettes as lesson-specific artwork; the shared section chrome below it follows the active theme.
- Gate: Phase 3 implementation is complete and ready for director review. Phase 4 not started.
