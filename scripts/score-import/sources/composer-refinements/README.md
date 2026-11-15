# Morton, Ravel and Ellington classroom studies

Prepared 2026-11-15. `refine.py` contains the bar-by-bar source readings and
rebuilds only the seven named entries in `data/score-library.json`:

```
python3 scripts/score-import/sources/composer-refinements/refine.py
npm run check:scores
node --test tests/composer-refinements.test.mjs tests/composer-catalog.test.mjs
```

These are teaching excerpts, not complete compositions or critical editions.
The new transcription code and classroom reductions are dedicated to CC0 1.0.
The underlying historical editions are public domain **in the United States**;
this is not a worldwide copyright claim. Modern recordings and arrangements
have separate rights and are not copied. No historical recording is bundled.

## Sources and scope

| Entry | Historical source | Playable scope and limits |
| --- | --- | --- |
| morton-jelly | Will Rossiter, 1915; Lilly Library LL-SDV-023048, first musical page | Four-bar introduction with selected source bass; no chorus claimed. |
| morton-new-orleans | Herman Darewski, *Blues and Stomps*, Book 1, printed p.7 | Twelve-bar opening before “Stomp”; melody and selected source bass. Printed 8va in bars 2–3 is realized; bar 4 is loco. Repeat omitted. |
| morton-king | Same collection, printed p.4 | Source bars 5–12, numbered as such; A-flat major (four flats), rather than the old entry’s E-flat label. Melody and selected source bass. |
| morton-black-bottom | Same collection, printed p.8 | Eight-bar melodic passage beginning at the third system; melody and selected source bass. Earlier introduction and later strains omitted. |
| ravel-noctuelles-opening | E. Demets, Paris, 1906, plate E.1158 D, printed p.2 | Five metered opening bars. Stops before the free runs instead of assigning them inferred tuplet ratios. |
| ravel-oiseaux-opening | E. Demets, Paris, 1906, plate E.1159 D, printed p.11 | Bars 1–7: upper call and lower-staff ostinato/bass. Middle RH voice omitted; overlapping RH voices combined in bar 6. Simultaneous 4/4–12/8 aligned as triplets. Some overlapping bass ties shortened; boundary ties cut. |
| ellington-black-tan-introduction | Gotham Music Service, 1927; Eddie Powell arrangement; Smithsonian Libraries M1366.E44 B53 1927, first violin, scan p.6 | Introduction in the historical first-violin part, including its initial three-beat bar. Ellington **and Bubber Miley** credited. Other band parts omitted. |

Morton reductions omit inner chord tones, secondary sustained voices, slurs,
pedal and expressive timing; the bass is a selection of source events, not an
invented chord progression or a complete left-hand transcription. Ravel's
studies omit slurs, hairpins and pedal. Practice tempos are classroom settings.
The Ellington entry preserves a historical part, not the timbre of the recorded
band. “Original scoring” in the common player means the supplied study/part;
the title, subtitle and source notes identify that scope.

### Historical scans

- Morton scans and institutional URLs: `assets/images/lessons/jazz-scores/README.md`.
- Ravel first edition: https://imslp.org/wiki/Miroirs_(Ravel,_Maurice),
  IMSLP #918861. The first-edition scan was retrieved from the existing corpus's
  PDF archive, not from its modern MuseScore encodings:
  https://raw.githubusercontent.com/DCMLab/ravel_piano/5a97ccee5383a87dc38688733a59dba499ef44d9/PDF/IMSLP918861-PMLP04225-Ravel-M43-Miroirs-FE.pdf
  The scan itself identifies **E. Demets**, not Durand. The older `.mscx`
  encodings remain in `../ravel-additions/` with their original CC BY-NC-SA
  notices; they are not relabeled as public domain. The replacement classroom
  readings use the historical printed notation, with the reductions above.
- Ellington/Miley/Powell historical band parts:
  https://archive.org/details/blacktanfantasy00elli
  and https://archive.org/download/blacktanfantasy00elli/blacktanfantasy00elli.pdf.
  Smithsonian metadata dates the edition 1927 and states that the Library
  considers the work public domain. The folder's advertisements are later;
  the musical part itself prints the 1927 Gotham copyright notice. Only the
  first violin pages (scan pp.6–7) are reproduced locally.
- U.S. term reference, checked 2026-11-15:
  https://www.copyright.gov/circs/circ22.pdf. Copyright in works published or
  copyrighted before 1931 has expired in the United States as of 2026.

`provenance.json` records downloaded-PDF hashes and deployed scan-page hashes.
All lesson source images open in the shared photo lightbox with teaching
captions and edition credits. Full-edition links are retained.

## Verification boundaries

The score validator checks syntax, measure lengths, guide coverage and engraving
at three widths. The focused tests protect excerpt lengths, source numbering,
the corrected key, octaves, accompaniment entrances and honest attribution.
The real-browser audit exercises original and arranged scores and sampled audio.
These checks do not independently certify a hand transcription against every
note of the print. Compare the displayed studies with the credited original
pages when preparing a performance; these remain classroom reductions.
