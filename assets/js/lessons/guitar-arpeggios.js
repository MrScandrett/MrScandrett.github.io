/* Major-key triad routes. All pitches, spellings, fret maps and tabs derive from
   one scale; standard-tuning MIDI runs low E (40) to high e (64). */
document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  var GT = window.GuitarTheory, audio = window.GuitarAudio;
  var $ = function (id) { return document.getElementById(id); };
  if (!GT || !$('arpKey')) return;
  var keys = [
    ['C',0,['C','D','E','F','G','A','B']], ['D♭',1,['D♭','E♭','F','G♭','A♭','B♭','C']],
    ['D',2,['D','E','F♯','G','A','B','C♯']], ['E♭',3,['E♭','F','G','A♭','B♭','C','D']],
    ['E',4,['E','F♯','G♯','A','B','C♯','D♯']], ['F',5,['F','G','A','B♭','C','D','E']],
    ['G♭',6,['G♭','A♭','B♭','C♭','D♭','E♭','F']], ['G',7,['G','A','B','C','D','E','F♯']],
    ['A♭',8,['A♭','B♭','C','D♭','E♭','F','G']], ['A',9,['A','B','C♯','D','E','F♯','G♯']],
    ['B♭',10,['B♭','C','D','E♭','F','G','A']], ['B',11,['B','C♯','D♯','E','F♯','G♯','A♯']]
  ];
  var scale = [0,2,4,5,7,9,11], romans = ['I','ii','iii','IV','V','vi','vii°'];
  var suffixes = ['', 'm', 'm', '', '', 'm', 'dim'];
  var presets = { cadence:[0,1,4,0], '251':[1,4,0], turnaround:[0,5,1,4,0], pop:[0,4,5,3,0], ladder:[0,1,2,3,4,5,6,0] };
  var tuning = [40,45,50,55,59,64], labels = ['E (6)','A (5)','D (4)','G (3)','B (2)','e (1)'];
  var degree = 0, bar = 0, custom = [0,1,4,0], route = presets.cadence.slice();
  var paths = [], timers = [], playing = false, question = 0, questionCount = 0;
  function node(tag, cls, text) {
    var e = document.createElement(tag); if (cls) e.className = cls;
    if (text != null) e.textContent = text; return e;
  }
  function key() { return keys[+$('arpKey').value]; }
  function pcs() { return scale.map(function (iv) { return (key()[1]+iv)%12; }); }
  function triad(d) { return [d,(d+2)%7,(d+4)%7]; }
  function chordName(d) { return key()[2][d]+(suffixes[d]==='dim'?'°':suffixes[d]); }
  function roles(d) { return ['1',d===0||d===3||d===4?'3':'♭3',d===6?'♭5':'5']; }
  function roleClass(i) { return ['arp-role-root','arp-role-third','arp-role-fifth'][i]; }
  function noteName(midi) { return key()[2][pcs().indexOf(midi%12)]; }
  function pitchName(midi) { return noteName(midi)+(Math.floor(midi/12)-1); }
  function button(text, action, cls) {
    var e = node('button', cls || 'gc-btn', text); e.type='button'; e.onclick=action; return e;
  }
  function stop() {
    timers.forEach(clearTimeout); timers=[];
    if (playing) $('arpStatus').textContent='Stopped. Replay starts from the first bar.';
    playing=false;
    document.querySelectorAll('#arpeggios .arp-sounding').forEach(function (e) { e.classList.remove('arp-sounding'); });
  }
  function stopAll() { $('studioStop').click(); }
  window.addEventListener('guitar-studio-stop',stop);
  function later(fn, ms) { timers.push(setTimeout(fn,ms)); }
  function positions() {
    var out=[], start=+$('arpPosition').value;
    tuning.forEach(function (open,s) { for (var f=start;f<=start+4;f++) out.push({midi:open+f,s:s,f:f}); });
    return out;
  }
  function choosePositions(targets, available) {
    // Dynamic programming keeps the printed path compact across strings/frets.
    var layers=[];
    targets.forEach(function (midi,i) {
      var candidates=available.filter(function (p) { return p.midi===midi; });
      var layer=candidates.map(function (p) {
        if (!i) return {note:p,cost:p.f*.02,prev:null};
        var best=null;
        layers[i-1].forEach(function (prev) {
          var cost=prev.cost+Math.abs(p.f-prev.note.f)+Math.abs(p.s-prev.note.s)*.7;
          if (!best || cost<best.cost) best={note:p,cost:cost,prev:prev};
        });
        return best;
      }).filter(Boolean);
      layers.push(layer);
    });
    if (!layers.length || layers.some(function (layer) { return !layer.length; })) return null;
    var tail=layers[layers.length-1].reduce(function (a,b) { return a.cost<b.cost?a:b; });
    var notes=[], cost=tail.cost;
    while (tail) { notes.unshift(tail.note); tail=tail.prev; }
    return {notes:notes,cost:cost};
  }
  function makePath(d, previous) {
    var available=positions(), chordPCs=triad(d).map(function (i) { return pcs()[i]; });
    var mode=$('arpPath').value, rotation=mode==='third'?1:mode==='fifth'?2:0, candidates=[];
    available.forEach(function (start) {
      var role=chordPCs.indexOf(start.midi%12);
      if (role<0 || (mode!=='connected' && role!==rotation)) return;
      var targets=[start.midi], pitch=start.midi;
      for (var i=1;i<3;i++) {
        var pc=chordPCs[(role+i)%3]; do { pitch++; } while (pitch%12!==pc); targets.push(pitch);
      }
      targets.push(start.midi+12);
      var path=choosePositions(targets,available);
      if (!path) return;
      path.rotation=role;
      path.cost+=previous?Math.abs(path.notes[0].midi-previous.midi)*1000+Math.abs(path.notes[0].f-previous.f)*.2: start.midi*.05;
      candidates.push(path);
    });
    candidates.sort(function (a,b) { return a.cost-b.cost; });
    return candidates.length?candidates[0].notes:[];
  }
  function rebuildPaths() {
    var previous=null;
    paths=route.map(function (d) {
      var path=makePath(d,$('arpPath').value==='connected'?previous:null);
      if (path.length) previous=path[path.length-1];
      return path;
    });
  }
  function selectedPath() { return route[bar]===degree?paths[bar]:makePath(degree,null); }
  function activate(d,index) {
    degree=d; if (index!=null) bar=index;
    document.querySelectorAll('#arpFamily button').forEach(function (b,i) { b.setAttribute('aria-pressed',String(i===degree)); });
    document.querySelectorAll('#arpTimeline button').forEach(function (b,i) { b.setAttribute('aria-pressed',String(i===bar && route[i]===degree)); });
    renderDetail();
  }
  function renderFamily() {
    $('arpKeyHeading').textContent=key()[0]+' major: seven notes, seven triads';
    $('arpScale').replaceChildren(); $('arpFamily').replaceChildren();
    key()[2].forEach(function (name,i) {
      var tone=node('span','',name); tone.appendChild(node('small','', 'Key degree '+(i+1))); $('arpScale').appendChild(tone);
      var b=button('',function () { stopAll(); activate(i); },'arp-family-chord');
      b.appendChild(node('strong','',romans[i]+' · '+chordName(i)));
      b.appendChild(node('span','',triad(i).map(function (n) { return key()[2][n]; }).join('–')));
      b.appendChild(node('small','', 'Key '+triad(i).map(function (n) { return n+1; }).join('–')));
      b.setAttribute('aria-pressed',String(i===degree)); $('arpFamily').appendChild(b);
    });
  }
  function renderTimeline() {
    $('arpTimeline').replaceChildren();
    route.forEach(function (d,i) {
      var b=button('',function () { stopAll(); activate(d,i); },'arp-bar'); b.dataset.bar=i;
      b.appendChild(node('small','', 'Bar '+(i+1))); b.appendChild(node('strong','',romans[d])); b.appendChild(node('span','',chordName(d)));
      b.appendChild(node('small','', paths[i].map(function (p) { return noteName(p.midi); }).join('–')));
      b.setAttribute('aria-pressed',String(i===bar && d===degree)); $('arpTimeline').appendChild(b);
    });
  }
  function renderDetail() {
    var tones=triad(degree), rel=roles(degree), path=selectedPath();
    $('arpChordHeading').textContent=romans[degree]+' · '+chordName(degree)+' in '+key()[0]+' major';
    $('arpFormula').textContent='Stack alternate scale notes: '+tones.map(function (n) { return n+1; }).join('–')+' in the key. Chord formula: '+rel.join('–')+'.';
    $('arpToneTable').replaceChildren();
    tones.forEach(function (n,i) {
      var tone=node('div',roleClass(i)); tone.appendChild(node('strong','',key()[2][n]));
      tone.appendChild(node('span','', 'Key degree '+(n+1))); tone.appendChild(node('span','', 'Chord tone '+rel[i])); $('arpToneTable').appendChild(tone);
    });
    renderBoard(path); renderTab(path);
    $('arpBoardHelp').textContent='High e string is on top. Bright notes belong to '+chordName(degree)+'. Numbered rings trace the four-note tab path; repeated octaves belong to the same triad. All shown notes are clickable.';
  }
  function renderBoard(path) {
    var board=$('arpBoard'), start=+$('arpPosition').value, chord=triad(degree), scalePC=pcs(); board.replaceChildren();
    var head=node('div','arp-board-row arp-board-head'); head.appendChild(node('span','','String'));
    for (var f=start;f<=start+4;f++) head.appendChild(node('span','', f===0?'Open':String(f))); board.appendChild(head);
    [5,4,3,2,1,0].forEach(function (s) {
      var row=node('div','arp-board-row'); row.appendChild(node('span','arp-string-label',labels[s]));
      for (var fret=start;fret<=start+4;fret++) {
        (function (f) {
          var midi=tuning[s]+f, n=scalePC.indexOf(midi%12), role=chord.indexOf(n);
          var shown=n>=0 && (role>=0 || $('arpContext').checked);
          var b=button('',function () {
            stopAll(); audio.pluck(GT.noteFreq(s,f)); markNote({s:s,f:f,midi:midi},-1);
            $('arpStatus').textContent=pitchName(midi)+' · string '+(6-s)+', fret '+f+' · key degree '+(n+1)+(role>=0?' · chord tone '+roles(degree)[role]:' · other scale tone');
          },'arp-fret'+(role>=0?' '+roleClass(role):''));
          b.disabled=!shown; b.dataset.string=s; b.dataset.fret=f;
          b.setAttribute('aria-label',shown?pitchName(midi)+', string '+(6-s)+', fret '+f+', key degree '+(n+1)+(role>=0?', chord tone '+roles(degree)[role]:''): 'String '+(6-s)+', fret '+f);
          if (shown) b.appendChild(node('span','arp-note',key()[2][n]));
          var steps=[]; path.forEach(function (p,i) { if (p.s===s&&p.f===f) steps.push(i+1); });
          if (steps.length) { b.classList.add('arp-path-note'); b.appendChild(node('small','arp-step',steps.join('/'))); }
          row.appendChild(b);
        })(fret);
      }
      board.appendChild(row);
    });
  }
  function renderTab(path) {
    var host=$('arpTab'); host.replaceChildren();
    if (!path.length) { host.textContent='No complete octave path in this window. Choose another fret window.'; return; }
    var table=node('table'); table.appendChild(node('caption','',chordName(degree)+' arpeggio · four quarter notes'));
    var head=node('thead'), row=node('tr'), corner=node('th','','String / beat'); corner.scope='col'; row.appendChild(corner);
    path.forEach(function (p,i) { var th=node('th','','Beat '+(i+1)); th.scope='col'; row.appendChild(th); }); head.appendChild(row); table.appendChild(head);
    var body=node('tbody');
    [5,4,3,2,1,0].forEach(function (s) {
      var r=node('tr'), th=node('th','',labels[s]); th.scope='row'; r.appendChild(th);
      path.forEach(function (p,i) {
        var cell=node('td');
        if (p.s===s) {
          var b=button(String(p.f),function () { stopAll(); audio.pluck(GT.noteFreq(p.s,p.f)); markNote(p,i); $('arpStatus').textContent='Beat '+(i+1)+': '+pitchName(p.midi)+', string '+(6-p.s)+', fret '+p.f; },'arp-tab-note');
          b.dataset.step=i; b.setAttribute('aria-label','Beat '+(i+1)+', '+pitchName(p.midi)+', string '+(6-s)+', fret '+p.f); cell.appendChild(b);
        } else cell.textContent='—'; r.appendChild(cell);
      }); body.appendChild(r);
    });
    var foot=node('tfoot'), r=node('tr'), footer=node('th','','Note / chord tone'); footer.scope='row'; r.appendChild(footer);
    path.forEach(function (p) { var role=triad(degree).indexOf(pcs().indexOf(p.midi%12)); r.appendChild(node('td','',pitchName(p.midi)+' / '+roles(degree)[role])); }); foot.appendChild(r);
    table.appendChild(body); table.appendChild(foot); host.appendChild(table);
  }
  function markNote(p,step) {
    document.querySelectorAll('#arpeggios .arp-sounding').forEach(function (e) { e.classList.remove('arp-sounding'); });
    var b=$('arpBoard').querySelector('[data-string="'+p.s+'"][data-fret="'+p.f+'"]'); if (b) b.classList.add('arp-sounding');
    var tab=$('arpTab').querySelector('[data-step="'+step+'"]'); if (tab) tab.classList.add('arp-sounding');
    var active=$('arpTimeline').querySelector('[data-bar="'+bar+'"]'); if (active && playing && route[bar]===degree) active.classList.add('arp-sounding');
  }
  function renderConnections() {
    $('arpConnections').replaceChildren();
    for (var i=0;i<route.length-1;i++) {
      var a=route[i], b=route[i+1], shared=triad(a).filter(function (n) { return triad(b).indexOf(n)>=0; });
      var text=romans[a]+' → '+romans[b]+': '+(shared.length?'shared '+shared.map(function (n) { return key()[2][n]+' (key '+(n+1)+')'; }).join(', '):'no shared chord tones');
      var from=paths[i][3], to=paths[i+1][0];
      if (from&&to) text+='. Tab connects '+pitchName(from.midi)+' → '+pitchName(to.midi)+' ('+Math.abs(to.midi-from.midi)+' semitones).';
      $('arpConnections').appendChild(node('p','',text));
    }
  }
  function renderQuestion() {
    var change=question%Math.max(1,route.length-1), d=route[Math.min(change+1,route.length-1)];
    var role=questionCount%3, correct=triad(d)[role];
    $('arpQuestion').textContent='Target '+['the root','the third','the fifth'][role]+' of '+romans[d]+' ('+chordName(d)+')'+(route.length>1?' after '+romans[route[change]]:'')+'. Which note in '+key()[0]+' major should you aim for?';
    $('arpFeedback').textContent=''; $('arpAnswers').replaceChildren();
    key()[2].forEach(function (name,n) {
      var b=button(name,function () {
        stopAll();
        if (n===correct) { $('arpFeedback').textContent='Yes. '+name+' is key degree '+(n+1)+' and chord tone '+roles(d)[role]+' of '+chordName(d)+'.'; b.classList.add('is-active'); }
        else $('arpFeedback').textContent='Try again. Build '+chordName(d)+' from '+triad(d).map(function (i) { return key()[2][i]; }).join('–')+' and choose its '+['root','third','fifth'][role]+'.';
      },'gc-pick-btn'); $('arpAnswers').appendChild(b);
    });
  }
  function refresh() {
    rebuildPaths(); renderFamily(); renderTimeline(); renderDetail(); renderConnections(); renderQuestion();
    $('arpCustom').hidden=$('arpRoute').value!=='custom';
    $('arpRemove').disabled=custom.length<=1; $('arpAppend').disabled=custom.length>=8;
    $('arpStatus').textContent='Ready in '+key()[0]+' major. Four quarter notes per bar.';
  }
  function play(kind) {
    stopAll();
    if (!audio.getContext()) { $('arpStatus').textContent='Audio is unavailable. Follow the tab on your guitar.'; return; }
    var tempo=Number($('arpTempo').value); if (!Number.isFinite(tempo)) tempo=80;
    tempo=Math.max(40,Math.min(180,tempo||80)); $('arpTempo').value=tempo;
    var beat=60/tempo, events=[];
    if (kind==='route') paths.forEach(function (path,i) { path.forEach(function (p,j) { events.push({note:p,d:route[i],bar:i,step:j}); }); });
    else if (kind==='chord') selectedPath().forEach(function (p,j) { events.push({note:p,d:degree,bar:bar,step:j}); });
    else {
      if (!$('arpContext').checked) { $('arpContext').checked=true; renderDetail(); }
      var available=positions(), target=null;
      available.filter(function (p) { return p.midi%12===key()[1]; }).sort(function (a,b) { return a.midi-b.midi; }).some(function (p) { target=choosePositions(scale.concat([12]).map(function (iv) { return p.midi+iv; }),available); return !!target; });
      if (target) target.notes.forEach(function (p) { events.push({note:p,d:degree,bar:bar,step:-1}); });
    }
    if (!events.length || (kind==='route' && paths.some(function (p) { return p.length!==4; }))) { $('arpStatus').textContent='Choose another fret window for a complete path.'; return; }
    playing=true;
    events.forEach(function (e,i) {
      audio.pluck(GT.noteFreq(e.note.s,e.note.f),{delay:i*beat,duration:beat*1.5});
      later(function () {
        if (degree!==e.d || bar!==e.bar) activate(e.d,e.bar);
        markNote(e.note,e.step);
        $('arpStatus').textContent=(kind==='scale'?'Scale note '+(i+1)+' of 8':(kind==='chord'?'Selected arpeggio':'Bar '+(e.bar+1))+' · '+romans[e.d]+' '+chordName(e.d)+' · beat '+(e.step+1))+' · '+pitchName(e.note.midi)+' · key degree '+(pcs().indexOf(e.note.midi%12)+1);
      },i*beat*1000);
    });
    later(function () { stop(); $('arpStatus').textContent='Finished. Replay, slow the tempo, or transpose the same route.'; },events.length*beat*1000);
  }
  keys.forEach(function (k,i) { var opt=node('option','',k[0]+' major'); opt.value=i; $('arpKey').appendChild(opt); });
  romans.forEach(function (r,i) { var opt=node('option','',r); opt.value=i; $('arpAppendDegree').appendChild(opt); });
  ['arpKey','arpPosition','arpPath','arpContext'].forEach(function (id) { $(id).onchange=function () { stopAll(); refresh(); }; });
  $('arpTempo').onchange=function () { stopAll(); };
  $('arpRoute').onchange=function () { stopAll(); route=(this.value==='custom'?custom:presets[this.value]).slice(); bar=0; degree=route[0]; question=0; refresh(); };
  $('arpAppend').onclick=function () { if (custom.length>=8) return; stopAll(); custom.push(+$('arpAppendDegree').value); route=custom.slice(); refresh(); };
  $('arpRemove').onclick=function () { if (custom.length<=1) return; stopAll(); custom.pop(); route=custom.slice(); bar=Math.min(bar,route.length-1); degree=route[bar]; refresh(); };
  $('arpReset').onclick=function () { stopAll(); custom=[0,1,4,0]; route=custom.slice(); bar=0; degree=0; refresh(); };
  $('arpPlayRoute').onclick=function () { play('route'); };
  $('arpPlayChord').onclick=function () { play('chord'); };
  $('arpPlayScale').onclick=function () { play('scale'); };
  $('arpStop').onclick=function () { stopAll(); bar=0; activate(route[0],0); $('arpStatus').textContent='Reset to bar 1. Ready to replay.'; };
  $('arpNextQuestion').onclick=function () { question++; questionCount++; renderQuestion(); };
  $('arpToStudio').onclick=function () {
    var entries=route.map(function (d) {
      var type=GT.CHORD_TYPES.filter(function (c) { return c.suffix===suffixes[d]; })[0];
      return {name:chordName(d)+' ('+romans[d]+' in '+key()[0]+')',frets:GT.getChordShape(pcs()[d],type,0,null).frets};
    });
    var transfer={entries:entries,added:0};
    window.dispatchEvent(new CustomEvent('guitar-add-route',{detail:transfer}));
    $('arpStatus').textContent=transfer.added===entries.length?'Route added to the progression studio below. Its grips arrange the same triad tones as chords; the arpeggio tab remains here.':'Added '+transfer.added+' of '+entries.length+' bars. The studio holds 32 bars; remove bars there before adding more.';
  };
  refresh();
});
