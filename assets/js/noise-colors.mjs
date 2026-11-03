// Coloured noise for the site music player. Pure (no DOM, no Web Audio) so the worklet and tests share it.
// Each colour is white noise reshaped so its power falls or rises by a fixed amount per octave.
export const NOISE_COLORS = [
  { id: 'white', name: 'White noise', slope: '0 dB/octave', hue: 200, swatch: '#eef2f7', rms: 0.1,
    about: 'Equal power at every frequency, like a detuned radio. Bright and hissy.' },
  { id: 'pink', name: 'Pink noise', slope: '−3 dB/octave', hue: 330, swatch: '#f4a6c8', rms: 0.11,
    about: 'Equal power in every octave, like steady rain. The ear hears it as balanced.' },
  { id: 'brown', name: 'Brown noise', slope: '−6 dB/octave', hue: 28, swatch: '#8a5a36', rms: 0.14,
    about: 'Power falls fast with pitch, like a waterfall or distant surf. Deep and soft.' },
  { id: 'blue', name: 'Blue noise', slope: '+3 dB/octave', hue: 212, swatch: '#5b8def', rms: 0.06,
    about: 'Power rises with pitch, the mirror image of pink. Like a spray hose.' },
  { id: 'violet', name: 'Violet noise', slope: '+6 dB/octave', hue: 272, swatch: '#9b6cf0', rms: 0.05,
    about: 'Power rises steeply with pitch, the mirror image of brown. Thin and sharp.' },
];

// How a generator appears to pages that show the player's current track (SiteMusic.snapshot()).
export function noiseTrack(id) {
  const color = NOISE_COLORS.find(c => c.id === id);
  return color && { id: `noise-${color.id}`, title: color.name, composer: 'Noise generator', detail: color.about, noise: true };
}

// Unscaled RMS of each raw generator for uniform white input in [−1, 1], measured once
// (tests/noise-colors.test.mjs keeps them honest) so every colour comes out at its `rms`.
const RAW_RMS = { white: 0.5774, pink: 1.774, blue: 1.048, violet: 0.8165 };

export function createNoise(id, { sampleRate = 48000, random = Math.random } = {}) {
  const color = NOISE_COLORS.find(c => c.id === id);
  if (!color) throw new Error(`Unknown noise colour: ${id}`);
  const white = () => random() * 2 - 1;
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  // Paul Kellet's refined pink filter: six leaky integrators whose sum is within ±0.05 dB of −3 dB/octave.
  const pink = () => {
    const w = white();
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    const out = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
    b6 = w * 0.115926;
    return out;
  };
  // Brown: a leaky integrator (−6 dB/octave above ~30 Hz, flat below so it can't drift off).
  const leak = Math.exp(-2 * Math.PI * 30 / sampleRate);
  const brownRMS = Math.sqrt(1 / 3 / (1 - leak * leak));
  // Blue and violet: the first difference (+6 dB/octave) of pink and white.
  const raw = {
    white,
    pink,
    brown: () => (last = leak * last + white()),
    blue: () => { const p = pink(); const out = p - last; last = p; return out; },
    violet: () => { const w = white(); const out = w - last; last = w; return out; },
  }[id];
  const gain = color.rms / (id === 'brown' ? brownRMS : RAW_RMS[id]);
  return () => Math.max(-1, Math.min(1, raw() * gain));
}
