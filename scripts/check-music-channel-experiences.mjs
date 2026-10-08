import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--disable-dev-shm-usage', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
try {
 for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width !== 1440 });
  await context.grantPermissions(['microphone']);
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:8080/music-lab.html', { waitUntil: 'domcontentloaded' });
  const rack = page.locator('#trackStudio'); await rack.locator('[data-channel]').waitFor();
  const reveal=async sel=>{const d=rack.locator(sel).first();if(await d.getAttribute('open')===null)await d.locator(':scope > summary').click();};const conceal=async sel=>{const d=rack.locator(sel).first();if(await d.getAttribute('open')!==null)await d.locator(':scope > summary').click();};
  const addTool=async id=>{const catalog=rack.locator('.daw-experience-catalog');if(await catalog.getAttribute('open')===null)await catalog.locator('summary').click();await rack.locator(`[data-tool-add="${id}"]`).click();};
  assert.equal(await page.locator('.pillar-theory, .pillar-science, .pillar-studio, #seqGrid, #labHud').count(), 0);
  assert.equal(await rack.locator('[data-experience]').count(), 0);
  assert.equal(await page.evaluate(() => window.MusicDaw.noteOn(60, .8)), false);
  await addTool('keyboard');
  assert.equal(await rack.locator('[data-experience="keyboard"]').count(), 1);
  await reveal('.daw-settings'); await rack.locator('[data-act="countin"]').click(); await conceal('.daw-settings');
  await rack.locator('[data-act="record"]').first().click();
  const pianoKey = rack.locator('[data-experience-note="60"]');
  if (viewport.width !== 1440) await pianoKey.tap(); else { await pianoKey.focus(); await pianoKey.press('Enter'); }
  await page.waitForTimeout(200); await rack.locator('[data-act="stop"]').click();
  assert.match(await rack.locator('[data-ref="status"]').textContent(), /Recorded 1 note/);
  await addTool('guitar');
  assert.equal(await rack.locator('[data-experience="keyboard"]').count(), 0);
  assert.equal(await rack.locator('[data-experience="guitar"]').count(), 1);
  await rack.locator('[data-experience="guitar"] [data-experience-note="64"]').first().focus();
  await rack.locator('[data-experience="guitar"] [data-experience-note="64"]').first().press('Enter');
  await rack.locator('[aria-label="Guitar fret bank"]').selectOption('12');assert.equal(await rack.locator('[data-experience="guitar"] [data-experience-note="76"]').count(),1);
  await rack.locator('[aria-label="Guitar fret bank"]').selectOption('0');
  await addTool('synthlab');
  await rack.locator('[aria-label="Oscillator waveform"]').selectOption('triangle');
  await rack.getByRole('button',{name:'Oscillator → VCA',exact:true}).click();assert.equal(await rack.getByRole('button',{name:'Oscillator → VCA',exact:true}).getAttribute('aria-pressed'),'false');
  await rack.getByRole('button',{name:'Oscillator → VCA',exact:true}).click();
  await rack.locator('[data-experience-param="attack"]').fill('0.2'); await rack.locator('[data-experience-param="attack"]').press('Tab');
  assert.equal(await rack.locator('[data-experience-param="attack"]').inputValue(), '0.2');
  await addTool('harmony');
  await rack.locator('[data-act="record"]').first().click();
  assert.equal(await rack.locator('[data-experience-param="attack"]').isDisabled(), true);
  await page.evaluate(()=>{const original=window.MusicSynth.startVoice;window.MusicSynth.startVoice=(...args)=>{window.lastSynthSettings=args[7];return original(...args);};});
  await rack.getByRole('button', { name: 'Play chord', exact: true }).click();
  assert.equal(await page.evaluate(()=>window.lastSynthSettings.attack),.2);assert.equal(await page.evaluate(()=>window.lastSynthSettings.wave),'triangle');
  await page.waitForTimeout(700); await rack.locator('[data-act="stop"]').click();
  assert.match(await rack.locator('[data-ref="status"]').textContent(), /Recorded 3 notes/);
  await addTool('theory');
  await page.evaluate(()=>{window.scaleHits=0;const original=window.MusicSynth.startVoice;window.MusicSynth.startVoice=(...args)=>{window.scaleHits++;return original(...args);};});
  await rack.getByRole('button', { name: 'Play scale up', exact: true }).click();
  await rack.locator('[data-tab="mix"]').click();const hitsAtNavigation=await page.evaluate(()=>window.scaleHits);await page.waitForTimeout(400);
  assert.equal(await page.evaluate(()=>window.scaleHits),hitsAtNavigation);
  await rack.locator('[data-tab="tools"]').click();
  await rack.locator('[data-channel]').selectOption({ label: 'Drums' });
  assert.equal(await rack.locator('[data-experience]').count(), 0);
  await addTool('drumkit');
  await rack.locator('[aria-label="Overall drumkit"]').selectOption('electronic');
  await rack.locator('.drum-studio [aria-label="Tune"]').evaluate(node=>{node.value='9';node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));});
  await addTool('rhythm');
  await rack.locator('[data-step="0"][data-step-pitch="36"]').click();
  await rack.locator('[data-channel-arm]').click();
  await rack.locator('[data-act="record"]').first().click();
  const pad = rack.locator('[data-experience="drumkit"] [data-experience-note="36"]');
  await pad.focus(); await pad.press('Enter'); await page.waitForTimeout(150); await rack.locator('[data-act="stop"]').click();
  assert.match(await rack.locator('[data-ref="status"]').textContent(), /Recorded 1 note/);
  const saving = page.waitForEvent('download'); await reveal('.daw-channel-options');await rack.locator('[data-channel-preset="save"]').click();
  const preset = await saving; await preset.saveAs('/tmp/channel-experience-preset.json');
  const json = JSON.parse(await readFile('/tmp/channel-experience-preset.json', 'utf8'));
  assert.equal(json.drumState.kit, 'electronic'); assert.equal(json.drumState.lanes.kick.tune, 9);
  await rack.locator('[data-act="quick-instrument"]').click();
  await addTool('drumkit');
  assert.equal(await rack.locator('[aria-label="Overall drumkit"]').inputValue(), 'studio');
  assert.equal(await rack.locator('.drum-studio [aria-label="Tune"]').inputValue(), '0');
  await reveal('.daw-channel-options');await rack.locator('[data-channel-preset="load"]').click();
  await rack.locator('[aria-label="Load Music Lab channel preset"]').setInputFiles('/tmp/channel-experience-preset.json');
  await page.waitForFunction(() => document.querySelector('[data-ref="status"]').textContent.includes('Loaded preset'));
  assert.equal(await rack.locator('[aria-label="Overall drumkit"]').inputValue(), 'electronic');
  assert.equal(await rack.locator('.drum-studio [aria-label="Tune"]').inputValue(), '9');
  await rack.locator('[data-channel]').selectOption({ label: 'Keys' });
  assert.equal(await rack.locator('[aria-label="Oscillator waveform"]').inputValue(), 'triangle');
  assert.equal(await rack.locator('[data-experience-param="attack"]').inputValue(), '0.2');
  if(viewport.width===1440){
    const exporting=page.waitForEvent('download');await reveal('.daw-file-tools');await rack.locator('[data-menu="export"]').click();await rack.locator('[data-act="export-mix"]').click();const wav=await exporting;await wav.saveAs('/tmp/channel-experience-mix.wav');const bytes=await readFile('/tmp/channel-experience-mix.wav');assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.ok(bytes.subarray(44).some(value=>value!==0));assert.equal(await page.evaluate(()=>window.lastSynthSettings.wave),'triangle');
  }
  await rack.locator('[data-tool-remove="harmony"]').click(); await rack.locator('[data-tool-remove="theory"]').click();
  await rack.locator('[data-act="studio"]').click();
  await page.screenshot({ path: `/tmp/music-channel-experiences-${viewport.width}.png`, animations: 'disabled' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log(`${viewport.width}×${viewport.height}: opt-in modules, channel isolation, recording, preset transfer, cancellation, layout passed`);
  await context.close();
 }
 // Verify lesson counterparts call the same audio building blocks.
 for (const instrument of ['piano', 'guitar']) {
  const page = await browser.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://localhost:8080/lessons/music/${instrument}.html`, { waitUntil: 'domcontentloaded' });
  const sharedCalls = await page.evaluate(name => {
    let calls=0; const key=name==='piano'?'pianoSources':'pluckBuffer',original=window.LessonInstrumentEngines[key];
    window.LessonInstrumentEngines[key]=(...args)=>{calls++;return original(...args);};
    if(name==='piano'){window.PianoAudio.tone(440,{duration:.1});window.PianoAudio.stop();}
    else{window.GuitarAudio.pluck(440,{duration:.1});window.GuitarAudio.stop();}
    return calls;
  },instrument);
  assert.equal(sharedCalls,1);assert.deepEqual(errors,[]);console.log(`${instrument}: shared lesson/channel engine passed`);await page.close();
 }
} finally { await browser.close(); }
