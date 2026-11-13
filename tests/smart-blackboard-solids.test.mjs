import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { cylinderPoint, conePoint, prismPath, makeDevelopable } from '../assets/js/lessons/smart-blackboard-solids.mjs';
const near = (a, b, epsilon = 1e-6) => assert.ok(Math.abs(a - b) < epsilon, `${a} ≠ ${b}`);
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const points = [{x:-1.3,z:-1},{x:1.1,z:-1.2},{x:1.6,z:0.4},{x:0.2,z:1.4},{x:-1.2,z:0.7}];
test('cylinder preserves wall width and height through opening', () => {
  for (const t of [0, .25, .5, .99, 1]) {
    let length = 0;
    for (let i = 0; i < 2000; i++) length += distance(cylinderPoint(1.2, 2.4, -Math.PI + i / 2000 * 2*Math.PI, 0, t), cylinderPoint(1.2, 2.4, -Math.PI + (i+1) / 2000 * 2*Math.PI, 0, t));
    near(length, 2 * Math.PI * 1.2, .00001);
    near(distance(cylinderPoint(1.2, 2.4, .7, 0, t), cylinderPoint(1.2, 2.4, .7, 1, t)), 2.4);
  }
  near(cylinderPoint(1.2, 2.4, Math.PI, 1, 1)[2], 0);
});
test('cone preserves generators and base arc, ending in the correct sector', () => {
  const r = 1.3, h = 2.4, L = Math.hypot(r,h);
  for (const t of [0, .25, .5, .99, 1]) {
    near(distance(conePoint(r,h,.7,0,t), conePoint(r,h,.7,1,t)), L);
    let arc = 0;
    for (let i=0;i<2000;i++) arc += distance(conePoint(r,h,-Math.PI+i/2000*2*Math.PI,1,t),conePoint(r,h,-Math.PI+(i+1)/2000*2*Math.PI,1,t));
    near(arc,2*Math.PI*r,.00001);
  }
  const p = conePoint(r,h,Math.PI,1,1);
  near(p[1], h/2);
  near(Math.atan2(p[0],p[2]), Math.PI*r/L);
});
test('prism panels retain their lengths and end in one flat ribbon', () => {
  const original = prismPath(points,0);
  near(original.at(-1).x, points[0].x);
  near(original.at(-1).z, points[0].z);
  for (const t of [0,.25,.5,1]) {
    const path = prismPath(points,t);
    for (let i=0;i<points.length;i++) near(Math.hypot(path[i+1].x-path[i].x,path[i+1].z-path[i].z),Math.hypot(original[i+1].x-original[i].x,original[i+1].z-original[i].z));
    if(t===1) path.forEach(p=>near(p.z,0));
  }
});
test('complete meshes are finite and flat at 100%, including rigid bases', () => {
  for (const type of ['cyl','cone','prism']) {
    const group = new THREE.Group();
    const update = makeDevelopable(THREE,group,type,{r:1.3,h:2.4,points});
    for (const t of [0,.5,1]) {
      update(t); group.updateMatrixWorld(true);
      group.traverse(object=>{
        if (!object.isMesh) return;
        const positions = object.geometry.attributes.position;
        for (let i=0;i<positions.count;i++) {
          const p = new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld);
          assert.ok([p.x,p.y,p.z].every(Number.isFinite));
          if(t===1) near(type==='cone'?p.y:p.z,type==='cone'?1.2:0);
        }
      });
    }
  }
});
