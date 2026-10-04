/* pixel-pathway.js — page behaviour for the 2D Game Developer Pathway:
   progress (10 lessons), practice questions, definition-of-done checklists, copy buttons,
   plus the shared widgets the labs build on (PixelPathway.mountGame / slider / toggle). */
(function (global) {
  'use strict';
  var KEY = 'classroomos-2d-pathway';
  var TOTAL = 10;
  function getProgress() { try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function saveProgress(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }

  function refresh() {
    var done = getProgress();
    document.querySelectorAll('[data-lesson-card]').forEach(function (card) { card.classList.toggle('is-complete', done.indexOf(card.dataset.lessonCard) !== -1); });
    document.querySelectorAll('[data-complete-lesson]').forEach(function (b) {
      var complete = done.indexOf(b.dataset.completeLesson) !== -1;
      b.classList.toggle('is-done', complete); b.textContent = complete ? 'Completed ✓' : 'Mark lesson complete';
    });
    var bar = document.querySelector('[data-course-progress]');
    if (bar) { bar.style.width = (done.length / TOTAL * 100) + '%'; bar.parentElement.setAttribute('aria-valuenow', String(done.length)); }
    var label = document.querySelector('[data-progress-label]');
    if (label) label.textContent = done.length + ' of ' + TOTAL + ' lessons complete';
  }

  document.querySelectorAll('[data-complete-lesson]').forEach(function (b) {
    b.addEventListener('click', function () {
      var done = getProgress(); var id = b.dataset.completeLesson;
      if (done.indexOf(id) === -1) {
        var section = b.closest('.px-section');
        var checks = section ? Array.prototype.slice.call(section.querySelectorAll('.px-checklist input')) : [];
        var missing = checks.filter(function (i) { return !i.checked; });
        if (missing.length) {
          var status = section.querySelector('[data-check-status]');
          if (status) status.textContent = 'Check every definition-of-done item before completing the lesson.';
          missing[0].focus(); return;
        }
        done.push(id);
      } else done = done.filter(function (x) { return x !== id; });
      saveProgress(done); refresh();
    });
  });
  document.querySelectorAll('.px-checklist input').forEach(function (input) {
    input.addEventListener('change', function () {
      var wrap = input.closest('.px-checklist'); var status = wrap.parentElement.querySelector('[data-check-status]');
      if (status) status.textContent = wrap.querySelectorAll('input:checked').length + '/' + wrap.querySelectorAll('input').length + ' checked';
    });
  });
  document.querySelectorAll('.px-code').forEach(function (block) {
    var b = block.querySelector('.px-code-head button'); if (!b) return;
    b.addEventListener('click', function () {
      var text = block.querySelector('code').textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { b.textContent = 'Copied'; }, function () { b.textContent = 'Select the code'; });
      setTimeout(function () { b.textContent = 'Copy'; }, 1600);
    });
  });
  document.querySelectorAll('[data-question]').forEach(function (q) {
    var result = q.querySelector('.px-practice-result');
    q.querySelectorAll('button[data-answer]').forEach(function (b) {
      b.addEventListener('click', function () {
        q.querySelectorAll('button[data-answer]').forEach(function (x) { x.classList.remove('is-correct', 'is-wrong'); });
        var ok = b.dataset.answer === 'correct'; b.classList.add(ok ? 'is-correct' : 'is-wrong');
        if (result) result.textContent = ok ? q.dataset.correct : q.dataset.retry;
      });
    });
  });

  /* ── Shared widgets ── */
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  // A playable Pixel Courier canvas with a focus hint and touch buttons.
  function mountGame(host, options) {
    var wrap = el('div', 'px-game');
    var canvas = el('canvas'); canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', (options && options.label) || 'Pixel Courier game. Arrow keys or A and D move, Space jumps. Collect every parcel, then reach the mailbox.');
    wrap.appendChild(canvas);
    var hint = el('span', 'px-game-hint', 'Click the game, then use ← → and Space'); hint.setAttribute('aria-hidden', 'true');
    wrap.appendChild(hint);
    host.appendChild(wrap);
    var touch = el('div', 'px-touch');
    var game = global.PixelCourier.createGame(canvas, options);
    [['left', '◀'], ['right', '▶'], ['jump', 'Jump']].forEach(function (pair) {
      var b = el('button', null, pair[1]); b.type = 'button'; b.setAttribute('aria-label', pair[0]);
      var on = function (e) { e.preventDefault(); game.press(pair[0], true); }, off = function (e) { e.preventDefault(); game.press(pair[0], false); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
      touch.appendChild(b);
    });
    host.appendChild(touch);
    canvas.addEventListener('pointerdown', function () { canvas.focus({ preventScroll: true }); });
    game.canvas = canvas;
    return game;
  }

  var uid = 0;
  function slider(parent, label, min, max, step, value, onInput, format) {
    var id = 'pxs-' + (++uid);
    var wrap = el('label', 'px-slider'); wrap.htmlFor = id;
    wrap.appendChild(el('span', null, label));
    var out = el('output'); wrap.appendChild(out);
    var input = el('input'); input.type = 'range'; input.id = id; input.min = min; input.max = max; input.step = step; input.value = value;
    wrap.appendChild(input);
    function show() { out.textContent = format ? format(Number(input.value)) : input.value; }
    input.addEventListener('input', function () { show(); onInput(Number(input.value)); });
    show(); parent.appendChild(wrap);
    return { input: input, set: function (v) { input.value = v; show(); onInput(Number(v)); }, quiet: function (v) { input.value = v; show(); } };
  }
  function toggle(parent, label, checked, onChange) {
    var wrap = el('label', 'px-toggle'); var input = el('input'); input.type = 'checkbox'; input.checked = !!checked;
    wrap.appendChild(input); wrap.appendChild(el('span', null, label));
    input.addEventListener('change', function () { onChange(input.checked); });
    parent.appendChild(wrap); return input;
  }
  function fieldset(parent, legend) { var f = el('fieldset'); f.appendChild(el('legend', null, legend)); parent.appendChild(f); return f; }
  function buttons(parent, list, onPick, pressedIndex) {
    var row = el('div', 'px-btn-row');
    var made = list.map(function (item, i) {
      var b = el('button', null, item.label || item); b.type = 'button';
      if (pressedIndex != null) b.setAttribute('aria-pressed', String(i === pressedIndex));
      b.addEventListener('click', function () {
        if (pressedIndex != null) made.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        onPick(item, i, b);
      });
      row.appendChild(b); return b;
    });
    parent.appendChild(row); return made;
  }

  global.PixelPathway = { el: el, mountGame: mountGame, slider: slider, toggle: toggle, fieldset: fieldset, buttons: buttons, refresh: refresh };
  refresh();
}(window));
