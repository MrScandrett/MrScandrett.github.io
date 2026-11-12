  (function(){
    'use strict';
    var level='3', solved=new Set(), current={}, mode='explore', assisted=new Set(), userPickedGrade=false, singleStationFocus=true;

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

    var activeStrand='counting',session=null,reviewItem=null,attempted=new Set(),mistakes=[],saved={};
    try{saved=JSON.parse(localStorage.getItem('math-foundations-trainer-v1'))||{};}catch(e){}
    function statsKey(strand){return level+':'+strand;}
    function updateTrainer(){
      var total=0,right=0;
      document.querySelectorAll('.journey-stop').forEach(function(link){
        var strand=link.dataset.mapStrand,st=saved[statsKey(strand)]||{total:0,right:0};total+=st.total;right+=st.right;
        var badge=link.querySelector('.math-activity-score');if(!badge){badge=document.createElement('small');badge.className='math-activity-score';link.appendChild(badge);}badge.textContent=st.total?st.right+'/'+st.total+' first try':'Not practiced';
        var task=current[strand];link.title=task?task.goal:'';
      });
      document.getElementById('score-ring').textContent=total?Math.round(right/total*100)+'%':'—';
      document.getElementById('score-text').textContent=right+' / '+total+' correct on first try';
      document.getElementById('math-review').hidden=!mistakes.length;
      var item=current[activeStrand];document.getElementById('math-recommendation').textContent=item?'Next: '+item.goal+'. Try five questions, then revisit any mistakes.':'Choose one activity to begin.';
      document.getElementById('math-session').textContent=session?(session.review?'Mistake review':'Practice set')+' · Question '+Math.min(session.index+(session.answered?0:1),session.items.length)+' of '+session.items.length+' · '+session.right+' correct on first try':'Free practice · choose any activity below.';
    }
    function endSet(){session=null;mistakes=[];attempted.clear();}
    function startSet(review){
      var items=review?mistakes.slice():Array.from({length:5},function(){return exercise(activeStrand,level);});
      if(!items.length)return;
      mistakes=[];attempted.clear();session={items:items,index:0,right:0,answered:false,review:review};reviewItem=items[0];
      var station=document.querySelector('.station[data-strand="'+activeStrand+'"]');render(station);updateTrainer();station.querySelector('.response input').focus();
    }
    function finishSet(){var result=session;session=null;updateTrainer();document.getElementById('math-session').textContent='Set complete · '+result.right+' of '+result.items.length+' correct on first try. '+(mistakes.length?'Review mistakes to try those questions again.':'Try another activity or a new set.');}
    function recordAttempt(strand,correct){
      if(!attempted.has(strand)){
        attempted.add(strand);var key=statsKey(strand),st=saved[key]||(saved[key]={total:0,right:0});st.total++;if(correct)st.right++;else mistakes.push(current[strand]);
        try{localStorage.setItem('math-foundations-trainer-v1',JSON.stringify(saved));}catch(e){}
        if(session){session.index++;session.answered=true;if(correct)session.right++;}
      }
      if(session){var station=document.querySelector('.station[data-strand="'+strand+'"]');station.querySelector('.new-btn').disabled=false;station.querySelector('.new-btn').textContent=session.index===session.items.length?'Finish set':'Next question →';}
      updateTrainer();
    }
    document.getElementById('math-start').addEventListener('click',function(){startSet(false);});
    document.getElementById('math-review').addEventListener('click',function(){startSet(true);});
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
      if(station.destroyNotebook){station.destroyNotebook();station.destroyNotebook=null;}var strand=station.dataset.strand,item=reviewItem||exercise(strand,chosenLevel()),escape=FoundationTasks.escape;reviewItem=null;current[strand]=item;
      station.querySelector('.station-head h2').textContent=item.goal;station.querySelector('.station-openmoji').alt='Illustration for '+item.goal;station.querySelector('.station-openmoji').setAttribute('aria-label','Enlarge illustration for '+item.goal);
      station.querySelector('.station-head small').textContent=item.label+' · '+strand;
      var prompt=mode==='apply'?item.apply:item.prompt;
      station.querySelector('.workbench').innerHTML='<p class="problem">'+escape(prompt)+'</p><button type="button" class="model-toggle" aria-expanded="'+(mode==='explore')+'">'+(mode==='explore'?'Hide model':'Inspect model')+'</button><div class="model" '+(mode==='explore'?'':'hidden')+'>'+item.visual+'</div>'+'<p class="answer-format">'+(item.answer==='blue'?'Enter a color word.':'Enter a number or an exact fraction such as 3/5. Equivalent fractions and decimals are accepted.')+(item.unit?' Report in '+escape(item.unit)+'.':'')+'</p><div class="response"><input type="text" aria-label="Answer: '+escape(item.goal)+'" placeholder="Your answer"/><button class="check-btn" type="button">Check</button><button class="new-btn" type="button">New</button><button class="hint-btn" type="button" aria-expanded="false">Need a hint?</button><p class="hint" hidden>'+escape(item.hint)+'</p><p class="feedback" aria-live="polite"></p></div><div class="reasoning"><label for="reason-'+strand+'">Explain your thinking</label><p>'+escape(item.reason)+'</p><textarea id="reason-'+strand+'" rows="3" placeholder="Use words, equations, or describe your drawing. You can also explain aloud."></textarea><details class="worked-solution"><summary>Study a worked solution</summary><p>'+escape(item.solution)+'</p><p>Close this solution, choose New, and test the method independently.</p></details></div><details class="notebook"><summary>Draw &amp; work it out</summary><div class="notebook-body"><div class="write-modes" role="group" aria-label="Writing scenario"><button class="write-mode active" data-write-mode="solve">Solve</button><button class="write-mode" data-write-mode="equation">Represent</button><button class="write-mode" data-write-mode="story">Create a story</button><button class="write-mode" data-write-mode="explain">Explain why</button></div><p class="write-direction"></p><div class="notebook-sheet"><canvas class="write-canvas" aria-label="Optional drawing workspace; use the explanation text field to type your work"></canvas><div class="write-example"></div></div><div class="write-tools"><button class="write-tool active" data-write-tool="pen">Pen</button><button class="write-tool" data-write-tool="eraser">Eraser</button><button class="write-tool" data-write-tool="clear">Clear drawing</button><button class="write-tool" data-write-tool="scaffold">Show writing frame</button></div></div></details>';
      var modelEl=station.querySelector('.model');
      if(window.MathWorksheetViz&&modelEl&&modelEl.querySelector('.dot-expression,.array,.sequence,.place-model,.fraction-visual,.shape,.bars,.numberline,.balance,.machine')){window.MathWorksheetViz.render(modelEl,{prompt:prompt});}
      station.querySelector('.new-btn').textContent='Next question →';station.querySelector('.new-btn').disabled=Boolean(session&&!session.answered);
      setupNotebook(station);
      station.querySelector('.worked-solution').addEventListener('toggle',function(){if(this.open){assisted.add(strand);updateScore();}});
    }
    function updateRoute(){var g=Number(level),p=FoundationTasks.profiles[g];document.getElementById('route-title').textContent=(g===0?'Kindergarten':'Grade '+g)+' · '+p[1];document.getElementById('route-focus').textContent=p[2];document.getElementById('route-prerequisite').textContent=g===0?'Start with objects: pair each spoken number with one object. An adult can read prompts and record oral explanations.':'Prerequisite check: explain one task from '+(g===1?'Kindergarten':'Grade '+(g-1))+', then return here. Choose a model when a method stops making sense.';}
    function syncHashFocus(fromInit){
      var cfg=hashConfig[location.hash],focusBar=document.getElementById('pathway-focus-bar'),grid=document.querySelector('.station-grid'),gradeSelect=document.getElementById('grade-level');
      document.querySelectorAll('.station').forEach(function(st){st.classList.toggle('is-focused-station',Boolean(cfg&&st.id===cfg.id));});
      document.querySelectorAll('.journey-stop').forEach(function(stop){stop.classList.toggle('is-active-stop',Boolean(cfg&&stop.getAttribute('href')===location.hash));});
      if(!cfg){cfg=hashConfig['#counting'];}
      activeStrand=cfg.strand;
      document.querySelectorAll('.station').forEach(function(st){st.hidden=st.dataset.strand!==activeStrand;});
      document.querySelectorAll('.journey-stop').forEach(function(stop){if(stop.dataset.mapStrand===activeStrand)stop.setAttribute('aria-current','true');else stop.removeAttribute('aria-current');});
      if(focusBar)focusBar.hidden=true;
      updateTrainer();
      if(!userPickedGrade&&location.hash&&level!==cfg.grade){
        level=cfg.grade;
        if(gradeSelect)gradeSelect.value=level;
        if(!fromInit){solved.clear();assisted.clear();document.querySelectorAll('.station').forEach(render);updateRoute();updateScore();}
      }

    }
    if(hashConfig[location.hash]){level=hashConfig[location.hash].grade;var gs=document.getElementById('grade-level');if(gs)gs.value=level;}
    document.getElementById('grade-level').addEventListener('change',function(){endSet();userPickedGrade=true;level=this.value;solved.clear();assisted.clear();document.querySelectorAll('.station').forEach(render);updateRoute();updateScore();syncHashFocus(false);});
    document.getElementById('practice-mode').addEventListener('change',function(){endSet();mode=this.value;solved.clear();assisted.clear();document.querySelectorAll('.station').forEach(render);updateScore();});
    function updateScore(){updateTrainer();}

    updateRoute();document.querySelectorAll('.station').forEach(render);syncHashFocus(true);
    window.addEventListener('hashchange',function(){endSet();syncHashFocus(false);});
    document.addEventListener('click',function(e){
      var focusBtn=e.target.closest('[data-focus-action]');
      if(focusBtn){
        var act=focusBtn.dataset.focusAction;
        if(act==='toggle-single'){singleStationFocus=!singleStationFocus;syncHashFocus(true);}
        else if(act==='clear'){singleStationFocus=false;history.replaceState(null,'',location.pathname+location.search);syncHashFocus(true);}
        return;
      }
      var station=e.target.closest('.station');if(!station)return;var strand=station.dataset.strand;
      if(e.target.closest('.new-btn')){if(session&&!session.answered)return;if(session&&session.index===session.items.length){finishSet();return;}if(session){reviewItem=session.items[session.index];session.answered=false;}attempted.delete(strand);solved.delete(strand);assisted.delete(strand);render(station);station.querySelector('.response input').focus();updateScore();return}
      if(e.target.closest('.model-toggle')){var model=station.querySelector('.model');model.hidden=!model.hidden;e.target.textContent=model.hidden?'Inspect model':'Hide model';e.target.setAttribute('aria-expanded',String(!model.hidden));return}
      if(e.target.closest('.hint-btn')){var hint=station.querySelector('.hint');hint.hidden=!hint.hidden;e.target.textContent=hint.hidden?'Need a hint?':'Hide hint';e.target.setAttribute('aria-expanded',String(!hint.hidden));return}
      if(e.target.closest('.check-btn')){var input=station.querySelector('.response input'),feedback=station.querySelector('.feedback'),actual=input.value.trim(),expected=current[strand].answer;if(!actual){feedback.textContent='Enter an answer first.';return;}if(session&&session.answered)return;var correct=FoundationTasks.check(actual,expected);recordAttempt(strand,correct);if(correct){feedback.textContent='Correct. Explain your method, then choose Next question.';feedback.className='feedback good';solved.add(strand)}else{feedback.textContent=actual?'Not yet. '+current[strand].hint+' Check your units and calculation, then try again.':'Enter an answer first. Use a number, fraction, or the requested word.';feedback.className='feedback try';solved.delete(strand)}updateScore()}
    });
    document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.matches('.response input'))e.target.closest('.response').querySelector('.check-btn').click()});
  }());
