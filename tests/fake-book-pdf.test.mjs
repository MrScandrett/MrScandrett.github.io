import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../assets/js/lessons/fake-book-pdf-model.js';
const M = globalThis.FakeBookPDFModel;
const draft = () => ({ id:'pdf-test', title:'Test', composer:'', key:'C', mode:'major', meter:'4/4', tempo:96, pickup:0, bars:[{notes:'C4q D4q E4h',chords:'Dm7:2 G7:2'}] });
test('piecewise page anchors handle front matter and later inserted pages', () => {
 const a=[{printed:1,pdf:8},{printed:20,pdf:29}];
 assert.equal(M.pageFor(10,a),17); assert.equal(M.pageFor(20,a),29); assert.equal(M.pageFor(25,a),34);
});
test('contents tolerates dots, tabs and ordinary title/page lines', () => {
 assert.deepEqual(M.contents('Song One ... 12\nSong Two\t25\nSong Three 31\nCONTENTS'),[{title:'Song One',printed:12},{title:'Song Two',printed:25},{title:'Song Three',printed:31}]);
});
test('rhythm validation supports dots, triplets and tied pitches', () => {
 assert.equal(M.beats('C4e3 D4e3 E4e3 rh C4q~'),4);
 assert.equal(M.beats('C4q. D4e E4h'),4);
 assert.throws(() => M.beats('oops'));
});
test('manual tune validates every bar and harmony duration', () => {
 assert.equal(M.tune(draft(),'local').bars,1);
 const d=draft(); d.bars[0].notes='C4q'; assert.throws(() => M.tune(d,'local'),/needs 4/);
 d.bars[0].notes='rw'; d.bars[0].chords='C:5'; assert.throws(() => M.tune(d,'local'),/durations/);
});
test('pickup remains separate from full-bar harmony', () => {
 const d=draft(); d.pickup=1; d.bars.unshift({notes:'C4q',chords:''});
 const t=M.tune(d,'local'); assert.equal(t.bars,1); assert.equal(t.chords,'Dm7:2 G7:2');
 d.bars[0].chords='C'; assert.throws(() => M.tune(d,'local'),/pickup chords/);
});
test('ties must have a following note of the same written pitch', () => {
 const d=draft(); d.bars[0].notes='C4q~ C4q E4h'; assert.equal(M.tune(d,'local').bars,1);
 d.bars[0].notes='C4q~ D4q E4h'; assert.throws(() => M.tune(d,'local'),/tie must/);
 d.bars[0].notes='C4w~'; assert.throws(() => M.tune(d,'local'),/final tie/);
});
test('independent page-number sections distinguish additions from main page 1', () => {
 const a=[{section:'main',printed:1,pdf:14},{section:'additions',printed:1,pdf:498}];
 assert.equal(M.pageFor(1,a,'main'),14); assert.equal(M.pageFor(1,a,'additions'),498);
 assert.equal(M.pageFor(13,a,'additions'),510);
 assert.deepEqual(M.contents('A Family Joy ... 4-5','main'),[{title:'A Family Joy',printed:4,end:5,section:'main'}]);
});
test('handwritten chord marks normalize and section labels enter the notation engine', () => {
 const d=draft(); d.bars[0].chords='D-7:2 G7:2'; d.bars[0].section='A';
 const t=M.tune(d,'local'); assert.equal(t.chords,'Dm7:2 G7:2'); assert.deepEqual(t.sectionsByBar,{1:'A'});
 assert.equal(M.chordText('CΔ D-7 Bø C°7 C^7'),'Cmaj7 Dm7 Bm7b5 Cdim7 Cmaj7');
});
