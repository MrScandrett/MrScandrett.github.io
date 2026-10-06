/* ClassroomOS Web Studio — one website project, three ways to build it.
 *
 *   Draw    boxes, text and images on a 12-column grid  → writes index.html + style.css
 *   Blocks  the website-blocks workbench                → writes index.html + style.css + script.js
 *   Code    the three files themselves, with a live preview
 *   Share   submit to the class site (teacher imports it with OSeditor) or export a ZIP
 *           ready for the student's own GitHub Pages site.
 *
 * Code is the hand-off point: Draw and Blocks send their output to Code, and Code can be
 * turned back into blocks. A hand-off never silently overwrites typed code: the studio
 * remembers a fingerprint of what the last hand-off wrote and asks before replacing changes.
 * Projects live in this browser (IndexedDB, so images fit) and in .webstudio.json files. */
import {
  FORMAT, VERSION, FILE_NAMES, IMAGE_TYPES, LIMITS, newProject, validateProject, pageDocument, bodyOf,
  slugify, dataUrlBytes, assetsBytes, codeFingerprint, cleanStudentName, submissionSlug,
} from './project.mjs';
import { generateCSS, generateHTML } from './draw-model.mjs';
import { createDrawEditor } from './draw-editor.mjs';
import { makeZip, dataUrlToBytes } from './zip.mjs';

const $ = (name) => document.querySelector(`[data-ws-${name}]`);
const LAST_KEY = 'classroomos-web-studio-last';
const SITE = 'https://mrscandrett.github.io';

// ---------- storage: IndexedDB, with a clear message when it is unavailable ----------
let dbPromise = null;
function db() {
  if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open('classroomos-web-studio', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('projects', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}
async function store(mode, fn) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('projects', mode);
    const result = fn(tx.objectStore('projects'));
    tx.oncomplete = () => resolve(result.result ?? result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Storage is full.'));
  });
}
const listProjects = () => store('readonly', (s) => s.getAll());
const putProject = (project) => store('readwrite', (s) => s.put(project));
const removeProject = (id) => store('readwrite', (s) => s.delete(id));

function download(name, content, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const indent = (text, pad = '  ') => text.split('\n').map((line) => (line ? pad + line : line)).join('\n');

// ---------- state ----------
let project = newProject();
let storageOk = true;
let saveTimer = 0;
let previewTimer = 0;
let currentFile = 'index.html';
let lab = null;
let labLoading = null;
let previewToken = '';

const status = (message) => { $('status').textContent = message; };

function scheduleSave() {
  project.updated = new Date().toISOString();
  clearTimeout(saveTimer);
  $('saved').textContent = 'Saving…';
  saveTimer = setTimeout(saveNow, 500);
}
async function saveNow() {
  clearTimeout(saveTimer);
  try {
    await putProject(structuredClone(project));
    try { localStorage.setItem(LAST_KEY, project.id); } catch { /* the project itself is saved */ }
    storageOk = true;
    $('saved').textContent = `Saved in this browser at ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`;
    refreshProjectList();
  } catch {
    storageOk = false;
    $('saved').textContent = 'This browser is not saving your work (private window or storage full). Use Save project file before you leave.';
  }
}

async function refreshProjectList() {
  const select = $('projects');
  let all = [];
  try { all = await listProjects(); } catch { /* reported by saveNow */ }
  all.sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
  select.replaceChildren(...all.map((p) => new Option(p.title || 'Untitled', p.id)));
  if (!all.some((p) => p.id === project.id)) select.add(new Option(project.title, project.id), 0);
  select.value = project.id;
}

// ---------- loading a project into every mode ----------
let draw;
function loadProject(value, message) {
  project = value;
  $('title').value = project.title;
  draw.load(project.draw);
  showFile(currentFile);
  renderAssets();
  updatePreview();
  fillShare();
  if (lab) syncBlocksFromProject();
  refreshProjectList();
  status(message || `Opened “${project.title}”.`);
}

// ---------- tabs ----------
const tabs = [...document.querySelectorAll('[data-ws-tab]')];
function showTab(name, focus = false) {
  for (const tab of tabs) {
    const active = tab.dataset.wsTab === name;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    if (active && focus) tab.focus();
  }
  if (history.replaceState) history.replaceState(null, '', `#${name}`);
  if (name === 'draw') draw.relayout();
  if (name === 'blocks') ensureBlocks().then(() => lab?.resize()).catch(() => {});
  if (name === 'code') { showFile(currentFile); updatePreview(); }
  if (name === 'share') fillShare();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => showTab(tab.dataset.wsTab));
  tab.addEventListener('keydown', (event) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); showTab(tabs[event.key === 'Home' ? 0 : tabs.length - 1].dataset.wsTab, true); }
    if (step) { event.preventDefault(); showTab(tabs[(index + step + tabs.length) % tabs.length].dataset.wsTab, true); }
  });
});
document.querySelectorAll('[data-ws-goto]').forEach((button) => button.addEventListener('click', () => showTab(button.dataset.wsGoto, true)));

// ---------- hand-offs between modes ----------
function codeChangedSinceHandOff() {
  return project.sent.code !== codeFingerprint(project.files);
}
function confirmReplace(what, from) {
  if (!codeChangedSinceHandOff()) return true;
  const source = project.sent.from === 'new' ? 'the starter page' : project.sent.from === 'draw' ? 'your last drawing' : project.sent.from === 'blocks' ? 'your last blocks' : 'a hand-off';
  return window.confirm(`Your code has changes made after ${source}. Sending ${from} will replace ${what}. Save a project file first if you want to keep those changes.\n\nReplace them?`);
}
function writeFiles(files, from) {
  Object.assign(project.files, files);
  project.sent = { code: codeFingerprint(project.files), from };
  showFile(currentFile);
  updatePreview();
  scheduleSave();
}

function sendDrawing() {
  draw.flush();
  if (!project.draw.items.length) { status('Draw something first: choose Box or Text and drag on the page.'); return; }
  if (!confirmReplace('index.html and style.css', 'the drawing')) { status('Nothing was replaced.'); return; }
  writeFiles({
    'index.html': pageDocument(project.title, generateHTML(project.draw, { indent: 1 })),
    'style.css': generateCSS(project.draw),
  }, 'draw');
  status('The drawing is now code: index.html and style.css. Your script.js was kept. Open Code to read it, or Blocks to add behavior.');
  $('after-send').hidden = false;
}

async function ensureBlocks() {
  if (lab) return lab;
  if (!labLoading) {
    const section = $('blocks');
    const start = section.querySelector('[data-wb-start-status]');
    start.textContent = 'Loading the block workbench…';
    labLoading = import('../lessons/web-blocks-workbench.mjs')
      .then((module) => module.mount(section, { onChange: (state) => { project.blocks = state; scheduleSave(); } }))
      .then((mounted) => {
        lab = mounted;
        section.querySelector('[data-wb-app]').hidden = false;
        start.textContent = '';
        syncBlocksFromProject();
        return lab;
      })
      .catch((error) => { labLoading = null; start.textContent = `The block workbench could not load. Check your connection and try again. ${error.message}`; throw error; });
  }
  return labLoading;
}
function syncBlocksFromProject() {
  try {
    if (project.blocks) lab.loadState(project.blocks, `Blocks for “${project.title}”. Send blocks to Code when you want them in your files.`);
    else codeToBlocks(false);
  } catch {
    codeToBlocks(false);
  }
}
function codeToBlocks(ask = true) {
  if (!lab) { ensureBlocks().then(() => codeToBlocks(ask)).catch(() => {}); return; }
  if (ask && project.blocks && !window.confirm('Rebuild your blocks from the code? Your current blocks are replaced (Restore previous project in the workbench can undo it).')) return;
  const html = bodyOf(project.files['index.html']).replace(/^ {2}/gm, '');
  lab.loadCode({ title: project.title, html, css: project.files['style.css'], js: project.files['script.js'] });
  project.blocks = lab.getState();
  scheduleSave();
  if (ask) status('Your code is now blocks. Change them, then Send blocks to Code.');
}
async function sendBlocks() {
  await ensureBlocks();
  const code = lab.getCode();
  if (!confirmReplace('all three files', 'the blocks')) { status('Nothing was replaced.'); return; }
  writeFiles({
    'index.html': pageDocument(project.title, indent(code.html.replace(/\s+$/, ''))),
    'style.css': code.css,
    'script.js': code.js,
  }, 'blocks');
  status(`Blocks sent to Code: index.html, style.css and script.js.${code.warnings.length ? ` ${code.warnings.join(' ')}` : ''}`);
}

// ---------- Code mode ----------
const editor = $('editor');
function showFile(name) {
  currentFile = name;
  document.querySelectorAll('[data-ws-file-tab]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.wsFileTab === name)));
  editor.value = project.files[name];
  editor.setAttribute('aria-label', `Code of ${name}`);
  $('file-name').textContent = name;
}
document.querySelectorAll('[data-ws-file-tab]').forEach((button) => button.addEventListener('click', () => showFile(button.dataset.wsFileTab)));
editor.addEventListener('input', () => {
  if (editor.value.length > LIMITS.file) { status(`${currentFile} is too long to keep (${LIMITS.file.toLocaleString()} characters at most).`); return; }
  project.files[currentFile] = editor.value;
  scheduleSave();
  clearTimeout(previewTimer);
  previewTimer = setTimeout(updatePreview, 400);
});
editor.addEventListener('keydown', (event) => {
  // Tab indents inside the editor; Esc then Tab leaves it, so keyboard users are never trapped.
  if (event.key === 'Escape') { editor.dataset.escape = '1'; return; }
  if (event.key !== 'Tab' || editor.dataset.escape) { delete editor.dataset.escape; return; }
  event.preventDefault();
  const { selectionStart: start, selectionEnd: end } = editor;
  editor.setRangeText('  ', start, end, 'end');
  editor.dispatchEvent(new Event('input'));
});

function inlineAssets(text) {
  return text.replace(/(["'(=]\s*)(images\/[a-z0-9-]+\.(?:png|jpg|gif|webp))/g, (match, lead, path) => (project.assets[path] ? lead + project.assets[path].data : match));
}
function previewDocument() {
  const notes = [];
  let html = inlineAssets(project.files['index.html']);
  const css = inlineAssets(project.files['style.css']).replace(/<\/style/gi, '<\\/style');
  const js = project.files['script.js'].replace(/<\/script/gi, '<\\/script');
  const linkPattern = /<link\b[^>]*href=["']style\.css["'][^>]*>/i;
  const scriptPattern = /<script\b[^>]*src=["']script\.js["'][^>]*>\s*<\/script>/i;
  if (linkPattern.test(html)) html = html.replace(linkPattern, () => `<style>\n${css}</style>`);
  else notes.push('index.html does not link style.css, so none of your CSS applies.');
  if (scriptPattern.test(html)) {
    html = html.replace(scriptPattern, '');
    html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, () => `<script>\n${js}</script>\n</body>`) : `${html}<script>\n${js}</script>`;
  } else if (project.files['script.js'].replace(/\/\/.*$/gm, '').trim()) notes.push('index.html does not load script.js, so your JavaScript never runs.');
  for (const [, path] of project.files['index.html'].matchAll(/(?:src|href)=["']([^"'#?]+)["']/g)) {
    if (/^(https?:|mailto:|data:)/.test(path) || ['style.css', 'script.js'].includes(path) || /\.html$/.test(path)) continue;
    if (path.startsWith('/') || /^[a-z]:\\/i.test(path)) notes.push(`${path} is an absolute path; it will break on a real host. Use images/… instead.`);
    else if (!project.assets[path]) notes.push(`${path} is not in your project. Upload it under Images, or fix the name (capital letters count).`);
  }
  previewToken = crypto.randomUUID();
  const bridge = `<script>(()=>{const send=(kind,text)=>parent.postMessage({webStudio:${JSON.stringify(previewToken)},kind,text:String(text).slice(0,2000)},'*');addEventListener('error',e=>send('error',e.message));addEventListener('unhandledrejection',e=>send('error',e.reason&&e.reason.message||e.reason));const log=console.log;console.log=(...a)=>{log.apply(console,a);send('log',a.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join(' '))};document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href]');if(a&&!a.getAttribute('href').startsWith('#')){e.preventDefault();send('note','Links to other pages open on your real site, not in this preview: '+a.getAttribute('href'))}});})();</script>`;
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src https: data:; font-src https: data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'">`;
  html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (head) => `${head}${csp}${bridge}`) : `${csp}${bridge}${html}`;
  return { html, notes };
}
function updatePreview() {
  const { html, notes } = previewDocument();
  $('messages').textContent = '';
  $('preview').srcdoc = html;
  $('preview-status').textContent = notes.length ? notes.join(' ') : 'Preview is up to date.';
  $('preview-status').classList.toggle('is-warning', notes.length > 0);
}
window.addEventListener('message', (event) => {
  if (event.source !== $('preview').contentWindow || event.data?.webStudio !== previewToken || typeof event.data.text !== 'string') return;
  const { kind, text } = event.data;
  $('messages').textContent = `${$('messages').textContent}${kind}: ${text}\n`.slice(-6000);
  if (kind === 'error') { $('preview-status').textContent = `JavaScript needs a repair: ${text}`; $('preview-status').classList.add('is-warning'); }
});
$('width').addEventListener('change', () => $('preview').classList.toggle('is-phone', $('width').value === 'phone'));

// ---------- images ----------
async function addAsset(file) {
  const ext = IMAGE_TYPES[file.type];
  if (!ext) throw new Error('Choose a PNG, JPEG, GIF or WebP image.');
  if (file.size > LIMITS.image) throw new Error(`${file.name} is larger than 2 MB. Make it smaller first (most photos look fine at 1600 pixels wide).`);
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('That image could not be read.'));
    reader.readAsDataURL(file);
  });
  if (assetsBytes(project.assets) + dataUrlBytes(data) > LIMITS.assets) throw new Error('Your images would add up to more than 6 MB. Remove one or use smaller files.');
  const base = slugify(file.name.replace(/\.[^.]+$/, ''), 'image').slice(0, 50);
  let path = `images/${base}.${ext}`;
  for (let n = 2; project.assets[path]; n++) path = `images/${base}-${n}.${ext}`;
  project.assets[path] = { type: file.type, data };
  renderAssets();
  scheduleSave();
  return path;
}
function renderAssets() {
  const list = $('assets');
  const paths = Object.keys(project.assets).sort();
  list.replaceChildren(...paths.map((path) => {
    const img = Object.assign(document.createElement('img'), { src: project.assets[path].data, alt: '' });
    const code = Object.assign(document.createElement('code'), { textContent: path });
    const copy = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Copy path' });
    copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(path); status(`Copied ${path}. Paste it into a src="" in index.html.`); } catch { status(`The path is ${path}.`); } });
    const remove = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Remove' });
    remove.addEventListener('click', () => {
      if (!window.confirm(`Remove ${path} from this project?`)) return;
      delete project.assets[path];
      renderAssets(); updatePreview(); scheduleSave(); draw.refresh();
      status(`${path} removed. Anything that used it now shows as missing.`);
    });
    const li = document.createElement('li');
    li.append(img, code, copy, remove);
    return li;
  }));
  if (!paths.length) list.append(Object.assign(document.createElement('li'), { className: 'ws-muted', textContent: 'No images yet.' }));
  $('assets-size').textContent = `${(assetsBytes(project.assets) / 1e6).toFixed(1)} of 6 MB used.`;
}
// Bring an existing site (a starter pack, or files from VS Code) into the project.
$('import-files').addEventListener('change', async () => {
  const files = [...$('import-files').files];
  $('import-files').value = '';
  if (!files.length) return;
  const pages = files.filter((file) => /\.html?$/i.test(file.name));
  const page = pages.find((file) => file.name.toLowerCase() === 'index.html') || (pages.length === 1 ? pages[0] : null);
  const pick = (pattern, preferred) => files.find((file) => file.name.toLowerCase() === preferred) || (files.filter((file) => pattern.test(file.name)).length === 1 ? files.find((file) => pattern.test(file.name)) : null);
  const incoming = { 'index.html': page, 'style.css': pick(/\.css$/i, 'style.css'), 'script.js': pick(/\.js$/i, 'script.js') };
  const replacing = Object.entries(incoming).filter(([, file]) => file).map(([name]) => name);
  const notes = [];
  if (pages.length > 1 && !page) notes.push('Several .html files and none is index.html, so no page was loaded. Choose index.html.');
  if (pages.length > 1 && page) notes.push(`Only ${page.name} was loaded; Web Studio projects have one page.`);
  if (replacing.length && !window.confirm(`Replace ${replacing.join(', ')} with your files? Save a project file first if you want to keep the current code.`)) return;
  for (const [name, file] of Object.entries(incoming)) {
    if (!file) continue;
    if (file.size > LIMITS.file) { notes.push(`${file.name} is too large to open here.`); continue; }
    project.files[name] = await file.text();
  }
  for (const file of files.filter((item) => IMAGE_TYPES[item.type])) {
    try { await addAsset(file); } catch (error) { notes.push(error.message); }
  }
  showFile(currentFile);
  updatePreview();
  scheduleSave();
  status(`Opened ${files.map((file) => file.name).join(', ')}.${notes.length ? ` ${notes.join(' ')}` : ''} Images are saved as images/<name>. Check the paths in your code still match.`);
});

$('upload').addEventListener('change', async () => {
  for (const file of $('upload').files) {
    try { const path = await addAsset(file); status(`Added ${path}. Use it as src="${path}".`); }
    catch (error) { status(error.message); }
  }
  $('upload').value = '';
  updatePreview();
});

// ---------- Share: export, submit, back up ----------
function siteChecks() {
  const results = [];
  const doc = new DOMParser().parseFromString(project.files['index.html'], 'text/html');
  if (!doc.title.trim() || doc.title.trim() === 'My website') results.push('Give the page a real <title>: change the project title, then send your drawing or blocks again, or edit index.html.');
  if (doc.querySelectorAll('h1').length !== 1) results.push(`The page has ${doc.querySelectorAll('h1').length} <h1> headings; it should have exactly one.`);
  const noAlt = [...doc.querySelectorAll('img')].filter((img) => !img.hasAttribute('alt')).length;
  if (noAlt) results.push(`${noAlt} image${noAlt === 1 ? ' has' : 's have'} no alt attribute.`);
  results.push(...previewDocument().notes);
  return results;
}
function readme() {
  return `# ${project.title}

Made in ClassroomOS Web Studio (${SITE}/lessons/web-design/web-studio.html).

## What is in this folder

- index.html: the content and structure of the page
- style.css: the design
- script.js: the behavior
- images/: pictures the page uses

## Put it on your own website with GitHub Pages

1. Sign in to GitHub and create a new public repository. Name it
   your-username.github.io to make it your main site, or give it any name.
2. In the new repository choose "Add file", then "Upload files". Drag in
   everything from this folder (index.html, style.css, script.js, and the
   images folder). Drag the files, not the folder that holds them.
3. Press "Commit changes".
4. Open Settings, then Pages. Under "Build and deployment" choose
   "Deploy from a branch", pick the main branch and the / (root) folder, and save.
5. Wait a minute or two, then visit https://your-username.github.io/
   (or https://your-username.github.io/repository-name/).

Keep editing in Web Studio and upload the changed files again, or open this
folder in VS Code and follow the "Publish and maintain your website" lesson.
`;
}
function exportZip() {
  draw.flush();
  const files = FILE_NAMES.map((name) => [name, project.files[name]]);
  for (const [path, asset] of Object.entries(project.assets).sort()) files.push([path, dataUrlToBytes(asset.data)]);
  files.push(['README.md', readme()]);
  download(`${slugify(project.title)}-website.zip`, makeZip(files), 'application/zip');
  status('Your website ZIP is downloading. Unzip it, then follow the steps beside the button (they are in README.md too).');
}
function projectFile(extra = {}) {
  draw.flush();
  if (lab) project.blocks = lab.getState();
  return JSON.stringify({ ...structuredClone(project), format: FORMAT, version: VERSION, ...extra }, null, 2);
}
function fillShare() {
  const name = cleanStudentName($('author').value || project.author);
  const slug = submissionSlug(name || 'your-name', project.title);
  $('share-url').textContent = `${SITE}/apps/${slug}/`;
  const list = $('share-checks');
  const results = siteChecks();
  list.replaceChildren(...(results.length ? results : ['No problems found in index.html, the links to style.css and script.js, or your image paths.']).map((text) => Object.assign(document.createElement('li'), { textContent: text, className: results.length ? 'is-fail' : 'is-pass' })));
  if (!$('author').value && project.author) $('author').value = project.author;
  if (!$('description').value && project.description) $('description').value = project.description;
}
$('author').addEventListener('input', () => { project.author = cleanStudentName($('author').value); scheduleSave(); fillShare(); });
$('description').addEventListener('input', () => { project.description = $('description').value.slice(0, LIMITS.description); scheduleSave(); });
$('submit-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = cleanStudentName($('author').value);
  if (!name) { status('Add your first name or nickname so your teacher knows whose work it is.'); $('author').focus(); return; }
  if (project.title.trim() === 'My website') { status('Give your project its own title first (top of the page).'); $('title').focus(); return; }
  if (!$('consent-info').checked || !$('consent-images').checked) { status('Tick both promises before submitting.'); return; }
  const slug = submissionSlug(name, project.title);
  project.author = name;
  const submission = { slug, category: $('category').value, submittedAt: new Date().toISOString(), noPersonalInfo: true, imagesCredited: true };
  download(`${slug}.webstudio.json`, projectFile({ author: name, submission }), 'application/json');
  scheduleSave();
  status(`Submission file ${slug}.webstudio.json is downloading. Hand it in the way your class collects work. Once your teacher publishes it, it will be at ${SITE}/apps/${slug}/`);
});

// ---------- project menu ----------
$('title').addEventListener('input', () => {
  project.title = $('title').value.slice(0, LIMITS.title) || 'My website';
  scheduleSave();
  fillShare();
});
$('projects').addEventListener('change', async () => {
  await saveNow();
  const all = await listProjects().catch(() => []);
  const found = all.find((p) => p.id === $('projects').value);
  if (found) {
    try { loadProject(validateProject(found)); }
    catch (error) { status(`That project could not be opened: ${error.message}`); }
  }
});
$('new').addEventListener('click', async () => {
  await saveNow();
  loadProject(newProject('My website'), 'New project. Give it a title, then start drawing.');
  await saveNow();
  showTab('draw');
  $('title').select();
});
$('save-file').addEventListener('click', () => {
  download(`${slugify(project.title)}.webstudio.json`, projectFile(), 'application/json');
  status('Project file downloading. Open it here later with Open project file, on any computer.');
});
$('open-file').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', async () => {
  const file = $('file').files[0];
  $('file').value = '';
  if (!file) return;
  try {
    if (file.size > 12_000_000) throw new Error('That file is too large to be a Web Studio project.');
    const opened = validateProject(JSON.parse(await file.text()));
    delete opened.submission;
    await saveNow();
    const all = await listProjects().catch(() => []);
    if (all.some((p) => p.id === opened.id) && !window.confirm(`“${opened.title}” is already in this browser. Replace the saved copy with the file?`)) {
      opened.id = newProject().id;
      opened.title = `${opened.title} (copy)`.slice(0, LIMITS.title);
    }
    loadProject(opened, `Opened “${opened.title}” from your file.`);
    await saveNow();
  } catch (error) {
    status(`Could not open that file: ${error.message} Your current project is unchanged.`);
  }
});
$('delete').addEventListener('click', async () => {
  if (!window.confirm(`Delete “${project.title}” from this browser? Any project file you downloaded is not affected.`)) return;
  try { await removeProject(project.id); } catch { /* not stored yet */ }
  const all = await listProjects().catch(() => []);
  all.sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
  loadProject(all[0] ? validateProject(all[0]) : newProject(), 'Project deleted from this browser.');
  await saveNow();
});

$('send-draw').addEventListener('click', sendDrawing);
$('send-blocks').addEventListener('click', () => sendBlocks().catch(() => {}));
document.querySelectorAll('[data-ws-code-to-blocks]').forEach((button) => button.addEventListener('click', async () => {
  try { await ensureBlocks(); showTab('blocks'); codeToBlocks(true); } catch { /* status shown in Blocks */ }
}));
$('export').addEventListener('click', exportZip);

window.addEventListener('pagehide', () => { draw.flush(); if (lab) project.blocks = lab.getState(); saveNow(); });
window.addEventListener('beforeunload', (event) => { if (!storageOk) { event.preventDefault(); event.returnValue = ''; } });

// ---------- start ----------
draw = createDrawEditor($('draw'), {
  onChange: (drawing) => { project.draw = structuredClone(drawing); scheduleSave(); },
  assetUrl: (path) => project.assets[path]?.data || '',
  assets: () => Object.keys(project.assets).sort(),
  addAsset,
});

(async () => {
  let opened = null;
  try {
    const all = await listProjects();
    let last = null;
    try { last = localStorage.getItem(LAST_KEY); } catch { /* fall back to the newest */ }
    all.sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
    const found = all.find((p) => p.id === last) || all[0];
    if (found) opened = validateProject(found);
  } catch {
    storageOk = false;
  }
  loadProject(opened || newProject(), opened ? `Welcome back to “${opened.title}”.` : 'A new project is ready. Name it, then draw your layout.');
  if (!opened) await saveNow();
  if (!storageOk) $('saved').textContent = 'This browser is not saving your work (private window or storage blocked). Use Save project file before you leave.';
  const hash = location.hash.slice(1);
  showTab(tabs.some((tab) => tab.dataset.wsTab === hash) ? hash : 'draw');
})();
