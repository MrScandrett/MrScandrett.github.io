# Classification of life and Animalia

Three connected classroom activities:

- `index.html`: classification history, traditional six-kingdom model and its limits, naming, ancestry, and six hypothetical evidence cards.
- `sorter.html`: classify 20 animals by backbone evidence, with click/keyboard placement and optional desktop dragging. This is not phylum classification.
- `explorer.html`: compare six selected animal phyla, predict relationships, and write a claim supported by body-plan evidence.

The selected phyla are not an exhaustive list. Vertebrate and invertebrate are not two phyla. The six-kingdom model is a historical teaching framework rather than a complete modern phylogeny.

## Teaching sequence

Allow 45–60 minutes for the main lesson, or use the sorter (10–15 minutes) and body-plan lab (20–30 minutes) separately. Ask students to predict, test with evidence, explain a classification, and revise their reasoning. Written lab responses remain on the current page only; they are not saved or submitted. Print or record responses before leaving.

## Source and maintenance

`assets/animal-lab.css` is the shared look for the sorter and the body-plan lab (the same teal-on-ink field notebook as `index.html`); `assets/animal-sorter.css` skins only the sorting game. `assets/animal-data.js` supplies the body-plan lab, including each phylum's photo and credit (images in `assets/images/classification-of-life/phyla/`). `assets/animal-explorer.js` renders the explorer and comparison table. The sorter maintains its own 20-animal set in `assets/animal-sorter.js`. No build is needed. Edit these source files directly.

Scientific references are linked in the lesson. Photos use the shared `photo-lightbox.js`; credits and licenses belong in each figure caption. Keep speculative evidence cards visually separate from actual organism photographs.

## Verification

Check JavaScript syntax, run the pages through desktop and mobile Chromium interactions, and run `npm run a11y:page -- animalia` plus `npm run check:integrity`. See `reports/animalia/audit.md` for the October 2026 audit.
