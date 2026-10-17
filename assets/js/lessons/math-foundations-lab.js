  (function(){
    'use strict';
    var level='3', solved=new Set(), current={}, mode='explore', assisted=new Set(), userPickedGrade=false, singleStationFocus=false;

    var hashConfig={
      '#counting':{grade:'1',num:'01',title:'Counting to Operations Lab',strand:'counting',id:'counting'},
      '#patterns':{grade:'2',num:'02',title:'Patterns, Shapes & Rules',strand:'patterns',id:'patterns'},
      '#place-value':{grade:'2',num:'03',title:'Place Value & Operation Sense',strand:'place',id:'place-value'},
      '#multiplication':{grade:'3',num:'04',title:'Groups, Arrays & Division',strand:'multiply',id:'multiplication'},
      '#fractions':{grade:'4',num:'05',title:'Fraction Sense Lab',strand:'fractions',id:'fractions'},
      '#geometry':{grade:'4',num:'06',title:'Geometry & Measurement Studio',strand:'geometry',id:'geometry'},
      '#data':{grade:'5',num:'07',title:'Data Stories & Graphs',strand:'data',id:'data'},
      '#integers':{grade:'6',num:'08',title:'Integers & Rational Numbers',strand:'integers',id:'integers'},
      '#equations':{grade:'7',num:'09',title:'Balance, Variables & Equations',strand:'equations',id:'equations'},
      '#functions':{grade:'8',num:'10',title:'Patterns to Functions',strand:'functions',id:'functions'}
    };

    var themeFriends={
      day:{icon:'2600',name:'Sunny',tip:'Try one model at a time. You can always draw it out.'},
      sakura:{icon:'1F338',name:'Petal',tip:'Look for what repeats, then sketch the next step.'},
      diamond:{icon:'1F48E',name:'Facet',tip:'Turn the problem around and inspect every side.'},
      emerald:{icon:'1F331',name:'Sprout',tip:'Start with what you know and grow one step at a time.'},
      topaz:{icon:'1F41D',name:'Buzzy',tip:'Build neat groups like honeycomb cells, then count them.'},
      goldfish:{icon:'1F420',name:'Finn',tip:'Circle the facts you know before diving into the answer.'},
      cobblestone:{icon:'1FAA8',name:'Rocky',tip:'Stack each step carefully so your reasoning stays strong.'},
      bark:{icon:'1FAB5',name:'Logan',tip:'Show your work in rings: fact, operation, steps, answer.'},
      night:{icon:'1F319',name:'Luna',tip:'Plot what you know like stars, then connect the pattern.'},
      vaporwave:{icon:'1F306',name:'Pixel',tip:'Decode the inputs, test the rule, and level up.'}
    };
    function syncThemeWorld(){var id=document.body.dataset.theme||document.documentElement.dataset.theme||'day',friend=themeFriends[id]||themeFriends.day,hero=document.querySelector('.worksheet-hero'),friendBox=hero.querySelector('.theme-friend');hero.querySelector('.eyebrow').textContent='Mathematics · K–12 foundations';hero.querySelector('h1').textContent='See the structure. Explain why.';hero.querySelector('p:not(.eyebrow)').textContent='Choose a grade or course starting point. Investigate a model, solve independently, then explain and apply the idea. Use a lower level when you need to rebuild a prerequisite.';friendBox.querySelector('img').src='../../../assets/openmoji/'+friend.icon+'.svg';friendBox.querySelector('img').alt=friend.tip;friendBox.querySelector('img').setAttribute('aria-label','Enlarge illustration: '+friend.tip);friendBox.querySelector('b').textContent=friend.name+' says';friendBox.querySelector('span').lastChild.textContent=friend.tip;friendBox.querySelector('figcaption').textContent=friend.tip+' Illustration by OpenMoji · CC BY-SA 4.0.';}
    syncThemeWorld();
    new MutationObserver(function(){syncThemeWorld();}).observe(document.body,{attributes:true,attributeFilter:['data-theme']});
    function chosenLevel(){return level;}
    function exercise(strand,grade){return FoundationTasks.create(strand,grade);}
    function writingFrame(strand,mode,item){
      if(mode==='story')return 'Objects or people: __________\nWhat happens: ______________\nMy math question: ___________';
      if(mode==='explain')return 'I chose __________ because…\nThe model shows…\nMy answer is reasonable because…';
      if(mode==='solve')return item.prompt+'\n\nWork: _______________________\nAnswer: __________';
      return 'Quantities and units: __________\nRepresentation: ______________\nMethod and reason: ____________\nCheck: _______________________';
    }
    function writingDirection(strand,mode,item){
      if(mode==='solve')return 'Represent the problem with objects, a drawing or equations. Keep each step connected to the quantities, then label your answer.';
      if(mode==='equation')return 'Translate the picture into symbols. Include an equals sign and make every number represent something visible in the model.';
      if(mode==='story')return 'Invent a different real-world situation that uses the same numbers and operation. End with a question someone could solve.';
      return 'Explain how the model proves your answer. Name the operation or rule and use “because” in your reasoning.';
    }
    function buildManipulativeHTML(strand){
      if(strand==='counting')return '<div class="station-manipulative"><div class="station-manipulative-head"><span>Interactive Make-Ten Sandbox</span><small>Click chips to move between groups</small></div><div class="station-manipulative-controls"><label>Group A <input type="range" min="1" max="10" value="7" data-m="a"></label><label>Group B <input type="range" min="1" max="10" value="5" data-m="b"></label></div><div class="station-manipulative-stage" data-m-stage></div></div>';
      if(strand==='patterns')return '<div class="station-manipulative"><div class="station-manipulative-head"><span>Interactive Sequence Builder</span><small>Test start &amp; step rule</small></div><div class="station-manipulative-controls"><label>Start a₁ <input type="range" min="1" max="10" value="3" data-m="a"></label><label>Add step +d <input type="range" min="1" max="8" value="4" data-m="d"></label></div><div class="station-manipulative-stage" data-m-stage></div></div>';
      if(strand==='place')return '<div class="station-manipulative"><div class="station-manipulative-head"><span>Place-Value Block Composer</span><small>Combine hundreds, tens &amp; ones</small></div><div class="station-manipulative-controls"><label>100s <input type="range" min="0" max="9" value="2" data-m="h"></label><label>10s <input type="range" min="0" max="12" value="4" data-m="t"></label><label>1s <input type="range" min="0" max="15" value="6" data-m="o"></label></div><div class="station-manipulative-stage" data-m-stage></div></div>';
      if(strand==='multiply')return '<div class="station-manipulative"><div class="station-manipulative-head"><span>Interactive Array &amp; Distributive Slicer</span><small>Rows × Columns</small></div><div class="station-manipulative-controls"><label>Rows <input type="range" min="1" max="8" value="4" data-m="r"></label><label>Cols <input type="range" min="1" max="10" value="6" data-m="c"></label></div><div class="station-manipulative-stage" data-m-stage></div></div>';
      if(strand==='fractions')return '<div class="station-manipulative"><div class="station-manipulative-head"><span>Equivalent Fraction Partitioner</span><small>Split each part into sub-parts</small></div><div class="station-manipulative-controls"><label>Shaded <input type="range" min="1" max="7" value="2" data-m="n"></label><label>Whole parts <input type="range" min="2" max="8" value="4" data-m="d"></label><label>Split × <input type="range" min="1" max="4" value="2" data-m="k"></label></div><div class="station-manipulative-stage" data-m-stage></div></div>';
      if(strand==='geometry')return '<div class="station-manipulative"><div class="station-manipulative-head"><span>Dimension Explorer (Area vs. Boundary)</span><small>Compare square units &amp; linear units</small></div><div class="station-manipulative-controls"><label>Length <input type="range" min="2" max="12" value="6" data-m="l"></label><label>Width <input type="range" min="2" max="10" value="4" data-m="w"></label></div><div class="station-manipulative-stage" data-m-stage></div></div>';
      if(strand==='data')return '<div class="station-manipulative"><div class="station-manipulative-head"><span>Live Data Summary Tester</span><small>Adjust 3 observations</small></div><div class="station-manipulative-controls"><label>A <input type="range" min="1" max="15" value="4" data-m="a"></label><label>B <input type="range" min="1" max="15" value="7" data-m="b"></label><label>C <input type="range" min="1" max="15" value="10" data-m="c"></label></div><div class="station-manipulative-stage" data-m-stage></div></div>';
      if(strand==='integers')return '<div class="station-manipulative"><div class="station-manipulative-head"><span>Signed Number Line Jumper</span><small>Start + directed change</small></div><div class="station-manipulative-controls"><label>Start <input type="range" min="-10" max="10" value="-4" data-m="s"></label><label>Change <input type="range" min="-10" max="10" value="7" data-m="c"></label></div><div class="station-manipulative-stage" data-m-stage></div></div>';
      if(strand==='equations')return '<div class="station-manipulative"><div class="station-manipulative-head"><span>Two-Step Balance Scale Tester</span><small>ax + b = c</small></div><div class="station-manipulative-controls"><label>a <input type="range" min="2" max="6" value="3" data-m="a"></label><label>x <input type="range" min="1" max="9" value="4" data-m="x"></label><label>b <input type="range" min="1" max="10" value="5" data-m="b"></label></div><div class="station-manipulative-stage" data-m-stage></div></div>';
      return '<div class="station-manipulative"><div class="station-manipulative-head"><span>Function Rule Machine</span><small>f(x) = m·x + b</small></div><div class="station-manipulative-controls"><label>Input x <input type="range" min="-4" max="10" value="4" data-m="x"></label><label>Rate m <input type="range" min="-3" max="6" value="3" data-m="m"></label><label>Start b <input type="range" min="-5" max="8" value="2" data-m="b"></label></div><div class="station-manipulative-stage" data-m-stage></div></div>';
    }
    function setupManipulative(station){
      var box=station.querySelector('.station-manipulative');if(!box)return;
      var strand=station.dataset.strand,stage=box.querySelector('[data-m-stage]');
      function val(k){var el=box.querySelector('[data-m="'+k+'"]');return el?Number(el.value):0;}
      function update(){
        if(strand==='counting'){var a=val('a'),b=val('b'),sum=a+b,make10=Math.min(10,sum),rem=Math.max(0,sum-10);stage.innerHTML='<span>'+a+' + '+b+' = <strong>'+sum+'</strong></span><span>Make-10 view: <strong>'+make10+'</strong>'+(rem?' + <strong>'+rem+'</strong>':'')+'</span>';}
        else if(strand==='patterns'){var a1=val('a'),d=val('d'),seq=[0,1,2,3,4,5].map(function(i){return a1+i*d;});stage.innerHTML='<div class="manip-chip-row">'+seq.map(function(n,i){return '<span class="manip-chip'+(i===5?' is-alt':'')+'">'+n+'</span>';}).join(' → ')+'</div><span>Rule: aₙ = '+a1+' + '+d+'(n−1)</span>';}
        else if(strand==='place'){var h=val('h'),t=val('t'),o=val('o'),tot=h*100+t*10+o;stage.innerHTML='<span>'+h+' hundreds + '+t+' tens + '+o+' ones</span><span>Standard form: <strong>'+tot+'</strong> '+(o>=10||t>=10?'(regrouped!)':'')+'</span>';}
        else if(strand==='multiply'){var r=val('r'),c=val('c'),c1=Math.floor(c/2),c2=c-c1;stage.innerHTML='<span>'+r+' × '+c+' = <strong>'+(r*c)+'</strong></span><span>Split: '+r+'×'+c1+' ('+(r*c1)+') + '+r+'×'+c2+' ('+(r*c2)+') = <strong>'+(r*c)+'</strong></span>';}
        else if(strand==='fractions'){var n=Math.min(val('n'),val('d')),d=val('d'),k=val('k');stage.innerHTML='<span>Base: <strong>'+n+'/'+d+'</strong></span><span> Partition ×'+k+': <strong>'+(n*k)+'/'+(d*k)+'</strong> ('+(n/d*100).toFixed(1)+'%)</span>';}
        else if(strand==='geometry'){var l=val('l'),w=val('w');stage.innerHTML='<span>Area = '+l+' × '+w+' = <strong>'+(l*w)+' sq units</strong></span><span>Perimeter = 2('+l+'+'+w+') = <strong>'+(2*(l+w))+' units</strong></span>';}
        else if(strand==='data'){var da=val('a'),db=val('b'),dc=val('c'),arr=[da,db,dc].sort(function(x,y){return x-y;}),totD=da+db+dc;stage.innerHTML='<span>Sorted: '+arr.join(', ')+' · Total: <strong>'+totD+'</strong></span><span>Mean: <strong>'+(totD/3).toFixed(2)+'</strong> · Median: <strong>'+arr[1]+'</strong> · Range: <strong>'+(arr[2]-arr[0])+'</strong></span>';}
        else if(strand==='integers'){var s=val('s'),ch=val('c'),end=s+ch;stage.innerHTML='<span>Start <strong>'+s+'</strong>, move <strong>'+(ch>=0?'+'+ch+' right':ch+' left')+'</strong></span><span>Landing: <strong>'+end+'</strong> (|change| = '+Math.abs(ch)+')</span>';}
        else if(strand==='equations'){var ea=val('a'),ex=val('x'),eb=val('b'),ec=ea*ex+eb;stage.innerHTML='<span><strong>'+ea+'x + '+eb+' = '+ec+'</strong></span><span>−'+eb+' → '+ea+'x = '+(ea*ex)+' → ÷'+ea+' → <strong>x = '+ex+'</strong></span>';}
        else{var fx=val('x'),fm=val('m'),fb=val('b'),fy=fm*fx+fb;stage.innerHTML='<span>Input <strong>x = '+fx+'</strong> → Rule <strong>'+fm+'('+fx+') + ('+fb+')</strong></span><span>Output <strong>f('+fx+') = '+fy+'</strong></span>';}
      }
      box.querySelectorAll('input[type="range"]').forEach(function(inp){inp.addEventListener('input',update);});
      update();
    }
    function setupNotebook(station){
      var details=station.querySelector('.notebook'),canvas=station.querySelector('.write-canvas'),direction=station.querySelector('.write-direction'),example=station.querySelector('.write-example'),strand=station.dataset.strand,item=current[strand],mode='solve',tool='pen',drawing=false;
      function updateWriting(){direction.textContent=writingDirection(strand,mode,item);example.textContent=writingFrame(strand,mode,item);example.hidden=true;station.querySelector('[data-write-tool="scaffold"]').textContent='Show writing frame';}
      var kit=null,strokes=[],activeStroke=null;
      function redraw(){if(!kit)return;var ctx=kit.ctx;ctx.clearRect(0,0,kit.width,kit.height);strokes.forEach(function(stroke){ctx.globalCompositeOperation=stroke.tool==='eraser'?'destination-out':'source-over';ctx.strokeStyle=getComputedStyle(document.body).getPropertyValue('--text-main').trim()||'#17233a';ctx.lineWidth=stroke.tool==='eraser'?18:3;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();stroke.points.forEach(function(p,i){if(i)ctx.lineTo(p.x*kit.width,p.y*kit.height);else ctx.moveTo(p.x*kit.width,p.y*kit.height)});ctx.stroke();});ctx.globalCompositeOperation='source-over';}
      function initialize(){if(kit||!canvas.getBoundingClientRect().width)return;kit=SimKit.canvas2d(canvas,{box:canvas.parentElement,height:220,onResize:function(){if(kit)redraw();}});station.destroyNotebook=function(){kit.destroy();};}
      function point(event){var rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height};}
      function start(event){initialize();drawing=true;activeStroke={tool:tool,points:[point(event)]};strokes.push(activeStroke);canvas.setPointerCapture(event.pointerId);event.preventDefault();}
      function move(event){if(!drawing)return;activeStroke.points.push(point(event));redraw();event.preventDefault();}
      function stop(){drawing=false;activeStroke=null;}
      details.addEventListener('toggle',function(){if(details.open)requestAnimationFrame(initialize);});canvas.addEventListener('pointerdown',start);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);
      station.querySelectorAll('.write-mode').forEach(function(button){button.addEventListener('click',function(){mode=button.dataset.writeMode;station.querySelectorAll('.write-mode').forEach(function(b){b.classList.toggle('active',b===button)});updateWriting()})});
      station.querySelectorAll('[data-write-tool]').forEach(function(button){button.addEventListener('click',function(){var action=button.dataset.writeTool;if(action==='clear'){strokes=[];redraw();return}if(action==='scaffold'){example.hidden=!example.hidden;button.textContent=example.hidden?'Show writing frame':'Hide writing frame';return}tool=action;station.querySelectorAll('[data-write-tool="pen"],[data-write-tool="eraser"]').forEach(function(b){b.classList.toggle('active',b===button)})})});
      updateWriting();
    }
    function render(station){
      if(station.destroyNotebook){station.destroyNotebook();station.destroyNotebook=null;}var strand=station.dataset.strand,item=exercise(strand,chosenLevel()),escape=FoundationTasks.escape;current[strand]=item;
      station.querySelector('.station-head h2').textContent=item.goal;station.querySelector('.station-openmoji').alt='Illustration for '+item.goal;station.querySelector('.station-openmoji').setAttribute('aria-label','Enlarge illustration for '+item.goal);
      station.querySelector('.station-head small').textContent=item.label+' · '+strand;
      var prompt=mode==='apply'?item.apply:item.prompt;
      station.querySelector('.workbench').innerHTML='<p class="problem">'+escape(prompt)+'</p><button type="button" class="model-toggle" aria-expanded="'+(mode==='explore')+'">'+(mode==='explore'?'Hide model':'Inspect model')+'</button><div class="model" '+(mode==='explore'?'':'hidden')+'>'+item.visual+'</div>'+buildManipulativeHTML(strand)+'<p class="answer-format">'+(item.answer==='blue'?'Enter a color word.':'Enter a number or an exact fraction such as 3/5. Equivalent fractions and decimals are accepted.')+(item.unit?' Report in '+escape(item.unit)+'.':'')+'</p><div class="response"><input type="text" aria-label="Answer: '+escape(item.goal)+'" placeholder="Your answer"/><button class="check-btn" type="button">Check</button><button class="new-btn" type="button">New</button><button class="hint-btn" type="button" aria-expanded="false">Need a hint?</button><p class="hint" hidden>'+escape(item.hint)+'</p><p class="feedback" aria-live="polite"></p></div><div class="reasoning"><label for="reason-'+strand+'">Explain your thinking</label><p>'+escape(item.reason)+'</p><textarea id="reason-'+strand+'" rows="3" placeholder="Use words, equations, or describe your drawing. You can also explain aloud."></textarea><details class="worked-solution"><summary>Study a worked solution</summary><p>'+escape(item.solution)+'</p><p>Close this solution, choose New, and test the method independently.</p></details></div><details class="notebook"><summary>Draw &amp; work it out</summary><div class="notebook-body"><div class="write-modes" role="group" aria-label="Writing scenario"><button class="write-mode active" data-write-mode="solve">Solve</button><button class="write-mode" data-write-mode="equation">Represent</button><button class="write-mode" data-write-mode="story">Create a story</button><button class="write-mode" data-write-mode="explain">Explain why</button></div><p class="write-direction"></p><div class="notebook-sheet"><canvas class="write-canvas" aria-label="Optional drawing workspace; use the explanation text field to type your work"></canvas><div class="write-example"></div></div><div class="write-tools"><button class="write-tool active" data-write-tool="pen">Pen</button><button class="write-tool" data-write-tool="eraser">Eraser</button><button class="write-tool" data-write-tool="clear">Clear drawing</button><button class="write-tool" data-write-tool="scaffold">Show writing frame</button></div></div></details>';
      var modelEl=station.querySelector('.model');
      if(window.MathWorksheetViz&&modelEl&&modelEl.querySelector('.dot-expression,.array,.sequence,.place-model,.fraction-visual,.shape,.bars,.numberline,.balance,.machine')){window.MathWorksheetViz.render(modelEl,{prompt:prompt});}
      setupManipulative(station);
      setupNotebook(station);
      station.querySelector('.worked-solution').addEventListener('toggle',function(){if(this.open){assisted.add(strand);updateScore();}});
    }
    function updateRoute(){var g=Number(level),p=FoundationTasks.profiles[g];document.getElementById('route-title').textContent=(g===0?'Kindergarten':'Grade '+g)+' · '+p[1];document.getElementById('route-focus').textContent=p[2];document.getElementById('route-prerequisite').textContent=g===0?'Start with objects: pair each spoken number with one object. An adult can read prompts and record oral explanations.':'Prerequisite check: explain one task from '+(g===1?'Kindergarten':'Grade '+(g-1))+', then return here. Choose a model when a method stops making sense.';}
    function syncHashFocus(fromInit){
      var cfg=hashConfig[location.hash],focusBar=document.getElementById('pathway-focus-bar'),grid=document.querySelector('.station-grid'),gradeSelect=document.getElementById('grade-level');
      document.querySelectorAll('.station').forEach(function(st){st.classList.toggle('is-focused-station',Boolean(cfg&&st.id===cfg.id));});
      document.querySelectorAll('.journey-stop').forEach(function(stop){stop.classList.toggle('is-active-stop',Boolean(cfg&&stop.getAttribute('href')===location.hash));});
      if(!cfg){
        singleStationFocus=false;
        if(grid)grid.classList.remove('is-single-focus');
        if(focusBar)focusBar.hidden=true;
        return;
      }
      if(!userPickedGrade&&level!==cfg.grade){
        level=cfg.grade;
        if(gradeSelect)gradeSelect.value=level;
        if(!fromInit){solved.clear();assisted.clear();document.querySelectorAll('.station').forEach(render);updateRoute();updateScore();}
      }
      if(grid)grid.classList.toggle('is-single-focus',singleStationFocus);
      if(focusBar){
        focusBar.hidden=false;
        var gLabel=Number(level)===0?'Kindergarten':'Grade '+level;
        focusBar.innerHTML='<div class="pathway-focus-copy"><small>Pathway Station '+cfg.num+' Active</small><strong>'+cfg.title+' · Set to '+gLabel+' (change Starting Point above for K–12)</strong></div><div class="pathway-focus-actions"><button type="button" class="pathway-focus-btn'+(singleStationFocus?' active':'')+'" data-focus-action="toggle-single">'+(singleStationFocus?'Show all 10 stations':'Focus this station only')+'</button><button type="button" class="pathway-focus-btn" data-focus-action="clear">Clear highlight</button></div>';
      }
    }
    if(hashConfig[location.hash]){level=hashConfig[location.hash].grade;var gs=document.getElementById('grade-level');if(gs)gs.value=level;}
    document.getElementById('grade-level').addEventListener('change',function(){userPickedGrade=true;level=this.value;solved.clear();assisted.clear();document.querySelectorAll('.station').forEach(render);updateRoute();updateScore();syncHashFocus(false);});
    document.getElementById('practice-mode').addEventListener('change',function(){mode=this.value;solved.clear();assisted.clear();document.querySelectorAll('.station').forEach(render);updateScore();});
    function updateScore(){var pct=Math.round(solved.size/10*100);document.getElementById('score-ring').textContent=pct+'%';document.getElementById('score-text').textContent=solved.size+' of 10 correct · '+assisted.size+' used a solution';document.querySelectorAll('[data-map-strand]').forEach(function(stop){stop.classList.toggle('complete',solved.has(stop.dataset.mapStrand))})}
    updateRoute();document.querySelectorAll('.station').forEach(render);syncHashFocus(true);
    window.addEventListener('hashchange',function(){syncHashFocus(false);});
    document.addEventListener('click',function(e){
      var focusBtn=e.target.closest('[data-focus-action]');
      if(focusBtn){
        var act=focusBtn.dataset.focusAction;
        if(act==='toggle-single'){singleStationFocus=!singleStationFocus;syncHashFocus(true);}
        else if(act==='clear'){singleStationFocus=false;history.replaceState(null,'',location.pathname+location.search);syncHashFocus(true);}
        return;
      }
      var station=e.target.closest('.station');if(!station)return;var strand=station.dataset.strand;
      if(e.target.closest('.new-btn')){solved.delete(strand);assisted.delete(strand);render(station);station.querySelector('.response input').focus();updateScore();return}
      if(e.target.closest('.model-toggle')){var model=station.querySelector('.model');model.hidden=!model.hidden;e.target.textContent=model.hidden?'Inspect model':'Hide model';e.target.setAttribute('aria-expanded',String(!model.hidden));return}
      if(e.target.closest('.hint-btn')){var hint=station.querySelector('.hint');hint.hidden=!hint.hidden;e.target.textContent=hint.hidden?'Need a hint?':'Hide hint';e.target.setAttribute('aria-expanded',String(!hint.hidden));return}
      if(e.target.closest('.check-btn')){var input=station.querySelector('.response input'),feedback=station.querySelector('.feedback'),actual=input.value.trim(),expected=current[strand].answer;if(FoundationTasks.check(actual,expected)){feedback.textContent='Correct. Now explain why your method works. A checked answer alone does not show mastery.';feedback.className='feedback good';solved.add(strand)}else{feedback.textContent=actual?'Not yet. '+current[strand].hint+' Check your units and calculation, then try again.':'Enter an answer first. Use a number, fraction, or the requested word.';feedback.className='feedback try';solved.delete(strand)}updateScore()}
    });
    document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.matches('.response input'))e.target.closest('.response').querySelector('.check-btn').click()});
  }());
