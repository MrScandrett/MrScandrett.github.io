import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
require('../assets/js/music-notation.js');require('../assets/js/score-engine.js');require('../assets/js/guitar-tablature.js');
const library=require('../data/score-library.json').scores;
const tuning=[64,59,55,50,45,40];
test('Tárrega tab preserves every simultaneous pitch and assigns separate strings',()=>{
 for(const id of ['tarrega-adelita','tarrega-capricho-arabe','francisco-tarrega-classroom-study']){
  const model=ScoreEngine.prepare(library[id]);ScoreEngine.analyse(model);
  const strings=id==='tarrega-capricho-arabe'?[64,59,55,50,45,38]:tuning;
  const bars=GuitarTablature.finger(model,strings);
  bars.forEach((groups,bi)=>{
   const expected=new Set();model.staves.forEach(st=>st.bars[bi].events.filter(e=>e.kind==='note').forEach(e=>e.pitches.forEach(p=>expected.add(e.start.toFixed(7)+':'+p.midi))));
   const actual=new Set();groups.forEach(g=>{const used=new Set();g.notes.forEach(n=>{actual.add(g.start.toFixed(7)+':'+n.midi);assert.ok(n.string>=0,id+' must have a playable string for every pitch');assert.equal(strings[n.string]+n.fret,n.midi);assert.ok(!used.has(n.string),'simultaneous notes cannot share a string');used.add(n.string);});});
   assert.deepEqual(actual,expected,id+' bar '+bi);
  });
 }
});
test('held notes reserve their string and a tied continuation keeps its fingering',()=>{
 const model=ScoreEngine.prepare({time:'4/4',staves:[{voices:[{notes:'E4/2~ E4/2'},{notes:'s/4 G4/4 s/2'}]}]});ScoreEngine.analyse(model);
 const [groups]=GuitarTablature.finger(model,tuning);
 assert.notEqual(groups[0].notes[0].string,groups[1].notes[0].string);
 assert.equal(groups[0].notes[0].string,groups[2].notes[0].string);
 assert.ok(groups[2].notes[0].tied);
});
test('paired engraving places TAB under each staff with matching note columns at every width',()=>{
 for(const id of ['tarrega-adelita','tarrega-capricho-arabe']){
  const score=structuredClone(library[id]);score.tablature={tuning:id==='tarrega-capricho-arabe'?[64,59,55,50,45,38]:tuning};
  const model=ScoreEngine.prepare(score);ScoreEngine.analyse(model);
  for(const width of [320,700,1100]){
   const layout=ScoreEngine.engrave(model,width);
   assert.equal((layout.svg.match(/class="se-tablature"/g)||[]).length,layout.systems.length);
   assert.ok((layout.svg.match(/class="se-tab-note"/g)||[]).length>100);
   assert.ok(!/NaN|undefined/.test(layout.svg));
   for(let i=1;i<layout.systems.length;i++)assert.ok(layout.systems[i].top>=layout.systems[i-1].bottom);
  }
 }
});
