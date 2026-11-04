# Music Lab patch panel

Open **Patch bay** below Track Studio. Every registered `AudioEffects` processor
appears automatically as an open IN/OUT pair; it consumes audio resources only
when patched. Each unit has its own Settings. Channel insert instances also have
paired sockets, labeled by channel and slot. The studio signal map lists channel
sources, modules, internal processing, inserts, buses and output.

Drag output to input (the page scrolls near the screen edges), or select the two
sockets with clicks / Tab and Enter. Escape cancels. Click a cord or its named
Unplug button to remove it. Expand patch panel opens the whole panel fullscreen.
Each audio socket represents a stereo pair; MIDI sockets carry messages.

Useful routes:

- **Channel insert:** channel SEND → Compressor IN; Compressor OUT → EQ IN;
  EQ OUT → channel RETURN. This replaces the channel's direct EQ-to-inserts
  normal, retaining its existing inserts, mute, fader, pan and sends.
- **Individual insert:** channel SEND → rack processor IN; processor OUT →
  channel insert slot IN. That slot's input normal breaks. Its OUT remains a
  half-normalled tap, allowing another processor before the next slot.
- **Master insert:** Main OUT → rack processor IN; processor OUT → Monitor IN.
  The final safety processor stays downstream.
- **Effects-return processing:** Return A OUT → rack processor IN;
  processor OUT → Main mix IN. Return A's default feed to main breaks.
- **Parallel processing:** channel direct OUT → rack processor IN;
  processor OUT → Main mix IN. Unplug the channel's default main cable for a
  processed-only path; otherwise the dry and processed paths sum.

Processor, insert-return, slot and monitor inputs accept one cable; a new patch
replaces the old cable. Main, aux and channel inputs are summing buses. Output
fan-out acts as a software mult. Insert sends and channel slot outputs are
half-normalled taps. Effects returns break their main normal when patched out;
monitor input breaks its main normal when patched in. Feedback cycles, stale
ports and audio/MIDI mismatches are rejected. Removed or bypassed insert slots
lose their cables; Undo restores the prior saved configuration.

Audio routes and rack settings are saved with the project, restored by Undo,
and used by both realtime mixing and offline WAV/stem rendering. MIDI patches
select the one armed instrument; arming is intentionally session-only, matching
existing recorder behavior. Recorded MIDI playback remains independent.

Native VST companion inventory and channel assignments are shown separately.
The companion supports discovery and launch, not browser audio transport. Its
ports (and unhosted WAM assignments) cannot be patched into this audio engine.
Physical input selection and microphone monitoring use the recorder controls.

Implementation: `music-patch-routing.js` validates a directed graph including
implicit channel, aux and main paths, then connects the same graph in live and
offline mixers. `music-patch-bay.js` presents the sockets and cords. The Qu-7
workspace loads the routing module too, so switching workspaces retains audio
routing. Run `node --test tests/music-patch-bay.test.mjs` and, with the local
server running, `node scripts/check-music-patch-bay.mjs` for graph, persistence,
responsive layout, dragging and measured browser DSP checks.
