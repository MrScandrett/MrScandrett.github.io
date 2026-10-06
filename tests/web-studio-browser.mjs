/* Drives Web Studio with a real mouse and keyboard.
 * Run with a local server:  node serve-local.js  then
 *   WEB_STUDIO_URL=http://localhost:8080 node tests/web-studio-browser.mjs */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { findChromium } from '../lib/find-chromium.mjs';
import { validateProject } from '../assets/js/web-studio/project.mjs';

const base = process.env.WEB_STUDIO_URL || 'http://localhost:8080';
const browser = await chromium.launch({ headless: true, executablePath: findChromium() });
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1500, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto(`${base}/lessons/web-design/web-studio.html`);
  await page.waitForFunction(() => /Saved in this browser/.test(document.querySelector('[data-ws-saved]').textContent));

  await page.fill('[data-ws-title]', 'Robot Garden');
  const stage = page.locator('.ds-stage');
  const css = async () => {
    const details = page.locator('.ds-code');
    if (!(await details.evaluate((d) => d.open))) await details.locator('summary').click();
    await page.locator('.ds-code select').selectOption('css');
    return page.locator('.ds-code code').textContent();
  };
  const html = async () => {
    await page.locator('.ds-code select').selectOption('html');
    return page.locator('.ds-code code').textContent();
  };

  // 1. Draw a header box across the whole width, three rows tall.
  await page.getByRole('button', { name: /^Box$/ }).click();
  await page.locator('.ds-tool-tag').selectOption('header');
  await page.evaluate(() => document.querySelector('.ds-toolbar').scrollIntoView({ block: 'start' }));
  const frame = await page.locator('.ds-host').boundingBox();
  await page.mouse.move(frame.x + 30, frame.y + 30);
  await page.mouse.down();
  await page.mouse.move(frame.x + frame.width / 2, frame.y + 100, { steps: 5 });
  await page.mouse.move(frame.x + frame.width - 30, frame.y + 150, { steps: 5 });
  await page.mouse.up();
  let code = await css();
  assert.match(code, /\.header \{\n  grid-column: 1 \/ span 12;\n  grid-row: 1 \/ span 3;/, 'drawn header spans 12 columns and 3 rows');

  // 2. Click inside the header with the Text tool: a heading lands on the header's own grid, then type.
  await page.getByRole('button', { name: /^Text$/ }).click();
  await page.locator('.ds-tool-tag').selectOption('h1');
  await page.mouse.click(frame.x + 80, frame.y + 60);
  await page.keyboard.type('Robot Garden');
  await page.keyboard.press('Enter');
  assert.match(await html(), /<header class="header">\n    <h1 class="title">Robot Garden<\/h1>\n  <\/header>/, 'heading nested inside the header with typed text');

  // 3. Drag the heading to the right inside the header (it keeps its 8-column span).
  const title = await page.locator('.ds-host').evaluate((host) => {
    const r = host.shadowRoot.querySelector('.title').getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.move(title.x + 20, title.y + 10);
  await page.mouse.down();
  await page.mouse.move(title.x + 120, title.y + 12, { steps: 4 });
  await page.mouse.move(title.x + 260, title.y + 12, { steps: 4 });
  await page.mouse.up();
  code = await css();
  const titleRule = /\.title \{\n  grid-column: (\d+) \/ span (\d+);/.exec(code);
  assert.ok(titleRule && Number(titleRule[1]) > 1 && titleRule[2] === '8', `heading moved right, still 8 wide: ${titleRule?.[0]}`);

  // 4. Keyboard: Shift+Left shrinks it by one column, Delete + Undo restores it.
  await stage.focus();
  await page.keyboard.press('Shift+ArrowLeft');
  assert.match(await css(), /\.title \{\n  grid-column: \d+ \/ span 7;/, 'Shift+Arrow resizes');
  await page.keyboard.press('Delete');
  assert.doesNotMatch(await html(), /class="title"/, 'Delete removes the selected item');
  await page.keyboard.press('Control+z');
  assert.match(await html(), /class="title">Robot Garden/, 'Undo restores it');

  // 5. Resize the header by its bottom handle to make it taller.
  await page.locator('[data-ws-tab="draw"]').click();
  await page.locator('.ds-layer', { hasText: '.header' }).click();
  const handle = await page.locator('.ds-host').evaluate((host) => {
    const r = host.shadowRoot.querySelector('.ws-handle[data-handle="s"]').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.move(handle.x, handle.y);
  await page.mouse.down();
  await page.mouse.move(handle.x, handle.y + 60, { steps: 4 });
  await page.mouse.move(handle.x, handle.y + 112, { steps: 4 });
  await page.mouse.up();
  assert.match(await css(), /\.header \{\n  grid-column: 1 \/ span 12;\n  grid-row: 1 \/ span 5;/, 'bottom handle adds rows');

  // 6. A main box added from the Layers panel (keyboard path), then a design check.
  await page.locator('.ds-stage').click({ position: { x: 600, y: 600 } });
  await page.locator('.ds-add select').selectOption('box:main');
  await page.locator('.ds-add button').click();
  assert.match(await html(), /<main class="main"><\/main>/);
  assert.match(await page.locator('.ds-checks').textContent(), /Every check passes/);

  // 6b. A button drawn with a click takes typed spaces (Space must not just "press" it).
  await page.getByRole('button', { name: /^Button$/ }).click();
  await page.evaluate(() => document.querySelector('.ds-toolbar').scrollIntoView({ block: 'start' }));
  const host = await page.locator('.ds-host').boundingBox();
  await page.mouse.click(host.x + host.width - 120, host.y + 40);
  await page.keyboard.type('Meet the robots');
  await page.keyboard.press('Enter');
  assert.match(await html(), /<button class="button" type="button">Meet the robots<\/button>/);

  // 7. Phone view stacks everything in one column (the generated container query).
  await page.getByRole('button', { name: 'Phone', exact: true }).click();
  const columns = await page.locator('.ds-host').evaluate((host) => getComputedStyle(host.shadowRoot.querySelector('.ws-page')).gridTemplateColumns.split(' ').length);
  assert.equal(columns, 1, 'phone view has one column');
  await page.getByRole('button', { name: 'Desktop', exact: true }).click();

  // 8. Send to Code; the preview shows the heading.
  await page.locator('[data-ws-send-draw]').click();
  await page.locator('[data-ws-tab="code"]').click();
  assert.match(await page.locator('[data-ws-editor]').inputValue(), /<title>Robot Garden<\/title>[\s\S]*<h1 class="title">Robot Garden<\/h1>/);
  await page.locator('[data-ws-file-tab="style.css"]').click();
  assert.match(await page.locator('[data-ws-editor]').inputValue(), /grid-template-columns: repeat\(12, 1fr\)/);
  await page.waitForTimeout(500);
  assert.equal(await page.frameLocator('[data-ws-preview]').locator('h1').textContent(), 'Robot Garden');

  // 9. Code -> Blocks -> Code round trip keeps the page.
  await page.locator('[data-ws-tab="blocks"]').click();
  await page.locator('[data-wb-app]').waitFor();
  await page.locator('#panel-blocks [data-ws-code-to-blocks]').click();
  await page.waitForTimeout(400);
  await page.locator('[data-ws-send-blocks]').click();
  await page.locator('[data-ws-tab="code"]').click();
  await page.locator('[data-ws-file-tab="index.html"]').click();
  assert.match(await page.locator('[data-ws-editor]').inputValue(), /<h1 class="title">\s*Robot Garden\s*<\/h1>/, 'blocks round trip keeps the heading');

  // 10. Typed code survives: a later drawing send asks first (dialog accepted above).
  await page.locator('[data-ws-editor]').press('End');
  await page.locator('[data-ws-editor]').type('\n<!-- typed by hand -->');
  await page.waitForTimeout(700);

  // 11. Downloads: submission file and website ZIP.
  await page.locator('[data-ws-tab="share"]').click();
  await page.fill('[data-ws-author]', 'ada');
  await page.fill('[data-ws-description]', 'A garden tended by robots.');
  await page.check('[data-ws-consent-info]');
  await page.check('[data-ws-consent-images]');
  assert.equal(await page.locator('[data-ws-share-url]').textContent(), 'https://mrscandrett.github.io/apps/ada-robot-garden/');
  const [submission] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download my submission file' }).click()]);
  assert.equal(submission.suggestedFilename(), 'ada-robot-garden.webstudio.json');
  const submitted = validateProject(JSON.parse(await fs.readFile(await submission.path(), 'utf8')));
  assert.equal(submitted.author, 'Ada');
  assert.equal(submitted.submission.slug, 'ada-robot-garden');
  assert.match(submitted.files['index.html'], /typed by hand/);
  const [zip] = await Promise.all([page.waitForEvent('download'), page.locator('[data-ws-export]').click()]);
  const zipPath = path.join(os.tmpdir(), `web-studio-${Date.now()}.zip`);
  await zip.saveAs(zipPath);
  const listing = execFileSync('unzip', ['-l', zipPath], { encoding: 'utf8' });
  for (const name of ['index.html', 'style.css', 'script.js', 'README.md']) assert.match(listing, new RegExp(`\\s${name.replace('.', '\\.')}\\n`));
  execFileSync('unzip', ['-tq', zipPath]);
  await fs.rm(zipPath);

  // 12. Reload: the project, its drawing and its code come back from this browser.
  await page.reload();
  await page.waitForFunction(() => document.querySelector('[data-ws-title]').value === 'Robot Garden');
  assert.match(await page.locator('.ds-layers').textContent(), /\.title/);

  assert.deepEqual(errors, [], 'no page errors');
  console.log('web-studio-browser: all checks passed');
} finally {
  await browser.close();
}
