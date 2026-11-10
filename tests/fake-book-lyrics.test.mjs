import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const L = require('../assets/js/lessons/fake-book-lyrics.js');
const MX = require('../assets/js/lessons/fake-book-musicxml.js');
const { tunes } = JSON.parse(readFileSync(new URL('../data/fake-book.json', import.meta.url), 'utf8'));
const byId = Object.fromEntries(tunes.map((t) => [t.id, t]));

function syllablesOf(verse) {
  return Object.keys(verse.bySrc)
    .map(Number)
    .sort((a, b) => a - b)
    .map((k) => verse.bySrc[k])
    .filter((s) => s && s.text);
}

test('FakeBookLyrics aligns syllables, hyphens, melismas, skips, elisions and tied barlines', () => {
  const events = L.melodyEvents('D4q | G4h B4e G4e | B4h A4q | G4h~ | G4q r4q r4q');
  assert.equal(events.bars, 5, 'trailing bar of a tied note still counts as a bar');
  const pitched = events.filter((e) => e.sung);
  assert.equal(pitched.length, 7);

  const v = L.alignVerse(events, 'A- | maz- ing _ | grace! ~How | sweet |');
  assert.deepEqual(v.errors, []);
  assert.equal(v.bySrc[0].text, 'A');
  assert.equal(v.bySrc[0].hyphen, true);
  assert.equal(v.bySrc[1].text, 'maz');
  assert.equal(v.bySrc[1].hyphen, true);
  assert.equal(v.bySrc[2].text, 'ing');
  assert.equal(v.bySrc[2].hyphen, false);
  assert.deepEqual(v.bySrc[2].extendsTo, [3], 'underscore extends the syllable across the next note');
  assert.deepEqual(v.bySrc[3], { extend: true, from: 2 });
  assert.equal(v.bySrc[4].text, 'grace!');
  assert.equal(v.bySrc[5].text, '‿How', 'tilde becomes an undertie elision');
  assert.equal(v.bySrc[6].text, 'sweet');
});

test('FakeBookLyrics reports bar mismatches, note count mismatches and orphan underscores', () => {
  const events = L.melodyEvents('C4q D4q E4q F4q | G4w');
  const wrongBars = L.alignVerse(events, 'one two three four');
  assert.equal(wrongBars.errors.length, 1);
  assert.match(wrongBars.errors[0], /bars/);

  const wrongNotes = L.alignVerse(events, 'one two | three');
  assert.equal(wrongNotes.errors.length, 1);
  assert.match(wrongNotes.errors[0], /2 syllables for 4 notes/);

  const orphan = L.alignVerse(events, '_ two three four | five');
  assert.equal(orphan.errors.length, 1);
  assert.match(orphan.errors[0], /"_"/);

  const afterStar = L.alignVerse(events, '* _ three four | five');
  assert.equal(afterStar.errors.length, 1);
  assert.match(afterStar.errors[0], /"_"/);
});

test('every vocal tune in data/fake-book.json aligns cleanly to its melody onsets', () => {
  const vocal = tunes.filter((t) => t.lyrics);
  assert.ok(vocal.length >= 75, `expected at least 75 vocal tunes, got ${vocal.length}`);

  for (const raw of vocal) {
    const parsed = L.forTune(raw);
    assert.ok(parsed, `${raw.id}: parsed lyrics`);
    assert.deepEqual(parsed.errors, [], `${raw.id}: alignment errors`);
    assert.ok(parsed.verses.length >= 1, `${raw.id}: at least one verse`);

    const events = L.melodyEvents(raw.melody);
    for (const v of parsed.verses) {
      const srcs = Object.keys(v.bySrc).map(Number);
      assert.ok(srcs.length > 0, `${raw.id} verse ${v.mark}: has syllables`);
      for (const src of srcs) {
        const syl = v.bySrc[src];
        assert.ok(events[src] && events[src].sung, `${raw.id} src ${src}: maps to pitched note`);
        if (syl.extend) {
          assert.ok(syl.from >= 0 && v.bySrc[syl.from] && v.bySrc[syl.from].text, `${raw.id} src ${src}: extend points to syllable`);
        } else {
          assert.ok(typeof syl.text === 'string' && syl.text.length > 0, `${raw.id} src ${src}: non-empty text`);
          for (const ext of syl.extendsTo || []) {
            assert.ok(ext > src && events[ext] && events[ext].sung, `${raw.id} src ${src}->${ext}: valid melisma target`);
          }
        }
      }
    }
  }
});

test('landmark tunes place their opening and cadence syllables on the exact beats', () => {
  const ag = L.forTune(byId['amazing-grace']);
  assert.equal(ag.verses.length, 1);
  assert.deepEqual(
    syllablesOf(ag.verses[0]).slice(0, 6).map((s) => [s.text, s.hyphen, s.extendsTo]),
    [
      ['A', true, null],
      ['maz', true, [2]],
      ['ing', false, null],
      ['grace!', false, null],
      ['How', false, null],
      ['sweet', false, null]
    ]
  );

  const sn = L.forTune(byId['silent-night']);
  assert.deepEqual(sn.errors, []);
  const snSyls = syllablesOf(sn.verses[0]);
  assert.equal(snSyls[0].text, 'Si');
  assert.equal(snSyls.at(-1).text, 'peace.');

  const als = L.forTune(byId['auld-lang-syne']);
  assert.deepEqual(
    syllablesOf(als.verses[0]).slice(0, 6).map((s) => s.text),
    ['Should', 'auld', 'ac', 'quain', 'tance', 'be']
  );

  const sji = L.forTune(byId['st-james-infirmary']);
  assert.deepEqual(
    syllablesOf(sji.verses[0]).slice(0, 5).map((s) => s.text),
    ['I', 'went', 'down', 'to', 'St.']
  );

  const gs = L.forTune(byId.greensleeves);
  assert.deepEqual(
    syllablesOf(gs.verses[0]).slice(0, 5).map((s) => [s.text, s.hyphen]),
    [['A', true], ['las,', false], ['my', false], ['love,', false], ['you', false]]
  );
});

test('MusicXML parser imports single and multi-verse lyrics, hyphens, extenders and slurred melismas', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>Lyric Import</work-title></work>
  <part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <harmony><root><root-step>C</root-step></root><kind>major</kind></harmony>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type>
        <lyric number="1"><syllabic>begin</syllabic><text>A</text></lyric>
        <lyric number="2"><syllabic>single</syllabic><text>Through</text></lyric>
      </note>
      <note>
        <pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type>
        <notations><slur type="start" number="1"/></notations>
        <lyric number="1"><syllabic>end</syllabic><text>men</text><extend type="start"/></lyric>
        <lyric number="2"><syllabic>begin</syllabic><text>man</text></lyric>
      </note>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type>
        <notations><slur type="stop" number="1"/></notations>
        <lyric number="1"><extend type="stop"/></lyric>
        <lyric number="2"><syllabic>end</syllabic><text>y</text></lyric>
      </note>
      <note>
        <pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type>
        <lyric number="1"><syllabic>single</syllabic><text>'tis</text><elision>‿</elision><syllabic>single</syllabic><text>so</text></lyric>
      </note>
    </measure>
  </part>
</score-partwise>`;

  const song = MX.parse(xml);
  assert.ok(song.lyrics, 'lyrics extracted from MusicXML');
  assert.equal(song.lyrics.verses.length, 2);
  const aligned = L.forTune(song);
  assert.deepEqual(aligned.errors, []);
  assert.equal(aligned.verses[0].bySrc[0].text, 'A');
  assert.equal(aligned.verses[0].bySrc[0].hyphen, true);
  assert.equal(aligned.verses[0].bySrc[1].text, 'men');
  assert.deepEqual(aligned.verses[0].bySrc[1].extendsTo, [2]);
  assert.equal(aligned.verses[0].bySrc[3].text, "'tis‿so");
  assert.equal(aligned.verses[1].bySrc[0].text, 'Through');
  assert.equal(aligned.verses[1].bySrc[1].text, 'man');
  assert.equal(aligned.verses[1].bySrc[2].text, 'y');
});

test('OpenScore vocal MusicXML fixtures extract aligned lyrics with zero errors', () => {
  for (const name of ['just-for-today', 'crazy-jane']) {
    const xml = readFileSync(new URL(`./fixtures/scores/${name}.musicxml`, import.meta.url), 'utf8');
    const song = MX.parseScore(xml);
    assert.ok(song.lyrics, `${name}: has extracted lyrics`);
    const aligned = L.forTune(song);
    assert.deepEqual(aligned.errors, [], `${name}: zero lyric alignment errors`);
    assert.ok(syllablesOf(aligned.verses[0]).length > 20, `${name}: extracted syllables`);
  }
});

test('sheet engraving renders lyrics on the beat with hyphens, extenders, verse numbers and toggle support', () => {
  const fbSource = readFileSync(new URL('../assets/js/lessons/fake-book.js', import.meta.url), 'utf8');
  const mnSource = readFileSync(new URL('../assets/js/music-notation.js', import.meta.url), 'utf8');

  let sheetHtml = '';
  const fakeSheetEl = {
    clientWidth: 960,
    dispatchEvent() {},
    set innerHTML(v) { sheetHtml = v; },
    get innerHTML() { return sheetHtml; },
    querySelectorAll() { return []; }
  };
  const fakeRoot = {
    classList: { toggle() {} },
    querySelector(sel) { return sel === '[data-fb-sheet]' ? fakeSheetEl : null; },
    querySelectorAll() { return []; }
  };
  const win = {
    addEventListener() {},
    FakeBookLyrics: L,
    FakeBookArrangement: { render() {}, cancel() {} },
    FakeBookTab: { STANDARD: [64, 59, 55, 50, 45, 40] },
    FakeBookFingering: { handMarks() { return {}; } }
  };
  const ctx = vm.createContext({
    window: win,
    navigator: { userAgent: '', maxTouchPoints: 0 },
    document: { addEventListener() {}, querySelectorAll() { return []; }, createElement() { return {}; } },
    Event: class Event {},
    Math, Number, String, Object, Array, RegExp, JSON, isFinite, parseInt, parseFloat
  });
  vm.runInContext(mnSource, ctx);
  ctx.MN = win.MusicNotation;

  // Load fake-book helpers and renderSheet into our VM context
  const slice1 = fbSource.slice(fbSource.indexOf('  var LETTERS ='), fbSource.indexOf('  /* ================================================================ state */'));
  const slice2 = fbSource.slice(fbSource.indexOf('  var NOTE_D ='), fbSource.indexOf('  /* ================================================================ transport */'));
  ctx.root = fakeRoot;
  ctx.el = () => null;
  ctx.els = () => [];
  ctx.hideBarPop = () => {};
  ctx.scoreNav = { refresh() {} };
  ctx.paintLoop = () => {};
  ctx.tabOn = () => false;
  ctx.tabPickOn = () => false;
  ctx.ZOOM_MIN = 0.5;
  ctx.ZOOM_MAX = 1.6;
  ctx.bassPlacedAll = {};
  ctx.lastS = 10;
  ctx.chordSymbolX = {};
  ctx.opts = {
    instr: 'concert',
    feel: 'swing',
    style: 'swing',
    tempo: 100,
    zoom: 1,
    names: false,
    nameStyle: 'notes',
    beatCounts: 'off',
    showLyrics: true,
    variation: 'written',
    harmonyVoice: 'off',
    chordStyle: 'lead',
    voicing: 'smooth',
    guitarVoicing: 'smooth'
  };
  ctx.lyricsOn = () => !!(ctx.opts.showLyrics && ctx.tune && ctx.tune.lyrics && ctx.tune.lyrics.verses && ctx.tune.lyrics.verses.length);
  vm.runInContext(slice1 + '\n' + slice2, ctx);

  // Test multi-verse rendering using a 2-verse fixture based on amazing-grace
  const twoVerseRaw = {
    ...byId['amazing-grace'],
    lyrics: {
      ...byId['amazing-grace'].lyrics,
      verses: [
        byId['amazing-grace'].lyrics.verses[0],
        { ...byId['amazing-grace'].lyrics.verses[0], mark: '2' }
      ]
    }
  };
  ctx.tune = ctx.parseTune(twoVerseRaw);
  assert.ok(ctx.tune.lyrics, 'parseTune attaches FakeBookLyrics');
  assert.equal(ctx.tune.lyrics.verses.length, 2);

  ctx.shapesRowOn = () => false;
  ctx.sizeMeasureDiagrams = () => {};
  ctx.afterTabRender = () => {};
  ctx.chordSel = 0;
  ctx.sheetChordLabels = (c) => ({ main: ctx.chordName(c), fn: '' });
  ctx.view = {
    written: ctx.tune.events,
    writtenKey: ctx.tune.key,
    concertKey: ctx.tune.key,
    writtenChords: ctx.tune.chords
  };
  ctx.renderSheet();

  assert.match(sheetHtml, /class="fb-lyr"/, 'renders .fb-lyr groups when showLyrics is true');
  assert.match(sheetHtml, /class="fb-lyric"[^>]*>.*maz<\/text>/, 'renders syllable text');
  assert.match(sheetHtml, /class="fb-lyric-num">1\. <\/tspan>A<\/text>/, 'renders verse number on multi-verse tune');
  assert.match(sheetHtml, /class="fb-lyric-hyph"[^>]*>-<\/text>/, 'renders hyphen between syllables of a word');
  assert.match(sheetHtml, /class="fb-lyric-ext"/, 'renders melisma extender line');

  // Turning showLyrics off omits lyrics from the SVG
  ctx.opts.showLyrics = false;
  ctx.renderSheet();
  assert.doesNotMatch(sheetHtml, /class="fb-lyr"/, 'hides lyrics when showLyrics is false');
});
