# Lightweight recorded instruments

The composer score players load only the sample roots needed by the selected
score/instrument after an explicit Play gesture. No samples download on page load.
The entire sparse bank is about 5.7 MiB; an individual piece uses a subset.
The decoded cache is shared within its AudioContext and capped at 48 MiB with LRU
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
  Additional oboe and viola recordings are **CC0 1.0** (VSCO-LICENSE.txt).

`manifest.json` records each original file URL, pinned revision, root pitch,
license, file size and SHA-256. `sources.json` locks the upstream revisions.
Rebuild with `python3 scripts/build-instrument-samples.py` (requires ffmpeg).

## Processing and limits

The recordings were converted to mono 32 kHz / 64 kb/s MP3, leading silence was
trimmed, peaks normalized to -3 dB, and duration capped at six seconds. Sustained
instruments use an 80 ms crossfade loop built once during decoding. Piano,
guitar, harp and bass keep their natural recorded decay. Nearby notes are
resampled from sparse roots; notes more than seven semitones from a root use
the synthesized fallback rather than extreme transposition. Each score player adds
three quiet, filtered early reflections on a shared mix bus, with no per-note reverb.

Playback preserves each recording's attack and resonance, with velocity-dependent
level and low-pass brightness. It is a compact practice instrument, not a
multi-velocity concert library or a reproduction of a live musician's phrasing,
bowing, tonguing, breath changes, room, or instrument-specific articulation.
Strings currently reuse solo-violin samples for the generic Strings option.
Electric piano, pad, synth and timpani remain synthesized and are identified in
the player. Users can select lightweight synthesis for any score.
