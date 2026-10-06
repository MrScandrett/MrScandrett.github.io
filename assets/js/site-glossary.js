/* site-glossary.js — quiet, accessible definitions across ClassroomOS */
(function () {
  'use strict';

  if (window.ClassroomOSGlossary) return;

  var script = document.currentScript;
  var scriptUrl = script && script.src ? script.src : '/assets/js/site-glossary.js';
  var dataUrl = script && script.dataset.glossarySrc
    ? new URL(script.dataset.glossarySrc, document.baseURI).href
    : new URL('../../data/glossary.json', scriptUrl).href;
  var cssUrl = new URL('../css/components/site-glossary.css', scriptUrl).href;
  var MAX_AUTOMATIC_TERMS = 12;
  var HOVER_DELAY = 180;
  var state = {
    terms: [],
    byKey: new Map(),
    contexts: [],
    card: null,
    active: null,
    hoverTimer: 0,
    closeTimer: 0
  };

  function normalize(value) {
    return String(value || '').trim().toLocaleLowerCase('en-US');
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function splitContexts(value) {
    return String(value || '').split(/[\s,]+/).map(normalize).filter(Boolean);
  }

  // A page's context comes from <html data-glossary-context="…">, else from the
  // longest matching path prefix in the glossary's `contexts` map. Terms tagged
  // with `contexts` only auto-mark on pages that share one of those tags, and a
  // word with several senses (node, graph, depth…) resolves to the matching one.
  function pageContexts(map) {
    var explicit = document.documentElement.dataset.glossaryContext;
    if (explicit) return splitContexts(explicit);
    var path = decodeURIComponent(window.location.pathname);
    var best = '';
    Object.keys(map || {}).forEach(function (prefix) {
      if (prefix.length > best.length && path.indexOf(prefix) !== -1) best = prefix;
    });
    return best ? map[best].map(normalize) : [];
  }

  // How well a sense fits: untagged (general) senses score 0.5, tagged ones
  // score by the page contexts they share (earlier = the lesson's main subject,
  // so it weighs more), and senses sharing none score -1.
  function contextScore(entry, contexts) {
    if (!entry.contexts || !entry.contexts.length) return 0.5;
    var score = 0;
    entry.contexts.forEach(function (tag) {
      var index = contexts.indexOf(normalize(tag));
      if (index !== -1) score += contexts.length - index;
    });
    return score || -1;
  }

  function bestSense(list, contexts) {
    var best = null;
    var bestScore = -Infinity;
    list.forEach(function (entry) {
      var score = contextScore(entry, contexts);
      if (score > bestScore) { best = entry; bestScore = score; }
    });
    return { entry: best, score: bestScore };
  }

  function addKey(key, entry) {
    key = normalize(key);
    var list = state.byKey.get(key);
    if (!list) state.byKey.set(key, list = []);
    if (list.indexOf(entry) === -1) list.push(entry);
  }

  // Pick the sense of a word for this element: its own data-glossary-context,
  // then the nearest ancestor's, then the page's. Falls back to the first sense.
  function lookup(key, element) {
    var list = state.byKey.get(normalize(key));
    if (!list) return null;
    if (list.length === 1) return list[0];
    var scoped = element && element.closest && element.closest('[data-glossary-context]');
    return bestSense(list, scoped ? splitContexts(scoped.dataset.glossaryContext) : state.contexts).entry;
  }

  function isAcronym(alias) {
    return alias.length <= 4 && /^[A-Z0-9]+$/.test(alias);
  }

  // Short all-caps acronyms (IMU, CRT, GR) only match in capitals, so "Gr." or
  // "dof" in ordinary prose doesn't light up; everything else ignores case.
  function compilePatterns(entry) {
    var aliases = [entry.term].concat(entry.aliases || []).sort(function (a, b) { return b.length - a.length; });
    var groups = [[aliases.filter(function (a) { return !isAcronym(a); }), 'i'], [aliases.filter(isAcronym), '']];
    return groups.filter(function (group) { return group[0].length; }).map(function (group) {
      return new RegExp('(?:^|\\b)(' + group[0].map(escapeRegExp).join('|') + ')(?=$|\\b)', group[1]);
    });
  }

  function firstMatch(entry, text) {
    var best = null;
    entry.patterns.forEach(function (pattern) {
      var match = pattern.exec(text);
      if (match && (!best || match.index < best.index)) best = match;
    });
    return best;
  }

  function addStylesheet() {
    if (document.querySelector('link[data-classroomos-glossary-style="true"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    link.dataset.classroomosGlossaryStyle = 'true';
    document.head.appendChild(link);
  }

  function makeButton(text, entry) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'cos-glossary-term';
    button.textContent = text;
    button.dataset.glossary = entry.term;
    if (entry.sense) button.dataset.glossarySense = entry.sense;
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'classroomos-glossary-card');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', text + ': show definition');
    return button;
  }

  function replaceTextMatch(node, match, entry) {
    var value = node.nodeValue;
    var index = match.index;
    var fragment = document.createDocumentFragment();
    if (index > 0) fragment.appendChild(document.createTextNode(value.slice(0, index)));
    fragment.appendChild(makeButton(value.slice(index, index + match[0].length), entry));
    if (index + match[0].length < value.length) {
      fragment.appendChild(document.createTextNode(value.slice(index + match[0].length)));
    }
    node.parentNode.replaceChild(fragment, node);
  }

  function isEligibleTextNode(node, root) {
    if (!node.nodeValue || !node.nodeValue.trim()) return false;
    var parent = node.parentElement;
    if (!parent || !root.contains(parent)) return false;
    if (parent.closest('a, button, h1, h2, h3, h4, code, pre, kbd, samp, script, noscript, style, textarea, input, select, option, label, nav, header, footer, dialog, [contenteditable], [data-no-glossary], .cos-glossary-card, .cos-glossary-term')) return false;
    return true;
  }

  function markExplicitTerms(root) {
    root.querySelectorAll('[data-glossary]:not(.cos-glossary-term)').forEach(function (element) {
      var entry = lookup(element.dataset.glossary || element.textContent, element);
      if (!entry) return;
      element.classList.add('cos-glossary-term');
      if (!/^(BUTTON|A)$/.test(element.tagName)) element.setAttribute('tabindex', '0');
      element.setAttribute('role', 'button');
      element.setAttribute('aria-haspopup', 'dialog');
      element.setAttribute('aria-controls', 'classroomos-glossary-card');
      element.setAttribute('aria-expanded', 'false');
      element.setAttribute('aria-label', element.textContent.trim() + ': show definition');
      element.dataset.glossary = entry.term;
      if (entry.sense) element.dataset.glossarySense = entry.sense;
    });
  }

  function markAutomaticTerms(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        return isEligibleTextNode(node, root) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    // One sense per word: the best fit for this page, and only if it fits at all.
    var senses = new Map();
    state.terms.forEach(function (entry) {
      var key = normalize(entry.term);
      if (!senses.has(key)) senses.set(key, bestSense(state.byKey.get(key), state.contexts));
    });
    var candidates = state.terms.filter(function (entry) {
      var sense = senses.get(normalize(entry.term));
      return sense.entry === entry && sense.score > 0;
    });
    var marked = new Set();
    for (var i = 0; i < nodes.length && marked.size < MAX_AUTOMATIC_TERMS; i += 1) {
      var node = nodes[i];
      if (!node.isConnected) continue;
      for (var j = 0; j < candidates.length; j += 1) {
        var entry = candidates[j];
        var key = normalize(entry.term);
        if (marked.has(key)) continue;
        var match = firstMatch(entry, node.nodeValue);
        if (!match) continue;
        var exactMatch = { index: match.index + match[0].indexOf(match[1]), 0: match[1] };
        replaceTextMatch(node, exactMatch, entry);
        marked.add(key);
        break;
      }
    }
  }

  function createCard() {
    var card = document.createElement('aside');
    card.className = 'cos-glossary-card';
    card.id = 'classroomos-glossary-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'false');
    card.setAttribute('aria-label', 'Word definition');
    card.hidden = true;
    card.innerHTML =
      '<button class="cos-glossary-close" type="button" aria-label="Close definition">×</button>' +
      '<div class="cos-glossary-head">' +
        '<div><strong class="cos-glossary-word" id="classroomos-glossary-word"></strong><p class="cos-glossary-pronunciation" id="classroomos-glossary-pronunciation"></p><p class="cos-glossary-sense" hidden></p></div>' +
        '<button class="cos-glossary-speak" type="button" aria-label="Hear this word pronounced">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12zm-2.5-8.7v2.06a7 7 0 0 1 0 13.28v2.06a9 9 0 0 0 0-17.4z"/></svg>' +
          '<span>Hear it</span>' +
        '</button>' +
      '</div>' +
      '<p class="cos-glossary-definition" id="classroomos-glossary-definition"></p>' +
      '<a class="cos-glossary-history" target="_blank" rel="noopener noreferrer">Explore the word history ↗</a>';
    document.body.appendChild(card);

    card.querySelector('.cos-glossary-close').addEventListener('click', function () { close(true); });
    card.querySelector('.cos-glossary-speak').addEventListener('click', speakActive);
    card.addEventListener('pointerenter', cancelClose);
    card.addEventListener('pointerleave', scheduleClose);
    return card;
  }

  function positionCard(trigger) {
    if (!state.card || state.card.hidden) return;
    var gap = 10;
    var edge = 8;
    var triggerRect = trigger.getBoundingClientRect();
    var cardRect = state.card.getBoundingClientRect();
    var left = triggerRect.left + Math.min(triggerRect.width / 2, 42) - 20;
    left = Math.max(edge, Math.min(left, window.innerWidth - cardRect.width - edge));
    var below = triggerRect.bottom + gap;
    var above = triggerRect.top - cardRect.height - gap;
    var top = below + cardRect.height <= window.innerHeight - edge ? below : above;
    top = Math.max(edge, Math.min(top, window.innerHeight - cardRect.height - edge));
    state.card.style.left = Math.round(left) + 'px';
    state.card.style.top = Math.round(top) + 'px';
    state.card.style.setProperty('--glossary-origin', Math.max(16, triggerRect.left - left + triggerRect.width / 2) + 'px ' + (top < triggerRect.top ? '100%' : '0'));
  }

  function entryFor(trigger) {
    var list = state.byKey.get(normalize(trigger.dataset.glossary || trigger.textContent));
    if (!list) return null;
    var sense = trigger.dataset.glossarySense;
    for (var i = 0; sense && i < list.length; i += 1) {
      if (list[i].sense === sense) return list[i];
    }
    return lookup(trigger.dataset.glossary || trigger.textContent, trigger);
  }

  function open(trigger) {
    var entry = entryFor(trigger);
    if (!entry) return;
    cancelClose();
    if (state.active && state.active !== trigger) state.active.setAttribute('aria-expanded', 'false');
    state.active = trigger;
    trigger.setAttribute('aria-expanded', 'true');
    trigger.setAttribute('aria-describedby', 'classroomos-glossary-pronunciation classroomos-glossary-definition');
    state.card.querySelector('.cos-glossary-word').textContent = entry.term;
    var sense = state.card.querySelector('.cos-glossary-sense');
    sense.textContent = entry.sense || '';
    sense.hidden = !entry.sense;
    state.card.querySelector('.cos-glossary-pronunciation').textContent = entry.pronunciation + '  ·  ' + entry.ipa;
    state.card.querySelector('.cos-glossary-definition').textContent = entry.definition;
    state.card.querySelector('.cos-glossary-history').hidden = !entry.etymology;
    state.card.querySelector('.cos-glossary-history').href = entry.etymology || '#';
    state.card.querySelector('.cos-glossary-history').setAttribute('aria-label', 'Explore the word history of ' + entry.term + ' on Wiktionary (opens in a new tab)');
    state.card.hidden = false;
    positionCard(trigger);
  }

  function close(returnFocus) {
    cancelClose();
    if (!state.card || state.card.hidden) return;
    var previous = state.active;
    // Move focus before hiding so the trigger's focus handler cannot reopen a
    // card that Escape or the close button is in the process of dismissing.
    if (returnFocus && previous && previous.isConnected) previous.focus();
    state.card.hidden = true;
    if (previous) {
      previous.setAttribute('aria-expanded', 'false');
      previous.removeAttribute('aria-describedby');
    }
    state.active = null;
  }

  function scheduleOpen(trigger) {
    window.clearTimeout(state.hoverTimer);
    state.hoverTimer = window.setTimeout(function () { open(trigger); }, HOVER_DELAY);
  }

  function scheduleClose() {
    window.clearTimeout(state.hoverTimer);
    window.clearTimeout(state.closeTimer);
    state.closeTimer = window.setTimeout(function () { close(false); }, 220);
  }

  function cancelClose() {
    window.clearTimeout(state.closeTimer);
  }

  function speakActive() {
    if (!state.active || !('speechSynthesis' in window)) return;
    var entry = entryFor(state.active);
    if (!entry) return;
    window.speechSynthesis.cancel();
    var utterance = new SpeechSynthesisUtterance(entry.term);
    utterance.lang = 'en-US';
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
  }

  function bindEvents() {
    document.addEventListener('pointerover', function (event) {
      var trigger = event.target.closest && event.target.closest('.cos-glossary-term');
      if (trigger && event.pointerType !== 'touch') scheduleOpen(trigger);
    });
    document.addEventListener('pointerout', function (event) {
      var trigger = event.target.closest && event.target.closest('.cos-glossary-term');
      if (trigger && event.pointerType !== 'touch' && (!event.relatedTarget || !trigger.contains(event.relatedTarget))) scheduleClose();
    });
    document.addEventListener('focusin', function (event) {
      var trigger = event.target.closest && event.target.closest('.cos-glossary-term');
      if (trigger) open(trigger);
    });
    document.addEventListener('click', function (event) {
      var trigger = event.target.closest && event.target.closest('.cos-glossary-term');
      if (trigger) {
        event.preventDefault();
        open(trigger);
        return;
      }
      if (state.card && !state.card.hidden && !state.card.contains(event.target)) close(false);
    });
    document.addEventListener('keydown', function (event) {
      var trigger = event.target.closest && event.target.closest('.cos-glossary-term');
      if (trigger && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        open(trigger);
        state.card.querySelector('.cos-glossary-speak').focus();
      }
      if (event.key === 'Escape' && state.card && !state.card.hidden) close(true);
    });
    window.addEventListener('resize', function () { if (state.active) positionCard(state.active); });
    window.addEventListener('scroll', function () { if (state.active) positionCard(state.active); }, true);
  }

  function chooseRoot() {
    return document.querySelector('[data-glossary-root], main, article, [role="main"]') || document.body;
  }

  function init(payload) {
    state.contexts = pageContexts(payload.contexts);
    state.terms = (payload.terms || []).slice().sort(function (a, b) { return b.term.length - a.term.length; });
    state.terms.forEach(function (entry) {
      addKey(entry.term, entry);
      (entry.aliases || []).forEach(function (alias) { addKey(alias, entry); });
      entry.patterns = compilePatterns(entry);
    });
    addStylesheet();
    state.card = createCard();
    var root = chooseRoot();
    markExplicitTerms(root);
    if (!document.documentElement.hasAttribute('data-glossary-manual')) markAutomaticTerms(root);
    bindEvents();
    document.dispatchEvent(new CustomEvent('classroomos:glossaryready', { detail: { count: state.terms.length, contexts: state.contexts.slice() } }));
  }

  window.ClassroomOSGlossary = {
    close: close,
    refresh: function (root) {
      root = root || chooseRoot();
      markExplicitTerms(root);
      markAutomaticTerms(root);
    }
  };

  fetch(dataUrl)
    .then(function (response) {
      if (!response.ok) throw new Error('Glossary data returned ' + response.status);
      return response.json();
    })
    .then(function (payload) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { init(payload); }, { once: true });
      } else {
        init(payload);
      }
    })
    .catch(function (error) {
      console.warn('[ClassroomOS glossary] Could not load definitions.', error);
    });
}());
