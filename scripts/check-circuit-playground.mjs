// Browser regression checks for actual wiring and circuit measurements.
// Start node serve-local.js before running this check.
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:findChromium(),args:['--no-sandbox']});
try {
const page=await browser.newPage({viewport:{width:1400,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto((process.env.CIRCUIT_TEST_BASE_URL || 'http://localhost:8080') + '/lessons/engineering/arduino-and-electronics/ohms-law.html');
const host=page.locator('circuit-playground');await host.scrollIntoViewIfNeeded();await host.locator('[data-action="run"]').click();
const data=()=>host.evaluate(h=>({parts:h.parts,wires:h.wires,result:h.result}));
let d=await data();assert.ok(Math.abs(d.result.current-9/330.5)<1e-8);console.log('single: pass');
await host.locator('[data-example]').selectOption('1');await host.locator('[data-action="run"]').click();d=await data();assert.ok(Math.abs(d.result.current-12/320.5)<1e-8);assert.ok(Math.abs(d.result.values.p3.current-d.result.values.p6.current)<1e-8);console.log('series: pass');
await host.locator('[data-example]').selectOption('2');await host.locator('[data-action="run"]').click();d=await data();const loads=d.parts.filter(p=>p.type==='resistor');assert.ok(Math.abs(d.result.values[loads[0].id].voltage-d.result.values[loads[1].id].voltage)<1e-7);assert.ok(Math.abs(d.result.current-(d.result.values[loads[0].id].current+d.result.values[loads[1].id].current))<1e-7);console.log('parallel: pass');
await host.locator('[data-part="p2"]').click();await host.locator('[data-action="switch"]').click();d=await data();assert.ok(Math.abs(d.result.current)<1e-7);console.log('open switch: pass');
await host.locator('[data-action="clear"]').click();
await host.locator('[data-add="source"]').click();await host.locator('[data-add="resistor"]').click();await host.locator('[data-add="led"]').click();
async function wire(a,b){await host.locator(`[data-terminal="${a}"]`).click();await host.locator(`[data-terminal="${b}"]`).click();}
await wire('p1:0','p2:0');await wire('p2:1','p3:0');await wire('p3:1','p1:1');await host.locator('[data-action="run"]').click();d=await data();assert.ok(Math.abs(d.result.current-7/340.5)<1e-7);assert.equal(await host.locator('.is-lit').count(),1);console.log('wired LED: pass');
await host.locator('[data-mode="probe"]').click();await wire('p3:0','p3:1');assert.match(await host.locator('[data-probe-reading]').textContent(),/2\.206/);console.log('voltage probes: pass');
await host.locator('[data-action="save"]').click();await host.locator('[data-action="clear"]').click();await host.locator('[data-action="load"]').click();d=await data();assert.equal(d.wires.length,3);assert.equal(d.parts.length,3);console.log('save/load: pass');
await host.locator('[data-action="clear"]').click();await host.locator('[data-add="source"]').click();await host.locator('[data-add="resistor"]').click();await host.locator('[data-add="led"]').click();await host.locator('[data-mode="wire"]').click();await wire('p1:0','p2:0');await wire('p2:1','p3:1');await wire('p3:0','p1:1');await host.locator('[data-action="run"]').click();d=await data();assert.ok(Math.abs(d.result.current)<1e-7);assert.equal(await host.locator('.is-lit').count(),0);console.log('reversed LED: pass');
await wire('p1:0','p1:1');d=await data();assert.equal(d.result.short,true);assert.equal(d.result.current,18);console.log('short: pass');
await host.locator('[data-action="undo"]').click();d=await data();assert.equal(d.wires.length,3);console.log('undo: pass');
await host.locator('[data-part="p2"]').focus();await page.keyboard.press('Enter');assert.equal(await host.locator('[data-action="delete"]').count(),1);await host.locator('[data-terminal="p2:0"]').focus();await page.keyboard.press('Enter');assert.equal(await host.evaluate(h=>h.pending),'p2:0');await page.keyboard.press('Escape');assert.equal(await host.evaluate(h=>h.pending),null);console.log('keyboard: pass');
await host.locator('[data-part="p2"]').click();await host.locator('[data-action="rotate"]').click();assert.equal((await data()).parts[1].vertical,true);console.log('rotate: pass');

await page.setViewportSize({width:390,height:844});await host.scrollIntoViewIfNeeded();await host.locator('[data-action="run"]').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));console.log('mobile overflow: pass');
console.log('page errors:',errors);assert.equal(errors.length,0);} finally { await browser.close(); }
