// Smooth-blended implicit surfaces, meshed with Surface Nets. THREE-free so it can be tested headless.
// A body is a list of primitives (capsules, ellipsoids, tori) that melt into each other with a per-primitive
// blend radius `k`; the result is ONE closed, manifold surface with smooth normals and per-vertex colour.
// Primitive: { type:'cap'|'ell'|'tor', k, color:[r,g,b], clip?:{n:[x,y,z],o:[x,y,z],soft?}, sub?:[{c,r,soft}], carve?:true,
//   cap: a,b,ra,rb,sc? · ell: c,r · tor: c,R,r,sc? }
// `sub` removes ellipsoid windows from one primitive (a hairline); `carve` removes the primitive from everything built so far (eye sockets).
const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;

function distanceFn(p){
 const base=rawDistanceFn(p);
 if(!p.sub?.length)return base;
 const windows=p.sub.map(w=>({fn:rawDistanceFn({type:'ell',c:w.c,r:w.r}),soft:w.soft||0}));
 return (x,y,z)=>{let d=base(x,y,z);for(const w of windows){const q=-w.fn(x,y,z);if(!w.soft)d=Math.max(d,q);else{const h=clamp(.5+.5*(d-q)/w.soft,0,1);d=q*(1-h)+d*h+w.soft*h*(1-h);}}return d;};
}
function rawDistanceFn(p){
 const clip=p.clip;
 const kc=clip?.soft||0,clipped=clip?(d,x,y,z)=>{const q=-((x-clip.o[0])*clip.n[0]+(y-clip.o[1])*clip.n[1]+(z-clip.o[2])*clip.n[2]);if(!kc)return Math.max(d,q);const h=clamp(.5+.5*(d-q)/kc,0,1);return q*(1-h)+d*h+kc*h*(1-h);}:d=>d;
 if(p.type==='ell'){
  const [cx,cy,cz]=p.c,[rx,ry,rz]=p.r,mr=Math.min(rx,ry,rz);
  return (x,y,z)=>{const qx=(x-cx)/rx,qy=(y-cy)/ry,qz=(z-cz)/rz,k0=Math.hypot(qx,qy,qz);if(k0<1e-9)return clipped(-mr,x,y,z);const k1=Math.hypot(qx/rx,qy/ry,qz/rz);return clipped(k0*(k0-1)/k1,x,y,z);};
 }
 if(p.type==='cap'){
  const [ax,ay,az]=p.a,[bx,by,bz]=p.b,dx=bx-ax,dy=by-ay,dz=bz-az,len2=dx*dx+dy*dy+dz*dz||1e-9,[sx,sy,sz]=p.sc||[1,1,1],sm=Math.min(sx,sy,sz),ra=p.ra,rb=p.rb;
  return (x,y,z)=>{const px=x-ax,py=y-ay,pz=z-az,h=clamp((px*dx+py*dy+pz*dz)/len2,0,1);return clipped(Math.hypot((px-dx*h)/sx,(py-dy*h)/sy,(pz-dz*h)/sz)*sm-(ra+(rb-ra)*h),x,y,z);};
 }
 // torus around the Y axis, elliptical in plan via sc=[sx,sz]
 const [cx,cy,cz]=p.c,R=p.R,r=p.r,[sx,sz]=p.sc||[1,1],sm=Math.min(sx,sz);
 return (x,y,z)=>{const qx=(x-cx)/sx,qz=(z-cz)/sz;return clipped(Math.hypot(Math.hypot(qx,qz)-R,(y-cy)/sm)*sm-r,x,y,z);};
}
// A capsule with `sc` scales its distance field, which stretches the shape by max(sc)/min(sc); the box has to allow for that.
function bounds(p){
 const pad=(p.k||.1)+(p.r!==undefined&&p.type==='tor'?p.r:0);let lo,hi;
 if(p.type==='ell'){lo=p.c.map((v,i)=>v-p.r[i]);hi=p.c.map((v,i)=>v+p.r[i]);}
 else if(p.type==='cap'){const sc=p.sc||[1,1,1],m=Math.max(p.ra,p.rb)*Math.max(...sc)/Math.min(...sc);lo=p.a.map((v,i)=>Math.min(v,p.b[i])-m);hi=p.a.map((v,i)=>Math.max(v,p.b[i])+m);}
 else {const [sx,sz]=p.sc||[1,1],e=[(p.R)*sx+p.r,p.r,(p.R)*sz+p.r];lo=p.c.map((v,i)=>v-e[i]);hi=p.c.map((v,i)=>v+e[i]);}
 return {lo:lo.map(v=>v-pad),hi:hi.map(v=>v+pad)};
}

export function buildField(allPrims,{cell=.04,floor=0,ceil=Infinity,tau=.014}={}){
 const prims=allPrims.filter(p=>!p.carve),carves=allPrims.filter(p=>p.carve);
 const bb=prims.map(bounds),lo=[0,1,2].map(a=>Math.min(...bb.map(b=>b.lo[a]))-cell*3),hi=[0,1,2].map(a=>Math.max(...bb.map(b=>b.hi[a]))+cell*3);
 let h=cell;while(Math.ceil((hi[0]-lo[0])/h)*Math.ceil((hi[1]-lo[1])/h)*Math.ceil((hi[2]-lo[2])/h)>900000)h*=1.1;
 const nx=Math.ceil((hi[0]-lo[0])/h)+1,ny=Math.ceil((hi[1]-lo[1])/h)+1,nz=Math.ceil((hi[2]-lo[2])/h)+1,N=nx*ny*nz;
 const f=new Float32Array(N).fill(1e3),best=new Float32Array(N).fill(1e3),col=new Float32Array(N*3);
 const dists=prims.map(distanceFn);
 prims.forEach((p,pi)=>{
  const dist=dists[pi],k=p.k||.1,{lo:blo,hi:bhi}=bb[pi],[cr,cg,cb]=p.color;
  const i0=Math.max(0,Math.floor((blo[0]-lo[0])/h)),i1=Math.min(nx-1,Math.ceil((bhi[0]-lo[0])/h)),j0=Math.max(0,Math.floor((blo[1]-lo[1])/h)),j1=Math.min(ny-1,Math.ceil((bhi[1]-lo[1])/h)),k0=Math.max(0,Math.floor((blo[2]-lo[2])/h)),k1=Math.min(nz-1,Math.ceil((bhi[2]-lo[2])/h));
  for(let kk=k0;kk<=k1;kk++)for(let jj=j0;jj<=j1;jj++)for(let ii=i0;ii<=i1;ii++){
   const idx=ii+nx*(jj+ny*kk),d=dist(lo[0]+ii*h,lo[1]+jj*h,lo[2]+kk*h),old=f[idx];
   // Colour follows whichever primitive is nearest (stable, crisp edges); the shape itself uses the smooth-min below.
   if(d<best[idx]){best[idx]=d;col[idx*3]=cr;col[idx*3+1]=cg;col[idx*3+2]=cb;}
   if(old>=1e3){f[idx]=d;continue;}
   // Polynomial smooth-min: w is how much of the new primitive shows through at this sample.
   const w=clamp(.5+.5*(old-d)/k,0,1);if(w<=0)continue;
   f[idx]=old*(1-w)+d*w-k*w*(1-w);
  }
 });
 // Carves (eye sockets, nostrils) bite into the finished union with a soft edge.
 for(const c of carves){
  const dist=distanceFn(c),{lo:blo,hi:bhi}=bounds(c),k=c.k||.03;
  for(let kk=Math.max(0,Math.floor((blo[2]-lo[2])/h));kk<=Math.min(nz-1,Math.ceil((bhi[2]-lo[2])/h));kk++)for(let jj=Math.max(0,Math.floor((blo[1]-lo[1])/h));jj<=Math.min(ny-1,Math.ceil((bhi[1]-lo[1])/h));jj++)for(let ii=Math.max(0,Math.floor((blo[0]-lo[0])/h));ii<=Math.min(nx-1,Math.ceil((bhi[0]-lo[0])/h));ii++){
   const idx=ii+nx*(jj+ny*kk),q=-dist(lo[0]+ii*h,lo[1]+jj*h,lo[2]+kk*h),old=f[idx],w=clamp(.5+.5*(old-q)/k,0,1);
   f[idx]=q*(1-w)+old*w+k*w*(1-w);
  }
 }
 // A flat ceiling, so a separately built head can sit on a neck that ends in a flat cut.
 if(ceil<Infinity)for(let kk=0;kk<nz;kk++)for(let jj=0;jj<ny;jj++){const y=lo[1]+jj*h;if(y<=ceil)continue;for(let ii=0;ii<nx;ii++){const idx=ii+nx*(jj+ny*kk);f[idx]=Math.max(f[idx],y-ceil);}}
 // A flat sole: everything below the floor plane is cut away, so the figure stands on its own base.
 for(let kk=0;kk<nz;kk++)for(let jj=0;jj<ny;jj++){const y=lo[1]+jj*h;if(y>=floor)continue;for(let ii=0;ii<nx;ii++){const idx=ii+nx*(jj+ny*kk);f[idx]=Math.max(f[idx],floor-y);}}
 const field={lo,h,nx,ny,nz,f,col,tau,paint:{dists,bb,colors:prims.map(p=>p.color)}};
 field.sample=(x,y,z)=>sample(field,x,y,z);
 field.surfaceZ=(x,y,from,to)=>{const dir=to<from?-1:1,step=h*.5;let z=from,prev=sample(field,x,y,z);for(let i=0;i<400&&(dir<0?z>to:z<to);i++){const zn=z+dir*step,v=sample(field,x,y,zn);if(prev>0&&v<=0){let a=z,b=zn;for(let t=0;t<14;t++){const m=(a+b)/2;if(sample(field,x,y,m)>0)a=m;else b=m;}return (a+b)/2;}z=zn;prev=v;}return null;};
 return field;
}
function sample(F,x,y,z){
 const gx=(x-F.lo[0])/F.h,gy=(y-F.lo[1])/F.h,gz=(z-F.lo[2])/F.h,i=clamp(Math.floor(gx),0,F.nx-2),j=clamp(Math.floor(gy),0,F.ny-2),k=clamp(Math.floor(gz),0,F.nz-2),tx=clamp(gx-i,0,1),ty=clamp(gy-j,0,1),tz=clamp(gz-k,0,1);
 const f=F.f,sy=F.nx,sz=F.nx*F.ny,o=i+sy*j+sz*k;
 const c00=f[o]*(1-tx)+f[o+1]*tx,c10=f[o+sy]*(1-tx)+f[o+sy+1]*tx,c01=f[o+sz]*(1-tx)+f[o+sz+1]*tx,c11=f[o+sy+sz]*(1-tx)+f[o+sy+sz+1]*tx;
 return (c00*(1-ty)+c10*ty)*(1-tz)+(c01*(1-ty)+c11*ty)*tz;
}
// Colour a surface point from the exact distance to every primitive near it: a tight softmax picks the owner, so the
// boundary between (say) shirt and trousers follows the smooth shapes instead of the voxel grid.
function colorAt(F,x,y,z,out,o){
 const {dists,bb,colors}=F.paint,TAU=F.tau;let dmin=1e9;const d=F._d||(F._d=new Float32Array(dists.length));
 for(let i=0;i<dists.length;i++){const b=bb[i];if(x<b.lo[0]||x>b.hi[0]||y<b.lo[1]||y>b.hi[1]||z<b.lo[2]||z>b.hi[2]){d[i]=1e9;continue;}d[i]=dists[i](x,y,z);if(d[i]<dmin)dmin=d[i];}
 let r=0,g=0,bl=0,sum=0;
 for(let i=0;i<dists.length;i++){if(d[i]>=1e9)continue;const w=Math.exp(-(d[i]-dmin)/TAU);if(w<1e-3)continue;const c=colors[i];r+=c[0]*w;g+=c[1]*w;bl+=c[2]*w;sum+=w;}
 if(sum<=0){let bi=0,bd=1e9;for(let i=0;i<dists.length;i++){const v=dists[i](x,y,z);if(v<bd){bd=v;bi=i;}}const c=colors[bi];out[o]=c[0];out[o+1]=c[1];out[o+2]=c[2];return;}
 out[o]=r/sum;out[o+1]=g/sum;out[o+2]=bl/sum;
}

const EDGES=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
export function meshField(F,pass=0){
 const {nx,ny,nz,f,h,lo}=F,cellIndex=new Int32Array(nx*ny*nz).fill(-1),positions=[],cells=[];
 const corner=new Float32Array(8);
 for(let k=0;k<nz-1;k++)for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){
  let mask=0;
  for(let c=0;c<8;c++){const v=f[(i+(c&1))+nx*((j+((c>>1)&1))+ny*(k+((c>>2)&1)))];corner[c]=v;if(v<0)mask|=1<<c;}
  if(mask===0||mask===255)continue;
  let x=0,y=0,z=0,n=0;
  for(const [a,b] of EDGES){const va=corner[a],vb=corner[b];if((va<0)===(vb<0))continue;const t=va/(va-vb);x+=(a&1)+((b&1)-(a&1))*t;y+=((a>>1)&1)+(((b>>1)&1)-((a>>1)&1))*t;z+=((a>>2)&1)+(((b>>2)&1)-((a>>2)&1))*t;n++;}
  cellIndex[i+nx*(j+ny*k)]=positions.length/3;cells.push(i+nx*(j+ny*k));positions.push(lo[0]+(i+x/n)*h,lo[1]+(j+y/n)*h,lo[2]+(k+z/n)*h);
 }
 const indices=[],ci=(i,j,k)=>cellIndex[i+nx*(j+ny*k)];
 for(let k=1;k<nz-1;k++)for(let j=1;j<ny-1;j++)for(let i=1;i<nx-1;i++){
  const here=f[i+nx*(j+ny*k)]<0;
  for(let a=0;a<3;a++){
   const u=(a+1)%3,v=(a+2)%3,e=[[1,0,0],[0,1,0],[0,0,1]],there=f[(i+e[a][0])+nx*((j+e[a][1])+ny*(k+e[a][2]))]<0;
   if(here===there)continue;
   const at=(du,dv)=>ci(i-e[u][0]*du-e[v][0]*dv,j-e[u][1]*du-e[v][1]*dv,k-e[u][2]*du-e[v][2]*dv);
   const q=[at(1,1),at(0,1),at(0,0),at(1,0)];if(q.some(v=>v<0))continue;
   if(here)indices.push(q[0],q[1],q[2],q[0],q[2],q[3]);else indices.push(q[0],q[2],q[1],q[0],q[3],q[2]);
  }
 }
// Surface Nets can pinch two thin parts into an edge shared by four faces. Fill the sample the two cells share and re-mesh,
 // so the template always exports as a manifold solid (a few passes at most; usually none are needed).
 if(pass<4){
  const edgeCount=new Map();for(let i=0;i<indices.length;i+=3)for(let e=0;e<3;e++){const a=indices[i+e],b=indices[i+(e+1)%3],key=a<b?a*65536+b:b*65536+a;edgeCount.set(key,(edgeCount.get(key)||0)+1);}
  let fixed=0;
  for(const [key,c] of edgeCount){
   if(c===2)continue;const a=Math.floor(key/65536),b=key%65536,ca=cells[a],cb=cells[b];
   const corners=cell=>{const i=cell%nx,j=Math.floor(cell/nx)%ny,k=Math.floor(cell/(nx*ny)),out=[];for(let q=0;q<8;q++)out.push((i+(q&1))+nx*((j+((q>>1)&1))+ny*(k+((q>>2)&1))));return out;};
   const other=new Set(corners(cb));for(const s of corners(ca))if(other.has(s)&&f[s]>=0){f[s]=-1e-4;fixed++;}
  }
  if(fixed)return meshField(F,pass+1);
 }
 // One Newton step onto the true surface, then gradient normals and colour.
 const count=positions.length/3,normals=new Float32Array(count*3),colors=new Float32Array(count*3),e=h*.6,inv=1/(2*e);
 for(let v=0;v<count;v++){
  let x=positions[v*3],y=positions[v*3+1],z=positions[v*3+2];
  const d=sample(F,x,y,z),gx=sample(F,x+e,y,z)-sample(F,x-e,y,z),gy=sample(F,x,y+e,z)-sample(F,x,y-e,z),gz=sample(F,x,y,z+e)-sample(F,x,y,z-e),l=Math.hypot(gx,gy,gz)||1;
  const step=clamp(d/Math.max(l*inv,.3),-h*.5,h*.5);x-=gx/l*step;y-=gy/l*step;z-=gz/l*step;
  positions[v*3]=x;positions[v*3+1]=y;positions[v*3+2]=z;normals[v*3]=gx/l;normals[v*3+1]=gy/l;normals[v*3+2]=gz/l;
  colorAt(F,x,y,z,colors,v*3);
 }
 return {positions:new Float32Array(positions),indices:new Uint32Array(indices),normals,colors};
}
