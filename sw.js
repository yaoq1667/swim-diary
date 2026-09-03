// 游泳打卡本 - Service Worker（离线缓存）
// 策略：HTML 优先走网络（保证更新即时生效），断网时才用缓存
var CACHE_NAME = 'swim-diary-v2';
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
      // 删除所有旧缓存（包括 v1 和任何旧版本）
      return Promise.all(
        names.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    }).then(function() {
      // 立即接管所有页面，不等下一次刷新
      return self.clients.claim();
    })
  );
});

// 监听消息：收到 update 命令立即跳过等待
self.addEventListener('message', function(e) {
  if (e.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  // HTML 文件：网络优先，断网才用缓存
  if (url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request).then(function(resp) {
        if (resp && resp.status === 200) {
          var respClone = resp.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, respClone);
          });
        }
        return resp;
      }).catch(function() {
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('swim-diary.html');
        });
      })
    );
    return;
  }
  // 其他文件（manifest.json 等）：缓存优先，后台更新
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) {
        fetch(e.request).then(function(resp) {
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, resp.clone());
          });
        }).catch(function() {});
        return cached;
      }
      return fetch(e.request).then(function(resp) {
        if (resp && resp.status === 200) {
          var respClone = resp.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, respClone);
          });
        }
        return resp;
      }).catch(function() {
        return caches.match('swim-diary.html');
      });
    })
  );
});
