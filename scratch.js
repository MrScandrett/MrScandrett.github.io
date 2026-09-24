const fs = require('fs');
let html = fs.readFileSync('/home/evanscandrett/Projects/MrScandrett.github.io/lessons/design/color-theory-lab.html', 'utf8');

// 1. Fix side panel buttons
html = html.replace(
  /<button class="ll-preset" data-preset="analogous" onclick="document.querySelector\('\\[data-harmony=\\'analogous\\'\\]'\).click\(\)">Analogous<\/button>/,
  '<button class="ll-preset" data-harmony="analogous">Analogous</button>'
);
html = html.replace(
  /<button class="ll-preset" data-preset="complementary" onclick="document.querySelector\('\\[data-harmony=\\'complementary\\'\\]'\).click\(\)">Complementary<\/button>/,
  '<button class="ll-preset" data-harmony="complementary">Complementary</button>'
);
html = html.replace(
  /<button class="ll-preset" data-preset="triadic" onclick="document.querySelector\('\\[data-harmony=\\'triadic\\'\\]'\).click\(\)">Triadic<\/button>/,
  '<button class="ll-preset" data-harmony="triadic">Triadic</button>'
);
html = html.replace(
  /<button class="ll-preset" data-preset="split" onclick="document.querySelector\('\\[data-harmony=\\'split\\'\\]'\).click\(\)">Split Comp.<\/button>/,
  '<button class="ll-preset" data-harmony="split">Split Comp.</button>'
);
html = html.replace(
  /<button class="ll-preset" data-preset="monochromatic" onclick="document.querySelector\('\\[data-harmony=\\'monochromatic\\'\\]'\).click\(\)">Monochromatic<\/button>/,
  '<button class="ll-preset" data-harmony="monochromatic">Monochromatic</button>'
);

html = html.replace(
  /<button class="ll-preset" data-preset="sunrise" onclick="document.querySelector\('\\[data-preset=\\'sunrise\\'\\]'\).click\(\)">Warm Sunrise<\/button>/,
  '<button class="ll-preset" data-preset="sunrise">Warm Sunrise</button>'
);
html = html.replace(
  /<button class="ll-preset" data-preset="ocean" onclick="document.querySelector\('\\[data-preset=\\'ocean\\'\\]'\).click\(\)">Calm Ocean<\/button>/,
  '<button class="ll-preset" data-preset="ocean">Calm Ocean</button>'
);
html = html.replace(
  /<button class="ll-preset" data-preset="neon" onclick="document.querySelector\('\\[data-preset=\\'neon\\'\\]'\).click\(\)">Neon Night<\/button>/,
  '<button class="ll-preset" data-preset="neon">Neon Night</button>'
);
html = html.replace(
  /<button class="ll-preset" data-preset="museum" onclick="document.querySelector\('\\[data-preset=\\'museum\\'\\]'\).click\(\)">Museum Label<\/button>/,
  '<button class="ll-preset" data-preset="museum">Museum Label</button>'
);

// 2. Fix invalid HTML labels
html = html.replace(
  /<label class="ctl-slider-card" for="ctl-hue">\s*<div class="ctl-slider-head">\s*<strong>Hue<\/strong>/g,
  '<div class="ctl-slider-card">\n                <div class="ctl-slider-head">\n                  <label for="ctl-hue"><strong>Hue</strong></label>'
).replace(
  /<p class="ctl-slider-help">Hue changes the color family around the wheel: warm reds and oranges, balanced greens, or cool blues.<\/p>\s*<\/label>/,
  '<p class="ctl-slider-help">Hue changes the color family around the wheel: warm reds and oranges, balanced greens, or cool blues.</p>\n              </div>'
);

html = html.replace(
  /<label class="ctl-slider-card" for="ctl-sat">\s*<div class="ctl-slider-head">\s*<strong>Saturation<\/strong>/g,
  '<div class="ctl-slider-card">\n                <div class="ctl-slider-head">\n                  <label for="ctl-sat"><strong>Saturation</strong></label>'
).replace(
  /<p class="ctl-slider-help">Higher saturation makes colors louder. Lower saturation creates calmer, more muted palettes.<\/p>\s*<\/label>/,
  '<p class="ctl-slider-help">Higher saturation makes colors louder. Lower saturation creates calmer, more muted palettes.</p>\n              </div>'
);

html = html.replace(
  /<label class="ctl-slider-card" for="ctl-val">\s*<div class="ctl-slider-head">\s*<strong>Value<\/strong>/g,
  '<div class="ctl-slider-card">\n                <div class="ctl-slider-head">\n                  <label for="ctl-val"><strong>Value</strong></label>'
).replace(
  /<p class="ctl-slider-help">Value controls light and dark. Strong value contrast is often the fastest way to improve readability and hierarchy.<\/p>\s*<\/label>/,
  '<p class="ctl-slider-help">Value controls light and dark. Strong value contrast is often the fastest way to improve readability and hierarchy.</p>\n              </div>'
);


fs.writeFileSync('/home/evanscandrett/Projects/MrScandrett.github.io/lessons/design/color-theory-lab.html', html);
console.log("Modifications applied successfully.");
