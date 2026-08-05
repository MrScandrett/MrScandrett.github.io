import { select } from "d3-selection";
import { arc, pie, line, curveMonotoneX } from "d3-shape";
import "d3-transition";

const NS = "http://www.w3.org/2000/svg";

function theme() {
  return document.body.dataset.theme || document.documentElement.dataset.theme || "day";
}

function color(root) {
  return getComputedStyle(root.closest(".station")).getPropertyValue("--station").trim() || "#6366f1";
}

function svg(root, label) {
  root.innerHTML = "";
  const node = document.createElementNS(NS, "svg");
  node.setAttribute("class", "math-viz-svg");
  node.setAttribute("viewBox", "0 0 520 180");
  node.setAttribute("role", "img");
  node.setAttribute("aria-label", label);
  node.setAttribute("preserveAspectRatio", "xMidYMid meet");
  root.appendChild(node);
  return select(node);
}

function setup(viz, accent) {
  const studio = getComputedStyle(document.querySelector(".worksheet"));
  const secondary = studio.getPropertyValue("--studio-secondary").trim() || accent;
  const id = `viz-gradient-${Math.random().toString(36).slice(2)}`;
  const defs = viz.append("defs");
  const gradient = defs.append("linearGradient").attr("id", id).attr("x1", "0").attr("y1", "0").attr("x2", "1").attr("y2", "1");
  gradient.append("stop").attr("stop-color", accent).attr("offset", "0");
  gradient.append("stop").attr("stop-color", secondary).attr("offset", ".72");
  gradient.append("stop").attr("stop-color", accent).attr("stop-opacity", .82).attr("offset", "1");
  const glow = defs.append("filter").attr("id", `${id}-glow`).attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
  glow.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
  const merge = glow.append("feMerge"); merge.append("feMergeNode").attr("in", "blur"); merge.append("feMergeNode").attr("in", "SourceGraphic");
  return { fill: `url(#${id})`, glow: `url(#${id}-glow)` };
}

function themedMark(group, x, y, size, accent, delay = 0) {
  const t = theme();
  let mark;
  if (t === "topaz") {
    const points = Array.from({length: 6}, (_, i) => { const a = Math.PI / 3 * i; return `${x + Math.cos(a) * size},${y + Math.sin(a) * size}`; }).join(" ");
    mark = group.append("polygon").attr("points", points);
  } else if (t === "diamond") {
    mark = group.append("rect").attr("x", x-size*.72).attr("y", y-size*.72).attr("width", size*1.44).attr("height", size*1.44).attr("rx", 2).attr("transform", `rotate(45 ${x} ${y})`);
  } else if (t === "sakura") {
    mark = group.append("path").attr("d", `M${x},${y-size} C${x+size},${y-size} ${x+size},${y} ${x},${y+size} C${x-size},${y} ${x-size},${y-size} ${x},${y-size}Z`).attr("transform", `rotate(35 ${x} ${y})`);
  } else if (t === "emerald") {
    mark = group.append("ellipse").attr("cx", x).attr("cy", y).attr("rx", size*.7).attr("ry", size).attr("transform", `rotate(-35 ${x} ${y})`);
  } else if (t === "vaporwave") {
    mark = group.append("rect").attr("x", x-size*.75).attr("y", y-size*.75).attr("width", size*1.5).attr("height", size*1.5).attr("filter", "drop-shadow(0 0 5px #ff00ff)");
  } else {
    mark = group.append("circle").attr("cx", x).attr("cy", y).attr("r", size);
  }
  return mark.attr("fill", accent).attr("stroke", "rgba(255,255,255,.72)").attr("stroke-width", 1.5).attr("opacity", 0).attr("tabindex", 0)
    .transition().delay(delay).duration(340).attr("opacity", 1).selection();
}

function label(viz, text, x, y, options = {}) {
  return viz.append("text").attr("x", x).attr("y", y).attr("text-anchor", options.anchor || "middle").attr("class", options.className || "viz-label").attr("fill", options.fill || "currentColor").text(text);
}

function renderDots(root, original, prompt, accent, arrayMode) {
  const groups = [...original.querySelectorAll(arrayMode ? ".array" : ".dots")];
  const counts = groups.map(g => g.querySelectorAll(".dot").length);
  const viz = svg(root, `${prompt} Visual model with ${counts.join(" and ")} counters.`); setup(viz, accent);
  const all = arrayMode ? counts[0] : counts.reduce((a,b)=>a+b,0);
  const dimensions = prompt.match(/(\d+) by (\d+)/);
  const cols = arrayMode ? (dimensions ? +dimensions[2] : Math.max(1, Math.round(Math.sqrt(all * 1.8)))) : 5;
  let offset = arrayMode ? 0 : 0;
  counts.forEach((count, gi) => {
    const startX = arrayMode ? 260 - Math.min(cols,count)*22/2 : (gi === 0 ? 85 : 330);
    for (let i=0;i<count;i++) {
      const x=startX+(i%cols)*22, y=55+Math.floor(i/cols)*22;
      const mark=themedMark(viz,x,y,8,accent,i*18);
      mark.append("title").text(`Counter ${offset+i+1}`);
    }
    offset += count;
    if (!arrayMode && gi < counts.length-1) label(viz,"+",260,112,{className:"viz-operator"});
  });
  label(viz,arrayMode?`${all} objects arranged in equal rows`:`${counts.join(" + ")} counters`,260,166,{className:"viz-caption"});
}

function renderSequence(root, original, prompt, accent) {
  const values=[...original.querySelectorAll(".sequence span")].map(n=>n.textContent.trim());
  const viz=svg(root,`${prompt} Sequence: ${values.join(", ")}.`), styles=setup(viz,accent);
  const points=values.map((_,i)=>[55+i*(410/Math.max(1,values.length-1)),92]);
  viz.append("path").attr("d",line().curve(curveMonotoneX)(points)).attr("fill","none").attr("stroke",accent).attr("stroke-width",4).attr("stroke-dasharray","8 7").attr("opacity",.45);
  values.forEach((value,i)=>{
    const missing=value==="?",g=viz.append("g").attr("transform",`translate(${points[i][0]},${points[i][1]})`).attr("tabindex",0);
    g.append("rect").attr("x",-27).attr("y",-27).attr("width",54).attr("height",54).attr("rx",theme()==="vaporwave"?0:14).attr("fill",missing?"transparent":styles.fill).attr("stroke",accent).attr("stroke-width",missing?3:1).attr("stroke-dasharray",missing?"6 4":null);
    g.append("text").attr("text-anchor","middle").attr("dy",".35em").attr("class","viz-number").text(value);
    g.attr("opacity",0).transition().delay(i*90).duration(320).attr("opacity",1);
  });
  label(viz,"Look at how the change repeats from one term to the next.",260,158,{className:"viz-caption"});
}

function renderExpression(root, original, prompt, accent) {
  const tokens=[...original.querySelector(".sequence").children].map(node=>({text:node.textContent.trim(),boxed:node.tagName.toLowerCase()==="span",missing:node.classList.contains("missing")}));
  const viz=svg(root,`${prompt} Expression: ${tokens.map(t=>t.text).join(" ")}.`),styles=setup(viz,accent),step=410/Math.max(1,tokens.length-1);
  tokens.forEach((token,i)=>{const x=55+i*step;if(token.boxed){const g=viz.append("g").attr("opacity",0);g.append("rect").attr("x",x-29).attr("y",57).attr("width",58).attr("height",58).attr("rx",theme()==="vaporwave"?0:14).attr("fill",token.missing?"rgba(255,255,255,.55)":styles.fill).attr("stroke",accent).attr("stroke-width",token.missing?3:1.5).attr("stroke-dasharray",token.missing?"7 5":null);g.append("text").attr("x",x).attr("y",92).attr("text-anchor","middle").attr("class","viz-number").text(token.text);g.transition().delay(i*80).duration(300).attr("opacity",1);}else label(viz,token.text,x,94,{className:"viz-operator",fill:accent});});
  label(viz,"Use estimation to predict, then calculate to confirm.",260,154,{className:"viz-caption"});
}

function renderPlace(root, original, prompt, accent) {
  const match=prompt.match(/in ([\d]*)\[(\d)\]([\d]*)/),digits=match?(match[1]+match[2]+match[3]).split(""):['1','2','3'],highlight=match?match[1].length:1;
  const names=["ones","tens","hundreds","thousands","ten-thousands","hundred-thousands","millions"].reverse().slice(-digits.length);
  const viz=svg(root,`${prompt} Place-value chart.`),styles=setup(viz,accent),cell=Math.min(72,430/digits.length),start=260-cell*digits.length/2;
  digits.forEach((digit,i)=>{const x=start+i*cell,g=viz.append("g").attr("tabindex",0);g.append("rect").attr("x",x).attr("y",44).attr("width",cell-4).attr("height",62).attr("rx",theme()==="diamond"?2:10).attr("fill",i===highlight?styles.fill:"rgba(255,255,255,.5)").attr("stroke",accent).attr("stroke-width",i===highlight?4:1.5);g.append("text").attr("x",x+(cell-4)/2).attr("y",83).attr("text-anchor","middle").attr("class","viz-number").text(digit);g.append("text").attr("x",x+(cell-4)/2).attr("y",127).attr("text-anchor","middle").attr("class","viz-tiny").text(names[i]||"");});
  label(viz,"Each step left is 10 times the value.",260,160,{className:"viz-caption"});
}

function renderFraction(root, original, prompt, accent) {
  const parts=[...original.querySelectorAll(".fraction-part")],shaded=parts.filter(p=>p.classList.contains("shaded")).length,total=parts.length;
  const viz=svg(root,`${prompt} ${shaded} of ${total} equal parts are shaded.`),styles=setup(viz,accent);
  const arcs=pie().sort(null).value(1)(Array.from({length:total}));const makeArc=arc().innerRadius(28).outerRadius(66);
  const g=viz.append("g").attr("transform","translate(145,90)");g.selectAll("path").data(arcs).enter().append("path").attr("d",makeArc).attr("fill",(_,i)=>i<shaded?styles.fill:"rgba(255,255,255,.62)").attr("stroke",accent).attr("stroke-width",2).attr("transform","scale(0)").transition().delay((_,i)=>i*70).duration(360).attr("transform","scale(1)");
  label(viz,`${shaded}`,145,86,{className:"viz-number"});label(viz,`—`,145,95,{className:"viz-number"});label(viz,`${total}`,145,112,{className:"viz-number"});
  const barX=255,barW=220/total;for(let i=0;i<total;i++)viz.append("rect").attr("x",barX+i*barW).attr("y",64).attr("width",barW-2).attr("height",52).attr("rx",4).attr("fill",i<shaded?accent:"rgba(255,255,255,.55)").attr("stroke",accent).attr("opacity",0).transition().delay(i*60).duration(280).attr("opacity",1);
  label(viz,"The circle and bar show the same fraction.",365,145,{className:"viz-caption"});
}

function renderGeometry(root, original, prompt, accent) {
  const dims=(original.textContent.match(/(\d+)\s*×\s*(\d+)/)||[0,6,4]).slice(1).map(Number),w=Math.min(260,dims[0]*24),h=Math.min(105,dims[1]*18),viz=svg(root,`${prompt} Rectangle measuring ${dims[0]} by ${dims[1]}.`),styles=setup(viz,accent),x=260-w/2,y=88-h/2;
  viz.append("rect").attr("x",x).attr("y",y).attr("width",0).attr("height",h).attr("fill",styles.fill).attr("stroke",accent).attr("stroke-width",3).transition().duration(550).attr("width",w);
  for(let i=1;i<dims[0];i++)viz.append("line").attr("x1",x+w*i/dims[0]).attr("x2",x+w*i/dims[0]).attr("y1",y).attr("y2",y+h).attr("stroke",accent).attr("opacity",.2);
  for(let i=1;i<dims[1];i++)viz.append("line").attr("x1",x).attr("x2",x+w).attr("y1",y+h*i/dims[1]).attr("y2",y+h*i/dims[1]).attr("stroke",accent).attr("opacity",.2);
  label(viz,`${dims[0]} units`,260,y-10,{className:"viz-caption"});label(viz,`${dims[1]} units`,x+w+18,92,{className:"viz-caption"});
}

function renderBars(root, original, prompt, accent) {
  const data=[...original.querySelectorAll(".bar")].map(n=>({label:n.dataset.label,value:+n.dataset.value})),viz=svg(root,`${prompt} Bar chart: ${data.map(d=>`${d.label} ${d.value}`).join(", ")}.`),styles=setup(viz,accent),max=Math.max(...data.map(d=>d.value));
  viz.append("line").attr("x1",65).attr("x2",470).attr("y1",145).attr("y2",145).attr("stroke","currentColor").attr("opacity",.45);
  data.forEach((d,i)=>{const x=100+i*105,h=d.value/max*105;viz.append("rect").attr("x",x).attr("y",145).attr("width",58).attr("height",0).attr("rx",7).attr("fill",styles.fill).attr("stroke",accent).transition().delay(i*90).duration(520).attr("y",145-h).attr("height",h);label(viz,d.value,x+29,132-h,{className:"viz-number"});label(viz,d.label,x+29,166,{className:"viz-caption"});});
}

function renderNumberline(root, original, prompt, accent) {
  const values=[...original.querySelectorAll(".tick span")].map(n=>+n.textContent),min=Math.min(...values),max=Math.max(...values),start=+(prompt.match(/Start at (−?-?\d+)/)||[0,0])[1].replace("−","-"),move=+(prompt.match(/Move (\d+) (left|right)/)||[0,0,"right"])[1]*(prompt.includes(" left")?-1:1),end=start+move,viz=svg(root,`${prompt} Number line from ${min} to ${max}.`),x=v=>55+(v-min)/(max-min)*410;
  viz.append("line").attr("x1",55).attr("x2",465).attr("y1",102).attr("y2",102).attr("stroke","currentColor").attr("stroke-width",4);
  values.forEach(v=>{viz.append("line").attr("x1",x(v)).attr("x2",x(v)).attr("y1",92).attr("y2",112).attr("stroke","currentColor");if(v%5===0)label(viz,v,x(v),132,{className:"viz-tiny"});});
  const marker=viz.append("g").attr("transform",`translate(${x(start)},73)`);marker.append("circle").attr("r",13).attr("fill",accent).attr("filter",theme()==="vaporwave"?"drop-shadow(0 0 5px #ff00ff)":null);marker.append("text").attr("text-anchor","middle").attr("dy",".35em").attr("fill","#fff").attr("class","viz-tiny").text(start);marker.transition().duration(900).attr("transform",`translate(${x(end)},73)`);viz.append("path").attr("d",`M${x(start)},63 Q${(x(start)+x(end))/2},24 ${x(end)},63`).attr("fill","none").attr("stroke",accent).attr("stroke-width",3).attr("stroke-dasharray","7 5");
  label(viz,move<0?`Move ${Math.abs(move)} left`:`Move ${move} right`,260,28,{className:"viz-caption",fill:accent});
}

function renderBalance(root, original, prompt, accent) {
  const pans=[...original.querySelectorAll(".pan")].map(n=>n.textContent.trim()),viz=svg(root,`${prompt} Balanced scale with ${pans.join(" and ")}.`),styles=setup(viz,accent);
  viz.append("path").attr("d","M260 62 L230 148 L290 148 Z").attr("fill",styles.fill).attr("stroke",accent).attr("stroke-width",2);viz.append("line").attr("x1",95).attr("x2",425).attr("y1",63).attr("y2",63).attr("stroke",accent).attr("stroke-width",8).attr("stroke-linecap","round").attr("transform","rotate(-3 260 63)").transition().duration(700).attr("transform","rotate(0 260 63)");
  [135,385].forEach((x,i)=>{viz.append("line").attr("x1",x).attr("x2",x-35).attr("y1",63).attr("y2",115).attr("stroke",accent);viz.append("line").attr("x1",x).attr("x2",x+35).attr("y1",63).attr("y2",115).attr("stroke",accent);viz.append("path").attr("d",`M${x-48},115 Q${x},153 ${x+48},115`).attr("fill",styles.fill).attr("stroke",accent).attr("stroke-width",3);label(viz,pans[i],x,116,{className:"viz-number"});});
}

function renderMachine(root, original, prompt, accent) {
  const boxes=[...original.querySelectorAll(".machine-box")].map(n=>n.textContent.trim().replace(/\s+/g," ")),viz=svg(root,`${prompt} Function machine: ${boxes.join(" then ")}.`),styles=setup(viz,accent);
  boxes.forEach((text,i)=>{const x=55+i*170,g=viz.append("g").attr("opacity",0);g.append("rect").attr("x",x).attr("y",55).attr("width",120).attr("height",70).attr("rx",theme()==="vaporwave"?0:16).attr("fill",styles.fill).attr("stroke",accent).attr("stroke-width",3);g.append("text").attr("x",x+60).attr("y",94).attr("text-anchor","middle").attr("class","viz-number").text(text);g.transition().delay(i*170).duration(350).attr("opacity",1);if(i<2){viz.append("line").attr("x1",x+125).attr("x2",x+160).attr("y1",90).attr("y2",90).attr("stroke",accent).attr("stroke-width",4);viz.append("path").attr("d",`M${x+160},90 l-10,-7 v14 Z`).attr("fill",accent);}});
}

export function render(root, options = {}) {
  const original=root.cloneNode(true),accent=color(root),prompt=options.prompt||"Mathematics visual";
  if(original.querySelector(".dot-expression")) return renderDots(root,original,prompt,accent,false);
  if(original.querySelector(".array")) return renderDots(root,original,prompt,accent,true);
  if(original.querySelector(".sequence .operator")) return renderExpression(root,original,prompt,accent);
  if(original.querySelector(".sequence")) return renderSequence(root,original,prompt,accent);
  if(original.querySelector(".place-model")) return renderPlace(root,original,prompt,accent);
  if(original.querySelector(".fraction-visual")) return renderFraction(root,original,prompt,accent);
  if(original.querySelector(".shape")) return renderGeometry(root,original,prompt,accent);
  if(original.querySelector(".bars")) return renderBars(root,original,prompt,accent);
  if(original.querySelector(".numberline")) return renderNumberline(root,original,prompt,accent);
  if(original.querySelector(".balance")) return renderBalance(root,original,prompt,accent);
  if(original.querySelector(".machine")) return renderMachine(root,original,prompt,accent);
}

window.MathWorksheetViz={render};
