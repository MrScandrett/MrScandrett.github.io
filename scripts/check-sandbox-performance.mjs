import { chromium } from 'playwright';
import {findChromium} from '../lib/find-chromium.mjs';
import assert from 'node:assert/strict';
// Run with the local server on port 8080. Checks work counts, not machine-dependent timing.
const browser=await chromium.launch({executablePath:findChromium(),headless:true});
try {
 {
  const page=await browser.newPage({viewport:{width:3840,height:2160},deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8080/');await page.locator('#hometab-sandbox').click();await page.locator('#pdraw-canvas').waitFor({state:'visible'});
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.locator('#pdraw-canvas').scrollIntoViewIfNeeded();
  const drawing=await page.locator('#pdraw-canvas').evaluate(c=>{
   const r=c.getBoundingClientRect();let paints=0;const ctx=c.getContext('2d'),orig=ctx.stroke;ctx.stroke=function(...a){paints++;return orig.apply(this,a)};
   const ev=(type,x,y)=>c.dispatchEvent(new MouseEvent(type,{bubbles:true,cancelable:true,clientX:r.left+x,clientY:r.top+y}));
   for(let j=0;j<60;j++){ev('mousedown',20,20+j*3);for(let i=0;i<60;i++)ev('mousemove',20+i*5,20+j*3);ev('mouseup',320,20+j*3)}
   paints=0;const start=performance.now();ev('mousedown',50,240);for(let i=0;i<250;i++)ev('mousemove',50+i*2,240+Math.sin(i/10)*20);const elapsed=performance.now()-start;ev('mouseup',550,240);ctx.stroke=orig;
   return {elapsedMs:Math.round(elapsed),strokeCalls:paints,pixels:c.width*c.height};
  });
  await page.locator('#pdraw-undo').click();
  await page.locator('#pdraw-canvas').evaluate(c => {
    const rect=c.getBoundingClientRect();
    for(const [type,x,y] of [['touchstart',40,40],['touchmove',100,70],['touchmove',180,90],['touchend',180,90]]) {
      const touch=new Touch({identifier:1,target:c,clientX:rect.left+x,clientY:rect.top+y});
      c.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'?[]:[touch],changedTouches:[touch]}));
    }
  });
  await page.locator('#ptab-rider').click();await page.locator('#prider-demo').click();await page.locator('#prider-run').click();await page.waitForTimeout(800);
  const rider=await page.locator('#prider-readout').textContent();
  await page.locator('#ptab-powder').click();await page.locator('#ppowder-demo').click();await page.locator('#ppowder-canvas').scrollIntoViewIfNeeded();await page.waitForTimeout(1000);
  const powder=await page.locator('#ppowder-canvas').evaluate(c=>({pixels:c.width*c.height,width:c.width,height:c.height}));
  const particles=await page.locator('#ppowder-count').textContent();
  assert.ok(drawing.pixels <= 1920*1080, 'Drawing raster budget');
  assert.ok(drawing.strokeCalls < 500, 'Move bursts must reuse completed strokes');
  assert.ok(powder.pixels <= drawing.pixels / 2, 'Powder avoids supersampling');
  assert.match(rider, /Run 1/, 'Sample ride advances');
  assert.match(particles, /[1-9]/, 'Powder demo simulates');
  await page.locator('#ppowder-pause').click();
  // Paused powder should not repaint the full grid on each animation frame.
  const idlePaints = await page.locator('#ppowder-canvas').evaluate(async c => {
    const ctx=c.getContext('2d'), original=ctx.drawImage; let calls=0;
    ctx.drawImage=function(...args){calls++;return original.apply(this,args)};
    await new Promise(r=>setTimeout(r,150));ctx.drawImage=original;return calls;
  });
  assert.equal(idlePaints,0);
  async function save() {
    const download=page.waitForEvent('download');await page.locator('#sandbox-save').click();
    const stream=await (await download).createReadStream();const chunks=[];
    for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks);
  }
  const project=await save();
  const touchStroke=JSON.parse(project.toString()).drawing.strokes.at(-1);
  assert.equal(touchStroke.pts.length,3, 'Touch move samples survive frame batching');
  assert.ok(touchStroke.pts[2].x > touchStroke.pts[0].x, 'Touch coordinates map into board space');
  await page.locator('#sandbox-project-file').setInputFiles({name:'board.json',mimeType:'application/json',buffer:project});
  await page.waitForFunction(()=>document.querySelector('#sandbox-project-status').textContent.includes('Board opened.'));
  const restored=JSON.parse((await save()).toString()), original=JSON.parse(project.toString());
  assert.deepEqual(restored.board,original.board);
  assert.deepEqual(restored.drawing,original.drawing);
  assert.deepEqual(restored.course,original.course);
  assert.deepEqual(restored.powder.grid,original.powder.grid);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({drawing,rider,powder,particles,errors}));await page.close();
 }
}finally{await browser.close()}
