# Handel: sources, licences and verification

Retrieved 2026-11-19 for the new composer lesson `lessons/music/pioneers/handel.html`.
The page is generated from `composers.py` by `../composer-favorites/make_pages.py`;
`reproduce.sh` rebuilds every score and merges it into `data/score-library.json` and
`data/composer-workspaces.json` through `library.py` (metadata in `library.py` and `library_extra.py`).

## Sources and licences

| Library ID | Edition | Licence | Source |
| --- | --- | --- | --- |
| handel-hallelujah | Mutopia 459, Joshua Koo: full score (oboes, bassoons, trumpets, timpani, strings, SATB) | Public domain | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=459 |
| handel-zadok-1 / -2 / -3 | PDMX 1248731 (MuseScore), full score SSAATBB + orchestra, split at its tempo changes | CC0 1.0 | https://zenodo.org/records/15571083 |
| handel-rejouissance | PDMX 5769837 (MuseScore), full orchestra with written-out repeats; the edition's crash cymbal (part P17) is removed | CC0 1.0 | https://zenodo.org/records/15571083 |
| handel-sarabande | PDMX 6400891 (MuseScore), “Zarabanda” from the Suite No. 11 in D minor, HWV 437: the theme with its repeat, without the variations (labelled an excerpt) | CC0 1.0 | https://zenodo.org/records/15571083 |
| handel-air | Mutopia 162, Bas Wassink, Aylesford Pieces after Schott (1930) | Public domain | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=162 |
| handel-gavotte | Mutopia 151, Bas Wassink, Aylesford Pieces after Schott (1930) | Public domain | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=151 |
| handel-sonatina | Mutopia 98, after Händels Werke (1859), HWV 585 | Public domain | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=98 |

`pdmx-rows.json` keeps the PDMX dataset rows (all `license_conflict=False`). Portrait: Thomas Hudson,
National Portrait Gallery, London, public domain via Wikimedia Commons
(`File:George_Frideric_Handel_by_Thomas_Hudson.jpg`), resized to `assets/images/lessons/composers/handel-hudson.webp`.

## MIDI verification

LilyPond 2.26 was used for the Mutopia sources (`import.sh`; convert-ly updated the 2.16/2.19 syntax).

| Score | Result |
| --- | --- |
| handel-hallelujah | 4927/4927 notes; 121 duration differences are unisons between parts (the check pairs them differently) |
| handel-air | 204/204, no differences |
| handel-gavotte | 240/240; 84 staccato notes are shorter than LilyPond's MIDI plays them |
| handel-sonatina | 231/231, no differences |
| handel-sarabande | 332/332 exact once the closing repeat barline is added (`add-final-repeat.py`; the bridge does not read barlines) |
| handel-rejouissance | 4354 exact; MIDI-only notes are the removed cymbal (170) and unisons |
| handel-zadok (before splitting) | 10370/10370 exact after shifting the MIDI back 4 beats from bar 63: MuseScore's MIDI holds the bar-62 fermata for an extra bar. MIDI-only notes are played-out trills and unisons |

`../../slice-bars.py` splits Zadok into its three sections (bars 1–30 Andante maestoso, 31–62 Allegro in 3/4,
63–121 Allegro moderato) because the engine plays one tempo per score. The three slices hold exactly the
10,418 notes of the whole converted score.

The Mutopia La Réjouissance (id 1864, trumpet and organ) was considered and not used: it is transposed to
B♭ for B♭ trumpet, and the orchestral edition is closer to Handel.

Playback: the choir staves use the clarinet (S, A, T) and bassoon (B) samples, as the Fauré Pavane does, since
there are no voice recordings; La Réjouissance's contrabassoon reaches A1, below the bassoon samples, so it plays
with the double-bass recordings (`tests/score-ensemble-tuning.test.mjs`).
