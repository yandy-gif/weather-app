/* 气象观测台 PWA Service Worker
   壳资源：cache-first；天气 API：stale-while-revalidate（离线可看上次数据） */
var SHELL = 'wx-shell-v2';
var API = 'wx-api-v1';
var SHELL_FILES = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(SHELL)
      .then(function (c) { return c.addAll(SHELL_FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== SHELL && k !== API; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);

  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then(function (hit) {
        if (hit) return hit;
        return fetch(e.request).then(function (r) {
          var cp = r.clone();
          caches.open(SHELL).then(function (c) { c.put(e.request, cp); });
          return r;
        });
      })
    );
    return;
  }

  if (url.hostname.indexOf('open-meteo.com') !== -1) {
    e.respondWith(
      caches.match(e.request).then(function (hit) {
        var fresh = fetch(e.request).then(function (r) {
          var cp = r.clone();
          caches.open(API).then(function (c) { c.put(e.request, cp); });
          return r;
        }).catch(function () {
          return hit || new Response(JSON.stringify({ offline: true }), {
            status: 503, headers: { 'Content-Type': 'application/json' }
          });
        });
        return hit || fresh;
      })
    );
  }
});
