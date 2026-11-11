// Real-browser regression: all composer workspaces, rendered parts and sampled audio.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {findChromium} from '../lib/find-chromium.mjs';
const catalog=JSON.parse(await readFile(new URL('../data/composer-workspaces.json',import.meta.url)));
const base=process.env.SCORE_TEST_URL||'http://127.0.0.1:8080';
const browser=await chromium.launch({executablePath:findChromium(),headless:true});
let checked=0;
try {
  for(const [composer,entry] of Object.entries(catalog)) {
    const page=await browser.newPage({viewport:{width:390,height:844}}), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${base}/lessons/music/pioneers/${composer}.html`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!document.querySelector('#bv-score').scorePlayer);
    assert.equal(await page.locator('main > :first-child').getAttribute('data-composer-intro'),'');
    assert.equal(await page.locator('main > :nth-child(2)').getAttribute('id'),'composer-studio');
    assert.equal(await page.locator('main > :first-child h1').count(),1);
    assert.equal(await page.locator('main > :first-child figure[data-zoomable] img').count(),1);
    assert.equal(await page.locator('#bv-work option').count(),entry.scores.length);
    for(const id of entry.scores) {
      await page.selectOption('#bv-work',id);
      for(const mode of ['original','piano','alto','tenor','guitar','bass']) {
        await page.selectOption('#bv-mode',mode);
        assert.equal(await page.locator('#bv-score .se-error').count(),0,`${id}/${mode}`);
        assert.ok(await page.locator('#bv-score svg').count(),`${id}/${mode}: engraved score`);checked++;
      }
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${composer}: mobile overflow`);
    await page.selectOption('#bv-mode','original');
    // Track actual voice backend and MIDI pitches; this verifies samples were ready
    // before scheduling, rather than merely testing that a Play button changed text.
    await page.evaluate(()=>{window.played=[];const start=MusicSynth.startVoice;MusicSynth.startVoice=(...args)=>{const voice=start(...args);window.played.push({midi:args[3],instrument:args[2],sampled:!!voice.sampled});return voice;};});
    await page.click('#bv-score .se-play');
    await page.waitForFunction(()=>window.played.length>0,{},{timeout:30000});
    const played=await page.evaluate(()=>window.played);assert.ok(played.some(n=>n.sampled),`${composer}: recorded voices`);
    await page.click('#bv-score .se-stop');
    assert.equal(await page.locator('#bv-score').evaluate(f=>f.scorePlayer.voices.size),0);
    await page.setViewportSize({width:1440,height:900});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${composer}: desktop overflow`);
    assert.deepEqual(errors,[],composer);
    console.log(`${composer}: ${entry.scores.length} scores, rendering and sampled playback passed`);
    await page.close();
  }
  console.log(`Composer studio audit passed: 16 lessons, ${checked} arrangements.`);
} finally {await browser.close();}
