/* Masterworks reader — graded reading + comprehension from works originally written in each language.
 *
 *   <section id="masterworks" data-masterworks="es"></section>   one language (a *-foundations page)
 *   <section id="masterworks" data-masterworks="all"></section>  language picker (the hub lab)
 *
 * Needs masterworks-data.js first. Deep links: #masterworks-ja opens Japanese on the hub.
 * Nothing leaves the browser: finished passages are remembered in one localStorage key.
 */
(function () {
  const D = window.MASTERWORKS;
  if (!D) return;

  const STORE = 'classroomos:masterworks:v1';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; }
  }
  function save(state) {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* private window: fine */ }
  }

  /* ── speech ─────────────────────────────────────────────── */
  let voices = [];
  function refreshVoices() {
    if ('speechSynthesis' in window) voices = window.speechSynthesis.getVoices() || [];
  }
  refreshVoices();
  if ('speechSynthesis' in window) window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);

  function voiceFor(code) {
    const prefix = code.slice(0, 2).toLowerCase();
    return voices.find(v => v.lang.toLowerCase() === code.toLowerCase()) ||
           voices.find(v => v.lang.toLowerCase().startsWith(prefix));
  }

  function speak(text, lang) {
    if (!('speechSynthesis' in window)) return false;
    const info = D.langs[lang];
    let code = info.speech;
    let v = voiceFor(code);
    if (!v && info.speechFallback) { code = info.speechFallback; v = voiceFor(code); }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = code;
    if (v) u.voice = v;
    u.rate = 0.82;
    window.speechSynthesis.speak(u);
    return !!v || voices.length === 0;
  }

  /* ── one reader ─────────────────────────────────────────── */
  function mount(host) {
    const mode = host.dataset.masterworks || 'all';
    const fixed = mode !== 'all' && D.passages[mode] ? mode : null;
    const store = load();

    const s = {
      lang: fixed || (D.order.includes(store.lang) ? store.lang : 'es'),
      tier: D.tiers.some(t => t.id === store.tier) ? store.tier : 'k2',
      idx: 0,
      showEn: false,
      showRoman: true,
      answered: {},      // qIndex -> { picked, first }
      glossOpen: null,
      notes: {}          // passage id -> text, kept while the page is open
    };

    // Deep link on the hub: #masterworks-ja
    const m = /^#masterworks-([a-z]{2})$/.exec(location.hash || '');
    if (!fixed && m && D.passages[m[1]]) s.lang = m[1];

    const done = () => (load().done || []);
    const markDone = id => {
      const cur = load();
      cur.done = Array.from(new Set([...(cur.done || []), id]));
      save(Object.assign(cur, { lang: s.lang, tier: s.tier }));
    };
    const remember = () => { const cur = load(); cur.lang = s.lang; cur.tier = s.tier; save(cur); };

    const list = () => D.passages[s.lang].filter(p => p.tier === s.tier);
    const tiersWithWorks = () => D.tiers.filter(t => D.passages[s.lang].some(p => p.tier === t.id));
    const current = () => list()[s.idx] || list()[0];

    function ensureTier() {
      if (!tiersWithWorks().some(t => t.id === s.tier)) s.tier = tiersWithWorks()[0].id;
      if (s.idx >= list().length) s.idx = 0;
    }

    function render() {
      ensureTier();
      const info = D.langs[s.lang];
      const p = current();
      const finished = new Set(done());
      const total = D.passages[s.lang].length;
      const have = D.passages[s.lang].filter(x => finished.has(x.id)).length;
      const hasRoman = p.lines.some(l => l[1]);
      const isEn = s.lang === 'en';
      const allCorrect = p.qs.every((_, i) => s.answered[i] && s.answered[i].correct);
      const firstTry = p.qs.filter((_, i) => s.answered[i] && s.answered[i].first).length;

      const langPicker = fixed ? '' : `
        <div class="mw-langs" role="group" aria-label="Choose a language">
          ${D.order.map(code => {
            const L = D.langs[code];
            const n = D.passages[code].filter(x => finished.has(x.id)).length;
            return `<button type="button" class="mw-lang" data-lang="${code}" aria-pressed="${code === s.lang}" style="--mw-accent:${L.accent}">
              <span class="mw-lang-native" lang="${code === 'la' ? 'la' : code}">${esc(L.native)}</span>
              <span class="mw-lang-name">${esc(L.name)}${n ? ` · ${n}✓` : ''}</span></button>`;
          }).join('')}
        </div>`;

      host.style.setProperty('--mw-accent', info.accent);
      host.innerHTML = `
        <span class="lf-label">Reading &amp; Comprehension</span>
        <div class="mw-head">
          <div>
            <h2>Read the Masters${fixed ? ' in ' + esc(info.name) : ''}</h2>
            <p class="mw-intro">${fixed
              ? `Real ${esc(info.name)} from works first written in ${esc(info.name)}, chosen for each grade band. Read it aloud, check the meaning, then answer the questions.`
              : 'Famous poems, tales and novels in the languages they were first written in. Pick a language and a grade band, read the original, then check what you understood.'}</p>
          </div>
          <p class="mw-progress" aria-live="polite">${have} of ${total} passages finished</p>
        </div>
        ${langPicker}
        <div class="mw-tiers" role="tablist" aria-label="Grade band">
          ${tiersWithWorks().map(t => `<button type="button" role="tab" class="mw-tier" data-tier="${t.id}" aria-selected="${t.id === s.tier}">${esc(t.label)}</button>`).join('')}
        </div>
        <p class="mw-tier-full">${esc(D.tiers.find(t => t.id === s.tier).full)}</p>
        ${list().length > 1 ? `<div class="mw-works" role="group" aria-label="Passages in this band">
          ${list().map((x, i) => `<button type="button" class="mw-work" data-idx="${i}" aria-pressed="${i === s.idx}">${finished.has(x.id) ? '✓ ' : ''}${esc(x.title)}</button>`).join('')}</div>` : ''}

        <article class="mw-card" data-print-split>
          <header class="mw-card-head">
            <h3 lang="${s.lang}">${esc(p.title)}</h3>
            <p class="mw-byline"><strong>${esc(p.author)}</strong> · <em>${esc(p.work)}</em> · ${esc(p.year)}</p>
            <p class="mw-form">${esc(p.form)}</p>
          </header>

          <p class="mw-before"><strong>Before you read.</strong> ${esc(p.before)}</p>

          <div class="mw-tools">
            <button type="button" class="mw-btn" data-act="listen">🔊 Listen to all</button>
            <button type="button" class="mw-btn" data-act="toggle-en" aria-pressed="${s.showEn}">${s.showEn ? 'Hide' : 'Show'} ${isEn ? 'plain words' : 'English meaning'}</button>
            ${hasRoman ? `<button type="button" class="mw-btn" data-act="toggle-roman" aria-pressed="${s.showRoman}">${s.showRoman ? 'Hide' : 'Show'} pronunciation</button>` : ''}
          </div>
          <p class="mw-voice" id="mwVoice" role="status" aria-live="polite"></p>

          <div class="mw-text" lang="${s.lang}">
            ${p.lines.map((l, i) => `
              <div class="mw-line-row">
                <button type="button" class="mw-line" data-line="${i}" title="Click to hear this line">${esc(l[0])}</button>
                ${hasRoman && s.showRoman && l[1] ? `<div class="mw-roman" lang="en">${esc(l[1])}</div>` : ''}
                ${s.showEn ? `<div class="mw-en" lang="en">${esc(l[2])}</div>` : ''}
              </div>`).join('')}
          </div>

          <div class="mw-gloss" aria-label="Key words">
            <span class="mw-gloss-label">Key words · tap to reveal</span>
            ${p.gloss.map((g, i) => `<button type="button" class="mw-chip" data-gloss="${i}" aria-pressed="${s.glossOpen === i}" lang="${s.lang}">${esc(g[0])}</button>`).join('')}
            <p class="mw-gloss-open" id="mwGloss" aria-live="polite">${s.glossOpen !== null ? `<strong lang="${s.lang}">${esc(p.gloss[s.glossOpen][0])}</strong> — ${esc(p.gloss[s.glossOpen][1])}` : ''}</p>
          </div>

          <p class="mw-why"><strong>Why it matters.</strong> ${esc(p.why)}</p>

          <section class="mw-quiz" aria-label="Comprehension questions">
            <h4>Check your understanding</h4>
            ${p.qs.map((q, qi) => {
              const a = s.answered[qi];
              return `<div class="mw-q" data-q="${qi}">
                <p class="mw-q-text"><span class="mw-q-n">${qi + 1}</span>${esc(q.q)}</p>
                <div class="mw-opts">
                  ${q.o.map((o, oi) => {
                    let cls = 'mw-opt';
                    if (a && a.correct && oi === q.a) cls += ' correct';
                    else if (a && a.wrong && a.wrong.includes(oi)) cls += ' wrong';
                    return `<button type="button" class="${cls}" data-q="${qi}" data-o="${oi}" ${a && a.correct ? 'disabled' : ''}>${esc(o)}</button>`;
                  }).join('')}
                </div>
                <p class="mw-fb ${a && a.correct ? 'ok' : (a ? 'err' : '')}" role="status">${
                  a && a.correct ? '✓ ' + esc(q.w) : (a ? 'Not quite. Look at the text again and try another answer.' : '')}</p>
              </div>`;
            }).join('')}
            ${allCorrect ? `<p class="mw-done" role="status">★ Passage finished — ${firstTry} of ${p.qs.length} right on the first try.</p>` : ''}
          </section>

          <section class="mw-deeper">
            <h4>Go deeper</h4>
            <p>${esc(p.deeper)}</p>
            <label class="mw-label" for="mwNotes">Your thinking</label>
            <textarea id="mwNotes" class="mw-notes" rows="3" placeholder="Write or talk it through with a partner…">${esc(s.notes[p.id] || '')}</textarea>
          </section>

          <p class="mw-credit">Original text: public domain. English meaning and questions are ClassroomOS’s own, kept literal so you can match words one by one.${
            fixed ? '' : (info.page ? ` <a href="${esc(info.page)}">Learn ${esc(info.name)} sounds and grammar →</a>` : '')
          }</p>
        </article>`;
    }

    host.addEventListener('input', e => {
      if (e.target.id === 'mwNotes') s.notes[current().id] = e.target.value;
    });

    const live = id => host.querySelector('#' + id);

    host.addEventListener('click', e => {
      const t = e.target.closest('button');
      if (!t || !host.contains(t)) return;

      if (t.dataset.lang) { s.lang = t.dataset.lang; s.idx = 0; s.answered = {}; s.glossOpen = null; remember(); render(); return; }
      if (t.dataset.tier) { s.tier = t.dataset.tier; s.idx = 0; s.answered = {}; s.glossOpen = null; remember(); render(); return; }
      if (t.classList.contains('mw-work')) { s.idx = +t.dataset.idx; s.answered = {}; s.glossOpen = null; render(); return; }

      const p = current();
      if (t.dataset.act === 'listen') {
        const ok = speak(p.lines.map(l => l[0]).filter(x => x !== '…').join(' '), s.lang);
        const info = D.langs[s.lang];
        live('mwVoice').textContent = ok ? '' : `No ${info.name} voice found on this device. You can still read the text and tap lines to compare.`;
        if (s.lang === 'la' && ok) live('mwVoice').textContent = 'Latin is read here with an Italian voice, which is close to Church Latin. Classical Latin sounds a little different.';
        return;
      }
      if (t.dataset.act === 'toggle-en') { s.showEn = !s.showEn; render(); return; }
      if (t.dataset.act === 'toggle-roman') { s.showRoman = !s.showRoman; render(); return; }
      if (t.dataset.line !== undefined) {
        const text = p.lines[+t.dataset.line][0];
        if (text !== '…') speak(text, s.lang);
        return;
      }
      if (t.dataset.gloss !== undefined) {
        const i = +t.dataset.gloss;
        s.glossOpen = s.glossOpen === i ? null : i;
        const keepFocus = i;
        render();
        const again = host.querySelector(`[data-gloss="${keepFocus}"]`);
        if (again) again.focus();
        if (s.glossOpen !== null) speak(p.gloss[s.glossOpen][0].replace(/[’']/g, '’'), s.lang);
        return;
      }
      if (t.classList.contains('mw-opt')) {
        const qi = +t.dataset.q, oi = +t.dataset.o, q = p.qs[qi];
        const a = s.answered[qi] || { wrong: [], first: false, correct: false };
        if (a.correct) return;
        if (oi === q.a) {
          a.correct = true;
          a.first = a.wrong.length === 0;
        } else {
          a.wrong.push(oi);
        }
        s.answered[qi] = a;
        if (p.qs.every((_, i) => s.answered[i] && s.answered[i].correct)) markDone(p.id);
        const scroll = window.scrollY;
        render();
        window.scrollTo(window.scrollX, scroll);
        const next = host.querySelector(`.mw-opt[data-q="${qi}"]:not([disabled])`) || host.querySelector(`.mw-q[data-q="${qi}"] .mw-opt`);
        if (next) next.focus({ preventScroll: true });
      }
    });

    render();
  }

  function boot() { document.querySelectorAll('[data-masterworks]').forEach(mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
