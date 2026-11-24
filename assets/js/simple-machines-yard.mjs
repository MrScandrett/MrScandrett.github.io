import { THREE as T, OrbitControls } from '../vendor/three-bundle.min.js';
import { createScene } from './sim-kit-three.mjs';

const yard = document.querySelector('.machine-yard');
const canvas = yard.querySelector('canvas');
const id = name => document.getElementById('sml-' + name);

function openYard() {
  const { renderer, scene, camera, syncSize } = createScene(canvas, { THREE:T, far:160, maxDpr:1.5 });
  scene.background = new T.Color(0xbcd8de);
  scene.fog = new T.FogExp2(0xbcd8de, .019);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  scene.add(new T.HemisphereLight(0xfff4dc, 0x718291, 2));
  const sun = new T.DirectionalLight(0xffe3b4, 2.6);
  sun.position.set(-12,20,10);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left:-25,right:25,top:18,bottom:-18 });
  sun.shadow.mapSize.set(2048,2048);
  sun.shadow.normalBias = .025;
  scene.add(sun);
  const controls = new OrbitControls(camera,canvas);
  controls.enablePan = false;
  controls.minDistance = 5;
  controls.maxDistance = 40;
  controls.maxPolarAngle = Math.PI * .48;
  const render = () => { syncSize(); renderer.render(scene,camera); };
  const group = (parent=scene) => { const g=new T.Group(); parent.add(g); return g; };
  const cube = new T.BoxGeometry(1,1,1);
  const materials = new Map();
  function part(parent, geometry, color, x,y,z) {
    if (!materials.has(color)) materials.set(color,new T.MeshStandardMaterial({color}));
    const m = new T.Mesh(geometry,materials.get(color));
    m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
  }
  function box(parent,x,y,z,w,h,d,color) {
    const m=part(parent,cube,color,x,y,z); m.scale.set(w,h,d); return m;
  }
  const steel=0x36505a, yellow=0xe7ac43;
  function crate(parent) {
    const g=group(parent);
    box(g,0,.42,0,.95,.84,.88,0xa67648);
    for(const side of [-1,1]) {
      for(const y of [.1,.75]) box(g,0,y,side*.45,.98,.12,.055,0xe0aa6c);
      box(g,0,.42,side*.46,1.05,.105,.06,0xd5995e).rotation.z=side*.62;
    }
    return g;
  }
  box(scene,0,-.18,0,100,.34,80,0x97a49c);
  const grid=new T.GridHelper(80,80,0x62797a,0x849590); grid.position.y=.004; scene.add(grid);
  // Corrugated freight sheds and loading bays give the yard a visible scale.
  for(let i=-2;i<=2;i++) {
    const x=i*9, h=4+Math.abs(i)%2;
    box(scene,x,h/2,-11,8.85,h,5,0x818d89);
    box(scene,x,h,-11,9.1,.22,5.3,steel);
    box(scene,x,1.45,-8.45,3.4,2.9,.12,0x485b60);
    for(let j=0;j<9;j++) box(scene,x,.24+j*.3,-8.35,3.3,.036,.05,0x829391);
    for(const dx of [-2.5,2.5]) box(scene,x+dx,3.3,-8.45,1.35,.7,.15,0xa8cbce);
  }
  const positions={lever:-9,ramp:0,pulley:9};
  const stations={};
  for(const [name,x] of Object.entries(positions)) {
    const g=group(); stations[name]=g; g.position.x=x;
    box(g,0,.045,0,8.25,.09,4.2,0x778882);
    for(const z of [-1.95,1.95]) for(let i=-3;i<=3;i++) box(g,i,.1,z,.62,.014,.13,yellow);
  }
  const pivot=group(stations.lever), beam=group(pivot), leverLoad=crate(beam);
  box(beam,0,.02,0,6.5,.2,.85,steel);
  box(beam,2.95,.15,0,.55,.1,.9,yellow);
  leverLoad.position.set(-3,.12,0);
  // Extrude the side profile across the machine, with its base on the pad.
  function prism(parent, points, depth, color) {
    const profile = new T.Shape();
    profile.moveTo(...points[0]);
    for (const point of points.slice(1)) profile.lineTo(...point);
    profile.closePath();
    const geometry = new T.ExtrudeGeometry(profile, { depth, bevelEnabled:false });
    geometry.translate(0, 0, -depth/2);
    return part(parent, geometry, color, 0, .09, 0);
  }
  const stand = prism(stations.lever, [[-.68,0],[.68,0],[0,1.35]], .78, yellow);
  const pin = part(pivot, new T.CylinderGeometry(.09,.09,1,24), yellow, 0,0,0);
  pin.rotation.x = Math.PI/2;
  const rampLoad=crate(stations.ramp);
  const ramp = prism(stations.ramp, [[0,0],[1,0],[1,1]], 1.5, 0xbc804e);
  box(stations.ramp,3.22,.59,0,1.5,1,2.2,steel);
  const rig=stations.pulley;
  for(const x of [-1.8,1.8]) box(rig,x,2,0,.2,3.85,.3,steel);
  box(rig,0,3.9,0,4,.24,.36,yellow);
  const lifted=crate(rig);
  const hanger=box(rig,0,0,0,.10,.32,.12,steel);
  const returnBracket=box(rig,-.44,3.73,-.14,.10,.35,.1,steel);
  const wheelGeometry=new T.CylinderGeometry(.22,.22,.18,24);
  function wheel(x,y) { const w=part(rig,wheelGeometry,steel,x,y,0); w.rotation.x=Math.PI/2; return w; }
  const topWheel=wheel(.68,3.6), lowerWheel=wheel(0,1), returnWheel=wheel(-.44,3.6);
  const topBracket=box(rig,0,3.73,.14,.10,.35,.1,steel);
  const ropeBend=new T.TorusGeometry(.22,.0225,8,32,Math.PI);
  for (const pulley of [topWheel,lowerWheel,returnWheel]) {
    const bend=part(pulley,ropeBend,yellow,0,0,0);
    bend.rotation.x=-Math.PI/2;
    if (pulley===lowerWheel) bend.rotation.z=Math.PI;
  }
  const boxAnchor=box(rig,-.45,0,0,.65,.09,.18,steel);
  const ropes=Array.from({length:4},()=>box(rig,0,0,0,.045,1,.045,yellow));
  function rope(i,x,low,high) {
    const r=ropes[i]; r.visible=true; r.position.set(x,(low+high)/2,0); r.scale.y=high-low;
  }
  let active;
  function frame() {
    const x=positions[active], distance=canvas.clientWidth<480?10:7.4;
    controls.target.set(x,1.25,0); camera.position.set(x+distance*.47,4.5,distance);
    controls.update(); render();
  }
  function update() {
    const machine=document.querySelector('.sml-machine-btn.selected').dataset.machine;
    const arm=Number(id('lever-slider').value)*.6-3;
    pivot.position.set(arm,1.46,0); stand.position.x=arm;
    pivot.rotation.z=-Number(id('lever-travel').value)*.001396;
    beam.position.x=-arm;
    const run=(32+28*Number(id('ramp-slider').value))/74;
    const t=Number(id('ramp-travel').value)/100;
    const crest = 2.47, toe = crest-run;
    ramp.position.x=toe;
    ramp.scale.x=run;
    // In the middle the base follows the slope. At the crest it rocks
    // about the lip until the whole base settles on the loading platform.
    const halfWidth=.475;
    const x=toe-halfWidth+t*(run+2*halfWidth);
    const angle=Math.atan2(1,run);
    const slopeHeight=(x-toe)/run;
    let tilt=angle, height=slopeHeight;
    if (x >= crest) {
      tilt=0; height=1;
    } else if (x > crest-halfWidth*Math.cos(angle)) {
      tilt=angle*(crest-x)/(halfWidth*Math.cos(angle));
      height=1-(crest-x)*Math.tan(tilt);
    } else if (x < toe+halfWidth*Math.cos(angle)) {
      // Rear corner on the pad and front corner on the incline.
      let lo=0, hi=angle;
      for (let i=0;i<20;i++) {
        const test=(lo+hi)/2;
        if (2*halfWidth*Math.sin(test) < (x+halfWidth*Math.cos(test)-toe)/run) lo=test;
        else hi=test;
      }
      tilt=(lo+hi)/2; height=halfWidth*Math.sin(tilt);
    }
    rampLoad.position.set(x,.09+height,0); rampLoad.rotation.z=tilt;
    const n=Number(id('pulley-slider').value), lift=Number(id('lift').value);
    lifted.position.set(n===1?.46:0,.09+lift,0);
    const bottom=lifted.position.y+.85;
    hanger.visible=n>1; hanger.position.y=bottom+.14;
    lowerWheel.visible=n>1; lowerWheel.position.y=bottom+.29;
    ropes.forEach(r=>r.visible=false);
    if(n===1) rope(0,.46,bottom,3.6);
    else {
      rope(0,-.22,bottom+.29,3.78); rope(1,.22,bottom+.29,3.6);
      if(n===3) rope(2,-.66,bottom,3.6);
      topWheel.position.x=.44;
    }
    returnWheel.visible=n===3; returnBracket.visible=n===3;
    if(n===3) {
      rope(0,-.22,bottom+.29,3.6);
      boxAnchor.position.set(-.43,bottom,0);
    }
    boxAnchor.visible=n===3;
    if(n===1) topWheel.position.x=.68;
    topBracket.position.x=topWheel.position.x;
    rope(3,topWheel.position.x+.22,3.35-n*lift,3.6);
    if(machine!==active) { active=machine; frame(); } else render();
  }
  // Grab a crate and project pointer travel onto its visible direction of motion.
  const ray=new T.Raycaster(), pointer=new T.Vector2();
  let drag;
  canvas.addEventListener('pointerdown',e=>{
    const rect=canvas.getBoundingClientRect();
    pointer.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
    ray.setFromCamera(pointer,camera);
    const load={lever:leverLoad,ramp:rampLoad,pulley:lifted}[active];
    if(!ray.intersectObject(load,true).length) return;
    const slider=id(active==='pulley'?'lift':active+'-travel');
    const start=load.getWorldPosition(new T.Vector3());
    const delta=active==='ramp'?new T.Vector3(runLength(),1,0):new T.Vector3(0,active==='lever'?Math.max(.22,Number(id('lever-slider').value)*.6*.14):1,0);
    const end=start.clone().add(delta).project(camera); start.project(camera);
    const dx=(end.x-start.x)*rect.width/2, dy=(start.y-end.y)*rect.height/2;
    drag={slider,value:Number(slider.value),x:e.clientX,y:e.clientY,dx,dy};
    controls.enabled=false; canvas.setPointerCapture(e.pointerId);
  },true);
  function runLength(){return (32+28*Number(id('ramp-slider').value))/74;}
  canvas.addEventListener('pointermove',e=>{
    if(!drag) return;
    const {slider,value,x,y,dx,dy}=drag;
    slider.value=value+Number(slider.max)*((e.clientX-x)*dx+(e.clientY-y)*dy)/Math.max(1,dx*dx+dy*dy);
    slider.dispatchEvent(new Event('input',{bubbles:true}));
  });
  canvas.addEventListener('lostpointercapture',()=>{ drag=null; controls.enabled=true; });
  document.addEventListener('input',update);
  document.querySelectorAll('.sml-machine-btn').forEach(b=>b.addEventListener('click',update));
  document.getElementById('yard-view').addEventListener('click',frame);
  controls.addEventListener('change',render);
  yard.hidden=false; update();
  new ResizeObserver(render).observe(canvas);
  canvas.addEventListener('webglcontextlost',()=>{yard.hidden=true;});
}
try { openYard(); } catch(error) { yard.hidden=true; console.warn('Machine yard using diagram view.',error); }
