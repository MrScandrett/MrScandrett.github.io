// Run with node serve-local.js running on port 8080.
import {chromium} from 'playwright';
import {findChromium} from '../lib/find-chromium.mjs';
import assert from 'node:assert/strict';
const b=await chromium.launch({executablePath:findChromium(),headless:true});
try{
for(const viewport of [{width:3840,height:2160},{width:1366,height:768},{width:390,height:844},{width:844,height:390}]){
 const p=await b.newPage({viewport,deviceScaleFactor:2});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8080/');await p.locator('#hometab-sandbox').click();await p.locator('#pdraw-canvas').waitFor({state:'visible'});
 // Exercise in-browser expansion on narrow screens, native fullscreen otherwise.
 if(viewport.width<500) await p.evaluate(()=>{document.querySelector('#tabpanel-sandbox').requestFullscreen=()=>Promise.reject(new Error('test fallback'))});
 const aspect=await p.locator('#pdraw-canvas').evaluate(c=>c.clientWidth/c.clientHeight);
 await p.locator('#tabpanel-sandbox > .creation-app-toolbar .creation-app-fullscreen:not(.sandbox-tools-toggle)').click();await p.waitForTimeout(300);
 for(const mode of ['draw','phys','rider','powder']){
  await p.locator('#ptab-'+mode).click();if(mode==='powder')await p.locator('#ppowder-demo').click();
  await p.waitForTimeout(100);
  const m=await p.locator(`#p${mode==='draw'?'draw':mode==='phys'?'phys':mode==='rider'?'rider':'powder'}-canvas`).evaluate(c=>{
   const r=c.getBoundingClientRect(),app=document.querySelector('#tabpanel-sandbox');return {width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom,pixels:c.width*c.height,scroll:app.scrollHeight,client:app.clientHeight,viewport:innerHeight};});
  assert.ok(Math.abs(m.width/m.height-aspect)<.02, `${mode} aspect ratio`);assert.ok(m.pixels<=1920*1080,`${mode} raster`);assert.ok(m.height>120,`${mode} stage too small ${JSON.stringify(m)}`);assert.ok(m.bottom<=viewport.height+1,`${mode} clipped ${JSON.stringify(m)}`);assert.ok(m.right<=viewport.width+1,`${mode} clipped horizontally`);assert.ok(m.scroll<=m.client+2,`${mode} page scroll ${JSON.stringify(m)}`);
  console.log(viewport.width,mode,Math.round(m.width),Math.round(m.height));
 }
 await p.locator('.sandbox-tools-toggle').click();await p.waitForTimeout(100);
 assert.equal(await p.locator('#ppanel-powder .powder-toolbar').isVisible(),false);
 await p.locator('.sandbox-tools-toggle').click();

 await p.locator('#ptab-rider').click();await p.locator('#prider-fullscreen').click();await p.waitForTimeout(150);assert.equal(await p.evaluate(()=>!!document.fullscreenElement||document.querySelector('#tabpanel-sandbox').classList.contains('creation-app-expanded')),false);
 assert.deepEqual(errors,[]);await p.close();
}
}finally{await b.close()}
