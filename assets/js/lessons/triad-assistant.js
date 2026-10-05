/* Shared triad planner: exhaustive candidate maps and dynamic-programming routes.
   Costs are disclosed in the UI; these are suggestions, not universal fingerings. */
(function () {
  'use strict';
  var roots = ['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
  var qualities = {major:[0,4,7],minor:[0,3,7],diminished:[0,3,6],augmented:[0,4,8]};
  var roles = {major:['R','3','5'],minor:['R','♭3','5'],diminished:['R','♭3','♭5'],augmented:['R','3','♯5']};
  var suffix = {major:'',minor:'m',diminished:'°',augmented:'+'};
  var tunings = {violin:[55,62,69,76],guitar:[40,45,50,55,59,64]};
  function pc(n) { return (n % 12 + 12) % 12; }
  function name(chord) { return roots[chord.root] + suffix[chord.quality]; }
  function pitches(chord) { return qualities[chord.quality].map(function (v) { return pc(chord.root+v); }); }
  function spellings(chord) {
    return window.MusicNotation.spellPattern(roots[chord.root]+'4',qualities[chord.quality],[0,2,4]).map(function(s){return s.replace(/-?\d+$/,'');});
  }
  function pitchName(chord, midi) {
    var role = pitches(chord).indexOf(pc(midi));
    var spelling = spellings(chord)[role];
    var a = {'':0,'♯':1,'♭':-1,'𝄪':2,'𝄫':-2}[spelling.slice(1)];
    return spelling+window.MusicNotation.writtenOctave(midi,spelling[0],a);
  }
  function distance(a,b,instrument) {
    if(instrument==='violin') {var x=a.notes[2],y=b.notes[0];return Math.abs(x.midi-y.midi)+Math.abs(x.s-y.s)*2+Math.abs(x.f-y.f)*.25;}
    var result=0;
    a.notes.forEach(function(n,i){var m=b.notes[i];result+=Math.abs(n.midi-m.midi);if(instrument==='guitar')result+=Math.abs(n.s-m.s)*2+Math.abs(n.f-m.f)*.25;});
    return result;
  }
  function violinLocations(midis,span) {
    var layers=[];
    midis.forEach(function(midi,i){
      var layer=[];
      tunings.violin.forEach(function(open,s){var f=midi-open;if(f<0||f>span)return;var note={midi:midi,s:s,f:f};
        if(!i) {layer.push({notes:[note],cost:f*.03+(f>7?2:0)});return;}
        var best=null;layers[i-1].forEach(function(prev){var p=prev.notes[i-1];var cost=prev.cost+Math.abs(s-p.s)*2+Math.abs(f-p.f)*.25+(f>7?2:0);if(!best||cost<best.cost)best={notes:prev.notes.concat([note]),cost:cost};});if(best)layer.push(best);
      });layers.push(layer);
    });
    return layers[2].sort(function(a,b){return a.cost-b.cost;})[0];
  }
  function candidates(chord,instrument,options) {
    var tones=pitches(chord),out=[];
    if(instrument==='guitar') {
      var start=options.fret||0;
      for(var s=0;s<4;s++) {
        var choices=[0,1,2].map(function(i){var found=[];for(var f=start;f<=start+4;f++){var midi=tunings.guitar[s+i]+f;if(tones.indexOf(pc(midi))!==-1)found.push({midi:midi,s:s+i,f:f});}return found;});
        choices[0].forEach(function(a){choices[1].forEach(function(b){choices[2].forEach(function(c){
          var notes=[a,b,c].sort(function(x,y){return x.midi-y.midi;});
          if(new Set(notes.map(function(n){return pc(n.midi);})).size!==3)return;
          var inversion=tones.indexOf(pc(notes[0].midi));if(options.rootOnly&&inversion!==0)return;
          var stopped=notes.filter(function(n){return n.f>0;}).map(function(n){return n.f;});
          if(stopped.length && Math.max.apply(null,stopped)-Math.min.apply(null,stopped)>3)return;
          out.push({notes:notes,inversion:inversion,cost:(Math.max(a.f,b.f,c.f)-Math.min(a.f,b.f,c.f))*.1});
        });});});
      }
    } else {
      var low=instrument==='piano'?60:55,high=instrument==='piano'?84:76+(options.span||7);
      for(var midi=low;midi<=high;midi++) {
        var inversion=tones.indexOf(pc(midi));if(inversion<0||(options.rootOnly&&inversion!==0))continue;
        var midis=[midi],n=midi;
        for(var i=1;i<3;i++){do {n++;}while(pc(n)!==tones[(inversion+i)%3]);midis.push(n);}
        if(n>high)continue;
        if(instrument==='violin') {var loc=violinLocations(midis,options.span||7);if(loc)out.push({notes:loc.notes,inversion:inversion,cost:loc.cost});}
        else out.push({notes:midis.map(function(m){return {midi:m};}),inversion:inversion,cost:(n-midi)*.02});
      }
    }
    return out.sort(function(a,b){return a.notes[0].midi-b.notes[0].midi||a.cost-b.cost;});
  }
  function plan(route,instrument,options) {
    var choices=route.map(function(c){return candidates(c,instrument,options);});
    if(choices.some(function(c){return !c.length;}))return {maps:[],missing:choices.map(function(c,i){return c.length?-1:i;}).filter(function(i){return i>=0;})};
    var layers=[];
    choices.forEach(function(list,i){layers.push(list.map(function(map){
      if(!i)return {map:map,cost:map.cost+(map.notes[0].midi-(instrument==='guitar'?40:instrument==='violin'?55:60))*.02,prev:null};
      var best=null;layers[i-1].forEach(function(prev){var cost=prev.cost+distance(prev.map,map,instrument)+map.cost;if(!best||cost<best.cost)best={map:map,cost:cost,prev:prev};});return best;
    }));});
    var tail=layers[layers.length-1].reduce(function(a,b){return a.cost<=b.cost?a:b;}),cost=tail.cost,maps=[];
    while(tail){maps.unshift(tail.map);tail=tail.prev;}
    return {maps:maps,cost:cost,missing:[]};
  }
  window.TriadAssistantTheory={roots:roots,qualities:qualities,pitches:pitches,candidates:candidates,plan:plan,distance:distance,pitchName:pitchName};

  document.addEventListener('DOMContentLoaded',function(){
    document.querySelectorAll('[data-triad-assistant]').forEach(function(host){
      var instrument=host.dataset.triadAssistant,route=[{root:0,quality:'major'},{root:9,quality:'minor'},{root:5,quality:'major'},{root:7,quality:'major'}];
      var selected=0,maps=[],timers=[],playing=false;
      function el(tag,text,cls){var e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;}
      function btn(text,fn){var b=el('button',text);b.type='button';b.onclick=fn;return b;}
      function label(text,control){var l=el('label',text);l.appendChild(control);return l;}
      function select(items){var s=el('select');items.forEach(function(item){var o=el('option',item[1]);o.value=item[0];s.appendChild(o);});return s;}
      host.appendChild(el('h2','Triad assistant'));
      host.appendChild(el('p','Build a route from any roots and qualities. Compare root position with nearby inversions; keep shared tones in view. Root, third, and fifth define the chord even when their order changes.','ta-lede'));
      var controls=el('div',null,'ta-controls');host.appendChild(controls);
      var root=select(roots.map(function(r,i){return [i,r];})),quality=select(Object.keys(qualities).map(function(q){return[q,q];}));
      var mode=select([['near','Smaller movements'],['root','Root positions only']]);
      var windowSelect=select(instrument==='guitar'?[[0,'Frets 0–4'],[3,'Frets 3–7'],[5,'Frets 5–9'],[8,'Frets 8–12']]:instrument==='violin'?[[7,'First position'],[24,'Two-octave span']]:[[24,'C4–C6']]);
      controls.append(label('Root',root),label('Quality',quality),label('Map strategy',mode),label('Playing range',windowSelect));
      var actions=el('div',null,'ta-actions');host.appendChild(actions);
      var add=btn('Add triad',function(){if(route.length>=8)return;stop();route.push({root:+root.value,quality:quality.value});selected=route.length-1;refresh();});
      var replace=btn('Replace selected',function(){stop();route[selected]={root:+root.value,quality:quality.value};refresh();});
      var remove=btn('Remove selected',function(){if(route.length<=1)return;stop();route.splice(selected,1);selected=Math.min(selected,route.length-1);refresh();});
      var reset=btn('C–Am–F–G',function(){stop();route=[{root:0,quality:'major'},{root:9,quality:'minor'},{root:5,quality:'major'},{root:7,quality:'major'}];selected=0;refresh();});
      actions.append(add,replace,remove,reset);
      var timeline=el('div',null,'ta-timeline');timeline.setAttribute('role','group');timeline.setAttribute('aria-label','Your triad route');host.appendChild(timeline);
      var comparison=el('p',null,'ta-comparison');host.appendChild(comparison);
      var overview=el('div',null,'ta-overview');
      var detail=el('div',null,'ta-detail');host.appendChild(detail);
      var transport=el('div',null,'ta-actions');host.appendChild(transport);
      var playSelected=btn('Hear selected',function(){play(false);}),playRoute=btn('Play route',function(){play(true);}),stopBtn=btn('Stop',function(){stop();status.textContent='Stopped. Ready to replay.';});
      transport.append(playSelected,playRoute,stopBtn);
      var status=el('p','', 'ta-status');status.setAttribute('role','status');host.appendChild(status);host.appendChild(overview);
      var scope=instrument==='violin'?'The violin map is an ascending arpeggio, not a three-note simultaneous grip. The planner weights pitch jumps between triads, string crossings, and finger travel; higher positions carry a penalty.':instrument==='guitar'?'Three-note grips use three adjacent strings in standard tuning, with no more than a three-fret span among stopped notes. Mute the other strings. The planner weights movement of low/middle/high pitches plus string and fret travel. Try each suggestion for comfort.':'Three-note, close-position voicings stay within C4–C6. The planner minimizes the summed semitone movement of low, middle, and high voices, with a small spacing penalty. Fingering depends on your hand and phrase.';
      host.appendChild(el('p',scope+' “Smaller movements” finds the lowest cost across this whole route within these candidate maps; it does not model every possible performance.','ta-scope'));
      var source=el('p',null,'ta-scope');var link=el('a','Theory: Open Music Theory — triads');link.href='https://viva.pressbooks.pub/openmusictheory/chapter/triads/';source.appendChild(link);host.appendChild(source);
      function opts(rootOnly){return {rootOnly:rootOnly,fret:instrument==='guitar'?+windowSelect.value:0,span:instrument==='violin'?+windowSelect.value:7};}
      function stop(){timers.forEach(clearTimeout);timers=[];playing=false;host.querySelectorAll('.ta-sounding').forEach(function(e){e.classList.remove('ta-sounding');});
        if(instrument==='piano'&&window.PianoAudio)window.PianoAudio.stop();
        if(instrument==='guitar'&&window.GuitarAudio)window.GuitarAudio.stop();
        if(instrument==='violin')window.dispatchEvent(new CustomEvent('violin-triad-stop'));
      }
      function movement(list){var total=0;for(var i=1;i<list.length;i++)total+=distance(list[i-1],list[i],instrument);return total;}
      function refresh(){
        var result=plan(route,instrument,opts(mode.value==='root'));maps=result.maps;
        timeline.replaceChildren();route.forEach(function(c,i){var b=btn((i+1)+'. '+name(c),function(){stop();selected=i;renderDetail();markSelection();});b.setAttribute('aria-pressed',String(i===selected));timeline.appendChild(b);});
        add.disabled=route.length>=8;remove.disabled=route.length<=1;playSelected.disabled=playRoute.disabled=!maps.length;
        var base=plan(route,instrument,opts(true));
        comparison.textContent=maps.length?'Route movement score: '+movement(maps).toFixed(1)+(base.maps.length?' · root-position comparison: '+movement(base.maps).toFixed(1):' · root-position route unavailable in this range')+'. Lower means less movement under the stated metric.': 'No complete map for '+result.missing.map(function(i){return name(route[i]);}).join(', ')+'. Change the range or allow inversions.';
        overview.replaceChildren();
        if(maps.length) {
          var summary=el('details');summary.open=true;summary.appendChild(el('summary','Compare every map in the route'));
          var grid=el('div',null,'ta-route-maps');
          maps.forEach(function(map,i){var chord=route[i],card=el('div',null,'ta-route-card');
            card.appendChild(btn((i+1)+'. '+name(chord),function(){stop();selected=i;renderDetail();markSelection();}));
            card.appendChild(el('p',map.notes.map(function(n){return pitchName(chord,n.midi);}).join(' · ')));
            card.appendChild(el('p',['Root position','First inversion','Second inversion'][map.inversion]));
            var picture=el('div',null,'ta-map');picture.innerHTML=diagram(chord,map);card.appendChild(picture);
            var location=map.notes.map(function(n){return instrument==='violin'?['G','D','A','E'][n.s]+' '+(n.f<=7?window.ViolinTheory.fingerForOffset(n.f):'+'+n.f):instrument==='guitar'?'S'+(6-n.s)+' F'+n.f:pitchName(chord,n.midi);});
            card.appendChild(el('p',location.join(' → ')));grid.appendChild(card);
          });summary.appendChild(grid);overview.appendChild(summary);
        }
        status.textContent='Ready · '+route.length+' triads (maximum 8).';renderDetail();
      }
      function markSelection(){Array.from(timeline.children).forEach(function(b,i){b.setAttribute('aria-pressed',String(i===selected));});}
      function previewNote(note,chord){if(instrument==='violin')window.dispatchEvent(new CustomEvent('violin-triad-note',{detail:{label:['G','D','A','E'][note.s],offset:note.f,span:+windowSelect.value,root:chord.root,quality:chord.quality}}));}
      function hear(note,chord){var freq=440*Math.pow(2,(note.midi-69)/12);previewNote(note,chord);
        if(instrument==='violin')window.ViolinFingerboard.Audio.blip(freq,380);
        else if(instrument==='piano')window.PianoAudio.tone(freq,{duration:.4});
        else window.GuitarAudio.pluck(freq,{duration:.4});
      }
      function renderDetail(){
        detail.replaceChildren();var chord=route[selected],map=maps[selected];root.value=chord.root;quality.value=chord.quality;
        detail.appendChild(el('h3',name(chord)+' · '+chord.quality));
        detail.appendChild(el('p',spellings(chord).map(function(n,i){return roles[chord.quality][i]+' = '+n;}).join(' · ')));
        if(!map){detail.appendChild(el('p','No complete route in this range.'));return;}
        detail.appendChild(el('p',['Root position','First inversion','Second inversion'][map.inversion]+' · lowest note '+pitchName(chord,map.notes[0].midi)));
        if(selected){var before=route[selected-1],common=spellings(chord).filter(function(n,i){return pitches(before).includes(pitches(chord)[i]);});detail.appendChild(el('p','Shared pitch classes with '+name(before)+': '+(common.join(', ')||'none')+'.'));
          if(instrument!=='violin')detail.appendChild(el('p','Voice movement: '+map.notes.map(function(n,i){var delta=n.midi-maps[selected-1].notes[i].midi;return ['low','middle','high'][i]+' '+(delta>0?'+':'')+delta;}).join(' · ')+' semitones.'));
        }
        var picture=el('div',null,'ta-map');picture.innerHTML=diagram(chord,map);detail.appendChild(picture);
        var row=el('div',null,'ta-actions');map.notes.forEach(function(n,i){var role=pitches(chord).indexOf(pc(n.midi));var text=roles[chord.quality][role]+' · '+pitchName(chord,n.midi);
          if(instrument==='violin')text+=' · '+['G','D','A','E'][n.s]+' string, '+(n.f<=7?'finger '+window.ViolinTheory.fingerForOffset(n.f):'+'+n.f+' semitones');
          if(instrument==='guitar')text+=' · string '+(6-n.s)+', fret '+n.f;
          var b=btn(text,function(){stop();hear(n,chord);status.textContent=text;});b.dataset.tone=i;row.appendChild(b);
        });detail.appendChild(row);
      }
      function diagram(chord,map){
        var svg='<svg viewBox="0 0 360 150" role="img" aria-label="'+name(chord)+' '+instrument+' note map">';
        if(instrument==='piano'){
          var whites=[],blackPC=[1,3,6,8,10];for(var m=60;m<=84;m++)if(!blackPC.includes(pc(m)))whites.push(m);
          var width=340/whites.length;
          whites.forEach(function(m,i){var role=pitches(chord).indexOf(pc(m)),chosen=map.notes.some(function(n){return n.midi===m;});svg+='<rect x="'+(10+i*width)+'" y="12" width="'+width+'" height="105" fill="'+(chosen?'#e5c8a4':'#fff')+'" stroke="#483522"/>';if(chosen)svg+='<text x="'+(10+(i+.5)*width)+'" y="100" text-anchor="middle" font-size="11">'+roles[chord.quality][role]+'</text>';});
          for(var m=61;m<84;m++)if(blackPC.includes(pc(m))){var left=whites.filter(function(w){return w<m;}).length;var chosen=map.notes.some(function(n){return n.midi===m;});svg+='<rect x="'+(10+left*width-width*.3)+'" y="12" width="'+(width*.6)+'" height="65" fill="'+(chosen?'#8d2e46':'#241408')+'"/>';if(chosen)svg+='<text x="'+(10+left*width)+'" y="60" text-anchor="middle" fill="#fff" font-size="10">'+roles[chord.quality][pitches(chord).indexOf(pc(m))]+'</text>';}
          svg+='<text x="10" y="139" font-size="12">C4</text><text x="325" y="139" font-size="12">C6</text>';
        }else{
          var violin=instrument==='violin',count=violin?4:6,max=violin?+windowSelect.value:4,start=violin?0:+windowSelect.value;
          for(var s=0;s<count;s++){var y=24+s*(104/(count-1));svg+='<line x1="45" x2="337" y1="'+y+'" y2="'+y+'" stroke="#483522"/><text x="8" y="'+(y+4)+'" font-size="12">'+(violin?['G','D','A','E'][s]:['E6','A5','D4','G3','B2','e1'][s])+'</text>';}
          for(var f=0;f<=max;f++){var fraction=violin?(1-Math.pow(2,-f/12))/(1-Math.pow(2,-max/12)):f/max;var x=45+fraction*292;if(!violin)svg+='<line x1="'+x+'" x2="'+x+'" y1="18" y2="134" stroke="#cdb79d"/>';if(!violin||f===0||f===max)svg+='<text x="'+x+'" y="148" text-anchor="middle" font-size="10">'+(start+f)+'</text>';}
          map.notes.forEach(function(n){var frac=violin?(1-Math.pow(2,-n.f/12))/(1-Math.pow(2,-max/12)):(n.f-start)/max;var x=45+frac*292,y=24+n.s*(104/(count-1));svg+='<circle cx="'+x+'" cy="'+y+'" r="11" fill="#7a2323"/><text x="'+x+'" y="'+(y+4)+'" text-anchor="middle" fill="#fff" font-size="10">'+roles[chord.quality][pitches(chord).indexOf(pc(n.midi))]+'</text>';});
        }
        return svg+'</svg>';
      }
      function play(all){
        stop();if(!maps.length)return;
        var stopId=instrument==='piano'?'pcStop':instrument==='guitar'?'studioStop':null;if(stopId)document.getElementById(stopId).click();
        if(instrument==='violin')window.dispatchEvent(new CustomEvent('violin-triad-start'));
        if(instrument==='piano')window.PianoAudio.getContext();
        if(instrument==='guitar')window.GuitarAudio.getContext();
        playing=true;var events=[];(all?maps:[maps[selected]]).forEach(function(map,i){map.notes.forEach(function(n,j){events.push({note:n,index:all?i:selected,tone:j});});});
        events.forEach(function(event,i){timers.push(setTimeout(function(){selected=event.index;renderDetail();markSelection();hear(event.note,route[selected]);var b=detail.querySelector('[data-tone="'+event.tone+'"]');if(b)b.classList.add('ta-sounding');status.textContent='Triad '+(selected+1)+' · '+name(route[selected])+' · '+pitchName(route[selected],event.note.midi);},i*500));});
        timers.push(setTimeout(function(){playing=false;host.querySelectorAll('.ta-sounding').forEach(function(e){e.classList.remove('ta-sounding');});status.textContent='Finished. Compare another map or replay.';},events.length*500));
      }
      mode.onchange=windowSelect.onchange=function(){stop();refresh();};
      document.addEventListener('visibilitychange',function(){if(document.hidden)stop();});
      ['guitar-studio-stop','piano-studio-stop','violin-user-action'].forEach(function(event){window.addEventListener(event,function(){if(playing)stop();});});
      refresh();
    });
  });
})();
