/* Grove IDE (#grove-ide on the Sensor Modules lesson): pick a board and a preset
   sketch for the Grove Beginner Kit, edit it, check it, then hand it to Arduino
   IDE 2 / the Cloud Editor / App Lab with steps for that board. Students can
   import their own .ino files or preset packs and save edits as their own
   presets; everything stays in this browser (localStorage). The boards, pins,
   presets and checks are assets/js/lessons/grove-ide-core.mjs. */
import {
  BOARDS, BOARD_IDS, PRESETS, presetById, renderPreset, retarget, wiringFor,
  checkSketch, launchSteps, sketchFileName, parseImport, exportPack
} from './grove-ide-core.mjs';

const root = document.querySelector('[data-grove-ide]');
if (root) start(root);

function start(root) {
  const $ = (sel) => root.querySelector(sel);
  const STORE = 'grove-ide-v1';
  const ui = {
    board: $('[data-gide="board"]'), preset: $('[data-gide="preset"]'), code: $('[data-gide="code"]'),
    lines: $('[data-gide="lines"]'), blurb: $('[data-gide="blurb"]'), art: $('[data-gide="art"]'),
    wiring: $('[data-gide="wiring"]'), problems: $('[data-gide="problems"]'), libs: $('[data-gide="libs"]'),
    steps: $('[data-gide="steps"]'), status: $('[data-gide="status"]'), file: $('[data-gide="file"]'),
    print: $('[data-gide="print"]'), forget: $('[data-gide="forget"]'), cloud: $('[data-gide="cloud"]'),
    boardName: root.querySelectorAll('[data-gide="board-name"]')
  };

  const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } };
  const saved = load();
  const state = {
    board: BOARDS[saved.board] ? saved.board : 'lotus',
    sel: typeof saved.sel === 'string' ? saved.sel : 'p:blink',
    mine: Array.isArray(saved.mine) ? saved.mine.filter((m) => m && typeof m.code === 'string' && typeof m.id === 'string') : [],
    code: typeof saved.code === 'string' ? saved.code : null
  };
  if (!selected()) state.sel = 'p:blink';
  if (state.code == null) state.code = original();

  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORE, JSON.stringify({ board: state.board, sel: state.sel, mine: state.mine, code: state.code })); }
      catch { note('Couldn’t save in this browser (private window?). Download the .ino to keep your work.', 'warn'); }
    }, 300);
  }
  function note(text, kind) { ui.status.textContent = text; ui.status.dataset.kind = kind || ''; }

  // What's chosen in the Sketch menu: a built-in preset or one of the student's own.
  function selected() {
    const [kind, id] = state.sel.split(/:(.*)/s);
    if (kind === 'p') { const p = presetById(id); return p && { kind, id, title: p.title, preset: p }; }
    if (kind === 'm') { const m = state.mine.find((x) => x.id === id); return m && { kind, id, title: m.title, mine: m }; }
    return null;
  }
  // The selection's code before any edits, for this board.
  function original() {
    const s = selected();
    if (s.preset) return renderPreset(s.preset, state.board);
    const m = s.mine;
    return m.board && m.board !== state.board ? retarget(m.code, m.board, state.board).code : m.code;
  }
  const edited = () => state.code.trim() !== original().trim();

  // ---- Menus ---------------------------------------------------------------
  for (const id of BOARD_IDS) ui.board.append(new Option(BOARDS[id].name, id));
  function fillPresets() {
    ui.preset.textContent = '';
    const group = (label, items) => {
      if (!items.length) return;
      const g = document.createElement('optgroup');
      g.label = label;
      for (const [value, text] of items) g.append(new Option(text, value));
      ui.preset.append(g);
    };
    group('One module at a time', PRESETS.filter((p) => p.group === 'module').map((p) => ['p:' + p.id, p.title]));
    group('Projects', PRESETS.filter((p) => p.group === 'project').map((p) => ['p:' + p.id, p.title]));
    group('My presets', state.mine.map((m) => ['m:' + m.id, m.title]));
    ui.preset.value = state.sel;
  }

  // ---- Editor --------------------------------------------------------------
  function setCode(code) { state.code = code; ui.code.value = code; refresh(); }
  function numberLines() {
    const n = ui.code.value.split('\n').length;
    if (ui.lines.dataset.n === String(n)) return;
    ui.lines.dataset.n = String(n);
    ui.lines.textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n');
  }
  ui.code.addEventListener('scroll', () => { ui.lines.scrollTop = ui.code.scrollTop; });

  // Tab indents (two spaces) like the Arduino IDE; Esc then Tab leaves the editor.
  let escaped = false;
  ui.code.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { escaped = true; return; }
    if (e.key === 'Tab' && !escaped && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const { selectionStart: a, selectionEnd: b, value } = ui.code;
      const lineStart = value.lastIndexOf('\n', a - 1) + 1;
      if (e.shiftKey) {
        if (value.startsWith('  ', lineStart)) {
          ui.code.setRangeText('', lineStart, lineStart + 2, 'preserve');
        }
      } else if (a === b) {
        ui.code.setRangeText('  ', a, b, 'end');
      } else {
        const block = value.slice(lineStart, b).replace(/^/gm, '  ');
        ui.code.setRangeText(block, lineStart, b, 'select');
      }
      ui.code.dispatchEvent(new Event('input'));
    }
    escaped = false;
  });

  let checkTimer = 0;
  ui.code.addEventListener('input', () => {
    state.code = ui.code.value;
    numberLines();
    ui.print.textContent = state.code;
    save();
    clearTimeout(checkTimer);
    checkTimer = setTimeout(refresh, 350);
  });

  function goToLine(line) {
    if (!line) return;
    const lines = ui.code.value.split('\n');
    let pos = 0;
    for (let i = 0; i < line - 1 && i < lines.length; i++) pos += lines[i].length + 1;
    ui.code.focus();
    ui.code.setSelectionRange(pos, pos + (lines[line - 1] || '').length);
    const lh = parseFloat(getComputedStyle(ui.code).lineHeight) || 20;
    ui.code.scrollTop = Math.max(0, (line - 4) * lh);
  }

  // ---- Side panel ----------------------------------------------------------
  function drawBoard() {
    const b = BOARDS[state.board];
    ui.boardName.forEach((el) => { el.textContent = b.short; });
    ui.art.textContent = '';
    if (b.art && window.ArduinoArt) {
      try {
        const h = window.ArduinoArt.svg(b.art, { labels: false, title: b.name });
        ui.art.append(h.svg);
      } catch { /* the picture is a nicety; the table says it all */ }
    } else {
      const card = document.createElement('p');
      card.className = 'gide-kitcard';
      card.textContent = b.builtIn
        ? 'The kit board as it comes in the box: ten modules, already wired. Choose “Arduino Uno” in the Arduino IDE.'
        : b.name;
      ui.art.append(card);
    }
    ui.wiring.textContent = '';
    for (const row of wiringFor(state.board)) {
      const tr = document.createElement('tr');
      const a = document.createElement('td'), c = document.createElement('td');
      a.textContent = row.name;
      c.textContent = row.where + (row.moved ? ' (moved: this board has no A6)' : '');
      if (row.moved) tr.className = 'gide-moved';
      tr.append(a, c);
      ui.wiring.append(tr);
    }
    ui.cloud.hidden = b.tool === 'applab';
  }

  function refresh() {
    const s = selected();
    const result = checkSketch(state.code, state.board);
    numberLines();
    ui.print.textContent = state.code;
    ui.blurb.textContent = s.preset ? s.preset.blurb : 'Your own preset' + (s.mine.board ? ', saved for the ' + BOARDS[s.mine.board].short : '') + '.';
    ui.forget.hidden = s.kind !== 'm';

    ui.problems.textContent = '';
    const items = [...result.errors.map((p) => ['error', p]), ...result.warnings.map((p) => ['warn', p])];
    if (!items.length) {
      const li = document.createElement('li');
      li.className = 'gide-ok';
      li.textContent = 'No problems found. (This checks the common mistakes; Arduino’s compiler has the last word.)';
      ui.problems.append(li);
    }
    for (const [kind, p] of items) {
      const li = document.createElement('li');
      li.className = 'gide-' + kind;
      if (p.line) {
        const go = document.createElement('button');
        go.type = 'button';
        go.className = 'gide-line';
        go.textContent = 'Line ' + p.line;
        go.addEventListener('click', () => goToLine(p.line));
        li.append(go, ' ');
      }
      li.append(p.text);
      ui.problems.append(li);
    }

    ui.libs.textContent = '';
    if (!result.libraries.length) {
      const li = document.createElement('li');
      li.textContent = 'None: this sketch uses only what comes with Arduino.';
      ui.libs.append(li);
    }
    for (const l of result.libraries) {
      const li = document.createElement('li');
      const strong = document.createElement('strong');
      strong.textContent = l.name;
      li.append(strong, ' — ' + l.how);
      ui.libs.append(li);
    }

    ui.steps.textContent = '';
    for (const step of launchSteps(state.board, sketchFileName(s.title), result.libraries)) {
      const li = document.createElement('li');
      li.textContent = step;
      ui.steps.append(li);
    }
    return result;
  }

  // ---- Actions -------------------------------------------------------------
  ui.board.addEventListener('change', () => {
    const from = state.board, to = ui.board.value;
    const { code, changed } = retarget(state.code, from, to);
    state.board = to;
    drawBoard();
    setCode(code);
    save();
    note(changed.length ? 'Moved to the ' + BOARDS[to].short + '. Changed ' + changed.join(', ') + '.' : 'Now set up for the ' + BOARDS[to].short + '. No pins needed to change.');
  });

  ui.preset.addEventListener('change', () => {
    if (edited() && !confirm('Load “' + ui.preset.selectedOptions[0].text + '”? Your changes to this sketch will be replaced. (Save as my preset first to keep them.)')) {
      ui.preset.value = state.sel;
      return;
    }
    state.sel = ui.preset.value;
    setCode(original());
    save();
    note('Loaded “' + selected().title + '” for the ' + BOARDS[state.board].short + '.');
  });

  const act = (name, fn) => $('[data-gide-act="' + name + '"]').addEventListener('click', fn);

  act('check', () => {
    const r = refresh();
    const n = r.errors.length, w = r.warnings.length;
    note(n ? n + (n === 1 ? ' problem' : ' problems') + ' to fix before uploading.' : w ? 'No errors. ' + w + (w === 1 ? ' thing' : ' things') + ' to look at.' : 'No problems found.', n ? 'error' : '');
    ui.problems.closest('details')?.setAttribute('open', '');
  });

  act('copy', async () => {
    try { await navigator.clipboard.writeText(state.code); }
    catch {
      ui.code.focus(); ui.code.select();
      if (!document.execCommand('copy')) { note('Couldn’t copy. Select the code and press Ctrl+C (⌘C).', 'warn'); return; }
    }
    note('Copied. Paste it into Arduino IDE, the Cloud Editor or App Lab.');
  });

  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  act('download', () => {
    const r = checkSketch(state.code, state.board);
    const name = sketchFileName(selected().title);
    download(name + '.ino', state.code.endsWith('\n') ? state.code : state.code + '\n', 'text/plain');
    note('Downloaded ' + name + '.ino.' + (r.errors.length ? ' It still has ' + r.errors.length + ' problem(s) from Check.' : ' Open it in Arduino IDE 2 and follow the steps.'), r.errors.length ? 'warn' : '');
  });

  act('reset', () => {
    if (edited() && !confirm('Undo all your changes to this sketch?')) return;
    setCode(original());
    save();
    note('Back to the original sketch.');
  });

  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  act('save', () => {
    const s = selected();
    const title = (prompt('Name for this preset:', s.kind === 'm' ? s.title : 'My ' + s.title) || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!title) return;
    const existing = state.mine.find((m) => m.title.toLowerCase() === title.toLowerCase());
    if (existing) { existing.code = state.code; existing.board = state.board; state.sel = 'm:' + existing.id; }
    else {
      if (state.mine.length >= 50) { note('You have 50 presets. Delete one first.', 'warn'); return; }
      const m = { id: newId(), title, board: state.board, code: state.code };
      state.mine.push(m); state.sel = 'm:' + m.id;
    }
    fillPresets(); refresh(); save();
    note('Saved “' + title + '” in My presets (in this browser).');
  });

  act('forget', () => {
    const s = selected();
    if (s.kind !== 'm' || !confirm('Delete your preset “' + s.title + '” from this browser?')) return;
    state.mine = state.mine.filter((m) => m.id !== s.id);
    state.sel = 'p:blink';
    fillPresets(); setCode(original()); save();
    note('Deleted “' + s.title + '”.');
  });

  act('export', () => {
    const s = selected();
    const list = state.mine.length ? state.mine : [{ title: s.title, board: state.board, code: state.code }];
    download('grove-presets.json', exportPack(list), 'application/json');
    note(state.mine.length ? 'Downloaded ' + state.mine.length + ' preset(s) as grove-presets.json. Anyone can Import it.' : 'You have no saved presets yet, so this pack holds the sketch on screen.');
  });

  act('import', () => ui.file.click());
  ui.file.addEventListener('change', async () => {
    const f = ui.file.files[0];
    ui.file.value = '';
    if (f) await importFile(f);
  });
  // Dropping a file anywhere on the IDE imports it too.
  root.addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); root.dataset.drop = ''; } });
  root.addEventListener('dragleave', (e) => { if (!root.contains(e.relatedTarget)) delete root.dataset.drop; });
  root.addEventListener('drop', (e) => {
    const f = e.dataTransfer?.files?.[0];
    delete root.dataset.drop;
    if (!f) return;
    e.preventDefault();
    importFile(f);
  });

  async function importFile(file) {
    if (file.size > 256 * 1024) { note('That file is too big to be a sketch.', 'error'); return; }
    let got;
    try { got = parseImport(file.name, await file.text()); }
    catch (err) { note(err.message, 'error'); return; }
    if (state.mine.length + got.presets.length > 50) { note('That would make more than 50 presets. Delete some first.', 'error'); return; }
    if (edited() && !confirm('Import “' + file.name + '”? Your changes to the sketch on screen will be replaced. (Save as my preset first to keep them.)')) return;
    let last = null;
    for (const p of got.presets) {
      let title = p.title, n = 2;
      while (state.mine.some((m) => m.title === title)) title = p.title + ' (' + n++ + ')';
      last = { id: newId(), title, board: p.board, code: p.code };
      state.mine.push(last);
    }
    state.sel = 'm:' + last.id;
    fillPresets(); setCode(original()); save();
    note(got.presets.length === 1 ? 'Imported “' + last.title + '” into My presets.' : 'Imported ' + got.presets.length + ' presets into My presets.');
  }

  // ---- Go -----------------------------------------------------------------
  ui.board.value = state.board;
  fillPresets();
  drawBoard();
  ui.code.value = state.code;
  refresh();
  root.dataset.ready = '';
}
