const fs = require('fs');

// Fix JS file
let js = fs.readFileSync('/home/evanscandrett/Projects/MrScandrett.github.io/assets/js/lessons/living-things-explorer.js', 'utf8');

js = js.replace(
  "cardEl.classList.add('placed');\n      cardEl.setAttribute('aria-pressed', 'false');",
  "cardEl.classList.add('placed');\n      cardEl.setAttribute('aria-pressed', 'false');\n      cardEl.disabled = true;"
);

js = js.replace(
  "btn.setAttribute('aria-selected', key === self.activeKey ? 'true' : 'false');",
  "btn.setAttribute('aria-selected', key === self.activeKey ? 'true' : 'false');\n      btn.setAttribute('role', 'tab');"
);

js = js.replace(
  "cardEl.classList.add('placed');\n      var slot = document.createElement('span');",
  "cardEl.classList.add('placed');\n      cardEl.disabled = true;\n      var slot = document.createElement('span');"
);

fs.writeFileSync('/home/evanscandrett/Projects/MrScandrett.github.io/assets/js/lessons/living-things-explorer.js', js);


// Fix HTML file
let html = fs.readFileSync('/home/evanscandrett/Projects/MrScandrett.github.io/lessons/life-sciences/living-things-explorer.html', 'utf8');

html = html.replace('<div class="lte-cycle-tabs"></div>', '<div class="lte-cycle-tabs" role="tablist"></div>');
html = html.replace('id="lte-score-total">0 / 28</span>', 'id="lte-score-total">0 / 24</span>');

fs.writeFileSync('/home/evanscandrett/Projects/MrScandrett.github.io/lessons/life-sciences/living-things-explorer.html', html);

console.log("Fixed LTE files");
