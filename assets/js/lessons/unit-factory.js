import { THREE } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';

// Values describe imaginary outputs unless real mass conversion is selected.
const units = [
 ['kg','kilograms','Mass','weight','Mass measures how much matter an object contains.'],
 ['g','grams','Mass','weight','1 kg = 1,000 g. Ten grams is a much smaller mass than ten kilograms.'],
 ['mg','milligrams','Mass','weight','1 kg = 1,000,000 mg. Milligrams describe very small masses.'],
 ['lb','pounds','Mass','weight','1 lb = 0.45359237 kg. Pounds here describe mass.'],
 ['oz','ounces','Mass','weight','16 avoirdupois ounces make one pound. These are mass ounces, not fluid ounces.'],
 ['t','tonnes','Mass','weight','1 tonne = 1,000 kg. A 10 tonne object has 1,000 times the input mass.'],
 ['V','volts','Electricity','electric','Voltage is electric potential difference: energy transferred per unit of charge. Sparks are a cartoon symbol; 10 V does not imply visible lightning.'],
 ['A','amperes','Electricity','current','Current is the rate of flow of electric charge. 10 A and 10 V describe different quantities.'],
 ['Ω','ohms','Electricity','resistor','Resistance relates voltage to current. For an ohmic resistor, V = I × R.'],
 ['W','watts','Energy & power','bulb','Power is the rate of energy transfer. 10 W means 10 joules per second.'],
 ['J','joules','Energy & power','energy','Energy can be stored or transferred. A 10 J energy token does not specify how quickly it is used.'],
 ['L','litres','Volume','liquid','Volume measures occupied space. 10 L = 10,000 mL. The tank represents that volume, not a universal mass conversion.'],
 ['mL','millilitres','Volume','drop','1,000 mL = 1 L. This little vial represents just 10 mL.'],
 ['m³','cubic metres','Volume','tank','1 m³ = 1,000 L. A 10 m³ tank holds 10,000 L.'],
 ['mm','millimetres','Length','length','10 mm = 1 cm. Length measures distance, not mass.'],
 ['cm','centimetres','Length','length','10 cm = 100 mm. Ten centimetres is shorter than ten inches.'],
 ['in','inches','Length','length','10 in = 25.4 cm exactly. The machine shrinks the cargo into a short measuring bar.'],
 ['ft','feet','Length','length','10 ft = 3.048 m. One foot is exactly 12 inches.'],
 ['m','metres','Length','length','10 m = 1,000 cm. Long outputs are scaled down to fit the factory.'],
 ['km','kilometres','Length','length','10 km = 10,000 m. This is a model of a distance, not a full-size object.'],
 ['cm²','square centimetres','Area','area','Area measures a surface. A 2 cm × 5 cm rectangle has an area of 10 cm².'],
 ['m²','square metres','Area','area','A 2 m × 5 m floor covers 10 m². Area is measured in square units.'],
 ['s','seconds','Time','clock','Duration measures how long something lasts. 10 s is one sixth of a minute.'],
 ['min','minutes','Time','clock','10 min = 600 s. This clock is a symbol for a duration.'],
 ['°C','degrees Celsius','Temperature','cold','10 °C = 50 °F = 283.15 K. It is cool, but water is not frozen at this temperature at ordinary pressure.'],
 ['K','kelvins','Temperature','ice','10 K = −263.15 °C. Kelvin uses no degree symbol. The icy sculpture symbolizes extreme cold.'],
 ['N','newtons','Force','spring','Force is a push or pull. A 10 kg mass weighs about 98 N near Earth’s surface, not 10 N.'],
 ['Hz','hertz','Frequency','wave','10 Hz means 10 cycles per second. The visible wave is slowed down so you can inspect it.']
].map(([symbol,name,family,kind,fact])=>({symbol,name,family,kind,fact}));
const $ = id => document.getElementById(id);
const massFactors = {kg:1,g:1000,mg:1e6,lb:1/0.45359237,oz:16/0.45359237,t:.001};
let phase='empty', elapsed=0, autoTime=0, current=null, records=[], discovered=new Set(), sequence=0;
let view, cargo=[], result=null, press, handle, rollers=[], sparks=[], sceneTime=0;
$('motion').checked=matchMedia('(prefers-reduced-motion: reduce)').matches;
function available(){return units.filter(u=>$('mode').value!=='real'||u.family==='Mass');}
function refreshOptions(){
 const before=$('unit').value; $('unit').replaceChildren();
 for(const family of [...new Set(available().map(u=>u.family))]){
  const group=document.createElement('optgroup');group.label=family;
  for(const u of available().filter(u=>u.family===family)){const option=document.createElement('option');option.value=u.symbol;option.textContent=`${u.symbol} — ${u.name}`;group.append(option);} $('unit').append(group);
 }
 $('unit').value=available().some(u=>u.symbol===before)?before:($('mode').value==='real'?'g':'V'); hint();
}
function hint(){const u=units.find(u=>u.symbol===$('unit').value);$('unit-hint').textContent=`${u.family}: ${u.name}.`;}
function say(title,detail){$('status').textContent=title;if(detail)$('explanation').textContent=detail;}
function lock(){const busy=['loading','working'].includes(phase);$('lever').disabled=busy;$('transform').disabled=phase!=='ready';for(const id of ['mode','unit','recipe'])$(id).disabled=busy;}
function remove(group){if(!group||!view)return;view.scene.remove(group);group.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of [].concat(o.material)){m.map?.dispose();m.dispose();}}});}
function mesh(geometry,color,parent,x=0,y=0,z=0,extra={}){const o=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.4,...extra}));o.position.set(x,y,z);parent.add(o);return o;}
function box(parent,w,h,d,color,x=0,y=0,z=0,extra={}){return mesh(new THREE.BoxGeometry(w,h,d),color,parent,x,y,z,extra);}
// A jagged mini lightning-bolt, not a plain dot: the small crackling shards that ring an electrical object.
const boltShape=new THREE.Shape([[0,.19],[.06,.035],[.02,.026],[.078,-.19],[-.017,-.017],[-.07,-.009]].map(([x,y])=>new THREE.Vector2(x,y)));
function addSparks(parent,cy,count){
 for(let i=0;i<count;i++){
  const bolt=mesh(new THREE.ExtrudeGeometry(boltShape,{depth:.02,bevelEnabled:false}),0xfff45c,parent,0,cy,0,{emissive:0xffe14d,emissiveIntensity:2.6,roughness:.25});
  bolt.visible=false;bolt.userData={angle:i/count*Math.PI*2,radius:.6+(i%3)*.13,cy,seed:i*1.7+.4};
  sparks.push(bolt);
 }
}
function label(parent,text,y=1.4,w=1.4){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#f9fcff';ctx.fillRect(0,0,512,128);ctx.fillStyle='#173451';ctx.font='bold 55px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,67,490);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));sprite.scale.set(w,w/4,1);sprite.position.set(0,y,.55);parent.add(sprite);}
// A real OIML-style calibration mass: cylindrical body + lifting knob, not a box.
function metalWeight(parent,scale=1){
 mesh(new THREE.CylinderGeometry(.5*scale,.52*scale,.6*scale,28),0x4b5b68,parent,0,.3*scale,0,{metalness:.65,roughness:.32});
 mesh(new THREE.CylinderGeometry(.16*scale,.2*scale,.24*scale,20),0x30404d,parent,0,.72*scale,0,{metalness:.6,roughness:.3});
 const ring=mesh(new THREE.TorusGeometry(.5*scale,.04*scale,10,28),0x2a3742,parent,0,.03*scale,0,{metalness:.6,roughness:.35});ring.rotation.x=Math.PI/2;
}
function weight(x){const g=new THREE.Group();metalWeight(g,1);label(g,'10 kg',.98,1.02);g.position.set(x,.62,0);view.scene.add(g);return g;}
function output(u,text,real){
 const g=new THREE.Group();const kind=real?'weight':u.kind;const blue=0x22aee0,yellow=0xffd24f;
 if(kind==='weight'){
  const scale=real?1:({kg:1,g:.45,mg:.22,lb:.85,oz:.6,t:1.55}[u.symbol]);
  metalWeight(g,scale);
 }else if(['liquid','drop','tank'].includes(kind)){
  const s=kind==='drop'?.45:kind==='tank'?1.3:1;
  box(g,1.25*s,1.3*s,1*s,0xb1ecff,0,.65*s,0,{transparent:true,opacity:.22,depthWrite:false});
  const liquid=box(g,1.13*s,.9*s,.9*s,blue,0,.46*s,0,{transparent:true,opacity:.8});g.userData.liquid=liquid;
  box(g,1.32*s,.09,1.07*s,0x47789c,0,.045);for(let i=0;i<5;i++)box(g,.17,.025,.02,0xffffff,.48*s,.25+i*.19*s,.52*s);
 }else if(kind==='resistor'){
  // Cylindrical resistor body with lead wires and standard-style colour bands, not stacked boxes.
  const body=mesh(new THREE.CylinderGeometry(.19,.19,.85,20),0xe7c491,g,0,.55,0,{roughness:.55});body.rotation.z=Math.PI/2;
  for(const x of [-.62,.62]){const lead=mesh(new THREE.CylinderGeometry(.035,.035,.5,8),0xb8bec4,g,x,.55,0,{metalness:.7,roughness:.3});lead.rotation.z=Math.PI/2;}
  [0x6b4a2f,0x1a1a1a,0xc23b3b,0xd4af37].forEach((c,i)=>{const band=mesh(new THREE.CylinderGeometry(.2,.2,.06,20),c,g,-.28+i*.19,.55,0,{roughness:.4});band.rotation.z=Math.PI/2;});
 }else if(kind==='bulb'){
  // Incandescent bulb standing on its own: Edison screw base, tapered neck, glass envelope, coiled filament.
  mesh(new THREE.CylinderGeometry(.22,.24,.34,20),0xc7c7c7,g,0,.17,0,{metalness:.65,roughness:.35});
  for(let i=0;i<4;i++)mesh(new THREE.TorusGeometry(.155,.024,8,20),0xb0b0b0,g,0,.07+i*.085,0,{metalness:.65,roughness:.4});
  mesh(new THREE.CylinderGeometry(.14,.22,.24,20),0xfff7e0,g,0,.46,0,{transparent:true,opacity:.35,roughness:.08});
  mesh(new THREE.SphereGeometry(.44,24,16),0xfff7e0,g,0,.98,0,{transparent:true,opacity:.35,roughness:.08});
  const filamentPts=[];for(let i=0;i<=24;i++){const t=i/24;filamentPts.push(new THREE.Vector3(Math.sin(t*Math.PI*6)*.08,.68+t*.5,Math.cos(t*Math.PI*6)*.08));}
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(filamentPts),48,.012,6,false),0xffb347,g,0,0,0,{emissive:0xffae21,emissiveIntensity:1.2});
  addSparks(g,.98,9);
 }else if(['electric','current','energy'].includes(kind)){
  // AA-cell style battery casing: cylindrical can, brass button terminal, copper base.
  mesh(new THREE.CylinderGeometry(.42,.42,.95,24),0x2d4c7b,g,0,.55,0,{metalness:.35,roughness:.4});
  mesh(new THREE.CylinderGeometry(.14,.16,.15,16),0xd8b23a,g,0,1.09,0,{metalness:.6,roughness:.35});
  mesh(new THREE.CylinderGeometry(.42,.42,.04,24),0xb08d3e,g,0,.08,0,{metalness:.6,roughness:.3});
  if(kind==='energy'){
   const points=[[-.25,1.38],[.22,1.38],[-.07,.91],[.3,.91],[-.3,.3],[-.09,.8],[-.4,.8]].map(([x,y])=>new THREE.Vector2(x,y));
   mesh(new THREE.ExtrudeGeometry(new THREE.Shape(points),{depth:.13,bevelEnabled:false}),yellow,g,0,0,.15,{emissive:0xffbb20,emissiveIntensity:.4});
  }
  addSparks(g,.7,9);
 }else if(kind==='length'){
  const length={mm:.22,cm:.65,in:1.1,ft:1.7,m:2.15,km:2.7}[u.symbol];box(g,length,.22,.42,yellow,0,.2);for(let i=0;i<=10;i++)box(g,.018,.015,i%5===0?.3:.15,0x253e56,-length/2+i*length/10,.32,.03);
 }else if(kind==='area'){box(g,1.6,.1,1.1,0x62c5ad,0,.1);for(let i=0;i<5;i++)box(g,.018,.015,1.1,0x226d69,-.8+i*.32,.16);box(g,1.6,.015,.018,0x226d69,0,.16);}
 else if(kind==='clock'){const dial=mesh(new THREE.CylinderGeometry(.64,.64,.16,32),0xffe9a3,g,0,.73);dial.rotation.x=Math.PI/2;for(let i=0;i<12;i++)box(g,.045,.09,.03,0x173451,Math.sin(i*Math.PI/6)*.51,.73+Math.cos(i*Math.PI/6)*.51,.1);box(g,.035,.43,.035,0xb92f3c,0,.91,.12);box(g,.28,.04,.03,0x173451,.12,.73,.13);}
 else if(kind==='cold'||kind==='ice'){
  if(kind==='ice'){
   // Real ice crystals are hexagonal prisms, not octahedra: hex-prism body with pyramidal caps.
   for(let i=0;i<3;i++){
    const cx=(i-1)*.5,cy=.55+(i%2)*.35,mat={metalness:.15,roughness:.08,transparent:true,opacity:.85};
    const prism=mesh(new THREE.CylinderGeometry(.22,.22,.6,6),0x9fe6f5,g,cx,cy,0,mat);prism.rotation.y=Math.PI/6;
    const topCap=mesh(new THREE.ConeGeometry(.22,.22,6),0x9fe6f5,g,cx,cy+.41,0,mat);topCap.rotation.y=Math.PI/6;
    const botCap=mesh(new THREE.ConeGeometry(.22,.22,6),0x9fe6f5,g,cx,cy-.41,0,mat);botCap.rotation.set(Math.PI,Math.PI/6,0);
   }
  }else{box(g,.25,1.25,.22,0xe7f6ff,0,.7);box(g,.075,.55,.25,0x25a0d0,0,.38,.04);mesh(new THREE.SphereGeometry(.21,16,12),blue,g,0,.18,.05);}
 }
 else if(kind==='spring'){const points=[];for(let i=0;i<=160;i++){const a=i/160*Math.PI*12;points.push(new THREE.Vector3(Math.cos(a)*.28,.2+i/160,Math.sin(a)*.28));}mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),160,.045,8,false),0xe6ad38,g);box(g,.8,.12,.8,0x345c86,0,.08);box(g,.8,.12,.8,0x345c86,0,1.3);}
 else if(kind==='wave'){const points=[];for(let i=0;i<70;i++)points.push(new THREE.Vector3((i/69-.5)*1.9,.7+Math.sin(i/69*Math.PI*6)*.35,0));mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),90,.045,8,false),0xb447b9,g);box(g,2,.1,.5,0x35597d,0,.08);}
 label(g,text,kind==='bulb'?1.75:1.95,text.length>12?2.5:1.65);g.position.set(0,.62,0);view.scene.add(g);return g;
}
function setup(){
 view=createScene($('factory-canvas'),{THREE,clearColor:0xdce9f4,maxDpr:1.7,fov:30});view.camera.position.set(-1.4,3.2,13.5);view.camera.lookAt(-1.4,1.35,.1);
 view.scene.add(new THREE.HemisphereLight(0xffffff,0x537087,2.8));const light=new THREE.DirectionalLight(0xfff2d8,3);light.position.set(-3,8,5);view.scene.add(light);
 box(view.scene,200,.15,200,0xc8dbe9,0,-.9,0);
 box(view.scene,12,.35,2.15,0x285783,0,.23);box(view.scene,12,.12,1.78,0x334657,0,.48);
 for(let x=-5.8;x<=5.8;x+=.38){const roller=mesh(new THREE.CylinderGeometry(.12,.12,1.8,12),0x6f8597,view.scene,x,.46);roller.rotation.x=Math.PI/2;rollers.push(roller);}
 for(const x of [-4.8,4.8])for(const z of [-.75,.75])box(view.scene,.24,1.15,.24,0x315579,x,-.3,z);
 for(const z of [-1.08,1.08]){box(view.scene,12,.12,.1,0xffc941,0,.8,z);}
 // An open front lets the player see the weight under the press.
 for(const x of [-1.55,1.55])box(view.scene,.38,3.8,.5,0x2466b0,x,1.45,-.78);
 box(view.scene,3.5,.65,1.75,0x2875bf,0,3.4,-.24);const sign=new THREE.Group();sign.position.set(0,2.87,.3);label(sign,'UNIT FACTORY',.6,2.7);view.scene.add(sign);
 press=new THREE.Group();box(press,.28,.75,.28,0xb7cad9,0,0);box(press,1.8,.23,1.4,0xffcc45,0,-.4);press.position.set(0,2.7,0);view.scene.add(press);
 box(view.scene,1.15,.4,.8,0x2864a0,-3,.1,1.8);handle=new THREE.Group();mesh(new THREE.CylinderGeometry(.065,.065,.75,12),0xc8d6e2,handle,0,.38);mesh(new THREE.SphereGeometry(.16,16,12),0xc72f40,handle,0,.79);handle.position.set(-3,.3,1.8);handle.rotation.z=-.4;view.scene.add(handle);
 cargo=[weight(-3.2),weight(-5.5)];
}
function load(){if(['loading','working'].includes(phase))return;sparks=[];phase='loading';elapsed=0;$('lever').classList.add('pulled');say('Conveyor moving…','The next 10 kg weight is moving under the machine.');lock();}
function choose(){let pool=available();if($('recipe').value==='random')$('unit').value=pool[Math.floor(Math.random()*pool.length)].symbol;else if($('recipe').value==='cycle')$('unit').value=(pool.find(u=>!discovered.has(u.symbol))||pool[sequence++%pool.length]).symbol;hint();}
function transform(){if(phase!=='ready')return;choose();current=units.find(u=>u.symbol===$('unit').value);phase='working';elapsed=0;say(`Making ${$('mode').value==='real'?'a new mass label':`10 ${current.symbol}`}…`);lock();}
function finish(){
 const real=$('mode').value==='real';const amount=real?10*massFactors[current.symbol]:10;const value=new Intl.NumberFormat('en-US',{maximumFractionDigits:5}).format(amount);const text=`${value} ${current.symbol}`;
 if(view){remove(cargo.shift());result=output(current,text,real);}
 const detail=real?`Same mass, new unit: 10 kg ${['lb','oz'].includes(current.symbol)?'≈':'='} ${text}. The size stays the same. ${current.fact}`:`Imaginary transformation: mass → ${current.family.toLowerCase()}. ${current.fact}`;
 say(`${real?'Converted':'Transformed'}: 10 kg → ${text}`,detail);
 discovered.add(current.symbol);$('counter').textContent=`${discovered.size} / ${units.length} units discovered`;
 records.unshift({output:text,mode:real?'Real mass conversion':'Imagination',family:current.family,note:detail});records=records.slice(0,40);renderHistory();phase='done';autoTime=0;lock();
}
function renderHistory(){$('history').replaceChildren();$('empty').hidden=records.length>0;for(const r of records){const li=document.createElement('li'),title=document.createElement('strong'),note=document.createElement('span');title.textContent=`10 kg → ${r.output} · ${r.mode}`;note.textContent=r.note;li.append(title,note);$('history').append(li);}}
function reset(){phase='empty';elapsed=autoTime=0;current=null;records=[];discovered.clear();sequence=0;$('auto').checked=false;if(view){cargo.forEach(remove);remove(result);cargo=[weight(-3.2),weight(-5.5)];result=null;sparks=[];press.position.y=2.7;handle.rotation.z=-.4;}$('lever').classList.remove('pulled');$('counter').textContent=`0 / ${units.length} units discovered`;renderHistory();say('Pull the lever to load your first 10 kg weight.','Imagination mode invents a new object. Only real conversion mode preserves the input mass.');lock();}
$('lever').addEventListener('click',load);$('transform').addEventListener('click',transform);$('reset').addEventListener('click',reset);$('unit').addEventListener('change',hint);$('mode').addEventListener('change',()=>{refreshOptions();say(phase==='ready'?'Weight ready. Choose a unit and transform.':'Pull the lever to load the next weight.',$('mode').value==='real'?'Real conversion preserves the 10 kg mass. Only mass units are available.':'Imagination mode keeps 10 and invents a new quantity. This is not a physical conversion.');});
$('download').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({lesson:'The Unit Factory',discovered:[...discovered],runs:records},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='unit-factory-discoveries.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
for(const b of document.querySelectorAll('.uf-answer'))b.addEventListener('click',()=>{$('quiz').textContent=b.dataset.correct==='true'?'Correct! Each kilogram contains 1,000 grams, so 10 × 1,000 = 10,000 g. The mass is unchanged.':'Try again: 1 kg = 1,000 g. Multiply 10 by 1,000; a smaller unit needs a larger number.';});
refreshOptions();try{setup();}catch(error){console.warn('Unit Factory 3D unavailable:',error);view=null;$('fallback').hidden=false;}
$('factory-canvas').addEventListener('webglcontextlost',event=>{event.preventDefault();$('fallback').hidden=false;view=null;});
SimKit.loop(dt=>{
 dt=Math.min(dt,.05);elapsed+=dt;sceneTime+=dt;const reduced=$('motion').checked;
 if(phase==='loading'){
  const p=Math.min(1,elapsed/(reduced?.12:1.1));if(view){if(result)result.position.x=p*5.7;cargo.forEach((g,i)=>g.position.x=(-3.2-i*2.3)*(1-p)+(-i*3.2)*p);handle.rotation.z=-.4+p*1.2;rollers.forEach(r=>r.rotation.y+=dt*5);}
  if(p===1){remove(result);result=null;phase='ready';elapsed=0;$('lever').classList.remove('pulled');if(view){handle.rotation.z=-.4;if(cargo.length<2)cargo.push(weight(-3.2));}say('10 kg is centered. Press Transform.','Choose an output unit, then run the machine.');lock();}
 }else if(phase==='working'){
  const p=Math.min(1,elapsed/(reduced?.15:1.3));if(view)press.position.y=2.7-Math.sin(p*Math.PI)*.75;if(p===1){if(view)press.position.y=2.7;finish();}
 }
 if($('auto').checked&&!['loading','working'].includes(phase)){autoTime+=dt;if(autoTime>1.8){autoTime=0;phase==='ready'?transform():load();}}else if(!$('auto').checked)autoTime=0;
 if(view){
  if(result&&!reduced){
   if(result.userData.liquid)result.userData.liquid.rotation.z=Math.sin(sceneTime*2)*.035;
   for(const spark of sparks){
    const {angle,radius,cy,seed}=spark.userData,t=sceneTime*9+seed*13;
    const flash=Math.sin(t)+Math.sin(t*2.3+seed)>.15;
    spark.visible=flash;
    if(flash){
     const a=angle+Math.sin(sceneTime*2.2+seed)*.5,r=radius+Math.sin(t*3)*.08;
     spark.position.set(Math.cos(a)*r,cy+Math.sin(a*1.7+seed)*.28,Math.sin(a)*r*.6);
     spark.rotation.set(seed,seed*2,t*4);
     spark.scale.setScalar(1.1+((t*37)%1)*.9);
    }
   }
  }else for(const spark of sparks)spark.visible=false;
  view.syncSize();const distance=Math.max(12,8.6/(view.camera.aspect*Math.tan(THREE.MathUtils.degToRad(15))));view.camera.position.set(-distance*.1,.5+distance*.2,distance*.99);view.camera.lookAt(-1.4,1.35,.1);view.renderer.render(view.scene,view.camera);
 }
});
