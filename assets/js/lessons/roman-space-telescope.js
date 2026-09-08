(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const ns = 'http://www.w3.org/2000/svg';
  const make = (tag, attrs) => { const el = document.createElementNS(ns, tag); Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k,v)); return el; };
  let count = 0;
  const tiles = [];
  for (let i=0; i<300; i++) {
    const x=(i%30)*25, y=Math.floor(i/30)*32.4;
    const tile=make('rect',{x,y,width:25,height:32.4});
    $('sky-tiles').append(tile); tiles.push(tile);
  }
  // Three equally shaped fields, each ten by ten tiles, across a thirty by ten target.
  const order=Array.from({length:300},(_,i)=>Math.floor(i/100)*10+(i%10)+Math.floor((i%100)/10)*30);
  function survey(){
    const field=Number($('camera').value), covered=Math.min(count*field,300);
    const ranks=new Map(order.map((tile,rank)=>[tile,rank]));
    tiles.forEach((tile,i)=>{const rank=ranks.get(i);tile.setAttribute('fill',rank<covered?'transparent':'#101e35');tile.setAttribute('fill-opacity','1');tile.setAttribute('stroke',rank>=covered&&rank<covered+field?'#ffd479':'#384d68');tile.setAttribute('stroke-width',rank>=covered&&rank<covered+field?'2':'0.5');});
    $('survey-status').textContent=`${covered} of 300 tiles captured (${Math.round(covered/3)}%). ${count} exposure${count===1?'':'s'} taken. ${Math.ceil((300-covered)/field)} remaining.`;
    $('expose').disabled=$('complete').disabled=covered===300;
  }
  $('camera').addEventListener('change',()=>{count=0;survey();});
  $('expose').addEventListener('click',()=>{count++;survey();});
  $('complete').addEventListener('click',()=>{count=300/Number($('camera').value);survey();});
  $('reset').addEventListener('click',()=>{count=0;survey();});
  function curve(){
    const planet=$('planet').checked, sparse=$('cadence').value==='sparse';
    const y=t=>225-130*Math.exp(-(((t-.5)/.17)**2))-(planet?55*Math.exp(-(((t-.635)/.018)**2)):0);
    $('curve-line').setAttribute('d',Array.from({length:301},(_,i)=>`${i?'L':'M'}${60+i/300*650},${y(i/300)}`).join(' '));
    $('samples').replaceChildren();
    const n=sparse?7:80;
    for(let i=0;i<=n;i++)$('samples').append(make('circle',{cx:60+i/n*650,cy:y(i/n),r:4,fill:'#ffd479',stroke:'#101e35','stroke-width':1}));
    $('curve-status').textContent=planet?(sparse?'Planet present in the model, but sparse samples miss the short bump. Would these measurements alone support a discovery?':'Frequent samples trace a short extra bump. This is a candidate clue to investigate, not proof by itself.'):'A foreground star alone produces the broad brightening in this model. Add a planet and compare the measured dots.';
  }
  $('planet').addEventListener('change',curve);$('cadence').addEventListener('change',curve);
  $('quiz').addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;$('quiz-result').textContent=button.dataset.correct==='true'?'Correct. Frequent observations can resolve a short signal that falls between widely spaced visits.':'Try again. Think about how the time between measurements affects the number of dots on a short bump.';});
  survey();curve();
})();
