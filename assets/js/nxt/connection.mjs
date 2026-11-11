import {frame, Frames, motor} from './protocol.mjs';
export class Connection {
  pending=null; chain=Promise.resolve(); closed=false;
  constructor(log, lost) { this.log=log; this.lost=lost; }
  async connect(kind) {
    this.kind=kind;
    if (kind === 'usb') {
      if (!navigator.usb) throw Error('WebUSB is unavailable. Use desktop Chrome or Edge on HTTPS, or practice in the simulator.');
      this.device=await navigator.usb.requestDevice({filters:[{vendorId:0x0694,productId:0x0002}]});
      await this.device.open();
      if (!this.device.configuration) await this.device.selectConfiguration(1);
      const intf=this.device.configuration.interfaces.find(i=>i.alternates.some(a=>a.endpoints.some(e=>e.direction==='out' && e.type==='bulk') && a.endpoints.some(e=>e.direction==='in' && e.type==='bulk')));
      if (!intf) throw Error('NXT USB bulk interface not found.');
      const alt=intf.alternates.find(a=>a.endpoints.some(e=>e.direction==='out' && e.type==='bulk') && a.endpoints.some(e=>e.direction==='in' && e.type==='bulk'));
      this.interface=intf.interfaceNumber;
      await this.device.claimInterface(this.interface);
      await this.device.selectAlternateInterface(this.interface,alt.alternateSetting);
      this.out=alt.endpoints.find(e=>e.direction==='out' && e.type==='bulk').endpointNumber;
      this.input=alt.endpoints.find(e=>e.direction==='in' && e.type==='bulk').endpointNumber;
    } else {
      if (!navigator.serial) throw Error('Web Serial is unavailable. Use desktop Chrome or Edge on HTTPS. Pair NXT in system Bluetooth settings first.');
      this.port=await navigator.serial.requestPort();
      await this.port.open({baudRate:115200});
      this.writer=this.port.writable.getWriter(); this.reader=this.port.readable.getReader();
    }
    this.readLoop();
    const reply=await this.command([0,11]);
    if (reply.length !== 5) throw Error('This port did not return an NXT battery reply.');
    return ((reply[3]+reply[4]*256)/1000).toFixed(2);
  }
  async readLoop() {
    const frames=new Frames();
    try {
      while (!this.closed) {
        let packets;
        if (this.kind === 'usb') {
          const result=await this.device.transferIn(this.input,64);
          if (result.status !== 'ok' || !result.data) throw Error('USB read failed.');
          packets=[new Uint8Array(result.data.buffer,result.data.byteOffset,result.data.byteLength)];
        } else {
          const {value,done}=await this.reader.read(); if (done) throw Error('Bluetooth serial connection closed.');
          packets=frames.push(value);
        }
        for (const p of packets) {
          const pending=this.pending;
          if (pending && p[0]===2 && p[1]===pending.opcode) {
            this.pending=null; clearTimeout(pending.timer);
            if (p[2]) pending.reject(Object.assign(Error(`NXT returned error 0x${p[2].toString(16)}.`),{status:p[2]})); else pending.resolve(p);
          }
        }
      }
    } catch(e) { if (!this.closed) { this.fail(e); this.lost(e); } }
  }
  fail(e) { if (this.pending) {clearTimeout(this.pending.timer);this.pending.reject(e);this.pending=null;} }
  command(bytes, guard=()=>true) {
    const task=this.chain.then(async()=>{
      // Allow the stock NXT Bluetooth stack to recover between reply and next telegram.
      if (this.kind === 'serial') await new Promise(r=>setTimeout(r,35));
      if (!guard()) throw Error('Stopped.');
      if (this.closed) throw Error('Disconnected.');
      const payload=Uint8Array.from(bytes);
      this.log(payload);
      let resolve,reject;
      const reply=new Promise((a,b)=>{resolve=a;reject=b;});
      this.pending={opcode:bytes[1],resolve,reject,timer:setTimeout(()=>{const e=Error('NXT reply timed out. Reconnect before trying again.');this.fail(e);this.lost(e);this.close().catch(()=>{});},2000)};
      try {
        if (this.kind === 'usb') { const result=await this.device.transferOut(this.out,payload);if(result.status!=='ok')throw Error('USB write failed.'); }
        else await this.writer.write(frame(payload));
      } catch(e) { this.fail(e); }
      return reply;
    });
    this.chain=task.catch(()=>{}); return task;
  }
  async stop() { try { await this.command([0,1]); } catch(e) { if(e.status!==0xec)throw e; } for(let p=0;p<3;p++) await this.command(motor(p,0)); await this.command([0,12]); }
  async close() {
    if(this.closed)return; this.closed=true;this.fail(Error('Disconnected.'));
    if(this.reader){await this.reader.cancel().catch(()=>{});this.reader.releaseLock();}
    if(this.writer){this.writer.releaseLock();}
    if(this.port)await this.port.close().catch(()=>{});
    if(this.device?.opened)await this.device.close().catch(()=>{});
  }
}
