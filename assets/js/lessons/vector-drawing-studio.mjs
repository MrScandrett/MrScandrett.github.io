// SVG artwork is kept as data; guides and grid never enter exported files.
const root = document.querySelector('#path-studio');
const $ = id => document.getElementById(`vs-${id}`);
const ns = 'http://www.w3.org/2000/svg';
const storageKey = 'classroom-path-studio-v1';
const types = ['rect', 'ellipse', 'polygon', 'curve', 'pen', 'text'];
let objects = [], selected = null, tool = 'select', gesture = null, penPoints = [];
let history = [], future = [], missions = {}, uid = 0;
let defaults = {fill:'#176b65', stroke:'#163d47', strokeWidth:0, opacity:100};
const copy = value => JSON.parse(JSON.stringify(value));
const current = () => objects.find(o => o.id === selected);
const status = message => { $('status').textContent = message; };
function svgNode(tag, attrs = {}, parent) {
  const node = document.createElementNS(ns, tag);
  Object.entries(attrs).forEach(([k,v]) => node.setAttribute(k,v));
  if (parent) parent.append(node);
  return node;
}
function make(type, x, y, w, h, extra = {}) {
  return {id:++uid, type, name:type === 'curve' ? 'Bézier curve' : type[0].toUpperCase()+type.slice(1), x,y,w,h,rotation:0,visible:true,...defaults,...extra};
}
function starter() {
  objects = [
    make('ellipse',160,80,320,320,{name:'Golden disc',fill:'#edb854'}),
    make('curve',220,130,200,190,{name:'Canopy · edit my handles',fill:'#176b65',points:[[0,100],[0,0],[100,0],[100,100]],closed:true}),
    make('rect',312,242,12,108,{name:'Stem',fill:'#fffdf7',rotation:18}),
    make('text',200,415,240,32,{name:'Club name',text:'GROW TOGETHER',fill:'#173f3e'})
  ]; selected = objects[1].id;
}
function snapshot() { return JSON.stringify({objects,missions}); }
function remember(before) {
  if (before !== snapshot()) { history.push(before); if(history.length>80) history.shift(); future=[]; }
  persist(); render();
}
function change(fn) { const before=snapshot(); fn(); remember(before); }
function persist() {
  try {
    localStorage.setItem(storageKey,JSON.stringify({version:1,objects,missions,notes:document.getElementById('design-notes').value}));
    $('save-status').textContent='Saved in this browser';
  } catch { $('save-status').textContent='Storage unavailable · download a project'; }
}
function mission(key) { missions[key]=true; }
function shape(o, parent) {
  const attrs = {fill:o.fill,stroke:o.stroke,'stroke-width':o.strokeWidth,opacity:o.opacity/100,'vector-effect':'non-scaling-stroke'};
  let node;
  if(o.type==='rect') node=svgNode('rect',{x:0,y:0,width:o.w,height:o.h,...attrs});
  if(o.type==='ellipse') node=svgNode('ellipse',{cx:o.w/2,cy:o.h/2,rx:o.w/2,ry:o.h/2,...attrs});
  if(o.type==='polygon') node=svgNode('polygon',{points:`${o.w/2},0 ${o.w},${o.h} 0,${o.h}`,...attrs});
  if(o.type==='curve') {
    const p=o.points.map(([x,y])=>`${x*o.w/100} ${y*o.h/100}`);
    node=svgNode('path',{d:`M ${p[0]} C ${p[1]} ${p[2]} ${p[3]}${o.closed?' Z':''}`,...attrs});
  }
  if(o.type==='pen') node=svgNode('path',{d:o.points.map(([x,y],i)=>`${i?'L':'M'} ${x*o.w/100} ${y*o.h/100}`).join(' ')+(o.closed?' Z':''),...attrs,'stroke-linejoin':'round'});
  if(o.type==='text') {
    node=svgNode('text',{x:0,y:o.h*.8,'font-family':'system-ui, sans-serif','font-weight':800,'font-size':o.h,textLength:o.w,lengthAdjust:'spacingAndGlyphs',...attrs});
    node.textContent=o.text || 'YOUR MARK';
  }
  const group=svgNode('g',{'data-object':o.id,transform:`translate(${o.x} ${o.y}) rotate(${o.rotation} ${o.w/2} ${o.h/2})`},parent);
  if(!o.visible) group.setAttribute('display','none');
  group.append(node); return group;
}
function render() {
  $('objects').replaceChildren();
  objects.forEach(o=>shape(o,$('objects')));
  renderGuides(); renderLayers(); syncFields();
  $('canvas').dataset.tool=tool;
  root.querySelector('[data-command=undo]').disabled=!history.length;
  root.querySelector('[data-command=redo]').disabled=!future.length;
  document.querySelectorAll('[data-mission]').forEach(el=>{
    const labels={shapes:'Three shapes added',curve:'Curve handle edited',arrange:'Stacking order changed',export:'SVG exported'};
    if(missions[el.dataset.mission]) el.textContent=`✓ ${labels[el.dataset.mission]}`;
    else el.textContent={shapes:'○ Add three shapes',curve:'○ Edit a curve handle',arrange:'○ Change the stacking order',export:'○ Export your SVG'}[el.dataset.mission];
  });
}
function renderGuides() {
  const g=$('guides'); g.replaceChildren(); const o=current();
  if(o?.visible) {
    const group=svgNode('g',{transform:`translate(${o.x} ${o.y}) rotate(${o.rotation} ${o.w/2} ${o.h/2})`},g);
    svgNode('rect',{x:-3,y:-3,width:o.w+6,height:o.h+6,fill:'none',stroke:'#176b65','stroke-width':1.5,'stroke-dasharray':'5 4','vector-effect':'non-scaling-stroke','pointer-events':'none'},group);
    if(tool==='nodes' && (o.type==='curve'||o.type==='pen')) {
      const pts=o.points.map(([x,y])=>[x*o.w/100,y*o.h/100]);
      if(o.type==='curve') [[0,1],[3,2]].forEach(([a,b])=>svgNode('line',{x1:pts[a][0],y1:pts[a][1],x2:pts[b][0],y2:pts[b][1],stroke:'#ad5b14','stroke-width':1.5,'vector-effect':'non-scaling-stroke','pointer-events':'none'},group));
      pts.forEach(([x,y],i)=>{
        const control=o.type==='curve'&&(i===1||i===2);
        const node=svgNode(control?'circle':'rect',control?{cx:x,cy:y,r:7}:{x:x-6,y:y-6,width:12,height:12},group);
        Object.entries({fill:control?'#edb854':'#fff',stroke:'#173f3e','stroke-width':2,'data-node':i,'vector-effect':'non-scaling-stroke',cursor:'grab'}).forEach(([k,v])=>node.setAttribute(k,v));
      });
    }
  }
  if(penPoints.length) {
    svgNode('polyline',{points:penPoints.map(p=>p.join(',')).join(' '),fill:'none',stroke:defaults.stroke,'stroke-width':Math.max(defaults.strokeWidth,2),'stroke-dasharray':'4 3','pointer-events':'none'},g);
    penPoints.forEach(([cx,cy],i)=>svgNode('circle',{cx,cy,r:i?4:8,fill:i?'#176b65':'#edb854',stroke:'#173f3e','pointer-events':'none'},g));
  }
}
function renderLayers() {
  const panel=$('layers'); panel.replaceChildren();
  if(!objects.length) { panel.textContent='An empty artboard. Draw your first shape.'; return; }
  [...objects].reverse().forEach(o=>{
    const row=document.createElement('div'); row.className=`vs-layer${o.id===selected?' selected':''}`;
    const select=document.createElement('button'); select.textContent=o.name;select.type='button';select.setAttribute('aria-pressed',String(o.id===selected));
    select.addEventListener('click',()=>{selected=o.id;render();status(`Selected ${o.name}.`);});
    const eye=document.createElement('button'); eye.type='button';eye.textContent=o.visible?'Hide':'Show';eye.setAttribute('aria-label',`${o.visible?'Hide':'Show'} ${o.name}`);
    eye.addEventListener('click',()=>change(()=>{o.visible=!o.visible;})); row.append(select,eye);panel.append(row);
  });
}
const fieldMap={name:'name',fill:'fill',stroke:'stroke','stroke-width':'strokeWidth',x:'x',y:'y',width:'w',height:'h',rotation:'rotation',opacity:'opacity',text:'text'};
function syncFields() {
  const o=current(); $('selection-label').textContent=o?o.type:'New object style';
  Object.entries(fieldMap).forEach(([id,key])=>{
    const el=$(id); const style=['fill','stroke','stroke-width','opacity'].includes(id);
    el.disabled=!o&&!style || id==='text'&&o?.type!=='text';
    const val=o?.[key]??defaults[key]??'';
    if(document.activeElement!==el) el.value=key==='fill'&&val==='none'?'#176b65':typeof val==='number'?Math.round(val*100)/100:val;
  });
  $('no-fill').checked=(o?.fill??defaults.fill)==='none';
  ['duplicate','delete','center-x','center-y','raise','lower'].forEach(cmd=>root.querySelector(`[data-command="${cmd}"]`).disabled=!o);
}
Object.entries(fieldMap).forEach(([id,key])=>$(id).addEventListener('change',e=>{
  const el=e.target; if(el.type==='number'&&(!el.checkValidity()||!Number.isFinite(el.valueAsNumber))){syncFields();return;}
  change(()=>{const o=current(); const value=el.type==='number'?el.valueAsNumber:el.value;
    if(o)o[key]=value;
    if(['fill','stroke','strokeWidth','opacity'].includes(key)) defaults[key]=value;
  });
}));
$('no-fill').addEventListener('change',e=>change(()=>{const fill=e.target.checked?'none':$('fill').value;if(current())current().fill=fill;defaults.fill=fill;}));
const tips={select:'Select an object; drag to move. Arrow keys nudge. Properties resize or rotate.',nodes:'Select a curve or pen path. Drag square anchors or round Bézier handles.',rect:'Drag a rectangle. Hold Shift for a square.',ellipse:'Drag an ellipse. Hold Shift for a circle.',polygon:'Drag a triangle. Hold Shift for equal width and height.',curve:'Drag between two endpoints. Then use Nodes to pull the round handles.',pen:'Click to add corners. Click the first point to close; Enter finishes; Escape cancels.',text:'Click to add text. Change the words and size in Design properties.'};
function setTool(next) {
  if(penPoints.length) finishPen();
  tool=next; root.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===tool)));
  $('tool-tip').textContent=tips[tool]; renderGuides();$('canvas').dataset.tool=tool;
}
root.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
function point(e) {
  const p=new DOMPoint(e.clientX,e.clientY).matrixTransform($('canvas').getScreenCTM().inverse());
  const snap=$('snap').checked?20:1;
  return [Math.max(0,Math.min(640,Math.round(p.x/snap)*snap)),Math.max(0,Math.min(480,Math.round(p.y/snap)*snap))];
}
function localPoint(o,p) {
  const angle=-o.rotation*Math.PI/180,dx=p[0]-o.x-o.w/2,dy=p[1]-o.y-o.h/2;
  return [(dx*Math.cos(angle)-dy*Math.sin(angle)+o.w/2)/o.w*100,(dx*Math.sin(angle)+dy*Math.cos(angle)+o.h/2)/o.h*100];
}
function checkShapes(){if(objects.filter(o=>o.type!=='text').length>=3)mission('shapes');}
function finishPen(closed=false) {
  if(penPoints.length<2){penPoints=[];renderGuides();return;}
  change(()=>{
    const xs=penPoints.map(p=>p[0]),ys=penPoints.map(p=>p[1]);
    const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(1,Math.max(...xs)-x),h=Math.max(1,Math.max(...ys)-y);
    const o=make('pen',x,y,w,h,{points:penPoints.map(p=>[(p[0]-x)/w*100,(p[1]-y)/h*100]),closed,fill:closed?defaults.fill:'none',strokeWidth:closed?defaults.strokeWidth:Math.max(2,defaults.strokeWidth)});
    objects.push(o);selected=o.id;penPoints=[];checkShapes();
  }); status('Path created. Use Nodes to edit its corners.');
}
$('canvas').addEventListener('pointerdown',e=>{
  if(e.button!==0||gesture)return;e.preventDefault();$('canvas').focus({preventScroll:true});
  const p=point(e), hit=e.target.closest('[data-object]');
  if(tool==='pen') {
    if(penPoints.length>=3&&Math.hypot(p[0]-penPoints[0][0],p[1]-penPoints[0][1])<14){finishPen(true);return;}
    penPoints.push(p);renderGuides();status(`${penPoints.length} points · click first point to close, Enter to finish.`);return;
  }
  if(tool==='text') {change(()=>{const o=make('text',p[0],p[1],220,36,{text:'YOUR MARK'});objects.push(o);selected=o.id;});setTool('select');$('text').focus();$('text').select();return;}
  const before=snapshot();
  if(tool==='select'||tool==='nodes') {
    const handle=e.target.closest('[data-node]');
    if(tool==='nodes'&&handle&&current()) gesture={mode:'node',index:Number(handle.dataset.node),before,start:p,original:copy(current()),id:e.pointerId};
    else {
      selected=hit?Number(hit.dataset.object):null;
      if(current()) gesture={mode:'move',before,start:p,original:copy(current()),id:e.pointerId};
      render();
    }
  } else {
    const o=make(tool,p[0],p[1],1,1,tool==='curve'?{points:[[0,100],[0,0],[100,0],[100,100]],closed:false,fill:'none',strokeWidth:Math.max(3,defaults.strokeWidth)}:{});
    objects.push(o);selected=o.id;gesture={mode:'draw',before,start:p,original:copy(o),id:e.pointerId};render();
  }
  if(gesture)$('canvas').setPointerCapture(e.pointerId);
});
$('canvas').addEventListener('pointermove',e=>{
  if(!gesture||gesture.id!==e.pointerId)return;
  const p=point(e),o=current(); if(!o)return;
  if(gesture.mode==='move') {o.x=gesture.original.x+p[0]-gesture.start[0];o.y=gesture.original.y+p[1]-gesture.start[1];}
  if(gesture.mode==='node') {o.points[gesture.index]=localPoint(o,p);if(o.type==='curve'&&[1,2].includes(gesture.index))mission('curve');}
  if(gesture.mode==='draw') {
    let dx=p[0]-gesture.start[0],dy=p[1]-gesture.start[1];
    if(e.shiftKey){const side=Math.max(Math.abs(dx),Math.abs(dy));dx=(dx<0?-1:1)*side;dy=(dy<0?-1:1)*side;}
    o.x=gesture.start[0]+Math.min(0,dx);o.y=gesture.start[1]+Math.min(0,dy);o.w=Math.max(1,Math.abs(dx));o.h=Math.max(1,Math.abs(dy));
  }
  // Keep panel focus intact while updating artwork during pointer gestures.
  $('objects').replaceChildren();objects.forEach(obj=>shape(obj,$('objects')));renderGuides();syncFields();
});
function endGesture(e,cancel=false){
  if(!gesture||gesture.id!==e.pointerId)return;
  const g=gesture;gesture=null;
  if(cancel){const prior=JSON.parse(g.before);objects=prior.objects;missions=prior.missions;if(!current())selected=null;render();return;}
  if(g.mode==='draw'&&current()&&(current().w<4||current().h<4)){objects=JSON.parse(g.before).objects;selected=null;render();status('Drag a little farther to draw a shape.');return;}
  if(g.mode==='draw')checkShapes();remember(g.before);
}
$('canvas').addEventListener('pointerup',e=>endGesture(e));
$('canvas').addEventListener('pointercancel',e=>endGesture(e,true));
$('grid').addEventListener('change',()=>{$('grid-art').style.display=$('grid').checked?'':'none';});
function zoom(){root.querySelector('.vs-paper').style.width=`${Number($('zoom').value)*100}%`;}
$('zoom').addEventListener('change',zoom);
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);status(`Downloaded ${name}.`);}
function exportSvg(){
  const svg=svgNode('svg',{xmlns:ns,viewBox:'0 0 640 480',width:640,height:480});
  const title=svgNode('title',{},svg);title.textContent='Emblem made in Path Studio';
  objects.filter(o=>o.visible).forEach(o=>shape(o,svg));
  return new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml;charset=utf-8'});
}
async function exportPng(){
  const url=URL.createObjectURL(exportSvg());
  try {const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=960;canvas.getContext('2d').drawImage(img,0,0,1280,960);canvas.toBlob(blob=>{if(blob)download(blob,'my-emblem.png');else status('PNG export failed. Try SVG.');});}
  catch{status('PNG export failed. Try SVG.');}finally{URL.revokeObjectURL(url);}
}
function undo(redo=false){
  const from=redo?future:history,to=redo?history:future;if(!from.length)return;
  to.push(snapshot());const data=JSON.parse(from.pop());objects=data.objects;missions=data.missions;selected=null;penPoints=[];persist();render();status(redo?'Change restored.':'Change undone.');
}
const commands={
  new:()=>change(()=>{objects=[];selected=null;missions={};penPoints=[];status('New artboard. Undo brings your previous artwork back.');}),
  starter:()=>change(()=>{starter();missions={};penPoints=[];status('Starter badge opened. Select the canopy and try Nodes.');}),
  undo:()=>undo(),redo:()=>undo(true),
  duplicate:()=>{if(current())change(()=>{const o=copy(current());o.id=++uid;o.x+=16;o.y+=16;o.name+=' copy';objects.push(o);selected=o.id;checkShapes();});},
  delete:()=>{if(current())change(()=>{objects=objects.filter(o=>o.id!==selected);selected=null;});},
  'center-x':()=>{if(current())change(()=>{current().x=(640-current().w)/2;});},
  'center-y':()=>{if(current())change(()=>{current().y=(480-current().h)/2;});},
  raise:()=>reorder(1),lower:()=>reorder(-1),
  fit:()=>{$('zoom').value='1';zoom();root.querySelector('.vs-canvas-scroll').scrollTo(0,0);},
  svg:()=>{download(exportSvg(),'my-emblem.svg');mission('export');persist();render();},png:exportPng,
  save:()=>download(new Blob([JSON.stringify({version:1,objects,missions,notes:document.getElementById('design-notes').value},null,2)],{type:'application/json'}),'my-emblem.path-studio.json'),
  open:()=>{$('project-file').value='';$('project-file').click();},
  fullscreen:async()=>{
    if(document.fullscreenElement){await document.exitFullscreen();return;}
    if(root.classList.contains('vs-expanded')){root.classList.remove('vs-expanded');root.querySelector('[data-command=fullscreen]').textContent='Full screen';return;}
    try{await root.requestFullscreen();}catch{root.classList.add('vs-expanded');root.querySelector('[data-command=fullscreen]').textContent='Exit full screen';}
  }
};
function reorder(direction){const i=objects.findIndex(o=>o.id===selected);if(i<0||i+direction<0||i+direction>=objects.length){status('Object is already at the end of the stack.');return;}change(()=>{const [o]=objects.splice(i,1);objects.splice(i+direction,0,o);mission('arrange');});}
root.querySelectorAll('[data-command]').forEach(b=>b.addEventListener('click',()=>{if(gesture)return;commands[b.dataset.command]?.();}));
document.addEventListener('fullscreenchange',()=>{root.querySelector('[data-command=fullscreen]').textContent=document.fullscreenElement?'Exit full screen':'Full screen';});
root.addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea,select')||gesture)return;
  const mod=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
  if(mod&&k==='z'){e.preventDefault();undo(e.shiftKey);return;}
  if(mod&&k==='d'){e.preventDefault();commands.duplicate();return;}
  if(e.key==='Escape'){penPoints=[];selected=null;root.classList.remove('vs-expanded');root.querySelector('[data-command=fullscreen]').textContent=document.fullscreenElement?'Exit full screen':'Full screen';render();return;}
  if(e.key==='Enter'&&tool==='pen'){e.preventDefault();finishPen();return;}
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();commands.delete();return;}
  if(e.key.startsWith('Arrow')&&current()){
    e.preventDefault();change(()=>{const o=current(),n=e.shiftKey?10:1;if(k==='arrowleft')o.x-=n;if(k==='arrowright')o.x+=n;if(k==='arrowup')o.y-=n;if(k==='arrowdown')o.y+=n;});return;
  }
  if(mod||e.altKey)return;
  const tools={v:'select',a:'nodes',r:'rect',e:'ellipse',g:'polygon',c:'curve',p:'pen',t:'text'};
  if(tools[k]){e.preventDefault();setTool(tools[k]);}
});
// Only accept the studio's small data schema, never markup or executable SVG.
function validate(data){
  if(data?.version!==1||!Array.isArray(data.objects)||data.objects.length>300)throw Error('Unsupported project');
  const color=v=>v==='none'||/^#[0-9a-f]{6}$/i.test(v);
  const ids=new Set();
  const clean=data.objects.map(o=>{
    if(!types.includes(o.type)||!Number.isSafeInteger(o.id)||o.id<1||ids.has(o.id)||typeof o.name!=='string'||o.name.length>100||!color(o.fill)||!color(o.stroke)||typeof o.visible!=='boolean')throw Error('Invalid object');
    ids.add(o.id);
    for(const k of ['x','y','w','h','rotation','strokeWidth','opacity'])if(!Number.isFinite(o[k])||Math.abs(o[k])>10000)throw Error('Invalid dimensions');
    if(o.w<=0||o.h<=0||o.opacity<0||o.opacity>100||o.strokeWidth<0||o.strokeWidth>30)throw Error('Invalid properties');
    const clean={id:o.id,type:o.type,name:o.name,x:o.x,y:o.y,w:o.w,h:o.h,rotation:o.rotation,strokeWidth:o.strokeWidth,opacity:o.opacity,visible:o.visible,fill:o.fill,stroke:o.stroke};
    if(['curve','pen'].includes(o.type)){
      if(!Array.isArray(o.points)||o.points.length<2||o.points.length>500||(o.type==='curve'&&o.points.length!==4)||o.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||Math.abs(n)>10000)))throw Error('Invalid path');
      clean.points=copy(o.points);clean.closed=!!o.closed;
    }
    if(o.type==='text'){if(typeof o.text!=='string'||o.text.length>120)throw Error('Invalid text');clean.text=o.text;}
    return clean;
  });
  return {objects:clean,missions:Object.fromEntries(['shapes','curve','arrange','export'].map(k=>[k,data.missions?.[k]===true])),notes:typeof data.notes==='string'?data.notes.slice(0,20000):''};
}
$('project-file').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    if(file.size>2_000_000)throw Error('Project too large');const data=validate(JSON.parse(await file.text()));
    change(()=>{objects=data.objects;missions=data.missions;selected=null;penPoints=[];uid=Math.max(uid,...objects.map(o=>o.id));document.getElementById('design-notes').value=data.notes;});status('Editable project opened.');
  }catch{status('Could not open this file. Choose a Path Studio JSON project smaller than 2 MB. Your current artwork is kept.');}
});
const notes=document.getElementById('design-notes');notes.addEventListener('input',persist);
document.getElementById('export-notes').addEventListener('click',()=>download(new Blob([notes.value],{type:'text/plain;charset=utf-8'}),'emblem-reflection.txt'));
try {
  const saved=localStorage.getItem(storageKey);
  if(saved){const data=validate(JSON.parse(saved));objects=data.objects;missions=data.missions;notes.value=data.notes;uid=Math.max(0,...objects.map(o=>o.id));status('Your local workspace has been restored.');}
  else starter();
}catch{starter();$('save-status').textContent='Download a project to keep your work';}
render();
