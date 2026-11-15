# Piano fingering for teaching

All piano scores rendered by `score-engine.js`, including composer arrangements,
use `assets/js/score-fingering.js`. The Turkish March uses this same planner;
`lessons/mozart-fingering.js` retains only its older lesson print action.
Non-keyboard instruments keep their own instrument-specific systems.

These are **generated practice suggestions**, not an editor's fingering or an
academically certified edition. Musical articulation, hand size, tempo, pedal,
hand crossing, redistribution between staves, and ornament execution require a
player and teacher. No algorithmic check establishes a uniquely correct fingering.

## What the teacher and learner see

Turn on **Finger numbers** in score settings. Both hands use 1 for the thumb
through 5 for the little finger. Simultaneous chord numbers stack in the same
high-to-low pitch order as the notes; different voices at one onset share one
stack. A tied continuation receives no new number; newly attacked notes in a
partially tied chord can receive numbers.

**Comfortable reach** offers a fifth (7 semitones), sixth (9), or octave (12).
The default is an octave, a planning limit rather than a recommendation for any
particular student. Choose a smaller reach for a student who needs it; none of
these presets guarantees physical comfort. The setting is shared by scores on
the page and remembered for future visits.

**†** means the planner has withheld a fingering. Its tooltip explains the
reason: a wide or crowded chord, an unsupported transition around held voices,
or an ornament. Ask the teacher about releases, rolling or redistributing the
notes; do not force a stretch. The planner leaves the score's pitches and timing
intact. The print button includes the same suggestions, markers, reach setting,
and explanation as the screen.

## Planning rules and limits

The planner searches complete sequences of onset assignments, including chords,
instead of restarting on each chord or octave leap. It favors natural finger
order and adjacent fingers for stepwise motion, allows thumb crossings in scalar
motion, and permits repositioning. A rest releases the transition preference.
Black-key thumbs incur a small preference cost, not a prohibition.

Every sounding key assigned to one hand, including sustained keys in other voices, occupies
a distinct finger. Ties extend that reservation through their continuation.
Simultaneous duplicates of the same pitch use a single finger. Chord candidates
must have increasing fingers in the right hand and decreasing fingers in the
left hand. Conservative pairwise spacing limits further restrict candidates;
these limits are engineering choices, not published anatomical measurements.
If no connected assignment exists, the onset and dependent held passage are
marked for review instead of inventing a finger substitution.

Explicit `score.fingerings` annotations retain precedence and constrain the
search. They remain the editor's responsibility: this planner does not certify
or silently rewrite supplied editorial annotations. No library score currently
supplies those annotations.

The hand is inferred from the staff label, falling back to the clef. Staves for
the same hand share constraints; duet player labels keep their hands separate.
Simultaneous activity across staves for one hand receives a review marker. The planner
does not infer cross-staff hand redistribution or a performer's pedal releases.
Ornaments receive review markers because numbering only their main note would
leave the gesture unexplained. Repeated notes favor the same finger by default;
fast repetition or a legato substitution may call for a teacher's alternative.
Reflow and printing do not influence the pitch-based search.

## Pedagogical references

- [Jerry Kovarsky, Yamaha: The Basics of Piano Keyboard Fingering](https://hub.yamaha.com/keyboards/k-how-to/the-basics-of-piano-keyboard-fingering/)
  explains finger numbering, covering notes under a hand position, planning
  position changes, scale patterns, and exceptions to black-key thumb advice.
- [Graham Fitch: Arpeggio Technique](https://dfp.informance.biz/content/pages/40-intermediate-scales-arpeggios/197-arpeggio-technique)
  explains why hand size can change an arpeggio's appropriate fingering.

These sources inform the principles, not the numerical search weights or reach
limits; the generated suggestions have not been reviewed by these authors.

## Verification

`npm run check:score-fingering` exercises all 131 library keyboard scores at all
three reach settings, including simultaneous and sustained-finger constraints,
as well as conventional C-major patterns, leap context, spacing, teacher
annotations, ties, ornaments, and mixed ensembles.

With `node serve-local.js` running, execute
`node tests/score-fingering-browser.mjs` for desktop/mobile Raindrop Prelude and Mozart
screen/print checks. `node tests/score-chopin-browser.mjs` covers score reflow,
full screen, fingering toggles and printing alongside Chopin's notation.
