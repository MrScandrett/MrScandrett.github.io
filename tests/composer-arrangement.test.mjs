import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
require('../assets/js/guitar-tablature.js');require('../assets/js/music-notation.js');require('../assets/js/score-engine.js');require('../assets/js/composer-arrangement.js');
const library=require('../data/score-library.json').scores;
const catalog=require('../data/composer-workspaces.json');
const {arrange}=globalThis.ComposerArrangement, engine=globalThis.ScoreEngine;
function notes(score) {const m=engine.prepare(score);engine.analyse(m);return {m,notes:engine.playList(m)};}
test('all 23 composer workspaces have valid, attributed scores and arrangements',()=>{
  assert.equal(Object.keys(catalog).length,23);
  for(const [composer,entry] of Object.entries(catalog)) {
    assert.ok(entry.scores.length,composer);
    for(const id of entry.scores) {
      const source=library[id], before=JSON.stringify(source);
      assert.ok(source.source.license && source.source.full,id);
      for(const mode of ['original','piano','melody','violin','alto','tenor','guitar','guitar-solo','bass']) {
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

test('prepared guitar studies retain their supplied voices and concert pitch',()=>{
  const src={title:'Original preset regression exercise',source:{label:'Original CC0 test exercise'},time:'2/4',key:1,staves:[{label:'Source',notes:'E5/4 G5/4 | A5/2'}],
    guitarArrangement:{title:'Original two-voice exercise',time:'4/4',key:1,keyName:'E minor',
      staves:[{label:'Guitar',clef:'treble',instrument:'guitar',voices:[{notes:'E4/2 G4/2 | A4/1'},{notes:'E3/1 | A2/1'}]}],
      tablature:{tuning:[64,59,55,50,45,40],maxFret:7}}};
  const before=JSON.stringify(src);
  for(const mode of ['guitar','guitar-solo']) {
    const result=arrange(src,{mode,staff:0,octave:12});
    assert.deepEqual(result.staves,src.guitarArrangement.staves);
    assert.equal(result.time,'4/4');
    assert.equal(notes(result).m.count,2);
    assert.equal(result.tablature.maxFret,7);
  }
  assert.equal(JSON.stringify(src),before);
});

test('every extracted string part fits its range and preserves source timing and pitch classes',()=>{
  require('../assets/js/guitar-tablature.js');
  for(const id of new Set(Object.values(catalog).flatMap(entry=>entry.scores))) {
    const src=library[id];
    src.staves.forEach((st,staff)=>(st.voices||[st]).forEach((_,voice)=>{
      for(const mode of ['violin','guitar','bass']) for(const octave of [-12,0,12]) {
        if(mode==='guitar'&&src.guitarArrangement)continue;
        const score=arrange(src,{mode,staff,voice,octave});
        const reference=arrange(src,{mode:'melody',staff,voice,octave});
        if(mode==='bass')reference.staves=[{...ComposerArrangement.line(src,staff,voice,true),notes:ComposerArrangement.transpose(ComposerArrangement.line(src,staff,voice,true).notes,octave,octave/12*7,0)}];
        const source=notes(reference).notes;
        const part=notes(score), low=mode==='violin'?55:mode==='guitar'?40:28, high=mode==='violin'?100:mode==='guitar'?83:62;
        assert.equal(part.notes.length,source.length,`${id}/${mode}/${staff}/${voice}/${octave}: attacks`);
        part.notes.forEach((n,i)=>{
          const where=`${id}/${mode}/${staff}/${voice}/${octave}`;
          assert.ok(n.midi>=low&&n.midi<=high,`${where}: range ${n.midi}`);
          assert.equal(((n.midi-source[i].midi)%12+12)%12,0,`${where}: pitch class`);
          assert.equal(n.start,source[i].start,`${where}: onset`);
          assert.equal(n.dur,source[i].dur,`${where}: duration`);
        });
        if(mode!=='violin') {
          const tuning=mode==='guitar'?[64,59,55,50,45,40]:[43,38,33,28];
          const tabs=GuitarTablature.finger(part.m,tuning);
          for(const bar of tabs)for(const group of bar)for(const n of group.notes){
            assert.ok(n.string>=0,`${id}/${mode}: playable fret`);
            assert.equal(tuning[n.string]+n.fret,n.midi);
          }
        }
      }
    }));
  }
});

test('octave fitting does not convert an extracted octave leap into a tie',()=>{
  const src={title:'Tie regression',key:0,time:'4/4',staves:[{notes:'(C5 C4)/2~ C5/2'}]};
  const score=arrange(src,{mode:'bass'}), part=notes(score).notes;
  assert.equal(part.length,2,'both attacks survive when C4 and C5 fit to the same octave');
  assert.deepEqual(part.map(n=>[n.start,n.dur]),[[0,2],[2,2]]);
  const tied={...src,staves:[{notes:'(C5 C4)/2~ C4/2'}]};
  assert.equal(notes(arrange(tied,{mode:'bass'})).notes.length,1,'a genuine held note stays tied');
});

test('violin fitting lowers high notes as well as raising low notes',()=>{
  const fit=ComposerArrangement.fitViolin('G2/4 E8/4 C4/4 C5/4');
  const part=notes({title:'Wide range',time:'4/4',staves:[{notes:fit.notes}]}).notes;
  assert.ok(part.every(n=>n.midi>=55&&n.midi<=100));
  assert.ok(fit.raised>0&&fit.lowered>0);
});


test('solo piano preserves all four staves of Rachmaninoff and every native piano voice',()=>{
  const src=library['rachmaninoff-prelude-3-2'];
  const result=arrange(src,{mode:'piano'});
  assert.equal(result.staves.length,4);
  assert.deepEqual(notes(result).notes.map(n=>[n.midi,n.start,n.dur]),notes(src).notes.map(n=>[n.midi,n.start,n.dur]));
  assert.deepEqual(result.staves.map(s=>s.voices||s.notes),src.staves.map(s=>s.voices||s.notes));
});

test('piano reduction retains reachable source harmony and chooses sounding bass voices',()=>{
  const src={title:'Reduction',instrument:'strings',time:'4/4',staves:[
    {label:'Violin',notes:'(C5 E5 G5 C7)/2 (D5 E5 F5 G5 A5 B5 C6)/2'},
    {label:'Bassoon',notes:'C3/1'},
    {label:'Cello',voices:[{notes:'S'},{notes:'(C2 G2 C3)/1'}]},
    {label:'Return staff',notes:'S'}
  ]};
  const before=JSON.stringify(src), result=arrange(src,{mode:'piano'}), model=notes(result).m;
  assert.equal(result.staves.length,2);
  assert.ok(model.staves[0].bars[0].events[1].pitches.length>=2,'source chord tones survive');
  assert.deepEqual(model.staves[1].bars[0].events[0].pitches.map(p=>p.midi%12),[0,7,0]);
  for(const st of model.staves)for(const bar of st.bars)for(const e of bar.events.filter(e=>e.kind==='note')){assert.ok(e.pitches.length<=5);assert.ok(Math.max(...e.pitches.map(p=>p.midi))-Math.min(...e.pitches.map(p=>p.midi))<=12);}
  assert.equal(JSON.stringify(src),before);
});

test('solo guitar studies preserve melody rhythm and use playable source bass grips',()=>{
  let pairs=0;
  for(const id of new Set(Object.values(catalog).flatMap(entry=>entry.scores))) {
    const src=library[id];if(src.instrument==='pluck'||src.guitarArrangement)continue;
    const before=JSON.stringify(src), score=arrange(src,{mode:'guitar-solo'}), part=notes(score);
    const sourceModel=notes(src).m;
    if(part.m.staves[0].voices[1])part.m.staves[0].voices[1].forEach((bar,bi)=>bar.events.filter(e=>e.kind==='note').forEach(e=>{
      assert.ok(sourceModel.staves.some((st,si)=>st.voices.some((v,vi)=>!(si===0&&vi===0)&&v[bi].events.some(original=>original.kind==='note'&&Math.abs(original.start-e.start)<1e-6&&original.dur+1e-6>=e.dur&&original.pitches.some(p=>!p.tiedFrom&&p.midi%12===e.pitches[0].midi%12)))),id+': bass comes from an actual source attack');
    }));
    const reference=notes(arrange(src,{mode:'melody'})).m;
    assert.deepEqual(part.m.order,reference.order,id+': road map');
    part.m.staves[0].voices[0].forEach((bar,bi)=>bar.events.forEach((e,ei)=>{
      const original=reference.staves[0].voices[0][bi].events[ei];
      assert.equal(e.kind,original.kind,id);assert.equal(e.start,original.start,id);assert.equal(e.dur,original.dur,id);
      if(e.kind==='note')assert.equal(e.pitches[0].midi%12,original.pitches[0].midi%12,id);
    }));
    const tabs=GuitarTablature.finger(part.m,[64,59,55,50,45,40],0,score.tablature);
    for(const bar of tabs)for(const g of bar){
      const frets=g.notes.filter(n=>n.fret>0).map(n=>n.fret);
      for(const n of g.notes){assert.ok(n.string>=0,id+': assigned string');assert.ok(n.fret<=12,id+': fret limit');}
      if(frets.length)assert.ok(Math.max(...frets)-Math.min(...frets)<=4,id+': hand span');
      if(g.notes.length>1)pairs++;
    }
    assert.equal(JSON.stringify(src),before);
  }
  assert.ok(pairs>100,'source bass accompanies the melody throughout the repertoire');
});

test('solo guitar keeps complete guitar compositions and prepared adaptations',()=>{
  for(const id of ['tarrega-adelita','tarrega-capricho-arabe']) {
    const src=library[id],result=arrange(src,{mode:'guitar-solo'});
    assert.deepEqual(result.staves,src.guitarArrangement?.staves||src.staves,id);
  }
});

test('solo guitar keeps inherited durations, tuplets, grace notes and repeat marks aligned',()=>{
  const src={title:'Rhythm fixture',key:0,time:'4/4',staves:[
    {label:'Melody',notes:': @K:1 @N:7 g:G5/16 {3 C5/4~ C5 E5 } F#5/2 :'},
    {label:'Cello',notes:'{3 C3/4 D3 E3 } C3/2'}
  ]};
  const result=arrange(src,{mode:'guitar-solo'}), original=notes(src).m, model=notes(result).m;
  assert.deepEqual(model.order,original.order);
  const upper=model.staves[0].voices[0][0].events, source=original.staves[0].voices[0][0].events;
  assert.deepEqual(upper.map(e=>[e.start,e.dur,e.tie,e.graces?.length]),source.map(e=>[e.start,e.dur,e.tie,e.graces?.length]));
  assert.equal(model.staves[0].voices[1][0].length,4);
  assert.ok(result.staves[0].voices[0].notes.includes('@N:7'));
  assert.equal((result.staves[0].voices[1].notes.match(/g:/g)||[]).length,0,'graces remain only in the melody');
});


test('solo studies prefer an active bass line over a single low entry',()=>{
  const src=library['mozart-ah-vous-theme'];
  const solo=notes(arrange(src,{mode:'guitar-solo'})).m;
  const bass=solo.staves[0].voices[1][0].events.filter(e=>e.kind==='note');
  assert.ok(bass.length,'the opening bass must not disappear in favor of a one-bar secondary voice');
  assert.equal(bass[0].pitches[0].midi%12,0);
});
