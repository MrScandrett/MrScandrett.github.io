import {chromium} from 'playwright';
import {findChromium} from '../lib/find-chromium.mjs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const DawIO=createRequire(import.meta.url)('../assets/js/music-daw-io.js');
const rateFixture=rate=>Buffer.from(DawIO.encodeWav([new Float32Array(Math.round(rate/20))],rate,16));
const browser=await chromium.launch({executablePath:findChromium()});
try {
 for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}]) {
  const page=await browser.newPage({viewport,hasTouch:viewport.width!==1440});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log(e.message)});
  await page.route('https://**/*',route=>route.abort());
  await page.goto('http://localhost:8080/music-lab.html',{waitUntil:'domcontentloaded'});const root=page.locator('#trackStudio');await root.locator('[data-channel]').waitFor();
  const health=root.locator('.daw-audio-health');await health.locator('summary').click();
  await page.waitForFunction(()=>document.querySelector('.daw-audio-health')?.dataset.health==='ready');
  assert.match(await health.locator('[data-health-summary]').textContent(),/Audio is ready/);
  assert.match(await health.locator('.daw-health-facts').textContent(),/Output rate.*Hz.*Recorder.*Ready/s);
  assert.match(await health.locator('.daw-note').textContent(),/does not upload/);
  await page.screenshot({path:`/tmp/music-health-${viewport.width}.png`});
  await health.locator('summary').click();
  const outputText=await health.locator('.daw-health-facts').textContent();const outputRate=outputText.includes('48,000 Hz')?48000:44100;const sourceRate=outputRate===48000?44100:48000;
  await root.locator('[data-ref=file]').setInputFiles({name:`rate-${sourceRate}.wav`,mimeType:'audio/wav',buffer:rateFixture(sourceRate)});
  await page.waitForFunction(()=>document.querySelector('.daw-audio-health')?.dataset.health==='notice');
  assert.equal((await health.locator('[data-health-label]').textContent()).trim(),'Rate notice');
  await health.locator('summary').click();assert.match(await health.locator('[data-health-issues]').textContent(),/Imported audio is being converted.*No change is usually needed/s);await page.screenshot({path:`/tmp/music-rate-warning-${viewport.width}.png`});await health.locator('summary').click();
  await root.locator('[data-channel]').selectOption({label:'Keys'});
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
