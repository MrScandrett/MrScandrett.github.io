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
  const rule = document.getElementById('snake-rule');
  const nextHeadValue = document.getElementById('snake-next-head');
  const resultValue = document.getElementById('snake-result');
  const directionValue = document.getElementById('snake-direction-value');
  const scoreValue = document.getElementById('snake-score');
  const speedValue = document.getElementById('snake-speed');
  const tickButton = document.getElementById('snake-step');
  const operationButton = document.getElementById('snake-operation');
  const directionButtons = [...document.querySelectorAll('[data-direction]')];
  const predictionButtons = [...document.querySelectorAll('[data-predict]')];
  const operationItems = [...document.querySelectorAll('[data-operation]')];
  const vectors = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
  const foodQueue = [{ x: 4, y: 3 }, { x: 5, y: 5 }, { x: 1, y: 1 }, { x: 3, y: 5 }];
  let snake, displayedSnake, direction, lastDirection, food, displayedFood;
  let foodIndex, steps, score, speed, selected, ended, won, stage, pendingHead, outcome;

  function same(a, b) { return a.x === b.x && a.y === b.y; }
  function copyBody(body) { return body.map(part => ({ ...part })); }
  function position(point) { return point ? `(${point.x}, ${point.y})` : '—'; }
  function nextFood() {
    for (let offset = 0; offset < foodQueue.length; offset += 1) {
      const candidate = foodQueue[(foodIndex + offset) % foodQueue.length];
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
    return same(head, food) ? 'grow' : 'same';
  }
  function predictionResult(value) { return value === 'wall' || value === 'body' ? 'end' : value; }
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
    // The question mark is a teaching overlay while checking the proposed head.
    // Once memory updates, leave the drawn screen untouched until Draw runs.
    const preview = (stage === 'calculate' || stage === 'check') && pendingHead;
    const cells = [];
    for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
      const cell = document.createElement('span');
      cell.className = 'snake-cell';
      const bodyIndex = displayedSnake.findIndex(part => part.x === x && part.y === y);
      if (bodyIndex === 0) { cell.classList.add('is-head'); cell.textContent = '●'; }
      else if (bodyIndex > 0) { cell.classList.add('is-body'); cell.textContent = '■'; }
      else if (displayedFood && displayedFood.x === x && displayedFood.y === y) { cell.classList.add('is-food'); cell.textContent = '◆'; }
      if (preview && preview.x === x && preview.y === y) { cell.classList.add('is-preview'); cell.textContent = '?'; }
      cells.push(cell);
    }
    grid.replaceChildren(...cells);
    grid.setAttribute('aria-label', `Drawn screen: snake ${displayedSnake.map(position).join(', ')}. ${displayedFood ? `Food ${position(displayedFood)}.` : 'No food.'} ${preview ? `Proposed next head ${position(preview)}.` : ''}`);
    count.textContent = `Tick ${steps}`;
    bodyList.textContent = snake.map(position).join(' → ');
    directionValue.textContent = direction;
    nextHeadValue.textContent = position(pendingHead);
    resultValue.textContent = outcome ? ({ wall: 'wall collision', body: 'body collision', grow: 'food eaten', same: 'empty square' })[outcome] : 'waiting';
    scoreValue.textContent = String(score);
    speedValue.textContent = `${speed} ms`;
    rule.textContent = ended ? 'Round ended. Start again.' : ({ input: 'Calculate new head', calculate: 'Check collision and food', check: 'Update the body array', update: 'Draw the new frame', draw: 'Choose a direction for the next tick' })[stage];
    const ready = stage === 'input' || stage === 'draw';
    promptLabel.textContent = ended ? 'Round ended' : ready ? 'Before you move' : 'Tick in progress';
    predictionTitle.textContent = ended ? 'Try another route' : ready ? 'Make a prediction' : 'Watch the result';
    prompt.textContent = ended ? 'Start again to try a different route.'
      : stage === 'update' ? 'The body array has changed. The board still shows the previous frame.'
      : !ready ? `The proposed head is ${position(pendingHead)}. Follow the check before the body changes.`
      : `The head is at ${position(snake[0])}, facing ${direction}. Food is at ${position(food)}. What happens this tick?`;
    screenNote.textContent = stage === 'update' ? 'still shows the previous frame' : stage === 'draw' ? 'now matches the stored state' : 'shows the last drawn frame';
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
  }
  function reset() {
    snake = [{ x: 2, y: 3 }, { x: 1, y: 3 }, { x: 0, y: 3 }];
    displayedSnake = copyBody(snake);
    direction = lastDirection = 'right';
    foodIndex = 0; food = { ...foodQueue[0] }; displayedFood = { ...food };
    steps = 0; score = 0; speed = 100; selected = null; ended = false; won = false;
    stage = 'input'; pendingHead = null; outcome = null;
    operationMessage.textContent = 'Waiting for a direction. Next: calculate the new head.';
    feedback.textContent = 'Choose a prediction, then run an operation or a full tick.';
    feedback.removeAttribute('data-result');
    render();
  }
  function nextOperation() {
    if (ended) return;
    if (stage === 'input' || stage === 'draw') {
      const [dx, dy] = vectors[direction];
      pendingHead = { x: snake[0].x + dx, y: snake[0].y + dy };
      outcome = null; stage = 'calculate';
      feedback.removeAttribute('data-result');
      operationMessage.textContent = `New head = ${position(snake[0])} + (${dx}, ${dy}) = ${position(pendingHead)}. The question mark marks this proposed square.`;
      if (!selected) feedback.textContent = 'Follow the proposed square through the checks. You can predict again next tick.';
    } else if (stage === 'calculate') {
      outcome = resultFor(pendingHead);
      stage = 'check';
      const messages = { wall: 'The new head is outside the board. Stop before changing the body.', body: 'The new head overlaps the current body. Stop before changing the body.', grow: 'The new head reaches food. The tail will stay.', same: 'The new head reaches an empty square. The tail will leave.' };
      operationMessage.textContent = messages[outcome];
      showPrediction(outcome);
      if (outcome === 'wall' || outcome === 'body') { ended = true; steps += 1; }
    } else if (stage === 'check') {
      snake.unshift(pendingHead);
      if (outcome === 'grow') {
        score += 10;
        speed = Math.max(50, speed - 2);
        food = nextFood();
        operationMessage.textContent = `Added ${position(pendingHead)} to the front. Kept the tail. Score is ${score}; next tick is ${speed} ms.`;
        if (!food) { won = true; operationMessage.textContent += ' The board is full.'; }
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
      if (won) { ended = true; operationMessage.textContent += ' The board is full: you win.'; }
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
    stage = 'input'; pendingHead = null; outcome = null;
    render();
  }));
  predictionButtons.forEach(button => button.addEventListener('click', () => { selected = button.dataset.predict; render(); }));
  operationButton.addEventListener('click', nextOperation);
  tickButton.addEventListener('click', fullTick);
  document.getElementById('snake-reset').addEventListener('click', reset);
  reset();
})();
