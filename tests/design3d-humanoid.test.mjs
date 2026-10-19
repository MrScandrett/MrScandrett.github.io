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
 const {bodyField,headField,features}=buildHumanoid(p,paint,colors),m=meshField(bodyField),h=meshField(headField),edges=new Map();
 for(let i=0;i<m.indices.length;i+=3)for(let e=0;e<3;e++){const a=m.indices[i+e],b=m.indices[i+(e+1)%3],key=a<b?a+'_'+b:b+'_'+a;edges.set(key,(edges.get(key)||0)+1);}
 let volume=0;const P=m.positions;
 for(let i=0;i<m.indices.length;i+=3){const [a,b,c]=[0,1,2].map(e=>m.indices[i+e]*3);volume+=(P[a]*(P[b+1]*P[c+2]-P[b+2]*P[c+1])-P[a+1]*(P[b]*P[c+2]-P[b+2]*P[c])+P[a+2]*(P[b]*P[c+1]-P[b+1]*P[c]))/6;}
 let minY=1e9,maxY=-1e9;for(let i=1;i<P.length;i+=3){minY=Math.min(minY,P[i]);maxY=Math.max(maxY,P[i]);}
 for(let i=1;i<h.positions.length;i+=3)maxY=Math.max(maxY,h.positions[i]);
 const hEdges=new Map();for(let i=0;i<h.indices.length;i+=3)for(let e=0;e<3;e++){const a=h.indices[i+e],b=h.indices[i+(e+1)%3],key=a<b?a+'_'+b:b+'_'+a;hEdges.set(key,(hEdges.get(key)||0)+1);}
 return {m,h,edges,hEdges,volume,minY,maxY,features};
}

test('the humanoid template is one closed, outward-facing surface that rests on y = 0',()=>{
 for(const [name,p] of [['default',params()],['min',extremes[0]],['max',extremes[1]]]){
  const r=audit(p);
  assert.ok(r.m.indices.length>3000,name+': mesh exists');
  assert.ok([...r.edges.values()].every(c=>c===2),name+': body: every edge shared by exactly two triangles');
  assert.ok([...r.hEdges.values()].every(c=>c===2),name+': head: every edge shared by exactly two triangles');
  assert.ok(r.h.indices.length>20000,name+': head is finely meshed');
  assert.ok(r.volume>0,name+': faces point outward');
  assert.ok(Math.abs(r.minY)<.02,name+': soles sit on the floor ('+r.minY+')');
  assert.ok(r.maxY>p.height*.8,name+': stands about as tall as its stature slider');
 }
});
test('every hair style and outfit builds a closed surface',()=>{
 for(let hairStyle=0;hairStyle<=4;hairStyle++)for(let outfit=0;outfit<=4;outfit++){
  const r=audit(params({hairStyle,outfit,hair:.9}));
  assert.ok([...r.edges.values()].every(c=>c===2)&&[...r.hEdges.values()].every(c=>c===2),`hair ${hairStyle} outfit ${outfit}`);
 }
});
test('every vertex gets a finite colour and a usable normal, for every preset-like build',()=>{
 for(const over of [{hairStyle:2,hair:1,outfit:4},{hairStyle:4,hair:1.3,outfit:2},{hairStyle:1,outfit:1},{hairStyle:3,hair:.4,outfit:3,leg:1.6,head:1.15}]){
  const {bodyField,headField}=buildHumanoid(params(over),paint,colors);
  for(const field of [bodyField,headField]){const m=meshField(field);
   assert.ok(m.colors.every(Number.isFinite),'finite colours '+JSON.stringify(over));
   for(let i=0;i<m.normals.length;i+=3)assert.ok(Math.hypot(m.normals[i],m.normals[i+1],m.normals[i+2])>.5,'normals '+JSON.stringify(over));}
 }
});
test('face landmarks land on the head surface',()=>{
 const {features}=audit(params());
 assert.equal(features.eyes.length,2);
 for(const e of features.eyes)assert.ok(e.c[2]>.2&&e.c[2]<.6,'eye depth '+e.c[2]);
});
test('rebuilding is fast enough for a slider drag',()=>{
 const t=performance.now();for(let i=0;i<5;i++){const b=buildHumanoid(params({height:4+i*.3}),paint,colors);meshField(b.bodyField);meshField(b.headField);}
 const each=(performance.now()-t)/5;console.log('ms per rebuild',each.toFixed(0));assert.ok(each<400,each+'ms');
});

test('body sliders reuse the head mesh and face sliders reuse the body mesh',async()=>{
 const THREE=await import('three'),{buildDesign}=await import('../assets/js/design3d/geometry.mjs'),texture=new THREE.Texture();
 const build=over=>{const s=freshState('character');Object.assign(s.params,over);const g=buildDesign(THREE,s,texture);return {body:g.children.find(m=>m.name==='Humanoid template').geometry.attributes.position.array,head:g.children.find(m=>m.name==='Head').geometry.attributes.position.array};};
 const a=build({}),shoulders=build({shoulders:1.4}),jaw=build({jaw:1}),taller=build({torso:2});
 assert.equal(shoulders.head,a.head,'moving the shoulders keeps the same head');
 assert.notEqual(shoulders.body,a.body,'moving the shoulders rebuilds the body');
 const jaw2=build({jaw:.7});assert.notEqual(jaw2.head,jaw.head,'changing the jaw rebuilds the head');
 const sameBody=build({jaw:.9,eyes:1.1});assert.equal(sameBody.body,jaw2.body,'face sliders keep the same body');
 assert.notEqual(taller.head,a.head,'a longer torso moves the head, so it rebuilds');
});
