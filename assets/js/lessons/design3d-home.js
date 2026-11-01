/* Student checklist: progressive enhancement; all instructions work without JS. */
(function () {
  'use strict';
  // Existing links to the activity shelf and reference headings still open them.
  function revealTarget() {
    const hash = location.hash.slice(1);
    let id;
    try { id = decodeURIComponent(hash); } catch (_) { return; }
    const target = document.getElementById(id);
    if (!target) return;
    const disclosure = target.querySelector(':scope > details.d3-reference');
    if (disclosure) disclosure.open = true;
    let parent = target.parentElement;
    while (parent) {
      if (parent.tagName === 'DETAILS') parent.open = true;
      parent = parent.parentElement;
    }
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }
  revealTarget();
  window.addEventListener('hashchange', revealTarget);
  const host = document.querySelector('[data-desk-progress]');
  if (!host) return;
  const key = 'classroomos:desk-helper-checks:v1';
  const checks = [...host.querySelectorAll('input[type="checkbox"]')];
  const status = host.querySelector('[data-desk-status]');
  let saved = [];
  try { const value = JSON.parse(localStorage.getItem(key)); if (Array.isArray(value)) saved = value; } catch (_) { /* Storage is optional. */ }
  checks.forEach(check => { check.checked = saved.includes(check.value); });
  function update(persist) {
    const done = checks.filter(check => check.checked);
    status.textContent = done.length === checks.length
      ? '4 of 4 ready. Review your evidence, then choose a route with your teacher.'
      : `${done.length} of 4 ready. Next: ${checks.find(check => !check.checked).parentElement.textContent.trim()}.`;
    if (persist) {
      try { localStorage.setItem(key, JSON.stringify(done.map(check => check.value))); }
      catch (_) { status.textContent += ' Checks will last only while this page stays open.'; }
    }
  }
  checks.forEach(check => check.addEventListener('change', () => update(true)));
  host.querySelector('[data-desk-reset]').addEventListener('click', () => {
    checks.forEach(check => { check.checked = false; });
    update(true);
  });
  host.hidden = false;
  update(false);
}());
