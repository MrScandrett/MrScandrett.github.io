// Scope movement keys to the focused canvas; clear held input when focus is lost.
export function bindControls(canvas, root, request) {
  const held = new Set(), touches = new Map();
  const movement = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ShiftLeft: 'run', ShiftRight: 'run' };
  const actions = { Space: 'jump', KeyX: 'sword', KeyC: 'potion', KeyH: 'hurt', KeyV: 'victory', KeyF: 'gameover', KeyR: 'retry' };
  function clear() { held.clear(); touches.clear(); }
  canvas.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (movement[event.code]) { event.preventDefault(); held.add(movement[event.code]); }
    if (actions[event.code]) { event.preventDefault(); if (!event.repeat) request(actions[event.code]); }
  });
  canvas.addEventListener('keyup', event => { if (movement[event.code]) { event.preventDefault(); held.delete(movement[event.code]); } });
  canvas.addEventListener('blur', clear); window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  root.querySelectorAll('[data-move]').forEach(button => {
    button.addEventListener('pointerdown', event => { if (event.button !== 0) return; event.preventDefault(); button.setPointerCapture(event.pointerId); touches.set(event.pointerId, button.dataset.move); });
    const end = event => touches.delete(event.pointerId);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, end);
    // Native keyboard/assistive activation produces a single movement step.
    button.addEventListener('click', event => { if (event.detail === 0) request(`step-${button.dataset.move}`); });
  });
  root.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => request(button.dataset.action)));
  return { clear, input: () => Object.fromEntries([...held, ...touches.values()].map(key => [key, true])) };
}
