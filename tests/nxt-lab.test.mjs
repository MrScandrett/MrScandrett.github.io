import {test} from 'node:test';
import assert from 'node:assert/strict';
import {motor,frame,Frames,validateProject} from '../assets/js/nxt/protocol.mjs';
import {Connection} from '../assets/js/nxt/connection.mjs';
test('NXT finite moves encode signed power and little endian degrees',()=>{
 assert.deepEqual([...motor(1,-35,360)],[0,4,1,221,7,1,0,32,104,1,0,0]);
 assert.deepEqual([...motor(2,0)],[0,4,2,0,3,0,0,0,0,0,0,0]);
 assert.throws(()=>motor(1,35,0));assert.throws(()=>motor(1,80,180));assert.throws(()=>motor(3,30,180));
});
test('Bluetooth reply parser handles fragmented and coalesced messages',()=>{
 const p=new Frames();const a=frame([2,11,0,32,28]),b=frame([2,4,0]);
 assert.deepEqual(p.push(a.slice(0,1)),[]);assert.deepEqual(p.push(a.slice(1,4)),[]);
 assert.deepEqual(p.push(Uint8Array.from([...a.slice(4),...b])).map(x=>[...x]),[[2,11,0,32,28],[2,4,0]]);
 assert.throws(()=>new Frames().push([255,255]));
});
test('project imports reject unlimited loops, invalid steps and unsafe motor amounts',()=>{
 assert.throws(()=>validateProject({version:1,repeat:99,steps:[{type:'forward',value:90}]}));
 assert.throws(()=>validateProject({version:1,repeat:1,steps:[{type:'eval',value:90}]}));
 assert.throws(()=>validateProject({version:1,repeat:1,steps:[{type:'forward',value:0}]}));
 assert.throws(()=>validateProject({version:1,repeat:1,steps:[{type:'forward',value:721}]}));
 assert.deepEqual(validateProject({version:1,repeat:4,steps:[{type:'touch',value:10}]}),{version:1,repeat:4,steps:[{type:'touch',value:10}]});
});
test('USB sends raw commands and STOP brakes all ports',async()=>{
 const sent=[];const c=new Connection(()=>{},()=>{});c.kind='usb';c.device={transferOut:async(ep,p)=>{sent.push([...p]);queueMicrotask(()=>{c.pending.resolve(Uint8Array.from([2,p[1],0]));clearTimeout(c.pending.timer);c.pending=null;});return {status:'ok'};}};
 await c.command(motor(1,35,180));await c.stop();assert.equal(sent.length,6);assert.deepEqual(sent[1],[0,1]);assert.deepEqual(sent.slice(2,5).map(p=>[p[2],p[3],p[7]]),[[0,0,0],[1,0,0],[2,0,0]]);assert.deepEqual(sent[5],[0,12]);
});
test('cancelled queued commands never reach the hardware',async()=>{
 const c=new Connection(()=>{},()=>{});c.kind='usb';let writes=0;c.device={transferOut:async()=>{writes++;return {status:'ok'};}};
 await assert.rejects(c.command(motor(1,30,90),()=>false),/Stopped/);assert.equal(writes,0);
});
test('Bluetooth writes include length framing and parse streamed replies',async()=>{
 let feed;const c=new Connection(()=>{},()=>{});c.kind='serial';
 c.reader={read:()=>new Promise(r=>feed=r)};c.writer={write:async bytes=>{assert.deepEqual([...bytes],[2,0,0,11]);feed({value:Uint8Array.from([5,0,2]),done:false});setTimeout(()=>feed({value:Uint8Array.from([11,0,32,28]),done:false}),0);}};
 c.readLoop();const reply=await c.command([0,11]);assert.deepEqual([...reply],[2,11,0,32,28]);c.closed=true;feed({done:true});
});
