import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const filename = path.join(ROOT, "steam-lessons.html");
const html = fs.readFileSync(filename, "utf8");
const plan = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "compendium-plan.json"), "utf8"));
const volumeNavPattern = /\n\s*<!-- COMPENDIUM VOLUME NAV:START -->[\s\S]*?<!-- COMPENDIUM VOLUME NAV:END -->\s*/;
const source = html
  .replace(volumeNavPattern, "\n")
  .replace(/\s*<section class="compendium-volume-divider"[\s\S]*?<\/section>/g, "\n");

const sectionIds = {
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
};

const icons = ["📐", "⚛️", "🌿", "🛠️", "💻", "📚"];
const moduleBlocks = extractModuleBlocks(source);
const expectedIds = plan.volumes.flatMap((volume) => volume.modules.map((module) => sectionIds[module.id]));

if (moduleBlocks.size !== expectedIds.length) {
  throw new Error(`Expected ${expectedIds.length} module sections, found ${moduleBlocks.size}.`);
}
for (const id of expectedIds) {
  if (!moduleBlocks.has(id)) throw new Error(`Missing module section ${id}.`);
}

const orderedRegion = plan.volumes.map((volume, volumeIndex) => {
  const lessons = volume.modules.flatMap((module) => module.units.flatMap((unit) => unit.lessons));
  const moduleLinks = volume.modules.map((module) =>
    `<a href="#${sectionIds[module.id]}">${escapeHtml(module.title)}</a>`).join("\n          ");
  const divider = `
    <section class="compendium-volume-divider" id="volume-${volume.number}" data-compendium-volume="${volume.number}" style="--volume-accent:${volume.theme.accent};--volume-secondary:${volume.theme.secondary};" aria-labelledby="volume-${volume.number}-title">
      <div class="compendium-volume-icon" aria-hidden="true">${icons[volumeIndex]}</div>
      <div class="compendium-volume-copy">
        <span class="compendium-volume-eyebrow">Volume ${roman(volume.number)} · ${escapeHtml(volume.theme.name)}</span>
        <h2 id="volume-${volume.number}-title">${escapeHtml(volume.title)}</h2>
        <p>${lessons.length} lessons · ${volume.modules.length} ${volume.modules.length === 1 ? "module" : "modules"} · organized from foundations toward application</p>
        <nav aria-label="Modules in Volume ${roman(volume.number)}">
          ${moduleLinks}
        </nav>
      </div>
    </section>`;

  const modules = volume.modules.map((module) => {
    const id = sectionIds[module.id];
    const cleanBlock = moduleBlocks.get(id).replace(/\s+data-compendium-volume="\d+"/g, "");
    return cleanBlock.replace(
      /<section class="section module-section reveal"/,
      `<section class="section module-section reveal" data-compendium-volume="${volume.number}"`
    );
  }).join("\n");
  return `${divider}\n${modules}`;
}).join("\n");

const spans = [...moduleBlocks.values()].map((block) => ({
  start: source.indexOf(block),
  end: source.indexOf(block) + block.length,
}));
const regionStart = Math.min(...spans.map((span) => span.start));
const regionEnd = Math.max(...spans.map((span) => span.end));
let updated = `${source.slice(0, regionStart)}${orderedRegion}${source.slice(regionEnd)}`;

const nav = buildVolumeNav(plan);
updated = updated.replace(
  /\n(\s*<nav class="subject-nav" aria-label="Jump to subject"[^>]*>)/,
  `\n${nav}\n$1`
);

fs.writeFileSync(filename, updated);
console.log(`Organized steam-lessons.html into ${plan.volumes.length} volumes and ${expectedIds.length} modules without rewriting module contents.`);

function extractModuleBlocks(source) {
  const blocks = new Map();
  const opening = /<section class="section module-section reveal"[^>]*\sid="(module-[^"]+)"[^>]*>/g;
  for (const match of source.matchAll(opening)) {
    let start = match.index;
    const commentStart = source.lastIndexOf("<!--", start);
    const commentEnd = commentStart >= 0 ? source.indexOf("-->", commentStart) + 3 : -1;
    if (commentStart >= 0 && commentEnd > commentStart && /^\s*$/.test(source.slice(commentEnd, start))) start = commentStart;
    const end = matchingSectionEnd(source, match.index);
    blocks.set(match[1], source.slice(start, end));
  }
  return blocks;
}

function matchingSectionEnd(source, start) {
  const token = /<section\b[^>]*>|<\/section>/gi;
  token.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = token.exec(source))) {
    if (match[0].toLowerCase().startsWith("</section")) depth -= 1;
    else depth += 1;
    if (depth === 0) return token.lastIndex;
  }
  throw new Error(`Unclosed module section at offset ${start}.`);
}

function buildVolumeNav(planData) {
  const links = planData.volumes.map((volume) =>
    `      <button type="button" class="compendium-volume-tab" data-volume-filter="${volume.number}" style="--volume-link:${volume.theme.accent}" role="tab" aria-selected="false"><span>${roman(volume.number)}</span>${escapeHtml(shortTitle(volume.title))}</button>`).join("\n");
  return `    <!-- COMPENDIUM VOLUME NAV:START -->
    <nav class="compendium-volume-tabs" aria-label="Filter by compendium volume" role="tablist">
      <button type="button" class="compendium-volume-tab is-active" data-volume-filter="all" role="tab" aria-selected="true"><span>All</span>All lessons</button>
${links}
    </nav>
    <!-- COMPENDIUM VOLUME NAV:END -->`;
}

function shortTitle(title) {
  return title
    .replace("Mathematics, Measurement & Foundations", "Foundations")
    .replace("Physics, Chemistry & Matter", "Physical World")
    .replace("Engineering, Fabrication & Production", "Making")
    .replace("Computing, AI & Game Development", "Computing")
    .replace("Design, Language, Humanities & Systems", "Human Ideas");
}

function roman(value) {
  return ["", "I", "II", "III", "IV", "V", "VI"][value] || String(value);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]);
}
