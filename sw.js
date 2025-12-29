const cacheName = 'truco-v3';
const assets = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './regras.html',
  './manifest.json',
  './icon.png'
];

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll(assets);
    })
  );
});

self.addEventListener('fetch', evt => {
  evt.respondWith(
    caches.match(evt.request).then(res => {
      return res || fetch(evt.request);
    })
  );

});
