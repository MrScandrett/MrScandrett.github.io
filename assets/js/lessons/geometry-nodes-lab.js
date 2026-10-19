(() => {
  const lab = document.querySelector('.gn-lab');
  if (!lab) return;
  const get = selector => lab.querySelector(selector);
  const wires = {points:'line', instance:'cube', output:'result'};
  const count = get('[data-gn-count]');
  const spacing = get('[data-gn-spacing]');
  const preview = get('[data-gn-preview]');
  let connected = false;

  function render() {
    const n = Number(count.value);
    const gap = Number(spacing.value);
    get('[data-gn-count-value]').textContent = String(n);
    get('[data-gn-spacing-value]').textContent = gap.toFixed(1);
    if (!connected) return;
    preview.replaceChildren(...Array.from({length:n}, () => {
      const post = document.createElement('span');
      post.className = 'gn-lab-post';
      post.setAttribute('aria-hidden','true');
      return post;
    }));
    preview.style.gap = `${Math.round(gap * 10)}px`;
    preview.setAttribute('aria-label',`${n} posts with ${gap.toFixed(1)} scene units between neighboring posts; ${(n-1)*gap} scene units from first to last.`);
  }

  get('[data-gn-check]').addEventListener('click', () => {
    const misses = Object.entries(wires).filter(([socket, value]) => get(`[data-gn-wire="${socket}"]`).value !== value).map(([socket]) => socket);
    connected = misses.length === 0;
    get('[data-gn-feedback]').textContent = connected
      ? 'Complete path. Mesh Line supplies points, Cube supplies the shape, and the instances reach Group Output. Change a parameter now.'
      : `No complete output yet. Recheck ${misses.join(', ')}. Trace where each piece of geometry comes from.`;
    if (!connected) {
      preview.replaceChildren(document.createElement('span'));
      preview.firstElementChild.textContent = 'Graph has no complete path to output.';
      preview.setAttribute('aria-label','No geometry yet; repair the graph');
    }
    render();
  });
  for (const select of lab.querySelectorAll('[data-gn-wire]')) select.addEventListener('change', () => {
    connected = false;
    preview.replaceChildren(document.createElement('span'));
    preview.firstElementChild.textContent = 'Run the graph to inspect the new wiring.';
    preview.setAttribute('aria-label','Graph changed; run it to inspect the output');
    get('[data-gn-feedback]').textContent = 'Wiring changed. Run the graph to test it.';
  });
  for (const input of [count, spacing]) input.addEventListener('input', () => {
    render();
    get('[data-gn-prediction-result]').textContent = 'The inputs changed. Predict the new span before checking.';
  });
  get('[data-gn-predict-check]').addEventListener('click', () => {
    const value = get('[data-gn-prediction]').value;
    const result = get('[data-gn-prediction-result]');
    if (!connected) { result.textContent = 'Connect the graph first so the output can be inspected.'; return; }
    if (value === '') { result.textContent = 'Enter a distance in scene units before checking.'; return; }
    const actual = (Number(count.value)-1)*Number(spacing.value);
    result.textContent = Math.abs(Number(value)-actual) < .051
      ? `Correct. ${count.value} posts make ${Number(count.value)-1} gaps; ${Number(count.value)-1} × ${Number(spacing.value).toFixed(1)} = ${actual.toFixed(1)} scene units.`
      : `Try again. ${count.value} posts make ${Number(count.value)-1} gaps. Multiply the gaps by the spacing.`;
  });
})();
