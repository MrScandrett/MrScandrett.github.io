/* Levers lesson (lessons/physics/mechanics/levers.html): the balance-beam lab and the catapult siege game.
 * Moved out of the page's inline <script>; its physics is in levers-core.js, which must load first. */
  (()=>{
    const q=s=>document.querySelector(s), cv=q('#balanceCanvas'), ctx=cv.getContext('2d');
    const f=q('#fulcrum'), load=q('#load'), effort=q('#effort'); let tilt=0;
    const state=()=>({fp:+f.value/10,w:+load.value,e:+effort.value});
    function update(){const s=state(),{dl,de,tl,te,delta}=LeversCore.torques(s);q('#fulcrumOut').value=dl.toFixed(1)+' m';q('#loadOut').value=s.w+' N';q('#effortOut').value=s.e+' N';q('#effortTorque').textContent=te.toFixed(0)+' N·m';q('#loadTorque').textContent=tl.toFixed(0)+' N·m';q('#ma').textContent=(de/dl).toFixed(2)+'×';const st=q('#balanceStatus');st.textContent=Math.abs(delta)<.025?'Balanced!':delta>0?'Effort wins':'Load wins';st.style.color=Math.abs(delta)<.025?'var(--green)':'var(--amber)'}
    function resize(canvas,h){const d=Math.min(devicePixelRatio||1,2),w=canvas.clientWidth;canvas.width=w*d;canvas.height=h*d;canvas.getContext('2d').setTransform(d,0,0,d,0,0)}
    function arrow(x,y,len,color,up,label){const yy=y+(up?-len:len);ctx.save();ctx.lineCap='round';ctx.strokeStyle='#02090b';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,yy);ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=4;ctx.stroke();ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,yy);ctx.lineTo(x-9,yy+(up?13:-13));ctx.lineTo(x+9,yy+(up?13:-13));ctx.closePath();ctx.fill();ctx.font='900 13px Inter';ctx.textAlign='center';ctx.fillStyle='#071014';const tw=ctx.measureText(label).width+18,ly=yy+(up?-28:31);ctx.fillStyle=color;ctx.roundRect(x-tw/2,ly-14,tw,23,7);ctx.fill();ctx.fillStyle='#071014';ctx.fillText(label,x,ly+3);ctx.restore()}
    function draw(){const w=cv.clientWidth,h=430,s=state(),tl=s.w*s.fp,te=s.e*(8-s.fp),target=Math.max(-.28,Math.min(.28,(te-tl)/Math.max(te,tl)*.34));tilt+=(target-tilt)*.08;ctx.clearRect(0,0,w,h);const pad=Math.max(48,w*.075),span=w-pad*2,fx=pad+span*s.fp/8,y=210,lx=-span*s.fp/8,ex=span*(8-s.fp)/8,c=Math.cos(tilt),sn=Math.sin(tilt),loadX=fx+lx*c,loadY=y+lx*sn,effortX=fx+ex*c,effortY=y+ex*sn;
      const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#061a22');sky.addColorStop(.7,'#0b2630');sky.addColorStop(.701,'#102a21');sky.addColorStop(1,'#071510');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);ctx.strokeStyle='#ffffff0d';ctx.lineWidth=1;for(let gx=pad;gx<w-pad;gx+=Math.max(50,span/8)){ctx.beginPath();ctx.moveTo(gx,32);ctx.lineTo(gx,350);ctx.stroke()}
      ctx.fillStyle='#0008';ctx.beginPath();ctx.ellipse(fx,323,52,10,0,0,Math.PI*2);ctx.fill();const fg=ctx.createLinearGradient(fx-34,y,fx+34,318);fg.addColorStop(0,'#d8b4fe');fg.addColorStop(.48,'#a855f7');fg.addColorStop(1,'#5b21b6');ctx.fillStyle=fg;ctx.strokeStyle='#e9d5ff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(fx,y+7);ctx.lineTo(fx-35,318);ctx.lineTo(fx+35,318);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.save();ctx.translate(fx,y);ctx.rotate(tilt);ctx.shadowColor='#000b';ctx.shadowBlur=14;ctx.shadowOffsetY=9;ctx.lineCap='round';ctx.lineWidth=20;ctx.strokeStyle='#071014';ctx.beginPath();ctx.moveTo(lx,0);ctx.lineTo(ex,0);ctx.stroke();ctx.shadowColor='transparent';const g=ctx.createLinearGradient(lx,0,ex,0);g.addColorStop(0,'#d97706');g.addColorStop(.18,'#fbbf24');g.addColorStop(.5,'#f8fafc');g.addColorStop(.82,'#86efac');g.addColorStop(1,'#16a34a');ctx.lineWidth=14;ctx.strokeStyle=g;ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#ffffffaa';ctx.beginPath();ctx.moveTo(lx+5,-4);ctx.lineTo(ex-5,-4);ctx.stroke();ctx.restore();
      ctx.fillStyle='#0b1215';ctx.strokeStyle='#fbbf24';ctx.lineWidth=3;ctx.roundRect(loadX-25,loadY+16,50,39,7);ctx.fill();ctx.stroke();ctx.fillStyle='#fbbf24';ctx.font='900 13px JetBrains Mono';ctx.textAlign='center';ctx.fillText(s.w+' N',loadX,loadY+41);ctx.strokeStyle='#fbbf24aa';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(loadX,loadY+6);ctx.lineTo(loadX,loadY+16);ctx.stroke();
      ctx.fillStyle='#f8fafc';ctx.strokeStyle='#a855f7';ctx.lineWidth=4;ctx.beginPath();ctx.arc(fx,y,11,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#a855f7';ctx.beginPath();ctx.arc(fx,y,4,0,Math.PI*2);ctx.fill();arrow(loadX,loadY-2,Math.min(105,48+s.w*.35),'#fbbf24',false,'LOAD '+s.w+' N');arrow(effortX,effortY-2,Math.min(105,50+s.e*.45),'#4ade80',false,'EFFORT '+s.e+' N');
      ctx.font='900 12px Inter';ctx.textAlign='center';ctx.fillStyle='#e9d5ff';ctx.fillText('FULCRUM / PIVOT',fx,344);const dimY=378;ctx.setLineDash([5,5]);ctx.lineWidth=1.5;ctx.strokeStyle='#fbbf2488';ctx.beginPath();ctx.moveTo(pad,dimY);ctx.lineTo(fx,dimY);ctx.stroke();ctx.strokeStyle='#4ade8088';ctx.beginPath();ctx.moveTo(fx,dimY);ctx.lineTo(w-pad,dimY);ctx.stroke();ctx.setLineDash([]);for(const x of [pad,fx,w-pad]){ctx.strokeStyle='#d7ebe5';ctx.beginPath();ctx.moveTo(x,dimY-7);ctx.lineTo(x,dimY+7);ctx.stroke()}ctx.font='800 13px JetBrains Mono';ctx.fillStyle='#fbbf24';ctx.fillText('LOAD ARM  '+s.fp.toFixed(2)+' m',pad+(fx-pad)/2,405);ctx.fillStyle='#4ade80';ctx.fillText('EFFORT ARM  '+(8-s.fp).toFixed(2)+' m',fx+(w-pad-fx)/2,405);SimKit.frame(cv,draw)}
    [f,load,effort].forEach(x=>x.addEventListener('input',update));q('#balanceIt').onclick=()=>{let s=state(),fp=8*s.e/(s.w+s.e);if(fp<.5){effort.value=Math.min(100,Math.ceil(s.w*.5/7.5));s=state();fp=8*s.e/(s.w+s.e)}else if(fp>7.5){load.value=Math.min(150,Math.ceil(s.e*7.5/.5));s=state();fp=8*s.e/(s.w+s.e)}f.value=Math.max(5,Math.min(75,fp*10)).toFixed(1);update()};q('#balanceReset').onclick=()=>{f.value=40;load.value=60;effort.value=30;update()};new ResizeObserver(()=>resize(cv,430)).observe(cv);update();draw();
  })();
  (()=>{
    const q=s=>document.querySelector(s),cv=q('#catapultCanvas'),ctx=cv.getContext('2d'),arm=q('#arm'),angle=q('#angle'),pull=q('#pull'),mass=q('#mass');
    const levelBtns=[...document.querySelectorAll('.level-btn[data-level]')];
    const missionEl=q('#levelMission'),targetsHud=q('#targetsHud'),shotsHud=q('#shotsHud'),scoreHud=q('#scoreHud');
    const {PIVOT_XM,PIVOT_YM,G}=LeversCore;
    let currentLevel=1,shots=0,score=0,bestRange=0,levelCleared=false,bannerNote='';
    let blocks=[],targets=[],particles=[],popups=[],shockwaves=[],trail=[],ghostTrail=[];
    let proj=null,throwAnim=0,shakeTime=0,lastNow=0,dragState=null;
    const starsEarned={1:0,2:0,3:0,4:0,5:0},bestScores={1:0,2:0,3:0,4:0,5:0};

    const MAT={
      glass:{hp:5,mass:0.8,fill:'#38bdf866',stroke:'#bae6fd',crack:'#e0f2fe',score:80,label:'GLASS'},
      wood:{hp:10,mass:1.6,fill:'#b45309',stroke:'#fbbf24',crack:'#fde68a',score:120,label:'WOOD'},
      stone:{hp:24,mass:3.4,fill:'#475569',stroke:'#cbd5e1',crack:'#0f172a',score:180,label:'STONE'},
      tnt:{hp:4,mass:1.4,fill:'#be123c',stroke:'#fda4af',crack:'#fef08a',score:250,label:'TNT'},
      wall:{hp:9999,mass:999,fill:'#1e293b',stroke:'#64748b',crack:'#94a3b8',score:0,label:'WALL'}
    };

    const LEVELS={
      0:{
        name:'Free Range',
        mission:'<strong>Free Range · Fair-Test Lab:</strong> Open test field! Change one variable at a time, predict the landing distance, and launch to compare.',
        preset:null,
        build:()=>({blocks:[],targets:[]})
      },
      1:{
        name:'Lv 1 · Timber Tower',
        mission:'<strong>Lv 1 · Timber Tower:</strong> Smash the two-story wooden tower at <strong>6.3–7.6 m</strong>! Hit the lower columns or middle deck to topple both Gremlins.',
        preset:{arm:40,angle:45,pull:55,mass:5},
        build:()=>({
          blocks:[
            {x:6.30,y:0,w:0.24,h:1.15,type:'wood'},
            {x:7.32,y:0,w:0.24,h:1.15,type:'wood'},
            {x:6.18,y:1.15,w:1.50,h:0.22,type:'wood'},
            {x:6.42,y:1.37,w:0.20,h:0.82,type:'glass'},
            {x:7.24,y:1.37,w:0.20,h:0.82,type:'glass'},
            {x:6.30,y:2.19,w:1.26,h:0.20,type:'wood'}
          ],
          targets:[
            {x:6.93,y:0.28,r:0.27,hp:9},
            {x:6.93,y:1.63,r:0.25,hp:9}
          ]
        })
      },
      2:{
        name:'Lv 2 · Shield Wall',
        mission:'<strong>Lv 2 · Shield Wall:</strong> A tall stone wall at <strong>4.5 m</strong> blocks direct shots! Raise <strong>Release angle (58°–66°)</strong> and boost <strong>Pull-back (70%+)</strong> to lob over it.',
        preset:{arm:40,angle:45,pull:60,mass:5},
        build:()=>({
          blocks:[
            {x:4.40,y:0,w:0.36,h:3.15,type:'wall'},
            {x:6.48,y:0,w:0.48,h:0.48,type:'tnt'},
            {x:7.12,y:0,w:0.24,h:1.15,type:'wood'},
            {x:8.08,y:0,w:0.24,h:1.15,type:'wood'},
            {x:7.00,y:1.15,w:1.44,h:0.22,type:'wood'},
            {x:7.22,y:1.37,w:0.20,h:0.75,type:'glass'},
            {x:8.02,y:1.37,w:0.20,h:0.75,type:'glass'},
            {x:7.12,y:2.12,w:1.20,h:0.20,type:'wood'}
          ],
          targets:[
            {x:6.05,y:0.27,r:0.26,hp:9},
            {x:7.72,y:0.28,r:0.28,hp:11,helmet:true},
            {x:7.72,y:1.62,r:0.24,hp:9}
          ]
        })
      },
      3:{
        name:'Lv 3 · Stone Bunker',
        mission:'<strong>Lv 3 · Stone Bunker:</strong> Light balls bounce off thick stone at <strong>5.7 m</strong>! Increase <strong>Projectile mass (12–20 g)</strong> for momentum (<code>p = mv</code>), then raise <strong>Arm length &amp; Pull-back</strong>.',
        preset:{arm:42,angle:42,pull:65,mass:5},
        build:()=>({
          blocks:[
            {x:5.65,y:0,w:0.34,h:1.30,type:'stone'},
            {x:7.15,y:0,w:0.32,h:1.30,type:'stone'},
            {x:5.52,y:1.30,w:2.08,h:0.28,type:'stone'},
            {x:6.02,y:1.58,w:0.22,h:0.80,type:'wood'},
            {x:6.88,y:1.58,w:0.22,h:0.80,type:'wood'},
            {x:5.92,y:2.38,w:1.28,h:0.20,type:'wood'}
          ],
          targets:[
            {x:6.26,y:0.28,r:0.27,hp:12,helmet:true},
            {x:6.84,y:0.28,r:0.27,hp:12,helmet:true},
            {x:6.56,y:1.83,r:0.25,hp:9}
          ]
        })
      },
      4:{
        name:'Lv 4 · Low Bridge',
        mission:'<strong>Lv 4 · Low Bridge:</strong> An overhead bridge deck at <strong>3.8–5.1 m</strong> blocks high arcs! Lower <strong>Release angle (20°–25°)</strong> and boost speed to shoot flat <em>under</em> the arch into the TNT.',
        preset:{arm:45,angle:45,pull:65,mass:5},
        build:()=>({
          blocks:[
            {x:3.80,y:2.30,w:1.30,h:1.45,type:'wall'},
            {x:5.92,y:0,w:0.22,h:1.15,type:'wood'},
            {x:6.32,y:0,w:0.48,h:0.48,type:'tnt'},
            {x:7.22,y:0,w:0.22,h:1.15,type:'wood'},
            {x:5.82,y:1.15,w:1.72,h:0.22,type:'wood'},
            {x:6.05,y:1.37,w:0.20,h:0.80,type:'glass'},
            {x:7.10,y:1.37,w:0.20,h:0.80,type:'glass'},
            {x:5.95,y:2.17,w:1.45,h:0.22,type:'stone'}
          ],
          targets:[
            {x:6.98,y:0.26,r:0.25,hp:9},
            {x:6.68,y:1.63,r:0.27,hp:11,helmet:true},
            {x:6.68,y:2.64,r:0.24,hp:9}
          ]
        })
      },
      5:{
        name:'Lv 5 · Grand Citadel',
        mission:'<strong>Lv 5 · Grand Citadel:</strong> King Gremlin rules a twin-tower fortress (<strong>4.8–8.9 m</strong>)! Detonate the TNT crates to trigger a chain reaction across both towers.',
        preset:{arm:38,angle:38,pull:50,mass:5},
        build:()=>({
          blocks:[
            {x:4.85,y:0,w:0.26,h:1.12,type:'stone'},
            {x:5.75,y:0,w:0.26,h:1.12,type:'stone'},
            {x:4.75,y:1.12,w:1.36,h:0.20,type:'wood'},
            {x:5.20,y:1.32,w:0.46,h:0.46,type:'tnt'},
            {x:6.32,y:0,w:0.44,h:0.44,type:'tnt'},
            {x:7.05,y:0,w:0.30,h:1.25,type:'stone'},
            {x:7.48,y:0,w:0.46,h:0.46,type:'tnt'},
            {x:8.55,y:0,w:0.30,h:1.25,type:'stone'},
            {x:6.95,y:1.25,w:2.00,h:0.24,type:'wood'},
            {x:7.20,y:1.49,w:0.22,h:0.92,type:'glass'},
            {x:8.48,y:1.49,w:0.22,h:0.92,type:'glass'},
            {x:7.10,y:2.41,w:1.70,h:0.24,type:'stone'}
          ],
          targets:[
            {x:5.43,y:0.26,r:0.25,hp:9},
            {x:5.43,y:2.03,r:0.24,hp:9},
            {x:8.22,y:0.26,r:0.26,hp:11,helmet:true},
            {x:7.95,y:1.82,r:0.33,hp:15,crown:true}
          ]
        })
      }
    };

    function calc(){
      return LeversCore.launch(+arm.value,+angle.value,+pull.value,+mass.value);
    }

    function updateReadouts(){
      const s=calc();
      q('#armOut').value=s.a+' cm';
      q('#angleOut').value=s.A+'°';
      q('#pullOut').value=s.p+'%';
      q('#massOut').value=s.m+' g';
      q('#speedRead').textContent=s.v.toFixed(1)+' m/s';
      q('#rangeRead').textContent=s.r.toFixed(1)+' m';
      q('#timeRead').textContent=s.t.toFixed(1)+' s';
    }

    function starString(n){return '★'.repeat(n)+'☆'.repeat(3-n)}

    function updateHud(){
      const alive=targets.filter(t=>!t.dead).length,total=targets.length;
      if(currentLevel===0){
        targetsHud.textContent='🎯 Open Range';
        shotsHud.textContent='Trials: '+shots;
        scoreHud.textContent='Best: '+(bestRange>0?bestRange.toFixed(1)+' m':'—');
        q('#bestRead').textContent=bestRange>0?bestRange.toFixed(1)+' m':'—';
      }else{
        targetsHud.textContent='🎯 '+alive+' / '+total+' targets';
        shotsHud.textContent='Shots: '+shots;
        scoreHud.textContent='Score: '+score;
        if(levelCleared)bestScores[currentLevel]=Math.max(bestScores[currentLevel]||0,score);
        const st=starsEarned[currentLevel]||0;
        q('#bestRead').textContent=st>0?starString(st)+' '+bestScores[currentLevel]+' pts':(bestRange>0?bestRange.toFixed(1)+' m':'—');
      }
      missionEl.innerHTML=bannerNote||LEVELS[currentLevel].mission;
      for(let lv=1;lv<=5;lv++){
        const el=q('#stars-'+lv);
        if(el)el.textContent=starString(starsEarned[lv]||0);
      }
    }

    function loadLevel(lv,usePreset=true){
      currentLevel=+lv;
      levelBtns.forEach(b=>b.setAttribute('aria-pressed',+b.dataset.level===currentLevel?'true':'false'));
      const def=LEVELS[currentLevel];
      if(usePreset&&def.preset){
        arm.value=def.preset.arm;
        angle.value=def.preset.angle;
        pull.value=def.preset.pull;
        mass.value=def.preset.mass;
      }
      const built=def.build();
      blocks=built.blocks.map(b=>{
        const mat=MAT[b.type];
        return{...b,hp:b.hp||mat.hp,maxHp:b.hp||mat.hp,vx:0,vy:0,angle:0,omega:0,dead:false};
      });
      targets=built.targets.map(t=>({...t,maxHp:t.hp,vx:0,vy:0,angle:0,omega:0,dead:false,blink:Math.random()*5}));
      particles=[];popups=[];shockwaves=[];trail=[];ghostTrail=[];
      proj=null;shots=0;score=0;levelCleared=false;bannerNote='';
      updateReadouts();
      updateHud();
    }

    function addPopup(x,y,text,color='#fde68a'){
      popups.push({x,y,text,color,life:1.25,maxLife:1.25});
    }

    function spawnParticles(x,y,color,count=12,speed=3.5){
      for(let i=0;i<count;i++){
        const ang=Math.random()*Math.PI*2,sp=(0.3+Math.random()*0.9)*speed;
        particles.push({
          x,y,
          vx:Math.cos(ang)*sp,
          vy:Math.sin(ang)*sp+1.2,
          size:3+Math.random()*4,
          color,
          rot:Math.random()*6,
          vrot:(Math.random()-0.5)*10,
          life:0.55+Math.random()*0.45
        });
      }
    }

    function defeatTarget(t,reason='POP!'){
      if(t.dead)return;
      t.dead=true;
      const pts=t.crown?1000:t.helmet?650:500;
      score+=pts;
      spawnParticles(t.x,t.y,'#4ade80',18,4.2);
      spawnParticles(t.x,t.y,'#fbbf24',10,3.2);
      addPopup(t.x,t.y+0.35,reason+' +'+pts,'#4ade80');
      updateHud();
    }

    function explodeTNT(box){
      if(box.dead)return;
      box.dead=true;
      score+=MAT.tnt.score;
      const cx=box.x+box.w/2,cy=box.y+box.h/2,rad=2.65;
      shockwaves.push({x:cx,y:cy,r:0.1,maxR:rad,life:0.45,maxLife:0.45});
      shakeTime=0.35;
      spawnParticles(cx,cy,'#fb7185',24,6.2);
      spawnParticles(cx,cy,'#fbbf24',20,5.0);
      addPopup(cx,cy+0.4,'KABOOM! +250','#fb7185');
      for(const b of blocks){
        if(b.dead||b.type==='wall')continue;
        const bx=b.x+b.w/2,by=b.y+b.h/2,dx=bx-cx,dy=by-cy,dist=Math.hypot(dx,dy);
        if(dist<rad){
          const k=1-dist/rad;
          b.hp-=56*k;
          b.vx+=(dx/(dist||0.2))*6.0*k;
          b.vy+=3.2*k;
          b.omega+=(Math.random()-0.5)*7*k;
          if(b.type==='tnt'&&b.hp<=0)explodeTNT(b);
          else if(b.hp<=0)destroyBlock(b);
        }
      }
      for(const t of targets){
        if(t.dead)continue;
        const dx=t.x-cx,dy=t.y-cy,dist=Math.hypot(dx,dy);
        if(dist<rad*1.08){
          defeatTarget(t,'BLASTED!');
        }
      }
      updateHud();
    }

    function destroyBlock(b){
      if(b.dead)return;
      if(b.type==='tnt'){explodeTNT(b);return;}
      b.dead=true;
      const mat=MAT[b.type];
      score+=mat.score;
      const cx=b.x+b.w/2,cy=b.y+b.h/2;
      spawnParticles(cx,cy,mat.stroke,14,3.8);
      addPopup(cx,cy+0.2,mat.label+' +'+mat.score,mat.stroke);
      for(const other of blocks){
        if(other.dead||other.type!=='tnt')continue;
        const ox=other.x+other.w/2,oy=other.y+other.h/2;
        if(Math.hypot(ox-cx,oy-cy)<Math.max(b.w,b.h)*0.75+0.45){
          explodeTNT(other);
        }
      }
      for(const t of targets){
        if(t.dead)continue;
        if(Math.abs(t.x-cx)<b.w*0.75+0.45&&t.y<=b.y+b.h+0.6){
          t.hp-=mat.mass*4.5;
          if(t.hp<=0)defeatTarget(t,'CRUSHED!');
        }
      }
      updateHud();
    }

    function launchShot(){
      if(levelCleared&&currentLevel>0){
        loadLevel(currentLevel,false);
      }
      const s=calc();
      if(trail.length>1)ghostTrail=trail.slice();
      trail=[{x:s.x0,y:s.h0}];
      const rBall=0.14+0.0045*s.m;
      proj={
        x:s.x0,y:s.h0,
        vx:s.vx,vy:s.vy,
        r:rBall,m:s.m,
        angle:0,omega:-6,
        bounces:0,hitWall:false,hitStoneLight:false,
        settleTimer:0,active:true
      };
      throwAnim=1;
      shots++;
      bannerNote='';
      updateHud();
    }

    function checkSupport(b){
      if(b.y<=0.01){b.y=0;return true;}
      const left=b.x+b.w*0.08,right=b.x+b.w*0.92,mid=b.x+b.w*0.5;
      let hasLeft=false,hasRight=false,snapY=null;
      for(const other of blocks){
        if(other===b||other.dead)continue;
        const top=other.y+other.h;
        if(Math.abs(b.y-top)<0.11&&right>other.x&&left<other.x+other.w){
          snapY=top;
          if(other.x<mid)hasLeft=true;
          if(other.x+other.w>mid)hasRight=true;
        }
      }
      if(snapY===null)return false;
      if(b.w>b.h*1.6&&(!hasLeft||!hasRight)){
        b.omega+=(hasLeft?-2.5:2.5)*0.04;
        b.hp-=0.35;
        if(b.hp<=0)destroyBlock(b);
        return false;
      }
      b.y=snapY;
      return true;
    }

    function checkTargetSupport(t){
      if(t.y-t.r<=0.01){t.y=t.r;return true;}
      for(const b of blocks){
        if(b.dead)continue;
        const top=b.y+b.h;
        if(Math.abs((t.y-t.r)-top)<0.09&&t.x+t.r*0.6>b.x&&t.x-t.r*0.6<b.x+b.w){
          t.y=top+t.r;
          return true;
        }
      }
      return false;
    }

    function stepPhysics(dt){
      if(shakeTime>0)shakeTime=Math.max(0,shakeTime-dt);
      if(throwAnim>0)throwAnim=Math.max(0,throwAnim-dt*4.5);

      const substeps=4,sdt=dt/substeps;
      for(let step=0;step<substeps;step++){
        if(proj&&proj.active){
          proj.vy-=G*sdt;
          proj.x+=proj.vx*sdt;
          proj.y+=proj.vy*sdt;
          proj.angle+=proj.omega*sdt;

          if(step===0&&proj.bounces===0&&proj.y>=0){
            trail.push({x:proj.x,y:proj.y});
          }

          if(proj.y-proj.r<=0){
            proj.y=proj.r;
            if(proj.bounces===0){
              const landX=Math.max(0,proj.x);
              bestRange=Math.max(bestRange,landX);
              updateHud();
            }
            proj.bounces++;
            proj.vy=Math.abs(proj.vy)*0.38;
            proj.vx*=0.68;
            proj.omega=-proj.vx/proj.r;
            if(proj.vy<0.9)proj.vy=0;
          }

          for(const b of blocks){
            if(b.dead)continue;
            const cx=Math.max(b.x,Math.min(proj.x,b.x+b.w));
            const cy=Math.max(b.y,Math.min(proj.y,b.y+b.h));
            const dx=proj.x-cx,dy=proj.y-cy,d2=dx*dx+dy*dy;
            if(d2<proj.r*proj.r){
              const dist=Math.sqrt(d2)||0.001,nx=dx/dist,ny=dy/dist;
              const speed=Math.hypot(proj.vx-b.vx,proj.vy-b.vy);
              if(b.type==='wall'){
                proj.x+=nx*(proj.r-dist+0.01);
                proj.y+=ny*(proj.r-dist+0.01);
                const dot=proj.vx*nx+proj.vy*ny;
                if(dot<0){
                  proj.vx=(proj.vx-2*dot*nx)*0.52;
                  proj.vy=(proj.vy-2*dot*ny)*0.52;
                }
                proj.bounces++;
                if(!proj.hitWall){
                  proj.hitWall=true;
                  spawnParticles(cx,cy,'#94a3b8',10,2.8);
                  addPopup(cx,cy+0.25,'BLOCKED!','#cbd5e1');
                  if(currentLevel===2)bannerNote='<strong>Coach tip:</strong> Blocked by the Shield Wall! Raise <strong>Release angle (58°–66°)</strong> and increase <strong>Pull-back</strong> to lob over it.';
                  else if(currentLevel===4)bannerNote='<strong>Coach tip:</strong> Hit the overhead bridge! Lower <strong>Release angle (20°–25°)</strong> to shoot flat underneath.';
                }
              }else if(b.type==='tnt'){
                explodeTNT(b);
                proj.vx*=0.65;
              }else{
                const massFactor=Math.sqrt(proj.m/5)*(proj.m>=11?1.45:1.0);
                let dmg=speed*1.85*massFactor;
                if(b.type==='stone'&&proj.m<9){
                  dmg*=0.25;
                  if(!proj.hitStoneLight){
                    proj.hitStoneLight=true;
                    addPopup(cx,cy+0.3,'CLANG! Needs heavier Mass (12g+)','#fda4af');
                    bannerNote='<strong>Coach tip:</strong> A '+proj.m+' g ball lacks momentum (<code>p = mv</code>) against thick stone! Increase <strong>Projectile mass (12–20 g)</strong> and boost <strong>Arm length &amp; Pull-back</strong>.';
                  }
                }
                b.hp-=dmg;
                b.vx+=proj.vx*0.28*massFactor;
                b.vy+=Math.max(0,proj.vy*0.18);
                b.omega+=(proj.y-(b.y+b.h/2))*proj.vx*0.35;
                spawnParticles(cx,cy,MAT[b.type].stroke,6,2.4);
                if(b.hp<=0){
                  destroyBlock(b);
                  proj.vx*=0.72;
                  proj.vy*=0.75;
                }else{
                  proj.x+=nx*(proj.r-dist+0.01);
                  proj.y+=ny*(proj.r-dist+0.01);
                  proj.vx*=-0.35;
                  proj.vy*=0.45;
                  proj.bounces++;
                }
              }
            }
          }

          for(const t of targets){
            if(t.dead)continue;
            const dx=proj.x-t.x,dy=proj.y-t.y,dist=Math.hypot(dx,dy);
            if(dist<proj.r+t.r){
              const speed=Math.hypot(proj.vx,proj.vy);
              const hitDmg=speed*1.9*Math.sqrt(proj.m/5);
              t.hp-=hitDmg;
              t.vx+=proj.vx*0.45;
              t.vy+=Math.max(1.2,proj.vy*0.35);
              proj.vx*=0.65;
              proj.vy*=0.65;
              if(t.hp<=0||speed>2.2){
                defeatTarget(t,'DIRECT HIT!');
              }else{
                addPopup(t.x,t.y+0.3,'BONK!','#fde68a');
              }
            }
          }

          proj.settleTimer+=sdt;
          if((Math.hypot(proj.vx,proj.vy)<0.22&&proj.y<=proj.r+0.05)||proj.x>12.5||proj.x<-1.5||proj.settleTimer>4.2){
            proj.active=false;
          }
        }

        for(const b of blocks){
          if(b.dead||b.type==='wall')continue;
          const supported=checkSupport(b);
          if(!supported||Math.abs(b.vx)>0.05||Math.abs(b.vy)>0.05){
            if(!supported)b.vy-=G*sdt;
            b.x+=b.vx*sdt;
            b.y+=b.vy*sdt;
            b.angle=Math.max(-0.55,Math.min(0.55,b.angle+b.omega*sdt));
            b.vx*=0.96;
            b.omega*=0.95;

            if(b.y<=0){
              const impactV=Math.abs(b.vy);
              b.y=0;b.vy=0;b.vx*=0.7;b.angle*=0.6;
              if(impactV>1.5){
                b.hp-=impactV*MAT[b.type].mass*2.2;
                if(b.hp<=0)destroyBlock(b);
              }
            }

            for(const other of blocks){
              if(other===b||other.dead)continue;
              if(b.x<other.x+other.w&&b.x+b.w>other.x&&b.y<other.y+other.h&&b.y+b.h>other.y){
                if(b.vy<0&&b.y>=other.y+other.h-0.22){
                  const impactV=Math.abs(b.vy);
                  b.y=other.y+other.h;
                  b.vy=0;b.vx*=0.75;
                  if(impactV>1.3){
                    other.hp-=impactV*MAT[b.type].mass*2.5;
                    if(other.type==='tnt'&&other.hp<=0)explodeTNT(other);
                    else if(other.hp<=0)destroyBlock(other);
                  }
                }else if(Math.abs(b.vx)>0.3){
                  other.vx+=b.vx*0.45;
                  other.hp-=Math.abs(b.vx)*MAT[b.type].mass*1.3;
                  b.vx*=0.4;
                  if(other.type==='tnt'&&other.hp<=0)explodeTNT(other);
                  else if(other.hp<=0)destroyBlock(other);
                }
              }
            }

            for(const t of targets){
              if(t.dead)continue;
              const cx=Math.max(b.x,Math.min(t.x,b.x+b.w));
              const cy=Math.max(b.y,Math.min(t.y,b.y+b.h));
              if(Math.hypot(t.x-cx,t.y-cy)<t.r+0.05){
                const bSpeed=Math.hypot(b.vx,b.vy)+Math.abs(b.omega)*0.5;
                if(bSpeed>0.5||b.y>t.y-0.05){
                  t.hp-=(bSpeed+2.4)*MAT[b.type].mass*2.8;
                  t.vx+=b.vx*0.6;
                  if(t.hp<=0)defeatTarget(t,'CRUSHED!');
                }
              }
            }
          }else{
            b.angle*=0.85;
          }
        }

        for(const t of targets){
          if(t.dead)continue;
          const sup=checkTargetSupport(t);
          if(!sup||Math.abs(t.vx)>0.04||Math.abs(t.vy)>0.04){
            if(!sup)t.vy-=G*sdt;
            t.x+=t.vx*sdt;
            t.y+=t.vy*sdt;
            t.angle+=t.vx*sdt*2.2;
            t.vx*=0.97;
            if(t.y-t.r<=0){
              const impactV=Math.abs(t.vy);
              t.y=t.r;t.vy=0;t.vx*=0.75;
              if(impactV>1.35){
                defeatTarget(t,'FALL KO!');
              }
            }
          }
        }
      }

      for(let i=particles.length-1;i>=0;i--){
        const p=particles[i];
        p.vy-=G*0.6*dt;
        p.x+=p.vx*dt;
        p.y+=p.vy*dt;
        p.rot+=p.vrot*dt;
        p.life-=dt;
        if(p.life<=0)particles.splice(i,1);
      }
      for(let i=popups.length-1;i>=0;i--){
        const pop=popups[i];
        pop.y+=0.55*dt;
        pop.life-=dt;
        if(pop.life<=0)popups.splice(i,1);
      }
      for(let i=shockwaves.length-1;i>=0;i--){
        const sw=shockwaves[i];
        sw.life-=dt;
        sw.r=sw.maxR*(1-sw.life/sw.maxLife);
        if(sw.life<=0)shockwaves.splice(i,1);
      }

      if(currentLevel>0&&!levelCleared&&targets.length>0&&targets.every(t=>t.dead)){
        levelCleared=true;
        const st=shots<=1?3:shots===2?2:1;
        starsEarned[currentLevel]=Math.max(starsEarned[currentLevel]||0,st);
        const bonus=Math.max(0,(4-shots)*300);
        score+=bonus;
        bestScores[currentLevel]=Math.max(bestScores[currentLevel]||0,score);
        bannerNote='<strong>🎉 '+LEVELS[currentLevel].name+' Cleared! '+starString(st)+'</strong> Knocked out all targets in '+shots+(shots===1?' shot':' shots')+'! Click <strong>Next level →</strong> or launch again.';
        updateHud();
      }else if(proj&&!proj.active&&shots>0&&!levelCleared){
        updateHud();
      }
    }

    function drawBlock(b,originX,ground,scale){
      const px=originX+b.x*scale,py=ground-(b.y+b.h)*scale,pw=b.w*scale,ph=b.h*scale;
      const mat=MAT[b.type];
      ctx.save();
      ctx.translate(px+pw/2,py+ph/2);
      ctx.rotate(-b.angle);
      ctx.fillStyle=mat.fill;
      ctx.strokeStyle=mat.stroke;
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.roundRect(-pw/2,-ph/2,pw,ph,b.type==='wall'?3:4);
      ctx.fill();
      ctx.stroke();

      if(b.type==='wood'){
        ctx.strokeStyle='#fde68a44';
        ctx.lineWidth=1.2;
        ctx.beginPath();
        if(pw>ph){
          ctx.moveTo(-pw*0.4,-ph*0.15);ctx.lineTo(pw*0.4,-ph*0.15);
          ctx.moveTo(-pw*0.35,ph*0.2);ctx.lineTo(pw*0.35,ph*0.2);
        }else{
          ctx.moveTo(-pw*0.15,-ph*0.4);ctx.lineTo(-pw*0.15,ph*0.4);
          ctx.moveTo(pw*0.2,-ph*0.35);ctx.lineTo(pw*0.2,ph*0.35);
        }
        ctx.stroke();
      }else if(b.type==='stone'||b.type==='wall'){
        ctx.fillStyle='#ffffff14';
        ctx.fillRect(-pw/2+2,-ph/2+2,pw-4,Math.min(5,ph*0.22));
        if(b.type==='wall'){
          ctx.strokeStyle='#0f172a88';
          ctx.lineWidth=1.5;
          for(let yy=-ph/2+14;yy<ph/2-4;yy+=14){
            ctx.beginPath();ctx.moveTo(-pw/2,yy);ctx.lineTo(pw/2,yy);ctx.stroke();
          }
        }
      }else if(b.type==='glass'){
        ctx.strokeStyle='#ffffff88';
        ctx.lineWidth=1.5;
        ctx.beginPath();
        ctx.moveTo(-pw*0.3,-ph*0.35);ctx.lineTo(pw*0.25,ph*0.35);
        ctx.stroke();
      }else if(b.type==='tnt'){
        ctx.strokeStyle='#fde047';
        ctx.lineWidth=2;
        ctx.strokeRect(-pw*0.38,-ph*0.38,pw*0.76,ph*0.76);
        ctx.fillStyle='#fef08a';
        ctx.font='900 '+Math.max(9,Math.floor(pw*0.34))+'px "JetBrains Mono",monospace';
        ctx.textAlign='center';
        ctx.fillText('TNT',0,4);
      }

      if(b.hp<b.maxHp*0.75&&b.type!=='wall'){
        ctx.strokeStyle=mat.crack;
        ctx.lineWidth=1.6;
        ctx.beginPath();
        ctx.moveTo(-pw*0.25,-ph*0.2);
        ctx.lineTo(0,0);
        ctx.lineTo(pw*0.2,-ph*0.1);
        if(b.hp<b.maxHp*0.45){
          ctx.moveTo(0,0);ctx.lineTo(-pw*0.15,ph*0.28);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawTarget(t,originX,ground,scale,now){
      const px=originX+t.x*scale,py=ground-t.y*scale,pr=t.r*scale;
      ctx.save();
      ctx.translate(px,py);
      ctx.rotate(-t.angle);

      ctx.fillStyle='#0006';
      ctx.beginPath();
      ctx.ellipse(0,pr*0.92,pr*0.8,pr*0.22,0,0,Math.PI*2);
      ctx.fill();

      ctx.fillStyle='#22c55e';
      ctx.strokeStyle='#14532d';
      ctx.lineWidth=2.5;
      ctx.beginPath();
      ctx.arc(-pr*0.68,-pr*0.68,pr*0.24,0,Math.PI*2);
      ctx.arc(pr*0.68,-pr*0.68,pr*0.24,0,Math.PI*2);
      ctx.fill();ctx.stroke();

      const grad=ctx.createRadialGradient(-pr*0.25,-pr*0.3,pr*0.1,0,0,pr);
      grad.addColorStop(0,'#86efac');
      grad.addColorStop(0.55,'#22c55e');
      grad.addColorStop(1,'#15803d');
      ctx.fillStyle=grad;
      ctx.beginPath();
      ctx.arc(0,0,pr,0,Math.PI*2);
      ctx.fill();
      ctx.stroke();

      if(t.helmet){
        ctx.fillStyle='#64748b';
        ctx.strokeStyle='#e2e8f0';
        ctx.lineWidth=2;
        ctx.beginPath();
        ctx.arc(0,-pr*0.12,pr*1.03,Math.PI*1.05,Math.PI*1.95);
        ctx.closePath();
        ctx.fill();ctx.stroke();
      }
      if(t.crown){
        ctx.fillStyle='#fbbf24';
        ctx.strokeStyle='#fef08a';
        ctx.lineWidth=1.8;
        ctx.beginPath();
        ctx.moveTo(-pr*0.65,-pr*0.78);
        ctx.lineTo(-pr*0.45,-pr*1.35);
        ctx.lineTo(-pr*0.15,-pr*0.98);
        ctx.lineTo(0,-pr*1.45);
        ctx.lineTo(pr*0.15,-pr*0.98);
        ctx.lineTo(pr*0.45,-pr*1.35);
        ctx.lineTo(pr*0.65,-pr*0.78);
        ctx.closePath();
        ctx.fill();ctx.stroke();
      }

      const lookX=proj&&proj.active?Math.max(-2,Math.min(2,(proj.x-t.x)*0.8)):-1.2;
      const lookY=proj&&proj.active?Math.max(-2,Math.min(2,(t.y-proj.y)*0.8)):0;
      ctx.fillStyle='#ffffff';
      ctx.beginPath();
      ctx.arc(-pr*0.38,-pr*0.12,pr*0.22,0,Math.PI*2);
      ctx.arc(pr*0.38,-pr*0.12,pr*0.22,0,Math.PI*2);
      ctx.fill();
      ctx.fillStyle='#090d16';
      ctx.beginPath();
      ctx.arc(-pr*0.38+lookX,-pr*0.12+lookY,pr*0.10,0,Math.PI*2);
      ctx.arc(pr*0.38+lookX,-pr*0.12+lookY,pr*0.10,0,Math.PI*2);
      ctx.fill();

      ctx.fillStyle='#bef264';
      ctx.strokeStyle='#14532d';
      ctx.lineWidth=1.8;
      ctx.beginPath();
      ctx.ellipse(0,pr*0.18,pr*0.34,pr*0.24,0,0,Math.PI*2);
      ctx.fill();ctx.stroke();
      ctx.fillStyle='#14532d';
      ctx.beginPath();
      ctx.arc(-pr*0.12,pr*0.18,pr*0.06,0,Math.PI*2);
      ctx.arc(pr*0.12,pr*0.18,pr*0.06,0,Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    function drawProjectile(px,py,rPx,m,ang){
      ctx.save();
      ctx.translate(px,py);
      ctx.rotate(-ang);
      const isHeavy=m>=11,isLight=m<=4;
      const c1=isHeavy?'#cbd5e1':isLight?'#67e8f9':'#fde68a';
      const c2=isHeavy?'#334155':isLight?'#0284c7':'#ef4444';
      ctx.shadowColor=isHeavy?'#94a3b8':isLight?'#38bdf8':'#fbbf24';
      ctx.shadowBlur=16;
      const g=ctx.createRadialGradient(-rPx*0.28,-rPx*0.28,rPx*0.1,0,0,rPx);
      g.addColorStop(0,'#ffffff');
      g.addColorStop(0.3,c1);
      g.addColorStop(1,c2);
      ctx.fillStyle=g;
      ctx.strokeStyle='#ffffffaa';
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.arc(0,0,rPx,0,Math.PI*2);
      ctx.fill();ctx.stroke();
      ctx.shadowBlur=0;

      ctx.fillStyle='#090d16';
      ctx.beginPath();
      ctx.moveTo(-rPx*0.45,-rPx*0.28);ctx.lineTo(-rPx*0.05,-rPx*0.12);
      ctx.moveTo(rPx*0.45,-rPx*0.28);ctx.lineTo(rPx*0.05,-rPx*0.12);
      ctx.strokeStyle='#090d16';ctx.lineWidth=2.2;ctx.stroke();

      ctx.fillStyle='#fbbf24';
      ctx.beginPath();
      ctx.moveTo(rPx*0.55,-rPx*0.08);
      ctx.lineTo(rPx*1.05,rPx*0.06);
      ctx.lineTo(rPx*0.55,rPx*0.22);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function getGeom(){
      const w=cv.clientWidth||1160,h=500,s=calc(),ground=410;
      const baseX=Math.max(88,w*0.115);
      const maxMeter=currentLevel===0?Math.max(10.2,s.r*1.12):10.0;
      const originX=baseX+52;
      const scale=Math.max(22,Math.min((w-originX-26)/maxMeter,78));
      const pivotX=originX+PIVOT_XM*scale,pivotY=ground-PIVOT_YM*scale;
      const armPx=s.armM*scale;
      const animOffset=throwAnim>0?(1-throwAnim)*0.42:0;
      const rest=-s.rad+animOffset,cs=Math.cos(rest),sn=Math.sin(rest);
      const tipX=pivotX+cs*armPx,tipY=pivotY+sn*armPx;
      const tailX=pivotX-cs*armPx*0.36,tailY=pivotY-sn*armPx*0.36;
      return{w,h,s,ground,baseX,originX,scale,pivotX,pivotY,armPx,rest,cs,sn,tipX,tipY,tailX,tailY,maxMeter};
    }

    function resize(){
      const d=Math.min(devicePixelRatio||1,2),w=cv.clientWidth||1160;
      cv.width=w*d;cv.height=500*d;
      ctx.setTransform(d,0,0,d,0,0);
    }

    function render(now=0){
      const dt=lastNow?Math.min(0.05,(now-lastNow)/1000):0.016;
      lastNow=now;
      stepPhysics(dt);

      const g=getGeom(),{w,h,s,ground,originX,scale,pivotX,pivotY,rest,cs,sn,tipX,tipY,tailX,tailY}=g;
      ctx.clearRect(0,0,w,h);
      ctx.save();
      if(shakeTime>0){
        ctx.translate((Math.random()-0.5)*7,(Math.random()-0.5)*7);
      }

      const sky=ctx.createLinearGradient(0,0,0,h);
      sky.addColorStop(0,'#061923');sky.addColorStop(0.72,'#123645');sky.addColorStop(0.721,'#183727');sky.addColorStop(1,'#08150f');
      ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);

      ctx.fillStyle='#0d2933';
      ctx.beginPath();
      ctx.moveTo(0,ground);
      ctx.quadraticCurveTo(w*0.22,ground-65,w*0.48,ground-28);
      ctx.quadraticCurveTo(w*0.76,ground-74,w,ground-22);
      ctx.lineTo(w,ground);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle='#ffffff12';ctx.lineWidth=1;
      const maxTick=Math.ceil((w-originX)/scale);
      for(let i=0;i<=maxTick;i++){
        const gx=originX+i*scale;
        ctx.beginPath();ctx.moveTo(gx,42);ctx.lineTo(gx,ground);ctx.stroke();
      }
      ctx.fillStyle='#1b3b28';ctx.fillRect(0,ground,w,h-ground);
      ctx.strokeStyle='#86a58e';ctx.lineWidth=4;
      ctx.beginPath();ctx.moveTo(0,ground);ctx.lineTo(w,ground);ctx.stroke();

      ctx.fillStyle='#d7f9e4';ctx.font='700 12px "JetBrains Mono",monospace';ctx.textAlign='center';
      for(let i=0;i<=maxTick;i++){
        const gx=originX+i*scale;
        ctx.fillText(i+' m',gx,ground+26);
        ctx.strokeStyle='#d7f9e488';ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(gx,ground-5);ctx.lineTo(gx,ground+7);ctx.stroke();
      }

      if(ghostTrail.length>1){
        ctx.save();
        ctx.setLineDash([4,6]);
        ctx.strokeStyle='#94a3b855';
        ctx.lineWidth=2.5;
        ctx.beginPath();
        ghostTrail.forEach((pt,i)=>{
          const xx=originX+pt.x*scale,yy=ground-pt.y*scale;
          i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);
        });
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      const previewSteps=currentLevel===0?36:18;
      for(let i=1;i<=previewSteps;i++){
        const tt=(s.t*i)/36;
        const xx=originX+(s.x0+s.vx*tt)*scale;
        const yy=ground-Math.max(0,s.h0+s.vy*tt-0.5*s.g*tt*tt)*scale;
        ctx.fillStyle=currentLevel===0?'#38bdf866':`rgba(56,189,248,${(1-i/22)*0.55})`;
        ctx.beginPath();
        ctx.arc(xx,yy,i%2===0?3.2:2.2,0,Math.PI*2);
        ctx.fill();
      }
      ctx.restore();

      if(trail.length>1){
        ctx.save();
        ctx.setLineDash([7,6]);
        ctx.strokeStyle='#38bdf8';
        ctx.lineWidth=3.5;
        ctx.beginPath();
        trail.forEach((pt,i)=>{
          const xx=originX+pt.x*scale,yy=ground-pt.y*scale;
          i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);
        });
        ctx.stroke();
        ctx.restore();
      }

      for(const b of blocks){
        if(!b.dead)drawBlock(b,originX,ground,scale);
      }
      for(const t of targets){
        if(!t.dead)drawTarget(t,originX,ground,scale,now);
      }

      for(const sw of shockwaves){
        ctx.save();
        ctx.strokeStyle=`rgba(251,191,36,${sw.life/sw.maxLife})`;
        ctx.lineWidth=5;
        ctx.beginPath();
        ctx.arc(originX+sw.x*scale,ground-sw.y*scale,sw.r*scale,0,Math.PI*2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle='#0007';ctx.beginPath();ctx.ellipse(pivotX,ground+8,68,11,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#94a3b8';ctx.lineWidth=8;ctx.lineCap='round';
      ctx.beginPath();
      ctx.moveTo(pivotX,pivotY);ctx.lineTo(pivotX-42,ground);
      ctx.moveTo(pivotX,pivotY);ctx.lineTo(pivotX+42,ground);
      ctx.moveTo(pivotX-48,ground);ctx.lineTo(pivotX+50,ground);
      ctx.stroke();
      ctx.strokeStyle='#475569';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(pivotX-30,ground-22);ctx.lineTo(pivotX+30,ground-22);ctx.stroke();

      ctx.strokeStyle='#fbbf24';ctx.lineWidth=3.5;
      ctx.beginPath();ctx.moveTo(tailX,tailY);ctx.lineTo(pivotX-38,ground-4);ctx.stroke();
      ctx.fillStyle='#b45309';ctx.strokeStyle='#fbbf24';ctx.lineWidth=2.5;
      ctx.beginPath();ctx.roundRect(tailX-18,tailY+6,36,30,5);ctx.fill();ctx.stroke();
      ctx.fillStyle='#fde68a';ctx.font='900 9px Inter,sans-serif';ctx.textAlign='center';
      ctx.fillText('POWER',tailX,tailY+24);

      ctx.save();
      ctx.shadowColor='#000b';ctx.shadowBlur=12;ctx.shadowOffsetY=6;ctx.lineCap='round';
      ctx.strokeStyle='#071014';ctx.lineWidth=18;
      ctx.beginPath();ctx.moveTo(tailX,tailY);ctx.lineTo(tipX,tipY);ctx.stroke();
      ctx.shadowColor='transparent';
      const beam=ctx.createLinearGradient(tailX,tailY,tipX,tipY);
      beam.addColorStop(0,'#a16207');beam.addColorStop(0.38,'#fbbf24');beam.addColorStop(1,'#4ade80');
      ctx.strokeStyle=beam;ctx.lineWidth=12;ctx.stroke();
      ctx.strokeStyle='#fff9';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(tailX+cs*4,tailY+sn*4-3);ctx.lineTo(tipX-cs*5,tipY-sn*5-3);ctx.stroke();
      ctx.restore();

      ctx.fillStyle='#f8fafc';ctx.strokeStyle='#c084fc';ctx.lineWidth=4.5;
      ctx.beginPath();ctx.arc(pivotX,pivotY,11,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='#7e22ce';ctx.beginPath();ctx.arc(pivotX,pivotY,4,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#4ade80';ctx.lineWidth=7;
      ctx.beginPath();ctx.arc(tipX,tipY,17,rest-0.25,rest+1.25);ctx.stroke();

      ctx.strokeStyle='#38bdf877';ctx.lineWidth=2;ctx.setLineDash([5,5]);
      ctx.beginPath();ctx.arc(pivotX,pivotY,44,-s.rad,0);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='#7dd3fc';ctx.font='800 11px "JetBrains Mono",monospace';
      ctx.fillText(s.A+'°',pivotX+54,pivotY-14);
      ctx.fillStyle='#e9d5ff';ctx.font='900 10px Inter,sans-serif';
      ctx.fillText('FULCRUM',pivotX,pivotY+28);

      if(dragState){
        ctx.save();
        ctx.strokeStyle='#fbbf24';ctx.lineWidth=3;ctx.setLineDash([4,4]);
        ctx.beginPath();ctx.moveTo(pivotX,pivotY);ctx.lineTo(dragState.x,dragState.y);ctx.stroke();
        ctx.restore();
      }

      const rPx=Math.max(10,(0.14+0.0045*s.m)*scale);
      if(proj&&proj.active){
        drawProjectile(originX+proj.x*scale,ground-proj.y*scale,rPx,proj.m,proj.angle);
      }else{
        drawProjectile(tipX,tipY,rPx,s.m,0);
      }

      for(const p of particles){
        ctx.save();
        ctx.translate(originX+p.x*scale,ground-p.y*scale);
        ctx.rotate(p.rot);
        ctx.fillStyle=p.color;
        ctx.globalAlpha=Math.max(0,Math.min(1,p.life*1.6));
        ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);
        ctx.restore();
      }

      for(const pop of popups){
        ctx.save();
        ctx.font='900 13px Inter,sans-serif';
        ctx.textAlign='center';
        ctx.globalAlpha=Math.max(0,Math.min(1,pop.life));
        const px=originX+pop.x*scale,py=ground-pop.y*scale;
        ctx.fillStyle='#050d10cc';
        const tw=ctx.measureText(pop.text).width+14;
        ctx.beginPath();ctx.roundRect(px-tw/2,py-14,tw,20,6);ctx.fill();
        ctx.fillStyle=pop.color;
        ctx.fillText(pop.text,px,py);
        ctx.restore();
      }

      ctx.fillStyle='#050d10cc';
      ctx.strokeStyle='#355159';
      ctx.lineWidth=1;
      ctx.beginPath();ctx.roundRect(14,12,268,26,8);ctx.fill();ctx.stroke();
      ctx.fillStyle='#b7d0c9';ctx.font='800 11px Inter,sans-serif';ctx.textAlign='left';
      ctx.fillText('💡 Drag catapult to aim & release, or use sliders',24,29);

      if(levelCleared&&currentLevel>0){
        const st=shots<=1?3:shots===2?2:1;
        const bw=310,bh=66,bx=w/2-bw/2,by=56;
        ctx.fillStyle='#071a14eb';
        ctx.strokeStyle='#4ade80';
        ctx.lineWidth=2;
        ctx.beginPath();ctx.roundRect(bx,by,bw,bh,12);ctx.fill();ctx.stroke();
        ctx.textAlign='center';
        ctx.fillStyle='#fbbf24';
        ctx.font='900 18px "JetBrains Mono",monospace';
        ctx.fillText(starString(st)+'  LEVEL CLEARED!',w/2,by+27);
        ctx.fillStyle='#d7f9e4';
        ctx.font='700 12px Inter,sans-serif';
        ctx.fillText('Score: '+score+' pts · Click "Next level →" above',w/2,by+49);
      }

      ctx.restore();
      if(window.SimKit&&SimKit.frame)SimKit.frame(cv,render);
      else requestAnimationFrame(render);
    }

    function canvasPos(e){
      const rect=cv.getBoundingClientRect();
      return{x:e.clientX-rect.left,y:e.clientY-rect.top};
    }

    cv.addEventListener('pointerdown',e=>{
      const pt=canvasPos(e),g=getGeom();
      if(Math.hypot(pt.x-g.tipX,pt.y-g.tipY)<85||Math.hypot(pt.x-g.pivotX,pt.y-g.pivotY)<95){
        dragState=pt;
        cv.setPointerCapture(e.pointerId);
      }
    });
    cv.addEventListener('pointermove',e=>{
      if(!dragState)return;
      const pt=canvasPos(e),g=getGeom();
      dragState=pt;
      const dx=g.pivotX-pt.x,dy=pt.y-g.pivotY;
      const angDeg=Math.round(Math.max(20,Math.min(70,Math.atan2(Math.max(10,dy),Math.max(10,dx))*180/Math.PI)));
      const pullPct=Math.round(Math.max(20,Math.min(100,Math.hypot(dx,dy)*1.05)));
      angle.value=angDeg;
      pull.value=pullPct;
      proj=null;
      updateReadouts();
    });
    cv.addEventListener('pointerup',e=>{
      if(!dragState)return;
      dragState=null;
      launchShot();
    });

    [arm,angle,pull,mass].forEach(x=>x.addEventListener('input',()=>{
      updateReadouts();
      if(proj&&!proj.active)proj=null;
    }));
    levelBtns.forEach(btn=>btn.addEventListener('click',()=>loadLevel(+btn.dataset.level,true)));
    q('#launch').onclick=()=>launchShot();
    q('#rebuildLevel').onclick=()=>loadLevel(currentLevel,false);
    q('#nextLevel').onclick=()=>{
      const next=currentLevel>=5?0:currentLevel+1;
      loadLevel(next,true);
    };
    q('#launchReset').onclick=()=>{
      arm.value=40;angle.value=45;pull.value=60;mass.value=5;
      bestRange=0;q('#bestRead').textContent='—';
      loadLevel(currentLevel,false);
    };
    new ResizeObserver(resize).observe(cv);
    resize();
    loadLevel(1,true);
    render();
  })();
