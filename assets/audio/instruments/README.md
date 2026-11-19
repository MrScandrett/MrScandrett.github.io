# Recorded practice instruments

The composer score players load only the sample roots needed by the selected
score/instrument after an explicit Play gesture. No samples download on page load.
The bundled bank is about 12.1 MiB; an individual piece uses a subset.
The decoded cache is shared within its AudioContext and capped at 96 MiB with LRU
eviction. Active voices retain their buffers until released.

## Sources and attribution

- **Nicholaus P. Brosowsky, Tonejs-Instruments sample collection**:
  https://github.com/nbrosowsky/tonejs-instruments
  Samples are released under **Creative Commons Attribution 3.0**:
  https://creativecommons.org/licenses/by/3.0/
  See TONE-LICENSE.md and TONE-SOURCES.txt for the publisher's license and original
  recording sources (VSCO 2, Karoryfer, University of Iowa and Freesound contributors).
- **VSCO 2 Community Edition**, recorded by Sam Gossner and Simon Dalzell;
  sample cutting by Elan Hickler / Soundemote:
  https://github.com/sgossner/VSCO-2-CE
  Oboe, viola, dedicated violin/viola/cello sections, and timpani recordings are **CC0 1.0** (VSCO-LICENSE.txt).

`manifest.json` records each original file URL, pinned revision, root pitch,
license, file size and SHA-256. `sources.json` locks the upstream revisions.
Rebuild with `python3 scripts/build-instrument-samples.py` (requires ffmpeg).

## Processing and limits

The recordings were converted to mono 32 kHz / 64 kb/s MP3, leading silence was
trimmed, peaks normalized to -3 dB, and duration capped at six seconds. Dedicated string-section and timpani recordings retain stereo at 44.1 kHz /
160 kb/s with up to eight seconds per recording. Sustained
instruments retain the first 4.2 seconds in decoded memory and use a 120 ms
crossfade loop built once during decoding. Piano,
guitar, harp and bass keep their natural recorded decay. Nearby notes are
resampled from sparse roots; notes more than seven semitones from a root use
the synthesized fallback rather than extreme transposition. Each score player adds
three quiet, filtered early reflections on a shared mix bus, with no per-note reverb.

Playback preserves each recording's attack and resonance, with velocity-dependent
level and low-pass brightness. The score player routes orchestral violin, viola,
and cello parts to section recordings, and keeps explicitly solo parts on solo banks.
String-section envelopes use a gentler attack and a longer release. The sampled
low-pass range preserves more woodwind breath, brass overtones, and bow texture.
The timpani sample roots follow the publisher's pinned SFZ mapping, recorded in sources.json. It is a compact practice instrument, not a
multi-velocity concert library or a reproduction of a live musician's phrasing,
bowing, tonguing, breath changes, room, or instrument-specific articulation.
The generic Strings option outside ensemble routing uses solo violin.
Electric piano, pad, and synth remain synthesized. Parts outside the available
sample ranges use synthesis. The section banks have one recorded dynamic layer,
with velocity shaping applied during playback. Users can select lightweight synthesis for any score.

## Tuning

Every root was measured against its label with `python3 scripts/measure-sample-tuning.py` (ffmpeg + numpy;
2026-11-19). Upstream `clarinet/Fs6.mp3` sounds F6 (−98 cents), so it is stored as `clarinet/89.mp3`; as F♯6 it
put every clarinet note from D♯6 to A6 a semitone flat in orchestral tuttis. Roots 8 or more cents off their
label (harp, xylophone, one trumpet, pluck and two violin roots) carry a `cents` field that `music-sampler.js`
cancels with `detune`. Piano is left alone: its upper-octave stretch tuning is deliberate. Both corrections live in
`RELABEL` and `CENTS` in `scripts/build-instrument-samples.py`, so a rebuild keeps them, and
`npm run check:instrument-samples` now renders every root and fails on a wrong label.
