import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';
import { prepareForPrint, writeBinaryStl } from '../fab-io.mjs';
import { sendAndOpen } from '../handoff.mjs';
import { STARTERS, compile } from './codeblocks-play-model.mjs';
const $ = id => document.getElementById('xp-'+id);
const editor=$('code'), status=$('status'), canvas=$('canvas');
const undoBtn=$('undo'), redoBtn=$('redo');
const DRAFT_KEY='classroomos.codeblocks-play.v1';
const controlsSpec={count:['Repeats',1,60,1],twist:['Twist °',-180,180,.5],rise:['Rise / repeat',-6,10,.5],radius:['Reach',0,40,.5],size:['Shape size',1,12,.5]};
let world, orbit, model, built=[], visible=0, timer;
const undoStack=[], redoStack=[];
let currentSnap=null;
function params() { return Object.fromEntries(Object.keys(controlsSpec).map(k=>[k,Number($('param-'+k).value)])); }
for(const [k,[label,min,max,step]] of Object.entries(controlsSpec)) {
  const l=document.createElement('label');l.textContent=label;
  const o=document.createElement('output');o.id='xp-out-'+k;
  const input=document.createElement('input');input.id='xp-param-'+k;input.type='range';Object.assign(input,{min,max,step});o.htmlFor=input.id;
  input.addEventListener('input',()=>{syncOutputs();schedule();});
  l.append(o,input);$('parameters').append(l);
}
function syncOutputs() { for(const [k,v] of Object.entries(params())) $('out-'+k).textContent=v; }
function makeSnapshot() { return JSON.stringify({ code: editor.value, params: params() }); }
function updateHistoryButtons() {
  if(undoBtn) undoBtn.disabled=undoStack.length===0;
  if(redoBtn) redoBtn.disabled=redoStack.length===0;
}
function commitHistory(snap) {
  if(currentSnap && currentSnap!==snap) {
    undoStack.push(currentSnap);
    if(undoStack.length>60) undoStack.shift();
    redoStack.length=0;
  }
  currentSnap=snap;
  updateHistoryButtons();
}
function applySnapshot(raw) {
  const s=JSON.parse(raw);
  editor.value=s.code;
  for(const k of Object.keys(controlsSpec)) $('param-'+k).value=s.params[k];
  syncOutputs();
  currentSnap=raw;
  updateHistoryButtons();
  run({ record: false });
}
function saveDraft() {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, ...params(), code: editor.value })); } catch(_) {}
}
const palette=[
 ['Shapes','#0e7490',[
 ['Box','width · depth · height','box 0 0 size/2 size size size 0 0 0 190'],
 ['Sphere','stretch into an ellipsoid','sphere radius 0 i*rise+size size size size 0 i*twist 0 i*12'],
 ['Cylinder','round columns and beads','cylinder 0 0 i*rise+size/2 size size size 0 0 0 30']]],
 ['Modify','#6d28d9',[
 ['Move','offset following shapes','move 0 0 i*rise'],['Rotate','local X · Y · Z degrees','rotate 0 0 i*twist'],['Scale','X · Y · Z multipliers','scale 1 1 2'],['Set color','hue angle','color i*20']]],
 ['Control','#b45309',[
 ['Repeat','set the loop count',null],['Step','reveal the next repeat',null]]],
 ['Math / Data','#287340',[
 ['Create variable','name a calculated value','let angle i*twist'],['Change variable','add to a named value','change angle 5'],['Repeat counter i','0, 1, 2, 3…','i'],['Parameters','twist · rise · radius · size','radius'],['Arithmetic','+ − × ÷ and parentheses','(radius+size)/2']]]
];
function insert(text,inline=false) {
  const a=editor.selectionStart,b=editor.selectionEnd;
  const before=editor.value.slice(0,a),after=editor.value.slice(b);
  const value=inline?text:((before && !before.endsWith('\n')?'\n':'')+text+'\n');
  editor.setRangeText(value,a,b,'end');editor.focus();schedule();
}
for(const [category,color,items] of palette) {
 const section=document.createElement('section');section.style.setProperty('--operator-color',color);
 const heading=document.createElement('h4');heading.textContent=category;section.append(heading);
 for(const [name,hint,text] of items) {
  const button=document.createElement('button');button.type='button';button.textContent=name;
  const small=document.createElement('small');small.textContent=hint;button.append(small);
  button.addEventListener('click',()=> { if(name==='Repeat') $('param-count').focus(); else if(name==='Step') step(); else insert(text,category==='Math / Data' && !['Create variable','Change variable'].includes(name)); });section.append(button);
 }
 $('operators').append(section);
}
for(const [key,preset] of Object.entries(STARTERS)) {
 const b=document.createElement('button');b.textContent=preset.name;b.type='button';b.dataset.preset=key;
 b.addEventListener('click',()=>load(preset,key));$('presets').append(b);
}
function themeBgHex() {
 const c=window.SimKit?.theme?.colors?.();
 if(c && c.bg) {
  try { return new THREE.Color(c.bg).getHex(); } catch(_) {}
 }
 return 0xeaf2f5;
}
function syncThemeBg() {
 if(!world) return;
 const bg=window.SimKit?.theme?.colors?.()?.bg;
 if(bg) { world.scene.background=new THREE.Color(bg); if(canvas) canvas.style.background=bg; }
 else { world.scene.background=new THREE.Color(0xeaf2f5); if(canvas) canvas.style.background='#eaf2f5'; }
 draw();
}
try {
 world=createScene(canvas,{THREE,far:3000,clearColor:themeBgHex()});
 syncThemeBg();
 window.SimKit?.theme?.onChange?.(syncThemeBg);
 world.scene.add(new THREE.HemisphereLight(0xffffff,0x53657b,2));
 const light=new THREE.DirectionalLight(0xffffff,2.5);light.position.set(60,120,80);world.scene.add(light);
 world.scene.add(new THREE.GridHelper(160,16,0x7c9fae,0xc4d7df));
 model=new THREE.Group();model.rotation.x=-Math.PI/2;world.scene.add(model);
 orbit=new OrbitControls(world.camera,canvas);orbit.maxDistance=1800;orbit.minDistance=5;orbit.addEventListener('change',draw);
 new ResizeObserver(draw).observe(canvas);
} catch(e) { status.textContent='3D needs WebGL in this browser. You can still edit and save your program.'; }
function draw() { if(world) { world.syncSize();world.renderer.render(world.scene,world.camera); } }
const rad=THREE.MathUtils.degToRad;
function run({ record=true }={}) {
 clearTimeout(timer);
 try {
  const next=compile(editor.value,params());
  if(model) {
   while(model.children.length) { const m=model.children[0];model.remove(m);m.geometry.dispose();m.material.dispose(); }
   for(const item of next) {
    const [x,y,z,w,d,h,tilt,turn,lean,hue]=item.values,t=item.transform;
    let geometry;
    if(item.shape==='box') geometry=new THREE.BoxGeometry(w,d,h);
    else if(item.shape==='sphere') {geometry=new THREE.SphereGeometry(.5,24,16);geometry.scale(w,d,h);}
    else {geometry=new THREE.CylinderGeometry(.5,.5,1,48);geometry.rotateX(Math.PI/2);geometry.scale(w,d,h);}
    const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL((((t.color??hue)%360)+360)%360/360,.65,.5),roughness:.45}));
    mesh.scale.set(...t.scale);
    mesh.rotation.set(rad(tilt+t.rotate[0]),rad(lean+t.rotate[1]),rad(t.rotate[2]));
    mesh.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),rad(turn)));
    const a=rad(turn);mesh.position.set(x*Math.cos(a)-y*Math.sin(a)+t.move[0],x*Math.sin(a)+y*Math.cos(a)+t.move[1],z+t.move[2]);
    mesh.userData.iteration=item.iteration;model.add(mesh);
   }
  }
  built=next;visible=params().count;
  if(record) commitHistory(makeSnapshot());
  saveDraft();
  show();return true;
 } catch(e) { status.textContent=e.message+' Preview keeps your last successful run.';editor.setAttribute('aria-invalid','true');return false; }
}
function show() {
 editor.removeAttribute('aria-invalid');
 if(model) model.children.forEach(m=>m.visible=m.userData.iteration<visible);
 status.textContent=`${visible} / ${params().count} repeats · ${built.filter(s=>s.iteration<visible).length} shapes. ${world?'Change a rule or insert an operator.':'3D unavailable; editing and saving still work.'}`;draw();
}
function step() {
 const nextVisible=visible>=params().count?1:visible+1;
 if(run()) { visible=nextVisible;show(); }
}
function fit(mode='fit') {
 if(!world) return;
 model.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(model),center=new THREE.Vector3(),size=new THREE.Vector3();
 if(box.isEmpty()) {center.set(0,0,0);size.set(30,30,30);} else {box.getCenter(center);box.getSize(size);}
 const distance=Math.max(size.x,size.y,size.z,20)*2;
 let offset;
 if(mode==='top') offset=new THREE.Vector3(0,distance,.001);
 else if(mode==='perspective') offset=new THREE.Vector3(distance*.8,distance*.65,distance*.9);
 else {
  const dir=world.camera.position.clone().sub(orbit.target);
  offset=(dir.lengthSq()>1e-4?dir.normalize():new THREE.Vector3(.8,.65,.9).normalize()).multiplyScalar(distance);
 }
 orbit.target.copy(center);world.camera.position.copy(center).add(offset);orbit.update();draw();
}
function collectTriangleSoup() {
 const items=built.filter(s=>s.iteration<visible);
 if(!items.length) throw new Error('Run a program with at least one shape first.');
 if(model) {
  model.updateMatrixWorld(true);
  const chunks=[]; let total=0;
  for(const m of model.children) {
   if(!m.visible) continue;
   const g=(m.geometry.index?m.geometry.toNonIndexed():m.geometry).clone();
   g.applyMatrix4(m.matrixWorld);
   const arr=g.attributes.position.array;
   chunks.push(new Float32Array(arr));
   total+=arr.length;
   g.dispose();
  }
  if(!total) throw new Error('No visible geometry to export.');
  const soup=new Float32Array(total);
  let offset=0;
  for(const c of chunks) { soup.set(c,offset); offset+=c.length; }
  return prepareForPrint(soup,{yUp:true});
 }
 throw new Error('3D geometry is unavailable without WebGL.');
}
function load(p,key='',{ resetHistory=false }={}) {
 editor.value=p.code;
 for(const k of Object.keys(controlsSpec)) $('param-'+k).value=p[k];
 $('presets').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.preset===key)));
 syncOutputs();
 if(resetHistory) {
  undoStack.length=0; redoStack.length=0; currentSnap=null;
 }
 run({ record: !resetHistory });
 if(resetHistory) { currentSnap=makeSnapshot(); updateHistoryButtons(); }
 fit('perspective');
}
function schedule() { clearTimeout(timer);timer=setTimeout(()=>run(),280); }
editor.addEventListener('input',schedule);$('run').addEventListener('click',()=>{if(run()) fit('fit');});$('step').addEventListener('click',step);
$('fit').addEventListener('click',()=>fit('fit'));$('top').addEventListener('click',()=>fit('top'));$('perspective').addEventListener('click',()=>fit('perspective'));
if(undoBtn) undoBtn.addEventListener('click',()=>{ if(!undoStack.length) return; redoStack.push(currentSnap); applySnapshot(undoStack.pop()); });
if(redoBtn) redoBtn.addEventListener('click',()=>{ if(!redoStack.length) return; undoStack.push(currentSnap); applySnapshot(redoStack.pop()); });
$('stl').addEventListener('click',()=>{
 try {
  const stl=writeBinaryStl(collectTriangleSoup(),'ClassroomOS Codeblocks Studio (mm)');
  const url=URL.createObjectURL(new Blob([stl],{type:'model/stl'}));
  const a=document.createElement('a');a.href=url;a.download='my-codeblocks-design.stl';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
  status.textContent='STL (mm) downloaded. Inspect wall thickness and separate parts in your slicer.';
 } catch(error) { status.textContent='STL export unavailable: '+error.message; }
});
$('workbench').addEventListener('click',async()=>{
 try {
  const stl=writeBinaryStl(collectTriangleSoup(),'ClassroomOS Codeblocks Studio (mm)');
  await sendAndOpen('../../../workbench.html',{bytes:new Uint8Array(stl),filename:'codeblocks-design.stl',from:'Codeblocks studio'});
 } catch(error) { status.textContent='Could not send to Workbench: '+error.message; }
});
$('save').addEventListener('click',()=>{
 const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,...params(),code:editor.value},null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='my-codeblocks-idea.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('load').addEventListener('change',async e=>{
 try {const file=e.target.files[0];if(!file) return;if(file.size>100000) throw Error('Program file is too large.');const p=JSON.parse(await file.text());
 if(typeof p.code!=='string') throw Error('Missing program text.');
 for(const [k,[,min,max]] of Object.entries(controlsSpec)) if(!Number.isFinite(p[k])||p[k]<min||p[k]>max||(k==='count'&&!Number.isInteger(p[k]))) throw Error('Invalid parameter: '+k);
 compile(p.code,p);load(p);
 } catch(error) {status.textContent='Could not open program: '+error.message;}e.target.value='';
});
let restored=false;
try {
 const saved=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
 if(saved && typeof saved.code==='string' && Object.entries(controlsSpec).every(([k,[,min,max]])=>Number.isFinite(saved[k])&&saved[k]>=min&&saved[k]<=max&&(k!=='count'||Number.isInteger(saved[k])))) {
  compile(saved.code,saved);
  load(saved,'',{resetHistory:true});
  restored=true;
 }
} catch(_) {}
if(!restored) load(STARTERS.helix,'helix',{resetHistory:true});
