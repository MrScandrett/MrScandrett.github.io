import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
require('../assets/js/music-notation.js');require('../assets/js/score-engine.js');require('../assets/js/composer-arrangement.js');
const library=require('../data/score-library.json').scores;
const catalog=require('../data/composer-workspaces.json');
const {arrange}=globalThis.ComposerArrangement, engine=globalThis.ScoreEngine;
function notes(score) {const m=engine.prepare(score);engine.analyse(m);return {m,notes:engine.playList(m)};}
test('all 16 composer workspaces have valid, attributed scores and arrangements',()=>{
  assert.equal(Object.keys(catalog).length,16);
  for(const [composer,entry] of Object.entries(catalog)) {
    assert.ok(entry.scores.length,composer);
    for(const id of entry.scores) {
      const source=library[id], before=JSON.stringify(source);
      assert.ok(source.source.license && source.source.full,id);
      for(const mode of ['original','piano','melody','alto','tenor','guitar','bass']) {
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
