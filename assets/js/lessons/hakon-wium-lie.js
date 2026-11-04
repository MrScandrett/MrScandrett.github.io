// The preview uses real author CSS in an isolated document. User origin is
// explicitly modeled: page scripts cannot install a browser user stylesheet.
(() => {
  const lab = document.getElementById('hwl-cascade-lab');
  if (!lab) return;
  const get = id => document.getElementById(`hwl-${id}`);
  const scenarios = {
    order: { question: 'Both selectors have specificity (0, 1, 0). Which color wins?', why: 'Blue wins: these normal author declarations have equal specificity, so the later one wins.', rules: [ ['.announcement', '#9f1239', 'Earlier author rule'], ['.announcement', '#1e40af', 'Later author rule'] ] },
    specificity: { question: 'The class rule comes last. Can it beat an ID?', why: 'Rose wins: the ID (1, 0, 0) beats the class (0, 1, 0). Source order breaks ties; it does not outweigh specificity.', rules: [ ['#notice', '#9f1239', 'ID · (1, 0, 0)'], ['.announcement', '#1e40af', 'Class · (0, 1, 0)'] ] },
    important: { question: 'Does a normal ID declaration beat an important class declaration?', why: 'Green wins: importance is considered before specificity. Avoid using !important as a routine fix; understand the conflict first.', rules: [ ['#notice', '#9f1239', 'Normal author declaration'], ['.announcement', '#166534', 'Important author declaration', true] ] },
    reader: { question: 'Both declarations are important. Which origin takes priority?', why: 'Yellow wins: important user declarations take priority over important author declarations. This models a user stylesheet; prefers-contrast alone does not create user-origin CSS or automatically override an author rule.', rules: [ ['#notice', '#9f1239', 'Author origin · important', true], ['.announcement', '#ffff00', 'User origin · important (modeled)', true] ] }
  };
  let key = 'order';
  let enabled = [true, true];
  let revealed = false;
  function render() {
    const sc = scenarios[key];
    const indexes = enabled.flatMap((on, i) => on ? [i] : []);
    const winner = indexes.length === 2 ? (key === 'specificity' ? 0 : 1) : indexes[0];
    get('rule-stack').replaceChildren(...sc.rules.map((rule, i) => {
      const item = document.createElement('label');
      item.className = 'hwl-rule-item';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox'; checkbox.checked = enabled[i];
      checkbox.setAttribute('aria-label', `Enable ${rule[2]}`);
      checkbox.addEventListener('change', () => { enabled[i] = checkbox.checked; render(); get('rule-stack').querySelectorAll('input')[i].focus(); });
      const title = document.createElement('span'); title.className = 'hwl-rule-source';
      title.textContent = rule[2] + (revealed ? (!enabled[i] ? ' · Disabled' : i === winner ? ' · Winning color' : ' · Overridden color') : '');
      const code = document.createElement('code'); code.textContent = `${rule[0]} { color: ${rule[1]}${rule[3] ? ' !important' : ''}; }`;
      item.append(checkbox, title, code);
      return item;
    }));
    // For reader mode, supply the origin winner as an author declaration in
    // isolation. The UI clearly labels this one case as a model, not native origin.
    const css = key === 'reader'
      ? (winner === undefined ? '' : `#notice { color: ${sc.rules[winner][1]} !important; }`)
      : sc.rules.filter((_, i) => enabled[i]).map(r => `${r[0]} {color:${r[1]}${r[3] ? ' !important' : ''}}`).join('\n');
    get('preview').srcdoc = `<!doctype html><html lang="en"><meta charset="utf-8"><style>body{margin:0;padding:32px 20px;background:${key === 'reader' && winner === 1 ? '#111827' : '#ffffff'};color:${'#111827'};font:700 24px/1.5 system-ui}p{margin:0}${css}</style><p id="notice" class="announcement">The web is for everyone.</p></html>`;
    get('question').textContent = sc.question;
    get('result').hidden = !revealed;
    get('curtain').hidden = revealed;
    get('reveal').hidden = revealed;
    get('explanation').textContent = revealed ? (enabled.every(Boolean) ? sc.why : indexes.length ? 'With only one matching color declaration enabled, it wins. Re-enable the other rule to compare them.' : 'No example color declarations remain. The paragraph inherits the preview’s base text color.') : '';
  }
  get('preview').addEventListener('load', () => {
    const frame = get('preview');
    const paragraph = frame.contentDocument?.getElementById('notice');
    if (paragraph) get('computed').textContent = `Computed color: ${frame.contentWindow.getComputedStyle(paragraph).color}${key === 'reader' ? ' · modeled user origin' : ''}`;
  });
  lab.querySelectorAll('[data-scenario]').forEach(button => button.addEventListener('click', () => {
    key = button.dataset.scenario; enabled = [true, true]; revealed = false;
    lab.querySelectorAll('[data-scenario]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    render();
  }));
  get('reveal').addEventListener('click', () => { revealed = true; render(); });
  render();
})();
