# Brahms collection additions

Imported 2026-11-15 from Mutopia's published LilyPond sources and MIDI.
Original source files and metadata are archived in the named subdirectories;
Wiegenlied's ZIPs also preserve the separately supplied SATB arrangement, which
is **not** used in the player. All three editions declare public-domain status
in their source headers. No modern recording or unrelated arrangement is copied.

| Playable selection | Edition and attribution | Scope |
| --- | --- | --- |
| Waltz in G major, Op. 39 No. 10 | [Mutopia 2164](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2164), John Mamoun, after J. Rieter-Biedermann c.1866 | Complete 32-bar solo-piano setting, both hands; source ornaments retained. |
| Intermezzo in A major, Op. 118 No. 2 | [Mutopia 535](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=535), Aron Fay; header identifies N. Simrock, 1892 | Complete advanced piano work, pickup and bars 1–116, all source voices and middle-section repeat. The source's bibliographic date is reproduced as its claim, not independently corrected. |
| Wiegenlied (Lullaby), Op. 49 No. 4 | [Mutopia 1037](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1037), Shogo Mori (森 章吾), after the Indiana University edition linked in the source | Complete musical setting for one verse: pickup and bars 1–18, vocal staff plus both piano hands. Lyrics and second-verse repeat omitted. The vocal staff uses a string sample, not synthesized singing. |

The printed scores remain linked from each player's source information. The
Lullaby's link downloads Mutopia's PDF bundle, containing the voice/piano score
and a separate SATB version. Original source notation is converted with
LilyPond; only its temporary working copy is updated by `convert-ly` and the
existing importer's staccatissimo substitution. Source files are left intact.
Playback uses fixed practice tempos and does not reproduce pedal or expressive
timing. Instrument arrangements remain the shared player's transformations.

## Reproduction

Install LilyPond (including `convert-ly`) and Python `mido`, then run from the repo:

```
PYTHON_MIDI=/path/to/python-with-mido python3 scripts/score-import/sources/brahms-collection/import.py
npm run check:scores
node --test tests/composer-catalog.test.mjs tests/composer-arrangement.test.mjs
COMPOSER_TEST_FILTER=brahms node scripts/check-composer-studios.mjs
```

The browser check expects `node serve-local.js` on port 8080. `import.py` rewrites
only these three library entries and Brahms's workspace collections. The original
A-flat waltz remains unchanged. `provenance.json` records source URLs and SHA-256s.

## MIDI comparison and limits

The `*-verification.txt` reports compare converted notation with the archived
**published** MIDI, using `scripts/score-import/verify-midi.mjs`:

- Waltz: 446 non-grace note events; 452 in MIDI. The six extra MIDI events are
  the three grace notes at each of bars 22 and 30. No other missing notes,
  extra attacks or duration mismatches.
- Intermezzo: all 1,677 published MIDI attacks are present. One additional
  C-sharp attack occurs on the repeated entry to bar 49 (performance beat 169),
  where the notation ties into a repeat: the player re-attacks it on the repeat
  while the MIDI holds it. The import explicitly checks this single expected
  discrepancy; it does not suppress arbitrary verification failures. The
  comparator also reports 25 duration differences at shared pitches in the
  layered voices. It keys events only by onset and pitch, so overlapping
  unisons with different voice lengths do not have a one-to-one duration match.
- Lullaby: 224 non-grace events; 227 in MIDI. Three additional MIDI events are
  grace notes (bar 14's G and bar 18's B-flat/A-flat approach). No other missing
  or extra attacks. Ten duration differences occur where the vocal line and
  piano share pitches with different durations or grace-note timing.

The reports omit grace events from the player comparison; the imported scores
retain the source's grace notation. These checks establish pitch/onset coverage
with the stated exceptions, not a claim of identical expressive performance.
The score validator checks meter, guide coverage and engraving at three widths;
the Brahms browser audit checks every selection in all nine arrangements,
mobile/desktop fit, and sampled audio playback.
