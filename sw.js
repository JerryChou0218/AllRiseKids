/* KidQuest Service Worker — offline-first
 * 讓遊戲可安裝為 PWA 並在斷網時完整執行。
 * 策略：
 *   - 本地核心檔（index.html / manifest / icon）：安裝時預先快取。
 *   - 同源請求：cache-first，未命中則上網並回填快取。
 *   - 跨來源 CDN（Tailwind、Google 字型）：runtime cache-first，
 *     首次上線載入後即快取，之後離線也能維持完整介面。
 * 改版時請更新 CACHE_VERSION，activate 會自動清掉舊快取。
 */
const CACHE_VERSION = 'kidquest-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // 回填快取：同源用一般回應；跨來源（CDN/字型）也快取其 opaque 回應。
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          // 離線且未快取：導覽請求退回已快取的 index.html。
          if (req.mode === 'navigate') return caches.match('./index.html');
          return Response.error();
        });
    })
  );
});
