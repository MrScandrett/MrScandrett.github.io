import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../assets/js/lessons/fake-book.js', import.meta.url), 'utf8');
const ctx = vm.createContext({MN:{}});
vm.runInContext(source.slice(source.indexOf('  var LETTERS'), source.indexOf('  var INSTR')) + source.slice(source.indexOf('  function permuteChords'), source.indexOf('  /* ================================================================ state */')), ctx);
const key = ctx.parseKey('C', false);
const chords = [{root:{l:4,a:0},q:'7',start:0,dur:4,bar:1},{root:{l:0,a:0},q:'',start:4,dur:4,bar:2}];
test('suggestions preserve source and timing while building ii–V–I and tritone alternatives', () => {
  const before = JSON.stringify(chords);
  const out = ctx.permuteChords(chords,key,{theorySevenths:true,theoryApproach:true});
  assert.equal(out.length,3);
  assert.equal(out.map(c=>c.q).join(','),'m7,7,maj7');
  assert.equal(out.map(c=>c.start).join(','),'0,2,4');
  assert.equal(out.reduce((n,c)=>n+c.dur,0),8);
  assert.equal(JSON.stringify(chords),before);
  const sub = ctx.permuteChords(chords,key,{theoryTritone:true,theoryNinths:true});
  assert.equal((ctx.NAT[sub[0].root.l]+sub[0].root.a+12)%12,1);
  assert.equal(sub[0].q,'9');
  assert.equal(JSON.stringify(ctx.permuteChords(chords,key,{})),before);
});
test('interval voice preserves rests and timing and follows the home scale', () => {
  const events = [{start:0,dur:1,p:ctx.pitch(28,0)},{start:1,dur:2,p:null}];
  const out = ctx.intervalVoice(events,key,'thirds');
  assert.equal(out[0].p.midi,57); // C4 over A3
  assert.equal(out[1].p,null);
  assert.equal(out[1].dur,2);
  assert.equal(events[0].p.midi,60);
});
