/* ClassroomOS service worker, written into dist/sw.js by scripts/build-dist.mjs.
 *
 * GitHub Pages lets the browser reuse a file for only 10 minutes; after that every script,
 * stylesheet, font and image on a lesson is re-checked with the server (~40 round trips on a
 * school network). This worker answers those from its cache instead, keyed by each file's content
 * hash from the deploy that wrote it, so an unchanged file costs nothing and a changed one is
 * fetched fresh. A deploy can never mix an old script with a new page.
 *
 * It handles only same-origin GET requests for files listed in MANIFEST, with no query string.
 * Pages (HTML), audio and video (range requests), and anything else go to the network as usual.
 * To switch it off for everyone, deploy a sw.js that only calls self.registration.unregister().
 */
'use strict';

// { folder: { file: hash } }, e.g. { "assets/js/": { "nav-mobile.js": "1a2b3c4d" } }.
var MANIFEST = __MANIFEST__;
var CACHE = 'classroomos-assets-v1';
var BASE = new URL('./', self.location.href).pathname;

function keyFor(path, hash) {
  return BASE + path + '?sw=' + hash;
}

function hashOf(path) {
  var cut = path.lastIndexOf('/') + 1;
  var folder = MANIFEST[path.slice(0, cut)];
  return folder ? folder[path.slice(cut)] : undefined;
}

self.addEventListener('install', function () {
  self.skipWaiting();
});

// Drop entries whose file changed or left the site in this deploy.
self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (names) {
    return Promise.all(names.filter(function (name) { return name.indexOf('classroomos-assets-') === 0 && name !== CACHE; })
      .map(function (name) { return caches.delete(name); }));
  }).then(function () {
    return caches.open(CACHE);
  }).then(function (cache) {
    return cache.keys().then(function (requests) {
      return Promise.all(requests.map(function (request) {
        var url = new URL(request.url);
        var path = decodeURIComponent(url.pathname.slice(BASE.length));
        if (hashOf(path) !== url.searchParams.get('sw')) return cache.delete(request);
        return null;
      }));
    });
  }).then(function () {
    return self.clients.claim();
  }));
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin || url.search || url.pathname.indexOf(BASE) !== 0) return;
  var path = decodeURIComponent(url.pathname.slice(BASE.length));
  var hash = hashOf(path);
  if (!hash) return;
  event.respondWith(caches.open(CACHE).then(function (cache) {
    var key = keyFor(path, hash);
    return cache.match(key).then(function (hit) {
      if (hit) return hit;
      return fetch(request).then(function (response) {
        if (response.ok && response.type === 'basic') cache.put(key, response.clone()).catch(function () { /* quota */ });
        return response;
      });
    });
  }).catch(function () {
    return fetch(request);
  }));
});
