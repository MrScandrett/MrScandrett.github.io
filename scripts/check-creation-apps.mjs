import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';

const root = path.resolve(import.meta.dirname, '..');
const pages = JSON.parse(fs.readFileSync(path.join(root, 'data/creation-app-pages.json'), 'utf8'));
const errors = [];
const listed = new Set(pages.map(page => page.file));
for (const { file, selector } of pages) {
  const $ = load(fs.readFileSync(path.join(root, file), 'utf8'));
  const opening = $('main').first().children().first();
  // Composer lessons introduce the person briefly before the sheet-music workspace.
  const composerIntro = opening.is('[data-composer-intro]') && opening.next().is('[data-composer-studio]');
  const first = composerIntro ? opening.next() : opening;
  if (composerIntro && (!opening.find('h1').length || !opening.find('figure[data-zoomable] img').length || !opening.find('.fl-lede').length)) errors.push(`${file}: include the composer name, portrait and brief biography.`);
  if (!first.is('[data-creation-app]') || !first.find(selector).length) errors.push(`${file}: put the application first inside main.`);
  if (first.parents('details:not([open]), [hidden]').length) errors.push(`${file}: the application starts hidden.`);
  if ($('[data-creation-app]').length !== 1) errors.push(`${file}: expected one application entry point.`);
  if (!$('script[src$="/creation-app.js"]').length || !$('link[href$="/creation-app.css"]').length) errors.push(`${file}: include the shared fullscreen control.`);
}
// New shared studios must join the audit rather than quietly escaping the rule.
function scan(dir) {
  for (const item of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const file = `${dir}/${item.name}`;
    if (item.isDirectory()) scan(file);
    else if (file.endsWith('.html')) {
      const $ = load(fs.readFileSync(path.join(root, file), 'utf8'));
      if ($('[data-design3d-workshop], [data-web-blocks]').length && !listed.has(file)) errors.push(`${file}: add this studio to data/creation-app-pages.json.`);
    }
  }
}
scan('lessons');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log(`Creation apps check passed: ${pages.length} lesson pages prioritize the application (after a brief introduction on composer pages).`);
