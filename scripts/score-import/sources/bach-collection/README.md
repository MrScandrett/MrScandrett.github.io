# Bach collection additions

Retrieved 2026-11-13. These sources supply the seventeen additions to the Bach
lesson: eleven Inventions, the C-major Fugue, Air, Goldberg Aria, complete
Toccata and Fugue, Crab Canon and Jesu. The library now contains all fifteen
two-part Inventions and twenty-three Bach scores in total.

## Mutopia editions

The `.ly` files under the following directories are preserved from
[Mutopia's source repository](https://github.com/MutopiaProject/MutopiaProject/tree/master/ftp/BachJS).
Each header includes the typesetter, source edition and licence. The converted
notation retains that licence; guides are ClassroomOS teaching annotations.

| Work | Directory | Mutopia ID | Typesetter | Licence |
| --- | --- | --- | --- | --- |
| Invention 2, BWV 773 | BWV773 | 58 | Allen Garvin | Public domain |
| Invention 3, BWV 774 | BWV774 | 70 | Allen Garvin | Public domain |
| Invention 5, BWV 776 | BWV776 | 55 | Allen Garvin | Public domain |
| Invention 6, BWV 777 | BWV777 | 159 | jeff covey | CC BY-SA 3.0 |
| Invention 7, BWV 778 | BWV778 | 73 | Allen Garvin | Public domain |
| Invention 9, BWV 780 | BWV780 | 171 | jeff covey | CC BY-SA 3.0 |
| Invention 10, BWV 781 | BWV781 | 62 | Allen Garvin | Public domain |
| Invention 11, BWV 782 | BWV782 | 71 | Allen Garvin | Public domain |
| Invention 12, BWV 783 | BWV783 | 174 | jeff covey | CC BY-SA 3.0 |
| Invention 14, BWV 785 | BWV785 | 72 | Allen Garvin | Public domain |
| Invention 15, BWV 786 | BWV786 | 68 | Allen Garvin | Public domain |
| C-major Fugue, BWV 846 | BWV846 | 4 | Andreas Scherer | Public domain |
| Air, BWV 1068 | BWV1068 | 242 | jeff covey | CC BY-SA 3.0 |
| Goldberg Aria, BWV 988 | BWV988 | 979 | JD Erickson | CC BY-SA 3.0 |
| Toccata and Fugue, BWV 565 | BWV565 | 1780 | Anonymous | Public domain |

Source pages use `https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=ID`.
[CC BY-SA 3.0 licence](https://creativecommons.org/licenses/by-sa/3.0/).

## WIMA / IMSLP editions

Both editions below are by **Jürgen Knuth**, published in Altena, and licensed
[CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/).
Their converted notation is an adaptation distributed under the same licence.
Keep attribution, the noncommercial restriction and ShareAlike terms with it.
These source identities are also visible in the score players.

- **Crab Canon, BWV 1079:** complete 18-bar realisation for two violins, from
  [IMSLP's Musical Offering page](https://imslp.org/wiki/Musikalisches_Opfer,_BWV_1079_(Bach,_Johann_Sebastian)),
  section “For Flute, Strings and Continuo (Knuth)”. Source archive #221151,
  `WIMA.3be1-BWV_1079.zip`; the unchanged `BWV_1079_3a-part.cap` is archived as
  `BWV1079/crab.cap`. Corresponding printed score and parts: #221414.
- **Jesu, Joy of Man's Desiring, BWV 147:** complete closing chorale,
  **arranged for choir and keyboard**, not the original orchestral scoring.
  [IMSLP's BWV 147 page](https://imslp.org/wiki/Herz_und_Mund_und_Tat_und_Leben,_BWV_147_(Bach,_Johann_Sebastian)),
  section “Vocal Scores / Chorale: Jesus bleibet meine Freude (No.10)”.
  Source archive #214412, `WIMA.8261-Bach147_Jesu-bleibet-meine-Freude.zip`;
  unchanged `Bach147_Jesu-bleibet-meine-Freude-Part..cap` is archived as
  `BWV147/jesu.cap`. Corresponding printed score, chorus and keyboard: #214409.
  The source has 71 written bars in 9/8 and a repeat for the two text verses.

`crab.musicxml` and `jesu.musicxml` are MuseScore Studio 4.6.5 exports of those
Capella files. `crab.ly` and `jesu.ly` are musicxml2ly 2.26.0 conversions used
for the reproducible import. For Jesu, the intermediate XML was normalised:

1. Add the inherited 9/8 time signature to part P2's first attributes block.
   musicxml2ly otherwise assumes 4/4 for this part, shortening its empty bars.
2. Remove zero-duration rest placeholders; the adjacent `<forward>` elements
   already represent the spacing. No sounding notes are removed.
3. In both generated LilyPond files, omit musicxml2ly's separate articulated
   MIDI score and add `\midi {}` to the layout score. This compares written
   note durations directly, without articulate.ly's tempo/duration stretching.

No harmony, melody, octave or sounding rhythm was rewritten. The choir and
keyboard reduction and the two-violin realisation are explicitly labelled in
the lesson, studio selection and source credits.

## Reproduce and verify

Requires LilyPond/convert-ly 2.26.0, Python with `mido`, and Node. From the repo:

```sh
PYTHON=/path/to/python-with-mido python3 \
  scripts/score-import/sources/bach-collection/reproduce.py /tmp/bach-scores
```

This copies the archived sources to temporary directories, converts older
LilyPond syntax, logs events through `dump.ly`, converts those events through
`events2score.py`, renders MIDI from the same music and runs `verify-midi.mjs`.
It does not change the score library. Classroom guides and practice tempo
choices live in `data/score-library.json`.

`verification.txt` records the comparisons. All pitched attacks match, apart
from the documented short grace notes in Inventions 3 and 5, Air and the Aria.
Ornament signs remain notation rather than fully realised trills/mordents.
Duration differences are reported separately: overlapping same-pitch voices
and tied chains are not reliably distinguished by the MIDI comparator. In
particular, Jesu's keyboard has sustained and rearticulated unisons in different
voices. Preserve the source's independent voices and written ties.

The Toccata's 18 sixty-fourth notes require the added `/64` parser, four-beam
engraving and import support. They are not rounded or replaced by slower notes.
