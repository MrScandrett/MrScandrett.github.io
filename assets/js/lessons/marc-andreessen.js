// Marc Andreessen: The Visual Web Breakthrough Lab
(() => {
  const container = document.getElementById('ma-visual-lab');
  if (!container) return;

  const btnTextMode = document.getElementById('ma-btn-text');
  const btnMosaicMode = document.getElementById('ma-btn-mosaic');
  const btnToggleImages = document.getElementById('ma-btn-toggle-img');
  const terminalLink = document.getElementById('ma-ext-img-link');
  const helperPopup = document.getElementById('ma-helper-popup');
  const mosaicImage = document.getElementById('ma-mosaic-img');
  const statusMode = document.getElementById('ma-metric-mode');
  const statusPayload = document.getElementById('ma-metric-payload');

  let imagesEnabled = true;

  if (terminalLink && helperPopup) {
    terminalLink.addEventListener('click', (e) => {
      e.preventDefault();
      helperPopup.classList.toggle('active');
    });
  }

  if (btnToggleImages && mosaicImage) {
    btnToggleImages.addEventListener('click', () => {
      imagesEnabled = !imagesEnabled;
      btnToggleImages.setAttribute('aria-pressed', imagesEnabled ? 'true' : 'false');
      if (imagesEnabled) {
        mosaicImage.style.display = 'block';
        if (statusPayload) statusPayload.textContent = 'Payload: 142 KB (Text + 128KB Image)';
      } else {
        mosaicImage.style.display = 'none';
        if (statusPayload) statusPayload.textContent = 'Payload: 14 KB (Text Only, Images Blocked)';
      }
    });
  }

  if (btnTextMode) {
    btnTextMode.addEventListener('click', () => {
      btnTextMode.setAttribute('aria-pressed', 'true');
      if (btnMosaicMode) btnMosaicMode.setAttribute('aria-pressed', 'false');
      if (statusMode) statusMode.textContent = 'Active Engine: Line Mode / Lynx (Text-Only 1992)';
    });
  }

  if (btnMosaicMode) {
    btnMosaicMode.addEventListener('click', () => {
      btnMosaicMode.setAttribute('aria-pressed', 'true');
      if (btnTextMode) btnTextMode.setAttribute('aria-pressed', 'false');
      if (statusMode) statusMode.textContent = 'Active Engine: NCSA Mosaic 1.0 (Visual Web 1993)';
    });
  }
})();
