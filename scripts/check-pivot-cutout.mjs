import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import sharp from 'sharp';
import {findChromium} from '../lib/find-chromium.mjs';
const base=process.env.PIVOT_BASE_URL||'http://127.0.0.1:8080';
const browser=await chromium.launch({executablePath:findChromium(['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']),headless:true});
const page=await browser.newPage({viewport:{width:1280,height:950},hasTouch:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('classroom-pivot-project-v1')));
const drawing=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="white"/><rect x="85" y="80" width="45" height="115" fill="#dd2020"/><path d="M140 110L160 105L185 175L165 185Z" fill="#2040dd"/></svg>')).png().toBuffer();
async function at(x,y){await page.locator('[data-source]').scrollIntoViewIfNeeded();const r=await page.locator('[data-source]').boundingBox();await page.mouse.click(r.x+x/200*r.width,r.y+y/300*r.height);}
async function upload(){await page.locator('[data-photo]').setInputFiles({name:'paper.png',mimeType:'image/png',buffer:drawing});await page.waitForFunction(()=>!document.querySelector('[data-work]').hidden);}
try{
 await page.goto(base+'/lessons/2d-design/pivot-stick-animator.html');await page.locator('.piv-frame-thumb').first().waitFor();await page.locator('#piv-btn-new').click();
 await page.locator('#piv-btn-import-drawing').click();await upload();
 await page.locator('[data-action=whole]').click();await at(110,180);await at(110,100);await page.locator('[data-action=add]').click();assert.equal(await page.locator('[data-parts] li').count(),1,await page.locator('[data-status]').textContent());
 await page.locator('[data-action=remove]').click();await page.locator('[data-name]').fill('Torso');
 await page.locator('[data-action=polygon]').click();
 for(const [x,y] of [[80,70],[135,70],[135,200],[80,200]])await at(x,y);
 await page.locator('[data-action=reset-joints]').click();await at(110,180);await at(110,100);await page.locator('[data-action=add]').click();
 await page.locator('[data-name]').fill('Arm');
 for(const [x,y] of [[138,100],[162,100],[190,180],[160,190]])await at(x,y);
 await page.locator('[data-action=joints]').click();await at(145,115);await at(175,175);await page.locator('[data-action=add]').click();
 // Correct a saved part without cutting out its artwork again.
 await page.getByRole('button',{name:'Edit joints: Arm',exact:true}).click();
 assert.ok(await page.locator('[value=create]').isDisabled());
 assert.equal(await page.locator('[data-parent] option').count(),2,'Only earlier parts can be parents');
 await page.locator('[data-action=snap]').click();
 assert.equal(await page.locator('[data-coordinate=pivot-x]').inputValue(),'110');
 assert.equal(await page.locator('[data-coordinate=pivot-y]').inputValue(),'100');
 await page.locator('[data-coordinate=pivot-x]').fill('145');await page.locator('[data-coordinate=pivot-x]').press('Tab');
 await page.locator('[data-coordinate=pivot-y]').fill('115');await page.locator('[data-coordinate=pivot-y]').press('Tab');
 await page.locator('[data-zoom]').fill('200');
 assert.equal(await page.locator('[data-zoom-value]').textContent(),'200%');
 await page.locator('[data-action=tip]').click();
 await page.locator('[data-source]').scrollIntoViewIfNeeded();
 let box=await page.locator('[data-source]').boundingBox();
 // Keep the selected handle in view even when the zoomed drawing scrolls.
 await page.locator('.piv-cutout-viewport').evaluate(el=>{el.scrollTop=1000;el.scrollLeft=1000;});
 box=await page.locator('[data-source]').boundingBox();
 await page.mouse.move(box.x+175/200*box.width,box.y+175/300*box.height);await page.mouse.down();
 await page.mouse.move(box.x+180/200*box.width,box.y+180/300*box.height,{steps:4});await page.mouse.up();
 assert.equal(await page.locator('[data-coordinate=tip-x]').inputValue(),'180','Zoomed handle dragging moves the tip');
 await page.locator('[data-action=add]').click();
 assert.equal(await page.locator('[data-parts] li').count(),2,'Editing replaces the part');
 await page.getByRole('button',{name:'Edit joints: Torso',exact:true}).click();
 await page.locator('[data-coordinate=pivot-x]').fill('90');await page.locator('[data-coordinate=pivot-x]').press('Tab');
 await page.locator('[data-action=cancel-edit]').click();
 await page.getByRole('button',{name:'Edit joints: Torso',exact:true}).click();
 assert.equal(await page.locator('[data-coordinate=pivot-x]').inputValue(),'110','Cancel preserves saved joints');
 await page.locator('[data-action=cancel-edit]').click();
 assert.equal(await page.locator('[data-parts] li').count(),2);await page.getByRole('button',{name:'Send back: Arm',exact:true}).click();await page.locator('[value=create]').click();
 let project=await read(),frame=project.doc.frames[0],fig=frame.figures.at(-1),type=project.doc.types[fig.type];
 assert.equal(type.segments.length,2);assert.deepEqual(type.order,[1,0]);assert.equal(type.segments[1].parent,1);assert.ok(type.segments.every(s=>s.artwork.src.startsWith('data:image/png;base64,')));
 await page.waitForTimeout(150);await page.locator('#piv-stage-canvas').screenshot({path:'/tmp/pivot-cutout-stage.png'});
 const previous=await page.evaluate(d=>window.PivEngine.frameOps(d,0).filter(o=>o.kind==='image').sort((a,b)=>a.src.localeCompare(b.src)),project.doc);
 await page.locator('#piv-joint-angle').fill('0');await page.locator('#piv-joint-angle').press('Tab');
 project=await read();const rotated=await page.evaluate(d=>window.PivEngine.frameOps(d,0).filter(o=>o.kind==='image').sort((a,b)=>a.src.localeCompare(b.src)),project.doc);
 assert.ok(rotated.some((op,i)=>op.x!==previous[i].x));assert.ok(rotated.some((op,i)=>op.rotation!==previous[i].rotation));
 await page.locator('#piv-btn-add-frame').click();await page.locator('#piv-btn-flip').click();await page.locator('#piv-btn-add-frame').click();
 project=await read();assert.equal(project.doc.frames.at(-1).figures.at(-1).mirrored,true);
 let pending=page.waitForEvent('download');await page.locator('#piv-btn-save-project').click();let download=await pending;const saved=await fs.readFile(await download.path());assert.match(download.suggestedFilename(),/\.pivot\.json$/);
 await page.locator('#piv-btn-save-piv').click();assert.match(await page.locator('#piv-status-toast').textContent(),/Save drawing project/);
 pending=page.waitForEvent('download');await page.locator('#piv-btn-export-spritesheet').click();download=await pending;
 const sheet=await sharp(await fs.readFile(await download.path())).raw().toBuffer({resolveWithObject:true});
 let red=0,blue=0;for(let i=0;i<sheet.data.length;i+=4){if(sheet.data[i]>150&&sheet.data[i+1]<100)red++;if(sheet.data[i+2]>150&&sheet.data[i]<100)blue++;}assert.ok(red>50&&blue>10,'Sprite sheet includes colored drawing parts');
 await page.locator('#piv-btn-new').click();await page.locator('#piv-file-input').setInputFiles({name:'student.pivot.json',mimeType:'application/json',buffer:saved});
 await page.waitForFunction(()=>document.querySelector('#piv-status-toast').textContent.includes('Opened drawing project'));
 const reopened=await read();assert.deepEqual(reopened.doc,project.doc);
 await page.reload();await page.locator('.piv-frame-thumb').first().waitFor();assert.deepEqual((await read()).doc,project.doc);
 for(const width of [390,320]){
   await page.setViewportSize({width,height:844});await page.locator('#piv-btn-import-drawing').click();await upload();
   assert.ok(await page.locator('.piv-cutout-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Dialog fits phone width');
   await page.locator('[data-action=whole]').click();await page.locator('[data-source]').focus();await page.keyboard.press('Enter');await page.keyboard.press('Shift+ArrowRight');await page.keyboard.press('Enter');
   await page.locator('[data-action=add]').click();assert.equal(await page.locator('[data-parts] li').count(),1);
   if(width===390)await page.screenshot({path:'/tmp/pivot-cutout-mobile.png'});
   await page.keyboard.press('Escape');
 }
 assert.deepEqual(errors,[]);console.log('Cutout checks passed: automatic/manual selection, parented two-part puppet, precise joint coordinates, parent snapping, zoomed dragging, joint editing/cancel, rotation, mirrored frame cloning, image-inclusive sprites, project transfer/reload, and 320/390px keyboard workflow.');
}finally{await browser.close();}
