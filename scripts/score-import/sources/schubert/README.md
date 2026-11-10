# Schubert playable scores

Public-domain Mutopia sources, retrieved 2026-11-10, preserved unchanged.
- Moment musical D. 780 No. 3: Claude Chaudron, Mutopia 1023.
- Impromptu D. 899 No. 2: Ph. Raynaud, Mutopia 1551.

Source and complete PDF links are recorded in data/score-library.json.

Reproduce using LilyPond 2.26: copy each .ly to a temporary directory,
run convert-ly -e, then lilypond with -dinclude-settings pointing to
scripts/score-import/dump.ly. In the Impromptu converted copy only, replace
#(set-octavation 1) and #(set-octavation 0) with \ottava #1 and \ottava #0.
Convert events with events2score.py --staves "Right hand,Left hand";
remove the diagnostic measures field and add the library metadata.
Compare the same run's MIDI with midinotes.py and verify-midi.mjs.

Moment musical: 1012 main notes; 1059 MIDI notes. The 47 short grace notes
are retained in notation; the comparator excludes grace notes. No extra
main notes or duration mismatches. The source writes repeated passages out.
Impromptu: 3143/3143 notes, zero missing or extra, using --offset 9 for
the source's three silent MIDI lead-in bars. Six duration differences are
held same-pitch notes overlapping between voices; preserve the written ties.
The one-beat pickup and source key changes are retained.
