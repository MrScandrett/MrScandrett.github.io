import test from 'node:test';
import assert from 'node:assert/strict';
import {sheet,area,foldPanels,commit,rotate,validFold} from '../assets/js/lessons/origami/paper.mjs';
const fold={a:[0,-7.5],b:[0,7.5],side:1,direction:'valley'};
test('straight folds conserve paper area through repeated folds',()=>{let p=sheet();for(const f of [fold,{...fold,a:[-7.5,0],b:[7.5,0]},{...fold,a:[3.75,-7.5],b:[3.75,7.5]}]){p=commit(p,f);assert.ok(Math.abs(p.reduce((s,p)=>s+area(p.points),0)-225)<1e-8);}});
test('half-fold lifts moving paper without stretching or moving hinge',()=>{const p=[-7.5,2];const q=rotate(p,fold,90);assert.ok(Math.abs(q[2]-7.5)<1e-8);assert.ok(Math.abs(q[0])<1e-8);assert.deepEqual(rotate([0,2],fold,90),[0,2,0]);assert.ok(Math.abs(Math.hypot(...q)-Math.hypot(...p))<1e-8);});
test('mountain direction and moving side are independent',()=>{assert.ok(rotate([-2,0],fold,90)[2]>0);assert.ok(rotate([-2,0],{...fold,direction:'mountain'},90)[2]<0);assert.ok(rotate([2,0],{...fold,side:-1},90)[2]>0);});
test('reject hinges outside paper and degenerate hinges',()=>{assert.ok(validFold(sheet(),fold));assert.equal(validFold(sheet(),{...fold,a:[10,-10],b:[10,10]}),false);assert.equal(validFold(sheet(),{...fold,b:fold.a}),false);});
test('flat folded faces switch and produce two half panels',()=>{const p=commit(sheet(),fold);assert.equal(p.length,2);assert.equal(p[1].face,1);assert.ok(p.flatMap(p=>p.points).every(p=>p[0]>=-1e-8));assert.equal(foldPanels(sheet(),fold,90).length,2);});
