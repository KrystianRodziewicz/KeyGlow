const CACHE = 'keyglow-2';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/color.js',
  'js/devices.js',
  'js/effects.js',
  'js/i18n.js',
  'js/icons.js',
  'js/keycodes.js',
  'js/keymap.js',
  'js/perkey.js',
  'js/presets.js',
  'js/shortcuts.js',
  'js/preview.js',
  'js/sidelight.js',
  'js/store.js',
  'js/via.js',
  'assets/logo.svg',
  'assets/icon.png',
  'assets/icon-192.png',
  'assets/icon-maskable.png',
  'assets/fonts/nunito-latin-wght-normal.woff2',
  'assets/fonts/nunito-latin-ext-wght-normal.woff2',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }).then(hit => hit ?? caches.match('index.html'))),
  );
});
