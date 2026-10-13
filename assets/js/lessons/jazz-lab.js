(() => {
  'use strict';
  const root = document.querySelector('[data-jazz]');
  if (!root) return;
  const version = document.getElementById('jazzVersion'), tempo = document.getElementById('jazzTempo');
  const status = document.getElementById('jazzStatus'), list = document.getElementById('jazzNotes');
  let context, nodes = [], timer, generation = 0;
  const names = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','B♭','B'];
  function events() {
    const altered = version.value === '1';
    if (root.dataset.jazz === 'charlie-parker') return (altered ? [60,62,64,65,67,69,71,72] : [60,64,67,72]).map((pitch,i,a)=>({pitch,beat:i*4/a.length,duration:4/a.length*.8,voice:'Lead'}));
    const pitches = [60,64,67,64,62,65,69,65];
    const result = pitches.map((pitch,i)=>({pitch,beat:i/2+(root.dataset.jazz==='louis-armstrong' && altered && i%2 ? 1/6 : 0),duration:.25,voice:'Lead'}));
    if (root.dataset.jazz==='duke-ellington') {
      result.splice(4); result.forEach(e=>e.beat*=1.5);
      if (altered) [48,55,52].forEach((pitch,i)=>result.push({pitch,beat:2.5+i*.5,duration:.3,voice:'Low answer'}));
    }
    return result.sort((a,b)=>a.beat-b.beat);
  }
  function render() {
    list.replaceChildren(...events().map(e=>{const li=document.createElement('li');li.textContent=`${e.voice}: ${names[e.pitch%12]}${Math.floor(e.pitch/12)-1} · beat ${(e.beat+1).toFixed(2)}`;return li;}));
    document.getElementById('jazzBpm').value=tempo.value;
  }
  function stop(message='Stopped.') { generation++; clearTimeout(timer); nodes.forEach(n=>{try{n.stop();}catch{}});nodes=[];status.textContent=message; }
  document.getElementById('jazzPlay').addEventListener('click',async()=>{
    stop('Preparing audio…'); const run=generation;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Audio unavailable');
      context ||= new Audio(); await context.resume(); if(run!==generation)return;
      const beat=60/Number(tempo.value), start=context.currentTime+.06;
      events().forEach(e=>{
        const oscillator=context.createOscillator(),gain=context.createGain(), at=start+e.beat*beat;
        oscillator.type=e.voice==='Lead'?'triangle':'sine';oscillator.frequency.value=440*2**((e.pitch-69)/12);
        gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.12,at+.01);gain.gain.exponentialRampToValueAtTime(.001,at+e.duration*beat);
        oscillator.connect(gain);gain.connect(context.destination);oscillator.start(at);oscillator.stop(at+e.duration*beat+.02);nodes.push(oscillator);
        oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
      });
      status.textContent=`Playing: ${version.selectedOptions[0].textContent} at ${tempo.value} BPM.`;
      timer=setTimeout(()=>stop('Finished. Compare the other version.'),(4*beat+.2)*1000);
    } catch { stop('Audio unavailable. Use the phrase-event list to clap the timing or sing the pitches.'); }
  });
  document.getElementById('jazzStop').addEventListener('click',()=>stop());
  version.addEventListener('change',()=>{stop('Version changed. Press Play to compare.');render();});
  tempo.addEventListener('input',()=>{stop('Tempo changed. Press Play to hear it.');render();});
  document.getElementById('jazzReset').addEventListener('click',()=>{stop('Reset. Ready to play.');version.value='0';tempo.value='90';render();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  window.addEventListener('pagehide',()=>stop());render();
})();
