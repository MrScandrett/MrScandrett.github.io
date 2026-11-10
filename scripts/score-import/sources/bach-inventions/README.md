# Additional Bach inventions

Original Mutopia LilyPond sources and reference MIDI retrieved 2026-11-10,
preserved unchanged. Editions after the Bach-Gesellschaft:

- Invention No. 1, BWV 772: jeff covey, CC BY-SA 3.0, Mutopia 40.
  https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=40
- Invention No. 4, BWV 775: Allen Garvin, public domain, Mutopia 67.
  https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=67
- Invention No. 13, BWV 784: Allen Garvin, public domain, Mutopia 59.
  https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=59

Reproduce using a temporary copy of each source: run convert-ly -e, then
LilyPond (conversion used 2.26.0) with -dinclude-settings pointing to
scripts/score-import/dump.ly and -dbackend=null. Convert the emitted events
with events2score.py --staves "Right hand,Left hand". Run midinotes.py on
the MIDI generated in that run, then verify-midi.mjs with the absolute repo
path and the two generated JSON paths. Metadata and classroom guides are in
data/score-library.json; no source notes were changed.

Verification: No. 1, 22 bars, 458/458 notes; No. 4, 52 bars, 443/443 notes;
No. 13, 25 bars, 564/564 notes. No missing or extra notes in any piece.
No. 4 has two reported duration differences for the long tied C5 (bar 19)
and E3 (bar 29); the complete tie chains remain in the score. Ornament signs
are preserved as notation rather than fully realised in playback. Nos. 1
and 13 have no duration differences.
