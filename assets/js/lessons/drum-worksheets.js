/* Bounded, one-page practice sequences; notation shares the live lesson renderer. */
(() => {
  'use strict';
  const levels = [
    { title: 'Pulse & coordination', tempo: '50–65', count: '1   2   3   4', goal: 'Keep four equal beats and coordinate hands with a foot.', ready: 'Clap four steady beats while counting aloud.', tasks: [
      ['Steady hands', { snare: [0,4,8,12] }, 'Alternate R L R L. Let the sticks rebound; keep all four strokes even.'],
      ['Find the backbeat', { hat: [0,4,8,12], snare: [4,12] }, 'Tap the pulse with one hand. Add the other hand on 2 and 4.'],
      ['Add your foot', { hat: [0,4,8,12], snare: [4,12], kick: [0,8] }, 'Keep the same hands. Add kick on 1 and 3; practice two limbs first if needed.']
    ], create: 'Write a four-beat body-percussion pattern. Use K for foot, S for clap and H for knee tap.', pass: 'Play four bars with equal spacing, counting aloud without stopping.' },
    { title: 'Eighth-note grooves', tempo: '55–80', count: '1 & 2 & 3 & 4 &', goal: 'Hold steady eighth notes while changing only the kick.', ready: 'Play level 1’s complete groove for four steady bars.', tasks: [
      ['Eight even hi-hats', { hat: [0,2,4,6,8,10,12,14], snare: [4,12], kick: [0,8] }, 'Say every number and &. Keep the hi-hat quieter than the backbeat.'],
      ['An extra kick', { hat: [0,2,4,6,8,10,12,14], snare: [4,12], kick: [0,8,10] }, 'Add kick on the & of 3. Leave every other part unchanged.'],
      ['Lead into the repeat', { hat: [0,2,4,6,8,10,12,14], snare: [4,12], kick: [0,8,14] }, 'Move that extra kick to the & of 4. Do not rush the next beat 1.']
    ], create: 'Write an eighth-note groove with snare on 2 and 4. Change one kick and circle it.', pass: 'Play each groove four times without losing the eighth-note pulse.' },
    { title: 'Sixteenths & control', tempo: '50–75', count: '1 e & a 2 e & a 3 e & a 4 e & a', goal: 'Place notes between hi-hat strokes without speeding up.', ready: 'Keep level 2 steady while speaking its eighth-note counts.', tasks: [
      ['A sixteenth-note pickup', { hat: [0,2,4,6,8,10,12,14], snare: [4,12], kick: [0,7,8] }, 'Say 2 e & a. The extra kick is on the a of 2, just before beat 3.'],
      ['Shift the pickup', { hat: [0,2,4,6,8,10,12,14], snare: [4,12], kick: [0,8,15] }, 'Place the extra kick on the a of 4. Loop slowly across the bar line.'],
      ['Control the quiet stroke', { hat: [0,2,4,6,8,10,12,14], snare: [4,7,12], kick: [0,8] }, 'The bracketed snare on the a of 2 is a ghost note: much quieter than 2 and 4.', { snare: [7] }]
    ], create: 'Write one sixteenth-note kick pickup. Label its count; keep the backbeat on 2 and 4.', pass: 'Loop four bars with accurate pickups and clearly softer ghost notes.' },
    { title: 'Musical independence', tempo: '60–90', count: '1 e & a 2 e & a 3 e & a 4 e & a', goal: 'Keep the pulse through changing textures and phrase endings.', ready: 'Play level 3 slowly with relaxed hands and distinct dynamics.', tasks: [
      ['Continuous sixteenths', { hat: Array.from({length:16}, (_,i)=>i), snare: [4,12], kick: [0,7,8] }, 'Use one hand on hi-hat at a comfortable tempo. Keep snare accents clear.'],
      ['Ghost-note coordination', { hat: [0,2,4,6,8,10,12,14], snare: [3,4,7,11,12,15], kick: [0,8,10] }, 'Bracketed snare notes stay low and quiet; the backbeats remain strong.', { snare: [3,7,11,15] }],
      ['A beat-4 fill', { hat: [0,2,4,6,8,10], snare: [4,12,13], tomHi: [14], tomLo: [15], kick: [0,8] }, 'Play three bars of exercise 1, then this bar. Fill R L R L on beat 4; land on kick + crash at the next 1.']
    ], create: 'Design a beat-4 fill. Label hands R/L, then play three groove bars and one fill bar.', pass: 'Play two four-bar phrases with a controlled fill and an on-time return to 1.' }
  ];
  const el = (tag, text, parent, cls) => { const node = document.createElement(tag); if (text) node.textContent = text; if (cls) node.className = cls; if (parent) parent.append(node); return node; };
  function sheet(index) {
    const level = levels[index], page = el('article', null, null, 'dr-ws-page');
    el('p', `DRUM LAB · LEVEL ${index + 1} OF 4 · 4/4`, page, 'dr-ws-kicker');
    el('h2', level.title, page);
    el('p', 'Name __________________________  Date ______________  Starting BPM ______', page);
    el('p', `Goal: ${level.goal} Suggested starting range: ${level.tempo} BPM; slower is fine.`, page);
    el('p', `Ready? ${level.ready}`, page);
    el('p', 'Count one bar in. Speak → tap one part → combine → repeat four bars. After three clean repetitions add 5 BPM; if time slips, slow down.', page);
    el('p', `Count: ${level.count}`, page, 'dr-ws-count');
    el('p', 'Key: X = hi-hat; middle note = snare; low note = kick; brackets = quiet ghost note. R/L = right/left hand. Read toms by their staff position.', page, 'dr-ws-key');
    level.tasks.forEach(([name, parts, instruction, ghosts], i) => {
      const exercise = el('section', null, page, 'dr-ws-exercise');
      el('h3', `${i + 1}. ${name}`, exercise);
      el('p', instruction, exercise);
      const tracks = {};
      Object.entries(parts).forEach(([instrument, hits]) => { tracks[instrument] = Array.from({length:16}, (_,step) => hits.includes(step) ? ghosts?.[instrument]?.includes(step) ? 'g' : 'x' : '-').join(''); });
      exercise.append(window.DrumLab.renderStaff({name, tracks}, {crop:true}).svg);
      el('p', 'Clean repeats: □ □ □   Starting BPM _____  Comfortable BPM _____', exercise);
    });
    el('h3', '4. Make it yours', page);
    el('p', level.create, page);
    const table = el('table', null, page, 'dr-ws-compose');
    const head = el('tr', null, table);
    ['Part', ...Array.from({length:16}, (_,i)=>i%4===0 ? String(i/4+1) : ['','e','&','a'][i%4])].forEach(t => el('th', t, head).scope = 'col');
    ['Hands','Feet'].forEach(part => { const row = el('tr', null, table); el('th', part, row).scope = 'row'; for(let i=0;i<16;i++) el('td', null, row); });
    el('p', `Ready to progress: ${level.pass} □ Not yet  □ With help  □ Independently`, page);
    el('p', 'Practice log: Date ______ BPM _____ Focus __________________  Next step __________________', page, 'dr-ws-reflect');
    el('p', 'Listen back: What stayed steady? ____________________ What will you change? ____________________', page);
    return page;
  }
  function init() {
    const select = document.getElementById('drWorksheetLevel'), preview = document.getElementById('drWorksheetPreview'), root = document.getElementById('drWorksheetPrintRoot');
    if (!select || !window.DrumLab) return;
    const render = () => preview.replaceChildren(sheet(Number(select.value)));
    select.addEventListener('change', render); render();
    function print(indices) {
      root.replaceChildren(...indices.map(sheet));
      document.body.classList.add('dr-printing-levels');
      window.print();
    }
    document.getElementById('drWorksheetPrint').addEventListener('click', () => print([Number(select.value)]));
    document.getElementById('drWorksheetPrintAll').addEventListener('click', () => print([0,1,2,3]));
    window.addEventListener('afterprint', () => { document.body.classList.remove('dr-printing-levels'); root.replaceChildren(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
