/* Local-only paper artwork → rigid, connected cutout puppet. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.PivotCutout=factory();
})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  function removeBackground(data,w,h,tolerance){
    // Flood only edge-connected, near-paper pixels. Enclosed white details survive.
    var output=new Uint8ClampedArray(data),seen=new Uint8Array(w*h),queue=new Int32Array(w*h),head=0,tail=0;
    var corners=[0,w-1,(h-1)*w,w*h-1].filter(function(i){return data[i*4+3]>=128;});
    if(!corners.length)return output;
    var paper=[0,1,2].map(function(ch){var v=corners.map(function(i){return data[i*4+ch];}).sort(function(a,b){return a-b;});return v[Math.floor(v.length/2)];});
    function enqueue(i){
      if(seen[i])return;seen[i]=1;
      var d=Math.max(Math.abs(data[i*4]-paper[0]),Math.abs(data[i*4+1]-paper[1]),Math.abs(data[i*4+2]-paper[2]));
      if(data[i*4+3]===0||d<=tolerance){output[i*4+3]=0;queue[tail++]=i;}
    }
    for(var x=0;x<w;x++){enqueue(x);enqueue((h-1)*w+x);}
    for(var y=0;y<h;y++){enqueue(y*w);enqueue(y*w+w-1);}
    while(head<tail){var i=queue[head++],px=i%w;if(px)enqueue(i-1);if(px<w-1)enqueue(i+1);if(i>=w)enqueue(i-w);if(i<w*(h-1))enqueue(i+w);}
    return output;
  }
  function validateProject(saved){
    var d=saved&&saved.doc;
    function require(ok){if(!ok)throw Error('Invalid drawing project.');}
    var finite=function(n){return typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<1e7;};
    require(d&&Array.isArray(d.types)&&d.types.length>0&&d.types.length<=500&&Array.isArray(d.frames)&&d.frames.length>0&&d.frames.length<=5000);
    require(finite(d.width)&&finite(d.height)&&d.width>0&&d.height>0&&d.width<=8192&&d.height<=8192&&finite(d.fps)&&d.fps>0&&d.fps<=120);
    var color=function(c){return c==null||(Array.isArray(c)&&c.length===3&&c.every(function(n){return finite(n)&&n>=0&&n<=255;}));};
    var bytes=0;
    d.types.forEach(function(t){
      require(Array.isArray(t.segments)&&t.segments.length>0&&t.segments.length<=200&&Array.isArray(t.order));
      require(t.order.length===t.segments.length&&new Set(t.order).size===t.order.length&&t.order.every(function(i){return Number.isInteger(i)&&i>=0&&i<t.segments.length;}));
      t.segments.forEach(function(s,i){
        require(Number.isInteger(s.parent)&&s.parent>=0&&s.parent<=i&&finite(s.length)&&s.length>=0&&finite(s.restAngle)&&finite(s.thickness)&&color(s.color));
        require((s.attachX===undefined||finite(s.attachX))&&(s.attachY===undefined||finite(s.attachY)));
        if(s.artwork){var a=s.artwork;require(typeof a.src==='string'&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(a.src));bytes+=a.src.length;
          require(finite(a.width)&&finite(a.height)&&a.width>0&&a.height>0&&a.width<=1200&&a.height<=1200&&finite(a.pivotX)&&finite(a.pivotY));}
      });
    });require(bytes<30000000);
    d.frames.forEach(function(f){require(Array.isArray(f.figures)&&f.figures.length<=500&&Array.isArray(f.order));
      require(f.order.length===f.figures.length&&new Set(f.order).size===f.order.length&&f.order.every(function(i){return Number.isInteger(i)&&i>=0&&i<f.figures.length;}));
      f.figures.forEach(function(fig){require(Number.isSafeInteger(fig.id)&&fig.id>=0&&color(fig.color)&&Number.isInteger(fig.type)&&!!d.types[fig.type]&&finite(fig.x)&&finite(fig.y)&&finite(fig.scale)&&fig.scale>0&&Array.isArray(fig.angles)&&fig.angles.length===d.types[fig.type].segments.length&&fig.angles.every(finite));});
    });return saved;
  }
  function open(onCreate,stage){
    stage=stage||{width:690,height:420};
    var dlg=document.createElement('dialog');dlg.className='piv-cutout-dialog';dlg.setAttribute('aria-labelledby','piv-cutout-title');
    dlg.innerHTML=`<form method="dialog"><header><h2 id="piv-cutout-title">Drawing puppet studio</h2><button value="cancel" class="piv-btn" aria-label="Close drawing puppet studio">×</button></header>
      <div class="piv-cutout-body"><p>Photograph a drawing or choose an image. Cut out the torso, head, and limbs as separate pieces, then connect them with bones. Each piece moves like a paper puppet; it does not bend like skin. Photos stay on this device.</p>
      <div class="piv-cutout-actions"><button type="button" class="piv-btn" data-action="camera">Take photo</button><button type="button" class="piv-btn" data-action="photo">Choose drawing</button><button type="button" class="piv-btn" data-action="rotate" disabled>Rotate photo 90°</button></div>
      <input type="file" accept="image/*" capture="environment" data-camera hidden><input type="file" accept="image/*" data-photo hidden>
      <p role="status" data-status>Use even lighting and photograph directly above the paper. If HEIC cannot open, choose a JPEG or PNG copy.</p>
      <div data-work hidden>
      <div class="piv-cutout-fields"><label>Part name <input data-name maxlength="40" value="Torso"></label><label>Connect to <select data-parent><option value="-1">Puppet origin</option></select></label><label><input type="checkbox" data-auto checked> Remove paper automatically</label><label>Background tolerance <input data-tolerance type="range" min="0" max="150" value="40"></label></div>
      <div class="piv-cutout-actions"><button type="button" class="piv-btn" data-action="polygon">Trace outline</button><button type="button" class="piv-btn" data-action="undo">Undo point</button><button type="button" class="piv-btn" data-action="whole">Auto cutout / whole image</button><button type="button" class="piv-btn" data-action="joints">Place pivot &amp; bone tip</button><button type="button" class="piv-btn" data-action="reset-joints">Reset joints</button></div>
      <p data-instruction>Trace around one part by tapping its outline. Then choose Place pivot &amp; bone tip and tap its rotation joint followed by the end of the bone.</p>
      <div class="piv-cutout-grid"><div><canvas data-source width="600" height="400" tabindex="0" aria-label="Drawing selection. Tap to add outline points or place joints; arrow keys move crosshair and Enter places a point."></canvas><p>Keyboard: arrow keys move the crosshair, Shift moves faster, Enter places a point.</p></div><div><canvas data-preview width="300" height="300" aria-label="Cutout part preview on checkerboard"></canvas><p>Preview retains original colors. Automatic removal clears edge-connected paper; adjust tolerance or trace a tighter outline for busy backgrounds.</p><details data-rig-preview hidden open><summary>Assembled puppet (rest pose)</summary><canvas data-puppet aria-label="Assembled cutout puppet preview"></canvas></details></div></div>
      <div class="piv-cutout-actions"><button type="button" class="piv-btn piv-btn--accent" data-action="add">Add part to rig</button><button type="button" class="piv-btn" data-action="remove">Remove last part</button></div>
      <ol data-parts></ol><p>Start with the torso, then add the head and limbs. Choose a parent to make each part follow it. Send back / Bring forward changes how parts overlap without changing their joints. You place the joints yourself; automatic cutout does not identify body parts.</p>
      </div></div><footer><button value="create" class="piv-btn piv-btn--accent" disabled>Add puppet to animation</button><button value="cancel" class="piv-btn">Cancel</button></footer></form>`;
    document.body.appendChild(dlg);
    var q=function(sel){return dlg.querySelector(sel);},canvas=q('[data-source]'),preview=q('[data-preview]');
    var photo=null,points=[],pivot=null,tip=null,parts=[],paintOrder=[],mode='polygon',alive=true,token=0,partCanvas=null,clean=null,cursor={x:100,y:100};
    function status(t){q('[data-status]').textContent=t;}
    function cv(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c;}
    function updateClean(){
      if(!photo)return;clean=cv(photo.width,photo.height);var ctx=clean.getContext('2d');ctx.drawImage(photo,0,0);
      if(q('[data-auto]').checked){var data=ctx.getImageData(0,0,clean.width,clean.height);data.data.set(removeBackground(data.data,clean.width,clean.height,+q('[data-tolerance]').value));ctx.putImageData(data,0,0);}
    }
    function render(){
      if(!photo)return;
      var ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(photo,0,0);
      ctx.lineWidth=2;ctx.strokeStyle='#2563eb';ctx.fillStyle='rgba(37,99,235,.16)';
      if(points.length){ctx.beginPath();points.forEach(function(p,i){ctx[i?'lineTo':'moveTo'](p.x,p.y);});if(points.length>=3){ctx.closePath();ctx.fill();}ctx.stroke();points.forEach(function(p){ctx.beginPath();ctx.arc(p.x,p.y,4,0,7);ctx.fillStyle='#2563eb';ctx.fill();});}
      parts.forEach(function(p){ctx.beginPath();ctx.moveTo(p.pivot.x,p.pivot.y);ctx.lineTo(p.tip.x,p.tip.y);ctx.strokeStyle='#059669';ctx.stroke();});
      if(pivot){ctx.strokeStyle='#c2410c';ctx.beginPath();ctx.arc(pivot.x,pivot.y,7,0,7);ctx.stroke();if(tip){ctx.beginPath();ctx.moveTo(pivot.x,pivot.y);ctx.lineTo(tip.x,tip.y);ctx.stroke();ctx.beginPath();ctx.arc(tip.x,tip.y,6,0,7);ctx.stroke();}}
      ctx.strokeStyle='#111827';ctx.beginPath();ctx.moveTo(cursor.x-7,cursor.y);ctx.lineTo(cursor.x+7,cursor.y);ctx.moveTo(cursor.x,cursor.y-7);ctx.lineTo(cursor.x,cursor.y+7);ctx.stroke();
      partCanvas=cv(photo.width,photo.height);var px=partCanvas.getContext('2d');
      if(points.length>=3){px.beginPath();points.forEach(function(p,i){px[i?'lineTo':'moveTo'](p.x,p.y);});px.closePath();px.clip();}
      px.drawImage(clean,0,0);if(points.length>0&&points.length<3)px.clearRect(0,0,partCanvas.width,partCanvas.height);
      preview.width=photo.width;preview.height=photo.height;preview.getContext('2d').drawImage(partCanvas,0,0);
      q('[data-rig-preview]').hidden=!parts.length;
      var assembled=q('[data-puppet]');assembled.width=photo.width;assembled.height=photo.height;
      var assembledCtx=assembled.getContext('2d');
      paintOrder.forEach(function(i){var p=parts[i];assembledCtx.drawImage(p.cutout,p.cropX,p.cropY);});
    }
    async function load(file){
      if(!file)return;if(parts.length){status('Finish this puppet first, or remove its parts before choosing another photo.');return;}
      var id=++token,url=URL.createObjectURL(file);status('Opening drawing…');
      try{var img=new Image();img.src=url;await img.decode();if(!alive||id!==token)return;
        var scale=Math.min(1,1000/Math.max(img.naturalWidth,img.naturalHeight));photo=cv(Math.max(1,Math.round(img.naturalWidth*scale)),Math.max(1,Math.round(img.naturalHeight*scale)));photo.getContext('2d').drawImage(img,0,0,photo.width,photo.height);
        canvas.width=photo.width;canvas.height=photo.height;points=[];pivot=tip=null;cursor={x:photo.width/2,y:photo.height/2};mode='polygon';updateClean();render();q('[data-work]').hidden=false;q('[data-action=rotate]').disabled=false;
        status('Trace a part, or choose Auto cutout for the whole drawing. Then place its pivot and bone tip.');
      }catch(e){if(alive)status('Cannot open that photo. Try a JPEG or PNG copy.');}finally{URL.revokeObjectURL(url);}
    }
    ['camera','photo'].forEach(function(kind){q('[data-action='+kind+']').onclick=function(){q('[data-'+kind+']').click();};q('[data-'+kind+']').onchange=function(e){load(e.target.files[0]);e.target.value='';};});
    function place(p){
      cursor=p;
      if(mode==='polygon')points.push(p);
      else if(!pivot){pivot=p;status('Now tap the end of this bone.');}
      else {tip=p;status('Check the cutout preview and parent, then Add part to rig.');}
      render();
    }
    canvas.onpointerdown=function(e){e.preventDefault();var r=canvas.getBoundingClientRect();place({x:Math.max(0,Math.min(photo.width,(e.clientX-r.left)*canvas.width/r.width)),y:Math.max(0,Math.min(photo.height,(e.clientY-r.top)*canvas.height/r.height))});};
    canvas.onkeydown=function(e){var delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(delta){e.preventDefault();var step=e.shiftKey?10:1;cursor={x:Math.max(0,Math.min(photo.width,cursor.x+delta[0]*step)),y:Math.max(0,Math.min(photo.height,cursor.y+delta[1]*step))};render();}else if(e.key==='Enter'){e.preventDefault();place({x:cursor.x,y:cursor.y});}};
    function list(){
      var parent=q('[data-parent]'),old=parent.value;parent.replaceChildren(new Option('Puppet origin','-1'));q('[data-parts]').replaceChildren();
      parts.forEach(function(p,i){
        parent.add(new Option((i+1)+'. '+p.name,String(i)));
        var li=document.createElement('li');li.className='piv-cutout-part';
        var label=document.createElement('span');label.textContent=p.name+' → '+(p.parent<0?'origin':parts[p.parent].name)+' · layer '+(paintOrder.indexOf(i)+1);li.appendChild(label);
        [[-1,'Send back'],[1,'Bring forward']].forEach(function(entry){
          var button=document.createElement('button');button.type='button';button.className='piv-btn';button.textContent=entry[1];button.setAttribute('aria-label',entry[1]+': '+p.name);
          var pos=paintOrder.indexOf(i),next=pos+entry[0];button.disabled=next<0||next>=paintOrder.length;
          button.onclick=function(){var other=paintOrder[next];paintOrder[next]=i;paintOrder[pos]=other;list();render();};li.appendChild(button);
        });q('[data-parts]').appendChild(li);
      });
      parent.value=old;if(parent.selectedIndex<0)parent.value='-1';q('[value=create]').disabled=!parts.length;
    }
    q('[data-auto]').onchange=q('[data-tolerance]').oninput=function(){updateClean();render();};
    q('[data-action=polygon]').onclick=function(){mode='polygon';status('Tap points around one body part. Use Undo point to correct its outline.');};
    q('[data-action=undo]').onclick=function(){points.pop();render();};
    q('[data-action=whole]').onclick=function(){points=[];pivot=tip=null;q('[data-auto]').checked=true;mode='joints';updateClean();render();status('Automatic cutout selected. Tap the pivot, then the bone tip. Use Trace outline for separate limbs.');};
    q('[data-action=joints]').onclick=function(){mode='joints';status(pivot?'Tap to place or adjust the bone tip.':'Tap the rotation pivot, then the end of the bone.');};
    q('[data-action=reset-joints]').onclick=function(){pivot=tip=null;mode='joints';render();status('Tap a new pivot, then its bone tip.');};
    q('[data-action=rotate]').onclick=function(){if(parts.length)return status('Remove rig parts before rotating the photo.');var c=cv(photo.height,photo.width),ctx=c.getContext('2d');ctx.translate(c.width,0);ctx.rotate(Math.PI/2);ctx.drawImage(photo,0,0);photo=c;canvas.width=c.width;canvas.height=c.height;cursor={x:c.width/2,y:c.height/2};points=[];pivot=tip=null;updateClean();render();};
    q('[data-action=add]').onclick=function(){
      if(!photo||!pivot||!tip||Math.hypot(tip.x-pivot.x,tip.y-pivot.y)<5)return status('Place a pivot and a bone tip at least 5 pixels apart.');
      if(points.length>0&&points.length<3)return status('Trace at least three outline points.');
      if(parts.length>=32)return status('This puppet already has 32 parts.');
      var data=partCanvas.getContext('2d').getImageData(0,0,photo.width,photo.height).data,minX=photo.width,minY=photo.height,maxX=-1,maxY=-1;
      for(var y=0;y<photo.height;y++)for(var x=0;x<photo.width;x++)if(data[(y*photo.width+x)*4+3]>0){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
      if(maxX<0)return status('This cutout is empty. Lower background tolerance or trace a different area.');
      var cropped=cv(maxX-minX+1,maxY-minY+1);cropped.getContext('2d').drawImage(partCanvas,minX,minY,cropped.width,cropped.height,0,0,cropped.width,cropped.height);
      parts.push({cutout:cropped,cropX:minX,cropY:minY,name:q('[data-name]').value.trim()||'Part '+(parts.length+1),parent:+q('[data-parent]').value,pivot:{x:pivot.x,y:pivot.y},tip:{x:tip.x,y:tip.y},artwork:{src:cropped.toDataURL('image/png'),width:cropped.width,height:cropped.height,pivotX:pivot.x-minX,pivotY:pivot.y-minY}});
      paintOrder.push(parts.length-1);list();q('[data-parent]').value=String(parts.length-1);q('[data-name]').value='Part '+(parts.length+1);points=[];pivot=tip=null;mode='polygon';render();status('Part added. Trace the next part and place its joints, or add this puppet to your animation.');
    };
    q('[data-action=remove]').onclick=function(){parts.pop();paintOrder=paintOrder.filter(function(i){return i<parts.length;});list();render();status('Removed the last rig part.');};
    q('form').onsubmit=function(e){if(e.submitter?.value!=='create')return;e.preventDefault();if(!parts.length)return;
      var scale=Math.min(1,Math.min(280,stage.width*.8,stage.height*.8)/Math.max(photo.width,photo.height)),origin=parts[0].pivot;
      var type={name:'Drawing puppet',builtIn:false,order:paintOrder.slice(),segments:parts.map(function(p){var anchor=p.parent<0?origin:parts[p.parent].tip;return {name:p.name,parent:p.parent+1,length:Math.hypot(p.tip.x-p.pivot.x,p.tip.y-p.pivot.y)*scale,restAngle:Math.atan2(p.tip.y-p.pivot.y,p.tip.x-p.pivot.x),thickness:2,isCircle:false,isFilled:false,color:[0,0,0],attachX:(p.pivot.x-anchor.x)*scale,attachY:(p.pivot.y-anchor.y)*scale,artwork:{src:p.artwork.src,width:p.artwork.width*scale,height:p.artwork.height*scale,pivotX:p.artwork.pivotX*scale,pivotY:p.artwork.pivotY*scale}};})};
      onCreate({type:type,x:stage.width/2+(origin.x-photo.width/2)*scale,y:stage.height/2+(origin.y-photo.height/2)*scale});dlg.close();
    };
    dlg.onclose=function(){alive=false;token++;photo=clean=partCanvas=null;dlg.remove();};dlg.showModal();
  }
  return {open:open,removeBackground:removeBackground,validateProject:validateProject};
});
