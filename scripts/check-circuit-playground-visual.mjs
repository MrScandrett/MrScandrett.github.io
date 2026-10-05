import {chromium} from 'playwright';
import {findChromium} from '../lib/find-chromium.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:findChromium(),args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
await page.addInitScript(()=>document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='*{scroll-behavior:auto!important}';document.head.append(s);}));
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const paths=['engineering/arduino-and-electronics/ohms-law','engineering/arduino-and-electronics/electronic-schematics','engineering/arduino-and-electronics/electronic-components','engineering/arduino-and-electronics/breadboard-basics','engineering/arduino-and-electronics/soldering','physics/electricity-and-magnetism/ac-vs-dc','mathematics/foundations/measuring-length'];
try{
for(const path of paths){await page.goto('http://localhost:8080/lessons/'+path+'.html');const h=page.locator('circuit-playground');await h.scrollIntoViewIfNeeded();assert.equal(await h.locator('[data-add] svg').count(),6);await h.locator('[data-action="view"]').click();assert.equal(await h.locator('.is-schematic').count(),1);await h.locator('[data-action="view"]').click();await h.locator('[data-action="run"]').click();assert.ok(await h.evaluate(h=>h.result.current>0));await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.setViewportSize({width:1440,height:1100});console.log(path+': shared graphics, views, running, mobile passed');}
await page.goto('http://localhost:8080/lessons/'+paths[0]+'.html');const h=page.locator('circuit-playground');await h.scrollIntoViewIfNeeded();await h.locator('[data-add="led"]').click();await h.locator('[data-add="load"]').click();await h.locator('[data-add="diode"]').click();await h.locator('[data-action="run"]').click();await h.locator('.cp-builder-board').screenshot({path:'/tmp/circuit-physical.png'});
await h.locator('[data-action="view"]').click();await h.locator('.cp-builder-board').screenshot({path:'/tmp/circuit-schematic.png'});await h.locator('[data-action="view"]').click();
await h.locator('[data-wire]').first().focus();await page.keyboard.press('Enter');await h.locator('[data-wire-color]').selectOption('#c53c35');await h.locator('[data-bend]').evaluate(e=>e.value='300');await h.locator('[data-bend]').dispatchEvent('change');assert.equal(await h.evaluate(h=>h.wires[0].color),'#c53c35');assert.equal(await h.evaluate(h=>h.wires[0].bend),300);
const part=h.locator('[data-part="p3"]');const box=await part.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2-60,box.y+box.height/2+80,{steps:8});await page.mouse.up();assert.notEqual(await h.evaluate(h=>h.parts.find(p=>p.id==='p3').y),100);
await page.setViewportSize({width:390,height:844});await h.locator('.cp-builder-board').screenshot({path:'/tmp/circuit-mobile.png'});assert.equal(errors.length,0);console.log('Wire color, routing, pointer drag, no page errors: passed');
}finally{await browser.close();}
