(()=>{
  const key='classroomos-godot-pathway';
  const getProgress=()=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return[]}};
  const saveProgress=value=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
  const refresh=()=>{
    const done=getProgress();
    document.querySelectorAll('[data-lesson-card]').forEach(card=>card.classList.toggle('is-complete',done.includes(card.dataset.lessonCard)));
    document.querySelectorAll('[data-complete-lesson]').forEach(button=>{const complete=done.includes(button.dataset.completeLesson);button.classList.toggle('is-done',complete);button.textContent=complete?'Completed ✓':'Mark lesson complete'});
    const bar=document.querySelector('[data-course-progress]');if(bar){bar.style.width=`${done.length/8*100}%`;bar.parentElement?.setAttribute('aria-valuenow',String(done.length))}
    const label=document.querySelector('[data-progress-label]');if(label)label.textContent=`${done.length} of 8 lessons complete`;
  };
  document.querySelectorAll('[data-complete-lesson]').forEach(button=>button.addEventListener('click',()=>{
    const done=getProgress();const id=button.dataset.completeLesson;
    if(!done.includes(id)){
      const section=button.closest('.gd-section');const checks=[...(section?.querySelectorAll('.gd-checklist input')||[])];
      if(checks.length&&checks.some(input=>!input.checked)){
        const status=section.querySelector('[data-check-status]');
        if(status){status.textContent='Verify every definition-of-done item before completing the lesson.';status.style.color='#a3483f'}
        checks.find(input=>!input.checked)?.focus();return;
      }
    }
    const next=done.includes(id)?done.filter(item=>item!==id):[...done,id];saveProgress(next);refresh()
  }));
  document.querySelectorAll('.gd-copy').forEach(button=>button.addEventListener('click',async()=>{const block=button.closest('.gd-code')?.querySelector('code');if(!block)return;try{await navigator.clipboard.writeText(block.textContent);button.textContent='Copied'}catch{button.textContent='Select code'}setTimeout(()=>button.textContent='Copy',1600)}));
  document.querySelectorAll('.gd-checklist input').forEach(input=>input.addEventListener('change',()=>{const wrap=input.closest('.gd-checklist');const count=wrap.querySelectorAll('input:checked').length;const status=wrap.parentElement.querySelector('[data-check-status]');if(status)status.textContent=`${count}/${wrap.querySelectorAll('input').length} checked`}));
  document.querySelectorAll('[data-question]').forEach(question=>{
    const result=question.querySelector('.gd-practice-result');
    question.querySelectorAll('button[data-answer]').forEach(button=>button.addEventListener('click',()=>{
      question.querySelectorAll('button[data-answer]').forEach(item=>item.classList.remove('is-correct','is-wrong'));
      const correct=button.dataset.answer==='correct';button.classList.add(correct?'is-correct':'is-wrong');
      if(result){result.textContent=correct?question.dataset.correct:question.dataset.retry;result.style.color=correct?'#267044':'#9e3d38'}
    }));
  });

  const labEvents={
    berry:{
      event:'item_collected("berry")',
      receivers:[
        ['INVENTORY','quantity + 1','Owns the item count and emits changed.'],
        ['QUEST LOG','objective 2 / 3','Listens for the stable item ID.'],
        ['HUD','slot + quest text','Redraws; it does not own the values.']
      ],
      explain:'One pickup can matter to several systems without the berry needing to know how quests or menus work.'
    },
    npc:{
      event:'interaction_started("mechanic")',
      receivers:[
        ['DIALOGUE','choose line','Reads quest state to select a response.'],
        ['QUEST LOG','locked → active','Owns and changes the quest state.'],
        ['PLAYER','input disabled','Pauses movement while dialogue is open.']
      ],
      explain:'Dialogue presents the conversation, but QuestLog owns progress. Closing dialogue must return input to the player.'
    },
    camp:{
      event:'rest_requested("camp_01")',
      receivers:[
        ['SURVIVAL','needs restored','Clamps hunger and health to their maximums.'],
        ['GAME STATE','checkpoint set','Stores a safe respawn location.'],
        ['SAVE MANAGER','durable facts → disk','Writes only the state needed next session.']
      ],
      explain:'A camp is one player action with three deliberate consequences. Saving occurs after the data owners update.'
    },
    gate:{
      event:'area_entered("launch_gate")',
      receivers:[
        ['QUEST LOG','checks requirement','Confirms the radio quest is ready.'],
        ['CUTSCENE','timeline plays','Temporarily coordinates camera and control.'],
        ['GAME STATE','level complete','Unlocks the next scene after the sequence.']
      ],
      explain:'The gate detects entry; the quest validates access; the cutscene directs attention; GameState records the durable result.'
    }
  };
  const lab=document.querySelector('[data-event-lab]');
  if(lab){
    const renderLab=id=>{
      const data=labEvents[id];if(!data)return;
      lab.querySelector('[data-lab-event]').textContent=data.event;
      lab.querySelector('[data-lab-receivers]').innerHTML=data.receivers.map(([type,title,note])=>`<div class="gd-receiver"><small>${type}</small><b>${title}</b><span>${note}</span></div>`).join('');
      lab.querySelector('[data-lab-explain]').textContent=data.explain;
      lab.querySelectorAll('[data-event]').forEach(button=>button.classList.toggle('is-active',button.dataset.event===id));
    };
    lab.querySelectorAll('[data-event]').forEach(button=>button.addEventListener('click',()=>renderLab(button.dataset.event)));
    renderLab('berry');
  }

  const survival=document.querySelector('[data-survival-demo]');
  if(survival){
    let hunger=72;
    const meter=survival.querySelector('[data-hunger]');
    const label=survival.querySelector('[data-hunger-label]');
    const note=survival.querySelector('[data-survival-note]');
    const render=()=>{meter.value=hunger;label.textContent=String(hunger);meter.setAttribute('aria-label',`Hunger ${hunger} out of 100`)};
    survival.querySelectorAll('[data-survive]').forEach(button=>button.addEventListener('click',()=>{
      if(button.dataset.survive==='wait'){hunger=Math.max(0,hunger-8);note.textContent='0.8 per second × 10 seconds = 8 hunger drained.'}
      if(button.dataset.survive==='eat'){const before=hunger;hunger=Math.min(100,hunger+25);note.textContent=`The berry restored ${hunger-before}. clampf() prevented the meter from passing 100.`}
      if(button.dataset.survive==='reset'){hunger=72;note.textContent='Reset to the test value. Predict the result before pressing a button.'}
      render();
    }));
    render();
  }

  const projectPlans={
    adventure:{title:'Story adventure',reason:'The player needs a reason to explore and a controlled way to reveal story beats.',systems:['Dialogue + one quest state','One short, skippable cutscene','Save completed story beats'],cut:'Skip crafting and survival until the entire story can be finished.'},
    survival:{title:'Survival explorer',reason:'The core decisions come from spending resources and choosing when to recover.',systems:['One readable survival meter','Small stack-based inventory','Checkpoint save + one recipe'],cut:'Start with one need, not hunger, thirst, temperature, stamina, and sleep.'},
    rpg:{title:'Quest RPG',reason:'Progress depends on world events changing character goals and rewards.',systems:['Inventory with stable item IDs','Quest state machine + dialogue','Save inventory and quest states'],cut:'Build one complete quest with one reward before adding skill trees, shops, or factions.'},
    puzzle:{title:'Puzzle mystery',reason:'The player needs clues, persistent discoveries, and deliberate reveals—not a large economy.',systems:['Clue inventory without quantities','Quest-like investigation states','Short reveal cutscene + save'],cut:'Skip survival and crafting unless they directly create a puzzle decision.'}
  };
  const planner=document.querySelector('[data-project-planner]');
  if(planner){
    const renderPlan=id=>{
      const plan=projectPlans[id];if(!plan)return;
      planner.querySelector('[data-plan-title]').textContent=plan.title;
      planner.querySelector('[data-plan-reason]').textContent=plan.reason;
      planner.querySelector('[data-plan-list]').innerHTML=plan.systems.map(system=>`<li>${system}</li>`).join('');
      planner.querySelector('[data-plan-cut]').textContent=plan.cut;
      planner.querySelectorAll('[data-genre]').forEach(button=>button.classList.toggle('is-active',button.dataset.genre===id));
    };
    planner.querySelectorAll('[data-genre]').forEach(button=>button.addEventListener('click',()=>renderPlan(button.dataset.genre)));
    renderPlan('adventure');
  }
  refresh();
})();
