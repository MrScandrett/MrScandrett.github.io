(() => {
  'use strict';
  const player = document.getElementById('lab-player');
  const state = document.getElementById('lab-state');
  const result = document.getElementById('lab-result');
  const input = document.getElementById('lab-input');
  const gravity = document.getElementById('lab-gravity');
  const solid = document.getElementById('lab-solid');
  let x, y, vy, frame;
  function draw(message) {
    player.style.left = `calc(${x}% - 14px)`;
    player.style.top = `${y}px`;
    state.textContent = `Frame ${frame} · x ${x}% · y ${y.toFixed(1)} px · vertical speed ${vy.toFixed(0)} px/s`;
    result.textContent = message;
  }
  function reset() {
    x = 18; y = 30; vy = 0; frame = 0;
    draw('Ready. Choose your settings, predict the result, then step.');
  }
  document.getElementById('lab-step').addEventListener('click', () => {
    frame++;
    x = Math.max(5, Math.min(95, x + Number(input.value) * 4));
    if (gravity.checked) vy += 40;
    y += vy * 0.1;
    let message = 'Position updated. The engine draws the square at its new location.';
    if (solid.checked && y + 28 >= 210) {
      y = 182; vy = 0;
      message = 'Collision resolved: the square stops on the floor. Gravity continues, but the solid surface prevents falling through.';
    } else if (y >= 260) {
      message = 'The square fell out of view: without a solid response, the visible floor cannot stop it. Reset to compare.';
    } else if (!gravity.checked && vy === 0) {
      message = 'No gravity: vertical speed stays zero. The selected input can still move the square sideways.';
    }
    draw(message);
  });
  document.getElementById('lab-reset').addEventListener('click', reset);
  reset();
})();
