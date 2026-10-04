
/* ── Utilities ── */
function rand(a, b) { return Math.random() * (b - a) + a; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }

/* ═══════════════════════════════════════════════════════════
   SIM 1 · MOLECULE ANATOMY VIEWER
═══════════════════════════════════════════════════════════ */
(function () {
  const cv  = document.getElementById('cvMolecule');
  const ctx = cv.getContext('2d');
  let mode  = 'stick';

  let surface;
  function resize() { draw(); }

  function draw() {
    const W = surface.width, H = surface.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#02080f'; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.025)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 26) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 26) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    ctx.restore();

    const cx = W * 0.5, cy = H * 0.44;
    const sc = Math.min(W, H) / 480;
    const L  = (mode === 'stick' ? 145 : mode === 'spacefill' ? 85 : 100) * sc;
    const angle = Number(document.getElementById('molAngle').value);
    const phi = angle / 2 * Math.PI / 180;
    document.getElementById('molEvidence').textContent = `${angle.toFixed(1)}° · relative net dipole: ${(Math.cos(phi)/Math.cos(52.25*Math.PI/180)*100).toFixed(0)}% of the bent model. ${angle === 180 ? 'Equal bond dipoles cancel.' : 'The bond dipoles combine toward oxygen.'}`;

    const h1x = cx + L * Math.sin(phi), h1y = cy + L * Math.cos(phi);
    const h2x = cx - L * Math.sin(phi), h2y = cy + L * Math.cos(phi);

    const lpD = L * 0.6, lpA = 38 * Math.PI / 180;
    const lp1x = cx - lpD * Math.sin(lpA), lp1y = cy - lpD * Math.cos(lpA);
    const lp2x = cx + lpD * Math.sin(lpA), lp2y = cy - lpD * Math.cos(lpA);

    if (mode === 'stick')     drawStick(W, H, cx, cy, L, phi, h1x, h1y, h2x, h2y, lp1x, lp1y, lp2x, lp2y, sc);
    else if (mode === 'density')   drawDensity(W, H, cx, cy, L, h1x, h1y, h2x, h2y, sc);
    else                      drawSpaceFill(W, H, cx, cy, L, h1x, h1y, h2x, h2y, sc);
  }

  function drawStick(W, H, cx, cy, L, phi, h1x, h1y, h2x, h2y, lp1x, lp1y, lp2x, lp2y, sc) {
    /* Bonds */
    ctx.save();
    ctx.lineWidth = 5 * sc; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(160,200,240,0.72)';
    ctx.beginPath();
    ctx.moveTo(cx,cy); ctx.lineTo(h1x,h1y);
    ctx.moveTo(cx,cy); ctx.lineTo(h2x,h2y);
    ctx.stroke(); ctx.restore();

    /* Lone pair dashes */
    ctx.save();
    ctx.setLineDash([4*sc, 6*sc]); ctx.lineWidth = 2*sc;
    ctx.strokeStyle = 'rgba(79,220,154,0.52)';
    ctx.beginPath();
    ctx.moveTo(cx,cy); ctx.lineTo(lp1x,lp1y);
    ctx.moveTo(cx,cy); ctx.lineTo(lp2x,lp2y);
    ctx.stroke(); ctx.setLineDash([]); ctx.restore();

    /* Bond angle arc */
    const arcR = L * 0.46;
    const ang1 = Math.atan2(h1y-cy, h1x-cx);
    const ang2 = Math.atan2(h2y-cy, h2x-cx);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, arcR, ang1, ang2, false);
    ctx.strokeStyle = 'rgba(246,195,91,0.80)'; ctx.lineWidth = 2*sc; ctx.stroke();
    ctx.font = `bold ${clamp(12*sc,9,15)}px "JetBrains Mono",monospace`;
    ctx.fillStyle = '#f6c35b'; ctx.textAlign = 'center';
    ctx.fillText((phi*360/Math.PI).toFixed(1)+'°', cx, cy + arcR + 18*sc);
    ctx.restore();

    /* Lone pair dots */
    ctx.save();
    const lpR = 5*sc, lpOff = L*0.08;
    [[lp1x,lp1y],[lp2x,lp2y]].forEach(([lx,ly]) => {
      [-lpOff,lpOff].forEach(d => {
        ctx.beginPath(); ctx.arc(lx+d, ly, lpR, 0, Math.PI*2);
        ctx.fillStyle = '#4fdc9a'; ctx.fill();
      });
    });
    ctx.font = `${clamp(10*sc,8,12)}px Inter,sans-serif`;
    ctx.fillStyle = 'rgba(79,220,154,0.68)'; ctx.textAlign = 'center';
    ctx.fillText('lone pairs', cx, cy - L*0.6 - 14*sc);
    ctx.restore();

    /* Oxygen */
    const oR = L*0.27;
    ctx.save();
    const og = ctx.createRadialGradient(cx-oR*0.3,cy-oR*0.3,oR*0.08,cx,cy,oR);
    og.addColorStop(0,'#ff7070'); og.addColorStop(1,'#7a0000');
    ctx.beginPath(); ctx.arc(cx,cy,oR,0,Math.PI*2);
    ctx.fillStyle=og; ctx.fill();
    ctx.strokeStyle='rgba(255,160,160,0.28)'; ctx.lineWidth=1.5*sc; ctx.stroke();
    ctx.font=`bold ${clamp(15*sc,12,20)}px Inter,sans-serif`;
    ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('O',cx,cy); ctx.restore();

    /* Hydrogens */
    const hR = L*0.14;
    [[h1x,h1y,1],[h2x,h2y,-1]].forEach(([hx,hy,side]) => {
      ctx.save();
      const hg = ctx.createRadialGradient(hx-hR*0.3,hy-hR*0.3,hR*0.08,hx,hy,hR);
      hg.addColorStop(0,'#fff'); hg.addColorStop(1,'#8ab8d8');
      ctx.beginPath(); ctx.arc(hx,hy,hR,0,Math.PI*2);
      ctx.fillStyle=hg; ctx.fill();
      ctx.strokeStyle='rgba(180,220,255,0.28)'; ctx.lineWidth=1.5*sc; ctx.stroke();
      ctx.font=`bold ${clamp(10*sc,8,13)}px Inter,sans-serif`;
      ctx.fillStyle='#334'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('H',hx,hy); ctx.restore();
      /* δ⁺ */
      ctx.save();
      ctx.font=`bold ${clamp(12*sc,10,15)}px Inter,sans-serif`;
      ctx.fillStyle='#ff9f7f'; ctx.textAlign=side>0?'left':'right'; ctx.textBaseline='middle';
      ctx.fillText('δ⁺', hx+side*(hR+7*sc), hy); ctx.restore();
    });

    /* δ⁻ */
    ctx.save();
    ctx.font=`bold ${clamp(13*sc,10,16)}px Inter,sans-serif`;
    ctx.fillStyle='#5ac8ee'; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText('δ⁻', cx+oR+6*sc, cy); ctx.restore();

    /* Bond length label */
    const mbx=(cx+h1x)/2, mby=(cy+h1y)/2;
    const ba=Math.atan2(h1y-cy,h1x-cx);
    ctx.save(); ctx.translate(mbx,mby); ctx.rotate(ba-Math.PI/2);
    ctx.font=`${clamp(9*sc,7,11)}px "JetBrains Mono",monospace`;
    ctx.fillStyle='rgba(200,228,248,0.38)'; ctx.textAlign='center';
    ctx.fillText('0.96 Å',0,-9*sc); ctx.restore();

    /* Net dipole arrow */
    const hhMx=(h1x+h2x)/2, hhMy=(h1y+h2y)/2;
    const ddx=cx-hhMx, ddy=cy-hhMy, ddl=Math.hypot(ddx,ddy);
    const al=ddl*0.5, ax2=hhMx, ay2=hhMy-ddl*0.5;
    ctx.save();
    ctx.strokeStyle='#b09fff'; ctx.lineWidth=2.5*sc; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(hhMx,hhMy); ctx.lineTo(ax2,ay2); ctx.stroke();
    const ha=Math.atan2(ddy,ddx), hl=ddl<0.01?0:9*sc;
    ctx.fillStyle='#b09fff'; ctx.beginPath();
    ctx.moveTo(ax2,ay2);
    ctx.lineTo(ax2-hl*Math.cos(ha-0.4),ay2-hl*Math.sin(ha-0.4));
    ctx.lineTo(ax2-hl*Math.cos(ha+0.4),ay2-hl*Math.sin(ha+0.4));
    ctx.closePath(); ctx.fill();
    ctx.font=`${clamp(10*sc,8,12)}px Inter,sans-serif`;
    ctx.fillStyle='#c4b8ff'; ctx.textAlign='center';
    ctx.fillText('net dipole',hhMx,hhMy+16*sc); ctx.restore();
  }

  function drawDensity(W, H, cx, cy, L, h1x, h1y, h2x, h2y, sc) {
    /* O electron cloud — blue (high density) */
    const oc=ctx.createRadialGradient(cx,cy,0,cx,cy,L*1.3);
    oc.addColorStop(0,'rgba(10,80,220,0.72)');
    oc.addColorStop(0.5,'rgba(30,100,255,0.28)');
    oc.addColorStop(1,'rgba(30,100,255,0)');
    ctx.beginPath(); ctx.arc(cx,cy,L*1.3,0,Math.PI*2);
    ctx.fillStyle=oc; ctx.fill();

    /* H clouds — orange (low density) */
    [h1x,h2x].forEach(hx => {
      const hy=h1y;
      const hc=ctx.createRadialGradient(hx,hy,0,hx,hy,L*0.65);
      hc.addColorStop(0,'rgba(255,170,50,0.58)');
      hc.addColorStop(0.5,'rgba(255,90,20,0.22)');
      hc.addColorStop(1,'rgba(255,90,20,0)');
      ctx.beginPath(); ctx.arc(hx,hy,L*0.65,0,Math.PI*2);
      ctx.fillStyle=hc; ctx.fill();
    });

    /* Atom outlines */
    ctx.save(); ctx.globalAlpha=0.22; ctx.strokeStyle='#fff'; ctx.lineWidth=2*sc;
    ctx.beginPath(); ctx.arc(cx,cy,L*0.25,0,Math.PI*2); ctx.stroke();
    [h1x,h2x].forEach(hx => { ctx.beginPath(); ctx.arc(hx,h1y,L*0.12,0,Math.PI*2); ctx.stroke(); });
    ctx.restore();

    /* Labels */
    ctx.save();
    ctx.textAlign='center';
    ctx.font=`bold ${clamp(13*sc,10,16)}px Inter,sans-serif`;
    ctx.fillStyle='#80bcff'; ctx.fillText('δ⁻  (high e⁻ density)',cx,cy-L*0.5);
    ctx.fillStyle='#ffaa60';
    ctx.fillText('δ⁺',h1x+L*0.3,h1y-5*sc);
    ctx.fillText('δ⁺',h2x-L*0.3,h2y-5*sc);

    /* Color legend */
    const lx=W-90*sc, ly=H-55*sc;
    const leg=ctx.createLinearGradient(lx,ly,lx+68*sc,ly);
    leg.addColorStop(0,'rgb(255,110,20)');
    leg.addColorStop(1,'rgb(10,70,220)');
    ctx.fillStyle=leg; ctx.fillRect(lx,ly,68*sc,9*sc);
    ctx.font=`${clamp(9*sc,7,11)}px Inter,sans-serif`;
    ctx.fillStyle='rgba(200,228,248,0.44)';
    ctx.textAlign='left'; ctx.fillText('δ⁺',lx,ly+22*sc);
    ctx.textAlign='right'; ctx.fillText('δ⁻',lx+68*sc,ly+22*sc);
    ctx.restore();
  }

  function drawSpaceFill(W, H, cx, cy, L, h1x, h1y, h2x, h2y, sc) {
    const ppa=L/0.96; /* px per angstrom */
    const oR=1.52*ppa, hR=1.20*ppa;

    /* Hydrogens first (partly behind O) */
    [h1x,h2x].forEach(hx => {
      const hy=h1y;
      const hg=ctx.createRadialGradient(hx-hR*0.3,hy-hR*0.3,hR*0.05,hx,hy,hR);
      hg.addColorStop(0,'#fff'); hg.addColorStop(0.6,'#c4dced'); hg.addColorStop(1,'#809ab4');
      ctx.beginPath(); ctx.arc(hx,hy,hR,0,Math.PI*2);
      ctx.fillStyle=hg; ctx.fill();
    });

    /* Oxygen */
    const og=ctx.createRadialGradient(cx-oR*0.28,cy-oR*0.28,oR*0.05,cx,cy,oR);
    og.addColorStop(0,'#ff5555'); og.addColorStop(0.7,'#cc0000'); og.addColorStop(1,'#800000');
    ctx.beginPath(); ctx.arc(cx,cy,oR,0,Math.PI*2);
    ctx.fillStyle=og; ctx.fill();

    /* Labels */
    ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font=`bold ${clamp(16*sc,12,22)}px Inter,sans-serif`;
    ctx.fillStyle='#fff'; ctx.fillText('O',cx,cy);
    ctx.font=`bold ${clamp(12*sc,9,16)}px Inter,sans-serif`;
    ctx.fillStyle='#445'; ctx.fillText('H',h1x,h1y); ctx.fillText('H',h2x,h2y);
    ctx.restore();

    ctx.save();
    ctx.font=`${clamp(9*sc,7,11)}px "JetBrains Mono",monospace`;
    ctx.fillStyle='rgba(200,228,248,0.38)'; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    ctx.fillText('CPK Model · O = 1.52 Å · H = 1.20 Å (van der Waals radii)',12*sc,H-12*sc);
    ctx.restore();
  }

  document.querySelectorAll('[data-mol-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.molMode;
      document.querySelectorAll('[data-mol-mode]').forEach(b => (b.classList.remove('active'), b.setAttribute('aria-pressed','false')));
      btn.classList.add('active'); btn.setAttribute('aria-pressed','true');
      draw();
    });
  });

  document.querySelectorAll('[data-mol-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.classList.contains('active'))));
  document.getElementById('molAngle').addEventListener('input',draw);
  document.getElementById('molReset').addEventListener('click',()=>{document.getElementById('molAngle').value=104.5;draw();});
  surface=SimKit.canvas2d(cv,{height:380});
  new ResizeObserver(draw).observe(cv.parentElement);
  draw();
})();


/* ═══════════════════════════════════════════════════════════
   SIM 2 · HYDROGEN BOND NETWORK
═══════════════════════════════════════════════════════════ */
(function () {
  const cv        = document.getElementById('cvHbond');
  const ctx       = cv.getContext('2d');
  const tempSl    = document.getElementById('hbondTemp');
  const tempValEl = document.getElementById('hbondTempVal');
  const countEl   = document.getElementById('hbondCount');
  const speedEl   = document.getElementById('hbondSpeed');
  const stateEl   = document.getElementById('hbondState');

  document.getElementById('hbondFreezeBtn').addEventListener('click', () => { tempSl.value = 2; });
  document.getElementById('hbondBoilBtn').addEventListener('click',   () => { tempSl.value = 100; });

  const N      = 20;
  const L_VIS  = 14;
  const PHI    = 52.25 * Math.PI / 180;
  const OR     = 7, HR = 4;
  const HBDIST = 30;
  const REPSIG = 32;

  let mols = [];

  function initMols(W, H) {
    mols = [];
    const cols = Math.ceil(Math.sqrt(N)), rows = Math.ceil(N / cols);
    const pX = W*0.1, pY = H*0.1;
    const cW = (W-pX*2)/cols, cH = (H-pY*2)/rows;
    let idx = 0;
    for (let r = 0; r < rows && idx < N; r++) {
      for (let c = 0; c < cols && idx < N; c++, idx++) {
        mols.push({
          x: pX+c*cW+cW/2+rand(-cW*0.18,cW*0.18),
          y: pY+r*cH+cH/2+rand(-cH*0.18,cH*0.18),
          vx: rand(-0.4,0.4), vy: rand(-0.4,0.4),
          angle: rand(0,Math.PI*2), omega: rand(-0.02,0.02),
        });
      }
    }
  }

  function getH(m, i) {
    const a = m.angle + (i===0 ? PHI : -PHI);
    return { x: m.x + L_VIS * Math.sin(a), y: m.y + L_VIS * Math.cos(a) };
  }

  const surface = SimKit.canvas2d(cv,{height:400});
  function resize() { initMols(surface.width, surface.height); }

  let rafId;
  function tick() {
    const W = surface.width, H = surface.height;
    const T = Number(tempSl.value);
    tempValEl.textContent = T + ' °C';

    const tgtSpd   = 0.25 + T * 0.030;
    const noiseAmt = T * 0.0009;

    mols.forEach(m => {
      m.vx += rand(-noiseAmt, noiseAmt);
      m.vy += rand(-noiseAmt, noiseAmt);
      m.omega += rand(-noiseAmt*0.4, noiseAmt*0.4);

      /* O-O soft repulsion */
      mols.forEach(o => {
        if (o===m) return;
        const dx=m.x-o.x, dy=m.y-o.y, r=Math.hypot(dx,dy);
        if (r<REPSIG && r>0.5) { const f=0.14*(REPSIG-r)/r; m.vx+=dx*f; m.vy+=dy*f; }
      });

      /* H-bond alignment torque at low T */
      if (T<70) {
        mols.forEach(o => {
          if (o===m) return;
          [0,1].forEach(hi => {
            const h=getH(m,hi);
            const dx=o.x-h.x, dy=o.y-h.y, r=Math.hypot(dx,dy);
            if (r<HBDIST*1.6 && r>0.5) {
              const tAng=Math.atan2(dx,dy)-(hi===0?PHI:-PHI);
              let da=tAng-m.angle;
              while(da>Math.PI)da-=Math.PI*2; while(da<-Math.PI)da+=Math.PI*2;
              m.omega+=da*0.0008*(70-T)/70;
            }
          });
        });
      }

      /* Speed rescale */
      const sp=Math.hypot(m.vx,m.vy);
      if(sp>0.01){const sc=lerp(1,tgtSpd/sp,0.05); m.vx*=sc; m.vy*=sc;}
      m.omega*=0.96;
      m.x+=m.vx; m.y+=m.vy; m.angle+=m.omega;

      const mg=18;
      if(m.x<mg){m.x=mg;m.vx=Math.abs(m.vx);}
      if(m.x>W-mg){m.x=W-mg;m.vx=-Math.abs(m.vx);}
      if(m.y<mg){m.y=mg;m.vy=Math.abs(m.vy);}
      if(m.y>H-mg){m.y=H-mg;m.vy=-Math.abs(m.vy);}
    });

    /* Draw */
    ctx.fillStyle='#02080f'; ctx.fillRect(0,0,W,H);
    ctx.save(); ctx.strokeStyle='rgba(255,255,255,0.02)'; ctx.lineWidth=1;
    for(let x=0;x<W;x+=26){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=26){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.restore();

    /* H-bonds */
    let hbCnt=0;
    for(let i=0;i<N;i++){
      for(let j=0;j<N;j++){
        if(i===j) continue;
        const mA=mols[i], mB=mols[j];
        [0,1].forEach(hi=>{
          const h=getH(mA,hi);
          const dx=mB.x-h.x, dy=mB.y-h.y, r=Math.hypot(dx,dy);
          if(r<HBDIST && r>0.5 && ((h.x-mA.x)*dx+(h.y-mA.y)*dy)/(L_VIS*r)>0.8){
            const alpha=clamp(1-r/HBDIST,0,1)*0.88;
            ctx.save(); ctx.setLineDash([4,5]); ctx.lineWidth=1.5;
            ctx.strokeStyle=`rgba(56,189,248,${alpha})`;
            ctx.beginPath(); ctx.moveTo(h.x,h.y); ctx.lineTo(mB.x,mB.y); ctx.stroke();
            ctx.setLineDash([]); ctx.restore();
            hbCnt++;
          }
        });
      }
    }

    /* Molecules */
    mols.forEach(m=>{
      const h1=getH(m,0), h2=getH(m,1);
      ctx.save(); ctx.strokeStyle='rgba(155,200,240,0.62)'; ctx.lineWidth=2.5; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(m.x,m.y); ctx.lineTo(h1.x,h1.y);
      ctx.moveTo(m.x,m.y); ctx.lineTo(h2.x,h2.y); ctx.stroke(); ctx.restore();
      [h1,h2].forEach(h=>{
        const hg=ctx.createRadialGradient(h.x-1,h.y-1,0.5,h.x,h.y,HR);
        hg.addColorStop(0,'#fff'); hg.addColorStop(1,'#6aa4cc');
        ctx.beginPath(); ctx.arc(h.x,h.y,HR,0,Math.PI*2); ctx.fillStyle=hg; ctx.fill();
      });
      const og=ctx.createRadialGradient(m.x-2,m.y-2,1,m.x,m.y,OR);
      og.addColorStop(0,'#ff7070'); og.addColorStop(1,'#8b0000');
      ctx.beginPath(); ctx.arc(m.x,m.y,OR,0,Math.PI*2); ctx.fillStyle=og; ctx.fill();
    });

    const avgSp=mols.reduce((s,m)=>s+Math.hypot(m.vx,m.vy),0)/N;
    countEl.textContent=hbCnt;
    speedEl.textContent=avgSp.toFixed(2)+' px/fr';
    stateEl.textContent='Liquid contact sketch';


  }

  resize(); tick();
  let paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pause=document.createElement('button'); pause.className='atom-btn';
  function pauseLabel(){pause.textContent=paused?'Resume motion':'Pause motion';pause.setAttribute('aria-pressed',String(paused));}
  pauseLabel();cv.parentElement.querySelector('.atom-sim-controls').append(pause);
  pause.addEventListener('click',()=>{paused=!paused;pauseLabel();});
  tempSl.addEventListener('input',()=>{if(paused)tick();});
  ['hbondFreezeBtn','hbondBoilBtn'].forEach(id=>document.getElementById(id).addEventListener('click',()=>{if(paused)tick();}));
  new ResizeObserver(()=>{resize();tick();}).observe(cv.parentElement);
  let elapsed=0;SimKit.loop(dt=>{elapsed+=dt;if(!paused && elapsed>=1/60){tick();elapsed=0;}});
})();



// Piecewise equilibrium heating curve for one gram at one atmosphere.
(function(){
  const cv=document.getElementById('cvPhase'), slider=document.getElementById('heatEnergy');
  const surface=SimKit.canvas2d(cv,{height:340}), ctx=surface.ctx;
  function state(q){
    if(q<42)return {t:-20+q/2.1,phase:'Ice',why:'Energy raises the temperature of solid ice.'};
    if(q<376)return {t:0,phase:'Ice + liquid',why:`${((q-42)/334*100).toFixed(0)}% melted. Energy changes the arrangement, while temperature stays at 0 °C.`};
    if(q<794)return {t:(q-376)/4.18,phase:'Liquid',why:'Energy raises the liquid’s temperature.'};
    if(q<3054)return {t:100,phase:'Liquid + vapor',why:`${((q-794)/2260*100).toFixed(0)}% vaporized. Energy separates molecules, while temperature stays at 100 °C.`};
    return {t:100+(q-3054)/2,phase:'Vapor',why:'All water is vapor; further energy raises its temperature.'};
  }
  function draw(){
    const q=Number(slider.value), st=state(q), W=surface.width,H=surface.height;
    document.getElementById('heatEvidence').textContent=`${q} J added · ${st.t.toFixed(1)} °C · ${st.phase}. ${st.why}`;
    document.querySelectorAll('[data-energy]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.energy)===q)));
    ctx.fillStyle='#02080f';ctx.fillRect(0,0,W,H);
    const x=v=>54+v/3094*(W-78),y=t=>H-50-(t+20)/140*(H-85);
    ctx.font='12px Inter,sans-serif';ctx.fillStyle='#b6cddd';ctx.textAlign='right';
    [-20,0,50,100,120].forEach(t=>{ctx.fillText(t+'°',45,y(t)+4);ctx.strokeStyle='#203446';ctx.beginPath();ctx.moveTo(54,y(t));ctx.lineTo(W-24,y(t));ctx.stroke();});
    ctx.strokeStyle='#38bdf8';ctx.lineWidth=3;ctx.beginPath();
    [0,42,376,794,3054,3094].forEach((v,i)=>{if(i)ctx.lineTo(x(v),y(state(v).t));else ctx.moveTo(x(v),y(state(v).t));});ctx.stroke();
    ctx.fillStyle='#f6c35b';ctx.beginPath();ctx.arc(x(q),y(st.t),6,0,Math.PI*2);ctx.fill();
    ctx.textAlign='center';ctx.fillStyle='#dceaf8';ctx.fillText('Energy added to 1 g (J)',W/2,H-10);
    ctx.textAlign='left';ctx.fillText('0',54,H-30);ctx.textAlign='right';ctx.fillText('3094',W-24,H-30);
    ctx.textAlign='center';ctx.fillText('melting',x(209),y(0)-12);ctx.fillText('boiling',x(1924),y(100)-12);
  }
  slider.addEventListener('input',draw);
  document.querySelectorAll('[data-energy]').forEach(b=>b.addEventListener('click',()=>{slider.value=b.dataset.energy;draw();}));
  new ResizeObserver(draw).observe(cv.parentElement);draw();
})();
