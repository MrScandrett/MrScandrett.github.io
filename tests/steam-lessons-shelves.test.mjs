// The lesson library (steam-lessons.html) is how students find lessons. These checks keep
// it findable: every live lesson has a tile on some subject shelf, and a crowded chapter is
// split into topic groups (<p class="module-era-label">) instead of one long list.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { load } from 'cheerio';

const $ = load(fs.readFileSync('steam-lessons.html', 'utf8'));
const lessons = JSON.parse(fs.readFileSync('data/lessons.json', 'utf8')).lessons.filter((l) => l.status === 'live');
const MAX_UNGROUPED = 12;

// Walk each shelf in source order: a cluster label opens a chapter, tiles and topic labels follow.
const chapters = [];
$('.module-section').each((_, section) => {
  let chapter = null;
  $(section).find('.module-tile-grid').children().each((__, el) => {
    const node = $(el);
    if (node.hasClass('module-cluster-label')) {
      chapter = { module: section.attribs.id, title: node.find('strong').first().text().trim(), items: [] };
      chapters.push(chapter);
    } else if (chapter && node.is('a.tile')) {
      chapter.items.push({ tile: (node.attr('href') || '').split('#')[0] });
    } else if (chapter && node.hasClass('module-era-label')) {
      chapter.items.push({ group: node.text().trim() });
    }
  });
});

test('every live lesson has a tile on a subject shelf', () => {
  const onShelf = new Set();
  $('.module-section a.tile').each((_, a) => onShelf.add((a.attribs.href || '').split('#')[0]));
  const missing = lessons.filter((l) => !onShelf.has(l.url)).map((l) => `${l.title} (${l.url})`);
  assert.deepEqual(missing, [], 'Add a tile for each of these to a chapter in steam-lessons.html');
});

test(`a chapter with more than ${MAX_UNGROUPED} lessons is split into topic groups`, () => {
  for (const chapter of chapters) {
    const tiles = new Set(chapter.items.filter((i) => i.tile).map((i) => i.tile));
    const groups = chapter.items.filter((i) => i.group);
    if (tiles.size > MAX_UNGROUPED) {
      assert.ok(groups.length >= 2,
        `${chapter.module} › "${chapter.title}" lists ${tiles.size} lessons in one run: add <p class="module-era-label">Topic</p> groups`);
    }
  }
});

test('every topic group holds at least one lesson', () => {
  for (const chapter of chapters) {
    chapter.items.forEach((item, index) => {
      if (!item.group) return;
      const next = chapter.items[index + 1];
      assert.ok(next && next.tile, `${chapter.module} › "${chapter.title}": group "${item.group}" is empty`);
    });
  }
});

test('every live lesson and every chapter has one icon', () => {
  const graphemes = (s) => [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(s)].length;
  for (const lesson of lessons) {
    assert.ok(lesson.icon, `${lesson.id} needs an "icon" in data/lessons.json`);
    assert.equal(graphemes(lesson.icon), 1, `${lesson.id}: icon should be one emoji, got "${lesson.icon}"`);
  }
  $('.module-section .module-cluster-label').each((_, label) => {
    const icon = label.attribs['data-icon'];
    const title = $(label).find('strong').first().text().trim();
    assert.ok(icon && graphemes(icon) === 1, `chapter "${title}" needs one data-icon emoji`);
  });
});
