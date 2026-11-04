(() => {
  'use strict';
  const root = document.querySelector('[data-design-mode]');
  if (!root) return;
  const art = document.getElementById('design-art');
  const inputs = [...root.querySelectorAll('.design-controls input, .design-controls select')];
  const initial = inputs.map(el => ({el, value: el.value, checked: el.checked}));
  const status = document.getElementById('design-status');
  const ns = 'http://www.w3.org/2000/svg';
  const get = (name, fallback) => root.querySelector(`[name="${name}"]`)?.value ?? fallback;
  function add(tag, attrs, text, parent = art) {
    const node = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, val]) => node.setAttribute(key, val));
    if (text !== undefined) node.textContent = text;
    parent.append(node);
    return node;
  }
  function render() {
    art.replaceChildren();
    add('title', {}, 'Your design: editable vector artwork');
    add('rect', {width:480,height:600,fill:'#fffaf0'});
    const accent = get('accent', '#155e75');
    if (root.dataset.designMode === 'vector-drawing-studio') {
      const curve = get('curve',65), stroke = get('stroke',4), merged = get('overlap','separate') === 'merged';
      add('path',{d:`M 130 340 C 100 ${curve} 360 ${curve} 350 340 Q 240 460 130 340 Z`,fill:accent,stroke:'#172554','stroke-width':stroke});
      add('circle',{cx:240,cy:340,r:80,fill:merged?accent:'#fbbf24',stroke:merged?'none':'#172554','stroke-width':stroke});
      add('text',{x:240,y:510,'text-anchor':'middle',fill:'#172554','font-family':'sans-serif','font-size':24},'SHAPES → EMBLEM');
    } else {
      const margin = Number(get('margin',44)), size = get('size',32), staggered = get('align','aligned') === 'staggered';
      add('rect',{x:margin,y:48,width:72,height:72,rx:14,fill:accent});
      add('path',{d:`M ${margin+16} 100 L ${margin+36} 65 L ${margin+56} 100 Z`,fill:'#fffaf0'});
      add('text',{x:margin,y:190,fill:'#172554','font-family':'sans-serif','font-size':size,'font-weight':800,textLength:480-2*margin,lengthAdjust:'spacingAndGlyphs'},get('title','STEAM SHOWCASE'));
      add('rect',{x:margin,y:222,width:480-2*margin,height:12,fill:accent});
      const x = staggered ? margin+50 : margin;
      [get('when','Practice event · Friday, 4–6 PM'),get('where','School hall · All families welcome')].forEach((text,i)=>add('text',{x,y:300+i*38,fill:'#172554','font-family':'sans-serif','font-size':17},text));
      add('text',{x:margin,y:480,fill:accent,'font-family':'sans-serif','font-size':19,'font-weight':700},get('action','Explore student projects'));
      if (root.querySelector('[name="guides"]')?.checked) add('line',{'data-guide':'true',x1:margin,x2:margin,y1:25,y2:560,stroke:'#be123c','stroke-dasharray':'6 6'});
    }
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    status.textContent = `Downloaded ${name}.`;
  }
  function svgBlob() {
    const clone = art.cloneNode(true);
    clone.querySelectorAll('[data-guide]').forEach(el=>el.remove());
    clone.setAttribute('width',480); clone.setAttribute('height',600);
    return new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml;charset=utf-8'});
  }
  inputs.forEach(el=>el.addEventListener('input',render));
  document.getElementById('reset-design').addEventListener('click',()=>{initial.forEach(({el,value,checked})=>{el.value=value;el.checked=checked;});render();status.textContent='Studio reset. Your notes are kept.';});
  document.getElementById('export-svg').addEventListener('click',()=>download(svgBlob(),`${root.dataset.designMode}.svg`));
  document.getElementById('export-png').addEventListener('click',()=>{
    const url = URL.createObjectURL(svgBlob()), img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas'); canvas.width=960;canvas.height=1200;
      canvas.getContext('2d').drawImage(img,0,0,960,1200);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob=>{if(blob)download(blob,`${root.dataset.designMode}.png`);else status.textContent='PNG export failed. Try SVG instead.';},'image/png');
    };
    img.onerror = ()=>{URL.revokeObjectURL(url);status.textContent='PNG export failed. Try SVG instead.';};
    img.src=url;
  });
  document.getElementById('print-design').addEventListener('click',()=>window.print());
  document.getElementById('export-notes').addEventListener('click',()=>download(new Blob([document.getElementById('design-notes').value],{type:'text/plain;charset=utf-8'}),`${root.dataset.designMode}-notes.txt`));
  render();
})();
