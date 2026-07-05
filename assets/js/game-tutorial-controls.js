(function () {
  const controlSets = {
    'catch-canvas': {
      label: 'Touch controls mirror Arrow / A-D movement.',
      buttons: [
        { text: 'Left', code: 'ArrowLeft', hold: true },
        { text: 'Right', code: 'ArrowRight', hold: true }
      ]
    },
    'maze-canvas': {
      label: 'Tap a direction to move one tile.',
      className: 'game-touch-controls--dpad',
      buttons: [
        { text: 'Up', code: 'ArrowUp' },
        { text: 'Left', code: 'ArrowLeft' },
        { text: 'Right', code: 'ArrowRight' },
        { text: 'Down', code: 'ArrowDown' }
      ]
    },
    'flappy-canvas': {
      label: 'Tap Flap or the canvas to jump.',
      buttons: [
        { text: 'Flap', code: 'Space' }
      ]
    },
    'pong-canvas': {
      label: 'Touch controls mirror Up / Down movement.',
      buttons: [
        { text: 'Up', code: 'ArrowUp', hold: true },
        { text: 'Down', code: 'ArrowDown', hold: true }
      ]
    },
    'shooter-canvas': {
      label: 'Move left/right, then tap Fire.',
      buttons: [
        { text: 'Left', code: 'ArrowLeft', hold: true },
        { text: 'Fire', code: 'Space' },
        { text: 'Right', code: 'ArrowRight', hold: true }
      ]
    },
    'rhythm-canvas': {
      label: 'Tap the matching lane as notes cross the line.',
      buttons: [
        { text: 'Left', code: 'ArrowLeft' },
        { text: 'Down', code: 'ArrowDown' },
        { text: 'Right', code: 'ArrowRight' }
      ]
    }
  };

  function installStyles() {
    if (document.getElementById('game-tutorial-controls-style')) return;
    const style = document.createElement('style');
    style.id = 'game-tutorial-controls-style';
    style.textContent = `
      .game-touch-note {
        margin: -0.25rem 0 0.7rem;
        font-size: 0.75rem;
        line-height: 1.45;
        color: #64748b;
        text-align: center;
      }
      [data-theme="night"] .game-touch-note { color: rgba(245,245,247,0.62); }
      .game-touch-controls {
        display: flex;
        justify-content: center;
        gap: 0.55rem;
        flex-wrap: wrap;
        margin: -0.15rem 0 0.85rem;
        touch-action: none;
        user-select: none;
      }
      .game-touch-controls button {
        min-width: 4.6rem;
        min-height: 2.6rem;
        border: 1.5px solid var(--acc-border);
        border-radius: 10px;
        background: var(--acc-soft);
        color: var(--acc);
        font: 700 0.8rem/1 Inter, system-ui, sans-serif;
        cursor: pointer;
      }
      .game-touch-controls button:active,
      .game-touch-controls button.is-pressed {
        background: var(--acc);
        color: #fff;
      }
      .game-touch-controls--dpad {
        display: grid;
        grid-template-columns: repeat(3, minmax(3.9rem, 4.8rem));
        align-items: center;
      }
      .game-touch-controls--dpad button:first-child { grid-column: 2; }
      .game-touch-controls--dpad button:nth-child(2) { grid-column: 1; }
      .game-touch-controls--dpad button:nth-child(3) { grid-column: 3; }
      .game-touch-controls--dpad button:nth-child(4) { grid-column: 2; }
      @media (pointer: fine) and (min-width: 760px) {
        .game-touch-note,
        .game-touch-controls { display: none; }
      }
    `;
    document.head.appendChild(style);
  }

  function keyEvent(type, code) {
    document.dispatchEvent(new KeyboardEvent(type, {
      code,
      key: code.replace('Arrow', ''),
      bubbles: true,
      cancelable: true
    }));
  }

  function wireButton(button, code, hold) {
    const press = (event) => {
      event.preventDefault();
      button.classList.add('is-pressed');
      keyEvent('keydown', code);
    };
    const release = (event) => {
      event.preventDefault();
      button.classList.remove('is-pressed');
      keyEvent('keyup', code);
    };

    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', (event) => {
      if (hold && button.classList.contains('is-pressed')) release(event);
    });
  }

  function installControls(canvas, config) {
    if (!canvas || canvas.dataset.touchControls === 'ready') return;
    const wrap = canvas.closest('.game-wrap');
    if (!wrap) return;

    const note = document.createElement('p');
    note.className = 'game-touch-note';
    note.textContent = config.label;

    const controls = document.createElement('div');
    controls.className = 'game-touch-controls';
    if (config.className) controls.classList.add(config.className);
    controls.setAttribute('aria-label', 'Touch game controls');

    config.buttons.forEach(({ text, code, hold }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = text;
      button.setAttribute('aria-label', `${text} control`);
      wireButton(button, code, hold);
      controls.appendChild(button);
    });

    wrap.insertAdjacentElement('afterend', controls);
    wrap.insertAdjacentElement('afterend', note);
    canvas.dataset.touchControls = 'ready';
  }

  installStyles();
  Object.keys(controlSets).forEach((id) => installControls(document.getElementById(id), controlSets[id]));
}());
