(function(){'use strict';
const app=document.querySelector('[data-blueprint-app]');if(!app)return;
const svg=app.querySelector('[data-sheet]'),drawing=app.querySelector('[data-drawing]'),preview=app.querySelector('[data-preview]'),status=app.querySelector('[data-status]'),cursor=app.querySelector('[data-cursor]'),lineType=app.querySelector('[data-line-type]');
const NS='http://www.w3.org/2000/svg',key='classroomos-blueprint-v1';let tool='select',view='front',start=null,selected=null;
const undoStack=[],redoStack=[];
function checkpoint(){undoStack.push(JSON.stringify(state));if(undoStack.length>100)undoStack.shift();redoStack.length=0}
function cancel(){start=null;preview.replaceChildren()}
const hints={select:'Click an edge to select it; Delete removes it.',line:'Drag between two points. Hold Shift for a horizontal or vertical edge.',rect:'Drag opposite corners. Each small grid square represents 10 mm.',dimension:'Drag between the endpoints to measure. Place dimensions beside the object; diagonal drags measure true distance.'};
let state={front:[],top:[],right:[]};try{state={...state,...JSON.parse(localStorage.getItem(key)||'{}')}}catch(e){}
const snap=n=>{const step=Number(app.querySelector('[data-snap]').value);return Math.round(n/step)*step},point=e=>{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());let x=Math.max(0,Math.min(800,snap(q.x))),y=Math.max(0,Math.min(500,snap(q.y)));if(start&&e.shiftKey&&tool!=='rect'){if(Math.abs(x-start.x)>Math.abs(y-start.y))y=start.y;else x=start.x}return{x,y}};
function el(name,attrs={}){const n=document.createElementNS(NS,name);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n}
function save(){try{localStorage.setItem(key,JSON.stringify(state))}catch(e){}}
function shapeNode(s,i){let n;if(s.kind==='rect')n=el('rect',{x:Math.min(s.x1,s.x2),y:Math.min(s.y1,s.y2),width:Math.abs(s.x2-s.x1),height:Math.abs(s.y2-s.y1)});else n=el('line',{x1:s.x1,y1:s.y1,x2:s.x2,y2:s.y2});n.classList.add(s.kind==='dimension'?'draft-dimension':'draft-object');if(s.type==='hidden')n.classList.add('draft-hidden');if(s.type==='center')n.classList.add('draft-center');n.dataset.index=i;if(s.kind==='dimension'){const dx=s.x2-s.x1,dy=s.y2-s.y1,mm=Math.round(Math.hypot(dx,dy)/2);const t=el('text',{x:(s.x1+s.x2)/2,y:(s.y1+s.y2)/2-8,'text-anchor':'middle',class:'draft-dimension-text'});t.textContent=mm+' mm';const g=el('g',{'data-index':i});g.append(n,t);return g}return n}
function render(){drawing.replaceChildren();state[view].forEach((s,i)=>drawing.append(shapeNode(s,i)));selected=null;app.querySelector('[data-view-label]').textContent=view.toUpperCase()+' VIEW · 1 square = 10 mm';review()}
function review(){
 const all=Object.values(state),flat=all.flat(),geometry=flat.filter(x=>x.kind!=='dimension');
 setCheck('views',all.every(a=>a.some(x=>x.kind!=='dimension')));
 setCheck('dimensions',all.every(a=>a.some(x=>x.kind==='dimension')));
 setCheck('line',geometry.some(x=>x.type==='hidden'||x.type==='center'));
 setCheck('fit',geometry.length>0&&flat.every(x=>Math.min(x.x1,x.x2)>=20&&Math.max(x.x1,x.x2)<=780&&Math.min(x.y1,x.y2)>=60&&Math.max(x.y1,x.y2)<=480&&!(Math.max(x.x1,x.x2)>495&&Math.max(x.y1,x.y2)>400)));
 app.querySelector('[data-progress]').textContent=app.querySelectorAll('.bp-checks .is-done').length+' / 4';
 const hasOutline=state[view].some(x=>x.kind!=='dimension'),hasDim=state[view].some(x=>x.kind==='dimension');
 const guides={front:'Front = width × height. Limit: 120 × 80 mm. Match width in the top view and height in the right view.',top:'Top = width × depth. Limit: 120 × 90 mm. Locate the phone slot and pencil compartment here.',right:'Right = depth × height. Limit: 90 × 80 mm. Use hidden lines for features behind a visible face.'};
 app.querySelector('[data-view-guide]').textContent=guides[view];
 app.querySelector('[data-coach-title]').textContent=!hasOutline?'01 / Establish the silhouette':!hasDim?'02 / Communicate size':'03 / Resolve the details';
 app.querySelector('[data-coach]').textContent=!hasOutline?'Choose Rectangle and drag the outside shape. Count grid squares: each is 10 mm. Leave room around the outline for dimensions.':!hasDim?'Choose Dimension. Drag across the width or height of an edge; the label reports its length in mm. Keep labels readable.':'Add the interior features, then show an unseen edge with Hidden line. Switch views and check that shared dimensions agree.';
 app.querySelector('[data-action="undo"]').disabled=!undoStack.length;
 app.querySelector('[data-action="redo"]').disabled=!redoStack.length;
}
function setCheck(name,on){app.querySelector('[data-check="'+name+'"]').classList.toggle('is-done',on)}
function setTool(next){cancel();tool=next;app.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===tool)));status.textContent=hints[tool]}
app.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
app.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{cancel();view=b.dataset.view;app.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));render();status.textContent=view[0].toUpperCase()+view.slice(1)+' view ready.'}));
const viewTabs=[...app.querySelectorAll('[data-view]')];
viewTabs.forEach((tab,index)=>tab.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?2:(index+(e.key==='ArrowRight'?1:2))%3;viewTabs[next].focus();viewTabs[next].click()}));
svg.addEventListener('pointermove',e=>{const p=point(e);cursor.textContent=(p.x/2)+', '+(p.y/2)+' mm';if(!start)return;preview.replaceChildren();const s={kind:tool,type:lineType.value,x1:start.x,y1:start.y,x2:p.x,y2:p.y};preview.append(shapeNode(s,-1));status.textContent=tool==='rect'?'Width '+Math.abs(p.x-start.x)/2+' mm × height '+Math.abs(p.y-start.y)/2+' mm':Math.round(Math.hypot(p.x-start.x,p.y-start.y)/2)+' mm · release to place'});
svg.addEventListener('pointercancel',cancel);
svg.addEventListener('lostpointercapture',cancel);
svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;svg.focus();if(tool==='select'){const target=e.target.closest('[data-index]');drawing.querySelectorAll('.is-selected').forEach(x=>x.classList.remove('is-selected'));selected=target?Number(target.dataset.index):null;if(target)target.classList.add('is-selected');status.textContent=target?'Shape selected. Press Delete to remove it.':'Nothing selected.';return}start=point(e);svg.setPointerCapture(e.pointerId)});
svg.addEventListener('pointerup',e=>{if(!start||tool==='select')return;const p=point(e);preview.replaceChildren();if(p.x!==start.x||p.y!==start.y){checkpoint();state[view].push({kind:tool,type:lineType.value,x1:start.x,y1:start.y,x2:p.x,y2:p.y});save();render();status.textContent=tool+' added to '+view+' view.'}start=null});
function removeSelected(){if(selected===null)return;checkpoint();state[view].splice(selected,1);save();render();status.textContent='Selected shape removed.'}
app.addEventListener('keydown',e=>{if(/input|select|textarea/i.test(e.target.tagName))return;if(e.key==='Escape'){cancel();return}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();history(e.shiftKey);return}if(e.ctrlKey||e.metaKey||e.altKey)return;const map={v:'select',l:'line',r:'rect',d:'dimension'};if(map[e.key.toLowerCase()])setTool(map[e.key.toLowerCase()]);if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeSelected()}});
function history(redo=false){const from=redo?redoStack:undoStack,to=redo?undoStack:redoStack;if(!from.length)return;cancel();to.push(JSON.stringify(state));state=JSON.parse(from.pop());save();render();status.textContent=redo?'Change restored.':'Change undone.'}
app.querySelector('[data-action="undo"]').addEventListener('click',()=>history());
app.querySelector('[data-action="redo"]').addEventListener('click',()=>history(true));
app.querySelector('[data-action="delete"]').addEventListener('click',removeSelected);
app.querySelector('[data-action="clear"]').addEventListener('click',()=>{if(!state[view].length)return;cancel();checkpoint();state[view]=[];save();render();status.textContent=view+' view cleared. Undo restores it.'});
app.querySelector('[data-zoom]').addEventListener('change',e=>{svg.style.width=(Number(e.target.value)*100)+'%'});
const fullscreenButton=app.querySelector('[data-action="fullscreen"]');
function syncFullscreen(){fullscreenButton.textContent=document.fullscreenElement===app||app.classList.contains('is-immersive')?'↙ Exit fullscreen':'⛶ Enter fullscreen'}
fullscreenButton.addEventListener('click',async()=>{
 if(document.fullscreenElement===app){await document.exitFullscreen();return}
 if(app.classList.contains('is-immersive')){app.classList.remove('is-immersive');document.body.classList.remove('bp-immersed');syncFullscreen();return}
 try{if(!app.requestFullscreen)throw new Error('unsupported');await app.requestFullscreen()}catch(e){app.classList.add('is-immersive');document.body.classList.add('bp-immersed');syncFullscreen()}
});
document.addEventListener('fullscreenchange',syncFullscreen);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&app.classList.contains('is-immersive')){app.classList.remove('is-immersive');document.body.classList.remove('bp-immersed');syncFullscreen();fullscreenButton.focus()}});
app.querySelector('[data-action="export"]').addEventListener('click',()=>{const clone=svg.cloneNode(true);clone.querySelector('[data-preview]').replaceChildren();clone.style.width='';clone.setAttribute('xmlns',NS);clone.querySelectorAll('.is-selected').forEach(n=>n.classList.remove('is-selected'));const styles=el('style');styles.textContent='.draft-object{fill:none;stroke:#d8f7ff;stroke-width:3}.draft-hidden{stroke-dasharray:9 7}.draft-center{stroke-dasharray:20 6 4 6;stroke-width:1.5}.draft-dimension{stroke:#ffae42;stroke-width:1.5;marker-start:url(#dimArrow);marker-end:url(#dimArrow)}.draft-dimension-text{fill:#ffae42;font:14px monospace}.bp-sheet-view{fill:#d8f7ff;font:16px monospace}.bp-title-block{fill:none;stroke:#d8f7ff}.bp-title-block text{fill:#d8f7ff;stroke:none;font:12px monospace}';clone.prepend(styles);const bg=el('rect',{width:800,height:500,fill:'#073e70'});clone.insertBefore(bg,clone.querySelector('rect'));clone.setAttribute('color','#d8f7ff');const blob=new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='desk-organizer-'+view+'-view.svg';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);status.textContent='SVG downloaded.'});
render();
}());
