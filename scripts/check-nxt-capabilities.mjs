// Run after starting node serve-local.js. Hardware and compiler are mocked separately in unit tests.
import {chromium} from 'playwright';import {findChromium} from '../lib/find-chromium.mjs';import assert from 'node:assert/strict';
const b=await chromium.launch({executablePath:findChromium(),headless:true});const page=await b.newPage({viewport:{width:1600,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8080/lessons/engineering/robotics/nxt-robot-lab.html');await page.waitForSelector('#steps li');
 await page.click('#mode-blocks');await page.waitForSelector('.blocklySvg');assert.match(await page.locator('#block-status').innerText(),/Ready/);
 const templates=await page.locator('#project-starter option').evaluateAll(options=>options.map(o=>o.value));assert.equal(templates.length,12);
 for(const key of templates){await page.selectOption('#project-starter',key);await page.click('#load-project');assert.match(await page.locator('#block-status').innerText(),/Ready/,key);assert.match(await page.locator('#code').innerText(),/task main\(\)/,key);}
 // Reset the four sensor ports after the extra-sensor remote project.
 await page.locator('#sensor-ports').evaluate(el=>el.closest('details').open=true);
 await page.selectOption('#port-touch2','0');await page.selectOption('#port-sound','2');
 await page.selectOption('#project-starter','measure');await page.click('#load-project');await page.click('#run');await page.waitForFunction(()=>document.querySelector('#progress').textContent.startsWith('Program complete'),{timeout:15000});
 await page.locator('#measurement-count').evaluate(el=>el.closest('details').open=true);
 assert.match(await page.locator('#measurement-count').innerText(),/1 samples/);assert.match(await page.locator('#measurements').innerText(),/SIMULATED.*distance_mm/);
 const csvDownload=page.waitForEvent('download');await page.locator('#download-csv').evaluate(el=>el.closest('details').open=true);await page.click('#download-csv');assert.equal((await csvDownload).suggestedFilename(),'nxt-measurements.csv');
 const file=page.waitForEvent('download');await page.click('#save');assert.equal((await file).suggestedFilename(),'my-nxt-blocks.json');
 const nxc=page.waitForEvent('download');await page.click('#export-nxc');assert.equal((await nxc).suggestedFilename(),'myrobot.nxc');
 await page.selectOption('#project-starter','music');await page.click('#load-project');await page.locator('#sim-sound').evaluate(el=>el.closest('details').open=true);await page.locator('#sim-sound').evaluate(el=>{el.value='80';el.dispatchEvent(new Event('input'));});await page.click('#run');await page.waitForFunction(()=>document.querySelector('#progress').textContent.startsWith('Program complete'),{timeout:10000});
 // Explicit loop timeout, followed by STOP while waiting.
 await page.selectOption('#project-starter','target');await page.click('#load-project');await page.click('#run');await page.click('#stop');assert.match(await page.locator('#progress').innerText(),/Stopped/);
 await page.getByRole('button',{name:'Full screen',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);assert.equal(await page.evaluate(()=>document.querySelector('[data-creation-app]').scrollHeight<=innerHeight),true);await page.getByRole('button',{name:'Exit full screen',exact:true}).click();
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);console.log('Capabilities browser passed: all project block roundtrips, NXC export, encoder calculation, notebook/CSV, music condition, STOP, fullscreen and mobile.');
}finally{await b.close();}
