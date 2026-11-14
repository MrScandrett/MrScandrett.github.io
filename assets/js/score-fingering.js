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
  var SKIP = { 'mozart-turkish-march': true };   // has its own overlay (mozart-fingering.js)
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
    if (!staves.length || SKIP[score.id]) return false;
    var named = staves.some(function (s) { return s.instrument === 'piano'; });
    var hands = staves.every(function (s) { return !s.instrument && /(left|right) hand/i.test(s.label || ''); });
    return named || hands;
  }

  function fingerRun(events, hand) {
    var dir = hand === 'right' ? 1 : -1;
    var states = events.map(function () { return []; });
    for (var f = 1; f <= 5; f++) states[0][f] = { cost: f === 3 ? 0.5 : Math.abs(f - 3) * 0.22, prev: 0 };
    for (var i = 1; i < events.length; i++) {
      var pitch = events[i].midi, semitones = pitch - events[i - 1].midi;
      for (var next = 1; next <= 5; next++) {
        var best = null;
        for (var prior = 1; prior <= 5; prior++) {
          var move = (next - prior) * dir, cost = states[i - 1][prior].cost;
          if (semitones === 0) cost += next === prior ? 0 : 1.8;
          else {
            if (next === prior) cost += 4;
            cost += Math.abs(Math.abs(semitones) - Math.abs(move) * 1.7) * 0.26;
            if (Math.sign(semitones) !== Math.sign(move)) {
              cost += (prior === 1 || next === 1) && Math.abs(semitones) <= 5 ? 0.7 : 4.5;
            }
            if (Math.abs(move) > 3 && Math.abs(semitones) < 5) cost += 1.2;
          }
          if (BLACK[((pitch % 12) + 12) % 12] && next === 1) cost += 0.9;
          if (!best || cost < best.cost) best = { cost: cost, prev: prior };
        }
        states[i][next] = best;
      }
    }
    var last = 1, end = events.length - 1;
    for (var k = 2; k <= 5; k++) if (states[end][k].cost < states[end][last].cost) last = k;
    var out = new Array(events.length);
    for (var at = end; at >= 0; at--) { out[at] = last; last = states[at][last].prev || last; }
    return out;
  }

  function plan(layout, score) {
    var result = {};
    (score.staves || []).forEach(function (staff, si) {
      var hand = handOf(staff);
      // Everything sounding together on this staff (any voice) is one group.
      var groups = {}, order = [];
      layout.events.forEach(function (ev) {
        if (ev.staff !== si || ev.kind !== 'note' || ev.hidden || ev.grace || ev.tieFrom || !ev.pitches) return;
        var key = ev.bar + ':' + ev.start;
        if (!groups[key]) { groups[key] = []; order.push(key); }
        ev.pitches.forEach(function (p, pi) { groups[key].push({ ev: ev, pi: pi, midi: p.midi }); });
      });
      order.sort(function (a, b) {
        var x = a.split(':'), y = b.split(':');
        return (x[0] - y[0]) || (x[1] - y[1]);
      });
      var run = [];
      function put(entry, finger) { (result[entry.ev.i] = result[entry.ev.i] || [])[entry.pi] = finger; }
      function flush() {
        if (!run.length) return;
        var fingers = fingerRun(run, hand);
        run.forEach(function (entry, i) { put(entry, fingers[i]); });
        run = [];
      }
      order.forEach(function (key) {
        var group = groups[key].slice().sort(function (a, b) { return a.midi - b.midi; });
        if (group.length === 1) {
          // A big leap means the hand moves: start a fresh run so costs don't span it.
          if (run.length && Math.abs(group[0].midi - run[run.length - 1].midi) > 7) flush();
          run.push(group[0]);
          return;
        }
        flush();
        if (group.length > 5) return;
        var spread = group.length === 2 ? [1, 5] : group.length === 3 ? [1, 3, 5] : group.length === 4 ? [1, 2, 3, 5] : [1, 2, 3, 4, 5];
        if (hand === 'left') spread = spread.slice().reverse();
        group.forEach(function (entry, i) { put(entry, spread[i]); });
      });
      flush();
    });
    return result;
  }

  function addMarks(svg, layout, score) {
    svg.querySelectorAll('.se-finger-number').forEach(function (n) { n.remove(); });
    var fingers = plan(layout, score);
    layout.events.forEach(function (ev) {
      if (!fingers[ev.i] || !ev.steps || ev.tieFrom) return;
      var group = svg.querySelector('.se-ev[data-i="' + ev.i + '"]');
      if (!group) return;
      var above = handOf(score.staves[ev.staff]) === 'right';
      if (ev.fingering) return; // An editor's explicit fingering takes precedence.
      var S = layout.S, h = S / 2;
      // One label per chord, in pitch order, outside nearby heads, stems and tuplets.
      // Looking at neighbours also protects notes in another voice on this staff.
      var near = layout.events.filter(function (other) {
        return other.sys === ev.sys && other.staff === ev.staff && !other.hidden &&
          other.kind === 'note' && Math.abs(other.x - ev.x) < 3 * S;
      });
      var edge = above ? ev.bottom - 4 * S : ev.bottom;
      near.forEach(function (other) {
        var head = other.bottom - (above ? other.hi : other.lo) * h;
        var tip = other.tipY == null ? head : other.tipY;
        var pad = other.tuplet ? 3.2 * S : 1.8 * S;
        edge = above ? Math.min(edge, head - pad, tip - pad) : Math.max(edge, head + pad, tip + pad);
      });
      var text = document.createElementNS(NS, 'text');
      text.setAttribute('class', 'se-finger-number');
      text.setAttribute('x', ev.x + (ev.headW || S) * 0.5);
      text.setAttribute('y', edge + (above ? 0 : 0.7 * S));
      text.setAttribute('font-size', 1.08 * S);
      text.setAttribute('text-anchor', 'middle');
      text.textContent = fingers[ev.i].filter(Boolean).join('/');
      group.appendChild(text);
    });
  }

  function install(fig, score, bar) {
    if (!isKeyboard(score) || bar.querySelector('.se-fingering-toggle')) return;
    var enabled = false;
    try { enabled = root.localStorage.getItem(STORAGE_KEY) === 'on'; } catch (e) { /* optional */ }
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'se-toggle se-fingering-toggle';
    var key = document.createElement('p');
    key.className = 'se-fingering-key';
    key.textContent = 'Suggested piano fingering: 1 thumb · 2 index · 3 middle · 4 ring · 5 little finger. Adjust with your teacher for your hand.';
    function paint() {
      button.setAttribute('aria-pressed', String(enabled));
      button.classList.toggle('is-on', enabled);
      button.textContent = enabled ? '✓ Finger numbers' : 'Finger numbers';
      key.hidden = !enabled;
    }
    function mark() {
      var svg = fig.querySelector('.se-score');
      if (!fig.scoreLayout || !svg) return;
      if (enabled) addMarks(svg, fig.scoreLayout, score);
      else svg.querySelectorAll('.se-finger-number').forEach(function (n) { n.remove(); });
    }
    button.addEventListener('click', function () {
      enabled = !enabled;
      try { root.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off'); } catch (e) { /* optional */ }
      paint(); mark();
      root.dispatchEvent(new CustomEvent('score-fingering:change', { detail: { enabled: enabled } }));
    });
    // Another score on the page (or another tab) flipped it: follow.
    root.addEventListener('score-fingering:change', function (e) { if (e.detail.enabled !== enabled) { enabled = e.detail.enabled; paint(); mark(); } });
    fig.addEventListener('score:draw', mark);
    // The engine's print button asks for this so numbers reach the paper too.
    fig.scoreFingeringPrint = function () {
      return enabled ? { decorate: function (svg, layout) { addMarks(svg, layout, score); },
        note: 'Suggested fingering: 1 thumb · 2 index · 3 middle · 4 ring · 5 little finger.' } : {};
    };
    bar.appendChild(button);
    bar.insertAdjacentElement('afterend', key);
    paint(); mark();
  }

  root.ScoreFingering = { plan: plan, install: install, isKeyboard: isKeyboard, handOf: handOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.ScoreFingering;
})(typeof window !== 'undefined' ? window : globalThis);
