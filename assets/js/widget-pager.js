/* Widget pager: on phones, a widget taller than the screen becomes a few swipeable pages.

   Mark the host `data-pager` and tag its children `data-page="1"`, `data-page="2"`, ...
   (the first child of each page may carry `data-page-label="Now"` for the tab pill).
   Children of one page must be contiguous. Below the breakpoint (`data-pager-mq`, default
   phones) the children are wrapped into a scroll-snap track with a row of pills above it;
   above it, or in print, everything is put back exactly where it was, so the widget's own
   scripts (which find nodes by id) never notice. The track animates its height between
   pages so a short page doesn't leave a tall empty gap. */
(function () {
  'use strict';

  var DEFAULT_MQ = '(max-width: 560px)';
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');

  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  function Pager(host) {
    this.host = host;
    this.built = false;
    var self = this;
    var mq = window.matchMedia(host.getAttribute('data-pager-mq') || DEFAULT_MQ);
    this.mq = mq;
    var sync = function () { mq.matches ? self.build() : self.teardown(); };
    if (mq.addEventListener) mq.addEventListener('change', sync); else mq.addListener(sync);
    sync();
  }

  Pager.prototype.build = function () {
    if (this.built) return;
    var host = this.host;
    var kids = Array.prototype.filter.call(host.children, function (c) { return c.hasAttribute('data-page'); });
    var groups = [];
    kids.forEach(function (c) {
      var n = c.getAttribute('data-page');
      var g = groups.filter(function (x) { return x.n === n; })[0];
      if (!g) { g = { n: n, nodes: [], label: '' }; groups.push(g); }
      g.nodes.push(c);
      if (!g.label && c.getAttribute('data-page-label')) g.label = c.getAttribute('data-page-label');
    });
    if (groups.length < 2) return;

    this.marker = document.createComment('widget-pager');
    host.insertBefore(this.marker, kids[0]);
    this.moved = kids;

    this.nav = el('div', 'wp-nav');
    this.nav.setAttribute('role', 'group');
    this.nav.setAttribute('aria-label', 'Sections. Swipe sideways or tap to switch.');
    this.track = el('div', 'wp-track');
    this.track.setAttribute('role', 'group');
    this.track.setAttribute('aria-roledescription', 'carousel');
    this.track.tabIndex = -1;
    this.pages = [];
    this.pills = [];
    var self = this;

    groups.forEach(function (g, i) {
      var page = el('div', 'wp-page');
      page.setAttribute('role', 'group');
      page.setAttribute('aria-roledescription', 'slide');
      page.setAttribute('aria-label', (i + 1) + ' of ' + groups.length + (g.label ? ': ' + g.label : ''));
      g.nodes.forEach(function (n) { page.appendChild(n); });
      self.track.appendChild(page);
      self.pages.push(page);

      var pill = el('button', 'wp-pill');
      pill.type = 'button';
      pill.textContent = g.label || 'Page ' + (i + 1);
      pill.addEventListener('click', function () { self.go(i); });
      self.nav.appendChild(pill);
      self.pills.push(pill);
    });

    host.insertBefore(this.nav, this.marker);
    host.insertBefore(this.track, this.marker);
    host.classList.add('wp-active');

    this.raf = 0;
    this.onScroll = function () {
      if (!self.raf) self.raf = requestAnimationFrame(function () { self.raf = 0; self.update(); });
    };
    this.track.addEventListener('scroll', this.onScroll, { passive: true });
    this.ro = window.ResizeObserver ? new ResizeObserver(function () { if (!self.moving) self.fit(); }) : null;
    if (this.ro) { this.pages.forEach(function (p) { self.ro.observe(p); }); this.ro.observe(this.track); }
    // A focused control on another page (keyboard, screen reader) brings its page into view.
    this.onFocus = function (e) {
      var i = self.pages.findIndex(function (p) { return p.contains(e.target); });
      if (i > -1 && i !== self.index()) self.go(i);
    };
    this.track.addEventListener('focusin', this.onFocus);
    this.built = true;
    this.shown = -1;
    this.moving = false;
    this.update();
  };

  Pager.prototype.teardown = function () {
    if (!this.built) return;
    if (this.ro) this.ro.disconnect();
    clearTimeout(this.timer);
    this.track.removeEventListener('scroll', this.onScroll);
    var marker = this.marker, host = this.host;
    this.moved.forEach(function (n) { host.insertBefore(n, marker); });
    this.nav.remove();
    this.track.remove();
    marker.remove();
    host.classList.remove('wp-active');
    this.built = false;
  };

  Pager.prototype.width = function () { return this.track.clientWidth || 1; };
  Pager.prototype.index = function () {
    return Math.max(0, Math.min(this.pages.length - 1, Math.round(this.track.scrollLeft / this.width())));
  };

  Pager.prototype.go = function (i) {
    var left = i * this.width();
    if (reduced && reduced.matches) this.track.scrollLeft = left;
    else this.track.scrollTo({ left: left, behavior: 'smooth' });
  };

  // Height never changes while a finger or a snap is moving the track (resizing every frame forces a
  // page-wide layout and is what made swiping stutter). It is set to the tallest page when motion starts,
  // then eases to the settled page's height once scrolling stops.
  var SETTLE_MS = 110;

  Pager.prototype.fit = function () {
    this.track.style.height = this.pages[this.index()].offsetHeight + 'px';
  };

  Pager.prototype.update = function () {
    var cur = this.index();
    if (!this.moving) {
      this.moving = true;
      var tallest = 0;
      this.pages.forEach(function (p) { tallest = Math.max(tallest, p.offsetHeight); });
      this.track.classList.add('is-moving');
      this.track.style.height = tallest + 'px';
    }
    if (cur !== this.shown) {
      this.shown = cur;
      this.pills.forEach(function (p, i) {
        if (i === cur) p.setAttribute('aria-current', 'true'); else p.removeAttribute('aria-current');
      });
      this.pages.forEach(function (p, i) { p.classList.toggle('is-current', i === cur); });
    }
    clearTimeout(this.timer);
    var self = this;
    this.timer = setTimeout(function () { self.settle(); }, SETTLE_MS);
  };

  Pager.prototype.settle = function () {
    this.moving = false;
    this.track.classList.remove('is-moving');
    this.fit();
  };

  function init() {
    document.querySelectorAll('[data-pager]').forEach(function (h) {
      if (!h.__wpager) h.__wpager = new Pager(h);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.WidgetPager = { init: init };
})();
