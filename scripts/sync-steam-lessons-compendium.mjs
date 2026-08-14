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
  "bible-studies": "module-bible",
};

const icons = ["📐", "⚛️", "🌿", "🛠️", "💻", "📚"];
const modulePresentations = {
  mathematics: {
    subtitle: "Number, proportion, geometry, measurement, probability, and patterns as languages for describing reality",
    level: "K–12 Progression · Mathematics Foundations",
  },
  cosmology: {
    subtitle: "From naked-eye sky patterns and geometric models to planetary systems, deep space, and cosmic perspective",
    level: "K–12 Progression · Earth & Space Science",
  },
  physics: {
    subtitle: "Motion, forces, fields, waves, energy, and modern physics as increasingly powerful models of the natural world",
    level: "K–12 Progression · Physical Science",
  },
  chemistry: {
    subtitle: "Atoms, elements, bonds, reactions, and the transformations that connect microscopic structure to visible matter",
    level: "K–12 Progression · Chemistry Foundations",
  },
  "life-sciences": {
    subtitle: "Cells, heredity, organisms, adaptation, evolution, and the information systems shared by living things",
    level: "K–12 Progression · Life Science",
  },
  "earth-science": {
    subtitle: "Materials, cycles, climate, geology, deep time, and the interacting systems of a changing planet",
    level: "K–12 Progression · Earth & Environmental Science",
  },
  engineering: {
    subtitle: "Circuits, mechanisms, structures, sensors, and feedback systems that turn scientific understanding into working machines",
    level: "K–12 Progression · Engineering Design",
  },
  "fabrication-materials": {
    subtitle: "Materials, tools, CAD, fabrication, optics, fluids, and immersive technologies learned through practical craft",
    level: "K–12 Progression · Fabrication & Materials",
  },
  "technical-elements": {
    subtitle: "Sound, acoustics, signal flow, light, and production systems where physical principles become designed experiences",
    level: "K–12 Progression · Production Technology",
  },
  "computer-science": {
    subtitle: "Symbols, algorithms, search, simulation, and artificial intelligence as machines for organizing thought",
    level: "K–12 Progression · Computer Science & AI",
  },
  "game-development": {
    subtitle: "Design rules, tools, engines, and interactive worlds that unite code, systems thinking, art, and play",
    level: "K–12 Progression · Game Design",
  },
  "visual-design": {
    subtitle: "Color, perception, composition, and experience design as ways of shaping what people notice and understand",
    level: "K–12 Progression · Visual Art & Design",
  },
  "language-literature": {
    subtitle: "Sound, symbol, story, evidence, and interpretation as foundations for communicating and testing meaning",
    level: "K–12 Progression · Communication & Critical Literacy",
  },
  "complex-systems-humanities": {
    subtitle: "Ideas, civilizations, institutions, markets, media, and shared resources viewed as connected human systems",
    level: "K–12 Progression · Social Studies & Systems Thinking",
  },
  "bible-studies": {
    subtitle: "Scripture, history, geography, theology, and Christian formation explored as one connected story",
    level: "K–12 Progression · Bible Studies",
  },
};
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
  const controlledModuleIds = volume.modules.map((module) => sectionIds[module.id]).join(" ");
  const moduleLinks = volume.modules.map((module) =>
    `<a href="#${sectionIds[module.id]}">${escapeHtml(module.title)}</a>`).join("\n          ");
  const volumeSummary = volume.id === "living-earth"
    ? `${lessons.length} lessons · ${volume.modules.length} modules · one connected system from cells to climate`
    : `${lessons.length} lessons · ${volume.modules.length} ${volume.modules.length === 1 ? "module" : "modules"} · organized from foundations toward application`;
  const divider = `
    <section class="compendium-volume-divider" id="volume-${volume.number}" data-compendium-volume="${volume.number}" style="--volume-accent:${volume.theme.accent};--volume-secondary:${volume.theme.secondary};" aria-labelledby="volume-${volume.number}-title">
      <div class="compendium-volume-icon" aria-hidden="true">${icons[volumeIndex]}</div>
      <div class="compendium-volume-copy">
        <span class="compendium-volume-eyebrow">Volume ${roman(volume.number)} · ${escapeHtml(volume.theme.name)}</span>
        <h2 id="volume-${volume.number}-title">${escapeHtml(volume.title)}</h2>
        <p>${volumeSummary}</p>
        <nav aria-label="Modules in Volume ${roman(volume.number)}">
          ${moduleLinks}
        </nav>${buildVolumeFeature(volume)}
      </div>
      <button type="button" class="compendium-volume-toggle" data-volume-toggle="${volume.number}" aria-expanded="true" aria-controls="${controlledModuleIds}">
        <span class="compendium-volume-toggle-label">Collapse volume</span>
        <span class="compendium-volume-toggle-chevron" aria-hidden="true">▾</span>
      </button>
    </section>`;

  const modules = volume.modules.map((module) => {
    const id = sectionIds[module.id];
    const presentation = modulePresentations[module.id];
    let cleanBlock = moduleBlocks.get(id).replace(/\s+data-compendium-volume="\d+"/g, "");
    cleanBlock = cleanBlock.replace(
      /(<h2 class="module-banner-title">)[\s\S]*?(<\/h2>)/,
      `$1${escapeHtml(module.title)}$2`
    );
    if (presentation) {
      cleanBlock = cleanBlock
        .replace(/(<p class="module-banner-sub">)[\s\S]*?(<\/p>)/, `$1${escapeHtml(presentation.subtitle)}$2`)
        .replace(/(<span class="module-banner-level">)[\s\S]*?(<\/span>)/, `$1${escapeHtml(presentation.level)}$2`);
    }
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
    .replace("Mathematical Thinking, Measurement & Astronomy", "Foundations")
    .replace("Physics, Chemistry, Matter & Energy", "Physical Science")
    .replace("Living Systems, Earth & Environment", "Life & Earth")
    .replace("Engineering, Fabrication & Technical Production", "Engineering & Design")
    .replace("Computer Science, AI & Interactive Media", "Computing & AI")
    .replace("Visual Design, Communication & Human Systems", "Arts & Society");
}

function buildVolumeFeature(volume) {
  if (volume.id !== "living-earth") return "";

  const stops = [
    ["Cell", "Microscopic", "lessons/types-of-cells.html"],
    ["Heredity", "Generations", "lessons/dna-heredity.html"],
    ["Biodiversity", "Tree of life", "lessons/life-sciences/animalia/index.html"],
    ["Deep time", "541 million years", "lessons/cambrian-explosion.html"],
    ["Earth cycles", "Water · rock · carbon", "lessons/water-cycle.html"],
    ["Climate", "Planetary feedback", "lessons/climate-simulator.html"],
  ];
  const links = stops.map(([label, scale, href], index) =>
    `<a href="${href}" style="--transect-step:${index}" aria-label="${escapeHtml(label)}: ${escapeHtml(scale)}"><span>${escapeHtml(label)}</span><small>${escapeHtml(scale)}</small></a>`
  ).join("\n            ");

  return `
        <div class="living-systems-transect" aria-label="Explore living Earth from cells to planetary climate">
          <span class="living-systems-transect-label">Change the scale</span>
          <div class="living-systems-transect-track">
            ${links}
          </div>
        </div>`;
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
