# Seasonal melody sanity check — 2026-11-10

Scope: melody pitches, relative note lengths, pickups, phrase endings, and form in `data/fake-book.json`. Simplified band chords are editorial accompaniments. This is a source comparison, not a claim that one setting is the only traditional version.

## Corrections

| Tune | Finding and correction | Melody score |
| --- | --- | --- |
| Deck the Halls | Restore F-sharp in bar 11's ascending line, in concert C. | https://www.flutetunes.com/tunes.php?id=266 |
| The First Noel | Replace distorted verse/refrain with the source's 24-bar form; restore passing eighth notes and final third of the tonic chord. | https://www.flutetunes.com/tunes.php?id=282 |
| We Wish You a Merry Christmas | Restore repeated eighth notes in the good-tidings phrase. | https://www.flutetunes.com/tunes.php?id=276 |
| O Christmas Tree | Replace stretched 26-bar form with the source's 12-bar setting and its short repeated notes. | https://www.flutetunes.com/tunes.php?id=270 |
| Jolly Old Saint Nicholas | Restore lower sixth-degree phrase and different dominant/tonic endings. Double the source's note lengths for the existing 4/4 classroom form. | https://www.flutetunes.com/tunes.php?id=275 |
| Away in a Manger | Restore Mueller's dotted rhythms and middle phrase; explicitly distinguish it from Cradle Song. | https://www.flutetunes.com/tunes.php?id=278 |
| Up on the Housetop | Restore verse pitches, repeated-note rhythm, and the Ho-ho-ho chorus. Transpose the linked F-major melody to C. | https://violinsheetmusic.org/files/download/title/up-on-the-housetop.pdf |

The corrected charts cite their specific notation sources. Final rest padding completes practice measures where the source has a shorter ending. Chord forms were adjusted where the melody's form changed.

## Retained after comparison

- Jingle Bells: chorus matches the melody in https://www.flutetunes.com/tunes.php?id=239 after transposition to G.
- Silent Night: matches https://www.flutetunes.com/tunes.php?id=187 with doubled note lengths and a prolonged final tonic.
- Good King Wenceslas: matches the first verse of https://www.flutetunes.com/tunes.php?id=248 after transposition to C.
- Ma’oz Tzur, Oh Hanukkah, Sevivon, Dayenu, Pat-a-pan, Fum Fum Fum, and Sakura Sakura: pitched note sequences and onset rhythms match their existing linked flute melody sources after the documented octave/form adjustments. Final rest padding is editorial.
- Shchedryk: the selected phrases match the cited melody line; the short classroom form deliberately omits repetitions and choral voices.

## Remaining verification limit

Xīn Nián Hǎo passes notation/meter checks and its existing citation identifies the intended New Zealand Choral Federation version. That score was not independently retrieved during this pass; its exact rhythm remains unverified. Do not treat the whole seasonal collection as a critical edition.

## Validation

`node --test tests/fake-book-library.test.mjs tests/fake-book-musical-accuracy.test.mjs`

Includes meter/chord-form checks across the entire library, parser checks, and specific source phrase/cadence regressions for the corrected seasonal entries. No player or notation-rendering code changed.
