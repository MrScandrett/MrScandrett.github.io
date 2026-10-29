/* Optional, directly credited NPS webcam stills. No proxy or third-party player.
   Source/rights evidence is recorded in docs/pledge-history.md. */
(() => {
  'use strict';
  const stage = document.getElementById('pledgeStage');
  const select = document.getElementById('flagView');
  if (!stage || !select) return;
  const rendered = document.getElementById('renderedFlag');
  const camera = document.getElementById('flagCamera');
  const actions = document.getElementById('cameraActions');
  const area = document.getElementById('cameraImageArea');
  const placeholder = document.getElementById('cameraPlaceholder');
  const status = document.getElementById('cameraStatus');
  const refresh = document.getElementById('btnRefreshCamera');
  const freeze = document.getElementById('btnFreezeCamera');
  const returnFlag = document.getElementById('btnReturnFlag');
  const renderControls = document.querySelectorAll('[data-rendered-control]');
  // Put the shared lightbox in the presentation subtree so native fullscreen
  // and the in-page fullscreen fallback can both display and focus it.
  const lightbox = document.querySelector('.plb');
  if (lightbox) document.getElementById('presentation').append(lightbox);
  const interval = 60_000;
  // This is the image URL published by NPS on its Devils Tower flag webcam page.
  const imageURL = 'https://www.nps.gov/webcams-deto/deto5.jpg';
  const notice = document.createElement('p');
  notice.className = 'camera-view-notice';
  notice.setAttribute('role', 'status');
  notice.hidden = true;
  document.querySelector('.pledge-view-controls').after(notice);
  let frozen = false;
  let visible = true;
  let timer = null;
  let pending = null;
  let current = null;
  let received = null;
  let failed = false;
  let selected = false;

  function active() {
    return selected && visible && !document.hidden && !frozen && stage.dataset.crawl !== 'paused';
  }
  function stopTimer() {
    clearTimeout(timer);
    timer = null;
  }
  function cancelRequest() {
    if (!pending) return;
    clearTimeout(pending.timeout);
    const image = pending.image;
    pending = null;
    image.onload = image.onerror = null;
    image.removeAttribute('src');
    refresh.disabled = false;
  }
  function updateStatus() {
    if (!selected) return;
    const time = received?.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
    const loaded = time ? `Received ${time}. Capture may be delayed.` : 'Waiting for the first webcam image.';
    const state = failed ? ' Refresh failed; last image retained.'
      : frozen ? ' Updates frozen.'
      : stage.dataset.crawl === 'paused' ? ' Updates paused.'
      : '';
    status.textContent = loaded + state;
    freeze.setAttribute('aria-pressed', String(frozen));
    freeze.textContent = frozen ? 'Resume updates' : 'Freeze image';
    freeze.disabled = !current;
  }
  function schedule() {
    stopTimer();
    if (active()) timer = setTimeout(() => loadImage(), interval);
  }
  function useRendered(message = '') {
    selected = false;
    select.value = 'rendered';
    stage.dataset.view = 'rendered';
    stopTimer();
    cancelRequest();
    current?.remove();
    current = null;
    received = null;
    failed = false;
    frozen = false;
    rendered.hidden = false;
    camera.hidden = true;
    actions.hidden = true;
    renderControls.forEach(element => { element.hidden = false; });
    notice.textContent = message;
    notice.hidden = !message;
  }
  function loadImage(manual = false) {
    if (!selected || pending) return;
    stopTimer();
    refresh.disabled = true;
    if (!current) {
      placeholder.hidden = false;
      placeholder.textContent = 'Loading the National Park Service webcam…';
      status.textContent = 'Loading a still image from NPS.';
      freeze.disabled = true;
    }
    const image = new Image();
    image.className = 'camera-current-image';
    image.alt = 'National Park Service webcam view at Devils Tower, with the American flag near the bottom of the frame. Framing and visibility may change.';
    image.referrerPolicy = 'strict-origin-when-cross-origin';
    const request = { image, timeout: null, manual };
    pending = request;
    function finish(success) {
      if (pending !== request || !selected) return;
      clearTimeout(request.timeout);
      image.onload = image.onerror = null;
      pending = null;
      refresh.disabled = false;
      if (success && image.naturalWidth > 0) {
        current?.remove();
        current = image;
        area.prepend(image);
        placeholder.hidden = true;
        received = new Date();
        failed = false;
      } else {
        image.removeAttribute('src');
        failed = true;
        if (!current) {
          useRendered('The NPS webcam could not be reached. Showing the rendered flag; you can select the webcam again to retry.');
          return;
        }
      }
      updateStatus();
      schedule();
    }
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    request.timeout = setTimeout(() => finish(false), 12_000);
    // Bypass an old browser-cache copy without downloading more often than NPS
    // refreshes. This timestamp is a request time, never a claimed capture time.
    image.src = `${imageURL}?t=${Date.now()}`;
  }
  function showCamera() {
    stopTimer();
    cancelRequest();
    selected = true;
    select.value = 'devils-tower';
    stage.dataset.view = 'devils-tower';
    rendered.hidden = true;
    camera.hidden = false;
    actions.hidden = false;
    notice.hidden = true;
    renderControls.forEach(element => { element.hidden = true; });
    updateStatus();
    // Selection is an explicit request, even if pledge playback is paused.
    loadImage(true);
  }
  function syncUpdates() {
    if (!selected) return;
    if (!active()) {
      stopTimer();
      // An explicit selection/refresh may finish below the fold or while the
      // pledge is paused; automatic work stops, and tab hiding cancels both.
      if (document.hidden || !pending?.manual) cancelRequest();
    } else if (!current || (received && Date.now() - received.getTime() >= interval)) {
      loadImage();
    } else {
      schedule();
    }
    updateStatus();
  }
  select.addEventListener('change', () => {
    if (select.value === 'devils-tower') showCamera();
    else useRendered();
  });
  returnFlag.addEventListener('click', () => {
    useRendered('Showing the rendered flag.');
    select.focus();
  });
  refresh.addEventListener('click', () => loadImage(true));
  freeze.addEventListener('click', () => {
    frozen = !frozen;
    if (frozen) cancelRequest();
    syncUpdates();
  });
  document.addEventListener('visibilitychange', syncUpdates);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    syncUpdates();
  }).observe(stage);
  new MutationObserver(syncUpdates).observe(stage, { attributes: true, attributeFilter: ['data-crawl'] });
  window.addEventListener('pagehide', () => { stopTimer(); cancelRequest(); });
  window.addEventListener('pageshow', syncUpdates);
})();
