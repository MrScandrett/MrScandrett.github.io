  (function(){
    'use strict';
    var level='3', solved=new Set(), current={}, mode='explore', assisted=new Set(), userPickedGrade=false, singleStationFocus=true;

    var hashConfig={
      '#counting':{grade:'1',num:'01',title:'Counting to Operations Lab',strand:'counting'},
      '#patterns':{grade:'2',num:'02',title:'Patterns, Shapes & Rules',strand:'patterns'},
      '#place-value':{grade:'2',num:'03',title:'Place Value & Operation Sense',strand:'place'},
      '#multiplication':{grade:'3',num:'04',title:'Groups, Arrays & Division',strand:'multiply'},
      '#fractions':{grade:'4',num:'05',title:'Fraction Sense Lab',strand:'fractions'},
      '#geometry':{grade:'4',num:'06',title:'Geometry & Measurement Studio',strand:'geometry'},
      '#data':{grade:'5',num:'07',title:'Data Stories & Graphs',strand:'data'},
      '#integers':{grade:'6',num:'08',title:'Integers & Rational Numbers',strand:'integers'},
      '#equations':{grade:'7',num:'09',title:'Balance, Variables & Equations',strand:'equations'},
      '#functions':{grade:'8',num:'10',title:'Patterns to Functions',strand:'functions'}
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
      document.getElementById('math-session').textContent=session?(session.review?'Mistake review':'Practice set')+' · Question '+Math.min(session.index+(session.answered?0:1),session.items.length)+' of '+session.items.length+' · '+session.right+' correct on first try':'Free practice';
    }
    function endSet(){session=null;mistakes=[];attempted.clear();}
    function focusAnswer(station){
      var answer=station.querySelector('.response input'), pane=station.closest('.station-grid');
      answer.focus({preventScroll:true});
      var bounds=answer.getBoundingClientRect(), frame=pane.getBoundingClientRect();
      if(bounds.top<frame.top||bounds.bottom>frame.bottom){
        pane.scrollBy({top:bounds.top-frame.top-8,behavior:'instant'});
      }
    }
    function startSet(review){
      var items=review?mistakes.slice():Array.from({length:5},function(){return exercise(activeStrand,level);});
      if(!items.length)return;
      mistakes=[];attempted.clear();session={items:items,index:0,right:0,answered:false,review:review};reviewItem=items[0];
      var station=document.querySelector('.station[data-strand="'+activeStrand+'"]');render(station);updateTrainer();focusAnswer(station);
    }
    function finishSet(){var result=session;session=null;updateTrainer();document.getElementById('math-session').textContent='Set complete · '+result.right+' of '+result.items.length+' correct on first try. '+(mistakes.length?'Review mistakes to try those questions again.':'Try another activity or a new set.');}
    function recordAttempt(strand,correct){
      if(!attempted.has(strand)){
        attempted.add(strand);var key=statsKey(strand),st=saved[key]||(saved[key]={total:0,right:0});st.total++;if(correct)st.right++;else mistakes.push(current[strand]);
        try{localStorage.setItem('math-foundations-trainer-v1',JSON.stringify(saved));}catch(e){}
        if(session){session.index++;session.answered=true;if(correct)session.right++;}
      }
      if(session){var station=document.querySelector('.station[data-strand="'+strand+'"]');station.querySelector('.new-btn').disabled=false;station.querySelector('.new-btn').textContent=session.index===session.items.length?'Finish set':'Next';}
      updateTrainer();
    }
    document.getElementById('math-start').addEventListener('click',function(){startSet(false);});
    document.getElementById('math-review').addEventListener('click',function(){startSet(true);});
    function chosenLevel(){return level;}
    function exercise(strand,grade){return FoundationTasks.create(strand,grade);}
    function setupThinkingBoard(station,promptText){
      var board=station.querySelector('.thinking-board');
      var logic=window.MathThinkingBoard;
      if(!board||!logic)return;
      var stage=board.querySelector('.tb-stage');
      var canvas=board.querySelector('.tb-canvas');
      var summaryEl=board.querySelector('.tb-summary');
      var undoBtn=board.querySelector('[data-wb-action="undo"]');
      var clearBtn=board.querySelector('[data-wb-action="clear"]');
      var paperBtn=board.querySelector('[data-wb-action="paper"]');
      var insertBtn=board.querySelector('[data-wb-action="insert"]');
      var voiceBtn=board.querySelector('[data-wb-action="voice"]');
      var strand=station.dataset.strand;
      var item=current[strand];
      var reasonText=station.querySelector('#reason-'+strand);

      var tool='pen';
      var paperModes=['grid','lined','blank'];
      var paperLabels={grid:'Grid',lined:'Lined',blank:'Blank'};
      var paperIndex=0;
      var strokes=[];
      var counters=[];
      var history=[];
      var activeStroke=null;
      var dragState=null;
      var erasingPointerId=null;
      var eraseSnapshot=null;
      var eraseChanged=false;
      var summaryTimer=0;
      var summaryGen=0;
      var isSpeaking=false;
      var activeUtter=null;
      var speechAvailable=('speechSynthesis' in window)&&typeof window.SpeechSynthesisUtterance==='function';
      if(!speechAvailable&&voiceBtn)voiceBtn.hidden=true;

      function readPalette(){
        var rootCs=getComputedStyle(document.documentElement);
        var stageCs=getComputedStyle(stage);
        var boardCs=getComputedStyle(board);
        var bg=stageCs.backgroundColor;
        if(!bg||bg==='transparent'||bg==='rgba(0, 0, 0, 0)'){
          bg=rootCs.getPropertyValue('--white').trim()||'#ffffff';
        }
        return{
          ink:stageCs.color||rootCs.getPropertyValue('--text-primary').trim()||'#1d1d1f',
          accent:rootCs.getPropertyValue('--accent').trim()||'#0066cc',
          accentContrast:rootCs.getPropertyValue('--text-on-accent').trim()||rootCs.getPropertyValue('--accent-contrast').trim()||'#ffffff',
          surface:bg,
          font:boardCs.fontFamily||'system-ui, sans-serif'
        };
      }

      var palette=readPalette();
      var surface=null;

      function redraw(ctxArg,wArg,hArg){
        var c=ctxArg||(surface&&surface.ctx)||canvas.getContext('2d');
        var w=wArg!=null?wArg:(surface?surface.width:stage.clientWidth);
        var h=hArg!=null?hArg:(surface?surface.height:stage.clientHeight);
        if(!c||!w||!h||w<=1||h<=1)return;
        c.clearRect(0,0,w,h);

        strokes.forEach(function(st){
          var pts=st.points;
          if(!pts||!pts.length)return;
          c.fillStyle=palette.ink;
          c.strokeStyle=palette.ink;
          if(pts.length===1){
            c.beginPath();
            c.arc(pts[0].x*w,pts[0].y*h,1.8,0,Math.PI*2);
            c.fill();
            return;
          }
          c.beginPath();
          c.lineWidth=3;
          c.lineCap='round';
          c.lineJoin='round';
          pts.forEach(function(p,idx){
            var px=p.x*w,py=p.y*h;
            if(idx===0)c.moveTo(px,py);
            else c.lineTo(px,py);
          });
          c.stroke();
        });

        counters.forEach(function(cnt,idx){
          var cx=cnt.x*w,cy=cnt.y*h,r=13;
          c.beginPath();
          c.arc(cx,cy,r,0,Math.PI*2);
          if(cnt.group===1){
            c.fillStyle=palette.surface;
            c.fill();
            c.strokeStyle=palette.accent;
            c.lineWidth=2.5;
            c.stroke();
            c.fillStyle=palette.ink;
          }else{
            c.fillStyle=palette.accent;
            c.fill();
            c.strokeStyle=palette.surface;
            c.lineWidth=2;
            c.stroke();
            c.fillStyle=palette.accentContrast;
          }
          c.font='700 11px '+palette.font;
          c.textAlign='center';
          c.textBaseline='middle';
          c.fillText(String(idx+1),cx,cy+0.5);
        });
      }

      surface=(window.SimKit&&window.SimKit.canvas2d)?window.SimKit.canvas2d(canvas,{box:stage,onResize:redraw}):null;
      var fallbackCtx=surface?null:canvas.getContext('2d');
      function fallbackResize(){
        var rect=stage.getBoundingClientRect();
        if(!rect.width||!rect.height)return;
        var dpr=Math.min(window.devicePixelRatio||1,2);
        canvas.width=Math.round(rect.width*dpr);
        canvas.height=Math.round(rect.height*dpr);
        fallbackCtx.setTransform(dpr,0,0,dpr,0,0);
        redraw(fallbackCtx,rect.width,rect.height);
      }
      if(!surface){
        window.addEventListener('resize',fallbackResize);
        requestAnimationFrame(fallbackResize);
      }

      function canvasDims(){
        var rect=canvas.getBoundingClientRect();
        var w=rect.width||(surface?surface.width:0)||stage.clientWidth||400;
        var h=rect.height||(surface?surface.height:0)||stage.clientHeight||215;
        return{w:w,h:h,rect:rect};
      }

      var currentAnalysis=logic.analyzeBoard({strokes:strokes,counters:counters,width:canvasDims().w,height:canvasDims().h});

      function refreshSummary(){
        var dims=canvasDims();
        currentAnalysis=logic.analyzeBoard({strokes:strokes,counters:counters,width:dims.w,height:dims.h});
        if(summaryTimer){clearTimeout(summaryTimer);summaryTimer=0;}
        summaryGen++;
        summaryEl.textContent=currentAnalysis.summary;
        undoBtn.disabled=history.length===0;
        clearBtn.disabled=!currentAnalysis.hasWork;
        insertBtn.disabled=!currentAnalysis.hasWork;
      }

      function pushSnapshot(snap){
        history.push(snap);
        if(history.length>40)history.shift();
      }
      function pushHistory(){
        pushSnapshot(logic.cloneState(strokes,counters));
      }

      function pointerPos(e){
        var d=canvasDims();
        var px=Math.max(0,Math.min(d.w,e.clientX-d.rect.left));
        var py=Math.max(0,Math.min(d.h,e.clientY-d.rect.top));
        return{px:px,py:py,w:d.w,h:d.h};
      }

      function clampCounter(px,py,w,h){
        var padX=Math.min(16,w*0.25),padY=Math.min(16,h*0.25);
        var cx=Math.max(padX,Math.min(w-padX,px));
        var cy=Math.max(padY,Math.min(h-padY,py));
        return{x:cx/w,y:cy/h};
      }

      function eraseAt(pos){
        var removed=false;
        var cIdx=logic.hitTestCounter(counters,pos.px,pos.py,pos.w,pos.h,16);
        if(cIdx>=0){
          counters.splice(cIdx,1);
          removed=true;
        }else{
          var sIdx=logic.hitTestStroke(strokes,pos.px,pos.py,pos.w,pos.h,12);
          if(sIdx>=0){
            strokes.splice(sIdx,1);
            removed=true;
          }
        }
        if(removed){
          eraseChanged=true;
          redraw();
          refreshSummary();
        }
      }

      function setTool(nextTool){
        tool=nextTool;
        board.dataset.wbTool=nextTool;
        board.querySelectorAll('[data-wb-tool]').forEach(function(b){
          var active=b.dataset.wbTool===nextTool;
          b.classList.toggle('is-active',active);
          b.setAttribute('aria-pressed',String(active));
        });
      }

      function performUndo(){
        if(!history.length)return;
        var snap=history.pop();
        strokes=snap.strokes;
        counters=snap.counters;
        redraw();
        refreshSummary();
      }

      function setVoiceState(active){
        isSpeaking=active;
        if(!voiceBtn)return;
        voiceBtn.classList.toggle('is-active',active);
        voiceBtn.setAttribute('aria-pressed',String(active));
        voiceBtn.textContent=active?'Stop reading':'Read aloud';
      }

      canvas.addEventListener('pointerdown',function(e){
        if(e.isPrimary===false)return;
        if(e.pointerType==='mouse'&&e.button!==0)return;
        if(surface&&(surface.width<=1||surface.height<=1))surface.resize();
        e.preventDefault();
        var pos=pointerPos(e);

        if(tool==='counter'){
          var hitIdx=logic.hitTestCounter(counters,pos.px,pos.py,pos.w,pos.h,16);
          if(hitIdx>=0){
            dragState={index:hitIdx,startPx:pos.px,startPy:pos.py,moved:false,snapshot:logic.cloneState(strokes,counters),pointerId:e.pointerId};
            try{canvas.setPointerCapture(e.pointerId);}catch(err){}
          }else{
            pushHistory();
            var pt=clampCounter(pos.px,pos.py,pos.w,pos.h);
            counters.push({x:pt.x,y:pt.y,group:0});
            redraw();
            refreshSummary();
          }
          return;
        }

        if(tool==='eraser'){
          eraseSnapshot=logic.cloneState(strokes,counters);
          eraseChanged=false;
          erasingPointerId=e.pointerId;
          try{canvas.setPointerCapture(e.pointerId);}catch(err){}
          eraseAt(pos);
          return;
        }

        pushHistory();
        activeStroke={points:[{x:pos.px/pos.w,y:pos.py/pos.h}],lastPx:pos.px,lastPy:pos.py,pointerId:e.pointerId};
        strokes.push(activeStroke);
        try{canvas.setPointerCapture(e.pointerId);}catch(err){}
        redraw();
        refreshSummary();
      });

      canvas.addEventListener('pointermove',function(e){
        var pos=pointerPos(e);
        if(dragState&&e.pointerId===dragState.pointerId){
          if(!dragState.moved&&Math.hypot(pos.px-dragState.startPx,pos.py-dragState.startPy)>4){
            dragState.moved=true;
          }
          if(dragState.moved){
            var pt=clampCounter(pos.px,pos.py,pos.w,pos.h);
            counters[dragState.index].x=pt.x;
            counters[dragState.index].y=pt.y;
            redraw();
          }
          return;
        }
        if(erasingPointerId===e.pointerId){
          eraseAt(pos);
          return;
        }
        if(activeStroke&&e.pointerId===activeStroke.pointerId){
          if(Math.hypot(pos.px-activeStroke.lastPx,pos.py-activeStroke.lastPy)>=1.5){
            activeStroke.points.push({x:pos.px/pos.w,y:pos.py/pos.h});
            activeStroke.lastPx=pos.px;
            activeStroke.lastPy=pos.py;
            redraw();
          }
        }
      });

      function finishPointer(e){
        if(dragState&&e.pointerId===dragState.pointerId){
          try{canvas.releasePointerCapture(e.pointerId);}catch(err){}
          if(dragState.moved){
            pushSnapshot(dragState.snapshot);
            refreshSummary();
          }else if(e.type==='pointerup'){
            pushHistory();
            counters[dragState.index].group=counters[dragState.index].group===1?0:1;
            redraw();
            refreshSummary();
          }
          dragState=null;
          return;
        }
        if(erasingPointerId===e.pointerId){
          try{canvas.releasePointerCapture(e.pointerId);}catch(err){}
          if(eraseChanged&&eraseSnapshot)pushSnapshot(eraseSnapshot);
          erasingPointerId=null;eraseSnapshot=null;eraseChanged=false;
          refreshSummary();
          return;
        }
        if(activeStroke&&e.pointerId===activeStroke.pointerId){
          try{canvas.releasePointerCapture(e.pointerId);}catch(err){}
          delete activeStroke.lastPx;delete activeStroke.lastPy;delete activeStroke.pointerId;
          activeStroke=null;
          refreshSummary();
        }
      }
      canvas.addEventListener('pointerup',finishPointer);
      canvas.addEventListener('pointercancel',finishPointer);

      board.querySelectorAll('[data-wb-tool]').forEach(function(btn){
        btn.addEventListener('click',function(){setTool(btn.dataset.wbTool);});
      });

      board.querySelectorAll('[data-wb-action]').forEach(function(btn){
        btn.addEventListener('click',function(){
          var act=btn.dataset.wbAction;
          if(act==='paper'){
            paperIndex=(paperIndex+1)%paperModes.length;
            var modeName=paperModes[paperIndex];
            stage.classList.remove('is-grid','is-lined','is-blank');
            stage.classList.add('is-'+modeName);
            paperBtn.textContent=paperLabels[modeName];
            paperBtn.setAttribute('aria-label','Paper style: '+paperLabels[modeName]);
            return;
          }
          if(act==='undo'){performUndo();return;}
          if(act==='clear'){
            if(!strokes.length&&!counters.length)return;
            pushHistory();
            strokes=[];
            counters=[];
            redraw();
            refreshSummary();
            return;
          }
          if(act==='insert'){
            if(!currentAnalysis.hasWork||!currentAnalysis.noteText||!reasonText)return;
            var nextVal=logic.appendNote(reasonText.value,currentAnalysis.noteText);
            reasonText.value=nextVal;
            reasonText.focus();
            if(typeof reasonText.setSelectionRange==='function'){
              reasonText.setSelectionRange(nextVal.length,nextVal.length);
            }
            if(summaryTimer)clearTimeout(summaryTimer);
            var gen=++summaryGen;
            summaryEl.textContent='Added to your notes.';
            summaryTimer=setTimeout(function(){
              summaryTimer=0;
              if(gen===summaryGen)summaryEl.textContent=currentAnalysis.summary;
            },2000);
            return;
          }
          if(act==='voice'){
            if(!speechAvailable)return;
            if(isSpeaking){
              window.speechSynthesis.cancel();
              setVoiceState(false);
              return;
            }
            var typed=reasonText?reasonText.value.trim():'';
            var textToSpeak=typed||(currentAnalysis.counterCount>0?currentAnalysis.noteText:'')||(promptText+' '+item.reason);
            var utter=new SpeechSynthesisUtterance(textToSpeak.replace(/[$_#\\*]/g,''));
            activeUtter=utter;
            utter.onend=function(){if(activeUtter===utter)setVoiceState(false);};
            utter.onerror=function(){if(activeUtter===utter)setVoiceState(false);};
            setVoiceState(true);
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utter);
          }
        });
      });

      board.addEventListener('keydown',function(e){
        if((e.metaKey||e.ctrlKey)&&!e.shiftKey&&!e.altKey&&e.key.toLowerCase()==='z'){
          var tag=e.target&&e.target.tagName;
          if(tag==='INPUT'||tag==='TEXTAREA'||(e.target&&e.target.isContentEditable))return;
          e.preventDefault();
          performUndo();
        }
      });

      var destroyed=false;
      function syncTheme(){
        if(destroyed)return;
        palette=readPalette();
        redraw();
        requestAnimationFrame(function(){
          if(destroyed)return;
          palette=readPalette();
          redraw();
        });
      }
      var themeObserver=typeof MutationObserver==='function'?new MutationObserver(syncTheme):null;
      if(themeObserver){
        themeObserver.observe(document.documentElement,{
          attributes:true,
          attributeFilter:['data-theme','data-lighting','data-skin','data-classroom-presentation','data-reduce-transparency']
        });
      }
      window.addEventListener('classroomos:lightingchange',syncTheme);
      window.addEventListener('classroomos:skinchange',syncTheme);

      station.destroyWhiteboard=function(){
        destroyed=true;
        if(summaryTimer)clearTimeout(summaryTimer);
        if(surface)surface.destroy();
        else window.removeEventListener('resize',fallbackResize);
        if(themeObserver)themeObserver.disconnect();
        window.removeEventListener('classroomos:lightingchange',syncTheme);
        window.removeEventListener('classroomos:skinchange',syncTheme);
        if(isSpeaking&&speechAvailable)window.speechSynthesis.cancel();
      };

      refreshSummary();
      redraw();
    }
    function render(station){
      if(station.destroyWhiteboard){station.destroyWhiteboard();station.destroyWhiteboard=null;}var strand=station.dataset.strand,item=reviewItem||exercise(strand,chosenLevel()),escape=FoundationTasks.escape;reviewItem=null;current[strand]=item;
      station.querySelector('.station-head h2').textContent=item.goal;station.querySelector('.station-openmoji').alt='Illustration for '+item.goal;station.querySelector('.station-openmoji').setAttribute('aria-label','Enlarge illustration for '+item.goal);
      station.querySelector('.station-head small').textContent=item.label+' · '+strand;
      var prompt=mode==='apply'?item.apply:item.prompt;
      station.querySelector('.workbench').innerHTML='<p class="problem">'+escape(prompt)+'</p><button type="button" class="model-toggle" aria-expanded="'+(mode==='explore')+'">'+(mode==='explore'?'Hide model':'Inspect model')+'</button><div class="model" '+(mode==='explore'?'':'hidden')+'>'+item.visual+'</div><div class="response"><input type="text" aria-label="Answer: '+escape(item.goal)+'" aria-describedby="answer-format-'+strand+'" placeholder="Your answer"/><button class="check-btn" type="button">Check</button><button class="new-btn" type="button">New</button><button class="hint-btn" type="button" aria-expanded="false">Need a hint?</button><p class="hint" hidden>'+escape(item.hint)+'</p><p class="feedback" aria-live="polite"></p></div><p class="answer-format" id="answer-format-'+strand+'">'+(item.answer==='blue'?'Enter a color word.':'Enter a number or an exact fraction such as 3/5. Equivalent fractions and decimals are accepted.')+(item.unit?' Report in '+escape(item.unit)+'.':'')+'</p><div class="reasoning" data-present="off"><div class="reasoning-head"><label for="reason-'+strand+'">Explain your thinking</label></div><p>'+escape(item.reason)+'</p><div class="thinking-board" data-wb-strand="'+strand+'" data-wb-tool="pen"><div class="tb-toolbar" role="toolbar" aria-label="Show your work tools"><div class="tb-group"><button type="button" class="tb-btn is-active" data-wb-tool="pen" aria-pressed="true">Pen</button><button type="button" class="tb-btn" data-wb-tool="counter" aria-pressed="false">Counter</button><button type="button" class="tb-btn" data-wb-tool="eraser" aria-pressed="false">Erase</button></div><div class="tb-group"><button type="button" class="tb-btn" data-wb-action="paper" aria-label="Paper style: Grid">Grid</button><button type="button" class="tb-btn" data-wb-action="undo" disabled>Undo</button><button type="button" class="tb-btn" data-wb-action="clear" disabled>Clear</button></div></div><div class="tb-stage is-grid" data-skin-keep><canvas class="tb-canvas" aria-label="Sketchpad for explaining your thinking"></canvas></div><div class="tb-footer"><p class="tb-summary" aria-live="polite">Draw or place counters to show your strategy.</p><div class="tb-footer-actions"><button type="button" class="tb-btn" data-wb-action="insert" disabled>Add to notes</button><button type="button" class="tb-btn" data-wb-action="voice" aria-pressed="false">Read aloud</button></div></div></div><textarea id="reason-'+strand+'" rows="3" placeholder="Write words, equations, or describe your strategy..."></textarea><details class="worked-solution"><summary>Study a worked solution</summary><p>'+escape(item.solution)+'</p><p>Close this solution, choose New, and test the method independently.</p></details></div>';
      var modelEl=station.querySelector('.model');
      if(window.MathWorksheetViz&&modelEl&&modelEl.querySelector('.dot-expression,.array,.sequence,.place-model,.fraction-visual,.shape,.bars,.numberline,.balance,.machine')){window.MathWorksheetViz.render(modelEl,{prompt:prompt});}
      station.querySelector('.new-btn').textContent='Next';station.querySelector('.new-btn').disabled=Boolean(session&&!session.answered);
      setupThinkingBoard(station,prompt);
      station.querySelector('.worked-solution').addEventListener('toggle',function(){if(this.open){assisted.add(strand);updateScore();}});
    }
    function updateRoute(){var g=Number(level),p=FoundationTasks.profiles[g];document.getElementById('route-title').textContent=(g===0?'Kindergarten':'Grade '+g)+' · '+p[1];document.getElementById('route-focus').textContent=p[2];document.getElementById('route-prerequisite').textContent=g===0?'Start with objects: pair each spoken number with one object. An adult can read prompts and record oral explanations.':'Prerequisite check: explain one task from '+(g===1?'Kindergarten':'Grade '+(g-1))+', then return here. Choose a model when a method stops making sense.';}
    function revealActiveActivity(){
      var stop=document.querySelector('.journey-stop[aria-current]');
      if(!stop)return;
      var track=stop.parentElement, menu=track.parentElement;
      var bounds=stop.getBoundingClientRect(), frame=track.getBoundingClientRect();
      if(bounds.left<frame.left)track.scrollBy({left:bounds.left-frame.left,behavior:'instant'});
      if(bounds.right>frame.right)track.scrollBy({left:bounds.right-frame.right,behavior:'instant'});
      var menuBounds=menu.getBoundingClientRect();
      if(bounds.top<menuBounds.top)menu.scrollBy({top:bounds.top-menuBounds.top,behavior:'instant'});
      if(bounds.bottom>menuBounds.bottom)menu.scrollBy({top:bounds.bottom-menuBounds.bottom,behavior:'instant'});
    }
    function syncHashFocus(fromInit){
      var cfg=hashConfig[location.hash],focusBar=document.getElementById('pathway-focus-bar'),grid=document.querySelector('.station-grid'),gradeSelect=document.getElementById('grade-level');
      document.querySelectorAll('.journey-stop').forEach(function(stop){stop.classList.toggle('is-active-stop',Boolean(cfg&&stop.getAttribute('href')===location.hash));});
      if(!cfg){cfg=hashConfig['#counting'];}
      activeStrand=cfg.strand;
      document.querySelectorAll('.station').forEach(function(st){st.hidden=st.dataset.strand!==activeStrand;});
      grid.scrollTop=0;
      document.querySelectorAll('.journey-stop').forEach(function(stop){
        if(stop.dataset.mapStrand!==activeStrand){stop.removeAttribute('aria-current');return;}
        stop.setAttribute('aria-current','true');
      });
      revealActiveActivity();
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
    if(window.ResizeObserver){
      new ResizeObserver(revealActiveActivity).observe(document.querySelector('.math-workspace .journey-map'));
    }
    window.addEventListener('hashchange',function(){
      endSet();
      syncHashFocus(false);
      if(hashConfig[location.hash])document.querySelector('.ll-sim').scrollTo({top:0,behavior:'instant'});
    });
    document.addEventListener('click',function(e){
      var focusBtn=e.target.closest('[data-focus-action]');
      if(focusBtn){
        var act=focusBtn.dataset.focusAction;
        if(act==='toggle-single'){singleStationFocus=!singleStationFocus;syncHashFocus(true);}
        else if(act==='clear'){singleStationFocus=false;history.replaceState(null,'',location.pathname+location.search);syncHashFocus(true);}
        return;
      }
      var station=e.target.closest('.station');if(!station)return;var strand=station.dataset.strand;
      if(e.target.closest('.new-btn')){if(session&&!session.answered)return;if(session&&session.index===session.items.length){finishSet();return;}if(session){reviewItem=session.items[session.index];session.answered=false;}attempted.delete(strand);solved.delete(strand);assisted.delete(strand);render(station);focusAnswer(station);updateScore();return}
      if(e.target.closest('.model-toggle')){var model=station.querySelector('.model');model.hidden=!model.hidden;e.target.textContent=model.hidden?'Inspect model':'Hide model';e.target.setAttribute('aria-expanded',String(!model.hidden));return}
      if(e.target.closest('.hint-btn')){var hint=station.querySelector('.hint');hint.hidden=!hint.hidden;e.target.textContent=hint.hidden?'Need a hint?':'Hide hint';e.target.setAttribute('aria-expanded',String(!hint.hidden));return}
      if(e.target.closest('.check-btn')){var input=station.querySelector('.response input'),feedback=station.querySelector('.feedback'),actual=input.value.trim(),expected=current[strand].answer;if(!actual){feedback.textContent='Enter an answer first.';return;}if(session&&session.answered)return;var correct=FoundationTasks.check(actual,expected);recordAttempt(strand,correct);if(correct){feedback.textContent='Correct. Explain your method, then choose Next question.';feedback.className='feedback good';solved.add(strand)}else{feedback.textContent=actual?'Not yet. '+current[strand].hint+' Check your units and calculation, then try again.':'Enter an answer first. Use a number, fraction, or the requested word.';feedback.className='feedback try';solved.delete(strand)}updateScore()}
    });
    document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.matches('.response input'))e.target.closest('.response').querySelector('.check-btn').click()});
  }());
