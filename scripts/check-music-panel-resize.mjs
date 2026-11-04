// Requires serve-local.js on :8080. Checks keyboard and pointer panel resizing.
import {chromium} from 'playwright';
import {findChromium} from '../lib/find-chromium.mjs';
const b=await chromium.launch({executablePath:findChromium(['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'])});
const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(`${process.env.LAB_URL || 'http://127.0.0.1:8080'}/music-lab.html`);
const handle=p.locator('[data-resize="tracks"]');await handle.scrollIntoViewIfNeeded();await handle.focus();
const before=await p.locator('.daw-scroll').evaluate(e=>e.clientHeight);await p.keyboard.press('ArrowUp');await p.waitForTimeout(300);const after=await p.locator('.daw-scroll').evaluate(e=>e.clientHeight);console.log({before,after});
if(after>=before)throw Error('height did not shrink');
console.log('row',await p.locator('.daw-th[data-track]').first().evaluate(e=>({height:e.clientHeight,scroll:e.scrollHeight})));
await p.locator('[data-act="studio"]').first().evaluate(e=>e.click());await p.waitForTimeout(700);
const split=p.locator('[data-resize="split"]');console.log('split visible',await split.isVisible());await split.focus();const w=await p.locator('.daw-scroll').evaluate(e=>e.clientWidth);await p.keyboard.press('ArrowLeft');await p.waitForTimeout(300);const w2=await p.locator('.daw-scroll').evaluate(e=>e.clientWidth);console.log({w,w2,errors});if(w2>=w)throw Error('split did not shrink');
const border=await split.boundingBox(); await p.mouse.move(border.x+5,border.y+60); await p.mouse.down(); await p.mouse.move(border.x-55,border.y+60,{steps:6}); await p.mouse.up(); await p.waitForTimeout(200); if(await p.locator('.daw-scroll').evaluate(e=>e.clientWidth)>=w2)throw Error('pointer drag failed');
if(errors.length)throw Error(errors.join('; '));
await p.setViewportSize({width:390,height:844});await p.waitForTimeout(500);if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('mobile overflow'); console.log('Panel resizing passed');await b.close();
