/* drum-exercises-model.js: the drum lesson's Practice exercises, DOM-free.
 *
 * The drum counterpart of piano-exercises-model.js. Every exercise is generated from a level
 * (1 Beginner … 4 Expert), an optional version and a lead hand, so one pattern serves a
 * right-hand-lead day and a weak-hand (left-lead) day. build() returns a pattern in the format
 * drums.js already plays and engraves: one string per kit piece, one character per sixteenth
 * ('-' rest, 'x' note, 'X' accent, 'g' ghost), plus sticking, flam grace notes and tempo.
 * The page (drum-exercises.js) only draws, plays through DrumLab.createPlayer and remembers.
 */
(function (root) {
  'use strict';

  const PIECES = ['crash', 'ride', 'hat', 'ohat', 'tomHi', 'tomMid', 'snare', 'tomLo', 'kick'];
  const HANDS = ['crash', 'ride', 'hat', 'ohat', 'tomHi', 'tomMid', 'snare', 'tomLo'];
  const COUNT = ['', 'e', '&', 'a'];

  const TIERS = [
    { n: 1, id: 'beginner', label: 'Beginner', icon: '🌱' },
    { n: 2, id: 'intermediate', label: 'Intermediate', icon: '🌿' },
    { n: 3, id: 'advanced', label: 'Advanced', icon: '🌳' },
    { n: 4, id: 'expert', label: 'Expert', icon: '🏔️' },
  ];
  const LEADS = [['R', 'Right hand'], ['L', 'Left hand']];

  const CATEGORIES = [
    { id: 'hands', icon: '🥢', label: 'Hands & rudiments', blurb: 'Even, relaxed, controlled sticks.' },
    { id: 'time', icon: '🎚️', label: 'Time & grooves', blurb: 'Beats that feel good and stay steady.' },
    { id: 'limbs', icon: '🦶', label: 'Coordination', blurb: 'Four limbs, four jobs, one pulse.' },
    { id: 'fills', icon: '💥', label: 'Fills & form', blurb: 'Leave the groove and land back on 1.' },
    { id: 'music', icon: '🎶', label: 'Reading & musicianship', blurb: 'Count it, read it, shape it.' },
  ];

  const pickTier = (tier, list) => list[Math.max(0, Math.min(list.length, tier) - 1)];
  const rep = (s, n) => s.repeat(n);
  const swapHands = s => s.replace(/[RLrl]/g, c => ({ R: 'L', L: 'R', r: 'l', l: 'r' })[c]);
  /* "R L R L" on every step a hand plays: even steps right, odd steps left (the natural
     sixteenth-note sticking: right on the beat and the "&", left on "e" and "a"). */
  const naturalSticking = track => track.split('').map((c, i) => c === '-' ? '-' : i % 2 ? 'L' : 'R').join('');
  /* Alternate hands on every note, whatever the spacing. */
  const alternate = (track, first) => { let r = first !== 'L'; return track.split('').map(c => { if (c === '-') return '-'; const h = r ? 'R' : 'L'; r = !r; return h; }).join(''); };
  /* Spread a sticking string over a grid with one note every `every` steps. */
  const spread = (stick, every) => stick.split('').map(c => c + rep('-', every - 1)).join('');
  const notesOf = (stick, ch) => stick.replace(/[RL]/g, ch || 'x');
  /* Two-bar loop for fills: bar 1 is the groove under a crash, bar 2 is the groove up to the fill. */
  const GROOVE = { hat: 'x-x-x-x-x-x-x-x-', snare: '----x-------x---', kick: 'x-------x-------' };
  function withFill(bar2) {
    const empty = rep('-', 16);
    const tr = { crash: 'x' + rep('-', 31), hat: '--' + GROOVE.hat.slice(2) + (bar2.hat != null ? bar2.hat : empty),
      snare: GROOVE.snare + (bar2.snare || empty), kick: GROOVE.kick + (bar2.kick != null ? bar2.kick : GROOVE.kick) };
    ['tomHi', 'tomMid', 'tomLo'].forEach(k => { if (bar2[k]) tr[k] = empty + bar2[k]; });
    return tr;
  }
  /* Linear groove from a letter per sixteenth: K kick, H hat (right hand), S snare accent, g ghost (left). */
  function linear(seq) {
    seq = seq.replace(/\s+/g, '');
    const tr = { hat: '', snare: '', kick: '' };
    let stick = '';
    for (const c of seq) {
      tr.hat += c === 'H' ? 'x' : '-';
      tr.snare += c === 'S' ? 'X' : c === 'g' ? 'g' : '-';
      tr.kick += c === 'K' ? 'x' : '-';
      stick += c === 'H' ? 'R' : c === 'S' || c === 'g' ? 'L' : '-';
    }
    return { tracks: tr, sticking: stick };
  }
  const countName = k => (Math.floor(k / 4) + 1) + (COUNT[k % 4] ? ' ' + COUNT[k % 4] : '');
  const countWord = k => k % 4 ? 'the “' + COUNT[k % 4] + '” of ' + (Math.floor(k / 4) + 1) : 'beat ' + (Math.floor(k / 4) + 1);

  /* ---- The exercises --------------------------------------------------------------------- */
  const PARADIDDLES = {
    single: ['Single paradiddle', 'RLRRLRLL'],
    inverted: ['Inverted paradiddle', 'RLLRLRRL'],
    reverse: ['Reverse paradiddle', 'RRLRLLRL'],
  };
  const KICKS = [
    ['k13', 'Beats 1 and 3', 'x-------x-------', 1],
    ['k3and', '1, 3 and the “&” of 3', 'x-------x-x-----', 1],
    ['k2and', '1, the “&” of 2, and 3', 'x-----x-x-------', 1],
    ['k4and', '1, 3 and the “&” of 4', 'x-------x-----x-', 1],
    ['k1and', '1, “&” of 1, 3, “&” of 3', 'x-x-----x-x-----', 2],
    ['k1a', '1, the “a” of 1, and 3', 'x--x----x-------', 3],
    ['k3e', '1, 3 and the “e” of 3', 'x-------xx------', 3],
    ['k2a', '1, the “a” of 2, the “&” of 3', 'x------x--x-----', 3],
    ['kfunk', '1, “a” of 1, “&” of 2, “&” of 3, “e” of 4', 'x--x--x---x--x--', 4],
  ];
  const STYLES = {
    disco: { label: 'Disco / four on the floor', tempos: [108, 116, 124], tracks: { ohat: '--x---x---x---x-', hat: 'x---x---x---x---', snare: '----x-------x---', kick: 'x---x---x---x---' },
      tip: 'Kick on every beat, open hi-hat on every “&”. Close the hat with your foot on the beat.' },
    halftime: { label: 'Half-time feel', tempos: [80, 90, 100], tracks: { hat: 'x-x-x-x-x-x-x-x-', snare: '--------x-------', kick: 'x-----x---------' },
      tip: 'The snare waits until beat 3. Same tempo, but it feels half as fast and twice as heavy.' },
    shuffle: { label: 'Blues shuffle (swung)', swing: true, tempos: [84, 96, 112], tracks: { ride: 'x-x-x-x-x-x-x-x-', snare: '----x-------x---', kick: 'x-------x-------' },
      tip: 'Written as eighths, played long–short like a triplet. Say “dum-da dum-da” as you play.' },
    onedrop: { label: 'Reggae one-drop', tempos: [70, 76, 84], tracks: { hat: 'x-x-x-x-x-x-x-x-', snare: '--------x-------', kick: '--------x-------' },
      tip: 'Beat 1 is left empty on purpose. Kick and snare drop together on 3.' },
    motown: { label: 'Motown (snare on every beat)', tempos: [100, 112, 124], tracks: { hat: 'x-x-x-x-x-x-x-x-', snare: 'x---X---x---X---', kick: 'x-x-----x-x-----' },
      tip: 'Every beat on the snare, with 2 and 4 louder. Think of a tambourine doubling it.' },
    punk: { label: 'Punk / fast rock', tempos: [140, 160, 176], tracks: { crash: 'x---x---x---x---', snare: '--x---x---x---x-', kick: 'x---x---x---x---' },
      tip: 'Kick and snare trade eighth notes under a crash on every beat. Stay relaxed or it will fall apart.' },
    waltz: { label: 'Waltz in 3/4', beats: 3, tempos: [100, 112, 132], tracks: { hat: 'x-x-x-x-x-x-', snare: '----x---x---', kick: 'x-----------' },
      tip: 'Three beats in a bar: kick on 1, snare on 2 and 3. “Oom-pah-pah”.' },
  };
  const PRAISE = 'Three clean times through in a row, with the click on, at the target tempo.';

  const EXERCISES = [
    /* -------- Hands & rudiments -------- */
    {
      id: 'singles', cat: 'hands', min: 1, icon: '🥢', title: 'Single strokes',
      goal: 'Every note the same height and the same volume, hand to hand.',
      build(tier) {
        const cfg = pickTier(tier, [
          { tr: 'x-x-x-x-x-x-x-x-', tempo: 66, what: 'eighth notes' },
          { tr: 'xxxxxxxxxxxxxxxx', tempo: 66, what: 'sixteenth notes' },
          { tr: 'XxxxXxxxXxxxXxxx', tempo: 84, what: 'sixteenths, accent on every beat' },
          { tr: 'X-x-X-x-X-x-X-x-XxxxXxxxXxxxXxxx', tempo: 100, what: 'eighths, then double speed' },
        ]);
        return {
          name: 'Single strokes · ' + cfg.what, tempo: cfg.tempo, tracks: { snare: cfg.tr }, sticking: alternate(cfg.tr),
          how: ['Sticks start about 15 cm (6 in) above the pad and come back to the same height after every note.', 'Watch both sticks: the weaker hand usually stays lower. Match it to the strong hand.', 'Count out loud with the click before you add speed.'],
          check: PRAISE + ' No hand louder than the other.',
          tip: tier >= 4 ? 'The double-speed bar is the same motion, just smaller. Don’t squeeze the stick to go faster.' : 'Let the stick bounce back up on its own. Your hand only guides it.',
        };
      },
    },
    {
      id: 'doubles', cat: 'hands', min: 1, icon: '✌️', title: 'Double strokes',
      goal: 'Two even notes per hand: the second stroke as strong as the first.',
      build(tier) {
        const cfg = pickTier(tier, [
          { tr: 'x-x-x-x-x-x-x-x-', stick: spread('RRLLRRLL', 2), tempo: 60, what: 'eighth notes' },
          { tr: 'xxxxxxxxxxxxxxxx', stick: 'RRLLRRLLRRLLRRLL', tempo: 60, what: 'sixteenth notes' },
          { tr: 'XxXxXxXxXxXxXxXx', stick: 'RRLLRRLLRRLLRRLL', tempo: 76, what: 'sixteenths, accent the first of each pair' },
          { tr: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', stick: 'RLRLRLRLRLRLRLRL' + 'RRLLRRLLRRLLRRLL', tempo: 92, what: 'singles, then doubles' },
        ]);
        return {
          name: 'Double strokes · ' + cfg.what, tempo: cfg.tempo, tracks: { snare: cfg.tr }, sticking: cfg.stick,
          how: ['First slowly as two separate wrist strokes per hand.', 'As the tempo rises, let the second note be a controlled bounce, guided by the fingers.', 'Listen for “da-da” not “DA-da”: both notes at the same volume.'],
          check: PRAISE + ' The pairs sound even with your eyes closed.',
          tip: tier >= 4 ? 'Switching from singles to doubles without a bump is the real test. Keep the stick height the same.' : 'If the second note is weak, practise it alone: drop the stick, catch the rebound, play it on purpose.',
        };
      },
    },
    {
      id: 'paradiddle', cat: 'hands', min: 1, icon: '🔀', title: 'Paradiddles',
      goal: 'Singles and doubles mixed, with accents only where they belong.',
      variants: () => Object.keys(PARADIDDLES).map(k => [k, PARADIDDLES[k][0]]),
      build(tier, variant) {
        const [label, cell] = PARADIDDLES[variant] || PARADIDDLES.single;
        const stick16 = cell + cell, accents = [0, 4, 8, 12];
        let tracks, sticking, tempo, what;
        if (tier === 1) { sticking = spread(cell, 2); tracks = { snare: notesOf(sticking) }; tempo = 60; what = 'eighth notes'; }
        else if (tier <= 3) {
          sticking = stick16;
          tracks = { snare: stick16.split('').map((c, i) => accents.includes(i) ? 'X' : 'x').join('') };
          tempo = tier === 2 ? 60 : 80; what = 'sixteenths with accents';
        } else {
          sticking = stick16;
          tracks = { snare: '', tomHi: '', tomLo: '' };
          stick16.split('').forEach((c, i) => {
            const acc = accents.includes(i), right = c === 'R';
            tracks.snare += acc ? '-' : 'x';
            tracks.tomLo += acc && right ? 'X' : '-';
            tracks.tomHi += acc && !right ? 'X' : '-';
          });
          tempo = 88; what = 'accents on the toms';
        }
        return {
          name: label + ' · ' + what, tempo, tracks, sticking,
          how: ['Say the sticking out loud first: “par-a-did-dle”, one syllable per note.', tier === 1 ? 'Keep every note the same volume to start.' : 'Accent the first note of each group: a high stroke that stops low (a downstroke).', tier === 4 ? 'The accented hand moves to a tom; the taps stay on the snare.' : 'The double at the end of each group switches the lead hand. That is the whole point.'],
          check: PRAISE + (tier > 1 ? ' Accents loud, taps quiet, no accent where it doesn’t belong.' : ''),
          tip: 'Paradiddles are the rudiment drummers use most on the kit: try the right hand on the hi-hat and the left on the snare.',
        };
      },
    },
    {
      id: 'accents', cat: 'hands', min: 2, icon: '📍', title: 'Moving accents',
      goal: 'Put a loud note anywhere in the beat while the other hand keeps tapping.',
      variants: tier => tier >= 4 ? null : COUNT.map((c, i) => ['a' + i, 'Accent on ' + (c ? '“' + c + '”' : 'the beat')]),
      build(tier, variant) {
        let tr, what;
        if (tier >= 4) { tr = 'XxxxxXxxxxXxxxxX'; what = 'accent moves one note later each beat'; }
        else { const p = Number(String(variant || 'a0').slice(1)) || 0; tr = rep(Array.from({ length: 4 }, (_, i) => i === p ? 'X' : 'x').join(''), 4); what = 'accent on ' + (COUNT[p] ? '“' + COUNT[p] + '”' : 'the beat'); }
        return {
          name: 'Moving accents · ' + what, tempo: pickTier(tier, [60, 60, 76, 80]), tracks: { snare: tr }, sticking: alternate(tr),
          how: ['Two heights only: accents from high, taps from about 3 cm (an inch).', 'An accent is a downstroke: high, hit, and stop low so the next tap is ready.', 'The note before an accent is an upstroke: tap, and lift the stick on the way up.'],
          check: PRAISE + ' You can hear exactly where the accent is without looking.',
          tip: 'This is the idea behind the “stick control” method books: one pattern, the accent moved one note at a time.',
        };
      },
    },
    {
      id: 'flams', cat: 'hands', min: 2, icon: '🪶', title: 'Flams',
      goal: 'A quiet grace note just before the main stroke, so the two sound like one fat note.',
      build(tier) {
        let tracks, sticking, grace = {}, graceStick = {}, tempo, what;
        const flamAt = (steps, stick) => steps.forEach(k => { grace[k] = 1; graceStick[k] = stick[k] === 'R' ? 'l' : 'r'; });
        if (tier === 2) { sticking = spread('RLRLRLRL', 2); tracks = { snare: notesOf(sticking) }; flamAt([0, 2, 4, 6, 8, 10, 12, 14], sticking); tempo = 56; what = 'alternating flams'; }
        else if (tier === 3) { sticking = spread('RRLLRRLL', 2); tracks = { snare: notesOf(sticking) }; flamAt([0, 4, 8, 12], sticking); tempo = 72; what = 'flam taps'; }
        else { sticking = spread('RLRRLRLL', 2); tracks = { snare: sticking.split('').map((c, i) => c === '-' ? '-' : i % 8 === 0 ? 'X' : 'x').join('') }; flamAt([0, 8], sticking); tempo = 84; what = 'flam paradiddle'; }
        return {
          name: 'Flams · ' + what, tempo, tracks, sticking, grace, graceStick,
          how: ['Set up with one stick high and one low, about 3 cm (an inch) above the pad.', 'Drop both together. The low stick lands first, quietly, then the high one.', 'After the flam the sticks have swapped heights, ready for the next one on the other side.'],
          check: PRAISE + ' Each flam sounds like one “flam”, never two hits (“fa-lam”) or one flat one.',
          tip: 'The small note with a slash is a grace note. Lowercase letters under it say which hand plays it.',
        };
      },
    },
    {
      id: 'rolls', cat: 'hands', min: 2, icon: '🌀', title: 'Rolls',
      goal: 'Double strokes that end on an accent, exactly on the beat.',
      build(tier) {
        const cfg = pickTier(tier, [null,
          { tr: 'xxxxX---xxxxX---', stick: 'RRLLR---LLRRL---', tempo: 60, what: 'five-stroke roll' },
          { tr: 'xxxxxxxxX-------xxxxxxxxX-------', stick: 'RRLLRRLLR-------LLRRLLRRL-------', tempo: 66, what: 'nine-stroke roll' },
          { tr: 'xxxxxxxxxxxxX---xxxxxxxxxxxxX---', stick: 'RRLLRRLLRRLLR---LLRRLLRRLLRRL---', tempo: 72, what: 'thirteen-stroke roll' },
        ]);
        return {
          name: 'Rolls · ' + cfg.what, tempo: cfg.tempo, tracks: { snare: cfg.tr }, sticking: cfg.stick,
          how: ['Play it “open”: every double stroke clear and separate, written as sixteenths.', 'The last note is a single accent that lands on the beat. Count to it.', 'Each roll starts on the other hand from the last one.'],
          check: PRAISE + ' The accent lands exactly on the count, not early.',
          tip: 'Rolls are named after how many notes they have: 5 = two doubles + one accent, 9 = four doubles + one.',
        };
      },
    },

    /* -------- Time & grooves -------- */
    {
      id: 'rock', cat: 'time', min: 1, icon: '🎸', title: 'Rock beat',
      goal: 'Cymbal keeps time, snare on 2 and 4, kick on the bottom.',
      build(tier) {
        const cfg = pickTier(tier, [
          { what: 'quarter-note hi-hat', tempo: 80, tracks: { hat: 'x---x---x---x---', snare: '----x-------x---', kick: 'x-------x-------' } },
          { what: 'eighth-note hi-hat', tempo: 90, tracks: { hat: 'x-x-x-x-x-x-x-x-', snare: '----x-------x---', kick: 'x-------x-------' } },
          { what: 'pushed kick and open hat', tempo: 100, tracks: { hat: 'x-x-x-x-x-x-x---', ohat: '--------------x-', snare: '----x-------x---', kick: 'x-------x-x-----' } },
          { what: 'two-handed sixteenth hi-hat', tempo: 92, tracks: { hat: 'xxxx-xxxxxxx-xxx', snare: '----X-------X---', kick: 'x-----x-x-------' }, sticking: 'RLRLRLRLRLRLRLRL' },
        ]);
        return {
          name: 'Rock beat · ' + cfg.what, tempo: cfg.tempo, tracks: cfg.tracks, sticking: cfg.sticking,
          how: ['Play the cymbal part alone and count out loud.', 'Add the snare on 2 and 4, then the kick.', tier === 4 ? 'Right hand moves from the hi-hat to the snare on 2 and 4; the left keeps the hat going.' : 'Hands and kick land exactly together on beat 1: one sound, not two.'],
          check: PRAISE + ' The hi-hat never speeds up when the kick or snare joins in.',
          tip: tier === 3 ? 'The little circle means open the hi-hat. Close it again with your foot on the next beat.' : 'The backbeat (2 and 4) is the beat people clap to. Make it the strongest sound.',
          link: { href: '#beats', label: 'More beats' },
        };
      },
    },
    {
      id: 'kicks', cat: 'time', min: 1, icon: '🦵', title: 'Bass drum variations',
      goal: 'Change the kick pattern while hands keep the same groove.',
      variants: tier => KICKS.filter(k => k[3] <= tier).map(k => [k[0], k[1]]),
      defaultVariant: tier => pickTier(tier, ['k13', 'k1and', 'k1a', 'kfunk']),
      build(tier, variant) {
        const k = KICKS.find(x => x[0] === variant) || KICKS[0];
        return {
          name: 'Kick variation · ' + k[1], tempo: pickTier(tier, [80, 88, 92, 96]),
          tracks: { hat: 'x-x-x-x-x-x-x-x-', snare: '----x-------x---', kick: k[2] },
          how: ['Hi-hat and snare first, on a loop, until they run without thinking.', 'Say the kick’s counts out loud, then add the foot.', 'Try every version on the list, one after another, without stopping the hands.'],
          check: PRAISE + ' The hands do not change when the foot does.',
          tip: 'Kick notes between the hi-hat notes (an “e” or “a”) are the hardest: the foot plays alone there.',
        };
      },
    },
    {
      id: 'styles', cat: 'time', min: 2, icon: '🌍', title: 'Groove styles',
      goal: 'Hear how a few small changes turn one kit into a new style.',
      variants: () => Object.keys(STYLES).map(k => [k, STYLES[k].label]),
      build(tier, variant) {
        const s = STYLES[variant] || STYLES.disco;
        return {
          name: s.label, tempo: s.tempos[tier - 2], tracks: s.tracks, swing: !!s.swing, beats: s.beats,
          how: ['Listen two times through before you play.', 'Name the job of each part: who keeps time, who plays the backbeat, where the kick lands.', 'Play along, then try the next style without looking at the notation.'],
          check: PRAISE + ' Someone listening could name the style.',
          tip: s.tip,
        };
      },
    },
    {
      id: 'ghosts', cat: 'time', min: 2, icon: '👻', title: 'Ghost notes',
      goal: 'Very quiet snare notes between loud backbeats.',
      build(tier) {
        const cfg = pickTier(tier, [null,
          { what: 'one ghost', tempo: 80, tracks: { hat: 'x-x-x-x-x-x-x-x-', snare: '----X--g----X---', kick: 'x-------x-x-----' } },
          { what: 'funk groove', tempo: 88, tracks: { hat: 'XxxxXxxxXxxxXxxx', snare: '----X--g-g--X--g', kick: 'x-----x---x-----' } },
          { what: 'busy funk', tempo: 92, tracks: { hat: 'x-x-x-x-x-x-x-x-', snare: '-g--X--g-g-gX--g', kick: 'x-----x---x--x--' } },
        ]);
        return {
          name: 'Ghost notes · ' + cfg.what, tempo: cfg.tempo, tracks: cfg.tracks,
          how: ['Play the groove without the ghost notes first.', 'Ghosts are tiny: the stick starts about 2 cm (under an inch) from the head.', 'The backbeat stays loud. If the ghosts get louder, slow down.'],
          check: PRAISE + ' Ghosts are felt more than heard; the backbeat still cracks.',
          tip: 'Notes in parentheses are ghost notes. They make a groove feel busy and alive.',
        };
      },
    },

    /* -------- Coordination -------- */
    {
      id: 'together', cat: 'limbs', min: 1, icon: '🤝', title: 'Hands over the kick',
      goal: 'Keep the hands going evenly while the foot plays its own part.',
      build(tier) {
        const cfg = pickTier(tier, [
          { what: 'eighths over quarter-note kick', tempo: 70, tracks: { snare: 'x-x-x-x-x-x-x-x-', kick: 'x---x---x---x---' }, sticking: alternate('x-x-x-x-x-x-x-x-') },
          { what: 'sixteenths over quarter-note kick', tempo: 66, tracks: { snare: 'xxxxxxxxxxxxxxxx', kick: 'x---x---x---x---' }, sticking: 'RLRLRLRLRLRLRLRL' },
          { what: 'sixteenths over a 3 + 3 + 2 kick', tempo: 76, tracks: { snare: 'xxxxXxxxxxxxXxxx', kick: 'x--x--x-x--x--x-' }, sticking: 'RLRLRLRLRLRLRLRL' },
          { what: 'paradiddle groove', tempo: 76, tracks: { hat: 'x-xx-x--x-xx-x--', snare: '-g--X-gg-g--X-gg', kick: 'x-----x-x-------' }, sticking: 'RLRRLRLLRLRRLRLL' },
        ]);
        return {
          name: 'Hands over the kick · ' + cfg.what, tempo: cfg.tempo, tracks: cfg.tracks, sticking: cfg.sticking,
          how: ['Hands alone first, then foot alone, both with the click.', 'Put them together at a slow tempo and say the counts.', 'Listen for flams between hand and foot: notes that should land together must be one sound.'],
          check: PRAISE + ' Hands stay even where the foot joins in.',
          tip: tier === 4 ? 'Right hand on the hi-hat, left hand on the snare: the paradiddle’s accents land on 2 and 4.' : tier === 3 ? '3 + 3 + 2 is a rhythm you hear all over Latin, pop and rock music.' : 'If the hands stumble when the foot plays, the foot is “pulling” them. Go slower.',
        };
      },
    },
    {
      id: 'ostinato', cat: 'limbs', min: 2, icon: '🎯', title: 'Snare moves, ride stays',
      goal: 'One snare note on any count while ride and kick never change.',
      variants: tier => Array.from({ length: 16 }, (_, k) => k).filter(k => tier >= 3 || k % 2 === 0).map(k => ['s' + k, 'Snare on ' + countName(k)]),
      build(tier, variant) {
        const k = Math.max(0, Math.min(15, Number(String(variant || 's0').slice(1)) || 0));
        const snare = rep('-', k) + 'x' + rep('-', 15 - k);
        return {
          name: 'Snare on ' + countName(k), tempo: pickTier(tier, [80, 72, 80, 96]),
          tracks: { ride: tier >= 4 ? 'x-xxx-xxx-xxx-xx' : 'x-x-x-x-x-x-x-x-', snare, kick: 'x-------x-------' },
          how: ['Ride and kick first, until they loop without thinking.', 'Count out loud and add the one snare note on ' + countWord(k) + '.', 'Move the snare to the next count without stopping. Work through every count on the list.'],
          check: PRAISE + ' The ride never wobbles, wherever the snare goes.',
          tip: tier >= 4 ? 'The ride plays a sixteenth-note pattern here, so some snare notes fall where the ride is silent.' : 'This is “independence”: each limb keeps its own part, like four people in one band.',
        };
      },
    },
    {
      id: 'linear', cat: 'limbs', min: 3, icon: '🧵', title: 'Linear grooves',
      goal: 'No two limbs ever play at once: one melody passed between hands and foot.',
      build(tier) {
        const L = tier >= 4 ? linear('KHgK SgHK HgKH SgHK') : linear('KHHK SHKH KHHK SHKH');
        return {
          name: 'Linear groove · ' + (tier >= 4 ? 'with ghost notes' : 'hat, snare, kick'), tempo: tier >= 4 ? 80 : 72, tracks: L.tracks, sticking: L.sticking,
          how: ['Say each note’s drum in order (“kick, hat, hat, kick, snare…”) before you play.', 'Play it very slowly; every note is on its own.', 'Bring it up to tempo only when the gaps are even.'],
          check: PRAISE + ' It sounds like one flowing line, not a stop-start pattern.',
          tip: 'Linear drumming was made famous in funk and fusion. It sounds busy, but only one thing ever happens at a time.',
        };
      },
    },

    /* -------- Fills & form -------- */
    {
      id: 'fills', cat: 'fills', min: 1, icon: '💥', title: 'Fills',
      goal: 'Play one bar of groove, a fill, and land the crash exactly on the next 1.',
      build(tier) {
        const cfg = pickTier(tier, [
          { what: 'eighth notes on beats 3 and 4', tempo: 80, tracks: withFill({ hat: 'x-x-x-x---------', snare: '----x---x-x-x-x-', kick: 'x---------------' }), fill: '--------R-L-R-L-' },
          { what: 'sixteenths on beat 4', tempo: 88, tracks: withFill({ hat: 'x-x-x-x-x-x-----', snare: '----x-------xxxx' }), fill: '------------RLRL' },
          { what: 'snare and tom cascade', tempo: 88, tracks: withFill({ hat: 'x-x-x-x---------', snare: '----x---xxxx----', tomHi: '------------xx--', tomMid: '--------------x-', tomLo: '---------------x' }), fill: '--------RLRLRLRL' },
          { what: 'a whole bar around the kit', tempo: 84, tracks: withFill({ hat: '', snare: 'xxxx------------', tomHi: '----xxxx--------', tomMid: '--------xxxx----', tomLo: '------------xxxx', kick: 'x---x---x---x---' }), fill: 'RLRLRLRLRLRLRLRL' },
        ]);
        return {
          name: 'Fill · ' + cfg.what, tempo: cfg.tempo, tracks: cfg.tracks, sticking: rep('-', 16) + cfg.fill,
          how: ['Count both bars out loud: “1 2 3 4, 1 2 3 4”.', 'Play the groove, start the fill exactly on its count, and keep counting through it.', 'Crash and kick together on the next “1”. That landing matters more than the fill.'],
          check: PRAISE + ' The crash lands on 1 every time, and the fill never rushes.',
          tip: 'A fill is a signal: “something new is coming.” Simple and steady beats fast and messy.',
          link: { href: '#fills', label: 'More fills' },
        };
      },
    },
    {
      id: 'phrase', cat: 'fills', min: 2, icon: '🧭', title: 'Four-bar phrase',
      goal: 'Feel four bars as one phrase: three bars of groove, then a fill into the crash.',
      build(tier) {
        const g = 'x-x-x-x-x-x-x-x-', s = '----x-------x---', k = 'x-------x-------';
        const bar4 = pickTier(tier, [null,
          { hat: 'x-x-x-x-x-x-----', snare: '----x-------xxxx', fill: '------------RLRL' },
          { hat: 'x-x-x-x---------', snare: '----x---xxxxxxxx', fill: '--------RLRLRLRL' },
          { hat: 'x-x-x-x---------', snare: '----x---xxxx----', tomHi: '------------xx--', tomMid: '--------------x-', tomLo: '---------------x', fill: '--------RLRLRLRL' },
        ]);
        const e16 = rep('-', 16), e48 = rep('-', 48);
        const tracks = { crash: 'x' + rep('-', 63), hat: '--' + g.slice(2) + g + g + bar4.hat, snare: s + s + s + bar4.snare, kick: k + k + k + k };
        ['tomHi', 'tomMid', 'tomLo'].forEach(t => { if (bar4[t]) tracks[t] = e48 + bar4[t]; });
        return {
          name: 'Four-bar phrase · fill ' + (tier === 2 ? 'on beat 4' : 'on beats 3 and 4'), tempo: pickTier(tier, [0, 88, 92, 96]), tracks, sticking: e48 + bar4.fill,
          how: ['Count the bar numbers instead of the beats: “ONE 2 3 4, TWO 2 3 4, THREE…”.', 'Play groove for three bars without losing your place.', 'Fill in bar four and crash on the “1” that starts the next phrase.'],
          check: PRAISE + ' You always know which bar you are in.',
          tip: 'Most songs are built from phrases of 4 and 8 bars. Drummers count bars so the band can feel where a section ends.',
        };
      },
    },

    /* -------- Reading & musicianship -------- */
    {
      id: 'subdivision', cat: 'music', min: 1, icon: '🪜', title: 'Subdivision ladder',
      goal: 'Switch between quarters, eighths and sixteenths without changing the beat.',
      build(tier) {
        const Q = 'x---x---x---x---', E = 'x-x-x-x-x-x-x-x-', S = 'xxxxxxxxxxxxxxxx', S3 = 'X--X--X--X--X--X';
        const cfg = pickTier(tier, [
          { bars: [Q, E], tempo: 70, what: 'quarters to eighths' },
          { bars: [Q, E, S], tempo: 66, what: 'quarters, eighths, sixteenths' },
          { bars: [Q, E, S, E], tempo: 80, what: 'up the ladder and back' },
          { bars: [E, S, S3.replace(/-/g, 'x'), E], tempo: 88, what: 'with accents in threes' },
        ]);
        const tr = cfg.bars.join('');
        return {
          name: 'Subdivision ladder · ' + cfg.what, tempo: cfg.tempo, tracks: { snare: tr, kick: rep('x---', cfg.bars.length * 4) }, sticking: naturalSticking(tr),
          how: ['Kick on every beat holds the pulse. It must not change when the hands do.', 'Count each bar the way it is written: “1 2 3 4”, then “1 & 2 &”, then “1 e & a”.', 'Change speed at the bar line, never before.'],
          check: PRAISE + ' Each bar sounds exactly twice as busy as the one before, not just “faster”.',
          tip: tier >= 4 ? 'Accents every three sixteenths cross the beat. Keep the kick on the beat and let the accents roll over it.' : 'Every R falls on a number or an “&”: the right hand marks the beat, the left fills in.',
        };
      },
    },
    {
      id: 'dynamics', cat: 'music', min: 1, icon: '📢', title: 'Dynamics',
      goal: 'Play loud, soft and everything between, on purpose.',
      build(tier) {
        const cfg = pickTier(tier, [
          { tr: 'X---X---X---X---' + 'g---g---g---g---', what: 'loud bar, soft bar', tempo: 70 },
          { tr: 'g-g-g-g-x-x-x-x-' + 'X-X-X-X-X-X-X-X-', what: 'a crescendo in eighths', tempo: 72 },
          { tr: 'ggggxxxxxxxxXXXX' + 'XXXXxxxxxxxxgggg', what: 'crescendo, then diminuendo', tempo: 72 },
          { tr: 'XgxgXgxgXgxgXgxg' + 'gXgxgXgxgXgxgXgx', what: 'three heights at once', tempo: 76 },
        ]);
        return {
          name: 'Dynamics · ' + cfg.what, tempo: cfg.tempo, tracks: { snare: cfg.tr }, sticking: alternate(cfg.tr),
          how: ['Volume comes from stick height, not from hitting harder: high for loud, low for soft.', 'Plan three heights: ghost (2 cm), tap (8 cm), accent (25 cm or more).', 'Keep the tempo steady: crescendos love to speed up.'],
          check: PRAISE + ' Someone listening could draw the volume curve.',
          tip: 'Ghosts are in parentheses, plain notes are medium and “>” marks an accent.',
        };
      },
    },
    {
      id: 'reading', cat: 'music', min: 1, icon: '📖', title: 'Sight-reading',
      goal: 'Read a new two-bar rhythm the first time you see it.',
      reroll: true,
      build(tier, variant, seed) {
        const r = rng(seed == null ? 1 : seed);
        const cells = pickTier(tier, [
          ['x---', 'x---', 'x-x-', '----'],
          ['x---', 'x-x-', '--x-', 'x-x-', '----'],
          ['x-x-', 'xxxx', 'x-xx', 'xxx-', 'x--x', '--x-', 'x---'],
          ['xxxx', 'x-xx', 'xxx-', 'x--x', 'xx-x', '-xxx', '-x-x', '--xx', 'x-x-'],
        ]);
        let tr = '';
        for (let b = 0; b < 8; b++) {
          let c = cells[Math.floor(r() * cells.length)];
          if ((b === 0 || b === 4) && c[0] === '-') c = 'x' + c.slice(1);       // each bar starts on 1, so readers can find their place
          tr += c;
        }
        const tracks = { snare: tr };
        if (tier >= 4) tracks.kick = rep('x-------', 4);
        return {
          name: 'Sight-reading · ' + TIERS[tier - 1].label.toLowerCase(), tempo: pickTier(tier, [70, 72, 66, 72]), tracks, sticking: naturalSticking(tr), seed,
          how: ['Before you play, read it through counting out loud and clapping.', 'Find the hardest beat and practise it alone.', 'Play with the count-in and click. Then press New rhythm and read again.'],
          check: 'You play a brand-new rhythm right the first time at this tempo, three rhythms in a row.',
          tip: tier >= 4 ? 'The kick on 1 and 3 is your anchor. Read the snare against it.' : 'Natural sticking: right hand on every number and “&”, left on every “e” and “a”. It keeps your hands in time.',
        };
      },
    },
  ];
  const exerciseById = id => EXERCISES.find(e => e.id === id);

  /* Quick-start routines: steps an exercise is not yet unlocked for are skipped. */
  const PRESETS = [
    { id: 'warmup', icon: '☀️', label: '5-minute warm-up', blurb: 'Singles, doubles, then a beat.', steps: [['singles', 1.5], ['doubles', 1.5], ['rock', 2]] },
    { id: 'hands', icon: '💪', label: 'Stick control', blurb: 'The rudiments, one by one.', steps: [['singles', 2], ['doubles', 2], ['paradiddle', 2], ['accents', 2], ['flams', 2], ['rolls', 2]] },
    { id: 'groove', icon: '🎚️', label: 'Groove day', blurb: 'Beats, kicks, styles, ghosts.', steps: [['rock', 2], ['kicks', 3], ['styles', 3], ['ghosts', 2]] },
    { id: 'limbs', icon: '🤝', label: 'Four limbs', blurb: 'Independence and coordination.', steps: [['together', 3], ['ostinato', 3], ['linear', 3]] },
    { id: 'song', icon: '🎤', label: 'Play a song', blurb: 'Groove, fills and phrases.', steps: [['rock', 2], ['fills', 3], ['phrase', 3], ['dynamics', 2]] },
    { id: 'reading', icon: '📖', label: 'Read & count', blurb: 'Subdivisions and new rhythms.', steps: [['subdivision', 2], ['reading', 3], ['dynamics', 2]] },
  ];
  function routine(presetId, tier) {
    const p = PRESETS.find(x => x.id === presetId);
    if (!p) return [];
    return p.steps.filter(([id]) => exerciseById(id) && exerciseById(id).min <= tier).map(([id, minutes]) => ({ id, minutes }));
  }

  function variantsFor(id, tier) {
    const e = exerciseById(id);
    return e && e.variants ? e.variants(tier) : null;
  }
  function defaultVariant(id, tier) {
    const e = exerciseById(id), list = variantsFor(id, tier);
    if (!list) return null;
    const v = e.defaultVariant ? e.defaultVariant(tier) : list[0][0];
    return list.some(x => x[0] === v) ? v : list[0][0];
  }
  function rng(seed) {
    let a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* build(id, tier, { variant, lead: 'R'|'L', seed }) → a pattern drums.js plays and engraves. */
  function build(id, tier, opts) {
    opts = opts || {};
    const e = exerciseById(id);
    if (!e) throw new Error('Unknown exercise ' + id);
    tier = Math.max(e.min, Math.min(4, tier || 1));
    const list = variantsFor(id, tier);
    let variant = opts.variant;
    if (list && !list.some(x => x[0] === variant)) variant = defaultVariant(id, tier);
    if (!list) variant = null;
    const ex = e.build(tier, variant, opts.seed);
    const tracks = {};
    let sticking = ex.sticking || '';
    Object.keys(ex.tracks).forEach(k => { if (ex.tracks[k]) tracks[k] = ex.tracks[k]; });
    let graceStick = ex.graceStick || null;
    const lead = opts.lead === 'L' ? 'L' : 'R';
    if (lead === 'L' && sticking) {
      sticking = swapHands(sticking);
      if (graceStick) graceStick = Object.fromEntries(Object.entries(graceStick).map(([k, v]) => [k, swapHands(v)]));
    }
    const pattern = { name: ex.name, desc: e.goal, tempo: ex.tempo, tracks, tip: '' };
    if (sticking) pattern.sticking = sticking;
    if (ex.grace) { pattern.grace = ex.grace; pattern.graceStick = graceStick; }
    if (ex.swing) pattern.swing = true;
    if (ex.beats) pattern.beats = ex.beats;
    return {
      id, cat: e.cat, tier, variant, variants: list, lead, title: ex.name, tempo: ex.tempo,
      how: ex.how, check: ex.check, tip: ex.tip || '', link: ex.link || null, reroll: !!e.reroll, seed: ex.seed,
      hasSticking: !!sticking, pattern,
    };
  }

  /* Everything a test (or a curious page) needs to know is wrong with a pattern. */
  function problems(p) {
    const out = [], beats = p.beats || 4, bar = beats * 4;
    const keys = Object.keys(p.tracks);
    const len = Math.max(...keys.map(k => p.tracks[k].length));
    if (len % bar) out.push('length ' + len + ' is not whole bars of ' + bar);
    keys.forEach(k => {
      if (!PIECES.includes(k)) out.push('unknown kit piece ' + k);
      if (!/^[-xXg]+$/.test(p.tracks[k])) out.push(k + ' has characters other than - x X g');
      if (p.tracks[k].length > len) out.push(k + ' is longer than the pattern');
    });
    const handAt = i => HANDS.some(k => p.tracks[k] && p.tracks[k][i] && p.tracks[k][i] !== '-');
    if (p.sticking) {
      if (p.sticking.length > len) out.push('sticking is longer than the pattern');
      if (!/^[-RL]+$/.test(p.sticking)) out.push('sticking has characters other than - R L');
      for (let i = 0; i < len; i++) {
        const s = p.sticking[i] || '-';
        if (s !== '-' && !handAt(i)) out.push('sticking ' + s + ' at step ' + i + ' has no hand note');
      }
    }
    for (let i = 0; i < len; i++) {
      const hits = HANDS.filter(k => p.tracks[k] && p.tracks[k][i] && p.tracks[k][i] !== '-').length;
      if (hits > 2) out.push(hits + ' hand notes at step ' + i);
    }
    Object.keys(p.grace || {}).forEach(k => {
      if (!p.tracks.snare || !/[xX]/.test(p.tracks.snare[k] || '')) out.push('grace note at ' + k + ' is not before a snare note');
      const main = p.sticking && p.sticking[k], g = (p.graceStick || {})[k];
      if (!g || !main || g.toUpperCase() === main) out.push('flam at ' + k + ' must be played by the other hand');
    });
    if (!(p.tempo >= 50 && p.tempo <= 180)) out.push('tempo ' + p.tempo + ' is outside the player’s 50–180');
    return out;
  }

  const api = { TIERS, LEADS, CATEGORIES, EXERCISES, PRESETS, PIECES, exerciseById, build, routine, variantsFor, defaultVariant, problems, swapHands };
  root.DrumExercises = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
