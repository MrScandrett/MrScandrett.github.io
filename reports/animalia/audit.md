# Animalia audit and improvements

Date: October 13, 2026. Scope: the three HTML pages and their local assets. Unrelated existing worktree changes were preserved.

## Findings addressed

1. **Scientific grouping:** The backbone sorter was mislabeled as a phylum sorter; vertebrate/invertebrate groups are not phyla. The hub incorrectly promised 23 animals and habitat sorting. It now accurately describes 20 backbone classifications. Six selected phyla are explicitly a subset.
2. **Scientific accuracy:** Removed evolutionary “primitive” language and corrected sponge support, exaggerated regeneration/immortality claims, sea-star water vascular function, chordate/notochord distinctions, and overly absolute vertebrate class traits. Sources: OpenStax Biology 2e, animal body plans and chordates, linked in the lab.
3. **Model limitations:** The six-kingdom model is now labeled as a traditional teaching framework. Protista is not one modern evolutionary lineage. Archaea are not restricted to extreme environments. The bacterial mystery card adds cell-wall chemistry because lack of a nucleus and fission alone do not distinguish bacteria from archaea.
4. **Evidence validity:** Mystery photographs did not match clues (for example, a Paramecium photo paired with Euglena-like traits and a lion paired with a winged visitor). They also revealed the intended kingdom. Replaced them with clearly hypothetical evidence cards.
5. **Teaching sequence:** Added prediction, evidence testing, claim/evidence/reasoning, reflection, and an expandable worked explanation. Removed unfinished quiz and extension placeholders. README now describes actual behavior instead of claiming a completed three-tier certification system.
6. **Interaction:** Sorter feedback persists, explains backbone evidence, reports progress, hides already-placed pool cards, restores focus and dragging on returned cards, and supports replay/reset. Keyboard placement and reduced-motion CSS are retained.
7. **Responsive/accessibility:** Replaced the explorer’s fixed-width sidebar and nested full-height scrolling with a responsive native layout, accessible pressed-state buttons, and a scoped scrollable comparison table. The explorer no longer requires Tailwind or Font Awesome.
8. **Photos:** Removed a competing custom lightbox. Deferred the shared lightbox script so it initializes after the body exists. Captions now include photo credit/license information, including dynamically rendered kingdom photos. Corrected the Paramecium diagram credit.

## Verification

- Changed standalone JS passed `node --check`; main-page inline JS executed without browser errors.
- Chromium interactions passed at 1280×900 and 390×900, with reduced motion requested: mystery answer/check/next, kingdom switching, photo open/Escape, phylum selection, comparison table, written prediction, keyboard card selection, incorrect/correct sorting, card return, all 20 placements, completion, and reset.
- All six page/viewport runs had zero page errors and zero horizontal document overflow. Desktop main-page and mobile explorer screenshots were visually reviewed. Screenshots are temporary QA artifacts, not lesson assets.
- `npm run a11y:page -- animalia`: all three pages clean, zero issues and zero technical failures.
- `npm run check:integrity`: passed, 4,602 project files and 15,413 local references/signatures checked.
- `git diff --check` passed for the changed lesson files.

## Limits and future work

This remains a selected body-plan comparison, not a complete phylogeny or species identification key. Written responses are page-local and are not saved or submitted. No new standalone certification quiz was added. Automated accessibility checks and desktop Chromium mobile emulation do not establish real-device or comprehensive screen-reader behavior. The main page retains its existing dark visual design; the sorter retains its Tailwind-based layout. No commit or push was requested.
