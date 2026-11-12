# Vivaldi: Winter Largo and Summer Presto

Retrieved 2026-11-12. The archived Mutopia LilyPond ZIPs are unmodified sources.
Both editions credit an **Anonymous** typesetter, after **Performers’ Facsimiles**,
and license their editions under **CC BY-SA 3.0**. These converted adaptations
retain that license: https://creativecommons.org/licenses/by-sa/3.0/ .

| Library ID | Complete movement | Source |
| --- | --- | --- |
| vivaldi-winter-2 | Winter, Op. 8 No. 4 (RV 297), II. Largo, 18 bars | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=351 |
| vivaldi-summer-3 | Summer, Op. 8 No. 2 (RV 315), III. Presto, 130 bars | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=336 |

The original five string parts are included: solo violin, Violin I, Violin II,
viola, and cello/continuo bass. The figured-bass symbols are not realized as an
added keyboard part. Sampled string playback is a classroom approximation;
printed articulation and ornament marks remain the performance reference.

## Reproduce

1. Unzip each archive in a temporary directory. Run LilyPond 2.26's
   `convert-ly -e` on every extracted `.ly` file. The archived originals remain
   untouched. No manual pitch or rhythm corrections are required.
2. Copy the matching `winter-movement.ly` or `summer-movement.ly` wrapper into
   that extracted source directory. It selects only the requested movement and
   keeps the original part definitions.
3. Run LilyPond on the wrapper with
   `-dinclude-settings=/absolute/repository/scripts/score-import/dump.ly -dbackend=null`.
4. Convert its `.events` using `events2score.py` with
   `--staves "Solo violin,Violin I,Violin II,Viola,Cello / continuo bass"`
   and `--instruments "strings,strings,strings,strings,strings"`.
5. Remove diagnostic `measures` and zero `pickup`; retain library metadata,
   sections and guides. Practice tempos are classroom settings.
6. Read the same invocation's `.midi` with `midinotes.py`, then compare using
   `verify-midi.mjs`. For duration comparisons, match by staff as well as pitch
   and onset: the generic verifier's single pitch/onset lookup conflates unisons
   in different instrumental parts. MIDI track 1 corresponds to staff 0, etc.

## Verification

- Winter: 851/851 note onsets and pitches match, including their source staves.
  Matching MIDI by staff gives zero duration differences after fixing playback
  of ties spanning more than two bars in the shared engine.
- Summer: 5,165/5,165 note onsets and pitches match, including source staves.
  Eight duration differences remain in the solo violin at beats 150–161: the
  source holds D4 for four bars under an upper voice that also repeats D4.
  Same-channel overlapping MIDI notes are paired differently by `midinotes.py`;
  the imported notation preserves the written four-bar tie and upper voice.
  All other durations match by staff.

Both movements are parsed and engraved by `check:scores`. The Vivaldi browser
workspace audit covers all eight supported arrangements, tablature, sampled
playback, and phone/desktop fit. Regression tests cover long tied notes and
stopping ties when the performed order jumps away from their continuation.
