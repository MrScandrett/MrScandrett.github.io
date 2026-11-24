(() => {
  const $ = id => document.getElementById(id);
  const names = ['Whole','Half','Quarter','Eighth','Sixteenth'];
  const symbols = ['\uE1D2','\uE1D3','\uE1D5','\uE1D7','\uE1D9'];
  const descriptions = [
    'Attack on 1 and 2. Both notes last one beat.',
    'Count “1 & 2 &”. Attack on 1, hold through 2, then attack on the & of 2.',
    'Count “1 e & a”. Attack on 1, hold through &, then attack on a.'
  ];
  let row = 2, audio, bus, origin, beat, frame, round, version = 0;
  const dots = [...document.querySelectorAll('.meter i')];
  function stop() {
    version++;
    document.querySelectorAll('.current').forEach(cell => cell.classList.remove('current'));
    cancelAnimationFrame(frame);
    if (bus) bus.disconnect();
    bus = null;
    if (round) $('result').textContent = 'Round stopped.';
    round = null;
    $('pad').disabled = true;
    $('stop').hidden = true;
    dots.forEach(dot => dot.classList.remove('on'));
    document.querySelector('.lit')?.classList.remove('lit');
  }
  function selectRow(index) {
    stop();
    row = index;
    const pieces = 2 ** row;
    const span = 4/pieces;
    const notes = Array.from({length:pieces}, (_,i) => ({
      value:pieces, span, count:i*span % 1 === 0 ? Math.floor(i*span)+1 : ['','e','&','a'][(i*span%1)*4]
    }));
    const shapes = ['An open head with no stem.', 'An open head with a stem.', 'A filled head with a stem.', 'One flag on the stem.', 'Two flags on the stem.'];
    drawRhythm('slice-staff','4/4',[{notes}],names[row]+' note · '+shapes[row]+' Each cookie slice lasts '+span+' '+(span === 1 ? 'beat.' : 'beats.'));
    [...$('rows').children].forEach((button,i) => button.setAttribute('aria-pressed', i === row));
    $('cookie').style.setProperty('--cuts', pieces === 1 ? 'linear-gradient(transparent,transparent)' :
      'repeating-conic-gradient(#80522c 0deg 1.6deg, transparent 1.6deg '+360/pieces+'deg)');
    $('cookie').disabled = $('cut').disabled = row === 4;
    $('join').disabled = row === 0;
    $('fraction').textContent = pieces+' equal '+(pieces === 1 ? 'piece' : 'pieces')+' · '+(4/pieces)+' '+(pieces === 4 ? 'beat' : 'beats')+' per piece';
  }
  names.forEach((name,i) => {
    const button = document.createElement('button');
    button.className = 'row';
    button.setAttribute('aria-label',name+' notes, '+2**i+' per bar');
    button.innerHTML = '<span>'+name+'</span><span class="strip" aria-hidden="true">'+'<b>'+symbols[i]+'</b></span>';
    button.lastChild.innerHTML = ('<b>'+symbols[i]+'</b>').repeat(2**i);
    button.onclick = () => selectRow(i);
    $('rows').append(button);
  });
  $('cut').onclick = $('cookie').onclick = () => selectRow(row+1);
  $('join').onclick = () => selectRow(row-1);
  selectRow(row);
  async function begin() {
    stop();
    const token = version;
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    await audio.resume();
    if (token !== version) return false;
    bus = audio.createGain();
    bus.connect(audio.destination);
    origin = audio.currentTime + .14;
    beat = 60 / Number($('tempo').value);
    $('stop').hidden = false;
    return true;
  }
  function tone(at, duration, pitch, level) {
    const start = origin + at * beat;
    const end = start + duration * beat;
    const osc = audio.createOscillator(), envelope = audio.createGain();
    osc.frequency.value = pitch;
    envelope.gain.setValueAtTime(.001,start);
    envelope.gain.exponentialRampToValueAtTime(level,start+.006);
    envelope.gain.exponentialRampToValueAtTime(.001,end);
    osc.connect(envelope).connect(bus);
    osc.start(start);
    osc.stop(end);
  }
  function clicks(length) {
    for (let i=0;i<length;i++) tone(i,.08,i%4 ? 170 : 230,.22);
  }
  function animate(end, draw, finish = () => {}) {
    function update() {
      const position = (audio.currentTime-origin)/beat;
      if (position >= end) { finish(); stop(); return; }
      draw(position);
      frame = requestAnimationFrame(update);
    }
    update();
  }
  $('hear').onclick = async () => {
    if (!await begin()) return;
    const cells = [...$('rows').children[row].querySelectorAll('b')];
    const length = 4/cells.length;
    clicks(4);
    cells.forEach((_,i) => tone(i*length,length*.98,440,.28));
    animate(4,pos => cells.forEach((cell,i) => cell.classList.toggle('lit',Math.floor(pos/length) === i)));
  };
  const meters = [
    ['2/4', [1,1]], ['3/4', [1,1,1]], ['4/4', [1,1,1,1]],
    ['5/4', [3,2]], ['6/8', [3,3]], ['7/8', [2,2,3]],
    ['9/8', [3,3,3]], ['12/8', [3,3,3,3]]
  ];
  for (const [signature] of meters) $('meter-choice').add(new Option(signature));
  $('meter-choice').value = '3/4';
  function meterPattern() {
    const [signature, groups] = meters[$('meter-choice').selectedIndex];
    const [top, bottom] = signature.split('/').map(Number);
    const simple = bottom === 4;
    const eighths = [];
    groups.forEach((size, group) => {
      const count = simple ? size*2 : size;
      for (let i=0;i<count;i++) {
        const label = simple ? (i%2 ? '&' : String(eighths.length/2+1))
          : (i === 0 ? String(group+1) : (size === 2 ? '&' : ['','la','li'][i]));
        eighths.push({label, group, accent:i === 0, pulse:simple && i%2 === 0});
      }
    });
    return {top, bottom, groups, eighths};
  }
  function showMeter() {
    stop();
    const {top,bottom,groups,eighths} = meterPattern();
    drawRhythm('meter-staff',top+'/'+bottom,[{notes:eighths.map((step,i) => ({value:8,span:1,count:step.label,beam:bottom === 4 ? Math.floor(i/2) : step.group}))}],
      'Each beam joins the eighth notes of one pulse. Tap on the numbered notes.');
    const signature = $('written-meter').children;
    signature[0].textContent = top;
    signature[1].textContent = bottom;
    const strip = $('meter-groups');
    strip.replaceChildren();
    for (const step of eighths) {
      if (step.accent) strip.append(document.createElement('div'));
      const cell = document.createElement('span');
      cell.textContent = step.label;
      strip.lastChild.append(cell);
    }
    const guide = bottom === 4
      ? 'Tap each number and say “and” halfway to the next beat.'
      : 'Tap once per group and speak every eighth note evenly.';
    $('meter-guide').textContent = top+' '+(bottom === 4 ? 'quarter' : 'eighth')+' notes fill this bar. '+guide+
      (top === 5 || top === 7 ? ' This example groups them '+groups.join(' + ')+'.' : '');
  }
  $('meter-choice').onchange = showMeter;
  showMeter();
  $('hear-meter').onclick = async () => {
    if (!await begin()) return;
    const {bottom,groups,eighths} = meterPattern();
    // Tempo follows the quarter in simple meter, dotted quarter in compound
    // meter, and the two-eighth group in this asymmetric 7/8 example.
    const unit = bottom === 4 || groups.includes(2) ? .5 : 1/3;
    const cells = [...$('meter-groups').querySelectorAll('span')];
    for (let i=0;i<2*eighths.length;i++) {
      const step = eighths[i%eighths.length];
      const strong = step.accent || step.pulse;
      tone(i*unit,.09,i%eighths.length === 0 ? 660 : step.accent ? 480 : strong ? 390 : 250,strong ? .3 : .13);
    }
    animate(2*eighths.length*unit,pos => {
      const current = Math.floor(pos/unit)%cells.length;
      cells.forEach((cell,i) => cell.classList.toggle('current',i === current));
    });
  };
  const pairs = [[1,1],[1.5,.5],[.75,.25]];
  $('pair').onchange = () => {
    stop();
    const index = $('pair').selectedIndex;
    $('count').textContent = descriptions[index];
    const notes = [];
    const [first,second] = pairs[index];
    for (let at=0;at<4;at+=first+second) {
      notes.push({value:index === 2 ? 8 : 4,span:first,dot:index>0,count:at+1},
        {value:[4,8,16][index],span:second,count:index === 0 ? at+2 : index === 1 ? '&' : 'a'});
    }
    drawRhythm('dot-staff','4/4',[{notes}],index ? 'The dot extends the first sound. Clap again when you reach the next notehead.' : 'Four quarter notes. Clap once on each number.');
    $('lengths').replaceChildren(...pairs[index].map(duration => {
      const block = document.createElement('b');
      block.style.flexGrow = duration;
      block.textContent = ({1:'1 beat',1.5:'1½ beats',.5:'½ beat',.75:'¾ beat',.25:'¼ beat'})[duration];
      return block;
    }));
  };
  $('pair').onchange();
  $('demo').onclick = async () => {
    if (!await begin()) return;
    const durations = pairs[$('pair').selectedIndex];
    clicks(4);
    let at = 0;
    while (at < 4) for (const duration of durations) {
      tone(at,duration*.98,440,.35);
      at += duration;
    }
    animate(4,pos => {
      const phase = pos % (durations[0] + durations[1]);
      [...$('lengths').children].forEach((cell,i) => cell.classList.toggle('current', pos >= 0 && i === Number(phase >= durations[0])));
    });
  };
  // All voices share the same subdivision clock as the displayed count.
  const grooves = [
    {count:['','&'], hat:[0,1,2,3,4,5,6,7], snare:[2,6], kick:[0,4],
      cue:'Rock • Say “1 & 2 & 3 & 4 &”. Step on every number. Clap on 2 and 4 to feel the backbeat.'},
    {count:['','trip','let'], hat:[0,2,3,5,6,8,9,11], snare:[3,9], kick:[0,6],
      cue:'Shuffle • Say “1-trip-let” evenly. Pat your leg on “1” and “let”. The silent middle slot makes the hi-hat go long–short.'},
    {count:['','e','&','a'], hat:[0,2,4,6,8,10,12,14], snare:[4,12], kick:[0,7,10],
      cue:'Funk • Count “2 e & a 3”. Say “boom” on the a of 2. Keep your foot steady as the kick arrives one sixteenth before beat 3.'}
  ];
  const voices = [['Hi-hat','hat',2100],['Snare','snare',520],['Kick','kick',85]];
  function selectedGroove() { return grooves[$('groove').selectedIndex]; }
  function renderGroove() {
    stop();
    const g = selectedGroove(), n = g.count.length, score = $('score');
    const mode = $('practice').selectedIndex;
    const lanes = voices.map(([name,key]) => {
      const notes = [];
      for (let beat=0;beat<4;beat++) {
        const hits = g[key].filter(step => Math.floor(step/n) === beat);
        if (!hits.length || (hits.length === 1 && hits[0] === beat*n)) {
          notes.push({value:4,span:1,rest:!hits.length,count:beat+1});
          continue;
        }
        for (let i=0;i<n;i++) notes.push({value:n === 4 ? 16 : 8,span:1/n,
          rest:!hits.includes(beat*n+i),triplet:n === 3 && i === 0,count:g.count[i] || beat+1});
      }
      return {name,notes};
    });
    drawRhythm('groove-staff','4/4',lanes,'Read one instrument line at a time. Play each note and stay silent on each rest.'+
      (n === 3 ? ' The bracket marked 3 fits three eighth notes or rests into one beat.' : ' Notes lined up vertically sound together.'));
    score.replaceChildren();
    score.style.setProperty('--steps',4*n);
    for (const [label,key] of [['Count',null],...voices]) {
      const lane = document.createElement('div');
      lane.setAttribute('role','row');
      const title = document.createElement('strong');
      title.setAttribute('role','rowheader');
      title.textContent = label;
      lane.append(title);
      for (let step=0;step<4*n;step++) {
        const cell = document.createElement('span');
        cell.setAttribute('role','cell');
        const syllable = g.count[step%n] || String(1+Math.floor(step/n));
        const hit = key && g[key].includes(step);
        cell.textContent = key ? (hit ? '●' : '·') : syllable;
        if (key) cell.setAttribute('aria-label',hit ? 'Hit' : 'Rest');
        if (hit) cell.classList.add('hit',key);
        if (step%n === 0) cell.classList.add('down');
        lane.append(cell);
      }
      score.append(lane);
    }
    $('coach').textContent = g.cue;
    $('task').textContent = ['Listen for four bars. Follow the colored hits from left to right.',
      'Only the snare plays. Count through the space before each clap.',
      'The snare is silent. Supply its two marked hits yourself each bar.'][mode];
  }
  $('groove').onchange = $('practice').onchange = renderGroove;
  renderGroove();
  $('play-groove').onclick = async () => {
    if (!await begin()) return;
    const g = selectedGroove(), n = g.count.length, mode = $('practice').selectedIndex;
    for (let bar=0;bar<4;bar++) {
      for (const [,key,pitch] of voices) {
        if ((mode === 1 && key !== 'snare') || (mode === 2 && key === 'snare')) continue;
        for (const step of g[key]) tone(bar*4+step/n,key === 'hat' ? .045 : .12,pitch,key === 'hat' ? .08 : .32);
      }
    }
    let previous = -1;
    animate(16,pos => {
      if (pos < 0) return;
      const step = Math.floor(pos*n)%(4*n);
      if (step === previous) return;
      for (const lane of $('score').children) {
        if (previous >= 0) lane.children[previous+1].classList.remove('current');
        lane.children[step+1].classList.add('current');
      }
      previous = step;
    });
  };
  const patterns = [[0,1,2,3],[0,1.5,2,2.5,3.5],[0,1.5,2,2.75,3]];
  function showEcho() {
    stop();
    const pattern = patterns[$('level').selectedIndex];
    const notes = pattern.map((at,i) => {
      const span = (pattern[i+1] ?? 4)-at;
      return {span,value:span>=1 ? 4 : span>=.5 ? 8 : 16,dot:span===1.5 || span===.75,
        count:at%1 === 0 ? at+1 : at%1 === .5 ? '&' : 'a'};
    });
    drawRhythm('echo-staff','4/4',[{notes}],'Clap once at each notehead. Keep counting through the space before your next clap.');
  }
  $('level').onchange = showEcho;
  showEcho();
  $('start').onclick = async () => {
    if (!await begin()) return;
    const pattern = patterns[$('level').selectedIndex];
    round = {pattern, hits:new Set(),extra:0};
    clicks(8);
    pattern.forEach(at => tone(at,.19,740,.34));
    $('result').textContent = 'Listen · remember the high notes.';
    $('pad').focus();
    animate(8.25,pos => {
      dots.forEach((dot,i) => dot.classList.toggle('on',pos>=0 && pos<8 && Math.floor(pos)%4 === i));
      if (pos>=3.8 && $('pad').disabled) {
        $('pad').disabled = false;
        $('pad').focus({preventScroll:true});
        $('result').textContent = 'Your turn · echo the pattern!';
      }
    },() => {
      $('result').textContent = round.hits.size+' of '+pattern.length+' on time · '+round.extra+' extra taps.';
      round = null;
    });
  };
  function clap() {
    if (!round || $('pad').disabled) return;
    const pos = (audio.currentTime-origin)/beat-4;
    const tolerance = Math.min(.23,.145/beat);
    const match = round.pattern.findIndex((at,i) => !round.hits.has(i) && Math.abs(at-pos)<=tolerance);
    if (match < 0) round.extra++;
    else round.hits.add(match);
    tone(pos+4,.09,510,.22);
  }
  $('pad').onpointerdown = clap;
  $('pad').onclick = event => {if (event.detail === 0) clap();};
  document.addEventListener('keydown',event => {
    if (event.key === 'Escape') stop();
    if (round && event.code === 'Space' && !['SELECT','INPUT'].includes(event.target.tagName)) {
      event.preventDefault();
      if (!event.repeat) clap();
    }
  });
  $('stop').onclick = $('tempo').onchange = stop;
  document.addEventListener('visibilitychange',() => {if (document.hidden) stop();});
})();
