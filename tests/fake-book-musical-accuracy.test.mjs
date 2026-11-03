import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/js/lessons/fake-book.js', import.meta.url), 'utf8');
const warnings = [];
const ctx = vm.createContext({ MN: { namedHeadColors: {} }, console: { warn: x => warnings.push(x) } });
vm.runInContext(source.slice(source.indexOf('  var LETTERS ='), source.indexOf('  /* ================================================================ state */')) +
  source.slice(source.indexOf('  var NOTE_D ='), source.indexOf('  var sheetEl')) +
  source.slice(source.indexOf('  var DRUMS ='), source.indexOf('  /* ================================================================ transport */')), ctx);
const plain = x => JSON.parse(JSON.stringify(x));
const chord = (quality, pc = 0) => ({ root: { l: 0, a: pc }, q: ctx.mapQuality(quality) });
const formula = q => Array.from(ctx.Q[ctx.mapQuality(q)].iv);
const template = { id: 'accuracy', key: 'C', meter: [4, 4], melody: 'C5w', chords: 'C' };

test('playback retains requested extensions, alterations, suspensions and omitted degrees', () => {
  for (const [q, tones] of Object.entries({
    add9: [0,4,7,14], madd9: [0,3,7,14], maj9: [0,4,7,11,14], m9: [0,3,7,10,14],
    m11: [0,3,7,10,14,17], '9sus4': [0,5,7,10,14], '13sus4': [0,5,7,10,14,21],
    '7b9': [0,4,7,10,13], '7#9': [0,4,7,10,15], '7b9#11': [0,4,7,10,13,18],
    '7b5': [0,4,6,10], '7#5': [0,4,8,10], aug7: [0,4,8,10],
    'maj7#11': [0,4,7,11,18], 'maj9b5': [0,4,6,11,14],
    '6add9': [0,4,7,9,14], 'm6add9': [0,3,7,9,14], '7no5': [0,4,10], '5': [0,7]
  })) assert.deepEqual(formula(q), tones, q);
  assert.deepEqual(formula('-^9'), [0,3,7,11,14]);
  assert.deepEqual(formula('^'), [0,4,7,11], 'iReal major-seventh shorthand');
  assert.deepEqual(formula('69'), [0,4,7,9,14]);
  assert.throws(() => ctx.mapQuality('unrecognized'), /Unsupported chord quality/);
});

test('generated 13ths avoid an unrequested natural 11, while explicit dissonances survive', () => {
  for (const q of ['13','maj13','m13']) assert.ok(!formula(q).includes(17), q);
  assert.deepEqual(formula('11'), [0,7,10,14,17], 'suspended dominant 11 omits the major third');
  assert.ok(formula('maj11').includes(17), 'explicit natural 11 is not silently sharpened');
  assert.deepEqual(formula('7alt'), [0,4,10,13,20], 'one valid b9/b13 altered-dominant choice');
  assert.deepEqual(formula('7b9#9#11b13'), [0,4,7,10,13,15,18,20], 'explicit b9 and #9 can coexist');
});

test('extended shells retain the actual seventh, not a fifth or ninth by array position', () => {
  for (const q of ['maj9','m11','13','7b9','7#5']) {
    const c = chord(q), def = ctx.Q[c.q], notes = ctx.voiceChords([c], 'shell')[0];
    const pcs = Array.from(notes, n => ctx.mod(n,12));
    assert.ok(pcs.includes(def.iv[def.lo.indexOf(6)] % 12), q);
    assert.ok(ctx.clearLowIntervals(notes), q);
  }
});

test('every connected mode has clear spacing and ordered, distinct pitches in all twelve keys', () => {
  const qualities = ['', 'm', '7', 'maj7', 'dim7', 'm7b5', 'sus2', '7sus4', '9', 'maj9', 'm11', '13', '7b9', '7#9', '7alt', '7b9#9#11b13', 'maj7#11', 'maddb13'];
  for (const mode of ['smooth','common','shellSmooth','open']) for (const q of qualities) {
    const chords = Array.from({ length: 12 }, (_, pc) => chord(q, pc));
    ctx.voiceChords(chords, mode).forEach((notes, i) => {
      assert.ok(notes.every((n,j) => n >= 48 && n <= 84 && (!j || n > notes[j-1])), `${q}/${i}/${mode}`);
      assert.ok(ctx.clearPianoSpacing(notes,chords[i]), `${q}/${i}/${mode}`);
      for (let bass = 36; bass <= 55; bass++) assert.ok(ctx.clearLowIntervals([...notes, bass].sort((a,b)=>a-b)), `${q}/${i}/${mode}: bass ${bass}`);
    });
  }
  assert.equal(ctx.clearLowIntervals([48,50,55]), false, 'a low C3/D3 second needs lifting');
  assert.equal(ctx.clearLowIntervals([53,55,60]), true);
  assert.equal(ctx.clearLowIntervals([36,36]), true, 'unison doubling is not a low-interval clash');
  assert.equal(ctx.clearPianoSpacing([59,64,67,72],chord('maj7')), false, 'B3/C5 minor ninth from an inversion');
});

test('drop 2 always reconstructs a close-position chord by lifting the dropped voice', () => {
  for (const q of ['maj7','m7','9','maj9','m11','13','7b9','7alt','5']) for (let pc = 0; pc < 12; pc++) {
    const c = chord(q,pc), notes = ctx.voiceChords([c], 'open')[0];
    const restored = Array.from(notes); const dropped = restored.shift() + 12;
    restored.push(dropped); restored.sort((a,b)=>a-b);
    assert.equal(restored.at(-2), dropped, `${q}/${pc}: second voice from top`);
    assert.ok(restored.at(-1) - restored[0] < 12, `${q}/${pc}: begins in close position`);
    assert.deepEqual(Array.from(notes,n=>ctx.mod(n-pc,12)).sort((a,b)=>a-b), formula(q).map(n=>n%12).sort((a,b)=>a-b));
  }
});

test('4/4 syncopations expose beat 3 with ties and preserve their sounding duration', () => {
  for (const [start,dur,expected] of [[1,2,[[1,1],[2,1]]], [1.5,1.5,[[1.5,.5],[2,1]]], [1,3,[[1,1],[2,2]]]]) {
    const ev = [{ start,dur,p:{l:0,a:0} }];
    const bar = ctx.layoutBars(ev,{pickup:0,bars:1,M:4})[0];
    const notes = bar.pieces.filter(p=>p.p);
    assert.deepEqual(plain(notes.map(p=>[p.rel,p.d])),expected);
    assert.equal(notes[0].tie,true); assert.equal(notes[1].tieFrom,true);
    assert.equal(notes.reduce((sum,p)=>sum+p.d,0),dur);
  }
  assert.deepEqual(plain(ctx.decompose(0,4,false,4)),[{rel:0,d:4}], 'aligned whole notes stay whole');
  assert.deepEqual(plain(ctx.decompose(0,3,false,3)),[{rel:0,d:3}], '3/4 dotted half stays intact');
  const pickup = ctx.layoutBars([{start:-3,dur:2,p:{}}],{pickup:3,bars:0,M:4})[0];
  assert.deepEqual(plain(pickup.pieces.filter(p=>p.p).map(p=>p.d)),[1,1], 'pickup uses its position in the full bar');
});

test('every band style articulates off-grid chord changes without sustaining a previous harmony across them', () => {
  for (const style of ['swing','twobeat','rock','bossa','ballad','jig','waltz','jazzwaltz']) {
    const M = ['jig','waltz','jazzwaltz'].includes(style) ? 3 : 4;
    const chords = [{...chord('7b9'),start:0,dur:1.25}, {...chord('maj9',5),start:1.25,dur:M-1.25}];
    const voiced = ctx.voiceChords(chords,'smooth');
    const band = ctx.bandBars(style,chords,voiced,M,1,1).filter(e=>e.kind==='pno'||e.kind==='bass');
    for (const t of [0,1.25]) for (const kind of ['pno','bass']) assert.ok(band.some(e=>e.kind===kind&&e.t===t), `${style}/${kind}/${t}`);
    band.forEach(e=>assert.ok(e.dur>0 && e.t+e.dur <= (e.t<1.25?1.25:M)+1e-6, style));
    band.filter(e=>e.kind==='pno').forEach(e=>assert.deepEqual(plain(e.ms),plain(voiced[e.t<1.25?0:1])));
  }
  const c = {...chord('11'),start:0,dur:4};
  const bass = ctx.bandBars('twobeat',[c],ctx.voiceChords([c],'smooth'),4,1,1).find(e=>e.kind==='bass'&&e.t===2);
  assert.equal(bass.m%12,7,'root–fifth bass uses the fifth of a dominant 11, not its seventh');
});

test('chord parsing preserves double accidentals and rejects malformed harmonic rhythm', () => {
  const tune = ctx.parseTune({...template,chords:'C##7/Gbb'});
  assert.equal(tune.chords[0].root.a,2); assert.equal(tune.chords[0].bass.a,-2);
  for (const chords of ['C:5','C:3','C:4 F','C:3 F:2','C:0','C:..']) assert.throws(()=>ctx.parseTune({...template,chords}),/chord durations/);
});

test('the full built-in library parses and original melody pitches survive voicing choices', () => {
  const {tunes} = JSON.parse(readFileSync(new URL('../data/fake-book.json',import.meta.url),'utf8'));
  for (const raw of tunes) {
    const t = ctx.parseTune(raw), before = plain(t.events);
    const notes = ctx.voiceChords(t.chords,'smooth');
    assert.equal(notes.length,t.chords.length,raw.id);
    assert.deepEqual(plain(t.events),before,raw.id);
  }
  assert.deepEqual(warnings,[]);
});
