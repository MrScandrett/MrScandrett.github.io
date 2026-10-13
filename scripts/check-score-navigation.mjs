import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
import assert from 'node:assert/strict';
const browser = await chromium.launch({executablePath:findChromium(),args:['--disable-dev-shm-usage']});
try {
for (const size of [{width:1440,height:900},{width:390,height:844}]) {
 const page=await browser.newPage({viewport:size,reducedMotion:'reduce'}); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const name of ['bach','fake-book']) {
 await page.goto('http://localhost:8080/lessons/music/'+name+'.html',{waitUntil:'domcontentloaded'});
 const fake=name==='fake-book';
 if(!fake) await page.evaluate(()=>document.querySelectorAll('details:has(figure[data-score])').forEach(d=>d.open=true));
 if(!fake && await page.locator('.composer-cover').count()) await page.locator('.composer-cover').first().click();
 const scope=page.locator(fake?'#fakebook':'figure[data-score]').first();
 const measure=scope.locator(fake?'.fb-bar':'.se-measure').nth(1);await measure.waitFor({state:'visible'});await measure.scrollIntoViewIfNeeded(); { const r=await measure.boundingBox(); await page.mouse.click(r.x+r.width*.6,r.y+r.height*.7); }
 const nav=scope.locator('.score-navigation');
 assert.match(await nav.locator('p').textContent(),/ready/);
 assert.equal(await nav.locator('select').first().inputValue(),'1');
 assert.equal(await scope.locator('.score-primed').count(),1);
 await nav.locator('[data-step="1"]').focus();await nav.locator('[data-step="1"]').press('Enter');
 assert.equal(await nav.locator('select').first().inputValue(),'2');
 await nav.locator('[data-fit]').selectOption('page');
 await page.screenshot({path:'/tmp/score-'+name+'-'+size.width+'.png',fullPage:false});
 await scope.locator(fake?'[data-fb-play]':'.se-play').click();
 await page.waitForTimeout(fake?3200:500);
 assert.equal(await scope.locator(fake?'[data-fb-play]':'.se-play').getAttribute('aria-pressed'),'true');
 await measure.scrollIntoViewIfNeeded(); { const r=await measure.boundingBox(); await page.mouse.click(r.x+r.width*.6,r.y+r.height*.7); }
 assert.equal(await scope.locator(fake?'[data-fb-play]':'.se-play').getAttribute('aria-pressed'),'false');
 await nav.locator('[data-fit]').selectOption('width');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=1));
 console.log(name,size.width,'measure prime, keyboard, fit, playback, pause passed');
 }
 assert.deepEqual(errors,[]);await page.close();
}
} finally {await browser.close();}
