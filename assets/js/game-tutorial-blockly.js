(function () {
  const lessons = {
    catch: {
      title: 'Catch Game Loop',
      intro: 'The blocks show the same frame loop as the canvas demo: read input, spawn falling items, move them, then check whether the player touched a good or bad item.',
      note: 'Catch is a loop of movement, spawning, falling, and collision feedback.',
      blocks: [
        { type: 'game_move_x', fields: { DIR: 'horizontal', AMOUNT: 5 } },
        { type: 'game_spawn', fields: { THING: 'falling item', RATE: 'every 1 second' } },
        { type: 'game_move_y', fields: { THING: 'falling item', AMOUNT: 3 } },
        { type: 'game_if_touching', fields: { THING: 'good item', EFFECT: 'score += 1' } },
        { type: 'game_if_touching', fields: { THING: 'bad item', EFFECT: 'lives -= 1' } }
      ]
    },
    clicker: {
      title: 'Clicker Game Loop',
      intro: 'A clicker has no animation loop at first. Its core loop is event-driven: the player taps, the score changes, and upgrades change the next tap.',
      note: 'Clicker games teach events, variables, upgrade cost, and win checks.',
      blocks: [
        { type: 'event_whenclicked', fields: { TARGET: 'main sprite' } },
        { type: 'game_change_var', fields: { VAR: 'score', AMOUNT: '+ points per click' } },
        { type: 'game_if_var', fields: { TEST: 'score >= upgrade cost', EFFECT: 'enable upgrade' } },
        { type: 'game_if_var', fields: { TEST: 'score >= goal', EFFECT: 'show win screen' } }
      ]
    },
    maze: {
      title: 'Maze Game Loop',
      intro: 'Maze games run one decision at a time. Every key or D-pad tap asks: which tile is next, is it a wall, and did we reach the goal?',
      note: 'Maze logic is grid movement plus wall and goal checks.',
      blocks: [
        { type: 'event_whenkey', fields: { KEY: 'arrow key' } },
        { type: 'game_set_var', fields: { VAR: 'next tile', VALUE: 'current tile + direction' } },
        { type: 'game_if_var', fields: { TEST: 'next tile is not wall', EFFECT: 'move player' } },
        { type: 'game_if_touching', fields: { THING: 'goal tile', EFFECT: 'show win screen' } }
      ]
    },
    flappy: {
      title: 'Flappy Game Loop',
      intro: 'The flappy loop is gravity plus impulse. Gravity pulls every frame, tapping gives one upward push, then obstacles scroll and collisions end the run.',
      note: 'Flappy games teach velocity, gravity, scrolling obstacles, and collision.',
      blocks: [
        { type: 'game_change_var', fields: { VAR: 'vertical speed', AMOUNT: '+ gravity' } },
        { type: 'game_if_key', fields: { KEY: 'space / tap', EFFECT: 'vertical speed = jump' } },
        { type: 'game_move_y', fields: { THING: 'player', AMOUNT: 'vertical speed' } },
        { type: 'game_spawn', fields: { THING: 'pipe pair', RATE: 'on timer' } },
        { type: 'game_if_touching', fields: { THING: 'pipe or edge', EFFECT: 'game over' } }
      ]
    },
    pong: {
      title: 'Pong Game Loop',
      intro: 'Pong is a physics loop: move the paddle, move the ball, bounce on surfaces, then update the score when the ball passes a side.',
      note: 'Pong teaches velocity, reflection, paddle control, and scoring.',
      blocks: [
        { type: 'game_move_y', fields: { THING: 'player paddle', AMOUNT: 'input direction' } },
        { type: 'game_move_xy', fields: { THING: 'ball', X: 'x speed', Y: 'y speed' } },
        { type: 'game_if_touching', fields: { THING: 'paddle or wall', EFFECT: 'reverse speed' } },
        { type: 'game_if_var', fields: { TEST: 'ball passed side', EFFECT: 'score += 1' } }
      ]
    },
    shooter: {
      title: 'Target Game Loop',
      intro: 'This nonviolent target loop combines movement, a fire event, projectile motion, and hit detection.',
      note: 'Projectile games teach spawning, movement, and target collision.',
      blocks: [
        { type: 'game_move_x', fields: { DIR: 'horizontal', AMOUNT: 5 } },
        { type: 'game_if_key', fields: { KEY: 'space / fire', EFFECT: 'create projectile' } },
        { type: 'game_move_y', fields: { THING: 'projectile', AMOUNT: -8 } },
        { type: 'game_if_touching', fields: { THING: 'target', EFFECT: 'score += 1; respawn target' } }
      ]
    },
    rhythm: {
      title: 'Rhythm Tap Loop',
      intro: 'Rhythm games are timing loops. Notes spawn and fall every frame; player input only counts when a note is inside the timing window.',
      note: 'Rhythm games teach timers, lanes, windows, and feedback.',
      blocks: [
        { type: 'game_spawn', fields: { THING: 'note', RATE: 'on beat timer' } },
        { type: 'game_move_y', fields: { THING: 'note', AMOUNT: 'song speed' } },
        { type: 'game_if_key', fields: { KEY: 'matching lane key', EFFECT: 'check timing window' } },
        { type: 'game_if_var', fields: { TEST: 'note is on target line', EFFECT: 'score += accuracy' } }
      ]
    },
    quiz: {
      title: 'Quiz Adventure Loop',
      intro: 'A quiz loop presents one question, waits for a choice, checks the answer, then advances or gives feedback.',
      note: 'Quiz games teach conditionals, data lists, and progress tracking.',
      blocks: [
        { type: 'game_set_var', fields: { VAR: 'current question', VALUE: 'next question' } },
        { type: 'event_whenclicked', fields: { TARGET: 'answer choice' } },
        { type: 'game_if_var', fields: { TEST: 'choice is correct', EFFECT: 'score += 1; next question' } },
        { type: 'game_if_var', fields: { TEST: 'choice is wrong', EFFECT: 'show hint / retry' } }
      ]
    },
    cyoa: {
      title: 'Branching Story Loop',
      intro: 'A CYOA loop displays a scene, waits for a choice, then uses that choice to look up the next scene.',
      note: 'Branching stories teach state, choice, and scene maps.',
      blocks: [
        { type: 'game_set_var', fields: { VAR: 'scene', VALUE: 'current scene' } },
        { type: 'event_whenclicked', fields: { TARGET: 'choice button' } },
        { type: 'game_set_var', fields: { VAR: 'scene', VALUE: 'choice.nextScene' } },
        { type: 'game_if_var', fields: { TEST: 'scene is ending', EFFECT: 'show ending screen' } }
      ]
    }
  };

  function installStyles() {
    if (document.getElementById('game-tutorial-blockly-style')) return;
    const style = document.createElement('style');
    style.id = 'game-tutorial-blockly-style';
    style.textContent = `
      .game-blockly-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.15fr) minmax(220px, 0.85fr);
        gap: 0.9rem;
        align-items: start;
        margin-top: 0.75rem;
      }
      .game-blockly-mini {
        height: 300px;
        border: 1.5px solid rgba(255,171,25,0.35);
        border-radius: 10px;
        background: #fff;
        overflow: hidden;
      }
      [data-theme="night"] .game-blockly-mini { background: #1e1e20; }
      .game-blockly-panel {
        border: 1.5px solid rgba(255,171,25,0.35);
        border-radius: 12px;
        padding: 0.85rem 1rem;
        background: rgba(255,191,0,0.06);
      }
      [data-theme="night"] .game-blockly-panel { background: rgba(255,191,0,0.09); }
      .game-blockly-panel h3 {
        margin: 0 0 0.5rem;
        font-size: 0.92rem;
        color: #b45309;
      }
      [data-theme="night"] .game-blockly-panel h3 { color: #fbbf24; }
      .game-blockly-panel p,
      .game-blockly-panel li {
        font-size: 0.8rem;
        line-height: 1.55;
        color: #3f4f65;
      }
      [data-theme="night"] .game-blockly-panel p,
      [data-theme="night"] .game-blockly-panel li { color: rgba(245,245,247,0.72); }
      .game-blockly-panel ol {
        margin: 0.45rem 0 0;
        padding-left: 1.1rem;
      }
      .game-blockly-hint {
        font-size: 0.74rem;
        color: #94a3b8;
        margin: 0.2rem 0 0.55rem;
      }
      .game-blockly-showjs {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        background: none;
        border: 1.5px solid rgba(180,83,9,0.4);
        color: #b45309;
        border-radius: 7px;
        padding: 0.32rem 0.72rem;
        font-size: 0.76rem;
        font-weight: 700;
        font-family: inherit;
        cursor: pointer;
        margin-top: 0.65rem;
      }
      [data-theme="night"] .game-blockly-showjs {
        color: #fbbf24;
        border-color: rgba(251,191,36,0.4);
      }
      .game-blockly-showjs:hover { background: rgba(180,83,9,0.08); }
      .game-blockly-js {
        display: none;
        margin-top: 0.65rem;
      }
      .game-blockly-js.open { display: block; }
      .game-blockly-js pre {
        margin: 0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.76rem;
        line-height: 1.55;
        color: #e2e8f0;
        white-space: pre-wrap;
      }
      @media (max-width: 760px) {
        .game-blockly-grid { grid-template-columns: 1fr; }
        .game-blockly-mini { height: 280px; }
      }
    `;
    document.head.appendChild(style);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function populateSection(section, key, lesson) {
    const steps = lesson.blocks.map((block) => {
      const fieldText = Object.values(block.fields || {}).join(' / ');
      return `<li>${escapeHtml(fieldText)}</li>`;
    }).join('');

    section.innerHTML = `
      <h2>Build the Loop with Blocks</h2>
      <p>${escapeHtml(lesson.intro)}</p>
      <p class="game-blockly-hint">Live Blockly simulation — move blocks around, then reveal the JavaScript-shaped loop underneath.</p>
      <div class="game-blockly-grid">
        <div>
          <div class="game-blockly-mini" id="game-blockly-${key}" aria-label="${escapeHtml(lesson.title)} Blockly workspace"></div>
          <button class="game-blockly-showjs" type="button" data-workspace="${key}">Show the JavaScript</button>
          <div class="game-blockly-js code-block" id="game-blockly-js-${key}"><pre></pre></div>
        </div>
        <div class="game-blockly-panel">
          <h3>${escapeHtml(lesson.title)}</h3>
          <p>${escapeHtml(lesson.note)}</p>
          <ol>${steps}</ol>
        </div>
      </div>
    `;
  }

  function defineBlocks(Blockly) {
    if (Blockly.Blocks.game_loop_start) return;
    const colors = { events: 45, control: 40, sensing: 195, motion: 210, variables: 30, looks: 290 };

    Blockly.defineBlocksWithJsonArray([
      { type: 'event_whenflagclicked', message0: 'when green flag clicked', nextStatement: null, colour: colors.events },
      { type: 'event_whenclicked', message0: 'when %1 clicked', args0: [{ type: 'field_input', name: 'TARGET', text: 'sprite' }], previousStatement: null, nextStatement: null, colour: colors.events },
      { type: 'event_whenkey', message0: 'when %1 pressed', args0: [{ type: 'field_input', name: 'KEY', text: 'arrow key' }], previousStatement: null, nextStatement: null, colour: colors.events },
      { type: 'control_forever', message0: 'forever %1 %2', args0: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }], previousStatement: null, colour: colors.control },
      { type: 'game_move_x', message0: 'move %1 by %2', args0: [{ type: 'field_input', name: 'DIR', text: 'horizontal' }, { type: 'field_input', name: 'AMOUNT', text: '5' }], previousStatement: null, nextStatement: null, colour: colors.motion },
      { type: 'game_move_y', message0: 'move %1 down/up by %2', args0: [{ type: 'field_input', name: 'THING', text: 'sprite' }, { type: 'field_input', name: 'AMOUNT', text: '3' }], previousStatement: null, nextStatement: null, colour: colors.motion },
      { type: 'game_move_xy', message0: 'move %1 by x:%2 y:%3', args0: [{ type: 'field_input', name: 'THING', text: 'sprite' }, { type: 'field_input', name: 'X', text: 'x speed' }, { type: 'field_input', name: 'Y', text: 'y speed' }], previousStatement: null, nextStatement: null, colour: colors.motion },
      { type: 'game_spawn', message0: 'spawn %1 %2', args0: [{ type: 'field_input', name: 'THING', text: 'item' }, { type: 'field_input', name: 'RATE', text: 'on timer' }], previousStatement: null, nextStatement: null, colour: colors.control },
      { type: 'game_if_key', message0: 'if %1 then %2', args0: [{ type: 'field_input', name: 'KEY', text: 'key / tap' }, { type: 'field_input', name: 'EFFECT', text: 'do action' }], previousStatement: null, nextStatement: null, colour: colors.sensing },
      { type: 'game_if_touching', message0: 'if touching %1 then %2', args0: [{ type: 'field_input', name: 'THING', text: 'thing' }, { type: 'field_input', name: 'EFFECT', text: 'change score' }], previousStatement: null, nextStatement: null, colour: colors.sensing },
      { type: 'game_if_var', message0: 'if %1 then %2', args0: [{ type: 'field_input', name: 'TEST', text: 'condition' }, { type: 'field_input', name: 'EFFECT', text: 'do action' }], previousStatement: null, nextStatement: null, colour: colors.control },
      { type: 'game_set_var', message0: 'set %1 to %2', args0: [{ type: 'field_input', name: 'VAR', text: 'variable' }, { type: 'field_input', name: 'VALUE', text: 'value' }], previousStatement: null, nextStatement: null, colour: colors.variables },
      { type: 'game_change_var', message0: 'change %1 by %2', args0: [{ type: 'field_input', name: 'VAR', text: 'score' }, { type: 'field_input', name: 'AMOUNT', text: '+1' }], previousStatement: null, nextStatement: null, colour: colors.variables }
    ]);
  }

  function installGenerators(Blockly) {
    const gen = Blockly.JavaScript || Blockly.javascriptGenerator;
    if (!gen || gen.forBlock.game_move_x) return gen;

    gen.forBlock.event_whenflagclicked = () => '';
    gen.forBlock.event_whenclicked = (block) => `// when ${block.getFieldValue('TARGET')} clicked\n`;
    gen.forBlock.event_whenkey = (block) => `// when ${block.getFieldValue('KEY')} pressed\n`;
    gen.forBlock.control_forever = function (block, generator) {
      return 'function gameLoop() {\n' + generator.statementToCode(block, 'DO') + '  requestAnimationFrame(gameLoop);\n}\nrequestAnimationFrame(gameLoop);\n';
    };
    gen.forBlock.game_move_x = (block) => `move('${block.getFieldValue('DIR')}', ${JSON.stringify(block.getFieldValue('AMOUNT'))});\n`;
    gen.forBlock.game_move_y = (block) => `moveY('${block.getFieldValue('THING')}', ${JSON.stringify(block.getFieldValue('AMOUNT'))});\n`;
    gen.forBlock.game_move_xy = (block) => `moveXY('${block.getFieldValue('THING')}', ${JSON.stringify(block.getFieldValue('X'))}, ${JSON.stringify(block.getFieldValue('Y'))});\n`;
    gen.forBlock.game_spawn = (block) => `spawn('${block.getFieldValue('THING')}', '${block.getFieldValue('RATE')}');\n`;
    gen.forBlock.game_if_key = (block) => `if (pressed('${block.getFieldValue('KEY')}')) ${asAction(block.getFieldValue('EFFECT'))}\n`;
    gen.forBlock.game_if_touching = (block) => `if (touching('${block.getFieldValue('THING')}')) ${asAction(block.getFieldValue('EFFECT'))}\n`;
    gen.forBlock.game_if_var = (block) => `if (${block.getFieldValue('TEST')}) ${asAction(block.getFieldValue('EFFECT'))}\n`;
    gen.forBlock.game_set_var = (block) => `${block.getFieldValue('VAR')} = ${block.getFieldValue('VALUE')};\n`;
    gen.forBlock.game_change_var = (block) => `${block.getFieldValue('VAR')} ${block.getFieldValue('AMOUNT')};\n`;
    return gen;
  }

  function asAction(action) {
    const trimmed = String(action || '').trim();
    if (!trimmed) return '{}';
    return '{ ' + trimmed.replace(/;?$/, ';') + ' }';
  }

  function makeWorkspace(Blockly, section, key, lesson) {
    const el = section.querySelector(`#game-blockly-${key}`);
    if (!el) return null;
    const toolbox = {
      kind: 'flyoutToolbox',
      contents: [
        { kind: 'block', type: 'event_whenflagclicked' },
        { kind: 'block', type: 'event_whenclicked' },
        { kind: 'block', type: 'event_whenkey' },
        { kind: 'block', type: 'control_forever' },
        { kind: 'block', type: 'game_move_x' },
        { kind: 'block', type: 'game_move_y' },
        { kind: 'block', type: 'game_move_xy' },
        { kind: 'block', type: 'game_spawn' },
        { kind: 'block', type: 'game_if_key' },
        { kind: 'block', type: 'game_if_touching' },
        { kind: 'block', type: 'game_if_var' },
        { kind: 'block', type: 'game_set_var' },
        { kind: 'block', type: 'game_change_var' }
      ]
    };

    const ws = Blockly.inject(el, {
      toolbox,
      trashcan: false,
      zoom: { controls: false, wheel: false },
      scrollbars: true,
      move: { drag: true, wheel: false }
    });

    let previous = null;
    let parentInput = null;
    const needsForever = !['clicker', 'maze', 'quiz', 'cyoa'].includes(key);
    const event = ws.newBlock(key === 'maze' ? 'event_whenkey' : 'event_whenflagclicked');
    event.initSvg();
    event.render();
    event.moveBy(12, 12);
    previous = event;

    if (key === 'clicker' || key === 'quiz' || key === 'cyoa') {
      previous.dispose(false);
      previous = null;
    } else if (needsForever) {
      const forever = ws.newBlock('control_forever');
      forever.initSvg();
      forever.render();
      event.nextConnection.connect(forever.previousConnection);
      parentInput = forever.getInput('DO').connection;
    }

    lesson.blocks.forEach((spec, index) => {
      const block = ws.newBlock(spec.type);
      Object.entries(spec.fields || {}).forEach(([name, value]) => {
        const field = block.getField(name);
        if (field) field.setValue(String(value));
      });
      block.initSvg();
      block.render();

      if (index === 0 && (key === 'clicker' || key === 'quiz' || key === 'cyoa')) {
        block.moveBy(12, 12);
        previous = block;
      } else if (parentInput && index === 0) {
        parentInput.connect(block.previousConnection);
        previous = block;
      } else if (previous && previous.nextConnection) {
        previous.nextConnection.connect(block.previousConnection);
        previous = block;
      }
    });

    ws.render();
    setTimeout(() => Blockly.svgResize(ws), 0);
    return ws;
  }

  function init() {
    const sections = document.querySelectorAll('[data-game-blockly]');
    if (!sections.length) return;
    installStyles();

    sections.forEach((section) => {
      const key = section.dataset.gameBlockly;
      const lesson = lessons[key];
      if (lesson) populateSection(section, key, lesson);
    });

    if (typeof Blockly === 'undefined') {
      sections.forEach((section) => {
        const hint = section.querySelector('.game-blockly-hint');
        if (hint) hint.textContent = 'Blockly could not load, but the loop explanation still works.';
      });
      return;
    }

    defineBlocks(Blockly);
    const gen = installGenerators(Blockly);
    const workspaces = {};
    sections.forEach((section) => {
      const key = section.dataset.gameBlockly;
      if (lessons[key]) workspaces[key] = makeWorkspace(Blockly, section, key, lessons[key]);
    });

    document.querySelectorAll('.game-blockly-showjs').forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.dataset.workspace;
        const out = document.getElementById(`game-blockly-js-${key}`);
        const ws = workspaces[key];
        if (!out || !ws || !gen) return;
        const open = out.classList.toggle('open');
        button.textContent = open ? 'Hide the JavaScript' : 'Show the JavaScript';
        if (open) out.querySelector('pre').textContent = gen.workspaceToCode(ws).trim();
      });
    });

    window.addEventListener('resize', () => {
      Object.values(workspaces).forEach((ws) => ws && Blockly.svgResize(ws));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
