// Compares what the score engine would play with LilyPond's own MIDI of the same source.
// node scripts/score-import/verify-midi.mjs REPO score.json midi.json [--grace-tol 0.26] [--offset beats]
import { readFileSync } from 'node:fs';
const [REPO, scoreFile, midiFile, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1]]]) : a), []));
globalThis.window = undefined;
await import(REPO + '/assets/js/music-notation.js');
await import(REPO + '/assets/js/score-engine.js');
const E = globalThis.ScoreEngine;
const score = JSON.parse(readFileSync(scoreFile, 'utf8'));
const model = E.prepare(score); E.analyse(model);
let midi = JSON.parse(readFileSync(midiFile, 'utf8'));
// Mutopia MIDI is sometimes unfolded (repeats played) and sometimes not: compare like with like.
const midiEnd0 = Math.max(...midi.map((n) => n.start + n.dur));
const unfolded = Math.abs(midiEnd0 - model.perfTotal) <= Math.abs(midiEnd0 - model.total);
const asWritten = { ...model, order: model.barStart.map((_, i) => i), perfStart: model.barStart, perfTotal: model.total };
const ours = E.playList(unfolded ? model : asWritten).filter((n) => !n.grace);
if (!unfolded) console.log('(MIDI follows the written order, not the repeats)');
const offset = +(opt.offset || 0);
midi = midi.map((n) => ({ ...n, start: n.start - offset }));
const q = (x) => Math.round(x * 96);
// LilyPond grace notes steal time: drop very short MIDI notes that have no partner in our list.
const key = (n) => q(n.start) + ':' + n.midi;
const ourKeys = new Map(); ours.forEach((n) => ourKeys.set(key(n), (ourKeys.get(key(n)) || 0) + 1));
const midiKeys = new Map(); midi.forEach((n) => midiKeys.set(key(n), (midiKeys.get(key(n)) || 0) + 1));
const missing = [], extra = [], durDiff = [];
for (const [k, c] of midiKeys) { const o = ourKeys.get(k) || 0; if (o < c) missing.push(k + (c - o > 1 ? ' x' + (c - o) : '')); }
for (const [k, c] of ourKeys) { const m = midiKeys.get(k) || 0; if (m < c) extra.push(k + (c - m > 1 ? ' x' + (c - m) : '')); }
const midiByKey = new Map(midi.map((n) => [key(n), n]));
ours.forEach((n) => { const m = midiByKey.get(key(n)); if (m && Math.abs(m.dur - n.dur) > 0.3 && Math.abs(m.dur - n.dur) / n.dur > 0.35) durDiff.push(key(n) + ' ours ' + n.dur.toFixed(2) + ' midi ' + m.dur.toFixed(2)); });
const shortMissing = missing.filter((k) => { const n = midiByKey.get(k.split(' ')[0]); return n && n.dur < 0.2; });
const beatToBar = (beat) => { let pos = 0; model.perfStart.forEach((s, i) => { if (beat * 96 >= Math.round(s * 96)) pos = i; }); return model.order[pos] + (model.score.startMeasure || 1) - (model.pickup ? 1 : 0); };
const fmt = (list) => list.slice(0, 25).map((k) => { const [b, m] = k.split(':'); return 'bar ' + beatToBar(+b / 96) + ' @' + (+b / 96).toFixed(3) + ' midi ' + m; }).join('\n   ');
console.log(`${score.title || scoreFile}: ours ${ours.length} notes, MIDI ${midi.length}; written ${model.total} beats, performed ${model.perfTotal}, MIDI ends ${Math.max(...midi.map((n) => n.start + n.dur)).toFixed(2)}`);
console.log(`missing from ours: ${missing.length} (${shortMissing.length} are very short MIDI notes, likely grace/ornament)`);
if (missing.length) console.log('   ' + fmt(missing));
console.log(`extra in ours: ${extra.length}`);
if (extra.length) console.log('   ' + fmt(extra));
console.log(`duration mismatches: ${durDiff.length}`);
if (durDiff.length) console.log('   ' + durDiff.slice(0, 15).join('\n   '));
process.exit(missing.length - shortMissing.length + extra.length ? 1 : 0);
