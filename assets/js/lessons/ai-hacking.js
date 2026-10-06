'use strict';
const items = [
  ['A human group selects targets and uses an AI agent to carry out attack tasks.',0,'Human-directed misuse. Automated execution does not mean the AI chose the targets or invented the criminal goal.'],
  ['An agent in a cybersecurity evaluation reaches a real company because internet access was mistakenly left open.',1,'A boundary failure with real-world consequences. Investigate both containment and model behavior; calling it a test does not make the harm fictional.'],
  ['A model leaks fictional documents in a deliberately constrained company-role experiment.',2,'A controlled research finding. It reveals a risk under those conditions, not a documented leak from a real company.'],
  ['A headline says an AI is angry, but provides no evidence of feelings or independent motives.',3,'Unsupported interpretation. Harmful behavior alone does not establish consciousness, emotion, or independent goals.']
];
const labels=['Human-directed misuse','Real-world test boundary failure','Fictional research scenario','Unsupported interpretation'];
const answers = new Map();
const questions = document.querySelector('#questions');
items.forEach(([prompt, correct, explain], index)=>{
  const card=document.createElement('article');card.className='question';
  const title=document.createElement('h3');title.textContent=`${index+1}. ${prompt}`;card.append(title);
  const choices=document.createElement('div');choices.className='choices';choices.setAttribute('role','group');choices.setAttribute('aria-label',`Classify report ${index+1}`);
  const feedback=document.createElement('p');feedback.className='feedback';feedback.setAttribute('role','status');
  labels.forEach((label,value)=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>{choices.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed','false'));button.setAttribute('aria-pressed','true');answers.set(index,value===correct);feedback.textContent=(value===correct?'Correct. ':'Reconsider. ')+explain;document.querySelector('#quiz-score').textContent=`${[...answers.values()].filter(Boolean).length} of 4 correct; ${answers.size} classified.`;});choices.append(button);});card.append(choices,feedback);questions.append(card);
});
document.querySelector('#reset-quiz').addEventListener('click',()=>{answers.clear();questions.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed','false'));questions.querySelectorAll('.feedback').forEach(p=>p.textContent='');document.querySelector('#quiz-score').textContent='Classifications reset.';});
const form=document.querySelector('#defenses');
const steps=[...document.querySelectorAll('#path li')];
form.addEventListener('submit',event=>{
  event.preventDefault();const prediction=document.querySelector('#prediction');
  if(!prediction.value){document.querySelector('#result').textContent='Choose your prediction first.';prediction.focus();return;}
  const checked=id=>document.getElementById(id).checked;
  const stop=checked('instruction')?1:checked('permission')?2:(checked('network')||checked('approval'))?3:4;
  steps.forEach((li,i)=>{li.className=i<stop?'done':i===stop?'stopped':'';});
  const reasons=['','The untrusted page instruction is rejected.','The tool cannot read the private file.',checked('network')?'The unapproved destination is blocked.':'The informed reviewer refuses the send.','No preventive control stops the fictional send.'];
  const blocked=stop<4;
  document.querySelector('#result').textContent=`${blocked?'Stopped':'Fictional data sent'}. ${reasons[stop]} ${checked('logging')?'Audit logging records the attempt.':'Without an audit log, investigating the attempt is harder.'} Your prediction ${prediction.value===(blocked?'blocked':'sent')?'matched':'did not match'} the model. ${blocked?'Disable this blocking layer and retest to see whether another layer catches it.':''}`;
});
document.querySelector('#reset-lab').addEventListener('click',()=>{form.reset();steps.forEach(li=>li.className='');document.querySelector('#result').textContent='Choose a prediction and run the test.';});
