// Start node serve-local.js, then run node tests/weekly-practice-browser.mjs.
// WEEKLY_PRACTICE_BASE can point to another local server; output goes to output/weekly-practice.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
const browser=await chromium.launch({executablePath:findChromium(),headless:true});
const base=process.env.WEEKLY_PRACTICE_BASE || 'http://127.0.0.1:8080';
try {
for(const [instrument,file] of [['drums','drums'],['piano','piano'],['guitar','guitar'],['violin','violin-fingerboard']]) {
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.route('https://**/*',route=>route.abort());
 if(instrument==='piano'||instrument==='guitar')await context.addInitScript(instrument=>localStorage.setItem(instrument==='piano'?'pcPracticeList':'gcPracticeList',JSON.stringify([{kind:'chord',rootPC:0,typeSuffix:'',inversionIndex:0,formKey:'C'},{kind:'scale',rootPC:0,scaleKey:'ionian'}])),instrument);
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/lessons/music/instruments/${file}.html`,{waitUntil:'networkidle'});
 const planner=page.locator('#weekly-practice');await planner.waitFor();
 await page.locator('.wp-entry').click();await planner.getByLabel('Student name',{exact:true}).fill('Alex');
 await planner.getByLabel('This week’s focus',{exact:true}).fill('Steady, comfortable playing');
 await planner.getByRole('button',{name:'＋ Add activity',exact:true}).click();
 assert.equal(await page.locator('.wp-library-dialog[open]').count(),1);
 await page.locator('.wp-filter-chips button').nth(1).click();
 await page.locator('.wp-library-card button').first().click();assert.equal(await page.locator('.wp-exercise-edit').count(),1);
 assert.equal(await page.locator('.wp-library-dialog[open]').count(),1);
 await page.keyboard.press('Escape');
 await page.locator('.wp-exercise-edit').first().getByRole('button',{name:'Remove',exact:true}).click();
 const monday=planner.getByRole('button',{name:'Practice on Monday',exact:true});const oldDay=await monday.getAttribute('aria-pressed');await monday.click();assert.notEqual(await monday.getAttribute('aria-pressed'),oldDay);await monday.click();
 await page.locator('.wp-filter-chips button').first().evaluate(b=>b.click());
 await planner.getByRole('button',{name:'Add a three-part starter',exact:true}).click();
 assert.equal(await page.locator('.wp-exercise-edit').count(),3);
 await page.locator('.wp-exercise-edit').first().getByRole('button',{name:/^Edit /}).click();
 await page.locator('.wp-edit-dialog').getByLabel('Note for this exercise',{exact:true}).fill('Keep this one for next week.');
 await page.locator('.wp-edit-dialog').getByRole('button',{name:'Done',exact:true}).click();
 // Page previews must contain every exercise with no clipped paper content.
 const checkPages=async()=>{
   const sizes=await page.locator('.wp-preview .wp-paper').evaluateAll(pages=>pages.map(p=>({height:p.clientHeight,scroll:p.scrollHeight,width:p.clientWidth,scrollWidth:p.scrollWidth})));
   assert(sizes.length>0);for(const s of sizes){assert(s.scroll<=s.height+2,`${instrument} clipped page: ${JSON.stringify(s)}`);assert(s.scrollWidth<=s.width+2);}
 };
 await checkPages();
 const originalWeek=await planner.getByLabel('Week of',{exact:true}).inputValue();
 await planner.getByRole('button',{name:'Copy to next week',exact:true}).click();
 assert.equal(await page.locator('.wp-exercise-edit').count(),3);
 assert.equal(await planner.getByLabel('Student name',{exact:true}).inputValue(),'Alex');
 assert.notEqual(await planner.getByLabel('Week of',{exact:true}).inputValue(),originalWeek);
 await page.locator('.wp-exercise-edit').first().getByRole('button',{name:/^Edit /}).click();
 assert.equal(await page.locator('.wp-edit-dialog').getByLabel('Note for this exercise',{exact:true}).inputValue(),'Keep this one for next week.');
 await page.locator('.wp-edit-dialog').getByRole('button',{name:'Done',exact:true}).click();
 await page.locator('.wp-exercise-edit').first().getByRole('button',{name:'Move down',exact:true}).click();
 await page.locator('.wp-exercise-edit').first().getByRole('button',{name:'Remove',exact:true}).click();
 assert.equal(await page.locator('.wp-exercise-edit').count(),2);
 await page.locator('.wp-status').getByRole('button',{name:'Undo'}).click();
 assert.equal(await page.locator('.wp-exercise-edit').count(),3);
 await planner.getByRole('button',{name:'Preview',exact:true}).click();
 await planner.getByText('Change the printout',{exact:true}).click();
 await planner.getByLabel('Large notation',{exact:true}).check();await checkPages();
 await page.locator('.wp-preview-dialog').getByRole('button',{name:'Close your printout',exact:true}).click();
 await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('.wp-exercise-edit').count(),3);assert.equal(await planner.getByLabel('Student name',{exact:true}).inputValue(),'Alex');
 // Capture actual print roots synchronously while print is active, then verify cleanup.
 await page.evaluate(()=>{window.print=()=>{window.__printed=[...document.querySelectorAll('#weeklyPracticePrint .wp-paper')].map(p=>({text:p.textContent,height:p.clientHeight,scroll:p.scrollHeight}));};});
 await planner.getByRole('button',{name:'Print this assignment',exact:true}).click();
 const printed=await page.evaluate(()=>window.__printed);assert(printed.length>0);assert(printed[0].text.includes('Alex'));for(const p of printed)assert(p.scroll<=p.height+2);
 assert.equal(await page.locator('body.wp-printing').count(),0);
 await planner.getByText('Saved weeks & more',{exact:true}).click();
 for(const checkbox of await planner.locator('.wp-roster input:not(:disabled)').all()) await checkbox.check();
 await planner.getByRole('button',{name:'Print selected assignments',exact:true}).click();
 assert((await page.evaluate(()=>window.__printed.length))>printed.length);
 await page.locator('.wp-batch').evaluate(d=>d.open=false);
 await planner.getByRole('button',{name:'Preview',exact:true}).click();
 await page.locator('.wp-preview-side').screenshot({path:`output/weekly-practice/${instrument}-preview.png`});
 await page.locator('.wp-preview-dialog').getByRole('button',{name:'Close your printout',exact:true}).click();
 await planner.screenshot({path:`output/weekly-practice/${instrument}-board.png`});
 await page.setViewportSize({width:390,height:844});await page.locator('.wp-entry').click();
 await planner.screenshot({path:`output/weekly-practice/${instrument}-mobile.png`});
 const overflow=await page.evaluate(()=>({body:document.body.scrollWidth,viewport:innerWidth}));assert(overflow.body<=overflow.viewport+2,`${instrument} mobile overflow ${JSON.stringify(overflow)}`);
 await page.waitForTimeout(200);await checkPages();
 assert.deepEqual(errors,[],`${instrument}: runtime errors`);

 // Exercise live adapters and saved notation after reload, including imported data.
 if(instrument==='guitar'||instrument==='violin') {
   await page.locator('.wp-add-current button').evaluate(b=>b.click());
   assert.equal(await page.locator('.wp-exercise-edit').count(),4);
 } else if(instrument==='drums') {
   await page.locator('.dr-player').first().locator('button').filter({hasText:'Add selected pattern to weekly assignment'}).evaluate(b=>b.click());
   assert.equal(await page.locator('.wp-exercise-edit').count(),4);
 }
 const backup=await page.evaluate(instrument=>localStorage.getItem('weekly-practice-v1-'+instrument),instrument);
 await page.locator('.wp-batch input[type=file]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(backup)});
 await page.waitForFunction(()=>document.querySelector('.wp-status').textContent.startsWith('Imported'));
 assert.equal(await page.locator('#wpAssignment option').count(),4);
 await checkPages();
 if(instrument==='piano'||instrument==='guitar'){
   const items=await page.evaluate(()=>window.getWeeklyPracticeList());assert.equal(items.length,2);
   if(instrument==='piano')assert(items[0].pitches.every(p=>typeof p==='string'));
   await planner.getByRole('button',{name:'＋ Add activity',exact:true}).click();
   await planner.getByText('Use something from the lesson',{exact:true}).click();
   await planner.getByRole('button',{name:'Add saved chord / scale practice list',exact:true}).click();
   await checkPages();
 }
 assert.deepEqual(errors,[],`${instrument}: adapter or import error`);
 await page.emulateMedia({media:'print'});
 await page.evaluate(()=>{const root=document.getElementById('weeklyPracticePrint');root.replaceChildren(...[...document.querySelectorAll('.wp-preview .wp-paper')].map(p=>p.cloneNode(true)));document.body.classList.add('wp-printing');});
 const printSizes=await page.locator('#weeklyPracticePrint .wp-paper').evaluateAll(pages=>pages.map(p=>({height:p.clientHeight,scroll:p.scrollHeight})));
 for(const p of printSizes) assert(p.scroll<=p.height+2,`${instrument}: print media clipped ${JSON.stringify(p)}`);
 await page.locator('#weeklyPracticePrint .wp-paper').first().screenshot({path:`output/weekly-practice/${instrument}-print.png`});
 for(const format of ['Letter','A4']){const pdf=await page.pdf({path:`output/weekly-practice/${instrument}-${format}.pdf`,format,printBackground:true,preferCSSPageSize:true});assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,printSizes.length,`${instrument}: ${format} page count differs from preview`);}
 await page.emulateMedia({media:'screen'});await page.evaluate(()=>{document.body.classList.remove('wp-printing');document.getElementById('weeklyPracticePrint').replaceChildren();});
 const before=await page.locator('.wp-exercise-edit').count();await page.locator('.wp-exercise-edit').first().getByRole('button',{name:/^Edit /}).click();
 await page.locator('.wp-edit-dialog').getByLabel('Carry this exercise into next week',{exact:true}).uncheck();
 await page.locator('.wp-edit-dialog').getByRole('button',{name:'Done',exact:true}).click();
 await planner.getByRole('button',{name:'Copy to next week',exact:true}).click();assert.equal(await page.locator('.wp-exercise-edit').count(),before-1);
 await page.locator('.wp-batch input[type=file]').setInputFiles({name:'wrong-instrument.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:1,instrument:'wrong',sheets:[{}]}))});
 await page.waitForFunction(()=>document.querySelector('.wp-status').textContent.startsWith('Import failed'));assert.equal(await page.locator('.wp-exercise-edit').count(),before-1);
 assert.deepEqual(errors,[],`${instrument}: final errors`);
 console.log(`${instrument}: saving, weekly carryover, live exercises, backup import, batch print, mobile fit, and Letter/A4 output passed`);
 await context.close();
}
} finally {await browser.close();}
