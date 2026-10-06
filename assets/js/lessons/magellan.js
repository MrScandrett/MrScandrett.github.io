(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const stops = [
    ['1519 · A westward plan', 'The fleet left Seville on August 10 and sailed from Sanlúcar de Barrameda on September 20. Five ships crossed the Atlantic toward South America. Problem: find a passage to Asia while maintaining ships, food, and command.'],
    ['1520 · Search, winter, and a strait', 'After wintering at Puerto San Julián and suppressing a mutiny, the expedition found a passage through southern South America. Santiago had wrecked; San Antonio turned back. Three ships entered the Pacific on November 28. Problem: distinguish a real passage from a river mouth or dead end.'],
    ['1520–1521 · An ocean wider than expected', 'The long Pacific crossing brought severe shortages and illness. The ships reached Guam in March 1521, then the Philippines. The name Pacific reflected the relatively calm conditions Magellan encountered, not a guarantee of a peaceful ocean. Problem: revise a plan when distance and supplies do not match.'],
    ['April 27, 1521 · Resistance at Mactan', 'Magellan intervened in local politics and attempted to impose authority through force. Lapulapu’s defenders resisted; Magellan was killed. Reefs and shallow water limited support from the ships. Problem: military equipment does not remove the effects of terrain or local resistance.'],
    ['November 1521 · The Maluku Islands', 'After further travel and leadership changes, the remaining ships reached Tidore and obtained cloves through trade. Trinidad needed repairs and later attempted an eastward return. Victoria sailed west under Elcano. Problem: choose a return route while balancing ship condition, supplies, and Portuguese opposition.'],
    ['September 1522 · A completed circuit', 'Victoria crossed the Indian Ocean, rounded the Cape of Good Hope, and reached Sanlúcar on September 6, then Seville on September 8. Eighteen European survivors arrived aboard, alongside people from Southeast Asia. Others returned separately later. Problem: assemble records and explain both the achievement and its human cost.']
  ];
  function showStop(i) {
    const h = document.createElement('h3'), p = document.createElement('p');
    h.textContent = stops[i][0]; p.textContent = stops[i][1];
    $('#stop-detail').replaceChildren(h, p);
    document.querySelectorAll('[data-stop]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.stop) === i)));
  }
  document.querySelectorAll('[data-stop]').forEach(b => b.addEventListener('click', () => showStop(Number(b.dataset.stop))));
  showStop(0);
  function provision() {
    const crew = Number($('#crew').value), days = Number($('#days').value), demand = crew * days, balance = 9000 - demand;
    $('#stores').textContent = `${crew} people × ${days} days = ${demand.toLocaleString()} person-days needed. Food lasts ${(9000 / crew).toFixed(1)} days. ${balance >= 0 ? `Reserve: ${balance.toLocaleString()}` : `Shortfall: ${(-balance).toLocaleString()}`} person-days.`;
    $('#food-bar').style.width = `${Math.min(100, 9000 / demand * 100)}%`;
    $('#food-chart').setAttribute('aria-label', `Food covers ${(9000 / demand * 100).toFixed(0)} percent of planned demand${balance >= 0 ? ', with no shortfall' : ', leaving a shortfall'}.`);
  }
  ['#crew', '#days'].forEach(s => $(s).addEventListener('input', provision)); provision();
  document.querySelectorAll('[data-answer]').forEach(b => b.addEventListener('click', () => {
    b.closest('.lab').querySelector('.feedback').textContent = b.dataset.answer === 'right' ? 'Supported. Seaworthiness, food, water, health, and travel time all constrain the voyage. Leave a reserve and revisit estimates as evidence changes.' : 'Reconsider: the ships could sail, yet people suffered shortages and disease. A successful hull or calm sea does not establish that the whole plan will work.';
  }));
  function time() {
    const degrees = Number($('#west').value);
    $('#time-shift').textContent = `${degrees}° ÷ 15° per hour = ${degrees / 15} hours of accumulated westward solar-time shift.${degrees === 360 ? ' Full circuit: advance the recorded date by one day to match home.' : ' Move to 360° to complete the circuit.'}`;
  }
  $('#west').addEventListener('input', time); time();
  const bundles = {
    journal: ['A sailor records a date and describes a local leader as friendly. No account by that leader is included.', 'The journal supports what the writer recorded and perceived. It does not by itself establish the leader’s motives or consent to foreign rule. Check translation, purpose, and other accounts.'],
    records: ['A journal records departure and arrival; independent port records agree on the ship’s identity and dates.', 'Agreement strengthens the travel chronology. These records still do not tell every crew member’s experience or every local community’s perspective.'],
    portrait: ['An artist paints Magellan on a ship three centuries after the expedition. No eyewitness sketch is known for this scene.', 'Use it to investigate later remembrance and artistic choices. It cannot establish the exact appearance of this event. Seek contemporary records for that claim.']
  };
  function evidence() { $('#evidence-detail').textContent = bundles[$('#evidence').value][0]; $('#interpretation').textContent = ''; }
  $('#evidence').addEventListener('change', evidence); evidence();
  $('#interpret').addEventListener('click', () => { $('#interpretation').textContent = bundles[$('#evidence').value][1]; });
})();
