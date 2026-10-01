  (function(){
    'use strict';
    var level='3', solved=new Set(), current={}, mode='explore', assisted=new Set();
    
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
      station.querySelector('.workbench').innerHTML='<p class="problem">'+escape(prompt)+'</p><button type="button" class="model-toggle" aria-expanded="'+(mode==='explore')+'">'+(mode==='explore'?'Hide model':'Inspect model')+'</button><div class="model" '+(mode==='explore'?'':'hidden')+'>'+item.visual+'</div><p class="answer-format">'+(item.answer==='blue'?'Enter a color word.':'Enter a number or an exact fraction such as 3/5. Equivalent fractions and decimals are accepted.')+(item.unit?' Report in '+escape(item.unit)+'.':'')+'</p><div class="response"><input type="text" aria-label="Answer: '+escape(item.goal)+'" placeholder="Your answer"/><button class="check-btn" type="button">Check</button><button class="new-btn" type="button">New</button><button class="hint-btn" type="button" aria-expanded="false">Need a hint?</button><p class="hint" hidden>'+escape(item.hint)+'</p><p class="feedback" aria-live="polite"></p></div><div class="reasoning"><label for="reason-'+strand+'">Explain your thinking</label><p>'+escape(item.reason)+'</p><textarea id="reason-'+strand+'" rows="3" placeholder="Use words, equations, or describe your drawing. You can also explain aloud."></textarea><details class="worked-solution"><summary>Study a worked solution</summary><p>'+escape(item.solution)+'</p><p>Close this solution, choose New, and test the method independently.</p></details></div><details class="notebook"><summary>Draw &amp; work it out</summary><div class="notebook-body"><div class="write-modes" role="group" aria-label="Writing scenario"><button class="write-mode active" data-write-mode="solve">Solve</button><button class="write-mode" data-write-mode="equation">Represent</button><button class="write-mode" data-write-mode="story">Create a story</button><button class="write-mode" data-write-mode="explain">Explain why</button></div><p class="write-direction"></p><div class="notebook-sheet"><canvas class="write-canvas" aria-label="Optional drawing workspace; use the explanation text field to type your work"></canvas><div class="write-example"></div></div><div class="write-tools"><button class="write-tool active" data-write-tool="pen">Pen</button><button class="write-tool" data-write-tool="eraser">Eraser</button><button class="write-tool" data-write-tool="clear">Clear drawing</button><button class="write-tool" data-write-tool="scaffold">Show writing frame</button></div></div></details>';
      setupNotebook(station);
      station.querySelector('.worked-solution').addEventListener('toggle',function(){if(this.open){assisted.add(strand);updateScore();}});
    }
    function updateRoute(){var g=Number(level),p=FoundationTasks.profiles[g];document.getElementById('route-title').textContent=(g===0?'Kindergarten':'Grade '+g)+' · '+p[1];document.getElementById('route-focus').textContent=p[2];document.getElementById('route-prerequisite').textContent=g===0?'Start with objects: pair each spoken number with one object. An adult can read prompts and record oral explanations.':'Prerequisite check: explain one task from '+(g===1?'Kindergarten':'Grade '+(g-1))+', then return here. Choose a model when a method stops making sense.';}
    document.getElementById('grade-level').addEventListener('change',function(){level=this.value;solved.clear();assisted.clear();document.querySelectorAll('.station').forEach(render);updateRoute();updateScore();});
    document.getElementById('practice-mode').addEventListener('change',function(){mode=this.value;solved.clear();assisted.clear();document.querySelectorAll('.station').forEach(render);updateScore();});
    function updateScore(){var pct=Math.round(solved.size/10*100);document.getElementById('score-ring').textContent=pct+'%';document.getElementById('score-text').textContent=solved.size+' of 10 correct · '+assisted.size+' used a solution';document.querySelectorAll('[data-map-strand]').forEach(function(stop){stop.classList.toggle('complete',solved.has(stop.dataset.mapStrand))})}
    updateRoute();document.querySelectorAll('.station').forEach(render);
    document.addEventListener('click',function(e){
      var station=e.target.closest('.station');if(!station)return;var strand=station.dataset.strand;
      if(e.target.closest('.new-btn')){solved.delete(strand);assisted.delete(strand);render(station);station.querySelector('.response input').focus();updateScore();return}
      if(e.target.closest('.model-toggle')){var model=station.querySelector('.model');model.hidden=!model.hidden;e.target.textContent=model.hidden?'Inspect model':'Hide model';e.target.setAttribute('aria-expanded',String(!model.hidden));return}
      if(e.target.closest('.hint-btn')){var hint=station.querySelector('.hint');hint.hidden=!hint.hidden;e.target.textContent=hint.hidden?'Need a hint?':'Hide hint';e.target.setAttribute('aria-expanded',String(!hint.hidden));return}
      if(e.target.closest('.check-btn')){var input=station.querySelector('input'),feedback=station.querySelector('.feedback'),actual=input.value.trim(),expected=current[strand].answer;if(FoundationTasks.check(actual,expected)){feedback.textContent='Correct. Now explain why your method works. A checked answer alone does not show mastery.';feedback.className='feedback good';solved.add(strand)}else{feedback.textContent=actual?'Not yet. '+current[strand].hint+' Check your units and calculation, then try again.':'Enter an answer first. Use a number, fraction, or the requested word.';feedback.className='feedback try';solved.delete(strand)}updateScore()}
    });
    document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.matches('.response input'))e.target.closest('.response').querySelector('.check-btn').click()});
  }());
