const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.WEB_BLOCKS_URL || 'http://localhost:8094';
(async () => {
 const browser = await chromium.launch();
 try {
  const page = await browser.newPage({ viewport: {width:1440,height:1000} });
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  await page.goto(`${base}/lessons/web-first-site.html`);
  await page.locator('[data-wb-open]').click();
  await page.waitForFunction(()=>document.querySelector('[data-wb-render-status]')?.textContent.includes('Preview updated'));
  const preview=page.frameLocator('[data-wb-preview]');
  const id=await page.evaluate(()=>Blockly.getMainWorkspace().getAllBlocks(false).find(b=>b.type==='wb_property'&&b.getFieldValue('NAME')==='background').id);
  await page.locator('[data-wb-select]').selectOption(id);
  await page.locator('[data-field="VALUE"]').fill('#123456');
  await page.waitForTimeout(400);
  assert.equal(await preview.locator('body').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(18, 52, 86)');
  assert.ok(await preview.locator('body').evaluate(()=>{try{void parent.document.body;return false}catch{return true}}),'preview cannot access lesson document');
  console.log('PASS: CSS field renders live; preview is isolated from host');

  await page.locator('.blocklyToolboxCategory').filter({hasText:/^HTML$/}).click();
  const source=page.locator('.blocklyFlyout .blocklyDraggable').nth(1);
  const before=await page.evaluate(()=>Blockly.getMainWorkspace().getAllBlocks(false).length);
  const a=await source.boundingBox(), dest=await page.locator('[data-wb-canvas]').boundingBox();
  await page.mouse.move(a.x+15,a.y+15);await page.mouse.down();
  await page.mouse.move(a.x+20,a.y+30,{steps:4});
  await page.mouse.move(dest.x+dest.width/2,dest.y+dest.height-90,{steps:18});await page.mouse.up();
  await page.waitForTimeout(500);
  assert.equal(await page.evaluate(()=>Blockly.getMainWorkspace().getAllBlocks(false).length),before+1,'real toolbox drag adds block');
  console.log('PASS: real mouse drag creates a Blockly block');

  await page.goto(`${base}/lessons/build-your-student-page.html`);
  await page.locator('[data-wb-open]').click();
  await page.waitForFunction(()=>document.querySelector('[data-wb-render-status]')?.textContent.includes('Preview updated'));
  await page.setViewportSize({width:375,height:900});
  await page.locator('[data-wb-preview-jump]').click();
  assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-wb-width')),true);
  await page.screenshot({path:'/tmp/web-blocks-student-phone.png'});
  await page.locator('[data-wb-builder-jump]').click();
  assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-wb-select')),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: student editor host, phone preview navigation, no uncaught errors');

  const blocked=await browser.newContext();
  await blocked.addInitScript(()=>{Object.defineProperty(Storage.prototype,'getItem',{value(){throw new Error('Storage disabled')}});Object.defineProperty(Storage.prototype,'setItem',{value(){throw new Error('Storage disabled')}})});
  const p=await blocked.newPage();await p.goto(`${base}/lessons/web-first-site.html`);await p.locator('[data-wb-open]').click();
  await p.waitForFunction(()=>document.querySelector('[data-wb-render-status]')?.textContent.includes('Preview updated'));
  assert.match(await p.locator('[data-wb-storage]').textContent(),/not been overwritten|unavailable/);
  assert.equal(await p.frameLocator('[data-wb-preview]').locator('h1').count(),1);
  await blocked.close();
  console.log('PASS: blocked browser storage keeps the editor usable');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
