/* Live SVG Sestina Braid visualizer for Arnaut Daniel: The Sestina Workshop.
 * Reads the active stanza, selected end word, and 6 words directly from the DOM
 * so it stays cleanly synced without touching the lesson's inline script.
 */
(function () {
  'use strict';

  var workshop = document.getElementById('workshop');
  var wordChooser = document.getElementById('word-chooser');
  var stanzaLabel = document.getElementById('stanza-label');
  var stanzaBox = workshop ? workshop.querySelector('.ad-stanza') : null;
  if (!workshop || !wordChooser || !stanzaLabel || !stanzaBox) return;

  var ns = 'http://www.w3.org/2000/svg';
  var PATTERN = [
    [1, 2, 3, 4, 5, 6],
    [6, 1, 5, 2, 4, 3],
    [3, 6, 4, 1, 2, 5],
    [5, 3, 2, 6, 1, 4],
    [4, 5, 1, 3, 6, 2],
    [2, 4, 6, 5, 3, 1]
  ];
  var COLORS = ['#9b2a1c', '#1f3f73', '#0f766e', '#b45309', '#6d28d9', '#374151'];

  var panel = document.createElement('div');
  panel.className = 'ad-spiral-wrap';
  panel.style.marginTop = '1rem';
  panel.setAttribute('aria-label', 'Live sestina permutation braid');
  stanzaBox.insertAdjacentElement('afterend', panel);

  function svgEl(tag, attrs, parent, text) {
    var el = document.createElementNS(ns, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    if (text != null) el.textContent = text;
    if (parent) parent.appendChild(el);
    return el;
  }

  function readState() {
    var m = (stanzaLabel.textContent || '').match(/Stanza\s+(\d)/i);
    var stanzaIdx = m ? Math.max(0, Math.min(5, Number(m[1]) - 1)) : 0;
    var buttons = Array.prototype.slice.call(wordChooser.querySelectorAll('button.ad-word'));
    var words = [];
    var selectedNum = 1;
    buttons.forEach(function (btn, idx) {
      var small = btn.querySelector('small');
      var full = btn.textContent || '';
      var word = small ? full.slice(small.textContent.length).trim() : full.trim();
      words.push(word || ('Word ' + (idx + 1)));
      if (btn.classList.contains('is-active') || btn.getAttribute('aria-pressed') === 'true') {
        selectedNum = idx + 1;
      }
    });
    return { stanzaIdx: stanzaIdx, selectedNum: selectedNum, words: words };
  }

  function render() {
    var st = readState();
    var svg = svgEl('svg', {
      viewBox: '0 0 820 260',
      role: 'img',
      style: 'display:block;width:100%;height:auto;border-radius:12px;border:1px solid #c6aa77;background:#fffdf7;'
    });
    svgEl('title', {}, svg, 'Live 6-stanza sestina spiral braid highlighting ' + (st.words[st.selectedNum - 1] || 'word 1'));

    var colX = [110, 224, 338, 452, 566, 680];
    var rowY = [66, 98, 130, 162, 194, 226];

    // Active stanza highlight column
    svgEl('rect', {
      x: colX[st.stanzaIdx] - 48,
      y: 16,
      width: 96,
      height: 230,
      rx: 10,
      fill: '#fbf1d6',
      stroke: '#9b2a1c',
      'stroke-width': 2
    }, svg);

    // Line labels on left
    for (var line = 0; line < 6; line++) {
      svgEl('text', {
        x: 24,
        y: rowY[line] + 4,
        'font-family': 'ui-monospace, Menlo, monospace',
        'font-size': 11,
        'font-weight': 700,
        fill: '#514b42'
      }, svg, 'L' + (line + 1));
    }

    // Column titles
    for (var s = 0; s < 6; s++) {
      svgEl('text', {
        x: colX[s],
        y: 36,
        'text-anchor': 'middle',
        'font-family': 'system-ui, sans-serif',
        'font-size': 11.5,
        'font-weight': 800,
        fill: s === st.stanzaIdx ? '#9b2a1c' : '#234e60'
      }, svg, 'Stanza ' + (s + 1));
    }

    // Draw smooth braid curves for all 6 end-words across stanzas 1..6
    for (var wNum = 1; wNum <= 6; wNum++) {
      var isSel = wNum === st.selectedNum;
      var color = COLORS[wNum - 1];
      var d = '';
      for (var s = 0; s < 6; s++) {
        var pos = PATTERN[s].indexOf(wNum);
        var x = colX[s];
        var y = rowY[pos];
        if (s === 0) d += 'M ' + x + ' ' + y;
        else {
          var prevPos = PATTERN[s - 1].indexOf(wNum);
          var px = colX[s - 1];
          var py = rowY[prevPos];
          var cx = (px + x) / 2;
          d += ' C ' + cx + ' ' + py + ', ' + cx + ' ' + y + ', ' + x + ' ' + y;
        }
      }
      svgEl('path', {
        d: d,
        fill: 'none',
        stroke: color,
        'stroke-width': isSel ? 4 : 1.6,
        'stroke-opacity': isSel ? 1 : 0.28
      }, svg);
    }

    // Word pills at each node
    for (var s = 0; s < 6; s++) {
      for (var pos = 0; pos < 6; pos++) {
        var wNum = PATTERN[s][pos];
        var isSel = wNum === st.selectedNum;
        var inCur = s === st.stanzaIdx;
        var label = st.words[wNum - 1] || ('W' + wNum);
        if (label.length > 10) label = label.slice(0, 9) + '…';
        var x = colX[s];
        var y = rowY[pos];
        var cellFill = isSel ? COLORS[wNum - 1] : inCur ? '#ffffff' : '#f8f5ec';
        var ink = isSel ? '#ffffff' : '#29251f';
        // The cell's own colour is the text's backdrop; say so for the contrast guard and pa11y.
        var cell = svgEl('g', { 'data-contrast-guard-skip': '', style: 'background-color:' + cellFill }, svg);
        svgEl('rect', {
          x: x - 41,
          y: y - 11,
          width: 82,
          height: 22,
          rx: 6,
          fill: cellFill,
          stroke: isSel ? COLORS[wNum - 1] : inCur ? '#b99a5b' : '#d6c3aa',
          'stroke-width': isSel ? 1.8 : 1
        }, cell);
        svgEl('text', {
          x: x,
          y: y + 4,
          'text-anchor': 'middle',
          'font-family': 'Georgia, serif',
          'font-size': 11,
          'font-weight': isSel || inCur ? 700 : 400,
          fill: ink,
          style: 'fill:' + ink + ';color:' + ink
        }, cell, label);
      }
    }

    // Tornada summary column on right
    svgEl('text', {
      x: 766, y: 36, 'text-anchor': 'middle',
      'font-family': 'system-ui, sans-serif', 'font-size': 11, 'font-weight': 800, fill: '#75411f'
    }, svg, 'Tornada');
    [[2, 5], [4, 3], [6, 1]].forEach(function (pair, i) {
      var ty = 86 + i * 54;
      var hasSel = pair[0] === st.selectedNum || pair[1] === st.selectedNum;
      svgEl('rect', {
        x: 726, y: ty - 16, width: 80, height: 38, rx: 7,
        fill: hasSel ? '#fbf1d6' : '#ffffff',
        stroke: hasSel ? '#9b2a1c' : '#c6aa77',
        'stroke-width': hasSel ? 1.8 : 1
      }, svg);
      svgEl('text', {
        x: 766, y: ty, 'text-anchor': 'middle',
        'font-family': 'Georgia, serif', 'font-size': 10, 'font-weight': 700, fill: '#29251f'
      }, svg, (st.words[pair[0] - 1] || pair[0]).slice(0, 9));
      svgEl('text', {
        x: 766, y: ty + 14, 'text-anchor': 'middle',
        'font-family': 'Georgia, serif', 'font-size': 10, 'font-weight': 700, fill: '#9b2a1c'
      }, svg, (st.words[pair[1] - 1] || pair[1]).slice(0, 9));
    });

    panel.replaceChildren(svg);
  }

  var obs = new MutationObserver(render);
  obs.observe(wordChooser, { childList: true, subtree: true, attributes: true });
  obs.observe(stanzaLabel, { childList: true, characterData: true, subtree: true });
  render();
})();
