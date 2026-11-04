import { LayerDoc, makeCanvas, cloneCanvas } from './doc.mjs';
import { download } from './io.mjs';
import { validCorners, projectPoint, inkAlpha, tracePaths } from './scan-math.mjs';

export function scanDrawing(s) {
  const dlg=s.el.dialog;
  dlg.className='lls-dialog wide';
  dlg.innerHTML=`<form method="dialog" class="lls-dlg"><header><h3>Scan a Drawing</h3><button value="cancel" class="lls-x" aria-label="Close">×</button></header>
    <div class="lls-dlg-body">
    <p>Photograph flat paper from above in even light. Your picture stays on this device.</p>
    <div class="lls-scan-actions"><button type="button" class="lls-btn" data-scan="camera">Take photo</button><button type="button" class="lls-btn ghost" data-scan="file">Choose photo</button><button type="button" class="lls-btn ghost" data-scan="rotate" disabled>Rotate 90°</button></div>
    <input hidden type="file" accept="image/*" capture="environment" data-camera><input hidden type="file" accept="image/*" data-photo>
    <p class="lls-note" data-message role="status">Choose a photo to begin. If HEIC will not open, use a JPEG or PNG copy.</p>
    <div class="lls-scan-work" hidden>
      <p>Drag the numbered corners onto the paper: 1 top left, 2 top right, 3 bottom right, 4 bottom left. You can also select a corner and use arrow keys (Shift for larger steps).</p>
      <div class="lls-scan-grid"><div><div class="lls-scan-photo"><canvas data-source aria-label="Photograph with paper corners"></canvas>${[1,2,3,4].map(n=>`<button type="button" class="lls-scan-corner" data-corner="${n-1}" aria-label="Paper corner ${n}">${n}</button>`).join('')}</div></div>
      <div><canvas data-preview aria-label="Straightened drawing preview"></canvas><p class="lls-note">Preview on white. Paper can become transparent in your new project.</p></div></div>
      <div class="lls-grid3"><label class="lls-field">Darken pencil <input name="black" type="range" min="0" max="200" value="65"></label><label class="lls-field">Remove paper / shadows <input name="white" type="range" min="205" max="255" value="235"></label><label class="lls-field">Paper <select name="paper"><option value="transparent">Transparent line art</option><option value="white">White paper</option></select></label></div>
      <p>Faint marks may disappear as cleanup increases. The uncleaned, straightened photo is kept as a hidden layer. Output is limited to 1800 pixels on its longest side.</p>
      <p><b>Continue on a computer:</b> use File → Export As → Layer Lab project → Download. Transfer that file with AirDrop, Files, or your school drive, then open it in Layer Lab on the computer. Workshop Drive does not sync devices.</p>
    </div></div><footer><button type="submit" value="create" class="lls-btn" disabled>Create drawing project</button><button value="cancel" class="lls-btn ghost">Cancel</button></footer></form>`;
  const f=dlg.querySelector('form'), q=sel=>dlg.querySelector(sel), source=q('[data-source]'), preview=q('[data-preview]');
  let photo, corrected, ink, points, timer, token=0, alive=true;
  const reset=()=>{points=[{x:.03,y:.03},{x:.97,y:.03},{x:.97,y:.97},{x:.03,y:.97}];};
  const message=t=>q('[data-message]').textContent=t;
  const handles=()=>q('[data-source]').parentElement.querySelectorAll('[data-corner]').forEach((b,i)=>{b.style.left=points[i].x*100+'%';b.style.top=points[i].y*100+'%';});
  function render() {
    clearTimeout(timer);
    if(!photo) return;
    handles();
    const ctx=source.getContext('2d'); ctx.drawImage(photo,0,0,source.width,source.height);
    ctx.beginPath();points.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](p.x*source.width,p.y*source.height));ctx.closePath();ctx.strokeStyle='#ffcd38';ctx.lineWidth=3;ctx.stroke();
    q('[value=create]').disabled=!validCorners(points);
    if(!validCorners(points)) {message('Keep corners in order around the paper, without crossing edges.'); return;}
    message('Adjust the corners and cleanup, then create your drawing project.');
    timer=setTimeout(process,90);
  }
  function process() {
    if(!alive || !photo || !validCorners(points)) return;
    const dist=(a,b)=>Math.hypot((a.x-b.x)*photo.width,(a.y-b.y)*photo.height);
    let w=Math.max(dist(points[0],points[1]),dist(points[3],points[2])),h=Math.max(dist(points[0],points[3]),dist(points[1],points[2]));
    const scale=Math.min(1,1800/Math.max(w,h)); w=Math.max(1,Math.round(w*scale)); h=Math.max(1,Math.round(h*scale));
    corrected=makeCanvas(w,h); const cx=corrected.getContext('2d'), out=cx.createImageData(w,h), src=photo.getContext('2d').getImageData(0,0,photo.width,photo.height).data;
    for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
      const p=projectPoint(points,w===1?0:x/(w-1),h===1?0:y/(h-1));
      const sx=Math.max(0,Math.min(photo.width-1,p.x*(photo.width-1))),sy=Math.max(0,Math.min(photo.height-1,p.y*(photo.height-1)));
      const x0=Math.floor(sx),y0=Math.floor(sy),fx=sx-x0,fy=sy-y0,i=(y*w+x)*4;
      for(let ch=0;ch<3;ch++) {
        const at=(xx,yy)=>src[(Math.min(photo.height-1,yy)*photo.width+Math.min(photo.width-1,xx))*4+ch];
        out.data[i+ch]=(at(x0,y0)*(1-fx)+at(x0+1,y0)*fx)*(1-fy)+(at(x0,y0+1)*(1-fx)+at(x0+1,y0+1)*fx)*fy;
      } out.data[i+3]=255;
    }
    cx.putImageData(out,0,0); ink=makeCanvas(w,h);const ix=ink.getContext('2d'), clean=ix.createImageData(w,h);
    for(let i=0;i<out.data.length;i+=4) clean.data[i+3]=inkAlpha(out.data[i],out.data[i+1],out.data[i+2],+f.elements.black.value,+f.elements.white.value);
    ix.putImageData(clean,0,0); preview.width=Math.min(600,w);preview.height=Math.round(h*preview.width/w);
    const px=preview.getContext('2d');px.fillStyle='white';px.fillRect(0,0,preview.width,preview.height);px.drawImage(ink,0,0,preview.width,preview.height);
  }
  async function load(file) {
    if(!file) return; const id=++token; message('Opening photo…');
    const url=URL.createObjectURL(file);
    try {
      const img=new Image(); img.src=url;await img.decode();if(!alive||id!==token)return;
      const scale=Math.min(1,2400/Math.max(img.naturalWidth,img.naturalHeight));photo=makeCanvas(img.naturalWidth*scale,img.naturalHeight*scale);
      const ctx=photo.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,photo.width,photo.height);ctx.drawImage(img,0,0,photo.width,photo.height);
      source.width=Math.min(700,photo.width);source.height=Math.round(photo.height*source.width/photo.width);reset();q('.lls-scan-work').hidden=false;q('[data-scan=rotate]').disabled=false;render();
    } catch {if(alive&&id===token)message('This photo could not be decoded. Try a JPEG or PNG copy; HEIC support varies by browser.');}
    finally {URL.revokeObjectURL(url);}
  }
  for(const [button,input] of [['camera','[data-camera]'],['file','[data-photo]']]) {
    q(`[data-scan=${button}]`).onclick=()=>q(input).click();q(input).onchange=e=>{load(e.target.files[0]);e.target.value='';};
  }
  q('[data-scan=rotate]').onclick=()=>{const c=makeCanvas(photo.height,photo.width),ctx=c.getContext('2d');ctx.translate(c.width,0);ctx.rotate(Math.PI/2);ctx.drawImage(photo,0,0);photo=c;source.width=Math.min(700,c.width);source.height=Math.round(c.height*source.width/c.width);reset();render();};
  q('.lls-scan-photo').querySelectorAll('[data-corner]').forEach((b,i)=>{
    const move=e=>{const r=source.getBoundingClientRect();points[i]={x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};render();};
    b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);move(e);};b.onpointermove=e=>{if(b.hasPointerCapture(e.pointerId))move(e);};
    b.onkeydown=e=>{const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!delta)return;e.preventDefault();const step=e.shiftKey ? 0.02 : 0.002;points[i].x=Math.max(0,Math.min(1,points[i].x+delta[0]*step));points[i].y=Math.max(0,Math.min(1,points[i].y+delta[1]*step));render();};
  });
  f.elements.black.oninput=render;f.elements.white.oninput=render;
  f.onsubmit=e=>{
    if(e.submitter?.value!=='create')return;
    e.preventDefault();if(!photo||!validCorners(points))return;process();
    const d=new LayerDoc(ink.width,ink.height,'Paper drawing');
    const bg=makeCanvas(d.width,d.height);if(f.elements.paper.value==='white'){const ctx=bg.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,bg.width,bg.height);}
    d.addPixelLayer('Paper',bg).locked=true;
    const original=d.addPixelLayer('Original straightened photo',cloneCanvas(corrected));original.visible=false;original.locked=true;
    d.addPixelLayer('Scanned pencil / ink',cloneCanvas(ink));d.addPixelLayer('Digital sketch');
    s.openDoc(d,{label:'Scan a Drawing'});s.setTool('brush');dlg.close('create');s.toast('Draw on Digital sketch. Export a Layer Lab project to continue on another device.');
  };
  dlg.setAttribute('aria-label','Scan a Drawing');
  dlg.onclose=()=>{alive=false;++token;clearTimeout(timer);photo=corrected=ink=null;dlg.removeAttribute('aria-label');};dlg.showModal();
}

export function exportDrawingSVG(s) {
  const L=s.doc?.active;
  if(!L?.canvas || L.kind!=='pixel')return s.toast('Select your scanned ink or a painted pixel layer first.');
  const c=makeCanvas(L.canvas.width,L.canvas.height);c.getContext('2d').drawImage(L.canvas,0,0);
  const scale=Math.min(1,768/Math.max(c.width,c.height)),small=makeCanvas(c.width*scale,c.height*scale),ctx=small.getContext('2d');ctx.drawImage(c,0,0,small.width,small.height);
  const pixels=ctx.getImageData(0,0,small.width,small.height).data,mask=new Uint8Array(small.width*small.height);
  for(let i=0;i<mask.length;i++)mask[i]=pixels[i*4+3]>=128 && (.2126*pixels[i*4]+.7152*pixels[i*4+1]+.0722*pixels[i*4+2])<128 ? 1:0;
  const paths=tracePaths(mask,small.width,small.height);
  if(!paths)return s.toast('No dark lines found. Select the scanned ink layer or darken your marks.');
  download(new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="${c.width}" height="${c.height}" viewBox="0 0 ${small.width} ${small.height}"><title>Traced drawing outlines</title><desc>Pixel contours at up to 768 pixels. Flat paths for modeling; not an automatic 3D reconstruction.</desc><path fill="black" fill-rule="evenodd" d="${paths}"/></svg>`],{type:'image/svg+xml'}),'drawing-outlines.svg');
  s.toast('SVG outlines downloaded from the selected layer (up to 768 px). Import as curves in your 3D editor.');
}
