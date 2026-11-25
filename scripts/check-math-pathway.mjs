import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pathway = JSON.parse(fs.readFileSync(path.join(root, 'data/math-pathway.json'), 'utf8'));
const compendium = JSON.parse(fs.readFileSync(path.join(root, 'data/compendium-plan.json'), 'utf8'));
const lessonRegistry = JSON.parse(fs.readFileSync(path.join(root, 'data/lessons.json'), 'utf8'));
const searchIndex = JSON.parse(fs.readFileSync(path.join(root, 'assets/data/search-index.json'), 'utf8'));
const mathModule = compendium.volumes.flatMap((volume) => volume.modules).find((module) => module.id === 'mathematics');
const catalog = fs.readFileSync(path.join(root, 'steam-lessons.html'), 'utf8');
const section = catalog.split('id="module-math"')[1]?.split('</section>')[0] || '';
const errors = [];

const stepList = pathway.steps.map((step) => step.page);
const stepSet = new Set(stepList);
const pages = new Set(stepList.map((page) => page.split('#')[0]));
const guideKeys = Object.keys(pathway.guides || {});
const guidePages = new Set(guideKeys.map((key) => key.split('#')[0]));
const compendiumPages = new Set(mathModule.units.flatMap((unit) => unit.lessons));

const shelfTiles = [];
for (const match of section.matchAll(/<a\b([^>]*)>/gi)) {
  const attrs = match[1];
  if (!/\bclass=["'][^"']*\btile\b[^"']*["']/i.test(attrs)) continue;
  const hrefMatch = attrs.match(/\bhref=["'](lessons\/mathematics\/[^"']+)["']/i);
  if (hrefMatch) shelfTiles.push(hrefMatch[1]);
}
const catalogPages = new Set(shelfTiles.map((href) => href.split('#')[0]));

for (const [label, set] of [['guide', guidePages], ['compendium', compendiumPages], ['catalog', catalogPages]]) {
  for (const page of pages) if (!set.has(page)) errors.push(`${label} missing ${page}`);
  for (const page of set) if (!pages.has(page)) errors.push(`${label} has extra ${page}`);
}

if (shelfTiles.length !== stepList.length) {
  errors.push(`shelf tile count (${shelfTiles.length}) differs from pathway.steps (${stepList.length})`);
} else {
  for (let i = 0; i < stepList.length; i++) {
    if (shelfTiles[i] !== stepList[i]) {
      errors.push(`order mismatch at step #${i + 1}: shelf has ${shelfTiles[i]}, math-pathway.json has ${stepList[i]}`);
    }
  }
}

const checkedBaseFiles = new Set();
for (const [key, guide] of Object.entries(pathway.guides || {})) {
  const page = key.split('#')[0];
  const file = path.join(root, page);
  if (!fs.existsSync(file)) { errors.push(`missing file ${page}`); continue; }
  const html = fs.readFileSync(file, 'utf8');
  if (!new RegExp(`id=["']${guide.anchor}["']`).test(html)) errors.push(`${key} missing start anchor #${guide.anchor}`);
  for (const field of ['goal', 'start', 'anchor', 'prerequisite', 'check', 'role']) {
    if (typeof guide[field] !== 'string' || !guide[field].trim()) errors.push(`${key} missing ${field}`);
  }
  if (guide.prereqLinks !== undefined) {
    if (!Array.isArray(guide.prereqLinks)) {
      errors.push(`${key} prereqLinks must be an array`);
    } else {
      for (const link of guide.prereqLinks) {
        if (!link?.title || !link?.page || (!stepSet.has(link.page) && !pages.has(link.page))) {
          errors.push(`${key} has invalid prereqLink ${JSON.stringify(link)}`);
        }
      }
    }
  }
  if (guide.review && (!/^\d{4}-\d{2}-\d{2}$/.test(guide.review.date) || !guide.review.scope || !guide.review.source || !/^https:\/\//.test(guide.review.url))) {
    errors.push(`${key} has incomplete source-check metadata`);
  }

  if (key.includes('#') || checkedBaseFiles.has(page)) continue;
  checkedBaseFiles.add(page);

  if (!html.includes('math-pathway-nav.js')) errors.push(`${page} missing shared navigation`);
  if (!/<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(html)) errors.push(`${page} missing <h1> heading`);

  const hasMathRenderer = /katex|mathjax/i.test(html);
  if (!hasMathRenderer) {
    const mainHtml = (html.match(/<main\b[\s\S]*?<\/main>/i) || [html])[0]
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '');
    const rawLatex = mainHtml.match(/\\(?:frac|sqrt|text|begin\{bmatrix\}|log_|int_|iff\b|hat\{|perp\b|Delta\b|theta\b|sum\b)/);
    if (rawLatex) errors.push(`${page} contains unrendered LaTeX (${rawLatex[0]})`);
  }

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
  console.log(`Math pathway aligned: ${pages.size} lessons, ${pathway.steps.length} steps, ${guideKeys.length} guides.`);
}
