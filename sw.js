const cacheName = 'truco-v14'; // Versão de correção final
const assets = [
  './',
  './index.html',
  './regras.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon.png'
];

self.addEventListener('install', evt => {
  self.skipWaiting();
  evt.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets)));
});

self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== cacheName).map(k => caches.delete(k))))
  );
});

self.addEventListener('fetch', evt => {
  evt.respondWith(
    fetch(evt.request).then(res => {
      const clone = res.clone();
      caches.open(cacheName).then(cache => cache.put(evt.request, clone));
      return res;
    }).catch(() => caches.match(evt.request))
  );
});