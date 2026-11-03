import './punch-compressor-dsp.js';

class PunchCompressorWorklet extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return Object.entries(PunchCompressorDSP.defaults).map(([name, defaultValue]) => ({
      name, defaultValue, minValue: PunchCompressorDSP.limits[name][0], maxValue: PunchCompressorDSP.limits[name][1], automationRate: 'k-rate',
    }));
  }
  constructor() {
    super();
    this.dsp = new PunchCompressorDSP.Processor(sampleRate);
    this.params = { ...PunchCompressorDSP.defaults };
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
      this.port.postMessage(this.dsp.reduction);
      this.frames = 0;
    }
    return true;
  }
}
registerProcessor('music-lab-punch', PunchCompressorWorklet);
