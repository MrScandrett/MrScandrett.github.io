# Music Lab processors

These are original educational digital processors, not calibrated reproductions of commercial hardware. The EQ and chorus panels use Music Lab layouts and palettes. Their controls describe the implemented signal path.

- **Five-band insert EQ:** low/high shelves and three bell filters. Proportional Q optionally narrows each bell with increasing absolute gain (`base Q × (1 + |gain| / 12)`). Output trim supplies headroom after boosts. Existing presets default to constant Q and unity trim. Frequencies stop below Nyquist.
- **Channel EQ:** a separate four-band EQ with optional cascaded low-pass. Imported numeric values are checked and bounded before reaching AudioParams.
- **Chorus:** stereo delay lines centered at 18 ms, driven by opposite-polarity sine modulation. Wet audio passes a 100 Hz high-pass and adjustable low-pass. Mono inputs feed both sides; stereo inputs retain their channel paths. Mix is linear. No BBD, compander, noise or circuit model.
- **Compressor:** native Web Audio dynamics with adjustable attack, release, knee and makeup, plus parallel compressed blend. Makeup affects the compressed branch only.
- **Punch Compressor:** custom stereo-linked RMS dynamics, automatic time constants and a detector-only high-pass to reduce bass pumping. Detector low cut does not filter audible audio. The native compatibility path cannot implement detector low cut.
- **Delay:** adjustable low-pass inside the feedback loop darkens successive repeats. Feedback remains below unity.
- **Reverb:** deterministic stereo convolution with pre-delay, wet-path low cut and high cut.
- **Studio Reverb:** custom eight-line feedback delay network. Compatibility convolution disables browser impulse normalization to retain the algorithm's gain; its impulse is rebuilt when reinstalling the fallback. Compatibility mode freezes the modulated algorithm into an impulse and is not identical to the running network.
- **Distortion:** nonlinear waveshaping with 4× oversampling and a 20 Hz DC-blocking filter before tone shaping. Oversampling reduces aliasing, but does not eliminate it.
- **Limiter:** fast native compression followed by a hard sample clip at the selected ceiling. It can distort overloads. This is not a true-peak limiter; intersample overshoot remains possible. Ceiling changes are smoothed, so the new ceiling takes time to settle.

Existing projects retain their saved controls; new controls use defaults. Chorus, filtered delay, distortion and fallback-reverb changes can change the sound of older mixes. Live playback and WAV export use these same processor definitions.

Run `npm run test:daw` and `node scripts/check-music-effects.mjs` with the local server running. The browser audio check renders actual OfflineAudioContext output rather than inspecting node wiring alone.
