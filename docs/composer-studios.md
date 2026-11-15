# Composer score workspaces

The 23 score-enabled `lessons/music/pioneers/` lessons open with the shared
sheet-music workspace or a brief portrait introduction immediately before it.
They share the notation renderer and audio path. Source data lives in `data/score-library.json`;
`data/composer-workspaces.json` selects the repertoire for each lesson.

- `assets/js/composer-arrangement.js`: pure, source-preserving transformations.
  Extracted voices copy the original first staff's repeat/key/time road map.
  Sax parts transpose notation by a major sixth / major ninth, with the opposite
  playback offset so both the player and click-to-hear stay at concert pitch.
  Piano studies preserve complete solo-piano scores, including four-staff scoring.
  Ensemble and four-hand reductions retain reachable chords from the selected
  upper part and a sounding source bass voice; bassoons and empty return staves
  no longer win the bass selection merely by their label or staff order.
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
  all catalog scores in nine arrangement modes, mobile/desktop fit and recorded playback.
- `npm run check:instrument-samples` — file hashes and size budget; all 139 recordings
  decode, 17 instruments render audibly offline with matching pitch and working release;
  canceled future attacks remain silent.
- `npm run check:score-workspace` — navigation, fit, scrolling, fullscreen, seek and
  complete score pagination on desktop and phone.
- `npm run a11y:page -- lessons/music/pioneers/` — accessibility of all composer lessons.

Set `SCORE_TEST_URL` to use an existing server on a different port.
Set `COMPOSER_TEST_MODES=piano,guitar-solo` to check just the solo modes in the
browser, `COMPOSER_TEST_FILTER=bach,beethoven` to select composer pages, or
`COMPOSER_TEST_SCORES=mozart-ah-vous-theme` to select individual scores.
See `assets/audio/instruments/README.md` for sample licenses, processing, caching,
rebuild instructions and fidelity limits. Compact samples improve timbre but do not
replicate a musician's complete articulation, phrasing, dynamics or ensemble blend.

## Instrument arrangement audit

Extracted violin lines use a classroom range of G3–E7 (not a beginner difficulty rating). Extracted guitar and four-string bass lines fit
standard tuning through fret 19 (sounding E2–B5 and E1–D4 respectively). Whole-line
octave shifts are preferred; remaining outliers move by octaves. The workspace
reports these edits because the resulting leaps still need a player's review.
Guitar/bass notation reads an octave above playback and tablature pitch. Complete
Tárrega parts and the now-retired Sugar Plum adaptation retain their separate scoring.
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

## Solo guitar and piano studies

“Guitar · solo study with source bass” adds a sparse second voice to the selected
melody. It uses actual bass attacks from another source voice where they coincide
with melody attacks, retaining pitch classes and shortening bass durations when
needed. It does not infer new chords. The automatic study fits sounding E2–E5,
uses standard tuning through fret 12 and a maximum four-fret span, and removes
bass notes that conflict with the melody or tied strings. Fast shifts and ornaments
still need player review. A single source line without another pitched voice
remains a melody study. Existing complete guitar compositions and the prepared
Sugar Plum adaptation retain their own scoring and tuning.

Piano reductions preserve up to five source chord tones within an octave of the selected
outer note per attack, then fit registers for the hands. Other source voices are
omitted. This bounds individual chord stretches, not the combined span of all
sustained notes or the difficulty of leaps. Complete solo-piano scores retain
all original notes, voices, clefs and difficulty; Rachmaninoff’s four-staff return
is one pianist’s score and must not be treated as a four-hand arrangement.


## Morton, Ravel and Ellington source refinements (2026-11-15)

Morton’s four studies now include selected source bass. New Orleans Blues covers
the twelve-bar opening with the printed ottava restored; King Porter Stomp and
Black Bottom Stomp each cover an eight-bar passage. The Jelly Roll Blues study
retains the four-bar introduction with bass. King Porter’s key is corrected to
A-flat major and its source bars retain numbers 5–12.

Ravel’s opening studies now reference the E. Demets 1906 print. Noctuelles uses
its five metered opening bars, stopping before the free runs; Oiseaux tristes
extends through bar 7 and includes the ostinato and bass entrance, with its
omitted middle voice and meter alignment disclosed. The former DCMLab corpus
files retain their archived license and reproduction notes.

Ellington’s workspace starts with the historical first-violin introduction to
Black and Tan Fantasy (Ellington and Bubber Miley; Eddie Powell, 1927). It is
separate from the original classroom exercise and does not claim to reproduce
the whole band. Ravel and Ellington source pages open in the shared lightbox.

Source readings, reductions, hashes and validation commands are recorded in
`scripts/score-import/sources/composer-refinements/README.md`. Structural checks
and sampled playback do not certify a critical edition or a complete performance.

Ellington also includes three eight-bar melody/source-bass studies from the early
prints of Black Beauty (1928), Jig Walk (1925) and Ring Dem Bells (1930). Printed
pages open in the lesson lightbox; source links provide complete editions.
Selections retain source numbering and clearly identify omitted piano voices,
chord interiors and the Bells response. Readings and provenance are recorded in
`scripts/score-import/sources/ellington-additions/README.md`.


## Copyright remediation (2026-11-15)

Two editions without established arranger-level reuse permission were removed:
TheoA’s Lacrimosa piano reduction and Nohpets’s Sugar Plum Fairy transcription,
including its derived guitar study. Their downloadable PDFs and archived music
files were removed from the current tree. Historical score links remain in the
lessons, alongside the rest of their playable repertoire. Prepared-arrangement
behavior is still covered by an original regression exercise.

Three recording streams supported only by European term-expiration claims were
removed from the Mozart and Tchaikovsky lessons. Regenerate the 39-track catalog
with `node scripts/build-recording-library.mjs`.
