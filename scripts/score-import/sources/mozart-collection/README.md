# Mozart collection additions

Retrieved 2026-11-14 from [Mutopia's Mozart source archive](https://github.com/MutopiaProject/MutopiaProject/tree/master/ftp/MozartWA).
The thirteen original LilyPond editions are preserved unchanged; every archived file was checked against
its upstream Git blob. `imports.json` records directories and entry points.

These additions bring the workspace to **23 playable selections** while retaining the original ten:

- K. 331: theme and six variations, individually selectable as complete-unit studies from movement I;
  plus the complete minuet and trio, including the Menuetto D.C. return. The existing Rondo alla turca
  remains unchanged. The seven first-movement units are explicitly labeled as selections from a larger movement.
- K. 457: all three complete sonata movements.
- K. 397: the traditional performing version of the D-minor Fantasia.
- K. 309: the complete first movement.

## Editions and credits

All thirteen selected Mutopia editions are **public domain**, as stated in their original headers.
The typesetter, source edition, license and complete printed PDF are displayed in each score player.
Classroom guides and practice tempos are ClassroomOS teaching annotations. All PDF links were checked
for a valid PDF signature.

| Selection | Typesetter and edition | Mutopia ID |
| --- | --- | --- |
| Piano Sonata No. 11, K. 331 — I. Theme: Andante grazioso | Mutopia Project · Stelios Samelis, after Breitkopf & Härtel, Leipzig | [614](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=614) |
| Piano Sonata No. 11, K. 331 — I. Variation 1 | Mutopia Project · Stelios Samelis, after Breitkopf & Härtel, Leipzig | [615](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=615) |
| Piano Sonata No. 11, K. 331 — I. Variation 2 | Mutopia Project · Stelios Samelis, after Breitkopf & Härtel, Leipzig | [616](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=616) |
| Piano Sonata No. 11, K. 331 — I. Variation 3 | Mutopia Project · Stelios Samelis, after Breitkopf & Härtel, Leipzig | [617](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=617) |
| Piano Sonata No. 11, K. 331 — I. Variation 4 | Mutopia Project · Stelios Samelis, after Breitkopf & Hartel, Leipzig | [618](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=618) |
| Piano Sonata No. 11, K. 331 — I. Variation 5: Adagio | Mutopia Project · Stelios Samelis, after Breitkopf & Härtel, Leipzig | [619](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=619) |
| Piano Sonata No. 11, K. 331 — I. Variation 6: Allegro | Mutopia Project · Stelios Samelis, after Breitkopf & Härtel, Leipzig | [620](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=620) |
| Piano Sonata No. 11, K. 331 — II. Menuetto and Trio | Mutopia Project · Stelios Samelis, after Breitkopf & Härtel, Leipzig | [613](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=613) |
| Piano Sonata No. 14 in C minor, K. 457 — I. Molto allegro | Mutopia Project · Will Oram, after Schirmer, 1918, and Breitkopf & Härtel, 1878 | [356](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=356) |
| Piano Sonata No. 14 in C minor, K. 457 — II. Adagio | Mutopia Project · Will Oram, after Schirmer, 1918, and Breitkopf & Härtel, 1878 | [357](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=357) |
| Piano Sonata No. 14 in C minor, K. 457 — III. Allegro assai | Mutopia Project · Will Oram, after Schirmer, 1918, and Breitkopf & Härtel, 1878 | [358](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=358) |
| Fantasia in D minor, K. 397 — traditional performing version | Mutopia Project · Andrés Necochea, after 'Mozart Album: Zongorára' Budapest: Zeneműkiadó Vállalat, 1951 · traditional added ending, probably by August Eberhard Müller | [2034](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2034) |
| Piano Sonata No. 7 in C major, K. 309 — I. Allegro con spirito | Mutopia Project · Stelios Samelis, after Breitkopf & Hartel (1877-83) | [1379](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1379) |

### Fantasia completion

Mozart left K. 397 unfinished. The traditional final ten bars are an added completion, probably by
**August Eberhard Müller**. This uncertainty is visible in the selection title, subtitle, source credit
and closing guide. The [Henle preface](https://www.henle.de/media/e6/44/d9/1740992934/0023.pdf)
and [Neue Mozart-Ausgabe preface](https://dme.mozarteum.at/DME/objs/pdf/nma_202_-40_-3_eng.pdf)
discuss the fragment and probable completion. This is the complete traditional edition, not a claim
that every bar was composed by Mozart.

## Reproduce and verify

Requires LilyPond / convert-ly 2.26.0, Node, and Python with `mido`:

```sh
PYTHON=/path/to/python-with-mido python3 \
  scripts/score-import/sources/mozart-collection/reproduce.py /tmp/mozart-scores
```

Optional score IDs after the output directory restrict the run. The script copies sources to temporary
directories, updates LilyPond syntax, dumps notation events, renders MIDI from the same music and compares
attacks and durations. It never modifies the source archives or library. `verification.txt` preserves
all thirteen reports. Converted keys, time signatures, pickups and staves were compared with the final library.

### Adjustments and interpretation

- **Menuetto and Trio:** the source's second score is a separate expanded, articulated MIDI realization.
  Render MIDI from the first layout score instead. Add `@Fine` to the end of practice bar 48 and `@DC`
  to the final bar to follow the printed Menuetto D.C. instruction, returning without repeats.
  LilyPond starts its opening grace notes at zero and delays the main notes by 7/128 quarter-note beats;
  the comparator removes that exact 0.0546875-beat offset. The final model has 303 written beats and
  744 performed beats including repeats and the return.
- **K. 457 I:** the source draws two-sided and closing repeat barlines rather than repeat music nodes.
  Emit repeat metadata for those barlines: practice bar 74 ends the first repeat; bars 75–167 form the
  second repeated section. The final coda is played once. MIDI follows the written order; both written
  note comparisons and the 1408-beat performed repeat plan are checked.
- **After-grace ornaments:** K. 457 I and II contain ornaments after a held note and before a rest.
  The score engine now permits grace notes attached to a rest and schedules them before it, rather
  than rejecting the source or dropping the ornament. Written bar lengths remain unchanged. This is
  approximate grace timing, particularly for the long Adagio flourish; the printed edition remains
  the reference for expressive placement, fermatas and pedaling.
- **Free-time passages:** temporary cadenza markers keep complete flourishes together instead of
  creating a new bar at every note. Practice-bar numbers and separately displayed endings can differ
  from printed bar numbers. Guides follow the player; no sounding notes are removed or rounded.

### Comparison limits

All main attacks match except **six documented MIDI re-strikes in K. 457 III**. The source explicitly
combines ties with staccato dots at the corresponding phrases. The interactive study retains the written
ties; LilyPond instead releases early and re-strikes the second note. The reproduction script accepts
only that exact six-note set (B-flat4 twice, E-flat5, G4, G5, C5), with no extra attacks and only the
expected twelve additional short ornament attacks. Any other non-grace mismatch still fails.

Other unmatched short attacks are LilyPond's grace/ornament realizations. Written grace notes remain
in the interactive notation. A few reported duration differences in K. 457 II/III and K. 309 I reflect
grace-note time stolen from main notes, or differing release behavior for tied/staccato and overlapping
voices. Trill/turn signs are not fully realized ornaments. The player uses a steady practice pulse;
human performances shape tempo changes, rubato, free-time gestures, fermatas and pedal resonance.
