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
  function inputLatencySeconds(stream, overrideMs) {
    if (overrideMs !== null && overrideMs !== undefined && Number.isFinite(overrideMs)) return Math.max(0, Math.min(0.5, overrideMs / 1000));
    const reported = Number(stream?.getAudioTracks?.()[0]?.getSettings?.()?.latency);
    return Number.isFinite(reported) && reported > 0 ? Math.min(0.5, reported) : 0;
  }
  function eventContextTime(context, eventTimeMs, nowMs) {
    const elapsed = Number(nowMs) - Number(eventTimeMs);
    return Number.isFinite(elapsed) && elapsed >= 0 && elapsed <= 250
      ? Math.max(0, context.currentTime - elapsed / 1000) : context.currentTime;
  }
  function captureFrames(chunks, outputChannels) {
    if (!chunks.length) return { length: 0, channelCount: 0, droppedFrames: 0 };
    const first = chunks[0].frame, last = chunks.at(-1);
    const length = Math.max(0, last.frame + last.channels[0].length - first);
    const channelCount = Math.max(...chunks.map(chunk => chunk.channels.length));
    let droppedFrames = 0, nextFrame = first;
    for (const chunk of chunks) {
      const start = chunk.frame - first;
      if (start > nextFrame - first) droppedFrames += start - (nextFrame - first);
      if (outputChannels) for (let ch = 0; ch < channelCount; ch++) outputChannels[ch].set(chunk.channels[ch] || chunk.channels[0], start);
      nextFrame = Math.max(nextFrame, chunk.frame + chunk.channels[0].length);
    }
    return { length, channelCount, droppedFrames };
  }
  function recordingPlacement({ firstFrame, sampleRate, recordTime, recordBeat, stopBeat, secondsPerBeat, outputLatency = 0, inputLatency = 0, trimMs = 0, bufferDuration }) {
    const correction = outputLatency + inputLatency + Math.max(-250, Math.min(250, Number(trimMs) || 0)) / 1000;
    const offsetSeconds = recordTime + correction - firstFrame / sampleRate;
    const start = recordBeat + Math.max(0, -offsetSeconds) / secondsPerBeat;
    const offset = Math.max(0, offsetSeconds);
    const duration = Math.max(0, Math.min(bufferDuration - offset, (stopBeat - start) * secondsPerBeat + 0.05));
    return { start, offset, duration };
  }
  function facts(context) {
    return { sampleRate: context?.sampleRate || null, state: context?.state || 'unavailable', baseLatency: context?.baseLatency ?? null, outputLatency: context?.outputLatency ?? null };
  }
  return { createContext, outputFor, latencySeconds, inputLatencySeconds, eventContextTime, captureFrames, recordingPlacement, facts };
}));
