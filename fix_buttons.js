const fs = require('fs');
let html = fs.readFileSync('/home/evanscandrett/Projects/MrScandrett.github.io/lessons/design/color-theory-lab.html', 'utf8');

// Use exact string replacement to avoid regex escaping issues
const replacements = [
  [
    `<button class="ll-preset" data-preset="analogous" onclick="document.querySelector('[data-harmony=\\'analogous\\']').click()">Analogous</button>`,
    `<button class="ll-preset" data-harmony="analogous">Analogous</button>`
  ],
  [
    `<button class="ll-preset" data-preset="complementary" onclick="document.querySelector('[data-harmony=\\'complementary\\']').click()">Complementary</button>`,
    `<button class="ll-preset" data-harmony="complementary">Complementary</button>`
  ],
  [
    `<button class="ll-preset" data-preset="triadic" onclick="document.querySelector('[data-harmony=\\'triadic\\']').click()">Triadic</button>`,
    `<button class="ll-preset" data-harmony="triadic">Triadic</button>`
  ],
  [
    `<button class="ll-preset" data-preset="split" onclick="document.querySelector('[data-harmony=\\'split\\']').click()">Split Comp.</button>`,
    `<button class="ll-preset" data-harmony="split">Split Comp.</button>`
  ],
  [
    `<button class="ll-preset" data-preset="monochromatic" onclick="document.querySelector('[data-harmony=\\'monochromatic\\']').click()">Monochromatic</button>`,
    `<button class="ll-preset" data-harmony="monochromatic">Monochromatic</button>`
  ],
  [
    `<button class="ll-preset" data-preset="sunrise" onclick="document.querySelector('[data-preset=\\'sunrise\\']').click()">Warm Sunrise</button>`,
    `<button class="ll-preset" data-preset="sunrise">Warm Sunrise</button>`
  ],
  [
    `<button class="ll-preset" data-preset="ocean" onclick="document.querySelector('[data-preset=\\'ocean\\']').click()">Calm Ocean</button>`,
    `<button class="ll-preset" data-preset="ocean">Calm Ocean</button>`
  ],
  [
    `<button class="ll-preset" data-preset="neon" onclick="document.querySelector('[data-preset=\\'neon\\']').click()">Neon Night</button>`,
    `<button class="ll-preset" data-preset="neon">Neon Night</button>`
  ],
  [
    `<button class="ll-preset" data-preset="museum" onclick="document.querySelector('[data-preset=\\'museum\\']').click()">Museum Label</button>`,
    `<button class="ll-preset" data-preset="museum">Museum Label</button>`
  ]
];

let changed = 0;
for (const [search, replace] of replacements) {
  if (html.includes(search)) {
    html = html.replace(search, replace);
    changed++;
  }
}

fs.writeFileSync('/home/evanscandrett/Projects/MrScandrett.github.io/lessons/design/color-theory-lab.html', html);
console.log(`Replaced ${changed} button instances.`);
