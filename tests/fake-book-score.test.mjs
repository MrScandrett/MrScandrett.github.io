import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const MX = createRequire(import.meta.url)('../assets/js/lessons/fake-book-musicxml.js');
for (const [name, bars, parts, notes] of [['just-for-today',41,6,579],['crazy-jane',68,3,1108]]) {
  test(`OpenScore ${name}: written voices, pickup and complete duration`, () => {
    const song=MX.parseScore(fs.readFileSync(new URL(`./fixtures/scores/${name}.musicxml`,import.meta.url),'utf8'));
    assert.equal(song.bars,bars); assert.equal(song.score.parts.length,parts); assert.equal(song.score.notes.length,notes);
    assert.ok(song.score.notes.every(n=>n.dur>0 && Number.isFinite(n.midi)));
    song.score.bars.forEach((b,i,a)=>{ if(i) assert.ok(Math.abs(b.start-a[i-1].start-a[i-1].len)<1e-9); });
    assert.ok(Math.abs(song.score.bars[0].start + song.pickup) < 1e-9);
    assert.ok(song.score.notes.some(n=>n.midi<60));
  });
}
const note=(step,oct,dur,extra='')=>`<note>${extra}<pitch><step>${step}</step><octave>${oct}</octave></pitch><duration>${dur}</duration><voice>1</voice></note>`;
const xml=`<score-partwise><part-list><score-part id="P"><part-name>Piano</part-name></score-part></part-list><part id="P"><measure number="1"><attributes><divisions>4</divisions><time><beats>3</beats><beat-type>4</beat-type></time></attributes>${note('C',4,12,'<tie type="start"/>')}</measure><measure number="2"><attributes><time><beats>4</beats><beat-type>4</beat-type></time></attributes>${note('C',4,4,'<tie type="stop"/>')}${note('E',4,1)}${note('G',3,1,'<chord/>')}${note('F',4,11)}</measure><measure number="3"><attributes><time><beats>5</beats><beat-type>8</beat-type></time></attributes>${note('D',4,10)}</measure></part></score-partwise>`;
test('meter changes remain one song; chords, ties and exact subdivisions survive',()=>{
  const s=MX.parseScore(xml); assert.equal(s.bars,3);
  assert.deepEqual(s.score.bars.map(b=>[b.start || 0,b.len,b.meter]),[[0,3,[3,4]],[3,4,[4,4]],[7,2.5,[5,8]]]);
  assert.equal(s.score.notes[0].dur,4); assert.equal(s.score.notes[1].dur,.25);
  assert.equal(s.score.notes[2].start,s.score.notes[1].start);
});
