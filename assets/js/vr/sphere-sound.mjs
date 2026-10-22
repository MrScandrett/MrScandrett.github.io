// sphere-sound.mjs — sound for the 360° page sphere, after the Sphere's wave-field audio.
//
// Sphere aims sound from 168,000 speakers (Huygens–Fresnel / Kirchhoff–Helmholtz). One
// listener in headphones gets the same effect from HRTF panning: every sound has a place.
//   - a laser click ticks from the panel you clicked;
//   - a lesson's own <audio>/<video> plays from the panel it sits on, in a cone facing you
//     (a Kirchhoff "beam": loud while you face it, quiet once you turn away);
//   - optional ambience per world, with a deep "felt" rumble for Lava Lamp (the Wave
//     Equation's infrasound seats; headphones stop near 20 Hz, so it is low bass instead).
// The top half is pure (tested in tests/page-sphere.test.mjs); createSound() needs Web Audio.
import { LOOK } from './sphere-theme.mjs';

export const SOUND_MODES = ['off', 'clicks', 'full'];
export const SOUND_KEY = 'classroomos-sphere-sound';
export function soundMode(value) { return SOUND_MODES.includes(value) ? value : 'clicks'; }

/** The beam a panel's media plays in: full inside 60°, fading to 15% outside 150°. */
export const MEDIA_CONE = { inner: 60, outer: 150, outerGain: 0.15 };

/** Ambience per world: a drone (Hz, two detuned voices), filtered noise, and rumble. */
export function ambienceFor(look) {
  switch (look) {
    case LOOK.lava: return { drone: 55, noise: 0, cutoff: 260, rumble: 32, level: 0.05 };
    case LOOK.vaporwave: return { drone: 110, noise: 0, cutoff: 900, rumble: 0, level: 0.03 };
    case LOOK.night: return { drone: 0, noise: 0.5, cutoff: 5200, rumble: 0, level: 0.015 };
    case LOOK.bark: return { drone: 0, noise: 1, cutoff: 700, rumble: 0, level: 0.03 };
    case LOOK.mandelbrot: return { drone: 73.4, noise: 0, cutoff: 600, rumble: 0, level: 0.03 };
    default: return { drone: 0, noise: 1, cutoff: 420, rumble: 0, level: 0.02 };
  }
}

/* ── Web Audio ──────────────────────────────────────────────────── */
export function createSound({ mode = 'clicks' } = {}) {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let master = null;
  let bed = null;
  let look = LOOK.sky;
  const routed = new WeakMap(); // media element → its panner (a source can be made only once)

  function context() {
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function panner(at, facing = null) {
    const p = ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = 2;
    place(p, at, facing);
    return p;
  }
  function place(p, at, facing) {
    const set = (param, v) => { if (param) param.value = v; };
    if (p.positionX) { set(p.positionX, at.x); set(p.positionY, at.y); set(p.positionZ, at.z); } else p.setPosition(at.x, at.y, at.z);
    if (facing) {
      if (p.orientationX) { set(p.orientationX, facing.x); set(p.orientationY, facing.y); set(p.orientationZ, facing.z); } else p.setOrientation(facing.x, facing.y, facing.z);
    }
  }

  /** Keep the listener on your head, facing where you look. */
  function listen(position, forward, up) {
    if (!ctx) return;
    const l = ctx.listener;
    if (l.positionX) {
      const t = ctx.currentTime;
      l.positionX.setTargetAtTime(position.x, t, 0.02); l.positionY.setTargetAtTime(position.y, t, 0.02); l.positionZ.setTargetAtTime(position.z, t, 0.02);
      l.forwardX.setTargetAtTime(forward.x, t, 0.02); l.forwardY.setTargetAtTime(forward.y, t, 0.02); l.forwardZ.setTargetAtTime(forward.z, t, 0.02);
      l.upX.setTargetAtTime(up.x, t, 0.02); l.upY.setTargetAtTime(up.y, t, 0.02); l.upZ.setTargetAtTime(up.z, t, 0.02);
    } else {
      l.setPosition(position.x, position.y, position.z);
      l.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
  }

  /** A short tick from a point in the world: a click, or (quieter) aiming at a control. */
  function tick(at, { soft = false } = {}) {
    if (mode === 'off' || !context()) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(soft ? 1400 : 900, t);
    osc.frequency.exponentialRampToValueAtTime(soft ? 1100 : 520, t + 0.06);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(soft ? 0.05 : 0.22, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t + (soft ? 0.05 : 0.09));
    osc.connect(env).connect(panner(at)).connect(master);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  /** Route a page's <audio>/<video> so it plays from its panel, beamed at the centre. */
  function placeMedia(el, at, facing) {
    if (!context()) return;
    let p = routed.get(el);
    if (!p) {
      let src;
      try { src = ctx.createMediaElementSource(el); } catch { return; } // already routed elsewhere
      p = panner(at, facing);
      p.coneInnerAngle = MEDIA_CONE.inner;
      p.coneOuterAngle = MEDIA_CONE.outer;
      p.coneOuterGain = MEDIA_CONE.outerGain;
      src.connect(p).connect(master); // media plays in every mode: it is the lesson, not an effect
      routed.set(el, p);
    }
    place(p, at, facing);
  }

  function stopBed() {
    if (!bed) return;
    const old = bed;
    bed = null;
    old.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
    setTimeout(() => old.nodes.forEach(n => { try { n.stop(); } catch { /* not a source */ } }), 2000);
  }
  function startBed() {
    stopBed();
    if (mode !== 'full' || !context()) return;
    const a = ambienceFor(look);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(a.level, ctx.currentTime, 1.2);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = a.cutoff;
    filter.connect(gain).connect(master);
    const nodes = [];
    if (a.drone) {
      for (const detune of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = a.drone;
        o.detune.value = detune;
        o.connect(filter);
        nodes.push(o);
      }
    }
    if (a.noise) {
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      let brown = 0;
      for (let i = 0; i < len; i++) { brown = (brown + 0.02 * (Math.random() * 2 - 1)) / 1.02; ch[i] = brown * 3.5 * a.noise; }
      const n = ctx.createBufferSource();
      n.buffer = buf;
      n.loop = true;
      n.connect(filter);
      nodes.push(n);
    }
    if (a.rumble) {
      // From under your feet, like the heater at the bottom of the lamp.
      const o = ctx.createOscillator();
      o.frequency.value = a.rumble;
      const swell = ctx.createGain();
      swell.gain.value = 2.2;
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = 0.12;
      depth.gain.value = 1.4;
      lfo.connect(depth).connect(swell.gain);
      o.connect(swell).connect(filter);
      nodes.push(o, lfo);
    }
    nodes.forEach(n => n.start());
    bed = { gain, nodes };
  }

  return {
    get mode() { return mode; },
    setMode(next) { mode = soundMode(next); if (mode === 'full') startBed(); else stopBed(); },
    setLook(next) { if (next === look) return; look = next; if (bed) startBed(); },
    /** Call from a user gesture (a click, Enter VR): browsers only start audio then. */
    wake() { if (mode !== 'off' && context() && mode === 'full' && !bed) startBed(); },
    listen,
    tick,
    placeMedia
  };
}

/** A short buzz in every controller that has one (WebXR gamepad haptics). */
export function pulse(session, intensity = 0.3, ms = 18) {
  if (!session) return;
  for (const source of session.inputSources || []) {
    const actuator = source.gamepad && source.gamepad.hapticActuators && source.gamepad.hapticActuators[0];
    if (actuator && actuator.pulse) actuator.pulse(intensity, ms).catch?.(() => {});
  }
}
