# Additional Chopin preludes

Original Mutopia LilyPond sources retrieved 2026-11-10, preserved unchanged.
Both editions: Magnus Lewis-Smith, after Edition Peters (1879), public domain.

- No. 6: https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=469
- No. 15: https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=471

To reproduce: copy each source directory to a temporary workspace, update its .ly/.ily files with convert-ly, then run LilyPond with -dinclude-settings pointing to scripts/score-import/dump.ly. Convert the resulting events with events2score.py --staves "Right hand,Left hand". Use midinotes.py and verify-midi.mjs to compare against the MIDI generated in that same run. Conversion used LilyPond 2.26.0. Metadata, sections, and classroom guides are in data/score-library.json.

No. 6: 26 bars; 403 score notes / 405 MIDI notes. Two short ornament notes in bar 7 account for the difference. No extra notes or duration mismatches.
No. 15: 89 bars; 1506 score notes / 1518 MIDI notes. Twelve short ornament notes in bars 4, 11, 15, 17, 38, and 54 account for the difference. No extra notes or duration mismatches. Key changes at bars 28 and 76 are preserved.
