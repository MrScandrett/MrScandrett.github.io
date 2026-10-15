/* Pure song/arrangement helpers shared by the Track Studio UI and tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MusicDawCore = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const secondsPerBeat = project => 60 / project.bpm;
  const barBeats = project => project.sig[0] * 4 / project.sig[1];
  function clipBeats(project, clip) { return clip.type === 'audio' ? clip.duration / secondsPerBeat(project) : clip.length; }
  function clipEnd(project, clip) { return clip.start + clipBeats(project, clip); }
  function songEnd(project) {
    let end = 0;
    project.tracks.forEach(track => track.clips.forEach(clip => { end = Math.max(end, clipEnd(project, clip)); }));
    return end;
  }
  function audible(project, track) {
    const anySolo = project.tracks.some(candidate => candidate.solo);
    return !track.mute && (!anySolo || track.solo);
  }
  return { secondsPerBeat, barBeats, clipBeats, clipEnd, songEnd, audible };
}));
