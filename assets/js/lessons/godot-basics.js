(() => {
  const nodeNotes = {
    player: ['Player', 'A CharacterBody3D is designed for a character moved by your code.'],
    mesh: ['Mesh', 'The visible geometry. A mesh looks solid, but it does not create physics by itself.'],
    collision: ['Collision', 'An invisible physics boundary. Match its shape closely to the visible mesh.'],
    floor: ['Floor', 'A StaticBody3D belongs to the world and does not move during play.'],
    camera: ['Camera', 'The viewpoint shown in the game window. One camera must be current.'],
    light: ['Sun', 'A DirectionalLight3D acts like a faraway sun with parallel rays.']
  };
  document.querySelectorAll('.scene-blueprint button[data-node]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.scene-blueprint button').forEach(item => item.classList.remove('is-active'));
      button.classList.add('is-active');
      const [name, note] = nodeNotes[button.dataset.node];
      document.getElementById('nodeReadout').innerHTML = `<strong>${name}:</strong> ${note}`;
    });
  });

  const editorNotes = {
    scene: ['Scene dock', 'A family tree of every node in the current scene. Parent-child relationships matter.'],
    viewport: ['3D viewport', 'The work area where you place, rotate, and scale objects. This is an editor view, not automatically the game camera.'],
    inspector: ['Inspector', 'Properties for the selected node: position, mesh, color, speed, and many more.'],
    filesystem: ['FileSystem', 'Every saved scene, script, image, sound, and model inside the project folder.']
  };
  document.querySelectorAll('.editor-zone').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.editor-zone').forEach(item => item.classList.remove('is-active'));
      button.classList.add('is-active');
      const [name, note] = editorNotes[button.dataset.panel];
      document.getElementById('editorExplain').innerHTML = `<strong>${name}</strong><span>${note}</span>`;
    });
  });

  const codeNotes = {
    input: ['Input.get_vector()', 'combines four named actions into one 2D direction. Pressing opposite keys cancels out.'],
    vector: ['Vector3(input.x, 0, input.y)', 'turns the flat input into a direction on the 3D floor. In Godot, Y is up, so floor movement uses X and Z.'],
    velocity: ['velocity', 'stores movement in units per second. Multiplying direction by speed lets the Inspector control how fast the player moves.'],
    gravity: ['velocity.y -= 9.8 * delta', 'pulls the player downward while airborne. Delta keeps the change consistent on fast and slow computers.'],
    move: ['move_and_slide()', 'moves the CharacterBody3D using its velocity and lets it slide along collision surfaces.']
  };
  document.querySelectorAll('.code-reading button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.code-reading button').forEach(item => item.classList.remove('is-active'));
      button.classList.add('is-active');
      const [name, note] = codeNotes[button.dataset.line];
      document.getElementById('codeExplain').innerHTML = `<strong>${name}</strong> ${note}`;
    });
  });

  const copyButton = document.getElementById('copyCode');
  copyButton?.addEventListener('click', async () => {
    const code = document.getElementById('movementCode').textContent;
    try {
      await navigator.clipboard.writeText(code);
      copyButton.textContent = 'Copied';
    } catch {
      copyButton.textContent = 'Select and copy';
    }
    window.setTimeout(() => { copyButton.textContent = 'Copy code'; }, 1800);
  });

  const stage = document.getElementById('labStage');
  const player = document.getElementById('labPlayer');
  const status = document.getElementById('labStatus');
  let position = { x: 10, y: 69 };
  let won = false;
  const renderPlayer = () => {
    player.style.left = `${position.x}%`;
    player.style.top = `${position.y}%`;
    if (!won && position.x >= 78 && position.y <= 48) {
      won = true;
      status.textContent = 'Goal reached — movement works!';
      status.style.color = '#ffd166';
    }
  };
  const movePlayer = direction => {
    const steps = { up: [0,-6], down: [0,6], left: [-6,0], right: [6,0] };
    const [dx, dy] = steps[direction];
    position.x = Math.max(3, Math.min(91, position.x + dx));
    position.y = Math.max(39, Math.min(78, position.y + dy));
    renderPlayer();
  };
  const keys = { w: 'up', ArrowUp: 'up', s: 'down', ArrowDown: 'down', a: 'left', ArrowLeft: 'left', d: 'right', ArrowRight: 'right' };
  stage?.addEventListener('keydown', event => {
    const direction = keys[event.key] || keys[event.key.toLowerCase()];
    if (!direction) return;
    event.preventDefault();
    movePlayer(direction);
  });
  document.querySelectorAll('[data-move]').forEach(button => button.addEventListener('click', () => {
    movePlayer(button.dataset.move);
    stage.focus();
  }));
  document.getElementById('resetLab')?.addEventListener('click', () => {
    position = { x: 10, y: 69 }; won = false;
    status.textContent = 'Click the room, then use WASD.';
    status.style.color = '';
    renderPlayer();
  });

  let introQuizPassed = false;
  document.getElementById('checkQuiz')?.addEventListener('click', () => {
    const groups = ['q1','q2','q3'];
    const answers = groups.map(name => document.querySelector(`input[name="${name}"]:checked`));
    const result = document.getElementById('quizResult');
    if (answers.some(answer => !answer)) {
      result.textContent = 'Choose one answer for every question.';
      result.style.color = '#b45309';
      return;
    }
    const score = answers.filter(answer => answer.value === 'correct').length;
    introQuizPassed = score === 3;
    result.textContent = score === 3 ? '3/3 — you are ready to build.' : `${score}/3 — revisit the mental model and script sections, then try again.`;
    result.style.color = score === 3 ? '#047857' : '#b45309';
  });

  const completeIntro = document.getElementById('completeIntro');
  const progressKey = 'classroomos-godot-pathway';
  const readProgress = () => { try { return JSON.parse(localStorage.getItem(progressKey) || '[]'); } catch { return []; } };
  const refreshIntro = () => {
    const done = readProgress().includes('1');
    completeIntro?.classList.toggle('is-done', done);
    if (completeIntro) completeIntro.textContent = done ? 'Lesson 1 completed ✓' : 'Mark Lesson 1 complete';
  };
  completeIntro?.addEventListener('click', () => {
    const done = readProgress();
    if (!done.includes('1') && !introQuizPassed) {
      const result = document.getElementById('quizResult');
      if (result) {
        result.textContent = 'Earn 3/3 on the exit ticket before completing Lesson 1.';
        result.style.color = '#b45309';
        result.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    const next = done.includes('1') ? done.filter(item => item !== '1') : [...done, '1'];
    try { localStorage.setItem(progressKey, JSON.stringify(next)); } catch {}
    refreshIntro();
  });
  refreshIntro();

  document.querySelectorAll('.ll-tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('.ll-tab').forEach(item => item.setAttribute('aria-selected','false'));
    document.querySelectorAll('.ll-pane').forEach(pane => pane.classList.remove('ll-active'));
    tab.setAttribute('aria-selected','true');
    document.getElementById(tab.dataset.pane)?.classList.add('ll-active');
  }));
  const panel = document.querySelector('.ll-panel');
  const openButton = document.querySelector('.ll-open-btn');
  const closeButton = document.querySelector('.ll-panel-close');
  const setPanelOpen = open => {
    panel?.setAttribute('aria-hidden', String(!open));
    openButton?.setAttribute('aria-expanded', String(open));
  };
  if (window.matchMedia('(max-width:680px)').matches) setPanelOpen(false);
  openButton?.addEventListener('click', () => setPanelOpen(true));
  closeButton?.addEventListener('click', () => setPanelOpen(false));
})();
