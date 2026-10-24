// node scripts/score-import/bars.mjs REPO score.json [from] [to] : one line per bar per staff, with printed bar numbers and marks
import { readFileSync } from 'node:fs';
const [REPO, file, from = '-1', to = '9999'] = process.argv.slice(2);
await import(REPO + '/assets/js/music-notation.js'); await import(REPO + '/assets/js/score-engine.js');
const E = globalThis.ScoreEngine, sc = JSON.parse(readFileSync(file, 'utf8'));
const m = E.prepare(sc); E.analyse(m);
const name = (p) => globalThis.MusicNotation.pitchName(p) + p.o;
console.log(`${sc.title}: ${m.count} bars, key ${sc.key}, ${sc.time}, pickup ${sc.pickup || 0}, performed ${m.perfTotal} beats, order length ${m.order.length}`);
for (let bi = 0; bi < m.count; bi++) {
  const no = E.barNumber(m, bi); if (no < +from || no > +to) continue;
  const mt = m.barMeta[bi];
  const marks = [mt.repStart && '|:', mt.repEnd && ':|', mt.volta && 'ending ' + mt.volta, mt.fine && 'Fine', mt.dc && 'D.C.', mt.keyChange && 'key→' + mt.key, mt.timeChange && 'time→' + mt.ts.num + '/' + mt.ts.den].filter(Boolean).join(' ');
  const parts = m.staves.map((st) => st.bars[bi].events.filter((e) => !e.hidden).map((e) => e.kind === 'rest' ? 'r' : (e.pitches.map(name).join('+') + (e.tie ? '~' : ''))).join(' '));
  console.log(String(no).padStart(3) + (marks ? ' [' + marks + ']' : '') + ' :: ' + parts.join('  ||  '));
}
