/* Fit the display name using the rendered font, including browser text scaling. */
(() => {
  const title = document.querySelector('.home-hero-title');
  if (!title) return;
  let pending;
  function fit() {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      title.style.removeProperty('font-size');
      const range = document.createRange();
      range.selectNodeContents(title);
      const available = title.clientWidth;
      const measured = range.getBoundingClientRect().width;
      if (measured > available && available > 0) {
        const size = parseFloat(getComputedStyle(title).fontSize);
        title.style.setProperty('font-size', `${size * available / measured * 0.97}px`, 'important');
      }
    });
  }
  new ResizeObserver(fit).observe(title.parentElement);
  document.fonts.ready.then(fit);
  document.fonts.addEventListener('loadingdone', fit);
  window.addEventListener('resize', fit);
  fit();
})();
