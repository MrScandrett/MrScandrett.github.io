/* music-synth.js — the site's pitched instrument voices on plain Web Audio.
 *
 * Shared by Track Studio (music-daw.js) and the score player (score-engine.js), so a
 * note sounds the same wherever it is played. Instruments: piano, ePiano, organ,
 * pluck, bass, strings, pad, synth.
 *
 *   const v = MusicSynth.startVoice(ctx, destination, 'piano', 60, 0.8, ctx.currentTime);
 *   v.release(ctx.currentTime + 0.5);   // or v.kill(time) to cut it off
 */
(function (root) {
'use strict';

const midiHz = (n) => 440 * Math.pow(2, (n - 69) / 12);

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
      if (root.LessonInstrumentEngines) { const shared=root.LessonInstrumentEngines.pianoSources(c,out,f,t); shared.sources.cleanup=shared.disconnect; return shared.sources; }
      const filt = lowpass(c, out, 3000, 0.6);
      filt.frequency.setValueAtTime(Math.min(9000, 2600 + v * 4200 + f * 2), t);
      filt.frequency.setTargetAtTime(Math.min(4200, 900 + f * 1.6), t + 0.02, 0.5);
      const srcs = [[1, 1, 'triangle', 0], [2, 0.3, 'sine', 1.1], [3, 0.12, 'sine', 0.6], [4, 0.05, 'sine', 0.3]].map(([r, l, type, dec], i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.value = f * r; o.detune.value = i ? (i % 2 ? 1.2 : -1.1) : 0;
        g.gain.setValueAtTime(l, t);
        if (dec) g.gain.setTargetAtTime(0, t, dec / 3);
        o.connect(g); g.connect(filt); o.start(t);
        return o;
      });
      const hammer = c.createBufferSource(), hf = c.createBiquadFilter(), hg = c.createGain();
      hammer.buffer = noise(c);
      hf.type = 'bandpass'; hf.frequency.value = Math.min(5200, 1800 + f); hf.Q.value = 0.8;
      hg.gain.setValueAtTime(0.06 * v, t); hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
      hammer.connect(hf); hf.connect(hg); hg.connect(filt);
      hammer.start(t, Math.random() * 0.5); hammer.stop(t + 0.05);
      return srcs;
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
      if (root.LessonInstrumentEngines) { const source=c.createBufferSource();source.buffer=root.LessonInstrumentEngines.pluckBuffer(c,f,5);const body=lowpass(c,out,Math.min(9000,f*9+1200),.7);source.connect(body);source.start(t);const sources=[source];sources.cleanup=()=>{source.disconnect();body.disconnect();};return sources; }
      const filt = lowpass(c, out, 400, 1.2);
      filt.frequency.setValueAtTime(1200 + v * 5200, t);
      filt.frequency.setTargetAtTime(Math.max(300, f * 1.5), t, 0.08);
      return [osc(c, 'sawtooth', f, t, filt, 0.6), osc(c, 'triangle', f, t, filt, 0.8)];
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
  const sources = def.voice(c, midiHz(pitch), vel, t, env, settings);
  let cleaned=false;
  function cleanup() { if(cleaned)return;cleaned=true;voice.done=true;env.disconnect();sources.cleanup?.();if(onEnded)onEnded(voice); }
  const voice = {
    t, def, peak, env, sources, done: false,
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
  };
  sources[0].onended=cleanup;
  return voice;
}

root.MusicSynth = { instruments: Object.keys(SYNTHS), startVoice, midiHz };
})(typeof window !== 'undefined' ? window : globalThis);
