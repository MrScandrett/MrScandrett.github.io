/* The lightweight entry point: Blockly itself loads only when a student opens a lab. */
(() => {
  const section = document.querySelector('[data-web-blocks]');
  if (!section) return;
  const start = section.querySelector('[data-wb-open]');
  const status = section.querySelector('[data-wb-start-status]');
  let ready;
  async function open() {
    if (!ready) {
      start.disabled = true;
      status.textContent = 'Loading the block workbench…';
      ready = import('./web-blocks-workbench.mjs').then(module => module.mount(section)).catch(error => {
        ready = null; start.disabled = false;
        status.textContent = `The workbench could not load. Try again. ${error.message}`;
        throw error;
      });
    }
    const lab = await ready;
    section.querySelector('[data-wb-app]').hidden = false;
    start.hidden = true;
    status.textContent = '';
    lab.resize();
    return lab;
  }
  start.addEventListener('click', () => open().catch(() => {}));
  // Only actual code examples; directory trees, commands and planning prompts remain prose.
  let number = 0;
  document.querySelectorAll('pre').forEach(pre => {
    if (pre.closest('[data-web-blocks]')) return;
    const source = (pre.querySelector('code') || pre).textContent.trim();
    if (!source) return;
    let language;
    if (/^(?:<!doctype|<!--|<[a-z][\s\S]*>)/i.test(source)) language = 'html';
    else if (/(?:^|[\n{;])\s*(?:--[\w-]+|[a-z-]+)\s*:\s*[^;{}]+[;}]/i.test(source) && !/\b(?:const|let|function|document\.)\b/.test(source)) language = 'css';
    else if (/\b(?:const |let |function |document\.|console\.|addEventListener|requestAnimationFrame|renderer\.|session =|cards\.|card\.)/.test(source)) language = 'js';
    if (!language) return;
    const heading = pre.closest('section, article, details')?.querySelector('h2,h3,summary')?.textContent.trim() || 'Lesson example';
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'wb-example'; button.textContent = 'Try with blocks';
    button.setAttribute('aria-label', `Try ${language.toUpperCase()} example ${++number} with blocks: ${heading}`);
    button.addEventListener('click', async () => {
      try {
        const lab = await open();
        lab.offerExample({ source, language, heading });
        section.scrollIntoView({ behavior: 'auto', block: 'start' });
      } catch { /* The start status contains the recovery instruction. */ }
    });
    pre.after(button);
  });
})();
