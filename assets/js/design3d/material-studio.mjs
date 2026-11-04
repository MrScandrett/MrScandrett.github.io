// Material-only studio tools; the shared workshop owns persistence and undo.
export function setupMaterialStudio({host,edit,getState,say,render,sceneKit}) {
 const panel=document.createElement('section');panel.className='d3w-studio-tools';
 panel.innerHTML=`<h2>Art-direct your shot</h2><p>Choose a lighting starting point, then tune it. Surface swatches keep your lighting; lighting looks keep your material.</p><div class="d3w-presets" aria-label="Lighting looks"><button type="button" data-look="soft">Soft product</button><button type="button" data-look="dramatic">Dramatic side light</button><button type="button" data-look="bright">Bright gallery</button></div><div class="d3w-presets"><button type="button" data-expand aria-pressed="false">Expand studio</button><button type="button" data-pin>Pin comparison</button><button type="button" data-clear disabled>Clear comparison</button></div><p>Pin the current camera image, change one setting, and compare the live scene with your reference. Click the reference to enlarge it. Save project keeps surface and light settings; Capture image downloads the current view.</p><div data-reference></div><p class="d3w-limit">Live studio preview with reflection cards. It does not simulate path-traced light, cast shadows or texture painting. OBJ exports geometry; save the workshop project to preserve your material and lighting recipe.</p>`;
 host.querySelector('.d3w-material-bench').after(panel);
 const looks={soft:{light:45,lightHeight:6,intensity:2,fill:1,ambient:.7,rim:1.2,exposure:1},dramatic:{light:150,lightHeight:3,intensity:3.5,fill:.2,ambient:.2,rim:2.5,exposure:1},bright:{light:65,lightHeight:8,intensity:2.5,fill:1.8,ambient:1.5,rim:.6,exposure:1.1}};
 for(const b of panel.querySelectorAll('[data-look]'))b.addEventListener('click',()=>{edit(()=>{const s=getState();Object.assign(s.params,looks[b.dataset.look]);s.edits=[...new Set([...s.edits,...Object.keys(looks[b.dataset.look])])];});say(`${b.textContent} applied. Tune the key, fill and rim to make your own look.`);});
 panel.querySelector('[data-expand]').addEventListener('click',e=>{const expanded=host.classList.toggle('d3w-studio-expanded');e.currentTarget.setAttribute('aria-pressed',String(expanded));e.currentTarget.textContent=expanded?'Close expanded studio':'Expand studio';window.dispatchEvent(new Event('resize'));render();});
 host.addEventListener('keydown',e=>{if(e.key==='Escape'&&host.classList.contains('d3w-studio-expanded'))panel.querySelector('[data-expand]').click();});
 const reference=panel.querySelector('[data-reference]'),clear=panel.querySelector('[data-clear]');
 clear.addEventListener('click',()=>{reference.replaceChildren();clear.disabled=true;say('Comparison cleared.');});
 panel.querySelector('[data-pin]').addEventListener('click',()=>{
  render();const image=sceneKit.renderer.domElement.toDataURL('image/png');
  const s=getState(),figure=document.createElement('figure');figure.dataset.zoomable='';
  const img=document.createElement('img');img.src=image;img.alt='Pinned material and lighting reference';
  const caption=document.createElement('figcaption');caption.textContent=`Reference · ${s.color} · roughness ${s.params.roughness} · metalness ${s.params.metalness} · key ${s.params.light}° · fill ${s.params.fill}. Original student studio capture. Temporary comparison; Capture image downloads your work.`;
  figure.append(img,caption);reference.replaceChildren(figure);clear.disabled=false;say('Reference pinned. Keep the camera still and change roughness to compare highlight width.');
 });
}
