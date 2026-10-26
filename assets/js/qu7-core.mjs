// Pure logic for the Allen & Heath Qu-7 lesson. No DOM, so tests can run it.
//
// Teaching model, not a console emulator. Gain staging follows the Qu-7 spec
// sheet's own definition of input sensitivity: gain runs 0 to +60 dB and the
// input that reaches nominal level is -60 dBu at full gain, 0 dBu at none, so
// "nominal at the meter" happens when inputDbu + gain = 0. Nominal sits at
// -18 dBFS (the usual digital alignment), which leaves 18 dB of headroom.

export const GAIN_MIN = 0;
export const GAIN_MAX = 60;
export const NOMINAL_DBFS = -18;

/** Peak level at the converter, in dBFS, for a source peak in dBu. */
export function peakDbfs(inputDbu, gainDb) {
  return inputDbu + gainDb + NOMINAL_DBFS;
}

/** Name the zone a peak falls in. */
export function zone(dbfs) {
  if (dbfs >= -0.5) return 'clip';
  if (dbfs > -6) return 'hot';
  if (dbfs >= -18) return 'good';
  if (dbfs >= -30) return 'low';
  return 'quiet';
}

/** Gain that puts a source's peaks at `targetDbfs` (default -12), clamped to the preamp's range. */
export function suggestGain(inputDbu, targetDbfs = -12) {
  const g = Math.round(targetDbfs - NOMINAL_DBFS - inputDbu);
  return Math.max(GAIN_MIN, Math.min(GAIN_MAX, g));
}

/** Typical peak levels at a preamp, in dBu. Round teaching numbers, not measurements. */
export const SOURCES = [
  { id: 'vocal',  label: 'Vocal, handheld dynamic mic', dbu: -48, phantom: 'never-needed' },
  { id: 'kick',   label: 'Kick drum mic, close',        dbu: -30, phantom: 'never-needed' },
  { id: 'guitar', label: 'Guitar amp, dynamic mic',     dbu: -38, phantom: 'never-needed' },
  { id: 'piano',  label: 'Condenser mic on a piano',    dbu: -42, phantom: 'required' },
  { id: 'lav',    label: 'Wireless lav receiver output', dbu: -28, phantom: 'never-needed' },
  { id: 'keys',   label: 'Keyboard through a DI box',   dbu: -10, phantom: 'avoid' },
  { id: 'laptop', label: 'Laptop playback, line level', dbu: -8,  phantom: 'avoid' },
];

/**
 * What 48 V does to a source. `required` condensers need it; `never-needed` dynamic
 * mics ignore it (balanced, so safe, but off is still the right habit); `avoid` line
 * sources and some ribbons can be damaged or pop loudly.
 */
export function phantomVerdict(source, on, wasMuted) {
  const kind = typeof source === 'string' ? source : source.phantom;
  if (kind === 'required') {
    return on
      ? { ok: true, text: 'Powered: the condenser can work. Check the channel is muted before you press 48V, then bring the fader up.' }
      : { ok: false, text: 'Silent: a condenser has no battery and no 48V, so nothing reaches the preamp.' };
  }
  if (kind === 'avoid') {
    return on
      ? { ok: false, text: 'Risky: line-level and unbalanced gear does not want 48V. At best a loud pop, at worst a damaged output stage. Switch it off.' }
      : { ok: true, text: 'Correct: this source brings its own signal level. Leave 48V off.' };
  }
  return on
    ? { ok: true, text: 'Harmless here (a balanced dynamic mic ignores 48V), but it is not needed. Make "off unless required" the habit; ribbon mics are the exception that can be hurt.' }
    : { ok: true, text: 'Correct: dynamic mics need no phantom power.' };
}

/** Whether pressing 48V while the channel is live is a mistake worth warning about. */
export function phantomPop(on, channelMuted) {
  return on && !channelMuted;
}

/** Fader position (0 to 1) to dB. 0.75 is unity (0 dB), 1 is +10 dB, 0 is off. */
export function faderDb(pos) {
  if (pos <= 0) return -Infinity;
  if (pos >= 1) return 10;
  if (pos >= 0.75) return ((pos - 0.75) / 0.25) * 10;
  if (pos >= 0.5) return -((0.75 - pos) / 0.25) * 10;
  if (pos >= 0.25) return -10 - ((0.5 - pos) / 0.25) * 20;
  return -30 - ((0.25 - pos) / 0.25) * 30;
}

/** Inverse of faderDb for dB between -60 and +10. */
export function dbToFader(db) {
  if (db === -Infinity || db <= -60) return 0;
  if (db >= 10) return 1;
  if (db >= 0) return 0.75 + (db / 10) * 0.25;
  if (db >= -10) return 0.75 + (db / 10) * 0.25;
  if (db >= -30) return 0.5 + ((db + 10) / 20) * 0.25;
  return 0.25 + ((db + 30) / 30) * 0.25;
}

/**
 * Level a channel puts into an aux/monitor mix. Pre-fader sends ignore the channel
 * fader (the singer's mix does not change when FOH pulls the vocal down); post-fader
 * sends follow it.
 */
export function sendLevelDb({ faderPos, sendDb, pre }) {
  return pre ? sendDb : sendDb + faderDb(faderPos);
}

/** Apply a DCA (a remote fader for a set of channels) to channel levels, in dB. */
export function applyDca(channels, dca) {
  return channels.map((c) => ({
    ...c,
    effectiveDb: dca.members.includes(c.id)
      ? (dca.muted ? -Infinity : faderDb(c.faderPos) + faderDb(dca.faderPos))
      : (c.muted ? -Infinity : faderDb(c.faderPos)),
  }));
}

/**
 * Recall a scene. Channels in `safes` keep their current values, the way Safes
 * protect a channel from a scene recall. `scope` limits which parameters load.
 */
export function recallScene(current, scene, { safes = [], scope = ['fader', 'mute', 'gain'] } = {}) {
  const out = {};
  for (const id of Object.keys(current)) {
    const cur = current[id];
    const snap = scene[id];
    if (!snap || safes.includes(id)) { out[id] = { ...cur }; continue; }
    const next = { ...cur };
    for (const k of scope) if (k in snap) next[k] = snap[k];
    out[id] = next;
  }
  return out;
}
