import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFile,writeFile} from 'node:fs/promises';
import {checkProgram,runProgram,evaluate,num,sensor,binary,DEFAULT_SENSORS,csv} from '../assets/js/nxt/program.mjs';
import {projects,starterProgram} from '../assets/js/nxt/projects.mjs';
import {toNxc} from '../assets/js/nxt/nxc.mjs';
import {Brick,pcmRso,checkRso} from '../assets/js/nxt/brick.mjs';
import {createCompilerServer} from '../scripts/nxt-compiler-bridge.mjs';
function io(overrides={}){const moves=[],samples=[],tones=[];return {moves,samples,tones,check(){},async read(){return 0;},async wait(){},async move(ports,degrees){moves.push({ports,degrees});},async tone(hz,ms){tones.push([hz,ms]);},async sound(){},sample(label,value){samples.push([label,value]);},async resetEncoder(){},async brake(){},...overrides};}
test('all twelve project templates validate and export real NXC text',()=>{assert.equal(Object.keys(projects).length,12);for(const key of Object.keys(projects)){const p=checkProgram(starterProgram(key));assert.match(toNxc(p),/task main\(\)/);assert.match(toNxc(p),/task labWatchdog/);}});
test('obstacle decisions, line following and math execute against sensor inputs',async()=>{
 const clear=io({read:async()=>80});await runProgram(starterProgram('avoid'),clear);assert.equal(clear.moves.length,20);assert.deepEqual(clear.moves[0],{ports:[[1,25],[2,25]],degrees:45});
 const wall=io({read:async()=>10});await runProgram(starterProgram('avoid'),wall);assert.equal(wall.moves.length,40);assert.deepEqual(wall.moves[1].ports,[[1,25],[2,-25]]);
 const line=io({read:async()=>24});await runProgram(starterProgram('line'),line);assert.deepEqual(line.moves[0].ports,[[1,20],[2,35]]);
 const ruler=io({read:async()=>360});await runProgram(starterProgram('measure'),ruler);assert(Math.abs(ruler.samples[0][1]-Math.PI*56)<.001);
});
test('score waits for release, nested branches and variable math produce separate hits',async()=>{let index=0;const values=[0,1,1,0,0,1,1,0,0,1,1,0];const mock=io({read:async()=>values[index++]??0});const vars=await runProgram(starterProgram('target'),mock);assert.equal(vars.score,3);assert.deepEqual(mock.samples,[['score',1],['score',2],['score',3]]);});
test('loop budgets, bad projects and unsafe calculations fail explicitly',async()=>{
 assert.throws(()=>checkProgram({version:2,sensors:{...DEFAULT_SENSORS,light:1},steps:[{type:'stop'}]}),/own input/);
 await assert.rejects(evaluate(binary('/',num(1),num(0)),{read:async()=>0,variables:{}}),/zero/);
 await assert.rejects(runProgram({version:2,steps:[{type:'while',condition:num(1),limit:num(3),body:[]}]},io()),/limit/);
 const clipped=io();await runProgram({version:2,steps:[{type:'motor',port:0,power:num(1000),degrees:num(10000)}]},clipped);assert.deepEqual(clipped.moves[0],{ports:[[0,60]],degrees:720});
 assert.throws(()=>checkProgram({version:2,steps:[{type:'sound',file:'../../bad.rso',ms:num(100)}]}),/filename/);
});
test('touch, light, sound, ultrasonic and encoder requests use correct protocol fields',async()=>{
 const commands=[];let pending=true;const connection={command:async b=>{commands.push(b);if(b[1]===7){const r=new Uint8Array(16);r[4]=1;new DataView(r.buffer).setInt16(12,42,true);return r;}
 if(b[1]===14&&pending){pending=false;throw Object.assign(Error('pending'),{status:32});}if(b[1]===14)return [2,14,0,1];if(b[1]===16)return [2,16,0,1,80];if(b[1]===6){const r=new Uint8Array(25);new DataView(r.buffer).setInt32(21,-360,true);return r;}return [2,b[1],0];}};
 const brick=new Brick(connection);assert.equal(await brick.read('touch',DEFAULT_SENSORS),42);assert.equal(await brick.read('light',DEFAULT_SENSORS),42);assert.equal(await brick.read('sound',DEFAULT_SENSORS),42);assert.equal(await brick.read('ultrasonic',DEFAULT_SENSORS),80);assert.equal(await brick.read('encoderB',DEFAULT_SENSORS),-360);
 assert(commands.some(b=>b.join()==='0,5,2,5,128'));assert(commands.some(b=>b.join()==='0,5,1,8,128'));assert(commands.some(b=>b.join()==='0,15,3,2,1,2,66'));await assert.rejects(brick.read('touch2',DEFAULT_SENSORS),/absent/);
});
test('RSO conversion creates big-endian 8kHz mono PCM and caps duration',()=>{
 const rso=pcmRso([Float32Array.from([-1,0,1])],8000);assert.deepEqual([...rso],[1,0,0,3,31,64,0,0,0,128,255]);checkRso(rso);assert.equal(pcmRso([new Float32Array(100000)],8000).length,64008);assert.throws(()=>checkRso(new Uint8Array(20)),/RSO/);
});
test('brick file transfer sends complete chunks, validates acks and closes handles',async()=>{
 const sent=[];const brick=new Brick({command:async bytes=>{sent.push(bytes);if(bytes[1]===0x89)return [2,0x89,0,5];if(bytes[1]===0x83)return [2,0x83,0,5,bytes.length-3,0];return [2,bytes[1],0];}});
 const audio=pcmRso([new Float32Array(120)],8000);await brick.upload('hello.rso',audio);assert.equal(sent[0][1],0x89);assert.equal(sent.filter(b=>b[1]===0x83).length,3);assert.deepEqual(sent.at(-1),[1,0x84,5]);
 await assert.rejects(brick.upload('bad.rxe',new TextEncoder().encode('plain NXC source')),/compiled/);await brick.start('myrobot.rxe');assert.deepEqual(sent.at(-1).slice(0,2),[0,0]);
});
test('CSV labels physical vs simulated data and escapes text',()=>{const text=csv([{time:10,source:'SIMULATED',label:'say "hello"',value:42}]);assert.match(text,/SIMULATED/);assert.match(text,/say ""hello""/);});
test('local compiler companion accepts validated programs and rejects untrusted origins',async t=>{
 let source='';const server=createCompilerServer({compile:async(input,output)=>{source=await readFile(input,'utf8');await writeFile(output,Buffer.concat([Buffer.from('MindstormsNXT'),Buffer.alloc(30)]));}});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());const url='http://127.0.0.1:'+server.address().port;
 let r=await fetch(url+'/compile',{method:'POST',headers:{Origin:'https://mrscandrett.github.io'},body:JSON.stringify(starterProgram('music'))});assert.equal(r.status,200);assert.match(source,/SetSensorSound\(IN_2,false\)/);assert.equal((await r.arrayBuffer()).byteLength,43);
 r=await fetch(url+'/compile',{method:'POST',headers:{Origin:'https://evil.example'},body:'{}'});assert.equal(r.status,403);
 r=await fetch(url+'/compile',{method:'POST',body:'{"version":2,"steps":[{"type":"execute-shell"}]}'});assert.equal(r.status,400);
});
test('unequal drive powers scale wheel targets so a line follower actually steers',async()=>{
 const sent=[];const brick=new Brick({command:async b=>{sent.push(b);if(b[1]===6)return new Uint8Array(25);return [2,b[1],0];}});
 await brick.move([[1,20],[2,35]],30,async()=>{});
 const moves=sent.filter(b=>b[1]===4&&b[3]);assert.deepEqual(moves.map(b=>[b[2],b[8]+256*b[9]]),[[1,17],[2,30]]);
});
test('failed brick write closes the file handle, and source cannot enter sensor configuration',async()=>{
 const sent=[];const brick=new Brick({command:async b=>{sent.push(b);if(b[1]===0x89)return [2,0x89,0,1];if(b[1]===0x83)return [2,0x83,0,1,0,0];return [2,b[1],0];}});
 await assert.rejects(brick.upload('hello.rso',pcmRso([new Float32Array(30)],8000)),/complete file write/);assert.deepEqual(sent.at(-1),[1,0x84,1]);
 assert.throws(()=>checkProgram({version:2,sensors:{evil:'1);malicious()'},steps:[{type:'stop'}]}),/Unknown sensor/);
});
test('missing compiler is reported as unavailable rather than producing a fake executable',async t=>{
 const server=createCompilerServer({compile:async()=>{throw Object.assign(Error('missing'),{code:'ENOENT'});}});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());
 const r=await fetch('http://127.0.0.1:'+server.address().port+'/compile',{method:'POST',body:JSON.stringify(starterProgram('music'))});assert.equal(r.status,503);assert.match(await r.text(),/compiler not found/);
});
test('phone relay requires its private session link and relays only bounded direction/stop actions',async()=>{
 const {createPhoneRelay}=await import('../scripts/nxt-phone-remote.mjs');const relay=createPhoneRelay({token:'0123456789abcdef0123456789abcdef'});relay.server.listen(0,'127.0.0.1');await once(relay.server,'listening');const base='http://127.0.0.1:'+relay.server.address().port,query='?token='+relay.token;let reader;
 try{
  let r=await fetch(base+'/remote');assert.equal(r.status,403);
  r=await fetch(base+'/events'+query);reader=r.body.getReader();await reader.read();
  r=await fetch(base+'/command'+query,{method:'POST',body:JSON.stringify({action:'forward'})});assert.equal(r.status,200);const event=new TextDecoder().decode((await reader.read()).value);assert.match(event,/"action":"forward"/);
  r=await fetch(base+'/command'+query,{method:'POST',body:JSON.stringify({action:'erase-brick'})});assert.equal(r.status,400);
  r=await fetch(base+'/command'+query,{method:'POST',body:JSON.stringify({action:'stop'})});assert.equal(r.status,200);
 }finally{await reader?.cancel();relay.close();}
});
test('compiler health compiles a real probe and never claims an absent compiler is ready',async()=>{
 const missing=createCompilerServer({compile:async()=>{throw Object.assign(Error('not installed'),{code:'ENOENT'});}});missing.listen(0,'127.0.0.1');await once(missing,'listening');
 try{const r=await fetch('http://127.0.0.1:'+missing.address().port+'/health');const result=await r.json();assert.equal(result.ready,false);assert.equal(result.compilerReady,false);assert.match(result.message,/compiler not found/);}finally{missing.close();}
 let calls=0;const valid=createCompilerServer({compile:async(source,output)=>{calls++;assert.match(await readFile(source,'utf8'),/PlayTone/);await writeFile(output,Buffer.from('MindstormsNXT-probe'));}});valid.listen(0,'127.0.0.1');await once(valid,'listening');
 try{const base='http://127.0.0.1:'+valid.address().port;assert.equal((await(await fetch(base+'/health')).json()).compilerReady,true);await fetch(base+'/health');assert.equal(calls,1);}finally{valid.close();}
});
test('browser diagnostics distinguish blocked helper, missing compiler, old helper and ready state',async()=>{
 const {probeCompiler}=await import('../assets/js/nxt/compiler-client.mjs');
 assert.equal((await probeCompiler(async()=>{throw Error('network blocked');})).state,'unreachable');
 const response=data=>async()=>({ok:true,json:async()=>data});
 assert.equal((await probeCompiler(response({service:'NXT local compiler',ready:true}))).state,'outdated');
 assert.equal((await probeCompiler(response({service:'NXT local compiler',protocol:1,compilerReady:false,message:'missing'}))).state,'compiler-missing');
 assert.equal((await probeCompiler(response({service:'NXT local compiler',protocol:1,compilerReady:true,busy:false}))).state,'ready');
});
test('downloaded Windows companion includes its bridge dependencies and checksum-verified portable setup',async()=>{
 const {default:JSZip}=await import('jszip');const zip=await JSZip.loadAsync(await readFile(new URL('../downloads/nxt-compiler-windows.zip',import.meta.url)));
 for(const name of ['nxt-compiler.mjs','Start-NXT-Compiler.cmd','Start-NXT-Compiler.ps1','README.txt'])assert(zip.file('NXT-Compiler-Windows/'+name));
 const bundle=await zip.file('NXT-Compiler-Windows/nxt-compiler.mjs').async('string');assert.match(bundle,/function toNxc/);assert.match(bundle,/function checkProgram/);assert.doesNotMatch(bundle,/from ['"]\.\.\//);
 const setup=await zip.file('NXT-Compiler-Windows/Start-NXT-Compiler.ps1').async('string');assert.match(setup,/Get-FileHash -Algorithm SHA256/);assert.match(setup,/--self-test/);assert.match(setup,/https:\/\/nodejs.org/);assert.match(setup,/963f50d431308b64/);
});
