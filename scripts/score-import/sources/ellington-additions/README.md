# Ellington additions · 2026-11-15

`python3 scripts/score-import/sources/ellington-additions/import.py` rebuilds only
three named entries in `data/score-library.json`. The lesson catalog selection is
in `data/composer-workspaces.json`. These are eight-bar teaching excerpts, not
complete works, full piano editions or transcriptions of Ellington recordings.

| Entry | Edition and scan | Scope |
| --- | --- | --- |
| `ellington-black-beauty` | Jack Mills, New York, 1928; musical p.3 prints Gotham Music Service copyright; [IMSLP #922452](https://imslp.org/wiki/Black_Beauty_(Ellington,_Duke)), scanned by Kosboot | Bars 5–12, following the four-bar introduction: upper melody and lowest left-hand chord tones. |
| `ellington-jig-walk` | Robbins-Engel, 1925, plate SH 232, printed p.3; [IMSLP #941792](https://imslp.org/wiki/Jig_Walk_(Ellington,_Duke)), scanned by Kosboot | Bars 9–16: first eight vocal-verse bars after eight piano introduction bars. Vocal melody and selected lowest piano-bass attacks. Independent piano RH omitted. Melody: Duke Ellington; lyric: Jo Trent; ukulele arrangement: Hank Linet. |
| `ellington-ring-dem-bells` | Harms, 1930, plate 8565, printed p.3; [IMSLP #1009864](https://imslp.org/wiki/Ring_Dem_Bells_(Ellington,_Duke)), scanned by Kosboot | Bars 1–8: top piano line for four introduction bars, then vocal melody; lowest bass retained. High piano response marked Bells in bars 7–8 omitted. Duke Ellington and Irving Mills; ukulele arrangement: S. M. Zoltai. |

Inner chord tones, lyrics, ukulele diagrams, slurs, dynamics and expressive timing
are omitted. Printed ties are retained where the selected voice continues. Rhythms
play as written at a classroom practice tempo; swing and a historical performance
are not inferred. Source bar numbers are counted from the first music bar.
Black Beauty bar 12 has a sixteenth-note turn followed by a dotted half: its
curves are slurs, not ties.

The historical editions are public domain **in the United States** (published
1925, 1928 and 1930), not a worldwide copyright assertion. No modern arrangements,
recordings or notation encodings are copied. New transcription code and readings
are dedicated to CC0 1.0. The lyric/ukulele contributors are credited for the
source editions; their words and diagrams are not included in the playable data.

## Reproducing the source images

The PDFs were downloaded from the US Petrucci server:

- https://www.petruccilibrary.us/files/imglnks/music_files/PMLUS05929-Ellington%2C_Black_Beauty.pdf
- https://www.petruccilibrary.us/files/imglnks/music_files/PMLUS06127-Ellington%2C_Jig_Walk.pdf
- https://www.petruccilibrary.us/files/imglnks/music_files/PMLUS07768-Ellington%2C_Check_and_Double_Check%2C_Ring_Dem_Bells.pdf

Render PDF page 3 for Black Beauty and Ring Dem Bells at 160 dpi, and PDF page 2
for Jig Walk at 200 dpi with Ghostscript (`png16m`, SAFER, BATCH, NOPAUSE). Resize
the full page to width 1400 using Sharp and encode WebP quality 86. Preserve the
page's credits and copyright notice. `provenance.json` records input and output
SHA-256 hashes. The locally deployed pages open in the lesson photo lightbox.

The Ring Dem Bells page references Amos ’n’ Andy; the lesson supplies context
about the racist stereotypes associated with the source film. The player uses
instrumental notes only.

## Verification

- `npm run check:scores`
- `COMPOSER_TEST_FILTER=duke-ellington node scripts/check-composer-studios.mjs`
  with `node serve-local.js` running
- `npm run check:integrity`
- `npm run check:themes`
- `npm run a11y:page -- lessons/music/pioneers/duke-ellington.html`

These checks cover notation structure, bar lengths, guide coverage, arrangements,
rendering, playback and accessibility. They do not certify a critical edition;
compare the lightbox source pages when preparing a performance.
