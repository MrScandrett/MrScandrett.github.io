/* PixelWeather: the home weather card's pixel art (pure; no DOM, returns SVG strings).
   icon(kind) draws a 48x48 weather icon, moon(phase) a true moon phase, digits(text) big 5x7
   numerals. Two-frame icons hold their frames in .px-a / .px-b; CSS flips between them. */
(function (root) {
  'use strict';

  const COLORS = {
    W: '#ffffff', L: '#c9d6ff', B: '#7f93d9', D: '#46549e',
    Y: '#ffe14d', O: '#ff9d1c', R: '#e8452c', C: '#7cf2ff', P: '#2f7bff',
    M: '#b89cff', K: '#141a5c', G: '#f4f6ff', N: '#2a3aa8', T: '#ff5c7a'
  };

  const CLOUD = [
    '................',
    '................',
    '................',
    '................',
    '......LWWL......',
    '....LWWWWWWL....',
    '...LWWWWWWWWLL..',
    '..LWWWWWWWWWWWL.',
    '.LWWWWWWWWWWWWWL',
    '.WWWWWWWWWWWWWWW',
    '.LLLLLLLLLLLLLLB',
    '..BBBBBBBBBBBBB.'
  ];
  const GREY_CLOUD = CLOUD.map((row) => row.replace(/W/g, 'L').replace(/L(?=[^L]*$)/, 'L')
    .replace(/B/g, 'D'));
  const LOW_CLOUD = ['', '', ''].concat(CLOUD.slice(0, 12));

  const TEE = [
    '................',
    '................',
    '....XXX..XXX....',
    '..XXXXXXXXXXXX..',
    '.XXXXXXXXXXXXXX.',
    '.XXXXXXXXXXXXXX.',
    '..XX.XXXXXX.XX..',
    '.....XXXXXX.....',
    '.....XXXXXX.....',
    '.....XXXXXX.....',
    '.....XXXXXX.....',
    '.....XXXXXX.....',
    '.....XXXXXX.....',
    '................'
  ];
  const JACKET = [
    '................',
    '.....XX..XX.....',
    '....XXXWWXXX....',
    '...XXXXWWXXXX...',
    '..XXXXXWWXXXXX..',
    '..XXXXXWWXXXXX..',
    '..XX.XXWWXX.XX..',
    '..XX.XXWWXX.XX..',
    '..XX.XXWWXX.XX..',
    '..XX.XXWWXX.XX..',
    '..WW.XXWWXX.WW..',
    '.....XXWWXX.....',
    '.....XXWWXX.....',
    '................'
  ];

  function grid() { return Array.from({ length: 16 }, () => Array(16).fill('.')); }

  function paint(g, rows, map) {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x += 1) {
        let c = row[x];
        if (map && map[c]) c = map[c];
        if (c !== '.' && g[y]) g[y][x] = c;
      }
    });
    return g;
  }

  function dots(g, list, color) {
    list.forEach(([x, y]) => { if (g[y] && x >= 0 && x < 16) g[y][x] = color; });
    return g;
  }

  // A shaded disc: lit toward the top left, orange toward the bottom right.
  function sunDisc(g, cx, cy, r) {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r * r) g[y][x] = dx + dy > r * 0.7 ? 'O' : 'Y';
      }
    }
    return g;
  }

  function sunRays(g, cx, cy, frame) {
    const a = [[0, -7], [0, -6], [0, 6], [0, 7], [-7, 0], [-6, 0], [6, 0], [7, 0]];
    const b = [[-5, -5], [-4, -4], [5, 5], [4, 4], [-5, 5], [-4, 4], [5, -5], [4, -4]];
    return dots(g, (frame ? b : a).map(([x, y]) => [cx + x, cy + y]), 'Y');
  }

  function crescent(g, cx, cy, r) {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        const inMoon = (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
        const inBite = (x - cx - 3) ** 2 + (y - cy + 1) ** 2 <= (r - 1) ** 2;
        if (inMoon && !inBite) g[y][x] = y > cy + 2 ? 'O' : 'Y';
      }
    }
    return g;
  }

  function horizonSun(g, sky) {
    for (let y = 4; y < 11; y += 1) {
      for (let x = 2; x < 14; x += 1) {
        if ((x - 7.5) ** 2 + (y - 10.5) ** 2 <= 22) g[y][x] = y < 9 ? 'Y' : 'O';
      }
    }
    dots(g, [[7, 1], [8, 1], [7, 2], [8, 2], [1, 6], [2, 7], [14, 6], [13, 7], [3, 3], [12, 3]], 'Y');
    for (let x = 0; x < 16; x += 1) { g[11][x] = sky; if (x % 3) g[13][x] = 'O'; if (x % 5 > 1) g[15][x] = 'D'; }
    return g;
  }

  const KINDS = {
    sun: (f) => sunRays(sunDisc(grid(), 7.5, 7.5, 4.3), 7.5 | 0, 7, f),
    'mostly-sun': (f) => paint(sunRays(sunDisc(grid(), 6, 6, 3.6), 6, 6, f), LOW_CLOUD.map((r, i) => (i < 7 ? '' : r))),
    'partly-cloudy': (f) => paint(sunRays(sunDisc(grid(), 6, 5, 3.6), 6, 5, f), LOW_CLOUD),
    cloud: () => paint(paint(grid(), GREY_CLOUD.map((r) => r.slice(3) + '...')), LOW_CLOUD),
    fog: (f) => {
      const g = paint(grid(), GREY_CLOUD.slice(3, 10));
      const lines = f ? [[1, 9, 10], [4, 11, 11], [0, 13, 9]] : [[3, 9, 11], [1, 11, 10], [3, 13, 11]];
      lines.forEach(([x, y, n]) => { for (let i = 0; i < n; i += 1) g[y][x + i] = i % 4 === 3 ? 'B' : 'L'; });
      return g;
    },
    rain: (f) => dots(paint(grid(), GREY_CLOUD.slice(2)), f
      ? [[3, 11], [3, 12], [7, 13], [7, 14], [11, 11], [11, 12], [14, 13]]
      : [[3, 13], [3, 14], [7, 11], [7, 12], [11, 13], [11, 14], [14, 11]], 'C'),
    snow: (f) => dots(paint(grid(), GREY_CLOUD.slice(2)), f
      ? [[3, 11], [7, 13], [11, 11], [14, 14], [1, 14]]
      : [[3, 13], [7, 11], [11, 14], [14, 12], [5, 14]], 'W'),
    storm: (f) => {
      const g = paint(grid(), GREY_CLOUD.slice(2).map((r) => r.replace(/[LW]/g, 'B')));
      dots(g, f ? [[3, 12], [3, 13], [13, 12], [13, 13]] : [[4, 11], [12, 14], [12, 13]], 'C');
      return dots(g, [[9, 9], [8, 10], [7, 11], [6, 12], [7, 12], [8, 12], [7, 13], [6, 14], [5, 15]], f ? 'Y' : 'W');
    },
    moon: (f) => dots(crescent(grid(), 7, 8, 6), f ? [[12, 3], [14, 8], [10, 1]] : [[13, 5], [11, 10], [14, 1]], 'W'),
    sunrise: () => horizonSun(grid(), 'R'),
    sunset: () => horizonSun(grid(), 'M'),
    tee: () => paint(grid(), TEE, { X: 'C' }),
    jacket: () => paint(grid(), JACKET, { X: 'O' }),
    coat: () => paint(grid(), JACKET, { X: 'M' })
  };

  const ANIMATED = new Set(['sun', 'mostly-sun', 'partly-cloudy', 'fog', 'rain', 'snow', 'storm', 'moon']);

  // One path per colour, one horizontal run per subpath: far fewer nodes than a rect per pixel.
  function runs(g) {
    const byColor = {};
    g.forEach((row, y) => {
      for (let x = 0; x < row.length;) {
        const c = row[x];
        let end = x + 1;
        while (end < row.length && row[end] === c) end += 1;
        if (c !== '.') byColor[c] = (byColor[c] || '') + `M${x} ${y}h${end - x}v1h-${end - x}z`;
        x = end;
      }
    });
    return Object.keys(byColor).map((c) => `<path fill="${COLORS[c]}" d="${byColor[c]}"/>`).join('');
  }

  function wrap(body, w, h, cls) {
    return `<svg class="px ${cls}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${body}</svg>`;
  }

  // Draw at the final pixel grid: curves and highlights gain real detail rather
  // than simply enlarging the original 16-pixel silhouettes.
  const SIZE = 48;
  function weatherArt(kind, frame) {
    const g = Array.from({ length: SIZE }, () => Array(SIZE).fill('.'));
    const fill = (test, shade) => {
      for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        if (test(x, y)) g[y][x] = typeof shade === 'function' ? shade(x, y) : shade;
      }
    };
    const disc = (cx, cy, r, shade) => fill((x, y) => (x-cx)**2 + (y-cy)**2 <= r*r, shade);
    const sun = (cx, cy, r) => {
      fill((x, y) => {
        const dx=x-cx, dy=y-cy, d=Math.hypot(dx,dy);
        const angle=Math.atan2(dy,dx) + frame * .12;
        return d > r+2 && d < r+7 && Math.abs(Math.sin(angle*6)) < .23;
      }, 'Y');
      disc(cx,cy,r,(x,y)=> x+y < cx+cy-r*.4 ? 'W' : x+y > cx+cy+r*.5 ? 'O' : 'Y');
    };
    const cloud = (cx, cy, dark = false, small = false) => {
      const k=small ? .78 : 1;
      const lobes=[[-12,1,7],[-5,-4,10],[6,-2,9],[14,3,6]];
      fill((x,y)=>lobes.some(([dx,dy,r])=>(x-cx-dx*k)**2+(y-cy-dy*k)**2 <= (r*k)**2),
        (x,y)=> y>cy+5*k ? (dark?'D':'B') : y>cy+2*k ? (dark?'B':'L') : y<cy-3*k && x<cx+7*k ? (dark?'L':'W') : (dark?'B':'G'));
    };
    if (kind==='sun') sun(24,24,11);
    if (kind==='mostly-sun' || kind==='partly-cloudy') {
      sun(17,17,9);
      cloud(27,31,false,kind==='mostly-sun');
    }
    if (kind==='cloud') { cloud(20,20,true,true); cloud(25,29); }
    if (['rain','snow','storm','fog'].includes(kind)) {
      cloud(24,20,kind!=='snow');
      if (kind==='fog') {
        for(let i=0;i<3;i++) fill((x,y)=> y>=33+i*5 && y<=34+i*5 && x>=6+(i%2)*5+frame*2 && x<=39-(i%2)*3, i===1?'B':'L');
      } else if(kind==='snow') {
        for(const [cx,cy] of [[10,35],[24,40],[38,34]]) {
          const yy=cy+frame*2;
          fill((x,y)=>Math.abs(x-cx)<=3 && Math.abs(y-yy)<=3 && (x===cx || y===yy || Math.abs(x-cx)===Math.abs(y-yy)), 'W');
        }
      } else {
        for(const [cx,cy] of [[9,34],[20,39],[32,34],[41,39]]) {
          const yy=cy+frame*3;
          fill((x,y)=> y>=yy-3 && y<=yy+2 && Math.abs(x-cx+(y-yy)*.35)<1.2, 'C');
        }
        if(kind==='storm') fill((x,y)=> y>=24 && y<45 && (y<34 ? x>=27-(y-24)*.65 && x<=32-(y-24)*.5 : x>=20 && x<=29-(y-34)*.85), frame?'Y':'W');
      }
    }
    if(kind==='moon') {
      disc(23,24,17,(x,y)=> y>32?'L':'G');
      fill((x,y)=>(x-30)**2+(y-18)**2<16**2,'.');
      for(const [x,y] of [[36,7],[40,25],[31,39]]) {
        fill((xx,yy)=> (xx===x && Math.abs(yy-y)<=2) || (yy===y && Math.abs(xx-x)<=2), frame?'L':'W');
      }
    }
    if(kind==='sunrise' || kind==='sunset') {
      sun(24,30,13);
      fill((x,y)=>y>=31,'.');
      fill((x,y)=>y===31 || y===32,kind==='sunrise'?'O':'M');
      for(let i=0;i<3;i++) fill((x,y)=> y===36+i*4 && Math.abs(x-24)<14-i*4, i?'B':'O');
    }
    return g;
  }

  function icon(kind) {
    kind = KINDS[kind] ? kind : 'cloud';
    // Clothing remains in its established 16-pixel style.
    const clothing = ['tee','jacket','coat'].includes(kind);
    const draw = f => clothing ? KINDS[kind](f) : weatherArt(kind,f);
    const body = ANIMATED.has(kind)
      ? `<g class="px-a">${runs(draw(0))}</g><g class="px-b">${runs(draw(1))}</g>`
      : runs(draw(0));
    return wrap(body, clothing ? 16 : SIZE, clothing ? 16 : SIZE, 'px-icon');
  }

  // phase: 0 new, .25 first quarter, .5 full, .75 last quarter.
  function moon(phase) {
    const p = ((phase % 1) + 1) % 1;
    const c = Math.cos(2 * Math.PI * p);
    const g = Array.from({ length: SIZE }, () => Array(SIZE).fill('.'));
    const craters = [[17,14,4],[29,20,5],[18,31,5],[31,34,3],[11,23,2]];
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const dx = x - 23.5, dy = y - 23.5, r=21.5;
        if (dx*dx+dy*dy>r*r) continue;
        const half = Math.sqrt(r*r-dy*dy);
        const lit = p < .5 ? dx > half*c : dx < -half*c;
        const crater = craters.some(([cx,cy,rr])=>(x-cx)**2+(y-cy)**2<rr*rr);
        const rim = dx*dx+dy*dy>(r-1.5)**2;
        g[y][x] = lit ? (rim?'B':crater?'L':'G') : (crater?'K':'N');
      }
    }
    return wrap(runs(g), SIZE, SIZE, 'px-icon px-moon');
  }

  const GLYPHS = {
    0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
    1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    2: ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
    3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
    4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
    5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
    6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
    7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
    '-': ['000', '000', '000', '111', '000', '000', '000'],
    ':': ['0', '1', '1', '0', '1', '1', '0'],
    '°': ['111', '101', '111', '000', '000', '000', '000']
  };

  // Rows step from white to gold like a limited broadcast palette; `flat` keeps one colour
  // and `bold` doubles each stroke for the big temperature.
  const BANDS = ['#ffffff', '#ffffff', '#fff6c8', '#ffec8a', '#ffe14d', '#ffc933', '#ffae1f'];

  function digits(text, options) {
    const flat = options && options.flat;
    const bold = options && options.bold ? 1 : 0;
    const shadow = !(options && options.shadow === false);
    const dark = [];
    let x = 0;
    const bands = Array(7).fill('');
    String(text).split('').forEach((ch) => {
      const glyph = GLYPHS[ch];
      if (!glyph) { x += 3; return; }
      const stroke = ch === '°' ? 0 : bold;
      glyph.forEach((row, y) => {
        for (let i = 0; i < row.length; i += 1) {
          if (row[i] === '1') {
            bands[y] += `M${x + i} ${y}h${1 + stroke}v1h-${1 + stroke}z`;
            dark.push(`M${x + i + 1} ${y + 1}h${1 + stroke}v1h-${1 + stroke}z`);
          }
        }
      });
      x += glyph[0].length + 1 + stroke;
    });
    const width = Math.max(1, x - 1 + (shadow ? 1 : 0));
    const height = 7 + (shadow ? 1 : 0);
    const back = shadow ? `<path fill="#05072e" d="${dark.join('')}"/>` : '';
    const front = flat
      ? `<path fill="currentColor" d="${bands.join('')}"/>`
      : bands.map((d, y) => (d ? `<path fill="${BANDS[y]}" d="${d}"/>` : '')).join('');
    return wrap(back + front, width, height, 'px-digits');
  }

  const api = { icon, moon, digits, kinds: Object.keys(KINDS) };
  root.PixelWeather = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
