const CACHE = 'gymtracker-v13';
const FILES = [
  './',
  './index.html',
  './app.js',
  './program.js',
  './manifest.json',
  './icon.svg'
];

// Asenna: hae tiedostot suoraan verkosta (ohita HTTP-välimuisti), tallenna cacheen
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.all(FILES.map(url =>
        fetch(new Request(url, { cache: 'reload' }))
          .then(res => cache.put(url, res))
      ))
    )
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

// Network-first: kokeile verkkoa ensin (ohita HTTP-välimuisti), epäonnistuessa cache
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(new Request(e.request, { cache: 'no-cache' }))
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
