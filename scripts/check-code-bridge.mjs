import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import JSZip from 'jszip';
import { findChromium } from '../lib/find-chromium.mjs';
import { demoFiles, demoTask, demoAnswer, fixedPlayerSource } from '../assets/js/code-bridge/demo.mjs';

const base = process.env.CODE_BRIDGE_URL || 'http://127.0.0.1:8080';
const artifacts = process.env.CODE_BRIDGE_QA_DIR || '/tmp/code-bridge-qa';
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ executablePath: findChromium(), headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [], unexpectedRequests = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (!request.url().startsWith(base) && !request.url().startsWith('data:')) unexpectedRequests.push(request.url()); });
page.on('dialog', dialog => dialog.accept());
const status = () => page.locator('#cb-status').innerText();
const chooseStep = name => page.getByRole('button', { name, exact: true }).click();
async function downloaded(action) {
  const waiting = page.waitForEvent('download');
  await action();
  const download = await waiting;
  return { name: download.suggestedFilename(), bytes: await readFile(await download.path()) };
}
let fixture;
try {
  await page.goto(`${base}/code-bridge.html`);
  assert.equal(await page.locator('#workspace').isVisible(), false, 'New students see project choices before the coding desk.');
  assert.equal(await page.locator('#workflow-help').getAttribute('open'), '');
  await page.locator('#load-demo').click();
  await page.waitForFunction(() => document.querySelector('#file-count').textContent === '3 loaded');
  assert.equal(await page.locator('#file-list input:checked').count(), 2);
  await page.screenshot({ path: `${artifacts}/desktop.png`, fullPage: true });
  const sourceZip = await downloaded(() => page.locator('#download-source').click());
  const initialZip = await JSZip.loadAsync(sourceZip.bytes);
  assert.equal(await initialZip.file('player.js').async('string'), demoFiles[0].text);
  await chooseStep('2. Review answer');
  assert.equal(await page.locator('#review-blocked').isVisible(), true);
  assert.equal(await page.locator('#response').isDisabled(), true);
  assert.equal(await page.locator('#import-response').isDisabled(), true);
  await page.locator('[data-go-step="prepare"]').first().click();
  assert.equal(await page.locator('#request-output').isVisible(), false);
  await page.locator('#prepare-packet').click();
  assert.equal(await page.locator('#request-output').isVisible(), true);
  assert.equal(await page.locator('#selection-count').innerText(), '2 selected for your request');
  const packet = await page.locator('#packet').inputValue();
  assert.ok(packet.includes('CURRENT FILE: player.js'));
  assert.ok(packet.includes('CURRENT FILE: main.js'));
  assert.ok(!packet.includes('CURRENT FILE: index.html'));
  assert.match(await status(), /Request ready/);
  const request = await downloaded(() => page.locator('#download-packet').click());
  assert.equal(request.bytes.toString(), packet);

  await page.locator('[data-go-step="review"]').click();
  assert.equal(await page.locator('#review-blocked').isVisible(), false);
  assert.equal(await page.locator('#response').isEnabled(), true);
  await page.locator('#response').fill('### FILE: ../player.js\n```js\nunsafe\n```');
  await page.locator('#import-response').click();
  assert.equal(await page.locator('#cb-status').getAttribute('data-error'), 'true');
  assert.equal(await page.locator('.cb-change').count(), 0);
  // AI text must stay text, even when it resembles active HTML.
  await page.locator('#response').fill('### FILE: player.js\n```js\n<img src=x onerror="window.codeBridgeInjected=true">\n```');
  await page.locator('#import-response').click();
  assert.equal(await page.locator('#change-list img').count(), 0);
  assert.equal(await page.evaluate(() => Boolean(window.codeBridgeInjected)), false);

  await page.locator('#sample-answer').click();
  await page.locator('#import-response').click();
  assert.equal(await page.locator('.cb-change').count(), 1);
  assert.equal(await page.locator('[data-approval]').isChecked(), false);
  assert.equal(await page.locator('#export-changes').isDisabled(), true);
  await page.locator('[data-approval]').check();
  assert.equal(await page.locator('#export-changes').isEnabled(), true);
  assert.match(await page.locator('#approval-count').innerText(), /1 of 1/);
  await page.screenshot({ path: `${artifacts}/review.png`, fullPage: true });
  const changed = await downloaded(() => page.locator('#export-changes').click());
  const changedZip = await JSZip.loadAsync(changed.bytes);
  assert.equal(await changedZip.file('changes/player.js').async('string'), fixedPlayerSource);
  assert.equal(await changedZip.file('backup/player.js').async('string'), demoFiles[0].text);
  assert.equal(changedZip.file('changes/main.js'), null);

  await page.locator('[data-go-step="checkpoint"]').click();
  assert.equal(await page.locator('#current-test').innerText(), demoTask.test);
  await page.locator('#test-result').selectOption('failed');
  await page.locator('#explanation').fill('Practice checkpoint: record failures rather than assuming success.');
  await page.locator('#next-task').fill('Reload the folder and inspect grounded.');
  await page.locator('#save-checkpoint').click();
  assert.match(await page.locator('#checkpoint-list').innerText(), /failed/);
  assert.equal(await page.locator('#checkpoint-empty').isVisible(), false);
  const savedSession = await downloaded(() => page.locator('#save-session').click());
  const sessionData = JSON.parse(savedSession.bytes.toString());
  assert.equal(sessionData.checkpoints[0].result, 'failed');
  assert.equal(sessionData.files.find(file => file.path === 'player.js').text, demoFiles[0].text, 'A ZIP export must not pretend local source changed.');
  assert.equal(sessionData.packet, undefined);

  await page.locator('#session-file').setInputFiles({ name: 'practice.code-bridge.json', mimeType: 'application/json', buffer: savedSession.bytes });
  await page.waitForFunction(() => document.querySelector('#cb-status').textContent.includes('Session restored'));
  assert.equal(await page.locator('#file-list input:checked').count(), 0);
  assert.equal(await page.locator('#copy-packet').isDisabled(), true);
  assert.equal(await page.locator('#checkpoint-list li').count(), 1);
  await page.locator('#source-files').setInputFiles([
    { name: 'hello.py', mimeType: 'text/plain', buffer: Buffer.from('print("hello")\n') },
    { name: 'credentials.json', mimeType: 'application/json', buffer: Buffer.from('{"key":"not-for-context"}') },
  ]);
  await page.waitForFunction(() => document.querySelector('#file-count').textContent === '1 loaded');
  assert.match(await page.locator('#file-list').innerText(), /hello.py/);
  assert.ok(!(await page.locator('#file-list').innerText()).includes('credentials'));
  assert.ok(!unexpectedRequests.length, `Unexpected outgoing requests: ${unexpectedRequests.join(', ')}`);

  // Exercise folder permission, stale-file refusal, backups, and partial UI updates
  // with a deterministic File System Access adapter; no user's folder is touched.
  await page.addInitScript(({ files }) => {
    window.testDisk = Object.fromEntries(files.map(file => [file.path, file.text]));
    window.permissionRequests = 0;
    function directory(prefix = '') {
      return {
        name: 'Test folder', kind: 'directory',
        requestPermission: async () => { window.permissionRequests++; return 'granted'; },
        async *entries() {
          for (const [path, text] of Object.entries(window.testDisk)) {
            if (path.includes('/')) continue;
            yield [path, { kind: 'file', getFile: async () => new File([text], path) }];
          }
        },
        async getDirectoryHandle(name) { return directory(prefix + name + '/'); },
        async getFileHandle(name, options = {}) {
          const path = prefix + name;
          if (!(path in window.testDisk)) {
            if (!options.create) throw new DOMException('missing', 'NotFoundError');
            window.testDisk[path] = '';
          }
          return {
            getFile: async () => new File([window.testDisk[path]], name),
            createWritable: async () => {
              let pending;
              return { write: async text => { pending = text; }, close: async () => { window.testDisk[path] = pending; }, abort: async () => {} };
            },
          };
        },
      };
    }
    window.showDirectoryPicker = async () => directory();
  }, { files: demoFiles });
  await page.goto(`${base}/code-bridge.html`);
  await page.locator('#open-folder').click();
  await page.waitForFunction(() => document.querySelector('#file-count').textContent === '3 loaded');
  assert.equal(await page.evaluate(() => window.permissionRequests), 0);
  await page.locator('.cb-file-label').filter({ hasText: 'player.js' }).locator('input').check();
  for (const [key, value] of Object.entries(demoTask)) await page.locator(`#${key}`).fill(value);
  await page.locator('#prepare-packet').click();
  await chooseStep('2. Review answer');
  await page.locator('#response').fill(demoAnswer);
  await page.locator('#import-response').click();
  await page.locator('[data-approval]').check();
  await page.evaluate(() => { window.testDisk['player.js'] = 'NEW WORK IN VS CODE'; });
  await page.locator('#write-folder').click();
  assert.match(await status(), /changed on disk/);
  assert.equal(await page.evaluate(() => window.testDisk['player.js']), 'NEW WORK IN VS CODE');
  await page.evaluate(text => { window.testDisk['player.js'] = text; }, demoFiles[0].text);
  await page.locator('#write-folder').click();
  await page.waitForFunction(() => document.querySelector('#cb-status').textContent.startsWith('Saved 1 approved file.'));
  assert.equal(await page.evaluate(() => window.testDisk['player.js']), fixedPlayerSource);
  const backup = await page.evaluate(() => Object.entries(window.testDisk).find(([path]) => path.startsWith('.code-bridge-backups/') && path.endsWith('/player.js')));
  assert.equal(backup[1], demoFiles[0].text);
  assert.equal(await page.locator('[data-approval]').isDisabled(), true);
  assert.equal(await page.locator('#write-folder').isDisabled(), true);
  await page.locator('#session-file').setInputFiles({ name: 'practice.code-bridge.json', mimeType: 'application/json', buffer: savedSession.bytes });
  await page.waitForFunction(() => document.querySelector('#cb-status').textContent.includes('Session restored'));
  assert.equal(await page.locator('#reload-folder').innerText(), 'Refresh source');
  await page.locator('#reload-folder').click();
  await page.waitForFunction(() => document.querySelector('#cb-status').textContent.includes('Current source refreshed'));
  assert.equal(await page.locator('#goal').inputValue(), demoTask.goal);
  assert.equal(await page.locator('#checkpoint-list li').count(), 1);
  await page.getByRole('button', { name: 'Read player.js', exact: true }).click();
  assert.equal(await page.locator('#preview-source').innerText(), fixedPlayerSource);
  // A task edit retires the preview and prevents reviewing an answer to the old task.
  await page.locator('.cb-file-label').filter({ hasText: 'player.js' }).locator('input').check();
  await page.locator('#prepare-packet').click();
  await page.locator('#goal').fill('A different task');
  assert.equal(await page.locator('#request-output').isVisible(), false);
  await chooseStep('2. Review answer');
  assert.equal(await page.locator('#response').isDisabled(), true);
  assert.equal(await page.locator('#review-blocked').isVisible(), true);

  // Run the downloadable practice project itself in a real browser before and
  // after the exported replacement, including its input and rendering loop.
  const fixtureFiles = new Map(demoFiles.map(file => ['/' + file.path, file.text]));
  fixture = createServer((req, res) => {
    const path = req.url === '/' ? '/index.html' : req.url;
    res.writeHead(fixtureFiles.has(path) ? 200 : 404, { 'Content-Type': path.endsWith('.js') ? 'text/javascript' : 'text/html' });
    res.end(fixtureFiles.get(path) || 'Not found');
  });
  await new Promise(resolve => fixture.listen(0, '127.0.0.1', resolve));
  const fixtureUrl = `http://127.0.0.1:${fixture.address().port}`;
  const game = await context.newPage();
  const playerVelocity = () => game.evaluate(async modulePath => (await import(modulePath)).player.velocity, './player.js');
  await game.goto(fixtureUrl);
  await game.locator('#jump').click();
  await game.waitForTimeout(100);
  let velocity = await playerVelocity();
  await game.keyboard.press('Space');
  assert.ok(await playerVelocity() > velocity, 'Original practice project reproduces the midair jump bug.');
  fixtureFiles.set('/player.js', fixedPlayerSource);
  await game.reload();
  await game.locator('#jump').click();
  await game.waitForTimeout(100);
  velocity = await playerVelocity();
  await game.keyboard.press('Space');
  assert.ok(await playerVelocity() <= velocity, 'Fixed project refuses a second midair jump.');
  assert.notEqual(await game.locator('#player').evaluate(node => node.style.bottom), '16px', 'The rendering loop moves the player.');
  await game.close();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/code-bridge.html?practice=jump`);
  await page.waitForFunction(() => document.querySelector('#file-count').textContent === '3 loaded');
  assert.equal(await page.locator('#file-browser').getAttribute('open'), null, 'Selected practice files collapse on mobile to reveal the task.');
  await chooseStep('2. Review answer');
  assert.equal(await page.locator('#review-blocked').isVisible(), true);
  await page.locator('[data-go-step="prepare"]').first().click();
  await page.locator('#file-browser > summary').click();
  assert.equal(await page.locator('#file-list input:checked').count(), 2, 'File selection stays available in the mobile disclosure.');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Tool fits a narrow screen.');
  await page.screenshot({ path: `${artifacts}/mobile.png`, fullPage: true });
  await page.goto(`${base}/lessons/computer-science/foundations/ai-coding-workflow.html`);
  assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Lesson fits a narrow screen.');
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: `${artifacts}/lesson.pdf`, format: 'Letter', printBackground: true });
  assert.deepEqual(errors, []);
  console.log(`Code Bridge browser checks passed: practice import, budgeted request, response rejection/XSS, per-file approval, ZIP/backups, checkpoint/session round trip, file filtering, simulated folder permission/conflict/save, real practice game, mobile layout, and lesson print. Artifacts: ${artifacts}`);
} finally {
  if (fixture) await new Promise(resolve => fixture.close(resolve));
  await browser.close();
}
