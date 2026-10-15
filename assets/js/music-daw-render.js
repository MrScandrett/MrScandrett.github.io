/* Offline-render helpers kept separate from transport and UI state. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MusicDawRender = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  function createContext(channels, frames, sampleRate) {
    const Offline = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
    if (!Offline) throw new Error('Offline audio rendering is not available in this browser.');
    return new Offline(channels, Math.max(1, Math.ceil(frames)), sampleRate);
  }
  function trimTail(buffer, musicSeconds, threshold = 0.0005, paddingSeconds = 0.05) {
    const sr = buffer.sampleRate, min = Math.ceil(musicSeconds * sr);
    let end = min;
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = data.length - 1; i > end; i--) if (Math.abs(data[i]) > threshold) { end = Math.max(end, i); break; }
    }
    end = Math.min(buffer.length, end + Math.round(sr * paddingSeconds));
    return Array.from({ length: buffer.numberOfChannels }, (_, ch) => buffer.getChannelData(ch).slice(0, end));
  }
  return { createContext, trimTail };
}));
