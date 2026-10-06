/* Page presentation controls; musical settings remain in fake-book.js. */
(function () {
  'use strict';
  var button = document.querySelector('[data-fb-stand]');
  var root = document.getElementById('fakebook');
  var scroller = document.querySelector('.ll-sim');
  if (!button || !root) return;
  var previousScroll = 0;
  function setStand(on) {
    if (on) previousScroll = scroller.scrollTop;
    document.body.classList.toggle('fb-standing', on);
    button.setAttribute('aria-pressed', String(on));
    button.textContent = on ? 'Exit music stand' : 'Music stand view';
    if (on) scroller.scrollTop = 0;
    else scroller.scrollTop = previousScroll;
  }
  button.addEventListener('click', function () {
    setStand(button.getAttribute('aria-pressed') !== 'true');
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && button.getAttribute('aria-pressed') === 'true') {
      setStand(false);
      button.focus();
    }
  });
})();
