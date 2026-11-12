# Brahms, Ravel, Schumann and Scriabin playable scores

Sources retrieved 2026-11-12. The archived LilyPond sources are unmodified;
converted notation and teaching guides are in `data/score-library.json`.
These are complete solo-piano pieces, with extracted instrument arrangements
available through the shared composer workspace.

| Library ID | Edition / typesetter | License | Source |
| --- | --- | --- | --- |
| brahms-waltz-39-15 | R. Joseffy / Brian D. Rude | Public domain | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=794 |
| schumann-melodie-68-1 | Peters / Philippe Hézaine | CC BY-SA 2.5 | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=647 |
| scriabin-prelude-16-4 | M. P. Belaïeff, Leipzig, 1897 / Philippe Hézaine | CC BY-SA 2.5 | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=762 |
| ravel-prelude-1913 | Matthew Kaner / Werner Icking Music Collection | CC BY-NC-SA 3.0 | https://imslp.org/wiki/Pr%C3%A9lude,_M.65_(Ravel,_Maurice) |

Schumann and Scriabin adaptations retain CC BY-SA 2.5:
https://creativecommons.org/licenses/by-sa/2.5/ .
Ravel's adaptation retains CC BY-NC-SA 3.0:
https://creativecommons.org/licenses/by-nc-sa/3.0/ .
The Ravel source ZIP is IMSLP 200950 (`IMSLP200950-WIMA.1d56-ravelprelude.zip`);
the matching printed score is IMSLP 200949. License and editor evidence is on
the work page above. The original download has been extracted to `ravel/ravel.ly`.

## Reproduction

Use LilyPond 2.26. Copy each composer's folder to a temporary directory and run
`convert-ly -e` on each `.ly` copy. Run LilyPond in that directory with
`-dinclude-settings=/absolute/repository/scripts/score-import/dump.ly -dbackend=null`
on `waltz-op39-15.ly`, `schumann-op68-01-melodie.ly`,
`scriabine-op16-no4.ly`, or `ravel.ly`. No manual source fixes are needed.
Convert the resulting `.events` with `events2score.py --staves "Right hand,Left hand"`.
Remove the diagnostic `measures` field, omit a zero pickup, and retain the library
metadata and guide. Convert MIDI using `midinotes.py` (requires mido), then run
`verify-midi.mjs` with the absolute repository root, score JSON and MIDI JSON.

## MIDI verification

- Brahms: 720/720 notes; 44 written bars; zero missing, extra or duration differences.
- Schumann: 303/303 notes including the opening repeat; 20 written bars,
  24 performed bars; zero missing, extra or duration differences.
- Ravel: 245/245 notes against the same conversion's generated `ravel.midi`;
  27 written bars; zero missing, extra or duration differences. Original source
  clef changes, ties and the second right-hand voice are preserved.
- Scriabin: 171/171 notes; 12 written bars; zero missing or extra notes.
  The 81 duration differences against Mutopia's supplied MIDI are the printed
  staccato notes: its separate `-mid.ly` version omits the staccato markings.
  Preserve the printed articulation; do not lengthen these notes to match MIDI.

The arrangement audit checks all eight supported instrument modes for these
four pages, including tablature, sampled playback, and desktop/mobile fit.
