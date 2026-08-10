import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");
const checkOnly = process.argv.includes("--check");
const planPath = path.join(ROOT, "data", "compendium-plan.json");
const shelfPath = path.join(ROOT, "steam-lessons.html");
const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "lessons.json"), "utf8"));
const catalogByUrl = new Map(catalog.lessons.map((lesson) => [lesson.url, lesson]));
const shelf = readShelf(fs.readFileSync(shelfPath, "utf8"));
const shelfUrls = new Set(shelf.flatMap((module) => module.lessons));
const shelfSectionIds = {
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

const errors = [];
const seen = new Map();
const indexLessons = [];
const volumeCodes = new Set();
const moduleCodes = new Set();

for (const [volumeIndex, volume] of plan.volumes.entries()) {
  if (volume.number !== volumeIndex + 1) errors.push(`Volume ${volume.id} number is not sequential.`);
  if (volumeCodes.has(volume.code)) errors.push(`Duplicate volume code ${volume.code}.`);
  volumeCodes.add(volume.code);

  for (const module of volume.modules) {
    if (moduleCodes.has(module.code)) errors.push(`Duplicate module code ${module.code}.`);
    moduleCodes.add(module.code);
    let moduleLessonNumber = 0;

    for (const [unitIndex, unit] of module.units.entries()) {
      for (const [lessonIndex, url] of unit.lessons.entries()) {
        moduleLessonNumber += 1;
        if (seen.has(url)) errors.push(`Canonical lesson appears twice: ${url} (${seen.get(url)} and ${module.id}).`);
        seen.set(url, module.id);
        const filename = path.join(ROOT, url);
        if (!fs.existsSync(filename)) errors.push(`Missing lesson file: ${url}.`);
        if (!shelfUrls.has(url)) errors.push(`Canonical lesson is not on the public shelf: ${url}.`);
        const title = titleFor(url, filename, catalogByUrl);
        const shelfModules = shelf.filter((item) => item.lessons.includes(url));
        indexLessons.push({
          code: `${module.code}-${String(moduleLessonNumber).padStart(2, "0")}`,
          title,
          url,
          volume: volume.id,
          volumeNumber: volume.number,
          module: module.id,
          unit: unit.id,
          order: indexLessons.length + 1,
          unitOrder: unitIndex + 1,
          lessonOrder: lessonIndex + 1,
          alsoAppearsIn: shelfModules
            .filter((item) => item.id !== shelfSectionIds[module.id])
            .map((item) => item.title),
        });
      }
    }
  }
}

for (const url of shelfUrls) {
  if (!seen.has(url)) errors.push(`Public shelf lesson missing from compendium plan: ${url}.`);
}

const supportingUrls = new Set();
for (const item of plan.supportingPages) {
  if (supportingUrls.has(item.url)) errors.push(`Duplicate supporting page: ${item.url}.`);
  supportingUrls.add(item.url);
  if (!fs.existsSync(path.join(ROOT, item.url))) errors.push(`Missing supporting page: ${item.url}.`);
  if (!seen.has(item.parent)) errors.push(`Supporting page parent is not canonical: ${item.parent}.`);
  if (shelfUrls.has(item.url)) errors.push(`Public shelf lesson cannot be supporting-only: ${item.url}.`);
}

const allLessonHtml = walkLessonHtml(path.join(ROOT, "lessons"));
const classified = new Set([...seen.keys(), ...supportingUrls]);
for (const url of allLessonHtml) {
  if (!classified.has(url)) errors.push(`Unclassified lesson HTML file: ${url}.`);
}

if (seen.size !== shelfUrls.size) errors.push(`Canonical count ${seen.size} does not match shelf count ${shelfUrls.size}.`);
if (errors.length) {
  console.error("Compendium plan validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const index = {
  version: plan.version,
  status: plan.status,
  generatedAt: new Date().toISOString(),
  counts: {
    volumes: plan.volumes.length,
    modules: plan.volumes.reduce((sum, volume) => sum + volume.modules.length, 0),
    units: plan.volumes.reduce((sum, volume) => sum + volume.modules.reduce((unitSum, module) => unitSum + module.units.length, 0), 0),
    canonicalLessons: indexLessons.length,
    supportingPages: plan.supportingPages.length,
  },
  lessons: indexLessons,
  supportingPages: plan.supportingPages,
};

if (!checkOnly) {
  fs.writeFileSync(path.join(ROOT, "data", "compendium-index.draft.json"), `${JSON.stringify(index, null, 2)}\n`);
  fs.writeFileSync(path.join(ROOT, "COMPENDIUM_OUTLINE.md"), buildMarkdown(plan, index));
}

console.log(`Compendium plan passed: ${index.counts.volumes} volumes, ${index.counts.modules} modules, ${index.counts.units} units, ${index.counts.canonicalLessons} public lessons, ${index.counts.supportingPages} supporting pages.`);

function readShelf(html) {
  const modules = [];
  const pattern = /<section\b[^>]*id="(module-[^"]+)"[\s\S]*?<h2 class="module-banner-title">([\s\S]*?)<\/h2>([\s\S]*?)(?=<section\b[^>]*id="module-|<\/main>)/g;
  for (const match of html.matchAll(pattern)) {
    modules.push({
      id: match[1],
      title: cleanText(match[2]),
      lessons: [...match[3].matchAll(/href="(lessons\/[^"#?]+\.html)[^"]*"/g)].map((item) => item[1]),
    });
  }
  return modules;
}

function titleFor(url, filename, metadata) {
  if (metadata.has(url)) return metadata.get(url).title;
  if (!fs.existsSync(filename)) return url;
  const html = fs.readFileSync(filename, "utf8");
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return cleanText(h1[1]);
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return title ? cleanText(title[1]).split(/\s+[|·]\s+/)[0] : url;
}

function cleanText(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/\s+/g, " ")
    .trim();
}

function walkLessonHtml(directory) {
  const results = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...walkLessonHtml(filename));
    else if (entry.name.endsWith(".html")) results.push(path.relative(ROOT, filename).split(path.sep).join("/"));
  }
  return results;
}

function buildMarkdown(planData, indexData) {
  const lines = [
    `# ${planData.title}: Draft Curriculum Outline`,
    "",
    `Status: **${planData.status}**`,
    "",
    `This metadata-only draft organizes ${indexData.counts.canonicalLessons} public lessons and classifies ${indexData.counts.supportingPages} supporting pages. It does not alter lesson HTML, simulations, or existing lesson artwork.`,
    "",
    "## Organizing Principles",
    "",
    ...planData.principles.map((principle) => `- ${principle}`),
    "",
  ];

  for (const volume of planData.volumes) {
    const volumeLessons = indexData.lessons.filter((lesson) => lesson.volume === volume.id);
    lines.push(`# Volume ${roman(volume.number)} — ${volume.title}`, "");
    lines.push(`Theme: **${volume.theme.name}** · Accent: \`${volume.theme.accent}\` · Secondary: \`${volume.theme.secondary}\` · ${volumeLessons.length} lessons`, "");
    for (const module of volume.modules) {
      lines.push(`## ${module.title} (${module.code})`, "");
      for (const unit of module.units) {
        lines.push(`### ${unit.title}`, "");
        for (const url of unit.lessons) {
          const lesson = indexData.lessons.find((item) => item.url === url);
          const references = lesson.alsoAppearsIn.length ? ` — _also indexed in ${lesson.alsoAppearsIn.join(", ")}_` : "";
          lines.push(`- **${lesson.code}** — ${lesson.title}${references}`);
        }
        lines.push("");
      }
    }
  }

  lines.push("# Supporting Pages", "", "These pages remain attached to their parent lesson or module and do not become duplicate canonical lessons.", "");
  for (const item of planData.supportingPages) {
    lines.push(`- \`${item.url}\` — ${item.role}; ${item.placement}; parent: \`${item.parent}\``);
  }
  return `${lines.join("\n")}\n`;
}

function roman(value) {
  return ["", "I", "II", "III", "IV", "V", "VI"][value] || String(value);
}
