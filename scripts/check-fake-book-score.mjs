// Run against node serve-local.js. Exercises the actual Web Audio and score UI path.
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
import fs from 'node:fs';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:findChromium(),headless:true,args:['--no-sandbox']});try {
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.audioNotes=[];const orig=OscillatorNode.prototype.start;OscillatorNode.prototype.start=function(t){window.audioNotes.push({f:this.frequency.value,t});return orig.call(this,t);};});
await page.goto((process.env.FAKE_BOOK_BASE_URL || 'http://127.0.0.1:8080') + '/lessons/music/fake-book.html');await page.waitForFunction(()=>window.FakeBook?.state().tune);
const xml=fs.readFileSync('tests/fixtures/scores/meter-voices.musicxml','utf8');
await page.evaluate(xml=>FakeBook.importText(xml),xml);await page.waitForFunction(()=>FakeBook.state().tune.raw.score);
await page.evaluate(()=>{let t=document.querySelector('[data-fb-tempo]');t.value='240';t.dispatchEvent(new Event('input',{bubbles:true}));});
await page.evaluate(()=>{const e=document.querySelector('[data-fb-loop]');e.checked=false;e.dispatchEvent(new Event('change',{bubbles:true}));});
await page.locator('[data-fb-play]').click();await page.waitForTimeout(3800);assert.equal(await page.evaluate(()=>FakeBook.state().playing),false);
console.log('mixed-meter completed, notes',await page.evaluate(()=>audioNotes.map(n=>Math.round(n.f))));
assert.ok((await page.evaluate(()=>audioNotes)).some(n=>Math.abs(n.f-196)<1));
await page.evaluate(()=>{for(const [sel,val] of [['[data-fb-from]',2],['[data-fb-to]',3]]){const e=document.querySelector(sel);e.value=val;e.dispatchEvent(new Event('change',{bubbles:true}));}const e=document.querySelector('[data-fb-loop]');e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}));});
await page.locator('[data-fb-play]').click();await page.waitForTimeout(4800);assert.equal(await page.evaluate(()=>FakeBook.state().playing),true);console.log('loop range',await page.evaluate(()=>[FakeBook.state().opts.from,FakeBook.state().opts.to]));
await page.locator('[data-score-mute="0"]').check();assert.equal(await page.evaluate(()=>FakeBook.state().playing),true);await page.locator('[data-fb-play]').click();
await page.evaluate(xml=>FakeBook.importText(xml),fs.readFileSync('tests/fixtures/scores/crazy-jane.musicxml','utf8'));await page.waitForFunction(()=>FakeBook.state().tune.raw.title==='Crazy Jane');
await page.locator('[data-fb-play]').click();await page.waitForTimeout(4800);
const highlights=await page.locator('.fb-n.is-now,.fb-bn.is-now,.fb-tn.is-now').evaluateAll(ns=>ns.map(n=>n.classList[0]));
assert.ok(highlights.includes('fb-n') && highlights.includes('fb-bn') && highlights.includes('fb-tn'));
console.log('staff highlights',highlights);
await page.locator('.fb-sheet-card').scrollIntoViewIfNeeded();
await page.locator('[data-fb-play]').click();await page.setViewportSize({width:390,height:844});console.log('mobile overflow',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
assert.deepEqual(errors,[]);console.log('page errors',errors);} finally { await browser.close(); }
