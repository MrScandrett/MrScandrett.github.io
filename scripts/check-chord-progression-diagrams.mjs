// Run against node serve-local.js; MUSIC_TEST_URL overrides the server origin.
import {chromium} from 'playwright';
import {findChromium} from '../lib/find-chromium.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:findChromium(),headless:true});
try {
 const origin=process.env.MUSIC_TEST_URL || 'http://localhost:8080/';
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(new URL('lessons/music/theory/chord-progressions.html',origin).href);
 await page.waitForFunction(()=>!document.querySelector('#cp-lab-controls').disabled);
 const result=await page.evaluate(()=>{
  const $=id=>document.getElementById('cp-'+id), engine=$('player').contentWindow.FakeBook;
  const mod=n=>(n%12+12)%12;
  let count=0,missing=[];
  function check(host){
   const name=host.dataset.chord;
   const c=engine.parseTune({id:'test',key:'C',mode:'major',meter:[4,4],melody:'rw',chords:name.replace(/♭/g,'b').replace(/♯/g,'#')}).chords[0];
   let expected=engine.chordTones(c).map(t=>t.pc);
   if(c.bass)expected.push(mod([0,2,4,5,7,9,11][c.bass.l]+c.bass.a));
   expected=[...new Set(expected)].sort((a,b)=>a-b);
   const svg=host.querySelector('.cp-piano-diagram');
   const actual=[...new Set([...svg.querySelectorAll('[data-active="true"]')].map(n=>mod(+n.dataset.midi)))].sort((a,b)=>a-b);
   if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error(name+' piano '+JSON.stringify(actual)+' expected '+expected);
   const frets=[...host.querySelectorAll('[data-string]')].map(n=>n.dataset.fret);
   if(!frets.length){missing.push(name);return;}
   const guitar=[...new Set(frets.flatMap((f,i)=>f==='x'?[]:[mod([40,45,50,55,59,64][i]+Number(f))]))].sort((a,b)=>a-b);
   if(JSON.stringify(guitar)!==JSON.stringify(expected))throw Error(name+' guitar '+JSON.stringify(guitar)+' expected '+expected);
   for(const dot of host.querySelectorAll('.cp-guitar-diagram circle'))if(+dot.getAttribute('cy')>194)throw Error(name+' off-grid fret');
   count++;
  }
  for(const opt of $('loop-key').options){$('loop-key').value=opt.value;$('loop-key').dispatchEvent(new Event('change'));for(const btn of $('palette').querySelectorAll('button')){ $('loop-clear').click();btn.click();check($('loop-diagrams')); }}
  for(const kind of ['library','lab'])for(const opt of $(kind+'-select').options){
   $(kind+'-select').value=opt.value;$(kind+'-select').dispatchEvent(new Event('change'));
   for(const btn of $(kind+'-trail').querySelectorAll('button')){btn.click();check($(kind+'-inspect').querySelector('.cp-diagram-panel'));}
  }
  for(const opt of $('song').options){$('song').value=opt.value;$('song').dispatchEvent(new Event('change'));for(const btn of $('song-trail').querySelectorAll('button')){btn.click();check($('song-diagrams'));}}
  $('loop-stop').click();
  return {count,missing};
 });
 assert.deepEqual(result.missing,[]);
 await page.selectOption('#cp-library-select','3');
 await page.locator('#cp-library-trail button').first().click();
 for(const instrument of ['piano','guitar']){
  await page.locator('#cp-library-inspect').getByRole('button',{name:new RegExp('on '+instrument+'$')}).click();
  await page.waitForTimeout(500);
 }
 await page.locator('#cp-loop-stop').click();
 await page.locator('#cp-loop-tempo').fill('160');
 await page.locator('[data-progression="0,4,5,3"]').click();
 await page.locator('#cp-loop-play').click();
 await page.waitForFunction(()=>document.querySelector('#cp-loop-diagrams').dataset.chord==='Bb');
 await page.keyboard.press('Escape');
 await page.locator('#cp-library-play').click();
 await page.waitForFunction(()=>document.querySelector('#cp-library-inspect .cp-diagram-panel').dataset.chord==='G7');
 await page.keyboard.press('Escape');
 const phone=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 phone.on('pageerror',e=>errors.push(e.message));
 await phone.goto(new URL('lessons/music/theory/chord-progressions.html',origin).href);
 await phone.waitForFunction(()=>!document.querySelector('#cp-lab-controls').disabled);
 for(const kind of ['library','lab']){
  await phone.locator('#cp-'+kind+'-trail button').nth(1).click();
  assert(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert(await phone.locator('#cp-'+kind+'-inspect .cp-piano-diagram').isVisible());
  assert(await phone.locator('#cp-'+kind+'-inspect .cp-guitar-diagram').isVisible());
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify(result));
 console.log('PASS: accurate piano/guitar diagrams across loop keys, every study, every song, previews, playback sync, and phone layout.');
}finally{await browser.close();}
