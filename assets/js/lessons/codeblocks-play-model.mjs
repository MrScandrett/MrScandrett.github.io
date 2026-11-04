// Small arithmetic language: numbers, named parameters, + - * / and parentheses.
export const STARTERS = {
  helix: { name: 'Twisting ladder', count: 24, twist: 18, rise: 3, radius: 16, size: 3, code: '# Each repeat adds a rung and two beads.\nbox 0 0 i*rise radius*2 size size 0 i*twist 0 i*12\nsphere radius 0 i*rise size size size 0 i*twist 0 i*12\nsphere -radius 0 i*rise size size size 0 i*twist 0 i*12+180' },
  bloom: { name: 'Mechanical bloom', count: 18, twist: 137.5, rise: .5, radius: 14, size: 4, code: '# Rotate a petal, then place it around the center.\nbox radius 0 i*rise+size size*5 size size 0 i*twist 25 i*12' },
  tower: { name: 'Turning tower', count: 20, twist: 12, rise: 3, radius: 12, size: 3, code: '# Thin floors become a twisting architectural model.\nbox 0 0 i*rise radius*2 radius*2 size 0 i*twist 0 i*10' },
  blank: { name: 'Your idea', count: 1, twist: 0, rise: 4, radius: 12, size: 4, code: '# Start with a shape. Add lines to build your idea.\nbox 0 0 size/2 size size size 0 0 0 190' }
};
export function expression(source, vars) {
  const tokens = source.match(/[A-Za-z]+|(?:\d*\.)?\d+|[()+*/-]/g) || [];
  if (tokens.join('') !== source) throw Error('Use numbers, parameters and + - * / ( ).');
  let at = 0;
  function atom() {
    const t = tokens[at++];
    if (t === '-') return -atom(); if (t === '+') return atom();
    if (t === '(') { const v = sum(); if (tokens[at++] !== ')') throw Error('Missing closing parenthesis.'); return v; }
    if (Object.hasOwn(vars, t)) return vars[t];
    if (t && /^(?:\d*\.)?\d+$/.test(t)) return Number(t);
    throw Error('Unknown value: ' + (t || 'empty expression'));
  }
  function product() { let v = atom(); while (tokens[at] === '*' || tokens[at] === '/') { const op=tokens[at++], n=atom(); v=op==='*'?v*n:v/n; } return v; }
  function sum() { let v=product(); while(tokens[at]==='+' || tokens[at]==='-') { const op=tokens[at++], n=product(); v=op==='+'?v+n:v-n; } return v; }
  const value=sum(); if (at!==tokens.length || !Number.isFinite(value)) throw Error('Expression must produce a finite number.'); return value;
}
export function compile(code, p) {
  const lines=code.split('\n').map((text,i)=>({text:text.split('#')[0].trim(),line:i+1})).filter(l=>l.text);
  if (!lines.length) return [];
  if (lines.length * p.count > 600) throw Error('Keep the design under 600 shapes.');
  const result=[];
  for(let i=0;i<p.count;i++) {
  const vars={...p,i};
  const state={move:[0,0,0],rotate:[0,0,0],scale:[1,1,1],color:null};
  for(const line of lines) {
    try {
      const [shape,...args]=line.text.split(/\s+/);
      if (['let','change'].includes(shape)) {
        if(args.length!==2 || !/^[a-zA-Z]+$/.test(args[0]) || Object.hasOwn(p,args[0]) || args[0]==='i') throw Error('Use a new variable name and one expression, for example: let angle i*twist');
        if(shape==='change' && !Object.hasOwn(vars,args[0])) throw Error('Create '+args[0]+' with let first.');
        vars[args[0]]=(shape==='change'?vars[args[0]]:0)+expression(args[1],vars); continue;
      }
      if (['move','rotate','scale','color'].includes(shape)) {
        if(args.length !== (shape==='color'?1:3)) throw Error(shape+' needs '+(shape==='color'?1:3)+' values.');
        const v=args.map(a=>expression(a,vars));
        if(shape==='move' && v.some(n=>Math.abs(n)>500)) throw Error('Move values must stay within ±500 mm.');
        if(shape==='scale' && v.some(n=>n<=0 || n>10)) throw Error('Scale factors must be above 0 and at most 10.');
        state[shape]=shape==='color'?v[0]:v; continue;
      }
      if (!['box','sphere','cylinder'].includes(shape)) throw Error('Choose box, sphere or cylinder.');
      if(args.length!==10) throw Error('A shape needs 10 values: x y z width depth height tilt orbit lean hue.');
      const values=args.map(a=>expression(a,vars));
      if(values.slice(3,6).some(n=>n<=0 || n>200)) throw Error('Shape dimensions must be above 0 and at most 200 mm.');
      if(values.slice(0,3).some(n=>Math.abs(n)>500)) throw Error('Keep positions within 500 mm of the origin.');
      result.push({shape,values,iteration:i,line:line.line,transform:structuredClone(state)});
    } catch(e) { throw Error('Line '+line.line+': '+e.message); }
  }
  }
  return result;
}
