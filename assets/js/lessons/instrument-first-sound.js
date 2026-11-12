/* instrument-first-sound.js — the way in for a first-time player of any age.
 * Every instrument lesson opens with its studio, which assumes you already know what a chord is.
 * This panel sits at the top of that studio and gives a newcomer one quick win: a real, playable
 * instrument and a glowing first tune, with no reading needed. It then asks how much they have
 * played and offers a short route, so nobody has to scroll past tools they aren't ready for.
 *
 * In a lesson:
 *   <div data-first-sound="piano"></div>     first thing inside [data-creation-app]
 * Load audio-kit.js and music-synth.js (or drum-engine.js for drums) first.
 *
 * The level is the same one the take-home guide uses (performer-guide.js), kept in its storage key
 * and shared by every instrument. Choosing Advanced folds this panel away on later visits and hides
 * the "In plain words" boxes, so experienced players go straight to the studio.
 *
 * In the lesson text (plain HTML, so it prints and works with the glossary):
 *   <aside class="fs-plain" data-level="beginner|intermediate|advanced">…</aside>
 *   <div class="fs-ages">…</div>             "at any age" notes at the Set up stage
 * This script adds a Read to me button to each plain-words box, for young and new readers.
 * tests/instrument-first-sound.test.mjs checks tunes, routes and boxes on every lesson.
 */
(function () {
  'use strict';

  var LEVELS = [
    { id: 'beginner', icon: '🌱', name: 'Brand new', hint: 'I have never played' },
    { id: 'intermediate', icon: '🌿', name: 'Getting going', hint: 'I know a little' },
    { id: 'advanced', icon: '🌳', name: 'Going deep', hint: 'I want the theory' }
  ];
  // Note letters use the same colours as the child's take-home page (performer-guide.js).
  var LETTER_COLOUR = { C: '#d32f2f', D: '#f57c00', E: '#fbc02d', F: '#388e3c', G: '#0277bd', A: '#5e35b1', B: '#c2185b' };

  var KITS = {
    piano: {
      icon: '🎹', noun: 'key', layout: 'keys', voice: 'piano', length: 1.1,
      fact: 'A piano is a big box of strings. Press a key and a small felt hammer hits them.',
      notes: [
        { id: 'C', midi: 60 }, { id: 'C#', midi: 61, black: 1 }, { id: 'D', midi: 62 }, { id: 'D#', midi: 63, black: 2 },
        { id: 'E', midi: 64 }, { id: 'F', midi: 65 }, { id: 'F#', midi: 66, black: 4 }, { id: 'G', midi: 67 },
        { id: 'G#', midi: 68, black: 5 }, { id: 'A', midi: 69 }, { id: 'A#', midi: 70, black: 6 }, { id: 'B', midi: 71 },
        { id: 'C2', label: 'C', midi: 72 }
      ],
      song: {
        name: 'Hot Cross Buns',
        seq: 'E D C E D C C C C C D D D D E D C'.split(' '),
        beats: [1, 1, 2, 1, 1, 2, .5, .5, .5, .5, .5, .5, .5, .5, 1, 1, 2],
        done: 'You just played Hot Cross Buns with three white keys.'
      },
      routes: {
        beginner: [['anatomy', 'Find the notes'], ['handposition', 'Shape your hand'], ['reading', 'Read your first notes'], ['playapiece', 'Play a melody']],
        intermediate: [['reading', 'Read the staff'], ['intervals', 'Measure the distance between notes'], ['chordtypes', 'Hear major and minor'], ['playapiece', 'Play a melody']],
        advanced: [['arpeggios', 'Trace chords through a key'], ['scales', 'Compare scales and modes'], ['voicings', 'Rearrange a chord'], ['progressions', 'Write a progression']]
      }
    },
    guitar: {
      icon: '🎸', noun: 'string', layout: 'strings', voice: 'pluck', length: 2.2,
      fact: 'A guitar string makes the sound and the hollow body makes it louder. Thick strings sound low. Thin strings sound high.',
      notes: [
        { id: 'e', label: 'E', midi: 64, gauge: 1 }, { id: 'B', midi: 59, gauge: 1.4 }, { id: 'G', midi: 55, gauge: 1.9 },
        { id: 'D', midi: 50, gauge: 2.5 }, { id: 'A', midi: 45, gauge: 3.2 }, { id: 'Elow', label: 'E', midi: 40, gauge: 4 }
      ],
      strum: true,
      song: {
        name: 'the six open strings',
        seq: ['Elow', 'A', 'D', 'G', 'B', 'e', 'B', 'G', 'D', 'A', 'Elow'],
        beats: [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2],
        done: 'You just walked all six strings, low to high and back. That is the order guitarists tune in.'
      },
      routes: {
        beginner: [['anatomy', 'Learn the strings'], ['setup', 'Hold the guitar'], ['reading', 'Read tab'], ['progressions', 'Change between two chords']],
        intermediate: [['reading', 'Read tab'], ['intervals', 'Measure the distance between notes'], ['chordtypes', 'Hear major and minor'], ['progressions', 'Play a progression']],
        advanced: [['arpeggios', 'Trace chords through a key'], ['voicings', 'Rearrange a chord'], ['scales', 'Compare scales and modes'], ['progressions', 'Write a progression']]
      }
    },
    violin: {
      icon: '🎻', noun: 'string', layout: 'fingerboard', voice: 'violin', length: .9,
      fact: 'A violin has no frets or keys to show you the notes. Your ears find them.',
      notes: [{ id: 'G', midi: 55, gauge: 3 }, { id: 'D', midi: 62, gauge: 2.4 }, { id: 'A', midi: 69, gauge: 1.8 }, { id: 'E', midi: 76, gauge: 1.2 }],
      song: {
        name: 'the start of Twinkle, Twinkle, Little Star',
        seq: 'A A E E D D A A'.split(' '),
        beats: [1, 1, 1, 1, 1, 1, 1, 1],
        done: 'You just played the start of Twinkle, Twinkle, Little Star on open strings, then again one string lower.'
      },
      routes: {
        beginner: [['anatomy', 'Meet the parts'], ['hold', 'Hold the violin and bow'], ['tune', 'Learn the four strings'], ['pane-songbank', 'Pick a first song']],
        intermediate: [['tune', 'Tune by ear'], ['think', 'Find notes without frets'], ['pane-highlight', 'Light up a scale'], ['pane-songbank', 'Pick a song']],
        advanced: [['think', 'Think in fifths'], ['pane-highlight', 'Map scales and arpeggios'], ['pane-triads', 'Find triads'], ['pane-songbank', 'Work through the song bank']]
      }
    },
    saxophone: {
      icon: '🎷', noun: 'button', layout: 'fingers', voice: 'sax', length: .8,
      fact: 'A saxophone is made of brass, but a thin wooden reed makes the sound. Closing keys makes the tube longer and the note lower.',
      // Written B, A and G, sounding where an alto sax sounds them (a major sixth lower).
      notes: [{ id: 'B', midi: 62, fingers: 1 }, { id: 'A', midi: 60, fingers: 2 }, { id: 'G', midi: 58, fingers: 3 }],
      song: {
        name: 'Hot Cross Buns',
        seq: 'B A G B A G G G G G A A A A B A G'.split(' '),
        beats: [1, 1, 2, 1, 1, 2, .5, .5, .5, .5, .5, .5, .5, .5, 1, 1, 2],
        done: 'You just played Hot Cross Buns. Those are the first three notes most sax players learn.'
      },
      routes: {
        beginner: [['sound', 'See how it makes a sound'], ['technique', 'Set up for a first note'], ['keyguide', 'Learn the keys'], ['care', 'Dry the sax after playing']],
        intermediate: [['keyguide', 'Learn the keys'], ['fingering', 'Find any fingering'], ['reading', 'Read a phrase'], ['compose', 'Write eight beats']],
        advanced: [['transpose', 'Written and concert pitch'], ['routes', 'Trace chords one note at a time'], ['reading', 'Read ahead'], ['compose', 'Write eight beats']]
      }
    },
    drums: {
      icon: '🥁', noun: 'drum', layout: 'pads', length: 1,
      fact: 'A drum kit is several instruments played by one person, using both hands and both feet.',
      notes: [
        { id: 'crash', label: 'Crash', say: 'Pshh', tone: 'cymbal' }, { id: 'hat', label: 'Hi-hat', say: 'Tss', tone: 'cymbal' },
        { id: 'snare', label: 'Snare', say: 'Crack', tone: 'snare' }, { id: 'kick', label: 'Kick', say: 'Boom', tone: 'kick' }
      ],
      song: {
        name: 'a rock beat',
        seq: 'kick hat snare hat kick hat snare hat'.split(' '),
        beats: [1, 1, 1, 1, 1, 1, 1, 1],
        done: 'You just played a rock beat: boom, tss, crack, tss. Thousands of songs start from that pattern.'
      },
      routes: {
        beginner: [['anatomy', 'Meet the kit'], ['setup', 'Sit and hold the sticks'], ['beats', 'Hear how a beat is built'], ['perform', 'Play the backbeat']],
        intermediate: [['notation', 'Read drum notation'], ['beats', 'Learn the grooves'], ['perform', 'Take the backbeat challenge'], ['fills', 'Add a fill']],
        advanced: [['rudiments', 'Work on rudiments'], ['fills', 'Study fills'], ['notation', 'Read drum notation'], ['build', 'Write your own beat']]
      }
    }
  };

  var STORE = 'classroomos:performer-guide:v1';      // { reader, level } shared with the take-home guide
  var FOLD = 'classroomos:first-sound-folded:v1';
  var root = document.documentElement;

  function read(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }
  function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ } }
  function savedLevel() {
    var v = (read(STORE) || {}).level;
    return LEVELS.some(function (l) { return l.id === v; }) ? v : null;
  }
  function el(tag, cls, text, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function button(cls, text, parent) {
    var b = el('button', cls, text, parent);
    b.type = 'button';
    return b;
  }

  /* -------------------------------------------------- read to me (plain-words boxes) */
  var speech = window.speechSynthesis;
  var speaking = null;
  function stopSpeaking() {
    if (!speech) return;
    speech.cancel();
    if (speaking) { speaking.textContent = '🔊 Read to me'; speaking.setAttribute('aria-pressed', 'false'); }
    speaking = null;
  }
  function readAloud(b, box) {
    var again = speaking === b;
    stopSpeaking();
    if (again) return;
    var copy = box.cloneNode(true);
    copy.querySelectorAll('button, .fs-plain-tag').forEach(function (n) { n.remove(); });
    var say = new SpeechSynthesisUtterance(copy.textContent.replace(/\s+/g, ' ').trim());
    say.rate = .92;
    say.onend = function () { if (speaking === b) stopSpeaking(); };
    speaking = b;
    b.textContent = '■ Stop reading';
    b.setAttribute('aria-pressed', 'true');
    speech.speak(say);
  }
  if (speech && window.SpeechSynthesisUtterance) {
    document.querySelectorAll('.fs-plain').forEach(function (box) {
      var b = button('fs-read', '🔊 Read to me', box);
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { readAloud(b, box); });
    });
  }

  function applyLevel(level) {
    if (level) root.setAttribute('data-instrument-level', level); else root.removeAttribute('data-instrument-level');
  }
  applyLevel(savedLevel());

  var host = document.querySelector('[data-first-sound]');
  var kit = host && KITS[host.getAttribute('data-first-sound')];
  if (!kit) return;

  /* -------------------------------------------------------------------- sound */
  function strike(note) {
    var A = window.AudioKit;
    if (!A) return;
    try {
      if (kit.layout === 'pads') { A.drums().hit(note.id); return; }
      A.note({ instrument: kit.voice, midi: note.midi, duration: kit.length, velocity: .8 });
    } catch (e) { /* the panel still works silently */ }
  }

  /* -------------------------------------------------------------------- panel */
  var panel = el('details', 'fs fs-' + kit.layout);
  panel.id = 'first-sound';
  panel.setAttribute('data-present', 'off');
  panel.setAttribute('data-memory-ignore', '');
  panel.setAttribute('data-no-glossary', '');
  panel.open = !read(FOLD) && savedLevel() !== 'advanced';
  var summary = el('summary', 'fs-summary', null, panel);
  el('span', 'fs-summary-icon', kit.icon, summary).setAttribute('aria-hidden', 'true');
  var words = el('span', 'fs-summary-words', null, summary);
  el('strong', null, 'New here? Play your first tune', words);
  el('small', null, 'One minute, any age. No music reading needed.', words);
  el('span', 'fs-summary-toggle', null, summary).setAttribute('aria-hidden', 'true');
  panel.addEventListener('toggle', function () { write(FOLD, !panel.open); });

  var body = el('div', 'fs-body', null, panel);
  var stage = el('div', 'fs-stage', null, body);
  var prompt = el('p', 'fs-prompt', null, stage);
  prompt.setAttribute('aria-live', 'polite');
  var dots = el('ol', 'fs-dots', null, stage);
  dots.setAttribute('aria-hidden', 'true');
  var seq = kit.song.seq;
  var dotEls = seq.map(function () { return el('li', null, null, dots); });
  // Kept light in dark themes: this is a picture of a real instrument.
  var board = el('div', 'fs-board', null, stage);
  board.setAttribute('data-night-keep', '');
  board.setAttribute('role', 'group');
  board.setAttribute('aria-label', 'A playable ' + (host.getAttribute('data-first-sound')));
  var actions = el('div', 'fs-actions', null, stage);

  /* ---- the instrument: one real button per note, whatever it looks like */
  var noteButtons = {};
  function addNote(note, parent, cls) {
    var b = button('fs-note ' + (cls || ''), null, parent);
    var name = note.label || note.id;
    b.setAttribute('aria-label', note.say ? note.label + ': ' + note.say : name.replace('#', ' sharp'));
    noteButtons[note.id] = b;
    // Native click supports touch, pointer cancellation, keyboard and assistive technology.
    b.addEventListener('click', function () { press(note); });
    return b;
  }
  function letterTag(parent, letter) {
    var t = el('span', 'fs-letter', letter, parent);
    t.style.setProperty('--fs-letter', LETTER_COLOUR[letter] || '#555');
    return t;
  }
  var build = {
    keys: function () {
      var whites = kit.notes.filter(function (n) { return !n.black; });
      board.style.setProperty('--fs-whites', whites.length);
      whites.forEach(function (n) { letterTag(addNote(n, board, 'fs-white'), n.label || n.id); });
      kit.notes.forEach(function (n) {
        if (n.black) addNote(n, board, 'fs-black').style.setProperty('--fs-at', n.black);
      });
    },
    strings: function () {
      el('span', 'fs-soundhole', null, board).setAttribute('aria-hidden', 'true');
      kit.notes.forEach(function (n) {
        var b = addNote(n, board, 'fs-string');
        b.style.setProperty('--fs-gauge', n.gauge + 'px');
        letterTag(b, n.label || n.id);
        el('i', null, null, b);
      });
    },
    fingerboard: function () {
      kit.notes.forEach(function (n) {
        var b = addNote(n, board, 'fs-string fs-upright');
        b.style.setProperty('--fs-gauge', n.gauge + 'px');
        letterTag(b, n.id);
        el('i', null, null, b);
      });
    },
    fingers: function () {
      var art = el('div', 'fs-sax-art', null, board);
      art.setAttribute('aria-hidden', 'true');
      art.innerHTML = '<svg viewBox="0 0 120 170"><path d="M34 12c10-8 26-8 38-1" fill="none" stroke="#7a5a1e" stroke-width="7" stroke-linecap="round"/>'
        + '<path d="M72 10c5 3 7 8 7 14v84c0 12-9 21-21 21s-21-9-21-21v-20" fill="none" stroke="#d6a93a" stroke-width="15" stroke-linecap="round"/>'
        + '<path d="M37 88l-13-22h26z" fill="#d6a93a"/><path d="M26 12l9-5 2 9-9 3z" fill="#2c2c2c"/>'
        + '<g fill="#fff6dc" stroke="#7a5a1e" stroke-width="2"><circle cx="79" cy="38" r="5"/><circle cx="79" cy="53" r="5"/><circle cx="79" cy="68" r="5"/></g></svg>';
      var col = el('div', 'fs-finger-list', null, board);
      kit.notes.forEach(function (n) {
        var b = addNote(n, col, 'fs-finger');
        letterTag(b, n.id);
        var fingers = el('span', 'fs-finger-dots', null, b);
        for (var i = 1; i <= 3; i++) el('i', i <= n.fingers ? 'is-on' : '', null, fingers);
        el('small', null, n.fingers + (n.fingers === 1 ? ' finger' : ' fingers'), b);
      });
    },
    pads: function () {
      kit.notes.forEach(function (n) {
        var b = addNote(n, board, 'fs-pad fs-pad-' + n.tone);
        el('b', null, n.label, b);
        el('small', null, n.say, b);
      });
    }
  };
  build[kit.layout]();

  /* ---- following the tune */
  var mode = 'tune', step = 0, demoTimers = [];
  var noun = kit.noun;
  function nameOf(id) {
    var n = kit.notes.filter(function (x) { return x.id === id; })[0];
    return n.label || n.id;
  }
  function flash(note) {
    var b = noteButtons[note.id];
    b.classList.remove('is-hit');
    void b.offsetWidth;   // restart the animation on a repeated note
    b.classList.add('is-hit');
  }
  function paint() {
    Object.keys(noteButtons).forEach(function (id) { noteButtons[id].classList.remove('is-next'); });
    dotEls.forEach(function (d, i) { d.className = mode === 'tune' && i < step ? 'is-done' : ''; });
    dots.hidden = mode === 'free';
    done.hidden = mode !== 'finished';
    againBtn.hidden = mode === 'tune' && !step;
    freeBtn.hidden = mode === 'free';
    if (mode === 'tune') {
      noteButtons[seq[step]].classList.add('is-next');
      prompt.textContent = 'Tap the glowing ' + noun + ': ' + nameOf(seq[step]);
    } else if (mode === 'free') {
      prompt.textContent = 'Free play. Try anything. There are no wrong notes here.';
    } else if (mode === 'finished') {
      prompt.textContent = '🎉 ' + kit.song.done;
    }
  }
  function cancelDemo() {
    demoTimers.forEach(clearTimeout);
    demoTimers = [];
    hearBtn.textContent = '▶ Hear it first';
  }
  function press(note) {
    cancelDemo();
    strike(note);
    flash(note);
    if (mode !== 'tune' || note.id !== seq[step]) return;   // a different note is just more music
    step += 1;
    if (step === seq.length) mode = 'finished';
    paint();
  }
  function restart() { cancelDemo(); mode = 'tune'; step = 0; paint(); }
  function demo() {
    if (demoTimers.length) { cancelDemo(); return; }
    restart();
    hearBtn.textContent = '■ Stop';
    prompt.textContent = 'Listen first, then you try.';
    var at = 0, beat = 420;
    seq.forEach(function (id, i) {
      var note = kit.notes.filter(function (n) { return n.id === id; })[0];
      demoTimers.push(setTimeout(function () { strike(note); flash(note); }, at));
      at += (kit.song.beats[i] || 1) * beat;
    });
    demoTimers.push(setTimeout(restart, at + 200));
  }

  var hearBtn = button('fs-action fs-action-main', '▶ Hear it first', actions);
  hearBtn.addEventListener('click', demo);
  if (kit.strum) {
    button('fs-action', '🎵 Strum all six', actions).addEventListener('click', function () {
      cancelDemo();
      kit.notes.slice().reverse().forEach(function (n, i) {
        demoTimers.push(setTimeout(function () { strike(n); flash(n); }, i * 45));
      });
    });
  }
  var againBtn = button('fs-action', '↺ Start again', actions);
  againBtn.addEventListener('click', restart);
  var freeBtn = button('fs-action', 'Free play', actions);
  freeBtn.addEventListener('click', function () { cancelDemo(); mode = 'free'; paint(); });
  if (window.AudioKit && window.AudioKit.onStop) window.AudioKit.onStop(function () { cancelDemo(); paint(); });

  var done = el('a', 'fs-next', null, stage);

  /* ---- how much have you played, and where next */
  var side = el('div', 'fs-side', null, body);
  el('p', 'fs-fact', kit.fact, side);
  var fieldset = el('fieldset', 'fs-levels', null, side);
  el('legend', null, 'How much have you played?', fieldset);
  var levelButtons = LEVELS.map(function (l) {
    var b = button('fs-level', null, fieldset);
    el('span', 'fs-level-icon', l.icon, b).setAttribute('aria-hidden', 'true');
    var w = el('span', null, null, b);
    el('b', null, l.name, w);
    el('small', null, l.hint, w);
    b.addEventListener('click', function () { choose(l.id); });
    return { level: l, button: b };
  });
  var routeTitle = el('p', 'fs-route-title', null, side);
  var route = el('ol', 'fs-route', null, side);
  el('p', 'fs-note-below', 'The studio below is here whenever you want it. If it looks like a lot, skip it for now.', side);

  function paintRoute(level) {
    var chosen = level || 'beginner';
    levelButtons.forEach(function (x) { x.button.setAttribute('aria-pressed', x.level.id === level ? 'true' : 'false'); });
    routeTitle.textContent = level ? 'Your route' : 'A good first route';
    route.textContent = '';
    kit.routes[chosen].forEach(function (r) {
      var a = el('a', null, r[1], el('li', null, null, route));
      a.href = '#' + r[0];
    });
    var first = kit.routes[chosen][0];
    done.href = '#' + first[0];
    done.textContent = 'Next: ' + first[1] + ' →';
  }
  function choose(level) {
    var saved = read(STORE) || {};
    saved.level = level;
    write(STORE, saved);
    applyLevel(level);
    paintRoute(level);
    document.dispatchEvent(new CustomEvent('instrument-level', { detail: level }));
  }

  host.parentNode.replaceChild(panel, host);
  paintRoute(savedLevel());
  paint();
})();
