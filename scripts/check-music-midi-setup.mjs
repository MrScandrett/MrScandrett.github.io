// Run against node serve-local.js. Fake only the hardware; use the real studio/audio engine.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--disable-dev-shm-usage'] });
async function open(viewport, mode = 'connected') {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(mode => {
    window.midiRequests = 0;
    const device = { id: 'keyboard', name: 'Classroom USB Keys', type: 'input', state: 'connected', onmidimessage: null };
    const access = { inputs: new Map(mode === 'empty' ? [] : [[device.id, device]]), onstatechange: null };
    window.midiDevice = device;
    window.setMidiConnected = connected => {
      device.state = connected ? 'connected' : 'disconnected';
      if (connected) access.inputs.set(device.id, device); else access.inputs.delete(device.id);
      access.onstatechange?.({ port: device });
    };
    window.sendMidi = data => device.onmidimessage?.({ data, timeStamp: performance.now() });
    window.midiMode = mode;
    Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: mode === 'unsupported' ? undefined : async () => {
      window.midiRequests++;
      if (window.midiMode === 'denied') throw new DOMException('Denied', 'NotAllowedError');
      return access;
    } });
  }, mode);
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:8080/music-lab.html', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-channel]').waitFor();
  // Wait for the asynchronous project restore before performing edits.
  await page.waitForFunction(() => document.querySelector('[data-ref="status"]')?.textContent);
  return { page, context, errors };
}
const widths = [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 844, height: 390 }];
try {
  for (const viewport of widths) {
    const { page, context, errors } = await open(viewport);
    const connect = page.locator('[data-act="connect-midi"]');
    await connect.focus(); await connect.press('Enter');
    await page.waitForFunction(() => document.querySelector('[data-midi-status]').textContent.includes('Connected: Classroom USB Keys'));
    assert.equal(await page.locator('.daw-th[data-track]').count(), 3, 'connection reuses the empty Keys channel');
    assert.equal(await page.locator('[data-tr="arm"][aria-pressed="true"]').count(), 1);
    assert.equal(await page.locator('[data-ref="play"] [data-pitch="60"]').isVisible(), true);
    assert.equal(await connect.evaluate(node => node === document.activeElement), true, 'connection preserves keyboard focus');
    // The MIDI message must produce real audio, not merely a connected label.
    await page.evaluate(() => {
      window.midiAnalyser = AudioKit.context().createAnalyser();
      AudioKit.output().connect(window.midiAnalyser);
      sendMidi([0x90, 60, 100]);
    });
    await page.waitForFunction(() => {
      const samples = new Float32Array(midiAnalyser.fftSize); midiAnalyser.getFloatTimeDomainData(samples);
      return samples.some(value => Math.abs(value) > .0001);
    });
    await page.evaluate(() => sendMidi([0x80, 60, 0]));
    await page.evaluate(() => {
      window.disconnectReleases = 0;
      const release = MusicDaw.allNotesOff;
      MusicDaw.allNotesOff = () => { window.disconnectReleases++; release(); };
      setMidiConnected(false);
    });
    assert.match(await page.locator('[data-midi-status]').textContent(), /Plug in and turn on/);
    assert.equal(await page.evaluate(() => disconnectReleases), 1);
    await page.evaluate(() => setMidiConnected(true));
    assert.match(await page.locator('[data-midi-status]').textContent(), /Connected: Classroom USB Keys/);
    assert.equal(await page.evaluate(() => midiRequests), 1, 'hot-plug needs no new permission request');

    await page.locator('[data-quick-sound]').selectOption('strings');
    const add = page.locator('[data-act="play-instrument"]');
    await add.focus(); await add.press('Enter');
    assert.equal(await page.locator('.daw-th[data-track]').count(), 4);
    assert.equal(await page.locator('[data-tr="arm"][aria-pressed="true"]').getAttribute('aria-label'), 'Arm Strings for recording');
    assert.match(await page.locator('[data-midi-status]').textContent(), /Playing “Strings”/);
    assert.equal(await add.evaluate(node => node === document.activeElement), true);
    // Record hardware input into the newly added instrument without a manual arm action.
    await page.locator('.daw-settings > summary').click();
    await page.locator('[data-act="countin"]').click();
    await page.locator('.daw-settings > summary').click();
    await page.locator('.daw-transport [data-act="record"]').click();
    assert.equal(await add.isDisabled(), true);
    await page.evaluate(() => sendMidi([0x90, 67, 90]));
    await page.waitForTimeout(150);
    await page.evaluate(() => sendMidi([0x80, 67, 0]));
    await page.locator('[data-act="stop"]').click();
    assert.match(await page.locator('[data-ref="status"]').textContent(), /Recorded 1 note/);
    assert.equal(await add.isEnabled(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator('[data-act="studio"]').click();
    assert.equal(await connect.isVisible(), true, 'MIDI setup stays visible in full-screen studio');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `/tmp/music-midi-${viewport.width}.png`, animations: 'disabled' });
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`${viewport.width}×${viewport.height}: keyboard setup, audible MIDI, reconnect, add instrument and recording passed`);
  }
  for (const mode of ['empty', 'denied', 'unsupported']) {
    const { page, context, errors } = await open(widths[0], mode);
    await page.locator('[data-act="connect-midi"]').click();
    await page.waitForFunction(() => !document.querySelector('[data-act="connect-midi"]').disabled);
    const status = page.locator('[data-midi-status]');
    assert.match(await status.textContent(), mode === 'empty' ? /Plug in and turn on/ : mode === 'denied' ? /site permissions/ : /cannot connect MIDI|unavailable in this browser/);
    assert.equal(await page.evaluate(() => MusicDaw.noteOn(60, .8)), true, 'virtual instrument remains playable');
    await page.evaluate(() => MusicDaw.noteOff(60));
    if (mode !== 'unsupported') {
      await page.evaluate(() => { window.midiMode = 'connected'; setMidiConnected(true); });
      if (mode === 'denied') await page.locator('[data-act="connect-midi"]').click();
      await page.waitForFunction(() => document.querySelector('[data-midi-status]').textContent.includes('Connected:'));
      assert.equal(await page.locator('.daw-th[data-track]').count(), 3, 'retry does not duplicate the instrument');
    }
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`${mode}: useful feedback, playable fallback and recovery passed`);
  }
} finally { await browser.close(); }
