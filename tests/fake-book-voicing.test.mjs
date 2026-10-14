import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../assets/js/lessons/fake-book.js', import.meta.url), 'utf8');
const ctx = vm.createContext({});
vm.runInContext('var NAT=[0,2,4,5,7,9,11]; function mod(n,m){return ((n%m)+m)%m;}\n' +
  source.slice(source.indexOf('  var Q ='), source.indexOf('  function chordTones')) +
  source.slice(source.indexOf('  var VOICING ='), source.indexOf('  var BOTTOM_NAMES')), ctx);
const chord = (l, q = '', a = 0) => ({root: {l, a}, q});
const modes = ['smooth', 'common', 'shellSmooth', 'open'];
test('all voice-leading modes preserve chord tones, ascending voices and bounded register', () => {
  for (const mode of modes) for (const q of Object.keys(ctx.Q)) {
    const chords = Array.from({length: 12}, (_,pc) => chord(0, q, pc));
    const notes = ctx.voiceChords(chords, mode);
    notes.forEach((n,i) => {
      assert.ok(n.every(x => x >= 48 && x <= 84));
      assert.ok(n.every((x,j) => !j || x > n[j-1]));
      const expected = ctx.Q[q].iv;
      const tones = mode === 'shellSmooth' ? [expected[0], expected[1], expected.length >= 4 ? expected[3] : expected[2]] : expected;
      assert.deepEqual(Array.from(n, x => ctx.mod(x-i,12)).sort((a,b)=>a-b), Array.from(tones,x=>x%12).sort((a,b)=>a-b));
    });
  }
});
test('smooth ii–V–I chooses the minimum-cost complete path', () => {
  const chords = [chord(1,'m7'), chord(4,'7'), chord(0,'maj7')];
  const layers = chords.map(c=>ctx.voiceCandidates(c,'smooth'));
  let best = Infinity;
  for(const a of layers[0]) for(const b of layers[1]) for(const c of layers[2]) {
    best = Math.min(best,a.register+b.register+c.register+ctx.voiceMotion(a.notes,b.notes,false)+ctx.voiceMotion(b.notes,c.notes,false));
  }
  const chosen = ctx.voiceChords(chords,'smooth');
  const cost = chosen.reduce((sum,n,i)=>sum+layers[i].find(c=>c.notes.join()===n.join()).register+(i?ctx.voiceMotion(chosen[i-1],n,false):0),0);
  assert.ok(Math.abs(cost-best)<1e-9);
});
test('repeated chords keep every voice stationary in every connected mode', () => {
  for(const mode of modes) {
    const notes=ctx.voiceChords([chord(0,'maj7'),chord(0,'maj7'),chord(0,'maj7')],mode);
    assert.equal(notes[0].join(),notes[1].join());
    assert.equal(notes[1].join(),notes[2].join());
  }
});
test('empty progressions are safe and common-tone mode penalizes octave displacement', () => {
  assert.equal(ctx.voiceChords([], 'smooth').length,0);
  assert.ok(ctx.voiceMotion([60,64,67],[64,67,72],true)>ctx.voiceMotion([60,64,67],[64,67,72],false));
});

test('new chord qualities: sus2, 7sus4 and minor-major 7th spell and reduce to the right triad', () => {
  assert.deepEqual(Array.from(ctx.Q.sus2.iv), [0, 2, 7]);
  assert.deepEqual(Array.from(ctx.Q['7sus4'].iv), [0, 5, 7, 10]);
  assert.deepEqual(Array.from(ctx.Q.mmaj7.iv), [0, 3, 7, 11]);
  for (const q of Object.keys(ctx.Q)) assert.equal(ctx.Q[q].iv.length, ctx.Q[q].lo.length, q);
  const triad = q => ctx.triadQuality(ctx.Q[q].iv);
  assert.equal(triad('sus2'), 'sus2'); assert.equal(triad('sus4'), 'sus4'); assert.equal(triad('7sus4'), 'sus4');
  assert.equal(triad('mmaj7'), 'minor'); assert.equal(triad('m7b5'), 'diminished'); assert.equal(triad('dim7'), 'diminished');
  assert.equal(triad('aug'), 'augmented'); assert.equal(triad('9'), 'major'); assert.equal(triad('m6'), 'minor');
  for (const q of Object.keys(ctx.Q)) assert.ok(ctx.TRIADS[triad(q)], q);
});

test('sheet chord symbols write minor as "-" (the Realbook font has no lowercase m), never as a capital M', () => {
  const realbookChord = new Function(source.slice(source.indexOf('  function realbookChord'), source.indexOf('  function chordAt')) + 'return realbookChord;')();
  const cases = { 'Gm7': 'G-7', 'Am': 'A-', 'B♭m7♭5': 'B♭-7♭5', 'F♯m6': 'F♯-6', 'Am(maj7)': 'A-(maj7)', 'Dmadd9': 'D-add9', 'Cmin7': 'C-7',
    'Em7/D': 'E-7/D', 'Cmaj7': 'Cmaj7', 'C': 'C', 'Gsus4': 'Gsus4', 'Bø7': 'Bø7', 'F°7': 'F°7', 'Abmaj9': 'Abmaj9' };
  for (const [name, shown] of Object.entries(cases)) assert.equal(realbookChord(name), shown, name);
});

test('lead-sheet layout: every note gets a drawable value, including tied triplet lengths', () => {
  const layout = vm.createContext({});
  vm.runInContext('var EPS = 1e-6; function mod(n, m) { return ((n % m) + m) % m; } function near(a, b) { return Math.abs(a - b) < EPS; }\n' +
    source.slice(source.indexOf('  var NOTE_D ='), source.indexOf('  var sheetEl')), layout);
  const p = { l: 0, a: 0 }, drawable = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25];
  // How Insensitive bar 69: quarter, a half triplet tied to an eighth triplet (5/3 of a beat), eighth triplet, quarter.
  const ev = [[0, 1], [1, 5 / 3], [8 / 3, 1 / 3], [3, 1]].map(([start, dur]) => ({ start, dur, p }));
  const [bar] = layout.layoutBars(ev, { pickup: 0, bars: 1, M: 4 });
  bar.pieces.forEach(pc => assert.ok(drawable.includes(pc.d), 'drawable value ' + pc.d));
  const tied = bar.pieces.filter(pc => pc.trip && pc.idx === 1);
  assert.deepEqual(JSON.parse(JSON.stringify(tied.map(pc => [pc.d, pc.tie, pc.tieFrom]))), [[2, true, false], [0.5, false, true]]);
  assert.ok(Math.abs(bar.pieces.reduce((s, pc) => s + (pc.real || pc.d), 0) - 4) < 1e-6, 'the bar still adds up to 4 beats');
});
