import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: findChromium(), args:['--disable-dev-shm-usage','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'] });
try {
for (const size of (process.env.DAW_QUICK ? [{width:1440,height:900}] : [{width:1440,height:900},{width:390,height:844},{width:844,height:390}])) {
 console.log('Checking',size);const context=await browser.newContext({viewport:size,hasTouch:size.width!==1440}); await context.grantPermissions(['microphone']);
 const page=await context.newPage(), errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8080/music-lab.html');await page.locator('[data-channel]').waitFor();
 const root=page.locator('#trackStudio');
 const reveal=async sel=>{const d=root.locator(sel).first();if(await d.getAttribute('open')===null)await d.locator(':scope > summary').click();};const conceal=async sel=>{const d=root.locator(sel).first();if(await d.getAttribute('open')!==null)await d.locator(':scope > summary').click();};
 const addTool=async id=>{const catalog=root.locator('.daw-experience-catalog');if(await catalog.getAttribute('open')===null)await catalog.locator('summary').click();await root.locator(`[data-tool-add="${id}"]`).click();};
  await addTool('keyboard');await addTool('notation');await root.locator('[data-note-add]').click();
 await root.locator('[data-note-param="pitch"]').fill('64');await root.locator('[data-note-param="pitch"]').press('Tab');
 await reveal('.daw-arrange');await root.locator('[data-arrange-start]').fill('2');await root.locator('[data-arrange-start]').press('Tab');assert.equal(await root.locator('[data-arrange-start]').inputValue(),'2');
 assert.equal(await root.locator('[data-note-param="pitch"]').inputValue(),'64');assert.equal(await root.locator('.daw-score svg').count(),1);
 console.log('notation passed');await root.locator('[data-channel]').selectOption({label:'Drums'});await addTool('drumkit');await addTool('rhythm');
 await root.locator('[data-step="0"][data-step-pitch="36"]')[size.width===1440?'click':'tap']();assert.equal(await root.locator('[data-step="0"][data-step-pitch="36"]').getAttribute('aria-pressed'),'true');
 await reveal('.daw-channel-options');await root.locator('[data-channel-open="fx"]').click();await root.locator('[data-fx-add="eq"]').click();await root.locator('[data-fx-add="delay"]').click();assert.equal(await root.locator('[data-fx-index]').count(),2);
 await root.locator('.daw-region > summary').click();
 await root.locator('[data-loop-bound="end"]').fill('3');await root.locator('[data-loop-bound="end"]').press('Tab');await reveal('.daw-settings');await root.locator('[data-act="loop"]').click();await conceal('.daw-settings');
 await root.locator('[data-act="play"]').first().click();await page.waitForTimeout(3000);assert.equal(await root.locator('[data-act="play"]').first().getAttribute('aria-label'),'Pause');await root.locator('[data-act="stop"]').click();
 await root.locator('[data-tab="tools"]').click();await root.locator('[data-channel]').selectOption({label:'Keys'});await root.locator('[data-channel-arm]').click();
 await reveal('.daw-settings');await root.locator('[data-act="countin"]').click();await conceal('.daw-settings');await root.locator('[data-act="record"]').first().click();
 await root.locator('[data-tab="play"]').click();const performanceKey=root.locator('[data-pitch="67"]');await performanceKey[size.width===1440?'click':'tap']();await page.waitForTimeout(200);await root.locator('[data-act="stop"]').click();
 assert.match(await root.locator('[data-ref="status"]').textContent(),/Recorded 1 note/);
 console.log('MIDI passed');await root.locator('[data-tab="tools"]').click();await root.locator('[data-channel]').selectOption({label:'Vocals'});await root.locator('[data-channel-arm]').click();await page.waitForTimeout(500);await root.locator('[data-act="record"]').first().click();await page.waitForTimeout(500);assert.equal(await root.locator('[data-ref="bpm"]').isDisabled(),true);await root.locator('[data-channel]').selectOption({label:'Keys'});await root.locator('[data-channel-arm]').click();assert.equal(await root.locator('[data-tr="arm"][aria-label="Arm Vocals for recording"]').getAttribute('aria-pressed'),'true');await root.locator('[data-act="stop"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-ref="status"]').textContent.includes('s of audio'));
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 console.log('Audio passed');await root.locator('[data-tab="tools"]').click();await root.locator('[data-channel]').selectOption({label:'Keys'});
 const downloadEvent=page.waitForEvent('download');await reveal('.daw-channel-options');await root.locator('[data-channel-preset="save"]').click();const download=await downloadEvent;await download.saveAs('/tmp/daw-preset.json');
 await reveal('.daw-channel-options');await root.locator('[data-channel-preset="load"]').click();await root.locator('input[aria-label="Load Music Lab channel preset"]').setInputFiles('/tmp/daw-preset.json');await page.waitForFunction(()=>document.querySelector('[data-ref="status"]').textContent.includes('Loaded preset'));
 await reveal('.daw-channel-options');await root.locator('[data-tab="play"]').click();
 const key=root.locator('[data-pitch="60"]');await key.focus();await key.press('Enter');assert.equal(await key.getAttribute('class'), 'daw-key');
 await root.locator('[data-act="studio"]').click();assert.equal(await page.locator('.pillar-daw.is-studio').count(),1);await root.locator('[data-tab="tools"]').click();
 console.log('Preset and fullscreen passed');await page.screenshot({path:`/tmp/music-daw-${size.width}.png`,animations:'disabled',timeout:10000});
 await root.locator('[data-act="studio"]').click();
 console.log(`${size.width}×${size.height}: channel tools, MIDI/audio takes, loop, FX, overflow passed`);await context.close();
}
}finally{await browser.close();}
