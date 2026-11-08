/* ClassroomOS page modules: the one list of helper scripts a page pulls in on its own.
 *
 * Before this file, lesson-print-button.js, nav-mobile.js and ui.js each carried their own
 * copy-pasted loaders (and their own copy of the VR headset test). Now each of them is a
 * "host" that calls boot(host, base) and this table decides what loads, when, and why.
 *
 *   when:  'now'     inject straight away
 *          'parsed'  after DOMContentLoaded (so a page's own tag for the same file wins)
 *          'idle'    after window load, when the browser is idle (not needed for first paint)
 *   needs: a selector the page must contain, or 'vr' (vrModeWanted()), else always
 *   with:  other module ids loaded alongside (family tree cards open photos in the lightbox)
 *
 * Dev serves this as its own file; build-dist.mjs inlines it at the top of
 * lesson-print-button.js and nav-mobile.js, so production makes no extra request.
 * Tests: node --test tests/page-modules.test.mjs
 */
(function (root) {
  'use strict';
  if (root.ClassroomOSPageModules) return;

  var MODULES = {
    'contrast-guard': {
      file: 'contrast-guard.js', global: 'ClassroomOSContrastGuard', marker: 'classroomosContrastGuard',
      why: 'Keeps hard-coded lesson colours readable in dark themes.'
    },
    'visitor-memory': {
      file: 'visitor-memory.js', global: 'ClassroomOSMemory', marker: 'visitorMemory',
      why: 'My Stuff: hearts, Save answers, lesson history (all on-device).'
    },
    'site-glossary': {
      file: 'site-glossary.js', global: 'ClassroomOSGlossary', marker: 'classroomosGlossary',
      why: 'Shared glossary pop-ups. Waits for parsing so a lesson\'s own glossary tag wins.'
    },
    'lesson-related': {
      file: 'lesson-related.js', marker: 'lessonRelated',
      why: 'Related-lesson links at the end of a lesson.'
    },
    'lesson-exhibits': {
      file: 'lesson-exhibits.js', marker: 'lessonExhibits',
      why: 'Exhibit links at the end of a lesson.'
    },
    'command-palette': {
      file: 'command-palette.js',
      why: 'Cmd/Ctrl+K site search.'
    },
    'vr-mode': {
      file: 'vr-mode.js', global: 'ClassroomOSVR', marker: 'vrModeScript', needs: 'vr',
      why: 'Headset mode. On a laptop it would only install a disabled stub, so it is fetched only when it will switch on.'
    },
    'sim-present': {
      file: 'sim-present.js', global: 'ClassroomOSPresent', marker: 'simPresent',
      needs: 'canvas, svg, model-viewer, [data-present]',
      why: 'The ⛶ projector button on each sim.'
    },
    'timeline': {
      file: 'timeline.js', global: 'ClassroomOSTimeline',
      needs: '[data-timeline], ol[class*="timeline"], ul[class*="timeline"], div[class*="timeline"]',
      why: 'Shared Timeline engine.'
    },
    'family-tree': {
      file: 'family-tree.js', global: 'ClassroomOSFamilyTree', needs: '[data-family-tree]', with: ['photo-lightbox'],
      why: 'Shared Family Tree engine.'
    },
    'photo-lightbox': {
      file: 'photo-lightbox.js', global: 'PhotoLightbox',
      why: 'Click-to-enlarge photos.'
    },
    'service-worker': {
      kind: 'service-worker',
      why: 'Content-hashed asset cache for repeat visits (dist/sw.js). Needs https, or ?sw=on on localhost.'
    }
  };

  // Which modules each host loads, and when. Order inside a host is the injection order.
  var HOSTS = {
    // lesson-print-button.js: every lesson, many of which have no site nav.
    lesson: [
      ['contrast-guard', 'now'],
      ['visitor-memory', 'now'],
      ['service-worker', 'idle'],
      ['lesson-related', 'idle'],
      ['lesson-exhibits', 'idle'],
      ['vr-mode', 'idle'],
      ['sim-present', 'idle'],
      ['timeline', 'parsed'],
      ['family-tree', 'parsed'],
      ['site-glossary', 'parsed']
    ],
    // nav-mobile.js: pages with the site shell.
    site: [
      ['command-palette', 'idle'],
      ['contrast-guard', 'now'],
      ['site-glossary', 'idle'],
      ['vr-mode', 'idle'],
      ['service-worker', 'idle'],
      ['visitor-memory', 'idle']
    ],
    // ui.js: showcase pages, loaded when the first like button is built.
    showcase: [
      ['visitor-memory', 'now'],
      ['vr-mode', 'now']
    ]
  };

  var VR_UA = /OculusBrowser|\bQuest\b|PicoBrowser|\bPico\b|Wolvic|Firefox Reality|MagicLeap|\bVR Safari\b/i;

  // Same headset test as vr-mode.js: a saved "on", ?vr=, a headset browser, or Vision Pro
  // (a "Macintosh" with WebXR and touch).
  function vrModeWanted(env) {
    env = env || {};
    var nav = env.navigator || root.navigator || {};
    var search = env.search != null ? env.search : (root.location && root.location.search) || '';
    var pref = env.pref;
    if (pref === undefined) {
      try { pref = root.localStorage.getItem('classroomos-vr-mode'); } catch (e) { pref = null; /* private mode */ }
    }
    var ua = nav.userAgent || '';
    return pref === 'on' || /[?&]vr=/.test(search) || VR_UA.test(ua) ||
      (/Macintosh/.test(ua) && 'xr' in nav && nav.maxTouchPoints > 0);
  }

  function isNeeded(id, env) {
    var mod = MODULES[id];
    if (!mod.needs) return true;
    if (mod.needs === 'vr') return env.vrWanted;
    return env.has(mod.needs);
  }

  // Pure: what this host would load on a page described by env = { has(selector), vrWanted }.
  // Returns [{ id, when }] including modules pulled in by `with`.
  function plan(host, env) {
    var steps = HOSTS[host];
    if (!steps) throw new Error('Unknown page-modules host: ' + host);
    var out = [];
    steps.forEach(function (step) {
      if (!isNeeded(step[0], env)) return;
      out.push({ id: step[0], when: step[1] });
      (MODULES[step[0]].with || []).forEach(function (extra) { out.push({ id: extra, when: step[1] }); });
    });
    return out;
  }

  function fileUrl(file, base) {
    return base ? new URL(file, base).href : '/assets/js/' + file;
  }

  // A module counts as present if its global exists, a loader tagged it, or any script tag
  // already points at the file (a lesson's own <script src=".../site-glossary.js">).
  function isPresent(id) {
    var mod = MODULES[id];
    if (mod.global && root[mod.global]) return true;
    var doc = root.document;
    if (doc.querySelector('script[data-page-module="' + id + '"]')) return true;
    if (mod.marker && doc.querySelector('script[data-' + mod.marker.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }) + '="true"]')) return true;
    var scripts = doc.scripts || [];
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      if (src.split(/[?#]/)[0].split('/').pop() === mod.file) return true;
    }
    return false;
  }

  function registerServiceWorker(base) {
    var nav = root.navigator;
    if (!('serviceWorker' in nav) || root.__classroomosSwRegistered || !base) return;
    if (root.location.protocol !== 'https:' && !/[?&]sw=on\b/.test(root.location.search)) return;
    root.__classroomosSwRegistered = true;
    var siteRoot = new URL('../../', base);
    nav.serviceWorker.register(new URL('sw.js', siteRoot).href, { scope: siteRoot.pathname })
      .catch(function () { /* not published here */ });
  }

  // Inject one module now (if it isn't already on the page). Ignores `needs`: the settings
  // "VR mode: On" switch calls load('vr-mode') on a laptop on purpose.
  function load(id, base) {
    var mod = MODULES[id];
    if (!mod) throw new Error('Unknown page module: ' + id);
    if (mod.kind === 'service-worker') { registerServiceWorker(base); return; }
    if (isPresent(id)) return;
    var doc = root.document;
    var s = doc.createElement('script');
    s.src = fileUrl(mod.file, base);
    s.defer = true;
    s.dataset.pageModule = id;
    if (mod.marker) s.dataset[mod.marker] = 'true';   // older code looks for these
    doc.head.appendChild(s);
    (mod.with || []).forEach(function (extra) { load(extra, base); });
  }

  // Like load(), but only if this page needs it (selector present, headset for VR).
  function ensure(id, base) {
    if (isNeeded(id, liveEnv())) load(id, base);
  }

  function liveEnv() {
    return {
      has: function (selector) { return Boolean(root.document.querySelector(selector)); },
      vrWanted: vrModeWanted()
    };
  }

  function whenParsed(fn) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function whenIdle(fn) {
    function schedule() {
      if (root.requestIdleCallback) root.requestIdleCallback(fn, { timeout: 2500 });
      else setTimeout(fn, 300);
    }
    if (root.document.readyState === 'complete') schedule();
    else root.addEventListener('load', schedule, { once: true });
  }

  // Run a host's plan. Selectors and the VR test are read when each step fires, not at boot,
  // so 'parsed' and 'idle' steps see the finished page.
  function boot(host, base) {
    if (!HOSTS[host]) throw new Error('Unknown page-modules host: ' + host);
    HOSTS[host].forEach(function (step) {
      var id = step[0];
      var run = function () { ensure(id, base); };
      if (step[1] === 'now') run();
      else if (step[1] === 'parsed') whenParsed(run);
      else whenIdle(run);
    });
  }

  root.ClassroomOSPageModules = {
    MODULES: MODULES,
    HOSTS: HOSTS,
    plan: plan,
    boot: boot,
    load: load,
    ensure: ensure,
    vrModeWanted: vrModeWanted,
    whenIdle: whenIdle,
    whenParsed: whenParsed
  };
}(typeof window !== 'undefined' ? window : globalThis));
