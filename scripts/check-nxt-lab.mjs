// Run with the local site server running on port 8080. Hardware is mocked; test a real brick separately.
import {chromium} from 'playwright';
import {findChromium} from '../lib/find-chromium.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:findChromium(),headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1050}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8080/lessons/engineering/robotics/nxt-robot-lab.html');await page.waitForSelector('#steps li');
assert.equal(await page.locator('#steps li').count(),3);
await page.getByRole('button',{name:'Full screen',exact:true}).click();
await page.waitForFunction(()=>!!document.fullscreenElement);
assert.equal(await page.getByRole('button',{name:'Exit full screen',exact:true}).isVisible(),true);
assert.equal(await page.evaluate(()=>document.querySelector('[data-creation-app]').scrollHeight<=innerHeight),true);
await page.getByRole('link',{name:'Lesson guide ↓'}).click();
await page.waitForFunction(()=>!document.fullscreenElement);
await page.locator('#run').scrollIntoViewIfNeeded();
await page.locator('#run').click();assert.equal(await page.locator('[data-port="B"]').evaluate(el=>el.classList.contains('port-active')),true);await page.waitForFunction(()=>document.querySelector('#progress').textContent.startsWith('Program complete'),{timeout:10000});assert.match(await page.locator('#pose').innerText(),/Simulated position/);
await page.selectOption('#starter','touch');await page.click('#load-starter');await page.click('#run');await page.check('#sim-touch');await page.waitForFunction(()=>document.querySelector('#progress').textContent.startsWith('Program complete'),{timeout:10000});
await page.uncheck('#sim-touch');await page.click('#run');await page.click('#stop');assert.match(await page.locator('#progress').innerText(),/Stopped/);assert.equal(await page.locator('#run').isEnabled(),true);assert.equal(await page.locator('#steps li').first().getByRole('button',{name:'Move up step 1'}).isDisabled(),true);
const download=page.waitForEvent('download');await page.click('#save');assert.equal((await download).suggestedFilename(),'my-nxt-project.json');
await page.locator('#open').setInputFiles({name:'test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:1,repeat:1,steps:[{type:'forward',value:90}]}))});await page.waitForFunction(()=>document.querySelector('#steps').children.length===1);
await page.reload();await page.waitForSelector('#steps li');assert.equal(await page.locator('#steps li').count(),1);
await page.locator('#open').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"version":1,"repeat":999,"steps":[]}')});await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Could not open'));
// Mock a stock-firmware USB brick at the transport boundary: handshake, sensor reply, motors and STOP.
await page.evaluate(()=>{
 window.sent=[];let pendingRead,packets=[];const respond=p=>{if(pendingRead){const r=pendingRead;pendingRead=null;r({status:'ok',data:new DataView(Uint8Array.from(p).buffer)});}else packets.push(p);};
 const device={opened:false,configuration:{interfaces:[{interfaceNumber:0,alternates:[{alternateSetting:0,endpoints:[{direction:'out',type:'bulk',endpointNumber:1},{direction:'in',type:'bulk',endpointNumber:2}]}]}]},open:async function(){this.opened=true;},claimInterface:async()=>{},selectAlternateInterface:async()=>{},transferIn:async()=>{if(packets.length)return{status:'ok',data:new DataView(Uint8Array.from(packets.shift()).buffer)};return new Promise(r=>pendingRead=r);},transferOut:async(ep,p)=>{window.sent.push([...p]);let r=[2,p[1],0];if(p[1]===11)r.push(32,28);if(p[1]===6){r=Array(25).fill(0);r[0]=2;r[1]=6;r[3]=p[2];}respond(r);return{status:'ok'};},close:async function(){this.opened=false;}};
 Object.defineProperty(navigator,'usb',{configurable:true,value:{requestDevice:async()=>device}});
});
await page.click('#connect-usb');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('7.20 V'));await page.click('#run');assert.match(await page.locator('#status').innerText(),/readiness/);await page.check('#ready');await page.click('#run');await page.waitForFunction(()=>document.querySelector('#progress').textContent.startsWith('Program complete'));
const sent=await page.evaluate(()=>window.sent);assert(sent.some(p=>p[1]===4&&p[2]===1&&p[3]===35));assert(sent.some(p=>p[1]===4&&p[2]===2&&p[3]===35));assert(sent.some(p=>p[1]===6));
await page.click('#disconnect');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Disconnected'));

await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
assert.deepEqual(errors,[]);await browser.close();console.log('Browser passed: simulator, touch, STOP, files, persistence, mock USB handshake/real-mode guard/motor feedback, mobile fit; no page errors.');
