import {motor,u16} from './protocol.mjs';
export function filename(name,extension){if(!new RegExp('^[A-Za-z0-9_-]{1,15}\\.'+extension+'$','i').test(name))throw Error('Use 1–15 letters, numbers, _ or - plus .'+extension);return [...new TextEncoder().encode(name),...Array(20-name.length).fill(0)];}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export class Brick {
 constructor(connection,guard=()=>true){this.connection=connection;this.guard=guard;this.configured=new Map();}
 command(bytes){return this.connection.command(bytes,this.guard);}
 async read(name,sensors){
  if(name.startsWith('encoder')){const port={encoderA:0,encoderB:1,encoderC:2}[name];const r=await this.command([0,6,port]);if(r.length!==25)throw Error('Invalid encoder reply.');return new DataView(r.buffer,r.byteOffset,r.byteLength).getInt32(21,true);}
  const port=sensors[name];if(!port)throw Error(name+' sensor is marked absent. Set its input port.');const p=port-1;
  const [type,mode]=name==='touch'||name==='touch2'?[1,32]:name==='light'?[5,128]:name==='sound'?[8,128]:[11,0];
  if(this.configured.get(p)!==name){await this.command([0,5,p,type,mode]);await sleep(name==='ultrasonic'?150:100);this.configured.set(p,name);}
  if(name==='ultrasonic'){
   await this.command([0,15,p,2,1,2,0x42]);
   let ready=false;for(let i=0;i<30;i++){try{const r=await this.command([0,14,p]);if(r[3]>=1){ready=true;break;}}catch(e){if(e.status!==0x20)throw e;}await sleep(15);}
   if(!ready)throw Error('Ultrasonic sensor did not return a measurement. Check its cable and port.');
   const r=await this.command([0,16,p]);if(r.length<5||r[3]<1)throw Error('Invalid ultrasonic reply.');return r[4];
  }
  for(let i=0;i<10;i++){const r=await this.command([0,7,p]);if(r.length>=16&&r[4])return new DataView(r.buffer,r.byteOffset,r.byteLength).getInt16(12,true);await sleep(25);}
  throw Error(name+' sensor not ready. Check the cable, sensor type and port.');
 }
 async resetEncoder(port){await this.command([0,10,port,0]);}
 async move(ports,degrees,wait){
  const fastest=Math.max(1,...ports.map(([,power])=>Math.abs(power)));
  for(const [port,power] of ports)await this.command(motor(port,power,power?Math.max(1,Math.round(degrees*Math.abs(power)/fastest)):0));
  const deadline=Date.now()+10000;
  while(true){await wait(80);let done=true;for(const [port,power] of ports){if(!power)continue;const r=await this.command([0,6,port]);if(r.length!==25)throw Error('Invalid motor status reply.');if(r[8]!==0)done=false;}if(done)break;if(Date.now()>deadline)throw Error('Motor did not finish. Check for a jam.');}
  for(const [port] of ports)await this.command(motor(port,0));
 }
 async tone(hz,ms){await this.command([0,3,...u16(hz),...u16(ms)]);}
 async sound(file){await this.command([0,2,0,...filename(file,'rso')]);}
 async upload(name,data,onProgress=()=>{}){
  const ext=name.split('.').pop().toLowerCase();if(!['rxe','rso'].includes(ext))throw Error('Only .rxe programs or .rso sounds can be sent.');
  const bytes=new Uint8Array(data);if(!bytes.length||bytes.length>128000)throw Error('File must contain 1–128,000 bytes.');
  if(ext==='rxe'&&new TextDecoder().decode(bytes.slice(0,13))!=='MindstormsNXT')throw Error('Not a compiled NXT .rxe file. Exported .nxc text must be compiled first.');
  if(ext==='rso')checkRso(bytes);
  const size=bytes.length;let handle;
  try{
   const r=await this.command([1,0x89,...filename(name,ext),size&255,(size>>>8)&255,(size>>>16)&255,(size>>>24)&255]);
   if(r.length!==4)throw Error('Invalid file-open reply.');handle=r[3];
   for(let n=0;n<size;n+=56){const chunk=bytes.slice(n,n+56);const reply=await this.command([1,0x83,handle,...chunk]);if(reply.length!==6||reply[3]!==handle||reply[4]+256*reply[5]!==chunk.length)throw Error('Brick did not confirm the complete file write.');onProgress(Math.min(size,n+chunk.length),size);}
  }catch(e){if(e.status===0x8f)throw Error('A file with this name already exists on the NXT. Choose a new name; existing files are never overwritten.');if(e.status===0x82||e.status===0x89)throw Error('The NXT has insufficient free file space. Ask the teacher to review the brick files.');throw e;}finally{if(handle!==undefined)await this.connection.command([1,0x84,handle]);}
 }
 async start(name){await this.command([0,0,...filename(name,'rxe')]);}
}
export function checkRso(bytes){
 if(bytes.length<9)throw Error('RSO sound is too short.');const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(v.getUint16(0)!==0x100||v.getUint16(2)!==bytes.length-8||v.getUint16(4)<2000||v.getUint16(4)>8000||v.getUint16(6)!==0)throw Error('Use an uncompressed, nonlooping RSO file at 2–8 kHz.');return bytes;
}
export function pcmRso(channels,sampleRate){
 if(!channels.length||!Number.isFinite(sampleRate)||sampleRate<=0||channels.some(c=>c.length!==channels[0].length))throw Error('Invalid audio.');
 const length=Math.min(64000,Math.floor(channels[0].length*8000/sampleRate));if(length<1)throw Error('Audio is empty.');
 const out=new Uint8Array(length+8),v=new DataView(out.buffer);v.setUint16(0,0x100);v.setUint16(2,length);v.setUint16(4,8000);v.setUint16(6,0);
 for(let i=0;i<length;i++){const index=i*sampleRate/8000,lo=Math.floor(index),hi=Math.min(channels[0].length-1,lo+1);let value=0;for(const c of channels)value+=(c[lo]*(1-(index-lo))+c[hi]*(index-lo))/channels.length;out[i+8]=Math.round(Math.max(0,Math.min(255,(value+1)*127.5)));}return out;
}
