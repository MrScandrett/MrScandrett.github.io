# Schumann: four more pieces from Album for the Young

Retrieved 2026-11-15 from Mutopia. The original LilyPond, published MIDI and RDF
metadata are archived unchanged; `provenance.json` records URLs and SHA-256s.
All four editions are by **Philippe Hézaine**, after Peters, under
[Creative Commons Attribution-ShareAlike 2.5](https://creativecommons.org/licenses/by-sa/2.5/).
These interactive notation adaptations carry the same license. Each player
credits the editor, identifies the adaptation, and links the full printed score.

| Complete piece | Source | Written navigation units | Published MIDI comparison |
| --- | --- | --- | --- |
| Soldier’s March (Soldatenmarsch), Op. 68 No. 2 | [Mutopia 650](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=650) | 32 bars | 312/312 notes |
| The Wild Rider (Wilder Reiter), Op. 68 No. 8 | [Mutopia 655](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=655) | 26 units: pickup, bars 1–24, split bar 8 | 417/417 notes |
| The Happy Farmer (Fröhlicher Landmann), Op. 68 No. 10 | [Mutopia 659](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=659) | Pickup and bars 1–20 | 352/352 notes |
| First Loss (Erster Verlust), Op. 68 No. 16 | [Mutopia 676](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=676) | 34 units: pickup, bars 1–32, split bar 16 | 314/314 notes |

All four compare with **zero missing attacks, zero extra attacks and zero duration
mismatches** against the independently published Mutopia MIDI. The saved
`*-verification.txt` reports include repeat timing. MIDI stops after the last
sounding note, so its endpoint can precede the final written rests.

Both piano hands, all source voices, rests, ties, articulation, pickups and
written repeats are retained. The edition uses 6/8 for The Wild Rider, which is
preserved. A minor and E minor are the tonal labels for Nos. 8 and 16 despite
their signatures matching C major and G major. Pedal, slur shaping and expressive
timing are not reproduced; playback uses fixed practice tempos and the site's
credited samples. The Happy Farmer opens with its melody in the left hand:
use the Source staff control to extract it rather than assuming the first staff
always carries the tune.

## Repeat boundaries and bar numbers

The Wild Rider repeats its opening pickup through the short first part of bar 8;
the rest of bar 8 introduces the left-hand melody. First Loss begins its second
repeat at the final eighth-note pickup in bar 16. The importer splits these bars
at the repeat signs so playback can repeat the exact passages. Each partial unit
keeps its printed bar number (two units labeled 8, or two labeled 16). The study
guides describe the pickups; the full printed scores remain available for comparison.

## Reproduction

Requires LilyPond/convert-ly on PATH and Python with `mido`:

```
PYTHON_MIDI=/path/to/python-with-mido python3 scripts/score-import/sources/schumann-additions/import.py
npm run check:scores
node --test tests/composer-catalog.test.mjs tests/composer-arrangement.test.mjs
COMPOSER_TEST_FILTER=schumann node scripts/check-composer-studios.mjs
```

The browser audit expects `node serve-local.js` at port 8080. The import script
copies each source to a temporary folder, runs `convert-ly` and the existing
staccatissimo shorthand substitution, then uses the standard event dumper and
converter. It requires an exact published-MIDI comparison before changing the
catalog. Original archives stay intact. `metadata.json` supplies the study
guides and attribution. Only the four named score entries and Schumann workspace
are rewritten; the existing Melodie is retained unchanged.
