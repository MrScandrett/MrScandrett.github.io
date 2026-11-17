// Shared responses for the local server and the static Pages build.
function scoreTitles(scores) {
  return Object.fromEntries(Object.entries(scores).map(([id, score]) => [id, score.title]));
}

function scorePreview(score) {
  const opening = notes => notes.split('|').slice(0, 12).join('|').replace(/:\s*$/, '');
  const staves = score.staves.map(staff => staff.voices
    ? { ...staff, voices: staff.voices.map(voice => ({ ...voice, notes: opening(voice.notes) })) }
    : { ...staff, notes: opening(staff.notes) });
  const { title, key, time, pickup, startMeasure, pitchLettersOnly, grand, tempo, tempoUnit, tempoText, source } = score;
  return { title, key, time, pickup, startMeasure, pitchLettersOnly, grand, tempo, tempoUnit, tempoText, source, staves, ending: 'open' };
}

module.exports = { scoreTitles, scorePreview };
