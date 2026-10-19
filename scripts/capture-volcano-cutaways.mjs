import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const output=process.env.VOLCANO_SHOTS || '/tmp/volcano-cutaway-shots';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:findChromium(),headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:2});
 page.setDefaultTimeout(60000);
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8080/lessons/earth-science/volcano-simulator.html',{waitUntil:'domcontentloaded'});
 await page.locator('[data-id="vesuvius79"]').waitFor();
 await page.locator('[data-view="cross-section"]').click();
 await page.locator('#btn-open-left').click();
 const profiles=await page.evaluate(()=>Object.entries(VolcanoHistory).map(([id,r])=>({id,climax:r.timeline.reduce((a,b)=>a.intensity>b.intensity?a:b).at})));
 const selected=profiles.filter(p=>process.env.VOLCANO_PRESETS ? process.env.VOLCANO_PRESETS.split(',').includes(p.id) : !process.env.VOLCANO_QUICK || ['vesuvius79','yellowstone'].includes(p.id));
 for(const {id,climax} of selected){
  if(id==='yellowstone')await page.locator('#eruption-mode').selectOption('exploration');
  await page.locator(`[data-id="${id}"]`).click();
  for(const [stage,at] of [['before',0],['climax',climax],['aftermath',1]]){
   await page.locator('#s-timeline').evaluate((el,at)=>{el.value=at;el.dispatchEvent(new Event('input',{bubbles:true}));},at);
   await page.waitForTimeout(120);
   const name=await page.evaluate(id=>VolcanoHistory[id].conduit.name,id);
   assert.ok((await page.locator('#cutaway-description').textContent()).includes(name));
   await page.locator('.vol-workspace').screenshot({path:`${output}/${id}-${stage}.png`,animations:"disabled"});
  }
 }
 const volumeBefore=await page.locator('#hud-magma-vol').textContent();
 await page.locator('#conduit-canvas').focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Space');
 assert.notEqual(await page.locator('#hud-magma-vol').textContent(),volumeBefore);
 await page.locator('#btn-conduit-undo').click();assert.equal(await page.locator('#hud-magma-vol').textContent(),volumeBefore);
 await page.locator('#cutaway-notes summary').first().focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('#cutaway-notes details').first().evaluate(el=>el.open),true);
 await page.locator('#cutaway-true-scale').click();
 assert.equal(await page.locator('#cutaway-true-scale').getAttribute('aria-pressed'),'true');
 await page.locator('#cutaway-true-scale').focus();await page.keyboard.press('Space');
 assert.equal(await page.locator('#cutaway-true-scale').getAttribute('aria-pressed'),'false');
 const dpr=await page.locator('#conduit-canvas').evaluate(c=>c.width/c.clientWidth);assert.equal(dpr,2);
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('#conduit-outer').screenshot({path:`${output}/mobile.png`});
 console.log(await page.locator('.vol-workspace').evaluate(el=>({height:el.clientHeight, panels:[...el.querySelectorAll('.blender-panel')].map(p=>({height:p.clientHeight,scroll:p.scrollHeight}))})));
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.locator('#eruption-mode').selectOption('historical');
 assert.equal(await page.locator('[data-id="yellowstone"]').isVisible(),false);
 assert.ok((await page.locator('#cutaway-description').textContent()).includes('Vesuvius'));
 assert.deepEqual(errors,[]);console.log(JSON.stringify({presets:selected.length,shots:selected.length*3+1,dpr,errors,output}));
} finally {await browser.close();}
