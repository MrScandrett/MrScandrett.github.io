/* Short classroom adaptations; not numbered reproductions of Hanon's score. */
(() => {
  'use strict';
  const levels = [
    {title:'Five-note foundations', ready:'Find C and use finger numbers 1–5 with a comfortable hand.', goal:'Keep a steady pulse and release freely.', tasks:[
      ['Even steps','C4 D4 E4 F4 G4 F4 E4 D4','1 2 3 4 5 4 3 2','Play one quarter note per beat. First sing, then play right hand alone.'],
      ['Return to home','C4 D4 E4 D4 C4 D4 E4 C4','1 2 3 2 1 2 3 1','Play softly, then moderately. Keep the beat unchanged.'],
      ['Touch contrast','C4 E4 D4 F4 E4 D4 C4 C4','1 3 2 4 3 2 1 1','Play connected, then detached. Leave silence after the final note.']
    ], transfer:'Invent a four-note answer using C–G. Circle the note your phrase moves toward.', pass:'Two steady, comfortable repetitions with an audible difference between connected and detached touch.'},
    {title:'Hanon-style sequences', ready:'Play five-note patterns evenly without holding tension.', goal:'Move a small pattern by step; listen for evenness, not speed.', tasks:[
      ['A repeating cell','C4 E4 F4 G4 A4 G4 F4 E4','1 2 3 4 5 4 3 2','Right hand alone. This classroom cell uses the opening contour of Hanon No. 1; it is not the complete exercise.'],
      ['Move one step','D4 F4 G4 A4 B4 A4 G4 F4','1 2 3 4 5 4 3 2','Shift the whole hand. Alternate this cell with the first; rest between cells before joining.'],
      ['Reverse the contour','A4 F4 E4 D4 C4 D4 E4 F4','5 4 3 2 1 2 3 4','An adapted descending cell. Play quarter notes first; later try two even eighth notes per beat.']
    ], transfer:'Shape each cell toward its highest note, then try the same direction in two bars of your piece.', pass:'Join two cells evenly, release comfortably, and describe one change in sound.'},
    {title:'Scales & arpeggios', ready:'Move between positions comfortably; learn crossings with a teacher if needed.', goal:'Coordinate travel without an accented thumb.', tasks:[
      ['C major up','C4 D4 E4 F4 G4 A4 B4 C5','1 2 3 1 2 3 4 5','Right hand. Play one note per beat; isolate E–F before joining. Reverse notes and fingering to descend.'],
      ['C major left hand','C3 D3 E3 F3 G3 A3 B3 C4','5 4 3 2 1 3 2 1','Left hand alone, one note per beat. Isolate G–A. The bass-register note names below specify the intended octave.'],
      ['Broken triad','C4 E4 G4 C5 G4 E4 C4 C4','1 2 3 5 3 2 1 1','Right hand, one note per beat. Move the arm with the hand. Use C–E–G only if an octave is uncomfortable.']
    ], transfer:'Find a scale fragment or broken chord in your piece. Mark a practical fingering and practice only that fragment.', pass:'An even crossing at a comfortable tempo and the same movement applied to a musical phrase.'},
    {title:'Balance & musical control', ready:'Play a short melody steadily and coordinate a held bass note.', goal:'Control phrase direction and accompaniment balance.', tasks:[
      ['A singing phrase','C4 D4 E4 G4 A4 G4 E4 C4','1 2 3 4 5 4 3 1','Right hand, one note per beat. Sing first; choose a destination and ease away afterward.'],
      ['Quiet bass, clear melody','E4 G4 E4 D4 C4 D4 E4 C4','3 5 3 2 1 2 3 1','Right hand quarter notes. Left hand holds C3 with finger 5 for each four-beat bar. Keep bass quieter.'],
      ['Chord travel','C4 E4 G4 E4 C4 F4 A4 F4','1 2 3 2 1 3 5 3','Right hand quarter notes: one bar of C harmony, then F. Practice without pedal; optionally add a clean pedal change at F.']
    ], transfer:'Play two bars of repertoire twice: first equal loudness, then a clear melody over quieter accompaniment. Describe the difference.', pass:'A listener can hear phrase direction and a quieter bass without loss of pulse.'}
  ];
  const add = (tag, text, parent, cls) => { const n=document.createElement(tag); if(text) n.textContent=text; if(cls) n.className=cls; if(parent) parent.append(n); return n; };
  function sheet(index) {
    const level=levels[index], page=add('article',null,null,'pno-sheet');
    add('p',`PIANO STUDIO · SHEET ${index+1} OF 4 · CLASSROOM ADAPTATION`,page,'pno-sheet-kicker');
    add('h3',level.title,page);
    add('p','Name ____________________ Date __________ BPM ______',page);
    add('p',`Ready? ${level.ready}`,page);
    add('p',`Goal: ${level.goal}`,page);
    add('p','Start around 40–60 quarter-note beats/minute, or slower. Count 1–2–3–4; each row is two bars. Hands separately first. Rest after each attempt; stop if pain or tension appears. No forced finger lifting.',page);
    level.tasks.forEach(([title,notes,fingers,instruction],i) => {
      const task=add('section',null,page,'pno-sheet-task'); add('h4',`${i+1}. ${title}`,task); add('p',instruction,task);
      // Shared lesson renderer provides the same pitch spelling and noteheads as the live reading tool.
      const staff=add('div',null,task,'pno-sheet-staff');
      window.PianoTheory.renderStaff(staff,notes.split(' ').map(spelling=>({absIndex:window.MusicNotation.parsePitch(spelling).midi-60,spelling,dur:1})),{showLabels:false,cellWidth:48});
      const table=add('table',null,task); add('caption','Notes and suggested finger numbers · 1 = thumb, 5 = little finger',table);
      [['Count','1','2','3','4','1','2','3','4'],['Note',...notes.split(' ')],['Finger',...fingers.split(' ')]].forEach(row=>{const tr=add('tr',null,table);row.forEach((v,j)=>{const cell=add(j?'td':'th',v,tr);if(!j)cell.scope='row';});});
      add('p','Comfortable, accurate repeats: □ □ □   Listen for __________________',task);
    });
    add('h4','4. Make music',page); add('p',level.transfer,page);
    add('p','My phrase / fingering: ___________________________________________________',page);
    add('p',`Ready to progress: ${level.pass} □ With help □ Independently □ Revisit`,page);
    add('p','What improved? ____________________ Next small goal ____________________',page);
    add('p','Hanon context and original score links: lessons/music/instruments/piano.html#piano-worksheets',page,'pno-sheet-credit');
    return page;
  }
  function init(){
    const select=document.getElementById('pnoSheetLevel'),preview=document.getElementById('pnoSheetPreview'),root=document.getElementById('pnoSheetPrintRoot');
    if(!select || !window.PianoTheory?.renderStaff) return;
    function fitScores(container){container.querySelectorAll('svg').forEach(svg=>{const box=svg.getBBox();svg.setAttribute('viewBox',`${box.x-6} ${box.y-6} ${box.width+12} ${box.height+12}`);});}
    const render=()=>{preview.replaceChildren(sheet(Number(select.value)));fitScores(preview);};
    select.addEventListener('change',render);render();
    function print(indices){root.replaceChildren(...indices.map(sheet));document.body.classList.add('pno-printing-sheets');fitScores(root);window.print();}
    document.getElementById('pnoSheetPrint').addEventListener('click',()=>print([Number(select.value)]));
    document.getElementById('pnoSheetPrintAll').addEventListener('click',()=>print([0,1,2,3]));
    window.addEventListener('afterprint',()=>{document.body.classList.remove('pno-printing-sheets');root.replaceChildren();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
