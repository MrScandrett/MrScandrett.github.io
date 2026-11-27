/* piano-exercises-model.js: the piano lesson's Practice exercises, DOM-free.
 *
 * Every exercise is generated from a key and a level (1 Beginner … 4 Expert), so one
 * pattern serves all twelve major keys and the seven white-key minor keys, with the
 * standard scale fingerings below. build() returns timed events for each hand;
 * engrave() turns them into a grand-staff SVG string (MusicNotation's Bravura glyphs are
 * passed in, so the tests run it in Node). The page (piano-exercises.js) only plays,
 * draws and remembers.
 *
 * Times and durations are in quarter-note beats, 4/4 throughout, and no note crosses a
 * bar line. Pitches are spelled for the key ("F#4", "Bb3"), never guessed from MIDI.
 */
(function (root) {
  'use strict';

  const LETTERS = 'CDEFGAB';
  const NAT = [0, 2, 4, 5, 7, 9, 11];
  const ACC = { '-2': 'bb', '-1': 'b', 0: '', 1: '#', 2: '##' };
  const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11],
    natural: [0, 2, 3, 5, 7, 8, 10],
    harmonic: [0, 2, 3, 5, 7, 8, 11],
    melodic: [0, 2, 3, 5, 7, 9, 11],
  };
  const METER = 4;
  const EPS = 1e-6;

  /* ---- Keys and their standard one-octave scale fingerings ----------------------------
     d: the finger on each scale degree in the middle of a run (degree 1 = the tonic),
     first: the finger on the very first (lowest) note, top: on the very last (highest).
     Descending uses the same finger on each note. */
  const C_RH = { d: [1, 2, 3, 1, 2, 3, 4], first: 1, top: 5 };
  const C_LH = { d: [1, 4, 3, 2, 1, 3, 2], first: 5, top: 1 };
  const B_LH = { d: [1, 3, 2, 1, 4, 3, 2], first: 4, top: 1 };
  const F_RH = { d: [1, 2, 3, 4, 1, 2, 3], first: 1, top: 4 };
  const FLAT_LH = { d: [3, 2, 1, 4, 3, 2, 1], first: 3, top: 3 };
  const KEYS = [
    ['C', 'C major', 'C', 'major', 0, C_RH, C_LH],
    ['G', 'G major', 'G', 'major', 1, C_RH, C_LH],
    ['D', 'D major', 'D', 'major', 2, C_RH, C_LH],
    ['A', 'A major', 'A', 'major', 3, C_RH, C_LH],
    ['E', 'E major', 'E', 'major', 4, C_RH, C_LH],
    ['B', 'B major', 'B', 'major', 5, C_RH, B_LH],
    ['Fs', 'F♯ major', 'F#', 'major', 6, { d: [2, 3, 4, 1, 2, 3, 1], first: 2, top: 2 }, { d: [4, 3, 2, 1, 3, 2, 1], first: 4, top: 4 }],
    ['Db', 'D♭ major', 'Db', 'major', -5, { d: [2, 3, 1, 2, 3, 4, 1], first: 2, top: 2 }, FLAT_LH],
    ['Ab', 'A♭ major', 'Ab', 'major', -4, { d: [3, 4, 1, 2, 3, 1, 2], first: 3, top: 3 }, FLAT_LH],
    ['Eb', 'E♭ major', 'Eb', 'major', -3, { d: [3, 1, 2, 3, 4, 1, 2], first: 3, top: 3 }, FLAT_LH],
    ['Bb', 'B♭ major', 'Bb', 'major', -2, { d: [4, 1, 2, 3, 1, 2, 3], first: 2, top: 4 }, FLAT_LH],
    ['F', 'F major', 'F', 'major', -1, F_RH, C_LH],
    ['Am', 'A minor', 'A', 'minor', 0, C_RH, C_LH],
    ['Em', 'E minor', 'E', 'minor', 1, C_RH, C_LH],
    ['Bm', 'B minor', 'B', 'minor', 2, C_RH, B_LH],
    ['Dm', 'D minor', 'D', 'minor', -1, C_RH, C_LH],
    ['Gm', 'G minor', 'G', 'minor', -2, C_RH, C_LH],
    ['Cm', 'C minor', 'C', 'minor', -3, C_RH, C_LH],
    ['Fm', 'F minor', 'F', 'minor', -4, F_RH, C_LH],
  ].map(([id, label, tonic, mode, sig, rh, lh]) => ({ id, label, tonic, mode, sig, rh, lh }));
  const keyById = id => KEYS.find(k => k.id === id) || KEYS[0];

  const TIERS = [
    { n: 1, id: 'beginner', label: 'Beginner', icon: '🌱' },
    { n: 2, id: 'intermediate', label: 'Intermediate', icon: '🌿' },
    { n: 3, id: 'advanced', label: 'Advanced', icon: '🌳' },
    { n: 4, id: 'expert', label: 'Expert', icon: '🏔️' },
  ];

  /* ---- Spelling ----------------------------------------------------------------------- */
  function tonicOf(key) {
    const acc = key.tonic.slice(1);
    return { l: LETTERS.indexOf(key.tonic[0]), a: acc === '#' ? 1 : acc === 'b' ? -1 : 0 };
  }
  const mod = (n, m) => ((n % m) + m) % m;
  /* Scale degree (0 = tonic, any integer) in the octave where the tonic is written `octave`. */
  function spell(key, semis, degree, octave) {
    const t = tonicOf(key);
    const midi = 12 * (octave + 1) + NAT[t.l] + t.a + semis[mod(degree, 7)] + 12 * Math.floor(degree / 7);
    const dia = octave * 7 + t.l + degree;
    const l = mod(dia, 7), o = Math.floor(dia / 7);
    const a = midi - (12 * (o + 1) + NAT[l]);
    if (ACC[a] === undefined) throw new Error('Unspellable degree ' + degree + ' in ' + key.label);
    return { name: LETTERS[l] + ACC[a] + o, midi };
  }
  const defaultScale = key => key.mode === 'minor' ? 'harmonic' : 'major';
  const isWhite = midi => NAT.includes(mod(midi, 12));
  /* Where the hands sit: one octave apart for short patterns; for two-octave runs the right
     hand starts lower on G–B tonics and the left hand drops to octave 2, so neither hand
     climbs far past its staff. */
  function octaves(key, span) {
    const pc = mod(NAT[tonicOf(key).l] + tonicOf(key).a, 12);
    if (span <= 9) return { rh: 4, lh: 3 };
    return { rh: pc >= 7 ? 3 : 4, lh: 2 };
  }
  function freq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  /* ---- Building tracks ----------------------------------------------------------------- */
  const NOTATABLE = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25];
  function Track() { this.t = 0; this.ev = []; }
  Track.prototype.add = function (notes, d, extra) {
    notes = [].concat(notes).sort((a, b) => a.midi - b.midi);
    this.ev.push(Object.assign({ t: this.t, d, ps: notes.map(n => n.name), midi: notes.map(n => n.midi) }, extra || {}));
    this.t += d;
    return this;
  };
  Track.prototype.rest = function (d) { this.ev.push({ t: this.t, d, rest: true, ps: [], midi: [] }); this.t += d; return this; };
  /* Last note: fills the bar (a whole note if the bar is full), then rests if it can't be one value. */
  Track.prototype.finish = function (notes, extra) {
    let left = (Math.ceil((this.t - EPS) / METER) * METER) - this.t;
    if (left < EPS) left = METER;
    const first = NOTATABLE.find(v => v <= left + EPS);
    this.add(notes, first, extra);
    left -= first;
    while (left > EPS) { const r = [4, 2, 1, 0.5, 0.25].find(v => v <= left + EPS); this.rest(r); left -= r; }
    return this;
  };

  function runFingers(table, count) {
    return Array.from({ length: count }, (_, i) => i === 0 ? table.first : i === count - 1 ? table.top : table.d[i % 7]);
  }
  /* Thumb-tuck groups: five keys in the direction of travel (up for the right hand, down
     for the left). Each fingering has one thumb passing under inside the group; the first
     whose thumb notes are all white wins. The key's own scale fingering for those keys
     comes second, so a moved crossing is the one the scale itself uses. */
  const THUMB_TUCK = [
    [1, 2, 3, 1, 2], [2, 3, 1, 2, 3], [3, 1, 2, 3, 4],
    [1, 2, 3, 4, 1], [2, 3, 4, 1, 2], [3, 4, 1, 2, 3], [4, 1, 2, 3, 4],
    [1, 2, 1, 2, 3], [2, 1, 2, 3, 4],
  ];
  function thumbTuckFingers(notes, scaleFingers) {
    const tucks = f => f.some((x, i) => i > 0 && x === 1 && f[i - 1] > 1);
    const ok = f => tucks(f) && f.every((x, i) => x !== 1 || isWhite(notes[i].midi));
    return [THUMB_TUCK[0], scaleFingers].concat(THUMB_TUCK.slice(1)).find(ok) || null;
  }
  const pickTier = (tier, list) => list[Math.max(0, Math.min(list.length, tier) - 1)];

  /* ---- Chords --------------------------------------------------------------------------- */
  function triadDegrees(deg, seventh) { return seventh ? [deg, deg + 2, deg + 4, deg + 6] : [deg, deg + 2, deg + 4]; }
  function rotate(degs, k) { return degs.slice(k).concat(degs.slice(0, k).map(d => d + 7)); }
  const INV_RH = [[1, 3, 5], [1, 2, 5], [1, 3, 5]];
  const INV_LH = [[5, 3, 1], [5, 3, 1], [5, 2, 1]];
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  function chordQuality(midis) {
    const r = midis[0], third = mod(midis[1] - r, 12), fifth = mod(midis[2] - r, 12), sev = midis[3] != null ? mod(midis[3] - r, 12) : null;
    const tri = third === 4 && fifth === 8 ? 'aug' : third === 4 ? 'maj' : fifth === 6 ? 'dim' : 'min';
    return { tri, sev };
  }
  /* Roman numeral and chord symbol for a chord given in root position. */
  function chordLabel(key, deg, rootPos) {
    const q = chordQuality(rootPos.map(n => n.midi));
    let roman = ROMAN[mod(deg, 7)];
    if (q.tri === 'min' || q.tri === 'dim') roman = roman.toLowerCase();
    const root = rootPos[0].name.replace(/-?\d+$/, '').replace('#', '♯').replace(/b$/, '♭').replace('b', '♭');
    let sym = root + (q.tri === 'min' ? 'm' : q.tri === 'dim' ? '°' : q.tri === 'aug' ? '+' : '');
    if (q.tri === 'dim') roman += '°';
    if (q.sev != null) {
      if (q.tri === 'maj' && q.sev === 10) { roman += '7'; sym += '7'; }
      else if (q.tri === 'maj') { roman += 'maj7'; sym += 'maj7'; }
      else if (q.tri === 'dim' && q.sev === 10) { roman = roman.replace('°', 'ø7'); sym = sym.replace('°', 'ø7'); }
      else { roman += '7'; sym += '7'; }
    }
    return { roman, sym };
  }
  /* Right-hand voicings that move as little as possible from chord to chord. */
  function voiceLead(key, specs) {
    let prev = null;
    return specs.map(spec => {
      const semis = SCALES[spec.scale || defaultScale(key)];
      const degs = triadDegrees(spec.deg, spec.seventh);
      const rootPos = degs.map(d => spell(key, semis, d, 4));
      const options = [];
      degs.forEach((_, k) => [-14, -7, 0, 7].forEach(shift => {
        const notes = rotate(degs, k).map(d => spell(key, semis, d + shift, 4));
        if (notes[0].midi >= 55 && notes[0].midi <= 67) options.push({ k, notes });
      }));
      const cost = o => prev ? o.notes.reduce((s, n, i) => s + Math.abs(n.midi - (prev[i] ? prev[i].midi : prev[prev.length - 1].midi)), 0) : Math.abs(o.notes[0].midi - 60) + o.k * 3;
      const best = options.sort((a, b) => cost(a) - cost(b))[0];
      prev = best.notes;
      let bd = spec.deg, bass = spell(key, semis, bd, 3);
      while (bass.midi > 51) { bd -= 7; bass = spell(key, semis, bd, 3); }
      while (bass.midi < 40) { bd += 7; bass = spell(key, semis, bd, 3); }
      return { notes: best.notes, k: best.k, bass, label: chordLabel(key, spec.deg, rootPos), triad: !spec.seventh };
    });
  }
  const P = (deg, scale) => ({ deg, scale });
  const P7 = (deg, scale) => ({ deg, scale, seventh: true });
  function progressionFor(key, tier) {
    const minor = key.mode === 'minor';
    if (!minor) return pickTier(tier, [
      { name: 'I–IV–V–I', chords: [P(0), P(3), P(4), P(0)], d: 4 },
      { name: 'I–V–vi–IV', chords: [P(0), P(4), P(5), P(3), P(0)], d: 4 },
      { name: 'ii–V7–I', chords: [P(1), P7(4), P(0), P(0)], d: 4 },
      { name: 'the circle: I–IV–vii°–iii–vi–ii–V–I', chords: [P(0), P(3), P(6), P(2), P(5), P(1), P(4), P(0)], d: 2 },
    ]);
    return pickTier(tier, [
      { name: 'i–iv–V–i', chords: [P(0), P(3), P(4), P(0)], d: 4 },
      { name: 'i–VI–iv–V–i', chords: [P(0), P(5, 'natural'), P(3), P(4), P(0)], d: 4 },
      { name: 'ii°–V7–i', chords: [P(1), P7(4), P(0), P(0)], d: 4 },
      { name: 'the circle: i–iv–VII–III–VI–ii°–V–i', chords: [P(0), P(3), P(6, 'natural'), P(2, 'natural'), P(5, 'natural'), P(1), P(4), P(0)], d: 2 },
    ]);
  }
  function chordTracks(key, voiced, d, opts) {
    opts = opts || {};
    const rh = new Track(), lh = new Track();
    voiced.forEach((c, i) => {
      const last = i === voiced.length - 1;
      const extra = { f: c.triad ? INV_RH[c.k] : null, label: opts.labels === false ? null : c.label.roman + ' · ' + c.label.sym };
      if (opts.vels) extra.vels = opts.vels;
      if (last && !opts.keepLast) rh.finish(c.notes, extra); else rh.add(c.notes, d, extra);
      const lhExtra = { vel: opts.lhVel };
      if (last && !opts.keepLast) lh.finish([c.bass], lhExtra); else lh.add([c.bass], d, lhExtra);
    });
    return { rh: rh.ev, lh: lh.ev };
  }

  /* ---- The exercises --------------------------------------------------------------------- */
  const CATEGORIES = [
    { id: 'keys', icon: '🎼', label: 'Scales & keys', blurb: 'Know every key by feel.' },
    { id: 'chords', icon: '🎹', label: 'Chords & arpeggios', blurb: 'Shapes, inversions, smooth moves.' },
    { id: 'fingers', icon: '🖐️', label: 'Finger strength', blurb: 'Even, independent, relaxed fingers.' },
    { id: 'rhythm', icon: '🥁', label: 'Rhythm & coordination', blurb: 'Two hands, two jobs, one pulse.' },
    { id: 'music', icon: '🎶', label: 'Musicianship', blurb: 'Shape, touch, pedal and ear.' },
  ];

  const RHYTHMS = {
    even4: { label: 'Even quarters', durs: [1] },
    even8: { label: 'Even eighths', durs: [0.5] },
    longShort: { label: 'Long–short (dotted)', durs: [0.75, 0.25] },
    shortLong: { label: 'Short–long (snap)', durs: [0.25, 0.75] },
    gallop: { label: 'Gallop (eighth + two sixteenths)', durs: [0.5, 0.25, 0.25] },
    accent3: { label: 'Accent every third note', durs: [0.5], accentEvery: 3 },
  };

  function scaleRun(key, scaleName, octs, octave, dir) {
    const up = Array.from({ length: 7 * octs + 1 }, (_, i) => i);
    const asc = scaleName === 'melodic' ? 'melodic' : scaleName;
    const desc = scaleName === 'melodic' ? 'natural' : scaleName;
    const ups = up.map(d => spell(key, SCALES[asc], d, octave));
    const downs = up.slice(0, -1).reverse().map(d => spell(key, SCALES[desc], d, octave));
    return dir === 'up' ? ups : dir === 'down' ? downs : ups.concat(downs);
  }

  const EXERCISES = [
    /* -------- Scales & keys -------- */
    {
      id: 'scale', cat: 'keys', min: 1, icon: '🪜', title: 'Scale, hands together',
      goal: 'Smooth thumb crossings and even tone through the whole key.',
      variants: key => key.mode === 'minor'
        ? [['harmonic', 'Harmonic minor'], ['natural', 'Natural minor'], ['melodic', 'Melodic minor (up melodic, down natural)']]
        : null,
      build(key, tier, variant) {
        const cfg = pickTier(tier, [{ o: 1, d: 1, tempo: 60 }, { o: 2, d: 0.5, tempo: 60 }, { o: 2, d: 0.25, tempo: 60 }, { o: 2, d: 0.25, tempo: 88 }]);
        const scaleName = key.mode === 'minor' ? (variant || 'harmonic') : 'major';
        const oc = octaves(key, 7 * cfg.o);
        const count = 7 * cfg.o + 1;
        const tracks = { rh: new Track(), lh: new Track() };
        ['rh', 'lh'].forEach(h => {
          const notes = scaleRun(key, scaleName, cfg.o, oc[h]);
          const fingers = runFingers(key[h], count);
          const all = fingers.concat(fingers.slice(0, -1).reverse());
          notes.forEach((n, i) => {
            const extra = { f: [all[i]] };
            if (i === notes.length - 1) tracks[h].finish([n], extra); else tracks[h].add([n], cfg.d, extra);
          });
        });
        return {
          title: key.label + ' scale' + (key.mode === 'minor' ? ' · ' + scaleName : '') + ', ' + cfg.o + ' octave' + (cfg.o > 1 ? 's' : ''),
          tempo: cfg.tempo, rh: tracks.rh.ev, lh: tracks.lh.ev,
          how: ['Right hand alone, then left hand alone, slowly enough to never stop.', 'Watch the crossings: the thumb slides under early, the hand travels level.', 'Hands together only when each hand is easy on its own.'],
          check: 'Three clean runs in a row at the target tempo, with no bump at the thumb crossings.',
          tip: key.mode === 'minor' ? 'Harmonic minor raises the 7th; listen for the wide step just before the top.' : 'Each key has its own finger groups. The 4th finger lands once per octave: find it first.',
        };
      },
    },
    {
      id: 'contrary', cat: 'keys', min: 3, icon: '↔️', title: 'Scale in contrary motion',
      goal: 'Hands mirror each other from one note: the same fingers move at the same time.',
      build(key, tier) {
        const o = tier >= 4 ? 2 : 1, octave = 4, count = 7 * o + 1;
        const semis = SCALES[defaultScale(key)];
        const rh = new Track(), lh = new Track();
        const rhNotes = Array.from({ length: count }, (_, i) => spell(key, semis, i, octave));
        const lhNotes = Array.from({ length: count }, (_, i) => spell(key, semis, -i, octave));
        const rhF = runFingers(key.rh, count), lhF = runFingers(key.lh, count).reverse();
        const seq = (arr) => arr.concat(arr.slice(0, -1).reverse());
        const rhAll = seq(rhNotes), lhAll = seq(lhNotes), rf = seq(rhF), lf = seq(lhF);
        const d = tier >= 4 ? 0.25 : 0.5;
        rhAll.forEach((n, i) => i === rhAll.length - 1 ? rh.finish([n], { f: [rf[i]] }) : rh.add([n], d, { f: [rf[i]] }));
        lhAll.forEach((n, i) => i === lhAll.length - 1 ? lh.finish([n], { f: [lf[i]] }) : lh.add([n], d, { f: [lf[i]] }));
        return {
          title: key.label + ', contrary motion, ' + o + ' octave' + (o > 1 ? 's' : ''),
          tempo: tier >= 4 ? 72 : 76, rh: rh.ev, lh: lh.ev,
          how: ['Both thumbs start on the same tonic.', 'Move apart, then back together: both thumbs cross at the same moment.', 'Say the finger numbers aloud the first time.'],
          check: 'Both hands land on the top and bottom notes exactly together.',
          tip: 'Contrary motion is the easiest way to play a new key hands together: the hands are mirror images.',
        };
      },
    },
    /* -------- Chords & arpeggios -------- */
    {
      id: 'inversions', cat: 'chords', min: 1, icon: '🧱', title: 'Solid chord inversions',
      goal: 'Know each chord in root position, 1st and 2nd inversion without searching.',
      build(key, tier) {
        const cfg = pickTier(tier, [
          { degs: [0], d: 2, tempo: 66 }, { degs: [0, 3, 4], d: 1, tempo: 72 },
          { degs: [0, 1, 2, 3, 4, 5, 6], d: 0.5, tempo: 66 }, { degs: [0, 1, 2, 3, 4, 5, 6], d: 0.5, tempo: 92 },
        ]);
        const semis = SCALES[defaultScale(key)];
        const rh = new Track(), lh = new Track();
        cfg.degs.forEach((c, ci) => {
          const start = c >= 4 ? c - 7 : c;
          const shapes = [0, 1, 2, 3, 2, 1, 0];
          shapes.forEach((k, i) => {
            const degs = k === 3 ? triadDegrees(start + 7) : rotate(triadDegrees(start), k);
            const kk = k === 3 ? 0 : k;
            const rn = degs.map(d => spell(key, semis, d, 4));
            const ln = degs.map(d => spell(key, semis, d, 3));
            const lastOfChord = i === shapes.length - 1;
            const d = lastOfChord ? (cfg.d === 2 ? 4 : cfg.d * 2) : cfg.d;
            const label = i === 0 ? chordLabel(key, c, triadDegrees(c).map(x => spell(key, semis, x, 4))) : null;
            const ex = { f: INV_RH[kk], label: label ? label.roman + ' · ' + label.sym : null };
            if (lastOfChord && ci === cfg.degs.length - 1) { rh.finish(rn, ex); lh.finish(ln, { f: INV_LH[kk] }); }
            else { rh.add(rn, d, ex); lh.add(ln, d, { f: INV_LH[kk] }); }
          });
        });
        return {
          title: 'Inversions in ' + key.label + (cfg.degs.length > 1 ? ' · ' + (cfg.degs.length === 3 ? 'primary chords' : 'every chord in the key') : ' · tonic chord'),
          tempo: cfg.tempo, rh: rh.ev, lh: lh.ev,
          how: ['Root position, 1st inversion, 2nd inversion, root an octave up, and back down.', 'Shape the hand over the next chord before you play it: no peeking between chords.', 'Right hand fingers 1-3-5 · 1-2-5 · 1-3-5; left hand 5-3-1 · 5-3-1 · 5-2-1.'],
          check: 'Every chord sounds together (no "rolled" notes) and the hand stays relaxed between shapes.',
          tip: 'In each inversion one interval is a 4th: find where the gap is and the fingering follows.',
        };
      },
    },
    {
      id: 'broken', cat: 'chords', min: 2, icon: '🌊', title: 'Broken-chord inversions',
      goal: 'Turn each inversion into a flowing broken pattern (bottom–middle–top–middle).',
      build(key, tier) {
        const cfg = pickTier(tier, [null, { degs: [0], d: 0.5, tempo: 72 }, { degs: [0, 3, 4, 0], d: 0.5, tempo: 80 }, { degs: [0, 3, 4, 0], d: 0.25, tempo: 72 }]);
        const semis = SCALES[defaultScale(key)];
        const rh = new Track(), lh = new Track();
        cfg.degs.forEach((c, ci) => {
          const start = c >= 4 ? c - 7 : c;
          const shapes = cfg.degs.length > 1 ? [0, 1, 2, 3] : [0, 1, 2, 3, 2, 1, 0];
          shapes.forEach((k, si) => {
            const degs = k === 3 ? triadDegrees(start + 7) : rotate(triadDegrees(start), k);
            const kk = k === 3 ? 0 : k;
            const order = [0, 1, 2, 1];
            order.forEach((j, oi) => {
              const fr = INV_RH[kk][j], fl = INV_LH[kk][j];
              rh.add([spell(key, semis, degs[j], 4)], cfg.d, { f: si === 0 || oi === 0 ? [fr] : null, label: si === 0 && oi === 0 ? chordLabel(key, c, triadDegrees(c).map(x => spell(key, semis, x, 4))).sym : null });
              lh.add([spell(key, semis, degs[j], 3)], cfg.d, { f: si === 0 || oi === 0 ? [fl] : null });
            });
          });
        });
        rh.finish([spell(key, semis, 0, 4), spell(key, semis, 2, 4), spell(key, semis, 4, 4)], { f: [1, 3, 5] });
        lh.finish([spell(key, semis, 0, 3), spell(key, semis, 2, 3), spell(key, semis, 4, 3)], { f: [5, 3, 1] });
        return {
          title: 'Broken inversions in ' + key.label,
          tempo: cfg.tempo, rh: rh.ev, lh: lh.ev,
          how: ['Play the solid chord silently first, then break it: bottom, middle, top, middle.', 'Let the wrist make a small circle; fingers stay close to the keys.', 'Keep the pattern even, then try it at a quieter dynamic.'],
          check: 'The broken notes are as even as a ticking clock, with no accent on the thumb.',
          tip: 'This is the pattern behind many accompaniments: think of it as a chord, not single notes.',
        };
      },
    },
    {
      id: 'arpeggio', cat: 'chords', min: 2, icon: '🌈', title: 'Arpeggios',
      goal: 'Travel across octaves on the tonic chord with a level, travelling hand.',
      build(key, tier) {
        const cfg = pickTier(tier, [null, { o: 1, d: 0.5, tempo: 66, inv: [0] }, { o: 2, d: 0.5, tempo: 72, inv: [0] }, { o: 2, d: 0.25, tempo: 66, inv: [0, 1] }]);
        const semis = SCALES[defaultScale(key)];
        const oc = octaves(key, 7 * cfg.o + 2);
        const rh = new Track(), lh = new Track();
        let fingered = true;
        cfg.inv.forEach((inv, ii) => {
          const base = rotate([0, 2, 4], inv);
          const up = [];
          for (let o = 0; o < cfg.o; o++) base.forEach(d => up.push(d + 7 * o));
          up.push(base[0] + 7 * cfg.o);
          const seq = up.concat(up.slice(0, -1).reverse());
          ['rh', 'lh'].forEach(h => {
            const notes = seq.map(d => spell(key, semis, d, oc[h]));
            const triad = base.map(d => spell(key, semis, d, 4));
            const rootWhite = isWhite(spell(key, semis, 0, 4).midi), allWhite = triad.every(n => isWhite(n.midi));
            let table = null;
            if (h === 'rh' && inv === 0 && rootWhite) table = { d: [1, 2, 3], first: 1, top: 5 };
            if (h === 'rh' && inv === 1 && allWhite) table = { d: [1, 2, 4], first: 1, top: 5 };
            if (h === 'lh' && allWhite) table = { d: [1, 4, 2], first: 5, top: 1 };
            if (!table) fingered = false;
            const count = up.length;
            const fs = table ? Array.from({ length: count }, (_, i) => i === 0 ? table.first : i === count - 1 ? table.top : table.d[i % 3]) : null;
            const all = fs ? fs.concat(fs.slice(0, -1).reverse()) : null;
            const tr = h === 'rh' ? rh : lh;
            notes.forEach((n, i) => {
              const extra = { f: all ? [all[i]] : null };
              if (i === notes.length - 1) {
                if (ii === cfg.inv.length - 1) tr.finish([n], extra); else tr.add([n], cfg.d * 2, extra);
              } else tr.add([n], cfg.d, extra);
            });
          });
        });
        return {
          title: key.label + ' arpeggio, ' + cfg.o + ' octave' + (cfg.o > 1 ? 's' : '') + (cfg.inv.length > 1 ? ' + 1st inversion' : ''),
          tempo: cfg.tempo, rh: rh.ev, lh: lh.ev,
          how: ['Block the chord first so the hand knows the shape.', 'Let the elbow lead the hand sideways; the thumb passes under without twisting the wrist.', 'Practise just the crossing (3 → 1 → 2) until it is smooth, then the whole run.'],
          check: 'The crossing note is no louder or later than its neighbours.',
          tip: fingered ? 'Fingering shown is the standard one for this key.' : 'This key puts black keys in the chord: plan your own fingering so the thumb lands on white keys at each crossing, and write it in.',
        };
      },
    },
    {
      id: 'progression', cat: 'chords', min: 1, icon: '🔁', title: 'Chord progressions',
      goal: 'Change chords with the smallest possible move between hands.',
      build(key, tier) {
        const prog = progressionFor(key, tier);
        const voiced = voiceLead(key, prog.chords);
        const t = chordTracks(key, voiced, prog.d);
        return {
          title: key.label + ': ' + prog.name,
          tempo: pickTier(tier, [72, 80, 88, 96]), rh: t.rh, lh: t.lh,
          how: ['Left hand plays the root; right hand keeps common notes in place and moves the others by step.', 'Count 1-2-3-4 and change exactly on beat 1.', 'Next: play it as broken chords, or make up a melody over it.'],
          check: 'No silent gap between chords, and you can say each Roman numeral as you play it.',
          tip: 'The voicings shown are chosen to move as little as possible: that is called voice leading.',
        };
      },
    },
    /* -------- Finger strength -------- */
    {
      id: 'five-finger', cat: 'fingers', min: 1, icon: '✋', title: 'Five-finger patterns',
      goal: 'Five fingers on five keys: equal weight from thumb to little finger.',
      build(key, tier) {
        const semis = SCALES[defaultScale(key)];
        const rh = new Track(), lh = new Track();
        const R = d => spell(key, semis, d, 4), L = d => spell(key, semis, d, 3);
        let title, tempo, how, check;
        if (tier === 1) {
          [0, 1, 2, 3, 4, 3, 2, 1].forEach(d => { rh.add([R(d)], 1, { f: [d + 1] }); lh.add([L(d)], 1, { f: [5 - d] }); });
          rh.finish([R(0)], { f: [1] }); lh.finish([L(0)], { f: [5] });
          title = 'Five-finger pattern in ' + key.label; tempo = 72;
          how = ['Curve the fingers as if holding a ball; rest each finger on its key.', 'Play up and back, saying the finger numbers.', 'Hands together: both thumbs move in opposite directions on the keyboard, the same numbers in each hand.'];
          check = 'Every note the same loudness: record yourself and listen for a "weak 4".';
        } else if (tier === 2) {
          const minor = SCALES[key.mode === 'minor' ? 'major' : 'natural'];
          const other = d => spell(key, minor, d, 4), otherL = d => spell(key, minor, d, 3);
          [[R, L], [other, otherL]].forEach(([r, l]) => [0, 1, 2, 3, 4, 3, 2, 1].forEach(d => { rh.add([r(d)], 0.5, { f: [d + 1] }); lh.add([l(d)], 0.5, { f: [5 - d] }); }));
          rh.finish([R(0), R(2), R(4)], { f: [1, 3, 5] }); lh.finish([L(0), L(2), L(4)], { f: [5, 3, 1] });
          title = 'Five-finger pattern: ' + (key.mode === 'minor' ? 'minor, then major' : 'major, then minor'); tempo = 76;
          how = ['Play the pattern, then change only the middle finger (the 3rd) by a half step.', 'Hear the change from bright to dark.', 'Finish on the chord you just walked through.'];
          check = 'You can switch between major and minor in any key without stopping.';
        } else if (tier === 3) {
          [[0, 2, 1, 3, 2, 4, 3, 1], [4, 2, 3, 1, 2, 0, 1, 3]].forEach(cell => cell.forEach(d => { rh.add([R(d)], 0.5, { f: [d + 1] }); lh.add([L(d)], 0.5, { f: [5 - d] }); }));
          [0, 2, 1, 3, 2, 4, 3, 1].forEach(d => { rh.add([R(d)], 0.5); lh.add([L(d)], 0.5); });
          rh.finish([R(0)], { f: [1] }); lh.finish([L(0)], { f: [5] });
          title = 'Skips in the five-finger position'; tempo = 80;
          how = ['Each pair skips a key: 1-3, 2-4, 3-5.', 'Keep the fingers you are not using resting lightly on their keys.', 'Then hands together.'];
          check = 'The skips are as even as steps, with no extra hand movement.';
        } else {
          [0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1].forEach(d => { rh.add([R(d)], 0.25, { f: [d + 1] }); lh.add([L(-d + 0)], 0.25, { f: [d + 1] }); });
          [0, 1, 2, 3, 4, 3, 2, 1].forEach(d => { rh.add([R(d)], 0.5); lh.add([L(-d)], 0.5); });
          rh.finish([R(0)], { f: [1] }); lh.finish([L(0)], { f: [1] });
          title = 'Five-finger pattern in contrary motion, sixteenths'; tempo = 72;
          how = ['Both thumbs share the tonic (an octave apart); hands move outward together.', 'Bar 1 in sixteenths, bar 2 in eighths: feel the speed change.', 'Keep the wrist loose; speed comes from small movements.'];
          check = 'Clean sixteenths at ♩ = 72 with no tension in the forearm.';
        }
        return { title, tempo, rh: rh.ev, lh: lh.ev, how, check, tip: 'If a finger collapses at the first joint, slow down until it holds its shape.' };
      },
    },
    {
      id: 'hanon', cat: 'fingers', min: 1, icon: '🖐️', title: 'Hanon pattern No. 1',
      goal: 'A climbing pattern that trains fingers 4 and 5 to match the others.',
      build(key, tier) {
        const cfg = pickTier(tier, [{ n: 2, d: 0.5, tempo: 60 }, { n: 4, d: 0.5, tempo: 72 }, { n: 7, d: 0.5, tempo: 88 }, { n: 7, d: 0.25, tempo: 72 }]);
        const semis = SCALES[defaultScale(key)];
        const rh = new Track(), lh = new Track();
        const UP = [0, 2, 3, 4, 5, 4, 3, 2], DN = [5, 3, 2, 1, 0, 1, 2, 3];
        const UF = [1, 2, 3, 4, 5], UL = [5, 4, 3, 2, 1], DF = [5, 4, 3, 2, 1], DL = [1, 2, 3, 4, 5];
        for (let k = 0; k < cfg.n; k++) UP.forEach((d, i) => {
          rh.add([spell(key, semis, d + k, 4)], cfg.d, { f: k === 0 && i < 5 ? [UF[i]] : null });
          lh.add([spell(key, semis, d + k, 3)], cfg.d, { f: k === 0 && i < 5 ? [UL[i]] : null });
        });
        for (let m = cfg.n; m >= 1; m--) DN.forEach((d, i) => {
          rh.add([spell(key, semis, d + m, 4)], cfg.d, { f: m === cfg.n && i < 5 ? [DF[i]] : null });
          lh.add([spell(key, semis, d + m, 3)], cfg.d, { f: m === cfg.n && i < 5 ? [DL[i]] : null });
        });
        rh.finish([spell(key, semis, 0, 4)], { f: [1] }); lh.finish([spell(key, semis, 0, 3)], { f: [5] });
        return {
          title: 'Hanon No. 1 pattern in ' + key.label + (cfg.n < 7 ? ' · ' + cfg.n + ' steps' : ' · full octave'),
          tempo: cfg.tempo, rh: rh.ev, lh: lh.ev,
          how: ['Same fingers in every group: only the first group is numbered.', 'Lift each finger from the knuckle, not the wrist.', 'Begin at ♩ = 60 and raise the tempo by 4 only after three clean repeats.'],
          check: 'Fingers 4 and 5 sound as strong as 1, 2 and 3.',
          tip: 'For the whole set of twenty, open the Hanon worksheet.',
          link: { href: '#hanon-coach', label: 'Open the full Hanon worksheet' },
        };
      },
    },
    {
      id: 'thumb', cat: 'fingers', min: 1, icon: '👍', title: 'Thumb-tuck drill',
      goal: 'Slide the thumb under and the 3rd finger over without a bump.',
      build(key, tier) {
        const cfg = pickTier(tier, [{ n: 2, d: 1, tempo: 66 }, { n: 4, d: 1, tempo: 76 }, { n: 4, d: 0.5, tempo: 72 }, { n: 4, d: 0.5, tempo: 96 }]);
        const semis = SCALES[defaultScale(key)];
        const rh = new Track(), lh = new Track();
        /* Each group climbs five keys and comes back (CELL = positions in the group). Its
           fingering is chosen per group so the thumb never lands on a black key. */
        const CELL = [0, 1, 2, 3, 4, 3, 2, 1];
        let moved = false, unfingered = false;
        for (let k = 0; k < cfg.n; k++) {
          [['rh', rh, 1, 4], ['lh', lh, -1, 3]].forEach(([h, tr, dir, oc]) => {
            const degs = [0, 1, 2, 3, 4].map(p => dir * (p + k));
            const win = thumbTuckFingers(degs.map(d => spell(key, semis, d, oc)), degs.map(d => key[h].d[mod(d, 7)]));
            if (!win) unfingered = true;
            else if (win.join() !== THUMB_TUCK[0].join()) moved = true;
            CELL.forEach(p => tr.add([spell(key, semis, degs[p], oc)], cfg.d, { f: win ? [win[p]] : null }));
          });
        }
        const endF = n => ({ f: [isWhite(n.midi) ? 1 : 2] });
        const rEnd = spell(key, semis, 0, 4), lEnd = spell(key, semis, 0, 3);
        rh.finish([rEnd], endF(rEnd)); lh.finish([lEnd], endF(lEnd));
        return {
          title: 'Thumb tuck in ' + key.label + ' · contrary motion',
          tempo: cfg.tempo, rh: rh.ev, lh: lh.ev,
          how: ['Right hand climbs: after finger 3, the thumb passes under to the next key.', 'Left hand mirrors it going down: thumb under as the hand moves left.', 'Coming back, finger 3 crosses over the thumb.'],
          check: 'You can\'t hear where the thumb crossed: the line sounds like five fingers playing it.',
          tip: unfingered ? 'Some groups have no good place for the thumb in this key: plan a fingering that keeps the thumb on white keys and write it in.'
            : moved ? 'The black keys in ' + key.label + ' move the crossing in some groups, so the thumb always lands on a white key. Follow the numbers.'
            : 'Start moving the thumb under while finger 2 is still playing, so it arrives early.',
        };
      },
    },
    {
      id: 'intervals', cat: 'fingers', min: 1, icon: '📏', title: 'Intervals',
      goal: 'Feel each distance in your hand, broken and together.',
      build(key, tier) {
        const semis = SCALES[defaultScale(key)];
        const rh = new Track(), lh = new Track();
        const R = d => spell(key, semis, d, 4), L = d => spell(key, semis, d, 3);
        const NAMES = ['2nd', '3rd', '4th', '5th'];
        let title, tempo, how, check;
        if (tier === 1) {
          [1, 2, 3, 4].forEach((k, i) => {
            rh.add([R(0)], 1, { f: [1], label: NAMES[i] }); rh.add([R(k)], 1, { f: [k + 1] });
            lh.add([L(0)], 1, { f: [5] }); lh.add([L(k)], 1, { f: [5 - k] });
            rh.add([R(0), R(k)], 2, { f: [1, k + 1] }); lh.add([L(0), L(k)], 2, { f: [5, 5 - k] });
          });
          rh.finish([R(0), R(2), R(4)], { f: [1, 3, 5] }); lh.finish([L(0), L(2), L(4)], { f: [5, 3, 1] });
          title = 'Interval ladder from the tonic'; tempo = 66;
          how = ['Play the tonic and the next note, then both together.', 'Name each interval as you play it: 2nd, 3rd, 4th, 5th.', 'Close your eyes on the last round and find them by feel.'];
          check = 'You can play any interval from 2nd to 5th without looking.';
        } else if (tier < 4) {
          const d = tier === 2 ? 0.5 : 0.25;
          for (let i = 0; i <= 5; i++) { rh.add([R(i)], d); rh.add([R(i + 2)], d); lh.add([L(i)], d); lh.add([L(i + 2)], d); }
          for (let i = 7; i >= 2; i--) { rh.add([R(i)], d); rh.add([R(i - 2)], d); lh.add([L(i)], d); lh.add([L(i - 2)], d); }
          rh.ev[0].f = [1]; rh.ev[1].f = [3]; lh.ev[0].f = [5]; lh.ev[1].f = [3];
          rh.finish([R(0)], { f: [1] }); lh.finish([L(0)], { f: [5] });
          title = 'Scale in broken thirds'; tempo = tier === 2 ? 66 : 60;
          how = ['Up: 1st–3rd, 2nd–4th, 3rd–5th… each pair one step higher.', 'Fingering: alternate 1-3 and 2-4, shifting the hand every two pairs; mark your choice.', 'Then try broken sixths the same way.'];
          check = 'An even, rocking line with no hesitation at the hand shifts.';
        } else {
          for (let i = 0; i <= 5; i++) { rh.add([R(i), R(i + 2)], 0.5); lh.add([L(i), L(i + 2)], 0.5); }
          for (let i = 7; i >= 2; i--) { rh.add([R(i), R(i - 2)], 0.5); lh.add([L(i), L(i - 2)], 0.5); }
          rh.finish([R(0), R(2)]); lh.finish([L(0), L(2)]);
          title = 'Scale in double thirds'; tempo = 60;
          how = ['Both notes of each third sound exactly together.', 'Upper notes legato where you can: let fingers, not the wrist, connect.', 'Practise just the top line legato first, then add the lower.'];
          check = 'Both notes of every third start together, at ♩ = 60, with a connected top line.';
        }
        return { title, tempo, rh: rh.ev, lh: lh.ev, how, check, tip: 'Intervals are the distances melodies and chords are made of: feeling them speeds up sight-reading.' };
      },
    },
    /* -------- Rhythm & coordination -------- */
    {
      id: 'rhythm', cat: 'rhythm', min: 1, icon: '🥁', title: 'Rhythm variations',
      goal: 'Play the same scale in new rhythms to even out every finger.',
      variants: () => Object.keys(RHYTHMS).map(k => [k, RHYTHMS[k].label]),
      defaultVariant: tier => pickTier(tier, ['even4', 'longShort', 'shortLong', 'accent3']),
      build(key, tier, variant) {
        const r = RHYTHMS[variant] || RHYTHMS[pickTier(tier, ['even4', 'longShort', 'shortLong', 'accent3'])];
        const scaleName = defaultScale(key);
        const count = 8;
        const rh = new Track(), lh = new Track();
        ['rh', 'lh'].forEach(h => {
          const notes = scaleRun(key, scaleName, 1, h === 'rh' ? 4 : 3);
          const fingers = runFingers(key[h], count);
          const all = fingers.concat(fingers.slice(0, -1).reverse());
          const tr = h === 'rh' ? rh : lh;
          notes.forEach((n, i) => {
            const extra = { f: [all[i]] };
            if (r.accentEvery && i % r.accentEvery === 0) extra.art = 'acc';
            if (i === notes.length - 1) tr.finish([n], extra); else tr.add([n], r.durs[i % r.durs.length], extra);
          });
        });
        return {
          title: key.label + ' scale · ' + r.label.toLowerCase(),
          tempo: pickTier(tier, [72, 66, 66, 80]), rh: rh.ev, lh: lh.ev,
          how: ['Clap or tap the rhythm once before you play.', 'Play hands together, one octave apart.', 'Switch to another rhythm from the list: each one moves the "hard" note to a different finger.'],
          check: 'The rhythm stays exact all the way up and down, especially at the thumb crossing.',
          tip: 'Teachers use rhythm variations to fix uneven runs: the long note gives each finger a rest, the short note trains speed.',
        };
      },
    },
    {
      id: 'hands', cat: 'rhythm', min: 1, icon: '🤝', title: 'Hand independence',
      goal: 'Give each hand its own job while one steady pulse holds them together.',
      build(key, tier) {
        const semis = SCALES[defaultScale(key)];
        const rh = new Track(), lh = new Track();
        const R = d => spell(key, semis, d, 4), L = d => spell(key, semis, d, 3);
        let title, tempo, how, check;
        if (tier === 1) {
          [[0, 1, 2, 3], [4, 3, 2, 1], [0, 2, 4, 2]].forEach((bar, b) => {
            bar.forEach(d => rh.add([R(d)], 1, { f: [d + 1] }));
            lh.add([b === 1 ? L(-3) : L(0)], 4, { f: [b === 1 ? 2 : 1] });
          });
          rh.finish([R(0)], { f: [1] }); lh.finish([L(0)], { f: [1] });
          title = 'Melody over a held bass'; tempo = 72;
          how = ['Left hand holds one note for the whole bar; right hand moves.', 'Count aloud: the left hand changes only on beat 1.', 'Play the right hand a little louder than the left.'];
          check = 'The held note keeps sounding while the melody moves.';
        } else if (tier === 2) {
          [[0, 1, 2, 3, 4, 3, 2, 1], [0, 2, 1, 3, 2, 4, 3, 1]].forEach(bar => {
            bar.forEach(d => rh.add([R(d)], 0.5, { f: [d + 1] }));
            [0, 4, 0, 4].forEach(d => lh.add([L(d - 7)], 1, { f: [d ? 1 : 5] }));
          });
          rh.finish([R(0)], { f: [1] }); lh.finish([L(-7)], { f: [5] });
          title = 'Eighths over a walking bass'; tempo = 76;
          how = ['Right hand plays two notes to every one in the left hand.', 'Tap it on your lap first: right hand "1-and-2-and", left hand "1, 2".', 'Then on the keys, slowly.'];
          check = 'The left hand lands exactly with every other right-hand note.';
        } else if (tier === 3) {
          const ode = [[[2, 1], [2, 1], [3, 1], [4, 1]], [[4, 1], [3, 1], [2, 1], [1, 1]], [[0, 1], [0, 1], [1, 1], [2, 1]], [[2, 1.5], [1, 0.5], [1, 2]]];
          const harm = [0, -3, 0, -3];
          ode.forEach((bar, b) => {
            bar.forEach(([d, dur]) => rh.add([R(d)], dur));
            const root = harm[b];
            const alb = root === 0 ? [0, 4, 2, 4] : [-3, 1, -1, 1];
            for (let i = 0; i < 2; i++) alb.forEach((d, j) => lh.add([L(d)], 0.5, { f: i === 0 && b < 2 ? [[5, 1, 3, 1][j]] : null }));
          });
          rh.ev[0].f = [3];
          rh.finish([R(0)], { f: [1] }); lh.finish([L(0), L(4)], { f: [5, 1] });
          title = 'Melody over an Alberti bass (Ode to Joy)'; tempo = 80;
          how = ['Left hand alone until the broken-chord pattern runs by itself (low–high–middle–high).', 'Right hand alone, singing the tune.', 'Together: the melody on top, the bass a shade quieter.'];
          check = 'The tune is clearly on top and the Alberti pattern never stops.';
        } else {
          const bar1 = [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3], bar2 = [2, 1, 0, 1, 2, 3, 2, 1, 0];
          bar1.concat(bar2).forEach((d, i) => rh.add([R(d)], 1 / 3, { tup: 3, f: i === 0 ? [1] : null }));
          for (let i = 0; i < 8; i++) lh.add([L(i % 2 ? 4 : 0)], 0.5, { f: i < 2 ? [i % 2 ? 1 : 5] : null });
          for (let i = 0; i < 6; i++) lh.add([L(i % 2 ? 4 : 0)], 0.5);
          rh.finish([R(0)], { f: [1] }); lh.finish([L(0)], { f: [5] });
          title = 'Three against two'; tempo = 60;
          how = ['Right hand plays triplets (3 per beat), left hand eighths (2 per beat).', 'Say "nice cup of tea": nice (both), cup (right), of (left), tea (right).', 'Start very slowly; the beat is what matters.'];
          check = 'Both hands start each beat together and the in-between notes fall in the right order.';
        }
        return { title, tempo, rh: rh.ev, lh: lh.ev, how, check, tip: 'If the hands get tangled, tap the rhythm on a table before you play it.' };
      },
    },
    /* -------- Musicianship -------- */
    {
      id: 'dynamics', cat: 'music', min: 1, icon: '📢', title: 'Dynamics & phrasing',
      goal: 'Control loud and soft, and shape a phrase toward its high point.',
      build(key, tier) {
        const semis = SCALES[defaultScale(key)];
        const rh = new Track(), lh = new Track();
        const R = d => spell(key, semis, d, 4), L = d => spell(key, semis, d, 3);
        let title, tempo, how, check;
        if (tier === 1) {
          [[0.85, 'f'], [0.3, 'p']].forEach(([vel, dyn]) => [0, 1, 2, 3, 4, 3, 2, 1].forEach((d, i) => {
            rh.add([R(d)], 1, { vel, dyn: i === 0 ? dyn : null, f: dyn === 'f' ? [d + 1] : null });
            lh.add([L(d)], 1, { vel: vel * 0.9, f: dyn === 'f' ? [5 - d] : null });
          }));
          rh.finish([R(0)], { vel: 0.3 }); lh.finish([L(0)], { vel: 0.27 });
          title = 'Loud, then echo'; tempo = 72;
          how = ['First time forte (f): arm weight into the keys.', 'Second time piano (p): the same notes from closer to the keys.', 'Keep the tempo identical; soft is not slow.'];
          check = 'Someone listening can clearly hear two different volumes.';
        } else if (tier === 2) {
          const up = scaleRun(key, defaultScale(key), 1, 4, 'up'), down = scaleRun(key, defaultScale(key), 1, 4, 'down');
          const lup = scaleRun(key, defaultScale(key), 1, 3, 'up'), ldown = scaleRun(key, defaultScale(key), 1, 3, 'down');
          const all = up.concat(down), lall = lup.concat(ldown);
          const rf = runFingers(key.rh, 8), lf = runFingers(key.lh, 8);
          const rfa = rf.concat(rf.slice(0, -1).reverse()), lfa = lf.concat(lf.slice(0, -1).reverse());
          all.forEach((n, i) => {
            const vel = i <= 7 ? 0.28 + i * 0.08 : 0.84 - (i - 7) * 0.08;
            const extra = { vel, f: [rfa[i]], dyn: i === 0 ? 'p' : i === 7 ? 'f' : null, hair: i === 0 ? '<' : i === 7 ? '>' : i === all.length - 1 ? 'end' : null };
            if (i === all.length - 1) rh.finish([n], extra); else rh.add([n], 0.5, extra);
          });
          rh.ev[6].hairEnd = true;
          lall.forEach((n, i) => { const vel = (i <= 7 ? 0.25 + i * 0.07 : 0.74 - (i - 7) * 0.07); if (i === lall.length - 1) lh.finish([n], { vel, f: [lfa[i]] }); else lh.add([n], 0.5, { vel, f: [lfa[i]] }); });
          title = 'Crescendo up, diminuendo down'; tempo = 66;
          how = ['Start piano and grow steadily to forte at the top.', 'Fade back to piano on the way down.', 'Spread the change evenly over every note, not all at the end.'];
          check = 'A smooth rise and fall in volume, like a wave, with no sudden jumps.';
        } else if (tier === 3) {
          const ode = [[[2, 1], [2, 1], [3, 1], [4, 1]], [[4, 1], [3, 1], [2, 1], [1, 1]], [[0, 1], [0, 1], [1, 1], [2, 1]], [[2, 1.5], [1, 0.5], [1, 2]]];
          const shape = [0.42, 0.5, 0.6, 0.72, 0.8, 0.72, 0.62, 0.55, 0.48, 0.45, 0.5, 0.58, 0.55, 0.42, 0.32];
          let i = 0;
          ode.forEach((bar, b) => {
            bar.forEach(([d, dur]) => {
              const extra = { vel: shape[i], dyn: i === 0 ? 'mp' : null };
              if (i === 0) extra.hair = '<';
              if (i === 3) extra.hairEnd = true;
              if (i === 5) extra.hair = '>';
              if (i === 14) extra.hairEnd = true;
              if (i === 0) extra.slur = 'start';
              if (i === 14) extra.slur = 'end';
              rh.add([R(d)], dur, extra); i++;
            });
            const root = b % 2 ? -3 : 0;
            lh.add([L(root), L(root + 4)], 2, { vel: 0.3 }); lh.add([L(root), L(root + 4)], 2, { vel: 0.28 });
          });
          rh.ev[0].f = [3];
          title = 'Shape a phrase (Ode to Joy)'; tempo = 80;
          how = ['Sing the phrase and find its high point (the top of bar 1).', 'Grow toward it, then relax to the end like a sentence finishing.', 'Left hand stays quiet underneath: it is the background.'];
          check = 'The phrase has a clear beginning, a peak and an ending, and the left hand never covers the tune.';
        } else {
          const prog = voiceLead(key, progressionFor(key, 2).chords);
          const t = chordTracks(key, prog, 4, { vels: [0.3, 0.3, 0.88], lhVel: 0.32, labels: false });
          t.rh[0].dyn = 'mf';
          rh.ev = t.rh; lh.ev = t.lh;
          title = 'Voicing: melody on top'; tempo = 66;
          how = ['Play each right-hand chord with the top note louder than the others.', 'Lean the hand slightly toward the 5th finger; keep the thumb light.', 'Then play only the top notes: that is the melody you are bringing out.'];
          check = 'Played with eyes closed, you can sing the top line of the chords.';
        }
        return { title, tempo, rh: rh.ev, lh: lh.ev, how, check, tip: 'Dynamics are relative: what matters is the difference between your loud and your soft.' };
      },
    },
    {
      id: 'articulation', cat: 'music', min: 1, icon: '✨', title: 'Articulation',
      goal: 'Connected, detached and accented touch, on purpose.',
      variants: () => [['legato-staccato', 'Legato, then staccato'], ['slurs', 'Two-note slurs'], ['contrast', 'Legato right, staccato left'], ['accents', 'Accents off the beat']],
      defaultVariant: tier => pickTier(tier, ['legato-staccato', 'slurs', 'contrast', 'accents']),
      build(key, tier, variant) {
        const v = variant || pickTier(tier, ['legato-staccato', 'slurs', 'contrast', 'accents']);
        const semis = SCALES[defaultScale(key)];
        const rh = new Track(), lh = new Track();
        const R = d => spell(key, semis, d, 4), L = d => spell(key, semis, d, 3);
        const cell = [0, 1, 2, 3, 4, 3, 2, 1];
        for (let bar = 0; bar < 2; bar++) cell.forEach((d, i) => {
          const r = { f: bar === 0 ? [d + 1] : null }, l = { f: bar === 0 ? [5 - d] : null };
          if (v === 'legato-staccato') {
            if (bar === 0) { if (i === 0) { r.slur = 'start'; l.slur = 'start'; } if (i === 7) { r.slur = 'end'; l.slur = 'end'; } }
            else { r.art = 'stac'; l.art = 'stac'; }
          } else if (v === 'slurs') {
            if (i % 2 === 0) { r.slur = 'start'; l.slur = 'start'; r.vel = 0.7; l.vel = 0.6; } else { r.slur = 'end'; l.slur = 'end'; r.art = 'stac'; l.art = 'stac'; r.vel = 0.4; l.vel = 0.35; }
          } else if (v === 'contrast') {
            if (i === 0) r.slur = 'start'; if (i === 7) r.slur = 'end';
            l.art = 'stac';
          } else if (i % 2 === 1) { r.art = 'acc'; l.art = 'acc'; r.vel = 0.85; l.vel = 0.75; } else { r.vel = 0.4; l.vel = 0.35; }
          rh.add([R(d)], 0.5, r); lh.add([L(d)], 0.5, l);
        });
        rh.finish([R(0)], { f: [1] }); lh.finish([L(0)], { f: [5] });
        const info = {
          'legato-staccato': ['Legato, then staccato', ['Bar 1 legato: each finger lifts exactly as the next one plays.', 'Bar 2 staccato: bounce off each key, keeping the same tempo.', 'Listen for the silence between staccato notes.']],
          slurs: ['Two-note slurs', ['Each pair: drop into the first note, roll off the second.', 'The wrist goes down on the first note and up on the second.', 'The second note is shorter and softer.']],
          contrast: ['Legato right hand, staccato left hand', ['Each hand alone first, saying "smooth" and "short".', 'Together, slowly: the hands must not copy each other.', 'This is how melody-and-accompaniment music feels.']],
          accents: ['Accents off the beat', ['Accent every second note: the "and" of each beat.', 'Make the accent with a quick finger, not by hitting harder from the arm.', 'Count "1-AND-2-AND" aloud.']],
        }[v];
        return {
          title: 'Articulation: ' + info[0].toLowerCase(), tempo: pickTier(tier, [72, 76, 72, 84]), rh: rh.ev, lh: lh.ev,
          how: info[1],
          check: 'A listener can tell which touch you are using without looking.',
          tip: 'Slur = connected; dot = short; > = accent. Same notes, three different characters.',
        };
      },
    },
    {
      id: 'pedal', cat: 'music', min: 1, icon: '🦶', title: 'Pedalling',
      goal: 'Change the sustain pedal cleanly so harmonies never blur.',
      variants: () => [['on', 'With pedal'], ['off', 'Without pedal (compare)']],
      defaultVariant: () => 'on',
      build(key, tier, variant) {
        const semis = SCALES[defaultScale(key)];
        const rh = new Track(), lh = new Track();
        const pedal = [];
        let title, tempo, how, check;
        if (tier === 1) {
          const chords = [0, 3, 4, 0];
          chords.forEach((c, b) => {
            const base = c >= 4 ? c - 7 : c;
            [0, 2, 4, 7].forEach((d, i) => rh.add([spell(key, semis, base + d, 4)], 1, { f: b === 0 ? [[1, 2, 3, 5][i]] : null }));
            lh.add([spell(key, semis, base, 3)], 4);
            pedal.push({ t: b * 4 + 0.25, type: b === 0 ? 'down' : 'change' });
          });
          pedal.push({ t: 16, type: 'up' });
          title = 'One pedal per harmony'; tempo = 72;
          how = ['Press the pedal just after the first note of each bar.', 'At the next bar: up and down quickly, just after the new bass note.', 'Use your heel on the floor as a hinge; only the front of the foot moves.'];
          check = 'Each bar rings, and the old chord is gone the moment the new one starts.';
        } else {
          const specs = tier === 2 ? progressionFor(key, 1).chords : tier === 3 ? (key.mode === 'minor'
            ? [P(0), P(5, 'natural'), P(3), P(4), P(0), P(5, 'natural'), P(3), P(4), P(0)]
            : [P(0), P(5), P(3), P(4), P(0), P(5), P(3), P(4), P(0)]) : progressionFor(key, 2).chords;
          const d = tier === 3 ? 2 : tier === 4 ? 1 : 4;
          const voiced = voiceLead(key, specs);
          const t = chordTracks(key, voiced, d, { labels: true });
          rh.ev = t.rh; lh.ev = t.lh;
          voiced.forEach((c, i) => pedal.push({ t: i * d + 0.25, type: i === 0 ? 'down' : 'change' }));
          pedal.push({ t: voiced.length * d - (d === 2 ? 0 : 0), type: 'up' });
          title = tier === 3 ? 'Pedal changes twice a bar' : 'Legato pedal through a progression';
          tempo = tier === 4 ? 60 : tier === 3 ? 66 : 60;
          how = ['Play the chord, then press the pedal: "chord, then pedal".', 'For the next chord: play it, and in the same instant lift and press the pedal again.', 'Now lift your hands between chords: the pedal alone should connect them.'];
          check = 'Connected chords with no gap and no blur, even with your hands lifted.';
        }
        if (tier === 4) title = 'Legato pedal, a change on every beat';
        const ex = { title, tempo, rh: rh.ev, lh: lh.ev, pedal, how, check, pedalOn: variant !== 'off',
          tip: 'Pedal marks: the line shows the pedal held down; each notch is a quick change. No pedal on your keyboard? Watch the line and listen to the difference.' };
        return ex;
      },
    },
    {
      id: 'ear', cat: 'music', min: 1, icon: '👂', title: 'Play by ear',
      goal: 'Hear a short tune, then find it on the keys.',
      interactive: 'ear',
      build(key, tier) {
        return {
          title: 'Play it back by ear in ' + key.label, tempo: pickTier(tier, [72, 80, 88, 96]), rh: [], lh: [],
          how: ['Press Hear the tune. Sing it back before touching the keys.', 'Every tune starts on the home note (the tonic) unless the level says otherwise.', 'Tap the notes in order. Wrong guesses are fine: listen and try again.'],
          check: 'Three tunes in a row found with no more than one wrong note each.',
          tip: 'Ask yourself: did it go up or down? By step or by skip? That narrows it to one or two keys.',
        };
      },
    },
  ];
  const exerciseById = id => EXERCISES.find(e => e.id === id);

  /* Quick-launch routines: steps an exercise is not yet unlocked for are skipped. */
  const PRESETS = [
    { id: 'warmup', icon: '☀️', label: '5-minute warm-up', blurb: 'Fingers, thumb, then a scale.', steps: [['five-finger', 1.5], ['thumb', 1.5], ['scale', 2]] },
    { id: 'key', icon: '🔑', label: 'Key of the day', blurb: 'Scale, chords, arpeggio, progression.', steps: [['scale', 2], ['inversions', 2], ['arpeggio', 2], ['progression', 2]] },
    { id: 'fingers', icon: '💪', label: 'Even fingers', blurb: 'Five-finger, Hanon, intervals.', steps: [['five-finger', 2], ['hanon', 3], ['intervals', 2], ['thumb', 2]] },
    { id: 'together', icon: '🤝', label: 'Hands together', blurb: 'Coordination and rhythm.', steps: [['hands', 3], ['rhythm', 2], ['contrary', 2], ['broken', 2]] },
    { id: 'musical', icon: '🎶', label: 'Make it musical', blurb: 'Dynamics, touch, pedal, ear.', steps: [['dynamics', 2], ['articulation', 2], ['pedal', 2], ['ear', 3]] },
  ];
  function routine(presetId, tier) {
    const p = PRESETS.find(x => x.id === presetId);
    if (!p) return [];
    return p.steps.filter(([id]) => exerciseById(id) && exerciseById(id).min <= tier).map(([id, minutes]) => ({ id, minutes }));
  }

  function variantsFor(id, key) {
    const e = exerciseById(id);
    return e && e.variants ? e.variants(key) : null;
  }
  function defaultVariant(id, key, tier) {
    const e = exerciseById(id), list = variantsFor(id, key);
    if (!list) return null;
    const v = e.defaultVariant ? e.defaultVariant(tier) : list[0][0];
    return list.some(x => x[0] === v) ? v : list[0][0];
  }
  function build(id, keyId, tier, variant) {
    const e = exerciseById(id);
    if (!e) throw new Error('Unknown exercise ' + id);
    const key = keyById(keyId);
    tier = Math.max(e.min, Math.min(4, tier || 1));
    const list = variantsFor(id, key);
    if (list && !list.some(x => x[0] === variant)) variant = defaultVariant(id, key, tier);
    if (!list) variant = null;
    const ex = e.build(key, tier, variant);
    return Object.assign({ id, cat: e.cat, tier, key: key.id, keyLabel: key.label, sig: key.sig, meter: METER, variant, variants: list, interactive: e.interactive || null, pedal: [] }, ex);
  }

  /* ---- Play by ear -------------------------------------------------------------------- */
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  /* Returns the tune's degrees, spelled notes, and the choice buttons (low to high). */
  function earMelody(keyId, tier, seed) {
    const key = keyById(keyId);
    const semis = SCALES[defaultScale(key)];
    const r = rng(seed || 1);
    const cfg = pickTier(tier, [{ len: 3, lo: 0, hi: 2, leap: 1 }, { len: 4, lo: 0, hi: 4, leap: 2 }, { len: 5, lo: 0, hi: 7, leap: 3 }, { len: 6, lo: -3, hi: 7, leap: 4 }]);
    const degs = [tier >= 4 && r() < 0.4 ? 4 : 0];
    while (degs.length < cfg.len) {
      const prev = degs[degs.length - 1];
      const opts = [];
      for (let d = cfg.lo; d <= cfg.hi; d++) if (d !== prev && Math.abs(d - prev) <= cfg.leap) opts.push(d);
      degs.push(opts[Math.floor(r() * opts.length)]);
    }
    if (tier <= 2 && degs[degs.length - 1] !== 0 && degs[degs.length - 2] !== 0 && r() < 0.5) degs[degs.length - 1] = degs[degs.length - 1] <= 2 ? 0 : degs[degs.length - 1];
    const choices = [];
    for (let d = cfg.lo; d <= cfg.hi; d++) choices.push(Object.assign({ deg: d }, spell(key, semis, d, 4)));
    return { degs, notes: degs.map(d => spell(key, semis, d, 4)), choices };
  }

  /* ---- Engraving --------------------------------------------------------------------------
     A grand staff (right hand treble, left hand bass) in one SVG: key signature, 4/4, bar
     lines, beams by the beat, fingering above the right hand and below the left, chord
     labels, dynamics and hairpins between the staves, slurs, staccato/accents, triplet
     marks and a pedal line. Every event is a <g class="pxs-ev" data-t data-hand> so the page
     can light up what is sounding. opts.names draws each head as a lettered oval
     (MusicNotation.namedHead, the Fake Book's teaching head); opts.colors tints heads by
     letter in the site's shared rainbow (C red … B violet). */
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
  function baseDur(e) {
    if (e.tup) return { base: 0.5, dot: false };
    if ([4, 2, 1, 0.5, 0.25].includes(e.d)) return { base: e.d, dot: false };
    return { base: e.d / 1.5, dot: true };
  }
  function engrave(ex, MN, opts) {
    opts = opts || {};
    const sp = opts.space || 10, hs = sp / 2, s = sp / 250;
    const meter = ex.meter || METER;
    const staves = [['rh', 'treble'], ['lh', 'bass']].filter(([h]) => (opts.hands || ['rh', 'lh']).includes(h) && ex[h] && ex[h].length)
      .map(([hand, clef]) => ({ hand, clef, ev: ex[hand], bottomStep: MN.clefs[clef].bottom }));
    if (!staves.length) return { svg: '', width: 0, height: 0 };
    const headW = 295 * s, wholeW = 426 * s;
    const names = !!opts.names && typeof MN.namedHead === 'function', colors = !!opts.colors;
    const sigAlt = [0, 0, 0, 0, 0, 0, 0];
    const SHARP_L = [3, 0, 4, 1, 5, 2, 6], FLAT_L = [6, 2, 5, 1, 4, 0, 3];
    (ex.sig > 0 ? SHARP_L : FLAT_L).slice(0, Math.abs(ex.sig || 0)).forEach(l => { sigAlt[l] = Math.sign(ex.sig); });

    // Per staff: steps, stem directions, accidentals.
    staves.forEach(st => {
      let bar = -1, state = {};
      st.ev.forEach(e => {
        e._p = e.ps.map(n => MN.parsePitch(n));
        e._steps = e._p.map(p => p.diatonic - st.bottomStep);
        const b = Math.floor(e.t / meter + EPS);
        if (b !== bar) { bar = b; state = {}; }
        e._acc = e._p.map(p => {
          const k = p.l + '/' + p.o, cur = k in state ? state[k] : sigAlt[p.l];
          state[k] = p.a;
          return p.a !== cur ? p.a : null;
        });
        e._bd = baseDur(e);
      });
      // Beam groups: notes shorter than a quarter within one beat.
      st.groups = [];
      let g = null;
      st.ev.forEach(e => {
        const beamable = !e.rest && e._bd.base < 1;
        const beat = Math.floor(e.t + EPS);
        if (beamable && g && g.beat === beat) g.ev.push(e);
        else { if (g && g.ev.length > 1) st.groups.push(g); g = beamable ? { beat, ev: [e] } : null; }
      });
      if (g && g.ev.length > 1) st.groups.push(g);
      st.ev.forEach(e => { e._up = e.rest ? true : (e._steps.reduce((a, b) => a + b, 0) / e._steps.length) < 4; });
      st.groups.forEach(gr => {
        const all = [].concat(...gr.ev.map(e => e._steps));
        const avg = all.reduce((a, b) => a + b, 0) / all.length;
        gr.up = avg < 4;
        gr.ev.forEach(e => { e._up = gr.up; e._group = gr; });
      });
    });

    // Columns: one x per onset across both hands.
    const onsets = [...new Set([].concat(...staves.map(st => st.ev.map(e => Math.round(e.t * 1e4) / 1e4))))].sort((a, b) => a - b);
    const end = Math.max(...staves.map(st => { const l = st.ev[st.ev.length - 1]; return l.t + l.d; }));
    const sigN = Math.abs(ex.sig || 0);
    const timeX = 42 + sigN * 8 + (sigN ? 6 : 0);
    let x = timeX + 38;
    const colX = new Map(), bars = [];
    onsets.forEach((t, i) => {
      if (i > 0 && Math.abs(t / meter - Math.round(t / meter)) < EPS) { bars.push(x - 2); x += 12; }
      const hasAcc = staves.some(st => st.ev.some(e => Math.abs(e.t - t) < EPS && e._acc && e._acc.some(a => a !== null)));
      if (hasAcc) x += 9;
      colX.set(t, x);
      const next = i < onsets.length - 1 ? onsets[i + 1] : end;
      const dt = Math.max(0.2, next - t);
      x += 15 + 24 * Math.sqrt(dt);
    });
    const width = Math.ceil(x + 16);
    const xAt = t => {
      const keyT = Math.round(t * 1e4) / 1e4;
      if (colX.has(keyT)) return colX.get(keyT);
      let prev = onsets[0], nxt = null;
      for (const o of onsets) { if (o <= t) prev = o; else { nxt = o; break; } }
      const x0 = colX.get(prev), x1 = nxt != null ? colX.get(nxt) : width - 20;
      const t1 = nxt != null ? nxt : end;
      return x0 + (x1 - x0) * ((t - prev) / Math.max(EPS, t1 - prev));
    };

    // Vertical extents (in steps relative to each staff's bottom line).
    staves.forEach((st, si) => {
      const heads = [].concat(...st.ev.filter(e => !e.rest).map(e => e._steps));
      const tipsUp = st.ev.filter(e => !e.rest && e._up && e._bd.base < 4).map(e => Math.max(...e._steps) + 7);
      const tipsDn = st.ev.filter(e => !e.rest && !e._up && e._bd.base < 4).map(e => Math.min(...e._steps) - 7);
      st.hi = Math.max(8, ...heads.map(h => h + 1), ...tipsUp);
      st.lo = Math.min(0, ...heads.map(h => h - 1), ...tipsDn);
      const top = si === 0, bottom = si === staves.length - 1;
      st.slurAbove = st.ev.some(e => e.slur && !e._up);
      st.slurBelow = st.ev.some(e => e.slur && e._up);
      st.fingers = st.ev.some(e => e.f && e.f.some(Boolean));
      st.labels = st.ev.some(e => e.label);
      st.tup = st.ev.some(e => e.tup);
      // Chord fingerings stack one number per note (9px each).
      const stack = Math.max(1, ...st.ev.map(e => e.f ? e.f.filter(Boolean).length : 0));
      const stackSteps = (stack - 1) * 9 / hs;
      let up = st.hi + (st.slurAbove ? 2.5 : 0) + (top && st.tup ? 2.5 : 0);
      if (top) { st.fingerStep = up + 3; if (st.fingers) up += 3.2 + stackSteps; st.labelStep = up + 3.4; if (st.labels) up += st.ev.some(e => e.label && String(e.label).includes(' · ')) ? 6 : 3.6; }
      let dn = st.lo - (st.slurBelow ? 2.5 : 0) - (!top && st.tup ? 2.5 : 0);
      if (bottom && !top) { st.fingerStep = dn - 4.2; if (st.fingers) dn -= 3.4 + stackSteps; st.pedalStep = dn - 4; if (ex.pedal && ex.pedal.length) dn -= 4.4; }
      st.above = up * hs + 10;
      st.below = -dn * hs + 10;
    });
    const hasDyn = staves.some(st => st.ev.some(e => e.dyn || e.hair));
    const midGap = hasDyn ? 34 : 14;
    let y = 0;
    staves.forEach((st, i) => {
      y += (i === 0 ? st.above : midGap + st.above);
      st.y = y; // y of the bottom line
      y += (i === staves.length - 1 ? st.below : (-st.lo * hs));
    });
    if (staves.length === 1 && hasDyn) y += 26;
    const height = Math.ceil(y + 4);
    const yOf = (st, step) => st.y - step * hs;

    const out = [];
    out.push('<svg class="pxs-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '" role="img" aria-label="' + esc(opts.label || ex.title || 'Exercise') + '">');
    // Staff lines, clefs, key and time signatures.
    staves.forEach(st => {
      for (let l = 0; l < 5; l++) out.push('<line class="pxs-line" x1="10" x2="' + (width - 8) + '" y1="' + yOf(st, l * 2) + '" y2="' + yOf(st, l * 2) + '"/>');
      out.push(MN.clef(st.clef, 16, st.y, hs));
      const pos = (ex.sig > 0 ? MN.clefs[st.clef].sharp : MN.clefs[st.clef].flat).slice(0, sigN);
      pos.forEach((p, i) => out.push(MN.accidental(ex.sig > 0 ? 1 : -1, 42 + i * 8, yOf(st, p), sp)));
      out.push(MN.glyph('timeSig' + meter, timeX, yOf(st, 6), sp), MN.glyph('timeSig4', timeX, yOf(st, 2), sp));
    });
    const sysTop = yOf(staves[0], 8), sysBot = staves[staves.length - 1].y;
    out.push('<line class="pxs-bar" x1="10" x2="10" y1="' + sysTop + '" y2="' + sysBot + '"/>');
    if (staves.length > 1) {
      const h = sysBot - sysTop, bx = 7;
      out.push('<path class="pxs-brace" d="M' + bx + ' ' + sysTop + ' C' + (bx - 7) + ' ' + (sysTop + h * 0.12) + ' ' + (bx + 1) + ' ' + (sysTop + h * 0.38) + ' ' + (bx - 6) + ' ' + (sysTop + h / 2) +
        ' C' + (bx + 1) + ' ' + (sysTop + h * 0.62) + ' ' + (bx - 7) + ' ' + (sysTop + h * 0.88) + ' ' + bx + ' ' + sysBot +
        ' C' + (bx - 4) + ' ' + (sysTop + h * 0.85) + ' ' + (bx + 3) + ' ' + (sysTop + h * 0.6) + ' ' + (bx - 4) + ' ' + (sysTop + h / 2) +
        ' C' + (bx + 3) + ' ' + (sysTop + h * 0.4) + ' ' + (bx - 4) + ' ' + (sysTop + h * 0.15) + ' ' + bx + ' ' + sysTop + 'Z"/>');
    }
    bars.forEach(bx => out.push('<line class="pxs-bar" x1="' + bx + '" x2="' + bx + '" y1="' + sysTop + '" y2="' + sysBot + '"/>'));
    out.push('<line class="pxs-bar" x1="' + (width - 13) + '" x2="' + (width - 13) + '" y1="' + sysTop + '" y2="' + sysBot + '"/>');
    out.push('<rect class="pxs-final" x="' + (width - 10) + '" y="' + sysTop + '" width="3.2" height="' + (sysBot - sysTop) + '"/>');

    staves.forEach((st, si) => {
      const top = si === 0;
      const stemX = (e, cx) => e._up ? cx - (e._bd.base >= 4 ? wholeW : headW) / 2 + headW - 0.6 : cx - headW / 2 + 0.6;
      // Beam geometry first, so stems stop at the beam.
      st.groups.forEach(gr => {
        const pts = gr.ev.map(e => {
          const cx = xAt(e.t), sx = stemX(e, cx);
          const far = gr.up ? Math.min(...e._steps.map(k => yOf(st, k))) : Math.max(...e._steps.map(k => yOf(st, k)));
          return { e, sx, far };
        });
        const dir = gr.up ? -1 : 1;
        let y1 = pts[0].far + dir * 3.5 * sp, y2 = pts[pts.length - 1].far + dir * 3.5 * sp;
        const slope = Math.max(-sp, Math.min(sp, y2 - y1));
        y2 = y1 + slope;
        const at = x0 => pts.length > 1 ? y1 + (y2 - y1) * ((x0 - pts[0].sx) / Math.max(1, pts[pts.length - 1].sx - pts[0].sx)) : y1;
        let shift = 0;
        pts.forEach(p => { const need = p.far + dir * 2.6 * sp; const by = at(p.sx); shift = gr.up ? Math.max(shift, by - need) : Math.min(shift, by - need); });
        gr.beamAt = x0 => at(x0) - shift;
        gr.pts = pts;
      });
      st.ev.forEach((e, ei) => {
        const cx = xAt(e.t);
        out.push('<g class="pxs-ev" data-hand="' + st.hand + '" data-t="' + (Math.round(e.t * 1e4) / 1e4) + '" data-i="' + ei + '">');
        if (e.rest) {
          const name = { 4: 'restWhole', 2: 'restHalf', 1: 'restQuarter', 0.5: 'rest8', 0.25: 'rest16' }[e.d] || 'restQuarter';
          out.push(MN.glyph(name, cx - 4, yOf(st, e.d === 4 ? 6 : 4), sp, 'pxs-rest'));
          out.push('</g>');
          return;
        }
        const bd = e._bd, w = bd.base >= 4 ? wholeW : headW;
        const head = bd.base >= 4 ? 'whole' : bd.base >= 2 ? 'half' : 'quarter';
        // Heads; a second in a chord sits on the other side of the stem.
        const order = e._steps.map((k, i) => i).sort((a, b) => e._up ? e._steps[a] - e._steps[b] : e._steps[b] - e._steps[a]);
        const shifted = {};
        order.forEach((i, j) => { if (j > 0 && Math.abs(e._steps[i] - e._steps[order[j - 1]]) === 1 && !shifted[order[j - 1]]) shifted[i] = true; });
        let accN = 0;
        const named = [];
        // A named head is a wider oval: move accidentals clear of it.
        const accGap = names ? Math.max(0, (bd.base >= 4 ? 1.05 : 0.92) * sp - w / 2) : 0;
        order.slice().sort((a, b) => e._steps[b] - e._steps[a]).forEach(i => {
          const step = e._steps[i], hy = yOf(st, step);
          const hx = cx - w / 2 + (shifted[i] ? (e._up ? headW - 1 : -headW + 1) : 0);
          MN.ledgerSteps(step).forEach(ls => out.push('<line class="pxs-ledger" x1="' + (hx - 3.5) + '" x2="' + (hx + w + 3.5) + '" y1="' + yOf(st, ls) + '" y2="' + yOf(st, ls) + '"/>'));
          if (e._acc[i] !== null) { out.push(MN.accidental(e._acc[i], cx - w / 2 - 9 - accGap - accN * 8, hy, sp)); accN++; }
          if (names) named.push(MN.namedHead(e._p[i], hx + w / 2, hy, bd.base, sigAlt[e._p[i].l], sp, 'pxs-nhead', colors));
          else if (colors) out.push('<g class="pxs-chead" style="color:' + MN.solfegeColor(e._p[i]) + '">' + MN.glyph(head, hx, hy, sp, 'pxs-head') + '</g>');
          else out.push(MN.glyph(head, hx, hy, sp, 'pxs-head'));
          if (bd.dot) out.push('<circle class="pxs-dot" cx="' + (cx + w / 2 + 4.5) + '" cy="' + (hy - (step % 2 === 0 ? hs : 0)) + '" r="1.6"/>');
        });
        // Stem, flags or beam.
        if (bd.base < 4) {
          const ys = e._steps.map(k => yOf(st, k));
          const near = e._up ? Math.max(...ys) : Math.min(...ys), far = e._up ? Math.min(...ys) : Math.max(...ys);
          const sx = stemX(e, cx);
          let tip = far + (e._up ? -3.5 : 3.5) * sp;
          if (e._group) tip = e._group.beamAt(sx);
          out.push('<line class="pxs-stem" x1="' + sx + '" x2="' + sx + '" y1="' + near + '" y2="' + tip + '"/>');
          if (!e._group && bd.base < 1) out.push(MN.glyph('flag' + (bd.base === 0.5 ? '8' : '16') + (e._up ? 'Up' : 'Down'), sx - 0.6, tip, sp, 'pxs-flag'));
        }
        // Named heads go over their stems so the letter stays whole.
        out.push(...named);
        // Articulation on the head side away from the stem.
        if (e.art) {
          const ys = e._steps.map(k => yOf(st, k));
          const ay = e._up ? Math.max(...ys) + sp * 1.2 : Math.min(...ys) - sp * 1.2;
          if (e.art === 'stac') out.push('<circle class="pxs-dot" cx="' + cx + '" cy="' + ay + '" r="1.7"/>');
          if (e.art === 'acc') { const ay2 = e._up ? ay + 2 : ay - 2; out.push('<path class="pxs-acc" d="M' + (cx - 5) + ' ' + (ay2 - 3) + ' L' + (cx + 5) + ' ' + ay2 + ' L' + (cx - 5) + ' ' + (ay2 + 3) + '"/>'); }
        }
        if (e.f && e.f.some(Boolean) && st.fingerStep != null) {
          const fs = e.f.filter(Boolean);
          fs.slice().reverse().forEach((f, k) => {
            const fy = top ? yOf(st, st.fingerStep) - k * 9 : yOf(st, st.fingerStep) + (fs.length - 1 - k) * 9 + 8;
            out.push('<text class="pxs-finger" x="' + cx + '" y="' + fy + '">' + f + '</text>');
          });
        }
        if (e.label && st.labelStep != null) {
          // "V7 · G7" prints as two short lines (numeral over symbol) so quick changes don't collide.
          const parts = String(e.label).split(' · '), ly = yOf(st, st.labelStep);
          out.push('<text class="pxs-label" x="' + (cx - w / 2) + '" y="' + ly + '">' + (parts.length > 1
            ? '<tspan x="' + (cx - w / 2) + '" dy="-11">' + esc(parts[0]) + '</tspan><tspan class="pxs-sym" x="' + (cx - w / 2) + '" dy="11">' + esc(parts[1]) + '</tspan>'
            : esc(parts[0])) + '</text>');
        }
        out.push('</g>');
      });
      // Beams (and sixteenth beams, with stubs for a lone sixteenth).
      st.groups.forEach(gr => {
        const pts = gr.pts, dir = gr.up ? 1 : -1, th = sp * 0.5;
        const beam = (xa, xb, off) => {
          const ya = gr.beamAt(xa) + dir * off, yb = gr.beamAt(xb) + dir * off;
          out.push('<path class="pxs-beam" d="M' + xa + ' ' + ya + ' L' + xb + ' ' + yb + ' L' + xb + ' ' + (yb + dir * th) + ' L' + xa + ' ' + (ya + dir * th) + 'Z"/>');
        };
        beam(pts[0].sx - 0.6, pts[pts.length - 1].sx + 0.6, 0);
        pts.forEach((p, i) => {
          if (p.e._bd.base !== 0.25) return;
          const prev = pts[i - 1], next = pts[i + 1];
          if (next && next.e._bd.base === 0.25) beam(p.sx - 0.6, next.sx + 0.6, sp * 0.75);
          else if (!(prev && prev.e._bd.base === 0.25)) {
            if (prev) beam(p.sx - sp, p.sx + 0.6, sp * 0.75); else if (next) beam(p.sx - 0.6, p.sx + sp, sp * 0.75);
          }
        });
        if (gr.ev[0].tup) {
          const mx = (pts[0].sx + pts[pts.length - 1].sx) / 2;
          out.push('<text class="pxs-tup" x="' + mx + '" y="' + (gr.beamAt(mx) + (gr.up ? -5 : 14)) + '">' + gr.ev[0].tup + '</text>');
        }
      });
      // Slurs: above the right hand, below the left.
      let open = null;
      st.ev.forEach(e => {
        if (e.slur === 'start') open = e;
        if (e.slur === 'end' && open) {
          const inRange = st.ev.filter(o => o.t >= open.t - EPS && o.t <= e.t + EPS && !o.rest);
          const ys = [].concat(...inRange.map(o => o._steps.map(k => yOf(st, k))));
          // Slurs curve on the note-head side, away from the stems.
          const above = !open._up, x1 = xAt(open.t) + 1, x2 = xAt(e.t) - 1;
          const edgeOf = o => above ? Math.min(...o._steps.map(k => yOf(st, k))) - sp * 1.1 : Math.max(...o._steps.map(k => yOf(st, k))) + sp * 1.1;
          const y1 = edgeOf(open), y2 = edgeOf(e);
          const peak = above ? Math.min(...ys) - sp * 2.4 : Math.max(...ys) + sp * 2.4;
          // A quadratic curve only rises halfway to its control point: aim the control past the peak.
          const apex = above ? Math.min(peak, Math.min(y1, y2) - sp * 0.6) : Math.max(peak, Math.max(y1, y2) + sp * 0.6);
          const cy = 2 * apex - (y1 + y2) / 2;
          const mx = (x1 + x2) / 2, d2 = above ? 2.2 : -2.2;
          out.push('<path class="pxs-slur" d="M' + x1 + ' ' + y1 + ' Q' + mx + ' ' + cy + ' ' + x2 + ' ' + y2 + ' Q' + mx + ' ' + (cy + d2) + ' ' + x1 + ' ' + y1 + 'Z"/>');
          open = null;
        }
      });
      // Dynamics and hairpins: between the staves (below a lone staff).
      const dynY = staves.length > 1 ? (staves[0].y + (-staves[0].lo * hs) + midGap / 2 + 4) : st.y + (-st.lo * hs) + 18;
      if (top) {
        let pin = null;
        st.ev.forEach(e => {
          if (e.dyn) {
            let dx = xAt(e.t) - 6;
            [...e.dyn].forEach(ch => { const g = { p: 'dynamicPiano', m: 'dynamicMezzo', f: 'dynamicForte' }[ch]; if (g) { out.push(MN.glyph(g, dx, dynY, sp * 1.1, 'pxs-dyn')); dx += ch === 'm' ? 10 : 7.5; } });
          }
          if ((e.hairEnd || e.hair === 'end') && pin) {
            const x1 = xAt(pin.t) + (pin.dyn ? 16 : 0), x2 = xAt(e.t) - 4;
            const open2 = pin.hair === '<';
            const yA = dynY - 4;
            out.push('<path class="pxs-hair" d="M' + (open2 ? x1 : x2) + ' ' + yA + ' L' + (open2 ? x2 : x1) + ' ' + (yA - 4.5) + ' M' + (open2 ? x1 : x2) + ' ' + yA + ' L' + (open2 ? x2 : x1) + ' ' + (yA + 4.5) + '"/>');
            pin = null;
          }
          if (e.hair === '<' || e.hair === '>') pin = e;
        });
      }
      // Pedal line under the left hand.
      if (st.pedalStep != null && ex.pedal && ex.pedal.length) {
        const py = yOf(st, st.pedalStep);
        let d = 'M', started = false;
        ex.pedal.forEach(p => {
          const px = p.type === 'up' ? width - 16 : xAt(p.t);
          if (p.type === 'down') { d += px + ' ' + (py - 8) + ' L' + px + ' ' + py; started = true; }
          else if (p.type === 'change' && started) d += ' L' + (px - 3) + ' ' + py + ' L' + px + ' ' + (py - 7) + ' L' + (px + 3) + ' ' + py;
          else if (p.type === 'up' && started) d += ' L' + px + ' ' + py + ' L' + px + ' ' + (py - 8);
        });
        out.push('<text class="pxs-ped" x="' + (xAt(ex.pedal[0].t) - 2) + '" y="' + (py - 11) + '">Ped.</text>');
        out.push('<path class="pxs-pedal" d="' + d + '"/>');
      }
    });
    out.push('</svg>');
    return { svg: out.join(''), width, height };
  }

  /* ---- Playback plan (the page turns this into sound) ----------------------------------- */
  function schedule(ex, opts) {
    opts = opts || {};
    const bpm = opts.tempo || ex.tempo || 72, beat = 60 / bpm;
    const hands = opts.hands || ['rh', 'lh'];
    const pedalOn = opts.pedal != null ? opts.pedal : ex.pedalOn !== false;
    const changes = (ex.pedal || []).filter(p => p.type !== 'down').map(p => p.t).sort((a, b) => a - b);
    const notes = [];
    hands.forEach(h => (ex[h] || []).forEach(e => {
      if (e.rest) return;
      let len = e.d * (e.art === 'stac' ? 0.35 : e.slur === 'end' && !e.art ? 0.8 : 0.96);
      if (ex.pedal && ex.pedal.length && pedalOn) { const rel = changes.find(c => c > e.t + EPS); if (rel != null) len = Math.max(len, rel - e.t); }
      else if (ex.pedal && ex.pedal.length && !pedalOn) len = e.d * 0.82;
      e.midi.forEach((m, i) => {
        const vel = e.vels ? e.vels[i] : e.vel != null ? e.vel : (h === 'lh' ? 0.5 : 0.6);
        notes.push({ time: e.t * beat, dur: Math.max(0.08, len * beat), hz: freq(m), midi: m, vel, hand: h, t: e.t });
      });
    }));
    const end = Math.max(0, ...hands.map(h => { const arr = ex[h] || [], l = arr[arr.length - 1]; return l ? l.t + l.d : 0; }));
    return { notes, beat, total: end * beat, onsets: [...new Set(notes.map(n => n.t))].sort((a, b) => a - b) };
  }

  const api = { KEYS, TIERS, CATEGORIES, EXERCISES, PRESETS, RHYTHMS, SCALES, keyById, exerciseById, build, routine, variantsFor, defaultVariant, earMelody, engrave, schedule, spell, voiceLead, freq };
  root.PianoExercises = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
