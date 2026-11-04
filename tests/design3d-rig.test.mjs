import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { freshState, validateState } from '../assets/js/design3d/workshops.mjs';
import { buildRigExport } from '../assets/js/design3d/rig-studio.mjs';
import { disposeDesign } from '../assets/js/design3d/geometry.mjs';
test('rig export keeps normalized skinning, rest pose and an independently playable clip',()=>{
 const state=freshState('rig');state.params.angle=-70;state.params.weights=1;
 const {rig,clip}=buildRigExport(THREE,state);let mesh;rig.traverse(o=>{assert.ok(!o.isSkeletonHelper);if(o.isSkinnedMesh)mesh=o;});
 assert.deepEqual(mesh.skeleton.bones.map(b=>b.name),['LimbRoot','BendJoint']);assert.ok(Math.abs(mesh.skeleton.bones[1].rotation.z)<1e-7);assert.equal(mesh.material.vertexColors,false);
 const weights=mesh.geometry.attributes.skinWeight;for(let i=0;i<weights.count;i++)assert.ok(Math.abs(weights.getX(i)+weights.getY(i)-1)<1e-6);
 const mixer=new THREE.AnimationMixer(rig);mixer.clipAction(clip).play();mixer.update(1);assert.ok(mesh.skeleton.bones[1].rotation.z< -1);mixer.update(1);assert.ok(Math.abs(mesh.skeleton.bones[1].rotation.z)<1e-7);
 disposeDesign(rig);
});
test('older rig recipes reopen with defaults for new controls',()=>{
 const state=freshState('rig');for(const key of ['radius','segments','smooth','weights'])delete state.params[key];
 assert.equal(validateState(state).params.segments,24);
});
