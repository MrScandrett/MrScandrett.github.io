# Importing complete scores

The composer lessons play **complete pieces**, not fragments. Each one comes from a LilyPond source
(usually the [Mutopia Project](https://www.mutopiaproject.org), public domain or CC BY-SA), is read by
LilyPond itself, and is checked note by note against the MIDI file LilyPond rendered from the same source.

## Requirements

- LilyPond 2.24 (the Linux release tarball works without installing:
  `lilypond-2.24.x-linux-x86_64.tar.gz` from lilypond.org / GitLab releases).
- Python 3 with `mido` for reading MIDI (`python3 -m venv venv && venv/bin/pip install mido`).

## Steps

1. Download the piece's `.ly` (or `-lys.zip`) and `.mid` from Mutopia into a folder.
   If the source engraves several movements, write a small wrapper `.ly` that includes the music
   and has one `\score { … \layout { } }` for the movement you want.
2. Convert and verify:

   ```bash
   LILYPOND=…/lilypond-2.24.4/bin PYTHON=…/venv/bin/python \
     scripts/score-import/import.sh fur-elise SRC_DIR fur_Elise_WoO59.ly fur_Elise_WoO59.mid OUT \
     --staves "Right hand,Left hand"
   ```

   The report must show no missing or extra notes except grace notes (LilyPond's MIDI times them
   differently) and ornaments the source writes out only for MIDI (`\ifemidi`, `\tag #'midi`).
3. Read it bar by bar before writing the guide: `node scripts/score-import/bars.mjs . OUT/fur-elise.json`.
4. Add the entry to `data/score-library.json`: the converted `key`, `time`, `pickup` and `staves`, plus
   `title`, `subtitle`, `composer`, `keyName`, `tempo`, `tempoText`, `instrument`,
   `complete: true` (or `excerpt: { label, of }`), `sections`, a `guide` that covers every bar, and
   `source` with `label`, `license`, `url` (the source page) and `full` (the complete printed score).
5. `npm run check:scores` enforces that standard for every score embedded in `lessons/music/`.

## What the converter does

`dump.ly` is injected with `-dinclude-settings`, so sources are not edited. It logs every note, rest,
grace note, tie, tuplet, tremolo, articulation, dynamic, clef/key/time change and repeat/ending, with the
bar number, position in the bar, staff and voice LilyPond engraved it in. `events2score.py` turns that into
the engine's score text:

- Voices: LilyPond's short-lived `<< { } \\ { } >>` voices are packed into stable lanes per staff
  (upper voice first); stems are forced up/down only in bars where two voices overlap (`@U`/`@D`/`@A`).
- Bars come from LilyPond's own barlines, so incomplete bars at repeat endings become `@L:` bars. A repeat
  sign in the middle of a bar splits the bar (both halves keep the bar's number, `@N:`).
- A voice that overlaps itself (`<< bf2. { s8 <f bf>4 } >>` without `\\`) is split into extra lanes.
- A tuplet with a gap in it (an arpeggio that crosses to the other hand) is filled with hidden tuplet rests.
- A note held past its barline (a breve in 4/4) is written as tied notes, one per bar.
- Measured tremolos are written out as the notes they stand for; transposing instruments are shown at
  sounding pitch; `\afterGrace` notes lead into the next bar's first note.

## Fixes made by hand after converting

Some engravings need a small edit the converter cannot make; each one is scripted and listed here.

- **Moonlight III**: the secondary voices (`topsecondary`, `bottomsecondary`) only draw hold-ties from hidden noteheads, so a wrapper `.ly` empties them before `\book`. LilyPond logs the bar-188 cadenza (grace notes) three bars late, so it is moved back and spelled out in sixteenths as its own incomplete bar, also numbered 188 (`@L:39/4 @N:188`). After the cadenza LilyPond's MIDI right hand runs 0.714 beats late; shift it before comparing.
- **Moonlight II**: Beethoven's "Allegretto D.C." is not in the source; add `@Fine` at the end of bar 36 and `@DC` on the last bar.
- **Fifth Symphony I**: the fermata chord and oboe cadenza in bar 268 are written under `\cadenzaOn`, which the converter cuts into one-beat bars; rebuild them as bar 268 plus an 8-beat bar 268, and delete the empty `s2` the source adds after `\cadenzaOff` (the movement then ends at bar 502). The cello's seven tied pp bars sit in their own voice, so the tie into the ff eighth in bar 492 is not engraved and MIDI re-strikes it; drop that tie.

## Current complete scores

For the separately labeled ballet arrangements of **Swan Lake theme**, **Dance
of the Sugar Plum Fairy**, and **Waltz of the Flowers**, see the
[archived sources, excerpt ranges, license evidence, reproduction steps and MIDI results](sources/tchaikovsky-hits/README.md).
These excerpts do not represent complete ballet or orchestral scores.

| Score | Source | Check against MIDI |
| --- | --- | --- |
| bach-invention-8 | Mutopia 61 (PD) | 598/598 notes |
| bach-prelude-c-major | Mutopia 5 (PD) | 549/549 |
| bach-cello-prelude | Mutopia 517 (PD) | 656/656 |
| beethoven-fur-elise | Mutopia 931 (PD) | all but 3 grace notes |
| beethoven-moonlight-1 / -2 / -3 | Mutopia 276 (CC BY-SA 2.5) | 1142/1142 / 373/373 / all but 85 grace and ornament notes; 2 / 0 / 41 extra = unisons and the chords the edition ties over from an arpeggio, which MIDI holds instead of re-striking |
| beethoven-symphony-5-1 | Mutopia 941 (PD) | every MIDI note; 436 extra = measured tremolos (`c2:8`) written out, which MIDI holds as one note; 96 extra = unisons between parts |
| beethoven-symphony-7-allegretto | Mutopia 595 (PD) | all but 28 grace notes; durations of some cross-instrument unisons differ in the check only |
| chopin-prelude-4 / -7 / -20 | Mutopia 468 / 470 / 472 (PD) | all but 2 / 1 / 0 grace notes |
| joplin-entertainer | Mutopia 263 (PD) | all notes; 5 second-ending chords with `\repeatTie` are re-struck instead of held |
| mozart-turkish-march | Mutopia 108 (PD) | all but 190 grace notes (the coda's drum arpeggios) |
| mozart-sonata-facile | Mutopia 998 (CC BY-SA 3.0) | all but 17 grace notes |
| mozart-eine-kleine-1 | Mutopia 900 (PD) | all but 146 grace notes and 12 trill realisations written only for MIDI |
| tchaikovsky-old-french-song | Mutopia 2080 (PD) | 188/188 |
| tchaikovsky-wooden-soldiers | Mutopia 1806 (PD) | 318/318 |
| vivaldi-spring-1 | Mutopia 301 (CC BY-SA 3.0) | 3173/3173; 19 staccatissimo durations differ |
| debussy-clair-de-lune | Mutopia 1778 (PD) | 1467/1468 (1 grace note); 26 extra = unisons between voices that MIDI merges |
| debussy-arabesque-1 | Mutopia 1777 (PD) | 1448/1448; 10 extra = unisons between voices |

The Gershwin refrains were transcribed from the original sheet-music scans in
`assets/images/lessons/jazz-scores/` (and the Ohio State University PDF for the last page of *Fascinating
Rhythm*). The structural check cannot confirm a hand transcription; compare it with the scan.
