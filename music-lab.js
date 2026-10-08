/* Music Lab host services. Instrument interfaces live inside channel modules.
 * QWERTY and MIDI feed the DAW's armed channel, never a separate global synth. */
(function () {
  'use strict';
  let context = null, output = null, midi = null;
  const held = new Map();
  const keys = ['a', 'w', 's', 'e', 'd', 'f', 't', 'g', 'y', 'h', 'u', 'j', 'k'];
  function audioContext() {
    if (!context) {
      context = new (window.AudioContext || window.webkitAudioContext)();
      output = context.createDynamicsCompressor();
      output.threshold.value = -3; output.ratio.value = 12;
      output.connect(context.destination);
    }
    if (context.state !== 'running') context.resume();
    return context;
  }
  window.MusicLabAudio = { context: audioContext, output() { audioContext(); return output; } };
  document.addEventListener('keydown', event => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || !event.target.closest('#trackStudio') || event.target.closest('input, select, textarea, [contenteditable]')) return;
    const index = keys.indexOf(event.key.toLowerCase());
    if (index < 0) return;
    const pitch = (window.MusicDaw?.keyboardBase() || 60) + index;
    if (window.MusicDaw?.noteOn(pitch, .8)) { held.set(event.code, pitch); event.preventDefault(); }
  });
  document.addEventListener('keyup', event => {
    if (!held.has(event.code)) return;
    window.MusicDaw?.noteOff(held.get(event.code)); held.delete(event.code);
  });
  function releaseKeys() { held.forEach(pitch => window.MusicDaw?.noteOff(pitch)); held.clear(); }
  window.addEventListener('blur', releaseKeys);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseKeys(); });
  window.MusicLabMidi = {
    async connect() {
      if (!navigator.requestMIDIAccess) throw new Error('Web MIDI is unavailable here. Use the on-screen instrument or computer keys.');
      midi ||= await navigator.requestMIDIAccess();
      const attach = () => {
        for (const input of midi.inputs.values()) input.onmidimessage = event => {
          const [command, pitch, velocity] = event.data, kind = command & 0xf0;
          if (kind === 0x90 && velocity) window.MusicDaw?.noteOn(pitch, velocity / 127, (command & 15) === 9);
          else if (kind === 0x80 || kind === 0x90) window.MusicDaw?.noteOff(pitch);
          else if (kind === 0xb0 && (pitch === 120 || pitch === 123)) window.MusicDaw?.allNotesOff();
        };
      };
      attach(); midi.onstatechange = attach;
      return [...midi.inputs.values()].map(input => input.name || 'MIDI keyboard');
    }
  };
})();
