// The way in for a first-time player: every instrument lesson must open its studio with a playable
// first tune, offer a working route at every level, and explain itself in plain words.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { load } from 'cheerio';

const root = path.resolve(import.meta.dirname, '..');
const LESSONS = { piano: 'piano', guitar: 'guitar', violin: 'violin-fingerboard', saxophone: 'saxophone', drums: 'drums' };
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const source = fs.readFileSync(path.join(root, 'assets/js/lessons/instrument-first-sound.js'), 'utf8');
const KITS = vm.runInNewContext(`(${source.slice(source.indexOf('var KITS = ') + 11, source.indexOf('var STORE = ')).trim().replace(/;$/, '')})`);
const page = id => load(fs.readFileSync(path.join(root, `lessons/music/instruments/${LESSONS[id]}.html`), 'utf8'));

test('every pathway instrument has a kit and a lesson', () => {
  assert.deepEqual(Object.keys(KITS).sort(), Object.keys(LESSONS).sort());
});

for (const [id, kit] of Object.entries(KITS)) {
  test(`${id}: the first tune only uses notes the instrument has`, () => {
    const notes = new Set(kit.notes.map(n => n.id));
    assert.ok(kit.song.seq.length >= 8);
    assert.equal(kit.song.beats.length, kit.song.seq.length);
    for (const note of kit.song.seq) assert.ok(notes.has(note), `${note} is not on the ${id}`);
  });

  test(`${id}: the panel opens the application, and sound is loaded`, () => {
    const $ = page(id);
    const app = $('main').first().children().first();
    assert.ok(app.is('[data-creation-app]'));
    assert.equal(app.children().first().attr('data-first-sound'), id);
    const scripts = $('script[src]').map((_, s) => $(s).attr('src')).get().join(' ');
    assert.match(scripts, /instrument-first-sound\.js/);
    assert.match(scripts, /audio-kit\.js/);
    assert.match(scripts, id === 'drums' ? /drum-engine\.js/ : /music-synth\.js/);
  });

  test(`${id}: every level has a route, and every link has a target`, () => {
    const $ = page(id);
    for (const level of LEVELS) {
      assert.ok(kit.routes[level].length >= 3, `${level} route is too short`);
      for (const [target] of kit.routes[level]) assert.equal($(`[id="${target}"]`).length, 1, `#${target} is missing`);
    }
  });

  test(`${id}: lesson sections speak plainly, and Set up speaks to every age`, () => {
    const $ = page(id);
    const boxes = $('.fs-plain');
    assert.ok(boxes.length >= 8);
    boxes.each((_, box) => {
      assert.ok(LEVELS.includes($(box).attr('data-level')));
      assert.equal($(box).closest('[data-creation-app]').length, 0, 'plain-words boxes belong to the lesson, not the studio');
      assert.match($(box).text(), /Try this:/);
    });
    assert.equal($('.fs-ages li').length, 3);
    assert.equal($('.fs-ages').closest('[data-stage="setup"]').length, 1);
    assert.doesNotMatch($('main').text(), /Grades? \d/, 'lessons are for all ages');
  });

  test(`${id}: every stage has a place in the lesson or a studio section to land on`, () => {
    const $ = page(id);
    for (const stage of ['meet', 'setup', 'read', 'build', 'play', 'check']) {
      assert.ok($(`[data-stage="${stage}"]`).length, `no ${stage} section`);
      assert.ok($(`[data-stage="${stage}"][data-stage-summary]`).length, `no summary for ${stage}`);
    }
  });
}
