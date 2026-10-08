/* AudioWorklet for Track Studio microphone recording: posts raw input blocks
 * (with the frame each block started on) so the main thread can line the take
 * up with the song exactly, which MediaRecorder's compressed chunks can't do. */
class DawRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.recording = false;
    this.port.onmessage = (e) => {
      this.recording = e.data === 'start';
      if (e.data === 'stop') this.port.postMessage({ stopped: true });
    };
  }
  process(inputs) {
    const input = inputs[0];
    if (this.recording && input && input.length) {
      this.port.postMessage({ frame: currentFrame, channels: input.map((ch) => ch.slice()) });
    }
    return true;
  }
}
registerProcessor('daw-recorder', DawRecorder);
