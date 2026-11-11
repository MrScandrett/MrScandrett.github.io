import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
require('../assets/js/music-notation.js');require('../assets/js/score-engine.js');require('../assets/js/composer-arrangement.js');
const library=require('../data/score-library.json').scores;
const catalog=require('../data/composer-workspaces.json');
const {arrange}=globalThis.ComposerArrangement, engine=globalThis.ScoreEngine;
function notes(score) {const m=engine.prepare(score);engine.analyse(m);return {m,notes:engine.playList(m)};}
test('all 19 composer workspaces have valid, attributed scores and arrangements',()=>{
  assert.equal(Object.keys(catalog).length,19);
  for(const [composer,entry] of Object.entries(catalog)) {
    assert.ok(entry.scores.length,composer);
    for(const id of entry.scores) {
      const source=library[id], before=JSON.stringify(source);
      assert.ok(source.source.license && source.source.full,id);
      for(const mode of ['original','piano','melody','violin','alto','tenor','guitar','bass']) {
        const score=arrange(source,{mode,staff:0,voice:0,octave:0,id:composer});
        const {m}=notes(score);assert.ok(m.count>0,`${id}/${mode}`);
        const svg=engine.engrave(m,320);assert.ok(!/NaN|undefined/.test(svg.svg),`${id}/${mode}: narrow engraving`);
      }
      assert.equal(JSON.stringify(source),before,`${id}: source unchanged`);
    }
  }
});
test('sax written pitches sound at the exact source pitch, including repeats and key changes',()=>{
  for(const entry of Object.values(catalog)) for(const id of entry.scores) {
    const source=library[id];
    const concert=notes(arrange(source,{mode:'melody'})).notes;
    for(const mode of ['alto','tenor']) {
      const score=arrange(source,{mode}), sax=notes(score).notes;
      assert.equal(sax.length,concert.length,id);
      sax.forEach((n,i)=>{
        assert.equal(n.midi+score.playbackTranspose,concert[i].midi,`${id}/${mode}: pitch`);
        assert.equal(n.start,concert[i].start,`${id}/${mode}: onset`);
        assert.equal(n.dur,concert[i].dur,`${id}/${mode}: duration`);
      });
    }
  }
});
test('piano studies use piano on every staff, including four-hand source reductions',()=>{
  for(const id of ['beethoven-symphony-5-1','tchaikovsky-waltz-flowers']) {
    const score=arrange(library[id],{mode:'piano'});
    assert.equal(score.staves.length,2);assert.ok(score.staves.every(s=>s.instrument==='piano'));notes(score);
  }
});
test('all source voices can be extracted without losing their road map',()=>{
  for(const id of ['beethoven-moonlight-1','bach-prelude-c-major','vivaldi-spring-1']) {
    const source=library[id], reference=notes(source).m;
    source.staves.forEach((st,staff)=>(st.voices||[st]).forEach((_,voice)=> {
      const {m}=notes(arrange(source,{mode:'melody',staff,voice,octave:12}));
      assert.deepEqual(m.order,reference.order,`${id} staff ${staff} voice ${voice}`);
    }));
  }
});
test('violin parts fit the instrument and keep the source rhythm and pitch classes',()=>{
  const {VIOLIN_LOW,VIOLIN_HIGH}=globalThis.ComposerArrangement;
  for(const [composer,entry] of Object.entries(catalog)) for(const id of entry.scores) {
    const source=library[id];
    source.staves.forEach((st,staff)=>(st.voices||[st]).forEach((_,voice)=>{
      for(const octave of [-12,0,12]) {
        const concert=notes(arrange(source,{mode:'melody',staff,voice,octave})).notes;
        const score=arrange(source,{mode:'violin',staff,voice,octave,id:composer}), violin=notes(score).notes;
        const where=`${id} staff ${staff} voice ${voice} octave ${octave}`;
        assert.equal(score.instrument,'violin',where);assert.equal(score.staves.length,1,where);
        assert.equal(violin.length,concert.length,where);
        violin.forEach((n,i)=>{
          assert.ok(n.midi>=VIOLIN_LOW,`${where}: ${n.midi} below the G string`);
          assert.ok(n.midi<=VIOLIN_HIGH||concert[i].midi>VIOLIN_HIGH,`${where}: ${n.midi} above E7`);
          assert.equal(((n.midi-concert[i].midi)%12+12)%12,0,`${where}: pitch class`);
          assert.equal(n.start,concert[i].start,`${where}: onset`);assert.equal(n.dur,concert[i].dur,`${where}: duration`);
        });
      }
    }));
  }
});
