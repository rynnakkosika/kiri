// Offline support for the published game. Network first, so a new version shows up at once;
// the cache is only a fallback when there is no connection. The online mode still needs a network.
const CACHE = 'travbana-v2';
const FILES = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest', 'privacy.html',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
  'src/engine/constants.js', 'src/engine/rng.js', 'src/engine/rules.js', 'src/engine/stages.js', 'src/engine/race.js',
  'src/engine/tour.js', 'src/engine/elo.js', 'src/ai/bots.js', 'src/net/protocol.js', 'src/net/peer.js', 'src/ui/storage.js',
  'src/ui/sound.js', 'src/ui/render.js', 'src/ui/panels.js', 'src/ui/native.js', 'src/ui/app.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html'))));
});
