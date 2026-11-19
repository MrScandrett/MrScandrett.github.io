import fs from "node:fs";
import path from "node:path";
import { MODULE_SECTION_IDS } from "../lib/compendium-sections.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const filename = path.join(ROOT, "steam-lessons.html");
const html = fs.readFileSync(filename, "utf8");
const plan = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "compendium-plan.json"), "utf8"));
// --check reports drift without writing, so `npm run quality` catches a page that
// has fallen out of step with the plan (stale volume counts, a missing module).
const CHECK = process.argv.includes("--check");
// The volume tabs live inside the module browser's heading; they are rewritten in
// place between these markers rather than moved, so page layout stays hand-authored.
const volumeNavPattern = /([ \t]*)<!-- COMPENDIUM VOLUME NAV:START -->[\s\S]*?<!-- COMPENDIUM VOLUME NAV:END -->/;
if (!volumeNavPattern.test(html)) throw new Error("steam-lessons.html is missing the COMPENDIUM VOLUME NAV markers.");
const source = html
  .replace(/\s*<section class="compendium-volume-divider"[\s\S]*?<\/section>/g, "\n");

const sectionIds = MODULE_SECTION_IDS;

const icons = ["📐", "⚛️", "🌿", "🛠️", "💻", "📚"];
const modulePresentations = {
  "2d-design": { subtitle: "Drawing, layout, animation, and 2D game art.", level: "K–12 · Pioneers → Make It Move → Make It Play" },
  "3d-design": { subtitle: "CAD, 3D printing, Blender, and game assets.", level: "Grades 7–12 · Foundation → Three Outcome Tracks" },
  mathematics: {
    subtitle: "Numbers, measurement, algebra, geometry, statistics, and calculus.",
    level: "K–12 Progression · Mathematics Foundations",
  },
  cosmology: {
    subtitle: "Constellations, planetary orbits, telescopes, and the expanding universe.",
    level: "K–12 Progression · Earth & Space Science",
  },
  physics: {
    subtitle: "Motion, energy, waves, electricity, and modern physics.",
    level: "K–12 Progression · Physical Science",
  },
  chemistry: {
    subtitle: "Atoms, bonding, reactions, and chemical calculations.",
    level: "K–12 Progression · Chemistry Foundations",
  },
  "life-sciences": {
    subtitle: "Cells, heredity, ecosystems, evolution, and body systems.",
    level: "K–12 Progression · Life Science",
  },
  "earth-science": {
    subtitle: "Rocks, weather, oceans, plate tectonics, and climate.",
    level: "K–12 Progression · Earth & Environmental Science",
  },
  engineering: {
    subtitle: "Mechanisms, circuits, robotics, structures, and feedback control.",
    level: "K–12 Progression · Engineering Design",
  },
  "fabrication-materials": {
    subtitle: "Workshop tools, material properties, optics, and fabrication.",
    level: "K–12 Progression · Fabrication & Materials",
  },
  "technical-elements": {
    subtitle: "Stagecraft, sound, lighting, cameras, and live production.",
    level: "K–12 Progression · Production Technology",
  },
  "computer-science": {
    subtitle: "Programming, algorithms, simulation, and AI.",
    level: "K–12 Progression · Computer Science & AI",
  },
  "web-design": {
    subtitle: "HTML, CSS, JavaScript, servers, and publishing your own site.",
    level: "Grades 6–12 · Build Your Own Web",
  },
  "game-development": {
    subtitle: "Game mechanics, programming, engines, testing, and release.",
    level: "K–12 Progression · Game Design",
  },
  "visual-design": {
    subtitle: "Color, typography, visual perception, and media.",
    level: "K–12 Progression · Visual Art & Design",
  },
  music: {
    subtitle: "Sound, notation, instruments, composers, and production.",
    level: "K–12 Progression · Music",
  },
  "language-literature": {
    subtitle: "Languages, writing systems, literature, and media literacy.",
    level: "K–12 Progression · Communication & Critical Literacy",
  },
  "complex-systems-humanities": {
    subtitle: "History, philosophy, economics, and social systems.",
    level: "K–12 Progression · Social Studies & Systems Thinking",
  },
  "bible-studies": {
    subtitle: "Biblical geography, history, literature, and theology.",
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

updated = updated.replace(volumeNavPattern, (_match, indent) => buildVolumeNav(plan, indent));

if (CHECK) {
  if (updated !== html) {
    const before = html.split("\n");
    const after = updated.split("\n");
    const changed = after.filter((line, index) => line !== before[index]).length;
    console.error(`steam-lessons.html is out of sync with data/compendium-plan.json (~${changed} line(s) differ).`);
    console.error("Run `npm run sync:steam-lessons-compendium` to update it.");
    process.exit(1);
  }
  console.log(`steam-lessons.html matches the compendium plan: ${plan.volumes.length} volumes, ${expectedIds.length} modules.`);
  process.exit(0);
}

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

function buildVolumeNav(planData, indent) {
  const options = planData.volumes.map((volume) =>
    `${indent}    <option value="${volume.number}">${escapeHtml(shortTitle(volume.title))}</option>`).join("\n");
  return `${indent}<!-- COMPENDIUM VOLUME NAV:START -->
${indent}<label class="catalog-volume-filter">
${indent}  <span class="visually-hidden">Filter subjects by volume</span>
${indent}  <select id="compendium-volume-filter">
${indent}    <option value="all">All volumes</option>
${options}
${indent}  </select>
${indent}</label>
${indent}<!-- COMPENDIUM VOLUME NAV:END -->`;
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
    ["Cell", "Microscopic", "lessons/life-sciences/types-of-cells.html"],
    ["Heredity", "Generations", "lessons/life-sciences/dna-heredity.html"],
    ["Biodiversity", "Tree of life", "lessons/life-sciences/animalia/index.html"],
    ["Deep time", "541 million years", "lessons/life-sciences/cambrian-explosion.html"],
    ["Earth cycles", "Water · rock · carbon", "lessons/earth-science/water-cycle.html"],
    ["Climate", "Planetary feedback", "lessons/earth-science/climate-simulator.html"],
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
