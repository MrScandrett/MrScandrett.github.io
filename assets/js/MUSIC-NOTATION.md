# Shared music notation

Load `assets/css/music-notation.css` and `assets/js/music-notation.js` before a lesson's engine. The synchronous, dependency-free `window.MusicNotation` API supplies Bravura SVG outlines, pitch spelling, clef reference positions, ledger positions, and note durations.

- Staff steps count **letters**, not semitones; bottom line is step 0, middle line step 4, top line step 8.
- `clef(name, x, bottomY, halfSpace)` anchors treble to G4, bass to F3, and alto to C4. Soprano uses a C clef on the bottom line.
- `accidental(value, x, pitchY, staffSpace)` accepts -2 through 2 or the corresponding glyph. Zero draws a natural; omit the call for an unmarked natural.
- `parsePitch('B♯3')` retains written spelling and computes MIDI 60. `writtenOctave` handles enharmonic octave boundaries.
- `spellPattern(root, semitones, letterOffsets)` requires a diatonic formula, preserving E♯/C♭ and double accidentals rather than respelling every black key as a sharp.
- `note(x, y, staffSpace, quarterBeats, dotted, stemUp)` draws whole, half, quarter, eighth, or sixteenth notes. Dotted durations include the dot in the beat count: 1.5 means a dotted quarter. Stems point down on the middle line for isolated notes.
- The trainer tests pitch without a meter: sequential notes are quarters; simultaneous stacks are whole-note pitch diagrams. Piano practice sequences explicitly show accidentals and cancellations without implying complete measures. Drum notation retains its percussion heads, voice directions, beat grouping, and beams.

Bravura outlines are pinned to the upstream revision named in `music-notation.js`; their SIL OFL license is in `assets/fonts/BRAVURA-LICENSE.txt`. Rendering uses SVG paths, so it does not depend on remote fonts or installed music fonts. Do not replace paths with text glyphs positioned by guessed font baselines.

Reference: [Open Music Theory: notation, clefs, and ledger lines](https://viva.pressbooks.pub/openmusictheory/chapter/notation-of-notes-clefs-and-ledger-lines/), [Bravura](https://github.com/steinbergmedia/bravura).

Run `node scripts/check-music-notation.cjs`, then exercise the affected lessons in a browser. Keep instrument-specific scheduling and input handlers in the lesson adapters.
