import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pathway = JSON.parse(fs.readFileSync(path.join(root, 'data/math-pathway.json'), 'utf8'));
const compendium = JSON.parse(fs.readFileSync(path.join(root, 'data/compendium-plan.json'), 'utf8'));
const lessonRegistry = JSON.parse(fs.readFileSync(path.join(root, 'data/lessons.json'), 'utf8'));
const searchIndex = JSON.parse(fs.readFileSync(path.join(root, 'assets/data/search-index.json'), 'utf8'));
const mathModule = compendium.volumes.flatMap((volume) => volume.modules).find((module) => module.id === 'mathematics');
const catalog = fs.readFileSync(path.join(root, 'steam-lessons.html'), 'utf8');
const section = catalog.split('id="module-math"')[1]?.split('<!-- ══ Astronomy')[0] || '';
const errors = [];
const pages = new Set(pathway.steps.map((step) => step.page.split('#')[0]));
const guidePages = new Set(Object.keys(pathway.guides || {}));
const compendiumPages = new Set(mathModule.units.flatMap((unit) => unit.lessons));
const catalogPages = new Set([...section.matchAll(/href="(lessons\/mathematics\/[^"#]+\.html)(?:#[^"]*)?"/g)].map((match) => match[1]));

for (const [label, set] of [['guide', guidePages], ['compendium', compendiumPages], ['catalog', catalogPages]]) {
  for (const page of pages) if (!set.has(page)) errors.push(`${label} missing ${page}`);
  for (const page of set) if (!pages.has(page)) errors.push(`${label} has extra ${page}`);
}
for (const [page, guide] of Object.entries(pathway.guides || {})) {
  const file = path.join(root, page);
  if (!fs.existsSync(file)) { errors.push(`missing file ${page}`); continue; }
  const html = fs.readFileSync(file, 'utf8');
  if (!new RegExp(`id=["']${guide.anchor}["']`).test(html)) errors.push(`${page} missing start anchor #${guide.anchor}`);
  for (const field of ['goal', 'start', 'anchor', 'prerequisite', 'check', 'role']) {
    if (typeof guide[field] !== 'string' || !guide[field].trim()) errors.push(`${page} missing ${field}`);
  }
  if (guide.review && (!/^\d{4}-\d{2}-\d{2}$/.test(guide.review.date) || !guide.review.scope || !guide.review.source || !/^https:\/\//.test(guide.review.url))) {
    errors.push(`${page} has incomplete source-check metadata`);
  }
  if (!html.includes('math-pathway-nav.js')) errors.push(`${page} missing shared navigation`);
  const registryEntry = lessonRegistry.lessons.find((lesson) => lesson.url === page);
  const searchEntry = searchIndex.find((entry) => entry.url === page && entry.category === 'Mathematics');
  if (!registryEntry || !searchEntry) errors.push(`${page} missing lesson registry or search entry`);
  else if (registryEntry.summary !== searchEntry.description) errors.push(`${page} search description differs from lesson registry`);
}
for (const step of pathway.steps) {
  const [page, anchor] = step.page.split('#');
  if (anchor && !new RegExp(`id=["']${anchor}["']`).test(fs.readFileSync(path.join(root, page), 'utf8'))) {
    errors.push(`${page} missing pathway anchor #${anchor}`);
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Math pathway aligned: ${pages.size} lessons, ${pathway.steps.length} steps, ${guidePages.size} guides.`);
}
