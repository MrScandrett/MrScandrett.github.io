# Music Lab processors

Music Lab includes 14 Web Audio processors (7 built-in, 5 curated browser plugins, and 2 AudioWorklet studio engines). Twelve of these are designed and modeled after legendary studio hardware—with authentic signal-flow topologies, vintage faceplates, live VU/GR metering, and classic presets—while preserving full backward compatibility with saved `.mlab.zip` projects and offline WAV export.

- **1176-LN FET Compressor (`compressor`):** Fast FET-style dynamics inspired by the UREI 1176LN Rev D Blackface, featuring 4:1 / 8:1 / 12:1 / 20:1 / All-Buttons-In ratio modes, parallel compressed blend, and a 2× oversampled Class-A FET output saturation stage.
- **LA-2A Optical Leveler (`browser-opto-2a`):** Tube optical leveling amplifier inspired by the Teletronix LA-2A, combining HF pre-emphasis/de-emphasis, program-dependent soft-knee optical compression (Compress / Limit modes), and warm 12AX7/12BH7 triode saturation.
- **160A Punch Compressor (`punch-compressor`):** Custom stereo-linked RMS dynamics inspired by the dbx 160A OverEasy, with automatic time constants and a detector-only high-pass to reduce bass pumping. The native compatibility path cannot implement detector low cut.
- **670 / L1 Mastering Limiter (`limiter`):** Vari-mu tube warmth inspired by the Fairchild 670 feeding fast native compression and a hard sample-peak safety clip at the selected ceiling. Not a true-peak limiter; intersample overshoot remains possible.
- **EQP-1A Tube Program EQ (`browser-pultec-eq`):** Passive LC program equalizer inspired by the Pultec EQP-1A, pairing an offset low-boost/low-atten shelf architecture (for the classic Pultec low-end trick) with a variable-bandwidth high boost, high attenuation shelf, and push-pull tube saturation.
- **8200 Parametric EQ (`eq`):** Five-band mastering equalizer inspired by the GML 8200 and API 5500, with low/high shelves, three bell filters, optional proportional Q (`base Q × (1 + |gain| / 12)`), and calibrated output trim. Frequencies stop below Nyquist.
- **1073 Class-A Preamp & EQ (`browser-neve-pre`):** Class-A transformer mic preamp and 3-band inductor-style EQ inspired by the Neve 1073, with Marinair-style asymmetric transformer saturation, stepped 50/80/160/300 Hz 12 dB/oct HPF, 110 Hz low shelf, selectable mid bell, and fixed 12 kHz air shelf.
- **808 / RAT Vintage Drive (`distortion`):** Switchable analog dirt circuits—TS-808 diode overdrive, RAT op-amp clip, Muff sustain fuzz, and Tweed tube saturation—with circuit-specific pre-EQ, 4× oversampling, and a 20 Hz DC-blocking filter before tone shaping.
- **A800 Studio Tape Machine (`browser-tape-color`):** Analog 2-inch tape emulation inspired by the Studer A800, featuring selectable 7.5 / 15 / 30 IPS head-bump curves and HF roll-off, 4× oversampled magnetic hysteresis saturation, and tape flutter modulation.
- **RE-201 Space Tape Echo (`delay`):** Multi-head magnetic tape echo inspired by the Roland RE-201 Space Echo, with 1 / 2 / 3 selectable playback heads, 140 Hz HPF, low-pass tone, feedback tape saturation, and motor flutter.
- **'63 Spring & Plate Reverb (`reverb`):** Deterministic stereo convolution offering three switchable vintage tank models: ’63 Tube Spring (dispersive chirp + spring modes), EMT-140 Steel Plate, and Abbey Studio Chamber, with pre-delay, wet low cut, and tone control.
- **Studio Reverb (`studio-reverb`):** Custom eight-line feedback delay network (SR-2016 digital style). Compatibility convolution disables browser impulse normalization to retain the algorithm's gain.
- **CE-1 / Juno Analog Chorus (`chorus`):** Stereo BBD-inspired modulation with switchable CE-1 Classic, Juno-60 Twin, and CE-1 Vibrato modes, opposite-polarity sine modulation, 100 Hz wet high-pass, and adjustable low-pass.
- **'65 Opto-Tremolo (`browser-pulse-tremolo`):** Switchable modulation circuits: ’65 Blackface Opto, ’61 Brownface Harmonic dual-band (700 Hz crossover modulated 180° out of phase), Vox Bias (triangle LFO), and Rhodes Stereo Auto-Pan.
- **Channel EQ:** Separate four-band console strip EQ with optional 24 dB/oct resonant low-pass.

Existing projects retain their saved controls; new controls use defaults. Live playback and WAV export use these same processor definitions.

Run `npm run test:daw`, `node scripts/check-music-effects.mjs`, and `node scripts/check-music-hardware-vst.mjs` with the local server running. The browser audio checks render actual `OfflineAudioContext` output rather than inspecting node wiring alone.
