/* music-song-bridge.js — send a chord progression from any theory or instrument tool to the Fake Book.
 *
 * MusicSongBridge.openInFakeBook({ title, key, mode, meter, tempo, chords, melody?, style?, from })
 * stores the song where fake-book.js looks for it (localStorage 'classroomos:song-handoff:v1') and opens
 * fake-book.html#handoff=1, which adds it to the student's own tunes and opens it for play-along.
 * chords: one chord symbol per bar ("C", "Am", "G7"). Nothing leaves the browser.
 *
 * MusicSongBridge.addButton(host, getSpec, label?) puts a ready-made button in host; getSpec() is read
 * at click time and may return null (nothing to send).
 */
(function (root) {
  'use strict';
  var KEY = 'classroomos:song-handoff:v1';
  var script = document.currentScript && document.currentScript.src;
  var fakeBookUrl = new URL('../../lessons/music/theory/fake-book.html', script || location.href).href;

  // Fake Book's chord reader wants ASCII spellings.
  function cleanChord(name) {
    return String(name || '').trim().replace(/♯/g, '#').replace(/♭/g, 'b').replace(/°/g, 'dim').replace(/ø/g, 'm7b5').replace(/\s+/g, '');
  }

  function openInFakeBook(spec) {
    if (!spec || !Array.isArray(spec.chords) || !spec.chords.length) return false;
    var song = {
      title: spec.title || 'My progression',
      composer: spec.composer || 'Me',
      key: cleanChord(spec.key || 'C').replace(/m$/, '') || 'C',
      mode: spec.mode === 'minor' ? 'minor' : 'major',
      meter: Array.isArray(spec.meter) ? spec.meter : [4, 4],
      tempo: Number(spec.tempo) || 100,
      style: spec.style || 'pop',
      chords: spec.chords.map(cleanChord),
      bars: spec.chords.length,
      melody: spec.melody,
      from: spec.from || document.title.split('·')[0].trim()
    };
    try { localStorage.setItem(KEY, JSON.stringify(song)); }
    catch (e) { return false; }
    if (root.AudioKit && root.AudioKit.stopAll) root.AudioKit.stopAll();
    location.href = fakeBookUrl + '#handoff=1';
    return true;
  }

  function addButton(host, getSpec, label) {
    if (!host) return null;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'song-bridge-btn';
    button.textContent = label || 'Open in Fake Book ↗';
    button.title = 'Play along with this progression in the Fake Book: band, chord charts and your own tune list';
    button.addEventListener('click', function () {
      var spec = getSpec();
      if (!spec || !openInFakeBook(spec)) {
        button.textContent = 'Add some chords first';
        setTimeout(function () { button.textContent = label || 'Open in Fake Book ↗'; }, 1800);
      }
    });
    host.appendChild(button);
    return button;
  }

  root.MusicSongBridge = { openInFakeBook: openInFakeBook, addButton: addButton, cleanChord: cleanChord, KEY: KEY };
})(window);
