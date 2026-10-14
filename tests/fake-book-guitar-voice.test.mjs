import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const G = createRequire(import.meta.url)('../assets/js/lessons/fake-book-guitar-voice.js');
const context = vm.createContext({window:{}});
const source = readFileSync(new URL('../assets/js/lessons/guitar-chords.js',import.meta.url),'utf8');
vm.runInContext(source.slice(0,source.indexOf('/* guitar-chords.js — plucked-string')),context);
const GT = context.window.GuitarTheory;
const type = (suffix,intervals) => ({suffix,intervals});
const chords = [{rootPC:2,type:type('m7',[0,3,7,10])},{rootPC:7,type:type('7',[0,4,7,10])},{rootPC:0,type:type('maj7',[0,4,7,11])}];
test('connected ii–V–I grips contain the right tones and remain within screened finger spans',()=>{
  for(const mode of ['smooth','common','shell','low']) {
    const grips=G.plan(chords,mode,GT);
    grips.forEach((g,i)=>{
      assert.ok(g,mode);
      const fretted=g.frets.filter(f=>typeof f==='number'&&f>0);
      assert.ok(Math.max(...fretted)-Math.min(...fretted)<=3);
      assert.ok(!GT.computeFingering(g.frets).includes('?'));
      const ivs=mode==='shell'?[0,chords[i].type.intervals[1],chords[i].type.intervals[3]]:chords[i].type.intervals;
      assert.deepEqual([...new Set(G.pitches(g.frets).map(n=>(n-chords[i].rootPC+120)%12))].sort((a,b)=>a-b),[...ivs].sort((a,b)=>a-b));
    });
  }
});
test('slash bass preserves the actual lowest pitch, including a non-chord bass',()=>{
  for(const bassPC of [4,2]) {
    const grip=G.plan([{rootPC:0,type:type('',[0,4,7]),bassPC}], 'smooth', GT)[0];
    assert.ok(grip);assert.equal(G.pitches(grip.frets)[0]%12,bassPC);
  }
});
test('repeated chords keep the same grip and unavailable shapes remain explicit',()=>{
  const grips=G.plan([chords[0],chords[0],chords[0]],'common',GT);
  assert.equal(grips[0].frets.join(),grips[1].frets.join());
  assert.equal(grips[1].frets.join(),grips[2].frets.join());
  assert.deepEqual(G.plan(chords,'manual',GT),[]);
  assert.deepEqual(G.plan(chords,'smooth',{findVoicings:()=>[],computeFingering:()=>[]}),[null,null,null]);
});
test('smooth progression minimizes the full candidate path cost',()=>{
  const layers=chords.map(c=>G.candidates(c,'smooth',GT));
  const local=c=>c.local+c.position*.08;
  let best=Infinity;
  for(const a of layers[0])for(const b of layers[1])for(const c of layers[2])best=Math.min(best,local(a)+local(b)+local(c)+G.motion(a.frets,b.frets,'smooth')+G.motion(b.frets,c.frets,'smooth'));
  const grips=G.plan(chords,'smooth',GT);
  const cost=grips.reduce((sum,c,i)=>sum+local(c)+(i?G.motion(grips[i-1].frets,c.frets,'smooth'):0),0);
  assert.ok(Math.abs(best-cost)<1e-9);
});
