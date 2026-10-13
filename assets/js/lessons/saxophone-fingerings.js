/* Common written-pitch fingerings, checked against Yamaha's instrument guide.
 * Keys represent player touches, not every linked pad. No altissimo/palm range.
 * https://www.yamaha.com/en/musical_instrument_guide/saxophone/play/play002.html
 */
(function(root){
  'use strict';
  const keys = [
    {id:'octave',label:'Octave',hand:'Left thumb'},
    {id:'L1',label:'L1 · index',hand:'Left main keys'},
    {id:'bis',label:'Bis B♭ · index',hand:'Left main keys'},
    {id:'L2',label:'L2 · middle',hand:'Left main keys'},
    {id:'L3',label:'L3 · ring',hand:'Left main keys'},
    {id:'Gsharp',label:'G♯',hand:'Left little finger'},
    {id:'lowCsharp',label:'Low C♯',hand:'Left little finger'},
    {id:'lowB',label:'Low B',hand:'Left little finger'},
    {id:'lowBflat',label:'Low B♭',hand:'Left little finger'},
    {id:'R1',label:'R1 · index',hand:'Right main keys'},
    {id:'R2',label:'R2 · middle',hand:'Right main keys'},
    {id:'R3',label:'R3 · ring',hand:'Right main keys'},
    {id:'sideBflat',label:'Side B♭ · index',hand:'Right side key'},
    {id:'lowC',label:'Low C',hand:'Right little finger'},
    {id:'Eflat',label:'E♭',hand:'Right little finger'}
  ];
  const all=['L1','L2','L3','R1','R2','R3'];
  const natural={D:all,E:all.slice(0,5),F:all.slice(0,4),G:all.slice(0,3),A:all.slice(0,2),B:all.slice(0,1)};
  const notes=[];
  function add(midi,sharp,flat,pressed,tip,alternates=[]){notes.push({midi,sharp,flat:flat||sharp,variants:[{name:'Standard',keys:pressed,tip:tip||'Keep fingertips close to the keys and use steady air.'},...alternates]});}
  add(58,'A♯3','B♭3',[...all,'lowC','lowBflat'],'Left little finger: low B♭; right little finger: low C. Keep all six main keys down.');
  add(59,'B3',null,[...all,'lowC','lowB'],'Left little finger: low B; right little finger: low C.');
  add(60,'C4',null,[...all,'lowC'],'Use the right little finger low-C key.');
  add(61,'C♯4','D♭4',[...all,'lowC','lowCsharp'],'Left little finger: low C♯; right little finger: low C.');
  for(const octave of [4,5]){
    const thumb=octave===5?['octave']:[], base=12*(octave+1);
    for(const [semi,letter] of [[2,'D'],[4,'E'],[5,'F'],[7,'G'],[9,'A'],[11,'B']])add(base+semi,letter+octave,null,[...thumb,...natural[letter]],octave===5?'Press the left-thumb octave key. The mechanism chooses the appropriate octave vent.':undefined);
    add(base+3,'D♯'+octave,'E♭'+octave,[...thumb,...all,'Eflat'],'Use the right little finger E♭ key, not the low-C key.');
    add(base+6,'F♯'+octave,'G♭'+octave,[...thumb,'L1','L2','L3','R2'],'Right middle finger only: R1 and R3 are released. This uses the main R2 key, not a side key.');
    add(base+8,'G♯'+octave,'A♭'+octave,[...thumb,'L1','L2','L3','Gsharp'],'Keep all three left main keys down; add the left little finger G♯ key.');
    add(base+10,'A♯'+octave,'B♭'+octave,[...thumb,'L1','bis'],'Roll the left index finger to cover L1 and the small bis key together.',[
      {name:'Side B♭',keys:[...thumb,'L1','L2','sideBflat'],tip:'Finger A with L1 and L2, then add the right side-B♭ key. Useful for A–B♭ movement.'},
      {name:'1 + 1 B♭',keys:[...thumb,'L1','R1'],tip:'Left index plus right index. A common alternate; tone and response can vary with the instrument.'}
    ]);
    add(base+12,'C'+(octave+1),null,[...thumb,'L2'],'Use the left middle finger alone'+(octave===5?', with the octave key.':'; leave the octave key released.'));
    if(octave===4)add(base+13,'C♯5','D♭5',[],'Release all keys in this diagram. Your thumbs still support the instrument; keep fingertips close.');
  }
  notes.sort((a,b)=>a.midi-b.midi);
  const byMidi=new Map(notes.map(n=>[n.midi,n]));
  const first=[71,69,67,69,71];
  const patterns={first, C:[60,62,64,65,67,69,71,72],G:[67,69,71,72,74,76,78,79],F:[65,67,69,70,72,74,76,77],chromatic:Array.from({length:13},(_,i)=>60+i)};
  root.SaxFingerings={keys,notes,byMidi,patterns};
})(typeof window==='undefined'?globalThis:window);
