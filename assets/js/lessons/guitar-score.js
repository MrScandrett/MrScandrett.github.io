/* Paired guitar notation and tablature using the shared Bravura engraving symbols.
   Guitar treble notation is written one octave above the sounding MIDI pitch. */
(() => {
  'use strict';
  const MN = window.MusicNotation;
  const opens = [40, 45, 50, 55, 59, 64];
  const ns = 'http://www.w3.org/2000/svg';
  const esc = MN.escape;
  const line = (x1, y1, x2, y2, cls = '') => `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  const text = (x, y, value, cls = '', anchor = 'middle') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${esc(value)}</text>`;

  function pitchFor(n, options) {
    const midi = opens[n.string] + n.fret + 12;
    if (options.scale && options.root != null) {
      const rootName = window.GuitarTheory.PITCHES[options.root];
      const letter = 'CDEFGAB'.indexOf(rootName[0]);
      const interval = (midi - options.root + 120) % 12;
      const index = options.scale.intervals.indexOf(interval);
      const degree = Number(options.scale.degrees[index]?.match(/\d+/)?.[0]);
      if (degree) {
        const l = (letter + degree - 1) % 7;
        const naturals = [0,2,4,5,7,9,11];
        let a = (midi - naturals[l] + 120) % 12;
        if (a > 6) a -= 12;
        if (Math.abs(a) <= 2) {
          const o = (midi - a - naturals[l]) / 12 - 1;
          return MN.parsePitch('CDEFGAB'[l] + ({'-2':'bb','-1':'b',0:'',1:'#',2:'##'}[a]) + o);
        }
      }
    }
    return MN.fromMidi(midi, options.preferFlat);
  }

  function render(host, notes, options = {}) {
    host._guitarScoreObserver?.disconnect();
    host.classList.add('guitar-score');
    let active = -1, lastBars = 0;
    const subdivision = Number(options.subdivision) === 2 ? 2 : 1;
    const perBar = 4 * subdivision;
    function draw() {
      const barsPerSystem = options.printCompact ? 2 : host.clientWidth >= 860 ? 2 : 1;
      if (barsPerSystem === lastBars) return;
      lastBars = barsPerSystem;
      const systems = [];
      const measures = Math.ceil(notes.length / perBar);
      const width = options.printCompact ? 800 : barsPerSystem === 2 ? 1080 : 600;
      const start = 100, right = width - 20;
      const barWidth = (right - start) / barsPerSystem;
      const bottom = 160, space = 12, tabTop = options.printCompact ? 205 : 250, tabGap = options.printCompact ? 12 : 14;
      const pickY = options.printCompact ? 292 : 348, countY = options.printCompact ? 318 : 374;
      for (let bar = 0; bar < measures; bar += barsPerSystem) {
        const count = Math.min(barsPerSystem, measures - bar);
        const end = start + count * barWidth;
        let svg = `<title>${esc(options.title || 'Guitar exercise')} · measures ${bar + 1}–${bar + count}</title>`;
        svg += text(14, 22, `m. ${bar + 1}`, 'gs-measure', 'start');
        for (let i = 0; i < 5; i++) svg += line(12, bottom - i * space, end, bottom - i * space, 'gs-staff');
        for (let i = 0; i < 6; i++) svg += line(12, tabTop + i * tabGap, end, tabTop + i * tabGap, 'gs-staff');
        svg += MN.clef('treble', 18, bottom, space / 2);
        svg += text(34, 188, '8', 'gs-octave');
        svg += text(70, 130, '4', 'gs-time') + text(70, 154, '4', 'gs-time');
        ['T','A','B'].forEach((c,i) => { svg += text(31, tabTop + 20 + i * 18, c, 'gs-tab-clef'); });
        ['e','B','G','D','A','E'].forEach((c,i) => { svg += text(60, tabTop + i * tabGap + 4, c, 'gs-string'); });
        if (!options.printCompact) svg += text(12, 216, 'Pitch', 'gs-row-label', 'start');
        svg += text(12, pickY, 'Pick', 'gs-row-label', 'start');
        svg += text(12, countY, 'Count', 'gs-row-label', 'start');
        for (let localBar = 0; localBar < count; localBar++) {
          const measure = bar + localBar;
          const x0 = start + localBar * barWidth;
          const spacing = (barWidth - 30) / perBar;
          const accidentalState = new Map();
          const positions = [];
          for (let slot = 0; slot < perBar; slot++) {
            const index = measure * perBar + slot;
            const x = x0 + 28 + slot * spacing;
            const n = notes[index];
            if (!n) {
              svg += MN.glyph(subdivision === 2 ? 'rest8' : 'restQuarter', x - 5, 136, space);
              continue;
            }
            const pitch = pitchFor(n, options);
            const y = bottom - (pitch.diatonic - MN.clefs.treble.bottom) * space / 2;
            const step = pitch.diatonic - MN.clefs.treble.bottom;
            const key = `${pitch.l}:${pitch.o}`;
            const previous = accidentalState.get(key) || 0;
            const showAccidental = previous !== pitch.a;
            accidentalState.set(key, pitch.a);
            positions.push({x, y, index, slot});
            const beat = Math.floor(slot / subdivision) + 1;
            const countLabel = subdivision === 2 && slot % 2 ? '&' : beat;
            const description = `Note ${index + 1}, ${MN.pitchNameWithOctave(pitch)} written, string ${6 - n.string}, fret ${n.fret}, ${n.finger ? 'finger ' + n.finger : 'open string'}, count ${countLabel}`;
            svg += `<g class="gs-note" data-note="${index}" data-midi="${opens[n.string]+n.fret}" data-fret="${n.fret}" data-finger="${n.finger}" role="button" tabindex="0" aria-label="${esc(description)}">`;
            svg += `<rect class="gs-hit" x="${x - spacing / 2}" y="30" width="${spacing}" height="354" rx="5"/>`;
            MN.ledgerSteps(step).forEach(s => { svg += line(x-12, bottom-s*6, x+12, bottom-s*6, 'gs-ledger'); });
            if (showAccidental) svg += MN.accidental(pitch.a, x - 23, y, space);
            // Eighth-note stems and beams are drawn together below.
            svg += subdivision === 2 ? MN.glyph('quarter', x - 7.08, y, space) : MN.note(x, y, space, 1, false, true);
            svg += text(x, Math.min(78, y - 63), n.finger || '0', 'gs-finger');
            if (!options.printCompact) svg += text(x, 216, MN.pitchName(pitch), 'gs-pitch');
            const tabY = tabTop + (5 - n.string) * tabGap;
            svg += `<rect class="gs-fret-bg" x="${x-13}" y="${tabY-11}" width="26" height="22" rx="3"/>`;
            svg += text(x, tabY + 5, n.fret, 'gs-fret');
            svg += text(x, pickY, index % 2 ? '↑' : '↓', 'gs-pick');
            svg += text(x, countY, countLabel, 'gs-count');
            svg += '</g>';
          }
          if (subdivision === 2) {
            for (let i = 0; i < positions.length; i += 2) {
              const pair = positions.slice(i, i+2);
              const beamY = Math.min(...pair.map(p => p.y)) - 42;
              pair.forEach(p => { svg += line(p.x + 5.64, p.y, p.x + 5.64, beamY, 'gs-stem'); });
              if (pair.length === 2) svg += line(pair[0].x+5.64, beamY, pair[1].x+5.64, beamY, 'gs-beam');
              else svg += MN.glyph('flag8Up', pair[0].x+5.64, beamY, space);
            }
          }
          svg += line(x0, 112, x0, 160, 'gs-bar') + line(x0, tabTop, x0, tabTop + 5 * tabGap, 'gs-bar');
        }
        svg += line(end,112,end,160,'gs-bar') + line(end,tabTop,end,tabTop+5*tabGap,'gs-bar');
        if (bar + count === measures) svg += line(end-5,112,end-5,160,'gs-bar') + line(end-5,tabTop,end-5,tabTop+5*tabGap,'gs-bar');
        const system = document.createElementNS(ns, 'svg');
        system.setAttribute('viewBox', `0 0 ${width} ${options.printCompact ? 336 : 394}`);
        system.setAttribute('aria-label', `${options.title || 'Guitar exercise'}: staff and tablature, starting at measure ${bar + 1}`);
        system.classList.add('gs-system');
        system.innerHTML = svg;
        const wrapper = document.createElement('div'); wrapper.className = 'gs-system-wrap'; wrapper.append(system); systems.push(wrapper);
      }
      host.replaceChildren(...systems);
      highlight(active, false);
    }
    function highlight(index, follow = true) {
      active = index;
      host.querySelectorAll('.gs-note').forEach(el => {
        const current = Number(el.dataset.note) === index;
        el.classList.toggle('is-current', current);
        el.setAttribute('aria-pressed', String(current));
      });
      if (follow) host.querySelector('.gs-note.is-current')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    const select = event => {
      if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
      const target = event.target.closest('.gs-note');
      if (!target) return;
      event.preventDefault();
      options.onSelect?.(Number(target.dataset.note));
    };
    host.onclick = select; host.onkeydown = select;
    draw();
    host._guitarScoreObserver = new ResizeObserver(draw);
    host._guitarScoreObserver.observe(host);
    return { highlight };
  }
  window.GuitarScore = { render, pitchFor };
})();
