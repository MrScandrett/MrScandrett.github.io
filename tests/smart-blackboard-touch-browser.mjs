import { chooseShape, openControls } from './helpers/blackboard-studio.mjs';
// Local server required: node tests/smart-blackboard-touch-browser.mjs
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
const url = 'http://127.0.0.1:8080/lessons/mathematics/geometry-and-trigonometry/smart-blackboard.html';
try {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url);
  await chooseShape(page, 'circle');
  await page.locator('#in-radius').fill('4');
  await page.locator('#in-radius').dispatchEvent('change');
  const canvas = page.locator('#chalk-canvas');
  await canvas.scrollIntoViewIfNeeded();
  // Real touch contacts: a second finger must neither move nor release the first handle.
  const box = await canvas.boundingBox();
  const cdp = await context.newCDPSession(page);
  const touch = (id, x, y) => ({ id, x: box.x + x, y: box.y + y });
  const first = touch(1, 380, 260);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first, touch(2, 440, 300)] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [first, touch(2, 480, 350)] });
  assert.equal(await page.locator('#val-m1').textContent(), '4.00 cm');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [touch(2, 480, 350)] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [touch(1, 405, 260)] });
  await page.waitForFunction(()=>document.getElementById('val-m1').textContent === '5.00 cm');
  assert.equal(await page.locator('#val-m1').textContent(), '5.00 cm');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  // Pen-only filters fingers, while accepting stylus events from the board driver.
  await openControls(page, 'board');
  await page.locator('#bb-pen-only').check();
  await canvas.evaluate(el => {
    const r = el.getBoundingClientRect();
    for (const [type, x] of [['pointerdown',405],['pointermove',430],['pointerup',430]]) el.dispatchEvent(new PointerEvent(type, {pointerId:11,pointerType:'touch',button:0,clientX:r.left+x,clientY:r.top+260}));
  });
  assert.equal(await page.locator('#val-m1').textContent(), '5.00 cm');
  await canvas.evaluate(el => {
    const r = el.getBoundingClientRect();
    for (const [type, x] of [['pointerdown',405],['pointermove',430],['pointerup',430]]) el.dispatchEvent(new PointerEvent(type, {pointerId:12,pointerType:'pen',button:0,clientX:r.left+x,clientY:r.top+260}));
  });
  assert.equal(await page.locator('#val-m1').textContent(), '6.00 cm');
  // Cancelling a stroke must not leave the pen down or classify partial ink.
  await openControls(page, 'board');
  await page.locator('#bb-pen-only').uncheck();
  await chooseShape(page, 'draw');
  await canvas.evaluate(el => {
    const r = el.getBoundingClientRect();
    for (const type of ['pointerdown','pointermove','pointercancel']) el.dispatchEvent(new PointerEvent(type, {pointerId:13,pointerType:'touch',button:0,clientX:r.left+100,clientY:r.top+100}));
  });
  await chooseShape(page, 'circle');
  await canvas.evaluate(el => {
    const r = el.getBoundingClientRect();
    for (const [type,x] of [['pointerdown',430],['pointermove',405],['pointerup',405]]) el.dispatchEvent(new PointerEvent(type, {pointerId:14,pointerType:'touch',button:0,clientX:r.left+x,clientY:r.top+260}));
  });
  assert.equal(await page.locator('#val-m1').textContent(), '5.00 cm');
  // Buttons provide a precise alternative to dragging a slider or pinching a model.
  await chooseShape(page, '3d-cone');
  await page.getByRole('button', {name:'Increase net opening by 10',exact:true}).tap();
  assert.equal(await page.locator('#unfold-slider').inputValue(), '10');
  for (const id of ['bb-rotate-left','bb-rotate-right','bb-zoom-in','bb-zoom-out','bb-reset-view']) await page.locator('#'+id).tap();
  const sizes = await page.locator('.bb-toolbar button').evaluateAll(buttons=>buttons.map(b=>b.getBoundingClientRect().height));
  assert.ok(sizes.every(height=>height>=48), 'Toolbar targets must be at least 48px tall');
  await openControls(page, 'board');
  await page.locator('#bb-board-mode').check();
  await page.reload();
  assert.equal(await page.locator('#bb-board-mode').isChecked(), true);
  await chooseShape(page, '3d-prism');
  await page.locator('.creation-app-fullscreen').click();
  await page.waitForFunction(()=>!!document.fullscreenElement || !!document.querySelector('.creation-app-expanded'));
  await page.locator('#unfold-slider').evaluate(el=>{el.value=100;el.dispatchEvent(new Event('input'));});
  await page.screenshot({path:'/tmp/smart-blackboard-board-fullscreen.png'});
  await page.locator('.creation-app-fullscreen').click();
  await page.waitForFunction(()=>!document.fullscreenElement && !document.querySelector('.creation-app-expanded'));
  // Bound rendering cost on a 4K panel even with browser display scaling.
  await page.setViewportSize({width:3840,height:2160});
  await chooseShape(page, 'circle');
  await page.locator('.creation-app-fullscreen').click();
  await page.waitForFunction(()=>!!document.fullscreenElement || !!document.querySelector('.creation-app-expanded'));
  await page.waitForTimeout(100);
  assert.ok(await canvas.evaluate(el=>el.clientWidth*el.clientHeight>1920*1080), 'Exercise a canvas larger than the rendering budget');
  const pixels = await canvas.evaluate(el=>el.width*el.height);
  assert.ok(pixels <= 1920*1080+10000, `2D backing canvas exceeds pixel budget: ${pixels}`);
  assert.deepEqual(errors, []);
  const fallback = await context.newPage();
  await fallback.addInitScript(()=>{
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type,...args) {return type.startsWith('webgl') ? null : getContext.call(this,type,...args);};
  });
  await fallback.goto(url);
  await chooseShape(fallback, '3d-cube');
  assert.match(await fallback.locator('#bb-device-status').textContent(), /3D is unavailable/);
  await chooseShape(fallback, 'circle');
  assert.equal(await fallback.locator('#chalk-canvas').isVisible(), true);
  console.log('Board checks passed: real multitouch, pen filtering, cancelled strokes, 48px targets, tap controls, full screen, 4K budget and 3D fallback.');
} finally { await browser.close(); }
