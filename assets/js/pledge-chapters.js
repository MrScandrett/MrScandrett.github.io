(() => {
  const module = document.getElementById('chapters');
  if (!module) return;
  const buttons = module.querySelectorAll('[data-chapter-view]');
  buttons.forEach(button => button.addEventListener('click', () => {
    module.dataset.view = button.dataset.chapterView;
    buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  }));
})();
