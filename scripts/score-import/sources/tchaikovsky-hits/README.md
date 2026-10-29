# Tchaikovsky ballet favorites

Retrieved 2026-10-29. The `.mxl` files are archived source editions, downloaded
from Piano: Soloist's MusicXML mirror. They are piano arrangements, not the
original orchestral scores. No notes were reconstructed from memory.

| Edition | Download / provenance | Reuse status | Imported source bars |
| --- | --- | --- | --- |
| Swan Lake theme, uploaded by willdsc | [MusicXML mirror](https://pianosoloist.app/library/tchaikovsky-swan-lake.mxl), [original score](https://musescore.com/user/30951925/scores/5964065), PDMX row 56146 | CC0 1.0; PDMX `license_conflict=False` | 1–27 of 32; the remaining five source measures are empty |
| Dance of the Sugar Plum Fairy, transcribed by Nohpets | [MusicXML mirror](https://pianosoloist.app/library/tchaikovsky-sugar-plum-fairy.mxl), [MuseTrainer public-domain library](https://github.com/musetrainer/library), original MusicXML source tag: MuseScore 2899321 | Public domain according to MuseTrainer; the MusicXML has no separate rights tag | 1–28 of 53 |
| Waltz of the Flowers, Eduard Langer four-hands arrangement, uploaded by hmscomp | [MusicXML mirror](https://pianosoloist.app/library/tchaikovsky-waltz-of-flowers-4hands.mxl), [original score](https://musescore.com/user/24069/scores/1460071), PDMX row 162159 | CC0 1.0; PDMX `license_conflict=False` | 34–65 of 339 written measures |

PDMX edition and license evidence comes from the `PDMX.csv` and `metadata.tar.gz`
files of [dataset version 15571083](https://zenodo.org/records/15571083).
`provenance.json` retains the two CSV records, uploader information from the
metadata records, and SHA-256 hashes of the downloaded MusicXML files.

The complete source piano editions were exported to PDF with MuseScore Studio
4.6.3 and are in `assets/scores/tchaikovsky/`. They retain their source titles and
credits; the lesson supplies the edition/license attribution next to each player.
These PDFs provide the context beyond each excerpt, not orchestral coverage.
The three small `.mid` files here were independently exported from the extracted
MusicXML passages with MuseScore Studio 4.6.3.

## Reproduce the import

Use LilyPond 2.24.4 and Python with `mido` as described in the parent README.
Set `LILYPOND` to its **bin directory**, `PYTHON` to the Python with mido, and
`OUT` to an absolute scratch directory. Run from the repository root:

```bash
python3 scripts/score-import/prepare-tchaikovsky-hits.py "$OUT"
export PATH="$LILYPOND:$PATH"
for name in swan-theme sugar-plum waltz-flowers; do
  "$LILYPOND/musicxml2ly" -a --npl -o "$OUT/$name/$name.ly" "$OUT/$name/$name.musicxml"
  staves='Right hand,Left hand'
  if [ "$name" = waltz-flowers ]; then
    staves='Primo right hand,Primo left hand,Secondo right hand,Secondo left hand'
  fi
  scripts/score-import/import.sh "tchaikovsky-$name" "$OUT/$name" "$name.ly" \
    "$PWD/scripts/score-import/sources/tchaikovsky-hits/$name.mid" "$OUT/converted" --staves "$staves"
done
```

The converter uses local bar numbers. The library sets `startMeasure: 34` for
the Waltz so the displayed numbers and guide refer to the complete source PDF.
All three entries use `excerpt` and an open ending, with guides covering every
imported bar and all hands in each passage. The two existing complete Op. 39
pieces remain complete original piano works.

## MIDI comparison

| Passage | Notes in player / source MIDI | Missing | Extra | Duration differences reported |
| --- | --- | --- | --- | --- |
| Swan Lake, 1–27 | 326 / 326 | 0 | 0 | 0 |
| Sugar Plum Fairy, 1–28 | 515 / 515 | 0 | 0 | 0 |
| Waltz of the Flowers, 34–65 | 342 / 342 | 0 | 0 | 0 |

All pitches and note onsets match. The initial comparison exposed 128 Waltz
duration differences: the shared player drew staccato dots but held those notes
for their full written length. `ScoreEngine.playList()` now releases staccato
notes at half their written length, matching this reference MIDI while keeping
the written rhythm intact. For tied notes, only a staccato final segment is
shortened. A regression test covers ordinary notes, chords and tied chains.
The verifier's duration tolerance still means “0” does not certify identical
note-off times for every short note.

The complete Sugar Plum Fairy and Waltz MusicXML files produce warnings in
`musicxml2ly` outside these passages. They have not been imported as complete
interactive arrangements. Expanding them requires resolving those conversions
and checking the additional measures independently.
