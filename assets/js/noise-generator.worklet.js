/* AudioWorklet for the site music player's noise generators: computes coloured noise
 * sample by sample, so it never loops or repeats. The colour comes in processorOptions;
 * the player makes a new node to change colour. Fades in over 0.3 s so starting never clicks. */
import { createNoise } from './noise-colors.mjs';

class NoiseGenerator extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.next = createNoise(options.processorOptions.color, { sampleRate });
    this.fade = 0;
    this.fadeStep = 1 / (0.3 * sampleRate);
  }
  process(inputs, outputs) {
    const [left, right] = outputs[0];
    for (let i = 0; i < left.length; i++) {
      if (this.fade < 1) this.fade = Math.min(1, this.fade + this.fadeStep);
      left[i] = this.next() * this.fade;
    }
    if (right) right.set(left);
    return true;
  }
}
registerProcessor('noise-generator', NoiseGenerator);
