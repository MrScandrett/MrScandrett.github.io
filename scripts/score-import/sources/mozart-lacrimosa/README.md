# Lacrimosa · Requiem K. 626

Source: https://github.com/musetrainer/library/blob/master/scores/Lacrimosa_-_Requiem.mxl
Retrieved 2026-11-10. MuseTrainer lists this arrangement as public domain. The MusicXML identifies TheoA as arranger and MuseScore score 2275496 as its source. This is a piano reduction of the familiar completed movement, not Mozart’s original orchestral scoring. Mozart’s surviving draft stops after eight bars; the continuation is associated with Süssmayr’s completion.

Converted with musicxml2ly -a --npl (LilyPond 2.26.0), then lilypond with scripts/score-import/dump.ly injected and MIDI enabled. events2score.py --staves "Right hand,Left hand" produced the score-library data. Split three partial chord ties into independent voices (bars 10, 11, 18) to preserve the source reattacks. Removed two completely empty trailing source bars (31–32). Retained the source's explicit accidentals rather than adding an editorial key signature.

MIDI comparison: 694 notes in both score engine and source MIDI, zero missing, extra or duration mismatches. Complete movement: 30 bars, 12/8, 180 quarter-note beats.

The bundled PDF was engraved with LilyPond from the same MusicXML after removing the two empty trailing bars and correcting the composer/arranger heading. Source archive retained in lacrimosa.mxl.

Historical context: https://baroque.boston/program-notes-mozart-requiem
Recording: https://commons.wikimedia.org/wiki/File:Mozart_-_Requiem_(Krips)_-_VIII._Lacrimosa.flac (Josef Krips, 1950; Commons marks public domain in the EU).
