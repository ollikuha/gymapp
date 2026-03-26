const CACHE = 'gymtracker-v4';
const FILES = [
  './',
  './index.html',
  './app.js',
  './program.js',
  './manifest.json',
  './icon.svg'
];

// Asenna: cacheta kaikki tiedostot
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
  self.skipWaiting();
});

// Aktivoi: poista vanhat cachez
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first: kokeile verkkoa ensin, epäonnistuessa cache
self.addEventListener('fetch', e => {
  // Käsittele vain GET-pyynnöt omaan originiin
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Päivitä cache uusimmalla versiolla
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
