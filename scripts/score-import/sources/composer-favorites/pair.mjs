// Pair each missing MIDI note with an extra note of the same pitch nearby, to classify differences.
import { readFileSync } from 'node:fs';
const [REPO, scoreFile, midiFile, tolArg] = process.argv.slice(2);
await import(REPO + '/assets/js/music-notation.js'); await import(REPO + '/assets/js/score-engine.js');
const E = globalThis.ScoreEngine; const model = E.prepare(JSON.parse(readFileSync(scoreFile,'utf8'))); E.analyse(model);
const midi = JSON.parse(readFileSync(midiFile,'utf8'));
const midiEnd = Math.max(...midi.map(n=>n.start+n.dur));
const unfolded = Math.abs(midiEnd - model.perfTotal) <= Math.abs(midiEnd - model.total);
const asWritten = { ...model, order: model.barStart.map((_, i) => i), perfStart: model.barStart, perfTotal: model.total };
const ours = E.playList(unfolded ? model : asWritten).filter(n=>!n.grace);
const tol = +(tolArg||0.26); const q=x=>Math.round(x*96);
const used=new Set(); let exact=0, shifted=[], unmatched=[];
const pool=[...midi.keys()];
for (const n of ours) {
  let best=-1,bd=1e9;
  for (const i of pool) { if (used.has(i)) continue; const m=midi[i]; if (m.midi!==n.midi) continue; const d=Math.abs(m.start-n.start); if (d<bd){bd=d;best=i;} if (d===0) break; }
  if (best>=0 && bd<1e-3) { used.add(best); exact++; }
  else if (best>=0 && bd<=tol) { used.add(best); shifted.push(+(midi[best].start-n.start).toFixed(3)); }
  else unmatched.push(n);
}
const left=midi.filter((_,i)=>!used.has(i));
console.log(`exact ${exact}, within ±${tol} beat ${shifted.length} (offsets ${[...new Set(shifted)].slice(0,8).join(' ')}), ours unmatched ${unmatched.length}, midi unmatched ${left.length}`);
for (const n of unmatched.slice(0,10)) console.log('  ours only', n.start.toFixed(3), n.midi);
for (const n of left.slice(0,+(process.env.SHOW||10))) console.log('  midi only', n.start.toFixed(3), n.midi, n.dur.toFixed(2));
{
  const k = (n) => Math.round(n.start * 96) + ':' + n.midi;
  const cnt = new Map(); ours.forEach((n) => cnt.set(k(n), (cnt.get(k(n)) || 0) + 1));
  const ou = unmatched.filter((n) => cnt.get(k(n)) > 1).length;
  const near = (n, list, w) => list.some((m) => m !== n && m.midi === n.midi && Math.abs(m.start - n.start) <= w);
  const lm = left.filter((m) => near(m, midi, 0.001)).length;
  const ln = left.filter((m) => !near(m, midi, 0.001) && near(m, ours, 1.0)).length;
  console.log(`classify: ours-only that are our own unisons ${ou}/${unmatched.length}; midi-only that are MIDI unisons ${lm}, within 1 beat of one of ours ${ln}, other ${left.length - lm - ln}`);
}
