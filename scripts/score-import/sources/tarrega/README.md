# Tárrega solo guitar imports

Original, unmodified Mutopia LilyPond and reference MIDI files are archived here.
The complete source PDFs are in `assets/scores/tarrega/`.

- Adelita: Mutopia 808, Stewart Holmes, CC BY-SA 2.5.
  https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=808
- Capricho árabe: Mutopia 1951, Glen Larsen, CC BY-SA 4.0.
  https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1951

Conversion: copy each `.ly` to a temporary directory, run `convert-ly -e`, then
`lilypond -dinclude-settings=ABSOLUTE_REPO/scripts/score-import/dump.ly -dbackend=null NAME.ly`.
Run `events2score.py NAME.events --staves Guitar --instruments pluck` on the result.
The conversion preserves sounding pitches (the guitar's octave clef), separate
voices, ornaments, ties and changes of key and meter.

For Adelita, restore the source's graphic repeat barlines in voice 1: start repeats
at bars 1 and 9, end repeats at 8 and 16, `@Fine` at 8, `@DC` at 16. These graphical
marks and text instructions do not appear in the event dump. No pitches changed.
Capricho's repeats are already written out by the source's `repeat unfold`.

MIDI comparison using `midinotes.py` and `verify-midi.mjs`:
- Adelita: 123 main-note attacks match; 8 grace notes use different MIDI timing.
  One short bass duration differs. MIDI follows written order without repeats/DC.
- Capricho: LilyPond reports "Going back in MIDI time" at its afterGrace passage.
  Subtract 1/48 quarter beat from generated MIDI onsets >= 33 before comparison:
  all main-note attacks match except one chromatic-tuplet onset rounding in bar 44;
  80 short ornament attacks have different grace timing, no duration mismatches.
  This normalization is for verification only; score notes are unchanged.

Metadata, section maps and full-bar reading guides are in `data/score-library.json`.
These are adaptations of the credited editions under their respective licenses.
