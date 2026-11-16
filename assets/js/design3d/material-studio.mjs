// Material-only studio tools; the shared workshop owns persistence and undo.
export function setupMaterialStudio({host,edit,getState,say,render,sceneKit}) {
 const panel=document.createElement('div');
 const primary=host.querySelector('[data-creation-primary]');
 panel.className=primary?'d3w-toolbar d3w-starting-tools':'d3w-studio-tools';
 panel.setAttribute('role','group');
 panel.setAttribute('aria-label','Lighting and comparison');
 panel.innerHTML=`<span>Lighting</span><button type="button" data-look="soft">Soft product</button><button type="button" data-look="dramatic">Dramatic side light</button><button type="button" data-look="bright">Bright gallery</button><button type="button" data-pin>Pin comparison</button><button type="button" data-clear disabled>Clear comparison</button>`;

 const reference=document.createElement('div');
 reference.dataset.reference='';
 if(primary){
  host.querySelector('.d3w-layout').before(panel);
  host.querySelector('.d3w-view').append(reference);
 }else{
  host.querySelector('.d3w-material-bench').after(panel);
  panel.append(reference);
 }
 const looks={soft:{light:45,lightHeight:6,intensity:2,fill:1,ambient:.7,rim:1.2,exposure:1},dramatic:{light:150,lightHeight:3,intensity:3.5,fill:.2,ambient:.2,rim:2.5,exposure:1},bright:{light:65,lightHeight:8,intensity:2.5,fill:1.8,ambient:1.5,rim:.6,exposure:1.1}};
 for(const b of panel.querySelectorAll('[data-look]'))b.addEventListener('click',()=>{edit(()=>{const s=getState();Object.assign(s.params,looks[b.dataset.look]);s.edits=[...new Set([...s.edits,...Object.keys(looks[b.dataset.look])])];});say(`${b.textContent} applied. Tune the key, fill and rim to make your own look.`);});
 const clear=panel.querySelector('[data-clear]');
 clear.addEventListener('click',()=>{reference.replaceChildren();clear.disabled=true;say('Comparison cleared.');});
 panel.querySelector('[data-pin]').addEventListener('click',()=>{
  render();const image=sceneKit.renderer.domElement.toDataURL('image/png');
  const s=getState(),figure=document.createElement('figure');figure.dataset.zoomable='';
  const img=document.createElement('img');img.src=image;img.alt='Pinned material and lighting reference';
  const caption=document.createElement('figcaption');caption.textContent=`Pinned · roughness ${s.params.roughness} · key ${s.params.light}° · fill ${s.params.fill}`;
  figure.append(img,caption);reference.replaceChildren(figure);clear.disabled=false;say('Reference pinned. Keep the camera still and change roughness to compare highlight width.');
 });
}
