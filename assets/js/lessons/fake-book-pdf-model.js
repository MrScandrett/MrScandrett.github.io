/* Pure helpers shared by the local PDF desk and its tests. */
(function (global) {
  'use strict';
  function pageFor(printed, anchors, section) {
    var sorted = anchors.filter(function (a) { return (a.section || 'main') === (section || 'main'); }).sort(function (a, b) { return a.printed - b.printed; });
    var anchor = sorted[0];
    sorted.forEach(function (a) { if (a.printed <= printed) anchor = a; });
    return anchor ? printed + anchor.pdf - anchor.printed : printed;
  }
  function contents(text, section) {
    return text.split(/\n/).map(function (line) {
      var m = line.trim().match(/^(.+?)\s*(?:\.{2,}|\t|\s)\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*$/);
      var entry = m && { title: m[1].replace(/\.+$/, '').trim(), printed: Number(m[2]) };
      if (entry && m[3]) entry.end = Number(m[3]);
      if (entry && section) entry.section = section;
      return entry;
    }).filter(function (x) { return x && x.title && x.printed > 0 && (!x.end || x.end >= x.printed); });
  }
  function chordText(text) {
    return text.replace(/[Δ△^](?:7)?/g, 'maj7').replace(/([A-G][#b]?)-/g, '$1m').replace(/ø(?:7)?/g, 'm7b5').replace(/°/g, 'dim');
  }
  function beats(text) {
    if (!text.trim()) throw new Error('Enter notes or rests in each bar.');
    return text.trim().split(/\s+/).reduce(function (sum, token) {
      var m = token.match(/^(?:[A-G](?:##|bb|#|b)?\d|r)([whqes])(3)?(\.)?(~)?$/);
      if (!m) throw new Error('Unrecognized note “' + token + '”. Use C4q, F#4e, rh, etc.');
      return sum + ({ w: 4, h: 2, q: 1, e: 0.5, s: 0.25 }[m[1]]) * (m[2] ? 2 / 3 : 1) * (m[3] ? 1.5 : 1);
    }, 0);
  }
  function tune(draft, source) {
    var meter = draft.meter.split('/').map(Number), full = meter[0] * 4 / meter[1], pickup = Number(draft.pickup || 0);
    if (!draft.title.trim()) throw new Error('Give the song a title.');
    if (!Number.isInteger(meter[0]) || meter[0] < 1 || meter[0] > 32 || ![2, 4, 8, 16].includes(meter[1])) throw new Error('Use a meter such as 4/4, 3/4 or 6/8.');
    if (!Number.isFinite(Number(draft.tempo)) || Number(draft.tempo) < 40 || Number(draft.tempo) > 240) throw new Error('Tempo must be between 40 and 240 BPM.');
    if (pickup < 0 || pickup >= full || !Number.isFinite(pickup)) throw new Error('Pickup must be shorter than a full bar.');
    if (!draft.bars.length || (pickup && draft.bars.length < 2)) throw new Error('Add at least one full bar after the pickup.');
    draft.bars.forEach(function (bar, i) {
      var want = i === 0 && pickup ? pickup : full;
      if (Math.abs(beats(bar.notes) - want) > 0.0001) throw new Error('Bar ' + (i + 1) + ' needs ' + want + ' quarter-note beats; it has ' + beats(bar.notes) + '.');
      if (i === 0 && pickup && bar.chords.trim()) throw new Error('Leave pickup chords empty; this lead-sheet engine starts harmony at the first full bar.');
      var fixed = 0, free = 0;
      chordText(bar.chords).trim().split(/\s+/).filter(Boolean).forEach(function (c) {
        var m = c.match(/^[A-G](?:#|b)?(?:m7b5|maj7|dim7|sus4|dim|aug|m7|m6|m|7|6|9)?(?:\/[A-G](?:#|b)?)?(?::(\d+(?:\.\d+)?))?$/);
        if (!m) throw new Error('Bar ' + (i + 1) + ': unsupported chord “' + c + '”.');
        if (m[1]) fixed += Number(m[1]); else free++;
      });
      if (fixed > want || (free && fixed >= want) || (fixed && !free && Math.abs(fixed - want) > 0.0001)) throw new Error('Bar ' + (i + 1) + ': chord durations must fill the bar.');
    });
    var tiedPitch = null;
    draft.bars.forEach(function (b, i) {
      b.notes.trim().split(/\s+/).forEach(function (token) {
        var note = token.match(/^([A-G](?:##|bb|#|b)?\d)/);
        if (tiedPitch && (!note || note[1] !== tiedPitch)) throw new Error('Bar ' + (i + 1) + ': a tie must continue into the same written pitch.');
        if (!note && /~$/.test(token)) throw new Error('Rests cannot be tied.');
        tiedPitch = /~$/.test(token) && note ? note[1] : null;
      });
    });
    if (tiedPitch) throw new Error('The final tie needs a following note.');
    return { id: draft.id, title: draft.title.trim(), composer: draft.composer || 'Unknown composer', key: draft.key, mode: draft.mode,
      meter: meter, tempo: Number(draft.tempo) || 96, pickup: pickup, bars: draft.bars.length - (pickup ? 1 : 0),
      melody: draft.bars.map(function (b) { return b.notes.trim(); }).join(' | '),
      chords: draft.bars.slice(pickup ? 1 : 0).map(function (b) { return chordText(b.chords).trim(); }).join(' | '),
      sectionsByBar: draft.bars.reduce(function (labels, b, i) { if (b.section && !(pickup && i === 0)) labels[i + 1 - (pickup ? 1 : 0)] = b.section; return labels; }, {}),
      band: full === 3 ? 'waltz' : 'rock', feel: 'straight', style: 'Manual transcription', level: 'Imported', imported: true,
      source: source, about: 'Manually transcribed from a local PDF. Check pitches, rhythms and form against the scan. Repeats must be written out as individual bars.' + (draft.sourceNote ? ' Source notes: ' + draft.sourceNote : '') };
  }
  global.FakeBookPDFModel = { pageFor: pageFor, contents: contents, chordText: chordText, beats: beats, tune: tune };
})(typeof window !== 'undefined' ? window : globalThis);
