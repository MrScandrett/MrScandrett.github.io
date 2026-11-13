import test from 'node:test';
import assert from 'node:assert/strict';
import { mapAirPoint, airActionValue, strokeNear, calibrationBounds } from '../assets/js/lessons/air-chalk-tools.mjs';
test('calibrated reach fills the board and clamps outlying points',()=>{
 const b=calibrationBounds({x:.2,y:.25},{x:.8,y:.85});
 assert.deepEqual(mapAirPoint(.2,.25,b,1000,600),{x:0,y:0});
 assert.deepEqual(mapAirPoint(.8,.85,b,1000,600),{x:1000,y:600});
 assert.deepEqual(mapAirPoint(1,-1,b,1000,600),{x:1000,y:0});
 assert.equal(calibrationBounds({x:.6,y:.4},{x:.3,y:.8}),null);
 assert.equal(calibrationBounds({x:.2,y:.2},{x:.3,y:.8}),null);
});
test('3D actions use screen motion with bounded independent ranges',()=>{
 assert.equal(airActionValue('unfold',20,500,200,1000,600),70);
 assert.equal(airActionValue('joint',20,500,200,1000,600,2),100);
 assert.equal(airActionValue('slice',0,999,-300,1000,600),100);
 assert.equal(airActionValue('slice',0,999,600,1000,600),-100);
});
test('eraser hits line segments between sampled points, leaving distant ink',()=>{
 const stroke={points:[{x:0,y:0},{x:200,y:0}],width:4};
 assert.equal(strokeNear(stroke,100,10,12),true);
 assert.equal(strokeNear(stroke,100,30,12),false);
});
