// NXT stock-firmware direct commands. Bluetooth adds a uint16 LE length; USB does not.
export const u16 = n => [n & 255, (n >>> 8) & 255];
export const frame = bytes => Uint8Array.from([...u16(bytes.length), ...bytes]);
export function motor(port, power, degrees = 0) {
  if (!Number.isInteger(port) || port < 0 || port > 2 || !Number.isInteger(power) || Math.abs(power) > 60 || (power && (!Number.isInteger(degrees) || degrees < 1 || degrees > 720))) throw Error('Motor values outside classroom limits.');
  return Uint8Array.from([0, 4, port, power & 255, power ? 7 : 3, power ? 1 : 0, 0, power ? 32 : 0, ...u16(degrees), 0, 0]);
}
export function validateProject(p) {
  const types = ['forward','backward','left','right','motorA','tone','wait','touch'];
  if (p?.version !== 1 || !Array.isArray(p.steps) || p.steps.length < 1 || p.steps.length > 40 || !Number.isInteger(p.repeat) || p.repeat < 1 || p.repeat > 8) throw Error('Use a version 1 NXT project with 1–40 steps and 1–8 repeats.');
  return {version:1, repeat:p.repeat, steps:p.steps.map(s => {
    if (!types.includes(s.type) || !Number.isInteger(s.value) || s.value < 1 || s.value > (['wait','touch'].includes(s.type) ? 10 : s.type === 'tone' ? 2000 : 720) || (s.type === 'tone' && s.value < 200)) throw Error('A step has an invalid type or value.');
    return {type:s.type,value:s.value};
  })};
}
export class Frames {
  buffer = [];
  push(chunk) {
    this.buffer.push(...chunk); const out=[];
    while (this.buffer.length >= 2) {
      const n=this.buffer[0] + 256*this.buffer[1];
      if (n < 3 || n > 64) throw Error('Invalid NXT reply framing. Reconnect the brick.');
      if (this.buffer.length < n+2) break;
      out.push(Uint8Array.from(this.buffer.splice(0,n+2).slice(2)));
    }
    return out;
  }
}
