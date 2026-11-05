/* Hall of Presidents: an interactive gallery of every presidency.
 *
 * Hover (or keyboard-focus) a portrait for a quick glimpse; click or tap for the full profile
 * with Gallup approval, deficit and debt, pros and cons, and world events during the term.
 * All numbers come from data/presidents.json, built by scripts/build-presidents-data.mjs.
 * Portraits are photographs and paintings from Wikimedia Commons, each credited in its profile
 * and shown through the shared photo lightbox (photo-lightbox.js) when pressed. */
(function () {
  'use strict';
  var root = document.getElementById('hall-of-presidents');
  if (!root) return;

  var script = document.currentScript;
  var dataUrl = new URL('../../data/presidents.json', script ? script.src : location.href).href;
  var imgBase = new URL('../images/presidents/', script ? script.src : location.href).href;

  var grid = root.querySelector('#hp-grid');
  var layer = document.getElementById('hall-layer') || root;
  var peek = layer.querySelector('#hp-peek');
  var overlay = layer.querySelector('#hp-profile');
  var panel = overlay.querySelector('.hp-panel');
  var body = overlay.querySelector('.hp-body');
  var legend = root.querySelector('#hp-legend');
  var status = root.querySelector('#hp-status');
  var modeSel = root.querySelector('#hp-mode');
  var eraBtns = Array.prototype.slice.call(root.querySelectorAll('[data-hp-era]'));

  var search = root.querySelector('#hp-search');
  var onlyEra = root.querySelector('#hp-only');
  var activeEra = 'all';
  var presidents = [];
  var byId = {};
  var cards = {};
  var current = null;        // president shown in the profile
  var opener = null;         // card to return focus to
  var peekTimer = 0;
  var canHover = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

  var ERAS = {
    founding: [1789, 1829], expansion: [1829, 1861], civilwar: [1861, 1901],
    progressive: [1901, 1945], coldwar: [1945, 1989], modern: [1989, 9999]
  };

  /* ---------- formatting ---------- */
  var MINUS = '−';
  function money(n) {
    if (n == null) return '';
    if (n >= 1e12) return '$' + (n / 1e12).toFixed(n >= 1e13 ? 1 : 2).replace(/\.?0+$/, '') + ' trillion';
    if (n >= 1e9) return '$' + Math.round(n / 1e9) + ' billion';
    return '$' + Math.round(n / 1e6) + ' million';
  }
  function moneyShort(n) {
    if (n >= 1e12) return '$' + (n / 1e12).toFixed(n >= 1e13 ? 1 : 2).replace(/\.?0+$/, '') + 'T';
    if (n >= 1e9) return '$' + Math.round(n / 1e9) + 'B';
    return '$' + Math.round(n / 1e6) + 'M';
  }
  function pct(v, signed) {
    var s = Math.abs(v).toFixed(1).replace(/\.0$/, '');
    return (v < 0 ? MINUS : (signed && v > 0 ? '+' : '')) + s + '%';
  }
  function yearsLabel(p) {
    var s = p.start.slice(0, 4), e = p.end ? p.end.slice(0, 4) : 'present';
    return s === e ? s : s + '–' + e;
  }
  function ordinal(n) {
    var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  function termDays(p) {
    if (!p.end) return null;
    return Math.round((new Date(p.end) - new Date(p.start)) / 864e5);
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function img(p, size) {
    return imgBase + p.id + (size === 'lg' ? '-large' : '') + '.webp';
  }

  /* ---------- derived numbers ---------- */
  function debtMultiple(p) {
    var f = p.fiscal;
    return f.debtStart && f.debtEnd ? f.debtEnd / f.debtStart : null;
  }
  function value(p, mode) {
    var f = p.fiscal;
    if (mode === 'approval') return p.approval ? p.approval.avg : null;
    if (mode === 'deficit') return f.avgBalancePctGDP != null ? f.avgBalancePctGDP : null;
    if (mode === 'debt') return debtMultiple(p);
    return null;
  }
  // One blue ramp for every mode: darker = more of the thing being measured. The number is always printed too.
  function ring(p, mode) {
    var v = value(p, mode);
    if (v == null) return '';
    var t;
    if (mode === 'approval') t = (v - 20) / 55;                 // 20% .. 75%
    else if (mode === 'deficit') t = v >= 0 ? 0 : Math.min(1, -v / 12); // surplus .. -12% of GDP
    else t = Math.min(1, Math.log(Math.max(v, 1)) / Math.log(6)); // 1x .. 6x
    t = Math.max(0, Math.min(1, t));
    return 'hsl(212 62% ' + Math.round(86 - t * 52) + '%)';
  }
  function caption(p, mode) {
    if (mode === 'approval') return p.approval ? p.approval.avg.toFixed(1).replace(/\.0$/, '') + '% avg' : 'not polled';
    if (mode === 'deficit') {
      var v = p.fiscal.avgBalancePctGDP;
      return v == null ? 'no GDP data' : pct(v) + (v < 0 ? ' deficit' : ' surplus');
    }
    if (mode === 'debt') {
      var m = debtMultiple(p);
      return m == null ? 'term too short' : '×' + m.toFixed(m < 10 ? 1 : 0).replace(/\.0$/, '') + ' debt';
    }
    return yearsLabel(p);
  }

  /* ---------- grid ---------- */
  function buildGrid() {
    var frag = document.createDocumentFragment();
    presidents.forEach(function (p) {
      var li = document.createElement('li');
      li.className = 'hp-item';
      li.dataset.id = p.id;
      li.style.setProperty('--hp-number', '"' + p.n + '"');
      li.value = p.n;
      var era = Object.keys(ERAS).filter(function (k) { var y = +p.start.slice(0, 4); return y >= ERAS[k][0] && y < ERAS[k][1]; })[0] || 'modern';
      li.dataset.era = era;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'hp-card';
      b.setAttribute('aria-haspopup', 'dialog');
      b.setAttribute('aria-label', p.name + ', ' + ordinal(p.n) + ' president, ' + yearsLabel(p) + '. Open profile.');
      b.innerHTML =
        '<span class="hp-oval"><img src="' + img(p) + '" alt="" width="360" height="480" loading="lazy" decoding="async"></span>' +
        '<span class="hp-name">' + esc(p.short) + '</span>' +
        '<span class="hp-sub"></span>';
      li.appendChild(b);
      frag.appendChild(li);
      cards[p.id] = b;
    });
    grid.innerHTML = '';
    grid.appendChild(frag);
    applyMode();
  }

  function applyMode() {
    var mode = modeSel.value;
    presidents.forEach(function (p) {
      var b = cards[p.id];
      b.querySelector('.hp-sub').textContent = caption(p, mode);
      var c = ring(p, mode);
      if (c) { b.style.setProperty('--hp-ring', c); b.classList.remove('hp-nodata'); }
      else { b.style.removeProperty('--hp-ring'); b.classList.toggle('hp-nodata', mode !== 'years'); }
    });
    var text = {
      years: '', approval: 'Ring color: Gallup average job approval over the term, darker means higher. Presidents before Truman were never polled this way.',
      deficit: 'Ring color: average yearly federal deficit as a share of the economy (GDP), darker means a bigger deficit. Records start in 1929.',
      debt: 'Ring color: how many times bigger the national debt was when the president left than when they arrived (nominal dollars), darker means more growth.'
    }[mode];
    legend.textContent = text;
    legend.hidden = !text;
  }

  function applyEra(era) {
    activeEra = era;
    hidePeek();
    eraBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.hpEra === era)); });
    var query = search ? search.value.trim().toLowerCase() : '';
    var year = /^\d{4}$/.test(query) ? Number(query) : null;
    var shown = 0, highlighted = 0;
    presidents.forEach(function (p) {
      var li = cards[p.id].parentNode;
      var on = era === 'all' || li.dataset.era === era;
      var match = !query || (year !== null
        ? year >= Number(p.start.slice(0, 4)) && year <= Number((p.end || String(new Date().getFullYear())).slice(0, 4))
        : (p.name + ' ' + p.short + ' ' + p.party).toLowerCase().includes(query));
      li.hidden = !match || (!!onlyEra && onlyEra.checked && !on);
      li.classList.toggle('hp-dim', !on);
      if (!li.hidden) { shown++; if (on) highlighted++; }
    });
    status.textContent = shown + ' of ' + presidents.length + ' presidencies shown' +
      (era !== 'all' ? '; ' + highlighted + ' in the selected era.' : '.');
    var empty = root.querySelector('#hp-empty');
    if (empty) empty.hidden = shown !== 0;
  }

  /* ---------- peek (hover / focus glimpse) ---------- */
  function statChips(p) {
    var f = p.fiscal, out = [];
    if (p.inProgress) out.push(['Approval', 'term in progress']);
    else if (p.approval) out.push(['Avg approval', p.approval.avg.toFixed(1).replace(/\.0$/, '') + '%']);
    else out.push(['Approval', 'not polled']);
    if (f.avgBalancePctGDP != null) out.push([f.avgBalancePctGDP < 0 ? 'Avg deficit' : 'Avg surplus', pct(f.avgBalancePctGDP) + ' of GDP']);
    if (f.debtStart && f.debtEnd) out.push(['Debt', moneyShort(f.debtStart) + ' → ' + moneyShort(f.debtEnd)]);
    return out.slice(0, 3);
  }
  function showPeek(card, p) {
    clearTimeout(peekTimer);
    var chips = statChips(p).map(function (c) {
      return '<div><dt>' + esc(c[0]) + '</dt><dd>' + esc(c[1]) + '</dd></div>';
    }).join('');
    var top = p.world && p.world[0] ? '<p class="hp-peek-world"><b>' + p.world[0].y + '</b> ' + esc(p.world[0].t) + '</p>' : '';
    peek.innerHTML =
      '<p class="hp-peek-kicker">' + ordinal(p.n) + ' president · ' + esc(p.party) + ' · ' + yearsLabel(p) + '</p>' +
      '<h4>' + esc(p.name) + '</h4>' +
      '<p class="hp-peek-tag">' + esc(p.tagline) + '</p>' +
      '<dl class="hp-peek-stats">' + chips + '</dl>' + top +
      '<p class="hp-peek-hint">Click for pros, cons and world events</p>';
    peek.hidden = false;
    var r = card.getBoundingClientRect();
    var w = peek.offsetWidth, h = peek.offsetHeight, vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var left = r.right + 12;
    if (left + w > vw - 8) left = r.left - w - 12;
    if (left < 8) left = Math.max(8, Math.min(vw - w - 8, r.left + r.width / 2 - w / 2));
    var top2 = r.top + r.height / 2 - h / 2;
    if (left > r.right || left + w < r.left) top2 = Math.min(Math.max(8, top2), vh - h - 8);
    else top2 = r.bottom + 10 + h < vh ? r.bottom + 10 : Math.max(8, r.top - h - 10);
    top2 = Math.max(8, Math.min(vh - h - 8, top2));
    peek.style.left = Math.round(left) + 'px';
    peek.style.top = Math.round(top2) + 'px';
    card.setAttribute('aria-describedby', 'hp-peek');
  }
  function hidePeek() {
    clearTimeout(peekTimer);
    peek.hidden = true;
    Object.keys(cards).forEach(function (k) { cards[k].removeAttribute('aria-describedby'); });
  }

  /* ---------- profile ---------- */
  function rangeBar(a) {
    return '<div class="hp-range" role="img" aria-label="Approval ranged from ' + a.low + ' to ' + a.high + ' percent, averaging ' + a.avg + ' percent">' +
      '<span class="hp-range-span" style="left:' + a.low + '%;width:' + (a.high - a.low) + '%"></span>' +
      '<span class="hp-range-avg" style="left:' + a.avg + '%"></span></div>' +
      '<div class="hp-range-scale" aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>';
  }
  function approvalBlock(p) {
    if (p.inProgress) return '<p class="hp-note">Term in progress. Gallup publishes its term average when a presidency ends.</p>';
    if (!p.approval) {
      var y = +p.start.slice(0, 4);
      var why = y < 1938 ? 'No scientific approval polling existed yet; Gallup began regular polling in 1935 to 1938.' :
        'Polled from 1938, but Gallup’s historical average table begins with Truman.';
      return '<p class="hp-note">' + why + '</p>';
    }
    var a = p.approval;
    return '<p class="hp-big">' + a.avg.toFixed(1).replace(/\.0$/, '') + '<small>% average</small></p>' + rangeBar(a) +
      '<p class="hp-fine">High ' + a.high + '% (' + esc(a.highWhen) + ') · Low ' + a.low + '% (' + esc(a.lowWhen) + ')</p>';
  }
  function moneyBlock(p) {
    var f = p.fiscal, parts = [];
    if (f.avgBalancePctGDP != null) {
      var neg = f.avgBalancePctGDP < 0;
      parts.push('<p class="hp-big">' + pct(f.avgBalancePctGDP) + '<small> of GDP, avg ' + (neg ? 'deficit' : 'surplus') + '</small></p>');
    } else if (p.inProgress) {
      parts.push('<p class="hp-note">Budget years are still being counted.</p>');
    } else {
      parts.push('<p class="hp-note">Federal GDP-based budget figures only go back to 1929' + (termDays(p) < 800 ? ', and this term was very short.' : '.') + '</p>');
    }
    if (f.debtStart && f.debtEnd) {
      parts.push('<p class="hp-fine"><b>National debt</b> (nominal dollars): ' + money(f.debtStart) + ' → ' + money(f.debtEnd) + (p.inProgress ? ' so far' : '') + '</p>');
    }
    if (f.debtGdpStart != null) {
      parts.push('<p class="hp-fine"><b>Debt as a share of GDP:</b> ' + f.debtGdpStart + '% → ' + f.debtGdpEnd + '%</p>');
    }
    return parts.join('');
  }
  function worldBlock(p) {
    return '<ul class="hp-world">' + (p.world || []).map(function (e) {
      return '<li><b>' + e.y + '</b><span>' + esc(e.t) + '</span></li>';
    }).join('') + '</ul>';
  }
  function list(items) {
    return '<ul>' + items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
  }
  function creditLine(pt) {
    var bits = [];
    if (pt.credit) bits.push(esc(pt.credit));
    bits.push(esc(pt.license || 'Public domain'));
    return bits.join(' · ') + (pt.page ? ' · <a href="' + esc(pt.page) + '" target="_blank" rel="noopener noreferrer">Source &amp; rights</a>' : '');
  }

  function openProfile(p, fromCard) {
    hidePeek();
    current = p;
    if (fromCard) opener = fromCard;
    var idx = presidents.indexOf(p);
    var prev = presidents[(idx - 1 + presidents.length) % presidents.length];
    var next = presidents[(idx + 1) % presidents.length];
    var days = termDays(p);
    var termNote = p.inProgress ? 'In office now' : (days < 800 ? 'Served ' + days + ' days' : '');
    var lesson = p.lesson ? '<a class="hp-lesson" href="' + esc(p.lesson.href) + '">Related lesson: ' + esc(p.lesson.label) + ' →</a>' : '';
    var warn = p.inProgress ? '<p class="hp-warn" role="note">This presidency is still happening. Treat this card as a snapshot, check current sources, and revisit it when the term ends.</p>' : '';
    var rank = p.rank ? '<div class="hp-stat"><h5>Historians’ ranking</h5><p class="hp-big">' + ordinal(p.rank) + '<small> of ' + (p.rankOf || 45) + '</small></p><p class="hp-fine">C-SPAN Survey of Presidential Leadership, 2021</p></div>' : '';

    body.innerHTML =
      '<div class="hp-head">' +
        '<figure class="hp-portrait" data-zoomable data-full="' + esc(img(p, 'lg')) + '">' +
          '<img src="' + img(p) + '" alt="Portrait of ' + esc(p.name) + '" width="360" height="480">' +
          '<figcaption><strong>' + esc(p.name) + '</strong> ' + esc(p.tagline) + ' ' + esc(p.impact) +
            '<span class="hp-credit">' + creditLine(p.portrait) + '</span></figcaption>' +
        '</figure>' +
        '<div class="hp-headtext">' +
          '<p class="hp-kicker">' + ordinal(p.n) + ' president · ' + esc(p.party) + '</p>' +
          '<h3 id="hp-profile-name">' + esc(p.name) + '</h3>' +
          '<p class="hp-years">' + yearsLabel(p) + (termNote ? ' · ' + termNote : '') + '</p>' +
          '<p class="hp-tagline">' + esc(p.tagline) + '</p>' +
          '<div class="hp-impact"><h4>Biggest impact</h4><p>' + esc(p.impact) + '</p></div>' +
          warn +
        '</div>' +
      '</div>' +
      '<div class="hp-stats">' +
        '<div class="hp-stat"><h5>Job approval</h5>' + approvalBlock(p) + '</div>' +
        '<div class="hp-stat"><h5>Deficit and debt</h5>' + moneyBlock(p) + '</div>' + rank +
      '</div>' +
      '<div class="hp-cols">' +
        '<section class="hp-pros" aria-label="What supporters point to"><h4><span aria-hidden="true">+</span> What supporters point to</h4>' + list(p.pros) + '</section>' +
        '<section class="hp-cons" aria-label="What critics point to"><h4><span aria-hidden="true">−</span> What critics point to</h4>' + list(p.cons) + '</section>' +
      '</div>' +
      '<section class="hp-world-wrap" aria-label="Around the world"><h4>Around the world during this term</h4>' + worldBlock(p) + '</section>' +
      '<p class="hp-discuss"><strong>Discuss:</strong> Which items above did the president control, and which did they only inherit or react to?</p>' +
      lesson;

    overlay.querySelector('.hp-prev').textContent = '← ' + prev.short;
    overlay.querySelector('.hp-next').textContent = next.short + ' →';
    overlay.querySelector('.hp-prev').dataset.id = prev.id;
    overlay.querySelector('.hp-next').dataset.id = next.id;
    var counter = overlay.querySelector('.hp-count');
    counter.textContent = ordinal(p.n) + ' of ' + presidents.length;

    if (overlay.hidden) {
      overlay.hidden = false;
      document.documentElement.classList.add('hp-open');
    }
    panel.scrollTop = 0;
    overlay.querySelector('.hp-close').focus();
    try { history.replaceState(null, '', '#president-' + p.id); } catch (e) { /* file:// or sandbox */ }
  }

  function closeProfile() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    document.documentElement.classList.remove('hp-open');
    try { history.replaceState(null, '', location.pathname + location.search + '#hall-of-presidents'); } catch (e) { /* ignore */ }
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    current = null;
  }

  function step(d) {
    if (!current) return;
    var i = (presidents.indexOf(current) + d + presidents.length) % presidents.length;
    opener = cards[presidents[i].id];
    openProfile(presidents[i]);
  }

  /* ---------- events ---------- */
  grid.addEventListener('click', function (e) {
    var b = e.target.closest('.hp-card');
    if (!b) return;
    openProfile(byId[b.parentNode.dataset.id], b);
  });
  if (canHover) {
    grid.addEventListener('pointerover', function (e) {
      var b = e.target.closest('.hp-card');
      if (!b || e.pointerType === 'touch') return;
      var p = byId[b.parentNode.dataset.id];
      clearTimeout(peekTimer);
      peekTimer = setTimeout(function () { showPeek(b, p); }, peek.hidden ? 140 : 40);
    });
    grid.addEventListener('pointerout', function (e) {
      var b = e.target.closest('.hp-card');
      if (!b || (e.relatedTarget && b.contains(e.relatedTarget))) return;
      clearTimeout(peekTimer);
      peekTimer = setTimeout(hidePeek, 90);
    });
  }
  grid.addEventListener('focusin', function (e) {
    var b = e.target.closest('.hp-card');
    if (b && b.matches(':focus-visible') && overlay.hidden) showPeek(b, byId[b.parentNode.dataset.id]);
  });
  grid.addEventListener('focusout', hidePeek);
  window.addEventListener('scroll', hidePeek, { passive: true });

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) { closeProfile(); return; }
    var b = e.target.closest('button');
    if (!b) return;
    if (b.classList.contains('hp-close')) closeProfile();
    else if (b.classList.contains('hp-prev')) step(-1);
    else if (b.classList.contains('hp-next')) step(1);
  });
  document.addEventListener('keydown', function (e) {
    if (overlay.hidden) { if (e.key === 'Escape') hidePeek(); return; }
    if (document.querySelector('.plb-open')) return;          // lightbox on top owns the keys
    if (e.key === 'Escape') { e.preventDefault(); closeProfile(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'Tab') {
      var f = Array.prototype.slice.call(panel.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]')).filter(function (n) { return n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, true);   // capture: see the lightbox as open before its own Escape closes it
  modeSel.addEventListener('change', applyMode);
  if (search) search.addEventListener('input', function () { applyEra(activeEra); });
  if (onlyEra) onlyEra.addEventListener('change', function () { applyEra(activeEra); });
  var reset = root.querySelector('#hp-reset');
  if (reset) reset.addEventListener('click', function () {
    search.value = ''; onlyEra.checked = false; modeSel.value = 'years';
    applyMode(); applyEra('all'); search.focus();
  });
  eraBtns.forEach(function (b) { b.addEventListener('click', function () { applyEra(b.dataset.hpEra); }); });

  /* ---------- go ---------- */
  fetch(dataUrl).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (data) {
    presidents = data.presidents;
    presidents.forEach(function (p) { byId[p.id] = p; });
    buildGrid();
    applyEra(activeEra);
    var m = /^#president-([a-z-0-9]+)$/.exec(location.hash);
    if (m && byId[m[1]]) openProfile(byId[m[1]], cards[m[1]]);
  }).catch(function () {
    grid.innerHTML = '<li class="hp-fail">The Hall could not load its data. Reload the page, or visit the <a href="https://www.whitehouse.gov/about-the-white-house/presidents/">White House presidents page</a>.</li>';
  });
}());
