/* Shared drum sound editor for the lesson builder and Music Lab DAW. */
(function () {
  'use strict';
  var E = window.DrumEngine, key = 'classroomos.drumStudio.v1';
  var fields = [
    ['tune', 'Tune', -24, 24, 1, 0, ' st'], ['decay', 'Decay', .1, 2, .05, 1, '×'],
    ['tone', 'Tone', 200, 18000, 100, 18000, ' Hz'], ['drive', 'Drive', 0, 1, .05, 0, ''],
    ['level', 'Level', 0, 1, .05, .8, ''], ['pan', 'Pan', -1, 1, .05, 0, '']
  ];
  function defaults(id, lane) {
    lane = E.aliases[lane] || lane;
    var o = { sample: E.kits[id].map[lane] || lane };
    fields.forEach(function (f) { o[f[0]] = f[5]; });
    if (id === 'electronic') { o.drive = .25; o.decay = lane === 'kick' ? 1.3 : .7; }
    if (id === 'brush') { o.tone = 8000; o.level = .65; }
    return o;
  }
  function mount(host, lanes, preview) {
    var state = { kit: 'studio', lanes: {} }, selected = lanes[0];
    try {
      var saved = JSON.parse(localStorage.getItem(key));
      if (saved && E.kits[saved.kit]) {
        state.kit = saved.kit;
        lanes.forEach(function (lane) {
          var raw = saved.lanes && saved.lanes[E.aliases[lane] || lane], o = defaults(state.kit, lane);
          if (raw && E.samples[raw.sample]) {
            o.sample = raw.sample;
            fields.forEach(function (f) { if (Number.isFinite(raw[f[0]])) o[f[0]] = Math.max(f[2], Math.min(f[3], raw[f[0]])); });
          }
          state.lanes[E.aliases[lane] || lane] = o;
        });
      }
    } catch (_) {}
    function options(lane) {
      lane = E.aliases[lane] || lane;
      return state.lanes[lane] || (state.lanes[lane] = defaults(state.kit, lane));
    }
    function save() { try { localStorage.setItem(key, JSON.stringify(state)); } catch (_) {} }
    function el(tag, text, parent) { var e = document.createElement(tag); if (text) e.textContent = text; (parent || host).appendChild(e); return e; }
    host.classList.add('drum-studio');
    el('h3', 'Drum sound studio');
    el('p', 'Choose an arranged kit, then reshape each lane. These locally synthesized samples are shared with Music Lab. Tune changes pitch and playback speed; decay shortens the tail; tone darkens it; drive adds saturation.');
    var top = el('div'); top.className = 'drum-studio-top';
    function select(title, entries, parent) {
      var label = el('label', title, parent), sel = el('select', '', label);
      sel.setAttribute('aria-label', title);
      entries.forEach(function (pair) { var opt = el('option', pair[1], sel); opt.value = pair[0]; }); return sel;
    }
    var kit = select('Overall drumkit', Object.keys(E.kits).map(function (id) { return [id, E.kits[id].name]; }), top);
    kit.value = state.kit;
    var lane = select('Edit lane', lanes.map(function (id) { return [id, E.samples[E.aliases[id] || id][0]]; }), top);
    var sound = select('Sample', Object.keys(E.samples).map(function (id) { return [id, E.samples[id][0]]; }), top);
    var audition = el('button', '▶ Audition lane', top); audition.type = 'button';
    var reset = el('button', 'Reset lane', top); reset.type = 'button';
    var knobs = el('div'); knobs.className = 'drum-studio-knobs';
    var controls = {};
    fields.forEach(function (f) {
      var label = el('label', f[1], knobs), output = el('output', '', label), input = el('input', '', label);
      input.setAttribute('aria-label', f[1]);
      input.type = 'range'; input.min = f[2]; input.max = f[3]; input.step = f[4];
      controls[f[0]] = { input: input, output: output };
      input.addEventListener('input', function () { options(selected)[f[0]] = +input.value; output.textContent = input.value + f[6]; save(); });
    });
    var status = el('p'); status.className = 'drum-studio-status'; status.setAttribute('role', 'status');
    function render() {
      var o = options(selected); sound.value = o.sample;
      fields.forEach(function (f) { controls[f[0]].input.value = o[f[0]]; controls[f[0]].output.textContent = o[f[0]] + f[6]; });
      status.textContent = E.kits[state.kit].name + ' · ' + E.samples[o.sample][0] + ' on ' + selected + '. Sound settings save automatically.';
    }
    kit.addEventListener('change', function () { state.kit = kit.value; state.lanes = {}; lanes.forEach(options); save(); render(); });
    lane.addEventListener('change', function () { selected = lane.value; render(); });
    sound.addEventListener('change', function () { options(selected).sample = sound.value; save(); render(); preview(selected, options(selected)); });
    audition.addEventListener('click', function () { preview(selected, options(selected)); });
    reset.addEventListener('click', function () { state.lanes[E.aliases[selected] || selected] = defaults(state.kit, selected); save(); render(); });
    render(); return { options: options };
  }
  window.DrumStudio = { mount: mount };
})();
