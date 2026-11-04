import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';
import { STARTERS, compile } from './codeblocks-play-model.mjs';
const $ = id => document.getElementById('xp-'+id);
const editor=$('code'), status=$('status'), root=$('studio');
const controlsSpec={count:['Repeats',1,60,1],twist:['Twist °',-180,180,.5],rise:['Rise / repeat',-6,10,.5],radius:['Reach',0,40,.5],size:['Shape size',1,12,.5]};
let world, orbit, model, built=[], visible=0, timer;
function params() { return Object.fromEntries(Object.keys(controlsSpec).map(k=>[k,Number($('param-'+k).value)])); }
for(const [k,[label,min,max,step]] of Object.entries(controlsSpec)) {
  const l=document.createElement('label');l.textContent=label;
  const o=document.createElement('output');o.id='xp-out-'+k;
  const input=document.createElement('input');input.id='xp-param-'+k;input.type='range';Object.assign(input,{min,max,step});o.htmlFor=input.id;
  input.addEventListener('input',()=>{syncOutputs();run();});l.append(o,input);$('parameters').append(l);
}
function syncOutputs() { for(const [k,v] of Object.entries(params())) $('out-'+k).textContent=v; }
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
try {
 world=createScene($('canvas'),{THREE,far:3000,clearColor:0xeaf2f5});
 world.scene.add(new THREE.HemisphereLight(0xffffff,0x53657b,2));
 const light=new THREE.DirectionalLight(0xffffff,2.5);light.position.set(60,120,80);world.scene.add(light);
 world.scene.add(new THREE.GridHelper(160,16,0x7c9fae,0xc4d7df));
 model=new THREE.Group();model.rotation.x=-Math.PI/2;world.scene.add(model);
 orbit=new OrbitControls(world.camera,$('canvas'));orbit.maxDistance=1800;orbit.minDistance=5;orbit.addEventListener('change',draw);
 new ResizeObserver(draw).observe($('canvas'));
} catch(e) { status.textContent='3D needs WebGL in this browser. You can still edit and save your program.'; }
function draw() { if(world) { world.syncSize();world.renderer.render(world.scene,world.camera); } }
const rad=THREE.MathUtils.degToRad;
function run() {
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
  built=next;visible=params().count;show();return true;
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
function fit(top=false) {
 if(!world) return;
 model.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(model),center=new THREE.Vector3(),size=new THREE.Vector3();
 if(box.isEmpty()) {center.set(0,0,0);size.set(30,30,30);} else {box.getCenter(center);box.getSize(size);}
 const distance=Math.max(size.x,size.y,size.z,20)*2;
 orbit.target.copy(center);world.camera.position.copy(center).add(top?new THREE.Vector3(0,distance,.001):new THREE.Vector3(distance*.8,distance*.65,distance*.9));orbit.update();draw();
}
function load(p,key='') {
 editor.value=p.code;
 for(const k of Object.keys(controlsSpec)) $('param-'+k).value=p[k];
 $('presets').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.preset===key)));
 syncOutputs();run();fit();
}
function schedule() { clearTimeout(timer);timer=setTimeout(run,300); }
editor.addEventListener('input',schedule);$('run').addEventListener('click',()=>{if(run()) fit();});$('step').addEventListener('click',step);
$('fit').addEventListener('click',()=>fit());$('top').addEventListener('click',()=>fit(true));$('perspective').addEventListener('click',()=>fit());
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
const anchor=document.createComment('Creative studio');root.before(anchor);let oldOverflow='';
function expand(on) { if(on) {oldOverflow=document.body.style.overflow;document.body.append(root);}else anchor.after(root);root.classList.toggle('xp-expanded',on);document.body.style.overflow=on?'hidden':oldOverflow;$('expand').textContent=on?'Exit studio · Esc':'Expand creative studio';$('expand').setAttribute('aria-pressed',String(on));draw(); }
$('expand').addEventListener('click',()=>expand(!root.classList.contains('xp-expanded')));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&root.classList.contains('xp-expanded')) {expand(false);$('expand').focus();}});
load(STARTERS.helix,'helix');
