const CACHE_NAME = 'recontrate-pwa-v2';
const APP_SHELL_ASSETS = [
  '/',
  '/entrar',
  '/manifest.webmanifest',
  '/icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_ASSETS))
      .catch(() => null)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            const copy = networkResponse.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, copy))
              .catch(() => null);
          }
          if (networkResponse) {
            return networkResponse;
          }
        } catch {
          // Network offline fallback below
        }

        const cachedExact = await caches.match(request);
        if (cachedExact) return cachedExact;

        const cachedLogin = await caches.match('/entrar');
        if (cachedLogin) return cachedLogin;

        const cachedRoot = await caches.match('/');
        if (cachedRoot) return cachedRoot;

        return new Response(
          '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Recontrate</title></head><body><p>Conexão indisponível no momento. Recarregue a página.</p></body></html>',
          {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }
        );
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(request);
        if (
          networkResponse &&
          networkResponse.ok &&
          networkResponse.type === 'basic'
        ) {
          const copy = networkResponse.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, copy))
            .catch(() => null);
        }
        if (networkResponse) {
          return networkResponse;
        }
      } catch {
        // Fallback to cache below
      }

      const cachedAsset = await caches.match(request);
      if (cachedAsset) return cachedAsset;

      return new Response('', { status: 504, statusText: 'Offline' });
    })()
  );
});
