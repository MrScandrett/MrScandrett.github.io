# Composer score workspaces

The 23 score-enabled `lessons/music/pioneers/` lessons open with the shared
sheet-music workspace or a brief portrait introduction immediately before it.
They share the notation renderer and audio path. Source data lives in `data/score-library.json`;
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

Five lessons (Tárrega, Reinhardt, Ellington, Armstrong and Parker) include short,
original CC0 classroom studies, explicitly identified as such. Tárrega also has
complete scores for Adelita and Capricho árabe. They are not transcriptions of the featured musicians' work.
Existing repertoire retains its public-domain/edition credits and full-score links.
The prepared guitar-chord chart is limited to the Ode to Joy theme; other classical
harmonies are not guessed from the melody.

## Verification

Start `node serve-local.js`, then run:

- `npm run check:scores` — all scores, sources, guide coverage and narrow engraving.
- `npm run check:composers` — pure arrangement checks and all 23 real lesson pages,
  all catalog scores in eight arrangement modes, mobile/desktop fit and recorded playback.
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

## Instrument arrangement audit

Extracted violin lines use a classroom range of G3–E7 (not a beginner difficulty rating). Extracted guitar and four-string bass lines fit
standard tuning through fret 19 (sounding E2–B5 and E1–D4 respectively). Whole-line
octave shifts are preferred; remaining outliers move by octaves. The workspace
reports these edits because the resulting leaps still need a player's review.
Guitar/bass notation reads an octave above playback and tablature pitch. Complete
Tárrega parts and the prepared Sugar Plum adaptation retain their separate scoring.
Violin position suggestions are available in both melody and violin modes.
Extraction removes chord ties that no longer connect the same selected pitch,
before octave fitting can accidentally collapse a leap into an unintended tie.

Brahms, Ravel, Schumann and Scriabin now use the same workspace, with complete
piano miniatures and source credits. Import sources and verification notes are in
`scripts/score-import/sources/pioneer-additions/README.md`.
Passing arrangement
checks verifies pitch classes, rhythm, range, tablature and rendering, rather than
certifying every source edition against its original publication.

Range reference: [Philharmonia’s violin guide](https://philharmonia.co.uk/resources/instruments/violin/) identifies the open strings as G3, D4, A4 and E5.
