/* Music Lab host services. Instrument interfaces live inside channel modules.
 * QWERTY and MIDI feed the DAW's armed channel, never a separate global synth. */
(function () {
  'use strict';
  let midi = null;
  let connecting = null;
  let midiError = '';
  const listeners = new Set();
  const attached = new Set();
  const inputs = () => midi ? [...midi.inputs.values()].filter(input => input.state !== 'disconnected') : [];
  const midiState = () => ({ enabled: !!midi, connecting: !!connecting, supported: !!navigator.requestMIDIAccess, inputs: inputs().map(input => input.name || 'MIDI keyboard'), error: midiError });
  const notifyMidi = () => listeners.forEach(listener => listener(midiState()));
  const held = new Map();
  const keys = ['a', 'w', 's', 'e', 'd', 'f', 't', 'g', 'y', 'h', 'u', 'j', 'k'];
  // The context, iPhone unlock and safety limiter live in assets/js/audio-kit.js.
  window.MusicLabAudio = { context: () => window.AudioKit.context(), output: () => window.AudioKit.output() };
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
    subscribe(listener) { listeners.add(listener); listener(midiState()); return () => listeners.delete(listener); },
    connect() {
      if (connecting) return connecting;
      midiError = '';
      connecting = Promise.resolve().then(async () => {
        if (!navigator.requestMIDIAccess) throw new Error('This browser cannot connect MIDI devices. Use Add & play for on-screen keys or computer keys.');
        midi ||= await navigator.requestMIDIAccess();
        const attach = event => {
          if (event?.port?.type === 'input' && event.port.state === 'disconnected') window.MusicDaw?.allNotesOff();
          const active = new Set(inputs());
          for (const input of attached) if (!active.has(input)) { input.onmidimessage = null; attached.delete(input); }
          for (const input of active) {
            attached.add(input);
            input.onmidimessage = event => {
              const [command, pitch, velocity] = event.data, kind = command & 0xf0;
              if (kind === 0x90 && velocity) window.MusicDaw?.noteOn(pitch, velocity / 127, (command & 15) === 9, event.timeStamp);
              else if (kind === 0x80 || kind === 0x90) window.MusicDaw?.noteOff(pitch, event.timeStamp);
              else if (kind === 0xb0 && (pitch === 120 || pitch === 123)) window.MusicDaw?.allNotesOff();
              else if (kind === 0xb0) window.MusicDaw?.controlChange?.(pitch, velocity / 127, event.timeStamp);
              else if (kind === 0xe0) window.MusicDaw?.pitchBend?.(((velocity << 7) | pitch) / 8192 - 1, event.timeStamp);
            };
          }
          notifyMidi();
        };
        attach(); midi.onstatechange = attach;
        return inputs().map(input => input.name || 'MIDI keyboard');
      }).catch(error => {
        midiError = ['NotAllowedError', 'SecurityError'].includes(error.name)
          ? 'MIDI access was blocked. Allow MIDI in your browser’s site permissions, then choose Connect MIDI keyboard again. You can still use the on-screen keys.'
          : error.message || 'Could not connect MIDI. Check the USB connection and try again.';
        throw new Error(midiError);
      }).finally(() => { connecting = null; notifyMidi(); });
      notifyMidi();
      return connecting;
    }
  };
})();
