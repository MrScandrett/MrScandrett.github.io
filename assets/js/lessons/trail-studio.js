/* Keep studio controls separate from the downloadable game engine. */
(function () {
  'use strict';
  var studio = document.getElementById('lab');
  var editor = document.getElementById('lab-config');
  var status = document.getElementById('lab-status');
  var fullscreen = document.getElementById('studio-fullscreen');
  var lesson = document.getElementById('studio-lesson');
  var open = document.getElementById('studio-open');
  var anchor = document.createComment('Trail studio lesson position');
  studio.before(anchor);
  document.body.appendChild(studio);
  var key = 'classroomos-trail-studio-draft-v1';
  function setOpen(value) {
    if (value) document.body.appendChild(studio);
    else anchor.after(studio);
    studio.classList.toggle('studio-open', value);
    open.hidden = value;
    lesson.hidden = !value;
    if (!value) studio.scrollIntoView({ block: 'start' });
  }
  lesson.addEventListener('click', async function () {
    if (document.fullscreenElement === studio) await document.exitFullscreen();
    setOpen(false);
    open.focus();
  });
  open.addEventListener('click', function () { setOpen(true); lesson.focus(); });
  fullscreen.addEventListener('click', async function () {
    setOpen(true);
    try {
      if (document.fullscreenElement === studio) await document.exitFullscreen();
      else if (studio.requestFullscreen) await studio.requestFullscreen();
      else throw new Error('Fullscreen unavailable');
    } catch (e) {
      status.className = 'ok';
      status.textContent = 'Full-window studio is active. Browser fullscreen is unavailable here.';
    }
  });
  document.addEventListener('fullscreenchange', function () {
    fullscreen.textContent = document.fullscreenElement === studio ? 'Exit fullscreen' : 'Fullscreen';
  });
  editor.addEventListener('keydown', function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault(); document.getElementById('lab-run').click();
    }
  });
  function save() {
    try { localStorage.setItem(key, JSON.stringify({ text: editor.value, preset: document.getElementById('lab-preset').value })); } catch (e) { /* Editing remains available without storage. */ }
  }
  editor.addEventListener('input', save);
  document.getElementById('lab-preset').addEventListener('change', save);
  document.getElementById('lab-reset').addEventListener('click', save);
  try {
    var draft = JSON.parse(localStorage.getItem(key));
    if (draft && typeof draft.text === 'string') {
      editor.value = draft.text;
      if (Array.from(document.getElementById('lab-preset').options).some(function (option) { return option.value === draft.preset; })) document.getElementById('lab-preset').value = draft.preset;
      document.getElementById('lab-run').click();
    }
  } catch (e) { /* Ignore unavailable or outdated drafts. */ }
})();
