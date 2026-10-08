/* Channel-owned counterparts to Music Lab lessons. A module is mounted only
 * after it is added to a channel. The host supplies note routing and persistence;
 * every controller uses the same track mixer, recorder and instrument engines. */
(function () {
  'use strict';
  const melodic = track => track.kind === 'instrument' && track.instrument !== 'drums';
  const instrument = track => track.kind === 'instrument';
  const registry = {
    keyboard: { name: 'Piano / keyboard experience', role: 'instrument', instrument: 'piano', accepts: instrument, lesson: 'lessons/music/piano.html' },
    guitar: { name: 'Guitar fretboard experience', role: 'instrument', instrument: 'pluck', accepts: instrument, lesson: 'lessons/music/guitar.html' },
    drumkit: { name: 'Drum Kit experience', role: 'instrument', instrument: 'drums', accepts: instrument, lesson: 'lessons/music/drums.html' },
    synthlab: { name: 'Synth + envelope experience', role: 'instrument', instrument: 'synth', accepts: instrument, lesson: 'lessons/physics/waves-and-sound/sound-and-vibration.html' },
    harmony: { name: 'Chords + circle of fifths', accepts: melodic, lesson: 'lessons/music/piano.html' },
    theory: { name: 'Scales + interval listening', accepts: melodic, lesson: 'lessons/music/sheet-music-trainer.html' }
  };
  const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const noteName = pitch => names[pitch % 12] + (Math.floor(pitch / 12) - 1);
  const chords = { major: [0, 4, 7], minor: [0, 3, 7], diminished: [0, 3, 6], augmented: [0, 4, 8], sus2: [0, 2, 7], sus4: [0, 5, 7], dom7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], add9: [0, 4, 7, 14] };
  const scales = { major: [0, 2, 4, 5, 7, 9, 11, 12], minor: [0, 2, 3, 5, 7, 8, 10, 12], pentatonic: [0, 2, 4, 7, 9, 12], blues: [0, 3, 5, 6, 7, 10, 12], chromatic: Array.from({ length: 13 }, (_, i) => i) };

  function mount(host, track, id, api) {
    const controller = new AbortController(), signal = controller.signal;
    const timers = new Set(), held = new Map(), automated = new Set();
    let disposed = false;
    if (!track.experienceState || typeof track.experienceState !== 'object' || Array.isArray(track.experienceState)) track.experienceState = {};
    if (!track.experienceState[id] || typeof track.experienceState[id] !== 'object' || Array.isArray(track.experienceState[id])) track.experienceState[id] = {};
    const state = track.experienceState[id];
    const number=(key,value,min,max)=>{state[key]=Number.isFinite(Number(state[key]))?Math.max(min,Math.min(max,Number(state[key]))):value;};
    if(id==='keyboard'){number('octave',4,1,6);state.octave=Math.round(state.octave);}
    if(id==='guitar'){number('fretBank',0,0,12);state.fretBank=Math.floor(state.fretBank/3)*3;}
    if(id==='harmony'||id==='theory'){number('root',0,0,11);state.root=Math.round(state.root);}
    if(id==='harmony'){if(!Object.hasOwn(chords,state.chord))state.chord='major';if(!['block','up','down'].includes(state.mode))state.mode='block';}
    if(id==='theory'&&!Object.hasOwn(scales,state.scale))state.scale='major';
    if(id==='synthlab'){if(!['sine','triangle','sawtooth','square'].includes(state.wave))state.wave='sawtooth';[['attack',.008,.002,3],['decay',.3,.02,4],['sustain',.7,0,1],['release',.16,.02,5]].forEach(args=>number(...args));number('level',1,0,1);if(typeof state.oscToVca!=='boolean')state.oscToVca=true;if(typeof state.vcaToChannel!=='boolean')state.vcaToChannel=true;}

    function el(tag, text, parent = host, className) {
      const node = document.createElement(tag); if (text) node.textContent = text;
      if (className) node.className = className;
      parent.append(node); return node;
    }
    function on(node, type, callback) { node.addEventListener(type, callback, { signal }); }
    function later(callback, ms) {
      const timer = setTimeout(() => { timers.delete(timer); if (!disposed) callback(); }, ms);
      timers.add(timer); return timer;
    }
    function button(text, callback, parent = host) {
      const node = el('button', text, parent, 'daw-btn'); node.type = 'button';
      if (callback) on(node, 'click', callback); return node;
    }
    function select(label, options, value, changed, parent = host) {
      const wrapper = el('label', label, parent, 'daw-field'), node = el('select', '', wrapper);
      node.setAttribute('aria-label', label);
      options.forEach(([key, text]) => { const option = el('option', text, node); option.value = key; });
      node.value = value; on(node, 'change', () => changed(node.value)); return node;
    }
    function field(label, key, value, min, max, step, parent = host) {
      const wrapper = el('label', label, parent, 'daw-field'), node = el('input', '', wrapper);
      Object.assign(node, { type: 'number', value, min, max, step }); node.setAttribute('aria-label', label);
      node.dataset.experienceParam = key;
      on(node, 'change', () => { state[key] = Math.max(min, Math.min(max, Number(node.value) || min)); api.changed(); }); return node;
    }
    function cancel() {
      timers.forEach(clearTimeout); timers.clear();
      automated.forEach(pitch => api.noteOff(pitch)); automated.clear();
      held.forEach(({ pitch, node }) => { api.noteOff(pitch); node.classList.remove('is-down'); }); held.clear();
    }
    function perform(pitches, length = .5, spacing = 0) {
      cancel(); if (!api.begin()) return;
      pitches.forEach((pitch, i) => {
        const start = () => { if (!api.noteOn(pitch, .8, track.instrument === 'drums')) return; automated.add(pitch); later(() => { api.noteOff(pitch); automated.delete(pitch); }, length * 1000); };
        if (i && spacing) later(start, i * spacing * 1000); else start();
      });
    }
    function hold(pointer, node, velocity) {
      if (!api.begin()) return;
      const pitch = Number(node.dataset.experienceNote);
      if (!api.noteOn(pitch, velocity, track.instrument === 'drums')) return;
      held.set(pointer, { pitch, node }); node.classList.add('is-down');
      const info = host.querySelector('[data-experience-notes]');
      if (info) info.textContent = [...new Set([...held.values()].map(value => value.pitch))].map(noteName).join(' · ');
    }
    function release(pointer) {
      const value = held.get(pointer); if (!value) return;
      held.delete(pointer);
      if (![...held.values()].some(other => other.pitch === value.pitch)) { api.noteOff(value.pitch); value.node.classList.remove('is-down'); }
    }
    function noteController(container) {
      on(container, 'pointerdown', event => {
        const node = event.target.closest('[data-experience-note]'); if (!node || event.button > 0) return;
        event.preventDefault(); container.setPointerCapture(event.pointerId);
        const box = node.getBoundingClientRect(), velocity = Math.max(.3, Math.min(1, .3 + .7 * (event.clientY - box.top) / box.height));
        hold(event.pointerId, node, velocity);
      });
      on(container, 'pointermove', event => {
        const current = held.get(event.pointerId); if (!current || track.instrument === 'drums') return;
        const node = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-experience-note]');
        if (!node || !container.contains(node) || node === current.node) return;
        release(event.pointerId); hold(event.pointerId, node, .8);
      });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => on(container, type, event => release(event.pointerId)));
      on(container, 'keydown', event => {
        const node = event.target.closest('[data-experience-note]'); if (!node || !['Enter', ' '].includes(event.key)) return;
        event.preventDefault(); event.stopPropagation(); if (!event.repeat) hold('key', node, .8);
      });
      on(container, 'keyup', event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); release('key'); } });
      on(container, 'focusout', () => release('key'));
      on(container, 'click', event => {
        const node = event.target.closest('[data-experience-note]');
        if (node && event.detail === 0 && !held.has('key')) perform([Number(node.dataset.experienceNote)], .15);
      });
      on(container, 'contextmenu', event => event.preventDefault());
    }
    function midiControls() {
      const row = el('div', '', host, 'daw-group');
      button('Connect MIDI keyboard', async () => {
        try { const inputs = await window.MusicLabMidi.connect(); if (!disposed) output.textContent = inputs.length ? inputs.join(' · ') + ' → armed channel' : 'MIDI enabled. Connect a keyboard to play the armed channel.'; }
        catch (error) { if (!disposed) output.textContent = error.message; }
      }, row);
      const output = el('p', 'Touch, click, or use A W S E D F T G Y H U J K while focused in the studio. Arm this channel to record.', host, 'daw-note');
      output.setAttribute('role', 'status');
    }
    function keyboard() {
      state.octave ??= 4;
      const row = el('div', '', host, 'daw-group');
      select('Keyboard sound', api.instruments.filter(([key]) => key !== 'drums'), track.instrument, value => api.sound(value), row);
      field('Keyboard octave', 'octave', state.octave, 1, 6, 1, row);
      const keys = el('div', '', host, 'daw-keys'); keys.setAttribute('role', 'group'); keys.setAttribute('aria-label', 'Channel piano keyboard');
      const narrow = window.matchMedia('(max-width: 720px)').matches;
      state.keyBank ??= 0;
      if(narrow) select('Keyboard range', [['0','C–F'],['1','G–C']], String(state.keyBank), value=>{state.keyBank=Number(value);api.changed();},row);
      keys.style.setProperty('--whites', narrow ? '4' : '8');
      const start = (state.octave + 1) * 12, white = narrow ? (state.keyBank ? [7,9,11,12] : [0,2,4,5]) : [0,2,4,5,7,9,11,12], black = narrow ? (state.keyBank ? [[8,1],[10,2]] : [[1,1],[3,2],[6,4]]) : [[1,1],[3,2],[6,4],[8,5],[10,6]];
      white.forEach(offset => { const node = button(noteName(start + offset), null, keys); node.className = 'daw-key'; node.dataset.experienceNote = start + offset; node.setAttribute('aria-label', noteName(start + offset)); });
      black.forEach(([offset, left]) => { const node = button('', null, keys); node.className = 'daw-key is-black'; node.dataset.experienceNote = start + offset; node.setAttribute('aria-label', noteName(start + offset)); node.style.left = `calc(${left * (narrow ? 25 : 12.5)}% - ${narrow ? 8 : 3.75}%)`; node.style.width = narrow ? '16%' : '7.5%'; if(narrow&&left===4)node.style.left='84%'; });
      const output = el('p', 'Play a note or chord.', host, 'daw-note'); output.dataset.experienceNotes = ''; output.setAttribute('role', 'status');
      noteController(keys); midiControls();
    }
    function guitar() {
      el('p', 'Standard tuning, low E to high E. Play a fret to hear and record that string. Several fingers make a chord. Uses the lesson’s plucked-string engine.', host, 'daw-note');
      select('Guitar fret bank', [0,3,6,9,12].map(start=>[String(start),`Frets ${start}–${Math.min(12,start+2)}`]), String(state.fretBank), value=>{state.fretBank=Number(value);api.changed();});
      const scroll = el('div', '', host, 'daw-fret-scroll'), board = el('div', '', scroll, 'daw-fretboard');
      [64, 59, 55, 50, 45, 40].forEach((open, string) => {
        const row = el('div', '', board, 'daw-fret-row'); el('strong', `String ${string + 1}`, row);
        for (let fret = state.fretBank; fret <= Math.min(12,state.fretBank+2); fret++) { const node = button(`${fret} · ${noteName(open + fret)}`, null, row); node.dataset.experienceNote = open + fret; node.setAttribute('aria-label', `String ${string + 1}, fret ${fret}, ${noteName(open + fret)}`); }
      });
      noteController(board); midiControls();
    }
    function drumkit() {
      el('p', 'The same drum synthesis, sample bank and sound editor as Drum Lab. This channel keeps its own kit and tuning.', host, 'daw-note');
      const pads = el('div', '', host, 'daw-pads');
      [[36, 'Kick'], [38, 'Snare'], [42, 'Closed hat'], [46, 'Open hat'], [49, 'Crash'], [51, 'Ride'], [48, 'High tom'], [47, 'Mid tom'], [41, 'Low tom'], [39, 'Clap'], [37, 'Rim'], [56, 'Cowbell']].forEach(([pitch, name]) => {
        const node = button(name, null, pads); node.className = 'daw-pad'; node.dataset.experienceNote = pitch; node.setAttribute('aria-label', name);
      });
      noteController(pads);
      const studio = el('div', '', host);
      const editor = window.DrumStudio.mount(studio, ['kick', 'snare', 'hat', 'ohat', 'crash', 'ride', 'tomHi', 'tomMid', 'tomLo', 'clap', 'rim', 'perc'], (name, options) => api.drum(name, options), {
        persist: false, state: track.drumState,
        onChange(value) { track.drumState = value; api.store(); }
      });
      track.drumState = editor.state(); api.store();
      on(studio, 'change', () => api.changed()); midiControls();
    }
    function synthlab() {
      state.wave ??= 'sawtooth'; state.attack ??= .008; state.decay ??= .3; state.sustain ??= .7; state.release ??= .16;
      const row = el('div', '', host, 'daw-group');
      select('Oscillator waveform', ['sine', 'triangle', 'sawtooth', 'square'].map(value => [value, value]), state.wave, value => { state.wave = value; api.changed(); }, row);
      el('p', 'Patch the oscillator through the amplifier (VCA) into this channel. Every recorded note uses this channel’s waveform, patch and envelope during playback and WAV export.', host, 'daw-note');
      const patch = el('div','',host,'daw-group');
      [['oscToVca','Oscillator → VCA'],['vcaToChannel','VCA → channel']].forEach(([key,label])=>{
        const node=button(label,()=>{if(!api.canConfigure())return;state[key]=!state[key];api.changed();},patch);
        node.classList.add('daw-toggle');node.setAttribute('aria-pressed',String(state[key]));node.dataset.experienceConfig='';node.disabled=!api.canConfigure();
      });
      if(!state.oscToVca||!state.vcaToChannel)el('p','Patch disconnected: this synth is silent. Recorded MIDI notes are kept; reconnect to hear them.',host,'daw-note');
      const wave = el('div','',host,'daw-envelope');
      const shape=x=>state.wave==='sine'?Math.sin(x*2*Math.PI):state.wave==='square'?(x%1<.5?1:-1):state.wave==='sawtooth'?2*(x%1)-1:1-4*Math.abs((x%1)-.5);
      const path=Array.from({length:241},(_,i)=>`${i?'L':'M'}${10+i*1.65},${45-shape(i/48)*30}`).join(' ');
      wave.innerHTML=`<svg viewBox="0 0 420 90" role="img" aria-label="Illustration of the ${state.wave} oscillator waveform, not a live oscilloscope"><path d="M10 45 H406" stroke="currentColor"/><path d="${path}" fill="none" stroke="#7dd3fc" stroke-width="2"/></svg>`;

      const controls = el('div', '', host, 'daw-experience-fields');
      [['level','VCA level',0,1,.05], ['attack', 'Attack (seconds)', .002, 3, .01], ['decay', 'Decay (seconds)', .02, 4, .01], ['sustain', 'Sustain level', 0, 1, .05], ['release', 'Release (seconds)', .02, 5, .01]].forEach(([key, label, min, max, step]) => field(label, key, state[key], min, max, step, controls));
      const visual = el('div', '', host, 'daw-envelope');
      const total=state.attack+state.decay+1+state.release,a=10+395*state.attack/total,d=a+395*state.decay/total,hold=d+395/total;
      visual.innerHTML = `<svg viewBox="0 0 420 125" role="img" aria-label="ADSR envelope: attack rises, decay falls to sustain, release fades to silence"><path d="M10 105 H410 M10 15 V105" fill="none" stroke="currentColor"/><path d="M10 105 L${a} 20 L${d} ${105 - state.sustain * 85} H${hold} L405 105" fill="none" stroke="#7dd3fc" stroke-width="3"/><text x="25" y="120">Attack</text><text x="105" y="120">Decay</text><text x="200" y="120">Sustain</text><text x="320" y="120">Release</text></svg>`;
      const keys = el('div', '', host, 'daw-synth-notes');
      for (let offset = 0; offset <= 12; offset++) { const node = button(noteName(60 + offset), null, keys); node.dataset.experienceNote = 60 + offset; }
      noteController(keys); midiControls();
    }
    function harmony() {
      state.root ??= 0; state.chord ??= 'major'; state.mode ??= 'block';
      const row = el('div', '', host, 'daw-group');
      select('Chord root', names.map((name, i) => [String(i), name]), String(state.root), value => { state.root = Number(value); api.changed(); }, row);
      select('Chord type', Object.keys(chords).map(value => [value, value]), state.chord, value => { state.chord = value; api.changed(); }, row);
      select('Voicing playback', [['block', 'Together'], ['up', 'Arpeggio up'], ['down', 'Arpeggio down']], state.mode, value => { state.mode = value; api.changed(); }, row);
      const pitches = chords[state.chord].map(interval => 60 + state.root + interval);
      el('p', `${names[state.root]} ${state.chord}: ${pitches.map(noteName).join(' · ')}. These notes play and record through this channel’s instrument.`, host, 'daw-note');
      const playChord = root => {
        let notes = chords[state.chord].map(interval => 60 + root + interval);
        if (state.mode === 'down') notes = notes.reverse();
        perform(notes, .6, state.mode === 'block' ? 0 : .22);
      };
      button('Play chord', () => playChord(state.root)); button('Stop notes', cancel);
      const circle = el('div', '', host, 'daw-fifths'); circle.setAttribute('role', 'group'); circle.setAttribute('aria-label', 'Circle of fifths');
      Array.from({ length: 12 }, (_, i) => i * 7 % 12).forEach((root, i) => {
        const node = button(names[root], () => playChord(root), circle); node.style.setProperty('--fifths-angle', `${i * 30}deg`); node.setAttribute('aria-label', `${names[root]} ${state.chord} chord`);
      });
      el('p', 'Clockwise roots rise by a perfect fifth. Compare neighboring chords, then record a progression as one layer.', host, 'daw-note');
    }
    function theory() {
      state.root ??= 0; state.scale ??= 'major';
      const row = el('div', '', host, 'daw-group');
      select('Scale root', names.map((name, i) => [String(i), name]), String(state.root), value => { state.root = Number(value); api.changed(); }, row);
      select('Scale pattern', Object.keys(scales).map(value => [value, value]), state.scale, value => { state.scale = value; api.changed(); }, row);
      const pitches = scales[state.scale].map(interval => 60 + state.root + interval);
      el('p', pitches.map(noteName).join(' → '), host, 'daw-note');
      button('Play scale up', () => perform(pitches, .3, .25)); button('Play scale down', () => perform([...pitches].reverse(), .3, .25)); button('Stop notes', cancel);
      const intervals = el('div', '', host, 'daw-tool-catalog');
      [[3, 'Minor third'], [4, 'Major third'], [7, 'Perfect fifth'], [6, 'Tritone']].forEach(([distance, name]) => button(`${name} · ${distance} semitones`, () => perform([60 + state.root, 60 + state.root + distance], .5, .6), intervals));
      el('p', 'Listen before naming. Compare the distance from the root. Add Sheet notation to see recorded performances on the staff.', host, 'daw-note');
    }
    ({ keyboard, guitar, drumkit, synthlab, harmony, theory })[id]();
    on(window, 'blur', cancel);
    on(document, 'visibilitychange', () => { if (document.hidden) cancel(); });
    return { dispose() { disposed = true; cancel(); controller.abort(); }, stop: cancel };
  }
  window.MusicChannelExperiences = { registry, mount };
})();
