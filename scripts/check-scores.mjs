#!/usr/bin/env node
// Validates data/score-library.json and every <figure data-score> embed.
// Each score must parse, every bar must add up to the time signature, and it must
// engrave without errors at phone and desktop widths. Pages that embed a score must
// load the notation, synth and score engines.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = new URL('..', import.meta.url).pathname;
require(join(ROOT, 'assets/js/music-notation.js'));
require(join(ROOT, 'assets/js/score-engine.js'));
const { ScoreEngine } = globalThis;

const errors = [];
const lib = JSON.parse(readFileSync(join(ROOT, 'data/score-library.json'), 'utf8'));
const ids = Object.keys(lib.scores || {});

for (const id of ids) {
  const score = { ...lib.scores[id], id };
  try {
    if (!score.title) throw new Error(`${id}: needs a title`);
    if (!score.source || !score.source.url || !score.source.license) throw new Error(`${id}: needs source.url and source.license`);
    const model = ScoreEngine.prepare(score);
    ScoreEngine.analyse(model);
    const notes = ScoreEngine.playList(model);
    if (!notes.length) throw new Error(`${id}: has no notes to play`);
    for (const width of [320, 700, 1100]) {
      const out = ScoreEngine.engrave(model, width);
      if (!out.svg || out.height <= 0) throw new Error(`${id}: engraved nothing at ${width}px`);
      if (/NaN|undefined/.test(out.svg)) throw new Error(`${id}: engraving at ${width}px produced NaN/undefined coordinates`);
    }
  } catch (err) {
    errors.push(err.message);
  }
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules' || name === 'apps' || name === 'dist') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

// Scores in music lessons are for dissecting in class, so each one must say whether it is the complete
// piece or an excerpt (and of what), link the complete printed score, and carry a measure-by-measure guide
// that covers every bar. Complete pieces of 16 bars or more also name their sections for the song map.
const checkedStandard = new Set();
function lessonStandard(rel, id, raw) {
  if (checkedStandard.has(id)) return;
  checkedStandard.add(id);
  const where = `${rel}: score "${id}"`;
  if (!raw.complete && !(raw.excerpt && (raw.excerpt.label || raw.excerpt.bars) && raw.excerpt.of)) errors.push(`${where} must set "complete": true or "excerpt": { label, of }`);
  if (!raw.source || !raw.source.full) errors.push(`${where} needs source.full: a link to the complete printed score`);
  let model;
  try { model = ScoreEngine.prepare({ ...raw, id }); ScoreEngine.analyse(model); } catch { return; }
  let guide;
  try { guide = ScoreEngine.buildGuide(model); } catch (err) { errors.push(`${where}: ${err.message}`); return; }
  if (!guide.length) { errors.push(`${where} needs a measure-by-measure "guide"`); return; }
  const uncovered = [];
  for (let bi = 0; bi < model.count; bi++) if (!guide.some((g) => bi >= g.from && bi <= g.to)) uncovered.push(ScoreEngine.barNumber(model, bi));
  if (uncovered.length) errors.push(`${where}: the guide does not cover bar(s) ${uncovered.slice(0, 12).join(', ')}${uncovered.length > 12 ? '…' : ''}`);
  if (raw.complete && model.count >= 16 && !(raw.sections && raw.sections.length)) errors.push(`${where} is a complete piece of ${model.count} bars and needs "sections" for the song map`);
  for (const sec of raw.sections || []) if (ScoreEngine.barIndexOf(model, sec.bar) < 0) errors.push(`${where}: section "${sec.label}" starts at bar ${sec.bar}, which is not in the score`);
}

let embeds = 0;
for (const file of walk(ROOT)) {
  const html = readFileSync(file, 'utf8');
  const refs = [...html.matchAll(/<figure[^>]*\bdata-score="([^"]+)"/g)].map((m) => m[1]);
  if (!refs.length) continue;
  const rel = relative(ROOT, file);
  for (const ref of refs) {
    embeds++;
    if (!lib.scores[ref]) errors.push(`${rel}: data-score="${ref}" is not in data/score-library.json`);
    else if (rel.startsWith('lessons/music/')) lessonStandard(rel, ref, lib.scores[ref]);
  }
  for (const script of ['music-notation.js', 'music-synth.js', 'score-engine.js']) {
    if (!html.includes(script)) errors.push(`${rel}: embeds a score but does not load ${script}`);
  }
}

if (errors.length) {
  console.error(`Scores: ${errors.length} problem(s)\n  ` + errors.join('\n  '));
  process.exit(1);
}
console.log(`Scores: ${ids.length} scores parse, add up and engrave; ${embeds} embeds point at real scores.`);
