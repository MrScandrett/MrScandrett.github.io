import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  QUALITIES, ROOTS, VOICING_TYPES, spellChord, buildVoicing, voicingFromInversion, allVoicings, shiftVoicing,
  nearestVoicing, smoothProgression, jumpProgression, totalMotion, progressionChords, PROGRESSIONS,
  guitarShape, GUITAR_SETS, OPEN_STRINGS, checkAttempt
} from '../assets/js/lessons/drop-voicings-core.mjs';

const names = (v) => v.notes.map((n) => n.name).join(' ');
const pcs = (v) => v.notes.map((n) => ((n.midi % 12) + 12) % 12);

test('chords are spelled with letters a third apart and no double accidentals', () => {
  assert.equal(spellChord(0, 'maj7').tones.map((t) => t.name).join(' '), 'C E G B');
  assert.equal(spellChord(10, 'dom7').tones.map((t) => t.name).join(' '), 'B♭ D F A♭');
  assert.equal(spellChord(6, 'm7b5').tones.map((t) => t.name).join(' '), 'F♯ A C E');
  assert.equal(spellChord(1, 'maj7').symbol, 'D♭maj7');
  // C♯ beats D♭ when it needs fewer accidentals
  assert.equal(spellChord(1, 'm7b5').tones.map((t) => t.name).join(' '), 'C♯ E G B');
  assert.equal(spellChord(8, 'm7').symbol, 'G♯m7');
  for (const r of ROOTS) for (const q of Object.keys(QUALITIES)) {
    const s = spellChord(r.pc, q);
    for (const t of s.tones) assert.ok(Math.abs(t.acc) <= 1, `${s.symbol} has a double accidental on ${t.name}`);
    assert.equal(new Set(s.tones.map((t) => t.letter)).size, 4, `${s.symbol} repeats a letter`);
  }
});

test('Cmaj7: close, drop 2, drop 3 and drop 2&4 match the textbook note orders', () => {
  const order = (type, bass) => names(buildVoicing({ rootPc: 0, quality: 'maj7', type, bass }));
  assert.equal(order('close', 0), 'C E G B');
  assert.equal(order('drop2', 2), 'G C E B');   // 5th on the bottom: the drop 2 of root-position close
  assert.equal(order('drop3', 1), 'E C G B');   // 3rd on the bottom
  assert.equal(order('drop24', 0), 'C G E B');
  assert.equal(order('drop2', 0), 'C G B E');   // root on the bottom comes from the 2nd-inversion close chord
  assert.equal(order('drop3', 0), 'C B E G');   // R-7-3-5, the 8-x-9-9-8-x grip on strings 6-4-3-2
  const g3 = guitarShape(buildVoicing({ rootPc: 0, quality: 'maj7', type: 'drop3', bass: 0 }), [6, 4, 3, 2]);
  assert.equal(g3.text, '8 x 9 9 8 x');
});

test('drop 2 and drop 3 never change the top note; the dropped voice lands an octave down', () => {
  for (const r of ROOTS) for (const q of Object.keys(QUALITIES)) for (const type of ['drop2', 'drop3']) {
    for (const v of allVoicings(r.pc, q, type)) {
      const closeTop = Math.max(...v.source.map((n) => n.midi));
      assert.equal(v.notes[3].midi, closeTop, `${v.symbol} ${type}: top note moved`);
      const dropped = v.notes.filter((n) => n.dropped);
      assert.equal(dropped.length, 1);
      assert.equal(dropped[0].from - dropped[0].midi, 12);
    }
  }
});

test('the same close chord gives four different voicings (Cmaj7, root position)', () => {
  const from = (type) => names(voicingFromInversion({ rootPc: 0, quality: 'maj7', type, inversion: 0 }));
  assert.deepEqual(['close', 'drop2', 'drop3', 'drop24'].map(from), ['C E G B', 'G C E B', 'E C G B', 'C G E B']);
});

test('every voicing has four distinct chord tones, sorted, lowest note in range', () => {
  for (const r of ROOTS) for (const q of Object.keys(QUALITIES)) for (const type of Object.keys(VOICING_TYPES)) {
    const vs = allVoicings(r.pc, q, type);
    assert.deepEqual(vs.map((v) => v.notes[0].degree), [0, 1, 2, 3], 'one voicing per bass note');
    for (const v of vs) {
      const m = v.notes.map((n) => n.midi);
      assert.deepEqual(m, [...m].sort((a, b) => a - b));
      assert.ok(m[0] >= 48 && m[0] < 60, `${v.symbol} ${type} bass ${m[0]}`);
      assert.ok(m[3] <= 84, `${v.symbol} ${type} tops out at ${m[3]}`);
      assert.equal(new Set(pcs(v)).size, 4);
      assert.deepEqual([...pcs(v)].sort((a, b) => a - b), q === 'x' ? [] : [...new Set(QUALITIES[q].steps.map((s) => (r.pc + s) % 12))].sort((a, b) => a - b));
    }
  }
});

test('close position fits in one octave; raising the dropped notes rebuilds it', () => {
  for (const q of Object.keys(QUALITIES)) {
    for (const v of allVoicings(0, q, 'close')) assert.ok(v.span < 12, `${v.symbol} close span ${v.span}`);
    for (const type of ['drop2', 'drop3', 'drop24']) for (const v of allVoicings(0, q, type)) {
      const raised = v.notes.map((n) => (n.dropped ? n.midi + 12 : n.midi)).sort((a, b) => a - b);
      assert.ok(raised[3] - raised[0] < 12, `${v.symbol} ${type} does not collapse to close position`);
      assert.deepEqual(raised, v.source.map((n) => n.midi));
    }
  }
});

test('written octave matches the spelled name (B♯, C♭ cases included)', () => {
  const v = buildVoicing({ rootPc: 1, quality: 'maj7', type: 'close', bass: 0 }); // D♭ F A♭ C
  for (const n of v.notes) assert.ok(Number.isInteger(n.octave), `${n.name} octave ${n.octave}`);
  const c = buildVoicing({ rootPc: 4, quality: 'dom7', type: 'close', bass: 0 }); // E G♯ B D
  assert.equal(c.notes.map((n) => n.name + n.octave).join(' '), 'E3 G♯3 B3 D4');
  assert.equal(shiftVoicing(c, 1).notes[0].octave, 4);
});

test('Cmaj7 drop 2 on strings 4-3-2-1 is the classic x x 5 5 5 7', () => {
  const v = buildVoicing({ rootPc: 0, quality: 'maj7', type: 'drop2', bass: 2 });
  const g = guitarShape(v, [4, 3, 2, 1]);
  assert.equal(g.text, 'x x 5 5 5 7');
});

test('every guitar fingering sounds exactly the voicing, with a playable stretch', () => {
  let found = 0;
  for (const type of ['drop2', 'drop3']) for (const r of ROOTS) for (const q of Object.keys(QUALITIES)) {
    for (const bass of [0, 1, 2, 3]) {
      const v = buildVoicing({ rootPc: r.pc, quality: q, type, bass });
      let any = false;
      for (const set of GUITAR_SETS[type]) {
        const g = guitarShape(v, set);
        if (!g) continue;
        any = true; found++;
        g.frets.forEach((f, j) => {
          assert.equal((OPEN_STRINGS[set[j]] + f) % 12, v.notes[j].midi % 12, `${v.symbol} ${type} string ${set[j]}`);
        });
        assert.deepEqual(g.midi.slice(1).map((m, i) => m - g.midi[i]), v.gaps);
        assert.ok(g.hi - g.lo <= 4);
      }
      assert.ok(any, `${v.symbol} ${type} bass ${bass} has no fingering on any string set`);
    }
  }
  assert.ok(found > 300);
});

test('ii–V–I in C: smooth drop 2 voicings move each voice by 2 semitones at most', () => {
  const chords = progressionChords('ii_V_I', 0);
  const smooth = smoothProgression(chords, 'drop2');
  for (const v of smooth.slice(1)) assert.ok(v.motion.every((m) => Math.abs(m) <= 2), `${v.symbol}: ${v.motion}`);
  // guide tones: the 7th of each chord falls a half step into the 3rd of the next
  const seventh = (v) => v.notes.find((n) => n.degree === 3).midi;
  const third = (v) => v.notes.find((n) => n.degree === 1).midi;
  assert.equal(seventh(smooth[0]) - third(smooth[1]), 1);
  assert.equal(seventh(smooth[1]) - third(smooth[2]), 1);
});

test('smooth voice leading beats keeping the root on the bottom, for every preset and type', () => {
  for (const p of Object.values(PROGRESSIONS)) for (const type of Object.keys(VOICING_TYPES)) {
    const chords = progressionChords(p.id, p.key);
    const smooth = totalMotion(smoothProgression(chords, type));
    const jump = totalMotion(jumpProgression(chords, type));
    assert.ok(smooth < jump, `${p.id} ${type}: smooth ${smooth} vs jump ${jump}`);
  }
  const v = nearestVoicing(null, 0, 'maj7', 'drop2');
  assert.ok(v.notes[0].midi >= 43 && v.notes[3].midi <= 81);
});

test('the answer checker accepts any octave but not a wrong bass or spacing', () => {
  const target = buildVoicing({ rootPc: 2, quality: 'm7', type: 'drop2', bass: 2 }); // A D F C
  assert.equal(names(target), 'A D F C');
  const m = target.notes.map((n) => n.midi);
  assert.equal(checkAttempt(m, target).ok, true);
  assert.equal(checkAttempt(m.map((x) => x + 12), target).ok, true);
  assert.equal(checkAttempt(m.slice(0, 3), target).reason, 'count');
  assert.equal(checkAttempt([m[0], m[1], m[2], m[3] + 1], target).reason, 'notes');
  // D F A C close from the root is the right notes with the wrong bass
  const close = buildVoicing({ rootPc: 2, quality: 'm7', type: 'close', bass: 0 });
  assert.equal(checkAttempt(close.notes.map((n) => n.midi), target).reason, 'bass');
  // same bass, same letters, spread differently
  const wrongSpacing = [m[0], m[1] + 12, m[2], m[3]].sort((a, b) => a - b);
  assert.equal(checkAttempt(wrongSpacing, target).reason, 'spacing');
});

test('lesson page registers its files and every id the script looks up', () => {
  const html = readFileSync(new URL('../lessons/music/theory/drop-voicings.html', import.meta.url), 'utf8');
  for (const rel of ['assets/js/lessons/drop-voicings.mjs', 'assets/css/lessons/drop-voicings.css']) {
    assert.ok(existsSync(new URL('../' + rel, import.meta.url)), rel);
    assert.ok(html.includes(rel.split('/').slice(-1)[0]), `${rel} is linked`);
  }
  const ui = readFileSync(new URL('../assets/js/lessons/drop-voicings.mjs', import.meta.url), 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const wanted = [...ui.matchAll(/\$\('#([A-Za-z][\w-]*)'\)/g)].map((m) => m[1]);
  assert.ok(wanted.length > 10);
  for (const id of wanted) assert.ok(ids.has(id), `script looks up #${id} but the page has no such id`);
});
