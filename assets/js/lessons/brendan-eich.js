// Brendan Eich: The 10-Day Event Machine Lab
(() => {
  const container = document.getElementById('be-event-lab');
  if (!container) return;

  const targetCard = document.getElementById('be-target-card');
  const inputField = document.getElementById('be-test-input');
  const logBox = document.getElementById('be-inspector-log');
  const clickCountEl = document.getElementById('be-click-count');
  const lastEventEl = document.getElementById('be-last-event');
  const colorBtn = document.getElementById('be-toggle-color-btn');
  const clearBtn = document.getElementById('be-clear-log-btn');

  let clickCount = 0;

  function appendLog(type, target, detail) {
    if (!logBox) return;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

    const line = document.createElement('div');
    line.className = 'be-log-entry';
    line.innerHTML = `<span class="be-time">[${timeStr}]</span> <span class="be-type">${type}</span> &rarr; <span class="be-target">&lt;${target}&gt;</span> ${detail ? '(' + detail + ')' : ''}`;

    logBox.appendChild(line);
    logBox.scrollTop = logBox.scrollHeight;

    if (lastEventEl) {
      lastEventEl.textContent = type;
    }
  }

  if (targetCard) {
    targetCard.addEventListener('click', (e) => {
      clickCount++;
      if (clickCountEl) clickCountEl.textContent = clickCount;
      appendLog('click', 'DIV#be-target-card', `x: ${Math.round(e.clientX)}, y: ${Math.round(e.clientY)}`);
      targetCard.style.borderColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    });

    targetCard.addEventListener('mouseenter', () => {
      appendLog('mouseenter', 'DIV#be-target-card', 'hover started');
    });

    targetCard.addEventListener('mouseleave', () => {
      appendLog('mouseleave', 'DIV#be-target-card', 'cursor exited');
    });
  }

  if (inputField) {
    inputField.addEventListener('input', (e) => {
      appendLog('input', 'INPUT#be-test-input', `value: "${e.target.value}"`);
    });

    inputField.addEventListener('keydown', (e) => {
      appendLog('keydown', 'INPUT#be-test-input', `key: "${e.key}"`);
    });
  }

  if (colorBtn) {
    colorBtn.addEventListener('click', () => {
      appendLog('click', 'BUTTON#be-toggle-color-btn', 'DOM mutation');
      if (targetCard) {
        targetCard.classList.toggle('be-accent-mode');
        if (targetCard.classList.contains('be-accent-mode')) {
          targetCard.style.background = '#dbeafe';
          targetCard.style.borderColor = '#2563eb';
        } else {
          targetCard.style.background = '#fffbeb';
          targetCard.style.borderColor = '#d97706';
        }
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (logBox) logBox.innerHTML = '';
      clickCount = 0;
      if (clickCountEl) clickCountEl.textContent = '0';
      if (lastEventEl) lastEventEl.textContent = 'None';
      appendLog('system', 'CONSOLE', 'Event log cleared');
    });
  }

  appendLog('init', 'WINDOW', 'DOM listener engine active');
})();
