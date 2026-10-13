import { THREE } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';
import { createLiquidSurface } from '../liquid-engine-three.mjs';

// All scene distances are metres. The ocean is a patch of an actual
// Earth-radius sphere, not an exaggerated curve or a clipped boat sprite.
const EARTH_RADIUS = 6371000;
const BOAT_HEIGHT = 20;
const canvas = document.getElementById('boat-ocean');
const status = document.getElementById('boat-render-status');
const distance = document.getElementById('boat-distance');
const eye = document.getElementById('boat-eye');
const zoom = document.getElementById('boat-zoom');
const pause = document.getElementById('boat-pause');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reducedMotion.matches;
let sceneAPI, loop, observer, water;

export function horizonModel(distanceMetres, eyeMetres) {
  const observerRadius = EARTH_RADIUS + eyeMetres;
  const dip = Math.acos(EARTH_RADIUS / observerRadius);
  const angle = distanceMetres / EARTH_RADIUS;
  const hidden = angle <= dip ? 0 : EARTH_RADIUS * (1 / Math.cos(angle - dip) - 1);
  return { dip, horizon: EARTH_RADIUS * dip, hidden };
}

function readout() {
  const d = Number(distance.value) * 1000, h = Number(eye.value);
  const model = horizonModel(d, h);
  document.getElementById('boat-distance-out').textContent = `${distance.value} km`;
  document.getElementById('boat-eye-out').textContent = `${eye.value} m`;
  document.getElementById('boat-zoom-out').textContent = `${zoom.value}×`;
  document.getElementById('curve-drop').textContent = `${model.hidden.toFixed(1)} m`;
  document.getElementById('boat-hidden').textContent = model.hidden >= BOAT_HEIGHT ? 'Entire boat hidden' : model.hidden > 3 ? 'Hull hidden; mast visible' : model.hidden > 0 ? 'Hull partly hidden' : 'Whole boat above horizon';
  document.getElementById('boat-scene-summary').textContent = `Your horizon is ${(model.horizon / 1000).toFixed(2)} km away. At ${distance.value} km, ${Math.min(BOAT_HEIGHT, model.hidden).toFixed(1)} m of the 20 m boat is hidden below it. Try raising your eyes or increasing zoom: which reveals more of the boat?`;
  pause.textContent = paused ? 'Resume water' : 'Pause water';
  pause.setAttribute('aria-pressed', String(paused));
  return { d, h, model };
}

function makeBoat() {
  const boat = new THREE.Group();
  const hullMaterial = new THREE.MeshStandardMaterial({ color: 0xf2ede1, roughness: .35, metalness: .08 });
  const blue = new THREE.MeshStandardMaterial({color:0x163f5a, roughness:.4});
  const wood = new THREE.MeshStandardMaterial({color:0xb78247, roughness:.65});
  const steel = new THREE.MeshStandardMaterial({color:0xb6c2c9, metalness:.65, roughness:.3});
  const sailMaterial = new THREE.MeshStandardMaterial({color:0xfff8df, side:THREE.DoubleSide, roughness:.9});
  // Lofted hull: 16 m overall length, 4 m beam, 1.2 m draught.
  const positions=[], indices=[];
  const stations=[[-8,.05],[-6,1.35],[-3,1.9],[0,2],[3,1.7],[6,1],[8,.04]];
  for(const [x,w] of stations) for(const [y,f] of [[1.1,1],[.15,.92],[-1.2,.16],[.15,-.92],[1.1,-1]]) positions.push(x,y,w*f);
  for(let i=0;i<stations.length-1;i++)for(let j=0;j<4;j++) {const a=i*5+j,b=a+5;indices.push(a,b,a+1,b,b+1,a+1);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const hull=new THREE.Mesh(geometry,hullMaterial);boat.add(hull);
  function box(w,h,d,x,y,z,material) {const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);boat.add(m);return m;}
  box(12,.18,3.2,0,1.1,0,wood);
  box(4,1.4,2.6,1,1.9,0,hullMaterial);
  box(3.4,.45,2.65,1,2.05,0,blue);
  function spar(a,b,r,material=steel) {
    const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),8),material);
    mesh.position.copy(av).add(bv).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());boat.add(mesh);
  }
  spar([-2,1.1,0],[-2,20,0],.09);
  spar([-2,3.2,0],[5,3.2,0],.07);
  spar([-2,19.7,0],[7.7,1.1,0],.017);
  spar([-2,19.7,0],[-7.3,1.1,0],.017);
  function sail(points) {
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.setIndex([0,1,2]);g.computeVertexNormals();boat.add(new THREE.Mesh(g,sailMaterial));
  }
  sail([[-1.8,19.3,.05],[-1.8,3.5,.05],[4.9,3.5,.42]]);
  sail([[-2.3,18.3,-.05],[-7.1,1.8,-.05],[-2.3,3.5,-.4]]);
  for(const z of [-1.6,1.6])for(let x=-6;x<=6;x+=2) {spar([x,1.1,z],[x,1.9,z],.025);if(x<6)spar([x,1.9,z],[x+2,1.9,z],.015);}
  return boat;
}

try {
  sceneAPI = createScene(canvas, { THREE, fov:32, near:.25, far:120000, maxDpr:1.5, logarithmicDepthBuffer:true });
  const { scene, camera, renderer }=sceneAPI;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const sky=document.createElement('canvas');sky.width=2;sky.height=256;
  const skyContext=sky.getContext('2d'), gradient=skyContext.createLinearGradient(0,0,0,256);
  gradient.addColorStop(0,'#5c9ed2');gradient.addColorStop(.52,'#c8e3ee');gradient.addColorStop(1,'#e1ebea');
  skyContext.fillStyle=gradient;skyContext.fillRect(0,0,2,256);
  scene.background=new THREE.CanvasTexture(sky);
  scene.add(new THREE.HemisphereLight(0xf2f8ff,0x184b64,2.2));
  const sun=new THREE.DirectionalLight(0xfff0cf,3);sun.position.set(-100,200,100);scene.add(sun);
  water=createLiquidSurface(THREE,{material:'water',openWater:true,width:1,depth:1,segments:160,waveHeight:.12,opacity:1,surface:0x286e88,deep:0x062d45,choppiness:.4});
  // Logarithmic depth preserves centimetre-scale occlusion across kilometres.
  water.material.vertexShader = '#include <common>\n#include <logdepthbuf_pars_vertex>\n'+water.material.vertexShader;
  water.material.vertexShader = water.material.vertexShader.replace('gl_Position = projectionMatrix * viewMatrix * world;', 'gl_Position = projectionMatrix * viewMatrix * world;\n#include <logdepthbuf_vertex>');
  water.material.fragmentShader = '#include <logdepthbuf_pars_fragment>\n'+water.material.fragmentShader;
  water.material.fragmentShader = water.material.fragmentShader.replace('void main() {','void main() {\n#include <logdepthbuf_fragment>');
  const position=water.geometry.attributes.position, side=161;
  // Nonuniform grid resolves nearby ripples while covering the 60 km horizon.
  for(let row=0;row<side;row++) {
    const z=.5+60000*(row/160)**2;
    for(let col=0;col<side;col++) {
      const x=(col/160*2-1)*(100+z*1.5);
      const radiusSquared=x*x+z*z;
      const y=-radiusSquared/(EARTH_RADIUS+Math.sqrt(EARTH_RADIUS**2-radiusSquared));
      position.setXYZ(row*side+col,x,z,y);
    }
  }
  position.needsUpdate=true;water.geometry.computeBoundingSphere();water.mesh.frustumCulled=false;scene.add(water.mesh);
  const boat=makeBoat();scene.add(boat);
  function updateView() {
    const {d,h,model}=readout();
    const angle=d/EARTH_RADIUS;
    boat.position.set(0,EARTH_RADIUS*(Math.cos(angle)-1),-EARTH_RADIUS*Math.sin(angle));
    boat.rotation.x=angle;
    camera.position.set(0,h,0);camera.fov=32/Number(zoom.value);camera.updateProjectionMatrix();
    camera.lookAt(0,h-1000*Math.tan(model.dip),-1000);
    sceneAPI.syncSize();renderer.render(scene,camera);
    status.textContent=`${distance.value} km away · ${eye.value} m eye height · ${zoom.value}× telescope`;
    canvas.dataset.distanceMetres=String(d);canvas.dataset.hiddenMetres=model.hidden.toFixed(3);
    canvas.dataset.eyeMetres=String(h);canvas.dataset.zoom=zoom.value;
  }
  for(const control of [distance,eye,zoom])control.addEventListener('input',updateView);
  pause.addEventListener('click',()=>{paused=!paused;readout();});
  document.getElementById('boat-reset').addEventListener('click',()=>{distance.value='5';eye.value='2';zoom.value='12';paused=reducedMotion.matches;water.uniforms.uTime.value=0;updateView();});
  reducedMotion.addEventListener('change',()=>{paused=reducedMotion.matches;readout();});
  let visible=true;
  observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});observer.observe(canvas);
  let frames=0;
  loop=window.SimKit.loop(dt=>{
    if(!visible||paused)return;
    water.update(dt);sceneAPI.syncSize();renderer.render(scene,camera);
    canvas.dataset.frames=String(++frames);
  });
  const resize=new ResizeObserver(updateView);resize.observe(canvas);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();loop.stop();status.textContent='Ocean graphics interrupted. Reload to restore; measurements remain available.';});
  window.addEventListener('pagehide',event=>{if(event.persisted)return;loop.stop();observer.disconnect();resize.disconnect();water.dispose();sceneAPI.dispose();},{once:true});
  updateView();canvas.dataset.renderer='liquid-engine';
} catch(error) {
  console.error('Ocean scene initialization failed:',error);
  status.textContent='CGI water unavailable on this device. The horizon measurements still work.';
  for(const control of [distance,eye,zoom])control.addEventListener('input',readout);
  pause.disabled=true;
  document.getElementById('boat-reset').addEventListener('click',()=>{distance.value='5';eye.value='2';zoom.value='12';readout();});
  readout();
}
