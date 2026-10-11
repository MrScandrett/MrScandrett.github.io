#!/usr/bin/env node
// Builds The Ages (lessons/humanities/the-ages.html) from its data, with the Grand Timeline as the hub.
//
// Sources:
//   data/ages-lesson.json     everything the lesson itself teaches: the ages (Era Atlas chapters and
//                             bridge bands), the four systems lenses, breakthroughs, turning points,
//                             communication leaps, Daniel 2, and the 3D artifacts
//   data/ages-timeline.json   milestones from the rest of the site, each linked to its lesson
//
// Every lesson card that has a `timeline` field lands on the Grand Timeline, either joining an item
// that is already there (so the Gutenberg press carries its 3D model, its Era Atlas plate and its
// communication leap in one place) or as a new item. Each timeline item links back into the lesson,
// and each card has a "Show on the timeline" button, so the page reads both ways.
//
// Output: the regions between <!-- ages:NAME --> … <!-- /ages:NAME --> markers in the page
// (hero stats, timeline, systems lens, Era Atlas, chronology, Daniel 2, and the page script's data).
//
//   node scripts/build-ages-timeline.mjs           write the page
//   node scripts/build-ages-timeline.mjs --check   fail if the page is out of date or a link/date is bad
//   node scripts/build-ages-timeline.mjs --report  list every timeline item

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const T = require('../assets/js/timeline.js');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = 'lessons/humanities/the-ages.html';
const FROM_PAGE = path.dirname(PAGE);
const args = new Set(process.argv.slice(2));

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const config = JSON.parse(read('data/ages-timeline.json'));
const lesson = JSON.parse(read('data/ages-lesson.json'));
const lessons = new Map(JSON.parse(read('data/lessons.json')).lessons.map((l) => [l.url, l]));
const page = read(PAGE);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const plain = (html) => clean(String(html || '').replace(/<[^>]*>/g, '')).replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
const pad = (n) => String(n).padStart(2, '0');
const rel = (p) => path.relative(FROM_PAGE, p);
function trimText(text, max) {
  text = clean(text);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const stop = cut.lastIndexOf('. ');
  return stop > 80 ? cut.slice(0, stop + 1) : cut.replace(/\s+\S*$/, '') + '…';
}
function lessonTitle(url) {
  const l = lessons.get(url);
  if (l) return l.title;
  const m = read(url).match(/<title>([^<]*)<\/title>/);
  return m ? clean(m[1]).split(/\s+[·|]\s+/)[0] : 'Open the lesson';
}

const problems = [];
const ages = lesson.ages;
const chapters = ages.filter((a) => a.tablets);
const lenses = lesson.lenses;
const allArtifacts = lesson.artifacts.concat(lesson.faithArtifacts);
for (const a of ages) if (a.chapter && !chapters.some((c) => c.key === a.chapter)) problems.push(`age ${a.key}: unknown chapter ${a.chapter}`);
const imageFiles = [];
const checkImage = (fig, where) => { if (fig) { imageFiles.push(fig.src); if (!fs.existsSync(path.join(ROOT, fig.src))) problems.push(`${where}: missing image ${fig.src}`); } };

// ------------------------------------------------------------- timeline items

const items = [];
function add(ev) {
  const parsed = T.parseWhen(ev.when);
  if (!parsed) problems.push(`unreadable date "${ev.when}" (${ev.label})`);
  if (ev.lesson && !fs.existsSync(path.join(ROOT, ev.lesson))) problems.push(`missing lesson ${ev.lesson} (${ev.label})`);
  if (!ev.era && !config.colors[ev.strand]) problems.push(`unknown strand "${ev.strand}" (${ev.label})`);
  const item = { ...ev, parsed, facets: [] };
  if (parsed) items.push(item);
  return item;
}

for (const age of ages.filter((a) => a.when)) {
  add({
    key: age.key, when: age.when, label: age.name, era: true,
    text: age.text || `${age.system} ${age.shift}`,
    anchor: age.chapter ? `#${age.card}` : `#tablet-${age.key}`,
    anchorText: age.chapter ? 'Read it in the lesson' : 'Open the chapter'
  });
}
for (const ev of config.events) add(ev);
for (const a of lesson.artifacts) add({ id: a.key, when: a.date, label: a.label, text: a.note, strand: 'Civilization', artifact: a.key, major: (config.majorArtifacts || []).includes(a.key) });
for (const a of lesson.faithArtifacts) add({ id: a.key, when: a.date, label: a.label, text: a.note, strand: 'Faith & Bible', artifact: a.key });
for (const ev of Object.values(config.christianEvents)) add({ ...ev, strand: 'Faith & Bible' });

// Lesson cards, in reading order. `link` is where the card lives in the lesson.
const cards = [];
for (const age of ages) {
  if (age.timeline) cards.push({ id: `tablet-${age.key}`, facet: `Era Atlas · ${age.name}`, timeline: age.timeline, figure: age.tablets[0].figure, text: age.timeline.text });
  for (const tp of (age.turningPoints || {}).events || []) {
    cards.push({ id: tp.id, facet: `Turning point · ${plain(tp.title)}`, timeline: tp.timeline, figure: tp.figure, text: plain(tp.paragraphs[0]) });
  }
  for (const p of (age.breakthroughs || {}).plates || []) {
    cards.push({ id: p.id, facet: `Era Atlas · ${plain(p.title)}`, timeline: p.timeline, figure: p.figure, text: plain(p.impact) });
  }
}
for (const l of lesson.chronology.leaps) cards.push({ id: l.id, facet: `Leap ${l.id.replace(/\D/g, '')} · ${plain(l.title)}`, timeline: l.timeline, text: plain(l.text) });
for (const k of lesson.daniel.kingdoms) cards.push({ id: k.id, facet: `Daniel 2 · ${plain(k.part)}`, timeline: k.timeline, figure: lesson.daniel.figure, text: plain(k.text) });

// New items first, so later cards can join them.
const slug = (s) => plain(s).toLowerCase().replace(/&/g, 'and').replace(/[’'"]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
for (const c of cards.filter((c) => !c.timeline.join)) {
  const t = c.timeline;
  c.item = add({ id: slug(t.label), when: t.when, label: t.label, strand: t.strand, major: t.major, text: t.text || c.text });
}
const findItem = (key) => {
  const hits = items.filter((it) => !it.era && (it.id === key || it.artifact === key || it.label === key));
  if (hits.length !== 1) problems.push(`timeline join "${key}" matches ${hits.length} items`);
  return hits[0];
};
for (const c of cards) {
  const it = c.item || (c.timeline.join === 'future' ? items.find((x) => x.id === slug(ages.find((a) => a.key === 'future').timeline.label)) : findItem(c.timeline.join));
  if (!it) continue;
  c.target = it;
  it.facets.push(c);
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

items.sort((a, b) => a.parsed.start - b.parsed.start || (b.era ? 1 : 0) - (a.era ? 1 : 0) || a.parsed.end - b.parsed.end);
for (const it of items) {
  if (!it.id && !it.era) it.id = slug(it.label);
  // Ages whose band contains this item, narrowest first: the page opens the right chapter on select.
  it.ages = it.era ? [it.key] : items.filter((e) => e.era && it.parsed.start >= e.parsed.start && it.parsed.start <= e.parsed.end)
    .sort((a, b) => (a.parsed.end - a.parsed.start) - (b.parsed.end - b.parsed.start)).map((e) => e.key);
}
const ids = new Set();
for (const it of items.filter((x) => !x.era)) { if (ids.has(it.id)) problems.push(`duplicate timeline id ${it.id}`); ids.add(it.id); }
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

const figureHtml = (fig, cls, extra = '') =>
  `<figure data-zoomable data-lightbox-group="the-ages" class="${cls}"${extra}>\n` +
  `  <img src="${esc(rel(fig.src))}" width="${fig.width}" height="${fig.height}" alt="${esc(fig.alt)}" loading="lazy" decoding="async" />\n` +
  `  <figcaption>${fig.caption}</figcaption>\n</figure>`;

function li(ev) {
  const attrs = [`data-when="${esc(ev.when)}"`, `data-label="${esc(ev.label)}"`];
  if (ev.major) attrs.push('data-major');
  if (ev.artifact) attrs.push(`data-artifact="${esc(ev.artifact)}"`);
  if (ev.era) attrs.push('data-era', `data-key="${esc(ev.key)}"`);
  else attrs.push(`data-group="${esc(ev.strand)}"`, `data-color="${config.colors[ev.strand]}"`, `data-id="${esc(ev.id)}"`);
  if (ev.ages.length) attrs.push(`data-ages-eras="${ev.ages.join(' ')}"`);
  if (ev.era || ev.artifact || ev.facets.length) attrs.push('data-ages-lesson');
  const link = ev.lesson
    ? ` <a class="ages-gt-link" href="${esc(rel(ev.lesson))}">${esc(lessonTitle(ev.lesson))} →</a>`
    : ev.artifact ? ` <button type="button" class="ages-gt-3d" data-ages-artifact="${esc(ev.artifact)}">View the 3D model</button>`
    : ev.anchor ? ` <a class="ages-gt-link" href="${ev.anchor}" data-ages-open>${esc(ev.anchorText)} ↓</a>` : '';
  const text = ev.text ? ` — ${esc(trimText(ev.text, ev.era ? 320 : 260))}` : '';
  let more = '';
  if (ev.facets.length) {
    const fig = ev.facets.map((c) => c.figure).find(Boolean);
    const thumb = fig ? `<figure data-zoomable class="ages-gt-thumb"><img src="${esc(rel(fig.src))}" width="${fig.width}" height="${fig.height}" alt="${esc(fig.alt)}" loading="lazy" decoding="async" /><figcaption>${fig.caption}</figcaption></figure>` : '';
    const links = ev.facets.map((c) => `<a href="#${c.id}" data-ages-open>${esc(c.facet)}</a>`).join(' ');
    more = `<span class="ages-gt-in-lesson">${thumb}<span class="ages-gt-facets"><span>In this lesson:</span> ${links}</span></span>`;
  }
  return `<li ${attrs.join(' ')}><strong>${esc(ev.label)}</strong>${text}${link}${more}</li>`;
}

// ------------------------------------------------------------- page regions

const showBtn = (id, text = 'Show on the timeline') => `<button type="button" class="ages-show-btn" data-ages-show="${esc(id)}">${text} ↑</button>`;
const indent = (s, n) => s.split('\n').map((l) => (l ? ' '.repeat(n) + l : l)).join('\n');
const events = items.filter((e) => !e.era);
const lessonCount = new Set(events.map((e) => e.lesson).filter(Boolean)).size;
const lessonCards = events.filter((e) => e.facets.length).length;

const regions = {};

regions['hero-stats'] = [
  `<div class="ages-hero-stat"><strong>${events.length} milestones</strong><span>On one timeline, two scales</span></div>`,
  `<div class="ages-hero-stat"><strong>${chapters.length} eras</strong><span>Compared as systems</span></div>`,
  `<div class="ages-hero-stat"><strong>${allArtifacts.length} artifacts</strong><span>Interactive 3D stops</span></div>`
].join('\n');

regions['grand-timeline'] = [
  '<ol class="ages-gt-list" data-timeline data-timeline-title="The story so far, on one line" data-timeline-scales="log time" data-timeline-search data-timeline-tour data-timeline-cosmic data-timeline-lanes="7" data-timeline-view="track">',
  ...items.map((ev) => '  ' + li(ev)),
  '</ol>',
  `<p class="ages-gt-count">${events.length} milestones linked to ${lessonCount} lessons. ${lessonCards} of them open into this lesson's own chapters, breakthroughs and evidence.</p>`
].join('\n');

const lensCell = (lens, age, i) =>
  `<button type="button" class="systems-lens-cell" data-ages-zoom="${age.key}">` +
  `<span class="systems-lens-cell-head"><span class="systems-lens-cell-step">Step ${pad(i + 1)} · ${esc(age.name)}</span></span>` +
  `<span class="systems-lens-cell-name">${esc(age.lens[lens.key].tech)}</span>` +
  `<span class="systems-lens-cell-content">${esc(age.lens[lens.key].text)}</span></button>`;
regions['systems-lens'] = [
  '<div class="systems-lens-nav" role="tablist" aria-label="Four Systems Lenses">',
  ...lenses.map((l, i) => `  <button type="button" class="systems-lens-btn${i ? '' : ' is-active'}" data-lens="${l.key}" role="tab" aria-selected="${!i}">${l.icon} ${esc(l.name)} Engine</button>`),
  '</div>',
  `<div class="systems-lens-banner" id="systems-lens-banner">${esc(lenses[0].banner)}</div>`,
  '<div class="systems-lens-grid" id="systems-lens-grid" aria-live="polite">',
  ...chapters.map((a, i) => '  ' + lensCell(lenses[0], a, i)),
  '</div>',
  `<div class="systems-insight-box" id="systems-insight-box">${esc(lenses[0].insight)}</div>`
].join('\n');

function tabletHtml(t, age) {
  checkImage(t.figure, `tablet ${t.variant}`);
  const cls = ['ages-card', t.size ? `ages-${t.size}` : '', 'age-tablet', `age-tablet--${t.variant}`].filter(Boolean).join(' ');
  const zoomKey = ages.some((a) => a.key === t.variant && a.when) ? t.variant : null;
  const out = [`<article class="${cls}" id="tablet-${t.variant}">`, `  <span class="age-tablet-label">${t.label}</span>`];
  if (t.figure) out.push(indent(figureHtml(t.figure, 'age-evidence'), 2));
  out.push(`  <h2>${t.title}</h2>`, ...t.paragraphs.map((p) => `  <p>${p}</p>`));
  if (t.proof) out.push(`  <p class="age-proof"><strong>Why the name?</strong> ${t.proof}</p>`);
  if (t.ideas) out.push('  <div class="renaissance-columns">', ...t.ideas.map((d) => `    <div class="renaissance-idea"><strong>${d.title}</strong><span>${d.text}</span></div>`), '  </div>');
  if (t.futures) out.push('  <div class="ages-future-grid">', ...t.futures.map((d) => `    <div class="ages-future"><strong>${d.title}</strong> <small>${d.text}</small></div>`), '  </div>');
  if (t.profile) {
    out.push(`  <div class="ages-systems-profile"${t.futures ? ' style="margin-top:1.1rem;"' : ''}>`,
      ...lenses.map((l) => `    <div class="ages-profile-cell"><strong>${l.icon} ${esc(l.name)}</strong><span>${t.profile[l.key]}</span></div>`), '  </div>');
  }
  if (zoomKey) out.push(`  <button type="button" class="ages-show-btn" data-ages-zoom="${zoomKey}">Show the ${esc(ages.find((a) => a.key === zoomKey).name)} on the timeline ↑</button>`);
  else if (age.timeline && t === age.tablets[0]) out.push(`  ${showBtn(cards.find((c) => c.id === `tablet-${age.key}`).target.id)}`);
  out.push('</article>');
  return out.join('\n');
}
function turningHtml(tp) {
  const out = [`<article class="ages-card ages-full history-hinge" id="${tp.id}">`, `  <span class="age-tablet-label">${tp.label}</span>`, `  <h2>${tp.title}</h2>`, `  <p class="history-hinge-intro">${tp.intro}</p>`, '  <div class="history-hinge-grid">'];
  for (const ev of tp.events) {
    checkImage(ev.figure, ev.id);
    out.push(`    <section class="history-hinge-event" id="${ev.id}">`, indent(figureHtml(ev.figure, 'age-evidence', ' style="margin-bottom:1rem;"'), 6),
      `      <time class="history-hinge-date"${ev.datetime ? ` datetime="${ev.datetime}"` : ''}>${ev.date}</time>`,
      `      <h3>${ev.title}</h3>`, ...ev.paragraphs.map((p) => `      <p>${p}</p>`),
      `      <a class="history-hinge-source" href="${esc(ev.source.href)}" target="_blank" rel="noopener">${ev.source.text}</a>`,
      `      ${showBtn(cards.find((c) => c.id === ev.id).target.id)}`, '    </section>');
  }
  out.push('  </div>', '</article>');
  return out.join('\n');
}
function plateHtml(p) {
  checkImage(p.figure, p.id);
  return [`<article class="innovation-plate" id="${p.id}" style="--plate:${p.color}">`, indent(figureHtml(p.figure, 'innovation-figure'), 2), '  <div class="innovation-copy">',
    `    <span class="innovation-era">${p.era}</span>`, `    <h3>${p.title}</h3>`, `    <p>${p.text}</p>`,
    `    <span class="innovation-impact"><strong>${p.impactLabel}:</strong> ${p.impact}</span>`,
    `    ${showBtn(cards.find((c) => c.id === p.id).target.id)}`, '  </div>', '</article>'].join('\n');
}
const atlas = [
  '<div class="ages-era-nav-wrap">',
  '  <div class="ages-era-stepper">',
  '    <button type="button" class="ages-stepper-btn" id="ages-prev-era" aria-label="Previous era">&#8592; Previous Era</button>',
  `    <span class="ages-chapter-indicator" id="ages-chapter-indicator">Chapter 01 of ${pad(chapters.length)} · ${esc(chapters[0].name)}</span>`,
  '    <button type="button" class="ages-stepper-btn" id="ages-next-era" aria-label="Next era">Next Era &#8594;</button>',
  '  </div>',
  '  <div class="ages-era-tabs" id="ages-atlas-tabs" role="tablist" aria-label="Era chapters">',
  ...chapters.map((a, i) => `    <button type="button" class="ages-atlas-tab${i ? '' : ' is-active'}" data-era-tab="${a.key}" role="tab" aria-selected="${!i}"><span>${pad(i + 1)}</span> ${esc(a.tab)}</button>`),
  '  </div>',
  '</div>'
];
chapters.forEach((a, i) => {
  atlas.push('', `<!-- CHAPTER ${pad(i + 1)}: ${a.name.toUpperCase()} -->`,
    `<div class="ages-era-chapter${i ? '' : ' is-active'}" data-era-chapter="${a.key}" role="tabpanel" aria-label="Chapter ${pad(i + 1)}: ${esc(a.name)}">`);
  for (const t of a.tablets) atlas.push(indent(tabletHtml(t, a), 2));
  if (a.turningPoints) atlas.push(indent(turningHtml(a.turningPoints), 2));
  if (a.breakthroughs) {
    atlas.push(`  <h3 class="ages-era-panel-subhead">${a.breakthroughs.subhead}</h3>`, '  <div class="innovation-track">');
    a.breakthroughs.plates.forEach((p, k) => { if (k) atlas.push(''); atlas.push(indent(plateHtml(p), 4)); });
    atlas.push('  </div>');
  }
  atlas.push('</div>');
});
regions['era-atlas'] = atlas.join('\n');

const ch = lesson.chronology;
regions.chronology = [
  '<article class="ages-card ages-full chronology-panel" id="information-revolutions">',
  '  <div class="chronology-head">',
  `    <div>`, `      <span class="ages-eyebrow">${ch.eyebrow}</span>`, `      <h2>${ch.title}</h2>`, `      <p>${ch.intro}</p>`, '    </div>',
  `    <p class="chronology-question"><strong>Systems Question:</strong> ${ch.question}</p>`,
  '  </div>',
  '  <div class="info-rev-shell">',
  '    <div class="info-rev-filters" role="group" aria-label="Filter Information Revolutions">',
  '      <span class="info-rev-filters-label">Filter:</span>',
  `      <button type="button" class="info-filter-btn is-active" data-filter="all">All ${ch.leaps.length} Revolutions</button>`,
  ...ch.media.map((m) => `      <button type="button" class="info-filter-btn" data-filter="${m.key}">${m.label}</button>`),
  '    </div>',
  '    <div class="info-rev-grid" id="info-rev-grid">',
  ...ch.leaps.flatMap((l) => {
    if (!chapters.some((a) => a.key === l.chapter)) problems.push(`${l.id}: unknown chapter ${l.chapter}`);
    return [
      `      <div class="info-rev-card" id="${l.id}" data-category="${l.media.join(' ')}">`,
      '        <div>',
      `          <div class="info-rev-head"><span class="info-rev-num">LEAP ${l.id.replace(/\D/g, '')}</span><span class="info-rev-date">${l.date}</span></div>`,
      `          <h3>${l.title}</h3>`, `          <span class="info-rev-limit">⚡ Overcame ${l.overcame}</span>`, `          <p>${l.text}</p>`,
      '        </div>',
      `        <div class="info-rev-actions"><button type="button" class="info-rev-jump" data-jump-era="${l.chapter}">View in Era Atlas →</button>${showBtn(cards.find((c) => c.id === l.id).target.id, 'Timeline')}</div>`,
      '      </div>'
    ];
  }),
  '    </div>',
  '  </div>',
  '</article>'
].join('\n');

const dn = lesson.daniel;
checkImage(dn.figure, 'daniel');
const [danielFile, danielHash] = dn.link.href.split('#');
if (!fs.existsSync(path.join(ROOT, danielFile))) problems.push(`daniel: missing lesson ${danielFile}`);
regions.daniel = [
  '<aside class="ages-card ages-full nebuchadnezzar-panel" id="nebuchadnezzar-dream">',
  '  <div class="nebuchadnezzar-grid">',
  '    <div class="nebuchadnezzar-copy">',
  `      <span class="ages-eyebrow" style="color: #b7793d;">${dn.eyebrow}</span>`, `      <h2>${dn.title}</h2>`, `      <p>${dn.intro}</p>`,
  '      <div class="ages-facts" style="margin: 0.8rem 0 1rem;">',
  ...dn.kingdoms.map((k) => `        <div class="ages-fact" id="${k.id}" style="--fact:${k.color}"><strong>${k.part}</strong> <small>${k.text}</small>${showBtn(cards.find((c) => c.id === k.id).target.id, 'Timeline')}</div>`),
  '      </div>',
  `      <p>${dn.ending}</p>`,
  `      <a href="${esc(rel(danielFile) + (danielHash ? '#' + danielHash : ''))}" class="ages-explore-btn" style="text-decoration:none; display:inline-flex;">${dn.link.text}</a>`,
  '    </div>',
  indent(figureHtml(dn.figure, 'age-evidence nebuchadnezzar-figure'), 4),
  '  </div>',
  '</aside>'
].join('\n');

// The page script's data: everything it needs, nothing it has to copy by hand.
const runtime = {
  ages: ages.map((a) => ({
    key: a.key, name: a.name, when: a.when || 'Hypothesized', chapter: a.chapter || a.key, card: a.chapter ? a.card : `tablet-${a.key}`,
    system: a.system, shift: a.shift, christian: a.christian, text: a.text, question: a.question,
    profile: a.tablets && (a.tablets.find((t) => t.profile) || {}).profile,
    lens: a.lens, bridge: !!a.chapter
  })),
  lenses,
  artifacts: allArtifacts
};
regions.data = `<script type="application/json" id="ages-data">${JSON.stringify(runtime).replace(/</g, '\\u003c')}</script>`;

if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

// ------------------------------------------------------------- write

let next = page;
for (const [name, body] of Object.entries(regions)) {
  const re = new RegExp(`([ \\t]*)<!-- ages:${name} [^>]*-->[\\s\\S]*?<!-- /ages:${name} -->`);
  const m = next.match(re);
  if (!m) { console.error(`${PAGE}: region markers for ages:${name} not found`); process.exit(1); }
  const ws = m[1];
  const block = `${ws}<!-- ages:${name} (generated by scripts/build-ages-timeline.mjs from data/ages-lesson.json; don't edit here) -->\n` +
    indent(body, ws.length) + `\n${ws}<!-- /ages:${name} -->`;
  if (/="undefined"|>undefined</.test(block)) { console.error(`[ages] ages:${name}: something rendered as "undefined"`); process.exit(1); }
  next = next.replace(re, () => block);
}

if (args.has('--report')) {
  for (const ev of items) console.log(`${String(ev.when).padEnd(30)} ${(ev.era ? 'ERA' : ev.strand).padEnd(24)} ${ev.label}${ev.facets.length ? '  ← ' + ev.facets.map((c) => c.id).join(', ') : ''}`);
}
console.log(`[ages] ${events.length} milestones (${lessonCards} with lesson cards), ${items.length - events.length} eras, ${lessonCount} lessons, ${cards.length} lesson cards on the timeline`);
if (args.has('--check')) {
  if (next !== page) { console.error('[ages] the-ages.html is out of date: run npm run build:ages-timeline'); process.exit(1); }
  console.log('[ages] up to date');
} else if (next !== page) {
  fs.writeFileSync(path.join(ROOT, PAGE), next);
  console.log(`[ages] wrote ${PAGE}`);
}
