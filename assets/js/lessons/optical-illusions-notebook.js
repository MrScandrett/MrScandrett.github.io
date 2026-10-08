/* Three controlled tests, with device-local evidence notes and a portable copy. */
(function () {
  'use strict';
  var select = document.getElementById('oi-test');
  if (!select) return;
  var key = 'classroomos:optical-illusions:notebook:v1';
  var fields = ['prediction', 'evidence', 'explanation'];
  var notes = {}, status = document.getElementById('oi-note-status');
  try {
    var stored = JSON.parse(localStorage.getItem(key) || '{}');
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) notes = stored;
  } catch (err) { status.textContent = 'Storage unavailable. Download notes to keep them.'; }
  function load() {
    var entry = notes[select.value] || {};
    fields.forEach(function (field) {
      document.getElementById('oi-' + field).value = typeof entry[field] === 'string' ? entry[field] : '';
    });
  }
  function save() {
    var entry = {};
    fields.forEach(function (field) { entry[field] = document.getElementById('oi-' + field).value; });
    notes[select.value] = entry;
    try { localStorage.setItem(key, JSON.stringify(notes)); status.textContent = 'Saved on this device.'; }
    catch (err) { status.textContent = 'Download notes to keep them; device storage is unavailable.'; }
  }
  fields.forEach(function (field) { document.getElementById('oi-' + field).addEventListener('input', save); });
  select.addEventListener('change', load);
  document.getElementById('oi-download-notes').addEventListener('click', function () {
    save();
    var text = 'OPTICAL ILLUSIONS · INVESTIGATION NOTES\n';
    Array.from(select.options).forEach(function (option) {
      var entry = notes[option.value];
      if (!entry || !fields.some(function (field) { return entry[field]; })) return;
      text += '\n' + option.textContent + '\n';
      fields.forEach(function (field) { text += '\n' + field.toUpperCase() + '\n' + (entry[field] || '(not recorded)') + '\n'; });
    });
    var url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    var link = document.createElement('a'); link.href = url; link.download = 'optical-illusions-notes.txt';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    status.textContent = 'Notes downloaded.';
  });
  load();
})();
