import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
require('../assets/js/music-notation.js');
require('../assets/js/score-engine.js');
const E=globalThis.ScoreEngine;
const scores=JSON.parse(readFileSync(new URL('../data/score-library.json',import.meta.url))).scores;
function model(id){const m=E.prepare({...scores[id],id});E.analyse(m);return m;}

test('Morton studies include sounding source bass and truthful excerpt lengths',()=>{
  for(const [id,count] of [['morton-jelly',4],['morton-new-orleans',12],['morton-king',8],['morton-black-bottom',8]]){
    const m=model(id);
    assert.equal(m.count,count,id);
    assert.equal(scores[id].staves.length,2,id);
    assert.equal(scores[id].complete,false,id);
    assert.match(scores[id].source.label,/inner chord tones/i,id);
    const bass=E.playList(m).filter(n=>n.staff===1);
    assert.ok(bass.length>0,`${id}: audible second staff`);
  }
});

test('King Porter preserves the source key and bar numbering',()=>{
  const m=model('morton-king');
  assert.equal(scores['morton-king'].key,-4);
  assert.equal(E.barNumber(m,0),5);
  assert.equal(E.barNumber(m,7),12);
  assert.match(scores['morton-king'].keyName,/A-flat/);
});

test('New Orleans realizes the printed ottava and returns to loco',()=>{
  const bars=scores['morton-new-orleans'].staves[0].notes.split(' | ');
  assert.match(bars[1],/Bb6/);
  assert.match(bars[2],/Bb6/);
  assert.match(bars[3],/Bb4\/8 Bb5\/8/);
  assert.doesNotMatch(bars[3],/Bb6/);
});

test('Ravel separates metered Noctuelles from free runs and extends Oiseaux into accompaniment',()=>{
  assert.equal(model('ravel-noctuelles-opening').count,5);
  assert.equal(model('ravel-oiseaux-opening').count,7);
  assert.doesNotMatch(scores['ravel-noctuelles-opening'].staves.map(s=>s.notes).join(' '),/\{(?:210|420|105):/);
  const lower=scores['ravel-oiseaux-opening'].staves[1].voices[0].notes.split(' | ');
  assert.deepEqual(lower.slice(0,3),['R','R','@T:3/4 R']);
  assert.match(lower[3],/Gb3.*Ab3/);
  assert.match(lower[5],/@T:12\/8/);
  assert.match(lower[6],/@T:4\/4/);
  assert.match(scores['ravel-oiseaux-opening'].source.label,/middle right-hand voice omitted/i);
  for(const id of ['ravel-noctuelles-opening','ravel-oiseaux-opening']){
    assert.match(scores[id].source.label,/E\. Demets/);
    assert.doesNotMatch(scores[id].source.label,/Durand/);
    assert.match(scores[id].source.license,/public domain in the United States/);
  }
});

test('Ellington repertoire credits co-composer and historical arranger without claiming a full ensemble',()=>{
  const s=scores['ellington-black-tan-introduction'];
  assert.equal(model('ellington-black-tan-introduction').count,12);
  assert.equal(s.pickup,3);
  assert.match(s.composer,/Bubber Miley/);
  assert.match(s.source.label,/Eddie Powell/);
  assert.match(s.excerpt.label,/first violin only/);
  assert.equal(s.staves.length,1);
  assert.equal(s.complete,false);
  assert.equal(scores['duke-ellington-classroom-study'].composer,'ClassroomOS teaching materials');
});

test('every displayed bar, including the historical short opening bar, has a listening guide',()=>{
  for(const id of ['morton-jelly','morton-new-orleans','morton-king','morton-black-bottom','ravel-noctuelles-opening','ravel-oiseaux-opening','ellington-black-tan-introduction']){
    const m=model(id),guide=E.buildGuide(m);
    for(let i=0;i<m.count;i++)assert.ok(guide.some(g=>i>=g.from&&i<=g.to),`${id}: bar ${E.barNumber(m,i)}`);
  }
});
