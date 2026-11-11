#!/usr/bin/env node
// Optional, teacher-run local compiler. Never serves files or accepts executable source.
import http from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {toNxc} from '../assets/js/nxt/nxc.mjs';
const exec=promisify(execFile);
export function createCompilerServer({compiler=process.env.NXT_NBC||'nbc',origins=['http://127.0.0.1:8080','http://localhost:8080','https://mrscandrett.github.io'],compile=async(source,output)=>exec(compiler,[source,'-O='+output,'-v=128'],{timeout:15000,maxBuffer:128000})}={}){
 let busy=false;
 return http.createServer(async(req,res)=>{
  const host=String(req.headers.host||'');if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host)){res.writeHead(403);res.end('Loopback host required.');return;}
  const origin=req.headers.origin;if(origin&&!origins.includes(origin)){res.writeHead(403);res.end('Origin is not allowed.');return;}
  if(origin)res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Private-Network','true');res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  if(req.method==='GET'&&req.url==='/health'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({service:'NXT local compiler',compiler,ready:!busy}));return;}
  if(req.method!=='POST'||req.url!=='/compile'){res.writeHead(404);res.end('Not found.');return;}
  if(busy){res.writeHead(409);res.end('Compiler is busy. Try again shortly.');return;}
  busy=true;let dir;
  try{
   let body='',length=0;for await(const chunk of req){length+=chunk.length;if(length>150000)throw Error('Program exceeds 150 KB.');body+=chunk.toString('utf8');}
   const source=toNxc(JSON.parse(body));dir=await mkdtemp(path.join(os.tmpdir(),'nxt-lab-'));const input=path.join(dir,'myrobot.nxc'),output=path.join(dir,'myrobot.rxe');await writeFile(input,source);
   await compile(input,output);const bytes=await readFile(output);if(bytes.length>128000||bytes.subarray(0,13).toString()!=='MindstormsNXT')throw Error('Compiler did not produce a valid NXT .rxe file.');
   await rm(dir,{recursive:true,force:true});dir=undefined;busy=false;
   res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="myrobot.rxe"'});res.end(bytes);
  }catch(e){if(dir){await rm(dir,{recursive:true,force:true});dir=undefined;}busy=false;res.writeHead(e.code==='ENOENT'?503:400,{'Content-Type':'text/plain'});res.end(e.code==='ENOENT'?'NBC/NXC compiler not found. Install a compatible nbc command-line compiler, or set NXT_NBC to its full executable path.':String(e.stderr||e.message).replaceAll(dir||'\0','[temporary project]').slice(0,4000));}
  finally{if(dir)await rm(dir,{recursive:true,force:true});busy=false;}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.NXT_COMPILER_PORT||8791);const origins=['http://127.0.0.1:8080','http://localhost:8080','https://mrscandrett.github.io',...(process.env.NXT_COMPILER_ORIGINS||'').split(',').filter(Boolean)];
 createCompilerServer({origins}).listen(port,'127.0.0.1',()=>console.log(`NXT compiler companion: http://127.0.0.1:${port}. Requires an installed nbc compiler. No robot connection or firmware changes are performed.`));
}
