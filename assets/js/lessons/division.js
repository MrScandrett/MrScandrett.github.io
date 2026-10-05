(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  function groups() {
    const n = Number($('total').value), d = Number($('divisor').value);
    if (!$('total').value || !$('divisor').value || !Number.isInteger(n) || n < 0 || n > 120 || !Number.isInteger(d) || d < 1 || d > 12) {
      $('group-status').textContent = 'Use a whole-number dividend from 0 to 120 and a divisor from 1 to 12.'; $('group-view').replaceChildren(); $('remainder-view').replaceChildren(); $('group-equation').textContent = ''; return;
    }
    const q = Math.floor(n / d), r = n % d, sharing = $('model').value === 'sharing';
    $('group-status').textContent = sharing ? `${n} counters shared among ${d} groups: ${q} in each, ${r} left over.` : `${n} counters packed ${d} per group: ${q} full groups, ${r} left over.`;
    const dots = count => '<div class="dots" aria-hidden="true">' + '<span class="dot"></span>'.repeat(count) + '</div>';
    $('group-view').innerHTML = Array.from({length: sharing ? d : q}, (_, i) => `<div class="counter-group"><strong>Group ${i + 1} · ${sharing ? q : d}</strong>${dots(sharing ? q : d)}</div>`).join('');
    $('remainder-view').innerHTML = `<strong>Left over: ${r}</strong>${dots(r)}`;
    $('group-equation').textContent = `${n} ÷ ${d} = ${q}${r ? ' R' + r : ''}   |   ${d} × ${q} + ${r} = ${n}`;
  }
  $('draw').addEventListener('click', groups); $('model').addEventListener('change', groups); groups();
  const strategies = {
    split: ['84 = 70 + 14', '70 ÷ 7 = 10; 14 ÷ 7 = 2', '10 + 2 = 12', 'Check: 7 × 12 = 84. Split into multiples of the divisor.'],
    near: ['196 = 200 − 4', '200 ÷ 4 = 50; 4 ÷ 4 = 1', '50 − 1 = 49', 'Check: 4 × 49 = 196. The 4 extra items were one extra group.'],
    factor: ['12 = 3 × 4', '96 ÷ 3 = 32', '32 ÷ 4 = 8', 'Check: 12 × 8 = 96. Dividing by 3 and then 4 divides by their product.'],
    scale: ['Multiply dividend and divisor by 4', '150 ÷ 25 = 600 ÷ 100', '600 ÷ 100 = 6', 'Check: 25 × 6 = 150. Scaling both numbers equally preserves the quotient.']
  };
  function strategy() { $('strategy-view').innerHTML = '<ol>' + strategies[$('strategy').value].map(s => `<li>${s}</li>`).join('') + '</ol>'; }
  $('strategy').addEventListener('change', strategy); strategy();
  const examples = {'156': [156,12], '1005': [1005,5], '157': [157,12]};
  let step = 0;
  function buildExample(n, d) {
    const digits = String(n).split('').map(Number), frames = [];
    let partial = 0, started = false, quotient = '', rows = [];
    const add = (phase, text, model, active) => frames.push({phase,text,model,active,quotient,rows:rows.map(r => ({...r}))});
    add(-1, 'Estimate first. Which digits can you divide by the divisor? Reveal a step to begin.', null, 0);
    digits.forEach((digit, i) => {
      const previous = partial;
      partial = partial * 10 + digit;
      if (!started && partial < d && i < digits.length - 1) return;
      const unit = ['ones','tens','hundreds','thousands'][digits.length - 1 - i];
      if (started) {
        rows.push({value:partial,end:i,kind:'down'});
        add(3, `Bring down ${digit}: ${previous} ${unit === 'ones' ? 'tens' : unit === 'tens' ? 'hundreds' : 'thousands'} regroup as ${previous * 10} ${unit}. Add ${digit} ${unit} to make ${partial} ${unit}.`, {count:partial,unit}, i);
      }
      started = true;
      const q = Math.floor(partial / d), product = q * d;
      quotient += q;
      add(0, `${d} fits into ${partial} ${unit} ${q} times. Write ${q} in the ${unit} column${q === 0 ? ' — this zero keeps the other digits in their places' : ''}.`, {count:partial,unit}, i);
      rows.push({value:product,end:i,kind:'multiply'});
      add(1, `Multiply: ${q} × ${d} = ${product}. These are the ${unit} used by this quotient digit. Align the product beneath the amount you divided.`, {count:partial,used:product,unit}, i);
      partial -= product;
      rows.push({value:partial,end:i,kind:'subtract'});
      add(2, `Subtract: ${partial + product} − ${product} = ${partial} ${unit} left. ${i === digits.length - 1 ? 'There are no more digits to bring down.' : 'Regroup this leftover amount before using the next digit.'}`, {count:partial,unit}, i);
    });
    return {digits, frames, q:Math.floor(n/d), r:n%d};
  }
  function long(reset) {
    if (reset) step = 0;
    const [n,d] = examples[$('long-example').value], e = buildExample(n,d), f = e.frames[step];
    const cells = (value,end,kind='') => {
      const chars = String(value).split(''), start = end - chars.length + 1;
      return e.digits.map((_,i) => `<span class="work-digit ${kind} ${i === f.active ? 'active-column' : ''}">${i >= start && i <= end ? chars[i-start] : ''}</span>`).join('');
    };
    const qEnd = e.digits.length - String(e.q).length + f.quotient.length - 1;
    $('long-heading').textContent = `${n} ÷ ${d}`;
    $('long-work').innerHTML = `<div class="written-grid" style="--digits:${e.digits.length}"><span></span>${e.digits.map((_,i)=>`<small>${['O','T','H','Th'][e.digits.length-1-i]}</small>`).join('')}<span></span>${f.quotient ? cells(f.quotient,qEnd,'quotient-digit') : cells('',-1)}<strong class="outside-divisor">${d}</strong><div class="division-bracket">${cells(n,e.digits.length-1)}</div>${f.rows.map(r=>`<span class="operation">${r.kind === 'multiply' ? '−' : r.kind === 'down' ? '↓' : ''}</span><div class="work-row ${r.kind}">${cells(r.value,r.end)}</div>`).join('')}</div>`;
    $('step-count').textContent = `Step ${step} of ${e.frames.length-1}`;
    $('long-explain').textContent = f.text;
    document.querySelectorAll('.cycle li').forEach((li,i)=>{li.classList.toggle('current',i===f.phase); if(i===f.phase) li.setAttribute('aria-current','step'); else li.removeAttribute('aria-current');});
    $('place-model').innerHTML = f.model ? `<p><strong>${f.model.count} ${f.model.unit}</strong>${f.model.used !== undefined ? ` · ${f.model.used} used, ${f.model.count-f.model.used} left` : ''}</p><div class="unit-blocks" aria-hidden="true">${Array.from({length:f.model.count},(_,i)=>`<span class="unit-block ${i < (f.model.used || 0) ? 'used' : ''}"></span>`).join('')}</div><p class="paper-key">Each square is one of the current units (${f.model.unit}). ${f.model.used !== undefined ? 'Crossed squares are subtracted.' : 'The units change as you move right.'}</p>` : '<p>The columns are thousands (Th), hundreds (H), tens (T), and ones (O). Follow the highlighted column.</p>';
    $('long-steps').innerHTML = e.frames.slice(1).map(x=>`<li>${x.text}</li>`).join('');
    $('long-check').textContent = step === e.frames.length-1 ? `Check: ${d} × ${e.q} + ${e.r} = ${n}. Answer: ${e.q}${e.r ? ' R'+e.r : ''}. The remainder is smaller than ${d}.` : 'Predict the next step, then reveal it.';
    $('next-step').disabled = step === e.frames.length-1; $('prev-step').disabled = step === 0;
  }
  $('long-example').addEventListener('change', () => long(true)); $('reset-steps').addEventListener('click', () => long(true));
  $('next-step').addEventListener('click', () => { step++; long(false); });
  $('prev-step').addEventListener('click', () => { step--; long(false); }); long(true);
  const bank = {
    facts:[[24,6,'Think: 6 times what equals 24?'],[56,7,'Use 7 × 8 = 56.'],[0,5,'What number multiplied by 5 gives 0?'],[72,9,'Use a multiplication fact near 9 × 10.']],
    mental:[[84,7,'Split 84 into 70 + 14.'],[196,4,'Use 200 ÷ 4, then subtract one group.'],[150,25,'Multiply both numbers by 4.'],[96,12,'Divide by 3, then by 4.'],[85,5,'Double 85, then divide by 10.'],[168,8,'Halve three times, or split 160 + 8.']],
    remainders:[[43,6,'6 × 7 = 42. How much is left?'],[157,12,'12 × 13 = 156.'],[25,6,'Use four complete groups of 6.'],[100,9,'9 × 11 = 99.']],
    rational:[[4.2,0.6,'Multiply both numbers by 10.'],[6,0.5,'How many halves fit in each whole?'],[17,5,'3 wholes, with 2/5 left.'],[0.75,0.125,'Three quarters contains how many eighths?','3/4 ÷ 1/8'],[-24,6,'Different signs give a negative quotient.'],[8,0.25,'There are four quarters in each whole.']]
  };
  const cursors = {facts:0, mental:0, remainders:0, rational:0}; let current, solved = 0, done = false, helped = false;
  function question() { const level = $('level').value; current = bank[level][cursors[level]++ % bank[level].length]; done = false; helped = false; $('question').textContent = current[3] || `${current[0]} ÷ ${current[1]}`; $('remainder-fields').hidden = level !== 'remainders'; $('answer-label').textContent = level === 'remainders' ? 'Whole-number quotient' : 'Your quotient (decimal or fraction accepted)'; $('answer').value = ''; $('remainder').value = '0'; $('feedback').textContent = ''; $('hint-text').textContent = ''; }
  function number(s) { s = s.trim(); if (/^[+-]?\d+(?:\.\d+)?\s*\/\s*[+-]?\d+(?:\.\d+)?$/.test(s)) { const [a,b] = s.split('/').map(Number); return b ? a / b : NaN; } return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s) ? Number(s) : NaN; }
  $('level').addEventListener('change', question); $('new-question').addEventListener('click', question);
  $('hint').addEventListener('click', () => { helped = true; $('hint-text').textContent = current[2]; });
  $('answer-form').addEventListener('submit', event => {
    event.preventDefault(); const [a,b] = current, remainderMode = $('level').value === 'remainders', ans = number($('answer').value), r = Number($('remainder').value);
    if (!Number.isFinite(ans) || (remainderMode && (!$('remainder').value || !Number.isInteger(r) || r < 0 || !Number.isInteger(ans) || ans < 0))) { $('feedback').textContent = 'Enter a valid number or fraction; remainder problems need a nonnegative whole quotient and remainder.'; return; }
    if (remainderMode && r >= b) { $('feedback').textContent = `A remainder must be smaller than ${b}. There is another full group in your leftover amount.`; return; }
    const q = remainderMode ? Math.floor(a / b) : a / b, expectedR = a % b;
    if (Math.abs(ans - q) < 1e-9 && (!remainderMode || r === expectedR)) {
      $('feedback').textContent = `Correct. Check: ${b} × ${ans}${remainderMode ? ' + ' + r : ''} = ${a}.`;
      if (!done && !helped) solved++; done = true; $('progress').textContent = `${solved} solved independently in this session.`;
    } else { helped = true; $('feedback').textContent = `Try again. Multiply your quotient by ${b}${remainderMode ? ', then add your remainder' : ''}. Does it give ${a}? Use a hint if you need a new route.`; }
  }); question();
})();
