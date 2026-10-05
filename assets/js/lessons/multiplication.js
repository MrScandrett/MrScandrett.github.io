(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  function validFactors() {
    return ['rows','columns'].every(id => $(id).value !== '' && Number.isInteger(Number($(id).value)) && Number($(id).value) >= 0 && Number($(id).value) <= 12);
  }
  function array() {
    if (!validFactors()) { $('array-status').textContent = 'Use whole-number factors from 0 to 12.'; $('array-model').replaceChildren(); $('array-equation').textContent = ''; $('split-equation').textContent = ''; return; }
    const r = Number($('rows').value), c = Number($('columns').value);
    $('split').max = c;
    const s = Number($('split').value);
    if ($('split').value === '' || !Number.isInteger(s) || s < 0 || s > c) { $('array-status').textContent = `Choose a whole-number split from 0 to ${c}.`; $('array-model').replaceChildren(); $('array-equation').textContent = ''; $('split-equation').textContent = ''; return; }
    $('array-status').textContent = `${r} rows with ${c} squares each: ${r*c} squares. Plain part: ${r*s}; striped part: ${r*(c-s)}.`;
    $('array-model').style.gridTemplateColumns = `repeat(${Math.max(1,c)},minmax(0,1fr))`;
    $('array-model').innerHTML = Array.from({length:r*c}, (_,i) => `<span class="array-cell${i%c>=s?' second':''}"></span>`).join('');
    $('array-equation').textContent = `${r} × ${c} = ${r*c}`;
    $('split-equation').textContent = `${r} × (${s} + ${c-s}) = ${r} × ${s} + ${r} × ${c-s} = ${r*s} + ${r*(c-s)} = ${r*c}${r*c===0?' · Zero rows or zero columns means no squares.':''}`;
  }
  $('build-array').addEventListener('click', array);
  $('swap').addEventListener('click', () => { if (!validFactors()) { array(); return; } const r = $('rows').value; $('rows').value = $('columns').value; $('columns').value = r; $('split').value = Math.min(Number($('split').value)||0,Number(r)); array(); }); array();
  const strategies = {
    split:['23 = 20 + 3','20 × 7 = 140; 3 × 7 = 21','140 + 21 = 161','Check: 161 ÷ 7 = 23. Each part of 23 multiplies by 7.'],
    near:['19 = 20 − 1','20 × 6 = 120; 1 × 6 = 6','120 − 6 = 114','Check: 114 ÷ 6 = 19. Remove one group of six.'],
    balance:['16 × 25','Halve 16 and double 25: 8 × 50','Halve 8 and double 50: 4 × 100 = 400','Check: 400 ÷ 25 = 16. The factor 2 and its reciprocal cancel.'],
    double:['8 = 2 × 2 × 2','Double 7: 14; double again: 28','Double again: 56','Check: 56 ÷ 8 = 7. Three doublings multiply by eight.'],
    eleven:['11 = 10 + 1','47 × 10 = 470; 47 × 1 = 47','470 + 47 = 517','In the tens column, 7 + 4 = 11 tens. Write 1 ten and carry 1 hundred.']
  };
  function strategy() { $('strategy-view').innerHTML = '<ol>' + strategies[$('strategy').value].map(x=>`<li>${x}</li>`).join('') + '</ol>'; }
  $('strategy').addEventListener('change',strategy); strategy();
  const examples = {
    '23':{heading:'23 × 14',steps:['Multiply by 4 ones: 4 × 3 = 12. Write 2 ones and carry 1 ten.', '4 × 2 tens + 1 carried ten = 9 tens. The first row is 92.', 'Multiply by 1 ten: 23 × 10 = 230. Record 0 in the ones column.', 'Add the rows: 92 + 230 = 322. This equals the four area pieces.'],work:['    23\n  × 14\n  ────','    23\n  × 14\n  ────\n     2','    23\n  × 14\n  ────\n    92','    23\n  × 14\n  ────\n    92\n + 230','    23\n  × 14\n  ────\n    92\n + 230\n  ────\n   322'],check:'Check: 322 ÷ 14 = 23. Estimate: 20 × 15 = 300, close to 322.'},
    '306':{heading:'306 × 7',steps:['7 × 6 ones = 42 ones. Write 2 ones and carry 4 tens.', '7 × 0 tens + 4 carried tens = 4 tens. Write 4 in the tens place.', '7 × 3 hundreds = 21 hundreds. Write 21 to the left: 2142.', 'Partial-product check: 300 × 7 + 6 × 7 = 2100 + 42 = 2142.'],work:['   306\n  ×  7\n  ────','   306\n  ×  7\n  ────\n     2','   306\n  ×  7\n  ────\n    42','   306\n  ×  7\n  ────\n  2142','   306\n  ×  7\n  ────\n  2142'],check:'Check: 2142 ÷ 7 = 306. Estimate: 300 × 7 = 2100.'},
    decimal:{heading:'2.4 × 1.3',steps:['Temporarily scale each factor by 10: calculate 24 × 13.', 'Multiply 24 by 3 ones: 72.', 'Multiply 24 by 1 ten: 240. Add 72 + 240 = 312.', 'Both factors were ten times bigger, so the product was 100 times bigger. Divide 312 by 100: 3.12.'],work:['   24\n × 13\n ────','   24\n × 13\n ────','   24\n × 13\n ────\n   72','   24\n × 13\n ────\n   72\n+ 240\n ────\n  312','312 ÷ 100 = 3.12'],check:'Check: 3.12 ÷ 1.3 = 2.4. Since 1.3 is slightly above 1, expect a product slightly above 2.4.'}
  };
  let step=0;
  function written(reset) { if(reset)step=0;const e=examples[$('written-example').value];$('written-heading').textContent=e.heading;$('written-work').textContent=e.work[step];$('written-steps').innerHTML=e.steps.slice(0,step).map(s=>`<li>${s}</li>`).join('');$('written-check').textContent=step===4?e.check:'Predict the next step before revealing it.';$('next-step').disabled=step===4; }
  $('written-example').addEventListener('change',()=>written(true));$('next-step').addEventListener('click',()=>{step++;written(false);});$('reset-steps').addEventListener('click',()=>written(true));written(true);
  function scale() { const f=Number($('scale-factor').value);$('scaled-bar').style.width=`${f*50}%`;$('scale-status').textContent=`8 × ${f} = ${8*f} units${f===0?' · no length remains':f<1?' · smaller than the original':f===1?' · unchanged':' · larger than the original'}.`; }
  $('scale-factor').addEventListener('change',scale);scale();
  const bank={
    facts:[[4,6,'Think of four rows of six, or six rows of four.'],[7,8,'Double 7 three times.'],[9,0,'Zero groups contain zero items.'],[12,1,'Multiplying by one keeps the original amount.'],[6,7,'Use 6 × 5 + 6 × 2.']],
    mental:[[19,6,'Use 20 × 6, then remove one group of six.'],[16,25,'Halve 16 and double 25 twice.'],[23,7,'Split 23 into 20 + 3.'],[47,11,'Use 470 + 47; remember to carry.'],[18,5,'Multiply by 10, then halve.'],[28,25,'Multiply by 100, then divide by 4.']],
    written:[[23,14,'Add 23 × 4 and 23 × 10.'],[306,7,'Use 300 × 7 + 6 × 7.'],[42,23,'Multiply 42 by 3 ones and 2 tens.'],[108,12,'Use 108 × 10 + 108 × 2.']],
    rational:[[0.5,0.75,'Half of three quarters is three eighths.','1/2 × 3/4'],[2.4,1.3,'Find 24 × 13, then divide the product by 100.'],[-3,-4,'Same signs give a positive product.'],[0.4,0.3,'Four tenths times three tenths gives twelve hundredths.'],[12,0.75,'Three quarters of 12: divide by 4, then multiply by 3.','12 × 3/4'],[-6,0.5,'Take half of −6.']]
  };
  const cursors={facts:0,mental:0,written:0,rational:0};let current,done=false,helped=false,solved=0;
  function question(){const level=$('level').value;current=bank[level][cursors[level]++%bank[level].length];done=false;helped=false;$('question').textContent=current[3]||`${current[0]} × ${current[1]}`;$('answer').value='';$('feedback').textContent='';$('hint-text').textContent='';}
  function number(s){s=s.trim();if(/^[+-]?\d+(?:\.\d+)?\s*\/\s*[+-]?\d+(?:\.\d+)?$/.test(s)){const[a,b]=s.split('/').map(Number);return b?a/b:NaN;}return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)?Number(s):NaN;}
  $('level').addEventListener('change',question);$('new-question').addEventListener('click',question);$('hint').addEventListener('click',()=>{helped=true;$('hint-text').textContent=current[2];});
  $('answer-form').addEventListener('submit',event=>{event.preventDefault();const ans=number($('answer').value),[a,b]=current;if(!Number.isFinite(ans)){$('feedback').textContent='Enter a valid number or fraction with a nonzero denominator.';return;}if(Math.abs(ans-a*b)<1e-9){$('feedback').textContent=`Correct: ${a} × ${b} = ${a*b}. ${b!==0?`Check: ${a*b} ÷ ${b} = ${a}.`:'A zero factor makes the product zero.'}`;if(!done&&!helped)solved++;done=true;$('progress').textContent=`${solved} solved independently in this session.`;}else{helped=true;$('feedback').textContent='Try again. Estimate the size first, then split a factor into friendly parts or use a hint.';}});question();
})();
