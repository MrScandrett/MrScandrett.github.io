(() => {
  'use strict';

  const size = 7;
  const grid = document.getElementById('snake-grid');
  const count = document.getElementById('lab-step-count');
  const prompt = document.getElementById('snake-prompt');
  const promptLabel = document.getElementById('snake-prompt-label');
  const predictionTitle = document.getElementById('snake-prediction-title');
  const feedback = document.getElementById('snake-feedback');
  const operationMessage = document.getElementById('snake-operation-message');
  const screenNote = document.getElementById('snake-screen-note');
  const bodyList = document.getElementById('snake-body-list');
  const arrayChips = document.getElementById('snake-array-chips');
  const lengthValue = document.getElementById('snake-length');
  const rule = document.getElementById('snake-rule');
  const nextHeadValue = document.getElementById('snake-next-head');
  const resultValue = document.getElementById('snake-result');
  const directionValue = document.getElementById('snake-direction-value');
  const scoreValue = document.getElementById('snake-score');
  const speedValue = document.getElementById('snake-speed');
  const traceStage = document.getElementById('snake-trace-stage');
  const traceLines = [...document.querySelectorAll('#snake-trace-code [data-trace]')];
  const showCoordsToggle = document.getElementById('snake-show-coords');
  const tickButton = document.getElementById('snake-step');
  const operationButton = document.getElementById('snake-operation');
  const autoplayButton = document.getElementById('snake-autoplay');
  const directionButtons = [...document.querySelectorAll('[data-direction]')];
  const predictionButtons = [...document.querySelectorAll('[data-predict]')];
  const operationItems = [...document.querySelectorAll('[data-operation]')];
  const scenarioButtons = [...document.querySelectorAll('[data-scenario]')];

  const vectors = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
  const defaultFoodQueue = [{ x: 4, y: 3 }, { x: 5, y: 5 }, { x: 1, y: 1 }, { x: 3, y: 5 }];

  function same(a, b) { return a.x === b.x && a.y === b.y; }
  function copyBody(body) { return body.map(part => ({ ...part })); }
  function position(point) { return point ? `(${point.x}, ${point.y})` : '—'; }

  // =========================================================================
  // SECTION 01: EMBEDDED MULTI-ERA PLAYABLE ARCADE
  // =========================================================================
  const liveCanvas = document.getElementById('snake-live-canvas');
  const canvasWrap = liveCanvas ? liveCanvas.closest('.snake-canvas-wrap') : null;
  const arcadeScoreEl = document.getElementById('arcade-score');
  const arcadeLengthEl = document.getElementById('arcade-length');
  const arcadeHeadEl = document.getElementById('arcade-head');
  const arcadeSpeedEl = document.getElementById('arcade-speed');
  const arcadeStatusEl = document.getElementById('arcade-status');
  const arcadeStartBtn = document.getElementById('arcade-start-btn');
  const arcadeResetBtn = document.getElementById('arcade-reset-btn');
  const arcadeEternalToggle = document.getElementById('arcade-eternal-trail');
  const skinButtons = [...document.querySelectorAll('[data-era-skin]')];
  const dpadButtons = [...document.querySelectorAll('[data-arcade-dir]')];

  const ARCADE_TILES = 16;
  const ARCADE_PX = 20; // 16 * 20 = 320px
  let arcadeSkin = 'nokia';
  let arcadeSnake = [];
  let arcadeFood = { x: 11, y: 8 };
  let arcadeDx = 1;
  let arcadeDy = 0;
  let arcadeLastDx = 1;
  let arcadeLastDy = 0;
  let arcadeScore = 0;
  let arcadeSpeed = 110;
  let arcadeTimer = null;
  let arcadeRunning = false;
  let arcadeCrashed = false;

  const skinPalettes = {
    nokia: {
      bg: '#9bbc0f',
      grid: '#8bac0f',
      body: '#0f380f',
      head: '#0f380f',
      food: '#306230',
      border: '#0f380f'
    },
    blockade: {
      bg: '#081208',
      grid: '#0e220e',
      body: '#33ff66',
      head: '#ccffdd',
      food: '#77ff99',
      border: '#33ff66'
    },
    nibbles: {
      bg: '#000084',
      grid: '#0000a8',
      body: '#ffff55',
      head: '#ffffff',
      food: '#ff5555',
      border: '#55ffff'
    },
    modern: {
      bg: '#0f2218',
      grid: '#183526',
      body: '#4ade80',
      head: '#ecfccb',
      food: '#f87171',
      border: '#34d399'
    }
  };

  function placeArcadeFood() {
    const occupied = new Set(arcadeSnake.map(p => `${p.x},${p.y}`));
    const empty = [];
    for (let y = 0; y < ARCADE_TILES; y += 1) {
      for (let x = 0; x < ARCADE_TILES; x += 1) {
        if (!occupied.has(`${x},${y}`)) empty.push({ x, y });
      }
    }
    if (empty.length === 0) {
      arcadeFood = null;
      return;
    }
    arcadeFood = empty[Math.floor(Math.random() * empty.length)];
  }

  function stopArcadeLoop() {
    if (arcadeTimer) {
      clearInterval(arcadeTimer);
      arcadeTimer = null;
    }
    arcadeRunning = false;
    if (arcadeStartBtn) {
      arcadeStartBtn.textContent = arcadeCrashed ? '▶ Play Again' : '▶ Start / Resume';
    }
  }

  function drawArcade() {
    if (!liveCanvas) return;
    const ctx = liveCanvas.getContext('2d');
    const pal = skinPalettes[arcadeSkin] || skinPalettes.nokia;
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, liveCanvas.width, liveCanvas.height);

    // Subtle grid lines
    ctx.strokeStyle = pal.grid;
    ctx.lineWidth = 1;
    for (let i = 1; i < ARCADE_TILES; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * ARCADE_PX, 0);
      ctx.lineTo(i * ARCADE_PX, liveCanvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * ARCADE_PX);
      ctx.lineTo(liveCanvas.width, i * ARCADE_PX);
      ctx.stroke();
    }

    // Draw food
    if (arcadeFood) {
      ctx.fillStyle = pal.food;
      const fx = arcadeFood.x * ARCADE_PX;
      const fy = arcadeFood.y * ARCADE_PX;
      if (arcadeSkin === 'nokia') {
        ctx.fillRect(fx + 6, fy + 2, 8, 16);
        ctx.fillRect(fx + 2, fy + 6, 16, 8);
      } else {
        ctx.fillRect(fx + 2, fy + 2, ARCADE_PX - 4, ARCADE_PX - 4);
      }
    }

    // Draw snake
    arcadeSnake.forEach((part, index) => {
      ctx.fillStyle = index === 0 ? pal.head : pal.body;
      const pad = arcadeSkin === 'nokia' ? 2 : 1.5;
      ctx.fillRect(
        part.x * ARCADE_PX + pad,
        part.y * ARCADE_PX + pad,
        ARCADE_PX - pad * 2,
        ARCADE_PX - pad * 2
      );
    });

    if (arcadeScoreEl) arcadeScoreEl.textContent = String(arcadeScore);
    if (arcadeLengthEl) arcadeLengthEl.textContent = String(arcadeSnake.length);
    if (arcadeHeadEl && arcadeSnake[0]) arcadeHeadEl.textContent = `(${arcadeSnake[0].x}, ${arcadeSnake[0].y})`;
    if (arcadeSpeedEl) arcadeSpeedEl.textContent = `${arcadeSpeed} ms`;
  }

  function resetArcade() {
    stopArcadeLoop();
    arcadeSnake = [
      { x: 6, y: 8 },
      { x: 5, y: 8 },
      { x: 4, y: 8 }
    ];
    arcadeDx = 1;
    arcadeDy = 0;
    arcadeLastDx = 1;
    arcadeLastDy = 0;
    arcadeScore = 0;
    arcadeSpeed = 110;
    arcadeCrashed = false;
    arcadeFood = { x: 11, y: 8 };
    if (arcadeStartBtn) arcadeStartBtn.textContent = '▶ Start / Pause';
    if (arcadeStatusEl) {
      arcadeStatusEl.textContent = 'Ready. Press Start / Pause or any direction button to step the loop.';
    }
    drawArcade();
  }

  function stepArcade() {
    if (arcadeCrashed) return;
    const head = { x: arcadeSnake[0].x + arcadeDx, y: arcadeSnake[0].y + arcadeDy };
    if (head.x < 0 || head.x >= ARCADE_TILES || head.y < 0 || head.y >= ARCADE_TILES) {
      arcadeCrashed = true;
      stopArcadeLoop();
      if (arcadeStatusEl) arcadeStatusEl.textContent = `Wall crash at (${head.x}, ${head.y})! Final score: ${arcadeScore} (length ${arcadeSnake.length}).`;
      drawArcade();
      return;
    }
    if (arcadeSnake.some(p => same(p, head))) {
      arcadeCrashed = true;
      stopArcadeLoop();
      if (arcadeStatusEl) arcadeStatusEl.textContent = `Self-collision at (${head.x}, ${head.y})! Final score: ${arcadeScore} (length ${arcadeSnake.length}).`;
      drawArcade();
      return;
    }

    arcadeSnake.unshift(head);
    arcadeLastDx = arcadeDx;
    arcadeLastDy = arcadeDy;

    const eternal = arcadeEternalToggle && arcadeEternalToggle.checked;
    if (arcadeFood && same(head, arcadeFood)) {
      arcadeScore += 10;
      arcadeSpeed = Math.max(55, arcadeSpeed - 2);
      placeArcadeFood();
      if (arcadeTimer) {
        clearInterval(arcadeTimer);
        arcadeTimer = setInterval(stepArcade, arcadeSpeed);
      }
      if (arcadeStatusEl) {
        arcadeStatusEl.textContent = `Ate food at (${head.x}, ${head.y})! Skipped pop() so length grew to ${arcadeSnake.length}.`;
      }
    } else if (!eternal) {
      arcadeSnake.pop();
    } else {
      arcadeScore += 1;
      if (arcadeStatusEl) {
        arcadeStatusEl.textContent = `1976 Blockade mode: tail never pops! Trail length is now ${arcadeSnake.length}.`;
      }
    }
    drawArcade();
  }

  function startOrToggleArcade() {
    if (arcadeCrashed) resetArcade();
    if (arcadeRunning) {
      stopArcadeLoop();
      if (arcadeStatusEl) arcadeStatusEl.textContent = 'Paused. Press Start / Resume to continue.';
    } else {
      arcadeRunning = true;
      if (arcadeStartBtn) arcadeStartBtn.textContent = '⏸ Pause';
      if (arcadeStatusEl) arcadeStatusEl.textContent = 'Running game loop: Input → Calculate → Check → Update → Draw.';
      arcadeTimer = setInterval(stepArcade, arcadeSpeed);
    }
  }

  function steerArcade(dir) {
    const [nx, ny] = vectors[dir];
    if (nx === -arcadeLastDx && ny === -arcadeLastDy) return;
    arcadeDx = nx;
    arcadeDy = ny;
    if (!arcadeRunning && !arcadeCrashed) {
      startOrToggleArcade();
    }
  }

  if (arcadeStartBtn) arcadeStartBtn.addEventListener('click', startOrToggleArcade);
  if (arcadeResetBtn) arcadeResetBtn.addEventListener('click', resetArcade);
  dpadButtons.forEach(btn => btn.addEventListener('click', () => steerArcade(btn.dataset.arcadeDir)));
  skinButtons.forEach(btn => btn.addEventListener('click', () => {
    arcadeSkin = btn.dataset.eraSkin;
    skinButtons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    if (canvasWrap) canvasWrap.dataset.skin = arcadeSkin;
    drawArcade();
  }));

  document.addEventListener('keydown', event => {
    const keyMap = {
      ArrowUp: 'up', KeyW: 'up',
      ArrowDown: 'down', KeyS: 'down',
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right'
    };
    const dir = keyMap[event.code];
    if (!dir || !arcadeRunning) return;
    event.preventDefault();
    steerArcade(dir);
  });

  if (liveCanvas && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting && arcadeRunning) stopArcadeLoop();
      });
    });
    obs.observe(liveCanvas);
  }

  // =========================================================================
  // SECTION 03: 7x7 STEP LAB
  // =========================================================================
  function buildEndgameSnake() {
    const cells = [];
    for (let y = 0; y < size; y += 1) {
      if (y % 2 === 0) {
        const maxX = y === 6 ? 4 : size - 1;
        for (let x = 0; x <= maxX; x += 1) cells.push({ x, y });
      } else {
        for (let x = size - 1; x >= 0; x -= 1) cells.push({ x, y });
      }
    }
    return cells.reverse();
  }

  const scenarios = {
    standard: {
      snake: [{ x: 2, y: 3 }, { x: 1, y: 3 }, { x: 0, y: 3 }],
      direction: 'right',
      foods: defaultFoodQueue,
      score: 0,
      speed: 100,
      intro: 'Waiting for a direction. Next: calculate the new head.'
    },
    wall: {
      snake: [{ x: 5, y: 1 }, { x: 4, y: 1 }, { x: 3, y: 1 }],
      direction: 'right',
      foods: [{ x: 2, y: 4 }, { x: 1, y: 5 }],
      score: 20,
      speed: 96,
      intro: 'Scenario 2: Head is at (5, 1) near the right border (x = 6). Step right twice or turn down to escape!'
    },
    loop: {
      snake: [
        { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 3 },
        { x: 5, y: 3 }, { x: 5, y: 2 }, { x: 5, y: 1 },
        { x: 4, y: 1 }, { x: 3, y: 1 }, { x: 2, y: 1 }
      ],
      direction: 'up',
      foods: [{ x: 1, y: 2 }, { x: 1, y: 5 }],
      score: 60,
      speed: 88,
      intro: 'Scenario 3: The snake is coiled! Facing Up toward (3, 1)—which is segment [7] of its own body. Predict or steer Left to survive!'
    },
    tailchase: {
      snake: [{ x: 2, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 2 }, { x: 2, y: 2 }],
      direction: 'up',
      foods: [{ x: 5, y: 5 }, { x: 1, y: 1 }],
      score: 10,
      speed: 98,
      intro: 'Scenario 4: Head (2, 3) faces Up toward tail tip (2, 2). When self-collision runs BEFORE snake.pop(), what happens?'
    },
    endgame: {
      snake: buildEndgameSnake(),
      direction: 'right',
      foods: [{ x: 5, y: 6 }, { x: 6, y: 6 }],
      score: 440,
      speed: 50,
      intro: 'Scenario 5: 47 of 49 squares are filled! Run two full ticks right to eat (5, 6) and (6, 6) and fill the entire 7×7 board.'
    }
  };

  let activeScenario = 'standard';
  let activeFoods = defaultFoodQueue;
  let snake, displayedSnake, direction, lastDirection, food, displayedFood;
  let foodIndex, steps, score, speed, selected, ended, won, stage, pendingHead, outcome;
  let autoplayTimer = null;

  function stopAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
    if (autoplayButton) {
      autoplayButton.setAttribute('aria-pressed', 'false');
      autoplayButton.textContent = '▶ Auto-step';
    }
  }

  function nextFood() {
    for (let offset = 0; offset < activeFoods.length; offset += 1) {
      const candidate = activeFoods[(foodIndex + offset) % activeFoods.length];
      if (!snake.some(part => same(part, candidate))) {
        foodIndex += offset + 1;
        return { ...candidate };
      }
    }
    for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
      const candidate = { x, y };
      if (!snake.some(part => same(part, candidate))) return candidate;
    }
    return null;
  }

  function resultFor(head) {
    if (head.x < 0 || head.y < 0 || head.x >= size || head.y >= size) return 'wall';
    if (snake.some(part => same(part, head))) return 'body';
    return food && same(head, food) ? 'grow' : 'same';
  }

  function predictionResult(value) {
    return value === 'wall' || value === 'body' ? 'end' : value;
  }

  function showPrediction(value) {
    const names = { wall: 'the wall', body: 'the body', grow: 'food', same: 'an empty square' };
    if (!selected) {
      feedback.textContent = `The next head reaches ${names[value]}.`;
      return;
    }
    const correct = selected === predictionResult(value);
    feedback.dataset.result = correct ? 'correct' : 'wrong';
    feedback.textContent = `${correct ? 'Correct.' : 'Check the highlighted square.'} The next head reaches ${names[value]}.`;
  }

  function render() {
    const preview = (stage === 'calculate' || stage === 'check') && pendingHead;
    const cells = [];
    for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
      const cell = document.createElement('span');
      cell.className = 'snake-cell';
      const symbol = document.createElement('span');
      const bodyIndex = displayedSnake.findIndex(part => part.x === x && part.y === y);
      if (bodyIndex === 0) {
        cell.classList.add('is-head');
        symbol.textContent = '0';
      } else if (bodyIndex > 0) {
        cell.classList.add('is-body');
        symbol.textContent = displayedSnake.length <= 12 ? String(bodyIndex) : '■';
      } else if (displayedFood && displayedFood.x === x && displayedFood.y === y) {
        cell.classList.add('is-food');
        symbol.textContent = '◆';
      }
      if (preview && preview.x === x && preview.y === y) {
        cell.classList.add('is-preview');
        symbol.textContent = '?';
      }
      const coord = document.createElement('small');
      coord.className = 'snake-cell-coord';
      coord.textContent = `${x},${y}`;
      cell.append(symbol, coord);
      cells.push(cell);
    }
    grid.replaceChildren(...cells);
    grid.setAttribute(
      'aria-label',
      `Drawn screen: snake ${displayedSnake.map(position).join(', ')}. ${displayedFood ? `Food ${position(displayedFood)}.` : 'No food.'} ${preview ? `Proposed next head ${position(preview)}.` : ''}`
    );

    count.textContent = `Tick ${steps}`;
    bodyList.textContent = snake.map(position).join(' → ');
    if (lengthValue) lengthValue.textContent = `${snake.length} / ${size * size}`;

    if (arrayChips) {
      const maxChips = 8;
      const chipNodes = snake.slice(0, maxChips).map((part, idx) => {
        const chip = document.createElement('span');
        const isLast = idx === snake.length - 1;
        chip.className = `snake-chip${idx === 0 ? ' is-head' : isLast ? ' is-tail' : ''}`;
        chip.textContent = `[${idx}] (${part.x},${part.y})`;
        return chip;
      });
      if (snake.length > maxChips) {
        const tailPart = snake[snake.length - 1];
        const more = document.createElement('span');
        more.className = 'snake-chip is-tail';
        more.textContent = `… [${snake.length - 1}] (${tailPart.x},${tailPart.y})`;
        chipNodes.push(more);
      }
      arrayChips.replaceChildren(...chipNodes);
    }

    const [vx, vy] = vectors[direction];
    directionValue.textContent = `${direction} (${vx >= 0 ? `+${vx}` : vx}, ${vy >= 0 ? `+${vy}` : vy})`;
    nextHeadValue.textContent = position(pendingHead);
    resultValue.textContent = outcome
      ? ({ wall: 'wall collision', body: 'body collision', grow: 'food eaten', same: 'empty square' })[outcome]
      : 'waiting';
    scoreValue.textContent = String(score);
    speedValue.textContent = `${speed} ms`;
    rule.textContent = ended
      ? (won ? 'Board full—you won! Start again.' : 'Round ended. Start again.')
      : ({
          input: 'Calculate new head',
          calculate: 'Check collision and food',
          check: 'Update the body array',
          update: 'Draw the new frame',
          draw: 'Choose a direction for the next tick'
        })[stage];

    if (traceStage) traceStage.textContent = `stage: ${stage}`;
    traceLines.forEach(line => {
      line.classList.toggle('is-current-line', line.dataset.trace === stage);
    });

    const ready = stage === 'input' || stage === 'draw';
    promptLabel.textContent = ended ? (won ? 'Board complete!' : 'Round ended') : ready ? 'Before you move' : 'Tick in progress';
    predictionTitle.textContent = ended ? 'Try another route' : ready ? 'Make a prediction' : 'Watch the result';
    prompt.textContent = ended
      ? (won ? 'Every square on the 7×7 board is filled! Choose a scenario or start again.' : 'Start again or pick another scenario above to test a different route.')
      : stage === 'update'
      ? 'The body array has changed in memory. Notice the board still shows the previous frame until Draw runs!'
      : !ready
      ? `The proposed head is ${position(pendingHead)}. Follow the check before the body changes.`
      : `The head is at ${position(snake[0])}, facing ${direction}. Food is at ${position(food)}. What happens this tick?`;
    screenNote.textContent = stage === 'update'
      ? 'still shows the previous frame'
      : stage === 'draw'
      ? 'now matches the stored state'
      : 'shows the last drawn frame';

    operationItems.forEach(item => item.classList.toggle('is-active', item.dataset.operation === stage));
    directionButtons.forEach(button => {
      const choice = button.dataset.direction;
      const opposite = vectors[choice][0] === -vectors[lastDirection][0] && vectors[choice][1] === -vectors[lastDirection][1];
      button.disabled = ended || opposite || !['input', 'draw'].includes(stage);
      button.setAttribute('aria-pressed', String(choice === direction));
    });
    predictionButtons.forEach(button => {
      button.disabled = ended || !['input', 'draw'].includes(stage);
      button.setAttribute('aria-pressed', String(button.dataset.predict === selected));
    });
    tickButton.disabled = ended;
    operationButton.disabled = ended;
    if (autoplayButton) autoplayButton.disabled = ended;
    if (ended) stopAutoplay();
  }

  function reset() {
    stopAutoplay();
    const cfg = scenarios[activeScenario] || scenarios.standard;
    activeFoods = cfg.foods;
    snake = copyBody(cfg.snake);
    displayedSnake = copyBody(snake);
    direction = lastDirection = cfg.direction;
    foodIndex = 1;
    food = { ...activeFoods[0] };
    displayedFood = { ...food };
    steps = 0;
    score = cfg.score;
    speed = cfg.speed;
    selected = null;
    ended = false;
    won = false;
    stage = 'input';
    pendingHead = null;
    outcome = null;
    operationMessage.textContent = cfg.intro;
    feedback.textContent = 'Choose a prediction, then run an operation or a full tick.';
    feedback.removeAttribute('data-result');
    render();
  }

  function nextOperation() {
    if (ended) return;
    if (stage === 'input' || stage === 'draw') {
      const [dx, dy] = vectors[direction];
      pendingHead = { x: snake[0].x + dx, y: snake[0].y + dy };
      outcome = null;
      stage = 'calculate';
      feedback.removeAttribute('data-result');
      operationMessage.textContent = `New head = ${position(snake[0])} + (${dx}, ${dy}) = ${position(pendingHead)}. The question mark marks this proposed square.`;
      if (!selected) feedback.textContent = 'Follow the proposed square through the checks. You can predict again next tick.';
    } else if (stage === 'calculate') {
      outcome = resultFor(pendingHead);
      stage = 'check';
      const messages = {
        wall: 'The new head is outside the 0..6 board. Stop before changing the body.',
        body: 'The new head overlaps the current body array. Stop before changing the body.',
        grow: 'The new head reaches food. The tail will stay.',
        same: 'The new head reaches an empty square. The tail will leave.'
      };
      operationMessage.textContent = messages[outcome];
      showPrediction(outcome);
      if (outcome === 'wall' || outcome === 'body') {
        ended = true;
        steps += 1;
      }
    } else if (stage === 'check') {
      snake.unshift(pendingHead);
      if (outcome === 'grow') {
        score += 10;
        speed = Math.max(50, speed - 2);
        food = nextFood();
        operationMessage.textContent = `Added ${position(pendingHead)} to the front. Kept the tail. Score is ${score}; next tick is ${speed} ms.`;
        if (!food) {
          won = true;
          operationMessage.textContent += ' The board is full.';
        }
      } else {
        const tail = snake.pop();
        operationMessage.textContent = `Added ${position(pendingHead)} to the front and removed tail ${position(tail)}. Memory changed; the screen has not been redrawn yet.`;
      }
      lastDirection = direction;
      stage = 'update';
    } else if (stage === 'update') {
      displayedSnake = copyBody(snake);
      displayedFood = food ? { ...food } : null;
      steps += 1;
      stage = 'draw';
      operationMessage.textContent = `Drawn tick ${steps}. The screen now matches the body's stored coordinates.`;
      if (won) {
        ended = true;
        operationMessage.textContent += ' The board is full: you win.';
      }
      selected = null;
    }
    render();
  }

  function fullTick() {
    const startingTick = steps;
    while (!ended && steps === startingTick) nextOperation();
  }

  directionButtons.forEach(button => button.addEventListener('click', () => {
    if (button.disabled) return;
    direction = button.dataset.direction;
    selected = null;
    feedback.textContent = 'New direction chosen. Predict the next tick.';
    feedback.removeAttribute('data-result');
    operationMessage.textContent = `Input stored: ${direction}. Next operation calculates the new head.`;
    stage = 'input';
    pendingHead = null;
    outcome = null;
    render();
  }));

  predictionButtons.forEach(button => button.addEventListener('click', () => {
    selected = button.dataset.predict;
    render();
  }));

  scenarioButtons.forEach(button => button.addEventListener('click', () => {
    activeScenario = button.dataset.scenario;
    scenarioButtons.forEach(btn => btn.setAttribute('aria-pressed', String(btn === button)));
    reset();
  }));

  if (showCoordsToggle) {
    showCoordsToggle.addEventListener('change', () => {
      grid.classList.toggle('show-coords', showCoordsToggle.checked);
    });
  }

  if (autoplayButton) {
    autoplayButton.addEventListener('click', () => {
      if (autoplayTimer) {
        stopAutoplay();
      } else if (!ended) {
        autoplayButton.setAttribute('aria-pressed', 'true');
        autoplayButton.textContent = '⏸ Pause auto';
        autoplayTimer = setInterval(() => {
          if (document.hidden || ended) {
            stopAutoplay();
            return;
          }
          nextOperation();
        }, 650);
      }
    });
  }

  operationButton.addEventListener('click', () => {
    stopAutoplay();
    nextOperation();
  });
  tickButton.addEventListener('click', () => {
    stopAutoplay();
    fullTick();
  });
  document.getElementById('snake-reset').addEventListener('click', reset);

  // =========================================================================
  // SECTION 01: ORDINARY MOVE VS FOOD MOVE COMPARATOR
  // =========================================================================
  const compareBeforeGrid = document.getElementById('compare-grid-before');
  const compareAfterGrid = document.getElementById('compare-grid-after');
  const compareBeforeCode = document.getElementById('compare-before-array');
  const compareAfterCode = document.getElementById('compare-after-array');
  const compareExplain = document.getElementById('compare-explanation');
  const compareButtons = [...document.querySelectorAll('[data-compare-mode]')];

  function renderCompareMode(mode) {
    if (!compareBeforeGrid || !compareAfterGrid) return;
    compareButtons.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.compareMode === mode)));

    if (mode === 'move') {
      compareBeforeCode.textContent = '[(2,3), (1,3), (0,3)]';
      compareAfterCode.textContent = '[(3,3), (2,3), (1,3)]';
      compareExplain.innerHTML = '<strong>Key insight:</strong> Middle squares <code>(2, 3)</code> and <code>(1, 3)</code> never moved on the board! The program only added one new head at <code>(3, 3)</code> with <code>snake.unshift(head)</code> and removed one old tail at <code>(0, 3)</code> with <code>snake.pop()</code>.';

      const beforeCells = [
        { x: 0, cls: 'is-body', top: '[2] Tail', bot: '(0,3)' },
        { x: 1, cls: 'is-body', top: '[1] Body', bot: '(1,3)' },
        { x: 2, cls: 'is-head', top: '[0] Head', bot: '(2,3)' },
        { x: 3, cls: '', top: 'Empty', bot: '(3,3)' },
        { x: 4, cls: 'is-food', top: '◆ Food', bot: '(4,3)' }
      ];
      const afterCells = [
        { x: 0, cls: 'is-dropped', top: 'pop()', bot: 'dropped' },
        { x: 1, cls: 'is-body', top: '[2] Tail', bot: '(1,3)' },
        { x: 2, cls: 'is-body', top: '[1] Body', bot: '(2,3)' },
        { x: 3, cls: 'is-head', top: '[0] New', bot: '(3,3)' },
        { x: 4, cls: 'is-food', top: '◆ Food', bot: '(4,3)' }
      ];
      fillMiniGrid(compareBeforeGrid, beforeCells);
      fillMiniGrid(compareAfterGrid, afterCells);
    } else {
      compareBeforeCode.textContent = '[(3,3), (2,3), (1,3)]';
      compareAfterCode.textContent = '[(4,3), (3,3), (2,3), (1,3)]';
      compareExplain.innerHTML = '<strong>Key insight:</strong> When the snake eats food at <code>(4, 3)</code>, the old tail tip at <code>(1, 3)</code> is the square that <em>doesn’t</em> disappear! Skipping <code>snake.pop()</code> for one tick is the entire secret to how the snake grows from length 3 to length 4.';

      const beforeCells = [
        { x: 0, cls: '', top: 'Empty', bot: '(0,3)' },
        { x: 1, cls: 'is-body', top: '[2] Tail', bot: '(1,3)' },
        { x: 2, cls: 'is-body', top: '[1] Body', bot: '(2,3)' },
        { x: 3, cls: 'is-head', top: '[0] Head', bot: '(3,3)' },
        { x: 4, cls: 'is-food', top: '◆ Food', bot: '(4,3)' }
      ];
      const afterCells = [
        { x: 0, cls: '', top: 'Empty', bot: '(0,3)' },
        { x: 1, cls: 'is-kept', top: '[3] KEPT!', bot: '(1,3)' },
        { x: 2, cls: 'is-body', top: '[2] Body', bot: '(2,3)' },
        { x: 3, cls: 'is-body', top: '[1] Body', bot: '(3,3)' },
        { x: 4, cls: 'is-head', top: '[0] Ate ◆', bot: '(4,3)' }
      ];
      fillMiniGrid(compareBeforeGrid, beforeCells);
      fillMiniGrid(compareAfterGrid, afterCells);
    }
  }

  function fillMiniGrid(container, items) {
    container.replaceChildren(...items.map(item => {
      const span = document.createElement('span');
      span.className = `snake-mini-cell ${item.cls}`.trim();
      const top = document.createElement('strong');
      top.textContent = item.top;
      const bot = document.createElement('small');
      bot.textContent = item.bot;
      span.append(top, bot);
      return span;
    }));
  }

  compareButtons.forEach(btn => btn.addEventListener('click', () => {
    renderCompareMode(btn.dataset.compareMode);
  }));

  // =========================================================================
  // SECTION 04: FOUR METHODS OF MAKING SNAKE (SYNCHRONIZER + CODE TABS)
  // =========================================================================
  const archCountdownGrid = document.getElementById('arch-countdown-grid');
  const archArrayView = document.getElementById('arch-array-view');
  const archRingView = document.getElementById('arch-ring-view');
  const archStepMoveBtn = document.getElementById('arch-step-move');
  const archStepEatBtn = document.getElementById('arch-step-eat');
  const archResetBtn = document.getElementById('arch-step-reset');

  // Clockwise 16-cell perimeter track around a 5x5 grid
  const perimeterTrack = [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
    { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 4 },
    { x: 3, y: 4 }, { x: 2, y: 4 }, { x: 1, y: 4 }, { x: 0, y: 4 },
    { x: 0, y: 3 }, { x: 0, y: 2 }, { x: 0, y: 1 }
  ];
  const RING_CAP = 8;
  let archTrackPos = 2;
  let archLength = 3;
  let archArray = [];
  let archRing = new Array(RING_CAP).fill(null);
  let archHeadPtr = 2;
  let archTailPtr = 0;

  function resetArchLab() {
    archTrackPos = 2;
    archLength = 3;
    archArray = [perimeterTrack[2], perimeterTrack[1], perimeterTrack[0]];
    archRing = new Array(RING_CAP).fill(null);
    archRing[0] = perimeterTrack[0];
    archRing[1] = perimeterTrack[1];
    archRing[2] = perimeterTrack[2];
    archTailPtr = 0;
    archHeadPtr = 2;
    renderArchLab();
  }

  function stepArchLab(eat) {
    if (eat && archLength >= 7) eat = false; // cap at 7 for 8-slot ring buffer clarity
    archTrackPos = (archTrackPos + 1) % perimeterTrack.length;
    const nextPt = perimeterTrack[archTrackPos];

    // Method 1: unshift & pop
    archArray.unshift(nextPt);
    if (eat) archLength += 1;
    else archArray.pop();

    // Method 2: Ring buffer pointers
    archHeadPtr = (archHeadPtr + 1) % RING_CAP;
    archRing[archHeadPtr] = nextPt;
    if (!eat) {
      archRing[archTailPtr] = null;
      archTailPtr = (archTailPtr + 1) % RING_CAP;
    }
    renderArchLab();
  }

  function renderArchLab() {
    if (!archCountdownGrid) return;
    // Method 3: 5x5 Countdown Matrix derived from segment lifetimes
    const gridCells = [];
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        const idx = archArray.findIndex(p => p.x === x && p.y === y);
        const lifetime = idx >= 0 ? archLength - idx : 0;
        const cell = document.createElement('span');
        cell.className = `snake-arch-cell${lifetime === archLength ? ' is-max' : lifetime > 0 ? ' is-positive' : ''}`;
        cell.textContent = String(lifetime);
        gridCells.push(cell);
      }
    }
    archCountdownGrid.replaceChildren(...gridCells);

    // Method 1: Dynamic Array chips
    if (archArrayView) {
      archArrayView.replaceChildren(...archArray.map((pt, i) => {
        const chip = document.createElement('span');
        chip.className = `snake-chip${i === 0 ? ' is-head' : i === archArray.length - 1 ? ' is-tail' : ''}`;
        chip.textContent = `[${i}] (${pt.x},${pt.y})`;
        return chip;
      }));
    }

    // Method 2: Circular Ring Buffer slots 0..7
    if (archRingView) {
      const slots = [];
      for (let s = 0; s < RING_CAP; s += 1) {
        const val = archRing[s];
        const isHead = s === archHeadPtr && val !== null;
        const isTail = s === archTailPtr && val !== null;
        const slot = document.createElement('span');
        slot.className = `snake-ring-slot${isHead ? ' is-head' : val ? ' is-active' : ''}`;
        const tag = isHead ? 'HEAD' : isTail ? 'TAIL' : `slot ${s}`;
        slot.innerHTML = `<strong>${tag}</strong><small>${val ? `(${val.x},${val.y})` : '—'}</small>`;
        slots.push(slot);
      }
      archRingView.replaceChildren(...slots);
    }
  }

  if (archStepMoveBtn) archStepMoveBtn.addEventListener('click', () => stepArchLab(false));
  if (archStepEatBtn) archStepEatBtn.addEventListener('click', () => stepArchLab(true));
  if (archResetBtn) archResetBtn.addEventListener('click', resetArchLab);

  // Method Comparison Code Switcher
  const methodButtons = [...document.querySelectorAll('[data-method]')];
  const methodCodeTitle = document.getElementById('method-code-title');
  const methodBadge = document.getElementById('method-complexity-badge');
  const methodCodeView = document.getElementById('method-code-view');
  const methodSummary = document.getElementById('method-summary');
  const methodProsCons = document.getElementById('method-pros-cons');

  const methodSpecs = {
    array: {
      title: 'Method 1 · Coordinate Array (unshift & pop)',
      badge: 'Move: O(L) · Collision: O(L)',
      code: `// Body is an ordered list of {x, y} objects, head at index 0
const head = { x: snake[0].x + dx, y: snake[0].y + dy };
if (outOfBounds(head) || snake.some(p => p.x === head.x && p.y === head.y)) {
  return gameOver();
}
snake.unshift(head); // inserts at front (shifts indices 0..L-1)
if (head.x === food.x && head.y === food.y) {
  placeFood();       // skip pop() -> length grows by 1
} else {
  snake.pop();       // remove tail tip
}`,
      summary: 'Used in high-level languages like JavaScript, Python (Pygame), and QBasic Nibbles. Very intuitive because the array directly mirrors the snake from head to tail.',
      points: [
        'Pro: Easiest to read, debug, and draw with a single forEach loop.',
        'Pro: Memory scales with snake length L rather than total board size.',
        'Tradeoff: unshift() shifts every element in memory each tick, and self-collision loops across all L segments.'
      ]
    },
    ring: {
      title: 'Method 2 · Fixed-Size Circular Ring Buffer',
      badge: 'Move: O(1) · Zero RAM Shifts',
      code: `// Pre-allocated fixed array in C / embedded systems (MAX = 400)
int nextIdx = (headIdx + 1) % MAX_CELLS;
ring[nextIdx] = { nextX, nextY };
headIdx = nextIdx;

if (!ateFood) {
  // Advance tail index modulo MAX_CELLS—no array elements ever shift!
  tailIdx = (tailIdx + 1) % MAX_CELLS;
}`,
      summary: 'Used in 1990s mobile handsets (like the Nokia 6110) and C microcontrollers where dynamic memory allocation (malloc) and shifting 400 array elements every tick are avoided.',
      points: [
        'Pro: Advancing the head and dropping the tail takes O(1) constant time—just two integer additions modulo MAX.',
        'Pro: Uses a fixed, predictable block of RAM that never fragments.',
        'Tradeoff: Requires wrap-around modulo arithmetic when iterating from tailIdx to headIdx.'
      ]
    },
    countdown: {
      title: 'Method 3 · 2D Lifetime Countdown Matrix (grid[y][x])',
      badge: 'Collision: O(1) · Grid Update: O(W×H)',
      code: `// Every cell stores how many ticks remain until the tail leaves it
if (grid[nextY][nextX] > 0) return gameOver(); // O(1) self-collision!

if (nextX === foodX && nextY === foodY) {
  snakeLength += 1; // keep all positive numbers unchanged this tick
} else {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (grid[y][x] > 0) grid[y][x] -= 1; // age every segment by 1 tick
}
grid[nextY][nextX] = snakeLength; // stamp new head`,
      summary: 'Popular in Arduino LED matrices, cellular automata, and GPU fragment shaders. Instead of storing a list of body segments, each square on the board stores an integer countdown timer.',
      points: [
        'Pro: Self-collision is a single O(1) array lookup: grid[nextY][nextX] > 0.',
        'Pro: No dynamic arrays or pointers needed—the board matrix simultaneously renders and tracks ages.',
        'Tradeoff: Every tick must scan all W × H cells on the grid to decrement positive lifetimes.'
      ]
    },
    vram: {
      title: 'Method 4 · Video RAM (Framebuffer) Readback',
      badge: 'RAM State: O(1) · 1976 Arcade Method',
      code: `// 1976 Blockade / 8-bit BASIC PEEK & POKE approach
const nextAddr = SCREEN_BASE + nextY * 32 + nextX;
if (PEEK(nextAddr) !== BLANK_CHAR) {
  return gameOver(); // Screen pixel/character is already occupied!
}
POKE(nextAddr, SNAKE_CHAR); // Draw new head directly into Video RAM`,
      summary: 'Used in Gremlin’s 1976 Blockade arcade hardware and early 8-bit home computers (Commodore PET, TRS-80, Apple II) when system RAM was only 1 KB to 4 KB.',
      points: [
        'Pro: Requires almost zero system RAM—the video display buffer itself acts as the collision map!',
        'Pro: O(1) collision test by reading a single byte from video memory before drawing the head.',
        'Tradeoff: Couples game logic tightly to screen graphics; erasing a moving tail requires tracking tail direction markers or a small ring buffer.'
      ]
    }
  };

  function renderMethodTab(key) {
    const spec = methodSpecs[key] || methodSpecs.array;
    methodButtons.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.method === key)));
    if (methodCodeTitle) methodCodeTitle.textContent = spec.title;
    if (methodBadge) methodBadge.textContent = spec.badge;
    if (methodCodeView) methodCodeView.textContent = spec.code;
    if (methodSummary) methodSummary.textContent = spec.summary;
    if (methodProsCons) {
      methodProsCons.replaceChildren(...spec.points.map(pt => {
        const div = document.createElement('div');
        div.className = 'snake-bug-step';
        div.textContent = pt;
        return div;
      }));
    }
  }

  methodButtons.forEach(btn => btn.addEventListener('click', () => {
    renderMethodTab(btn.dataset.method);
  }));

  // =========================================================================
  // SECTION 06 LAB A: BUG CLINIC
  // =========================================================================
  const bugButtons = [...document.querySelectorAll('[data-bug]')];
  const bugCodeLabel = document.getElementById('bug-code-label');
  const bugStatusBadge = document.getElementById('bug-status-badge');
  const bugCodeView = document.getElementById('bug-code-view');
  const bugTraceSummary = document.getElementById('bug-trace-summary');
  const bugVisualStrip = document.getElementById('bug-visual-strip');
  const bugTakeaway = document.getElementById('bug-takeaway');

  const bugCases = {
    correct: {
      label: 'Reference Working Implementation',
      ok: true,
      badge: 'PASSES',
      code: `const head = { x: snake[0].x + dx, y: snake[0].y + dy };
// 1. Check wall & self BEFORE modifying snake[]
if (isWall(head) || isBody(head, snake)) return gameOver();

// 2. Now safe to insert head at index 0
snake.unshift(head);
lastDx = dx; lastDy = dy;

// 3. Eat food OR pop old tail
if (same(head, food)) placeFood();
else snake.pop();`,
      summary: 'Start: snake = [(10,10), (9,10), (8,10)], moving Right (+1, 0).',
      steps: [
        { text: '1. Propose head = (11, 10). Existing snake is still [(10,10), (9,10), (8,10)].', crash: false },
        { text: '2. Check self-collision: Is (11, 10) in [(10,10), (9,10), (8,10)]? No—safe!', crash: false },
        { text: '3. snake.unshift((11, 10)) and snake.pop() → [(11,10), (10,10), (9,10)].', crash: false }
      ],
      takeaway: 'Why it works: The proposed head is tested against the old body before being added to the array.'
    },
    'unshift-first': {
      label: 'Bug 1: Calling snake.unshift(head) Too Early',
      ok: false,
      badge: 'CRASHES ON TICK 1',
      code: `const head = { x: snake[0].x + dx, y: snake[0].y + dy };
// BUG: Inserted head into snake[0] BEFORE checking collision!
snake.unshift(head);

for (let i = 0; i < snake.length; i++) {
  if (head.x === snake[i].x && head.y === snake[i].y) {
    gameOver(); // i = 0 compares head against snake[0] (itself)!
    return;
  }
}`,
      summary: 'Start: snake = [(10,10), (9,10), (8,10)], moving Right (+1, 0).',
      steps: [
        { text: '1. Propose head = (11, 10) and immediately run snake.unshift(head).', crash: false },
        { text: '2. Now snake[0] IS (11, 10)! Array is [(11,10), (10,10), (9,10), (8,10)].', crash: false },
        { text: '3. Loop starts at i = 0: checks head.x === snake[0].x (11 === 11 && 10 === 10) → TRUE! Instant Game Over on the very first move!', crash: true }
      ],
      takeaway: 'Lesson: Order of operations is everything. Never mutate state before validating preconditions!'
    },
    'double-key': {
      label: 'Bug 2: Checking Reversal Against dx Instead of lastDx',
      ok: false,
      badge: 'SELF-NECK CRASH',
      code: `// BUG: Checks pending dx/dy instead of lastDx/lastDy
const goingRight = (dx === 1);
if (key === 'ArrowUp' && dy !== 1)   { dx = 0;  dy = -1; }
if (key === 'ArrowLeft' && !goingRight) { dx = -1; dy = 0; }
// If player presses Up (25ms) then Left (55ms) before the 100ms tick:
// Key 1 sets dx = 0. Key 2 sees goingRight === false, so sets dx = -1!`,
      summary: 'Snake is moving Right: [(10,10), (9,10), (8,10)]. Player taps Up then Left inside 100 ms.',
      steps: [
        { text: 't = 25 ms (ArrowUp): dx changes from 1 to 0, dy becomes -1. (Snake has not moved yet!)', crash: false },
        { text: 't = 55 ms (ArrowLeft): Buggy check sees dx === 0 (not 1!), so it allows dx = -1, dy = 0.', crash: false },
        { text: 't = 100 ms (Tick runs): Head (10,10) steps Left to (9,10)—which is still snake[1] (its own neck)! Game Over!', crash: true }
      ],
      takeaway: 'Fix: Store lastDx and lastDy inside update() so input checks always compare against the direction the snake actually moved last frame.'
    },
    'no-clear': {
      label: 'Bug 3: Forgetting to Clear the Canvas in draw()',
      ok: false,
      badge: 'GHOST TRAIL BUG',
      code: `function draw() {
  // BUG: Forgot ctx.fillRect(0, 0, canvas.width, canvas.height)!
  ctx.fillStyle = '#ff3333';
  ctx.fillRect(food.x * 20, food.y * 20, 18, 18);
  snake.forEach(part => {
    ctx.fillRect(part.x * 20, part.y * 20, 18, 18);
  });
}`,
      summary: 'Memory array snake[] has length 3, but the HTML5 Canvas is a bitmap of painted pixels.',
      steps: [
        { text: '1. In RAM, snake.pop() removes (8, 10) from the array as expected.', crash: false },
        { text: '2. In draw(), the new squares are painted green—but nobody painted black over (8, 10)!', crash: false },
        { text: '3. Visual bug: Every square the snake ever visited stays bright green on screen forever, even though collisions only check the 3 squares in RAM!', crash: true }
      ],
      takeaway: 'Lesson: Removing an item from a JavaScript array does not erase pixels on an HTML5 Canvas. Every frame must clear, then redraw.'
    }
  };

  function renderBugCase(key) {
    const info = bugCases[key] || bugCases.correct;
    bugButtons.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.bug === key)));
    if (bugCodeLabel) bugCodeLabel.textContent = info.label;
    if (bugStatusBadge) {
      bugStatusBadge.textContent = info.badge;
      bugStatusBadge.className = info.ok ? 'badge-ok' : 'badge-bug';
    }
    if (bugCodeView) bugCodeView.textContent = info.code;
    if (bugTraceSummary) bugTraceSummary.textContent = info.summary;
    if (bugTakeaway) bugTakeaway.textContent = info.takeaway;
    if (bugVisualStrip) {
      bugVisualStrip.replaceChildren(...info.steps.map(step => {
        const div = document.createElement('div');
        div.className = `snake-bug-step${step.crash ? ' is-crash' : ''}`;
        div.textContent = step.text;
        return div;
      }));
    }
  }

  bugButtons.forEach(btn => btn.addEventListener('click', () => {
    renderBugCase(btn.dataset.bug);
  }));

  // =========================================================================
  // SECTION 06 LAB B: FOOD SPAWNER BENCHMARK
  // =========================================================================
  const spawnerSlider = document.getElementById('spawner-length-slider');
  const spawnerReadout = document.getElementById('spawner-length-readout');
  const spawnerRunBtn = document.getElementById('spawner-run-btn');
  const spawnerPresetBtns = [...document.querySelectorAll('.snake-Preset-len')];
  const outAExpected = document.getElementById('spawner-a-expected');
  const outAAvg = document.getElementById('spawner-a-avg');
  const outAMax = document.getElementById('spawner-a-max');
  const outAStatus = document.getElementById('spawner-a-status');
  const outBExpected = document.getElementById('spawner-b-expected');
  const outBAvg = document.getElementById('spawner-b-avg');
  const outBMax = document.getElementById('spawner-b-max');
  const outBStatus = document.getElementById('spawner-b-status');
  const spawnerSummary = document.getElementById('spawner-live-summary');

  function runSpawnerSimulation(len) {
    const total = 400;
    const empty = total - len;
    const freePct = ((empty / total) * 100).toFixed(1);
    if (spawnerReadout) {
      spawnerReadout.textContent = `Length: ${len} / 400 (${empty} empty · ${freePct}% free)`;
    }

    if (empty <= 0) {
      if (outAExpected) outAExpected.textContent = '∞ (Infinite)';
      if (outAAvg) outAAvg.textContent = 'CRASH (Stack overflow)';
      if (outAMax) outAMax.textContent = '> 10,000 calls';
      if (outAStatus) outAStatus.textContent = 'RangeError: Call stack!';
      if (outBExpected) outBExpected.textContent = '0 picks needed';
      if (outBAvg) outBAvg.textContent = '0 empty found';
      if (outBMax) outBMax.textContent = '1 pass (400 cells)';
      if (outBStatus) outBStatus.textContent = 'Clean Full-Board Win!';
      if (spawnerSummary) {
        spawnerSummary.innerHTML = '<strong>At 400 / 400 (Full Board):</strong> Every square is part of the snake! Method A retries forever until JavaScript throws <code>RangeError: Maximum call stack size exceeded</code>. Method B sees <code>empty.length === 0</code> and cleanly declares a <strong>Full-Board Victory</strong>!';
      }
      return;
    }

    const expected = total / empty;
    let sumTries = 0;
    let maxTries = 0;
    const trials = 100;
    for (let t = 0; t < trials; t += 1) {
      let tries = 0;
      while (tries < 50000) {
        tries += 1;
        const pick = Math.floor(Math.random() * total);
        if (pick >= len) break;
      }
      sumTries += tries;
      if (tries > maxTries) maxTries = tries;
    }
    const avg = sumTries / trials;
    if (outAExpected) outAExpected.textContent = `${expected.toFixed(2)} tries`;
    if (outAAvg) outAAvg.textContent = `${avg.toFixed(2)} tries`;
    if (outAMax) outAMax.textContent = `${maxTries} ${maxTries === 1 ? 'try' : 'tries'}`;
    if (outAStatus) outAStatus.textContent = len >= 390 ? 'Slow / Unpredictable' : 'Fast enough';
    if (outBExpected) outBExpected.textContent = '1 random pick';
    if (outBAvg) outBAvg.textContent = `${empty} empty listed`;
    if (outBMax) outBMax.textContent = '1 random pick';
    if (outBStatus) outBStatus.textContent = 'O(N) Deterministic';
    if (spawnerSummary) {
      spawnerSummary.innerHTML = `<strong>Benchmark at length ${len}:</strong> With ${empty} empty square${empty === 1 ? '' : 's'} left, random guessing has a <strong>${freePct}%</strong> chance per roll—averaging <strong>${avg.toFixed(1)}</strong> tries (worst of 100 spawns took <strong>${maxTries}</strong> tries). Filtering empty squares first always picks a valid spot in <strong>1 random roll</strong>.`;
    }
  }

  if (spawnerSlider) {
    spawnerSlider.addEventListener('input', () => {
      runSpawnerSimulation(Number(spawnerSlider.value));
    });
  }
  if (spawnerRunBtn && spawnerSlider) {
    spawnerRunBtn.addEventListener('click', () => {
      runSpawnerSimulation(Number(spawnerSlider.value));
    });
  }
  spawnerPresetBtns.forEach(btn => btn.addEventListener('click', () => {
    const val = Number(btn.dataset.len);
    if (spawnerSlider) spawnerSlider.value = String(val);
    runSpawnerSimulation(val);
  }));

  // =========================================================================
  // SECTION 07: SELF-CHECK QUIZ
  // =========================================================================
  const quizCards = [...document.querySelectorAll('.snake-quiz-card')];
  quizCards.forEach(card => {
    const buttons = [...card.querySelectorAll('.snake-quiz-options button')];
    const feedbackEl = card.querySelector('.snake-quiz-feedback');
    buttons.forEach(btn => btn.addEventListener('click', () => {
      buttons.forEach(b => b.removeAttribute('data-selected'));
      const isCorrect = btn.dataset.answer === 'correct';
      btn.dataset.selected = isCorrect ? 'correct' : 'wrong';
      if (feedbackEl) {
        feedbackEl.textContent = btn.dataset.explain || '';
      }
    }));
  });

  // Initialize all interactive views
  resetArcade();
  renderCompareMode('move');
  resetArchLab();
  renderMethodTab('array');
  renderBugCase('correct');
  runSpawnerSimulation(3);
  reset();
})();
