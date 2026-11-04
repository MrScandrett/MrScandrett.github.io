/* Pure scan processing: projective paper correction and ink extraction. */
export function validCorners(p) {
  if (p.length !== 4) return false;
  return p.every((a, i) => {
    const b = p[(i + 1) % 4], c = p[(i + 2) % 4];
    return Number.isFinite(a.x + a.y) && (b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x) > 0.002;
  });
}

// Unit square → photographed quadrilateral (TL, TR, BR, BL).
export function projectPoint(p, u, v) {
  const [a,b,c,d] = p, dx = a.x-b.x+c.x-d.x, dy = a.y-b.y+c.y-d.y;
  const ex = b.x-c.x, ey = b.y-c.y, fx = d.x-c.x, fy = d.y-c.y;
  const det = ex*fy-fx*ey;
  const g = Math.abs(det) < 1e-12 ? 0 : (dx*fy-fx*dy)/det;
  const h = Math.abs(det) < 1e-12 ? 0 : (ex*dy-dx*ey)/det;
  const z = g*u+h*v+1;
  return { x: ((b.x-a.x+g*b.x)*u+(d.x-a.x+h*d.x)*v+a.x)/z,
    y: ((b.y-a.y+g*b.y)*u+(d.y-a.y+h*d.y)*v+a.y)/z };
}

export function inkAlpha(r, g, b, black, white) {
  const luminance = .2126*r+.7152*g+.0722*b;
  return Math.round(255*(1-Math.max(0, Math.min(1, (luminance-black)/Math.max(1,white-black)))));
}

// Trace pixel boundaries into closed paths, including holes. No embedded bitmap.
export function tracePaths(mask, w, h) {
  const edges = new Map(), key = (x,y) => y*(w+1)+x;
  const add = (x,y,a,b) => { const k=key(x,y); if (!edges.has(k)) edges.set(k,[]); edges.get(k).push(key(a,b)); };
  const on = (x,y) => x>=0 && y>=0 && x<w && y<h && mask[y*w+x];
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) if(on(x,y)) {
    if(!on(x,y-1)) add(x,y,x+1,y);
    if(!on(x+1,y)) add(x+1,y,x+1,y+1);
    if(!on(x,y+1)) add(x+1,y+1,x,y+1);
    if(!on(x-1,y)) add(x,y+1,x,y);
  }
  const paths=[];
  while(edges.size) {
    const start=edges.keys().next().value; let k=start, points=[];
    do {
      points.push([k%(w+1),Math.floor(k/(w+1))]);
      const next=edges.get(k); const n=next.pop(); if(!next.length) edges.delete(k); k=n;
    } while(k!==start);
    points=points.filter((p,i,a)=>{const prev=a[(i+a.length-1)%a.length],next=a[(i+1)%a.length];return (p[0]-prev[0])*(next[1]-p[1])!==(p[1]-prev[1])*(next[0]-p[0]);});
    paths.push('M'+points.map(p=>p.join(',')).join('L')+'Z');
  }
  return paths.join('');
}
