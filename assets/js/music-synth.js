/* music-synth.js — the site's pitched instrument voices on plain Web Audio.
 *
 * The one voice library for the whole site: Track Studio (music-daw.js), the score
 * player (score-engine.js), Music Lab channel experiences and every instrument lesson
 * (through AudioKit.note in audio-kit.js), so a note sounds the same wherever it is
 * played. Instruments: piano, ePiano, organ, pluck, bass, strings, pad, synth,
 * violin, sax, flute.
 *
 *   const v = MusicSynth.startVoice(ctx, destination, 'piano', 60, 0.8, ctx.currentTime);
 *   v.release(ctx.currentTime + 0.5);   // or v.kill(time) to cut it off
 *   v.glide(62, ctx.currentTime);       // slide a held note (violin fingerboard, bends)
 *
 * Voices never pick their own AudioContext or connect to speakers, so the same code
 * renders live, into an OfflineAudioContext for WAV export, or into a lesson's mix bus.
 */
(function (root) {
'use strict';

const midiHz = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Piano: a fundamental plus a handful of decreasingly loud sine harmonics under a
// fixed lowpass. A struck string rings from the hammer strike with no sustain
// plateau, so the voice envelope (fast attack, long decay) carries the note.
const PIANO_HARMONICS = [[1, 1], [2, .5], [3, .22], [4, .12], [6, .05]];
// The harmonics are one PeriodicWave (same sine-phase partials, un-normalised, so the same
// timbre and level) on a single oscillator: 3 nodes per note instead of 12. On iPad Safari
// the five-oscillator version cost ~4x the CPU and glitched on fast two-hand passages.
const pianoWaves = new WeakMap();
function pianoWave(context) {
  let wave = pianoWaves.get(context);
  if (wave === undefined) {
    try {
      const imag = new Float32Array(Math.max(...PIANO_HARMONICS.map(([m]) => m)) + 1);
      PIANO_HARMONICS.forEach(([multiple, level]) => { imag[multiple] = level; });
      wave = context.createPeriodicWave(new Float32Array(imag.length), imag, { disableNormalization: true });
    } catch (_e) { wave = null; }
    pianoWaves.set(context, wave);
  }
  return wave;
}
function pianoSources(context, output, frequency, time) {
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = Math.min(10000, frequency * 6 + 1800);
  filter.connect(output);
  const nodes = [filter];
  const wave = pianoWave(context);
  if (wave) {
    const oscillator = context.createOscillator();
    oscillator.setPeriodicWave(wave);
    oscillator.frequency.value = frequency;
    oscillator.connect(filter); oscillator.start(time);
    nodes.push(oscillator);
    return { sources: [oscillator], disconnect() { nodes.forEach(node => node.disconnect()); } };
  }
  const sources = PIANO_HARMONICS.map(([multiple, level]) => {
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency * multiple;
    gain.gain.value = level;
    oscillator.connect(gain); gain.connect(filter); oscillator.start(time);
    nodes.push(oscillator, gain);
    return oscillator;
  });
  return { sources, disconnect() { nodes.forEach(node => node.disconnect()); } };
}

// Pluck: Karplus-Strong. A ring buffer of noise, averaged and damped one period at
// a time, is the classic minimal model of a plucked, decaying string. Buffers are
// cached per context and pitch so strums and fast sequences don't recompute them.
const pluckCache = new WeakMap();
function pluckBuffer(context, frequency, duration) {
  const key = frequency.toFixed(2) + ':' + duration;
  let bank = pluckCache.get(context);
  if (!bank) { bank = new Map(); pluckCache.set(context, bank); }
  const hit = bank.get(key);
  if (hit) return hit;
  const length = Math.max(2, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, length, context.sampleRate), data = buffer.getChannelData(0);
  const period = Math.max(2, Math.round(context.sampleRate / frequency)), ring = new Float32Array(period);
  for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
  let index = 0, previous = 0;
  for (let n = 0; n < length; n++) {
    const current = ring[index]; data[n] = current;
    ring[index] = .994 * .5 * (current + previous);
    previous = current; index = (index + 1) % period;
  }
  if (bank.size > 24) bank.delete(bank.keys().next().value);
  bank.set(key, buffer);
  return buffer;
}

const noiseBuffers = new WeakMap();
function noise(c) {
  let b = noiseBuffers.get(c);
  if (!b) {
    b = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseBuffers.set(c, b);
  }
  return b;
}
// Delayed pitch vibrato in cents on the given oscillators. The LFO is tagged `fixed`
// so voice.glide() retunes the notes without retuning the vibrato rate.
function vibrato(c, t, oscs, cents, delay, rate) {
  if (!cents) return [];
  const lfo = c.createOscillator(), depth = c.createGain();
  lfo.fixed = true;
  lfo.frequency.value = rate || 5.2;
  depth.gain.setValueAtTime(0, t);
  depth.gain.linearRampToValueAtTime(cents, t + (delay || 0.35));
  lfo.connect(depth);
  oscs.forEach((o) => depth.connect(o.detune));
  lfo.start(t);
  return [lfo];
}
function osc(c, type, freq, t, out, level) {
  const o = c.createOscillator();
  o.type = type; o.frequency.value = freq;
  if (level === undefined) o.connect(out);
  else { const g = c.createGain(); g.gain.value = level; o.connect(g); g.connect(out); }
  o.start(t);
  return o;
}
function lowpass(c, out, freq, q) {
  const f = c.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q || 0.7;
  f.connect(out);
  return f;
}

// Each synth: envelope (a, d = decay time, s = sustain level, r = release) + a voice builder.
const SYNTHS = {
  piano: {
    a: 0.003, d: 2.6, s: 0.03, r: 0.35, gain: 0.42,
    voice(c, f, v, t, out) {
      const shared = pianoSources(c, out, f, t);
      shared.sources.cleanup = shared.disconnect;
      return shared.sources;
    },
  },
  ePiano: {
    a: 0.003, d: 1.8, s: 0.22, r: 0.3, gain: 0.45,
    voice(c, f, v, t, out) {
      const car = osc(c, 'sine', f, t, out);
      const mod = c.createOscillator(), mg = c.createGain();
      mod.frequency.value = f;
      mg.gain.setValueAtTime(f * (0.6 + 2.2 * v), t);
      mg.gain.setTargetAtTime(f * 0.2, t, 0.35);
      mod.connect(mg); mg.connect(car.frequency); mod.start(t);
      const tine = c.createGain();
      tine.gain.setValueAtTime(0.12 * v, t); tine.gain.setTargetAtTime(0, t, 0.06);
      tine.connect(out);
      const bell = osc(c, 'sine', f * 4, t, tine);
      return [car, mod, bell];
    },
  },
  organ: {
    a: 0.01, d: 0.1, s: 0.95, r: 0.08, gain: 0.22,
    voice(c, f, v, t, out) {
      return [[0.5, 0.5], [1, 1], [2, 0.6], [3, 0.35], [4, 0.25], [8, 0.1]]
        .map(([r, l]) => osc(c, 'sine', f * r, t, out, l));
    },
  },
  pluck: {
    a: 0.002, d: 0.9, s: 0, r: 0.2, gain: 0.45,
    voice(c, f, v, t, out) {
      const source = c.createBufferSource();
      source.buffer = pluckBuffer(c, f, 5);
      const body = lowpass(c, out, Math.min(9000, f * 9 + 1200), 0.7);
      source.connect(body); source.start(t);
      const sources = [source];
      sources.cleanup = () => { source.disconnect(); body.disconnect(); };
      return sources;
    },
  },
  bass: {
    a: 0.005, d: 0.35, s: 0.65, r: 0.08, gain: 0.55,
    voice(c, f, v, t, out) {
      const filt = lowpass(c, out, 300, 2.5);
      filt.frequency.setValueAtTime(260 + f * 2 + v * 1100, t);
      filt.frequency.setTargetAtTime(220 + f * 1.5, t, 0.12);
      return [osc(c, 'sawtooth', f, t, filt, 0.55), osc(c, 'sine', f, t, out, 0.7)];
    },
  },
  strings: {
    a: 0.28, d: 0.6, s: 0.85, r: 0.55, gain: 0.2,
    voice(c, f, v, t, out) {
      const filt = lowpass(c, out, 2400 + v * 1600, 0.7);
      const vib = c.createOscillator(), depth = c.createGain();
      vib.fixed = true;
      vib.frequency.value = 5.2;
      depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(7, t + 0.45);
      vib.connect(depth); vib.start(t);
      const a = osc(c, 'sawtooth', f, t, filt), b = osc(c, 'sawtooth', f, t, filt);
      a.detune.value = -7; b.detune.value = 7;
      depth.connect(a.detune); depth.connect(b.detune);
      return [a, b, vib];
    },
  },
  pad: {
    a: 0.6, d: 1.2, s: 0.8, r: 1.3, gain: 0.16,
    voice(c, f, v, t, out) {
      const filt = lowpass(c, out, 900 + v * 900, 1);
      return [-11, 0, 9].map((cents) => { const o = osc(c, 'sawtooth', f, t, filt); o.detune.value = cents; return o; })
        .concat([osc(c, 'sine', f / 2, t, out, 0.5)]);
    },
  },
  synth: {
    a: 0.008, d: 0.3, s: 0.7, r: 0.16, gain: 0.24,
    voice(c, f, v, t, out, settings) {
      const filt = lowpass(c, out, 1800, 4);
      filt.frequency.setValueAtTime(600 + v * 5200, t);
      filt.frequency.setTargetAtTime(1500 + f, t + 0.01, 0.15);
      const wave=['sine','triangle','sawtooth','square'].includes(settings?.wave)?settings.wave:'sawtooth';
      const a = osc(c, wave, f, t, filt), b = osc(c, settings?.wave?wave:'square', f, t, filt, 0.5);
      a.detune.value = -6; b.detune.value = 6;
      return [a, b];
    },
  },
  // Solo bowed string: a bright sawtooth through a bow-brightness lowpass. Vibrato is
  // a setting (cents, default 8) so intonation lessons can turn it off with vibrato: 0.
  violin: {
    a: 0.06, d: 0.4, s: 0.88, r: 0.12, gain: 0.24,
    voice(c, f, v, t, out, settings) {
      const filt = lowpass(c, out, Math.min(8000, 2600 + f * 2 + v * 1800), 0.8);
      const a = osc(c, 'sawtooth', f, t, filt), b = osc(c, 'sawtooth', f, t, filt, 0.3);
      b.detune.value = 4;
      const cents = Number.isFinite(Number(settings?.vibrato)) ? Number(settings.vibrato) : 8;
      return [a, b].concat(vibrato(c, t, [a, b], cents, 0.3, 5.6));
    },
  },
  // Reed lead (the fake-book "sax"): saw + square with a bright attack that settles.
  sax: {
    a: 0.025, d: 0.75, s: 0.7, r: 0.15, gain: 0.3,
    voice(c, f, v, t, out, settings) {
      const filt = lowpass(c, out, 900, 2);
      filt.frequency.setValueAtTime(900, t);
      filt.frequency.linearRampToValueAtTime(2400 + v * 600, t + 0.06);
      filt.frequency.setTargetAtTime(1500, t + 0.06, 0.2);
      const a = osc(c, 'sawtooth', f, t, filt, 0.35), b = osc(c, 'square', f, t, filt, 0.35);
      b.detune.value = -6;
      const cents = Number.isFinite(Number(settings?.vibrato)) ? Number(settings.vibrato) : 10;
      return [a, b].concat(vibrato(c, t, [a, b], cents));
    },
  },
  flute: {
    a: 0.04, d: 0.75, s: 0.75, r: 0.15, gain: 0.34,
    voice(c, f, v, t, out, settings) {
      const filt = lowpass(c, out, 2600, 0.7);
      const a = osc(c, 'sine', f, t, filt, 0.7), b = osc(c, 'triangle', f, t, filt, 0.7);
      b.detune.value = 4;
      const breath = c.createBufferSource(), bf = c.createBiquadFilter(), bg = c.createGain();
      breath.buffer = noise(c); breath.loop = true;
      bf.type = 'bandpass'; bf.frequency.value = Math.min(9000, f * 2); bf.Q.value = 1.4;
      bg.gain.value = 0.025 + 0.03 * v;
      breath.connect(bf); bf.connect(bg); bg.connect(filt); breath.start(t);
      const cents = Number.isFinite(Number(settings?.vibrato)) ? Number(settings.vibrato) : 10;
      const sources = [a, b, breath].concat(vibrato(c, t, [a, b], cents));
      sources.cleanup = () => { breath.disconnect(); bf.disconnect(); bg.disconnect(); };
      return sources;
    },
  },
};

const LABELS = {
  piano: 'Piano', ePiano: 'Electric piano', organ: 'Organ', pluck: 'Guitar pluck', bass: 'Bass',
  strings: 'Strings', pad: 'Warm pad', synth: 'Synth lead', violin: 'Violin', sax: 'Saxophone', flute: 'Flute',
};

function envLevel(voice, time) {
  const { t, def, peak } = voice, dt = time - t;
  if (dt <= 0) return 0;
  if (dt < def.a) return peak * dt / def.a;
  return peak * def.s + (peak - peak * def.s) * Math.exp(-(dt - def.a) / (def.d / 3));
}

// Starts a pitched note at time t; call voice.release(time) to end it.
// onEnded(voice) runs once the released note has fully faded and disconnected.
function startVoice(c, out, instrument, pitch, vel, t, onEnded, settings = {}) {
  const base = SYNTHS[instrument] || SYNTHS.piano;
  const value=(key,fallback,min,max)=>Number.isFinite(Number(settings[key]))?Math.max(min,Math.min(max,Number(settings[key]))):fallback;
  const def={...base,a:value('attack',base.a,.002,3),d:value('decay',base.d,.02,4),s:value('sustain',base.s,0,1),r:value('release',base.r,.02,5)};
  const env = c.createGain();
  env.connect(out);
  const peak = def.gain * (0.3 + 0.7 * vel) * value('level',1,0,1) * (settings.oscToVca===false||settings.vcaToChannel===false?0:1);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(peak, t + def.a);
  env.gain.setTargetAtTime(peak * def.s, t + def.a, def.d / 3);
  const f0 = midiHz(pitch);
  const sources = def.voice(c, f0, vel, t, env, settings);
  // Pitched oscillators keep their ratio to the fundamental so glide() can retune them.
  const tuned = sources.filter((s) => s.frequency && !s.fixed).map((s) => [s, s.frequency.value / f0]);
  let cleaned=false;
  function cleanup() { if(cleaned)return;cleaned=true;voice.done=true;env.disconnect();sources.cleanup?.();if(onEnded)onEnded(voice); }
  const voice = {
    t, def, peak, env, sources, pitch, done: false,
    release(at) {
      if (voice.done) return;
      voice.done = true;
      at = Math.max(at, t + 0.01);
      env.gain.cancelScheduledValues(at);
      env.gain.setValueAtTime(envLevel(voice, at), at);
      env.gain.setTargetAtTime(0, at, def.r / 3);
      const end = at + def.r * 1.8 + 0.05;
      sources.forEach((s) => { try { s.stop(end); } catch (_e) { /* already stopped */ } });
      sources[0].onended = cleanup;
    },
    kill(at) {
      voice.done = true;
      env.gain.cancelScheduledValues(at);
      env.gain.setTargetAtTime(0, at, 0.01);
      sources[0].onended=cleanup;
      sources.forEach((s) => { try { s.stop(at + 0.06); } catch (_e) { /* already stopped */ } });
    },
    // Slides a sounding note to a new (fractional) MIDI pitch; tau is the glide time constant.
    glide(toPitch, at, tau = 0.015) {
      const hz = midiHz(toPitch);
      voice.pitch = toPitch;
      tuned.forEach(([s, ratio]) => s.frequency.setTargetAtTime(hz * ratio, Math.max(at, c.currentTime), tau));
    },
  };
  sources[0].onended=cleanup;
  return voice;
}

root.MusicSynth = { instruments: Object.keys(SYNTHS), labels: LABELS, startVoice, midiHz, pianoSources, pluckBuffer };
})(typeof window !== 'undefined' ? window : globalThis);
