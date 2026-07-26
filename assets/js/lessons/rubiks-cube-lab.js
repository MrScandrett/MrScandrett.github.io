/**
 * rubiks-cube-lab.js — the interactive half of the Rubik's Cube lesson.
 * ClassroomOS · Mr. Scandrett's STEAM Lessons
 *
 * Three pieces that all share one 54-square state:
 *   · a paintable unfolded net, for typing in the cube on your desk
 *   · a Three.js cube that mirrors it and animates every turn
 *   · a step-by-step player for the solution the solver hands back
 *
 * Requires rubiks-cube-solver.js and Three.js (r128) to be loaded first.
 */
(function () {
  'use strict';

  var Cube = window.RubiksCube;
  if (!Cube || typeof THREE === 'undefined') return;
  var root = document.getElementById('rc-lab');
  if (!root) return;

  var FACES = ['U', 'R', 'F', 'D', 'L', 'B'];
  var BASE = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 };
  var COLORS = ['W', 'Y', 'G', 'B', 'O', 'R'];

  var FACE_INFO = {
    U: { name: 'top', colour: 'yellow', where: 'pointing at the ceiling' },
    D: { name: 'bottom', colour: 'white', where: 'resting on the table' },
    F: { name: 'front', colour: 'green', where: 'pointing at you' },
    B: { name: 'back', colour: 'blue', where: 'pointing away from you' },
    R: { name: 'right', colour: 'orange', where: 'on your right hand' },
    L: { name: 'left', colour: 'red', where: 'on your left hand' }
  };

  var $ = function (id) { return document.getElementById(id); };

  /* ══ State ═══════════════════════════════════════════════════════════ */

  var state = {
    facelets: new Array(54).fill(null),  /* face letters, null = not filled in */
    brush: 'W',
    cursor: 0,
    painting: false,
    solution: null,     /* { stages, moves } */
    meta: [],           /* per-move stage/step info */
    startFacelets: null,
    pos: 0,
    playing: false,
    busy: false,
    speed: 900
  };

  /* Centres never move, so they are fixed and not editable. */
  function resetToBlank() {
    state.facelets = new Array(54).fill(null);
    FACES.forEach(function (f) { state.facelets[BASE[f] + 4] = f; });
  }

  /* The order the cursor walks: face by face, skipping the fixed centres. */
  var FILL_ORDER = (function () {
    var order = [];
    ['U', 'L', 'F', 'R', 'B', 'D'].forEach(function (f) {
      for (var i = 0; i < 9; i++) if (i !== 4) order.push(BASE[f] + i);
    });
    return order;
  }());

  /* ══ 3D cube ═════════════════════════════════════════════════════════ */

  var view = (function () {
    var canvas = $('rc-canvas');
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0b0118, 1);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(4.4, 3.6, 5.4);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.72));
    var key = new THREE.DirectionalLight(0xffffff, 0.72);
    key.position.set(5, 8, 6);
    scene.add(key);
    var fill = new THREE.DirectionalLight(0xa78bfa, 0.34);
    fill.position.set(-6, -3, -5);
    scene.add(fill);

    var cubeRoot = new THREE.Group();
    scene.add(cubeRoot);
    cubeRoot.rotation.set(0.36, -0.62, 0);

    var GAP = 1.045;
    var BLANK = 0x2a2340;
    var CORE = 0x121018;
    /* BoxGeometry material order: +X, -X, +Y, -Y, +Z, -Z */
    var SLOT_FACE = ['R', 'L', 'U', 'D', 'F', 'B'];
    var SLOT_AXIS = [0, 0, 1, 1, 2, 2];
    var SLOT_SIGN = [1, -1, 1, -1, 1, -1];

    var cubelets = [];
    for (var xi = -1; xi <= 1; xi++) {
      for (var yi = -1; yi <= 1; yi++) {
        for (var zi = -1; zi <= 1; zi++) {
          var mats = [];
          for (var s = 0; s < 6; s++) {
            mats.push(new THREE.MeshLambertMaterial({ color: CORE }));
          }
          var mesh = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.94, 0.94), mats);
          mesh.userData.home = [xi, yi, zi];
          mesh.position.set(xi * GAP, yi * GAP, zi * GAP);
          cubeRoot.add(mesh);
          cubelets.push(mesh);
        }
      }
    }

    function setFacelets(fac) {
      for (var i = 0; i < cubelets.length; i++) {
        var mesh = cubelets[i], home = mesh.userData.home;
        mesh.position.set(home[0] * GAP, home[1] * GAP, home[2] * GAP);
        mesh.rotation.set(0, 0, 0);
        for (var s = 0; s < 6; s++) {
          var outward = home[SLOT_AXIS[s]] === SLOT_SIGN[s];
          var hex = CORE;
          if (outward) {
            var f = fac[Cube.faceletIndex(SLOT_FACE[s], home[0], home[1], home[2])];
            hex = f ? Cube.COLOR_HEX[Cube.SCHEME[f]] : BLANK;
          }
          mesh.material[s].color.setHex(hex);
        }
      }
    }

    var TURN = {
      U: { axis: 'y', layer: 1, angle: -Math.PI / 2 },
      D: { axis: 'y', layer: -1, angle: Math.PI / 2 },
      R: { axis: 'x', layer: 1, angle: -Math.PI / 2 },
      L: { axis: 'x', layer: -1, angle: Math.PI / 2 },
      F: { axis: 'z', layer: 1, angle: -Math.PI / 2 },
      B: { axis: 'z', layer: -1, angle: Math.PI / 2 }
    };
    var AXIS_SLOT = { x: 0, y: 1, z: 2 };

    /* Spin one layer, then hand back to setFacelets to snap things straight. */
    function animateMove(move, ms, done) {
      var face = move.charAt(0), mod = move.slice(1);
      var def = TURN[face];
      if (!def) { done(); return; }
      var angle = def.angle * (mod === '2' ? 2 : 1) * (mod === "'" ? -1 : 1);

      var pivot = new THREE.Group();
      cubeRoot.add(pivot);
      var slot = AXIS_SLOT[def.axis];
      cubelets.forEach(function (m) {
        if (m.userData.home[slot] === def.layer) pivot.attach(m);
      });

      var start = performance.now();
      (function tick(now) {
        var t = Math.min((now - start) / ms, 1);
        var e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        pivot.rotation[def.axis] = angle * e;
        if (t < 1) { requestAnimationFrame(tick); return; }
        cubelets.forEach(function (m) { if (m.parent === pivot) cubeRoot.attach(m); });
        cubeRoot.remove(pivot);
        done();
      }(start));
    }

    function resize() {
      var wrap = canvas.parentElement;
      var w = wrap.clientWidth;
      var h = Math.max(240, Math.min(400, Math.round(w * 0.78)));
      renderer.setSize(w, h, false);
      canvas.style.height = h + 'px';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);

    (function loop() {
      requestAnimationFrame(loop);
      renderer.render(scene, camera);
    }());

    /* Drag to look around. */
    var drag = false, prev = { x: 0, y: 0 };
    function down(e) {
      drag = true;
      var p = e.touches ? e.touches[0] : e;
      prev = { x: p.clientX, y: p.clientY };
    }
    function move(e) {
      if (!drag) return;
      var p = e.touches ? e.touches[0] : e;
      cubeRoot.rotation.y += (p.clientX - prev.x) * 0.011;
      cubeRoot.rotation.x += (p.clientY - prev.y) * 0.011;
      cubeRoot.rotation.x = Math.max(-1.2, Math.min(1.2, cubeRoot.rotation.x));
      prev = { x: p.clientX, y: p.clientY };
    }
    function up() { drag = false; }
    canvas.addEventListener('mousedown', down);
    canvas.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);

    function home() { cubeRoot.rotation.set(0.36, -0.62, 0); }

    return { setFacelets: setFacelets, animateMove: animateMove, resize: resize, home: home };
  }());

  /* ══ The net ═════════════════════════════════════════════════════════ */

  var cells = new Array(54);

  function buildNet() {
    var net = $('rc-net');
    [
      { f: 'U', label: 'Top', hint: 'yellow centre' },
      { f: 'L', label: 'Left', hint: 'red centre' },
      { f: 'F', label: 'Front', hint: 'green centre' },
      { f: 'R', label: 'Right', hint: 'orange centre' },
      { f: 'B', label: 'Back', hint: 'blue centre' },
      { f: 'D', label: 'Bottom', hint: 'white centre' }
    ].forEach(function (spec) {
      var box = document.createElement('div');
      box.className = 'rc-net-face rc-net-' + spec.f;
      var cap = document.createElement('span');
      cap.className = 'rc-net-label';
      cap.textContent = spec.label;
      box.appendChild(cap);
      var grid = document.createElement('div');
      grid.className = 'rc-net-grid';
      grid.setAttribute('role', 'group');
      grid.setAttribute('aria-label', spec.label + ' face, ' + spec.hint);
      for (var i = 0; i < 9; i++) {
        var idx = BASE[spec.f] + i;
        var cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'rc-cell';
        cell.dataset.index = idx;
        cell.tabIndex = -1;
        if (i === 4) {
          cell.classList.add('is-centre');
          cell.disabled = true;
          cell.setAttribute('aria-label', spec.label + ' centre — always ' +
            Cube.COLOR_NAME[Cube.SCHEME[spec.f]]);
        }
        grid.appendChild(cell);
        cells[idx] = cell;
      }
      box.appendChild(grid);
      net.appendChild(box);
    });

    net.addEventListener('pointerdown', function (e) {
      var cell = e.target.closest('.rc-cell');
      if (!cell || cell.disabled) return;
      e.preventDefault();
      state.painting = true;
      try { net.setPointerCapture(e.pointerId); } catch (err) { /* synthetic event */ }
      paint(+cell.dataset.index);
      /* Keep focus in the grid so you can carry on with the keyboard. */
      focusCursor();
    });
    net.addEventListener('pointermove', function (e) {
      if (!state.painting) return;
      var el = document.elementFromPoint(e.clientX, e.clientY);
      var cell = el && el.closest ? el.closest('.rc-cell') : null;
      if (cell && !cell.disabled) paint(+cell.dataset.index, true);
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
      net.addEventListener(ev, function () { state.painting = false; });
    });

    net.addEventListener('keydown', function (e) {
      var cell = e.target.closest('.rc-cell');
      if (!cell) return;
      var letter = e.key.toUpperCase();
      if (COLORS.indexOf(letter) >= 0) {
        e.preventDefault();
        setBrush(letter);
        paint(+cell.dataset.index);
        focusCursor();
        return;
      }
      if (e.key === 'Backspace') {
        /* Step back over the square you just filled and rub it out. */
        e.preventDefault();
        state.cursor = Math.max(0, state.cursor - 1);
        state.facelets[FILL_ORDER[state.cursor]] = null;
        afterEdit();
        focusCursor();
        return;
      }
      if (e.key === 'Delete') {
        e.preventDefault();
        state.facelets[+cell.dataset.index] = null;
        afterEdit();
        return;
      }
      var at = FILL_ORDER.indexOf(+cell.dataset.index);
      if (at < 0) return;
      var step = { ArrowRight: 1, ArrowDown: 3, ArrowLeft: -1, ArrowUp: -3 }[e.key];
      if (step === undefined) return;
      e.preventDefault();
      moveCursor(at + step);
    });
  }

  function moveCursor(at) {
    state.cursor = Math.max(0, Math.min(FILL_ORDER.length - 1, at));
    renderCursor();
    cells[FILL_ORDER[state.cursor]].focus();
  }

  function focusCursor() {
    var cell = cells[FILL_ORDER[state.cursor]];
    if (cell) cell.focus({ preventScroll: true });
  }

  function setBrush(colour) {
    state.brush = colour;
    root.querySelectorAll('.rc-swatch').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.colour === colour));
    });
  }

  function paint(index, dragging) {
    if (state.solution) exitSolution();
    state.facelets[index] = Cube.FACE_OF_COLOR[state.brush];
    var at = FILL_ORDER.indexOf(index);
    if (!dragging && at >= 0 && at < FILL_ORDER.length - 1) state.cursor = at + 1;
    afterEdit();
  }

  function renderCursor() {
    for (var i = 0; i < 54; i++) {
      if (!cells[i]) continue;
      cells[i].tabIndex = -1;
      cells[i].classList.remove('is-cursor');
    }
    var target = cells[FILL_ORDER[state.cursor]];
    if (target) { target.tabIndex = 0; target.classList.add('is-cursor'); }
  }

  /* ══ Rendering ═══════════════════════════════════════════════════════ */

  function renderNet() {
    for (var i = 0; i < 54; i++) {
      var cell = cells[i];
      if (!cell) continue;
      var f = state.facelets[i];
      var colour = f ? Cube.SCHEME[f] : null;
      cell.dataset.colour = colour || '';
      cell.classList.toggle('is-blank', !colour);
      var faceLabel = FACE_INFO[FACES.filter(function (x) { return i >= BASE[x] && i < BASE[x] + 9; })[0]];
      if (!cell.disabled) {
        cell.setAttribute('aria-label', faceLabel.name + ' face, square ' + ((i % 9) + 1) +
          ' of 9 — ' + (colour ? Cube.COLOR_NAME[colour] : 'empty'));
      }
    }
    renderCursor();
  }

  function renderCounts() {
    var counts = {};
    COLORS.forEach(function (c) { counts[c] = 0; });
    state.facelets.forEach(function (f) { if (f) counts[Cube.SCHEME[f]]++; });
    COLORS.forEach(function (c) {
      var el = $('rc-count-' + c);
      if (!el) return;
      el.textContent = counts[c] + '/9';
      el.parentElement.classList.toggle('is-over', counts[c] > 9);
      el.parentElement.classList.toggle('is-done', counts[c] === 9);
    });
    return counts;
  }

  function filledCount() {
    return state.facelets.filter(function (f) { return !!f; }).length;
  }

  function renderStatus() {
    var box = $('rc-status');
    var filled = filledCount();
    var solveBtn = $('rc-solve');
    if (filled < 54) {
      box.className = 'rc-status is-waiting';
      box.textContent = 'Filled in ' + filled + ' of 54 squares — ' + (54 - filled) + ' to go.';
      solveBtn.disabled = true;
      return false;
    }
    var check = Cube.validate(state.facelets);
    if (!check.ok) {
      box.className = 'rc-status is-bad';
      box.textContent = check.errors[0];
      solveBtn.disabled = true;
      return false;
    }
    if (Cube.isSolved(state.facelets)) {
      box.className = 'rc-status is-good';
      box.textContent = 'That cube is already solved. Nothing left to do!';
      solveBtn.disabled = true;
      return true;
    }
    box.className = 'rc-status is-good';
    box.textContent = 'That is a real, solvable cube. Press Solve it.';
    solveBtn.disabled = false;
    return true;
  }

  function afterEdit() {
    renderNet();
    renderCounts();
    renderStatus();
    view.setFacelets(state.facelets);
    setMoveButtonsEnabled(filledCount() === 54 && Cube.validate(state.facelets).ok);
  }

  function setMoveButtonsEnabled(on) {
    root.querySelectorAll('.rc-move-btn').forEach(function (b) { b.disabled = !on; });
  }

  /* ══ Move descriptions ═══════════════════════════════════════════════ */

  function moveText(move) {
    var f = move.charAt(0), mod = move.slice(1);
    var info = FACE_INFO[f];
    var turn = mod === '2' ? 'a half turn (180°)'
      : mod === "'" ? 'a quarter turn anticlockwise'
        : 'a quarter turn clockwise';
    var tail = mod === '2' ? 'Direction does not matter for a half turn.'
      : 'Clockwise means clockwise as you look straight at that face.';
    return {
      title: 'Turn the ' + info.name + ' face — the ' + info.colour + ' side, ' + info.where + ' — ' + turn + '.',
      tail: tail,
      glyph: mod === '2' ? '180°' : mod === "'" ? '↺' : '↻'
    };
  }

  /* ══ Solving ═════════════════════════════════════════════════════════ */

  function solve() {
    var result = Cube.solve(state.facelets);
    if (!result.ok) {
      var box = $('rc-status');
      box.className = 'rc-status is-bad';
      box.textContent = result.errors[0];
      return;
    }
    state.solution = result;
    state.startFacelets = state.facelets.slice();
    state.pos = 0;
    state.meta = [];
    result.stages.forEach(function (stage, si) {
      stage.startIndex = state.meta.length;
      stage.steps.forEach(function (step, pi) {
        step.startIndex = state.meta.length;
        step.moves.forEach(function (m, mi) {
          state.meta.push({
            move: m, stage: si, step: pi,
            stageTitle: stage.title, stepLabel: step.label,
            detail: step.detail, algMoves: step.moves, algAt: mi
          });
        });
      });
    });
    root.classList.add('has-solution');
    renderPlan();
    renderPlayer();
    $('rc-plan').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function exitSolution() {
    stopPlaying();
    state.solution = null;
    state.meta = [];
    state.pos = 0;
    root.classList.remove('has-solution');
    $('rc-plan').innerHTML = '';
    $('rc-player').hidden = true;
  }

  function renderPlan() {
    var wrap = $('rc-plan');
    var sol = state.solution;
    var html = '';
    html += '<div class="rc-plan-head">' +
      '<div><h3>Your solution</h3>' +
      '<p>' + sol.moves.length + ' moves in ' + sol.stages.length + ' stages, using the beginner\'s method — ' +
      'the same route almost every cuber learns first.</p></div>' +
      '<div class="rc-plan-stats">' +
      '<div><strong>' + sol.moves.length + '</strong><span>your moves</span></div>' +
      '<div><strong>20</strong><span>God\'s number</span></div>' +
      '</div></div>';

    html += '<ol class="rc-stage-list">';
    sol.stages.forEach(function (stage, si) {
      html += '<li class="rc-stage" data-stage="' + si + '" id="rc-stage-' + si + '">' +
        '<button type="button" class="rc-stage-head" data-goto="' + stage.startIndex + '">' +
        '<span class="rc-stage-num">' + (si + 1) + '</span>' +
        '<span class="rc-stage-title">' + stage.title +
        '<em>' + stage.goal + '</em></span>' +
        '<span class="rc-stage-count">' + stage.moves.length + ' moves</span>' +
        '</button>' +
        '<div class="rc-stage-body"><p class="rc-stage-why">' + stage.why + '</p><ul class="rc-step-list">';
      var lastDetail = '';
      stage.steps.forEach(function (step) {
        /* Don't repeat the same explanation four times in a row. */
        var detail = step.detail && step.detail !== lastDetail ? step.detail : '';
        if (step.detail) lastDetail = step.detail;
        html += '<li class="rc-step" data-start="' + step.startIndex + '">' +
          '<button type="button" class="rc-step-jump" data-goto="' + step.startIndex + '">' +
          '<span class="rc-step-label">' + step.label + '</span>' +
          '<span class="rc-step-moves">' + step.moves.join(' ') + '</span>' +
          '</button>' +
          (detail ? '<p class="rc-step-detail">' + detail + '</p>' : '') +
          '</li>';
      });
      html += '</ul></div></li>';
    });
    html += '</ol>';
    wrap.innerHTML = html;

    wrap.querySelectorAll('[data-goto]').forEach(function (btn) {
      btn.addEventListener('click', function () { goTo(+btn.dataset.goto); });
    });
  }

  function renderPlayer() {
    var player = $('rc-player');
    if (!state.solution) { player.hidden = true; return; }
    player.hidden = false;
    var total = state.meta.length;
    var done = state.pos >= total;
    var m = done ? null : state.meta[state.pos];

    $('rc-progress-fill').style.width = (total ? (state.pos / total) * 100 : 0) + '%';
    $('rc-progress-text').textContent = done
      ? 'All ' + total + ' moves done'
      : 'Move ' + (state.pos + 1) + ' of ' + total;

    var card = $('rc-move-card');
    if (done) {
      card.className = 'rc-move-card is-done';
      card.innerHTML = '<div class="rc-move-glyph">★</div>' +
        '<div class="rc-move-copy"><strong>Solved.</strong>' +
        '<span>You just walked through ' + total + ' moves. A speedcuber would have used about 55, ' +
        'and the shortest possible solution for any cube is never more than 20.</span></div>';
    } else {
      var text = moveText(m.move);
      card.className = 'rc-move-card';
      card.innerHTML =
        '<div class="rc-move-glyph" data-face="' + m.move.charAt(0) + '">' +
        '<span class="rc-move-notation">' + m.move + '</span>' +
        '<span class="rc-move-arrow">' + text.glyph + '</span></div>' +
        '<div class="rc-move-copy">' +
        '<span class="rc-move-stage">' + m.stageTitle + ' · ' + m.stepLabel + '</span>' +
        '<strong>' + text.title + '</strong>' +
        '<span>' + text.tail + '</span>' +
        (m.algMoves.length > 1
          ? '<span class="rc-move-alg">' + m.algMoves.map(function (mv, i) {
            return '<b class="' + (i < m.algAt ? 'done' : i === m.algAt ? 'now' : '') + '">' + mv + '</b>';
          }).join('') + '</span>'
          : '') +
        '</div>';
    }

    $('rc-prev').disabled = state.pos === 0;
    $('rc-next').disabled = done;
    $('rc-play').disabled = done;
    $('rc-play').textContent = state.playing ? '❚❚ Pause' : '▶ Play all';

    root.querySelectorAll('.rc-stage').forEach(function (el) {
      var si = +el.dataset.stage;
      var stage = state.solution.stages[si];
      var end = stage.startIndex + stage.moves.length;
      el.classList.toggle('is-current', !done && state.pos >= stage.startIndex && state.pos < end);
      el.classList.toggle('is-done', state.pos >= end);
    });
    root.querySelectorAll('.rc-step').forEach(function (el) {
      var start = +el.dataset.start;
      el.classList.toggle('is-current', !done && m && m.step >= 0 && start === stepStart(m));
    });
  }

  function stepStart(m) {
    var stage = state.solution.stages[m.stage];
    return stage.steps[m.step].startIndex;
  }

  /* ══ Playback ════════════════════════════════════════════════════════ */

  function goTo(target) {
    if (state.busy || !state.solution) return;
    target = Math.max(0, Math.min(state.meta.length, target));
    if (target === state.pos) return;
    stopPlaying();
    /* Jumping more than one move is instant; single steps get animated. */
    if (Math.abs(target - state.pos) > 1) {
      var fac = state.startFacelets.slice();
      for (var i = 0; i < target; i++) fac = Cube.applyMove(fac, state.meta[i].move);
      state.facelets = fac;
      state.pos = target;
      view.setFacelets(fac);
      renderNet();
      renderPlayer();
      return;
    }
    if (target > state.pos) stepForward(); else stepBack();
  }

  function stepForward(then) {
    if (state.busy || state.pos >= state.meta.length) { if (then) then(); return; }
    var move = state.meta[state.pos].move;
    state.busy = true;
    view.animateMove(move, Math.max(140, state.speed * 0.45), function () {
      state.facelets = Cube.applyMove(state.facelets, move);
      state.pos++;
      state.busy = false;
      view.setFacelets(state.facelets);
      renderNet();
      renderPlayer();
      if (then) then();
    });
  }

  function stepBack() {
    if (state.busy || state.pos === 0) return;
    var move = Cube.invertMove(state.meta[state.pos - 1].move);
    state.busy = true;
    view.animateMove(move, Math.max(140, state.speed * 0.45), function () {
      state.facelets = Cube.applyMove(state.facelets, move);
      state.pos--;
      state.busy = false;
      view.setFacelets(state.facelets);
      renderNet();
      renderPlayer();
    });
  }

  var playTimer = null;
  function stopPlaying() {
    state.playing = false;
    if (playTimer) { clearTimeout(playTimer); playTimer = null; }
  }
  function playLoop() {
    if (!state.playing) return;
    if (state.pos >= state.meta.length) { stopPlaying(); renderPlayer(); return; }
    stepForward(function () {
      if (!state.playing) return;
      playTimer = setTimeout(playLoop, state.speed * 0.35);
    });
  }

  /* ══ Wiring ══════════════════════════════════════════════════════════ */

  function buildPalette() {
    var wrap = $('rc-palette');
    COLORS.forEach(function (c) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rc-swatch';
      btn.dataset.colour = c;
      btn.setAttribute('aria-pressed', String(c === state.brush));
      btn.innerHTML = '<span class="rc-swatch-chip"></span>' +
        '<span class="rc-swatch-name">' + Cube.COLOR_NAME[c] + '</span>' +
        '<span class="rc-swatch-count" id="rc-count-' + c + '">0/9</span>';
      btn.addEventListener('click', function () { setBrush(c); });
      wrap.appendChild(btn);
    });
  }

  function loadState(fac) {
    exitSolution();
    state.facelets = fac.slice();
    state.cursor = 0;
    afterEdit();
    view.home();
  }

  function wire() {
    $('rc-clear').addEventListener('click', function () {
      exitSolution();
      resetToBlank();
      state.cursor = 0;
      afterEdit();
      cells[FILL_ORDER[0]].focus();
    });
    $('rc-random').addEventListener('click', function () {
      loadState(Cube.scrambledState(25));
    });
    $('rc-reset-cube').addEventListener('click', function () {
      loadState(Cube.SOLVED.slice());
    });
    $('rc-solve').addEventListener('click', solve);

    $('rc-next').addEventListener('click', function () { stopPlaying(); stepForward(); });
    $('rc-prev').addEventListener('click', function () { stopPlaying(); stepBack(); });
    $('rc-play').addEventListener('click', function () {
      if (state.playing) { stopPlaying(); renderPlayer(); return; }
      state.playing = true;
      renderPlayer();
      playLoop();
    });
    $('rc-restart').addEventListener('click', function () {
      stopPlaying();
      state.facelets = state.startFacelets.slice();
      state.pos = 0;
      view.setFacelets(state.facelets);
      renderNet();
      renderPlayer();
    });
    $('rc-speed').addEventListener('input', function (e) {
      state.speed = 1900 - +e.target.value;
    });
    $('rc-copy').addEventListener('click', function () {
      var text = state.solution.stages.map(function (s) {
        return s.title + ': ' + s.moves.join(' ');
      }).join('\n');
      if (navigator.clipboard) navigator.clipboard.writeText(text);
      $('rc-copy').textContent = 'Copied';
      setTimeout(function () { $('rc-copy').textContent = 'Copy the moves'; }, 1600);
    });

    root.querySelectorAll('.rc-move-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (state.busy) return;
        exitSolution();
        var move = btn.dataset.move;
        state.busy = true;
        view.animateMove(move, 170, function () {
          state.facelets = Cube.applyMove(state.facelets, move);
          state.busy = false;
          afterEdit();
        });
      });
    });

    document.addEventListener('keydown', function (e) {
      if (!state.solution) return;
      if (/^(INPUT|TEXTAREA|BUTTON)$/.test(document.activeElement.tagName) &&
        document.activeElement.closest('#rc-net')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); stopPlaying(); stepForward(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); stopPlaying(); stepBack(); }
    });
  }

  /* ══ Go ══════════════════════════════════════════════════════════════ */

  buildNet();
  buildPalette();
  wire();
  resetToBlank();
  loadState(Cube.scrambledState(22));
  view.resize();
  setTimeout(view.resize, 60);
}());
