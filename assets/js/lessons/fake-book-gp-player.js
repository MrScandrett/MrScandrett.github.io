/* Original Guitar Pro score, rendered and synthesized locally by alphaTab 1.8.4. */
(function () {
  'use strict';
  var base = new URL('../../vendor/alphatab/', document.currentScript.src);
  var panel, api, generation = 0, source = null;
  function find(sel) { return panel.querySelector(sel); }
  function status(message) { find('[data-gp-status]').textContent = message; }
  function pause() { if (api) api.pause(); }
  function close() {
    generation++;
    source = null;
    if (api) { api.destroy(); api = null; }
    if (panel) { panel.hidden = true; find('[data-gp-score]').replaceChildren(); }
  }
  function encode(bytes) {
    var chunks = [];
    for (var i = 0; i < bytes.length; i += 32768) chunks.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 32768)));
    return btoa(chunks.join(''));
  }
  function decode(text) { return Uint8Array.from(atob(text), function (c) { return c.charCodeAt(0); }); }
  async function open(bytes, name, key) {
    panel = document.querySelector('[data-fb-gp-player]');
    if (!panel) return;
    if (!bytes.length || bytes.length > 8 * 1024 * 1024) { panel.hidden = false; status('Choose a nonempty Guitar Pro file smaller than 8 MB.'); return; }
    if (source === key && api) return;
    close();
    var token = generation;
    source = key;
    panel.hidden = false;
    status('Loading original score: ' + name + '…');
    find('[data-gp-mixer]').replaceChildren();
    find('[data-gp-play]').disabled = find('[data-gp-stop]').disabled = true;
    try {
      var at = await import(new URL('alphaTab.mjs', base).href);
      if (token !== generation) return;
      var current = new at.AlphaTabApi(find('[data-gp-score]'), {
        core: { fontDirectory: new URL('font/', base).href },
        display: { staveProfile: 'ScoreTab' },
        importer: { maxDecodingBufferSize: 16 * 1024 * 1024 },
        player: { playerMode: 'EnabledSynthesizer', soundFont: new URL('soundfont/sonivox.sf2', base).href,
          enableCursor: true, enableUserInteraction: true, scrollElement: find('.fb-gp-paper') }
      });
      api = current;
      function active() { return token === generation && api === current; }
      current.error.on(function (error) { if (active()) status('Original score could not load: ' + (error.message || error)); });
      current.playerReady.on(function () {
        if (!active()) return;
        find('[data-gp-play]').disabled = find('[data-gp-stop]').disabled = false;
        status('Ready. Click a note to seek, or select beats to loop.');
      });
      current.playerStateChanged.on(function (event) {
        if (active()) find('[data-gp-play]').textContent = event.state === 1 ? 'Pause original' : 'Play original';
      });
      current.scoreLoaded.on(function (score) {
        if (!active()) return;
        status((score.title || name) + ' · ' + score.tracks.length + ' tracks · ' + score.tempo + ' BPM');
        var mixer = find('[data-gp-mixer]');
        mixer.replaceChildren();
        score.tracks.forEach(function (track) {
          var row = document.createElement('div'); row.className = 'fb-gp-track';
          var title = document.createElement('strong'); title.textContent = track.name || 'Track ' + (track.index + 1); row.append(title);
          function checkbox(label, value, fn) {
            var wrap = document.createElement('label'), input = document.createElement('input');
            input.type = 'checkbox'; input.checked = value; input.addEventListener('change', function () { fn(input.checked); });
            wrap.append(input, document.createTextNode(' ' + label)); row.append(wrap); return input;
          }
          checkbox('Show', true, function () {
            var selected = Array.from(mixer.querySelectorAll('[data-gp-show]')).filter(function (x) { return x.checked; }).map(function (x) { return score.tracks[Number(x.dataset.gpShow)]; });
            if (!selected.length) { status('Keep at least one track visible.'); row.querySelector('[data-gp-show]').checked = true; return; }
            current.renderTracks(selected);
          }).dataset.gpShow = track.index;
          checkbox('Mute', false, function (value) { current.changeTrackMute([track], value); });
          checkbox('Solo', false, function (value) { current.changeTrackSolo([track], value); });
          var volume = document.createElement('label'), slider = document.createElement('input');
          slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.value = '100'; slider.setAttribute('aria-label', (track.name || 'Track') + ' volume');
          slider.addEventListener('input', function () { current.changeTrackVolume([track], Number(slider.value) / 100); });
          volume.append(document.createTextNode('Volume '), slider); row.append(volume);
          var details = document.createElement('small');
          details.textContent = track.staves.map(function (staff) { return (staff.tuning.length ? 'Tuning: ' + staff.tuning.map(function (midi) { return ['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][midi % 12] + (Math.floor(midi / 12) - 1); }).join('–') : '') + (staff.capo ? ' · Capo ' + staff.capo : ''); }).filter(Boolean).join('; ');
          row.append(details); mixer.append(row);
        });
      });
      find('[data-gp-play]').onclick = function () { if (window.FakeBook) window.FakeBook.stop(); current.playPause(); };
      find('[data-gp-stop]').onclick = function () { current.stop(); };
      var speed = find('[data-gp-speed]'), loop = find('[data-gp-loop]'), click = find('[data-gp-click]'), notation = find('[data-gp-notation]');
      speed.value = '1'; loop.checked = click.checked = false; notation.value = 'ScoreTab';
      speed.onchange = function () { current.playbackSpeed = Number(speed.value); };
      loop.onchange = function () { current.isLooping = loop.checked; };
      click.onchange = function () { current.metronomeVolume = click.checked ? 1 : 0; };
      notation.onchange = function () { current.settings.display.staveProfile = at.StaveProfile[notation.value]; current.updateSettings(); current.render(); };
      find('[data-gp-clear]').onclick = function () { current.playbackRange = null; };
      if (!current.load(bytes, [-1])) throw new Error('Unsupported Guitar Pro score.');
    } catch (error) { if (token === generation) status('Original score could not load: ' + error.message + '. The lead-sheet importer may still read this file.'); }
  }
  window.FakeBookGPPlayer = { state: function () { return api ? { ready: api.isReadyForPlayback, playing: api.playerState === 1, tick: api.tickPosition, speed: api.playbackSpeed, loop: api.isLooping, metronome: api.metronomeVolume } : null; }, open: open, close: close, pause: pause, encode: encode, decode: decode,
    select: function (raw) {
      var data = raw.guitarPro;
      if (data && data.original) open(decode(data.original), data.fileName || raw.title, data.original);
      else close();
    }
  };
}());
