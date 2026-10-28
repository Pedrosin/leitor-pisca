// Service worker. A versão é trocada a cada build (vite.config.ts), então cada publicação ganha um
// cache novo e o antigo é apagado na ativação.
// Página (navegação): rede primeiro, cache só sem rede. Assim a versão nova chega na primeira abertura,
// sem limpar cache (antes, a página antiga saía do cache e a nova só aparecia na abertura seguinte).
// Arquivos com hash no nome (assets/): cache primeiro, porque nunca mudam.
const VERSAO = '__VERSAO__';
const CACHE = `leitor-pisca-${VERSAO}`;
const BASE = ['./', './index.html', './manifest.webmanifest', './icone-192.png', './icone-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE.map((u) => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      // Só os caches deste app: a origem (pedrosin.github.io) é dividida com outros projetos.
      .then((chaves) => Promise.all(chaves.filter((k) => k.startsWith('leitor-pisca-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  const pagina = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
  if (pagina) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((r) => {
          // waitUntil: o worker não pode ser encerrado antes de gravar, senão a abertura sem rede falha.
          if (r.ok) e.waitUntil(caches.open(CACHE).then((c) => c.put(req, r.clone())));
          return r;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))),
    );
    return;
  }
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const salvo = await cache.match(req, { ignoreSearch: true });
      if (salvo) return salvo;
      const r = await fetch(req);
      if (r.ok) e.waitUntil(cache.put(req, r.clone()));
      return r;
    }),
  );
});
