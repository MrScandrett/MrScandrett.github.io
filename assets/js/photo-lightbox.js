/* Photo lightbox for lessons: click any photo to enlarge it, centered, with a large caption.
 *
 * Usage: <script src="../../assets/js/photo-lightbox.js"></script> (path relative to the lesson),
 * (a bare <img data-zoomable> also works; its alt text becomes the caption),
 * then mark each figure:  <figure data-zoomable> <img src="..." alt="..."> <figcaption>...</figcaption> </figure>
 *   - data-full="URL"          optional larger image to load in the lightbox
 *   - data-lightbox-group="x"  optional; arrow keys / buttons step through figures sharing the group
 * Figures added later (rendered by JS) work automatically. Esc, backdrop click, or Close dismisses.
 */
(function () {
  'use strict';
  if (window.PhotoLightbox) return;

  var css = '.plb{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;padding:2vh 2vw;background:rgba(6,10,18,.88)}'
    + '.plb.plb-open{display:flex}'
    + '.plb-card{display:grid;grid-template-rows:minmax(0,1fr) auto;gap:1rem;max-width:min(96vw,1400px);max-height:96vh;width:100%;align-items:center;justify-items:center}'
    + '.plb-img{max-width:100%;max-height:68vh;object-fit:contain;border-radius:10px;background:#111;box-shadow:0 20px 60px rgba(0,0,0,.5)}'
    + '.plb-text{max-width:60rem;color:#f4f6fa;text-align:center;display:grid;gap:.4rem;overflow:auto;max-height:26vh}'
    + '.plb-kind{font-size:.9rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#9fb4d6}'
    + '.plb-caption{font-size:clamp(1.15rem,2.3vw,1.7rem);line-height:1.45;font-weight:600}'
    + '.plb-credit{font-size:.85rem;color:#9fb4d6}.plb-credit a{color:inherit}'
    + '.plb-btn{position:absolute;border:0;border-radius:999px;background:rgba(255,255,255,.14);color:#fff;font:inherit;font-weight:700;cursor:pointer;padding:.6rem 1rem;font-size:1rem}'
    + '.plb-btn:hover,.plb-btn:focus-visible{background:rgba(255,255,255,.3);outline:2px solid #fff}'
    + '.plb-close{top:1rem;right:1rem}.plb-prev{left:1rem;top:40%}.plb-next{right:1rem;top:40%}'
    + '[data-zoomable] img,img[data-zoomable]{cursor:zoom-in}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var root = document.createElement('div');
  root.className = 'plb';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Enlarged photo');
  root.innerHTML = '<button type="button" class="plb-btn plb-close" aria-label="Close photo">✕ Close</button>'
    + '<button type="button" class="plb-btn plb-prev" aria-label="Previous photo">‹</button>'
    + '<button type="button" class="plb-btn plb-next" aria-label="Next photo">›</button>'
    + '<div class="plb-card"><img class="plb-img" alt="" /><div class="plb-text"><span class="plb-kind"></span><span class="plb-caption"></span><span class="plb-credit"></span></div></div>';
  document.body.appendChild(root);

  var img = root.querySelector('.plb-img');
  var kindEl = root.querySelector('.plb-kind');
  var capEl = root.querySelector('.plb-caption');
  var creditEl = root.querySelector('.plb-credit');
  var prevBtn = root.querySelector('.plb-prev');
  var nextBtn = root.querySelector('.plb-next');
  var group = [];
  var index = 0;
  var lastFocus = null;

  function show(fig) {
    var thumb = fig.tagName === 'IMG' ? fig : fig.querySelector('img');
    var cap = fig.tagName === 'IMG' ? null : fig.querySelector('figcaption');
    img.src = fig.getAttribute('data-full') || (thumb && thumb.currentSrc) || (thumb && thumb.src) || '';
    img.alt = thumb ? thumb.alt : '';
    var kind = cap && cap.querySelector('[class*="kind"]');
    var credit = cap && cap.querySelector('[class*="credit"]');
    kindEl.textContent = kind ? kind.textContent : '';
    creditEl.innerHTML = credit ? credit.innerHTML : '';
    var link = thumb && thumb.closest('a[href]');
    if (link) {
      var src = document.createElement('a');
      src.href = link.href; src.target = '_blank'; src.rel = 'noopener noreferrer'; src.textContent = 'View source';
      if (creditEl.textContent) creditEl.appendChild(document.createTextNode(' · '));
      creditEl.appendChild(src);
    }
    var text = '';
    if (cap) {
      var clone = cap.cloneNode(true);
      clone.querySelectorAll('[class*="kind"],[class*="credit"]').forEach(function (n) { n.remove(); });
      clone.querySelectorAll('strong').forEach(function (n) { n.textContent = n.textContent + '. '; });
      text = clone.textContent.trim();
    }
    if (thumb && thumb.alt && text.length < 25) text = thumb.alt;
    capEl.textContent = text;
  }

  function open(fig) {
    var g = fig.getAttribute('data-lightbox-group');
    group = g ? Array.prototype.slice.call(document.querySelectorAll('[data-zoomable][data-lightbox-group="' + g + '"]')) : [fig];
    index = Math.max(0, group.indexOf(fig));
    lastFocus = document.activeElement;
    show(group[index]);
    prevBtn.hidden = nextBtn.hidden = group.length < 2;
    root.classList.add('plb-open');
    document.documentElement.style.overflow = 'hidden';
    root.querySelector('.plb-close').focus();
  }

  function close() {
    root.classList.remove('plb-open');
    document.documentElement.style.overflow = '';
    img.removeAttribute('src');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function step(d) {
    if (group.length < 2) return;
    index = (index + d + group.length) % group.length;
    show(group[index]);
  }

  document.addEventListener('click', function (e) {
    var fig = e.target.closest && e.target.closest('[data-zoomable]');
    if (fig && (fig.tagName === 'IMG' || fig.querySelector('img')) && e.target.closest('img')) { e.preventDefault(); open(fig); return; }
    if (!root.classList.contains('plb-open')) return;
    if (e.target === root) close();
  });
  document.addEventListener('keydown', function (e) {
    if (root.classList.contains('plb-open')) {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-zoomable] img, img[data-zoomable]')) {
      e.preventDefault();
      open(e.target.closest('[data-zoomable]') || e.target);
    }
  });
  root.querySelector('.plb-close').addEventListener('click', close);
  prevBtn.addEventListener('click', function () { step(-1); });
  nextBtn.addEventListener('click', function () { step(1); });

  // Make thumbnails keyboard-reachable, including ones added after load.
  function enhance(scope) {
    (scope || document).querySelectorAll('[data-zoomable] img:not([tabindex]), img[data-zoomable]:not([tabindex])').forEach(function (i) {
      i.tabIndex = 0;
      i.setAttribute('role', 'button');
    });
  }
  enhance();
  new MutationObserver(function () { enhance(); }).observe(document.body, { childList: true, subtree: true });

  window.PhotoLightbox = { open: open, close: close, enhance: enhance };
})();
