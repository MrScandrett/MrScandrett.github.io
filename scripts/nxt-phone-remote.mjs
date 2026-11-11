#!/usr/bin/env node
// Optional LAN remote: phone -> this relay -> connected teacher browser -> NXT.
// It has no USB/Bluetooth driver and accepts only five short-move/stop commands.
import http from 'node:http';
import {randomBytes} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const actions=new Set(['forward','backward','left','right','stop']);
export function createPhoneRelay({token=randomBytes(18).toString('hex'),allowedHosts=['127.0.0.1','localhost'],origins=['https://mrscandrett.github.io','http://127.0.0.1:8080','http://localhost:8080']}={}){
 const clients=new Set();let last=0;
 const server=http.createServer(async(req,res)=>{
  const hostname=String(req.headers.host||'').replace(/:\d+$/,'');if(!allowedHosts.includes(hostname)){res.writeHead(403);res.end('Host not allowed.');return;}
  const url=new URL(req.url,'http://localhost');if(url.searchParams.get('token')!==token){res.writeHead(403);res.end('Use the full teacher-provided remote link.');return;}
  const origin=req.headers.origin;if(origin&&origin!=='http://'+req.headers.host&&!origins.includes(origin)){res.writeHead(403);res.end('Origin not allowed.');return;}
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');if(origin)res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Private-Network','true');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  if(req.method==='GET'&&url.pathname==='/events'){
   if(clients.size){res.writeHead(409);res.end('A teacher browser is already connected. Disconnect it first.');return;}
   res.writeHead(200,{'Content-Type':'text/event-stream','Connection':'keep-alive'});res.write(': connected\n\n');clients.add(res);const timer=setInterval(()=>res.write(': heartbeat\n\n'),15000);req.on('close',()=>{clearInterval(timer);clients.delete(res);});return;
  }
  if(req.method==='POST'&&url.pathname==='/command'){
   let body='',size=0;try{for await(const chunk of req){size+=chunk.length;if(size>100){res.writeHead(413);res.end('Too large.');return;}body+=chunk;}}catch{if(!res.destroyed){res.writeHead(400);res.end('Incomplete command.');}return;}
   let action;try{action=JSON.parse(body).action;}catch{res.writeHead(400);res.end('Invalid command.');return;}
   if(!actions.has(action)){res.writeHead(400);res.end('Unknown action.');return;}
   if(!clients.size){res.writeHead(409);res.end('The teacher browser is not connected to the relay.');return;}
   if(action!=='stop'&&Date.now()-last<250){res.writeHead(429);res.end('Wait before the next move.');return;}last=Date.now();for(const client of clients)client.write('data: '+JSON.stringify({action})+'\n\n');res.end('Command sent. Each move is 45 motor degrees; watch the real robot.');return;
  }
  if(req.method==='GET'&&url.pathname==='/remote'){
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"});res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NXT Phone Remote</title><style>body{font:18px system-ui;background:#202d3b;color:#fff;max-width:440px;margin:24px auto;padding:20px}h1{font-size:26px}.pad{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}button{font:700 22px system-ui;padding:22px 8px;border:1px solid #9eafbf;border-radius:12px;background:#34485c;color:#fff}button:focus-visible{outline:4px solid #ffad6a}.stop{background:#a53746;grid-column:1/-1}p{line-height:1.5;font-size:15px}#status{min-height:80px}</style><h1>NXT Phone Remote</h1><p>Your teacher's browser must stay open and connected to the robot. Each move is short; this is not continuous driving.</p><div class="pad"><span></span><button data-action="forward" aria-label="Forward">↑</button><span></span><button data-action="left" aria-label="Left">↶</button><button data-action="backward" aria-label="Backward">↓</button><button data-action="right" aria-label="Right">↷</button><button class="stop" data-action="stop">STOP</button></div><p id="status" role="status">Ready to send a command. The teacher must enable the real-robot readiness check.</p><p>Keep an adult at the brick. A lost connection can prevent STOP arriving.</p><script>document.querySelectorAll('button').forEach(b=>b.onclick=async()=>{const status=document.getElementById('status');try{const u=new URL('/command',location.href);u.search=location.search;const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:b.dataset.action})});status.textContent=await r.text();}catch{status.textContent='Relay unavailable. Ask the teacher to stop the brick.';}});</script></html>`);return;
  }
  res.writeHead(404);res.end('Not found.');
 });
 return {server,token,close(){for(const client of clients)client.end();server.close();}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const lan=process.argv.includes('--lan');const addresses=Object.values(os.networkInterfaces()).flat().filter(n=>n.family==='IPv4'&&!n.internal).map(n=>n.address);
 const relay=createPhoneRelay({allowedHosts:['127.0.0.1','localhost',...(lan?addresses:[])]});const port=8792;
 relay.server.listen(port,lan?'0.0.0.0':'127.0.0.1',()=>{console.log(`Teacher browser relay link: http://127.0.0.1:${port}/remote?token=${relay.token}`);if(lan)for(const address of addresses)console.log(`Phone link (trusted classroom Wi-Fi only): http://${address}:${port}/remote?token=${relay.token}`);else console.log('Add --lan to serve the phone controls to your trusted classroom Wi-Fi.');});
}
