import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectPoint, validCorners, inkAlpha, tracePaths } from '../assets/js/lessons/layer-lab/scan-math.mjs';
const p=[{x:.1,y:.2},{x:.9,y:.1},{x:.8,y:.9},{x:.2,y:.8}];
test('projective correction maps all corners exactly',()=>{
  [[0,0],[1,0],[1,1],[0,1]].forEach(([u,v],i)=>{const a=projectPoint(p,u,v);assert.ok(Math.abs(a.x-p[i].x)<1e-10);assert.ok(Math.abs(a.y-p[i].y)<1e-10);});
  assert.equal(validCorners(p),true);assert.equal(validCorners([p[0],p[2],p[1],p[3]]),false);
});
test('ink cleanup preserves black, removes paper and keeps faint partial alpha',()=>{
  assert.equal(inkAlpha(0,0,0,65,235),255);assert.equal(inkAlpha(250,250,250,65,235),0);assert.ok(inkAlpha(150,150,150,65,235)>0);
});
test('trace contains real closed paths with separate hole boundaries',()=>{
  const path=tracePaths(new Uint8Array([1,1,1,1,0,1,1,1,1]),3,3);
  assert.equal((path.match(/M/g)||[]).length,2);assert.equal((path.match(/Z/g)||[]).length,2);
  assert.equal(tracePaths(new Uint8Array(9),3,3),'');
});
