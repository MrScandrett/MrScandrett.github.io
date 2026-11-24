import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'lessons/technical-elements/audio-engineering');

const LESSONS = [
  'cymatics.html',
  'live-audio-signal-chain.html',
  'microphone-polar-patterns.html',
  'room-acoustics.html',
  'eq-problem-frequency.html',
  'audio-compression.html',
  'audio-mixer-signal-flow.html',
  'recording-studio-sessions.html',
  'allen-heath-qu7-mixer.html',
  'live-sound-reinforcement.html',
  'wireless-mic-rf-coordination.html',
];

test('all 11 audio-engineering lessons satisfy Creation-App, a11y, lightbox, and zero inline script invariants', () => {
  for (const file of LESSONS) {
    const html = fs.readFileSync(path.join(DIR, file), 'utf8');
    assert.ok(/<main\b[^>]*id="main-content"/.test(html), `${file}: missing <main id="main-content">`);
    assert.ok(html.includes('data-creation-app'), `${file}: missing data-creation-app`);
    assert.ok(html.includes('data-creation-fit'), `${file}: missing data-creation-fit`);
    assert.ok(html.includes('data-creation-primary'), `${file}: missing data-creation-primary`);
    assert.ok(html.includes('creation-app.css'), `${file}: missing creation-app.css`);
    assert.ok(html.includes('creation-app.js'), `${file}: missing creation-app.js`);
    assert.ok(html.includes('photo-lightbox.js'), `${file}: missing photo-lightbox.js`);
    assert.ok(html.includes('lesson-print-button.js'), `${file}: missing lesson-print-button.js`);

    const inlineScripts = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)];
    assert.equal(inlineScripts.length, 0, `${file}: expected 0 inline <script> blocks, found ${inlineScripts.length}`);

    const figCount = (html.match(/data-zoomable/g) || []).length;
    if (figCount > 0) {
      assert.ok(html.includes('data-no-glossary'), `${file}: figures present without data-no-glossary credit protection`);
    }
  }
});

test('creation-app-pages.json registers all 11 audio-engineering lessons', () => {
  const reg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/creation-app-pages.json'), 'utf8'));
  const files = new Set(reg.map((e) => e.file));
  for (const file of LESSONS) {
    const rel = `lessons/technical-elements/audio-engineering/${file}`;
    assert.ok(files.has(rel), `${rel} missing from data/creation-app-pages.json`);
  }
});

test('cross-lesson anchor targets remain intact across upgraded HTML', () => {
  const checks = [
    ['microphone-polar-patterns.html', ['three-to-one', 'stereo-mics']],
    ['audio-compression.html', ['level-matching', 'controls-reference', 'serial-parallel']],
    ['eq-problem-frequency.html', ['eq-ladder']],
    ['recording-studio-sessions.html', ['paths', 'solo', 'patchbay', 'hearback', 'bit-depth', 'chop']],
    ['live-sound-reinforcement.html', ['ring-out', 'feedback', 'placement', 'inverse-square', 'hum-safety']],
  ];
  for (const [file, ids] of checks) {
    const html = fs.readFileSync(path.join(DIR, file), 'utf8');
    for (const id of ids) {
      assert.ok(new RegExp(`id="${id}"`).test(html), `${file}: missing inbound anchor id="${id}"`);
    }
  }
});

test('corrected Wikimedia credits exist on studio & Qu-7 lessons', () => {
  const studio = fs.readFileSync(path.join(DIR, 'recording-studio-sessions.html'), 'utf8');
  assert.ok(studio.includes('The Midnite Wolf'));
  assert.ok(studio.includes('Justin De La Ornellas'));
  assert.ok(!studio.includes('to Post-EQ'));

  const qu7 = fs.readFileSync(path.join(DIR, 'allen-heath-qu7-mixer.html'), 'utf8');
  assert.ok(qu7.includes('VK1LW'));
});
