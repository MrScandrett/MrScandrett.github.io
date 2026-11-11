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

test('Sugar Plum solo guitar preserves melody rhythm and fits bass/harmony on held strings',()=>{
  require('../assets/js/guitar-tablature.js');
  const src=library['tchaikovsky-sugar-plum'], before=JSON.stringify(src);
  const score=arrange(src,{mode:'guitar',staff:1,voice:0,octave:12});
  const {m}=notes(score), original=notes(src).m;
  assert.equal(m.count,28);
  assert.equal(score.sections[0].label,'Intro');
  assert.equal(score.sections[1].bar,5);
  assert.equal(score.keyName,'E minor');
  assert.equal(score.time,'4/4');
  assert.equal(m.staves.length,1);
  assert.equal(m.staves[0].voices.length,2);
  for(let bi=0;bi<m.count;bi++) {
    const upper=m.staves[0].bars[bi].events.filter(e=>e.kind==='note' && e.voice===0);
    const source=original.staves[0].bars[bi].events.filter(e=>e.kind==='note');
    assert.equal(upper.length,source.length,`bar ${bi+1}: every melody attack`);
    upper.forEach((e,i)=>{
      assert.equal(e.start,source[i].start*2);
      assert.equal(e.dur,source[i].dur*2);
      assert.equal(e.pitches.at(-1).midi%12,source[i].pitches.at(-1).midi%12,`bar ${bi+1}: melody pitch class`);
    });
  }
  for(let bi=0;bi<4;bi++) {
    const bass=m.staves[0].bars[bi].events.filter(e=>e.kind==='note'&&e.voice===1);
    assert.deepEqual(bass.map(e=>[e.start,e.pitches[0].midi]),[[0,40],[2,40]],'intro low E pulse');
  }
  const tuning=[64,59,55,50,45,40];
  const tabs=GuitarTablature.finger(m,tuning,0,score.tablature);
  let held=[], total=0, chords=0;
  tabs.forEach((bar,bi)=>bar.forEach(g=>{
    const now=m.barStart[bi]+g.start;
    held=held.filter(n=>n.end>now+1e-6 && !g.notes.some(fresh=>fresh.midi===n.midi));
    g.notes.forEach(n=>{
      assert.ok(n.string>=0,`bar ${bi+1}: no unassigned notes`);
      assert.equal(tuning[n.string]+n.fret,n.midi);
      assert.ok(n.fret<=7);
      held.push({...n,end:now+n.dur});total++;
    });
    assert.equal(new Set(held.map(n=>n.string)).size,held.length,'distinct strings, including sustained notes');
    const frets=held.filter(n=>n.fret>0).map(n=>n.fret);
    assert.ok(frets.length<=4);
    if(frets.length)assert.ok(Math.max(...frets)-Math.min(...frets)<=4);
    if(g.notes.length>=2)chords++;
  }));
  assert.ok(total>200,'melody, harmony and selective bass retained');
  assert.ok(chords>40,'paired harmony throughout the excerpt');
  assert.equal(JSON.stringify(src),before);
  // Written guitar notation must sound and finger identically one octave lower.
  score.staves[0].voices.forEach(v=>{v.notes=ComposerArrangement.transpose(v.notes,12,7,0);});
  score.playbackTranspose=-12;
  const written=notes(score).m;
  assert.deepEqual(GuitarTablature.finger(written,tuning,-12,score.tablature),tabs);
});
