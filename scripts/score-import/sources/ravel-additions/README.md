# Ravel: two opening studies from Miroirs

Retrieved 2026-11-12 from DCMLab's Maurice Ravel – Piano Pieces corpus,
commit `5a97ccee5383a87dc38688733a59dba499ef44d9`:
https://github.com/DCMLab/ravel_piano/tree/5a97ccee5383a87dc38688733a59dba499ef44d9

The two `.mscx` files are unmodified copies from its `MS3/` directory.
The corpus and these adaptations are **CC BY-NC-SA 4.0**:
https://creativecommons.org/licenses/by-nc-sa/4.0/ .
The printed reference is Durand's first edition of Miroirs (1906), archived in
the corpus as `PDF/IMSLP918861-PMLP04225-Ravel-M43-Miroirs-FE.pdf`.

Corpus citation requested by the source:
Hentschel, J., Rammos, Y., Neuwirth, M., & Rohrmeier, M. (2025).
A corpus and a modular infrastructure for the empirical study of (an)notated
music. Scientific Data, 12(1), 685. https://doi.org/10.1038/s41597-025-04976-z

## Scope

- `ravel-noctuelles-opening`: bars 1–12, 241 sounding notes.
- `ravel-oiseaux-opening`: bars 1–3, 22 sounding notes.

These are explicitly labeled **excerpts**, not complete movements. Their guides
cover every included bar and link to the complete printed source. Practice
tempos are classroom settings. Later passages require further work on nested
tuplets, tremolo realization, cross-staff ties and ornaments before admission
as complete playable scores.

## Reproduction

Export each archived source to MusicXML and MIDI with MuseScore 4:

```
mscore -o /tmp/noctuelles.musicxml Ravel_-_Miroirs_I._Noctuelles.mscx
mscore -o /tmp/noctuelles.mid Ravel_-_Miroirs_I._Noctuelles.mscx
mscore -o /tmp/oiseaux.musicxml Ravel_-_Miroirs_II._Oiseaux_tristes.mscx
mscore -o /tmp/oiseaux.mid Ravel_-_Miroirs_II._Oiseaux_tristes.mscx
```

Run the local MusicXML bridge with limits of 12 and 3 measures respectively,
then the shared `events2score.py --staves "Right hand,Left hand"` on the events.
Remove the diagnostic `measures` field and a zero pickup. Retain the library's
excerpt metadata, credits, practice tempo and guide. The bridge uses exact
fractions for MusicXML durations; it omits analytical labels and lyrics.
The ordinary LilyPond MusicXML converter was unsuitable for these sources.

Use `midinotes.py` on the MuseScore MIDI exports and retain notes starting before
beat 36 (Noctuelles) or beat 11 (Oiseaux). Compare using `verify-midi.mjs`:

- Noctuelles: 241/241, zero missing, extra, or duration differences.
- Oiseaux: 22/22, zero missing or extra. One duration difference at beat 10:
  the engine applies the printed staccato to the final tied note at the excerpt
  boundary; the source MIDI holds it for one beat. The excerpt does not include
  its continuation into bar 4.

The composer browser audit checks all eight arrangements for both studies,
engraving, tablature, sampled playback, and mobile/desktop fit.
