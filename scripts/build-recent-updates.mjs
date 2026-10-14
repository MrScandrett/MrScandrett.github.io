import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export async function collectEntries({ check = false } = {}) {
  const lessons = read('data/lessons.json').lessons.filter(l => l.status === 'live');
  const cachePath = path.join(root, 'data/updates-first-added.json');
  const cache = fs.existsSync(cachePath) ? read('data/updates-first-added.json') : {};
  const entries = [];
  if (lessons.some(lesson => !cache[lesson.url]) && !check) {
    // One history pass records additions and renames, including bulk folder moves.
    const { stdout } = await run('git', ['log', '--format=DATE:%cs', '--name-status', '--diff-filter=AR', '-M', '--', 'lessons'], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    const added = {}, previous = {};
    let date;
    for (const line of stdout.split('\n')) {
      if (line.startsWith('DATE:')) { date = line.slice(5); continue; }
      const [status, oldPath, newPath] = line.split('\t');
      if (status === 'A') added[oldPath] = date;
      if (status?.startsWith('R')) previous[newPath] = oldPath;
    }
    // Git can omit a rename in a large move; preserve additions for those paths too.
    const fallback = await run('git', ['log', '--format=DATE:%cs', '--name-status', '--diff-filter=A', '--no-renames', '--', 'lessons'], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    const pathAdded = {};
    for (const line of fallback.stdout.split('\n')) {
      if (line.startsWith('DATE:')) { date = line.slice(5); continue; }
      const [status, url] = line.split('\t');
      if (status === 'A') pathAdded[url] = date;
    }
    const firstAdded = (url, seen = new Set()) => {
      if (seen.has(url)) return added[url];
      seen.add(url);
      const earlier = previous[url] && firstAdded(previous[url], seen);
      return earlier || added[url] || pathAdded[url];
    };
    for (const lesson of lessons) {
      if (!cache[lesson.url]) cache[lesson.url] = firstAdded(lesson.url);
    }
  }
  for (const lesson of lessons) {
    if (!cache[lesson.url]) throw new Error(`Missing firstAdded date: ${lesson.url}; generate locally with full git history`);
    entries.push({ type: 'lesson', date: cache[lesson.url], url: lesson.url, title: lesson.title, what: `${lesson.primaryModule} · ${lesson.summary || 'Explore this lesson.'}` });
  }
  for (const game of read('apps/manifest.json')) {
    entries.push({ type: 'game', date: game.date_added, url: game.url.replace(/^\.\//, ''), title: `${game.name} — by ${game.student}`, what: 'Explore a student project.', thumbnail: game.thumbnail?.replace(/^\.\//, '') });
  }
  for (const update of read('data/updates.json')) {
    const lesson = lessons.find(l => l.id === update.lesson);
    if (!lesson) throw new Error(`Unknown updated lesson: ${update.lesson}`);
    entries.push({ ...update, type: 'updated', url: lesson.url });
  }
  for (const entry of entries) {
    if (!validDate(entry.date)) throw new Error(`Invalid date: ${entry.title}: ${entry.date}`);
    if (!fs.existsSync(path.join(root, entry.url))) throw new Error(`Missing target: ${entry.url}`);
    if (entry.thumbnail && !fs.existsSync(path.join(root, entry.thumbnail))) throw new Error(`Missing thumbnail: ${entry.thumbnail}`);
  }
  if (!check) fs.writeFileSync(cachePath, JSON.stringify(Object.fromEntries(Object.entries(cache).sort()), null, 2) + '\n');
  return entries.sort((a, b) => b.date.localeCompare(a.date) || ({updated:0,lesson:1,game:2}[a.type] - {updated:0,lesson:1,game:2}[b.type]) || a.title.localeCompare(b.title));
}
export function renderEntries(entries) {
  return entries.map(e => `            <li class="updates-entry" data-update-type="${e.type}">
              <span class="updates-badge updates-badge--${e.type}">${{lesson:'New lesson',updated:'Updated',game:'New game'}[e.type]}</span>
              <a class="updates-item-link" href="${escape(e.url)}">${e.thumbnail ? `<img class="updates-thumb" src="${escape(e.thumbnail)}" alt="" width="40" height="40" loading="lazy" />` : ''}<span>${escape(e.title)}</span></a>
              <time datetime="${e.date}" title="${e.date}">${e.date}</time>
              <p class="updates-description">${escape(e.what)}</p>
            </li>`).join('\n');
}
export function renderHomepageEntries(entries) {
  const counts = {};
  const selected = entries.filter((entry, index) => {
    counts[entry.type] = (counts[entry.type] || 0) + 1;
    return index < 6 || counts[entry.type] <= 6;
  });
  let count = 0;
  return renderEntries(selected).replace(/<li class="updates-entry" data-update-type="([^"]+)">/g, tag => ++count > 6 ? tag.replace('>', ' hidden>') : tag);
}
export function renderFilters() {
  return `<div class="updates-filters" role="group" aria-label="Filter updates" hidden>${[['all','All'],['lesson','New lessons'],['updated','Updated'],['game','Student games']].map(([type,label]) => `<button type="button" class="updates-filter" data-updates-filter="${type}" aria-pressed="${type === 'all'}">${label}</button>`).join('')}</div>`;
}
export function replaceRegion(html, name, content) {
  const expression = new RegExp(`(<!-- updates:${name} -->)[\\s\\S]*?(<!-- updates:${name}:end -->)`);
  if (!expression.test(html)) throw new Error(`Missing updates:${name} region`);
  return html.replace(expression, (_, start, end) => `${start}\n${content}\n          ${end}`);
}
export function archivePage(entries) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Recent Updates · ClassroomOS</title><meta name="description" content="New lessons, meaningful lesson updates, and student projects in ClassroomOS." />
<link rel="icon" href="assets/images/favicon.svg" type="image/svg+xml" />
<link rel="stylesheet" href="assets/css/main.css" /><link rel="stylesheet" href="assets/css/classroom-home.css" /><link rel="stylesheet" href="assets/css/pages/index.css" /><link rel="stylesheet" href="assets/css/liquid-woodland.css" />
<script src="assets/js/theme-registry.js"></script><script src="assets/js/theme-lighting.js"></script><script src="assets/js/pages/index-updates.js" defer></script></head>
<body class="theme-liquid-woodland"><a class="skip-link" href="#main-content">Skip to content</a>
<header class="site-header"><div class="nav-wrap"><a class="brand" href="index.html">Mr. Scandrett's ClassroomOS</a><nav class="site-nav" aria-label="Primary"><ul><li><a href="index.html">Home</a></li><li><a href="steam-lessons.html">Lessons</a></li><li><a href="paths.html">Paths</a></li><li><a href="showcase.html">Showcase</a></li><li><a href="applications.html">Apps</a></li><li><a href="library.html">Library</a></li><li><a href="about.html">About</a></li></ul></nav></div></header>
<main id="main-content" class="updates-archive"><section class="updates-card home-widget" data-updates-panel aria-labelledby="updates-title">
<p class="home-widget-eyebrow">Keep exploring</p><h1 id="updates-title">Recent Updates</h1>
<p>New lessons, student projects, and meaningful improvements. New lesson dates reflect their first addition to this repository.</p>
${renderFilters()}<ol class="updates-list">\n${renderEntries(entries)}\n</ol><p class="updates-status" aria-live="polite"></p>
</section></main><script src="assets/js/nav-mobile.js"></script></body></html>\n`;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const entries = await collectEntries();
  const indexPath = path.join(root, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  // Bake the newest six of each type so filters work without a fetch.
  html = replaceRegion(html, 'list', renderHomepageEntries(entries));
  html = replaceRegion(html, 'filters', renderFilters());
  fs.writeFileSync(indexPath, html);
  fs.writeFileSync(path.join(root, 'updates.html'), archivePage(entries));
  console.log(`Generated ${entries.length} updates; homepage shows the newest six.`);
}
