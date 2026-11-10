# Liszt piano playback sources

Complete Consolations Nos. 1, 3 and 4, S.172. Engraved by Ryan Prince from
Breitkopf & Härtel (1850), distributed by Mutopia under CC BY 3.0.
The original LilyPond and MIDI downloads are archived in each subfolder.

- No. 1: https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1654
- No. 3: https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1647
- No. 4: https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1650
- License: https://creativecommons.org/licenses/by/3.0/

Import using the workflow in ../../README.md: convert-ly on a temporary copy,
LilyPond with dump.ly, then events2score.py --staves "Right hand,Left hand".
Retain the converter's voices, cross-staff writing, grace notation, and pickup.
Add metadata and study guides in data/score-library.json; no manual pitch edits.

Verification against the archived MIDI:

| Piece | Matched MIDI notes | Differences |
| --- | --- | --- |
| No. 1 | 263/264 | One short grace note has a different onset; 105 duration differences reflect articulated notes (notably portato) versus MIDI sustain. |
| No. 3 | 1029/1029 | Three tied low notes have different MIDI sustain lengths. |
| No. 4 | 492/504 | Twelve short ornamental notes have different onset timing; no extra notes or duration mismatches. |

The source staves cross in No. 4: a staff is not consistently a single hand.
The player is a practice aid; linked full editions retain pedaling, fingering,
layout and expressive details beyond the playback engine.
