// Funciona sem rede depois da primeira visita: serve do cache e atualiza em segundo plano.
const CACHE = 'leitor-pisca-v1';
const BASE = ['./', './index.html', './manifest.webmanifest', './icone-192.png', './icone-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const salvo = await cache.match(req, { ignoreSearch: true });
      const daRede = fetch(req)
        .then((r) => {
          if (r.ok) cache.put(req, r.clone());
          return r;
        })
        .catch(() => salvo);
      return salvo || daRede;
    }),
  );
});
