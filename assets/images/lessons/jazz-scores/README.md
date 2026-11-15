# Gershwin and Morton score-page sources

These WebP images reproduce the musical pages of early printed editions. They are document scans, not generated illustrations. Covers and advertisements are omitted; the musical notation is retained. The 1915 Morton scan was cropped to the printed page to remove surrounding scanner whitespace. The selected editions are public domain in the United States as of 2026; other countries can have different terms, especially for Gershwin songs with lyrics by Ira Gershwin.

| Files | Edition and source | Source PDF pages |
| --- | --- | --- |
| gershwin-fascinating-1 through 4 | Harms 1924, plate 7293-5, in a later reprint with advertisements; [Ohio State University scan](https://library.osu.edu/site/publicdomain/files/2020/01/Gershwin-Fascinating-Rhythm.pdf) | 2–5 |
| gershwin-someone-1 through 5 | Harms 1926, plate 7851-5; [Wikimedia Commons, from IMSLP's first-edition scan](https://commons.wikimedia.org/wiki/File:Someone_to_watch_over_me_(1926)_sheet_music.pdf) | 3–7 |
| gershwin-rhythm-1 through 4 | New World Music Corporation 1930, plate S-354-4; [Wikimedia Commons / Internet Archive original sheet music](https://commons.wikimedia.org/wiki/File:George_Gershwin_and_Ira_Gershwin_-_I_Got_Rhythm.pdf) | 2–5 |
| morton-jelly-1 through 3 | Will Rossiter 1915; [Lilly Library / Indiana University, LL-SDV-023048](https://webapp1.dlib.indiana.edu/inharmony/detail.do?action=detail&fullItemID=/lilly/devincent/LL-SDV-023048) | 3–5 |
| morton-king-1 through 2 | Herman Darewski, Blues and Stomps, Book 1, plate H.D.M.P.Co.365, 1923, 1925–27; [IMSLP #589177](https://imslp.org/wiki/Blues_and_Stomps_(Morton,_Jelly_Roll)) | 5–6 (printed 4–5) |
| morton-new-orleans-1 | Same collection | 8 (printed 7) |
| morton-black-bottom-1 through 2 | Same collection | 9–10 (printed 8–9) |

The playable Gershwin entries in `data/score-library.json` are complete refrain melodies transcribed from these pages (the last page of *Fascinating Rhythm* is page 6 of the Ohio State PDF); the Morton entries are two-staff classroom studies with selected source bass. Their metadata and visible captions disclose excerpt ranges, omitted chord interiors and secondary voices, articulation limits, repeats and practice tempos. New Orleans Blues now realizes the printed 8va in bars 2–3 and returns to loco in bar 4. The complete original pages remain available beside each excerpt. Engraved player notation is not presented as a complete arrangement or as an archival recording.

Source editions and pages inspected on 2026-10-13. Validate score syntax, durations, and engraving with `npm run check:scores`; this structural check does not independently establish transcription accuracy.

## Ravel and Ellington source pages added 2026-11-15

| Files | Edition and source | Source PDF pages |
| --- | --- | --- |
| ravel-noctuelles-1906.webp | E. Demets first edition, Paris, 1906, plate E.1158 D; [IMSLP #918861](https://imslp.org/wiki/Miroirs_(Ravel,_Maurice)) | 2 (printed 2) |
| ravel-oiseaux-1906.webp | Same edition, plate E.1159 D | 11 (printed 11) |
| ellington-black-tan-violin-1 and -2.webp | Duke Ellington and Bubber Miley, *Black and Tan Fantasy*, Eddie Powell arrangement; Gotham Music Service, 1927; Smithsonian Libraries M1366.E44 B53 1927; [complete band parts](https://archive.org/details/blacktanfantasy00elli) | 6–7 (complete first violin part) |

These historical editions are public domain in the United States. The source
PDFs were rendered to WebP without changing their musical content. The Ravel
pages come from the historical PDF, not the modern corpus engravings. See
`scripts/score-import/sources/composer-refinements/README.md` for playback scope,
reductions, source URLs, hashes and verification boundaries.

## Additional Ellington scores (2026-11-15)

- `ellington-black-beauty.webp`: *Black Beauty*, Jack Mills, 1928; musical p.3
  credits Gotham Music Service. [IMSLP #922452](https://imslp.org/wiki/Black_Beauty_(Ellington,_Duke)), PDF p.3.
- `ellington-jig-walk.webp`: *Jig Walk*, Robbins-Engel, 1925, plate SH 232, printed
  p.3 / PDF p.2. Melody: Duke Ellington; lyric: Jo Trent; ukulele arrangement:
  Hank Linet. [IMSLP #941792](https://imslp.org/wiki/Jig_Walk_(Ellington,_Duke)).
- `ellington-ring-dem-bells.webp`: *Ring Dem Bells*, Duke Ellington and Irving
  Mills; Harms, 1930, plate 8565, printed/PDF p.3; ukulele arrangement by S. M.
  Zoltai. [IMSLP #1009864](https://imslp.org/wiki/Ring_Dem_Bells_(Ellington,_Duke)).

All three: historical editions public domain in the United States, scans by
Kosboot via IMSLP/Petrucci US. Full pages preserve publication credits. Source
PDF URLs, SHA-256 hashes, reproduction settings and playable excerpt limits:
`scripts/score-import/sources/ellington-additions/`.
