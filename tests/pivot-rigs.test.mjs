import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Rigs=require('../lib/piv-rigs.js');
const Piv=require('../lib/piv-engine.js');
const Cutout=require('../assets/js/lessons/pivot-cutout.js');
const library=JSON.parse(fs.readFileSync(new URL('../data/pivot-rigs.json',import.meta.url),'utf8'));
const root=new URL('../',import.meta.url);
const png='data:image/png;base64,iVBORw0KGgo=';
const io={fetchText:async src=>fs.readFileSync(new URL(src,root),'utf8'),rasterize:async()=>png};

test('the library file is valid: categories, unique ids, every rig well formed',()=>{
 Rigs.validateLibrary(library);
 assert.ok(library.rigs.length>=15);
 for(const c of library.categories)assert.ok(library.rigs.some(r=>r.category===c.id),'empty category '+c.id);
});

test('every artwork part points at a real element and a clip that holds some of it',()=>{
 for(const rig of library.rigs){
  if(!rig.svg)continue;
  const split=Rigs.splitSvg(fs.readFileSync(new URL(rig.svg.src,root),'utf8'));
  const [vx,vy,vw,vh]=split.viewBox;
  for(const p of rig.parts.filter(p=>p.els)){
   for(const n of p.els)assert.ok(split.children[n],`${rig.id}/${p.id}: element ${n} does not exist`);
   const [x,y,w,h]=p.clip;
   assert.ok(x>=vx-1&&y>=vy-1&&x+w<=vx+vw+1&&y+h<=vy+vh+1,`${rig.id}/${p.id}: clip leaves the artwork`);
   const [ax,ay]=p.a;
   assert.ok(ax>=x&&ax<=x+w&&ay>=y&&ay<=y+h,`${rig.id}/${p.id}: joint is outside its own crop`);
  }
 }
});

test('splitSvg numbers drawable elements in paint order and keeps defs for the crops',()=>{
 const split=Rigs.splitSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><title>t</title><defs><linearGradient id="g"><stop/></linearGradient></defs><g><rect width="2" height="2"/></g><circle r="1"/><path d="M0 0"/></svg>');
 assert.deepEqual(split.children.map(c=>c.tag),['g','circle','path']);
 const crop=Rigs.cropSvg(split,[2,0],[0,0,5,5],2);
 assert.match(crop,/viewBox="0 0 5 5" width="10" height="10"/);
 assert.ok(crop.includes('linearGradient')&&crop.indexOf('<rect')<crop.indexOf('<path'));
 assert.ok(!crop.includes('<circle'));
 assert.throws(()=>Rigs.cropSvg(split,[9],[0,0,1,1]),/no element 9/);
});

test('every rig compiles to a figure the engine and the project validator accept',async()=>{
 for(const rig of library.rigs){
  const built=await Rigs.build(rig,io);
  const {type,angles}=built;
  assert.equal(type.segments.length,rig.parts.length);
  assert.equal(type.rigId,rig.id);
  type.segments.forEach((s,i)=>assert.ok(s.parent<=i,`${rig.id}: bone ${i} comes before its parent`));
  assert.deepEqual([...type.order].sort((a,b)=>a-b),type.segments.map((_,i)=>i));
  for(const [name,pose] of Object.entries(built.poses)){
   assert.equal(pose.length,type.segments.length,`${rig.id}/${name}`);
   assert.ok(pose.every(Number.isFinite));
  }
  const doc={width:690,height:420,fps:10,types:[type],frames:[{figures:[{id:1,type:0,x:300,y:300,scale:1,angles}],order:[0]}]};
  Cutout.validateProject({doc});
  const ops=Piv.frameOps(doc,0);
  assert.equal(ops.length,rig.parts.length);
  assert.ok(ops.every(op=>[op.x1,op.y1,op.x2,op.y2,op.cx,op.cy,op.x,op.y].every(v=>v===undefined||Number.isFinite(v))));
 }
});

test('at rest the compiled bones sit exactly where the spec put them',async()=>{
 for(const rig of library.rigs){
  const k=(rig.svg&&rig.svg.scale)||1,o=rig.origin||[0,0];
  const {type,angles}=await Rigs.build(rig,io);
  const doc={types:[type],frames:[]};
  const j=Piv.figureJoints(doc,{type:0,x:0,y:0,scale:1,angles});
  rig.parts.forEach((p,i)=>{
   const near=(got,want,what)=>assert.ok(Math.abs(got-want)<0.05,`${rig.id}/${p.id} ${what}: ${got} vs ${want}`);
   near(j.startX[i],(p.a[0]-o[0])*k,'start x');near(j.startY[i],(p.a[1]-o[1])*k,'start y');
   near(j.endX[i],(p.b[0]-o[0])*k,'end x');near(j.endY[i],(p.b[1]-o[1])*k,'end y');
  });
 }
});

test('a pose moves only the bones it names, by the degrees it names',async()=>{
 const rig=library.rigs.find(r=>r.id==='robot-arm');
 const built=await Rigs.build(rig,io);
 const rest=built.poses.Rest,reach=built.poses.Reach;
 rig.parts.forEach((p,i)=>{
  const want=(rig.poses.Reach[p.id]||0)*Math.PI/180;
  assert.ok(Math.abs(reach[i]-rest[i]-want)<1e-9,p.id);
 });
});

test('FK still carries children: turning a parent moves everything below it',async()=>{
 const built=await Rigs.build(library.rigs.find(r=>r.id==='robot-arm'),io);
 const doc={types:[built.type],frames:[]};
 const fig={type:0,x:0,y:0,scale:1,angles:built.angles.slice()};
 const before=Piv.figureJoints(doc,fig);
 const a=built.angles.slice();a[1]+=Math.PI/2;
 const after=Piv.figureJoints(doc,{...fig,angles:a});
 const last=built.type.segments.length-1;
 assert.ok(Math.hypot(after.endX[last]-before.endX[last],after.endY[last]-before.endY[last])>50);
 assert.ok(Math.abs(after.startX[1]-before.startX[1])<1e-9,'the turning bone keeps its pivot');
});

test('validation rejects the mistakes a student rig author is likely to make',()=>{
 const ok=()=>structuredClone(library.rigs.find(r=>r.id==='dog'));
 const bad=(edit,re)=>{const r=ok();edit(r);assert.throws(()=>Rigs.validateRig(r),re);};
 bad(r=>{r.parts[1].parent='nope';},/after its parent/);
 bad(r=>{r.parts.reverse();},/after its parent/);
 bad(r=>{r.parts[1].id=r.parts[0].id;},/duplicate/);
 bad(r=>{r.parts[0].a=[NaN,0];},/needs a and b/);
 bad(r=>{r.parts[0].shape='star';},/shape/);
 bad(r=>{r.poses={Bad:{ghost:10}};},/unknown part/);
 bad(r=>{r.id='Has Spaces';},/id must/);
 bad(r=>{r.svg={src:'https://example.com/x.svg'};},/svg\.src/);
 bad(r=>{r.parts[0].els=[0];r.parts[0].clip=[0,0,10,10];},/svg\.src/);
});

test('search needs every word to start a word, never scattered letters',()=>{
 const find=q=>Rigs.byCategory(library,q).flatMap(c=>c.rigs.map(r=>r.id));
 assert.ok(find('robot').includes('robot-arm')&&find('robot').includes('gearpod'));
 assert.ok(find('wing').includes('bird'));
 assert.ok(find('robot wave').includes('robot-biped'));
 assert.ok(!find('robot wave').includes('fish'));
 assert.deepEqual(find('zzq'),[]);
 assert.deepEqual(find('dg'),[],'no scattered-letter matching');
 assert.equal(Rigs.byCategory(library,'').length,library.categories.length);
});

test('a figure on the stage can be saved as a rig and comes back the same',async()=>{
 const doc={types:[Piv.defaultFigureType()],frames:[{figures:[],order:[]}]};
 const fig={type:0,x:200,y:200,scale:1.5,color:[220,38,38],angles:Array.from({length:12},(_,i)=>i*0.1-0.4)};
 const spec=Rigs.rigFromFigure(doc,fig,'My Runner!',Piv.figureJoints);
 assert.equal(spec.id,'my-runner');assert.equal(spec.category,'mine');
 assert.equal(spec.parts.length,12);assert.equal(spec.parts[3].shape,'disc');
 const back=await Rigs.build(spec,io);
 const doc2={types:[back.type],frames:[]};
 const a=Piv.figureJoints({types:doc.types},{type:0,x:0,y:0,scale:1,angles:fig.angles});
 const b=Piv.figureJoints(doc2,{type:0,x:0,y:0,scale:1,angles:back.angles});
 for(let i=0;i<12;i++){assert.ok(Math.abs(a.endX[i]-b.endX[i])<0.2&&Math.abs(a.endY[i]-b.endY[i])<0.2,'bone '+i);}
 const art=structuredClone(doc);art.types[0].segments[0].artwork={src:png,width:1,height:1,pivotX:0,pivotY:0};
 assert.throws(()=>Rigs.rigFromFigure(art,fig,'x',Piv.figureJoints),/drawing project/);
});

test('creature svgs are on disk, credited, and still the student originals',()=>{
 for(const rig of library.rigs.filter(r=>r.svg)){
  const copy=new URL(rig.svg.src,root);
  assert.ok(fs.existsSync(copy),rig.svg.src);
  assert.ok(rig.credit&&rig.credit.text,rig.id+' needs a credit');
  // The library cuts these files by element number, so a changed copy would silently break the rig.
  const original=new URL('student-projects/Dominic/doms folder/assets/sprites/'+rig.svg.src.split('/').pop(),root);
  if(fs.existsSync(original))assert.equal(fs.readFileSync(copy,'utf8'),fs.readFileSync(original,'utf8'),rig.id+': copy drifted from the student file');
 }
});
