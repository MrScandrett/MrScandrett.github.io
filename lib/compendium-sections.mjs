// Maps a compendium-plan.json module id to the <section id="..."> it renders as
// on steam-lessons.html. Shared by every script that needs to cross-reference the
// plan against the rendered page (sync-steam-lessons-compendium.mjs writes the
// banners, build-compendium-outline.mjs and sync-lessons.mjs validate them).
export const MODULE_SECTION_IDS = {
  mathematics: "module-math",
  physics: "module-physics",
  chemistry: "module-chemistry",
  "life-sciences": "module-lifesci",
  "earth-science": "module-earth",
  cosmology: "module-space",
  engineering: "module-engineering",
  "fabrication-materials": "module-fabrication",
  "technical-elements": "module-technical-elements",
  "computer-science": "module-cs",
  "game-development": "module-gamedev",
  "visual-design": "module-art",
  "language-literature": "module-language",
  "complex-systems-humanities": "module-systems",
  "bible-studies": "module-bible",
};
