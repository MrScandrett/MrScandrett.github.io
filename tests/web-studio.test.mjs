import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  emptyDrawing, createItem, placeItem, removeItem, duplicateItem, children, generateCSS, generateHTML,
  validateDrawing, checks, canParent, contrastRatio, safeHref,
} from '../assets/js/web-studio/draw-model.mjs';
import { newProject, validateProject, submissionSlug, pageDocument, codeFingerprint } from '../assets/js/web-studio/project.mjs';
import { readSubmission, planImport, writeImport } from '../lib/studio-submission.mjs';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function sampleDrawing() {
  const d = emptyDrawing();
  const header = createItem(d, 'box', { col: 1, row: 1, colSpan: 12, rowSpan: 3 }, 'header');
  createItem(d, 'text', { parent: header.id, col: 2, row: 1 }, 'h1');
  const main = createItem(d, 'box', { col: 1, row: 4, colSpan: 12, rowSpan: 4 }, 'main');
  createItem(d, 'link', { parent: main.id, col: 7, row: 1 });
  createItem(d, 'text', { parent: main.id, col: 1, row: 1 }, 'p');
  return d;
}

test('drawn items become nested grid placements in reading order', () => {
  const d = sampleDrawing();
  const html = generateHTML(d);
  assert.match(html, /<header class="header">\n    <h1 class="title">Your big idea<\/h1>\n  <\/header>\n  <main class="main">\n    <p class="text">/, 'source order follows rows then columns, not drawing order');
  const css = generateCSS(d);
  assert.match(css, /\.header \{\n  grid-column: 1 \/ span 12;\n  grid-row: 1 \/ span 3;\n  display: grid;\n  grid-template-columns: repeat\(12, 1fr\);/);
  assert.match(css, /\.title \{\n  grid-column: 2 \/ span 8;\n  grid-row: 1 \/ span 2;/);
  assert.match(css, /@media \(max-width: 700px\) \{[\s\S]*body, \.header, \.main \{\n    grid-template-columns: 1fr;[\s\S]*\.title \{ grid-column: 1 \/ -1; grid-row: span 2; \}/);
  assert.match(css, /^:root \{/m);
  assert.match(generateCSS(d, { root: '.ws-page', phone: 'container', varsOn: ':host' }), /^:host \{[\s\S]*^\.ws-page \{[\s\S]*@container page/m);
});

test('placement is clamped to the grid and parents cannot loop', () => {
  const d = sampleDrawing();
  const [header, main] = children(d, null);
  const title = children(d, header.id)[0];
  placeItem(d, title.id, { col: 11, colSpan: 8 });
  assert.equal(title.col + title.colSpan - 1, 12, 'never wider than the 12 columns');
  assert.equal(canParent(d, header.id, title.id), false, 'a text item cannot hold things');
  const inner = createItem(d, 'box', { parent: main.id });
  assert.equal(canParent(d, main.id, inner.id), false, 'a box cannot move inside its own child');
  placeItem(d, main.id, { parent: inner.id });
  assert.equal(main.parent, null);
  const copy = duplicateItem(d, main.id);
  assert.equal(children(d, copy.id).length, children(d, main.id).length, 'duplicate copies children');
  removeItem(d, main.id);
  assert.ok(!d.items.some((item) => item.parent === main.id), 'removing a box removes what is inside it');
});

test('a standard-size item placed near the right edge shifts left instead of shrinking', () => {
  const d = emptyDrawing();
  const box = createItem(d, 'box', { col: 11, row: 1 });
  assert.deepEqual([box.col, box.colSpan], [7, 6]);
});

test('drawings from files are validated and repaired', () => {
  const d = sampleDrawing();
  const raw = JSON.parse(JSON.stringify(d));
  raw.items[0].style.background = 'red; } body { display:none';
  raw.items[1].parent = raw.items[1].id;
  raw.items[2].name = 'Bad Name!';
  raw.items[3].href = 'javascript:alert(1)';
  const clean = validateDrawing(raw);
  assert.equal(clean.items[0].style.background, '');
  assert.equal(clean.items[1].parent, null);
  assert.match(clean.items[2].name, /^[a-z][a-z0-9-]*$/);
  assert.equal(clean.items[3].href, '');
  assert.throws(() => validateDrawing({ version: 1, items: [{ id: 'x', kind: 'script' }] }));
  assert.equal(safeHref('about.html'), true);
  assert.equal(safeHref('data:text/html,hi'), false);
  assert.ok(!generateHTML(validateDrawing({ ...raw, items: [{ ...raw.items[1], text: '<img src=x onerror=alert(1)>' }] })).includes('<img'));
});

test('design checks report what the lessons teach', () => {
  const d = sampleDrawing();
  assert.deepEqual(checks(d).map((r) => r.level), ['pass']);
  createItem(d, 'text', {}, 'h1');
  const image = createItem(d, 'image', {});
  const faint = createItem(d, 'text', {}, 'p');
  faint.style.color = '#dddddd';
  const results = checks(d).map((r) => r.text).join('\n');
  assert.match(results, /2 items use <h1>/);
  assert.match(results, new RegExp(`${image.name} needs alt text`));
  assert.match(results, new RegExp(`${faint.name}: contrast 1\\.\\d : 1 is too low`));
  assert.ok(contrastRatio('#000000', '#ffffff') > 20);
});

function submission(overrides = {}) {
  const project = newProject('Robot Garden');
  project.author = 'Ada';
  project.draw = sampleDrawing();
  project.files['index.html'] = pageDocument('Robot Garden', generateHTML(project.draw));
  project.files['style.css'] = generateCSS(project.draw);
  project.assets['images/robot.png'] = { type: 'image/png', data: PNG };
  project.submission = { slug: 'ada-robot-garden', category: 'Game', submittedAt: new Date().toISOString(), noPersonalInfo: true, imagesCredited: true };
  return { ...JSON.parse(JSON.stringify(project)), ...overrides };
}

test('project files round-trip and reject anything that is not a site file', () => {
  const value = submission();
  const project = validateProject(value);
  assert.equal(project.title, 'Robot Garden');
  assert.equal(codeFingerprint(project.files), codeFingerprint(validateProject(JSON.parse(JSON.stringify(project))).files));
  assert.throws(() => validateProject({ ...value, files: { ...value.files, '../server.js': 'x' } }), /not one of the files/);
  assert.throws(() => validateProject({ ...value, assets: { '../../evil.png': value.assets['images/robot.png'] } }), /not a valid image name/);
  assert.throws(() => validateProject({ ...value, assets: { 'images/a.png': { type: 'image/svg+xml', data: 'data:image/svg+xml;base64,PHN2Zz4=' } } }), /PNG, JPEG, GIF or WebP/);
  assert.throws(() => validateProject({ format: 'something-else' }), /Web Studio project file/);
  assert.equal(submissionSlug('  ada  lovelace ', 'Robot Garden!'), 'ada-lovelace-robot-garden');
});

test('a submission imports into student-projects/<Name>/<slug>/ with a showcase entry', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'web-studio-'));
  try {
    await fs.mkdir(path.join(root, 'data'));
    await fs.writeFile(path.join(root, 'data', 'manifest-overrides.json'), '{\n  "existing": {\n    "name": "Kept"\n  }\n}\n');
    const plan = planImport(readSubmission(JSON.stringify(submission())), root, { program: 'Microschool' });
    assert.equal(plan.relDir, 'student-projects/Ada/ada-robot-garden');
    const result = await writeImport(plan, root);
    assert.deepEqual(result.files.sort(), ['images/robot.png', 'index.html', 'script.js', 'style.css']);
    assert.match(await fs.readFile(path.join(root, plan.relDir, 'index.html'), 'utf8'), /<title>Robot Garden<\/title>/);
    assert.equal((await fs.readFile(path.join(root, plan.relDir, 'images/robot.png'))).subarray(1, 4).toString(), 'PNG');
    const overrides = JSON.parse(await fs.readFile(path.join(root, 'data', 'manifest-overrides.json'), 'utf8'));
    assert.equal(overrides.existing.name, 'Kept');
    assert.deepEqual({ ...overrides['ada-robot-garden'], date_added: 'x' }, { student: 'Ada', name: 'Robot Garden', category: 'Game', tech: ['HTML', 'CSS', 'JavaScript'], tags: ['web-studio', 'game'], date_added: 'x', thumbnail: './apps/ada-robot-garden/images/robot.png', program: 'Microschool' });
    await assert.rejects(writeImport(plan, root), /already exists/);
    await fs.writeFile(path.join(root, plan.relDir, 'notes.md'), 'teacher notes');
    await writeImport(plan, root, { replace: true });
    assert.equal(await fs.readFile(path.join(root, plan.relDir, 'notes.md'), 'utf8'), 'teacher notes', 'replace only touches submission files');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('submissions without consent, a name, or the submission block are refused', () => {
  assert.throws(() => readSubmission(JSON.stringify(submission({ submission: undefined }))), /not a submission/);
  assert.throws(() => readSubmission(JSON.stringify(submission({ submission: { ...submission().submission, imagesCredited: false } }))), /did not confirm/);
  assert.throws(() => readSubmission(JSON.stringify(submission({ author: '../../..' }))), /no student name/);
  assert.throws(() => readSubmission('{not json'), /not valid JSON/);
  const sneaky = readSubmission(JSON.stringify(submission({ author: 'Ada/../../etc' })));
  assert.equal(sneaky.student, 'Adaetc');
});
