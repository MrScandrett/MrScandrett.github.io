import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SOURCE = fs.readFileSync('assets/js/page-modules.js', 'utf8');

function loadModules(extra = {}) {
  const win = { navigator: { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/130' }, location: { search: '' }, ...extra };
  vm.runInNewContext(SOURCE, { window: win, globalThis: win, URL });
  return win.ClassroomOSPageModules;
}

const PM = loadModules();
const none = { has: () => false, vrWanted: false };
// Arrays made inside the vm sandbox have its Array prototype; copy into this realm.
const ids = (steps) => Array.from(steps, (s) => s.id);

test('every listed script exists in assets/js', () => {
  for (const [id, mod] of Object.entries(PM.MODULES)) {
    if (mod.kind === 'service-worker') continue;
    assert.ok(fs.existsSync(`assets/js/${mod.file}`), `${id}: assets/js/${mod.file} is missing`);
    assert.ok(mod.why, `${id} needs a "why"`);
  }
});

test('every host step names a known module and a known timing', () => {
  for (const [host, steps] of Object.entries(PM.HOSTS)) {
    for (const [id, when] of steps) {
      assert.ok(PM.MODULES[id], `${host}: unknown module ${id}`);
      assert.ok(['now', 'parsed', 'idle'].includes(when), `${host}/${id}: bad timing ${when}`);
    }
    for (const mod of Object.values(PM.MODULES)) {
      for (const extra of mod.with || []) assert.ok(PM.MODULES[extra], `unknown "with" module ${extra}`);
    }
  }
});

test('a plain lesson loads the always-on helpers, nothing conditional', () => {
  assert.deepEqual(ids(PM.plan('lesson', none)), [
    'contrast-guard', 'visitor-memory', 'service-worker', 'lesson-related', 'lesson-exhibits', 'site-glossary'
  ]);
  // contrast guard and My Stuff are on the page straight away, as before the refactor
  const when = Object.fromEntries(PM.plan('lesson', none).map((s) => [s.id, s.when]));
  assert.equal(when['contrast-guard'], 'now');
  assert.equal(when['visitor-memory'], 'now');
  assert.equal(when['site-glossary'], 'parsed');
});

test('engines load only when the page has their markup', () => {
  const page = (sel) => ({ has: (q) => q.split(',').map((s) => s.trim()).includes(sel), vrWanted: false });
  assert.ok(ids(PM.plan('lesson', page('[data-timeline]'))).includes('timeline'));
  assert.ok(ids(PM.plan('lesson', page('canvas'))).includes('sim-present'));
  const tree = ids(PM.plan('lesson', page('[data-family-tree]')));
  assert.ok(tree.includes('family-tree') && tree.includes('photo-lightbox'), 'family tree brings the lightbox');
  assert.ok(!ids(PM.plan('lesson', none)).includes('timeline'));
});

test('VR mode is planned only for headsets', () => {
  assert.ok(!ids(PM.plan('site', none)).includes('vr-mode'));
  assert.ok(ids(PM.plan('site', { ...none, vrWanted: true })).includes('vr-mode'));
});

test('vrModeWanted: saved pref, ?vr=, headset browsers, Vision Pro', () => {
  const laptop = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Safari/605', maxTouchPoints: 0 };
  assert.equal(PM.vrModeWanted({ navigator: laptop, search: '', pref: null }), false);
  assert.equal(PM.vrModeWanted({ navigator: laptop, search: '', pref: 'on' }), true);
  assert.equal(PM.vrModeWanted({ navigator: laptop, search: '?vr=on', pref: null }), true);
  assert.equal(PM.vrModeWanted({ navigator: { userAgent: 'Mozilla/5.0 (X11; Linux x86_64; Quest 3) OculusBrowser/35.0' }, search: '', pref: null }), true);
  assert.equal(PM.vrModeWanted({ navigator: { ...laptop, xr: {}, maxTouchPoints: 5 }, search: '', pref: null }), true);
});

test('the headset test matches vr-mode.js', () => {
  const pattern = /OculusBrowser\|\\bQuest\\b\|PicoBrowser\|\\bPico\\b\|Wolvic\|Firefox Reality\|MagicLeap\|\\bVR Safari\\b/;
  assert.match(SOURCE, pattern);
  assert.match(fs.readFileSync('assets/js/vr-mode.js', 'utf8'), pattern,
    'vr-mode.js changed its headset test: update VR_UA in page-modules.js to match');
});

test('hosts load helpers through the table, not their own script tags', () => {
  const hosts = ['assets/js/lesson-print-button.js', 'assets/js/nav-mobile.js', 'assets/js/ui.js'];
  const files = Object.values(PM.MODULES).map((m) => m.file).filter(Boolean);
  for (const host of hosts) {
    const src = fs.readFileSync(host, 'utf8');
    for (const file of files) {
      const re = new RegExp(`['"\`](\\./)?${file.replace('.', '\\.')}['"\`]`);
      assert.doesNotMatch(src, re, `${host} loads ${file} itself; add it to a host in page-modules.js instead`);
    }
    assert.doesNotMatch(src, /function vrModeWanted|OculusBrowser/, `${host} has its own copy of the headset test`);
  }
});

test('build-dist inlines the table into both script hosts', () => {
  const build = fs.readFileSync('scripts/build-dist.mjs', 'utf8');
  assert.match(build, /await inlinePageModules\(\);\s*\n\s*await minifyJsFiles\(\);/);
  for (const host of ['lesson-print-button.js', 'nav-mobile.js']) assert.ok(build.includes(`assets/js/${host}`));
});

test('defining it twice keeps the first copy (both hosts inline it in dist)', () => {
  const win = { navigator: {}, location: { search: '' } };
  vm.runInNewContext(SOURCE, { window: win, globalThis: win, URL });
  const first = win.ClassroomOSPageModules;
  vm.runInNewContext(SOURCE, { window: win, globalThis: win, URL });
  assert.equal(win.ClassroomOSPageModules, first);
});
