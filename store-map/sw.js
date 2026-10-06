// Offline-capable shell: precache the app, refresh in the background. 
const VERSION = 'bsm-v2';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'js/app.js', 'js/store.js', 'js/scene.js', 'js/scanner.js', 'js/icons.js',
  'data/store-layout.json', 'data/products.json', 'data/offers.json', 'data/recipes.json',
  'vendor/three.module.js', 'vendor/three.core.js', 'vendor/OrbitControls.js', 'vendor/zxing.min.js', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  if (req.mode === 'navigate') { e.respondWith(fetch(req).then(r => { caches.open(VERSION).then(c => c.put('index.html', r.clone())); return r; }).catch(() => caches.match('index.html'))); return; }
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok) caches.open(VERSION).then(c => c.put(req, r.clone())); return r; }).catch(() => hit);
    return hit || net;
  }));
});
