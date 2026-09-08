/* Shared course tools. Everything essential remains readable without JavaScript. */
(() => {
  'use strict';
  const key = 'classroomos-web-design-v1';
  const slug = location.pathname.split('/').pop().replace('.html', '');
  let progress = {};
  let storageAvailable = true;
  try { const saved = JSON.parse(localStorage.getItem(key) || '{}'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) progress = saved; }
  catch { storageAvailable = false; }
  const boxes = [...document.querySelectorAll('[data-web-check]')];
  function update() {
    const complete = boxes.filter(box => box.checked).length;
    document.querySelectorAll('[data-web-progress]').forEach(el => { el.textContent = `${complete} of ${boxes.length} checkpoints checked. ${storageAvailable ? 'Saved in this browser.' : 'Storage unavailable; keep a written record.'}`; });
    document.querySelectorAll('[data-web-meter]').forEach(el => { el.max = boxes.length || 1; el.value = complete; });
    document.querySelectorAll('[data-web-lesson]').forEach(el => {
      const saved = progress[el.dataset.webLesson];
      const done = saved && saved.total > 0 && Object.values(saved.checks || {}).filter(Boolean).length >= saved.total;
      el.classList.toggle('is-complete', Boolean(done));
      const status = el.querySelector('[data-web-lesson-status]');
      if (status) status.textContent = done ? 'Checkpoints complete' : 'Ready when you are';
    });
  }
  boxes.forEach(box => {
    box.checked = Boolean(progress[slug]?.checks?.[box.dataset.webCheck]);
    box.addEventListener('change', () => {
      progress[slug] = { total: boxes.length, checks: Object.fromEntries(boxes.map(item => [item.dataset.webCheck, item.checked])) };
      try { localStorage.setItem(key, JSON.stringify(progress)); } catch { storageAvailable = false; }
      update();
    });
  });
  document.querySelectorAll('[data-web-reset]').forEach(button => button.addEventListener('click', () => {
    boxes.forEach(box => { box.checked = false; });
    delete progress[slug];
    try { localStorage.setItem(key, JSON.stringify(progress)); } catch { storageAvailable = false; }
    update();
  }));
  document.querySelectorAll('[data-web-print]').forEach(button => button.addEventListener('click', () => window.print()));
  document.querySelectorAll('pre').forEach(pre => {
    const source = pre.querySelector('code') || pre;
    const value = source.textContent;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'web-copy'; button.textContent = 'Copy code';
    button.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(value); button.textContent = 'Copied'; }
      catch { const range = document.createRange(); range.selectNodeContents(source); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); button.textContent = 'Selected — press Ctrl/Cmd+C'; }
      window.setTimeout(() => { button.textContent = 'Copy code'; }, 2500);
    });
    pre.before(button);
  });
  const demo = document.querySelector('[data-web-demo]');
  if (demo) {
    let likes = 0;
    const style = document.querySelector('[data-demo-style]');
    const behavior = document.querySelector('[data-demo-behavior]');
    const like = document.querySelector('[data-demo-like]');
    function render() {
      demo.classList.toggle('is-styled', style.checked);
      like.disabled = !behavior.checked;
      document.querySelector('[data-demo-explain]').textContent = `${style.checked ? 'CSS gives the page its layout and colors.' : 'HTML still gives the page structure without CSS.'} ${behavior.checked ? 'JavaScript responds to the button.' : 'Turn on JavaScript to connect the button to an event.'}`;
    }
    style.addEventListener('change', render); behavior.addEventListener('change', render);
    like.addEventListener('click', () => { likes += 1; document.querySelector('[data-demo-count]').textContent = String(likes); });
    render();
  }
  update();
})();
