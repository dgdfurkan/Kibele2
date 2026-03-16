// Kibele PWA Service Worker
const CACHE_NAME = 'kibele-v1';
const STATIC_ASSETS = [
    '/Kibele2/',
    '/Kibele2/index.html',
];

// Install: Cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: Network-first with cache fallback for navigation, cache-first for assets
self.addEventListener('fetch', (event) => {
    const { request } = event;
    
    // Skip non-GET and API requests
    if (request.method !== 'GET' || request.url.includes('api.') || request.url.includes('firestore') || request.url.includes('firebase')) {
        return;
    }

    // For navigation requests, try network first
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => caches.match('/Kibele2/index.html'))
        );
        return;
    }

    // For assets, cache first then network
    if (request.url.match(/\.(js|css|png|jpg|jpeg|svg|woff2?|ttf)$/)) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                    return response;
                });
            })
        );
        return;
    }
});
