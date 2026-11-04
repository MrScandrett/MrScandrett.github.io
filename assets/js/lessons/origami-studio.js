import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';
import { sheet, foldPanels, commit, validFold, cross } from './origami/paper.mjs';
const $=id=>document.getElementById(`og-${id}`), canvas=$('paper-canvas');
const KEY='origami-paper-studio-v2';
let setup;
try { setup=createScene(canvas,{THREE,clearColor:0x173c3b,preserveDrawingBuffer:true}); }
catch { $('fold-status').textContent='3D graphics are unavailable. Enable WebGL and reload to use Paper Studio.'; }
if(setup) {
const {scene,camera,renderer,syncSize}=setup;
camera.up.set(0,0,1); camera.position.set(0,-.01,29); camera.lookAt(0,0,0);
const controls=new OrbitControls(camera,canvas); controls.enableRotate=false; controls.enablePan=false; controls.minDistance=12; controls.maxDistance=65; controls.target.set(0,0,0);
scene.add(new THREE.HemisphereLight(0xffffff,0x54736c,2.5));
const light=new THREE.DirectionalLight(0xfff4de,3);light.position.set(-8,-10,20);scene.add(light);
const grid=new THREE.GridHelper(50,40,0x416963,0x294e49);grid.rotation.x=Math.PI/2;grid.position.z=-.65;scene.add(grid);
const group=new THREE.Group();scene.add(group);
let steps=[],cursor=0,panels=sheet(),pending=null,angle=0,side=1,top=true,animation=null,recipeStep=0,drag=null;
const recipes={book:[{a:[0,-7.5],b:[0,7.5],side:1,name:'Match the left edge to the right edge.'}],kite:[{a:[7.5,7.5],b:[-7.5,1.2867965644],side:-1,name:'Bring the top edge onto the diagonal center line.'},{a:[7.5,7.5],b:[1.2867965644,-7.5],side:1,name:'Bring the right edge onto the same center line.'}],accordion:[{a:[-3.75,-7.5],b:[-3.75,7.5],side:1,name:'Fold the left quarter to the first interior grid line.'},{a:[0,-7.5],b:[0,7.5],side:1,name:'Fold the stack across the middle.'},{a:[3.75,-7.5],b:[3.75,7.5],side:1,name:'Fold the stack at the last quarter line.'}]};
const status=t=>$('fold-status').textContent=t;
function stop(){animation=null;$('replay').textContent='▶ Replay my folds';$('preview').textContent='▶ Preview fold';}
function apply(source,f,a=180,flat=false){
  if(f.layers!=='top') return flat?commit(source,f):foldPanels(source,f,a);
  const rest=source.slice(0,-1),last=source.slice(-1);
  return [...rest,...(flat?commit(last,f):foldPanels(last,f,a))];
}
function rebuild(){panels=sheet();for(const f of steps.slice(0,cursor))panels=apply(panels,f,180,true);}
function save(){try{localStorage.setItem(KEY,JSON.stringify({version:2,steps,cursor,color:$('color').value}));$('saved').textContent='Saved on this device';}catch{$('saved').textContent='Use Save project to keep your work';}}
function clearGroup(){for(const child of [...group.children]){group.remove(child);child.geometry?.dispose();child.material?.dispose();}}
function draw(){
 clearGroup();
 const visible=pending?apply(panels,pending,angle):panels;
 visible.forEach((p,i)=>{
   const positions=[];
   for(let j=1;j<p.points.length-1;j++) for(const k of [0,j,j+1]) {const v=p.points[k];positions.push(v[0],v[1],(v[2]||0)+i*.018);}
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
   // Two coincident single-sided surfaces preserve front/reverse identity as a panel turns.
   for(const face of [0,1]){const mat=new THREE.MeshStandardMaterial({color:face===0?$('color').value:'#fff5dc',roughness:.94,side:face===0?THREE.FrontSide:THREE.BackSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});group.add(new THREE.Mesh(geometry.clone(),mat));}
   geometry.dispose();
   const edgePoints=p.points.map(v=>new THREE.Vector3(v[0],v[1],(v[2]||0)+i*.018));edgePoints.push(edgePoints[0]);
   group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(edgePoints),new THREE.LineBasicMaterial({color:p.moving?0xffdf82:0x6f533e})));
 });
 if(pending){const a=pending.a,b=pending.b,dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy),cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2;
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(cx-dx/l*15,cy-dy/l*15,.4),new THREE.Vector3(cx+dx/l*15,cy+dy/l*15,.4)]),new THREE.LineDashedMaterial({color:0x8ee9e0,dashSize:.35,gapSize:.2}));line.computeLineDistances();group.add(line);
 const dot=new THREE.Mesh(new THREE.SphereGeometry(.18,12,8),new THREE.MeshBasicMaterial({color:0xffdf82}));dot.position.set(cx-dy/l*pending.side*2,cy+dx/l*pending.side*2,.5);group.add(dot);
 }
 $('angle').value=angle;$('angle-value').textContent=`${Math.round(angle)}°`;$('count').textContent=cursor;$('panels').textContent=visible.length;
 $('commit').disabled=!pending;$('preview').disabled=!pending;$('cancel').disabled=!pending;$('angle').disabled=!pending;$('undo').disabled=!cursor&&!pending;$('redo').disabled=cursor>=steps.length;
 $('timeline').max=steps.length;$('timeline').value=cursor;
 $('history').replaceChildren(...steps.map((f,i)=>{const li=document.createElement('li'),b=document.createElement('button');b.type='button';b.textContent=`${String(i+1).padStart(2,'0')} · ${f.name || 'Custom crease'} · ${f.direction}`;b.setAttribute('aria-current',i===cursor-1?'step':'false');b.onclick=()=>seek(i+1);li.append(b);return li;}));
}
function seek(n){stop();cursor=n;pending=null;angle=0;rebuild();draw();save();status(`Showing ${cursor} of ${steps.length} kept folds. Undo and redo or scrub to rehearse.`);}
function begin(f){stop();if(steps.length>=80&&cursor>=80){status('This sheet has 80 folds. Save it and start a new sheet.');return;}
 f={direction:$('direction').value,layers:$('layers').value,side,...f};const source=f.layers==='top'?panels.slice(-1):panels;
 if(!validFold(source,f)){status('That crease misses the selected paper or lies on its edge. Place it through the paper.');return;}
 pending=f;angle=0;draw();status('Crease ready. Move the angle slider, preview the motion, then crease & keep.');$('real-help').textContent=`${f.name || 'Custom fold'}. Move the marked side ${f.direction==='valley'?'toward you':'away from you'}. Check alignment before pressing the crease.`;
}
function keep(){if(!pending)return;stop();steps=steps.slice(0,cursor);steps.push({...pending});cursor++;pending=null;angle=0;rebuild();draw();save();status('Fold kept. Place another crease or replay your steps with real paper.');}
function view(isTop){top=isTop;controls.enableRotate=!top;camera.position.set(...(top?[0,-.01,29]:[14,-19,22]));controls.target.set(0,0,0);controls.update();$('view-label').textContent=top?'TOP VIEW':'ORBIT VIEW';$('top').setAttribute('aria-pressed',top);$('orbit').setAttribute('aria-pressed',!top);}
$('top').onclick=()=>view(true);$('orbit').onclick=()=>view(false);$('fit').onclick=()=>view(top);
$('new').onclick=()=>{stop();steps=[];cursor=0;recipeStep=0;pending=null;angle=0;panels=sheet();draw();save();status('Fresh 15 cm sheet ready.');};
$('undo').onclick=()=>{if(pending){stop();pending=null;angle=0;draw();}else seek(Math.max(0,cursor-1));};$('redo').onclick=()=>seek(Math.min(steps.length,cursor+1));
$('angle').oninput=()=>{stop();if(top)view(false);angle=Number($('angle').value);draw();};$('commit').onclick=keep;$('cancel').onclick=()=>{stop();pending=null;angle=0;draw();};
$('preview').onclick=()=>{if(animation){stop();return;}if(!pending)return;if(top)view(false);angle=0;animation={type:'fold',start:performance.now()};$('preview').textContent='Pause preview';};
$('direction').onchange=()=>{if(pending){stop();pending.direction=$('direction').value;draw();}};$('layers').onchange=()=>{if(pending)begin({...pending,layers:$('layers').value});};
$('side').onclick=()=>{side*=-1;if(pending){stop();pending.side*=-1;draw();}status('Moving side switched. Look for the gold marker.');};
$('color').oninput=()=>{draw();save();};
const preset={horizontal:[[-7.5,0],[7.5,0]],vertical:[[0,-7.5],[0,7.5]],diagonal:[[-7.5,-7.5],[7.5,7.5]],other:[[-7.5,7.5],[7.5,-7.5]]};
for(const b of document.querySelectorAll('[data-crease]'))b.onclick=()=>{const [a,c]=preset[b.dataset.crease];begin({a,b:c,name:b.textContent});};
$('rotation').oninput=()=>$('rotation-value').textContent=`${$('rotation').value}°`;
$('place').onclick=()=>{const t=Number($('rotation').value)*Math.PI/180,o=Number($('offset').value);if(!Number.isFinite(o)||Math.abs(o)>10){status('Choose an offset between −10 and 10 cm.');return;}const x=-Math.sin(t)*o,y=Math.cos(t)*o;begin({a:[x-Math.cos(t)*15,y-Math.sin(t)*15],b:[x+Math.cos(t)*15,y+Math.sin(t)*15],name:`${$('rotation').value}° crease at ${o} cm`});};
const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),0);
function point(e){const r=canvas.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const p=new THREE.Vector3();if(!ray.ray.intersectPlane(plane,p))return null;const snap=$('snap').checked?3.75:0;return [p.x,p.y].map(v=>snap?Math.round(v/snap)*snap:v);}
canvas.onpointerdown=e=>{if(!top||e.button!==0)return;drag=point(e);canvas.setPointerCapture(e.pointerId);};
canvas.onpointermove=e=>{if(!drag)return;const b=point(e);if(b&&Math.hypot(b[0]-drag[0],b[1]-drag[1])>.2){pending={a:drag,b,side,direction:$('direction').value,layers:$('layers').value,name:'Hand-placed crease'};angle=0;draw();}};
canvas.onpointerup=e=>{if(!drag)return;const a=drag,b=point(e);drag=null;pending=null;if(b)begin({a,b,name:'Hand-placed crease'});};canvas.onpointercancel=()=>{drag=null;pending=null;draw();};
$('recipe').onchange=()=>{recipeStep=0;$('new').click();$('recipe-help').textContent=$('recipe').value==='free'?'Draw your own crease or use the precise controls.':'Load one step, preview it, and keep it before loading the next.';};
$('next').onclick=()=>{if(pending){status('Keep or cancel the current preview first.');return;}const recipe=recipes[$('recipe').value];if(!recipe){status('Choose a recipe to load a guided fold.');return;}if(recipeStep>=recipe.length){status('Recipe complete. Inspect the shape in orbit view, then make it in paper.');return;}const f=recipe[recipeStep];begin({...f,direction:'valley',layers:'all'});if(pending){recipeStep++;$('recipe-help').textContent=`${recipeStep} / ${recipe.length}: ${f.name}`;}};
$('timeline').oninput=()=>seek(Number($('timeline').value));
$('replay').onclick=()=>{if(animation){stop();return;}if(!steps.length){status('Keep at least one fold to replay it.');return;}view(false);cursor=0;panels=sheet();pending=steps[0];angle=0;animation={type:'replay',start:performance.now()};$('replay').textContent='Pause replay';status('Follow each movement with your real sheet. Pause whenever you need.');draw();};
function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('save').onclick=()=>download('origami-project.json',JSON.stringify({version:2,steps,cursor,color:$('color').value},null,2),'application/json');
function load(data){if(data.version!==2||!Array.isArray(data.steps)||data.steps.length>80)throw Error('Invalid project');let check=sheet();for(const f of data.steps){if(!['valley','mountain'].includes(f.direction)||![1,-1].includes(f.side)||!['all','top'].includes(f.layers)||![f.a,f.b].every(p=>Array.isArray(p)&&p.length===2&&p.every(v=>Number.isFinite(v)&&Math.abs(v)<=100))||!validFold(f.layers==='top'?check.slice(-1):check,f)||check.length>4000)throw Error('Invalid fold');check=apply(check,f,180,true);}stop();steps=data.steps.map(f=>({...f,name:String(f.name||'Custom crease').slice(0,150)}));cursor=Number.isInteger(data.cursor)?Math.max(0,Math.min(steps.length,data.cursor)):steps.length;if(/^#[0-9a-f]{6}$/i.test(data.color))$('color').value=data.color;pending=null;angle=0;rebuild();draw();save();}
$('open').onclick=()=>$('file').click();$('file').onchange=async()=>{try{const file=$('file').files[0];if(!file)return;if(file.size>200000)throw Error();load(JSON.parse(await file.text()));status('Project opened. Scrub the history to rehearse.');}catch{status('Could not open this project. Choose a Paper Studio project JSON file.');}$('file').value='';};
$('export').onclick=()=>download('origami-fold-guide.txt',`PAPER STUDIO · 15 × 15 cm\nColored side up. Coordinates in cm from sheet center; +x right, +y up.\nStraight crease lines extend through the paper.\n\n${steps.slice(0,cursor).map((f,i)=>`${i+1}. ${f.name}\n   Line: (${f.a.map(v=>v.toFixed(2))}) to (${f.b.map(v=>v.toFixed(2))}).\n   ${f.direction}, ${f.layers==='top'?'top panel':'whole stack'}, moving side ${f.side===1?'left':'right'} when looking from first point to second. Fold 180°.\n`).join('\n')}\nCheck layers and alignment with real paper. Rigid-panel preview does not check collisions.`, 'text/plain');
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('fold-studio').requestFullscreen();}catch{status('Full screen is unavailable in this browser.');}};
document.addEventListener('fullscreenchange',()=>$('fullscreen').textContent=document.fullscreenElement?'Exit expanded view':'Expand studio');
canvas.addEventListener('keydown',e=>{if(e.key==='Escape')$('cancel').click();if(e.key==='Enter')keep();});
try{const saved=localStorage.getItem(KEY);if(saved)load(JSON.parse(saved));}catch{status('Start a fresh sheet; the saved project could not be restored.');}
view(true);draw();
SimKit.loop((dt,now)=>{syncSize();controls.update();if(animation){const progress=Math.max(0,Math.min(1,(now-animation.start)/Number($('speed').value)));angle=progress*180;draw();if(progress>=1){if(animation.type==='replay'){cursor++;panels=apply(panels,pending,180,true);if(cursor<steps.length){pending=steps[cursor];animation.start=now+500;angle=0;}else{pending=null;angle=0;stop();save();status('Replay complete. Your fold history is ready to rehearse again.');}draw();}else stop();}else if(progress<0){angle=0;draw();}}renderer.render(scene,camera);});
}
