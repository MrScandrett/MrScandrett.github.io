// Guard the specific removals from the 2026-11-15 audit, not a general rights clearance.
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const json=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));
async function absent(path){let exists=true;try{await access(new URL(path,root));}catch(e){if(e.code!=='ENOENT')throw e;exists=false;}assert.equal(exists,false,`Retired unverified asset restored: ${path}`);}
let images=0;
for(const folder of ['electronics-reference','story-concepts']){
 const meta=await json(`assets/images/lessons/${folder}/sources.json`);
 assert.equal(meta.license,'CC0 1.0');
 for(const item of meta.assets){
  await absent(item.old);
  const svg=await readFile(new URL(item.target,root),'utf8');
  assert.ok(svg.includes('<svg')&&svg.includes('<title>'),item.target);
  assert.ok(!/<image\b|data:image/i.test(svg),'Original vectors must not embed retired raster art');images++;
 }
}
for(const file of ['assets/thumbs/great-day-in-harlem.jpg','student-projects/Dominic/doms folder/assets/sprites/godzilla.png','assets/scores/mozart/lacrimosa-piano.pdf','assets/scores/tchaikovsky/tchaikovsky-sugar-plum-fairy.pdf','scripts/score-import/sources/mozart-lacrimosa/lacrimosa.mxl','scripts/score-import/sources/mozart-lacrimosa/lacrimosa-print.ly','scripts/score-import/sources/tchaikovsky-hits/tchaikovsky-sugar-plum-fairy.mxl','scripts/score-import/sources/tchaikovsky-hits/sugar-plum.mid'])await absent(file);
const library=await json('data/score-library.json'),catalog=await json('data/composer-workspaces.json');
for(const id of ['mozart-lacrimosa','tchaikovsky-sugar-plum']){
 assert.ok(!library.scores[id],`Unverified score restored: ${id}`);
 for(const entry of Object.values(catalog)){assert.ok(!entry.scores.includes(id));for(const group of entry.groups||[])assert.ok(!group.scores.includes(id));}
}
for(const track of (await json('data/recording-library.json')).tracks)assert.ok(!/Ferenc_Fricsay|Requiem_\(Krips\)|Swan_Lake-_Extract/.test(decodeURIComponent(track.source)),track.id);
for(const name of ['mossback','boulderkin','glowfin','emberkite','gearpod'])assert.ok((await readFile(new URL(`student-projects/Dominic/doms folder/assets/sprites/${name}.svg`,root),'utf8')).includes('<svg'));
console.log(`Rights remediation: original replacement vectors verified; retired art, 3 streams and 2 score editions remain excluded (${images} replacement path records).`);
