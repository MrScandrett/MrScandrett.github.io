import { WORKSHOPS, freshState, validateState, keyAngle, checkState } from './workshops.mjs';
import { buildDesign, disposeDesign, snapshotDesign, toObj, toPrintSpace } from './geometry.mjs';
import { writeBinaryStl } from '../fab-io.mjs';
import { createScene } from '../sim-kit-three.mjs';
const ROOT=new URL('../../../',import.meta.url);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=s=>JSON.parse(JSON.stringify(s));
const download=(blob,name)=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),4000);};
const CHARACTER_PRESETS={
 explorer:{label:'Explorer',params:{height:5.35,shoulders:1.08,torso:1.65,waist:.8,leg:2.25,arm:1.9,head:.86,jaw:.8,eyes:.95,brows:-4,nose:.8,mouth:.92,hair:.7,hairStyle:2,outfit:4},color:'#9b6547',secondary:'#d58a39'},
 scholar:{label:'Scholar',params:{height:5,shoulders:.92,torso:1.6,waist:.78,leg:2.05,arm:1.75,head:.92,jaw:.72,eyes:1.1,brows:3,nose:.72,mouth:.82,hair:.55,hairStyle:1,outfit:1},color:'#6f432f',secondary:'#557f93'},
 guardian:{label:'Guardian',params:{height:6.25,shoulders:1.5,torso:2.05,waist:1.08,leg:2.55,arm:2.25,head:.82,jaw:1.04,eyes:.78,brows:-12,nose:1.05,mouth:1.05,hair:.35,hairStyle:3,outfit:2},color:'#4d2f25',secondary:'#8c4042'},
 mystic:{label:'Mystic',params:{height:5.75,shoulders:.86,torso:1.82,waist:.66,leg:2.65,arm:2.15,head:.9,jaw:.64,eyes:1.28,brows:8,nose:.58,mouth:.74,hair:1.1,hairStyle:4,outfit:3},color:'#c58b68',secondary:'#6e5795'},
 inventor:{label:'Inventor',params:{height:4.45,shoulders:1.02,torso:1.42,waist:.92,leg:1.72,arm:1.58,head:1.1,jaw:.88,eyes:1.22,brows:-2,nose:1.16,mouth:1.12,hair:.9,hairStyle:3,outfit:4},color:'#e2b48f',secondary:'#397b69'},
 athlete:{label:'Athlete',params:{height:5.9,shoulders:1.3,torso:1.72,waist:.72,leg:2.75,arm:2.08,head:.8,jaw:.9,eyes:.86,brows:-5,nose:.88,mouth:1,hair:.3,hairStyle:1,outfit:0},color:'#7b4b37',secondary:'#346c9c'}
};
const FURNITURE_PRESETS={
 dining:{label:'Dining chair',params:{width:2.2,depth:2,height:1.55,back:1.9,leg:.18,style:0,backStyle:1,arms:0,cushion:.03,splay:.03},color:'#b8733f',secondary:'#5b3827'},
 armchair:{label:'Armchair',params:{width:3,depth:2.7,height:1.25,back:1.65,leg:.28,style:4,backStyle:3,arms:1,cushion:.28,splay:0},color:'#4f7185',secondary:'#d5b27b'},
 stool:{label:'Pedestal stool',params:{width:1.7,depth:1.7,height:2,back:0,leg:.3,style:3,backStyle:0,arms:0,cushion:.12,splay:0},color:'#d89b4a',secondary:'#344b58'},
 bench:{label:'Bench',params:{width:4,depth:1.55,height:1.25,back:0,leg:.24,style:2,backStyle:0,arms:0,cushion:.06,splay:.02},color:'#9a6541',secondary:'#405a4d'},
 lounge:{label:'Lounge chair',params:{width:2.8,depth:3.2,height:1.05,back:1.55,leg:.3,style:1,backStyle:3,arms:1,cushion:.24,splay:.12},color:'#b34e3e',secondary:'#e0c593'},
 school:{label:'School chair',params:{width:2.15,depth:2,height:1.55,back:1.45,leg:.14,style:0,backStyle:2,arms:0,cushion:0,splay:.02},color:'#e0a72f',secondary:'#38556b'}
};
const MATERIAL_PRESETS={
 ceramic:{label:'Painted ceramic',params:{roughness:.32,metalness:0},color:'#d66b45'},
 rubber:{label:'Soft rubber',params:{roughness:.9,metalness:0},color:'#3c5960'},
 metal:{label:'Brushed metal',params:{roughness:.28,metalness:1},color:'#9ba9b1'},
 plastic:{label:'Molded plastic',params:{roughness:.48,metalness:0},color:'#e1ab35'}
};
let sequence=0;
for(const host of document.querySelectorAll('[data-design3d-workshop]'))mount(host);
async function mount(host){
 const mode=host.dataset.design3dWorkshop,def=WORKSHOPS[mode];if(!def)return;
 const id='d3w-'+(++sequence),store='classroomos:design3d:'+mode;
 let state=freshState(mode),undo=[],redo=[],playing=false,dirty=true,level='guided',brush='raise',group,texture,three,sceneKit,controls,loop,visible=true,pointerStroke=false,lastStroke=0,baseline;
 try{
  const saved=localStorage.getItem(store);
  if(saved){const candidate=validateState(JSON.parse(saved));if(candidate.mode===mode)state=candidate;}
  else if(['transform','boolean'].includes(mode)){
   try{
    const prevKey=mode==='boolean'?'transform':'navigate';
    const prev=localStorage.getItem('classroomos:design3d:'+prevKey);
    if(prev){
     const past=validateState(JSON.parse(prev));
     if(Number.isFinite(past.params?.width))state.params.width=past.params.width;
     if(Number.isFinite(past.params?.height))state.params.height=past.params.height;
     if(mode==='transform'&&Number.isFinite(past.params?.depth))state.params.depth=past.params.depth;
     if(past.color)state.color=past.color;
    }
   }catch{}
  }
 }catch{}
 host.classList.add('d3w');host.setAttribute('aria-labelledby',id+'-title');
 // the workshop title is the page heading unless the page already shows its own h1
 const hx=[...document.querySelectorAll('h1')].some(h=>!host.contains(h)&&!h.closest('.d3-original-reference'))?'h2':'h1';
 host.innerHTML=`<header class="d3w-head"><p>3D workshop · ${escape(def.technique)}</p><${hx} id="${id}-title">${escape(def.title)}</${hx}><p>${escape(def.challenge)}</p></header>
 <div class="d3w-options"><div class="d3w-level"><label for="${id}-level">Support level</label><select id="${id}-level" data-level><option value="guided">Guided practice</option><option value="independent">Independent design</option><option value="extension">Extension challenge</option></select><span data-level-note></span></div>
 <div class="d3w-scheme"><label for="${id}-scheme">Control scheme</label><select id="${id}-scheme" data-scheme><option value="tinkercad"${state.scheme==='tinkercad'?' selected':''}>Tinkercad / Default</option><option value="blender"${state.scheme==='blender'?' selected':''}>Blender (MMB)</option><option value="fusion"${state.scheme==='fusion'?' selected':''}>Fusion 360 / CAD (Shift+MMB)</option></select><span class="d3w-scheme-hint" data-scheme-hint>Left-drag: Orbit · Right-drag: Pan · Scroll: Zoom</span></div></div>
 ${mode==='character'?`<section class="d3w-character-cast" aria-labelledby="${id}-cast"><div><h2 id="${id}-cast">Choose a starting character</h2><p>Presets are starting points, not fixed identities. Every feature stays editable.</p></div><div class="d3w-presets">${Object.entries(CHARACTER_PRESETS).map(([key,preset])=>`<button type="button" data-character-preset="${key}">${escape(preset.label)}</button>`).join('')}</div></section>`:''}
 ${mode==='furniture'?`<section class="d3w-character-cast d3w-furniture-cast" aria-labelledby="${id}-cast"><div><h2 id="${id}-cast">Choose a furniture form</h2><p>Use these as design seeds. Every dimension, detail and color remains editable.</p></div><div class="d3w-presets">${Object.entries(FURNITURE_PRESETS).map(([key,preset])=>`<button type="button" data-furniture-preset="${key}">${escape(preset.label)}</button>`).join('')}</div></section>`:''}
 ${mode==='materials'?`<section class="d3w-character-cast d3w-material-bench" aria-labelledby="${id}-bench"><div><h2 id="${id}-bench">Start with a material hypothesis</h2><p>Apply a swatch, then change one property. The sphere shows highlight width; the beveled block shows edge response.</p></div><div class="d3w-presets">${Object.entries(MATERIAL_PRESETS).map(([key,preset])=>`<button type="button" data-material-preset="${key}">${escape(preset.label)}</button>`).join('')}</div></section>`:''}
 <div class="d3w-layout"><div class="d3w-stage"><div class="d3w-view"><canvas tabindex="0" aria-label="Editable 3D scene. Drag to orbit; use view buttons or arrow keys. In sculpt mode, turn on Brush mode to edit the mesh." data-canvas></canvas><p class="d3w-unit">${['print','clearance'].includes(mode)?'Coordinates in millimeters':'Y up · starter-scene units · not a manufacturing specification'}</p></div>
 <div class="d3w-toolbar" role="group" aria-label="Camera views"><button type="button" data-view="perspective">Perspective</button><button type="button" data-view="front">Front</button><button type="button" data-view="side">Side</button><button type="button" data-view="top">Top</button><button type="button" data-zoom="in">Zoom in</button><button type="button" data-zoom="out">Zoom out</button><button type="button" data-fit>Fit model</button></div>
 <p class="d3w-help">X runs across · Y is up · Z is depth. Drag to orbit · right-drag to pan · pinch or use Zoom · keyboard arrows orbit, +/− zoom. Numeric controls work without dragging.</p><p data-description class="d3w-description"></p>
 ${mode==='navigate'?`<div class="d3w-missions"><p><strong>Camera practice mission</strong></p><ul data-missions><li data-m="orbit">○ Orbit the view to inspect the stepped silhouette</li><li data-m="views">○ Inspect Front, Side and Top views</li><li data-m="zoom">○ Zoom in or out to examine detail</li><li data-m="fit">○ Use Fit model or view buttons</li><li data-m="proportions">○ Adjust dimensions to set your proportions</li></ul></div>`:''}
 <ol class="d3w-guide">${def.steps.map(s=>'<li>'+escape(s)+'</li>').join('')}</ol>
 <div class="d3w-actions"><button type="button" data-action="undo">Undo</button><button type="button" data-action="redo">Redo</button><button type="button" data-action="reset">Reset starter</button><button type="button" data-action="save">Save project</button><button type="button" data-action="open">Open project</button><button type="button" data-action="export">Export OBJ</button>${['print','clearance'].includes(mode)?'<button type="button" data-action="stl">Export STL (mm)</button>':''}<button type="button" data-action="capture">Capture image</button>${mode==='texture'?'<button type="button" data-action="texture">Export texture PNG</button>':''}</div><input type="file" data-file accept=".json" hidden>
 <p role="status" data-status>Loading the editable scene…</p></div>
 <div class="d3w-controls"><fieldset><legend>${mode==='character'?'Character features':'Design controls'}</legend>${def.fields.map((f,index)=>`${mode==='character'&&[0,7,13,14].includes(index)?`<h3 class="d3w-control-heading">${index===0?'Body and proportions':index===7?'Face':index===13?'Hair':'Outfit'}</h3>`:''}<div class="d3w-field"><label for="${id}-${f.key}">${escape(f.label)}</label><input id="${id}-${f.key}" data-param="${f.key}" type="number" min="${f.min}" max="${f.max}" step="${f.step}" value="${state.params[f.key]}"><input data-slider="${f.key}" aria-label="${escape(f.label)} slider" type="range" min="${f.min}" max="${f.max}" step="${f.step}" value="${state.params[f.key]}"></div>`).join('')}<label for="${id}-color">${mode==='character'?'Skin tone':'Surface color'}</label><input id="${id}-color" type="color" data-color="color" value="${state.color}">${['texture','procedural','modular','furniture','character'].includes(mode)?`<label for="${id}-secondary">${mode==='character'?'Outfit color':'Second color'}</label><input id="${id}-secondary" type="color" data-color="secondary" value="${state.secondary}">`:''}${mode==='composite'?`<label for="${id}-background">Background color</label><input id="${id}-background" type="color" data-color="background" value="${state.background}">`:''}</fieldset>
 ${mode==='boolean'?'<button type="button" data-action="cut" aria-pressed="false">Apply Difference</button>':''}
 ${mode==='modular'?'<button type="button" data-action="snap">Snap wall to grid</button>':''}
 ${mode==='sculpt'?'<fieldset><legend>Sculpt tools</legend><label>Brush operation <select data-brush><option value="raise">Raise</option><option value="lower">Lower</option><option value="smooth">Smooth</option></select></label><button type="button" data-action="brushmode" aria-pressed="false">Brush mode: off</button><button type="button" data-action="stroke">Apply brush at numeric position</button><p>In Brush mode, drag on the mesh. Turn it off to orbit. Numeric X/Z and Apply brush offer the same operation without a pointer.</p></fieldset>':''}
 ${mode==='animation'?'<fieldset><legend>Authored action</legend><button type="button" data-action="key">Add / replace keyframe</button><button type="button" data-action="remove-key">Remove key at this time</button><button type="button" data-action="play" aria-pressed="false">Play my action</button><ol data-keys></ol></fieldset>':''}
 <fieldset><legend>Test and explain</legend><label for="${id}-reflection">I changed ___ because ___.</label><textarea id="${id}-reflection" data-reflection rows="3" maxlength="1000">${escape(state.reflection)}</textarea><p>${escape(def.check)}</p><button type="button" data-action="check">Test my design</button><ul data-checks></ul><p class="d3w-completion" data-completion></p></fieldset></div></div>
 ${def.limit?'<p class="d3w-limit">'+escape(def.limit)+'</p>':''}
 <details class="d3w-transfer"><summary>Use this technique in your chosen software</summary><p>This workshop teaches the idea. Tool Rosetta shows supported app equivalents; an empty or unavailable operation is not a promise that every app supports it.</p><div data-rosetta="${def.rosetta}"></div><label for="${id}-app">My software (any app)</label><input id="${id}-app" data-app placeholder="e.g. FreeCAD, Nomad, Blender, Maya…"><ol><li>Find the equivalent operation, or identify that your app cannot perform it.</li><li>Recreate or import your design. Check scale, axes and materials; OBJ is a static mesh, not a parametric CAD or animation file.</li><li>Save the native editable file and test its export. Record the app, technique and any limitations in your explanation.</li></ol><a href="${new URL('lessons/computer-science/graphics-and-games/tool-rosetta.html',ROOT)}">Open the full Tool Rosetta reference</a></details>`;
 window.ToolRosetta?.init();
 host.closest("main")?.querySelector(".d3-original-reference")?.addEventListener("toggle",()=>window.dispatchEvent(new Event("resize")));
 const $=s=>host.querySelector(s),say=s=>{$('[data-status]').textContent=s;};
 function persist(){try{localStorage.setItem(store,JSON.stringify(state));}catch{say('Browser storage is unavailable. Use Save project to keep your work.');}}
 function checkpoint(){undo.push(clone(state));if(undo.length>40)undo.shift();redo=[];}
 function edit(fn){checkpoint();playing=false;fn();state.saved=false;state.captured=false;state.exported=false;persist();refresh();}
 function updateFields(){for(const f of def.fields){$(`[data-param="${f.key}"]`).value=state.params[f.key];$(`[data-slider="${f.key}"]`).value=state.params[f.key];}for(const n of host.querySelectorAll('[data-color]'))n.value=state[n.dataset.color];$('[data-reflection]').value=state.reflection;$('[data-app]').value=state.app||'';const sc=$('[data-scheme]');if(sc&&state.scheme)sc.value=state.scheme;}
 function guide(){const text=level==='guided'?'Follow the three steps, then test your design.':level==='independent'?'Choose your own dimensions or appearance. Use the test criteria to guide your design.':def.extension;$('[data-level-note]').textContent=text;$('.d3w-guide').hidden=level!=='guided';}
 function updateMissions(){
  if(mode!=='navigate')return;
  const checks={
   orbit:state.orbited,
   views:['front','side','top'].every(v=>state.views.includes(v)),
   zoom:state.zoomed,
   fit:state.fitted,
   proportions:['width','height','depth'].some(k=>state.edits.includes(k))
  };
  for(const [k,done] of Object.entries(checks)){
   const item=host.querySelector(`[data-m="${k}"]`);
   if(item){
    item.classList.toggle('is-done',!!done);
    item.textContent=(done?'✓ ':'○ ')+item.textContent.replace(/^[✓○]\s*/,'');
   }
  }
 }
 function applyScheme(s){
  state.scheme=s;persist();const hint=$('[data-scheme-hint]');if(!controls||!three)return;
  if(s==='blender'){
   controls.mouseButtons={LEFT:three.THREE.MOUSE.ROTATE,MIDDLE:three.THREE.MOUSE.ROTATE,RIGHT:three.THREE.MOUSE.PAN};
   if(hint)hint.textContent='Middle-drag: Orbit · Shift+Middle: Pan · Left-drag also orbits · Scroll: Zoom';
  } else if(s==='fusion'){
   controls.mouseButtons={LEFT:three.THREE.MOUSE.ROTATE,MIDDLE:three.THREE.MOUSE.PAN,RIGHT:three.THREE.MOUSE.ROTATE};
   if(hint)hint.textContent='Shift+Middle: Orbit · Middle-drag: Pan · Left-drag also orbits · Scroll: Zoom';
  } else {
   controls.mouseButtons={LEFT:three.THREE.MOUSE.ROTATE,MIDDLE:three.THREE.MOUSE.DOLLY,RIGHT:three.THREE.MOUSE.PAN};
   if(hint)hint.textContent='Left-drag: Orbit · Right-drag: Pan · Scroll: Zoom';
  }
 }
 function refresh(){updateFields();if(three&&sceneKit)rebuild();dirty=true;host.dataset.revision=String(undo.length);host.dataset.mode=mode;
 const cut=$('[data-action="cut"]');if(cut){cut.textContent=state.cut?'Remove Difference':'Apply Difference';cut.setAttribute('aria-pressed',String(state.cut));}
 const play=$('[data-action="play"]');if(play){play.textContent=playing?'Pause my action':'Play my action';play.setAttribute('aria-pressed',String(playing));}
 const keys=$('[data-keys]');if(keys)keys.innerHTML=state.keys.map(k=>`<li>Time ${k.time.toFixed(2)} · ${k.angle}°</li>`).join('')||'<li>No keys yet. Choose a time and pose, then add a key.</li>';
 $('[data-action="undo"]').disabled=!undo.length;$('[data-action="redo"]').disabled=!redo.length;$('[data-checks]').replaceChildren();$('[data-completion]').textContent='';
 $('[data-description]').textContent=`${def.technique}. ${def.fields.map(f=>`${f.label}: ${state.params[f.key]}`).join('; ')}. ${mode==='sculpt'?state.strokes.length+' mesh strokes.':''}`;
 updateMissions();
 }
 for(const input of host.querySelectorAll('[data-param],[data-slider]'))input.addEventListener(input.dataset.slider?'input':'change',()=>{
 const key=input.dataset.param||input.dataset.slider,f=def.fields.find(f=>f.key===key),v=Number(input.value);
 if(!Number.isFinite(v)||v<f.min||v>f.max){input.setAttribute('aria-invalid','true');say(`Enter ${f.label} between ${f.min} and ${f.max}.`);return;}
 input.removeAttribute('aria-invalid');if(state.params[key]===v)return;edit(()=>{state.params[key]=f.step===1?Math.round(v):v;if(mode==='animation'&&key==='time'&&state.keys.length)state.params.angle=keyAngle(state.keys,v);state.edits=[...new Set([...state.edits,key])];if(mode==='modular'&&['offset','module'].includes(key))state.snapped=false;});say('Design updated. Inspect the result from another view.');
 });
 for(const input of host.querySelectorAll('[data-color]'))input.addEventListener('change',()=>edit(()=>{state[input.dataset.color]=input.value;state.edits=[...new Set([...state.edits,input.dataset.color])];}));
 for(const button of host.querySelectorAll('[data-character-preset]'))button.addEventListener('click',()=>{const preset=CHARACTER_PRESETS[button.dataset.characterPreset];edit(()=>{Object.assign(state.params,preset.params);state.color=preset.color;state.secondary=preset.secondary;state.edits=[...new Set([...state.edits,...Object.keys(preset.params),'color','secondary'])];});fit();for(const b of host.querySelectorAll('[data-character-preset]'))b.setAttribute('aria-pressed',String(b===button));say(`${preset.label} loaded. Adjust any feature to make this character your own.`);});
 for(const button of host.querySelectorAll('[data-furniture-preset]'))button.addEventListener('click',()=>{const preset=FURNITURE_PRESETS[button.dataset.furniturePreset];edit(()=>{Object.assign(state.params,preset.params);state.color=preset.color;state.secondary=preset.secondary;state.edits=[...new Set([...state.edits,...Object.keys(preset.params),'color','secondary'])];});fit();for(const b of host.querySelectorAll('[data-furniture-preset]'))b.setAttribute('aria-pressed',String(b===button));say(`${preset.label} loaded. Adjust its proportions and details to make the design your own.`);});
 for(const button of host.querySelectorAll('[data-material-preset]'))button.addEventListener('click',()=>{const preset=MATERIAL_PRESETS[button.dataset.materialPreset];edit(()=>{Object.assign(state.params,preset.params);state.color=preset.color;state.edits=[...new Set([...state.edits,...Object.keys(preset.params),'color'])];});for(const b of host.querySelectorAll('[data-material-preset]'))b.setAttribute('aria-pressed',String(b===button));say(`${preset.label} loaded. Change one property and describe what happens to the highlight.`);});
 $('[data-level]').addEventListener('change',e=>{level=e.target.value;guide();});
 $('[data-scheme]')?.addEventListener('change',e=>{applyScheme(e.target.value);say(`Control scheme: ${e.target.options[e.target.selectedIndex].text.split(' ')[0]}.`);});
 $('[data-reflection]').addEventListener('input',e=>{state.reflection=e.target.value;persist();});
 $("[data-app]").value=state.app||'';
 $('[data-app]').addEventListener('input',e=>{state.app=e.target.value.slice(0,100);persist();});
 $('[data-brush]')?.addEventListener('change',e=>{brush=e.target.value;});
 function stroke(x=state.params.brushX,z=state.params.brushZ){edit(()=>{state.strokes.push({type:brush,x,z,radius:state.params.radius,strength:state.params.strength});if(state.strokes.length>400)state.strokes.shift();state.edits=[...new Set([...state.edits,'strength'])];});say(`${brush} stroke applied to mesh vertices. Undo restores the previous surface.`);}
 const actions={
 undo(){if(undo.length){redo.push(clone(state));state=undo.pop();playing=false;persist();refresh();say('Previous design restored.');}},
 redo(){if(redo.length){undo.push(clone(state));state=redo.pop();persist();refresh();say('Design change restored.');}},
 reset(){edit(()=>{state=freshState(mode);});say('Starter restored. Undo brings your design back.');},
 cut(){edit(()=>{state.cut=!state.cut;});say('Through-cut difference updated. Inspect the opening.');},
 snap(){edit(()=>{state.params.offset=Math.round(state.params.offset/state.params.module)*state.params.module;state.snapped=true;state.edits=[...new Set([...state.edits,'offset'])];});say('Wall snapped to the nearest grid module.');},
 stroke(){stroke();},
 brushmode(){pointerStroke=!pointerStroke;if(controls)controls.enabled=!pointerStroke;const b=$('[data-action="brushmode"]');b.setAttribute('aria-pressed',String(pointerStroke));b.textContent='Brush mode: '+(pointerStroke?'on':'off');say(pointerStroke?'Drag on the surface to sculpt. Numeric brush controls also work.':'Camera orbit restored.');},
 key(){edit(()=>{state.keys=state.keys.filter(k=>Math.abs(k.time-state.params.time)>.001);state.keys.push({time:state.params.time,angle:state.params.angle});state.keys.sort((a,b)=>a.time-b.time);state.edits=[...new Set([...state.edits,'angle'])];});say('Your pose is keyed at the selected time.');},
 'remove-key'(){edit(()=>{state.keys=state.keys.filter(k=>Math.abs(k.time-state.params.time)>.001);});say('Keyframe removed at the selected time.');},
 play(){if(state.keys.length<2){say('Add at least two keyframes before playing.');return;}playing=!playing;state.played=true;persist();const b=$('[data-action="play"]');b.textContent=playing?'Pause my action':'Play my action';b.setAttribute('aria-pressed',String(playing));say(playing?'Playing only the keyframes you authored.':'Playback paused.');},
 save(){state.saved=true;persist();const project=clone(state);if(group)project.snapshot=snapshotDesign(three.THREE,group);download(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),mode+'.design3d.json');say('Editable project downloaded. Open it here to continue; use its OBJ mesh in other apps.');},
 open(){$('[data-file]').click();},
 export(){if(!group){say('The 3D scene is unavailable. Use your chosen app for geometry export.');return;}download(new Blob([toObj(snapshotDesign(three.THREE,group))],{type:'text/plain'}),mode+'.obj');state.exported=true;persist();say('OBJ downloaded: geometry and UVs, without packaged materials, bones or animation. Check size on import.');},
 stl(){if(!group){say('3D is unavailable. Export your model in your chosen app.');return;}const positions=toPrintSpace(snapshotDesign(three.THREE,group));download(new Blob([writeBinaryStl(positions,'3D Design workshop: mm, Z-up')],{type:'model/stl'}),mode+'.stl');state.exported=true;persist();say('STL exported in millimeters with Z up. Verify size, supports and separate parts in your slicer; the print remains untested.');},
 capture(){if(!sceneKit)return;render();sceneKit.renderer.domElement.toBlob(blob=>{if(blob){download(blob,mode+'.png');state.captured=true;persist();say('Image captured from your current camera view.');}},'image/png');},
 texture(){if(!texture)return;downloadTexture();},
 check(){if(!group||host.dataset.ready!=='true'){say('The 3D scene is unavailable. Complete and test the technique in your chosen app.');return;}const checks=checkState(state);$('[data-checks]').innerHTML=checks.map(([text,pass])=>`<li>${pass?'✓':'○'} ${escape(text)}</li>`).join('');const pass=checks.every(c=>c[1]);$('[data-completion]').textContent=pass?'Workshop checkpoint met. Save the project and verify its use in your chosen app.':'Keep designing: complete the open checks, then test again.';host.dataset.check=pass?'pass':'revise';say(pass?'Practice criteria met. These checks do not certify a production asset or physical print.':'Design needs another revision. See the open checks.');}
 };
 for(const button of host.querySelectorAll('[data-action]'))button.addEventListener('click',()=>actions[button.dataset.action]?.());
 $('[data-file]').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>6000000)throw Error('Choose a project smaller than 6 MB.');const raw=JSON.parse(await file.text()),loaded=validateState(raw);if(loaded.mode===mode){edit(()=>{state=loaded;});say('Editable project reopened.');}else if(['navigate','transform','boolean'].includes(mode)&&['navigate','transform','boolean'].includes(loaded.mode)){
 edit(()=>{
  for(const k of ['width','height','depth']){
   if(Number.isFinite(loaded.params?.[k])){
    const f=def.fields.find(field=>field.key===k);
    if(f)state.params[k]=Math.max(f.min,Math.min(f.max,loaded.params[k]));
    else if(mode==='boolean'&&k==='depth')state.params.depth=loaded.params.depth;
   }
  }
  if(loaded.color)state.color=loaded.color;
  if(loaded.secondary)state.secondary=loaded.secondary;
  state.edits=[...new Set([...state.edits,'width','height',...(state.params.depth?['depth']:[])])];
 });fit();say(`Imported model proportions from ${WORKSHOPS[loaded.mode].title}. Continue your design.`);
 }else if(['materials','composite','uv'].includes(mode)){
 const source=buildDesign(three.THREE,loaded,texture);const model=snapshotDesign(three.THREE,source);disposeDesign(source);edit(()=>{state.imported=model;});fit();say('Your existing model is ready for this presentation or UV exercise. Original recipe remains in its saved file.');
 }else{throw Error('This project is for '+WORKSHOPS[loaded.mode].title+'. Open it in that workshop, or in another Chapter 1 foundation workshop to reuse the model.');}}catch(error){say(error.message);}e.target.value='';});
 function checkerTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');for(let y=0;y<8;y++)for(let x=0;x<8;x++){ctx.fillStyle=(x+y)%2?state.color:state.secondary;ctx.fillRect(x*32,y*32,32,32);}const t=new three.THREE.CanvasTexture(canvas);t.colorSpace=three.THREE.SRGBColorSpace;t.wrapS=t.wrapT=three.THREE.RepeatWrapping;t.repeat.set(state.params.repeat??1,state.params.repeat??1);return t;}
 function downloadTexture(){texture.image.toBlob(blob=>{if(blob){download(blob,'checker-texture.png');state.exported=true;persist();say('Base tile exported. Repeat count is a material setting in the destination app.');}},'image/png');}
 function rebuild(){if(group){sceneKit.scene.remove(group);disposeDesign(group);}texture?.dispose();texture=checkerTexture();group=buildDesign(three.THREE,state,texture);sceneKit.scene.add(group);sceneKit.renderer.setClearColor(state.background);sceneKit.renderer.toneMappingExposure=state.params.exposure??1;
 const angle=(state.params.light??45)*Math.PI/180;sceneKit.light.position.set(Math.cos(angle)*8,state.params.lightHeight??8,Math.sin(angle)*8);sceneKit.light.intensity=state.params.intensity??2;if(sceneKit.fill)sceneKit.fill.intensity=state.params.fill??.7;dirty=true;}
 function fit(){if(!group)return;sceneKit.syncSize();const bounds=new three.THREE.Box3().setFromObject(group),size=bounds.getSize(new three.THREE.Vector3()),center=bounds.getCenter(new three.THREE.Vector3()),radius=mode==='character'?Math.max(size.y/(2*Math.tan(sceneKit.camera.fov*Math.PI/360)),size.x/(2*Math.tan(sceneKit.camera.fov*Math.PI/360)*sceneKit.camera.aspect))*1.32:Math.max(size.length()/2,1)/Math.sin(sceneKit.camera.fov*Math.PI/360)/Math.min(1,sceneKit.camera.aspect)*1.25;controls.target.copy(center);sceneKit.camera.position.copy(center).add(new three.THREE.Vector3(...(mode==='character'?[.55,.32,1]:[1,.7,1])).normalize().multiplyScalar(radius));sceneKit.camera.far=Math.max(1000,radius*20);sceneKit.camera.updateProjectionMatrix();controls.update();dirty=true;baseline=radius;state.fitted=true;updateMissions();}
 function view(name){if(!controls)return;const center=controls.target,radius=baseline||8,vectors={front:[0,.001,1],side:[1,.001,0],top:[0,1,.001],perspective:[1,.7,1]};sceneKit.camera.position.copy(center).add(new three.THREE.Vector3(...vectors[name]).normalize().multiplyScalar(radius));controls.update();state.views=[...new Set([...state.views,name])];persist();dirty=true;updateMissions();say(name+' view. Object dimensions have not changed.');for(const b of host.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===name));}
 for(const b of host.querySelectorAll('[data-view]'))b.addEventListener('click',()=>view(b.dataset.view));
 for(const b of host.querySelectorAll('[data-zoom]'))b.addEventListener('click',()=>{if(!controls)return;sceneKit.camera.position.sub(controls.target).multiplyScalar(b.dataset.zoom==='in'?.8:1.25).add(controls.target);controls.update();state.zoomed=true;updateMissions();dirty=true;});
 $('[data-fit]').addEventListener('click',fit);
 const canvas=$('[data-canvas]');canvas.addEventListener('keydown',e=>{if(!controls)return;const a=sceneKit.camera.position.clone().sub(controls.target),spherical=new three.THREE.Spherical().setFromVector3(a);const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='];if(!keys.includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')spherical.theta-=.15;if(e.key==='ArrowRight')spherical.theta+=.15;if(e.key==='ArrowUp')spherical.phi=Math.max(.05,spherical.phi-.15);if(e.key==='ArrowDown')spherical.phi=Math.min(Math.PI-.05,spherical.phi+.15);if(['+','='].includes(e.key)){spherical.radius*=.9;state.zoomed=true;}if(e.key==='-'){spherical.radius*=1.1;state.zoomed=true;}sceneKit.camera.position.setFromSpherical(spherical).add(controls.target);controls.update();dirty=true;state.orbited=true;updateMissions();});
 function pointerSculpt(e){if(!pointerStroke||!group||mode!=='sculpt')return;const r=canvas.getBoundingClientRect(),ray=new three.THREE.Raycaster();ray.setFromCamera(new three.THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),sceneKit.camera);const hit=ray.intersectObject(group,true)[0];if(hit&&performance.now()-lastStroke>80){lastStroke=performance.now();stroke(hit.point.x,hit.point.z);}}
 let down=false;canvas.addEventListener('pointerdown',e=>{down=true;if(pointerStroke){canvas.setPointerCapture(e.pointerId);pointerSculpt(e);}});canvas.addEventListener('pointermove',e=>{if(down)pointerSculpt(e);});canvas.addEventListener('pointerup',()=>{down=false;});canvas.addEventListener('pointercancel',()=>{down=false;});
 function render(){if(!sceneKit)return;sceneKit.syncSize();sceneKit.renderer.render(sceneKit.scene,sceneKit.camera);dirty=false;}
 guide();refresh();
 try{
 three=await import(new URL('assets/vendor/three-bundle.min.js',ROOT));const {THREE,OrbitControls}=three;
 sceneKit=createScene(canvas,{THREE,fov:40,far:1000,clearColor:state.background});sceneKit.renderer.toneMapping=THREE.ACESFilmicToneMapping;sceneKit.renderer.outputColorSpace=THREE.SRGBColorSpace;
 sceneKit.scene.add(new THREE.HemisphereLight(0xffffff,0x30343d,2));sceneKit.light=new THREE.DirectionalLight(0xffffff,2);sceneKit.scene.add(sceneKit.light);
 if(mode==='materials'){sceneKit.fill=new THREE.DirectionalLight(0x9bc7e8,.7);sceneKit.fill.position.set(-6,3,-4);sceneKit.scene.add(sceneKit.fill);}
 if(mode==='character'){
  const rim=new THREE.DirectionalLight(0x5ac8b2,2.2);rim.position.set(-4,5,-5);sceneKit.scene.add(rim);
  const fill=new THREE.DirectionalLight(0xffd3a1,1.4);fill.position.set(4,3,3);sceneKit.scene.add(fill);
  const platform=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.3,.08,48),new THREE.MeshStandardMaterial({color:0x172630,roughness:.72,metalness:.18}));platform.position.y=-.06;sceneKit.scene.add(platform);
 }
 const grid=new THREE.GridHelper(['print','clearance'].includes(mode)?120:20,20,0x71808e,0x4d5a66);sceneKit.scene.add(grid);
 controls=new OrbitControls(sceneKit.camera,canvas);controls.enableDamping=false;
 controls.addEventListener('change',()=>{dirty=true;if(!state.orbited){state.orbited=true;persist();updateMissions();}});
 canvas.addEventListener('wheel',()=>{state.zoomed=true;updateMissions();},{passive:true});
 canvas.addEventListener('pointerdown',e=>{if(controls&&three){if(state.scheme==='blender')controls.mouseButtons.MIDDLE=e.shiftKey?three.THREE.MOUSE.PAN:three.THREE.MOUSE.ROTATE;else if(state.scheme==='fusion')controls.mouseButtons.MIDDLE=e.shiftKey?three.THREE.MOUSE.ROTATE:three.THREE.MOUSE.PAN;}});
 applyScheme(state.scheme||'tinkercad');
 const axes=new THREE.AxesHelper(['print','clearance'].includes(mode)?12:2);sceneKit.scene.add(axes);
 rebuild();fit();refresh();
 const observer=new ResizeObserver(()=>{dirty=true;});observer.observe(canvas);
 const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)dirty=true;});intersection.observe(host);
 let elapsed=0;loop=window.SimKit.loop((dt,time)=>{if(!visible)return;if(playing&&group.userData.joint){elapsed+=(dt||0);const t=(elapsed/(state.params.duration||2))%1;group.userData.joint.rotation.z=keyAngle(state.keys,t)*Math.PI/180;dirty=true;}if(dirty)render();},{el:host});
 host.dataset.ready='true';say('Scene ready. Make a design choice, inspect it, then test your technique.');
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();playing=false;host.dataset.ready='false';host.dataset.check='revise';$('[data-completion]').textContent='';say('The 3D context was lost. Save your project, reload, or continue in your chosen app.');});
 window.addEventListener('pagehide',event=>{if(event.persisted)return;loop?.stop?.();observer.disconnect();intersection.disconnect();controls.dispose();disposeDesign(group);texture.dispose();sceneKit.dispose();},{once:true});
 }catch(error){host.dataset.ready='false';canvas.hidden=true;const fallback=document.createElement('p');fallback.className='d3w-fallback';fallback.textContent='Interactive 3D is unavailable in this browser. The technique steps, numeric design plan, Tool Rosetta and project saving remain available. Complete the model in your chosen app and test it there.';$('.d3w-view').append(fallback);say('3D unavailable. Use the external-app workflow below.');console.warn('3D workshop fallback:',error.message);}
}
