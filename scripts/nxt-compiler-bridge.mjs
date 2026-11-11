#!/usr/bin/env node
// Teacher-run compiler companion. Accepts validated program data, never executable source.
import http from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {toNxc} from '../assets/js/nxt/nxc.mjs';
import {projects,starterProgram} from '../assets/js/nxt/projects.mjs';
const exec=promisify(execFile);
const compilerMessage=e=>e.code==='ENOENT'?'NBC/NXC compiler not found. Use the Windows companion download, or set NXT_NBC to the full path of nbc.exe.':String(e.stderr||e.stdout||e.message).slice(0,4000);
export function compilerRunner(compiler){return (source,output)=>exec(compiler,[source,'-O='+output,'-v=128'],{cwd:path.dirname(source),timeout:15000,maxBuffer:128000,windowsHide:true});}
export async function compileProgram(program,compile){
 const source=toNxc(program),dir=await mkdtemp(path.join(os.tmpdir(),'nxt-lab-'));
 try{const input=path.join(dir,'myrobot.nxc'),output=path.join(dir,'myrobot.rxe');await writeFile(input,source);await compile(input,output);const bytes=await readFile(output);if(bytes.length>128000||bytes.subarray(0,13).toString()!=='MindstormsNXT')throw Error('Compiler did not produce a valid NXT .rxe file.');return bytes;}
 catch(e){if(e.path?.endsWith('myrobot.rxe')&&e.code==='ENOENT')throw Error('The compiler exited without creating myrobot.rxe. Check its compatibility and diagnostics.');const error=Object.assign(Error(compilerMessage(e).replaceAll(dir,'[temporary project]')),{code:e.code});throw error;}
 finally{await rm(dir,{recursive:true,force:true});}
}
export async function testCompiler(compile,{all=false}={}){
 const tone={version:2,sensors:{touch:0,sound:0,light:0,ultrasonic:0,touch2:0},steps:[{type:'tone',frequency:{kind:'number',value:440},ms:{kind:'number',value:100}}]};
 await compileProgram(tone,compile);
 if(all){const n=value=>({kind:'number',value}),div=(left,right)=>({kind:'binary',op:'/',left,right});await compileProgram({...tone,steps:[{type:'tone',frequency:div(div(n(1760),n(2)),n(2)),ms:n(100)}]},compile);console.log('Compiled nested arithmetic fixture.');}
 if(all)for(const key of Object.keys(projects)){try{await compileProgram(starterProgram(key),compile);console.log('Compiled starter: '+key);}catch(e){throw Error(key+': '+e.message);}}
}
export function createCompilerServer({compiler=process.env.NXT_NBC||'nbc',origins=['http://127.0.0.1:8080','http://localhost:8080','https://mrscandrett.github.io'],compile=compilerRunner(compiler)}={}){
 let busy=false,health=null,healthPromise=null,checkedAt=0;
 async function checkHealth(){
  if(health&&Date.now()-checkedAt<(health.compilerReady?60000:2000))return health;
  if(!healthPromise)healthPromise=(async()=>{try{await testCompiler(compile);health={compilerReady:true,message:'Compiler verified with a generated tone program.'};}catch(e){health={compilerReady:false,message:compilerMessage(e)};}checkedAt=Date.now();return health;})().finally(()=>{healthPromise=null;});
  return healthPromise;
 }
 return http.createServer(async(req,res)=>{
  const host=String(req.headers.host||'');if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host)){res.writeHead(403);res.end('Loopback host required.');return;}
  const origin=req.headers.origin;if(origin&&!origins.includes(origin)){res.writeHead(403);res.end('Origin is not allowed.');return;}
  if(origin)res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Private-Network','true');res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  if(req.method==='GET'&&req.url==='/health'){
   const result=busy?(health||{compilerReady:false,message:'Compiler is busy; check again after it finishes.'}):await checkHealth();
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify({service:'NXT local compiler',protocol:1,ready:result.compilerReady,busy,...result}));return;
  }
  if(req.method!=='POST'||req.url!=='/compile'){res.writeHead(404);res.end('Not found.');return;}
  if(busy||healthPromise){res.writeHead(409);res.end('Compiler is busy. Try again shortly.');return;}
  busy=true;
  try{
   let body='',length=0;for await(const chunk of req){length+=chunk.length;if(length>150000)throw Error('Program exceeds 150 KB.');body+=chunk.toString('utf8');}
   const bytes=await compileProgram(JSON.parse(body),compile);health={compilerReady:true,message:'Compiler verified.'};checkedAt=Date.now();busy=false;
   res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="myrobot.rxe"'});res.end(bytes);
  }catch(e){busy=false;if(!res.destroyed){res.writeHead(e.code==='ENOENT'?503:400,{'Content-Type':'text/plain'});res.end(compilerMessage(e));}}
  finally{busy=false;}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const compiler=process.env.NXT_NBC||'nbc';
 if(process.argv.includes('--self-test')){
  try{await testCompiler(compilerRunner(compiler),{all:true});console.log('NXT compiler verified: tone and all 12 starter projects compile. No robot was connected or moved.');}catch(e){console.error(compilerMessage(e));process.exitCode=1;}
 }else{
  const port=Number(process.env.NXT_COMPILER_PORT||8791);const origins=['http://127.0.0.1:8080','http://localhost:8080','https://mrscandrett.github.io',...(process.env.NXT_COMPILER_ORIGINS||'').split(',').filter(Boolean)];
  const server=createCompilerServer({compiler,origins});server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'Port 8791 is already in use. An existing companion may already be running.':e.message);process.exitCode=1;});server.listen(port,'127.0.0.1',()=>console.log(`NXT compiler companion: http://127.0.0.1:${port}. Leave this window open, then use Check compiler in the website. No robot connection or firmware changes are performed.`));
 }
}
