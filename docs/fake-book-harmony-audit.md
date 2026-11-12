# Fake Book advanced-harmony sanity check

Checked November 12, 2026.

## Corrections

- Seventh enrichment recognizes V in minor and major triads acting as secondary dominants before major/minor targets. The major subtonic in minor receives a dominant seventh.
- Generated minor ii–V approaches use iiø7. With ninths enabled, V resolving to a minor target uses V7b9; the tritone substitute uses its own natural ninth.
- Approach roots are spelled relative to their destination, including bII for tritone substitutes (A7 → Eb7 → D, rather than D#7).
- Piano diagrams and bar popups preserve harmonic spelling, including Cb in Db9 and Fb in Gb9. Key colors/stripes follow those spellings.
- A piano voicing's bottom note is identified separately from the chord's bass. Upper-structure inversions no longer invent slash-chord symbols.
- Every chord diagram has a numbered change badge and beat label. Numbers follow chronological order across the song, including down stacked columns before the next column. Held harmonies retain their number and identify their source bar. Accessible names include change number, bar and beat.

## Verification

`node --test tests/fake-book*.test.mjs`

The library matrix covers 114 tunes × 16 harmony-option combinations (1,824 arrangements), checking positive durations, continuity, total duration, supported/spellable chords, clear smooth piano spacing, and preservation of source melody/chords. Existing tests also check connected voice-leading modes in all twelve keys, minimum-cost ii–V–I movement, repeated-chord stability, extension/shell/drop-2 integrity, and accompaniment at off-grid chord changes.

Browser verification used the actual Twinkle lead sheet with all four harmony options enabled: 40 numbered piano diagrams, chord-tone spelling, beat labels, playback startup/stop, narrow-screen rendering and no JavaScript page errors. The same diagram markup is included in the printed score. Local integrity checks passed.

## Musical limits

The harmony rules are progression-based practice suggestions, not melody-aware reharmonization. Stacking every option can introduce strong melody/chord tensions: for example, G in the melody over Gb9 adds a flat-ninth tension. No melody-fit or stylistic-quality guarantee follows from the structural checks. The voice-leading optimizer minimizes movement and applies register/spacing rules; it does not enforce classical counterpoint or specifically score every tendency-tone resolution. Playback startup was exercised, but this audit does not claim an aural review of all 1,824 arrangements.

Reference: [Open Music Theory — Substitutions](https://viva.pressbooks.pub/openmusictheory/chapter/substitutions/), for iiø7/V7b9 mixture and the chromatic downward resolution of tritone substitutes.
