// Practice fingerings for standard G3–D4–A4–E5 tuning.
const strings = ['G', 'D', 'A', 'E'];
const open = [55, 62, 69, 76];
const openSteps = [25, 29, 33, 37];
const frame = [0, 2, 4, 5, 7, 9, 11];
const maxPosition = 11;
const epsilon = 1e-6;

export const legend = 'Suggested violin fingering: 0 open string · 1 index · 2 middle · 3 ring · 4 little finger. † means review the passage with your teacher.';

export function describe(spot) {
  if (spot.review) return spot.review;
  const finger = spot.finger ? (spot.place ? spot.place + ' ' : '') + 'finger ' + spot.finger : 'open';
  return strings[spot.string] + ' string, ' + finger + ', position ' + spot.position + (spot.shift ? ' (shift)' : '');
}

function placements(pitch, fixed) {
  const choices = [];
  if (pitch.midi > 100) return choices;
  open.forEach((midi, string) => {
    const offset = pitch.midi - midi;
    if (offset < 0) return;
    for (let position = 1; position <= (string === 3 || offset === 0 ? maxPosition : 7); position++) {
      if (fixed && position !== fixed) continue;
      const positionCost = (position - 1) * 0.16;
      if (!offset) {
        choices.push({ string, position, finger: 0, cost: positionCost + (position === 1 ? 0 : 0.2) });
        continue;
      }
      for (let finger = 1; finger <= 4; finger++) {
        const step = position + finger - 1;
        const nominal = frame[step % 7] + 12 * Math.floor(step / 7);
        const adjustment = offset - nominal;
        if (Math.abs(adjustment) > 1) continue;
        const place = adjustment < 0 ? 'low' : adjustment > 0 ? 'high' : '';
        const spellingCost = pitch.diatonic === openSteps[string] + step ? 0 : 1.6;
        const cost = positionCost + spellingCost + (place ? 0.24 : 0) + (finger === 4 ? 0.12 : 0.03);
        choices.push({ string, position, finger, place, cost });
      }
    }
  });
  return choices;
}

function transition(previous, next, repeated) {
  const distance = Math.abs(previous.position - next.position);
  const crossing = Math.abs(previous.string - next.string);
  const shift = distance ? ((previous.finger && next.finger ? 2.8 : 1.9) + distance * 0.35) : 0;
  return shift + crossing * 0.32 + (repeated && (crossing || previous.finger !== next.finger) ? 1.4 : 0);
}

export function plan(model, staffIndices, position) {
  const result = new Map();
  const cache = new Map();
  for (const staff of staffIndices) {
    let phrase = [], until = -Infinity;
    function finishPhrase() {
      if (!phrase.length) return;
      const last = phrase.at(-1);
      let pick = last.states.reduce((best, state) => state.cost < best.cost ? state : best);
      for (let i = phrase.length - 1; i >= 0; i--) {
        const { event } = phrase[i];
        result.set(event, { ...pick.spot, shift: !!pick.previous && pick.previous.spot.position !== pick.spot.position });
        pick = pick.previous;
      }
      phrase = [];
    }
    const events = model.staves[staff].bars.flatMap(bar => bar.events).filter(event =>
      event.kind === 'note' && !event.hidden && event.pitches.some(pitch => !pitch.tiedFrom));
    events.forEach((event, index) => {
      const pitch = event.pitches.find(note => !note.tiedFrom);
      const end = Math.max(...event.pitches.map(note => heldUntilPitch(event, note.midi)));
      const overlap = event.abs < until - epsilon || events[index + 1]?.abs < end - epsilon;
      const ornament = event.graces?.length || event.orn?.some(mark => ['tr', 'mord', 'turn'].includes(mark));
      const polyphony = event.pitches.length !== 1 || overlap;
      if (event.abs > until + epsilon) finishPhrase();
      until = Math.max(until, end);
      const key = pitch.midi + ':' + pitch.diatonic;
      if (!cache.has(key)) cache.set(key, placements(pitch, position));
      const choices = cache.get(key);
      if (polyphony || ornament || !choices.length) {
        finishPhrase();
        result.set(event, { review: polyphony ? 'Plan the double stop, chord, or overlapping voices with your teacher.' :
          ornament ? 'Plan the grace notes or ornament with your teacher.' :
            position ? 'Outside the selected violin hand position.' : 'Outside the supported violin range.' });
        return;
      }
      const prior = phrase.at(-1);
      const repeated = prior?.event.pitches[0].midi === pitch.midi;
      const states = choices.map(spot => {
        if (!prior) return { spot, cost: spot.cost + (spot.position - 1) * 0.55, previous: null };
        let best = Infinity, previous;
        for (const state of prior.states) {
          const cost = state.cost + transition(state.spot, spot, repeated);
          if (cost < best) { best = cost; previous = state; }
        }
        return { spot, cost: best + spot.cost, previous };
      });
      phrase.push({ event, states });
    });
    finishPhrase();
  }
  for (const spot of result.values()) spot.description = describe(spot);
  return result;
}

function heldUntilPitch(event, midi) {
  let last = event;
  while (last.tieTo && last.tieTo.pitches.some(pitch => pitch.midi === midi)) last = last.tieTo;
  return last.abs + last.dur;
}
