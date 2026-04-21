# Theme Polish — Master Implementation Plan

**Director:** Claude (Opus 4.7)
**Implementer:** Codex (OpenAI)
**Repo:** GitHubTutorialSTEAM
**Goal:** Unified, legible theming across every page and lesson, across all 7 palettes (day, night, sakura, diamond, emerald, topaz, vaporwave).
**Implementation style:** Codex should make small, reviewable changes, stop at phase gates, and treat this file as the source of truth.

---

## Director contract

Codex is the implementer. The director owns scope, phase approvals, and theme taste decisions.

Codex must:

1. Work in the current repo only. Do not rewrite history or reset user changes.
2. Before starting a phase, inspect the current worktree and note any unrelated dirty files in `THEME-POLISH-LOG.md`.
3. Implement exactly one phase at a time.
4. Stop after each phase and report results. Do not proceed to the next phase until the director explicitly approves.
5. Prefer existing CSS architecture and class names. Add new abstractions only where this plan calls for them.
6. Preserve educational content, DOM semantics, interactive behavior, and lesson copy unless a style migration requires adding token-backed classes.
7. Keep each phase shippable. If a phase cannot fully pass, stop, document the blocker, and propose the smallest recovery path.

Codex must not:

1. Add new palettes, rename themes, or change the theme switching API.
2. Introduce web fonts or external assets without director approval.
3. Delete lesson stylesheets without director approval.
4. Use hardcoded colors in new component rules, except inside token definitions.
5. Bulk-transform lesson HTML before the director approves the transform strategy.

---

## Current audit snapshot

Use this snapshot as the starting hypothesis, then verify against the current files before editing.

- `assets/css/main.css` owns the current global tokens and 7 theme palettes.
- The existing theme API is `html[data-theme="sakura"]`, `html[data-theme="diamond"]`, `html[data-theme="emerald"]`, `html[data-theme="topaz"]`, `html[data-theme="vaporwave"]`, plus default day and `html[data-lighting="night"]` for night.
- `assets/css/lesson-layout.css` currently defines a parallel `--ll-*` token silo, including hardcoded tab colors such as `#64748b`, `#007aff`, and `#7eb8ff`.
- `test-themes.html` is currently too thin as a canary and even starts with `data-theme="honey"`, which is not one of the canonical 7 palettes. Phase 1 should normalize it.
- Known global hardcoded component colors exist below the token blocks in `assets/css/main.css`; Phase 1 should replace those that directly conflict with the new tokens, and later phases should finish page-specific cleanup.
- Many lesson files contain inline `<style>` blocks and `style=` attributes. Do not try to solve all of them in Phase 1.

Canonical theme list for all checks:

1. day/default: remove `data-theme` and `data-lighting`, or use the existing default state.
2. night: use `data-lighting="night"` unless Phase 1 adds an explicit compatible `data-theme="night"` bridge.
3. sakura: `data-theme="sakura"`
4. diamond: `data-theme="diamond"`
5. emerald: `data-theme="emerald"`
6. topaz: `data-theme="topaz"`
7. vaporwave: `data-theme="vaporwave"`

---

## Operating rules for the implementer

1. **Do not invent new palettes or rename existing themes.** Keep the `html[data-theme="..."]` attribute pattern in `assets/css/main.css`.
2. **Every color, font, spacing, and radius must flow from a CSS custom property** defined at `:root` or overridden per theme. No new hardcoded hex values in lesson files.
3. **Verify contrast at WCAG AA (4.5:1 body, 3:1 large text)** for every `--text-*` role against its paired `--surface-*` in every theme. Fail the phase if any pair is under.
4. **Work phase-by-phase.** Do not start Phase N+1 until Phase N's acceptance checks pass. Commit at phase boundaries with message `theme(phase-N): <summary>`.
5. **Preserve lesson behavior.** Styling changes only — no JS logic edits, no content rewrites, no layout restructuring beyond what shared components require.
6. **Use `test-themes.html` as the canary.** Extend it with any new token previews added.
7. **Ask the director (via PR comment or commit body) before:** deleting a stylesheet, changing a theme's brand hue, introducing a webfont, or altering global typography weights.

---

## Required verification commands

Run these from the repo root when relevant. If a command fails because a tool is missing, document the failed command and fallback.

Before every phase:

```sh
git status --short
rg -n 'style="[^"]*(color|background|font-family)' .
rg -n '<style\\b' .
```

Phase 1:

```sh
rg -n '#[0-9a-fA-F]{3,8}' assets/css/main.css assets/css/lesson-layout.css test-themes.html
rg -n '--ll-[a-z0-9-]+:\\s*(#[0-9a-fA-F]{3,8}|rgba?\\()' assets/css/lesson-layout.css
rg -n 'data-theme="honey"|honey' test-themes.html
```

Phase 2:

```sh
rg -n 'style="[^"]*(color|background|font-family)' index.html about.html applications.html steam-lessons.html browse.html showcase.html students.html project.html video-library.html
rg -n 'font-family\\s*:' index.html about.html applications.html steam-lessons.html browse.html showcase.html students.html project.html video-library.html assets/css/*.css
```

Phase 3:

```sh
test -f assets/css/components/lesson-shell.css
rg -n 'lesson-shell.css' .
wc -l assets/css/liquid-woodland.css assets/css/classroom-home.css assets/css/seasons-and-the-heavens.css assets/css/rainbows.css assets/css/water-cycle.css
```

Phase 4:

```sh
rg -n 'style="[^"]*(color|background|font-family)' lessons/expert-system.html lessons/universe-expansion.html lessons/rubiks-cube-math.html lessons/cad-camera-controls.html lessons/archimedes-principle.html lessons/event-horizon-telescope.html lessons/arecibo-message.html lessons/falling-coil.html lessons/universal-gravitation.html lessons/ngram-predictor.html
```

Phase 5:

```sh
rg -l 'style="[^"]*(color|background|font-family)' lessons/
test -f THEME-POLISH-PROGRESS.md
```

Global final:

```sh
rg -n 'style="[^"]*(color|background|font-family)' .
rg -n '#[0-9a-fA-F]{3,8}' assets/css lessons/*.html *.html
```

The hex checks are diagnostic, not automatic failure. Token definitions, gradients, and simulation-intrinsic visuals may legitimately contain literal colors. Component and page styling should not.

---

## Contrast verification requirements

Codex must add or use a small repeatable contrast check during Phase 1. Preferred path:

1. Create `scripts/check-theme-contrast.mjs`.
2. Hardcode the required token pair matrix from this plan.
3. Parse the CSS token values for each theme, resolving simple token aliases where practical.
4. Fail with a readable table when any required pair misses the threshold.

Minimum required pairs:

| Pair | Threshold |
| --- | --- |
| `--text-strong` on `--surface-0` | 4.5 |
| `--text-body` on `--surface-0` | 4.5 |
| `--text-muted` on `--surface-0` | 4.5 |
| `--text-strong` on `--surface-1` | 4.5 |
| `--text-body` on `--surface-1` | 4.5 |
| `--text-muted` on `--surface-1` | 4.5 |
| `--text-strong` on `--surface-2` | 4.5 |
| `--text-body` on `--surface-2` | 4.5 |
| `--accent-contrast` on `--accent` | 4.5 |
| `--danger-contrast` on `--danger` | 4.5 |
| `--success-contrast` on `--success` | 4.5 |
| `--warning-contrast` on `--warning` | 4.5 |
| `--info-contrast` on `--info` | 4.5 |
| `--border-strong` on `--surface-0` | 3.0 |

If parsing CSS variables proves brittle, Codex may create a checked JSON sidecar for token values, but `main.css` remains the runtime source of truth.

---

## Phase 1 — Token foundation

**Files:** `assets/css/main.css`, `assets/css/lesson-layout.css`, `test-themes.html`

**Tasks:**
1. Add the following roles to `:root` in `main.css`, and override each in every `html[data-theme="..."]` block:
   - **Surfaces:** `--surface-0` (page bg), `--surface-1` (card), `--surface-2` (raised), `--surface-3` (overlay/modal).
   - **Text:** `--text-strong` (headings), `--text-body` (paragraph), `--text-muted` (secondary), `--text-inverse` (on accent).
   - **Borders:** `--border-subtle`, `--border-strong`.
   - **Accents:** `--accent`, `--accent-hover`, `--accent-contrast` (text on accent).
   - **Semantic:** `--danger`, `--success`, `--warning`, `--info` (+ matching `-contrast` for text on fill).
   - **Focus:** `--focus-ring` (2px outline color, always AA vs every surface).
   - Preserve legacy aliases during migration: `--bg`, `--text`, `--muted`, `--line`, `--white`, `--blue`, `--theme-accent`, `--theme-accent-strong`, and `--theme-accent-soft` should point to or remain compatible with the new canonical roles.
2. Add type scale: `--font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`, `--font-mono`, sizes `--fs-100` (12px) through `--fs-800` (48px) at 1.2 ratio, line heights `--lh-tight: 1.2`, `--lh-normal: 1.5`, `--lh-loose: 1.7`, weights `--fw-regular: 400`, `--fw-medium: 500`, `--fw-semibold: 600`, `--fw-bold: 700`.
3. Add spacing scale `--space-1: 4px` through `--space-10: 80px` (4, 8, 12, 16, 24, 32, 48, 64, 72, 80).
4. In `lesson-layout.css`, replace every `--ll-*` hardcoded color with `var(--…)` core token. Keep the `--ll-*` names as aliases if lesson files reference them: `--ll-tab-color: var(--text-muted);` etc.
5. Fix known contrast failures:
   - Topaz `--muted: #8a6412` → darken to reach ≥ 5:1 on `#fff9e3`.
   - Vaporwave `--line: rgba(255,0,255,0.44)` → replace with a token that meets 3:1 for borders.
   - Sakura/emerald: ensure body text roles hit 4.5:1.
6. Extend `test-themes.html`: render swatches for every new token role, sample paragraph + heading + button + link + code block + callout, under each theme.
7. Add `scripts/check-theme-contrast.mjs` and an npm script if appropriate. The script must run without network access.
8. Create `THEME-POLISH-LOG.md` and append the Phase 1 report.

**Acceptance:**
- Open `test-themes.html`, cycle all 7 themes, no unreadable combinations.
- `rg "#[0-9a-fA-F]{3,6}" assets/css/main.css | grep -v -- "--"` returns only values inside theme definitions (no stray hex in component rules).
- No visual regression on `index.html`.
- `node scripts/check-theme-contrast.mjs` passes, or the log documents why a different local command was used.
- `test-themes.html` no longer references noncanonical `honey`.

---

## Phase 2 — Shell pages

**Files:** `index.html`, `about.html`, `applications.html`, `steam-lessons.html`, `browse.html`, `showcase.html`, `students.html`, `project.html`, `video-library.html`, and any CSS they include.

**Tasks:**
1. Replace hardcoded colors/fonts in `<style>` blocks and inline `style=` attributes with Phase 1 tokens.
2. Audit each page under all 7 themes (use browser devtools to set `data-theme`). Capture screenshots into `/screenshots/phase-2/<page>-<theme>.png` for director review.
3. Remove font-stack overrides — all shell pages should inherit `--font-sans`.
4. Ensure nav header, hero, footer, and primary CTA buttons use `--accent` / `--accent-contrast`.

**Acceptance:**
- Every shell page renders correctly across 7 themes (no light-on-light, no dark-on-dark, no broken spacing).
- `rg 'style="[^"]*(color|background|font-family)' index.html about.html applications.html steam-lessons.html browse.html showcase.html students.html project.html video-library.html` returns 0 matches.
- Append the Phase 2 report to `THEME-POLISH-LOG.md`, including screenshot paths and any pages needing director review.

---

## Phase 3 — Shared lesson chrome

**Files:** new `assets/css/components/lesson-shell.css`; update `assets/css/main.css` to `@import` it; audit `liquid-woodland.css`, `classroom-home.css`, `seasons-and-the-heavens.css`, `rainbows.css`, `water-cycle.css`.

**Tasks:**
1. Extract these reusable component rules into `lesson-shell.css` (use tokens only):
   - `.lesson-header`, `.lesson-toc`, `.lesson-section`
   - `.callout`, `.callout--info`, `.callout--warning`, `.callout--danger`, `.callout--success`
   - `figure`, `figcaption`
   - `.data-table`
   - `pre`, `code`
   - `.quiz-card`, `.quiz-option`, `.quiz-option--correct`, `.quiz-option--wrong`
   - `.control-panel` (from `eht-ui.css` patterns)
   - `.slider-readout` (from `archimedes/fluid-sim.css` patterns)
   - `.hud-overlay`
2. Remove duplicate definitions from per-lesson stylesheets. Keep lesson-specific visuals (canvas, diorama, bespoke layouts) — strip only the chrome.
3. Document each component with a one-line comment at the top of its rule block.

**Acceptance:**
- `lesson-shell.css` exists and is imported once.
- At least 3 lesson stylesheets shrink by ≥ 20% of their current line count.
- No lesson page visually regresses (spot-check 5 lessons per theme).
- Append the Phase 3 report to `THEME-POLISH-LOG.md`, including before/after line counts for shrunk stylesheets.

---

## Phase 4 — Worst-offender lessons

**Files (in this order):**
1. `lessons/expert-system.html`
2. `lessons/universe-expansion.html`
3. `lessons/rubiks-cube-math.html`
4. `lessons/cad-camera-controls.html`
5. `lessons/archimedes-principle.html`
6. `lessons/event-horizon-telescope.html`
7. `lessons/arecibo-message.html`
8. `lessons/falling-coil.html`
9. `lessons/universal-gravitation.html`
10. `lessons/ngram-predictor.html`

**Tasks per lesson:**
1. Replace every inline `style="color:…|background:…|font-family:…"` with a class that references tokens.
2. Move remaining needed `<style>` content to a sibling CSS file under `assets/css/lessons/<slug>.css` if not already; otherwise fold into `lesson-shell.css`.
3. Verify each lesson loads cleanly under all 7 themes. Screenshot `/screenshots/phase-4/<slug>-<theme>.png` per theme.

**Acceptance:**
- `rg 'style="[^"]*(color|background|font-family)' lessons/<slug>.html` → 0 for each slug.
- All 7 themes render legibly. Contrast checker (axe or Lighthouse) reports no contrast violations.
- Append the Phase 4 report to `THEME-POLISH-LOG.md`, with one note per lesson.

---

## Phase 5 — Remaining 85 lessons

**Files:** all other `lessons/*.html`.

**Tasks:**
1. Mechanical sweep using a scripted transform (director will approve the transform script before bulk-apply):
   - Strip `<style>` rules that duplicate `lesson-shell.css` selectors.
   - Convert inline color/bg/font styles to token-backed classes.
2. For each lesson, run a 7-theme visual check. Track progress in `THEME-POLISH-PROGRESS.md` (create this file; one row per lesson, columns: slug, tokenized, day, night, sakura, diamond, emerald, topaz, vaporwave, notes).

**Acceptance:**
- `THEME-POLISH-PROGRESS.md` has every lesson marked complete with all theme columns ✅.
- `rg -l 'style="[^"]*(color|background|font-family)' lessons/` returns no results.
- Append the Phase 5 report to `THEME-POLISH-LOG.md`, including the approved transform script or manual process used.

---

## Phase 6 — Interactive simulations

**Files:** `assets/css/eht-ui.css`, `assets/css/archimedes/fluid-sim.css`, `assets/css/labs/blocks-world/*`, `assets/css/life-lab.css`, `music-lab.html`, `ai-studio-galaxy.html`, and any sim overlay/HUD CSS.

**Tasks:**
1. Audit every HUD/overlay for legibility when the underlying canvas renders light or dark imagery. Where a canvas background varies, use a semi-opaque `--surface-2` panel behind HUD text.
2. Ensure sliders, toggles, buttons in sims use `--accent` + `--accent-contrast`; readouts use `--text-strong` on `--surface-2`.
3. Preserve simulation-intrinsic visuals (particle colors, shader output, game pieces). Only theme the chrome around them.

**Acceptance:**
- HUDs readable on any frame of the simulation, any theme.
- Controls visually consistent with shell buttons from Phase 2.
- Append the Phase 6 report to `THEME-POLISH-LOG.md`, including any simulation visuals intentionally left hardcoded.

---

## Global acceptance (end of all phases)

- [ ] All 7 themes pass WCAG AA for text roles.
- [ ] No inline color/background/font-family `style=` in any HTML file.
- [ ] One canonical font stack everywhere (`--font-sans`), except intentional display fonts loaded explicitly.
- [ ] `test-themes.html` shows every token role and every component.
- [ ] `THEME-POLISH-PROGRESS.md` fully green.
- [ ] Lighthouse accessibility score ≥ 95 on `index.html`, `steam-lessons.html`, and a sampled 5 lessons.

---

## Reporting protocol

At the end of each phase, append a section to `THEME-POLISH-LOG.md` (create on Phase 1):

```
## Phase <N> — <date>
- Files changed: <count>
- Worktree before phase: <summary of pre-existing dirty files>
- Tokens added: <list>
- Contrast fixes: <list>
- Verification commands: <commands run and pass/fail>
- Deviations from plan: <list with rationale>
- Screenshots: <path>
- Open questions for director: <list>
```

The director reviews each log entry before green-lighting the next phase.

---

## Director review checklist

Use this checklist when Codex reports a phase complete.

- The phase stayed within scope.
- The log names pre-existing dirty files and does not claim unrelated work.
- Required commands were run or a credible fallback is documented.
- New colors appear only in token definitions or intentional simulation visuals.
- The theme API still works for all 7 canonical themes.
- `test-themes.html` demonstrates any new token or component role.
- Screenshots or visual checks cover the required pages/themes.
- Open questions are explicit enough for a yes/no or small directive.

Approval phrase for Codex: `Approved: proceed to Phase <N+1>.`
