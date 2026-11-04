import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Cutout=require('../assets/js/lessons/pivot-cutout.js');
const Piv=require('../lib/piv-engine.js');
test('background flood clears paper but preserves enclosed white details and colored lines',()=>{
 const w=7,h=7,data=new Uint8ClampedArray(w*h*4).fill(255);
 for(let y=2;y<=4;y++)for(let x=2;x<=4;x++)if(x===2||x===4||y===2||y===4){const i=(y*w+x)*4;data[i]=20;data[i+1]=80;data[i+2]=200;}
 const clean=Cutout.removeBackground(data,w,h,40);
 assert.equal(clean[3],0);assert.equal(clean[(3*w+3)*4+3],255);assert.equal(clean[(2*w+2)*4+3],255);assert.equal(data[3],255);
});
test('already transparent artwork does not have dark strokes removed',()=>{
 const data=new Uint8ClampedArray(5*5*4);data[(2*5+2)*4+3]=255;
 assert.deepEqual(Cutout.removeBackground(data,5,5,100),data);
});
const src='data:image/png;base64,AAAA';
const segments=[{parent:0,length:10,restAngle:0,thickness:2,artwork:{src,width:20,height:10,pivotX:4,pivotY:5}},
 {parent:1,length:5,restAngle:0,thickness:2,attachX:2,attachY:3,artwork:{src,width:8,height:8,pivotX:1,pivotY:2}}];
const makeDoc=()=>({width:690,height:420,fps:10,types:[{segments,order:[0,1]}],frames:[{figures:[{id:1,type:0,x:100,y:100,scale:1,angles:[0,0]}],order:[0]}]});
test('artwork follows bone rotation, child attachment offsets, scale and reflection',()=>{
 const doc=makeDoc(),fig=doc.frames[0].figures[0];
 let j=Piv.figureJoints(doc,fig);assert.equal(j.startX[1],112);assert.equal(j.startY[1],103);
 fig.angles=[Math.PI/2,Math.PI/2];j=Piv.figureJoints(doc,fig);assert.equal(j.startX[1],97);assert.equal(j.startY[1],112);
 let ops=Piv.frameOps(doc,0);assert.equal(ops[0].kind,'image');assert.equal(ops[0].rotation,Math.PI/2);
 fig.mirrored=true;fig.angles=[Math.PI,Math.PI];j=Piv.figureJoints(doc,fig);assert.equal(j.startX[1],88);assert.equal(j.startY[1],103);
 ops=Piv.frameOps(doc,0);assert.equal(ops[0].scaleX,-1);assert.equal(ops[0].rotation,0);
 assert.match(Piv.frameToSvg(doc,0),/<image href="data:image\/png;base64,/);
});
test('project validation accepts artwork rigs and rejects remote artwork and cyclic bones',()=>{
 const saved={doc:makeDoc()};assert.equal(Cutout.validateProject(saved),saved);
 const remote=structuredClone(saved);remote.doc.types[0].segments[0].artwork.src='https://example.com/picture.png';assert.throws(()=>Cutout.validateProject(remote));
 const cyclic=structuredClone(saved);cyclic.doc.types[0].segments[0].parent=1;assert.throws(()=>Cutout.validateProject(cyclic));
});
test('standard figures still generate geometry and expected child endpoints',()=>{
 const doc={types:[Piv.defaultFigureType()],frames:[{figures:[{type:0,x:50,y:50,scale:1,angles:Array(12).fill(0)}],order:[0]}]};
 assert.equal(Piv.frameOps(doc,0).length,12);assert.equal(Piv.figureJoints(doc,doc.frames[0].figures[0]).endX[1],114);
});
