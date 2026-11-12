import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {freshState} from '../assets/js/design3d/workshops.mjs';
import {buildCharacterExport} from '../assets/js/design3d/character-export.mjs';
import {disposeDesign} from '../assets/js/design3d/geometry.mjs';
test('character export preserves colors, requested height and normalized skin weights with playable motion',()=>{
 const {root,clips}=buildCharacterExport(THREE,freshState('character'),1.7,true);
 const box=new THREE.Box3().setFromObject(root);assert.ok(Math.abs(box.getSize(new THREE.Vector3()).y-1.7)<1e-5);
 let mesh;root.traverse(o=>{if(!o.isSkinnedMesh)return;mesh=o;assert.equal(o.skeleton.bones.length,16);const w=o.geometry.attributes.skinWeight;for(let i=0;i<w.count;i++)assert.ok(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-5);});
 assert.ok(mesh);assert.ok(root.getObjectByName('Humanoid template').geometry.attributes.color);
 const mixer=new THREE.AnimationMixer(root);mixer.clipAction(clips[0]).play();mixer.update(.5);assert.ok(root.getObjectByName('LeftForearm').rotation.z<-.4);mixer.update(1.5);assert.ok(Math.abs(root.getObjectByName('LeftForearm').rotation.z)<1e-6);
 disposeDesign(root);
});
test('static character export contains no skeleton and scales for a 100 mm figure',()=>{
 const {root,clips}=buildCharacterExport(THREE,freshState('character'),.1);assert.equal(clips.length,0);root.traverse(o=>assert.ok(!o.isSkinnedMesh));assert.ok(Math.abs(new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).y-.1)<1e-6);disposeDesign(root);
});
test('sculpted mascot exports continuous body and tail surfaces with finite colors and usable rig weights',()=>{
 const state=freshState('character');Object.assign(state.params,{artStyle:3,ears:.65,muzzle:.4,tail:1.3});
 const {root}=buildCharacterExport(THREE,state,1.7,true);
 for(const name of ['Continuous mascot body','Continuous bushy tail','Sculpted mascot head']){
  const mesh=root.getObjectByName(name);assert.ok(mesh,name);assert.ok(mesh.geometry.attributes.color);
  for(const value of mesh.geometry.attributes.position.array)assert.ok(Number.isFinite(value));
 }
 assert.ok(!root.getObjectByName('Sleeve cap'),'shoulders belong to the sculpted body');
 assert.ok(!root.getObjectByName('Knee'),'knees belong to the sculpted body');
 root.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const w=mesh.geometry.attributes.skinWeight;for(let i=0;i<w.count;i++)assert.ok(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-5);});
 assert.ok(Math.abs(new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).y-1.7)<1e-5);
 disposeDesign(root);
});
