/* Practice Room card library.
 *
 * One card = one thing to practise, written so a student can read it in five seconds:
 * a short title, ONE line saying what to do, and a picture (keys, tab, drum grid, notes or chords).
 *
 * Card ids are short because they travel inside the shared sheet link and its QR code.
 * NEVER renumber or reuse an id: a printed sheet in a student's folder points at it.
 * Add new cards with the next free id.
 *
 *   kind:  warmup | skill | song | play       (the four steps of a practice session)
 *   move:  timer | streak | ladder | chunk    (the practice strategy the card teaches; see MOVES)
 *   min:   suggested minutes      tempo: starting beats per minute     goal: target tempo (ladder)
 *   keys:  piano notes  + fingers
 *   tab:   guitar [string 6=low E … 1=high e, fret] + fingers
 *   notes: violin / sax notes, each with a fingering label
 *   grid:  drums, 16 steps per row: x = hit, g = ghost (quiet), - = rest; stick = sticking
 *   chords + strum: chord names and a strum pattern
 */

export const INSTRUMENTS = [
  { id: 'piano', name: 'Piano', emoji: '🎹', lesson: 'lessons/music/instruments/piano.html' },
  { id: 'guitar', name: 'Guitar', emoji: '🎸', lesson: 'lessons/music/instruments/guitar.html' },
  { id: 'violin', name: 'Violin', emoji: '🎻', lesson: 'lessons/music/instruments/violin-fingerboard.html' },
  { id: 'sax', name: 'Saxophone', emoji: '🎷', lesson: 'lessons/music/instruments/saxophone.html' },
  { id: 'drums', name: 'Drums', emoji: '🥁', lesson: 'lessons/music/instruments/drums.html' },
  { id: 'any', name: 'Any instrument or voice', emoji: '🎤', lesson: '' }
];

export const KINDS = [
  { id: 'warmup', name: 'Warm up', emoji: '🔥' },
  { id: 'skill', name: 'Skill', emoji: '🎯' },
  { id: 'song', name: 'Song', emoji: '🎵' },
  { id: 'play', name: 'Free play', emoji: '🎨' }
];

/* The practice moves are the real lesson: how to practise, not just what. */
export const MOVES = {
  timer: { name: 'Just play', emoji: '⏱️', how: 'Play until the timer runs out.', why: 'Steady time on your instrument builds strength and memory.' },
  streak: { name: 'Five in a row', emoji: '✋', how: 'Get 5 clean in a row. A slip starts the count again.', why: 'One good try can be luck. Five in a row means your hands really know it.' },
  ladder: { name: 'Tempo ladder', emoji: '🪜', how: 'Start slow. Each clean try, the beat gets a little faster.', why: 'Slow and right beats fast and messy. Speed comes from accuracy.' },
  chunk: { name: 'Chunk it', emoji: '🧩', how: 'Learn a small piece at a time, then glue them together.', why: 'Small pieces are easy to fix. Your brain joins them up for you.' }
};

const k = (notes, fingers) => ({ keys: notes.split(' '), fingers: fingers ? fingers.split(' ') : [] });
const n = (spec) => ({ notes: spec.split(' ').map((s) => { const [note, label = ''] = s.split('/'); return { note, label: label.replace(/_/g, ' ') }; }) });
const t = (spec, fingers) => ({ tab: spec.split(' ').map((s) => s.split(':').map(Number)), fingers: fingers ? fingers.split(' ') : [] });
const g = (rows, stick) => ({ grid: rows, stick: stick || '' });

export const CARDS = [
  /* ---- Any instrument or voice: these show up for every instrument. ---- */
  { id: 'a1', inst: 'any', kind: 'warmup', move: 'timer', min: 2, tempo: 60, title: 'Long, steady notes', do: 'Hold one note for 4 slow beats. Make the start, middle and end sound the same.' },
  { id: 'a2', inst: 'any', kind: 'skill', move: 'ladder', min: 3, tempo: 50, goal: 80, title: 'Slow-motion spot', do: 'Pick the hardest bar of your piece. Climb the tempo ladder with it.' },
  { id: 'a3', inst: 'any', kind: 'song', move: 'streak', min: 3, tempo: 70, title: 'Fix the tricky spot', do: 'Find the place you always slip. Play just that spot 5 times clean in a row.' },
  { id: 'a4', inst: 'any', kind: 'song', move: 'timer', min: 3, tempo: 80, title: 'Play it all the way', do: 'Play your whole piece without stopping. If you slip, keep the beat going.' },
  { id: 'a5', inst: 'any', kind: 'play', move: 'timer', min: 2, tempo: 80, title: 'Three-note song', do: 'Make up a tune using only 3 notes. Play it loud, then soft.' },
  { id: 'a6', inst: 'any', kind: 'play', move: 'timer', min: 2, tempo: 90, title: 'Play for fun', do: 'Play anything you love. No rules.' },
  { id: 'a7', inst: 'any', kind: 'warmup', move: 'timer', min: 2, tempo: 70, title: 'Loud and soft', do: 'Play one note very soft, then medium, then loud. Can you make five steps?' },

  /* ---- Piano (adapted from the piano lesson's practice sheets) ---- */
  { id: 'p1', inst: 'piano', kind: 'warmup', move: 'timer', min: 2, tempo: 60, title: 'Five-finger walk', do: 'Thumb on C. Walk up and down, one note per beat.', ...k('C4 D4 E4 F4 G4 F4 E4 D4', '1 2 3 4 5 4 3 2') },
  { id: 'p2', inst: 'piano', kind: 'warmup', move: 'streak', min: 2, tempo: 60, title: 'Smooth, then bouncy', do: 'Play it smooth and connected, then short and bouncy.', ...k('C4 E4 D4 F4 E4 D4 C4 C4', '1 3 2 4 3 2 1 1') },
  { id: 'p3', inst: 'piano', kind: 'skill', move: 'ladder', min: 3, tempo: 50, goal: 80, title: 'Finger pattern', do: 'Right hand. Every note the same loudness.', ...k('C4 E4 F4 G4 A4 G4 F4 E4', '1 2 3 4 5 4 3 2') },
  { id: 'p4', inst: 'piano', kind: 'skill', move: 'chunk', min: 3, tempo: 60, title: 'C major scale', do: 'Right hand. Thumb tucks under after finger 3.', ...k('C4 D4 E4 F4 G4 A4 B4 C5', '1 2 3 1 2 3 4 5') },
  { id: 'p5', inst: 'piano', kind: 'skill', move: 'streak', min: 2, tempo: 60, title: 'Broken chord', do: 'Let your arm move with your hand. Keep it relaxed.', ...k('C4 E4 G4 C5 G4 E4 C4', '1 2 3 5 3 2 1') },
  { id: 'p6', inst: 'piano', kind: 'skill', move: 'chunk', min: 3, tempo: 60, title: 'Left-hand scale', do: 'Left hand. Finger 3 crosses over the thumb.', ...k('C3 D3 E3 F3 G3 A3 B3 C4', '5 4 3 2 1 3 2 1') },
  { id: 'p7', inst: 'piano', kind: 'song', move: 'chunk', min: 3, tempo: 80, title: 'Ode to Joy', do: 'Beethoven’s famous tune. Right hand, thumb on C.', ...k('E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4 D4 D4', '3 3 4 5 5 4 3 2 1 1 2 3 3 2 2') },
  { id: 'p8', inst: 'piano', kind: 'song', move: 'streak', min: 2, tempo: 90, title: 'Mary Had a Little Lamb', do: 'Right hand, thumb on C. Sing it as you play.', ...k('E4 D4 C4 D4 E4 E4 E4', '3 2 1 2 3 3 3') },
  { id: 'p9', inst: 'piano', kind: 'song', move: 'chunk', min: 3, tempo: 80, title: 'Twinkle, Twinkle', do: 'Right hand. Stretch finger 5 up to A.', ...k('C4 C4 G4 G4 A4 A4 G4 F4 F4 E4 E4 D4 D4 C4', '1 1 4 4 5 5 4 3 3 2 2 1 1 1') },
  { id: 'p10', inst: 'piano', kind: 'play', move: 'timer', min: 2, tempo: 80, title: 'Black-key song', do: 'Play only the black keys. Every tune you make will sound good!' },

  /* ---- Guitar (string 6 = thickest) ---- */
  { id: 'g1', inst: 'guitar', kind: 'warmup', move: 'timer', min: 2, tempo: 60, title: 'Open strings', do: 'Pick each string once, thickest to thinnest. Let each one ring.', ...t('6:0 5:0 4:0 3:0 2:0 1:0') },
  { id: 'g2', inst: 'guitar', kind: 'warmup', move: 'ladder', min: 3, tempo: 50, goal: 80, title: 'Spider walk', do: 'One finger per fret. Pick down, up, down, up.', ...t('6:5 6:6 6:7 6:8 5:5 5:6 5:7 5:8', '1 2 3 4 1 2 3 4') },
  { id: 'g3', inst: 'guitar', kind: 'skill', move: 'streak', min: 3, tempo: 60, title: 'Change G ↔ C', do: 'Strum each chord 4 times. Get 5 clean changes in a row.', chords: ['G', 'C', 'G', 'C'], strum: '↓ ↓ ↓ ↓' },
  { id: 'g4', inst: 'guitar', kind: 'skill', move: 'streak', min: 3, tempo: 60, title: 'Change Em ↔ Am', do: 'Keep fingers 2 and 3 close together as you move.', chords: ['Em', 'Am', 'Em', 'Am'], strum: '↓ ↓ ↓ ↓' },
  { id: 'g5', inst: 'guitar', kind: 'skill', move: 'chunk', min: 3, tempo: 60, title: 'E minor pentatonic', do: 'The rock and blues scale. Up, then back down.', ...t('6:0 6:3 5:0 5:2 4:0 4:2 3:0 3:2 2:0 2:3 1:0 1:3', '0 3 0 2 0 2 0 2 0 3 0 3') },
  { id: 'g6', inst: 'guitar', kind: 'song', move: 'ladder', min: 3, tempo: 60, goal: 90, title: 'Strum pattern', do: 'Down, down-up, up-down-up. Keep your hand moving even when you miss.', chords: ['Em', 'Em', 'C', 'D'], strum: '↓ ↓↑ ↑↓↑' },
  { id: 'g7', inst: 'guitar', kind: 'song', move: 'chunk', min: 3, tempo: 80, title: 'Ode to Joy', do: 'Beethoven’s tune on the two thinnest strings.', ...t('1:0 1:0 1:1 1:3 1:3 1:1 1:0 2:3 2:1 2:1 2:3 1:0 1:0 2:3 2:3', '0 0 1 3 3 1 0 3 1 1 3 0 0 3 3') },
  { id: 'g8', inst: 'guitar', kind: 'play', move: 'timer', min: 2, tempo: 80, title: 'Pentatonic jam', do: 'Use only the E minor pentatonic notes. Make up a riff and repeat it.' },

  /* ---- Violin ---- */
  { id: 'v1', inst: 'violin', kind: 'warmup', move: 'timer', min: 2, tempo: 60, title: 'Long open strings', do: 'Whole bows on G, D, A, E. Make each note smooth and even.', ...n('G3/G_string D4/D_string A4/A_string E5/E_string') },
  { id: 'v2', inst: 'violin', kind: 'warmup', move: 'streak', min: 2, tempo: 60, title: 'String crossings', do: 'Move your bow arm level, not your wrist.', ...n('G3/0 D4/0 G3/0 D4/0 A4/0 E5/0 A4/0 E5/0') },
  { id: 'v3', inst: 'violin', kind: 'skill', move: 'chunk', min: 3, tempo: 60, title: 'D major scale', do: 'Hear each note before you place the finger. Finger 2 is high.', ...n('D4/0 E4/1 F#4/2 G4/3 A4/0 B4/1 C#5/2 D5/3') },
  { id: 'v4', inst: 'violin', kind: 'skill', move: 'ladder', min: 3, tempo: 50, goal: 80, title: 'Broken chord', do: 'Root, third, fifth, octave. Keep the sound even.', ...n('D4/0 F#4/2 A4/0 D5/3 A4/0 F#4/2 D4/0') },
  { id: 'v5', inst: 'violin', kind: 'song', move: 'chunk', min: 3, tempo: 80, title: 'Twinkle, Twinkle', do: 'Start on the A string. Two bows per note.', ...n('A4/0 A4/0 E5/0 E5/0 F#5/1 F#5/1 E5/0 D5/3 D5/3 C#5/2 C#5/2 B4/1 B4/1 A4/0') },
  { id: 'v6', inst: 'violin', kind: 'song', move: 'streak', min: 2, tempo: 80, title: 'Hot Cross Buns', do: 'On the A string: fingers 2, 1, open.', ...n('C#5/2 B4/1 A4/0 C#5/2 B4/1 A4/0') },
  { id: 'v7', inst: 'violin', kind: 'play', move: 'timer', min: 2, tempo: 80, title: 'Bow a story', do: 'Use open strings to tell a story: a storm, a whisper, a march.' },

  /* ---- Alto saxophone (written notes; Listen plays the real sound) ---- */
  { id: 's1', inst: 'sax', kind: 'warmup', move: 'timer', min: 2, tempo: 60, title: 'Long tones', do: 'Hold each note 4 slow beats. Steady air, steady sound.', ...n('G4/LH_123 A4/LH_12 B4/LH_1 C5/LH_2') },
  { id: 's2', inst: 'sax', kind: 'warmup', move: 'ladder', min: 2, tempo: 60, goal: 100, title: 'Tah-tah tonguing', do: 'Say “tah” with your tongue for each note. Keep the air flowing.', ...n('G4/tah G4/tah G4/tah G4/tah G4/tah G4/tah G4/tah G4/tah') },
  { id: 's3', inst: 'sax', kind: 'skill', move: 'chunk', min: 3, tempo: 60, title: 'G major scale', do: 'F# uses the right-hand middle finger alone.', ...n('G4/LH_123 A4/LH_12 B4/LH_1 C5/LH_2 D5/Oct_123·123 E5/Oct_123·12 F#5/Oct_123·2 G5/Oct_123') },
  { id: 's4', inst: 'sax', kind: 'song', move: 'streak', min: 2, tempo: 80, title: 'Hot Cross Buns', do: 'B, A, G. Only your left hand moves.', ...n('B4 A4 G4 B4 A4 G4 G4 G4 A4 A4 B4 A4 G4') },
  { id: 's5', inst: 'sax', kind: 'song', move: 'chunk', min: 3, tempo: 90, title: 'Mary Had a Little Lamb', do: 'Left hand only. Blow warm, steady air.', ...n('B4 A4 G4 A4 B4 B4 B4 A4 A4 A4 B4 D5 D5') },
  { id: 's6', inst: 'sax', kind: 'play', move: 'timer', min: 2, tempo: 80, title: 'Three-note blues', do: 'Use G, A and B. Make it swing!' },

  /* ---- Drums ---- */
  { id: 'd1', inst: 'drums', kind: 'warmup', move: 'timer', min: 2, tempo: 70, title: 'Count and tap', do: 'Hit on every beat. Count “1, 2, 3, 4” out loud.', ...g({ hat: 'x---x---x---x---' }) },
  { id: 'd2', inst: 'drums', kind: 'warmup', move: 'ladder', min: 3, tempo: 60, goal: 100, title: 'Single strokes', do: 'Right, left, right, left. Let the sticks bounce.', ...g({ snare: 'x-x-x-x-x-x-x-x-' }, 'R L R L R L R L') },
  { id: 'd3', inst: 'drums', kind: 'skill', move: 'ladder', min: 3, tempo: 60, goal: 90, title: 'Double strokes', do: 'Two hits per hand: right right, left left.', ...g({ snare: 'x-x-x-x-x-x-x-x-' }, 'R R L L R R L L') },
  { id: 'd4', inst: 'drums', kind: 'skill', move: 'streak', min: 3, tempo: 60, title: 'Paradiddle', do: 'Say it as you play: pa-ra-did-dle.', ...g({ snare: 'x-x-x-x-x-x-x-x-' }, 'R L R R L R L L') },
  { id: 'd5', inst: 'drums', kind: 'song', move: 'ladder', min: 3, tempo: 70, goal: 100, title: 'Rock beat', do: 'Hi-hat steady. Snare on 2 and 4. Kick on 1 and 3.', ...g({ hat: 'x-x-x-x-x-x-x-x-', snare: '----x-------x---', kick: 'x-------x-------' }) },
  { id: 'd6', inst: 'drums', kind: 'song', move: 'streak', min: 3, tempo: 80, title: 'Dance beat', do: 'Kick on every beat. Hi-hat on the “and”.', ...g({ hat: '--x---x---x---x-', snare: '----x-------x---', kick: 'x---x---x---x---' }) },
  { id: 'd7', inst: 'drums', kind: 'skill', move: 'streak', min: 3, tempo: 70, title: 'First fill', do: 'Three beats of groove, then four snare hits. Land on the next 1.', ...g({ hat: 'x-x-x-x-x-x-----', snare: '----x-------xxxx', kick: 'x-------x-------' }) },
  { id: 'd8', inst: 'drums', kind: 'play', move: 'timer', min: 2, tempo: 90, title: 'Make your own beat', do: 'Keep the hi-hat steady. Move the kick and snare anywhere you like.' }
];

export const CARD_BY_ID = new Map(CARDS.map((c) => [c.id, c]));

/** Cards a given instrument can use: its own plus the "any instrument" ones. */
export function cardsFor(inst) {
  return CARDS.filter((c) => c.inst === inst || c.inst === 'any');
}
