// Music Lab: WebAudio + WebMIDI minimal instrument rack
// Works best in Chromium browsers. Requires HTTPS for WebMIDI.

let audioCtx = null;
let master = null;

let midiAccess = null;
let currentInput = null;

const activeVoices = new Map(); // midiNote -> voice object

const els = {
  enableAudio: document.getElementById("enableAudio"),
  enableMidi: document.getElementById("enableMidi"),
  midiIn: document.getElementById("midiIn"),
  preset: document.getElementById("preset"),
  status: document.getElementById("status"),
  pianoRoll: document.getElementById("pianoRoll")
};

if (!els.enableAudio || !els.enableMidi || !els.midiIn || !els.preset || !els.status || !els.pianoRoll) {
  throw new Error("Music Lab could not initialize. Missing required DOM nodes.");
}

const PIANO_START_NOTE = 48; // C3
const PIANO_END_NOTE = 72; // C5
const BLACK_CLASSES = new Set([1, 3, 6, 8, 10]);
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const pianoState = {
  pointerDown: false,
  pointerId: null,
  activeNote: null,
  keyByNote: new Map()
};

function setStatus(extra = "") {
  const a = audioCtx ? "on" : "off";
  const m = midiAccess ? "on" : "off";
  const dev = currentInput ? ` · in: ${currentInput.name || "MIDI device"}` : "";
  els.status.textContent = `Audio: ${a} · MIDI: ${m}${dev}${extra ? ` · ${extra}` : ""}`;
}

function ensureAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  master = audioCtx.createGain();
  master.gain.value = 0.6;
  master.connect(audioCtx.destination);
  setStatus();
}

async function enableAudio() {
  ensureAudio();
  if (audioCtx.state !== "running") {
    await audioCtx.resume();
  }
  els.enableMidi.disabled = false;
  setStatus();
}

function midiNoteToHz(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function noteName(note) {
  const octave = Math.floor(note / 12) - 1;
  return `${NOTE_NAMES[note % 12]}${octave}`;
}

function isBlackKey(note) {
  return BLACK_CLASSES.has(note % 12);
}

function clearVoice(note) {
  if (activeVoices.has(note)) {
    stopVoice(note);
  }
}

function startSynth(note, velocity) {
  clearVoice(note);
  const v = Math.max(0.05, velocity);
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  osc.type = "sawtooth";
  osc.frequency.value = midiNoteToHz(note);

  filter.type = "lowpass";
  filter.frequency.value = 1800;
  filter.Q.value = 0.8;

  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(v * 0.5, now + 0.01);
  gain.gain.linearRampToValueAtTime(v * 0.25, now + 0.12);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(master);

  osc.start();
  activeVoices.set(note, { osc, gain, oneShot: false });
}

function startPiano(note, velocity) {
  clearVoice(note);
  const v = Math.max(0.05, velocity);

  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  osc1.type = "triangle";
  osc2.type = "sine";
  const base = midiNoteToHz(note);
  osc1.frequency.value = base;
  osc2.frequency.value = base * 2;
  osc2.detune.value = -6;

  filter.type = "lowpass";
  filter.frequency.value = 2200;
  filter.Q.value = 0.4;

  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(v * 0.7, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(master);

  osc1.start();
  osc2.start();

  activeVoices.set(note, { osc1, osc2, gain, oneShot: true });
}

function makeNoiseBuffer(durationSec) {
  const buffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * durationSec), audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function drumKick() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now = audioCtx.currentTime;

  osc.type = "sine";
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

  gain.gain.setValueAtTime(0.8, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + 0.2);
}

function drumSnare() {
  const noise = audioCtx.createBufferSource();
  noise.buffer = makeNoiseBuffer(0.2);

  const filter = audioCtx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 1200;

  const gain = audioCtx.createGain();
  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(0.6, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(master);

  noise.start(now);
  noise.stop(now + 0.14);
}

function drumHat() {
  const noise = audioCtx.createBufferSource();
  noise.buffer = makeNoiseBuffer(0.08);

  const filter = audioCtx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 6000;

  const gain = audioCtx.createGain();
  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(master);

  noise.start(now);
  noise.stop(now + 0.06);
}

function drumClap() {
  const now = audioCtx.currentTime;
  for (const dt of [0, 0.015, 0.03]) {
    const noise = audioCtx.createBufferSource();
    noise.buffer = makeNoiseBuffer(0.06);

    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2000;
    filter.Q.value = 0.7;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.35, now + dt);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dt + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    noise.start(now + dt);
    noise.stop(now + dt + 0.06);
  }
}

function drumTom(freq) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now = audioCtx.currentTime;

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.55, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

  osc.connect(gain);
  gain.connect(master);

  osc.start(now);
  osc.stop(now + 0.24);
}

function drumPerc() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now = audioCtx.currentTime;

  osc.type = "square";
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);

  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

  osc.connect(gain);
  gain.connect(master);

  osc.start(now);
  osc.stop(now + 0.12);
}

function drumCrash() {
  const noise = audioCtx.createBufferSource();
  noise.buffer = makeNoiseBuffer(0.6);

  const filter = audioCtx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 3000;

  const gain = audioCtx.createGain();
  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(master);

  noise.start(now);
  noise.stop(now + 0.6);
}

function triggerDrum(name) {
  if (!audioCtx) return;
  switch (name) {
    case "kick":
      drumKick();
      break;
    case "snare":
      drumSnare();
      break;
    case "hat":
      drumHat();
      break;
    case "clap":
      drumClap();
      break;
    case "tom1":
      drumTom(180);
      break;
    case "tom2":
      drumTom(120);
      break;
    case "perc":
      drumPerc();
      break;
    case "crash":
      drumCrash();
      break;
    default:
      drumPerc();
      break;
  }
}

function stopVoice(note) {
  if (!audioCtx) return;
  const voice = activeVoices.get(note);
  if (!voice) return;

  const now = audioCtx.currentTime;

  if (voice.oneShot) {
    if (voice.osc1) voice.osc1.stop(now + 0.15);
    if (voice.osc2) voice.osc2.stop(now + 0.15);
    activeVoices.delete(note);
    return;
  }

  if (voice.gain) {
    const current = Math.max(voice.gain.gain.value, 0.0001);
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(current, now);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  }

  if (voice.osc) voice.osc.stop(now + 0.14);
  activeVoices.delete(note);
}

function noteOnFromUi(note, velocity = 0.82) {
  ensureAudio();
  if (audioCtx && audioCtx.state !== "running") {
    audioCtx.resume();
  }

  if (els.preset.value === "piano") startPiano(note, velocity);
  else startSynth(note, velocity);
}

function noteOffFromUi(note) {
  stopVoice(note);
}

function setKeyActive(note, active) {
  const key = pianoState.keyByNote.get(note);
  if (!key) return;
  key.classList.toggle("is-active", Boolean(active));
}

function releasePianoPointer() {
  if (pianoState.activeNote !== null) {
    noteOffFromUi(pianoState.activeNote);
    setKeyActive(pianoState.activeNote, false);
  }
  pianoState.pointerDown = false;
  pianoState.pointerId = null;
  pianoState.activeNote = null;
}

function activatePianoNote(note) {
  if (pianoState.activeNote === note) return;

  if (pianoState.activeNote !== null) {
    noteOffFromUi(pianoState.activeNote);
    setKeyActive(pianoState.activeNote, false);
  }

  noteOnFromUi(note);
  setKeyActive(note, true);
  pianoState.activeNote = note;
}

function makePianoKey(note, keyClass, leftPct, widthPct) {
  const key = document.createElement("button");
  key.type = "button";
  key.className = `music-piano-key ${keyClass}`;
  key.dataset.note = String(note);
  key.setAttribute("aria-label", `Piano key ${noteName(note)}`);
  key.title = noteName(note);
  key.style.left = `${leftPct}%`;
  key.style.width = `${widthPct}%`;

  key.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    pianoState.pointerDown = true;
    pianoState.pointerId = event.pointerId;
    activatePianoNote(note);
    if (typeof key.setPointerCapture === "function") {
      key.setPointerCapture(event.pointerId);
    }
  });

  key.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    noteOnFromUi(note);
    setKeyActive(note, true);
  });

  key.addEventListener("keyup", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    noteOffFromUi(note);
    setKeyActive(note, false);
  });

  key.addEventListener("blur", () => {
    noteOffFromUi(note);
    setKeyActive(note, false);
  });

  pianoState.keyByNote.set(note, key);
  return key;
}

function buildPianoRoll() {
  const notes = [];
  for (let note = PIANO_START_NOTE; note <= PIANO_END_NOTE; note += 1) {
    notes.push(note);
  }

  const whiteNotes = notes.filter((note) => !isBlackKey(note));
  const whiteWidth = 100 / whiteNotes.length;
  const blackWidth = whiteWidth * 0.62;

  const whiteIndexByNote = new Map();
  whiteNotes.forEach((note, index) => {
    whiteIndexByNote.set(note, index);
  });

  els.pianoRoll.innerHTML = "";

  for (const note of whiteNotes) {
    const index = whiteIndexByNote.get(note);
    const left = index * whiteWidth;
    els.pianoRoll.appendChild(makePianoKey(note, "music-piano-key--white", left, whiteWidth));
  }

  for (const note of notes.filter((n) => isBlackKey(n))) {
    const previousWhite = note - 1;
    const index = whiteIndexByNote.get(previousWhite);
    if (typeof index !== "number") continue;
    const left = (index + 1) * whiteWidth - blackWidth / 2;
    els.pianoRoll.appendChild(makePianoKey(note, "music-piano-key--black", left, blackWidth));
  }
}

function wirePianoRollPointer() {
  els.pianoRoll.addEventListener("pointermove", (event) => {
    if (!pianoState.pointerDown || event.pointerId !== pianoState.pointerId) return;
    const hovered = document.elementFromPoint(event.clientX, event.clientY);
    const key = hovered && hovered.closest(".music-piano-key");
    if (!key || !els.pianoRoll.contains(key)) return;
    const nextNote = Number(key.dataset.note);
    if (!Number.isFinite(nextNote)) return;
    activatePianoNote(nextNote);
  });

  els.pianoRoll.addEventListener("pointerup", (event) => {
    if (event.pointerId !== pianoState.pointerId) return;
    releasePianoPointer();
  });

  els.pianoRoll.addEventListener("pointercancel", (event) => {
    if (event.pointerId !== pianoState.pointerId) return;
    releasePianoPointer();
  });

  els.pianoRoll.addEventListener("pointerleave", (event) => {
    if (!pianoState.pointerDown || event.pointerId !== pianoState.pointerId) return;
    releasePianoPointer();
  });

  window.addEventListener("blur", () => {
    releasePianoPointer();
  });
}

function populateMidiInputs() {
  els.midiIn.innerHTML = "";

  if (!midiAccess) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "MIDI is not enabled";
    els.midiIn.appendChild(opt);
    return;
  }

  const inputs = Array.from(midiAccess.inputs.values());
  if (inputs.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No MIDI devices found";
    els.midiIn.appendChild(opt);
    setStatus("no input");
    return;
  }

  for (const input of inputs) {
    const opt = document.createElement("option");
    opt.value = input.id;
    opt.textContent = input.name || `MIDI Input ${input.id}`;
    els.midiIn.appendChild(opt);
  }

  const preferred = currentInput && midiAccess.inputs.get(currentInput.id) ? currentInput.id : inputs[0].id;
  els.midiIn.value = preferred;
  setMidiInput(preferred);
}

function setMidiInput(id) {
  if (!midiAccess) return;

  if (currentInput) currentInput.onmidimessage = null;
  currentInput = midiAccess.inputs.get(id) || null;
  if (currentInput) currentInput.onmidimessage = onMidiMessage;
  setStatus();
}

function onMidiMessage(ev) {
  if (!audioCtx || audioCtx.state !== "running") return;

  const [status, data1, data2] = ev.data;
  const cmd = status & 0xf0;
  const preset = els.preset.value;

  if (cmd === 0x90) {
    const note = data1;
    const vel = data2 / 127;

    if (data2 === 0) {
      if (preset !== "drums") stopVoice(note);
      return;
    }

    if (preset === "drums") {
      const map = {
        36: "kick",
        38: "snare",
        42: "hat",
        39: "clap",
        45: "tom1",
        41: "tom2",
        49: "crash",
        51: "crash"
      };
      triggerDrum(map[note] || "perc");
      return;
    }

    if (preset === "piano") startPiano(note, vel);
    else startSynth(note, vel);
    return;
  }

  if (cmd === 0x80) {
    if (els.preset.value !== "drums") stopVoice(data1);
  }
}

async function enableMidi() {
  if (!navigator.requestMIDIAccess) {
    setStatus("WebMIDI unsupported");
    return;
  }

  try {
    midiAccess = await navigator.requestMIDIAccess();
    midiAccess.onstatechange = () => {
      populateMidiInputs();
    };
    populateMidiInputs();
    setStatus();
  } catch (_err) {
    setStatus("MIDI unavailable");
  }
}

function triggerPad(drumName) {
  ensureAudio();
  if (audioCtx.state !== "running") {
    audioCtx.resume();
  }
  triggerDrum(drumName);
}

els.enableAudio.addEventListener("click", () => {
  enableAudio();
});

els.enableMidi.addEventListener("click", () => {
  enableMidi();
});

els.midiIn.addEventListener("change", (e) => {
  setMidiInput(e.target.value);
});

els.preset.addEventListener("change", () => {
  releasePianoPointer();
});

for (const pad of document.querySelectorAll("[data-drum]")) {
  pad.addEventListener("mousedown", () => {
    triggerPad(pad.dataset.drum);
  });

  pad.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      triggerPad(pad.dataset.drum);
    },
    { passive: false }
  );

  pad.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    triggerPad(pad.dataset.drum);
  });
}

buildPianoRoll();
wirePianoRollPointer();
setStatus();
