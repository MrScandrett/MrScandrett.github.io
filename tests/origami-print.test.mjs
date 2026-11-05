import test from 'node:test';
import assert from 'node:assert/strict';
import Module from '../assets/vendor/manifold/manifold.js';
import { printablePaper } from '../assets/js/lessons/origami/print.mjs';
import {sheet,foldPanels,commit} from '../assets/js/lessons/origami/paper.mjs';
import {readBinaryStl,edgeReport,bounds,signedVolume} from '../assets/js/fab-io.mjs';
const kernel=await Module();kernel.setup();
const fold={a:[0,-7.5],b:[0,7.5],side:1,direction:'valley'};
for(const angle of [0,45,90,135,180]) test(`STL at ${angle}° is fused, closed, positive volume and on bed`,()=>{
 const result=printablePaper(kernel,foldPanels(sheet(),fold,angle));
 const p=readBinaryStl(result.buffer), box=bounds(p);
 assert.ok(edgeReport(p).watertight);assert.ok(signedVolume(p)>0);assert.equal(result.components,1);assert.ok(Math.abs(box.min[2])<1e-5);
 if(angle===180) assert.ok(Math.abs(box.size[2]-1.2)<1e-5);
});
test('sheet size preserves requested physical thickness',()=>{
 for(const size of [30,150,300]) {
 const {buffer}=printablePaper(kernel,sheet(),{size,thickness:2});
 const box=bounds(readBinaryStl(buffer));
 assert.deepEqual(box.size,[size,size,2]);
 }
});
test('repeated folded panels merge without internal faces',()=>{
 let panels=commit(sheet(),fold);panels=commit(panels,{...fold,a:[-7.5,0],b:[7.5,0]});
 assert.equal(printablePaper(kernel,panels).components,1);
});
test('reject invalid physical dimensions',()=>{
 for(const thickness of [0,.7,6,NaN]) assert.throws(()=>printablePaper(kernel,sheet(),{thickness}));
});
