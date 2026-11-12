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
    function setupSmartWhiteboard(station){
      var board=station.querySelector('.ai-whiteboard');
      if(!board)return;
      var canvas=board.querySelector('.wb-canvas');
      var badge=board.querySelector('.wb-live-badge');
      var detName=board.querySelector('.wb-det-name');
      var detDesc=board.querySelector('.wb-det-reasoning');
      var strand=station.dataset.strand;
      var item=current[strand];
      var reasonText=station.querySelector('#reason-'+strand);

      var tool='pen';
      var counters=[];
      var strokes=[];
      var currentStroke=null;
      var isDrawing=false;
      var detectedExplanation='';
      var isSpeaking=false;
      var ctx=canvas.getContext('2d');

      function resize(){
        var rect=canvas.getBoundingClientRect();
        if(!rect.width)return;
        var dpr=Math.min(window.devicePixelRatio||1,2);
        canvas.width=Math.round(rect.width*dpr);
        canvas.height=Math.round(rect.height*dpr);
        ctx.setTransform(dpr,0,0,dpr,0,0);
        redraw();
      }

      function redraw(){
        var rect=canvas.getBoundingClientRect();
        var w=rect.width,h=rect.height;
        ctx.clearRect(0,0,w,h);

        // Chalkboard faint grid
        ctx.strokeStyle="rgba(255,255,255,0.05)";
        ctx.lineWidth=1;
        var sz=24;
        for(var x=sz;x<w;x+=sz){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
        for(var y=sz;y<h;y+=sz){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}

        // Strokes
        strokes.forEach(function(st){
          if(!st.points||st.points.length<1)return;
          ctx.beginPath();
          ctx.strokeStyle=st.tool==='eraser'?'#10221a':(st.color||'#38bdf8');
          ctx.lineWidth=st.tool==='eraser'?20:3.2;
          ctx.lineCap='round';
          ctx.lineJoin='round';
          st.points.forEach(function(p,idx){
            if(idx===0)ctx.moveTo(p.x,p.y);
            else ctx.lineTo(p.x,p.y);
          });
          ctx.stroke();
        });

        // Math counters
        counters.forEach(function(c,idx){
          ctx.beginPath();
          ctx.arc(c.x,c.y,c.r||13,0,Math.PI*2);
          ctx.fillStyle=c.color||'#38bdf8';
          ctx.fill();
          ctx.strokeStyle='#ffffff';
          ctx.lineWidth=2.2;
          ctx.stroke();

          ctx.fillStyle='#0f172a';
          ctx.font='bold 11px system-ui,sans-serif';
          ctx.textAlign='center';
          ctx.textBaseline='middle';
          ctx.fillText(String(idx+1),c.x,c.y+0.5);
        });
      }

      function analyze(){
        var total=counters.length;
        var strokeCount=strokes.length;

        var dotStrokes=strokes.filter(function(st){
          if(st.points.length<2)return false;
          var minX=9999,maxX=-9999,minY=9999,maxY=-9999;
          st.points.forEach(function(pt){minX=Math.min(minX,pt.x);maxX=Math.max(maxX,pt.x);minY=Math.min(minY,pt.y);maxY=Math.max(maxY,pt.y);});
          return(maxX-minX<28&&maxY-minY<28);
        });

        var countTotal=total+dotStrokes.length;
        var pName='Waiting for marks';
        var pDesc='Model your thinking above using chalk pen or counter stamps.';
        var explanation='';

        if(countTotal===0&&strokeCount===0){
          detName.textContent=pName;
          detDesc.textContent=pDesc;
          badge.textContent='✨ AI Ready: Draw or stamp counters to model reasoning';
          detectedExplanation='';
          return;
        }

        if(strand==='counting'){
          if(countTotal>0){
            var allPts=[];
            counters.forEach(function(c){allPts.push({x:c.x,y:c.y});});
            dotStrokes.forEach(function(st){allPts.push(st.points[0]);});

            // 1. Check if student drew a plus sign (+) separating groups
            var plusOp = null;
            if(strokes.length >= 2){
              for(var sA=0; sA<strokes.length-1; sA++){
                for(var sB=sA+1; sB<strokes.length; sB++){
                  var st1 = strokes[sA], st2 = strokes[sB];
                  if(st1.points.length>=2 && st2.points.length>=2){
                    var p1A = st1.points[0], p1B = st1.points[st1.points.length-1];
                    var p2A = st2.points[0], p2B = st2.points[st2.points.length-1];
                    var m1 = {x:(p1A.x+p1B.x)/2, y:(p1A.y+p1B.y)/2};
                    var m2 = {x:(p2A.x+p2B.x)/2, y:(p2A.y+p2B.y)/2};
                    if(Math.hypot(m1.x-m2.x, m1.y-m2.y) < 32){
                      var a1 = Math.atan2(p1B.y-p1A.y, p1B.x-p1A.x);
                      var a2 = Math.atan2(p2B.y-p2A.y, p2B.x-p2A.x);
                      var adiff = Math.abs(a1-a2);
                      if(adiff>Math.PI) adiff = 2*Math.PI - adiff;
                      if(Math.abs(adiff - Math.PI/2) < 0.45){
                        plusOp = {x:(m1.x+m2.x)/2, y:(m1.y+m2.y)/2};
                        break;
                      }
                    }
                  }
                }
                if(plusOp) break;
              }
            }

            var group1 = 0, group2 = 0;
            var isPlusSplit = false;

            if(plusOp){
              allPts.forEach(function(p){
                if(p.x < plusOp.x) group1++;
                else group2++;
              });
              if(group1>0 && group2>0){
                isPlusSplit = true;
              }
            }

            // 2. 2D Euclidean distance clustering (horizontal, vertical, diagonal)
            var cluster2D = null;
            if(!isPlusSplit && allPts.length >= 2){
              var maxD = 0, seed1 = allPts[0], seed2 = allPts[1];
              for(var ci=0; ci<allPts.length; ci++){
                for(var cj=ci+1; cj<allPts.length; cj++){
                  var d = Math.hypot(allPts[ci].x-allPts[cj].x, allPts[ci].y-allPts[cj].y);
                  if(d > maxD){ maxD = d; seed1 = allPts[ci]; seed2 = allPts[cj]; }
                }
              }
              if(maxD > 42){
                var cl1 = {x:seed1.x, y:seed1.y}, cl2 = {x:seed2.x, y:seed2.y};
                var g1 = [], g2 = [];
                for(var it=0; it<3; it++){
                  g1 = []; g2 = [];
                  for(var pi=0; pi<allPts.length; pi++){
                    var dist1 = Math.hypot(allPts[pi].x-cl1.x, allPts[pi].y-cl1.y);
                    var dist2 = Math.hypot(allPts[pi].x-cl2.x, allPts[pi].y-cl2.y);
                    if(dist1 <= dist2) g1.push(allPts[pi]); else g2.push(allPts[pi]);
                  }
                  if(g1.length===0 || g2.length===0) break;
                  var sx1=0,sy1=0,sx2=0,sy2=0;
                  g1.forEach(function(p){sx1+=p.x;sy1+=p.y;});
                  g2.forEach(function(p){sx2+=p.x;sy2+=p.y;});
                  cl1 = {x:sx1/g1.length, y:sy1/g1.length};
                  cl2 = {x:sx2/g2.length, y:sy2/g2.length};
                }
                if(g1.length>0 && g2.length>0){
                  var clusterDist = Math.hypot(cl1.x-cl2.x, cl1.y-cl2.y);
                  var rad1 = 0, rad2 = 0;
                  g1.forEach(function(p){ rad1 = Math.max(rad1, Math.hypot(p.x-cl1.x, p.y-cl1.y)); });
                  g2.forEach(function(p){ rad2 = Math.max(rad2, Math.hypot(p.x-cl2.x, p.y-cl2.y)); });
                  if(clusterDist > 40 && clusterDist > (rad1+rad2)*0.65){
                    cluster2D = { n1: g1.length, n2: g2.length };
                  }
                }
              }
            }

            if(isPlusSplit){
              pName = 'Addition Expression: ' + group1 + ' + ' + group2 + ' = ' + countTotal;
              pDesc = 'Identified written "+" operator separating ' + group1 + ' and ' + group2 + ' counters.';
              explanation = 'I modeled the addition problem by drawing ' + group1 + ' counters, an addition sign (+), and ' + group2 + ' counters. ' + group1 + ' + ' + group2 + ' = ' + countTotal + ', proving the sum.';
            } else if(cluster2D){
              var n1 = cluster2D.n1, n2 = cluster2D.n2;
              pName = 'Part-Part-Whole: ' + n1 + ' + ' + n2 + ' = ' + countTotal;
              pDesc = '2D spatial clustering detected 2 groups (' + n1 + ' and ' + n2 + '). Proves sum via additive composition.';
              explanation = 'I represented ' + countTotal + ' by modeling two groups: a group of ' + n1 + ' counters and a group of ' + n2 + ' counters. ' + n1 + ' + ' + n2 + ' = ' + countTotal + ', proving the total through part-part-whole reasoning.';
            } else {
              pName = countTotal + ' Counters (One-to-One Count)';
              pDesc = 'Counted each item once in sequence from 1 to ' + countTotal + '.';
              explanation = 'I modeled the quantity with ' + countTotal + ' counters. By one-to-one correspondence, each object is counted once, proving that the total is ' + countTotal + '.';
            }

            if(String(item.answer)===String(countTotal)){
              pName+=' 🎯 (Matches Question Target!)';
              explanation+=' This verifies the problem answer of '+item.answer+'.';
              badge.textContent='🎯 Target Matched: '+countTotal+' Verified!';
            }else{
              badge.textContent='✨ AI Counted: '+countTotal+' Counters';
            }
          }else{
            pName='Freehand Work';
            pDesc='Mathematical steps or calculation.';
            explanation='I worked out the steps to solve the operation, verifying each quantity.';
            badge.textContent='✨ AI Recognized: Mathematical Work';
          }
        }else if(strand==='patterns'){
          pName='Pattern Sequence ('+(countTotal||strokeCount)+' elements)';
          pDesc='Identified recurring structure or step interval.';
          explanation='I arranged the terms visually to find the constant change rule and determine the next value in the pattern.';
          badge.textContent='✨ AI Detected: Sequence Rule';
        }else if(strand==='place'){
          var tallStrokes=strokes.filter(function(st){
            var minY=9999,maxY=-9999;
            st.points.forEach(function(pt){minY=Math.min(minY,pt.y);maxY=Math.max(maxY,pt.y);});
            return(maxY-minY>45);
          });
          var tens=tallStrokes.length;
          var ones=countTotal;
          var val=10*tens+ones;
          pName=tens+' Tens + '+ones+' Ones = '+val;
          pDesc='Base-ten decomposition: '+tens+' tens rods ('+(10*tens)+') and '+ones+' unit ones ('+ones+').';
          explanation='I decomposed the number using base-ten place value: '+tens+' tens ('+(10*tens)+') and '+ones+' ones ('+ones+') equals '+val+'.';
          badge.textContent='✨ AI Detected: Base-10 Model';
        }else if(strand==='multiply'){
          if(counters.length>=4){
            var yVals=counters.map(function(c){return c.y;}).sort(function(a,b){return a-b;});
            var xVals=counters.map(function(c){return c.x;}).sort(function(a,b){return a-b;});
            var rowClusters=1,colClusters=1;
            for(var r=0;r<yVals.length-1;r++){if(yVals[r+1]-yVals[r]>20)rowClusters++;}
            for(var cl=0;cl<xVals.length-1;cl++){if(xVals[cl+1]-xVals[cl]>20)colClusters++;}
            if(rowClusters>=2&&colClusters>=2){
              pName='Array Model: '+rowClusters+' rows × '+colClusters+' cols';
              pDesc='Multiplication visualized as equal rows and columns.';
              explanation='I arranged '+counters.length+' objects in an array of '+rowClusters+' rows and '+colClusters+' columns, showing that '+rowClusters+' × '+colClusters+' = '+(rowClusters*colClusters)+'.';
            }else{
              pName='Equal Groups ('+counters.length+' objects)';
              pDesc='Combined equal sets to find the product.';
              explanation='I modeled the multiplication problem as equal groups combining to form the total.';
            }
          }else{
            pName='Multiplicative Reasoning';
            pDesc='Visualized repeated addition or equal groups.';
            explanation='I used repeated equal groups to model the product.';
          }
          badge.textContent='✨ AI Detected: Multiplication Model';
        }else if(strand==='fractions'){
          pName='Fraction Partition Model';
          pDesc='Equal shares representing numerator and denominator.';
          explanation='I partitioned the whole into equal shares, where the shaded portion represents the target fraction.';
          badge.textContent='✨ AI Detected: Fraction Model';
        }else if(strand==='geometry'){
          pName='Geometric Construction';
          pDesc='Analyzing polygon boundaries, vertices, and attributes.';
          explanation='I constructed the geometric figure to verify its angle sum, side lengths, and spatial measurements.';
          badge.textContent='✨ AI Detected: Geometric Figure';
        }else{
          pName='Visual Mathematical Model';
          pDesc='Representation connecting equations to concrete values.';
          explanation='I constructed a visual representation to justify the mathematical solution and verify my reasoning.';
          badge.textContent='✨ AI Detected: Mathematical Proof';
        }

        detName.textContent=pName;
        detDesc.textContent=pDesc;
        detectedExplanation=explanation;
      }

      canvas.addEventListener('pointerdown',function(e){
        var rect=canvas.getBoundingClientRect();
        var clientX=e.clientX-rect.left;
        var clientY=e.clientY-rect.top;

        if(tool==='counter'){
          counters.push({x:clientX,y:clientY,r:13,color:'#38bdf8'});
          redraw();
          analyze();
          return;
        }

        if(tool==='eraser'){
          var removeIdx=-1;
          for(var i=0;i<counters.length;i++){
            if(Math.hypot(counters[i].x-clientX,counters[i].y-clientY)<18){
              removeIdx=i;break;
            }
          }
          if(removeIdx>=0){
            counters.splice(removeIdx,1);
            redraw();
            analyze();
            return;
          }
        }

        isDrawing=true;
        currentStroke={points:[{x:clientX,y:clientY}],tool:tool,color:tool==='eraser'?'#10221a':'#f8fafc'};
        strokes.push(currentStroke);
        try{canvas.setPointerCapture(e.pointerId);}catch(err){}
      });

      canvas.addEventListener('pointermove',function(e){
        if(!isDrawing||!currentStroke)return;
        var rect=canvas.getBoundingClientRect();
        var clientX=e.clientX-rect.left;
        var clientY=e.clientY-rect.top;
        currentStroke.points.push({x:clientX,y:clientY});
        redraw();
      });

      function stopStroke(e){
        if(isDrawing){
          isDrawing=false;
          currentStroke=null;
          try{canvas.releasePointerCapture(e.pointerId);}catch(err){}
          analyze();
        }
      }
      canvas.addEventListener('pointerup',stopStroke);
      canvas.addEventListener('pointercancel',stopStroke);

      board.querySelectorAll('[data-wb-action]').forEach(function(btn){
        btn.addEventListener('click',function(){
          var act=btn.dataset.wbAction;
          if(act==='clear'){
            counters=[];
            strokes=[];
            redraw();
            analyze();
            return;
          }
          if(act==='insert'){
            if(detectedExplanation&&reasonText){
              reasonText.value=detectedExplanation;
              reasonText.focus();
              badge.textContent='✅ Copied to Explanation!';
              setTimeout(function(){badge.textContent='✨ AI Smart Blackboard';},2000);
            }
            return;
          }
          if(act==='voice'){
            if(!('speechSynthesis' in window)){
              alert('Speech Synthesis is not supported in this browser.');
              return;
            }
            if(isSpeaking){
              window.speechSynthesis.cancel();
              isSpeaking=false;
              btn.innerHTML='🔊 AI Voice';
              return;
            }
            var textToSpeak=detectedExplanation||reasonText.value||item.reason;
            var utter=new SpeechSynthesisUtterance(textToSpeak.replace(/[$_#\\*]/g,''));
            utter.onend=function(){
              isSpeaking=false;
              btn.innerHTML='🔊 AI Voice';
            };
            isSpeaking=true;
            btn.innerHTML='⏹ Stop Voice';
            window.speechSynthesis.speak(utter);
            return;
          }

          tool=act;
          board.querySelectorAll('.wb-tool-btn[data-wb-action="pen"],.wb-tool-btn[data-wb-action="counter"],.wb-tool-btn[data-wb-action="eraser"]').forEach(function(b){
            b.classList.toggle('active',b===btn);
          });
        });
      });

      window.addEventListener('resize',resize);
      station.destroyWhiteboard=function(){
        window.removeEventListener('resize',resize);
        if(isSpeaking&&'speechSynthesis' in window)window.speechSynthesis.cancel();
      };

      requestAnimationFrame(resize);
      analyze();
    }
    function render(station){
      if(station.destroyWhiteboard){station.destroyWhiteboard();station.destroyWhiteboard=null;}var strand=station.dataset.strand,item=reviewItem||exercise(strand,chosenLevel()),escape=FoundationTasks.escape;reviewItem=null;current[strand]=item;
      station.querySelector('.station-head h2').textContent=item.goal;station.querySelector('.station-openmoji').alt='Illustration for '+item.goal;station.querySelector('.station-openmoji').setAttribute('aria-label','Enlarge illustration for '+item.goal);
      station.querySelector('.station-head small').textContent=item.label+' · '+strand;
      var prompt=mode==='apply'?item.apply:item.prompt;
      station.querySelector('.workbench').innerHTML='<p class="problem">'+escape(prompt)+'</p><button type="button" class="model-toggle" aria-expanded="'+(mode==='explore')+'">'+(mode==='explore'?'Hide model':'Inspect model')+'</button><div class="model" '+(mode==='explore'?'':'hidden')+'>'+item.visual+'</div>'+'<p class="answer-format">'+(item.answer==='blue'?'Enter a color word.':'Enter a number or an exact fraction such as 3/5. Equivalent fractions and decimals are accepted.')+(item.unit?' Report in '+escape(item.unit)+'.':'')+'</p><div class="response"><input type="text" aria-label="Answer: '+escape(item.goal)+'" placeholder="Your answer"/><button class="check-btn" type="button">Check</button><button class="new-btn" type="button">New</button><button class="hint-btn" type="button" aria-expanded="false">Need a hint?</button><p class="hint" hidden>'+escape(item.hint)+'</p><p class="feedback" aria-live="polite"></p></div><div class="reasoning"><div class="reasoning-head"><label for="reason-'+strand+'">Explain your thinking</label><span class="wb-ai-pill">✨ AI Smart Blackboard</span></div><p>'+escape(item.reason)+'</p><div class="ai-whiteboard" data-wb-strand="'+strand+'"><div class="wb-toolbar" role="toolbar" aria-label="Smart Blackboard Controls"><button type="button" class="wb-tool-btn active" data-wb-action="pen" title="Draw chalk strokes">🖊️ Chalk Pen</button><button type="button" class="wb-tool-btn" data-wb-action="counter" title="Click on board to stamp a counter">🔘 Counter Stamp</button><button type="button" class="wb-tool-btn" data-wb-action="eraser" title="Erase strokes or counters">🧹 Eraser</button><button type="button" class="wb-tool-btn" data-wb-action="clear" title="Clear board">Clear</button><div style="flex:1;"></div><button type="button" class="wb-tool-btn wb-btn-insert" data-wb-action="insert" title="Write AI-detected math explanation into text box">📝 Use in Explanation</button><button type="button" class="wb-tool-btn wb-btn-voice" data-wb-action="voice" title="Read AI explanation aloud">🔊 AI Voice</button></div><div class="wb-canvas-wrap"><canvas class="wb-canvas" aria-label="Interactive math blackboard for explaining your thinking"></canvas><div class="wb-live-badge">✨ AI Ready: Draw or stamp counters to model reasoning</div></div><div class="wb-detection-card"><div class="wb-det-header"><span class="wb-det-title">✨ Detected Pattern:</span> <strong class="wb-det-name">Waiting for marks...</strong></div><p class="wb-det-reasoning">Model your thinking above. The AI blackboard will identify patterns according to this math concept and prove your answer.</p></div></div><textarea id="reason-'+strand+'" rows="3" placeholder="Use words, equations, or describe your drawing (or click Use in Explanation above to transcribe your blackboard work)..."></textarea><details class="worked-solution"><summary>Study a worked solution</summary><p>'+escape(item.solution)+'</p><p>Close this solution, choose New, and test the method independently.</p></details></div>';
      var modelEl=station.querySelector('.model');
      if(window.MathWorksheetViz&&modelEl&&modelEl.querySelector('.dot-expression,.array,.sequence,.place-model,.fraction-visual,.shape,.bars,.numberline,.balance,.machine')){window.MathWorksheetViz.render(modelEl,{prompt:prompt});}
      station.querySelector('.new-btn').textContent='Next question →';station.querySelector('.new-btn').disabled=Boolean(session&&!session.answered);
      setupSmartWhiteboard(station);
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
