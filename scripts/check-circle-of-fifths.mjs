import {chromium} from 'playwright';
import {findChromium} from '../lib/find-chromium.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:findChromium(),headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1050}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
// Start serve-local.js first; pass its origin to use a different port.
await page.goto((process.argv[2] || 'http://127.0.0.1:8080')+'/lessons/music/theory/circle-of-fifths.html');
await page.locator('#diagram-summary').waitFor();
await page.locator('#tap-sound').uncheck();
const result=await page.evaluate(()=>{
 const pitch=n=>({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[n[0]]+(n.includes('♯')?1:n.includes('♭')?-1:0)+12)%12;
 let checked=0;
 for(let key=0;key<13;key++){
  if(key===12)document.querySelector('#switch-spelling').click();
  else document.querySelectorAll('.wheel-key')[key===12?6:key===6?11:key===11?6:key].click();
  for(let d=0;d<7;d++){
   const select=document.querySelector('#diagram-chord');select.value=d;select.dispatchEvent(new Event('change'));
   const summary=document.querySelector('#diagram-summary').textContent;
   const expected=summary.split(' · ').at(-1).split(' – ').map(pitch).sort((a,b)=>a-b);
   const text=document.querySelector('#guitar-frets').textContent.split(': ')[1].split('. ')[0];
   const frets=text.split(' · ').map(f=>f==='×'?-1:Number(f));
   const got=[...new Set(frets.flatMap((f,i)=>f<0?[]:[([40,45,50,55,59,64][i]+f)%12]))].sort((a,b)=>a-b);
   if(JSON.stringify(got)!==JSON.stringify(expected))throw new Error(summary+' guitar mismatch '+text);
   const labels=[...document.querySelectorAll('#chord-piano text')].filter(t=>!['R','3','5'].includes(t.textContent)).map(t=>pitch(t.textContent)).sort((a,b)=>a-b);
   if(JSON.stringify(labels)!==JSON.stringify(expected))throw new Error(summary+' piano mismatch');
   for(const dot of document.querySelectorAll('#chord-guitar circle'))if(+dot.getAttribute('cy')>194)throw new Error('Off-grid fret');
   checked++;
  }
 }
 return checked;
});
assert.equal(result,91);
await page.locator('#hear-guitar-chord').click();
await page.waitForFunction(()=>document.querySelector('#audio-status').textContent.startsWith('Playing:'));
await page.locator('#stop-audio').click();
await page.locator('#hear-piano-chord').click();
await page.waitForFunction(()=>document.querySelector('#audio-status').textContent.startsWith('Playing:'));
await page.locator('#stop-audio').click();
await page.locator('#progression').selectOption('home');
await page.locator('#fifths-tempo').fill('160');
await page.locator('#play-progression').click();
await page.waitForFunction(()=>document.querySelector('#diagram-chord').value==='3');
await page.locator('#stop-audio').click();
await page.locator('#chord-path button').nth(2).click();
assert.equal(await page.locator('#diagram-chord').inputValue(),'4');
await page.locator('#stop-audio').click();
await page.setViewportSize({width:390,height:844});
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
assert.deepEqual(errors,[]);
console.log('PASS: 91 key/chord combinations, exact guitar pitches, piano tones, fret bounds, instrument playback, progression sync, and mobile width.');
await browser.close();
