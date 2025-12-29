const cacheName = 'truco-v8'; // V6 para o visual novo!
// ... (mantenha o código de limpeza que te passei na última resposta)
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
  evt.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll(assets);
    })
  );
});

self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys
        .filter(key => key !== cacheName)
        .map(key => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', evt => {
  evt.respondWith(
    fetch(evt.request)
      .then(res => {
        const resClone = res.clone();
        caches.open(cacheName).then(cache => {
          cache.put(evt.request, resClone);
        });
        return res;
      })
      .catch(() => {
        return caches.match(evt.request);
      })
  );
});