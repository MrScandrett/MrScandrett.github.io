// Drives the rig library in the Pivot animator: every preview draws, rigs land on the stage, poses apply,
// the stage figure can be saved as a rig and shared, and nothing logs an error.
// Run against `node serve-local.js`:  PIVOT_BASE_URL=http://127.0.0.1:8080 node scripts/check-pivot-rigs.mjs
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {findChromium} from '../lib/find-chromium.mjs';
const base=process.env.PIVOT_BASE_URL||'http://127.0.0.1:8080';
const browser=await chromium.launch({executablePath:findChromium(['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']),headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900},hasTouch:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const doc=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('classroom-pivot-project-v1')).doc);
try{
 await page.goto(base+'/lessons/2d-design/pivot-stick-animator.html');await page.locator('.piv-frame-thumb').first().waitFor();
 await page.locator('#piv-btn-new').click();
 await page.locator('#piv-btn-rig-library').click();
 await page.waitForFunction(()=>document.querySelectorAll('.piv-rig-card svg').length>=15,null,{timeout:20000});
 const cards=await page.locator('.piv-rig-card').count();
 assert.equal(await page.locator('.piv-rig-card svg').count(),cards,'every card previews');
 // search: whole-word prefixes only
 await page.locator('[data-search]').fill('wing');
 assert.ok(await page.locator('.piv-rig-card[data-rig=bird]').count()&&!await page.locator('.piv-rig-card[data-rig=dog]').count());
 await page.locator('[data-search]').fill('zzzz');assert.match(await page.locator('.piv-rigs-empty').textContent(),/No rigs match/);
 await page.locator('[data-search]').fill('');
 // add an artwork rig in a pose and a stroke rig; they keep their own colors and positions
 const add=async(id,pose)=>{const c=page.locator(`.piv-rig-card[data-rig=${id}]`);await c.scrollIntoViewIfNeeded();await c.locator('[data-pose]').selectOption(pose);await c.locator('[data-add]').click();await page.waitForFunction(()=>!document.querySelector('[data-add]:disabled'));};
 await add('gearpod','Wave');await add('robot-arm','Pick up');await add('gearpod','Rest');
 let d=await doc();
 const gear=d.types.filter(t=>t.rigId==='gearpod');assert.equal(gear.length,1,'same rig shares one type');
 assert.ok(gear[0].segments.every(s=>s.artwork&&/^data:image\/png;base64,/.test(s.artwork.src)),'sprite parts carry PNG artwork');
 const figs=d.frames[0].figures;assert.equal(figs.length,4);
 const xs=figs.map(f=>f.x);assert.equal(new Set(xs.map(Math.round)).size,xs.length,'new figures do not stack: '+xs);
 assert.ok(xs.every(x=>x>60&&x<d.width-60));
 await page.locator('[data-close]').click();
 // pose menu on the stage for the selected (last-added) gearpod
 await page.locator('#piv-pose-select').selectOption('Walk A');
 d=await doc();const sel=d.frames[0].figures.at(-1),ty=d.types[sel.type];
 const want=ty.poses['Walk A'];assert.ok(want.every((a,i)=>Math.abs(sel.angles[i]-a)<1e-6),'Walk A applied');
 // saved rig round trip + share + delete
 await page.locator('#piv-btn-rig-library').click();
 await page.locator('[data-save-name]').fill('Nope');await page.locator('[data-save]').click();
 assert.match(await page.locator('[data-status]').textContent(),/drawing project/,'artwork figures are refused with a reason');
 await add('fish','Swim A');
 await page.locator('[data-save-name]').fill('Gear walker');await page.locator('[data-save]').click();
 assert.match(await page.locator('[data-status]').textContent(),/Saved/);
 assert.equal(await page.locator('.piv-rig-card[data-cat-of=mine]').count(),1);
 const [dl]=await Promise.all([page.waitForEvent('download'),page.locator('.piv-rig-card[data-cat-of=mine] [data-export]').click()]);
 assert.match(dl.suggestedFilename(),/\.rig\.json$/);
 const mine=await page.evaluate(()=>JSON.parse(localStorage.getItem('classroomos:pivot-rigs:v1')));assert.equal(mine[0].parts.length,6);
 await page.locator('.piv-rig-card[data-cat-of=mine] [data-delete]').click();
 assert.equal(await page.locator('.piv-rig-card[data-cat-of=mine]').count(),0);
 // a rig with artwork parts is refused as a shared file
 await page.locator('[data-import-input]').setInputFiles({name:'bad.rig.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({id:'x',name:'x',category:'mine',svg:{src:'assets/a.svg'},parts:[{id:'a',a:[0,0],b:[1,0],els:[0],clip:[0,0,5,5]}]}))});
 await page.waitForFunction(()=>/not a rig|not allowed|come from the library/i.test(document.querySelector('[data-status]').textContent));
 await page.keyboard.press('Escape');
 await page.waitForFunction(()=>!document.querySelector('.piv-rigs-dialog'),null,{timeout:3000}).catch(()=>{});
 assert.equal(await page.locator('.piv-rigs-dialog').count(),0,'Escape closes the dialog even after a card was deleted');
 // .piv export refuses library rigs instead of writing a file that loses their joints
 await page.locator('#piv-btn-save-piv').click();
 assert.match(await page.locator('#piv-status-toast').textContent(),/Save drawing project/);
 assert.deepEqual(errors,[]);
 console.log('Rig library browser checks passed: previews, search, add, shared types, spacing, stage poses, save/share/delete, file guard, .piv guard.');
}finally{await browser.close();}
