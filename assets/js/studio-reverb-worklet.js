import './studio-reverb-dsp.js';

class StudioReverbWorklet extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return Object.entries(StudioReverbDSP.defaults).map(([name, defaultValue]) => ({
      name, defaultValue, minValue: StudioReverbDSP.limits[name][0], maxValue: StudioReverbDSP.limits[name][1], automationRate: 'k-rate',
    }));
  }
  constructor() {
    super();
    this.dsp = new StudioReverbDSP.Processor(sampleRate);
    this.params = { ...StudioReverbDSP.defaults };
    this.frames = 0;
    this.alive = true;
    this.port.onmessage = event => { if (event.data === 'dispose') this.alive = false; };
  }
  process(inputs, outputs, parameters) {
    if (!this.alive) return false;
    for (const key of Object.keys(this.params)) this.params[key] = parameters[key][0];
    this.dsp.process(inputs[0] || [], outputs[0], this.params);
    this.frames += outputs[0][0]?.length || 0;
    if (this.frames >= sampleRate / 20) {
      this.port.postMessage(this.dsp.level);
      this.frames = 0;
    }
    return true;
  }
}
registerProcessor('music-lab-studio-reverb', StudioReverbWorklet);
