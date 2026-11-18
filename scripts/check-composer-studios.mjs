// Real-browser regression: all composer workspaces, rendered parts and sampled audio.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {findChromium} from '../lib/find-chromium.mjs';
const catalog=JSON.parse(await readFile(new URL('../data/composer-workspaces.json',import.meta.url)));
const base=process.env.SCORE_TEST_URL||'http://127.0.0.1:8080';
const scoreFilter=process.env.COMPOSER_TEST_SCORES?.split(',');
const modes=process.env.COMPOSER_TEST_MODES?.split(',')||['original','piano','melody','violin','alto','tenor','guitar','guitar-solo','bass'];
const browser=await chromium.launch({executablePath:findChromium(['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']),headless:true});
let checked=0;
try {
  const selected=process.env.COMPOSER_TEST_FILTER;
  const entries=Object.entries(catalog).filter(([composer])=>!selected||selected.split(',').includes(composer));
  for(const [composer,entry] of entries) {
    const page=await browser.newPage({viewport:{width:390,height:844}}), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${base}/lessons/music/pioneers/${composer}.html`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => !document.querySelector('#bv-work').disabled);
    const initialScore = await page.locator('#composer-studio').getAttribute('data-initial-score');
    assert.ok(entry.scores.includes(initialScore), `${composer}: opening score belongs to the catalogue`);
    assert.equal(await page.locator('#bv-work').inputValue(), initialScore, `${composer}: initial selection`);
    await page.locator('#bv-score .se-workspace').waitFor();
    assert.equal(await page.locator('#bv-score').evaluate(figure => figure.scorePlayer.playing), false);
    await page.locator('.bv-settings > summary').click();
    assert.equal(await page.locator('main > :first-child').getAttribute('id'),'composer-studio');
    assert.equal(await page.locator('main > :first-child h1').count(),1);
    assert.equal(await page.locator('#bv-work option').count(),entry.scores.length + 1);
    const scores=entry.scores.filter(id=>!scoreFilter||scoreFilter.includes(id));
    if (!scores.length) { await page.close(); continue; }
    for(const id of scores) {
      await page.selectOption('#bv-work',id);
      await page.locator('#bv-score .se-workspace').waitFor();
      for(const mode of modes) {
        await page.selectOption('#bv-mode',mode);
        assert.equal(await page.locator('#bv-score .se-error').count(),0,`${id}/${mode}`);
        assert.ok(await page.locator('#bv-score svg').count(),`${id}/${mode}: engraved score`);
        const display = await page.locator('#bv-score').evaluate(figure => {
          const model = figure.scorePlayer.model;
          const events = model.staves.reduce((sum, staff) =>
            sum + staff.bars.reduce((count, bar) => count + bar.events.length, 0), 0);
          const large = model.count >= 150 || model.count * model.staves.length >= 600 || events >= 2000;
          return { large, windowed: !!figure.querySelector('.se-notation-window'),
            measures: figure.querySelectorAll('.se-measure').length, count: model.count };
        });
        assert.equal(display.windowed, display.large, `${id}/${mode}: rendering matches score size`);
        assert.equal(display.measures, display.count, `${id}/${mode}: every measure remains navigable`);

        if (mode === 'guitar' || mode === 'guitar-solo' || mode === 'bass') {
          assert.ok(await page.locator('#bv-score .se-tablature').count(),`${id}/${mode}: tab integrated with notation`);
          if (display.windowed && !await page.locator('#bv-score .se-tab-note').count()) {
            const firstNoteBar = await page.locator('#bv-score').evaluate(figure => {
              const model = figure.scorePlayer.model;
              const index = model.guitarTabBars.findIndex(bar => bar.some(group => group.notes.length));
              return index < 0 ? null : model.barNo[index];
            });
            assert.notEqual(firstNoteBar, null, `${id}/${mode}: arrangement contains fretted notes`);
            const measure = page.locator('#bv-score .sn-goto input');
            await measure.fill(String(firstNoteBar));
            await measure.press('Enter');
            await page.locator('#bv-score .se-tab-note').first().waitFor({ state: 'attached' });
          }
          assert.ok(await page.locator('#bv-score .se-tab-note').count(),`${id}/${mode}: aligned fret numbers`);
          assert.equal(await page.locator('.bv-tab-grid').count(),0,`${id}/${mode}: no separate measure cards`);
          const expectedStrings = mode === 'bass' ? 4 : 6;
          assert.equal(await page.locator('#bv-score .se-tablature').first().locator('line').count(),expectedStrings,`${id}/${mode}: string count`);
          assert.ok(await page.locator('#bv-score .se-tab-note').first().evaluate(el =>
            !!el.closest('svg').querySelector('.se-ev[data-i="' + el.dataset.i + '"]')
          ),`${id}/${mode}: fret linked to playable note`);
        }
        assert.ok(!/undefined|could not be displayed/.test(await page.locator('#bv-note').textContent()),`${id}/${mode}: arrangement explanation`);
        if(mode==='guitar-solo') {
          const automatic=await page.evaluate(()=>{const s=document.querySelector('#bv-score').scorePlayer.model.score;return s.tablature?.maxFret===12;});
          if(automatic)assert.equal(await page.locator('#bv-score .se-tab-note').filter({hasText:'×'}).count(),0,`${id}: playable solo tab`);
        }
        if(mode==='violin') {
          assert.ok(await page.locator('.bv-violin-controls').isVisible(),`${id}: violin position controls`);
          await page.check('#bv-violin-show');
          await page.locator('.bv-violin-bar').first().waitFor({ state: 'attached' });
          const figure = page.locator('#bv-score');
          const marks = figure.locator('.se-violin-finger');
          if (display.windowed && !await marks.count()) {
            const first = await figure.evaluate(fig => {
              const model = fig.scorePlayer.model;
              const event = fig.scoreLayout.events.find(note => model.violinFingerings.has(note));
              return event ? ScoreEngine.barNumber(model, event.bar) : null;
            });
            assert.notEqual(first, null, `${id}: arrangement contains violin marks`);
            const measure = figure.locator('.sn-goto input');
            await measure.fill(String(first));
            await measure.press('Enter');
            await marks.first().waitFor({ state: 'attached' });
          }
          assert.ok(await marks.count(), `${id}: finger numbers are engraved`);
          const marked = await figure.evaluate(fig => {
            const plan = fig.scorePlayer.model.violinFingerings;
            return [...fig.querySelectorAll('.se-violin-finger')].every(mark => {
              const event = fig.scoreLayout.events[mark.closest('.se-ev').dataset.i];
              return plan.get(event)?.description === mark.getAttribute('aria-label');
            });
          });
          assert.ok(marked, `${id}: score marks match the violin plan`);
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
    console.log(`${composer}: ${scores.length} scores, rendering and sampled playback passed`);
    await page.close();
  }
  console.log(`Composer studio audit passed: ${entries.length} lessons, ${checked} arrangements.`);
} finally {await browser.close();}
