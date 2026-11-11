# Composer score workspaces

All 16 `lessons/music/pioneers/` lessons open with the composer's name, portrait and
brief biography, immediately followed by the shared sheet-music workspace,
notation renderer and audio path. Source data lives in `data/score-library.json`;
`data/composer-workspaces.json` selects the repertoire for each lesson.

- `assets/js/composer-arrangement.js`: pure, source-preserving transformations.
  Extracted voices copy the original first staff's repeat/key/time road map.
  Sax parts transpose notation by a major sixth / major ninth, with the opposite
  playback offset so both the player and click-to-hear stay at concert pitch.
  Piano studies reduce larger ensembles to selected upper voice plus source bass.
- `assets/js/lessons/composer-studio.js`: shared controls, tab, arrangement save/open,
  print appendices and player disposal. The score player handles zoom, seek, loop,
  tempo, source-part mutes, readable print pagination and instrument overrides.
- `assets/js/score-engine.js`: prepares recordings before explicit playback,
  cancels pending starts on Stop, disposes observers/listeners for replaced scores,
  bounds active voices and stops audio when the page is hidden.
- `assets/js/music-synth.js` / `music-sampler.js`: shared instrument API.
  Recorded instruments load on demand, with explicit synthesis fallback and an
  optional synthesis-only mode. Recordings preserve their attack/resonance; a
  velocity envelope, brightness filter and shared early reflections provide light
  processing. The sampler also supports OfflineAudioContext, release, kill and glide.

Five lessons with no existing transcribed scores (Tárrega, Reinhardt, Ellington,
Armstrong and Parker) have short, original CC0 classroom studies, explicitly
identified as such. They are not transcriptions of the featured musicians' work.
Existing repertoire retains its public-domain/edition credits and full-score links.
The prepared guitar-chord chart is limited to the Ode to Joy theme; other classical
harmonies are not guessed from the melody.

## Verification

Start `node serve-local.js`, then run:

- `npm run check:scores` — all scores, sources, guide coverage and narrow engraving.
- `npm run check:composers` — pure arrangement checks and all 16 real lesson pages,
  240 rendered combinations, mobile/desktop fit and recorded playback.
- `npm run check:instrument-samples` — file hashes and size budget; all 139 recordings
  decode, 17 instruments render audibly offline with matching pitch and working release;
  canceled future attacks remain silent.
- `npm run check:score-workspace` — navigation, fit, scrolling, fullscreen, seek and
  complete score pagination on desktop and phone.
- `npm run a11y:page -- lessons/music/pioneers/` — accessibility of all composer lessons.

Set `SCORE_TEST_URL` to use an existing server on a different port.
See `assets/audio/instruments/README.md` for sample licenses, processing, caching,
rebuild instructions and fidelity limits. Compact samples improve timbre but do not
replicate a musician's complete articulation, phrasing, dynamics or ensemble blend.
