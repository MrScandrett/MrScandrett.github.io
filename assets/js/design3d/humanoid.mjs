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
 const shade=(c,k)=>c.map(v=>v*k),prims=[],add=(type,spec)=>prims.push({type,...spec});
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
 cap([0,neckY-.03,0],[0,neckY+.17,0],.2*H+.028,.2*H+.028,skin,.05);
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
// --- head: built in its own, finer field (see buildHumanoid). Units below are fractions of the head height H. ---
 const headPrims=[],bodyHairPrims=[];
 const hc=(x,y,z)=>[x*H,headY+y*H,z*H],hr=(x,y,z)=>[x*H,y*H,z*H],jf=p.jaw/.82,eyeR=.06*p.eyes,mw=p.mouth,nz=p.nose;
 const hadd=(type,spec)=>headPrims.push({type,...spec}),hcap=(a,b,ra,rb,color,k,extra={})=>hadd('cap',{a,b,ra:ra*H,rb:rb*H,color,k:k*H,...extra}),hell=(c,r,color,k,extra={})=>hadd('ell',{c,r,color,k:k*H,...extra});
 const neckR=.2*H+.04;
 hcap([0,L.neckY+.03,0],hc(0,-.3,.02),neckR/H,(.18*H+.03)/H,skin,.1);
 hell(hc(0,.12,-.05),hr(.40,.44,.46),skin,.1);                      // cranium, heavier at the back
 hell(hc(0,-.12,.08),hr(.32,.35,.33),skin,.12);                      // face mass
 for(const s of [-1,1]){
  hcap(hc(s*(.27+.03*jf),-.1,-.03),hc(s*(.07+.02*jf),-.395,.21),.11,.055*jf+.02,skin,.08);   // jawline runs ear to chin
  hell(hc(s*.24,-.01,.2),hr(.09,.06,.08),skin,.07);                                        // cheekbone
  hell(hc(s*.405,-.02,-.03),hr(.04,.1,.07),skin,.04);                                       // ear
  hell(hc(s*.41,.02,-.01),hr(.02,.07,.045),shade(skin,.9),.02);
  hcap(hc(s*.3,.185,.29),hc(s*.07,.205,.385),.048,.05,skin,.05);                            // brow ridge
  const ex=s*.185,up=.055+eyeR*.9,lo=.055-eyeR*.85;
  hcap(hc(ex+s*.085,up-.005,.33),hc(ex-s*.085,up+.005,.36),.04,.04,skin,.05);                  // upper lid
  hell(hc(s*.065*Math.sqrt(nz),-.105,.43),hr(.04*nz,.035*nz,.04*nz),skin,.03);              // nostril wing
  hadd('ell',{c:hc(ex,.055,.36),r:hr(eyeR*1.18,eyeR*1.0,.07),color:skin,carve:true,k:.025*H}); // eye socket
 }
 hell(hc(0,-.41,.23),hr(.11*jf+.04,.085,.1),skin,.05);                                       // chin
 hell(hc(0,.18,.39),hr(.09,.06,.05),skin,.05);                                               // glabella
 hcap(hc(0,.11,.36),hc(0,-.06,.455),.036*nz,.055*nz,skin,.05);                              // nose bridge
 hell(hc(0,-.1,.485),hr(.07*nz,.055*nz,.065*nz),skin,.04);                                      // nose tip
 hell(hc(0,-.248,.372),hr(.105*mw,.03,.04),lip,.012);                                         // upper lip
 hell(hc(0,-.287,.368),hr(.09*mw,.036,.045),lip,.012);                                       // lower lip
 for(const s of [-1,1])hcap(hc(s*.27,.178,.34),hc(s*.075,.19+p.brows/150,.43),.021,.03,hair,.02);   // brows
 // --- hair: a shell that stops at a curved hairline (a tilted plane for the nape and sides, a window for the forehead) ---
 // Styles: 0 crop, 1 side-swept bob, 2 long, 3 twists, 4 big round.
 const hs=Math.round(p.hairStyle),hv=p.hair;
 if(hv>0){
  const n=[0,.78/.954,-.55/.954],g=1+.07*hv,plane=(y,z,soft)=>({n,o:hc(0,y,z),soft:soft*H}),window=(y,rx,ry,rz)=>({c:hc(0,y,.44),r:hr(rx,ry,rz),soft:.05*H});
  if(hs===4){const a=.85+.25*hv;hell(hc(0,.2,-.1),hr(.66*a,.62*a,.62*a),hair,.1,{clip:plane(.0,.4,.09),sub:[window(.06,.4,.3,.26)]});}
  else hell(hc(0,.13,-.06),hr(.45*g,.48*g,.5*g),hair,.03,{clip:plane(.26,.4,.06),sub:[window(hs===1?.12:.04,.3,hs===1?.16:.18,.22)]});
  for(const s of [-1,1]){
   if(hs===1)hell(hc(s*.36,-.12,-.08),hr(.13,.34,.3),hair,.06);
   if(hs===2){const strand=(ax,ay,az,bx,by,bz,ra,rb)=>{hcap(hc(ax,ay,az),hc(bx,by,bz),ra,rb,hair,.04);bodyHairPrims.push({type:'cap',a:hc(ax,ay,az),b:hc(bx,by,bz),ra:ra*H,rb:rb*H,color:hair,k:.02});};strand(s*.42,.1,-.08,s*.45,-.72,-.03,.13,.07);}
  }
  if(hs===2){const bk={a:hc(0,.05,-.4),b:hc(0,-.95*(.7+.3*hv),-.34),ra:.36*H,rb:.2*H,color:hair,sc:[1.1,1,.7]};hadd('cap',{...bk,k:.08*H});bodyHairPrims.push({type:'cap',...bk,k:.03});}
  if(hs===3)for(let i=-2;i<=2;i++)hell(hc(i*.17,.52-Math.abs(i)*.05,-.1),hr(.2*(1+.15*hv),.2*(1+.15*hv),.22*(1+.15*hv)),hair,.05);
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
 prims.push(...bodyHairPrims);
 return {body:prims,head:headPrims};
}

// Facial details that must sit exactly on the surface of the finished head: found by ray-marching the head field.
export function facialFeatures(field,p,L){
 const {H,headY}=L,zAt=(x,y)=>field.surfaceZ(x,y,H*1.1,-H*.2)??.38*H,eyes=[],r=.064*H*p.eyes;
 for(const s of [-1,1])eyes.push({side:s,r,c:[s*.185*H,headY+.055*H,.295*H]});
 const my=headY-.268*H,w=.1*H*p.mouth,mouth=[-1,-.5,0,.5,1].map(f=>{const y=my+(f*f)*.016*H,x=f*w*1.25;return [x,y,zAt(x,y)-.003*H];});
 return {eyes,mouth};
}

// Body and head are separate fields so the face can be sculpted at 2 cm cells while the body stays light.
// The head's neck ends in a flat cut inside the collar; the body's neck continues up inside the head's neck.
export const bodyField=(parts,L,cell=.045)=>buildField(parts.body,{cell,floor:0,ceil:L.neckY+.17});
export const headField=(parts,L,cell=.02)=>buildField(parts.head,{cell,floor:L.neckY+.03,tau:.005});
export function buildHumanoid(p,paint,colors,{bodyCell=.045,headCell=.02}={}){
 const L=humanoidLayout(p),parts=humanoidPrims(p,paint,colors),hf=headField(parts,L,headCell);
 return {bodyField:bodyField(parts,L,bodyCell),headField:hf,layout:L,features:facialFeatures(hf,p,L)};
}
