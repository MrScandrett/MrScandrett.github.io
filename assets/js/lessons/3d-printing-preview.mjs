// Forge's shared scene, lighting, print-bed and OrbitControls adapted for a slicer teaching model.
import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { modelFor, sections, isSkin } from './3d-printing-models.mjs';
import { createScene } from '../sim-kit-three.mjs';
const canvas = document.getElementById('p3d-webgl');
const cross = document.getElementById('p3d-canvas');
const toggle = document.getElementById('view-toggle');
const reset = document.getElementById('reset-print-view');
const status = document.getElementById('print-render-status');
let view, controls, group, active = false, pending = false, signature = '';
function render() {
  if (!active || document.hidden || pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; if (!active || document.hidden) return; view.syncSize(); view.renderer.render(view.scene, view.camera); });
}
function frame() {
  controls.target.set(0, 25, 0);
  view.camera.position.set(100, 90, 110);
  controls.update(); render();
}
function show3D(value) {
  active = value;
  canvas.hidden = !active; canvas.style.display = active ? 'block' : 'none';
  cross.hidden = active; cross.style.display = active ? 'none' : 'block';
  reset.hidden = !active;
  toggle.textContent = active ? '2D View' : '3D View';
  status.textContent = active ? '3D: drag to orbit · pinch or scroll to zoom · arrow keys rotate · 10 mm bed grid. Infill and supports are schematic. Red underside: cantilever; amber: bridge.' : '2D cross-section: inspect walls, solid skins, and layer count.';
  if (active) { view.syncSize(); render(); }
}
function disposeModel() {
  group.traverse(o => { o.geometry?.dispose(); if (o.material) { for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose(); } });
  group.clear();
}
function box(x,y,z,px,py,pz,color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(x,y,z), new THREE.MeshStandardMaterial({color,roughness:0.62,metalness:0.02}));
  mesh.position.set(px,py,pz); group.add(mesh); return mesh;
}
function update(s) {
  if (!view) return;
  const cutaway=document.getElementById('print-cutaway').checked;
  const key=[s.model,s.lh,s.inf,s.walls,s.sup,s.layer,s.layers,cutaway].join('|');
  if(key===signature)return;signature=key;disposeModel();
  const height=Math.min(60,s.layer*s.lh),wall=s.walls*0.4,stride=Math.max(1,Math.ceil(s.layer/120));
  const shells=[],skins=[],infill=[],bands=[];
  function add(list,x,y,z,px,py,pz){if(x>0&&y>0&&z>0)list.push([x,y,z,px,py,pz]);}
  // Instanced bands keep draw calls bounded as layer count changes.
  for(let first=1;first<=s.layer;first+=stride){
    let last=Math.min(s.layer,first+stride-1);
    // Split at the ledge/bridge transition so geometry never straddles its unsupported underside.
    if(first*s.lh<=40 && last*s.lh>40 && (s.model==='ledge'||s.model==='bridge'))last=Math.floor(40/s.lh);
    const y=last*s.lh,low=(first-1)*s.lh,thickness=y-low;
    for(const [x0,x1,z0,z1] of sections(s.model,y)){
      const dx=x1-x0,dz=z1-z0,cx=(x0+x1)/2,cz=(z0+z1)/2,ix=Math.max(0,dx-2*wall),iz=Math.max(0,dz-2*wall);
      add(shells,dx,thickness,wall,cx,(low+y)/2,z0+wall/2);
      if(!cutaway)add(shells,dx,thickness,wall,cx,(low+y)/2,z1-wall/2);
      add(shells,wall,thickness,iz,x0+wall/2,(low+y)/2,cz);
      if(!cutaway)add(shells,wall,thickness,iz,x1-wall/2,(low+y)/2,cz);
      // Draw skin only at real layer heights; don't inflate four skins to a whole sampled band.
      for(let l=first;l<=last;l++)if(isSkin(s.model,l*s.lh,s.lh))add(skins,ix,s.lh,iz,cx,(l-.5)*s.lh,cz);
      if(!isSkin(s.model,y,s.lh)&&s.inf>0){
        const spacing=0.4/(s.inf/100),alongX=last%2===1;
        const span=alongX?iz:ix,count=Math.floor(span/spacing);
        for(let n=0;n<count;n++){
          const offset=-span/2+(n+.5)*span/count;
          add(infill,alongX?ix:0.4,Math.min(s.lh,.35),alongX?0.4:iz,alongX?cx:cx+offset,(last-.5)*s.lh,alongX?cz+offset:cz);
        }
      }
      const corners=[[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1]];
      for(let j=0;j<4;j++){if(cutaway&&(j===1||j===2))continue;bands.push(...corners[j],...corners[(j+1)%4]);}
    }
    first=last-stride+1;
  }
  function batch(list,color){
    if(!list.length)return;
    const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color,roughness:.7}),list.length),dummy=new THREE.Object3D();
    list.forEach(([x,y,z,px,py,pz],i)=>{dummy.scale.set(x,y,z);dummy.position.set(px,py,pz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
  }
  batch(shells,0xe8792a);batch(skins,0xffdbb5);batch(infill,0xffb12b);
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(bands,3)),new THREE.LineBasicMaterial({color:0x71381b,transparent:true,opacity:.45})));
  const model=modelFor(s.model);
  // Color the underside to distinguish a cantilever (red) from a two-ended bridge (amber).
  if(height>40 && model.risk){for(const [x0,x1,z0,z1] of model.supports)box(x1-x0,.15,z1-z0,(x0+x1)/2,40.03,(z0+z1)/2,model.risk==='bridge'?0xffb12b:0xef6558);}
  let supportPieces=0;
  if(s.sup!=='none')for(const [x0,x1,z0,z1,ceiling] of model.supports){
    const h=Math.min(height,ceiling),cx=(x0+x1)/2,cz=(z0+z1)/2;
    if(s.sup==='tree'){
      function branch(a,b,r){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),8),new THREE.MeshStandardMaterial({color:0x64d5ef,roughness:.8}));mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());group.add(mesh);supportPieces++;}
      // Spread contact branches across the real unsupported footprint.
      for(let x=x0+3;x<x1;x+=8){branch([x,0,cz],[x,h*.65,cz],.8);branch([x,h*.65,cz],[x-2,h,z0+1],.5);branch([x,h*.65,cz],[Math.min(x+2,x1-1),h,z1-1],.5);}
    }else for(let x=x0+.5;x<x1;x+=2.5){box(.5,h,z1-z0,x,h/2,cz,0x64d5ef);supportPieces++;}
  }
  canvas.dataset.model=s.model;canvas.dataset.layer=String(s.layer);canvas.dataset.instances=String(infill.length);canvas.dataset.supports=String(supportPieces);render();
}
function read() {
  const val=id=>Number(document.getElementById(id).value);
  return {model:document.getElementById('print-model').value,lh:val('lh-slider'),inf:val('inf-slider'),walls:val('walls-slider'),sup:document.getElementById('sup-select').value,layer:val('layer-slider'),layers:Math.round(60/val('lh-slider'))};
}
try {
  view=createScene(canvas,{THREE,fov:35,near:0.1,far:1000,clearColor:0x1d2228});
  view.renderer.outputColorSpace=THREE.SRGBColorSpace;
  controls=new OrbitControls(view.camera,canvas); controls.enableDamping=false;controls.enablePan=false;controls.minDistance=55;controls.maxDistance=350;controls.maxPolarAngle=Math.PI/2-0.04;
  view.scene.add(new THREE.HemisphereLight(0xf4f1ea,0x30363d,1.6));
  const key=new THREE.DirectionalLight(0xffffff,2.2);key.position.set(-70,100,80);view.scene.add(key);
  const fill=new THREE.DirectionalLight(0xffffff,0.6);fill.position.set(70,40,-50);view.scene.add(fill);
  const bed=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0x2c333b,roughness:0.95}));bed.rotation.x=-Math.PI/2;bed.position.y=-0.4;view.scene.add(bed);
  const grid=new THREE.GridHelper(100,10,0x8fb4d8,0x58626e);grid.position.y=-0.2;view.scene.add(grid);
  group=new THREE.Group();view.scene.add(group);
  controls.addEventListener('change',render);
  document.getElementById('print-cutaway').addEventListener('change',()=>update(read()));
  toggle.addEventListener('click',()=>show3D(!active));reset.addEventListener('click',frame);
  document.addEventListener('print-preview-change',e=>update(e.detail));
  document.addEventListener('print-preview-reset',()=>{document.getElementById('print-cutaway').checked=false;frame();});
  document.addEventListener('visibilitychange',render);
  new ResizeObserver(render).observe(canvas);
  canvas.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key))return;
    e.preventDefault();
    if(e.key==='Home'){frame();return;}
    const offset=view.camera.position.clone().sub(controls.target),sphere=new THREE.Spherical().setFromVector3(offset);
    if(e.key==='ArrowLeft')sphere.theta-=0.12;if(e.key==='ArrowRight')sphere.theta+=0.12;
    if(e.key==='ArrowUp')sphere.phi-=0.08;if(e.key==='ArrowDown')sphere.phi+=0.08;
    if(e.key==='+'||e.key==='=')sphere.radius*=0.9;if(e.key==='-')sphere.radius*=1.1;
    sphere.phi=Math.max(0.08,Math.min(controls.maxPolarAngle,sphere.phi));sphere.radius=Math.max(controls.minDistance,Math.min(controls.maxDistance,sphere.radius));
    view.camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sphere));controls.update();render();
  });
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();show3D(false);toggle.disabled=true;status.textContent='3D graphics interrupted. The 2D cross-section remains available.';});
  canvas.addEventListener('webglcontextrestored',()=>{toggle.disabled=false;status.textContent='3D graphics restored. Select 3D View to continue.';});
  show3D(true);frame();update(read());
} catch(error) {
  controls?.dispose();view?.dispose();document.getElementById('print-cutaway').disabled=true;canvas.style.display='none';canvas.hidden=true;cross.style.display='block';cross.hidden=false;toggle.disabled=true;toggle.textContent='3D unavailable';reset.hidden=true;
  status.textContent='3D graphics unavailable in this browser. Use the fully interactive 2D cross-section.';
}
