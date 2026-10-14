# Fake Book Guitar Pro imports

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
instrument (Vocals, Lead, Sax, Trumpet…), else the first with a voice, wind,
brass, violin or lead-synth sound, else the first track. In chord-melody parts
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
