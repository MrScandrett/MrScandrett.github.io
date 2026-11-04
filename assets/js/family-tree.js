/* family-tree.js — the one family-tree engine for every lesson.
 *
 * The sibling of timeline.js: a timeline is one line of events, a family tree is what you
 * need when the story BRANCHES: who descended from whom, which line led to which, where two
 * lines merge, and which branches are uncertain. Generations run down the page (or sideways),
 * so a student reads "time" as depth and "kinship" as position.
 *
 * Write the tree as an ordinary nested list; the engine reads it. The list stays the
 * content (screen readers, print and no-JS all get it), and the engine adds a toolbar with
 * two views:
 *   Tree — cards on a pannable, zoomable canvas, one row per generation, elbow
 *          connectors; press a card to light up its lineage (ancestors + descendants).
 *   List — the nested outline (always used for print).
 *
 * Usage:
 *   <ul data-family-tree data-tree-title="The Table of Nations">
 *     <li id="noah" data-group="Noah" data-color="#555" data-when="c. 2500 BC" data-partner="Mrs. Noah">
 *       <strong>Noah</strong> survived the flood with his family.
 *       <ul>
 *         <li data-group="Shem"><strong>Shem</strong> …
 *           <ul><li data-label="Elam">…</li></ul>
 *         </li>
 *         <li data-group="Ham">…</li>
 *       </ul>
 *     </li>
 *   </ul>
 *   (lesson-print-button.js loads this file whenever a page has [data-family-tree];
 *   pages without it add <script src="…/assets/js/family-tree.js" defer></script>.)
 *
 * A node is an <li>; its children are the nested list inside it. Everything in the <li>
 * except that nested list is the node's detail text.
 *
 * Per item:
 *   data-label      short card title (else the first <strong>/<b>, else the text up to the
 *                   first dash, colon or full stop)
 *   data-when       a date or range shown on the card ("c. 2000 BC", "2.5–1.8 Mya")
 *   data-group      a branch/category; children inherit it; groups become colour chips
 *   data-color      the group's colour (else a palette colour in order of appearance)
 *   data-partner    a second person in the same generation: the card becomes a couple and
 *                   the children descend from between them ("with Sarah")
 *   data-partner-mark  the glyph between the two (default ⚭; use "=" for "often treated as
 *                   the same species", which also words the list "also called …")
 *   data-link="uncertain"   the line to the parent is a guess: dotted connector and a "?"
 *   data-also-from  "id1 id2": extra lines from other nodes (a second parent, interbreeding,
 *                   a lineage that merges), drawn dashed
 *   data-here       ring the card as "You are here" (the living person/species)
 *   data-collapsed  start with this branch folded away
 *   id              needed only when another node points at it with data-also-from
 *   the first <img> or <figure> inside an item becomes a thumbnail on the card and a
 *   click-to-enlarge photo in the detail panel (photo-lightbox.js is loaded for it).
 * Per tree: data-tree-title, data-tree-flow="down|right" (first visit; the student's choice
 *   is remembered site-wide), data-tree-view="tree|list", data-tree-generations="Age"
 *   (word used on the generation rows; "off" hides them), data-tree-search (a search box).
 *
 * Keyboard: Tab to the tree, arrows move along kin (↑ parent, ↓ child, ←/→ sibling; flipped
 * when the tree runs sideways), Enter selects, + / − unfold / fold a branch, 0 fits.
 * Mouse: drag the background to pan, Ctrl+wheel to zoom. Touch: scroll normally. F = full screen.
 *
 * From JS: ClassroomOSFamilyTree.create(hostEl, { title, flow, roots: [{ label, text | html,
 * when, group, color, partner, link, also, here, collapsed, id, children: [...] }] }).
 * Pure helpers (tested in Node, no DOM): buildModel(roots), layout(model, opts),
 * ancestors(node), descendants(node).
 */
(function (global) {
  'use strict';

  var hasDOM = typeof document !== 'undefined';
  if (hasDOM && global.ClassroomOSFamilyTree) return;

  var script = hasDOM ? document.currentScript : null;
  var STORE_KEY = 'classroomos:family-tree:v1';
  var PALETTE = ['#2563eb', '#c2410c', '#15803d', '#9333ea', '#be123c', '#0e7490', '#a16207', '#4d7c0f'];

  // ---------------------------------------------------------------- model (pure)

  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }

  // roots: [{ label, text, html, when, group, color, partner, link, also, here, collapsed, id,
  //           img: { src, alt, full, caption }, children: [...] }]
  function buildModel(roots) {
    var nodes = [];
    var byId = {};
    var groups = [];
    var groupColor = {};

    function add(src, parent, depth) {
      var n = {
        index: nodes.length,
        id: '',
        label: clean(src.label) || clean(src.text).split(/\s+[—–-]\s+|[:.]\s/)[0].slice(0, 48),
        text: clean(src.text != null ? src.text : src.label),
        html: src.html != null ? String(src.html) : '',
        when: clean(src.when),
        group: clean(src.group) || (parent ? parent.group : ''),
        color: clean(src.color),
        partner: clean(src.partner),
        mark: clean(src.mark),
        link: clean(src.link).toLowerCase(),
        also: Array.isArray(src.also) ? src.also.slice() : String(src.also || '').split(/[\s,]+/).filter(Boolean),
        here: !!src.here,
        collapsed: !!src.collapsed,
        img: src.img || null,
        parent: parent,
        depth: depth,
        children: []
      };
      var want = clean(src.id) || 'n' + n.index;
      var id = want;
      for (var k = 2; byId[id]; k++) id = want + '-' + k;
      n.id = id;
      byId[id] = n;
      nodes.push(n);
      if (n.group && n.color && !groupColor[n.group]) groupColor[n.group] = n.color;
      (src.children || []).forEach(function (c) { n.children.push(add(c, n, depth + 1)); });
      return n;
    }
    var top = (roots || []).map(function (r) { return add(r, null, 0); });

    // Groups in order of first appearance; colours from data-color, else the palette.
    nodes.forEach(function (n) { if (n.group && groups.indexOf(n.group) === -1) groups.push(n.group); });
    groups.forEach(function (g, i) { if (!groupColor[g]) groupColor[g] = PALETTE[i % PALETTE.length]; });
    nodes.forEach(function (n) {
      n.color = (n.group && groupColor[n.group]) || n.color || (n.parent && n.parent.color) || '';
    });
    // data-also-from ids that point nowhere are dropped (the test reports them from markup).
    nodes.forEach(function (n) { n.also = n.also.filter(function (id) { return byId[id] && byId[id] !== n; }); });

    return { roots: top, nodes: nodes, byId: byId, groups: groups, groupColor: groupColor };
  }

  function ancestors(n) {
    var out = [];
    for (var p = n.parent; p; p = p.parent) out.unshift(p);
    return out;
  }
  function descendants(n) {
    var out = [];
    (function walk(x) { x.children.forEach(function (c) { out.push(c); walk(c); }); })(n);
    return out;
  }
  function visibleParent(n) {
    var hidden = null;
    for (var p = n.parent; p; p = p.parent) if (p.collapsed) hidden = p;
    return hidden;
  }

  // ---------------------------------------------------------------- layout (pure)
  // One row per generation (a column when flow is "right"); siblings side by side; a parent is
  // centred over its children; a couple is one wide card with the children descending from
  // its middle. Each subtree takes the room it needs, so branches never overlap.

  var DEFAULTS = { w: 156, h: 66, sib: 20, gen: 46, pair: 8, pad: 24, flow: 'down', generations: true };

  function layout(model, opts) {
    var o = {};
    Object.keys(DEFAULTS).forEach(function (k) { o[k] = opts && opts[k] != null ? opts[k] : DEFAULTS[k]; });
    var down = o.flow !== 'right';
    var count = model.nodes.length;
    var rel = new Array(count); // a node's centre relative to its parent's centre

    function box(n) {
      var pair = !!n.partner;
      return down ? { w: pair ? 2 * o.w + o.pair : o.w, h: o.h } : { w: o.w, h: pair ? 2 * o.h + o.pair : o.h };
    }
    function span(n) { return down ? box(n).w : box(n).h; }
    function kids(n) { return n.collapsed ? [] : n.children; }

    // Tidy tree: every subtree reports its left and right outline, one pair per generation
    // (relative to its own centre). Siblings are pushed apart only as far as their outlines
    // collide, so a short branch tucks in beside a deep one instead of reserving a full column.
    function place(items, gap) {
      var contours = items.map(contour);
      var accL = [], accR = [], offs = [];
      contours.forEach(function (c, i) {
        var shift = 0;
        if (i > 0) {
          shift = -Infinity;
          for (var d = 0; d < Math.min(accR.length, c.L.length); d++) shift = Math.max(shift, accR[d] + gap - c.L[d]);
        }
        offs.push(shift);
        for (var k = 0; k < c.L.length; k++) {
          accL[k] = k < accL.length ? Math.min(accL[k], shift + c.L[k]) : shift + c.L[k];
          accR[k] = k < accR.length ? Math.max(accR[k], shift + c.R[k]) : shift + c.R[k];
        }
      });
      return { offs: offs, L: accL, R: accR };
    }
    function contour(n) {
      var half = span(n) / 2;
      var ks = kids(n);
      if (!ks.length) return { L: [-half], R: [half] };
      var p = place(ks, o.sib);
      var centre = (p.offs[0] + p.offs[p.offs.length - 1]) / 2;
      ks.forEach(function (k, i) { rel[k.index] = p.offs[i] - centre; });
      return {
        L: [-half].concat(p.L.map(function (v) { return v - centre; })),
        R: [half].concat(p.R.map(function (v) { return v - centre; }))
      };
    }

    var forest = place(model.roots, o.sib * 2);
    var left = Infinity;
    forest.L.forEach(function (v) { left = Math.min(left, v); });
    model.roots.forEach(function (r, i) { rel[r.index] = forest.offs[i] - left; });

    var gutter = o.generations ? (down ? 78 : 0) : 0;
    var header = o.generations ? (down ? 0 : 26) : 0;
    var stepDepth = (down ? o.h : o.w) + o.gen;
    var rects = {};
    var order = [];
    var maxDepth = 0;

    function putNode(n, centreB) {
      var size = box(n);
      var along = o.pad + n.depth * stepDepth;
      var b = centreB;
      var rect = down
        ? { x: o.pad + gutter + b - size.w / 2, y: along + header, w: size.w, h: size.h }
        : { x: along + gutter, y: o.pad + header + b - size.h / 2, w: size.w, h: size.h };
      rects[n.id] = rect;
      order.push(n);
      maxDepth = Math.max(maxDepth, n.depth);
      kids(n).forEach(function (k) { putNode(k, b + rel[k.index]); });
    }
    model.roots.forEach(function (r) { putNode(r, rel[r.index]); });

    var width = 0, height = 0;
    order.forEach(function (n) {
      var r = rects[n.id];
      width = Math.max(width, r.x + r.w);
      height = Math.max(height, r.y + r.h);
    });
    width += o.pad; height += o.pad;

    // Connectors. A child hangs from the middle of its parent card (between a couple).
    var links = [];
    function r1(v) { return Math.round(v * 10) / 10; }
    function elbow(a, b) {
      if (down) {
        var ax = a.x + a.w / 2, ay = a.y + a.h, bx = b.x + b.w / 2, by = b.y, my = ay + (by - ay) / 2;
        return 'M' + r1(ax) + ' ' + r1(ay) + 'V' + r1(my) + 'H' + r1(bx) + 'V' + r1(by);
      }
      var ax2 = a.x + a.w, ay2 = a.y + a.h / 2, bx2 = b.x, by2 = b.y + b.h / 2, mx = ax2 + (bx2 - ax2) / 2;
      return 'M' + r1(ax2) + ' ' + r1(ay2) + 'H' + r1(mx) + 'V' + r1(by2) + 'H' + r1(bx2);
    }
    function curve(a, b) {
      if (down) {
        var fwd = b.y >= a.y;
        var ax = a.x + a.w / 2, ay = fwd ? a.y + a.h : a.y, bx = b.x + b.w / 2, by = fwd ? b.y : b.y + b.h;
        var d = Math.max(34, Math.abs(by - ay) / 2) * (fwd ? 1 : -1);
        return 'M' + r1(ax) + ' ' + r1(ay) + 'C' + r1(ax) + ' ' + r1(ay + d) + ' ' + r1(bx) + ' ' + r1(by - d) + ' ' + r1(bx) + ' ' + r1(by);
      }
      var fw = b.x >= a.x;
      var ax2 = fw ? a.x + a.w : a.x, ay2 = a.y + a.h / 2, bx2 = fw ? b.x : b.x + b.w, by2 = b.y + b.h / 2;
      var d2 = Math.max(34, Math.abs(bx2 - ax2) / 2) * (fw ? 1 : -1);
      return 'M' + r1(ax2) + ' ' + r1(ay2) + 'C' + r1(ax2 + d2) + ' ' + r1(ay2) + ' ' + r1(bx2 - d2) + ' ' + r1(by2) + ' ' + r1(bx2) + ' ' + r1(by2);
    }
    order.forEach(function (n) {
      if (n.parent && rects[n.parent.id]) {
        links.push({ from: n.parent.id, to: n.id, kind: n.link === 'uncertain' ? 'uncertain' : 'child', d: elbow(rects[n.parent.id], rects[n.id]) });
      }
      n.also.forEach(function (id) {
        if (rects[id]) links.push({ from: id, to: n.id, kind: 'also', d: curve(rects[id], rects[n.id]) });
      });
    });

    var gens = [];
    for (var d = 0; d <= maxDepth; d++) {
      var along = o.pad + d * stepDepth;
      gens.push(down
        ? { depth: d, x: 0, y: along + header, w: width, h: o.h }
        : { depth: d, x: along + gutter, y: 0, w: o.w, h: height });
    }
    return {
      flow: o.flow, down: down, nodes: order, rects: rects, links: links, gens: gens,
      width: Math.ceil(width), height: Math.ceil(height), gutter: gutter, header: header, step: stepDepth
    };
  }

  // ---------------------------------------------------------------- reading a list

  function childList(li) {
    for (var i = 0; i < li.children.length; i++) if (/^(UL|OL)$/.test(li.children[i].tagName)) return li.children[i];
    return null;
  }

  function readItem(li) {
    var sub = childList(li);
    var clone = li.cloneNode(true);
    Array.prototype.slice.call(clone.children).forEach(function (c) {
      if (/^(UL|OL)$/.test(c.tagName) || c.classList.contains('ft-when') || c.classList.contains('ft-with')) c.remove();
    });
    var img = null;
    var holder = clone.querySelector('figure') || clone.querySelector('img');
    var pic = holder && (holder.tagName === 'IMG' ? holder : holder.querySelector('img'));
    if (pic) {
      var cap = holder.tagName === 'FIGURE' ? holder.querySelector('figcaption') : null;
      img = { src: pic.getAttribute('src'), alt: pic.getAttribute('alt') || '', full: (holder.getAttribute && holder.getAttribute('data-full')) || pic.getAttribute('data-full') || '', caption: cap ? clean(cap.textContent) : '' };
      holder.remove();
    }
    var strong = clone.querySelector('strong, b');
    return {
      id: li.getAttribute('id') || '',
      label: li.getAttribute('data-label') || (strong ? strong.textContent : ''),
      text: clean(clone.textContent),
      html: clone.innerHTML.trim(),
      when: li.getAttribute('data-when') || '',
      group: li.getAttribute('data-group') || '',
      color: li.getAttribute('data-color') || '',
      partner: li.getAttribute('data-partner') || '',
      mark: li.getAttribute('data-partner-mark') || '',
      link: li.getAttribute('data-link') || '',
      also: (li.getAttribute('data-also-from') || '').split(/[\s,]+/).filter(Boolean),
      here: li.hasAttribute('data-here'),
      collapsed: li.hasAttribute('data-collapsed'),
      img: img,
      children: sub ? readList(sub) : []
    };
  }
  function readList(ul) {
    return Array.prototype.filter.call(ul.children, function (c) { return c.tagName === 'LI'; }).map(readItem);
  }

  // ---------------------------------------------------------------- DOM helpers

  var ROOT = null;
  if (hasDOM) {
    ROOT = new URL('../../', script && script.src ? script.src : (global.location && global.location.protocol !== 'about:' ? global.location.href : 'file:///'));
  }
  var canFullscreen = hasDOM && !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  var reducedMotion = hasDOM && global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var NS = 'http://www.w3.org/2000/svg';

  var ICONS = {
    minus: 'M3 8h10', plus: 'M3 8h10M8 3v10',
    full: 'M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4', close: 'M3.5 3.5l9 9M12.5 3.5l-9 9'
  };
  function icon(name) {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('class', 'ft-icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.appendChild(document.createElementNS(NS, 'path')).setAttribute('d', ICONS[name]);
    return svg;
  }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  function button(cls, label, text) {
    var b = el('button', 'ft-btn ' + (cls || ''), text);
    b.type = 'button';
    if (label) b.setAttribute('aria-label', label);
    return b;
  }
  function readStore() {
    try { return JSON.parse(global.localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function writeStore(patch) {
    try {
      var cur = readStore();
      Object.keys(patch).forEach(function (k) { cur[k] = patch[k]; });
      global.localStorage.setItem(STORE_KEY, JSON.stringify(cur));
    } catch (e) { /* private mode */ }
  }
  function addStyles() {
    if (document.querySelector('link[data-family-tree-style]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('assets/css/components/family-tree.css', ROOT).href;
    link.setAttribute('data-family-tree-style', '');
    document.head.appendChild(link);
  }
  function paperBehind(node) {
    for (var n = node.parentElement; n; n = n.parentElement) {
      var bg = getComputedStyle(n).backgroundColor;
      var m = bg.match(/^rgba?\(([^)]+)\)/);
      if (m) {
        var p = m[1].split(',');
        if (p.length < 4 || parseFloat(p[3]) > 0.9) return 'rgb(' + p.slice(0, 3).join(',') + ')';
      }
    }
    return '#fff';
  }

  // ---------------------------------------------------------------- the widget

  var all = [];

  function FamilyTree(list, host) {
    this.list = list;
    this.host = host;
    var roots = readList(list);
    this.model = buildModel(roots);
    if (this.model.nodes.length < 2) { this.root = null; return; }

    var store = readStore();
    var flowAttr = host.getAttribute('data-tree-flow') || list.getAttribute('data-tree-flow') || '';
    this.flow = store.flow || (flowAttr === 'right' ? 'right' : 'down');
    this.title = host.getAttribute('data-tree-title') || list.getAttribute('data-tree-title') || '';
    var gens = host.getAttribute('data-tree-generations') || list.getAttribute('data-tree-generations');
    this.genWord = gens && gens !== 'off' ? gens : 'Generation';
    this.showGens = gens !== 'off';
    this.search = host.hasAttribute('data-tree-search') || list.hasAttribute('data-tree-search');
    this.scale = 1;
    this.autoFit = true;
    this.selected = null;
    this.group = '';
    this.query = '';
    this.els = {};
    this.initial = this.model.nodes.map(function (n) { return n.collapsed; });

    this.build();
    var viewAttr = host.getAttribute('data-tree-view') || list.getAttribute('data-tree-view');
    this.setView(store.view || (viewAttr === 'list' ? 'list' : 'tree'), { save: false });
    all.push(this);
  }

  FamilyTree.prototype.build = function () {
    var self = this;
    var model = this.model;
    var root = this.root = el('div', 'ft');
    root.setAttribute('data-ft-flow', this.flow);
    this.list.parentNode.insertBefore(root, this.list);

    // ---- toolbar
    var bar = this.bar = el('div', 'ft-bar');
    if (this.title) bar.appendChild(el('h3', 'ft-title', this.title));
    var seg = el('div', 'ft-seg');
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', 'View');
    this.treeBtn = button('', '', 'Tree');
    this.listBtn = button('', '', 'List');
    this.treeBtn.addEventListener('click', function () { self.setView('tree'); });
    this.listBtn.addEventListener('click', function () { self.setView('list'); });
    seg.appendChild(this.treeBtn); seg.appendChild(this.listBtn);
    bar.appendChild(seg);

    var tools = this.tools = el('div', 'ft-tools ft-tree-only');
    this.flowBtn = button('', 'Turn the tree sideways', '');
    this.flowBtn.addEventListener('click', function () { self.setFlow(self.flow === 'right' ? 'down' : 'right'); });
    var expand = button('', 'Unfold every branch', 'Unfold all');
    expand.addEventListener('click', function () { self.setCollapsed(false); });
    var fold = button('', 'Fold the tree back to its first branches', 'Fold');
    fold.addEventListener('click', function () { self.setCollapsed(true); });
    var zoomOut = button('', 'Zoom out'); zoomOut.appendChild(icon('minus'));
    var zoomIn = button('', 'Zoom in'); zoomIn.appendChild(icon('plus'));
    var fit = button('', 'Fit the whole tree on screen', 'Whole tree');
    zoomOut.addEventListener('click', function () { self.zoomBy(1 / 1.25); });
    zoomIn.addEventListener('click', function () { self.zoomBy(1.25); });
    fit.addEventListener('click', function () { self.fit(false, true); });
    this.fullBtn = button('', 'Full screen (F)'); this.fullBtn.appendChild(icon('full'));
    this.fullBtn.setAttribute('aria-pressed', 'false');
    this.fullBtn.addEventListener('click', function () { self.toggleFullscreen(); });
    [this.flowBtn, expand, fold, zoomOut, zoomIn, fit, this.fullBtn].forEach(function (b) { tools.appendChild(b); });
    bar.appendChild(tools);

    if (this.search) {
      var box = this.searchBox = el('input', 'ft-search ft-tree-only');
      box.type = 'search';
      box.placeholder = 'Find a name…';
      box.setAttribute('aria-label', 'Find a name in the tree');
      box.addEventListener('input', function () { self.setQuery(box.value); });
      box.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && self.hits && self.hits[0]) { e.preventDefault(); self.select(self.hits[0].id, { focus: true }); }
      });
      bar.appendChild(box);
    }

    if (model.groups.length > 1) {
      var chips = this.chips = el('div', 'ft-chips ft-tree-only');
      chips.setAttribute('role', 'group');
      chips.setAttribute('aria-label', 'Highlight a branch');
      model.groups.forEach(function (g) {
        var c = el('button', 'ft-chip', g);
        c.type = 'button';
        c.setAttribute('aria-pressed', 'false');
        c.style.setProperty('--ft-c', model.groupColor[g]);
        c.addEventListener('click', function () { self.setGroup(self.group === g ? '' : g); });
        c.setAttribute('data-group', g);
        chips.appendChild(c);
      });
      bar.appendChild(chips);
    }
    root.appendChild(bar);

    // ---- canvas
    var viewport = this.viewport = el('div', 'ft-viewport ft-tree-only');
    viewport.tabIndex = -1;
    var sizer = this.sizer = el('div', 'ft-sizer');
    var canvas = this.canvas = el('div', 'ft-canvas');
    canvas.setAttribute('role', 'tree');
    if (this.title) canvas.setAttribute('aria-label', this.title);
    this.bands = el('div', 'ft-bands'); this.bands.setAttribute('aria-hidden', 'true');
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('class', 'ft-links');
    this.svg.setAttribute('aria-hidden', 'true');
    canvas.appendChild(this.bands);
    canvas.appendChild(this.svg);
    model.nodes.forEach(function (n) { self.makeNode(n); });
    sizer.appendChild(canvas);
    viewport.appendChild(sizer);
    root.appendChild(viewport);

    // ---- detail card
    this.detail = el('div', 'ft-detail ft-tree-only');
    this.detail.setAttribute('aria-live', 'polite');
    root.appendChild(this.detail);
    this.showHint();

    // ---- the original list stays: List view, print, no-JS
    this.list.classList.add('ft-list');
    this.decorateList();
    root.appendChild(this.list);

    this.bindEvents();
    this.layoutAndPaint();
  };

  // List view shows what the cards show: date chip, partner, group colour.
  FamilyTree.prototype.decorateList = function () {
    var model = this.model;
    var i = 0;
    (function walk(ul) {
      Array.prototype.forEach.call(ul.children, function (li) {
        if (li.tagName !== 'LI') return;
        var n = model.nodes[i++];
        if (!n) return;
        if (n.color) li.style.setProperty('--ft-c', n.color);
        var front = document.createDocumentFragment();
        if (n.when && !li.querySelector(':scope > .ft-when')) front.appendChild(el('span', 'ft-when', n.when));
        if (n.partner && !li.querySelector(':scope > .ft-with')) front.appendChild(el('span', 'ft-with', (n.mark === '=' ? 'also called ' : 'with ') + n.partner));
        if (front.childNodes.length) li.insertBefore(front, li.firstChild);
        var sub = childList(li);
        if (sub) walk(sub);
      });
    })(this.list);
  };

  FamilyTree.prototype.makeNode = function (n) {
    var self = this;
    var wrap = el('div', 'ft-node');
    wrap.setAttribute('role', 'treeitem');
    wrap.setAttribute('data-id', n.id);
    if (n.color) wrap.style.setProperty('--ft-c', n.color);
    if (n.here) wrap.classList.add('ft-here');
    if (n.link === 'uncertain') wrap.classList.add('ft-uncertain');

    var card = el('button', 'ft-card');
    card.type = 'button';
    card.tabIndex = -1;
    if (n.img && n.img.src) {
      var thumb = el('img', 'ft-thumb');
      thumb.src = n.img.src; thumb.alt = ''; thumb.loading = 'lazy'; thumb.decoding = 'async';
      card.appendChild(thumb);
    }
    var text = el('span', 'ft-text');
    text.appendChild(el('span', 'ft-name', n.label));
    if (n.when) text.appendChild(el('span', 'ft-date', n.when));
    card.appendChild(text);
    if (n.partner) {
      var mate = el('span', 'ft-mate');
      mate.appendChild(el('span', 'ft-and', n.mark || '⚭'));
      mate.appendChild(el('span', 'ft-name', n.partner));
      card.appendChild(mate);
    }
    if (n.link === 'uncertain') card.appendChild(el('span', 'ft-badge ft-q', '?'));
    if (n.here) card.appendChild(el('span', 'ft-badge ft-you', 'You are here'));
    card.addEventListener('click', function () { self.select(n.id); });
    wrap.appendChild(card);

    var toggle = null;
    if (n.children.length) {
      toggle = el('button', 'ft-toggle');
      toggle.type = 'button';
      toggle.tabIndex = -1;
      toggle.addEventListener('click', function (e) { e.stopPropagation(); self.toggle(n.id); });
      wrap.appendChild(toggle);
    }
    this.canvas.appendChild(wrap);
    this.els[n.id] = { wrap: wrap, card: card, toggle: toggle };
  };

  // ---------------------------------------------------------------- layout + paint

  FamilyTree.prototype.layoutAndPaint = function () {
    var self = this;
    var model = this.model;
    var lay = this.lay = layout(model, { flow: this.flow, generations: this.showGens });
    var scale = this.scale;
    this.canvas.style.width = lay.width + 'px';
    this.canvas.style.height = lay.height + 'px';
    this.canvas.style.transform = 'scale(' + scale + ')';
    this.sizer.style.width = Math.ceil(lay.width * scale) + 'px';
    this.sizer.style.height = Math.ceil(lay.height * scale) + 'px';
    this.root.setAttribute('data-ft-flow', this.flow);
    this.flowBtn.textContent = this.flow === 'right' ? 'Top-down' : 'Sideways';
    this.flowBtn.setAttribute('aria-label', this.flow === 'right' ? 'Turn the tree top-down' : 'Turn the tree sideways');

    // generation bands
    this.bands.textContent = '';
    if (this.showGens) {
      lay.gens.forEach(function (g) {
        var b = el('div', 'ft-band' + (g.depth % 2 ? ' ft-band-odd' : ''));
        if (lay.down) { b.style.left = '0'; b.style.top = (g.y - 12) + 'px'; b.style.width = lay.width + 'px'; b.style.height = (g.h + 24) + 'px'; }
        else { b.style.top = '0'; b.style.left = (g.x - 12) + 'px'; b.style.height = lay.height + 'px'; b.style.width = (g.w + 24) + 'px'; }
        b.appendChild(el('span', 'ft-band-label', self.genWord + ' ' + (g.depth + 1)));
        self.bands.appendChild(b);
      });
    }

    // links
    this.svg.setAttribute('width', lay.width);
    this.svg.setAttribute('height', lay.height);
    this.svg.setAttribute('viewBox', '0 0 ' + lay.width + ' ' + lay.height);
    this.svg.textContent = '';
    lay.links.forEach(function (l) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', l.d);
      p.setAttribute('class', 'ft-link ft-link-' + l.kind);
      p.setAttribute('data-from', l.from);
      p.setAttribute('data-to', l.to);
      var child = model.byId[l.to];
      if (child && child.color) p.style.setProperty('--ft-c', child.color);
      self.svg.appendChild(p);
    });

    // cards
    model.nodes.forEach(function (n) {
      var e = self.els[n.id];
      var r = lay.rects[n.id];
      if (!r) { e.wrap.hidden = true; return; }
      e.wrap.hidden = false;
      e.wrap.style.left = r.x + 'px';
      e.wrap.style.top = r.y + 'px';
      e.wrap.style.width = r.w + 'px';
      e.wrap.style.height = r.h + 'px';
      e.wrap.setAttribute('aria-level', n.depth + 1);
      if (e.toggle) {
        e.wrap.setAttribute('aria-expanded', String(!n.collapsed));
        e.toggle.textContent = n.collapsed ? '+' + descendants(n).length : '−';
        e.toggle.setAttribute('aria-label', (n.collapsed ? 'Unfold ' : 'Fold ') + n.label);
        e.toggle.classList.toggle('ft-folded', n.collapsed);
      }
    });
    this.paint();
    this.updateRoving();
  };

  // Dimming: a selected card keeps its whole lineage lit; a chosen group or a search does the same.
  FamilyTree.prototype.paint = function () {
    var self = this;
    var model = this.model;
    var lit = null;
    var sel = this.selected ? model.byId[this.selected] : null;
    if (sel) {
      lit = {};
      lit[sel.id] = 'self';
      ancestors(sel).forEach(function (a) { lit[a.id] = 'up'; });
      descendants(sel).forEach(function (d) { lit[d.id] = 'down'; });
      sel.also.forEach(function (id) { lit[id] = lit[id] || 'also'; });
    }
    var hitSet = null;
    if (this.query) { hitSet = {}; (this.hits || []).forEach(function (h) { hitSet[h.id] = true; }); }
    model.nodes.forEach(function (n) {
      var e = self.els[n.id];
      var dim = (lit && !lit[n.id]) || (self.group && n.group !== self.group) || (hitSet && !hitSet[n.id]);
      e.wrap.classList.toggle('ft-dim', !!dim);
      e.wrap.classList.toggle('ft-selected', !!sel && sel.id === n.id);
      e.wrap.classList.toggle('ft-kin', !!lit && !!lit[n.id] && lit[n.id] !== 'self');
      if (sel && sel.id === n.id) e.card.setAttribute('aria-current', 'true'); else e.card.removeAttribute('aria-current');
    });
    Array.prototype.forEach.call(this.svg.children, function (p) {
      var from = p.getAttribute('data-from'), to = p.getAttribute('data-to');
      var on = lit && lit[from] && lit[to] && (lit[from] !== 'down' || lit[to] === 'down') && !(lit[from] === 'down' && lit[to] === 'up');
      var dim = (lit && !on) || (self.group && model.byId[to].group !== self.group) || (hitSet && !hitSet[to]);
      p.classList.toggle('ft-dim', !!dim);
      p.classList.toggle('ft-on', !!on);
    });
    if (this.chips) {
      Array.prototype.forEach.call(this.chips.children, function (c) {
        c.setAttribute('aria-pressed', String(c.getAttribute('data-group') === self.group));
      });
    }
  };

  FamilyTree.prototype.updateRoving = function () {
    var model = this.model;
    var target = this.selected && this.lay.rects[this.selected] ? this.selected : (model.roots[0] && model.roots[0].id);
    this.rover = target;
    var els = this.els;
    model.nodes.forEach(function (n) { els[n.id].card.tabIndex = n.id === target ? 0 : -1; });
  };

  // ---------------------------------------------------------------- state changes

  FamilyTree.prototype.setView = function (view, opts) {
    this.root.setAttribute('data-ft-view', view);
    this.treeBtn.setAttribute('aria-pressed', String(view === 'tree'));
    this.listBtn.setAttribute('aria-pressed', String(view === 'list'));
    this.view = view;
    if (!opts || opts.save !== false) writeStore({ view: view });
    if (view === 'tree' && this.autoFit) this.fit(true);
  };

  FamilyTree.prototype.setFlow = function (flow) {
    if (flow === this.flow) return;
    this.flow = flow;
    writeStore({ flow: flow });
    this.layoutAndPaint();
    this.fit(true);
    if (this.selected) this.reveal(this.selected);
  };

  FamilyTree.prototype.setCollapsed = function (fold) {
    this.model.nodes.forEach(function (n) { n.collapsed = fold ? (n.depth >= 1 && n.children.length > 0) : false; });
    if (this.selected && this.lay.rects[this.selected] === undefined) this.selected = null;
    this.layoutAndPaint();
    if (this.selected && !this.lay.rects[this.selected]) this.select(null);
    this.fit(true);
  };

  FamilyTree.prototype.toggle = function (id) {
    var n = this.model.byId[id];
    if (!n || !n.children.length) return;
    n.collapsed = !n.collapsed;
    if (n.collapsed && this.selected && descendants(n).some(function (d) { return d.id === this.selected; }, this)) this.selected = n.id;
    this.layoutAndPaint();
    if (this.selected) this.showDetail(this.model.byId[this.selected]);
  };

  FamilyTree.prototype.setGroup = function (g) { this.group = g; this.paint(); };

  FamilyTree.prototype.setQuery = function (q) {
    var self = this;
    this.query = clean(q).toLowerCase();
    this.hits = this.query ? this.model.nodes.filter(function (n) {
      return (n.label + ' ' + n.partner + ' ' + n.text + ' ' + n.when).toLowerCase().indexOf(self.query) !== -1;
    }) : [];
    var opened = false;
    this.hits.forEach(function (n) {
      for (var p = n.parent; p; p = p.parent) if (p.collapsed) { p.collapsed = false; opened = true; }
    });
    if (opened) this.layoutAndPaint(); else this.paint();
    if (this.hits[0]) this.reveal(this.hits[0].id);
  };

  FamilyTree.prototype.expandTo = function (n) {
    var opened = false;
    for (var p = n.parent; p; p = p.parent) if (p.collapsed) { p.collapsed = false; opened = true; }
    if (opened) this.layoutAndPaint();
  };

  FamilyTree.prototype.select = function (id, opts) {
    var n = id ? this.model.byId[id] : null;
    if (n) this.expandTo(n);
    this.selected = n ? n.id : null;
    this.paint();
    this.updateRoving();
    if (n) { this.showDetail(n); this.reveal(n.id); if (opts && opts.focus) this.els[n.id].card.focus({ preventScroll: true }); }
    else this.showHint();
    if (this.onselect) this.onselect(n);
  };

  // Scroll so the card is on screen (manual: scrollIntoView would also move the page).
  FamilyTree.prototype.reveal = function (id) {
    var r = this.lay.rects[id];
    var vp = this.viewport;
    if (!r || !vp.clientWidth) return;
    var s = this.scale, pad = 36;
    var x0 = r.x * s - pad, x1 = (r.x + r.w) * s + pad, y0 = r.y * s - pad, y1 = (r.y + r.h) * s + pad;
    var behavior = reducedMotion.matches ? 'auto' : 'smooth';
    var left = vp.scrollLeft, top = vp.scrollTop;
    if (x0 < vp.scrollLeft) left = x0; else if (x1 > vp.scrollLeft + vp.clientWidth) left = x1 - vp.clientWidth;
    if (y0 < vp.scrollTop) top = y0; else if (y1 > vp.scrollTop + vp.clientHeight) top = y1 - vp.clientHeight;
    if (left !== vp.scrollLeft || top !== vp.scrollTop) vp.scrollTo({ left: Math.max(left, 0), top: Math.max(top, 0), behavior: behavior });
  };

  // ---------------------------------------------------------------- zoom

  FamilyTree.prototype.zoomTo = function (s, user) {
    var vp = this.viewport;
    s = Math.min(Math.max(s, 0.25), 2.2);
    var cx = (vp.scrollLeft + vp.clientWidth / 2) / this.scale;
    var cy = (vp.scrollTop + vp.clientHeight / 2) / this.scale;
    this.scale = s;
    if (user) this.autoFit = false;
    this.layoutAndPaint();
    vp.scrollLeft = cx * s - vp.clientWidth / 2;
    vp.scrollTop = cy * s - vp.clientHeight / 2;
  };
  FamilyTree.prototype.zoomBy = function (f) { this.zoomTo(this.scale * f, true); };
  FamilyTree.prototype.fit = function (quiet, overview) {
    var vp = this.viewport;
    var w = vp.clientWidth;
    if (!w || this.view === 'list') { this.autoFit = true; return; }
    this.autoFit = true;
    // Whole tree if it stays legible; otherwise the largest readable size, centred on the
    // selection, else the first root (the top), so the tree always opens on its beginning.
    var s = Math.min(1, (w - 2) / this.lay.width);
    this.scale = Math.max(overview ? 0.25 : 0.55, s);
    this.layoutAndPaint();
    var focus = this.selected || (this.model.roots[0] || {}).id;
    var r = focus && this.lay.rects[focus];
    vp.scrollLeft = r && this.lay.width * this.scale > w ? Math.max(0, (r.x + r.w / 2) * this.scale - w / 2) : 0;
    vp.scrollTop = 0;
    void quiet;
  };

  // ---------------------------------------------------------------- detail card

  FamilyTree.prototype.showHint = function () {
    this.detail.textContent = '';
    this.detail.classList.add('ft-detail-hint');
    this.detail.appendChild(el('p', 'ft-hint', 'Press any card to read about it and light up its line of descent. Dashed lines are extra links; dotted lines are guesses.'));
  };

  FamilyTree.prototype.chipFor = function (n) {
    var self = this;
    var b = el('button', 'ft-link-btn', n.label);
    b.type = 'button';
    if (n.color) b.style.setProperty('--ft-c', n.color);
    b.addEventListener('click', function () { self.select(n.id, { focus: false }); });
    return b;
  };

  FamilyTree.prototype.showDetail = function (n) {
    var self = this;
    var d = this.detail;
    d.textContent = '';
    d.classList.remove('ft-detail-hint');
    if (n.color) d.style.setProperty('--ft-c', n.color); else d.style.removeProperty('--ft-c');
    var head = el('div', 'ft-d-head');
    head.appendChild(el('h4', 'ft-d-title', n.label + (n.partner ? (n.mark === '=' ? ' = ' : ' & ') + n.partner : '')));
    if (n.when) head.appendChild(el('span', 'ft-when', n.when));
    if (n.group) head.appendChild(el('span', 'ft-d-group', n.group));
    var close = button('ft-d-close', 'Clear selection'); close.appendChild(icon('close'));
    close.addEventListener('click', function () { self.select(null); });
    head.appendChild(close);
    d.appendChild(head);

    var body = el('div', 'ft-d-body');
    if (n.img && n.img.src) {
      var fig = el('figure', 'ft-d-photo');
      fig.setAttribute('data-zoomable', '');
      fig.setAttribute('data-lightbox-group', 'ft-' + this.model.nodes[0].id);
      if (n.img.full) fig.setAttribute('data-full', n.img.full);
      var im = el('img');
      im.src = n.img.src; im.alt = n.img.alt || n.label; im.loading = 'lazy';
      fig.appendChild(im);
      fig.appendChild(el('figcaption', '', n.img.caption || n.img.alt || n.label));
      body.appendChild(fig);
    }
    var copy = el('div', 'ft-d-text');
    if (n.html) copy.innerHTML = n.html; else copy.textContent = n.text;
    body.appendChild(copy);
    d.appendChild(body);

    var facts = el('p', 'ft-d-facts');
    var desc = descendants(n).length;
    facts.textContent = self.genWord + ' ' + (n.depth + 1) + (desc ? ' · ' + desc + (desc === 1 ? ' descendant' : ' descendants') : (n.children.length ? '' : ' · no descendants shown'));
    d.appendChild(facts);

    function row(label, items) {
      if (!items.length) return;
      var r = el('div', 'ft-d-row');
      r.appendChild(el('span', 'ft-d-rowlabel', label));
      items.forEach(function (x, i) {
        if (i && label === 'Line of descent') r.appendChild(el('span', 'ft-sep', '›'));
        r.appendChild(self.chipFor(x));
      });
      d.appendChild(r);
    }
    row('Line of descent', ancestors(n).concat([n]).filter(function (x) { return ancestors(n).length > 0; }));
    row('Also descended from', n.also.map(function (id) { return self.model.byId[id]; }));
    row(n.children.length === 1 ? 'Child' : 'Children', n.children);
    if (n.link === 'uncertain') d.appendChild(el('p', 'ft-d-note', 'The link to ' + (n.parent ? n.parent.label : 'its parent') + ' is uncertain: scholars disagree or the evidence is thin.'));
  };

  // ---------------------------------------------------------------- events

  FamilyTree.prototype.bindEvents = function () {
    var self = this;
    var vp = this.viewport;

    // arrows along kin; + / − fold; 0 fits; F full screen
    this.canvas.addEventListener('keydown', function (e) {
      var card = e.target.closest && e.target.closest('.ft-card');
      if (!card) return;
      var id = card.parentNode.getAttribute('data-id');
      var n = self.model.byId[id];
      if (!n || e.altKey || e.ctrlKey || e.metaKey) return;
      var down = self.flow !== 'right';
      var up = down ? 'ArrowUp' : 'ArrowLeft', dn = down ? 'ArrowDown' : 'ArrowRight';
      var prev = down ? 'ArrowLeft' : 'ArrowUp', next = down ? 'ArrowRight' : 'ArrowDown';
      var target = null;
      var sibs = (n.parent ? n.parent.children : self.model.roots);
      if (e.key === up) target = n.parent;
      else if (e.key === dn) target = !n.collapsed && n.children[0];
      else if (e.key === prev) target = sibs[sibs.indexOf(n) - 1];
      else if (e.key === next) target = sibs[sibs.indexOf(n) + 1];
      else if (e.key === '+' || e.key === '=') { if (n.collapsed) self.toggle(n.id); e.preventDefault(); return; }
      else if (e.key === '-' || e.key === '−') { if (!n.collapsed && n.children.length) self.toggle(n.id); e.preventDefault(); return; }
      else if (e.key === '0') { self.fit(); e.preventDefault(); return; }
      else return;
      e.preventDefault();
      if (target) self.select(target.id, { focus: true });
    });
    this.root.addEventListener('keydown', function (e) {
      if ((e.key === 'f' || e.key === 'F') && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && !e.ctrlKey && !e.metaKey && self.view === 'tree') {
        e.preventDefault();
        self.toggleFullscreen();
      } else if (e.key === 'Escape' && self.pseudoFull) self.setPseudoFull(false);
    });

    // mouse: drag the background to pan; Ctrl/⌘ + wheel zooms
    var drag = null;
    vp.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('.ft-node')) return;
      drag = { x: e.clientX, y: e.clientY, l: vp.scrollLeft, t: vp.scrollTop };
      vp.setPointerCapture(e.pointerId);
      vp.classList.add('ft-panning');
    });
    vp.addEventListener('pointermove', function (e) {
      if (!drag) return;
      vp.scrollLeft = drag.l - (e.clientX - drag.x);
      vp.scrollTop = drag.t - (e.clientY - drag.y);
    });
    function endDrag() { drag = null; vp.classList.remove('ft-panning'); }
    vp.addEventListener('pointerup', endDrag);
    vp.addEventListener('pointercancel', endDrag);
    vp.addEventListener('wheel', function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      self.zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12);
    }, { passive: false });

    // refit while the reader hasn't zoomed by hand
    var fitSoon = null;
    function resized() {
      clearTimeout(fitSoon);
      fitSoon = setTimeout(function () { if (self.autoFit && self.view === 'tree') self.fit(true); }, 120);
    }
    if (global.ResizeObserver) new ResizeObserver(resized).observe(vp); else global.addEventListener('resize', resized);

    var onFull = function () { self.markFull((document.fullscreenElement || document.webkitFullscreenElement) === self.root); };
    document.addEventListener('fullscreenchange', onFull);
    document.addEventListener('webkitfullscreenchange', onFull);
  };

  FamilyTree.prototype.toggleFullscreen = function () {
    var self = this, root = this.root;
    if ((document.fullscreenElement || document.webkitFullscreenElement) === root) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      return;
    }
    if (this.pseudoFull) { this.setPseudoFull(false); return; }
    if (this.view !== 'tree') this.setView('tree');
    var req = canFullscreen && (root.requestFullscreen || root.webkitRequestFullscreen);
    var out = req ? req.call(root) : null;
    if (!req) this.setPseudoFull(true);
    else if (out && out.catch) out.catch(function () { self.setPseudoFull(true); });
  };

  // No element fullscreen (iPhone): fill the window. The tree moves to <body> meanwhile so no
  // transformed or clipped ancestor can trap a position: fixed box.
  FamilyTree.prototype.setPseudoFull = function (on) {
    var root = this.root;
    if (on === !!this.pseudoFull) return;
    if (on) {
      var cs = getComputedStyle(root);
      this.homeStyle = root.getAttribute('style') || '';
      root.style.setProperty('--ft-paper', paperBehind(root));
      root.style.setProperty('color', cs.color, 'important');
      root.style.setProperty('font-family', cs.fontFamily, 'important');
      var accent = cs.getPropertyValue('--ft-accent').trim();
      if (accent) root.style.setProperty('--ft-accent', accent);
      this.placeholder = document.createComment('family-tree');
      root.parentNode.insertBefore(this.placeholder, root);
      document.body.appendChild(root);
      document.documentElement.classList.add('ft-scroll-lock');
      root.classList.add('ft-pseudo-full');
      this.pseudoFull = true;
    } else {
      this.pseudoFull = false;
      root.classList.remove('ft-pseudo-full');
      document.documentElement.classList.remove('ft-scroll-lock');
      if (this.placeholder && this.placeholder.parentNode) {
        this.placeholder.parentNode.insertBefore(root, this.placeholder);
        this.placeholder.remove();
      }
      this.placeholder = null;
      root.setAttribute('style', this.homeStyle || '');
    }
    this.markFull(on);
  };

  FamilyTree.prototype.markFull = function (full) {
    this.root.classList.toggle('ft-is-full', full);
    this.fullBtn.setAttribute('aria-pressed', String(full));
    var self = this;
    setTimeout(function () { self.fit(true); }, 60);
  };

  // ---------------------------------------------------------------- setup

  function enhance(node) {
    if (node.__familyTree) return null;
    node.__familyTree = true;
    if (node.tagName === 'SCRIPT') {
      var config;
      try { config = JSON.parse(node.textContent); } catch (e) { console.warn('family-tree: bad JSON', e); return null; }
      var host = el('div');
      node.parentNode.insertBefore(host, node.nextSibling);
      return create(host, config);
    }
    var list = /^(OL|UL)$/.test(node.tagName) ? node : node.querySelector('ul, ol');
    if (!list || list.closest('.ft')) return null;
    addStyles();
    var t = new FamilyTree(list, node);
    if (!t.root) return null;
    return t;
  }

  function create(host, config) {
    config = config || {};
    var ul = el('ul');
    (function fill(parent, items) {
      (items || []).forEach(function (it) {
        var li = el('li');
        if (it.id) li.id = it.id;
        if (it.label) li.setAttribute('data-label', it.label);
        if (it.when != null) li.setAttribute('data-when', it.when);
        if (it.group) li.setAttribute('data-group', it.group);
        if (it.color) li.setAttribute('data-color', it.color);
        if (it.partner) li.setAttribute('data-partner', it.partner);
        if (it.mark) li.setAttribute('data-partner-mark', it.mark);
        if (it.link) li.setAttribute('data-link', it.link);
        if (it.also) li.setAttribute('data-also-from', [].concat(it.also).join(' '));
        if (it.here) li.setAttribute('data-here', '');
        if (it.collapsed) li.setAttribute('data-collapsed', '');
        if (it.html != null) li.innerHTML = it.html; else li.textContent = it.text != null ? it.text : (it.label || '');
        if (it.children && it.children.length) { var sub = el('ul'); li.appendChild(sub); fill(sub, it.children); }
        parent.appendChild(li);
      });
    })(ul, config.roots);
    host.setAttribute('data-family-tree', '');
    if (config.title) host.setAttribute('data-tree-title', config.title);
    if (config.flow) host.setAttribute('data-tree-flow', config.flow);
    if (config.view) host.setAttribute('data-tree-view', config.view);
    host.appendChild(ul);
    return enhance(host);
  }

  function scan(root) {
    var out = [];
    Array.prototype.forEach.call((root || document).querySelectorAll('[data-family-tree]'), function (node) {
      var t = enhance(node);
      if (t) out.push(t);
    });
    return out;
  }

  var api = {
    buildModel: buildModel, layout: layout, ancestors: ancestors, descendants: descendants,
    visibleParent: visibleParent, PALETTE: PALETTE, DEFAULTS: DEFAULTS
  };

  if (hasDOM) {
    api.scan = scan;
    api.create = create;
    api.readList = readList;
    api.instances = all;
    api.get = function (node) {
      return all.find(function (t) { return t.list === node || t.host === node || t.root.contains(node); }) || null;
    };
    global.ClassroomOSFamilyTree = api;

    // Print always uses the list.
    var printViews = null;
    global.addEventListener('beforeprint', function () {
      all.forEach(function (t) { if (t.pseudoFull) t.setPseudoFull(false); });
      printViews = all.map(function (t) { return t.view; });
      all.forEach(function (t) { t.root.setAttribute('data-ft-view', 'list'); });
    }, true);
    global.addEventListener('afterprint', function () {
      if (!printViews) return;
      all.forEach(function (t, i) { t.setView(printViews[i], { save: false }); });
      printViews = null;
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { scan(); });
    else scan();
  }

  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
