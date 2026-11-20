# Beethoven: Symphony No. 9, finale (“Ode to Joy”), section by section

Retrieved 2026-11-19. The Beethoven lesson's “Ode to Joy” was the 16-bar melody only. The finale is now in the
library as eight sections, in order, under **Orchestra · Symphony No. 9 · finale** in the Beethoven studio. The
melody-only score was then removed: it duplicated Ode to Joy in the Fake Book, which the lesson now links to.

## Source and licence

PDMX row 192793 (MuseScore), “Beethoven Symphony No. 9 (4th movement) Piano solo with chorus”, subtitled
“Fourth Movement (Choral)”, marked “Adp. from arrangements”: solo and choir voices (two staves each, S&A and
T&B) with the orchestra as a two-hand piano reduction. CC0 1.0, `license_conflict=False` (`pdmx-rows.json`).
Dataset: https://zenodo.org/records/15571083.

Bar numbers follow the edition, which starts at bar 0. They agree with Beethoven's full score (Allegro assai at 92,
recitative at 216, Alla marcia at 331, choir's “Freude” at 543); after the march the edition is 12–15 bars shorter
than the full score (Andante maestoso at 580 instead of 595; the movement ends at 928 instead of 940), and the
library's source note says so.

## Why sections

The score engine plays one tempo per score and the finale has about fifty tempo marks. Each section with one main
tempo is its own score (`../../slice-bars.py`, `build.py`), marked `excerpt` with its bar range, tempo from
Beethoven's metronome marks where he gave one:

| Library ID | Edition bars | Tempo |
| --- | --- | --- |
| beethoven-9-finale-theme | 92–206 | Allegro assai, half = 80 |
| beethoven-9-finale-recitative | 215–235 | Recitativo (practice quarter = 72) |
| beethoven-9-finale-chorus | 236–330 | Allegro assai, half = 80 |
| beethoven-9-finale-march | 331–579 | Alla marcia, dotted quarter = 84 |
| beethoven-9-finale-seid-umschlungen | 580–641 | Andante maestoso, half = 72 (Adagio from 613) |
| beethoven-9-finale-double-fugue | 642–750 | Allegro energico, dotted half = 84 |
| beethoven-9-finale-allegro | 751–838 | Allegro ma non tanto, half = 120 |
| beethoven-9-finale-prestissimo | 839–928 | Prestissimo, practice half = 136 |

Not included: the opening Presto and instrumental recitatives with their quotations of movements I–III (bars 0–91)
and the eight-bar Presto fanfare before the baritone (207–214); both change tempo every few bars.

## MIDI verification

`section-midi-check.mjs` compares each section with the edition's own MIDI after finding the one time shift that
lines the section up (MuseScore's MIDI adds time at fermatas: 0 beats before bar 580, 45 after).

| Section | Ours | Exact | Notes |
| --- | --- | --- | --- |
| 92–206 | 1725 | 1725 | 25 MIDI-only (unisons MIDI sounds twice) |
| 215–235 | 124 | 124 | none |
| 236–330 | 2989 | 2989 | 68 MIDI-only unisons |
| 331–579 | 3922 | 3842 | 80 of ours a beat off the MIDI around held notes; 126 MIDI-only |
| 580–641 | 1260 | 1260 | 48 MIDI-only unisons |
| 642–750 | 2012 | 1997 | 15 of ours in one chord the MIDI holds over a pause |
| 751–838 | 2390 | 2389 | 1 note |
| 839–928 | 2273 | 2273 | 58 MIDI-only unisons |
