import { THREE } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';
const root=document.querySelector('#camera-flight');
const $=s=>root.querySelector(s),canvas=$('canvas'),status=$('[data-flight-status]');
const gates=[ [0,6,-18], [5,8,-38], [-4,5,-58], [4,10,-78], [-5,7,-98], [0,6,-118] ];
let kit;
try {
 kit=createScene(canvas,{THREE,fov:65,far:250,clearColor:0x102536});
 const {scene,camera,renderer}=kit;
 scene.fog=new THREE.Fog(0x102536,70,210);
 scene.add(new THREE.HemisphereLight(0xcdefff,0x354552,2.5));
 const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(20,40,10);scene.add(sun);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(250,320),new THREE.MeshStandardMaterial({color:0x1c4552,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.z=-65;scene.add(ground);
 const grid=new THREE.GridHelper(260,52,0x54818b,0x2b5b68);grid.position.set(0,.02,-65);scene.add(grid);
 // A deterministic miniature city frames a clear flight corridor; only ring openings are scored.
 for(let i=0;i<48;i++){
  const h=2+(i*7%13),x=(i%2?1:-1)*(17+(i*11%34)),z=15-Math.floor(i/2)*7;
  const tower=new THREE.Mesh(new THREE.BoxGeometry(4,h,4),new THREE.MeshStandardMaterial({color:i%3?0x386679:0x528292}));tower.position.set(x,h/2,z);scene.add(tower);
 }
 const rings=gates.map((g,i)=>{
  const ring=new THREE.Mesh(new THREE.TorusGeometry(3,.22,12,64),new THREE.MeshStandardMaterial({color:0x8399ac,emissive:0x10202b}));ring.position.set(...g);scene.add(ring);
  // Four small beacons make the opening legible without image assets.
  for(let j=0;j<4;j++){const beacon=new THREE.Mesh(new THREE.SphereGeometry(.28,8,8),new THREE.MeshBasicMaterial({color:0xffffff}));beacon.position.set(Math.cos(j*Math.PI/2)*3,Math.sin(j*Math.PI/2)*3,0);ring.add(beacon);}
  return ring;
 });
 let next=0,running=false,ready=true,yaw=0,pitch=0,drag=null;
 const keys=new Set(),position=new THREE.Vector3(),forward=new THREE.Vector3(),right=new THREE.Vector3();
 const say=t=>{status.textContent=t;};
 function updateRange(){const g=gates[Math.min(next,5)];$('[data-flight-range]').textContent=next===6?'Course cleared':`Ring ${next+1} · ${Math.round(position.distanceTo(new THREE.Vector3(...g)))} units`;}
 function release(){keys.clear();drag=null;for(const b of root.querySelectorAll('[data-hold]'))b.setAttribute('aria-pressed','false');}
 function pause(){running=false;release();$('[data-flight="start"]').textContent=next===6?'Course complete':'Resume flight';}
 function paintRings(){rings.forEach((r,i)=>{r.material.color.setHex(i<next?0x4ee3a1:i===next?0xffd166:0x8399ac);r.material.emissive.setHex(i===next?0x6b4000:0x07151a);});$('[data-flight-count]').textContent=`${next} / 6 rings`;}
 function home(){const g=gates[Math.min(next,5)];position.set(g[0],g[1],g[2]+14);yaw=0;pitch=0;camera.fov=65;camera.updateProjectionMatrix();release();updateRange();}
 function reset(){next=0;pause();home();paintRings();$('[data-flight-debrief]').hidden=true;$('[data-flight="start"]').textContent='Start flight';say('Ready. Pan to line up with the gold ring, then hold Forward.');}
 function zoom(factor){camera.fov=THREE.MathUtils.clamp(camera.fov*factor,35,90);camera.updateProjectionMatrix();say('Lens zoom changed. Camera position and distance to the ring stayed the same.');}
 function action(name){
  if(!ready)return;
  if(name==='start'){if(next===6)return;if(running){pause();say('Paused. Look at the course, or change lens zoom.');}else{running=true;$('[data-flight="start"]').textContent='Pause flight';say('Flight active. Hold Forward to travel; release to hover.');canvas.focus();}}
  if(name==='home'){home();say('Recovered before your next ring. Your completed checkpoints are safe.');}
  if(name==='reset')reset();
  if(name==='zoom-in')zoom(.9);if(name==='zoom-out')zoom(1.1);
 }
 for(const b of root.querySelectorAll('[data-flight]'))b.addEventListener('click',()=>action(b.dataset.flight));
 const motion=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','s','a','d'];
 canvas.addEventListener('keydown',e=>{const key=e.key.length===1?e.key.toLowerCase():e.key;if(motion.includes(key)){e.preventDefault();if(running)keys.add(key);}if(e.repeat)return;if(key===' '){e.preventDefault();action('start');}if(key==='h')action('home');if(key==='+'||key==='=')zoom(.9);if(key==='-')zoom(1.1);});
 canvas.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
 canvas.addEventListener('blur',release);
 for(const b of root.querySelectorAll('[data-hold]')){
  b.setAttribute('aria-pressed','false');
  b.addEventListener('pointerdown',e=>{if(!running)return;e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.hold);b.setAttribute('aria-pressed','true');});
  const stop=()=>{keys.delete(b.dataset.hold);b.setAttribute('aria-pressed','false');};
  b.addEventListener('pointerup',stop);b.addEventListener('pointercancel',stop);b.addEventListener('lostpointercapture',stop);
  b.addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();if(running){keys.add(b.dataset.hold);b.setAttribute('aria-pressed','true');}}});
  b.addEventListener('keyup',stop);b.addEventListener('blur',stop);
 }
 canvas.addEventListener('pointerdown',e=>{canvas.focus();canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY};});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw-=(e.clientX-drag.x)*.004;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-drag.y)*.004,-.7,.7);drag={x:e.clientX,y:e.clientY};});
 canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
 canvas.addEventListener('wheel',e=>{if(document.activeElement!==canvas)return;e.preventDefault();zoom(e.deltaY<0?.95:1.05);},{passive:false});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&running){pause();say('Flight paused while you were away.');}});
 window.addEventListener('blur',()=>{if(running){pause();say('Flight paused. Resume when ready.');}});
 reset();
 const loop=window.SimKit.loop(dt=>{
  const step=Math.min(dt,.05),old=position.clone();
  if(running&&next<6){
   yaw+=((keys.has('a')?1:0)-(keys.has('d')?1:0))*step;
   forward.set(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));right.set(Math.cos(yaw),0,-Math.sin(yaw));
   const speed=Number($('#flight-speed').value)*step;
   position.addScaledVector(forward,((keys.has('w')?1:0)-(keys.has('s')?1:0))*speed);
   position.addScaledVector(right,((keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0))*speed);
   position.y+=((keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0))*speed;
   position.y=THREE.MathUtils.clamp(position.y,1,35);position.x=THREE.MathUtils.clamp(position.x,-55,55);
   const g=gates[next];
   if(old.z>g[2]&&position.z<=g[2]){
    const t=(old.z-g[2])/(old.z-position.z),x=THREE.MathUtils.lerp(old.x,position.x,t),y=THREE.MathUtils.lerp(old.y,position.y,t);
    if(Math.hypot(x-g[0],y-g[1])<2.65){next++;paintRings();if(next===6){pause();$('[data-flight-debrief]').hidden=false;say('All six rings cleared! Now transfer pan, zoom and recovery to the CAD workshop below.');}else say(`Ring ${next} cleared. Pan toward the next gold ring.`);}
    else {pause();home();say('Missed the opening. Recovered before this ring; pan to align, then resume.');}
   }
  }
  camera.position.copy(position);camera.rotation.set(pitch,yaw,0,'YXZ');
  updateRange();
  kit.syncSize();renderer.render(scene,camera);
 },{el:canvas,maxDt:.05});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;pause();say('3D flight interrupted. Reload to try again, or continue with the CAD instructions below.');});
 window.addEventListener('pagehide',e=>{if(e.persisted)return;loop.stop();scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});kit.dispose();},{once:true});
 root.dataset.flightReady='true';
}catch(error){kit?.dispose();canvas.hidden=true;root.querySelectorAll('button,select').forEach(b=>b.disabled=true);status.textContent='3D flight is unavailable on this device. Continue with the camera workshop and its written navigation steps below.';console.warn('Flight academy unavailable:',error);}
