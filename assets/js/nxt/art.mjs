// Original canvas artwork: NXT intelligent brick on a two-motor Technic rover.
// Coordinates are millimeters in the ideal model; the robot faces local +X.
function box(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
export function drawRover(c,{moving=false,time=0}={}){
  c.save();c.shadowColor='#14212c66';c.shadowBlur=12;c.shadowOffsetY=7;
  box(c,-73,-47,135,94,10,'#858d91','#56616a');c.shadowColor='transparent';
  // Perforated Technic chassis rails and rear caster.
  box(c,-87,-48,164,13,5,'#c9ced0','#727e84');box(c,-87,35,164,13,5,'#c9ced0','#727e84');
  for(const y of [-42,42])for(let x=-77;x<73;x+=14){c.beginPath();c.arc(x,y,3.6,0,Math.PI*2);c.fillStyle='#414d54';c.fill();c.beginPath();c.arc(x-1,y-1,2.2,0,Math.PI*2);c.fillStyle='#68737a';c.fill();}
  box(c,-91,-12,21,24,5,'#3c454a');box(c,-96,-8,17,16,6,'#1f292e','#777f82');
  for(const y of [-65,65]){
    // Gray NXT servo motors, orange axle housings and rubber tires.
    const side=y<0?-1:1;
    box(c,-32,y-side*20,64,27,8,'#d1d6d5','#65737a');
    box(c,-17,y-side*12,31,16,4,'#e97e28','#a64e1c');
    box(c,-29,y-11,58,22,6,'#23292b','#11191c');
    c.save();c.beginPath();c.roundRect(-29,y-11,58,22,6);c.clip();
    const shift=moving?(time/45)%8:0;
    for(let x=-35+shift;x<35;x+=8){c.strokeStyle='#51595b';c.lineWidth=2;c.beginPath();c.moveTo(x,y-11);c.lineTo(x-4,y+11);c.stroke();}c.restore();
    c.strokeStyle='#111719';c.lineWidth=4;c.beginPath();c.moveTo(-23,y);c.lineTo(23,y);c.stroke();
  }
  // Visible cable loops connect the servo motor bodies to the brick.
  for(const sign of [-1,1]){c.beginPath();c.moveTo(-28,sign*40);c.bezierCurveTo(-60,sign*62,84,sign*65,57,sign*23);c.strokeStyle='#172027';c.lineWidth=4;c.stroke();c.strokeStyle='#646e73';c.lineWidth=1;c.stroke();}
  // Rotate a portrait brick so its output sockets face forward.
  c.save();c.rotate(Math.PI/2);c.scale(.8,.8);
  box(c,-48,-74,96,148,10,'#9ca7ab','#58676d');
  const shell=c.createLinearGradient(-45,-70,48,65);shell.addColorStop(0,'#faf9ee');shell.addColorStop(.6,'#dfe3dd');shell.addColorStop(1,'#b9c2c1');
  box(c,-47,-75,91,143,10,shell,'#eef0e9');
  box(c,-36,-58,69,95,8,'#505c61','#859296');
  box(c,-29,-48,55,46,3,'#202c2e');box(c,-26,-45,49,40,2,'#b9c79b');
  c.fillStyle='#4c6145';c.font='bold 7px monospace';c.fillText('NXT',-20,-33);c.font='5px monospace';c.fillText(moving?'RUNNING':'READY',-20,-22);
  for(let n=0;n<4;n++)box(c,-20+n*8,-15,5,3,0,'#6c805b');
  c.fillStyle='#c5cecd';c.font='bold 7px Arial';c.fillText('NXT',-9,10);
  box(c,-11,18,21,20,5,'#dc691a','#ffb166');box(c,-9,18,17,16,4,'#f49137');
  box(c,-28,21,13,12,3,'#a9b6b8','#d5ddda');box(c,14,21,13,12,3,'#a9b6b8','#d5ddda');
  c.fillStyle='#415459';c.beginPath();c.moveTo(-25,27);c.lineTo(-20,24);c.lineTo(-20,30);c.fill();c.beginPath();c.moveTo(24,27);c.lineTo(19,24);c.lineTo(19,30);c.fill();
  box(c,-8,45,15,8,3,'#74868a');
  for(let n=0;n<3;n++){box(c,-30+n*22,-79,15,8,1,'#30434a','#a8b5b7');c.fillStyle='#61757b';c.fillRect(-27+n*22,-78,9,3);}
  for(let n=0;n<4;n++)box(c,-33+n*19,64,13,7,1,'#30434a');
  c.restore();
  // Direction arrow on the forward chassis beam.
  c.fillStyle='#e78435';c.beginPath();c.moveTo(77,0);c.lineTo(65,-8);c.lineTo(65,8);c.closePath();c.fill();c.restore();
}
