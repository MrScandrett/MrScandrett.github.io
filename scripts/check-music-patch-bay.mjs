import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
const browser = await chromium.launch({ executablePath: findChromium(['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']) || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
 const page = await browser.newPage();
 const errors = []; page.on('pageerror', e => errors.push(e.message));
 await page.goto('http://127.0.0.1:8080/music-lab.html');
 await page.waitForSelector('.pb-jack');
 const id = await page.evaluate(() => MusicDaw.patchState().tracks[0].id);
 const output = page.locator(`.pb-jack[data-direction="out"][data-id="${id}"]`);
 await output.click();
 await page.locator('.pb-jack[data-direction="in"][data-id="aux0"]').click();
 assert.equal(await page.evaluate(() => MusicDaw.patchState().tracks[0].sends[0]), .25);
 await page.getByRole('button', {name:/Unplug .* → FX A/}).first().click();
 assert.equal(await page.evaluate(() => MusicDaw.patchState().tracks[0].sends[0]), 0);
 await page.getByRole('button', {name:/Unplug .*Main mix/}).first().click();
 assert.equal(await page.evaluate(() => MusicDaw.patchState().tracks[0].main), false);
 await page.waitForTimeout(1800);
 await page.reload(); await page.waitForSelector('.pb-jack');
 assert.equal(await page.evaluate(() => MusicDaw.patchState().tracks[0].main), false);
 await page.locator('[data-normal]').first().click();
 assert.equal(await page.evaluate(() => MusicDaw.patchState().tracks[0].main), true);
 const catalog = page.locator('.daw-experience-catalog');
 if (await catalog.getAttribute('open') === null) await catalog.locator('summary').click();
 await page.locator('[data-tool-add="keyboard"]').click();
 await page.locator('.pb-jack[data-id="midi"]').click();
 await page.locator(`.pb-jack[data-direction="in"][data-id="${id}"]`).click();
 assert.equal(await page.evaluate(() => MusicDaw.patchState().tracks[0].armed), true);
 await page.getByRole('button', {name:/Unplug MIDI →/}).click();
 assert.equal(await page.evaluate(() => MusicDaw.patchState().tracks[0].armed), false);
 await page.locator('.pb-jack[data-id="midi"]').click();
 await page.locator('.pb-jack[data-id="main"]').click();
 assert.match(await page.locator('.pb-status').textContent(), /Incompatible/);

 await page.keyboard.press('Escape');
 const from = await page.locator(`.pb-jack[data-direction="out"][data-id="${id}"] .pb-socket`).boundingBox();
 const to = await page.locator('.pb-jack[data-direction="in"][data-id="aux1"] .pb-socket').boundingBox();
 await page.mouse.move(from.x+from.width/2,from.y+from.height/2);
 await page.mouse.down();
 await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:12});
 assert.equal(await page.locator('.pb-draft').count(),1);
 await page.mouse.up();
 assert.equal(await page.evaluate(() => MusicDaw.patchState().tracks[0].sends[1]), .25);
 // Patch a real channel insert through two outboard processors and reject feedback.
 const patch = async (from,to) => {
   await page.locator(`.pb-jack[data-direction="out"][data-id="${from}"]`).click();
   await page.locator(`.pb-jack[data-direction="in"][data-id="${to}"]`).click();
 };
 assert.equal(await page.locator('[data-bank="processors"] .pb-device').count(),await page.evaluate(() => Object.keys(AudioEffects.registry).length));
 await patch(id+'@send','fx:compressor');
 await patch('fx:compressor','fx:eq');
 await patch('fx:eq',id+'@return');
 assert.equal(await page.evaluate(() => MusicDaw.patchState().connections.length),3);
 await patch('fx:eq','fx:compressor');
 assert.match(await page.locator('.pb-status').textContent(), /Feedback/);
 const settings = page.locator('[data-device-settings="eq"]');
 await settings.locator('summary').click();
 await settings.locator('[data-pb-param="gain"]').fill('-9');
 await settings.locator('[data-pb-param="gain"]').press('Tab');
 assert.equal(await page.evaluate(() => MusicDaw.patchState().devices.find(d => d.type === 'eq').params.gain),-9);
 await page.waitForTimeout(1800);
 await page.reload(); await page.waitForSelector('.pb-jack');
 assert.equal(await page.evaluate(() => MusicDaw.patchState().connections.length),3);
 assert.equal(await page.evaluate(() => MusicDaw.patchState().devices.find(d => d.type === 'eq').params.gain),-9);
 const options = page.locator('.daw-channel-options');
 if (await options.getAttribute('open') === null) await options.locator('summary').click();
 await page.locator('[data-channel-open="fx"]').click();
 await page.locator('[data-ref="effects"] [data-fx-pick]').selectOption('eq');
 await page.locator('[data-fx-add-picked]').click();
 assert.equal(await page.locator(`.pb-jack[data-id="${id}@fx0-in"]`).count(),1);
 await patch('fx:eq',id+'@fx0-in');
 assert.equal(await page.evaluate(() => MusicDaw.patchState().connections.some(e => e.to.endsWith('@fx0-in'))),true);
 // Test the same routing engine with real Web Audio nodes and measured PCM.
 const measurements = await page.evaluate(async () => {
   async function render(gain, mode) {
     const c = new OfflineAudioContext(2,24000,48000);
     const master = c.createGain(), monitor = c.createGain(), monitorNormal = c.createGain();
     master.connect(monitorNormal); monitorNormal.connect(monitor); monitor.connect(c.destination);
     const returns = [0,1].map(() => ({input:c.createGain(),out:c.createGain(),normal:c.createGain()}));
     returns.forEach(r => {r.out.connect(r.normal);r.normal.connect(master);});
     const input = c.createGain(), send = c.createGain(), inserts = c.createGain(), insertNormal = c.createGain(), pan = c.createGain();
     input.connect(send); send.connect(insertNormal); insertNormal.connect(inserts); pan.connect(master);
     const track = {id:'test',effects:mode === 'slot' ? [{type:'eq',params:{frequency:1000,gain:0,Q:1},wet:1}] : [],sends:[0,0]};
     const chain = MusicDawPlugins.createChain(c,inserts,track.effects,AudioEffects.registry,AudioEffects.parameters,{isPatched:()=>mode === 'slot'});
     chain.output.connect(pan);
     const strip = {input,eq:{output:send},inserts,insertNormal,pan,effectPorts:chain.ports};
     const connections = mode === 'slot' ? [{from:'test@send',to:'fx:eq'},{from:'fx:eq',to:'test@fx0-in'}] : mode === 'insert' ? [{from:'test@send',to:'fx:eq'},{from:'fx:eq',to:'test@return'}] : [{from:'mixout',to:'fx:eq'},{from:'fx:eq',to:'monitor'}];
     monitorNormal.gain.value = mode === 'master' ? 0 : 1;
     insertNormal.gain.value = mode === 'insert' ? 0 : 1;
     const router = MusicPatchRouting.create(c,{master,monitor,monitorNormal,returns,strip:()=>strip,registry:AudioEffects.registry,parameters:AudioEffects.parameters});
     router.sync({tracks:[track],patchConnections:connections,patchParameters:{eq:{frequency:1000,gain,Q:1}}});
     const oscillator = c.createOscillator(); oscillator.frequency.value=1000;
     oscillator.connect(input); oscillator.start(); oscillator.stop(.5);
     const data = (await c.startRendering()).getChannelData(0);
     let sum = 0; for(let i=12000;i<data.length;i++) sum += data[i]*data[i];
     router.dispose(); return Math.sqrt(sum/(data.length-12000));
   }
   const unity = await render(0,'master'), cut = await render(-18,'master'), insert = await render(-18,'insert'), slot = await render(-18,'slot');
   // Every catalog unit can instantiate on a browser audio context and clean up.
   const context = new OfflineAudioContext(2,128,48000), failures=[];
   for (const [type,def] of Object.entries(AudioEffects.registry)) {
     try { const fx=def.create(context,AudioEffects.parameters(type)); if(!fx.input || !fx.output) throw Error('missing audio ports'); fx.dispose?.(); }
     catch(e) { failures.push(type+': '+e.message); }
   }
   return {unity,cut,insert,slot,failures};
 });
 assert.deepEqual(measurements.failures,[]);
 assert(measurements.unity > .6, JSON.stringify(measurements));
 assert(measurements.cut / measurements.unity < .14, JSON.stringify(measurements));
 assert(Math.abs(measurements.insert-measurements.cut) < .002, JSON.stringify(measurements));
 assert(Math.abs(measurements.slot-measurements.cut) < .002, JSON.stringify(measurements));
 await page.locator('.pb-expand').click();
 await page.waitForFunction(() => document.fullscreenElement?.id === 'musicPatchBay');
 await page.evaluate(() => document.exitFullscreen());
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('.pb-rack').screenshot({path:'/tmp/music-patch-bay-studio.png'});
 for (const width of [1440,768,390]) {
   await page.setViewportSize({width,height:900});
   await page.locator('#musicPatchBay').scrollIntoViewIfNeeded();
   assert(await page.locator('#musicPatchBay').evaluate(el => el.scrollWidth <= el.clientWidth+1), `patch bay overflow at ${width}`);
   const svg = page.locator('.pb-wires'); assert(await svg.locator('path').count() > 0);
 }
 await page.screenshot({path:'/tmp/music-patch-bay.png', fullPage:false});
 await page.goto('http://127.0.0.1:8080/lessons/technical-elements/audio-engineering/allen-heath-qu7-mixer.html');
 await page.waitForFunction(() => !!window.MusicDaw?.patchState);
 assert.equal(await page.evaluate(() => typeof MusicPatchRouting.create),'function');
 assert.deepEqual(errors, []);
 console.log('Patch bay browser checks passed: catalog ports, channel/master DSP, serial routing, feedback rejection, saved settings, dragging, and responsive fit.', measurements);
} finally { await browser.close(); }
