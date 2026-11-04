import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {uvLayoutSvg} from '../assets/js/design3d/uv-layout.mjs';
test('UV layout supports indexed triangles, flips V and reports tiled coordinates',()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));assert.equal(uvLayoutSvg(g),null);g.setIndex([0,1,2]);g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,2],2));const out=uvLayoutSvg(g);assert.equal(out.outside,1);assert.equal(out.triangles,1);assert.match(out.svg,/M0.00,1024.00L1024.00,1024.00L0.00,-1024.00Z/);g.attributes.uv.setX(0,NaN);assert.throws(()=>uvLayoutSvg(g),/finite/);g.dispose();});
