import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
import fs from 'node:fs/promises';
const browser = await chromium.launch({executablePath:findChromium(),headless:true,args:['--no-sandbox']});
const output='/tmp/lava-background-qa';await fs.mkdir(output,{recursive:true});
try {
 for(const fallback of [false,true]) {
  const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({fallback})=>{localStorage.setItem('classroomos-canvas-bg',JSON.stringify({day:'lavalamp',lavalamp:'lavalamp'}));localStorage.setItem('classroomos-reduced-motion','off');localStorage.setItem('classroomos-lighting-mode','manual');if(fallback){const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:original.call(this,type,...args);};}}, {fallback});
  await page.goto('http://127.0.0.1:8080/');await page.waitForTimeout(1500);
  await page.evaluate(()=>{document.documentElement.dataset.theme='lavalamp';window.ClassroomOSCanvasBg.set('lavalamp');});
  for(const style of fallback?['emerald','vaporwave','mandelbrot']:['lavalamp','day','sakura','diamond','emerald','topaz','goldfish','cobblestone','bark','night','vaporwave','mandelbrot']){
   await page.evaluate(s=>{document.documentElement.dataset.theme=s;localStorage.setItem('classroomos-lava-style','aero');},style);await page.waitForTimeout(1200);
   const before=await page.evaluate(()=>document.querySelector('#site-canvas-bg,#hero-canvas').toDataURL());
   await page.screenshot({path:`${output}/${fallback?'fallback':style}.png`});await page.waitForTimeout(500);
   const after=await page.evaluate(()=>document.querySelector('#site-canvas-bg,#hero-canvas').toDataURL());
   if(before===after)throw Error('No pixel movement: '+style);
  }
  await page.locator('.nav-settings-toggle').click();
  await page.locator('[data-tab="background"], [data-settings-tab="background"]').first().count().then(async count=>{if(count)await page.locator('[data-tab="background"], [data-settings-tab="background"]').first().click();else await page.getByRole('tab',{name:'Background',exact:true}).click();});
  if(await page.locator('.nav-lava-styles').count())throw Error('Independent lamp style controls remain');
  await page.locator('.nav-settings-close').click();
  if(!fallback){
   const timing=await page.evaluate(()=>{const results=[];for(const hz of [60,120]){const renderer=window.ClassroomOSLava.create();const c=document.createElement('canvas');c.width=120;c.height=160;const ctx=c.getContext('2d');for(let i=0;i<=hz*2;i++)renderer.draw(ctx,120,160,i*1000/hz,{active:false});results.push(renderer.stats().steps);}return results;});
   if(Math.abs(timing[0]-timing[1])>1)throw Error('Refresh-dependent physics: '+timing);console.log('60/120Hz steps: '+timing);
  }
  const stats=await page.evaluate(()=>window.ClassroomOSCanvasBg.lavaStats());
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);await page.screenshot({path:`${output}/${fallback?'fallback':'mobile'}.png`});
  const resized=await page.evaluate(()=>window.ClassroomOSCanvasBg.lavaStats());
  if(!fallback&&Math.abs(stats.area-resized.area)>1)throw Error('Resize changed wax area');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('classroomos:reducedmotionchange',{detail:{reducedMotion:true}})));
  const paused=await page.evaluate(()=>window.ClassroomOSCanvasBg.lavaStats());await page.waitForTimeout(200);
  const still=await page.evaluate(()=>window.ClassroomOSCanvasBg.lavaStats());if(paused.steps!==still.steps)throw Error('Reduce motion did not pause');
  if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify({fallback,stats,resized}));await page.close();
 }
} finally {await browser.close();}
