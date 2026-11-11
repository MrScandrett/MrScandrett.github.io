# Rachmaninoff preludes

Original Mutopia sources retrieved 2026-11-10, preserved unchanged. Interactive
notation is adapted under Creative Commons Attribution-ShareAlike 4.0.

| Work | Edition | Source |
| --- | --- | --- |
| Op. 3 No. 2, C-sharp minor | Petro Kostandy | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2033 |
| Op. 23 No. 5, G minor | Joram Berger, after Muzyka / Gutheil | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2001 |
| Op. 23 No. 10, G-flat major | Joshua Nichols | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2058 |

## Reproduction

Copy a source directory into a temporary working directory; run `convert-ly -e`
on the copied .ly, then LilyPond 2.26.0 with
`-dinclude-settings=/absolute/repo/scripts/score-import/dump.ly`.
For Op. 23 No. 5 only, replace `(ly:make-moment N D 0 0)` with
`(ly:make-moment N D)` for compatibility, and remove `\articulate` from the
separate MIDI score. This avoids articulation processing and leaves the written
notation intact. The dump records the layout score, not the separate MIDI score.

Convert the .events with `events2score.py --staves "Right hand,Left hand"`.
For Op. 3 No. 2, label all four staves instead: Right hand upper, Right hand lower
(return), Left hand upper, Left hand lower (return). This source spreads the
return over four staves for one pianist. Preserve the half-bar pickup (bar 0).
Remove the diagnostic `measures` field; metadata, guide, sections and final staff
labels are in data/score-library.json.

Use `midinotes.py` and `verify-midi.mjs` against the MIDI produced by the same run.
All note onsets and pitches match: 1725/1725 (Op. 3 No. 2), 3858/3858 (Op. 23
No. 5), 909/909 (Op. 23 No. 10), with zero missing or extra notes.
The comparator reports 6 / 21 / 6 duration differences respectively for held and
overlapping same-pitch notes. Durations retain the engraved voices and ties;
these differences are recorded rather than silently altering the written score.
Op. 23 No. 5 includes incomplete measures as separate numbered bars (86 player
bars); the original source's measure numbering differs after those divisions.
Playback uses a steady practice tempo rather than the source MIDI's tempo map.
