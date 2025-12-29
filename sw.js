const cacheName = 'truco-v5'; // Mudei para v5
const assets = [
  './',
  './index.html',
  './regras.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon.png'
];

// 1. Instalação: Salva os arquivos novos
self.addEventListener('install', evt => {
  self.skipWaiting(); // Força a atualização imediata
  evt.waitUntil(
    caches.open(cacheName).then(cache => {
      console.log('Salvando novos arquivos...');
      return cache.addAll(assets);
    })
  );
});

// 2. Ativação: Limpa os caches antigos (A Mágica acontece aqui)
self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys
        .filter(key => key !== cacheName) // Se o nome for diferente de truco-v5
        .map(key => caches.delete(key)) // APAGA!
      );
    })
  );
});

// 3. Fetch: Tenta internet primeiro (para atualizar sempre), se falhar usa cache
self.addEventListener('fetch', evt => {
  evt.respondWith(
    fetch(evt.request)
      .then(res => {
        // Se conseguiu baixar da net, atualiza o cache local
        const resClone = res.clone();
        caches.open(cacheName).then(cache => {
          cache.put(evt.request, resClone);
        });
        return res;
      })
      .catch(() => {
        // Se falhou (sem net), pega do cache
        return caches.match(evt.request);
      })
  );
});
