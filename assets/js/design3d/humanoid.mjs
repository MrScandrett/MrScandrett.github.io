// The humanoid template: a neutral base mesh in an A-pose, defined as anatomical masses (ribcage, pecs,
// traps, glutes, thigh/knee/calf, deltoid/arm/hand, skull/jaw/cheek/nose/lips) that melt into one surface.
// Units are the character workshop's scene units (feet at y = 0, Y up, +Z faces the viewer).
// `paint(hex)` returns [r,g,b] so this file stays independent of THREE.
import { buildField } from './body-field.mjs';

export function humanoidLayout(p){
 const H=p.head*1.04,hipY=.18+p.leg,neckY=hipY+p.torso,shoulderY=hipY+p.torso*.84,headY=neckY+H*.62;
 const sH=p.shoulders*.48,hipHalf=.1+p.waist*.3,depthB=.14+p.waist*.18;
 return {H,hipY,neckY,shoulderY,headY,sH,hipHalf,depthB,waistHalf:hipHalf*.86,ankleY:.3,kneeY:.3+(hipY-.3)*.5-.02};
}

export function humanoidPrims(p,paint,colors){
 const L=humanoidLayout(p),{H,hipY,neckY,shoulderY,headY,sH,hipHalf,depthB,waistHalf,ankleY,kneeY}=L,T=p.torso,outfit=Math.round(p.outfit);
 const skin=paint(colors.skin),cloth=paint(colors.cloth),trousers=paint(colors.trousers),leather=paint(colors.leather),hair=paint(colors.hair),lip=paint(colors.lip),gold=paint(colors.gold),metal=paint(colors.metal),collar=paint(colors.collar);
 const prims=[],add=(type,spec)=>prims.push({type,...spec});
 const cap=(a,b,ra,rb,color,k=.1,extra={})=>add('cap',{a,b,ra,rb,color,k,...extra}),ell=(c,r,color,k=.1,extra={})=>add('ell',{c,r,color,k,...extra});
 const robe=outfit===3,longSleeve=outfit===1||robe,legColor=robe?cloth:trousers;
 // --- torso: ribcage, abdomen, pelvis, glutes, pecs, traps, neck ---
 ell([0,hipY+T*.7,-.01],[sH*.9,T*.28,depthB*1.12],cloth,.14);
 ell([0,hipY+T*.38,0],[waistHalf*1.08,T*.22,depthB*.9],cloth,.14);
 ell([0,hipY+.06,-.02],[hipHalf*1.08,.3,depthB*.95],legColor,.14);
 for(const s of [-1,1]){
  ell([s*hipHalf*.5,hipY-.04,-depthB*.55],[.2,.2,.2],legColor,.1);
  ell([s*sH*.36,hipY+T*.75,depthB*.5],[.22,.16,.14],cloth,.07);
  cap([0,neckY-.05,-.04],[s*sH*.9,shoulderY+.01,-.02],.17,.16,cloth,.16);
 }
 cap([0,neckY-.03,0],[0,headY-.3*H,.03*H],.2*H+.04,.18*H+.03,skin,.1);
 // --- arms: deltoid, upper arm, forearm, mitten hand with thumb ---
 const up=p.arm*.5,fo=p.arm*.46;
 for(const s of [-1,1]){
  const J=[s*sH*.95,shoulderY-.06,0],elbow=[J[0]+s*Math.sin(.35)*up,J[1]-Math.cos(.35)*up,.05],wrist=[elbow[0]+s*Math.sin(.18)*fo,elbow[1]-Math.cos(.18)*fo,.14];
  ell(J,[.27,.28,.26],cloth,.1);
  cap(J,elbow,.215,.155,cloth,.08);
  cap(elbow,wrist,.15,.095,longSleeve?cloth:skin,.07);
  if(robe)cap(elbow,wrist,.2,.17,cloth,.05);
  ell([wrist[0]+s*.012,wrist[1]-.15,wrist[2]+.025],[.105,.18,.075],skin,.05);
  cap([wrist[0]-s*.045,wrist[1]-.07,wrist[2]+.05],[wrist[0]-s*.085,wrist[1]-.2,wrist[2]+.085],.046,.036,skin,.05);
  // --- legs: thigh, knee, shin with calf, boot cuff, foot ---
  const hipJ=[s*hipHalf*.55,hipY+.02,0],knee=[s*(hipHalf*.55+.02),kneeY,.03],ankle=[s*(hipHalf*.55+.015),ankleY,-.01],x=ankle[0];
  cap(hipJ,knee,.28,.18,legColor,.1);
  ell(knee,[.175,.18,.17],legColor,.06);
  cap(knee,ankle,.165,.105,legColor,.08);
  ell([x,knee[1]-(knee[1]-ankleY)*.3,-.06],[.15,.22,.15],legColor,.08);
  const footColor=robe?skin:leather;
  if(!robe)cap([x,.62,0],[x,.14,0],.125,.14,leather,.04);
  ell([x,.13,-.1],[.11,.17,.12],footColor,.07);
  cap([x,.1,-.02],[x,.09,.38],.115,.092,footColor,.07,{sc:[1,.85,1]});
  ell([x,.09,.42],[.1,.085,.11],footColor,.06);
 }
 // --- head: skull, jaw, chin, cheekbones, ears, brow ridge, nose, lips ---
 const jaw=.27+.12*(p.jaw-.55)/.55;
 ell([0,headY+.1*H,-.02*H],[.385*H,.41*H,.42*H],skin,.12*H);
 ell([0,headY-.2*H,.05*H],[jaw*H,.27*H,.33*H],skin,.14*H);
 ell([0,headY-.39*H,.2*H],[(.04+.07*p.jaw)*H,.075*H,.09*H],skin,.06*H);
 for(const s of [-1,1]){
  ell([s*.27*H,headY-.03*H,.22*H],[.1*H,.09*H,.09*H],skin,.08*H);
  ell([s*.4*H,headY-.02*H,-.02*H],[.045*H,.1*H,.07*H],skin,.05*H);
  ell([s*.065*H,headY-.125*H,.42*H],[.04*H*p.nose,.035*H*p.nose,.04*H*p.nose],skin,.03*H);
 }
 cap([-.27*H,headY+.19*H,.33*H],[.27*H,headY+.19*H,.33*H],.05*H,.05*H,skin,.06*H);
 cap([0,headY+.03*H,.38*H],[0,headY-.1*H,.45*H],.05*H*p.nose,.05*H*p.nose,skin,.05*H);
 ell([0,headY-.12*H,.47*H],[.07*H*p.nose,.06*H*p.nose,.065*H*p.nose],skin,.04*H);
 ell([0,headY-.255*H,.385*H],[.12*H*p.mouth,.032*H,.045*H],lip,.02*H);
 ell([0,headY-.295*H,.38*H],[.1*H*p.mouth,.037*H,.05*H],lip,.02*H);
 // --- hair: a dome clipped by a tilted plane (hairline above the brows, down to the nape), plus styles ---
 // Styles: 0 crop, 1 side locks, 2 long, 3 twists, 4 big round.
 const hs=Math.round(p.hairStyle),hv=p.hair;
 if(hv>0){
  const n=[0,.78/.954,-.55/.954],g=1+.06*hv,hairline=(y,z)=>({n,o:[0,headY+y*H,z*H],soft:.09*H});
  if(hs===4)ell([0,headY+.2*H,-.1*H],[.66*H*(.85+.25*hv),.62*H*(.85+.25*hv),.62*H*(.85+.25*hv)],hair,.1*H,{clip:hairline(.36,.5)});
  else ell([0,headY+.12*H,-.05*H],[.44*H*g,.47*H*g,.48*H*g],hair,.04*H,{clip:hairline(.28,.4)});
  for(const s of [-1,1]){
   if(hs===1)cap([s*.43*H,headY+.1*H,-.1*H],[s*.45*H,headY-.28*H,-.08*H],.1*H,.06*H,hair,.05*H);
   if(hs===2)cap([s*.43*H,headY+.1*H,-.1*H],[s*.47*H,headY-.55*H,-.1*H],.1*H,.07*H,hair,.05*H);
  }
  if(hs===2)cap([0,headY+.05*H,-.4*H],[0,headY-.95*H*(.7+.3*hv),-.34*H],.36*H,.2*H,hair,.08*H,{sc:[1.1,1,.7]});
  if(hs===3)for(let i=-2;i<=2;i++)ell([i*.17*H,headY+(.52-Math.abs(i)*.05)*H,-.1*H],[.2*H*(1+.15*hv),.2*H*(1+.15*hv),.22*H*(1+.15*hv)],hair,.05*H);
 }
 // --- outfit pieces that stand proud of the body ---
 const front=(x,y)=>{let z=depthB*.55;for(const q of prims)if(q.type==='ell'&&q.color===cloth){const t=1-((x-q.c[0])/q.r[0])**2-((y-q.c[1])/q.r[1])**2;if(t>0)z=Math.max(z,q.c[2]+q.r[2]*Math.sqrt(t));}return z;};
 const beltY=hipY+T*.2,belt=(h,color)=>add('tor',{c:[0,beltY,-.01],R:1,r:h,sc:[waistHalf*1.08+.02,depthB*.86+.03],color,k:.02});
 if(outfit===1||outfit===2||outfit===4||robe)belt(.065,robe?gold:leather);
 if(outfit!==0){const bz=depthB*.86+.07;ell([0,beltY,bz],[.12,.1,.05],gold,.015);}
 if(outfit===1)cap([0,neckY-.04,front(0,neckY-.04)+.015],[0,hipY+T*.28,front(0,hipY+T*.28)+.02],.055,.07,leather,.03);
 if(outfit===2){
  ell([0,hipY+T*.72,depthB*.62],[sH*.7,T*.24,depthB*.9],metal,.04);
  for(const s of [-1,1])ell([s*(sH*.95+.04),shoulderY+.03,0],[.33,.22,.3],metal,.05);
 }
 if(outfit===4){
  const pts=[];for(let i=0;i<=6;i++){const f=i/6,x=-sH*.55+f*(sH*.55+hipHalf*.8),y=shoulderY-.04-f*(shoulderY-.04-(hipY+.2));pts.push([x,y,front(x,y)+.03]);}
  for(let i=0;i<6;i++)cap(pts[i],pts[i+1],.06,.06,leather,.03);
  ell([hipHalf*1.2,hipY-.02,depthB*.15],[.17,.21,.16],leather,.04);
 }
 add('tor',{c:[0,neckY+.02,0],R:1,r:.065,sc:[.2*H+.05,.19*H+.05],color:cloth,k:.05});
 return prims;
}

// Facial details that must sit exactly on the surface of the finished head: found by ray-marching the field.
export function facialFeatures(field,p,L){
 const {H,headY}=L,zAt=(x,y)=>field.surfaceZ(x,y,H*1.1,-H*.2)??.38*H;
 const eyes=[],brows=[];
 for(const s of [-1,1]){
  const x=s*.185*H,y=headY+.055*H,r=.074*H*p.eyes;
  eyes.push({side:s,r,c:[x,y,zAt(x,y)-.012*H]});
  const bi=headY+H*(.215+p.brows/150);
  brows.push({side:s,a:[s*.31*H,headY+.215*H,zAt(s*.31*H,headY+.215*H)+.012*H],b:[s*.07*H,bi,zAt(s*.07*H,bi)+.014*H]});
 }
 const my=headY-.272*H,w=.15*H*p.mouth,mouth=[-1,-.5,0,.5,1].map(f=>{const y=my+(f*f)*.014*H-.012*H*(1-f*f),x=f*w;return [x,y,zAt(x,y)+.002*H];});
 return {eyes,brows,mouth};
}

export function buildHumanoid(p,paint,colors,cell=.04){
 const prims=humanoidPrims(p,paint,colors),field=buildField(prims,{cell,floor:0});
 return {field,layout:humanoidLayout(p),features:facialFeatures(field,p,humanoidLayout(p))};
}
