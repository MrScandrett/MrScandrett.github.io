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
  const selected=process.env.COMPOSER_TEST_FILTER;
  const entries=Object.entries(catalog).filter(([composer])=>!selected||selected.split(',').includes(composer));
  for(const [composer,entry] of entries) {
    const page=await browser.newPage({viewport:{width:390,height:844}}), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${base}/lessons/music/pioneers/${composer}.html`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!document.querySelector('#bv-score').scorePlayer);
    const intro=await page.locator('main > :first-child').getAttribute('data-composer-intro');
    if(intro!==null) {
      assert.equal(await page.locator('main > :nth-child(2)').getAttribute('id'),'composer-studio');
      assert.equal(await page.locator('main > :first-child figure[data-zoomable] img').count(),1);
    } else {
      assert.equal(await page.locator('main > :first-child').getAttribute('id'),'composer-studio');
    }
    assert.equal(await page.locator('main > :first-child h1').count(),1);
    assert.equal(await page.locator('#bv-work option').count(),entry.scores.length);
    for(const id of entry.scores) {
      await page.selectOption('#bv-work',id);
      for(const mode of ['original','piano','melody','violin','alto','tenor','guitar','bass']) {
        await page.selectOption('#bv-mode',mode);
        assert.equal(await page.locator('#bv-score .se-error').count(),0,`${id}/${mode}`);
        assert.ok(await page.locator('#bv-score svg').count(),`${id}/${mode}: engraved score`);
        if (mode === 'guitar' || mode === 'bass') {
          assert.ok(await page.locator('#bv-score .se-tablature').count(),`${id}/${mode}: tab integrated with notation`);
          assert.ok(await page.locator('#bv-score .se-tab-note').count(),`${id}/${mode}: aligned fret numbers`);
          assert.equal(await page.locator('.bv-tab-grid').count(),0,`${id}/${mode}: no separate measure cards`);
          const expectedStrings = mode === 'bass' ? 4 : 6;
          assert.equal(await page.locator('#bv-score .se-tablature').first().locator('line').count(),expectedStrings,`${id}/${mode}: string count`);
          assert.ok(await page.locator('#bv-score .se-tab-note').first().evaluate(el =>
            !!el.closest('svg').querySelector('.se-ev[data-i="' + el.dataset.i + '"]')
          ),`${id}/${mode}: fret linked to playable note`);
        }
        if(mode==='violin') {
          assert.ok(await page.locator('.bv-violin-controls').isVisible(),`${id}: violin position controls`);
          await page.check('#bv-violin-show');
          assert.ok(await page.locator('.bv-violin-bar').count(),`${id}: violin position guide`);
          await page.uncheck('#bv-violin-show');
        }
        checked++;
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
  console.log(`Composer studio audit passed: ${entries.length} lessons, ${checked} arrangements.`);
} finally {await browser.close();}
