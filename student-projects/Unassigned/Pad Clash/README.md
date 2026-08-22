# Pad Clash

A browser-based dance fighting game built for the Akai MPD226.

## Play

1. Run `npm start`.
2. Open `http://localhost:3000` in Chrome or Edge.
3. Click **Connect** and allow MIDI access.
4. Select a battle track.
5. Start the battle and hit the prompted pad as it reaches the **HIT ZONE**.

Keyboard fallback: `A S D F J K L ;`

The eight controls are preset to MIDI notes **36–43**, matching the chromatic pad layout used by the MPD226. **Map My Pads** remains available if your current MPD preset sends different notes.

Timing grades are Perfect, Great, and Good. Wrong pads and missed notes break your combo and let DJ Void score. The three built-in charts range from 112 to 136 BPM and use generated drum and bass accompaniment.

The mapping is saved in the browser. Web MIDI requires a secure context; `localhost` is supported.
