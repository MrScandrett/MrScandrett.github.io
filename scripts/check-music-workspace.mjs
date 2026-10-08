import {chromium} from 'playwright';
import {findChromium} from '../lib/find-chromium.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:findChromium()});
try {
 for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}]) {
  const page=await browser.newPage({viewport,hasTouch:viewport.width!==1440});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log(e.message)});
  await page.route('https://**/*',route=>route.abort());
  await page.goto('http://localhost:8080/music-lab.html',{waitUntil:'domcontentloaded'});const root=page.locator('#trackStudio');await root.locator('[data-channel]').waitFor();
  await root.locator('[data-tool-add=keyboard]').click();await root.locator('[data-act=studio]').click();
  await root.locator('[data-view=tracks]').click();assert.equal(await root.locator('.daw-dock').isVisible(),false);
  const timeline=await root.locator('.daw-scroll').boundingBox();assert(timeline.height>viewport.height*.5);
  await root.locator('[data-view=instrument]').click();assert.equal(await root.locator('.daw-scroll').isVisible(),false);
  const key=root.locator('[data-experience-note="60"]');await key.focus();await key.press('Enter');assert.equal(await root.locator('.is-down').count(),0);
  await root.locator('[data-view=split]').click();assert(await root.locator('.daw-scroll').isVisible());assert(await root.locator('.daw-dock').isVisible());
  await root.locator('.daw-settings summary').click();await root.locator('[data-act=countin]').click();await root.locator('.daw-settings summary').click();
  await root.locator('[data-view=instrument]').click();await root.locator('[data-act=record]').click();
  await key.focus();await key.press('Enter');await page.waitForTimeout(120);await root.locator('[data-act=stop]').click();
  assert.match(await root.locator('[data-ref=status]').textContent(),/Recorded 1 note/);
  await root.locator('[data-view=tracks]').click();assert.equal(await root.locator('[data-clip]').count()>0,true);
  await root.locator('.daw-region summary').click();assert(await root.locator('[data-loop-bound=start]').isVisible());
  await root.locator('.daw-file-tools summary').click();await page.waitForFunction(()=>!document.querySelector('#trackStudio .daw-region').open,null,{timeout:2000});
  await root.locator('.daw-file-tools summary').click();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  await page.screenshot({path:`/tmp/music-workspace-${viewport.width}.png`});console.log(`Workspace ${viewport.width}×${viewport.height}: passed`);await page.close();
 }
}finally{await browser.close();}
