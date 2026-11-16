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
  var KEY_TEXT = 'Suggested piano fingering: 1 thumb · 2 index · 3 middle · 4 ring · 5 little finger. Chord numbers read from top note to bottom note. † = plan with your teacher: a wide reach, held voice, ornament or hand redistribution needs individual fingering. Never stretch to reach a number. Your teacher should adapt these generated suggestions for your hand and phrasing.';
  var PRINT_TEXT = 'Generated fingering suggestions: 1 thumb · 2 index · 3 middle · 4 ring · 5 little finger. Chord numbers read from highest note to lowest. † = teacher review for reach, held voices, ornaments or hand distribution. Adapt for your hand and phrasing; never force a stretch.';
  var EPS = 1e-5;
  function isBlack(midi) { return !!BLACK[((midi % 12) + 12) % 12]; }

  // Conservative teaching limits, in semitones, rather than anatomical claims.
  // Adjacent long fingers must not be asked to span a sixth; an octave needs 1–5.
  var LIMIT = { '12': 5, '13': 7, '14': 9, '15': 12, '23': 3, '24': 5, '25': 7, '34': 3, '35': 5, '45': 3 };
  var OFF = [0, 0, 2, 4, 5, 7];
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

  function transition(before, a, after, b, hand, reach) {
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
        if (!distance) c = pf === nf ? 0 : 1.8;
        else if (move && Math.sign(move) === Math.sign(semis)) {
          c = Math.abs(distance - Math.abs(OFF[nf] - OFF[pf])) * 0.32;
          if (distance <= 2 && Math.abs(move) > 1) c += 0.6;
          if (distance > pairLimit(pf, nf, reach)) c += (distance - pairLimit(pf, nf, reach)) * 0.5;
        } else {
          // In scalar motion only the thumb passes under / is crossed over.
          var crossing = distance <= 4 && ((semis > 0 && nf === 1 && pf > 1 && pf < 5) ||
            (semis < 0 && pf === 1 && nf > 1 && nf < 5));
          c = crossing ? 1.3 + (isBlack(nf === 1 ? n.midi : p.midi) ? 1.5 : 0) : 7 + Math.min(distance, 12) * 0.12;
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
          var best = Infinity, prev = 0;
          if (!before) best = choice.local;
          else before.states.forEach(function (state, i) {
            var c = state.cost + choice.local + transition(before, state, group, choice, hand, reach);
            if (c < best) { best = c; prev = i; }
          });
          return { fingers: choice.fingers, cost: best, prev: prev };
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
      var ev = events[0], group = svg.querySelector('.se-ev[data-i="' + ev.i + '"]');
      if (!group) return;
      var above = onset.hand === 'right', S = layout.S, h = S / 2;
      var edge = above ? ev.bottom - 4 * S : ev.bottom;
      (byStaffLine.get(staffLine(ev)) || []).forEach(function (other) {
        if (Math.abs(other.x - ev.x) >= 3 * S) return;
        var head = other.bottom - (above ? other.hi : other.lo) * h;
        var tip = other.tipY == null ? head : other.tipY;
        var pad = other.tuplet ? 3.2 * S : 1.8 * S;
        edge = above ? Math.min(edge, head - pad, tip - pad) : Math.max(edge, head + pad, tip + pad);
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

  function install(fig, score, bar) {
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
    var key = document.createElement('p');
    key.className = 'se-fingering-key';
    key.textContent = KEY_TEXT;
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
      key.hidden = !enabled;
      reachLabel.hidden = !enabled;
    }
    var planned, plannedLayout, plannedReach;
    function mark() {
      var svg = fig.querySelector('.se-score');
      if (!fig.scoreLayout || !svg) return;
      if (enabled) {
        if (plannedLayout !== fig.scoreLayout || plannedReach !== reach) {
          plannedLayout = fig.scoreLayout;
          plannedReach = reach;
          planned = planDetailed(plannedLayout, score, { reach: reach });
        }
        addMarks(svg, fig.scoreLayout, score, { reach: reach }, planned);
      }
      else svg.querySelectorAll('.se-finger-number').forEach(function (n) { n.remove(); });
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
    fig.addEventListener('score:notation-window', mark);
    // The engine's print button asks for this so numbers reach the paper too.
    fig.scoreFingeringPrint = function () {
      return enabled ? { decorate: function (svg, layout) { addMarks(svg, layout, score, { reach: reach }); },
        note: PRINT_TEXT + ' Comfortable reach: ' + (reach === 7 ? 'fifth' : reach === 9 ? 'sixth' : 'octave') + '.' } : {};
    };
    bar.appendChild(button);
    bar.appendChild(reachLabel);
    bar.appendChild(key);
    paint(); mark();
    return function () {
      root.removeEventListener('score-fingering:change', onChange);
      fig.removeEventListener('score:draw', mark);
      fig.removeEventListener('score:notation-window', mark);
      delete fig.scoreFingeringPrint;
    };
  }

  root.ScoreFingering = { plan: plan, planDetailed: planDetailed, addMarks: addMarks, install: install, isKeyboard: isKeyboard, handOf: handOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.ScoreFingering;
})(typeof window !== 'undefined' ? window : globalThis);
