import {
  peakDbfs, zone, suggestGain, SOURCES, phantomVerdict, phantomPop,
  faderDb, sendLevelDb, applyDca, recallScene,
} from '../qu7-core.mjs';

const Synth = window.AudioLabSynth;
const $ = (id) => document.getElementById(id);
const fmtDb = (d) => (d === -Infinity ? '−∞' : (d > 0 ? '+' : d < 0 ? '−' : '') + Math.abs(d).toFixed(1));
const dbToLin = (db) => (db === -Infinity || db <= -80 ? 0 : Math.pow(10, db / 20));

let actx = null;
function ensureAudio() {
  if (!actx) actx = Synth ? Synth.createContext() : new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

/* ── 2 · Console Surface Tour ── */
const PARTS = {
  'p-screen': ['Touchscreen', 'A 7-inch capacitive screen showing the selected channel’s HPF, EQ, dynamics, routing, scenes, library, and PAFL meters.'],
  'p-soft': ['SoftKeys', 'Eight assignable buttons for one-press mute groups, tap-tempo delay, or scene recalls during a live show.'],
  'p-select': ['Selected-channel controls', 'Press SEL on any strip to bind the dedicated channel knobs (Gain, HPF, EQ, Comp) to that channel.'],
  'p-main': ['Main fader', 'Feeds Main LR out to the room speakers. Keep Main near unity (0 dB) while mixing primarily on the channel faders.'],
  'p-strips': ['Channel strips & layers', 'Motorized faders that jump automatically whenever you switch custom layers, recall a scene, or engage Sends on Faders.'],
};
const info = $('part-info');
document.querySelectorAll('.part').forEach((g) => {
  const pick = () => {
    document.querySelectorAll('.part').forEach((x) => x.setAttribute('aria-pressed', String(x === g)));
    const [t, d] = PARTS[g.id];
    info.innerHTML = '<strong>' + t + ':</strong> ' + d;
  };
  g.addEventListener('click', pick);
  g.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick();
    }
  });
});

/* ── 3 · Channel Signal Chain ── */
const CHAIN = [
  ['Preamp', 'Raises mic signals to line operating level (0 to +60 dB), with per-channel +48V phantom power and polarity invert.'],
  ['Filter & gate', 'High-pass filter clears sub-rumble; noise gate / expander attenuates spill when a mic is idle.'],
  ['Parametric EQ', '4-band fully parametric EQ cuts muddy room resonances first before gently brightening presence.'],
  ['Compressor', 'Controls vocal and bass dynamics cleanly before bus summing.'],
  ['Sends', 'Branches audio pre-fader (to performer wedges/IEMs) or post-fader (to the 6 built-in FX engines).'],
  ['Fader, Mute & Pan', 'Sets channel mix level, mute status, and Main LR stereo panning.'],
];
const chainInfo = $('chain-info');
function pickStage(i) {
  document.querySelectorAll('.stage').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.i) === i)));
  chainInfo.innerHTML = '<strong>' + CHAIN[i][0] + ':</strong> ' + CHAIN[i][1];
}
document.querySelectorAll('.stage').forEach((b) => b.addEventListener('click', () => pickStage(Number(b.dataset.i))));
pickStage(0);

/* ── 4 · Gain Lab + Preamp Web Audio PAFL ── */
const gSrc = $('g-src'), gGain = $('g-gain'), gLoudBtn = $('g-loud'), gAudioBtn = $('g-audio-btn');
let boost = 0, loud = false, gAudioOn = false, gGraph = null;
SOURCES.forEach((s, i) => gSrc.add(new Option(s.label, String(i))));

const ZONE_TEXT = {
  quiet: ['bad', 'Far too quiet (< −30 dBFS). Buried near the noise floor — turn up preamp gain.'],
  low: ['warn', 'Low (−30 to −18 dBFS). Usable, though adding gain gives stronger SNR.'],
  good: ['good', 'Sweet spot (−18 to −6 dBFS). Strong healthy signal with safe headroom for peaks.'],
  hot: ['warn', 'Hot (−6 to −0.5 dBFS). Watch loud moments carefully or trim back 3–4 dB.'],
  clip: ['bad', 'Clipping (≥ −0.5 dBFS)! Converter flat-tops permanently — lower PREAMP GAIN, not the fader.'],
};

function ensureGainAudio() {
  const ctx = ensureAudio();
  if (gGraph || !Synth) return;
  const src = ctx.createBufferSource();
  src.buffer = Synth.createVocalPhraseBuffer(ctx, { seconds: 2.4 });
  src.loop = true;

  const preampGain = ctx.createGain();
  const clip = ctx.createWaveShaper();
  clip.curve = Synth.createHardClipCurve(1024);
  const makeup = ctx.createGain();
  const safety = ctx.createGain();
  safety.gain.value = 0;

  src.connect(preampGain).connect(clip).connect(makeup).connect(safety).connect(ctx.destination);
  src.start();
  gGraph = { preampGain, makeup, safety };
}

function gainRender() {
  const s = SOURCES[Number(gSrc.value)];
  const gain = Number(gGain.value);
  const pk = peakDbfs(s.dbu + boost, gain);
  const z = zone(pk);
  $('g-gain-o').textContent = gain + ' dB';
  const w = Math.max(0, Math.min(100, ((pk + 60) / 60) * 100));
  const bar = $('g-bar');
  bar.style.width = w + '%';
  bar.className = 'meter-bar' + (z === 'good' || z === 'hot' || z === 'clip' ? ' ' + z : '');
  // Preserve '+' sign when clipping above 0 dBFS
  $('g-peak').textContent = fmtDb(Math.round(pk * 10) / 10);
  $('g-head').textContent = pk >= 0 ? 'CLIP (' + '+' + pk.toFixed(1) + ')' : Math.round(-pk) + ' dB';
  $('g-sugg').textContent = suggestGain(s.dbu + boost) + ' dB';
  const v = $('g-verdict');
  v.className = 'qu-verdict ' + ZONE_TEXT[z][0];
  v.textContent = (loud ? '[+6 dB louder singer] ' : '') + ZONE_TEXT[z][1];

  if (gGraph && actx) {
    // 0 dBFS peak maps to linear 1.0 entering the converter WaveShaper
    Synth.smooth(gGraph.preampGain.gain, dbToLin(pk), actx, 0.02);
    Synth.smooth(gGraph.makeup.gain, 0.55, actx, 0.02);
    Synth.smooth(gGraph.safety.gain, gAudioOn ? 0.5 : 0, actx, 0.02);
  }
}

gSrc.addEventListener('change', () => {
  loud = false;
  boost = 0;
  gLoudBtn.setAttribute('aria-pressed', 'false');
  gGain.value = String(Math.max(0, suggestGain(SOURCES[Number(gSrc.value)].dbu) - 14));
  gainRender();
});
gGain.addEventListener('input', gainRender);
$('g-auto').addEventListener('click', () => {
  gGain.value = String(suggestGain(SOURCES[Number(gSrc.value)].dbu + boost));
  gainRender();
});
gLoudBtn.addEventListener('click', () => {
  loud = !loud;
  boost = loud ? 6 : 0;
  gLoudBtn.setAttribute('aria-pressed', String(loud));
  gainRender();
});
if (gAudioBtn) {
  gAudioBtn.addEventListener('click', () => {
    if (!gAudioOn) ensureGainAudio();
    gAudioOn = !gAudioOn;
    gAudioBtn.setAttribute('aria-pressed', String(gAudioOn));
    gAudioBtn.classList.toggle('audio-on', gAudioOn);
    gAudioBtn.textContent = gAudioOn ? '🔇 Stop PAFL' : '🔊 Hear PAFL Preamp';
    gainRender();
  });
}
gSrc.value = '0';
gGain.value = '20';
gainRender();

/* ── 5 · Phantom Power Lab (+ Active DI & Ribbon, All-Channel Pop Guard) ── */
const pSrc = $('p-src'), p48 = $('p-48'), pMute = $('p-mute');
SOURCES.forEach((s, i) => pSrc.add(new Option(s.label, String(i))));
let on48 = false, muted = false;

function phantomRender() {
  const s = SOURCES[Number(pSrc.value)];
  p48.textContent = '48V: ' + (on48 ? 'ON' : 'OFF');
  p48.setAttribute('aria-pressed', String(on48));
  pMute.textContent = 'Channel muted: ' + (muted ? 'YES' : 'NO');
  pMute.setAttribute('aria-pressed', String(muted));
  const r = phantomVerdict(s, on48, muted);
  const v = $('p-verdict');
  let text = r.text;
  let cls = r.ok ? 'good' : 'bad';
  // Switching 48V while unmuted triggers a pop hazard on ANY live channel
  if (phantomPop(on48, muted)) {
    text += ' Also: this channel is unmuted — toggling +48V while live can thump the PA speakers. Mute first!';
    if (cls === 'good') cls = 'warn';
  }
  v.className = 'qu-verdict ' + cls;
  v.textContent = text;
}
pSrc.addEventListener('change', phantomRender);
p48.addEventListener('click', () => { on48 = !on48; phantomRender(); });
pMute.addEventListener('click', () => { muted = !muted; phantomRender(); });
phantomRender();

/* ── 6 · Monitor Mix Lab (Sends on Faders + Web Audio Stem Comparison) ── */
const MCH = [
  { id: 'vocal', name: 'Lead vocal' },
  { id: 'guitar', name: 'Guitar' },
  { id: 'keys', name: 'Keys' },
  { id: 'drums', name: 'Drums' },
];
const M0 = {
  main: { vocal: 0.75, guitar: 0.66, keys: 0.66, drums: 0.7 },
  send: { vocal: 0.75, guitar: 0.4, keys: 0.5, drums: 0.45 },
};
let mState = JSON.parse(JSON.stringify(M0));
let mSof = false, mPre = true, mHearBus = 'mix1', mAudioOn = false, mGraph = null;

function ensureMonAudio() {
  const ctx = ensureAudio();
  if (mGraph || !Synth) return;
  const stems = Synth.createBandStems(ctx, { seconds: 2.4 });
  const drumBuf = Synth.createDrumLoopBuffer(ctx, { seconds: 2.4 });
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.ratio.value = 10;
  const master = ctx.createGain();
  master.gain.value = 0;
  limiter.connect(master).connect(ctx.destination);

  const bufs = { vocal: stems.vocal, guitar: stems.guitar, keys: stems.keys, drums: drumBuf };
  const gains = {};
  MCH.forEach((c) => {
    const src = ctx.createBufferSource();
    src.buffer = bufs[c.id];
    src.loop = true;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(g).connect(limiter);
    src.start();
    gains[c.id] = g;
  });
  mGraph = { gains, master };
}

const mBox = $('m-strips');
MCH.forEach((c) => {
  const d = document.createElement('div');
  d.className = 'qu-strip';
  d.innerHTML = '<h3>' + c.name + '</h3>' +
    '<label for="m-f-' + c.id + '" id="m-fl-' + c.id + '">Main fader</label>' +
    '<input type="range" id="m-f-' + c.id + '" min="0" max="1" step="0.01" />' +
    '<output id="m-fo-' + c.id + '"></output>' +
    '<div>Main <div class="lvl"><i id="m-lm-' + c.id + '"></i></div></div>' +
    '<div style="margin-top:4px">Mix 1 <div class="lvl"><i id="m-lx-' + c.id + '" style="background:#f0b448"></i></div></div>';
  mBox.appendChild(d);
  $('m-f-' + c.id).addEventListener('input', (e) => {
    mState[mSof ? 'send' : 'main'][c.id] = Number(e.target.value);
    monRender();
  });
});

const barPct = (db) => (db === -Infinity ? 0 : Math.max(0, Math.min(100, ((db + 40) / 50) * 100)));

function monRender() {
  $('m-main').setAttribute('aria-pressed', String(!mSof));
  $('m-sof').setAttribute('aria-pressed', String(mSof));
  $('m-pre').setAttribute('aria-pressed', String(mPre));
  $('m-post').setAttribute('aria-pressed', String(!mPre));
  if ($('m-hear-main') && $('m-hear-mix1')) {
    $('m-hear-main').setAttribute('aria-pressed', String(mHearBus === 'main'));
    $('m-hear-mix1').setAttribute('aria-pressed', String(mHearBus === 'mix1'));
  }

  const status = $('desk-status');
  status.classList.toggle('mix', mSof);
  status.firstElementChild.textContent = mSof ? 'MIX 1 · SENDS ON FADERS' : 'MAIN LR · AUDIENCE';

  const lv = {};
  MCH.forEach((c) => {
    const f = $('m-f-' + c.id);
    f.value = String(mState[mSof ? 'send' : 'main'][c.id]);
    f.setAttribute('aria-label', c.name + (mSof ? ' Mix 1 send' : ' Main fader'));
    $('m-fl-' + c.id).textContent = mSof ? 'Mix 1 send' : 'Main fader';
    const mainDb = faderDb(mState.main[c.id]);
    const sendDb = faderDb(mState.send[c.id]);
    const mixDb = sendLevelDb({ faderPos: mState.main[c.id], sendDb, pre: mPre });
    lv[c.id] = { main: mainDb, mix: mixDb };
    $('m-fo-' + c.id).textContent = (mSof ? 'send ' : 'fader ') + fmtDb(mSof ? sendDb : mainDb) + ' dB';
    $('m-lm-' + c.id).style.width = barPct(mainDb) + '%';
    $('m-lx-' + c.id).style.width = barPct(mixDb) + '%';

    if (mGraph && actx) {
      const targetDb = mHearBus === 'main' ? mainDb : mixDb;
      Synth.smooth(mGraph.gains[c.id].gain, targetDb === -Infinity ? 0 : dbToLin(targetDb), actx, 0.02);
    }
  });
  if (mGraph && actx) {
    Synth.smooth(mGraph.master.gain, mAudioOn ? 0.36 : 0, actx, 0.02);
  }

  const v = $('m-verdict');
  const changedMain = MCH.some((c) => Math.abs(mState.main[c.id] - M0.main[c.id]) > 0.001);
  const gap = lv.vocal.mix - lv.guitar.mix;
  if (changedMain && !mPre) {
    v.className = 'qu-verdict warn';
    v.textContent = 'You moved a Main fader while sends were post-fader — the performer’s wedge changed too! Switch to Pre-fader and Reset.';
  } else if (changedMain) {
    v.className = 'qu-verdict bad';
    v.textContent = 'The audience Main mix changed! Reset, then switch FADERS to Mix 1 Sends so Main LR stays untouched.';
  } else if (lv.vocal.mix < -6) {
    v.className = 'qu-verdict warn';
    v.textContent = 'Keep Lead Vocal healthy in Mix 1 (at least −6 dB) while bringing Guitar up — turning Vocal down instead hides the singer.';
  } else if (lv.guitar.mix >= lv.vocal.mix - 3) {
    v.className = 'qu-verdict good';
    v.textContent = 'Solved! Guitar sits within ' + Math.max(0, gap).toFixed(1) + ' dB of Lead Vocal in Mix 1 while the Main LR audience mix stays untouched.';
  } else {
    v.className = 'qu-verdict';
    v.textContent = 'In Mix 1, Guitar is ' + gap.toFixed(1) + ' dB below Vocal. Switch to Faders: Mix 1 Sends and raise Guitar within 3 dB of Vocal.';
  }
}

$('m-main').addEventListener('click', () => { mSof = false; monRender(); });
$('m-sof').addEventListener('click', () => { mSof = true; monRender(); });
$('m-pre').addEventListener('click', () => { mPre = true; monRender(); });
$('m-post').addEventListener('click', () => { mPre = false; monRender(); });
$('m-reset').addEventListener('click', () => {
  mState = JSON.parse(JSON.stringify(M0));
  mSof = false;
  mPre = true;
  monRender();
});
if ($('m-hear-main') && $('m-hear-mix1')) {
  $('m-hear-main').addEventListener('click', () => { mHearBus = 'main'; monRender(); });
  $('m-hear-mix1').addEventListener('click', () => { mHearBus = 'mix1'; monRender(); });
}
if ($('m-audio-btn')) {
  $('m-audio-btn').addEventListener('click', () => {
    if (!mAudioOn) ensureMonAudio();
    mAudioOn = !mAudioOn;
    $('m-audio-btn').setAttribute('aria-pressed', String(mAudioOn));
    $('m-audio-btn').classList.toggle('audio-on', mAudioOn);
    $('m-audio-btn').textContent = mAudioOn ? '🔇 Stop Mix Audio' : '🔊 Hear Selected Bus';
    monRender();
  });
}
monRender();

/* ── 7 · Scenes, Safes & DCAs (with DCA Mute) ── */
const SCH = [
  { id: 'vocal', name: 'Vocal' },
  { id: 'guitar', name: 'Guitar' },
  { id: 'keys', name: 'Keys' },
  { id: 'laptop', name: 'Laptop' },
];
const SCENES = [
  { vocal: { fader: 0.75, mute: false, gain: 30 }, guitar: { fader: 0.6, mute: false, gain: 24 }, keys: { fader: 0.6, mute: false, gain: 4 }, laptop: { fader: 0.55, mute: false, gain: 0 } },
  { vocal: { fader: 0.78, mute: false, gain: 32 }, guitar: { fader: 0.7, mute: false, gain: 24 }, keys: { fader: 0.68, mute: false, gain: 4 }, laptop: { fader: 0.0, mute: true, gain: 0 } },
  { vocal: { fader: 0.7, mute: false, gain: 28 }, guitar: { fader: 0.0, mute: true, gain: 24 }, keys: { fader: 0.0, mute: true, gain: 4 }, laptop: { fader: 0.72, mute: false, gain: 0 } },
];
const SNAME = ['Soundcheck', 'Band set', 'Assembly'];
let cur = JSON.parse(JSON.stringify(SCENES[0]));
const safes = new Set();
const dca = { members: ['guitar', 'keys'], faderPos: 0.75, muted: false };

const sBox = $('s-strips');
SCH.forEach((c) => {
  const d = document.createElement('div');
  d.className = 'qu-strip';
  d.innerHTML = '<h3>' + c.name + '</h3>' +
    '<label for="s-f-' + c.id + '">Fader</label>' +
    '<input type="range" id="s-f-' + c.id + '" min="0" max="1" step="0.01" />' +
    '<output id="s-o-' + c.id + '"></output>' +
    '<div class="lvl"><i id="s-l-' + c.id + '"></i></div>' +
    '<label class="chk"><input type="checkbox" id="s-m-' + c.id + '" /> Mute</label>' +
    '<label class="chk"><input type="checkbox" id="s-s-' + c.id + '" /> Safe</label>';
  sBox.appendChild(d);
  $('s-f-' + c.id).addEventListener('input', (e) => { cur[c.id].fader = Number(e.target.value); sRender(); });
  $('s-m-' + c.id).addEventListener('change', (e) => { cur[c.id].mute = e.target.checked; sRender(); });
  $('s-s-' + c.id).addEventListener('change', (e) => {
    if (e.target.checked) safes.add(c.id);
    else safes.delete(c.id);
  });
});

function sRender(msg) {
  const rows = SCH.map((c) => ({ id: c.id, faderPos: cur[c.id].fader, muted: cur[c.id].mute }));
  const eff = applyDca(rows, dca);
  eff.forEach((r) => {
    $('s-f-' + r.id).value = String(cur[r.id].fader);
    $('s-m-' + r.id).checked = cur[r.id].mute;
    $('s-o-' + r.id).textContent = fmtDb(r.effectiveDb) + ' dB';
    $('s-l-' + r.id).style.width = barPct(r.effectiveDb) + '%';
  });
  $('s-dca-o').textContent = (dca.muted ? 'MUTED · ' : '') + fmtDb(faderDb(dca.faderPos)) + ' dB';
  if (msg) {
    const v = $('s-verdict');
    v.className = 'qu-verdict good';
    v.textContent = msg;
  }
}

document.querySelectorAll('[data-store]').forEach((b) => b.addEventListener('click', () => {
  const i = Number(b.dataset.store);
  SCENES[i] = JSON.parse(JSON.stringify(cur));
  sRender('Stored current channel settings as "' + SNAME[i] + '".');
}));
document.querySelectorAll('[data-recall]').forEach((b) => b.addEventListener('click', () => {
  const i = Number(b.dataset.recall);
  cur = recallScene(cur, SCENES[i], { safes: [...safes] });
  const kept = [...safes].map((id) => SCH.find((c) => c.id === id).name);
  sRender('Recalled "' + SNAME[i] + '". ' + (kept.length ? 'Safe channels held their own positions: ' + kept.join(', ') + '.' : 'No channels were Safe, so all strips loaded from memory.'));
}));
$('s-dca').addEventListener('input', (e) => { dca.faderPos = Number(e.target.value); sRender(); });
if ($('s-dca-mute')) {
  $('s-dca-mute').addEventListener('click', () => {
    dca.muted = !dca.muted;
    $('s-dca-mute').setAttribute('aria-pressed', String(dca.muted));
    $('s-dca-mute').textContent = dca.muted ? 'DCA 1 Muted: YES' : 'Mute DCA 1 Band';
    sRender(dca.muted ? 'DCA 1 Muted — Guitar and Keys silenced without overwriting their Mute buttons.' : 'DCA 1 unmuted.');
  });
}
sRender();

document.querySelectorAll('.qu-strip input[type="range"]').forEach((input) => {
  const well = document.createElement('div');
  well.className = 'fader-well';
  input.before(well);
  well.append(input);
  const scale = document.createElement('div');
  scale.className = 'fader-scale';
  scale.setAttribute('aria-hidden', 'true');
  scale.innerHTML = [['+10', 0], ['0', 25], ['−10', 50], ['−30', 75], ['−∞', 100]]
    .map(([label, top]) => '<span class="' + (top === 25 ? 'unity' : '') + '" style="top:' + top + '%">' + label + '</span>')
    .join('');
  well.append(scale);
  input.setAttribute('aria-label', input.closest('.qu-strip').querySelector('h3').textContent + ' fader');
  input.addEventListener('dblclick', () => {
    input.value = '0.75';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
});

/* ── Check Yourself Quiz (Q8 aligned with active DI / unbalanced adapter) ── */
const QUIZ = [
  { q: 'You are about to enable +48V for an already-plugged condenser mic. What first?', o: ['Nothing — 48V is completely silent.', 'Mute the channel (or pull its fader down) before pressing 48V.', 'Maximize preamp gain.'], a: 1, why: 'Muting first avoids sending a full-volume phantom thump into the room speakers.' },
  { q: 'A vocal converter clips red at +2 dBFS. What is the right fix?', o: ['Pull the channel fader down.', 'Lower the preamp gain trim.', 'Mute and unmute the strip.'], a: 1, why: 'Converter clipping happens right after the preamp, before the fader.' },
  { q: 'Which key sends a single channel to your engineer headphones and meters without putting it in the room?', o: ['PAFL', 'DCA', 'SAFE'], a: 0, why: 'PAFL (Pre/After-Fade Listen) auditions privately in the engineer’s headphones and meters.' },
  { q: 'The singer says her stage monitor gets quieter whenever you pull her Main vocal fader down. Why?', o: ['Her monitor send is set post-fader.', 'The stage box cable is too long.', '+48V is off.'], a: 0, why: 'Monitor mixes must be pre-fader so FOH balance rides don’t shift the band’s wedges.' },
  { q: 'What does a DCA fader do?', o: ['Records multitrack stems to USB-C.', 'Scales multiple assigned channels together while keeping their balance intact.', 'Adds +48V phantom power across a bank.'], a: 1, why: 'DCAs remotely scale a group (like Drums or Horns) without touching individual fader positions.' },
  { q: 'You recall the Assembly scene mid-show, but the host’s podium vocal must stay unchanged. Which button protects it?', o: ['PAFL', 'Recall SAFE on the host vocal channel.', 'USB-A stereo record'], a: 1, why: 'Recall Safe shields critical live mics from scene changes.' },
  { q: 'You want every channel recorded on its own track into a laptop DAW. Which Qu-7 port?', o: ['USB-A front stick', 'USB-C (32×32 audio interface)', 'Analog TRS Alt Out'], a: 1, why: 'USB-C carries full 32×32 multitrack I/O straight to and from your computer.' },
  { q: 'A keyboard enters through an ACTIVE DI box over XLR and has zero signal, while a laptop feeds an unbalanced 3.5mm-to-XLR adapter. Where does +48V belong?', o: ['Both active DI and unbalanced adapter.', 'Active DI only (needs +48V to run its electronics); leave +48V OFF on the unbalanced 3.5mm-to-XLR adapter.', 'Neither needs phantom power.'], a: 1, why: 'Active DI boxes require +48V to operate cleanly, whereas unbalanced consumer headphone outputs can suffer clicks or hardware damage from +48V.' },
];

(function () {
  let i = 0, score = 0, answered = false, done = false;
  const q = $('quiz-q'), opts = $('quiz-opts'), why = $('quiz-why'), next = $('quiz-next'), sc = $('quiz-score');
  function show() {
    answered = false;
    why.textContent = '';
    next.hidden = true;
    const item = QUIZ[i];
    q.textContent = (i + 1) + ' / ' + QUIZ.length + ' · ' + item.q;
    opts.innerHTML = '';
    item.o.forEach((t, k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'quiz-opt';
      b.textContent = t;
      b.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const ok = k === item.a;
        if (ok) score++;
        b.classList.add(ok ? 'right' : 'wrong');
        if (!ok) opts.children[item.a].classList.add('right');
        Array.from(opts.children).forEach((c) => { c.disabled = true; });
        why.textContent = (ok ? '✔ ' : '✘ ') + item.why;
        sc.textContent = 'Score: ' + score + ' / ' + (i + 1);
        next.textContent = i === QUIZ.length - 1 ? 'See result' : 'Next question →';
        next.hidden = false;
      });
      opts.appendChild(b);
    });
  }
  next.addEventListener('click', () => {
    if (done) {
      i = 0;
      score = 0;
      done = false;
      sc.textContent = '';
      show();
      return;
    }
    if (i < QUIZ.length - 1) {
      i++;
      show();
      return;
    }
    done = true;
    q.textContent = 'Finished: ' + score + ' / ' + QUIZ.length + (score === QUIZ.length ? ' — Ready for tech week!' : ' — Review the labs above and retry.');
    opts.innerHTML = '';
    why.textContent = '';
    next.textContent = 'Try again';
  });
  show();
})();
