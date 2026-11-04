import { buildDesign, disposeDesign } from './geometry.mjs';

// Export a clean rest-pose rig rather than baking a posed surface or debug helper.
export function buildRigExport(THREE,state) {
 const rig=buildDesign(THREE,{...state,imported:null,params:{...state.params,angle:0,weights:0}});
 for(const child of [...rig.children])if(child.isSkeletonHelper){rig.remove(child);child.geometry.dispose();child.material.dispose();}
 const angle=(state.params.angle||45)*Math.PI/180;
 const values=[0,angle,0].flatMap(a=>new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),a).toArray());
 const clip=new THREE.AnimationClip('BendTest',2,[new THREE.QuaternionKeyframeTrack('BendJoint.quaternion',[0,1,2],values)]);
 rig.name='StudentFlexibleRig';rig.userData={units:'meters',upAxis:'Y',technique:'Two-bone linear blend skinning'};
 rig.updateMatrixWorld(true);
 return {rig,clip};
}
export function setupRigStudio({host,edit,getState,say,THREE}) {
 const panel=document.createElement('section');panel.className='d3w-studio-tools';
 panel.innerHTML=`<h2>Test the bend · build a reusable asset</h2><p>Blue vertices follow LimbRoot; red vertices follow BendJoint. Intermediate colors show blended influence. Weight colors are a diagnostic overlay and are excluded from GLB.</p><div class="d3w-presets"><button type="button" data-rig-pose="0">Rest pose · 0°</button><button type="button" data-rig-pose="45">Bend · 45°</button><button type="button" data-rig-pose="70">Stress test · 70°</button><button type="button" data-rig-pose="-45">Reverse · −45°</button><button type="button" data-rig-glb>Export rig + motion GLB</button></div><p>GLB includes a rest-pose mesh, two named bones, skin weights, surface color and a looping BendTest clip. Coordinates use meters and Y up; the starter is 3 meters tall. Scale the whole rig in the destination app. Save project keeps your editable recipe; OBJ is a static pose.</p><p>Reuse as a flexible tentacle segment, robot hose or stylized limb. In Blender import glTF 2.0, or drag the GLB into Godot. Play BendTest and rotate BendJoint independently. A full character needs additional bones and carefully painted weights.</p>`;
 host.querySelector('.d3w-layout').before(panel);
 for(const b of panel.querySelectorAll('[data-rig-pose]'))b.addEventListener('click',()=>edit(()=>{getState().params.angle=Number(b.dataset.rigPose);}));
 const button=panel.querySelector('[data-rig-glb]');
 button.addEventListener('click',async()=>{
  button.disabled=true;let rig;
  try{
   const {GLTFExporter}=await import('../'+'../vendor/three-extras.min.js');
   const built=buildRigExport(THREE,getState());rig=built.rig;
   const binary=await new GLTFExporter().parseAsync(rig,{binary:true,animations:[built.clip]});
   const url=URL.createObjectURL(new Blob([binary],{type:'model/gltf-binary'}));const a=document.createElement('a');a.href=url;a.download='flexible-limb-rig.glb';a.click();setTimeout(()=>URL.revokeObjectURL(url),4000);
   say('Rig GLB downloaded with two bones and BendTest motion. Re-import in Asset Bench below and play the clip to verify it.');
  }catch(error){say('GLB export failed: '+error.message);}finally{if(rig)disposeDesign(rig);button.disabled=false;}
 });
}
