/* Run with a local server: WEB_BLOCKS_URL=http://localhost:8094 node tests/web-blocks-browser.cjs */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const base = process.env.WEB_BLOCKS_URL || 'http://localhost:8094';
const slugs = ['web-design-pathway', 'web-first-site', 'web-html', 'web-css', 'web-javascript', 'web-accessibility-debugging', 'web-project-studio', 'web-flash-history', 'web-creative-lab', 'web-publish', 'webxr-gallery', 'build-your-student-page', 'from-scratch-browser-game'];
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    const page = await context.newPage();
    const errors = [], badAssets = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', response => { if (response.status() >= 400 && /web-blocks|blockly/.test(response.url())) badAssets.push(response.url()); });
    const preview = page.frameLocator('[data-wb-preview]');
    const settle = async () => { await page.waitForTimeout(350); await page.waitForFunction(() => /Preview updated|JavaScript needs a repair/.test(document.querySelector('[data-wb-render-status]').textContent)); };
    const open = async slug => {
      await page.goto(`${base}/lessons/${slug}.html`);
      await page.locator('[data-wb-open]').click();
      await page.locator('[data-wb-app]').waitFor(); await settle();
      assert.equal(await page.locator('[data-wb-start-status]').textContent(), '', `startup: ${slug}`);
    };
    const chooseBlock = async (type, field, value) => {
      const id = await page.evaluate(({ type, field, value }) => Blockly.getMainWorkspace().getAllBlocks(false).find(b => b.type === type && (!field || b.getFieldValue(field) === value))?.id, { type, field, value });
      assert.ok(id, `find ${type} ${field}=${value}`);
      await page.locator('[data-wb-select]').selectOption(id);
    };
    const field = name => page.locator(`[data-wb-fields] [data-field="${name}"]`);
    const load = async id => {
      await page.locator('[data-wb-starter]').selectOption(id);
      await page.locator('[data-wb-load]').click();
      await page.locator('[data-wb-confirm-yes]').click(); await settle();
    };
    await open('web-first-site');
    await preview.getByRole('button', { name: 'Say hello', exact: true }).click();
    assert.equal(await preview.locator('#message').textContent(), 'I made this interaction with blocks!');
    await chooseBlock('wb_text', 'TEXT', 'My first website');
    await field('TEXT').fill('My block-built website'); await settle();
    assert.equal(await preview.locator('h1').textContent().then(s => s.trim()), 'My block-built website');
    await chooseBlock('wb_set_text');
    await field('TEXT').fill('My own block response'); await settle();
    await preview.locator('#hello').click();
    assert.equal(await preview.locator('#message').textContent(), 'My own block response');
    console.log('PASS: live HTML and event-field changes');

    // Add/nest/reorder/remove through native controls, not hidden workspace mutation.
    await chooseBlock('wb_element', 'TAG', 'main');
    await page.locator('[data-wb-type]').selectOption('wb_element');
    await page.locator('[data-wb-place]').selectOption('CHILDREN');
    await page.locator('[data-wb-add]').click();
    await field('TAG').fill('aside'); await field('ATTR').fill('id="extra"');
    await page.locator('[data-wb-type]').selectOption('wb_text');
    await page.locator('[data-wb-place]').selectOption('CHILDREN');
    await page.locator('[data-wb-add]').click(); await field('TEXT').fill('A new nested element'); await settle();
    assert.equal(await preview.locator('main > aside#extra').textContent().then(s => s.trim()), 'A new nested element');
    await chooseBlock('wb_element', 'TAG', 'aside');
    await page.locator('[data-wb-up]').click(); await settle();
    assert.equal(await preview.locator('main > :nth-last-child(2)').getAttribute('id'), 'extra');
    await page.locator('[data-wb-down]').click(); await settle();
    assert.equal(await preview.locator('main > :last-child').getAttribute('id'), 'extra');
    await page.locator('[data-wb-remove]').click(); await settle();
    assert.equal(await preview.locator('#extra').count(), 0);
    await page.locator('[data-wb-undo]').click(); await settle();
    assert.equal(await preview.locator('#extra').count(), 1);
    console.log('PASS: keyboard builder nesting, reorder, remove and undo');

    await page.locator('[data-wb-title]').fill('Saved workshop project'); await settle();
    let event = page.waitForEvent('download'); await page.locator('[data-wb-save]').click();
    const blocksDownload = await event; const blocksPath = await blocksDownload.path();
    const saved = JSON.parse(await fs.readFile(blocksPath, 'utf8'));
    assert.equal(saved.title, 'Saved workshop project');
    await page.reload(); await page.locator('[data-wb-open]').click(); await settle();
    assert.equal(await page.locator('[data-wb-title]').inputValue(), saved.title);
    assert.equal(await preview.locator('#extra').count(), 1);
    event = page.waitForEvent('download'); await page.locator('[data-wb-download]').click();
    const htmlDownload = await event; const html = await fs.readFile(await htmlDownload.path(), 'utf8');
    assert.match(html, /My block-built website/); assert.match(html, /My own block response/);
    const exported = await context.newPage(); await exported.setContent(html);
    await exported.locator('#hello').click(); assert.equal(await exported.locator('#message').textContent(), 'My own block response'); await exported.close();
    await load('blank');
    await page.locator('[data-wb-file]').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"wrong"}') });
    await page.waitForFunction(() => document.querySelector('[data-wb-edit-status]').textContent.includes('Could not open'));
    assert.match(await page.locator('[data-wb-edit-status]').textContent(), /Could not open/);
    assert.equal(await preview.locator('h1').textContent().then(s => s.trim()), 'My new idea');
    await page.locator('[data-wb-file]').setInputFiles({ name: 'website.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)) });
    await page.locator('[data-wb-confirm-yes]').click(); await settle();
    assert.equal(await page.locator('[data-wb-title]').inputValue(), saved.title);
    await page.locator('[data-wb-restore]').click(); await settle();
    assert.equal(await preview.locator('h1').textContent().then(s => s.trim()), 'My new idea');
    console.log('PASS: reload, file save/reopen, malformed import, restore, executable HTML export');

    // All built-in projects must run without script errors.
    const starterIds = await page.locator('[data-wb-starter] option').evaluateAll(options => options.map(o => o.value));
    for (const id of starterIds) {
      await load(id);
      assert.doesNotMatch(await page.locator('[data-wb-render-status]').textContent(), /repair/, id);
      assert.ok(await preview.locator('h1').count(), id);
      assert.doesNotMatch(await page.locator('[data-wb-console]').textContent(), /error:/, id);
    }
    await load('search');
    await preview.locator('#search').fill('bridge');
    assert.equal(await preview.locator('.card:visible').count(), 1);
    assert.match(await preview.locator('#count').textContent(), /1 of 3/);
    await preview.locator('#search').fill('no-such-project');
    assert.equal(await preview.locator('.card:visible').count(), 0);
    assert.match(await preview.locator('#count').textContent(), /try another/);
    await load('store');
    await preview.locator('#sticker').click(); await preview.locator('#print').click();
    assert.equal(await preview.locator('#score').textContent(), '11');
    await load('motion');
    const pixels = await preview.locator('canvas').evaluate(canvas => Array.from(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data).some((v, i) => i % 4 === 3 && v));
    assert.ok(pixels, 'animation draws a visible ball');
    console.log(`PASS: all ${starterIds.length} starters, filtering, practice cart and canvas drawing`);

    await open('web-html');
    const example = page.getByRole('button', { name: /Try HTML example 2 with blocks/ });
    await example.click(); await page.locator('[data-wb-confirm-yes]').click(); await settle();
    assert.equal(await preview.locator('h1').textContent().then(s => s.trim()), "Ada's creation station");
    assert.equal(await preview.locator('h3').count(), 3);
    await open('web-css');
    assert.ok(await page.locator('.wb-example').count());
    await page.locator('.wb-example').first().click(); await page.locator('[data-wb-confirm-yes]').click(); await settle();
    assert.ok(await page.evaluate(() => Blockly.getMainWorkspace().getAllBlocks(false).some(b => b.type === 'wb_property')));
    console.log('PASS: HTML and CSS lesson examples become editable blocks');

    await load('first');
    await page.locator('[data-wb-title]').fill('Continue me in another lesson'); await settle();
    await open('web-publish');
    await page.locator('[data-wb-continue]').click(); await page.locator('[data-wb-confirm-yes]').click(); await settle();
    assert.equal(await page.locator('[data-wb-title]').inputValue(), 'Continue me in another lesson');
    await page.locator('[data-wb-stop]').click();
    assert.match(await preview.locator('p').textContent(), /Preview stopped/);
    await chooseBlock('wb_text', 'TEXT', 'My first website'); await field('TEXT').fill('Paused edit'); await page.waitForTimeout(350);
    assert.match(await preview.locator('p').textContent(), /Preview stopped/);
    await page.locator('[data-wb-run]').click(); await settle();
    assert.equal(await preview.locator('h1').textContent().then(s => s.trim()), 'Paused edit');
    console.log('PASS: continuing between lessons and pausing/restarting preview');

    await page.locator('[data-wb-live]').check();
    await load('first');
    await page.locator('#website-blocks').screenshot({ path: '/tmp/web-blocks-desktop.png' });
    await page.setViewportSize({width:375,height:900});
    await page.locator('[data-wb-width]').selectOption('phone');
    await page.waitForTimeout(200);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no phone page overflow');
    await chooseBlock('wb_text', 'TEXT', 'My first website'); await field('TEXT').fill('Phone edit'); await settle();
    assert.equal(await preview.locator('h1').textContent().then(s => s.trim()), 'Phone edit');
    await page.locator('#website-blocks').screenshot({ path: '/tmp/web-blocks-mobile.png' });
    await page.setViewportSize({width:1440,height:1000});
    console.log('PASS: phone layout and parameter editing');

    for (const slug of slugs) {
      await open(slug);
      assert.ok(await preview.locator('h1').count(), slug);
      assert.equal(await page.locator('[data-web-blocks]').count(), 1, slug);
      assert.doesNotMatch(await page.locator('[data-wb-start-status]').textContent(), /could not/, slug);
    }
    console.log(`PASS: workshop startup across all ${slugs.length} integrated pages`);
    assert.deepEqual(badAssets, []);
    assert.deepEqual(errors, []);
    console.log('PASS: no missing Blockly/workshop assets or uncaught page errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
