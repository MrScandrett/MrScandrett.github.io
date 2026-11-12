import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';

// Original educational geometry; no external models or textures.
const canvas = document.getElementById('pc3d-canvas');
const status = document.getElementById('pc3d-status');
const buttons = [...document.querySelectorAll('[data-cpu-action]')];
try {
  const {renderer, scene, camera, syncSize} = createScene(canvas, {THREE, clearColor:0x0b1b29, maxDpr:1.8});
  camera.position.set(7,9,10);
  const controls = new OrbitControls(camera,canvas);
  controls.target.set(-0.4,0,0); controls.minDistance=5; controls.maxDistance=20;
  controls.maxPolarAngle=Math.PI*.48; controls.enablePan=false;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.15;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene.add(new THREE.HemisphereLight(0xc5dcff,0x1e3430,.85));
  const light=new THREE.DirectionalLight(0xffeed5,3.2);
  light.position.set(-3,9,5);light.castShadow=true;
  light.shadow.mapSize.set(2048,2048);
  Object.assign(light.shadow.camera,{left:-9,right:9,top:7,bottom:-7,near:.5,far:25});
  light.shadow.normalBias=.025;light.shadow.bias=-.00015;
  light.shadow.radius=3;scene.add(light);
  const fill=new THREE.DirectionalLight(0x8fcaff,1.25);fill.position.set(5,4,-4);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xb7ffdf,1.5);rim.position.set(-4,3,-6);scene.add(rim);
  // Original studio softboxes provide broad reflections on conductive surfaces.
  const studio=new THREE.Scene();studio.background=new THREE.Color(0x334451);
  for(const [x,y,z,w,h,intensity] of [[-4,7,3,6,4,5],[5,5,-3,4,5,3],[-3,3,-7,5,2,2]]) {
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color().setScalar(intensity),side:THREE.DoubleSide}));
    panel.position.set(x,y,z);panel.lookAt(0,0,0);studio.add(panel);
  }
  const pmrem=new THREE.PMREMGenerator(renderer);
  const environment=pmrem.fromScene(studio,.08);scene.environment=environment.texture;
  scene.environmentIntensity=.65;pmrem.dispose();
  studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  // Deterministic, subtle surface grain; generated locally without image assets.
  function grain(kind) {
    const c=document.createElement('canvas');c.width=c.height=256;
    const ctx=c.getContext('2d'), pixels=ctx.createImageData(256,256);
    let seed=1729;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let y=0;y<256;y++)for(let x=0;x<256;x++) {
      const v=Math.round(128+(random()-.5)*(kind==='metal'?18:30)+(kind==='metal'?Math.sin(y*2.8)*13:((x%4===0||y%4===0)?5:0)));
      const i=(y*256+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;
    }
    ctx.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(c);
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.repeat.set(kind==='metal'?2:6,kind==='metal'?2:6);
    texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return texture;
  }
  const pcbGrain=grain('pcb'),metalGrain=grain('metal'),plasticGrain=grain('plastic');
  const mat = (color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.7,...extra});
  const green=new THREE.MeshPhysicalMaterial({color:0x125b44,roughness:.43,metalness:.12,clearcoat:.38,clearcoatRoughness:.3,bumpMap:pcbGrain,bumpScale:.012});
  const dark=mat(0x18232b,{roughness:.76,bumpMap:plasticGrain,bumpScale:.008});
  const metal=mat(0xbac8cc,{metalness:.92,roughness:.3,bumpMap:metalGrain,bumpScale:.006});
  const gold=mat(0xe7af45,{metalness:.88,roughness:.27});
  function box(parent,w,h,d,x,y,z,material) {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=w>.14&&d>.14&&h>.08;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  // Coordinates share one board datum: PCB top = -0.21; socket seat = 0.20.
  // Fictional micro-ATX-style layout, with component keep-out space around the CPU.
  const pcbTop=-.21, socketX=-1.05, socketZ=-.85;
  const traceMat=mat(0x428f70,{roughness:.38,metalness:.25}), black=mat(0x121b22,{roughness:.82,bumpMap:plasticGrain,bumpScale:.006}), white=mat(0xcbded4,{roughness:.62});
  function cylinder(parent,r,h,x,y,z,material,segments=20) {
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),material);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function label(text,x,z,width=1.5,size=100,parent=scene,y=pcbTop+.018) {
    const c=document.createElement('canvas');c.width=512;c.height=128;
    const ctx=c.getContext('2d');ctx.fillStyle='#d4e5df';ctx.font=`600 ${size}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width/4),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
    mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  box(scene,13,.25,9,0,-.7,0,mat(0x203042,{roughness:.85,bumpMap:plasticGrain,bumpScale:.018}));
  box(scene,8,.16,6,0,-.29,0,green);
  // Plated mounting holes sit on hexagonal standoffs; they do not pass through chips.
  for(const [x,z] of [[-3.65,-2.65],[0,-2.65],[3.65,-2.65],[-3.65,0],[3.65,0],[-3.65,2.65],[0,2.65],[3.65,2.65]]) {
    cylinder(scene,.12,.25,x,-.49,z,gold,6);
    cylinder(scene,.14,.018,x,pcbTop+.01,z,metal);
    cylinder(scene,.065,.02,x,pcbTop+.025,z,black);
  }
  // Short orthogonal traces stay outside the socket and slots.
  for(let i=0;i<10;i++){
    const z=.6+i*.16;
    box(scene,.65,.008,.012,.45,pcbTop+.006,z,traceMat);
    box(scene,.012,.008,.35,.78+i*.025,pcbTop+.006,z+.17,traceMat);
  }
  // Four dual-wall DIMM connectors with visible keyed channels and end clips.
  for(let i=0;i<4;i++) {
    const x=1.25+i*.48;
    box(scene,.23,.16,3.55,x,-.13,-.7,black);
    for(const dx of [-.09,.09])box(scene,.045,.17,3.55,x+dx,-.015,-.7,dark);
    box(scene,.15,.15,.095,x,-.015,-.43,dark);
    for(const z of [-2.57,1.17])box(scene,.29,.25,.2,x,.0,z,white);
    label(['A1','A2','B1','B2'][i],x,1.4,.4);
  }
  // Main 24-pin header follows the board's right edge, separate from DIMM clips.
  box(scene,.38,.4,1.65,3.45,0,-.65,black);
  for(let row=0;row<2;row++)for(let pin=0;pin<12;pin++)box(scene,.095,.015,.075,3.35+row*.2,.208,-1.37+pin*.13,dark);
  label('24-PIN',3.35,.5,.72);
  box(scene,.75,.3,.34,-2.1,-.02,-2.65,black);label('CPU_PWR',-2.08,-2.35,.9);
  // Voltage regulator bank and finned heatsinks flank the socket.
  for(let i=0;i<6;i++) {
    box(scene,.22,.23,.23,-2.55,-.04,-1.95+i*.4,mat(0x5b6268));
    cylinder(scene,.09,.24,-2.87,-.04,-1.95+i*.4,metal);
  }
  for(let i=0;i<7;i++)box(scene,.045,.35,2.55,-3.14+i*.085,.05,-.95,dark);
  for(let i=0;i<7;i++)box(scene,1.9,.3,.045,-.8,.025,-2.62+i*.07,dark);
  // Expansion slots, M.2 connector/standoff, chipset heatsink, battery and SATA ports.
  for(const [z,length] of [[1.25,3.3],[2.25,3.3],[1.8,.95]]) {
    box(scene,length,.2,.24,-1.25,-.08,z,black);
    box(scene,length-.13,.014,.065,-1.25,.028,z,gold);
    box(scene,.12,.24,.3,-1.25+length/2,.0,z,white);
  }
  label('PCIe x16',-1.35,1.52,1.05);
  box(scene,.18,.16,.34,.35,-.09,1.75,black);
  cylinder(scene,.09,.1,2.35,-.13,1.75,metal);
  label('M.2 / SSD',1.35,1.75,1.35);
  box(scene,1.15,.16,.75,1.25,-.08,2.2,dark);
  for(let i=0;i<9;i++)box(scene,.065,.18,.75,.77+i*.12,.08,2.2,metal);
  cylinder(scene,.33,.12,3.15,-.12,.9,metal);label('+',3.15,.9,.3,90,scene,-.052);
  for(let i=0;i<2;i++)box(scene,.35,.24,.6,3.42,-.02,1.8+i*.65,dark);
  for(let i=0;i<8;i++)box(scene,.08,.1,.08,-2.2+i*.16,-.08,2.78,gold);
  label('FRONT PANEL',-1.55,2.52,1.25);
  // Rear I/O housings face outward along the left board edge.
  for(const [z,d,h] of [[-2.25,.5,.5],[-1.55,.65,.6],[-.65,.7,.55],[.25,.65,.75],[1.2,.75,.55]]) {
    box(scene,.6,h,d,-3.65,pcbTop+h/2,z,metal);
    box(scene,.018,h*.55,d*.65,-3.96,pcbTop+h/2,z,black);
  }
  label('ALPHA / TRAINING BOARD',.1,2.8,2.25,65);
  // Socket body and fine contact field; CPU underside seats at y = .20.
  box(scene,2.1,.12,2.1,socketX,-.1,socketZ,metal);
  const socket=box(scene,1.82,.2,1.82,socketX,.06,socketZ,black);
  for(let x=0;x<18;x++)for(let z=0;z<18;z++)box(scene,.022,.025,.04,socketX-.76+x*.089,.173,socketZ-.76+z*.089,gold);
  for(const x of [-2.2,.1])for(const z of [-2, .3]){
    cylinder(scene,.12,.03,x,pcbTop+.02,z,metal);
    cylinder(scene,.055,.04,x,pcbTop+.04,z,black);
  }
  label('CPU_FAN',.35,-1.95,.75);
  for(let i=0;i<4;i++)box(scene,.045,.22,.045,.15+i*.13,-.02,-1.72,gold);
  function triangle(parent,x,y,z) {
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,.35,0,0,0,0,.35],3));geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xffcb61,side:THREE.DoubleSide}));mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  triangle(scene,socketX-1.04,.19,socketZ-1.04);
  const ghost=box(scene,1.72,.15,1.72,socketX,1.5,socketZ,mat(0x9de5d1,{transparent:true,opacity:.18,depthWrite:false}));
  const outline=new THREE.LineSegments(new THREE.EdgesGeometry(ghost.geometry),new THREE.LineBasicMaterial({color:0x9de5d1}));ghost.add(outline);ghost.castShadow=false;ghost.receiveShadow=false;
  box(scene,2.4,.14,2.4,-5,-.05,0,mat(0x3b5266));
  for(const z of [-1.1,1.1])box(scene,2.4,.12,.12,-5,.08,z,dark);
  for(const x of [-6.1,-3.9])box(scene,.12,.12,2.2,x,.08,0,dark);
  label('CPU TRAY',-5,1.6,1.8);
  const cpu=new THREE.Group();scene.add(cpu);
  box(cpu,1.7,.13,1.7,0,0,0,mat(0x326f61));
  // Stepped heat spreader leaves the substrate and alignment triangle exposed.
  box(cpu,1.37,.1,1.37,0,.115,0,metal);
  box(cpu,1.19,.035,1.19,0,.182,0,metal);
  label('ALPHA',0,0,.93,88,cpu,.204);
  for(let i=0;i<7;i++)for(const z of [-.75,.75])box(cpu,.05,.018,.035,-.5+i*.16,.079,z,gold);
  triangle(cpu,-.82,.08,-.82);
  // A hinged arm rotates up and away from the socket.
  const arm=new THREE.Group();arm.position.set(socketX+1.16,.2,socketZ-1.05);scene.add(arm);
  box(arm,.07,.07,2.2,0,0,1.1,metal);box(arm,.4,.07,.07,-.17,0,2.17,metal);
  // Open-center load plate hinges at the back, retaining the substrate edges.
  const plate=new THREE.Group();plate.position.set(socketX,.24,socketZ-1);scene.add(plate);
  for(const x of [-.94,.94])box(plate,.16,.055,2,x,0,1,metal);
  for(const z of [.05,1.95])box(plate,1.75,.055,.16,0,0,z,metal);
  const hinge=box(scene,1.7,.16,.16,socketX,.18,socketZ-1.08,metal);
  let state='tray', rotation=1, opened=false;
  const target=new THREE.Vector3();
  const say=text=>{status.textContent=text;};
  function sync() {
    buttons.forEach(b=>{const a=b.dataset.cpuAction;b.disabled=(a==='pick'&&state!=='tray')||(a==='rotate'&&state!=='held')||(a==='seat'&&state!=='held')||(a==='latch'&&(state!=='seated'||!opened))||(a==='open'&&(opened||state==='latched'));});
    ghost.visible=state==='held';
    canvas.dataset.cpuState=state;canvas.dataset.cpuRotation=String(rotation);canvas.dataset.socketOpen=String(opened);
  }
  function reset() {
    state='tray';rotation=1;opened=false;cpu.position.set(-5,.25,0);cpu.rotation.y=Math.PI/2;arm.rotation.x=0;plate.rotation.x=0;
    say('1 / Pick up the CPU from its tray. The gold triangle marks its alignment corner.');sync();draw();
  }
  function action(a) {
    if(a==='view'){camera.position.set(7,9,10);controls.target.set(-.4,0,0);controls.update();draw();return;}
    if(a==='reset'){reset();return;}
    if(a==='pick'&&state==='tray'){state='held';say('2 / CPU lifted. Rotate it until its gold corner matches the socket’s gold corner. Open the socket arm before lowering.');}
    if(a==='rotate'&&state==='held'){rotation=(rotation+1)%4;say(rotation===0?'Alignment matched. Open the arm, then lower the CPU gently.':'Corners do not match yet. Rotate again; never force a CPU into a socket.');}
    if(a==='open'&&!opened&&state!=='latched'){opened=true;say('Socket arm open. Align the gold corners and lower the CPU without force.');}
    if(a==='seat'&&state==='held'){
      if(!opened)say('Open the socket arm first. The retention mechanism must be released.');
      else if(rotation!==0)say('Alignment mismatch. Rotate the CPU until the gold triangles share the same corner.');
      else{state='seated';say('3 / CPU seated flat. Close the socket arm to secure it.');}
    }
    if(a==='latch'&&state==='seated'&&opened){opened=false;state='latched';say('CPU installation complete! The chip is aligned, seated, and secured. A cooler is still needed before this computer can run.');}
    sync();animate();
  }
  // Short transitions run only during interaction; orbiting renders on demand.
  let frame=0;
  function draw(){syncSize();renderer.render(scene,camera);}
  function animate(){
    cancelAnimationFrame(frame);
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    let steps=0;
    function tick(){
      target.set(state==='tray'?-5:socketX,state==='held'?1.5:state==='tray'?.25:.265,state==='tray'?0:socketZ);
      const factor=reduced?1:.22;cpu.position.lerp(target,factor);
      cpu.rotation.y=THREE.MathUtils.lerp(cpu.rotation.y,rotation*Math.PI/2,factor);
      arm.rotation.x=THREE.MathUtils.lerp(arm.rotation.x,opened?-1.35:0,factor);
      plate.rotation.x=THREE.MathUtils.lerp(plate.rotation.x,opened?-1.65:0,factor);
      draw();if(!reduced&&++steps<35)frame=requestAnimationFrame(tick);
    }tick();
  }
  buttons.forEach(b=>b.addEventListener('click',()=>action(b.dataset.cpuAction)));
  const ray=new THREE.Raycaster();let down;
  canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
  canvas.addEventListener('pointerup',e=>{
    if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)return;
    const r=canvas.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);
    const hits=ray.intersectObjects([...cpu.children,socket,...arm.children]);const hit=hits[0]?.object;
    if(cpu.children.includes(hit))action(state==='tray'?'pick':state==='held'?'rotate':'latch');
    else if(arm.children.includes(hit))action(opened?'latch':'open');
    else if(hit===socket)action('seat');
  });
  controls.addEventListener('change',draw);
  new ResizeObserver(draw).observe(canvas);
  document.addEventListener('creation-app-resize',draw);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimationFrame(frame);else animate();});
  controls.update();reset();
} catch(error) {
  status.textContent='The 3D view could not start on this device. Use the full-build simulator below; all of its installation controls remain available.';
  buttons.forEach(b=>b.disabled=true);
  console.warn('3D CPU practice unavailable:',error);
}
