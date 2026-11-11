(function () {
  'use strict';
  var canvas = document.getElementById('form-canvas');
  var light = document.getElementById('form-light');
  var lightValue = document.getElementById('form-light-value');
  var guide = document.getElementById('form-guide');
  var caption = document.getElementById('form-caption');
  var insight = document.getElementById('form-insight');
  var styles = document.querySelectorAll('input[name="form-style"]');
  var style = 'impression', width = 0, height = 0, ctx;
  var descriptions = {
    impression: ['Short, varied brushstrokes suggest light and form.', 'Squint at the strokes: separate marks merge into larger light and dark shapes. Impressionism is a broad movement; this is one simplified brushwork study.'],
    tonal: ['Five value families make the light, midtone and shadow easy to compare.', 'Look for the large value shapes first. The shadow side faces away from the light; reflected light can soften its lower edge.'],
    hatch: ['Parallel pencil lines build the sphere from light to shadow.', 'Closer, darker lines create deeper values while open paper keeps the highlight light.'],
    crosshatch: ['Crossing layers of lines build darker values.', 'Compare the single layer in the light with the overlapping marks in the shadow.'],
    stipple: ['Dots gather more densely on the shadow side.', 'Look closely: the marks stay separate even where the value looks dark from a distance.'],
    scumble: ['Small, loose loops build an irregular graphite texture.', 'Overlapping loops create dark values; fewer marks leave the light areas open.'],
    smudge: ['Soft graphite transitions describe the turning surface.', 'Blending softens individual marks. Preserve the lightest highlight and the dark contact shadow.'],
    realistic: ['Smooth transitions and a small highlight create a more polished illusion of form.', 'Observe the gradual transition from light to shadow and the reflected light near the lower edge. Hyperrealism involves more than smooth shading; careful observation and detail matter too.']
  };
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function noise(x, y) { var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
  function render() {
    if (!ctx || width < 2 || height < 2) return;
    var w = width, h = height, cx = w * .5, cy = h * .46, r = Math.min(w * .28, h * .34);
    var angle = Number(light.value) * Math.PI / 180, lx = Math.sin(angle), ly = -.55, lz = Math.cos(angle) * .83;
    var len = Math.hypot(lx, ly, lz); lx /= len; ly /= len; lz /= len;
    // The highlight follows the halfway direction between the light and viewer.
    var halfLen = Math.hypot(lx, ly, lz + 1), hx = lx / halfLen, hy = ly / halfLen, hz = (lz + 1) / halfLen;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#e8e2d4'; ctx.fillRect(0, 0, w, h);
    var floor = cy + r * .91; ctx.fillStyle = '#d6cbb8'; ctx.fillRect(0, floor, w, h-floor);
    // A soft cast shadow extends away from the light; a darker contact shadow
    // keeps the sphere visually attached to the surface at every light angle.
    ctx.save(); ctx.translate(cx - lx * r * .6, cy + r + r * .12); ctx.scale(1, .25); var shadow = ctx.createRadialGradient(0, 0, r*.08, 0, 0, r*1.15); shadow.addColorStop(0, 'rgba(45,38,38,.38)'); shadow.addColorStop(1, 'rgba(45,38,38,0)'); ctx.fillStyle = shadow; ctx.beginPath(); ctx.arc(0,0,r*1.15,0,Math.PI*2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(cx, cy + r); ctx.scale(1, .22); var contact = ctx.createRadialGradient(0, 0, 0, 0, 0, r*.38); contact.addColorStop(0, 'rgba(35,30,29,.58)'); contact.addColorStop(1, 'rgba(35,30,29,0)'); ctx.fillStyle = contact; ctx.beginPath(); ctx.arc(0,0,r*.38,0,Math.PI*2); ctx.fill(); ctx.restore();
    var pencil = ['hatch','crosshatch','stipple','scumble'].indexOf(style) !== -1;
    var size = Math.max(2, Math.ceil(r * 2)); var off = document.createElement('canvas'); off.width = off.height = size; var oc = off.getContext('2d'); var image = oc.createImageData(size, size);
    for (var y=0; y<size; y++) for (var x=0; x<size; x++) {
      var nx=(x-size/2)/(size/2), ny=(y-size/2)/(size/2), d=nx*nx+ny*ny, i=(y*size+x)*4;
      if(d>1) continue;
      var nz=Math.sqrt(1-d), diffuse=Math.max(0,nx*lx+ny*ly+nz*lz), reflected=.11*Math.max(0,ny), spec=Math.pow(Math.max(0,nx*hx+ny*hy+nz*hz),48)*.23;
      var v=clamp(.12+diffuse*.7+reflected+spec,0,1);
      if(style==='tonal') v=Math.round(v*4)/4;
      // Every technique depicts the same neutral-gray sphere. Pencil studies
      // retain a light graphite underlayer so the individual marks remain visible.
      var gray=Math.round(pencil ? 194+v*45 : 38+v*198);
      image.data[i]=gray; image.data[i+1]=gray; image.data[i+2]=gray;
      image.data[i+3]=255;
    }
    oc.putImageData(image,0,0); ctx.drawImage(off,cx-r,cy-r,r*2,r*2);
    if(pencil) {
      ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.clip();
      for(var k=0;k<(style==='stipple'?22000:9000);k++) {
        var qx=noise(k,41)*2-1, qy=noise(k,47)*2-1, qd=qx*qx+qy*qy; if(qd>1)continue;
        var qz=Math.sqrt(1-qd), brightness=clamp(.12+Math.max(0,qx*lx+qy*ly+qz*lz)*.8+Math.max(0,qy)*.1,0,1);
        if(noise(k,53)>Math.pow(1-brightness,1.3))continue;
        var mx=cx+qx*r, my=cy+qy*r;
        ctx.strokeStyle='rgba(34,34,32,.4)';ctx.fillStyle='rgba(34,34,32,.75)';ctx.lineWidth=Math.max(.6,r*.006);
        if(style==='stipple') {ctx.beginPath();ctx.arc(mx,my,Math.max(.7,r*.006),0,Math.PI*2);ctx.fill();}
        else if(style==='scumble') {ctx.beginPath();ctx.ellipse(mx,my,r*.012,r*.007,noise(k,63)*Math.PI,0,Math.PI*1.8);ctx.stroke();}
        else {var dir=(style==='crosshatch' && noise(k,61)>.5)?-.75:.75, ml=r*.045;ctx.beginPath();ctx.moveTo(mx-ml*Math.cos(dir),my-ml*Math.sin(dir));ctx.lineTo(mx+ml*Math.cos(dir),my+ml*Math.sin(dir));ctx.stroke();}
      }
      ctx.restore();
    }
    if(style==='impression') {
      ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.clip();
      for(var j=0;j<2100;j++){
        var px=noise(j,3)*2-1, py=noise(j,7)*2-1, dd=px*px+py*py;if(dd>1)continue;
        var z=Math.sqrt(1-dd), val=clamp(.12+Math.max(0,px*lx+py*ly+z*lz)*.8+Math.max(0,py)*.08,0,1);
        var variation=(noise(j,12)-.5)*42, brushGray=Math.round(clamp(38+val*198+variation,0,255));
        ctx.strokeStyle='rgba('+brushGray+','+brushGray+','+brushGray+',.8)';
        ctx.lineWidth=Math.max(1.5,r*(.018+noise(j,21)*.025));ctx.lineCap='round';
        var direction=-.55+px*.55+(noise(j,24)-.5)*.8, length=r*(.035+noise(j,27)*.065);
        ctx.beginPath();ctx.moveTo(cx+px*r,cy+py*r);ctx.lineTo(cx+px*r+Math.cos(direction)*length,cy+py*r+Math.sin(direction)*length);ctx.stroke();
      }ctx.restore();
    }
    if(guide.checked){
      function label(text,x,y,tx,ty){ctx.strokeStyle='#263d35';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(tx,ty);ctx.stroke();ctx.fillStyle='#fffdf5';ctx.fillRect(x-4,y-15,ctx.measureText(text).width+8,20);ctx.fillStyle='#20382d';ctx.fillText(text,x,y);}
      ctx.font='bold 12px sans-serif';label('Highlight',10,25,cx+hx*r,cy+hy*r);
      var awayLen=Math.hypot(lx,ly), sx=-lx/awayLen, sy=-ly/awayLen;
      label('Shadow side',10,h-20,cx+sx*r*.96,cy+sy*r*.96);
      var text='Cast shadow';label(text,Math.max(10,w-ctx.measureText(text).width-10),h-20,cx-lx*r*.6,cy+r+r*.12);
    }
    var degrees=Math.abs(Number(light.value)); lightValue.textContent=degrees===0?'Center':degrees+'° '+(Number(light.value)<0?'left':'right');
    caption.textContent=descriptions[style][0]; insight.textContent=descriptions[style][1];
  }
  var surface=SimKit.canvas2d(canvas,{onResize:function(c,w,h){ctx=c;width=w;height=h;render();}});
  styles.forEach(function(input){input.addEventListener('change',function(){style=this.value;render();});});
  light.addEventListener('input',render); guide.addEventListener('change',render);
  document.getElementById('form-reset').addEventListener('click',function(){style='impression';document.querySelector('input[name="form-style"][value="impression"]').checked=true;light.value=-45;guide.checked=false;render();});
  render();
}());
