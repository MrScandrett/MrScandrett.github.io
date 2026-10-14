import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../assets/js/lessons/fake-book-pdf-model.js';
import '../assets/js/lessons/fake-book-pdf-coach-model.js';
const M = globalThis.FakeBookPDFModel;
const C = globalThis.FakeBookPDFCoachModel;
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
test('coach bounding box math and clamp movements', () => {
 assert.equal(C.boxValid({ x: 0.1, y: 0.2, w: 0.3, h: 0.4 }), true);
 assert.equal(C.boxValid({ x: -0.1, y: 0.2, w: 0.3, h: 0.4 }), false);
 assert.equal(C.boxValid({ x: 0.8, y: 0.2, w: 0.3, h: 0.4 }), false);
 const b = C.box({ x: 0.5, y: 0.6 }, { x: 0.2, y: 0.1 });
 assert.deepEqual(b, { x: 0.2, y: 0.1, w: 0.3, h: 0.5 });
 const moved = C.move({ x: 0.2, y: 0.2, w: 0.3, h: 0.3 }, 0.1, -0.1);
 assert.ok(Math.abs(moved.x - 0.3) < 1e-9 && Math.abs(moved.y - 0.1) < 1e-9);
 const clamped = C.move({ x: 0.8, y: 0.8, w: 0.3, h: 0.3 }, 0.5, 0.5);
 assert.equal(clamped.x, 0.7);
 assert.equal(clamped.y, 0.7);
});
test('coach staff detection and pitch mapping', () => {
 assert.equal(C.staffValid({ top: 0.2, bottom: 0.6 }), true);
 assert.equal(C.staffValid({ top: 0.2, bottom: 0.22 }), false);
 const w = 100, h = 100, data = new Uint8ClampedArray(w * h * 4).fill(255);
 for (let l = 0; l < 5; l++) {
   const y = 30 + l * 10;
   for (let x = 0; x < w; x++) {
     const i = (y * w + x) * 4;
     data[i] = 0; data[i + 1] = 0; data[i + 2] = 0;
   }
 }
 const detected = C.staff(data, w, h);
 assert.ok(detected && Math.abs(detected.top - 0.3) <= 0.02 && Math.abs(detected.bottom - 0.7) <= 0.02);

 const staff = { top: 0.2, bottom: 0.6 };
 assert.equal(C.pitch(0.6, staff, 'treble', 'C', 'major', ''), 'E4');
 assert.equal(C.pitch(0.2, staff, 'treble', 'C', 'major', ''), 'F5');
 assert.equal(C.pitch(0.7, staff, 'treble', 'C', 'major', ''), 'C4');
 assert.equal(C.pitch(0.2, staff, 'treble', 'G', 'major', 'key'), 'F#5');
 assert.equal(C.pitch(0.4, staff, 'treble', 'F', 'major', 'key'), 'Bb4');
 assert.equal(C.pitch(0.6, staff, 'bass', 'C', 'major', ''), 'G2');
 assert.equal(C.pitch(0.2, staff, 'bass', 'C', 'major', ''), 'A3');
 assert.throws(() => C.pitch(0.6, { top: 0.2, bottom: 0.22 }, 'treble', 'C', 'major'));
});
test('coach visual similarity matching and source validation', () => {
 const sigA = Buffer.from(new Uint8Array(256).fill(0b10101010)).toString('base64');
 const sigB = Buffer.from(new Uint8Array(256).fill(0b10101010)).toString('base64');
 const sigC = Buffer.from(new Uint8Array(256).fill(0b01010101)).toString('base64');
 assert.equal(C.similarity(sigA, sigB), 1);
 assert.equal(C.similarity(sigA, sigC), 0);

 const examples = [{ id: 'ex1', signature: sigA, key: 'C', mode: 'major', meter: '4/4', clef: 'treble', notes: 'C4q D4q E4h', chords: 'C' }];
 const match = C.match(sigB, examples, { key: 'C', mode: 'major', meter: '4/4', clef: 'treble' });
 assert.ok(match && match.example.id === 'ex1' && match.score === 1);
 assert.equal(C.match(sigC, examples, { key: 'C', mode: 'major', meter: '4/4', clef: 'treble' }), null);
 assert.equal(C.match(sigB, examples, { key: 'F', mode: 'major', meter: '4/4', clef: 'treble' }), null);

 const drafts = [{
   bars: [
     { notes: 'C4q', source: { page: 1, box: { x: 0.1, y: 0.1, w: 0.5, h: 0.2 }, staff: { top: 0.2, bottom: 0.6 } } },
     { notes: 'D4q' }
   ]
 }];
 assert.equal(C.validateSources(drafts, 5), true);
 assert.equal(C.validateSources(drafts, 0), false);
});
