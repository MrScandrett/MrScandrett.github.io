// Run serve-local.js first. Checks actual SVG letter and accidental bounds.
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
import assert from 'node:assert/strict';
const browser = await chromium.launch({executablePath:findChromium()});
try {
const page=await browser.newPage({viewport:{width:1080,height:800}});
await page.goto('http://127.0.0.1:8080/lessons/music/pioneers/chopin.html');
await page.waitForFunction(()=>window.ScoreEngine && window.MusicNotation);
await page.evaluate(()=>{
 MusicNotation.setPreferences({pitchNames:true,noteColors:true});
 const examples=[
  ['Half step: B–C',{notes:'@U (B3 C4)/4 r/4'}],
  ['Half step: C♯–D',{notes:'@U (C#4 D4)/4 r/4'}],
  ['Separate voices: C–D♯',{voices:[{notes:'@U C4/4 r/4'},{notes:'@D D#4/4 s/4'}]}],
  ['Chromatic notes on one line',{voices:[{notes:'@U C4/4 r/4'},{notes:'@D C#4/4 s/4'}]}]
 ];
 document.body.innerHTML='<main id="examples"><h1>Readable note names</h1><p>Close notes keep their staff positions, with room for every letter and accidental.</p><div class="cards"></div></main>';
 const style=document.createElement('style'); style.textContent='body{margin:0;background:#f2f1ec;padding:24px;color:#16130f;font:16px system-ui}h1{font-size:24px;margin:0}p{margin:10px 0 20px}.cards{display:grid;grid-template-columns:1fr 1fr;gap:16px}article{--se-paper:#fffdf6;background:#fffdf6;border:1px solid #d7d1c7;border-radius:12px;padding:16px;min-width:0}h2{font-size:16px;margin:0 0 12px}svg{width:100%;height:auto;color:#16130f}.se-pitch-label{font-family:system-ui;font-weight:800}';document.head.append(style);
 examples.forEach(([title,staff],i)=>{
   const model=ScoreEngine.prepare({id:'named-'+i,time:'2/4',staves:[{clef:'treble',...staff}]});ScoreEngine.analyse(model);
   const layout=ScoreEngine.engrave(model,465,true);
   document.querySelector('.cards').insertAdjacentHTML('beforeend',`<article><h2>${title}</h2><svg class="se-score" viewBox="0 0 ${layout.width} ${layout.height}">${layout.svg}</svg></article>`);
 });
});
const overlaps=await page.evaluate(()=>[...document.querySelectorAll('article')].flatMap(card=>{
 const labels=[...card.querySelectorAll('.se-nhead-t,.se-nhead-acc')].map(el=>({el,r:el.getBoundingClientRect()}));
 return labels.flatMap((a,i)=>labels.slice(i+1).filter(b=>a.el.parentElement!==b.el.parentElement && Math.min(a.r.right,b.r.right)>Math.max(a.r.left,b.r.left)+.5 && Math.min(a.r.bottom,b.r.bottom)>Math.max(a.r.top,b.r.top)+.5).map(()=>card.querySelector('h2').textContent));
}));
assert.deepEqual(overlaps,[],'letters and in-head accidentals remain separate');
await page.screenshot({path:'/tmp/readable-note-names.png'});
console.log('Four close-note examples: no overlapping letter/accidental labels.');
} finally {await browser.close();}
