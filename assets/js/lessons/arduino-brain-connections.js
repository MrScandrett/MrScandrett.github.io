/* A discrete feedback model; independent of the grade-specific worksheet state. */
(() => {
  'use strict';
  const x = document.getElementById('connection-x');
  const y = document.getElementById('connection-y');
  if (!x || !y) return;
  let position = { x: 2, y: 2 };
  let steps = 0;
  const screen = (a, b) => ({ x: 50 + 32 * a, y: 254 - 32 * b });
  function draw() {
    const tx = Number(x.value), ty = Number(y.value);
    const robot = screen(position.x, position.y), target = screen(tx, ty);
    document.getElementById('connection-x-value').value = tx;
    document.getElementById('connection-y-value').value = ty;
    document.getElementById('connection-robot').setAttribute('transform', `translate(${robot.x} ${robot.y})`);
    document.getElementById('connection-target').setAttribute('transform', `translate(${target.x} ${target.y})`);
    const line = document.getElementById('connection-error');
    for (const [key, value] of Object.entries({ x1: robot.x, y1: robot.y, x2: target.x, y2: target.y })) line.setAttribute(key, value);
    const dx = tx - position.x, dy = ty - position.y;
    document.getElementById('connection-status').textContent = `Robot (${position.x}, ${position.y}) · Target (${tx}, ${ty}). Error: x = ${dx}, y = ${dy}. Steps taken: ${steps}.${dx === 0 && dy === 0 ? ' Target reached! Change the target to try again.' : ''}`;
    document.getElementById('connection-step').disabled = dx === 0 && dy === 0;
    document.getElementById('connection-svg-desc').textContent = `Robot at (${position.x}, ${position.y}); target at (${tx}, ${ty}). Horizontal error ${dx}; vertical error ${dy}.`;
  }
  x.addEventListener('input', draw);
  y.addEventListener('input', draw);
  document.getElementById('connection-step').addEventListener('click', () => {
    position.x += Math.sign(Number(x.value) - position.x);
    position.y += Math.sign(Number(y.value) - position.y);
    steps += 1;
    draw();
  });
  document.getElementById('connection-reset').addEventListener('click', () => {
    position = { x: 2, y: 2 }; steps = 0; x.value = 8; y.value = 6; draw();
  });
  draw();
})();
