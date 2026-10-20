/* AudioWorklet for Track Studio microphone recording: posts raw input blocks
 * (with the frame each block started on) so the main thread can line the take
 * up with the song exactly, which MediaRecorder's compressed chunks can't do.
 * Blocks are batched (~21 ms) so a long take doesn't post and copy 375 messages a second. */
const BATCH_FRAMES = 1024;
class DawRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.recording = false;
    this.acc = null;
    this.fill = 0;
    this.accFrame = 0;
    this.port.onmessage = (e) => {
      if (e.data === 'start') { this.recording = true; this.acc = null; this.fill = 0; }
      else {
        this.recording = false;
        if (e.data === 'stop') { this.flush(); this.port.postMessage({ stopped: true }); }
      }
    };
  }
  flush() {
    if (!this.acc || !this.fill) { this.fill = 0; return; }
    const channels = this.acc.map((a) => a.slice(0, this.fill));
    this.port.postMessage({ frame: this.accFrame, channels }, channels.map((a) => a.buffer));
    this.fill = 0;
  }
  process(inputs) {
    const input = inputs[0];
    if (this.recording && input && input.length) {
      const n = input[0].length;
      if (!this.acc || this.acc.length !== input.length || this.fill + n > this.acc[0].length) {
        const sameShape = this.acc && this.acc.length === input.length;
        this.flush();
        if (!sameShape) this.acc = input.map(() => new Float32Array(BATCH_FRAMES + n));
      }
      if (this.fill === 0) this.accFrame = currentFrame;
      for (let ch = 0; ch < input.length; ch++) this.acc[ch].set(input[ch], this.fill);
      this.fill += n;
      if (this.fill >= BATCH_FRAMES) this.flush();
    }
    return true;
  }
}
registerProcessor('daw-recorder', DawRecorder);
