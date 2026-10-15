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

The playable Gershwin entries in `data/score-library.json` are complete refrain melodies transcribed from these pages (the last page of *Fascinating Rhythm* is page 6 of the Ohio State PDF); the Morton entries are upper-line excerpts. Their metadata and visible captions disclose omitted accompaniment, chord interiors, articulations, repeats, practice tempos, and the written-pitch octave study in New Orleans Blues. The complete original pages remain available beside each excerpt. Engraved player notation is not presented as a complete arrangement or as an archival recording.

Source editions and pages inspected on 2026-10-13. Validate score syntax, durations, and engraving with `npm run check:scores`; this structural check does not independently establish transcription accuracy.
