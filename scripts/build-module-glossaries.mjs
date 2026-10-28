// Aggregate the full lesson shelf, independently of the reader's current filters.
import fs from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';
import vm from 'node:vm';
import { parse } from 'acorn';

const root = path.resolve(import.meta.dirname, '..');
const catalog = load(await fs.readFile(path.join(root, 'steam-lessons.html'), 'utf8'));
const normalize = value => String(value || '').trim().toLocaleLowerCase('en-US');
const clean = value => value.replace(/\s+/g, ' ').trim();
const dictionaryFiles = (await fs.readdir(path.join(root, 'data')))
  .filter(name => name === 'glossary.json' || name.endsWith('-glossary.json')).sort();
const dictionaries = new Map(await Promise.all(dictionaryFiles.map(async name => [
  name, JSON.parse(await fs.readFile(path.join(root, 'data', name), 'utf8'))
])));
const general = dictionaries.get('glossary.json');
// Bible pathway pages select their lesson from a shared data-driven renderer.
const bibleSource = await fs.readFile(path.join(root, 'assets/js/bible-pathway-lesson.js'), 'utf8');
const bibleLessons = vm.runInNewContext(bibleSource.slice(0, bibleSource.indexOf('  var main = document.querySelector')) + '\nreturn lessons; }());', {}, { timeout: 1000 });
function stringsFromScript(source) {
  const strings = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Literal' && typeof node.value === 'string') strings.push(node.value);
    if (node.type === 'TemplateElement') strings.push(node.value.cooked || '');
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  }
  visit(parse(source, { ecmaVersion: 'latest', sourceType: 'module' }));
  return strings.join(' ');
}
const scriptCache = new Map();
const modules = {};
const cache = new Map();
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patterns = new Map();
function occurs(entry, text) {
  if (!patterns.has(entry)) patterns.set(entry, [entry.term, ...(entry.aliases || [])].map(alias =>
    new RegExp('(?:^|[^\\p{L}\\p{N}_])' + escape(alias) + '(?=$|[^\\p{L}\\p{N}_])',
      /^[A-Z0-9]{1,4}$/.test(alias) ? 'u' : 'iu')));
  return patterns.get(entry).some(pattern => pattern.test(text));
}
async function lesson(href) {
  const filename = href.split(/[?#]/)[0];
  if (cache.has(filename)) return cache.get(filename);
  const $ = load(await fs.readFile(path.join(root, filename), 'utf8'));
  const explicitContext = $('html').attr('data-glossary-context');
  const prefix = Object.keys(general.contexts || {}).filter(key => ('/' + filename).includes(key))
    .sort((a, b) => b.length - a.length)[0];
  const contexts = explicitContext ? explicitContext.split(/[\s,]+/).map(normalize) : general.contexts[prefix] || [];
  const sources = new Set(['glossary.json']);
  if (filename.startsWith('lessons/bible-studies/')) sources.add('bible-glossary.json');
  const dynamic = [];
  const bibleId = $('[data-bible-lesson]').attr('data-bible-lesson');
  if (bibleId) dynamic.push(JSON.stringify(bibleLessons.find(item => item.id === bibleId) || {}));
  for (const script of $('script').toArray()) {
    const type = $(script).attr('type');
    if (type && !['module', 'text/javascript', 'application/javascript'].includes(type)) continue;
    const src = $(script).attr('src');
    if (src?.includes('bible-pathway-lesson.js')) continue;
    if (src && !/^(?:https?:|\/\/)/.test(src) && /(?:\/lessons\/|lesson|lab)/.test(src)) {
      const scriptPath = path.resolve(root, path.dirname(filename), src.split(/[?#]/)[0]);
      if (!scriptPath.startsWith(root + path.sep)) continue;
      if (!scriptCache.has(scriptPath)) {
        const code = await fs.readFile(scriptPath, 'utf8');
        scriptCache.set(scriptPath, stringsFromScript(code));
      }
      dynamic.push(scriptCache.get(scriptPath));
    } else if (!src) dynamic.push(stringsFromScript($(script).html() || ''));
  }
  const dynamicHtml = load(dynamic.join(' '));
  // Include explicit terms and vocabulary injected by lesson scripts as well.
  $('body').append(dynamicHtml('body').html() || '');
  $('[data-glossary-src]').each((_, element) => {
    const name = path.basename($(element).attr('data-glossary-src'));
    if (dictionaries.has(name)) sources.add(name);
  });
  const explicit = new Set();
  $('[data-glossary]').each((_, element) => explicit.add(normalize($(element).attr('data-glossary') || $(element).text())));
  const vocabulary = [];
  $('dl[class*="vocab"] dt, [class*="glossary"] dt, [id*="glossary"] dt').each((_, element) => {
    const definition = clean($(element).next('dd').text());
    if (definition) vocabulary.push({ term: clean($(element).text()), definition });
  });
  $('[class*="vocab-card"]').each((_, element) => {
    const term = clean($(element).find('h3, h4, strong').first().text());
    const definition = clean($(element).find('p').first().text());
    if (term && definition) vocabulary.push({ term, definition });
  });
  $('script, style, nav, header, footer, [data-no-glossary]').remove();
  const text = clean(($('main').length ? $('main') : $('body')).text());
  const entries = new Map();
  // Specialist definitions take precedence over the shared dictionary for a lesson.
  for (const source of sources) {
    for (const entry of dictionaries.get(source).terms || []) {
      const marked = [entry.term, ...(entry.aliases || [])].some(term => explicit.has(normalize(term)));
      const relevant = source !== 'glossary.json' || !entry.contexts?.length || entry.contexts.some(tag => contexts.includes(tag));
      if (marked || (relevant && occurs(entry, text))) {
        entries.set(normalize(entry.term) + '|' + (entry.sense || ''), entry);
      }
    }
  }
  for (const entry of vocabulary) {
    if (![...entries.values()].some(known => [known.term, ...(known.aliases || [])].some(term => normalize(term) === normalize(entry.term)))) {
      entries.set(normalize(entry.term), entry);
    }
  }
  const result = [...entries.values()];
  cache.set(filename, result);
  return result;
}
for (const section of catalog('.module-section').toArray()) {
  const shelf = catalog(section);
  const links = new Map();
  shelf.find('a.tile[href]').each((_, element) => {
    const href = catalog(element).attr('href');
    if (/^lessons\/.*\.html(?:[?#]|$)/.test(href)) {
      const filename = href.split(/[?#]/)[0];
      if (!links.has(filename)) links.set(filename, clean(catalog(element).find('strong').first().text()) || filename);
    }
  });
  const terms = new Map();
  for (const [href, title] of links) {
    for (const entry of await lesson(href)) {
      const key = normalize(entry.term) + '|' + entry.definition;
      if (!terms.has(key)) terms.set(key, {
        term: entry.term, ...(entry.sense ? { sense: entry.sense } : {}),
        aliases: entry.aliases || [], definition: entry.definition, lessons: []
      });
      terms.get(key).lessons.push({ href, title });
    }
  }
  modules[shelf.attr('id')] = {
    title: clean(shelf.find('.module-banner-title').text()), lessonCount: links.size,
    terms: [...terms.values()].sort((a, b) => a.term.localeCompare(b.term, 'en') || a.definition.localeCompare(b.definition, 'en'))
  };
}
const output = JSON.stringify({ version: 1, modules }, null, 2) + '\n';
const target = path.join(root, 'data/module-glossaries.json');
if (process.argv.includes('--check')) {
  if (await fs.readFile(target, 'utf8').catch(() => '') !== output) {
    throw new Error('Module glossaries are stale. Run npm run build:module-glossaries.');
  }
} else await fs.writeFile(target, output);
console.log(Object.values(modules).map(module => `${module.title}: ${module.terms.length} terms / ${module.lessonCount} lessons`).join('\n'));
