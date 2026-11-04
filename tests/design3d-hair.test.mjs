import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createDynamicHair } from '../assets/js/design3d/hair-physics.mjs';
import { freshState, validateState } from '../assets/js/design3d/workshops.mjs';

test('old character projects receive optional hair settings',()=>{
 const saved=freshState('character');
 for(const key of ['hairPhysics','hairStiffness','hairDamping','hairWind'])delete saved.params[key];
 const restored=validateState(saved);
 assert.equal(restored.params.hairPhysics,0);
 assert.equal(restored.params.hairStiffness,.35);
});

test('locks respond to a gust, keep roots pinned and remain finite',()=>{
 const p={...freshState('character').params,hairWind:0},group=new THREE.Group();
 const sim=createDynamicHair(THREE,group,{H:1,headY:5},p,'#302010');
 for(let i=0;i<240;i++)sim.update(1/60);
 const before=sim.locks[10].nodes.at(-1).clone();
 sim.gust();for(let i=0;i<30;i++)sim.update(1/60);
 assert.ok(before.distanceTo(sim.locks[10].nodes.at(-1))>.01);
 for(let i=0;i<600;i++)sim.update(1/60);
 for(const lock of sim.locks){
  assert.equal(lock.nodes[0].distanceTo(lock.rest[0]),0);
  for(const point of lock.nodes)assert.ok(point.toArray().every(Number.isFinite));
  for(let j=1;j<lock.nodes.length;j++)assert.ok(Math.abs(lock.nodes[j].distanceTo(lock.nodes[j-1])-lock.lengths[j-1])<.035);
 }
});
