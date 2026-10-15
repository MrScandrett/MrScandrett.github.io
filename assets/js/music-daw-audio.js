/* Shared runtime facts for the Music Lab audio engine. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MusicDawAudio = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  function createContext(shared) {
    if (shared?.context) return shared.context();
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio is not available in this browser.');
    return new AudioContextClass();
  }
  function outputFor(context, shared) { return shared?.output ? shared.output() : context.destination; }
  function latencySeconds(context) { return (context?.baseLatency || 0) + (context?.outputLatency || 0); }
  function facts(context) {
    return { sampleRate: context?.sampleRate || null, state: context?.state || 'unavailable', baseLatency: context?.baseLatency ?? null, outputLatency: context?.outputLatency ?? null };
  }
  return { createContext, outputFor, latencySeconds, facts };
}));
