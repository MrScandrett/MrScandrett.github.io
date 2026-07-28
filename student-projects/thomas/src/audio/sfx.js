/*
 * sfx — small WebAudio noise-maker.
 *
 * Every sound is synthesised from oscillators and noise buffers, so the game
 * still ships as plain files with no audio assets to load or host.
 *
 * Browsers refuse to start an AudioContext until the player has interacted with
 * the page, so nothing is created until `unlock()` is called from a real click
 * or keypress. Before that, every play() call is a no-op rather than an error.
 */

let ctx = null;
let master = null;
let muted = false;

export function unlock() {
    if (ctx) {
        if (ctx.state === 'suspended') ctx.resume();
        return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
}

export function setMuted(value) {
    muted = value;
    if (master) master.gain.value = muted ? 0 : 0.35;
}

export function isMuted() {
    return muted;
}

function envelope(duration, peak = 1) {
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    gain.connect(master);
    return gain;
}

function tone(startFreq, endFreq, duration, type = 'sine', peak = 0.6) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(startFreq, now);
    if (endFreq !== startFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + duration);
    }
    osc.connect(envelope(duration, peak));
    osc.start(now);
    osc.stop(now + duration + 0.02);
}

let noiseBuffer = null;
function noise(duration, filterFreq, peak = 0.4) {
    if (!ctx || muted) return;
    if (!noiseBuffer) {
        noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    src.connect(filter);
    filter.connect(envelope(duration, peak));
    src.start(ctx.currentTime);
    src.stop(ctx.currentTime + duration + 0.02);
}

export const sfx = {
    throwSnowball: () => noise(0.14, 1100, 0.28),
    hit: () => tone(880, 620, 0.09, 'square', 0.32),
    kill: () => { tone(720, 240, 0.28, 'triangle', 0.5); noise(0.2, 500, 0.25); },
    playerHurt: () => { tone(190, 90, 0.3, 'sawtooth', 0.45); noise(0.16, 300, 0.3); },
    dash: () => noise(0.22, 700, 0.3),
    jump: () => tone(420, 620, 0.1, 'sine', 0.22),
    waveStart: () => { tone(440, 660, 0.18, 'triangle', 0.5); setTimeout(() => tone(660, 880, 0.26, 'triangle', 0.5), 150); },
    waveCleared: () => { tone(660, 880, 0.16, 'sine', 0.45); setTimeout(() => tone(880, 1180, 0.3, 'sine', 0.45), 140); },
    purchase: () => { tone(880, 1320, 0.12, 'sine', 0.4); setTimeout(() => tone(1320, 1760, 0.16, 'sine', 0.35), 90); },
    denied: () => tone(220, 160, 0.18, 'square', 0.3),
    shieldBreak: () => { tone(520, 130, 0.34, 'square', 0.42); noise(0.26, 900, 0.34); },
    gameOver: () => {
        [520, 400, 300, 200].forEach((f, i) => setTimeout(() => tone(f, f * 0.75, 0.42, 'triangle', 0.45), i * 190));
    }
};
