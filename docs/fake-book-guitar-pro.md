# Fake Book Guitar Pro imports

## Original score player

GP3–8 imports now also open a separate alphaTab original-score player above the
lead sheet. It reads the original bytes, rather than the simplified MusicXML
conversion, and supplies synchronized staff/tab, click-to-seek, drag selection,
selection/whole-song looping, speed, metronome, track visibility, mute, solo and
volume. Playback uses the locally bundled Sonivox synthesizer soundfont, including
percussion and the file's instrument programs and tempo changes. Lyrics, chord
diagrams, section markers, tuning, capo and techniques use alphaTab's native
support. This is a read-only score and practice player: note editing, custom sound
banks, scale-shape exploration and a separate pan control are not implemented.
Original pan settings are used by the synthesizer. It does not reproduce Guitar
Pro's proprietary RSE audio.

Successful lead-sheet imports retain the original bytes (base64) in the existing
browser import store and restore the player when the tune is reopened. Removing
the imported tune removes those bytes too. Older imports need re-importing. If
lead-sheet conversion rejects a score (including percussion-only scores), the
original player can still play it for this session, but it is not saved in Your
imports. Its status reports native loading errors separately. The original player
and lead-sheet player stop each other before playback; switching songs destroys
the old original player and its workers.

The full renderer, workers, font and soundfont are vendored by the existing
`build:guitar-pro-reader` command and loaded only for original-score playback.
Original player code is `assets/js/lessons/fake-book-gp-player.js`. Browser check:
start `node serve-local.js`, then run `node scripts/check-fake-book-gp-player.mjs`
(with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if needed).

## Simplified lead-sheet conversion

The file picker and connected Google Drive import accept:

| Version | Filename | Reader |
| --- | --- | --- |
| GP1 / GP2 | `.gtp` | Existing LGPL 2.1 TuxGuitar adaptation |
| GP3 | `.gp3` | alphaTab 1.8.4 |
| GP4 | `.gp4` | alphaTab 1.8.4 |
| GP5 | `.gp5` | alphaTab 1.8.4 |
| GP6 | `.gpx` | alphaTab 1.8.4 |
| GP7 / GP8 | `.gp` (also `.gp7` / `.gp8` filename variants) | alphaTab 1.8.4 |

Version detection uses file contents. The modern reader also dispatches original
GP1/GP2 headers to the existing legacy reader, so a supported score renamed with
another accepted Guitar Pro extension can still be read.

The modern adapter preserves pitched tracks and voices, sounding pitches,
rhythms, chords of simultaneous notes, rests, ties, repeat counts, alternate
endings, time signatures, string tuning, capo and physical string/fret positions.
It converts into MusicXML for the existing Fake Book score player, arrangement
view, part mute/solo and practice controls. Playback uses synthesized piano.

The lead sheet's melody comes from the first track named for a voice or lead
instrument (Vocals, Lead, Solo, Sax, Trumpet…), else the first with a voice, wind,
brass, violin or lead-synth sound, else the first sounding non-accompaniment track (falling back to the first track).
Rhythm/accompaniment names, including French “rythmique,” and bass instruments
are excluded from the lead search. Rehearsal markers and section names survive
import and repeats, and label the lead sheet. Re-import previously saved scores
to apply these improvements.

In chord-melody parts
(solo guitar), lone bass notes more than an octave below the melody on both
sides are left out of the melody; they still play in the score and bass staff.

Guitar effects, grace/dead notes, dynamics, swing, percussion, tempo changes and
embedded backing audio are not performed. Supported authored chord changes are
preserved across tracks, while missing chords are inferred from sounding notes
as practice suggestions. Switch Play to *Play practice chord voicings* to hear
connected guitar grips or piano voicings in time with the score. Harmonic notes retain
their sounding pitch and physical fret, without the technique annotation.
Double-coda and double-segno navigation produces a clear error recommending an
expanded MusicXML export. Ordinary D.C./D.S., Fine and Coda use the shared
MusicXML road-map reader. Source bars longer than their meter retain their full
written duration and produce a warning.

Limits: 8 MB input, 16 MB decoder buffers, 400 written/expanded bars, 64 pitched
staves and 100,000 written pitched notes. Empty, invalid and rest-only scores
produce an import error without replacing the selected tune.

The decoder is vendored locally and loaded only on the first Guitar Pro 3–8
import. Scores are decoded in the browser. Rebuild the pinned bundle with
`npm run build:guitar-pro-reader`; licensing/source notices are in
`assets/vendor/alphatab/NOTICE.md` and linked in the import panel.

Focused tests: `node --test tests/fake-book-guitar-pro.test.mjs tests/fake-book-gtp.test.mjs`.
The fixture directory contains attributed synthetic upstream notation tests and
the tests generate a local GP7 score for meter/tuning/capo round-trip coverage.
