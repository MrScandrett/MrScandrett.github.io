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
    dlg.innerHTML=`<form method="dialog" class="piv-cutout-form">
      <header class="piv-cutout-header">
        <div class="piv-cutout-header-info">
          <h2 id="piv-cutout-title">Drawing puppet studio</h2>
          <span class="piv-cutout-badge" data-part-count>0 parts</span>
        </div>
        <button value="cancel" class="piv-btn piv-btn--close" aria-label="Close drawing puppet studio" title="Close (Escape)">×</button>
      </header>
      <div class="piv-cutout-body">
        <div class="piv-cutout-intro" data-intro>
          <div class="piv-cutout-intro-card">
            <div class="piv-cutout-intro-icon" aria-hidden="true">✂️</div>
            <h3>Turn drawings into movable puppets</h3>
            <p>Photograph a drawing or pick an image. Cut out parts (torso, head, arms, legs), connect them with bones, and animate them like paper cutouts. Everything stays safe on this device.</p>
            <div class="piv-cutout-intro-actions">
              <button type="button" class="piv-btn piv-btn--accent piv-btn--lg" data-action="camera">📷 Take photo</button>
              <button type="button" class="piv-btn piv-btn--lg" data-action="photo">🖼️ Choose drawing</button>
            </div>
            <p class="piv-cutout-drop-hint">Or drag and drop an image file here, or paste from clipboard (Ctrl+V / ⌘V)</p>
            <div class="piv-cutout-tips">
              <strong>Tips for classroom success:</strong>
              <ul>
                <li>Draw with dark pen, marker, or pencil on clean white paper.</li>
                <li>Photograph flat from directly above under bright, even lighting.</li>
                <li>Keep limbs slightly spaced out on paper for easier cutout tracing.</li>
              </ul>
            </div>
          </div>
        </div>
        <input type="file" accept="image/*" capture="environment" data-camera hidden>
        <input type="file" accept="image/*" data-photo hidden>
        <div data-work hidden class="piv-cutout-work">
          <div class="piv-cutout-toolbar">
            <div class="piv-cutout-toolgroup" role="group" aria-label="Workflow tools">
              <button type="button" class="piv-btn" data-action="polygon" aria-pressed="true" title="Trace outline around body part (1)"><span class="piv-icon" aria-hidden="true">✏️</span> Trace outline</button>
              <button type="button" class="piv-btn" data-action="undo" title="Undo last outline point (Ctrl+Z or Z)"><span class="piv-icon" aria-hidden="true">↩</span> Undo point</button>
              <button type="button" class="piv-btn" data-action="joints" title="Place rotation pivot and bone tip (2)"><span class="piv-icon" aria-hidden="true">🦴</span> Place pivot &amp; bone tip</button>
              <button type="button" class="piv-btn" data-action="whole" title="Cut out entire drawing or auto selection (3)"><span class="piv-icon" aria-hidden="true">⚡</span> Auto cutout / whole image</button>
              <button type="button" class="piv-btn" data-action="reset-joints" title="Reset joint handles"><span class="piv-icon" aria-hidden="true">🔄</span> Reset joints</button>
            </div>
            <div class="piv-cutout-toolgroup piv-joints-subgroup" role="group" aria-label="Joint placement">
              <button type="button" class="piv-btn" data-action="pivot" title="Place or move rotation pivot"><span class="piv-dot piv-dot--pivot" aria-hidden="true"></span> Place / move pivot</button>
              <button type="button" class="piv-btn" data-action="tip" title="Place or move bone tip"><span class="piv-dot piv-dot--tip" aria-hidden="true"></span> Place / move bone tip</button>
              <button type="button" class="piv-btn" data-action="snap" title="Connect pivot directly to parent limb bone tip">Use parent’s bone tip as pivot</button>
            </div>
            <div class="piv-cutout-toolgroup piv-view-subgroup" role="group" aria-label="Zoom and drawing controls">
              <button type="button" class="piv-btn piv-btn--icon" data-zoom-btn="out" aria-label="Zoom out" title="Zoom out (−)">−</button>
              <label class="piv-cutout-zoom" title="Drawing zoom level">Drawing zoom <input data-zoom type="range" min="100" max="300" step="25" value="100"> <output data-zoom-value>100%</output></label>
              <button type="button" class="piv-btn piv-btn--icon" data-zoom-btn="in" aria-label="Zoom in" title="Zoom in (+)">+</button>
              <button type="button" class="piv-btn piv-btn--icon" data-zoom-btn="reset" aria-label="Reset zoom to 100%" title="Reset zoom (0)">100%</button>
              <button type="button" class="piv-btn" data-action="rotate" disabled title="Rotate photo 90 degrees clockwise">Rotate photo 90°</button>
              <button type="button" class="piv-btn" data-action="change-photo" title="Choose another photo">Change photo</button>
            </div>
          </div>
          <div class="piv-cutout-grid">
            <div class="piv-cutout-stage-col">
              <div class="piv-cutout-viewport" tabindex="0">
                <canvas data-source width="600" height="400" tabindex="0" aria-describedby="piv-cutout-instruction" role="application" aria-label="Drawing selection. Tap to add outline points or place joints; arrow keys move crosshair and Enter places a point."></canvas>
              </div>
              <div class="piv-cutout-guidance">
                <p data-instruction id="piv-cutout-instruction" class="piv-cutout-instruction">Trace around one part by tapping its outline. Then choose Place pivot &amp; bone tip and tap its rotation joint followed by the end of the bone.</p>
                <div class="piv-cutout-status-bar">
                  <p role="status" data-status class="piv-cutout-status">Use even lighting and photograph directly above the paper. If HEIC cannot open, choose a JPEG or PNG copy.</p>
                  <p data-readout role="status" aria-live="polite" class="piv-cutout-readout"></p>
                </div>
                <p class="piv-cutout-shortcuts-hint">Drag a joint handle to adjust it. Keyboard: arrows move crosshair, Shift moves 10px, Enter/Space places point, Z undos point. Desktop: Space+drag pans.</p>
              </div>
            </div>
            <div class="piv-cutout-sidebar">
              <div class="piv-cutout-card piv-card--part">
                <h4 class="piv-card-title">Part Setup</h4>
                <div class="piv-cutout-fields">
                  <label>Part name <input data-name maxlength="40" value="Torso"></label>
                  <div class="piv-preset-chips" role="group" aria-label="Quick limb presets">
                    <button type="button" class="piv-chip" data-preset="Torso">Torso</button>
                    <button type="button" class="piv-chip" data-preset="Head">Head</button>
                    <button type="button" class="piv-chip" data-preset="Left Arm">L Arm</button>
                    <button type="button" class="piv-chip" data-preset="Right Arm">R Arm</button>
                    <button type="button" class="piv-chip" data-preset="Left Leg">L Leg</button>
                    <button type="button" class="piv-chip" data-preset="Right Leg">R Leg</button>
                  </div>
                  <label>Connect to <select data-parent><option value="-1">Puppet origin</option></select></label>
                </div>
                <div class="piv-cutout-actions piv-part-primary-actions">
                  <button type="button" class="piv-btn piv-btn--accent piv-btn--lg" data-action="add">Add part to rig</button>
                  <button type="button" class="piv-btn" data-action="cancel-edit" hidden>Cancel part changes</button>
                </div>
              </div>
              <div class="piv-cutout-card piv-card--cutout">
                <h4 class="piv-card-title">Paper Removal</h4>
                <div class="piv-cutout-fields">
                  <label class="piv-checkbox-label"><input type="checkbox" data-auto checked> Remove paper automatically</label>
                  <label>Background tolerance <span class="piv-val-pill" data-tolerance-val>40</span><input data-tolerance type="range" min="0" max="150" value="40"></label>
                </div>
              </div>
              <div class="piv-cutout-card piv-card--previews">
                <h4 class="piv-card-title">Preview</h4>
                <div class="piv-preview-box">
                  <canvas data-preview width="300" height="300" aria-label="Cutout part preview on checkerboard"></canvas>
                  <p class="piv-preview-note">Preview retains original colors. Automatic removal clears edge-connected paper; adjust tolerance or trace a tighter outline for busy backgrounds.</p>
                </div>
                <details data-rig-preview hidden open class="piv-rig-preview-details">
                  <summary>Assembled puppet (rest pose)</summary>
                  <canvas data-puppet aria-label="Assembled cutout puppet preview"></canvas>
                </details>
              </div>
              <div class="piv-cutout-card piv-card--parts">
                <div class="piv-card-header">
                  <h4 class="piv-card-title">Puppet Rig Parts</h4>
                  <button type="button" class="piv-btn piv-btn--sm" data-action="remove">Remove last part</button>
                </div>
                <ol data-parts class="piv-parts-list"></ol>
                <p class="piv-parts-hint">Start with the torso, then add the head and limbs. Choose a parent to make each part follow it. Send back / Bring forward changes how parts overlap without changing their joints. You place the joints yourself; automatic cutout does not identify body parts.</p>
              </div>
              <details open class="piv-cutout-card piv-card--coords">
                <summary>Precise joint positions (image pixels)</summary>
                <fieldset class="piv-cutout-coordinates">
                  <legend>Precise joint positions (image pixels)</legend>
                  <label>Pivot X <input type="number" min="0" step="1" data-coordinate="pivot-x"></label>
                  <label>Pivot Y <input type="number" min="0" step="1" data-coordinate="pivot-y"></label>
                  <label>Bone tip X <input type="number" min="0" step="1" data-coordinate="tip-x"></label>
                  <label>Bone tip Y <input type="number" min="0" step="1" data-coordinate="tip-y"></label>
                </fieldset>
              </details>
            </div>
          </div>
        </div>
      </div>
      <footer class="piv-cutout-footer">
        <div class="piv-footer-summary" data-footer-summary>Puppet: 0 parts</div>
        <div class="piv-footer-actions">
          <button value="cancel" class="piv-btn">Cancel</button>
          <button value="create" class="piv-btn piv-btn--accent" disabled>Add puppet to animation</button>
        </div>
      </footer>
    </form>`;
    document.body.appendChild(dlg);
    var q=function(sel){return dlg.querySelector(sel);},canvas=q('[data-source]'),preview=q('[data-preview]');
    var photo=null,points=[],pivot=null,tip=null,parts=[],paintOrder=[],mode='polygon',alive=true,token=0,partCanvas=null,clean=null,cursor={x:100,y:100},editing=-1,dragging=null;
    function status(t){q('[data-status]').textContent=t;}
    function setMode(next){
      mode=next;
      dlg.dataset.mode=mode;
      ['polygon','joints','pivot','tip'].forEach(function(key){
        var b=q('[data-action='+key+']');if(b)b.setAttribute('aria-pressed',String(mode===key));
      });
      q('[data-instruction]').textContent=editing>=0?'Editing '+parts[editing].name+'. Adjust joints and parent, then Save part changes.':mode==='polygon'?'Step 1: Trace around one body part. Then choose Place pivot & bone tip.':mode==='pivot'?'Place the rotation pivot. Tap, drag its handle, or enter coordinates.':mode==='tip'?'Place the bone tip at the end of this body part.':'Step 2: Place the rotation pivot first, then the bone tip. Drag either handle to correct it.';
    }
    function syncJoints(){
      ['pivot','tip'].forEach(function(kind){var point=kind==='pivot'?pivot:tip;['x','y'].forEach(function(axis){var input=q('[data-coordinate='+kind+'-'+axis+']');input.max=photo?(axis==='x'?photo.width:photo.height):0;input.value=point?Math.round(point[axis]):'';});});
      q('[data-action=snap]').disabled=+q('[data-parent]').value<0;
      q('[data-action=add]').textContent=editing>=0?'Save part changes':'Add part to rig';q('[data-action=cancel-edit]').hidden=editing<0;q('[value=create]').disabled=!parts.length||editing>=0;
    }
    function cv(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c;}
    function updateClean(){
      if(!photo)return;clean=cv(photo.width,photo.height);var ctx=clean.getContext('2d');ctx.drawImage(photo,0,0);
      if(q('[data-auto]').checked){var data=ctx.getImageData(0,0,clean.width,clean.height);data.data.set(removeBackground(data.data,clean.width,clean.height,+q('[data-tolerance]').value));ctx.putImageData(data,0,0);}
    }
    function render(){
      if(!photo)return;
      syncJoints();setMode(mode);
      var ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(photo,0,0);
      var r=canvas.getBoundingClientRect(),scaleRatio=canvas.width/Math.max(1,r.width);
      var handle=Math.max(14*scaleRatio,10);
      if(points.length){
        ctx.lineWidth=4*scaleRatio;ctx.strokeStyle='rgba(255,255,255,0.9)';ctx.beginPath();
        points.forEach(function(p,i){ctx[i?'lineTo':'moveTo'](p.x,p.y);});
        if(points.length>=3)ctx.closePath();ctx.stroke();
        ctx.lineWidth=2*scaleRatio;ctx.strokeStyle='#2563eb';ctx.fillStyle='rgba(37,99,235,.18)';ctx.beginPath();
        points.forEach(function(p,i){ctx[i?'lineTo':'moveTo'](p.x,p.y);});
        if(points.length>=3){ctx.closePath();ctx.fill();}ctx.stroke();
        points.forEach(function(p){
          ctx.beginPath();ctx.arc(p.x,p.y,5*scaleRatio,0,Math.PI*2);ctx.fillStyle='#ffffff';ctx.fill();
          ctx.beginPath();ctx.arc(p.x,p.y,3.5*scaleRatio,0,Math.PI*2);ctx.fillStyle='#2563eb';ctx.fill();
        });
      }
      parts.forEach(function(p){
        ctx.beginPath();ctx.moveTo(p.pivot.x,p.pivot.y);ctx.lineTo(p.tip.x,p.tip.y);
        ctx.lineWidth=4*scaleRatio;ctx.strokeStyle='rgba(255,255,255,0.9)';ctx.stroke();
        ctx.beginPath();ctx.moveTo(p.pivot.x,p.pivot.y);ctx.lineTo(p.tip.x,p.tip.y);
        ctx.lineWidth=2.5*scaleRatio;ctx.strokeStyle='#059669';ctx.stroke();
      });
      if(pivot){
        if(tip){
          ctx.beginPath();ctx.moveTo(pivot.x,pivot.y);ctx.lineTo(tip.x,tip.y);
          ctx.lineWidth=4*scaleRatio;ctx.strokeStyle='rgba(255,255,255,0.95)';ctx.stroke();
          ctx.beginPath();ctx.moveTo(pivot.x,pivot.y);ctx.lineTo(tip.x,tip.y);
          ctx.lineWidth=2.5*scaleRatio;ctx.strokeStyle='#ea580c';
          ctx.setLineDash([6*scaleRatio,4*scaleRatio]);ctx.stroke();ctx.setLineDash([]);
        }
        function drawJointBadge(pt,color,label){
          ctx.beginPath();ctx.arc(pt.x,pt.y,handle+3*scaleRatio,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.35)';ctx.fill();
          ctx.beginPath();ctx.arc(pt.x,pt.y,handle+1.5*scaleRatio,0,Math.PI*2);ctx.fillStyle='#ffffff';ctx.fill();
          ctx.beginPath();ctx.arc(pt.x,pt.y,handle,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
          ctx.beginPath();ctx.arc(pt.x,pt.y,Math.max(3*scaleRatio,handle*0.3),0,Math.PI*2);ctx.fillStyle='#ffffff';ctx.fill();
          var fontSize=Math.max(13*scaleRatio,11);
          ctx.font='bold '+fontSize+'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          var tm=ctx.measureText(label),bx=pt.x+handle+4*scaleRatio,by=pt.y-fontSize*0.4,bw=tm.width+8*scaleRatio,bh=fontSize+6*scaleRatio;
          ctx.fillStyle='rgba(15,23,42,0.85)';
          if(ctx.roundRect){ctx.beginPath();ctx.roundRect(bx,by-2*scaleRatio,bw,bh,4*scaleRatio);ctx.fill();}
          else ctx.fillRect(bx,by-2*scaleRatio,bw,bh);
          ctx.fillStyle='#ffffff';ctx.fillText(label,bx+4*scaleRatio,by+fontSize*0.7);
        }
        drawJointBadge(pivot,'#ea580c','Pivot');
        if(tip)drawJointBadge(tip,'#059669','Tip');
      }
      var chLen=8*scaleRatio;
      ctx.lineWidth=3.5*scaleRatio;ctx.strokeStyle='rgba(255,255,255,0.9)';ctx.beginPath();
      ctx.moveTo(cursor.x-chLen,cursor.y);ctx.lineTo(cursor.x+chLen,cursor.y);
      ctx.moveTo(cursor.x,cursor.y-chLen);ctx.lineTo(cursor.x,cursor.y+chLen);ctx.stroke();
      ctx.lineWidth=1.5*scaleRatio;ctx.strokeStyle='#0f172a';ctx.beginPath();
      ctx.moveTo(cursor.x-chLen,cursor.y);ctx.lineTo(cursor.x+chLen,cursor.y);
      ctx.moveTo(cursor.x,cursor.y-chLen);ctx.lineTo(cursor.x,cursor.y+chLen);ctx.stroke();
      partCanvas=cv(photo.width,photo.height);var px=partCanvas.getContext('2d');
      if(points.length>=3){px.beginPath();points.forEach(function(p,i){px[i?'lineTo':'moveTo'](p.x,p.y);});px.closePath();px.clip();}
      if(editing>=0){var savedPart=parts[editing];px.drawImage(savedPart.cutout,savedPart.cropX,savedPart.cropY);}else px.drawImage(clean,0,0);if(points.length>0&&points.length<3)px.clearRect(0,0,partCanvas.width,partCanvas.height);
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
        canvas.width=photo.width;canvas.height=photo.height;points=[];pivot=tip=null;cursor={x:photo.width/2,y:photo.height/2};mode='polygon';
        q('[data-intro]').hidden=true;q('[data-work]').hidden=false;updateClean();render();q('[data-action=rotate]').disabled=false;
        status('Trace a part, or choose Auto cutout for the whole drawing. Then place its pivot and bone tip.');
      }catch(e){if(alive)status('Cannot open that photo. Try a JPEG or PNG copy.');}finally{URL.revokeObjectURL(url);}
    }
    ['camera','photo'].forEach(function(kind){q('[data-action='+kind+']').onclick=function(){q('[data-'+kind+']').click();};q('[data-'+kind+']').onchange=function(e){load(e.target.files[0]);e.target.value='';};});
    var changeBtn=q('[data-action=change-photo]');if(changeBtn)changeBtn.onclick=function(){if(parts.length)return status('Remove rig parts before switching to a new photo.');q('[data-photo]').click();};
    function place(p){
      cursor={x:p.x,y:p.y};
      if(mode==='polygon')points.push(p);
      else if(mode==='pivot'||(mode==='joints'&&!pivot)){pivot=p;status('Pivot placed. Choose the bone tip or drag either handle to adjust.');if(mode==='joints')setMode('tip');}
      else {tip=p;status('Bone tip placed. Check the parent and save this part.');}
      render();
    }
    function pointerPoint(e){var r=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(photo.width,(e.clientX-r.left)*canvas.width/r.width)),y:Math.max(0,Math.min(photo.height,(e.clientY-r.top)*canvas.height/r.height))};}
    var activePointers=new Map(),pinchDistStart=0,pinchZoomStart=100;
    canvas.onpointerdown=function(e){
      if(!photo)return;
      activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(activePointers.size===2){
        var pts=Array.from(activePointers.values());
        pinchDistStart=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
        pinchZoomStart=+q('[data-zoom]').value;
        return;
      }
      e.preventDefault();canvas.focus();
      var p=pointerPoint(e),r=canvas.getBoundingClientRect();
      var touchBonus=(e.pointerType==='touch'||e.pointerType==='pen')?16:0;
      var radius=(18+touchBonus)*canvas.width/r.width;
      if(mode!=='polygon'&&!(mode==='tip'&&!tip)&&!(mode==='pivot'&&!pivot)){
        var candidates=[['pivot',pivot],['tip',tip]].filter(function(entry){return entry[1]&&Math.hypot(entry[1].x-p.x,entry[1].y-p.y)<=radius;});
        candidates.sort(function(a,b){return Math.hypot(a[1].x-p.x,a[1].y-p.y)-Math.hypot(b[1].x-p.x,b[1].y-p.y)||(a[0]===mode?-1:b[0]===mode?1:0);});
        if(candidates.length){dragging=candidates[0][0];setMode(dragging);canvas.setPointerCapture(e.pointerId);return;}
      }
      place(p);
    };
    canvas.onpointermove=function(e){
      if(activePointers.has(e.pointerId))activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(activePointers.size===2&&pinchDistStart>0){
        var pts=Array.from(activePointers.values()),d=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
        setZoom(pinchZoomStart*(d/pinchDistStart));return;
      }
      if(!dragging)return;var p=pointerPoint(e);cursor=p;if(dragging==='pivot')pivot=p;else tip=p;render();
    };
    function clearPointer(e){
      activePointers.delete(e.pointerId);if(activePointers.size<2)pinchDistStart=0;
      if(dragging){dragging=null;status('Joint moved. Check the preview, then save this part.');}
    }
    canvas.onpointerup=canvas.onpointercancel=clearPointer;
    canvas.onkeydown=function(e){
      if(!photo)return;var delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
      if(delta){e.preventDefault();var step=e.shiftKey?10:1;cursor={x:Math.max(0,Math.min(photo.width,cursor.x+delta[0]*step)),y:Math.max(0,Math.min(photo.height,cursor.y+delta[1]*step))};q('[data-readout]').textContent='Crosshair X '+Math.round(cursor.x)+', Y '+Math.round(cursor.y);render();}
      else if(e.key==='Enter'||e.key===' '){e.preventDefault();place({x:cursor.x,y:cursor.y});}
    };
    ['pivot','tip'].forEach(function(kind){
      q('[data-action='+kind+']').onclick=function(){setMode(kind);var point=kind==='pivot'?pivot:tip;if(point)cursor={x:point.x,y:point.y};render();canvas.focus();};
      ['x','y'].forEach(function(axis){q('[data-coordinate='+kind+'-'+axis+']').onchange=function(e){
        if(!photo||e.target.value==='')return;var n=Number(e.target.value);if(!Number.isFinite(n))return;
        var point=kind==='pivot'?pivot:tip;point=point?{x:point.x,y:point.y}:{x:cursor.x,y:cursor.y};point[axis]=Math.max(0,Math.min(axis==='x'?photo.width:photo.height,n));
        if(kind==='pivot')pivot=point;else tip=point;cursor={x:point.x,y:point.y};render();status(kind==='pivot'?'Pivot position updated.':'Bone tip position updated.');
      };});
    });
    q('[data-parent]').onchange=function(){syncJoints();};
    q('[data-action=snap]').onclick=function(){var parent=parts[+q('[data-parent]').value];if(!parent)return;pivot={x:parent.tip.x,y:parent.tip.y};cursor={x:pivot.x,y:pivot.y};setMode('tip');render();status('Pivot connected exactly to the parent bone tip. Place this part’s bone tip next.');};
    function list(){
      var parent=q('[data-parent]'),old=parent.value;parent.replaceChildren(new Option('Puppet origin','-1'));q('[data-parts]').replaceChildren();
      parts.forEach(function(p,i){
        if(editing<0||i<editing)parent.add(new Option((i+1)+'. '+p.name,String(i)));
        var li=document.createElement('li');li.className='piv-cutout-part';
        var info=document.createElement('div');info.className='piv-part-info';
        var label=document.createElement('span');label.className='piv-part-label';label.textContent=p.name+' → '+(p.parent<0?'origin':parts[p.parent].name)+' · layer '+(paintOrder.indexOf(i)+1);info.appendChild(label);li.appendChild(info);
        var btnGroup=document.createElement('div');btnGroup.className='piv-part-btns';
        var edit=document.createElement('button');edit.type='button';edit.className='piv-btn piv-btn--sm';edit.textContent='Edit joints';edit.disabled=editing>=0;edit.setAttribute('aria-label','Edit joints: '+p.name);
        edit.onclick=function(){editing=i;points=[];pivot={x:p.pivot.x,y:p.pivot.y};tip={x:p.tip.x,y:p.tip.y};q('[data-name]').value=p.name;setMode('pivot');list();q('[data-parent]').value=String(p.parent);render();canvas.focus();status('Editing '+p.name+'. Save part changes to keep the new joints.');};btnGroup.appendChild(edit);
        [[-1,'Send back'],[1,'Bring forward']].forEach(function(entry){
          var button=document.createElement('button');button.type='button';button.className='piv-btn piv-btn--sm';button.textContent=entry[1];button.setAttribute('aria-label',entry[1]+': '+p.name);
          var pos=paintOrder.indexOf(i),next=pos+entry[0];button.disabled=next<0||next>=paintOrder.length;
          button.onclick=function(){var other=paintOrder[next];paintOrder[next]=i;paintOrder[pos]=other;list();render();};btnGroup.appendChild(button);
        });li.appendChild(btnGroup);q('[data-parts]').appendChild(li);
      });
      parent.value=old;if(parent.selectedIndex<0)parent.value='-1';q('[value=create]').disabled=!parts.length||editing>=0;
      var countBadge=q('[data-part-count]');if(countBadge)countBadge.textContent=parts.length+(parts.length===1?' part':' parts');
      var footerSum=q('[data-footer-summary]');if(footerSum){
        footerSum.textContent=parts.length===0?'Puppet: 0 parts':parts.length+(parts.length===1?' part':' parts')+' connected in puppet'+(editing>=0?' (editing...)':'');
      }
    }
    function setZoom(val){
      var clamped=Math.min(300,Math.max(100,Math.round(val/25)*25));
      q('[data-zoom]').value=clamped;canvas.style.width=clamped+'%';q('[data-zoom-value]').textContent=clamped+'%';render();
    }
    q('[data-zoom]').oninput=function(e){setZoom(+e.target.value);};
    ['in','out','reset'].forEach(function(action){
      var btn=q('[data-zoom-btn='+action+']');if(btn){
        btn.onclick=function(){
          var cur=+q('[data-zoom]').value;
          if(action==='in')setZoom(cur+25);else if(action==='out')setZoom(cur-25);else setZoom(100);
        };
      }
    });
    var viewport=q('.piv-cutout-viewport'),isSpaceDown=false,panAnchor=null;
    dlg.addEventListener('keydown',function(e){
      if(e.code==='Space'&&(e.target===canvas||e.target===viewport)){isSpaceDown=true;viewport.style.cursor='grab';}
    });
    dlg.addEventListener('keyup',function(e){if(e.code==='Space'){isSpaceDown=false;viewport.style.cursor='';}});
    viewport.addEventListener('mousedown',function(e){
      if(isSpaceDown||e.button===1){panAnchor={x:e.clientX,y:e.clientY,scrollX:viewport.scrollLeft,scrollY:viewport.scrollTop};viewport.style.cursor='grabbing';e.preventDefault();}
    });
    window.addEventListener('mousemove',function(e){
      if(panAnchor){viewport.scrollLeft=panAnchor.scrollX-(e.clientX-panAnchor.x);viewport.scrollTop=panAnchor.scrollY-(e.clientY-panAnchor.y);}
    });
    window.addEventListener('mouseup',function(){if(panAnchor){panAnchor=null;viewport.style.cursor=isSpaceDown?'grab':'';}});
    viewport.addEventListener('wheel',function(e){
      if(e.ctrlKey||e.metaKey){e.preventDefault();var cur=+q('[data-zoom]').value;setZoom(cur+(e.deltaY<0?25:-25));}
    },{passive:false});
    dlg.querySelectorAll('[data-preset]').forEach(function(btn){
      btn.onclick=function(){
        var preset=btn.getAttribute('data-preset');q('[data-name]').value=preset;
        var parentSel=q('[data-parent]');
        if(preset==='Torso')parentSel.value='-1';
        else if(parts.length>0){
          var torsoIdx=parts.findIndex(function(p){return /torso/i.test(p.name);});
          if(torsoIdx>=0)parentSel.value=String(torsoIdx);else parentSel.value='0';
        }
        syncJoints();status('Preset chosen: '+preset+(parentSel.value>=0?' (connects to '+parts[+parentSel.value].name+')':''));
      };
    });
    dlg.addEventListener('dragover',function(e){e.preventDefault();dlg.classList.add('is-dragover');});
    dlg.addEventListener('dragleave',function(e){if(!dlg.contains(e.relatedTarget))dlg.classList.remove('is-dragover');});
    dlg.addEventListener('drop',function(e){e.preventDefault();dlg.classList.remove('is-dragover');var file=e.dataTransfer?.files?.[0];if(file&&file.type.startsWith('image/'))load(file);});
    dlg.addEventListener('paste',function(e){
      var items=e.clipboardData?.items;if(!items)return;
      for(var i=0;i<items.length;i++){if(items[i].type.startsWith('image/')){var file=items[i].getAsFile();if(file){load(file);e.preventDefault();break;}}}
    });
    dlg.addEventListener('keydown',function(e){
      if(e.target.matches('input[type="text"], input[type="number"], input:not([type]), select'))return;
      if((e.key==='z'||e.key==='Z')&&(e.ctrlKey||e.metaKey||!e.shiftKey)){e.preventDefault();q('[data-action=undo]').click();}
      else if(e.key==='1'){e.preventDefault();q('[data-action=polygon]').click();}
      else if(e.key==='2'){e.preventDefault();q('[data-action=joints]').click();}
      else if(e.key==='3'){e.preventDefault();q('[data-action=whole]').click();}
      else if(e.key==='+'||e.key==='='){e.preventDefault();setZoom(+q('[data-zoom]').value+25);}
      else if(e.key==='-'){e.preventDefault();setZoom(+q('[data-zoom]').value-25);}
      else if(e.key==='0'){e.preventDefault();setZoom(100);}
    });
    q('[data-action=cancel-edit]').onclick=function(){editing=-1;points=[];pivot=tip=null;mode='polygon';list();q('[data-name]').value='Part '+(parts.length+1);render();status('Part changes canceled. Saved joints are unchanged.');};
    q('[data-auto]').onchange=function(){updateClean();render();};
    q('[data-tolerance]').oninput=function(e){
      var out=q('[data-tolerance-val]');if(out)out.textContent=e.target.value;updateClean();render();
    };
    q('[data-action=polygon]').onclick=function(){if(editing>=0)return status('Save this part’s joint changes before tracing another part.');setMode('polygon');status('Tap points around one body part. Use Undo point to correct its outline.');};
    q('[data-action=undo]').onclick=function(){points.pop();render();};
    q('[data-action=whole]').onclick=function(){if(editing>=0)return status('Save this part’s joint changes before selecting a new cutout.');points=[];pivot=tip=null;q('[data-auto]').checked=true;mode='joints';updateClean();render();status('Automatic cutout selected. Tap the pivot, then the bone tip. Use Trace outline for separate limbs.');};
    q('[data-action=joints]').onclick=function(){setMode('joints');render();status(pivot?'Tap to place or adjust the bone tip.':'Tap the rotation pivot, then the end of the bone.');};
    q('[data-action=reset-joints]').onclick=function(){pivot=tip=null;mode='joints';render();status('Tap a new pivot, then its bone tip.');};
    q('[data-action=rotate]').onclick=function(){if(parts.length)return status('Remove rig parts before rotating the photo.');var c=cv(photo.height,photo.width),ctx=c.getContext('2d');ctx.translate(c.width,0);ctx.rotate(Math.PI/2);ctx.drawImage(photo,0,0);photo=c;canvas.width=c.width;canvas.height=c.height;cursor={x:c.width/2,y:c.height/2};points=[];pivot=tip=null;updateClean();render();};
    q('[data-action=add]').onclick=function(){
      if(!photo||!pivot||!tip||Math.hypot(tip.x-pivot.x,tip.y-pivot.y)<5)return status('Place a pivot and a bone tip at least 5 pixels apart.');
      if(points.length>0&&points.length<3)return status('Trace at least three outline points.');
      if(editing<0&&parts.length>=32)return status('This puppet already has 32 parts.');
      var data=partCanvas.getContext('2d').getImageData(0,0,photo.width,photo.height).data,minX=photo.width,minY=photo.height,maxX=-1,maxY=-1;
      for(var y=0;y<photo.height;y++)for(var x=0;x<photo.width;x++)if(data[(y*photo.width+x)*4+3]>0){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
      if(maxX<0)return status('This cutout is empty. Lower background tolerance or trace a different area.');
      var cropped=cv(maxX-minX+1,maxY-minY+1);cropped.getContext('2d').drawImage(partCanvas,minX,minY,cropped.width,cropped.height,0,0,cropped.width,cropped.height);
      var part={cutout:cropped,cropX:minX,cropY:minY,name:q('[data-name]').value.trim()||'Part '+(parts.length+1),parent:+q('[data-parent]').value,pivot:{x:pivot.x,y:pivot.y},tip:{x:tip.x,y:tip.y},artwork:{src:cropped.toDataURL('image/png'),width:cropped.width,height:cropped.height,pivotX:pivot.x-minX,pivotY:pivot.y-minY}};
      var wasEditing=editing>=0;if(wasEditing)parts[editing]=part;else {parts.push(part);paintOrder.push(parts.length-1);}editing=-1;
      list();q('[data-parent]').value=String(parts.length-1);q('[data-name]').value='Part '+(parts.length+1);points=[];pivot=tip=null;mode='polygon';render();status((wasEditing?'Part changes saved. ':'Part added. ')+'Trace the next part and place its joints, or add this puppet to your animation.');
    };
    q('[data-action=remove]').onclick=function(){editing=-1;points=[];pivot=tip=null;mode='polygon';parts.pop();paintOrder=paintOrder.filter(function(i){return i<parts.length;});list();render();status('Removed the last rig part.');};
    q('form').onsubmit=function(e){if(e.submitter?.value!=='create')return;e.preventDefault();if(!parts.length)return;if(editing>=0)return status('Save part changes before adding the puppet to your animation.');
      var scale=Math.min(1,Math.min(280,stage.width*.8,stage.height*.8)/Math.max(photo.width,photo.height)),origin=parts[0].pivot;
      var type={name:'Drawing puppet',builtIn:false,order:paintOrder.slice(),segments:parts.map(function(p){var anchor=p.parent<0?origin:parts[p.parent].tip;return {name:p.name,parent:p.parent+1,length:Math.hypot(p.tip.x-p.pivot.x,p.tip.y-p.pivot.y)*scale,restAngle:Math.atan2(p.tip.y-p.pivot.y,p.tip.x-p.pivot.x),thickness:2,isCircle:false,isFilled:false,color:[0,0,0],attachX:(p.pivot.x-anchor.x)*scale,attachY:(p.pivot.y-anchor.y)*scale,artwork:{src:p.artwork.src,width:p.artwork.width*scale,height:p.artwork.height*scale,pivotX:p.artwork.pivotX*scale,pivotY:p.artwork.pivotY*scale}};})};
      onCreate({type:type,x:stage.width/2+(origin.x-photo.width/2)*scale,y:stage.height/2+(origin.y-photo.height/2)*scale});dlg.close();
    };
    dlg.onclose=function(){alive=false;token++;photo=clean=partCanvas=null;dlg.remove();};dlg.showModal();
  }
  return {open:open,removeBackground:removeBackground,validateProject:validateProject};
});