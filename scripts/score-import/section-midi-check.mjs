// node section-midi-check.mjs REPO score.json midi.json FIRST LAST
// Compare bars FIRST..LAST (1-based positions in the converted bar list) with the MIDI notes, after
// finding the one time shift that lines the section up best. For long movements whose MIDI adds time
// at fermatas or pauses, so a whole-movement comparison drifts.
import { readFileSync } from 'node:fs';
const [REPO, scoreFile, midiFile, a, b] = process.argv.slice(2);
await import(REPO + '/assets/js/music-notation.js'); await import(REPO + '/assets/js/score-engine.js');
const E = globalThis.ScoreEngine; const model = E.prepare(JSON.parse(readFileSync(scoreFile, 'utf8'))); E.analyse(model);
const asWritten = { ...model, order: model.barStart.map((_, i) => i), perfStart: model.barStart, perfTotal: model.total };
const t0 = model.barStart[+a - 1], t1 = +b < model.barStart.length ? model.barStart[+b] : model.total;
const ours = E.playList(asWritten).filter((n) => !n.grace && n.start >= t0 - 1e-6 && n.start < t1 - 1e-6);
const midi = JSON.parse(readFileSync(midiFile, 'utf8'));
const key = (s, p) => Math.round(s * 48) + ':' + p;
const oset = new Map(); for (const n of ours) oset.set(key(n.start, n.midi), (oset.get(key(n.start, n.midi)) || 0) + 1);
let best = { d: 0, hits: -1 };
for (let d = -80; d <= 120; d += 0.25) {
  let hits = 0;
  for (const m of midi) { const s = m.start - d; if (s < t0 - 0.01 || s >= t1) continue; if (oset.has(key(s, m.midi))) hits++; }
  if (hits > best.hits) best = { d, hits };
}
const win = midi.filter((m) => m.start - best.d >= t0 - 0.01 && m.start - best.d < t1 - 0.01);
const pool = new Map(); for (const m of win) { const k = key(m.start - best.d, m.midi); pool.set(k, (pool.get(k) || 0) + 1); }
let exact = 0; const oursOnly = [];
for (const n of ours) { const k = key(n.start, n.midi); if (pool.get(k)) { pool.set(k, pool.get(k) - 1); exact++; } else oursOnly.push(n); }
const midiOnly = [...pool.values()].reduce((x, y) => x + y, 0);
const firstOnly = oursOnly.slice(0, 5).map((n) => `${(n.start - t0).toFixed(2)}:${n.midi}`).join(' ');
console.log(`bars ${a}-${b}: shift ${best.d} beats; ours ${ours.length}, MIDI ${win.length}; exact ${exact}; ours-only ${oursOnly.length} [${firstOnly}]; MIDI-only ${midiOnly}`);
