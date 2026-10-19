import test from 'node:test';
import assert from 'node:assert/strict';
import { WORKSHOPS, freshState } from '../assets/js/design3d/workshops.mjs';
import { buildHumanoid } from '../assets/js/design3d/humanoid.mjs';
import { meshField } from '../assets/js/design3d/body-field.mjs';

const colors={skin:'#9b6547',cloth:'#d58a39',trousers:'#34383b',leather:'#49362d',hair:'#2e231d',lip:'#8a4a48',gold:'#c9a24a',metal:'#8d98a3',collar:'#a86f2c'};
const paint=hex=>{const n=parseInt(hex.slice(1),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];};
const params=(over={})=>({...freshState('character').params,...over});
const fields=WORKSHOPS.character.fields;
const extremes=['min','max'].map(end=>Object.fromEntries(fields.map(f=>[f.key,f[end]])));

function audit(p){
 const {field,features}=buildHumanoid(p,paint,colors),m=meshField(field),edges=new Map();
 for(let i=0;i<m.indices.length;i+=3)for(let e=0;e<3;e++){const a=m.indices[i+e],b=m.indices[i+(e+1)%3],key=a<b?a+'_'+b:b+'_'+a;edges.set(key,(edges.get(key)||0)+1);}
 let volume=0;const P=m.positions;
 for(let i=0;i<m.indices.length;i+=3){const [a,b,c]=[0,1,2].map(e=>m.indices[i+e]*3);volume+=(P[a]*(P[b+1]*P[c+2]-P[b+2]*P[c+1])-P[a+1]*(P[b]*P[c+2]-P[b+2]*P[c])+P[a+2]*(P[b]*P[c+1]-P[b+1]*P[c]))/6;}
 let minY=1e9,maxY=-1e9;for(let i=1;i<P.length;i+=3){minY=Math.min(minY,P[i]);maxY=Math.max(maxY,P[i]);}
 return {m,edges,volume,minY,maxY,features};
}

test('the humanoid template is one closed, outward-facing surface that rests on y = 0',()=>{
 for(const [name,p] of [['default',params()],['min',extremes[0]],['max',extremes[1]]]){
  const r=audit(p);
  assert.ok(r.m.indices.length>3000,name+': mesh exists');
  assert.ok([...r.edges.values()].every(c=>c===2),name+': every edge shared by exactly two triangles');
  assert.ok(r.volume>0,name+': faces point outward');
  assert.ok(Math.abs(r.minY)<.02,name+': soles sit on the floor ('+r.minY+')');
  assert.ok(r.maxY>p.height*.8,name+': stands about as tall as its stature slider');
 }
});
test('every hair style and outfit builds a closed surface',()=>{
 for(let hairStyle=0;hairStyle<=4;hairStyle++)for(let outfit=0;outfit<=4;outfit++){
  const r=audit(params({hairStyle,outfit,hair:.9}));
  assert.ok([...r.edges.values()].every(c=>c===2),`hair ${hairStyle} outfit ${outfit}`);
 }
});
test('face landmarks land on the head surface',()=>{
 const {features}=audit(params());
 assert.equal(features.eyes.length,2);
 for(const e of features.eyes)assert.ok(e.c[2]>.2&&e.c[2]<.6,'eye depth '+e.c[2]);
});
test('rebuilding is fast enough for a slider drag',()=>{
 const t=performance.now();for(let i=0;i<5;i++)meshField(buildHumanoid(params({height:4+i*.3}),paint,colors).field);
 const each=(performance.now()-t)/5;console.log('ms per rebuild',each.toFixed(0));assert.ok(each<400,each+'ms');
});
