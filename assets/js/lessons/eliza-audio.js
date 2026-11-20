// Optional Web Audio synthesizer mimicking an IBM 1050 / Teletype Model 33
// typebar strike and carriage-return bell. Off by default until toggled on.

export function createTeletypeAudio() {
  let ctx = null;
  let noiseBuf = null;
  let enabled = false;

  function ensureContext() {
    if (!enabled) return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) {
      ctx = new AudioCtx();
    }
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    if (!noiseBuf && ctx) {
      const length = Math.max(1, Math.floor(ctx.sampleRate * 0.03));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.25));
      }
      noiseBuf = buffer;
    }
    return ctx;
  }

  function playKeyStrike(isEliza = true) {
    if (!enabled) return;
    try {
      const audio = ensureContext();
      if (!audio || !noiseBuf) return;
      const now = audio.currentTime;

      const src = audio.createBufferSource();
      src.buffer = noiseBuf;
      const filter = audio.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = isEliza ? 1650 + Math.random() * 260 : 1200 + Math.random() * 220;
      filter.Q.value = 2.2;

      const gain = audio.createGain();
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(audio.destination);
      src.start(now);
      src.stop(now + 0.02);

      const osc = audio.createOscillator();
      const bodyGain = audio.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(isEliza ? 290 : 210, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.014);
      bodyGain.gain.setValueAtTime(0.025, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
      osc.connect(bodyGain);
      bodyGain.connect(audio.destination);
      osc.start(now);
      osc.stop(now + 0.016);
    } catch (_) {
      // Ignore audio errors if autoplay policy blocks playback.
    }
  }

  function playCarriageReturn() {
    if (!enabled) return;
    try {
      const audio = ensureContext();
      if (!audio) return;
      const now = audio.currentTime;

      const bell = audio.createOscillator();
      const gain = audio.createGain();
      bell.type = "sine";
      bell.frequency.setValueAtTime(2040, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.22);
      bell.connect(gain);
      gain.connect(audio.destination);
      bell.start(now);
      bell.stop(now + 0.24);
    } catch (_) {
      // Ignore audio errors.
    }
  }

  return {
    setEnabled(next) {
      enabled = Boolean(next);
      if (enabled) ensureContext();
    },
    isEnabled() {
      return enabled;
    },
    playKeyStrike,
    playCarriageReturn
  };
}
