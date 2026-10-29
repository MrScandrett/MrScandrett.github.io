(() => {
  'use strict';

  // Learning Egyptian Hieroglyphs: every interactive in the lesson.
  // Glyphs are Unicode Egyptian Hieroglyphs (U+13000–U+1342E) drawn with the local Noto font;
  // Gardiner numbers come from the Unicode character names.

  const $ = id => document.getElementById(id);
  const root = document.querySelector('.as-page.egyptian');
  if (!root) return;

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value === false || value == null) continue;
      if (key === 'class') el.className = value;
      else if (key === 'text') el.textContent = value;
      else el.setAttribute(key, value === true ? '' : value);
    }
    kids.flat().forEach(kid => { if (kid != null) el.append(kid); });
    return el;
  }
  const glyph = (text, cls = '') => h('span', { class: `eg-g ${cls}`.trim(), 'aria-hidden': 'true', text });
  const shuffle = list => {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* private window */ } }
  };

  // --- 1. SIGN DATA ---
  // The 24 uniliterals in standard Egyptological order, plus extras used by Ptolemaic scribes.
  const UNILITERALS = [
    { id: 'ꜣ', glyph: '𓄿', pic: 'Egyptian vulture', gardiner: 'G1', sound: 'a glottal stop, often read “a”' },
    { id: 'j', glyph: '𓇋', pic: 'flowering reed', gardiner: 'M17', sound: '“i” or “y”' },
    { id: 'ꜥ', glyph: '𓂝', pic: 'forearm', gardiner: 'D36', sound: 'a deep throat sound (ayin), often read “a”' },
    { id: 'w', glyph: '𓅱', pic: 'quail chick', gardiner: 'G43', sound: '“w” or “u”' },
    { id: 'b', glyph: '𓃀', pic: 'foot', gardiner: 'D58', sound: '“b”' },
    { id: 'p', glyph: '𓊪', pic: 'stool', gardiner: 'Q3', sound: '“p”' },
    { id: 'f', glyph: '𓆑', pic: 'horned viper', gardiner: 'I9', sound: '“f”' },
    { id: 'm', glyph: '𓅓', pic: 'owl', gardiner: 'G17', sound: '“m”' },
    { id: 'n', glyph: '𓈖', pic: 'water ripple', gardiner: 'N35', sound: '“n”' },
    { id: 'r', glyph: '𓂋', pic: 'mouth', gardiner: 'D21', sound: '“r”' },
    { id: 'h', glyph: '𓉔', pic: 'reed shelter', gardiner: 'O4', sound: '“h”' },
    { id: 'ḥ', glyph: '𓎛', pic: 'twisted flax wick', gardiner: 'V28', sound: 'a strong, breathy “h”' },
    { id: 'ḫ', glyph: '𓐍', pic: 'placenta (?)', gardiner: 'Aa1', sound: '“kh,” as in Scottish loch' },
    { id: 'ẖ', glyph: '𓄡', pic: 'animal belly and tail', gardiner: 'F32', sound: 'a softer “kh,” as in German ich' },
    { id: 'z', glyph: '𓊃', pic: 'door bolt', gardiner: 'O34', sound: '“z,” later merged with s' },
    { id: 's', glyph: '𓋴', pic: 'folded cloth', gardiner: 'S29', sound: '“s”' },
    { id: 'š', glyph: '𓈙', pic: 'pool', gardiner: 'N37', sound: '“sh”' },
    { id: 'q', glyph: '𓈎', pic: 'hill slope', gardiner: 'N29', sound: 'a “k” made far back in the throat' },
    { id: 'k', glyph: '𓎡', pic: 'basket with handle', gardiner: 'V31', sound: '“k”' },
    { id: 'g', glyph: '𓎼', pic: 'jar stand', gardiner: 'W11', sound: 'a hard “g”' },
    { id: 't', glyph: '𓏏', pic: 'bread loaf', gardiner: 'X1', sound: '“t”' },
    { id: 'ṯ', glyph: '𓍿', pic: 'tethering rope', gardiner: 'V13', sound: '“tj” or “ch”' },
    { id: 'd', glyph: '𓂧', pic: 'hand', gardiner: 'D46', sound: '“d”' },
    { id: 'ḏ', glyph: '𓆓', pic: 'cobra', gardiner: 'I10', sound: '“dj,” as in judge' }
  ];
  const EXTRAS = {
    y: { id: 'y', glyph: '𓇌', pic: 'two reeds', gardiner: 'M17A', sound: '“y” or “i”' },
    w2: { id: 'w', glyph: '𓏲', pic: 'coil of rope', gardiner: 'Z7', sound: '“w” or “u” (a variant of the quail chick)' },
    l: { id: 'l', glyph: '𓃭', pic: 'recumbent lion', gardiner: 'E23', sound: '“l,” borrowed for Greek names (in Egyptian words the lion reads rw)' },
    o: { id: 'o', glyph: '𓍯', pic: 'lasso', gardiner: 'V4', sound: '“o” or “w” in Ptolemaic spellings of Greek names' }
  };
  const SIGN = Object.fromEntries(UNILITERALS.map(s => [s.id, s]));
  Object.values(EXTRAS).forEach(s => { if (!SIGN[s.id]) SIGN[s.id] = s; });

  // --- 2. SCRIBE'S KEYBOARD & WORD MISSIONS ---
  const LINE_MAX = 16;
  const line = [];
  const lineListeners = [];
  const onLineChange = fn => lineListeners.push(fn);

  function renderLine() {
    const el = $('eg-line');
    el.replaceChildren(...line.map(s => h('span', { class: 'eg-line-sign', title: `${s.id} · ${s.pic}`, text: s.glyph })));
    el.setAttribute('aria-label', line.length ? `Scribe's line: ${line.map(s => `${s.id} (${s.pic})`).join(', ')}` : "Empty scribe's line");
    $('eg-line-translit').textContent = line.length ? `Transliteration: ${line.map(s => s.id).join('')}` : 'No signs written yet.';
    $('eg-line-count').textContent = `${line.length}/${LINE_MAX} signs`;
    $('eg-line-undo').disabled = line.length === 0;
    lineListeners.forEach(fn => fn());
  }

  function writeSign(sign) {
    const inspect = $('eg-key-inspect');
    inspect.replaceChildren(
      glyph(sign.glyph, 'eg-inspect-glyph'),
      h('span', {},
        h('strong', { text: `${sign.id} · ${sign.pic} (Gardiner ${sign.gardiner})` }),
        ` Sound: ${sign.sound}.`)
    );
    if (line.length >= LINE_MAX) {
      inspect.append(h('span', { class: 'eg-inspect-warn', text: ` Your line is full (${LINE_MAX} signs). Undo or clear to keep writing.` }));
      return;
    }
    line.push(sign);
    renderLine();
  }

  function setupKeyboard() {
    const board = $('eg-keyboard');
    UNILITERALS.forEach(sign => {
      const key = h('button', { type: 'button', class: 'eg-key', 'aria-label': `${sign.id}, ${sign.pic}, Gardiner ${sign.gardiner}` },
        glyph(sign.glyph, 'eg-key-glyph'),
        h('span', { class: 'eg-key-tr', 'aria-hidden': 'true', text: sign.id }),
        h('span', { class: 'eg-key-pic', 'aria-hidden': 'true', text: sign.pic }));
      key.addEventListener('click', () => writeSign(sign));
      board.append(key);
    });
    root.querySelectorAll('.eg-extra-key').forEach(btn => {
      const sign = EXTRAS[btn.dataset.extra];
      if (sign) btn.addEventListener('click', () => writeSign(sign));
    });
    $('eg-line-undo').addEventListener('click', () => { line.pop(); renderLine(); });
    $('eg-line-clear').addEventListener('click', () => { line.length = 0; renderLine(); });
    renderLine();
  }

  const WORDS = [
    { id: 'rn', target: ['r', 'n'], meaning: 'name', det: '', detName: 'Scribes usually wrote rn with no determinative at all.' },
    { id: 'pt', target: ['p', 't'], meaning: 'sky', det: '𓇯', detName: 'the sky sign (N1), a flat sky held up at both ends.' },
    { id: 'st', target: ['s', 't'], meaning: 'woman', det: '𓁐', detName: 'the seated woman (B1). The bread loaf t is also the usual feminine ending.' },
    { id: 'ḏd', target: ['ḏ', 'd'], meaning: 'to say', det: '𓀁', detName: 'the man with hand to mouth (A2), for speaking, eating and thinking. Scribes often left it off this very common verb.' },
    { id: 'jꜥḥ', target: ['j', 'ꜥ', 'ḥ'], meaning: 'moon', det: '𓇹', detName: 'the crescent moon (N11).' },
    { id: 'rmṯ', target: ['r', 'm', 'ṯ'], meaning: 'people', det: '𓀀𓁐𓏥', detName: 'a man, a woman and three plural strokes. Three signs together mean “people,” all of them.' },
    { id: 'ḥnqt', target: ['ḥ', 'n', 'q', 't'], meaning: 'beer', det: '𓏊', detName: 'the beer jug (W22). Beer and bread were the standard wages of Egyptian workers.' }
  ];
  let mission = WORDS[0];

  function setupWordMissions() {
    const bar = $('eg-word-missions');
    WORDS.forEach((word, i) => {
      const btn = h('button', { type: 'button', class: 'eg-mission-btn', 'aria-pressed': String(i === 0) },
        h('em', { text: word.id }), ` · “${word.meaning}”`);
      btn.addEventListener('click', () => {
        mission = word;
        bar.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
        showMission();
      });
      bar.append(btn);
    });
    $('eg-word-check').addEventListener('click', checkMission);
    showMission();
  }

  function showMission() {
    const n = mission.target.length;
    $('eg-word-task').replaceChildren(
      h('strong', { text: `Write ${mission.id}, “${mission.meaning}.” ` }),
      `Find the ${n} sign${n > 1 ? 's' : ''} for ${mission.target.join(' + ')} on the keyboard. Watch for dots and marks under letters: h and ḥ are different sounds.`
    );
    $('eg-word-feedback').textContent = 'Write signs on the line, then check.';
    $('eg-word-feedback').className = 'as-feedback';
  }

  function checkMission() {
    const fb = $('eg-word-feedback');
    const written = line.map(s => s.id);
    const target = mission.target;
    if (written.join('|') === target.join('|')) {
      const signs = target.map(id => SIGN[id].glyph).join('');
      fb.className = 'as-feedback is-right';
      fb.replaceChildren(
        h('strong', { text: '✔ Correct. ' }),
        `${mission.id}, “${mission.meaning}.” `,
        h('span', { class: 'eg-word-reveal' }, glyph(signs), mission.det ? glyph(mission.det, 'eg-det-reveal') : null),
        mission.det ? ` The last sign is a silent determinative: ${mission.detName}` : ` ${mission.detName}`
      );
      return;
    }
    fb.className = 'as-feedback is-wrong';
    if (!written.length) { fb.textContent = 'Your line is empty. Select keys to write the signs first.'; return; }
    const firstWrong = target.findIndex((id, i) => written[i] !== id);
    if (firstWrong === -1) {
      fb.textContent = `So far so good, but you wrote ${written.length} signs and ${mission.id} needs only ${target.length}. Undo the extra signs.`;
      return;
    }
    const want = SIGN[target[firstWrong]];
    const got = written[firstWrong] ? SIGN[written[firstWrong]] || line[firstWrong] : null;
    const pos = ['first', 'second', 'third', 'fourth', 'fifth'][firstWrong] || `${firstWrong + 1}th`;
    fb.textContent = got
      ? `Not yet. Your ${pos} sign is ${got.id} (${got.pic}), but ${mission.id} needs ${want.id} there. Look for the ${want.pic}.`
      : `Almost: ${mission.id} still needs a ${pos} sign, ${want.id}. Look for the ${want.pic}.`;
  }

  // --- 3. READING DIRECTION ENGINE ---
  const PHRASES = {
    recitation: {
      tr: 'ḏd mdw jn Ḥr', meaning: 'Words spoken by Horus', faces: 'falcon and cobra', faceVerb: 'face',
      signs: [['𓆓', 'cobra'], ['𓂧', 'hand'], ['𓌃', 'walking staff'], ['𓇋', 'reed'], ['𓈖', 'water ripple'], ['𓅃', 'falcon of Horus']]
    },
    son: {
      tr: 'sꜣ Rꜥ', meaning: 'Son of Ra', faces: 'pintail duck', faceVerb: 'faces',
      signs: [['𓅭', 'pintail duck'], ['𓇳', 'sun disk']]
    },
    mother: {
      tr: 'mwt', meaning: 'mother', faces: 'vulture and the seated woman', faceVerb: 'face',
      signs: [['𓅐', 'vulture'], ['𓏏', 'bread loaf'], ['𓁐', 'seated woman']]
    }
  };
  const LAYOUTS = {
    ltr: { arrow: '→', column: false, flip: false },
    rtl: { arrow: '←', column: false, flip: true },
    'col-ltr': { arrow: '↓', column: true, flip: false },
    'col-rtl': { arrow: '↓', column: true, flip: true }
  };

  function inscription(signs, { column, flip, numbered }) {
    const box = h('div', { class: `eg-ins${column ? ' is-column' : ''}${flip ? ' is-flipped' : ''}${numbered ? ' is-numbered' : ''}` });
    signs.forEach(([g, name], i) => box.append(h('span', { class: 'eg-ins-sign', 'data-n': String(i + 1), title: name }, glyph(g, 'eg-ins-glyph'))));
    return box;
  }

  function setupDirection() {
    let layout = 'ltr';
    let numbered = false;
    const stage = $('eg-dir-inscription');
    const btns = root.querySelectorAll('.eg-dir-btn');

    function render() {
      const phrase = PHRASES[$('eg-dir-phrase').value];
      const cfg = LAYOUTS[layout];
      const old = stage.firstElementChild;
      const next = inscription(phrase.signs, { ...cfg, numbered });
      // Draw the old orientation first so the glyphs visibly turn to face the new start.
      if (old && old.classList.contains('is-flipped') !== cfg.flip) next.classList.toggle('is-flipped', !cfg.flip);
      stage.replaceChildren(next);
      requestAnimationFrame(() => requestAnimationFrame(() => next.classList.toggle('is-flipped', cfg.flip)));
      stage.setAttribute('aria-label', `${phrase.tr}, “${phrase.meaning}”: ${phrase.signs.map(s => s[1]).join(', ')}, written ${cfg.column ? 'in a column' : 'in a row'} with signs facing ${cfg.flip ? 'right' : 'left'}`);
      const arrow = $('eg-dir-arrow');
      arrow.textContent = cfg.arrow;
      arrow.classList.toggle('is-column', cfg.column);
      const side = cfg.flip ? 'right' : 'left';
      const other = cfg.flip ? 'left' : 'right';
      $('eg-dir-note').textContent = cfg.column
        ? `A column: read from top to bottom. The ${phrase.faces} ${phrase.faceVerb} ${side}, so on a wall of several columns you would begin with the ${side}most column. Reading: ${phrase.tr}, “${phrase.meaning}.”`
        : `The ${phrase.faces} ${phrase.faceVerb} ${side}, so begin at the ${side} and read toward the ${other}: every creature looks toward the start of the line. Reading: ${phrase.tr}, “${phrase.meaning}.”`;
    }

    btns.forEach(btn => btn.addEventListener('click', () => {
      layout = btn.dataset.dir;
      btns.forEach(b => b.setAttribute('aria-checked', String(b === btn)));
      render();
    }));
    // Radio-group arrow keys
    root.querySelector('.eg-dir-controls').addEventListener('keydown', e => {
      const list = [...btns];
      const i = list.indexOf(document.activeElement);
      if (i < 0 || !['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const next = list[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length];
      next.focus();
      next.click();
    });
    btns.forEach(b => b.setAttribute('tabindex', b.getAttribute('aria-checked') === 'true' ? '0' : '-1'));
    btns.forEach(b => b.addEventListener('click', () => btns.forEach(o => o.setAttribute('tabindex', o === b ? '0' : '-1'))));
    $('eg-dir-phrase').addEventListener('change', render);
    const orderBtn = $('eg-dir-order');
    orderBtn.setAttribute('aria-pressed', 'false');
    orderBtn.addEventListener('click', () => {
      numbered = !numbered;
      orderBtn.setAttribute('aria-pressed', String(numbered));
      orderBtn.textContent = numbered ? 'Hide the reading order' : 'Number the reading order';
      stage.firstElementChild?.classList.toggle('is-numbered', numbered);
    });
    render();
  }

  const DRILL = [
    { tr: 'ḏd mdw jn Ḥr', creature: 'falcon', signs: PHRASES.recitation.signs },
    { tr: 'sꜣ Rꜥ', creature: 'duck', signs: PHRASES.son.signs },
    { tr: 'mwt', creature: 'vulture', signs: PHRASES.mother.signs },
    { tr: 'wnm', creature: 'hare', signs: [['𓃹', 'hare'], ['𓈖', 'water ripple'], ['𓅓', 'owl'], ['𓀁', 'man with hand to mouth']] },
    { tr: 'mḏꜣt', creature: 'owl', signs: [['𓅓', 'owl'], ['𓆓', 'cobra'], ['𓄿', 'vulture'], ['𓏏', 'bread loaf'], ['𓏛', 'papyrus roll']] },
    { tr: 'rmṯ', creature: 'seated man', signs: [['𓂋', 'mouth'], ['𓅓', 'owl'], ['𓍿', 'tethering rope'], ['𓀀', 'seated man'], ['𓁐', 'seated woman'], ['𓏥', 'plural strokes']] },
    { tr: 'jꜥḥ', creature: 'forearm', signs: [['𓇋', 'reed'], ['𓂝', 'forearm'], ['𓎛', 'flax wick'], ['𓇹', 'moon']] }
  ];

  function setupDrill() {
    let current = null;
    let last = -1;
    let score = 0;
    let tries = 0;
    let answered = false;
    const fb = $('eg-drill-feedback');

    function next() {
      let i;
      do { i = Math.floor(Math.random() * DRILL.length); } while (i === last && DRILL.length > 1);
      last = i;
      const column = Math.random() < 0.25;
      const flip = Math.random() < 0.5;
      current = { ...DRILL[i], column, flip, start: column ? 'top' : flip ? 'right' : 'left' };
      $('eg-drill-line').replaceChildren(inscription(current.signs, { column, flip }));
      $('eg-drill-line').setAttribute('aria-label', `Practice inscription with ${current.signs.length} signs, ${column ? 'in a column' : 'in a row'}, with the ${current.creature} facing ${flip ? 'right' : 'left'}`);
      fb.textContent = 'Look for a creature’s face, then choose.';
      fb.className = 'as-feedback';
      answered = false;
    }

    root.querySelectorAll('.eg-drill-answer').forEach(btn => btn.addEventListener('click', () => {
      if (!current) return;
      const right = btn.dataset.start === current.start;
      if (!answered) { tries++; if (right) score++; answered = true; }
      $('eg-drill-score').textContent = `Score: ${score} of ${tries}`;
      const facing = current.flip ? 'right' : 'left';
      fb.className = `as-feedback ${right ? 'is-right' : 'is-wrong'}`;
      if (current.column) {
        fb.textContent = right
          ? `✔ Yes. It is a single column, so start at the top. (The ${current.creature} faces ${facing}, which would tell you which column comes first on a wider wall.) It reads ${current.tr}.`
          : `✘ This is a single column, and columns are always read from the top down. The ${current.creature} facing ${facing} only tells you which column comes first.`;
      } else {
        fb.textContent = right
          ? `✔ Yes. The ${current.creature} faces ${facing}, so the line starts on the ${facing}. It reads ${current.tr}.`
          : `✘ Find the ${current.creature}: it faces ${facing}. Signs look toward the beginning of the line, so start on the ${facing}.`;
      }
    }));
    $('eg-drill-next').addEventListener('click', next);
    next();
  }

  // --- 4. ROYAL CARTOUCHE STUDIO ---
  // Each sign: [glyph, transliteration, job, reading position]. rows = how the signs stack in the loop.
  const ROYALS = [
    {
      id: 'tut', name: 'Tutankhamun', tr: 'twt-ꜥnḫ-jmn', translation: '“Living image of Amun”',
      meta: 'Birth name · 18th Dynasty · reigned c. 1332–1323 BCE',
      story: 'Born Tutankhaten, “Living image of the Aten,” the boy king changed his name when Egypt returned to the old gods. Amun’s name is written first out of respect, but it is read last. His full cartouche also adds the title “ruler of Upper Egyptian Heliopolis” (Thebes); this view shows the core name.',
      signs: [
        ['𓇋', 'j', 'Sound sign: flowering reed, j. The first of three signs spelling the god Amun.', 5],
        ['𓏠', 'mn', 'Two-consonant sign: a gaming board, mn.', 6],
        ['𓈖', 'n', 'Sound sign: water ripple, n. It repeats the n of mn, a helper called a phonetic complement.', 7],
        ['𓏏', 't', 'Sound sign: bread loaf, t.', 1],
        ['𓅱', 'w', 'Sound sign: quail chick, w.', 2],
        ['𓏏', 't', 'Sound sign: bread loaf, t. With the first two signs it spells twt, “image.”', 3],
        ['𓋹', 'ꜥnḫ', 'Three-consonant sign: the ankh, ꜥnḫ, “life” or “living.”', 4]
      ],
      rows: [[0, 1, 2], [3, 4, 5], [6]]
    },
    {
      id: 'neb', name: 'Nebkheperure', tr: 'nb-ḫprw-Rꜥ', translation: '“Lord of the manifestations of Ra”',
      meta: 'Throne name of Tutankhamun · taken at his coronation',
      story: 'Every king took a second, throne name when he was crowned. Tutankhamun’s is on the gold pectoral in the gallery. Here Ra sits at the top of the loop but is read last, and the scarab is a sound sign and a picture at the same time.',
      signs: [
        ['𓇳', 'Rꜥ', 'Word sign: the sun disk, Rꜥ, the sun god Ra. Written first out of respect, read last.', 4],
        ['𓆣', 'ḫpr', 'Three-consonant sign: the scarab beetle, ḫpr, “to come into being.”', 2],
        ['𓏥', 'w', 'Plural strokes. Here they write the ending -w, turning ḫpr into ḫprw, “manifestations.”', 3],
        ['𓎟', 'nb', 'Two-consonant sign: a basket, nb, “lord.”', 1]
      ],
      rows: [[0], [1], [2], [3]]
    },
    {
      id: 'hat', name: 'Hatshepsut', tr: 'Mꜣꜥt-kꜣ-Rꜥ', translation: '“Truth is the ka (life-force) of Ra”',
      meta: 'Throne name Maatkare · 18th Dynasty · reigned c. 1479–1458 BCE',
      story: 'Hatshepsut ruled as king, with the full royal titles, not as a queen. Her throne name is shown here; her birth name ḥꜣt-špswt, “Foremost of noble women,” filled her second cartouche. After her death many of her names were chiselled off monuments, so missing cartouches can be evidence too.',
      signs: [
        ['𓇳', 'Rꜥ', 'Word sign: the sun disk, Rꜥ (Ra). Written first out of respect, read last.', 3],
        ['𓁦', 'mꜣꜥt', 'Word sign: the goddess Maat with her feather, mꜣꜥt, “truth, right order.”', 1],
        ['𓂓', 'kꜣ', 'Two-consonant sign: raised arms, kꜣ, the ka or life-force.', 2]
      ],
      rows: [[0], [1], [2]]
    },
    {
      id: 'ram', name: 'Ramesses II', tr: 'Rꜥ-ms-sw', translation: '“Ra is the one who bore him”',
      meta: 'Birth name · 19th Dynasty · reigned 1279–1213 BCE',
      story: 'Here Ra really is the first word, so written order and reading order agree. His full cartouche adds mrj-jmn, “beloved of Amun.” Ramesses also had older kings’ cartouches recut with his own names, so a cartouche can be evidence of reuse as well as building.',
      signs: [
        ['𓇳', 'Rꜥ', 'Word sign: the sun disk, Rꜥ (Ra). The god comes first in the reading too.', 1],
        ['𓄟', 'ms', 'Two-consonant sign: three fox skins tied together, ms, “to give birth.”', 2],
        ['𓋴', 's', 'Sound sign: folded cloth, s. It confirms the s of ms (a phonetic complement).', 3],
        ['𓋴', 'sw', 'Sound sign: folded cloth, s, here writing sw, “him.” The w was not written.', 4]
      ],
      rows: [[0], [1], [2, 3]]
    },
    {
      id: 'ptol', name: 'Ptolemy V', tr: 'ptwlmys ꜥnḫ-ḏt mrj-Ptḥ', translation: '“Ptolemy, living forever, beloved of Ptah”',
      meta: 'Birth name · Ptolemaic Dynasty · reigned 204–180 BCE · the Rosetta Stone king',
      story: 'The Rosetta Stone decree (196 BCE) was issued by priests at Memphis, the city of the god Ptah. The stone has short cartouches with only the first seven signs, the version you decode in Section 5, and long ones like this, simplified here to its main signs.',
      signs: [
        ['𓊪', 'p', 'Sound sign: stool, p.', 1],
        ['𓏏', 't', 'Sound sign: bread loaf, t.', 2],
        ['𓍯', 'o', 'Lasso (V4), used for o or w in Ptolemaic spellings.', 3],
        ['𓃭', 'l', 'Recumbent lion, used for l in Greek names. Egyptian had no separate sign for l.', 4],
        ['𓐝', 'm', 'Sign Aa15, read m. Scholars still debate what object it shows.', 5],
        ['𓇌', 'y', 'Two reeds, y or i.', 6],
        ['𓋴', 's', 'Sound sign: folded cloth, s. Ptolemaios ends here.', 7],
        ['𓋹', 'ꜥnḫ', 'The ankh, ꜥnḫ, “living.”', 8],
        ['𓆓', 'ḏ', 'Cobra, ḏ.', 9],
        ['𓏏', 't', 'Bread loaf, t. With the cobra it spells ḏt, “forever.”', 10],
        ['𓊪', 'p', 'Stool, p: the first sign of the god Ptah.', 12],
        ['𓏏', 't', 'Bread loaf, t.', 13],
        ['𓎛', 'ḥ', 'Twisted flax, ḥ. Ptḥ, the creator god of Memphis, is written before “beloved” out of respect.', 14],
        ['𓌸', 'mr', 'Hoe, mr, “beloved.” Written last, read before Ptah.', 11]
      ],
      rows: [[0, 1], [2], [3], [4, 5], [6], [7], [8, 9], [10, 11, 12], [13]]
    },
    {
      id: 'cleo', name: 'Cleopatra VII', tr: 'q-l-i-o-p-a-d-r-a-t', translation: 'Kleopatra, a Greek name meaning “glory of her father”',
      meta: 'Birth name · Ptolemaic Dynasty · reigned 51–30 BCE',
      story: 'The last ruler of independent Egypt came from a Greek-speaking Macedonian family, so her name is spelled sound by sound. The bread loaf and egg at the end are feminine markers: t ends feminine words, and the egg marks goddesses and royal women. The cartouche Champollion compared came from an earlier queen of the same name.',
      signs: [
        ['𓈎', 'q', 'Hill slope, q, for Greek K.', 1],
        ['𓃭', 'l', 'Recumbent lion, l.', 2],
        ['𓇋', 'i', 'Flowering reed, used for a vowel e or i.', 3],
        ['𓍯', 'o', 'Lasso, o.', 4],
        ['𓊪', 'p', 'Stool, p.', 5],
        ['𓄿', 'a', 'Egyptian vulture, used for a.', 6],
        ['𓂧', 'd', 'Hand, d, standing for Greek T.', 7],
        ['𓂋', 'r', 'Mouth, r.', 8],
        ['𓄿', 'a', 'Egyptian vulture, a.', 9],
        ['𓏏', 't', 'Bread loaf, t: the feminine ending, not part of the Greek name.', 10],
        ['𓆇', '(det.)', 'Egg (H8): a silent determinative for goddesses and royal women.', 11]
      ],
      rows: [[0, 1], [2, 3], [4], [5, 6], [7, 8], [9, 10]]
    }
  ];

  function setupRoyals() {
    const tabs = $('eg-royal-tabs');
    const shenu = $('eg-royal-shenu');
    const orderBtn = $('eg-royal-order');
    const stage = root.querySelector('.eg-royal-stage');
    stage.id = 'eg-royal-panel';
    stage.setAttribute('role', 'tabpanel');
    let royal = ROYALS[0];
    let readingOrder = false;

    function select(i, focus) {
      royal = ROYALS[i];
      tabs.querySelectorAll('[role=tab]').forEach((t, j) => {
        t.setAttribute('aria-selected', String(j === i));
        t.setAttribute('tabindex', j === i ? '0' : '-1');
        if (j === i && focus) t.focus();
      });
      stage.setAttribute('aria-labelledby', `eg-royal-tab-${royal.id}`);
      $('eg-royal-title').textContent = royal.name;
      $('eg-royal-meta').textContent = royal.meta;
      $('eg-royal-translit').textContent = royal.tr;
      $('eg-royal-translation').textContent = royal.translation;
      $('eg-royal-story').textContent = royal.story;
      $('eg-royal-sign').textContent = 'Select a sign in the cartouche.';
      render();
    }

    function render() {
      const moved = royal.signs.some(([, , , read], i) => read !== i + 1);
      const rows = readingOrder
        ? royal.signs.map((s, i) => [i]).sort((a, b) => royal.signs[a[0]][3] - royal.signs[b[0]][3])
        : royal.rows;
      shenu.classList.toggle('is-reading', readingOrder);
      shenu.classList.toggle('is-long', rows.length > 5);
      shenu.replaceChildren(...rows.map(row => h('span', { class: 'eg-shenu-row' }, row.map(i => {
        const [g, tr, job, read] = royal.signs[i];
        const btn = h('button', {
          // Highlight only the signs the scribe brought forward (honorific transposition).
          type: 'button', class: `eg-shenu-sign${read > i + 1 ? ' is-moved' : ''}`,
          'data-read': String(read), 'aria-label': `${tr}: written ${i + 1}, read ${read}`
        }, glyph(g));
        btn.addEventListener('click', () => {
          shenu.querySelectorAll('.eg-shenu-sign').forEach(b => b.classList.toggle('is-active', b === btn));
          $('eg-royal-sign').replaceChildren(glyph(g, 'eg-inspect-glyph'),
            h('span', {}, h('strong', { text: `${tr} · written ${i + 1} of ${royal.signs.length}, read ${read}. ` }), job));
        });
        return btn;
      }))));
      shenu.setAttribute('aria-label', `${royal.name} cartouche, ${readingOrder ? 'signs in reading order' : 'signs in written order'}`);
      orderBtn.setAttribute('aria-pressed', String(readingOrder));
      orderBtn.textContent = readingOrder ? 'Show written order' : 'Show reading order';
      orderBtn.title = moved ? '' : 'For this name the written and reading orders are the same.';
    }

    ROYALS.forEach((r, i) => {
      const tab = h('button', { type: 'button', role: 'tab', class: 'eg-mission-btn', id: `eg-royal-tab-${r.id}`, 'aria-controls': 'eg-royal-panel', text: r.name });
      tab.addEventListener('click', () => select(i));
      tab.addEventListener('keydown', e => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); select(e.key === 'Home' ? 0 : ROYALS.length - 1, true); }
        else if (step) { e.preventDefault(); select((i + step + ROYALS.length) % ROYALS.length, true); }
      });
      tabs.append(tab);
    });
    orderBtn.addEventListener('click', () => {
      readingOrder = !readingOrder;
      render();
      const moved = royal.signs.some(([, , , read], i) => read !== i + 1);
      $('eg-royal-sign').textContent = readingOrder
        ? (moved ? 'Reading order. Highlighted signs were moved to the front by the scribe out of respect, so the reader moves them back.' : 'Reading order. For this name nothing was moved: written order and reading order are the same.')
        : 'Written order, as the scribe arranged the signs inside the loop.';
    });
    select(0);
  }

  // Custom name cartouche
  const DIGRAPHS = { sh: 'š', ch: 'ṯ', kh: 'ḫ', th: 't', ph: 'f', ck: 'k', qu: 'q' };
  const LETTER_NOTES = {
    v: 'Egyptian had no v; the viper f is the nearest sound.',
    x: 'x is two sounds, k + s.',
    j: 'English j is closest to the cobra, ḏ (“dj”).',
    c: 'c is written k, or s before e, i or y.',
    th: 'Egyptian had no “th”; the bread loaf t is closest.',
    ph: 'ph sounds like f, so it takes the viper.',
    l: 'Ptolemaic scribes borrowed the lion for l in Greek names.',
    lNative: 'Native Egyptian wrote an l sound with r (or n), so l becomes the mouth sign.',
    o: 'Ptolemaic scribes wrote o with the lasso, as in Ptolemaios and Kleopatra.'
  };

  function spellName(raw, mode) {
    const s = raw.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
    const out = [];
    const notes = new Set();
    const vowel = ch => 'aeiou'.includes(ch);
    for (let i = 0; i < s.length; i++) {
      const pair = s.slice(i, i + 2);
      const from = i === 0;
      let ids;
      let src = s[i];
      if (DIGRAPHS[pair]) {
        ids = [DIGRAPHS[pair]]; src = pair; i++;
        if (LETTER_NOTES[pair]) notes.add(LETTER_NOTES[pair]);
      } else {
        const ch = s[i];
        if (vowel(ch) && mode === 'egyptian' && !from) continue;
        switch (ch) {
          case 'a': ids = ['ꜣ']; break;
          case 'e': case 'i': ids = ['j']; break;
          case 'o': ids = mode === 'egyptian' ? ['w'] : ['o']; if (mode !== 'egyptian') notes.add(LETTER_NOTES.o); break;
          case 'u': case 'w': ids = ['w']; break;
          case 'y': ids = ['y']; break;
          case 'c': ids = 'eiy'.includes(s[i + 1] || '') ? ['s'] : ['k']; notes.add(LETTER_NOTES.c); break;
          case 'v': ids = ['f']; notes.add(LETTER_NOTES.v); break;
          case 'x': ids = ['k', 's']; notes.add(LETTER_NOTES.x); break;
          case 'j': ids = ['ḏ']; notes.add(LETTER_NOTES.j); break;
          case 'l':
            ids = mode === 'egyptian' ? ['r'] : ['l'];
            notes.add(mode === 'egyptian' ? LETTER_NOTES.lNative : LETTER_NOTES.l); break;
          default: ids = SIGN[ch] ? [ch] : [];
        }
      }
      ids.forEach(id => out.push({ src: src.toUpperCase(), sign: SIGN[id] }));
    }
    if (mode === 'egyptian') notes.add('Vowels inside the name are left out, as in native Egyptian words. A vowel at the very start becomes a weak consonant sign.');
    return { parts: out.slice(0, LINE_MAX), notes: [...notes], cut: out.length > LINE_MAX };
  }

  const DETS = { none: null, man: { glyph: '𓀀', name: 'seated man (A1)' }, woman: { glyph: '𓁐', name: 'seated woman (B1)' } };
  const radio = name => root.querySelector(`input[name="${name}"]:checked`)?.value;

  function setupNameBuilder() {
    const input = $('eg-name-input');
    const shenu = $('eg-name-shenu');
    const kbBtn = $('eg-name-keyboard');
    let fromKeyboard = false;
    let current = { parts: [], det: null, layout: 'vertical' };

    function render() {
      const mode = radio('eg-name-mode');
      const det = DETS[radio('eg-name-det')];
      const layout = radio('eg-name-layout');
      let parts;
      let notes;
      if (fromKeyboard) {
        parts = line.map(sign => ({ src: '', sign }));
        notes = [parts.length ? 'Your cartouche now copies the scribe’s line in Section 2. Add or undo signs there to fine-tune it.' : 'Your scribe’s line is empty. Write signs on it in Section 2 to fill the cartouche.'];
      } else {
        const result = spellName(input.value, mode);
        parts = result.parts;
        notes = result.notes;
        if (result.cut) notes.push(`Only the first ${LINE_MAX} signs fit in the loop.`);
        if (!parts.length) notes = ['Type a name using the letters a to z.'];
      }
      current = { parts, det, layout, name: input.value.trim() || 'my-name' };
      shenu.className = `eg-shenu eg-shenu-custom is-${layout}${parts.length > 7 ? ' is-long' : ''}`;
      const signs = parts.map(p => glyph(p.sign.glyph, 'eg-name-glyph'));
      if (det) signs.push(glyph(det.glyph, 'eg-name-glyph eg-name-det'));
      shenu.replaceChildren(...signs);
      shenu.setAttribute('role', 'img');
      shenu.setAttribute('aria-label', parts.length
        ? `Cartouche: ${parts.map(p => p.sign.pic).join(', ')}${det ? `, then a ${det.name}` : ''}`
        : 'Empty cartouche');
      $('eg-name-translit').textContent = parts.length ? `Reads: ${parts.map(p => p.sign.id).join('-')}` : '';
      $('eg-name-breakdown').replaceChildren(...parts.map(p => h('li', {},
        p.src ? h('strong', { text: `${p.src} → ` }) : null, glyph(p.sign.glyph, 'eg-inline-glyph'),
        ` ${p.sign.id} · ${p.sign.pic}`)),
        ...(det ? [h('li', {}, glyph(det.glyph, 'eg-inline-glyph'), ` silent determinative: ${det.name}`)] : []));
      $('eg-name-note').textContent = notes.join(' ');
    }

    input.addEventListener('input', () => {
      if (fromKeyboard) { fromKeyboard = false; syncKbBtn(); }
      render();
    });
    root.querySelectorAll('input[name="eg-name-mode"], input[name="eg-name-det"], input[name="eg-name-layout"]').forEach(r => r.addEventListener('change', render));
    function syncKbBtn() {
      kbBtn.setAttribute('aria-pressed', String(fromKeyboard));
      kbBtn.textContent = fromKeyboard ? 'Back to automatic spelling' : 'Add keyboard signs to my cartouche';
    }
    kbBtn.addEventListener('click', () => {
      fromKeyboard = !fromKeyboard;
      if (fromKeyboard && !line.length) {
        // Start the hand-edit from the automatic spelling, so students correct rather than retype.
        current.parts.forEach(p => line.push(p.sign));
        renderLine();
      }
      syncKbBtn();
      render();
    });
    onLineChange(() => { if (fromKeyboard) render(); });
    $('eg-name-save').addEventListener('click', () => saveCartouche(current));
    render();
  }

  async function saveCartouche({ parts, det, layout, name }) {
    const glyphs = parts.map(p => p.sign.glyph).concat(det ? [det.glyph] : []);
    if (!glyphs.length) { $('eg-name-note').textContent = 'Type a name first, then save.'; return; }
    const size = 72;
    try { await document.fonts.load(`${size}px Egyptian`, glyphs.join('')); } catch { /* fall back to any font */ }
    const vertical = layout === 'vertical';
    const flip = layout === 'horizontal-rtl';
    const step = size * 1.12;
    const pad = size * 0.75;
    const along = glyphs.length * step + pad * 2;
    const across = size * 1.9;
    const W = Math.round(Math.max((vertical ? across : along) + 120, 520));
    const H = Math.round((vertical ? along : across) + 200);
    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.fillStyle = '#f3e6c3';
    ctx.fillRect(0, 0, W, H);
    const w = vertical ? across : along;
    const x0 = (W - w) / 2;
    const y0 = 50;
    const hgt = vertical ? along : across;
    const r = Math.min(w, hgt) / 2;
    const ring = (inset, color, width) => {
      ctx.beginPath();
      ctx.roundRect(x0 + inset, y0 + inset, w - inset * 2, hgt - inset * 2, Math.max(4, r - inset));
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    };
    ctx.fillStyle = '#fbf3dc';
    ctx.beginPath();
    ctx.roundRect(x0, y0, w, hgt, r);
    ctx.fill();
    ring(0, '#9b7426', 7);
    ring(8, '#c9a24a', 3);
    // The tie bar closes the loop at the end of the name.
    ctx.fillStyle = '#9b7426';
    if (vertical) ctx.fillRect(x0 + w * 0.12, y0 + hgt + 8, w * 0.76, 12);
    else ctx.fillRect(flip ? x0 - 20 : x0 + w + 8, y0 + hgt * 0.12, 12, hgt * 0.76);
    ctx.fillStyle = '#173e56';
    ctx.font = `${size}px Egyptian, "Noto Sans Egyptian Hieroglyphs", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    glyphs.forEach((g, i) => {
      const k = flip ? glyphs.length - 1 - i : i;
      const cx = vertical ? x0 + w / 2 : x0 + pad + step * (k + 0.5);
      const cy = vertical ? y0 + pad + step * (k + 0.5) : y0 + hgt / 2;
      ctx.save();
      ctx.translate(cx, cy);
      if (flip) ctx.scale(-1, 1);
      ctx.fillText(g, 0, 0);
      ctx.restore();
    });
    ctx.fillStyle = '#3b3020';
    ctx.font = 'italic 22px Georgia, serif';
    ctx.fillText(parts.map(p => p.sign.id).join('-'), W / 2, H - 92);
    ctx.font = '15px Georgia, serif';
    ctx.fillText('Spelled with Egyptian uniliteral signs · ClassroomOS', W / 2, H - 60);
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = h('a', { href: url, download: `cartouche-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'name'}.png` });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  }

  // --- 5. ROSETTA DECIPHERMENT LAB ---
  const PTOLEMY = [
    { g: '𓊪', pic: 'stool', snd: 'P', greek: 'Π' },
    { g: '𓏏', pic: 'bread loaf', snd: 'T', greek: 'Τ' },
    { g: '𓍯', pic: 'lasso', snd: 'O', greek: 'Ο' },
    { g: '𓃭', pic: 'lion', snd: 'L', greek: 'Λ' },
    { g: '𓐝', pic: 'sign Aa15', snd: 'M', greek: 'Μ' },
    { g: '𓇌', pic: 'two reeds', snd: 'I', greek: 'Ι' },
    { g: '𓋴', pic: 'folded cloth', snd: 'S', greek: 'Σ' }
  ];
  const KLEOPATRA = [
    { g: '𓈎', pic: 'hill slope', snd: 'K', greek: 'Κ' },
    { g: '𓃭', pic: 'lion', snd: 'L', greek: 'Λ' },
    { g: '𓇋', pic: 'reed', snd: 'I', greek: 'Ε' },
    { g: '𓍯', pic: 'lasso', snd: 'O', greek: 'Ο' },
    { g: '𓊪', pic: 'stool', snd: 'P', greek: 'Π' },
    { g: '𓄿', pic: 'vulture', snd: 'A', greek: 'Α' },
    { g: '𓂧', pic: 'hand', snd: 'T', greek: 'Τ' },
    { g: '𓂋', pic: 'mouth', snd: 'R', greek: 'Ρ' },
    { g: '𓄿', pic: 'vulture', snd: 'A', greek: 'Α' },
    { g: '𓏏', pic: 'bread loaf', snd: 'FEM' },
    { g: '𓆇', pic: 'egg', snd: 'DET' }
  ];
  const SHARED = ['P', 'O', 'L', 'I'];

  function setupRosetta() {
    const fb = $('eg-ros-feedback');
    const key = $('eg-ros-key');
    const matched = new Set();
    const keyEntries = new Map();
    let pending = null;

    function addKey(g, value, note) {
      keyEntries.set(g, { value, note });
      key.replaceChildren(...[...keyEntries].map(([sign, e]) =>
        h('span', { class: 'eg-ros-chip', title: e.note || '' }, glyph(sign), h('b', { text: e.value }))));
    }
    const say = (text, cls = '') => { fb.textContent = text; fb.className = `as-feedback ${cls}`.trim(); };

    function build(host, list, side) {
      host.replaceChildren(...list.map((s, i) => {
        const btn = h('button', { type: 'button', class: 'eg-ros-sign', 'data-i': String(i), 'aria-label': `${side === 'p' ? 'Ptolemaios' : 'Kleopatra'} sign ${i + 1}: ${s.pic}` }, glyph(s.g));
        btn.addEventListener('click', () => (side === 'p' ? pickPtolemy : pickKleo)(i, btn));
        return btn;
      }));
    }

    function pickPtolemy(i, btn) {
      const s = PTOLEMY[i];
      $('eg-ros-ptolemy').querySelectorAll('.eg-ros-sign').forEach(b => b.classList.toggle('is-pending', b === btn));
      if (matched.has(s.snd)) { pending = null; say(`Already decoded: the ${s.pic} is ${s.snd === 'I' ? 'i/e' : s.snd.toLowerCase()}.`); return; }
      if (s.snd === 'T') { pending = null; say('Hold on to T. Kleopatra has a T sound too, but look closely: that is the puzzle in Step 2. Match P, O, L, or E/I first.'); return; }
      if (s.snd === 'M' || s.snd === 'S') { pending = null; say(`The ${s.pic} sits where ΠΤΟΛΕΜΑΙΟΣ has ${s.greek}. Kleopatra has no ${s.snd} sound, so this sign has no partner.`); return; }
      pending = i;
      say(`The ${s.pic} is sign ${i + 1}, where the Greek has ${s.greek}. Now find the sign in Kleopatra that sits where ΚΛΕΟΠΑΤΡΑ has the same sound.`);
    }

    function pickKleo(i, btn) {
      const k = KLEOPATRA[i];
      if (pending == null) {
        if (k.snd === 'FEM' || k.snd === 'DET') say(`The ${k.pic} comes after the last letter of ΚΛΕΟΠΑΤΡΑ. Champollion saw that names of queens and goddesses end with the bread loaf and egg: feminine markers, not part of the Greek name.`);
        else say('Start in the Ptolemaios cartouche: choose one of its signs first.');
        return;
      }
      const p = PTOLEMY[pending];
      if (k.snd === p.snd && k.g !== '𓂧') {
        matched.add(p.snd);
        const n = matched.size;
        $('eg-ros-ptolemy').querySelector(`[data-i="${pending}"]`).classList.add('is-matched', `is-pair-${n}`);
        btn.classList.add('is-matched', `is-pair-${n}`);
        $('eg-ros-ptolemy').querySelectorAll('.eg-ros-sign').forEach(b => b.classList.remove('is-pending'));
        const value = p.snd === 'I' ? 'i/e' : p.snd.toLowerCase();
        addKey(p.g, value);
        if (p.g !== k.g) addKey(k.g, value);
        pending = null;
        if (matched.size === SHARED.length) {
          addKey('𓏏', 't', 'Ptolemaios position 2');
          addKey('𓐝', 'm', 'by position in Ptolemaios');
          addKey('𓋴', 's', 'by position in Ptolemaios');
          addKey('𓈎', 'k', 'by position in Kleopatra');
          addKey('𓄿', 'a', 'by position in Kleopatra');
          addKey('𓂋', 'r', 'by position in Kleopatra');
          say('✔ All four shared sounds sit in the same places in both names. Once those are fixed, the leftover signs can be read by position: m and s in Ptolemaios; k, a and r in Kleopatra. Your key has grown. On to Step 2.', 'is-right');
          const step2 = $('eg-ros-step2');
          step2.hidden = false;
          step2.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
        } else {
          say(`✔ Match: both cartouches use the ${p.pic === k.pic ? p.pic : `${p.pic} and the ${k.pic}`} where the Greek has ${p.snd === 'I' ? 'Ι / Ε' : p.greek}. ${p.snd === 'I' ? 'Two reeds in one name and one reed in the other: Champollion read both as an i/e vowel. ' : ''}${SHARED.length - matched.size} shared sound${SHARED.length - matched.size === 1 ? '' : 's'} to go.`, 'is-right');
        }
        return;
      }
      const where = k.greek ? `where ΚΛΕΟΠΑΤΡΑ has ${k.greek}` : 'after the Greek name ends';
      say(`✘ Not the same sound. In Ptolemaios the ${p.pic} sits where the Greek has ${p.greek}; in Kleopatra the ${k.pic} sits ${where}. Compare positions again.`, 'is-wrong');
    }

    build($('eg-ros-ptolemy'), PTOLEMY, 'p');
    build($('eg-ros-cleo'), KLEOPATRA, 'k');

    root.querySelectorAll('.eg-ros-t').forEach(btn => btn.addEventListener('click', () => {
      const ok = btn.dataset.ok === 'true';
      const out = $('eg-ros-t-feedback');
      root.querySelectorAll('.eg-ros-t').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      out.className = `as-feedback ${ok ? 'is-right' : 'is-wrong'}`;
      if (!ok) {
        out.textContent = btn.textContent.includes('wrong')
          ? '✘ Too fast. Four signs already matched in the right places. One odd sign is a puzzle to explain, not a reason to throw out the system.'
          : '✘ A silent sign could not fill the slot where the Greek has a spoken T. The hand must be doing a sound job here.';
        return;
      }
      out.textContent = '✔ Exactly Champollion’s conclusion. Egyptian had more than one sign for similar sounds (homophones), and Greek T could be heard as Egyptian t or d. The hand is d. A good system explains its exceptions.';
      addKey('𓂧', 'd', 'used for Greek T in Kleopatra');
      $('eg-ros-step3').hidden = false;
    }));

    root.querySelectorAll('.eg-ros-test-btn').forEach(btn => btn.addEventListener('click', () => {
      const ok = btn.dataset.ok === 'true';
      const out = $('eg-ros-test-feedback');
      root.querySelectorAll('.eg-ros-test-btn').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      out.className = `as-feedback ${ok ? 'is-right' : 'is-wrong'}`;
      if (ok) {
        out.textContent = '✔ Alexandros: a-l-k-s-i-n-d-r-s. Your key gave you a, l, s, i, d and r; the basket and water ripple turn out to be k and n. Champollion confirmed his values this way, then read native Egyptian names like Ramesses and Thutmose and showed the system worked for Egyptian words too.';
        addKey('𓎡', 'k', 'new: from Alexandros');
        addKey('𓈖', 'n', 'new: from Alexandros');
      } else {
        out.textContent = btn.dataset.ok === 'false' && btn.textContent.includes('Berenike')
          ? '✘ Use your key: the cartouche starts with the vulture (a) and the lion (l). Berenike would start with b.'
          : '✘ Use your key: Tiberios would start with t, but this cartouche starts with the vulture (a) and the lion (l).';
      }
    }));
  }

  // --- 6. DETERMINATIVE DETECTIVE ---
  const WN_NOTES = {
    door: ['wn + door leaf = wn, “to open.”', 'The door leaf (O31) points to doors and opening, so this is the verb “to open.”'],
    legs: ['wn + walking legs = wnj, “to hurry, pass by.”', 'Walking legs (D54) mark movement, so the same consonants become a verb of motion.'],
    sparrow: ['wn + sparrow = wn, “fault, wrongdoing.”', 'The sparrow (G37) marks small, bad or wrong things, so this wn is a fault.'],
    none: ['wn with no determinative:', 'the reader has to rely on grammar. These same two signs also write forms of the verb “to be” (wnn).']
  };
  const DET_GLYPH = { door: '𓉿', legs: '𓂻', sparrow: '𓅪', none: '?' };

  function setupWnLab() {
    const btns = root.querySelectorAll('.eg-det-btn');
    btns.forEach(btn => btn.addEventListener('click', () => {
      const det = btn.dataset.det;
      btns.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      const slot = $('eg-det-slot');
      slot.textContent = DET_GLYPH[det];
      slot.classList.toggle('is-filled', det !== 'none');
      slot.classList.remove('is-pop');
      void slot.offsetWidth;
      slot.classList.add('is-pop');
      const [head, body] = WN_NOTES[det];
      $('eg-det-note').replaceChildren(h('strong', { text: head }), ` ${body}`);
    }));
  }

  const DET_NAMES = {
    '𓀁': 'man with hand to mouth (A2)', '𓂻': 'walking legs (D54)', '𓉐': 'house plan (O1)', '𓇹': 'crescent moon (N11)',
    '𓇳': 'sun disk (N5)', '𓀀': 'seated man (A1)', '𓁐': 'seated woman (B1)', '𓈉': 'hill country (N25)', '𓏛': 'papyrus roll (Y1)',
    '𓏊': 'beer jug (W22)', '𓊖': 'crossroads in a town (O49)', '𓇯': 'sky (N1)'
  };
  const CASES = [
    { stem: '𓃹𓈖𓅓', tr: 'wnm', clue: 'Something you do at dinner: wnm.', answer: '𓀁', choices: ['𓀁', '𓂻', '𓉐'],
      explain: 'wnm, “to eat.” The man with hand to mouth marks eating, drinking, speaking and thinking. Notice that it starts with the same hare and water as wn.' },
    { stem: '𓇋𓂝𓎛', tr: 'jꜥḥ', clue: 'It shines in the night sky and changes shape over a month: jꜥḥ.', answer: '𓇹', choices: ['𓇹', '𓇳', '𓀀'],
      explain: 'jꜥḥ, “moon.” The crescent is the determinative. The sun disk would point to the sun, the day, or time instead.' },
    { stem: '𓋴𓏏', tr: 'st', clue: 'A person: st.', answer: '𓁐', choices: ['𓁐', '𓀀', '𓈉'],
      explain: 'st, “woman.” The seated woman tells you this is a female person; the bread loaf t is the usual feminine ending.' },
    { stem: '𓅓𓆓𓄿𓏏', tr: 'mḏꜣt', clue: 'A scribe writes one and keeps it on a shelf: mḏꜣt.', answer: '𓏛', choices: ['𓏛', '𓏊', '𓂻'],
      explain: 'mḏꜣt, “papyrus roll, book.” The tied papyrus roll marks writing, and also abstract ideas that you cannot draw.' },
    { stem: '𓌀𓏏', tr: 'Wꜣst', clue: 'The great southern capital, home of Amun’s temples at Karnak: Wꜣst.', answer: '𓊖', choices: ['𓊖', '𓈉', '𓁐'],
      explain: 'Wꜣst, Thebes (modern Luxor). The crossroads inside a wall marks a town. The hill-country sign would make it a foreign land instead.' },
    { stem: '𓎛𓈖𓈎𓏏', tr: 'ḥnqt', clue: 'A thick drink that workers were paid in, along with bread: ḥnqt.', answer: '𓏊', choices: ['𓏊', '𓇯', '𓀁'],
      explain: 'ḥnqt, “beer.” The beer jug marks drinks kept in jars. The man with hand to mouth would be a fair guess for “drinking,” but the jug names the thing itself.' }
  ];

  function setupDetective() {
    let index = 0;
    let firstTry = 0;
    let missed = false;
    let solved = false;
    const fb = $('eg-det-case-feedback');
    const nextBtn = $('eg-det-next');
    const slot = $('eg-det-case-slot');

    function show() {
      const c = CASES[index];
      solved = false;
      missed = false;
      $('eg-det-progress').textContent = `Case ${index + 1} of ${CASES.length}`;
      $('eg-det-clue').textContent = c.clue;
      $('eg-det-case-stem').textContent = c.stem;
      slot.textContent = '?';
      slot.classList.remove('is-filled', 'is-wrong');
      fb.textContent = '';
      fb.className = 'as-feedback';
      nextBtn.disabled = true;
      nextBtn.textContent = index === CASES.length - 1 ? 'Close the case file' : 'Next case';
      $('eg-det-case-choices').replaceChildren(...shuffle(c.choices).map(g => {
        const btn = h('button', { type: 'button', class: 'eg-det-btn' }, h('span', { class: 'as-glyph', 'aria-hidden': 'true', text: g }), ` ${DET_NAMES[g]}`);
        btn.addEventListener('click', () => choose(g, btn));
        return btn;
      }));
    }

    function choose(g, btn) {
      if (solved) return;
      const c = CASES[index];
      slot.textContent = g;
      if (g === c.answer) {
        solved = true;
        if (!missed) firstTry++;
        slot.classList.remove('is-wrong');
        slot.classList.add('is-filled');
        btn.classList.add('correct');
        fb.className = 'as-feedback is-right';
        fb.textContent = `✔ Case solved. ${c.explain}`;
        nextBtn.disabled = false;
      } else {
        missed = true;
        slot.classList.add('is-wrong');
        btn.classList.add('incorrect');
        btn.disabled = true;
        fb.className = 'as-feedback is-wrong';
        fb.textContent = `✘ The ${DET_NAMES[g]} would put ${c.tr} in the wrong category. Reread the clue: what kind of thing is it?`;
      }
    }

    nextBtn.addEventListener('click', () => {
      if (index === CASES.length - 1) {
        fb.className = 'as-feedback is-right';
        fb.textContent = `Case file closed: ${firstTry} of ${CASES.length} solved on the first try. Same consonants can hide many words; the silent sign at the end is how scribes kept them apart. Press again to reopen the file.`;
        index = -1;
        firstTry = 0;
        nextBtn.textContent = 'Reopen the case file';
        return;
      }
      index++;
      show();
    });
    show();
  }

  // --- 7. SCRIBE MATHEMATICS ---
  const NUMERALS = [
    [1000000, '𓁨', 'god Heh', 'god Heh figures'],
    [100000, '𓆐', 'tadpole', 'tadpoles'],
    [10000, '𓂭', 'finger', 'fingers'],
    [1000, '𓆼', 'lotus', 'lotuses'],
    [100, '𓍢', 'coil of rope', 'coils of rope'],
    [10, '𓎆', 'cattle hobble', 'cattle hobbles'],
    [1, '𓏤', 'stroke', 'strokes']
  ];

  function setupNumerals() {
    const input = $('eg-num-input');
    const out = $('eg-num-glyphs');
    function update(raw) {
      let n = Math.floor(Number(raw));
      if (!Number.isFinite(n) || n < 1) {
        out.replaceChildren();
        $('eg-num-breakdown').textContent = 'Egyptian numerals start at 1: there was no sign for zero. Enter a whole number from 1 to 9,999,999.';
        return;
      }
      n = Math.min(n, 9999999);
      let rest = n;
      const groups = [];
      const words = [];
      for (const [value, g, one, many] of NUMERALS) {
        const count = Math.floor(rest / value);
        rest %= value;
        if (!count) continue;
        groups.push(h('span', { class: 'eg-num-group', title: `${count} × ${value.toLocaleString()}` }, glyph(g.repeat(count))));
        words.push(`${count} ${count === 1 ? one : many} (${(count * value).toLocaleString()})`);
      }
      out.replaceChildren(...groups);
      out.setAttribute('aria-label', `${n.toLocaleString()} in hieroglyphic numerals`);
      $('eg-num-breakdown').textContent = `${words.join(' + ')} = ${n.toLocaleString()}. That is ${groups.reduce((t, g) => t + [...g.textContent].length, 0)} signs.`;
    }
    input.addEventListener('input', () => update(input.value));
    root.querySelectorAll('.eg-preset-btn').forEach(btn => btn.addEventListener('click', () => {
      input.value = btn.dataset.num;
      update(btn.dataset.num);
    }));
    update(input.value);
  }

  const EYE = { 2: '½ inner corner', 4: '¼ pupil', 8: '⅛ eyebrow', 16: '1/16 outer corner', 32: '1/32 curled tail', 64: '1/64 teardrop' };
  const FRAC = { 2: '½', 4: '¼', 8: '⅛', 16: '1/16', 32: '1/32', 64: '1/64' };

  function setupEye() {
    const chosen = new Set();
    const parts = root.querySelectorAll('.eg-eye-part');
    const chips = root.querySelectorAll('.eg-frac-chip');
    let target = 13;
    const sum64 = () => [...chosen].reduce((t, d) => t + 64 / d, 0);

    function render() {
      const n = sum64();
      parts.forEach(p => {
        const on = chosen.has(Number(p.dataset.frac));
        p.classList.toggle('is-on', on);
        p.setAttribute('aria-pressed', String(on));
      });
      chips.forEach(c => c.setAttribute('aria-pressed', String(chosen.has(Number(c.dataset.frac)))));
      $('eg-hekat-fill').style.height = `${(n / 64) * 100}%`;
      const gap = $('eg-hekat-gap');
      gap.hidden = n !== 63;
      const list = [2, 4, 8, 16, 32, 64].filter(d => chosen.has(d));
      $('eg-hekat-sum').textContent = n === 63
        ? '63/64 of a hekat. One sixty-fourth is still missing.'
        : `${n}/64 of a hekat${list.length ? ` = ${list.map(d => FRAC[d]).join(' + ')}` : ''}`;
      const bits = n.toString(2).padStart(6, '0');
      $('eg-hekat-binary').textContent = n
        ? `As six on/off pieces (½ first): ${bits}. That is ${n} written in binary.`
        : 'Each piece is either in the measure or not, like a binary digit.';
    }
    function toggle(d) {
      if (chosen.has(d)) chosen.delete(d); else chosen.add(d);
      render();
    }
    parts.forEach(p => {
      p.addEventListener('click', () => toggle(Number(p.dataset.frac)));
      p.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(Number(p.dataset.frac)); }
      });
    });
    chips.forEach(c => c.addEventListener('click', () => toggle(Number(c.dataset.frac))));
    $('eg-eye-all').addEventListener('click', () => { [2, 4, 8, 16, 32, 64].forEach(d => chosen.add(d)); render(); });
    $('eg-eye-clear').addEventListener('click', () => { chosen.clear(); render(); });

    const grainFb = $('eg-grain-feedback');
    function newOrder() {
      let next;
      do { next = 1 + Math.floor(Math.random() * 62); } while (next === target);
      target = next;
      $('eg-grain-task').textContent = `Measure exactly ${target}/64 of a hekat.`;
      grainFb.textContent = 'Select eye pieces that add up to the order.';
      grainFb.className = 'as-feedback';
    }
    $('eg-grain-new').addEventListener('click', newOrder);
    $('eg-grain-check').addEventListener('click', () => {
      const n = sum64();
      const recipe = [2, 4, 8, 16, 32, 64].filter(d => target & (64 / d)).map(d => FRAC[d]).join(' + ');
      if (n === target) {
        grainFb.className = 'as-feedback is-right';
        grainFb.textContent = `✔ Exactly ${target}/64 = ${recipe}. No other set of pieces makes this amount: each piece is one binary digit.`;
      } else {
        grainFb.className = 'as-feedback is-wrong';
        grainFb.textContent = n > target
          ? `✘ Too much grain: you have ${n}/64, which is ${n - target}/64 over. Try taking out a piece and using smaller ones.`
          : `✘ Not enough: you have ${n}/64, so you still need ${target - n}/64. Start with the biggest piece that still fits.`;
      }
    });
    render();
  }

  // --- 10. EVIDENCE QUIZ & REFLECTION ---
  function setupQuiz() {
    root.querySelectorAll('.eg-quiz-item').forEach(item => {
      const buttons = item.querySelectorAll('.eg-quiz-btn');
      const fb = item.querySelector('.eg-quiz-feedback');
      buttons.forEach(btn => btn.addEventListener('click', () => {
        buttons.forEach(b => { b.classList.remove('correct', 'incorrect'); b.setAttribute('aria-pressed', String(b === btn)); });
        const ok = btn.dataset.correct === 'true';
        btn.classList.add(ok ? 'correct' : 'incorrect');
        fb.className = `eg-quiz-feedback ${ok ? 'is-right' : 'is-wrong'}`;
        fb.replaceChildren(h('strong', { text: ok ? '✔ Correct. ' : '✘ Not quite. ' }), btn.dataset.explain);
      }));
    });
  }

  function setupReflection() {
    const textarea = $('reflection');
    if (!textarea) return;
    const KEY = 'classroom_egyptian_hieroglyphs_reflection';
    const saved = store.get(KEY);
    if (saved && !textarea.value) textarea.value = saved;
    textarea.addEventListener('input', () => store.set(KEY, textarea.value));
  }

  function init() {
    setupKeyboard();
    setupWordMissions();
    setupDirection();
    setupDrill();
    setupRoyals();
    setupNameBuilder();
    setupRosetta();
    setupWnLab();
    setupDetective();
    setupNumerals();
    setupEye();
    setupQuiz();
    setupReflection();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
