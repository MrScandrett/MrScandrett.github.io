/* Suggested piano fingering for any keyboard score drawn by score-engine.js.
 *
 * plan(layout, score) is pure: it returns { [event index]: [finger per pitch] } for each
 * hand (1 thumb … 5 little finger). install(fig, score, bar) adds the "Finger numbers"
 * toggle, draws the numbers after every engraving, and supplies the print decorator.
 * The choice is remembered site-wide in localStorage ('classroomos-score-fingering').
 * These are suggestions from a small dynamic-programming search, not an editor's
 * fingering: the key text says so. */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'classroomos-score-fingering';
  var NS = 'http://www.w3.org/2000/svg';
  var BLACK = { 1: 1, 3: 1, 6: 1, 8: 1, 10: 1 };

  // Which hand plays a staff, and whether the piece is for keyboard at all.
  function handOf(staff) {
    var label = String(staff.label || '');
    if (/left/i.test(label)) return 'left';
    if (/right/i.test(label)) return 'right';
    if (/accompaniment/i.test(label)) return 'left';
    if (/lead|melody/i.test(label)) return 'right';
    // A bass line that opens in treble clef (Morton, Jelly Roll Blues) is still the left hand.
    if (/\bbass\b/i.test(label)) return 'left';
    return staff.clef === 'bass' ? 'left' : 'right';
  }
  function isKeyboard(score) {
    var staves = score && score.staves || [];
    if (!staves.length) return false;
    var named = staves.some(function (s) { return s.instrument === 'piano'; });
    var hands = staves.every(function (s) { return !s.instrument && /(left|right) hand/i.test(s.label || ''); });
    return named || hands;
  }

  var REACH_KEY = 'classroomos-score-fingering-reach';
  var KEY_TEXT = 'Suggested piano fingering: 1 thumb · 2 index · 3 middle · 4 ring · 5 little finger. Chord numbers read from top note to bottom note. Hover, focus or tap a number for the keyboard guide. † = plan with your teacher: a wide reach, held voice, ornament or hand redistribution needs individual fingering. Never stretch to reach a number. Your teacher should adapt these generated suggestions for your hand and phrasing.';
  var PRINT_TEXT = 'Generated fingering suggestions: 1 thumb · 2 index · 3 middle · 4 ring · 5 little finger. Chord numbers read from highest note to lowest. † = teacher review for reach, held voices, ornaments or hand distribution. Adapt for your hand and phrasing; never force a stretch.';
  var EPS = 1e-5;
  function isBlack(midi) { return !!BLACK[((midi % 12) + 12) % 12]; }

  // Conservative teaching limits, in semitones, rather than anatomical claims.
  // Adjacent long fingers must not be asked to span a sixth; an octave needs 1–5.
  var LIMIT = { '12': 5, '13': 7, '14': 9, '15': 12, '23': 3, '24': 5, '25': 7, '34': 3, '35': 5, '45': 3 };
  var OFF = [0, 0, 2, 4, 5, 7];
  var SHIFT = 5; // base cost of lifting the hand to a new position on a leap
  var IMPOSSIBLE = 7; // cost of a legato crossing no hand can make
  function pairLimit(a, b, reach) {
    return Math.min(reach, LIMIT[Math.min(a, b) + '' + Math.max(a, b)] || 0);
  }
  function candidates(notes, hand, reach) {
    if (notes.length > 5 || notes[notes.length - 1].midi - notes[0].midi > reach) return [];
    var out = [], dir = hand === 'left' ? -1 : 1;
    function visit(fs, f) {
      var i = fs.length;
      if (i === notes.length) {
        var cost = 0;
        notes.forEach(function (n, j) {
          // Black-key thumbs are allowed, especially in chords, not banned.
          if (isBlack(n.midi)) cost += fs[j] === 1 ? 0.55 : fs[j] === 5 ? 0.18 : 0;
          for (var k = 0; k < j; k++) {
            var gap = n.midi - notes[k].midi;
            cost += Math.abs(gap - Math.abs(OFF[fs[j]] - OFF[fs[k]])) * 0.12;
          }
        });
        out.push({ fingers: fs.slice(), local: cost });
        return;
      }
      for (; f >= 1 && f <= 5; f += dir) {
        if (notes[i].fixed && notes[i].fixed !== f) continue;
        var fits = fs.every(function (other, k) { return notes[i].midi - notes[k].midi <= pairLimit(other, f, reach); });
        if (fits) visit(fs.concat(f), f + dir);
      }
    }
    visit([], hand === 'left' ? 5 : 1);
    return out;
  }

  // info.blocked is set when a legato pair needs a crossing no hand can make.
  function transition(before, a, after, b, hand, reach, info) {
    var dir = hand === 'left' ? -1 : 1, cost = 0;
    // Held keys keep their fingers. No silent substitution or reuse of a held finger.
    for (var j = 0; j < after.notes.length; j++) {
      if (!after.notes[j].held) continue;
      var prev = before.notes.findIndex(function (n) { return n.midi === after.notes[j].midi; });
      if (prev < 0 || a.fingers[prev] !== b.fingers[j]) return Infinity;
    }
    if (after.time > before.end + EPS) return 0; // a real rest permits repositioning
    var pairs = 0;
    before.notes.forEach(function (p, pi) {
      after.notes.forEach(function (n, ni) {
        if (!n.attack || p.held) return;
        var semis = (n.midi - p.midi) * dir, pf = a.fingers[pi], nf = b.fingers[ni];
        var move = nf - pf, distance = Math.abs(semis), c = 0;
        // A leap wider than a fifth that the fingers cannot take in order (the wrong
        // way past the thumb or little finger, or with the same finger) is played by
        // lifting the hand to a new position, so it is never planned as a crossing no
        // hand can make (e.g. LH 1, then 5 an octave higher). The landing term leans
        // toward the finger that leads the hand: the thumb when moving thumb-wards.
        var shift = distance > 7 ? SHIFT + Math.min(distance, 24) * 0.1 + (semis < 0 ? (nf - 1) * 0.5 : (5 - nf) * 0.3) : Infinity;
        if (!distance) c = pf === nf ? 0 : 1.8;
        else if (move && Math.sign(move) === Math.sign(semis)) {
          c = Math.abs(distance - Math.abs(OFF[nf] - OFF[pf])) * 0.32;
          if (distance <= 2 && Math.abs(move) > 1) c += 0.6;
          if (distance > pairLimit(pf, nf, reach)) c += (distance - pairLimit(pf, nf, reach)) * 0.5;
        } else {
          // In scalar motion only the thumb passes under / is crossed over.
          var crossing = distance <= 4 && ((semis > 0 && nf === 1 && pf > 1 && pf < 5) ||
            (semis < 0 && pf === 1 && nf > 1 && nf < 5));
          // Crossing a third is far less natural than crossing a step (scales vs arpeggios).
          if (crossing) c = 1.3 + Math.max(0, distance - 2) * 0.6 + (isBlack(nf === 1 ? n.midi : p.midi) ? 1.5 : 0);
          else if (distance > 7) c = shift;
          else {
            c = IMPOSSIBLE + distance * 0.12;
            // In a single line this is a real dead end; between chords it is one pair of many.
            if (info && before.notes.length === 1 && after.notes.length === 1) info.blocked = true;
          }
        }
        cost += c; pairs++;
      });
    });
    return pairs ? cost / pairs : 0;
  }

  function timeOf(ev) { return ev.abs == null ? ev.bar * 1000 + ev.start : ev.abs; }
  function endOf(ev, midi) {
    var end = timeOf(ev) + (ev.dur || 0), cur = ev, seen = new Set();
    while (cur.tie && cur.tieTo && !seen.has(cur.tieTo) && cur.tieTo.pitches.some(function (p) { return p.midi === midi; })) {
      cur = cur.tieTo; seen.add(cur);
      end = Math.max(end, timeOf(cur) + (cur.dur || 0));
    }
    return end;
  }
  function keyboardStaff(staff) {
    return staff.instrument === 'piano' || (!staff.instrument && /(left|right) hand/i.test(staff.label || ''));
  }

  // Detailed result also explains omissions. plan() retains the original public API.
  function planDetailed(layout, score, options) {
    var result = {}, reviews = {}, allGroups = [];
    var reach = options && Number(options.reach);
    if (![7, 9, 12].includes(reach)) reach = 12;
    var hands = new Map();
    (score.staves || []).forEach(function (staff, si) {
      if (!keyboardStaff(staff)) return;
      // A solo hand can occupy multiple staves; duet players stay independent.
      var player = String(staff.label || '').match(/^(.*?)\b(?:right|left)\b/i);
      var key = (player ? player[1].trim().toLowerCase() : '') + ':' + handOf(staff);
      if (!hands.has(key)) hands.set(key, { hand: handOf(staff), indices: [] });
      hands.get(key).indices.push(si);
    });
    hands.forEach(function (part) {
      var hand = part.hand, onsets = new Map(), active = [], chain = [];
      layout.events.forEach(function (ev) {
        if (!part.indices.includes(ev.staff) || ev.kind !== 'note' || ev.hidden || ev.grace || !ev.pitches) return;
        var time = timeOf(ev);
        if (!onsets.has(time)) onsets.set(time, []);
        onsets.get(time).push(ev);
      });
      function save() {
        if (!chain.length) return;
        var last = chain[chain.length - 1], idx = 0;
        function endingCost(state) {
          if (chain.length < 2 || last.notes.length !== 1) return state.cost;
          var prior = chain[chain.length - 2];
          if (prior.notes.length !== 1) return state.cost;
          var d = (last.notes[0].midi - prior.notes[0].midi) * (hand === 'left' ? -1 : 1);
          return state.cost + (d && Math.abs(d) <= 4 ? Math.abs(state.fingers[0] - (d > 0 ? 5 : 1)) * 0.7 : 0);
        }
        last.states.forEach(function (s, i) { if (endingCost(s) < endingCost(last.states[idx])) idx = i; });
        for (var at = chain.length - 1; at >= 0; at--) {
          var g = chain[at], state = g.states[idx];
          // The best path still needs a finger crossing no hand can make (usually a held
          // note pins a finger): say so rather than print an impossible number.
          if (state.blocked) {
            g.events.forEach(function (ev) { if (!ev.fingering) reviews[ev.i] = 'Hand position change: no comfortable finger connects these notes; plan a shift or release with your teacher.'; });
            idx = state.prev;
            continue;
          }
          g.notes.forEach(function (n, ni) {
            n.entries.forEach(function (e) {
              if (e.tied || e.ev.fingering) return;
              (result[e.ev.i] = result[e.ev.i] || [])[e.pi] = state.fingers[ni];
            });
          });
          idx = state.prev;
        }
        chain = [];
      }
      var uncertainUntil = -Infinity;
      Array.from(onsets.keys()).sort(function (a, b) { return a - b; }).forEach(function (time) {
        active = active.filter(function (n) { return n.end > time + EPS; });
        var events = onsets.get(time), pitches = new Map();
        active.forEach(function (n) { pitches.set(n.midi, { midi: n.midi, end: n.end, staff: n.staff, held: true, entries: [] }); });
        var ornament = false;
        events.forEach(function (ev) {
          ornament = ornament || !!(ev.graces && ev.graces.length) || !!(ev.orn && ev.orn.some(function (o) { return /^(tr|mord|turn)$/.test(o); }));
          var explicit;
          if (ev.fingering) {
            explicit = new Map();
            var values = ev.fingering.split('/').map(Number);
            ev.pitches.slice().sort(function (a, b) { return a.midi - b.midi; }).forEach(function (p, i) {
              explicit.set(p.midi, values[i]);
            });
          }
          ev.pitches.forEach(function (p, pi) {
            var n = pitches.get(p.midi);
            if (!n) { n = { midi: p.midi, end: endOf(ev, p.midi), staff: ev.staff, entries: [] }; pitches.set(p.midi, n); }
            n.end = Math.max(n.end, endOf(ev, p.midi));
            n.attack = n.attack || !p.tiedFrom;
            if (explicit && explicit.get(p.midi)) n.fixed = explicit.get(p.midi);
            n.entries.push({ ev: ev, pi: pi, tied: !!p.tiedFrom });
          });
        });
        var notes = Array.from(pitches.values()).sort(function (a, b) { return a.midi - b.midi; });
        active = notes;
        if (!notes.some(function (n) { return n.attack; })) return;
        var group = { time: time, notes: notes, events: events, hand: hand, staffIndices: part.indices,
          end: Math.max.apply(null, notes.map(function (n) { return n.end; })) };
        allGroups.push(group);
        var choices = candidates(notes, hand, reach), before = chain[chain.length - 1];
        var states = choices.map(function (choice) {
          var best = Infinity, prev = 0, blocked = false;
          if (!before) best = choice.local;
          else before.states.forEach(function (state, i) {
            var info = {}, c = state.cost + choice.local + transition(before, state, group, choice, hand, reach, info);
            if (c < best) { best = c; prev = i; blocked = !!info.blocked; }
          });
          return { fingers: choice.fingers, cost: best, prev: prev, blocked: blocked };
        });
        var crossStaff = notes.some(function (n) { return n.staff !== events[0].staff; });
        var reason = crossStaff ? 'One hand spans multiple staves: confirm hand distribution and releases with your teacher.' : ornament ? 'Ornament: plan the full gesture with your teacher.' :
          time < uncertainUntil - EPS ? 'A preceding held voice needs individual fingering.' :
          !choices.length ? 'Reach or chord spacing: ask your teacher about releasing, rolling or redistributing notes; do not stretch.' :
          !states.some(function (s) { return Number.isFinite(s.cost); }) ? 'Held voices prevent a supported finger transition; plan releases or redistribution with your teacher.' : '';
        if (reason) {
          save();
          events.forEach(function (ev) { if (!ev.fingering) reviews[ev.i] = reason; });
          uncertainUntil = Math.max(uncertainUntil, group.end);
        } else { group.states = states; chain.push(group); }
      });
      save();
    });
    return { fingers: result, reviews: reviews, groups: allGroups, reach: reach };
  }
  function plan(layout, score, options) { return planDetailed(layout, score, options).fingers; }

  function addMarks(svg, layout, score, options, planned) {
    svg.querySelectorAll('.se-finger-number').forEach(function (n) { n.remove(); });
    var detail = planned || planDetailed(layout, score, options), fingers = detail.fingers;
    var groups = new Map(), byStaffLine = new Map();
    svg.querySelectorAll('.se-ev[data-i]').forEach(function (node) {
      groups.set(Number(node.getAttribute('data-i')), node);
    });
    function staffLine(ev) { return ev.sys + ':' + ev.staff; }
    layout.events.forEach(function (ev) {
      if (ev.hidden || ev.kind !== 'note') return;
      var key = staffLine(ev);
      if (!byStaffLine.has(key)) byStaffLine.set(key, []);
      byStaffLine.get(key).push(ev);
    });
    detail.groups.forEach(function (onset) {
      var events = onset.events.filter(function (ev) { return !ev.fingering && (fingers[ev.i] || detail.reviews[ev.i]); });
      if (!events.length) return;
      var ev = events[0], group = groups.get(ev.i);
      if (!group) return;
      var above = onset.hand === 'right', S = layout.S, h = S / 2;
      var edge = above ? ev.bottom - 4 * S : ev.bottom;
      (byStaffLine.get(staffLine(ev)) || []).forEach(function (other) {
        if (Math.abs(other.x - ev.x) >= 3 * S) return;
        var head = other.bottom - (above ? other.hi : other.lo) * h;
        var tip = other.tipY == null ? head : other.tipY;
        var pad = other.tuplet ? 3.2 * S : 1.8 * S;
        edge = above ? Math.min(edge, head - pad, tip - pad) : Math.max(edge, head + pad, tip + pad);
        // Trills, mordents and turns sit above the note (drawOrnaments in score-engine.js): go over them.
        var signs = above && Math.abs(other.x - ev.x) < 1.5 * S && other.orn ? other.orn.filter(function (o) { return /^(tr|mord|turn)$/.test(o); }).length : 0;
        if (signs) {
          var top = Math.min(other.bottom - 4.5 * S, head - 1.4 * S, other.up && other.tipY != null ? other.tipY - 0.8 * S : Infinity);
          if (other.fermata) top -= 2 * S;
          edge = Math.min(edge, top - (signs - 1) * 1.6 * S - 1.5 * S);
        }
      });
      var review = detail.reviews[ev.i];
      // Stack from high pitch to low pitch, like the chord itself. Consolidate
      // simultaneous voices so their labels cannot print on top of each other.
      var labels = review ? ['†'] : onset.notes.slice().reverse().filter(function (n) {
        return n.entries.some(function (e) { return !e.tied && fingers[e.ev.i] && fingers[e.ev.i][e.pi]; });
      }).map(function (n) {
        var e = n.entries.find(function (entry) { return !entry.tied && fingers[entry.ev.i] && fingers[entry.ev.i][entry.pi]; });
        return String(fingers[e.ev.i][e.pi]);
      });
      labels.forEach(function (label, i) {
        var text = document.createElementNS(NS, 'text');
        text.setAttribute('class', 'se-finger-number');
        text.setAttribute('x', ev.x + (ev.headW || S) * 0.5);
        text.setAttribute('y', above ? edge - (labels.length - 1 - i) * 1.15 * S : edge + (0.7 + i * 1.15) * S);
        text.setAttribute('font-size', 1.08 * S);
        text.setAttribute('text-anchor', 'middle');
        text.textContent = label;
        if (review) {
          text.setAttribute('aria-label', review);
          var title = document.createElementNS(NS, 'title'); title.textContent = review; text.appendChild(title);
        }
        group.appendChild(text);
      });
    });
  }

  function pitchName(pitch) {
    return 'CDEFGAB'[pitch.l] + (['𝄫', '♭', '', '♯', '𝄪'][pitch.a + 2] || '') + pitch.o;
  }

  function interval(from, to) {
    var steps = Math.abs(to.diatonic - from.diatonic);
    var simple = steps % 7;
    var expected = [0, 2, 4, 5, 7, 9, 11][simple] + Math.floor(steps / 7) * 12;
    var difference = Math.abs(to.midi - from.midi) - expected;
    var perfect = simple === 0 || simple === 3 || simple === 4;
    var quality = difference === 0 ? (perfect ? 'P' : 'M') : difference === -1 && !perfect ? 'm'
      : difference > 0 ? 'A'.repeat(difference) : 'd'.repeat(-difference - (perfect ? 0 : 1));
    return { label: quality + (steps + 1), family: simple === 0 && steps ? 8 : simple + 1 };
  }

  function writtenFinger(ev, midi) {
    if (!ev.fingering) return null;
    var ordered = ev.pitches.slice().sort(function (a, b) { return a.midi - b.midi; });
    return Number(ev.fingering.split('/')[ordered.findIndex(function (pitch) { return pitch.midi === midi; })]) || null;
  }

  function attackTones(onset, plan) {
    return onset.notes.flatMap(function (note) {
      var attacks = note.entries.filter(function (entry) { return !entry.tied; });
      if (!attacks.length) return [];
      var entry = attacks.find(function (attack) { return attack.ev.fingering; }) || attacks[0];
      var written = writtenFinger(entry.ev, note.midi);
      return [{ pitch: entry.ev.pitches[entry.pi], finger: written || plan.fingers[entry.ev.i]?.[entry.pi],
        written: !!written }];
    });
  }

  function keyboard(container, tones) {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    var white = document.createElementNS(NS, 'g'), black = document.createElementNS(NS, 'g');
    var byMidi = new Map(tones.map(function (tone) { return [tone.pitch.midi, tone]; }));
    var lo = tones[0].pitch.midi - 2, hi = tones[tones.length - 1].pitch.midi + 2;
    while (isBlack(lo)) lo--;
    while (isBlack(hi)) hi++;
    var x = 0;
    function shape(tag, parent, attrs, content) {
      var node = document.createElementNS(NS, tag);
      Object.entries(attrs).forEach(function (pair) { node.setAttribute(pair[0], pair[1]); });
      if (content != null) node.textContent = content;
      parent.appendChild(node);
    }
    for (var midi = lo; midi <= hi; midi++) {
      var sharp = isBlack(midi), width = sharp ? 17 : 27, height = sharp ? 39 : 64;
      var left = sharp ? x - width / 2 : x, layer = sharp ? black : white, tone = byMidi.get(midi);
      shape('rect', layer, { x: left, y: 0, width: width, height: height, rx: 2,
        class: (sharp ? 'se-key-black' : 'se-key-white') + (tone ? ' se-key-active' : ''),
        'data-interval': tone ? tone.interval.family : '' });
      if (tone?.finger) shape('text', layer, { x: left + width / 2, y: height - 9 }, tone.finger);
      if (!sharp) x += width;
    }
    svg.setAttribute('viewBox', '0 0 ' + x + ' 65');
    svg.style.width = x + 'px';
    svg.append(white, black);
    container.appendChild(svg);
  }

  // Technique tips: the review sentences name four ways out of a hard spot. Each name is
  // highlighted in the guide and opens its own tip with a diagram on hover, focus or tap.
  // Diagram strings are static and trusted; they are never built from score data.
  var TECHNIQUES = {
    release: {
      title: 'Releasing',
      text: 'Lift a finger early, before the written note ends, so it is free for the next note. The sound of that note stops a little sooner; the music still flows.',
      svg: '<svg viewBox="0 0 220 84" role="img" aria-label="A held note lifted early so the next note can start">' +
        '<rect class="ghost" x="16" y="12" width="188" height="16" rx="3"/>' +
        '<rect class="bar a" x="16" y="12" width="84" height="16" rx="3"/>' +
        '<text class="on" x="22" y="24">held note</text>' +
        '<rect class="bar b" x="106" y="38" width="98" height="16" rx="3"/>' +
        '<text class="on" x="112" y="50">next note</text>' +
        '<path class="cue" d="M103 4v56"/>' +
        '<text class="lbl" x="103" y="72" text-anchor="middle">lift here ↑</text>' +
        '<text class="lbl faint" x="204" y="9" text-anchor="end">written length</text></svg>'
    },
    roll: {
      title: 'Rolling',
      text: 'Spread a wide chord from bottom to top, one note right after another, like a harp. Each finger lands in turn, so a small hand never has to reach for all of it at once.',
      svg: '<svg viewBox="0 0 220 84" role="img" aria-label="Chord notes played one after another from low to high">' +
        '<rect class="bar c3" x="124" y="8" width="80" height="16" rx="3"/><text class="on" x="130" y="20">3 · top</text>' +
        '<rect class="bar c2" x="70" y="30" width="134" height="16" rx="3"/><text class="on" x="76" y="42">2</text>' +
        '<rect class="bar c1" x="16" y="52" width="188" height="16" rx="3"/><text class="on" x="22" y="64">1 · low</text>' +
        '<path class="cue" d="M18 76 L202 76"/><path class="head" d="M202 76l-6-3.5v7z"/>' +
        '<text class="lbl" x="110" y="83" text-anchor="middle" dy="-.2">time →</text></svg>'
    },
    redistribute: {
      title: 'Redistributing',
      text: 'Share the notes differently: hand one note to the other hand or another finger, so every hand stays inside its comfortable reach. Your teacher decides which note moves.',
      svg: '<svg viewBox="0 0 220 84" role="img" aria-label="The top note of a wide chord handed to the other hand">' +
        '<g class="keys"><rect x="12" y="46" width="28" height="34"/><rect x="40" y="46" width="28" height="34"/><rect x="68" y="46" width="28" height="34"/>' +
        '<rect x="96" y="46" width="28" height="34"/><rect x="124" y="46" width="28" height="34"/><rect x="152" y="46" width="28" height="34"/><rect x="180" y="46" width="28" height="34"/></g>' +
        '<circle class="dot c1" cx="26" cy="66" r="7"/><circle class="dot c1" cx="82" cy="66" r="7"/><circle class="dot c1" cx="138" cy="66" r="7"/>' +
        '<circle class="dot c3" cx="194" cy="66" r="7"/>' +
        '<path class="brace a" d="M18 38h128"/><text class="lbl" x="82" y="31" text-anchor="middle">this hand</text>' +
        '<path class="brace b" d="M170 38h48"/><text class="lbl" x="194" y="31" text-anchor="middle">other hand</text>' +
        '<path class="cue" d="M194 57v-6"/></svg>'
    },
    stretch: {
      title: 'Do not stretch',
      text: 'Never force a reach to hit a number. Straining the hand tires it and risks injury, and the notes come out tense. Change the plan instead: release, roll or redistribute.',
      svg: '<svg viewBox="0 0 220 84" role="img" aria-label="A comfortable five-finger span is fine; a far reach is marked wrong">' +
        '<g class="keys"><rect x="14" y="48" width="24" height="32"/><rect x="38" y="48" width="24" height="32"/><rect x="62" y="48" width="24" height="32"/><rect x="86" y="48" width="24" height="32"/>' +
        '<rect x="110" y="48" width="24" height="32"/><rect x="134" y="48" width="24" height="32"/><rect x="158" y="48" width="24" height="32"/><rect x="182" y="48" width="24" height="32"/></g>' +
        '<circle class="dot c1" cx="26" cy="66" r="7"/><text class="on" x="26" y="69.5" text-anchor="middle">1</text>' +
        '<circle class="dot c1" cx="122" cy="66" r="7"/><text class="on" x="122" y="69.5" text-anchor="middle">5</text>' +
        '<path class="brace ok" d="M26 38h96"/><text class="lbl" x="74" y="33" text-anchor="middle">comfortable ✓</text>' +
        '<path class="brace bad" d="M26 14h180"/><circle class="dot c7" cx="206" cy="66" r="7"/><text class="on" x="206" y="69.5" text-anchor="middle">✕</text>' +
        '<text class="lbl bad" x="116" y="11" text-anchor="middle">too far: stretching ✕</text></svg>'
    }
  };
  var TECHNIQUE_RE = /\b(releas(?:e|es|ing)|roll(?:ing)?|redistribut(?:e|es|ing|ion)|(?:do not|don't) stretch)\b/gi;
  function techniqueKey(word) {
    var w = word.toLowerCase();
    return /^redistribut/.test(w) ? 'redistribute' : /^releas/.test(w) ? 'release' : /^roll/.test(w) ? 'roll' : /stretch$/.test(w) ? 'stretch' : null;
  }
  // Split a review sentence into plain and technique segments (pure; tested).
  function techniqueSegments(text) {
    var out = [], last = 0, m;
    text = String(text);
    TECHNIQUE_RE.lastIndex = 0;
    while ((m = TECHNIQUE_RE.exec(text))) {
      var key = techniqueKey(m[0]);
      if (!key) continue;
      if (m.index > last) out.push({ text: text.slice(last, m.index) });
      out.push({ text: m[0], technique: key });
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ text: text.slice(last) });
    return out;
  }

  function installGuide(fig, getPlan) {
    var panel = document.createElement('div');
    panel.className = 'se-finger-guide';
    panel.id = 'se-finger-guide-' + (++guideId);
    panel.setAttribute('role', 'tooltip');
    panel.setAttribute('popover', 'manual');
    panel.setAttribute('data-contrast-guard-skip', '');
    panel.hidden = true;
    fig.appendChild(panel);
    var anchor, timer, tip = document.createElement('div'), tipTerm, tipTimer;
    tip.className = 'se-technique-tip';
    tip.setAttribute('role', 'tooltip');
    tip.id = panel.id + '-tip';
    tip.hidden = true;
    function hideTip() {
      clearTimeout(tipTimer);
      if (tipTerm) tipTerm.removeAttribute('aria-describedby');
      tipTerm = null;
      tip.hidden = true;
    }
    function showTip(term) {
      clearTimeout(tipTimer);
      if (term === tipTerm) return;
      var info = TECHNIQUES[term.dataset.technique];
      if (!info) return;
      hideTip();
      tip.replaceChildren();
      var head = document.createElement('strong'); head.textContent = info.title; tip.appendChild(head);
      var art = document.createElement('div'); art.className = 'se-technique-art';
      art.innerHTML = info.svg; // static, trusted strings from TECHNIQUES
      tip.appendChild(art);
      var body = document.createElement('p'); body.textContent = info.text; tip.appendChild(body);
      tipTerm = term;
      term.setAttribute('aria-describedby', tip.id);
      tip.hidden = false;
      var r = term.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
      // Prefer below the word (the panel's own text sits above it); flip above when cramped.
      var top = r.bottom + 8 + h <= root.innerHeight - 8 ? r.bottom + 8 : Math.max(8, r.top - h - 8);
      tip.style.left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, root.innerWidth - w - 8)) + 'px';
      tip.style.top = top + 'px';
    }
    function termFrom(target) { return target.closest?.('.se-technique'); }
    function reviewLine(text) {
      var p = line('p', '');
      p.className = 'se-review';
      techniqueSegments(text).forEach(function (seg) {
        if (!seg.technique) { p.appendChild(document.createTextNode(seg.text)); return; }
        var span = document.createElement('span');
        span.className = 'se-technique';
        span.dataset.technique = seg.technique;
        span.tabIndex = 0;
        span.setAttribute('role', 'button');
        span.setAttribute('aria-label', TECHNIQUES[seg.technique].title + ': show tip');
        span.textContent = seg.text;
        p.appendChild(span);
      });
    }
    function hide() {
      clearTimeout(timer);
      hideTip();
      if (!anchor) return;
      anchor.removeAttribute('aria-describedby');
      anchor = null;
      if (panel.hidePopover) panel.hidePopover();
      panel.hidden = true;
      if (hideActiveGuide === hide) hideActiveGuide = null;
    }
    function line(tag, content, parent) {
      var node = document.createElement(tag);
      node.textContent = content;
      (parent || panel).appendChild(node);
      return node;
    }
    function show(mark) {
      clearTimeout(timer);
      if (mark === anchor) return;
      hide();
      var eventIndex = Number(mark.closest('.se-ev').dataset.i);
      var data = getPlan(), position = data.byEvent.get(eventIndex);
      if (!position) return;
      var onset = position.onset, tones = attackTones(onset, data.plan);
      if (!tones.length) return;
      if (hideActiveGuide) hideActiveGuide();
      hideActiveGuide = hide;
      var low = tones[0].pitch, top = tones[tones.length - 1].pitch;
      tones.forEach(function (tone, i) { tone.interval = i ? interval(low, tone.pitch) : { label: 'Low', family: 1 }; });
      panel.replaceChildren();
      var source = tones.every(function (tone) { return tone.written; }) ? 'Written fingering'
        : tones.some(function (tone) { return tone.written; }) ? 'Written & suggested fingering'
          : tones.some(function (tone) { return tone.finger; }) ? 'Suggested fingering' : 'Teacher review';
      line('strong', (onset.hand === 'right' ? 'Right hand' : 'Left hand') + ' · ' + source);
      keyboard(panel, tones);
      var legend = line('ul', '');
      tones.forEach(function (tone) {
        var label = pitchName(tone.pitch) + (tones.length > 1 ? ' · ' + tone.interval.label : '') +
          (tone.finger ? ' · finger ' + tone.finger : '');
        line('li', label, legend).dataset.interval = tone.interval.family;
      });
      if (tones.length > 1) line('p', 'Intervals from ' + pitchName(low) + ' · span ' + interval(low, top).label);
      var nextTones = position.next ? attackTones(position.next, data.plan) : [];
      if (nextTones.length) {
        var next = nextTones[nextTones.length - 1].pitch;
        var motion = next.midi === top.midi ? 'same pitch' : (next.midi > top.midi ? 'up ' : 'down ') + interval(top, next).label;
        line('p', (tones.length > 1 || nextTones.length > 1 ? 'Next top note: ' : 'Next note: ') + pitchName(next) + ' · ' + motion);
      }
      if (data.plan.reviews[eventIndex]) reviewLine(data.plan.reviews[eventIndex]);
      panel.appendChild(tip);
      anchor = mark;
      anchor.setAttribute('aria-describedby', panel.id);
      panel.hidden = false;
      if (panel.showPopover) panel.showPopover();
      place();
    }
    function place() {
      if (!anchor) return;
      var rect = anchor.getBoundingClientRect();
      var paper = anchor.closest('.se-paper')?.getBoundingClientRect();
      if (!anchor.isConnected || !rect.width || rect.bottom <= Math.max(0, paper?.top || 0) ||
        rect.top >= Math.min(root.innerHeight, paper?.bottom ?? root.innerHeight) ||
        rect.right <= Math.max(0, paper?.left || 0) || rect.left >= Math.min(root.innerWidth, paper?.right ?? root.innerWidth)) {
        hide();
        return;
      }
      hideTip();
      var width = panel.offsetWidth, height = panel.offsetHeight;
      var left = rect.left + (rect.width - width) / 2;
      var topPosition = rect.top - height - 7;
      if (topPosition < 8) topPosition = Math.min(rect.bottom + 7, root.innerHeight - height - 8);
      panel.style.left = Math.max(8, Math.min(left, root.innerWidth - width - 8)) + 'px';
      panel.style.top = Math.max(8, topPosition) + 'px';
    }
    function markFrom(target) { return target.closest?.('.se-finger-target'); }
    function onEnter(event) {
      var mark = markFrom(event.target);
      if (mark && event.pointerType !== 'touch') show(mark);
    }
    function onLeave(event) {
      if (markFrom(event.target) === anchor && anchor !== document.activeElement) delayHide();
    }
    function delayHide() { clearTimeout(timer); timer = setTimeout(hide, 140); }
    function onFocus(event) { var mark = markFrom(event.target); if (mark) show(mark); }
    function onBlur(event) {
      if (panel.contains(event.relatedTarget)) return; // focus moved onto a technique word
      if (markFrom(event.target) === anchor) delayHide();
    }
    function onClick(event) {
      var term = termFrom(event.target);
      if (term && panel.contains(term)) {
        event.stopPropagation();
        if (term === tipTerm) hideTip(); else showTip(term); // tap toggles on touch screens
        return;
      }
      var mark = markFrom(event.target);
      if (!mark) { if (!panel.contains(event.target)) hide(); return; }
      event.stopPropagation();
      show(mark);
    }
    function onKey(event) {
      if (event.key === 'Escape' && tipTerm) { hideTip(); event.preventDefault(); event.stopPropagation(); }
      else if (event.key === 'Escape' && anchor) { hide(); event.preventDefault(); event.stopPropagation(); }
      else if (fig.contains(event.target) && markFrom(event.target) && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault(); event.stopPropagation(); show(event.target);
      }
    }
    function onScroll(event) { if (!(event.target instanceof Node && panel.contains(event.target))) place(); }
    panel.addEventListener('pointerover', function (event) {
      var term = termFrom(event.target);
      if (term && event.pointerType !== 'touch') showTip(term);
    });
    panel.addEventListener('pointerout', function (event) {
      var term = termFrom(event.target);
      if (term && term === tipTerm && term !== document.activeElement) tipTimer = setTimeout(hideTip, 100);
    });
    panel.addEventListener('focusin', function (event) { var term = termFrom(event.target); if (term) showTip(term); });
    panel.addEventListener('focusout', function (event) { if (termFrom(event.target) === tipTerm) hideTip(); });
    panel.addEventListener('keydown', function (event) {
      var term = termFrom(event.target);
      if (term && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.stopPropagation(); showTip(term); }
    });
    panel.addEventListener('pointerenter', function () { clearTimeout(timer); });
    panel.addEventListener('pointerleave', delayHide);
    fig.addEventListener('pointerover', onEnter);
    fig.addEventListener('pointerout', onLeave);
    fig.addEventListener('focusin', onFocus);
    fig.addEventListener('focusout', onBlur);
    fig.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
    root.addEventListener('scroll', onScroll, true);
    root.addEventListener('resize', hide);
    document.addEventListener('fullscreenchange', hide);
    return { hide: hide, destroy: function () {
      hide();
      panel.remove();
      fig.removeEventListener('pointerover', onEnter);
      fig.removeEventListener('pointerout', onLeave);
      fig.removeEventListener('focusin', onFocus);
      fig.removeEventListener('focusout', onBlur);
      fig.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey, true);
      root.removeEventListener('scroll', onScroll, true);
      root.removeEventListener('resize', hide);
      document.removeEventListener('fullscreenchange', hide);
    } };
  }
  var guideId = 0, hideActiveGuide;

  function install(fig, score, bar, addSettingsHelp) {
    if (!isKeyboard(score) || bar.querySelector('.se-fingering-toggle')) return;
    var enabled = false, reach = 12;
    try {
      enabled = root.localStorage.getItem(STORAGE_KEY) === 'on';
      var savedReach = Number(root.localStorage.getItem(REACH_KEY));
      if ([7, 9, 12].includes(savedReach)) reach = savedReach;
    } catch (e) { /* optional */ }
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'se-toggle se-fingering-toggle';
    var key;
    if (!addSettingsHelp) {
      key = document.createElement('p');
      key.className = 'se-fingering-key';
      key.textContent = KEY_TEXT;
    }
    var reachLabel = document.createElement('label');
    reachLabel.className = 'se-fingering-reach';
    reachLabel.appendChild(document.createTextNode('Comfortable reach '));
    var select = document.createElement('select');
    [[7, 'Fifth'], [9, 'Sixth'], [12, 'Octave']].forEach(function (item) {
      var option = document.createElement('option'); option.value = item[0]; option.textContent = item[1]; select.appendChild(option);
    });
    select.value = String(reach);
    reachLabel.appendChild(select);
    function paint() {
      button.setAttribute('aria-pressed', String(enabled));
      button.classList.toggle('is-on', enabled);
      button.textContent = enabled ? '✓ Finger numbers' : 'Finger numbers';
      if (key) key.hidden = !enabled;
      reachLabel.hidden = !enabled;
    }
    var planned, plannedLayout, plannedReach, byEvent;
    function getPlan() {
      if (plannedLayout !== fig.scoreLayout || plannedReach !== reach) {
        plannedLayout = fig.scoreLayout;
        plannedReach = reach;
        planned = planDetailed(plannedLayout, score, { reach: reach });
        byEvent = new Map();
        var nextByHand = new Map();
        planned.groups.slice().reverse().forEach(function (onset) {
          var next = nextByHand.get(onset.staffIndices);
          onset.events.forEach(function (event) { byEvent.set(event.i, { onset: onset, next: next }); });
          nextByHand.set(onset.staffIndices, onset);
        });
        plannedLayout.events.forEach(function (event) {
          var staff = score.staves[event.staff];
          // A written fingering can also sit on a sustained pitch with no attack.
          if (!event.fingering || byEvent.has(event.i) || !staff || !keyboardStaff(staff)) return;
          var notes = event.pitches.map(function (pitch, pi) {
            return { midi: pitch.midi, entries: [{ ev: event, pi: pi }] };
          }).sort(function (a, b) { return a.midi - b.midi; });
          byEvent.set(event.i, { onset: { hand: handOf(staff), notes: notes } });
        });
      }
      return { plan: planned, byEvent: byEvent };
    }
    var guide = installGuide(fig, getPlan);
    function mark() {
      var svg = fig.querySelector('.se-score');
      if (!fig.scoreLayout || !svg) return;
      guide.hide();
      if (enabled) addMarks(svg, fig.scoreLayout, score, { reach: reach }, getPlan().plan);
      else svg.querySelectorAll('.se-finger-number').forEach(function (n) { n.remove(); });
      svg.querySelectorAll('.se-finger-number, .se-fingering').forEach(function (node) {
        var ev = fig.scoreLayout.events[Number(node.closest('.se-ev').dataset.i)];
        if (!keyboardStaff(score.staves[ev.staff])) return;
        node.classList.add('se-finger-target');
        node.querySelector('title')?.remove();
        var name = node.textContent === '†' ? 'Fingering review' : 'Fingering ' + node.textContent;
        node.setAttribute('aria-label', name + ', show keyboard guide');
        node.setAttribute('role', 'button');
        if (!node.previousElementSibling?.classList.contains('se-finger-target')) node.setAttribute('tabindex', '0');
      });
    }
    button.addEventListener('click', function () {
      enabled = !enabled;
      try { root.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off'); } catch (e) { /* optional */ }
      root.dispatchEvent(new CustomEvent('score-fingering:change', { detail: { enabled: enabled } }));
    });
    select.addEventListener('change', function () {
      reach = Number(select.value);
      try { root.localStorage.setItem(REACH_KEY, String(reach)); } catch (e) { /* optional */ }
      root.dispatchEvent(new CustomEvent('score-fingering:change', { detail: { enabled: enabled, reach: reach } }));
    });
    // Other scores on the page follow the shared settings.
    function onChange(e) {
      enabled = e.detail.enabled;
      if ([7, 9, 12].includes(e.detail.reach)) reach = e.detail.reach;
      select.value = String(reach); paint();
      if (e.detail.reach || !enabled) mark();
    }
    root.addEventListener('score-fingering:change', onChange);
    fig.addEventListener('score:draw', mark);
    fig.addEventListener('score:hide-notation', guide.hide);
    fig.addEventListener('score:notation-window', mark);
    // The engine's print button asks for this so numbers reach the paper too.
    fig.scoreFingeringPrint = function () {
      return enabled ? { decorate: function (svg, layout) { addMarks(svg, layout, score, { reach: reach }); },
        note: PRINT_TEXT + ' Comfortable reach: ' + (reach === 7 ? 'fifth' : reach === 9 ? 'sixth' : 'octave') + '.',
        // The one-line key printed in the score's title block.
        legend: 'Fingers: 1 thumb · 2 index · 3 middle · 4 ring · 5 little · chords read top to bottom · † ask your teacher' } : {};
    };
    bar.appendChild(addSettingsHelp ? addSettingsHelp(button, 'Piano fingering help',
      '1 thumb · 2 index · 3 middle · 4 ring · 5 little finger. Read chords from top to bottom. Select an on-score number for the keyboard guide. † means ask your teacher. Set Comfortable reach to the interval your hand can span without stretching.') : button);
    bar.appendChild(reachLabel);
    if (key) bar.appendChild(key);
    paint(); mark();
    return function () {
      guide.destroy();
      root.removeEventListener('score-fingering:change', onChange);
      fig.removeEventListener('score:draw', mark);
      fig.removeEventListener('score:hide-notation', guide.hide);
      fig.removeEventListener('score:notation-window', mark);
      delete fig.scoreFingeringPrint;
    };
  }

  root.ScoreFingering = { techniques: TECHNIQUES, techniqueSegments: techniqueSegments, plan: plan, planDetailed: planDetailed, addMarks: addMarks, install: install, isKeyboard: isKeyboard, handOf: handOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.ScoreFingering;
})(typeof window !== 'undefined' ? window : globalThis);
