# Three additional Rachmaninoff preludes

Retrieved 2026-11-15. The unmodified Mutopia `.ly`, published `.mid` and `.rdf`
files are archived here, with URLs and SHA-256 hashes in `provenance.json`.
All three editions are by **Abel Cheung**, after the Muzyka and Gutheil editions,
and licensed [Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
The interactive notation is an adaptation distributed under the same license.
Attribution, adaptation notice and complete printed-score link appear in each
player's source information.

| Work | Source | Playable scope |
| --- | --- | --- |
| Prelude in F-sharp minor, Op. 23 No. 1 | [Mutopia 1958](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1958) | Complete solo-piano piece, all source voices; 53 navigation units including a sixteenth-note pickup and subdivided unmeasured runs. |
| Prelude in D major, Op. 23 No. 4 | [Mutopia 1993](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1993) | Complete 77-bar solo-piano piece, all source voices. |
| Prelude in E-flat major, Op. 23 No. 6 | [Mutopia 1996](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1996) | Complete 43-bar solo-piano piece, all source voices. |

These remain advanced works, not simplified piano arrangements. Original
notation retains pitches, durations, tuplets, voices, grace notes and ties.
The shared player provides the other instrument arrangements. Pedal, slur
shaping, expressive timing and source MIDI tempo changes are not reproduced.
No performance recording is copied; the site uses its credited instrument samples.

## Reproduction

With LilyPond/convert-ly on PATH and a Python environment with `mido`:

```
PYTHON_MIDI=/path/to/python-with-mido python3 scripts/score-import/sources/rachmaninoff-additions/import.py
npm run check:scores
node --test tests/composer-catalog.test.mjs tests/composer-arrangement.test.mjs
COMPOSER_TEST_FILTER=rachmaninoff node scripts/check-composer-studios.mjs
```

The browser audit expects the local server on port 8080. `metadata.json` supplies
the study guides and attribution. The script updates only these three library
entries and Rachmaninoff's Op. 23 workspace collection, preserving other scores.

The source is copied into a temporary directory and updated with `convert-ly`.
Compatibility changes affect only that copy:

- Scheme-generated articulation types become symbols for LilyPond 2.26.
- The obsolete `tenutoAlt` glyph uses ordinary tenuto articulation.
- The source's layout block is replaced by an empty layout block, avoiding
  obsolete print-only collision/slur callbacks; musical definitions stay intact.
- The standard importer's old staccatissimo shorthand is updated.
- A local converter adapter writes exact triplet rests in No. 4 when cross-staff
  movement leaves a triplet-sized gap before an ordinary note. It does not round
  durations or modify the shared converter.

No. 1's free runs are kept at their written note values but divided into short
practice units by the existing importer. Player bar numbers therefore differ
from the print after the first free run (practice bars 24–28). The guide and
source information disclose this; use the printed edition for rehearsal numbers.

## Comparison with published MIDI

The saved `*-verification.txt` reports compare converted notation to the
independently published Mutopia MIDI, rather than MIDI generated from our edits.

- **No. 1:** 1,174 non-grace attacks, 1,183 published MIDI events. The nine extra
  MIDI events are short grace-note events. No other missing or extra attacks;
  zero duration differences.
- **No. 4:** 1,335 non-grace attacks, 1,337 MIDI events. The MIDI re-articulates
  D4 at beat 91 (bar 31), while the source's overlapping D voices include a
  sustained tie. The other differing attack is the grace A5 near the end of
  bar 62 (beat 185.760). No extra attacks. Three duration comparisons differ
  in overlapping/tied voices.
- **No. 6:** 1,251 non-grace attacks, 1,252 MIDI events. At beat 29.5 (bar 8),
  MIDI re-articulates C6 while the source holds that chord tone through its
  changing chord voicing. No extra attacks. Two duration comparisons differ
  for held notes (C6 and E-flat4).

The verification script checks the expected missing counts and the exact
non-grace difference locations in Nos. 4 and 6. It rejects other missing/extra
counts rather than claiming a perfect match. The comparator keys events only
by pitch and onset, so simultaneous same-pitch voices do not have a unique
one-to-one duration match. These are checks of notation and timing coverage,
not certification of identical expressive performances.
