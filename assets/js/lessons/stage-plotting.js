(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const NS='http://www.w3.org/2000/svg', KEY='classroomos-stage-plot-v1';
  const types={
    bench:{label:'Bench',w:6,d:2,fill:'#f7d797',stroke:'#695124'},
    table:{label:'Table',w:3,d:3,fill:'#f7d797',stroke:'#695124'},
    chair:{label:'Chair',w:2,d:2,fill:'#f7d797',stroke:'#695124'},
    platform:{label:'Platform / scenery',w:6,d:4,fill:'#f7d797',stroke:'#695124'},
    actor:{label:'Performer',w:2,d:2,fill:'#c7daef',stroke:'#224e78'},
    mic:{label:'Microphone',w:1.5,d:1.5,fill:'#d8d0ed',stroke:'#55447b'},
    speaker:{label:'Speaker / monitor',w:2,d:2,fill:'#d8d0ed',stroke:'#55447b'},
    piano:{label:'Keyboard / piano',w:5,d:4,fill:'#d8d0ed',stroke:'#55447b'},
    clear:{label:'Keep-clear area',w:4,d:10,fill:'#ddf0e8',stroke:'#23674f'},
    route:{label:'Movement arrow',w:6,d:1,fill:'#23674f',stroke:'#23674f'},
    custom:{label:'Custom item',w:3,d:3,fill:'#f0d5df',stroke:'#754559'}
  };
  const fresh=()=>({version:1,width:30,depth:20,unit:'ft',grid:2,snap:true,meta:{production:'',student:'',scene:'',revision:''},notes:'',items:[],nextId:1});
  let state=fresh(), selected=null, undo=[],redo=[],drag=null;
  const n=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
  const s=(tag,attrs={},text)=>{const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(text!==undefined)e.textContent=text;return e;};
  const num=v=>Math.round(v*10000)/10000;
  const fmt=v=>String(Number(v.toFixed(2)));
  const snapshot=()=>JSON.stringify(state);
  function valid(v) {
    const finite=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
    const factor=v?.unit==='m'?.3048:1;
    return v&&v.version===1&&finite(v.width,factor,300*factor)&&finite(v.depth,factor,300*factor)&&['ft','m'].includes(v.unit)&&finite(v.grid,.05*factor,20*factor)&&typeof v.snap==='boolean'&&
      v.meta&&typeof v.meta==='object'&&['production','student','scene','revision'].every(k=>typeof v.meta[k]==='string'&&v.meta[k].length<=20000)&&typeof v.notes==='string'&&v.notes.length<=20000&&
      Number.isInteger(v.nextId)&&v.nextId>0&&Array.isArray(v.items)&&v.items.length<=200&&new Set(v.items.map(i=>i.id)).size===v.items.length&&
      v.items.every(i=>Number.isInteger(i.id)&&i.id>0&&i.id<v.nextId&&Object.hasOwn(types,i.type)&&typeof i.label==='string'&&i.label.length<=100&&typeof i.notes==='string'&&i.notes.length<=20000&&
        finite(i.x,-300*factor,600*factor)&&finite(i.y,-300*factor,600*factor)&&finite(i.w,.1*factor,300*factor)&&finite(i.d,.1*factor,300*factor)&&finite(i.angle,0,359));
  }
  try {const draft=JSON.parse(localStorage.getItem(KEY));if(valid(draft))state=draft;}catch{}
  function save(message) {
    try {localStorage.setItem(KEY,snapshot());$('save-status').textContent=message||'Plan saved on this browser and device. Download a backup before moving computers or clearing browser data.';}catch{$('save-status').textContent='This browser cannot save your plan. Download a backup before leaving.';}
    $('layout-review').textContent='';
    if(!$('print-plot').hidden)buildPrint();
  }
  function history(before) {
    if(before!==snapshot()){undo.push(before);if(undo.length>60)undo.shift();redo=[];} updateHistory();save();
  }
  function updateHistory() {$('undo').disabled=!undo.length;$('redo').disabled=!redo.length;}
  function change(fn) {const before=snapshot();fn();history(before);render();}
  function active(){return state.items.find(i=>i.id===selected);}
  function fillEditor(){
    const item=active();$('item-editor').hidden=!item;$('item-empty').hidden=!!item;
    if(!item)return;
    ['label','x','y','angle','notes'].forEach(f=>$('item-'+f).value=item[f]);
    $('item-width').value=item.w;$('item-depth').value=item.d;
    const min=state.unit==='ft'?.1:.03048;$('item-width').min=min;$('item-depth').min=min;$('item-width').max=state.unit==='ft'?300:91.44;$('item-depth').max=state.unit==='ft'?300:91.44;
  }
  function select(id, redraw=true) {
    selected=Number(id)||null;$('item-select').value=selected||'';fillEditor();
    if(redraw)renderMap();
    else document.querySelectorAll('#stage-map [data-item]').forEach(g=>g.classList.toggle('selected',Number(g.dataset.item)===selected));
  }
  function render(){
    ['production','student','scene','revision'].forEach(f=>$(f).value=state.meta[f]);$('notes').value=state.notes;
    for(const id of ['stage-width','stage-depth']) { $(id).min=state.unit==='ft'?1:.3048; $(id).max=state.unit==='ft'?300:91.44; }
    $('stage-width').value=state.width;$('stage-depth').value=state.depth;$('units').value=state.unit;$('snap').checked=state.snap;
    const grid=$('grid');grid.querySelector('[data-custom]')?.remove();if(![...grid.options].some(o=>Number(o.value)===state.grid)){const option=n('option',`${fmt(state.grid)} ${state.unit}`);option.value=state.grid;option.dataset.custom='true';grid.append(option);}grid.value=state.grid;
    if(!active())selected=state.items[0]?.id||null;
    $('item-select').replaceChildren();if(!state.items.length){const o=n('option','No items yet');o.value='';$('item-select').append(o);}
    state.items.forEach((item,index)=>{const o=n('option',`${index+1}. ${item.label||types[item.type].label}`);o.value=item.id;$('item-select').append(o);});
    $('item-select').value=selected||'';fillEditor();renderMap();updateHistory();
  }
  function bounds(item) {
    const a=item.angle*Math.PI/180, c=Math.cos(a), q=Math.sin(a);
    // Plan y grows down the page; the student's Y measurement grows upstage.
    return [[-item.w/2,-item.d/2],[item.w/2,-item.d/2],[item.w/2,item.d/2],[-item.w/2,item.d/2]].map(([x,y])=>[item.x+x*c-y*q,state.depth-item.y+x*q+y*c]);
  }
  function overlaps(a,b){
    for(const poly of [a,b])for(let j=0;j<poly.length;j++){
      const p=poly[j],q=poly[(j+1)%poly.length],axis=[-(q[1]-p[1]),q[0]-p[0]];
      const A=a.map(v=>v[0]*axis[0]+v[1]*axis[1]),B=b.map(v=>v[0]*axis[0]+v[1]*axis[1]);
      if(Math.max(...A)<=Math.min(...B)+.0001||Math.max(...B)<=Math.min(...A)+.0001)return false;
    }return true;
  }
  function map(interactive=false){
    const W=state.width,D=state.depth,M=Math.max(W,D)*.12,F=M*.23;
    const svg=s('svg',{viewBox:`0 0 ${W+M*2} ${D+M*3}`,'aria-label':`Top view of a ${fmt(W)} by ${fmt(D)} ${state.unit} stage. Audience below; stage right is page left.`,role:interactive?'group':'img'});
    svg.append(s('title',{},'Stage layout: audience at bottom'),s('desc',{},'Items are numbered to match the item list. Stage left is the right side of this drawing.'));
    const text=(x,y,value,attrs={})=>s('text',{x,y,'font-family':'Arial, sans-serif','font-size':F,fill:'#213e55','text-anchor':'middle',...attrs},value);
    svg.append(s('rect',{x:0,y:0,width:W+M*2,height:D+M*3,fill:'#fff'}));
    svg.append(s('rect',{x:M,y:M,width:W,height:D,fill:'#f4f8fb',stroke:'#355f7d','stroke-width':M*.035}));
    for(let x=state.grid;x<W;x+=state.grid)svg.append(s('line',{x1:M+x,y1:M,x2:M+x,y2:M+D,stroke:'#c5d6e2','stroke-width':M*.013}));
    for(let y=state.grid;y<D;y+=state.grid)svg.append(s('line',{x1:M,y1:M+y,x2:M+W,y2:M+y,stroke:'#c5d6e2','stroke-width':M*.013}));
    svg.append(s('line',{x1:M+W/2,y1:M,x2:M+W/2,y2:M+D,stroke:'#587a91','stroke-width':M*.028,'stroke-dasharray':`${F} ${F*.5}`}));
    svg.append(text(M+W/2,M*.32,`Upstage • width ${fmt(W)} ${state.unit}`));
    svg.append(text(M*.3,M+D/2,'Stage right',{transform:`rotate(-90 ${M*.3} ${M+D/2})`}));
    svg.append(text(M+W+M*.7,M+D/2,'Stage left',{transform:`rotate(90 ${M+W+M*.7} ${M+D/2})`}));
    svg.append(text(M+W/2,M+D+M*.45,'Downstage edge • Audience'));
    svg.append(text(M+W/2,M+D+M*.83,`Depth ${fmt(D)} ${state.unit} • grid ${fmt(state.grid)} ${state.unit}`));
    const bar=Math.min(state.grid*2,W/3);svg.append(s('line',{x1:M,y1:M+D+M*1.3,x2:M+bar,y2:M+D+M*1.3,stroke:'#213e55','stroke-width':M*.07}));
    for(const x of [M,M+bar])svg.append(s('line',{x1:x,y1:M+D+M*1.18,x2:x,y2:M+D+M*1.42,stroke:'#213e55','stroke-width':M*.03}));
    svg.append(text(M+bar/2,M+D+M*1.72,`${fmt(bar)} ${state.unit}`));
    svg.append(text(M+W,M+D+M*1.72,'Relative scale; use listed dimensions',{'text-anchor':'end','font-size':F*.82}));
    const itemLayer=s('g');svg.append(itemLayer);
    // Keep-clear areas go underneath physical items so the footprints remain visible.
    const sorted=[...state.items].sort((a,b)=>(a.type==='clear'?0:1)-(b.type==='clear'?0:1));
    sorted.forEach(item=>{
      const type=types[item.type],index=state.items.indexOf(item)+1;
      const g=s('g',{transform:`translate(${M+item.x} ${M+D-item.y})`,'data-item':item.id});
      if(interactive){g.setAttribute('tabindex','0');g.setAttribute('role','button');g.setAttribute('aria-label',`Item ${index}: ${item.label||type.label}. Use arrow keys to move.`);g.classList.toggle('selected',item.id===selected);}
      const shape=s('g',{transform:`rotate(${item.angle})`});
      const attrs={fill:type.fill,stroke:type.stroke,'stroke-width':M*.035,class:'item-border'};
      if(item.type==='actor'||item.type==='mic')shape.append(s('ellipse',{cx:0,cy:0,rx:item.w/2,ry:item.d/2,...attrs}));
      else if(item.type==='route')shape.append(s('path',{d:`M ${-item.w/2} ${-item.d*.2} H ${item.w*.2} V ${-item.d/2} L ${item.w/2} 0 L ${item.w*.2} ${item.d/2} V ${item.d*.2} H ${-item.w/2} Z`,...attrs}));
      else shape.append(s('rect',{x:-item.w/2,y:-item.d/2,width:item.w,height:item.d,...attrs,...(item.type==='clear'?{'stroke-dasharray':`${F*.5} ${F*.35}`}:{} )}));
      if(item.type==='chair')shape.append(s('line',{x1:-item.w*.4,y1:-item.d*.35,x2:item.w*.4,y2:-item.d*.35,stroke:type.stroke,'stroke-width':M*.04}));
      g.append(shape);
      g.append(s('circle',{cx:0,cy:0,r:F*.63,fill:'#fff',stroke:type.stroke,'stroke-width':M*.02}));
      g.append(text(0,F*.32,String(index),{'font-size':F*.95,'font-weight':'bold','pointer-events':'none'}));
      g.append(s('title',{},`${index}. ${item.label||type.label}: ${fmt(item.w)} × ${fmt(item.d)} ${state.unit}`));
      itemLayer.append(g);
      if(interactive){
        g.addEventListener('pointerdown',e=>{
          if(e.button!==0)return;e.preventDefault();select(item.id,false);g.focus();
          const point=svg.createSVGPoint();point.x=e.clientX;point.y=e.clientY;const p=point.matrixTransform(svg.getScreenCTM().inverse());
          drag={id:item.id,before:snapshot(),pointer:e.pointerId,dx:p.x-M-item.x,dy:p.y-M-D+item.y};svg.setPointerCapture(e.pointerId);
        });
        g.addEventListener('keydown',e=>{
          const shifts={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]};
          if(!shifts[e.key])return;e.preventDefault();selected=item.id;const step=state.grid/(e.shiftKey?4:1);change(()=>{item.x=num(item.x+shifts[e.key][0]*step);item.y=num(item.y+shifts[e.key][1]*step);});$('stage-map').querySelector(`[data-item="${selected}"]`)?.focus();
        });
        g.addEventListener('click',()=>select(item.id));
      }
    });
    if(interactive){
      svg.addEventListener('pointermove',e=>{
        if(!drag||e.pointerId!==drag.pointer)return;
        const item=state.items.find(i=>i.id===drag.id),p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());
        let x=q.x-M-drag.dx,y=D-(q.y-M-drag.dy);
        if(state.snap){x=Math.round(x/state.grid)*state.grid;y=Math.round(y/state.grid)*state.grid;}
        item.x=num(Math.max(0,Math.min(W,x)));item.y=num(Math.max(0,Math.min(D,y)));
        svg.querySelector(`[data-item="${item.id}"]`).setAttribute('transform',`translate(${M+item.x} ${M+D-item.y})`);fillEditor();
      });
      const finish=e=>{if(!drag||e.pointerId!==drag.pointer)return;const before=drag.before;drag=null;history(before);renderMap();$('stage-map').querySelector(`[data-item="${selected}"]`)?.focus();};
      svg.addEventListener('pointerup',finish);svg.addEventListener('pointercancel',finish);
    }
    return svg;
  }
  function renderMap(){$('stage-map').replaceChildren(map(true));}
  Object.entries(types).forEach(([key,v])=>{const o=n('option',v.label);o.value=key;$('item-type').append(o);});
  [['Scenery / furniture','#f7d797'],['Performers','#c7daef'],['Equipment','#d8d0ed'],['Clear areas / arrows','#ddf0e8'],['Custom','#f0d5df']].forEach(([label,color])=>{const span=n('span'),swatch=n('i');swatch.style.background=color;span.append(swatch,n('span',label));$('map-key').append(span);});
  function newItem(type,x=state.width/2,y=state.depth/2,label){const spec=types[type],factor=state.unit==='m'?.3048:1;return {id:state.nextId++,type,label:label||spec.label,x,y,w:num(spec.w*factor),d:num(spec.d*factor),angle:0,notes:''};}
  $('add').addEventListener('click',()=>{if(state.items.length>=200){$('save-status').textContent='This plan has 200 items. Start a separate plan for another scene.';return;}change(()=>{const i=newItem($('item-type').value);state.items.push(i);selected=i.id;});$('item-label').focus();});
  $('item-select').addEventListener('change',e=>select(e.target.value));
  ['label','width','depth','x','y','angle','notes'].forEach(f=>{
    const input=$('item-'+f);input.addEventListener('change',()=>{const i=active();if(!i)return;const prop=f==='width'?'w':f==='depth'?'d':f;let value=input.value;if(!['label','notes'].includes(f)){
      value=Number(value);const min=['width','depth'].includes(f)?(state.unit==='ft'?.1:.03048):f==='angle'?0:(state.unit==='ft'?-300:-91.44);const max=f==='angle'?359:['width','depth'].includes(f)?(state.unit==='ft'?300:91.44):(state.unit==='ft'?600:182.88);
      if(!input.value.trim()||!Number.isFinite(value)||value<min||value>max){fillEditor();$('save-status').textContent=`Enter a ${f} between ${min} and ${max}.`;return;}
    }change(()=>i[prop]=value);});
  });
  // Text edits save while typing; commit one undo entry when the field loses focus.
  const textInputs=[...['production','student','scene','revision','notes'].map(id=>$(id)),$('item-label'),$('item-notes')];
  textInputs.forEach(input=>{let before;input.addEventListener('focus',()=>before=snapshot());input.addEventListener('input',()=>{if(input.id==='notes')state.notes=input.value;else if(input.id==='item-label'||input.id==='item-notes'){const i=active();if(i)i[input.id==='item-label'?'label':'notes']=input.value;}else state.meta[input.id]=input.value;save();if(input.id==='item-label'){const o=$('item-select').selectedOptions[0];if(o)o.textContent=`${state.items.indexOf(active())+1}. ${input.value}`;}});input.addEventListener('blur',()=>{if(before){history(before);before=null;renderMap();}});});
  $('duplicate').addEventListener('click',()=>{const item=active();if(!item||state.items.length>=200)return;change(()=>{const copy={...item,id:state.nextId++,label:(item.label+' copy').slice(0,100),x:num(item.x+state.grid),y:num(item.y+state.grid)};state.items.push(copy);selected=copy.id;});});
  $('remove').addEventListener('click',()=>{if(active())change(()=>{state.items=state.items.filter(i=>i.id!==selected);selected=null;});});
  $('stage-settings').addEventListener('submit',e=>{e.preventDefault();const width=Number($('stage-width').value),depth=Number($('stage-depth').value);const min=state.unit==='ft'?1:.3048,max=state.unit==='ft'?300:91.44;if(width>=min&&width<=max&&depth>=min&&depth<=max)change(()=>{state.width=width;state.depth=depth;});});
  $('units').addEventListener('change',e=>{const unit=e.target.value;if(unit===state.unit)return;change(()=>{const factor=unit==='m'?.3048:1/.3048;state.width=num(state.width*factor);state.depth=num(state.depth*factor);state.grid=num(state.grid*factor);state.items.forEach(i=>['x','y','w','d'].forEach(f=>i[f]=num(i[f]*factor)));state.unit=unit;});});
  $('grid').addEventListener('change',e=>change(()=>state.grid=Number(e.target.value)));$('snap').addEventListener('change',e=>change(()=>state.snap=e.target.checked));
  $('undo').addEventListener('click',()=>{if(!undo.length)return;redo.push(snapshot());state=JSON.parse(undo.pop());render();save();});$('redo').addEventListener('click',()=>{if(!redo.length)return;undo.push(snapshot());state=JSON.parse(redo.pop());render();save();});
  $('clear').addEventListener('click',()=>{if(state.items.length&&!window.confirm('Remove all plotted items? Your production details and notes stay. You can undo this.'))return;change(()=>{state.items=[];selected=null;});});
  $('example').addEventListener('click',()=>{
    if(state.items.length&&!window.confirm('Replace your plotted items with the market example? You can undo this.'))return;
    change(()=>{state.items=[];state.width=30;state.depth=20;state.unit='ft';state.grid=2;
      const entries=[['clear',2,10,'Stage-right entrance route'],['clear',28,10,'Stage-left entrance route'],['bench',15,14,'Market bench'],['table',21,13,'Market stall'],['actor',11,6,'Lead'],['actor',18,6,'Ensemble A'],['actor',15,9,'Ensemble B'],['mic',7,4,'Vocal mic']];
      entries.forEach(([type,x,y,label])=>{const item=newItem(type,x,y,label);if(type==='clear')item.d=18;state.items.push(item);});selected=state.items.find(i=>i.type==='actor').id;
    });$('save-status').textContent='Market example loaded: 30 × 20 ft. Replace these invented dimensions with your venue measurements.';
  });
  $('check').addEventListener('click',()=>{
    const warnings=[];if(!state.items.length)warnings.push('Add items to your stage plot.');
    state.items.forEach((i,k)=>{if(bounds(i).some(([x,y])=>x<-.001||x>state.width+.001||y<-.001||y>state.depth+.001))warnings.push(`Item ${k+1} (${i.label}): footprint extends outside the stage.`);if(!i.label.trim())warnings.push(`Item ${k+1}: add a descriptive label.`);});
    const zones=state.items.filter(i=>i.type==='clear'),solid=state.items.filter(i=>!['clear','route'].includes(i.type));
    zones.forEach(zone=>solid.forEach(i=>{if(overlaps(bounds(zone),bounds(i)))warnings.push(`Keep-clear area “${zone.label}” overlaps “${i.label}”.`);}));
    $('layout-review').textContent=(warnings.length?warnings.join('\n'):'All footprints fit inside the stage; no items overlap the marked keep-clear areas.')+'\nRehearse actual routes and ask your teacher to approve clearance, sightlines, and equipment placement. This check uses rectangular footprints; it does not certify a safe stage.';
  });
  function buildPrint(){
    const root=$('print-plot');root.replaceChildren(n('h2',state.meta.production||'Stage plot'));
    const meta=n('div',undefined,'print-meta');[['student','Student / team'],['scene','Scene / song'],['revision','Class / revision / date']].forEach(([f,l])=>{const e=n('span');e.append(n('strong',l+': '),n('span',state.meta[f]||'________________'));meta.append(e);});root.append(meta,map());
    const inventory=n('div',undefined,'print-inventory');inventory.append(n('h3',`${state.meta.production||'Stage plot'} — item list`),n('p',`Scene: ${state.meta.scene||'________'} • Stage: ${fmt(state.width)} × ${fmt(state.depth)} ${state.unit}. X: from stage-right edge. Y: upstage from downstage edge. Positions refer to item centers.`));
    const table=n('table'),head=n('thead'),row=n('tr');['# / Item','Type','Width × depth','Center X / Y','Rotation','Notes / cue ID'].forEach(t=>{const th=n('th',t);th.scope='col';row.append(th);});head.append(row);table.append(head);const body=n('tbody');
    state.items.forEach((i,k)=>{const tr=n('tr');[`${k+1}. ${i.label}`,types[i.type].label,`${fmt(i.w)} × ${fmt(i.d)} ${state.unit}`,`${fmt(i.x)} / ${fmt(i.y)} ${state.unit}`,`${i.angle}°`,i.notes].forEach(v=>tr.append(n('td',v)));body.append(tr);});if(!state.items.length){const tr=n('tr'),td=n('td','No items plotted. Use this blank stage grid to sketch a layout.');td.colSpan=6;tr.append(td);body.append(tr);}table.append(body);inventory.append(table,n('h3','Production notes / rehearsal revisions'),n('div',state.notes||'\u00a0','print-notes'),n('p','Planning drawing: verify measurements, routes, wing space, heights, and sightlines at the venue. Printed at fit-to-page size; use the scale bar and listed dimensions.'));root.append(inventory);
  }
  $('print').addEventListener('click',()=>{buildPrint();window.print();});window.addEventListener('beforeprint',buildPrint);
  $('preview').addEventListener('click',()=>{buildPrint();const show=$('print-plot').hidden;$('print-plot').hidden=!show;$('preview').setAttribute('aria-expanded',String(show));$('preview').textContent=show?'Hide print preview':'Show print preview';if(show)$('print-plot').scrollIntoView({block:'start',behavior:'instant'});});
  $('download').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([snapshot()],{type:'application/json'})),a=n('a');a.href=url;a.download='stage-plot.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);save('Backup downloaded. Reopen this file here to continue editing.');});
  $('open').addEventListener('click',()=>$('backup-file').click());$('backup-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>4000000)throw Error();const data=JSON.parse(await file.text());if(!valid(data))throw Error();if(!window.confirm('Replace your stage plot with this backup? You can undo this.'))return;change(()=>{state=data;selected=null;});save('Stage plot backup opened and saved on this device.');}catch{$('save-status').textContent='Could not open this file. Choose a JSON backup downloaded from this stage designer.';}finally{e.target.value='';}});
  render();buildPrint();save();
})();
