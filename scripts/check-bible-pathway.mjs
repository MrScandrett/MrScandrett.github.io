import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const lessonDir = path.join(root, 'lessons', 'bible-studies');
const dataFile = path.join(root, 'assets', 'js', 'bible-pathway-data.js');
const hubFile = path.join(lessonDir, 'bible-foundations-pathway.html');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(dataFile, 'utf8'), context, { filename: dataFile });

const data = context.window.BiblePathway;
const errors = [];
const unique = (items, field) => {
  const seen = new Map();
  items.forEach(item => {
    if (seen.has(item[field])) errors.push(`Duplicate ${field}: ${item[field]}`);
    seen.set(item[field], item);
  });
};

if (!data) errors.push('bible-pathway-data.js did not expose window.BiblePathway');
else {
  unique(data.lessons, 'id');
  unique(data.lessons, 'href');
  unique(data.lessons, 'code');
  const ids = new Set(data.lessons.map(item => item.id));
  data.lessons.forEach(item => {
    if (!data.stages[item.stage]) errors.push(`${item.id}: unknown stage ${item.stage}`);
    if (!data.routes[item.route]) errors.push(`${item.id}: unknown route ${item.route}`);
    if (!fs.existsSync(path.join(lessonDir, item.href))) errors.push(`${item.id}: missing ${item.href}`);
  });
  Object.entries(data.routes).forEach(([routeId, route]) => {
    route.items.forEach(id => { if (!ids.has(id)) errors.push(`${routeId}: unknown lesson ${id}`); });
    ['returnTo'].forEach(field => { if (route[field] && !ids.has(route[field])) errors.push(`${routeId}: unknown ${field} ${route[field]}`); });
    ['previousRoute', 'nextRoute'].forEach(field => { if (route[field] && !data.routes[route[field]]) errors.push(`${routeId}: unknown ${field} ${route[field]}`); });
  });
  Object.entries(data.related).forEach(([id, related]) => {
    if (!ids.has(id)) errors.push(`Related map has unknown lesson ${id}`);
    related.forEach(target => { if (!ids.has(target)) errors.push(`${id}: unknown related lesson ${target}`); });
  });

  const diskLessons = fs.readdirSync(lessonDir).filter(file => file.endsWith('.html') && file !== 'bible-foundations-pathway.html').sort();
  const manifestLessons = data.lessons.map(item => item.href).sort();
  diskLessons.filter(file => !manifestLessons.includes(file)).forEach(file => errors.push(`Lesson missing from manifest: ${file}`));
  manifestLessons.filter(file => !diskLessons.includes(file)).forEach(file => errors.push(`Manifest file missing from directory: ${file}`));

  const hub = fs.readFileSync(hubFile, 'utf8');
  const hubLinks = [...hub.matchAll(/class="bfp-open-lesson" href="([^"]+)"/g)].map(match => match[1]).sort();
  manifestLessons.filter(file => !hubLinks.includes(file)).forEach(file => errors.push(`Manifest lesson missing from hub cards: ${file}`));
  hubLinks.filter(file => !manifestLessons.includes(file)).forEach(file => errors.push(`Hub card missing from manifest: ${file}`));
  const cardsByHref = new Map();
  for (const card of hub.matchAll(/<article class="bfp-foundation" data-stage="([^"]+)">([\s\S]*?)<\/article>/g)) {
    const href = card[2].match(/class="bfp-open-lesson" href="([^"]+)"/)?.[1];
    if (href) cardsByHref.set(href, { stage: card[1], html: card[2] });
  }
  data.lessons.forEach(item => {
    const card = cardsByHref.get(item.href);
    if (!card) return;
    const code = card.html.match(/bfp-foundation-top"><span>([^<]+)<\/span>/)?.[1];
    const title = card.html.match(/<h3>([^<]+)<\/h3>/)?.[1]?.replaceAll('&amp;', '&').replaceAll('&rsquo;', '’');
    if (card.stage !== item.stage) errors.push(`${item.id}: hub stage ${card.stage} does not match manifest stage ${item.stage}`);
    if (code !== item.code) errors.push(`${item.id}: hub code ${code} does not match manifest code ${item.code}`);
    if (title !== item.title) errors.push(`${item.id}: hub title "${title}" does not match manifest title "${item.title}"`);
  });
}

if (errors.length) {
  console.error(`[bible-pathway] ${errors.length} error(s):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`[bible-pathway] ${data.lessons.length} lessons, ${Object.keys(data.routes).length} routes, and hub cards agree.`);
}
