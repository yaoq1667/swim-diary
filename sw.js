// 游泳打卡本 - Service Worker（离线缓存）
var CACHE_NAME = 'swim-diary-v1';
var CACHE_FILES = [
  'swim-diary.html',
  'manifest.json'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_FILES);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  // 只缓存同源 GET 请求
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) {
        // 有缓存先用缓存，同时后台更新
        fetch(e.request).then(function(resp) {
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, resp.clone());
          });
        }).catch(function() {});
        return cached;
      }
      // 没缓存就请求，请求成功后存入缓存
      return fetch(e.request).then(function(resp) {
        if (resp && resp.status === 200) {
          var respClone = resp.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, respClone);
          });
        }
        return resp;
      }).catch(function() {
        // 离线且没缓存，返回主页
        return caches.match('swim-diary.html');
      });
    })
  );
});
