/* Canonical theory/engraving cases; no browser or remote fonts required. */
const assert = require('node:assert/strict');
require('../assets/js/music-notation.js');
const M = globalThis.MusicNotation;
assert.equal(M.parsePitch('C4').midi, 60);
assert.equal(M.parsePitch('B♯3').midi, 60);
assert.equal(M.parsePitch('C♭4').midi, 59);
assert.equal(M.parsePitch('F𝄪4').midi, 67);
assert.equal(M.parsePitch('B𝄫3').midi, 57);
assert.equal(M.writtenOctave(60, 'B', 1), 3);
assert.equal(M.writtenOctave(59, 'C', -1), 4);
assert.deepEqual(['treble','bass','alto'].map(c => M.parsePitch('C4').diatonic - M.clefs[c].bottom), [-2,10,4]);
assert.deepEqual(M.ledgerSteps(-3), [-2]);
assert.deepEqual(M.ledgerSteps(-6), [-2,-4,-6]);
assert.deepEqual(M.ledgerSteps(9), []);
assert.deepEqual(M.ledgerSteps(12), [10,12]);
const degrees = [0,1,2,3,4,5,6,7], major = [0,2,4,5,7,9,11,12];
assert.deepEqual(M.spellPattern('C♯4',major,degrees), ['C♯4','D♯4','E♯4','F♯4','G♯4','A♯4','B♯4','C♯5']);
assert.deepEqual(M.spellPattern('F4',[0,2,3,5,7,8,10,12],degrees), ['F4','G4','A♭4','B♭4','C5','D♭5','E♭5','F5']);
assert.deepEqual(M.spellPattern('G♭4',major,degrees), ['G♭4','A♭4','B♭4','C♭5','D♭5','E♭5','F5','G♭5']);
assert.deepEqual(M.spellPattern('C4',[0,3,5,6,7,10],[0,2,3,4,4,6]), ['C4','E♭4','F4','G♭4','G4','B♭4']);
assert.equal(M.duration(4).stem, false);
assert.equal(M.duration(2).head, 'half');
assert.equal(M.duration(1.5,true).head, 'quarter');
assert.equal(M.duration(.75,true).flags, 1);
assert.equal(M.duration(.25).flags, 2);
assert.throws(() => M.duration(3), /Unsupported/);
assert.match(M.clef('bass',10,100,5), /translate\(10 70\)/);
assert.match(M.clef('alto',10,100,5), /translate\(10 80\)/);
assert.equal(M.clefs.treble.sharp.length,7);
assert.deepEqual(M.clefs.bass.flat,[2,5,1,4,0,3,-1]);
for (const root of ['C4','C♯4','D4','E♭4','E4','F4','F♯4','G4','A♭4','A4','B♭4','B4']) {
  const pitches=M.spellPattern(root,major,degrees).map(M.parsePitch);
  assert.deepEqual(pitches.map(p => p.midi-pitches[0].midi), major);
  assert.equal(new Set(pitches.slice(0,7).map(p => p.l)).size,7);
}
console.log('Music notation: canonical clef, ledger, enharmonic, scale, and rhythm checks passed.');
