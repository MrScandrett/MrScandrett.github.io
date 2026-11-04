import { buildDesign, disposeDesign, snapshotDesign, toPrintSpace } from './geometry.mjs';
import { humanoidLayout } from './humanoid.mjs';
import { writeBinaryStl } from '../fab-io.mjs';

// Starter weights use distance to anatomical bone segments, not production retopology.
export function buildCharacterExport(THREE, state, height = 1.7, rigged = false) {
 const source=buildDesign(THREE,{...state,params:{...state.params,hairPhysics:0}});
 source.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3());
 const scale=height/size.y, offset=bounds.min.y;
 const root=new THREE.Group();root.name='ClassroomCharacter';
 root.userData={units:'meters',upAxis:'Y',rig:rigged?'Automatic starter weights; inspect joints before production':'Static mesh',hair:'Static hair; simulation is not exported'};
 const layout=humanoidLayout(state.params),p=state.params,factor=p.height/5.2;
 const at=(x,y,z=0)=>new THREE.Vector3(x*factor*scale,(y*factor-offset)*scale,z*factor*scale);
 const bones=[],segments=[];
 function bone(name,parent,start,end){const b=new THREE.Bone();b.name=name;b.position.copy(start);if(parent){b.position.sub(parent.userData.rest);parent.add(b);}else root.add(b);b.userData.rest=start.clone();bones.push(b);segments.push(new THREE.Line3(start,end));return b;}
 if(rigged){
  const hips=bone('Hips',null,at(0,layout.hipY),at(0,layout.hipY+p.torso*.4));
  const spine=bone('Spine',hips,at(0,layout.hipY+p.torso*.4),at(0,layout.shoulderY));
  const chest=bone('Chest',spine,at(0,layout.shoulderY),at(0,layout.neckY));
  bone('Head',chest,at(0,layout.neckY),at(0,layout.headY+layout.H*.5));
  for(const [side,s] of [['Left',1],['Right',-1]]){
   const shoulder=[s*layout.sH*.95,layout.shoulderY-.06,0],elbow=[shoulder[0]+s*Math.sin(.35)*p.arm*.5,shoulder[1]-Math.cos(.35)*p.arm*.5,.05];
   const wrist=[elbow[0]+s*Math.sin(.18)*p.arm*.46,elbow[1]-Math.cos(.18)*p.arm*.46,.14];
   const arm=bone(side+'UpperArm',chest,at(...shoulder),at(...elbow));
   const fore=bone(side+'Forearm',arm,at(...elbow),at(...wrist));bone(side+'Hand',fore,at(...wrist),at(wrist[0],wrist[1]-.3,wrist[2]));
   const hip=[s*layout.hipHalf*.55,layout.hipY+.02,0],knee=[s*(layout.hipHalf*.55+.02),layout.kneeY,.03],ankle=[s*(layout.hipHalf*.55+.015),layout.ankleY,-.01];
   const thigh=bone(side+'Thigh',hips,at(...hip),at(...knee));const shin=bone(side+'Shin',thigh,at(...knee),at(...ankle));bone(side+'Foot',shin,at(...ankle),at(ankle[0],.09,.42));
  }
 }
 root.updateMatrixWorld(true);const skeleton=rigged?new THREE.Skeleton(bones):null;
 const transform=new THREE.Matrix4().makeScale(scale,scale,scale);transform.setPosition(0,-offset*scale,0);
 source.traverse(m=>{
  if(!m.isMesh)return;
  const geometry=m.geometry.clone().applyMatrix4(m.matrixWorld).applyMatrix4(transform),material=m.material.clone();
  let mesh;
  if(rigged){
   const pos=geometry.attributes.position,indices=[],weights=[],v=new THREE.Vector3(),closest=new THREE.Vector3();
   for(let i=0;i<pos.count;i++){
    v.fromBufferAttribute(pos,i);
    // Separate head/face meshes follow Head rigidly so eyes and mouth stay attached.
    const headPart=m.name!=='Humanoid template';
    const ranked=headPart?[[3,1]]:segments.map((line,j)=>{line.closestPointToPoint(v,true,closest);return [j,1/Math.pow(Math.max(height*.015,v.distanceTo(closest)),4)];}).sort((a,b)=>b[1]-a[1]).slice(0,4);
    const sum=ranked.reduce((a,b)=>a+b[1],0);for(let j=0;j<4;j++){indices.push(ranked[j]?.[0]??0);weights.push((ranked[j]?.[1]??0)/sum);}
   }
   geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
   mesh=new THREE.SkinnedMesh(geometry,material);root.add(mesh);mesh.bind(skeleton);
  }else{mesh=new THREE.Mesh(geometry,material);root.add(mesh);}
  mesh.name=m.name||'CharacterDetail';
 });
 disposeDesign(source);
 const clips=rigged?[new THREE.AnimationClip('WaveTest',2,[new THREE.QuaternionKeyframeTrack('LeftForearm.quaternion',[0,.5,1,1.5,2],[0,-.5,-.15,-.5,0].flatMap(a=>new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),a).toArray()))])]:[];
 return {root,clips};
}

export function setupCharacterExport({host,id,getState,getThree,say,onExport}) {
 const panel=document.createElement('section');panel.className='d3w-studio-tools';
 panel.innerHTML=`<h2>Take your character to another app</h2><p>Choose a destination. Color GLB keeps vertex colors and separate facial details. The optional starter skeleton includes 16 bones, automatic skin weights and a WaveTest clip.</p><label for="${id}-export-height">Export height</label><select id="${id}-export-height" data-export-height><option value="1.7">1.7 m · game character</option><option value=".1">100 mm · Tinkercad figure</option><option value=".05">50 mm · miniature</option></select><div class="d3w-presets"><button type="button" data-character-export="rig">Godot / animation · rigged GLB</button><button type="button" data-character-export="glb">Blender / sculpting · color GLB</button><button type="button" data-character-export="stl">Tinkercad · STL (mm)</button></div><p>GLB uses meters and Y up. STL uses millimeters and Z up, with no colors, skeleton or motion. Tinkercad imports a mesh rather than editable body controls; check its import dimensions. Separate overlapping parts still need inspection before printing.</p><p>The starter rig is for experiments: test shoulders, elbows and knees and refine weights in Blender. Robes and long hair may need manual weight painting. Hair is exported in its static rest shape; facial controls, fingers, IK and hair simulation are not included. Save project above keeps the editable browser design.</p><p><a href="${new URL('lessons/3d-design/game-asset-studio/game-asset-character-rigging.html#bench',new URL('../../../',import.meta.url))}">Inspect bones on the Rigging Bench</a> · <a href="${new URL('lessons/3d-design/game-asset-studio/game-asset-character-animation.html#bench',new URL('../../../',import.meta.url))}">Play clips on the Animation Bench</a></p><p><a href="${new URL('lessons/3d-design/game-asset-studio/game-asset-uv-export.html#bench',new URL('../../../',import.meta.url))}">UV unwrap and texture your character</a>: open its GLB from Your shelf, inspect the UV checker and download a layout. Body and head colors are vertex colors; these meshes still need UV unwrapping for image painting. The Bench offers quick box projection for tiling tests. For a unique painted character, mark seams and unwrap in Blender, then bring the GLB back with its bones and clips.</p><p>GLB downloads also appear on Your shelf in those lessons in this browser. In Godot, copy the GLB into your project, instance its scene and play WaveTest in AnimationPlayer. In Blender, choose File → Import → glTF 2.0. For OBJ-only sculpting apps, use Export OBJ above; that export has no packaged colors or rig.</p>`;
 host.querySelector('.d3w-actions').before(panel);
 for(const button of panel.querySelectorAll('[data-character-export]'))button.addEventListener('click',async()=>{
  const THREE=getThree();if(!THREE){say('Wait for the 3D scene to finish loading.');return;}
  const buttons=[...panel.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);let root;
  try{
   const type=button.dataset.characterExport,{clips,root:model}=buildCharacterExport(THREE,getState(),Number(panel.querySelector('[data-export-height]').value),type==='rig');root=model;
   let blob,name;
   if(type==='stl'){const positions=toPrintSpace(snapshotDesign(THREE,root));for(let i=0;i<positions.length;i++)positions[i]*=1000;blob=new Blob([writeBinaryStl(positions,'Character: mm, Z up')],{type:'model/stl'});name='character-mm.stl';}
   else{const {GLTFExporter}=await import('../../vendor/three-extras.min.js');blob=new Blob([await new GLTFExporter().parseAsync(root,{binary:true,animations:clips})],{type:'model/gltf-binary'});name=type==='rig'?'character-rig.glb':'character-color.glb';}
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),4000);onExport();
   if(type!=='stl'){const {saveAssetToShelf}=await import('../asset-bench.mjs');await saveAssetToShelf(name,blob,'model');}
   say(name+' downloaded. '+(type==='stl'?'Import in Tinkercad using millimeters; check height.':'Open Your shelf on the Rigging or Animation Bench, or import the GLB in your app.'));
  }catch(error){say('Export failed: '+error.message);}finally{if(root)disposeDesign(root);buttons.forEach(b=>b.disabled=false);}
 });
}
