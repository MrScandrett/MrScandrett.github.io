export const obstacles=[{x:-180,y:-230,w:170,h:24},{x:150,y:-100,w:24,h:250}];
export const lineX=y=>18+40*Math.sin(y/100);
export function worldReading(name,pose){
 const x=pose.x+Math.cos(pose.a)*70,y=pose.y+Math.sin(pose.a)*70;
 if(name==='light')return Math.abs(x-lineX(y))<12?24:76;
 if(name==='ultrasonic'){
  for(let d=0;d<2550;d+=5){const px=x+Math.cos(pose.a)*d,py=y+Math.sin(pose.a)*d;if(obstacles.some(r=>px>=r.x&&px<=r.x+r.w&&py>=r.y&&py<=r.y+r.h))return Math.round(d/10);}return 255;
 }
 return 0;
}
export function drawWorld(c){
 c.save();c.strokeStyle='#2e3436';c.lineWidth=18;c.lineCap='round';c.beginPath();for(let y=-400;y<=400;y+=5){const x=lineX(y);if(y===-400)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();
 for(const r of obstacles){c.shadowColor='#24332f44';c.shadowBlur=8;c.shadowOffsetY=5;c.fillStyle='#c2a16e';c.fillRect(r.x,r.y,r.w,r.h);c.shadowColor='transparent';c.strokeStyle='#806e50';c.lineWidth=2;c.strokeRect(r.x,r.y,r.w,r.h);for(let x=r.x+8;x<r.x+r.w;x+=18){c.beginPath();c.moveTo(x,r.y+2);c.lineTo(Math.min(x+8,r.x+r.w),r.y+r.h-2);c.strokeStyle='#b39262';c.lineWidth=1;c.stroke();}}
 c.restore();
}
